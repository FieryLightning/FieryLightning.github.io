// ─────────────────────────────────────────────────────────────
//  Procedural sound (Web Audio). No audio files: every effect is
//  synthesised from oscillators, filtered noise and envelopes.
//  Off by default; the choice is remembered.
// ─────────────────────────────────────────────────────────────

const KEY = 'ky-sound';
let ctx = null;
let out = null;
let noise = null;
let enabled = false;
let pending = null; // { fn, at }: the last sound asked for while the engine was asleep
try { enabled = localStorage.getItem(KEY) === '1'; } catch { /* private mode */ }

// Browsers put the engine to sleep (background tab, screen lock, another app
// taking the audio; Safari calls it "interrupted" rather than "suspended").
// Waking is async, so a sound requested just before is played once it is up.
function wake() {
  if (!ctx || ctx.state === 'running') return;
  ctx.resume().then(() => {
    const p = pending;
    pending = null;
    if (p && enabled && ctx.state === 'running' && performance.now() - p.at < 500) p.fn();
  }, () => { /* not allowed yet: the next gesture tries again */ });
}

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    out = ctx.createGain();
    out.gain.value = 0.55;
    out.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  wake();
}

const onShow = () => { if (enabled && !document.hidden) wake(); };
document.addEventListener('visibilitychange', onShow);
addEventListener('pageshow', onShow);

/** true if a sound can play now; otherwise keeps `retry` for when the engine wakes */
function ready(retry) {
  if (!enabled || !ctx) return false;
  if (ctx.state === 'running') return true;
  pending = { fn: retry, at: performance.now() };
  return false;
}

function env(g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(type, freq, t, peak, attack, decay, endFreq) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + attack + decay);
  env(g, t, peak, attack, decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
  return o;
}

function hiss(t, { type = 'bandpass', f0 = 1800, f1 = 7000, q = 1.2, peak = 0.3, attack = 0.012, decay = 0.2 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
  const g = ctx.createGain();
  env(g, t, peak, attack, decay);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + attack + decay + 0.05);
}

export const sfx = {
  get enabled() { return enabled; },
  setEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
    if (enabled) ensure();
  },
  /** call from any user gesture so the context can start */
  unlock() { if (enabled) ensure(); },

  /** blade through air + ringing steel */
  shing(intensity = 1) {
    if (!ready(() => sfx.shing(intensity))) return;
    const t = ctx.currentTime;
    const i = 0.35 + 0.65 * intensity;
    hiss(t, { peak: 0.32 * i, decay: 0.18 + 0.1 * intensity });
    [2793, 4187, 5521, 7243].forEach((f, k) =>
      tone('sine', f * (0.985 + Math.random() * 0.03), t + 0.025, (0.05 * i) / (k + 1), 0.006, 0.45 + k * 0.07));
  },
  /** blade-on-blade parry */
  parry() {
    if (!ready(() => sfx.parry())) return;
    const t = ctx.currentTime;
    hiss(t, { type: 'highpass', f0: 3200, f1: 2400, q: 0.7, peak: 0.22, attack: 0.002, decay: 0.07 });
    tone('triangle', 1870, t, 0.09, 0.002, 0.16);
    tone('sine', 3120, t, 0.05, 0.002, 0.22);
  },
  /** electric scoring box: a touch is scored */
  touch() {
    if (!ready(() => sfx.touch())) return;
    const t = ctx.currentTime;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    lp.connect(out);
    for (const f of [880, 886]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = f;
      env(g, t, 0.07, 0.005, 0.32);
      o.connect(g).connect(lp);
      o.start(t);
      o.stop(t + 0.4);
    }
  },
  /** small UI tick */
  blip(f = 1400) {
    if (!ready(() => sfx.blip(f))) return;
    tone('sine', f, ctx.currentTime, 0.04, 0.003, 0.05);
  },
  /** access denied / false start */
  denied() {
    if (!ready(() => sfx.denied())) return;
    const t = ctx.currentTime;
    tone('sawtooth', 150, t, 0.08, 0.01, 0.26, 92);
    tone('square', 75, t, 0.04, 0.01, 0.26, 60);
  },
  /** rising arm-up for the referee's "Allez!" */
  allez() {
    if (!ready(() => sfx.allez())) return;
    const t = ctx.currentTime;
    tone('triangle', 520, t, 0.06, 0.01, 0.16, 1560);
    tone('sine', 1040, t + 0.05, 0.04, 0.01, 0.2, 2080);
  },
};
