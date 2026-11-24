// Behaviour behind a reverse proxy (Railway): TRUST_PROXY must be set before the server module loads.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.TRUST_PROXY = '1';
const { openDb, tx } = await import('../lib/db.js');
const { hashPassword } = await import('../lib/auth.js');
const { createApp } = await import('../server.js');

let db; let server; let base;
before(async () => {
  db = openDb(':memory:');
  tx(db, () => db.prepare("INSERT INTO users (username, display_name, role, password_hash, created_at) VALUES ('staff1', 'S', 'staff', ?, 0)")
    .run(hashPassword('password123')));
  server = http.createServer(createApp(db));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const attempt = (fakeIp, password = 'wrong-password') => fetch(`${base}/login`, {
  method: 'POST', redirect: 'manual',
  headers: {
    'content-type': 'application/x-www-form-urlencoded',
    // The client controls the first entry; the proxy appends the real address last.
    'x-forwarded-for': `${fakeIp}, 203.0.113.7`,
    'x-forwarded-proto': 'https',
  },
  body: new URLSearchParams({ username: 'staff1', password }),
});

test('HTTPS responses carry HSTS and Secure cookies', async () => {
  const res = await attempt('1.1.1.1', 'password123');
  assert.match(res.headers.get('strict-transport-security'), /max-age=/);
  assert.match(res.headers.get('set-cookie'), /; Secure/);
});

test('failed logins for unknown usernames are not written to the audit log verbatim', async () => {
  await fetch(`${base}/login`, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': '198.51.100.1' },
    body: new URLSearchParams({ username: 'my-secret-password', password: 'x' }),
  });
  const row = db.prepare("SELECT detail FROM audit WHERE action = 'auth.login_failed' ORDER BY id DESC LIMIT 1").get();
  assert.doesNotMatch(row.detail, /my-secret-password/);
  assert.match(row.detail, /unknownUsername/);
});

test('rotating a spoofed X-Forwarded-For does not dodge the login rate limit', async () => {
  for (let i = 0; i < 10; i++) await attempt(`10.0.0.${i}`);
  const blocked = await attempt('10.0.0.99', 'password123'); // even the right password is refused now
  assert.equal(blocked.headers.get('location'), '/login?e=ratelimit');
});
