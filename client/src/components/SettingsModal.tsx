import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Settings } from '@shared/types';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ border: '1px solid var(--card-border)', borderRadius: 12, padding: 14, background: 'var(--card-bg-soft)' }}>
    <h3 style={{ margin: '0 0 8px 0' }}>{title}</h3>
    {children}
  </section>
);

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const applyTheme = (theme?: Settings['theme']) => {
    document.documentElement.setAttribute('data-theme', theme || 'default');
  };

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'nowrap', width: '100%' }}>
          <h2 style={{ margin: 0 }}>Settings</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 'auto'
            }}
          >
            ✕
          </button>
        </header>
        <div style={{ display: 'grid', gap: 14 }}>
          <Section title="Preferences">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="toggle" style={{ display: 'inline-flex' }}>
                <input
                  type="checkbox"
                  checked={!!settings.markReadOnOpen}
                  onChange={(e) => save({ markReadOnOpen: e.target.checked })}
                />
                Mark read on open
              </label>
              <label className="toggle" style={{ display: 'inline-flex' }}>
                <input
                  type="checkbox"
                  checked={!!settings.unreadFirstDefault}
                  onChange={(e) => save({ unreadFirstDefault: e.target.checked })}
                />
                Unread first default
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>Default view:</span>
                <select value={settings.defaultViewMode || 'list'} onChange={(e) => save({ defaultViewMode: e.target.value as 'list' | 'card' })}>
                  <option value="list">List</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>Theme:</span>
                <select value={settings.theme || 'default'} onChange={(e) => save({ theme: e.target.value as Settings['theme'] })}>
                  <option value="default">Current</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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

          <Section title="OPML">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ minWidth: 52 }}>Import</span>
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
        {message && <div className="muted" style={{ marginTop: 4 }}>{message}</div>}
      </div>
    </div>
  );
};
