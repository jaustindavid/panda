import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

// One assertion per PRD §6 access-table row. Member = an email hardcoded in
// firestore.rules (must match isMember()); stranger = not on the allowlist.
const MEMBER_EMAIL = 'austindavid@gmail.com'
const MEMBER_UID = 'austin'
const OTHER_UID = 'other-member'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'panda-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

/** A member (allowlisted, email verified). */
function member(): Firestore {
  return testEnv
    .authenticatedContext(MEMBER_UID, {
      email: MEMBER_EMAIL,
      email_verified: true,
    })
    .firestore()
}

/** Signed in + allowlisted, but email NOT verified. */
function unverifiedMember(): Firestore {
  return testEnv
    .authenticatedContext(MEMBER_UID, {
      email: MEMBER_EMAIL,
      email_verified: false,
    })
    .firestore()
}

/** Signed in, email verified, but NOT on the allowlist. */
function stranger(): Firestore {
  return testEnv
    .authenticatedContext('stranger', {
      email: 'stranger@example.com',
      email_verified: true,
    })
    .firestore()
}

/** Signed out. */
function anon(): Firestore {
  return testEnv.unauthenticatedContext().firestore()
}

/** Seed a doc bypassing rules. */
async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data)
  })
}

describe('membership gate', () => {
  it('denies an unauthenticated read', async () => {
    await assertFails(getDoc(doc(anon(), 'users/whoever')))
  })

  it('denies a signed-in non-member', async () => {
    await assertFails(getDoc(doc(stranger(), 'users/whoever')))
  })

  it('denies a member whose email is not verified', async () => {
    await assertFails(getDoc(doc(unverifiedMember(), 'users/whoever')))
  })

  it('allows a member to read', async () => {
    await seed('users/someone', { displayName: 'Someone' })
    await assertSucceeds(getDoc(doc(member(), 'users/someone')))
  })
})

describe('users — write: self', () => {
  it('allows writing own profile', async () => {
    await assertSucceeds(
      setDoc(doc(member(), `users/${MEMBER_UID}`), { displayName: 'Me' }),
    )
  })

  it("denies writing another user's profile", async () => {
    await assertFails(
      setDoc(doc(member(), `users/${OTHER_UID}`), { displayName: 'Nope' }),
    )
  })
})

describe('notes — create: self; update/delete: author', () => {
  const note = { placeId: 'p1', authorUid: MEMBER_UID, text: 'good tacos' }

  it('allows creating a note authored by self', async () => {
    await assertSucceeds(setDoc(doc(member(), 'notes/n1'), note))
  })

  it('denies creating a note attributed to someone else', async () => {
    await assertFails(
      setDoc(doc(member(), 'notes/n1'), { ...note, authorUid: OTHER_UID }),
    )
  })

  it('allows the author to update their note', async () => {
    await seed('notes/n1', note)
    await assertSucceeds(updateDoc(doc(member(), 'notes/n1'), { text: 'edit' }))
  })

  it('denies a non-author updating the note', async () => {
    await seed('notes/n1', { ...note, authorUid: OTHER_UID })
    await assertFails(updateDoc(doc(member(), 'notes/n1'), { text: 'edit' }))
  })

  it('denies a non-author deleting the note', async () => {
    await seed('notes/n1', { ...note, authorUid: OTHER_UID })
    await assertFails(deleteDoc(doc(member(), 'notes/n1')))
  })
})

describe('visits — create: self; delete: creator', () => {
  const visit = { placeId: 'p1', byUid: MEMBER_UID, at: 1000 }

  it('allows logging a visit for self', async () => {
    await assertSucceeds(setDoc(doc(member(), 'visits/v1'), visit))
  })

  it('denies logging a visit attributed to someone else', async () => {
    await assertFails(
      setDoc(doc(member(), 'visits/v1'), { ...visit, byUid: OTHER_UID }),
    )
  })

  it('allows the creator to delete their visit', async () => {
    await seed('visits/v1', visit)
    await assertSucceeds(deleteDoc(doc(member(), 'visits/v1')))
  })

  it("denies deleting another member's visit", async () => {
    await seed('visits/v1', { ...visit, byUid: OTHER_UID })
    await assertFails(deleteDoc(doc(member(), 'visits/v1')))
  })
})

describe('overrides — read/write: any member', () => {
  const override = { closeBufferMin: 60, updatedByUid: MEMBER_UID }

  it('allows any member to write an override', async () => {
    await assertSucceeds(setDoc(doc(member(), 'overrides/p1'), override))
  })

  it('denies a non-member writing an override', async () => {
    await assertFails(setDoc(doc(stranger(), 'overrides/p1'), override))
  })

  it('allows any member to read an override', async () => {
    await seed('overrides/p1', override)
    await assertSucceeds(getDoc(doc(member(), 'overrides/p1')))
  })
})

describe('nogos — read/create/delete: any member', () => {
  const nogo = { blockedByUid: MEMBER_UID, blockedAt: 1000 }

  it('allows any member to block a place', async () => {
    await assertSucceeds(setDoc(doc(member(), 'nogos/p1'), nogo))
  })
  it('denies a non-member blocking', async () => {
    await assertFails(setDoc(doc(stranger(), 'nogos/p1'), nogo))
  })
  it('allows any member to un-block (delete)', async () => {
    await seed('nogos/p1', nogo)
    await assertSucceeds(deleteDoc(doc(member(), 'nogos/p1')))
  })
})

describe('savedPlaces — read/write: any member', () => {
  const fav = { name: 'Baroni’s', addedByUid: MEMBER_UID, addedAt: 1000 }

  it('allows any member to save a favorite', async () => {
    await assertSucceeds(setDoc(doc(member(), 'savedPlaces/p1'), fav))
  })
  it('denies a non-member saving', async () => {
    await assertFails(setDoc(doc(stranger(), 'savedPlaces/p1'), fav))
  })
  it('allows any member to read + remove a favorite', async () => {
    await seed('savedPlaces/p1', fav)
    await assertSucceeds(getDoc(doc(member(), 'savedPlaces/p1')))
    await assertSucceeds(deleteDoc(doc(member(), 'savedPlaces/p1')))
  })
})

describe('deny baseline (unmatched paths)', () => {
  it('denies reading an unmatched collection', async () => {
    await assertFails(getDoc(doc(member(), 'random/p1')))
  })
  it('denies writing an arbitrary collection', async () => {
    await assertFails(setDoc(doc(member(), 'whatever/x'), { a: 1 }))
  })
})
