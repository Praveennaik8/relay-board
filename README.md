# RelayBoard

RelayBoard is a realtime workspace communication board built with Firebase. The React client talks directly to Firebase Authentication and Cloud Firestore through the modular Firebase Web SDK; a small trusted Cloud Function recursively cleans up post subcollections after a post is deleted.

## Highlights

- Google sign-in and a compact user profile in the workspace header
- Realtime post feed powered by `onSnapshot`
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
  pages/            Sign-in and workspace routes
  services/         Firebase Authentication and Firestore operations
  types/            Shared data model and post/action metadata
functions/          Firestore deletion trigger for post cleanup
```

`services/posts.service.ts` contains all Firestore writes and listeners. UI components never assemble Firestore paths or run transactions themselves. The feed is a direct `onSnapshot` listener ordered by `createdAt`; choosing a post-type tab adds a Firestore `where` filter. Comments are independently subscribed when opened. Action writes use `runTransaction` to create one action document per user and update the denormalized count in the same atomic commit.

## Firestore schema

The default workspace is `main`. The `workspaces` collection makes the model ready for multiple workspaces without changing post paths.

```
workspaces/{workspaceId}
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

7. Enable Firestore TTL for the `expiresAt` field on the `posts` collection group. `null` means a post is persistent; every timed post stores a timestamp:

   ```bash
   gcloud firestore fields ttls update expiresAt --collection-group=posts --enable-ttl --async
   ```

## Deploy to Firebase Hosting

Build the static React app and deploy it with the included `firebase.json`:

```bash
npm run build
firebase deploy --only hosting
```

Set the same `VITE_FIREBASE_*` values in the build environment used for Hosting. Since Vite replaces `VITE_` variables at build time, Firebase project identifiers are intentionally public; the Firestore Security Rules protect the data.

## Security model

Authenticated users can read the shared workspace, create posts, and update/delete only posts they authored. Comments have an immutable author and can only be deleted by their author. Each action document is keyed by the authenticated user ID and cannot be updated or deleted. The rules require the matching action document and its one-count increment to be committed together, which prevents standalone counter manipulation and duplicate responses.

## Disappearing posts

New posts disappear after 24 hours by default. The author can select a duration in minutes, hours, or days, or uncheck the visibility option to keep the post indefinitely. Timed posts use an `expiresAt` timestamp: the client hides them as soon as that time passes and Firestore TTL then permanently deletes the parent post document. A Cloud Function responds to every post deletion (TTL or manual) and recursively removes the post's action and comment subcollections as well.

## Browser notifications

Use **Enable alerts** in the header to allow native browser notifications. Once granted, the bell becomes a test-alert button. A realtime listener sends an alert for every post created after RelayBoard has loaded; the initial feed intentionally does not generate a burst of old-post notifications. The app also displays an in-app receipt toast when the listener receives a new post, making browser/OS delivery problems visible. This frontend-only implementation works while the web app is open. Delivery after the browser/app is closed requires Firebase Cloud Messaging plus a trusted notification sender, which is intentionally outside this no-backend MVP.

RelayBoard also plays a small in-app chime while it is open. Native notification sounds are controlled by the browser and operating system, so they can be silenced by the user’s notification settings or Focus/Do Not Disturb mode.

## Future improvements

- Workspace membership documents and role-based rules
- Pagination with cursors for large feeds
- Post attachments via Firebase Storage
- Push notifications and unread state
- Poll options and per-option aggregates
