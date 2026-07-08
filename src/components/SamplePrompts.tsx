import React from "react";
import { MessageSquare, Sparkles } from "lucide-react";

interface SamplePrompt {
  businessType: string;
  category: string;
  message: string;
  goal: string;
  tone: string;
}

const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    businessType: "Clothing Store",
    category: "Exchange & Refund",
    message: "Hi, I bought the denim jacket yesterday but size M is a bit too tight. Can I swap it for a size L? If not, how do I get a refund?",
    goal: "Handle Complaint",
    tone: "Friendly"
  },
  {
    businessType: "Barber Shop",
    category: "Booking Request",
    message: "Hey! Do you have any open slots this Friday afternoon around 3 PM or 4 PM? Need a quick haircut and beard shape up.",
    goal: "Booking",
    tone: "Casual"
  },
  {
    businessType: "Restaurant",
    category: "Delivery / Party Order",
    message: "Hello! Do you deliver catering platters for 15 people? I want to place an order for my office lunch party this Thursday.",
    goal: "Close a Sale",
    tone: "Sales Focused"
  },
  {
    businessType: "Electronics",
    category: "Product Question",
    message: "Hi, I'm looking at the noise-cancelling headphones on your store. Does the warranty cover water damage, and is shipping free?",
    goal: "Answer Question",
    tone: "Professional"
  },
  {
    businessType: "Bakery",
    category: "Custom Cake Upsell",
    message: "Hello, how much is your standard 2-tier chocolate strawberry cake? I'm hosting a small birthday party this weekend.",
    goal: "Upsell",
    tone: "Premium"
  },
  {
    businessType: "Jewellery",
    category: "Luxury Gift Advice",
    message: "Hi there, I'm looking for a premium gold necklace for my wife's 5th anniversary. Do you have ready-to-ship options in luxury packaging?",
    goal: "Close a Sale",
    tone: "Luxury Brand"
  },
  {
    businessType: "Digital Products",
    category: "Failed Delivery",
    message: "Hi, I just purchased the 100+ UI templates bundle but didn't receive the download link. Can you please verify my email info@startup.com?",
    goal: "Refund",
    tone: "Professional"
  }
];

interface SamplePromptsProps {
  onSelectPrompt: (prompt: SamplePrompt) => void;
  activeBusinessType: string;
}

export default function SamplePrompts({ onSelectPrompt, activeBusinessType }: SamplePromptsProps) {
  // Filter prompts matching business type, or show a relevant mix
  const filteredPrompts = SAMPLE_PROMPTS.filter(
    (p) => p.businessType.toLowerCase() === activeBusinessType.toLowerCase()
  );

  const displayPrompts = filteredPrompts.length > 0 ? filteredPrompts : SAMPLE_PROMPTS.slice(0, 3);

  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-400 font-medium">
        <Sparkles className="w-3.5 h-3.5 text-brand-green animate-pulse" />
        <span>Try a live SaaS test scenario:</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {displayPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="text-left bg-[#111b21] hover:bg-[#18252d] border border-[#222e35] hover:border-[#25d366]/40 p-3 rounded-xl transition-all duration-200 group relative flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#25d366] bg-[#25d366]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {prompt.businessType}
                </span>
                <span className="text-[10px] text-slate-400 italic">
                  {prompt.category}
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed group-hover:text-white">
                "{prompt.message}"
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-[#222e35]/60 flex items-center justify-between text-[10px] text-slate-400 w-full">
              <span>Goal: <strong className="text-slate-300">{prompt.goal}</strong></span>
              <span>Tone: <strong className="text-slate-300">{prompt.tone}</strong></span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
