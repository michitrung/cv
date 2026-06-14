// build.mjs — Portfolio + CV generator for Michal (Thanh Trung) Nguyen
// Node >= 18, ESM, zero runtime npm dependencies — Node builtins only.
// Reads ./cv.json (resolved relative to this file via import.meta.url).
// Writes ./dist/index.html and ./dist/cv.html (fully self-contained, no fetch).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir  = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, 'docs');   // GitHub Pages serves the site from /docs on the main branch
mkdirSync(outDir, { recursive: true });

const cv = JSON.parse(readFileSync(join(__dir, 'cv.json'), 'utf8'));

// ── Helpers ────────────────────────────────────────────────────────────────────

/** HTML-escape a value; returns '' for null/undefined. */
function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/** Escape and guard against stringified sentinel values. */
function safe(v) {
  if (v == null) return '';
  const s = String(v);
  if (s === 'undefined' || s === 'null' || s === '[object Object]') return '';
  return esc(s);
}

/** Render fn(arr) only when arr is a non-empty array; otherwise ''. */
function ifArr(arr, fn) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return fn(arr);
}

/** Format a work period object. */
function period(p) {
  if (!p) return '';
  if (p.display) return safe(p.display);
  const s = p.start ? safe(p.start) : '';
  const e = p.end   ? safe(p.end)   : 'present';
  return s ? `${s} – ${e}` : '';
}

// ── Data ───────────────────────────────────────────────────────────────────────

const {
  basics,
  work       = [],
  skills     = [],
  projects   = [],
  education  = [],
  languages  = [],
  interests  = [],
  // 'earlier' (pre-career roles) is intentionally not rendered on this CV;
  // it lives in cv.json as an archive. Remove from cv.json if no longer needed.
} = cv;

const {
  name            = '',
  goesBy          = '',
  headline        = '',
  pitch           = '',
  metaDescription = '',
  location        = '',
  email           = '',
  status          = '',
  profiles        = {},
  summary         = '',
} = basics || {};

// Full formal name for site headings/titles, e.g. "Thanh Trung Nguyen (Michal)".
const fullName = goesBy && goesBy !== name ? `${name} (${goesBy})` : name;

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — dist/index.html (Portfolio)
// ═══════════════════════════════════════════════════════════════════════════════

function buildWorkEntry(job) {
  if (!job.company) return '';

  const engBadge = job.engagement
    ? ` <span class="chip">${esc(job.engagement)}</span>`
    : '';

  const domainHtml = job.domain
    ? `<p class="domain">${safe(job.domain)}</p>`
    : '';

  const highlightsHtml = ifArr(job.highlights, hs =>
    `<ul class="bullets">${hs.map(h => `<li>${esc(h)}</li>`).join('\n')}</ul>`
  );

  const metricsHtml = ifArr(job.metrics, ms =>
    `<ul class="metrics">${ms.map(m => `<li class="metric">${esc(m)}</li>`).join('\n')}</ul>`
  );

  const stackHtml = ifArr(job.stack, s =>
    `<p class="stack">${s.map(esc).join(' · ')}</p>`
  );

  return `<article class="entry">
  <div class="role-line">
    <span class="role-title"><strong>${esc(job.company)}</strong> — ${esc(job.role)}${engBadge}</span>
    <span class="when">${period(job.period)}</span>
  </div>
  ${domainHtml}${highlightsHtml}${metricsHtml}${stackHtml}</article>`;
}

function buildProjectCard(p, isPlanned) {
  if (!p.name) return '';
  const chipClass   = isPlanned ? 'status-chip planned' : 'status-chip built';
  const chipLabel   = isPlanned ? 'planned' : 'built';
  const cardClass   = isPlanned ? 'proj-card planned' : 'proj-card';
  const ariaLabel   = isPlanned ? ` aria-label="Planned: ${esc(p.name)}"` : '';

  const taglineHtml     = p.tagline     ? `<p class="proj-tagline">${esc(p.tagline)}</p>`         : '';
  const descriptionHtml = p.description ? `<p class="proj-desc">${esc(p.description)}</p>`         : '';
  const techHtml        = ifArr(p.tech, ts =>
    `<p class="proj-tech">${ts.map(esc).join(' · ')}</p>`
  );

  const links = p.links || {};
  const linkParts = [
    links.repo ? `<a href="${esc(links.repo)}" class="proj-link" rel="noopener">repo ↗</a>` : '',
    links.demo ? `<a href="${esc(links.demo)}" class="proj-link" rel="noopener">demo ↗</a>` : '',
  ].filter(Boolean);
  const linksHtml = linkParts.length
    ? `<p class="proj-links">${linkParts.join(' ')}</p>`
    : '';

  return `<article class="${cardClass}"${ariaLabel}>
  <div class="proj-header">
    <span class="proj-name">${esc(p.name)}</span>
    <span class="${chipClass}">${chipLabel}</span>
  </div>
  ${taglineHtml}${descriptionHtml}${techHtml}${linksHtml}</article>`;
}

function buildIndex() {
  const builtProjects   = projects.filter(p => p.status === 'built');
  const plannedProjects = projects.filter(p => p.status === 'planned');

  const workHtml = work.map(buildWorkEntry).filter(Boolean).join('\n\n');

  const projectsHtml = [
    builtProjects.length
      ? `<h3 class="proj-group-label">Shipped</h3>\n<div class="proj-grid">\n${builtProjects.map(p => buildProjectCard(p, false)).join('\n')}\n</div>`
      : '',
    plannedProjects.length
      ? `<h3 class="proj-group-label">On the roadmap</h3>\n<div class="proj-grid">\n${plannedProjects.map(p => buildProjectCard(p, true)).join('\n')}\n</div>`
      : '',
  ].filter(Boolean).join('\n');

  // Omit the whole Projects section (and its nav link) when there are no projects.
  const projectsSection = projectsHtml
    ? `<section id="projects" aria-labelledby="projects-heading">
    <h2 id="projects-heading">Projects</h2>
    ${projectsHtml}
  </section>`
    : '';

  const langsRow = ifArr(languages, ls => {
    const langStr = ls.map(l => `${esc(l.language)}${l.fluency ? ` (${esc(l.fluency)})` : ''}`).join(', ');
    return `<div class="row"><dt>Languages:</dt><dd>${langStr}</dd></div>`;
  });

  const interestsRow = ifArr(interests, xs =>
    `<div class="row"><dt>Interests:</dt><dd>${xs.map(esc).join(', ')}</dd></div>`
  );

  const skillsHtml = skills
    .filter(s => s.group && Array.isArray(s.items) && s.items.length > 0)
    .map(s =>
      `<div class="row"><dt>${esc(s.group)}:</dt><dd>${s.items.map(esc).join(', ')}</dd></div>`
    ).join('\n')
    + (langsRow ? '\n' + langsRow : '')
    + (interestsRow ? '\n' + interestsRow : '');

  const educationHtml = education.map(e => {
    const noteHtml = e.note ? `<p class="edu-note">${esc(e.note)}</p>` : '';
    return `<div class="edu-entry">
  <div class="edu-line">
    <span><strong>${esc(e.institution)}</strong>${e.area ? ` — ${esc(e.area)}` : ''}</span>
    <span class="when">${esc(e.period)}</span>
  </div>
  ${noteHtml}</div>`;
  }).join('\n');

  const footerLinks = [
    email             ? `<span><a href="mailto:${esc(email)}">${esc(email)}</a></span>` : '',
    profiles.linkedin ? `<span><a href="${esc(profiles.linkedin)}" rel="noopener">LinkedIn</a></span>` : '',
    profiles.github   ? `<span><a href="${esc(profiles.github)}" rel="noopener">GitHub</a></span>` : '',
    profiles.site     ? `<span><a href="${esc(profiles.site)}" rel="noopener">${esc(profiles.site)}</a></span>` : '',
  ].filter(Boolean).join('\n    ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(fullName)} — QA Automation Engineer</title>
<meta name="description" content="${esc(metaDescription || pitch || headline)}" />
<style>
/* ── Tokens ── */
:root {
  --bg:              #fefefc;
  --ink:             #1a1a1a;
  --muted:           #6b6b6b;
  --subtle:          #767370;
  --rule:            #e5e3dc;
  --accent:          #2a5db0;
  --accent-hover:    #1a3d80;
  --surface:         #f5f4f0;
  --stack-bg:        #eeecea;
  --chip-bg:         #f0eee8;
  --chip-ink:        #555;
  --chip-built-bg:   #e6f4eb;
  --chip-built-ink:  #1a5c2a;
  --chip-plan-bg:    #fdf3e3;
  --chip-plan-ink:   #7a4f1a;
  --planned-bg:      #faf8f5;
  --planned-border:  #d8d4cc;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg:              #15140f;
    --ink:             #ecebe6;
    --muted:           #9a978d;
    --subtle:          #6a6760;
    --rule:            #2a2823;
    --accent:          #8fb4ff;
    --accent-hover:    #b8ceff;
    --surface:         #1f1e18;
    --stack-bg:        #252319;
    --chip-bg:         #1e1d18;
    --chip-ink:        #a0998f;
    --chip-built-bg:   #0e2918;
    --chip-built-ink:  #5ecf8a;
    --chip-plan-bg:    #291a07;
    --chip-plan-ink:   #e0a055;
    --planned-bg:      #1a1912;
    --planned-border:  #2e2c24;
  }
}

/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif;
  font-size: 18px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
::selection { background: #fff3a0; color: #1a1a1a; }
@media (prefers-color-scheme: dark) {
  ::selection { background: #3d3500; color: #ecebe6; }
}

/* ── Layout ── */
body > header, main, body > footer {
  max-width: 680px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1.75rem;
  padding-right: 1.75rem;
}
body > header { padding-top: 4.5rem; }
main { padding-top: 0; padding-bottom: 2rem; }
body > footer { padding-bottom: 5rem; }

/* ── Links ── */
a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 120ms ease, color 120ms ease;
}
a:hover { color: var(--accent-hover); border-bottom-color: currentColor; }
a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 1px;
}

/* ── Header / intro ── */
h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0 0 0.2rem;
}
h1 a { color: inherit; text-decoration: none; border-bottom: none; }

.headline {
  color: var(--muted);
  font-size: 0.95rem;
  margin: 0 0 1rem;
}

.status-badge {
  display: inline-block;
  font-size: 0.78rem;
  color: var(--muted);
  border: 1px solid var(--rule);
  border-radius: 3px;
  padding: 0.1em 0.55em;
  margin-bottom: 1.1rem;
  white-space: nowrap;
}

nav.top-nav {
  margin-bottom: 1.5rem;
  font-size: 0.92rem;
  color: var(--muted);
}
nav.top-nav a {
  margin-right: 0.85rem;
  color: var(--muted);
}
nav.top-nav a:hover { color: var(--ink); }

.pitch {
  font-size: 1.05rem;
  font-weight: 500;
  margin: 0 0 0.75rem;
  line-height: 1.5;
}
.summary { font-size: 0.97rem; line-height: 1.65; color: var(--muted); margin: 0; }

/* ── Section headings ── */
section { margin-top: 3.5rem; }
h2 {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.005em;
  margin: 0 0 1.1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--rule);
}

/* ── Work entries ── */
.entry { margin-bottom: 2.25rem; }
.entry:last-child { margin-bottom: 0; }

.role-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}
.role-title { font-size: 1rem; }
.role-title strong { font-weight: 700; }

.chip {
  display: inline-block;
  font-size: 0.72rem;
  background: var(--chip-bg);
  color: var(--chip-ink);
  padding: 0.1em 0.45em;
  border-radius: 3px;
  vertical-align: middle;
  margin-left: 0.3em;
  border: 1px solid var(--rule);
}

.when {
  color: var(--muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  flex-shrink: 0;
}

.domain {
  font-size: 0.9rem;
  color: var(--muted);
  font-style: italic;
  margin: 0 0 0.55rem;
}

ul.bullets {
  list-style: none;
  padding: 0;
  margin: 0 0 0.55rem;
}
ul.bullets li {
  position: relative;
  padding-left: 1.1em;
  margin-bottom: 0.4rem;
  font-size: 0.95rem;
  line-height: 1.55;
}
ul.bullets li::before {
  content: "—";
  position: absolute;
  left: 0;
  color: var(--subtle);
}

ul.metrics {
  list-style: none;
  padding: 0;
  margin: 0 0 0.4rem;
}
ul.metrics li.metric {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  font-size: 0.95rem;
  margin-bottom: 0.2rem;
}

.stack {
  color: var(--subtle);
  font-size: 0.78rem;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  margin: 0.35rem 0 0;
}

/* ── Projects ── */
h3.proj-group-label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--subtle);
  margin: 0 0 0.75rem;
}
.proj-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.9rem;
  margin-bottom: 1.75rem;
}
.proj-card {
  padding: 0.9rem 1rem;
  border: 1px solid var(--rule);
  border-radius: 4px;
  background: var(--surface);
}
.proj-card.planned {
  background: var(--planned-bg);
  border-color: var(--planned-border);
  border-style: dashed;
}
.proj-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
}
.proj-name { font-weight: 700; font-size: 0.97rem; }
.status-chip {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: lowercase;
  border-radius: 3px;
  padding: 0.15em 0.5em;
  flex-shrink: 0;
}
.status-chip.built {
  background: var(--chip-built-bg);
  color: var(--chip-built-ink);
}
.status-chip.planned {
  background: var(--chip-plan-bg);
  color: var(--chip-plan-ink);
}
.proj-tagline {
  font-size: 0.88rem;
  color: var(--muted);
  font-style: italic;
  margin: 0 0 0.3rem;
}
.proj-desc {
  font-size: 0.88rem;
  line-height: 1.55;
  margin: 0 0 0.35rem;
}
.proj-tech {
  font-size: 0.75rem;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  color: var(--subtle);
  margin: 0 0 0.3rem;
}
.proj-links { font-size: 0.85rem; margin: 0; }
.proj-link { margin-right: 0.65rem; }
.proj-link:last-child { margin-right: 0; }

/* ── Toolbox / Skills ── */
dl.toolbox { margin: 0; }
.toolbox .row {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.45rem;
  font-size: 0.93rem;
  flex-wrap: wrap;
}
.toolbox dt {
  font-weight: 700;
  white-space: nowrap;
  display: inline;
  margin: 0;
}
.toolbox dd {
  color: var(--muted);
  margin: 0;
  display: inline;
}

/* ── Education ── */
.edu-entry { margin-bottom: 1rem; }
.edu-entry:last-child { margin-bottom: 0; }
.edu-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}
.edu-note {
  font-size: 0.85rem;
  color: var(--muted);
  font-style: italic;
  margin: 0.1rem 0 0;
}

/* ── Footer ── */
body > footer {
  margin-top: 3.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--rule);
  font-size: 0.9rem;
  color: var(--muted);
}
.footer-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.75rem;
  margin-bottom: 0.75rem;
}
.footer-row a { color: var(--muted); }
.footer-row a:hover { color: var(--ink); }
.cv-callout { font-size: 0.88rem; margin: 0; }

/* ── Skip link ── */
.skip-link {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  border-radius: 0 0 4px 0;
  transform: translateY(-100%);
  transition: transform 120ms ease;
  z-index: 9999;
  border-bottom: none;
}
.skip-link:focus { transform: translateY(0); }

/* ── Responsive ── */
@media (max-width: 480px) {
  body > header, main, body > footer {
    padding-left: 1.2rem;
    padding-right: 1.2rem;
  }
  body > header { padding-top: 2.5rem; }
  h1 { font-size: 1.4rem; }
  .status-badge { white-space: normal; }
}
</style>
</head>
<body>

<a href="#main-content" class="skip-link">Skip to content</a>

<header role="banner">
  <h1><a href="/">${esc(fullName)}</a></h1>
  <p class="headline">${esc(headline)}</p>
  ${status ? `<span class="status-badge">${esc(status)}</span>` : ''}

  <nav class="top-nav" aria-label="Page sections">
    <a href="#work">work</a>
    ${projectsHtml ? '<a href="#projects">projects</a>' : ''}
    <a href="#toolbox">toolbox</a>
    <a href="#education">education</a>
    <a href="cv.html">cv</a>
    <a href="cv.pdf">cv.pdf</a>
  </nav>

  ${pitch   ? `<p class="pitch">${esc(pitch)}</p>` : ''}
  ${summary ? `<p class="summary">${esc(summary)}</p>` : ''}
</header>

<main id="main-content">

  <section id="work" aria-labelledby="work-heading">
    <h2 id="work-heading">Work</h2>
    ${workHtml}
  </section>

  ${projectsSection}

  <section id="toolbox" aria-labelledby="toolbox-heading">
    <h2 id="toolbox-heading">Toolbox</h2>
    <dl class="toolbox">
      ${skillsHtml}
    </dl>
  </section>

  <section id="education" aria-labelledby="education-heading">
    <h2 id="education-heading">Education</h2>
    ${educationHtml}
  </section>

</main>

<footer role="contentinfo">
  <div class="footer-row">
    ${footerLinks}
  </div>
  <p class="cv-callout">Full CV: <a href="cv.html">cv.html</a> &middot; <a href="cv.pdf">cv.pdf</a></p>
</footer>

</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — dist/cv.html (Harvard/Stanford ATS-parseable, one-page print)
// ═══════════════════════════════════════════════════════════════════════════════

function buildCVEntry(job) {
  if (!job.company) return '';
  const engLabel = job.engagement ? ` (${esc(job.engagement)})` : '';

  // Domain/context italic line intentionally omitted from CV for one-page fit;
  // it remains available in cv.json for the index.html portfolio view.

  const hlItems  = Array.isArray(job.highlights) ? job.highlights.filter(Boolean) : [];
  const mtItems  = Array.isArray(job.metrics)    ? job.metrics.filter(Boolean)    : [];
  const allBullets = [...hlItems, ...mtItems];
  const bulletsHtml = allBullets.length
    ? `<ul class="cv-bullets">${allBullets.map(b => `<li>${esc(b)}</li>`).join('\n')}</ul>`
    : '';

  return `<div class="cv-entry">
  <div class="cv-entry-head">
    <span class="cv-company"><strong>${esc(job.company)}</strong></span>
    <span class="cv-when">${period(job.period)}</span>
  </div>
  <div class="cv-role">${esc(job.role)}${engLabel}</div>
  ${bulletsHtml}</div>`;
}

function buildCV() {
  const expHtml = work.map(buildCVEntry).filter(Boolean).join('\n');

  const cvLangsRow = ifArr(languages, ls => {
    const langStr = ls.map(l => `${esc(l.language)}${l.fluency ? ` (${esc(l.fluency)})` : ''}`).join(', ');
    return `<tr><td class="sk-label">Languages</td><td>${langStr}</td></tr>`;
  });

  const cvInterestsRow = ifArr(interests, xs =>
    `<tr><td class="sk-label">Interests</td><td>${xs.map(esc).join(', ')}</td></tr>`
  );

  const skillsHtml = skills
    .filter(s => s.group && Array.isArray(s.items) && s.items.length > 0)
    .map(s =>
      `<tr><td class="sk-label">${esc(s.group)}</td><td>${s.items.map(esc).join(', ')}</td></tr>`
    ).join('\n')
    + (cvLangsRow ? '\n' + cvLangsRow : '')
    + (cvInterestsRow ? '\n' + cvInterestsRow : '');

  const eduHtml = education.map(e => {
    const noteHtml = e.note ? `<p class="cv-edu-note">${esc(e.note)}</p>` : '';
    return `<div class="cv-entry">
  <div class="cv-entry-head">
    <span class="cv-company"><strong>${esc(e.institution)}</strong></span>
    <span class="cv-when">${esc(e.period)}</span>
  </div>
  <div class="cv-role">${esc(e.area)}</div>
  ${noteHtml}</div>`;
  }).join('\n');

  const contactParts = [
    location          ? `<span>${esc(location)}</span>` : '',
    email             ? `<span><a href="mailto:${esc(email)}">${esc(email)}</a></span>` : '',
    profiles.linkedin ? `<span><a href="${esc(profiles.linkedin)}" rel="noopener">${esc(profiles.linkedin.replace('https://', ''))}</a></span>` : '',
    profiles.github   ? `<span><a href="${esc(profiles.github)}"   rel="noopener">${esc(profiles.github.replace('https://', ''))}</a></span>` : '',
    profiles.site     ? `<span><a href="${esc(profiles.site)}"     rel="noopener">${esc(profiles.site.replace('https://', ''))}</a></span>` : '',
  ].filter(Boolean).join('\n    ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(name)}${goesBy && goesBy !== name ? ` (${esc(goesBy)})` : ''} — CV</title>
<style>
/* ── Screen base ── */
*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  background: #fff;
  color: #111;
  font-family: Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif;
  font-size: 11pt;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}

a {
  color: #1a3d80;
  text-decoration: none;
}
a:hover { text-decoration: underline; }
a:focus-visible {
  outline: 2px solid #2a5db0;
  outline-offset: 2px;
  border-radius: 2px;
}

/* ── Screen layout ── */
.cv-wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 2.5rem 2.5rem 3rem;
}

/* ── Print button (screen only) ── */
.print-bar {
  text-align: right;
  margin-bottom: 1.25rem;
}
.print-btn {
  font-family: inherit;
  font-size: 0.82rem;
  background: #f5f4f0;
  color: #333;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0.35em 0.9em;
  cursor: pointer;
  transition: background 100ms;
}
.print-btn:hover { background: #eae8e2; }

/* ── CV Header ── */
.cv-name {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0 0 0.2rem;
}
.cv-contact {
  font-size: 0.86rem;
  color: #555;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.1rem;
  margin: 0 0 1.1rem;
}
.cv-contact a { color: #1a3d80; }

/* ── Section headings ── */
h2.cv-section {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #666;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.2rem;
  margin: 0.55rem 0 0.4rem;
}

/* ── Summary ── */
.cv-summary {
  font-size: 0.95rem;
  line-height: 1.42;
  margin: 0 0 0.35rem;
}

/* ── Experience entries ── */
.cv-entry { margin-bottom: 0.38rem; page-break-inside: avoid; }
.cv-entry:last-child { margin-bottom: 0; }

.cv-entry-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.cv-company { font-size: 0.97rem; }
.cv-company strong { font-weight: 700; }

.cv-when {
  font-size: 0.82rem;
  color: #555;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cv-role {
  font-size: 0.9rem;
  color: #444;
  margin-bottom: 0.2rem;
}

.cv-domain {
  font-size: 0.85rem;
  color: #555;
  font-style: italic;
  margin: 0 0 0.25rem;
}

/* ── Bullets ── */
ul.cv-bullets {
  list-style: disc;
  padding-left: 1.3em;
  margin: 0.2rem 0 0;
}
ul.cv-bullets li {
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 0.15rem;
}

/* ── Skills table ── */
.sk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.sk-table tr { vertical-align: top; }
.sk-label {
  font-weight: 700;
  white-space: nowrap;
  padding-right: 0.75rem;
  padding-bottom: 0.12rem;
  width: 11.5rem;
}

/* ── Education ── */
.cv-edu-note {
  font-size: 0.83rem;
  color: #555;
  font-style: italic;
  margin: 0.1rem 0 0;
}

/* ── Print ── */
@page {
  size: A4;
  margin: 1.4cm 1.6cm 1.3cm 1.6cm;
}

@media print {
  html, body {
    font-size: 10pt;
    background: #fff;
    color: #000;
  }
  .cv-wrap {
    max-width: 100%;
    padding: 0;
    margin: 0;
  }
  .print-bar { display: none; }
  a { color: #000; text-decoration: none; }
  .cv-contact a { text-decoration: underline; }
  h2.cv-section { color: #444; border-color: #999; }
  .cv-role, .cv-when, .cv-edu-note { color: #444; }
  .cv-entry { page-break-inside: avoid; }
}

/* ── Dark mode (screen only) ── */
@media (prefers-color-scheme: dark) {
  html, body { background: #15140f; color: #ecebe6; }
  a { color: #8fb4ff; }
  h2.cv-section { border-color: #3a3730; color: #9a978d; }
  .cv-contact { color: #9a978d; }
  .cv-contact a { color: #8fb4ff; }
  .cv-when, .cv-role, .cv-domain { color: #9a978d; }
  .cv-edu-note { color: #7a7870; }
  .print-btn { background: #1e1d18; border-color: #3a3730; color: #ecebe6; }
  .print-btn:hover { background: #2a2823; }
}
</style>
</head>
<body>
<div class="cv-wrap">

  <div class="print-bar" aria-hidden="true">
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <header>
    <h1 class="cv-name">${esc(name)}${goesBy && goesBy !== name ? ` (${esc(goesBy)})` : ''}</h1>
    <div class="cv-contact">
      ${contactParts}
    </div>
  </header>

  <h2 class="cv-section">Summary</h2>
  ${summary ? `<p class="cv-summary">${esc(summary)}</p>` : ''}

  <h2 class="cv-section">Experience</h2>
  ${expHtml}

  <h2 class="cv-section">Skills</h2>
  <table class="sk-table" role="presentation">
    ${skillsHtml}
  </table>

  <h2 class="cv-section">Education</h2>
  ${eduHtml}

</div>
</body>
</html>`;
}

// ── Write outputs ──────────────────────────────────────────────────────────────

writeFileSync(join(outDir, 'index.html'), buildIndex(), 'utf8');
writeFileSync(join(outDir, 'cv.html'),    buildCV(),    'utf8');
writeFileSync(join(outDir, 'CNAME'),      'tnguyen.cz\n', 'utf8'); // GitHub Pages custom domain

console.log('Built:');
console.log('  ' + join(outDir, 'index.html'));
console.log('  ' + join(outDir, 'cv.html'));
console.log('  ' + join(outDir, 'CNAME'));
