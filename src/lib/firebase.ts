import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// Firebase configuration from environment variables
const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG

let firebaseApp: any = null
let database: any = null

if (firebaseConfigString) {
  try {
    const firebaseConfig = JSON.parse(firebaseConfigString)
    firebaseApp = initializeApp(firebaseConfig)
    database = getDatabase(firebaseApp)
    console.log('[FIREBASE] Initialized successfully')
  } catch (error) {
    console.warn('[FIREBASE] Failed to initialize:', error)
  }
} else {
  console.warn('[FIREBASE] Missing VITE_FIREBASE_CONFIG environment variable')
}

export { database, firebaseApp }
