import { db } from './client.js';
import { randomUUID } from 'crypto';
import type { Folder } from '../../shared/types.js';

export const foldersRepo = {
  list(): Array<Folder & { unreadCount: number }> {
    const rows = db
      .prepare(`
        SELECT f.*, COALESCE(uc.unreadCount, 0) as unreadCount
        FROM folders f
        LEFT JOIN (
          SELECT fo.id as folderId, SUM(COALESCE(rsCnt.cnt, 0)) as unreadCount
          FROM folders fo
          LEFT JOIN feeds fe ON fe.folderId = fo.id
          LEFT JOIN (
            SELECT i.feedId, COUNT(*) as cnt
            FROM items i
            LEFT JOIN read_state rs ON rs.itemId = i.id
            WHERE rs.isRead IS NULL OR rs.isRead = 0
            GROUP BY i.feedId
          ) rsCnt ON rsCnt.feedId = fe.id
          GROUP BY fo.id
        ) uc ON uc.folderId = f.id
        ORDER BY f.createdAt ASC
      `)
      .all();
    return rows as any;
  },

  create(name: string, parentId: string | null) {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO folders (id, name, parentId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)').run(
      id,
      name,
      parentId,
      now,
      now
    );
    return id;
  },

  update(id: string, name?: string, parentId?: string | null) {
    const fields: string[] = [];
    const values: any[] = [];
    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (parentId !== undefined) {
      fields.push('parentId = ?');
      values.push(parentId);
    }
    if (!fields.length) return;
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE folders SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`).run(...values);
  },

  delete(id: string) {
    // Move contained feeds to root
    db.prepare('UPDATE feeds SET folderId = NULL WHERE folderId = ?').run(id);
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
  }
};
