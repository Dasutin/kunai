import React from 'react';
import { Avatar, Box, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import PushPinIcon from '@mui/icons-material/PushPin';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import SettingsIcon from '@mui/icons-material/Settings';
import { kunaiLayout } from '../theme';
import type { UserProfile } from '@shared/types';

interface MiniSidebarProps {
  onSelectHome: () => void;
  onSelectSaved: () => void;
  onSettings: () => void;
  onAccount: () => void;
  user: UserProfile;
  onAddFeed: () => void;
  isMobile: boolean;
  onToggleContext: () => void;
  sidebarPinned: boolean;
  onTogglePin: () => void;
  onTogglePeek: () => void;
  onPeekStart: () => void;
  onPeekEnd: () => void;
}

const RailButton: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({ title, onClick, children }) => (
  <Tooltip title={title} placement="right">
    <IconButton
      aria-label={title}
      onClick={onClick}
      sx={{
        width: 42,
        height: 42,
        borderRadius: 1,
        color: 'var(--muted)',
        bgcolor: 'transparent',
        border: 'none',
        '& .MuiSvgIcon-root': {
          fontSize: 28
        },
        '&:hover': {
          bgcolor: 'transparent',
          color: 'var(--text)'
        }
      }}
    >
      {children}
    </IconButton>
  </Tooltip>
);

export const MiniSidebar: React.FC<MiniSidebarProps> = ({
  onSelectHome,
  onSelectSaved,
  onSettings,
  onAccount,
  user,
  onAddFeed,
  isMobile,
  onToggleContext,
  sidebarPinned,
  onTogglePin,
  onTogglePeek,
  onPeekStart,
  onPeekEnd
}) => {
  return (
    <Box
      component="aside"
      onMouseEnter={() => {
        if (!sidebarPinned && !isMobile) onPeekStart();
      }}
      onMouseLeave={() => {
        if (!sidebarPinned && !isMobile) onPeekEnd();
      }}
      sx={{
        width: kunaiLayout.miniSidebarWidth,
        height: '100vh',
        position: { xs: 'fixed', md: 'sticky' },
        top: 0,
        left: 0,
        zIndex: { xs: 30, md: sidebarPinned ? 12 : 26 },
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        px: 1,
        py: 1.5,
        bgcolor: '#000000',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid var(--card-border)',
        ':root[data-theme="dark"] &': {
          bgcolor: '#000000'
        },
        ':root[data-theme="light"] &': {
          bgcolor: '#000000'
        }
      }}
    >
      <RailButton
        title="Newsfeed"
        onClick={() => {
          onSelectHome();
          if (!sidebarPinned && !isMobile) onTogglePeek();
          if (isMobile) onToggleContext();
        }}
      >
        <RssFeedIcon fontSize="small" />
      </RailButton>
      <RailButton
        title="Saved"
        onClick={() => {
          onSelectSaved();
          if (!sidebarPinned && !isMobile) onTogglePeek();
          if (isMobile) onToggleContext();
        }}
      >
        <BookmarkIcon fontSize="small" />
      </RailButton>
      <RailButton title="Add feed" onClick={onAddFeed}>
        <AddIcon />
      </RailButton>
      {isMobile && (
        <RailButton title="Open menu" onClick={onToggleContext}>
          <MenuOpenIcon />
        </RailButton>
      )}
      <Box sx={{ flex: 1 }} />
      <RailButton title="Preferences" onClick={onSettings}>
        <SettingsIcon />
      </RailButton>
      <RailButton title="Account" onClick={onAccount}>
        <Avatar src={user.profileImage || undefined} alt={user.name} sx={{ width: 28, height: 28, fontSize: 12, fontWeight: 800, bgcolor: '#0f766e' }}>
          {user.name
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()}
        </Avatar>
      </RailButton>
      <RailButton title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'} onClick={onTogglePin}>
        <PushPinIcon />
      </RailButton>
    </Box>
  );
};
