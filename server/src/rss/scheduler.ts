import { feedsRepo } from '../db/repository.js';
import { refreshFeed } from './fetcher.js';
import { env } from '../env.js';
import { settingsRepo } from '../db/settings.js';

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

export const startScheduler = () => {
  const minutes = getRefreshMinutes();
  schedule(minutes);
};

export const updateSchedulerInterval = (minutes: number | undefined) => {
  if (!Number.isFinite(minutes) || !minutes || minutes <= 0) return;
  schedule(minutes);
};
