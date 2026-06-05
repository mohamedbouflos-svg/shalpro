class ScoringEngine:
    @staticmethod
    def calculate_seo_score(web_data):
        if web_data.get("status") != "Online":
            return 0
        
        score = 20 # Base for being online
        if web_data.get("ssl_secure"): score += 20
        if web_data.get("has_h1"): score += 30
        if web_data.get("has_meta_desc"): score += 30
        return score

    @staticmethod
    def qualify_lead(lead_data, web_data):
        digital_score = 0
        
        # Phone presence
        if lead_data.get("phone"): digital_score += 10
        if lead_data.get("whatsapp"): digital_score += 20
        
        # Web presence
        if web_data.get("status") == "Online":
            digital_score += 30
            seo_score = ScoringEngine.calculate_seo_score(web_data)
            digital_score += (seo_score * 0.2) # Max 20 pts from SEO
            
            # Social presence
            socials = web_data.get("social_links", {})
            if socials.get("linkedin"): digital_score += 10
            if socials.get("facebook") or socials.get("instagram"): digital_score += 10
            
        # Classification Algorithm
        # HOT: No website, or terrible SEO, but has contact info (Needs immediate digital service)
        # WARM: Has website, but missing social or SSL
        # COLD: Perfect digital presence (Harder to sell digital services to)
        
        classification = "Cold Lead"
        opportunity = []
        
        if web_data.get("status") != "Online":
            classification = "HOT LEAD 🔥"
            opportunity.append("Needs Website Development")
        else:
            seo = ScoringEngine.calculate_seo_score(web_data)
            if seo < 50:
                classification = "HOT LEAD 🔥"
                opportunity.append("Needs Severe SEO Overhaul")
            elif seo < 80:
                classification = "WARM LEAD ⚡"
                opportunity.append("Needs SEO Optimization")
                
            socials = web_data.get("social_links", {})
            if not socials.get("facebook") and not socials.get("instagram"):
                if classification != "HOT LEAD 🔥": classification = "WARM LEAD ⚡"
                opportunity.append("Needs Social Media Management")
                
        if not lead_data.get("whatsapp"):
            opportunity.append("Needs WhatsApp API / Smart Contact")

        return {
            "score": min(int(digital_score), 100),
            "seo_score": ScoringEngine.calculate_seo_score(web_data),
            "classification": classification,
            "opportunities": ", ".join(opportunity)
        }
