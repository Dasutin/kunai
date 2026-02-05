# Kunai RSS Reader

Kunai is a clean, self-hosted RSS reader. Add your favorite feeds, browse in list or card views, search, filter unread, and keep everything stored locally.

## Quickstart

1) Install Docker.
2) Run:
	```bash
	docker compose up --build
	```
3) Open http://localhost:3000 and start adding feeds.

### Volumes

- `/data` — SQLite database and app data (mapped by default in docker compose)

## Features

- Add and organize feeds into folders and tags
- List, card, and magazine layouts with unread filters
- Full-text and basic search; mark individual or all items as read
- Save items for later and read-clean mode via built-in article parsing
- PWA support with offline cache and installable app icons

## Settings

- Refresh cadence: controlled by `REFRESH_INTERVAL_MINUTES` (default 10)
 - Refresh cadence: controlled by `REFRESH_INTERVAL_MINUTES` (default 5)
- Data storage: SQLite lives in `./data` locally or `/data` in Docker
- Port: default 3000; change via `PORT` in `.env`

## Run without Docker (optional)

```bash
npm install
npm run dev
```
- Server on :3000, client on :5173 with `/api` proxy.

## License

MIT
