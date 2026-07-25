import { useTranslation } from 'react-i18next'

export default function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const current = i18n.language?.split('-')[0] || 'en'

  const switchTo = (lng: string) => {
    if (lng !== current) i18n.changeLanguage(lng)
  }

  return (
    <div className="lang-toggle" role="group" aria-label="Language switcher">
      <button type="button" className={current === 'en' ? 'active' : ''} onClick={() => switchTo('en')}>
        {t('language.en')}
      </button>
      <button type="button" className={current === 'ar' ? 'active' : ''} onClick={() => switchTo('ar')}>
        {t('language.ar')}
      </button>
    </div>
  )
}
