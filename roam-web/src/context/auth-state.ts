import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { RegistrationResult } from '../lib/registration'
import type { AuthProfile, ProfileSetupInput, SignUpInput } from '../types/auth'

export type AuthContextValue = {
  user: User | null
  profile: AuthProfile | null
  isLoading: boolean
  isConfigured: boolean
  configurationError: string | null
  isEmailVerified: boolean
  signUp: (input: SignUpInput) => Promise<RegistrationResult>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  resendVerification: () => Promise<void>
  refreshVerification: () => Promise<boolean>
  completeProfile: (input: ProfileSetupInput) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
