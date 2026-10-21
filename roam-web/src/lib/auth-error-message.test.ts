import { describe, expect, it } from 'vitest'
import { authErrorMessage } from './auth-error-message'

describe('auth error messages', () => {
  it('keeps safe, specific Firebase Auth messages', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe('Email or password is incorrect.')
    expect(authErrorMessage({ code: 'auth/too-many-requests' })).toBe('Too many attempts. Please wait and try again.')
  })

  it('uses a non-enumerating message for profile reservation failures', () => {
    const expected = 'That username is unavailable or setup could not be completed. Please choose another username.'
    expect(authErrorMessage({ code: 'permission-denied' })).toBe(expected)
    expect(authErrorMessage({ code: 'already-exists' })).toBe(expected)
  })

  it('never exposes unknown provider error details', () => {
    expect(authErrorMessage(new Error('Internal Firebase diagnostic details'))).toBe('We couldn’t complete that request. Please try again.')
  })
})
