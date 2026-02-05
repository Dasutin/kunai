import React, { useState } from 'react';
import { FeedWithUnread, Folder } from '@shared/types';
import clsx from 'clsx';

const timeAgo = (iso: string | null) => {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
};

type Props = {
  feeds: FeedWithUnread[];
  folders: Array<Folder & { unreadCount: number }>;
  selectedFeedId: number | null;
  selectedFolderId: string | null;
  onSelectFeed: (id: number | null) => void;
  onSelectFolder: (id: string | null) => void;
  onOpenCreateFolder: () => void;
  onMoveFeed: (feedId: number, folderId: string | null) => void;
  onReorderFolders: (orderedIds: string[]) => void;
  onReorderFeeds: (folderId: string | null, orderedIds: number[]) => void;
  onSelectSaved: () => void;
  savedCount: number;
  savedView: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  pinned: boolean;
  peek: boolean;
  onClosePeek: () => void;
  onPeek: () => void;
};

export const Sidebar: React.FC<Props> = ({
  feeds,
  folders,
  selectedFeedId,
  selectedFolderId,
  onSelectFeed,
  onSelectFolder,
  onOpenCreateFolder,
  onMoveFeed,
  onReorderFolders,
  onReorderFeeds = () => {},
  onSelectSaved,
  savedCount,
  savedView,
  collapsed,
  onToggleCollapse,
  pinned,
  peek,
  onClosePeek,
  onPeek
}) => {
  const unreadTotal = feeds.reduce((acc, f) => acc + (f.unreadCount || 0), 0);
  const [feedsOpen, setFeedsOpen] = useState(false);
  const [dragFeedId, setDragFeedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | 'root' | null>(null);
  const [dragFolderId, setDragFolderId] = useState<string | null>(null);
  const [folderDropTarget, setFolderDropTarget] = useState<string | 'root' | null>(null);
  const [feedDropTargetId, setFeedDropTargetId] = useState<number | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const showFeedList = !collapsed || feedsOpen;
  const closeFlyout = () => setFeedsOpen(false);

  const sortFeeds = (list: FeedWithUnread[]) =>
    [...list].sort((a, b) => (a.position || 0) - (b.position || 0) || a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  const uncategorizedFeeds = feeds.filter((f) => !f.folderId);
  const folderNodes = [...folders]
    .sort((a, b) => (a.position || 0) - (b.position || 0) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .map((folder) => ({
      type: 'folder' as const,
      name: folder.name,
      folder,
      feeds: feeds.filter((f) => f.folderId === folder.id)
    }));
  const feedNodes = sortFeeds(uncategorizedFeeds).map((feed) => ({ type: 'feed' as const, name: feed.title, feed }));
  const rootNodes = [...folderNodes, ...feedNodes];

  const allowDrop = (e: React.DragEvent) => {
    if (dragFeedId !== null || dragFolderId !== null) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const feedFavicon = (url: string) => {
    try {
      const host = new URL(url).hostname;
      if (!host) return null;
      return `https://icons.duckduckgo.com/ip3/${host}.ico`;
    } catch {
      return null;
    }
  };

  const handleFeedDropToFolder = (folderId: string | null) => {
    if (dragFeedId === null) return;
    const list = sortFeeds(feeds.filter((f) => (f.folderId ?? null) === folderId)).map((f) => f.id).filter((id) => id !== dragFeedId);
    const next = [...list, dragFeedId];
    onReorderFeeds(folderId, next);
    setDropTarget(null);
    setDragFeedId(null);
    setFeedDropTargetId(null);
  };

  const handleFeedDropOnFeed = (targetFeedId: number) => {
    if (dragFeedId === null || dragFeedId === targetFeedId) return;
    const targetFeed = feeds.find((f) => f.id === targetFeedId);
    if (!targetFeed) return;
    const targetFolder = targetFeed.folderId ?? null;
    const ordered = sortFeeds(feeds.filter((f) => (f.folderId ?? null) === targetFolder)).map((f) => f.id).filter((id) => id !== dragFeedId);
    const insertIndex = ordered.indexOf(targetFeedId);
    if (insertIndex === -1) return;
    const next = [...ordered.slice(0, insertIndex), dragFeedId, ...ordered.slice(insertIndex)];
    onReorderFeeds(targetFolder, next);
    setDropTarget(null);
    setDragFeedId(null);
    setFeedDropTargetId(null);
  };

  const handleFolderDrop = (targetId: string | null) => {
    if (!dragFolderId) return;
    const ids = folderNodes.map((n) => n.folder.id);
    const filtered = ids.filter((id) => id !== dragFolderId);
    const insertIndex = targetId ? filtered.indexOf(targetId) : filtered.length;
    if (insertIndex === -1) {
      setFolderDropTarget(null);
      setDragFolderId(null);
      return;
    }
    const next = [...filtered.slice(0, insertIndex), dragFolderId, ...filtered.slice(insertIndex)];
    onReorderFolders(next);
    setFolderDropTarget(null);
    setDragFolderId(null);
  };

  return (
    <aside
      className={clsx('sidebar', collapsed && 'collapsed', !pinned && 'unpinned', peek && 'peek')}
      onMouseEnter={() => { if (!pinned) onPeek(); }}
      onMouseLeave={() => { if (!pinned) onClosePeek(); }}
    >
      <header>
        {!collapsed && <span>Feeds</span>}
        <div className="sidebar-actions">
          <button
            className="btn-ghost icon-btn"
            onClick={onOpenCreateFolder}
            aria-label="Add folder"
            title="Add folder"
          >
            <span className="material-icons">create_new_folder</span>
          </button>
        </div>
      </header>

      {!collapsed && (
        <>
          <div className="feed-list">
            <div
              className={clsx('feed-row', 'tree-feed', 'tree-news', selectedFeedId === null && selectedFolderId === null && !savedView && 'active', (dropTarget === 'root' || folderDropTarget === 'root') && 'drop-target')}
              onClick={() => { onSelectFeed(null); onSelectFolder(null); setDropTarget(null); setFolderDropTarget(null); setFeedDropTargetId(null); setDragFeedId(null); setDragFolderId(null); setFeedsOpen(false); }}
              onDragOver={allowDrop}
              onDragEnter={() => {
                if (dragFeedId !== null) setDropTarget('root');
                if (dragFolderId !== null) setFolderDropTarget('root');
              }}
              onDragLeave={() => { setDropTarget(null); setFolderDropTarget(null); setFeedDropTargetId(null); }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFeedId !== null) handleFeedDropToFolder(null);
                if (dragFolderId !== null) handleFolderDrop(null);
              }}
            >
              <div className="title">Newsfeed</div>
              <span className="badge">{unreadTotal}</span>
            </div>
            <div
              className={clsx('feed-row', 'tree-feed', 'tree-saved', savedView && 'active')}
              onClick={() => { onSelectSaved(); setDropTarget(null); setFolderDropTarget(null); setFeedDropTargetId(null); setDragFeedId(null); setDragFolderId(null); setFeedsOpen(false); }}
            >
              <div className="title">
                <span className="material-icons tree-icon">bookmark</span>
                Read Later
              </div>
              <span className="badge">{savedCount}</span>
            </div>
            <div className="tree-divider" />

            <div className="feed-tree">
              {rootNodes.map((node) => {
                if (node.type === 'folder') {
                  const { folder, feeds: folderFeeds } = node;
                  return (
                    <div key={folder.id} className="tree-group">
                      <div
                        className={clsx(
                          'feed-row',
                          'tree-folder',
                          selectedFolderId === folder.id && !selectedFeedId && 'active',
                          (dropTarget === folder.id || folderDropTarget === folder.id) && 'drop-target',
                          dragFolderId === folder.id && 'dragging'
                        )}
                        onClick={() => onSelectFolder(folder.id)}
                        onDragOver={allowDrop}
                        onDragEnter={() => {
                          if (dragFeedId !== null) setDropTarget(folder.id);
                          if (dragFolderId !== null && dragFolderId !== folder.id) setFolderDropTarget(folder.id);
                        }}
                        onDragLeave={() => { setDropTarget(null); setFolderDropTarget(null); setFeedDropTargetId(null); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragFeedId !== null) handleFeedDropToFolder(folder.id);
                          else if (dragFolderId !== null && dragFolderId !== folder.id) handleFolderDrop(folder.id);
                        }}
                        draggable
                        onDragStart={(e) => { setDragFolderId(folder.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', folder.id); }}
                        onDragEnd={() => { setDragFolderId(null); setFolderDropTarget(null); }}
                      >
                        <div className="title">
                          <button
                            className="btn-ghost icon-btn"
                            style={{ padding: 4, width: 28, height: 28, marginRight: 6 }}
                            aria-label={collapsedFolders.has(folder.id) ? 'Expand folder' : 'Collapse folder'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollapsedFolders((prev) => {
                                const next = new Set(prev);
                                if (next.has(folder.id)) next.delete(folder.id);
                                else next.add(folder.id);
                                return next;
                              });
                            }}
                          >
                            <span className="material-icons" style={{ fontSize: 16 }}>{collapsedFolders.has(folder.id) ? 'chevron_right' : 'expand_more'}</span>
                          </button>
                          <span className="material-icons tree-icon">folder</span>
                          {folder.name}
                        </div>
                        <span className="badge">{folder.unreadCount}</span>
                      </div>
                      {!collapsedFolders.has(folder.id) && (
                        <div className="tree-children">
                          {sortFeeds(folderFeeds).map((feed) => (
                            <div
                              key={feed.id}
                              className={clsx(
                                'feed-row',
                                'tree-feed',
                                selectedFeedId === feed.id && 'active',
                                dragFeedId === feed.id && 'dragging',
                                feedDropTargetId === feed.id && 'drop-target'
                              )}
                              onClick={() => { onSelectFeed(feed.id); setFeedsOpen(false); }}
                              draggable
                              onDragStart={(e) => { setDragFeedId(feed.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `${feed.id}`); }}
                              onDragEnd={() => { setDragFeedId(null); setDropTarget(null); setFeedDropTargetId(null); }}
                              onDragOver={allowDrop}
                              onDragEnter={() => {
                                if (dragFeedId !== null) setFeedDropTargetId(feed.id);
                              }}
                              onDragLeave={() => setFeedDropTargetId(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragFeedId !== null) handleFeedDropOnFeed(feed.id);
                              }}
                            >
                              <div className="title">
                                {feedFavicon(feed.url) ? (
                                  <img src={feedFavicon(feed.url)!} alt="" className="feed-favicon" />
                                ) : (
                                  <span className="material-icons tree-icon">rss_feed</span>
                                )}
                                {feed.title}
                              </div>
                              <span className="badge">{feed.unreadCount}</span>
                              <div className="actions" onClick={(e) => e.stopPropagation()} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                const { feed } = node;
                return (
                  <div
                    key={feed.id}
                    className={clsx('feed-row', 'tree-feed', selectedFeedId === feed.id && 'active', dragFeedId === feed.id && 'dragging', dropTarget === 'root' && 'drop-target-root', feedDropTargetId === feed.id && 'drop-target')}
                    onClick={() => { onSelectFeed(feed.id); setFeedsOpen(false); }}
                    draggable
                    onDragStart={(e) => { setDragFeedId(feed.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `${feed.id}`); }}
                    onDragEnd={() => { setDragFeedId(null); setDropTarget(null); setFeedDropTargetId(null); }}
                    onDragOver={allowDrop}
                    onDragEnter={() => {
                      if (dragFeedId !== null) {
                        setDropTarget('root');
                        setFeedDropTargetId(feed.id);
                      }
                    }}
                    onDragLeave={() => { setDropTarget(null); setFeedDropTargetId(null); }}
                    onDrop={(e) => { e.preventDefault(); if (dragFeedId !== null) handleFeedDropOnFeed(feed.id); }}
                  >
                    <div className="title">
                      {feedFavicon(feed.url) ? (
                        <img src={feedFavicon(feed.url)!} alt="" className="feed-favicon" />
                      ) : (
                        <span className="material-icons tree-icon">rss_feed</span>
                      )}
                      {feed.title}
                    </div>
                    <span className="badge">{feed.unreadCount}</span>
                    <div className="actions" onClick={(e) => e.stopPropagation()} />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {collapsed && (
        <>
          <div
            className={clsx('feed-row', selectedFeedId === null && selectedFolderId === null && 'active', 'collapsed-trigger')}
            onClick={() => {
              onSelectFeed(null);
              onSelectFolder(null);
              setFeedsOpen((prev) => !prev);
            }}
            title="Newsfeed"
          >
            <span className="material-icons">rss_feed</span>
          </div>
          {showFeedList && (
            <div className={clsx('feed-list', 'collapsed-flyout')}>
              <div className="feed-row" onClick={() => { onSelectFeed(null); onSelectFolder(null); closeFlyout(); }}>
                <div className="title">Newsfeed</div>
                <span className="badge">{unreadTotal}</span>
                <div className="meta">All sources</div>
              </div>
                <div
                  className={clsx('feed-row', 'tree-feed', 'tree-saved', savedView && 'active')}
                  onClick={() => { onSelectSaved(); closeFlyout(); }}
                >
                  <div className="title">
                    <span className="material-icons tree-icon">bookmark</span>
                    Read Later
                  </div>
                  <span className="badge">{savedCount}</span>
                </div>

                <div className="feed-tree">
                  {rootNodes.map((node) => {
                    if (node.type === 'folder') {
                      const { folder, feeds: folderFeeds } = node;
                      return (
                        <div key={folder.id} className="tree-group">
                          <div
                            className={clsx('feed-row', 'tree-folder', selectedFolderId === folder.id && !selectedFeedId && 'active', dropTarget === folder.id && 'drop-target')}
                            onClick={() => { onSelectFolder(folder.id); closeFlyout(); }}
                            onDragOver={allowDrop}
                            onDragEnter={() => dragFeedId !== null && setDropTarget(folder.id)}
                            onDragLeave={() => { setDropTarget(null); setFeedDropTargetId(null); }}
                            onDrop={(e) => { e.preventDefault(); handleFeedDropToFolder(folder.id); }}
                          >
                            <div className="title">
                              <span className="material-icons tree-icon">folder</span>
                              {folder.name}
                            </div>
                            <span className="badge">{folder.unreadCount}</span>
                          </div>
                          <div className="tree-children">
                            {folderFeeds.map((feed) => (
                              <div
                                key={feed.id}
                                className={clsx('feed-row', 'tree-feed', selectedFeedId === feed.id && 'active', dragFeedId === feed.id && 'dragging')}
                                onClick={() => { onSelectFeed(feed.id); closeFlyout(); }}
                                draggable
                                onDragStart={(e) => { setDragFeedId(feed.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `${feed.id}`); }}
                                onDragEnd={() => { setDragFeedId(null); setDropTarget(null); setFeedDropTargetId(null); }}
                                onDragOver={allowDrop}
                                onDragEnter={() => { if (dragFeedId !== null) setFeedDropTargetId(feed.id); }}
                                onDragLeave={() => setFeedDropTargetId(null)}
                                onDrop={(e) => { e.preventDefault(); if (dragFeedId !== null) handleFeedDropOnFeed(feed.id); }}
                              >
                                <div className="title">
                                  {feedFavicon(feed.url) ? (
                                    <img src={feedFavicon(feed.url)!} alt="" className="feed-favicon" />
                                  ) : (
                                    <span className="material-icons tree-icon">rss_feed</span>
                                  )}
                                  {feed.title}
                                </div>
                                <span className="badge">{feed.unreadCount}</span>
                                <div className="actions" onClick={(e) => e.stopPropagation()} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    const { feed } = node;
                    return (
                      <div
                        key={feed.id}
                        className={clsx('feed-row', 'tree-feed', selectedFeedId === feed.id && 'active', dragFeedId === feed.id && 'dragging', dropTarget === 'root' && 'drop-target-root', feedDropTargetId === feed.id && 'drop-target')}
                        onClick={() => { onSelectFeed(feed.id); closeFlyout(); }}
                        draggable
                                onDragStart={(e) => { setDragFeedId(feed.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `${feed.id}`); }}
                        onDragEnd={() => { setDragFeedId(null); setDropTarget(null); setFeedDropTargetId(null); }}
                        onDragOver={allowDrop}
                        onDragEnter={() => { if (dragFeedId !== null) { setDropTarget('root'); setFeedDropTargetId(feed.id); } }}
                        onDragLeave={() => { setDropTarget(null); setFeedDropTargetId(null); }}
                        onDrop={(e) => { e.preventDefault(); if (dragFeedId !== null) handleFeedDropOnFeed(feed.id); }}
                      >
                        <div className="title">
                          {feedFavicon(feed.url) ? (
                            <img src={feedFavicon(feed.url)!} alt="" className="feed-favicon" />
                          ) : (
                            <span className="material-icons tree-icon">rss_feed</span>
                          )}
                          {feed.title}
                        </div>
                        <span className="badge">{feed.unreadCount}</span>
                        <div className="actions" onClick={(e) => e.stopPropagation()} />
                      </div>
                    );
                  })}
                </div>
            </div>
          )}
        </>
      )}
    </aside>
  );
};
