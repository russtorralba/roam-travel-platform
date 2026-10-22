import { describe, expect, it } from 'vitest'
import { emptyJourneyDraft, normalizeJourneyDraft, validateJourneyDraft } from './journey-draft'

const validDraft = {
  ...emptyJourneyDraft,
  title: 'Morning tides',
  destinationId: 'palawan',
  category: 'Coastlines' as const,
  description: 'A quiet field note about the first light across Miniloc Lagoon.',
  travelDate: '2026-10-21',
}

describe('journey draft validation', () => {
  it('accepts the existing editor fields when they use supported values', () => {
    expect(validateJourneyDraft(validDraft)).toEqual({})
  })

  it('normalizes title and story content before persistence', () => {
    expect(normalizeJourneyDraft({ ...validDraft, title: '  Morning tides  ', description: '  Field note  ' })).toMatchObject({
      title: 'Morning tides',
      description: 'Field note',
    })
  })

  it('rejects invalid fields and unsupported static covers', () => {
    expect(validateJourneyDraft({
      ...validDraft,
      title: '',
      destinationId: 'elsewhere',
      category: 'Unlisted' as never,
      description: '',
      cover: 'https://example.com/upload.png',
      travelDate: 'tomorrow',
    })).toMatchObject({
      title: expect.any(String),
      destinationId: expect.any(String),
      category: expect.any(String),
      description: expect.any(String),
      cover: expect.any(String),
      travelDate: expect.any(String),
    })
  })
})
