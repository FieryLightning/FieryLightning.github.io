# KYUAN · PISTE//OS

Personal profile site: AI tools and apps I've built, themed around sabre fencing.
Static files only (HTML, CSS, ES modules, SVG), so it runs on GitHub Pages as is. No build step, no dependencies.

## What's inside

| Piece | How it works |
|---|---|
| GPU particle field | WebGL2 **transform feedback**: particle state ping-pongs between two GPU buffers, updated in a vertex shader with the rasterizer off. Curl noise (3D simplex) keeps the flow divergence-free. Particles render as instanced streaks that lengthen with speed. Shaders compile in the background via `KHR_parallel_shader_compile`. When the frame rate drops, the particle count is reduced automatically. |
| Sabre cuts | Canvas 2D overlay. Fast swipes become cuts with sparks and wake the particle field along the blade path (coalesced pointer events for smooth trails). Click to parry: a shock ring. |
| Sound | Web Audio synthesis, no audio files: blade "shing", parry clank, scoring-box buzzer. Off by default; toggle **SND** in the HUD. |
| Scoreboard | 7-segment SVG renderer styled like a fencing scoring apparatus. Red = private builds, green = live builds, plus a bout clock. |
| Piste navigation | The page is a 14 m fencing strip (correct en garde lines, centre line and warning zones). A fencer marker advances as you scroll and lunges while you move. |
| Terminal | Press <kbd>`</kbd>. Try `help`, `ls`, `open studyarea`, `info kevcal`, `allez`, `drill`. Tab completes, ↑/↓ for history. |
| Reflex drill | Five-round reaction game. Timed from the frame the lamp is painted (double `requestAnimationFrame`) to the input event's own timestamp. Go early and you get a yellow card. |
| Filters | View Transitions API animates the grid when you filter LIVE / PRIVATE. |
| Easter eggs | Click the name. Konami code. `sudo` in the terminal. |

Respects `prefers-reduced-motion` (no intro, calmer field, no reveal animations). Without WebGL2 it falls back to a static background. Without JavaScript it shows a plain list of the builds.

## Edit the content

Everything lives in **`js/data.js`**:

- `profile`: name, handle, GitHub, taglines, bio. Set `email` to show a mail button.
- `loadout`: the skills grid.
- `projects`: one entry per build. **Give a project a `url` and it shows as LIVE (green lamp, clickable). Leave `url` out and it shows as text only (red lamp).** `source` adds an optional public repo link.

Logos go in `assets/logos/`. Counts, headings, the scoreboard and the terminal all update from the data.

## Preview locally

ES modules don't load from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

**User site (recommended)**, served at `https://fierylightning.github.io/`:

```bash
git init -b main
git add .
git commit -m "PISTE//OS: personal site"
gh repo create FieryLightning.github.io --public --source . --push
gh api -X POST repos/FieryLightning/FieryLightning.github.io/pages -f "source[branch]=main" -f "source[path]=/"
```

**Project site** (any repo name), served at `https://fierylightning.github.io/<repo>/`: same steps with a different repo name. Then set `HOME = '/<repo>/'` in `404.html`. All other paths are relative, so nothing else changes.

Live at **https://fierylightning.github.io/**. If you move it to a project site, update the absolute `og:image`, `og:url` and canonical URLs in `index.html`.

## Files

```
index.html          page structure
404.html            "Hors piste" page
css/style.css       all styles
js/main.js          wiring: pointer, intro, cards, nav, loop
js/field.js         WebGL2 transform-feedback particle field
js/blade.js         Canvas 2D sabre trail, cuts, sparks
js/audio.js         Web Audio synthesis
js/seg.js           7-segment display renderer
js/terminal.js      in-page terminal
js/reflex.js        reflex drill
js/data.js          profile + projects  ← edit this
assets/             logos, brand mark, art, icon sprite, social card
```

Brand mark, The Dive logo, sabre, fencers, piste, icon sprite and social card: original SVGs drawn by Codex from a design brief. The other app logos come from each app's own repo.
