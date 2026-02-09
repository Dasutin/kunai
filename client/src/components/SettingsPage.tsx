import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { FeedWithUnread, Settings } from '@shared/types';

type TabKey = 'General' | 'OPML' | 'Content';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="settings-section">
    <h3>{title}</h3>
    {children}
  </section>
);

const TabBar: React.FC<{ tabs: TabKey[]; active: TabKey; onSelect: (tab: TabKey) => void }> = ({ tabs, active, onSelect }) => (
  <div className="settings-tabs">
    {tabs.map((tab) => (
      <button key={tab} className={tab === active ? 'tab active' : 'tab'} onClick={() => onSelect(tab)}>
        {tab}
      </button>
    ))}
  </div>
);

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

  const openDelete = (feed: FeedWithUnread) => {
    setDeleteTarget(feed);
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

  const tabs: TabKey[] = ['General', 'Content', 'OPML'];
  const sortedFeeds = useMemo(() => [...feeds].sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })), [feeds]);

  if (loading) return <div className="main-card">Loading settings…</div>;

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h2>{activeTab}</h2>
          {message && <div className="muted">{message}</div>}
        </div>
      </div>

      <TabBar tabs={tabs} active={activeTab} onSelect={(tab) => setActiveTab(tab)} />

      {activeTab === 'General' && (
        <div className="settings-grid">
          <Section title="Preferences">
            <div className="settings-group">
              <label className="toggle inline">
                <input
                  type="checkbox"
                  checked={!!settings.markReadOnOpen}
                  onChange={(e) => save({ markReadOnOpen: e.target.checked })}
                />
                Mark read on open
              </label>
              <label className="toggle inline">
                <input
                  type="checkbox"
                  checked={!!settings.unreadFirstDefault}
                  onChange={(e) => save({ unreadFirstDefault: e.target.checked })}
                />
                Unread first default
              </label>
              <div className="field-row">
                <span>Default view:</span>
                <select value={settings.defaultViewMode || 'list'} onChange={(e) => save({ defaultViewMode: e.target.value as 'list' | 'card' | 'magazine' })}>
                  <option value="list">List</option>
                  <option value="card">Card</option>
                  <option value="magazine">Magazine</option>
                </select>
              </div>
              <div className="field-row">
                <span>Theme:</span>
                <select value={settings.theme || 'default'} onChange={(e) => save({ theme: e.target.value as Settings['theme'] })}>
                  <option value="default">Current</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="field-row">
                <span>Refresh every (minutes):</span>
                <input
                  className="input"
                  style={{ maxWidth: 140 }}
                  type="number"
                  min={1}
                  value={settings.refreshMinutes ?? 5}
                  onChange={(e) => save({ refreshMinutes: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              <div className="field-row">
                <span>RSS article retention:</span>
                <select
                  value={settings.articleRetention || 'off'}
                  onChange={(e) => save({ articleRetention: e.target.value as any })}
                >
                  <option value="off">Off</option>
                  <option value="1w">1 week</option>
                  <option value="1m">1 month</option>
                  <option value="1y">1 year</option>
                </select>
              </div>
            </div>
          </Section>
        </div>
      )}

      {activeTab === 'OPML' && (
        <div className="settings-grid">
          <Section title="OPML">
            <div className="settings-group">
              <div className="field-row">
                <span style={{ minWidth: 64 }}>Import</span>
                <input type="file" accept=".opml,.xml,text/xml" onChange={(e) => handleFile(e.target.files?.[0])} />
              </div>
              <div>
                <button className="btn" onClick={exportOpml}>Export</button>
              </div>
              {importing && <div className="muted">Importing…</div>}
              {importResult && <div className="muted">{importResult}</div>}
            </div>
          </Section>
        </div>
      )}

      {activeTab === 'Content' && (
        <div className="settings-table-wrap">
          {feedsError && <div className="muted" style={{ color: 'var(--danger)' }}>{feedsError}</div>}
          <div className="settings-table-scroll">
            <table className="settings-table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Enabled</th>
                  <th>Feed</th>
                  <th style={{ width: 200 }}>Options</th>
                </tr>
              </thead>
              <tbody>
                {feedsLoading && (
                  <tr><td colSpan={3} className="muted">Loading feeds…</td></tr>
                )}
                {!feedsLoading && sortedFeeds.length === 0 && (
                  <tr><td colSpan={3} className="muted">No feeds configured yet</td></tr>
                )}
                {sortedFeeds.map((feed) => (
                  <tr key={feed.id}>
                    <td>
                      <button
                        className={feed.enabled ? 'toggle-pill on' : 'toggle-pill'}
                        onClick={() => toggleFeedEnabled(feed)}
                        aria-pressed={feed.enabled}
                        aria-label={feed.enabled ? 'Disable feed' : 'Enable feed'}
                      >
                        <span className="thumb" />
                        <span className="label">{feed.enabled ? 'On' : 'Off'}</span>
                      </button>
                    </td>
                    <td>
                      <div className="feed-cell">
                        {(() => {
                          try {
                            const host = new URL(feed.url).hostname;
                            if (host) return <img className="feed-favicon-sm" src={`https://icons.duckduckgo.com/ip3/${host}.ico`} alt="" />;
                          } catch {
                            return null;
                          }
                          return null;
                        })()}
                        <div className="feed-meta">
                          <div className="feed-title-row">{feed.title || 'Untitled feed'}</div>
                          <div className="feed-url muted">{feed.url}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="settings-row-actions">
                        <button className="icon-btn" title="Edit feed" aria-label="Edit feed" onClick={() => openEdit(feed)}>
                          <span className="material-icons">edit</span>
                        </button>
                        <button className="icon-btn danger" title="Delete feed" aria-label="Delete feed" onClick={() => openDelete(feed)}>
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(editTarget || deleteTarget) && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true">
          <div className="dialog">
            {editTarget && (
              <>
                <h3>Edit feed</h3>
                <div className="field-row">
                  <span>Name</span>
                  <input
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="dialog-actions">
                  <button className="btn-ghost" onClick={() => { if (!savingEdit) { setEditTarget(null); setEditName(''); } }}>Cancel</button>
                  <button className="btn" disabled={savingEdit || !editName.trim()} onClick={confirmEdit}>Save</button>
                </div>
              </>
            )}
            {deleteTarget && (
              <>
                <h3>Delete feed</h3>
                <p className="muted">Are you sure you want to delete “{deleteTarget.title || deleteTarget.url}”? This cannot be undone.</p>
                <div className="dialog-actions">
                  <button className="btn-ghost" onClick={() => { if (!deleting) setDeleteTarget(null); }}>Cancel</button>
                  <button className="btn-danger" disabled={deleting} onClick={confirmDelete}>Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
