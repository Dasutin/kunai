# API

The Express server exposes JSON endpoints under `/api`. The production server also serves the built web client for non-API paths.

Errors generally return `{ "message": string, "details"?: unknown }`.

## Current API Caveats

- There is no authentication or authorization in the inspected API.
- CORS is currently permissive because the server uses `cors()` without an origin allowlist.
- Several `:id` path parameters are converted with `Number(...)` but not rejected when invalid.
- `PATCH /api/settings` accepts any keys from the request body and stores them as strings.
- Some endpoints return `204 No Content`; the client handles those separately instead of using the shared JSON response handler.

## Health

### `GET /api/health`

Returns:

```json
{ "status": "ok" }
```

## Folders

### `GET /api/folders`

Returns all folders with unread counts.

### `POST /api/folders`

Body:

```json
{ "name": "Tech", "parentId": null }
```

Returns `201` with `{ "id": "uuid" }`.

### `PATCH /api/folders/:id`

Body supports:

```json
{ "name": "New name", "parentId": null }
```

Returns `{ "ok": true }`.

### `POST /api/folders/reorder`

Body:

```json
{ "ids": ["folder-uuid-1", "folder-uuid-2"] }
```

Returns `{ "ok": true }`.

### `DELETE /api/folders/:id`

Moves contained feeds to the root, deletes the folder, and returns `204`.

## Feeds

### `GET /api/feeds`

Returns feeds with unread counts.

### `POST /api/feeds`

Body:

```json
{ "url": "https://example.com/feed.xml", "title": "Example" }
```

Returns `201` with `{ "id": number }`.

Note: the shared type includes `folderId`, but the current route only accepts `url` and optional `title`.

The current web client sends `folderId` when adding a feed from a selected folder, but the server create route ignores that field and always creates the feed at the root.

### `PATCH /api/feeds/:id`

Body supports:

```json
{
  "title": "Example",
  "url": "https://example.com/feed.xml",
  "enabled": true,
  "folderId": null,
  "muted": false
}
```

Returns `{ "ok": true }`.

### `POST /api/feeds/move`

Body:

```json
{ "feedIds": [1, 2], "folderId": "folder-uuid-or-null" }
```

Returns `{ "ok": true }`.

### `POST /api/feeds/reorder`

Body:

```json
{ "ids": [1, 2, 3], "folderId": null }
```

Returns `{ "ok": true }`.

### `DELETE /api/feeds/:id`

Deletes a feed and cascades its items. Returns `204`.

### `POST /api/feeds/:id/refresh`

Refreshes a single feed. Returns `{ "ok": true }` or `404` if the feed does not exist.

### `POST /api/refresh`

Refreshes all feeds. Returns `{ "ok": true }`.

## Items

### `GET /api/items`

Query parameters:

- `scope`: `newsfeed`, `feed`, or `folder`
- `feedId`: required when `scope=feed`
- `folderId`: used when `scope=folder`
- `unreadOnly`: `true` to return unread items only
- `search`: text search query
- `searchMode`: `basic` or `fts`
- `sort`: `newest` or `oldest`
- `unreadFirst`: `true` to sort unread before read
- `limit`: max items, capped at `1000`
- `cursor`: pagination cursor returned by the previous response
- `tagIds`: comma-separated tag IDs
- `mutedIncluded`: `true` to include muted feeds

Review note: the route enforces `feedId` for `scope=feed`, but it does not currently enforce `folderId` for `scope=folder`. A folder-scoped query without `folderId` can therefore fall through to a broader query than intended.

Returns:

```json
{
  "items": [],
  "nextCursor": null
}
```

### `POST /api/items/:id/read`

Body:

```json
{ "isRead": true }
```

Returns `{ "ok": true }`.

### `POST /api/items/markAllRead`

Body:

```json
{
  "scope": "newsfeed",
  "feedId": 1,
  "folderId": null,
  "beforePublishedAt": "2026-05-08T00:00:00.000Z"
}
```

`feedId` is required for feed scope. `folderId` is required for folder scope. Returns `{ "ok": true }`.

### `POST /api/items/:id/save`

Body:

```json
{ "saved": true }
```

Returns `{ "ok": true }`.

### `POST /api/items/:id/tags`

Body:

```json
{
  "add": ["important", 2],
  "remove": [3]
}
```

String tags are created if they do not already exist. Returns `{ "ok": true }`.

### `POST /api/items/:id/fetchContent`

Fetches readable article content for an item. Requires `CONTENT_FETCH_ENABLED=true` on the server.

Returns:

```json
{
  "ok": true,
  "readableContent": "<p>...</p>"
}
```

If fetching fails, the endpoint returns a JSON response with `ok: false` and a message rather than throwing a 500 for fetch errors.

Security note: this endpoint performs outbound requests to item links and should be protected with URL policy and private-network restrictions before use on an untrusted network.

## Tags

### `GET /api/tags`

Returns tags with usage counts.

### `POST /api/tags`

Body:

```json
{ "name": "Important" }
```

Returns `201` with `{ "id": number }`.

### `PATCH /api/tags/:id`

Body:

```json
{ "name": "Renamed" }
```

Returns `{ "ok": true }`.

### `DELETE /api/tags/:id`

Deletes the tag and item associations. Returns `204`.

### `POST /api/tags/merge`

Body:

```json
{ "fromTagIds": [1, 2], "intoTagId": 3 }
```

Moves item associations into the target tag, deletes merged tags, and returns `{ "ok": true }`.

## Settings

### `GET /api/settings`

Returns all persisted settings with typed values.

### `PATCH /api/settings`

Body supports:

```json
{
  "markReadOnOpen": false,
  "defaultViewMode": "list",
  "unreadFirstDefault": false,
  "contentFetchEnabled": false,
  "contentFetchMaxPerRefresh": 3,
  "refreshMinutes": 10,
  "articleRetention": "off",
  "theme": "default"
}
```

Returns `{ "ok": true }`. Updating `refreshMinutes` also updates the in-memory scheduler interval.

Review note: settings updates are not schema validated at the API boundary. Unknown keys are persisted and typed conversion only happens on reads for recognized keys.

## OPML

### `POST /api/opml/import`

Content type should be `text/xml`, `application/xml`, or `text/plain`.

Body is OPML XML. Existing feed URLs are skipped.

The importer currently records discovered folder names while parsing, but imported feeds are inserted with `folderId = null`; folder hierarchy is not recreated on import.

Returns:

```json
{
  "discovered": 10,
  "created": 8,
  "createdIds": [1, 2]
}
```

### `GET /api/opml/export`

Returns OPML XML with `Content-Type: text/xml`.
