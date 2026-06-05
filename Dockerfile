FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

COPY . .

# تثبيت مكتبات البايثون
RUN pip install --no-cache-dir -r requirements.txt

# Render كيعتمد على البورت اللي كيعطيه هو تلقائياً، هاد السطر اختياري ولكن آمن
EXPOSE 10000

# تشغيل Streamlit بالطريقة الصحيحة مع قراءة الـ Port بشكل ديناميكي
CMD ["sh", "-c", "streamlit run app.py --server.port $PORT --server.address 0.0.0.0"]
