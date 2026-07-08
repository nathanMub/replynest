import React, { useState, useEffect } from "react";
import { 
  Bot, 
  MessageSquare, 
  Clock, 
  Sliders, 
  Save, 
  AlertTriangle, 
  HelpCircle, 
  Sparkles, 
  RefreshCw, 
  User, 
  Mail, 
  Phone, 
  ShieldAlert, 
  Languages,
  ArrowRight,
  Send
} from "lucide-react";
import { db, auth } from "../lib/firebaseAuth";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AIEmployeeConfigProps {
  token: string;
}

export interface WidgetSettings {
  widgetColor: string;
  greeting: string;
  aiName: string;
  businessHours: string;
  avatar: string;
  autoReply: boolean;
  typingSpeed: number;
  welcomeMessage: string;
  language: string;
  collectEmail: boolean;
  collectPhone: boolean;
  escalateToHuman: boolean;
}

const DEFAULT_WIDGET: WidgetSettings = {
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
  escalateToHuman: true,
};

export default function AIEmployeeConfig({ token }: AIEmployeeConfigProps) {
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"appearance" | "behavior" | "leads">("appearance");

  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_WIDGET);

  useEffect(() => {
    async function loadWidgetSettings() {
      if (!token) return;
      setLoading(true);
      setErrorMessage(null);

      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const docRef = doc(db, "userSettings", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.widget) {
            setSettings({
              ...DEFAULT_WIDGET,
              ...data.widget
            });
          }
        }
      } catch (err: any) {
        console.error("Error loading Widget settings:", err);
        setErrorMessage("Failed to load your AI Employee settings.");
      } finally {
        setLoading(false);
      }
    }

    loadWidgetSettings();
  }, [token]);

  const handleSave = async () => {
    setSavingStatus("saving");
    setErrorMessage(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setSavingStatus("error");
        setErrorMessage("You must be logged in to save settings.");
        return;
      }

      const docRef = doc(db, "userSettings", currentUser.uid);
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      // Merge widget settings under the "widget" key in the userSettings doc
      await setDoc(docRef, {
        ...existingData,
        widget: settings,
        updatedAt: new Date().toISOString()
      });

      setSavingStatus("saved");
      setTimeout(() => setSavingStatus("idle"), 2500);
    } catch (err: any) {
      console.error("Error saving Widget settings:", err);
      setSavingStatus("error");
      setErrorMessage("Failed to save settings. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-8 h-8 text-[#FF7A00] animate-spin" />
        <span className="text-xs text-zinc-500 font-bold">Loading Employee Settings...</span>
      </div>
    );
  }

  return (
    <div id="ai-employee-config" className="space-y-6 animate-fade-in max-w-[1200px] w-full mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-orange-100 text-[#FF7A00] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">V2 Live Chat</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-display flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#FF7A00]" />
            Configure AI Employee
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Customize how your AI employee looks, answers questions, collects customer information, and behaves on your website.
          </p>
        </div>

        {/* Save CTA */}
        <button
          onClick={handleSave}
          disabled={savingStatus === "saving"}
          className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 disabled:bg-zinc-400 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all duration-200 hover:scale-[1.01] cursor-pointer"
        >
          {savingStatus === "saving" ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>
            {savingStatus === "saving" && "Saving..."}
            {savingStatus === "saved" && "✓ Saved Settings"}
            {savingStatus === "idle" && "Save Settings"}
            {savingStatus === "error" && "Error saving"}
          </span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 font-medium flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {savingStatus === "saved" && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Your settings have been updated in the cloud successfully! The changes will propagate to your widget instantly.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Settings Fields */}
        <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-6">
          
          {/* Sub Tab Navigation */}
          <div className="flex border-b border-zinc-100 pb-px gap-1">
            {[
              { id: "appearance", label: "Appearance", icon: <Sliders className="w-3.5 h-3.5" /> },
              { id: "behavior", label: "AI Behavior", icon: <Bot className="w-3.5 h-3.5" /> },
              { id: "leads", label: "Leads & Handover", icon: <Mail className="w-3.5 h-3.5" /> },
            ].map((subTab) => (
              <button
                key={subTab.id}
                onClick={() => setActiveSubTab(subTab.id as any)}
                className={`px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                  activeSubTab === subTab.id
                    ? "border-[#FF7A00] text-[#FF7A00]"
                    : "border-transparent text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {subTab.icon}
                <span>{subTab.label}</span>
              </button>
            ))}
          </div>

          {/* Subtab Content: Appearance */}
          {activeSubTab === "appearance" && (
            <div className="space-y-5 animate-fade-in text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AI Employee Name */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">AI Employee Name</label>
                  <input
                    type="text"
                    value={settings.aiName}
                    onChange={(e) => setSettings({ ...settings, aiName: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF7A00] font-medium"
                    placeholder="e.g. Max"
                  />
                  <span className="text-[10px] text-zinc-400">The name customers see when the AI chats with them.</span>
                </div>

                {/* Avatar select */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Avatar / Emoji</label>
                  <div className="flex gap-2">
                    {["🤖", "👩‍💼", "👨‍💼", "🦊", "⚡", "🙋‍♀️"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSettings({ ...settings, avatar: emoji })}
                        className={`w-9 h-9 flex items-center justify-center text-lg rounded-xl transition-all border cursor-pointer ${
                          settings.avatar === emoji 
                            ? "border-[#FF7A00] bg-orange-50/50" 
                            : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Widget Theme Color */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-zinc-700 block">Widget Theme Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.widgetColor}
                    onChange={(e) => setSettings({ ...settings, widgetColor: e.target.value })}
                    className="w-10 h-10 border border-zinc-200 rounded-xl cursor-pointer p-0.5 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    value={settings.widgetColor}
                    onChange={(e) => setSettings({ ...settings, widgetColor: e.target.value })}
                    className="w-32 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF7A00] font-mono font-medium"
                    placeholder="#FF7A00"
                  />
                  <div className="flex gap-1.5">
                    {["#FF7A00", "#18181B", "#2563EB", "#059669", "#D97706"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSettings({ ...settings, widgetColor: c })}
                        className="w-5 h-5 rounded-full border border-zinc-300"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400">Match your website's primary styling color schema. Default is Orange (#FF7A00).</span>
              </div>

              {/* Greeting Bubble */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-zinc-700 block">Widget Greeting Teaser</label>
                <input
                  type="text"
                  value={settings.greeting}
                  onChange={(e) => setSettings({ ...settings, greeting: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF7A00] font-medium"
                  placeholder="e.g. Chat with our live assistant!"
                />
                <span className="text-[10px] text-zinc-400">Floating teaser message displayed next to the closed chat bubble icon.</span>
              </div>

              {/* Welcome Message */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-zinc-700 block">Welcome Initial Message</label>
                <textarea
                  rows={3}
                  value={settings.welcomeMessage}
                  onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF7A00] font-medium leading-relaxed resize-none"
                  placeholder="Welcome to our store! Let us know how we can help you."
                />
                <span className="text-[10px] text-zinc-400">The first message your AI employee sends when a visitor clicks to open the chat.</span>
              </div>

            </div>
          )}

          {/* Subtab Content: Behavior */}
          {activeSubTab === "behavior" && (
            <div className="space-y-5 animate-fade-in text-xs">
              
              {/* Auto Reply Mode */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-zinc-900">Enable AI Auto-Response</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    When active, your AI employee automatically replies to messages in 1-2 seconds. Turn off to only use Manual Co-Pilot drafting.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.autoReply}
                    onChange={(e) => setSettings({ ...settings, autoReply: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7A00]" />
                </label>
              </div>

              {/* Business Hours */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-zinc-700 block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Patrol Schedule (Business Hours)
                </label>
                <select
                  value={settings.businessHours}
                  onChange={(e) => setSettings({ ...settings, businessHours: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF7A00] font-medium"
                >
                  <option value="24/7 Autopilot">24/7 Autopilot (Always active)</option>
                  <option value="Outside Business Hours">Outside Business Hours (Only respond when you're sleeping)</option>
                  <option value="Manual Schedule">Manual Toggle (Control via console)</option>
                </select>
                <span className="text-[10px] text-zinc-400">Control when the AI representative takes control of your customer chats.</span>
              </div>

              {/* Output Language */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-zinc-700 block flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" />
                  Primary Interface Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF7A00] font-medium"
                >
                  {["English", "Spanish", "Portuguese", "French", "German", "Italian", "Multilingual (Detect)GM"].map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <span className="text-[10px] text-zinc-400">Select standard default language or choose Multilingual to let the AI adapt dynamically to visitor messages.</span>
              </div>

              {/* Typing simulation speed */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-zinc-700 block">Simulate Typing Indicator</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={settings.typingSpeed}
                    onChange={(e) => setSettings({ ...settings, typingSpeed: Number(e.target.value) })}
                    className="w-full accent-[#FF7A00]"
                  />
                  <span className="font-mono font-bold shrink-0 bg-zinc-100 px-2 py-1 rounded text-zinc-600">
                    {settings.typingSpeed} chars/s
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400">Shows a typing bubble to the visitor before the AI responds to feel more natural and human.</span>
              </div>

            </div>
          )}

          {/* Subtab Content: Leads */}
          {activeSubTab === "leads" && (
            <div className="space-y-5 animate-fade-in text-xs">
              
              <div className="space-y-3">
                <h4 className="font-extrabold text-zinc-800 border-b border-zinc-100 pb-2">Pre-chat Information Gathering</h4>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Capture valuable sales prospects by requiring visitors to fill in contact fields before they begin chatting with your AI assistant.
                </p>

                {/* Collect Email option */}
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#FF7A00]" />
                    <div>
                      <p className="font-bold text-zinc-800">Collect Email Addresses</p>
                      <p className="text-[10px] text-zinc-400">Saves contact for your newsletter/follow up</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.collectEmail}
                      onChange={(e) => setSettings({ ...settings, collectEmail: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7A00]" />
                  </label>
                </div>

                {/* Collect Phone option */}
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#FF7A00]" />
                    <div>
                      <p className="font-bold text-zinc-800">Collect Phone Numbers</p>
                      <p className="text-[10px] text-zinc-400">Allows SMS outreach and scheduling calls</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.collectPhone}
                      onChange={(e) => setSettings({ ...settings, collectPhone: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7A00]" />
                  </label>
                </div>
              </div>

              <div className="space-y-3 pt-3">
                <h4 className="font-extrabold text-zinc-800 border-b border-zinc-100 pb-2">Human Handover & Escalation</h4>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  If the AI cannot resolve the customer's question or the visitor requests a human support representative, define what happens next.
                </p>

                {/* Escalate toggle */}
                <div className="p-4 border border-orange-200 bg-orange-50/20 rounded-xl flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-zinc-900 flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4 text-[#FF7A00]" />
                      Allow Human Escalation
                    </p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      If the visitor asks for a human, the widget will notify you and let the visitor leave a callback message. The conversation status is updated to <strong>Escalated</strong> inside your live chats inbox.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={settings.escalateToHuman}
                      onChange={(e) => setSettings({ ...settings, escalateToHuman: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7A00]" />
                  </label>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Side: Beautiful Live Preview */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Widget Live Preview</h3>
          
          {/* Beautiful Mock Phone / Widget preview */}
          <div className="bg-zinc-100 border border-zinc-200 rounded-[2.5rem] p-3 shadow-md max-w-sm mx-auto relative overflow-hidden">
            <div className="bg-white border border-zinc-200/80 rounded-[2rem] overflow-hidden aspect-[9/16] flex flex-col relative">
              
              {/* Widget Header */}
              <div 
                className="p-4 text-white flex items-center justify-between gap-2 shadow-sm transition-colors duration-300"
                style={{ backgroundColor: settings.widgetColor }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-base border border-white/10">
                    {settings.avatar}
                  </span>
                  <div>
                    <h4 className="text-[11px] font-extrabold truncate max-w-[130px]">{settings.aiName || "Assistant"}</h4>
                    <span className="text-[9px] opacity-80 flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      Active 24/7
                    </span>
                  </div>
                </div>

                <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold tracking-tight">
                  AI Active
                </div>
              </div>

              {/* Chat Body */}
              <div className="flex-1 bg-zinc-50 p-4 space-y-3 overflow-y-auto text-[11px] font-medium leading-relaxed">
                
                {/* Greeting Bubble */}
                <div className="flex gap-2 items-end max-w-[85%]">
                  <span className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] shrink-0 border border-zinc-300 shadow-sm">
                    {settings.avatar}
                  </span>
                  <div className="bg-white border border-zinc-200 p-2.5 rounded-2xl rounded-bl-none text-zinc-800 shadow-sm">
                    {settings.welcomeMessage || "Hello! Welcome to our website."}
                  </div>
                </div>

                {/* Simulated Customer Info Form if Collect options checked */}
                {(settings.collectEmail || settings.collectPhone) && (
                  <div className="p-3 bg-white border border-orange-100 rounded-2xl shadow-sm space-y-2.5 max-w-[90%] mx-auto text-[10px]">
                    <div className="flex items-center gap-1.5 border-b border-zinc-100 pb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
                      <span className="font-extrabold text-zinc-800">Please provide details to start:</span>
                    </div>
                    {settings.collectEmail && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 font-bold">Email Address *</span>
                        <input
                          type="email"
                          disabled
                          placeholder="your-email@example.com"
                          className="w-full p-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px]"
                        />
                      </div>
                    )}
                    {settings.collectPhone && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 font-bold">Phone Number *</span>
                        <input
                          type="tel"
                          disabled
                          placeholder="+1 (555) 000-0000"
                          className="w-full p-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px]"
                        />
                      </div>
                    )}
                    <button disabled className="w-full py-1.5 text-white font-extrabold rounded-lg flex items-center justify-center gap-1 shadow-sm text-[10px]" style={{ backgroundColor: settings.widgetColor }}>
                      <span>Start Conversation</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Simulated Customer Text */}
                <div className="flex justify-end max-w-[85%] ml-auto animate-fade-in delay-500">
                  <div 
                    className="p-2.5 rounded-2xl rounded-br-none text-white shadow-sm"
                    style={{ backgroundColor: settings.widgetColor }}
                  >
                    What is your refund policy?
                  </div>
                </div>

                {/* Simulated Typing Indicator bubble */}
                <div className="flex gap-2 items-end max-w-[85%]">
                  <span className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] shrink-0 border border-zinc-300 shadow-sm animate-pulse">
                    {settings.avatar}
                  </span>
                  <div className="bg-zinc-100 border border-zinc-200 p-2 px-3 rounded-2xl rounded-bl-none text-zinc-400 flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>

              </div>

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-zinc-200/80 flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  placeholder="Type a message..."
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-[10px] focus:outline-none"
                />
                <button 
                  disabled
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: settings.widgetColor }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-zinc-400 font-mono">Simulated Widget Sandbox</span>
          </div>
        </div>

      </div>

    </div>
  );
}
