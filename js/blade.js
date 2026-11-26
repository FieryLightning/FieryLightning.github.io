// ─────────────────────────────────────────────────────────────
//  Blade overlay (Canvas 2D)
//  - a tapered light ribbon that follows the pointer; fast swipes
//    become full sabre cuts with sparks and a metallic "shing"
//  - scripted slashes (intro, terminal `allez`, touching a card)
//  - spark bursts on parry (click)
// ─────────────────────────────────────────────────────────────

const LIFE = 170;          // ms a trail point stays alive
const SLASH_SPEED = 2100;  // px/s that counts as a cut

export function createBlade(canvas, pointer, { onSlash, reduced } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const trail = [];
  const sparks = [];
  const cuts = [];
  let lastSlashAt = 0;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  function addPoint(x, y, t) {
    trail.push({ x, y, t });
    if (trail.length > 64) trail.shift();
  }

  function burst(x, y, n = 18, { dir = null, spread = Math.PI * 2, speed = 520, palette = ['#e8f6ff', '#7fe3ff', '#ffffff'] } = {}) {
    if (reduced) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const base = dir ?? Math.random() * Math.PI * 2;
      const a = base + (Math.random() - 0.5) * spread;
      const v = speed * (0.35 + Math.random() * 0.9);
      sparks.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0,
        max: 260 + Math.random() * 340,
        c: palette[(Math.random() * palette.length) | 0],
      });
    }
    if (sparks.length > 600) sparks.splice(0, sparks.length - 600);
  }

  /** Scripted cut from (x0,y0) to (x1,y1). */
  function slash(x0, y0, x1, y1, { dur = 220, color = '#e8f6ff', glow = '#7fe3ff', width = 3, sparks: withSparks = true } = {}) {
    cuts.push({ x0, y0, x1, y1, t0: performance.now(), dur, color, glow, width, sparked: !withSparks });
  }

  let lastT = performance.now();
  let dirty = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    while (trail.length && now - trail[0].t > LIFE) trail.shift();
    const busy = trail.length > 1 || sparks.length || cuts.length || Math.hypot(pointer.vx, pointer.vy) > SLASH_SPEED;
    if (!busy) {
      // idle: clear once, then leave the canvas (and the compositor) alone
      if (dirty) { ctx.clearRect(0, 0, W, H); dirty = false; }
      return;
    }
    dirty = true;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    // ── pointer trail
    const speed = Math.hypot(pointer.vx, pointer.vy);
    const intensity = pointer.type === 'touch' ? 1 : Math.min(1, Math.max(0, (speed - 250) / 1500));

    if (trail.length > 1 && intensity > 0.02) {
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1], b = trail[i];
          const life = 1 - (now - b.t) / LIFE;
          if (life <= 0) continue;
          const k = i / trail.length;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineCap = 'round';
          if (pass === 0) {
            ctx.strokeStyle = `rgba(127,227,255,${0.22 * life * intensity})`;
            ctx.lineWidth = (2 + 12 * k) * life * (0.4 + intensity);
          } else {
            ctx.strokeStyle = `rgba(240,250,255,${0.9 * life * intensity})`;
            ctx.lineWidth = (0.6 + 2.6 * k) * life * (0.5 + intensity * 0.8);
          }
          ctx.stroke();
        }
      }
    }

    // a fast swipe is a cut
    if (speed > SLASH_SPEED && now - lastSlashAt > 260 && pointer.inside) {
      lastSlashAt = now;
      const dir = Math.atan2(pointer.vy, pointer.vx);
      burst(pointer.x, pointer.y, 14, { dir, spread: 0.9, speed: 420 });
      onSlash?.(Math.min(1, speed / 5000));
    }

    // ── scripted cuts
    for (let i = cuts.length - 1; i >= 0; i--) {
      const c = cuts[i];
      const t = (now - c.t0) / c.dur;
      if (t > 2.6) { cuts.splice(i, 1); continue; }
      const head = Math.min(1, t);
      const ease = 1 - Math.pow(1 - head, 3);
      const hx = c.x0 + (c.x1 - c.x0) * ease;
      const hy = c.y0 + (c.y1 - c.y0) * ease;
      const fade = t <= 1 ? 1 : Math.max(0, 1 - (t - 1) / 1.6);
      const tx = c.x0, ty = c.y0;

      ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(c.glow, 0.28 * fade);
      ctx.lineWidth = c.width * 6 * fade;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = hexA(c.color, 0.95 * fade);
      ctx.lineWidth = c.width * fade;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();

      if (t < 1) {
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 40);
        g.addColorStop(0, hexA('#ffffff', 0.9));
        g.addColorStop(1, hexA(c.glow, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(hx, hy, 40, 0, Math.PI * 2); ctx.fill();
      } else if (!c.sparked) {
        c.sparked = true;
        burst(c.x1, c.y1, 22, { dir: Math.atan2(c.y1 - c.y0, c.x1 - c.x0), spread: 1.2, speed: 600 });
      }
    }

    // ── sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt * 1000;
      if (s.life > s.max) { sparks.splice(i, 1); continue; }
      s.vx *= 0.94;
      s.vy = s.vy * 0.94 + 900 * dt;
      const px = s.x, py = s.y;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const a = 1 - s.life / s.max;
      ctx.strokeStyle = hexA(s.c, a);
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(s.x, s.y); ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  return { addPoint, burst, slash, frame };
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}
