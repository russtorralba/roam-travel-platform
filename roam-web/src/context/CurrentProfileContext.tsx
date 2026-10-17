import { type ReactNode, useMemo, useState } from 'react'
import { travelers } from '../data/mock-data'
import type { CurrentUserProfile } from '../types/profile'
import { CurrentProfileContext, type CurrentProfileContextValue } from './current-profile-state'

const storageKey = 'roam-current-profile-v1'
const originalProfile: CurrentUserProfile = { ...travelers[0], biography: '“Documenting fragile coastlines, endemic flora, and quiet morning rituals across Southeast Asia and the Japanese archipelago. Dedicated to zero-trace exploration.” Currently compiling acoustic field recordings in the limestone grottoes of northern Palawan.', interests: ['Marine conservation', 'Free diving', 'Cultural heritage', 'Binaural sound', 'Mountain trails'] }

function readProfile(): CurrentUserProfile { try { const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Partial<CurrentUserProfile> | null; if (!saved || typeof saved.name !== 'string' || typeof saved.location !== 'string' || typeof saved.biography !== 'string' || !Array.isArray(saved.interests) || !saved.interests.every(item => typeof item === 'string')) return originalProfile; return { ...originalProfile, name: saved.name, location: saved.location, biography: saved.biography, interests: saved.interests.slice(0, 8) } } catch { return originalProfile } }

export function CurrentProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<CurrentUserProfile>(readProfile)
  const value = useMemo<CurrentProfileContextValue>(() => ({ profile, saveProfile: next => { try { localStorage.setItem(storageKey, JSON.stringify(next)); setProfile(next); return true } catch { return false } }, resetProfile: () => { try { localStorage.removeItem(storageKey) } catch { /* storage unavailable */ } setProfile(originalProfile) } }), [profile])
  return <CurrentProfileContext.Provider value={value}>{children}</CurrentProfileContext.Provider>
}
