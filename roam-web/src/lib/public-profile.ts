import type { Timestamp } from 'firebase/firestore'
import { normalizeUsername, validateDisplayName, validateUsername } from './profile-validation'

export const publicProfileVisibility = 'public' as const

export type PublicProfileInput = {
  username: string
  displayName: string
  bio: string
  locationLabel?: string
  interests: string[]
}

export type PublicProfile = PublicProfileInput & {
  avatar: null
  visibility: typeof publicProfileVisibility
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type PublicProfileErrors = Partial<Record<'username' | 'displayName' | 'bio' | 'locationLabel' | 'interests', string>>

function normalizeInterest(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizePublicProfile(input: PublicProfileInput): PublicProfileInput {
  return {
    username: normalizeUsername(input.username),
    displayName: input.displayName.trim(),
    bio: input.bio.trim(),
    ...(input.locationLabel?.trim() ? { locationLabel: input.locationLabel.trim() } : {}),
    interests: input.interests.map(normalizeInterest).filter(Boolean),
  }
}

export function validatePublicProfile(input: PublicProfileInput): PublicProfileErrors {
  const profile = normalizePublicProfile(input)
  const errors: PublicProfileErrors = {}

  if (validateUsername(profile.username)) errors.username = 'Use 3–20 lowercase letters, numbers, or underscores.'
  if (validateDisplayName(profile.displayName)) errors.displayName = 'Use a display name of up to 60 characters.'
  if (profile.bio.length > 500) errors.bio = 'Use a biography of 500 characters or fewer.'
  if (profile.locationLabel && profile.locationLabel.length > 80) errors.locationLabel = 'Use a coarse location of 80 characters or fewer.'
  if (profile.interests.length > 8 || profile.interests.some(interest => interest.length > 40)) errors.interests = 'Use up to eight interests of 40 characters or fewer.'

  return errors
}
