# Recommendations

This backlog is based on the May 18, 2026 codebase review. It is ordered by impact and dependency risk rather than implementation size.

## Immediate Fixes

1. Fix feed creation folder placement.
   - Accept `folderId` in `POST /api/feeds`.
   - Validate the folder exists when provided.
   - Store the feed in that folder and calculate position within the folder.
   - Add regression coverage for adding a feed while a folder is selected.

2. Address dependency audit findings.
   - Run `npm audit --audit-level=moderate`.
   - Apply non-breaking fixes first with `npm audit fix`.
   - Plan breaking upgrades for `fast-xml-parser`, `@mozilla/readability`, and Vite/esbuild-related packages.
   - Re-test OPML import/export, content sanitization, readable-content parsing, and production build after upgrades.

3. Add service exposure guardrails.
   - Document Kunai as trusted-network-only until auth exists.
   - Restrict CORS origins or disable CORS in same-origin production mode.
   - Add deployment examples for reverse-proxy authentication.

4. Harden readable content fetching.
   - Keep `CONTENT_FETCH_ENABLED=false` for exposed deployments until hardened.
   - Allow only `http` and `https`.
   - Block loopback, link-local, private, multicast, and otherwise disallowed addresses.
   - Re-check every redirect target.
   - Enforce timeout, response size, and content type limits.

5. Add minimal API validation fixes.
   - Validate numeric path IDs and UUID path IDs.
   - Require `folderId` when `GET /api/items?scope=folder`.
   - Validate `PATCH /api/settings` with a schema and reject unknown keys.
   - Return clear `400` responses for invalid FTS syntax.

## Near-Term Improvements

1. Add an automated test foundation.
   - Add a test runner such as Vitest.
   - Start with repository and API tests using a temporary SQLite database.
   - Cover migrations, feed creation, feed reorder, item list filters, mark-read, saved items, tags, settings, OPML, and retention cleanup.
   - Add RSS normalization tests for GUID/link/image extraction.

2. Make saved items first-class.
   - Add saved-item query support in the API.
   - Load saved items independently from the current newsfeed result.
   - Ensure saved view can show all saved items beyond the current 1000-item page.

3. Implement item pagination in the client.
   - Use the existing `nextCursor` response.
   - Add load-more or infinite-scroll behavior.
   - Preserve filters, sorting, tag selection, unread-only, and muted-included state across pages.

4. Align content-fetch settings.
   - Separate server capability from user preference.
   - Return both in `GET /api/settings` or a capability endpoint.
   - Disable or hide modal fetch controls when the server capability is off.

5. Respect mark-read-on-open preference.
   - Only auto-mark opened/expanded items when `settings.markReadOnOpen` is true.
   - Leave explicit mark-read buttons unchanged.

6. Improve OPML round-trip behavior.
   - Either document import as flat-only in UI copy, or create folders during import.
   - If folders are created, map outline names to folder IDs and assign imported feeds to those folders.

## Longer-Term Changes

1. Add authentication.
   - Choose one deployment model: reverse-proxy auth, bearer token, or first-party session auth.
   - Ensure browser extensions and iOS can supply credentials.
   - Add CSRF or same-site protections if cookie sessions are used.

2. Split large coordination files.
   - Break `server/src/index.ts` into route modules by domain.
   - Split `App.tsx` into domain hooks for feeds/folders, items, tags, settings, and modal/view state.
   - Keep shared types in `shared/types.ts` or introduce schema-derived types if API validation expands.

3. Improve RSS refresh scalability.
   - Add bounded concurrency for feed refreshes.
   - Add per-feed timeout and retry policy.
   - Track refresh duration and last successful fetch separately from last attempted fetch.

4. Improve item update semantics.
   - Consider updating selected item fields on conflict instead of `INSERT OR IGNORE`.
   - Preserve user state such as read, saved, tags, and readable content.
   - Add tests for changed feed entries.

5. Add observability and operations tooling.
   - Add structured logs for refresh cycles, OPML import, content fetch, and cleanup.
   - Add a health endpoint that can optionally report database and scheduler status.
   - Document backup and restore steps for SQLite WAL mode.

6. Tighten companion client packaging.
   - Document extension permissions clearly.
   - Consider optional host permissions for browser stores.
   - Expand iOS only after auth and API contracts stabilize.

## Suggested First Work Batch

For the best risk reduction with limited scope, implement these together:

1. Feed creation folder fix.
2. API validation for item folder scope, IDs, and settings.
3. Dependency updates that do not require breaking changes.
4. Initial Vitest setup with repository tests for the changed behavior.

This batch addresses visible correctness, reduces malformed input risk, starts the test foundation, and avoids getting stuck in a broad refactor before the app has regression coverage.

