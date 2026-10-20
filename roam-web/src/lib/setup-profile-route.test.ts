import { describe, expect, it } from 'vitest'
import { setupProfileRoute } from './setup-profile-route'

describe('setup profile route', () => {
  it('waits for Firebase auth hydration before redirecting', () => {
    expect(setupProfileRoute(true, false, false)).toBe('loading')
  })

  it('redirects only a settled, unauthenticated visitor to login', () => {
    expect(setupProfileRoute(false, false, false)).toBe('/login')
  })

  it('redirects a settled, completed account to its account page', () => {
    expect(setupProfileRoute(false, true, true)).toBe('/me')
  })

  it('keeps a settled account without a profile on setup', () => {
    expect(setupProfileRoute(false, true, false)).toBeNull()
  })
})
