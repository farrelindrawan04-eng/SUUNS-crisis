// End-to-end tests against a real server and an in-memory database.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { openDb, tx, audit, verifyAudit } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';
import { createApp } from '../server.js';

let db; let server; let base;

function addUser(username, role) {
  return tx(db, () => Number(db.prepare('INSERT INTO users (username, display_name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(username, username.toUpperCase(), role, hashPassword('password123'), Date.now()).lastInsertRowid));
}

// A minimal browser: keeps the session cookie and reads the CSRF token from the last page.
class Client {
  constructor() { this.cookie = ''; this.csrf = ''; }
  async get(path) {
    const res = await fetch(base + path, { headers: { cookie: this.cookie }, redirect: 'manual' });
    const body = await res.text();
    const m = body.match(/name="csrf" value="([^"]+)"/);
    if (m) this.csrf = m[1];
    return { status: res.status, body, location: res.headers.get('location') };
  }
  async post(path, fields = {}, headers = {}) {
    const res = await fetch(base + path, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: this.cookie, ...headers },
      body: new URLSearchParams({ csrf: this.csrf, ...fields }),
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    return { status: res.status, location: res.headers.get('location'), body: await res.text() };
  }
  async login(username) {
    const r = await this.post('/login', { username, password: 'password123' });
    assert.equal(r.location, '/');
    await this.get(username.startsWith('staff') ? '/staff' : '/');
  }
}

before(async () => {
  db = openDb(':memory:');
  addUser('staff1', 'staff');
  addUser('staff2', 'staff');
  addUser('delegate1', 'character');
  addUser('delegate2', 'character');
  server = http.createServer(createApp(db));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('login rejects bad passwords and logs the attempt', async () => {
  const c = new Client();
  const r = await c.post('/login', { username: 'staff1', password: 'nope' });
  assert.equal(r.location, '/login?e=login');
  assert.ok(db.prepare("SELECT 1 FROM audit WHERE action = 'auth.login_failed'").get());
});

test('order lifecycle: create, thread, claim, action, archive', async () => {
  const delegate = new Client(); await delegate.login('delegate1');
  const staff = new Client(); await staff.login('staff1');

  const created = await delegate.post('/orders', { title: 'Close the border', body: 'Effective immediately.' });
  const id = created.location.match(/\/orders\/(\d+)/)[1];

  await staff.get(`/staff/orders/${id}`);
  assert.equal((await staff.post(`/staff/orders/${id}/claim`)).status, 303);
  await staff.post(`/staff/orders/${id}/messages`, { body: 'Acknowledged, on it.' });

  const page = await delegate.get(`/orders/${id}`);
  assert.match(page.body, /Acknowledged, on it\./);
  assert.match(page.body, /In progress/);

  await staff.post(`/staff/orders/${id}/action`);
  // Delegate follow-up on an actioned order puts it back in the queue.
  await delegate.post(`/orders/${id}/messages`, { body: 'One more thing.' });
  assert.equal(db.prepare('SELECT status FROM orders WHERE id = ?').get(id).status, 'claimed');

  await staff.post(`/staff/orders/${id}/archive`);
  const closed = await delegate.post(`/orders/${id}/messages`, { body: 'Hello?' });
  assert.match(closed.location, /e=closed/);
});

test("delegates can't read other delegates' orders", async () => {
  const a = new Client(); await a.login('delegate1');
  const b = new Client(); await b.login('delegate2');
  const id = (await a.post('/orders', { title: 'Private', body: 'secret' })).location.match(/\/orders\/(\d+)/)[1];
  assert.equal((await b.get(`/orders/${id}`)).status, 404);
});

test('delegates cannot use staff routes', async () => {
  const d = new Client(); await d.login('delegate1');
  assert.equal((await d.get('/staff/audit')).status, 403);
  assert.equal((await d.post('/staff/comms', { key: 'master', up: '0' })).status, 403);
});

test('SECURE COMMS down hides and blocks orders; MASTER COMMS down hides everything', async () => {
  const staff = new Client(); await staff.login('staff1');
  const d = new Client(); await d.login('delegate1');

  await staff.post('/staff/comms', { key: 'secure', up: '0' });
  const home = await d.get('/');
  assert.match(home.body, /SECURE COMMS OFFLINE/);
  assert.doesNotMatch(home.body, /Close the border/);
  assert.match((await d.post('/orders', { title: 'x', body: 'y' })).location, /e=secure/);
  await staff.post('/staff/comms', { key: 'secure', up: '1' });

  await staff.post('/staff/posts', { title: 'Curfew in effect', body: 'Stay indoors.' });
  await staff.post('/staff/comms', { key: 'master', up: '0' });
  assert.match((await d.get('/')).body, /MASTER COMMS OFFLINE/);
  const pub = await new Client().get('/updates');
  assert.doesNotMatch(pub.body, /Curfew in effect/);
  assert.doesNotMatch((await new Client().get('/projector')).body, /Curfew in effect/);
  await staff.post('/staff/comms', { key: 'master', up: '1' });
  assert.match((await new Client().get('/updates')).body, /Curfew in effect/);
});

test('freeze locks a delegate with a countdown, unfreeze restores access', async () => {
  const staff = new Client(); await staff.login('staff1');
  const d = new Client(); await d.login('delegate2');
  const id = db.prepare("SELECT id FROM users WHERE username = 'delegate2'").get().id;

  await staff.get('/staff/accounts');
  await staff.post(`/staff/accounts/${id}/freeze`, { minutes: '5', reason: 'Spreading rumours' });
  const frozen = await d.get('/');
  assert.match(frozen.body, /ACCOUNT FROZEN/);
  assert.match(frozen.body, /data-remaining="\d+"/);
  assert.match(frozen.body, /Spreading rumours/);
  assert.match((await d.post('/orders', { title: 'x', body: 'y' })).location, /e=frozen/);

  await staff.post(`/staff/accounts/${id}/unfreeze`);
  assert.doesNotMatch((await d.get('/')).body, /ACCOUNT FROZEN/);
});

test('CSRF token and origin are enforced', async () => {
  const staff = new Client(); await staff.login('staff1');
  staff.csrf = 'forged';
  assert.equal((await staff.post('/staff/comms', { key: 'master', up: '0' })).status, 403);
  await staff.get('/staff');
  assert.equal((await staff.post('/staff/comms', { key: 'master', up: '0' }, { origin: 'https://evil.example' })).status, 403);
  assert.equal(db.prepare("SELECT up FROM comms WHERE key = 'master'").get().up, 1);
});

test('output is HTML-escaped', async () => {
  const d = new Client(); await d.login('delegate1');
  const r = await d.post('/orders', { title: '<script>alert(1)</script>', body: '<img src=x onerror=alert(1)>' });
  const page = await d.get(r.location.split('?')[0]);
  assert.doesNotMatch(page.body, /<script>alert/);
  assert.match(page.body, /&lt;script&gt;alert/);
});

test('audit log is complete, append-only and hash-chained', async () => {
  const actions = db.prepare('SELECT DISTINCT action FROM audit').all().map((r) => r.action);
  for (const a of ['auth.login', 'order.create', 'order.claim', 'order.message', 'order.action', 'order.archive',
    'comms.set', 'post.create', 'account.freeze', 'account.unfreeze']) {
    assert.ok(actions.includes(a), `missing ${a}`);
  }
  assert.equal(verifyAudit(db).ok, true);
  assert.throws(() => db.exec("UPDATE audit SET actor = 'someone-else' WHERE id = 1"), /append-only/);
  assert.throws(() => db.exec('DELETE FROM audit WHERE id = 1'), /append-only/);

  const staff = new Client(); await staff.login('staff1');
  const csv = await staff.get('/staff/audit.csv');
  assert.match(csv.body, /^"?id"?,/);
  assert.match(csv.body, /order\.create/);
});

test('tampering is detected by chain verification', () => {
  const copy = openDb(':memory:');
  tx(copy, () => { audit(copy, null, 'a.one'); audit(copy, null, 'a.two'); audit(copy, null, 'a.three'); });
  copy.exec('DROP TRIGGER audit_no_update');
  copy.exec("UPDATE audit SET detail = '{\"x\":1}' WHERE id = 2");
  assert.deepEqual(verifyAudit(copy), { ok: false, count: 1, brokenAt: 2 });
});
