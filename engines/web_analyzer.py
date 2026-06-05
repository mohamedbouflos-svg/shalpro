import urllib.request
import re
import time
from bs4 import BeautifulSoup
import ssl
import socket
from urllib.parse import urlparse

class WebAnalyzerEngine:
    def __init__(self, timeout=12):
        self.timeout = timeout
        self.headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Safari/537.36'}

    def verify_ssl(self, url):
        try:
            domain = urlparse(url).netloc
            ctx = ssl.create_default_context()
            with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
                s.settimeout(5)
                s.connect((domain, 443))
            return True
        except Exception:
            return False

    def analyze_website(self, url):
        if not url or "http" not in url:
            return {"status": "No Website", "score": 0}
            
        metrics = {
            "status": "Online",
            "ssl_secure": False,
            "has_h1": False,
            "has_meta_desc": False,
            "emails": [],
            "social_links": {"linkedin": None, "facebook": None, "instagram": None, "twitter": None},
            "load_time": 0
        }
        
        try:
            req = urllib.request.Request(url, headers=self.headers)
            
            start_time = time.time()
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                html = response.read().decode('utf-8', errors='ignore')
                metrics['load_time'] = round(time.time() - start_time, 2)
                
            metrics['ssl_secure'] = self.verify_ssl(url)
            
            soup = BeautifulSoup(html, "html.parser")
            
            # Aggressive Deep Website Crawler for Contact/About forms
            urls_to_visit = []
            for link in soup.find_all('a', href=True):
                href = link['href'].lower()
                if ('contact' in href or 'about' in href or 'propos' in href) and len(urls_to_visit) < 3:
                    full_link = urllib.parse.urljoin(url, link['href'])
                    if full_link.startswith(url) and full_link not in urls_to_visit:
                        urls_to_visit.append(full_link)
            
            for sub_url in urls_to_visit:
                try:
                    sub_req = urllib.request.Request(sub_url, headers=self.headers)
                    with urllib.request.urlopen(sub_req, timeout=8) as sub_res:
                        html += " " + sub_res.read().decode('utf-8', errors='ignore')
                except Exception:
                    pass
            
            # Re-parse aggressive HTML aggregation for comprehensive social link metrics
            soup = BeautifulSoup(html, "html.parser")
            
            # SEO Metrics
            if soup.h1 and soup.h1.text.strip(): metrics['has_h1'] = True
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc and meta_desc.get("content"): metrics['has_meta_desc'] = True
            
            # Deep regex extraction block with international boundary definition
            emails = set(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', html))
            metrics['emails'] = list(emails)[:3]
            
            # Social links
            for link in soup.find_all('a', href=True):
                href = link['href'].lower()
                if 'linkedin.com/company' in href: metrics['social_links']['linkedin'] = href
                elif 'facebook.com' in href: metrics['social_links']['facebook'] = href
                elif 'instagram.com' in href: metrics['social_links']['instagram'] = href
                elif 'twitter.com' in href or 'x.com' in href: metrics['social_links']['twitter'] = href
                elif 'wa.me/' in href or 'api.whatsapp.com/send' in href or 'chat.whatsapp.com/' in href or 'whatsapp:' in href:
                    metrics['social_links']['whatsapp'] = link['href']
                
        except Exception as e:
            metrics["status"] = f"Offline / Error: {str(e)[:20]}"
            
        return metrics
