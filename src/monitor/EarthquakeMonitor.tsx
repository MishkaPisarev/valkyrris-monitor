import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, Map, List, RefreshCw, Clock, Navigation, Layers, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEarthquakes, Earthquake } from './useEarthquakes'
import { MapView } from './MapView'
import { ListView } from './ListView'
import { useLanguage } from './LanguageContext'
import { translations } from './i18n'
import { LanguageSelector } from './LanguageSelector'
import { ToggleSwitch } from './ToggleSwitch'
import { EarthquakeDetailsModal } from './EarthquakeDetailsModal'
import { DisclaimerModal } from './DisclaimerModal'
import { useFirebaseNotifications } from './useFirebaseNotifications'
import { useNotifications } from './useNotifications'

type TimeRange = '24h' | '7d' | '30d'
type ViewMode = 'list' | 'map'

export function EarthquakeMonitor() {
  const { language } = useLanguage()
  const t = translations[language]
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedEarthquake, setSelectedEarthquake] = useState<Earthquake | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  
  // Show all earthquakes (no magnitude filter)
  const { earthquakes, loading, error, refetch } = useEarthquakes({ timeRange, minMagnitude: 0.1, autoRefresh })
  
  // Error boundary effect
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      console.error('[EARTHQUAKE_MONITOR] Global error:', event.error)
      setRenderError(event.error?.message || 'Unknown error')
    }
    
    window.addEventListener('error', errorHandler)
    return () => window.removeEventListener('error', errorHandler)
  }, [])

  const handleEarthquakeClick = (earthquake: Earthquake) => {
    console.log('[EARTHQUAKE_MONITOR] Opening details for:', earthquake.id)
    setSelectedEarthquake(earthquake)
  }

  const urgentQuakes = earthquakes.filter(q => q.magnitude > 4.5)

  // Enable Firebase real-time notifications for admin broadcasts
  // This should work in both LIST and MAP modes
  const firebaseNotifications = useFirebaseNotifications({ enabled: true })
  
  // Log subscription status for debugging
  if (firebaseNotifications.isConnected) {
    console.log('[EARTHQUAKE_MONITOR] Firebase notifications connected, session:', firebaseNotifications.sessionId)
  }

  // Enable push notifications for new urgent earthquakes
  // React hooks must be called unconditionally at the top level
  const notificationHook = useNotifications({ earthquakes, enabled: true })
  
  const testNotification = notificationHook?.testNotification || null
  const enableSound = notificationHook?.enableSound || undefined
  const permission = notificationHook?.permission || null
  const isSupported = notificationHook?.isSupported || false

  // Show error state if critical error occurred
  if (renderError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{language === 'ru' ? 'Ошибка загрузки' : 'Loading Error'}</h2>
          <p className="text-sm text-slate-400 mb-4">{renderError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
          >
            {language === 'ru' ? 'Перезагрузить' : 'Reload'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden" style={{ backgroundColor: '#0f172a', fontFamily: 'Inter, Roboto, sans-serif', WebkitOverflowScrolling: 'touch', minHeight: '-webkit-fill-available' }}>
      {/* Header - Fixed at top */}
      <div className="border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm p-3 md:p-4 lg:p-6 flex-shrink-0 w-full overflow-x-hidden">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Inter, Roboto, sans-serif', letterSpacing: '-0.02em' }}>
              {t.title}
            </h1>
            <p className="text-sm md:text-base text-cyan-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {t.subtitle}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <LanguageSelector />
            <Link
              to="/monitor/admin"
              className="opacity-25 hover:opacity-100 transition-opacity duration-300"
            >
              <button
                className="px-3 py-2 border border-cyan-500/30 bg-slate-800/50 hover:bg-cyan-500/20 text-xs uppercase transition-all duration-300 flex items-center space-x-2 rounded-lg backdrop-blur-sm"
                style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
                title={language === 'ru' ? 'Вход в админ-панель' : 'Admin Login'}
              >
                <Shield className="w-4 h-4" />
                <span>{language === 'ru' ? 'АДМИН' : 'ADMIN'}</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-3 md:mb-4">
          <div className="border border-cyan-500/30 bg-slate-800/50 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-xs text-slate-400 mb-1 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {t.totalEvents}
            </div>
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {earthquakes.length}
            </div>
          </div>
          <div className="border border-red-500/50 bg-red-500/10 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-xs text-slate-400 mb-1 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {t.urgent} ({'>'}4.5)
            </div>
            <div className="text-2xl font-bold text-red-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {urgentQuakes.length}
            </div>
          </div>
          <div className="border border-cyan-500/30 bg-slate-800/50 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-xs text-slate-400 mb-1 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {t.maxMagnitude}
            </div>
            <div className="text-2xl font-bold text-cyan-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {earthquakes.length > 0 ? (earthquakes[0].magnitude < 1.0 ? earthquakes[0].magnitude.toFixed(2) : earthquakes[0].magnitude.toFixed(1)) : '0.0'}
            </div>
          </div>
          <div className="border border-cyan-500/30 bg-slate-800/50 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-xs text-slate-400 mb-1 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {t.status}
            </div>
            <div className="text-sm font-bold text-green-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {loading ? t.loading : t.live}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          {/* Time Range Filter */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div className="flex border border-cyan-500/30 bg-slate-800/50 rounded-lg overflow-hidden">
              {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 text-xs uppercase transition-all duration-300 ${
                    timeRange === range
                      ? 'bg-cyan-500 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-cyan-500/20'
                  }`}
                  style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
                >
                  {range === '24h' ? t.hours24 : range === '7d' ? t.days7 : t.days30}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <div className="flex border border-cyan-500/30 bg-slate-800/50 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-xs uppercase transition-all duration-300 flex items-center space-x-2 ${
                  viewMode === 'list'
                    ? 'bg-cyan-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-cyan-500/20'
                }`}
                style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
              >
                <List className="w-4 h-4" />
                <span>{t.list}</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 text-xs uppercase transition-all duration-300 flex items-center space-x-2 ${
                  viewMode === 'map'
                    ? 'bg-cyan-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-cyan-500/20'
                }`}
                style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
              >
                <Map className="w-4 h-4" />
                <span>{t.map}</span>
              </button>
            </div>
          </div>

          {/* Auto Refresh Toggle */}
            <ToggleSwitch
              enabled={autoRefresh}
              onChange={setAutoRefresh}
              label={t.autoRefresh}
            />
          
          {/* Manual Refresh Button (when auto-refresh is off) */}
          {!autoRefresh && (
            <button
              onClick={() => refetch()}
              className="px-4 py-2 border border-cyan-500/30 bg-slate-800/50 hover:bg-cyan-500/20 text-xs uppercase transition-all duration-300 flex items-center space-x-2 rounded-lg"
              style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t.refresh}</span>
            </button>
          )}

          {/* Enable Sound Button (Mobile only) */}
          {isSupported && enableSound && (
            <button
              onClick={() => {
                if (enableSound) {
                  enableSound()
                }
              }}
              className="px-4 py-2 border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-xs uppercase transition-all duration-300 flex items-center space-x-2 rounded-lg"
              style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
              title={language === 'ru' ? 'Включить звук уведомлений' : 'Enable notification sound'}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{language === 'ru' ? 'ВКЛ. ЗВУК' : 'ENABLE SOUND'}</span>
            </button>
          )}

          {/* Test Notification Button */}
          {isSupported && testNotification && (
            <button
              onClick={() => {
                if (testNotification) {
                  testNotification()
                }
              }}
              className="px-4 py-2 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs uppercase transition-all duration-300 flex items-center space-x-2 rounded-lg"
              style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
              title={permission === 'granted' ? (language === 'ru' ? 'Тест уведомления' : 'Test notification') : (language === 'ru' ? 'Разрешите уведомления' : 'Allow notifications')}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{language === 'ru' ? 'ТЕСТ' : 'TEST'}</span>
            </button>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                {error}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area - Full Screen */}
      <div className="flex-1 flex overflow-hidden w-full" style={{ minHeight: 0 }}>
        {/* Sidebar for List View */}
        {viewMode === 'list' && (
          <div className="w-full md:w-96 border-r border-cyan-500/20 bg-slate-900/50 overflow-y-auto flex-shrink-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="p-4">
              <ListView earthquakes={earthquakes} onEarthquakeClick={handleEarthquakeClick} />
            </div>
          </div>
        )}
        
        {/* Map View - Takes remaining space */}
        {viewMode === 'map' && (
          <div className="flex-1 overflow-hidden w-full" style={{ minHeight: 0, position: 'relative' }}>
            {loading && earthquakes.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center border border-cyan-500/30 bg-slate-800/50" style={{ minHeight: '400px' }}>
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-spin" />
                  <p className="text-sm text-slate-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                    {'>'} {t.loadingData}
                  </p>
                </div>
              </div>
            ) : earthquakes.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center border border-cyan-500/30 bg-slate-800/50" style={{ minHeight: '400px' }}>
                <div className="text-center">
                  <Layers className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-slate-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                    {'>'} {t.noEarthquakes}
                  </p>
                </div>
              </div>
            ) : (
              <MapView earthquakes={earthquakes} onEarthquakeClick={handleEarthquakeClick} />
            )}
          </div>
        )}
      </div>
      
      {/* Disclaimer Modal - Gatekeeper */}
      <DisclaimerModal />

      {/* Earthquake Details Modal */}
      {selectedEarthquake && (
        <EarthquakeDetailsModal
          earthquake={selectedEarthquake}
          onClose={() => setSelectedEarthquake(null)}
        />
      )}

    </div>
  )
}
