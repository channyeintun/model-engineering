/* =========================================================================
   End-to-end tests for the narrated walkthrough, in a real Chrome.

       node tools/test-player.mjs          # all lessons
       node tools/test-player.mjs 04       # one

   These exist because reading the code was not enough three times running.
   The static server here is python's, which — like Cloudflare Pages — ignores
   Range and answers with the whole file. That is the condition under which
   seeking broke, so testing against anything friendlier tests a situation
   that never happens in production.
   ========================================================================= */

import { launch, serve } from './browser.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8793;
const only = process.argv[2];
const LESSONS = only ? [only]
  : ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'];

let pass = 0, fail = 0;
const check = (ok, what, detail) => {
  if (ok) { pass++; return; }
  fail++;
  console.log(`    \x1b[31m✗\x1b[0m ${what}${detail ? '\n        ' + detail : ''}`);
};

/* ~1.5 Mbit/s for the audio only: fast enough that the suite finishes,
   slow enough that "the track has not all arrived yet" is a real state
   during the test rather than something that happens between two frames. */
const srv = await serve(ROOT, PORT, { kbps: 600 });
const b = await launch({ port: 9337 });

console.log('\nnarrated walkthrough — real browser, host without Range support\n');

try {
  for (const id of LESSONS) {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/${id}.html`);
    const before = fail;

    const r = await b.eval(`(async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const a = () => Film.audio();
      const until = async (fn, tries = 600) => {
        for (let i = 0; i < tries; i++) { if (fn()) return true; await wait(100); }
        return false;
      };
      const out = {};
      const t0 = performance.now();

      Film.open();

      /* 1. sound starts without waiting for the whole track */
      out.startedEarly = await until(() => a() && a().currentTime > 0.4, 200);
      out.msToFirstSound = Math.round(performance.now() - t0);
      out.playing = a() ? !a().paused : false;
      out.clockAfterPlay = +Film.at().toFixed(2);

      /* From the narration timings, not audio.duration: Ogg carries no
         duration in its header, so over a host that ignores Range the element
         reports NaN until the whole file has arrived. The player never reads
         audio.duration, for that reason. */
      const segs = Film.segments;
      out.duration = +segs[segs.length - 1].end.toFixed(1);

      /* 2. the button toggles, while nothing else is in flight */
      const btn = document.querySelector('#filmPlay');
      btn.click(); await wait(400);
      out.pausedByButton = a().paused;
      btn.click();
      out.resumedByButton = await until(() => !a().paused, 40);

      /* 3. a forward seek asked for WHILE the download is still running.
            This is the case that shipped broken three times, and the one a
            reader hits first. */
      const target = +(out.duration * 0.55).toFixed(2);
      out.target = target;
      out.seekAskedAt = Math.round(performance.now() - t0);
      out.stillDownloading = a().src.slice(0, 5) === 'http:';
      Film.seek(target);
      out.clockRightAfterSeek = +Film.at().toFixed(2);
      out.segAfterSeek = document.querySelector('#filmIdx').textContent;
      out.stagedScene = (document.querySelector('.film__stage figure') || {}).dataset?.scene || null;

      /* 4. it must land there — however long the rest of the file takes */
      out.landed = await until(() => Math.abs(a().currentTime - target) < 2 && a().readyState >= 2);
      out.msToSeekLanded = Math.round(performance.now() - t0);
      out.audioAfterSeek = +a().currentTime.toFixed(2);
      out.src = a().src.slice(0, 5);
      out.seekableEnd = a().seekable.length ? +a().seekable.end(0).toFixed(1) : null;

      /* 5. and carry on from there rather than falling back */
      out.resumed = await until(() => !a().paused, 100);
      const mark = a().currentTime;
      await wait(2000);
      out.audioLater = +a().currentTime.toFixed(2);
      out.clockLater = +Film.at().toFixed(2);
      out.advanced = a().currentTime > mark + 0.5;

      /* 6. a backward seek */
      Film.seek(20);
      out.wentBack = await until(() => Math.abs(a().currentTime - 20) < 2, 100);
      out.audioAfterBack = +a().currentTime.toFixed(2);

      /* 7. captions are lit, from measured word times */
      out.captionWords = document.querySelectorAll('.film__cap .cap-w').length;
      out.captionLit = document.querySelectorAll('.film__cap .cap-w.is-said, .film__cap .cap-w.is-now').length;
      return out;
    })()`);

    check(r.startedEarly && r.msToFirstSound < 12000,
      `${id}: sound starts without waiting for the whole file`, `took ${r.msToFirstSound} ms`);
    check(r.playing === true, `${id}: it plays`);
    check(r.clockAfterPlay > 0.3, `${id}: the clock moves with it`, `clock ${r.clockAfterPlay}`);
    check(r.pausedByButton === true && r.resumedByButton === true,
      `${id}: the play button toggles`, `paused ${r.pausedByButton}, resumed ${r.resumedByButton}`);
    check(r.stillDownloading === true,
      `${id}: the seek is asked for mid-download`, 'the file had already arrived — test proves less than it should');
    check(Math.abs(r.clockRightAfterSeek - r.target) < 1.5,
      `${id}: the display jumps to the seek at once`, `clock ${r.clockRightAfterSeek}, asked ${r.target}`);
    check(r.stagedScene !== null, `${id}: a figure reaches the stage at once`);
    check(r.landed && Math.abs(r.audioAfterSeek - r.target) < 2,
      `${id}: the forward seek lands`, `asked ${r.target}, audio at ${r.audioAfterSeek}`);
    check(r.src === 'blob:', `${id}: swapped to the seekable copy`, `src scheme "${r.src}"`);
    check(r.seekableEnd !== null && r.seekableEnd > 1,
      `${id}: the track is seekable`, `seekable ended at ${r.seekableEnd}`);
    check(r.resumed && r.advanced,
      `${id}: it carries on from there`, `audio ${r.audioAfterSeek} then ${r.audioLater}`);
    check(r.audioLater > r.target - 1,
      `${id}: no snap back to the old position`, `audio at ${r.audioLater}, sought ${r.target}`);
    check(r.wentBack && Math.abs(r.audioAfterBack - 20) < 2,
      `${id}: a backward seek lands`, `audio at ${r.audioAfterBack}`);
    check(r.captionWords > 0 && r.captionLit > 0,
      `${id}: captions are lit`, `${r.captionLit} of ${r.captionWords} words`);

    /* The AAC path, which is what Safari gets: it has never played Ogg. It is
       also the path where the network source is worst — the element reports
       seekable [0, 0] and clamps a seek to zero — so it is worth proving the
       fallback seeks as well as the Opus one does. */
    if (id === LESSONS[0]) {
      /* a fresh page: the film above has already been built, and the source is
         chosen once when it is */
      await b.goto(`http://127.0.0.1:${PORT}/lessons/${id}.html`);
      const f = await b.eval(`(async () => {
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        const until = async (fn, tries = 600) => {
          for (let i = 0; i < tries; i++) { if (fn()) return true; await wait(100); }
          return false;
        };
        /* pretend to be a browser with no Opus decoder */
        const real = HTMLMediaElement.prototype.canPlayType;
        HTMLMediaElement.prototype.canPlayType = function (t) {
          return /opus|ogg/i.test(t) ? '' : real.call(this, t);
        };
        Film.open();
        const a = () => Film.audio();
        const out = {};
        out.ext = a().src.slice(-4);
        out.startedEarly = await until(() => a().currentTime > 0.4, 200);
        const segs = Film.segments;
        const target = +(segs[segs.length - 1].end * 0.4).toFixed(2);
        out.target = target;
        Film.seek(target);
        /* the reported position must never fall back to where it was */
        let low = Infinity;
        /* Bounded: a seek that has not landed in 25 seconds has not landed.
           Left unbounded this hangs rather than reports, which is how the
           bug announced itself the first time. */
        const landed = (async () => until(() => Math.abs(a().currentTime - target) < 2 && a().readyState >= 2, 250))();
        for (let i = 0; i < 250; i++) {
          low = Math.min(low, Film.at());
          if (Math.abs(a().currentTime - target) < 2 && a().readyState >= 2) break;
          await wait(100);
        }
        await landed;
        out.lowestReported = +low.toFixed(2);
        out.audioAfterSeek = +a().currentTime.toFixed(2);
        out.src = a().src.slice(0, 5);
        HTMLMediaElement.prototype.canPlayType = real;
        return out;
      })()`);
      check(f.ext === '.m4a', `${id}: without Opus it takes the AAC`, `src ended "${f.ext}"`);
      check(f.startedEarly, `${id}: AAC path starts promptly`);
      check(Math.abs(f.audioAfterSeek - f.target) < 2,
        `${id}: AAC path seeks`, `asked ${f.target}, audio at ${f.audioAfterSeek}`);
      check(f.lowestReported > f.target - 2,
        `${id}: AAC path never reports the old position again`,
        `dropped to ${f.lowestReported} after seeking to ${f.target}`);
    }

    if (fail === before) console.log(`  \x1b[32m✓\x1b[0m ${id}  sound in ${(r.msToFirstSound / 1000).toFixed(1)}s · sought ${r.target}s at ${(r.seekAskedAt / 1000).toFixed(1)}s, landed by ${(r.msToSeekLanded / 1000).toFixed(1)}s · ${r.segAfterSeek}`);
    else console.log(`  \x1b[31m✗\x1b[0m ${id}`);
  }
} finally {
  await b.close();
  srv.stop();
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
