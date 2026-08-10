# RelayBoard PWA plan

This is a future-work roadmap only. Do not treat this file as an implementation instruction unless the PWA work is explicitly approved.

## Objective

Make RelayBoard installable and launchable like an app from supported desktop launchers/app drawers and Android, while preserving the frontend-only Firebase architecture.

## Target support

- Chrome and Edge on Windows, Linux, and macOS: installable standalone app windows with launcher entries.
- Chrome on Android: installable PWA that can appear in the app drawer/home screen.
- Safari: support its manual “Add to Home Screen” path, but do not promise Chromium-style install UI on macOS Safari.

## Implementation phases

### 1. Web App Manifest and visual assets

Create `public/manifest.webmanifest` and reference it from `index.html`.

Required manifest values:

- `name`: `RelayBoard`
- `short_name`: `RelayBoard`
- `start_url`: `/`
- `display`: `standalone`
- RelayBoard theme/background colors
- 192×192 and 512×512 PNG icons
- A maskable icon for Android launchers

Optional additions:

- App shortcuts for **New post** and **Main workspace**.
- Screenshots for richer browser install dialogs.

### 2. One PWA service worker

RelayBoard currently has `public/notification-sw.js` for notification-click handling. Replace it with one PWA service worker that owns:

- Notification clicks.
- Precached app shell/static Vite assets.
- Offline navigation fallback to the app shell.
- A safe update lifecycle and “new version available” UI.

Use a maintained PWA integration for Vite/Workbox rather than hand-writing the precache logic.

Do **not** manually cache Firebase Auth or Firestore responses. Firestore’s existing local persistence should remain responsible for local data/offline synchronization.

### 3. Installation UX

Add a `usePwaInstall` hook and an install control in the workspace header/menu.

- Capture Chromium’s `beforeinstallprompt` event.
- Show **Install RelayBoard** when the browser makes installation available.
- Hide it in standalone mode after installation.
- Provide short browser-specific instructions when programmatic prompting is unavailable.

### 4. Firebase and routing verification

Before release, verify that the installed standalone window still supports:

- Firebase Google Sign-In.
- Firestore listeners and multi-tab/offline persistence.
- Firebase Hosting HTTPS.
- Direct navigation/reloads through the existing SPA rewrite.

### 5. Installed-app polish

- Add a badge count for unread/new posts with the Badging API where supported.
- Ensure notification clicks focus/open RelayBoard.
- Confirm icons look correct in light/dark system launchers.
- Keep current notification limitations explicit: Firestore-listener alerts work while the app is open; true closed-app push needs FCM and a trusted sender.

### 6. Test matrix

Test install, launch, update, offline shell, reconnect, sign-in, notification click, and uninstall on:

- Chrome and Edge on Windows
- Chrome/Edge on Linux
- Chrome/Edge on macOS
- Chrome on Android

## Deployment requirements

- Deploy over HTTPS through Firebase Hosting.
- Ensure the manifest, service worker, and icon files are included in `dist`.
- Set a deliberate cache/update strategy for the service worker.
- Verify the production domain is authorized for Firebase Google Sign-In.

## Optional store distribution

Direct PWA installation does not require an app-store package. If later needed, evaluate PWABuilder or Bubblewrap for Microsoft Store and Google Play distribution.
