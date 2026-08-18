/* =========================================================================
   A real browser, driven over the DevTools Protocol.

   The player's hard parts — playback, seeking, the frame loop — cannot be
   checked by reading the code or by a fake element, and the browser tooling
   available to an agent runs pages in a throttled tab where
   requestAnimationFrame never fires and media never loads. Three seeking
   bugs shipped behind that gap. So: launch the real Chrome, headless, with
   autoplay allowed, and talk to it directly. No dependencies — Node has had
   WebSocket built in since 22.

   Used by tools/test-player.mjs.
   ========================================================================= */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export async function launch({ port = 9333, headless = true } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'me-chrome-'));
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check',
    /* Without this the element refuses to play unmuted with no user gesture,
       and every timing assertion below would be measuring nothing. */
    '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--mute-audio',                 // decode and advance, just do not make noise
    'about:blank'
  ];
  if (headless) args.unshift('--headless=new');

  const proc = spawn(CHROME, args, { stdio: 'ignore' });

  const deadline = Date.now() + 20000;
  let targets = null;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      targets = await r.json();
      if (targets.length) break;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!targets || !targets.length) {
    proc.kill();
    throw new Error('Chrome did not expose a debugging target');
  }

  const page = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error('could not attach to the page'));
  });

  let id = 0;
  const waiting = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    waiting.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
    setTimeout(() => {
      if (waiting.has(n)) { waiting.delete(n); reject(new Error(method + ' timed out')); }
    }, 180000);
  });

  await send('Page.enable');
  await send('Runtime.enable');

  return {
    async goto(url) {
      await send('Page.navigate', { url });
      /* Wait for the document to be interactive and the deferred bottom-of-body
         scripts to have run, which is when Scene and Film exist. */
      const stop = Date.now() + 20000;
      while (Date.now() < stop) {
        const r = await this.eval('document.readyState === "complete" && !!window.Film');
        if (r === true) return;
        await new Promise((s) => setTimeout(s, 120));
      }
      throw new Error('page never finished loading: ' + url);
    },

    async eval(expression) {
      const r = await send('Runtime.evaluate', {
        expression: `(async () => { ${expression.trim().startsWith('return') ? '' : 'return '}${expression} })()`,
        awaitPromise: true, returnByValue: true
      });
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      }
      return r.result.value;
    },

    async close() {
      try { ws.close(); } catch { /* already gone */ }
      proc.kill();
      await new Promise((r) => setTimeout(r, 200));
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* leave it */ }
    }
  };
}

/* A static server that behaves like the host does.

   Two things matter and neither is the default anywhere. Cloudflare Pages
   ignores Range and answers with the whole file — that is the condition the
   seeking bug lived in. And it delivers at a finite speed: served instantly
   from a local disk, the whole track lands before a test can seek, so the
   bug hides. `kbps` throttles the body so "still downloading" is a state the
   test can actually observe. */
export function serve(root, port, { kbps = 0 } = {}) {
  const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript',
    '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.m4a': 'audio/mp4', '.opus': 'audio/ogg', '.mp3': 'audio/mpeg',
    '.vtt': 'text/vtt', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
  };
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = join(root, url === '/' ? '/index.html' : url);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    let body;
    try { body = await readFile(file); }
    catch { res.writeHead(404).end('not found'); return; }

    const ext = file.slice(file.lastIndexOf('.'));
    /* Deliberately no Accept-Ranges, and Range is ignored: 200 with the lot,
       exactly as Pages does it. */
    res.writeHead(200, {
      'content-type': types[ext] || 'application/octet-stream',
      'content-length': body.length,
      'cache-control': 'no-store'
    });

    const isMedia = ext === '.m4a' || ext === '.opus' || ext === '.mp3';
    if (!kbps || !isMedia) { res.end(body); return; }

    const chunk = Math.max(1024, Math.round((kbps * 1024) / 20));   // 20 writes a second
    let at = 0;
    const tick = () => {
      if (at >= body.length) { res.end(); return; }
      res.write(body.subarray(at, at + chunk));
      at += chunk;
      setTimeout(tick, 50);
    };
    tick();
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ stop: () => server.close() }));
  });
}
