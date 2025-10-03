from weasyprint import HTML, CSS
import os
import re
from bs4 import BeautifulSoup # لاستخلاص وتحليل HTML بشكل موثوق

def generate_pdf_from_html(html_content: str, output_path: str):
    """
    يولد ملف PDF من محتوى HTML باستخدام WeasyPrint.
    """
    try:
        HTML(string=html_content).write_pdf(output_path)
        print(f"تم توليد ملف PDF بنجاح: {output_path}")
    except Exception as e:
        print(f"خطأ أثناء توليد ملف PDF: {e}")
        raise

def create_book_html(title: str, script_content: str, cover_image_url: str, back_cover_text: str, settings: dict) -> str:
    """
    ينشئ محتوى HTML لكتاب، مع تطبيق الإعدادات.
    """
    # تطبيق الإعدادات من الواجهة الأمامية
    text_color = settings.get('textColor', '#000000')
    background_color = settings.get('backgroundColor', '#ffffff')
    font_family = settings.get('fontFamily', 'Inter, Arial, sans-serif')
    font_size = settings.get('fontSize', '12pt')
    line_height = settings.get('lineHeight', '1.5')
    text_align = settings.get('textAlign', 'right')
    title_color = settings.get('titleColor', '#333333')
    title_font_size = settings.get('titleFontSize', '36pt')
    page_margin_top = settings.get('pageMarginTop', '20mm')
    page_margin_bottom = settings.get('pageMarginBottom', '20mm')
    page_margin_left = settings.get('pageMarginLeft', '20mm')
    page_margin_right = settings.get('pageMarginRight', '20mm')
    paragraph_spacing = settings.get('paragraphSpacing', '1em')
    paragraph_indent = settings.get('paragraphIndent', '1.5em')
    heading1_font_size = settings.get('heading1FontSize', '24pt')
    heading2_font_size = settings.get('heading2FontSize', '18pt')
    heading_color = settings.get('headingColor', '#444444')
    heading1_align = settings.get('heading1Alignment', 'center')
    heading2_align = settings.get('heading2Alignment', 'right')
    cover_width = settings.get('coverWidth', '80%')
    cover_height = settings.get('coverHeight', '70%')
    cover_border_radius = settings.get('coverBorderRadius', '15px')
    cover_shadow = settings.get('coverShadow', '0 10px 20px rgba(0,0,0,0.25)')
    header_text = settings.get('headerText', title)
    footer_text = settings.get('footerText', 'صانع الكتب الذكي')
    image_alignment = settings.get('imageAlignment', 'center')
    header_font_size = settings.get('headerFontSize', '10pt')
    footer_font_size = settings.get('footerFontSize', '10pt')
    header_color = settings.get('headerColor', '#888')
    footer_color = settings.get('footerColor', '#888')
    back_cover_font_size = settings.get('backCoverFontSize', '12pt')
    back_cover_text_color = settings.get('backCoverTextColor', '#000000')
    back_cover_background_color = settings.get('backCoverBackgroundColor', '#ffffff')


    # Prepare cover image HTML string
    cover_image_html = ""
    if cover_image_url:
        cover_image_html = f'<img src="{cover_image_url}" class="cover-image" alt="Book Cover" />'

    # استخدام BeautifulSoup لاستخلاص العناوين وإضافة IDs بشكل موثوق
    soup = BeautifulSoup(script_content, 'html.parser')
    toc_entries = []
    
    # إضافة IDs للعناوين واستخراجها لجدول المحتويات
    for i, heading in enumerate(soup.find_all(['h1', 'h2', 'h3'])):
        # إنشاء ID فريد إذا لم يكن موجودًا
        if not heading.has_attr('id'):
            # تنظيف النص لجعله جزءا من ID صالح
            heading_id_text = re.sub(r'[^a-zA-Z0-9_]', '', heading.get_text().strip())
            heading_id = f"section-{i}-{heading_id_text[:30]}" # تحديد طول ID لتجنب الطول الزائد
            heading['id'] = heading_id
        else:
            heading_id = heading['id']
            
        level = int(heading.name[1]) # e.g., 'h1' -> 1, 'h2' -> 2
        toc_entries.append({
            'level': level,
            'text': heading.get_text().strip(),
            'id': heading_id
        })
    
    script_content_with_ids = str(soup) # الحصول على HTML المحدث مع IDs

    toc_html = ""
    if toc_entries:
        toc_html = """
        <div class="page table-of-contents">
            <h1 class="toc-title">جدول المحتويات</h1>
            <ul class="toc-list">
        """
        for entry in toc_entries:
            indent_class = ""
            if entry['level'] == 1:
                indent_class = "toc-level-1"
            elif entry['level'] == 2:
                indent_class = "toc-level-2"
            elif entry['level'] == 3:
                indent_class = "toc-level-3"
            
            # استخدام target-counter و leader لتنسيق احترافي
            toc_html += f'<li class="{indent_class}"><a href="#{entry["id"]}">{entry["text"]}</a></li>'
        toc_html += """
            </ul>
        </div>
        """
    
    # قالب HTML الرئيسي
    html_template = f"""
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>{title}</title>
        <link href="[https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;600;700&display=swap](https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;600;700&display=swap)" rel="stylesheet">
        <style>
            @page {{
                size: A4;
                margin-top: {page_margin_top};
                margin-bottom: {page_margin_bottom};
                margin-left: {page_margin_left};
                margin-right: {page_margin_right};
                @top-center {{ content: element(header); }}
                @bottom-center {{ content: element(footer); }}
            }}
            body {{
                font-family: '{font_family}', sans-serif;
                color: {text_color};
                background-color: {background_color};
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                line-height: {line_height};
                text-align: {text_align};
                font-size: {font_size};
            }}
            .header {{
                position: running(header);
                text-align: center;
                font-size: {header_font_size};
                color: {header_color};
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }}
            .footer {{
                position: running(footer);
                text-align: center;
                font-size: {footer_font_size};
                color: {footer_color};
                border-top: 1px solid #eee;
                padding-top: 5px;
            }}
            /* ترقيم الصفحات */
            .footer::after {{
                content: " " counter(page) " من " counter(pages);
            }}
            .page {{
                /* هذا النمط يستخدم لتقسيم المحتوى إلى صفحات إذا لزم الأمر */
                /* ولكن WeasyPrint يتعامل مع التدفق تلقائيا لمعظم المحتوى */
            }}
            .cover-page {{
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh; /* استخدم 100vh لضمان توسيط رأسي ثابت */
                width: 100%;
                box-sizing: border-box;
                page-break-after: always; /* لضمان أن الغلاف يكون صفحة منفصلة */
                padding: 20mm; /* لضمان عدم التصاق المحتوى بالحواف */
            }}
            .cover-image {{
                max-width: {cover_width};
                max-height: {cover_height};
                border-radius: {cover_border_radius}; /* زوايا مستديرة */
                box-shadow: {cover_shadow}; /* ظل أعمق */
                margin-bottom: 40px;
                object-fit: contain; /* لضمان احتواء الصورة بشكل جيد */
            }}
            .book-title {{
                font-size: {title_font_size};
                font-weight: bold;
                margin-bottom: 25px;
                color: {title_color};
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1); /* ظل للنص */
                text-align: center; /* لضمان توسط العنوان */
            }}
            .author {{
                font-size: 18pt;
                color: {text_color};
                margin-top: 15px;
            }}
            .content-body {{
                /* هذا العنصر سيحتوي على نص الكتاب الفعلي */
                /* الهوامش يتم التحكم بها عبر @page */
                direction: rtl;
                text-align: {text_align};
                padding: 0;
            }}
            /* تخصيصات الفقرات */
            p {{
                margin-bottom: {paragraph_spacing};
                text-indent: {paragraph_indent}; /* مسافة بادئة للفقرات */
            }}
            /* تخصيصات العناوين */
            h1 {{
                font-size: {heading1_font_size};
                color: {heading_color};
                text-align: {heading1_align};
                margin-top: 2em;
                margin-bottom: 1em;
                page-break-before: always; /* لبدء فصل جديد في صفحة جديدة */
                font-weight: bold; /* التأكد من أن العناوين الرئيسية سميكة */
            }}
            h2 {{
                font-size: {heading2_font_size};
                color: {heading_color};
                text-align: {heading2_align};
                margin-top: 1.5em;
                margin-bottom: 0.8em;
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
                font-weight: bold;
            }}
            h3 {{
                font-size: 1.4em;
                color: {heading_color};
                text-align: {text_align}; /* يمكن تخصيصها أيضًا */
                margin-top: 1.2em;
                margin-bottom: 0.6em;
                font-weight: bold;
            }}
            /* تنسيق الصور المضمنة في النص */
            .content-body img {{
                max-width: 100%;
                height: auto;
                display: block;
                margin: 1em auto; /* لوسطنة الصورة */
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                float: none; /* إزالة التعويم الافتراضي */
            }}
            .content-body img.align-left {{
                float: left;
                margin-right: 1em;
            }}
            .content-body img.align-right {{
                float: right;
                margin-left: 1em;
            }}
            .content-body img.align-center {{
                display: block;
                margin-left: auto;
                margin-right: auto;
            }}
            /* تنسيق القوائم */
            ul, ol {{
                margin-left: 2em;
                margin-bottom: 1em;
            }}
            li {{
                margin-bottom: 0.5em;
            }}
            /* تخصيصات جدول المحتويات */
            .table-of-contents {{
                page-break-after: always;
                padding-top: 50mm; /* مساحة أعلى الصفحة */
            }}
            .toc-title {{
                font-size: 30pt;
                text-align: center;
                margin-bottom: 30px;
                color: {title_color};
            }}
            .toc-list {{
                list-style-type: none;
                padding: 0;
            }}
            .toc-list li {{
                margin-bottom: 0.8em;
                font-size: 14pt;
            }}
            .toc-level-1 {{
                font-weight: bold;
                margin-right: 0;
            }}
            .toc-level-2 {{
                margin-right: 2em; /* مسافة بادئة للمستوى الثاني */
            }}
            .toc-level-3 {{
                margin-right: 4em; /* مسافة بادئة للمستوى الثالث */
            }}
            .toc-list a {{
                text-decoration: none;
                color: {text_color};
                /* استخدام float و content: leader() لإنشاء نقاط التوجيه */
                display: block;
                overflow: hidden;
                white-space: nowrap;
            }}
            .toc-list a::after {{
                content: leader('.') target-counter(attr(href), page);
                float: right;
            }}
            /* تنسيق الأيقونات (افتراضي، يمكن تخصيصه) */
            .icon {{
                display: inline-block;
                width: 1em;
                height: 1em;
                vertical-align: middle;
                fill: currentColor;
            }}
            /* تنسيق Blockquote */
            blockquote {{
                border-left: 4px solid {heading_color};
                padding-left: 1em;
                margin: 1em 0;
                font-style: italic;
                color: {heading_color};
            }}
            /* تنسيق Code Blocks */
            pre {{
                background-color: #f4f4f4;
                border: 1px solid #ddd;
                padding: 1em;
                overflow-x: auto;
                border-radius: 5px;
                margin: 1em 0;
            }}
            code {{
                font-family: 'Courier New', Courier, monospace;
                font-size: 0.9em;
            }}
            /* تنسيق الجداول */
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 1em 0;
            }}
            th, td {{
                border: 1px solid #ddd;
                padding: 8px;
                text-align: {text_align};
            }}
            th {{
                background-color: #f2f2f2;
                font-weight: bold;
            }}
            /* الغلاف الخلفي */
            .back-cover-page {{
                page-break-before: always; /* ابدا صفحة جديدة للغلاف الخلفي */
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh; /* استخدم 100vh لضمان توسيط رأسي ثابت */
                width: 100%;
                box-sizing: border-box;
                background-color: {back_cover_background_color};
                color: {back_cover_text_color};
                padding: 20mm;
            }}
            .back-cover-text {{
                font-size: {back_cover_font_size};
                text-align: center;
                max-width: 150mm;
            }}
        </style>
    </head>
    <body>
        <div class="header">{header_text}</div>
        <div class="footer">{footer_text}</div>

        <div class="page cover-page">
            <h1 class="book-title">{title}</h1>
            {cover_image_html}
            <p class="author">تأليف: صانع الكتب الذكي</p>
        </div>
        {toc_html if toc_html else ''}
        <div class="content-body">
            {script_content_with_ids}
        </div>
        {f'<div class="page back-cover-page"><p class="back-cover-text">{back_cover_text}</p></div>' if back_cover_text else ''}
    </body>
    </html>
    """
    return html_template