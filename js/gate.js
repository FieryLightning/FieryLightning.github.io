// ─────────────────────────────────────────────────────────────
//  Mode chooser. A plain visit to the root offers two ways in:
//  On the Piste (this page) and Off the Piste (off/). Both sides
//  are ordinary links, so it works without JS too; here they get
//  the hover lean and the exit animations.
//
//  waitForGate() resolves once On the Piste is chosen (or at once
//  when there is no chooser), so the intro and the GPU field only
//  start for people who pick this mode.
// ─────────────────────────────────────────────────────────────

const html = document.documentElement;

export function waitForGate({ onChoose } = {}) {
  const el = document.getElementById('gate');
  if (!el || !html.classList.contains('gate')) {
    el?.remove();
    return Promise.resolve();
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behind = [...document.querySelectorAll('body > .skip, body > header, body > main')];
  behind.forEach((n) => { n.inert = true; });

  const lean = (mode) => { if (!el.dataset.chosen) el.dataset.lean = mode || ''; };

  return new Promise((resolve) => {
    for (const side of el.querySelectorAll('.gate-side')) {
      side.addEventListener('pointerenter', () => lean(side.dataset.mode));
      side.addEventListener('focus', () => lean(side.dataset.mode));
      side.addEventListener('click', (e) => {
        // let new-tab / new-window clicks behave as normal links
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        choose(side.dataset.mode, side.href);
      });
    }
    el.addEventListener('pointerleave', () => lean(''));

    function choose(mode, href) {
      if (el.dataset.chosen) return;
      el.dataset.chosen = mode;
      onChoose?.(mode);
      if (mode === 'off') {
        setTimeout(() => { location.href = href; }, reduced ? 0 : 760);
        return;
      }
      // a reload or a shared link now goes straight to this mode
      const u = new URL(location.href);
      u.searchParams.set('mode', 'piste');
      history.replaceState(history.state, '', u);
      behind.forEach((n) => { n.inert = false; });
      html.classList.remove('gate');
      resolve();
      setTimeout(() => el.remove(), reduced ? 0 : 1100);
    }

    // coming back from off/ with the back button restores this page
    // from the cache mid-exit: put the chooser back to rest
    addEventListener('pageshow', (e) => {
      if (e.persisted && el.dataset.chosen === 'off') {
        delete el.dataset.chosen;
        lean('');
      }
    });
  });
}
