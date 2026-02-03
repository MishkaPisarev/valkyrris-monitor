import { useLanguage } from './LanguageContext'
import { translations } from './i18n'

interface ToggleSwitchProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  label?: string
}

export function ToggleSwitch({ enabled, onChange, label }: ToggleSwitchProps) {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <div className="flex items-center space-x-3">
      {label && (
        <span className="text-xs text-slate-400 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2
          ${enabled 
            ? 'bg-green-500 focus:ring-green-500' 
            : 'bg-red-500 focus:ring-red-500'
          }
        `}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`
            inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out
            ${enabled ? 'translate-x-5' : 'translate-x-0.5'}
          `}
        />
      </button>
    </div>
  )
}
