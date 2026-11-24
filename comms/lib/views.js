// Every page's HTML. Values are escaped by html`` (see html.js).
import { html } from './html.js';

const STATUS = {
  open: { label: 'Open', cls: 'st-open' },
  claimed: { label: 'Claimed', cls: 'st-claimed' },
  actioned: { label: 'Actioned', cls: 'st-actioned' },
  archived: { label: 'Archived', cls: 'st-archived' },
};
const CHARACTER_STATUS = { open: 'Received', claimed: 'In progress', actioned: 'Actioned', archived: 'Closed' };

const NOTICES = {
  sent: 'Message sent.', claimed: 'Order claimed.', claim: 'Order claimed.', unclaim: 'Order released to the queue.',
  action: 'Order marked as actioned.', archive: 'Order archived.', reopen: 'Order reopened.', comms: 'Comms status updated.',
  posted: 'Update published.', removed: 'Update removed.', created: 'Account created.', freeze: 'Account frozen.',
  unfreeze: 'Account unfrozen.', password: 'Password reset. Their sessions were signed out.',
  deactivate: 'Account deactivated.', reactivate: 'Account reactivated.',
};
const ERRORS = {
  empty: 'Please fill in every field.', toolong: 'That text is too long.', login: 'Wrong username or password.',
  ratelimit: 'Too many failed attempts. Wait 15 minutes and try again.', username: 'Usernames are 2–32 letters, numbers, dots, dashes or underscores.',
  badpw: 'Passwords need at least 8 characters.', taken: 'That username is already taken.', self: "You can't do that to your own account.",
  notchar: 'Only character accounts can be frozen.', minutes: 'Freeze length must be 1–1440 minutes.',
  closed: 'This order is archived. Reopen it first.', state: 'That order changed while you were looking at it. Try again.',
  frozen: 'Your account is frozen.', master: 'MASTER COMMS is offline.', secure: 'SECURE COMMS is offline. Orders are unavailable.',
};

const CHANNELS = {
  master: { name: 'MASTER COMMS', effect: 'When offline, delegates and the public page see no information at all.' },
  secure: { name: 'SECURE COMMS', effect: "When offline, delegates can't see, send or reply to orders." },
};

// ---------- small pieces ----------
const fallbackTime = (ts) => new Date(ts).toISOString().slice(11, 16);
export const time = (ts, fmt = 'rel') => html`<time data-ts="${ts}" data-fmt="${fmt}">${fallbackTime(ts)} UTC</time>`;
const csrf = (ctx) => html`<input type="hidden" name="csrf" value="${ctx.csrf}">`;
const pad = (n) => String(n).padStart(4, '0');

function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const parts = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  return parts.map((n) => String(n).padStart(2, '0')).join(':');
}

function pill(key, state) {
  const up = state[key].up;
  return html`<span class="pill ${up ? 'is-up' : 'is-down'}"><i class="dot"></i>${CHANNELS[key].name}<b>${up ? 'ONLINE' : 'OFFLINE'}</b></span>`;
}

function statusChip(order, forCharacter = false) {
  const s = STATUS[order.status];
  const label = forCharacter ? CHARACTER_STATUS[order.status] : s.label;
  const who = !forCharacter && order.claimed_name && order.status !== 'open' ? html` · ${order.claimed_name}` : '';
  return html`<span class="chip ${s.cls}">${label}${who}</span>`;
}

function flash(ctx) {
  const n = ctx.query.get('n');
  const e = ctx.query.get('e');
  return html`${NOTICES[n] ? html`<div class="flash ok" role="status">${NOTICES[n]}</div>` : ''}
    ${ERRORS[e] ? html`<div class="flash bad" role="alert">${ERRORS[e]}</div>` : ''}`;
}

function nav(ctx) {
  const u = ctx.user;
  const p = ctx.url.pathname;
  const link = (href, label, active) => html`<a href="${href}" class="${active ? 'active' : ''}">${label}</a>`;
  if (!u) return html`<nav class="nav">${link('/updates', 'Updates', p === '/updates')}${link('/login', 'Sign in', p === '/login')}</nav>`;
  if (u.role === 'staff') {
    return html`<nav class="nav">
      ${link('/staff', 'Orders', p === '/staff' || p.startsWith('/staff/orders'))}
      ${link('/staff/comms', 'Comms', p === '/staff/comms')}
      ${link('/staff/posts', 'Posts', p === '/staff/posts')}
      ${link('/staff/accounts', 'Accounts', p === '/staff/accounts')}
      ${link('/staff/audit', 'Audit', p === '/staff/audit')}
      <a href="/projector" target="_blank" rel="noopener">Projector ↗</a>
    </nav>`;
  }
  return html`<nav class="nav">${link('/', 'Orders', p === '/' || p.startsWith('/orders'))}${link('/updates', 'Updates', p === '/updates')}</nav>`;
}

// ORCRIST's colour follows the comms state: calm (cyan), alert (red/amber), dark (dim red flicker), ice (frozen).
const moodOf = (state) => (!state ? 'calm' : !state.master.up ? 'dark' : !state.secure.up ? 'alert' : 'calm');

function head(title) {
  return html`<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#04050a">
  <title>${title} · SUUNS Comms</title>
  <link rel="stylesheet" href="/static/app.css">
  <script src="/static/orcrist.js" defer></script>
  <script src="/static/app.js" defer></script>
</head>`;
}

// Data the boot screen reads: comms status and who is signed in.
function bootData(state, user, mode = 'session') {
  return html`data-boot="${mode}" data-master="${state && !state.master.up ? '0' : '1'}" data-secure="${state && !state.secure.up ? '0' : '1'}" data-user="${user ? user.display_name : ''}"`;
}

const brand = (size = '') => html`<a class="brand ${size}" href="/"><canvas class="brand-orb" data-orcrist="mini" aria-hidden="true"></canvas><span>SUUNS</span><span class="brand-sub">COMMS</span></a>`;

function orcristLine(text) {
  return html`<div class="orcrist-line"><canvas data-orcrist="mini" aria-hidden="true"></canvas>
    <div><span class="eyebrow">ORCRIST · live summary</span><p data-type="${text}">${text}</p></div></div>`;
}

function layout(ctx, { title, body, version, state, cls = '', mood }) {
  const u = ctx.user;
  return html`<!doctype html>
<html lang="en">
${head(title)}
<body class="${cls}" data-version="${version ?? ''}" data-mood="${mood || moodOf(state)}" ${bootData(state, u)}>
  <div class="bg" aria-hidden="true"><i class="aurora a1"></i><i class="aurora a2"></i><i class="aurora a3"></i></div>
  <header class="topbar">
    <div class="topbar-inner">
      ${brand()}
      ${nav(ctx)}
      <div class="topbar-right">
        ${state ? html`<div class="pills">${pill('master', state)}${pill('secure', state)}</div>` : ''}
        ${u ? html`<form method="post" action="/logout" class="who">${csrf(ctx)}
          <span><strong>${u.display_name}</strong><small>${u.role === 'staff' ? 'Staff' : 'Delegate'}</small></span>
          <button class="btn btn-ghost btn-sm">Sign out</button></form>` : ''}
      </div>
    </div>
  </header>
  <div class="live-banner" hidden>New activity. <button type="button" class="link" data-reload>Refresh</button></div>
  <main class="wrap">${flash(ctx)}${body}</main>
</body>
</html>`;
}

function pageHead(eyebrow, title, extra = '') {
  return html`<div class="page-head"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1></div>${extra}</div>`;
}

function thread(messages, viewerRole) {
  return html`<ol class="thread" data-thread>
    ${messages.map((m) => html`<li class="msg ${m.author_role === 'staff' ? 'from-staff' : 'from-character'} ${m.author_role === viewerRole ? 'mine' : ''}">
      <div class="msg-head"><strong>${m.author_name}</strong><span class="tag">${m.author_role === 'staff' ? 'Staff' : 'Delegate'}</span>${time(m.created_at)}</div>
      <div class="msg-body">${m.body}</div>
    </li>`)}
  </ol>`;
}

function replyForm(ctx, action, disabled, placeholder) {
  if (disabled) return html`<p class="muted note">This order is archived, so replies are closed.</p>`;
  return html`<form method="post" action="${action}" class="reply">${csrf(ctx)}
    <textarea name="body" rows="3" maxlength="4000" required placeholder="${placeholder}"></textarea>
    <div class="reply-foot"><span class="muted">Every message is recorded in the audit log.</span><button class="btn btn-primary">Send</button></div>
  </form>`;
}

// ---------- public / shared ----------
export function loginPage(ctx) {
  return html`<!doctype html>
<html lang="en">
${head('Sign in')}
<body class="login-page" data-mood="calm" ${bootData(null, null)}>
  <div class="bg" aria-hidden="true"><i class="aurora a1"></i><i class="aurora a2"></i><i class="aurora a3"></i></div>
  <main class="login-split">
    <section class="login-orcrist">
      <canvas data-orcrist="hero" aria-hidden="true"></canvas>
      <div class="orcrist-caption">
        <span class="eyebrow">ORCRIST · crisis comms intelligence</span>
        <p data-type="Identify yourself to open a secure channel.">Identify yourself to open a secure channel.</p>
      </div>
    </section>
    <section class="login-card">
      ${brand('brand-lg')}
      <div><p class="eyebrow">Secure access</p><h1 class="display">Sign in</h1></div>
      <p class="muted">Use the account your staff gave you. Every session is recorded.</p>
      ${flash(ctx)}
      <form method="post" action="/login" class="stack">
        <label>Username<input name="username" autocomplete="username" required autofocus></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
        <button class="btn btn-primary btn-block btn-lg">Open channel</button>
      </form>
      <a class="muted small" href="/updates">View public updates →</a>
    </section>
  </main>
</body></html>`;
}

export function errorPage(ctx, status, message) {
  return layout(ctx, {
    title: `Error ${status}`,
    body: html`<section class="panel empty-big"><p class="eyebrow">Error ${status}</p><h1>${message}</h1><a class="btn" href="/">Go home</a></section>`,
  });
}

export function blackoutPage(ctx, state, version) {
  return layout(ctx, {
    title: 'MASTER COMMS offline', version, state, cls: 'blackout',
    body: html`<section class="dark-screen">
      <canvas class="screen-orcrist" data-orcrist="hero" data-mood="dark" aria-hidden="true"></canvas>
      <p class="eyebrow">Signal lost</p>
      <h1 class="glitch" data-text="MASTER COMMS OFFLINE">MASTER COMMS OFFLINE</h1>
      <p class="muted">All information channels are dark. This screen updates by itself when comms come back.</p>
    </section>`,
  });
}

export function frozenPage(ctx, user, version) {
  const remaining = user.frozen_until - Date.now();
  return layout(ctx, {
    title: 'Account frozen', version, cls: 'blackout', mood: 'ice',
    body: html`<section class="dark-screen frozen">
      <canvas class="screen-orcrist" data-orcrist="hero" data-mood="ice" aria-hidden="true"></canvas>
      <p class="eyebrow">Account locked by staff</p>
      <h1>ACCOUNT FROZEN</h1>
      <div class="countdown" data-remaining="${remaining}">${clock(remaining)}</div>
      ${user.freeze_reason ? html`<p class="reason">“${user.freeze_reason}”</p>` : ''}
      <p class="muted">Access returns at ${time(user.frozen_until, 'clock')}. This page unlocks by itself.</p>
    </section>`,
  });
}

function postCard(p, { staff = false, ctx = null } = {}) {
  return html`<article class="post">
    <div class="post-head"><h3>${p.title}</h3>${time(p.created_at)}</div>
    <div class="post-body">${p.body}</div>
    ${staff ? html`<div class="post-foot"><span class="muted">Posted by ${p.author_name}</span>
      <form method="post" action="/staff/posts/${p.id}/remove" data-confirm="Remove this update from the public page?">${csrf(ctx)}
        <button class="btn btn-ghost btn-sm">Remove</button></form></div>` : ''}
  </article>`;
}

export function updatesPage(ctx, { state, posts, version }) {
  return layout(ctx, {
    title: 'Updates', version, state,
    body: html`${pageHead('Public situation feed', 'Updates')}
      ${!state.master.up ? html`<div class="flash bad">MASTER COMMS is offline. Only staff can see this page right now.</div>` : ''}
      <div class="feed">${posts.length ? posts.map((p) => postCard(p)) : html`<div class="empty">No updates have been issued yet.</div>`}</div>`,
  });
}

export function projectorPage({ state, posts, version }) {
  const tile = (key) => {
    const up = state[key].up;
    return html`<div class="proj-tile ${up ? 'is-up' : 'is-down'}">
      <div class="proj-label">${CHANNELS[key].name}</div>
      <div class="proj-state"><i class="dot"></i>${up ? 'ONLINE' : 'OFFLINE'}</div>
      <div class="proj-since">Since ${state[key].updatedAt ? time(state[key].updatedAt, 'clock') : 'start'}</div>
    </div>`;
  };
  const [lead, ...rest] = posts;
  const allUp = state.master.up && state.secure.up;
  return html`<!doctype html>
<html lang="en">
${head('Projector')}
<body class="projector" data-version="${version}" data-mood="${moodOf(state)}" ${bootData(state, null, 'always')}>
  <div class="bg" aria-hidden="true"><i class="aurora a1"></i><i class="aurora a2"></i><i class="aurora a3"></i></div>
  <div class="proj">
    <header class="proj-head">${brand('brand-lg')}<div class="proj-clock" data-clock>--:--:--</div></header>
    <div class="proj-tiles">
      ${tile('master')}
      <div class="proj-orcrist">
        <canvas data-orcrist="hero" aria-hidden="true"></canvas>
        <div class="proj-orcrist-label ${allUp ? 'ok' : 'bad'}">ORCRIST · ${allUp ? 'All channels nominal' : 'Comms degraded'}</div>
      </div>
      ${tile('secure')}
    </div>
    <section class="proj-feed">
      ${!state.master.up ? html`<div class="proj-dark">No information available. MASTER COMMS is offline.</div>`
        : lead ? html`<article class="proj-lead"><div class="eyebrow">Latest update · ${time(lead.created_at)}</div><h2>${lead.title}</h2><p>${lead.body}</p></article>
          ${rest.length ? html`<ul class="proj-more">${rest.map((p) => html`<li><span>${p.title}</span>${time(p.created_at)}</li>`)}</ul>` : ''}`
        : html`<div class="proj-dark">Awaiting first update.</div>`}
    </section>
  </div>
</body></html>`;
}

// ---------- character ----------
function orderRow(o, href, forCharacter) {
  const waiting = o.last_role === (forCharacter ? 'staff' : 'character') && o.status !== 'archived';
  return html`<a class="order-row" href="${href}">
    <span class="order-id">#${pad(o.id)}</span>
    <span class="order-main"><strong>${o.title}</strong>
      <span class="muted">${forCharacter ? '' : html`${o.character_name} · `}${o.message_count} message${o.message_count === 1 ? '' : 's'} · ${(o.last_body || '').slice(0, 90)}</span></span>
    ${waiting ? html`<span class="flag">${forCharacter ? 'New reply' : 'Awaiting staff'}</span>` : ''}
    ${statusChip(o, forCharacter)}
    <span class="order-time">${time(o.updated_at)}</span>
  </a>`;
}

export function characterHome(ctx, { state, orders, posts, version }) {
  const secureDown = !state.secure.up;
  const replies = orders.filter((o) => o.last_role === 'staff' && o.status !== 'archived').length;
  const summary = secureDown
    ? `Welcome back, ${ctx.user.display_name}. The secure channel is down, so orders are unavailable for now.`
    : `Welcome back, ${ctx.user.display_name}. ${replies ? `${replies} of your orders ${replies === 1 ? 'has' : 'have'} a new reply from staff.` : 'No new replies from staff.'} ${posts.length ? `Latest update: “${posts[0].title}”.` : ''}`;
  return layout(ctx, {
    title: 'Orders', version, state,
    body: html`${pageHead('Delegate desk', ctx.user.display_name)}
    ${orcristLine(summary.trim())}
    <div class="grid-main">
      <section class="panel">
        <div class="panel-head"><h2>Your orders</h2><span class="muted">${secureDown ? '' : `${orders.length} total`}</span></div>
        ${secureDown ? html`<div class="locked"><div class="signal down"><i></i><i></i><i></i></div><strong>SECURE COMMS OFFLINE</strong><p class="muted">Orders can't be sent or read until secure comms are restored.</p></div>`
          : html`<details class="compose" ${orders.length ? '' : 'open'}>
              <summary class="btn btn-primary">New order</summary>
              <form method="post" action="/orders" class="stack">${csrf(ctx)}
                <label>Subject<input name="title" maxlength="120" required placeholder="e.g. Request emergency liquidity for Bank A"></label>
                <label>Order<textarea name="body" rows="5" maxlength="4000" required placeholder="What do you want done, by whom, and why?"></textarea></label>
                <div class="row-end"><button class="btn btn-primary">Send order</button></div>
              </form>
            </details>
            <div class="list">${orders.length ? orders.map((o) => orderRow(o, `/orders/${o.id}`, true)) : html`<div class="empty">You haven't sent any orders yet.</div>`}</div>`}
      </section>
      <aside class="panel">
        <div class="panel-head"><h2>Latest updates</h2><a href="/updates" class="small">All →</a></div>
        <div class="feed compact">${posts.length ? posts.map((p) => postCard(p)) : html`<div class="empty">No updates yet.</div>`}</div>
      </aside>
    </div>`,
  });
}

export function characterOrderPage(ctx, { state, order, thread: messages, version }) {
  return layout(ctx, {
    title: order.title, version, state,
    body: html`<a class="back" href="/">← All orders</a>
      ${pageHead(`Order #${pad(order.id)}`, order.title, statusChip(order, true))}
      <section class="panel">
        ${thread(messages, 'character')}
        ${replyForm(ctx, `/orders/${order.id}/messages`, order.status === 'archived', 'Add to this order…')}
      </section>`,
  });
}

// ---------- staff ----------
function commsTile(ctx, key, state, back) {
  const s = state[key];
  const msg = s.up ? `Take ${CHANNELS[key].name} offline? ${CHANNELS[key].effect}` : `Bring ${CHANNELS[key].name} back online?`;
  return html`<div class="comms-tile ${s.up ? 'is-up' : 'is-down'}">
    <div class="comms-top"><span class="label">${CHANNELS[key].name}</span><span class="state"><i class="dot"></i>${s.up ? 'ONLINE' : 'OFFLINE'}</span></div>
    <p class="muted">${CHANNELS[key].effect}</p>
    <div class="comms-foot">
      <small class="muted">${s.updatedAt ? html`Changed by ${s.by || 'system'} · ${time(s.updatedAt)}` : 'Not changed yet'}</small>
      <form method="post" action="/staff/comms" data-confirm="${msg}">${csrf(ctx)}
        <input type="hidden" name="key" value="${key}"><input type="hidden" name="up" value="${s.up ? '0' : '1'}">
        ${back ? html`<input type="hidden" name="back" value="${back}">` : ''}
        <button class="btn ${s.up ? 'btn-danger' : 'btn-ok'}">${s.up ? 'Take offline' : 'Bring online'}</button>
      </form>
    </div>
  </div>`;
}

export function staffCommsPage(ctx, { state, version }) {
  return layout(ctx, {
    title: 'Comms', version, state,
    body: html`${pageHead('Public metrics', 'Comms control', html`<a class="btn" href="/projector" target="_blank" rel="noopener">Open projector ↗</a>`)}
      <div class="comms-board big">${commsTile(ctx, 'master', state, 'comms')}${commsTile(ctx, 'secure', state, 'comms')}</div>`,
  });
}

export function staffHome(ctx, { state, tab, counts, orders, version }) {
  const tabs = [['open', 'Open'], ['mine', 'Mine'], ['claimed', 'All claimed'], ['actioned', 'Actioned'], ['archived', 'Archived']];
  const channels = state.master.up && state.secure.up ? 'All channels nominal.'
    : !state.master.up ? 'MASTER COMMS is offline: delegates are blacked out.' : 'SECURE COMMS is offline: delegates cannot reach orders.';
  const summary = `${counts.open} open ${counts.open === 1 ? 'order' : 'orders'}, ${counts.claimed} in progress, ${counts.mine} assigned to you. ${channels}`;
  return layout(ctx, {
    title: 'Orders', version, state,
    body: html`${pageHead('Staff desk', 'Order queue')}
      ${orcristLine(summary)}
      <div class="comms-board">${commsTile(ctx, 'master', state)}${commsTile(ctx, 'secure', state)}</div>
      <section class="panel">
        <nav class="tabs">${tabs.map(([key, label]) => html`<a href="/staff?tab=${key}" class="${tab === key ? 'active' : ''}">${label}<span class="count">${counts[key]}</span></a>`)}</nav>
        <div class="list">${orders.length ? orders.map((o) => orderRow(o, `/staff/orders/${o.id}`, false)) : html`<div class="empty">Nothing here.</div>`}</div>
      </section>`,
  });
}

export function staffOrderPage(ctx, { state, order, thread: messages, version }) {
  const me = ctx.user;
  const op = (name, label, cls = 'btn', confirm = '') => html`<form method="post" action="/staff/orders/${order.id}/${name}" ${confirm ? html`data-confirm="${confirm}"` : ''}>${csrf(ctx)}<button class="${cls} btn-block">${label}</button></form>`;
  const actions = [];
  if (order.status === 'open') actions.push(op('claim', 'Claim', 'btn btn-primary'));
  if (order.status === 'claimed' && order.claimed_by !== me.id) actions.push(op('claim', `Take over from ${order.claimed_name}`, 'btn'));
  if (order.status === 'open' || order.status === 'claimed') actions.push(op('action', 'Mark actioned', 'btn'));
  if (order.status === 'claimed') actions.push(op('unclaim', 'Release to queue', 'btn btn-ghost'));
  if (order.status !== 'archived') actions.push(op('archive', 'Archive', 'btn btn-ghost', 'Archive this order? Replies will close until it is reopened.'));
  if (order.status === 'actioned' || order.status === 'archived') actions.push(op('reopen', 'Reopen', 'btn'));
  return layout(ctx, {
    title: order.title, version, state,
    body: html`<a class="back" href="/staff">← Queue</a>
      ${pageHead(`Order #${pad(order.id)}`, order.title, statusChip(order))}
      <div class="grid-main">
        <section class="panel">
          ${thread(messages, 'staff')}
          ${replyForm(ctx, `/staff/orders/${order.id}/messages`, order.status === 'archived', `Reply to ${order.character_name}…`)}
        </section>
        <aside class="panel side">
          <dl class="facts">
            <dt>From</dt><dd>${order.character_name} <span class="muted">@${order.character_username}</span></dd>
            <dt>Status</dt><dd>${STATUS[order.status].label}</dd>
            <dt>Claimed by</dt><dd>${order.claimed_name || '—'}</dd>
            <dt>Opened</dt><dd>${time(order.created_at)}</dd>
            <dt>Last activity</dt><dd>${time(order.updated_at)}</dd>
          </dl>
          <div class="stack-sm">${actions}</div>
          <a class="small" href="/staff/audit?q=order:${order.id}">View audit trail →</a>
        </aside>
      </div>`,
  });
}

export function staffPostsPage(ctx, { state, posts, version }) {
  return layout(ctx, {
    title: 'Posts', version, state,
    body: html`${pageHead('Public page', 'Posts', html`<a class="btn" href="/updates" target="_blank" rel="noopener">View public page ↗</a>`)}
      <div class="grid-main">
        <section class="panel">
          <div class="panel-head"><h2>Published</h2><span class="muted">${posts.length}</span></div>
          <div class="feed">${posts.length ? posts.map((p) => postCard(p, { staff: true, ctx })) : html`<div class="empty">Nothing published yet.</div>`}</div>
        </section>
        <aside class="panel side">
          <h2>New update</h2>
          <form method="post" action="/staff/posts" class="stack" data-confirm="Publish this update to the public page and projector now?">${csrf(ctx)}
            <label>Headline<input name="title" maxlength="140" required></label>
            <label>Body<textarea name="body" rows="8" maxlength="6000" required></textarea></label>
            <button class="btn btn-primary btn-block">Publish</button>
          </form>
        </aside>
      </div>`,
  });
}

export function accountsPage(ctx, { state, users, version, now }) {
  const characters = users.filter((u) => u.role === 'character');
  const staff = users.filter((u) => u.role === 'staff');
  const accountState = (u) => {
    if (!u.active) return html`<span class="chip st-archived">Deactivated</span>`;
    if (u.role === 'character' && u.frozen_until > now) {
      return html`<span class="chip st-frozen">Frozen <b class="countdown-sm" data-remaining="${u.frozen_until - now}">${clock(u.frozen_until - now)}</b></span>`;
    }
    return html`<span class="chip st-actioned">Active</span>`;
  };
  const row = (u) => {
    const frozen = u.frozen_until > now;
    const self = u.id === ctx.user.id;
    const post = (op, inner, confirm = '') => html`<form method="post" action="/staff/accounts/${u.id}/${op}" class="inline" ${confirm ? html`data-confirm="${confirm}"` : ''}>${csrf(ctx)}${inner}</form>`;
    return html`<tr class="${u.active ? '' : 'inactive'}">
      <td><strong>${u.display_name}</strong><div class="muted small">@${u.username}</div></td>
      <td>${accountState(u)}${frozen && u.freeze_reason ? html`<div class="muted small">${u.freeze_reason}</div>` : ''}</td>
      <td class="actions">
        ${u.role === 'character' && u.active ? (frozen
          ? post('unfreeze', html`<button class="btn btn-sm">Unfreeze</button>`)
          : post('freeze', html`<input name="minutes" type="number" min="1" max="1440" value="10" aria-label="Minutes" class="w-num"><span class="muted small">min</span><input name="reason" maxlength="200" placeholder="Reason (shown to them)" class="w-reason"><button class="btn btn-sm">Freeze</button>`)) : ''}
        <details class="more"><summary class="btn btn-ghost btn-sm">More</summary><div class="more-body">
          ${post('password', html`<input name="password" minlength="8" required placeholder="New password" autocomplete="new-password"><button type="button" class="btn btn-ghost btn-sm" data-genpw>Generate</button><button class="btn btn-sm">Reset</button>`)}
          ${self ? '' : u.active ? post('deactivate', html`<button class="btn btn-sm">Deactivate</button>`, `Deactivate ${u.display_name}? They will be signed out.`)
            : post('reactivate', html`<button class="btn btn-sm">Reactivate</button>`)}
        </div></details>
      </td>
    </tr>`;
  };
  const table = (list) => html`<table class="table"><thead><tr><th>Account</th><th>Status</th><th></th></tr></thead><tbody>${list.map(row)}</tbody></table>`;
  const activeCount = (list) => list.filter((u) => u.active).length;
  return layout(ctx, {
    title: 'Accounts', version, state,
    body: html`${pageHead('Access', 'Accounts')}
      <section class="panel">
        <h2>Create account</h2>
        <form method="post" action="/staff/accounts" class="create-account">${csrf(ctx)}
          <label>Display name<input name="display_name" maxlength="60" required placeholder="e.g. Minister of Finance"></label>
          <label>Username<input name="username" maxlength="32" required pattern="[A-Za-z0-9_.\\-]{2,32}" autocomplete="off"></label>
          <label>Password<span class="input-with"><input name="password" minlength="8" required autocomplete="new-password"><button type="button" class="btn btn-ghost btn-sm" data-genpw>Generate</button></span></label>
          <label>Role<select name="role"><option value="character">Delegate (character)</option><option value="staff">Staff</option></select></label>
          <button class="btn btn-primary">Create</button>
        </form>
        <p class="muted small">Write the password down before you create the account. It can't be shown again, only reset.</p>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Delegates</h2><span class="muted">${activeCount(characters)} active</span></div>
        ${characters.length ? table(characters) : html`<div class="empty">No delegate accounts yet.</div>`}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Staff</h2><span class="muted">${activeCount(staff)} active</span></div>
        ${table(staff)}
      </section>`,
  });
}

function detailText(json) {
  try {
    const d = JSON.parse(json);
    return Object.entries(d).map(([k, v]) => html`<span class="kv"><b>${k}</b> ${typeof v === 'string' ? v : JSON.stringify(v)}</span>`);
  } catch { return json; }
}

export function auditPage(ctx, { state, rows, q, chain, version }) {
  return layout(ctx, {
    title: 'Audit log', version, state,
    body: html`${pageHead('Full record', 'Audit log', html`<a class="btn" href="/staff/audit.csv">Export CSV</a>`)}
      <div class="chain ${chain.ok ? 'ok' : 'bad'}">
        <strong>${chain.ok ? 'Chain intact' : 'Chain broken'}</strong>
        <span>${chain.ok ? html`${chain.count} entries verified. Head <code>${(chain.head || '').slice(0, 16)}</code>`
          : html`Entry #${chain.brokenAt} doesn't match its hash. The log was changed outside the app.`}</span>
      </div>
      <form class="search" method="get" action="/staff/audit"><input name="q" value="${q}" placeholder="Filter by user, action, order:12, user:3, text…"><button class="btn">Filter</button>${q ? html`<a class="btn btn-ghost" href="/staff/audit">Clear</a>` : ''}</form>
      <section class="panel flush">
        <table class="table audit">
          <thead><tr><th>#</th><th>Time</th><th>Who</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
          <tbody>${rows.map((r) => html`<tr>
            <td class="mono muted">${r.id}</td><td class="nowrap">${time(r.at, 'full')}</td><td>${r.actor}</td>
            <td><span class="act act-${r.action.split('.')[0]}">${r.action}</span></td><td class="mono small">${r.target || ''}</td>
            <td class="detail">${detailText(r.detail)}</td></tr>`)}</tbody>
        </table>
        ${rows.length === 500 ? html`<p class="muted small pad">Showing the latest 500. Export the CSV for the complete log.</p>` : ''}
      </section>`,
  });
}
