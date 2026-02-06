export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  position?: number;
  createdAt: string;
  updatedAt: string;
};

export type Feed = {
  id: number;
  title: string;
  url: string;
  enabled: boolean;
  muted: boolean;
  folderId: string | null;
  position?: number;
  createdAt: string;
  updatedAt: string;
  lastFetchedAt: string | null;
  lastFetchStatus: 'ok' | 'error' | null;
  lastFetchError: string | null;
};

export type FeedWithUnread = Feed & { unreadCount: number };

export type FeedCreateRequest = { url: string; title?: string; folderId?: string | null };
export type FeedUpdateRequest = Partial<Pick<Feed, 'title' | 'url' | 'enabled' | 'folderId' | 'muted'>>;

export type Tag = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
};

export type Item = {
  id: number;
  feedId: number;
  guid: string | null;
  title: string;
  link: string;
  publishedAt: string | null;
  author: string | null;
  snippet: string | null;
  content: string | null;
  readableContent?: string | null;
  contentFetchedAt?: string | null;
  imageUrl: string | null;
  createdAt: string;
  feedTitle?: string;
  isRead?: boolean;
  saved?: boolean;
  savedAt?: string | null;
  unsavedAt?: string | null;
  tags?: Tag[];
};

export type ItemQuery = {
  scope: 'newsfeed' | 'feed' | 'folder';
  feedId?: number;
  folderId?: string | null;
  unreadOnly?: boolean;
  search?: string;
  searchMode?: 'basic' | 'fts';
  sort?: 'newest' | 'oldest';
  unreadFirst?: boolean;
  limit?: number;
  cursor?: string | null;
  tagIds?: number[];
  mutedIncluded?: boolean;
};

export type ItemListResponse = {
  items: Item[];
  nextCursor: string | null;
};

export type MarkReadRequest = { isRead: boolean };
export type MarkAllReadRequest = {
  scope: 'newsfeed' | 'feed' | 'folder';
  feedId?: number;
  folderId?: string | null;
  beforePublishedAt?: string | null;
};

export type Settings = Partial<{
  markReadOnOpen: boolean;
  defaultViewMode: 'list' | 'card' | 'magazine';
  unreadFirstDefault: boolean;
  contentFetchEnabled: boolean;
  contentFetchMaxPerRefresh: number;
  refreshMinutes: number;
  articleRetention: 'off' | '1w' | '1m' | '1y';
  theme: 'default' | 'light' | 'dark';
}>;

export type ApiError = { message: string; details?: unknown };
