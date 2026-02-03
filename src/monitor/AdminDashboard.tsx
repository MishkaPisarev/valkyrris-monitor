import { useState, useEffect } from 'react'
import { Send, LogOut, Users, Bell, Activity, Shield } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { translations } from './i18n'
import { database } from '@/lib/firebase'
import { ref, push, set, serverTimestamp, onValue, off } from 'firebase/database'

interface AdminDashboardProps {
  onLogout: () => void
}

// Admin credentials - password stored as SHA256 hash for security
const ADMIN_USERNAME = 'admin'
// SHA256 hash of 'valkyrris2024' - computed once and stored (never store plain passwords in code)
// Hash: 02e6c6ea265d0acfa0debcd8d416c5fc9c86f6775ca9b88d5c0dd320ec4c16de
const ADMIN_PASSWORD_HASH = '02e6c6ea265d0acfa0debcd8d416c5fc9c86f6775ca9b88d5c0dd320ec4c16de'

// Function to compute SHA256 hash (for password verification)
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const { language } = useLanguage()
  const t = translations[language]
  const [activeDevices, setActiveDevices] = useState(0)
  const [lastTestSent, setLastTestSent] = useState<Date | null>(null)
  const [sending, setSending] = useState(false)

  // Get active devices count from Firebase - real-time updates
  useEffect(() => {
    if (!database) {
      console.warn('[ADMIN] Firebase not configured')
      return
    }

    const sessionsRef = ref(database, 'sessions')
    
    // Listen to sessions in real-time
    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      const sessions = snapshot.val()
      if (!sessions) {
        setActiveDevices(0)
        return
      }

      // Count active sessions (last_seen within last 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      const activeSessions = Object.values(sessions).filter((session: any) => {
        if (!session || !session.last_seen) return false
        // Firebase serverTimestamp() returns an object, convert to milliseconds
        let lastSeen: number
        if (typeof session.last_seen === 'object' && session.last_seen !== null) {
          // Firebase timestamp object
          if (session.last_seen._seconds) {
            lastSeen = session.last_seen._seconds * 1000
          } else if (session.last_seen.val) {
            lastSeen = session.last_seen.val()
          } else {
            lastSeen = Date.now()
          }
        } else if (typeof session.last_seen === 'number') {
          lastSeen = session.last_seen
        } else {
          return false
        }
        return lastSeen >= fiveMinutesAgo
      })

      const deviceCount = activeSessions.length
      console.log('[ADMIN] Active devices found:', deviceCount)
      setActiveDevices(deviceCount)
    }, (error) => {
      console.error('[ADMIN] Error fetching active devices:', error)
      setActiveDevices(0)
    })

    return () => {
      off(sessionsRef)
      console.log('[ADMIN] Active devices listener removed')
    }
  }, [])

  const handleSendTestNotification = async () => {
    if (!database) {
      alert(language === 'ru'
        ? 'Firebase не настроен. Проверьте переменные окружения.'
        : 'Firebase not configured. Check environment variables.')
      return
    }

    setSending(true)

    try {
      const title = language === 'ru' 
        ? '⚠️ ТЕСТ: Землетрясение M5.0'
        : '⚠️ TEST: Earthquake M5.0'
      
      const body = language === 'ru'
        ? 'Это тестовое уведомление от администратора'
        : 'This is a test notification from admin'

      // Push notification to Firebase - this will trigger real-time events to all connected devices
      // Use 'all' as language to send to all users regardless of their language setting
      const notificationsRef = ref(database, 'notifications')
      const newNotificationRef = push(notificationsRef)
      
      await set(newNotificationRef, {
        title,
        body,
        language: 'all', // Send to all users regardless of language
        sent_at: serverTimestamp(),
        sound: true
      })

      console.log('[ADMIN] Notification broadcast sent to all devices:', newNotificationRef.key)
      setLastTestSent(new Date())
      setSending(false)
    } catch (error) {
      console.error('[ADMIN] Error sending notification:', error)
      alert(language === 'ru'
        ? 'Ошибка отправки уведомления. Проверьте консоль.'
        : 'Error sending notification. Check console.')
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 uppercase mb-2" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {language === 'ru' ? 'ПАНЕЛЬ_АДМИНИСТРАТОРА' : 'ADMIN_DASHBOARD'}
            </h1>
            <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {language === 'ru' ? 'Управление системой мониторинга' : 'Earthquake Monitor Control System'}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg transition-all flex items-center space-x-2 uppercase text-sm"
            style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
          >
            <LogOut className="w-4 h-4" />
            <span>{language === 'ru' ? 'Выйти' : 'Logout'}</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1e293b] border border-cyan-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm uppercase mb-1" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {language === 'ru' ? 'Активные устройства' : 'Active Devices'}
            </h3>
            <p className="text-3xl font-bold text-cyan-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {activeDevices}
            </p>
          </div>

          <div className="bg-[#1e293b] border border-cyan-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm uppercase mb-1" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {language === 'ru' ? 'Статус системы' : 'System Status'}
            </h3>
            <p className="text-3xl font-bold text-green-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {language === 'ru' ? 'Онлайн' : 'ONLINE'}
            </p>
          </div>

          <div className="bg-[#1e293b] border border-cyan-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Shield className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm uppercase mb-1" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {language === 'ru' ? 'Уровень доступа' : 'Access Level'}
            </h3>
            <p className="text-3xl font-bold text-yellow-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {language === 'ru' ? 'Админ' : 'ADMIN'}
            </p>
          </div>
        </div>

        {/* Test Notification Panel */}
        <div className="bg-[#1e293b] border border-cyan-500/30 rounded-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-cyan-500/10 rounded-lg">
              <Bell className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-cyan-400 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                {language === 'ru' ? 'Тестовые уведомления' : 'Test Notifications'}
              </h2>
              <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                {language === 'ru' 
                  ? 'Отправить тестовое уведомление всем активным устройствам'
                  : 'Send test notification to all active devices'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#0f172a] border border-cyan-500/20 rounded-lg p-4">
              <p className="text-gray-300 text-sm mb-2" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                {language === 'ru' 
                  ? 'Это отправит push-уведомление со звуком всем активным устройствам на сайте через Supabase real-time. Пользователи должны разрешить уведомления в браузере.'
                  : 'This will broadcast a push notification with sound to all active devices on the site via Supabase real-time. Users must have allowed notifications in their browser.'}
              </p>
              {lastTestSent && (
                <p className="text-cyan-400 text-xs" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                  {language === 'ru' 
                    ? `Последний тест отправлен: ${lastTestSent.toLocaleTimeString()}`
                    : `Last test sent: ${lastTestSent.toLocaleTimeString()}`}
                </p>
              )}
            </div>

            <button
              onClick={handleSendTestNotification}
              disabled={sending}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 uppercase"
              style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'ru' ? 'Отправка...' : 'Sending...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>{language === 'ru' ? 'Отправить тестовое уведомление' : 'Send Test Notification'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-400 text-sm" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
            <strong>{language === 'ru' ? 'Готово:' : 'Ready:'}</strong>{' '}
            {language === 'ru'
              ? 'Уведомления отправляются всем активным устройствам через Supabase real-time. Устройства автоматически подключаются при открытии монитора. Уведомления будут показаны только на устройствах с разрешенными уведомлениями.'
              : 'Notifications are broadcast to all active devices via Supabase real-time. Devices automatically connect when the monitor is opened. Notifications will only show on devices with granted notification permissions.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// Export admin credentials for login component (password hash only, never plain password)
// Note: sha256 is already exported above as a function declaration
export { ADMIN_USERNAME, ADMIN_PASSWORD_HASH }
