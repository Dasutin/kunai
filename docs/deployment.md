# Deployment

Kunai is designed to run as a single self-hosted web service backed by a local SQLite database.

## Docker

Build and run:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

`docker-compose.yml` maps port `3000` and mounts a Docker volume at `/data`.

## Docker Image

`Dockerfile` uses two stages:

1. Build stage:
   - Node 20 Debian slim
   - installs native build tools for dependencies
   - runs `npm ci`
   - runs `npm run build`
   - prunes dev dependencies

2. Runtime stage:
   - Node 20 Debian slim
   - copies production `node_modules`
   - copies `dist/`, `shared/`, and migrations
   - exposes `3000`
   - stores data in `/data`
   - starts `node dist/server/server/src/index.js`

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Express server port. |
| `DATA_DIR` | local `./data`, Docker `/data` | Directory containing `rssreader.sqlite`. |
| `REFRESH_INTERVAL_MINUTES` | `5` in code, `10` in `.env.example` | Default RSS refresh interval before a persisted setting overrides it. |
| `NODE_ENV` | `development` locally, `production` in Docker | Runtime environment. |
| `CONTENT_FETCH_ENABLED` | `true` when unset | Enables or disables server-side readable article fetching. Set to `false` to disable. |
| `CONTENT_FETCH_MAX_PER_REFRESH` | `3` | Configured maximum for content fetch behavior. |
| `MAX_UPLOAD_MB` | `5` | Body size limit for OPML/text uploads. |

## Persistence

Persist `DATA_DIR` across container restarts and image upgrades. The database is a single SQLite file plus WAL sidecar files.

Recommended backup target:

```text
DATA_DIR/rssreader.sqlite
```

For clean backups during active use, include WAL/shm files or stop the container first.

## Startup Behavior

On startup, the server:

1. loads environment configuration
2. opens the SQLite database
3. applies pending migrations
4. starts Express
5. triggers an initial refresh of all feeds
6. starts the recurring scheduler
7. starts retention cleanup

## Operations

- Health check: `GET /api/health`
- Manual refresh: `POST /api/refresh`
- Single-feed refresh: `POST /api/feeds/:id/refresh`
- OPML export for portability: `GET /api/opml/export`
- Dependency audit: `npm audit --audit-level=moderate`

## Security Notes

Kunai currently has no authentication or multi-user authorization layer in the inspected code. Treat it as a trusted-network service unless authentication is added in front of it.

The API currently enables permissive CORS, so a browser on another origin can attempt API calls when it can reach the Kunai host. If Kunai is exposed outside localhost or a private network, place it behind authentication and restrict CORS origins.

Readable content fetching makes outbound HTTP requests to item links. Disable it with:

```bash
CONTENT_FETCH_ENABLED=false
```

Before enabling content fetching on an exposed deployment, add protections against private-network requests, non-HTTP schemes, large responses, slow responses, and redirects to disallowed targets.

As of the May 18, 2026 review, `npm audit --audit-level=moderate` reported 11 vulnerabilities. Prioritize dependency upgrades before broader deployment, especially advisories affecting XML parsing and HTML sanitization.
