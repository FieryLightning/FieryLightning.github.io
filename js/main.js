import { profile, projects, loadout } from './data.js';
import { createField } from './field.js';
import { createBlade } from './blade.js';
import { sfx } from './audio.js';
import { renderSeg } from './seg.js';
import { createTerminal } from './terminal.js';
import { createDrill } from './reflex.js';
import { waitForGate } from './gate.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad2 = (n) => String(n).padStart(2, '0');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ICONS = 'assets/icons.svg';
const icon = (id, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="${ICONS}#${id}"></use></svg>`;
const host = (u) => { try { return new URL(u).host + new URL(u).pathname.replace(/\/$/, ''); } catch { return u; } };

const live = projects.filter((p) => p.url);
const priv = projects.filter((p) => !p.url);

// ── shared pointer state ─────────────────────────────────────
const pointer = { x: innerWidth * 0.5, y: innerHeight * 0.5, vx: 0, vy: 0, t: performance.now(), inside: false, type: 'mouse' };

// ── engines ──────────────────────────────────────────────────
// The GPU field is built after first paint so shader compilation never
// delays the intro (all callers use `field?.`).
let field = null;
function bootField() {
  const fail = () => { field = null; html.classList.add('no-webgl'); };
  try { field = createField($('#field'), pointer, { reduced, onFail: fail }); } catch (e) { console.warn('[field]', e); }
  if (!field) fail();
}
const blade = createBlade($('#blade'), pointer, { reduced, onSlash: (i) => sfx.shing(i) });

addEventListener('pointermove', (e) => {
  const now = performance.now();
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  for (const ev of evs.length ? evs : [e]) blade.addPoint(ev.clientX, ev.clientY, now);
  const dt = Math.max(8, now - pointer.t);
  const vx = ((e.clientX - pointer.x) / dt) * 1000;
  const vy = ((e.clientY - pointer.y) / dt) * 1000;
  pointer.vx = pointer.vx * 0.35 + vx * 0.65;
  pointer.vy = pointer.vy * 0.35 + vy * 0.65;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.t = now;
  pointer.inside = true;
  pointer.type = e.pointerType || 'mouse';
}, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { pointer.inside = false; });
addEventListener('blur', () => { pointer.inside = false; });

addEventListener('pointerdown', (e) => {
  sfx.unlock();
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.t = performance.now();
  if (e.target.closest('#term, .drill-box')) return;
  field?.shock(e.clientX, e.clientY, 1);
  blade.burst(e.clientX, e.clientY, 14);
  if (!e.target.closest('a, button, input, [role="button"], .card')) sfx.parry();
}, { passive: true });
addEventListener('keydown', () => sfx.unlock(), { passive: true });
// a touch only counts as a user gesture when the finger lifts, so wake audio there too
addEventListener('pointerup', () => sfx.unlock(), { passive: true });

// ── hero ─────────────────────────────────────────────────────
$('#hero-name-sr').textContent = profile.handle;
$$('.sn-a, .sn-b').forEach((el) => { el.textContent = profile.handle; });
$('#hero-role').innerHTML = `${esc(profile.role)}.<br>${esc(profile.educationShort)}. ${esc(profile.weapon)} fencer.`;

function slashName() {
  const n = $('#name');
  if (!n) return;
  n.classList.remove('slashing');
  void n.offsetWidth;
  n.classList.add('slashing');
  const r = n.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const k = (0.22 * r.height) / r.width;
  blade.slash(r.left - 60, r.top + r.height * 0.64 + 60 * k, r.right + 60, r.top + r.height * 0.42 - 60 * k, { dur: 200, width: 3 });
  sfx.shing(1);
}
$('#name').addEventListener('click', slashName);

function screenSlash() {
  const y0 = innerHeight * (0.7 + Math.random() * 0.2), y1 = innerHeight * (0.1 + Math.random() * 0.2);
  blade.slash(-40, y0, innerWidth + 40, y1, { dur: 240, width: 4 });
  field?.shock(innerWidth / 2, (y0 + y1) / 2, 1.4);
  sfx.shing(1);
  slashName();
}

// scoreboard
renderSeg($('#sb-red'), pad2(priv.length));
renderSeg($('#sb-green'), pad2(live.length));
$('#sb-foot').textContent = `${pad2(projects.length)} BUILDS · P1 · ${profile.weapon.toUpperCase()}`;
const born = performance.now();
const tickClock = () => {
  const s = Math.floor((performance.now() - born) / 1000);
  renderSeg($('#clock'), `${pad2(Math.min(99, Math.floor(s / 60)))}:${pad2(s % 60)}`);
};
tickClock();
setInterval(tickClock, 1000);

async function typer() {
  const el = $('#typer');
  const lines = profile.taglines;
  if (reduced) { el.textContent = lines[0]; return; }
  for (let i = 0; ; i++) {
    const s = lines[i % lines.length];
    for (let k = 1; k <= s.length; k++) { el.textContent = s.slice(0, k); await sleep(30 + Math.random() * 45); }
    await sleep(2400);
    for (let k = s.length; k >= 0; k--) { el.textContent = s.slice(0, k); await sleep(14); }
    await sleep(260);
  }
}

// ── arsenal ──────────────────────────────────────────────────
const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
$('#arsenal-title').textContent = `${WORDS[projects.length] ?? projects.length} projects.`;
$('[data-filter="all"] .n').textContent = pad2(projects.length);
$('[data-filter="live"] .n').textContent = pad2(live.length);
$('[data-filter="private"] .n').textContent = pad2(priv.length);

function cardHTML(p, i) {
  const isLive = !!p.url;
  const idx = `T-${pad2(i + 1)}`;
  const foot = isLive
    ? `<a class="card-enter" href="${esc(p.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(p.name)} (opens in a new tab)">
         <span>Enter</span>${icon('i-external')}
       </a>
       ${p.access ? `<span class="card-access">${esc(p.access)}</span>` : `<span class="card-host">${esc(host(p.url))}</span>`}`
    : `<span class="card-locked">${icon('i-lock')}<span>${esc(p.privateNote || 'Private build')} · no public link</span></span>`;
  const src = p.source ? `<a class="card-src" href="${esc(p.source)}" target="_blank" rel="noopener">${icon('i-github')}<span>Source</span></a>` : '';
  return `
  <article class="card" data-status="${isLive ? 'live' : 'private'}" data-id="${esc(p.id)}" style="--accent:${esc(p.accent)};view-transition-name:card-${esc(p.id)}" data-reveal>
    <span class="card-glint" aria-hidden="true"></span>
    <span class="card-denied" aria-hidden="true">ACCESS DENIED</span>
    <header class="card-top">
      <span class="card-idx">${idx}</span>
      <span class="card-state"><i class="lamp ${isLive ? 'lamp-green' : 'lamp-red'}"></i>${isLive ? 'LIVE' : 'PRIVATE'}</span>
    </header>
    <div class="card-head">
      <div class="emblem"><img src="${esc(p.logo)}" alt="${esc(p.name)} logo" width="56" height="56" loading="lazy" decoding="async"></div>
      <div>
        <h3 class="card-name">${esc(p.name)}</h3>
        <p class="card-tag">${esc(p.tagline)}</p>
      </div>
    </div>
    ${p.role ? `<p class="card-role"><span>ROLE</span>${esc(p.role)}</p>` : ''}
    <p class="card-desc">${esc(p.description)}</p>
    <ul class="chips" aria-label="Built with">${p.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <footer class="card-foot">${foot}${src}</footer>
  </article>`;
}
const grid = $('#grid');
grid.innerHTML = projects.map(cardHTML).join('');

for (const card of $$('.card', grid)) {
  if (fine && !reduced) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width;
      const my = (e.clientY - r.top) / r.height;
      card.style.setProperty('--rx', `${((0.5 - my) * 7).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((mx - 0.5) * 9).toFixed(2)}deg`);
      card.style.setProperty('--mx', `${(mx * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(my * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }
  card.addEventListener('pointerenter', () => sfx.blip(1700));
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-src')) return;
    const r = card.getBoundingClientRect();
    if (card.dataset.status === 'live') {
      blade.slash(r.left - 20, r.bottom - 10, r.right + 20, r.top + 10, { dur: 180, width: 3, glow: '#1dff8e' });
      sfx.touch();
      card.classList.remove('touched');
      void card.offsetWidth;
      card.classList.add('touched');
      // make the whole card a target without nesting interactive elements
      if (!e.target.closest('a')) window.open(card.querySelector('.card-enter').href, '_blank', 'noopener');
    } else {
      sfx.denied();
      card.classList.remove('denied');
      void card.offsetWidth;
      card.classList.add('denied');
    }
  });
}

function applyFilter(f) {
  $$('.filters button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
  const run = () => $$('.card', grid).forEach((c) => { c.hidden = !(f === 'all' || c.dataset.status === f); });
  if (document.startViewTransition && !reduced) document.startViewTransition(run);
  else run();
  sfx.blip(1200);
}
$$('.filters button').forEach((b) => b.addEventListener('click', () => applyFilter(b.dataset.filter)));

// ── salle ────────────────────────────────────────────────────
$('#pc-name').textContent = profile.name;
$('#pc-handle').textContent = '@' + profile.github;
$('#pc-handle').href = profile.githubUrl;
$('#pc-edu').textContent = profile.education;
$('#pc-weapon').textContent = profile.weapon;
$('#pc-builds').textContent = `${projects.length} built · ${live.length} live`;
$('#bio').innerHTML = profile.bio.map((p) => `<p>${esc(p)}</p>`).join('');
$('#loadout').innerHTML = loadout.map((s) => `
  <div class="slot" data-reveal>
    <div class="slot-head">${icon(s.icon)}<span>${esc(s.slot)}</span><b>${pad2(s.items.length)}</b></div>
    <ul>${s.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>
  </div>`).join('');

// ── salute ───────────────────────────────────────────────────
$('#gh-link').href = profile.githubUrl;
$('#gh-link .lbl').textContent = 'github.com/' + profile.github;
if (profile.email) {
  const a = $('#mail-link');
  a.href = 'mailto:' + profile.email;
  a.querySelector('.lbl').textContent = profile.email;
  a.hidden = false;
}
$('#year').textContent = new Date().getFullYear();

// ── terminal ─────────────────────────────────────────────────
const term = createTerminal({
  root: $('#term'),
  profile, projects, loadout,
  actions: {
    slash: screenSlash,
    touch: () => sfx.touch(),
    denied: () => sfx.denied(),
    drill: () => { $('#drill').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => drill.start(), 700); },
    sound: (on) => setSound(on),
    soundEnabled: () => sfx.enabled,
  },
});
$$('[data-open-term]').forEach((b) => b.addEventListener('click', () => term.toggle()));

// ── drill ────────────────────────────────────────────────────
const drill = createDrill($('#drill'), {
  sfx, renderSeg,
  onFinish: ({ avg }) => {
    toast(`DRILL COMPLETE · ${avg} ms average`);
    if (avg < 230) screenSlash();
  },
});

// ── sound toggle ─────────────────────────────────────────────
const sndBtn = $('#snd');
function setSound(on) {
  sfx.setEnabled(on);
  sndBtn.setAttribute('aria-pressed', String(on));
  sndBtn.querySelector('use').setAttribute('href', `${ICONS}#${on ? 'i-sound-on' : 'i-sound-off'}`);
  sndBtn.querySelector('.lbl').textContent = on ? 'SND ON' : 'SND OFF';
  if (on) setTimeout(() => sfx.shing(0.6), 30);
}
setSound(sfx.enabled);
sndBtn.addEventListener('click', () => setSound(!sfx.enabled));

// ── keyboard ─────────────────────────────────────────────────
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let kIdx = 0;
addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
  if ((e.key === '`' || e.key === '~') && !typing) { e.preventDefault(); term.toggle(); return; }
  if (e.key === 'Escape' && term.isOpen) { term.close(); return; }
  if (typing) return;
  kIdx = e.key === KONAMI[kIdx] || e.key.toLowerCase() === KONAMI[kIdx] ? kIdx + 1 : (e.key === KONAMI[0] ? 1 : 0);
  if (kIdx === KONAMI.length) {
    kIdx = 0;
    field?.setFlow(3);
    html.classList.add('frenzy');
    screenSlash();
    toast('FRENZY MODE · flèche unlocked (banned in sabre since 1992)');
    setTimeout(() => { field?.setFlow(reduced ? 0.35 : 1); html.classList.remove('frenzy'); }, 7000);
  }
});

// ── toast ────────────────────────────────────────────────────
let toastTimer = 0;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ── piste navigation (scroll position as a fencer on the strip) ──
const SECTIONS = ['en-garde', 'arsenal', 'salle', 'drill', 'salute'];
const ANCHORS = [1, 4, 7, 10, 13].map((m) => m / 14); // metres along a 14 m piste
const nav = $('.piste-nav');
const navLinks = $$('.piste-nav a');
let tops = [];
const measure = () => { tops = SECTIONS.map((id) => $('#' + id).getBoundingClientRect().top + scrollY); };
let lastActive = -1;
function updatePiste() {
  const probe = scrollY + innerHeight * 0.4;
  const max = document.documentElement.scrollHeight - innerHeight;
  let i = 0;
  while (i < tops.length - 1 && probe >= tops[i + 1]) i++;
  let p;
  if (scrollY >= max - 2) { p = ANCHORS[ANCHORS.length - 1]; i = ANCHORS.length - 1; }
  else if (i >= tops.length - 1) p = ANCHORS[i];
  else {
    const f = Math.max(0, Math.min(1, (probe - tops[i]) / (tops[i + 1] - tops[i])));
    p = ANCHORS[i] + (ANCHORS[i + 1] - ANCHORS[i]) * f;
  }
  nav.style.setProperty('--p', p.toFixed(4));
  if (i !== lastActive) {
    lastActive = i;
    navLinks.forEach((a, k) => (k === i ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  }
}
navLinks.forEach((a, k) => { a.style.setProperty('--x', ANCHORS[k]); });
measure();
new ResizeObserver(() => { measure(); updatePiste(); }).observe(document.body);
document.fonts?.ready.then(() => { measure(); updatePiste(); });

// ── reveal on scroll ─────────────────────────────────────────
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
if (!reduced) html.classList.add('reveal-on');
$$('[data-reveal]').forEach((el, i) => { el.style.setProperty('--d', `${(i % 3) * 70}ms`); io.observe(el); });

// ── main loop ────────────────────────────────────────────────
let last = performance.now();
let lastSY = scrollY;
let moving = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (now - pointer.t > 40) { pointer.vx *= 0.75; pointer.vy *= 0.75; }

  const sy = scrollY;
  if (sy !== lastSY) {
    field?.scroll((sy - lastSY) / Math.max(dt, 1 / 240));
    // full intensity behind the hero, calmer behind reading sections
    field?.setGain((reduced ? 0.7 : 1) * (0.55 + 0.45 * Math.max(0, 1 - sy / innerHeight)));
    updatePiste();
    moving = now;
    nav.dataset.moving = 'true';
    lastSY = sy;
  } else if (moving && now - moving > 180) {
    moving = 0;
    nav.dataset.moving = 'false';
  }

  field?.frame(now / 1000, dt);
  blade.frame(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);


// ── intro: "En garde. Prêts ? Allez !" ───────────────────────
async function intro() {
  const el = $('#intro');
  const seen = html.classList.contains('intro-seen');
  if (!el || seen || reduced) { el?.remove(); return afterIntro(true); }
  // wall-clock timing (not frame counting) so the referee's rhythm holds on slow devices
  let skipped = false;
  let onSkip;
  const skipP = new Promise((r) => { onSkip = r; });
  const skip = () => { skipped = true; onSkip(); };
  addEventListener('keydown', skip, { once: true });
  el.addEventListener('pointerdown', skip, { once: true });
  const wait = (ms) => (skipped ? Promise.resolve() : Promise.race([sleep(ms), skipP]));
  const call = $('#intro-call');
  await wait(260);
  call.textContent = 'EN GARDE';
  call.className = 'intro-call show';
  await wait(560);
  call.textContent = 'PRÊTS ?';
  call.className = 'intro-call show';
  await wait(520);
  call.textContent = 'ALLEZ !';
  call.className = 'intro-call show go';
  el.classList.add('lit');
  sfx.allez();
  await wait(360);
  el.classList.add('split');
  blade.slash(-60, innerHeight * 0.78, innerWidth + 60, innerHeight * 0.22, { dur: 200, width: 4 });
  sfx.shing(1);
  try { sessionStorage.setItem('ky-intro', '1'); } catch { /* ignore */ }
  await sleep(240);
  afterIntro(false);
  await sleep(620);
  el.remove();
}

function afterIntro(quick) {
  html.classList.add('ready');
  setTimeout(() => {
    $('.scorebox').classList.add('lit');
    if (!reduced) slashName();
    field?.shock(innerWidth * 0.3, innerHeight * 0.45, 1.2);
  }, quick ? 350 : 60);
  typer();
}

updatePiste();
// the chooser comes first: the intro and the GPU field start only for this mode
waitForGate({ onChoose: (m) => { if (m === 'piste') sfx.shing(0.8); } }).then(() => {
  intro();
  requestAnimationFrame(() => setTimeout(bootField, 0));
});
