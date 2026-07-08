import React, { useState, useEffect } from "react";
import { X, Check, Sparkles, CreditCard, Lock, Shield, ArrowRight, Zap, CheckCircle, CheckCircle2 } from "lucide-react";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  user: any;
  userPlan: any;
  onAuthTrigger: () => void;
  onSubscribeSuccess: (updatedUser: any, updatedPlan: any) => void;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  token,
  user,
  userPlan,
  onAuthTrigger,
  onSubscribeSuccess
}: SubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [checkoutStep, setCheckoutStep] = useState<"plans" | "payment" | "success">("plans");
  const [showGuestSignUp, setShowGuestSignUp] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (userPlan?.plan === "Guest") {
        setShowGuestSignUp(true);
      } else {
        setShowGuestSignUp(false);
      }
    }
  }, [userPlan, isOpen]);

  if (!isOpen) return null;

  const plans = {
    monthly: {
      id: "monthly",
      name: "Monthly Pro",
      price: "$19",
      period: "month",
      description: "Perfect for testing and growing live chat websites.",
      features: [
        "Unlimited AI Employee replies",
        "Unlimited business brain files",
        "Priority reply latency (1 second)",
        "Advanced intent extraction & tools",
        "Standard system support SLA"
      ]
    },
    yearly: {
      id: "yearly",
      name: "Annual Business Pro",
      price: "$9.92",
      period: "month",
      billed: "Billed annually ($119/year)",
      description: "Our most popular option for serious e-commerce stores.",
      features: [
        "Everything in Monthly Pro",
        "Save 48% over monthly pricing",
        "Premium support with 24h SLA",
        "Custom brand voice training",
        "Advanced sales closing algorithms",
        "Free lifetime widget updates"
      ]
    }
  };

  const handleProceedToPayment = async () => {
    if (!token) {
      onAuthTrigger();
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ planType: selectedPlan })
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
        throw new Error(data.error || "Failed to create checkout session.");
      }

      if (data.url) {
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
          } else {
            window.location.href = data.url;
          }
        } catch (err) {
          window.location.href = data.url;
        }
      } else {
        throw new Error("No checkout URL returned from server.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Checkout transaction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-fade-in font-sans" id="subscription-modal-overlay">
      <div className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        
        {/* Glow Decor */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full filter blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full filter blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/60 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight font-display">ReplyNest Free Beta Program</h2>
              <span className="text-[9px] text-zinc-500 block uppercase font-extrabold tracking-wider mt-0.5">All premium features are 100% unlocked</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-2 hover:bg-zinc-800 border border-transparent hover:border-zinc-700/50 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
          
          {checkoutStep === "plans" && showGuestSignUp && (
            <div className="space-y-6 max-w-2xl mx-auto py-4">
              <div className="text-center space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black text-orange-400 bg-orange-400/10 rounded-full border border-orange-400/20 animate-pulse uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Get Unlimited Access
                </span>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight font-display">
                  Create your free account to unlock Unlimited AI replies
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  You have successfully completed your initial trial. Register a free store profile today to get instant, unlimited access to all AI features completely free during our public beta program.
                </p>
              </div>

              {/* Perks list */}
              <div className="grid sm:grid-cols-2 gap-4 bg-zinc-950/60 p-6 rounded-2xl border border-zinc-800/80">
                <div className="flex gap-3 items-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-zinc-200">Unlimited Free AI Replies</h5>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Instantly active for all registered beta users.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-zinc-200">Business Brain Memory</h5>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Save FAQ links, policies, and files permanently.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-zinc-200">Personal Live Dashboard</h5>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Organize configurations, themes, and chats.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-zinc-200">Saved History Logs</h5>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Inspect every user conversion log historically.</p>
                  </div>
                </div>
              </div>

              {/* Call to action */}
              <div className="flex flex-col gap-3.5 items-center justify-center pt-4">
                <button
                  onClick={onAuthTrigger}
                  className="w-full sm:w-80 bg-orange-500 hover:bg-orange-600 text-white font-black py-3.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 cursor-pointer"
                >
                  <span>Create Free Account with Email</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {checkoutStep === "plans" && !showGuestSignUp && (
            <div className="space-y-6">
              {/* Promotion Header */}
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black text-emerald-400 bg-emerald-400/10 rounded-full border border-emerald-400/20 uppercase tracking-wider animate-pulse">
                  <Sparkles className="w-3 h-3" /> 🚀 Free Beta Access Active
                </span>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight font-display">
                  You Have Unlimited Pro Access!
                </h3>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                  During our public beta period, all premium features are 100% unlocked for authenticated users. No payments, Stripe upgrades, or credit cards are required.
                </p>
              </div>

              {/* Plans Comparison Grid */}
              <div className="max-w-xl mx-auto bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span className="text-sm font-black text-white">Current Active Plan:</span>
                  <span className="text-xs font-black text-[#FF7A00] bg-[#FF7A00]/10 px-3 py-1 rounded-full uppercase">
                    🚀 Free Beta
                  </span>
                </div>

                <div className="space-y-2 text-xs text-zinc-400">
                  <p className="font-bold text-zinc-300">Your unlocked capabilities include:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left font-bold">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Unlimited AI Responses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Custom brand voice memory</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Lead Capture contact forms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Widget color customizer</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkout / CTA Buttons */}
              <div className="flex gap-3 items-center justify-center mt-8 border-t border-zinc-800/80 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-xl text-xs cursor-pointer transition-all shadow-md"
                >
                  Return to Console
                </button>
              </div>
            </div>
          )}

          {checkoutStep === "payment" && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-white">Simulated Checkout</h3>
                <p className="text-xs text-zinc-400">
                  Secure sandbox payment for <span className="text-white font-semibold">{plans[selectedPlan].name}</span> ({selectedPlan === "monthly" ? "$19/mo" : "$119/yr"})
                </p>
              </div>

              {error && (
                <div className="p-3.5 bg-red-950/20 border border-red-500/20 text-red-200 text-xs rounded-xl">
                  {error}
                </div>
              )}
            </div>
          )}

          {checkoutStep === "success" && (
            <div className="text-center max-w-md mx-auto space-y-6 py-6 animate-scale-up">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-lg shadow-emerald-500/5">
                <CheckCircle className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight font-display">Subscription Activated!</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  Congratulations <span className="font-bold text-zinc-200">{user?.name}</span>! You have been successfully upgraded to <span className="text-[#FF7A00] font-black">ReplyNest Pro</span>. Unlimited replies and rapid latency are now active.
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Selected Plan:</span>
                  <span className="font-bold text-zinc-200">{plans[selectedPlan].name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Status:</span>
                  <span className="font-bold text-emerald-500 flex items-center gap-1">● Active Pro</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Billing Period:</span>
                  <span className="font-bold text-zinc-200">{selectedPlan === "monthly" ? "Monthly" : "Annually"}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-[#FF7A00] hover:bg-[#e06b00] text-white font-black py-3 px-6 rounded-xl text-xs transition-all shadow-lg cursor-pointer"
              >
                Start Using ReplyNest Pro
              </button>
            </div>
          )}

        </div>
        
        {/* Footer info lock */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-center flex items-center justify-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
          <Lock className="w-3.5 h-3.5 text-[#FF7A00]" /> SECURE SANDBOX TRANSACTION INTEGRATION
        </div>
      </div>
    </div>
  );
}
