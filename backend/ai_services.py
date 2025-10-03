import requests
import json
from config import GEMINI_API_KEY, IMAGEN_API_KEY

# نقطة نهاية API لنموذج Gemini (يمكن تغييرها الى gemini-pro اذا كنت تملك صلاحية الوصول)
# تاكد من ان مفتاح API الخاص بك يدعم النموذج الذي تختاره
GEMINI_API_BASE_URL = "[https://generativelanguage.googleapis.com/v1beta/models/](https://generativelanguage.googleapis.com/v1beta/models/)"
MODEL_NAME_TEXT = "gemini-pro" # تم التغيير الى gemini-pro لدعم النصوص الطويلة
MODEL_NAME_IMAGE_GEN_PROMPT = "gemini-pro" # نموذج لتوليد وصف الصورة
MODEL_NAME_STYLE_SUGGESTION = "gemini-pro" # نموذج لاقتراح الانماط

# نقطة نهاية API لنموذج Imagen (لتوليد الصور)
IMAGEN_API_URL = "[https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict](https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict)"

def _call_gemini_api(prompt_content: list, model_name: str, response_mime_type: str = "text/plain", response_schema: dict = None) -> str | dict:
    """
    وظيفة مساعدة لاستدعاء Gemini API.
    """
    if not GEMINI_API_KEY:
        raise ValueError(f"Gemini API key not found for model {model_name}.")

    payload = {"contents": prompt_content}
    if response_mime_type == "application/json" and response_schema:
        payload["generationConfig"] = {
            "responseMimeType": response_mime_type,
            "responseSchema": response_schema
        }
    elif response_mime_type:
        payload["generationConfig"] = {
            "responseMimeType": response_mime_type
        }

    headers = {'Content-Type': 'application/json'}
    params = {'key': GEMINI_API_KEY}
    api_url = f"{GEMINI_API_BASE_URL}{model_name}:generateContent"

    try:
        response = requests.post(api_url, headers=headers, params=params, data=json.dumps(payload))
        response.raise_for_status() # رفع استثناء للاكواد 4xx/5xx

        result = response.json()
        if result.get('candidates') and result['candidates'][0].get('content') and result['candidates'][0]['content'].get('parts'):
            text_output = result['candidates'][0]['content']['parts'][0].get('text', '').strip()
            if response_mime_type == "application/json":
                return json.loads(text_output)
            return text_output
        else:
            print(f"فشل الحصول على رد من Gemini ({model_name}): {result}")
            # تفاصيل الخطا من API Google
            error_details = result.get('error', {}).get('message', 'تفاصيل غير متوفرة.')
            raise Exception(f"فشل الحصول على رد من Gemini: {error_details}")

    except requests.exceptions.RequestException as e:
        print(f"خطا في الاتصال بـ Gemini API ({model_name}): {e}")
        raise Exception(f"خطا في الاتصال بـ Gemini API: {e}")
    except json.JSONDecodeError as e:
        print(f"خطا في تحليل JSON من Gemini ({model_name}): {e}")
        raise Exception(f"خطا في تحليل JSON من Gemini: {e}. الرد: {response.text if 'response' in locals() else 'لا يوجد رد'}")
    except Exception as e:
        print(f"خطا غير متوقع اثناء استدعاء Gemini API ({model_name}): {e}")
        raise Exception(f"خطا غير متوقع اثناء استدعاء Gemini API: {e}")

def generate_cover_prompt_from_script(script_text: str) -> str:
    """
    يولد وصفا لغلاف كتاب باستخدام نموذج Gemini بناء على نص الكتاب.
    """
    try:
        prompt = f"""
        Generate a concise, creative, and highly descriptive prompt for the FRONT book cover based on the following book script.
        Focus on key visual themes, mood, central elements, and artistic style. This prompt will be used by an advanced AI image generation model like Imagen.
        The prompt should be in English and directly usable.

        Book script excerpt:
        ---
        {script_text[:10000]} # Limit input to avoid token limits. If content is longer, provide a summary.
        ---
        """
        return _call_gemini_api([{"role": "user", "parts": [{"text": prompt}]}], MODEL_NAME_IMAGE_GEN_PROMPT)
    except Exception as e:
        print(f"Error generating front cover prompt: {e}")
        return "A beautiful abstract book cover with subtle colors."

def generate_front_back_cover_prompts(book_content: str) -> dict:
    """
    يولد وصفا للغلاف الامامي والخلفي باستخدام نموذج Gemini بناء على محتوى الكتاب.
    """
    try:
        prompt = f"""
        You are a creative book cover designer AI. Based on the following book content, generate two distinct, concise, and compelling prompts:
        1.  `front_cover_prompt`: A prompt suitable for an AI image generation model (like Imagen) for the FRONT cover. Focus on key visual themes, mood, and central elements.
        2.  `back_cover_text`: A short, engaging summary or blurb for the BACK cover. This should entice readers and capture the essence of the book. It should be plain text, suitable for print.

        Provide the output as a JSON object with keys "front_cover_prompt" and "back_cover_text".
        Book Content:
        ---
        {book_content[:4000]} # Limit content to avoid token limits
        ---
        """
        response_schema = {
            "type": "OBJECT",
            "properties": {
                "front_cover_prompt": {"type": "STRING"},
                "back_cover_text": {"type": "STRING"}
            }
        }
        return _call_gemini_api([{"role": "user", "parts": [{"text": prompt}]}], MODEL_NAME_IMAGE_GEN_PROMPT, response_mime_type="application/json", response_schema=response_schema)
    except Exception as e:
        print(f"Error generating front/back cover prompts: {e}")
        return {"front_cover_prompt": "A generic front cover", "back_cover_text": "A generic back cover summary."}

def generate_image_from_prompt(image_prompt: str) -> str:
    """
    يولد صورة غلاف باستخدام نموذج Imagen بناء على وصف نصي.
    يعيد رابط Base64 للصورة.
    """
    if not IMAGEN_API_KEY:
        print("Warning: Imagen API key not found. Using placeholder image.")
        return "[https://placehold.co/600x800/E0E0E0/333333?text=Cover+Placeholder](https://placehold.co/600x800/E0E0E0/333333?text=Cover+Placeholder)"

    try:
        payload = {
            "instances": {"prompt": image_prompt},
            "parameters": {"sampleCount": 1}
        }
        headers = {'Content-Type': 'application/json'}
        params = {'key': IMAGEN_API_KEY}

        response = requests.post(IMAGEN_API_URL, headers=headers, params=params, data=json.dumps(payload))
        response.raise_for_status()

        result = response.json()
        if result.get('predictions') and result['predictions'][0].get('bytesBase64Encoded'):
            return f"data:image/png;base64,{result['predictions'][0]['bytesBase64Encoded']}"
        else:
            print(f"فشل في توليد الصورة من الوصف: {result}")
            return "[https://placehold.co/600x800/E0E0E0/333333?text=Cover+Placeholder](https://placehold.co/600x800/E0E0E0/333333?text=Cover+Placeholder)"

    except requests.exceptions.RequestException as e:
        print(f"خطأ في الاتصال بـ Imagen API (generate_image_from_prompt): {e}")
        return "[https://placehold.co/600x800/E0E0E0/333333?text=Cover+Placeholder](https://placehold.co/600x800/E0E0E0/333333?text=Cover+Placeholder)"
    except Exception as e:
        print(f"خطأ غير متوقع أثناء توليد الصورة: {e}")
        return "[https://placehold.co/600x800/E0E0E0/333333?text=Cover+Placeholder](https://placehold.co/600x800/E0E0E0/333333?text=Cover+Placeholder)"

def chat_with_gemini(message: str, chat_history: list) -> str:
    """
    يتفاعل مع نموذج Gemini للدردشة.
    """
    try:
        # إضافة الرسالة الجديدة إلى سجل الدردشة
        full_chat_history = chat_history + [{"role": "user", "parts": [{"text": message}]}]
        return _call_gemini_api(full_chat_history, MODEL_NAME_TEXT)
    except Exception as e:
        print(f"Error chatting with Gemini: {e}")
        return "عذرا، حدث خطأ اثناء الدردشة مع الذكاء الاصطناعي."

def suggest_book_style_settings(book_description: str) -> dict:
    """
    يقترح إعدادات تصميم كتاب (ألوان، خطوط، هوامش) باستخدام نموذج Gemini
    بناءً على وصف الكتاب.
    """
    try:
        prompt = f"""
        Based on the following book description, suggest a JSON object containing professional design settings for a book PDF.
        The settings should include:
        - textColor (hex code)
        - backgroundColor (hex code)
        - fontFamily (e.g., 'Inter' or 'Amiri' for Arabic)
        - fontSize (e.g., '12pt')
        - lineHeight (e.g., '1.5')
        - textAlign (e.g., 'right', 'left', 'center', 'justify')
        - titleColor (hex code)
        - titleFontSize (e.g., '36pt')
        - pageMarginTop (e.g., '20mm')
        - pageMarginBottom (e.g., '20mm')
        - pageMarginLeft (e.g., '25mm')
        - pageMarginRight (e.g., '25mm')
        - paragraphSpacing (e.g., '1em')
        - paragraphIndent (e.g., '1.5em')
        - heading1FontSize (e.g., '24pt')
        - heading2FontSize (e.g., '18pt')
        - headingColor (hex code)
        - heading1Alignment (e.g., 'center')
        - heading2Alignment (e.g., 'right')
        - headerFontSize (e.g., '10pt')
        - footerFontSize (e.g., '10pt')
        - headerColor (hex code)
        - footerColor (hex code)
        - coverWidth (e.g., '80%')
        - coverHeight (e.g., '70%')
        - coverBorderRadius (e.g., '15px')
        - coverShadow (e.g., '0 10px 20px rgba(0,0,0,0.25)')
        - imageAlignment (e.g., 'center')
        - backCoverFontSize (e.g., '12pt')
        - backCoverTextColor (hex code)
        - backCoverBackgroundColor (hex code)

        Ensure the JSON is valid and contains all these keys.
        Book description: "{book_description[:2000]}..." # تم زيادة حد الوصف
        """
        response_schema = {
            "type": "OBJECT",
            "properties": {
                "textColor": {"type": "STRING"},
                "backgroundColor": {"type": "STRING"},
                "fontFamily": {"type": "STRING"},
                "fontSize": {"type": "STRING"},
                "lineHeight": {"type": "STRING"},
                "textAlign": {"type": "STRING"},
                "titleColor": {"type": "STRING"},
                "titleFontSize": {"type": "STRING"},
                "pageMarginTop": {"type": "STRING"},
                "pageMarginBottom": {"type": "STRING"},
                "pageMarginLeft": {"type": "STRING"},
                "pageMarginRight": {"type": "STRING"},
                "paragraphSpacing": {"type": "STRING"},
                "paragraphIndent": {"type": "STRING"},
                "heading1FontSize": {"type": "STRING"},
                "heading2FontSize": {"type": "STRING"},
                "headingColor": {"type": "STRING"},
                "heading1Alignment": {"type": "STRING"},
                "heading2Alignment": {"type": "STRING"},
                "headerFontSize": {"type": "STRING"},
                "footerFontSize": {"type": "STRING"},
                "headerColor": {"type": "STRING"},
                "footerColor": {"type": "STRING"},
                "coverWidth": {"type": "STRING"},
                "coverHeight": {"type": "STRING"},
                "coverBorderRadius": {"type": "STRING"},
                "coverShadow": {"type": "STRING"},
                "imageAlignment": {"type": "STRING"},
                "backCoverFontSize": {"type": "STRING"},
                "backCoverTextColor": {"type": "STRING"},
                "backCoverBackgroundColor": {"type": "STRING"}
            }
        }
        return _call_gemini_api([{"role": "user", "parts": [{"text": prompt}]}], MODEL_NAME_STYLE_SUGGESTION, response_mime_type="application/json", response_schema=response_schema)
    except Exception as e:
        print(f"Error suggesting style settings: {e}")
        return {}

def format_book_script_with_ai(raw_script: str) -> str:
    """
    يأخذ نصًا خامًا ويقوم بتنسيقه إلى HTML منظم باستخدام نموذج Gemini.
    """
    if not GEMINI_API_KEY:
        print("Warning: Gemini API key not found. Cannot format script with AI.")
        return f"<div dir='rtl' style='text-align: right;'><p>{raw_script}</p></div>"

    try:
        # تم توسيع التعليمات لنموذج الذكاء الاصطناعي لإنتاج HTML أفضل
        prompt = f"""
        You are a highly skilled professional book formatter and layout designer.
        Your task is to convert the following raw book script into perfectly structured and semantically rich HTML, optimized for PDF generation.
        Follow these strict guidelines:
        1.  Identify and use appropriate HTML tags:
            * Main Chapter Titles: Use `<h1>` for primary chapter titles. Each `<h1>` should implicitly start a new page unless it's a very short section.
            * Section Headings: Use `<h2>` for major sections within a chapter.
            * Sub-headings: Use `<h3>` for smaller sub-sections.
            * Paragraphs: Wrap all body text in `<p>` tags.
            * Lists: Use `<ul>` for unordered lists and `<ol>` for ordered lists, with `<li>` for list items.
            * Emphasis: Use `<strong>` for bold text and `<em>` for italic text.
            * Blockquotes: Use `<blockquote>` for quoted passages.
            * Code Blocks: Use `<pre><code>` for code snippets.
            * Tables: If tabular data is present, convert it into standard `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` tags.
        2.  **Crucially, ensure correct Arabic text flow:** Always apply `dir="rtl"` and `text-align: right;` to the main content div or relevant block elements if the content is Arabic, unless a different alignment is explicitly clear.
        3.  **Image Handling:** If the raw script includes image URLs (e.g., "Image: [URL_HERE]"), convert them to `<img src="URL" alt="Description">` tags. Assume images should be centered unless context implies otherwise. You can optionally add a `class="align-center"`, `class="align-left"`, or `class="align-right"` based on context, but do not create image URLs.
        4.  **Preserve Content:** Maintain the original content, spelling, grammar, and meaning precisely. Do not add any extra commentary or introductory/concluding remarks outside the generated HTML.
        5.  **Clean HTML:** Output clean, valid, and well-indented HTML. Do not include `<html>`, `<head>`, or `<body>` tags; only the content that would go inside `<body>`.
        6.  **Remove any markdown-like backticks or formatting indicators:** Ensure the output is pure HTML.
        7.  **Handle line breaks:** Convert significant double line breaks into new paragraphs, and single line breaks within paragraphs should be treated as soft breaks (or just part of the flow).

        Raw Book Script (limit to first 5000 characters for processing):
        ---
        {raw_script[:5000]}
        ---

        Example of desired HTML structure:
        <h1>عنوان الفصل الأول</h1>
        <p>هذه فقرة افتتاحية للفصل. إنها طويلة بما يكفي لإظهار التنسيق.</p>

        <h2>قسم فرعي 1.1</h2>
        <p>فقرة أخرى هنا، تتحدث عن تفاصيل القسم الفرعي.</p>
        <ul>
            <li>عنصر قائمة 1</li>
            <li>عنصر قائمة 2</li>
        </ul>

        <h3>نقطة محددة</h3>
        <blockquote>هذا اقتباس مهم من مصدر خارجي. يجب أن يظهر بشكل مميز.</blockquote>

        <p>يمكن أن تظهر <strong>الكلمات المهمة</strong> بشكل <em>مشدد</em>. <img src="[https://example.com/image.jpg](https://example.com/image.jpg)" alt="وصف الصورة" class="align-center"></p>

        <h1>عنوان الفصل الثاني</h1>
        <p>فقرة افتتاحية للفصل الثاني.</p>
        <pre><code>
        // مثال على كود برمجي
        function helloWorld() {{
            console.log("Hello, World!");
        }}
        </code></pre>
        """
        return _call_gemini_api([{"role": "user", "parts": [{"text": prompt}]}], MODEL_NAME_TEXT)
    except Exception as e:
        print(f"خطأ في الاتصال بـ Gemini API (format_book_script_with_ai): {e}")
        return f"<div dir='rtl' style='text-align: right;'><p>{raw_script}</p></div>"

def generate_front_back_cover_prompts(book_content: str) -> dict:
    """
    يولد وصفًا للغلاف الأمامي والخلفي باستخدام نموذج Gemini بناءً على محتوى الكتاب.
    """
    if not GEMINI_API_KEY:
        print("Warning: Gemini API key not found. Cannot generate cover descriptions.")
        return {"front_cover_prompt": "A generic front cover", "back_cover_text": "A generic back cover summary."}

    try:
        prompt = f"""
        You are a creative book cover designer AI. Based on the following book content, generate two distinct, concise, and compelling prompts:
        1.  `front_cover_prompt`: A prompt suitable for an AI image generation model (like Imagen) for the FRONT cover. Focus on key visual themes, mood, and central elements.
        2.  `back_cover_text`: A short, engaging summary or blurb for the BACK cover. This should entice readers and capture the essence of the book. It should be plain text, suitable for print.

        Provide the output as a JSON object with keys "front_cover_prompt" and "back_cover_text".
        Book Content:
        ---
        {book_content[:4000]} # Limit content to avoid token limits
        ---
        """
        response_schema = {
            "type": "OBJECT",
            "properties": {
                "front_cover_prompt": {"type": "STRING"},
                "back_cover_text": {"type": "STRING"}
            }
        }
        return _call_gemini_api([{"role": "user", "parts": [{"text": prompt}]}], MODEL_NAME_IMAGE_GEN_PROMPT, response_mime_type="application/json", response_schema=response_schema)
    except Exception as e:
        print(f"خطأ في الاتصال بـ Gemini API (generate_front_back_cover_prompts): {e}")
        return {"front_cover_prompt": "A generic front cover", "back_cover_text": "A generic back cover summary."}