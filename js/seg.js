// 7-segment display renderer (SVG), styled like a fencing scoring box.
// Unlit segments are drawn faintly, like a real LED panel.

const SEGMENTS = {
  a: [[5, 3], [8, 0], [28, 0], [31, 3], [28, 6], [8, 6]],
  g: [[5, 32], [8, 29], [28, 29], [31, 32], [28, 35], [8, 35]],
  d: [[5, 61], [8, 58], [28, 58], [31, 61], [28, 64], [8, 64]],
  f: [[3, 5], [6, 8], [6, 27], [3, 30], [0, 27], [0, 8]],
  e: [[3, 34], [6, 37], [6, 56], [3, 59], [0, 56], [0, 37]],
  b: [[33, 5], [36, 8], [36, 27], [33, 30], [30, 27], [30, 8]],
  c: [[33, 34], [36, 37], [36, 56], [33, 59], [30, 56], [30, 37]],
};
const DIGITS = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd',
  6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '',
};
const pts = (p) => p.map((q) => q.join(',')).join(' ');

/** Render `text` (digits, '-', ' ', ':') into `el` as an SVG 7-segment readout. */
export function renderSeg(el, text) {
  const DW = 36, GAP = 10, CW = 12;
  let x = 0;
  let body = '';
  for (const ch of String(text)) {
    if (ch === ':') {
      body += `<g class="seg-on"><rect x="${x + 3}" y="18" width="6" height="6"/><rect x="${x + 3}" y="40" width="6" height="6"/></g>`;
      x += CW + GAP / 2;
      continue;
    }
    const on = DIGITS[ch] ?? '';
    body += `<g transform="translate(${x} 0)">`;
    for (const [k, p] of Object.entries(SEGMENTS)) {
      body += `<polygon class="${on.includes(k) ? 'seg-on' : 'seg-off'}" points="${pts(p)}"/>`;
    }
    body += '</g>';
    x += DW + GAP;
  }
  const w = x - GAP;
  el.innerHTML = `<svg viewBox="-12 -2 ${w + 16} 68" aria-hidden="true"><g transform="skewX(-7)">${body}</g></svg>`;
  el.setAttribute('aria-label', String(text));
}
