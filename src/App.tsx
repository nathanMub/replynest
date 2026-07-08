import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  RefreshCw, 
  AlertTriangle, 
  Smile, 
  Briefcase, 
  Target, 
  Sliders, 
  ChevronRight, 
  Smartphone, 
  ArrowRight,
  Globe,
  PlusCircle,
  Wand2,
  CheckCheck,
  User,
  LogOut,
  LogIn,
  Home,
  Clock,
  BookOpen,
  ArrowUpRight,
  Layers,
  ChevronDown,
  Info,
  Brain,
  LayoutDashboard,
  Bot,
  TrendingUp,
  Settings,
  Zap
} from "lucide-react";
import AuthModal from "./components/AuthModal";
import BusinessBrain from "./components/BusinessBrain";
import ConversationHistory, { ConversationLog } from "./components/ConversationHistory";
import SubscriptionModal from "./components/SubscriptionModal";
import Homepage from "./components/Homepage";
import Inbox from "./components/Inbox";
import Analytics from "./components/Analytics";
import AIEmployeeConfig from "./components/AIEmployeeConfig";
import Installation from "./components/Installation";
import { BusinessType, CustomerGoal, ToneType, Reply, RefinementType, Profile } from "./types";
import { db, auth, emailLogout } from "./lib/firebaseAuth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./utils/firestoreError";
import { motion, AnimatePresence } from "motion/react";

type ViewTab = "home" | "dashboard" | "inbox" | "profiles" | "widget" | "analytics" | "installation" | "settings";

export default function App() {
  // Current user state
  const [token, setToken] = useState<string | null>(localStorage.getItem("replynest_token"));
  const [user, setUser] = useState<{ id: string; email: string; name: string; isSubscribed?: boolean; messageCount?: number; subscriptionType?: string } | null>(null);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<ViewTab>("home");
  
  // Active applied profile
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  // Input form states
  const [business, setBusiness] = useState<BusinessType>("Clothing Store");
  const [goal, setGoal] = useState<CustomerGoal>("Close a Sale");
  const [tone, setTone] = useState<ToneType>("Friendly");
  const [message, setMessage] = useState<string>("");
  
  // Generation & API States
  const [replies, setReplies] = useState<Reply[]>([]);
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Server/Database Connection status
  const [isServerHealthy, setIsServerHealthy] = useState<boolean | null>(null);

  // Custom instruction & Translation state per reply card
  const [activeRefineMenuId, setActiveRefineMenuId] = useState<string | null>(null);
  const [customRefineText, setCustomRefineText] = useState<string>("");
  const [translateLang, setTranslateLang] = useState<string>("Spanish");
  const [customGuidelines, setCustomGuidelines] = useState<string>("");

  // Auth Modal trigger
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Subscription Modal & usage limits states
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  
  const [guestGenerations, setGuestGenerations] = useState<number>(() => {
    return Number(localStorage.getItem("replynest_guest_generations") || "0");
  });

  const [guestId, setGuestId] = useState<string>(() => {
    let gid = localStorage.getItem("replynest_guest_id");
    if (!gid) {
      gid = "guest_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("replynest_guest_id", gid);
    }
    return gid;
  });

  const [userPlan, setUserPlan] = useState<{
    id: string;
    userId: string;
    email: string;
    plan: "Guest" | "Free" | "Pro";
    repliesRemaining: number;
    totalRepliesGenerated: number;
    subscriptionStatus: "active" | "inactive";
  } | null>(() => {
    const gid = localStorage.getItem("replynest_guest_id") || "guest_default";
    const guestGens = Number(localStorage.getItem("replynest_guest_generations") || "0");
    const repliesRemaining = Math.max(0, 3 - guestGens);
    return {
      id: gid,
      userId: gid,
      email: "",
      plan: "Guest" as const,
      repliesRemaining,
      totalRepliesGenerated: guestGens,
      subscriptionStatus: "inactive" as const
    };
  });

  // Keep guest userPlan in sync when guestGenerations state updates
  useEffect(() => {
    if (!token) {
      setUserPlan({
        id: guestId,
        userId: guestId,
        email: "",
        plan: "Guest" as const,
        repliesRemaining: Math.max(0, 3 - guestGenerations),
        totalRepliesGenerated: guestGenerations,
        subscriptionStatus: "inactive" as const
      });
    }
  }, [guestGenerations, token, guestId]);

  const [checkoutToast, setCheckoutToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const fetchUserPlan = async () => {
    try {
      const headersPayload: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headersPayload["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/usage-status?guestId=${guestId}`, {
        headers: headersPayload
      });
      if (response.ok) {
        const data = await response.json();
        setUserPlan(data.userPlan);
      }
    } catch (e) {
      console.error("Failed to fetch user plan status:", e);
    }
  };

  useEffect(() => {
    fetchUserPlan();
  }, [token, guestId]);

  // Handle Stripe redirect URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const plan = params.get("plan");
    const message = params.get("message");

    if (status === "success") {
      // Clear query params
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, "", newUrl);

      setCheckoutToast({
        type: "success",
        message: `🎉 Success! Your ReplyNest ${plan === "yearly" ? "Annual" : "Monthly"} Pro membership is active. Enjoy unlimited replies!`
      });

      fetchUserPlan();
    } else if (status === "cancel") {
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, "", newUrl);

      setCheckoutToast({
        type: "info",
        message: "Checkout canceled. No charges were made."
      });
    } else if (status === "error") {
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, "", newUrl);

      setCheckoutToast({
        type: "error",
        message: `Stripe Checkout failed: ${message || "Unknown error occurred"}`
      });
    }
  }, [token]);

  // Past conversation active selection id
  const [activeLogId, setActiveLogId] = useState<string | null>(null);

  // Check backend health & auto-login on mount
  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (res.ok) setIsServerHealthy(true);
        else setIsServerHealthy(false);
      })
      .catch(() => setIsServerHealthy(false));

    if (token) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(async (res) => {
          if (res.ok) {
            try {
              const data = await res.json();
              setUser(data.user);
            } catch (e) {
              console.error("Failed to parse me response as JSON", e);
              handleLogout();
            }
          } else {
            // Token stale or invalid
            handleLogout();
          }
        })
        .catch(() => {
          // Keep token but don't crash
        });
    }
  }, [token]);

  // Auto-load first profile on mount or user change
  useEffect(() => {
    if (token) {
      const loadDefaultProfile = async () => {
        try {
          const currentUser = auth.currentUser;
          let loadedFromFirestore = false;

          if (currentUser) {
            try {
              let querySnapshot;
              try {
                const q = query(collection(db, "businessProfiles"), where("userId", "==", currentUser.uid));
                querySnapshot = await getDocs(q);
              } catch (fsErr: any) {
                handleFirestoreError(fsErr, OperationType.LIST, "businessProfiles");
                throw fsErr;
              }
              if (querySnapshot && !querySnapshot.empty) {
                const d = querySnapshot.docs[0].data();
                const profileObj: Profile = {
                  id: querySnapshot.docs[0].id,
                  name: d.name || "",
                  businessType: (d.businessType || d.industry || "Clothing Store") as BusinessType,
                  tone: (d.tone || d.brandTone || "Friendly") as ToneType,
                  customDetails: d.customDetails || d.businessDescription || "",
                  email: d.email || "",
                  businessName: d.businessName || "",
                  industry: d.industry || "",
                  businessDescription: d.businessDescription || "",
                  country: d.country || "",
                  phoneNumber: d.phoneNumber || "",
                  whatsAppNumber: d.whatsAppNumber || "",
                  website: d.website || "",
                  brandTone: d.brandTone || "",
                  brandPersonality: d.brandPersonality || "",
                  shippingPolicy: d.shippingPolicy || "",
                  returnPolicy: d.returnPolicy || "",
                  paymentMethods: d.paymentMethods || "",
                  userId: d.userId || ""
                };
                setActiveProfile(profileObj);
                setBusiness(profileObj.businessType);
                setTone(profileObj.tone);
                loadedFromFirestore = true;
              }
            } catch (fsErr) {
              console.warn("Direct Firestore profile fetch failed, falling back to API:", fsErr);
            }
          }

          if (!loadedFromFirestore) {
            const response = await fetch("/api/profiles", {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
              const data = await response.json();
              if (data.profiles && data.profiles.length > 0) {
                setActiveProfile(data.profiles[0]);
                setBusiness(data.profiles[0].businessType);
                setTone(data.profiles[0].tone);
              }
            }
          }
        } catch (e) {
          console.error("Failed to auto-load default profile:", e);
        }
      };

      // Wait a moment for auth state to resolve
      setTimeout(loadDefaultProfile, 1000);
    }
  }, [token, user?.id]);

  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [latestChats, setLatestChats] = useState<any[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoadingDashboard(true);
    try {
      const resStats = await fetch("/api/owner/analytics", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resStats.ok) {
        const statsPayload = await resStats.json();
        setDashboardStats(statsPayload.analytics);
      }

      const resChats = await fetch("/api/owner/conversations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resChats.ok) {
        const chatsPayload = await resChats.json();
        setLatestChats(chatsPayload.conversations || []);
      }
    } catch (e) {
      console.error("Failed to load dashboard statistics:", e);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token, activeTab]);

  const handleAuthSuccess = (newToken: string, loggedInUser: { id: string; email: string; name: string }) => {
    localStorage.setItem("replynest_token", newToken);
    setToken(newToken);
    setUser(loggedInUser);
    setActiveTab("dashboard"); // Instantly transition into dashboard upon login!
    
    // Fetch and update userPlan immediately so the 20 replies indicator shows up instantly
    fetch(`/api/usage-status`, {
      headers: { "Authorization": `Bearer ${newToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.userPlan) {
          setUserPlan(data.userPlan);
        }
      })
      .catch(err => console.error("Error fetching plan in handleAuthSuccess:", err));
  };

  const handleLogout = () => {
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    emailLogout().catch(() => {});
    localStorage.removeItem("replynest_token");
    setToken(null);
    setUser(null);
    setUserPlan(null);
    setActiveProfile(null);
    setActiveTab("home");
  };

  // Preset scenarios selection from home page or demo
  const handleSelectPrompt = (prompt: {
    businessType: string;
    message: string;
    goal: string;
    tone: string;
  }) => {
    setBusiness(prompt.businessType as BusinessType);
    setGoal(prompt.goal as CustomerGoal);
    setTone(prompt.tone as ToneType);
    setMessage(prompt.message);
    setError(null);
    setActiveTab("generator"); // Jump to tool
    // Auto focus on the generate button area
    setTimeout(() => {
      document.getElementById("generator-tool-anchor")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  // Profile selection
  const handleApplyProfile = (profile: Profile) => {
    setActiveProfile(profile);
    setBusiness(profile.businessType);
    setTone(profile.tone);
    // Switch to generator to show prefilled state
    setActiveTab("generator");
  };

  // Restore past interaction history
  const handleRestoreConversation = (log: ConversationLog) => {
    setActiveLogId(log.id);
    setBusiness(log.businessType as BusinessType);
    setGoal(log.goal as CustomerGoal);
    setTone(log.tone as ToneType);
    setMessage(log.message);
    setReplies(log.replies);
    if (log.replies && log.replies.length > 0) {
      setSelectedReplyId(log.replies[0].id);
    }
    setActiveTab("generator");
  };

  // Generate main 5 replies using real server route (respecting context + profile details)
  const handleGenerateReplies = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim()) {
      setError("Please write or select a customer message first.");
      return;
    }

    // Check message limits beforehand to prevent unnecessary loads
    if (!user && guestGenerations >= 3) {
      setIsAuthModalOpen(true);
      setError("You've used your 3 free AI replies. Create a free ReplyNest account to continue generating unlimited replies during our Free Beta.");
      return;
    }

    if (userPlan && userPlan.plan !== "Free Beta" && userPlan.plan !== "Pro" && userPlan.repliesRemaining <= 0) {
      setIsSubscriptionModalOpen(true);
      setError(userPlan.plan === "Guest"
        ? "You've used your 3 free AI replies. Create a free ReplyNest account to continue generating unlimited replies during our Free Beta."
        : "You have completed your free replies. Upgrade is currently disabled during Free Beta."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setReplies([]);
    setSelectedReplyId(null);

    try {
      const headersPayload: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headersPayload["Authorization"] = `Bearer ${token}`;
      }

      let localProducts: any[] = [];
      let localFaqs: any[] = [];
      try {
        const prodKey = user ? `replynest_user_products_${user.id}` : "replynest_guest_products";
        const faqKey = user ? `replynest_user_faqs_${user.id}` : "replynest_guest_faqs";
        const rawProds = localStorage.getItem(prodKey);
        const rawFaqs = localStorage.getItem(faqKey);
        if (rawProds) localProducts = JSON.parse(rawProds);
        if (rawFaqs) localFaqs = JSON.parse(rawFaqs);
      } catch (err) {
        console.error("Error loading products/faqs:", err);
      }

      const response = await fetch("/api/generate-replies", {
        method: "POST",
        headers: headersPayload,
        body: JSON.stringify({ 
          business, 
          goal, 
          tone, 
          message,
          customDetails: activeProfile?.customDetails || "",
          businessProfile: activeProfile || null,
          guestId,
          products: localProducts,
          faqs: localFaqs
        }),
      });

      let data: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned unexpected response (status ${response.status}): ${text.slice(0, 150)}`);
      }

      if (!response.ok) {
        if (response.status === 403 && data.error === "limit_reached") {
          if (data.userPlan) {
            setUserPlan(data.userPlan);
          }
          setIsSubscriptionModalOpen(true);
          throw new Error(data.message || "You have reached your limit. Please upgrade.");
        }
        throw new Error(data.error || "Failed to generate replies. The server returned an error.");
      }

      if (data && data.replies && Array.isArray(data.replies)) {
        setReplies(data.replies);
        // Automatically select the first (Recommended) reply
        if (data.replies.length > 0) {
          setSelectedReplyId(data.replies[0].id);
        }

        if (!user) {
          const nextVal = guestGenerations + 1;
          setGuestGenerations(nextVal);
          localStorage.setItem("replynest_guest_generations", String(nextVal));
        }

        if (data.userPlan) {
          setUserPlan(data.userPlan);
        }
      } else {
        throw new Error("Invalid structure returned from Gemini server proxy.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while communicating with Google Gemini. Check your API keys.");
    } finally {
      setLoading(false);
    }
  };

  // Refine reply via API (supporting custom profile details if active)
  const handleRefineReply = async (replyId: string, refinementType: RefinementType) => {
    const targetReply = replies.find((r) => r.id === replyId);
    if (!targetReply) return;

    // Check message limits beforehand
    if (!user && guestGenerations >= 3) {
      setIsAuthModalOpen(true);
      setError("You've used your 3 free AI replies. Create a free ReplyNest account to continue generating unlimited replies during our Free Beta.");
      return;
    }

    if (userPlan && userPlan.plan !== "Free Beta" && userPlan.plan !== "Pro" && userPlan.repliesRemaining <= 0) {
      setIsSubscriptionModalOpen(true);
      setError(userPlan.plan === "Guest"
        ? "You've used your 3 free AI replies. Create a free ReplyNest account to continue generating unlimited replies during our Free Beta."
        : "You have completed your free replies. Upgrade is currently disabled during Free Beta."
      );
      return;
    }

    setRefiningId(replyId);
    setError(null);

    try {
      let localProducts: any[] = [];
      let localFaqs: any[] = [];
      try {
        const prodKey = user ? `replynest_user_products_${user.id}` : "replynest_guest_products";
        const faqKey = user ? `replynest_user_faqs_${user.id}` : "replynest_guest_faqs";
        const rawProds = localStorage.getItem(prodKey);
        const rawFaqs = localStorage.getItem(faqKey);
        if (rawProds) localProducts = JSON.parse(rawProds);
        if (rawFaqs) localFaqs = JSON.parse(rawFaqs);
      } catch (err) {
        console.error("Error loading products/faqs:", err);
      }

      const bodyPayload = {
        business,
        goal,
        tone,
        originalReply: targetReply.content,
        refinementType,
        customInstruction: refinementType === "custom" ? customRefineText : undefined,
        language: refinementType === "translate" ? translateLang : undefined,
        customDetails: activeProfile?.customDetails || "",
        businessProfile: activeProfile || null,
        guestId,
        products: localProducts,
        faqs: localFaqs
      };

      const headersPayload: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headersPayload["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/refine-reply", {
        method: "POST",
        headers: headersPayload,
        body: JSON.stringify(bodyPayload),
      });

      let data: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned unexpected response (status ${response.status}): ${text.slice(0, 150)}`);
      }

      if (!response.ok) {
        if (response.status === 403 && data.error === "limit_reached") {
          if (data.userPlan) {
            setUserPlan(data.userPlan);
          }
          setIsSubscriptionModalOpen(true);
          throw new Error(data.message || "You have reached your limit. Please upgrade.");
        }
        throw new Error(data.error || "Failed to refine reply.");
      }

      if (!user) {
        const nextVal = guestGenerations + 1;
        setGuestGenerations(nextVal);
        localStorage.setItem("replynest_guest_generations", String(nextVal));
      }

      if (data.userPlan) {
        setUserPlan(data.userPlan);
      }

      // Update specific reply in array
      setReplies((prev) =>
        prev.map((r) => {
          if (r.id === replyId) {
            return {
              ...r,
              content: data.content,
              explanation: data.explanation || `Refined using (${refinementType}) suggestion.`,
            };
          }
          return r;
        })
      );
      
      // Update preview context
      if (selectedReplyId === replyId) {
        setSelectedReplyId(null);
        setTimeout(() => setSelectedReplyId(replyId), 50);
      }

      // Close menu and reset input
      setActiveRefineMenuId(null);
      setCustomRefineText("");
    } catch (err: any) {
      console.error(err);
      setError(`Failed to refine: ${err.message}`);
    } finally {
      setRefiningId(null);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, replyId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(replyId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const selectedReplyObj = replies.find((r) => r.id === selectedReplyId);

  return (
    <div id="replynest-app" className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans antialiased">
      
      {/* Stripe Checkout Toast Notification Banner */}
      <AnimatePresence>
        {checkoutToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4"
          >
            <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 backdrop-blur-md ${
              checkoutToast.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : checkoutToast.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-zinc-50 border-zinc-200 text-zinc-800"
            }`}>
              <div className="flex-1 text-xs font-semibold leading-relaxed">
                {checkoutToast.message}
              </div>
              <button 
                onClick={() => setCheckoutToast(null)}
                className="text-zinc-400 hover:text-zinc-600 text-xs font-bold leading-none p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. PUBLIC VISITOR VIEW (Homepage) */}
      {activeTab === "home" ? (
        <div className="flex-1 flex flex-col min-h-screen bg-white">
          {/* Header Navbar */}
          <nav id="navbar" className="h-16 border-b border-zinc-200 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-zinc-950 rounded-xl flex items-center justify-center shadow-md">
                <MessageSquare className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-black tracking-tight font-display text-zinc-950">
                  ReplyNest <span className="text-[#FF7A00]">AI</span>
                </span>
              </div>
            </div>

            {/* Quick CTAs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("dashboard")}
                className="hidden sm:inline-flex px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Enter App
              </button>
              
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-medium">Logged in as {user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="p-2 bg-zinc-100 hover:bg-red-50 text-zinc-500 hover:text-red-500 rounded-xl transition-all cursor-pointer border border-zinc-200"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </nav>

          {/* Homepage Component */}
          <Homepage
            onStartGenerating={() => setActiveTab("dashboard")}
            onCreateAccount={() => setIsAuthModalOpen(true)}
            user={user}
            userPlan={userPlan}
            onOpenSubscribe={() => setIsSubscriptionModalOpen(true)}
          />
        </div>
      ) : (
        
        /* 2. AUTHENTICATED / IN-APP WORKSPACE SYSTEM */
        <div className="flex-1 flex h-screen overflow-hidden">
          
          {/* LEFT SIDEBAR NAVIGATION */}
          <aside className="w-[240px] bg-white border-r border-zinc-200 flex flex-col justify-between shrink-0 h-full">
            
            {/* Top Workspace Identity */}
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-100">
                <div className="w-8 h-8 bg-[#FF7A00] rounded-lg flex items-center justify-center text-white">
                  <MessageSquare className="w-4.5 h-4.5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-black tracking-tight text-zinc-950 truncate">ReplyNest Employee</h2>
                  <span className="text-[9px] text-[#FF7A00] uppercase font-bold tracking-wider">v2.0 Autopilot</span>
                </div>
              </div>

              {/* Sidebar Menu Buttons */}
              <nav className="space-y-1.5">
                {[
                  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
                  { id: "inbox", label: "Live Chats", icon: <MessageSquare className="w-4 h-4" /> },
                  { id: "profiles", label: "Business Brain", icon: <Brain className="w-4 h-4" /> },
                  { id: "widget", label: "AI Employee", icon: <Bot className="w-4 h-4" /> },
                  { id: "analytics", label: "Analytics", icon: <TrendingUp className="w-4 h-4" /> },
                  { id: "installation", label: "Installation", icon: <Globe className="w-4 h-4" /> },
                  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as ViewTab)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-between cursor-pointer ${
                        isActive 
                          ? "bg-zinc-950 text-white shadow-sm" 
                          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {tab.icon}
                        <span>{tab.label}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom User Info Area */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 space-y-3.5">
              
              {/* Active Plan Counter status */}
              <div className="space-y-1">
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Usage Limits</span>
                {!userPlan || userPlan.plan === "Guest" ? (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-[11px] text-[#FF7A00] font-bold hover:underline block text-left"
                  >
                    Guest Trial: {user ? (userPlan ? userPlan.repliesRemaining : 3) : Math.max(0, 3 - guestGenerations)} of 3 left. Register for Unlimited!
                  </button>
                ) : (
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    🚀 Free Beta (Unlimited)
                  </span>
                )}
              </div>

              {/* Log out / Log in buttons */}
              {user ? (
                <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-zinc-200">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold text-zinc-900 truncate leading-tight">{user.name}</p>
                    <p className="text-[9px] text-[#FF7A00] font-bold font-mono tracking-wide uppercase">Free Beta</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-zinc-100"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>SaaS Sign In</span>
                </button>
              )}
            </div>

          </aside>

          {/* MAIN SCREEN WORKSPACE CONTAINER */}
          <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50 h-full relative">
            
            {/* TAB ROUTING */}
            
            {/* A: UNIFIED DASHBOARD SUMMARY */}
            {activeTab === "dashboard" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-[1200px] w-full mx-auto">
                
                {/* Welcome Banner */}
                <div className="p-6 bg-white border border-zinc-200 rounded-3xl shadow-sm space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-100/30 to-transparent rounded-bl-full" />
                  <div className="space-y-1 z-10 relative">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] bg-zinc-100 text-zinc-800 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Operational Console
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                        🚀 Free Beta
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-display">
                      Welcome Back, {user ? user.name : "Guest Store Owner"}! 👋
                    </h1>
                    <p className="text-xs text-zinc-500 leading-relaxed max-w-xl font-medium">
                      Your AI employee is active and patrolling your website live chat. We have set up a direct 1-second auto-responder latency to secure maximum conversions.
                    </p>
                  </div>
                </div>

                {/* Grid of Key Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Conversations</span>
                    <h3 className="text-xl font-black text-zinc-900">
                      {dashboardStats?.totalChats || 0} chats
                    </h3>
                    <p className="text-[10px] text-zinc-400">Total volume of visitor sessions</p>
                  </div>
                  <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Messages Handled</span>
                    <h3 className="text-xl font-black text-zinc-900">
                      {dashboardStats?.totalMessages || 0} replies
                    </h3>
                    <p className="text-[10px] text-[#FF7A00] font-bold">100% Autopilot</p>
                  </div>
                  <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Leads Captured</span>
                    <h3 className="text-xl font-black text-emerald-600">
                      {dashboardStats?.leadsCaptured || 0} leads
                    </h3>
                    <p className="text-[10px] text-zinc-400">Collected contact emails/phones</p>
                  </div>
                  <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Response Speed</span>
                    <h3 className="text-xl font-black text-[#FF7A00]">
                      {dashboardStats?.totalChats > 0 ? "Instant (1-2s)" : "N/A"}
                    </h3>
                    <p className="text-[10px] text-zinc-400">Immediate customer feedback</p>
                  </div>
                </div>

                {/* Dashboard layout blocks */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Quick Shortcuts */}
                  <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Quick Operations</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab("inbox")}
                        className="w-full py-3 px-4 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-xs font-bold rounded-xl border border-zinc-200 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>Open Live Chats</span>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => setActiveTab("widget")}
                        className="w-full py-3 px-4 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-xs font-bold rounded-xl border border-zinc-200 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>Configure AI Employee</span>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => setActiveTab("installation")}
                        className="w-full py-3 px-4 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-xs font-bold rounded-xl border border-zinc-200 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>Get Installation Script</span>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                  </div>

                  {/* Active Event Alerts Stream */}
                  <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-2.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Patrol Logs Stream</h3>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                        ● All Systems Active
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      {latestChats.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400">
                          <p className="text-xs font-bold">Awaiting website visitors...</p>
                          <p className="text-[10px] text-zinc-400 mt-1">Once visitors chat with your floating widget, they'll appear here.</p>
                        </div>
                      ) : (
                        latestChats.slice(0, 3).map((chat, idx) => {
                          const lastMsg = chat.messages && chat.messages.length > 0 
                            ? chat.messages[chat.messages.length - 1] 
                            : null;
                          return (
                            <div key={idx} className="flex items-start gap-3 text-xs leading-normal border-b border-zinc-50 pb-3 last:border-0 last:pb-0">
                              <span className="text-lg">🌐</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-extrabold text-zinc-800 flex items-center gap-1.5">
                                  <span>{chat.customerName || "Guest Visitor"}</span>
                                  <span className="font-mono text-[9px] font-bold text-zinc-400">({chat.status})</span>
                                </p>
                                <p className="text-[11px] text-zinc-400 italic font-medium mt-0.5 truncate">{lastMsg ? lastMsg.text : "No messages"}</p>
                                <span className="text-[9px] text-zinc-400 font-mono block mt-1">
                                  {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString() : ""}
                                </span>
                              </div>
                              <button
                                onClick={() => setActiveTab("inbox")}
                                className="px-2.5 py-1 bg-[#FF7A00]/10 hover:bg-[#FF7A00] text-[#FF7A00] hover:text-white border border-orange-200 rounded text-[10px] font-extrabold transition-colors cursor-pointer shrink-0"
                              >
                                View Chat
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* B: LIVE CHATS */}
            {activeTab === "inbox" && (
              <Inbox token={token || ""} />
            )}

            {/* C: BUSINESS BRAIN KNOWLEDGEBASE */}
            {activeTab === "profiles" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-[1200px] w-full mx-auto">
                {user ? (
                  <BusinessBrain token={token || ""} />
                ) : (
                  <div className="p-8 bg-white border border-zinc-200 rounded-3xl text-center space-y-4 max-w-md mx-auto mt-16 shadow-sm">
                    <span className="text-3xl">🧠</span>
                    <h2 className="text-base font-extrabold text-zinc-900">Sign In Required</h2>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      You must be signed in to configure your Business Brain knowledge base, product catalogues, and brand tone guidelines.
                    </p>
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                    >
                      Sign In Now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* D: AI EMPLOYEE WIDGET CONFIGURATION */}
            {activeTab === "widget" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-[1200px] w-full mx-auto">
                {user ? (
                  <AIEmployeeConfig token={token || ""} />
                ) : (
                  <div className="p-8 bg-white border border-zinc-200 rounded-3xl text-center space-y-4 max-w-md mx-auto mt-16 shadow-sm">
                    <span className="text-3xl">🤖</span>
                    <h2 className="text-base font-extrabold text-zinc-900">Sign In Required</h2>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      You must be signed in to configure your AI Employee live chat widget theme, branding, greetings, and toggles.
                    </p>
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                    >
                      Sign In Now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* E: SAAS PERFORMANCE ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-[1200px] w-full mx-auto">
                {user ? (
                  <Analytics token={token || ""} />
                ) : (
                  <div className="p-8 bg-white border border-zinc-200 rounded-3xl text-center space-y-4 max-w-md mx-auto mt-16 shadow-sm">
                    <span className="text-3xl">📈</span>
                    <h2 className="text-base font-extrabold text-zinc-900">Sign In Required</h2>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      You must be signed in to monitor live response speeds, conversion volumes, and customer performance metrics.
                    </p>
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                    >
                      Sign In Now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* F: INSTALLATION INSTRUCTIONS */}
            {activeTab === "installation" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-[1200px] w-full mx-auto">
                {user ? (
                  <Installation token={token || ""} />
                ) : (
                  <div className="p-8 bg-white border border-zinc-200 rounded-3xl text-center space-y-4 max-w-md mx-auto mt-16 shadow-sm">
                    <span className="text-3xl">🌐</span>
                    <h2 className="text-base font-extrabold text-zinc-900">Sign In Required</h2>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      You must be signed in to get your copyable website integration code tag.
                    </p>
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                    >
                      Sign In Now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* H: SAAS SETTINGS & BILLING */}
            {activeTab === "settings" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-[800px] w-full mx-auto">
                
                <div className="space-y-6">
                  
                  {/* Account Profile Card */}
                  <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2.5">
                      SaaS Account Settings
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-zinc-400 block">Full Name</span>
                        <span className="font-extrabold text-zinc-800">{user ? user.name : "Guest User"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-zinc-400 block">Email Address</span>
                        <span className="font-extrabold text-zinc-800">{user ? user.email : "guest-trial@replynest.co"}</span>
                      </div>
                      <div className="space-y-1 pt-2">
                        <span className="font-bold text-zinc-400 block">Account Status</span>
                        <span className="font-extrabold text-zinc-800 uppercase text-[10px] bg-zinc-100 px-2 py-0.5 rounded">
                          {user ? "Verified Profile" : "Temporary Session"}
                        </span>
                      </div>
                      <div className="space-y-1 pt-2">
                        <span className="font-bold text-zinc-400 block">Active Client Token</span>
                        <span className="font-mono text-[10px] text-zinc-500 truncate block">
                          {token ? token.substring(0, 15) + "..." : "guest_trial_session_active"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stripe Billing Configuration Card */}
                  <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-2.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Membership & Stripe Billing
                      </h3>
                      
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full uppercase">
                        🚀 Free Beta Active
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-zinc-900">
                          Unlimited Autopilot Beta Plan
                        </h4>
                        <p className="text-xs text-zinc-500 leading-relaxed max-w-md">
                          ReplyNest is currently running in a public public beta. Your account has been automatically upgraded to our Unlimited Autopilot plan, giving you full access to all features completely free.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </main>

        </div>
      )}

      {/* Auth Modal Trigger popup */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        onReturnToHome={() => {
          setIsAuthModalOpen(false);
          setActiveTab("home");
        }}
      />

      {/* Subscription Pricing & Checkout Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        token={token}
        user={user}
        userPlan={userPlan}
        onAuthTrigger={() => {
          setIsSubscriptionModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        onSubscribeSuccess={(updatedUser, updatedPlan) => {
          setUser(updatedUser);
          if (updatedPlan) {
            setUserPlan(updatedPlan);
          } else {
            fetchUserPlan();
          }
        }}
      />

    </div>
  );
}
