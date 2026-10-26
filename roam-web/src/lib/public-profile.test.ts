import { describe, expect, it } from 'vitest'
import { normalizePublicProfile, validatePublicProfile } from './public-profile'

const validProfile = {
  username: 'russ_roams',
  displayName: 'Russ Roams',
  bio: 'Traveling thoughtfully.',
  locationLabel: 'Singapore',
  interests: ['Coastlines', 'Slow travel'],
}

describe('public profile validation', () => {
  it('normalizes only approved public profile fields', () => {
    expect(normalizePublicProfile({ ...validProfile, username: '  RUSS_ROAMS ', bio: '  Traveling thoughtfully.  ', interests: ['  Slow   travel  '] })).toEqual({
      username: 'russ_roams',
      displayName: 'Russ Roams',
      bio: 'Traveling thoughtfully.',
      locationLabel: 'Singapore',
      interests: ['Slow travel'],
    })
  })

  it('rejects values beyond public profile limits', () => {
    expect(validatePublicProfile({
      ...validProfile,
      username: 'Not valid',
      displayName: 'x'.repeat(61),
      bio: 'x'.repeat(501),
      locationLabel: 'x'.repeat(81),
      interests: Array.from({ length: 9 }, () => 'x'.repeat(41)),
    })).toMatchObject({
      username: expect.any(String),
      displayName: expect.any(String),
      bio: expect.any(String),
      locationLabel: expect.any(String),
      interests: expect.any(String),
    })
  })
})
