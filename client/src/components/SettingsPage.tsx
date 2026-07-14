import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { api } from '../api';
import type { FeedWithUnread, Folder, Settings, Tag, UserProfile } from '@shared/types';

type PreferencePage = 'Account' | 'Settings' | 'Content';
type AccountTabKey = 'Profile';
type SettingsTabKey = 'General' | 'OPML';
type ContentTabKey = 'Feeds' | 'Folders' | 'Tags';
type FolderWithUnread = Folder & { unreadCount: number };

const Section: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <Paper
    component="section"
    sx={{
      border: 0,
      borderRadius: 0,
      p: 1.75,
      bgcolor: 'transparent',
      boxShadow: 'none'
    }}
  >
    <Stack spacing={1.25}>
      {title && (
        <Typography variant="h6" fontWeight={800}>
          {title}
        </Typography>
      )}
      {children}
    </Stack>
  </Paper>
);

const feedFavicon = (url: string) => {
  try {
    const host = new URL(url).hostname;
    if (host) return `https://icons.duckduckgo.com/ip3/${host}.ico`;
  } catch {
    return null;
  }
  return null;
};

const profileInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const profileColor = (name: string) => {
  const colors = ['#2563eb', '#7c3aed', '#be185d', '#047857', '#b45309', '#0f766e'];
  const value = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return colors[value % colors.length];
};

type Props = {
  onClose: () => void;
  initialTheme?: Settings['theme'];
  user: UserProfile;
  onUserChange: (user: UserProfile) => void;
  onSignOut: () => Promise<void>;
};

export const SettingsPage: React.FC<Props> = ({ onClose, initialTheme, user, onUserChange, onSignOut }) => {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<PreferencePage>('Account');
  const [accountTab, setAccountTab] = useState<AccountTabKey>('Profile');
  const [settingsTab, setSettingsTab] = useState<SettingsTabKey>('General');
  const [contentTab, setContentTab] = useState<ContentTabKey>('Feeds');
  const [feeds, setFeeds] = useState<FeedWithUnread[]>([]);
  const [folders, setFolders] = useState<FolderWithUnread[]>([]);
  const [feedsLoading, setFeedsLoading] = useState(false);
  const [feedsError, setFeedsError] = useState<string | null>(null);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagSaving, setTagSaving] = useState(false);
  const [tagDeletingId, setTagDeletingId] = useState<number | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderEditing, setFolderEditing] = useState<FolderWithUnread | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderFeedIds, setFolderFeedIds] = useState<number[]>([]);
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderDeletingId, setFolderDeletingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<FeedWithUnread | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeedWithUnread | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const applyTheme = (theme?: Settings['theme']) => {
    document.documentElement.setAttribute('data-theme', theme || 'default');
  };

  const loadFeeds = async () => {
    setFeedsLoading(true);
    setFeedsError(null);
    try {
      const data = await api.getFeeds();
      setFeeds(data);
    } catch (err: any) {
      setFeedsError(err?.message || 'Failed to load feeds');
    } finally {
      setFeedsLoading(false);
    }
  };

  const loadFolders = async () => {
    setFoldersLoading(true);
    setFoldersError(null);
    try {
      const data = await api.getFolders();
      setFolders(data);
    } catch (err: any) {
      setFoldersError(err?.message || 'Failed to load folders');
    } finally {
      setFoldersLoading(false);
    }
  };

  const loadTags = async () => {
    setTagsLoading(true);
    setTagsError(null);
    try {
      const data = await api.getTags();
      setTags(data);
    } catch (err: any) {
      setTagsError(err?.message || 'Failed to load tags');
    } finally {
      setTagsLoading(false);
    }
  };

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setSettings(s);
        applyTheme(initialTheme || s.theme);
      })
      .finally(() => setLoading(false));
  }, [initialTheme]);

  useEffect(() => {
    setProfileName(user.name);
    setProfileEmail(user.email);
  }, [user.email, user.name]);

  useEffect(() => {
    loadFeeds();
    loadFolders();
    loadTags();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const save = async (next: Partial<Settings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    await api.patchSettings(next);
    if (next.theme !== undefined) {
      applyTheme(merged.theme);
    }
    setMessage('Saved');
    setTimeout(() => setMessage(null), 1500);
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileError(null);
    try {
      const updated = await api.updateProfile({ name: profileName.trim(), email: profileEmail.trim() });
      onUserChange(updated);
      setMessage('Profile saved');
      setTimeout(() => setMessage(null), 1500);
    } catch (err: any) {
      setProfileError(err?.message || 'Unable to save your profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const changeProfileImage = (file?: File | null) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 1024 * 1024) {
      setProfileError('Choose a PNG, JPEG, WebP, or GIF image smaller than 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setProfileError(null);
        setProfileSaving(true);
        const updated = await api.uploadProfileImage(String(reader.result));
        onUserChange(updated);
      } catch (err: any) {
        setProfileError(err?.message || 'Unable to upload your profile picture.');
      } finally {
        setProfileSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const submitPasswordChange = async () => {
    if (nextPassword !== confirmPassword) {
      setProfileError('The new passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    setProfileError(null);
    try {
      await api.changePassword(currentPassword, nextPassword);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setChangePasswordOpen(false);
      setMessage('Password updated');
      setTimeout(() => setMessage(null), 1500);
    } catch (err: any) {
      setProfileError(err?.message || 'Unable to update your password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const text = await file.text();
    try {
      const result = await api.importOpml(text);
      setImportResult(`Imported ${result.created}/${result.discovered} new feeds`);
      await save({});
      await loadFeeds();
    } catch (err: any) {
      setImportResult(err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const exportOpml = async () => {
    const blob = await api.exportOpml();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feeds.opml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFeedEnabled = async (feed: FeedWithUnread) => {
    const next = !feed.enabled;
    setFeeds((prev) => prev.map((f) => (f.id === feed.id ? { ...f, enabled: next } : f)));
    try {
      await api.updateFeed(feed.id, { enabled: next });
    } catch (err: any) {
      setFeeds((prev) => prev.map((f) => (f.id === feed.id ? { ...f, enabled: feed.enabled } : f)));
      setFeedsError(err?.message || 'Failed to update feed');
    }
  };

  const openEdit = (feed: FeedWithUnread) => {
    setEditTarget(feed);
    setEditName(feed.title);
  };

  const confirmEdit = async () => {
    if (!editTarget) return;
    const title = editName.trim();
    if (!title) return;
    setSavingEdit(true);
    try {
      await api.updateFeed(editTarget.id, { title });
      setFeeds((prev) => prev.map((f) => (f.id === editTarget.id ? { ...f, title } : f)));
      setEditTarget(null);
      setEditName('');
    } catch (err: any) {
      setFeedsError(err?.message || 'Failed to update feed');
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteFeed(deleteTarget.id);
      setFeeds((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setFeedsError(err?.message || 'Failed to delete feed');
    } finally {
      setDeleting(false);
    }
  };

  const sortedFeeds = useMemo(() => [...feeds].sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })), [feeds]);
  const sortedFolders = useMemo(() => [...folders].sort((a, b) => (a.position || 0) - (b.position || 0) || a.name.localeCompare(b.name)), [folders]);
  const sortedTags = useMemo(() => [...tags].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })), [tags]);
  const selectedFolderFeeds = useMemo(() => sortedFeeds.filter((feed) => folderFeedIds.includes(feed.id)), [folderFeedIds, sortedFeeds]);

  const openFolderModal = (folder?: FolderWithUnread) => {
    setFolderEditing(folder || null);
    setFolderName(folder?.name || '');
    setFolderFeedIds(folder ? feeds.filter((feed) => feed.folderId === folder.id).map((feed) => feed.id) : []);
    setFolderModalOpen(true);
    setFoldersError(null);
  };

  const closeFolderModal = () => {
    if (folderSaving) return;
    setFolderModalOpen(false);
    setFolderEditing(null);
    setFolderName('');
    setFolderFeedIds([]);
  };

  const saveFolder = async () => {
    const name = folderName.trim();
    if (!name) {
      setFoldersError('Folder name is required');
      return;
    }
    setFolderSaving(true);
    setFoldersError(null);
    try {
      const folderId = folderEditing ? folderEditing.id : (await api.createFolder(name)).id;
      if (folderEditing) {
        await api.updateFolder(folderEditing.id, { name });
      }
      const currentIds = folderEditing ? feeds.filter((feed) => feed.folderId === folderEditing.id).map((feed) => feed.id) : [];
      const selected = new Set(folderFeedIds);
      const toAdd = folderFeedIds.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter((id) => !selected.has(id));
      if (toAdd.length > 0) await api.moveFeeds(toAdd, folderId);
      if (toRemove.length > 0) await api.moveFeeds(toRemove, null);
      await Promise.all([loadFeeds(), loadFolders()]);
      closeFolderModal();
    } catch (err: any) {
      setFoldersError(err?.message || 'Failed to save folder');
    } finally {
      setFolderSaving(false);
    }
  };

  const deleteFolder = async (folder: FolderWithUnread) => {
    setFolderDeletingId(folder.id);
    setFoldersError(null);
    try {
      await api.deleteFolder(folder.id);
      await Promise.all([loadFeeds(), loadFolders()]);
    } catch (err: any) {
      setFoldersError(err?.message || 'Failed to delete folder');
    } finally {
      setFolderDeletingId(null);
    }
  };

  const createTag = async () => {
    const name = tagName.trim();
    if (!name) {
      setTagsError('Tag name is required');
      return;
    }
    setTagSaving(true);
    setTagsError(null);
    try {
      await api.createTag(name);
      setTagName('');
      await loadTags();
    } catch (err: any) {
      setTagsError(err?.message || 'Failed to create tag');
    } finally {
      setTagSaving(false);
    }
  };

  const deleteTag = async (tag: Tag) => {
    setTagDeletingId(tag.id);
    setTagsError(null);
    try {
      await api.deleteTag(tag.id);
      await loadTags();
    } catch (err: any) {
      setTagsError(err?.message || 'Failed to delete tag');
    } finally {
      setTagDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, bgcolor: 'var(--card-bg-soft)', border: '1px solid var(--card-border)' }}>
        <Typography color="var(--muted)">Loading settings...</Typography>
      </Paper>
    );
  }

  const navItems: Array<{ page: PreferencePage; label: string; icon: React.ReactNode }> = [
    { page: 'Account', label: 'Account', icon: <PersonIcon fontSize="small" /> },
    { page: 'Settings', label: 'Settings', icon: <SettingsIcon fontSize="small" /> },
    { page: 'Content', label: 'Content', icon: <ArticleIcon fontSize="small" /> }
  ];

  return (
    <Box sx={{ width: '100%', bgcolor: '#16191c', minHeight: '100vh' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '208px minmax(0, 1fr)' },
          minHeight: '100vh',
          alignItems: 'stretch',
          bgcolor: '#16191c'
        }}
      >
        <Paper
          component="aside"
          sx={{
            position: { xs: 'static', md: 'sticky' },
            top: 0,
            display: 'flex',
            flexDirection: { xs: 'row', md: 'column' },
            gap: 0,
            p: 0,
            minHeight: { xs: 'auto', md: '100vh' },
            border: 0,
            borderRight: { md: '1px solid var(--card-border)' },
            borderBottom: { xs: '1px solid var(--card-border)', md: 0 },
            borderRadius: 0,
            bgcolor: '#16191c',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ p: { xs: 1.25, md: 1.5 } }}>
            <Typography variant="h6" fontWeight={800}>
              Preferences
            </Typography>
          </Box>
          <Divider sx={{ borderColor: 'var(--card-border)' }} />
          {navItems.map((item, index) => {
            const active = activePage === item.page;
            return (
              <React.Fragment key={item.page}>
                <ListItemButton
                  selected={active}
                  onClick={() => setActivePage(item.page)}
                  sx={{
                    flex: '0 0 auto',
                    minHeight: 48,
                    borderRadius: 0,
                    px: 1.5,
                    color: active ? '#4177c2' : 'var(--muted)',
                    bgcolor: active ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                    '&.Mui-selected': { bgcolor: 'rgba(56, 189, 248, 0.12)' },
                    '&:hover, &.Mui-selected:hover': { bgcolor: active ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.05)' }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: active ? '#4177c2' : 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: 800, noWrap: true }}
                    sx={{ display: 'block' }}
                  />
                </ListItemButton>
                {index < navItems.length - 1 && <Divider sx={{ borderColor: 'var(--card-border)' }} />}
              </React.Fragment>
            );
          })}
        </Paper>

        <Stack spacing={0} minWidth={0} sx={{ width: '100%', bgcolor: '#16191c' }}>
          <Paper
            component="header"
            sx={{
              border: 0,
              borderBottom: '1px solid var(--card-border)',
              borderRadius: 0,
              bgcolor: '#16191c',
              px: 0,
              minHeight: 53,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              gap="10px"
              sx={{
                width: '100%',
                maxWidth: 1040,
                height: '100%',
                mx: 'auto',
                px: { xs: 1.5, md: 2.5 },
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              <Box sx={{ width: 96, display: 'flex', justifyContent: 'center', flexShrink: 0, transform: 'translateY(14px)' }}>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{
                    fontSize: 18,
                    fontFamily: '"Public Sans", sans-serif',
                    textAlign: 'center'
                  }}
                >
                  {activePage}
                </Typography>
              </Box>
              <Box sx={{ transform: 'translateY(6px)' }}>
                {activePage === 'Account' ? (
                  <Tabs
                    value={accountTab}
                    onChange={(_, value) => setAccountTab(value)}
                    sx={{
                      minHeight: 42,
                      '& .MuiTab-root': { minHeight: 42, color: 'var(--muted)', fontWeight: 800 },
                      '& .Mui-selected': { color: '#4177c2' },
                      '& .MuiTabs-indicator': { bgcolor: '#4177c2' }
                    }}
                  >
                    <Tab label="Profile" value="Profile" />
                  </Tabs>
                ) : activePage === 'Settings' ? (
                  <Tabs
                    value={settingsTab}
                    onChange={(_, value) => setSettingsTab(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                      minHeight: 42,
                      '& .MuiTab-root': { minHeight: 42, color: 'var(--muted)', fontWeight: 800 },
                      '& .Mui-selected': { color: '#4177c2' },
                      '& .MuiTabs-indicator': { bgcolor: '#4177c2' }
                    }}
                  >
                    <Tab label="General" value="General" />
                    <Tab label="OPML" value="OPML" />
                  </Tabs>
                ) : (
                  <Tabs
                    value={contentTab}
                    onChange={(_, value) => setContentTab(value)}
                    sx={{
                      minHeight: 42,
                      '& .MuiTab-root': { minHeight: 42, color: 'var(--muted)', fontWeight: 800 },
                      '& .Mui-selected': { color: '#4177c2' },
                      '& .MuiTabs-indicator': { bgcolor: '#4177c2' }
                    }}
                  >
                    <Tab label="Feeds" value="Feeds" />
                    <Tab label="Folders" value="Folders" />
                    <Tab label="Tags" value="Tags" />
                  </Tabs>
                )}
              </Box>
              {message && <Typography color="var(--muted)" sx={{ position: 'absolute', right: 24 }}>{message}</Typography>}
            </Stack>
          </Paper>

          {activePage === 'Account' && accountTab === 'Profile' && (
            <Box sx={{ p: { xs: 1.5, md: 2.5 }, maxWidth: 720, width: '100%', mx: 'auto', boxSizing: 'border-box' }}>
              <Section>
                <Stack spacing={2.5}>
                  {profileError && <Alert severity="error">{profileError}</Alert>}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Avatar
                      src={user.profileImage || undefined}
                      alt={user.name}
                      sx={{ width: 88, height: 88, fontSize: 28, fontWeight: 800, bgcolor: profileColor(user.name) }}
                    >
                      {profileInitials(user.name)}
                    </Avatar>
                    <Button component="label" variant="outlined" disabled={profileSaving} sx={{ height: 36, alignSelf: 'center' }}>
                      Change profile picture
                      <input hidden accept="image/png,image/jpeg,image/webp,image/gif" type="file" onChange={(event) => changeProfileImage(event.target.files?.[0])} />
                    </Button>
                  </Stack>
                  <TextField label="Name" value={profileName} onChange={(event) => setProfileName(event.target.value)} autoComplete="name" fullWidth />
                  <TextField label="Email" type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} autoComplete="email" fullWidth />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <TextField label="Password" value="••••••••••••" InputProps={{ readOnly: true }} fullWidth />
                    <Button variant="outlined" onClick={() => setChangePasswordOpen(true)} sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                      Change Password
                    </Button>
                  </Stack>
                  <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.25} justifyContent="space-between">
                    <Button color="error" startIcon={<LogoutIcon />} onClick={() => void onSignOut()}>
                      Logout
                    </Button>
                    <Button
                      variant="contained"
                      onClick={saveProfile}
                      disabled={profileSaving || !profileName.trim() || !profileEmail.trim()}
                      sx={{ background: '#4177c2', color: '#fff', '&:hover': { background: '#4177c2' } }}
                    >
                      Save changes
                    </Button>
                  </Stack>
                </Stack>
              </Section>
            </Box>
          )}

          {activePage === 'Settings' && settingsTab === 'General' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(260px, 1fr))' }, gap: 1.5, p: { xs: 1.5, md: 2.5 }, maxWidth: 1040, width: '100%', mx: 'auto', boxSizing: 'border-box' }}>
              <Section>
                <Stack spacing={1.5}>
                  <FormControlLabel
                    control={<Switch checked={!!settings.markReadOnOpen} onChange={(e) => save({ markReadOnOpen: e.target.checked })} />}
                    label="Mark read on open"
                  />
                  <FormControlLabel
                    control={<Switch checked={!!settings.unreadFirstDefault} onChange={(e) => save({ unreadFirstDefault: e.target.checked })} />}
                    label="Unread first default"
                  />
                  <FormControl fullWidth>
                    <InputLabel id="default-view-label">Default view</InputLabel>
                    <Select
                      labelId="default-view-label"
                      label="Default view"
                      value={settings.defaultViewMode || 'list'}
                      onChange={(e) => save({ defaultViewMode: e.target.value as 'list' | 'card' | 'magazine' })}
                    >
                      <MenuItem value="list">List</MenuItem>
                      <MenuItem value="card">Card</MenuItem>
                      <MenuItem value="magazine">Magazine</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel id="theme-label">Theme</InputLabel>
                    <Select
                      labelId="theme-label"
                      label="Theme"
                      value={settings.theme || 'default'}
                      onChange={(e) => save({ theme: e.target.value as Settings['theme'] })}
                    >
                      <MenuItem value="default">Current</MenuItem>
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Refresh every (minutes)"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={settings.refreshMinutes ?? 5}
                    onChange={(e) => save({ refreshMinutes: Math.max(1, Number(e.target.value) || 1) })}
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel id="retention-label">RSS article retention</InputLabel>
                    <Select
                      labelId="retention-label"
                      label="RSS article retention"
                      value={settings.articleRetention || 'off'}
                      onChange={(e) => save({ articleRetention: e.target.value as Settings['articleRetention'] })}
                    >
                      <MenuItem value="off">Off</MenuItem>
                      <MenuItem value="1w">1 week</MenuItem>
                      <MenuItem value="1m">1 month</MenuItem>
                      <MenuItem value="1y">1 year</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Section>
            </Box>
          )}

          {activePage === 'Settings' && settingsTab === 'OPML' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(260px, 1fr))' }, gap: 1.5, p: { xs: 1.5, md: 2.5 }, maxWidth: 1040, width: '100%', mx: 'auto', boxSizing: 'border-box' }}>
              <Section>
                <Stack spacing={1.25} alignItems="flex-start">
                  <Button variant="outlined" startIcon={<UploadFileIcon />} component="label" disabled={importing}>
                    {importing ? 'Importing...' : 'Import'}
                    <Box
                      component="input"
                      type="file"
                      accept=".opml,.xml,text/xml"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])}
                      sx={{ display: 'none' }}
                    />
                  </Button>
                  <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportOpml}>
                    Export
                  </Button>
                  {importResult && <Alert severity={importResult.startsWith('Imported') ? 'success' : 'error'}>{importResult}</Alert>}
                </Stack>
              </Section>
            </Box>
          )}

          {activePage === 'Content' && contentTab === 'Feeds' && (
            <Stack spacing={1.25} sx={{ p: { xs: 1.5, md: 2.5 }, maxWidth: 1040, width: '100%', mx: 'auto', boxSizing: 'border-box' }}>
              {feedsError && <Alert severity="error">{feedsError}</Alert>}
              <TableContainer component={Paper} sx={{ bgcolor: 'transparent', border: 0, borderRadius: 0, boxShadow: 'none' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 120, color: 'var(--muted)', fontWeight: 800 }}>Enabled</TableCell>
                      <TableCell sx={{ color: 'var(--muted)', fontWeight: 800 }}>Feed</TableCell>
                      <TableCell align="right" sx={{ width: 160, color: 'var(--muted)', fontWeight: 800 }}>
                        Options
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {feedsLoading && (
                      <TableRow>
                        <TableCell colSpan={3} sx={{ color: 'var(--muted)' }}>
                          Loading feeds...
                        </TableCell>
                      </TableRow>
                    )}
                    {!feedsLoading && sortedFeeds.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} sx={{ color: 'var(--muted)' }}>
                          No feeds configured yet
                        </TableCell>
                      </TableRow>
                    )}
                    {sortedFeeds.map((feed) => (
                      <TableRow key={feed.id} hover>
                        <TableCell>
                          <Switch
                            checked={feed.enabled}
                            onChange={() => toggleFeedEnabled(feed)}
                            inputProps={{ 'aria-label': feed.enabled ? 'Disable feed' : 'Enable feed' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1.25} minWidth={0}>
                            <Avatar src={feedFavicon(feed.url) || undefined} alt="" variant="rounded" sx={{ width: 22, height: 22 }} />
                            <Box minWidth={0}>
                              <Typography fontWeight={800} noWrap>
                                {feed.title || 'Untitled feed'}
                              </Typography>
                              <Typography variant="body2" color="var(--muted)" noWrap>
                                {feed.url}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton aria-label="Edit feed" title="Edit feed" onClick={() => openEdit(feed)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton aria-label="Delete feed" title="Delete feed" onClick={() => setDeleteTarget(feed)} sx={{ color: 'var(--danger)' }}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}

          {activePage === 'Content' && contentTab === 'Folders' && (
            <Stack spacing={1.25} sx={{ p: { xs: 1.5, md: 2.5 }, maxWidth: 1040, width: '100%', mx: 'auto', boxSizing: 'border-box', minHeight: 'calc(100vh - 82px)' }}>
              {foldersError && <Alert severity="error">{foldersError}</Alert>}
              {foldersLoading && <Typography color="var(--muted)">Loading folders...</Typography>}
              {!foldersLoading && sortedFolders.length === 0 && (
                <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, minHeight: 'calc(100vh - 150px)' }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openFolderModal()}
                    sx={{
                      width: 'auto',
                      minWidth: 0,
                      px: '20px',
                      py: '10px',
                      background: '#4177c2',
                      bgcolor: '#4177c2',
                      color: '#f8fafc',
                      '&:hover': { background: '#3568ad', bgcolor: '#3568ad' }
                    }}
                  >
                    Add folder
                  </Button>
                </Stack>
              )}
              {!foldersLoading && sortedFolders.length > 0 && (
                <Stack spacing={0}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => openFolderModal()}
                      sx={{ background: '#4177c2', bgcolor: '#4177c2', color: '#f8fafc', '&:hover': { background: '#3568ad', bgcolor: '#3568ad' } }}
                    >
                      Add folder
                    </Button>
                  </Box>
                  {sortedFolders.map((folder) => {
                    const folderFeeds = sortedFeeds.filter((feed) => feed.folderId === folder.id);
                    return (
                      <Box
                        key={folder.id}
                        sx={{
                          py: 1.5,
                          borderBottom: '1px solid var(--card-border)',
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: 'minmax(180px, 260px) minmax(0, 1fr) auto' },
                          gap: 1.5,
                          alignItems: 'start'
                        }}
                      >
                        <Box minWidth={0}>
                          <Typography fontWeight={800}>{folder.name}</Typography>
                          <Typography variant="body2" color="var(--muted)">
                            {folderFeeds.length === 1 ? '1 feed' : `${folderFeeds.length} feeds`}
                          </Typography>
                        </Box>
                        <Stack spacing={0.5} minWidth={0}>
                          {folderFeeds.length === 0 ? (
                            <Typography variant="body2" color="var(--muted)">
                              No feeds in this folder
                            </Typography>
                          ) : (
                            folderFeeds.map((feed) => (
                              <Stack key={feed.id} direction="row" spacing={1} alignItems="center" minWidth={0}>
                                <Avatar src={feedFavicon(feed.url) || undefined} alt="" variant="rounded" sx={{ width: 18, height: 18 }} />
                                <Typography variant="body2" color="var(--muted)" noWrap>
                                  {feed.title || feed.url}
                                </Typography>
                              </Stack>
                            ))
                          )}
                        </Stack>
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <IconButton aria-label="Edit folder" title="Edit folder" onClick={() => openFolderModal(folder)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            aria-label="Delete folder"
                            title="Delete folder"
                            disabled={folderDeletingId === folder.id}
                            onClick={() => deleteFolder(folder)}
                            sx={{ color: 'var(--danger)' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          )}

          {activePage === 'Content' && contentTab === 'Tags' && (
            <Stack spacing={1.5} sx={{ p: { xs: 1.5, md: 2.5 }, maxWidth: 1040, width: '100%', mx: 'auto', boxSizing: 'border-box' }}>
              {tagsError && <Alert severity="error">{tagsError}</Alert>}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <TextField
                  label="Tag name"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createTag();
                  }}
                  fullWidth
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  disabled={tagSaving || !tagName.trim()}
                  onClick={createTag}
                  sx={{
                    flexShrink: 0,
                    background: '#4177c2',
                    color: '#fff',
                    '&:hover': { background: '#4177c2' },
                    '&.Mui-disabled': { background: '#4177c2', color: '#fff', opacity: 0.55 }
                  }}
                >
                  Add tag
                </Button>
              </Stack>
              {tagsLoading && <Typography color="var(--muted)">Loading tags...</Typography>}
              {!tagsLoading && sortedTags.length === 0 && (
                <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
                  <Typography color="var(--muted)">No tags yet</Typography>
                </Stack>
              )}
              {!tagsLoading && sortedTags.length > 0 && (
                <Stack spacing={0}>
                  {sortedTags.map((tag) => (
                    <Stack
                      key={tag.id}
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      sx={{ py: 1.25, borderBottom: '1px solid var(--card-border)' }}
                    >
                      <Box minWidth={0} sx={{ flex: 1 }}>
                        <Typography fontWeight={800} noWrap>
                          {tag.name}
                        </Typography>
                        <Typography variant="body2" color="var(--muted)">
                          {tag.usageCount === 1 ? '1 article' : `${tag.usageCount || 0} articles`}
                        </Typography>
                      </Box>
                      <IconButton
                        aria-label={`Delete tag ${tag.name}`}
                        title="Delete tag"
                        disabled={tagDeletingId === tag.id}
                        onClick={() => deleteTag(tag)}
                        sx={{ color: 'var(--danger)' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Box>

      <Dialog
        open={folderModalOpen}
        onClose={closeFolderModal}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            bgcolor: 'var(--surface-raised)',
            border: 0,
            borderRadius: 0,
            boxShadow: 'var(--shadow)'
          }
        }}
      >
        <DialogTitle sx={{ p: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
            <Typography variant="h6" fontWeight={800}>
              Create folder
            </Typography>
            <IconButton aria-label="Close" onClick={closeFolderModal}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider sx={{ borderColor: 'var(--card-border)' }} />
        </DialogTitle>
        <DialogContent sx={{ px: 2, py: 2 }}>
          <Stack spacing={1.5}>
            {foldersError && <Alert severity="error">{foldersError}</Alert>}
            <TextField label="Folder name" value={folderName} onChange={(e) => setFolderName(e.target.value)} autoFocus fullWidth />
            <Autocomplete
              value={null}
              options={sortedFeeds.filter((feed) => !folderFeedIds.includes(feed.id))}
              getOptionLabel={(feed) => feed.title || feed.url}
              openOnFocus
              clearOnBlur
              onChange={(_, feed) => {
                if (feed) setFolderFeedIds((prev) => [...prev, feed.id]);
              }}
              renderInput={(params) => <TextField {...params} label="Add feeds" placeholder="Search feeds" />}
              renderOption={(props, feed) => (
                <Box component="li" {...props} key={feed.id}>
                  <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                    <Avatar src={feedFavicon(feed.url) || undefined} alt="" variant="rounded" sx={{ width: 20, height: 20 }} />
                    <Box minWidth={0}>
                      <Typography noWrap>{feed.title || 'Untitled feed'}</Typography>
                      <Typography variant="body2" color="var(--muted)" noWrap>
                        {feed.url}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}
            />
            <Stack spacing={0.75}>
              {selectedFolderFeeds.map((feed) => (
                <Stack key={feed.id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
                  <Avatar src={feedFavicon(feed.url) || undefined} alt="" variant="rounded" sx={{ width: 22, height: 22 }} />
                  <Box minWidth={0} sx={{ flex: 1 }}>
                    <Typography fontWeight={800} noWrap>
                      {feed.title || 'Untitled feed'}
                    </Typography>
                    <Typography variant="body2" color="var(--muted)" noWrap>
                      {feed.url}
                    </Typography>
                  </Box>
                  <IconButton
                    aria-label={`Remove ${feed.title || feed.url}`}
                    title="Remove feed"
                    onClick={() => setFolderFeedIds((prev) => prev.filter((id) => id !== feed.id))}
                    sx={{
                      color: '#fff',
                      bgcolor: 'var(--danger)',
                      width: 28,
                      height: 28,
                      '&:hover': { bgcolor: '#be123c' }
                    }}
                  >
                    <RemoveCircleIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, pt: 0 }}>
          <Button variant="contained" disabled={folderSaving || !folderName.trim()} onClick={saveFolder}>
            {folderSaving ? 'Saving...' : 'Save folder'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editTarget} onClose={() => !savingEdit && setEditTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Edit feed</DialogTitle>
        <DialogContent>
          <TextField label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus fullWidth sx={{ mt: 0.5 }} />
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => { if (!savingEdit) { setEditTarget(null); setEditName(''); } }}>
            Cancel
          </Button>
          <Button variant="contained" disabled={savingEdit || !editName.trim()} onClick={confirmEdit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete feed</DialogTitle>
        <DialogContent>
          <Typography color="var(--muted)">Are you sure you want to delete "{deleteTarget?.title || deleteTarget?.url}"? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => { if (!deleting) setDeleteTarget(null); }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" disabled={deleting} onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={changePasswordOpen} onClose={() => !passwordSaving && setChangePasswordOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <TextField label="Current Password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoFocus fullWidth />
            <TextField label="New Password" type="password" autoComplete="new-password" helperText="Use at least 10 characters." value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} fullWidth />
            <TextField label="Confirm New Password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)} disabled={passwordSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitPasswordChange}
            disabled={passwordSaving || !currentPassword || nextPassword.length < 10 || !confirmPassword}
            sx={{ background: '#4177c2', '&:hover': { background: '#4177c2' } }}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
