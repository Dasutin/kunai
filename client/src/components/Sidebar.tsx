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

  const showFeedList = !collapsed || feedsOpen;
  const closeFlyout = () => setFeedsOpen(false);

  const uncategorizedFeeds = feeds.filter((f) => !f.folderId);
  const folderNodes = folders.map((folder) => ({
    type: 'folder' as const,
    name: folder.name,
    folder,
    feeds: feeds.filter((f) => f.folderId === folder.id)
  }));
  const feedNodes = uncategorizedFeeds.map((feed) => ({ type: 'feed' as const, name: feed.title, feed }));
  const rootNodes = [...folderNodes, ...feedNodes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const allowDrop = (e: React.DragEvent) => {
    if (dragFeedId !== null) {
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

  const handleDrop = (folderId: string | null) => {
    if (dragFeedId === null) return;
    const feed = feeds.find((f) => f.id === dragFeedId);
    if (!feed) return;
    if (feed.folderId === folderId) {
      setDropTarget(null);
      setDragFeedId(null);
      return;
    }
    onMoveFeed(dragFeedId, folderId);
    setDropTarget(null);
    setDragFeedId(null);
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
              className={clsx('feed-row', 'tree-feed', 'tree-news', selectedFeedId === null && selectedFolderId === null && 'active', dropTarget === 'root' && 'drop-target')}
              onClick={() => { onSelectFeed(null); onSelectFolder(null); setFeedsOpen(false); }}
              onDragOver={allowDrop}
              onDragEnter={() => dragFeedId !== null && setDropTarget('root')}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => { e.preventDefault(); handleDrop(null); }}
            >
              <div className="title">Newsfeed</div>
              <span className="badge">{unreadTotal}</span>
            </div>
            <div
              className={clsx('feed-row', 'tree-feed', 'tree-saved', savedView && 'active')}
              onClick={() => { onSelectSaved(); setFeedsOpen(false); }}
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
                        className={clsx('feed-row', 'tree-folder', selectedFolderId === folder.id && !selectedFeedId && 'active', dropTarget === folder.id && 'drop-target')}
                        onClick={() => onSelectFolder(folder.id)}
                        onDragOver={allowDrop}
                        onDragEnter={() => dragFeedId !== null && setDropTarget(folder.id)}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={(e) => { e.preventDefault(); handleDrop(folder.id); }}
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
                            onClick={() => { onSelectFeed(feed.id); setFeedsOpen(false); }}
                            draggable
                            onDragStart={(e) => { setDragFeedId(feed.id); e.dataTransfer.effectAllowed = 'move'; }}
                            onDragEnd={() => { setDragFeedId(null); setDropTarget(null); }}
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
                    className={clsx('feed-row', 'tree-feed', selectedFeedId === feed.id && 'active', dragFeedId === feed.id && 'dragging', dropTarget === 'root' && 'drop-target-root')}
                    onClick={() => { onSelectFeed(feed.id); setFeedsOpen(false); }}
                    draggable
                    onDragStart={(e) => { setDragFeedId(feed.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setDragFeedId(null); setDropTarget(null); }}
                    onDragOver={allowDrop}
                    onDragEnter={() => dragFeedId !== null && setDropTarget('root')}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(e) => { e.preventDefault(); handleDrop(null); }}
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
                            onDragLeave={() => setDropTarget(null)}
                            onDrop={(e) => { e.preventDefault(); handleDrop(folder.id); }}
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
                                onDragStart={(e) => { setDragFeedId(feed.id); e.dataTransfer.effectAllowed = 'move'; }}
                                onDragEnd={() => { setDragFeedId(null); setDropTarget(null); }}
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
                        className={clsx('feed-row', 'tree-feed', selectedFeedId === feed.id && 'active', dragFeedId === feed.id && 'dragging', dropTarget === 'root' && 'drop-target-root')}
                        onClick={() => { onSelectFeed(feed.id); closeFlyout(); }}
                        draggable
                        onDragStart={(e) => { setDragFeedId(feed.id); e.dataTransfer.effectAllowed = 'move'; }}
                        onDragEnd={() => { setDragFeedId(null); setDropTarget(null); }}
                        onDragOver={allowDrop}
                        onDragEnter={() => dragFeedId !== null && setDropTarget('root')}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={(e) => { e.preventDefault(); handleDrop(null); }}
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
