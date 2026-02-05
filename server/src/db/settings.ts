import { db } from './client.js';
import type { Settings } from '../../../shared/types.js';
import { env } from '../env.js';

export const settingsRepo = {
  getAll(): Settings {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const result: Settings = {};
    for (const row of rows) {
      switch (row.key) {
        case 'markReadOnOpen':
        case 'unreadFirstDefault':
        case 'contentFetchEnabled':
          (result as any)[row.key] = row.value === 'true';
          break;
        case 'defaultViewMode':
          (result as any)[row.key] = row.value === 'card' ? 'card' : 'list';
          break;
        case 'contentFetchMaxPerRefresh':
          (result as any)[row.key] = Number(row.value) || 0;
          break;
        case 'refreshMinutes':
          (result as any)[row.key] = Number(row.value) || env.refreshMinutes;
          break;
        case 'articleRetention':
          (result as any)[row.key] = ['1w', '1m', '1y', 'off'].includes(row.value) ? (row.value as any) : 'off';
          break;
        case 'theme':
          (result as any)[row.key] = ['default', 'light', 'dark'].includes(row.value) ? (row.value as any) : 'default';
          break;
        default:
          (result as any)[row.key] = row.value;
      }
    }
    if (result.refreshMinutes === undefined) {
      result.refreshMinutes = env.refreshMinutes;
    }
    if (!result.articleRetention) {
      result.articleRetention = 'off';
    }
    if (!result.theme) {
      result.theme = 'default';
    }
    return result;
  },

  update(settings: Settings) {
    const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    const tx = db.transaction(() => {
      for (const [key, val] of Object.entries(settings)) {
        stmt.run(key, String(val));
      }
    });
    tx();
  }
};
