// ─────────────────────────────────────────────────────────────
//  Reflex drill: wait for the lamp, hit as fast as you can.
//  Timing is taken from the first frame the lit lamp is painted
//  (double rAF) to the input event's own high-resolution
//  timestamp, so handler latency doesn't count against you.
// ─────────────────────────────────────────────────────────────

const ROUNDS = 5;
const KEY = 'ky-reflex-best';

const RANKS = [
  [190, 'OLYMPIC REFLEXES'],
  [230, 'SABREUR'],
  [280, 'CLUB FENCER'],
  [350, 'EN GARDE'],
  [Infinity, 'WARMING UP'],
];
const rankFor = (ms) => RANKS.find(([t]) => ms < t)[1];

export function createDrill(root, { sfx, renderSeg, onFinish }) {
  const box = root.querySelector('.drill-box');
  const msg = root.querySelector('.drill-msg');
  const sub = root.querySelector('.drill-sub');
  const dots = root.querySelector('.drill-rounds');
  const startBtn = root.querySelector('.drill-start');
  const segLast = root.querySelector('[data-stat="last"]');
  const segAvg = root.querySelector('[data-stat="avg"]');
  const segBest = root.querySelector('[data-stat="best"]');
  const rankEl = root.querySelector('.drill-rank');

  let state = 'idle';
  let times = [];
  let timer = 0;
  let t0 = 0;
  let best = 0;
  try { best = +localStorage.getItem(KEY) || 0; } catch { /* ignore */ }

  const fmt = (ms) => (ms ? String(Math.min(999, ms)).padStart(3, ' ') : '---');
  renderSeg(segLast, '---');
  renderSeg(segAvg, '---');
  renderSeg(segBest, fmt(best));
  if (best) rankEl.textContent = `PB · ${rankFor(best)}`;

  function set(s, m, sb) {
    state = s;
    box.dataset.state = s;
    msg.textContent = m;
    if (sb != null) sub.textContent = sb;
  }
  function renderDots() {
    dots.innerHTML = Array.from({ length: ROUNDS }, (_, i) =>
      `<i class="${i < times.length ? 'done' : i === times.length && state !== 'done' ? 'cur' : ''}"></i>`).join('');
  }

  function start() {
    clearTimeout(timer);
    times = [];
    renderSeg(segLast, '---');
    renderSeg(segAvg, '---');
    arm();
  }
  function arm() {
    set('wait', 'EN GARDE', 'prêts… hit when the lamp turns green');
    renderDots();
    const delay = 1100 + Math.random() * 2600;
    timer = setTimeout(() => { if (state === 'wait') msg.textContent = 'PRÊTS ?'; }, Math.min(700, delay / 2));
    timer = setTimeout(go, delay);
  }
  function go() {
    set('go', 'ALLEZ !', 'now!');
    t0 = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => { t0 = performance.now(); }));
    sfx.touch();
  }

  function hit(ts) {
    if (state === 'idle' || state === 'done') return start();
    if (state === 'wait') {
      clearTimeout(timer);
      sfx.denied();
      set('false', 'FALSE START', 'yellow card — the round is replayed');
      timer = setTimeout(arm, 1500);
      return;
    }
    if (state === 'go') {
      const now = ts && ts > 0 ? ts : performance.now();
      const rt = Math.max(1, Math.round(now - (t0 || now)));
      times.push(rt);
      renderSeg(segLast, fmt(rt));
      sfx.parry();
      if (times.length >= ROUNDS) return finish();
      set('result', `${rt} ms`, `round ${times.length} of ${ROUNDS}`);
      renderDots();
      timer = setTimeout(arm, 1100);
    }
  }

  function finish() {
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const top = Math.min(...times);
    if (!best || top < best) {
      best = top;
      try { localStorage.setItem(KEY, String(best)); } catch { /* ignore */ }
    }
    renderSeg(segAvg, fmt(avg));
    renderSeg(segBest, fmt(best));
    const rank = rankFor(avg);
    rankEl.textContent = rank;
    set('done', `${avg} ms`, `average · ${rank.toLowerCase()} · hit to go again`);
    renderDots();
    onFinish?.({ avg, best, rank });
  }

  box.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    hit(e.timeStamp);
  });
  startBtn.addEventListener('click', () => { start(); box.focus({ preventScroll: true }); });

  // keyboard: Space / Enter. Only captured while a drill is running or the box has focus.
  let inView = false;
  new IntersectionObserver(([en]) => { inView = en.isIntersecting; }, { threshold: 0.4 }).observe(box);
  addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (e.repeat) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const running = state === 'wait' || state === 'go' || state === 'result' || state === 'false';
    const focused = document.activeElement === box;
    if (!(running && inView) && !focused) return;
    e.preventDefault();
    hit(e.timeStamp);
  });

  renderDots();
  return { start, get best() { return best; } };
}
