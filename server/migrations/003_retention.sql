-- Saved flag and timestamps
ALTER TABLE items ADD COLUMN saved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN savedAt TEXT;
ALTER TABLE items ADD COLUMN unsavedAt TEXT;

-- Default retention setting
INSERT OR IGNORE INTO settings(key, value) VALUES ('articleRetention', 'off');