// Small progressive enhancements. Every page also works without JavaScript (minus live refresh and timers).
//
// Smooth navigation: internal links, forms and live updates fetch the next page in the background and
// swap only <main> (plus the nav and comms pills), so the top bar, holograms and scroll position stay put.
// Anything unexpected (login page, projector, errors, logout) falls back to a normal page load.
(() => {
  const $$ = (sel, root = document) => root.querySelectorAll(sel);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- time ----------
  const two = (n) => String(n).padStart(2, '0');
  const clockStr = (d) => `${two(d.getHours())}:${two(d.getMinutes())}`;
  function relative(ts) {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    const d = new Date(ts);
    if (s < 86400 && d.getDate() === new Date().getDate()) return clockStr(d);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${clockStr(d)}`;
  }
  function renderTimes(root = document) {
    for (const el of $$('time[data-ts]', root)) {
      const d = new Date(Number(el.dataset.ts));
      el.textContent = el.dataset.fmt === 'clock' ? clockStr(d)
        : el.dataset.fmt === 'full' ? `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${clockStr(d)}:${two(d.getSeconds())}`
        : relative(d.getTime());
      el.title = d.toLocaleString();
    }
  }

  // Countdowns use the server's remaining time (measured from when each element appeared),
  // so a wrong device clock doesn't matter.
  const hms = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
  };
  function tick() {
    for (const el of $$('[data-remaining]')) {
      el._t0 ??= performance.now();
      const left = Number(el.dataset.remaining) - (performance.now() - el._t0);
      el.textContent = hms(left);
      if (left <= 0 && !el.dataset.done) { el.dataset.done = '1'; setTimeout(() => refresh(), 800); }
    }
    for (const el of $$('[data-clock]')) {
      const d = new Date();
      el.textContent = `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
    }
  }

  // ---------- ORCRIST typing ----------
  // Type out each [data-type] line once per session (not again on every live refresh).
  function typeLines(root = document, firstLoad = false) {
    for (const el of $$('[data-type]', root)) {
      const text = el.dataset.type;
      const key = `typed:${text}`;
      let seen = still;
      try { seen = seen || sessionStorage.getItem(key) === '1'; sessionStorage.setItem(key, '1'); } catch {}
      if (seen) continue;
      el.textContent = '';
      el.classList.add('typing');
      let booting = false; // orcrist.js shows the boot screen on first load; wait for it
      try { booting = firstLoad && (document.body.dataset.boot === 'always' || sessionStorage.getItem('orcrist-booted') !== '1'); } catch {}
      let i = 0;
      setTimeout(function step() {
        el.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, 14 + Math.random() * 26);
        else setTimeout(() => el.classList.remove('typing'), 1200);
      }, booting ? 2100 : 250);
    }
  }

  // Everything that has to run on freshly inserted content.
  function enhance(root, firstLoad = false) {
    renderTimes(root);
    for (const t of $$('[data-thread]', root)) t.scrollTop = t.scrollHeight;
    typeLines(root, firstLoad);
    window.Orcrist?.mount(root);
    tick();
  }

  // Drop one-shot ?n= / ?e= notices from the address bar so a refresh doesn't repeat them.
  function cleanUrl() {
    if (!/[?&](n|e)=/.test(location.search)) return;
    const url = new URL(location.href);
    url.searchParams.delete('n');
    url.searchParams.delete('e');
    history.replaceState(null, '', url.pathname + url.search);
  }

  // ---------- page swapping ----------
  let busy = false;
  const canSwap = () => Boolean(document.querySelector('main.wrap'));

  // mode: 'nav' (new page: push history, scroll to top unless same path), 'live' (keep everything), 'pop' (back/forward)
  async function swap(url, { mode = 'nav', init } = {}) {
    if (!canSwap()) { location.href = url; return; }
    busy = true;
    document.documentElement.classList.add('is-loading');
    try {
      const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init });
      const finalUrl = new URL(res.url);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const next = doc.querySelector('main.wrap');
      if (!next || finalUrl.origin !== location.origin) { location.href = res.url; return; }

      const samePath = finalUrl.pathname === location.pathname;
      const y = window.scrollY;
      next.classList.add('swapped'); // no entrance animation on swaps
      document.querySelector('main.wrap').replaceWith(next);
      for (const sel of ['.topbar .nav', '.topbar .pills']) {
        const from = doc.querySelector(sel);
        const to = document.querySelector(sel);
        if (from && to) to.replaceWith(from);
      }
      const banner = document.querySelector('.live-banner');
      if (banner) banner.hidden = true;
      pending = false;
      document.title = doc.title;
      for (const key of ['version', 'mood', 'master', 'secure']) {
        if (doc.body.dataset[key] != null) document.body.dataset[key] = doc.body.dataset[key];
      }
      document.body.className = doc.body.className;

      if (mode === 'nav') history.pushState(null, '', finalUrl.pathname + finalUrl.search);
      else if (mode === 'live' || mode === 'pop') history.replaceState(null, '', finalUrl.pathname + finalUrl.search);
      cleanUrl();
      if (mode === 'nav' && !samePath) window.scrollTo(0, 0);
      else window.scrollTo(0, y);
      enhance(next);
    } catch {
      location.href = url; // network hiccup or parse problem: do a normal load
    } finally {
      busy = false;
      document.documentElement.classList.remove('is-loading');
    }
  }
  const refresh = () => swap(location.pathname + location.search, { mode: 'live' });

  // Internal links.
  document.addEventListener('click', (event) => {
    const a = event.target.closest('a[href]');
    if (!a || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.endsWith('.csv') || url.pathname === '/projector' || url.pathname === '/login') return;
    if (!canSwap()) return;
    event.preventDefault();
    if (url.pathname === location.pathname && url.search === location.search) refresh();
    else swap(url.pathname + url.search);
  });

  // Forms: confirm first, then submit in the background and show wherever the server redirects to.
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (event.defaultPrevented) return;
    const message = form.dataset.confirm;
    if (message && !window.confirm(message)) { event.preventDefault(); return; }
    const action = new URL(form.action, location.href);
    if (!canSwap() || action.origin !== location.origin || action.pathname === '/logout' || action.pathname === '/login') return;
    event.preventDefault();
    const data = new URLSearchParams(new FormData(form, event.submitter));
    if (form.method.toLowerCase() === 'get') {
      swap(`${action.pathname}?${data}`);
    } else {
      for (const b of $$('button', form)) b.disabled = true;
      swap(action.pathname, {
        init: { method: 'POST', body: data, headers: { 'content-type': 'application/x-www-form-urlencoded' } },
      });
    }
  });

  addEventListener('popstate', () => swap(location.pathname + location.search, { mode: 'pop' }));

  // ---------- small helpers ----------
  // Password generator: readable, no ambiguous characters.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-genpw]');
    if (button) {
      const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      const pw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('').replace(/(.{4})(?=.)/g, '$1-');
      const input = button.closest('form').querySelector('input[name="password"]');
      input.type = 'text';
      input.value = pw;
      input.select();
    }
    if (event.target.closest('[data-reload]')) refresh();
  });

  // ---------- live updates ----------
  // Poll a change counter; when it moves, swap in the fresh page, unless someone is mid-typing.
  function dirty() {
    for (const el of $$('textarea, input:not([type=hidden]):not([type=submit]):not([name=q])')) {
      if (el.value !== el.defaultValue) return true;
    }
    return Boolean(document.querySelector('details.more[open], details.compose[open] textarea:focus'));
  }
  let pending = false;
  setInterval(async () => {
    const version = document.body.dataset.version;
    if (!version || busy) return;
    try {
      const res = await fetch('/api/version', { cache: 'no-store' });
      const { v } = await res.json();
      if (String(v) === version) return;
      if (dirty()) {
        if (!pending) { pending = true; const banner = document.querySelector('.live-banner'); if (banner) banner.hidden = false; }
      } else if (canSwap()) {
        refresh();
      } else {
        location.reload(); // projector and other standalone pages
      }
    } catch {}
  }, 3000);

  // ---------- first load ----------
  cleanUrl();
  enhance(document, true);
  setInterval(tick, 1000);
  setInterval(() => renderTimes(), 30000);
})();
