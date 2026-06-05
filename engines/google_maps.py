import re
import time
import urllib.parse
import csv  # 💡 تم إضافة الاستيراد هنا لحفظ البيانات فورا
from playwright.sync_api import sync_playwright

class GoogleMapsEngine:
    def __init__(self, headless=True):
        self.headless = headless

    def extract_whatsapp_mobile(self, phone, country=""):
        if not phone or phone == "📱 الهاتف غير متوفر":
            return "📱 غير متوفر"
        
        cleaned_phone = "".join(filter(str.isdigit, phone))
        
        if 9 <= len(cleaned_phone) <= 15:
            if phone.startswith("+"):
                return "+" + cleaned_phone
            elif len(cleaned_phone) == 10 and (country in ["United States", "Canada"] or cleaned_phone.startswith("1")):
                return "+1" + cleaned_phone
            return cleaned_phone
            
        return phone

    def perform_search(self, query, max_leads=200, target_country="المغرب", status_callback=None, progress_callback=None):
        results = []
        with sync_playwright() as p:
            # 💡 تشغيل مباشر ونقي يعتمد على متصفح Docker الافتراضي بنسبة 100%
            browser = p.chromium.launch(headless=self.headless)

            context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
            page = context.new_page()
            page.set_default_timeout(0)
            page.set_default_navigation_timeout(0)

            # ── الإعدادات والبحث ──────────────────────────────────────────
            if status_callback: status_callback("Initializing map engines...")
            try:
                page.goto("https://www.google.com/maps", timeout=60000, wait_until="domcontentloaded")
                time.sleep(3)
                
                try:
                    accept_buttons = page.locator('button:has-text("Accept all"), button:has-text("Tout accepter"), button:has-text("قَبول الكل")')
                    if accept_buttons.count() > 0:
                        accept_buttons.first.click(timeout=3000)
                        time.sleep(2)
                except Exception:
                    pass
                    
                search_box = page.locator('input#searchboxinput')
                if search_box.count() > 0:
                    search_box.first.fill(query)
                    page.keyboard.press("Enter")
                    time.sleep(5)
                else:
                    raise Exception("Search box missing")
            except Exception:
                clean_query = query.replace("|", " ").replace("  ", " ").strip()
                maps_url = f"https://www.google.com/maps/search/{urllib.parse.quote(clean_query)}"
                try:
                    page.goto(maps_url, timeout=60000, wait_until="domcontentloaded")
                    time.sleep(5)
                except Exception:
                    pass

            if status_callback: status_callback("Commencing Deep Map scrolling...")

            scroll_count = 0
            previous_unique = 0
            stagnant_scrolls = 0

            while True:
                place_links = page.locator("a[href*='/maps/place/']").all()
                unique_hrefs = set(a.get_attribute("href") or "" for a in place_links)
                unique_hrefs.discard("")
                current_unique = len(unique_hrefs)

                if status_callback:
                    status_callback(f"Scrolling... {current_unique} unique leads found so far (target: {max_leads})")
                if progress_callback:
                    try:
                        progress_callback(min(40, int((current_unique / max(max_leads, 1)) * 40)))
                    except Exception:
                        pass

                if current_unique >= max_leads:
                    break

                try:
                    end_of_list = (
                        page.locator("text=You've reached the end of the list").is_visible() or
                        page.locator("text=لقد وصلت إلى نهاية القائمة").is_visible()
                    )
                    if end_of_list:
                        break
                except Exception:
                    pass

                try:
                    feed = page.locator("div[role='feed']")
                    if feed.count() > 0:
                        feed.hover()
                        page.evaluate("""
                            const feed = document.querySelector("div[role='feed']");
                            if (feed) { feed.scrollTop += 800; }
                        """)
                    else:
                        articles = page.locator('div[role="article"]')
                        if articles.count() > 0:
                            try:
                                articles.nth(articles.count() - 1).scroll_into_view_if_needed(timeout=3000)
                            except Exception:
                                pass
                        page.mouse.wheel(0, 1500)
                except Exception:
                    page.mouse.wheel(0, 1500)

                time.sleep(2)
                scroll_count += 1

                if current_unique == previous_unique:
                    stagnant_scrolls += 1
                    if stagnant_scrolls >= 3:
                        try:
                            feed = page.locator("div[role='feed']")
                            if feed.count() > 0:
                                page.evaluate("""
                                    const feed = document.querySelector("div[role='feed']");
                                    if (feed) { 
                                        feed.scrollTop -= 200;
                                        setTimeout(() => { feed.scrollTop += 1000; }, 500);
                                    }
                                """)
                        except Exception:
                            pass
                else:
                    stagnant_scrolls = 0

                previous_unique = current_unique
            
            if status_callback: status_callback("Deep scroll complete. Initiating DOM extraction...")
            
            place_cards = page.locator('div[role="article"]').all()
            if not place_cards:
                place_cards = page.locator("//a[contains(@href, '/maps/place/')]/ancestor::div[1]").all()
                if not place_cards:
                    place_cards = page.locator('a[href*="/maps/place/"]').all()
            
            total_found = len(place_cards)
            
            # 💡 إنشاء أو تصفير ملف الحفظ المؤقت قبل بدء الدوران على النتائج
            csv_file_path = "temp_leads.csv"
            fieldnames = ["name", "phone", "whatsapp", "website", "maps_url"]
            with open(csv_file_path, mode="w", encoding="utf-8", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
            
            for index, card in enumerate(place_cards):
                if progress_callback:
                    try:
                        progress_callback(min(40 + int((index+1)/(total_found+1)*40), 80))
                    except Exception:
                        pass
                
                if not (page and not page.is_closed() and browser.is_connected()):
                    break
                try:
                    name_el = card.locator('a[href*="/maps/place/"]')
                    name = name_el.first.get_attribute("aria-label") or name_el.first.inner_text() if name_el.count() > 0 else f"Unnamed Lead #{index + 1}"
                    
                    raw_website = ""
                    web_el = card.locator('a[aria-label*="الموقع الإلكتروني"], a[aria-label*="Website"], a[aria-label*="Site Web"], a[aria-label*="Sitio web"]')
                    if web_el.count() > 0:
                        raw_website = web_el.first.get_attribute("href")
                        
                    maps_url = name_el.first.get_attribute("href") if name_el.count() > 0 else ""
                    
                    raw_phone = ""
                    all_text = ""
                    all_html = ""
                    
                    if name_el.count() > 0:
                        try:
                            name_el.first.click(timeout=3000)
                            page.wait_for_timeout(3500)
                            
                            all_text = page.inner_text('body')
                            all_html = page.inner_html('body')
                            
                            phone_els = page.locator("a[href^='tel:'], button[data-item-id^='phone:'], [data-element-id='phone']").all()
                            for el in phone_els:
                                href_attr = el.get_attribute("href")
                                data_attr = el.get_attribute("data-item-id")
                                if href_attr and href_attr.startswith("tel:"):
                                    raw_phone = href_attr.replace("tel:", "")
                                    break
                                elif data_attr and data_attr.startswith("phone:"):
                                    raw_phone = data_attr.replace("phone:", "").replace("tel:", "")
                                    break
                                else:
                                    txt = el.inner_text()
                                    if txt and any(char.isdigit() for char in txt):
                                        raw_phone = txt
                                        break
                                        
                            if raw_phone:
                                pre_clean = raw_phone.replace("phone:tel:", "").replace("tel:", "").replace("phone:", "").replace(" ", "")
                                raw_phone_digits = "".join(filter(str.isdigit, pre_clean))
                                if pre_clean.startswith("+"):
                                    raw_phone = "+" + raw_phone_digits
                                else:
                                    raw_phone = raw_phone_digits
                                    
                            back_btn = page.locator('button[aria-label*="Back"], button[aria-label*="رجوع"], button[aria-label*="Retour"], button[aria-label*="Volver"]')
                            if back_btn.count() > 0:
                                back_btn.first.click(timeout=3000)
                                time.sleep(1)
                                
                            try:
                                feed = page.locator("div[role='feed']")
                                if feed.count() > 0:
                                    feed.hover()
                            except Exception:
                                pass
                        except Exception:
                            all_text = card.inner_text()
                            all_html = card.inner_html()
                    else:
                        all_text = card.inner_text()
                        all_html = card.inner_html()

                    if not raw_phone:
                        phone_match = re.search(r'(?:\+?1[\s\-\.]?\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4})|(?:\+33|0)[\s\-\.]?[1-7](?:[\s\-\.]?\d{2}){4}|(?:\+34)?[\s\-\.]?[679](?:[\s\-\.]?\d{2}){4}|(?:\+212|0)[\s\-\.]?[5-9](?:[\s\-\.]?\d){8}|(?:\+?\d{1,3}[\s\-\.]?\(?\d{2,4}\)?[\s\-\.]?\d{3,4}[\s\-\.]?\d{3,4})', all_text)
                        if phone_match: raw_phone = re.sub(r'[\s\-\.\(\)]', '', phone_match.group(0))

                    wa_number = self.extract_whatsapp_mobile(raw_phone, target_country)
                    
                    wa_link_match = re.search(r'(?:wa\.me/|api\.whatsapp\.com/send\?phone=|chat\.whatsapp\.com/|whatsapp://send\?phone=)(\+?\d+)', all_html)
                    if wa_link_match:
                        wa_number = wa_link_match.group(1)
                    
                    lead_data = {
                        "name": name,
                        "phone": raw_phone if raw_phone else "غير متوفر",
                        "whatsapp": wa_number if wa_number else "غير متوفر",
                        "website": raw_website if raw_website else "",
                        "maps_url": maps_url if maps_url else ""
                    }
                    
                    results.append(lead_data)
                    
                    # 💡 حفظ فوري لكل ليد يتم استخراجه مباشرة في الملف لتفادي ضياعه عند الـ Timeout
                    with open(csv_file_path, mode="a", encoding="utf-8", newline="") as f:
                        writer = csv.DictWriter(f, fieldnames=fieldnames)
                        writer.writerow(lead_data)

                except Exception as e:
                    continue
            
            browser.close()
        
        if status_callback: status_callback(f"Maps extraction completed. Discovered {len(results)} base leads...")
        return results
