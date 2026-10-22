import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, where, type DocumentData, type Firestore, type QueryConstraint, type QueryDocumentSnapshot, type Timestamp } from 'firebase/firestore'
import type { JourneyDraft } from './journey-draft'

export const publicJourneyPageSize = 6

export type PublicJourney = JourneyDraft & {
  id: string
  status: 'published'
  authorUsername: string
  authorDisplayName: string
  publishedAt: Timestamp | null
}

export type PublicJourneyPage = {
  journeys: PublicJourney[]
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

function toPublicJourney(id: string, data: Record<string, unknown>): PublicJourney {
  return {
    id,
    title: data.title as string,
    destinationId: data.destinationId as string,
    category: data.category as JourneyDraft['category'],
    description: data.description as string,
    cover: data.cover as string,
    travelDate: data.travelDate as string,
    status: 'published',
    authorUsername: data.authorUsername as string,
    authorDisplayName: data.authorDisplayName as string,
    publishedAt: (data.publishedAt as Timestamp | undefined) ?? null,
  }
}

export async function listPublicJourneysPage(db: Firestore, cursor: QueryDocumentSnapshot<DocumentData> | null = null): Promise<PublicJourneyPage> {
  const constraints: QueryConstraint[] = [where('status', '==', 'published'), orderBy('publishedAt', 'desc'), limit(publicJourneyPageSize + 1)]
  if (cursor) constraints.splice(2, 0, startAfter(cursor))
  const snapshots = await getDocs(query(collection(db, 'drafts'), ...constraints))
  const visible = snapshots.docs.slice(0, publicJourneyPageSize)
  return {
    journeys: visible.map(snapshot => toPublicJourney(snapshot.id, snapshot.data())),
    nextCursor: snapshots.docs.length > publicJourneyPageSize ? visible.at(-1) ?? null : null,
    hasMore: snapshots.docs.length > publicJourneyPageSize,
  }
}

export async function getPublicJourney(db: Firestore, journeyId: string): Promise<PublicJourney | null> {
  const snapshot = await getDoc(doc(db, 'drafts', journeyId))
  return snapshot.exists() && snapshot.data().status === 'published' ? toPublicJourney(snapshot.id, snapshot.data()) : null
}

export function formatPublicJourneyDate(publishedAt: Timestamp | null) {
  return publishedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(publishedAt.toDate()) : 'Recently published'
}
