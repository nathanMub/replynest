import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { db } from "./server-db";
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import fs from "fs";
import { generateMockReplies, refineMockReply } from "./server-mock-generator";
import Stripe from "stripe";

// Patch console.error to filter out benign Firestore idle connection stream logs
try {
  const originalError = console.error;
  console.error = function (...args: any[]) {
    const errorStr = args
      .map(arg => {
        if (typeof arg === "string") return arg;
        if (arg instanceof Error) return arg.message;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(" ");

    if (
      errorStr.includes("Disconnecting idle stream") ||
      errorStr.includes("Timed out waiting for new targets") ||
      errorStr.includes("GrpcConnection RPC 'Listen'")
    ) {
      console.info("[Firestore Benign Info]: Connection idle stream closed (reconnects automatically).");
      return;
    }
    originalError.apply(console, args);
  };
} catch {}

dotenv.config();

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8")
);

let adminApp;
if (getAdminApps().length === 0) {
  adminApp = initializeAdminApp({
    projectId: firebaseConfig.projectId
  });
} else {
  adminApp = getAdminApps()[0];
}

const firestoreDb = firebaseConfig.firestoreDatabaseId
  ? getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
  : getAdminFirestore(adminApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Simple Authentication Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized. Please sign in to access this feature." });
    }
    const token = authHeader.substring(7); // "Bearer <token>"
    const user = db.getUserByToken(token);
    if (!user) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    req.user = user;
    req.token = token;
    next();
  };

  // Optional Auth helper for main tool
  const getOptionalUser = (req: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      return db.getUserByToken(token);
    }
    return null;
  };

  // Map Firestore users/{id} data to client-expected userPlan structure
  const mapUserDocToPlanData = (id: string, email: string, isGuest: boolean, userDocData: any) => {
    if (isGuest) {
      const remaining = userDocData?.freeRepliesRemaining !== undefined ? userDocData.freeRepliesRemaining : 3;
      const total = userDocData?.totalRepliesGenerated !== undefined ? userDocData.totalRepliesGenerated : 0;
      return {
        id,
        userId: id,
        email: "",
        plan: "Guest" as const,
        repliesRemaining: remaining,
        totalRepliesGenerated: total,
        subscriptionStatus: "inactive" as const,
        createdAt: userDocData?.createdAt || new Date().toISOString(),
        updatedAt: userDocData?.updatedAt || new Date().toISOString()
      };
    } else {
      // Free Beta plan is active for all authenticated users during beta (unlimited replies)
      const total = userDocData?.totalRepliesGenerated !== undefined ? userDocData.totalRepliesGenerated : 0;
      return {
        id,
        userId: id,
        email: email || userDocData?.email || "",
        plan: "Free Beta" as const,
        repliesRemaining: 999999, // Unlimited during Beta
        totalRepliesGenerated: total,
        subscriptionStatus: "active" as const,
        createdAt: userDocData?.createdAt || new Date().toISOString(),
        updatedAt: userDocData?.updatedAt || new Date().toISOString()
      };
    }
  };

  const handleUserPlanEnforcement = async (req: any, res: any, isGeneration: boolean): Promise<any> => {
    const user = getOptionalUser(req);
    const guestId = req.body.guestId || req.headers["x-guest-id"] || req.query.guestId;

    let id = "";
    let email = "";
    let isGuest = true;

    if (user) {
      id = user.id;
      email = user.email;
      isGuest = false;
    } else if (guestId) {
      id = guestId;
      isGuest = true;
    } else {
      return { allowed: false, error: "missing_identifier", message: "Please provide a guestId or sign in." };
    }

    try {
      const userDocRef = firestoreDb.collection("users").doc(id);
      const userSnap = await userDocRef.get();
      let userDocData: any;

      if (!userSnap.exists) {
        userDocData = {
          uid: id,
          displayName: isGuest ? "Guest User" : (user?.name || "User"),
          email: email || "",
          photoURL: "",
          plan: isGuest ? "guest" : "Free Beta",
          freeRepliesRemaining: isGuest ? 3 : 999999,
          totalRepliesGenerated: 0,
          subscriptionStatus: isGuest ? "inactive" : "active",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await userDocRef.set(userDocData);
      } else {
        userDocData = userSnap.data();
        if (!isGuest && (!userDocData.email || !userDocData.displayName)) {
          userDocData.email = userDocData.email || email;
          userDocData.displayName = userDocData.displayName || (user?.name || "User");
          await userDocRef.set(userDocData, { merge: true });
        }
      }

      const clientPlan = mapUserDocToPlanData(id, email, isGuest, userDocData);

      // Free Beta plan / Pro plan bypasses limits completely
      if (clientPlan.plan === "Free Beta" || (clientPlan.plan as any) === "Pro") {
        if (isGeneration) {
          userDocData.totalRepliesGenerated = (userDocData.totalRepliesGenerated || 0) + 1;
          userDocData.updatedAt = new Date().toISOString();
          await userDocRef.set(userDocData, { merge: true });
        }
        const updatedClientPlan = mapUserDocToPlanData(id, email, isGuest, userDocData);
        return { allowed: true, planData: updatedClientPlan };
      }

      // Check limits
      if (clientPlan.repliesRemaining <= 0) {
        return {
          allowed: false,
          error: "limit_reached",
          plan: clientPlan.plan,
          message: "You've used your 3 free AI replies. Create a free ReplyNest account to continue generating unlimited replies during our Free Beta.",
          planData: clientPlan
        };
      }

      // Decrement if generation succeeds
      if (isGeneration) {
        userDocData.freeRepliesRemaining = Math.max(0, (userDocData.freeRepliesRemaining !== undefined ? userDocData.freeRepliesRemaining : (isGuest ? 3 : 999999)) - 1);
        userDocData.totalRepliesGenerated = (userDocData.totalRepliesGenerated || 0) + 1;
        userDocData.updatedAt = new Date().toISOString();
        await userDocRef.set(userDocData, { merge: true });
      }

      const updatedClientPlan = mapUserDocToPlanData(id, email, isGuest, userDocData);
      return { allowed: true, planData: updatedClientPlan };
    } catch (e: any) {
      console.log("Expected server Firestore limits fallback (using local database limits):", e.message);
      let planData: any;
      if (isGuest) {
        planData = {
          id,
          userId: id,
          email: "",
          plan: "Guest",
          repliesRemaining: 3,
          totalRepliesGenerated: 0,
          subscriptionStatus: "inactive",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        const localUser = db.getUserByToken(id);
        const repliesUsed = localUser?.messageCount || 0;
        planData = {
          id,
          userId: id,
          email: email || localUser?.email || "",
          plan: "Free Beta",
          repliesRemaining: 999999,
          totalRepliesGenerated: repliesUsed,
          subscriptionStatus: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return { allowed: true, planData };
    }
  };

  // --- AUTH ENDPOINTS ---
  app.post("/api/auth/email-signup", async (req, res) => {
    const { uid, email, name, guestId } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: "UID and Email are required for Sign-Up." });
    }
    
    // Sync with local session cache
    const result = db.googleSignIn(uid, email, name || "User");

    try {
      // Create/Update user document in Firestore (using `/users/{uid}`)
      const userDocRef = firestoreDb.collection("users").doc(uid);
      const userSnap = await userDocRef.get();
      
      let guestRepliesUsed = 0;
      
      if (guestId) {
        try {
          const guestDocRef = firestoreDb.collection("users").doc(guestId);
          const guestSnap = await guestDocRef.get();
          if (guestSnap.exists) {
            const guestData = guestSnap.data();
            guestRepliesUsed = guestData?.totalRepliesGenerated || 0;
          }
        } catch (err) {
          console.error("Failed to query guest plan status:", err);
        }
      }

      if (!userSnap.exists) {
        const userData = {
          uid: uid,
          displayName: name || "User",
          email: email.toLowerCase().trim(),
          photoURL: "",
          plan: "free",
          freeRepliesRemaining: 20,
          totalRepliesGenerated: guestRepliesUsed,
          subscriptionStatus: "free",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await userDocRef.set(userData);
      }
    } catch (e: any) {
      console.log("Expected server Firestore user creation fallback:", e.message);
    }

    return res.json(result);
  });

  app.post("/api/auth/email-signin", async (req, res) => {
    const { uid, email, name } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: "UID and Email are required for Sign-In." });
    }
    
    // Sync with local session cache
    const result = db.googleSignIn(uid, email, name || "User");

    try {
      // Ensure user doc exists or update its lastLogin
      const userDocRef = firestoreDb.collection("users").doc(uid);
      const userSnap = await userDocRef.get();
      if (!userSnap.exists) {
        const userData = {
          uid: uid,
          displayName: name || "User",
          email: email.toLowerCase().trim(),
          photoURL: "",
          plan: "free",
          freeRepliesRemaining: 20,
          totalRepliesGenerated: 0,
          subscriptionStatus: "free",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await userDocRef.set(userData);
      } else {
        await userDocRef.update({
          lastLogin: new Date().toISOString()
        });
      }
    } catch (e: any) {
      console.log("Expected server Firestore user update fallback:", e.message);
    }

    return res.json(result);
  });

  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      db.logout(token);
    }
    return res.json({ success: true });
  });

  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    res.json({ user: req.user });
  });

  app.get("/api/usage-status", async (req, res) => {
    const user = getOptionalUser(req);
    const guestId = req.query.guestId as string;

    let id = "";
    let email = "";
    let isGuest = true;

    if (user) {
      id = user.id;
      email = user.email;
      isGuest = false;
    } else if (guestId) {
      id = guestId;
      isGuest = true;
    } else {
      return res.status(400).json({ error: "Missing user credentials or guest ID" });
    }

    try {
      console.log("Fetching userDoc for ID:", id);
      const userDocRef = firestoreDb.collection("users").doc(id);
      const userSnap = await userDocRef.get();
      let userDocData: any;

      if (!userSnap.exists) {
        userDocData = {
          uid: id,
          displayName: isGuest ? "Guest User" : (user?.name || "User"),
          email: email || "",
          photoURL: "",
          plan: isGuest ? "guest" : "free",
          freeRepliesRemaining: isGuest ? 3 : 20,
          totalRepliesGenerated: 0,
          subscriptionStatus: "free",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        console.log("userDoc does not exist, creating new user with data:", userDocData);
        await userDocRef.set(userDocData);
      } else {
        userDocData = userSnap.data();
      }

      const clientPlan = mapUserDocToPlanData(id, email, isGuest, userDocData);
      return res.json({ userPlan: clientPlan });
    } catch (e: any) {
      console.log("Expected server usage-status fallback (using local database):", e.message);
      fs.appendFileSync("server_debug.log", `Expected fallback: ${e.message}. Using local DB.\n`);

      // Fallback: Build planData using the local database `db`!
      let planData: any;
      if (isGuest) {
        planData = {
          id,
          userId: id,
          email: "",
          plan: "Guest",
          repliesRemaining: 3,
          totalRepliesGenerated: 0,
          subscriptionStatus: "inactive",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        const localUser = db.getUserByToken(id);
        const repliesUsed = localUser?.messageCount || 0;
        const isSubscribed = localUser?.isSubscribed || false;
        planData = {
          id,
          userId: id,
          email: email || localUser?.email || "",
          plan: isSubscribed ? "Pro" : "Free",
          repliesRemaining: isSubscribed ? 999999 : Math.max(0, 20 - repliesUsed),
          totalRepliesGenerated: repliesUsed,
          subscriptionStatus: isSubscribed ? "active" : "inactive",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return res.json({ userPlan: planData });
    }
  });

  app.post("/api/auth/subscribe", requireAuth, async (req: any, res) => {
    const { subscriptionType } = req.body;
    if (subscriptionType !== "monthly" && subscriptionType !== "yearly") {
      return res.status(400).json({ error: "Invalid subscriptionType. Must be 'monthly' or 'yearly'." });
    }
    const updatedUser = db.subscribeUser(req.user.id, subscriptionType);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    try {
      const userDocRef = firestoreDb.collection("users").doc(req.user.id);
      const userSnap = await userDocRef.get();
      let currentTotal = 0;
      if (userSnap.exists) {
        currentTotal = userSnap.data()?.totalRepliesGenerated || 0;
      }
      const userDataUpdate = {
        plan: "pro",
        subscriptionStatus: "pro",
        totalRepliesGenerated: currentTotal,
        updatedAt: new Date().toISOString()
      };
      await userDocRef.set(userDataUpdate, { merge: true });

      // Fetch fresh full user data
      const fullUserSnap = await userDocRef.get();
      const clientPlan = mapUserDocToPlanData(req.user.id, req.user.email, false, fullUserSnap.data());
      res.json({ success: true, user: updatedUser, userPlan: clientPlan });
    } catch (e: any) {
      console.error("Failed to save subscribed Pro plan:", e);
      // Fallback response
      const fallbackPlan = {
        id: req.user.id,
        userId: req.user.id,
        email: req.user.email,
        plan: "Pro",
        repliesRemaining: 999999,
        totalRepliesGenerated: 0,
        subscriptionStatus: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      res.json({ success: true, user: updatedUser, userPlan: fallbackPlan });
    }
  });

  // --- STRIPE SUBSCRIPTION INTEGRATION ---
  let stripeInstance: Stripe | null = null;
  function getStripeInstance() {
    if (!stripeInstance) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error("STRIPE_SECRET_KEY is missing from environment variables.");
      }
      stripeInstance = new Stripe(key, {
        apiVersion: "2025-01-27.acacia" as any,
      });
    }
    return stripeInstance;
  }

  app.post("/api/stripe/create-checkout-session", requireAuth, async (req: any, res) => {
    // Disabled during Free Beta
    return res.status(403).json({ error: "Payments and Stripe Checkout are disabled during the Free Beta. All premium features are already unlocked for your account!" });

    const { planType } = req.body;
    if (planType !== "monthly" && planType !== "yearly") {
      return res.status(400).json({ error: "Invalid planType. Must be 'monthly' or 'yearly'." });
    }

    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;

    // Graceful fallback to Mock Checkout if STRIPE_SECRET_KEY is missing
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    if (!hasStripeKey) {
      console.log("[Stripe Info]: STRIPE_SECRET_KEY is not defined. Falling back to Mock Checkout Flow.");
      const mockUrl = `/api/stripe/mock-checkout?userId=${req.user.id}&planType=${planType}`;
      return res.json({ url: mockUrl });
    }

    try {
      const stripe = getStripeInstance();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: planType === "monthly" ? "ReplyNest Monthly Pro" : "ReplyNest Annual Pro",
                description: planType === "monthly" ? "Unlimited AI replies billed monthly" : "Unlimited AI replies billed annually",
              },
              unit_amount: planType === "monthly" ? 1900 : 11900,
              recurring: {
                interval: planType === "monthly" ? "month" : "year",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        metadata: {
          userId: req.user.id,
          planType: planType,
        },
        success_url: `${appUrl}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/?status=cancel`,
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe Checkout Session creation error:", err);
      return res.status(500).json({ error: err.message || "Failed to create Stripe checkout session." });
    }
  });

  app.get("/api/stripe/success", async (req: any, res) => {
    const { session_id } = req.query;
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;

    if (!session_id || typeof session_id !== "string") {
      return res.redirect(`${appUrl}/?status=error&message=Missing+session+id`);
    }

    try {
      const stripe = getStripeInstance();
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const userId = session.metadata?.userId;
      const planType = session.metadata?.planType as "monthly" | "yearly";

      if (!userId || !planType) {
        throw new Error("Missing metadata in checkout session.");
      }

      if (session.payment_status === "paid" || session.status === "complete") {
        db.subscribeUser(userId, planType);

        try {
          const userDocRef = firestoreDb.collection("users").doc(userId);
          await userDocRef.set({
            plan: "Pro",
            subscriptionStatus: "active",
            subscriptionType: planType,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (fsErr) {
          console.error("Failed to update Firestore user subscription on success:", fsErr);
        }

        return res.redirect(`${appUrl}/?status=success&plan=${planType}`);
      } else {
        return res.redirect(`${appUrl}/?status=cancel`);
      }
    } catch (err: any) {
      console.error("Stripe success verification error:", err);
      return res.redirect(`${appUrl}/?status=error&message=${encodeURIComponent(err.message)}`);
    }
  });

  app.get("/api/stripe/mock-checkout", async (req: any, res) => {
    const { userId, planType } = req.query;
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;

    if (!userId || !planType) {
      return res.redirect(`${appUrl}/?status=error&message=Invalid+mock+checkout+parameters`);
    }

    const userIdStr = String(userId);
    const planTypeStr = planType as "monthly" | "yearly";

    db.subscribeUser(userIdStr, planTypeStr);

    try {
      const userDocRef = firestoreDb.collection("users").doc(userIdStr);
      await userDocRef.set({
        plan: "Pro",
        subscriptionStatus: "active",
        subscriptionType: planTypeStr,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (fsErr) {
      console.error("Failed to update Firestore user subscription in mock checkout:", fsErr);
    }

    return res.redirect(`${appUrl}/?status=success&plan=${planTypeStr}&mocked=true`);
  });


  // --- BUSINESS PROFILES ENDPOINTS ---
  app.get("/api/profiles", requireAuth, (req: any, res) => {
    const profiles = db.getProfiles(req.user.id);
    res.json({ profiles });
  });

  app.post("/api/profiles", requireAuth, (req: any, res) => {
    const { name, businessType, tone, customDetails } = req.body;
    if (!name || !businessType || !tone) {
      return res.status(400).json({ error: "Missing required profile fields: name, businessType, and tone are required." });
    }
    const profile = db.createProfile(req.user.id, name, businessType, tone, customDetails || "");
    res.json({ profile });
  });

  app.put("/api/profiles/:id", requireAuth, (req: any, res) => {
    const { name, businessType, tone, customDetails } = req.body;
    if (!name || !businessType || !tone) {
      return res.status(400).json({ error: "Missing required profile fields for update." });
    }
    const updated = db.updateProfile(req.user.id, req.params.id, name, businessType, tone, customDetails || "");
    if (!updated) {
      return res.status(404).json({ error: "Business profile not found." });
    }
    res.json({ profile: updated });
  });

  app.delete("/api/profiles/:id", requireAuth, (req: any, res) => {
    const success = db.deleteProfile(req.user.id, req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Profile not found or unauthorized." });
    }
    res.json({ success: true });
  });


  // --- CONVERSATION HISTORY ENDPOINTS ---
  app.get("/api/conversations", requireAuth, (req: any, res) => {
    const conversations = db.getConversations(req.user.id);
    res.json({ conversations });
  });

  app.delete("/api/conversations/:id", requireAuth, (req: any, res) => {
    const success = db.deleteConversation(req.user.id, req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Conversation not found or unauthorized." });
    }
    res.json({ success: true });
  });


  // --- GENERATE REPLIES ENDPOINT (With Auth context and profile details pre-filling support) ---
  app.post("/api/generate-replies", async (req, res) => {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Missing required field: message is required." });
    }

    const DEVELOPMENT_MODE = process.env.DEVELOPMENT_MODE === "true";
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey && !DEVELOPMENT_MODE) {
      return res.status(500).json({ 
        error: "Gemini API key is not configured on the server. Please add GEMINI_API_KEY to your Secrets panel." 
      });
    }

    const checkLimit = await handleUserPlanEnforcement(req, res, false);
    if (!checkLimit.allowed) {
      return res.status(403).json({
        error: "limit_reached",
        plan: checkLimit.plan,
        message: checkLimit.message,
        userPlan: checkLimit.planData
      });
    }

    const user = getOptionalUser(req);

    // Default configuration (for Guest or fallbacks)
    let finalBusiness = req.body.business || "Clothing Store";
    let finalGoal = req.body.goal || "Close a Sale";
    let finalTone = req.body.tone || "Friendly";
    let finalCustomDetails = req.body.customDetails || "";
    let finalBusinessProfile: any = req.body.businessProfile || null;
    let finalProducts: any[] = req.body.products || [];
    let finalFaqs: any[] = req.body.faqs || [];
    let replyLength = "medium";
    let outputLanguage = "English";
    let rules = "";

    if (user) {
      try {
        // 1. Fetch User Settings (Business Brain) from Firestore
        const settingsSnap = await firestoreDb.collection("userSettings").doc(user.id).get();
        if (settingsSnap.exists) {
          const settingsData = settingsSnap.data() || {};
          const profile = settingsData.businessProfile || {};
          const brandVoice = settingsData.brandVoice || {};
          const aiPrefs = settingsData.aiPreferences || {};
          
          finalBusiness = profile.industry || profile.businessName || "Clothing Store";
          finalTone = brandVoice.brandTone || "Friendly";
          rules = settingsData.replyRules || "";
          replyLength = aiPrefs.replyLength || "medium";
          outputLanguage = aiPrefs.outputLanguage || "English";
          
          finalBusinessProfile = {
            name: profile.businessName || "",
            email: "", // Not sensitive
            businessName: profile.businessName || "",
            industry: profile.industry || "",
            businessDescription: profile.businessDescription || "",
            country: profile.country || "",
            whatsAppNumber: profile.whatsAppNumber || "",
            website: profile.website || "",
            brandTone: finalTone,
            brandPersonality: brandVoice.brandPersonality || "",
            shippingPolicy: "",
            returnPolicy: "",
            paymentMethods: ""
          };

          finalCustomDetails = profile.businessDescription || "";
        }

        // 2. Fetch Saved Products from Firestore
        const productsSnap = await firestoreDb.collection("savedProducts").where("userId", "==", user.id).get();
        const loadedProducts: any[] = [];
        productsSnap.forEach(doc => {
          loadedProducts.push(doc.data());
        });
        finalProducts = loadedProducts;

        // 3. Fetch Saved FAQs from Firestore
        const faqsSnap = await firestoreDb.collection("savedFaqs").where("userId", "==", user.id).get();
        const loadedFaqs: any[] = [];
        faqsSnap.forEach(doc => {
          loadedFaqs.push(doc.data());
        });
        finalFaqs = loadedFaqs;

      } catch (dbErr) {
        console.error("Failed to automatically retrieve Business Brain data from Firestore:", dbErr);
      }
    }

    if (DEVELOPMENT_MODE) {
      try {
        const data = generateMockReplies({
          business: finalBusiness,
          goal: finalGoal,
          tone: finalTone,
          message,
          customDetails: finalCustomDetails,
          businessProfile: finalBusinessProfile,
          products: finalProducts,
          faqs: finalFaqs
        }) as any;

        const usageResult = await handleUserPlanEnforcement(req, res, true);
        data.userPlan = usageResult.planData;

        // If user is authenticated, save this conversation history automatically!
        if (user && data.replies) {
          db.saveConversation(user.id, finalBusiness, finalGoal, finalTone, message, data.replies);
          const newCount = db.incrementMessageCount(user.id);
          data.messageCount = newCount;
          data.isSubscribed = user.isSubscribed;
        }

        return res.json(data);
      } catch (mockError: any) {
        console.error("Mock Generation Error:", mockError);
        return res.status(500).json({ error: "Failed to generate mock replies." });
      }
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey!,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Build rich Business Profile context (Business Memory)
      let businessProfileDetails = "";
      if (user) {
        businessProfileDetails = `
=== BUSINESS BRAIN SYSTEM CONTEXT ===
You are ReplyNest AI, an advanced AI Sales Representative configured for this specific business.

[BUSINESS PROFILE IDENTITY]
- Company Name: ${finalBusinessProfile?.businessName || "N/A"}
- Industry/Niche: ${finalBusinessProfile?.industry || "N/A"}
- Core Description: ${finalBusinessProfile?.businessDescription || "N/A"}
- Target Country: ${finalBusinessProfile?.country || "N/A"}
- Support WhatsApp Number: ${finalBusinessProfile?.whatsAppNumber || "N/A"}
- Official Website: ${finalBusinessProfile?.website || "N/A"}

[BRAND VOICE & PERSONALITY]
- Defined Brand Tone: ${finalTone}
- Personality Description: ${finalBusinessProfile?.brandPersonality || "N/A"}

[AI EXECUTION PREFERENCES]
- Desired Reply Length: ${replyLength}
- Core Output Language: ${outputLanguage} (Write ALL your replies in this language unless the customer explicitly uses a different language and you must adapt)

[STRICT BEHAVIORAL REPLY RULES]
Below are critical operational guidelines. You must never violate these rules under any circumstance:
${rules || "No special constraints configured. Maintain general customer service best practices."}
`;

        if (finalProducts.length > 0) {
          businessProfileDetails += `
[SAVED INVENTORY / PRODUCTS LIST]
Use this list of products to match the customer's intent, pitch items, answer prices, or upsell where relevant:
${finalProducts.map((p, i) => `- ${p.name}: ${p.price}\n  Details: ${p.description}${p.sku ? ` (SKU: ${p.sku})` : ""}`).join("\n")}
`;
        }

        if (finalFaqs.length > 0) {
          businessProfileDetails += `
[PRE-APPROVED FAQs]
If the customer asks a matching question, use these pre-approved answers to guarantee accurate information:
${finalFaqs.map((f, i) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}
`;
        }

        businessProfileDetails += `\n====================================`;
      } else {
        // Fallback or guest
        businessProfileDetails = `
=== GUEST BUSINESS CONTEXT ===
- General Business Type: ${finalBusiness}
- Customer Goal: ${finalGoal}
- Response Tone: ${finalTone}
- Specific Details: ${finalCustomDetails || "N/A"}
==============================
`;
      }

      const prompt = `You are an expert customer service representative and professional sales assistant.
Your purpose is to help the business convert inquiries into sales, answer questions with absolute clarity, and sound extremely natural and human.

${businessProfileDetails}

CONTEXT:
- General Business Type: ${finalBusiness}
- Customer Goal: ${finalGoal}
- Response Tone: ${finalTone}

CUSTOMER MESSAGE:
"${message}"

INSTRUCTIONS FOR GENERATING REPLIES:
Generate exactly five different WhatsApp-style replies, tailored to the business type, goal, policies, and tone.

Reply 1: Best overall reply. (Balanced, complete, warm, with a clear conversion focus)
Reply 2: Friendly version. (Extremely warm, uses nice emojis, welcoming)
Reply 3: Professional version. (Polished, structured, highly respectful, clear and direct)
Reply 4: Sales focused version. (Irresistible pitch, highlights benefits/urgency, calls to action for immediate payment or setup)
Reply 5: Short version. (Direct and rapid read, perfect for busy WhatsApp chats. Must strictly be very brief under 150 characters)

RULES:
- Never sound robotic or mention AI, prompts, or templates. You are a real human representative.
- Keep replies formatted perfectly for a WhatsApp chat bubble (use paragraph spacing, bullet points, asterisks *for bold*, underscores _for italic_ if appropriate, and emojis tastefully).
- Write naturally, keeping the tone helpful and warm.
- Increase the chance of a sale whenever appropriate.
- Ask follow-up questions when it helps move the conversation forward.
- Designate exactly ONE reply as the recommended strongest option for the customer, setting "isRecommended": true and providing a custom "recommendationReason" string explaining why this specific message was selected to close the deal. For the other four replies, set "isRecommended": false and "recommendationReason": "".
- If replyLength preference is set to 'short', make all replies slightly shorter and direct. If set to 'long', make them more detailed.
- Return a structured JSON response matching the schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          systemInstruction: "You are ReplyNest AI, a world-class WhatsApp Sales Representative. Your responses must strictly be valid JSON adhering to the specified schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING },
                    label: { type: Type.STRING },
                    content: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    isRecommended: { type: Type.BOOLEAN },
                    recommendationReason: { type: Type.STRING }
                  },
                  required: ["id", "type", "label", "content", "explanation", "isRecommended", "recommendationReason"]
                }
              }
            },
            required: ["replies"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text received from Gemini.");
      }

      const data = JSON.parse(text);

      const usageResult = await handleUserPlanEnforcement(req, res, true);
      data.userPlan = usageResult.planData;

      // If user is authenticated, save this conversation history automatically!
      if (user && data.replies) {
        db.saveConversation(user.id, finalBusiness, finalGoal, finalTone, message, data.replies);
        const newCount = db.incrementMessageCount(user.id);
        data.messageCount = newCount;
        data.isSubscribed = user.isSubscribed;
      }

      return res.json(data);
    } catch (error: any) {
      console.error("Gemini Generation Error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to generate replies. Please try again." 
      });
    }
  });

  // Refine reply endpoint
  app.post("/api/refine-reply", async (req, res) => {
    const { business, goal, tone, originalReply, refinementType, customInstruction, language, customDetails, businessProfile } = req.body;

    if (!originalReply || !refinementType) {
      return res.status(400).json({ error: "Missing required fields: originalReply and refinementType are required." });
    }

    const DEVELOPMENT_MODE = process.env.DEVELOPMENT_MODE === "true";
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey && !DEVELOPMENT_MODE) {
      return res.status(500).json({ 
        error: "Gemini API key is not configured on the server. Please add GEMINI_API_KEY to your Secrets panel." 
      });
    }

    const checkLimit = await handleUserPlanEnforcement(req, res, false);
    if (!checkLimit.allowed) {
      return res.status(403).json({
        error: "limit_reached",
        plan: checkLimit.plan,
        message: checkLimit.message,
        userPlan: checkLimit.planData
      });
    }

    if (DEVELOPMENT_MODE) {
      try {
        const data = refineMockReply({
          originalReply,
          refinementType,
          customInstruction,
          language,
          business,
          goal,
          tone,
          businessProfile,
          products: req.body.products || [],
          faqs: req.body.faqs || []
        }) as any;

        const usageResult = await handleUserPlanEnforcement(req, res, true);
        data.userPlan = usageResult.planData;

        return res.json(data);
      } catch (mockError: any) {
        console.error("Mock Refinement Error:", mockError);
        return res.status(500).json({ error: "Failed to refine mock reply." });
      }
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey!,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let instruction = "";
      switch (refinementType) {
        case "friendlier":
          instruction = "Make this reply friendlier, warmer, and more conversational. Use supportive emojis and welcoming language.";
          break;
        case "shorter":
          instruction = "Make this reply significantly shorter, punchier and more concise, perfect for a quick, rapid WhatsApp read.";
          break;
        case "professional":
          instruction = "Make this reply more formal, professional, and business-focused, maintaining absolute respect and structured clarity.";
          break;
        case "persuasive":
          instruction = "Make this reply highly persuasive and sales-focused. Call out benefits, make the value proposition irresistible, or create friendly urgency/call to action.";
          break;
        case "translate":
          instruction = `Translate this reply exactly into ${language || "Spanish"}, keeping its persuasive sales intent, emojis, and professional tone intact.`;
          break;
        case "custom":
          instruction = `Refine this reply according to these specific instructions: "${customInstruction}"`;
          break;
        default:
          instruction = "Improve this reply to be more converting and natural.";
      }

      // Build rich Business Profile context (Business Memory)
      let businessProfileDetails = "";
      if (businessProfile) {
        businessProfileDetails = `
=== BUSINESS PROFILE DETAILS ===
- Contact Person: ${businessProfile.name || "N/A"}
- Contact Email: ${businessProfile.email || "N/A"}
- Business Name: ${businessProfile.businessName || "N/A"}
- Industry: ${businessProfile.industry || businessProfile.businessType || "N/A"}
- Business Description: ${businessProfile.businessDescription || businessProfile.customDetails || "N/A"}
- Country: ${businessProfile.country || "N/A"}
- Phone Number: ${businessProfile.phoneNumber || "N/A"}
- WhatsApp Number: ${businessProfile.whatsAppNumber || "N/A"}
- Website: ${businessProfile.website || "N/A"}
- Brand Tone: ${businessProfile.brandTone || businessProfile.tone || "N/A"}
- Brand Personality: ${businessProfile.brandPersonality || "N/A"}
- Shipping Policy: ${businessProfile.shippingPolicy || "N/A"}
- Return Policy: ${businessProfile.returnPolicy || "N/A"}
- Payment Methods: ${businessProfile.paymentMethods || "N/A"}
================================
`;
      } else if (customDetails) {
        businessProfileDetails = `
=== SPECIFIC BUSINESS DETAILS ===
${customDetails}
================================
`;
      }

      const prompt = `You are an experienced customer service representative and expert sales assistant.
Please refine the following original WhatsApp reply based on the requested instruction and business context.

${businessProfileDetails}

CONTEXT:
- Business Type: ${business || "General"}
- Sales Goal: ${goal || "Convert Customer"}
- Tone: ${tone || "Friendly"}

Original Reply:
"${originalReply}"

Refinement Instruction:
${instruction}

RULES:
- Retain standard WhatsApp-friendly layout (emojis, line breaks, bold/italic markup if helpful).
- Keep it extremely natural, human, and highly converting.
- Never sound robotic or mention AI.
- Return a structured JSON response matching the schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          systemInstruction: "You are ReplyNest AI. You must return a refined WhatsApp reply in valid JSON adhering to the specified schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["content", "explanation"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text received from Gemini.");
      }

      const data = JSON.parse(text);

      const usageResult = await handleUserPlanEnforcement(req, res, true);
      data.userPlan = usageResult.planData;

      return res.json(data);
    } catch (error: any) {
      console.error("Gemini Refinement Error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to refine reply. Please try again." 
      });
    }
  });


  // --- WEBSITE LIVE CHAT & AI EMPLOYEE WIDGET ENDPOINTS ---

  // 1. Submit Visitor details (Lead Capture)
  app.post("/api/widget/visitor", async (req, res) => {
    const { ownerId, visitorId, customerName, customerEmail, customerPhone, currentPage } = req.body;

    if (!ownerId || !visitorId) {
      return res.status(400).json({ error: "Missing required fields: ownerId and visitorId are required." });
    }

    try {
      // Check if active conversation already exists for this visitor and owner
      const chatsColl = firestoreDb.collection("liveConversations");
      const existingSnap = await chatsColl
        .where("ownerId", "==", ownerId)
        .where("visitorId", "==", visitorId)
        .where("status", "!=", "completed")
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        const convData = existingDoc.data();
        
        // Merge customer details if provided
        await existingDoc.ref.set({
          customerName: customerName || convData.customerName || "Guest",
          customerEmail: customerEmail || convData.customerEmail || "",
          customerPhone: customerPhone || convData.customerPhone || "",
          currentPage: currentPage || convData.currentPage || "/",
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return res.json({ conversationId: existingDoc.id, status: convData.status });
      }

      // Create a brand new active conversation
      const newChatDoc = chatsColl.doc();
      const newChatData = {
        ownerId,
        visitorId,
        customerName: customerName || "Guest",
        customerEmail: customerEmail || "",
        customerPhone: customerPhone || "",
        status: "active",
        currentPage: currentPage || "/",
        messages: [
          {
            sender: "ai",
            text: "Hello! Welcome to our website. Let me know if you have any questions.",
            time: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await newChatDoc.set(newChatData);
      return res.json({ conversationId: newChatDoc.id, status: "active" });

    } catch (err: any) {
      console.error("Error starting live chat conversation:", err);
      return res.status(500).json({ error: "Failed to initialize live chat session." });
    }
  });

  // 2. Fetch Widget Customization Settings for a specific owner
  app.get("/api/widget/settings", async (req, res) => {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) {
      return res.status(400).json({ error: "ownerId is required." });
    }

    const DEFAULT_WIDGET_CONFIG = {
      widgetColor: "#FF7A00",
      greeting: "Hi there! I'm your AI Assistant. How can I help you today?",
      aiName: "ReplyNest AI Assistant",
      businessHours: "24/7 Autopilot",
      avatar: "🤖",
      autoReply: true,
      typingSpeed: 50,
      welcomeMessage: "Welcome to our store! Let us know if you have any questions.",
      language: "English",
      collectEmail: false,
      collectPhone: false,
      escalateToHuman: true
    };

    try {
      const settingsSnap = await firestoreDb.collection("userSettings").doc(ownerId).get();
      if (settingsSnap.exists) {
        const data = settingsSnap.data() || {};
        if (data.widget) {
          return res.json({ settings: { ...DEFAULT_WIDGET_CONFIG, ...data.widget } });
        }
      }
      return res.json({ settings: DEFAULT_WIDGET_CONFIG });
    } catch (err) {
      console.error("Error fetching widget settings:", err);
      return res.json({ settings: DEFAULT_WIDGET_CONFIG });
    }
  });

  // 3. Receive Visitor message and generate AI Employee Response
  app.post("/api/widget/message", async (req, res) => {
    const { ownerId, visitorId, conversationId, message, currentPage, forceEscalate } = req.body;

    if (!ownerId || !visitorId || !message) {
      return res.status(400).json({ error: "Missing required fields: ownerId, visitorId, and message." });
    }

    try {
      const chatsColl = firestoreDb.collection("liveConversations");
      let activeConvDoc: any = null;

      if (conversationId) {
        activeConvDoc = chatsColl.doc(conversationId);
      } else {
        // Look up active chat
        const snap = await chatsColl
          .where("ownerId", "==", ownerId)
          .where("visitorId", "==", visitorId)
          .where("status", "!=", "completed")
          .limit(1)
          .get();

        if (!snap.empty) {
          activeConvDoc = snap.docs[0].ref;
        } else {
          // Auto-create active chat doc
          activeConvDoc = chatsColl.doc();
          await activeConvDoc.set({
            ownerId,
            visitorId,
            customerName: "Guest",
            customerEmail: "",
            customerPhone: "",
            status: "active",
            currentPage: currentPage || "/",
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      const activeConvSnap = await activeConvDoc.get();
      const convData = activeConvSnap.data() || {};
      const currentMessages = convData.messages || [];

      // Append new customer message
      const updatedMessages = [
        ...currentMessages,
        {
          sender: "customer",
          text: message,
          time: new Date().toISOString()
        }
      ];

      // Handle Direct Escalation command
      if (forceEscalate) {
        await activeConvDoc.set({
          messages: updatedMessages,
          status: "escalated",
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return res.json({ conversationId: activeConvDoc.id, reply: "I have escalated this chat." });
      }

      // Check if conversation is already escalated (silence AI so human can reply)
      if (convData.status === "escalated" || convData.status === "completed") {
        await activeConvDoc.set({
          messages: updatedMessages,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return res.json({ conversationId: activeConvDoc.id, reply: "Our customer service representative is looking into this conversation." });
      }

      // Load Owner settings (Business Brain context)
      let finalBusinessName = "Our Company";
      let businessProfileDetails = "";
      let productsListText = "";
      let faqsListText = "";
      let brandToneText = "Friendly";
      let brandVoiceDetails = "";
      let customGuidelines = "";
      let widgetSettings: any = {};

      try {
        const settingsSnap = await firestoreDb.collection("userSettings").doc(ownerId).get();
        if (settingsSnap.exists) {
          const settingsData = settingsSnap.data() || {};
          const profile = settingsData.businessProfile || {};
          const brandVoice = settingsData.brandVoice || {};
          widgetSettings = settingsData.widget || {};
          
          finalBusinessName = profile.businessName || "Our Company";
          brandToneText = brandVoice.brandTone || "Friendly";
          customGuidelines = settingsData.replyRules || "";
          
          businessProfileDetails = `
- Business Name: ${profile.businessName || "N/A"}
- Industry: ${profile.industry || "N/A"}
- Company Profile: ${profile.businessDescription || "A professional modern business."}
- Website: ${profile.website || "N/A"}
- Country: ${profile.country || "N/A"}
`;
          brandVoiceDetails = `
- Tone: ${brandToneText}
- Brand Personality: ${brandVoice.brandPersonality || "Helpful, responsive, respectful"}
`;
        }

        // Fetch products
        const productsSnap = await firestoreDb.collection("savedProducts").where("userId", "==", ownerId).get();
        if (!productsSnap.empty) {
          const pArr: string[] = [];
          productsSnap.forEach(d => {
            const p = d.data();
            pArr.push(`- Product: ${p.name || "N/A"} | Price: ${p.price || "N/A"} | Description: ${p.description || "N/A"}`);
          });
          productsListText = pArr.join("\n");
        }

        // Fetch FAQs
        const faqsSnap = await firestoreDb.collection("savedFaqs").where("userId", "==", ownerId).get();
        if (!faqsSnap.empty) {
          const fArr: string[] = [];
          faqsSnap.forEach(d => {
            const f = d.data();
            fArr.push(`Q: ${f.question || "N/A"}\nA: ${f.answer || "N/A"}`);
          });
          faqsListText = fArr.join("\n\n");
        }

      } catch (dbErr) {
        console.error("Failed to fetch full business brain for live-chat generator:", dbErr);
      }

      // Generate AI Reply using Gemini or mock fallback
      let aiReply = "";
      const DEVELOPMENT_MODE = process.env.DEVELOPMENT_MODE === "true";
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey && !DEVELOPMENT_MODE) {
        aiReply = `Hi there! I would love to answer your questions about ${finalBusinessName}. Our team has received your message and will get back to you shortly!`;
      } else if (DEVELOPMENT_MODE) {
        // Context-aware Mock reply
        if (message.toLowerCase().includes("product") || message.toLowerCase().includes("buy") || message.toLowerCase().includes("price")) {
          aiReply = productsListText 
            ? `We offer several fantastic options! For instance:\n${productsListText.split('\n').slice(0, 2).join('\n')}\nWould you like more details on any of these?`
            : `We have some fantastic products available. Please let me know what items you are interested in and I will assist you immediately!`;
        } else if (message.toLowerCase().includes("refund") || message.toLowerCase().includes("ship") || message.toLowerCase().includes("delivery")) {
          aiReply = `Our shipping and refund policies are built to give you the best experience! Let us know your order number or check our FAQs for instant status updates.`;
        } else {
          aiReply = faqsListText 
            ? `Thanks for asking! Based on our FAQs: "Our business values quick support." Let me know if you would like me to clarify anything further.`
            : `Hello! I'm the AI Employee for ${finalBusinessName}. How can I assist you with our services, company profile, or product range today?`;
        }
      } else {
        // Real Gemini generateContent call!
        try {
          const ai = new GoogleGenAI({
            apiKey: apiKey!,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });

          // System prompt
          const systemInstruction = `You are ${widgetSettings.aiName || "an AI Employee"} at ${finalBusinessName}.
Your objective is to provide professional, concise, helpful customer support to website visitors.

=== COMPANY INFORMATION ===
${businessProfileDetails || "A high-quality business."}
===========================

=== COMPANY PRODUCTS ===
${productsListText || "No custom products loaded yet."}
========================

=== FREQUENTLY ASKED QUESTIONS (FAQs) ===
${faqsListText || "No custom FAQs uploaded yet."}
==========================================

=== CUSTOM TONALITY & BRAND VOICE ===
${brandVoiceDetails}
- Custom Rules: ${customGuidelines}
=====================================

RULES OF ENGAGEMENT:
1. Speak as a helpful, human team member representing the merchant. Do NOT sound robotic, do NOT say "as an AI", and do NOT reference system parameters.
2. Keep your replies very short and scannable (1-3 sentences maximum). Long blocks of text are difficult to read in a tiny floating website chat widget.
3. Recommend specific company products (with prices) if they fit the customer's intent.
4. Answer FAQs precisely matching the provided uploaded FAQ questions and answers.
5. If the visitor asks to connect with a human, say you have notified the support staff.
6. Adopt the brand tone exactly. Respond in the same language the customer uses.`;

          // Format last 6 messages as chat history for Gemini
          const chatHistoryContext = updatedMessages.slice(-6).map(m => {
            return `${m.sender === "customer" ? "Customer" : "AI Assistant"}: ${m.text}`;
          }).join("\n");

          const prompt = `Chat History:\n${chatHistoryContext}\n\nAI Assistant reply:`;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.8,
            }
          });

          aiReply = response.text || "Hello! How can we help you today?";

        } catch (geminiErr: any) {
          console.error("Gemini Live Chat generation error:", geminiErr);
          aiReply = "Thanks for your inquiry! Our support agents have been notified and will reply right here in a few moments.";
        }
      }

      // Append AI Reply to message log
      const finalMessages = [
        ...updatedMessages,
        {
          sender: "ai",
          text: aiReply,
          time: new Date().toISOString()
        }
      ];

      // Automatically check for trigger phrase to escalate if needed
      let convStatus = "active";
      if (message.toLowerCase().includes("human") || message.toLowerCase().includes("support agent") || message.toLowerCase().includes("representative") || message.toLowerCase().includes("escalate")) {
        convStatus = "escalated";
      }

      await activeConvDoc.set({
        messages: finalMessages,
        status: convStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return res.json({ conversationId: activeConvDoc.id, reply: aiReply });

    } catch (err) {
      console.error("Error generating widget chat message:", err);
      return res.status(500).json({ error: "Failed to process chat message." });
    }
  });

  // 4. Fetch all live chat conversations for owner (Inbox)
  app.get("/api/owner/conversations", requireAuth, async (req: any, res) => {
    try {
      const snap = await firestoreDb.collection("liveConversations")
        .where("ownerId", "==", req.user.id)
        .get();

      const conversations: any[] = [];
      snap.forEach(doc => {
        conversations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by updatedAt descending manually (no custom indices required in Firestore)
      conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return res.json({ conversations });
    } catch (err: any) {
      console.error("Error fetching live conversations for owner:", err);
      return res.status(500).json({ error: "Failed to load live chats." });
    }
  });

  // 5. Send a manual human response to a live chat
  app.post("/api/owner/conversations/:id/reply", requireAuth, async (req: any, res) => {
    const { message, markAsCompleted } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    try {
      const docRef = firestoreDb.collection("liveConversations").doc(req.params.id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ error: "Conversation not found." });
      }

      const convData = docSnap.data() || {};
      if (convData.ownerId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden. You do not own this live chat." });
      }

      const updatedMessages = [
        ...(convData.messages || []),
        {
          sender: "ai", // Render as AI bubble on client, representing merchant
          text: message,
          time: new Date().toISOString(),
          isHumanReply: true // Indicates that a real person wrote this reply
        }
      ];

      await docRef.set({
        messages: updatedMessages,
        status: markAsCompleted ? "completed" : "active", // Mark active or completed
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return res.json({ success: true });
    } catch (err) {
      console.error("Error sending owner manual chat reply:", err);
      return res.status(500).json({ error: "Failed to send message." });
    }
  });

  // 6. Update Live Chat status
  app.put("/api/owner/conversations/:id/status", requireAuth, async (req: any, res) => {
    const { status } = req.body;
    if (!status || !["active", "escalated", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status parameter. Must be active, escalated, or completed." });
    }

    try {
      const docRef = firestoreDb.collection("liveConversations").doc(req.params.id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ error: "Conversation not found." });
      }

      const convData = docSnap.data() || {};
      if (convData.ownerId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden. You do not own this live chat." });
      }

      await docRef.set({
        status,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return res.json({ success: true });
    } catch (err) {
      console.error("Error updating live chat status:", err);
      return res.status(500).json({ error: "Failed to update status." });
    }
  });

  // 7. Get Real-Time Live Chat Analytics
  app.get("/api/owner/analytics", requireAuth, async (req: any, res) => {
    try {
      const snap = await firestoreDb.collection("liveConversations")
        .where("ownerId", "==", req.user.id)
        .get();

      let totalChats = 0;
      let totalMessages = 0;
      let leadsCaptured = 0;
      let escalatedChats = 0;
      let completedChats = 0;
      let activeChats = 0;

      snap.forEach(doc => {
        totalChats++;
        const data = doc.data();
        const msgs = data.messages || [];
        totalMessages += msgs.length;

        if (data.customerEmail || data.customerPhone) {
          leadsCaptured++;
        }

        if (data.status === "escalated") {
          escalatedChats++;
        } else if (data.status === "completed") {
          completedChats++;
        } else {
          activeChats++;
        }
      });

      return res.json({
        analytics: {
          totalChats,
          totalMessages,
          leadsCaptured,
          escalatedChats,
          completedChats,
          activeChats,
          avgResponseTime: "Instant (1-2s)"
        }
      });
    } catch (err) {
      console.error("Error loading live analytics:", err);
      return res.status(500).json({ error: "Failed to fetch performance analytics." });
    }
  });


  // Vite middleware for development or serve built files for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Development mode: Vite middleware attached.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production mode: Serving static files from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server startup failed:", err);
});
