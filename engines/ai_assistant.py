class AIAssistantEngine:
    @staticmethod
    def generate_pitch(lead_data, web_data, score_data, industry):
        opportunities = score_data.get('opportunities', "")
        name = lead_data.get("name", "Business Owner")
        
        # Determine the core service to pitch based on the classification and gaps
        if "Needs Website Development" in opportunities:
            service = "تصميم وبناء موقع إلكتروني احترافي متكامل مع حجز المواعيد"
            email_subject = f"فرصة ذهبية لزيادة مبيعات {name} عبر التواجد الرقمي"
            reason = "بحثنا عنكم عبر الإنترنت ولم نجد موقعاً رسمياً يمثل علامتكم التجارية، مما يضيع عليكم عشرات العملاء شهرياً لصالح المنافسين."
        elif "Needs Severe SEO Overhaul" in opportunities:
            service = "هيكلة الموقع وتحسين محركات البحث (SEO) لضمان الصدارة في جوجل"
            email_subject = f"تحسين ظهور {name} وزيادة الزيارات المجانية بشكل مضاعف"
            reason = "قمنا بإجراء فحص تقني لموقعكم الحالي، ووجدنا أخطاء برمجية تمنعه من تصدر نتائج البحث، مما يجعل العثور عليكم صعباً للعملاء الجدد."
        elif "Needs Social Media Management" in opportunities:
            service = "إدارة الحملات الإعلانية والتسويق عبر السوشيال ميديا"
            email_subject = f"اقتراح استراتيجية تسويق رقمي حديثة لـ {name}"
            reason = "لاحظنا غياباً لعلامتكم التجارية على قنوات التواصل الاجتماعي، وهي القناة الأهم حالياً لاصطياد الفرص البيعية لقطاعكم."
        else:
            service = "تطوير تطبيقات الجوال أو نظم إدارة العملاء (CRM) المتطورة"
            email_subject = f"مرحباً! مقترح لترقية الأنظمة الرقمية لـ {name}"
            reason = "بما أنكم تمتلكون واجهة رقمية ممتازة، نقترح عليكم الخطوة القادمة لأتمتة أعمالكم وتقليل تكاليف التشغيل بأدوات الذكاء الاصطناعي."

        # Email Generation
        email_pitch = (
            f"الموضوع: {email_subject}\n\n"
            f"مرحباً فريق {name}،\n\n"
            f"{reason}\n\n"
            f"نحن وكالة تسويق وبرمجة متخصصة، ونقدم لكم مقترحاً شاملاً لـ: {service}.\n"
            f"هذا التطوير سيضمن لكم زيادة مباشرة في حجم الطلبات والظهور الاحترافي أمام عملائكم.\n\n"
            f"هل أنتم متاحون لمكالمة سريعة الأسبوع القادم لمناقشة التفاصيل؟\n"
            f"مع التحية."
        )

        # WhatsApp Generation
        wa_pitch = (
            f"مرحباً من فريق التطوير 🚀\n"
            f"تواصلنا معكم لأننا حددنا فرصة ضخمة لـ {name} في زيادة مبيعاتكم عبر الإنترنت.\n"
            f"{reason}\n"
            f"هل أنتم مهتمون بتطوير أعمالكم والحصول على نظام {service}؟ 📈"
        )

        return {
            "email_pitch": email_pitch,
            "whatsapp_pitch": wa_pitch,
            "improvement_suggestions": opportunities
        }
