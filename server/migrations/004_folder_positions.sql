-- Add explicit position for folders so they can be reordered
ALTER TABLE folders ADD COLUMN position INTEGER;

-- Backfill existing folders with stable ordering based on createdAt
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY createdAt ASC) AS rn
  FROM folders
)
UPDATE folders
SET position = (SELECT rn FROM ordered WHERE ordered.id = folders.id)
WHERE position IS NULL;

-- Ensure future inserts have a default
UPDATE folders SET position = COALESCE(position, 0);
