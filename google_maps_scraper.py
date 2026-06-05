import re
import time
import random
import urllib.parse
import urllib.request
import pandas as pd
import streamlit as st
from playwright.sync_api import sync_playwright

# Set up Streamlit Page Configuration
st.set_page_config(
    page_title="Morocco Maps Scraper & B2B Lead Generator",
    page_icon="🇲🇦",
    layout="wide"
)

# Custom Styling for Moroccan Flag Theme and premium dashboard feel
st.markdown("""
<style>
    .main-title {
        color: #006241;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-weight: 800;
        text-align: center;
        margin-bottom: 5px;
    }
    .sub-title {
        color: #c1272d;
        text-align: center;
        margin-bottom: 25px;
        font-size: 1.1rem;
    }
    .stButton>button {
        background-color: #006241;
        color: white;
        font-weight: bold;
        border-radius: 10px;
        transition: all 0.3s ease;
        width: 100%;
    }
    .stButton>button:hover {
        background-color: #c1272d;
        color: white;
        border: 1px solid #c1272d;
    }
    .success-alert {
        padding: 15px;
        background-color: rgba(0, 98, 65, 0.15);
        color: #006241;
        border-left: 5px solid #006241;
        border-radius: 5px;
        margin-top: 15px;
        font-weight: bold;
    }
    .warning-alert {
        padding: 15px;
        background-color: rgba(193, 39, 45, 0.1);
        color: #c1272d;
        border-left: 5px solid #c1272d;
        border-radius: 5px;
        margin-top: 15px;
        font-weight: bold;
    }
    .stats-card {
        background-color: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 12px;
        padding: 15px;
        margin-top: 15px;
    }
    .stats-title {
        color: #38bdf8;
        font-size: 0.85rem;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 10px;
    }
    .stats-value {
        font-size: 1.4rem;
        font-weight: 800;
        color: #f8fafc;
    }
</style>
""", unsafe_allow_html=True)

st.markdown('<h1 class="main-title">🇲🇦 مستخرج خرائط جوجل وجامع بيانات الشركات المغربية</h1>', unsafe_allow_html=True)
st.markdown('<p class="sub-title">أداة تسويق آلية احترافية بالكامل لجمع الزبناء وحصر الفجوات التقنية بالمملكة المغربية</p>', unsafe_allow_html=True)

# Initialize session states for statistics persistence
if "scraped_leads_cache" not in st.session_state:
    st.session_state.scraped_leads_cache = []

# Sidebar header & inputs - strictly core maps scroller and switchers
st.sidebar.header("⚙️ إعدادات مستخرج خرائط جوجل")

# Country-city mapping
cities_by_country = {
    "المغرب": ["الداخلة", "الدار البيضاء", "الرباط", "مراكش", "أكادير", "طنجة", "فاس", "مكناس", "وجدة", "القنيطرة", "تطوان", "تمارة", "سلا", "العيون", "الناظور", "بني ملال"],
    "الولايات المتحدة الأمريكية (USA)": ["New York", "California", "Texas", "Florida", "Illinois", "Washington", "Boston", "Las Vegas", "Miami", "San Francisco"],
    "كندا (Canada)": ["Montreal", "Toronto", "Vancouver", "Quebec City", "Ottawa", "Calgary", "Edmonton"],
    "فرنسا (France)": ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille"]
}

# Country-sector mapping
sectors_by_country = {
    "المغرب": [
        "Dental Clinics (عيادات طب الأسنان)", 
        "Car Rental Agencies (كراء السيارات)",
        "Hotels & Riads (فنادق ورياضات)",
        "Restaurants & Cafés (مطاعم ومقاهي)",
        "Aesthetic Clinics (عيادات التجميل)"
    ],
    "الولايات المتحدة الأمريكية (USA)": [
        "Moving Companies (نقل الأثاث)", 
        "Plumbers (السباكة والطوارئ)", 
        "HVAC Contractors (التكييف والتدفئة)", 
        "Landscaping Services (تنسيق الحدائق)", 
        "House Cleaning Services (تنظيف المنازل)", 
        "Mobile Auto Detailing (غسيل السيارات المتنقل)"
    ],
    "كندا (Canada)": [
        "Moving Companies (نقل الأثاث)", 
        "Plumbers (السباكة)", 
        "HVAC Contractors (التدفئة والتكييف)", 
        "Mobile Auto Detailing (غسيل السيارات المتنقل)",
        "Entreprise de déménagement (Déménageurs)",
        "Plombier"
    ],
    "فرنسا (France)": [
        "Serrurier / Dépannage (أقفال وطوارئ)", 
        "Plombier (السباكة)", 
        "Entreprise de nettoyage (شركات التنظيف)", 
        "Salon de coiffure (صالونات الحلاقة)", 
        "Institut de beauté (مراكز التجميل)"
    ]
}

# 1. Country Selection Selectbox
target_country = st.sidebar.selectbox(
    "🌍 اختر الدولة المستهدفة (Target Country):",
    ["المغرب", "الولايات المتحدة الأمريكية (USA)", "كندا (Canada)", "فرنسا (France)"],
    index=0
)

# 2. Dynamic City Selection Selectbox
target_city = st.sidebar.selectbox("📍 المدينة المستهدفة:", cities_by_country[target_country])

# 3. Dynamic Sector Selection Selectbox
target_sector = st.sidebar.selectbox("💼 القطاع المهني للفحص:", sectors_by_country[target_country])

custom_agency_name = st.sidebar.text_input("💻 اسم وكالتك (لصياغة رسالة الواتساب):", "Atlas Digital Agency")

# Multi-lingual UI option
ui_lang = st.sidebar.radio("🌐 لغة العرض (UI Language):", ["العربية", "English"])

# LinkedIn Profile Checkbox
linkedin_label = "🔗 فحص الملف التعريفي بـ LinkedIn (Cross-reference)" if ui_lang == "العربية" else "🔗 LinkedIn Profile Detection (Cross-reference)"
detect_linkedin = st.sidebar.checkbox(linkedin_label, value=True)

max_leads = st.sidebar.slider("🎯 حدد عدد الشركات المطلوبة في البحث:", min_value=100, max_value=500, value=100, step=50)

# Calculate statistics for the smart box
total_count = len(st.session_state.scraped_leads_cache)
high_priority_count = sum(
    1 for item in st.session_state.scraped_leads_cache 
    if item.get("رقم الواتساب") != "📱 غير متوفر" and "موقع معطل" in str(item.get("🌐 الموقع الإلكتروني"))
)
no_website_count = sum(
    1 for item in st.session_state.scraped_leads_cache 
    if "الموقع غير متوفر" in str(item.get("🌐 الموقع الإلكتروني"))
)

# Display smart stats box directly # Helper function to check website accessibility status
def verify_website_connectivity(url_str):
    if not url_str or "الموقع غير متوفر" in url_str:
        return "🔴 الموقع غير متوفر"
    
    # Extract clean URL
    clean_url = url_str
    if "<a href=" in url_str:
        m = re.search(r'href="([^"]+)"', url_str)
        if m:
            clean_url = m.group(1)
            
    try:
        req = urllib.request.Request(
            clean_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AtlasScraper/1.0'}
        )
        # 5 seconds short timeout execution
        with urllib.request.urlopen(req, timeout=5) as response:
            code = response.getcode()
            if code == 200:
                return f'<a href="{clean_url}" target="_blank" style="color:#00c853; font-weight:bold;">🟢 شغال ✅ (Status 200)</a>'
            else:
                return f'<a href="{clean_url}" target="_blank" style="color:#ef4444; font-weight:bold;">🔴 موقع معطل ❌ (Status {code})</a>'
    except Exception:
        # Returns warning that website is down/offline (excellent outreach selling opportunity)
        return f'<a href="{clean_url}" target="_blank" style="color:#ef4444; font-weight:bold;">🔴 موقع معطل ❌ (فرصة بيع)</a>'

# Smart background email scraping function from website URL
def extract_email_from_website(url_str):
    if not url_str or "الموقع غير متوفر" in url_str:
        return "غير متوفر"
    
    clean_url = url_str
    if "<a href=" in url_str:
        m = re.search(r'href="([^"]+)"', url_str)
        if m:
            clean_url = m.group(1)
            
    if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
        clean_url = "http://" + clean_url
        
    try:
        req = urllib.request.Request(
            clean_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=3) as response:
            # Read first 80KB to keep it extremely fast and lightweight
            html_content = response.read(81920).decode('utf-8', errors='ignore')
            # Regex for identifying email addresses
            emails = re.findall(r'[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-_]+\.[a-zA-Z]{2,4}', html_content)
            filtered = []
            for email in emails:
                e_low = email.lower()
                # Exclude static/extension file names or common placeholder templates
                if not any(e_low.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']) and \
                   not any(word in e_low for word in ['bootstrap', 'jquery', 'font-awesome', 'yourname', '@example.com', '@yourdomain.com']):
                    filtered.append(email)
            if filtered:
                return ", ".join(list(set(filtered))[:2])
    except Exception:
        pass
    return "غير متوفر"

# Separating/isolating Moroccan whatsapp mobiles, and keeping international mobile numbers
def extract_whatsapp_mobile(phone, country):
    if not phone or phone == "📱 الهاتف غير متوفر":
        return "📱 غير متوفر"
        
    cleaned = re.sub(r'[^0-9]', '', phone)
    
    if country == "المغرب":
        is_mobile = False
        standardized = ""
        
        # Check if meets Moroccan mobile routing parameters
        if cleaned.startswith("212"):
            if len(cleaned) >= 11 and (cleaned[3] == '6' or cleaned[3] == '7'):
                is_mobile = True
                standardized = "0" + cleaned[3:]
        elif cleaned.startswith("06") or cleaned.startswith("07"):
            if len(cleaned) == 10:
                is_mobile = True
                standardized = cleaned
        elif cleaned.startswith("6") or cleaned.startswith("7"):
            if len(cleaned) == 9:
                is_mobile = True
                standardized = "0" + cleaned
    
        if is_mobile:
            return standardized
        else:
            # Excludes static/landline targets from WhatsApp mobile direct column representation
            return "📱 غير متوفر (هاتف أرضي وثابت)"
    elif country in ["الولايات المتحدة الأمريكية (USA)", "كندا (Canada)"]:
        # US and Canada (+1 area)
        if len(cleaned) == 10:
            return "+1" + cleaned
        elif len(cleaned) == 11 and cleaned.startswith("1"):
            return "+" + cleaned
        return phone
    elif country == "فرنسا (France)":
        # France (+33)
        if cleaned.startswith("33"):
            return "+" + cleaned
        elif cleaned.startswith("0"):
            return "+33" + cleaned[1:]
        return phone
    else:
        return phone

# Helper function to generate standardized Moroccan or International WhatsApp promotional link
def generate_whatsapp_link(whatsapp_no, sector, agency_name, country):
    if not whatsapp_no or "غير متوفر" in whatsapp_no:
        return "<span style='color: #64748b;'>🚫 غير متوفر للواتساب</span>"
        
    # Standardize number for direct api call
    if country == "المغرب":
        clean_no = "212" + whatsapp_no[1:]
    else:
        clean_no = re.sub(r'[^0-9]', '', whatsapp_no)
        if not clean_no:
            return "<span style='color: #64748b;'>🚫 غير متوفر للواتساب</span>"
    
    sector_ar = "محلكم الموقر"
    service_pitch = "صناعة موقع إلكتروني احترافي وتطبيق جوال لجلب زبائن جدد وضمان ظهور متميز لمحلكم"
    
    if "Dentist" in sector or "Dental" in sector or "عياد" in sector:
         sector_ar = "عيادة طب الأسنان"
         service_pitch = "بناء نظام حجز مواعيد تلقائي متكامل مع موقع ويب لعرض خدمات العيادة وتسهيل تواصل المرضى"
    elif "Car Rental" in sector or "كراء" in sector:
         sector_ar = "وكالة كراء السيارات"
         service_pitch = "إنشاء منصة حجز سيارات ذكية متصلة ببرنامج تتبع السيارات لزيادة المداخيل وتلقي الحجوزات المباشرة"
    elif "Riad" in sector:
         sector_ar = "الرياض / الفندق"
         service_pitch = "تصميم معرض صور راق ونظام حجز داخلي يجنبكم عمولات Booking العالية ويسوق للرياض مباشرة"
    elif "Restaurant" in sector:
         sector_ar = "المطعم الخاص بكم"
         service_pitch = "برمجة قائمة طعام رقمية تفاعلية (QR Code Menu) مع نظام طلبات خارجي لتوصيل الطلبات مجاناً"
    elif "Moving" in sector or "déménagement" in sector or "نقل" in sector:
         sector_ar = "شركة نقل الأثاث"
         service_pitch = "تصميم صفحة هبوط احترافية مخصصة للتحويل وحملات جوجل الإعلانية لجلب خدمات نقل أثاث يومية"
    elif "Plumb" in sector or "سباك" in sector:
         sector_ar = "خدمات السباكة والصيانة"
         service_pitch = "إطلاق حملة إعلانات جوجل مخصصة وموقع ويب سريع لطلبات الطوارئ المنزلية المباشرة"
    elif "HVAC" in sector or "تكييف" in sector or "تدفئة" in sector:
         sector_ar = "شركة خدمات التدفئة والتكييف"
         service_pitch = "تأسيس موقع ويب احترافي وتفعيل مراجعات جوجل المحلية لضمان ريادة منطقتكم بالكامل"
    elif "Landscap" in sector or "حدائق" in sector:
         sector_ar = "شركة تنسيق وزراعة الحدائق"
         service_pitch = "معرض أعمال تفاعلي رقمي لتسويق وتنسيق الحدائق والفيلات وزيادة التعاقدات السنوية"
    elif "Cleaning" in sector or "nettoyage" in sector or "تنظيف" in sector:
         sector_ar = "شركة خدمات التنظيف المنزلي"
         service_pitch = "صفحة هبوط سريعة توفر ميزة حجز باقات التنظيف مباشرة لزيادة سرعة التحويل الرقمي"
    elif "Auto Detailing" in sector or "غسيل" in sector:
         sector_ar = "مركز تنظيف وغسيل السيارات المتنقل"
         service_pitch = "برمجة تطبيق حجز سريع يربط الفنيين بالعملاء الجدد في مواقعهم مباشرة"
    elif "Serrurier" in sector or "أقفال" in sector:
         sector_ar = "خدمات الأقفال والطوارئ"
         service_pitch = "برمجة موقع ويب سريع متوافق مع الهواتف للحصول على اتصالات فورية لفتح الأقفال على مدار الساعة"
    elif "coiffure" in sector or "حلاقة" in sector:
         sector_ar = "صالون الحلاقة والتجميل"
         service_pitch = "تأسيس نظام متكامل لحجز المواعيد إلكترونياً وتنسيق زيارات الزبناء لضمان صفر انتظار"
    elif "beauté" in sector or "تجميل" in sector:
         sector_ar = "مركز التجميل والتدليك"
         service_pitch = "تصميم بوابة رقمية لعرض الخدمات وحجز باقات العناية المتطورة مباشرة للعملاء"

    if country == "المغرب":
        darija_message = (
            f"السلام عليكم ورحمة الله، معلّم {sector_ar}. "
            f"تواصلت معك من وكالة {agency_name} بالمغرب. "
            f"شفنا محلكم على خرائط جوجل وحبينا نقترحوا عليكم {service_pitch} لزيادة أرباحكم. "
            f"هل أنتم مهتمون بمناقشة المشروع؟ شكرا جزيلا."
        )
    else:
        darija_message = (
            f"Hello, we noticed your business on Google Maps. "
            f"We are offering high performance digital upgrade solutions for your business. "
            f"Would you be interested in a quick consultation? "
            f"Best regards, {agency_name}."
        )
    
    encoded_message = urllib.parse.quote(darija_message)
    wa_url = f"https://wa.me/{clean_no}?text={encoded_message}"
    
    return f'<a href="{wa_url}" target="_blank" style="background-color:#25D366; color:black; padding: 5px 10px; border-radius:5px; text-decoration:none; font-size:12px; font-weight:bold; display:inline-block;">💬 راسل بالواتساب</a>'

# Trigger scraping only on button click
if st.button("🚀 ابدأ عملية الكشط واستخراج الزبناء (Google Maps Scraping)"):

    # Extract English / French sector term before passing to query
    search_sector = target_sector.split(" (")[0].strip() if " (" in target_sector else target_sector
    search_query = f"{search_sector} {target_city}"
    st.info(f"🔍 جاري التحضير للبحث التلقائي في خرائط Google عن: **{search_query}**")

    # Progress bars
    progress_bar = st.progress(0)
    status_text = st.empty()

    leads_list = []
    limit_seconds = 1200  # Extended timeout to allow sufficient scrolling
    start_time = time.time()
    reached_end = False

    # Run Playwright Sync Code
    with sync_playwright() as p:
        import os
        is_streamlit = os.environ.get("STREAMLIT_RUNTIME_HACKS") is not None or os.path.exists("/home/adminuser")
        if is_streamlit:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"])
        else:
            browser = p.chromium.launch(headless=False)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()
        page.set_default_timeout(0)
        page.set_default_navigation_timeout(0)

        # Navigate to Google Maps search
        maps_search_url = f"https://www.google.com/maps/search/{urllib.parse.quote(search_query)}"
        page.goto(maps_search_url, timeout=0, wait_until="domcontentloaded")

        status_text.text("🤖 جاري تهيئة الصفحة والتعامل مع النوافذ المنبثقة...")
        # 1. Add initial wait time: Force sleep to ensure page renders properly
        time.sleep(7)

        # 2. Handle Cookies/Consent: Click "Accept all" if presented
        try:
            accept_buttons = page.locator('button:has-text("Accept all"), button:has-text("Tout accepter"), button:has-text("قَبول الكل")')
            if accept_buttons.count() > 0:
                accept_buttons.first.click(timeout=3000)
                time.sleep(2)
        except Exception:
            pass

        status_text.text("🤖 جاري مسح خرائط جوجل وتفعيل تقنيات التمرير الذكي...")

        scroll_count = 0
        previous_unique = 0
        stagnant_scrolls = 0
        
        while True:
            elapsed = time.time() - start_time
            
            # Count unique discovered place links — this is the TRUE measure of loaded results.
            # Unlike div[role="article"], place links are never removed from the DOM during scrolling.
            place_links = page.locator("a[href*='/maps/place/']").all()
            unique_hrefs = set(a.get_attribute("href") or "" for a in place_links)
            unique_hrefs.discard("")
            current_unique = len(unique_hrefs)
            
            # Progress bar based on user target (leave 20% for extraction)
            current_progress = min(80, int((current_unique / max(max_leads, 1)) * 80))
            progress_bar.progress(current_progress)
            
            status_text.text(f"⏳ تمرير ذكي ومستمر... تم اكتشاف {current_unique} موقع فريد من أصل {max_leads} (الوقت المنقضي: {int(elapsed)} ثانية)")
            
            # Stop based on our accurate deduplicated count target 
            if current_unique >= max_leads:
                reached_end = True
                break
            
            # Stop when Google Maps signals end-of-results
            end_indicator = page.locator("text=You've reached the end of the list").is_visible() or \
                            page.locator("text=لقد وصلت إلى نهاية القائمة").is_visible()
            if end_indicator:
                reached_end = True
                break
            
            # 3. Verify Selectors: Fallbacks in case Google Maps changes classes
            articles = page.locator('div[role="article"]')
            if articles.count() == 0:
                articles = page.locator('a[href*="/maps/place/"]')

            art_count = articles.count()
            if art_count > 0:
                try:
                    articles.nth(art_count - 1).scroll_into_view_if_needed(timeout=2000)
                    page.mouse.wheel(0, 500)
                except Exception:
                    page.mouse.wheel(0, 1000)
            else:
                page.mouse.wheel(0, 1000)
                
            # 4. Human Emulation: Add random delay between each scroll action to avoid blocking
            time.sleep(random.uniform(1, 3))
            scroll_count += 1
            
            # Stagnation detection — exit if no new place links load for 8 consecutive scrolls
            if current_unique == previous_unique:
                stagnant_scrolls += 1
                if stagnant_scrolls >= 8:
                    reached_end = True
                    break
            else:
                stagnant_scrolls = 0
            
            previous_unique = current_unique
        
        status_text.text("⚡ جاري تفكيك خلايا البيانات والتحقق من قنوات ومواقع المحلات المكتشفة...")
        
        # Re-fetch all article cards that were loaded during scrolling
        # 3. Verify Selectors: Enhance final extraction robustness
        place_cards = page.locator('div[role="article"]').all()
        if not place_cards:
            place_cards = page.locator("//a[contains(@href, '/maps/place/')]/ancestor::div[1]").all()
            if not place_cards:
                place_cards = page.locator('a[href*="/maps/place/"]').all()
        total_found = len(place_cards)
        
    
        status_text.text(f"📊 تم تحديد {total_found} شركة/محل مستهدف. جاري مراجعة الفجوات الرقمية واستخراج قنوات الاتصال وتدقيق المواقع...")
        
        for index, card in enumerate(place_cards):
            progress_bar.progress(min(80 + int((index+1)/(total_found+1)*20), 100))
        
            try:
                name_el = card.locator('a[href*="/maps/place/"]')
                if name_el.count() > 0:
                    name = name_el.first.get_attribute("aria-label") or name_el.first.inner_text()
                else:
                    name_header = card.locator('div.qBF1Pd')
                    if name_header.count() > 0:
                        name = name_header.first.inner_text()
                    else:
                        name = f"Unnamed Local Lead #{index + 1}"
            except Exception:
                name = f"Unnamed Lead #{index + 1}"
            
            # Extract RAW phone number
            raw_phone = "📱 الهاتف غير متوفر"
            try:
                all_text_elements = card.inner_text()
                if target_country == "المغرب":
                    # Match +212 or 0, followed by 5/6/7/8/9 (covers landlines 05x and mobiles 06x/07x)
                    phone_match = re.search(r'(\+212|0)[\s\-\.]?[5-9](?:[\s\-\.]?[0-9]){8}', all_text_elements)
                else:
                    phone_match = re.search(r'(\+?[0-9]{1,3}[ \-]?)?(\(?[0-9]{3}\)?[ \-]?)?[0-9]{3}[ \-]?[0-9]{4,6}', all_text_elements)
                
                if phone_match:
                    extracted_phone = phone_match.group(0)
                    # Clean the extracted text from spaces, dashes, and dots
                    raw_phone = re.sub(r'[\s\-\.]', '', extracted_phone)
            except Exception:
                pass
            
            # Extract WhatsApp Mobile / International Digital Telephone
            whatsapp_mobile_num = extract_whatsapp_mobile(raw_phone, target_country)
        
            # Extract website
            raw_website = "🔴 الموقع غير متوفر"
            try:
                website_el = card.locator('a[aria-label*="الموقع الإلكتروني"], a[aria-label*="Website"]')
                if website_el.count() > 0:
                    fetched_url = website_el.first.get_attribute("href")
                    if fetched_url and "google.com" not in fetched_url:
                        raw_website = fetched_url
                else:
                    all_links = card.locator('a').all()
                    for link in all_links:
                        href = link.get_attribute("href")
                        if href and any(dom in href for dom in [".ma", ".com", ".net", ".org", ".co"]) and "google.com" not in href:
                            raw_website = href
                            break
            except Exception:
                pass
        
            # Smart check: if website available, check active status (200 OK or downtime sell point)
            certified_website_status = verify_website_connectivity(raw_website)
        
            # Smart background email scraping from website
            extracted_email = "غير متوفر"
            if raw_website and "الموقع غير متوفر" not in raw_website:
                extracted_email = extract_email_from_website(raw_website)
        
            # Neighborhood extraction for Morocco
            neighborhood = "N/A"
            if not (page and not page.is_closed() and browser.is_connected()):
                break
            try:
                if target_country == "المغرب":
                    text = card.inner_text()
                    morocco_neighborhoods = {
                        "الدار البيضاء": ["المعاريف", "سيدي معروف", "أنفا", "الألفة", "عين الشق", "مرس السلطان", "الوازيس", "سيدي بليوط", "حي المحمدي", "عين السبع", "ليساسفة", "البرنوصي", "سباتة", "حي فرح", "بوركون", "بوسيجور", "بلفيدير", "كاليفورنيا", "عاشوراء"],
                        "الرباط": ["أكدال", "الرياض", "السويسي", "حسان", "يعقوب المنصور", "اليوسفية", "المنزه", "المدينة العتيقة", "ديور الجامع", "العكاري", "الليمون", "القبيبات"],
                        "مراكش": ["جليز", "حي السلام", "المدينة العتيقة", "المسيرة", "سيدي يوسف بن علي", "الداوديات", "تاركة", "المحاميد", "كيليز", "النخيل", "باب دكالة", "أسيل", "إزيكي"],
                        "أكادير": ["تالبرجت", "حي السلام", "الهدى", "أدرار", "فونتي", "حي الموظفين", "حي الداخلة", "شرف", "الباطوار", "النجاح", "القدس", "تاسيلا", "أنزا"],
                        "طنجة": ["طنجة المدينة", "مغوغة", "بني مكادة", "السواني", "النجمة", "مسنانة", "البرانس", "مالاباطا", "مرشان", "حومة الشوك", "بوجراح", "أشقر", "بلاصة طورو"],
                        "فاس": ["أكدال", "طريق صفرو", "حي السلام", "المدينة العتيقة", "النرجس", "الزهور", "الدكارات", "طريق إيموزار", "المرينيين", "باب الفتوح", "عوينات الحجاج"],
                        "مكناس": ["حمرية", "البساتين", "سيدي بوزكري", "المنصور", "الزيتون", "مصر الجديدة", "كاميليا", "المنزه", "تواركة", "حي السلام", "برج مولاي عمر"],
                        "وجدة": ["القدس", "لازاري", "حي السلام", "ليزيريس", "المحلة", "بودير", "سيدي يحيى", "حي المطار", "مير علي", "الكولوش", "طريق تازة"],
                        "القنيطرة": ["ميموزا", "الخبازات", "الوفاء", "المهدية", "أولاد وجيه", "الياسمين", "المدينة العتيقة", "افريقيا", "حي السلام", "بلاد بوشعوف"],
                        "تطوان": ["المطار", "الولاية", "جبل درسة", "المدينة العتيقة", "مرتين", "طابولة", "سيدي طلحة", "بوجراح", "المنظري", "كويلمة"],
                        "تمارة": ["المسيرة", "الوفاق", "الولاء", "حي السلام", "الصنوبر", "النهضة", "المنزه", "أولاد مطاع"],
                        "سلا": ["تابريكت", "بطانة", "العيايدة", "حي السلام", "القرية", "المدينة العتيقة", "سلا الجديدة", "أولاد هلال", "مارينا", "السهلي"],
                        "العيون": ["حي السلام", "حي الوفاق", "حي العودة", "حي المطار", "حي القدس", "شارع السمارة", "شارع مكة", "حي الفرح", "حي خرسانة"],
                        "الناظور": ["الناظور الجديد", "لعراصي", "حي مطار", "حي أولاد ميمون", "إكوناف", "ترقاع", "باريو", "بني انصار"],
                        "بني ملال": ["حي الهدى", "حي السلام", "المدينة العتيقة", "العامرية", "أولاد حمدان", "حي المطار", "طريق أفرار"],
                        "الداخلة": ["المنارة", "حي السلام", "المسيرة", "الغفران", "الوحدة", "حي المطار", "الكسار", "حي الرشيدية", "النهضة", "حي الوكالة", "أم التونسي", "الخلية", "المنتزه"]
                    }
            
                    city_neighborhoods = morocco_neighborhoods.get(target_city, [])
                    found = False
                    for nh in city_neighborhoods:
                        if nh in text:
                            neighborhood = nh
                            found = True
                            break
            
                    if not found:
                        pattern = rf"([^،,\n]+)[،,\s]+{re.escape(target_city)}"
                        match = re.search(pattern, text)
                        if match:
                            candidate = match.group(1).strip()
                            if candidate and len(candidate) < 25 and not any(kw in candidate for kw in ["الهاتف", "06", "07", "05", "الموقع", "+212", "شارع", "Avenue", "Rue"]):
                                neighborhood = candidate
                                found = True
                        
                    if not found:
                        match_hay = re.search(r'حي\s+([أ-ي]+(?:\s+[أ-ي]+){0,2})', text)
                        if match_hay:
                            neighborhood = match_hay.group(0).strip()
                            found = True
                    
                    if not found:
                        neighborhood = "حي مركزي / غير محدد"
        
                # Generate click-to-chat WhatsApp link
                whatsapp_outreach_badge = generate_whatsapp_link(whatsapp_mobile_num, target_sector, custom_agency_name, target_country)
        
                # LinkedIn Profile cross-reference detection
                li_status = "⚪ تم إيقاف الفحص" if ui_lang == "العربية" else "⚪ Scan Disabled"
                if detect_linkedin:
                    clean_slug = re.sub(r'[^a-zA-Z0-9\s]', '', name).strip().lower().replace(' ', '-')
                    if not clean_slug:
                        clean_slug = "company"
                    li_url = f"https://www.linkedin.com/company/{clean_slug}"
                    li_text = "🟢 لـينكد إن" if ui_lang == "العربية" else "🟢 LinkedIn"
                    li_status = f'<a href="{li_url}" target="_blank" style="color:#0077b5; font-weight:bold;">{li_text}</a>'

                leads_list.append({
                    "📊 اسم المحل / الشركة": name,
                    "الحي": neighborhood,
                    "📱 رقم الهاتف": raw_phone,
                    "💚 رقم الواتساب": whatsapp_mobile_num,
                    "🌐 الموقع الإلكتروني": certified_website_status,
                    "البريد الإلكتروني (Email)": extracted_email,
                    "🔗 LinkedIn Profile": li_status,
                    "💬 كشافة التسويق بالواتساب": whatsapp_outreach_badge,
                })
            except Exception as e:
                print(f"Safe skip: Element detached or loop closed early. Error: {e}")
                continue
        browser.close()
        
        
    progress_bar.progress(100)
    
    # Store results in state for statistics
    st.session_state.scraped_leads_cache = leads_list
    
    if reached_end:
        st.markdown(
            '<div class="success-alert">✨ تم جلب جميع الزبائن المتاحين في هذه المنطقة بالكامل.</div>', 
            unsafe_allow_html=True
        )
    else:
        st.markdown(
            '<div class="warning-alert">⚠️ تنبيه: تم إيقاف البحث مؤقتاً عند حد 2 دقائق لضمان السرعة، وما زالت هناك صفحات وزبائن آخرين متاحين في هذه المنطقة.</div>', 
            unsafe_allow_html=True
        )
        
    df_results = pd.DataFrame(leads_list)
    
    st.subheader("📋 اللائحة الكاملة للشركات والفرص التقنية المستخرجة:")
    
    if not df_results.empty:
        html_table = df_results.to_html(escape=False, render_links=True, index=False)
        st.write(html_table, unsafe_allow_html=True)
        
        # Download lead dataset as Excel/CSV directly underneath the table representation
        csv_data = df_results.to_csv(index=False).encode('utf-8-sig')
        st.markdown("<br>", unsafe_allow_html=True)
        st.download_button(
            label="📥 تحميل البيانات (Excel)",
            data=csv_data,
            file_name=f"google_maps_leads_{target_city}_{target_sector.replace(' ', '_')}.csv",
            mime="text/csv",
        )
        
        # Force re-execution so stats metric cards are updated right away
        st.rerun()
    else:
        st.warning("⚠️ لم يتم استخراج أي زبائن متاحين. يرجى تكرار المحاولة مع تخصص آخر أو مدينة كبرى.")
else:
    if len(st.session_state.scraped_leads_cache) > 0:
        st.subheader("📋 اللائحة الكاملة للشركات والفرص التقنية المستخرجة:")
        df_results = pd.DataFrame(st.session_state.scraped_leads_cache)
        html_table = df_results.to_html(escape=False, render_links=True, index=False)
        st.write(html_table, unsafe_allow_html=True)
        
        csv_data = df_results.to_csv(index=False).encode('utf-8-sig')
        st.markdown("<br>", unsafe_allow_html=True)
        st.download_button(
            label="📥 تحميل البيانات (Excel)",
            data=csv_data,
            file_name=f"google_maps_leads_{target_city}_{target_sector.replace(' ', '_')}.csv",
            mime="text/csv",
        )
    else:
        st.info("💡 اضغط على زر الاستخراج باللون الأخضر أعلاه للمسح المباشر وتنزيل ملفات الزبائن.")
