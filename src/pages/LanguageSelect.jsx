import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';

export function LanguageSelect() {
  const { language, setLanguage, supportedLanguages } = useLang();
  const { isAuthenticated, profile } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();

  const handleProceed = () => {
    // If authenticated, go to role-specific dashboard; else go to login
    if (isAuthenticated) {
      if (profile?.role === 'officer') {
        navigate('/officer');
      } else {
        navigate('/');
      }
    } else {
      navigate('/login');
    }
  };

  const languageDetails = {
    en: {
      subtext: 'English',
      icon: '🌱',
      greeting: 'Welcome to KrishiRakshak',
    },
    mr: {
      subtext: 'महाराष्ट्र शासन शेतकरी मित्र',
      icon: '🌾',
      greeting: 'कृषिरक्षक मध्ये आपले स्वागत आहे',
    },
    hi: {
      subtext: 'किसान मित्र डिजिटल सहायक',
      icon: '🚜',
      greeting: 'कृषिरक्षक में आपका स्वागत है',
    },
  };

  return (
    <div className="min-h-screen bg-[#F6FBF4] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="max-w-md w-full mx-auto text-center pt-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#E8F5E9] border-2 border-[#D7E7D5] shadow-inner mb-4">
          <span className="text-4xl">🌱</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#1B5E20] tracking-tight">
          {t('app_name')}
        </h1>
        <p className="text-xs font-semibold text-[#2E7D32] uppercase tracking-wider mt-1">
          {t('sih_subtext')}
        </p>
      </div>

      {/* Main Language Cards */}
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        <div className="text-center space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {t('lang_select_title')}
          </h2>
          <p className="text-sm text-slate-600">
            {t('lang_select_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5" role="radiogroup" aria-label={t('lang_select_title')}>
          {supportedLanguages.map((item) => {
            const isSelected = language === item.code;
            const extra = languageDetails[item.code] || {};

            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                role="radio"
                aria-checked={isSelected}
                className={`relative flex items-center p-4 rounded-2xl border-2 text-left transition-all min-h-[64px] shadow-sm ${
                  isSelected
                    ? 'border-[#2E7D32] bg-[#E8F5E9] shadow-md ring-2 ring-[#2E7D32]/20'
                    : 'border-[#D7E7D5] bg-white hover:border-[#2E7D32]/50 hover:bg-slate-50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/90 border border-slate-200 flex items-center justify-center text-2xl mr-4 shadow-sm">
                  {extra.icon || '🌱'}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">
                      {item.nativeName}
                    </span>
                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-[#2E7D32] text-white flex items-center justify-center text-xs font-bold shadow">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {extra.subtext}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Proceed Action Button */}
        <button
          onClick={handleProceed}
          type="button"
          className="w-full min-h-[52px] px-6 py-3.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-base shadow-lg hover:shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <span>{t('lang_proceed_btn')}</span>
          <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      {/* Footer Branding */}
      <div className="max-w-md w-full mx-auto text-center pb-2 text-xs text-slate-400">
        KrishiRakshak • SIH26131 • Maharashtra Agriculture Dept
      </div>
    </div>
  );
}

export default LanguageSelect;
