import React from "react";
import { MessageSquare, Phone, Video, MoreVertical, CheckCheck, Shield, Sparkles } from "lucide-react";

interface WhatsAppSimulatorProps {
  customerMessage: string;
  selectedReply: string;
  businessName: string;
  customerName?: string;
}

export default function WhatsAppSimulator({
  customerMessage,
  selectedReply,
  businessName,
  customerName = "WhatsApp Customer",
}: WhatsAppSimulatorProps) {
  // Current time formatted for WhatsApp chat bubble (e.g. 10:42 AM)
  const formatTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const currentTime = formatTime();

  return (
    <div className="w-full max-w-sm mx-auto bg-[#090e11] rounded-[36px] p-3 border-4 border-[#222e35] shadow-2xl relative overflow-hidden">
      {/* Phone Ear Piece & Camera Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-5 w-32 bg-[#222e35] rounded-b-2xl z-20 flex items-center justify-center">
        <div className="w-12 h-1 bg-gray-600 rounded-full mb-1"></div>
      </div>

      {/* Screen Container */}
      <div className="w-full h-[520px] bg-[#0b141a] rounded-[28px] overflow-hidden flex flex-col relative select-none">
        
        {/* WhatsApp Header Bar */}
        <div className="bg-[#111b21] pt-6 pb-3 px-3 flex items-center justify-between border-b border-[#222e35] z-10">
          <div className="flex items-center space-x-2">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#25d366] to-[#128c7e] flex items-center justify-center font-bold text-white text-sm relative">
              {customerName[0].toUpperCase()}
              {/* Green online badge */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25d366] border-2 border-[#111b21] rounded-full"></div>
            </div>
            
            <div>
              <div className="text-sm font-semibold text-slate-100 leading-tight">
                {customerName}
              </div>
              <div className="text-[10px] text-[#25d366] flex items-center gap-0.5">
                <span className="inline-block w-1.5 h-1.5 bg-[#25d366] rounded-full animate-pulse"></span>
                typing...
              </div>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center space-x-3 text-slate-300">
            <Video className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
            <Phone className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
            <MoreVertical className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>

        {/* Chat Area Background with Wallpaper pattern overlay */}
        <div 
          className="flex-1 p-4 overflow-y-auto flex flex-col space-y-4 relative"
          style={{
            backgroundImage: `radial-gradient(#1c2c35 0.75px, transparent 0.75px), radial-gradient(#1c2c35 0.75px, #0b141a 0.75px)`,
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 10px 10px",
          }}
        >
          {/* Encryption Notice */}
          <div className="mx-auto bg-[#182229] border border-yellow-500/10 text-[10px] text-[#ffd279] px-3 py-1.5 rounded-lg text-center max-w-[240px] flex items-start gap-1.5 leading-relaxed">
            <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#ffd279]" />
            <span>Messages are secured by ReplyNest AI Sales Representative. Click any option to preview.</span>
          </div>

          {/* Incoming Customer Message */}
          {customerMessage ? (
            <div className="self-start max-w-[85%] bg-[#202c33] text-slate-100 rounded-lg rounded-tl-none p-2.5 shadow-md relative group">
              {/* Left triangle tail */}
              <div className="absolute top-0 -left-2 w-0 h-0 border-[6px] border-transparent border-t-[#202c33] border-r-[#202c33]"></div>
              <p className="text-xs leading-relaxed whitespace-pre-line">{customerMessage}</p>
              <div className="text-[9px] text-slate-400 text-right mt-1 font-mono">
                {currentTime}
              </div>
            </div>
          ) : (
            <div className="self-start max-w-[85%] bg-[#202c33] text-slate-400 rounded-lg rounded-tl-none p-3 shadow-md italic text-xs">
              Waiting for customer message...
            </div>
          )}

          {/* Active Generated Reply (Outgoing) */}
          {selectedReply ? (
            <div className="self-end max-w-[85%] bg-[#005c4b] text-slate-100 rounded-lg rounded-tr-none p-2.5 shadow-md relative animate-fade-in">
              {/* Right triangle tail */}
              <div className="absolute top-0 -right-2 w-0 h-0 border-[6px] border-transparent border-t-[#005c4b] border-l-[#005c4b]"></div>
              
              {/* AI Assistant Badge */}
              <div className="flex items-center gap-1 text-[8px] font-semibold text-[#25d366] uppercase tracking-wider mb-1">
                <Sparkles className="w-2.5 h-2.5" />
                ReplyNest Suggested
              </div>

              <p className="text-xs leading-relaxed whitespace-pre-line break-words">{selectedReply}</p>
              
              <div className="flex items-center justify-end space-x-1 mt-1">
                <span className="text-[9px] text-slate-300 font-mono">{currentTime}</span>
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
              </div>
            </div>
          ) : (
            customerMessage && (
              <div className="self-end max-w-[85%] bg-[#1c2c35] border border-dashed border-slate-700 text-slate-400 rounded-lg p-3 text-center text-xs italic">
                Select a reply below to preview it here as a simulated WhatsApp message.
              </div>
            )
          )}
        </div>

        {/* WhatsApp Fake Input Footer */}
        <div className="bg-[#111b21] p-2 flex items-center space-x-2 border-t border-[#222e35]">
          <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>Type a message...</span>
            <span className="text-base">😀</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white text-sm">
            🎤
          </div>
        </div>

      </div>
    </div>
  );
}
