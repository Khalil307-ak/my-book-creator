import os
from dotenv import load_dotenv

# تحميل متغيرات البيئة من ملف .env
load_dotenv()

# مفاتيح API للذكاء الاصطناعي
# يجب عليك الحصول على هذه المفاتيح من Google Cloud Console
# وتخزينها في ملف .env (مثال: GEMINI_API_KEY="your_gemini_key")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
IMAGEN_API_KEY = os.getenv("IMAGEN_API_KEY", "")

# مجلد التحميل للملفات المؤقتة
UPLOAD_FOLDER = 'uploads'
# أنواع الملفات المسموح بها (غير مستخدمة حاليا ولكن يمكن توسيعها)
ALLOWED_EXTENSIONS = {'txt', 'pdf'}

# تأكد من وجود مجلد التحميل
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)