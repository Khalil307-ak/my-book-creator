import React, { useState, useEffect, useRef } from 'react';
// استيراد وظائف Firestore مباشرة
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';


const AIChat = ({ onApplySettings, onFormatScript, bookScript, settings, userId, db, auth, isAuthReady }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // رسائل النجاح للدردشة
  const chatEndRef = useRef(null);

  const BACKEND_URL = 'http://localhost:5000';

  // لعمل سكرول تلقائي لأسفل الدردشة عند إضافة رسالة جديدة
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // دالة لتحميل سجل الدردشة من Firestore
  const loadChatHistory = async () => {
    // نتحقق من وجود db و userId وليس 'loading...' أو 'authentication_failed'
    if (isAuthReady && db && userId && userId !== 'loading...' && userId !== 'authentication_failed') {
      try {
        // معرف التطبيق من projectId الخاص بـ Firebase (من App.js)
        const currentAppId = settings.projectId || 'default-app-id'; 

        const docRef = doc(db, `artifacts/${currentAppId}/users/${userId}/chat_history`, 'main_chat');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const loadedHistory = JSON.parse(docSnap.data().history);
          setChatHistory(loadedHistory);
          setSuccessMessage('تم تحميل سجل الدردشة بنجاح!');
        } else {
          setError("لا يوجد سجل دردشة محفوظ لهذا المستخدم."); // استخدام setError بدلاً من setErrorMessage
        }
      } catch (e) {
        setError("فشل تحميل سجل الدردشة: " + e.message);
        console.error("Error loading chat history: ", e);
      }
    } else if (isAuthReady && (userId === 'authentication_failed' || !db)) {
      // هذا الشرط يعني أن Firebase جاهز ولكن المصادقة فشلت أو db غير متاح
      setError("لا يمكن تحميل سجل الدردشة. Firebase غير مهيأ بشكل صحيح أو المصادقة فشلت.");
    }
  };

  // تحميل سجل الدردشة عند جاهزية المصادقة (يتم استدعاؤها مرة واحدة عند التحميل)
  useEffect(() => {
    loadChatHistory();
  }, [isAuthReady, db, userId, settings.projectId]); // يعتمد على جاهزية المصادقة ووجود DB و userId و projectId

  // دالة لحفظ سجل الدردشة في Firestore
  const saveChatHistory = async () => {
    if (!db || !userId || userId === 'loading...' || userId === 'authentication_failed') {
      setError("لا يمكن حفظ الدردشة. المصادقة غير جاهزة أو Firestore غير متاح.");
      return;
    }
    try {
      const currentAppId = settings.projectId || 'default-app-id'; // استخدام projectId كـ appId
      const docRef = doc(db, `artifacts/${currentAppId}/users/${userId}/chat_history`, 'main_chat');
      await setDoc(docRef, { history: JSON.stringify(chatHistory), timestamp: serverTimestamp() });
      setSuccessMessage('تم حفظ سجل الدردشة بنجاح!');
    } catch (e) {
      setError("فشل حفظ سجل الدردشة: " + e.message);
      console.error("Error saving document: ", e);
    }
  };

  // دالة لمعالجة إرسال الرسائل إلى الذكاء الاصطناعي
  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = { role: 'user', parts: [{ text: message }] };
    setChatHistory((prevHistory) => [...prevHistory, newMessage]);
    setMessage('');
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message, history: chatHistory }),
      });

      const data = await response.json();

      if (response.ok) {
        const aiResponseText = data.response;
        const aiResponse = { role: 'model', parts: [{ text: aiResponseText }] };
        setChatHistory((prevHistory) => [...prevHistory, aiResponse]);

        // تحليل رد الذكاء الاصطناعي لتشغيل وظائف معينة
        // مثال: إذا كان الرد يبدأ بـ "IMAGE_PROMPT:"، حاول توليد صورة
        if (aiResponseText.startsWith("IMAGE_PROMPT:")) {
          const imagePrompt = aiResponseText.substring("IMAGE_PROMPT:".length).trim();
          setChatHistory((prevHistory) => [...prevHistory, { role: 'model', parts: [{ text: "جاري توليد الصورة بناءً على طلبك..." }] }]);
          try {
            const imgGenResponse = await fetch(`${BACKEND_URL}/generate-book`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              // نرسل الحد الأدنى من البيانات المطلوبة لتوليد الغلاف فقط
              body: JSON.stringify({ ebookTitle: "AI Generated Image", bookScript: "AI image request", coverPrompt: imagePrompt, userProvidedCoverUrl: "", settings: {} })
            });
            const imgGenData = await imgGenResponse.json();
            if (imgGenResponse.ok && imgGenData.coverUrl) {
              setChatHistory((prevHistory) => [
                ...prevHistory,
                { role: 'model', parts: [{ text: "تم توليد الصورة بنجاح:" }, { imageUrl: imgGenData.coverUrl }] }
              ]);
            } else {
              setChatHistory((prevHistory) => [
                ...prevHistory,
                { role: 'model', parts: [{ text: "عذرًا، فشلت في توليد الصورة." }] }
              ]);
            }
          } catch (imgError) {
            console.error("Error generating image from chat:", imgError);
            setChatHistory((prevHistory) => [
              ...prevHistory,
              { role: 'model', parts: [{ text: "حدث خطأ أثناء محاولة توليد الصورة." }] }
            ]);
          }
        }
        // مثال: إذا كان الرد يبدأ بـ "APPLY_SETTINGS:"، حاول تطبيق الإعدادات
        else if (aiResponseText.startsWith("APPLY_SETTINGS:")) {
          const descriptionForSettings = aiResponseText.substring("APPLY_SETTINGS:".length).trim();
          setChatHistory((prevHistory) => [...prevHistory, { role: 'model', parts: [{ text: "جاري اقتراح وتطبيق إعدادات التصميم..." }] }]);
          try {
            const settingsResponse = await fetch(`${BACKEND_URL}/suggest-style`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bookDescription: descriptionForSettings || bookScript.substring(0, 500) })
            });
            const settingsData = await settingsResponse.json();
            if (settingsResponse.ok && settingsData.settings && onApplySettings) {
              onApplySettings(settingsData.settings);
              setChatHistory((prevHistory) => [
                ...prevHistory,
                { role: 'model', parts: [{ text: "تم اقتراح وتطبيق إعدادات التصميم الجديدة في صانع الكتب!" }] }
              ]);
            } else {
              setChatHistory((prevHistory) => [
                ...prevHistory,
                { role: 'model', parts: [{ text: "عذرًا، فشلت في اقتراح إعدادات التصميم." }] }
              ]);
            }
          } catch (settingsError) {
            console.error("Error suggesting settings from chat:", settingsError);
            setChatHistory((prevHistory) => [
              ...prevHistory,
              { role: 'model', parts: [{ text: "حدث خطأ أثناء محاولة اقتراح إعدادات التصميم." }] }
            ]);
          }
        }
        // مثال: إذا كان الرد يبدأ بـ "FORMAT_SCRIPT:"، حاول تنسيق النص
        else if (aiResponseText.startsWith("FORMAT_SCRIPT:")) {
            const scriptToFormat = aiResponseText.substring("FORMAT_SCRIPT:".length).trim();
            setChatHistory((prevHistory) => [...prevHistory, { role: 'model', parts: [{ text: "جاري تنسيق النص بواسطة الذكاء الاصطناعي..." }] }]);
            try {
                const formatResponse = await fetch(`${BACKEND_URL}/format-script-with-ai`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rawScript: scriptToFormat || bookScript })
                });
                const formatData = await formatResponse.json();
                if (formatResponse.ok && formatData.formattedHtml && onFormatScript) {
                    onFormatScript(formatData.formattedHtml);
                    setChatHistory((prevHistory) => [
                        ...prevHistory,
                        { role: 'model', parts: [{ text: "تم تنسيق النص بنجاح وتحديثه في صانع الكتب!" }] }
                    ]);
                } else {
                    setChatHistory((prevHistory) => [
                        ...prevHistory,
                        { role: 'model', parts: [{ text: "عذرًا، فشلت في تنسيق النص." }] }
                    ]);
                }
            } catch (formatError) {
                console.error("Error formatting script from chat:", formatError);
                setChatHistory((prevHistory) => [
                    ...prevHistory,
                    { role: 'model', parts: [{ text: "حدث خطأ أثناء محاولة تنسيق النص." }] }
                ]);
            }
        }

      } else {
        setError(data.error || 'حدث خطأ أثناء الدردشة مع الذكاء الاصطناعي.');
      }
    } catch (err) {
      setError('فشل الاتصال بالخادم. يرجى التأكد من تشغيل الواجهة الخلفية.');
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 transform transition-all duration-300 hover:scale-[1.01] flex flex-col h-[70vh]">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-800 mb-6 leading-tight">
        الدردشة مع الذكاء الاصطناعي
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6 text-center" role="alert">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md relative mb-6 text-center" role="alert">
          {successMessage}
        </div>
      )}

      <div className="flex-grow overflow-y-auto p-4 border border-gray-200 rounded-lg mb-4 bg-gray-50 custom-scrollbar">
        {chatHistory.length === 0 && (
          <p className="text-center text-gray-500 italic">ابدأ الدردشة مع الذكاء الاصطناعي. يمكنك أن تسأل عن أفكار للكتب، أو كيف تنسق نصًا، أو تطلب توليد صورة لغلاف! (مثال: "اقتراح تصميم لكتاب عن الفضاء"، "نسق لي هذا النص: [نصك هنا]", "ولد لي صورة لقط يطير")</p>
        )}
        {chatHistory.map((msg, index) => (
          <div key={index} className={`mb-3 p-3 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-blue-100 text-blue-800 self-end ml-auto' : 'bg-gray-200 text-gray-800 self-start mr-auto'}`}>
            <p className="font-semibold">{msg.role === 'user' ? 'أنت:' : 'الذكاء الاصطناعي:'}</p>
            {msg.parts.map((part, partIndex) => (
              part.text ? <p key={partIndex}>{part.text}</p> :
              part.imageUrl ? <img key={partIndex} src={part.imageUrl} alt="AI Generated" className="max-w-full h-auto rounded-lg mt-2" /> : null
            ))}
          </div>
        ))}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={saveChatHistory}
          className="px-4 py-2 rounded-lg font-semibold text-green-600 border border-green-600 hover:bg-green-100 transition-all duration-200"
          disabled={!isAuthReady || loading || chatHistory.length === 0}
        >
          حفظ الدردشة
        </button>
        <button
          onClick={loadChatHistory}
          className="px-4 py-2 rounded-lg font-semibold text-blue-600 border border-blue-600 hover:bg-blue-100 transition-all duration-200"
          disabled={!isAuthReady || loading}
        >
          تحميل الدردشة
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 shadow-sm"
          placeholder="اكتب رسالتك هنا..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !loading) {
              handleSendMessage();
            }
          }}
          disabled={loading}
        />
        <button
          onClick={handleSendMessage}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 shadow-md
            ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transform hover:scale-105'}`}
          disabled={loading}
        >
          إرسال
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">معرف المستخدم (للحفظ): {userId}</p>
    </div>
  );
};

export default AIChat;