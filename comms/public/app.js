// Small progressive enhancements. Every page also works without JavaScript (minus live refresh and timers).
(() => {
  const $$ = (sel) => document.querySelectorAll(sel);

  // Local, human-friendly timestamps.
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
  function renderTimes() {
    for (const el of $$('time[data-ts]')) {
      const ts = Number(el.dataset.ts);
      const d = new Date(ts);
      el.textContent = el.dataset.fmt === 'clock' ? clockStr(d)
        : el.dataset.fmt === 'full' ? `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${clockStr(d)}:${two(d.getSeconds())}`
        : relative(ts);
      el.title = d.toLocaleString();
    }
  }

  // Countdowns use the server's remaining time, so a wrong device clock doesn't matter.
  const start = performance.now();
  const hms = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
  };
  function tick() {
    for (const el of $$('[data-remaining]')) {
      const left = Number(el.dataset.remaining) - (performance.now() - start);
      el.textContent = hms(left);
      if (left <= 0 && !el.dataset.done) { el.dataset.done = '1'; setTimeout(() => location.reload(), 800); }
    }
    for (const el of $$('[data-clock]')) {
      const d = new Date();
      el.textContent = `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
    }
  }

  // Confirm before risky submits.
  document.addEventListener('submit', (event) => {
    const message = event.target.dataset.confirm;
    if (message && !window.confirm(message)) event.preventDefault();
  });

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
    if (event.target.closest('[data-reload]')) reload();
  });

  // Live refresh: poll a change counter and reload when it moves, unless someone is mid-typing.
  function dirty() {
    for (const el of $$('textarea, input:not([type=hidden]):not([type=submit]):not([name=q]), select')) {
      if (el.value !== el.defaultValue && !(el.tagName === 'SELECT')) return true;
    }
    return Boolean(document.querySelector('details.more[open]'));
  }
  function reload() {
    try { sessionStorage.setItem(`scroll:${location.pathname}${location.search}`, String(window.scrollY)); } catch {}
    location.reload();
  }
  const version = document.body.dataset.version;
  if (version) {
    let pending = false;
    setInterval(async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        const { v } = await res.json();
        if (String(v) === version) return;
        if (dirty()) {
          if (!pending) { pending = true; const banner = document.querySelector('.live-banner'); if (banner) banner.hidden = false; }
        } else reload();
      } catch {}
    }, 3000);
  }

  // Restore scroll after a live reload, and keep threads pinned to the newest message.
  try {
    const key = `scroll:${location.pathname}${location.search}`;
    const y = sessionStorage.getItem(key);
    if (y) { sessionStorage.removeItem(key); window.scrollTo(0, Number(y)); }
  } catch {}
  for (const t of $$('[data-thread]')) t.scrollTop = t.scrollHeight;

  // Drop one-shot ?n= / ?e= notices from the address bar so a reload doesn't repeat them.
  if (/[?&](n|e)=/.test(location.search)) {
    const url = new URL(location.href);
    url.searchParams.delete('n');
    url.searchParams.delete('e');
    history.replaceState(null, '', url.pathname + (url.search || ''));
  }

  // ORCRIST "speaks": type out each [data-type] line once per session (not again on every live refresh).
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const el of $$('[data-type]')) {
    const text = el.dataset.type;
    const key = `typed:${text}`;
    let seen = still;
    try { seen = seen || sessionStorage.getItem(key) === '1'; sessionStorage.setItem(key, '1'); } catch {}
    if (seen) continue;
    el.textContent = '';
    el.classList.add('typing');
    let i = 0;
    let booting = false; // orcrist.js shows the boot screen right after this runs; wait for it
    try { booting = document.body.dataset.boot === 'always' || sessionStorage.getItem('orcrist-booted') !== '1'; } catch {}
    const delay = booting ? 2100 : 250;
    setTimeout(function step() {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(step, 14 + Math.random() * 26);
      else setTimeout(() => el.classList.remove('typing'), 1200);
    }, delay);
  }

  renderTimes();
  tick();
  setInterval(tick, 1000);
  setInterval(renderTimes, 30000);
})();
