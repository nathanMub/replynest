import React, { useState } from "react";
import { 
  Terminal, 
  Copy, 
  Check, 
  Globe, 
  Code, 
  Cpu, 
  CheckCircle2, 
  FileCode,
  BookOpen,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { auth } from "../lib/firebaseAuth";

interface InstallationProps {
  token: string;
}

export default function Installation({ token }: InstallationProps) {
  const [copied, setCopied] = useState(false);
  const [activePlatform, setActivePlatform] = useState<"html" | "shopify" | "wordpress">("html");

  const userId = auth.currentUser?.uid || "YOUR_BUSINESS_ID";

  // The custom code snippet to render
  const embedCode = `<!-- ReplyNest AI Employee Live Chat Widget -->
<script>
  window.ReplyNestConfig = {
    ownerId: "${userId}",
    apiUrl: "${window.location.origin}"
  };
</script>
<script src="${window.location.origin}/widget.js" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="installation-guide" className="space-y-6 animate-fade-in max-w-[1000px] w-full mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-orange-100 text-[#FF7A00] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Hiring Live</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-display flex items-center gap-2">
            <Code className="w-6 h-6 text-[#FF7A00]" />
            Widget Installation
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Install your AI employee on any website, Shopify store, or WordPress site with a single line of code.
          </p>
        </div>
      </div>

      {/* Main Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Instructions and Embed code */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Step 1: Copy Code */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">1</span>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900">Copy Your Embed Code</h3>
                  <p className="text-[11px] text-zinc-400">Your custom identifier is automatically embedded in this script.</p>
                </div>
              </div>

              <button
                onClick={copyToClipboard}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  copied 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                    : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Sandbox Container */}
            <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800/60 font-mono text-[11px] text-zinc-300 overflow-x-auto leading-relaxed relative group">
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">javascript</span>
              </div>
              <pre className="whitespace-pre">{embedCode}</pre>
            </div>
          </div>

          {/* Step 2: Choose Platform Platform selection & specific steps */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
              <span className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">2</span>
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900">Choose Website Integration Platform</h3>
                <p className="text-[11px] text-zinc-400">Follow the platform instructions to complete widget activation.</p>
              </div>
            </div>

            {/* Platforms Tabs */}
            <div className="flex gap-2">
              {[
                { id: "html", label: "Custom HTML", icon: <FileCode className="w-3.5 h-3.5" /> },
                { id: "shopify", label: "Shopify", icon: <Globe className="w-3.5 h-3.5 text-[#95bf47]" /> },
                { id: "wordpress", label: "WordPress", icon: <BookOpen className="w-3.5 h-3.5 text-[#21759b]" /> },
              ].map((plat) => (
                <button
                  key={plat.id}
                  onClick={() => setActivePlatform(plat.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                    activePlatform === plat.id
                      ? "bg-zinc-950 text-white border-zinc-950"
                      : "bg-zinc-50 text-zinc-500 hover:text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {plat.icon}
                  <span>{plat.label}</span>
                </button>
              ))}
            </div>

            {/* Platform Instructions Content */}
            <div className="pt-2 text-xs text-zinc-600 space-y-4 font-medium leading-relaxed">
              {activePlatform === "html" && (
                <div className="space-y-3 animate-fade-in">
                  <p>To integrate ReplyNest Live Chat into any plain HTML, custom React, Vue, Webflow, or Framer website:</p>
                  <ol className="list-decimal list-inside space-y-2 text-zinc-500">
                    <li>Copy the script tag snippet from Step 1.</li>
                    <li>Open your website's codebase or template editor.</li>
                    <li>Paste the snippet directly inside the <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">&lt;body&gt;</code> tag, preferably at the very end (right before the closing tag <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">&lt;/body&gt;</code>).</li>
                    <li>Save and deploy your code. The live chat widget will automatically appear on your page!</li>
                  </ol>
                </div>
              )}

              {activePlatform === "shopify" && (
                <div className="space-y-3 animate-fade-in">
                  <p>Deploy your AI customer executive on your Shopify storefront easily:</p>
                  <ol className="list-decimal list-inside space-y-2 text-zinc-500">
                    <li>Go to your **Shopify Admin Dashboard &gt; Online Store &gt; Themes**.</li>
                    <li>Click on the three dots next to your active theme and select **Edit Code**.</li>
                    <li>Locate and click the <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">theme.liquid</code> file under the **Layout** folder.</li>
                    <li>Scroll to the bottom of the file and locate the closing tag <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">&lt;/body&gt;</code>.</li>
                    <li>Paste the copied script tag directly above that line.</li>
                    <li>Click **Save** in the top right corner. Refresh your shopfront to see your AI employee live!</li>
                  </ol>
                </div>
              )}

              {activePlatform === "wordpress" && (
                <div className="space-y-3 animate-fade-in">
                  <p>Enable live AI chat support across all pages of your WordPress blog or WooCommerce store:</p>
                  <ol className="list-decimal list-inside space-y-2 text-zinc-500">
                    <li>Navigate to your **WordPress Admin Panel &gt; Plugins &gt; Add New**.</li>
                    <li>Search for and install the plugin named **"Insert Headers and Footers"** (or WPCode), then click **Activate**.</li>
                    <li>Go to **Settings &gt; Insert Headers and Footers** (or Code Snippets in your sidebar).</li>
                    <li>Find the text area labeled **"Scripts in Footer"** or **"Footer Scripts"**.</li>
                    <li>Paste the custom ReplyNest script code snippet inside the container.</li>
                    <li>Click **Save Changes**. Your AI Assistant is now serving your visitors!</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Deployment Checklist & Status */}
        <div className="md:col-span-4 bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Employee Status</h3>
          
          <div className="p-4 bg-orange-50/40 border border-orange-100 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-zinc-800">Assigned Territory</span>
              <span className="text-[10px] bg-white text-[#FF7A00] border border-orange-200 px-2.5 py-0.5 rounded-full font-bold">Web Only</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <span className="text-xs font-extrabold text-zinc-800">Autopilot Ready</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-normal">
              Your Business Brain settings and FAQs are loaded. Once visitors arrive, the AI employee will handle inquiries immediately.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <h4 className="text-xs font-extrabold text-zinc-900">Pre-launch Checklist</h4>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 font-bold text-zinc-700">
                <CheckCircle2 className="w-4 h-4 text-[#FF7A00] fill-[#FF7A00]/10 shrink-0" />
                <span>Describe Company in Profile</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-zinc-700">
                <CheckCircle2 className="w-4 h-4 text-[#FF7A00] fill-[#FF7A00]/10 shrink-0" />
                <span>Upload FAQs or Product pricing</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-zinc-700">
                <CheckCircle2 className="w-4 h-4 text-[#FF7A00] fill-[#FF7A00]/10 shrink-0" />
                <span>Configure Widget Custom Design</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-zinc-400">
                <div className="w-4 h-4 rounded-full border border-zinc-200 shrink-0" />
                <span>Deploy script tag code snippet</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>Need assistance? Contact live human support at any time.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
