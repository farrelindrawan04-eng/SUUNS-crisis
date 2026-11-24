// Create an account from the command line (for the first staff account, or bulk setup).
// Usage: npm run create-user -- --role staff --username alex --name "Alex (Control)" --password 'long-password'
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { openDb, tx, audit } from '../lib/db.js';
import { hashPassword, USERNAME_RE, MIN_PASSWORD } from '../lib/auth.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: {
    role: { type: 'string', default: 'staff' },
    username: { type: 'string' },
    name: { type: 'string' },
    password: { type: 'string' },
  },
});

const fail = (msg) => { console.error(msg); process.exit(1); };
if (!['staff', 'character'].includes(values.role)) fail('--role must be staff or character');
if (!values.username || !USERNAME_RE.test(values.username)) fail('--username: 2–32 letters, numbers, dots, dashes or underscores');
if (!values.password || values.password.length < MIN_PASSWORD) fail(`--password must be at least ${MIN_PASSWORD} characters`);

const db = openDb(process.env.DB_FILE || path.join(ROOT, 'data', 'comms.db'));
if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(values.username)) fail(`User "${values.username}" already exists`);
tx(db, () => {
  const id = Number(db.prepare('INSERT INTO users (username, display_name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(values.username, values.name || values.username, values.role, hashPassword(values.password), Date.now()).lastInsertRowid);
  audit(db, null, 'system.create_user', `user:${id}`, { username: values.username, role: values.role, via: 'cli' });
});
console.log(`Created ${values.role} account "${values.username}".`);
