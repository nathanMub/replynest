import { v4 as uuidv4 } from "uuid";

interface SavedProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  sku?: string;
  imageUrl?: string;
}

interface SavedFaq {
  id: string;
  question: string;
  answer: string;
  keywords?: string;
}

interface BusinessProfile {
  name?: string;
  email?: string;
  businessName?: string;
  industry?: string;
  businessDescription?: string;
  country?: string;
  phoneNumber?: string;
  whatsAppNumber?: string;
  website?: string;
  brandTone?: string;
  brandPersonality?: string;
  shippingPolicy?: string;
  returnPolicy?: string;
  paymentMethods?: string;
}

interface GenerateRepliesParams {
  business: string;
  goal: string;
  tone: string;
  message: string;
  customDetails?: string;
  businessProfile?: BusinessProfile | null;
  products: SavedProduct[];
  faqs: SavedFaq[];
}

interface RefineReplyParams {
  originalReply: string;
  refinementType: string;
  customInstruction?: string;
  language?: string;
  business?: string;
  goal?: string;
  tone?: string;
  businessProfile?: BusinessProfile | null;
  products: SavedProduct[];
  faqs: SavedFaq[];
}

export function generateMockReplies(params: GenerateRepliesParams) {
  const { business, goal, tone, message, customDetails, businessProfile, products, faqs } = params;

  const msgLower = message.toLowerCase();

  // 1. Analyze Budget or Price Mention
  // Look for things like "under 50", "budget of 100", "price of 30"
  let maxBudget = Infinity;
  const budgetRegex = /(?:under|below|budget of|max|maximum|around|less than|up to)\s*(?:\$|usd|r|€|£)?\s*(\d+)/i;
  const budgetMatch = msgLower.match(budgetRegex);
  if (budgetMatch && budgetMatch[1]) {
    maxBudget = parseInt(budgetMatch[1], 10);
  } else {
    // Check if there is a number in the message that might represent a budget
    const priceRegex = /(?:\$|usd|r|€|£)\s*(\d+)/i;
    const priceMatch = msgLower.match(priceRegex);
    if (priceMatch && priceMatch[1]) {
      maxBudget = parseInt(priceMatch[1], 10);
    }
  }

  // 2. Identify Matched FAQs
  const matchedFaqs: SavedFaq[] = [];
  for (const faq of faqs) {
    const qLower = faq.question.toLowerCase();
    const aLower = faq.answer.toLowerCase();
    const kw = faq.keywords ? faq.keywords.toLowerCase().split(",").map(k => k.trim()) : [];
    
    // Check for direct keywords or semantic phrases
    const wordsToMatch = [
      ...qLower.split(/\s+/),
      ...aLower.split(/\s+/),
      ...kw
    ].filter(w => w.length > 3);

    // Simple keyword overlap check
    let matches = false;
    for (const word of wordsToMatch) {
      if (word && msgLower.includes(word)) {
        matches = true;
        break;
      }
    }

    if (matches) {
      matchedFaqs.push(faq);
    }
  }

  // Fallback policies from Business Profile if no direct FAQ matches
  if (matchedFaqs.length === 0 && businessProfile) {
    if ((msgLower.includes("ship") || msgLower.includes("deliver") || msgLower.includes("post")) && businessProfile.shippingPolicy) {
      matchedFaqs.push({
        id: "faq-ship-policy",
        question: "What is your shipping policy?",
        answer: businessProfile.shippingPolicy
      });
    }
    if ((msgLower.includes("pay") || msgLower.includes("card") || msgLower.includes("method") || msgLower.includes("bank")) && businessProfile.paymentMethods) {
      matchedFaqs.push({
        id: "faq-pay-policy",
        question: "What payment methods do you accept?",
        answer: businessProfile.paymentMethods
      });
    }
    if ((msgLower.includes("return") || msgLower.includes("refund") || msgLower.includes("exchange")) && businessProfile.returnPolicy) {
      matchedFaqs.push({
        id: "faq-return-policy",
        question: "What is your return policy?",
        answer: businessProfile.returnPolicy
      });
    }
  }

  // 3. Identify Matched/Recommended Products
  let recommendedProducts = products.filter(p => {
    const nameMatch = msgLower.includes(p.name.toLowerCase());
    const descMatch = p.description ? msgLower.includes(p.description.toLowerCase()) : false;
    const catMatch = p.category ? msgLower.includes(p.category.toLowerCase()) : false;
    return nameMatch || descMatch || catMatch;
  });

  // If no product matches by name, check budget recommendation
  if (recommendedProducts.length === 0 && products.length > 0) {
    if (maxBudget !== Infinity) {
      // Recommend products within budget
      recommendedProducts = products.filter(p => p.price <= maxBudget);
      // Sort by price descending to get the best match close to budget
      recommendedProducts.sort((a, b) => b.price - a.price);
    } else {
      // Just recommend top 2 products as default
      recommendedProducts = products.slice(0, 2);
    }
  } else if (maxBudget !== Infinity) {
    // If we had product matches, also filter those by budget if possible
    const withinBudget = recommendedProducts.filter(p => p.price <= maxBudget);
    if (withinBudget.length > 0) {
      recommendedProducts = withinBudget;
    }
  }

  // 4. Extract Business Details for the response
  const bizName = businessProfile?.businessName || business || "our store";
  const contactName = businessProfile?.name || "";
  const location = businessProfile?.country ? `in ${businessProfile.country}` : "";

  // Helper to construct response text blocks
  const getFaqSection = () => {
    if (matchedFaqs.length > 0) {
      return matchedFaqs.map(faq => faq.answer).join("\n\n");
    }
    return "";
  };

  const getProductSection = () => {
    if (recommendedProducts.length > 0) {
      const prodsStr = recommendedProducts.map(p => `• *${p.name}* - ${p.price ? `$${p.price}` : "Contact for price"}${p.description ? ` (${p.description})` : ""}`).join("\n");
      return `We highly recommend these options for you:\n${prodsStr}`;
    }
    return "";
  };

  const getFaqExplanation = () => {
    if (matchedFaqs.length > 0) {
      return `Directly answers the customer's question using your saved FAQ: "${matchedFaqs[0].question}".`;
    }
    return "Addresses the customer's question directly.";
  };

  const getProductExplanation = () => {
    if (recommendedProducts.length > 0) {
      const budgetText = maxBudget !== Infinity ? ` matching their budget under $${maxBudget}` : "";
      return `Recommends relevant product(s) *${recommendedProducts.map(p => p.name).join(", ")}*${budgetText} to drive a direct sale.`;
    }
    return "";
  };

  // --- BUILD 5 DISTINCT OPTIONS ---

  // OPTION 1: Best Overall (Comprehensive, balanced, warm, recommended)
  const contentOverall = `Hello! Thank you for reaching out to *${bizName}*${location ? ` ${location}` : ""}. 😊

${getFaqSection() || "We would love to help you find exactly what you're looking for today."}

${getProductSection()}

If you're ready to proceed or have any further questions, please let us know! We accept various payment methods and offer quick dispatch. 🚀

Best regards,
${contactName || bizName}`;

  const explanationOverall = `${getFaqExplanation()} ${getProductExplanation()} Perfect balance of answering the inquiry and presenting recommended products with a friendly sign-off.`;

  // OPTION 2: Friendly (Warm, emojis, conversational)
  const contentFriendly = `Hey there! Thanks so much for dropping us a line at *${bizName}*! ✨ Double-happy to help you out today.

${getFaqSection() || "We are super excited to assist you! Ask us anything you need to know about our products or services."}

${recommendedProducts.length > 0 
  ? `Based on your request, check these awesome choices out! 😍\n` + recommendedProducts.map(p => `👉 *${p.name}* (only $${p.price}! ${p.description || ""})`).join("\n")
  : "Let us know if you need any recommendations! We have amazing options available."}

Let me know what you think or if you'd like to reserve any of these! Hope you have a wonderful day ahead! 🌸`;

  const explanationFriendly = "Tailored for a high-rapport customer interaction. Uses vibrant, warm language and friendly emojis to make the customer feel extremely welcome and valued.";

  // OPTION 3: Professional (Formal, structured, polite)
  const contentProfessional = `Dear Customer,

Thank you for contacting *${bizName}*. We appreciate your inquiry.

${getFaqSection() || "Regarding your request, we are pleased to assist you with any questions or purchases you wish to make."}

${recommendedProducts.length > 0 
  ? `Please find our catalog recommendations below:\n\n` + recommendedProducts.map(p => `• *${p.name}*: $${p.price} ${p.description ? `- ${p.description}` : ""}`).join("\n")
  : "Please let us know how we can best assist you with our catalog selection."}

Should you require any further assistance or wish to proceed with an order, please do not hesitate to contact us.

Sincerely,
${contactName || "Customer Relations"}
*${bizName}*`;

  const explanationProfessional = "Formatted with professional spacing, direct responses, and a respectful business tone. Ideal for B2B or premium service clients who appreciate clean structure.";

  // OPTION 4: Sales Focused (Scarcity, energetic, strong CTA)
  const contentSales = `Hi! Thanks for reaching out. You've picked the perfect time to message *${bizName}*! 🔥

${getFaqSection() ? `${getFaqSection()}\n\n` : ""}We have a high demand on our inventory right now, but we can definitely secure this for you!

${recommendedProducts.length > 0 
  ? `Here is what we have in stock ready for shipping:\n` + recommendedProducts.map(p => `⭐ *${p.name}* - *Only $${p.price}*! (Highly popular choice) 🛍️`).join("\n")
  : "We have some of our best-selling items in stock and ready to ship today!"}

*PROMO:* Order within the next hour and we can prioritize your package for same-day dispatch! 📦 

Would you like me to send you the secure payment link to secure your order now? Let me know! 💳`;

  const explanationSales = "Infuses gentle urgency and highlights direct benefits. Uses a high-converting 'soft-close' CTA asking if they want the payment link, maximizing conversion rates.";

  // OPTION 5: Short / Direct (WhatsApp quick read)
  const contentShort = `Hi! Thanks for messaging *${bizName}*. 

${getFaqSection() || "We'd love to help you!"}

${recommendedProducts.length > 0 
  ? `Check out *${recommendedProducts[0].name}* ($${recommendedProducts[0].price}). It fits perfectly!`
  : "How can we assist you today?"}

Let me know if you want to order this! 👍`;

  const explanationShort = "Extremely brief and optimized for immediate reading on mobile notification previews. Delivers answers fast without extra fluff.";

  // Generate replies
  return {
    replies: [
      {
        id: "mock-overall-" + uuidv4().slice(0, 8),
        type: "overall",
        label: "Best overall reply",
        content: contentOverall.trim(),
        explanation: explanationOverall,
        isRecommended: true,
        recommendationReason: `Strikes the absolute best balance of answering the FAQ directly and highlighting the ideal products matching the customer's search while retaining a professional, friendly closing.`
      },
      {
        id: "mock-friendly-" + uuidv4().slice(0, 8),
        type: "friendly",
        label: "Friendly version",
        content: contentFriendly.trim(),
        explanation: explanationFriendly,
        isRecommended: false,
        recommendationReason: ""
      },
      {
        id: "mock-professional-" + uuidv4().slice(0, 8),
        type: "professional",
        label: "Professional version",
        content: contentProfessional.trim(),
        explanation: explanationProfessional,
        isRecommended: false,
        recommendationReason: ""
      },
      {
        id: "mock-sales-" + uuidv4().slice(0, 8),
        type: "sales",
        label: "Sales focused version",
        content: contentSales.trim(),
        explanation: explanationSales,
        isRecommended: false,
        recommendationReason: ""
      },
      {
        id: "mock-short-" + uuidv4().slice(0, 8),
        type: "short",
        label: "Short version",
        content: contentShort.trim(),
        explanation: explanationShort,
        isRecommended: false,
        recommendationReason: ""
      }
    ]
  };
}

export function refineMockReply(params: RefineReplyParams) {
  const { originalReply, refinementType, customInstruction, language, businessProfile } = params;

  let refinedContent = originalReply;
  let explanation = `Refined response using development mode mock engines.`;

  const bizName = businessProfile?.businessName || "our business";

  switch (refinementType) {
    case "friendlier":
      refinedContent = `Hey! 😊 Just wanted to follow up on this:\n\n${originalReply.replace(/Dear Customer,|Hello!/gi, "Hey there! ✨")}\n\nHope this brings a smile to your face! Let us know what you think! 🙌`;
      explanation = "Enhanced friendly vocabulary and added supportive emojis to boost customer rapport.";
      break;
    case "shorter":
      // Take first 2-3 lines of original reply
      const lines = originalReply.split("\n").filter(l => l.trim().length > 0);
      refinedContent = lines.slice(0, Math.min(3, lines.length)).join("\n\n");
      if (!refinedContent.toLowerCase().includes("thanks")) {
        refinedContent = `Hi! Thanks for reaching out. \n\n` + refinedContent;
      }
      explanation = "Trimmed down the message text, keeping only the essential answer and call-to-action.";
      break;
    case "professional":
      refinedContent = `Dear Valued Customer,\n\nThank you for choosing *${bizName}*.\n\n${originalReply.replace(/Hey there!|Hey!|Hi!|😊|✨|😍|🔥|🛍️|👍/g, "")}\n\nSincerely,\nCustomer Service Representative\n*${bizName}*`;
      explanation = "Structured with formal greetings and sign-offs, removing informal phrasing and casual emojis.";
      break;
    case "persuasive":
      refinedContent = `🔥 *EXCLUSIVE VALUE OFFER* 🔥\n\n${originalReply}\n\n⚠️ *Please Note:* Stock is highly limited for these recommended items and demand is exceptional today. Order now to guarantee immediate fulfillment and priority support! 🚀`;
      explanation = "Injected marketing psychological triggers like scarcity, immediate value, and premium fulfillment benefits.";
      break;
    case "translate":
      const lang = language || "Spanish";
      if (lang.toLowerCase() === "spanish") {
        refinedContent = `Hola! Gracias por contactar a *${bizName}*.\n\n[Refined in Spanish]:\n${originalReply}\n\n¡Por favor avísenos si tiene alguna duda adicional!`;
        explanation = `Translated the reply into ${lang} while retaining critical placeholders and links.`;
      } else {
        refinedContent = `[Translated to ${lang}]:\n\n${originalReply}\n\nMerci / Thank you!`;
        explanation = `Translated the reply into ${lang}.`;
      }
      break;
    case "custom":
      refinedContent = `[Applying Custom Guideline: ${customInstruction}]\n\n${originalReply}`;
      explanation = `Custom adjustment applied successfully: "${customInstruction}"`;
      break;
    default:
      refinedContent = `${originalReply}\n\n(Refined to offer smoother readability)`;
      explanation = "Standard smoothing filter applied.";
  }

  return {
    content: refinedContent.trim(),
    explanation
  };
}
