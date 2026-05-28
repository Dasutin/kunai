# Codebase Review

Review date: May 18, 2026

This review covers the current Kunai worktree, including the uncommitted documentation files and recent UI changes in `client/src/App.tsx` and `client/src/styles.css`.

## Executive Summary

Kunai is a coherent self-hosted RSS reader with a straightforward architecture: Express API, SQLite persistence, Vite React frontend, browser extensions, and a starter iOS client. The current code builds successfully with `npm run build`.

The main risks are not compile failures. They are product correctness drift between client and server, exposed-service hardening gaps, missing automated tests, dependency advisories, and growing complexity in central files.

## Verification Performed

- `npm run build` completed successfully.
- `npm audit --audit-level=moderate` reported 11 vulnerabilities: 2 low, 4 moderate, 3 high, and 2 critical.
- Manual source inspection covered server routes, repositories, migrations, RSS/content fetchers, React app state, API wrapper, settings, sidebar/item components, PWA files, browser extensions, Docker files, and the iOS starter.

## High-Priority Findings

### Feed creation ignores selected folder

Severity: High

Evidence:

- `shared/types.ts` defines `FeedCreateRequest` with optional `folderId`.
- `client/src/App.tsx` sends `folderId` when adding from a selected folder.
- `server/src/index.ts` validates only `url` and optional `title` for `POST /api/feeds`.
- `server/src/db/repository.ts` creates new feeds with `folderId` omitted and computes position only for root feeds.

Impact:

Adding a feed while a folder is selected appears to imply folder placement, but the server creates the feed at the root. This is a user-visible correctness bug and a shared-contract drift.

Suggested direction:

Accept optional `folderId` in the route, validate it, store it in `feedsRepo.create`, and calculate position within that folder.

### No authentication or authorization layer

Severity: High

Evidence:

- No auth middleware, sessions, API keys, or user model are present in the server.
- Extensions and iOS client assume unauthenticated API access.

Impact:

Anyone who can reach the service can read feeds/items and mutate state. This is acceptable only for trusted local/private deployments.

Suggested direction:

Add an explicit deployment warning, then decide between reverse-proxy auth, API token auth, or first-party session auth before exposing the service.

### Permissive CORS

Severity: High

Evidence:

- `server/src/index.ts` calls `cors()` with no origin allowlist.

Impact:

If Kunai is reachable from a browser, another origin can attempt API calls. Without auth this expands exposure for state-changing endpoints.

Suggested direction:

Restrict CORS to configured origins or disable CORS by default for same-origin production hosting.

### Readable content fetching has outbound request risk

Severity: High

Evidence:

- `server/src/content/fetcher.ts` calls `fetch(url, { redirect: 'follow' })` for item links.
- There is no URL allowlist, private IP rejection, redirect revalidation, response size limit, content type check, or explicit timeout.

Impact:

When enabled, the server can be induced to make outbound requests to arbitrary URLs present in feeds. This creates SSRF-style risk and reliability issues.

Suggested direction:

Before exposing content fetch, validate schemes, block private/link-local/loopback targets, revalidate redirects, enforce timeouts and body-size limits, and consider making the feature opt-in per deployment.

### Dependency audit has critical and high findings

Severity: High

Evidence:

- `npm audit --audit-level=moderate` reported critical advisories affecting `fast-xml-parser` and `sanitize-html`.
- High findings included packages in the Express/Vite/transitive toolchain.

Impact:

The app parses untrusted OPML/XML and sanitizes untrusted feed/article HTML, so parser and sanitizer advisories are directly relevant.

Suggested direction:

Prioritize dependency upgrades and test OPML parsing, feed rendering, and readable-content behavior after updates. Some fixes require breaking upgrades.

## Correctness And API Findings

### Folder-scoped item query is under-validated

Severity: Medium

Evidence:

- `GET /api/items` enforces `feedId` when `scope=feed`.
- It does not enforce `folderId` when `scope=folder`.
- Repository filtering only adds a folder condition when `query.folderId` is present.

Impact:

A folder-scoped request without `folderId` can return a broader result set than expected.

Suggested direction:

Require `folderId` for `scope=folder`, mirroring the existing mark-all-read validation.

### Path IDs are inconsistently validated

Severity: Medium

Evidence:

- Several routes call `Number(req.params.id)` without checking `Number.isFinite`.
- Folder IDs are accepted as raw params for delete/update and only body fields receive `zod` UUID validation.

Impact:

Invalid path parameters can reach repository calls and produce confusing no-op behavior or database work.

Suggested direction:

Add shared param parsers for numeric IDs and UUIDs. Return `400` for malformed IDs and `404` for well-formed missing records.

### Settings update accepts unknown keys

Severity: Medium

Evidence:

- `PATCH /api/settings` casts `req.body as Settings` without schema validation.
- `settingsRepo.update` writes every object entry as a string.

Impact:

Typos and unsupported settings persist silently, and clients cannot rely on validation feedback.

Suggested direction:

Validate settings keys and values with `zod`, reject unknown keys, and keep server environment controls separate from user settings.

### Content fetch setting is split across DB and environment

Severity: Medium

Evidence:

- The settings table includes `contentFetchEnabled`.
- The API endpoint checks only `env.contentFetchEnabled`.
- The modal currently receives `canFetchContent={true}` from the app.

Impact:

The UI can imply content fetching is available even when the server returns `403`, and the persisted setting does not control the endpoint.

Suggested direction:

Make environment capability and user preference explicit in the settings response, then use both when deciding whether to show or enable content-fetch controls.

### OPML import does not recreate folders

Severity: Medium

Evidence:

- `parseOpml` records `folderName`.
- Import inserts feeds with `folderId = null`.

Impact:

OPML export can include folder hierarchy, but import flattens feeds. Round-trip behavior loses organization.

Suggested direction:

Either document import as flat-only or add folder creation/mapping during import.

## Reliability And Performance Findings

### RSS refresh is sequential

Severity: Medium

Evidence:

- `refreshAllFeeds` awaits each feed refresh inside a `for` loop.

Impact:

One slow feed delays all following feeds. A large subscription set can take a long time to refresh.

Suggested direction:

Add bounded concurrency and per-feed timeout handling. Keep sequential mode available if low-load predictability is preferred.

### Client loads the maximum item page and ignores pagination

Severity: Medium

Evidence:

- `App.tsx` sets `limit=1000`.
- Comment says pagination is disabled.
- `itemsRepo.list` returns `nextCursor`, but the client does not consume it.

Impact:

The UI can become heavy with large feed collections and cannot navigate beyond the first 1000 matching items.

Suggested direction:

Add incremental loading or infinite scroll using `nextCursor`.

### Feed item updates are insert-only

Severity: Low

Evidence:

- `itemsRepo.upsertItems` uses `INSERT OR IGNORE`.

Impact:

If a feed item changes title, content, image, or publication metadata after first fetch, Kunai keeps the original values.

Suggested direction:

Consider `ON CONFLICT DO UPDATE` for selected fields while preserving user state.

### FTS search errors are not handled gracefully

Severity: Medium

Evidence:

- FTS mode pushes raw search text to `fts MATCH ?`.
- Route does not wrap `itemsRepo.list` in a try/catch.

Impact:

Invalid FTS syntax can surface as an internal server error.

Suggested direction:

Catch FTS errors and return a `400` with a useful message, or normalize user input into safe FTS queries.

## Frontend Findings

### `App.tsx` is a large orchestration component

Severity: Medium

Evidence:

- `App.tsx` owns feed, folder, tag, settings, item loading, saved view, modal, sidebar, mobile, refresh, and optimistic-update behavior.

Impact:

Behavior is discoverable in one file, but changes are increasingly coupled and harder to test.

Suggested direction:

Split data loading and mutations into hooks by domain: feeds/folders, items, tags, settings, and view state.

### Mark-read-on-open setting is not applied

Severity: Medium

Evidence:

- Settings expose `markReadOnOpen`.
- `markOnOpenIfNeeded` marks unread items read unconditionally when opening or expanding.

Impact:

The user setting does not appear to control the behavior it names.

Suggested direction:

Gate mark-on-open behavior behind `settings?.markReadOnOpen`.

### Saved view derives from current loaded items

Severity: Medium

Evidence:

- `savedItems` is set from the current `data.items.filter((it) => it.saved)`.
- There is no dedicated saved-items API query.

Impact:

Saved view only knows about saved items present in the current loaded result set, not necessarily all saved items.

Suggested direction:

Add a saved-item query mode or endpoint and load saved items independently.

### Error feedback is broad and sometimes sticky

Severity: Low

Evidence:

- A single `error` state is reused across many operations.
- Some optimistic operations revert data but do not always restore modal state.

Impact:

Users can see generic errors without action-specific recovery guidance.

Suggested direction:

Use operation-scoped feedback for add feed, refresh, save/read, tags, settings, and content fetch.

## Data And Migration Findings

### Migration strategy is simple but not defensive

Severity: Low

Evidence:

- Migrations rely on `PRAGMA user_version`.
- SQL files include direct `ALTER TABLE ADD COLUMN`.

Impact:

Normal linear startup is fine. Manual recovery from partial migrations would need care.

Suggested direction:

Document backup-before-upgrade and add migration tests against empty and upgraded databases.

### Repository return types use broad `any`

Severity: Low

Evidence:

- Several repository methods return `any` or cast rows broadly.

Impact:

Type drift between SQLite rows and shared API types is easier to miss.

Suggested direction:

Define row types and conversion helpers for feeds, folders, tags, and settings.

## Companion Client Findings

### Browser extensions request broad host access

Severity: Low

Evidence:

- Chrome uses `host_permissions: ["<all_urls>"]`.
- Firefox permissions include `"<all_urls>"`.

Impact:

The permission is practical for arbitrary self-hosted URLs but broad for a small badge extension.

Suggested direction:

Keep the permission if arbitrary hosts are a requirement, but document it in extension install notes. Consider optional host permissions if packaging for stores.

### iOS client is intentionally incomplete

Severity: Low

Evidence:

- iOS client only fetches feeds and items.
- README labels it a starter.

Impact:

It should not be presented as feature-equivalent to the web client.

Suggested direction:

Keep it documented as a scaffold until write APIs, auth, cache, and more views are implemented.

## Quality Gaps

### No automated tests

Severity: High

Evidence:

- `package.json` has no `test` script.
- No test files or test framework are present.

Impact:

Regression risk is high for API behavior, database migrations, feed parsing, and UI state transitions.

Suggested direction:

Add focused tests before broad refactors. Start with repository/API behavior and OPML/RSS parsing, then add UI tests for key flows.

### No lint or format check

Severity: Low

Evidence:

- `package.json` has build scripts but no lint, format, or typecheck-only script beyond server build.

Impact:

Style, accessibility, and React hook issues depend on manual review.

Suggested direction:

Add ESLint, Prettier or equivalent formatting policy, and a combined `npm run check` script.

