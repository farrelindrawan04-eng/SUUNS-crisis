// Database: one SQLite file. Schema, transactions and the hash-chained audit log live here.
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK (role IN ('staff', 'character')),
  password_hash TEXT    NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  frozen_until  INTEGER,             -- epoch ms; character is locked while now < frozen_until
  freeze_reason TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT    PRIMARY KEY,    -- sha256 of the cookie value; the raw token is never stored
  user_id    INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES users(id),
  title        TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'actioned', 'archived')),
  claimed_by   INTEGER REFERENCES users(id),
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  author_id  INTEGER NOT NULL REFERENCES users(id),
  body       TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY,
  author_id  INTEGER NOT NULL REFERENCES users(id),
  title      TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  removed_at INTEGER
);

CREATE TABLE IF NOT EXISTS comms (
  key        TEXT    PRIMARY KEY CHECK (key IN ('master', 'secure')),
  up         INTEGER NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  updated_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO comms (key, up, updated_at) VALUES ('master', 1, 0), ('secure', 1, 0);

CREATE TABLE IF NOT EXISTS audit (
  id        INTEGER PRIMARY KEY,
  at        INTEGER NOT NULL,
  actor_id  INTEGER,
  actor     TEXT    NOT NULL,
  action    TEXT    NOT NULL,
  target    TEXT,
  detail    TEXT    NOT NULL,        -- JSON
  prev_hash TEXT    NOT NULL,
  hash      TEXT    NOT NULL         -- sha256(prev_hash + this entry); editing any row breaks the chain
);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit
  BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit
  BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;

CREATE INDEX IF NOT EXISTS orders_by_character ON orders (character_id, updated_at);
CREATE INDEX IF NOT EXISTS messages_by_order   ON messages (order_id, id);
`;

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return db;
}

// Runs fn inside one transaction. Every mutation and its audit entry commit together or not at all.
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function hashEntry(prev, e) {
  return createHash('sha256')
    .update([prev, e.at, e.actor_id ?? '', e.actor, e.action, e.target ?? '', e.detail].join('\n'))
    .digest('hex');
}

export function audit(db, actor, action, target = null, detail = {}) {
  const last = db.prepare('SELECT hash FROM audit ORDER BY id DESC LIMIT 1').get();
  const prev = last ? last.hash : 'GENESIS';
  const entry = {
    at: Date.now(),
    actor_id: actor ? actor.id : null,
    actor: actor ? actor.username : 'anonymous',
    action,
    target: target == null ? null : String(target),
    detail: JSON.stringify(detail),
  };
  db.prepare(`INSERT INTO audit (at, actor_id, actor, action, target, detail, prev_hash, hash)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(entry.at, entry.actor_id, entry.actor, entry.action, entry.target, entry.detail, prev, hashEntry(prev, entry));
}

// Recomputes every hash from the start. Returns where the chain breaks, if it does.
export function verifyAudit(db) {
  let prev = 'GENESIS';
  let count = 0;
  for (const row of db.prepare('SELECT * FROM audit ORDER BY id').all()) {
    if (row.prev_hash !== prev || hashEntry(prev, row) !== row.hash) return { ok: false, count, brokenAt: row.id };
    prev = row.hash;
    count++;
  }
  return { ok: true, count, head: prev };
}

// Bumps whenever something visible changes. Browsers poll it to know when to refresh.
export function contentVersion(db) {
  return db.prepare("SELECT COALESCE(MAX(id), 0) AS v FROM audit WHERE action NOT LIKE 'auth.%'").get().v;
}

export function commsState(db) {
  const state = {};
  for (const row of db.prepare(`SELECT c.key, c.up, c.updated_at, u.display_name AS by_name
                                FROM comms c LEFT JOIN users u ON u.id = c.updated_by`).all()) {
    state[row.key] = { up: row.up === 1, updatedAt: row.updated_at, by: row.by_name };
  }
  return state;
}
