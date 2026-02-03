import { Globe } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { Language } from './i18n'

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'ENGLISH' },
    { code: 'ru', label: 'РУССКИЙ' }
  ]

  return (
    <div className="flex items-center space-x-2">
      <Globe className="w-4 h-4 text-cyan-400" />
      <div className="flex border border-cyan-500/30 bg-slate-800/50 rounded-lg overflow-hidden">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`px-3 py-2 text-xs uppercase transition-all duration-300 ${
              language === lang.code
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-cyan-500/20'
            }`}
            style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}
