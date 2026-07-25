import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './en.json'
import ar from './ar.json'

export const RTL_LANGUAGES = ['ar']

function applyDocumentDirection(lng: string) {
  const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr'
  document.documentElement.setAttribute('dir', dir)
  document.documentElement.setAttribute('lang', lng)
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ag_language',
    },
  })

applyDocumentDirection(i18n.resolvedLanguage || i18n.language || 'en')

i18n.on('languageChanged', (lng) => {
  applyDocumentDirection(lng)
})

export default i18n
