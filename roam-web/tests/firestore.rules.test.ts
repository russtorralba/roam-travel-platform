import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
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

function publishedJourney(uid: string, username: string, displayName: string, overrides: Record<string, unknown> = {}) {
  return {
    ...draft(uid),
    status: 'published',
    authorUsername: username,
    authorDisplayName: displayName,
    publishedAt: serverTimestamp(),
    ...overrides,
  }
}

function publicProfile(overrides: Record<string, unknown> = {}) {
  return {
    username: 'public_owner',
    displayName: 'Public Owner',
    bio: 'A public field profile.',
    locationLabel: 'Palawan',
    interests: ['Coastlines', 'Slow travel'],
    avatar: null,
    visibility: 'public',
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
    await assertSucceeds(getDocs(query(collection(owner, 'drafts'), where('ownerUid', '==', 'draft-owner'), where('status', '==', 'draft'), orderBy('updatedAt', 'desc'))))
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

  it('allows anonymous reads only for published journeys and requires a published-only feed query', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      await setDoc(doc(db, 'drafts/public-journey'), publishedJourney('public-owner', 'public_owner', 'Public Owner'))
      await setDoc(doc(db, 'drafts/private-journey'), draft('private-owner'))
    })
    const anonymous = testEnv.unauthenticatedContext().firestore()

    await assertSucceeds(getDoc(doc(anonymous, 'drafts/public-journey')))
    await assertFails(getDoc(doc(anonymous, 'drafts/private-journey')))
    await assertSucceeds(getDocs(query(collection(anonymous, 'drafts'), where('status', '==', 'published'), orderBy('publishedAt', 'desc'), limit(6))))
    await assertFails(getDocs(collection(anonymous, 'drafts')))
  })

  it('permits only a verified owner with a matching profile snapshot to publish a draft', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      await setDoc(doc(db, 'profiles/verified-owner'), profile('verified-owner', 'verified_owner', 'Verified Owner'))
      await setDoc(doc(db, 'drafts/verified-draft'), draft('verified-owner'))
      await setDoc(doc(db, 'profiles/unverified-owner'), profile('unverified-owner', 'unverified_owner', 'Unverified Owner'))
      await setDoc(doc(db, 'drafts/unverified-draft'), draft('unverified-owner'))
    })
    const verified = testEnv.authenticatedContext('verified-owner', { email_verified: true }).firestore()
    const unverified = testEnv.authenticatedContext('unverified-owner').firestore()

    await assertSucceeds(updateDoc(doc(verified, 'drafts/verified-draft'), {
      status: 'published',
      authorUsername: 'verified_owner',
      authorDisplayName: 'Verified Owner',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(doc(unverified, 'drafts/unverified-draft'), {
      status: 'published',
      authorUsername: 'unverified_owner',
      authorDisplayName: 'Unverified Owner',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
  })

  it('lets only a verified owner edit or unpublish a published journey', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      await setDoc(doc(db, 'profiles/published-owner'), profile('published-owner', 'published_owner', 'Published Owner'))
      await setDoc(doc(db, 'drafts/published-journey'), publishedJourney('published-owner', 'published_owner', 'Published Owner'))
    })
    const owner = testEnv.authenticatedContext('published-owner', { email_verified: true }).firestore()
    const unverifiedOwner = testEnv.authenticatedContext('published-owner').firestore()
    const other = testEnv.authenticatedContext('other-verified', { email_verified: true }).firestore()
    const anonymous = testEnv.unauthenticatedContext().firestore()
    const reference = doc(owner, 'drafts/published-journey')

    await assertSucceeds(getDocs(query(collection(owner, 'drafts'), where('ownerUid', '==', 'published-owner'), where('status', '==', 'published'), orderBy('updatedAt', 'desc'))))
    await assertFails(updateDoc(doc(unverifiedOwner, 'drafts/published-journey'), { title: 'Unverified edit', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(reference, { title: 'A revised public journey', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { ownerUid: 'other-owner', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { publishedAt: serverTimestamp(), updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { authorUsername: 'other_author', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { authorDisplayName: 'Forged Author', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(other, 'drafts/published-journey'), { title: 'Not yours', updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(doc(other, 'drafts/published-journey')))
    await assertFails(updateDoc(doc(unverifiedOwner, 'drafts/published-journey'), {
      status: 'draft',
      authorUsername: deleteField(),
      authorDisplayName: deleteField(),
      publishedAt: deleteField(),
      updatedAt: serverTimestamp(),
    }))
    await assertSucceeds(updateDoc(reference, {
      status: 'draft',
      authorUsername: deleteField(),
      authorDisplayName: deleteField(),
      publishedAt: deleteField(),
      updatedAt: serverTimestamp(),
    }))
    await assertFails(getDoc(doc(anonymous, 'drafts/published-journey')))
    const unpublished = await getDoc(reference)
    expect(unpublished.data()).not.toHaveProperty('authorUsername')
    expect(unpublished.data()).not.toHaveProperty('authorDisplayName')
    expect(unpublished.data()).not.toHaveProperty('publishedAt')
    const publicFeed = await getDocs(query(collection(anonymous, 'drafts'), where('status', '==', 'published'), orderBy('publishedAt', 'desc')))
    expect(publicFeed.docs.some(snapshot => snapshot.id === 'published-journey')).toBe(false)
  })

  it('rejects forged author identities, direct published creates, and invalid public transitions', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      await setDoc(doc(db, 'profiles/author-owner'), profile('author-owner', 'author_owner', 'Author Owner'))
      await setDoc(doc(db, 'drafts/author-draft'), draft('author-owner'))
    })
    const owner = testEnv.authenticatedContext('author-owner', { email_verified: true }).firestore()

    await assertFails(setDoc(doc(owner, 'drafts/direct-published-create'), publishedJourney('author-owner', 'author_owner', 'Author Owner')))
    await assertFails(updateDoc(doc(owner, 'drafts/author-draft'), {
      status: 'published',
      authorUsername: 'someone_else',
      authorDisplayName: 'Someone Else',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(doc(owner, 'drafts/author-draft'), {
      status: 'published',
      authorUsername: 'author_owner',
      authorDisplayName: 'Author Owner',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      extraPublicField: 'not allowed',
    }))
  })

  it('allows anonymous reads of valid public profiles but denies listing and all direct writes', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'publicProfiles/public-owner'), publicProfile())
    })
    const anonymous = testEnv.unauthenticatedContext().firestore()
    const signedIn = testEnv.authenticatedContext('public-owner').firestore()

    await assertSucceeds(getDoc(doc(anonymous, 'publicProfiles/public-owner')))
    await assertFails(getDocs(collection(anonymous, 'publicProfiles')))
    await assertFails(getDocs(collection(signedIn, 'publicProfiles')))
    await assertFails(setDoc(doc(anonymous, 'publicProfiles/new-profile'), publicProfile()))
    await assertFails(setDoc(doc(signedIn, 'publicProfiles/new-profile'), publicProfile()))
    await assertFails(setDoc(doc(signedIn, 'publicProfiles/public-owner'), publicProfile({ bio: 'Forged direct update.' })))
    await assertFails(updateDoc(doc(signedIn, 'publicProfiles/public-owner'), { bio: 'Forged direct update.' }))
    await assertFails(deleteDoc(doc(signedIn, 'publicProfiles/public-owner')))
  })

  it('denies public-profile reads for malformed, incomplete, unexpected, or non-public documents', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      await setDoc(doc(db, 'publicProfiles/malformed'), publicProfile({ avatar: 'https://example.com/avatar.png' }))
      await setDoc(doc(db, 'publicProfiles/not-public'), publicProfile({ visibility: 'private' }))
      const { bio: _bio, ...missingRequired } = publicProfile()
      await setDoc(doc(db, 'publicProfiles/missing-required'), missingRequired)
      await setDoc(doc(db, 'publicProfiles/unexpected-field'), publicProfile({ privateEmail: 'private@example.test' }))
      await setDoc(doc(db, 'publicProfiles/invalid-username'), publicProfile({ username: 'Not valid' }))
      await setDoc(doc(db, 'publicProfiles/invalid-types'), publicProfile({ bio: 42, interests: 'not-a-list' }))
      await setDoc(doc(db, 'publicProfiles/oversized-bio'), publicProfile({ bio: 'x'.repeat(501) }))
      await setDoc(doc(db, 'publicProfiles/oversized-location'), publicProfile({ locationLabel: 'x'.repeat(81) }))
      await setDoc(doc(db, 'publicProfiles/too-many-interests'), publicProfile({ interests: Array.from({ length: 9 }, (_, index) => `Interest ${index}`) }))
      await setDoc(doc(db, 'publicProfiles/overlong-interest'), publicProfile({ interests: ['x'.repeat(41)] }))
    })
    const anonymous = testEnv.unauthenticatedContext().firestore()
    for (const id of ['malformed', 'not-public', 'missing-required', 'unexpected-field', 'invalid-username', 'invalid-types', 'oversized-bio', 'oversized-location', 'too-many-interests', 'overlong-interest']) {
      await assertFails(getDoc(doc(anonymous, 'publicProfiles', id)))
    }
  })

  it('denies all client access to reports and moderation records', async () => {
    const anonymous = testEnv.unauthenticatedContext().firestore()
    const signedIn = testEnv.authenticatedContext('reporter').firestore()
    for (const [collectionName, id] of [['reports', 'report-1'], ['moderationCases', 'case-1'], ['moderationActions', 'action-1']] as const) {
      const path = `${collectionName}/${id}`
      await assertFails(getDoc(doc(anonymous, path)))
      await assertFails(getDoc(doc(signedIn, path)))
      await assertFails(getDocs(collection(signedIn, collectionName)))
      await assertFails(setDoc(doc(anonymous, path), { status: 'open' }))
      await assertFails(setDoc(doc(signedIn, path), { status: 'open' }))
    }
  })

  it('returns only published journeys for a public author query', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      await setDoc(doc(db, 'drafts/author-public'), publishedJourney('author-owner', 'author_owner', 'Author Owner'))
      await setDoc(doc(db, 'drafts/author-private'), draft('author-owner'))
      await setDoc(doc(db, 'drafts/other-public'), publishedJourney('other-owner', 'other_owner', 'Other Owner'))
    })
    const anonymous = testEnv.unauthenticatedContext().firestore()
    const snapshots = await assertSucceeds(getDocs(query(collection(anonymous, 'drafts'), where('ownerUid', '==', 'author-owner'), where('status', '==', 'published'), orderBy('publishedAt', 'desc'))))
    expect(snapshots.docs.map(snapshot => snapshot.id)).toEqual(['author-public'])
  })
})
