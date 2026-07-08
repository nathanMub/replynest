import React, { useState, useEffect, useRef } from "react";
import { 
  Building, 
  Volume2, 
  FileText, 
  ShoppingBag, 
  HelpCircle, 
  Sliders, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Save, 
  AlertTriangle,
  Info,
  ExternalLink,
  PlusCircle
} from "lucide-react";
import { db, auth } from "../lib/firebaseAuth";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  onSnapshot 
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../utils/firestoreError";

// UI Sub-tabs for the Business Brain
type SubTab = "profile" | "voice" | "rules" | "products" | "faqs" | "preferences";

export interface BusinessBrainData {
  businessName: string;
  industry: string;
  businessDescription: string;
  country: string;
  whatsAppNumber: string;
  website: string;
  brandTone: string;
  brandPersonality: string;
  replyRules: string;
  replyLength: "short" | "medium" | "long";
  outputLanguage: string;
  autoRecommendProducts: boolean;
  autoAnswerFaqs: boolean;
}

export interface SavedProduct {
  id: string;
  userId: string;
  name: string;
  price: string;
  description: string;
  sku?: string;
  createdAt?: string;
}

export interface SavedFaq {
  id: string;
  userId: string;
  question: string;
  answer: string;
  createdAt?: string;
}

interface BusinessBrainProps {
  token: string;
}

const DEFAULT_BRAIN: BusinessBrainData = {
  businessName: "",
  industry: "",
  businessDescription: "",
  country: "",
  whatsAppNumber: "",
  website: "",
  brandTone: "Friendly",
  brandPersonality: "",
  replyRules: "",
  replyLength: "medium",
  outputLanguage: "English",
  autoRecommendProducts: true,
  autoAnswerFaqs: true,
};

export default function BusinessBrain({ token }: BusinessBrainProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("profile");
  
  // Loading and Saving states
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings State (combining Profile, Voice, Rules, Preferences)
  const [brain, setBrain] = useState<BusinessBrainData>(DEFAULT_BRAIN);
  
  // Lists for Products and FAQs
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [faqs, setFaqs] = useState<SavedFaq[]>([]);

  // Product Modals / Form
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SavedProduct | null>(null);
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pDescription, setPDescription] = useState("");
  const [pSku, setPSku] = useState("");

  // FAQ Modals / Form
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<SavedFaq | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");

  // Keep a ref to debounce autosaving settings
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  // --- 1. Load Data on Mount/Token Change ---
  useEffect(() => {
    let isMounted = true;
    
    async function loadAllData() {
      if (!token) return;
      setLoading(true);
      setErrorMessage(null);

      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        // Fetch User Settings
        const docRef = doc(db, "userSettings", currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && isMounted) {
          const data = docSnap.data();
          // Map stored Firestore structure into our comprehensive brain model
          setBrain({
            businessName: data.businessProfile?.businessName || data.businessName || "",
            industry: data.businessProfile?.industry || data.industry || "",
            businessDescription: data.businessProfile?.businessDescription || data.businessDescription || "",
            country: data.businessProfile?.country || data.country || "",
            whatsAppNumber: data.businessProfile?.whatsAppNumber || data.whatsappNumber || "",
            website: data.businessProfile?.website || data.website || "",
            brandTone: data.brandVoice?.brandTone || data.brandTone || "Friendly",
            brandPersonality: data.brandVoice?.brandPersonality || data.brandPersonality || "",
            replyRules: data.replyRules || "",
            replyLength: data.aiPreferences?.replyLength || data.replyLength || "medium",
            outputLanguage: data.aiPreferences?.outputLanguage || data.outputLanguage || "English",
            autoRecommendProducts: data.aiPreferences?.autoRecommendProducts !== false,
            autoAnswerFaqs: data.aiPreferences?.autoAnswerFaqs !== false,
          });
        } else if (isMounted) {
          // No settings document, initialize with defaults
          setBrain(DEFAULT_BRAIN);
        }

        // Fetch Products and FAQs
        const prodsQuery = query(collection(db, "savedProducts"), where("userId", "==", currentUser.uid));
        const faqsQuery = query(collection(db, "savedFaqs"), where("userId", "==", currentUser.uid));

        const [prodsSnap, faqsSnap] = await Promise.all([
          getDocs(prodsQuery),
          getDocs(faqsQuery)
        ]);

        if (isMounted) {
          const loadedProducts: SavedProduct[] = [];
          prodsSnap.forEach((d) => loadedProducts.push(d.data() as SavedProduct));
          setProducts(loadedProducts);

          const loadedFaqs: SavedFaq[] = [];
          faqsSnap.forEach((d) => loadedFaqs.push(d.data() as SavedFaq));
          setFaqs(loadedFaqs);
        }

      } catch (err: any) {
        console.error("Error loading Business Brain:", err);
        if (isMounted) {
          setErrorMessage("Failed to fetch some of your settings. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      }
    }

    loadAllData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // --- 2. Autosave settings whenever brain changes ---
  useEffect(() => {
    if (isFirstLoad.current) return;

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setSavingStatus("saving");

    // Set a debounce timer of 1000ms
    timerRef.current = setTimeout(async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const docRef = doc(db, "userSettings", currentUser.uid);
        
        // Structured representation for clean storage
        const savePayload = {
          // Maintain compatibility with existing rules and other modules
          whatsappNumber: brain.whatsAppNumber,
          updatedAt: new Date().toISOString(),
          
          // Nest nicely to keep firestore neat
          businessProfile: {
            businessName: brain.businessName,
            industry: brain.industry,
            businessDescription: brain.businessDescription,
            country: brain.country,
            whatsAppNumber: brain.whatsAppNumber,
            website: brain.website,
          },
          brandVoice: {
            brandTone: brain.brandTone,
            brandPersonality: brain.brandPersonality,
          },
          replyRules: brain.replyRules,
          aiPreferences: {
            replyLength: brain.replyLength,
            outputLanguage: brain.outputLanguage,
            autoRecommendProducts: brain.autoRecommendProducts,
            autoAnswerFaqs: brain.autoAnswerFaqs,
          }
        };

        await setDoc(docRef, savePayload, { merge: true });
        setSavingStatus("saved");
        setTimeout(() => setSavingStatus("idle"), 2000);
      } catch (err: any) {
        console.error("Error autosaving settings:", err);
        setSavingStatus("error");
        setErrorMessage("Auto-save failed. Check your network connection.");
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [brain]);

  // Handle manual/instant save (e.g. key triggers or blur)
  const triggerInstantSave = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSavingStatus("saving");
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const docRef = doc(db, "userSettings", currentUser.uid);
      await setDoc(docRef, {
        whatsappNumber: brain.whatsAppNumber,
        updatedAt: new Date().toISOString(),
        businessProfile: {
          businessName: brain.businessName,
          industry: brain.industry,
          businessDescription: brain.businessDescription,
          country: brain.country,
          whatsAppNumber: brain.whatsAppNumber,
          website: brain.website,
        },
        brandVoice: {
          brandTone: brain.brandTone,
          brandPersonality: brain.brandPersonality,
        },
        replyRules: brain.replyRules,
        aiPreferences: {
          replyLength: brain.replyLength,
          outputLanguage: brain.outputLanguage,
          autoRecommendProducts: brain.autoRecommendProducts,
          autoAnswerFaqs: brain.autoAnswerFaqs,
        }
      }, { merge: true });
      setSavingStatus("saved");
      setTimeout(() => setSavingStatus("idle"), 2000);
    } catch (err) {
      console.error("Error in instant save:", err);
      setSavingStatus("error");
    }
  };

  // Helper to change individual field of the brain state
  const handleFieldChange = (key: keyof BusinessBrainData, value: any) => {
    setBrain(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // --- 3. PRODUCTS MANAGEMENT ---
  const openAddProduct = () => {
    setEditingProduct(null);
    setPName("");
    setPPrice("");
    setPDescription("");
    setPSku("");
    setIsProductModalOpen(true);
  };

  const openEditProduct = (prod: SavedProduct) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPPrice(prod.price);
    setPDescription(prod.description);
    setPSku(prod.sku || "");
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pPrice.trim() || !pDescription.trim()) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const pid = editingProduct?.id || doc(collection(db, "savedProducts")).id;
      const docRef = doc(db, "savedProducts", pid);

      const newProduct: SavedProduct = {
        id: pid,
        userId: currentUser.uid,
        name: pName.trim(),
        price: pPrice.trim(),
        description: pDescription.trim(),
        sku: pSku.trim() || undefined,
        createdAt: editingProduct?.createdAt || new Date().toISOString()
      };

      await setDoc(docRef, newProduct);
      
      setProducts(prev => {
        const index = prev.findIndex(p => p.id === pid);
        if (index > -1) {
          const copy = [...prev];
          copy[index] = newProduct;
          return copy;
        }
        return [newProduct, ...prev];
      });

      setIsProductModalOpen(false);
      setSavingStatus("saved");
      setTimeout(() => setSavingStatus("idle"), 2000);
    } catch (fsErr: any) {
      handleFirestoreError(fsErr, OperationType.WRITE, "savedProducts");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, "savedProducts", id));
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (fsErr: any) {
      handleFirestoreError(fsErr, OperationType.DELETE, `savedProducts/${id}`);
    }
  };

  // --- 4. FAQS MANAGEMENT ---
  const openAddFaq = () => {
    setEditingFaq(null);
    setFaqQuestion("");
    setFaqAnswer("");
    setIsFaqModalOpen(true);
  };

  const openEditFaq = (faq: SavedFaq) => {
    setEditingFaq(faq);
    setFaqQuestion(faq.question);
    setFaqAnswer(faq.answer);
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const fid = editingFaq?.id || doc(collection(db, "savedFaqs")).id;
      const docRef = doc(db, "savedFaqs", fid);

      const newFaq: SavedFaq = {
        id: fid,
        userId: currentUser.uid,
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
        createdAt: editingFaq?.createdAt || new Date().toISOString()
      };

      await setDoc(docRef, newFaq);

      setFaqs(prev => {
        const index = prev.findIndex(f => f.id === fid);
        if (index > -1) {
          const copy = [...prev];
          copy[index] = newFaq;
          return copy;
        }
        return [newFaq, ...prev];
      });

      setIsFaqModalOpen(false);
      setSavingStatus("saved");
      setTimeout(() => setSavingStatus("idle"), 2000);
    } catch (fsErr: any) {
      handleFirestoreError(fsErr, OperationType.WRITE, "savedFaqs");
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      await deleteDoc(doc(db, "savedFaqs", id));
      setFaqs(prev => prev.filter(f => f.id !== id));
    } catch (fsErr: any) {
      handleFirestoreError(fsErr, OperationType.DELETE, `savedFaqs/${id}`);
    }
  };


  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-[#25D366] animate-spin" />
        <p className="text-sm text-slate-400 font-mono">Powering up Business Brain...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] text-slate-100">
      
      {/* Left Navigation panel */}
      <aside className="w-full lg:w-[280px] shrink-0 bg-[#0B141A] rounded-2xl border border-[#222E35]/60 p-4 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="p-3 border-b border-[#222E35]/60 mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#25D366]" />
              Business Brain
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Configure your AI Representative</p>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={() => setActiveSubTab("profile")}
            className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === "profile" 
                ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 font-bold" 
                : "text-slate-400 hover:text-white hover:bg-[#1C2C35]/50 border border-transparent"
            }`}
          >
            <Building className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <p className="leading-tight">Business Profile</p>
              <p className="text-[9px] text-slate-500 font-normal">Core identity details</p>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab("voice")}
            className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === "voice" 
                ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 font-bold" 
                : "text-slate-400 hover:text-white hover:bg-[#1C2C35]/50 border border-transparent"
            }`}
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <p className="leading-tight">Brand Voice</p>
              <p className="text-[9px] text-slate-500 font-normal">Personality & tone</p>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab("rules")}
            className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === "rules" 
                ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 font-bold" 
                : "text-slate-400 hover:text-white hover:bg-[#1C2C35]/50 border border-transparent"
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <p className="leading-tight">Reply Rules</p>
              <p className="text-[9px] text-slate-500 font-normal">Compliance guidelines</p>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab("products")}
            className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === "products" 
                ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 font-bold" 
                : "text-slate-400 hover:text-white hover:bg-[#1C2C35]/50 border border-transparent"
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <p className="leading-tight">Saved Products</p>
              <p className="text-[9px] text-slate-500 font-normal">Items & price listings</p>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab("faqs")}
            className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === "faqs" 
                ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 font-bold" 
                : "text-slate-400 hover:text-white hover:bg-[#1C2C35]/50 border border-transparent"
            }`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <p className="leading-tight">Saved FAQs</p>
              <p className="text-[9px] text-slate-500 font-normal">Questions & answers</p>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab("preferences")}
            className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeSubTab === "preferences" 
                ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 font-bold" 
                : "text-slate-400 hover:text-white hover:bg-[#1C2C35]/50 border border-transparent"
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <p className="leading-tight">AI Preferences</p>
              <p className="text-[9px] text-slate-500 font-normal">Length & logic triggers</p>
            </div>
          </button>
        </div>

        {/* Sync / Autosave status block */}
        <div className="mt-6 pt-4 border-t border-[#222E35]/60 px-2 space-y-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Sync Status</span>
            <div className="flex items-center gap-1.5">
              {savingStatus === "saving" && (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span className="text-amber-400 font-mono font-bold uppercase">Saving...</span>
                </>
              )}
              {savingStatus === "saved" && (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-[#25D366]"></span>
                  <span className="text-[#25D366] font-mono font-bold uppercase">Sync OK</span>
                </>
              )}
              {(savingStatus === "idle" || savingStatus === "error") && (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-[#00A884]"></span>
                  <span className="text-[#00A884] font-mono font-semibold uppercase">Cloud Active</span>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-[#1C2C35]/40 border border-[#222E35] p-2.5 rounded-xl text-[10px] text-slate-400 leading-relaxed flex gap-2">
            <Info className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
            <span>
              Your changes are automatically stored in your secure Cloud Firestore account. The AI Generator uses this profile instantly.
            </span>
          </div>
        </div>
      </aside>

      {/* Right Content Area */}
      <main className="flex-1 bg-[#111B21]/40 border border-[#222E35]/40 rounded-2xl p-6 md:p-8 flex flex-col justify-between">
        
        {/* Error toast banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/20 text-red-200 rounded-xl flex items-start gap-3 text-xs leading-relaxed animate-shake">
            <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white font-bold px-1">&times;</button>
          </div>
        )}

        <div className="space-y-6">
          
          {/* TAB 1: BUSINESS PROFILE */}
          {activeSubTab === "profile" && (
            <div className="space-y-6">
              <div className="border-b border-[#222E35]/60 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#25D366]" />
                  Business Profile
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Introduce your business to the AI employee. It uses these details to handle inquiries intelligently.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="bb-name" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Business Name</label>
                  <input
                    id="bb-name"
                    type="text"
                    value={brain.businessName}
                    onChange={(e) => handleFieldChange("businessName", e.target.value)}
                    onBlur={triggerInstantSave}
                    placeholder="e.g. Apex Apparel Store"
                    className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="bb-industry" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Industry / Niche</label>
                  <input
                    id="bb-industry"
                    type="text"
                    value={brain.industry}
                    onChange={(e) => handleFieldChange("industry", e.target.value)}
                    onBlur={triggerInstantSave}
                    placeholder="e.g. High-end Streetwear, Salon, Organic Bakery"
                    className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="bb-country" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Country / Region</label>
                  <input
                    id="bb-country"
                    type="text"
                    value={brain.country}
                    onChange={(e) => handleFieldChange("country", e.target.value)}
                    onBlur={triggerInstantSave}
                    placeholder="e.g. United Kingdom, South Africa"
                    className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="bb-phone" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">WhatsApp Number</label>
                  <input
                    id="bb-phone"
                    type="tel"
                    value={brain.whatsAppNumber}
                    onChange={(e) => handleFieldChange("whatsAppNumber", e.target.value)}
                    onBlur={triggerInstantSave}
                    placeholder="e.g. +44712345678"
                    className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="bb-website" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Website URL</label>
                  <input
                    id="bb-website"
                    type="url"
                    value={brain.website}
                    onChange={(e) => handleFieldChange("website", e.target.value)}
                    onBlur={triggerInstantSave}
                    placeholder="e.g. https://www.apexapparel.co"
                    className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="bb-desc" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Business Description & Offerings</label>
                  <textarea
                    id="bb-desc"
                    rows={4}
                    value={brain.businessDescription}
                    onChange={(e) => handleFieldChange("businessDescription", e.target.value)}
                    onBlur={triggerInstantSave}
                    placeholder="Tell the AI what you sell, what makes your business unique, shipping policies, returns, or accepted payment methods..."
                    className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-600 resize-none focus:outline-none transition-all leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRAND VOICE */}
          {activeSubTab === "voice" && (
            <div className="space-y-6">
              <div className="border-b border-[#222E35]/60 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-[#25D366]" />
                  Brand Voice & Tone
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust how your AI employee speaks. It will match this tone in all sales dialogues and replies.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Select Primary Voice Tone</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {["Friendly", "Professional", "Sales Focused", "Premium", "Luxury Brand", "Casual"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleFieldChange("brandTone", t)}
                        className={`px-3 py-3 rounded-xl text-xs font-semibold transition-all duration-150 border text-center ${
                          brain.brandTone === t
                            ? "bg-[#25D366] text-[#0B141A] border-[#25D366] shadow-md shadow-[#25D366]/15 font-bold"
                            : "bg-[#0B141A] hover:bg-[#1C2C35]/50 text-slate-300 border-[#222E35] hover:border-slate-500/50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="bb-personality" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Brand Personality Description</label>
                  <textarea
                    id="bb-personality"
                    rows={4}
                    value={brain.brandPersonality}
                    onChange={(e) => handleFieldChange("brandPersonality", e.target.value)}
                    onBlur={triggerInstantSave}
                    placeholder="Describe how the AI should introduce itself. (e.g. 'Energetic and passionate streetwear enthusiast. Uses emojis like ⚡, speaks casually but holds deep fashion expertise, always welcomes customers as friends.')"
                    className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-600 resize-none focus:outline-none transition-all leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REPLY RULES */}
          {activeSubTab === "rules" && (
            <div className="space-y-6">
              <div className="border-b border-[#222E35]/60 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#25D366]" />
                  Custom Reply Rules
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enforce specific operational rules or constraints. The AI is strictly compliant and will not violate these.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-[#1C2C35]/25 border border-[#222E35] p-4 rounded-xl flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
                  <Sparkles className="w-4 h-4 text-[#25D366] shrink-0" />
                  <div>
                    <span className="font-semibold text-white block mb-1">Examples of strict constraints:</span>
                    <ul className="list-disc list-inside space-y-1">
                      <li>"Never offer discounts above 10% under any circumstance."</li>
                      <li>"Always invite the customer to visit our physical store at 123 Fashion Lane."</li>
                      <li>"Do not make shipping guarantees; say we ship orders within 24-48 business hours."</li>
                      <li>"Keep responses polite, but firmly declines booking changes within 24 hours of scheduled slot."</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="bb-rules" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Behavioral Guidelines & Rules (One rule per line)</label>
                  <textarea
                    id="bb-rules"
                    rows={8}
                    value={brain.replyRules}
                    onChange={(e) => handleFieldChange("replyRules", e.target.value)}
                    onBlur={triggerInstantSave}
                    placeholder="Write your strict guidelines here, e.g.:&#10;- Always greet with the client's name if provided.&#10;- Never promise refund without original receipt.&#10;- Mention free delivery is only for orders above £50."
                    className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-600 resize-none font-mono focus:outline-none transition-all leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SAVED PRODUCTS */}
          {activeSubTab === "products" && (
            <div className="space-y-6">
              <div className="border-b border-[#222E35]/60 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#25D366]" />
                    Saved Products
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Input items with descriptions. The AI automatically recommends these when relevant.
                  </p>
                </div>
                <button
                  onClick={openAddProduct}
                  className="px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-[#0B141A] font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-[#25D366]/10 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Add Item
                </button>
              </div>

              {/* Product Listing Grid */}
              {products.length === 0 ? (
                <div className="py-12 border border-dashed border-[#222E35] rounded-2xl text-center space-y-3">
                  <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400">No products saved yet.</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add products that you frequently pitch. The AI employee will pitch these with pricing and descriptions to close deals!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((prod) => (
                    <div 
                      key={prod.id} 
                      className="p-4 bg-[#0B141A]/50 border border-[#222E35]/80 hover:border-slate-700 rounded-xl space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-white text-sm">{prod.name}</h4>
                          <span className="text-xs text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded font-mono font-bold">{prod.price}</span>
                        </div>
                        {prod.sku && <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {prod.sku}</p>}
                        <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">{prod.description}</p>
                      </div>
                      
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222E35]/40 mt-3">
                        <button
                          onClick={() => openEditProduct(prod)}
                          className="p-1.5 bg-[#222E35]/60 text-slate-400 hover:text-white rounded transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 bg-red-950/20 text-red-400/80 hover:bg-red-950/40 hover:text-red-400 rounded transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SAVED FAQS */}
          {activeSubTab === "faqs" && (
            <div className="space-y-6">
              <div className="border-b border-[#222E35]/60 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#25D366]" />
                    Saved FAQs
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Store standard corporate answers. The AI handles customer match-ups automatically.
                  </p>
                </div>
                <button
                  onClick={openAddFaq}
                  className="px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-[#0B141A] font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-[#25D366]/10 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Add FAQ
                </button>
              </div>

              {/* FAQs List */}
              {faqs.length === 0 ? (
                <div className="py-12 border border-dashed border-[#222E35] rounded-2xl text-center space-y-3">
                  <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400">No FAQs saved yet.</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Save answers to repeating customer queries. The AI employee will inject these pre-approved answers automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <div 
                      key={faq.id} 
                      className="p-4 bg-[#0B141A]/50 border border-[#222E35]/80 hover:border-slate-700 rounded-xl space-y-2 flex flex-col md:flex-row md:items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#25D366] bg-[#25D366]/10 px-1.5 py-0.5 rounded font-bold font-mono">Q</span>
                          <h4 className="font-bold text-white text-xs sm:text-sm">{faq.question}</h4>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] text-slate-400 bg-[#222E35] px-1.5 py-0.5 rounded font-bold font-mono mt-0.5">A</span>
                          <p className="text-xs text-slate-300 leading-relaxed flex-1">{faq.answer}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-2 shrink-0 self-end md:self-start">
                        <button
                          onClick={() => openEditFaq(faq)}
                          className="p-1.5 bg-[#222E35]/60 text-slate-400 hover:text-white rounded transition-colors"
                          title="Edit FAQ"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFaq(faq.id)}
                          className="p-1.5 bg-red-950/20 text-red-400/80 hover:bg-red-950/40 hover:text-red-400 rounded transition-colors"
                          title="Delete FAQ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: AI PREFERENCES */}
          {activeSubTab === "preferences" && (
            <div className="space-y-6">
              <div className="border-b border-[#222E35]/60 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#25D366]" />
                  AI Execution Preferences
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust standard execution constraints and features to customize the response pipeline.
                </p>
              </div>

              <div className="space-y-6">
                
                {/* Length selection */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Preferred Reply Length</span>
                  <div className="grid grid-cols-3 gap-2">
                    {["short", "medium", "long"].map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => handleFieldChange("replyLength", len)}
                        className={`px-3 py-3 rounded-xl text-xs font-semibold transition-all duration-150 border text-center uppercase tracking-wider ${
                          brain.replyLength === len
                            ? "bg-[#25D366] text-[#0B141A] border-[#25D366] shadow-md shadow-[#25D366]/15 font-bold"
                            : "bg-[#0B141A] hover:bg-[#1C2C35]/50 text-slate-300 border-[#222E35] hover:border-slate-500/50"
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Output language */}
                <div className="space-y-2">
                  <label htmlFor="bb-lang" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Output Language</label>
                  <input
                    id="bb-lang"
                    type="text"
                    value={brain.outputLanguage}
                    onChange={(e) => handleFieldChange("outputLanguage", e.target.value)}
                    onBlur={triggerInstantSave}
                    placeholder="e.g. English, Spanish (Español), Multi-lingual"
                    className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:outline-none transition-colors"
                  />
                </div>

                {/* Integration triggers */}
                <div className="space-y-4 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Automation Features</span>
                  
                  <label className="flex items-start gap-3 p-3 bg-[#0B141A]/50 border border-[#222E35]/80 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={brain.autoRecommendProducts}
                      onChange={(e) => handleFieldChange("autoRecommendProducts", e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#25D366] rounded focus:ring-0 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-white block">Auto Product Recommendation</span>
                      <span className="text-[10px] text-slate-400 leading-normal block mt-0.5">
                        Enable the AI to match customer intents and recommend matching saved items from your inventory.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-[#0B141A]/50 border border-[#222E35]/80 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={brain.autoAnswerFaqs}
                      onChange={(e) => handleFieldChange("autoAnswerFaqs", e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#25D366] rounded focus:ring-0 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-white block">Automatic FAQ Retrieval</span>
                      <span className="text-[10px] text-slate-400 leading-normal block mt-0.5">
                        Enable the AI to read your saved questions and pre-populate exact policies and terms for answers.
                      </span>
                    </div>
                  </label>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Footer info or instant save trigger */}
        <div className="mt-8 pt-4 border-t border-[#222E35]/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#25D366]"></span>
            <span>Real-time Secure Connection Active</span>
          </div>
          
          <button
            onClick={triggerInstantSave}
            className="px-4 py-2 bg-[#1C2C35] hover:bg-[#222E35] border border-[#222E35] text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#25D366]" /> Save Changes Now
          </button>
        </div>

      </main>

      {/* PRODUCT DIALOG / MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-[#0B141A]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111B21] border border-[#222E35] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-[#222E35]/60 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#25D366]" />
                {editingProduct ? "Edit Product" : "Add Product to Brain"}
              </h3>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-500 hover:text-white font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="p-name" className="text-[11px] font-bold uppercase text-slate-400">Product Name *</label>
                <input
                  id="p-name"
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="e.g. Vintage Leather Jacket"
                  className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="p-price" className="text-[11px] font-bold uppercase text-slate-400">Price *</label>
                  <input
                    id="p-price"
                    type="text"
                    required
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    placeholder="e.g. $120.00"
                    className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="p-sku" className="text-[11px] font-bold uppercase text-slate-400">SKU (Optional)</label>
                  <input
                    id="p-sku"
                    type="text"
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                    placeholder="e.g. VLJ-RED-10"
                    className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="p-desc" className="text-[11px] font-bold uppercase text-slate-400">Description *</label>
                <textarea
                  id="p-desc"
                  required
                  rows={4}
                  value={pDescription}
                  onChange={(e) => setPDescription(e.target.value)}
                  placeholder="Details about product materials, sizes, colors, shipping, or selling points..."
                  className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl p-3 text-xs sm:text-sm text-slate-100 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#222E35]/60">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-[#0B141A] font-bold text-xs rounded-xl transition-all shadow-md shadow-[#25D366]/10 cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAQ DIALOG / MODAL */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 bg-[#0B141A]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111B21] border border-[#222E35] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-[#222E35]/60 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#25D366]" />
                {editingFaq ? "Edit FAQ" : "Add FAQ to Brain"}
              </h3>
              <button 
                onClick={() => setIsFaqModalOpen(false)}
                className="text-slate-500 hover:text-white font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="faq-q" className="text-[11px] font-bold uppercase text-slate-400">Question / Inquiry *</label>
                <input
                  id="faq-q"
                  type="text"
                  required
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="e.g. Do you offer free shipping?"
                  className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="faq-a" className="text-[11px] font-bold uppercase text-slate-400">Answer / Pre-Approved Policy *</label>
                <textarea
                  id="faq-a"
                  required
                  rows={5}
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  placeholder="Write approved terms or answer guidelines clearly..."
                  className="w-full bg-[#0B141A] border border-[#222E35] focus:border-[#25D366]/60 rounded-xl p-3 text-xs sm:text-sm text-slate-100 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#222E35]/60">
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-[#0B141A] font-bold text-xs rounded-xl transition-all shadow-md shadow-[#25D366]/10 cursor-pointer"
                >
                  Save FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
