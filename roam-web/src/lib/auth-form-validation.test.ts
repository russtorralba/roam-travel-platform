import { describe, expect, it } from 'vitest'
import { authFieldError, clearFieldErrorWhenValid } from './auth-form-validation'

describe('auth form validation recovery', () => {
  it('uses the existing validation rules for every auth field', () => {
    expect(authFieldError('displayName', '')).not.toBeNull()
    expect(authFieldError('username', 'no spaces')).not.toBeNull()
    expect(authFieldError('email', 'not-an-email')).not.toBeNull()
    expect(authFieldError('password', 'short')).not.toBeNull()
  })

  it('clears only the corrected field error once the value is valid', () => {
    const errors = {
      displayName: 'Add a display name.',
      username: 'Use 3–20 lowercase letters, numbers, or underscores.',
      email: 'Enter a valid email address.',
      password: 'Use at least 8 characters.',
    }

    expect(clearFieldErrorWhenValid(errors, 'displayName', 'Rhea')).toEqual({
      username: errors.username,
      email: errors.email,
      password: errors.password,
    })
    expect(clearFieldErrorWhenValid(errors, 'username', 'rhea_roams')).toEqual({
      displayName: errors.displayName,
      email: errors.email,
      password: errors.password,
    })
    expect(clearFieldErrorWhenValid(errors, 'email', 'rhea@example.com')).toEqual({
      displayName: errors.displayName,
      username: errors.username,
      password: errors.password,
    })
    expect(clearFieldErrorWhenValid(errors, 'password', 'fieldnotes')).toEqual({
      displayName: errors.displayName,
      username: errors.username,
      email: errors.email,
    })
  })

  it('keeps a field error until that field becomes valid', () => {
    const errors = { username: 'Use 3–20 lowercase letters, numbers, or underscores.' }
    expect(clearFieldErrorWhenValid(errors, 'username', 'still invalid')).toBe(errors)
  })
})
