# Kunai iOS (SwiftUI) – Starter

This folder contains a lightweight SwiftUI starter for a Kunai iOS companion app. It focuses on:

- Configuring the server base URL on first launch (onboarding screen)
- Persisting the server URL securely (UserDefaults for now; swap to Keychain later)
- Basic models matching the existing API (feeds and items)
- An API client scaffold
- Stub views for feeds and items

## Structure

- `App.swift` — entry point; routes between onboarding and main UI depending on saved server URL
- `Storage/ConfigStore.swift` — persists the server URL and exposes a published state
- `Networking/APIClient.swift` — minimal client for fetching feeds/items given the configured server URL
- `Models/Types.swift` — shared model mirrors of the server responses
- `Views/OnboardingView.swift` — server URL input shown when no server is configured
- `Views/FeedListView.swift` — stub feed list view
- `Views/ArticleListView.swift` — stub article list view
- `Views/RootView.swift` — wraps navigation between onboarding and content

## Usage

1. Open the `mobile/ios` folder in Xcode and create a new SwiftUI App target. Replace the generated files with the contents here, or copy these files into the project.
2. Update the bundle ID and signing to your team.
3. Run on Simulator/Device. On first launch you’ll be prompted for the server URL. Use your Kunai server base (e.g., `http://192.168.1.10:3000`).
4. Extend the API client with auth if needed; add additional endpoints as you go.

## Notes

- URL validation is intentionally simple. Add stricter rules or reachability checks as desired.
- For security, swap to Keychain for storing tokens if/when you add authentication.
- Offline caching is not included; consider adding SwiftData/CoreData for cached items.
