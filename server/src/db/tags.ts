import { db } from './client.js';
import type { Tag } from '../../../shared/types.js';

export const tagsRepo = {
  list(): Array<Tag & { usageCount: number }> {
    const rows = db
      .prepare(
        `SELECT t.*, (
            SELECT COUNT(*) FROM item_tags it WHERE it.tagId = t.id
          ) as usageCount
         FROM tags t
         ORDER BY t.name COLLATE NOCASE ASC`
      )
      .all();
    return rows as any;
  },

  create(name: string): number {
    const now = new Date().toISOString();
    const res = db
      .prepare('INSERT OR IGNORE INTO tags (name, createdAt, updatedAt) VALUES (?, ?, ?)')
      .run(name.trim(), now, now);
    if (res.lastInsertRowid) return res.lastInsertRowid as number;
    const existing = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE').get(name.trim()) as { id: number };
    return existing?.id;
  },

  rename(id: number, name: string) {
    db.prepare('UPDATE tags SET name = ?, updatedAt = ? WHERE id = ?').run(name.trim(), new Date().toISOString(), id);
  },

  delete(id: number) {
    db.prepare('DELETE FROM item_tags WHERE tagId = ?').run(id);
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  },

  merge(fromTagIds: number[], intoTagId: number) {
    const tx = db.transaction(() => {
      for (const fromId of fromTagIds) {
        if (fromId === intoTagId) continue;
        db.prepare('INSERT OR IGNORE INTO item_tags (itemId, tagId) SELECT itemId, ? FROM item_tags WHERE tagId = ?').run(
          intoTagId,
          fromId
        );
        db.prepare('DELETE FROM item_tags WHERE tagId = ?').run(fromId);
        db.prepare('DELETE FROM tags WHERE id = ?').run(fromId);
      }
      db.prepare('UPDATE tags SET updatedAt = ? WHERE id = ?').run(new Date().toISOString(), intoTagId);
    });
    tx();
  }
};
