import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import json
import time
from engines.google_maps import GoogleMapsEngine
from engines.web_analyzer import WebAnalyzerEngine
from engines.scoring import ScoringEngine
from engines.ai_assistant import AIAssistantEngine

st.set_page_config(
    page_title="AI Business Intelligence Platform",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ── Dark Premium CSS ────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
* { font-family: 'Inter', sans-serif; }
.stApp { background-color: #0d1117; color: #c9d1d9; }
.block-container { padding: 2rem 3rem; }
.metric-card {
    background: linear-gradient(135deg, #161b22 0%, #1f2937 100%);
    border: 1px solid #30363d;
    border-radius: 14px;
    padding: 22px 24px;
    margin-bottom: 16px;
    transition: transform 0.2s;
}
.metric-card:hover { transform: translateY(-2px); border-color: #58a6ff55; }
.metric-title { color: #8b949e; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
.metric-value { color: #58a6ff; font-size: 2.2rem; font-weight: 900; line-height: 1; }
.metric-sub  { color: #6e7681; font-size: 0.75rem; margin-top: 4px; }
.header-gradient {
    background: linear-gradient(90deg, #58a6ff, #bc8cff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 900; font-size: 2rem; line-height: 1.2;
}
.lead-card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 18px 20px;
    margin-bottom: 12px;
}
.hot-badge  { background:#c53030; color:#fff; padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; }
.warm-badge { background:#b7791f; color:#fff; padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; }
.cold-badge { background:#2d7d46; color:#fff; padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; }
.stTabs [data-baseweb="tab"] { background:#161b22; border-radius:8px 8px 0 0; color:#8b949e; font-weight:600; }
.stTabs [aria-selected="true"] { background:#1f6feb !important; color:#fff !important; }
</style>
""", unsafe_allow_html=True)

# ── Localization ────────────────────────────────────────────────────────────
ui_lang = st.sidebar.selectbox("🌐 Language / اللغة / Langue", ["English", "العربية", "Français"], index=0)

COUNTRY_CITY_MAP = {
    "Morocco": ["Casablanca", "Rabat", "Marrakech", "Tangier", "Agadir", "Fes", "Meknes", "Dakhla", "Nador", "Laayoune", "Other"],
    "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "San Francisco", "Kansas", "Other"],
    "France": ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Other"],
    "Spain": ["Madrid", "Barcelona", "Valencia", "Seville", "Malaga", "Marbella", "Other"],
    "Canada": ["Toronto", "Montreal", "Vancouver", "Calgary", "Ottawa", "Other"]
}

INDUSTRIES_MAP = {
    "Morocco": [
        "Car Rental Agencies | وكالات كراء السيارات",
        "Luxury Hotels & Riads | الفنادق المصنفة والرياضات",
        "Aesthetic & Plastic Surgery | عيادات التجميل والليزر",
        "Dental Clinics | عيادات طب الأسنان",
        "Real Estate Agencies | وكالات العقارات",
        "Construction & Architecture | شركات المقاولات والهندسة المعمارية",
        "Private Schools & Academies | المدارس الخاصة ومراكز التدريب",
        "Premium Gyms & Wellness | القاعات الرياضية ومراكز اللياقة",
        "Cafes & High-End Restaurants | المقاهي والمطاعم الفاخرة",
        "Local Factories & E-commerce | المصانع المحلية والشركات التجارية",
        "Custom Sector | قطاع مخصص آخر"
    ],
    "United States": [
        "Landscaping & Lawn Care | تنسيق الحدائق والجرادي الفاخرة",
        "Cleaning & Maid Services | شركات التنظيف والخدمات المنزلية",
        "Moving & Storage Companies | شركات النقل والشحن المحلي",
        "Roofing & Home Contractors | شركات إصلاح الأسطح والبناء",
        "Medical Spas & Aesthetic Centers | عيادات التجميل والليزر والـ MedSpas",
        "Law Firms & Attorneys | مكاتب المحاماة والاستشارات القانونية",
        "Dental Clinics | عيادات طب الأسنان",
        "HVAC & Plumbing Services | شركات إصلاح التكييف، التدفئة والسباكة",
        "Real Estate Brokers | وكالات العقارات الكبرى",
        "Premium Fitness Gyms & CrossFit | قاعات الرياضة والكروس فيت الفاخرة",
        "Custom Sector | قطاع مخصص آخر"
    ],
    "France": [
        "Boutique & Luxury Hotels | الفنادق الفاخرة والنزول السياحية",
        "Dental & Medical Clinics | عيادات طب الأسنان والعيادات المتخصصة",
        "International Real Estate | وكالات العقارات الدولية",
        "Chauffeur & Car Rental | شركات النقل الخاص والـ VTC",
        "Lawyers & Legal Firms | المحاماة والاستشارات القانونية",
        "Aesthetic & Beauty Salons | صالونات التجميل والسبا الفاخر",
        "Local Gastronomy & Restaurants | المطاعم الفاخرة والمحلية",
        "Private Training & Language Schools | مدارس اللغات ومراكز التدريب الخاصة",
        "Architects & Design Studios | مهندسو الديكور والهندسة المعمارية",
        "Art Galleries & Event Agencies | صالات العرض وشركات تنظيم الحفلات الفاخرة",
        "Custom Sector | قطاع مخصص آخر"
    ],
    "Spain": [
        "Inmobiliarias de Lujo | وكالات العقارات الفاخرة",
        "Hoteles Boutique y Alquiler Vacacional | الفنادق والإقامات السياحية",
        "Clínicas Estéticas y Medicina Especializada | عيادات التجميل والليزر",
        "Alquiler de Coches y VTC | كراء السيارات والنقل الخاص",
        "Clínicas Dentales | عيادات طب الأسنان",
        "Bufetes de Abogados | مكاتب المحاماة والاستشارات",
        "Empresas de Reformas y Construcción | شركات الإصلاحات والبناء",
        "Gimnasios Premium y Centros de Pilates | قاعات الرياضة الفاخرة",
        "Restaurantes de Alta Gama y Catering | المطاعم الفاخرة",
        "Academias de Idiomas y Formación | مراكز التدريب واللغات",
        "Custom Sector | قطاع مخصص آخر"
    ]
}
INDUSTRIES_MAP["Canada"] = INDUSTRIES_MAP["United States"]

st.sidebar.markdown("---")
st.sidebar.markdown("### 📍 Location Target" if ui_lang == "English" else ("### 📍 الموقع المستهدف" if ui_lang == "العربية" else "### 📍 Cible Locale"))
selected_country = st.sidebar.selectbox("🌐 اختر الدولة المستهدفة / Select Country:", ["Morocco", "United States", "France", "Spain", "Canada"])
cities_list = COUNTRY_CITY_MAP[selected_country]
selected_city = st.sidebar.selectbox("🏙️ City / المدينة", cities_list)

if selected_city == "Other":
    custom_city = st.sidebar.text_input("اكتب اسم المدينة مانيوال:")
    target_location = f"{custom_city}, {selected_country}" if custom_city else selected_country
else:
    target_location = f"{selected_city}, {selected_country}"

st.sidebar.markdown("---")
st.sidebar.markdown("### 🏢 Target Industry" if ui_lang == "English" else ("### 🏢 القطاع المستهدف" if ui_lang == "العربية" else "### 🏢 Secteur Cible"))
industry_list = INDUSTRIES_MAP[selected_country]
selected_industry = st.sidebar.selectbox("🎯 Industry / القطاع", industry_list)

if selected_industry == "Custom Sector | قطاع مخصص آخر":
    target_industry = st.sidebar.text_input("اكتب اسم القطاع مانيوال:")
else:
    target_industry = selected_industry

T = {
    "English": {
        "title": "AI Business Intelligence & Lead Gen Platform",
        "subtitle": "Ultra-Deep Multi-Source Search • AI Qualification • Automated Outreach",
        "tab_dash": "📊 Dashboard", "tab_search": "🔍 Deep Search", "tab_leads": "📈 Leads & Analytics",
        "mode_label": "Search Mode",
        "modes": ["⚡ FAST — Maps Only (1-2 min)", "🔍 DEEP — Maps + Web SEO (5 min)", "🌌 ULTRA DEEP — AI + Socials (15 min)"],
        "industry": "Target Industry", "location": "Target Location",
        "max_leads": "Max Leads Target", "start": "🚀 Launch AI Intelligence Search",
        "filter_label": "Advanced Filters", "no_web": "No Website", "no_email": "No Email",
        "no_wa": "No WhatsApp", "hot_only": "Hot Leads Only",
        "export_csv": "📥 Export CSV", "export_json": "📥 Export JSON",
        "total": "Total Leads", "websites": "With Website", "hot": "Hot Leads", "avg_seo": "Avg SEO Score",
        "class_col": "Classification",
    },
    "العربية": {
        "title": "منصة ذكاء الأعمال وجيل العملاء بالذكاء الاصطناعي",
        "subtitle": "بحث عميق متعدد المصادر • تحليل ذكي • رسائل مبيعات آلية",
        "tab_dash": "📊 اللوحة الرئيسية", "tab_search": "🔍 البحث العميق", "tab_leads": "📈 العملاء والإحصائيات",
        "mode_label": "نمط البحث",
        "modes": ["⚡ سريع — خرائط جوجل فقط (1-2 دقيقة)", "🔍 عميق — خرائط + تحليل المواقع (5 دقائق)", "🌌 عميق جداً — ذكاء اصطناعي + سوشيال (15 دقيقة)"],
        "industry": "القطاع المستهدف", "location": "الموقع المستهدف (مدينة/دولة)",
        "max_leads": "عدد العملاء المستهدفين", "start": "🚀 إطلاق البحث الذكي",
        "filter_label": "فلترة النتائج", "no_web": "بدون موقع", "no_email": "بدون بريد إلكتروني",
        "no_wa": "بدون واتساب", "hot_only": "العملاء الساخنون فقط",
        "export_csv": "📥 تصدير CSV", "export_json": "📥 تصدير JSON",
        "total": "إجمالي العملاء", "websites": "لديهم موقع", "hot": "عملاء ساخنون", "avg_seo": "متوسط سيو",
        "class_col": "التصنيف",
    },
    "Français": {
        "title": "Plateforme IA de Business Intelligence et Lead Gen",
        "subtitle": "Recherche multi-sources • Qualification IA • Prospection automatisée",
        "tab_dash": "📊 Tableau de Bord", "tab_search": "🔍 Recherche Profonde", "tab_leads": "📈 Prospects & Analyse",
        "mode_label": "Mode de Recherche",
        "modes": ["⚡ RAPIDE — Maps Seulement (1-2 min)", "🔍 PROFOND — Maps + SEO Web (5 min)", "🌌 ULTRA PROFOND — IA + Réseaux Sociaux (15 min)"],
        "industry": "Secteur Cible", "location": "Localisation (Ville/Pays)",
        "max_leads": "Nombre de Prospects Cible", "start": "🚀 Lancer la Recherche IA",
        "filter_label": "Filtres Avancés", "no_web": "Sans Site Web", "no_email": "Sans Email",
        "no_wa": "Sans WhatsApp", "hot_only": "Prospects Chauds Seulement",
        "export_csv": "📥 Exporter CSV", "export_json": "📥 Exporter JSON",
        "total": "Total Prospects", "websites": "Avec Site Web", "hot": "Prospects Chauds", "avg_seo": "Score SEO Moy.",
        "class_col": "Classification",
    }
}

t = T[ui_lang]

# ── Session state ───────────────────────────────────────────────────────────
if "final_data" not in st.session_state: st.session_state.final_data = []
if "metrics"    not in st.session_state: st.session_state.metrics = {"total":0,"web":0,"hot":0,"avg_seo":0.0}

# ── Header ──────────────────────────────────────────────────────────────────
st.markdown(f"<div class='header-gradient'>{t['title']}</div>", unsafe_allow_html=True)
st.caption(t["subtitle"])
st.markdown("---")

tab_dash, tab_search, tab_leads = st.tabs([t["tab_dash"], t["tab_search"], t["tab_leads"]])

# ══════════════════════════════════════════════════════════════════════════════
# TAB 1 — DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
with tab_dash:
    m = st.session_state.metrics
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f"<div class='metric-card'><div class='metric-title'>{t['total']}</div><div class='metric-value'>{m['total']}</div><div class='metric-sub'>Discovered Businesses</div></div>", unsafe_allow_html=True)
    with c2:
        st.markdown(f"<div class='metric-card'><div class='metric-title'>{t['websites']}</div><div class='metric-value'>{m['web']}</div><div class='metric-sub'>Online Presence</div></div>", unsafe_allow_html=True)
    with c3:
        st.markdown(f"<div class='metric-card'><div class='metric-title'>{t['hot']}</div><div class='metric-value'>{m['hot']}</div><div class='metric-sub'>Ready to Pitch</div></div>", unsafe_allow_html=True)
    with c4:
        st.markdown(f"<div class='metric-card'><div class='metric-title'>{t['avg_seo']}</div><div class='metric-value'>{m['avg_seo']}%</div><div class='metric-sub'>Average SEO Health</div></div>", unsafe_allow_html=True)

    if st.session_state.final_data:
        df_all = pd.DataFrame(st.session_state.final_data)

        st.markdown("### 📊 Lead Classification Breakdown")
        ch1, ch2 = st.columns(2)
        with ch1:
            class_counts = df_all["Classification"].value_counts().reset_index()
            class_counts.columns = ["Classification", "Count"]
            color_map = {"HOT LEAD 🔥": "#c53030", "WARM LEAD ⚡": "#d69e2e", "Cold Lead": "#2d7d46"}
            fig_pie = px.pie(class_counts, names="Classification", values="Count",
                             color="Classification", color_discrete_map=color_map,
                             hole=0.55, template="plotly_dark")
            fig_pie.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", showlegend=True)
            st.plotly_chart(fig_pie, use_container_width=True)

        with ch2:
            if "SEO Score" in df_all.columns:
                df_seo = df_all.copy()
            if "SEO Score" in df_seo.columns:
                df_seo["SEO_num"] = pd.to_numeric(
                    df_seo["SEO Score"].apply(lambda x: str(x).replace("/100", "")),
                    errors="coerce"
                ).fillna(0)
            else:
                df_seo["SEO_num"] = pd.to_numeric(
                    df_seo.iloc[:, -1].apply(lambda x: str(x).replace("/100", "")),
                    errors="coerce"
                ).fillna(0)
                fig_bar = px.bar(df_seo.head(20), x="Business Name", y="SEO_num",
                                 color="Classification", color_discrete_map=color_map,
                                 template="plotly_dark", labels={"SEO_num": "SEO Score"})
                fig_bar.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", xaxis_tickangle=-40)
                st.plotly_chart(fig_bar, use_container_width=True)

        st.markdown("### 🔥 Digital Opportunity Radar")
        opp_counts = {}
        for row in st.session_state.final_data:
            for opp in row.get("Opportunities","").split(","):
                o = opp.strip()
                if o: opp_counts[o] = opp_counts.get(o, 0) + 1
        if opp_counts:
            fig_opp = go.Figure(go.Bar(
                x=list(opp_counts.values()), y=list(opp_counts.keys()), orientation='h',
                marker_color='#58a6ff'
            ))
            fig_opp.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", height=350)
            st.plotly_chart(fig_opp, use_container_width=True)
    else:
        st.info("Run a Search to populate dashboard analytics.")

# ══════════════════════════════════════════════════════════════════════════════
# TAB 2 — DEEP SEARCH CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════
with tab_search:
    col_a, col_b = st.columns(2)
    with col_a:
        search_mode = st.selectbox(t["mode_label"], t["modes"])
        max_leads = st.slider(t["max_leads"], 50, 1000, 200, 50)
    with col_b:
        st.markdown("#### 🛡 Search Mode Details")
        if "FAST" in search_mode or "سريع" in search_mode or "RAPIDE" in search_mode:
            st.success("**FAST MODE** – Google Maps scraping only. Fastest possible. No website analysis.")
            do_web_analysis = True; do_ai = False  # Changed to True to enforce full DOM parsing
        elif "DEEP" in search_mode or "عميق" in search_mode or "PROFOND" in search_mode:
            st.warning("**DEEP MODE** – Maps + website SEO analysis + social link detection.")
            do_web_analysis = True; do_ai = False
        else:
            st.error("**ULTRA DEEP MODE** – Full AI pipeline: Maps + Web + Socials + AI-generated pitches.")
            do_web_analysis = True; do_ai = True
        st.markdown("---")
        st.caption("📍 Results are deduplicated by Google Maps URL")
        st.caption("🤖 AI pitches are generated per-lead based on identified gaps")

    if st.button(t["start"], use_container_width=True, type="primary"):
        status_ph  = st.empty()
        prog_bar   = st.progress(0)
        log_ph     = st.empty()
        logs       = []

        def update_status(msg):
            status_ph.markdown(f"⏳ **{msg}**")
            logs.append(msg)
            if len(logs) > 6: logs.pop(0)
            log_ph.code("\n".join(logs))

        def update_progress(val):
            prog_bar.progress(val)

        # Phase 1 — Maps
        update_status("Initializing Google Maps Intelligence Engine...")
        maps_engine = GoogleMapsEngine(headless=True)
        base_leads  = maps_engine.perform_search(
            query=f"{target_industry} {target_location}",
            max_leads=max_leads,
            status_callback=update_status,
            progress_callback=update_progress
        )

        if not base_leads:
            st.error("❌ No leads discovered. Try a different industry or location.")
        else:
            final_data = []
            hot_count = web_count = total_seo = 0
            total_base = len(base_leads)

            update_status(f"📍 {total_base} leads found. Starting intelligence pipeline...")

            for idx, lead in enumerate(base_leads):
                update_progress(min(60 + int((idx+1)/total_base*40), 100))

                # Phase 2 (optional) — Web Analysis
                if do_web_analysis:
                    web_engine   = WebAnalyzerEngine()
                    web_metrics  = web_engine.analyze_website(lead.get("website"))
                    update_status(f"🔎 Analyzing [{lead.get('name','?')}] → {web_metrics.get('status','?')} | SEO ready")
                else:
                    web_metrics = {"status": "Skipped (Fast Mode)", "ssl_secure": False, "has_h1": False,
                                   "has_meta_desc": False, "emails": [], "social_links": {}}

                score_data  = ScoringEngine.qualify_lead(lead, web_metrics)

                # Phase 3 (optional) — AI pitches
                if do_ai:
                    ai_pitches = AIAssistantEngine.generate_pitch(lead, web_metrics, score_data, target_industry)
                else:
                    ai_pitches = {"email_pitch": "Run ULTRA DEEP mode to generate.", "whatsapp_pitch": "Run ULTRA DEEP mode to generate."}

                if web_metrics.get("status") == "Online": web_count += 1
                if "HOT LEAD" in score_data["classification"]: hot_count += 1
                total_seo += score_data["seo_score"]

                emails = web_metrics.get("emails", [])
                s = web_metrics.get("social_links", {})
                
                # Use whatsapp from site if Maps didn't find one
                final_wa = wa_number if 'wa_number' in locals() and wa_number else (lead.get("whatsapp") or "—")
                if ("غير متوفر" in final_wa or final_wa == "—") and s.get("whatsapp"):
                    final_wa = s.get("whatsapp")
                
                final_phone = lead.get("phone") or "—"
                if (final_phone == "—" or "غير متوفر" in final_phone) and final_wa != "—":
                    final_phone = final_wa

                final_data.append({
                    "Business Name":     lead.get("name"),
                    "Phone":             final_phone,
                    "WhatsApp":          final_wa,
                    "Email":             ", ".join(emails) if emails else "—",
                    "Website":           lead.get("website") or "—",
                    "Web Status":        web_metrics.get("status"),
                    "SSL":               "✅" if web_metrics.get("ssl_secure") else "❌",
                    "LinkedIn":          s.get("linkedin") or "—",
                    "Facebook":          s.get("facebook") or "—",
                    "Instagram":         s.get("instagram") or "—",
                    "Classification":    score_data["classification"],
                    "Digital Score":     score_data["score"],
                    "SEO Score":         score_data["seo_score"],
                    "Opportunities":     score_data["opportunities"],
                    "AI Email Pitch":    ai_pitches["email_pitch"].replace("\n","  "),
                    "AI WhatsApp Pitch": ai_pitches["whatsapp_pitch"].replace("\n","  "),
                    "Maps URL":          lead.get("maps_url") or "—",
                })

            st.session_state.final_data = final_data
            st.session_state.metrics = {
                "total":   len(final_data),
                "web":     web_count,
                "hot":     hot_count,
                "avg_seo": round(total_seo / max(len(final_data), 1), 1)
            }
            status_ph.success(f"✨ Intelligence scan complete — {len(final_data)} leads qualified.")
            st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# TAB 3 — LEADS TABLE + EXPORT + FILTERS
# ══════════════════════════════════════════════════════════════════════════════
with tab_leads:
    if not st.session_state.final_data:
        st.info("Run a search to see leads here.")
    else:
        df = pd.DataFrame(st.session_state.final_data)

        # Advanced Filters
        with st.expander(f"🔧 {t['filter_label']}", expanded=False):
            fc1, fc2, fc3, fc4 = st.columns(4)
            f_no_web   = fc1.checkbox(t["no_web"])
            f_no_email = fc2.checkbox(t["no_email"])
            f_no_wa    = fc3.checkbox(t["no_wa"])
            f_hot_only = fc4.checkbox(t["hot_only"])

        df_filtered = df.copy()
        if f_no_web:   df_filtered = df_filtered[df_filtered["Website"] == "—"]
        if f_no_email: df_filtered = df_filtered[df_filtered["Email"]   == "—"]
        if f_no_wa:    df_filtered = df_filtered[df_filtered["WhatsApp"]== "—"]
        if f_hot_only: df_filtered = df_filtered[df_filtered["Classification"].str.contains("HOT")]

        st.caption(f"Showing **{len(df_filtered)}** of {len(df)} leads after filters")
        st.dataframe(df_filtered, use_container_width=True, height=460)

        # Export
        ex1, ex2 = st.columns(2)
        with ex1:
            csv = df_filtered.to_csv(index=False).encode("utf-8-sig")
            st.download_button(t["export_csv"], csv, "ai_leads_report.csv", "text/csv", use_container_width=True)
        with ex2:
            json_str = df_filtered.to_json(orient="records", force_ascii=False, indent=2)
            st.download_button(t["export_json"], json_str, "ai_leads_report.json", "application/json", use_container_width=True)

        # Lead Detail Cards (top 10 hot leads)
        hot_df = df_filtered[df_filtered["Classification"].str.contains("HOT")].head(10)
        if not hot_df.empty:
            st.markdown("### 🔥 Top Hot Lead Cards")
            for _, row in hot_df.iterrows():
                badge = "<span class='hot-badge'>HOT LEAD 🔥</span>" if "HOT" in row["Classification"] else ("<span class='warm-badge'>WARM ⚡</span>" if "WARM" in row["Classification"] else "<span class='cold-badge'>COLD</span>")
                st.markdown(f"""
<div class='lead-card'>
  <b style='color:#e6edf3;font-size:1.1rem'>{row['Business Name']}</b> &nbsp; {badge}<br>
  📞 {row['Phone']} &nbsp;&nbsp; 💬 {row['WhatsApp']}<br>
  🌐 <code>{row['Website']}</code> &nbsp;&nbsp; 🔒 SSL {row['SSL']}<br>
  📊 Digital Score: <b style='color:#58a6ff'>{row['Digital Score']}/100</b> &nbsp;|&nbsp; SEO: <b style='color:#f7a24b'>{row['SEO Score']}/100</b><br>
  🎯 <i>{row['Opportunities']}</i>
</div>""", unsafe_allow_html=True)
