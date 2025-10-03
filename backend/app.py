from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import uuid
from config import GEMINI_API_KEY # تم تصحيح استيراد مفتاح API
from ai_services import generate_cover_prompt_from_script, generate_image_from_prompt, chat_with_gemini, suggest_book_style_settings, format_book_script_with_ai, generate_front_back_cover_prompts
from pdf_generator import create_book_html, generate_pdf_from_html

app = Flask(__name__)
CORS(app)

PDF_OUTPUT_DIR = os.path.join(UPLOAD_FOLDER, 'pdfs')
if not os.path.exists(PDF_OUTPUT_DIR):
    os.makedirs(PDF_OUTPUT_DIR)

@app.route('/generate-book', methods=['POST'])
def generate_book():
    """
    نقطة نهاية API لتوليد غلاف الكتاب وملف PDF.
    """
    data = request.json
    ebook_title = data.get('ebookTitle', 'كتاب بدون عنوان')
    raw_book_script = data.get('bookScript', '') # الآن نستقبل النص الخام
    user_cover_prompt = data.get('coverPrompt', '')
    user_provided_cover_url = data.get('userProvidedCoverUrl', '')
    back_cover_text = data.get('backCoverText', '') # نص الغلاف الخلفي الجديد
    settings = data.get('settings', {})

    if not raw_book_script:
        return jsonify({"error": "الرجاء توفير نص الكتاب."}), 400

    generated_cover_url = ""
    try:
        # الخطوة 1: تنسيق النص الخام إلى HTML بواسطة AI
        # هذا هو التغيير الكبير: AI يقوم بالتنسيق قبل إرساله إلى PDF
        formatted_script_html = format_book_script_with_ai(raw_book_script)
        if not formatted_script_html:
            return jsonify({"error": "فشل الذكاء الاصطناعي في تنسيق نص الكتاب."}), 500

        if user_provided_cover_url:
            generated_cover_url = user_provided_cover_url
        else:
            if not user_cover_prompt:
                ai_generated_prompt = generate_cover_prompt_from_script(raw_book_script) # نستخدم النص الخام لتوليد وصف الغلاف
                cover_prompt_to_use = ai_generated_prompt
            else:
                cover_prompt_to_use = user_cover_prompt

            generated_cover_url = generate_image_from_prompt(cover_prompt_to_use)

        # الخطوة 3: إنشاء محتوى HTML للكتاب مع الغلاف والإعدادات (باستخدام النص المنسق بواسطة AI)
        # تمرير نص الغلاف الخلفي ايضا
        html_content = create_book_html(ebook_title, formatted_script_html, generated_cover_url, back_cover_text, settings)

        # الخطوة 4: توليد ملف PDF من محتوى HTML
        unique_filename = f"book_{uuid.uuid4().hex}.pdf"
        pdf_path = os.path.join(PDF_OUTPUT_DIR, unique_filename)
        generate_pdf_from_html(html_content, pdf_path)

        return jsonify({
            "pdfUrl": f"/download-pdf/{unique_filename}",
            "coverUrl": generated_cover_url,
            "message": "تم توليد الكتاب بنجاح!"
        }), 200

    except Exception as e:
        print(f"Error in book generation process: {e}")
        return jsonify({"error": f"حدث خطأ أثناء توليد الكتاب: {str(e)}"}), 500

@app.route('/download-pdf/<filename>', methods=['GET'])
def download_pdf(filename):
    """
    نقطة نهاية API لتحميل ملف PDF.
    """
    pdf_path = os.path.join(PDF_OUTPUT_DIR, filename)
    if os.path.exists(pdf_path):
        return send_file(pdf_path, as_attachment=True, mimetype='application/pdf')
    return jsonify({"error": "ملف PDF غير موجود."}), 404

@app.route('/chat', methods=['POST'])
def chat():
    """
    نقطة نهاية API للدردشة مع نموذج Gemini.
    """
    data = request.json
    user_message = data.get('message')
    chat_history = data.get('history', []) # سجل الدردشة السابق

    if not user_message:
        return jsonify({"error": "الرجاء توفير رسالة."}), 400

    try:
        ai_response = chat_with_gemini(user_message, chat_history)
        return jsonify({"response": ai_response}), 200
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({"error": f"حدث خطأ أثناء الدردشة: {str(e)}"}), 500

@app.route('/suggest-style', methods=['POST'])
def suggest_style():
    """
    نقطة نهاية API لاقتراح إعدادات تصميم الكتاب باستخدام AI.
    """
    data = request.json
    book_description = data.get('bookDescription', '')

    if not book_description:
        return jsonify({"error": "الرجاء توفير وصف للكتاب لاقتراح النمط."}), 400

    try:
        suggested_settings = suggest_book_style_settings(book_description)
        return jsonify({"settings": suggested_settings}), 200
    except Exception as e:
        print(f"Error in style suggestion endpoint: {e}")
        return jsonify({"error": f"حدث خطأ أثناء اقتراح النمط: {str(e)}"}), 500

@app.route('/format-script-with-ai', methods=['POST'])
def format_script_endpoint():
    """
    نقطة نهاية API لتنسيق نص الكتاب الخام إلى HTML بواسطة AI.
    """
    data = request.json
    raw_script = data.get('rawScript', '')

    if not raw_script:
        return jsonify({"error": "الرجاء توفير نص خام للتنسيق."}), 400

    try:
        formatted_html = format_book_script_with_ai(raw_script)
        return jsonify({"formattedHtml": formatted_html}), 200
    except Exception as e:
        print(f"Error in format script endpoint: {e}")
        return jsonify({"error": f"حدث خطأ أثناء تنسيق النص بواسطة الذكاء الاصطناعي: {str(e)}"}), 500

@app.route('/generate-cover-descriptions', methods=['POST'])
def generate_cover_descriptions_endpoint():
    """
    نقطة نهاية API لتوليد وصف الغلاف الأمامي والخلفي بواسطة AI.
    """
    data = request.json
    book_content = data.get('bookContent', '')

    if not book_content:
        return jsonify({"error": "الرجاء توفير محتوى الكتاب لتوليد أوصاف الغلاف."}), 400

    try:
        # هنا نستدعي دالة AI الجديدة
        cover_descriptions = generate_front_back_cover_prompts(book_content)
        return jsonify(cover_descriptions), 200
    except Exception as e:
        print(f"Error in generate cover descriptions endpoint: {e}")
        return jsonify({"error": f"حدث خطأ أثناء توليد أوصاف الغلاف: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)