import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingKeys = Object.entries(config).filter(([, value]) => !value).map(([key]) => key)
const useLocalEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'

export const firebaseConfigurationError = missingKeys.length ? `Firebase is not configured. Add ${missingKeys.join(', ')} to .env.local.` : null

export const firebaseServices = firebaseConfigurationError
  ? null
  : (() => {
      const app = getApps().length ? getApp() : initializeApp(config)
      const auth = getAuth(app)
      const db = getFirestore(app)
      if (useLocalEmulators) {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
        connectFirestoreEmulator(db, '127.0.0.1', 8080)
      }
      return { auth, db }
    })()
