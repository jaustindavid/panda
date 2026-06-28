// The circle's allowlist — v1 design (PRD §11.2 Q4): hardcoded, no Firestore
// Membership collection. Adding/removing a member = edit this list AND the
// matching `isMember()` list in `firestore.rules`, then redeploy.
//
// ⚠️ KEEP IN SYNC with firestore.rules. This client copy only drives the UI
// ("not on the list" screen); firestore.rules is the real enforcement.
//
// Emails are compared case-insensitively; keep entries lowercase.
export const ALLOWLIST: readonly string[] = [
  'austindavid@gmail.com',
  // TODO(owner): add the rest of the circle's Gmail addresses here
  // (and in firestore.rules), then redeploy.
]

export function isAllowed(email: string | null | undefined): boolean {
  return email != null && ALLOWLIST.includes(email.toLowerCase())
}
