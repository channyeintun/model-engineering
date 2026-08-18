#!/usr/bin/env node
/* =========================================================================
   check.mjs — catches the mistakes that make a lesson look broken:
   a scene with no builder, a builder pointing at an id that does not exist,
   a missing script tag, a self-check with no correct answer, a stray "<"
   inside a code block, or an SVG element drawn outside its own viewBox.

     node tools/check.mjs            check everything
     node tools/check.mjs 07         check one lesson
   ========================================================================= */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv[2];

let errors = 0, warnings = 0;
const err = (f, m) => { errors++; console.log(`  \x1b[31m✗\x1b[0m ${f}: ${m}`); };
const warn = (f, m) => { warnings++; console.log(`  \x1b[33m!\x1b[0m ${f}: ${m}`); };
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);

const all = (re, s) => [...s.matchAll(re)].map((m) => m[1]);

/* ------------------------------------------------------------ lessons */

const lessonsJs = readFileSync(join(ROOT, 'data/lessons.js'), 'utf8');
const declared = all(/id:\s*'(\d\d)'/g, lessonsJs);
const glossary = readFileSync(join(ROOT, 'data/glossary.js'), 'utf8');
const glossaryKeys = new Set(all(/^\s*'([^']+)':\s*\{/gm, glossary));

const ids = (only ? [only] : declared).filter(Boolean);

console.log(`\nChecking ${ids.length} lesson(s)\n`);

for (const id of ids) {
  const htmlPath = join(ROOT, `lessons/${id}.html`);
  const jsPath = join(ROOT, `assets/js/scenes/${id}.js`);
  console.log(`\x1b[1mLesson ${id}\x1b[0m`);

  if (!existsSync(htmlPath)) { err(id, `missing ${htmlPath}`); continue; }
  if (!existsSync(jsPath)) { err(id, `missing ${jsPath}`); continue; }

  const html = readFileSync(htmlPath, 'utf8');
  const js = readFileSync(jsPath, 'utf8');

  /* --- required plumbing --- */
  if (!html.includes(`data-lesson="${id}"`)) err(id, `<body> is missing data-lesson="${id}"`);
  for (const need of [
    'assets/js/vendor/gsap.min.js', 'assets/js/scene.js', 'assets/js/svgkit.js',
    'data/lessons.js', 'data/glossary.js', 'assets/js/course.js',
    `assets/js/scenes/${id}.js`, 'assets/css/course.css'
  ]) {
    if (!html.includes(need)) err(id, `missing script/link for ${need}`);
  }
  if (!/<nav class="rail"/.test(html)) err(id, 'missing <nav class="rail">');
  if (!/<aside class="toc-rail">/.test(html)) warn(id, 'missing <aside class="toc-rail">');
  if (js.includes('MotionPathPlugin') && !html.includes('MotionPathPlugin.min.js')) {
    err(id, 'scenes use MotionPathPlugin but the plugin script tag is missing');
  }

  /* --- scenes: html ids vs registered builders --- */
  const inHtml = all(/data-scene="([^"]+)"/g, html);
  const inJs = all(/Scene\.register\(\s*'([^']+)'/g, js);
  for (const s of inHtml) if (!inJs.includes(s)) err(id, `data-scene="${s}" has no Scene.register`);
  for (const s of inJs) if (!inHtml.includes(s)) err(id, `Scene.register('${s}') has no figure in the HTML`);
  if (inHtml.length < 4) warn(id, `only ${inHtml.length} scenes (aim for 4-6)`);

  /* --- every q('#x') must exist in the HTML --- */
  const wanted = new Set([...all(/q\(\s*'#([\w-]+)'/g, js), ...all(/qa\(\s*'#([\w-]+)'/g, js)]);
  const present = new Set(all(/\sid="([\w-]+)"/g, html));
  for (const w of wanted) if (!present.has(w)) err(id, `scene code looks up #${w}, which is not in the HTML`);

  /* --- steps per scene --- */
  const steps = (js.match(/tl\.step\(/g) || []).length;
  if (inJs.length && steps / inJs.length < 3.5) {
    warn(id, `${steps} steps across ${inJs.length} scenes — aim for 4-7 each`);
  }

  /* --- self-checks --- */
  const checks = html.split('<div class="check">').slice(1);
  if (checks.length < 3) warn(id, `${checks.length} self-check questions (want 3)`);
  checks.forEach((c, i) => {
    const right = (c.match(/data-right/g) || []).length;
    if (right !== 1) err(id, `self-check ${i + 1} has ${right} correct answers, needs exactly 1`);
    if (!/check__why/.test(c)) warn(id, `self-check ${i + 1} has no explanation`);
  });

  /* --- code blocks: unescaped "<" --- */
  for (const [, body] of html.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)) {
    if (/<(?![/a-zA-Z!])/.test(body.replace(/&lt;/g, ''))) { /* bare "<" is fine */ }
    if (/<[a-zA-Z/]/.test(body)) err(id, 'a code block contains raw HTML tags — escape "<" as &lt;');
  }

  /* --- glossary terms must exist --- */
  for (const t of all(/data-term="([^"]+)"/g, html)) {
    if (!glossaryKeys.has(t)) err(id, `data-term="${t}" is not a key in data/glossary.js`);
  }

  /* --- structure --- */
  for (const [sel, label] of [
    ['lesson-head__num', 'lesson number header'],
    ['class="lead"', 'lead paragraph'],
    ['class="outcomes"', 'outcomes box'],
    ['class="project"', 'project card'],
    ['class="terms"', 'key words list'],
    ['class="resources"', 'resources list'],
  ]) if (!html.includes(sel)) warn(id, `no ${label}`);

  /* --- viewBox bounds: catch elements drawn off-canvas in hand-written SVG --- */
  const svgs = [...html.matchAll(/<svg[^>]*viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"([\s\S]*?)<\/svg>/g)];
  for (const [, W, H, body] of svgs) {
    const w = +W, h = +H;
    if (w !== 900) warn(id, `an svg viewBox width is ${w}; the course standard is 900`);
    if (h < 180 || h > 380) warn(id, `an svg viewBox height is ${h}; keep it between 220 and 340`);
    for (const [, xs] of body.matchAll(/\sx="(-?\d+(?:\.\d+)?)"/g)) {
      if (+xs < -20 || +xs > w) err(id, `an element has x=${xs}, outside the 0..${w} viewBox`);
    }
    for (const [, ys] of body.matchAll(/\sy="(-?\d+(?:\.\d+)?)"/g)) {
      if (+ys < -20 || +ys > h + 20) err(id, `an element has y=${ys}, outside the 0..${h} viewBox`);
    }
  }

  /* --- links --- */
  const links = all(/href="(https?:\/\/[^"]+)"/g, html);
  const bad = links.filter((l) => /example\.com|TODO|FIXME|localhost/.test(l));
  bad.forEach((l) => err(id, `placeholder link: ${l}`));

  /* --- prose length --- */
  const text = html
    .replace(/<pre>[\s\S]*?<\/pre>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 1600) warn(id, `only ~${words} words — thin`);
  if (words > 7000) warn(id, `~${words} words — long even for a worked-example lesson`);

  ok(`${inHtml.length} scenes, ${steps} steps, ${checks.length} checks, ~${words} words, ${links.length} links`);
}

/* ------------------------------------------------------ shared pages */

console.log('\n\x1b[1mShared pages\x1b[0m');
for (const p of ['index.html', 'glossary.html', 'toolkit.html', 'debugging.html', 'resources.html']) {
  existsSync(join(ROOT, p)) ? ok(p) : err('site', `missing ${p}`);
}
const sceneFiles = readdirSync(join(ROOT, 'assets/js/scenes'));
ok(`${sceneFiles.length} scene files present`);

console.log(`\n${errors} error(s), ${warnings} warning(s)\n`);
process.exit(errors ? 1 : 0);
