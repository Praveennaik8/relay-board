# RelayBoard

RelayBoard is a realtime multi-board communication app built with Firebase. The React client talks directly to Firebase Authentication and Cloud Firestore through the modular Firebase Web SDK; trusted Cloud Functions create boards, validate access codes, and recursively clean up post subcollections after a post is deleted.

## Highlights

- Google sign-in, a discoverable board directory, and a compact user profile
- Access-code-gated board membership, validated by a trusted Cloud Function
- Realtime board feeds powered by `onSnapshot`
- Six post types: Issue, Activity, Tip, Announcement, Lost & Found, and Poll
- Type-specific actions, protected from duplicate responses with an atomic Firestore transaction
- Realtime comments loaded only when a post’s discussion is opened
- Browser notifications for new posts while RelayBoard is open (after the user grants permission)
- Client-side title search and type tabs
- Offline persistence shared safely across browser tabs
- Firestore Security Rules that validate ownership, post shapes, comments, and action-counter updates

## Architecture

```
src/
  components/       UI components and shadcn-style primitives
  firebase/         Firebase SDK initialization and configuration
  hooks/            Realtime/auth state hooks
  pages/            Sign-in, board directory, and board routes
  services/         Firebase Authentication and Firestore operations
  types/            Shared data model and post/action metadata
functions/          Board create/join and Firestore cleanup functions
```

`services/posts.service.ts` contains all Firestore writes and listeners. UI components never assemble Firestore paths or run transactions themselves. The feed is a direct `onSnapshot` listener ordered by `createdAt`; choosing a post-type tab adds a Firestore `where` filter. Comments are independently subscribed when opened. Action writes use `runTransaction` to create one action document per user and update the denormalized count in the same atomic commit.

## Firestore schema

Board records live in the `workspaces` collection. Their top-level metadata is discoverable to signed-in users; posts and membership data are available only after the user joins with the board's access code.

```
workspaces/{workspaceId}
  name, createdByName, createdAt, memberCount
  members/{userId}
    userId, name, photoURL, role: "owner" | "member", joinedAt
  _private/access
    salt, accessCodeHash
  posts/{postId}
    type: "issue" | "activity" | "tip" | "announcement" | "lost-found" | "poll"
    title, description
    author: { uid, name, photoURL }
    createdAt, updatedAt, expiresAt
    actionCounts: { helpful, affected, join, acknowledge, claim, vote }
    totalActionCount
    actions/{userId}
      userId, actionType, createdAt
    comments/{commentId}
      text, author, createdAt

users/{userId}/boardMemberships/{workspaceId}
  boardId, role, joinedAt
```

Actions are a subcollection because each user needs a durable, unique response record. Comments are a subcollection to avoid unbounded post documents. Aggregate action counts live on the post for a quick feed render and are updated atomically alongside the action record. The included index supports the type-filtered newest-first feed; comments use Firestore’s automatic single-field indexes.

## Local setup

1. Create a Firebase project and register a Web app.
2. In Firebase Authentication, enable the **Google** provider and add your development domain to Authorized domains.
3. Create a Cloud Firestore database.
4. Copy the environment template and fill it with the Web app configuration:

   ```bash
   cp .env.example .env
   ```

5. Install and run the app:

   ```bash
   npm install
   npm run dev
   ```

6. Install the cleanup function's dependencies (it deploys on Node.js 22), then deploy the included Firestore configuration and function before testing authenticated writes:

   ```bash
   firebase login
   firebase use YOUR_PROJECT_ID
   npm --prefix functions install
   firebase deploy --only firestore,functions
   ```

7. Enable Firestore TTL for the `expiresAt` field on the `posts` collection group. `null` means a post is persistent; every timed post stores a timestamp. You can do this without installing any CLI: open **Google Cloud Console → Firestore → Databases → your database → Time-to-live**, create a policy with collection group `posts` and timestamp field `expiresAt`, then save it.

   Alternatively, use Google Cloud Shell in the console (where `gcloud` is already installed) or run:

   ```bash
   gcloud firestore fields ttls update expiresAt --collection-group=posts --enable-ttl --async
   ```

> **Existing `main` workspace:** releases created before multi-board support wrote posts below `workspaces/main` without a board document or memberships. The new rules intentionally block that old open workspace. Its documents are not deleted, but migrate them with a trusted Admin SDK script before deployment if you need to retain them.

## Deploy to Firebase Hosting

Build the static React app and deploy it with the included `firebase.json`:

```bash
npm run build
firebase deploy --only hosting
```

Set the same `VITE_FIREBASE_*` values in the build environment used for Hosting. Since Vite replaces `VITE_` variables at build time, Firebase project identifiers are intentionally public; the Firestore Security Rules protect the data.

## Security model

Any authenticated user can list board cards, but only board members can read posts, comments, actions, or membership data. Creating boards and joining them happen through callable Cloud Functions. Access codes are salted and hashed in a private document that client security rules deny completely; five failed attempts from the same account are throttled for 15 minutes. Members can create posts and comments, update/delete only their own posts, and respond only once. The rules require the matching action document and its one-count increment to be committed together, which prevents standalone counter manipulation and duplicate responses.

## Disappearing posts

New posts disappear after 24 hours by default. The author can select a duration in minutes, hours, or days, or uncheck the visibility option to keep the post indefinitely. Timed posts use an `expiresAt` timestamp: the client hides them as soon as that time passes and Firestore TTL then permanently deletes the parent post document. A Cloud Function responds to every post deletion (TTL or manual) and recursively removes the post's action and comment subcollections as well.

## Browser notifications

Use **Enable alerts** in the header to allow native browser notifications. Once granted, the bell becomes a test-alert button. A realtime listener sends an alert for every post created after RelayBoard has loaded; the initial feed intentionally does not generate a burst of old-post notifications. The app also displays an in-app receipt toast when the listener receives a new post, making browser/OS delivery problems visible. This frontend-only implementation works while the web app is open. Delivery after the browser/app is closed requires Firebase Cloud Messaging plus a trusted notification sender, which is intentionally outside this no-backend MVP.

RelayBoard also plays a small in-app chime while it is open. Native notification sounds are controlled by the browser and operating system, so they can be silenced by the user’s notification settings or Focus/Do Not Disturb mode.

## Future improvements

- Owner controls for access-code rotation and membership management
- Pagination with cursors for large feeds
- Post attachments via Firebase Storage
- Push notifications and unread state
- Poll options and per-option aggregates
