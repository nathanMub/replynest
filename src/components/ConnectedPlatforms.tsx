import React, { useState } from "react";
import { 
  Instagram, 
  MessageCircle, 
  Globe, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Bot, 
  Power, 
  Settings2, 
  RefreshCw,
  Plus
} from "lucide-react";

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: "connected" | "disconnected" | "coming_soon";
  username?: string;
  conversationsCount?: number;
  colorClass: string;
}

export default function ConnectedPlatforms() {
  const [platforms, setPlatforms] = useState<Platform[]>([
    {
      id: "instagram",
      name: "Instagram Shop",
      icon: <Instagram className="w-5 h-5 text-white" />,
      status: "connected",
      username: "@restyle_boutique",
      conversationsCount: 148,
      colorClass: "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500"
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      icon: <MessageCircle className="w-5 h-5 text-white" />,
      status: "connected",
      username: "+1 (555) 019-2834",
      conversationsCount: 382,
      colorClass: "bg-emerald-500"
    },
    {
      id: "website",
      name: "Website Live Chat",
      icon: <Globe className="w-5 h-5 text-white" />,
      status: "connected",
      username: "Live Chat Widget V1.4",
      conversationsCount: 57,
      colorClass: "bg-zinc-900"
    },
    {
      id: "messenger",
      name: "Facebook Messenger",
      icon: <span className="text-white text-base">💬</span>,
      status: "disconnected",
      colorClass: "bg-blue-600"
    },
    {
      id: "tiktok",
      name: "TikTok DM",
      icon: <span className="text-white text-xs font-black">TikTok</span>,
      status: "disconnected",
      colorClass: "bg-black"
    },
    {
      id: "telegram",
      name: "Telegram Channels",
      icon: <span className="text-white font-bold text-xs">TG</span>,
      status: "coming_soon",
      colorClass: "bg-sky-500"
    },
    {
      id: "discord",
      name: "Discord Guild Server",
      icon: <span className="text-white font-bold text-xs">DC</span>,
      status: "coming_soon",
      colorClass: "bg-indigo-500"
    }
  ]);

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const togglePlatform = (id: string) => {
    setPlatforms(prev => prev.map(p => {
      if (p.id === id) {
        if (p.status === "connected") {
          return { ...p, status: "disconnected", username: undefined, conversationsCount: 0 };
        } else if (p.status === "disconnected") {
          return { 
            ...p, 
            status: "connected", 
            username: id === "messenger" ? "Restyle Store Page" : "@restyle_tiktok",
            conversationsCount: 12
          };
        }
      }
      return p;
    }));
  };

  const handleSyncNow = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[1200px] w-full mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-display">
            Connected Platforms
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Link and manage all your customer communication channels. Power them all using a single, intelligent business brain.
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
          <Bot className="w-3.5 h-3.5 animate-bounce" />
          <span>Autopilot Active (3 channels synced)</span>
        </div>
      </div>

      {/* Grid of Platforms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => {
          const isConnected = platform.status === "connected";
          const isComingSoon = platform.status === "coming_soon";
          
          return (
            <div 
              key={platform.id}
              className={`p-5 rounded-2xl border bg-white flex flex-col justify-between transition-all shadow-sm ${
                isConnected 
                  ? "border-orange-200 ring-2 ring-orange-500/5" 
                  : isComingSoon 
                    ? "border-zinc-200/50 bg-zinc-50/50 opacity-65"
                    : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div className="space-y-4">
                {/* Platform Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${platform.colorClass}`}>
                      {platform.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-zinc-900">{platform.name}</h3>
                      {isConnected ? (
                        <p className="text-[11px] text-zinc-400 font-mono font-medium">{platform.username}</p>
                      ) : isComingSoon ? (
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-200/60 px-1.5 py-0.5 rounded">
                          Coming Soon
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-medium">Not Connected</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center">
                    {!isComingSoon && (
                      <button
                        type="button"
                        onClick={() => togglePlatform(platform.id)}
                        className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none flex ${
                          isConnected ? "bg-[#FF7A00] justify-end" : "bg-zinc-200 justify-start"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Platform Stats & Settings */}
                {isConnected && (
                  <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100 flex items-center justify-between text-[11px]">
                    <div className="space-y-0.5">
                      <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px] block">
                        Conversations Handled
                      </span>
                      <span className="font-extrabold text-zinc-800 text-xs">
                        {platform.conversationsCount} chats answered
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={syncingId === platform.id}
                      onClick={() => handleSyncNow(platform.id)}
                      className="p-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingId === platform.id ? "animate-spin text-[#FF7A00]" : ""}`} />
                      <span className="text-[10px] font-bold">Sync</span>
                    </button>
                  </div>
                )}

                {/* Disconnected Explanation */}
                {!isConnected && !isComingSoon && (
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Link your business store DM's to start answering inquiries on autopilot with customized memory.
                  </p>
                )}

                {/* Coming Soon details */}
                {isComingSoon && (
                  <p className="text-xs text-zinc-400 italic">
                    Integration active in next beta cycle. Click notify to pre-register developer hooks.
                  </p>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="pt-4 border-t border-zinc-100 mt-4 flex items-center justify-between">
                {isComingSoon ? (
                  <button 
                    disabled 
                    className="text-[10px] bg-zinc-100 text-zinc-400 font-bold px-3 py-1.5 rounded-lg border border-zinc-200 cursor-not-allowed"
                  >
                    Preregister Active
                  </button>
                ) : isConnected ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span>Active & Syncing</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className="text-[10px] bg-zinc-950 hover:bg-zinc-900 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#FF7A00]" />
                    Connect Channel
                  </button>
                )}

                {isConnected && (
                  <button
                    type="button"
                    className="text-[10px] font-bold text-[#FF7A00] flex items-center gap-0.5 hover:underline"
                  >
                    <span>Config Brain</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
