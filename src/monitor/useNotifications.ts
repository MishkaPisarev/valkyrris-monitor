import { useEffect, useRef } from 'react'
import { Earthquake } from './useEarthquakes'
import { useLanguage } from './LanguageContext'
import { translations } from './i18n'

// Shared AudioContext that gets resumed on user interaction
let sharedAudioContext: AudioContext | null = null
let audioContextResumed = false

// Detect mobile device (especially Android Chrome)
const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

// Initialize and resume AudioContext on user interaction (critical for mobile)
// Export this function so it can be called directly from user interactions (e.g., disclaimer Accept button)
export async function activateAudioContext() {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    // Create AudioContext if it doesn't exist
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      console.log('[NOTIFICATIONS] AudioContext created, state:', sharedAudioContext.state)
    }
    
    // Resume if suspended (mobile browsers start suspended)
    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume()
      audioContextResumed = true
      console.log('[NOTIFICATIONS] AudioContext resumed, state:', sharedAudioContext.state)
      
      // For mobile: try multiple times if needed
      if (isMobile && sharedAudioContext.state === 'suspended') {
        await new Promise(resolve => setTimeout(resolve, 100))
        await sharedAudioContext.resume()
        console.log('[NOTIFICATIONS] Mobile: Second resume attempt, state:', sharedAudioContext.state)
      }
    } else if (sharedAudioContext.state === 'running') {
      audioContextResumed = true
      console.log('[NOTIFICATIONS] AudioContext already running')
    }
  } catch (error) {
    console.warn('[NOTIFICATIONS] Could not initialize/resume AudioContext:', error)
  }
}

if (typeof window !== 'undefined') {
  const initializeAndResumeAudioContext = activateAudioContext
  
  // For mobile (especially Android Chrome): try to resume on EVERY interaction
  // Mobile browsers are very strict about audio autoplay
  if (isMobile) {
    console.log('[NOTIFICATIONS] Mobile device detected - using aggressive audio resume strategy')
    document.addEventListener('click', initializeAndResumeAudioContext, { passive: true })
    document.addEventListener('touchstart', initializeAndResumeAudioContext, { passive: true })
    document.addEventListener('touchend', initializeAndResumeAudioContext, { passive: true })
    document.addEventListener('touchmove', initializeAndResumeAudioContext, { passive: true })
    // Also try on page visibility change (when user comes back to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        initializeAndResumeAudioContext()
      }
    })
  } else {
    // Desktop: once is enough
    document.addEventListener('click', initializeAndResumeAudioContext, { once: true, passive: true })
    document.addEventListener('touchstart', initializeAndResumeAudioContext, { once: true, passive: true })
    document.addEventListener('keydown', initializeAndResumeAudioContext, { once: true, passive: true })
  }
}

// Helper function to convert AudioBuffer to WAV format for HTML5 Audio fallback
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16
  
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  
  const length = buffer.length
  const arrayBuffer = new ArrayBuffer(44 + length * numChannels * bytesPerSample)
  const view = new DataView(arrayBuffer)
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
  
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length * numChannels * bytesPerSample, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, length * numChannels * bytesPerSample, true)
  
  // Convert float samples to 16-bit PCM
  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
  }
  
  return arrayBuffer
}

// Alert sound function - plays emergency alert tone
// Uses Web Audio API with HTML5 Audio fallback for mobile
export async function playAlertSound() {
  try {
    // For mobile: use a simpler approach - rely on system notification sound
    // Android Chrome blocks programmatic audio, so we use Notification API's built-in sound
    if (isMobile) {
      console.log('[NOTIFICATIONS] Mobile: Attempting to play sound via Web Audio API, HTML5 Audio, and system notification')
      
      let webAudioPlayed = false
      let html5AudioPlayed = false
      
      // Try Web Audio API first
      try {
        // Try to create and resume AudioContext if possible
        if (!sharedAudioContext) {
          sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        if (sharedAudioContext.state === 'suspended') {
          try {
            await sharedAudioContext.resume()
            console.log('[NOTIFICATIONS] Mobile: AudioContext resumed for sound')
          } catch (e) {
            console.warn('[NOTIFICATIONS] Mobile: Could not resume AudioContext:', e)
          }
        }
        
        // Try to play a simple beep if AudioContext is available
        if (sharedAudioContext && sharedAudioContext.state === 'running') {
          const duration = 0.2
          const sampleRate = sharedAudioContext.sampleRate
          const numSamples = duration * sampleRate
          const buffer = sharedAudioContext.createBuffer(1, numSamples, sampleRate)
          const data = buffer.getChannelData(0)
          
          // Generate alert tone
          for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate
            data[i] = Math.sin(2 * Math.PI * 800 * t) * 0.5
          }
          
          const source = sharedAudioContext.createBufferSource()
          source.buffer = buffer
          source.connect(sharedAudioContext.destination)
          source.start(0)
          
          webAudioPlayed = true
          console.log('[NOTIFICATIONS] Mobile: Custom sound played via Web Audio API')
        }
      } catch (mobileAudioError) {
        console.warn('[NOTIFICATIONS] Mobile: Web Audio API failed:', mobileAudioError)
      }
      
      // HTML5 Audio fallback (more reliable on some mobile browsers)
      if (!webAudioPlayed) {
        try {
          // Create a data URL for a simple beep sound
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const sampleRate = audioContext.sampleRate
          const duration = 0.2
          const numSamples = duration * sampleRate
          const buffer = audioContext.createBuffer(1, numSamples, sampleRate)
          const data = buffer.getChannelData(0)
          
          for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate
            data[i] = Math.sin(2 * Math.PI * 800 * t) * 0.5
          }
          
          // Convert to WAV format
          const wav = audioBufferToWav(buffer)
          const blob = new Blob([wav], { type: 'audio/wav' })
          const url = URL.createObjectURL(blob)
          
          // Create and play HTML5 Audio element
          const audio = new Audio(url)
          audio.volume = 0.7
          
          // Try to play
          const playPromise = audio.play()
          if (playPromise !== undefined) {
            await playPromise
            html5AudioPlayed = true
            console.log('[NOTIFICATIONS] Mobile: Sound played via HTML5 Audio')
            
            // Clean up after playing
            audio.addEventListener('ended', () => {
              URL.revokeObjectURL(url)
            })
          }
        } catch (html5Error) {
          console.warn('[NOTIFICATIONS] Mobile: HTML5 Audio fallback failed:', html5Error)
        }
      }
      
      if (!webAudioPlayed && !html5AudioPlayed) {
        console.log('[NOTIFICATIONS] Mobile: Custom audio not available - using system notification sound only')
      }
      
      // On mobile, we also rely on the Notification API's built-in sound which is more reliable
      return
    }
    
    // Web Audio API approach (for desktop or if HTML5 fails)
    // Create or reuse AudioContext
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      console.log('[NOTIFICATIONS] Created new AudioContext, state:', sharedAudioContext.state)
    }
    
    // For mobile: be more aggressive about resuming
    if (sharedAudioContext.state === 'suspended') {
      try {
        await sharedAudioContext.resume()
        audioContextResumed = true
        console.log('[NOTIFICATIONS] AudioContext resumed, state:', sharedAudioContext.state)
        
        // Double-check - mobile sometimes needs a moment
        if (sharedAudioContext.state === 'suspended') {
          await new Promise(resolve => setTimeout(resolve, 100))
          await sharedAudioContext.resume()
          console.log('[NOTIFICATIONS] Second resume attempt, state:', sharedAudioContext.state)
        }
      } catch (error) {
        console.warn('[NOTIFICATIONS] Could not resume AudioContext:', error)
        return
      }
    }
    
    // Final check before playing
    if (sharedAudioContext.state !== 'running') {
      console.warn('[NOTIFICATIONS] AudioContext not running, state:', sharedAudioContext.state)
      return
    }
    
    // Emergency alert tone: 440Hz + 880Hz (A4 + A5) for 0.5 seconds
    const duration = 0.5
    const sampleRate = sharedAudioContext.sampleRate
    const numSamples = duration * sampleRate
    const buffer = sharedAudioContext.createBuffer(1, numSamples, sampleRate)
    const data = buffer.getChannelData(0)
    
    // Generate alert tone (two frequencies mixed)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate
      // Mix two frequencies for alert sound
      data[i] = Math.sin(2 * Math.PI * 440 * t) * 0.5 + // A4
                Math.sin(2 * Math.PI * 880 * t) * 0.5    // A5
    }
    
    const source = sharedAudioContext.createBufferSource()
    source.buffer = buffer
    source.connect(sharedAudioContext.destination)
    source.start(0)
    
    // Play sound 3 times for urgency
    setTimeout(() => {
      if (sharedAudioContext && sharedAudioContext.state === 'running') {
        const source2 = sharedAudioContext.createBufferSource()
        source2.buffer = buffer
        source2.connect(sharedAudioContext.destination)
        source2.start(0)
      }
    }, 600)
    
    setTimeout(() => {
      if (sharedAudioContext && sharedAudioContext.state === 'running') {
        const source3 = sharedAudioContext.createBufferSource()
        source3.buffer = buffer
        source3.connect(sharedAudioContext.destination)
        source3.start(0)
      }
    }, 1200)
    
    console.log('[NOTIFICATIONS] Alert sound played via Web Audio API')
  } catch (error) {
    console.warn('[NOTIFICATIONS] Could not play alert sound:', error)
  }
}

interface UseNotificationsOptions {
  earthquakes: Earthquake[]
  enabled?: boolean
}

export function useNotifications({ earthquakes, enabled = true }: UseNotificationsOptions) {
  const { language } = useLanguage()
  const t = translations[language]
  const previousEarthquakesRef = useRef<Set<string>>(new Set())
  const notificationPermissionRef = useRef<NotificationPermission | null>(null)

  // Request notification permission on mount
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        notificationPermissionRef.current = permission
        console.log('[NOTIFICATIONS] Permission:', permission)
      })
    } else {
      notificationPermissionRef.current = Notification.permission
    }
  }, [enabled])

  // Monitor for new urgent earthquakes
  useEffect(() => {
    if (!enabled || !earthquakes.length || notificationPermissionRef.current !== 'granted') {
      return
    }

    const currentIds = new Set(earthquakes.map(q => q.id))
    const newEarthquakes = earthquakes.filter(q => !previousEarthquakesRef.current.has(q.id))

    newEarthquakes.forEach((quake) => {
      if (quake.magnitude > 4.5) {
        const title = language === 'ru'
          ? `⚠️ СРОЧНО: Землетрясение M${quake.magnitude.toFixed(1)}`
          : `⚠️ URGENT: Earthquake M${quake.magnitude.toFixed(1)}`

        const body = language === 'ru'
          ? `${quake.place || 'Unknown location'} | Глубина: ${quake.depth.toFixed(1)} km`
          : `${quake.place || 'Unknown location'} | Depth: ${quake.depth.toFixed(1)} km`

        try {
          // Always try to play sound (even on mobile) - user may have enabled it
          playAlertSound().catch(err => console.warn('[NOTIFICATIONS] Sound play error:', err))

          // Enhanced vibration pattern for mobile (more noticeable)
          const vibrationPattern = isMobile 
            ? [300, 100, 300, 100, 300, 100, 300] // Longer, more aggressive pattern for mobile
            : [200, 100, 200, 100, 200]

          const notification = new Notification(title, {
            body,
            icon: '/logo.svg', // Use site logo
            badge: '/logo.svg',
            tag: quake.id,
            requireInteraction: true,
            vibrate: vibrationPattern,
            timestamp: quake.time,
            sound: 'default', // This works on mobile - uses system notification sound
            silent: false // Explicitly enable sound
          } as any)

          // Auto-close after 15 seconds
          setTimeout(() => {
            notification.close()
          }, 15000)

          // Handle click - focus the window/tab
          notification.onclick = () => {
            window.focus()
            notification.close()
          }

          console.log('[NOTIFICATIONS] Sent notification for earthquake:', quake.id)
        } catch (error) {
          console.error('[NOTIFICATIONS] Error creating notification:', error)
        }
      }
    })

    previousEarthquakesRef.current = currentIds
  }, [earthquakes, enabled, language])

  // Function to explicitly enable sound on mobile (called by user interaction)
  const enableSound = async () => {
    if (isMobile) {
      console.log('[NOTIFICATIONS] Mobile: User explicitly enabling sound...')
      try {
        // Create and resume AudioContext immediately
        if (!sharedAudioContext) {
          sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        if (sharedAudioContext.state === 'suspended') {
          await sharedAudioContext.resume()
          console.log('[NOTIFICATIONS] Mobile: AudioContext enabled, state:', sharedAudioContext.state)
        }
        
        // Test play a short beep to confirm it works
        try {
          await playAlertSound()
          alert(language === 'ru' ? '✅ Звук включен! Теперь уведомления будут со звуком.' : '✅ Sound enabled! Notifications will now play sound.')
        } catch (err) {
          console.warn('[NOTIFICATIONS] Test sound failed:', err)
          alert(language === 'ru' ? '⚠️ Не удалось включить звук. Проверьте настройки браузера и громкость.' : '⚠️ Could not enable sound. Check browser settings and volume.')
        }
      } catch (error) {
        console.error('[NOTIFICATIONS] Error enabling sound:', error)
        alert(language === 'ru' ? 'Ошибка включения звука' : 'Error enabling sound')
      }
    } else {
      alert(language === 'ru' ? 'Звук уже включен на десктопе' : 'Sound is already enabled on desktop')
    }
  }

  // Test notification function
  const testNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert(language === 'ru' ? 'Уведомления не поддерживаются в этом браузере' : 'Notifications not supported in this browser')
      return
    }

    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          testNotification()
        } else {
          alert(language === 'ru' ? 'Разрешение на уведомления не предоставлено' : 'Notification permission not granted')
        }
      })
      return
    }

    const title = language === 'ru'
      ? '⚠️ ТЕСТ: Землетрясение M5.0'
      : '⚠️ TEST: Earthquake M5.0'
    
    const body = language === 'ru'
      ? 'Это тестовое уведомление для проверки системы'
      : 'This is a test notification to verify the system'

    // Aggressively activate AudioContext before playing sound (especially important for mobile)
    const playSound = async () => {
      try {
        // First, ensure AudioContext is activated (critical for mobile)
        await activateAudioContext()
        
        // For mobile: additional aggressive activation attempts
        if (isMobile) {
          // Check if AudioContext is still suspended and try again
          if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
            console.log('[NOTIFICATIONS] Test: AudioContext still suspended, retrying...')
            await new Promise(resolve => setTimeout(resolve, 50))
            await sharedAudioContext.resume()
            
            // One more attempt if still suspended
            if (sharedAudioContext.state === 'suspended') {
              await new Promise(resolve => setTimeout(resolve, 100))
              await sharedAudioContext.resume()
              console.log('[NOTIFICATIONS] Test: Final resume attempt, state:', sharedAudioContext.state)
            }
          }
        }
        
        // Now try to play custom sound
        await playAlertSound()
        console.log('[NOTIFICATIONS] Test: Sound play attempted')
      } catch (err) {
        console.warn('[NOTIFICATIONS] Test: Sound play error (this is normal on mobile):', err)
        // On mobile, custom sound may fail, but system notification sound will still work
      }
    }
    
    playSound().catch(err => console.warn('[NOTIFICATIONS] Test sound play error:', err))

    // Enhanced vibration pattern for mobile
    const vibrationPattern = isMobile 
      ? [300, 100, 300, 100, 300, 100, 300]
      : [200, 100, 200, 100, 200]

    try {
      const notification = new Notification(title, {
        body,
        icon: '/logo.svg',
        badge: '/logo.svg',
        tag: 'test-notification',
        requireInteraction: true,
        vibrate: vibrationPattern,
        sound: 'default', // This works on mobile - uses system notification sound
        silent: false // Explicitly enable sound
      } as any)

      setTimeout(() => {
        notification.close()
      }, 5000)

      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch (error) {
      console.error('[NOTIFICATIONS] Error creating test notification:', error)
    }
  }

  return {
    permission: notificationPermissionRef.current,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
    testNotification,
    enableSound: isMobile ? enableSound : undefined
  }
}

export default useNotifications
