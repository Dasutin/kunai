import Parser from 'rss-parser';
import { itemsRepo, feedsRepo } from '../db/repository.js';
import type { Feed } from '../../../shared/types.js';
import sanitizeHtml from 'sanitize-html';

const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: [['media:content', 'mediaContent'], ['media:thumbnail', 'mediaThumbnail']]
  }
});

const safeText = (html?: string | null) => (html ? sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }) : null);

const firstImageFromHtml = (html?: string | null): string | null => {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']?([^"'>\s]+)/i);
  return match ? match[1] : null;
};

const pickImage = (item: any): string | null => {
  const enclosureUrl = item.enclosure?.url;
  const mediaContentUrl = Array.isArray(item.mediaContent) ? item.mediaContent[0]?.$.url : item.mediaContent?.['$']?.url || item.mediaContent?.url;
  const mediaThumbUrl = Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail[0]?.url : item.mediaThumbnail?.url;
  const ogImage = item['og:image'];
  const htmlImage = firstImageFromHtml(item['content:encoded'] || item.content || item.summary || item.description);
  return enclosureUrl || mediaContentUrl || mediaThumbUrl || ogImage || htmlImage || null;
};

const normalizeLink = (raw?: string | null): string | null => {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    // strip common tracking params to keep a stable link key
    const params = Array.from(url.searchParams.keys());
    for (const key of params) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || lower === 'gclid' || lower === 'fbclid' || lower.startsWith('mc_')) {
        url.searchParams.delete(key);
      }
    }
    url.hash = '';
    return url.toString();
  } catch {
    return raw;
  }
};

export const refreshFeed = async (feed: Feed) => {
  if (!feed.enabled) return;
  try {
    const parsed = await parser.parseURL(feed.url);
    const items = (parsed.items || []).map((i: any) => {
      const normalizedLink = normalizeLink(i.link);
      const dedupGuid = i.guid || i.id || normalizedLink || i.link || null;
      return {
        guid: dedupGuid,
        title: i.title || 'Untitled',
        link: normalizedLink || i.link || '#',
        publishedAt: i.isoDate || i.pubDate || null,
        author: i.creator || i.author || null,
        snippet: safeText(i.summary || i.contentSnippet || i.content || i.description || null),
        content: safeText(i.content || i['content:encoded'] || i.description || null),
        imageUrl: pickImage(i),
        raw: JSON.stringify(i)
      };
    });

    itemsRepo.upsertItems(feed.id, items);
    feedsRepo.touchFetch(feed.id, 'ok', null);
  } catch (error: any) {
    feedsRepo.touchFetch(feed.id, 'error', error?.message || 'Failed to fetch');
    throw error;
  }
};
