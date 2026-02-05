-- Add position to feeds for ordering and backfill per folder
ALTER TABLE feeds ADD COLUMN position INTEGER;

WITH ordered AS (
  SELECT id, folderId, ROW_NUMBER() OVER (PARTITION BY folderId ORDER BY createdAt ASC) AS rn
  FROM feeds
)
UPDATE feeds
SET position = (SELECT rn FROM ordered WHERE ordered.id = feeds.id)
WHERE position IS NULL;

UPDATE feeds SET position = COALESCE(position, 0);
