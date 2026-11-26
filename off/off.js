// ─────────────────────────────────────────────────────────────
//  Off the Piste. Content comes from ../js/data.js, shared with
//  the main page. The only motion is ink:
//   · each drawing sketches itself, path by path, in pen order
//   · one thread runs the page; its tip follows your reading
//     position, threading through the margins and the drawings
// ─────────────────────────────────────────────────────────────

import { profile, projects, loadout, offPiste } from '../js/data.js?v=12';

// the ?v= this script was loaded with; drawings are fetched with the same one
// so a page never mixes files from two deploys (GitHub Pages caches for 10 min)
const VERSION = new URL(import.meta.url).search;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const say = (n) => WORDS[n] ?? String(n);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const host = (u) => { try { const x = new URL(u); return (x.host + x.pathname).replace(/^www\./, '').replace(/\/$/, ''); } catch { return u; } };

const live = projects.filter((p) => p.url);
const priv = projects.filter((p) => !p.url);

// ── content ──────────────────────────────────────────────────
function fill() {
  $('#hero-line').textContent = offPiste.line;

  $('#works-sub').textContent =
    `${cap(say(projects.length))} projects. ${cap(say(live.length))} ${live.length === 1 ? 'is' : 'are'} live` +
    (priv.length ? `; ${say(priv.length)} ${priv.length === 1 ? 'is' : 'are'} private.` : '.');

  $('#plates').innerHTML = projects.map((p, i) => {
    const links = [];
    if (p.url) links.push(`<a class="u" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(host(p.url))} ↗</a>`);
    if (p.source) links.push(`<a class="u" href="${esc(p.source)}" target="_blank" rel="noopener">Source code</a>`);
    if (!p.url) links.push(`<span class="private">${esc(p.privateNote || 'Private build')}${p.source ? '' : ', no public link'}.</span>`);
    return `
      <article class="plate${i % 2 ? ' flip' : ''}" data-thread="ink">
        <figure class="ink" data-ink="${esc(p.id)}" aria-hidden="true"></figure>
        <div class="plate-text">
          <h3>${esc(p.name)}</h3>
          <p class="plate-tag">${esc(p.tagline)}</p>
          ${p.role ? `<p class="plate-role">${esc(p.role)}</p>` : ''}
          <p class="plate-desc">${esc(p.description)}</p>
          <p class="plate-stack">${p.stack.map(esc).join(' <i>·</i> ')}</p>
          <p class="plate-links">${links.join('')}</p>
        </div>
      </article>`;
  }).join('');

  $('#tools').innerHTML = loadout.map((s) => `
    <div class="tool">
      <h3>${esc(s.slot)}</h3>
      <ul>${s.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </div>`).join('');

  $('#coda').textContent = offPiste.coda;
  const sign = [`<a class="u" href="${esc(profile.githubUrl)}" target="_blank" rel="noopener">github.com/${esc(profile.github)}</a>`];
  if (profile.email) sign.push(`<a class="u" href="mailto:${esc(profile.email)}">${esc(profile.email)}</a>`);
  $('#sign-links').innerHTML = `Contact: ${sign.join(' or ')}`;
  $('#seal').innerHTML = SEAL;
  $('#year').textContent = new Date().getFullYear();
}

// a hand-cut seal: uneven edge, ink that did not take everywhere
const SEAL = `<svg viewBox="0 0 100 100">
  <defs>
    <filter id="seal-rough" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2"/>
    </filter>
    <filter id="seal-ink" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" seed="3" result="t"/>
      <feColorMatrix in="t" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2 2.05" result="m"/>
      <feComposite in="SourceGraphic" in2="m" operator="in"/>
    </filter>
  </defs>
  <g filter="url(#seal-ink)">
    <g filter="url(#seal-rough)">
      <rect x="6" y="6" width="88" height="88" rx="7" fill="#c2412d"/>
      <rect x="13" y="13" width="74" height="74" rx="3" fill="none" stroke="#f3eee4" stroke-width="2.2"/>
      <text x="50" y="65" text-anchor="middle" fill="#f3eee4" font-family="Instrument Serif, Georgia, serif" font-size="44" letter-spacing="-1">KY</text>
    </g>
  </g>
</svg>`;

// ── drawings ─────────────────────────────────────────────────
const inkCache = new Map();
async function loadInk(fig) {
  const name = fig.dataset.ink;
  if (!inkCache.has(name)) inkCache.set(name, fetch(`../assets/ink/${name}.svg${VERSION}`).then((r) => (r.ok ? r.text() : '')));
  const svgText = await inkCache.get(name);
  if (!svgText) return;
  fig.innerHTML = svgText;
  const svg = fig.querySelector('svg');
  svg.querySelector('title')?.remove();
  svg.setAttribute('focusable', 'false');
  if (fig.classList.contains('ink-sabre')) {
    // the sabre is long and thin: frame it tightly
    const b = svg.getBBox();
    svg.setAttribute('viewBox', `${b.x - 6} ${b.y - 6} ${b.width + 12} ${b.height + 12}`);
    fig.style.aspectRatio = `${b.width + 12} / ${b.height + 12}`;
  }
  fig._paths = $$('path', svg).map((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len} ${len}`;
    p.style.strokeDashoffset = reduced ? 0 : len;
    return { p, len };
  });
  if (fig._want) draw(fig);
}

// one pen: paths in document order, each taking time in proportion to its length
function draw(fig) {
  if (fig._drawn) return;
  if (!fig._paths) { fig._want = true; return; }
  fig._drawn = true;
  if (reduced) return;
  const total = fig._paths.reduce((a, { len }) => a + len, 0);
  const speed = Math.max(1, total / 2300); // units per ms, so no drawing takes much longer than ~2.3 s
  let t = 0;
  for (const { p, len } of fig._paths) {
    const dur = Math.max(170, len / speed);
    p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: dur, delay: t, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' });
    t += dur * 0.86;
  }
  return t;
}

// ── the thread ───────────────────────────────────────────────
// Waypoints come from the page: the nib's tip, a lane beside each
// text section, the top and bottom of each drawing (the drawing
// itself bridges the gap), the seal. Consecutive points are joined
// by S-curves with vertical tangents, so the line only crosses the
// page in the gaps between blocks and never runs through text.
const svgT = $('.thread');
const nibDot = $('.thread-nib');
let segs = [];      // { el, len, start }
let table = [];     // samples: [globalLen, x, y]
let total = 0;
let shown = 0;      // drawn length, eased toward the reading position
let armed = false;  // the thread starts once the nib has drawn

function waypoints() {
  const sy = scrollY;
  const vw = document.documentElement.clientWidth;
  const narrow = vw <= 820;
  const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + sy, b: r.bottom + sy, w: r.width, h: r.height, cx: r.left + r.width / 2 }; };
  const lane = 14;
  const runs = [[]];
  const add = (x, y) => runs[runs.length - 1].push({ x, y });

  // always leave from the pen's writing tip, (8, 172) in its 240×180
  // drawing (held right-handed: nib down and left); on phones the next
  // point is the margin lane, so the first curve sweeps from the tip to it
  const pen = box($('.ink-nib'));
  add(pen.l + (pen.w * 8) / 240, pen.t + (pen.h * 172) / 180);

  for (const el of $$('[data-thread], .ink-sabre')) {
    const b = box(el);
    if (el.classList.contains('ink-sabre')) {
      // the line ends by becoming the sabre: it arrives at the pommel
      add(narrow ? lane : b.l + 4, narrow ? b.t : b.t + b.h * 0.5);
    } else if (el.dataset.thread === 'ink') {
      const fig = box($('.ink', el));
      if (narrow) { add(lane, b.t); add(lane, b.b); continue; }
      add(fig.cx, fig.t - 10);
      runs.push([]);           // lift the pen: the drawing carries the line
      add(fig.cx, fig.b + 10);
    } else {
      const kids = [...el.children].map(box);
      const left = Math.min(...kids.map((k) => k.l));
      const right = Math.max(...kids.map((k) => k.r));
      const x = narrow ? lane
        : el.dataset.thread === 'left' ? Math.max(20, left - 46)
        : Math.min(vw - 20, right + 46);
      add(x, b.t);
      add(x, b.b);
    }
  }
  return runs.filter((r) => r.length > 1);
}

function curve(points) {
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const h = Math.max(0, b.y - a.y);
    if (Math.abs(a.x - b.x) < 1) {
      // along a lane: a gentle hand wobble instead of a ruled line
      const w = Math.min(7, h / 40) * (i % 2 ? 1 : -1);
      d += ` C${(a.x + w).toFixed(1)} ${(a.y + h * 0.35).toFixed(1)} ${(b.x - w).toFixed(1)} ${(b.y - h * 0.35).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    } else {
      const k = h * 0.55;
      d += ` C${a.x.toFixed(1)} ${(a.y + k).toFixed(1)} ${b.x.toFixed(1)} ${(b.y - k).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
  }
  return d;
}

function buildThread() {
  const runs = waypoints();
  $$('path', svgT).forEach((p, i) => { if (i >= runs.length) p.remove(); });
  segs = [];
  table = [];
  total = 0;
  runs.forEach((run, i) => {
    let el = $$('path', svgT)[i];
    if (!el) { el = document.createElementNS('http://www.w3.org/2000/svg', 'path'); svgT.insertBefore(el, nibDot); }
    el.setAttribute('d', curve(run));
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len} ${len + 1}`;
    segs.push({ el, len, start: total });
    const n = Math.max(2, Math.ceil(len / 10));
    for (let k = 0; k <= n; k++) {
      const pt = el.getPointAtLength((len * k) / n);
      table.push([total + (len * k) / n, pt.x, pt.y]);
    }
    total += len;
  });
  shown = Math.min(shown, total);
  paint(reduced ? total : shown);
}

// how much of the thread should be drawn: up to the reading line
function targetLen() {
  if (!armed || !table.length) return 0;
  const y = scrollY + innerHeight * 0.64;
  if (y <= table[0][2]) return 0;
  // the line only ever travels down, so y rises with length: binary search
  let lo = 0, hi = table.length - 1;
  if (y >= table[hi][2]) return total;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (table[m][2] < y) lo = m; else hi = m; }
  const [l0, , y0] = table[lo], [l1, , y1] = table[hi];
  return l0 + (l1 - l0) * ((y - y0) / Math.max(1e-6, y1 - y0));
}

function pointAt(len) {
  let lo = 0, hi = table.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (table[m][0] < len) lo = m; else hi = m; }
  const [l0, x0, y0] = table[lo], [l1, x1, y1] = table[hi];
  const f = l1 > l0 ? (len - l0) / (l1 - l0) : 0;
  return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
}

function paint(len) {
  for (const s of segs) s.el.style.strokeDashoffset = s.len - Math.max(0, Math.min(s.len, len - s.start));
  if (!table.length) return;
  const [x, y] = pointAt(len);
  nibDot.setAttribute('cx', x.toFixed(1));
  nibDot.setAttribute('cy', y.toFixed(1));
  svgT.classList.toggle('live', armed && !reduced && len > 2 && len < total - 2);
}

let raf = 0;
function tick() {
  raf = 0;
  const t = targetLen();
  // ink flows toward the reading position rather than jumping to it
  shown += (t - shown) * 0.14;
  if (Math.abs(t - shown) < 0.5) shown = t;
  paint(shown);
  if (shown !== t) raf = requestAnimationFrame(tick);
}
const kick = () => { if (!raf && !reduced) raf = requestAnimationFrame(tick); };

// ── drawings start when they come into view ──────────────────
function observe() {
  const pen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      draw(e.target);
      pen.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -28% 0px' });
  $$('.ink:not(.ink-nib)').forEach((f) => pen.observe(f));
}

// ── boot ─────────────────────────────────────────────────────
fill();
observe();
const inks = $$('.ink');
Promise.all(inks.map(loadInk)).then(async () => {
  await document.fonts?.ready;
  buildThread();
  // the pen draws first; the thread leaves its tip when it is done
  const pen = $('.ink-nib');
  setTimeout(() => {
    const t = draw(pen) || 0;
    setTimeout(() => { armed = true; kick(); }, reduced ? 0 : t + 200);
  }, reduced ? 0 : 400);
});

addEventListener('scroll', kick, { passive: true });
let rt = 0;
const rebuild = () => { clearTimeout(rt); rt = setTimeout(() => { buildThread(); kick(); }, 120); };
addEventListener('resize', rebuild);
new ResizeObserver(rebuild).observe($('main'));
