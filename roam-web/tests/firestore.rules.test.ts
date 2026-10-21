import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
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

describeWithEmulator('Firestore profile and username rules', () => {
  beforeAll(async () => {
    const [host, port] = emulator!.split(':')
    testEnv = await initializeTestEnvironment({
      projectId: 'roam-rules-test',
      firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') },
    })
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
})
