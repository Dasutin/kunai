import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const resolveMigrationsDir = () => {
  const candidates = [
    path.resolve(__dirname, '../../../migrations'), // runtime image: /app/migrations
    path.resolve(__dirname, '../../migrations'), // dev tsx: dist-adjacent
    path.resolve(process.cwd(), 'server', 'migrations') // source run
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`Migrations directory not found. Looked in: ${candidates.join(', ')}`);
  }
  return found;
};

const migrationsDir = resolveMigrationsDir();

type Migration = { id: number; name: string; sql: string };

const loadMigrations = (): Migration[] => {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.match(/^\d+_.+\.sql$/))
    .sort();
  return files.map((file) => {
    const id = Number(file.split('_')[0]);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    return { id, name: file, sql };
  });
};

export const applyMigrations = (db: Database) => {
  const migrations = loadMigrations();
  const currentVersionRaw = db.pragma('user_version', { simple: true }) as number;
  const currentVersion = Number.isFinite(currentVersionRaw) ? currentVersionRaw : 0;

  const pending = migrations.filter((m) => m.id > currentVersion);
  for (const migration of pending) {
    db.transaction(() => {
      db.exec(migration.sql);
      db.pragma(`user_version = ${migration.id}`);
    })();
    console.log(`Applied migration ${migration.name} from ${migrationsDir}`);
  }
  if (!pending.length) {
    console.log(`No migrations to apply. Current version: ${currentVersion}. Using dir: ${migrationsDir}`);
  }
};
