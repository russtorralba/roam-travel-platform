import { createContext } from 'react'
import type { CurrentUserProfile } from '../types/profile'

export type CurrentProfileContextValue = { profile: CurrentUserProfile; saveProfile: (profile: CurrentUserProfile) => boolean; resetProfile: () => void }
export const CurrentProfileContext = createContext<CurrentProfileContextValue | null>(null)
