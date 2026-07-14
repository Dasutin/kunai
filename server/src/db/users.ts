import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { db } from './client.js';
import type { UserProfile } from '../../../shared/types.js';

const scrypt = promisify(scryptCallback);
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;

type UserRow = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  profileImage: string | null;
  createdAt: string;
};

const toProfile = (row: UserRow): UserProfile => ({
  id: row.id,
  email: row.email,
  name: row.name,
  profileImage: row.profileImage,
  createdAt: row.createdAt
});

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString('base64url');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString('base64url')}`;
};

const verifyPassword = async (password: string, storedHash: string) => {
  const [algorithm, salt, expected] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expectedBuffer = Buffer.from(expected, 'base64url');
  return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived);
};

export const usersRepo = {
  async create(email: string, name: string, password: string) {
    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const legacySettings = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;

    db.transaction(() => {
      db.prepare('INSERT INTO users (id, email, name, passwordHash, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
        id,
        email,
        name,
        passwordHash,
        now,
        now
      );
      const settingStmt = db.prepare('INSERT INTO user_settings (userId, key, value) VALUES (?, ?, ?)');
      for (const setting of legacySettings) settingStmt.run(id, setting.key, setting.value);
    })();

    return this.findById(id)!;
  },

  findByEmail(email: string) {
    const row = db.prepare('SELECT id, email, name, passwordHash, profileImage, createdAt FROM users WHERE email = ? COLLATE NOCASE').get(email) as UserRow | undefined;
    return row;
  },

  findById(id: string) {
    const row = db.prepare('SELECT id, email, name, passwordHash, profileImage, createdAt FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? toProfile(row) : null;
  },

  async authenticate(email: string, password: string) {
    const user = this.findByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
    return toProfile(user);
  },

  createSession(userId: string) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();
    db.prepare('DELETE FROM user_sessions WHERE expiresAt <= ?').run(new Date().toISOString());
    db.prepare('INSERT INTO user_sessions (tokenHash, userId, expiresAt) VALUES (?, ?, ?)').run(tokenHash(token), userId, expiresAt);
    return { token, expiresAt };
  },

  findSession(token: string) {
    const row = db
      .prepare(
        `SELECT u.id, u.email, u.name, u.passwordHash, u.profileImage, u.createdAt
         FROM user_sessions s JOIN users u ON u.id = s.userId
         WHERE s.tokenHash = ? AND s.expiresAt > ?`
      )
      .get(tokenHash(token), new Date().toISOString()) as UserRow | undefined;
    return row ? toProfile(row) : null;
  },

  deleteSession(token: string) {
    db.prepare('DELETE FROM user_sessions WHERE tokenHash = ?').run(tokenHash(token));
  },

  updateProfile(userId: string, updates: { name?: string; email?: string; profileImage?: string | null }) {
    const current = this.findById(userId);
    if (!current) return null;
    db.prepare('UPDATE users SET name = ?, email = ?, profileImage = ?, updatedAt = ? WHERE id = ?').run(
      updates.name ?? current.name,
      updates.email ?? current.email,
      updates.profileImage === undefined ? current.profileImage : updates.profileImage,
      new Date().toISOString(),
      userId
    );
    return this.findById(userId);
  },

  async changePassword(userId: string, currentPassword: string, nextPassword: string) {
    const user = db.prepare('SELECT passwordHash FROM users WHERE id = ?').get(userId) as Pick<UserRow, 'passwordHash'> | undefined;
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return false;
    db.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?').run(await hashPassword(nextPassword), new Date().toISOString(), userId);
    return true;
  }
};
