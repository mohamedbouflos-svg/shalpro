import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured in the Secrets / Env panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Highly detailed static copywriting generator for robust offline / quota fallback operations
function generateLocalFallbackCopy(
  name: string,
  industry: string,
  city: string,
  website: string | null | undefined,
  rating: number | null | undefined,
  reviewsCount: number | null | undefined,
  notes: string = ""
) {
  // Determine language
  let language = "EN";
  if (notes.includes("Outreach language: French") || notes.includes("French B2B")) {
    language = "FR";
  } else if (notes.includes("Moroccan Darija") || notes.includes("Darija")) {
    language = "DARIJA";
  }

  // Determine campaign type
  let opportunity_type = "SEO & Performance Booster";
  if (!website) {
    opportunity_type = "No Website Campaign";
  } else if (rating !== null && rating !== undefined && (rating < 4.3 || (reviewsCount || 0) < 20)) {
    opportunity_type = "Reputation Rescue Campaign";
  } else if (rating !== null && rating !== undefined && rating >= 4.3 && (reviewsCount || 0) >= 20) {
    opportunity_type = "Premium Elevate Edition";
  }

  // Pre-baked templates
  let analysis = "";
  let subject_1 = "";
  let subject_2 = "";
  let email_body = "";
  let whatsapp = "";
  let follow_up = "";

  if (language === "FR") {
    if (opportunity_type === "No Website Campaign") {
      analysis = `L'audit de présence digitale pour ${name} à ${city} indique un blocage sévère de visibilité dû à l'absence de site internet. Les concurrents sur le créneau ${industry} captent l'ensemble de la clientèle en ligne locale.`;
      subject_1 = `question rapide concernant ${name} à ${city}`;
      subject_2 = `site internet externe et visibilité Google pour ${name}`;
      email_body = `Bonjour,\n\nEn consultant l'annuaire de performance locale à ${city} concernant le domaine ${industry || "votre secteur"}, j'ai constaté que votre établissement "${name}" ne dispose pas encore de site internet moderne répertorié.\n\nAujourd'hui, près de 85% de la clientèle locale s'informe et réserve directement depuis son smartphone. Sans vitrine optimisée sur Google, c'est l'ensemble de ces prospects qui est redirigé vers vos concurrents.\n\nNous concevons des pages web et portails mobiles ultra-rapides et convertissants, calibrés spécialement pour les professionnels de l'univers ${industry || "votre secteur"}.\n\nSeriez-vous ouvert à une discussion de 5 minutes cette semaine pour passer en revue notre maquette locale ?\n\nBien cordialement,\nAlex, agence ClientBloom`;
      whatsapp = `Bonjour ! J'ai vu votre fiche Google Maps pour ${name} à ${city}. 🇲🇦 Proposez-vous un site de réservation en ligne pour vos prestations ? Nous aidons les professionnels du secteur ${industry} à doubler leurs rendez-vous locaux. Je peux vous envoyer une démo de 2 minutes ?`;
      follow_up = `Bonjour, simple suivi de notre diagnostic digital pour ${name}. Nous avons modélisé une maquette mobile légère de site de réservation autonome. Faites-moi savoir si vous souhaitez la consulter mardi prochain !`;
    } else if (opportunity_type === "Reputation Rescue Campaign") {
      analysis = `Déficit de réputation et de preuves sociales locales détecté à ${city} pour ${name}. Un score de ${rating || "GMB"}★ basé sur ${reviewsCount || 0} avis limite l'autorité locale devant les concurrents du secteur ${industry || "votre secteur"}.`;
      subject_1 = `e-réputation et avis clients pour ${name}`;
      subject_2 = `idée rapide pour booster la note de ${name} à ${city}`;
      email_body = `Bonjour,\n\nEn réalisant un audit sectoriel sur les professionnels de la catégorie ${industry || "votre secteur"} à ${city}, j'ai analysé la fiche établissement de "${name}" qui affiche actuellement une note de ${rating || "N/A"}★ sur ${reviewsCount || 0} avis.\n\nDans un secteur à forte valeur perçue, la qualité de vos retours clients est le premier facteur de choix en ligne. Un volume d'avis fragile ou stagnant offre un avantage critique à vos concurrents les mieux notés.\n\nNous avons mis au point un système de collecte automatique d'avis 5 étoiles (via SMS, WhatsApp et QR Codes intelligents) qui redirige l'avis positif et vous permet de désamorcer discrètement les avis moins favorables.\n\nSeriez-vous ouvert à un micro-échange de 5 minutes cette semaine pour examiner notre étude de cas ?\n\nBien cordialement,\nAlex de ClientBloom`;
      whatsapp = `Bonjour ! J'ai examiné vos avis Google Maps pour ${name} à ${city}. Nous aidons les leaders de la catégorie ${industry} à amplifier leurs avis 5 étoiles de manière 100% automatisée tout en protégeant leur note. Intéressé par un court aperçu des résultats ?`;
      follow_up = `Bonjour, je me permets de revenir vers vous concernant vos avis clients pour ${name}. Un surcroît d'avis positifs sur ${city} est le levier le plus puissant pour dominer le référencement local ce trimestre. Dispo pour un appel rapide ?`;
    } else if (opportunity_type === "Premium Elevate Edition") {
      analysis = `Excellente assise locale détectée pour ${name} à ${city} (${rating || "4.8"}★ basés sur ${reviewsCount || 40} avis). L'enjeu majeur réside dans la transition vers une infrastructure VIP : portail de réservation exclusif, hébergement headless instantané et fidélisation en marque blanche.`;
      subject_1 = `votre position de leader sur ${city} : ${name}`;
      subject_2 = `digitalisation premium et fidélisation pour ${name}`;
      email_body = `Bonjour,\n\nJe reste très impressionné par l'excellente image digitale de "${name}" à ${city}, qui se traduit par une superbe réputation de ${rating || "4.8"}★ sur Google Maps.\n\nEn tant qu'acteur de premier plan dans le domaine ${industry || "votre secteur"}, la prochaine étape pour asseoir définitivement votre leadership local consiste à optimiser les parcours de réservation, éliminer les commissions intermédiaires et déployer un portail client premium en marque blanche.\n\nDisposeriez-vous de 5 minutes la semaine prochaine pour une démonstration rapide de nos interfaces VIP conçues pour les leaders de la catégorie ${industry} ?\n\nBien cordialement,\nAlex, Fondateur de ClientBloom`;
      whatsapp = `Bonjour et bravo pour les notes excellentes de ${name} à ${city} ! 🇲🇦 Nous concevons des portails de réservation interactifs de luxe pour les professionnels les plus qualifiés de la verticale ${industry}. Seriez-vous curieux d'étudier nos modèles d'intégration ?`;
      follow_up = `Bonjour, je fais suite à notre intérêt pour le profil premium de ${name}. Nous avons préparé un guide stratégique d'une page montrant comment automatiser la fidélisation client et gagner 8 heures d'administration par semaine. Intéressé(e) ?`;
    } else {
      analysis = `L'audit technique du site de ${name} suggère des lenteurs de chargement mobile et des balises SEO obsolètes à ${city}. Risque d'abandon utilisateur élevé lors de recherches sur le secteur ${industry || "votre secteur"}.`;
      subject_1 = `vitesse mobile et visibilité web pour ${name}`;
      subject_2 = `audit technique de performance offert pour ${name}`;
      email_body = `Bonjour,\n\nJ'ai récemment analysé le site Web de votre agence "${name}" à ${city}.\n\nVous bénéficiez d'une solide offre dans le domaine ${industry || "votre secteur"}, mais votre site actuel souffre de lenteurs techniques notables sur mobile. Près de 70% des visiteurs quittent une page si le chargement dépasse les 3 secondes, ce qui affecte directement votre ROI publicitaire et organique.\n\nNous éliminons ces écueils en ré-alignant votre code sur les Core Web Vitals de Google, afin de capturer l'ensemble des requêtes sur ${city}.\n\nPourrions-nous échanger durant 5 minutes pour examiner les correctifs prioritaires à appliquer ?\n\nExcellente journée,\nAlex, Directeur SEO à ClientBloom`;
      whatsapp = `Bonjour ! J'ai effectué un test de vélocité mobile sur le site de ${name} à ${city}. Il y a 3 détails de performance simples qui bloquent vos leads. Seriez-vous d'accord pour en discuter brièvement au téléphone demain ?`;
      follow_up = `Bonjour, je reviens vers vous par rapport aux performances du site ${name} à ${city}. Nos refontes mobiles légères doublent généralement le taux de prise de contact direct sans budget publicitaire supplémentaire. Au plaisir d'en discuter !`;
    }
  } else if (language === "DARIJA") {
    if (opportunity_type === "No Website Campaign") {
      analysis = `${name} f ${city} ma 3andhoms site web f Google Maps. Les concurrents f ${industry || "had niche"} f ${city} kaddiwhom kamlin organic traffic. Khasna nsaoub mwa9i3 electronic l'had charika bach ychedo blast'hom.`;
      subject_1 = `soual sghir 3la ${name} f ${city}`;
      subject_2 = `site web o zabayn jdad l ${name}`;
      email_body = `Salam,\n\nKnt liyouma kanchouf Google Maps la catégorie ${industry || "votre secteur"} f ${city} o l9it "${name}" blast'ha mezyana, walakin ma handkomch site web mktoub tm f profil.\n\nL'mochkila hya l'klian lli kay9lbo f ${city} 3la khadamate ${industry || "votre secteur"} ghadi ymchiw direct 3nd concurrents dyalkom hit dyalhom site web bayn o sahla l'reservation. Hna kansawbo des sites rapides f mobile o khfaf بزاف bach yzidok rnin dyal l'telephone dyalkom.\n\nChno ban lik ila ntaslo f 5 d9ay9 chi nhar had simana nwarik draf d'maquette dyalkom?\n\nMarhaban bik,\nAlex mn ClientBloom`;
      whatsapp = `Salam marhaba! L9it safha dyal ${name} f Google Maps f ${city}. 🇲🇦 Yakma baghin chi site web khfif o modern bach l'klian dyalkom y7jzo direct mn dar? Sawbna modèle khfif dyal ${industry}, khelli lya message ila knti baghi tchufo!`;
      follow_up = `Salam, gher tbe3 sghir m3a ${name}. Sawbna site sghir modern khfif f tajriba dyalna lhad niche dyal ${industry} f ${city}. Chofo m3ana liyam jaya!`;
    } else if (opportunity_type === "Reputation Rescue Campaign") {
      analysis = `Déficit dyal l'avis clients f ${name} (${rating || "N/A"}★ o ${reviewsCount || 0} reviews) f ${city}. L'klian dyal ${industry || "had niche"} kaymchiw bzzaf llli 3ando reviews ktar o mezyanin f search local.`;
      subject_1 = `soum3a o review dyal ${name} f Google`;
      subject_2 = `fikra sahla 3la Google reviews dyal ${name}`;
      email_body = `Salam,\n\nKnt kan9leb f l'annuaire dyal ${industry || "votre secteur"} f ${city} o cheft l'fiche dyal "${name}", l9it 3ndha ${rating || "chwya"}★ o safe ${reviewsCount || 0} d'avis f Google Maps.\n\nF'had niche, reviews dyal Google rkhass o homa kolchi b'nisba l'klian f ${city}. Ila kano chouya na9sin awla 9lal, bnadem ghadi ymle o yduz direct l'fiche akhra mezyana f ${city}.\n\nHna 3ndna wa7d system automatise kaykhelli l'klian lli far7anin ykhalio sda9a dyal 5 stars b SMS aw QR Code bla ttab, o kaygoliha likom hna la kan chi m9elqin.\n\nBaghi ncherk m3akom kifach khdemna f'morocco f had l'secteur. Nfiy9o had l'moudo3 f 5 d9ay9 dyal tlifon?\n\nMarhaba bikoum,\nAlex mn ClientBloom`;
      whatsapp = `Salam! Cheft Google reviews dyal ${name} f ${city}. Sawbna solution sahla katkhali ay wahed ja 3ndkoum ykhali avis 5-stars sahla f Google, bach tzido tchedo blastkoum f ${industry}. Liyam jayin ntaslo?`;
      follow_up = `Salam, f had l'moudo3 dyal reviews l ${name}. L'krab dyal concurrents f ${city} ghada o kat9wa, darori avis dyalkom tkoun mjehda. Baghi t'chouf l'fikra f d9i9a ?`;
    } else if (opportunity_type === "Premium Elevate Edition") {
      analysis = `Reviews top dyal ${name} f ${city} (${rating || "4.8"}★ f ${reviewsCount || 30} avis). Blast'ha wa3ra f l'annuaire ${industry || "had niche"}. L'khotwa jaya hya l'digitalisation premium b app mobile o booking portal VIP.`;
      subject_1 = `fikra mzyana l ${name} f ${city}`;
      subject_2 = `tajriba premium dyal digital l ${name}`;
      email_body = `Salam,\n\nTebarkellah 3likom o 3la "${name}" f ${city}, l9ina review dyalkom wa3ra bzzaf (${rating || "4.8"}★ f Google Maps)!\n\nHad l'position dyalkom hya top f had l'niche ${industry || "votre secteur"}, dakchi 3lach khasna ndwzo l'client l'level tani dial digital: des applications mobiles custom, booking portal m9add khfif, o des espaces VIP l'klian dyalkoum.\n\nHna kansawbo hadchi l'chakhsiyat top f'had l'secteur.\n\nChno ban lik ila nhdro f tlifon 5 min nwarik dakhilyat blast'koum simana jaya?\n\nAjmal tahiya,\nAlex mn ClientBloom`;
      whatsapp = `Salam o tebarkellah 3likom 🇲🇦 L9ina safhat ${name} f ${city} fiha notes top f Google. Kansawbo software dial reservation VIP khssran l'had les leaders f ${industry || "had niche"}. Baghi tchouf tajriba dialna?`;
      follow_up = `Salam, gher follow-up khfif l ${name}. Sawbna automatic member portal lli kay7yed khedmat booking t9ila f tlifon o kaykhali l'klian ye7jzo f ay we9t. Khbar dyalkom?`;
    } else {
      analysis = `Site web dyal ${name} f ${city} d3if chwiya mobile speed aw SEO, khas gher chi modification sghira bach n'dopplo klian dyal ${industry || "had niche"}.`;
      subject_1 = `sur3a o SEO dyal site ${name}`;
      subject_2 = `refonte sghira dyal site web ${name}`;
      email_body = `Salam,\n\nZrt l'site web dyal "${name}" f ${city}. Tebarkellah 3ndkom site mezyan walakin sghir f l'vitesse dyalo f'telephone o search engine optimization.\n\nKtar mn 70% dial l'klian f dakhla dial tlifon kaymchiw l blasa khra ila site t9el kter mn 3 seconds f chargement. O had l'modifications lli bghit nwerik ghadi tkhallikoum tchedo blastkoum f pack local f ${city} f lowel f ${industry || "had niche"}.\n\nN9dro ntaslo safe f 5 min nwarikom ach kayn f had'l de9a?\n\nSalam,\nAlex mn ClientBloom`;
      whatsapp = `Salam! Dert test dial speed mobile lsite dial ${name} f ${city}. Kayn l'opportunités sahlin tsawbohom l'had site bach ykoun msa3ed f mobile l sector ${industry}. Bghiti nhdro fihom chi we9t sahla?`;
      follow_up = `Salam, follow up sghir 3la sur3a dial site ${name}. Ktīrat charikat hna f ${city} zadou double dial tlifonate gher bl'speed mobile. Chi tsila khfīfa had l'iam?`;
    }
  } else {
    // ENGLISH FALLBACK
    if (opportunity_type === "No Website Campaign") {
      analysis = `The digital presence audit for ${name} in ${city} indicates a severe visibility block due to the absence of a registered primary website domain. Competitors in the ${industry} sector are capturing 100% of organic local map pack searches.`;
      subject_1 = `quick query regarding ${name} in ${city}`;
      subject_2 = `google search authority ideas for ${name}`;
      email_body = `Hi,\n\nI was reviewing the local ${industry} directory for ${city} and noticed that "${name}" doesn't have an active digital website listed on Google Maps.\n\nWithout a responsive mobile-friendly homepage, customers in ${city} searching for reliable ${industry} services are guided directly to competitors. We've built a lightweight, SEO-optimized landing page model tailored for local businesses that can double your quote requests or phone bookings.\n\nCould we grab a short 5-minute virtual coffee next week to see if this matches your plans?\n\nBest regards,\nAlex from ClientBloom`;
      whatsapp = `Hello! Saw your business ${name} on Google Maps in ${city}. 🇲🇦 Do you accept bookings page online? We built a lightweight Web platform model for Moroccan ${industry} services that might help you double your daily calls. Let me know if you want to take a quick look!`;
      follow_up = `Hi support, just following up on our digital presence report for ${name}. We've launched a modern progressive web app in the region with instant mobile loading times. Let me know if you can check our mock draft tomorrow.`;
    } else if (opportunity_type === "Reputation Rescue Campaign") {
      analysis = `The digital presence audit for ${name} in ${city} indicates a fragile rating profile (${rating || "N/A"} stars based on ${reviewsCount || 0} reviews) on GMB. There is a high risk of local searchers opting for competitors with stronger social proof.`;
      subject_1 = `reputation idea for ${name} (${city})`;
      subject_2 = `local review insights for ${name}`;
      email_body = `Hi,\n\nI was researching ${industry} operators in ${city} and found your page "${name}" with ${rating || "fragile"} stars from ${reviewsCount || 0} reviews.\n\nIn competitive markets, even a minor review gap can direct up to 40% of prospective clients toward highly-rated alternatives on Google. We develop automated feedback loops that gently request positive reviews from happy clients via SMS and email, filtering out negative inputs before they go public.\n\nI'd love to share our regional case studies with you. Would you be open to a quick 5-minute chat on Tuesday?\n\nBest,\nAlex from ClientBloom`;
      whatsapp = `Hi! Just checked your Google reviews for ${name} in ${city}. 🌟 We design custom feedback touchpoints for ${industry} that double 5-star reviews automatically while keeping negative remarks private. Open to a quick call today?`;
      follow_up = `Hi there, following up on the GMB rating analysis. With recent traffic surges in ${city}'s ${industry} sector, optimizing your review volume is the fastest way to double incoming enquiries. Let me know if you'd like a short preview.`;
    } else if (opportunity_type === "Premium Elevate Edition") {
      analysis = `The GMB audit for ${name} in ${city} shows a solid operational footprint (${rating || "4.8"}/5.0). However, in premium high-value niches like ${industry}, standard web assets fail to capitalize on luxury positioning. High opportunities exist to launch interactive customer portals, performance mobile apps, and elite local SEO strategies.`;
      subject_1 = `elite strategy ideas for ${name}`;
      subject_2 = `scaling digital conversion at ${name}`;
      email_body = `Hi,\n\nI came across ${name} in ${city} and was highly impressed by your positive ${rating || "4.8"}-star reputation in the local ${industry} market.\n\nBecause you are already established, the highest-ROI step is upgrading to custom high-performance digital tools, such as booking portals, speed-enhanced React templates, and specialized local SEO authority stacks to seal your #1 spot. We build bespoke client retention systems specifically for top-tier ${industry} brands.\n\nAre you open for a quick 5-minute call early next week to discuss some optimization points?\n\nSincerely,\nAlex from ClientBloom`;
      whatsapp = `Hello! Love the high ratings for ${name} in ${city}. We specialize in custom high-performance client portals for premium ${industry} businesses to streamline bookings and lower admin overhead. Let me know if you'd like custom ideas!`;
      follow_up = `Hi there, following up on our ideas for ${name}. We've put together a brief optimization slide showing how premium digital tools can save your team 10+ hours a week in booking admin. Let me know if you want the link!`;
    } else {
      analysis = `Standard web speed checks and meta tags for ${name} in ${city} suggest a lack of responsive formatting and unoptimized schema markup. This creates a critical barrier to high-conversion search authority in the ${city} regional market.`;
      subject_1 = `website speed and seo analysis for ${name}`;
      subject_2 = `free core web vitals diagnostic for ${name} web`;
      email_body = `Hi,\n\nI ran a quick performance scan on your homepage for "${name}" located in ${city}.\n\nAs a prominent provider of ${industry} services, your brand is highly credible, but your mobile page load speed has some critical technical latency. Up to 70% of potential clients will navigate away if a mobile page takes more than 3 seconds to render.\n\nBy implementing a few high-performance code optimizations and local schema updates, we can help you double your organic inquiries directly from Google Search.\n\nCould we jump on a brief 5-minute call to review these priority technical fixes?\n\nBest regards,\nAlex, SEO Coordinator at ClientBloom`;
      whatsapp = `Hi! I ran some speed diagnostics on the website of ${name} in ${city}. There are a few easy, high-value code adjustments for ${industry} platforms that could boost bookings. Let me know if you can discuss this week!`;
      follow_up = `Hi support, following up on our speed audit for ${name}. We recently helped a similar group in Morocco double their mobile appointment volume by refactoring their landing speed. Let me know if you can jump on a quick call Tuesday!`;
    }
  }

  return {
    analysis,
    opportunity_type,
    email: {
      subject_1,
      subject_2,
      body: email_body
    },
    whatsapp,
    follow_up,
    isFallback: true
  };
}

const app = express();
app.use(express.json());

// API: Analyze Lead and Generate Copy
app.post("/api/analyze", async (req, res) => {
  try {
    const { name, industry, city, website, rating, reviewsCount, notes } = req.body;

    if (!name || !industry || !city) {
      return res.status(400).json({ error: "Missing required fields: Name, Industry, and City are required." });
    }

    const ai = getGenAIClient();

    const prompt = `
      You are an elite AI Sales Copywriter and Lead Conversion Specialist. Analyze the following local business lead and generate highly personalized outreach.
      
      BUSINESS METRICS:
      - Business Name: "${name}"
      - Industry/Niche: "${industry}"
      - City/Location: "${city}"
      - Website: ${website ? `"${website}"` : "None / Not found"}
      - Google Maps Rating: ${rating !== null && rating !== undefined ? `${rating} / 5.0` : "None"}
      - Review Count: ${reviewsCount !== null && reviewsCount !== undefined ? `${reviewsCount} reviews` : "None"}
      ${notes ? `- Additional Business-specific Notes: "${notes}"` : ""}

      DETERMINE SALES ANGLE & ROADBLOCK:
      1. If there is no Website -> Focus strictly on "No Website Campaign" highlighting lost traffic, missed local SEO authority, and credibility gap.
      2. If website exists but reviews are weak (below 4.3 rating or under 20 reviews) -> Focus on "Reputation Rescue Campaign", explaining how 1-star reviews or lack of recent activity drives customers to competitors.
      3. If they have both high reviews and a website, but are in a high-end competitive niche (e.g., luxury services, high-ticket contractors, medical practices) -> Focus on "Premium Elevate Edition" (mobile apps, premium branding, SEO performance, custom software).
      4. Otherwise -> Focus on "SEO & Performance Booster" or "Mobile First Conversion" centering page speeds, local map pack positioning, and turning web visitors into call-backs.

      Write highly human-sounding, friendly, high-conversion copy. Never use generic 'corporate' boilerplate. Avoid marketing buzzwords like "delighted", "synergies", "game changer", or "revolutionize". Write in a direct, consultative tone of a helpful local advisor.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite, natural-sounding B2B outreach writer who specializes in creating warm, hyper-personalized emails, WhatsApp messages, and follow-ups. You always return output strictly conforming to the requested JSON layout.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: {
              type: Type.STRING,
              description: "Copywriter diagnostics of their present digital presence. Highlight exact roadblocks (lack of website, rating deficiency etc.), city-specific positioning opportunity, and a quick pitch strategy."
            },
            opportunity_type: {
              type: Type.STRING,
              description: "The specific sales campaign angle. Must be select one of: 'No Website Campaign', 'Reputation Rescue Campaign', 'Premium Elevate Edition', 'SEO & Performance Booster', or 'Mobile First Conversion'."
            },
            email: {
              type: Type.OBJECT,
              properties: {
                subject_1: {
                  type: Type.STRING,
                  description: "Subject Line option 1. High open-rate, casual yet professional (e.g. quick question about [Business Name] in [City]). Keep it completely lowercase or standard sentence case."
                },
                subject_2: {
                  type: Type.STRING,
                  description: "Subject Line option 2. Focuses directly on the core hook / value (e.g. local rating ideas for [Business Name])."
                },
                body: {
                  type: Type.STRING,
                  description: "Complete cold email. Must start with a personal, tailored sentence referencing their business city or industry. Must politely point out the deficiency (e.g. lack of website or fragile reviews count) without sounding insulting. Show clear value hook. Sign off with a gentle 5-minute chat request. Do not use generic placeholders like '[Your name]' inside the email - sign off as 'Alex from ClientBloom' (or a similar clean sales advisor persona) to keep the text natural and copy-paste ready."
                }
              },
              required: ["subject_1", "subject_2", "body"]
            },
            whatsapp: {
              type: Type.STRING,
              description: "Complete short WhatsApp opener. Ultra-conversational, extremely brief (2-3 sentences), friendly, ending in a single responsive question. Uses appropriate emojis or brief spacing formatting."
            },
            follow_up: {
              type: Type.STRING,
              description: "Day 2-3 email or direct follow-up message. Brief, casual, adds subtle urgency or points out a competitive edge (e.g., 'Hey there, wanted to share a quick idea regarding a competitor in [City]...')"
            }
          },
          required: ["analysis", "opportunity_type", "email", "whatsapp", "follow_up"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response output from Gemini model.");
    }

    const parsed = JSON.parse(responseText.trim());
    return res.json(parsed);

  } catch (error: any) {
    try {
      const { name, industry, city, website, rating, reviewsCount, notes } = req.body;
      console.log(`[Safe Mode Enabled] Gemini API managed throttle. Local copywriter engaged for "${name || "Lead"}" in ${city || "Morocco"}.`);
      
      const fallbackPayload = generateLocalFallbackCopy(
        name,
        industry,
        city,
        website,
        rating,
        reviewsCount,
        notes || ""
      );
      return res.json(fallbackPayload);
    } catch (fallbackError: any) {
      console.error("Critical double fallback error in copywriting generation:", fallbackError);
      return res.status(500).json({ error: "Copywriting service is down. Please verify lead attributes and try again." });
    }
  }
});

// Serve frontend assets
const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on http://0.0.0.0:${PORT}`);
  });
}

startServer();
