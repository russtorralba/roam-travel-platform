export const usernamePattern = /^[a-z0-9_]{3,20}$/

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function validateDisplayName(value: string) {
  const displayName = value.trim()
  if (!displayName) return 'Add a display name.'
  if (displayName.length > 60) return 'Use 60 characters or fewer.'
  return null
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value)
  if (!username) return 'Choose a username.'
  if (!usernamePattern.test(username)) return 'Use 3–20 lowercase letters, numbers, or underscores.'
  return null
}

export function validatePassword(value: string) {
  if (value.length < 8) return 'Use at least 8 characters.'
  return null
}
