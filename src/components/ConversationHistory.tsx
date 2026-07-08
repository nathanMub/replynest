import React, { useState, useEffect } from "react";
import { MessageSquare, Calendar, Trash2, ArrowRight, CheckCheck, RefreshCw } from "lucide-react";

export interface ConversationLog {
  id: string;
  timestamp: string;
  businessType: string;
  goal: string;
  tone: string;
  message: string;
  replies: any[];
}

interface ConversationHistoryProps {
  token: string;
  onRestoreConversation: (log: ConversationLog) => void;
  activeLogId: string | null;
}

export default function ConversationHistory({ token, onRestoreConversation, activeLogId }: ConversationHistoryProps) {
  const [logs, setLogs] = useState<ConversationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      let data: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned unexpected response (status ${response.status}): ${text.slice(0, 150)}`);
      }
      if (!response.ok) throw new Error(data.error || "Failed to load conversation history");
      setLogs(data.conversations || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLogs();
  }, [token]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this interaction log?")) return;

    setError(null);
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        let errorMsg = "Failed to delete log";
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          errorMsg = data.error || errorMsg;
        } else {
          const text = await response.text();
          errorMsg = `Server returned status ${response.status}: ${text.slice(0, 150)}`;
        }
        throw new Error(errorMsg);
      }
      setLogs(prev => prev.filter(log => log.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Human friendly time formatting
  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, { 
        month: "short", 
        day: "numeric", 
        hour: "2-digit", 
        minute: "2-digit" 
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div id="conversation-history-container" className="space-y-6">
      
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-[#222E35] pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#25D366]" />
            Past Interactions History
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Review previous customer requests, your selected answers, and direct-copy setups.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-[#25D366] transition-all"
          title="Refresh History"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-200 text-xs rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Loading indicator */}
      {loading && logs.length === 0 && (
        <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#25D366]" />
          <span className="text-xs">Fetching past chats...</span>
        </div>
      )}

      {/* Empty logs display */}
      {!loading && logs.length === 0 && (
        <div className="p-12 text-center bg-[#111B21]/30 border border-[#222E35]/50 border-dashed rounded-3xl space-y-3">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-white">No History Logged</h4>
            <p className="text-[11px] text-slate-400 max-w-[280px] mx-auto leading-relaxed">
              When you generate sales replies while signed in to your account, they are saved here automatically.
            </p>
          </div>
        </div>
      )}

      {/* Logs stack */}
      {logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => {
            const isActive = activeLogId === log.id;
            return (
              <div
                key={log.id}
                onClick={() => onRestoreConversation(log)}
                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                  isActive 
                    ? "bg-[#111B21] border-[#25D366] shadow-lg shadow-[#25D366]/5" 
                    : "bg-[#111B21]/55 border-[#222E35] hover:bg-[#111B21]/80 hover:border-[#222E35]/80"
                }`}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#25D366]" />
                      {formatDate(log.timestamp)}
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#25D366] bg-[#25D366]/10 px-1.5 py-0.5 rounded">
                      {log.businessType}
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      Goal: {log.goal}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-100 truncate pr-4">
                    "{log.message}"
                  </p>

                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>{log.replies?.length || 0} solutions generated ({log.tone} Tone)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button
                    onClick={(e) => handleDelete(log.id, e)}
                    className="p-2 hover:bg-red-950/40 rounded-xl text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete Log Entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className={`p-2 rounded-xl transition-all ${
                    isActive ? "bg-[#25D366] text-[#0B141A]" : "bg-[#1c2c35] text-slate-300"
                  }`}>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
