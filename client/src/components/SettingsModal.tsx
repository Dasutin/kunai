import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Settings } from '@shared/types';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, background: 'rgba(255,255,255,0.02)' }}>
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
        <header>
          <h2 style={{ margin: 0 }}>Settings</h2>
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div style={{ display: 'grid', gap: 12 }}>
          <Section title="Preferences">
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
              <span>Refresh every (minutes):</span>
              <input
                className="input"
                style={{ maxWidth: 140 }}
                type="number"
                min={1}
                value={settings.refreshMinutes ?? 10}
                onChange={(e) => save({ refreshMinutes: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
          </Section>

          <Section title="OPML">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="file" accept=".opml,.xml,text/xml" onChange={(e) => handleFile(e.target.files?.[0])} />
              <button className="btn" onClick={exportOpml}>Export</button>
            </div>
            {importing && <div className="muted">Importing…</div>}
            {importResult && <div className="muted">{importResult}</div>}
          </Section>

          <Section title="Content fetching">
            <div className="muted">Always on. Server fetches readable content automatically.</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Max per refresh:</span>
              <input
                className="input"
                style={{ maxWidth: 120 }}
                type="number"
                value={settings.contentFetchMaxPerRefresh ?? 3}
                onChange={(e) => save({ contentFetchMaxPerRefresh: Number(e.target.value) || 0 })}
              />
            </div>
          </Section>
        </div>
        {message && <div className="muted">{message}</div>}
      </div>
    </div>
  );
};
