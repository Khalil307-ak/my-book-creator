import React, { useState, useEffect } from 'react';
import BookCreator from './components/BookCreator';
import AIChat from './components/AIChat';

// Firebase imports (now from npm package)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';


const App = () => {
  const [currentPage, setCurrentPage] = useState('bookCreator');
  const [bookScript, setBookScript] = useState('');
  const [settings, setSettings] = useState({
    textColor: '#000000',
    backgroundColor: '#ffffff',
    fontFamily: 'Inter',
    fontSize: '12pt',
    lineHeight: '1.5',
    textAlign: 'right',
    titleColor: '#333333',
    titleFontSize: '36pt',
    pageMarginTop: '20mm',
    pageMarginBottom: '20mm',
    pageMarginLeft: '20mm',
    pageMarginRight: '20mm',
    paragraphSpacing: '1em',
    paragraphIndent: '1.5em',
    heading1FontSize: '24pt',
    heading2FontSize: '18pt',
    headingColor: '#444444',
    heading1Alignment: 'center',
    heading2Alignment: 'right',
    coverWidth: '80%',
    coverHeight: '70%',
    coverBorderRadius: '15px',
    coverShadow: '0 10px 20px rgba(0,0,0,0.25)',
    headerText: '',
    footerText: 'صانع الكتب الذكي',
    imageAlignment: 'center',
    headerFontSize: '10pt',
    footerFontSize: '10pt',
    headerColor: '#888',
    footerColor: '#888',
  });

  // Firebase state
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState('loading...');
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState('');
  const [usingMockFirebase, setUsingMockFirebase] = useState(false); // حالة للإشارة إلى استخدام إعدادات وهمية

  // **إعدادات Firebase الخاصة بمشروعك الحقيقي**
  //   **هام:** استبدل هذه القيم بقيم مشروعك الحقيقية من لوحة تحكم Firebase.
  //   يمكنك العثور عليها في لوحة تحكم Firebase:
  //   Project settings (رمز الترس) -> General -> Your apps -> Web (رمز </>) -> Firebase SDK snippet -> Config
  const FIREBASE_PROJECT_CONFIG = {
    apiKey: "AIzaSyA_qKsHoTsSDc6quwd4jO0zCivVK5Pz2zY",
    authDomain: "mybookcreatorai-c842e.firebaseapp.com",
    projectId: "mybookcreatorai-c842e",
    storageBucket: "mybookcreatorai-c842e.appspot.com",
    messagingSenderId: "1023356741968",
    appId: "1:1023356741968:web:993bf148a969ca91586455",
    measurementId: "G-1T7XYHKPH8"
  };


  useEffect(() => {
    try {
      let currentFirebaseConfig = FIREBASE_PROJECT_CONFIG;
      
      // تحقق من أن الإعدادات الحقيقية موجودة
      if (!currentFirebaseConfig.projectId || !currentFirebaseConfig.apiKey || currentFirebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY" || currentFirebaseConfig.projectId === "YOUR_PROJECT_ID") {
        console.warn("إعدادات Firebase الحقيقية غير متوفرة أو ناقصة. استخدام تهيئة وهمية.");
        setFirebaseError("خطأ: لم يتم توفير تهيئة Firebase حقيقية. ميزات الحفظ/التحميل لن تعمل.");
        setUsingMockFirebase(true);
        currentFirebaseConfig = { projectId: 'mock-project-id', apiKey: 'mock-api-key', authDomain: 'mock.firebaseapp.com' }; // تهيئة وهمية
      }

      // تهيئة تطبيق Firebase
      const app = initializeApp(currentFirebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);
      setAuth(firebaseAuth);
      
      onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          setIsFirebaseReady(true);
        } else {
          try {
            // سنحاول المصادقة المجهولة دائمًا إذا لم يكن المستخدم موجودًا
            await signInAnonymously(firebaseAuth);
          } catch (error) {
            console.error("Firebase Auth Error:", error);
            setFirebaseError("فشل مصادقة Firebase: " + error.message);
            setUserId('authentication_failed');
            setIsFirebaseReady(true); // يعتبر جاهزًا ولكن مع خطأ
          }
        }
      });
    } catch (error) {
      console.error("خطأ عام في تهيئة Firebase:", error);
      setFirebaseError("خطأ في تهيئة Firebase: " + error.message);
      setIsFirebaseReady(true);
      setUsingMockFirebase(true); // تأكد من تعيين هذا إذا فشلت التهيئة بالكامل
    }
  }, []); // تشغيل هذا التأثير مرة واحدة فقط عند تحميل المكون

  // دالة لتحديث الإعدادات (يمكن استدعاؤها من AIChat)
  const applySettings = (newSettings) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      ...newSettings
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8 font-inter flex flex-col items-center justify-center">
      {firebaseError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6 text-center w-full max-w-4xl" role="alert">
          <strong className="font-bold">خطأ في Firebase:</strong>
          <span className="block sm:inline"> {firebaseError}</span>
        </div>
      )}
      {usingMockFirebase && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-md relative mb-6 text-center w-full max-w-4xl" role="alert">
          <strong className="font-bold">ملاحظة:</strong>
          <span className="block sm:inline"> يتم استخدام إعدادات Firebase وهمية. ميزات الحفظ/التحميل لن تعمل بشكل دائم.</span>
        </div>
      )}
      {!isFirebaseReady && !firebaseError && (
        <div className="flex items-center justify-center bg-blue-50 p-4 rounded-lg mb-6 shadow-sm w-full max-w-4xl">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-blue-700">جاري تهيئة Firebase...</span>
        </div>
      )}

      <nav className="w-full max-w-4xl bg-white p-4 rounded-xl shadow-lg mb-8 flex justify-center gap-4">
        <button
          onClick={() => setCurrentPage('bookCreator')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-md
            ${currentPage === 'bookCreator' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
        >
          صانع الكتب
        </button>
        <button
          onClick={() => setCurrentPage('aiChat')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-md
            ${currentPage === 'aiChat' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
        >
          الدردشة مع الذكاء الاصطناعي
        </button>
      </nav>

      {/* عرض المكون النشط فقط عندما تكون Firebase جاهزة أو هناك خطأ */}
      {isFirebaseReady && (
        currentPage === 'bookCreator' ? (
          <BookCreator
            bookScript={bookScript}
            setBookScript={setBookScript}
            settings={settings}
            setSettings={setSettings}
          />
        ) : (
          <AIChat
            onApplySettings={applySettings}
            onFormatScript={setBookScript}
            bookScript={bookScript} // تمرير نص الكتاب الحالي للدردشة
            settings={settings} // تمرير الإعدادات الحالية للدردشة
            userId={userId} // تمرير userId للدردشة
            db={db} // تمرير Firestore instance
            auth={auth} // تمرير Auth instance
            isAuthReady={isFirebaseReady && !usingMockFirebase} // تمرير حالة جاهزية المصادقة الحقيقية
          />
        )
      )}
    </div>
  );
};

export default App;