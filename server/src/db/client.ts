import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { env } from '../env.js';

const dbPath = path.join(env.dataDir, 'rssreader.sqlite');

if (!fs.existsSync(env.dataDir)) {
  fs.mkdirSync(env.dataDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
