# Data Model

Kunai stores application data in SQLite through `better-sqlite3`.

## Database Location

The database path is:

```text
DATA_DIR/rssreader.sqlite
```

Defaults:

- local development: `./data/rssreader.sqlite`
- Docker: `/data/rssreader.sqlite`

`server/src/db/client.ts` creates `DATA_DIR` if needed, opens the database, enables WAL mode, and enables foreign keys.

## Migrations

Migrations live in `server/migrations/` and are applied by `server/src/db/migrations.ts`.

Migration state is stored in SQLite `PRAGMA user_version`. At startup, files matching `NNN_name.sql` are loaded, sorted, and applied when their numeric prefix is greater than the current user version.

Current migrations:

- `001_init.sql` - feeds, items, read state, indexes.
- `002_iteration2.sql` - folders, muted feeds, tags, item tags, settings, readable content columns, FTS5 table, FTS triggers, default settings.
- `003_retention.sql` - saved item fields and article retention setting.
- `004_folder_positions.sql` - folder ordering position.
- `005_feed_positions.sql` - feed ordering position.

Add new schema changes as a new numbered migration. Do not edit migrations that may already have been applied.

Review note: migrations use plain `ALTER TABLE ADD COLUMN` statements. This is fine for linear production upgrades, but re-running an already applied migration manually against a partially migrated database would fail on duplicate columns.

## Tables

### `feeds`

Stores RSS feed subscriptions.

Important columns:

- `id`
- `title`
- `url`
- `enabled`
- `folderId`
- `muted`
- `position`
- `lastFetchedAt`
- `lastFetchStatus`
- `lastFetchError`

`url` is unique. Deleting a feed cascades to its items.

Feed ordering is stored per folder with `position`, but moving a feed through a normal update does not automatically recalculate neighboring positions. Reorder-specific code handles ordered lists.

### `items`

Stores normalized RSS items.

Important columns:

- `id`
- `feedId`
- `guid`
- `title`
- `link`
- `publishedAt`
- `author`
- `snippet`
- `content`
- `readableContent`
- `contentFetchedAt`
- `imageUrl`
- `raw`
- `saved`
- `savedAt`
- `unsavedAt`
- `createdAt`

Deduplication uses unique indexes on `(feedId, guid)` and `(feedId, link)`.

Items are inserted with `INSERT OR IGNORE`, so changed titles, content, or images for an existing GUID/link are not updated during refresh.

### `read_state`

Tracks whether an item has been read.

Important columns:

- `itemId`
- `isRead`
- `readAt`

Unread is represented by either no row or `isRead = 0`.

### `folders`

Stores feed folders.

Important columns:

- `id`
- `name`
- `parentId`
- `position`
- `createdAt`
- `updatedAt`

The OPML exporter can represent nested folders through `parentId`, though most UI behavior currently treats folders as a flat feed organization surface.

The folder table supports nesting through `parentId`, but the current main sidebar behaves primarily as a flat folder list. OPML import also does not currently recreate folders.

### `tags`

Stores user-created item tags.

Important columns:

- `id`
- `name`
- `createdAt`
- `updatedAt`

Tag names are case-insensitively unique.

### `item_tags`

Join table between items and tags.

Important columns:

- `itemId`
- `tagId`

### `settings`

String key/value table for persisted application settings.

`server/src/db/settings.ts` converts values to typed settings for the API.

Known settings:

- `markReadOnOpen`
- `defaultViewMode`
- `unreadFirstDefault`
- `contentFetchEnabled`
- `contentFetchMaxPerRefresh`
- `refreshMinutes`
- `articleRetention`
- `theme`

Unknown settings keys can be stored by `PATCH /api/settings`; they are returned as string values unless explicit conversion logic is added.

### `items_fts`

FTS5 virtual table for full-text search.

Indexed fields:

- `title`
- `snippet`
- `content`
- `author`
- `feedTitle`

The `itemId` field is unindexed. Triggers keep the FTS table synchronized when items are inserted, updated, or deleted, and when feed titles change.

FTS query strings are passed directly to SQLite FTS `MATCH`. Invalid FTS syntax can throw a database error unless handled above the repository layer.

## Retention

Retention cleanup runs every six hours after the scheduler starts. It deletes read, unsaved items older than the configured retention period, with a grace period for recently unsaved articles.

Retention setting values:

- `off`
- `1w`
- `1m`
- `1y`
