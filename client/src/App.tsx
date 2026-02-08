import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { FeedWithUnread, Folder, Item, Settings, Tag } from '@shared/types';
import { usePersistedState } from './hooks/usePersistedState';
import { Sidebar } from './components/Sidebar';
import { HeaderBar } from './components/HeaderBar';
import { ItemList } from './components/ItemList';
import { ItemGrid } from './components/ItemGrid';
import { ItemMagazine } from './components/ItemMagazine';
import { ItemModal } from './components/ItemModal';
import { AddFeedModal } from './components/AddFeedModal';
import { SettingsModal } from './components/SettingsModal';
import { MiniSidebar } from './components/MiniSidebar';
import clsx from 'clsx';
import { CreateFolderModal } from './components/CreateFolderModal';
import { DeleteFolderModal } from './components/DeleteFolderModal';

type FolderWithUnread = Folder & { unreadCount: number };

const EMPTY_QUOTES = [
  "📜 All scrolls read.",
  "🥷 The dojo is quiet. Too quiet.",
  "🔪 Nothing left to slice.",
  "🌑 No news. Only shadows.",
  "🏆 All headlines eliminated. Flawless victory.",
  "⚔️ The RSS has been slain.",
  "🗡️ Your blade is sharp. The feed is empty.",
  "⚡ No unread news. Ninja speed achieved.",
  "💨 You blinked. The news is gone.",
  "⏱️ Feed cleared in under 3 seconds. Respect.",
  "🎯 Nothing survives the kunai scroll.",
  "🤫 RSS Zero. Absolute silence.",
  "💣 All caught up. Time to disappear in a smoke bomb.",
  "😨 The feed fears you.",
  "🏃‍♂️ You read so hard the news fled.",
  "🌀 This silence cost three shurikens.",
  "⚡ You struck the news before it loaded."
];

const scopeLabel = (selectedFeed: FeedWithUnread | null, selectedFolderId: string | null, folders: FolderWithUnread[], savedView: boolean) => {
  if (savedView) return 'Saved';
  if (selectedFeed) return selectedFeed.title;
  if (selectedFolderId) {
    const folder = folders.find((f) => f.id === selectedFolderId);
    return folder?.name || 'Folder';
  }
  return 'Newsfeed';
};

const App: React.FC = () => {
  const [feeds, setFeeds] = useState<FeedWithUnread[]>([]);
  const [folders, setFolders] = useState<FolderWithUnread[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = usePersistedState<'list' | 'card' | 'magazine'>('viewMode', 'list');
  const [unreadOnly, setUnreadOnly] = usePersistedState('unreadOnly', false);
  const [unreadFirst, setUnreadFirst] = usePersistedState('unreadFirst', false);
  const [searchMode, setSearchMode] = usePersistedState<'basic' | 'fts'>('searchMode', 'basic');
  const [mutedIncluded, setMutedIncluded] = usePersistedState('mutedIncluded', false);
  const [sort, setSort] = usePersistedState<'newest' | 'oldest'>('sort', 'newest');
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedState('sidebarCollapsed', false);
  const [sidebarPinned, setSidebarPinned] = usePersistedState('sidebarPinned', true);
  const [sidebarPeek, setSidebarPeek] = useState(false);
  const [savedItems, setSavedItems] = useState<Item[]>([]);
  const [savedView, setSavedView] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  // Pagination disabled: load everything available.
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [modalItem, setModalItem] = useState<Item | null>(null);
  const [addingFeed, setAddingFeed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{ folder: FolderWithUnread; feedCount: number } | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [appliedDefaults, setAppliedDefaults] = useState(false);
  const [contentLoadingId, setContentLoadingId] = useState<number | null>(null);
  const [headerCondensed, setHeaderCondensed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [emptyQuote, setEmptyQuote] = useState('');
  const latestRequestId = useRef(0);

  const displayItems = useMemo(() => {
    if (!savedView) return items;
    let list = [...savedItems];
    if (unreadOnly) list = list.filter((it) => !it.isRead);
    if (search) list = list.filter((it) => it.title.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [savedView, items, savedItems, unreadOnly, search]);

  const savedIds = useMemo(() => new Set(savedItems.map((i) => i.id)), [savedItems]);

  const unreadCount = useMemo(() => displayItems.filter((it) => !it.isRead).length, [displayItems]);

  const selectedFeed = useMemo(() => feeds.find((f) => f.id === selectedFeedId) || null, [feeds, selectedFeedId]);

  const folderFeedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    feeds.forEach((f) => {
      if (f.folderId) counts[f.folderId] = (counts[f.folderId] || 0) + 1;
    });
    return counts;
  }, [feeds]);

  useEffect(() => {
    if (displayItems.length === 0) {
      const next = EMPTY_QUOTES[Math.floor(Math.random() * EMPTY_QUOTES.length)];
      setEmptyQuote(next);
    }
  }, [displayItems.length]);

  useEffect(() => {
    const totalUnread = feeds.reduce((sum, f) => sum + (f.unreadCount || 0), 0);
    document.title = totalUnread > 0 ? `(${totalUnread}) Kunai` : 'Kunai';
  }, [feeds]);

  useEffect(() => {
    const handleScroll = () => {
      setHeaderCondensed(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadFeeds = useCallback(async () => {
    try {
      const data = await api.getFeeds();
      setFeeds(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load feeds');
    }
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      const data = await api.getFolders();
      setFolders(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load folders');
    }
  }, []);

  const reorderFoldersLocal = (ids: string[]) => {
    setFolders((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]));
      const ordered = ids.map((id, idx) => ({ ...map.get(id)!, position: idx + 1 })).filter(Boolean) as FolderWithUnread[];
      const untouched = prev.filter((f) => !ids.includes(f.id)).map((f) => ({ ...f }));
      return [...ordered, ...untouched];
    });
  };

  const handleReorderFolders = async (ids: string[]) => {
    reorderFoldersLocal(ids);
    try {
      await api.reorderFolders(ids);
      const data = await api.getFolders();
      setFolders(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to reorder folders');
      loadFolders();
    }
  };

  const reorderFeedsLocal = (folderId: string | null, ids: number[]) => {
    setFeeds((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]));
      const ordered = ids
        .map((id, idx) => {
          const f = map.get(id);
          if (!f) return null;
          return { ...f, folderId, position: idx + 1 } as FeedWithUnread;
        })
        .filter(Boolean) as FeedWithUnread[];
      const others = prev.filter((f) => !ids.includes(f.id)).map((f) => ({ ...f } as FeedWithUnread));
      const next = [...others, ...ordered];
      const folderUnread = next.reduce<Record<string, number>>((acc, f) => {
        if (f.folderId) acc[f.folderId] = (acc[f.folderId] || 0) + (f.unreadCount || 0);
        return acc;
      }, {});
      setFolders((prevFolders) => prevFolders.map((fol) => ({ ...fol, unreadCount: folderUnread[fol.id] || 0 })));
      return next;
    });
  };

  const handleReorderFeeds = async (folderId: string | null, ids: number[]) => {
    reorderFeedsLocal(folderId, ids);
    try {
      await api.reorderFeeds(ids, folderId);
      const [feedsData, foldersData] = await Promise.all([api.getFeeds(), api.getFolders()]);
      setFeeds(feedsData);
      setFolders(foldersData);
    } catch (err: any) {
      setError(err?.message || 'Failed to reorder feeds');
      await Promise.all([loadFeeds(), loadFolders()]);
    }
  };

  const loadTags = useCallback(async () => {
    try {
      const data = await api.getTags();
      setTags(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load tags');
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load settings');
    }
  }, []);

  useEffect(() => {
    const theme = settings?.theme || 'default';
    document.documentElement.setAttribute('data-theme', theme);
  }, [settings]);

  const fetchItems = useCallback(
    async (opts?: { tagIds?: number[] }) => {
      const requestId = ++latestRequestId.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        const scope = selectedFeedId ? 'feed' : selectedFolderId ? 'folder' : 'newsfeed';
        params.set('scope', scope);
        if (selectedFeedId) params.set('feedId', String(selectedFeedId));
        if (selectedFolderId && !selectedFeedId) params.set('folderId', selectedFolderId);
        if (unreadOnly) params.set('unreadOnly', 'true');
        if (search) params.set('search', search);
        if (searchMode) params.set('searchMode', searchMode);
        if (unreadFirst) params.set('unreadFirst', 'true');
        if (mutedIncluded) params.set('mutedIncluded', 'true');
        const tagIds = opts?.tagIds ?? selectedTagIds;
        if (tagIds.length) params.set('tagIds', tagIds.join(','));
        else if (opts && opts.tagIds?.length === 0) params.set('tagIds', '');
        params.set('sort', sort);
        params.set('limit', '1000');

        const data = await api.getItems(params);
        // Ignore stale responses
        if (requestId === latestRequestId.current) {
          setItems(data.items);
          setSavedItems(data.items.filter((it) => it.saved));
        }
      } catch (err: any) {
        if (requestId === latestRequestId.current) {
          setError(err?.message || 'Failed to load items');
        }
      } finally {
        if (requestId === latestRequestId.current) {
          setLoading(false);
        }
      }
    },
    [search, searchMode, selectedFeedId, selectedFolderId, sort, unreadFirst, unreadOnly, selectedTagIds, mutedIncluded]
  );

  useEffect(() => {
    loadSettings();
    loadFeeds();
    loadFolders();
    loadTags();
  }, [loadFeeds, loadFolders, loadSettings, loadTags]);

  useEffect(() => {
    if (!settings || appliedDefaults) return;
    if (!localStorage.getItem('viewMode') && settings.defaultViewMode) setViewMode(settings.defaultViewMode);
    if (!localStorage.getItem('unreadFirst') && settings.unreadFirstDefault !== undefined) setUnreadFirst(!!settings.unreadFirstDefault);
    setAppliedDefaults(true);
  }, [settings, appliedDefaults, setViewMode, setUnreadFirst]);

  useEffect(() => {
    fetchItems();
    setExpandedId(null);
  }, [selectedFeedId, selectedFolderId, unreadOnly, sort, search, searchMode, unreadFirst, selectedTagIds, mutedIncluded, fetchItems]);

  const handleToggleRead = async (item: Item, next: boolean) => {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, isRead: next } : it)));
    setModalItem((prev) => (prev && prev.id === item.id ? { ...prev, isRead: next } : prev));
    setSavedItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, isRead: next } : it)));
    try {
      await api.markRead(item.id, { isRead: next });
      loadFeeds();
      loadFolders();
    } catch (err) {
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, isRead: !next } : it)));
      setSavedItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, isRead: !next } : it)));
    }
  };

  const handleToggleSaved = (item: Item) => {
    const next = !item.saved;
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, saved: next } : it)));
    setSavedItems((prev) => {
      if (next) return [{ ...item, saved: true }, ...prev];
      return prev.filter((it) => it.id !== item.id);
    });
    api.saveItem(item.id, { saved: next }).catch(() => {
      // revert on error
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, saved: item.saved } : it)));
      setSavedItems((prev) => {
        if (item.saved) {
          if (prev.find((p) => p.id === item.id)) return prev;
          return [{ ...item, saved: true }, ...prev];
        }
        return prev.filter((p) => p.id !== item.id);
      });
      setError('Failed to update saved state');
    });
  };

  const handleMarkAll = async () => {
    if (savedView) {
      setSavedItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
      setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
      await handleRefresh();
      return;
    }
    try {
      const scope = selectedFeedId ? 'feed' : selectedFolderId ? 'folder' : 'newsfeed';
      await api.markAllRead({ scope, feedId: selectedFeedId || undefined, folderId: selectedFolderId || undefined });
      setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
      await handleRefresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark all read');
    }
  };

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (selectedFeedId) await api.refreshFeed(selectedFeedId);
      else await api.refreshAll();
      await Promise.all([loadFeeds(), loadFolders()]);
      fetchItems();
    } catch (err: any) {
      setError(err?.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [selectedFeedId, loadFeeds, loadFolders, fetchItems, refreshing]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) handleRefresh();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  const handleAddFeed = async (url: string, title?: string) => {
    await api.addFeed({ url, title, folderId: selectedFolderId || undefined });
    await Promise.all([loadFeeds(), loadFolders()]);
    fetchItems();
  };

  const patchTags = (existing: Tag[] = [], add?: (number | string)[], remove?: (number | string)[]) => {
    let next = [...existing];
    if (remove?.length) {
      next = next.filter((t) => !remove.includes(t.id) && !remove.includes(t.name));
    }
    if (add?.length) {
      for (const ref of add) {
        if (typeof ref === 'number') {
          const found = tags.find((t) => t.id === ref);
          if (found && !next.some((t) => t.id === found.id)) next.push(found);
        } else if (typeof ref === 'string') {
          const exists = next.find((t) => t.name.toLowerCase() === ref.toLowerCase());
          if (!exists) {
            const known = tags.find((t) => t.name.toLowerCase() === ref.toLowerCase());
            next.push(known || { id: Date.now(), name: ref, createdAt: '', updatedAt: '' });
          }
        }
      }
    }
    return next;
  };

  const handleUpdateTags = async (item: Item, add?: (number | string)[], remove?: (number | string)[]) => {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, tags: patchTags(it.tags, add, remove) } : it)));
    setModalItem((prev) => (prev && prev.id === item.id ? { ...prev, tags: patchTags(prev.tags, add, remove) } : prev));
    setSavedItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, tags: patchTags(it.tags, add, remove) } : it)));
    try {
      await api.updateItemTags(item.id, { add, remove });
      loadTags();
    } catch (err: any) {
      setError(err?.message || 'Failed to update tags');
      fetchItems();
    }
  };

  const handleFetchContent = async (item: Item) => {
    setContentLoadingId(item.id);
    try {
      const res = await api.fetchReadableContent(item.id);
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, readableContent: res.readableContent } : it)));
      setModalItem((prev) => (prev && prev.id === item.id ? { ...prev, readableContent: res.readableContent } : prev));
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch content');
    } finally {
      setContentLoadingId(null);
    }
  };

  const markOnOpenIfNeeded = (item?: Item | null) => {
    if (item && !item.isRead) {
      handleToggleRead(item, true);
    }
  };

  const fetchOnOpenIfNeeded = (item?: Item | null) => {
    if (!item) return;
    if (!item.readableContent && contentLoadingId !== item.id) {
      handleFetchContent(item);
    }
  };

  const handleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    const found = items.find((it) => it.id === id);
    markOnOpenIfNeeded(found);
    fetchOnOpenIfNeeded(found);
    setExpandedId(id);
  };

  const handleOpenModal = (item: Item) => {
    markOnOpenIfNeeded(item);
    fetchOnOpenIfNeeded(item);
    setModalItem(item);
  };

  const handleSelectFeed = (id: number | null) => {
    setSavedView(false);
    if (id === null) {
      setSelectedFeedId(null);
      setSelectedFolderId(null);
      return;
    }
    setSelectedFeedId(id);
    const feed = feeds.find((f) => f.id === id);
    setSelectedFolderId(feed?.folderId ?? null);
  };

  const handleSelectFolder = (folderId: string | null) => {
    setSavedView(false);
    setSelectedFolderId(folderId);
    setSelectedFeedId(null);
  };

  const handleSelectSaved = () => {
    setSavedView(true);
    setSelectedFeedId(null);
    setSelectedFolderId(null);
    setMobileSidebarOpen(false);
  };

  const toggleTagFilter = (id: number) => {
    const tagId = Number(id);
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]));
  };

  const clearTagFilters = () => {
    // Clear selection first so derived UI updates immediately
    setSelectedTagIds([]);
    setExpandedId(null);
    // Then refetch with explicit empty tag set to drop server-side tag filtering
    fetchItems({ tagIds: [] });
  };

  const handleCreateFolder = async (name: string) => {
    if (!name.trim()) return;
    await api.createFolder(name.trim());
    await loadFolders();
  };

  const handleRequestDeleteFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    const feedCount = folderFeedCounts[folderId] || 0;
    setFolderToDelete({ folder, feedCount });
    setMobileSidebarOpen(false);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    setDeletingFolder(true);
    try {
      await api.deleteFolder(folderToDelete.folder.id);
      if (selectedFolderId === folderToDelete.folder.id) {
        setSelectedFolderId(null);
      }
      await Promise.all([loadFolders(), loadFeeds()]);
      setFolderToDelete(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete folder');
    } finally {
      setDeletingFolder(false);
    }
  };

  const handleMoveFeed = async (feedId: number, folderId: string | null) => {
    await api.moveFeeds([feedId], folderId);
    await Promise.all([loadFeeds(), loadFolders()]);
    if (selectedFeedId === feedId) setSelectedFolderId(folderId);
  };

  const handleSidebarPeekHover = () => {
    if (!sidebarPinned) setSidebarPeek(true);
  };

  return (
    <div className={clsx(
      'app-shell',
      sidebarCollapsed && 'sidebar-collapsed',
      isMobile && 'is-mobile',
      isMobile && mobileSidebarOpen && 'sidebar-open',
      !sidebarPinned && !isMobile && 'sidebar-unpinned',
      sidebarPeek && 'sidebar-peek'
    )}>
      <MiniSidebar
        onSelectHome={() => { handleSelectFeed(null); handleSelectFolder(null); setMobileSidebarOpen(false); }}
        onSelectSaved={handleSelectSaved}
        onSettings={() => setSettingsOpen(true)}
        onAddFeed={() => setAddingFeed(true)}
        isMobile={isMobile}
        onToggleContext={() => setMobileSidebarOpen((prev) => !prev)}
        sidebarPinned={sidebarPinned}
        onTogglePin={() => {
          setSidebarPinned((prev) => {
            const next = !prev;
            if (next) setSidebarPeek(false);
            return next;
          });
        }}
        onTogglePeek={() => setSidebarPeek(true)}
        onPeekStart={() => setSidebarPeek(true)}
        onPeekEnd={() => setSidebarPeek(false)}
      />
      <Sidebar
        feeds={feeds}
        folders={folders}
        selectedFeedId={selectedFeedId}
        selectedFolderId={selectedFolderId}
        onSelectFeed={handleSelectFeed}
        onSelectFolder={handleSelectFolder}
        onOpenCreateFolder={() => setCreateFolderOpen(true)}
        onOpenSettings={() => { setSettingsOpen(true); setMobileSidebarOpen(false); }}
        onMoveFeed={handleMoveFeed}
        onReorderFolders={handleReorderFolders}
        onReorderFeeds={handleReorderFeeds}
        onDeleteFolder={handleRequestDeleteFolder}
        onSelectSaved={handleSelectSaved}
        savedCount={savedItems.length}
        savedView={savedView}
        collapsed={false}
        onToggleCollapse={() => {}}
        pinned={sidebarPinned}
        peek={sidebarPeek}
        onClosePeek={() => setSidebarPeek(false)}
        onPeek={handleSidebarPeekHover}
        isMobile={isMobile}
      />
      {isMobile && mobileSidebarOpen && <div className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />}
      <main className="main">
        <HeaderBar
          viewMode={viewMode}
          onViewChange={setViewMode}
          unreadOnly={unreadOnly}
          unreadCount={unreadCount}
          onUnreadChange={setUnreadOnly}
          search={search}
          onSearch={setSearch}
          onRefresh={handleRefresh}
          onMarkAllRead={handleMarkAll}
          scopeLabel={scopeLabel(selectedFeed, selectedFolderId, folders, savedView)}
          condensed={headerCondensed}
          isMobile={isMobile}
          onToggleSidebar={() => {
            if (sidebarCollapsed) {
              setSidebarCollapsed(false);
              setMobileSidebarOpen(true);
            } else {
              setMobileSidebarOpen((prev) => !prev);
            }
          }}
        />

        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="muted">Filter by tag:</span>
            {tags.map((tag) => (
              <button
                key={tag.id}
                className={clsx('toggle', selectedTagIds.includes(tag.id) && 'active')}
                onClick={() => toggleTagFilter(tag.id)}
              >
                {tag.name}
                {typeof tag.usageCount === 'number' ? ` (${tag.usageCount})` : ''}
              </button>
            ))}
            {selectedTagIds.length > 0 && (
              <button className="btn-ghost" onClick={clearTagFilters}>
                Clear tags
              </button>
            )}
          </div>
        )}

        {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}

        {displayItems.length === 0 ? (
          <div className="empty-state">{emptyQuote || "You've read everything"}</div>
        ) : (
          <>
            {viewMode === 'list' && (
              <ItemList
                items={displayItems}
                expandedId={expandedId}
                onExpand={handleExpand}
                onToggleRead={handleToggleRead}
                onOpenModal={handleOpenModal}
                onUpdateTags={handleUpdateTags}
                savedIds={savedIds}
                onToggleSave={handleToggleSaved}
              />
            )}
            {viewMode === 'card' && (
              <ItemGrid
                items={displayItems}
                onOpen={handleOpenModal}
                onToggleRead={handleToggleRead}
                savedIds={savedIds}
                onToggleSave={handleToggleSaved}
              />
            )}
            {viewMode === 'magazine' && (
              <ItemMagazine
                items={displayItems}
                onOpen={handleOpenModal}
                onToggleRead={handleToggleRead}
                savedIds={savedIds}
                onToggleSave={handleToggleSaved}
              />
            )}
          </>
        )}
      </main>

      {modalItem && (
        <ItemModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          onUpdateTags={handleUpdateTags}
          onFetchContent={() => handleFetchContent(modalItem)}
          fetchingContent={contentLoadingId === modalItem.id}
          canFetchContent={true}
          onToggleRead={handleToggleRead}
          onToggleSave={handleToggleSaved}
          saved={savedIds.has(modalItem.id)}
        />
      )}
      {addingFeed && <AddFeedModal onSubmit={handleAddFeed} onClose={() => setAddingFeed(false)} />}
      {createFolderOpen && <CreateFolderModal onSubmit={handleCreateFolder} onClose={() => setCreateFolderOpen(false)} />}
      {folderToDelete && (
        <DeleteFolderModal
          folderName={folderToDelete.folder.name}
          feedCount={folderToDelete.feedCount}
          loading={deletingFolder}
          onConfirm={handleConfirmDeleteFolder}
          onClose={() => {
            if (deletingFolder) return;
            setFolderToDelete(null);
          }}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => { setSettingsOpen(false); loadSettings(); }} />}
    </div>
  );
};

export default App;
