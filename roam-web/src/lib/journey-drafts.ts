import { addDoc, collection, deleteDoc, deleteField, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where, type Firestore, type Timestamp } from 'firebase/firestore'
import type { JourneyDraft } from './journey-draft'

export type PrivateJourneyDraft = JourneyDraft & {
  id: string
  ownerUid: string
  status: 'draft'
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type PublishedJourney = JourneyDraft & {
  id: string
  ownerUid: string
  status: 'published'
  authorUsername: string
  authorDisplayName: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  publishedAt: Timestamp | null
}

export type PublishedJourneyAuthor = {
  username: string
  displayName: string
}

function toPrivateJourneyDraft(id: string, data: Record<string, unknown>): PrivateJourneyDraft {
  return {
    id,
    ownerUid: data.ownerUid as string,
    title: data.title as string,
    destinationId: data.destinationId as string,
    category: data.category as JourneyDraft['category'],
    description: data.description as string,
    cover: data.cover as string,
    travelDate: data.travelDate as string,
    status: 'draft',
    createdAt: (data.createdAt as Timestamp | undefined) ?? null,
    updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
  }
}

function toPublishedJourney(id: string, data: Record<string, unknown>): PublishedJourney {
  return {
    id,
    ownerUid: data.ownerUid as string,
    title: data.title as string,
    destinationId: data.destinationId as string,
    category: data.category as JourneyDraft['category'],
    description: data.description as string,
    cover: data.cover as string,
    travelDate: data.travelDate as string,
    status: 'published',
    authorUsername: data.authorUsername as string,
    authorDisplayName: data.authorDisplayName as string,
    createdAt: (data.createdAt as Timestamp | undefined) ?? null,
    updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
    publishedAt: (data.publishedAt as Timestamp | undefined) ?? null,
  }
}

export async function listPrivateJourneyDrafts(db: Firestore, ownerUid: string) {
  const draftsQuery = query(collection(db, 'drafts'), where('ownerUid', '==', ownerUid), where('status', '==', 'draft'), orderBy('updatedAt', 'desc'))
  const snapshots = await getDocs(draftsQuery)
  return snapshots.docs.map(snapshot => toPrivateJourneyDraft(snapshot.id, snapshot.data()))
}

export async function listPublishedJourneysForOwner(db: Firestore, ownerUid: string) {
  const journeysQuery = query(collection(db, 'drafts'), where('ownerUid', '==', ownerUid), where('status', '==', 'published'), orderBy('updatedAt', 'desc'))
  const snapshots = await getDocs(journeysQuery)
  return snapshots.docs.map(snapshot => toPublishedJourney(snapshot.id, snapshot.data()))
}

export async function createPrivateJourneyDraft(db: Firestore, ownerUid: string, draft: JourneyDraft) {
  const reference = await addDoc(collection(db, 'drafts'), {
    ...draft,
    ownerUid,
    status: 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return reference.id
}

export async function updatePrivateJourneyDraft(db: Firestore, draftId: string, draft: JourneyDraft) {
  await updateDoc(doc(db, 'drafts', draftId), {
    ...draft,
    updatedAt: serverTimestamp(),
  })
}

export async function publishPrivateJourney(db: Firestore, draftId: string, author: PublishedJourneyAuthor) {
  await updateDoc(doc(db, 'drafts', draftId), {
    status: 'published',
    authorUsername: author.username,
    authorDisplayName: author.displayName,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updatePublishedJourney(db: Firestore, journeyId: string, draft: JourneyDraft) {
  await updateDoc(doc(db, 'drafts', journeyId), {
    ...draft,
    updatedAt: serverTimestamp(),
  })
}

export async function unpublishJourney(db: Firestore, journeyId: string) {
  await updateDoc(doc(db, 'drafts', journeyId), {
    status: 'draft',
    authorUsername: deleteField(),
    authorDisplayName: deleteField(),
    publishedAt: deleteField(),
    updatedAt: serverTimestamp(),
  })
}

export async function deletePrivateJourneyDraft(db: Firestore, draftId: string) {
  await deleteDoc(doc(db, 'drafts', draftId))
}
