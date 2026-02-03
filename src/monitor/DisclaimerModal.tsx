import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { activateAudioContext } from './useNotifications'

const DISCLAIMER_STORAGE_KEY = 'disclaimerAccepted'

export function DisclaimerModal() {
  const { language } = useLanguage()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Check if disclaimer was already accepted
    const accepted = sessionStorage.getItem(DISCLAIMER_STORAGE_KEY)
    if (!accepted) {
      setShowModal(true)
    }
  }, [])

  const handleAccept = async () => {
    // Activate AudioContext when user accepts disclaimer (critical for mobile sound)
    // This ensures AudioContext is ready when user tries Test Notification
    try {
      await activateAudioContext()
      console.log('[DISCLAIMER] AudioContext activated on Accept')
    } catch (error) {
      console.warn('[DISCLAIMER] Could not activate AudioContext:', error)
    }
    
    sessionStorage.setItem(DISCLAIMER_STORAGE_KEY, 'true')
    setShowModal(false)
  }

  const handleDecline = () => {
    // Redirect to main site
    window.location.href = 'https://valkyrris.com'
  }

  if (!showModal) return null

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.95)', // Very dark background (500% opacity equivalent)
        backdropFilter: 'blur(8px)'
      }}
    >
      <div 
        className="relative w-full max-w-2xl bg-slate-800 border border-cyan-500/50 rounded-lg shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#1e293b', // Dark slate
          borderColor: 'rgba(6, 182, 212, 0.5)', // Cyan border
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(6, 182, 212, 0.3)'
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyan-500/30 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-cyan-400" />
            <h2 
              className="text-xl font-bold text-white uppercase"
              style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
            >
              {language === 'ru' ? 'Важное уведомление и отказ от ответственности' : 'Important Notice & Disclaimer'}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p 
            className="text-base text-slate-300 leading-relaxed mb-6"
            style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
          >
            {language === 'ru' 
              ? 'Этот монитор является технической демонстрацией и не предназначен для спасения жизней. Данные могут быть не в реальном времени. Продолжая, вы признаете, что этот инструмент предназначен только для информационных целей, и вы всегда должны полагаться на официальные, проверенные правительственные источники для получения информации о чрезвычайных ситуациях.'
              : 'This monitor is a technical demonstration and is not intended for life-saving purposes. Data may not be real-time. By proceeding, you acknowledge that this tool is for informational purposes only and you should always rely on official, verified government sources for emergency information.'
            }
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Accept Button - High contrast cyan */}
            <button
              onClick={handleAccept}
              className="flex-1 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all duration-200 uppercase text-sm"
              style={{ 
                fontFamily: 'Inter, Roboto, sans-serif',
                backgroundColor: '#06b6d4',
                boxShadow: '0 4px 14px 0 rgba(6, 182, 212, 0.4)'
              }}
            >
              {language === 'ru' ? 'Принять' : 'Accept'}
            </button>

            {/* Decline Button - Ghost/outline style */}
            <button
              onClick={handleDecline}
              className="flex-1 px-6 py-3 border-2 border-slate-500 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-lg transition-all duration-200 uppercase text-sm bg-transparent"
              style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
            >
              {language === 'ru' ? 'Отклонить' : 'Decline'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
