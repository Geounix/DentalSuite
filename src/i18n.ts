import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es419 from './locales/es-419.json';

const resources = {
  en: { translation: en },
  'es-419': { translation: es419 }
};

const stored = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
const defaultLng = stored || (typeof navigator !== 'undefined' ? navigator.language : 'en');

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
