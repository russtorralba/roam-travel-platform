import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createUserWithEmailAndPassword, onAuthStateChanged, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { firebaseConfigurationError, firebaseServices } from '../lib/firebase'
import { normalizeUsername, validateDisplayName, validateUsername } from '../lib/profile-validation'
import { completeRegistration } from '../lib/registration'
import type { AuthProfile, ProfileSetupInput, SignUpInput } from '../types/auth'
import { AuthContext, type AuthContextValue } from './auth-state'

class ProfileSetupError extends Error {
  constructor() {
    super('Your email account was created, but your ROAM profile still needs to be completed.')
    this.name = 'ProfileSetupError'
  }
}

function profileFromSnapshot(uid: string, data: Record<string, unknown>): AuthProfile | null {
  if (data.uid !== uid || typeof data.username !== 'string' || typeof data.displayName !== 'string') return null
  return { uid, username: data.username, displayName: data.displayName }
}

function emailActionSettings() {
  return { url: `${window.location.origin}/login`, handleCodeInApp: false }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(firebaseServices))
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const generation = useRef(0)

  const loadProfile = useCallback(async (uid: string) => {
    if (!firebaseServices) return null
    const snapshot = await getDoc(doc(firebaseServices.db, 'profiles', uid))
    return snapshot.exists() ? profileFromSnapshot(uid, snapshot.data()) : null
  }, [])

  const completeProfile = useCallback(async ({ displayName, username }: ProfileSetupInput) => {
    if (!firebaseServices?.auth.currentUser) throw new Error('Sign in before completing your ROAM profile.')
    const currentUser = firebaseServices.auth.currentUser
    const normalizedUsername = normalizeUsername(username)
    const cleanDisplayName = displayName.trim()
    const usernameError = validateUsername(normalizedUsername)
    const displayNameError = validateDisplayName(cleanDisplayName)
    if (usernameError || displayNameError) throw new Error(usernameError || displayNameError || 'Profile details are invalid.')
    const profileRef = doc(firebaseServices.db, 'profiles', currentUser.uid)
    const usernameRef = doc(firebaseServices.db, 'usernames', normalizedUsername)

    await runTransaction(firebaseServices.db, async transaction => {
      const existingProfile = await transaction.get(profileRef)

      if (existingProfile.exists()) {
        const existing = profileFromSnapshot(currentUser.uid, existingProfile.data())
        if (!existing) throw new Error('Your existing profile is invalid. Contact support before continuing.')
        return
      }
      transaction.set(profileRef, {
        uid: currentUser.uid,
        username: normalizedUsername,
        displayName: cleanDisplayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      transaction.set(usernameRef, {
        uid: currentUser.uid,
        username: normalizedUsername,
        createdAt: serverTimestamp(),
      })
    })

    const nextProfile = await loadProfile(currentUser.uid)
    if (!nextProfile) throw new ProfileSetupError()
    setProfile(nextProfile)
  }, [loadProfile])

  useEffect(() => {
    if (!firebaseServices) {
      return
    }
    const unsubscribe = onAuthStateChanged(firebaseServices.auth, async nextUser => {
      const request = ++generation.current
      setIsLoading(true)
      setUser(nextUser)
      setIsEmailVerified(Boolean(nextUser?.emailVerified))
      if (!nextUser) {
        setProfile(null)
        setIsLoading(false)
        return
      }
      try {
        const nextProfile = await loadProfile(nextUser.uid)
        if (generation.current === request) setProfile(nextProfile)
      } catch {
        if (generation.current === request) setProfile(null)
      } finally {
        if (generation.current === request) setIsLoading(false)
      }
    })
    return unsubscribe
  }, [loadProfile])

  const signUp = useCallback(async ({ displayName, username, email, password }: SignUpInput) => {
    if (!firebaseServices) throw new Error(firebaseConfigurationError ?? 'Firebase is unavailable.')
    const auth = firebaseServices.auth
    return completeRegistration({
      createAccount: () => createUserWithEmailAndPassword(auth, email.trim(), password).then(credential => credential.user),
      completeProfile: async () => {
        try {
          await completeProfile({ displayName, username })
        } catch {
          throw new ProfileSetupError()
        }
      },
      sendVerification: user => sendEmailVerification(user, emailActionSettings()),
    })
  }, [completeProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!firebaseServices) throw new Error(firebaseConfigurationError ?? 'Firebase is unavailable.')
    await signInWithEmailAndPassword(firebaseServices.auth, email.trim(), password)
  }, [])

  const signOut = useCallback(async () => {
    if (!firebaseServices) return
    await firebaseSignOut(firebaseServices.auth)
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!firebaseServices) throw new Error(firebaseConfigurationError ?? 'Firebase is unavailable.')
    await sendPasswordResetEmail(firebaseServices.auth, email.trim(), emailActionSettings())
  }, [])

  const resendVerification = useCallback(async () => {
    if (!firebaseServices?.auth.currentUser) throw new Error('Sign in before requesting verification.')
    await sendEmailVerification(firebaseServices.auth.currentUser, emailActionSettings())
  }, [])

  const refreshVerification = useCallback(async () => {
    if (!firebaseServices?.auth.currentUser) return false
    await reload(firebaseServices.auth.currentUser)
    await firebaseServices.auth.currentUser.getIdToken(true)
    setUser(firebaseServices.auth.currentUser)
    setIsEmailVerified(firebaseServices.auth.currentUser.emailVerified)
    return firebaseServices.auth.currentUser.emailVerified
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    isLoading,
    isConfigured: Boolean(firebaseServices),
    configurationError: firebaseConfigurationError,
    isEmailVerified,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    resendVerification,
    refreshVerification,
    completeProfile,
  }), [completeProfile, isEmailVerified, isLoading, profile, refreshVerification, resendVerification, sendPasswordReset, signIn, signOut, signUp, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
