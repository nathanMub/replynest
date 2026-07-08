import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  ChevronDown, 
  ArrowRight, 
  Mail, 
  Phone,
  User,
  ShieldAlert,
  Clock,
  Check,
  CheckCheck
} from "lucide-react";
import { WidgetSettings } from "./AIEmployeeConfig";

interface LiveChatWidgetProps {
  ownerId: string;
  previewSettings?: Partial<WidgetSettings>; // For showing live customized previews in admin dashboard
}

interface ChatMessage {
  id: string;
  sender: "customer" | "ai" | "system";
  text: string;
  timestamp: string;
  status?: "sending" | "sent" | "read";
}

export default function LiveChatWidget({ ownerId, previewSettings }: LiveChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>({
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
  });

  // Conversation state
  const [conversationId, setConversationId] = useState<string>("");
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [isLeadCaptured, setIsLeadCaptured] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [visitorId, setVisitorId] = useState<string>("");

  // UI tracking
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const soundPlayed = useRef(false);

  // 1. Load widget settings from server/props
  useEffect(() => {
    if (previewSettings) {
      setWidgetSettings((prev) => ({ ...prev, ...previewSettings }));
      setLoadingSettings(false);
      return;
    }

    async function fetchSettings() {
      if (!ownerId) return;
      try {
        const response = await fetch(`/api/widget/settings?ownerId=${ownerId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setWidgetSettings(data.settings);
          }
        }
      } catch (e) {
        console.error("Failed to load live chat settings:", e);
      } finally {
        setLoadingSettings(false);
      }
    }

    fetchSettings();
  }, [ownerId, previewSettings]);

  // Initialize Visitor details & Conversation ID
  useEffect(() => {
    // Generate unique guest ID
    let storedVisitorId = localStorage.getItem("replynest_visitor_id");
    if (!storedVisitorId) {
      storedVisitorId = `guest_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem("replynest_visitor_id", storedVisitorId);
    }
    setVisitorId(storedVisitorId);

    // Initial message
    setMessages([
      {
        id: "welcome",
        sender: "ai",
        text: widgetSettings.welcomeMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "read"
      }
    ]);

    // Check if lead was already captured in this session
    const captured = sessionStorage.getItem("replynest_lead_captured") === "true";
    setIsLeadCaptured(captured);
  }, [widgetSettings.welcomeMessage]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (widgetSettings.collectEmail && !visitorEmail) return;
    if (widgetSettings.collectPhone && !visitorPhone) return;

    setIsTyping(true);

    try {
      // Create actual conversation on the backend
      const response = await fetch("/api/widget/visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId,
          visitorId,
          customerName: visitorName || "Guest Visitor",
          customerEmail: visitorEmail,
          customerPhone: visitorPhone,
          currentPage: window.location.pathname
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversationId);
        setIsLeadCaptured(true);
        sessionStorage.setItem("replynest_lead_captured", "true");

        // System notification
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: "system",
            text: `Information submitted. AI Assistant online.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error("Error submitting visitor lead:", err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setInputMessage("");

    const userMessageId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userText,
      sender: "customer",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sending"
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await fetch("/api/widget/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId,
          visitorId,
          conversationId,
          message: userText,
          currentPage: window.location.pathname
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update user message status to sent/read
        setMessages((prev) => 
          prev.map(m => m.id === userText ? { ...m, status: "read" } : m)
        );

        // Simulate typing delay based on speed setting
        const typingDuration = Math.min(2500, Math.max(800, (data.reply.length / widgetSettings.typingSpeed) * 1000));
        
        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              sender: "ai",
              text: data.reply,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: "read"
            }
          ]);
        }, typingDuration);

        // Update active conversation ID if it was created dynamically
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
      } else {
        throw new Error("Failed response");
      }
    } catch (err) {
      console.error("Chat error:", err);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "system",
          text: "Connection lost. Please try again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const handleEscalate = async () => {
    setIsTyping(true);
    try {
      const response = await fetch("/api/widget/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId,
          visitorId,
          conversationId,
          message: "[Visitor requested human connection / escalation]",
          currentPage: window.location.pathname,
          forceEscalate: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `escalate-sys-${Date.now()}`,
            sender: "system",
            text: "Request submitted. Conversation escalated to human dashboard.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          {
            id: `escalate-ai-${Date.now()}`,
            sender: "ai",
            text: "I have notified our support team! A human representative will view your inquiries here and follow up with you shortly.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (e) {
      console.error(e);
      setIsTyping(false);
    }
  };

  const showLeadForm = (widgetSettings.collectEmail || widgetSettings.collectPhone) && !isLeadCaptured;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans text-xs flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-[360px] sm:w-[380px] h-[520px] bg-white border border-zinc-200/90 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col mb-4 relative"
          >
            {/* Widget Top Header */}
            <div 
              className="p-4 text-white flex items-center justify-between gap-2 shadow-md transition-all duration-300 select-none shrink-0"
              style={{ backgroundColor: widgetSettings.widgetColor }}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-lg border border-white/10 shrink-0 shadow-inner">
                  {widgetSettings.avatar}
                </span>
                <div>
                  <h4 className="text-[12px] font-black truncate max-w-[160px]">{widgetSettings.aiName}</h4>
                  <span className="text-[9px] opacity-90 flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                    Online 24/7 Autopilot
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Human escalation button */}
                {widgetSettings.escalateToHuman && isLeadCaptured && (
                  <button
                    onClick={handleEscalate}
                    title="Connect with a human"
                    className="p-1.5 bg-white/15 hover:bg-white/25 border border-white/10 rounded-xl transition-all cursor-pointer text-[10px] font-extrabold flex items-center gap-1 shrink-0"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Escalate</span>
                  </button>
                )}

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 bg-white/15 hover:bg-white/25 border border-white/10 rounded-xl transition-all cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content area: Lead Form or Chat bubbles */}
            {showLeadForm ? (
              <form 
                onSubmit={handleStartChat}
                className="flex-1 bg-zinc-50 p-6 flex flex-col justify-center space-y-4 animate-fade-in"
              >
                <div className="space-y-1 text-center pb-2">
                  <span className="text-2xl">{widgetSettings.avatar}</span>
                  <h3 className="font-extrabold text-zinc-900 text-sm">Welcome to our store!</h3>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Please provide your contact information to begin the conversation. An assistant is online to support you.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-extrabold text-zinc-500 block">Full Name</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF7A00] text-zinc-800 font-medium text-[11px]"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  {widgetSettings.collectEmail && (
                    <div className="space-y-1">
                      <label className="font-extrabold text-zinc-500 block">Email Address *</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={visitorEmail}
                          onChange={(e) => setVisitorEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF7A00] text-zinc-800 font-medium text-[11px]"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>
                  )}

                  {widgetSettings.collectPhone && (
                    <div className="space-y-1">
                      <label className="font-extrabold text-zinc-500 block">Phone Number *</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          value={visitorPhone}
                          onChange={(e) => setVisitorPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF7A00] text-zinc-800 font-medium text-[11px]"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isTyping}
                  className="w-full py-2.5 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-md hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                  style={{ backgroundColor: widgetSettings.widgetColor }}
                >
                  <span>Start Conversation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <>
                {/* Chat Message Logs */}
                <div className="flex-1 bg-zinc-50 p-4 space-y-4 overflow-y-auto text-[11px] font-medium leading-relaxed">
                  
                  {messages.map((msg, idx) => {
                    const isAi = msg.sender === "ai";
                    const isSystem = msg.sender === "system";

                    if (isSystem) {
                      return (
                        <div key={msg.id || idx} className="text-center py-1.5 animate-fade-in">
                          <span className="inline-block bg-zinc-200/60 border border-zinc-300/40 text-zinc-500 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={msg.id || idx}
                        className={`flex gap-2 items-end max-w-[85%] ${isAi ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                      >
                        {isAi && (
                          <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-xs shrink-0 border border-zinc-300/60 shadow-sm">
                            {widgetSettings.avatar}
                          </span>
                        )}
                        <div className="space-y-0.5">
                          <div 
                            className={`p-2.5 rounded-2xl shadow-sm ${
                              isAi 
                                ? "bg-white border border-zinc-200 text-zinc-800 rounded-bl-none" 
                                : "text-white rounded-br-none"
                            }`}
                            style={!isAi ? { backgroundColor: widgetSettings.widgetColor } : {}}
                          >
                            {msg.text}
                          </div>
                          
                          {/* Message status line */}
                          <div className={`text-[8px] text-zinc-400 font-bold flex items-center gap-1 ${isAi ? "justify-start" : "justify-end"}`}>
                            <span>{msg.timestamp}</span>
                            {!isAi && msg.status && (
                              <span>
                                {msg.status === "sending" && "•"}
                                {msg.status === "sent" && <Check className="w-3 h-3 text-zinc-300" />}
                                {msg.status === "read" && <CheckCheck className="w-3 h-3 text-[#FF7A00]" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Bubble */}
                  {isTyping && (
                    <div className="flex gap-2 items-end max-w-[85%] mr-auto animate-pulse">
                      <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-xs shrink-0 border border-zinc-300 shadow-sm">
                        {widgetSettings.avatar}
                      </span>
                      <div className="bg-white border border-zinc-200 p-2 px-3 rounded-2xl rounded-bl-none text-zinc-400 flex items-center gap-1 font-bold shadow-sm">
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Text box area */}
                <form 
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white border-t border-zinc-200/80 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-[#FF7A00] text-zinc-800"
                  />
                  <button 
                    type="submit"
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm hover:opacity-95 transition-all cursor-pointer"
                    style={{ backgroundColor: widgetSettings.widgetColor }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            )}

            {/* Footer Brand Credit */}
            <div className="bg-white py-1.5 border-t border-zinc-100 text-center text-[9px] text-zinc-300 font-mono flex items-center justify-center gap-1 select-none shrink-0">
              <Sparkles className="w-3 h-3 text-[#FF7A00]" />
              <span>Secured by <strong>ReplyNest AI Employee</strong></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main floating bubble toggle trigger */}
      <motion.button
        id="widget-trigger-bubble"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 sm:w-14 h-12 sm:h-14 rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer select-none transition-all border border-white/10"
        style={{ backgroundColor: widgetSettings.widgetColor }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close-icon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className="w-6 h-6 sm:w-7 sm:h-7" />
            </motion.span>
          ) : (
            <motion.span
              key="msg-icon"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative flex items-center justify-center"
            >
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
              {/* Online pulse bubble */}
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full animate-pulse" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
