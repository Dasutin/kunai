# Kunai Agent Guide

This file is for coding agents working in this repository. Keep changes small, verify behavior with the local commands below, and preserve the existing TypeScript/React/Express patterns unless the task clearly calls for a broader change.

## Project Snapshot

Kunai is a self-hosted RSS reader. It has:

- an Express API and RSS scheduler in `server/`
- a Vite React web app in `client/`
- shared TypeScript contracts in `shared/`
- SQLite migrations in `server/migrations/`
- Chrome and Firefox companion extensions in `extensions/`
- a starter SwiftUI iOS companion in `mobile/ios/`

The production Docker image builds the React app and TypeScript server, then serves the built client from the Express process on port `3000`.

## Commands

- Install dependencies: `npm install`
- Run full dev stack: `npm run dev`
- Run server only: `npm run dev:server`
- Run client only: `npm run dev:client`
- Build everything: `npm run build`
- Build client: `npm run build:client`
- Build server: `npm run build:server`
- Start production build: `npm start`
- Docker quickstart: `docker compose up --build`

There is currently no dedicated test script. Use `npm run build` as the main repository-wide verification command after code changes.

## Architecture Rules

- Keep API contracts in `shared/types.ts` and import them from both client and server.
- Keep server routes in `server/src/index.ts` unless a feature grows large enough to justify a route module.
- Keep SQLite access inside repository modules under `server/src/db/`.
- Add schema changes as numbered SQL files in `server/migrations/`; do not mutate existing migrations after they may have shipped.
- Keep client API calls centralized in `client/src/api.ts`.
- Keep React state and UI behavior in `client/src/App.tsx` and focused component files under `client/src/components/`.
- Preserve the Docker runtime path assumptions: migrations are copied to `/app/migrations`, client build output is `dist/client`, and server build output is `dist/server`.

## Coding Conventions

- TypeScript is strict. Prefer explicit shared types over ad hoc shapes.
- The server is ESM and uses `.js` import suffixes for TypeScript source that compiles to NodeNext output.
- Validate incoming API payloads with `zod` at route boundaries.
- Use prepared statements and transactions for SQLite writes.
- Sanitize fetched RSS/content HTML before storing or returning it.
- Keep browser extension JavaScript dependency-free unless there is a strong reason to add build tooling.
- Keep the iOS folder as a lightweight starter unless the task is specifically to expand the mobile app.

## Data And Runtime Notes

- SQLite lives at `DATA_DIR/rssreader.sqlite`; local default is `./data`, Docker default is `/data`.
- The database enables WAL mode and foreign keys in `server/src/db/client.ts`.
- Migration state is tracked with SQLite `PRAGMA user_version`.
- The RSS scheduler refreshes feeds on startup and at the configured interval.
- Settings are stored as string key/value rows and converted in `server/src/db/settings.ts`.
- Full-text search uses the `items_fts` FTS5 virtual table and triggers created in migration `002_iteration2.sql`.

## Documentation Map

- `docs/overview.md` explains what Kunai is and how the pieces fit together.
- `docs/architecture.md` describes runtime flow and module boundaries.
- `docs/api.md` documents the current HTTP API.
- `docs/data-model.md` documents SQLite tables, migrations, and settings.
- `docs/development.md` documents local workflows and verification.
- `docs/deployment.md` documents Docker and environment configuration.
- `docs/companion-clients.md` documents browser extensions, PWA support, and the iOS starter.

