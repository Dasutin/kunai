# Companion Clients

Kunai includes lightweight companion clients beyond the main React web app.

## PWA

PWA assets live in `client/public/`.

Important files:

- `manifest.webmanifest`
- `sw.js`
- app icons

The service worker caches static same-origin GET requests and PWA assets. For navigation requests, it uses a network-first strategy and falls back to cache when offline.

## Browser Extensions

Extensions live in:

- `extensions/chrome/`
- `extensions/firefox/`

The extension purpose is intentionally small:

- store the Kunai base URL in extension sync storage
- periodically call `/api/feeds`
- sum `unreadCount` across feeds
- display the unread count as a badge
- open Kunai when the extension action is clicked

Review notes:

- The extensions use broad host permissions so users can point them at any Kunai instance URL.
- They depend on the unauthenticated `/api/feeds` response shape and do not currently share generated types with `shared/types.ts`.
- Badge refresh is fixed at five minutes and is independent of the server refresh interval.

### Chrome

Chrome uses Manifest V3.

Important files:

- `manifest.json`
- `background.js`
- `options.html`
- `options.js`
- `icon-192.png`

The background service worker uses a `chrome.alarms` interval of five minutes.

### Firefox

Firefox mirrors the same companion behavior with Firefox-specific assets and manifest shape.

Important files:

- `manifest.json`
- `background.js`
- `options.html`
- `options.js`
- `icon-48.png`
- `icon-96.png`

## iOS Starter

The SwiftUI starter lives in `mobile/ios/`.

Important files:

- `App.swift` - app entry point
- `Views/RootView.swift` - routes between onboarding and content
- `Views/OnboardingView.swift` - server URL setup
- `Views/FeedListView.swift` - feed list starter view
- `Views/ArticleListView.swift` - item list starter view
- `Storage/ConfigStore.swift` - stores the server base URL
- `Networking/APIClient.swift` - calls `/api/feeds` and `/api/items`
- `Models/Types.swift` - Swift model mirrors for API responses

The iOS code is a starter scaffold rather than a complete app. It currently focuses on configuring a server URL, fetching feeds, and fetching items.

Current limitations:

- No authentication or token storage.
- No write operations such as mark read, save, tag, refresh, or settings updates.
- No offline cache.
- Only a subset of the API response fields is modeled.
