import { db } from './client.js';
import type {
  FeedCreateRequest,
  FeedUpdateRequest,
  ItemListResponse,
  ItemQuery,
  Tag
} from '../../shared/types.js';
import sanitizeHtml from 'sanitize-html';
import { tagsRepo } from './tags.js';

type NormalizedItem = {
  guid: string | null;
  title: string;
  link: string;
  publishedAt: string | null;
  author: string | null;
  snippet: string | null;
  content: string | null;
  imageUrl: string | null;
  raw: string | null;
};

const toBool = (value: number | null) => value === 1;

const stripHtml = (input: string | null | undefined) => {
  if (!input) return null;
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
};

export const feedsRepo = {
  listWithUnread(): Array<{ unreadCount: number } & any> {
    const stmt = db.prepare(
      `SELECT f.*, (
          SELECT COUNT(1) FROM items i
          LEFT JOIN read_state rs ON rs.itemId = i.id
          WHERE i.feedId = f.id AND (rs.isRead IS NULL OR rs.isRead = 0)
        ) AS unreadCount
       FROM feeds f
       ORDER BY f.createdAt DESC`
    );
    return stmt.all();
  },

  create({ url, title }: FeedCreateRequest) {
    const now = new Date().toISOString();
    const result = db
      .prepare('INSERT INTO feeds (title, url, enabled, createdAt, updatedAt) VALUES (?, ?, 1, ?, ?)')
      .run(title || url, url, now, now);
    return result.lastInsertRowid as number;
  },

  update(id: number, input: FeedUpdateRequest) {
    const fields: string[] = [];
    const values: any[] = [];
    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title);
    }
    if (input.url !== undefined) {
      fields.push('url = ?');
      values.push(input.url);
    }
    if (input.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(input.enabled ? 1 : 0);
    }
    if (input.folderId !== undefined) {
      fields.push('folderId = ?');
      values.push(input.folderId ?? null);
    }
    if (input.muted !== undefined) {
      fields.push('muted = ?');
      values.push(input.muted ? 1 : 0);
    }
    if (!fields.length) return;
    values.push(new Date().toISOString());
    values.push(id);
    const sql = `UPDATE feeds SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`;
    db.prepare(sql).run(...values);
  },

  delete(id: number) {
    db.prepare('DELETE FROM feeds WHERE id = ?').run(id);
  },

  touchFetch(id: number, status: 'ok' | 'error', error: string | null) {
    db.prepare('UPDATE feeds SET lastFetchedAt = ?, lastFetchStatus = ?, lastFetchError = ? WHERE id = ?').run(
      new Date().toISOString(),
      status,
      error,
      id
    );
  },

  findById(id: number) {
    return db.prepare('SELECT * FROM feeds WHERE id = ?').get(id);
  },
};

const encodeCursor = (publishedAt: string | null, id: number, sort: 'newest' | 'oldest') => {
  return Buffer.from(JSON.stringify({ publishedAt, id, sort })).toString('base64');
};

const decodeCursor = (cursor: string | null) => {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as {
      publishedAt: string | null;
      id: number;
      sort: 'newest' | 'oldest';
    };
    return parsed;
  } catch (err) {
    return null;
  }
};

const buildWhereClause = (query: ItemQuery) => {
  const conditions: string[] = [];
  const params: any[] = [];

  if (query.scope === 'feed' && query.feedId) {
    conditions.push('i.feedId = ?');
    params.push(query.feedId);
  }

  if (query.scope === 'folder' && query.folderId) {
    conditions.push('f.folderId = ?');
    params.push(query.folderId);
  }

  if (!query.mutedIncluded) {
    conditions.push('f.muted = 0');
  }

  if (query.unreadOnly) {
    conditions.push('(rs.isRead IS NULL OR rs.isRead = 0)');
  }

  return { conditions, params };
};

const applyCursor = (
  cursor: ReturnType<typeof decodeCursor>,
  sort: 'newest' | 'oldest'
): { clause: string; params: any[] } => {
  if (!cursor) return { clause: '', params: [] };
  const op = sort === 'newest' ? '<' : '>';
  const clause = `(i.publishedAt ${op} ? OR (i.publishedAt IS ? AND i.id ${op} ?))`;
  return { clause, params: [cursor.publishedAt, cursor.publishedAt, cursor.id] };
};

export const itemsRepo = {
  upsertItems(feedId: number, items: NormalizedItem[]) {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO items
        (feedId, guid, title, link, publishedAt, author, snippet, content, imageUrl, raw)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertMany = db.transaction((rows: any[]) => {
      for (const row of rows) {
        stmt.run(
          feedId,
          row.guid,
          row.title,
          row.link,
          row.publishedAt,
          row.author,
          stripHtml(row.snippet),
          stripHtml(row.content),
          row.imageUrl,
          row.raw
        );
      }
    });
    insertMany(items);
  },

  list(query: ItemQuery): ItemListResponse {
    const sort = query.sort || 'newest';
    const limit = Math.min(query.limit || 1000, 1000);
    const cursor = decodeCursor(query.cursor || null);
    const { conditions, params } = buildWhereClause(query);
    const { clause: cursorClause, params: cursorParams } = applyCursor(cursor, sort);

    const usingFts = !!query.search && query.searchMode !== 'basic';
    const tagFilter = query.tagIds && query.tagIds.length > 0;

    if (usingFts && query.search) {
      conditions.push('fts MATCH ?');
      params.push(query.search);
    } else if (query.search) {
      conditions.push('(i.title LIKE ? OR i.snippet LIKE ? OR i.content LIKE ? OR f.title LIKE ?)');
      const like = `%${query.search}%`;
      params.push(like, like, like, like);
    }

    if (tagFilter) {
      conditions.push(`it.tagId IN (${query.tagIds!.map(() => '?').join(',')})`);
      params.push(...query.tagIds!);
    }

    if (cursorClause) {
      conditions.push(cursorClause);
      params.push(...cursorParams);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderDir = sort === 'newest' ? 'DESC' : 'ASC';
    const unreadOrder = query.unreadFirst ? 'rs.isRead ASC,' : '';

    const joinTag = tagFilter ? 'JOIN item_tags it ON it.itemId = i.id' : '';
    const searchSelect = usingFts ? 'JOIN items_fts fts ON fts.rowid = i.id' : '';

    const rows = db
      .prepare(
        `SELECT DISTINCT i.*, f.title as feedTitle, rs.isRead
         FROM items i
         JOIN feeds f ON f.id = i.feedId
         LEFT JOIN read_state rs ON rs.itemId = i.id
         ${joinTag}
         ${searchSelect}
         ${where}
         ORDER BY ${unreadOrder} i.publishedAt ${orderDir}, i.id ${orderDir}
         LIMIT ?`
      )
      .all(...params, limit + 1);

    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const last = rows[limit - 1];
      nextCursor = encodeCursor(last.publishedAt, last.id, sort);
      rows.splice(limit);
    }

    const itemIds = rows.map((r) => r.id);
    let tagMap: Record<number, Tag[]> = {};
    if (itemIds.length) {
      const placeholders = itemIds.map(() => '?').join(',');
      const tagRows = db
        .prepare(
          `SELECT it.itemId, t.* FROM item_tags it JOIN tags t ON t.id = it.tagId WHERE it.itemId IN (${placeholders})`
        )
        .all(...itemIds) as Array<{ itemId: number } & Tag>;
      tagMap = tagRows.reduce((acc, row) => {
        acc[row.itemId] = acc[row.itemId] || [];
        acc[row.itemId].push({ id: row.id, name: row.name, createdAt: row.createdAt, updatedAt: row.updatedAt });
        return acc;
      }, {} as Record<number, Tag[]>);
    }

    const items = rows.map((row) => ({
      ...row,
      isRead: toBool(row.isRead ?? 0),
      tags: tagMap[row.id] || []
    }));
    return { items, nextCursor };
  },

  markRead(itemId: number, isRead: boolean) {
    if (isRead) {
      db.prepare("INSERT OR REPLACE INTO read_state (itemId, isRead, readAt) VALUES (?, 1, datetime('now'))").run(itemId);
    } else {
      db.prepare('DELETE FROM read_state WHERE itemId = ?').run(itemId);
    }
  },

  markAllRead(scope: 'newsfeed' | 'feed' | 'folder', feedId?: number, folderId?: string | null, beforePublishedAt?: string | null) {
    const conditions: string[] = [];
    const params: any[] = [];
    if (scope === 'feed' && feedId) {
      conditions.push('i.feedId = ?');
      params.push(feedId);
    }
    if (scope === 'folder' && folderId) {
      conditions.push('f.folderId = ?');
      params.push(folderId);
    }
    if (beforePublishedAt) {
      conditions.push('(i.publishedAt <= ? OR i.publishedAt IS NULL)');
      params.push(beforePublishedAt);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const ids = db
      .prepare(`SELECT i.id FROM items i JOIN feeds f ON f.id = i.feedId ${where}`)
      .all(...params) as { id: number }[];
    if (!ids.length) return;
    const stmt = db.prepare("INSERT OR REPLACE INTO read_state (itemId, isRead, readAt) VALUES (?, 1, datetime('now'))");
    const mark = db.transaction(() => {
      for (const row of ids) {
        stmt.run(row.id);
      }
    });
    mark();
  },

  setReadableContent(itemId: number, readable: string | null) {
    db.prepare("UPDATE items SET readableContent = ?, contentFetchedAt = datetime('now') WHERE id = ?").run(readable, itemId);
  },

  updateTags(itemId: number, add?: (number | string)[], remove?: (number | string)[]) {
    const addIds: number[] = [];
    const removeIds: number[] = [];

    if (add) {
      for (const t of add) {
        if (typeof t === 'number' || (typeof t === 'string' && !Number.isNaN(Number(t)))) {
          addIds.push(Number(t));
        } else if (typeof t === 'string') {
          addIds.push(tagsRepo.create(t));
        }
      }
    }

    if (remove) {
      for (const t of remove) {
        if (typeof t === 'number' || (typeof t === 'string' && !Number.isNaN(Number(t)))) {
          removeIds.push(Number(t));
        }
      }
    }

    const tx = db.transaction(() => {
      if (addIds.length) {
        const stmt = db.prepare('INSERT OR IGNORE INTO item_tags (itemId, tagId) VALUES (?, ?)');
        for (const id of addIds) stmt.run(itemId, id);
      }
      if (removeIds.length) {
        const stmt = db.prepare('DELETE FROM item_tags WHERE itemId = ? AND tagId = ?');
        for (const id of removeIds) stmt.run(itemId, id);
      }
    });
    tx();
  }
};
