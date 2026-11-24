// SUUNS Comms: HTTP server and every route. No framework; read top to bottom.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, tx, audit, verifyAudit, contentVersion, commsState } from './lib/db.js';
import { hashPassword, checkPassword, newToken, csrfFor, sha256, USERNAME_RE, MIN_PASSWORD } from './lib/auth.js';
import * as V from './lib/views.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIN = 60_000;
const SESSION_MS = 12 * 60 * MIN;
const MAX_BODY = 64 * 1024;
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
class Redirect extends Error { constructor(location) { super('redirect'); this.location = location; } }
const go = (location, query = {}) => {
  const qs = new URLSearchParams(query).toString();
  return new Redirect(qs ? `${location}?${qs}` : location);
};

const STATIC = {
  '/static/app.css': ['text/css; charset=utf-8', fs.readFileSync(path.join(ROOT, 'public/app.css'))],
  '/static/app.js': ['text/javascript; charset=utf-8', fs.readFileSync(path.join(ROOT, 'public/app.js'))],
  '/static/orcrist.js': ['text/javascript; charset=utf-8', fs.readFileSync(path.join(ROOT, 'public/orcrist.js'))],
};

export function createApp(db) {
  const routes = [];
  const route = (method, pattern, handler) => routes.push({
    method, handler, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`),
  });

  // ---------- helpers ----------
  const now = () => Date.now();
  const comms = () => commsState(db);
  const version = () => contentVersion(db);
  const isFrozen = (u) => u.role === 'character' && u.frozen_until != null && u.frozen_until > now();
  const userById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  function requireUser(ctx) { if (!ctx.user) throw go('/login'); return ctx.user; }
  function requireStaff(ctx) {
    requireUser(ctx);
    if (ctx.user.role !== 'staff') throw new HttpError(403, 'Staff only.');
    return ctx.user;
  }
  function requireCharacter(ctx) {
    requireUser(ctx);
    if (ctx.user.role !== 'character') throw go('/staff');
    return ctx.user;
  }
  // What is blocking this character right now, if anything. Order matters: freeze, then master, then secure.
  function characterBlock(user, state = comms()) {
    if (isFrozen(user)) return 'frozen';
    if (!state.master.up) return 'master';
    if (!state.secure.up) return 'secure';
    return null;
  }
  function text(ctx, name, { max, min = 1 } = {}) {
    const value = (ctx.form.get(name) || '').trim();
    if (value.length < min) throw new HttpError(400, 'empty');
    if (max && value.length > max) throw new HttpError(400, 'toolong');
    return value;
  }
  const page = (ctx, status, body) => send(ctx.res, status, 'text/html; charset=utf-8', String(body));

  function loadOrder(id) {
    return db.prepare(`
      SELECT o.*, c.display_name AS character_name, c.username AS character_username, s.display_name AS claimed_name
      FROM orders o JOIN users c ON c.id = o.character_id LEFT JOIN users s ON s.id = o.claimed_by
      WHERE o.id = ?`).get(Number(id));
  }
  function loadThread(orderId) {
    return db.prepare(`
      SELECT m.*, u.display_name AS author_name, u.role AS author_role
      FROM messages m JOIN users u ON u.id = m.author_id WHERE m.order_id = ? ORDER BY m.id`).all(orderId);
  }
  function listOrders(where, params) {
    return db.prepare(`
      SELECT o.*, c.display_name AS character_name, s.display_name AS claimed_name,
        (SELECT COUNT(*) FROM messages m WHERE m.order_id = o.id) AS message_count,
        (SELECT body FROM messages m WHERE m.order_id = o.id ORDER BY m.id DESC LIMIT 1) AS last_body,
        (SELECT u.role FROM messages m JOIN users u ON u.id = m.author_id
           WHERE m.order_id = o.id ORDER BY m.id DESC LIMIT 1) AS last_role
      FROM orders o JOIN users c ON c.id = o.character_id LEFT JOIN users s ON s.id = o.claimed_by
      WHERE ${where} ORDER BY o.updated_at DESC`).all(...params);
  }
  const livePosts = (limit = 100) => db.prepare(`
      SELECT p.*, u.display_name AS author_name FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.removed_at IS NULL ORDER BY p.id DESC LIMIT ?`).all(limit);

  // ---------- auth ----------
  const attempts = new Map(); // ip -> { n, since }
  // Drop stale entries so a flood of addresses can't grow this map forever.
  setInterval(() => {
    for (const [ip, a] of attempts) if (now() - a.since > 15 * MIN) attempts.delete(ip);
  }, 5 * MIN).unref();
  function rateLimited(ip) {
    const a = attempts.get(ip);
    if (a && now() - a.since > 15 * MIN) { attempts.delete(ip); return false; }
    return Boolean(a && a.n >= 10);
  }
  function noteFailure(ip) {
    const a = attempts.get(ip) || { n: 0, since: now() };
    a.n++;
    attempts.set(ip, a);
  }

  route('GET', '/login', (ctx) => {
    if (ctx.user) throw go('/');
    page(ctx, 200, V.loginPage(ctx));
  });

  route('POST', '/login', (ctx) => {
    const ip = clientIp(ctx.req);
    if (rateLimited(ip)) throw go('/login', { e: 'ratelimit' });
    const username = (ctx.form.get('username') || '').trim();
    const password = ctx.form.get('password') || '';
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
    if (!checkPassword(password, user ? user.password_hash : null)) {
      noteFailure(ip);
      // Only name real accounts: an unknown "username" is often a password typed into the wrong box.
      const who = user ? { username: user.username } : { unknownUsername: true };
      tx(db, () => audit(db, null, 'auth.login_failed', user ? `user:${user.id}` : null, { ...who, ip }));
      throw go('/login', { e: 'login' });
    }
    attempts.delete(ip);
    const token = newToken();
    tx(db, () => {
      db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
        .run(sha256(token), user.id, now() + SESSION_MS);
      audit(db, user, 'auth.login', `user:${user.id}`, { ip });
    });
    ctx.res.setHeader('Set-Cookie', cookie(ctx.req, 'sid', token, SESSION_MS / 1000));
    throw go('/');
  });

  route('POST', '/logout', (ctx) => {
    if (ctx.user) {
      tx(db, () => {
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(ctx.token));
        audit(db, ctx.user, 'auth.logout', `user:${ctx.user.id}`);
      });
    }
    ctx.res.setHeader('Set-Cookie', cookie(ctx.req, 'sid', '', 0));
    throw go('/login');
  });

  // ---------- public ----------
  route('GET', '/', (ctx) => {
    const user = requireUser(ctx);
    if (user.role === 'staff') throw go('/staff');
    const state = comms();
    const block = characterBlock(user, state);
    if (block === 'frozen') return page(ctx, 200, V.frozenPage(ctx, user, version()));
    if (block === 'master') return page(ctx, 200, V.blackoutPage(ctx, state, version()));
    const orders = block === 'secure' ? [] : listOrders('o.character_id = ?', [user.id]);
    page(ctx, 200, V.characterHome(ctx, { state, orders, posts: livePosts(5), version: version() }));
  });

  route('GET', '/updates', (ctx) => {
    const state = comms();
    if (!state.master.up && ctx.user?.role !== 'staff') return page(ctx, 200, V.blackoutPage(ctx, state, version()));
    page(ctx, 200, V.updatesPage(ctx, { state, posts: livePosts(), version: version() }));
  });

  route('GET', '/projector', (ctx) => {
    const state = comms();
    page(ctx, 200, V.projectorPage({ state, posts: state.master.up ? livePosts(3) : [], version: version() }));
  });

  route('GET', '/api/version', (ctx) => send(ctx.res, 200, 'application/json', JSON.stringify({ v: version() })));
  route('GET', '/healthz', (ctx) => send(ctx.res, 200, 'text/plain', 'ok'));

  // ---------- character orders ----------
  route('POST', '/orders', (ctx) => {
    const user = requireCharacter(ctx);
    const block = characterBlock(user);
    if (block) throw go('/', { e: block });
    const title = text(ctx, 'title', { max: 120 });
    const body = text(ctx, 'body', { max: 4000 });
    const id = tx(db, () => {
      const t = now();
      const orderId = Number(db.prepare('INSERT INTO orders (character_id, title, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run(user.id, title, t, t).lastInsertRowid);
      db.prepare('INSERT INTO messages (order_id, author_id, body, created_at) VALUES (?, ?, ?, ?)').run(orderId, user.id, body, t);
      audit(db, user, 'order.create', `order:${orderId}`, { title, body });
      return orderId;
    });
    throw go(`/orders/${id}`, { n: 'sent' });
  });

  route('GET', '/orders/:id', (ctx) => {
    const user = requireCharacter(ctx);
    if (characterBlock(user)) throw go('/');
    const order = loadOrder(ctx.params.id);
    if (!order || order.character_id !== user.id) throw new HttpError(404, 'Order not found.');
    page(ctx, 200, V.characterOrderPage(ctx, { state: comms(), order, thread: loadThread(order.id), version: version() }));
  });

  route('POST', '/orders/:id/messages', (ctx) => {
    const user = requireCharacter(ctx);
    const block = characterBlock(user);
    if (block) throw go('/', { e: block });
    const order = loadOrder(ctx.params.id);
    if (!order || order.character_id !== user.id) throw new HttpError(404, 'Order not found.');
    if (order.status === 'archived') throw go(`/orders/${order.id}`, { e: 'closed' });
    const body = text(ctx, 'body', { max: 4000 });
    tx(db, () => {
      const t = now();
      db.prepare('INSERT INTO messages (order_id, author_id, body, created_at) VALUES (?, ?, ?, ?)').run(order.id, user.id, body, t);
      // A reply to an actioned order puts it back in the staff queue.
      const status = order.status === 'actioned' ? (order.claimed_by ? 'claimed' : 'open') : order.status;
      db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, t, order.id);
      audit(db, user, 'order.message', `order:${order.id}`, { body, ...(status !== order.status ? { reopened: status } : {}) });
    });
    throw go(`/orders/${order.id}`, { n: 'sent' });
  });

  // ---------- staff: orders + comms ----------
  const TABS = {
    open: ["o.status = 'open'", () => []],
    claimed: ["o.status = 'claimed'", () => []],
    mine: ["o.status = 'claimed' AND o.claimed_by = ?", (u) => [u.id]],
    actioned: ["o.status = 'actioned'", () => []],
    archived: ["o.status = 'archived'", () => []],
  };

  route('GET', '/staff', (ctx) => {
    const user = requireStaff(ctx);
    const tab = TABS[ctx.query.get('tab')] ? ctx.query.get('tab') : 'open';
    const counts = {};
    for (const [key, [where, params]] of Object.entries(TABS)) {
      counts[key] = db.prepare(`SELECT COUNT(*) AS n FROM orders o WHERE ${where}`).get(...params(user)).n;
    }
    const orders = listOrders(TABS[tab][0], TABS[tab][1](user));
    page(ctx, 200, V.staffHome(ctx, { state: comms(), tab, counts, orders, version: version() }));
  });

  route('GET', '/staff/orders/:id', (ctx) => {
    requireStaff(ctx);
    const order = loadOrder(ctx.params.id);
    if (!order) throw new HttpError(404, 'Order not found.');
    page(ctx, 200, V.staffOrderPage(ctx, { state: comms(), order, thread: loadThread(order.id), version: version() }));
  });

  route('POST', '/staff/orders/:id/messages', (ctx) => {
    const user = requireStaff(ctx);
    const order = loadOrder(ctx.params.id);
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.status === 'archived') throw go(`/staff/orders/${order.id}`, { e: 'closed' });
    const body = text(ctx, 'body', { max: 4000 });
    tx(db, () => {
      const t = now();
      db.prepare('INSERT INTO messages (order_id, author_id, body, created_at) VALUES (?, ?, ?, ?)').run(order.id, user.id, body, t);
      db.prepare('UPDATE orders SET updated_at = ? WHERE id = ?').run(t, order.id);
      audit(db, user, 'order.message', `order:${order.id}`, { body });
    });
    throw go(`/staff/orders/${order.id}`, { n: 'sent' });
  });

  // Allowed ticket transitions: op -> [statuses it may start from, resulting status, new claimed_by]
  const TRANSITIONS = {
    claim: [['open', 'claimed'], 'claimed', (u) => u.id],
    unclaim: [['claimed'], 'open', () => null],
    action: [['open', 'claimed'], 'actioned', (u, o) => o.claimed_by ?? u.id],
    archive: [['open', 'claimed', 'actioned'], 'archived', (u, o) => o.claimed_by],
    reopen: [['actioned', 'archived'], 'open', () => null],
  };

  route('POST', '/staff/orders/:id/:op', (ctx) => {
    const user = requireStaff(ctx);
    const rule = TRANSITIONS[ctx.params.op];
    if (!rule) throw new HttpError(404, 'Unknown action.');
    const order = loadOrder(ctx.params.id);
    if (!order) throw new HttpError(404, 'Order not found.');
    const [from, to, claimer] = rule;
    if (!from.includes(order.status)) throw go(`/staff/orders/${order.id}`, { e: 'state' });
    if (ctx.params.op === 'claim' && order.claimed_by === user.id) throw go(`/staff/orders/${order.id}`);
    const claimedBy = claimer(user, order);
    tx(db, () => {
      db.prepare('UPDATE orders SET status = ?, claimed_by = ?, updated_at = ? WHERE id = ?').run(to, claimedBy, now(), order.id);
      audit(db, user, `order.${ctx.params.op}`, `order:${order.id}`, {
        from: order.status, to, ...(order.claimed_by && order.claimed_by !== claimedBy ? { previousClaim: order.claimed_name } : {}),
      });
    });
    const backTo = ctx.form.get('back') === 'queue' ? '/staff' : `/staff/orders/${order.id}`;
    throw go(backTo, { n: ctx.params.op });
  });

  route('POST', '/staff/comms', (ctx) => {
    const user = requireStaff(ctx);
    const key = ctx.form.get('key');
    if (key !== 'master' && key !== 'secure') throw new HttpError(400, 'Unknown channel.');
    const up = ctx.form.get('up') === '1' ? 1 : 0;
    tx(db, () => {
      db.prepare('UPDATE comms SET up = ?, updated_by = ?, updated_at = ? WHERE key = ?').run(up, user.id, now(), key);
      audit(db, user, 'comms.set', `comms:${key}`, { up: Boolean(up) });
    });
    throw go(ctx.form.get('back') === 'comms' ? '/staff/comms' : '/staff', { n: 'comms' });
  });

  route('GET', '/staff/comms', (ctx) => {
    requireStaff(ctx);
    page(ctx, 200, V.staffCommsPage(ctx, { state: comms(), version: version() }));
  });

  // ---------- staff: posts ----------
  route('GET', '/staff/posts', (ctx) => {
    requireStaff(ctx);
    page(ctx, 200, V.staffPostsPage(ctx, { state: comms(), posts: livePosts(), version: version() }));
  });

  route('POST', '/staff/posts', (ctx) => {
    const user = requireStaff(ctx);
    const title = text(ctx, 'title', { max: 140 });
    const body = text(ctx, 'body', { max: 6000 });
    tx(db, () => {
      const id = Number(db.prepare('INSERT INTO posts (author_id, title, body, created_at) VALUES (?, ?, ?, ?)')
        .run(user.id, title, body, now()).lastInsertRowid);
      audit(db, user, 'post.create', `post:${id}`, { title, body });
    });
    throw go('/staff/posts', { n: 'posted' });
  });

  route('POST', '/staff/posts/:id/remove', (ctx) => {
    const user = requireStaff(ctx);
    const post = db.prepare('SELECT * FROM posts WHERE id = ? AND removed_at IS NULL').get(Number(ctx.params.id));
    if (!post) throw go('/staff/posts');
    tx(db, () => {
      db.prepare('UPDATE posts SET removed_at = ? WHERE id = ?').run(now(), post.id);
      audit(db, user, 'post.remove', `post:${post.id}`, { title: post.title });
    });
    throw go('/staff/posts', { n: 'removed' });
  });

  // ---------- staff: accounts ----------
  route('GET', '/staff/accounts', (ctx) => {
    requireStaff(ctx);
    const users = db.prepare('SELECT * FROM users ORDER BY role, active DESC, display_name COLLATE NOCASE').all();
    page(ctx, 200, V.accountsPage(ctx, { state: comms(), users, version: version(), now: now() }));
  });

  route('POST', '/staff/accounts', (ctx) => {
    const user = requireStaff(ctx);
    const username = text(ctx, 'username', { max: 32 });
    const displayName = text(ctx, 'display_name', { max: 60 });
    const role = ctx.form.get('role') === 'staff' ? 'staff' : 'character';
    const password = ctx.form.get('password') || '';
    if (!USERNAME_RE.test(username)) throw go('/staff/accounts', { e: 'username' });
    if (password.length < MIN_PASSWORD) throw go('/staff/accounts', { e: 'badpw' });
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw go('/staff/accounts', { e: 'taken' });
    tx(db, () => {
      const id = Number(db.prepare('INSERT INTO users (username, display_name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(username, displayName, role, hashPassword(password), now()).lastInsertRowid);
      audit(db, user, 'account.create', `user:${id}`, { username, displayName, role });
    });
    throw go('/staff/accounts', { n: 'created' });
  });

  route('POST', '/staff/accounts/:id/:op', (ctx) => {
    const actor = requireStaff(ctx);
    const target = userById(Number(ctx.params.id));
    if (!target) throw new HttpError(404, 'Account not found.');
    const op = ctx.params.op;
    const t = now();
    const ref = `user:${target.id}`;
    const who = { username: target.username };
    const killSessions = () => db.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id);

    if (op === 'freeze') {
      if (target.role !== 'character') throw go('/staff/accounts', { e: 'notchar' });
      const minutes = Number(ctx.form.get('minutes'));
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw go('/staff/accounts', { e: 'minutes' });
      const reason = (ctx.form.get('reason') || '').trim().slice(0, 200);
      tx(db, () => {
        db.prepare('UPDATE users SET frozen_until = ?, freeze_reason = ? WHERE id = ?').run(t + minutes * MIN, reason || null, target.id);
        audit(db, actor, 'account.freeze', ref, { ...who, minutes, reason, until: new Date(t + minutes * MIN).toISOString() });
      });
    } else if (op === 'unfreeze') {
      tx(db, () => {
        db.prepare('UPDATE users SET frozen_until = NULL, freeze_reason = NULL WHERE id = ?').run(target.id);
        audit(db, actor, 'account.unfreeze', ref, who);
      });
    } else if (op === 'password') {
      const password = ctx.form.get('password') || '';
      if (password.length < MIN_PASSWORD) throw go('/staff/accounts', { e: 'badpw' });
      tx(db, () => {
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), target.id);
        if (target.id !== actor.id) killSessions();
        audit(db, actor, 'account.password_reset', ref, who);
      });
    } else if (op === 'deactivate' || op === 'reactivate') {
      if (target.id === actor.id) throw go('/staff/accounts', { e: 'self' });
      tx(db, () => {
        db.prepare('UPDATE users SET active = ? WHERE id = ?').run(op === 'reactivate' ? 1 : 0, target.id);
        if (op === 'deactivate') killSessions();
        audit(db, actor, `account.${op}`, ref, who);
      });
    } else {
      throw new HttpError(404, 'Unknown action.');
    }
    throw go('/staff/accounts', { n: op });
  });

  // ---------- staff: audit ----------
  function auditRows(q) {
    if (!q) return db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 500').all();
    const like = `%${q}%`;
    return db.prepare(`SELECT * FROM audit WHERE actor LIKE ? OR action LIKE ? OR target LIKE ? OR detail LIKE ?
                       ORDER BY id DESC LIMIT 500`).all(like, like, like, like);
  }

  route('GET', '/staff/audit', (ctx) => {
    requireStaff(ctx);
    const q = (ctx.query.get('q') || '').trim().slice(0, 100);
    page(ctx, 200, V.auditPage(ctx, { state: comms(), rows: auditRows(q), q, chain: verifyAudit(db), version: version() }));
  });

  route('GET', '/staff/audit.csv', (ctx) => {
    requireStaff(ctx);
    const cell = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheets from running cell contents as formulas
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [['id', 'time_utc', 'actor', 'action', 'target', 'detail', 'prev_hash', 'hash'].join(',')];
    for (const r of db.prepare('SELECT * FROM audit ORDER BY id').all()) {
      lines.push([r.id, new Date(r.at).toISOString(), r.actor, r.action, r.target, r.detail, r.prev_hash, r.hash].map(cell).join(','));
    }
    ctx.res.setHeader('Content-Disposition', `attachment; filename="suuns-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
    send(ctx.res, 200, 'text/csv; charset=utf-8', `${lines.join('\n')}\n`);
  });

  // ---------- request pipeline ----------
  function loadSession(ctx) {
    const token = parseCookies(ctx.req.headers.cookie).sid;
    if (!token) return;
    const user = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
                             WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`).get(sha256(token), now());
    if (!user) return;
    ctx.user = user;
    ctx.token = token;
    ctx.csrf = csrfFor(token);
  }

  return async function handle(req, res) {
    const url = new URL(req.url, 'http://local');
    const ctx = { req, res, url, query: url.searchParams, params: {}, user: null };
    securityHeaders(res);
    if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000'); // browsers stay on HTTPS
    try {
      if (req.method === 'GET' && STATIC[url.pathname]) {
        const [type, body] = STATIC[url.pathname];
        res.setHeader('Cache-Control', 'no-cache'); // tiny files; always revalidate so deploys show up immediately
        return send(res, 200, type, body);
      }
      loadSession(ctx);
      if (req.method === 'POST') {
        if (!sameOrigin(req)) throw new HttpError(403, 'Cross-site request blocked.');
        ctx.form = new URLSearchParams(await readBody(req));
        if (ctx.user && ctx.form.get('csrf') !== ctx.csrf) throw new HttpError(403, 'Your form expired. Go back, reload the page and try again.');
      }
      const match = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
      if (!match) throw new HttpError(404, 'Page not found.');
      ctx.params = url.pathname.match(match.re).groups || {};
      await match.handler(ctx);
    } catch (error) {
      if (error instanceof Redirect) {
        res.writeHead(303, { Location: error.location });
        return res.end();
      }
      if (error instanceof HttpError) {
        // Validation failures from text() redirect back to the form that sent them.
        if (error.status === 400 && (error.message === 'empty' || error.message === 'toolong')) {
          const ref = safeReferer(req);
          if (ref) { res.writeHead(303, { Location: `${ref}?e=${error.message}` }); return res.end(); }
        }
        return page(ctx, error.status, V.errorPage(ctx, error.status, error.message));
      }
      console.error(error);
      page(ctx, 500, V.errorPage(ctx, 500, 'Something went wrong on the server.'));
    }
  };
}

// ---------- plumbing ----------
function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function securityHeaders(res) {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookie(req, name, value, maxAgeSeconds) {
  const secure = process.env.COOKIE_SECURE === '1' || isHttps(req);
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeSeconds)}${secure ? '; Secure' : ''}`;
}

function isHttps(req) {
  return TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https';
}

function clientIp(req) {
  // Use the LAST address: it's the one our proxy added. Earlier entries are whatever the client sent,
  // so trusting the first one would let an attacker fake a new IP per guess and dodge the rate limit.
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return req.headers['x-forwarded-for'].split(',').pop().trim();
  return req.socket.remoteAddress || 'unknown';
}

// The host the browser actually used. Behind a proxy (Railway), trust X-Forwarded-Host too.
function allowedHosts(req) {
  const hosts = [req.headers.host];
  if (TRUST_PROXY && req.headers['x-forwarded-host']) hosts.push(req.headers['x-forwarded-host'].split(',')[0].trim());
  return hosts;
}

// Browsers always send Origin on form POSTs; a mismatch means another site is submitting the form.
function sameOrigin(req) {
  const source = req.headers.origin || req.headers.referer;
  if (!source) return true; // non-browser clients; logged-in routes still require the CSRF token
  try { return allowedHosts(req).includes(new URL(source).host); } catch { return false; }
}

function safeReferer(req) {
  try {
    const ref = new URL(req.headers.referer);
    return allowedHosts(req).includes(ref.host) ? ref.pathname : null;
  } catch { return null; }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'That submission is too large.')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// First boot: create a staff account from env vars if there is no staff yet.
export function bootstrap(db) {
  const { BOOTSTRAP_USERNAME: username, BOOTSTRAP_PASSWORD: password, BOOTSTRAP_NAME: name } = process.env;
  const hasStaff = db.prepare("SELECT 1 FROM users WHERE role = 'staff' AND active = 1").get();
  if (hasStaff) return;
  if (!username || !password || password.length < MIN_PASSWORD) {
    console.warn('No staff accounts yet. Set BOOTSTRAP_USERNAME and BOOTSTRAP_PASSWORD (8+ chars), or run: npm run create-user');
    return;
  }
  // If that username exists but was deactivated, don't crash-loop on the unique constraint.
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
    console.warn(`No active staff, and "${username}" already exists (deactivated?). Use npm run create-user with a new username.`);
    return;
  }
  tx(db, () => {
    const id = Number(db.prepare("INSERT INTO users (username, display_name, role, password_hash, created_at) VALUES (?, ?, 'staff', ?, ?)")
      .run(username, name || username, hashPassword(password), Date.now()).lastInsertRowid);
    audit(db, null, 'system.bootstrap', `user:${id}`, { username });
  });
  console.log(`Created first staff account "${username}".`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDb(process.env.DB_FILE || path.join(ROOT, 'data', 'comms.db'));
  const purgeSessions = () => db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  purgeSessions();
  setInterval(purgeSessions, 60 * MIN).unref();
  bootstrap(db);
  const port = Number(process.env.PORT || 3000);
  http.createServer(createApp(db)).listen(port, () => console.log(`SUUNS Comms on http://localhost:${port}`));
}
