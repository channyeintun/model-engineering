#!/usr/bin/env node
/* =========================================================================
   check-narration.mjs — validate a lesson's walkthrough script.

   Catches the mistakes that only show up when you press play: a scene id
   that does not exist, a step number past the end of that scene, a symbol
   left in text that goes to the speech model, or a script so long nobody
   will watch it.

     node tools/check-narration.mjs        all lessons
     node tools/check-narration.mjs 07     one lesson
   ========================================================================= */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv[2];

let errors = 0, warnings = 0;
const err = (id, m) => { errors++; console.log(`  \x1b[31m✗\x1b[0m ${id}: ${m}`); };
const warn = (id, m) => { warnings++; console.log(`  \x1b[33m!\x1b[0m ${id}: ${m}`); };
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);

const WPM = 155;

/* Characters a speech model should never be handed. */
const BAD_CHARS = /[<>{}\[\]|\\^~`_#*=+@∂∇→←↔×÷≈≤≥∑∏√°µ·•…]/;

const narrDir = join(ROOT, 'data', 'narration');
const ids = only
  ? [only]
  : readdirSync(narrDir).filter(f => /^\d\d\.js$/.test(f)).map(f => f.slice(0, 2)).sort();

console.log(`\nChecking ${ids.length} walkthrough script(s)\n`);

for (const id of ids) {
  const nPath = join(narrDir, `${id}.js`);
  const sPath = join(ROOT, 'assets', 'js', 'scenes', `${id}.js`);
  console.log(`\x1b[1mLesson ${id}\x1b[0m`);

  if (!existsSync(nPath)) { err(id, `no narration script at data/narration/${id}.js`); continue; }
  const src = readFileSync(nPath, 'utf8');

  /* --- what scenes and steps actually exist ---
     A `tl.step(` written inside a forEach/for/map runs many times, so the
     literal count is only a lower bound for those scenes. Where that is the
     case we cannot prove a step number is too high; tools/audit.js reports
     the real count in the browser. */
  const steps = {}, exact = {};
  if (existsSync(sPath)) {
    const js = readFileSync(sPath, 'utf8');
    const parts = js.split(/Scene\.register\(\s*'([^']+)'/);
    for (let i = 1; i < parts.length; i += 2) {
      const body = parts[i + 1];
      steps[parts[i]] = (body.match(/tl\.step\(/g) || []).length;
      exact[parts[i]] = !/\b(forEach|for\s*\(|\.map\()[\s\S]{0,600}?tl\.step\(/.test(body);
    }
  } else {
    err(id, `no scenes file at assets/js/scenes/${id}.js`);
  }

  /* --- parse the segments --- */
  const body = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [...body.matchAll(/\{\s*id:\s*'([^']+)'([\s\S]*?)\}\s*(?=,\s*\{|\s*\]\s*)/g)];
  if (!blocks.length) { err(id, 'no segments found — is the file complete?'); continue; }

  const seen = new Set();
  let words = 0, withScene = 0;
  const usedScenes = new Set();

  for (const [, sid, raw] of blocks) {
    if (seen.has(sid)) err(id, `duplicate segment id "${sid}"`);
    seen.add(sid);

    const field = (n) => {
      const m = raw.match(new RegExp(`\\b${n}:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 's'));
      return m ? m[1].replace(/\\'/g, "'") : null;
    };
    const text = field('text');
    const say = field('say');
    if (!text) { err(id, `segment ${sid} has no text`); continue; }

    const spoken = (say ?? text).replace(/<[^>]+>/g, '').trim();
    words += spoken.split(/\s+/).length;

    if (BAD_CHARS.test(spoken)) {
      const found = [...new Set(spoken.match(new RegExp(BAD_CHARS, 'g')) || [])].join(' ');
      err(id, `segment ${sid} sends "${found}" to the voice — add a "say" field that spells it out`);
    }
    if (say === null && /<[^>]+>/.test(text) === false && BAD_CHARS.test(text)) {
      warn(id, `segment ${sid} may read badly aloud`);
    }
    const wc = spoken.split(/\s+/).length;
    if (wc > 60) warn(id, `segment ${sid} is ${wc} words — split it, a caption should be one beat`);
    if (wc < 6) warn(id, `segment ${sid} is only ${wc} words`);

    /* scene + step must be real */
    const sc = raw.match(/\bscene:\s*'([^']+)'/);
    const st = raw.match(/\bstep:\s*(\d+)/);
    if (sc) {
      withScene++;
      usedScenes.add(sc[1]);
      if (!(sc[1] in steps)) {
        err(id, `segment ${sid} points at scene "${sc[1]}", which is not registered`);
      } else if (st) {
        const n = +st[1], have = steps[sc[1]];
        if (n >= have) {
          if (exact[sc[1]]) {
            err(id, `segment ${sid}: scene "${sc[1]}" has ${have} steps (0-${have - 1}), got step ${n}`);
          } else if (n >= have + 12) {
            warn(id, `segment ${sid}: step ${n} looks high for "${sc[1]}" — it builds steps in a loop, so confirm with tools/audit.js`);
          }
        }
      }
    } else if (st) {
      err(id, `segment ${sid} has a step but no scene`);
    }
  }

  /* --- coverage and length --- */
  for (const s of Object.keys(steps)) {
    if (!usedScenes.has(s)) warn(id, `scene "${s}" never appears in the walkthrough`);
  }
  const secs = Math.round((words / WPM) * 60);
  if (blocks.length < 18) warn(id, `${blocks.length} segments — thin, aim for 20 to 34`);
  if (blocks.length > 40) warn(id, `${blocks.length} segments — long, aim for 20 to 34`);
  if (secs > 540) warn(id, `about ${Math.round(secs / 60)} minutes — long for a walkthrough`);

  const timed = existsSync(join(narrDir, `${id}.timing.js`));
  const audio = existsSync(join(ROOT, 'assets', 'audio', `${id}.m4a`));
  ok(`${blocks.length} segments, ${withScene} on figures, ~${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} spoken` +
     `, ${usedScenes.size}/${Object.keys(steps).length} scenes used` +
     `, audio ${audio && timed ? 'generated' : 'NOT generated'}`);
}

console.log(`\n${errors} error(s), ${warnings} warning(s)\n`);
process.exit(errors ? 1 : 0);
