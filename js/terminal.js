// ─────────────────────────────────────────────────────────────
//  In-page terminal: ` to toggle, Esc to close.
//  Tab completes commands and project ids, ↑/↓ walk history.
// ─────────────────────────────────────────────────────────────

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const FONT = {
  K: ['█  █', '█ █ ', '██  ', '█ █ ', '█  █'],
  Y: ['█   █', ' █ █ ', '  █  ', '  █  ', '  █  '],
  U: ['█  █', '█  █', '█  █', '█  █', '▀██▀'],
  A: ['▄██▄', '█  █', '████', '█  █', '█  █'],
  N: ['█   █', '██  █', '█ █ █', '█  ██', '█   █'],
};
const banner = (word) =>
  [0, 1, 2, 3, 4].map((r) => [...word].map((ch) => (FONT[ch] ? FONT[ch][r] : '    ')).join('  ')).join('\n');

export function createTerminal({ root, profile, projects, loadout, actions }) {
  const out = root.querySelector('.term-out');
  const input = root.querySelector('.term-in');
  const history = [];
  let hIdx = 0;
  let booted = false;

  const find = (q) => {
    if (!q) return null;
    const k = q.toLowerCase();
    const n = parseInt(k, 10);
    if (!Number.isNaN(n) && projects[n - 1]) return projects[n - 1];
    return projects.find((p) => p.id === k || p.name.toLowerCase() === k || p.name.toLowerCase().replace(/\s+/g, '-') === k)
      || projects.find((p) => p.id.startsWith(k) || p.name.toLowerCase().startsWith(k));
  };

  function print(htmlLine = '', cls = '') {
    const div = document.createElement('div');
    div.className = 'tl ' + cls;
    div.innerHTML = htmlLine;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }
  const lamp = (p) => (p.url ? '<span class="t-g">● LIVE   </span>' : '<span class="t-r">● PRIVATE</span>');

  const COMMANDS = {
    help: {
      desc: 'list commands',
      run() {
        print('<span class="t-c">available commands</span>');
        for (const [name, c] of Object.entries(COMMANDS)) {
          if (c.hidden) continue;
          print(`  <span class="t-a">${name.padEnd(9)}</span><span class="t-m">${esc(c.desc)}</span>`);
        }
        print('<span class="t-m">  tab completes · ↑/↓ history · esc closes</span>');
      },
    },
    whoami: {
      desc: 'who built this',
      run() {
        print(`<span class="t-a">${esc(profile.name)}</span> <span class="t-m">(${esc(profile.handle)} · @${esc(profile.github)})</span>`);
        print(`${esc(profile.role)}. ${esc(profile.education)}.`);
        print(`fences <span class="t-c">${esc(profile.weapon.toLowerCase())}</span>.`);
      },
    },
    ls: {
      desc: 'list builds',
      run() {
        projects.forEach((p, i) => {
          print(`  <span class="t-m">T-${String(i + 1).padStart(2, '0')}</span>  ${lamp(p)}  <span class="t-a">${esc(p.id.padEnd(12))}</span><span class="t-m">${esc(p.tagline)}</span>`);
        });
        print(`<span class="t-m">  ${projects.length} builds · try</span> <span class="t-a">open studyarea</span> <span class="t-m">or</span> <span class="t-a">info kevcal</span>`);
      },
    },
    open: {
      desc: 'open a live build: open <id|n>',
      arg: 'project',
      run([q]) {
        const p = find(q);
        if (!p) return print(`<span class="t-r">open: no build matches “${esc(q ?? '')}”. try</span> <span class="t-a">ls</span>`);
        if (!p.url) {
          actions.denied();
          print(`<span class="t-r">✖ access denied</span> — ${esc(p.name)} is a private build with no public link.`);
          if (p.source) print(`<span class="t-m">  its source is public:</span> <span class="t-a">src ${esc(p.id)}</span>`);
          return;
        }
        actions.touch();
        print(`<span class="t-g">✔ touché</span> → opening <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a>`);
        window.open(p.url, '_blank', 'noopener');
      },
    },
    src: {
      desc: 'open public source: src <id>',
      arg: 'project',
      run([q]) {
        const p = find(q);
        if (!p) return print(`<span class="t-r">src: no build matches “${esc(q ?? '')}”.</span>`);
        if (!p.source) return print(`<span class="t-r">src: ${esc(p.name)} source is private.</span>`);
        print(`→ opening <a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.source)}</a>`);
        window.open(p.source, '_blank', 'noopener');
      },
    },
    info: {
      desc: 'details on a build: info <id|n>',
      arg: 'project',
      run([q]) {
        const p = find(q);
        if (!p) return print(`<span class="t-r">info: no build matches “${esc(q ?? '')}”.</span>`);
        print(`${lamp(p)} <span class="t-a">${esc(p.name)}</span> — ${esc(p.tagline)}`);
        if (p.role) print(`<span class="t-c">role </span> ${esc(p.role)}`);
        print(`<span class="t-m">${esc(p.description)}</span>`);
        print(`<span class="t-c">stack</span> ${p.stack.map(esc).join(' · ')}`);
        if (p.url) print(`<span class="t-c">link </span> <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a>${p.access ? ` <span class="t-y">(${esc(p.access.toLowerCase())})</span>` : ''}`);
        else print(`<span class="t-c">link </span> <span class="t-r">${esc(p.privateNote || 'private build')}</span>`);
      },
    },
    stack: {
      desc: 'the loadout',
      run() {
        for (const s of loadout) print(`  <span class="t-c">${esc(s.slot.padEnd(10))}</span>${s.items.map(esc).join(' · ')}`);
      },
    },
    allez: {
      desc: 'start the bout',
      run() {
        actions.slash();
        print('<span class="t-g">⚔ allez!</span> <span class="t-m">— attack in preparation… touché.</span>');
      },
    },
    drill: {
      desc: 'reflex drill',
      run() {
        print('<span class="t-c">→ to the drill. en garde.</span>');
        setTimeout(() => { close(); actions.drill(); }, 350);
      },
    },
    sound: {
      desc: 'sound on|off',
      run([v]) {
        const on = v ? v === 'on' : !actions.soundEnabled();
        actions.sound(on);
        print(`sound <span class="${on ? 't-g' : 't-r'}">${on ? 'on' : 'off'}</span>`);
      },
    },
    github: {
      desc: 'open GitHub profile',
      run() {
        print(`→ <a href="${esc(profile.githubUrl)}" target="_blank" rel="noopener">${esc(profile.githubUrl)}</a>`);
        window.open(profile.githubUrl, '_blank', 'noopener');
      },
    },
    off: {
      desc: 'leave the strip: Off the Piste mode',
      run() {
        print('→ off the piste. <span class="t-m">ink and paper…</span>');
        setTimeout(() => { location.href = 'off/'; }, 420);
      },
    },
    history: { desc: 'command history', run() { history.forEach((h, i) => print(`  <span class="t-m">${i + 1}</span>  ${esc(h)}`)); } },
    clear: { desc: 'clear the screen', run() { out.innerHTML = ''; } },
    exit: { desc: 'close the terminal', run() { close(); } },
    // hidden ones
    echo: { hidden: true, run(a) { print(esc(a.join(' '))); } },
    date: { hidden: true, run() { print(new Date().toString()); } },
    sudo: { hidden: true, run() { actions.denied(); print('<span class="t-r">permission denied:</span> the referee has the final say.'); } },
    rm: { hidden: true, run() { actions.denied(); print('<span class="t-y">▮ halte!</span> yellow card for dangerous play.'); } },
    fleche: { hidden: true, run() { print('the flèche has been banned in sabre since 1992. try <span class="t-a">allez</span>.'); } },
    salute: { hidden: true, run() { print('🤺 salute returned. bon match.'); } },
    hello: { hidden: true, run() { print('🤺 salute. type <span class="t-a">help</span>.'); } },
  };
  COMMANDS['flèche'] = COMMANDS.fleche;
  COMMANDS.hi = COMMANDS.hello;
  COMMANDS.apps = { ...COMMANDS.ls, hidden: true };
  COMMANDS.fence = { ...COMMANDS.allez, hidden: true };

  function exec(line) {
    const raw = line.trim();
    print(`<span class="t-ps">kyuan@piste:~$</span> ${esc(raw)}`, 'echo');
    if (!raw) return;
    history.push(raw);
    hIdx = history.length;
    const [cmd, ...args] = raw.split(/\s+/);
    const c = COMMANDS[cmd.toLowerCase()];
    if (!c) return print(`<span class="t-r">command not found:</span> ${esc(cmd)} <span class="t-m">— try</span> <span class="t-a">help</span>`);
    c.run(args);
  }

  function complete() {
    const v = input.value;
    const parts = v.split(/\s+/);
    if (parts.length === 1) {
      const m = Object.keys(COMMANDS).filter((k) => !COMMANDS[k].hidden && k.startsWith(parts[0].toLowerCase()));
      if (m.length === 1) input.value = m[0] + ' ';
      else if (m.length > 1) print(`<span class="t-m">${m.join('  ')}</span>`);
    } else if (parts.length === 2 && COMMANDS[parts[0]]?.arg === 'project') {
      const m = projects.map((p) => p.id).filter((id) => id.startsWith(parts[1].toLowerCase()));
      if (m.length === 1) input.value = `${parts[0]} ${m[0]}`;
      else if (m.length > 1) print(`<span class="t-m">${m.join('  ')}</span>`);
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { exec(input.value); input.value = ''; }
    else if (e.key === 'Tab') { e.preventDefault(); complete(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx > 0) input.value = history[--hIdx] ?? ''; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] ?? ''; }
    else if (e.key === 'Escape' || e.key === '`') { e.preventDefault(); close(); }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
  });
  root.querySelector('.term-x').addEventListener('click', close);
  out.addEventListener('pointerdown', (e) => { if (!e.target.closest('a')) setTimeout(() => input.focus(), 0); });

  let lastFocus = null;
  function open() {
    if (root.classList.contains('open')) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add('open'));
    if (!booted) {
      booted = true;
      print(`<pre class="t-banner">${banner(profile.handle.toUpperCase())}</pre>`);
      print(`<span class="t-c">PISTE//OS 6.0</span> <span class="t-m">— ${projects.length} builds loaded · ${projects.filter((p) => p.url).length} live</span>`);
      print('<span class="t-m">type</span> <span class="t-a">help</span> <span class="t-m">to begin.</span>');
    }
    setTimeout(() => input.focus(), 30);
  }
  function close() {
    if (!root.classList.contains('open')) return;
    root.classList.remove('open');
    setTimeout(() => { root.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  const toggle = () => (root.classList.contains('open') ? close() : open());

  return { open, close, toggle, exec, get isOpen() { return root.classList.contains('open'); } };
}
