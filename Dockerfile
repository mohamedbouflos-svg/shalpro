FROM mcr.microsoft.com/playwright/python:v1.54.0-jammy

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

# 🔥 IMPORTANT: تحميل المتصفحات
RUN playwright install chromium
RUN playwright install-deps

EXPOSE 10000

CMD streamlit run app.py --server.port=$PORT --server.address=0.0.0.0
