import React, { useState } from "react";
import { X, Sparkles, ArrowRight, Home, Mail, Lock, User, ShieldCheck, CheckCircle2 } from "lucide-react";
import { emailSignUp, emailSignIn } from "../lib/firebaseAuth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string, user: { id: string; email: string; name: string }) => void;
  onReturnToHome?: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, onReturnToHome }: AuthModalProps) {
  const [activeMode, setActiveMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        throw new Error("Please fill in all required fields.");
      }

      if (activeMode === "signup") {
        if (!displayName.trim()) {
          throw new Error("Display Name is required for Sign-Up.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }

        // 1. Firebase Auth user creation & direct Firestore write satisfying validation rules
        const result = await emailSignUp(email, password, displayName);

        // 2. Sync session with Express backend
        const response = await fetch("/api/auth/email-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: result.user.uid,
            email: result.user.email,
            name: displayName,
            guestId: localStorage.getItem("replynest_guest_id")
          })
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
          throw new Error(data.error || "Failed to sync registration with server.");
        }

        onAuthSuccess(data.token, data.user);
        onClose();
      } else {
        // 1. Firebase Auth sign in & update lastLogin in Firestore
        const result = await emailSignIn(email, password);

        // 2. Sync session with Express backend
        const response = await fetch("/api/auth/email-signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: result.user.uid,
            email: result.user.email,
            name: result.user.displayName || "User"
          })
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
          throw new Error(data.error || "Failed to sync login with server.");
        }

        onAuthSuccess(data.token, data.user);
        onClose();
      }
    } catch (err: any) {
      console.error("Authentication Error:", err);
      // Clean up common Firebase errors for premium readability
      let friendlyMessage = err.message;
      if (friendlyMessage.includes("auth/invalid-credential") || friendlyMessage.includes("auth/user-not-found") || friendlyMessage.includes("auth/wrong-password")) {
        friendlyMessage = "Invalid email or password. Please verify and try again.";
      } else if (friendlyMessage.includes("auth/email-already-in-use")) {
        friendlyMessage = "This email is already registered. Try logging in instead.";
      } else if (friendlyMessage.includes("auth/weak-password")) {
        friendlyMessage = "The password is too weak. It must be at least 6 characters long.";
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 bg-zinc-950 z-[100] flex flex-col md:flex-row overflow-y-auto animate-fade-in font-sans">
      
      {/* LEFT COLUMN: Feature Pitch & Branding (Visible on desktop) */}
      <div className="hidden md:flex md:w-[40%] bg-zinc-900 border-r border-zinc-800 p-10 lg:p-12 flex-col justify-between relative overflow-hidden h-screen sticky top-0 shrink-0">
        {/* Glow Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,122,0,0.08),transparent_50%)] pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-emerald-500/5 rounded-full filter blur-[80px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Brand identity */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-[#FF7A00] rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-500/10">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="text-base font-black tracking-tight font-display text-white">
              ReplyNest <span className="text-[#FF7A00]">AI</span>
            </span>
            <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-widest mt-0.5">Autonomous Store Agent</span>
          </div>
        </div>

        {/* Selling Value Props */}
        <div className="space-y-8 relative z-10 max-w-sm my-auto">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF7A00] text-[10px] font-bold uppercase tracking-wider">
              ⚡ Autopilot Activated
            </span>
            <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-[1.15] font-display">
              Employ AI to chat, convert, and close 24/7.
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Deploy a hyper-intelligent digital clerk trained on your custom store guidelines, inventory answers, and support playbooks.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-800">
            {[
              { title: "Instant Response Speeds", desc: "Replies generated in 1-2 seconds to catch customer interest instantly." },
              { title: "Dynamic Business Brain", desc: "Learns details from store links, shipping schedules, and refund policies." },
              { title: "Autopilot Mode Toggles", desc: "Let the AI resolve customer inquiries on full autopilot with high accuracy." },
              { title: "Copyable Widget Script", desc: "Embed custom styled floating chat widget on any shop platform instantly." }
            ].map((feat, i) => (
              <div key={i} className="flex gap-3 items-start">
                <CheckCircle2 className="w-4 h-4 text-[#FF7A00] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">{feat.title}</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal mt-0.5">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="relative z-10 border-t border-zinc-800 pt-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Enterprise grade encryption & user privacy standards.</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: The Auth Form Area */}
      <div className="flex-1 min-h-screen bg-zinc-950 flex flex-col justify-center items-center relative p-6 md:p-12 lg:p-16">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full filter blur-[120px] pointer-events-none" />

        {/* Floating Top Nav Actions */}
        <div className="absolute top-6 left-6 right-6 sm:left-8 sm:right-8 flex items-center justify-between z-20">
          <button
            onClick={onReturnToHome || onClose}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 text-xs font-bold transition-all cursor-pointer shadow-md shadow-black/20"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Home Page</span>
          </button>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-2 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Core Form Card */}
        <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-md relative z-10 mt-12 md:mt-0">
          
          {/* Header */}
          <div className="text-center mb-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF7A00] text-[10px] font-black uppercase tracking-wider">
              ✨ CLAIM YOUR 20 FREE REPLIES
            </div>
            <h3 className="text-xl font-black text-white tracking-tight font-display mt-2">
              {activeMode === "signin" ? "Welcome back" : "Create store profile"}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
              Save business profiles, integrate floating widgets, and monitor live customer conversation histories.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 mb-6">
            <button
              type="button"
              onClick={() => { setActiveMode("signin"); setError(null); }}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === "signin"
                  ? "bg-[#FF7A00] text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveMode("signup"); setError(null); }}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === "signup"
                  ? "bg-[#FF7A00] text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="p-3.5 bg-red-950/20 border border-red-500/20 text-red-200 text-xs rounded-xl mb-5 leading-relaxed">
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeMode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Full Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    className="pl-10 pr-4 py-3 w-full bg-zinc-950 text-xs border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#FF7A00] transition-colors focus:ring-1 focus:ring-[#FF7A00]/20"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@shop.com"
                  className="pl-10 pr-4 py-3 w-full bg-zinc-950 text-xs border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#FF7A00] transition-colors focus:ring-1 focus:ring-[#FF7A00]/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-4 py-3 w-full bg-zinc-950 text-xs border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#FF7A00] transition-colors focus:ring-1 focus:ring-[#FF7A00]/20"
                />
              </div>
            </div>

            {activeMode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-4 py-3 w-full bg-zinc-950 text-xs border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#FF7A00] transition-colors focus:ring-1 focus:ring-[#FF7A00]/20"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-[#FF7A00] hover:bg-[#e06b00] text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/10 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>{activeMode === "signup" ? "Create Free Account" : "Sign In to Account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Secure Encrypted Footer Badge */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center flex items-center justify-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
            <span>🔒 Secure Encrypted Cloud Verification</span>
          </div>

        </div>
      </div>
    </div>
  );
}
