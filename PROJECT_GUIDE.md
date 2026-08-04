# RelayBoard project guide

Read this first before changing the project. It is a compact map of the architecture and the non-negotiable design decisions.

## What this is

RelayBoard is a React + Vite + TypeScript workspace feed. It intentionally has **no custom backend, REST API, or server code**. The browser talks directly to Firebase Authentication and Cloud Firestore using the modular Firebase Web SDK.

Primary product behavior is realtime: changes must reach open clients through Firestore listeners, not refreshes or polling.

## Start here

| Need | Files |
| --- | --- |
| App boot, auth gate, routing | `src/main.tsx`, `src/App.tsx`, `src/hooks/use-auth.ts` |
| Main screen and header controls | `src/pages/workspace-page.tsx` |
| Post UI, actions, comments | `src/components/post-card.tsx`, `src/components/comments.tsx`, `src/components/create-post-dialog.tsx` |
| All Firestore reads/writes | `src/services/posts.service.ts` |
| Firebase initialization | `src/firebase/config.ts` |
| Data types, labels, action mapping | `src/types/index.ts` |
| Access control | `firestore.rules` |
| Hosting and Firestore index deployment | `firebase.json`, `firestore.indexes.json` |

## Running locally

```bash
cp .env.example .env
npm install
npm run dev
```

Fill `.env` using the Firebase web-app configuration. Google sign-in must be enabled in Firebase Authentication, Firestore must exist, and `firestore.rules` must be deployed before authenticated writes work.

Verification commands:

```bash
npm run lint
npm run build
```

## Data model

All current UI uses workspace ID `main` (`DEFAULT_WORKSPACE_ID` in `src/firebase/config.ts`).

```text
workspaces/{workspaceId}/posts/{postId}
  type, title, description
  author: { uid, name, photoURL }
  createdAt, updatedAt
  actionCounts: { helpful, affected, join, acknowledge, claim, vote }
  totalActionCount

  actions/{userId}
    actionType, userId, createdAt

  comments/{commentId}
    text, author, createdAt
```

`actions/{userId}` is deliberately keyed by user ID. That is the duplicate-action guard. `actionCounts` is denormalized on the post for fast feed rendering and must always be changed in the same transaction that creates the action record.

## Realtime behavior

- The feed uses `onSnapshot`, newest first, capped at 50 posts.
- Selecting a type tab runs a `where("type", "==", type)` Firestore query; its composite index is in `firestore.indexes.json`.
- Comments only subscribe after the discussion is expanded, to reduce reads.
- The current user’s action is a live listener on `actions/{userId}`.
- Local persistence is enabled with multi-tab support in Firebase initialization.

Keep Firestore path construction, queries, listeners, and transactions in `src/services/`, not in page or component files.

## Security-critical rules

`firestore.rules` is part of the feature, not optional documentation. It currently enforces:

- Auth is required for workspace data.
- Only the post author can edit content or delete a post.
- Comment authorship is immutable; only its author can delete it.
- An action can be created only at the caller’s own user-ID document.
- An action create and exactly-one matching post counter increment must occur together.
- Timestamps must use the server timestamp (`request.time`).

If you change a post field, action type, transaction shape, or write path, update both the service code **and** the rules in the same change. Deploy rules separately with `firebase deploy --only firestore:rules`.

## Adding a post or action type

Do not add a type in only the UI. Update all of these:

1. `postTypes`, `PostType`, `actionMeta`, `typeLabels`, and counts in `src/types/index.ts`.
2. `typeStyle` in `src/components/post-card.tsx`.
3. The Firestore transaction behavior in `src/services/posts.service.ts` if the action semantics differ.
4. `validCounts`, `validPostType`, `matchingAction`, and `countForActionIsIncremented` in `firestore.rules`.
5. `firestore.indexes.json` only if new queries need a composite index.

## UI conventions

- Tailwind is used for all styling; global tokens live in `src/index.css`.
- `src/components/ui/` contains locally owned shadcn-style/Radix primitives. Prefer extending them over adding another component library.
- Use the existing toast provider for user-facing success/error feedback.
- Avoid heavy motion; RelayBoard should remain sparse, responsive, and productivity-tool-like.

## Browser notifications

`src/hooks/use-post-notifications.ts` listens for Firestore `added` changes after the initial feed hydration and creates native browser notifications after permission is granted from the header.

Important limitations:

- This is an in-browser notification implementation, so RelayBoard must remain open.
- A native alert is attempted for every new post received after permission is granted. The workspace also shows an in-app receipt toast, which helps distinguish a Firestore-listener failure from an OS/browser notification failure.
- Browser notifications generally require `https://` (or `http://localhost`) and can be blocked by browser or OS settings.
- Native notification sound cannot be forced by the web platform. `src/services/notification-sound.service.ts` plays a lightweight in-app chime after the user enables or tests alerts; this only works while the page is open.
- Closed-app/background notifications require Firebase Cloud Messaging and a trusted sender; that is outside this frontend-only MVP.

If notifications are being changed, test permission state first (`Notification.permission`), then verify the Firestore listener receives an `added` change from another account before changing notification delivery code.

## Known operational caveats

- Deleting a Firestore document does not delete its subcollections. Deleted posts disappear from the feed and their subcollections become unreadable under current rules, but their orphaned documents remain until an administrative cleanup strategy is added.
- The app is a single shared workspace today. Adding private workspaces requires membership/role documents and stricter workspace-scoped rules; do not assume the current authenticated-user-only rule is sufficient for private data.
- The feed currently loads the newest 50 posts. Use cursor pagination before treating it as an unlimited history.

## Deployment

```bash
npm run build
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

Firebase Hosting serves `dist` and rewrites routes to `index.html`. Environment variables are Vite build-time values, so configure `VITE_FIREBASE_*` in the build environment as well as locally.
