import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Instagram, 
  MessageCircle, 
  MessageSquare, 
  Send, 
  CheckCheck, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  Zap,
  Globe
} from "lucide-react";

export default function AnimatedHeroMockup() {
  const [activePlatform, setActivePlatform] = useState<string>("instagram");

  // Periodically rotate highlight platform
  useEffect(() => {
    const platforms = ["instagram", "whatsapp", "tiktok", "messenger", "website"];
    const interval = setInterval(() => {
      setActivePlatform(prev => {
        const idx = platforms.indexOf(prev);
        return platforms[(idx + 1) % platforms.length];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-[640px] aspect-square lg:aspect-auto lg:h-[500px] flex items-center justify-center select-none bg-zinc-50/50 rounded-3xl border border-zinc-200/80 shadow-inner overflow-hidden p-6">
      
      {/* Background grid orbs */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, #E4E4E7 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-100/30 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center gap-6">
        
        {/* TOP LEVEL: Floating Social Source Inboxes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-[540px]">
          
          {/* Instagram Chat Card */}
          <motion.div 
            animate={{ 
              scale: activePlatform === "instagram" ? 1.02 : 0.98,
              borderColor: activePlatform === "instagram" ? "#FF7A00" : "#E4E4E7"
            }}
            className="p-3.5 bg-white rounded-2xl border transition-all duration-300 shadow-sm flex flex-col justify-between h-[100px]"
          >
            <div className="flex items-center gap-1.5 justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center text-white">
                  <Instagram className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold text-zinc-800">Sarah Shop</span>
              </div>
              <span className="text-[9px] text-zinc-400 font-mono">1m ago</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-medium leading-tight line-clamp-2">
              "Hi, do you sell the beige blazer in size S?"
            </p>
          </motion.div>

          {/* TikTok Chat Card */}
          <motion.div 
            animate={{ 
              scale: activePlatform === "tiktok" ? 1.02 : 0.98,
              borderColor: activePlatform === "tiktok" ? "#FF7A00" : "#E4E4E7"
            }}
            className="p-3.5 bg-white rounded-2xl border transition-all duration-300 shadow-sm flex flex-col justify-between h-[100px]"
          >
            <div className="flex items-center gap-1.5 justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-black flex items-center justify-center text-white text-[9px] font-black font-display">
                  T
                </div>
                <span className="text-[11px] font-bold text-zinc-800">Alex_K</span>
              </div>
              <span className="text-[9px] text-zinc-400 font-mono">3m ago</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-medium leading-tight line-clamp-2">
              "Is there any shipping discount code for UK?"
            </p>
          </motion.div>

          {/* WhatsApp Chat Card */}
          <motion.div 
            animate={{ 
              scale: activePlatform === "whatsapp" ? 1.02 : 0.98,
              borderColor: activePlatform === "whatsapp" ? "#FF7A00" : "#E4E4E7"
            }}
            className="p-3.5 bg-white rounded-2xl border transition-all duration-300 shadow-sm flex flex-col justify-between h-[100px] col-span-2 sm:col-span-1"
          >
            <div className="flex items-center gap-1.5 justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                  <MessageCircle className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold text-zinc-800">Johnathan</span>
              </div>
              <span className="text-[9px] text-emerald-600 font-bold">online</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-medium leading-tight line-clamp-2">
              "Hi! I want to order 5 units of premium candles."
            </p>
          </motion.div>

        </div>

        {/* MIDDLE LAYER: Central ReplyNest AI Hub */}
        <div className="relative flex flex-col items-center justify-center py-2">
          
          {/* Incoming Flow Animated Lines */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-10 flex justify-between pointer-events-none">
            <div className="w-0.5 h-full bg-gradient-to-b from-pink-500 to-orange-500 opacity-60 animate-pulse" />
            <div className="w-0.5 h-full bg-gradient-to-b from-black to-orange-500 opacity-60 animate-pulse" />
            <div className="w-0.5 h-full bg-gradient-to-b from-emerald-500 to-orange-500 opacity-60 animate-pulse" />
          </div>

          <motion.div 
            animate={{ 
              boxShadow: ["0 4px 20px rgba(255,122,0,0.15)", "0 4px 30px rgba(255,122,0,0.3)", "0 4px 20px rgba(255,122,0,0.15)"]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="px-6 py-3.5 bg-zinc-950 text-white rounded-full flex items-center gap-2.5 border border-zinc-800 shadow-xl"
          >
            <Sparkles className="w-4.5 h-4.5 text-[#FF7A00] animate-spin" style={{ animationDuration: "6s" }} />
            <span className="text-xs font-bold tracking-tight uppercase font-mono">
              ReplyNest <span className="text-[#FF7A00]">AI Employee</span>
            </span>
          </motion.div>

          {/* Outgoing Flow Line */}
          <div className="w-0.5 h-8 bg-gradient-to-b from-orange-500 to-zinc-900 pointer-events-none" />
        </div>

        {/* BOTTOM LAYER: Automated Smart Reply Preview Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[420px] bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xl text-left"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[#FFF0E0] text-[#FF7A00] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                Automated Smart Reply
              </span>
              <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5 text-orange-500" /> Auto-pilot Mode
              </span>
            </div>
            
            <span className="text-[11px] font-bold text-zinc-700 flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#FF7A00] fill-current" />
              99% confident
            </span>
          </div>

          <p className="text-xs text-zinc-800 font-medium leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-100 italic">
            "Hi there! 👋 Yes, we have exactly 2 left in size S! If you purchase now, we will pack and ship it today. Here is your checkout link: <span className="text-orange-600 underline font-semibold cursor-pointer">replynest.co/l/sarah-beige</span>"
          </p>

          <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400 font-semibold pt-1">
            <span>⚡ Response delay: 15 seconds</span>
            <span className="text-[#FF7A00] font-bold">Successfully sent ✓</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
