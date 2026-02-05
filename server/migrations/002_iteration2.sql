-- Add folders
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parentId TEXT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(parentId) REFERENCES folders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parentId);

-- Add muted + folder to feeds
ALTER TABLE feeds ADD COLUMN folderId TEXT NULL;
ALTER TABLE feeds ADD COLUMN muted INTEGER NOT NULL DEFAULT 0;

-- Add tags and item_tags
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_tags (
  itemId INTEGER NOT NULL,
  tagId INTEGER NOT NULL,
  PRIMARY KEY (itemId, tagId),
  FOREIGN KEY(itemId) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tagId);

-- Settings key/value
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Content fetch columns
ALTER TABLE items ADD COLUMN readableContent TEXT;
ALTER TABLE items ADD COLUMN contentFetchedAt TEXT;

-- FTS5 virtual table for items
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  title,
  snippet,
  content,
  author,
  feedTitle,
  itemId UNINDEXED,
  tokenize = 'unicode61'
);

-- Backfill FTS
INSERT INTO items_fts (rowid, title, snippet, content, author, feedTitle, itemId)
SELECT i.id, i.title, i.snippet, i.content, i.author, f.title, i.id
FROM items i JOIN feeds f ON f.id = i.feedId
WHERE NOT EXISTS (SELECT 1 FROM items_fts WHERE rowid = i.id);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS trg_items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, title, snippet, content, author, feedTitle, itemId)
  VALUES (new.id, new.title, new.snippet, new.content, new.author, (SELECT title FROM feeds WHERE id = new.feedId), new.id);
END;

CREATE TRIGGER IF NOT EXISTS trg_items_au AFTER UPDATE ON items BEGIN
  UPDATE items_fts SET
    title = new.title,
    snippet = new.snippet,
    content = new.content,
    author = new.author,
    feedTitle = (SELECT title FROM feeds WHERE id = new.feedId),
    itemId = new.id
  WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_items_ad AFTER DELETE ON items BEGIN
  DELETE FROM items_fts WHERE rowid = old.id;
END;

-- Keep feed title changes in sync with FTS
CREATE TRIGGER IF NOT EXISTS trg_feeds_title_update AFTER UPDATE OF title ON feeds BEGIN
  UPDATE items_fts SET feedTitle = new.title WHERE feedTitle IS NOT NULL AND itemId IN (SELECT id FROM items WHERE feedId = new.id);
END;

-- Default settings values (insert only if missing)
INSERT OR IGNORE INTO settings(key, value) VALUES ('markReadOnOpen', 'false');
INSERT OR IGNORE INTO settings(key, value) VALUES ('defaultViewMode', 'list');
INSERT OR IGNORE INTO settings(key, value) VALUES ('unreadFirstDefault', 'false');
INSERT OR IGNORE INTO settings(key, value) VALUES ('contentFetchEnabled', 'false');
INSERT OR IGNORE INTO settings(key, value) VALUES ('contentFetchMaxPerRefresh', '3');
