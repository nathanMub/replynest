import React, { useState } from "react";
import { 
  Bot, 
  Settings, 
  HelpCircle, 
  Save, 
  Check, 
  Sliders, 
  Clock, 
  ShieldAlert, 
  MessageSquareCode, 
  UserPlus, 
  AlertCircle,
  Zap,
  Info
} from "lucide-react";

export default function Automation() {
  const [autoReply, setAutoReply] = useState<boolean>(true);
  const [confidence, setConfidence] = useState<number>(85);
  const [delay, setDelay] = useState<number>(15);
  const [scheduleMode, setScheduleMode] = useState<"always" | "offline" | "custom">("always");
  const [escalateOnAngry, setEscalateOnAngry] = useState<boolean>(true);
  const [escalateOnPricingQuery, setEscalateOnPricingQuery] = useState<boolean>(false);
  const [escalatePhrase, setEscalatePhrase] = useState<string>("talk to representative, human agent, manual help");
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved">("idle");

  const handleSaveSettings = () => {
    setSavingStatus("saving");
    setTimeout(() => {
      setSavingStatus("saved");
      setTimeout(() => setSavingStatus("idle"), 2000);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[900px] w-full mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-display flex items-center gap-2">
            Autopilot Automation
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Configure how your AI employee replies to customers and when it should escalate chats to human agents.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={savingStatus === "saving"}
          className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 disabled:bg-zinc-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md self-start sm:self-center cursor-pointer"
        >
          {savingStatus === "saving" ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : savingStatus === "saved" ? (
            <>
              <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              <span className="text-emerald-400">Settings Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>Save Autopilot Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Main Settings Card */}
      <div className="space-y-6">
        
        {/* Switch Card */}
        <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] bg-orange-100 text-[#FF7A00] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Primary Controller
            </span>
            <h3 className="text-sm font-extrabold text-zinc-900">Auto Reply Autopilot Mode</h3>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
              When enabled, ReplyNest instantly responds to customers on connected channels with 0 clicks required. Disabling turns on "Co-Pilot Draft Mode" where replies are prepared for your manual approval.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAutoReply(!autoReply)}
            className={`w-14 h-8 rounded-full p-1 transition-colors focus:outline-none flex cursor-pointer ${
              autoReply ? "bg-[#FF7A00] justify-end" : "bg-zinc-200 justify-start"
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-[10px]">
              {autoReply ? "🤖" : "👤"}
            </div>
          </button>
        </div>

        {/* Sliders Box */}
        <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-6">
          <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-1.5 border-b border-zinc-100 pb-3">
            <Sliders className="w-4 h-4 text-[#FF7A00]" />
            Smart Threshold Controls
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Slide 1 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <label className="font-extrabold text-zinc-800 flex items-center gap-1">
                  Confidence Threshold (%)
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-400 cursor-help" title="Minimum certainty needed from AI to send on autopilot" />
                </label>
                <span className="font-mono font-bold bg-orange-50 text-[#FF7A00] px-2 py-0.5 rounded text-[11px]">
                  {confidence}% confidence
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="98"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#FF7A00]"
              />
              <p className="text-[10px] text-zinc-400">
                If the AI's confidence falls below {confidence}%, it will not auto-reply. Instead, it places the ticket in your draft inbox for manual correction.
              </p>
            </div>

            {/* Slide 2 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <label className="font-extrabold text-zinc-800 flex items-center gap-1">
                  Organic Response Delay (s)
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-400 cursor-help" title="Time delay before sending automated reply to look human" />
                </label>
                <span className="font-mono font-bold bg-orange-50 text-[#FF7A00] px-2 py-0.5 rounded text-[11px]">
                  {delay} seconds
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="60"
                value={delay}
                onChange={(e) => setDelay(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#FF7A00]"
              />
              <p className="text-[10px] text-zinc-400">
                Delaying the reply by {delay}s mimics human typing speeds, preventing standard chatbot vibes and improving customer trust.
              </p>
            </div>
          </div>
        </div>

        {/* Operating Schedule */}
        <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-1.5 border-b border-zinc-100 pb-3">
            <Clock className="w-4 h-4 text-[#FF7A00]" />
            Operating Working Schedule
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setScheduleMode("always")}
              className={`p-4 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                scheduleMode === "always"
                  ? "border-[#FF7A00] bg-orange-50/20 shadow-sm"
                  : "border-zinc-200 hover:border-zinc-300 bg-white"
              }`}
            >
              <h4 className="text-xs font-bold text-zinc-900">Always Active (24/7)</h4>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Answering customers instantly day, night, and weekend. Highly recommended.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setScheduleMode("offline")}
              className={`p-4 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                scheduleMode === "offline"
                  ? "border-[#FF7A00] bg-orange-50/20 shadow-sm"
                  : "border-zinc-200 hover:border-zinc-300 bg-white"
              }`}
            >
              <h4 className="text-xs font-bold text-zinc-900">Outside Working Hours</h4>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Only triggers when your human team goes home. Ensures 0 buyer leakage.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setScheduleMode("custom")}
              className={`p-4 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                scheduleMode === "custom"
                  ? "border-[#FF7A00] bg-orange-50/20 shadow-sm"
                  : "border-zinc-200 hover:border-zinc-300 bg-white"
              }`}
            >
              <h4 className="text-xs font-bold text-zinc-900">Custom Automation Days</h4>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Toggle automation on specific days of the week or specific event shifts.
              </p>
            </button>
          </div>
        </div>

        {/* Escalation Rules */}
        <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-1.5 border-b border-zinc-100 pb-3">
            <ShieldAlert className="w-4 h-4 text-[#FF7A00]" />
            Human Agent Escalation Rules
          </h3>

          <div className="space-y-4 pt-1">
            
            {/* Rule 1 */}
            <div className="flex items-start justify-between gap-3 text-xs">
              <div className="space-y-0.5 max-w-lg">
                <span className="font-extrabold text-zinc-800">Angry Buyer Sentiment Escalation</span>
                <p className="text-[10px] text-zinc-500">
                  Automatically freeze autopilot replies and tag a human representative if the AI detects extreme anger, dissatisfaction, or frustration in the buyer's wording.
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => setEscalateOnAngry(!escalateOnAngry)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none flex shrink-0 cursor-pointer ${
                  escalateOnAngry ? "bg-[#FF7A00] justify-end" : "bg-zinc-200 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {/* Rule 2 */}
            <div className="flex items-start justify-between gap-3 text-xs pt-3 border-t border-zinc-100">
              <div className="space-y-0.5 max-w-lg">
                <span className="font-extrabold text-zinc-800">High-Value Custom Deal Escalation</span>
                <p className="text-[10px] text-zinc-500">
                  Escalate chats immediately if the buyer requests bulk volume quotes or asks to set up customized corporate pricing contracts.
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => setEscalateOnPricingQuery(!escalateOnPricingQuery)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none flex shrink-0 cursor-pointer ${
                  escalateOnPricingQuery ? "bg-[#FF7A00] justify-end" : "bg-zinc-200 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {/* Trigger words */}
            <div className="space-y-2 pt-3 border-t border-zinc-100">
              <label htmlFor="trigger-words" className="text-xs font-extrabold text-zinc-800 block">
                Escalation Keywords (Comma Separated)
              </label>
              <input
                id="trigger-words"
                type="text"
                value={escalatePhrase}
                onChange={(e) => setEscalatePhrase(e.target.value)}
                placeholder="e.g. manager, phone call, representative, error"
                className="w-full bg-zinc-50 text-xs px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-800 focus:outline-none focus:border-[#FF7A00]"
              />
              <p className="text-[10px] text-zinc-400">
                If the incoming message contains any of these phrases, ReplyNest AI instantly stops responding and notifies your support desk with high urgency.
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
