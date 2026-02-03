import { AlertTriangle, MapPin, Clock, Navigation, Layers } from 'lucide-react'
import { Earthquake } from './useEarthquakes'
import { useLanguage } from './LanguageContext'
import { translations } from './i18n'
import { useTranslatedEarthquakes } from './useTranslatedEarthquakes'

interface ListViewProps {
  earthquakes: Earthquake[]
  onEarthquakeClick?: (earthquake: Earthquake) => void
}

export function ListView({ earthquakes, onEarthquakeClick }: ListViewProps) {
  const { language } = useLanguage()
  const t = translations[language]
  const translatedEarthquakes = useTranslatedEarthquakes(earthquakes)
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString(
      language === 'ru' ? 'ru-RU' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }
    )
  }

  return (
    <div className="h-full flex flex-col border border-cyan-500/30 bg-slate-800/30 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-cyan-500/30 bg-slate-900/50 flex-shrink-0">
        <div className="text-xs text-cyan-400 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
          {t.eventLog}
        </div>
      </div>
      <div className="divide-y divide-cyan-500/20 flex-1 overflow-y-auto">
        {translatedEarthquakes.length === 0 ? (
          <div className="p-8 text-center text-slate-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
            {t.noEarthquakes}
          </div>
        ) : (
          translatedEarthquakes.map((quake) => {
            // Edge case: Validate quake data
            if (!quake || !quake.id) {
              console.warn('[LIST_VIEW] Skipping invalid quake:', quake)
              return null
            }

            const isUrgent = quake.magnitude > 4.5
            return (
            <div
              key={quake.id}
              className={`p-4 hover:bg-slate-800/50 transition-all duration-300 ${
                isUrgent ? 'bg-red-500/10 border-l-4 border-red-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {isUrgent && (
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <div className={`text-2xl font-bold ${isUrgent ? 'text-red-400' : 'text-cyan-400'}`} style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                      M {quake.magnitude < 1.0 ? quake.magnitude.toFixed(2) : quake.magnitude.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-400 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                      {isUrgent ? `[${t.urgent}]` : ''}
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                      <span>{quake.translatedPlace || quake.place}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>{t.depth}: {quake.depth.toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Navigation className="w-4 h-4 text-cyan-400" />
                      <span>{t.coordinates}: {quake.latitude.toFixed(3)}° | {quake.longitude.toFixed(3)}°</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>{formatTime(quake.time)}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('[LIST_VIEW] Details button clicked for:', quake.id)
                    onEarthquakeClick?.(quake)
                  }}
                  className="ml-4 px-3 py-1 border border-cyan-500/30 bg-slate-800/50 hover:bg-cyan-500/20 text-xs uppercase transition-all duration-300 rounded-lg"
                  style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
                >
                  {t.details}
                </button>
              </div>
            </div>
            )
          })
        )}
      </div>
    </div>
  )
}
