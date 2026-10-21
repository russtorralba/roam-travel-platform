import { describe, expect, it } from 'vitest'
import { normalizeUsername, validateDisplayName, validatePassword, validateUsername } from './profile-validation'

describe('profile validation', () => {
  it('normalizes usernames before validation', () => {
    expect(normalizeUsername('  Roam_Traveler  ')).toBe('roam_traveler')
    expect(validateUsername('  Roam_Traveler  ')).toBeNull()
  })

  it('rejects unsafe username formats', () => {
    expect(validateUsername('no spaces')).not.toBeNull()
    expect(validateUsername('ab')).not.toBeNull()
    expect(validateUsername('way-too-long-for-a-roam-username')).not.toBeNull()
  })

  it('requires a bounded display name and password', () => {
    expect(validateDisplayName('')).not.toBeNull()
    expect(validateDisplayName('A'.repeat(61))).not.toBeNull()
    expect(validateDisplayName('Rhea')).toBeNull()
    expect(validatePassword('short')).not.toBeNull()
    expect(validatePassword('fieldnotes')).toBeNull()
  })
})
