import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowRight, 
  Check, 
  Zap, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Globe, 
  Bot, 
  Smile, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Users,
  ShieldCheck,
  Briefcase,
  Play
} from "lucide-react";
import LiveChatWidget from "./LiveChatWidget";

interface HomepageProps {
  onStartGenerating: () => void;
  onCreateAccount: () => void;
  user: any;
  userPlan: any;
  onOpenSubscribe: () => void;
}

export default function Homepage({
  onStartGenerating,
  onCreateAccount,
  user,
  userPlan,
  onOpenSubscribe
}: HomepageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqData = [
    {
      q: "What is an AI Employee for Website Live Chat?",
      a: "An AI Employee is an intelligent virtual representative trained exclusively on your business. Unlike basic rule-based chatbots, it understands natural language context, references your product inventory, handles complex FAQs, collects visitor contact details, and escalates to human staff when necessary."
    },
    {
      q: "How do I teach the AI employee about my business?",
      a: "Inside your 'Business Brain' dashboard, you can upload your company name, description, return rules, and shipping guidelines. You can also upload your product inventory (names, prices, descriptions) and standard FAQs. The AI employee processes this knowledge instantly."
    },
    {
      q: "Can I take over the chat manually if a customer gets stuck?",
      a: "Absolutely. We call this 'Co-Pilot Mode'. When a customer requests a human or triggers an escalation, the conversation is marked as 'Escalated' in your live inbox. The AI automatically pauses, allowing you to converse directly and seal the deal."
    },
    {
      q: "Is there a custom installation script for my website?",
      a: "Yes. In the 'Installation' tab, you get a simple 1-line HTML `<script>` tag. Copy and paste it anywhere on your Shopify, WooCommerce, Webflow, or custom HTML website, and your AI employee starts working immediately."
    },
    {
      q: "How much does it cost?",
      a: "ReplyNest is currently in an active Free Beta! That means creating an account gives you 100% free, unlimited access to every single feature—including unlimited AI replies, custom Business Brain memory files, lead-capture forms, and color styling customization—with no credit card or upgrade required."
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-white text-zinc-900 overflow-x-hidden selection:bg-orange-100 selection:text-[#FF7A00]">
      
      {/* 1. HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 md:pt-28 pb-20 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side Info */}
        <div className="lg:col-span-7 space-y-7 text-left">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3.5 py-1.5 rounded-full text-[#FF7A00] text-xs font-bold tracking-tight">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Pivoted to Website Live Chat V2</span>
          </div>

          {/* Primary Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-950 leading-[1.12] font-display">
            Hire an AI employee <br />
            that works <span className="text-[#FF7A00]">24 hours a day.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-zinc-500 text-sm sm:text-base max-w-xl leading-relaxed font-semibold">
            ReplyNest is the ultimate AI Customer Representative for your website. It instantly greets visitors, answers FAQs, showcases products, captures contact leads, and hands off to you when needed.
          </p>

          {/* Actions CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-3">
            {user ? (
              <button
                onClick={onStartGenerating}
                className="w-full sm:w-auto px-8 py-4 bg-zinc-950 hover:bg-zinc-900 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                <span>Enter Admin Console</span>
                <ArrowRight className="w-4 h-4 text-[#FF7A00]" />
              </button>
            ) : (
              <button
                onClick={onCreateAccount}
                className="w-full sm:w-auto px-8 py-4 bg-zinc-950 hover:bg-zinc-900 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                <span>Hire Your AI Employee (Free)</span>
                <ArrowRight className="w-4 h-4 text-[#FF7A00]" />
              </button>
            )}

            <button
              onClick={onStartGenerating}
              className="w-full sm:w-auto px-6 py-4 bg-zinc-100 hover:bg-zinc-200/85 text-zinc-800 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[#FF7A00] fill-current" />
              <span>Interactive Simulator</span>
            </button>
          </div>

          {/* Proof checkmarks */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-zinc-400 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <Check className="text-[#FF7A00] w-4 h-4 stroke-[3]" />
              <span>1-Minute Integration Script</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="text-[#FF7A00] w-4 h-4 stroke-[3]" />
              <span>Full-Stack Lead Capture</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="text-[#FF7A00] w-4 h-4 stroke-[3]" />
              <span>Manual Co-Pilot Mode</span>
            </div>
          </div>
        </div>

        {/* Right Side Visual Panel (Sleek card-based illustration) */}
        <div className="lg:col-span-5 flex justify-center z-10">
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl space-y-6 select-none relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-orange-100 rounded-full blur-3xl opacity-50" />
            
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-lg shadow-sm">🤖</span>
                <div>
                  <h4 className="text-xs font-black text-zinc-800">ReplyNest Live Patrol</h4>
                  <span className="text-[9px] text-emerald-600 font-bold block flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Online 24/7
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded text-zinc-500 font-bold">Autopilot</span>
            </div>

            {/* Bubble mock dialog */}
            <div className="space-y-4 text-[11px] font-bold">
              <div className="flex gap-2 items-start max-w-[85%]">
                <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-[10px]">👤</span>
                <div className="bg-zinc-50 border border-zinc-100 p-2.5 rounded-2xl text-zinc-700">
                  Hi! Do you ship to Australia, and how much is the shipping cost?
                </div>
              </div>

              <div className="flex gap-2 items-start max-w-[85%] ml-auto flex-row-reverse">
                <span className="w-5 h-5 rounded-full bg-orange-50 text-[#FF7A00] flex items-center justify-center text-[10px]">🤖</span>
                <div className="bg-zinc-900 text-white p-2.5 rounded-2xl rounded-tr-none">
                  Yes, we ship to Australia! Shipping takes 5-7 business days. It is completely free on orders over $50. Otherwise, flat rate is $9.90 AUD.
                </div>
              </div>

              <div className="flex gap-2 items-start max-w-[85%]">
                <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-[10px]">👤</span>
                <div className="bg-zinc-50 border border-zinc-100 p-2.5 rounded-2xl text-zinc-700">
                  Awesome! Can I get a discount code to purchase?
                </div>
              </div>

              <div className="flex gap-2 items-start max-w-[85%] ml-auto flex-row-reverse">
                <span className="w-5 h-5 rounded-full bg-orange-50 text-[#FF7A00] flex items-center justify-center text-[10px]">🤖</span>
                <div className="bg-zinc-900 text-white p-2.5 rounded-2xl rounded-tr-none">
                  You sure can! Use code <span className="text-[#FF7A00]">WELCOME10</span> at checkout to get 10% off your entire order today.
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400 font-bold">
              <span>Avg response time: <b>1.4 seconds</b></span>
              <span className="text-emerald-600 font-black flex items-center gap-0.5">
                <Check className="w-3.5 h-3.5" /> 100% Accurate
              </span>
            </div>
          </div>
        </div>

      </section>

      {/* 2. VALUE PROPOSITION STATS */}
      <section className="bg-zinc-50 border-t border-b border-zinc-100 py-16 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black text-[#FF7A00] uppercase tracking-wider">Continuous Website Live Support</span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-display">
              Why businesses are hiring AI employees
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed">
              When prospective buyers land on your digital storefront, they expect quick feedback. If they have to wait minutes, they exit and go to competitors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Stat 1 */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF7A00]">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">No More Waiting</h3>
              <p className="text-xl font-black text-[#FF7A00]">Instant Replies 24/7</p>
              <p className="text-xs text-zinc-500 leading-normal font-medium">
                The AI employee replies in under 2 seconds. No more missed inquiries, lost tickets, or customer friction on holidays or late at night.
              </p>
            </div>

            {/* Stat 2 */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF7A00]">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">Active Capture</h3>
              <p className="text-xl font-black text-[#FF7A00]">Qualified Live Leads</p>
              <p className="text-xs text-zinc-500 leading-normal font-medium">
                Captures visitor name, email address, and phone number directly in the live conversation before human operator takeover triggers.
              </p>
            </div>

            {/* Stat 3 */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF7A00]">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">Trained on Brain</h3>
              <p className="text-xl font-black text-[#FF7A00]">Custom Business Memory</p>
              <p className="text-xs text-zinc-500 leading-normal font-medium">
                Trained on your business profile, products, refund/shipping structures, and brand voice guidelines to keep responses highly accurate.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 3. CORE PRODUCT FEATURES */}
      <section className="py-20 max-w-6xl mx-auto px-6 space-y-16">
        
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-[#FF7A00] uppercase tracking-wider">Crafted Functionality</span>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-display">
            A real digital coworker for your storefront
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          
          <div className="space-y-6">
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-zinc-900">1. Business Brain Integration</h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                No complex fine-tuning required. Simply write down your business description, select your brand voice tone, list your FAQs, and upload your products list. Your AI employee instantly updates its knowledge graph.
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-zinc-900">2. Interactive Product Recommender</h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                When website visitors ask for product recommendations or gift ideas, the AI reads your catalog data to list specific matching items with descriptions and direct prices.
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-zinc-900">3. Human Escalation Co-Pilot</h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                If a customer gets frustrated or requests a real person, the AI instantly flags the chat as 'Escalated' in your dashboard, sending the operator a signal to takeover.
              </p>
            </div>
          </div>

          <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-3xl space-y-4">
            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="text-[#FF7A00] w-4.5 h-4.5" /> Core Capabilities
            </h4>

            <div className="space-y-3.5 text-xs text-zinc-700 font-bold">
              {[
                "Automatic Lead Capture forms",
                "Context-aware FAQ answering",
                "Interactive live testing simulator",
                "1-line installation script integration",
                "Live performance analytics dashboard",
                "Manual human response & chat overrides",
                "Stripe integrated subscription upgrades"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF7A00] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </section>

      {/* 4. PREMIUM PRICING CARD */}
      <section className="bg-zinc-50 border-t border-b border-zinc-100 py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-black text-[#FF7A00] uppercase tracking-wider">SaaS Subscription Plans</span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-display">
              ReplyNest is currently in Free Beta 🚀
            </h2>
          </div>

          <div className="p-8 sm:p-10 bg-white border-2 border-[#FF7A00] rounded-3xl shadow-lg relative overflow-hidden text-center space-y-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-bl-full opacity-40 -z-0" />
            <span className="inline-block bg-[#FF7A00] text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full">
              Beta Promo Plan
            </span>
            <div className="space-y-2 relative z-10">
              <h3 className="text-xl font-black text-zinc-950 font-display">Unlimited Autopilot Beta Plan</h3>
              <p className="text-4xl font-black text-zinc-950 font-display">$0 <span className="text-xs text-zinc-400 font-bold">/ during beta</span></p>
              <p className="text-xs text-zinc-500 max-w-lg mx-auto font-medium pt-2">
                We are currently running a public beta to test and refine our advanced live chat patrol engine. Sign up or log in now to get instant, unlimited access to all AI features without any paywalls or limitations.
              </p>
            </div>
            
            <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-left text-xs text-zinc-600 font-bold relative z-10">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#FF7A00] stroke-[3]" />
                <span>Unlimited AI Responses</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#FF7A00] stroke-[3]" />
                <span>Full Business Brain memory</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#FF7A00] stroke-[3]" />
                <span>Advanced Lead Capture forms</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#FF7A00] stroke-[3]" />
                <span>Custom widget color styling</span>
              </div>
            </div>

            <div className="pt-4 relative z-10">
              {user ? (
                <button
                  onClick={onStartGenerating}
                  className="px-8 py-3.5 bg-zinc-950 hover:bg-zinc-900 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-md"
                >
                  Enter Console (Unlimited Access)
                </button>
              ) : (
                <button
                  onClick={onCreateAccount}
                  className="px-8 py-3.5 bg-[#FF7A00] hover:bg-orange-600 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-md"
                >
                  Create Your Free Account Now
                </button>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 5. FAQS */}
      <section className="py-20 max-w-4xl mx-auto px-6 space-y-10">
        
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-[#FF7A00] uppercase tracking-wider">Humble Answers</span>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight font-display">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-zinc-200">
          {faqData.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="py-4 font-bold">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex justify-between items-center text-left py-2 font-black text-zinc-800 hover:text-[#FF7A00] transition-colors focus:outline-none text-xs sm:text-sm"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="text-zinc-500 font-medium text-xs pt-1 pb-3 leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </section>

      {/* 6. IMMERSIVE INTERACTIVE WIDGET DEMO (Demo-Owner) */}
      <div className="fixed bottom-6 right-6 z-50">
        <LiveChatWidget ownerId={user?.uid || "demo-owner"} />
      </div>

    </div>
  );
}
