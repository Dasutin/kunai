import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { db } from './db/client.js';
import { applyMigrations } from './db/migrations.js';
import { feedsRepo, itemsRepo } from './db/repository.js';
import { refreshAllFeeds } from './rss/scheduler.js';
import { updateSchedulerInterval } from './rss/scheduler.js';
import { refreshFeed } from './rss/fetcher.js';
import type {
  FeedCreateRequest,
  FeedUpdateRequest,
  MarkAllReadRequest,
  MarkReadRequest,
  ItemQuery,
  Settings
} from '../../shared/types.js';
import { z } from 'zod';
import { foldersRepo } from './db/folders.js';
import { tagsRepo } from './db/tags.js';
import { settingsRepo } from './db/settings.js';
import { parseOpml, buildOpml } from './opml.js';
import { fetchReadable } from './content/fetcher.js';

applyMigrations(db);

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.text({ type: ['text/xml', 'application/xml', 'text/plain'], limit: `${env.maxUploadMb}mb` }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../dist/client');

const parseNumber = (val: any) => {
  const num = Number(val);
  return Number.isFinite(num) ? num : undefined;
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Folders
app.get('/api/folders', (_req, res) => {
  res.json(foldersRepo.list());
});

app.post('/api/folders', (req, res) => {
  const schema = z.object({ name: z.string().min(1), parentId: z.string().uuid().nullable().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', details: parsed.error.flatten() });
  const id = foldersRepo.create(parsed.data.name, parsed.data.parentId ?? null);
  res.status(201).json({ id });
});

app.patch('/api/folders/:id', (req, res) => {
  const id = req.params.id;
  const schema = z.object({ name: z.string().min(1).optional(), parentId: z.string().uuid().nullable().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', details: parsed.error.flatten() });
  foldersRepo.update(id, parsed.data.name, parsed.data.parentId);
  res.json({ ok: true });
});

app.delete('/api/folders/:id', (req, res) => {
  foldersRepo.delete(req.params.id);
  res.status(204).end();
});

app.get('/api/feeds', (_req, res) => {
  const feeds = feedsRepo.listWithUnread();
  res.json(feeds);
});

app.post('/api/feeds', (req, res) => {
  const schema = z.object({ url: z.string().url(), title: z.string().optional() });
  const parsed = schema.safeParse(req.body as FeedCreateRequest);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', details: parsed.error.flatten() });

  const id = feedsRepo.create(parsed.data);
  res.status(201).json({ id });
});

app.patch('/api/feeds/:id', (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    title: z.string().optional(),
    url: z.string().url().optional(),
    enabled: z.boolean().optional(),
    folderId: z.string().uuid().nullable().optional(),
    muted: z.boolean().optional()
  });
  const parsed = schema.safeParse(req.body as FeedUpdateRequest);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', details: parsed.error.flatten() });

  feedsRepo.update(id, parsed.data);
  res.json({ ok: true });
});

app.post('/api/feeds/move', (req, res) => {
  const schema = z.object({ feedIds: z.array(z.number()), folderId: z.string().uuid().nullable() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', details: parsed.error.flatten() });
  for (const fid of parsed.data.feedIds) {
    feedsRepo.update(fid, { folderId: parsed.data.folderId });
  }
  res.json({ ok: true });
});

app.delete('/api/feeds/:id', (req, res) => {
  const id = Number(req.params.id);
  feedsRepo.delete(id);
  res.status(204).end();
});

app.post('/api/feeds/:id/refresh', async (req, res) => {
  const id = Number(req.params.id);
  const feed = feedsRepo.findById(id);
  if (!feed) return res.status(404).json({ message: 'Feed not found' });
  try {
    await refreshFeed(feed);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to refresh' });
  }
});

app.post('/api/refresh', async (_req, res) => {
  refreshAllFeeds()
    .then(() => res.json({ ok: true }))
    .catch((err) => res.status(500).json({ message: err?.message || 'Failed to refresh' }));
});

app.get('/api/items', (req, res) => {
  const query: ItemQuery = {
    scope: (req.query.scope as 'newsfeed' | 'feed') || 'newsfeed',
    feedId: parseNumber(req.query.feedId),
    folderId: (req.query.folderId as string) || undefined,
    unreadOnly: req.query.unreadOnly === 'true',
    search: (req.query.search as string) || undefined,
    searchMode: (req.query.searchMode as 'basic' | 'fts') || undefined,
    sort: (req.query.sort as 'newest' | 'oldest') || 'newest',
    unreadFirst: req.query.unreadFirst === 'true',
    limit: parseNumber(req.query.limit),
    cursor: (req.query.cursor as string) || null,
    mutedIncluded: req.query.mutedIncluded === 'true'
  };
  if (req.query.tagIds) {
    const tags = String(req.query.tagIds)
      .split(',')
      .map((t) => Number(t))
      .filter((n) => Number.isFinite(n));
    query.tagIds = tags;
  }
  if (query.scope === 'feed' && !query.feedId) {
    return res.status(400).json({ message: 'feedId required when scope=feed' });
  }
  const result = itemsRepo.list(query);
  res.json(result);
});

app.post('/api/items/:id/read', (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({ isRead: z.boolean() });
  const parsed = schema.safeParse(req.body as MarkReadRequest);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', details: parsed.error.flatten() });
  itemsRepo.markRead(id, parsed.data.isRead);
  res.json({ ok: true });
});

app.post('/api/items/markAllRead', (req, res) => {
  const schema = z.object({
    scope: z.enum(['newsfeed', 'feed', 'folder']),
    feedId: z.number().optional(),
    folderId: z.string().uuid().nullable().optional(),
    beforePublishedAt: z.string().nullable().optional()
  });
  const parsed = schema.safeParse(req.body as MarkAllReadRequest);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', details: parsed.error.flatten() });

  if (parsed.data.scope === 'feed' && !parsed.data.feedId) {
    return res.status(400).json({ message: 'feedId required when scope=feed' });
  }
  if (parsed.data.scope === 'folder' && !parsed.data.folderId) {
    return res.status(400).json({ message: 'folderId required when scope=folder' });
  }
  itemsRepo.markAllRead(parsed.data.scope, parsed.data.feedId, parsed.data.folderId, parsed.data.beforePublishedAt || undefined);
  res.json({ ok: true });
});

// Item tags
app.post('/api/items/:id/tags', (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({ add: z.array(z.union([z.string(), z.number()])).optional(), remove: z.array(z.union([z.string(), z.number()])).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', details: parsed.error.flatten() });
  itemsRepo.updateTags(id, parsed.data.add, parsed.data.remove);
  res.json({ ok: true });
});

// Tags
app.get('/api/tags', (_req, res) => {
  res.json(tagsRepo.list());
});

app.post('/api/tags', (req, res) => {
  const schema = z.object({ name: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', details: parsed.error.flatten() });
  const id = tagsRepo.create(parsed.data.name);
  res.status(201).json({ id });
});

app.patch('/api/tags/:id', (req, res) => {
  const schema = z.object({ name: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', details: parsed.error.flatten() });
  tagsRepo.rename(Number(req.params.id), parsed.data.name);
  res.json({ ok: true });
});

app.delete('/api/tags/:id', (req, res) => {
  tagsRepo.delete(Number(req.params.id));
  res.status(204).end();
});

app.post('/api/tags/merge', (req, res) => {
  const schema = z.object({ fromTagIds: z.array(z.number()), intoTagId: z.number() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', details: parsed.error.flatten() });
  tagsRepo.merge(parsed.data.fromTagIds, parsed.data.intoTagId);
  res.json({ ok: true });
});

// Settings
app.get('/api/settings', (_req, res) => {
  res.json(settingsRepo.getAll());
});

app.patch('/api/settings', (req, res) => {
  const body = req.body as Settings;
  settingsRepo.update(body);
  if (body.refreshMinutes && Number(body.refreshMinutes) > 0) {
    updateSchedulerInterval(Number(body.refreshMinutes));
  }
  res.json({ ok: true });
});

// Content fetch
app.post('/api/items/:id/fetchContent', async (req, res) => {
  if (!env.contentFetchEnabled) return res.status(403).json({ message: 'Content fetch disabled by server' });
  const id = Number(req.params.id);
  const item = db.prepare('SELECT link FROM items WHERE id = ?').get(id) as { link: string } | undefined;
  if (!item) return res.status(404).json({ message: 'Item not found' });
  try {
    const { content } = await fetchReadable(item.link);
    itemsRepo.setReadableContent(id, content || null);
    res.json({ ok: true, readableContent: content });
  } catch (err: any) {
    console.warn('Content fetch failed', { id, link: item.link, error: err?.message });
    res.json({ ok: false, readableContent: null, message: err?.message || 'Failed to fetch content' });
  }
});

// OPML Import/Export
app.post('/api/opml/import', async (req, res) => {
  const xml = typeof req.body === 'string' ? req.body : '';
  if (!xml) return res.status(400).json({ message: 'OPML payload required (text/xml)' });
  try {
    const parsed = parseOpml(xml);
    const existing = new Set<string>(db.prepare('SELECT url FROM feeds').all().map((r: any) => r.url));
    const toCreate = parsed.discovered.filter((f) => !existing.has(f.url));
    const createdIds: number[] = [];
    const now = new Date().toISOString();
    const tx = db.transaction(() => {
      for (const feed of toCreate) {
        const res = db
          .prepare('INSERT INTO feeds (title, url, enabled, createdAt, updatedAt, folderId) VALUES (?, ?, 1, ?, ?, ?)')
          .run(feed.title || feed.url, feed.url, now, now, null);
        createdIds.push(res.lastInsertRowid as number);
      }
    });
    tx();
    res.json({ discovered: parsed.discovered.length, created: toCreate.length, createdIds });
  } catch (err: any) {
    res.status(400).json({ message: err?.message || 'Failed to import OPML' });
  }
});

app.get('/api/opml/export', (_req, res) => {
  const feeds = feedsRepo.listWithUnread();
  const folders = foldersRepo.list();
  const xml = buildOpml(feeds, folders);
  res.setHeader('Content-Type', 'text/xml');
  res.send(xml);
});

app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Fallback error handler to return JSON instead of HTML
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error', err);
  res.status(500).json({ message: err?.message || 'Internal Server Error' });
});

app.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
  refreshAllFeeds().catch((err) => console.error('Initial refresh failed', err));
});

// Scheduler runs regardless of traffic
import('./rss/scheduler.js').then(({ startScheduler }) => startScheduler());
