import React, { createContext, useContext, useState, useEffect } from 'react';

const LangContext = createContext(null);

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'mr', label: 'मराठी', nativeName: 'मराठी' },
  { code: 'hi', label: 'हिंदी', nativeName: 'हिंदी' },
];

export function LangProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('krishi_lang');
      if (saved && ['en', 'mr', 'hi'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore localStorage errors
    }
    return 'en';
  });

  const setLanguage = (newLang) => {
    if (['en', 'mr', 'hi'].includes(newLang)) {
      setLanguageState(newLang);
      try {
        localStorage.setItem('krishi_lang', newLang);
        document.documentElement.lang = newLang;
      } catch (e) {
        console.error('Failed to save language to localStorage', e);
      }
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LangContext.Provider value={{ language, setLanguage, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error('useLang must be used within a LangProvider');
  }
  return ctx;
}
