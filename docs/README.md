# Kunai Documentation

Kunai is a self-hosted RSS reader with a TypeScript/Express API, SQLite storage, a Vite React web client, browser companion extensions, PWA support, and a starter SwiftUI iOS client.

## Documents

- [Overview](overview.md) - product scope, capabilities, and repository layout.
- [Architecture](architecture.md) - runtime components, request flow, scheduler behavior, and module boundaries.
- [API](api.md) - HTTP endpoints exposed by the Express server.
- [Data Model](data-model.md) - SQLite schema, migrations, settings, and storage notes.
- [Development](development.md) - setup, local commands, verification, and contribution notes.
- [Deployment](deployment.md) - Docker, environment variables, persistence, and operations.
- [Companion Clients](companion-clients.md) - browser extensions, PWA files, and iOS starter app.
- [Codebase Review](codebase-review.md) - current review findings by area, with impact and evidence.
- [Recommendations](recommendations.md) - prioritized backlog of fixes, hardening, and maintainability work.

## Fast Path

```bash
npm install
npm run dev
```

The API runs on `http://localhost:3000`; the Vite client runs on `http://localhost:5173` and proxies `/api` to the server.

For Docker:

```bash
docker compose up --build
```

Then open `http://localhost:3000`.

## Current Review Status

The current documentation set is based on a May 18, 2026 source review. The app builds successfully with `npm run build`, but the review identified correctness, security, reliability, and test coverage gaps that are tracked in [Codebase Review](codebase-review.md) and [Recommendations](recommendations.md).
