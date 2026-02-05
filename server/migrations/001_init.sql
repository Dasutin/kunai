CREATE TABLE IF NOT EXISTS feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  lastFetchedAt TEXT,
  lastFetchStatus TEXT,
  lastFetchError TEXT
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedId INTEGER NOT NULL,
  guid TEXT,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  publishedAt TEXT,
  author TEXT,
  snippet TEXT,
  content TEXT,
  imageUrl TEXT,
  raw TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(feedId) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS read_state (
  itemId INTEGER PRIMARY KEY,
  isRead INTEGER NOT NULL DEFAULT 0,
  readAt TEXT,
  FOREIGN KEY(itemId) REFERENCES items(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_feed_guid ON items(feedId, guid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_feed_link ON items(feedId, link);
CREATE INDEX IF NOT EXISTS idx_items_published ON items(publishedAt DESC);
CREATE INDEX IF NOT EXISTS idx_items_feed ON items(feedId);
CREATE INDEX IF NOT EXISTS idx_read_state_read ON read_state(isRead);
