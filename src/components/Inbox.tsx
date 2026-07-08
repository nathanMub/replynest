import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Search, 
  Globe, 
  Send, 
  CheckCheck, 
  Clock, 
  User, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  Info,
  ExternalLink,
  Bot,
  Filter,
  Check
} from "lucide-react";

interface InboxProps {
  token: string;
}

export interface LiveConversation {
  id: string;
  visitorId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: "active" | "escalated" | "completed";
  currentPage: string;
  messages: Array<{
    sender: "customer" | "ai";
    text: string;
    time: string;
    isHumanReply?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function Inbox({ token }: InboxProps) {
  const [conversations, setConversations] = useState<LiveConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Active states
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "escalated" | "completed">("all");
  
  // Reply Form state
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Load conversations
  const loadConversations = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/owner/conversations", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch live conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
      
      // Select first conversation if none selected yet
      if (data.conversations && data.conversations.length > 0 && !activeChatId) {
        setActiveChatId(data.conversations[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to sync conversations with the cloud database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadConversations();
    }
  }, [token]);

  // Handle human manual response
  const handleSendReply = async (e: React.FormEvent, markAsCompleted = false) => {
    e.preventDefault();
    if (!replyText.trim() || !activeChatId) return;

    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/owner/conversations/${activeChatId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: replyText,
          markAsCompleted
        })
      });

      if (res.ok) {
        setReplyText("");
        // Reload conversations silently to show new message instantly
        await loadConversations(true);
      } else {
        throw new Error("Failed to send reply");
      }
    } catch (err) {
      alert("Failed to submit reply. Check connection.");
    } finally {
      setSubmittingReply(false);
    }
  };

  // Toggle status directly
  const handleUpdateStatus = async (status: "active" | "escalated" | "completed") => {
    if (!activeChatId) return;
    try {
      const res = await fetch(`/api/owner/conversations/${activeChatId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        await loadConversations(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeChat = conversations.find(c => c.id === activeChatId);

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesSearch = 
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.messages && c.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex-1 h-[calc(100vh-64px)] flex flex-col items-center justify-center space-y-4 bg-zinc-50">
        <RefreshCw className="w-8 h-8 text-[#FF7A00] animate-spin" />
        <span className="text-xs text-zinc-500 font-bold">Retrieving Website DMs & Live Chats...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 h-[calc(100vh-64px)] flex overflow-hidden bg-zinc-50 border-t border-zinc-200 select-none animate-fade-in">
      
      {/* LEFT COLUMN: CUSTOMER CHAT LIST */}
      <aside className="w-[330px] bg-white border-r border-zinc-200 flex flex-col shrink-0">
        
        {/* Search header */}
        <div className="p-4 border-b border-zinc-100 space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers or chat..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF7A00] font-medium text-xs text-zinc-800"
            />
          </div>

          {/* Quick status filters */}
          <div className="flex gap-1">
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "escalated", label: "Escalated" },
              { id: "completed", label: "Completed" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-zinc-950 text-white"
                    : "bg-zinc-50 text-zinc-400 hover:text-zinc-600 border border-zinc-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Conversations */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center space-y-2 mt-4">
              <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="text-xs text-zinc-500 font-bold">No live chats found</p>
              <p className="text-[10px] text-zinc-400 leading-normal px-4">
                No conversations match your selected filters. Ensure your live chat widget is running.
              </p>
            </div>
          ) : (
            filteredConversations.map((chat) => {
              const lastMsg = chat.messages && chat.messages.length > 0 
                ? chat.messages[chat.messages.length - 1] 
                : null;
              const isSelected = chat.id === activeChatId;

              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`p-4 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected ? "bg-orange-50/35 border-l-4 border-[#FF7A00]" : "hover:bg-zinc-50/50"
                  }`}
                >
                  <div className="space-y-1 truncate flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-zinc-900 truncate pr-1">{chat.customerName || "Guest User"}</h4>
                      <span className="text-[9px] text-zinc-400 font-mono font-bold shrink-0">
                        {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>

                    <p className="text-[10px] text-zinc-400 truncate leading-relaxed">
                      {lastMsg ? lastMsg.text : "No messages yet"}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      {chat.status === "escalated" ? (
                        <span className="text-[8px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider flex items-center gap-0.5">
                          <ShieldAlert className="w-2.5 h-2.5" /> Escalated
                        </span>
                      ) : chat.status === "completed" ? (
                        <span className="text-[8px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Completed
                        </span>
                      ) : (
                        <span className="text-[8px] bg-orange-100 text-[#FF7A00] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider">
                          AI Handling
                        </span>
                      )}
                      
                      <span className="text-[8px] text-zinc-400 font-mono font-bold truncate max-w-[130px]">
                        on {chat.currentPage || "/"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* MIDDLE COLUMN & RIGHT COLUMN: CHAT WINDOW AND DETAILS */}
      {activeChat ? (
        <div className="flex-1 flex overflow-hidden">
          
          {/* CHAT THREAD PORT */}
          <main className="flex-1 flex flex-col bg-white overflow-hidden border-r border-zinc-100">
            
            {/* Port Header */}
            <header className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold border border-zinc-200">
                  {activeChat.customerName ? activeChat.customerName.charAt(0).toUpperCase() : "G"}
                </span>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">{activeChat.customerName}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-zinc-400 font-bold font-mono">Conversation ID: {activeChat.id.slice(-8)}</span>
                  </div>
                </div>
              </div>

              {/* Status Action controls */}
              <div className="flex gap-1.5">
                {activeChat.status !== "completed" ? (
                  <button
                    onClick={() => handleUpdateStatus("completed")}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Close Chat</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus("active")}
                    className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reopen Chat</span>
                  </button>
                )}

                {activeChat.status !== "escalated" && activeChat.status !== "completed" && (
                  <button
                    onClick={() => handleUpdateStatus("escalated")}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Escalate To Me</span>
                  </button>
                )}
              </div>
            </header>

            {/* Conversation Log bubbles */}
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/50 space-y-4">
              {activeChat.messages && activeChat.messages.map((msg, idx) => {
                const isCustomer = msg.sender === "customer";
                return (
                  <div 
                    key={idx}
                    className={`flex items-end gap-2.5 max-w-[75%] ${isCustomer ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                  >
                    {!isCustomer && (
                      <span className="w-6 h-6 rounded-full bg-[#FF7A00]/10 text-[#FF7A00] flex items-center justify-center text-[10px] border border-orange-200 shrink-0 font-bold shadow-inner">
                        {msg.isHumanReply ? "🙋" : "🤖"}
                      </span>
                    )}
                    <div className="space-y-0.5">
                      <div 
                        className={`p-3 rounded-2xl leading-relaxed shadow-sm text-xs font-medium ${
                          isCustomer 
                            ? "bg-white border border-zinc-200/80 text-zinc-800 rounded-bl-none" 
                            : "text-white rounded-br-none"
                        }`}
                        style={!isCustomer ? { backgroundColor: "#FF7A00" } : {}}
                      >
                        {msg.text}
                      </div>
                      
                      <div className={`text-[8px] text-zinc-400 font-bold font-mono flex items-center gap-1 ${isCustomer ? "justify-start" : "justify-end"}`}>
                        <span>
                          {msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                        {!isCustomer && (
                          <span className="text-[7px] font-bold uppercase">
                            {msg.isHumanReply ? "• Copilot Human" : "• Autopilot AI"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Panel for Manual human reply */}
            <form 
              onSubmit={handleSendReply}
              className="p-3 bg-white border-t border-zinc-100 flex flex-col gap-2 shrink-0"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    activeChat.status === "escalated" 
                      ? "Write human takeover reply (Escalated support mode)..." 
                      : "Draft copilot message to override AI..."
                  }
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF7A00] text-zinc-800"
                />
                <button
                  type="submit"
                  disabled={submittingReply || !replyText.trim()}
                  className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center hover:bg-zinc-900 transition-all cursor-pointer shrink-0 disabled:bg-zinc-200 disabled:text-zinc-400"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Quick actions row */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold px-1.5 pb-0.5 select-none">
                <span className="flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 text-[#FF7A00]" />
                  Sending as Support Operator
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleSendReply(e, true)}
                    disabled={!replyText.trim()}
                    className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" /> Send & Close Conversation
                  </button>
                </div>
              </div>
            </form>

          </main>

          {/* RIGHT SIDEBAR PANEL: LEAD METADATA DETAILS */}
          <aside className="w-[240px] bg-white p-5 space-y-6 flex flex-col overflow-y-auto shrink-0 animate-fade-in">
            
            <div className="space-y-1 pb-4 border-b border-zinc-100 text-center">
              <span className="text-3xl">👤</span>
              <h3 className="text-xs font-black text-zinc-900">{activeChat.customerName}</h3>
              <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[8px] font-black uppercase tracking-wider">
                Website Visitor
              </span>
            </div>

            {/* Lead metrics fields */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Captured Contacts
              </h4>

              <div className="space-y-3.5 text-xs">
                {/* Email */}
                <div className="space-y-1">
                  <span className="text-zinc-400 font-bold block text-[10px]">Email Address</span>
                  <p className="font-extrabold text-zinc-700 truncate">{activeChat.customerEmail || "Not collected"}</p>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <span className="text-zinc-400 font-bold block text-[10px]">Phone Number</span>
                  <p className="font-extrabold text-zinc-700">{activeChat.customerPhone || "Not collected"}</p>
                </div>

                {/* Current Page */}
                <div className="space-y-1">
                  <span className="text-zinc-400 font-bold block text-[10px]">Browsing Page</span>
                  <div className="flex items-center gap-1 font-mono text-[10px] bg-zinc-50 border border-zinc-100 p-1.5 rounded-lg text-zinc-600 font-bold max-w-full overflow-hidden">
                    <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{activeChat.currentPage || "/"}</span>
                  </div>
                </div>

                {/* Created At */}
                <div className="space-y-1">
                  <span className="text-zinc-400 font-bold block text-[10px]">Chat Started</span>
                  <p className="text-zinc-600 font-bold font-mono text-[10px]">
                    {activeChat.createdAt ? new Date(activeChat.createdAt).toLocaleDateString() : ""} at {activeChat.createdAt ? new Date(activeChat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-orange-50/30 border border-orange-100 rounded-2xl text-[10px] text-zinc-500 font-medium leading-relaxed pt-3">
              <p className="font-extrabold text-zinc-800 mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#FF7A00]" /> Copilot Mode
              </p>
              Your manual responses bypass the AI auto-responder. The AI will remain paused on this thread until you solve or close this ticket.
            </div>

          </aside>

        </div>
      ) : (
        /* Squeaky clean empty state */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-3xl">
            💬
          </div>
          <div className="space-y-1 max-w-md">
            <h2 className="text-sm font-black text-zinc-900">Your customer inbox is empty</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every business should have an AI employee patrolling their storefront 24/7. Once visitors start chatting with your widget on your store, their live tickets will appear here instantly.
            </p>
          </div>

          <div className="pt-2">
            <span className="text-[11px] bg-orange-100 text-[#FF7A00] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-orange-200">
              Widget online & Ready
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
