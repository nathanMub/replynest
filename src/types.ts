export type BusinessType =
  | "Clothing Store"
  | "Barber Shop"
  | "Beauty"
  | "Bakery"
  | "Restaurant"
  | "Electronics"
  | "Furniture"
  | "Jewellery"
  | "Digital Products"
  | "Other";

export type CustomerGoal =
  | "Close a Sale"
  | "Answer Question"
  | "Upsell"
  | "Booking"
  | "Handle Complaint"
  | "Follow Up"
  | "Refund"
  | "Delivery Update";

export type ToneType =
  | "Friendly"
  | "Professional"
  | "Sales Focused"
  | "Premium"
  | "Luxury Brand"
  | "Casual";

export interface Reply {
  id: string;
  type: string;
  label: string;
  content: string;
  explanation: string;
  isRecommended?: boolean;
  recommendationReason?: string;
}

export interface Profile {
  id: string;
  name: string;
  businessType: BusinessType;
  tone: ToneType;
  customDetails: string;
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
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RefinementType =
  | "friendlier"
  | "shorter"
  | "professional"
  | "persuasive"
  | "translate"
  | "custom";

export interface RefineRequest {
  business: string;
  goal: string;
  tone: string;
  originalReply: string;
  refinementType: RefinementType;
  customInstruction?: string;
  language?: string;
}
