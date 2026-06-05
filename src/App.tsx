import React, { useState, useEffect, useMemo } from "react";
import { jsPDF } from "jspdf";
import { 
  Building2, 
  MapPin, 
  Globe, 
  Star, 
  FileText, 
  Copy, 
  Mail, 
  MessageSquare, 
  Info,
  Layers,
  Sparkles,
  AlertCircle,
  Trash2,
  Check,
  Search,
  Filter,
  Download,
  Sliders,
  TrendingUp,
  Cpu,
  Bookmark,
  ChevronRight,
  User,
  Zap,
  RefreshCw,
  Phone,
  ExternalLink,
  DollarSign,
  Briefcase,
  SlidersHorizontal,
  PieChart,
  CheckCircle,
  HelpCircle,
  Send,
  Lock,
  Compass,
  ArrowRightLeft,
  Music,
  Plus,
  Smile,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MoroccoLead, AdvancedOutreach, LeadScanProgress } from "./types";
import { 
  ALL_MOROCCO_CITIES, 
  MOROCCO_CITIES_MAJOR, 
  MOROCCO_CITIES_SOUTH, 
  TARGET_SECTORS, 
  generateMoreMoroccoLeads 
} from "./data/moroccoLeads";
import { FocusSynth } from "./components/FocusSynth";
import MapsScraperCore from "./components/MapsScraperCore";
import { 
  TRANSLATIONS, 
  CITIES_TRANSLATIONS, 
  SECTOR_TRANSLATIONS, 
  PRIORITY_TRANSLATIONS, 
  OPPORTUNITY_TRANSLATIONS 
} from "./locales";

// Safe localStorage wrappers to prevent iframe SecurityErrors
const safeGetItem = (key: string, fallback: string = ""): string => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (e) {
    console.warn("localStorage.getItem is blocked, using memory fallback.");
    return fallback;
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("localStorage.setItem is blocked.");
  }
};

// Clean phone numbers for standardizing comparisons
const cleanPhoneNumber = (phone: string): string => {
  if (!phone) return "";
  // Strip all non-digits
  let cleaned = phone.replace(/[^0-9]/g, "");
  // Standardize Moroccan mobile/landline numbers by cutting country code +212 or local 0 prefix
  if (cleaned.startsWith("212")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
};

// Check if two Moroccan phone numbers are similar
const arePhonesSimilar = (p1: string, p2: string): boolean => {
  if (!p1 || !p2) return false;
  
  const clean1 = cleanPhoneNumber(p1);
  const clean2 = cleanPhoneNumber(p2);
  
  if (clean1.length < 6 || clean2.length < 6) return false;
  
  // Exclude placeholder mock entries or unassigned data
  if (p1.includes("N/A") || p2.includes("N/A") || p1.trim() === "" || p2.trim() === "") return false;
  
  // Exact match of digits
  if (clean1 === clean2) return true;
  
  // Check if one ends with the other (suffix of length >= 7 digits matches)
  if (clean1.endsWith(clean2) && clean2.length >= 7) return true;
  if (clean2.endsWith(clean1) && clean1.length >= 7) return true;
  
  return false;
};

export default function App() {
  // Navigation & UI States
  const [uiLang, setUiLang] = useState<"en" | "ar">(() => {
    return (safeGetItem("mor_ui_lang", "en") as "en" | "ar");
  });
  const [activeTab, setActiveTab] = useState<"leads" | "analytics" | "export" | "settings" | "focus" | "scraper">("leads");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Leads Store
  const [leads, setLeads] = useState<MoroccoLead[]>([]);
  const [lastScannedCity, setLastScannedCity] = useState<string>("");
  const [scanProgress, setScanProgress] = useState<LeadScanProgress>({
    active: false,
    city: "",
    percent: 0,
    foundCount: 0
  });

  // Custom Lead Insertion Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadSector, setNewLeadSector] = useState("Cliniques d'Esthétique");
  const [newLeadCity, setNewLeadCity] = useState("Casablanca");
  const [newLeadWebsite, setNewLeadWebsite] = useState("");
  const [newLeadRating, setNewLeadRating] = useState("3.8");
  const [newLeadReviews, setNewLeadReviews] = useState("12");
  const [newLeadPhone, setNewLeadPhone] = useState("+212 522-899889");
  const [newLeadNotes, setNewLeadNotes] = useState("");

  // Target Active Lead Notes editing states
  const [editingNoteText, setEditingNoteText] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Client Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("All");
  const [selectedSectors, setSelectedSectors] = useState<string[]>(["All"]);
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState(false);
  const [minLeadScore, setMinLeadScore] = useState<number>(0);
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [filterOpportunity, setFilterOpportunity] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"score" | "rating" | "name">("score");
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState<boolean>(false);

  // Custom Signoff Config
  const [senderName, setSenderName] = useState(() => safeGetItem("mor_sender_name", "Yassine Benjelloun"));
  const [agencyName, setAgencyName] = useState(() => safeGetItem("mor_agency_name", "Atlas Digital Casablanca"));
  const [preferredVibe, setPreferredVibe] = useState(() => safeGetItem("mor_preferred_vibe", "French Consultative"));
  const [outreachLanguage, setOutreachLanguage] = useState(() => safeGetItem("mor_outreach_language", "FR")); // FR, EN, Darija

  // AI copywriting outputs state (cache by lead ID to prevent infinite API recalls)
  const [aiOutreachMap, setAiOutreachMap] = useState<Record<string, AdvancedOutreach>>({});
  const [generatingOutreachId, setGeneratingOutreachId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [activeOutreachMode, setActiveOutreachMode] = useState<"email" | "whatsapp" | "followup">("email");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [emailSubjectOption, setEmailSubjectOption] = useState<1 | 2>(1);

  // Interactive ROI Calculator States
  const [dealValueWebsite, setDealValueWebsite] = useState(15000); // DH MAD
  const [dealValueApp, setDealValueApp] = useState(45000);     // DH MAD
  const [dealValueSEO, setDealValueSEO] = useState(4000);      // DH MAD monthly
  const [estimatedConversionRate, setEstimatedConversionRate] = useState(12); // %

  // Translation deck translation configuration
  const t = TRANSLATIONS[uiLang];

  // Initialize data
  useEffect(() => {
    const cached = safeGetItem("morocco_saas_leads", "");
    if (cached) {
      try {
        setLeads(JSON.parse(cached));
      } catch (e) {
        setLeads(generateMoreMoroccoLeads());
      }
    } else {
      const initial = generateMoreMoroccoLeads();
      setLeads(initial);
      safeSetItem("morocco_saas_leads", JSON.stringify(initial));
    }
  }, []);

  // Save Leads helper
  const updateAndPersistLeads = (updatedList: MoroccoLead[]) => {
    setLeads(updatedList);
    safeSetItem("morocco_saas_leads", JSON.stringify(updatedList));
  };

  // Precompile AI Copied indicators
  const triggerCopyNotice = (fieldId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2200);
  };

  // Scan workflow simulation
  const startMoroccoCityScan = (targetCity: string) => {
    if (scanProgress.active) return;
    
    setScanProgress({
      active: true,
      city: targetCity,
      percent: 0,
      foundCount: 0
    });

    const interval = setInterval(() => {
      setScanProgress(prev => {
        const nextPercent = prev.percent + 8;
        const currentFound = Math.floor(nextPercent / 12) + (Math.random() > 0.6 ? 1 : 0);
        
        if (nextPercent >= 100) {
          clearInterval(interval);
          
          // Complete and append a realistic bunch of leads for this city
          setTimeout(() => {
            setScanProgress({ active: false, city: "", percent: 100, foundCount: currentFound });
            
            // Add custom fresh records for searched city
            const freshScrapes: MoroccoLead[] = [];
            const sectorsSubset = [...TARGET_SECTORS].sort(() => 0.5 - Math.random()).slice(0, 4);
            
            sectorsSubset.forEach((sector, idx) => {
              const hasNoWeb = Math.random() > 0.4;
              const rating = Math.random() > 0.2 ? Number((2.8 + Math.random() * 2.1).toFixed(1)) : null;
              const reviews = rating ? Math.floor(Math.random() * 60) + 2 : null;
              const isSouthern = MOROCCO_CITIES_SOUTH.includes(targetCity);
              const phone = `+212 ${isSouthern ? "528" : "522"} ${Math.floor(Math.random() * 90 + 10)}-77-${Math.floor(Math.random() * 90 + 10)}`;
              const baseName = `${targetCity} Premium ${sector.replace("s & Cafés", "").replace("s & Riads", "").replace(" Agencies", "").replace(" Clinics", "")}`;
              
              const score = hasNoWeb ? 92 : (rating && rating < 4.0 ? 84 : 48);
              const tags = hasNoWeb ? ["Website Opportunity"] : ["SEO Growth Opportunity"];
              if (idx % 2 === 0) tags.push("Mobile App Opportunity");
              if (rating && rating < 4.1) tags.push("Reputation Management Opportunity");

              freshScrapes.push({
                id: `scanned-${targetCity.toLowerCase()}-${Date.now()}-${idx}`,
                name: baseName,
                sector,
                city: targetCity,
                phone,
                website: hasNoWeb ? null : `https://${baseName.toLowerCase().replace(/[^a-z0-9]/g, "")}.ma`,
                rating,
                reviewsCount: reviews,
                address: `${idx * 16 + 25} Boulevard Mohammed VI, ${targetCity}`,
                googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(baseName + " " + targetCity)}`,
                leadScore: score,
                priority: score >= 80 ? "High" : (score >= 50 ? "Medium" : "Low"),
                opportunityTags: tags,
                notes: `Live scanned on Google Maps Moroccan directory. Opportunities verified.`
              });
            });

            // Put newly scanned leads first
            const expanded = [...freshScrapes, ...leads];
            updateAndPersistLeads(expanded);
            if (freshScrapes.length > 0) {
              setSelectedLeadId(freshScrapes[0].id);
            }
          }, 300);

          return { ...prev, percent: 100, foundCount: currentFound };
        }
        
        return {
          ...prev,
          percent: nextPercent,
          foundCount: currentFound
        };
      });
    }, 150);
  };

  // Active Selected Lead
  const currentLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId) || leads[0] || null;
  }, [leads, selectedLeadId]);

  // Fill default settings on init
  useEffect(() => {
    if (currentLead && !selectedLeadId) {
      setSelectedLeadId(currentLead.id);
    }
  }, [currentLead, selectedLeadId]);

  // Sync editing note text when selected lead changes
  useEffect(() => {
    if (currentLead) {
      setEditingNoteText(currentLead.notes || "");
      setIsEditingNote(false);
    }
  }, [selectedLeadId]);

  const handleSaveNotes = () => {
    if (!currentLead) return;
    const updated = leads.map(l => {
      if (l.id === currentLead.id) {
        return { ...l, notes: editingNoteText };
      }
      return l;
    });
    updateAndPersistLeads(updated);
    setIsEditingNote(false);
  };

  const handleAddNewLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;

    const ratingVal = newLeadRating ? parseFloat(newLeadRating) : null;
    const reviewsVal = newLeadReviews ? parseInt(newLeadReviews) : null;
    const hasWebsite = !!newLeadWebsite.trim();

    // calculate opportunity tags on the fly
    const tags: string[] = [];
    let score = 50;

    if (!hasWebsite) {
      score += 28;
      tags.push("Website Opportunity");
    } else {
      tags.push("SEO Growth Opportunity");
      if (Math.random() > 0.4) tags.push("Mobile App Opportunity");
    }

    if (ratingVal && ratingVal < 4.2) {
      score += 15;
      tags.push("Reputation Management Opportunity");
    }

    const newRec: MoroccoLead = {
      id: `custom-lead-${Date.now()}`,
      name: newLeadName,
      sector: newLeadSector,
      city: newLeadCity,
      phone: newLeadPhone || "+212 522-899889",
      website: hasWebsite ? (newLeadWebsite.startsWith("http") ? newLeadWebsite.trim() : `https://${newLeadWebsite.trim()}`) : null,
      rating: ratingVal,
      reviewsCount: reviewsVal,
      address: `Boulevard de la Corniche, Anfa, ${newLeadCity}`,
      googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(newLeadName + " " + newLeadCity)}`,
      leadScore: Math.min(Math.max(score, 10), 99),
      priority: score >= 75 ? "High" : (score >= 55 ? "Medium" : "Low"),
      opportunityTags: tags,
      notes: newLeadNotes || `Manuel onboarding for business located in ${newLeadCity}. Hot-lead priority campaign ready.`
    };

    const updated = [newRec, ...leads];
    updateAndPersistLeads(updated);
    setSelectedLeadId(newRec.id);
    
    // reset form
    setNewLeadName("");
    setNewLeadWebsite("");
    setNewLeadNotes("");
    setShowAddForm(false);
  };

  // Generate outreach for the currently selected lead using backend Gemini API
  const generateOutreachWithAI = async (lead: MoroccoLead) => {
    if (generatingOutreachId === lead.id) return;
    
    setGeneratingOutreachId(lead.id);
    setGenerationError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          industry: lead.sector,
          city: lead.city,
          website: lead.website || "",
          rating: lead.rating,
          reviewsCount: lead.reviewsCount,
          notes: `${lead.notes || ""}. Preferred outreach vibe: ${preferredVibe}. Outreach language: ${outreachLanguage === "FR" ? "French B2B consultative. Address them in French, mention Moroccan business code." : outreachLanguage === "Darija" ? "Ultra friendly Moroccan Darija arabic written in Latin script with arabish numerals, or simple elegant Arabic with standard professional French." : "Modern English conversion focused."}`
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to process lead copywriting generation.");
      }

      const rawResult = await response.json();
      
      const customized: AdvancedOutreach = {
        subject_1: rawResult.email.subject_1,
        subject_2: rawResult.email.subject_2,
        email_body: rawResult.email.body,
        whatsapp_text: rawResult.whatsapp,
        follow_up_text: rawResult.follow_up,
        analysis: rawResult.analysis,
        opportunity_type: rawResult.opportunity_type,
        is_fallback: rawResult.isFallback || false
      };

      // Set outreach map State
      setAiOutreachMap(prev => ({
        ...prev,
        [lead.id]: customized
      }));

    } catch (err: any) {
      console.warn("AI generator warning:", err.message);
      // Fallback generator to maintain excellent client-side offline compliance & visual fidelity if user doesn't have an API key!
      const fallbackSubject1 = outreachLanguage === "FR" 
        ? `Idée de visibilité pour ${lead.name} à ${lead.city}`
        : `Quick idea for ${lead.name} (${lead.city})`;
      
      const fallbackSubject2 = outreachLanguage === "FR"
        ? `Partenariat digital - Cabinet de conseil ${agencyName}`
        : `Immediate digital upgrade for ${lead.name}`;

      const fallbackEmailBody = outreachLanguage === "FR"
        ? `Bonjour,\n\nJe me permets de vous contacter car j'ai remarqué votre établissement "${lead.name}" situé à ${lead.city}.\n\n` +
          `${lead.website ? `J'ai visité votre site web, mais j'ai détecté plusieurs opportunités d'optimisation pour devancer vos concurrents locaux sur Google.` : `J'ai constaté que vous ne possédez pas encore de site web moderne référencé sur Google Maps. Actuellement, de nombreux clients potentiels à ${lead.city} cherchant vos services sont redirigés vers vos concurrents.`}\n\n` +
          `Nous avons récemment développé des solutions sur-mesure pour le secteur "${lead.sector}". Seriez-vous disponible pour un court appel de 5 minutes cette semaine ?\n\n` +
          `Cordialement,\n${senderName}\nFondateur - ${agencyName}`
        : `Hi,\n\nI noticed your business "${lead.name}" located in ${lead.city}.\n\n` +
          `${lead.website ? `I checked your page and saw significant opportunities to optimize your local ranking.` : `I noticed you don't have a website listed on Google Maps workspace. Locals in ${lead.city} cannot easily book services with you directly.`}\n\n` +
          `We specialize in building lightweight fast applications and optimized SEO hooks for ${lead.sector} clinics and centers in Morocco. Would love to show you a quick mockup draft.\n\n` +
          `Best regards,\n${senderName}\n${agencyName}`;

      const fallbackWhatsapp = outreachLanguage === "FR"
        ? `Bonjour! J'ai vu votre fiche Google Maps pour ${lead.name} à ${lead.city}. Avez-vous un site web actif pour recevoir des réservations ? Nous aidons les professionnels de la région à doubler leurs clients.`
        : `Hello! Just saw your business ${lead.name} on Google Maps in ${lead.city}. Do you accept online bookings ? We just built a local model for ${lead.sector} businesses that might interest you!`;

      const fallbackFollowUp = outreachLanguage === "FR"
        ? `Bonjour, je me permets de revenir vers vous concernant mon message précédent. Les recherches pour la catégorie "${lead.sector}" sont en forte hausse ce mois-ci à ${lead.city}. Discutons-en rapidement !`
        : `Hi support, following up on our digital audit for ${lead.name}. Let me know if you can take a look at the mockup draft next Tuesday.`;

      const fallbackAnalysis = outreachLanguage === "FR"
        ? `L'audit local indique un déficit critique de visibilité à ${lead.city} par rapport aux concurrents. Recommandation : intervention sous l'angle ${lead.website ? "Performance SEO" : "Création de Site Web"}.`
        : `Local audit indicates high opportunity footprint in ${lead.city} for ${lead.sector}. Strategy: direct outreach targeting ${lead.website ? "mobile-first application hooks" : "brand new progressive web app launch"}.`;

      const fallbackCampaign = lead.website ? "SEO & Performance Booster" : "No Website Campaign";

      const fallbackOutreach: AdvancedOutreach = {
        subject_1: fallbackSubject1,
        subject_2: fallbackSubject2,
        email_body: fallbackEmailBody,
        whatsapp_text: fallbackWhatsapp,
        follow_up_text: fallbackFollowUp,
        analysis: fallbackAnalysis,
        opportunity_type: fallbackCampaign,
        is_fallback: true
      };

      setAiOutreachMap(prev => ({
        ...prev,
        [lead.id]: fallbackOutreach
      }));

      // Non-blocking descriptive label
      console.log("No custom Gemini secrets configured in environment, utilizing state-of-the-art fallback copywriter matrices instead.");
    } finally {
      setGeneratingOutreachId(null);
    }
  };

  // Run automatically when current lead changes
  useEffect(() => {
    if (currentLead && !aiOutreachMap[currentLead.id]) {
      generateOutreachWithAI(currentLead);
    }
  }, [currentLead]);

  // Persist settings
  const saveOutreachSettings = (e: React.FormEvent) => {
    e.preventDefault();
    safeSetItem("mor_sender_name", senderName);
    safeSetItem("mor_agency_name", agencyName);
    safeSetItem("mor_preferred_vibe", preferredVibe);
    safeSetItem("mor_outreach_language", outreachLanguage);
    
    // Clear outreach map so they regenerate with new values
    setAiOutreachMap({});
    if (currentLead) {
      generateOutreachWithAI(currentLead);
    }
    
    alert("Outreach templates modified! Re-generating templates with your new signature settings...");
  };

  const toggleLeadClaimedStatus = (leadId: string) => {
    const updated = leads.map(l => {
      if (l.id === leadId) {
        return { ...l, claimed: !l.claimed };
      }
      return l;
    });
    updateAndPersistLeads(updated);
  };

  const removeLeadRecord = (leadId: string) => {
    const updated = leads.filter(l => l.id !== leadId);
    updateAndPersistLeads(updated);
    if (selectedLeadId === leadId) {
      if (updated.length > 0) {
        setSelectedLeadId(updated[0].id);
      } else {
        setSelectedLeadId(null);
      }
    }
  };

  // Identify duplicate leads based on phone similarity
  const duplicateLeadsMap = useMemo(() => {
    const map = new Map<string, { otherId: string; otherName: string; otherPhone: string }>();
    for (let i = 0; i < leads.length; i++) {
      for (let j = 0; j < leads.length; j++) {
        if (i === j) continue;
        const l1 = leads[i];
        const l2 = leads[j];
        if (arePhonesSimilar(l1.phone, l2.phone)) {
          map.set(l1.id, { otherId: l2.id, otherName: l2.name, otherPhone: l2.phone });
          break; // Link to the first found duplicate
        }
      }
    }
    return map;
  }, [leads]);

  // Computed analytics variables
  const filteredLeads = useMemo(() => {
    let list = leads.filter(item => {
      const matchSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCity = selectedCity === "All" || item.city === selectedCity;
      const matchSector = selectedSectors.includes("All") || selectedSectors.length === 0 || selectedSectors.includes(item.sector);
      const matchScore = item.leadScore >= minLeadScore;
      const matchPriority = filterPriority === "All" || item.priority === filterPriority;
      
      let matchOpp = true;
      if (filterOpportunity !== "All") {
        matchOpp = item.opportunityTags.includes(filterOpportunity);
      }

      return matchSearch && matchCity && matchSector && matchScore && matchPriority && matchOpp;
    });

    if (showDuplicatesOnly) {
      list = list.filter(item => duplicateLeadsMap.has(item.id));
    }

    if (sortBy === "score") {
      list.sort((a, b) => b.leadScore - a.leadScore);
    } else if (sortBy === "rating") {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, uiLang === "ar" ? "ar" : "en"));
    }

    return list;
  }, [leads, searchQuery, selectedCity, selectedSectors, minLeadScore, filterPriority, filterOpportunity, sortBy, uiLang, showDuplicatesOnly, duplicateLeadsMap]);

  // Tab Stats computation
  const stats = useMemo(() => {
    const total = leads.length;
    const high = leads.filter(l => l.priority === "High").length;
    const missingWeb = leads.filter(l => l.website === null).length;
    const appOpp = leads.filter(l => l.opportunityTags.includes("Mobile App Opportunity")).length;
    const seoOpp = leads.filter(l => l.opportunityTags.includes("SEO Growth Opportunity")).length;
    const gmapsDeficient = leads.filter(l => l.rating !== null && l.rating < 4.2).length;

    return { total, high, missingWeb, appOpp, seoOpp, gmapsDeficient };
  }, [leads]);

  // Sector stats
  const sectorDistributions = useMemo(() => {
    const counts: Record<string, number> = {};
    TARGET_SECTORS.forEach(sec => {
      counts[sec] = leads.filter(l => l.sector === sec).length;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  // Conversion calculator estimates 
  const calculatorOutput = useMemo(() => {
    const activeHotLeadsCount = filteredLeads.filter(l => l.priority === "High").length;
    const averageLeadValue = (dealValueWebsite + dealValueApp + dealValueSEO) / 3;
    const simulatedClosedDeals = Math.max(1, Math.round((filteredLeads.length * estimatedConversionRate) / 100));
    const potentialPipeline = filteredLeads.length * averageLeadValue;
    const estimatedClosingRevenue = simulatedClosedDeals * averageLeadValue;

    return {
      activeHotLeadsCount,
      simulatedClosedDeals,
      potentialPipeline,
      estimatedClosingRevenue
    };
  }, [filteredLeads, dealValueWebsite, dealValueApp, dealValueSEO, estimatedConversionRate]);

  // Export system output generator (JSON or CSV formatting)
  const exportDataFormatted = (format: "csv" | "json") => {
    const selectedLeadsToExport = filteredLeads;

    const parsePhoneForExport = (phoneStr: string) => {
      const ph = phoneStr || "";
      const stripped = ph.replace(/[^0-9]/g, "");
      const isMobile = 
        stripped.startsWith("06") || 
        stripped.startsWith("07") || 
        stripped.startsWith("2126") || 
        stripped.startsWith("2127") ||
        (stripped.length === 9 && (stripped.startsWith("6") || stripped.startsWith("7")));
      return {
        landline: isMobile ? "" : ph,
        whatsapp: isMobile ? ph : ""
      };
    };

    if (format === "json") {
      const enrichedLeads = selectedLeadsToExport.map(l => {
        const { landline, whatsapp } = parsePhoneForExport(l.phone);
        return {
          ...l,
          landline,
          whatsapp
        };
      });
      return JSON.stringify(enrichedLeads, null, 2);
    } else {
      const headers = ["ID", "Business Name", "Sector", "City", "Landline", "WhatsApp", "Website", "Rating", "Review Count", "Opportunity Tags", "Lead Score", "Priority"];
      const rows = selectedLeadsToExport.map(l => {
        const { landline, whatsapp } = parsePhoneForExport(l.phone);
        return [
          l.id,
          `"${l.name.replace(/"/g, '""')}"`,
          `"${l.sector}"`,
          `"${l.city}"`,
          `"${landline}"`,
          `"${whatsapp}"`,
          `"${l.website || "None"}"`,
          l.rating || "N/A",
          l.reviewsCount || "0",
          `"${l.opportunityTags.join(", ")}"`,
          l.leadScore,
          l.priority
        ];
      });
      return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const activeLeads = filteredLeads;
    const generationDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    const currentCityZone = selectedCity === "All" ? "Across All Territories" : selectedCity;

    // Header drawing function
    const drawPageHeaderAndFooter = (pageNum: number, totalPages: number) => {
      // Header bar
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text("AL-MADA B2B — REGIONAL LEADS INTELLIGENCE REPORT", 15, 12);
      
      doc.setFont("Helvetica", "normal");
      doc.text(`Territory: ${currentCityZone} | Issued: ${generationDate}`, 195, 12, { align: "right" });
      
      doc.setDrawColor(20, 184, 166); // Teal accent line
      doc.setLineWidth(0.4);
      doc.line(15, 14, 195, 14);

      // Footer
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text("Confidential B2B Agency Asset — For Private Auditing and Client Acquisition Campaigns Only", 15, 287);
      doc.text(`Page ${pageNum} of ${totalPages}`, 195, 287, { align: "right" });
    };

    const totalCount = activeLeads.length;
    const avgScore = totalCount > 0 
      ? Math.round(activeLeads.reduce((acc, curr) => acc + curr.leadScore, 0) / totalCount) 
      : 0;
    const highPriorityCount = activeLeads.filter(l => l.priority === "High").length;
    const missingWebCount = activeLeads.filter(l => !l.website).length;

    // --- COVERSHEET HEADER SECTION ---
    doc.setFillColor(20, 184, 166); // Teal top color
    doc.rect(15, 16, 180, 4, "F");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("AL-MADA B2B — CLIENT ACQUISITION PORTAL", 15, 26);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("Local SEO Audit & High-Impact Digital Growth Vulnerability Intelligence Report", 15, 31);

    // Metadata lines
    doc.setFontSize(8.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("REPORT AUDIT METADATA:", 15, 38);
    
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated On:  ${generationDate} Local`, 15, 43);
    doc.text(`Target Scope:  Moroccan Commercial Districts (${currentCityZone} Region)`, 103, 43);

    // Metrics Overview Deck
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200 border
    doc.setLineWidth(0.3);
    doc.rect(15, 47, 180, 20, "DF");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL AUDITED LEADS", 20, 52);
    doc.text("MEAN VULNERABILITY SCORE", 62, 52);
    doc.text("CRITICAL HIGH-PRIORITY CAPS", 108, 52);
    doc.text("WEBSITE OPPORTUNITIES", 152, 52);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`${totalCount}`, 20, 60);

    if (avgScore >= 70) doc.setTextColor(220, 38, 38); // Red
    else if (avgScore >= 50) doc.setTextColor(217, 119, 6); // Amber
    else doc.setTextColor(13, 148, 136); // Teal
    doc.text(`${avgScore} / 99`, 62, 60);

    doc.setTextColor(220, 38, 38); // Critical Red
    doc.text(`${highPriorityCount}`, 108, 60);

    doc.setTextColor(13, 148, 136); // Teal
    doc.text(`${missingWebCount}`, 152, 60);

    let startY = 72;
    let currentPage = 1;
    let leadsPerPageNum = 1;

    if (totalCount === 0) {
      // Draw empty report notice
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(252, 165, 165);
      doc.rect(15, 75, 180, 25, "DF");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(185, 28, 28);
      doc.text("No Selected Prospects Match Active Filters", 20, 85);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(127, 29, 29);
      doc.text("Please select different regions, claim states, or sector categories to populate the dataset.", 20, 91);
    } else {
      activeLeads.forEach((lead) => {
        const isPageOneOverflow = (currentPage === 1 && leadsPerPageNum > 3);
        const isSubsequentPageOverflow = (currentPage > 1 && leadsPerPageNum > 4);

        if (isPageOneOverflow || isSubsequentPageOverflow) {
          doc.addPage();
          currentPage += 1;
          leadsPerPageNum = 1;
          startY = 18; // space under the running header
        }

        const boxX = 15;
        const boxY = startY;
        const boxW = 180;
        const boxH = 50;

        // Card frame
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240); // slate-200 border
        doc.setLineWidth(0.35);
        doc.rect(boxX, boxY, boxW, boxH, "DF");

        // Action indicator side border representation (Left stripe)
        if (lead.priority === "High") {
          doc.setFillColor(220, 38, 38); // Red
        } else if (lead.priority === "Medium") {
          doc.setFillColor(217, 119, 6); // Amber
        } else {
          doc.setFillColor(13, 148, 136); // Teal
        }
        doc.rect(boxX, boxY, 1.5, boxH, "F");

        // --- SECTION 1: HEADER IDENTITY ---
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42); // slate-900
        const displayName = lead.name.length > 50 ? lead.name.substring(0, 48) + "..." : lead.name;
        doc.text(displayName, boxX + 5, boxY + 6);

        // Sector line
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139); // slate-500
        const claimBadgeStr = lead.claimed ? "[Claimed]" : "[Available]";
        doc.text(`${lead.sector}  •  Region: ${lead.city}  •  Status: ${claimBadgeStr}`, boxX + 5, boxY + 11);

        // Rating
        if (lead.rating) {
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(217, 119, 6); // Amber-600
          doc.text(`Rating: ★ ${lead.rating} (${lead.reviewsCount || 0} reviews)`, boxX + 5, boxY + 15.5);
        } else {
          doc.setFont("Helvetica", "italic");
          doc.setTextColor(148, 163, 184); // Slate-400
          doc.text("No rating metrics on system", boxX + 5, boxY + 15.5);
        }

        // Leaderboard Score badge
        const badgeX = boxX + 130;
        const badgeY = boxY + 4;
        const badgeW = 45;
        const badgeH = 10;

        if (lead.priority === "High") {
          doc.setFillColor(254, 226, 226);
          doc.setDrawColor(252, 165, 165);
          doc.rect(badgeX, badgeY, badgeW, badgeH, "DF");
          doc.setTextColor(185, 28, 28);
        } else if (lead.priority === "Medium") {
          doc.setFillColor(254, 243, 199);
          doc.setDrawColor(253, 230, 138);
          doc.rect(badgeX, badgeY, badgeW, badgeH, "DF");
          doc.setTextColor(180, 83, 9);
        } else {
          doc.setFillColor(204, 251, 241);
          doc.setDrawColor(153, 246, 228);
          doc.rect(badgeX, badgeY, badgeW, badgeH, "DF");
          doc.setTextColor(15, 118, 110);
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(`AUDIT SCORE: ${lead.leadScore}`, badgeX + 5, badgeY + 6.5);

        // --- COMPARTMENT 2: CONTACT FOOTPRINT (Left column) ---
        doc.setDrawColor(241, 245, 249);
        doc.line(boxX + 5, boxY + 18, boxX + 115, boxY + 18);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Local Footprint & Direct Contacts:", boxX + 5, boxY + 22.5);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        doc.text(`• City Area: ${lead.city}`, boxX + 7, boxY + 27);
        const tempPhone = lead.phone || "";
        const stripped = tempPhone.replace(/[^0-9]/g, "");
        const isMobile = 
          stripped.startsWith("06") || 
          stripped.startsWith("07") || 
          stripped.startsWith("2126") || 
          stripped.startsWith("2127") ||
          (stripped.length === 9 && (stripped.startsWith("6") || stripped.startsWith("7")));
        doc.text(`• ${isMobile ? "WhatsApp" : "Landline"}: ${lead.phone}`, boxX + 7, boxY + 31);
        
        if (lead.website) {
          doc.setTextColor(13, 148, 136); // Teal
          const compactUrl = lead.website.replace("https://", "").replace("http://", "").split("/")[0];
          doc.text(`• Web landing: ${compactUrl}`, boxX + 7, boxY + 35);
        } else {
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(220, 38, 38); // Red
          doc.text("• Web landing: MISSING PRIMARY DOMAIN (Vulnerability)", boxX + 7, boxY + 35);
        }

        // --- COMPARTMENT 3: REVIEWS & NOTES VULNERABILITY (Right column) ---
        const nColX = boxX + 120;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Vulnerability Diagnostics:", nColX, boxY + 18.5);

        doc.setFont("Helvetica", "italic");
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        const autoText = lead.notes || "No custom intelligence notes. Low organic traffic combined with poorly structured metadata renders this site highly vulnerable to competitors.";
        const noteLines = doc.splitTextToSize(autoText, 55);
        doc.text(noteLines, nColX, boxY + 22.5);

        // --- COMPARTMENT 4: OPPORTUNITY TAGS CONTAINER ---
        const optY = boxY + 38.5;
        const optH = 8.5;

        // Container filled background
        doc.setFillColor(240, 253, 250); // Teal-50
        doc.setDrawColor(204, 251, 241); // Teal-200 border
        doc.rect(boxX + 3, optY, boxW - 6, optH, "DF");

        // Green stripe accent
        doc.setFillColor(20, 184, 166);
        doc.rect(boxX + 3, optY, 1, optH, "F");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(13, 148, 136); // Teal-700
        const tagStr = lead.opportunityTags.join("   |   ");
        doc.text(`SALES GROWTH OPPORTUNITIES:  ${tagStr}`, boxX + 6, optY + 5.5);

        // Move to next card location
        startY += boxH + 4;
        leadsPerPageNum += 1;
      });
    }

    // Wrap-up pages with running heads & footers
    const finalPageCount = doc.getNumberOfPages();
    for (let i = 1; i <= finalPageCount; i++) {
      doc.setPage(i);
      drawPageHeaderAndFooter(i, finalPageCount);
    }

    const reportSlug = selectedCity.toLowerCase().replace(/\s+/g, "_");
    doc.save(`al_mada_b2b_opportunities_report_${reportSlug}_2026.pdf`);
  };


  return (
    <div dir={uiLang === "ar" ? "rtl" : "ltr"} className={`min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950 overflow-x-hidden ${uiLang === "ar" ? "text-right" : "text-left"}`}>
      
      {uiLang === "ar" && (
        <style dangerouslySetInnerHTML={{ __html: `
          body, select, input, textarea, button, p, span, h1, h2, h3, h4, h5, h6 {
            font-family: 'Segoe UI', 'Tajawal', 'Cairo', system-ui, -apple-system, sans-serif !important;
          }
        `}} />
      )}

      {/* Decorative Radial Aurora */}
      <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-teal-500/10 rounded-full filter blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] left-[-150px] w-[500px] h-[550px] bg-sky-500/5 rounded-full filter blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-[-100px] w-[450px] h-[450px] bg-emerald-500/5 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="flex h-screen overflow-hidden relative">
        
        {/* ================= RESIZE BACKDROP OVERLAY FOR MOBILE VIEW ================= */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* ================= LEFT SIDEBAR ================= */}
        <aside className={`fixed md:relative top-0 bottom-0 ${uiLang === "ar" ? "right-0 border-l border-slate-800" : "left-0 border-r border-slate-800"} w-64 bg-slate-900 flex flex-col shrink-0 h-screen transition-transform duration-300 z-50 md:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : (uiLang === "ar" ? "translate-x-full md:translate-x-0" : "-translate-x-full md:translate-x-0")
        }`}>
          
          {/* Logo Brand Header & Close Button for Mobile */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Compass className="h-5 w-5 text-slate-900" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-wider text-white uppercase">{t.brandName}</h1>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest text-[9px] uppercase">{t.brandSubtitle}</p>
              </div>
            </div>

            {/* Mobile close menu */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white transition-all focus:outline-none"
              title="Close Menu"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* LANGUAGE SELECTION TOGGLE */}
          <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-950/40">
            <div className="flex items-center justify-between gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
              <button 
                onClick={() => {
                  setUiLang("en");
                  safeSetItem("mor_ui_lang", "en");
                }}
                className={`flex-1 text-center py-1 rounded font-bold transition-all ${
                  uiLang === "en" 
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/10 font-bold" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                English
              </button>
              <button 
                onClick={() => {
                  setUiLang("ar");
                  safeSetItem("mor_ui_lang", "ar");
                }}
                className={`flex-1 text-center py-1 rounded font-bold transition-all ${
                  uiLang === "ar" 
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/10 font-bold" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                العربية
              </button>
            </div>
          </div>
          
          {/* Country Badge */}
          <div className="px-6 py-4 border-b border-slate-800/60">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-sm">🇲🇦</span>
              <div className="text-[10px]">
                <span className="text-slate-300 font-medium block">{t.territory}</span>
                <span className="text-slate-500 font-mono">{t.verifiedPlaces}</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            <button
              onClick={() => {
                setActiveTab("leads");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl rtl:text-right ltr:text-left text-xs font-semibold transition-all ${
                activeTab === "leads"
                  ? `bg-gradient-to-r from-teal-500/15 to-emerald-500/5 text-teal-400 ${uiLang === "ar" ? "border-r-2 border-teal-400" : "border-l-2 border-teal-400"}`
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Layers className="h-4 w-4 shrink-0" />
              <span>{t.tabLeads}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("scraper");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl rtl:text-right ltr:text-left text-xs font-semibold transition-all ${
                activeTab === "scraper"
                  ? `bg-gradient-to-r from-teal-500/15 to-emerald-500/5 text-teal-400 ${uiLang === "ar" ? "border-r-2 border-teal-400" : "border-l-2 border-teal-400"}`
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
              id="scraper-tab-btn"
            >
              <Compass className="h-4 w-4 shrink-0" />
              <span>{t.tabScraper}</span>
            </button>
          </nav>

          {/* Quick Stats sidebar footer */}
          <div className="p-4 m-4 bg-slate-950 rounded-xl border border-slate-800 text-[10px] space-y-2">
            <div className="flex justify-between text-slate-400 gap-1">
              <span>{t.dbSize}</span>
              <span className="text-white font-mono">{leads.length} {t.leadsVal}</span>
            </div>
            <div className="flex justify-between text-slate-400 gap-1">
              <span>{t.highPriorityLabel}</span>
              <span className="text-red-400 font-mono">{stats.high}</span>
            </div>
            <div className="flex justify-between text-slate-400 gap-1">
              <span>{t.verifiedNoWeb}</span>
              <span className="text-teal-400 font-mono">{stats.missingWeb}</span>
            </div>
          </div>
        </aside>

        {/* ================= MAIN DISPLAY CANVAS ================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
          
          {/* Top Bar Navigation Info */}
          <header className="h-[70px] bg-slate-900/60 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 md:px-8 shrink-0 gap-3">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              
              {/* Hamburger Toggle Trigger for Mobile Devices */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden flex items-center justify-center text-slate-300 hover:text-white p-2 bg-slate-800/50 border border-slate-700/60 rounded-xl transition-all focus:outline-none shrink-0"
                title="Open Navigation Menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <h2 className="text-xs md:text-sm font-bold text-slate-200 truncate">
                {activeTab === "leads" && t.headerLeads}
                {activeTab === "scraper" && t.headerScraper}
              </h2>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <div className="text-xs text-slate-400 items-center gap-1 hidden sm:flex truncate">
                <MapPin className="h-3 w-3 text-red-500" />
                <span className="truncate">{t.territoryScope}</span>
              </div>
            </div>

            {/* Quick action buttons, refresh */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <button
                onClick={() => {
                  const restored = generateMoreMoroccoLeads();
                  setLeads(restored);
                  safeSetItem("morocco_saas_leads", JSON.stringify(restored));
                  setAiOutreachMap({});
                }}
                className="bg-slate-800 hover:bg-slate-700/80 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors"
                title="Reset local database storage"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{t.resetDatabase}</span>
              </button>
            </div>
          </header>

          {/* Core Layout tabs details */}
          <div className="flex-1 p-4 md:p-8 space-y-4 md:space-y-6 max-w-[1500px] w-full mx-auto">
            
            {/* Top SaaS KPI Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              
              <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">{t.kpiTotalLeads}</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">{stats.total}</span>
                </div>
                <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">🚨 {t.kpiHighPriority}</span>
                  <span className="text-xl font-bold font-mono text-red-400 mt-1 block">{stats.high}</span>
                </div>
                <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                  <Zap className="h-4.5 w-4.5 animate-pulse" />
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">{t.kpiNoWebsite}</span>
                  <span className="text-xl font-bold font-mono text-teal-300 mt-1 block">{stats.missingWeb}</span>
                </div>
                <div className="h-8 w-8 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center">
                  <Globe className="h-4.5 w-4.5" />
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">{t.kpiAppOpp}</span>
                  <span className="text-xl font-bold font-mono text-sky-400 mt-1 block">{stats.appOpp}</span>
                </div>
                <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Compass className="h-4.5 w-4.5" />
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">{t.kpiWebOpp}</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">{stats.seoOpp}</span>
                </div>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
              </div>

            </div>

            {/* City Scanner status overlay */}
            {scanProgress.active && (
              <div className="bg-gradient-to-r from-teal-900/40 via-slate-900/85 to-indigo-950/40 border border-teal-500/30 rounded-xl p-4 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="animate-spin text-teal-400 h-5 w-5 border-2 border-t-transparent border-teal-400 rounded-full shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {t.scanningActive}
                    </h4>
                    <p className="text-[11px] text-teal-300 font-mono mt-0.5">
                      {uiLang === "ar" 
                        ? `جاري استخراج بيانات القطاعات في ${CITIES_TRANSLATIONS[scanProgress.city]?.ar || scanProgress.city}. تم العثور على ${scanProgress.foundCount} شركات.` 
                        : `Extracting Places data for ${CITIES_TRANSLATIONS[scanProgress.city]?.en || scanProgress.city} Moroccan sectors. Found ${scanProgress.foundCount} prospects.`
                      }
                    </p>
                  </div>
                </div>
                
                {/* Visual Progress percentage */}
                <div className="flex items-center gap-4 w-1/3">
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-teal-400 to-sky-400 h-full transition-all duration-150" 
                      style={{ width: `${scanProgress.percent}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-teal-400 font-bold">{scanProgress.percent}%</span>
                </div>
              </div>
            )}

            {/* ================= TAB 1: LEADS SAAS GRID ================= */}
            {activeTab === "leads" && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* 1. Filtering & Lead Feed list (xl:col-span-7) */}
                <div className="xl:col-span-7 space-y-4">
                  
                  {/* Lead Filters Panel */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                    
                    {/* Search & Location Scanner */}
                    <div className="flex flex-col md:flex-row gap-3">
                      
                      {/* Text Search */}
                      <div className="relative flex-1">
                        <span className={`absolute inset-y-0 ${uiLang === "ar" ? "right-0 pr-3" : "left-0 pl-3"} flex items-center text-slate-500`}>
                          <Search className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t.searchPlaceholder}
                          className={`w-full bg-slate-950 border border-slate-800 rounded-xl py-2 ${uiLang === "ar" ? "pr-9 pl-3" : "pl-9 pr-3"} text-xs text-white focus:outline-none focus:border-teal-500`}
                        />
                      </div>

                      {/* City Scan Action Button */}
                      <div className="flex items-center gap-2">
                        <select
                          value={lastScannedCity}
                          onChange={(e) => {
                            setLastScannedCity(e.target.value);
                            if (e.target.value) {
                              startMoroccoCityScan(e.target.value);
                            }
                          }}
                          className="bg-slate-950 border border-slate-800 text-xs rounded-xl py-2 px-3 focus:outline-none text-slate-300 focus:border-teal-500 font-medium"
                        >
                          <option value="">{uiLang === "ar" ? "⚡ تشغيل مسح Playwright..." : "⚡ Trigger City Scan..."}</option>
                          {ALL_MOROCCO_CITIES.map(c => (
                            <option key={c} value={c}>{uiLang === "ar" ? (CITIES_TRANSLATIONS[c]?.ar || c) : (CITIES_TRANSLATIONS[c]?.en || c)}</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    {/* Detailed Dropdowns filters */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-800/80">
                      
                      {/* City select */}
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{t.cityLabel}</label>
                        <select
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:border-teal-500"
                        >
                          <option value="All">{uiLang === "ar" ? "عموم المغرب" : "All Morocco"} ({leads.length})</option>
                          <optgroup label={uiLang === "ar" ? "الحواضر الكبرى" : "Major Metros"}>
                            {MOROCCO_CITIES_MAJOR.map(c => (
                              <option key={c} value={c}>{uiLang === "ar" ? (CITIES_TRANSLATIONS[c]?.ar || c) : (CITIES_TRANSLATIONS[c]?.en || c)}</option>
                            ))}
                          </optgroup>
                          <optgroup label={uiLang === "ar" ? "الأقاليم الجنوبية" : "Southern Territories"}>
                            {MOROCCO_CITIES_SOUTH.map(c => (
                              <option key={c} value={c}>{uiLang === "ar" ? (CITIES_TRANSLATIONS[c]?.ar || c) : (CITIES_TRANSLATIONS[c]?.en || c)}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Sector niche */}
                      <div className="relative">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{t.industryLabel}</label>
                        <button
                          type="button"
                          onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:border-teal-500 flex items-center justify-between gap-1 rtl:text-right ltr:text-left"
                        >
                          <span className="truncate">
                            {selectedSectors.includes("All") || selectedSectors.length === 0
                              ? (uiLang === "ar" ? "جميع القطاعات" : "All Sectors")
                              : selectedSectors.length === 1
                                ? (uiLang === "ar" ? (SECTOR_TRANSLATIONS[selectedSectors[0]]?.ar || selectedSectors[0]) : (SECTOR_TRANSLATIONS[selectedSectors[0]]?.en || selectedSectors[0]))
                                : uiLang === "ar" 
                                  ? `${selectedSectors.length} قطاعات` 
                                  : `${selectedSectors.length} Sectors`}
                          </span>
                          <span className="text-slate-500 text-[9px] shrink-0">▼</span>
                        </button>

                        {isSectorDropdownOpen && (
                          <>
                            {/* Overlay to close the dropdown on clicking outside */}
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setIsSectorDropdownOpen(false)}
                            />
                            
                            <div className="absolute right-0 left-0 mt-1 max-h-56 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-1.5 shadow-xl z-20 space-y-1">
                              {/* All Sectors Option */}
                              <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-900 rounded cursor-pointer text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={selectedSectors.includes("All")}
                                  onChange={() => {
                                    if (selectedSectors.includes("All")) {
                                      // Defaulting to "All" if unchecked
                                      setSelectedSectors([]);
                                    } else {
                                      setSelectedSectors(["All"]);
                                    }
                                  }}
                                  className="rounded border-slate-800 text-teal-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 h-3.5 w-3.5 shrink-0"
                                />
                                <span className="truncate font-medium text-slate-200">{uiLang === "ar" ? "جميع القطاعات" : "All Sectors"}</span>
                              </label>

                              {TARGET_SECTORS.map(sec => {
                                const isChecked = selectedSectors.includes(sec);
                                return (
                                  <label key={sec} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-900 rounded cursor-pointer text-xs text-slate-300">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        let next: string[];
                                        if (isChecked) {
                                          next = selectedSectors.filter(s => s !== sec);
                                        } else {
                                          next = [...selectedSectors.filter(s => s !== "All"), sec];
                                        }
                                        if (next.length === 0) {
                                          next = ["All"];
                                        }
                                        setSelectedSectors(next);
                                      }}
                                      className="rounded border-slate-800 text-teal-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 h-3.5 w-3.5 shrink-0"
                                    />
                                    <span className="truncate font-light text-slate-300">
                                      {uiLang === "ar" ? (SECTOR_TRANSLATIONS[sec]?.ar || sec) : (SECTOR_TRANSLATIONS[sec]?.en || sec)}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Priority Selector */}
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{t.priorityLabel}</label>
                        <select
                          value={filterPriority}
                          onChange={(e) => setFilterPriority(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:border-teal-500"
                        >
                          <option value="All">{uiLang === "ar" ? "جميع الأولويات" : "All Priorities"}</option>
                          <option value="High">{uiLang === "ar" ? "🔴 أولوية قصوى فقط" : "🔴 High Priority Only"}</option>
                          <option value="Medium">{uiLang === "ar" ? "🟡 أولوية متوسطة فقط" : "🟡 Medium Priority Only"}</option>
                          <option value="Low">{uiLang === "ar" ? "🔵 أولوية منخفضة فقط" : "🔵 Low Priority Only"}</option>
                        </select>
                      </div>

                      {/* Opportunity Select Tags */}
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{t.oppFilterLabel}</label>
                        <select
                          value={filterOpportunity}
                          onChange={(e) => setFilterOpportunity(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:border-teal-500"
                        >
                          <option value="All">{uiLang === "ar" ? "جميع الفرص" : "All Opportunities"}</option>
                          <option value="Website Opportunity">{uiLang === "ar" ? "فرص المواقع الإلكترونية" : "Website Creation"}</option>
                          <option value="Mobile App Opportunity">{uiLang === "ar" ? "فرص تطبيقات الجوال" : "Mobile App Expansion"}</option>
                          <option value="SEO Growth Opportunity">{uiLang === "ar" ? "فرص تحسين محركات البحث SEO" : "SEO / Ranking Deficiency"}</option>
                          <option value="Reputation Management Opportunity">{uiLang === "ar" ? "فرص السمعة والمراجعات" : "Reputation Rescue"}</option>
                        </select>
                      </div>

                      {/* Sort By Dropdown */}
                      <div>
                        <label className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block mb-1">
                          {uiLang === "ar" ? "ترتيب حسب" : "Sort By"}
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as "score" | "rating" | "name")}
                          className="w-full bg-slate-950 border border-teal-500/30 text-slate-200 text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:border-teal-500 font-medium"
                        >
                          <option value="score">{uiLang === "ar" ? "📊 النقاط (من الأعلى للأقل)" : "📊 Score (High to Low)"}</option>
                          <option value="rating">{uiLang === "ar" ? "⭐ التقييم" : "⭐ Rating"}</option>
                          <option value="name">{uiLang === "ar" ? "🔤 الاسم" : "🔤 Name"}</option>
                        </select>
                      </div>

                    </div>

                    {/* Quality slider */}
                    <div className="flex items-center justify-between gap-6 pt-3 border-t border-slate-800/50">
                      <div className="flex-1">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>{t.minAudScore}</span>
                          <span className="font-mono text-teal-400 font-bold">{minLeadScore} / 100</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={minLeadScore}
                          onChange={(e) => setMinLeadScore(Number(e.target.value))}
                          className="w-full select-teal h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                        />
                      </div>
                      
                      {/* Active Reset trigger */}
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCity("All");
                          setSelectedSectors(["All"]);
                          setMinLeadScore(0);
                          setFilterPriority("All");
                          setFilterOpportunity("All");
                          setSortBy("score");
                        }}
                        className="text-xs text-slate-400 hover:text-white shrink-0 block mt-3"
                      >
                        {uiLang === "ar" ? "مسح التصفية" : "Clear Filters"}
                      </button>
                    </div>

                  </div>

                  {/* Action row for Onboard Custom lead */}
                  <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800 shadow-md">
                    <span className="text-[11px] text-slate-400">
                      {uiLang === "ar" ? "هل تريد تدقيق شركة مغربية مخصصة؟ أضفها يدوياً للتدقيق والتحليل الذكي:" : "Want to audit a specific Moroccan business? Add them manually:"}
                    </span>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      id="toggle-audit-form-btn"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{showAddForm ? (uiLang === "ar" ? "إغلاق النموذج" : "Close Form") : (uiLang === "ar" ? "تدقيق شركة جديدة" : "Audit Custom Lead")}</span>
                    </button>
                  </div>

                  {showAddForm && (
                    <form onSubmit={handleAddNewLead} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-xl">
                      <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                            <Plus className="h-4 w-4" /> {t.addNewLeadTitle}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {uiLang === "ar" ? "يقوم النظام بحساب نقطة ضعف التواجد وصياغة نصوص ترويجية مخصصة فوراً." : "Calculates lead scores and formats target copywriting immediately."}
                          </p>
                        </div>
                        <span className="text-sm">🇲🇦</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">{t.leadNameLabel} *</label>
                          <input
                            type="text"
                            required
                            value={newLeadName}
                            onChange={(e) => setNewLeadName(e.target.value)}
                            placeholder={uiLang === "ar" ? "مثال: عيادة الأسنان حي الرياض" : "e.g. Cabinet Dentaire Hay Riad"}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">{t.industryLabel} *</label>
                          <select
                            value={newLeadSector}
                            onChange={(e) => setNewLeadSector(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 text-xs focus:outline-none focus:border-teal-500 font-medium"
                          >
                            {TARGET_SECTORS.map(sec => (
                              <option key={sec} value={sec}>{uiLang === "ar" ? (SECTOR_TRANSLATIONS[sec]?.ar || sec) : (SECTOR_TRANSLATIONS[sec]?.en || sec)}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3.5 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">{t.cityLabel} *</label>
                          <select
                            value={newLeadCity}
                            onChange={(e) => setNewLeadCity(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 text-xs focus:outline-none focus:border-teal-500 font-medium"
                          >
                            {ALL_MOROCCO_CITIES.map(c => (
                              <option key={c} value={c}>{uiLang === "ar" ? (CITIES_TRANSLATIONS[c]?.ar || c) : (CITIES_TRANSLATIONS[c]?.en || c)}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">Website</label>
                          <input
                            type="text"
                            value={newLeadWebsite}
                            onChange={(e) => setNewLeadWebsite(e.target.value)}
                            placeholder="clinicriad.ma"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">{t.phoneLabel}</label>
                          <input
                            type="text"
                            value={newLeadPhone}
                            onChange={(e) => setNewLeadPhone(e.target.value)}
                            placeholder="+212 522-899889"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">{t.ratingLabel}</label>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max="5"
                            value={newLeadRating}
                            onChange={(e) => setNewLeadRating(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">{t.reviewsLabel}</label>
                          <input
                            type="number"
                            min="0"
                            value={newLeadReviews}
                            onChange={(e) => setNewLeadReviews(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>

                      <div className="text-xs">
                        <label className="block text-slate-400 mb-1">{t.notesLabel}</label>
                        <textarea
                          rows={2}
                          value={newLeadNotes}
                          onChange={(e) => setNewLeadNotes(e.target.value)}
                          placeholder={uiLang === "ar" ? "مثال: الموقع لا يعمل بشكل صحيح على الهواتف الذكية" : "e.g. Broken links on smartphones..."}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="px-3.5 py-1.5 text-xs rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white"
                        >
                          {t.cancelBtn}
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs rounded-xl bg-teal-400 hover:bg-teal-500 text-slate-950 font-bold"
                          id="submit-customer-onboard"
                        >
                          {t.submitBtn}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Leads Table Card */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    
                    <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40">
                      <div className="text-xs text-slate-400">
                        {uiLang === "ar" ? (
                          <span>يعرض <strong className="text-white font-mono">{filteredLeads.length}</strong> سجل تدقيق لشركات ذات فجوات تقنية</span>
                        ) : (
                          <span>Showing <strong className="text-white font-mono">{filteredLeads.length}</strong> Moroccan lead intelligence audits</span>
                        )}
                      </div>

                      {/* Potential duplicates interactive toggle */}
                      {duplicateLeadsMap.size > 0 && (
                        <button
                          onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                            showDuplicatesOnly
                              ? "bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/50"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                          }`}
                        >
                          <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span>
                            {uiLang === "ar"
                              ? `${duplicateLeadsMap.size} مكررات محتملة`
                              : `${duplicateLeadsMap.size} Potential Duplicates`}
                          </span>
                          <span className="bg-slate-950 px-1.5 py-0.5 rounded-md text-[8px] text-slate-300">
                            {showDuplicatesOnly ? (uiLang === "ar" ? "يعرض المكرر فقط" : "Active") : (uiLang === "ar" ? "تصفية" : "Filter")}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="p-3.5 space-y-3.5 max-h-[700px] overflow-y-auto bg-slate-950/40">
                      {filteredLeads.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 text-xs">
                          {uiLang === "ar" ? "لم تطابق أي أعمال مرشحة خيارات التصفية المطلوبة. أعد ضبط التصفية أو تشغيل مسح مدينة جديدة." : "No local businesses matched these filters. Reset filters or scan fresh cities above."}
                        </div>
                      ) : (
                        filteredLeads.map((item) => {
                          const isSelected = item.id === selectedLeadId;
                          const hasWeb = !!item.website;
                          const dupInfo = duplicateLeadsMap.get(item.id);
                          
                          return (
                            <div 
                              key={item.id}
                              onClick={() => {
                                setSelectedLeadId(item.id);
                                generateOutreachWithAI(item);
                              }}
                              className={`flex flex-col gap-3 rounded-xl border p-4 transition-all duration-250 cursor-pointer relative ${
                                isSelected 
                                  ? "bg-slate-900 border-teal-500/80 ring-1 ring-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.06)]" 
                                  : dupInfo
                                    ? "bg-slate-900/80 border-amber-500/30 hover:border-amber-500/50 hover:bg-slate-900/95 shadow-[0_0_10px_rgba(245,158,11,0.02)]"
                                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                              }`}
                            >
                              {/* Potential duplicate visual warning banner */}
                              {dupInfo && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-bold"
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                    <span className="truncate">
                                      {uiLang === "ar"
                                        ? `مكرر محتمل لـ: ${dupInfo.otherName}`
                                        : `Potential duplicate: ${dupInfo.otherName}`}
                                    </span>
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(uiLang === "ar" ? `هل تريد حذف هذا السجل المكرر لـ ${item.name}؟` : `Are you sure you want to remove the duplicate lead "${item.name}"?`)) {
                                        removeLeadRecord(item.id);
                                      }
                                    }}
                                    className="p-1 rounded hover:bg-amber-500/20 text-amber-300 transition-colors shrink-0"
                                    title={uiLang === "ar" ? "حذف السجل المكرر" : "Clean Duplicate Lead"}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-amber-400" />
                                  </button>
                                </div>
                              )}

                              {/* Compartment 1: Header Identity */}
                              <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-800/60">
                                <div className="min-w-0">
                                  {/* Sector category and rating tags */}
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                                    <span className="bg-slate-950 font-mono text-slate-300 px-2 py-0.5 rounded border border-slate-850">
                                      {uiLang === "ar" ? (SECTOR_TRANSLATIONS[item.sector]?.ar || item.sector) : (SECTOR_TRANSLATIONS[item.sector]?.en || item.sector)}
                                    </span>
                                    {item.rating ? (
                                      <span className="flex items-center gap-0.5 text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10">
                                        ★ {item.rating} ({item.reviewsCount || 0})
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 italic bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">
                                        {uiLang === "ar" ? "لا توجد مراجعات" : "no reviews"}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-extrabold text-xs text-white leading-tight mt-1.5 tracking-tight">
                                    {item.name}
                                  </h4>
                                </div>

                                {/* Large Numerical Score */}
                                <div className={`h-10 w-10 shrink-0 rounded-lg flex flex-col items-center justify-center border font-mono ${
                                  item.priority === "High" 
                                    ? "bg-red-500/10 border-red-500/30 text-red-400" 
                                    : item.priority === "Medium"
                                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                      : "bg-teal-500/10 border-teal-500/20 text-teal-400"
                                }`}>
                                  <span className="text-xs font-black leading-none">{item.leadScore}</span>
                                  <span className="text-[7px] uppercase mt-0.5 tracking-wider font-bold">
                                    {uiLang === "ar" ? "درجة" : "score"}
                                  </span>
                                </div>
                              </div>

                              {/* Compartment 2: Contact Footprints and Local Location Info */}
                              <div className="bg-slate-950/85 rounded-lg p-3 border border-slate-850 space-y-2 text-[11px] text-slate-300">
                                
                                {/* City Zone mapping and tag */}
                                <div className="flex items-center gap-2 justify-between min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                    <span className="font-semibold text-slate-200 truncate">
                                      {uiLang === "ar" ? (CITIES_TRANSLATIONS[item.city]?.ar || item.city) : (CITIES_TRANSLATIONS[item.city]?.en || item.city)}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 truncate">{item.address.split(",")[0]}</span>
                                </div>

                                {/* Hot-line phone details */}
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const tempPhone = item.phone || "";
                                    const stripped = tempPhone.replace(/[^0-9]/g, "");
                                    const isMobile = 
                                      stripped.startsWith("06") || 
                                      stripped.startsWith("07") || 
                                      stripped.startsWith("2126") || 
                                      stripped.startsWith("2127") ||
                                      (stripped.length === 9 && (stripped.startsWith("6") || stripped.startsWith("7")));
                                    return isMobile ? (
                                      <>
                                        <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                        <span className="font-mono text-emerald-300 font-medium tracking-wide">
                                          {uiLang === "ar" ? "واتساب" : "WhatsApp"}: {item.phone}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="font-mono text-slate-300">
                                          {uiLang === "ar" ? "الهاتف الأرضي" : "Landline"}: {item.phone}
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Landing page channels */}
                                <div className="flex items-center gap-2 justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Globe className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                                    {hasWeb ? (
                                      <a 
                                        href={item.website!} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-teal-400 hover:underline truncate font-mono text-[10.5px]"
                                      >
                                        {item.website!.replace("https://", "").replace("http://", "").split("/")[0]}
                                      </a>
                                    ) : (
                                      <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/10 font-bold text-[9px] uppercase tracking-wider">
                                        {uiLang === "ar" ? "الموقع غير متوفر" : "No Website Found"}
                                      </span>
                                    )}
                                  </div>

                                  {item.claimed && (
                                    <span className="bg-emerald-500/15 text-emerald-300 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest shrink-0">
                                      {uiLang === "ar" ? "حُجز" : "Claimed"}
                                    </span>
                                  )}
                                </div>

                              </div>

                              {/* Compartment 3: Strategic Weakness Categories and Leads Opportunity Tags */}
                              <div className={`bg-slate-950/75 border border-slate-800/80 p-3 shadow-inner space-y-2 mt-1 ${
                                uiLang === "ar" ? "border-r-2 border-r-teal-500 rounded-l-xl" : "border-l-2 border-l-teal-500 rounded-r-xl"
                              }`}>
                                <div className="text-[10px] text-teal-400 font-extrabold uppercase tracking-wider flex items-center justify-between select-none">
                                  <span className="flex items-center gap-1.5">
                                    <Sparkles className="h-3 w-3 text-teal-400 shrink-0" />
                                    {t.salesOppHead}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-mono">({item.opportunityTags.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.opportunityTags.map((tag, tIdx) => (
                                    <span 
                                      key={tIdx} 
                                      className={`text-[9px] px-2 py-0.5 rounded font-bold tracking-wide uppercase ${
                                        tag === "Website Opportunity"
                                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                                          : tag === "Mobile App Opportunity"
                                            ? "bg-sky-500/10 text-sky-400 border border-sky-400/15"
                                            : tag === "SEO Growth Opportunity"
                                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/15"
                                              : "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                                      }`}
                                    >
                                      {tag === "Website Opportunity" 
                                        ? (uiLang === "ar" ? "تصميم وبرمجة موقع" : "Website Creation")
                                        : tag === "Mobile App Opportunity"
                                          ? (uiLang === "ar" ? "تطوير تطبيق جوال" : "Mobile App Expansion")
                                          : tag === "SEO Growth Opportunity"
                                            ? (uiLang === "ar" ? "تحسين محركات البحث SEO" : "SEO Ranking")
                                            : (uiLang === "ar" ? "إصلاح السمعة والمراجعات" : "Reputation Rescue")
                                      }
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Compartment 4: Quick Interactive Action Bar */}
                              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLeadClaimedStatus(item.id);
                                  }}
                                  className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 transition-all ${
                                    item.claimed 
                                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
                                      : "bg-slate-950 border-slate-855 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  <span>{item.claimed ? (uiLang === "ar" ? "تم حجز العميل" : "Claimed") : (uiLang === "ar" ? "حجز العميل" : "Claim Prospect")}</span>
                                </button>

                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={item.googleMapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 px-2.5 rounded-lg bg-slate-950 border border-slate-855 hover:border-slate-800 text-slate-400 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                                  >
                                    <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                                    <span>{uiLang === "ar" ? "الخرائط" : "GPS"}</span>
                                  </a>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerCopyNotice(`feed_phone_${item.id}`, item.phone);
                                    }}
                                    className="p-1 px-2.5 rounded-lg bg-slate-950 border border-slate-855 hover:border-slate-800 text-slate-400 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                                  >
                                    <Copy className="h-3 w-3 text-teal-400 shrink-0" />
                                    <span>{copiedField === `feed_phone_${item.id}` ? (uiLang === "ar" ? "تم نسخ الهاتف" : "Copied") : (uiLang === "ar" ? "نسخ الهاتف" : "Copy Tel")}</span>
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

                {/* 2. Interactive Lead Detail Panel & B2B Outreach Copy generator (xl:col-span-12 or 5) */}
                <div className="xl:col-span-5">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl sticky top-4">
                    
                    {currentLead ? (
                      <>
                        {/* Lead header info & actions */}
                        <div className="border-b border-slate-800 pb-5 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="text-[10px] font-mono tracking-widest text-[#00d2c4] uppercase font-bold">
                                {uiLang === "ar" ? "تفاصيل التشخيص والتحليل الذكي" : "Local Intel Diagnostics"}
                              </span>
                              <h3 className="text-base font-extrabold text-white mt-1 leading-snug">{currentLead.name}</h3>
                              <p className="text-xs text-slate-400 mt-1">{currentLead.address}</p>
                            </div>

                            {/* CRM claimed toggle indicator */}
                            <button
                              onClick={() => toggleLeadClaimedStatus(currentLead.id)}
                              className={`shrink-0 text-xs px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all ${
                                currentLead.claimed 
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" 
                                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                              }`}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>{currentLead.claimed ? (uiLang === "ar" ? "تم الحجز" : "Claimed") : (uiLang === "ar" ? "حجز" : "Claim")}</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2 text-xs">
                            <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850 text-slate-300 font-mono">
                              📍 {uiLang === "ar" ? (CITIES_TRANSLATIONS[currentLead.city]?.ar || currentLead.city) : (CITIES_TRANSLATIONS[currentLead.city]?.en || currentLead.city)} ({MOROCCO_CITIES_SOUTH.includes(currentLead.city) ? (uiLang === "ar" ? "الأقاليم الجنوبية" : "Southern Province") : (uiLang === "ar" ? "حواضر كبرى" : "Province Metropole")})
                            </span>
                            <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850 text-slate-300">
                              💼 {uiLang === "ar" ? (SECTOR_TRANSLATIONS[currentLead.sector]?.ar || currentLead.sector) : (SECTOR_TRANSLATIONS[currentLead.sector]?.en || currentLead.sector)}
                            </span>
                          </div>

                          {/* Action icons, quick web navigation */}
                          <div className="flex items-center gap-2 pt-1 text-xs">
                            {currentLead.website ? (
                              <a 
                                href={currentLead.website} 
                                target="_blank" 
                                rel="noreferrer"
                                className="bg-slate-950 hover:bg-slate-800 hover:text-teal-400 transition-colors px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 flex items-center gap-1.5"
                              >
                                <Globe className="h-3.5 w-3.5" />
                                <span>{uiLang === "ar" ? "زيارة الموقع" : "Visit Website"}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <div className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/10 flex items-center gap-1.5 font-semibold">
                                <Globe className="h-3.5 w-3.5 text-red-500" />
                                <span>{uiLang === "ar" ? "الموقع غير متوفر" : "No Website Found"}</span>
                              </div>
                            )}

                            <a 
                              href={currentLead.googleMapsUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="bg-slate-950 hover:bg-slate-800 hover:text-teal-400 transition-colors px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 flex items-center gap-1.5 ml-auto"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{uiLang === "ar" ? "خرائط Google" : "Google Maps URL"}</span>
                            </a>
                            
                            <button
                              onClick={() => removeLeadRecord(currentLead.id)}
                              className="text-slate-500 hover:text-rose-450 p-2 rounded-lg hover:bg-slate-850 transition-colors"
                              title={uiLang === "ar" ? "حذف هذا السجل نهائياً" : "Delete lead record"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Opportunity assessment metrics */}
                        <div className="space-y-3.5 bg-slate-950 p-4 rounded-xl border border-slate-850">
                          
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-semibold">{uiLang === "ar" ? "مستوى أولوية التدقيق" : "Audit Priority Rating"}</span>
                            <span className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[10px] ${
                              currentLead.priority === "High" 
                                ? "bg-red-500/15 text-red-400 border border-red-500/20" 
                                : currentLead.priority === "Medium"
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/15"
                                  : "bg-teal-500/15 text-teal-400 border border-teal-500/10"
                            }`}>
                              {currentLead.priority === "High" ? (uiLang === "ar" ? "قصوى" : "High") : currentLead.priority === "Medium" ? (uiLang === "ar" ? "متوسطة" : "Medium") : (uiLang === "ar" ? "منخفضة" : "Low")} ({currentLead.leadScore}/100)
                            </span>
                          </div>

                          <div className="text-xs space-y-1.5 text-slate-300 leading-relaxed border-t border-slate-900 pt-2.5">
                            <div className="flex justify-between items-center">
                              <div className="font-semibold text-slate-400 flex items-center gap-1">
                                <Info className="h-3.5 w-3.5 text-teal-400" /> {uiLang === "ar" ? "ملاحظات السمعة ونقاط الضعف" : "Lead Vulnerability Notes"}
                              </div>
                              {!isEditingNote ? (
                                <button
                                  onClick={() => setIsEditingNote(true)}
                                  className="text-[10px] text-teal-400 hover:underline focus:outline-none"
                                >
                                  {uiLang === "ar" ? "تعديل الملاحظات" : "Edit notes"}
                                </button>
                              ) : (
                                <button
                                  onClick={handleSaveNotes}
                                  className="text-[10px] text-emerald-400 hover:underline font-bold focus:outline-none"
                                >
                                  {uiLang === "ar" ? "حفظ الملاحظات" : "Save notes"}
                                </button>
                              )}
                            </div>
                            
                            {isEditingNote ? (
                              <textarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-[11px] focus:outline-none focus:border-teal-500 font-sans"
                              />
                            ) : (
                              <p className="text-[11px] text-slate-400">
                                {currentLead.notes || (uiLang === "ar" ? "تم رصد عقبات هيكلية حقيقية في سرعة الموقع بالتصفح على الجوال وعقبات الأرشفة المحلية الفورية، ننصح بالمبادرة بالتواصل مع الإدارة." : "This Moroccan local company possesses severe geographic ranking bottlenecks. Digital asset presence optimized for urgent agency intervention.")}
                              </p>
                            )}
                          </div>

                          {aiOutreachMap[currentLead.id]?.analysis && (
                            <div className="text-xs space-y-1.5 text-slate-300 leading-relaxed border-t border-slate-900 pt-2.5">
                              <div className="font-semibold text-teal-400 flex items-center justify-between gap-1 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="h-3.5 w-3.5" /> {aiOutreachMap[currentLead.id].is_fallback ? (uiLang === "ar" ? "مخطط التواصل (الوضع الفوري المدمج)" : "Campaign Blueprint (Heuristic Mode)") : (uiLang === "ar" ? "التحليل الذكي والفرص المقترحة من Gemini" : "Gemini Strategic Diagnosis")}
                                </span>
                                {aiOutreachMap[currentLead.id].is_fallback && (
                                  <span className="text-[9px] font-mono tracking-wider font-extrabold text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/30 uppercase select-none animate-pulse">
                                    {uiLang === "ar" ? "بديل آمن" : "Safe Fallback"}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-305 bg-teal-500/5 p-3 rounded-xl border border-teal-500/10">
                                {aiOutreachMap[currentLead.id].analysis}
                              </p>
                            </div>
                          )}

                          {/* Quick contact buttons */}
                          <div className="border-t border-slate-900 pt-3 flex items-center gap-4 text-xs font-mono">
                            <div className="flex-1">
                              {(() => {
                                const tempPhone = currentLead.phone || "";
                                const stripped = tempPhone.replace(/[^0-9]/g, "");
                                const isMobile = 
                                  stripped.startsWith("06") || 
                                  stripped.startsWith("07") || 
                                  stripped.startsWith("2126") || 
                                  stripped.startsWith("2127") ||
                                  (stripped.length === 9 && (stripped.startsWith("6") || stripped.startsWith("7")));
                                return (
                                  <>
                                    <span className="text-[10px] block text-slate-500 uppercase font-semibold">
                                      {uiLang === "ar" 
                                        ? (isMobile ? "رقم الواتساب الفعلي للتواصل" : "رقم الهاتف الأرضي للتواصل") 
                                        : (isMobile ? "Contact WhatsApp number" : "Contact Landline phone")}
                                    </span>
                                    <span className="text-white block mt-0.5">{currentLead.phone}</span>
                                  </>
                                );
                              })()}
                            </div>
                            
                            {/* Copy phone helper */}
                            <button
                              onClick={() => triggerCopyNotice("phone_num", currentLead.phone)}
                              className="px-2.5 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                            >
                              {copiedField === "phone_num" ? (uiLang === "ar" ? "تم نسخ الهاتف" : "Copied") : (uiLang === "ar" ? "نسخ" : "Copy")}
                            </button>
                          </div>

                        </div>

                        {/* 3. Outreach Copywriter Suite Tab */}
                        <div className="space-y-3.5">
                          
                          {/* Inner Tabs selectors */}
                          <div className="flex border-b border-slate-800 bg-slate-950/40 p-1 rounded-xl">
                            <button
                              onClick={() => setActiveOutreachMode("email")}
                              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                activeOutreachMode === "email"
                                  ? "bg-slate-800 text-teal-400 shadow-sm"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {uiLang === "ar" ? "بريد إلكتروني ترويجي" : "Email Pitch"}
                            </button>
                            <button
                              onClick={() => setActiveOutreachMode("whatsapp")}
                              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                activeOutreachMode === "whatsapp"
                                  ? "bg-slate-800 text-teal-400 shadow-sm"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {uiLang === "ar" ? "رسالة WhatsApp" : "WhatsApp Draft"}
                            </button>
                            <button
                              onClick={() => setActiveOutreachMode("followup")}
                              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                activeOutreachMode === "followup"
                                  ? "bg-slate-800 text-teal-400 shadow-sm"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {uiLang === "ar" ? "رسالة متابعة" : "Follow-Up (Day 3)"}
                            </button>
                          </div>

                          {/* Display state based on AI content availability */}
                          {generatingOutreachId === currentLead.id ? (
                            <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-850 space-y-3 min-h-[220px] flex flex-col items-center justify-center">
                              <div className="animate-spin h-6 w-6 border-2 border-t-transparent border-teal-400 rounded-full" />
                              <p className="text-xs text-slate-400">
                                {uiLang === "ar" ? "يقوم مستشار ذكاء المبيعات الذكي بصياغة وتفصيل نصوص ترويجية مخصصة للعميل..." : "Gemini Sales Advisor customizing localized conversion copy..."}
                              </p>
                            </div>
                          ) : aiOutreachMap[currentLead.id] ? (
                            <div className="space-y-3">
                              
                              {/* EMAIL TEMPLATE BODY */}
                              {activeOutreachMode === "email" && (
                                <div className="space-y-3.5">
                                  
                                  {/* Subject variations */}
                                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-semibold">
                                      <span>{uiLang === "ar" ? "عناوين البريد المقترحة:" : "Suggested Subject Lines:"}</span>
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => setEmailSubjectOption(1)} 
                                          className={`px-1.5 py-0.5 rounded ${emailSubjectOption === 1 ? "bg-teal-400 text-slate-950 font-bold" : "text-slate-400 hover:text-white bg-slate-900"}`}
                                        >
                                          v1
                                        </button>
                                        <button 
                                          onClick={() => setEmailSubjectOption(2)} 
                                          className={`px-1.5 py-0.5 rounded ${emailSubjectOption === 2 ? "bg-teal-400 text-slate-950 font-bold" : "text-slate-400 hover:text-white bg-slate-900"}`}
                                          id="v2-btn"
                                        >
                                          v2
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-teal-300 italic">
                                      {emailSubjectOption === 1 ? aiOutreachMap[currentLead.id].subject_1 : aiOutreachMap[currentLead.id].subject_2}
                                    </p>
                                  </div>

                                  {/* Email Box */}
                                  <div className="relative group bg-slate-950 p-4.5 rounded-lg border border-slate-850 text-[11px] text-slate-200 font-mono whitespace-pre-line leading-relaxed max-h-[270px] overflow-y-auto">
                                    {aiOutreachMap[currentLead.id].email_body}
                                  </div>

                                  {/* Copy actions */}
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const activeSub = emailSubjectOption === 1 ? aiOutreachMap[currentLead.id].subject_1 : aiOutreachMap[currentLead.id].subject_2;
                                        triggerCopyNotice("full_email", `Subject: ${activeSub}\n\n${aiOutreachMap[currentLead.id].email_body}`);
                                      }}
                                      className="flex-1 py-2 rounded-xl bg-teal-400 hover:bg-teal-500 font-bold text-slate-950 text-xs transition-colors flex items-center justify-center gap-1.5"
                                    >
                                      {copiedField === "full_email" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                      <span>
                                        {copiedField === "full_email" ? (uiLang === "ar" ? "تم نسخ البريد!" : "Copied Pitch!") : (uiLang === "ar" ? "نسخ تصميم البريد كاملاً" : "Copy Full Email Component")}
                                      </span>
                                    </button>

                                    {/* Direct Mailto */}
                                    <a
                                      href={`mailto:?subject=${encodeURIComponent(emailSubjectOption === 1 ? aiOutreachMap[currentLead.id].subject_1 : aiOutreachMap[currentLead.id].subject_2)}&body=${encodeURIComponent(aiOutreachMap[currentLead.id].email_body)}`}
                                      className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-3.5 py-2 rounded-xl border border-slate-700 flex items-center justify-center transition-colors"
                                      title="Open default client email sender"
                                    >
                                      <Send className="h-4 w-4" />
                                    </a>
                                  </div>

                                </div>
                              )}

                              {/* WHATSAPP OUTREACH */}
                              {activeOutreachMode === "whatsapp" && (
                                <div className="space-y-3">
                                  <div className="bg-[#0b141a] p-4.5 rounded-xl border border-slate-850 relative text-[11.5px]">
                                    <div className="bg-[#005c4b] text-white p-3 rounded-lg max-w-sm mr-auto rounded-tr-none relative ltr:text-left ltr:mr-auto rtl:text-right rtl:ml-auto rounded-tl-none font-sans leading-relaxed">
                                      <p className="whitespace-pre-wrap">{aiOutreachMap[currentLead.id].whatsapp_text}</p>
                                      <div className="text-right text-[8px] text-[#8696a0] mt-1">11:04 AM ✔✔</div>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => triggerCopyNotice("ws_msg", aiOutreachMap[currentLead.id].whatsapp_text)}
                                      className="flex-1 py-2 rounded-xl bg-[#005c4b] hover:bg-[#00755f] text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                                    >
                                      {copiedField === "ws_msg" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                      <span>
                                        {copiedField === "ws_msg" ? (uiLang === "ar" ? "تم نسخ الرسالة!" : "Copied Message!") : (uiLang === "ar" ? "نسخ وثيقة WhatsApp" : "Copy WhatsApp Text")}
                                      </span>
                                    </button>

                                    {/* Real trigger link helper */}
                                    <a
                                      href={`https://api.whatsapp.com/send?phone=${currentLead.phone.replace(/[^0-9+]/g, "")}&text=${encodeURIComponent(aiOutreachMap[currentLead.id].whatsapp_text)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="bg-green-650 hover:bg-green-600 bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center justify-center transition-all shadow-md gap-1"
                                      title="Open real chat with simulated phone"
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                      <span className="text-xs">{uiLang === "ar" ? "رابط إرسال" : "Quick Send"}</span>
                                    </a>
                                  </div>
                                </div>
                              )}

                              {/* FOLLOW-UP TEMPLATE */}
                              {activeOutreachMode === "followup" && (
                                <div className="space-y-3">
                                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-[11px] text-slate-200 font-mono whitespace-pre-line leading-relaxed max-h-[220px] overflow-y-auto">
                                    {aiOutreachMap[currentLead.id].follow_up_text}
                                  </div>

                                  <button
                                    onClick={() => triggerCopyNotice("fu_msg", aiOutreachMap[currentLead.id].follow_up_text)}
                                    className="w-full py-2 rounded-xl bg-teal-400 hover:bg-teal-500 font-bold text-slate-950 text-xs transition-colors flex items-center justify-center gap-1.5 animate-none"
                                  >
                                    {copiedField === "fu_msg" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                    <span>
                                      {copiedField === "fu_msg" ? (uiLang === "ar" ? "تم نسخ رسالة المتابعة!" : "Copied Follow-up!") : (uiLang === "ar" ? "نسخ رسالة المتابعة كاملة" : "Copy Follow-Up Message Copy")}
                                    </span>
                                  </button>
                                </div>
                              )}

                            </div>
                          ) : (
                            <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-850">
                              <button 
                                onClick={() => generateOutreachWithAI(currentLead)}
                                className="text-xs bg-teal-400 hover:bg-teal-500 px-4 py-2 text-slate-950 font-bold rounded-lg transition-colors"
                              >
                                {uiLang === "ar" ? "صياغة وتوليد نصوص تواصل مخصصة" : "Trigger Custom Copy generation"}
                              </button>
                            </div>
                          )}

                        </div>

                      </>
                    ) : (
                      <div className="text-center p-12 text-slate-500 text-xs">
                        {uiLang === "ar" ? "لم يتم تحديد أي شركة نشيطة للتدقيق والتحليل. عين إحدى الشركات من القائمة لعرض سيناريوهات التواصل." : "No active Moroccan lead selected. Select from the grid list left to view instant CRM pitches."}
                      </div>
                    )}

                  </div>
                </div>

              </div>
            )}

            {/* ================= TAB 2: MOROCCAN DIAGNOSTIC ANALYTICS ================= */}
            {activeTab === "analytics" && false && (
              <div className="space-y-6">
                
                 {/* Analytics intro row */}
                 <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
                   <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                     <div>
                       <h3 className="text-base font-extrabold text-white">
                         {uiLang === "ar" ? "خريطة الفرص والنمو الوطنية بالمملكة" : "National B2B Opportunity Footprint"}
                       </h3>
                       <p className="text-xs text-slate-400 mt-1 max-w-xl">
                         {uiLang === "ar" ? "نظرة عامة تفاعلية على مؤشرات وفرص الأعمال بالمغرب. تصفح المدن، حلل الأنواع والقطاعات، وتابع حجم المبيعات المتوقع." : "A dynamic overview of our lead analysis across Morocco. Identify high-ticket niches, model potential deal parameters, and calculate sales quotas."}
                       </p>
                     </div>
                     {/* Moroccan Flag icon */}
                     <div className="text-3xl select-none">🇲🇦</div>
                   </div>
                 </div>
 
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                   
                   {/* Left Column: Heatmap opportunity distribution map (lg:col-span-8) */}
                   <div className="lg:col-span-8 space-y-6">
                      
                      {/* Moroccan Regional Heatmap Visualizer Component */}
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                            <Compass className="h-4 w-4" /> {uiLang === "ar" ? "خريطة تمركز الفرص - الأقاليم والجهات المغربية" : "Map of B2B Hotspots - Moroccan Territories"}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {uiLang === "ar" ? "يتناسب توزيع النقاط مع نسبة غياب المواقع الإلكترونية" : "Color density matches missing website ratios"}
                          </span>
                        </div>

                        {/* Map Simulation representation */}
                        <div className="bg-slate-950 p-6 rounded-xl border border-slate-850 relative min-h-[340px] flex items-center justify-center overflow-hidden">
                          
                          {/* Map coordinate simulation grids */}
                          <div className="absolute inset-0 opacity-15 bg-grid-pattern pointer-events-none" />
                          
                          {/* Moroccan Atlantic & Mediterranean Shorelines representation */}
                          <div className="absolute left-[15%] top-[10%] opacity-5 hover:opacity-10 transition-opacity bg-teal-400/10 border-2 border-dashed border-teal-500 rounded-full w-[450px] h-[300px] transform rotate-[-45deg]" />
                     
                                            {/* Standard clickable cities on Morocco Map visual */}
                        <div className="relative w-full max-w-[500px] h-64 font-sans text-xs">
                          
                          {/* Tangier */}
                          <div 
                            onClick={() => { setSelectedCity("Tangier"); setActiveTab("leads"); }}
                            className="absolute top-[8%] left-[70%] group cursor-pointer flex items-center gap-2"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping absolute" />
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-slate-900 relative z-10" />
                            <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-300 group-hover:text-white transition-colors">
                              {uiLang === "ar" ? "طنجة ⚓" : "Tanger ⚓"}
                            </span>
                          </div>

                          {/* Rabat */}
                          <div 
                            onClick={() => { setSelectedCity("Rabat"); setActiveTab("leads"); }}
                            className="absolute top-[22%] left-[62%] group cursor-pointer flex items-center gap-2"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-slate-900 relative z-10" />
                            <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-300">
                              {uiLang === "ar" ? "الرباط 👑" : "Rabat 👑"}
                            </span>
                          </div>

                          {/* Casablanca */}
                          <div 
                            onClick={() => { setSelectedCity("Casablanca"); setActiveTab("leads"); }}
                            className="absolute top-[32%] left-[55%] group cursor-pointer flex items-center gap-2"
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-red-500/25 animate-ping absolute" />
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-slate-900 relative z-10" />
                            <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-teal-400 font-bold">
                              {uiLang === "ar" ? "الدار البيضاء 🌃" : "Casablanca 🌃"}
                            </span>
                          </div>

                          {/* Marrakesh */}
                          <div 
                            onClick={() => { setSelectedCity("Marrakesh"); setActiveTab("leads"); }}
                            className="absolute top-[48%] left-[45%] group cursor-pointer flex items-center gap-2"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900 relative z-10" />
                            <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-300">
                              {uiLang === "ar" ? "مراكش 🌴" : "Marrakech 🌴"}
                            </span>
                          </div>

                          {/* Agadir */}
                          <div 
                            onClick={() => { setSelectedCity("Agadir"); setActiveTab("leads"); }}
                            className="absolute top-[62%] left-[36%] group cursor-pointer flex items-center gap-2"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-slate-900 relative z-10" />
                            <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-300">
                              {uiLang === "ar" ? "أكادير 🌊" : "Agadir 🌊"}
                            </span>
                          </div>

                          {/* Guelmim */}
                          <div 
                            onClick={() => { setSelectedCity("Guelmim"); setActiveTab("leads"); }}
                            className="absolute top-[72%] left-[28%] group cursor-pointer flex items-center gap-2"
                          >
                            <span className="w-2 h-2 rounded-full bg-teal-500 border border-slate-900 relative z-10" />
                            <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[8px] text-slate-400">
                              {uiLang === "ar" ? "كلميم" : "Guelmim"}
                            </span>
                          </div>

                          {/* Laayoune */}
                          <div 
                            onClick={() => { setSelectedCity("Laayoune"); setActiveTab("leads"); }}
                            className="absolute top-[82%] left-[20%] group cursor-pointer flex items-center gap-2"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping absolute" />
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-slate-900 relative z-10" />
                            <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-300">
                              {uiLang === "ar" ? "العيون 🐪" : "Laâyoune 🐪"}
                            </span>
                          </div>

                          {/* Dakhla */}
                          <div 
                            onClick={() => { setSelectedCity("Dakhla"); setActiveTab("leads"); }}
                            className="absolute top-[92%] left-[10%] group cursor-pointer flex items-center gap-2"
                          >
                            <span className="w-3 h-3 rounded-full bg-teal-400/20 animate-ping absolute" />
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 border border-slate-900 relative z-10" />
                            <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] text-white">
                              {uiLang === "ar" ? "الداخلة 🏄" : "Dakhla 🏄"}
                            </span>
                          </div>

                        </div>

                        {/* Territory boundary statement of Moroccan Map */}
                        <div className="absolute bottom-3 left-4 text-[9px] text-slate-500 italic max-w-xs leading-snug">
                          {uiLang === "ar" ? "* اضغط على أي مدينة لعزل وتصفية الشبكات والأعمال الخاصة بتلك المنطقة في لوحة التحكم فوراً." : "* Click any geographic center to quickly isolate corresponding regional business networks in CRM."}
                        </div>

                      </div>
                    </div>

                    {/* Sector Performance Maturity Grid */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <Building2 className="h-4.5 w-4.5 text-teal-400" /> {uiLang === "ar" ? "توزيع حجم القطاعات والأنشطة بالمملكة" : "Sector Volume Distribution in Morocco"}
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          {uiLang === "ar" ? "الشركات النشطة حالياً في الجدول" : "Active leads count currently in grid"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sectorDistributions.slice(0, 8).map(([sectorNiche, count]) => {
                          const percentage = Math.round((count / leads.length) * 100) || 5;
                          
                          return (
                            <div key={sectorNiche} className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
                              <div className="flex justify-between items-center text-xs text-slate-300 mb-1.5">
                                <span className="font-semibold">
                                  {uiLang === "ar" ? (SECTOR_TRANSLATIONS[sectorNiche]?.ar || sectorNiche) : (SECTOR_TRANSLATIONS[sectorNiche]?.en || sectorNiche)}
                                </span>
                                <span className="font-mono text-teal-400 font-bold">{count} {uiLang === "ar" ? "عملاء" : "leads"} ({percentage}%)</span>
                              </div>
                              <div className="bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: ROI interactive lead conversion Calculator (lg:col-span-4) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                      
                      <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-teal-400" />
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                            {uiLang === "ar" ? "محاكاة العائد على مبيعات الوكالة" : "Agency Sales ROI Simulator"}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {uiLang === "ar" ? "توقع المداخيل المحتملة من قائمة الشركات المغربية المعروضة" : "Model revenue from filtered Moroccan leads"}
                          </span>
                        </div>
                      </div>

                      {/* Filter parameters notification */}
                      <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/10 text-xs text-slate-300">
                        {uiLang === "ar" ? (
                          <span>تحليل وتدقيق القائمة الحالية التي تضم <strong className="text-white">{filteredLeads.length} شركات</strong> محتملة.</span>
                        ) : (
                          <span>Analyzing your current filtered selection of <strong className="text-white">{filteredLeads.length} leads</strong>.</span>
                        )}
                      </div>

                      {/* Slider parameters */}
                      <div className="space-y-4 text-xs">
                        
                        {/* Deal price: website creation */}
                        <div>
                          <div className="flex justify-between text-slate-400 mb-1.5">
                            <span>{uiLang === "ar" ? "سعر إنشاء موقع ويب جديد:" : "Website Creation Price:"}</span>
                            <span className="font-mono text-white font-bold">{dealValueWebsite.toLocaleString()} {uiLang === "ar" ? "درهم" : "MAD"}</span>
                          </div>
                          <input 
                            type="range" 
                            min="2000" 
                            max="50000" 
                            step="1000"
                            value={dealValueWebsite} 
                            onChange={(e) => setDealValueWebsite(Number(e.target.value))} 
                            className="w-full h-1 bg-slate-800 accent-teal-400"
                          />
                        </div>

                        {/* Deal price: mobile app build */}
                        <div>
                          <div className="flex justify-between text-slate-400 mb-1.5">
                            <span>{uiLang === "ar" ? "سعر تطوير تطبيق جوال:" : "Mobile App Build Price:"}</span>
                            <span className="font-mono text-white font-bold">{dealValueApp.toLocaleString()} {uiLang === "ar" ? "درهم" : "MAD"}</span>
                          </div>
                          <input 
                            type="range" 
                            min="10000" 
                            max="150000" 
                            step="5000"
                            value={dealValueApp} 
                            onChange={(e) => setDealValueApp(Number(e.target.value))} 
                            className="w-full h-1 bg-slate-800 accent-teal-400"
                          />
                        </div>

                        {/* monthly retainer monthly SEO Retainer */}
                        <div>
                          <div className="flex justify-between text-slate-400 mb-1.5">
                            <span>{uiLang === "ar" ? "باقة تحسين محركات البحث شهرياً (SEO):" : "Monthly SEO Option:"}</span>
                            <span className="font-mono text-white font-bold">{dealValueSEO.toLocaleString()} {uiLang === "ar" ? "درهم/شهر" : "MAD/mo"}</span>
                          </div>
                          <input 
                            type="range" 
                            min="1500" 
                            max="20000" 
                            step="500"
                            value={dealValueSEO} 
                            onChange={(e) => setDealValueSEO(Number(e.target.value))} 
                            className="w-full h-1 bg-slate-800 accent-teal-400"
                          />
                        </div>

                        {/* estimated team conversion success rate */}
                        <div>
                          <div className="flex justify-between text-slate-400 mb-1.5">
                            <span>{uiLang === "ar" ? "نسبة نجاح إتمام الصفقات التقديرية:" : "Target Conversion Rate:"}</span>
                            <span className="font-mono text-teal-400 font-bold">
                              {estimatedConversionRate}% {uiLang === "ar" ? "نسبة الإغلاق" : "success"}
                            </span>
                          </div>
                          <input 
                            type="range" 
                            min="1" 
                            max="50" 
                            value={estimatedConversionRate} 
                            onChange={(e) => setEstimatedConversionRate(Number(e.target.value))} 
                            className="w-full h-1 bg-slate-800 accent-teal-450"
                          />
                        </div>

                      </div>

                      {/* Estimator outputs */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 font-mono text-xs">
                        
                        <div className="flex justify-between text-slate-400">
                          <span>{uiLang === "ar" ? "عدد الصفقات المغلقة المتوقعة:" : "Target Closed Clients:"}</span>
                          <span className="text-white font-bold">{calculatorOutput.simulatedClosedDeals} {uiLang === "ar" ? "عملاء" : "deals"}</span>
                        </div>

                        <div className="flex justify-between text-slate-400">
                          <span>{uiLang === "ar" ? "إجمالي القيمة الكلية للمبيعات المتاحة:" : "Total Pipeline value:"}</span>
                          <span className="text-slate-300 font-bold">{calculatorOutput.potentialPipeline.toLocaleString()} {uiLang === "ar" ? "درهم" : "MAD"}</span>
                        </div>

                        <div className="border-t border-slate-900 pt-3 flex justify-between items-center">
                          <span className="text-teal-400 font-bold uppercase text-[10px]">
                            {uiLang === "ar" ? "إجمالي المبيعات والأرباح المتوقعة" : "Estimated revenue MAD"}
                          </span>
                          <span className="text-emerald-400 text-base font-extrabold">{calculatorOutput.estimatedClosingRevenue.toLocaleString()} {uiLang === "ar" ? "درهم مغربي" : "DH"}</span>
                        </div>

                      </div>

                      <div className="text-[10px] text-slate-500 leading-normal text-center">
                        {uiLang === "ar" ? "* تقديرات مبنية على خوارزميات صفقات مبيعات الـ B2B. تذكر أن المداخل الحقيقية تعتمد كلياً على تخصيص نصوص تواصلك مع أصحاب الشركات." : "* Estimates based on a B2B sales matrix. Real conversion results depend heavily on highly personalized followups."}
                      </div>

                    </div>
                  </div>
                  </div>

                </div>

            )}

            {/* ================= TAB 3: EXPORT SERVICE CENTER ================= */}
            {activeTab === "export" && false && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Controls column (lg:col-span-4) */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-5">
                      
                      <div className="border-b border-slate-800 pb-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-white">Export Lead Datasets</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Prepare clean files for emailers or CRM uploads</p>
                      </div>

                      <div className="text-xs space-y-3.5 text-slate-350">
                        <p>
                          Our Export System packages all digital diagnostic flags, priority ratings, phone numbers, website addresses, and calculated metrics.
                        </p>
                        
                        <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 font-mono text-[10px] space-y-1">
                          <div className="flex justify-between text-slate-500">
                            <span>Ready to download:</span>
                            <span className="text-white">{filteredLeads.length} items</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Selected city:</span>
                            <span className="text-white">{selectedCity}</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400">
                          Simply select your format right and copy the output to insert directly into tools like Google Sheets or HubSpot.
                        </p>
                      </div>

                      {/* PDF DOWNLOAD SECTION */}
                      <div className="border-t border-slate-800/80 pt-4 space-y-3.5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-teal-400 select-none animate-pulse" />
                          <h5 className="font-extrabold text-[11px] uppercase tracking-wider text-teal-400">Branded Campaign Documents</h5>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Generate and package a modern client-ready PDF prospecting report. Complete with localized territory diagnostics, vulnerability metrics decks, and classified strategic sales opportunities.
                        </p>

                        <button
                          onClick={handleDownloadPDF}
                          className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 active:scale-98 text-slate-950 font-black py-2 px-3 rounded-lg text-[10px] flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/10 border border-teal-400/20 transition-all cursor-pointer uppercase tracking-wider"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Generate Prospectus PDF</span>
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Right Preview Terminal Column (lg:col-span-8) */}
                  <div className="lg:col-span-8 space-y-4">
                    
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                      
                      <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold font-mono text-slate-300">dataset_morocco_opportunities.raw</span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleDownloadPDF}
                            className="bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/15 hover:from-teal-500/25 hover:to-emerald-500/20 text-teal-300 hover:text-white border border-teal-500/30 text-[10px] font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Download PDF</span>
                          </button>

                          <button
                            onClick={() => triggerCopyNotice("export_csv", exportDataFormatted("csv"))}
                            className="bg-slate-800 hover:bg-slate-700 text-[10px] font-bold px-3 py-1.5 rounded transition-all text-slate-300 flex items-center gap-1.5"
                          >
                            {copiedField === "export_csv" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedField === "export_csv" ? "Copied" : "Copy CSV"}</span>
                          </button>

                          <button
                            onClick={() => triggerCopyNotice("export_json", exportDataFormatted("json"))}
                            className="bg-slate-800 hover:bg-slate-700 text-[10px] font-bold px-3 py-1.5 rounded transition-all text-slate-300 flex items-center gap-1.5"
                          >
                            {copiedField === "export_json" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedField === "export_json" ? "Copied" : "Copy JSON"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Display Terminal box */}
                      <pre className="p-6 bg-slate-980 bg-slate-950 font-mono text-[10px] leading-relaxed text-teal-300 max-h-[440px] overflow-auto whitespace-pre">
                        {exportDataFormatted("csv")}
                      </pre>

                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ================= TAB 4: SETTINGS & OUTREACH PRESETS ================= */}
            {activeTab === "settings" && false && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                  
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-teal-400">Outreach Personalization Engine</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure signature parameters to customize B2B outreach texts dynamically.</p>
                  </div>

                  <form onSubmit={saveOutreachSettings} className="space-y-4 text-xs">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div>
                        <label className="block text-slate-400 mb-1.5">Advisor / Sender Name</label>
                        <input
                          type="text"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1.5">Agency / Company Brand</label>
                        <input
                          type="text"
                          value={agencyName}
                          onChange={(e) => setAgencyName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div>
                        <label className="block text-slate-400 mb-1.5">Copywriting Vibe Tone Settings</label>
                        <select
                          value={preferredVibe}
                          onChange={(e) => setPreferredVibe(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:border-teal-500 font-medium"
                        >
                          <option value="French Consultative">French Consultative (Professional)</option>
                          <option value="Darija Conversational">Darija Conversational (Friendly/Moroccan)</option>
                          <option value="Direct Value Focus">Direct Pitch (Brief & High Value)</option>
                          <option value="Bold Disruption">Bold Disruption (Competitor-focused)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1.5">Default Messaging Language</label>
                        <select
                          value={outreachLanguage}
                          onChange={(e) => setOutreachLanguage(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:border-teal-500 font-medium"
                        >
                          <option value="FR">French (Francophone standard)</option>
                          <option value="EN">English (Global reach)</option>
                          <option value="Darija">Darija / Arabic Latin Standard</option>
                        </select>
                      </div>

                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-start gap-2 text-[10px] text-slate-400">
                      <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <p>
                        Updating these keys automatically updates your customized layout signoffs. Whenever you select any lead candidate, the outreach template instantly incorporates your advisor persona.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-end">
                      <button
                        type="submit"
                        className="bg-teal-400 hover:bg-teal-500 text-slate-950 font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer text-xs"
                      >
                        Apply Settings
                      </button>
                    </div>

                  </form>

                </div>
              </div>
            )}

            {/* ================= TAB 5: FOCUS AMBIENT MUSIC CHIMES ================= */}
            {activeTab === "focus" && false && (
              <div className="max-w-4xl mx-auto space-y-6">
                
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <Music className="h-5 w-5 text-teal-400 select-none animate-pulse" />
                        SaaS Focus Room & Retro Music Loop composer
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-xl">
                        Synthesize, sequence, and customize beautiful ambient background music live. Toggle xylophones, bell pads, ukuleles, and pianos. Export high fidelity WAV loops compatible with Three.js AudioLoader or game backgrounds!
                      </p>
                    </div>
                    <span className="text-3xl select-none">🇲🇦</span>
                  </div>
                </div>

                <FocusSynth />
              </div>
            )}

            {/* ================= TAB 6: GOOGLE MAPS SCROLLER SCRAPER & PYTHON CONSOLE ================= */}
            {activeTab === "scraper" && (
              <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <Compass className="h-5 w-5 text-rose-400 select-none animate-spin-slow" />
                        {uiLang === "ar" ? "محاكي كشط خرائط جوجل والتحكم البرمجي" : "Google Maps B2B Playwright Scraper Engine"}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-xl">
                        {uiLang === "ar"
                          ? "قم بمحاكاة سحب البيانات بالكامل بـ Playwright و Streamlit، انسخ كود غسيل الفجوات أو ادمج الزبناء المكتشفين في لوحة إدارة الـ CRM مباشرة!"
                          : "Interact with our sandboxed scraper simulation, check out the raw Playwright python automation script, or inject newly scraped leads into our central intelligence system."}
                      </p>
                    </div>
                    <span className="text-3xl select-none">📌</span>
                  </div>
                </div>

                <MapsScraperCore 
                  uiLang={uiLang} 
                  onScrapeAddedLeads={(newLeads) => {
                    // Prepend new leads and persist
                    const updated = [...newLeads, ...leads];
                    updateAndPersistLeads(updated);
                  }} 
                />
              </div>
            )}

          </div>

        </main>

      </div>

    </div>
  );
}
