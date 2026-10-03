import { useLang } from '../context/LangContext';
import en from './en';
import mr from './mr';
import hi from './hi';

const dictionaries = {
  en,
  mr,
  hi,
};

/**
 * Custom hook returning the translation helper function t(key, params).
 * Supports interpolation like t('home_welcome', { name: 'Ramesh' }).
 * Falls back to English if key is missing in active language.
 */
export function useT() {
  const { language } = useLang();

  const t = (key, params = {}) => {
    const dict = dictionaries[language] || dictionaries.en;
    let text = dict[key];

    if (text === undefined) {
      // Fallback to English
      text = dictionaries.en[key];
    }

    if (text === undefined) {
      return key;
    }

    if (typeof text === 'string' && Object.keys(params).length > 0) {
      return Object.entries(params).reduce((acc, [k, v]) => {
        return acc.replace(new RegExp(`\\{${k}\\}`, 'g'), v != null ? String(v) : '');
      }, text);
    }

    return text;
  };

  return { t, language };
}

export default useT;
