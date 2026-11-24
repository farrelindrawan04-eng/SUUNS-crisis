// Password hashing (scrypt) and session tokens. Uses only node:crypto.
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
}

const DUMMY = hashPassword('timing-equaliser');

// Pass stored = null for unknown users so the response time does not reveal which usernames exist.
export function checkPassword(password, stored) {
  const [, salt, hash] = (stored || DUMMY).split('$');
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), 64);
  const expected = Buffer.from(hash, 'hex');
  return Boolean(stored) && actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const newToken = () => randomBytes(32).toString('base64url');

// Per-session form token: derived from the session token, so nothing extra is stored.
export const csrfFor = (token) => sha256(`csrf:${token}`).slice(0, 40);

export const USERNAME_RE = /^[a-z0-9_.-]{2,32}$/i;
export const MIN_PASSWORD = 8;
