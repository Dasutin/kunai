import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
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
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { api } from '../api';
import type { FeedWithUnread, Settings } from '@shared/types';

type TabKey = 'General' | 'OPML' | 'Content';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Paper
    component="section"
    sx={{
      border: '1px solid var(--card-border)',
      borderRadius: 2,
      p: 1.75,
      bgcolor: 'var(--card-bg-soft)'
    }}
  >
    <Stack spacing={1.25}>
      <Typography variant="h6" fontWeight={800}>
        {title}
      </Typography>
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

export const SettingsPage: React.FC<{ onClose: () => void; initialTheme?: Settings['theme'] }> = ({ onClose, initialTheme }) => {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('General');
  const [feeds, setFeeds] = useState<FeedWithUnread[]>([]);
  const [feedsLoading, setFeedsLoading] = useState(false);
  const [feedsError, setFeedsError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<FeedWithUnread | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeedWithUnread | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    loadFeeds();
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

  if (loading) {
    return (
      <Paper sx={{ p: 2, bgcolor: 'var(--card-bg-soft)', border: '1px solid var(--card-border)' }}>
        <Typography color="var(--muted)">Loading settings...</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.75} sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={800}>
          {activeTab}
        </Typography>
        {message && <Typography color="var(--muted)">{message}</Typography>}
      </Stack>

      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 44,
          border: '1px solid var(--card-border)',
          borderRadius: 2,
          width: 'fit-content',
          maxWidth: '100%',
          bgcolor: 'var(--card-bg-soft)',
          '& .MuiTab-root': { minHeight: 42, color: 'var(--muted)', fontWeight: 700 },
          '& .Mui-selected': { color: 'var(--text)' }
        }}
      >
        <Tab label="General" value="General" />
        <Tab label="Content" value="Content" />
        <Tab label="OPML" value="OPML" />
      </Tabs>

      {activeTab === 'General' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(260px, 1fr))' }, gap: 1.5 }}>
          <Section title="Preferences">
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

      {activeTab === 'OPML' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(260px, 1fr))' }, gap: 1.5 }}>
          <Section title="OPML">
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

      {activeTab === 'Content' && (
        <Stack spacing={1.25}>
          {feedsError && <Alert severity="error">{feedsError}</Alert>}
          <TableContainer component={Paper} sx={{ bgcolor: 'var(--card-bg-soft)', border: '1px solid var(--card-border)', borderRadius: 2 }}>
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
    </Stack>
  );
};
