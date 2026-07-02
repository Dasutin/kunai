import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Paper,
  Radio,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuIcon from '@mui/icons-material/Menu';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';

type ViewMode = 'list' | 'card' | 'magazine';
type SortMode = 'newest' | 'oldest';

type Props = {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  sort: SortMode;
  onSortChange: (mode: SortMode) => void;
  unreadOnly: boolean;
  unreadCount: number;
  onUnreadChange: (val: boolean) => void;
  search: string;
  onSearch: (val: string) => void;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  onMarkOlderRead: (days: number) => void;
  scopeLabel: string;
  condensed: boolean;
  isMobile: boolean;
  onToggleSidebar: () => void;
  isSettings: boolean;
  onBackFromSettings?: () => void;
};

const viewIcon = (mode: ViewMode) => {
  if (mode === 'card') return <ViewModuleIcon />;
  if (mode === 'magazine') return <ViewQuiltIcon />;
  return <ViewListIcon />;
};

const markReadAgeOptions = [
  { label: 'Older than a day', days: 1 },
  { label: 'Older than two days', days: 2 },
  { label: 'Older than three days', days: 3 },
  { label: 'Older than a week', days: 7 },
  { label: 'Older than two weeks', days: 14 }
];

export const HeaderBar: React.FC<Props> = ({
  viewMode,
  onViewChange,
  sort,
  onSortChange,
  unreadOnly,
  unreadCount,
  onUnreadChange,
  search,
  onSearch,
  onRefresh,
  onMarkAllRead,
  onMarkOlderRead,
  scopeLabel,
  condensed,
  isMobile,
  onToggleSidebar,
  isSettings,
  onBackFromSettings
}) => {
  const [markAnchor, setMarkAnchor] = useState<HTMLElement | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  const selectUnread = (val: boolean) => {
    onUnreadChange(val);
  };

  const selectView = (mode: ViewMode) => {
    onViewChange(mode);
    setMoreAnchor(null);
  };

  const selectSort = (mode: SortMode) => {
    onSortChange(mode);
    setMoreAnchor(null);
  };

  const markOlder = (days: number) => {
    onMarkOlderRead(days);
    setMarkAnchor(null);
  };

  if (isSettings) {
    return (
      <Paper
        component="header"
        sx={{
          p: condensed ? 1.5 : 2,
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'var(--bg)',
          backgroundImage: 'linear-gradient(120deg, rgba(56, 189, 248, 0.08), rgba(167, 139, 250, 0.08))',
          boxShadow: 'var(--shadow)'
        }}
      >
        <Stack direction="row" alignItems="center" gap={2} sx={{ width: '100%' }}>
          <Box minWidth={0}>
            <Typography variant="h5" fontWeight={800}>
              Settings
            </Typography>
            <Typography variant="body2" color="var(--muted)">
              Manage preferences and imports
            </Typography>
          </Box>
          <Button variant="text" startIcon={<ArrowBackIcon />} onClick={onBackFromSettings} sx={{ ml: 'auto', flexShrink: 0 }}>
            Back to feeds
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      component="header"
      sx={{
        p: condensed ? 1.25 : 2,
        mx: { xs: -1.75, md: -3.25 },
        mt: { xs: -2, md: -2.5 },
        width: { xs: 'calc(100% + 28px)', md: 'calc(100% + 52px)' },
        borderRadius: 0,
        border: '1px solid rgba(255, 255, 255, 0.06)',
        bgcolor: 'var(--surface-raised)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow)',
        position: 'sticky',
        top: 0,
        zIndex: 18,
        transition: 'padding 160ms ease, border-color 160ms ease, background-color 160ms ease',
        ':root[data-theme="default"] &': {
          bgcolor: condensed ? 'var(--surface-raised)' : 'var(--bg)'
        },
        ':root[data-theme="light"] &': {
          bgcolor: condensed ? 'var(--surface-raised)' : 'var(--bg)'
        },
        ':root[data-theme="dark"] &': {
          bgcolor: condensed ? 'var(--surface-raised)' : 'var(--bg)'
        }
      }}
    >
      <Stack spacing={condensed ? 0.75 : 1.25}>
        {!condensed && (
          <Typography variant="h5" fontWeight={800} noWrap>
            {scopeLabel}
          </Typography>
        )}

        <Stack direction="row" alignItems="center" gap={1.5} minWidth={0} sx={{ minHeight: 38 }}>
          {isMobile && (
            <Tooltip title="Toggle menu">
              <IconButton aria-label="Toggle menu" onClick={onToggleSidebar} sx={{ display: { xs: 'inline-flex', md: 'none' }, ml: -1 }}>
                <MenuIcon />
              </IconButton>
            </Tooltip>
          )}
          {condensed && (
            <Typography
              variant="h6"
              fontWeight={800}
              noWrap
              sx={{
                alignSelf: 'center',
                display: 'flex',
                alignItems: 'center',
                height: 34,
                color: 'var(--muted)',
                fontSize: 18,
                lineHeight: 1,
                maxWidth: { xs: '40vw', md: '28vw' }
              }}
            >
              {scopeLabel}
            </Typography>
          )}
          <ToggleButtonGroup
            exclusive
            size="small"
            value={unreadOnly ? 'unread' : 'all'}
            onChange={(_, value) => {
              if (value) selectUnread(value === 'unread');
            }}
            aria-label="Article filter"
            sx={{
              ml: condensed ? 2 : 0,
              flexShrink: 0,
              p: 0.25,
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              bgcolor: 'var(--panel-2)',
              '& .MuiToggleButtonGroup-grouped': {
                border: 0,
                borderRadius: '8px !important',
                color: 'var(--muted)',
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1,
                minWidth: 68,
                px: 1,
                py: 0.8,
                '&.Mui-selected': {
                  bgcolor: 'rgba(56, 189, 248, 0.18)',
                  color: 'var(--muted)'
                },
                '&.Mui-selected:hover': {
                  bgcolor: 'rgba(56, 189, 248, 0.24)'
                },
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)'
                }
              }
            }}
          >
            <ToggleButton value="all" aria-label="All articles">
              All Articles
            </ToggleButton>
            <ToggleButton value="unread" aria-label="Unread articles">
              Unread ({unreadCount})
            </ToggleButton>
          </ToggleButtonGroup>

          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: 'auto' }}>
            <TextField
              placeholder="Search in articles"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start" sx={{ color: 'var(--muted)', ml: 0.25, mr: 0.25 }}>
                      <SearchIcon sx={{ fontSize: 16 }} />
                    </InputAdornment>
                  )
                }
              }}
              sx={{
                display: { xs: 'none', md: 'block' },
                width: condensed ? 'min(320px, 28vw)' : 'min(360px, 32vw)',
                mr: 0.5,
                '& .MuiOutlinedInput-root': {
                  width: '100%',
                  height: 40,
                  bgcolor: 'var(--panel-2)',
                  color: 'var(--muted)',
                  borderRadius: '10px',
                  fontSize: 12,
                  '& input': {
                    height: 40,
                    boxSizing: 'border-box',
                    p: 0
                  },
                  '& fieldset': { borderColor: 'var(--card-border)' },
                  '&:hover fieldset': { borderColor: 'rgba(56, 189, 248, 0.45)' }
                }
              }}
            />
            <ButtonGroup
              variant="outlined"
              size="small"
              aria-label="Mark read actions"
              sx={{
                flexShrink: 0,
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '10px',
                '& .MuiButtonGroup-grouped': {
                  borderColor: 'var(--card-border)',
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap'
                }
              }}
            >
              <Button startIcon={<DoneAllIcon />} onClick={onMarkAllRead} sx={{ fontSize: 12, px: 1.25 }}>
                Mark all as read
              </Button>
              <Button
                aria-label="Mark as read options"
                aria-expanded={Boolean(markAnchor)}
                onClick={(e) => setMarkAnchor(e.currentTarget)}
                sx={{ minWidth: 34, px: 0.5 }}
              >
                <ExpandMoreIcon fontSize="small" />
              </Button>
            </ButtonGroup>
            <Menu anchorEl={markAnchor} open={Boolean(markAnchor)} onClose={() => setMarkAnchor(null)}>
              <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: 'var(--muted)', lineHeight: '32px' }}>
                Mark as read articles...
              </ListSubheader>
              {markReadAgeOptions.map((option) => (
                <MenuItem key={option.days} onClick={() => markOlder(option.days)}>
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
            <Tooltip title="Refresh">
              <IconButton aria-label="Refresh" onClick={onRefresh} sx={{ color: 'var(--muted)' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="More options">
              <IconButton aria-label="More options" onClick={(e) => setMoreAnchor(e.currentTarget)} sx={{ color: 'var(--muted)' }}>
                <MoreHorizIcon />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
              <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: 'var(--muted)', lineHeight: '32px' }}>
                Layout
              </ListSubheader>
              <MenuItem selected={viewMode === 'list'} onClick={() => selectView('list')}>
                <ListItemIcon>{viewIcon('list')}</ListItemIcon>
                <ListItemText>List view</ListItemText>
              </MenuItem>
              <MenuItem selected={viewMode === 'card'} onClick={() => selectView('card')}>
                <ListItemIcon>{viewIcon('card')}</ListItemIcon>
                <ListItemText>Card view</ListItemText>
              </MenuItem>
              <MenuItem selected={viewMode === 'magazine'} onClick={() => selectView('magazine')}>
                <ListItemIcon>{viewIcon('magazine')}</ListItemIcon>
                <ListItemText>Magazine view</ListItemText>
              </MenuItem>
              <Divider sx={{ my: 0.5, borderColor: 'var(--card-border)' }} />
              <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: 'var(--muted)', lineHeight: '32px' }}>
                Sorting
              </ListSubheader>
              <MenuItem selected={sort === 'newest'} onClick={() => selectSort('newest')}>
                <Radio checked={sort === 'newest'} size="small" sx={{ p: 0, mr: 1 }} />
                <ListItemText>Newest First</ListItemText>
              </MenuItem>
              <MenuItem selected={sort === 'oldest'} onClick={() => selectSort('oldest')}>
                <Radio checked={sort === 'oldest'} size="small" sx={{ p: 0, mr: 1 }} />
                <ListItemText>Oldest first</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
};
