// ─────────────────────────────────────────────────────────────
//  Single source of truth for the site.
//  Edit this file to change the profile or add / remove builds.
//
//  A project with a `url` is shown as LIVE (green lamp) and is
//  clickable. Without a `url` it is shown as text only (red lamp).
//  `source` is optional: a link to a public repository.
//  `tint` is the light glass colour of the project's card.
// ─────────────────────────────────────────────────────────────

export const profile = {
  handle: 'KYUAN',
  name: 'Kevin Y.',
  github: 'FieryLightning',
  githubUrl: 'https://github.com/FieryLightning',
  email: '', // optional: add an address to show a "mail" button in the Salute section
  education: 'CS graduate, University of Wisconsin–Madison',
  educationShort: 'CS graduate, UW–Madison',
  role: 'I build AI tools, apps & platforms',
  weapon: 'Sabre',
  bio: [
    'Sabre is the fastest weapon in fencing: the whole target above the waist is open, the edge counts as much as the point, and the fencer who commits first holds right of way.',
  ],
};

// Wording used only by the calm mode, Off the Piste (off/). Projects,
// tools and contact details are shared with the main page.
export const offPiste = {
  line: 'I studied computer science at UW–Madison. I build AI tools, apps and platforms.',
  coda: 'I also fence sabre.',
};

export const loadout = [
  { slot: 'Languages', icon: 'i-code', items: ['TypeScript', 'JavaScript', 'Python', 'Swift', 'SQL'] },
  { slot: 'Front end', icon: 'i-target', items: ['React 19', 'Next.js', 'Vite', 'PWA / Service Workers', 'IndexedDB (Dexie)'] },
  { slot: 'AI', icon: 'i-cpu', items: ['Claude API', 'OpenAI', 'Gemini', 'Whisper.cpp', 'Ollama · Qwen', 'Reinforcement learning'] },
  { slot: 'Platform', icon: 'i-bolt', items: ['Node.js', 'FastAPI', 'Supabase · Postgres', 'Vercel', 'Cloudflare', 'GitHub Pages', 'Drizzle ORM', 'Apple Vision'] },
];

export const projects = [
  {
    id: 'the-dive',
    name: 'The Dive',
    tagline: 'Learning AI, by depth',
    description:
      'A hand-picked reading list for learning AI, organised by depth instead of category: five zones from the Tide Pool to Build Your Own Submarine, 40 entries. One file, no build step, no tracking.',
    stack: ['Single-file HTML', 'CSS', 'GitHub Pages', 'No tracking'],
    logo: 'assets/logos/the-dive.svg',
    accent: '#2fd4ff',
    tint: '#84dfff', // card glass colour on the main page
    url: 'https://fierylightning.github.io/the-dive/',
    source: 'https://github.com/FieryLightning/the-dive',
  },
  {
    id: 'studyarea',
    name: 'StudyArea',
    tagline: 'Offline-first AI study coach',
    description:
      'Turns notes, files, links, audio or video into a topic tree and study packs, then drills you with spaced repetition, quizzes, worked examples and a study buddy you can teach. Bring your own Claude, OpenAI or Gemini key.',
    stack: ['React 19', 'TypeScript', 'Vite', 'IndexedDB', 'PWA', 'Claude · OpenAI · Gemini'],
    logo: 'assets/logos/studyarea.svg',
    accent: '#91b56e',
    tint: '#c2dd94', // card glass colour on the main page
    url: 'https://studyarea.vercel.app',
  },
  {
    id: 'field-guide',
    name: 'AI Coding Field Guide',
    tagline: 'Your first app, with an AI pair',
    description:
      'A mobile-first, offline-ready guide to building a first web app with Codex or Claude Code. Pick your tool at the top and every step, prompt and command adapts to it.',
    stack: ['React 19', 'TypeScript', 'Vite', 'PWA', 'Offline mode'],
    logo: 'assets/logos/ai-field-guide.png',
    accent: '#c4410b',
    tint: '#ffbe96', // card glass colour on the main page
    url: 'https://ai-coding-field-guide.vercel.app',
  },
  {
    id: 'formuai',
    name: 'FormuAI',
    tagline: 'AI platform for drug formulation',
    description:
      'Production tooling for PLGA microsphere formulation research. Predict the drug-release curve from formulation parameters, or work backwards from a target profile. AI reads figures in published papers, scientists confirm the data, and confirmed rows train the model.',
    stack: ['Next.js 14', 'TypeScript', 'FastAPI · Python', 'ML release model', 'Supabase · Postgres', 'Gemini'],
    logo: 'assets/logos/formuai.png',
    accent: '#5cc796',
    tint: '#8ae7c7', // card glass colour on the main page
    url: 'https://formuai-v1.vercel.app',
    access: 'By invitation',
    role: 'Took over development · Peregrine Technology',
  },
  {
    id: 'clearsteps',
    name: 'ClearSteps',
    tagline: 'Video → step-by-step guide',
    description:
      'Feed it a how-to video and get written instructions with original timestamps, real screenshots, prerequisites and honest uncertainty notes. Ads and filler are cut from the guide. Runs on phone, tablet or Mac, including a fully local Mac edition.',
    stack: ['Next.js', 'TypeScript', 'Mediabunny', 'Whisper.cpp', 'Ollama · Qwen', 'Gemini · OpenAI'],
    logo: 'assets/logos/clearsteps.svg',
    accent: '#3254dd',
    tint: '#cac8ff', // card glass colour on the main page
    privateNote: 'Private build',
  },
  {
    id: 'kevcal',
    name: 'KevCal',
    tagline: 'Photo → calendar, never guessing',
    description:
      'Point your phone at anything with a date on it and get a calendar entry. An AI reader reports only what is printed; a separate deterministic checker does every bit of date math, and when the two disagree it asks you instead of guessing.',
    stack: ['Node.js 22', 'Zero dependencies', 'Swift', 'Apple Vision OCR', 'Gemini · OpenAI'],
    logo: 'assets/logos/kevcal.png',
    accent: '#2f7aa8',
    tint: '#ffb6da', // card glass colour on the main page
    privateNote: 'Runs on your own machine',
    source: 'https://github.com/FieryLightning/KevCal',
  },
];
