import { feedsRepo } from '../db/repository.js';
import { refreshFeed } from './fetcher.js';
import { env } from '../env.js';
import { settingsRepo } from '../db/settings.js';
import { db } from '../db/client.js';

export const refreshAllFeeds = async () => {
  const feeds = feedsRepo.listWithUnread();
  for (const feed of feeds) {
    try {
      await refreshFeed(feed);
    } catch (err) {
      console.error(`Failed to refresh feed ${feed.id}:`, err);
    }
  }
};

let timer: NodeJS.Timeout | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

const getRefreshMinutes = () => {
  const stored = settingsRepo.getAll().refreshMinutes;
  return Number.isFinite(stored) && stored && stored > 0 ? stored : env.refreshMinutes;
};

const schedule = (minutes: number) => {
  if (timer) clearInterval(timer);
  const intervalMs = minutes * 60 * 1000;
  timer = setInterval(() => {
    refreshAllFeeds().catch((err) => console.error('Refresh all failed', err));
  }, intervalMs);
};

const retentionDays = (val: string | undefined) => {
  switch (val) {
    case '1w':
      return 7;
    case '1m':
      return 30;
    case '1y':
      return 365;
    default:
      return null;
  }
};

const cleanupOldItems = () => {
  const { articleRetention } = settingsRepo.getAll();
  const days = retentionDays(articleRetention as string | undefined);
  if (!days) return;
  const graceDays = 7;
  db.prepare(
    `DELETE FROM items
     WHERE saved = 0
       AND (
         unsavedAt IS NULL OR unsavedAt <= datetime('now', ?)
       )
       AND id IN (SELECT rs.itemId FROM read_state rs WHERE rs.isRead = 1)
       AND datetime(COALESCE(publishedAt, createdAt)) <= datetime('now', ?)`
  ).run(`-${graceDays} days`, `-${days} days`);
};

const scheduleCleanup = () => {
  if (cleanupTimer) clearInterval(cleanupTimer);
  // Run cleanup every 6 hours
  cleanupTimer = setInterval(cleanupOldItems, 6 * 60 * 60 * 1000);
};

export const startScheduler = () => {
  const minutes = getRefreshMinutes();
  schedule(minutes);
  scheduleCleanup();
  cleanupOldItems();
};

export const updateSchedulerInterval = (minutes: number | undefined) => {
  if (!Number.isFinite(minutes) || !minutes || minutes <= 0) return;
  schedule(minutes);
};
