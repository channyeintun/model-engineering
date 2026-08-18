/* =========================================================================
   Lesson 08 — Latency and memory.
   Seven scenes:
     lm-prefill    prefill in one wide pass vs decode one token at a time
     lm-wall       the bandwidth pipe, and what quantization does to it
     lm-kv         the KV cache growing past the weights
     lm-fuse       three kernels and six memory trips collapsing into one and two
     lm-timing     the clock that stops before the device does
     lm-waterfall  one request, broken into phases
     lm-thermal    tokens per second decaying over three minutes
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;
  var NS = 'http://www.w3.org/2000/svg';

  function e(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  }
  /* 1830 -> "1 830" */
  function grp(v) {
    var s = String(Math.round(v));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /* ======================================================================
     Scene 1 — prefill vs decode
     ====================================================================== */

  Scene.register('lm-prefill', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#pf-plot');

    /* ---- prompt tokens: 8 rows on the left ---- */
    var TX = 140, TW = 120, TH = 20, TGAP = 4, TY0 = 58;
    var rows = [];
    for (var i = 0; i < 8; i++) {
      var y = TY0 + i * (TH + TGAP);
      var g = e('g', { opacity: 0 });
      add(g, e('rect', {
        x: TX, y: y, width: TW, height: TH, rx: 5,
        fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.3
      }));
      add(g, e('text', {
        x: TX + TW / 2, y: y + 14, 'text-anchor': 'middle',
        class: 'dg-mono', 'font-size': 11, fill: 'var(--c-data)'
      }, 'token ' + (i + 1)));
      host.appendChild(g);
      rows.push(g);
    }
    add(host, e('text', { x: TX + TW / 2, y: 44, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'prompt'));
    add(host, e('text', { x: TX + TW / 2, y: 268, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, '512 tokens (8 shown)'));

    /* ---- the band that carries tokens into the model ---- */
    var band = e('rect', {
      x: 268, y: 54, width: 104, height: 198, rx: 8,
      fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.2, opacity: 0
    });
    host.appendChild(band);

    /* ---- the model column ---- */
    var model = S.box(380, 48, 130, 210, {
      title: 'the model', note: 'all weights, read once per pass', role: 'param'
    });
    host.appendChild(model);

    /* ---- outputs ---- */
    var outs = [];
    for (i = 0; i < 4; i++) {
      var oy = TY0 + i * (TH + TGAP);
      var og = e('g', { opacity: 0 });
      add(og, e('rect', {
        x: 560, y: oy, width: 120, height: TH, rx: 5,
        fill: 'var(--c-ok-dim)', stroke: 'var(--c-ok)', 'stroke-width': 1.3
      }));
      add(og, e('text', {
        x: 620, y: oy + 14, 'text-anchor': 'middle',
        class: 'dg-mono', 'font-size': 11, fill: 'var(--c-ok)'
      }, 'out ' + (i + 1)));
      host.appendChild(og);
      outs.push(og);
    }
    add(host, e('text', { x: 620, y: 44, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'generated'));

    var outArrow = S.arrow(516, 153, 554, 153, { role: 'ok' });
    host.appendChild(outArrow);

    /* ---- readout ---- */
    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', {
      x: 700, y: 54, width: 180, height: 170, rx: 12,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    add(panel, e('text', { x: 714, y: 80, class: 'dg-label dg-label--sm' }, 'tokens this pass'));
    var vTok = e('text', { x: 866, y: 106, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 20, fill: 'var(--c-data)' }, '—');
    add(panel, vTok);
    add(panel, e('text', { x: 714, y: 136, class: 'dg-label dg-label--sm' }, 'weight bytes read'));
    var vByt = e('text', { x: 866, y: 162, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 20, fill: 'var(--c-param)' }, '—');
    add(panel, vByt);
    add(panel, e('text', { x: 714, y: 192, class: 'dg-label dg-label--sm' }, 'FLOP per byte'));
    var vInt = e('text', { x: 866, y: 216, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 18, fill: 'var(--c-ok)' }, '—');
    add(panel, vInt);
    host.appendChild(panel);

    var foot = e('text', {
      x: 450, y: 302, 'text-anchor': 'middle', class: 'dg-label dg-label--sm', opacity: 0
    }, 'prefill: one read of the weights for 512 tokens  ·  decode: one read of the weights per token');
    host.appendChild(foot);

    /* ---- steps ---- */

    tl.step('A prompt is a list of tokens. Eight are drawn here; assume there are 512.');
    k.appear(tl, rows, { stagger: 0.05, y: 0 });

    tl.step('<b>Prefill</b> pushes all of them through the model in one wide pass. Every weight is read once, and used 512 times.');
    tl.to(band, { opacity: 1, duration: 0.35 });
    tl.to(model, { opacity: 1, duration: 0.4 }, '-=0.15');
    tl.to(panel, { opacity: 1, duration: 0.35 }, '-=0.2');
    tl.call(function () {
      vTok.textContent = '512';
      vByt.textContent = '1.83 GB';
      vInt.textContent = '≈ 1700';
    });
    tl.to([outArrow, outs[0]], { opacity: 1, duration: 0.35 });

    tl.step('1700 FLOP of arithmetic for every byte read. That is far above what the hardware balances at, so prefill is <b>compute-bound</b>: the arithmetic units are the limit.');
    k.pulse(tl, vInt, { scale: 1.3 });

    tl.step('Now <b>decode</b>. One token goes in. To produce the next one the model reads every weight again — the whole 1.83 GB — and uses each one exactly once.');
    k.dim(tl, rows.slice(0, 7), { to: 0.18 });
    tl.to(band, { attr: { y: 222, height: 28 }, duration: 0.5, ease: 'power2.inOut' }, '<');
    tl.call(function () {
      vTok.textContent = '1';
      vInt.textContent = '≈ 3.3';
    });
    tl.to(vInt, { fill: 'var(--c-loss)', duration: 0.3 });
    tl.to(outs[1], { opacity: 1, duration: 0.3 });

    tl.step('And again for the token after that. And again. The bytes add up; the arithmetic does not.');
    tl.to(outs[2], { opacity: 1, duration: 0.3 });
    k.count(tl, vByt, 1.83, 3.66, { decimals: 2, duration: 0.4, format: fmtGB, position: '<' });
    tl.to(outs[3], { opacity: 1, duration: 0.3 });
    k.count(tl, vByt, 3.66, 5.49, { decimals: 2, duration: 0.4, format: fmtGB, position: '<' });

    tl.step('3.3 against 1700. Same weights, same model file, two completely different bottlenecks. Measure them separately or you will measure nothing.');
    tl.to(foot, { opacity: 1, duration: 0.4 });
    k.pulse(tl, panel, { scale: 1.03 });

    function fmtGB(v) { return v.toFixed(2) + ' GB'; }
  });

  /* ======================================================================
     Scene 2 — the bandwidth wall
     ====================================================================== */

  Scene.register('lm-wall', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#bw-plot');

    /* ---- memory block ---- */
    add(host, e('text', { x: 140, y: 60, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'memory'));
    var ram = e('g', { opacity: 0 });
    add(ram, e('rect', {
      x: 60, y: 70, width: 160, height: 150, rx: 10,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    var fluid = e('rect', { x: 68, y: 76, width: 144, height: 138, rx: 5, fill: 'var(--c-param)', opacity: 0.75 });
    add(ram, fluid);
    host.appendChild(ram);
    var sizeLbl = e('text', {
      x: 140, y: 240, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13,
      fill: 'var(--c-param)', opacity: 0
    }, '6.0 GB  ·  BF16');
    host.appendChild(sizeLbl);

    /* ---- the pipe ---- */
    var pipe = e('g', { opacity: 0 });
    add(pipe, e('rect', {
      x: 220, y: 120, width: 340, height: 56, rx: 6,
      fill: 'var(--surface-3)', stroke: 'var(--line)', 'stroke-width': 1.4
    }));
    host.appendChild(pipe);
    var pipeLbl = e('text', {
      x: 390, y: 110, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13,
      fill: 'var(--text-soft)', opacity: 0
    }, 'memory bandwidth  ·  75.8 GB/s');
    host.appendChild(pipeLbl);

    var flow = e('rect', { x: 224, y: 128, width: 70, height: 40, rx: 4, fill: 'var(--c-param)', opacity: 0 });
    host.appendChild(flow);
    var head = e('path', { d: 'M552,148 l-14,-8 l0,16 z', fill: 'var(--text-dim)', opacity: 0 });
    host.appendChild(head);

    /* ---- compute block ---- */
    var comp = e('g', { opacity: 0 });
    add(comp, e('rect', {
      x: 580, y: 70, width: 140, height: 150, rx: 10,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    add(comp, e('text', { x: 650, y: 104, 'text-anchor': 'middle', class: 'dg-title' }, 'compute'));
    add(comp, e('text', { x: 650, y: 172, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'units in use'));
    add(comp, e('rect', { x: 596, y: 182, width: 108, height: 12, rx: 6, fill: 'var(--surface-3)' }));
    var util = e('rect', { x: 596, y: 182, width: 3, height: 12, rx: 6, fill: 'var(--c-ok)' });
    add(comp, util);
    var utilT = e('text', { x: 650, y: 212, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13, fill: 'var(--c-ok)' }, '—');
    add(comp, utilT);
    host.appendChild(comp);

    /* ---- readout ---- */
    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', {
      x: 740, y: 80, width: 140, height: 130, rx: 12,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    add(panel, e('text', { x: 752, y: 106, class: 'dg-label dg-label--sm' }, 'ms / token'));
    var vMs = e('text', { x: 868, y: 134, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 20, fill: 'var(--c-loss)' }, '—');
    add(panel, vMs);
    add(panel, e('text', { x: 752, y: 168, class: 'dg-label dg-label--sm' }, 'ceiling, tok/s'));
    var vTps = e('text', { x: 868, y: 196, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 20, fill: 'var(--c-ok)' }, '—');
    add(panel, vTps);
    host.appendChild(panel);

    var foot = e('text', {
      x: 450, y: 272, 'text-anchor': 'middle', class: 'dg-label dg-label--sm', opacity: 0
    }, 'one generated token = one complete read of the model');
    host.appendChild(foot);

    /* ---- steps ---- */

    tl.step('To produce one token the chip must read <b>every weight once</b>. In BF16 this 3-billion-parameter model is 6.0 GB.');
    tl.to(ram, { opacity: 1, duration: 0.4 });
    tl.to(sizeLbl, { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('Between memory and compute there is one pipe: <b>memory bandwidth</b>. On a recent phone it carries about 75.8 GB per second, and nothing can go faster than the pipe.');
    tl.to([pipe, pipeLbl, head, comp, panel], { opacity: 1, duration: 0.4, stagger: 0.06 });
    tl.to(flow, { opacity: 0.85, duration: 0.15 });
    tl.to(flow, { attr: { x: 486 }, duration: 0.6, ease: 'none', repeat: 1 });
    k.count(tl, vMs, 0, 79.2, { decimals: 1, duration: 0.7, position: '<' });
    k.count(tl, vTps, 0, 12.6, { decimals: 1, duration: 0.7, position: '<' });

    tl.step('While that happens the arithmetic units do almost nothing. At BF16 that is 2 FLOP of maths for every 2 bytes read — 1.0 FLOP per byte, on a chip balanced at about 53. Barely 2 % of the arithmetic busy.');
    tl.to(util, { attr: { width: 2 }, duration: 0.5 });
    tl.call(function () { utilT.textContent = '≈ 2 %'; });
    k.pulse(tl, comp, { scale: 1.04 });

    tl.step('Now quantize to <span class="kw">Q4_K_M</span> — 4.89 bits per weight. The same model becomes 1.83 GB. Three times less water, exactly the same pipe — and with fewer bytes per weight the intensity rises to 3.3 FLOP per byte, about 6 % busy.');
    tl.to(fluid, { attr: { y: 171.9, height: 42.1 }, duration: 0.8, ease: 'power2.inOut' });
    tl.to(util, { attr: { width: 7 }, duration: 0.5 }, '<');
    tl.call(function () { utilT.textContent = '≈ 6 %'; });
    tl.call(function () { sizeLbl.textContent = '1.83 GB  ·  Q4_K_M'; });
    tl.to(flow, { attr: { x: 224, width: 24 }, duration: 0.01 });
    tl.to(flow, { attr: { x: 490 }, duration: 0.45, ease: 'none', repeat: 1 });

    tl.step('24.2 ms per token instead of 79.2, and the ceiling rises from 13 to 41 tokens per second. On a device, making a model smaller <b>is</b> making it faster.');
    k.count(tl, vMs, 79.2, 24.2, { decimals: 1, duration: 0.8 });
    k.count(tl, vTps, 12.6, 41.0, { decimals: 1, duration: 0.8, position: '<' });
    tl.to(foot, { opacity: 1, duration: 0.4 });
  });

  /* ======================================================================
     Scene 3 — the KV cache
     ====================================================================== */

  Scene.register('lm-kv', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#kv-plot');

    var BASE = 250, BW = 90, K = 190 / 6125;      /* pixels per MB */
    var WEIGHTS = 1830;
    var wh = WEIGHTS * K;                          /* 56.8 px */
    var cols = [
      { x: 140, ctx: '512',    kv: 67.1 },
      { x: 320, ctx: '2 048',  kv: 268.4 },
      { x: 500, ctx: '8 192',  kv: 1073.7 },
      { x: 680, ctx: '32 768', kv: 4295.0 }
    ];

    /* axis */
    add(host, e('line', { x1: 100, y1: BASE, x2: 830, y2: BASE, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, e('text', { x: 830, y: 292, 'text-anchor': 'end', class: 'dg-label dg-label--sm' }, 'context length (tokens) →'));

    var wBars = [], kBars = [], vLabels = [];
    cols.forEach(function (c) {
      var wb = e('rect', {
        x: c.x, y: BASE - wh, width: BW, height: wh, rx: 3,
        fill: 'var(--c-param)', opacity: 0
      });
      host.appendChild(wb); wBars.push(wb);

      var kh = c.kv * K;
      var kb = e('rect', {
        x: c.x, y: BASE - wh - kh, width: BW, height: kh, rx: 3,
        fill: 'var(--c-data)', opacity: 0
      });
      host.appendChild(kb); kBars.push(kb);

      var vt = e('text', {
        x: c.x + BW / 2, y: BASE - wh - kh - 10, 'text-anchor': 'middle',
        class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-data)', opacity: 0
      }, grp(c.kv) + ' MB');
      host.appendChild(vt); vLabels.push(vt);

      add(host, e('text', {
        x: c.x + BW / 2, y: 272, 'text-anchor': 'middle', class: 'dg-mono dg-label--sm'
      }, c.ctx));
    });

    /* weights level line */
    var wLine = e('line', {
      x1: 100, y1: BASE - wh, x2: 830, y2: BASE - wh,
      stroke: 'var(--c-param)', 'stroke-width': 1.4, 'stroke-dasharray': '5 5', opacity: 0
    });
    host.appendChild(wLine);
    var wLbl = e('text', {
      x: 104, y: BASE - wh - 7, class: 'dg-mono', 'font-size': 12, fill: 'var(--c-param)', opacity: 0
    }, 'weights, 1 830 MB');
    host.appendChild(wLbl);

    /* formula + legend */
    var formula = e('text', {
      x: 100, y: 30, class: 'dg-mono', 'font-size': 12, fill: 'var(--text-dim)', opacity: 0
    }, 'per token:  2 × 32 layers × 8 KV heads × 128 dims × 2 bytes  =  131 kB');
    host.appendChild(formula);

    var legend = e('g', { opacity: 0 });
    add(legend, e('rect', { x: 100, y: 44, width: 14, height: 4, rx: 2, fill: 'var(--c-param)' }));
    add(legend, e('text', { x: 120, y: 50, class: 'dg-mono', 'font-size': 12, fill: 'var(--c-param)' }, 'INT4 weights — fixed'));
    add(legend, e('rect', { x: 310, y: 44, width: 14, height: 4, rx: 2, fill: 'var(--c-data)' }));
    add(legend, e('text', { x: 330, y: 50, class: 'dg-mono', 'font-size': 12, fill: 'var(--c-data)' }, 'KV cache — grows'));
    host.appendChild(legend);

    var gqa = e('text', {
      x: 100, y: 74, class: 'dg-mono', 'font-size': 12, fill: 'var(--c-ok)', opacity: 0
    }, 'without grouped-query attention every cyan bar would be 4× taller');
    host.appendChild(gqa);

    /* ---- steps ---- */

    tl.step('The weights are a <b>fixed</b> cost. At <span class="kw">Q4_K_M</span> this model is 1 830 MB, whatever you ask it and however long the conversation is.');
    tl.to(wBars, { opacity: 1, duration: 0.4, stagger: 0.05 });
    tl.to([wLine, wLbl, legend], { opacity: 1, duration: 0.35 }, '-=0.2');

    tl.step('The cache is not fixed. Every token you keep in context stores a key and a value, in every layer, for every key/value head.');
    tl.to(formula, { opacity: 1, duration: 0.4 });

    tl.step('At 512 tokens the cache is 67 MB — about four percent of the weights. Nobody notices this on a laptop.');
    tl.to([kBars[0], vLabels[0]], { opacity: 1, duration: 0.45 });

    tl.step('At 2 048 tokens it is 268 MB. At 8 192 it is 1 074 MB, nearly two thirds of the weights, and it is still growing in a straight line.');
    tl.to([kBars[1], vLabels[1]], { opacity: 1, duration: 0.4 });
    tl.to([kBars[2], vLabels[2]], { opacity: 1, duration: 0.4 }, '+=0.1');

    tl.step('At 32 768 tokens the cache is 4 295 MB — <b>more than twice the weights</b>. This is the number that gets your app killed, and it arrives after the user has been talking for a while.');
    tl.to([kBars[3], vLabels[3]], { opacity: 1, duration: 0.5 });
    tl.to(kBars[3], { fill: 'var(--c-loss)', duration: 0.4 });
    tl.to(vLabels[3], { fill: 'var(--c-loss)', duration: 0.4 }, '<');
    k.pulse(tl, vLabels[3], { scale: 1.25 });

    tl.step('Grouped-query attention from Lesson 03 is why this is survivable at all. With 32 query heads and no sharing of keys and values, every cyan bar here would be four times taller.');
    tl.to(gqa, { opacity: 1, duration: 0.4 });
    k.dim(tl, wBars, { to: 0.35, position: '<' });
  });

  /* ======================================================================
     Scene 4 — kernel fusion: six trips to memory, or two
     ====================================================================== */

  Scene.register('lm-fuse', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#fz-plot');

    var MEM_Y = 46, MEM_H = 30, MEM_X = 60, MEM_W = 660;
    var KY = 150, KH = 62;

    /* ---- the memory strip ---- */
    var mem = e('g', { opacity: 0 });
    add(mem, e('rect', {
      x: MEM_X, y: MEM_Y, width: MEM_W, height: MEM_H, rx: 8,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    add(mem, e('text', {
      x: MEM_X + MEM_W / 2, y: MEM_Y + 20, 'text-anchor': 'middle',
      class: 'dg-label dg-label--sm'
    }, 'memory'));
    host.appendChild(mem);

    /* ---- three eager kernels ---- */
    var NAMES = ['RMSNorm', 'scale ×', 'SiLU'];
    var kernels = [], arrows = [];
    for (var i = 0; i < 3; i++) {
      var cx = 140 + i * 220;
      var g = e('g', { opacity: 0 });
      add(g, e('rect', {
        x: cx - 75, y: KY, width: 150, height: KH, rx: 9,
        fill: 'var(--c-param-dim)', stroke: 'var(--c-param)', 'stroke-width': 1.5
      }));
      add(g, e('text', {
        x: cx, y: KY + 27, 'text-anchor': 'middle', class: 'dg-title'
      }, NAMES[i]));
      add(g, e('text', {
        x: cx, y: KY + 48, 'text-anchor': 'middle', class: 'dg-label dg-label--sm'
      }, 'one kernel'));
      host.appendChild(g);
      kernels.push(g);

      var pair = e('g', { opacity: 0 });
      add(pair, e('path', {
        d: 'M' + (cx - 30) + ',' + (MEM_Y + MEM_H) + ' L' + (cx - 30) + ',' + (KY - 10),
        stroke: 'var(--c-data)', 'stroke-width': 2, fill: 'none'
      }));
      add(pair, e('path', {
        d: 'M' + (cx - 30) + ',' + (KY - 2) + ' l-5,-10 l10,0 z', fill: 'var(--c-data)'
      }));
      add(pair, e('path', {
        d: 'M' + (cx + 30) + ',' + (KY - 10) + ' L' + (cx + 30) + ',' + (MEM_Y + MEM_H + 8),
        stroke: 'var(--c-loss)', 'stroke-width': 2, fill: 'none'
      }));
      add(pair, e('path', {
        d: 'M' + (cx + 30) + ',' + (MEM_Y + MEM_H) + ' l-5,10 l10,0 z', fill: 'var(--c-loss)'
      }));
      add(pair, e('text', {
        x: cx - 38, y: KY - 20, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 10.5,
        fill: 'var(--c-data)'
      }, 'read 6 kB'));
      add(pair, e('text', {
        x: cx + 38, y: KY - 20, class: 'dg-mono', 'font-size': 10.5, fill: 'var(--c-loss)'
      }, 'write 6 kB'));
      host.appendChild(pair);
      arrows.push(pair);
    }

    /* ---- the fused kernel, drawn in the same place, hidden ---- */
    var fused = e('g', { opacity: 0 });
    add(fused, e('rect', {
      x: 105, y: KY, width: 550, height: KH, rx: 9,
      fill: 'var(--c-ok-dim)', stroke: 'var(--c-ok)', 'stroke-width': 1.8
    }));
    add(fused, e('text', {
      x: 380, y: KY + 27, 'text-anchor': 'middle', class: 'dg-title', fill: 'var(--c-ok)'
    }, 'one fused kernel'));
    add(fused, e('text', {
      x: 380, y: KY + 48, 'text-anchor': 'middle', class: 'dg-label dg-label--sm'
    }, 'norm, scale and activation — values stay in registers'));
    host.appendChild(fused);

    var fArrows = e('g', { opacity: 0 });
    add(fArrows, e('path', {
      d: 'M150,' + (MEM_Y + MEM_H) + ' L150,' + (KY - 10),
      stroke: 'var(--c-data)', 'stroke-width': 2, fill: 'none'
    }));
    add(fArrows, e('path', { d: 'M150,' + (KY - 2) + ' l-5,-10 l10,0 z', fill: 'var(--c-data)' }));
    add(fArrows, e('path', {
      d: 'M610,' + (KY - 10) + ' L610,' + (MEM_Y + MEM_H + 8),
      stroke: 'var(--c-loss)', 'stroke-width': 2, fill: 'none'
    }));
    add(fArrows, e('path', {
      d: 'M610,' + (MEM_Y + MEM_H) + ' l-5,10 l10,0 z', fill: 'var(--c-loss)'
    }));
    add(fArrows, e('text', {
      x: 142, y: KY - 20, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 10.5,
      fill: 'var(--c-data)'
    }, 'read 6 kB'));
    add(fArrows, e('text', {
      x: 618, y: KY - 20, class: 'dg-mono', 'font-size': 10.5, fill: 'var(--c-loss)'
    }, 'write 6 kB'));
    host.appendChild(fArrows);

    /* ---- the tally on the right ---- */
    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', {
      x: 740, y: 90, width: 140, height: 120, rx: 12,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    add(panel, e('text', { x: 752, y: 116, class: 'dg-label dg-label--sm' }, 'trips to memory'));
    var vTrips = e('text', {
      x: 868, y: 144, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 22, fill: 'var(--c-loss)'
    }, '—');
    add(panel, vTrips);
    add(panel, e('text', { x: 752, y: 174, class: 'dg-label dg-label--sm' }, 'traffic'));
    var vBytes = e('text', {
      x: 868, y: 200, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 20, fill: 'var(--c-param)'
    }, '—');
    add(panel, vBytes);
    host.appendChild(panel);

    var foot = e('text', {
      x: 380, y: 262, 'text-anchor': 'middle', class: 'dg-label dg-label--sm', opacity: 0
    }, 'the arithmetic is exactly the same either way — only the traffic changed');
    host.appendChild(foot);

    /* ---- steps ---- */

    tl.step('A decode step launches a few thousand tiny kernels. Here are three of them, in the order the model runs them.');
    tl.to(mem, { opacity: 1, duration: 0.35 });
    tl.to(kernels, { opacity: 1, duration: 0.35, stagger: 0.12 });

    tl.step('Each kernel reads its input from memory and writes its output back. Three operations, six trips.');
    tl.to(arrows, { opacity: 1, duration: 0.35, stagger: 0.14 });
    tl.to(panel, { opacity: 1, duration: 0.3 }, '<');
    k.count(tl, vTrips, 0, 6, { decimals: 0, duration: 0.6 });
    tl.call(function () { vBytes.textContent = '36 kB'; });

    tl.step('An RMSNorm over 3 072 values in FP16 reads 6 kB and writes 6 kB, and does about three operations per value. The traffic is the entire cost.');
    k.pulse(tl, kernels[0], { scale: 1.04 });
    tl.to([kernels[1], kernels[2]], { opacity: 0.4, duration: 0.35 }, '<');
    tl.to([kernels[1], kernels[2]], { opacity: 1, duration: 0.35 });

    tl.step('<b>Kernel fusion</b> writes one kernel that does the whole chain while the values are still in registers. The two middle tensors are never born.');
    tl.to([kernels[0], kernels[1], kernels[2]], { opacity: 0, duration: 0.4 });
    tl.to(arrows, { opacity: 0, duration: 0.4 }, '<');
    tl.to(fused, { opacity: 1, duration: 0.5 });

    tl.step('Two trips instead of six, 12 kB instead of 36. On a laptop GPU this is usually 10 % to 30 % off decode latency — and near zero if one big matrix multiply dominates.');
    tl.to(fArrows, { opacity: 1, duration: 0.4 });
    k.count(tl, vTrips, 6, 2, { decimals: 0, duration: 0.6 });
    tl.call(function () { vBytes.textContent = '12 kB'; });
    tl.to(vTrips, { fill: 'var(--c-ok)', duration: 0.3 });
    tl.to(foot, { opacity: 1, duration: 0.4 });
  });

  /* ======================================================================
     Scene 5 — the clock that stops too early
     ====================================================================== */

  Scene.register('lm-timing', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#tm-plot');

    /* readout */
    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', {
      x: 600, y: 20, width: 272, height: 46, rx: 11,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    add(panel, e('text', { x: 614, y: 49, class: 'dg-label dg-label--sm' }, 'the stopwatch says'));
    var vT = e('text', { x: 858, y: 51, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 19, fill: 'var(--c-loss)' }, '—');
    add(panel, vT);
    host.appendChild(panel);

    /* lanes */
    add(host, e('rect', { x: 200, y: 88, width: 660, height: 26, rx: 6, fill: 'var(--surface-2)', stroke: 'var(--line-soft)', 'stroke-width': 1 }));
    add(host, e('rect', { x: 200, y: 150, width: 660, height: 26, rx: 6, fill: 'var(--surface-2)', stroke: 'var(--line-soft)', 'stroke-width': 1 }));
    add(host, e('text', { x: 190, y: 105, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 12.5, fill: 'var(--text-soft)' }, 'CPU · Python'));
    add(host, e('text', { x: 190, y: 167, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 12.5, fill: 'var(--text-soft)' }, 'device · GPU'));

    var cpuBlocks = [], devBlocks = [];
    for (var i = 0; i < 8; i++) {
      var cb = e('rect', { x: 204 + i * 20, y: 92, width: 16, height: 18, rx: 3, fill: 'var(--c-frozen)', opacity: 0 });
      host.appendChild(cb); cpuBlocks.push(cb);
      var db = e('rect', { x: 204 + i * 68, y: 154, width: 64, height: 18, rx: 3, fill: 'var(--c-data)', opacity: 0 });
      host.appendChild(db); devBlocks.push(db);
    }

    /* axis */
    add(host, e('line', { x1: 200, y1: 196, x2: 860, y2: 196, stroke: 'var(--line)', 'stroke-width': 1.4 }));
    add(host, e('text', { x: 860, y: 212, 'text-anchor': 'end', class: 'dg-label dg-label--sm' }, 'time →'));

    function marker(x, text, colour) {
      var g = e('g', { opacity: 0 });
      add(g, e('line', { x1: x, y1: 80, x2: x, y2: 196, stroke: colour, 'stroke-width': 1.6, 'stroke-dasharray': '4 4' }));
      add(g, e('text', { x: x, y: 76, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 11.5, fill: colour }, text));
      host.appendChild(g);
      return g;
    }
    var mStart = marker(204, 'start', 'var(--text-dim)');
    var mNaive = marker(360, 'naive stop', 'var(--c-loss)');
    var mTrue  = marker(744, 'true stop', 'var(--c-ok)');

    function syncBar(x) {
      var r = e('rect', { x: x - 3, y: 84, width: 6, height: 112, rx: 3, fill: 'var(--c-ok)', opacity: 0 });
      host.appendChild(r);
      return r;
    }
    var s1 = syncBar(204), s2 = syncBar(744);
    var syncLbl = e('text', {
      x: 474, y: 232, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12.5,
      fill: 'var(--c-ok)', opacity: 0
    }, 'synchronize() — wait until the queue is empty');
    host.appendChild(syncLbl);

    /* warm-up chart */
    var warm = e('g', { opacity: 0 });
    add(warm, e('line', { x1: 200, y1: 296, x2: 630, y2: 296, stroke: 'var(--line)', 'stroke-width': 1.2 }));
    var wBars = [];
    for (i = 0; i < 8; i++) {
      var h = i === 0 ? 58 : 16;
      var wb = e('rect', {
        x: 200 + i * 54, y: 296 - h, width: 40, height: h, rx: 3,
        fill: i === 0 ? 'var(--c-loss)' : 'var(--c-ok)'
      });
      add(warm, wb); wBars.push(wb);
    }
    add(warm, e('text', { x: 640, y: 256, class: 'dg-mono', 'font-size': 12, fill: 'var(--c-loss)' }, 'run 1 = compile + allocate'));
    add(warm, e('text', { x: 640, y: 278, class: 'dg-mono', 'font-size': 12, fill: 'var(--c-ok)' }, 'runs 2+ = the model'));
    add(warm, e('text', { x: 630, y: 314, 'text-anchor': 'end', class: 'dg-label dg-label--sm' }, 'iteration →'));
    host.appendChild(warm);

    /* ---- steps ---- */

    tl.step('Python does not run the model. It puts the work on the device queue and returns at once — long before anything has been computed.');
    tl.to(cpuBlocks, { opacity: 1, duration: 0.2, stagger: 0.05 });
    tl.to(devBlocks, { opacity: 1, duration: 0.25, stagger: 0.18 }, '-=0.3');

    tl.step('Start a clock here and stop it when Python returns, and you have measured how fast Python can fill a queue.');
    tl.to([mStart, mNaive, panel], { opacity: 1, duration: 0.35 });
    tl.call(function () { vT.textContent = '0.4 ms'; });
    k.pulse(tl, vT, { scale: 1.3 });

    tl.step('The device is still working. The real end of the step is here. The wrong number was smaller by a factor of sixty, and it looked perfectly plausible.');
    tl.to(mTrue, { opacity: 1, duration: 0.35 });
    tl.to(vT, { fill: 'var(--c-ok)', duration: 0.3 }, '<');
    k.count(tl, vT, 0.4, 24.2, { decimals: 1, duration: 0.8, format: function (v) { return v.toFixed(1) + ' ms'; } });

    tl.step('<span class="kw">torch.cuda.synchronize()</span> and <span class="kw">torch.mps.synchronize()</span> block until the queue is empty. One before you start the clock, one before you stop it.');
    tl.to([s1, s2], { opacity: 0.9, duration: 0.35, stagger: 0.1 });
    tl.to(syncLbl, { opacity: 1, duration: 0.3 }, '-=0.15');
    k.dim(tl, mNaive, { to: 0.2, position: '<' });

    tl.step('Then the other half of the recipe. The <b>first</b> run also allocates buffers and compiles kernels, so it is not the model you want to time. Warm up, discard, and take the median of what is left.');
    tl.to(warm, { opacity: 1, duration: 0.4 });
    k.pulse(tl, wBars[0], { scale: 1.15 });
  });

  /* ======================================================================
     Scene 6 — the latency waterfall
     ====================================================================== */

  Scene.register('lm-waterfall', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#wf-plot');

    var X0 = 200, PX = 0.185;                 /* pixels per millisecond */
    function X(t) { return X0 + t * PX; }

    /* axis */
    add(host, e('line', { x1: 200, y1: 250, x2: 870, y2: 250, stroke: 'var(--line)', 'stroke-width': 1.4 }));
    [[0, '0'], [1000, '1 s'], [2000, '2 s'], [3000, '3 s']].forEach(function (t) {
      add(host, e('line', { x1: X(t[0]), y1: 250, x2: X(t[0]), y2: 256, stroke: 'var(--line)', 'stroke-width': 1.4 }));
      add(host, e('text', { x: X(t[0]), y: 270, 'text-anchor': 'middle', class: 'dg-mono dg-label--sm' }, t[1]));
    });
    add(host, e('text', { x: 870, y: 290, 'text-anchor': 'end', class: 'dg-label dg-label--sm' }, 'time from launch →'));

    /* readout */
    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', {
      x: 560, y: 18, width: 310, height: 38, rx: 10,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    add(panel, e('text', { x: 574, y: 42, class: 'dg-label dg-label--sm' }, 'time to first token'));
    var vTtft = e('text', { x: 856, y: 43, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 18, fill: 'var(--c-loss)' }, '—');
    add(panel, vTtft);
    host.appendChild(panel);

    var rows = [
      { y: 70,  label: 'open + mmap',     from: 0,    ms: 12,   role: 'frozen', text: '12 ms' },
      { y: 110, label: 'backend compile', from: 12,   ms: 2400, role: 'loss',   text: '2 400 ms' },
      { y: 150, label: 'prefill 512 tok', from: 2412, ms: 380,  role: 'data',   text: '380 ms' },
      { y: 190, label: 'decode 32 tok',   from: 2792, ms: 774,  role: 'ok',     text: '774 ms' }
    ];

    var bars = [], vals = [];
    rows.forEach(function (r, i) {
      var w = Math.max(5, r.ms * PX);
      var bar = e('rect', {
        x: X(r.from), y: r.y, width: w, height: 26, rx: 4,
        fill: S.role(r.role), opacity: 0
      });
      host.appendChild(bar); bars.push(bar);

      add(host, e('text', {
        x: 190, y: r.y + 18, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 12,
        fill: 'var(--text-soft)'
      }, r.label));

      var vx = (i === 3) ? X(r.from) + w / 2 : X(r.from) + w + 10;
      var vy = (i === 3) ? r.y - 8 : r.y + 18;
      var vt = e('text', {
        x: vx, y: vy, 'text-anchor': (i === 3) ? 'middle' : 'start',
        class: 'dg-mono', 'font-size': 12.5, fill: S.role(r.role), opacity: 0
      }, r.text);
      host.appendChild(vt); vals.push(vt);
    });

    /* ---- steps ---- */

    tl.step('One request is not one number. Split a cold start into phases and time each phase on its own.');

    tl.step('Opening the file is nearly free. <span class="kw">mmap</span> maps the weights into the address space and the pages arrive as they are touched.');
    tl.to([bars[0], vals[0]], { opacity: 1, duration: 0.4 });

    tl.step('Then the backend <b>compiles</b>. Core ML builds a <span class="kw">.mlmodelc</span>, WebGPU compiles shaders. This is not inference at all, and on a cold start it is usually the largest bar by far.');
    tl.to(bars[1], { opacity: 1, duration: 0.1 });
    tl.from(bars[1], { attr: { width: 4 }, duration: 0.9, ease: 'power2.out' });
    tl.to(vals[1], { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('Prefill runs the whole prompt through the model. Only now can the first token appear. Time to first token is these three bars added together.');
    tl.to([bars[2], vals[2], panel], { opacity: 1, duration: 0.4 });
    k.count(tl, vTtft, 0, 2792, { duration: 0.8, format: function (v) { return grp(v) + ' ms'; }, position: '<' });

    tl.step('Decode follows, at whatever rate the memory pipe allows. At the ceiling rate of 24.2 ms per token, 32 tokens would cost 774 ms.');
    tl.to([bars[3], vals[3]], { opacity: 1, duration: 0.4 });

    tl.step('Now cache the compiled artifact. The second launch is a different application: 432 ms to the first token instead of 2 792. The fix for a cold start is caching compilation, not faster storage.');
    var w2 = Math.max(5, 40 * PX);
    tl.to(bars[1], { attr: { width: w2 }, duration: 0.7, ease: 'power2.inOut' });
    tl.to(vals[1], { attr: { x: X(12) + w2 + 10 }, duration: 0.7, ease: 'power2.inOut' }, '<');
    tl.call(function () { vals[1].textContent = '40 ms'; }, null, '<');
    tl.to(bars[2], { attr: { x: X(52) }, duration: 0.7, ease: 'power2.inOut' }, '<');
    tl.to(vals[2], { attr: { x: X(52) + 380 * PX + 10 }, duration: 0.7, ease: 'power2.inOut' }, '<');
    tl.to(bars[3], { attr: { x: X(432) }, duration: 0.7, ease: 'power2.inOut' }, '<');
    tl.to(vals[3], { attr: { x: X(432) + 774 * PX / 2 }, duration: 0.7, ease: 'power2.inOut' }, '<');
    k.count(tl, vTtft, 2792, 432, { duration: 0.7, format: function (v) { return grp(v) + ' ms'; }, position: '<' });
    tl.to(vTtft, { fill: 'var(--c-ok)', duration: 0.3 });
  });

  /* ======================================================================
     Scene 7 — thermal throttling
     ====================================================================== */

  Scene.register('lm-thermal', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#th-plot');

    /* axes */
    add(host, e('line', { x1: 100, y1: 240, x2: 840, y2: 240, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, e('line', { x1: 100, y1: 40, x2: 100, y2: 240, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, e('text', { x: 92, y: 46, 'text-anchor': 'end', class: 'dg-label dg-label--sm' }, 'tokens / s'));
    [[0, '0'], [60, '60 s'], [120, '120 s'], [180, '180 s']].forEach(function (t) {
      var x = 100 + t[0] * (740 / 180);
      add(host, e('line', { x1: x, y1: 240, x2: x, y2: 246, stroke: 'var(--line)', 'stroke-width': 1.4 }));
      add(host, e('text', { x: x, y: 258, 'text-anchor': 'middle', class: 'dg-mono dg-label--sm' }, t[1]));
    });
    add(host, e('text', { x: 840, y: 274, 'text-anchor': 'end', class: 'dg-label dg-label--sm' }, 'seconds of continuous generation →'));

    /* the honest trace */
    var trace = e('path', {
      d: 'M100,80 L272,80 C282,80 288,131.2 298,131.2 L580,131.2 C590,131.2 596,156.8 606,156.8 L840,156.8',
      fill: 'none', stroke: 'var(--c-ok)', 'stroke-width': 2.8, 'stroke-linecap': 'round', opacity: 0
    });
    host.appendChild(trace);

    /* the lie */
    var ghost = e('path', {
      d: 'M100,80 L840,80', fill: 'none', stroke: 'var(--c-frozen)',
      'stroke-width': 2, 'stroke-dasharray': '7 6', opacity: 0
    });
    host.appendChild(ghost);
    var ghostLbl = e('text', {
      x: 836, y: 72, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 12,
      fill: 'var(--c-frozen)', opacity: 0
    }, 'what a 10-second run reports');
    host.appendChild(ghostLbl);

    function vlabel(x, y, text, colour) {
      var t = e('text', { x: x, y: y, class: 'dg-mono', 'font-size': 13, fill: colour, opacity: 0 }, text);
      host.appendChild(t);
      return t;
    }
    var l41 = vlabel(112, 72, '25 tok/s', 'var(--c-ok)');
    var l28 = vlabel(310, 124, '17 tok/s', 'var(--c-ok)');
    var l22 = vlabel(615, 149, '13 tok/s', 'var(--c-ok)');

    function drop(x, text) {
      var g = e('g', { opacity: 0 });
      add(g, e('line', { x1: x, y1: 90, x2: x, y2: 240, stroke: 'var(--c-loss)', 'stroke-width': 1.4, 'stroke-dasharray': '4 4' }));
      add(g, e('text', { x: x + 8, y: 186, class: 'dg-mono', 'font-size': 12, fill: 'var(--c-loss)' }, text));
      host.appendChild(g);
      return g;
    }
    var d1 = drop(285, '≈45 s · clocks drop');
    var d2 = drop(593, '≈2 min · again');

    var avg = e('text', {
      x: 110, y: 222, class: 'dg-mono', 'font-size': 13.5, fill: 'var(--c-ok)', opacity: 0
    }, '3-minute average ≈ 18 tok/s');
    host.appendChild(avg);

    /* ---- steps ---- */

    tl.step('The first ten seconds look excellent: 25 tokens per second, about 60 % of the 41 tok/s bandwidth ceiling you computed.');
    tl.to(trace, { opacity: 1, duration: 0.01 });
    k.draw(tl, trace, { duration: 2.6, ease: 'none' });
    tl.to(l41, { opacity: 1, duration: 0.3 }, 0.3);

    tl.step('There is no fan. The chip heats up and the system lowers the clock speed to protect the battery. After roughly 45 seconds the rate steps down to 17.');
    tl.to([d1, l28], { opacity: 1, duration: 0.4 });

    tl.step('It happens again. After about two minutes the sustained rate is 13 — about half of what the ten-second run told you.');
    tl.to([d2, l22], { opacity: 1, duration: 0.4 });

    tl.step('Here is the number a ten-second benchmark would have published: a flat line at the peak, for as long as you care to draw it.');
    tl.to([ghost, ghostLbl], { opacity: 1, duration: 0.4 });
    k.pulse(tl, ghostLbl, { scale: 1.15 });

    tl.step('The honest figure is the average over a realistic run — about 18 tokens per second here. Publish the curve, not the peak, and generate for at least five minutes before you believe any of it.');
    tl.to(avg, { opacity: 1, duration: 0.4 });
    k.dim(tl, [ghost, ghostLbl], { to: 0.3, position: '<' });
  });

})();
