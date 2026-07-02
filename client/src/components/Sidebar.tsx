import React, { useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import SettingsIcon from '@mui/icons-material/Settings';
import { FeedWithUnread, Folder } from '@shared/types';
import { kunaiLayout } from '../theme';

type Props = {
  feeds: FeedWithUnread[];
  folders: Array<Folder & { unreadCount: number }>;
  selectedFeedId: number | null;
  selectedFolderId: string | null;
  onSelectFeed: (id: number | null) => void;
  onSelectFolder: (id: string | null) => void;
  onOpenCreateFolder: () => void;
  onOpenSettings: () => void;
  onMoveFeed: (feedId: number, folderId: string | null) => void;
  onReorderFolders: (orderedIds: string[]) => void;
  onReorderFeeds: (folderId: string | null, orderedIds: number[]) => void;
  onDeleteFolder: (folderId: string) => void;
  onSelectSaved: () => void;
  savedCount: number;
  savedView: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  pinned: boolean;
  peek: boolean;
  onClosePeek: () => void;
  onPeek: () => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
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

const countBadge = (count: number) => (
  <Badge
    badgeContent={count}
    max={999}
    sx={{
      '& .MuiBadge-badge': {
        position: 'static',
        transform: 'none',
        minWidth: 'auto',
        height: 'auto',
        borderRadius: 0,
        bgcolor: 'transparent',
        color: 'var(--muted)',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1
      }
    }}
  />
);

const rowSx = (active?: boolean, dropTarget?: boolean, dragging?: boolean, variant?: 'news' | 'saved' | 'folder', depth = 0) => ({
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 0.5,
  minHeight: 30,
  px: 0.75,
  py: 0.35,
  pl: 0.75 + depth * 1.5,
  borderRadius: '10px',
  border: '1px solid',
  borderColor: dropTarget ? 'var(--accent)' : active ? 'rgba(56, 189, 248, 0.5)' : 'transparent',
  bgcolor:
    active
      ? 'rgba(56, 189, 248, 0.12)'
      : dropTarget
        ? 'rgba(56, 189, 248, 0.08)'
        : variant === 'news'
          ? 'rgba(56, 189, 248, 0.04)'
          : variant === 'saved'
            ? 'rgba(167, 139, 250, 0.05)'
            : 'transparent',
  color: 'var(--text)',
  opacity: dragging ? 0.55 : 1,
  outline: dropTarget ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
  cursor: 'pointer',
  transition: 'border-color 0.15s ease, background-color 0.15s ease, opacity 0.15s ease',
  '&:hover': {
    bgcolor: active ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 255, 255, 0.05)'
  },
  ...(depth > 0
    ? {
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 8 + (depth - 1) * 12,
          top: -2,
          bottom: -2,
          borderLeft: '1px solid var(--card-border)'
        }
      }
    : {})
});

export const Sidebar: React.FC<Props> = ({
  feeds,
  folders,
  selectedFeedId,
  selectedFolderId,
  onSelectFeed,
  onSelectFolder,
  onOpenCreateFolder,
  onOpenSettings,
  onReorderFolders,
  onReorderFeeds = () => {},
  onDeleteFolder,
  onSelectSaved,
  savedCount,
  savedView,
  pinned,
  peek,
  onClosePeek,
  onPeek,
  isMobile = false,
  mobileOpen = false
}) => {
  const unreadTotal = feeds.reduce((acc, f) => acc + (f.unreadCount || 0), 0);
  const [dragFeedId, setDragFeedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | 'root' | null>(null);
  const [dragFolderId, setDragFolderId] = useState<string | null>(null);
  const [folderDropTarget, setFolderDropTarget] = useState<string | 'root' | null>(null);
  const [feedDropTargetId, setFeedDropTargetId] = useState<number | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

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

  const resetDrag = () => {
    setDropTarget(null);
    setFolderDropTarget(null);
    setFeedDropTargetId(null);
    setDragFeedId(null);
    setDragFolderId(null);
  };

  const allowDrop = (e: React.DragEvent) => {
    if (dragFeedId !== null || dragFolderId !== null) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleFeedDropToFolder = (folderId: string | null) => {
    if (dragFeedId === null) return;
    const list = sortFeeds(feeds.filter((f) => (f.folderId ?? null) === folderId)).map((f) => f.id).filter((id) => id !== dragFeedId);
    onReorderFeeds(folderId, [...list, dragFeedId]);
    resetDrag();
  };

  const handleFeedDropOnFeed = (targetFeedId: number) => {
    if (dragFeedId === null || dragFeedId === targetFeedId) return;
    const targetFeed = feeds.find((f) => f.id === targetFeedId);
    if (!targetFeed) return;
    const targetFolder = targetFeed.folderId ?? null;
    const ordered = sortFeeds(feeds.filter((f) => (f.folderId ?? null) === targetFolder)).map((f) => f.id).filter((id) => id !== dragFeedId);
    const insertIndex = ordered.indexOf(targetFeedId);
    if (insertIndex === -1) return;
    onReorderFeeds(targetFolder, [...ordered.slice(0, insertIndex), dragFeedId, ...ordered.slice(insertIndex)]);
    resetDrag();
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
    onReorderFolders([...filtered.slice(0, insertIndex), dragFolderId, ...filtered.slice(insertIndex)]);
    resetDrag();
  };

  const titleWithIcon = (icon: React.ReactNode, label: string) => (
    <Stack direction="row" alignItems="center" spacing={1} minWidth={0}>
      {icon}
      <Typography variant="body2" fontWeight={700} noWrap>
        {label}
      </Typography>
    </Stack>
  );

  const feedIcon = (feed: FeedWithUnread) => {
    const favicon = feedFavicon(feed.url);
    if (favicon) {
      return <Avatar src={favicon} alt="" variant="rounded" sx={{ width: 18, height: 18, bgcolor: 'rgba(255, 255, 255, 0.08)' }} />;
    }
    return <RssFeedIcon sx={{ fontSize: 18, color: 'var(--muted)' }} />;
  };

  return (
    <Box
      component="aside"
      onMouseEnter={() => {
        if (!pinned) onPeek();
      }}
      onMouseLeave={() => {
        if (!pinned) onClosePeek();
      }}
      sx={{
        width: kunaiLayout.sidebarWidth,
        height: '100vh',
        position: { xs: 'fixed', md: pinned ? 'sticky' : 'fixed' },
        top: 0,
        left: { xs: 0, md: pinned ? 'auto' : kunaiLayout.miniSidebarWidth },
        zIndex: { xs: 25, md: pinned ? 10 : 24 },
        transform: {
          xs: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          md: pinned || peek ? 'translateX(0)' : 'translateX(-100%)'
        },
        transition: 'transform 0.2s ease',
        alignSelf: 'flex-start',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        px: 1.5,
        pb: 1.5,
        pt: 0,
        bgcolor: 'var(--surface-raised)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid var(--card-border)',
        ':root[data-theme="dark"] &': {
          bgcolor: 'var(--surface-raised)'
        },
        ':root[data-theme="light"] &': {
          bgcolor: 'var(--surface-raised)'
        }
      }}
    >
      <Box
        component="header"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          columnGap: 1,
          width: '100%',
          minHeight: 48
        }}
      >
        <Typography fontWeight={800} sx={{ lineHeight: 1.2 }}>
          Feeds
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ justifySelf: 'end' }}>
          {isMobile && (
            <Tooltip title="Settings">
              <IconButton aria-label="Settings" size="small" onClick={onOpenSettings}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Add folder">
            <IconButton aria-label="Add folder" size="small" onClick={onOpenCreateFolder}>
              <CreateNewFolderIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <List role="tree" aria-label="Primary feeds" disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <ListItemButton
          component="div"
          role="treeitem"
          aria-level={1}
          aria-selected={selectedFeedId === null && selectedFolderId === null && !savedView}
          sx={rowSx(selectedFeedId === null && selectedFolderId === null && !savedView, dropTarget === 'root' || folderDropTarget === 'root', false, 'news')}
          onClick={() => {
            onSelectFeed(null);
            onSelectFolder(null);
            resetDrag();
          }}
          onDragOver={allowDrop}
          onDragEnter={() => {
            if (dragFeedId !== null) setDropTarget('root');
            if (dragFolderId !== null) setFolderDropTarget('root');
          }}
          onDragLeave={() => {
            setDropTarget(null);
            setFolderDropTarget(null);
            setFeedDropTargetId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragFeedId !== null) handleFeedDropToFolder(null);
            if (dragFolderId !== null) handleFolderDrop(null);
          }}
        >
          {titleWithIcon(<RssFeedIcon sx={{ fontSize: 18 }} />, 'Newsfeed')}
          {countBadge(unreadTotal)}
        </ListItemButton>

        <ListItemButton
          component="div"
          role="treeitem"
          aria-level={1}
          aria-selected={savedView}
          sx={rowSx(savedView, false, false, 'saved')}
          onClick={() => {
            onSelectSaved();
            resetDrag();
          }}
        >
          {titleWithIcon(<BookmarkIcon sx={{ fontSize: 18 }} />, 'Read Later')}
          {countBadge(savedCount)}
        </ListItemButton>
      </List>

      <Divider sx={{ borderColor: 'var(--card-border)' }} />

      <List role="tree" aria-label="Feeds and folders" disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {rootNodes.map((node) => {
          if (node.type === 'folder') {
            const { folder, feeds: folderFeeds } = node;
            const folderCollapsed = collapsedFolders.has(folder.id);
            return (
              <Box key={folder.id} role="none" sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <ListItemButton
                  component="div"
                  role="treeitem"
                  aria-level={1}
                  aria-expanded={!folderCollapsed}
                  aria-selected={selectedFolderId === folder.id && !selectedFeedId}
                  draggable
                  sx={rowSx(
                    selectedFolderId === folder.id && !selectedFeedId,
                    dropTarget === folder.id || folderDropTarget === folder.id,
                    dragFolderId === folder.id,
                    'folder'
                  )}
                  onClick={() => onSelectFolder(folder.id)}
                  onDragOver={allowDrop}
                  onDragEnter={() => {
                    if (dragFeedId !== null) setDropTarget(folder.id);
                    if (dragFolderId !== null && dragFolderId !== folder.id) setFolderDropTarget(folder.id);
                  }}
                  onDragLeave={() => {
                    setDropTarget(null);
                    setFolderDropTarget(null);
                    setFeedDropTargetId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFeedId !== null) handleFeedDropToFolder(folder.id);
                    else if (dragFolderId !== null && dragFolderId !== folder.id) handleFolderDrop(folder.id);
                  }}
                  onDragStart={(e) => {
                    setDragFolderId(folder.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', folder.id);
                  }}
                  onDragEnd={resetDrag}
                >
                  <Stack direction="row" alignItems="center" spacing={0.5} minWidth={0}>
                    <Tooltip title={folderCollapsed ? 'Expand folder' : 'Collapse folder'}>
                      <IconButton
                        size="small"
                        aria-label={folderCollapsed ? 'Expand folder' : 'Collapse folder'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollapsedFolders((prev) => {
                            const next = new Set(prev);
                            if (next.has(folder.id)) next.delete(folder.id);
                            else next.add(folder.id);
                            return next;
                          });
                        }}
                        sx={{ width: 26, height: 26, flex: '0 0 auto' }}
                      >
                        {folderCollapsed ? <ChevronRightIcon sx={{ fontSize: 17 }} /> : <ExpandMoreIcon sx={{ fontSize: 17 }} />}
                      </IconButton>
                    </Tooltip>
                    <FolderIcon sx={{ fontSize: 18, color: 'var(--muted)', flex: '0 0 auto' }} />
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {folder.name}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.25}>
                    {countBadge(folder.unreadCount)}
                    <Tooltip title="Delete folder">
                      <IconButton
                        aria-label={`Delete folder ${folder.name}`}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolder(folder.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        sx={{
                          color: 'var(--danger)',
                          width: 28,
                          height: 28
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </ListItemButton>
                <Collapse in={!folderCollapsed} timeout="auto" unmountOnExit>
                  <List role="group" disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {sortFeeds(folderFeeds).map((feed) => (
                      <ListItemButton
                        key={feed.id}
                        component="div"
                        role="treeitem"
                        aria-level={2}
                        aria-selected={selectedFeedId === feed.id}
                        draggable
                        sx={rowSx(selectedFeedId === feed.id, feedDropTargetId === feed.id, dragFeedId === feed.id, undefined, 1)}
                        onClick={() => onSelectFeed(feed.id)}
                        onDragStart={(e) => {
                          setDragFeedId(feed.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', `${feed.id}`);
                        }}
                        onDragEnd={resetDrag}
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
                        {titleWithIcon(feedIcon(feed), feed.title)}
                        {countBadge(feed.unreadCount)}
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </Box>
            );
          }

          const { feed } = node;
          return (
            <ListItemButton
              key={feed.id}
              component="div"
              role="treeitem"
              aria-level={1}
              aria-selected={selectedFeedId === feed.id}
              draggable
              sx={rowSx(selectedFeedId === feed.id, dropTarget === 'root' || feedDropTargetId === feed.id, dragFeedId === feed.id)}
              onClick={() => onSelectFeed(feed.id)}
              onDragStart={(e) => {
                setDragFeedId(feed.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', `${feed.id}`);
              }}
              onDragEnd={resetDrag}
              onDragOver={allowDrop}
              onDragEnter={() => {
                if (dragFeedId !== null) {
                  setDropTarget('root');
                  setFeedDropTargetId(feed.id);
                }
              }}
              onDragLeave={() => {
                setDropTarget(null);
                setFeedDropTargetId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFeedId !== null) handleFeedDropOnFeed(feed.id);
              }}
            >
              {titleWithIcon(feedIcon(feed), feed.title)}
              {countBadge(feed.unreadCount)}
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
};
