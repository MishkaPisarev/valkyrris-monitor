import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from './LanguageContext'
import { activateAudioContext, playAlertSound } from './useNotifications'

// Detect mobile device
const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

interface UseSupabaseNotificationsOptions {
  enabled?: boolean
}

export function useSupabaseNotifications({ enabled = true }: UseSupabaseNotificationsOptions = {}) {
  const { language } = useLanguage()
  const subscriptionRef = useRef<any>(null)
  // Generate unique session ID once
  const sessionIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Register/update session in Supabase
  useEffect(() => {
    if (!enabled || !supabase) return

    const registerSession = async () => {
      try {
        const sessionId = sessionIdRef.current
        const sessionData = {
          session_id: sessionId,
          user_agent: navigator.userAgent,
          last_seen: new Date().toISOString(),
          notification_permission: Notification.permission
        }
        
        console.log('[SUPABASE_NOTIFICATIONS] Registering session:', sessionId)
        console.log('[SUPABASE_NOTIFICATIONS] Session data:', sessionData)
        
        if (!supabase) return
        
        // Try insert first
        const { error: insertError } = await supabase
          .from('monitor_sessions')
          .insert(sessionData)
        
        if (insertError) {
          // If unique violation (23505), try update instead
          if (insertError.code === '23505') {
            console.log('[SUPABASE_NOTIFICATIONS] Session exists, updating...')
            const { error: updateError } = await supabase
              .from('monitor_sessions')
              .update({
                user_agent: navigator.userAgent,
                last_seen: new Date().toISOString(),
                notification_permission: Notification.permission
              })
              .eq('session_id', sessionId)
            
            if (updateError) {
              console.error('[SUPABASE_NOTIFICATIONS] Update error:', updateError)
              console.error('[SUPABASE_NOTIFICATIONS] Update error details:', JSON.stringify(updateError, null, 2))
            } else {
              console.log('[SUPABASE_NOTIFICATIONS] Session updated successfully')
            }
          } else {
            console.error('[SUPABASE_NOTIFICATIONS] Insert error:', insertError)
            console.error('[SUPABASE_NOTIFICATIONS] Insert error code:', insertError.code)
            console.error('[SUPABASE_NOTIFICATIONS] Insert error message:', insertError.message)
            console.error('[SUPABASE_NOTIFICATIONS] Insert error details:', JSON.stringify(insertError, null, 2))
          }
        } else {
          console.log('[SUPABASE_NOTIFICATIONS] Session registered successfully (new session)')
        }

        // Update last_seen every 30 seconds
        const interval = setInterval(async () => {
          if (supabase) {
            await supabase
              .from('monitor_sessions')
              .update({ last_seen: new Date().toISOString() })
              .eq('session_id', sessionId)
          }
        }, 30000)

        return () => clearInterval(interval)
      } catch (error) {
        console.error('[SUPABASE_NOTIFICATIONS] Error registering session:', error)
      }
    }

    registerSession()
  }, [enabled])

  // Listen for admin notifications via Supabase real-time
  // Use a ref to track current language so we don't recreate subscription on language change
  const languageRef = useRef(language)
  
  useEffect(() => {
    languageRef.current = language
  }, [language])

  useEffect(() => {
    if (!enabled || !supabase) {
      console.warn('[SUPABASE_NOTIFICATIONS] Supabase not configured or disabled')
      return
    }

    // Don't recreate subscription if it already exists
    if (subscriptionRef.current) {
      console.log('[SUPABASE_NOTIFICATIONS] Subscription already exists, skipping recreation')
      return
    }

    console.log('[SUPABASE_NOTIFICATIONS] Initializing real-time subscription...')
    console.log('[SUPABASE_NOTIFICATIONS] Notification permission:', Notification.permission)
    console.log('[SUPABASE_NOTIFICATIONS] Notifications supported:', 'Notification' in window)
    console.log('[SUPABASE_NOTIFICATIONS] Session ID:', sessionIdRef.current)
    console.log('[SUPABASE_NOTIFICATIONS] Supabase client:', supabase ? 'configured' : 'null')
    console.log('[SUPABASE_NOTIFICATIONS] Mobile device:', isMobile)

    // Request notification permission
    if (Notification.permission === 'default') {
      console.log('[SUPABASE_NOTIFICATIONS] Requesting notification permission...')
      Notification.requestPermission().then((permission) => {
        console.log('[SUPABASE_NOTIFICATIONS] Permission result:', permission)
      })
    }

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('admin_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        async (payload) => {
          console.log('[SUPABASE_NOTIFICATIONS] ===== Received real-time event =====')
          console.log('[SUPABASE_NOTIFICATIONS] Full payload:', JSON.stringify(payload, null, 2))
          const notification = payload.new as any
          console.log('[SUPABASE_NOTIFICATIONS] Notification data:', notification)
          console.log('[SUPABASE_NOTIFICATIONS] Notification ID:', notification.id)
          console.log('[SUPABASE_NOTIFICATIONS] Notification title:', notification.title)
          console.log('[SUPABASE_NOTIFICATIONS] Notification body:', notification.body)
          console.log('[SUPABASE_NOTIFICATIONS] Notification language:', notification.language)
          
          // Get current language from ref (don't depend on closure)
          const currentLanguage = languageRef.current
          console.log('[SUPABASE_NOTIFICATIONS] Current user language:', currentLanguage)
          
          // Check if notification matches user's language or is language-agnostic
          if (notification.language && notification.language !== currentLanguage && notification.language !== 'all') {
            console.log('[SUPABASE_NOTIFICATIONS] Language mismatch - skipping. Notification lang:', notification.language, 'User lang:', currentLanguage)
            return
          }

          // Check if browser notifications are supported and permitted
          if (typeof window === 'undefined' || !('Notification' in window)) {
            console.warn('[SUPABASE_NOTIFICATIONS] Notifications not supported in this browser')
            return
          }

          if (Notification.permission !== 'granted') {
            console.warn('[SUPABASE_NOTIFICATIONS] Notification permission not granted. Current permission:', Notification.permission)
            return
          }

          console.log('[SUPABASE_NOTIFICATIONS] Showing notification...')
          console.log('[SUPABASE_NOTIFICATIONS] Mobile device:', isMobile)
          console.log('[SUPABASE_NOTIFICATIONS] Notification permission:', Notification.permission)

          try {
            // Activate AudioContext before playing sound (critical for mobile)
            // This ensures AudioContext is ready even if user hasn't interacted with the page recently
            console.log('[SUPABASE_NOTIFICATIONS] Activating AudioContext before sound...')
            try {
              await activateAudioContext()
              console.log('[SUPABASE_NOTIFICATIONS] ✅ AudioContext activated successfully')
            } catch (activationError) {
              console.warn('[SUPABASE_NOTIFICATIONS] ⚠️ Could not activate AudioContext:', activationError)
              // Continue anyway - playAlertSound will try to activate it too
            }
            
            // Always try to play sound (even on mobile) - user may have enabled it
            // Use the improved playAlertSound from useNotifications.ts which has HTML5 Audio fallback
            console.log('[SUPABASE_NOTIFICATIONS] Attempting to play sound...')
            await playAlertSound()
            console.log('[SUPABASE_NOTIFICATIONS] ✅ Sound play attempted (check console for results)')

            // Enhanced vibration pattern for mobile (more noticeable)
            const vibrationPattern = isMobile 
              ? [300, 100, 300, 100, 300, 100, 300] // Longer, more aggressive pattern for mobile
              : [200, 100, 200, 100, 200]

            // Show browser notification
            // On mobile, 'sound: default' uses the system notification sound which works better
            const browserNotification = new Notification(notification.title, {
              body: notification.body,
              icon: '/logo.svg',
              badge: '/logo.svg',
              tag: `admin-notification-${notification.id}`,
              requireInteraction: true,
              vibrate: vibrationPattern,
              timestamp: new Date(notification.created_at).getTime(),
              sound: 'default', // This works on mobile - uses system notification sound
              silent: false // Explicitly enable sound
            } as any)

            // Auto-close after 15 seconds
            setTimeout(() => {
              browserNotification.close()
            }, 15000)

            // Handle click - focus the window/tab
            browserNotification.onclick = () => {
              window.focus()
              browserNotification.close()
            }

            console.log('[SUPABASE_NOTIFICATIONS] Received and displayed notification:', notification.id)

            // Mark notification as sent (optional)
            if (!notification.sent_at && supabase) {
              await supabase!
                .from('admin_notifications')
                .update({ sent_at: new Date().toISOString() })
                .eq('id', notification.id)
            }
          } catch (error) {
            console.error('[SUPABASE_NOTIFICATIONS] Error showing notification:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log('[SUPABASE_NOTIFICATIONS] Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[SUPABASE_NOTIFICATIONS] ✅ Successfully subscribed to real-time notifications')
          console.log('[SUPABASE_NOTIFICATIONS] Channel active, listening for admin notifications...')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[SUPABASE_NOTIFICATIONS] ❌ Channel error - check Supabase configuration')
        } else if (status === 'TIMED_OUT') {
          console.error('[SUPABASE_NOTIFICATIONS] ❌ Subscription timed out')
        } else if (status === 'CLOSED') {
          console.warn('[SUPABASE_NOTIFICATIONS] ⚠️ Subscription closed - will attempt to reconnect')
          // Reset subscription ref so it can be recreated
          subscriptionRef.current = null
        }
      })
    
    if (!supabase) {
      console.error('[SUPABASE_NOTIFICATIONS] Supabase is null, cannot create subscription')
      return
    }

    subscriptionRef.current = channel

    return () => {
      // Don't cleanup subscription on unmount - keep it alive
      // Only cleanup if explicitly disabled
      if (!enabled && subscriptionRef.current && supabase) {
        console.log('[SUPABASE_NOTIFICATIONS] Cleaning up subscription (disabled)...')
        supabase!.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      } else {
        console.log('[SUPABASE_NOTIFICATIONS] Keeping subscription alive (component re-render)')
      }
    }
  }, [enabled]) // Removed 'language' dependency - use ref instead to avoid recreating subscription

  return {
    sessionId: sessionIdRef.current,
    isConnected: !!subscriptionRef.current
  }
}
