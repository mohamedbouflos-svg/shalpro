import { MoroccoLead } from "../types";

export const MOROCCO_CITIES_MAJOR = [
  "Casablanca", "Rabat", "Marrakesh", "Fez", "Tangier", "Agadir", "Meknes", "Oujda",
  "Kenitra", "Tetouan", "Temara", "Safi", "Mohammedia", "El Jadida", "Beni Mellal",
  "Nador", "Taza", "Settat", "Khouribga", "Larache", "Khemisset", "Guelmim", "Berrechid", "Fkih Ben Salah"
];

export const MOROCCO_CITIES_SOUTH = [
  "Laayoune", "Dakhla", "Boujdour", "Smara", "Tarfaya", "Tan-Tan", "Assa", "Zag",
  "Tata", "Akka", "Foum Zguid", "Ouarzazate", "Tinghir", "Errachidia", "Zagora", "Midelt"
];

export const ALL_MOROCCO_CITIES = [...MOROCCO_CITIES_MAJOR, ...MOROCCO_CITIES_SOUTH];

export const TARGET_SECTORS = [
  "Dental Clinics",
  "Aesthetic Clinics",
  "Car Rental Agencies",
  "Hotels & Riads",
  "Restaurants & Cafés",
  "Real Estate Agencies",
  "Private Schools",
  "Training Centers",
  "Law Firms",
  "Accounting Firms",
  "Travel Agencies",
  "Construction Companies"
];

// Seed raw high quality leads
export const INITIAL_MOROCCO_LEADS: MoroccoLead[] = [
  {
    id: "mor-lead-1",
    name: "Riad Dar Anika Premium",
    sector: "Hotels & Riads",
    city: "Marrakesh",
    phone: "+212 524 44-11-22",
    website: "https://daranikamediterranean.com",
    rating: 4.8,
    reviewsCount: 340,
    address: "112 Rue Riad Zitoun el Kdim, Marrakech 40000",
    googleMapsUrl: "https://maps.google.com/?q=Riad+Dar+Anika+Marrakech",
    leadScore: 35,
    priority: "Low",
    opportunityTags: ["Mobile App Opportunity", "SEO Growth Opportunity"],
    notes: "Elegant luxury Riad. Beautiful reservation desk but website takes 8 seconds to load on local Orange 4G connections. No digital concierge app for guests.",
  },
  {
    id: "mor-lead-2",
    name: "Cabinet Dentaire Gauthier",
    sector: "Dental Clinics",
    city: "Casablanca",
    phone: "+212 522 22-88-99",
    website: null,
    rating: 3.2,
    reviewsCount: 14,
    address: "45 Rue Allal Ben Abdellah, Gauthier, Casablanca 20000",
    googleMapsUrl: "https://maps.google.com/?q=Cabinet+Dentaire+Gauthier+Casablanca",
    leadScore: 94,
    priority: "High",
    opportunityTags: ["Website Opportunity", "Reputation Management Opportunity"],
    notes: "No official website found. Google Gmaps listing shows a low 3.2 rating, primarily driven by long waiting issues. High dental ticket conversion opportunity.",
  },
  {
    id: "mor-lead-3",
    name: "Atlas Rent A Car Agadir",
    sector: "Car Rental Agencies",
    city: "Agadir",
    phone: "+212 661 55-44-33",
    website: "https://atlasrentfree.example.net",
    rating: 3.9,
    reviewsCount: 28,
    address: "Boulevard Mohammed V, Immeuble Al Anouar, Agadir 80000",
    googleMapsUrl: "https://maps.google.com/?q=Atlas+Rent+Car+Agadir",
    leadScore: 78,
    priority: "High",
    opportunityTags: ["Website Opportunity", "Reputation Management Opportunity", "Mobile App Opportunity"],
    notes: "Exposed to massive tourist search patterns. The existing booking page contains critical security warnings on Google Chrome mobile. Highly rated competitors are seizing 80% of booking shares.",
  },
  {
    id: "mor-lead-4",
    name: "Dakhla Surf & Adventure Lodge",
    sector: "Hotels & Riads",
    city: "Dakhla",
    phone: "+212 661 99-88-77",
    website: null,
    rating: 4.7,
    reviewsCount: 52,
    address: "Lagune de Dakhla, PK 28, Dakhla 73000",
    googleMapsUrl: "https://maps.google.com/?q=Dakhla+Surf+Adventure+Lodge",
    leadScore: 89,
    priority: "High",
    opportunityTags: ["Website Opportunity", "SEO Growth Opportunity"],
    notes: "Superb organic attraction with passionate reviews, but completely relies on Instagram DMs for booking. Needs a responsive multi-language booking website to bypass Airbnb fees.",
  },
  {
    id: "mor-lead-5",
    name: "Aesthetic Center Rabat",
    sector: "Aesthetic Clinics",
    city: "Rabat",
    phone: "+212 537 77-55-66",
    website: "https://aestheticcenter-rabat.com",
    rating: 4.1,
    reviewsCount: 19,
    address: "Avenue Annakhil, Hay Riad, Rabat 10100",
    googleMapsUrl: "https://maps.google.com/?q=Aesthetic+Center+Rabat",
    leadScore: 68,
    priority: "Medium",
    opportunityTags: ["SEO Growth Opportunity", "Mobile App Opportunity"],
    notes: "Hay Riad luxury clinic. Fast website, but ranks on page 2 of Maps Pack for local 'Botox Rabat' searches. Missing structured metadata schema.",
  },
  {
    id: "mor-lead-6",
    name: "Laayoune Eye Dental Clinic",
    sector: "Dental Clinics",
    city: "Laayoune",
    phone: "+212 528 89-00-11",
    website: null,
    rating: 4.5,
    reviewsCount: 11,
    address: "Avenue Smara, Face Place Dcheira, Laayoune 70000",
    googleMapsUrl: "https://maps.google.com/?q=Laayoune+Eye+Dental+Clinic",
    leadScore: 85,
    priority: "High",
    opportunityTags: ["Website Opportunity", "SEO Growth Opportunity"],
    notes: "The leading orthodontic provider in Avenue Smara, yet possesses zero professional website or appointment booking system.",
  },
  {
    id: "mor-lead-7",
    name: "Bahia Real Estate Tangier",
    sector: "Real Estate Agencies",
    city: "Tangier",
    phone: "+212 539 33-22-11",
    website: "http://bahianet-tangier.example.ma",
    rating: 3.5,
    reviewsCount: 8,
    address: "Rue de Fès, Résidence El Jamil, Tanger 90000",
    googleMapsUrl: "https://maps.google.com/?q=Bahia+Real+Estate+Tangier",
    leadScore: 82,
    priority: "High",
    opportunityTags: ["Website Opportunity", "Reputation Management Opportunity"],
    notes: "Unstable HTTP-only custom page loaded with deprecated Macromedia assets. Terrible mobile performance is driving luxury rental seekers onto international apps.",
  },
  {
    id: "mor-lead-8",
    name: "Safi Seafood Delights",
    sector: "Restaurants & Cafés",
    city: "Safi",
    phone: "+212 524 62-11-22",
    website: null,
    rating: 4.4,
    reviewsCount: 124,
    address: "Avenue Front de Mer, Safi 46000",
    googleMapsUrl: "https://maps.google.com/?q=Safi+Seafood+Delights",
    leadScore: 71,
    priority: "Medium",
    opportunityTags: ["Website Opportunity", "SEO Growth Opportunity"],
    notes: "Highly rated local spot. No website or online menu. Tourists cannot check real-time pricing list or reserve seaside balcony spots.",
  },
  {
    id: "mor-lead-9",
    name: "Fez Imperial Private School",
    sector: "Private Schools",
    city: "Fez",
    phone: "+212 535 64-55-66",
    website: "https://fez-imperial-school.ma",
    rating: 4.0,
    reviewsCount: 22,
    address: "Route d'Imouzzer, Fez 30000",
    googleMapsUrl: "https://maps.google.com/?q=Fez+Imperial+School",
    leadScore: 61,
    priority: "Medium",
    opportunityTags: ["Mobile App Opportunity", "SEO Growth Opportunity"],
    notes: "Private high school on Route d'Imouzzer. Website has broken parent portal link. Great candidate for student-parent Flutter application or administrative software upgrade.",
  },
  {
    id: "mor-lead-10",
    name: "Dakhla Nomad Watersports Centre",
    sector: "Travel Agencies",
    city: "Dakhla",
    phone: "+212 662 44-55-66",
    website: null,
    rating: 4.8,
    reviewsCount: 95,
    address: "Boulevard Oued Eddahab, Dakhla 73000",
    googleMapsUrl: "https://maps.google.com/?q=Dakhla+Nomad+Watersports",
    leadScore: 92,
    priority: "High",
    opportunityTags: ["Website Opportunity", "SEO Growth Opportunity", "Mobile App Opportunity"],
    notes: "Amazing international windsurfing reviews. Missing a unified Google Business profile landing page and translation workflow, forcing reliance on booking intermediaries.",
  }
];

// Utility to algorithmically derive realistic targets for Morocco data points
export function generateMoreMoroccoLeads(): MoroccoLead[] {
  const generated: MoroccoLead[] = [...INITIAL_MOROCCO_LEADS];
  
  // Create variations across a combination of sectors and cities to provide a fully packed experience
  let customIdCounter = 11;

  for (const city of ALL_MOROCCO_CITIES) {
    // Avoid double-populating our core seed list
    if (["Marrakesh", "Casablanca", "Agadir", "Dakhla", "Rabat", "Laayoune", "Tangier", "Safi", "Fez"].includes(city) && Math.random() > 0.4) {
      continue;
    }

    // Pick 2 random sectors for each city
    const shuffledSectors = [...TARGET_SECTORS].sort(() => 0.5 - Math.random()).slice(0, 3);

    shuffledSectors.forEach((sector, idx) => {
      const hasWebsite = Math.random() > 0.45;
      const isSouthern = MOROCCO_CITIES_SOUTH.includes(city);
      const rating = Math.random() > 0.15 ? Number((3.0 + Math.random() * 1.9).toFixed(1)) : null;
      const reviewsCount = rating ? Math.floor(Math.random() * 80) + 3 : null;
      
      const phoneSuffix1 = Math.floor(Math.random() * 90) + 10;
      const phoneSuffix2 = Math.floor(Math.random() * 90) + 10;
      const phone = `+212 ${isSouthern ? "528" : "522"} ${phoneSuffix1}-55-${phoneSuffix2}`;

      const name = `${city} Elite ${sector.replace("s & Cafés", "").replace("s & Riads", "").replace(" Agencies", "").replace(" Clinics", "").replace(" Companies", "")}`;
      
      // Calculate realistic rating & conversion priority score
      let score = 50;
      const tags: string[] = [];

      if (!hasWebsite) {
        score += 30;
        tags.push("Website Opportunity");
      } else {
        tags.push("SEO Growth Opportunity");
        if (Math.random() > 0.5) tags.push("Mobile App Opportunity");
      }

      if (rating && rating < 4.0) {
        score += 15;
        tags.push("Reputation Management Opportunity");
      }

      if (["Dental Clinics", "Aesthetic Clinics", "Hotels & Riads", "Real Estate Agencies"].includes(sector)) {
        score += 10;
      }

      // bound score
      score = Math.min(Math.max(score, 20), 98);

      let priority: "High" | "Medium" | "Low" = "Low";
      if (score >= 75) {
        priority = "High";
      } else if (score >= 50) {
        priority = "Medium";
      }

      generated.push({
        id: `mor-lead-gen-${customIdCounter++}`,
        name,
        sector,
        city,
        phone,
        website: hasWebsite ? `https://${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.ma` : null,
        rating,
        reviewsCount,
        address: `${idx * 4 + 12} Boulevard Hassan II, ${city}`,
        googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(name + " " + city)}`,
        leadScore: score,
        priority,
        opportunityTags: tags,
        notes: `Local search status scanned for ${city}. High commercial search density in local region.`
      });
    });
  }

  return generated;
}
