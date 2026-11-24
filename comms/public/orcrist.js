// ORCRIST: the living hologram. A 3D point-sphere, wireframe core and orbit rings,
// projected by hand onto a 2D canvas. No libraries, no WebGL, no network.
//
// Usage: <canvas data-orcrist="hero|mini" data-mood="calm|alert|dark|ice"></canvas>
// Mood falls back to <body data-mood>. Respects prefers-reduced-motion.
(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;

  const MOODS = {
    calm: { a: [255, 255, 255], b: [110, 110, 116], speed: 1, flicker: 0 },
    alert: { a: [255, 72, 104], b: [120, 40, 52], speed: 1.7, flicker: 0.02 },
    dark: { a: [255, 52, 84], b: [110, 20, 44], speed: 0.45, flicker: 0.12 },
    ice: { a: [235, 235, 235], b: [90, 90, 96], speed: 0.3, flicker: 0 },
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mix = (c1, c2, t) => [0, 1, 2].map((i) => Math.round(c1[i] + (c2[i] - c1[i]) * t));

  // Evenly spread points on a sphere (Fibonacci lattice).
  function sphere(n) {
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      pts.push([Math.cos(golden * i) * r, y, Math.sin(golden * i) * r]);
    }
    return pts;
  }

  // Icosahedron: 12 vertices, 30 edges.
  const PHI = (1 + Math.sqrt(5)) / 2;
  const ICO_V = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI],
    [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]]
    .map((v) => { const l = Math.hypot(...v); return v.map((c) => c / l); });
  const ICO_E = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
    const d = Math.hypot(ICO_V[i][0] - ICO_V[j][0], ICO_V[i][1] - ICO_V[j][1], ICO_V[i][2] - ICO_V[j][2]);
    if (d < 1.1) ICO_E.push([i, j]);
  }

  function rotate([x, y, z], ax, ay) {
    const cy = Math.cos(ay), sy = Math.sin(ay);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const cx = Math.cos(ax), sx = Math.sin(ax);
    return [x1, y * cx - z1 * sx, y * sx + z1 * cx];
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  class Orcrist {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.mini = canvas.dataset.orcrist === 'mini';
      this.mood = MOODS[canvas.dataset.mood || document.body.dataset.mood] || MOODS.calm;
      this.points = sphere(this.mini ? 90 : 520);
      this.seed = Math.random() * 1000;
      this.visible = true;
      this.alpha = 1;
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(canvas);
      this.resize();
    }

    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const { width, height } = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, width);
      this.h = Math.max(1, height);
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    draw(now) {
      if (!this.visible) return;
      const { ctx, w, h, mood, mini } = this;
      const t = (now + this.seed) * mood.speed;
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * (mini ? 0.42 : 0.26);
      ctx.clearRect(0, 0, w, h);

      // Occasional flicker for degraded moods.
      if (mood.flicker && Math.random() < mood.flicker) this.alpha = 0.25 + Math.random() * 0.4;
      else this.alpha += (1 - this.alpha) * 0.15;
      ctx.globalAlpha = this.alpha;
      ctx.globalCompositeOperation = 'lighter';

      const ay = t * 0.00028 + pointer.x * 0.5;
      const ax = Math.sin(t * 0.00017) * 0.35 + pointer.y * 0.35 + 0.25;
      const persp = (z) => 2.6 / (2.6 + z);

      // Halo.
      const halo = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * (mini ? 1.25 : 1.9));
      halo.addColorStop(0, rgba(mood.a, mini ? 0.35 : 0.22));
      halo.addColorStop(0.45, rgba(mood.b, 0.08));
      halo.addColorStop(1, rgba(mood.b, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Orbit rings with travelling beads.
      if (!mini) {
        const rings = [[1.42, 1.1, 0.0004], [1.62, -0.6, -0.00026], [1.25, 0.25, 0.0006]];
        rings.forEach(([scale, tilt, spd], ri) => {
          ctx.beginPath();
          for (let i = 0; i <= 96; i++) {
            const a = (i / 96) * TAU;
            const p = rotate(rotate([Math.cos(a) * scale, 0, Math.sin(a) * scale], tilt, ri), ax * 0.6, ay * 0.4);
            const s = persp(p[2]);
            const x = cx + p[0] * R * s, y = cy + p[1] * R * s;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = rgba(mix(mood.a, mood.b, ri / 2), 0.16);
          ctx.lineWidth = 1;
          ctx.stroke();
          const a = t * spd * 3;
          const p = rotate(rotate([Math.cos(a) * scale, 0, Math.sin(a) * scale], tilt, ri), ax * 0.6, ay * 0.4);
          const s = persp(p[2]);
          const bx = cx + p[0] * R * s, by = cy + p[1] * R * s;
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, 7 * s);
          g.addColorStop(0, rgba([255, 255, 255], 0.9));
          g.addColorStop(0.3, rgba(mood.a, 0.7));
          g.addColorStop(1, rgba(mood.a, 0));
          ctx.fillStyle = g;
          ctx.fillRect(bx - 8, by - 8, 16, 16);
        });
      }

      // Wireframe core, counter-rotating.
      const coreScale = mini ? 0.5 : 0.52 + Math.sin(t * 0.0013) * 0.03;
      const core = ICO_V.map((v) => rotate(v.map((c) => c * coreScale), -ax * 1.3, -ay * 1.6));
      ctx.lineWidth = mini ? 0.8 : 1;
      for (const [i, j] of ICO_E) {
        const p = core[i], q = core[j];
        const depth = ((p[2] + q[2]) / 2 + 1) / 2;
        ctx.strokeStyle = rgba(mix(mood.b, mood.a, depth), 0.18 + (1 - depth) * 0.4);
        ctx.beginPath();
        ctx.moveTo(cx + p[0] * R * persp(p[2]), cy + p[1] * R * persp(p[2]));
        ctx.lineTo(cx + q[0] * R * persp(q[2]), cy + q[1] * R * persp(q[2]));
        ctx.stroke();
      }

      // Breathing point-sphere.
      for (let i = 0; i < this.points.length; i++) {
        const base = this.points[i];
        const wave = 1 + Math.sin(t * 0.0021 + base[1] * 6 + i * 0.07) * (mini ? 0.04 : 0.07);
        const p = rotate([base[0] * wave, base[1] * wave, base[2] * wave], ax, ay);
        const s = persp(p[2]);
        const front = (1 - p[2]) / 2; // 1 = nearest
        const size = (mini ? 1.1 : 1.7) * s * (0.6 + front);
        ctx.fillStyle = rgba(mix(mood.b, mood.a, front), 0.15 + front * 0.75);
        ctx.fillRect(cx + p[0] * R * s - size / 2, cy + p[1] * R * s - size / 2, size, size);
      }

      // Pulsing core light.
      const pulse = 0.55 + Math.sin(t * 0.003) * 0.2;
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.42);
      coreGlow.addColorStop(0, rgba([255, 255, 255], 0.55 * pulse));
      coreGlow.addColorStop(0.25, rgba(mood.a, 0.35 * pulse));
      coreGlow.addColorStop(1, rgba(mood.a, 0));
      ctx.fillStyle = coreGlow;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      // Scan band sweeping down: a flattened radial glow, so it fades out on every side.
      if (!mini) {
        const sy = cy - R * 1.2 + ((t * 0.06) % (R * 2.4));
        const across = Math.sqrt(Math.max(0, 1 - ((sy - cy) / (R * 1.2)) ** 2)) * R * 1.15; // follow the sphere's width
        if (across > 4) {
          ctx.save();
          ctx.translate(cx, sy);
          ctx.scale(1, 16 / across);
          const band = ctx.createRadialGradient(0, 0, 0, 0, 0, across);
          band.addColorStop(0, rgba(mood.a, 0.2));
          band.addColorStop(1, rgba(mood.a, 0));
          ctx.fillStyle = band;
          ctx.fillRect(-across, -across, across * 2, across * 2);
          ctx.restore();
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }

  const orcrists = [];
  function mount(root = document) {
    for (const c of root.querySelectorAll('canvas[data-orcrist]:not([data-mounted])')) {
      c.dataset.mounted = '1';
      const o = new Orcrist(c);
      orcrists.push(o);
      if (REDUCED) requestAnimationFrame((now) => o.draw(now)); // one still frame
    }
  }

  function loop(now) {
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    for (const o of orcrists) o.draw(now);
    if (!REDUCED) requestAnimationFrame(loop);
  }

  // ---------- boot screen ----------
  // Plays once per browser session (always on the projector). Click or any key skips it.
  function boot() {
    const body = document.body;
    const mode = body.dataset.boot;
    if (!mode) return;
    let seen = false;
    try { seen = sessionStorage.getItem('orcrist-booted') === '1'; sessionStorage.setItem('orcrist-booted', '1'); } catch {}
    if (seen && mode !== 'always') return;

    const status = (key) => (body.dataset[key] === '0' ? ['OFFLINE', 'bad'] : ['ONLINE', 'ok']);
    const [m, mc] = status('master');
    const [s, sc] = status('secure');
    const lines = [
      ['Initialising ORCRIST core', ''],
      ['Calibrating holographic lattice', ''],
      [`Link · MASTER COMMS`, m, mc],
      [`Link · SECURE COMMS`, s, sc],
      [body.dataset.user ? `Identity confirmed · ${body.dataset.user}` : 'Awaiting identification', ''],
    ];

    const overlay = document.createElement('div');
    overlay.className = 'boot';
    overlay.innerHTML = '<div class="boot-grid"></div><canvas data-orcrist="hero" aria-hidden="true"></canvas>'
      + '<div class="boot-copy"><div class="boot-title">ORCRIST</div><div class="boot-sub">SUUNS crisis comms intelligence</div><ol class="boot-log"></ol>'
      + '<div class="boot-bar"><i></i></div></div><button type="button" class="boot-skip">Skip</button>';
    body.appendChild(overlay);
    mount(overlay);

    const log = overlay.querySelector('.boot-log');
    lines.forEach(([label, value, cls], i) => {
      setTimeout(() => {
        const li = document.createElement('li');
        li.textContent = label;
        if (value) { const b = document.createElement('b'); b.textContent = value; b.className = cls; li.appendChild(b); }
        log.appendChild(li);
      }, REDUCED ? 0 : 180 + i * 260);
    });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      overlay.classList.add('boot-out');
      setTimeout(() => overlay.remove(), 700);
    };
    overlay.addEventListener('click', finish);
    addEventListener('keydown', finish, { once: true });
    setTimeout(finish, REDUCED ? 600 : 2300);
  }

  document.addEventListener('DOMContentLoaded', () => {
    mount();
    boot();
    requestAnimationFrame(loop);
  });
})();
