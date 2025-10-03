import React, { useState } from 'react';
import CollapsibleSection from './CollapsibleSection';

const BookCreator = ({ bookScript, setBookScript, settings, setSettings }) => {
  const [ebookTitle, setEbookTitle] = useState('كيف تربح المال باستخدام ChatGPT');
  const [coverPrompt, setCoverPrompt] = useState('');
  const [backCoverPrompt, setBackCoverPrompt] = useState(''); // وصف الغلاف الخلفي
  const [userProvidedCoverUrl, setUserProvidedCoverUrl] = useState('');
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState('');
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState('');
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [loadingFormatting, setLoadingFormatting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingStyleSuggestion, setLoadingStyleSuggestion] = useState(false);
  const [loadingCoverDescriptions, setLoadingCoverDescriptions] = useState(false); // حالة تحميل أوصاف الغلاف

  const {
    textColor, backgroundColor, fontFamily, fontSize, lineHeight, textAlign,
    titleColor, titleFontSize, pageMarginTop, pageMarginBottom, pageMarginLeft, pageMarginRight,
    paragraphSpacing, paragraphIndent, heading1FontSize, heading2FontSize, headingColor,
    heading1Alignment, heading2Alignment, coverWidth, coverHeight, coverBorderRadius, coverShadow,
    headerText, footerText, imageAlignment, headerFontSize, footerFontSize, headerColor, footerColor,
    backCoverFontSize, backCoverTextColor, backCoverBackgroundColor // إضافة إعدادات الغلاف الخلفي
  } = settings;

  const BACKEND_URL = 'http://localhost:5000';

  const applySuggestedSettings = (suggestedSettings) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      ...suggestedSettings
    }));
    setSuccessMessage('تم تطبيق إعدادات التصميم المقترحة من الذكاء الاصطناعي!');
  };

  const handleSuggestStyle = async () => {
    setLoadingStyleSuggestion(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!bookScript.trim() && !ebookTitle.trim()) {
      setErrorMessage('الرجاء إدخال نص الكتاب أو عنوانه لاقتراح نمط التصميم.');
      setLoadingStyleSuggestion(false);
      return;
    }

    try {
      const bookDescription = bookScript.substring(0, 1000) || ebookTitle;
      const response = await fetch(`${BACKEND_URL}/suggest-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookDescription }),
      });

      const data = await response.json();

      if (response.ok && data.settings) {
        applySuggestedSettings(data.settings);
      } else {
        setErrorMessage(data.error || 'فشل في اقتراح النمط. يرجى المحاولة مرة أخرى.');
      }
    } catch (error) {
      setErrorMessage('فشل الاتصال بالخادم لاقتراح النمط.');
      console.error('Error suggesting style:', error);
    } finally {
      setLoadingStyleSuggestion(false);
    }
  };

  const handleFormatScriptWithAI = async () => {
    setLoadingFormatting(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!bookScript.trim()) {
      setErrorMessage('الرجاء إدخال نص خام لتنسيقه بواسطة الذكاء الاصطناعي.');
      setLoadingFormatting(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/format-script-with-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rawScript: bookScript }),
      });

      const data = await response.json();

      if (response.ok && data.formattedHtml) {
        setBookScript(data.formattedHtml);
        setSuccessMessage('تم تنسيق نص الكتاب بنجاح بواسطة الذكاء الاصطناعي!');
      } else {
        setErrorMessage(data.error || 'فشل الذكاء الاصطناعي في تنسيق النص. يرجى المحاولة مرة أخرى.');
      }
    } catch (error) {
      setErrorMessage('فشل الاتصال بالخادم لتنسيق النص.');
      console.error('Error formatting script with AI:', error);
    } finally {
      setLoadingFormatting(false);
    }
  };

  // دالة جديدة لتوليد أوصاف الغلاف الأمامي والخلفي بواسطة AI
  const handleGenerateCoverDescriptions = async () => {
    setLoadingCoverDescriptions(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!bookScript.trim() && !ebookTitle.trim()) {
      setErrorMessage('الرجاء إدخال نص الكتاب أو عنوانه لتوليد أوصاف الغلاف.');
      setLoadingCoverDescriptions(false);
      return;
    }

    try {
      const bookContent = bookScript.substring(0, 5000) || ebookTitle; // إرسال جزء أكبر من النص
      const response = await fetch(`${BACKEND_URL}/generate-cover-descriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookContent }),
      });

      const data = await response.json();

      if (response.ok && data.front_cover_prompt && data.back_cover_text) {
        setCoverPrompt(data.front_cover_prompt);
        setBackCoverPrompt(data.back_cover_text);
        setSuccessMessage('تم توليد أوصاف الغلاف الأمامي والخلفي بنجاح!');
      } else {
        setErrorMessage(data.error || 'فشل في توليد أوصاف الغلاف. يرجى المحاولة مرة أخرى.');
      }
    } catch (error) {
      setErrorMessage('فشل الاتصال بالخادم لتوليد أوصاف الغلاف.');
      console.error('Error generating cover descriptions:', error);
    } finally {
      setLoadingCoverDescriptions(false);
    }
  };


  const handleGenerateBook = async () => {
    setLoadingProcess(true);
    setErrorMessage('');
    setSuccessMessage('');
    setGeneratedCoverUrl('');
    setPdfDownloadUrl('');

    if (!bookScript.trim()) {
      setErrorMessage('الرجاء إدخال نص الكتاب أولاً.');
      setLoadingProcess(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/generate-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ebookTitle,
          bookScript,
          coverPrompt,
          userProvidedCoverUrl,
          backCoverText: backCoverPrompt, // إرسال نص الغلاف الخلفي
          settings: settings,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedCoverUrl(data.coverUrl);
        setPdfDownloadUrl(`${BACKEND_URL}${data.pdfUrl}`);
        setSuccessMessage(data.message);
      } else {
        setErrorMessage(data.error || 'حدث خطأ غير معروف أثناء توليد الكتاب.');
      }
    } catch (error) {
      setErrorMessage('فشل الاتصال بالخادم. يرجى التأكد من تشغيل الواجهة الخلفية (Backend).');
      console.error('Error generating book:', error);
    } finally {
      setLoadingProcess(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 transform transition-all duration-300 hover:scale-[1.01]">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-800 mb-8 leading-tight">
        صانع الكتب الإلكترونية الذكي
      </h1>

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6 text-center" role="alert">
          <strong className="font-bold">خطأ!</strong>
          <span className="block sm:inline"> {errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md relative mb-6 text-center" role="alert">
          <strong className="font-bold">نجاح!</strong>
          <span className="block sm:inline"> {successMessage}</span>
        </div>
      )}

      {/* قسم عنوان الكتاب */}
      <div className="mb-8">
        <label htmlFor="ebookTitle" className="block text-lg font-semibold text-gray-700 mb-3">
          عنوان الكتاب:
        </label>
        <input
          type="text"
          id="ebookTitle"
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 text-base shadow-sm"
          placeholder="أدخل عنوان كتابك هنا..."
          value={ebookTitle}
          onChange={(e) => setEbookTitle(e.target.value)}
        />
      </div>

      {/* قسم إدخال نص الكتاب */}
      <div className="mb-8">
        <label htmlFor="bookScript" className="block text-lg font-semibold text-gray-700 mb-3">
          نص الكتاب (يمكن أن يكون خامًا ليتم تنسيقه بواسطة AI، أو HTML منسقًا):
        </label>
        <textarea
          id="bookScript"
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 text-base h-64 resize-y shadow-sm"
          placeholder="أدخل نص كتابك هنا. يمكنك إدخال نص خام ليتم تنسيقه بواسطة الذكاء الاصطناعي، أو HTML منسقًا بالفعل (مثل &#60;h1&#62;عنوان فصل&#60;/h1&#62;، &#60;p&#62;فقرة&#60;/p&#62;، &#60;img src=&#34;رابط_الصورة&#34; class=&#34;align-center&#34;&#62;، &#60;ul&#62;&#60;li&#62;عنصر قائمة&#60;/li&#62;&#60;/ul&#62;)."
          value={bookScript}
          onChange={(e) => setBookScript(e.target.value)}
        ></textarea>
        <button
          onClick={handleFormatScriptWithAI}
          className={`mt-4 px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 shadow-md w-full sm:w-auto
            ${loadingFormatting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transform hover:scale-105'}`}
          disabled={loadingFormatting || !bookScript.trim()}
        >
          {loadingFormatting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              جاري التنسيق بواسطة AI...
            </span>
          ) : (
            'تنسيق النص بواسطة الذكاء الاصطناعي'
          )}
        </button>
      </div>

      {/* قسم اقتراح النمط بالذكاء الاصطناعي */}
      <div className="mb-8 p-6 bg-yellow-50 rounded-xl border border-yellow-200 text-center">
        <h2 className="text-xl font-bold text-yellow-800 mb-4">اقتراح نمط التصميم بالذكاء الاصطناعي:</h2>
        <p className="text-gray-700 mb-4">
          دع الذكاء الاصطناعي يقترح عليك إعدادات تصميم احترافية (ألوان، خطوط، هوامش) بناءً على عنوان كتابك أو جزء من نصه.
        </p>
        <button
          onClick={handleSuggestStyle}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 shadow-md
            ${loadingStyleSuggestion ? 'bg-yellow-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 transform hover:scale-105'}`}
          disabled={loadingStyleSuggestion || (!bookScript.trim() && !ebookTitle.trim())}
        >
          {loadingStyleSuggestion ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              جاري اقتراح النمط...
            </span>
          ) : (
            'اقتراح نمط تصميم'
          )}
        </button>
      </div>

      {/* قسم إعدادات التخصيص المنظمة */}
      <CollapsibleSection title="إعدادات الألوان والخطوط" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* لون النص */}
          <div>
            <label htmlFor="textColor" className="block text-sm font-medium text-gray-700 mb-2">
              لون النص:
            </label>
            <input type="color" id="textColor" className="w-full h-10 rounded-md border border-gray-300 cursor-pointer shadow-sm" value={textColor} onChange={(e) => setSettings(p => ({...p, textColor: e.target.value}))} />
          </div>
          {/* لون الخلفية */}
          <div>
            <label htmlFor="backgroundColor" className="block text-sm font-medium text-gray-700 mb-2">
              لون الخلفية:
            </label>
            <input type="color" id="backgroundColor" className="w-full h-10 rounded-md border border-gray-300 cursor-pointer shadow-sm" value={backgroundColor} onChange={(e) => setSettings(p => ({...p, backgroundColor: e.target.value}))} />
          </div>
          {/* نوع الخط */}
          <div>
            <label htmlFor="fontFamily" className="block text-sm font-medium text-gray-700 mb-2">
              نوع الخط:
            </label>
            <select id="fontFamily" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={fontFamily} onChange={(e) => setSettings(p => ({...p, fontFamily: e.target.value}))}>
              <option value="Inter">Inter (افتراضي)</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Amiri">Amiri (خط عربي)</option>
            </select>
          </div>
          {/* حجم الخط */}
          <div>
            <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700 mb-2">
              حجم الخط:
            </label>
            <select id="fontSize" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={fontSize} onChange={(e) => setSettings(p => ({...p, fontSize: e.target.value}))}>
              {[...Array(10).keys()].map(i => (<option key={10 + i} value={`${10 + i}pt`}>{10 + i}pt</option>))}
              <option value="12pt">12pt (افتراضي)</option>
              {[...Array(10).keys()].map(i => (<option key={13 + i} value={`${13 + i}pt`}>{13 + i}pt</option>))}
            </select>
          </div>
          {/* ارتفاع السطر */}
          <div>
            <label htmlFor="lineHeight" className="block text-sm font-medium text-gray-700 mb-2">
              ارتفاع السطر:
            </label>
            <select id="lineHeight" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={lineHeight} onChange={(e) => setSettings(p => ({...p, lineHeight: e.target.value}))}>
              <option value="1.2">1.2</option>
              <option value="1.5">1.5 (افتراضي)</option>
              <option value="1.8">1.8</option>
              <option value="2.0">2.0</option>
            </select>
          </div>
          {/* محاذاة النص */}
          <div>
            <label htmlFor="textAlign" className="block text-sm font-medium text-gray-700 mb-2">
              محاذاة النص:
            </label>
            <select id="textAlign" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={textAlign} onChange={(e) => setSettings(p => ({...p, textAlign: e.target.value}))}>
              <option value="right">يمين (افتراضي)</option>
              <option value="left">يسار</option>
              <option value="center">وسط</option>
              <option value="justify">ضبط</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="إعدادات العناوين" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* لون عنوان الكتاب */}
          <div>
            <label htmlFor="titleColor" className="block text-sm font-medium text-gray-700 mb-2">
              لون عنوان الكتاب:
            </label>
            <input type="color" id="titleColor" className="w-full h-10 rounded-md border border-gray-300 cursor-pointer shadow-sm" value={titleColor} onChange={(e) => setSettings(p => ({...p, titleColor: e.target.value}))} />
          </div>
          {/* حجم عنوان الكتاب */}
          <div>
            <label htmlFor="titleFontSize" className="block text-sm font-medium text-gray-700 mb-2">
              حجم عنوان الكتاب:
            </label>
            <select id="titleFontSize" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={titleFontSize} onChange={(e) => setSettings(p => ({...p, titleFontSize: e.target.value}))}>
              {[...Array(10).keys()].map(i => (<option key={24 + i} value={`${24 + i}pt`}>{24 + i}pt</option>))}
              <option value="36pt">36pt (افتراضي)</option>
              {[...Array(10).keys()].map(i => (<option key={37 + i} value={`${37 + i}pt`}>{37 + i}pt</option>))}
            </select>
          </div>
          {/* حجم خط العناوين H1 و H2 */}
          <div>
            <label htmlFor="heading1FontSize" className="block text-sm font-medium text-gray-700 mb-2">
              حجم خط عنوان H1:
            </label>
            <select id="heading1FontSize" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={heading1FontSize} onChange={(e) => setSettings(p => ({...p, heading1FontSize: e.target.value}))}>
              {[...Array(10).keys()].map(i => (<option key={20 + i} value={`${20 + i}pt`}>{20 + i}pt</option>))}
              <option value="24pt">24pt (افتراضي)</option>
              {[...Array(10).keys()].map(i => (<option key={25 + i} value={`${25 + i}pt`}>{25 + i}pt</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="heading2FontSize" className="block text-sm font-medium text-gray-700 mb-2">
              حجم خط عنوان H2:
            </label>
            <select id="heading2FontSize" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={heading2FontSize} onChange={(e) => setSettings(p => ({...p, heading2FontSize: e.target.value}))}>
              {[...Array(5).keys()].map(i => (<option key={14 + i} value={`${14 + i}pt`}>{14 + i}pt</option>))}
              <option value="18pt">18pt (افتراضي)</option>
              {[...Array(5).keys()].map(i => (<option key={19 + i} value={`${19 + i}pt`}>{19 + i}pt</option>))}
            </select>
          </div>
          {/* لون العناوين */}
          <div>
            <label htmlFor="headingColor" className="block text-sm font-medium text-gray-700 mb-2">
              لون العناوين:
            </label>
            <input type="color" id="headingColor" className="w-full h-10 rounded-md border border-gray-300 cursor-pointer shadow-sm" value={headingColor} onChange={(e) => setSettings(p => ({...p, headingColor: e.target.value}))} />
          </div>
          {/* محاذاة العناوين */}
          <div>
            <label htmlFor="heading1Alignment" className="block text-sm font-medium text-gray-700 mb-2">
              محاذاة عنوان H1:
            </label>
            <select id="heading1Alignment" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={heading1Alignment} onChange={(e) => setSettings(p => ({...p, heading1Alignment: e.target.value}))}>
              <option value="right">يمين</option>
              <option value="left">يسار</option>
              <option value="center">وسط (افتراضي)</option>
            </select>
          </div>
          <div>
            <label htmlFor="heading2Alignment" className="block text-sm font-medium text-gray-700 mb-2">
              محاذاة عنوان H2:
            </label>
            <select id="heading2Alignment" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={heading2Alignment} onChange={(e) => setSettings(p => ({...p, heading2Alignment: e.target.value}))}>
              <option value="right">يمين (افتراضي)</option>
              <option value="left">يسار</option>
              <option value="center">وسط</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="إعدادات الفقرات والصور" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* تباعد الفقرات */}
          <div>
            <label htmlFor="paragraphSpacing" className="block text-sm font-medium text-gray-700 mb-2">
              تباعد الفقرات:
            </label>
            <select id="paragraphSpacing" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={paragraphSpacing} onChange={(e) => setSettings(p => ({...p, paragraphSpacing: e.target.value}))}>
              <option value="0.5em">0.5em</option>
              <option value="1em">1em (افتراضي)</option>
              <option value="1.5em">1.5em</option>
              <option value="2em">2em</option>
            </select>
          </div>
          {/* مسافة بادئة للفقرات */}
          <div>
            <label htmlFor="paragraphIndent" className="block text-sm font-medium text-gray-700 mb-2">
              مسافة بادئة للفقرات:
            </label>
            <select id="paragraphIndent" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={paragraphIndent} onChange={(e) => setSettings(p => ({...p, paragraphIndent: e.target.value}))}>
              <option value="0em">0em</option>
              <option value="0.5em">0.5em</option>
              <option value="1em">1em</option>
              <option value="1.5em">1.5em (افتراضي)</option>
              <option value="2em">2em</option>
            </select>
          </div>
          {/* محاذاة الصور داخل النص */}
          <div>
            <label htmlFor="imageAlignment" className="block text-sm font-medium text-gray-700 mb-2">
              محاذاة الصور في النص:
            </label>
            <select id="imageAlignment" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={imageAlignment} onChange={(e) => setSettings(p => ({...p, imageAlignment: e.target.value}))}>
              <option value="center">وسط (افتراضي)</option>
              <option value="left">يسار</option>
              <option value="right">يمين</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="إعدادات الصفحة (الهوامش والرأس والتذييل)" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* هوامش الصفحة */}
          <div>
            <label htmlFor="pageMarginTop" className="block text-sm font-medium text-gray-700 mb-2">
              هامش علوي (مم):
            </label>
            <input type="number" id="pageMarginTop" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={parseInt(pageMarginTop)} onChange={(e) => setSettings(p => ({...p, pageMarginTop: `${e.target.value}mm`}))} min="5" max="50" />
          </div>
          <div>
            <label htmlFor="pageMarginBottom" className="block text-sm font-medium text-gray-700 mb-2">
              هامش سفلي (مم):
            </label>
            <input type="number" id="pageMarginBottom" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={parseInt(pageMarginBottom)} onChange={(e) => setSettings(p => ({...p, pageMarginBottom: `${e.target.value}mm`}))} min="5" max="50" />
          </div>
          <div>
            <label htmlFor="pageMarginLeft" className="block text-sm font-medium text-gray-700 mb-2">
              هامش أيسر (مم):
            </label>
            <input type="number" id="pageMarginLeft" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={parseInt(pageMarginLeft)} onChange={(e) => setSettings(p => ({...p, pageMarginLeft: `${e.target.value}mm`}))} min="5" max="50" />
          </div>
          <div>
            <label htmlFor="pageMarginRight" className="block text-sm font-medium text-gray-700 mb-2">
               هامش أيمن (مم):
            </label>
            <input type="number" id="pageMarginRight" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={parseInt(pageMarginRight)} onChange={(e) => setSettings(p => ({...p, pageMarginRight: `${e.target.value}mm`}))} min="5" max="50" />
          </div>
          {/* نص الرأس والتذييل */}
          <div>
            <label htmlFor="headerText" className="block text-sm font-medium text-gray-700 mb-2">
              نص الرأس (أعلى الصفحة):
            </label>
            <input type="text" id="headerText" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={headerText} onChange={(e) => setSettings(p => ({...p, headerText: e.target.value}))} placeholder="عنوان الكتاب (افتراضي)" />
          </div>
          <div>
            <label htmlFor="footerText" className="block text-sm font-medium text-gray-700 mb-2">
              نص التذييل (أسفل الصفحة):
            </label>
            <input type="text" id="footerText" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={footerText} onChange={(e) => setSettings(p => ({...p, footerText: e.target.value}))} placeholder="صانع الكتب الذكي (افتراضي)" />
          </div>
          {/* حجم خط الرأس والتذييل */}
          <div>
            <label htmlFor="headerFontSize" className="block text-sm font-medium text-gray-700 mb-2">
              حجم خط الرأس:
            </label>
            <select id="headerFontSize" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={headerFontSize} onChange={(e) => setSettings(p => ({...p, headerFontSize: e.target.value}))}>
              {[...Array(5).keys()].map(i => (<option key={8 + i} value={`${8 + i}pt`}>{8 + i}pt</option>))}
              <option value="10pt">10pt (افتراضي)</option>
              {[...Array(5).keys()].map(i => (<option key={11 + i} value={`${11 + i}pt`}>{11 + i}pt</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="footerFontSize" className="block text-sm font-medium text-gray-700 mb-2">
              حجم خط التذييل:
            </label>
            <select id="footerFontSize" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={footerFontSize} onChange={(e) => setSettings(p => ({...p, footerFontSize: e.target.value}))}>
              {[...Array(5).keys()].map(i => (<option key={8 + i} value={`${8 + i}pt`}>{8 + i}pt</option>))}
              <option value="10pt">10pt (افتراضي)</option>
              {[...Array(5).keys()].map(i => (<option key={11 + i} value={`${11 + i}pt`}>{11 + i}pt</option>))}
            </select>
          </div>
          {/* لون الرأس والتذييل */}
          <div>
            <label htmlFor="headerColor" className="block text-sm font-medium text-gray-700 mb-2">
              لون الرأس:
            </label>
            <input type="color" id="headerColor" className="w-full h-10 rounded-md border border-gray-300 cursor-pointer shadow-sm" value={headerColor} onChange={(e) => setSettings(p => ({...p, headerColor: e.target.value}))} />
          </div>
          <div>
            <label htmlFor="footerColor" className="block text-sm font-medium text-gray-700 mb-2">
              لون التذييل:
            </label>
            <input type="color" id="footerColor" className="w-full h-10 rounded-md border border-gray-300 cursor-pointer shadow-sm" value={footerColor} onChange={(e) => setSettings(p => ({...p, footerColor: e.target.value}))} />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="إعدادات الغلاف" defaultOpen={false}>
        <div className="flex flex-col gap-4 mb-4">
          <div>
            <label htmlFor="userProvidedCoverUrl" className="block text-sm font-medium text-gray-700 mb-2">
              رابط صورة الغلاف (اختياري، إذا كان لديك غلاف جاهز):
            </label>
            <input type="url" id="userProvidedCoverUrl" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={userProvidedCoverUrl} onChange={(e) => setUserProvidedCoverUrl(e.target.value)} disabled={loadingProcess} />
          </div>
          <div className="text-center text-gray-600 font-semibold">
            أو
          </div>
          <div>
            <label htmlFor="coverPrompt" className="block text-sm font-medium text-gray-700 mb-2">
              وصف الغلاف الأمامي للذكاء الاصطناعي (سيتم توليده تلقائيًا من نص الكتاب إذا ترك فارغًا):
            </label>
            <input type="text" id="coverPrompt" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={coverPrompt} onChange={(e) => setCoverPrompt(e.target.value)} disabled={loadingProcess} />
          </div>
          <div>
            <label htmlFor="backCoverPrompt" className="block text-sm font-medium text-gray-700 mb-2">
              وصف الغلاف الخلفي (نص عادي، يمكن توليده بواسطة AI):
            </label>
            <textarea
              id="backCoverPrompt"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm resize-y"
              rows="3"
              placeholder="وصف للغلاف الخلفي للكتاب (ملخص، اقتباس، إلخ)"
              value={backCoverPrompt}
              onChange={(e) => setBackCoverPrompt(e.target.value)}
              disabled={loadingProcess}
            ></textarea>
          </div>
          <button
            onClick={handleGenerateCoverDescriptions}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 shadow-md w-full sm:w-auto
              ${loadingCoverDescriptions ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 transform hover:scale-105'}`}
            disabled={loadingCoverDescriptions || (!bookScript.trim() && !ebookTitle.trim())}
          >
            {loadingCoverDescriptions ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري توليد أوصاف الغلاف...
              </span>
            ) : (
              'توليد أوصاف الغلاف (AI)'
            )}
          </button>

          {generatedCoverUrl && (
            <div className="mt-6 text-center">
              <h3 className="text-lg font-medium text-gray-700 mb-3">الغلاف الذي تم توليده/استخدامه:</h3>
              <img src={generatedCoverUrl} alt="Generated Book Cover" className="max-w-full h-auto mx-auto rounded-lg shadow-lg border border-gray-200 animate-fade-in" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            <div>
              <label htmlFor="coverWidth" className="block text-sm font-medium text-gray-700 mb-2">
                عرض الغلاف (%):
              </label>
              <input type="number" id="coverWidth" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={parseInt(coverWidth)} onChange={(e) => setSettings(p => ({...p, coverWidth: `${e.target.value}%`}))} min="50" max="100" />
            </div>
            <div>
              <label htmlFor="coverHeight" className="block text-sm font-medium text-gray-700 mb-2">
                ارتفاع الغلاف (%):
              </label>
              <input type="number" id="coverHeight" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={parseInt(coverHeight)} onChange={(e) => setSettings(p => ({...p, coverHeight: `${e.target.value}%`}))} min="50" max="100" />
            </div>
            <div>
              <label htmlFor="coverBorderRadius" className="block text-sm font-medium text-gray-700 mb-2">
                نصف قطر زاوية الغلاف (px):
              </label>
              <input type="number" id="coverBorderRadius" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={parseInt(coverBorderRadius)} onChange={(e) => setSettings(p => ({...p, coverBorderRadius: `${e.target.value}px`}))} min="0" max="50" />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="coverShadow" className="block text-sm font-medium text-gray-700 mb-2">
                ظل الغلاف (CSS):
              </label>
              <input type="text" id="coverShadow" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm" value={coverShadow} onChange={(e) => setSettings(p => ({...p, coverShadow: e.target.value}))} placeholder="مثال: 0 10px 20px rgba(0,0,0,0.25)" />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">معاينة النص:</h2>
        <div
          className="p-4 rounded-lg border border-gray-300 min-h-[100px] overflow-auto"
          style={{
            backgroundColor: backgroundColor,
            color: textColor,
            fontFamily: fontFamily,
            direction: 'rtl',
            textAlign: textAlign,
            fontSize: fontSize,
            lineHeight: lineHeight
          }}
        >
          <h3 style={{ textAlign: 'center', marginBottom: '10px', fontSize: titleFontSize, fontWeight: 'bold', color: titleColor }}>{ebookTitle}</h3>
          <div dangerouslySetInnerHTML={{ __html: bookScript.substring(0, 500) + (bookScript.length > 500 ? '...' : '') }} />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          ملاحظة: هذه المعاينة تعكس التنسيق في المتصفح. ملف PDF سيتم توليده بجودة عالية من الواجهة الخلفية بناءً على هذه الإعدادات.
        </p>
      </div>


      <div className="p-6 bg-green-50 rounded-xl border border-green-200">
        <h2 className="text-xl font-bold text-green-800 mb-4">توليد الكتاب الكامل:</h2>
        <button
          onClick={handleGenerateBook}
          className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 shadow-md
            ${loadingProcess ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:bg-green-800 transform hover:scale-105'}`}
          disabled={loadingProcess || !bookScript.trim()}
        >
          {loadingProcess ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              جاري توليد الكتاب...
            </span>
          ) : (
            'توليد الكتاب (الغلاف و PDF)'
          )}
        </button>

        {pdfDownloadUrl && (
          <div className="mt-6 text-center">
            <h3 className="text-lg font-medium text-gray-700 mb-3">ملف PDF جاهز!</h3>
            <a
              href={pdfDownloadUrl}
              download={`${ebookTitle || 'كتابي'}.pdf`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              تحميل الكتاب بصيغة PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCreator;