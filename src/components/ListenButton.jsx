import React, { useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';

export function ListenButton({ text, className = '' }) {
  const { language } = useLang();
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const langMap = {
    en: 'en-IN',
    mr: 'mr-IN',
    hi: 'hi-IN',
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const checkVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const targetLang = langMap[language] || 'en-IN';
        const targetPrefix = language || 'en';

        // Check if matching voice or language exists
        const hasVoice = voices.some(
          (v) => v.lang.toLowerCase().startsWith(targetPrefix) || v.lang === targetLang
        );

        // If voices list is loaded, set supported
        setIsSupported(voices.length > 0 ? hasVoice : true);
      };

      checkVoice();
      window.speechSynthesis.onvoiceschanged = checkVoice;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [language]);

  if (!isSupported || !text) {
    return null;
  }

  const handleToggle = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langMap[language] || 'en-IN';

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(
      (v) => v.lang.toLowerCase().startsWith(language) || v.lang === langMap[language]
    );
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isPlaying ? 'Stop listening' : 'Listen aloud'}
      className={`inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg border border-[#2E7D32]/30 bg-[#E8F5E9] text-[#1B5E20] font-medium text-sm hover:bg-[#D7E7D5] transition shadow-sm ${className}`}
    >
      {isPlaying ? (
        <>
          <svg className="w-5 h-5 text-red-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
          <span>Stop</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5 text-[#2E7D32]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
          <span>Listen</span>
        </>
      )}
    </button>
  );
}

export default ListenButton;
