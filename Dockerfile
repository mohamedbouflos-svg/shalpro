FROM mcr.microsoft.com/playwright/python:v1.60.0-jammy

WORKDIR /app

# نسخ جميع ملفات المشروع
COPY . .

# تثبيت مكتبات البايثون
RUN pip install --no-cache-dir -r requirements.txt

# فتح المنفذ
EXPOSE 10000

# أمر تشغيل Streamlit
CMD ["sh", "-c", "streamlit run app.py --server.port $PORT --server.address 0.0.0.0"]
