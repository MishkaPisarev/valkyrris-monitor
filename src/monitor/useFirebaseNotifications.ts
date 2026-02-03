import { useEffect, useRef } from 'react'
import { database } from '@/lib/firebase'
import { ref, onValue, push, set, serverTimestamp } from 'firebase/database'
import { useLanguage } from './LanguageContext'
import { activateAudioContext, playAlertSound } from './useNotifications'

// Detect mobile device
const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

interface UseFirebaseNotificationsOptions {
  enabled?: boolean
}

export function useFirebaseNotifications({ enabled = true }: UseFirebaseNotificationsOptions = {}) {
  const { language } = useLanguage()
  const subscriptionRef = useRef<(() => void) | null>(null)
  // Generate unique session ID once
  const sessionIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Register/update session in Firebase
  useEffect(() => {
    if (!enabled || !database) return

    const registerSession = async () => {
      try {
        const sessionId = sessionIdRef.current
        const sessionData = {
          session_id: sessionId,
          user_agent: navigator.userAgent,
          last_seen: serverTimestamp(),
          notification_permission: Notification.permission
        }
        
        console.log('[FIREBASE_NOTIFICATIONS] Registering session:', sessionId)
        
        // Write session data
        const sessionRef = ref(database, `sessions/${sessionId}`)
        await set(sessionRef, sessionData)
        console.log('[FIREBASE_NOTIFICATIONS] Session registered successfully')

        // Update last_seen every 30 seconds
        const interval = setInterval(async () => {
          if (database) {
            await set(ref(database, `sessions/${sessionId}/last_seen`), serverTimestamp())
          }
        }, 30000)

        return () => clearInterval(interval)
      } catch (error) {
        console.error('[FIREBASE_NOTIFICATIONS] Error registering session:', error)
      }
    }

    registerSession()
  }, [enabled])

  // Listen for admin notifications via Firebase real-time
  const languageRef = useRef(language)
  
  useEffect(() => {
    languageRef.current = language
  }, [language])

  useEffect(() => {
    if (!enabled || !database) {
      console.warn('[FIREBASE_NOTIFICATIONS] Firebase not configured or disabled')
      return
    }

    // Don't recreate subscription if it already exists
    if (subscriptionRef.current) {
      console.log('[FIREBASE_NOTIFICATIONS] Subscription already exists, skipping recreation')
      return
    }

    console.log('[FIREBASE_NOTIFICATIONS] Initializing real-time subscription...')
    console.log('[FIREBASE_NOTIFICATIONS] Notification permission:', Notification.permission)
    console.log('[FIREBASE_NOTIFICATIONS] Session ID:', sessionIdRef.current)
    console.log('[FIREBASE_NOTIFICATIONS] Firebase database:', database ? 'configured' : 'null')

    // Request notification permission
    if (Notification.permission === 'default') {
      console.log('[FIREBASE_NOTIFICATIONS] Requesting notification permission...')
      Notification.requestPermission().then((permission) => {
        console.log('[FIREBASE_NOTIFICATIONS] Permission result:', permission)
      })
    }

    // Listen to notifications
    const notificationsRef = ref(database, 'notifications')
    
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const notifications = snapshot.val()
      if (!notifications) return

      // Get the latest notification (Firebase stores as object with keys)
      const notificationKeys = Object.keys(notifications)
      if (notificationKeys.length === 0) return

      // Get the most recent notification
      const latestKey = notificationKeys[notificationKeys.length - 1]
      const notification = notifications[latestKey]

      if (!notification) return

      console.log('[FIREBASE_NOTIFICATIONS] ===== Received real-time event =====')
      console.log('[FIREBASE_NOTIFICATIONS] Notification data:', notification)

      // Check language match (or 'all' for all languages)
      const currentLanguage = languageRef.current
      if (notification.language && notification.language !== 'all' && notification.language !== currentLanguage) {
        console.log('[FIREBASE_NOTIFICATIONS] Language mismatch - skipping. Notification lang:', notification.language, 'User lang:', currentLanguage)
        return
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.warn('[FIREBASE_NOTIFICATIONS] Notifications not supported in this browser')
        return
      }

      // Check permission
      if (Notification.permission !== 'granted') {
        console.warn('[FIREBASE_NOTIFICATIONS] Notification permission not granted. Current permission:', Notification.permission)
        return
      }

      console.log('[FIREBASE_NOTIFICATIONS] Showing notification...')

      // Play sound if enabled
      if (notification.sound !== false) {
        try {
          activateAudioContext().then(() => {
            playAlertSound()
          }).catch((activationError) => {
            console.warn('[FIREBASE_NOTIFICATIONS] ⚠️ Could not activate AudioContext:', activationError)
          })
        } catch (error) {
          console.warn('[FIREBASE_NOTIFICATIONS] Error playing sound:', error)
        }
      }

      // Show notification
      try {
        const notificationOptions: NotificationOptions = {
          body: notification.body || '',
          icon: '/logo.svg',
          badge: '/logo.svg',
          tag: `earthquake-monitor-${notification.id || Date.now()}`,
          requireInteraction: false,
          silent: false
        }

        const browserNotification = new Notification(notification.title || 'Earthquake Monitor', notificationOptions)
        
        browserNotification.onclick = () => {
          window.focus()
          browserNotification.close()
        }

        console.log('[FIREBASE_NOTIFICATIONS] Received and displayed notification:', notification.id || latestKey)
      } catch (error) {
        console.error('[FIREBASE_NOTIFICATIONS] Error showing notification:', error)
      }
    }, (error) => {
      console.error('[FIREBASE_NOTIFICATIONS] Subscription error:', error)
    })

    subscriptionRef.current = unsubscribe
    console.log('[FIREBASE_NOTIFICATIONS] ✅ Successfully subscribed to real-time notifications')

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current()
        subscriptionRef.current = null
        console.log('[FIREBASE_NOTIFICATIONS] Subscription cleaned up')
      }
    }
  }, [enabled])

  return {
    isConnected: !!database && !!subscriptionRef.current,
    sessionId: sessionIdRef.current
  }
}
