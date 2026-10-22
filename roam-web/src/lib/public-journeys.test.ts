import { describe, expect, it, vi } from 'vitest'

const firestore = vi.hoisted(() => ({
  collection: vi.fn(() => 'drafts-collection'),
  doc: vi.fn((_: unknown, __: string, id: string) => ({ id })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(value => ({ limit: value })),
  orderBy: vi.fn((...args: unknown[]) => ({ orderBy: args })),
  query: vi.fn((...args: unknown[]) => args),
  startAfter: vi.fn(cursor => ({ startAfter: cursor })),
  where: vi.fn((...args: unknown[]) => ({ where: args })),
}))

vi.mock('firebase/firestore', () => firestore)

import { getPublicJourney, listPublicJourneysPage, publicJourneyPageSize } from './public-journeys'

const publishedData = {
  title: 'A quiet morning in Palawan',
  destinationId: 'palawan',
  category: 'Coastlines',
  description: 'A published story.',
  cover: '',
  travelDate: '2026-10-21',
  status: 'published',
  authorUsername: 'roam_tester',
  authorDisplayName: 'ROAM Tester',
  publishedAt: { toDate: () => new Date('2026-10-21T00:00:00.000Z') },
}

function snapshot(id: string, data = publishedData) {
  return { id, data: () => data }
}

describe('public journey data access', () => {
  it('loads a bounded published-only page and exposes a cursor only when more results exist', async () => {
    const docs = Array.from({ length: publicJourneyPageSize + 1 }, (_, index) => snapshot(`journey-${index}`))
    firestore.getDocs.mockResolvedValue({ docs })

    const page = await listPublicJourneysPage({} as never)

    expect(firestore.where).toHaveBeenCalledWith('status', '==', 'published')
    expect(firestore.orderBy).toHaveBeenCalledWith('publishedAt', 'desc')
    expect(firestore.limit).toHaveBeenCalledWith(publicJourneyPageSize + 1)
    expect(page.journeys).toHaveLength(publicJourneyPageSize)
    expect(page.hasMore).toBe(true)
    expect(page.nextCursor).toBe(docs[publicJourneyPageSize - 1])
  })

  it('uses the supplied cursor and returns an empty state safely', async () => {
    const cursor = snapshot('last-visible')
    firestore.getDocs.mockResolvedValue({ docs: [] })

    const page = await listPublicJourneysPage({} as never, cursor as never)

    expect(firestore.startAfter).toHaveBeenCalledWith(cursor)
    expect(page).toEqual({ journeys: [], nextCursor: null, hasMore: false })
  })

  it('returns a public journey only when a document is published', async () => {
    firestore.getDoc.mockResolvedValue({ exists: () => true, id: 'public-id', data: () => publishedData })
    await expect(getPublicJourney({} as never, 'public-id')).resolves.toMatchObject({ id: 'public-id', status: 'published' })

    firestore.getDoc.mockResolvedValue({ exists: () => true, id: 'private-id', data: () => ({ ...publishedData, status: 'draft' }) })
    await expect(getPublicJourney({} as never, 'private-id')).resolves.toBeNull()
  })

  it('surfaces Firestore load failures to the page-level error state', async () => {
    firestore.getDocs.mockRejectedValueOnce(new Error('unavailable'))

    await expect(listPublicJourneysPage({} as never)).rejects.toThrow('unavailable')
  })
})
