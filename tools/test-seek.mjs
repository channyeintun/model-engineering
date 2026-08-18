/* =========================================================================
   Tests for assets/js/seek.js, driven by a fake <audio> element.

       node tools/test-seek.mjs

   Every case here is a bug that shipped. A browser will not reproduce them
   on demand — you cannot ask it for an element with no metadata yet, or a
   download that has only reached 40 seconds — so they are staged by hand.
   ========================================================================= */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
new Function(readFileSync(join(ROOT, 'assets/js/seek.js'), 'utf8')).call(globalThis);
const Seek = globalThis.Seek;

/* ---- a fake audio element ------------------------------------------- */

class FakeAudio {
  constructor({ readyState = 4, currentTime = 0, buffered = Infinity, paused = false } = {}) {
    this.readyState = readyState;
    this._t = currentTime;
    this._buffered = buffered;         // how far the download has reached
    this.paused = paused;
    this.listeners = {};
    this.playCalls = 0;
    this.pauseCalls = 0;
  }
  get seekable() {
    if (this.readyState < 1) return { length: 0 };
    const end = this._buffered;
    return { length: 1, start: () => 0, end: () => end };
  }
  get currentTime() { return this._t; }
  set currentTime(v) {
    if (v === this._t) return;         // a real element fires nothing for a no-op
    this._t = v;
    queueMicrotask(() => this.fire('seeked'));
  }
  play() { this.paused = false; this.playCalls++; return Promise.resolve(); }
  pause() { this.paused = true; this.pauseCalls++; }
  addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); }
  removeEventListener(k, fn) {
    this.listeners[k] = (this.listeners[k] || []).filter((f) => f !== fn);
  }
  fire(k) { (this.listeners[k] || []).slice().forEach((fn) => fn()); }

  /* the download advancing */
  downloadTo(sec) { this._buffered = sec; this.fire('progress'); }
  /* metadata arriving on a cold element */
  metadataArrives() { this.readyState = 1; this.fire('loadedmetadata'); }
}

const settle = () => new Promise((r) => setTimeout(r, 0));

/* ---- harness --------------------------------------------------------- */

let pass = 0, fail = 0;
const eq = (got, want, what) => {
  if (Object.is(got, want)) { pass++; return; }
  fail++;
  console.log(`  \x1b[31m✗\x1b[0m ${what}\n      got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
};
const test = async (name, fn) => {
  const before = fail;
  await fn();
  if (fail === before) console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  else console.log(`  \x1b[31m✗\x1b[0m ${name}`);
};

const mk = (audio, playing = true) => {
  let waiting = null;
  const s = Seek.create({
    audio: () => audio,
    isPlaying: () => playing,
    onWait: (w) => { waiting = w; }
  });
  return { s, waiting: () => waiting };
};

console.log('\nseek.js');

/* The lesson-06 bug. A cold element has no metadata, so the "already there"
   shortcut is skipped; by the time metadata lands the track sits at 0, which
   is where the seek was going. Assigning 0 to 0 fires nothing. If that is not
   settled, target() stays 0 forever and the clock freezes behind the audio. */
await test('a cold open that seeks to 0 settles when metadata arrives', async () => {
  const a = new FakeAudio({ readyState: 0, currentTime: 0 });
  const { s } = mk(a);
  s.seek(0);
  eq(s.target(), 0, 'target held while metadata is missing');
  a.metadataArrives();
  await settle();
  eq(s.target(), null, 'settled once metadata arrived');
});

await test('a seek to where it already is settles at once', async () => {
  const a = new FakeAudio({ readyState: 4, currentTime: 42 });
  const { s } = mk(a);
  s.seek(42.1);
  eq(s.target(), null, 'nothing left pending');
});

/* The snap-back bug. Pages ignores Range, so a forward seek past the download
   cannot land yet. The target must keep standing in for the clock until it
   does — a timeout that expires first drags the scrub bar back to the old
   position, which reads as the seek having been refused. */
await test('a seek past the download holds its target until the data arrives', async () => {
  const a = new FakeAudio({ readyState: 4, currentTime: 38, buffered: 60 });
  const { s, waiting } = mk(a);
  s.seek(300);
  eq(s.target(), 300, 'target held while waiting');
  eq(waiting(), true, 'caller told it is waiting');
  eq(a.pauseCalls, 1, 'stopped talking about the old position');

  a.downloadTo(120);
  eq(s.target(), 300, 'still held: the download has not reached it');

  a.downloadTo(400);
  await settle();
  eq(s.target(), null, 'settled once the download passed it');
  eq(a.currentTime, 300, 'element moved to the requested position');
  eq(a.playCalls, 1, 'resumed, because it was playing before');
  eq(waiting(), false, 'caller told it is done');
});

await test('a paused player is not started by a seek finishing', async () => {
  const a = new FakeAudio({ readyState: 4, currentTime: 38, buffered: 60, paused: true });
  const { s } = mk(a, false);
  s.seek(300);
  a.downloadTo(400);
  await settle();
  eq(a.playCalls, 0, 'stayed paused');
  eq(s.target(), null, 'settled');
});

await test('a backward seek into downloaded audio lands immediately', async () => {
  const a = new FakeAudio({ readyState: 4, currentTime: 300, buffered: 400 });
  const { s } = mk(a);
  s.seek(12);
  await settle();
  eq(a.currentTime, 12, 'moved');
  eq(s.target(), null, 'settled');
});

/* A stale target must never drag playback backwards. */
await test('a newer seek supersedes one still waiting', async () => {
  const a = new FakeAudio({ readyState: 4, currentTime: 10, buffered: 60 });
  const { s } = mk(a);
  s.seek(500);
  eq(s.target(), 500, 'first is pending');
  s.seek(30);
  await settle();
  eq(a.currentTime, 30, 'second one won');
  eq(s.target(), null, 'settled on the second');

  a.downloadTo(600);
  await settle();
  eq(a.currentTime, 30, 'the superseded target never applied');
});

await test('a seek that never lands gives up rather than pinning the clock', async () => {
  const a = new FakeAudio({ readyState: 4, currentTime: 10, buffered: 60 });
  let waiting = null;
  const s = Seek.create({
    audio: () => a, isPlaying: () => true,
    onWait: (w) => { waiting = w; },
    timeout: 20
  });
  s.seek(900);
  eq(s.target(), 900, 'pending while it tries');
  await new Promise((r) => setTimeout(r, 40));
  eq(s.target(), null, 'gave up');
  eq(waiting, false, 'waiting state cleared');
});

await test('a NaN is never handed to the element', async () => {
  const a = new FakeAudio({ readyState: 4, currentTime: 10 });
  const { s } = mk(a);
  s.seek(NaN);
  eq(s.target(), null, 'ignored');
  eq(a.currentTime, 10, 'element untouched');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
