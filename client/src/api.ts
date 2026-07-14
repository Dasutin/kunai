import {
  FeedWithUnread,
  FeedCreateRequest,
  FeedUpdateRequest,
  ItemListResponse,
  MarkAllReadRequest,
  MarkReadRequest,
  Tag,
  Settings,
  Folder,
  UserProfile
} from '@shared/types';

const jsonHeaders = { 'Content-Type': 'application/json' };

const handle = async <T>(res: Response): Promise<T> => {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      const error = await res.json().catch(() => ({}));
      throw new Error((error as any).message || res.statusText);
    }
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }

  if (!isJson) {
    // Empty body or unexpected content type
    const text = await res.text().catch(() => '');
    if (!text) throw new Error(res.statusText || 'Empty response');
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error('Unexpected response');
    }
  }

  return res.json();
};

export const api = {
  async getCurrentUser(): Promise<UserProfile | null> {
    const res = await fetch('/api/auth/me');
    if (res.status === 401) return null;
    return handle(res);
  },
  async login(email: string, password: string): Promise<UserProfile> {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email, password }) });
    return handle(res);
  },
  async register(email: string, name: string, password: string): Promise<UserProfile> {
    const res = await fetch('/api/auth/register', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email, name, password }) });
    return handle(res);
  },
  async logout() {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (!res.ok && res.status !== 204) throw new Error('Failed to sign out');
  },
  async updateProfile(body: Pick<UserProfile, 'name' | 'email'>): Promise<UserProfile> {
    const res = await fetch('/api/auth/profile', { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) });
    return handle(res);
  },
  async uploadProfileImage(imageData: string): Promise<UserProfile> {
    const res = await fetch('/api/auth/profile-image', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ imageData }) });
    return handle(res);
  },
  async changePassword(currentPassword: string, nextPassword: string) {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ currentPassword, nextPassword })
    });
    return handle<{ ok: true }>(res);
  },
  async getFeeds(): Promise<FeedWithUnread[]> {
    const res = await fetch('/api/feeds');
    return handle(res);
  },
  async addFeed(body: FeedCreateRequest) {
    const res = await fetch('/api/feeds', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
    return handle<{ id: number }>(res);
  },
  async updateFeed(id: number, body: FeedUpdateRequest) {
    const res = await fetch(`/api/feeds/${id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) });
    return handle(res);
  },
  async reorderFeeds(ids: number[], folderId: string | null) {
    const res = await fetch('/api/feeds/reorder', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ ids, folderId }) });
    return handle(res);
  },
  async deleteFeed(id: number) {
    const res = await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete feed');
  },
  async moveFeeds(feedIds: number[], folderId: string | null) {
    const res = await fetch('/api/feeds/move', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ feedIds, folderId }) });
    return handle(res);
  },
  async refreshFeed(id: number) {
    const res = await fetch(`/api/feeds/${id}/refresh`, { method: 'POST' });
    return handle(res);
  },
  async refreshAll() {
    const res = await fetch('/api/refresh', { method: 'POST' });
    return handle(res);
  },
  async getItems(params: URLSearchParams): Promise<ItemListResponse> {
    const res = await fetch(`/api/items?${params.toString()}`);
    return handle(res);
  },
  async markRead(id: number, body: MarkReadRequest) {
    const res = await fetch(`/api/items/${id}/read`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
    return handle(res);
  },
  async markAllRead(body: MarkAllReadRequest) {
    const res = await fetch('/api/items/markAllRead', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
    return handle(res);
  },
  async saveItem(id: number, body: { saved: boolean }) {
    const res = await fetch(`/api/items/${id}/save`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
    return handle(res);
  },
  async updateItemTags(id: number, body: { add?: (number | string)[]; remove?: (number | string)[] }) {
    const res = await fetch(`/api/items/${id}/tags`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
    return handle(res);
  },
  async fetchReadableContent(id: number): Promise<{ ok: boolean; readableContent: string | null }> {
    const res = await fetch(`/api/items/${id}/fetchContent`, { method: 'POST' });
    return handle(res);
  },
  async getTags(): Promise<Tag[]> {
    const res = await fetch('/api/tags');
    return handle(res);
  },
  async createTag(name: string): Promise<{ id: number }> {
    const res = await fetch('/api/tags', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name }) });
    return handle(res);
  },
  async deleteTag(id: number) {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete tag');
  },
  async getSettings(): Promise<Settings> {
    const res = await fetch('/api/settings');
    return handle(res);
  },
  async patchSettings(body: Settings) {
    const res = await fetch('/api/settings', { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) });
    return handle(res);
  },
  async importOpml(xmlText: string) {
    const res = await fetch('/api/opml/import', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: xmlText
    });
    return handle<{ discovered: number; created: number; createdIds: number[] }>(res);
  },
  async exportOpml(): Promise<Blob> {
    const res = await fetch('/api/opml/export');
    if (!res.ok) throw new Error('Failed to export OPML');
    return res.blob();
  },
  async getFolders(): Promise<Array<Folder & { unreadCount: number }>> {
    const res = await fetch('/api/folders');
    return handle(res);
  },
  async createFolder(name: string, parentId?: string | null) {
    const res = await fetch('/api/folders', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name, parentId: parentId ?? null }) });
    return handle<{ id: string }>(res);
  },
  async updateFolder(id: string, body: { name?: string; parentId?: string | null }) {
    const res = await fetch(`/api/folders/${id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) });
    return handle(res);
  },
  async deleteFolder(id: string) {
    const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete folder');
  },
  async reorderFolders(ids: string[]) {
    const res = await fetch('/api/folders/reorder', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ ids }) });
    return handle(res);
  }
};
