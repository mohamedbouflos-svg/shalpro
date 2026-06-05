export interface MoroccoLead {
  id: string;
  name: string;
  sector: string;
  city: string;
  phone: string;
  website: string | null;
  rating: number | null;
  reviewsCount: number | null;
  address: string;
  googleMapsUrl: string;
  leadScore: number; // 0 to 100
  priority: "High" | "Medium" | "Low";
  opportunityTags: string[]; // e.g. "Website Opportunity", "Mobile App Opportunity", etc.
  linkedInUrl?: string | null;
  notes?: string;
  claimed?: boolean;
  neighborhood?: string | null;
  email?: string | null;
}

export interface AdvancedOutreach {
  subject_1: string;
  subject_2: string;
  email_body: string;
  whatsapp_text: string;
  follow_up_text: string;
  analysis?: string;
  opportunity_type?: string;
  is_fallback?: boolean;
}

export interface LeadScanProgress {
  active: boolean;
  city: string;
  percent: number;
  foundCount: number;
}
