# ROAM Travel Platform

ROAM is a React, TypeScript, Vite, and Tailwind prototype for editorial travel stories. Its sample travelers, posts, vlogs, saved items, notifications, and journey drafts remain frontend demo content.

## Local development

```powershell
npm install
npm run dev
```

Run quality checks with:

```powershell
npm run lint
npm test
npm run build
```

## Firebase authentication setup

Phase 6A adds real Firebase Email/Password authentication and a private, user-owned Firestore account profile. It does not add publishing, uploads, billing, or social writes.

1. In the Firebase Console, create or select the intended Firebase project and register a **Web** app.
2. Copy `.env.example` to `.env.local`, then fill in the Web app values. Do not commit `.env.local`, service-account JSON, or administrator credentials.
3. In **Authentication → Sign-in method**, enable **Email/Password**.
4. In **Firestore Database**, create a Cloud Firestore database. Start in production mode and choose the intended region; this application does not require enabling paid Firebase services for this phase.
5. In **Authentication → Settings → Authorized domains**, add every domain that will use login or email-action links, including the local development host and each preview/production domain.
6. In **Authentication → Templates**, review the verification and password-reset email templates. The app sends users back to `/login`; ensure that origin is authorized before testing.
7. Review `firestore.rules`. These rules default to deny, keep Firebase Authentication emails out of profile documents, and require the matching profile/username reservation to be created atomically.

### Deploy Firestore rules manually

Rules are included locally but are **not published by this repository**. After reviewing them, either paste `firestore.rules` into **Firestore Database → Rules** in the Firebase Console and publish there, or use the Firebase CLI yourself:

```powershell
npx firebase-tools login
npx firebase-tools use your-project-id
npx firebase-tools deploy --only firestore:rules
```

`firebase.json` points the CLI at `firestore.rules`. Publishing rules is a deliberate console/CLI action and must happen before browser registration tests can be trusted.

### Test Firestore rules locally

The regular `npm test` command runs pure profile-validation tests. Rules tests require a local Firestore Emulator and never contact production:

```powershell
npx firebase-tools emulators:start --only firestore
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
npm run test:rules
```

The rules suite covers permitted atomic profile/reservation creation, username collision denial, ownership restrictions, immutable usernames, and anonymous read denial.

## Security model

- Firebase Authentication is the only place this phase handles account email addresses.
- `profiles/{uid}` contains only intentionally public-style identity fields: `uid`, `username`, `displayName`, and timestamps. It does not contain email addresses.
- `usernames/{normalizedUsername}` holds a create-only reservation bound to the owning Firebase Auth UID and is not readable by clients.
- The client uses a Firestore transaction to create the profile and reservation together. Rules use `getAfter()` to require their matching relationship.
- A Firebase Auth account that exists without a Firestore profile is directed to `/setup-profile` to finish setup instead of creating a second account.
- Email verification is required before future publishing permissions. Publishing itself is not implemented in this phase.
