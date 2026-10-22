import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const emulator = process.env.FIRESTORE_EMULATOR_HOST
const describeWithEmulator = emulator ? describe : describe.skip
let testEnv: RulesTestEnvironment

function profile(uid: string, username: string, displayName: string) {
  return { uid, username, displayName, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
}

function reservation(uid: string, username: string) {
  return { uid, username, createdAt: serverTimestamp() }
}

function draft(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    ownerUid: uid,
    title: 'Morning tides',
    destinationId: 'palawan',
    category: 'Coastlines',
    description: 'A private field note from Miniloc Lagoon.',
    cover: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=900&q=85',
    travelDate: '2026-10-21',
    status: 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

describeWithEmulator('Firestore profile and username rules', () => {
  beforeAll(async () => {
    const [host, port] = emulator!.split(':')
    testEnv = await initializeTestEnvironment({
      projectId: 'roam-rules-test',
      firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') },
    })
    await testEnv.clearFirestore()
  })

  afterAll(async () => {
    await testEnv?.cleanup()
  })

  it('permits an authenticated user to atomically create a matching profile and reservation', async () => {
    const db = testEnv.authenticatedContext('rhea').firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'profiles/rhea'), profile('rhea', 'rhea_roams', 'Rhea'))
    batch.set(doc(db, 'usernames/rhea_roams'), reservation('rhea', 'rhea_roams'))
    await assertSucceeds(batch.commit())
  })

  it('rejects username collisions and ownership changes', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      await setDoc(doc(db, 'profiles/elena'), profile('elena', 'elenaroams', 'Elena'))
      await setDoc(doc(db, 'usernames/elenaroams'), reservation('elena', 'elenaroams'))
    })
    const other = testEnv.authenticatedContext('other').firestore()
    const batch = writeBatch(other)
    batch.set(doc(other, 'profiles/other'), profile('other', 'elenaroams', 'Other'))
    batch.set(doc(other, 'usernames/elenaroams'), reservation('other', 'elenaroams'))
    await assertFails(batch.commit())

    const owner = testEnv.authenticatedContext('elena').firestore()
    await assertFails(updateDoc(doc(owner, 'profiles/elena'), { username: 'stolen', updatedAt: serverTimestamp() }))
  })

  it('denies a second user from overwriting an existing username reservation', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      await setDoc(doc(db, 'profiles/first'), profile('first', 'first_roams', 'First'))
      await setDoc(doc(db, 'usernames/first_roams'), reservation('first', 'first_roams'))
    })

    const second = testEnv.authenticatedContext('second').firestore()
    await assertFails(setDoc(doc(second, 'usernames/first_roams'), reservation('second', 'first_roams')))
  })

  it('permits the owner to update only their display name and denies unauthenticated reads', async () => {
    const owner = testEnv.authenticatedContext('elena').firestore()
    await assertSucceeds(updateDoc(doc(owner, 'profiles/elena'), { displayName: 'Elena R.', updatedAt: serverTimestamp() }))
    const anonymous = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anonymous, 'profiles/elena')))
    await expect(getDoc(doc(owner, 'profiles/elena'))).resolves.toMatchObject({ exists: expect.any(Function) })
  })

  it('permits an owner to create, list, update, and delete a private draft', async () => {
    const owner = testEnv.authenticatedContext('draft-owner').firestore()
    const reference = doc(owner, 'drafts/owner-draft')
    await assertSucceeds(setDoc(reference, draft('draft-owner')))
    await assertSucceeds(getDoc(reference))
    await assertSucceeds(getDocs(query(collection(owner, 'drafts'), where('ownerUid', '==', 'draft-owner'))))
    await assertSucceeds(updateDoc(reference, { title: 'Morning tides, revised', updatedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(reference))
  })

  it('denies draft access and deletion to every non-owner and anonymous client', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'drafts/private-draft'), draft('owner'))
    })
    const other = testEnv.authenticatedContext('other').firestore()
    const anonymous = testEnv.unauthenticatedContext().firestore()

    await assertFails(getDoc(doc(other, 'drafts/private-draft')))
    await assertFails(getDocs(query(collection(other, 'drafts'), where('ownerUid', '==', 'owner'))))
    await assertFails(updateDoc(doc(other, 'drafts/private-draft'), { title: 'Not yours', updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(doc(other, 'drafts/private-draft')))
    await assertFails(getDoc(doc(anonymous, 'drafts/private-draft')))
    await assertFails(setDoc(doc(anonymous, 'drafts/anonymous-draft'), draft('anonymous')))
  })

  it('rejects invalid draft shapes, spoofed ownership, and invalid statuses', async () => {
    const owner = testEnv.authenticatedContext('shape-owner').firestore()
    await assertFails(setDoc(doc(owner, 'drafts/spoofed-owner'), draft('another-owner')))
    await assertFails(setDoc(doc(owner, 'drafts/extra-field'), draft('shape-owner', { publishedAt: serverTimestamp() })))
    await assertFails(setDoc(doc(owner, 'drafts/invalid-status'), draft('shape-owner', { status: 'published' })))
    await assertFails(setDoc(doc(owner, 'drafts/invalid-destination'), draft('shape-owner', { destinationId: 'unknown' })))
    await assertFails(setDoc(doc(owner, 'drafts/invalid-cover'), draft('shape-owner', { cover: 'https://example.com/upload.png' })))
    await assertFails(setDoc(doc(owner, 'drafts/blank-story'), draft('shape-owner', { description: '' })))
  })

  it('keeps draft ownership, creation time, and draft-only status immutable', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'drafts/immutable-draft'), draft('immutable-owner'))
    })
    const owner = testEnv.authenticatedContext('immutable-owner').firestore()
    const reference = doc(owner, 'drafts/immutable-draft')

    await assertFails(updateDoc(reference, { ownerUid: 'other', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { status: 'published', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(reference, { description: 'A private note, revised by its owner.', updatedAt: serverTimestamp() }))
  })
})
