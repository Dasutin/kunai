# Development

## Requirements

- Node.js `>=20`
- npm
- Docker, optional

Native builds of `better-sqlite3` may require a working compiler toolchain on the host. The Docker build stage installs `python3`, `make`, and `g++` for this reason.

## Setup

```bash
npm install
```

Create a local `.env` when needed:

```bash
PORT=3000
DATA_DIR=./data
REFRESH_INTERVAL_MINUTES=10
NODE_ENV=development
CONTENT_FETCH_ENABLED=true
CONTENT_FETCH_MAX_PER_REFRESH=3
MAX_UPLOAD_MB=5
```

The repository includes `.env.example`, but Docker Compose expects a `.env` file.

## Run Locally

Run server and client together:

```bash
npm run dev
```

Run server only:

```bash
npm run dev:server
```

Run client only:

```bash
npm run dev:client
```

Development URLs:

- API: `http://localhost:3000`
- Vite app: `http://localhost:5173`

The Vite app proxies `/api` to the server.

## Build

```bash
npm run build
```

This runs:

```bash
npm run build:client
npm run build:server
```

Build output:

- client: `dist/client`
- server: `dist/server`

Start the production build:

```bash
npm start
```

## Verification

Run the focused API regression tests:

```bash
npm test
```

This builds the server and starts its production entry point with a disposable SQLite database and a local RSS fixture. It covers full-text search and refresh summaries for mixed results, all failures, all successes, empty feed lists, and disabled feeds. No external feeds or account credentials are used.

It also checks concurrent refresh coalescing, the browser revalidation timer's visibility/network behavior, and the service worker's API cache exclusion.

The open reader checks server data every 30 seconds while visible and online, and catches up on focus, visibility return, network reconnection, and back/forward restoration. These checks use GET requests that revalidate HTTP cache entries; upstream RSS fetching stays on the server's configured schedule. Manual Refresh still fetches feeds immediately. While an article is open or the reader is scrolled down, changes to the story list wait behind a "Show new stories" button so the reading position stays stable. API responses are never stored or served by the service worker.

With Python Playwright and Chromium installed, run the production browser regression after building:

```bash
python3 tests/browser-refresh.py
python3 tests/browser-searched-read.py
```

It uses an accelerated local server schedule and the browser clock to check changing feeds, visibility catch-up, filters, reading position, stale responses, and the active service worker. It finds Chromium on PATH, or accepts `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

The searched-read browser regression checks the "Currently searched" dropdown option, including initial/cleared/whitespace disabled states, active feed/folder/Saved scope, non-matches, and changed queries with delayed results. The API regressions also cover over 1000 matches, FTS, tags, muted feeds, and server-side empty-search protection.

After code changes, also run the full production build:

```bash
npm run build
```

For API changes, also smoke-check:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/feeds
```

For client changes, run the dev stack and check the main feed view, settings view, add-feed modal, item modal, and responsive sidebar behavior.

For dependency risk checks, run:

```bash
npm audit --audit-level=moderate
```

On May 18, 2026, `npm audit --audit-level=moderate` reported 11 vulnerabilities, including critical advisories affecting `fast-xml-parser` and `sanitize-html`.

## Development Notes

- Shared types live in `shared/types.ts`.
- Client API wrappers live in `client/src/api.ts`.
- Server route validation lives in `server/src/index.ts`.
- SQLite access belongs in `server/src/db/`.
- RSS and content-fetch behavior belongs in `server/src/rss/` and `server/src/content/`.
- New schema changes should be added as a new migration file under `server/migrations/`.
- Keep extension changes simple JavaScript unless a dedicated build pipeline is introduced.

## Suggested Test Coverage

- API validation for feeds, folders, items, settings, tags, and OPML.
- Repository tests for feed creation/move/reorder, item deduplication, read state, saved state, tag updates, FTS search, and retention cleanup.
- RSS normalization tests for GUID/link/image extraction and tracking-parameter removal.
- OPML import/export tests, including duplicate URLs and folder hierarchy behavior.
- React tests for add-feed, mark-read, save, tag filters, settings, modal content fetch, and sidebar drag/drop.
- Smoke tests for the browser extensions and iOS API decoding.

## Known Gaps

- `README.md` has duplicate refresh cadence bullets with different defaults.
- The client sends `folderId` when adding a feed, but the current `POST /api/feeds` route ignores it.
- The settings table has a UI setting named `contentFetchEnabled`, but server-side article fetching is controlled by the environment variable `CONTENT_FETCH_ENABLED`.
- `App.tsx` and `server/src/index.ts` are large coordination points and are likely candidates for modularization.
- The dev build can need elevated/out-of-sandbox execution in this Windows Codex environment because Vite/esbuild may hit sandbox access restrictions.
