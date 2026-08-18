/* =========================================================================
   Lesson 10 — On the device.
   Seven scenes: the app bundle and the download limit, the three compute units
   and the copies between them, the cold-start waterfall, browser caching,
   WebGPU against WebAssembly, the memory budget that terminates apps, and 200 MB against zero.
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;

  /* Small local helpers so every scene here looks the same. */
  function txt(x, y, t, o) {
    o = o || {};
    return S.e('text', {
      x: x, y: y,
      'text-anchor': o.anchor || 'start',
      class: o.mono ? 'dg-mono' : (o.small ? 'dg-label dg-label--sm' : 'dg-label'),
      'font-size': o.size || null,
      fill: o.role ? S.role(o.role) : (o.fill || null),
      opacity: o.opacity != null ? o.opacity : 1
    }, t);
  }

  function rect(x, y, w, h, o) {
    o = o || {};
    return S.e('rect', {
      x: x, y: y, width: w, height: h, rx: o.rx != null ? o.rx : 8,
      fill: o.role ? S.tintOf(o.role) : (o.fill || 'var(--surface-2)'),
      stroke: o.noStroke ? null : (o.role ? S.role(o.role) : (o.stroke || 'var(--line)')),
      'stroke-width': o.noStroke ? null : (o.sw || 1.4),
      'stroke-dasharray': o.dashed ? '5 5' : null,
      opacity: o.opacity != null ? o.opacity : 1
    });
  }

  /* ======================================================================
     Scene 1 — what is inside the app bundle, and the 200 MB line
     ====================================================================== */

  Scene.register('dev-bundle', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#db-plot');

    /* ---- left: the bundle ---- */
    var bundleLbl = txt(60, 46, 'MyApp — what actually ships', { small: true, opacity: 0 });
    var shell = rect(60, 60, 340, 214, { rx: 12, fill: 'var(--surface-1)', opacity: 0 });
    S.add(host, shell, bundleLbl);

    function row(y, h, name, size, roleName, sub) {
      var g = S.g({ opacity: 0 });
      S.add(g, rect(80, y, 300, h, { role: roleName, fill: roleName ? null : 'var(--surface-3)' }));
      S.add(g, S.e('text', {
        x: 94, y: sub ? y + 24 : y + h / 2 + 5, class: 'dg-mono', 'font-size': 13,
        fill: 'var(--text)'
      }, name));
      if (sub) {
        S.add(g, S.e('text', { x: 94, y: y + 46, class: 'dg-label dg-label--sm' }, sub));
      }
      S.add(g, S.e('text', {
        x: 366, y: sub ? y + 24 : y + h / 2 + 5, 'text-anchor': 'end',
        class: 'dg-mono', 'font-size': 12.5,
        fill: roleName ? S.role(roleName) : 'var(--text-dim)'
      }, size));
      host.appendChild(g);
      return g;
    }

    var rCode = row(84, 46, 'your Swift code + UI', 'a few MB', null);
    var rRt = row(140, 46, 'runtime library (.a)', 'a few MB', null);
    var rModel = row(196, 62, 'model.pte', '200 MB', 'param', '360M params at 4 bits');

    /* ---- right: the download bar ---- */
    var barLbl = txt(470, 46, 'download size', { small: true, opacity: 0 });
    var track = rect(470, 86, 380, 32, { rx: 16, fill: 'var(--surface-3)', noStroke: true, opacity: 0 });
    var fill = S.e('rect', {
      x: 470, y: 86, width: 0, height: 32, rx: 16, fill: S.role('loss'), opacity: 0
    });
    var limit = S.e('line', {
      x1: 762, y1: 70, x2: 762, y2: 134, stroke: S.role('loss'),
      'stroke-width': 2, 'stroke-dasharray': '5 4', opacity: 0
    });
    var limitTxt = txt(762, 62, '200 MB · cellular limit', { anchor: 'middle', small: true, role: 'loss', opacity: 0 });
    var readout = S.e('text', {
      x: 470, y: 150, class: 'dg-mono', 'font-size': 16, fill: S.role('loss'), opacity: 0
    }, '0 MB');
    S.add(host, barLbl, track, fill, limit, limitTxt, readout);

    /* ---- right: the first-run flow ---- */
    function stepBox(x, w, a, b, roleName) {
      var g = S.g({ opacity: 0 });
      S.add(g, rect(x, 196, w, 52, { role: roleName }));
      S.add(g, S.e('text', {
        x: x + w / 2, y: 218, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12.5,
        fill: 'var(--text)'
      }, a));
      S.add(g, S.e('text', {
        x: x + w / 2, y: 236, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12,
        fill: roleName ? S.role(roleName) : 'var(--text-dim)'
      }, b));
      host.appendChild(g);
      return g;
    }

    var bApp = stepBox(470, 112, 'the app', '15 MB', 'ok');
    var bModel = stepBox(620, 112, 'model.pte', '200 MB', 'param');
    var bCache = stepBox(766, 104, 'caches/', 'on device', null);
    var aA = S.arrow(586, 222, 616, 222, { role: 'data' });
    var aB = S.arrow(736, 222, 762, 222, { role: 'data' });
    S.add(host, aA, aB);

    var noteCache = txt(806, 268, 'the OS may empty this', { anchor: 'middle', small: true, role: 'loss', opacity: 0 });
    var noteRun = txt(470, 292, 'first run: download once, verify the hash', { small: true, opacity: 0 });
    S.add(host, noteCache, noteRun);

    /* ---- steps ---- */
    tl.step('An app bundle is three things: your code, the runtime that executes the graph, and the model file.');
    tl.to([shell, bundleLbl], { opacity: 1, duration: 0.35 });
    tl.to(rCode, { opacity: 1, duration: 0.35 }, '-=0.1');

    tl.step('The runtime is small if you build it small. A minimal build compiles only the operator kernels your own models need.');
    tl.to(rRt, { opacity: 1, duration: 0.35 });
    k.pulse(tl, rRt, { scale: 1.03 });

    tl.step('The model is the download. 360 million parameters at 4 bits is about 200 MB — more than everything else together, many times over.');
    tl.to(rModel, { opacity: 1, duration: 0.4 });
    k.pulse(tl, rModel, { scale: 1.04 });

    tl.step('Apple will not send a download above 200 MB over a cellular connection, and Google Play caps the base module at about the same size. You are over the line.');
    tl.to([barLbl, track, fill, limit, limitTxt, readout], { opacity: 1, duration: 0.3 });
    tl.to(fill, { attr: { width: 314 }, duration: 0.9, ease: 'power2.out' });
    k.count(tl, readout, 0, 215, {
      duration: 0.9, position: '<',
      format: function (v) { return Math.round(v) + ' MB'; }
    });
    k.pulse(tl, limitTxt, { scale: 1.15 });

    tl.step('So take the weights out of the binary. Ship a small app, fetch the model on first run, verify a hash, and write it into a cache directory.');
    k.dim(tl, rModel, { to: 0.25 });
    tl.to([bApp, aA, bModel, aB, bCache, noteRun], { opacity: 1, duration: 0.35, stagger: 0.08 });
    tl.to(fill, { attr: { width: 22 }, fill: S.role('ok'), duration: 0.7, ease: 'power2.inOut' });
    tl.to(readout, { fill: S.role('ok'), duration: 0.3 }, '<');
    k.count(tl, readout, 215, 15, {
      duration: 0.7, position: '<',
      format: function (v) { return Math.round(v) + ' MB'; }
    });

    tl.step('That directory belongs to the operating system, not to you. It can be emptied while your app is not running, so "the model is gone" has to be a normal state in your code.');
    tl.to(noteCache, { opacity: 1, duration: 0.35 });
    k.pulse(tl, bCache, { scale: 1.06 });
    tl.to(bCache, { opacity: 0.35, duration: 0.5 });
    tl.to(bCache, { opacity: 1, duration: 0.4 });
  });

  /* ======================================================================
     Scene 2 — CPU / GPU / Neural Engine, and the copies between them
     ====================================================================== */

  Scene.register('dev-units', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#du-plot');

    var NW = 52, NH = 40, X0 = 216, DX = 66, STRIP_CY = 302;
    var LANE = {
      ane: { y: 56, cy: 82, name: 'Neural Engine' },
      gpu: { y: 124, cy: 150, name: 'GPU' },
      cpu: { y: 192, cy: 218, name: 'CPU' }
    };
    var order = ['ane', 'gpu', 'cpu'];

    /* lanes */
    var laneEls = {};
    order.forEach(function (key) {
      var L = LANE[key];
      var g = S.g({ opacity: 0 });
      S.add(g, rect(200, L.y, 680, 52, { rx: 10, fill: 'var(--surface-1)', dashed: true }));
      S.add(g, S.e('text', {
        x: 192, y: L.cy + 5, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 13,
        fill: 'var(--text-dim)'
      }, L.name));
      host.appendChild(g);
      laneEls[key] = g;
    });

    /* the graph strip */
    var strip = S.e('line', {
      x1: X0 + NW, y1: STRIP_CY, x2: X0 + 9 * DX, y2: STRIP_CY,
      stroke: 'var(--line)', 'stroke-width': 2, opacity: 0
    });
    var stripLbl = txt(192, STRIP_CY + 5, 'exported graph', { anchor: 'end', mono: true, size: 13, fill: 'var(--text-dim)', opacity: 0 });
    S.add(host, strip, stripLbl);

    var names = ['embed', 'proj', 'attn', 'mlp', 'attn', 'norm*', 'mlp', 'attn', 'mlp', 'logits'];
    var lane = ['cpu', 'ane', 'ane', 'ane', 'ane', 'cpu', 'ane', 'ane', 'ane', 'gpu'];

    var nodes = names.map(function (n, i) {
      var x = X0 + i * DX;
      var g = S.g({ opacity: 0 });
      var r = rect(x, STRIP_CY - NH / 2, NW, NH, { role: 'data', rx: 7 });
      S.add(g, r);
      S.add(g, S.e('text', {
        x: x + NW / 2, y: STRIP_CY + 4, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 10.5, fill: 'var(--text)'
      }, n));
      host.appendChild(g);
      return { g: g, rect: r, x: x, cy: LANE[lane[i]].cy, dy: LANE[lane[i]].cy - STRIP_CY };
    });

    /* connectors, drawn at their final geometry */
    var links = [];
    for (var i = 0; i < 9; i++) {
      var a = nodes[i], b = nodes[i + 1];
      var cross = lane[i] !== lane[i + 1];
      var p = S.e('line', {
        x1: a.x + NW, y1: a.cy, x2: b.x, y2: b.cy,
        stroke: cross ? S.role('loss') : 'var(--line)',
        'stroke-width': cross ? 2 : 1.6,
        'stroke-dasharray': cross ? '4 4' : null,
        opacity: 0
      });
      host.appendChild(p);
      var lab = null;
      if (cross) {
        var mx = (a.x + NW + b.x) / 2, my = (a.cy + b.cy) / 2;
        lab = txt(mx, my - 6, 'copy', { anchor: 'middle', mono: true, size: 10.5, role: 'loss', opacity: 0 });
        host.appendChild(lab);
      }
      links.push({ line: p, label: lab, cross: cross });
    }

    var counter = S.e('text', {
      x: 872, y: 40, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 13,
      fill: S.role('loss'), opacity: 0
    }, 'tensor copies: 4');
    var foot = txt(216, 306, '* this operator needs FP32 — the Neural Engine is FP16', { small: true, opacity: 0 });
    S.add(host, counter, foot);

    /* ---- steps ---- */
    tl.step('The exported graph is a list of operators. On a phone there are three places each one can run.');
    tl.to([strip, stripLbl], { opacity: 1, duration: 0.3 });
    tl.to(nodes.map(function (n) { return n.g; }), { opacity: 1, duration: 0.35, stagger: 0.04 });
    tl.to([laneEls.ane, laneEls.gpu, laneEls.cpu], { opacity: 0.55, duration: 0.4 }, '-=0.2');

    tl.step('You do not choose per operator. You hand the runtime a priority list, and it asks each backend which nodes it is able to take.');
    tl.to([laneEls.ane, laneEls.gpu, laneEls.cpu], { opacity: 1, duration: 0.35, stagger: 0.12 });

    tl.step('Most of the graph lands on the <b>Neural Engine</b>. It is FP16-oriented and it wants four-dimensional tensors shaped <span class="kw">(B, C, 1, S)</span>.');
    [1, 2, 3, 4, 6, 7, 8].forEach(function (idx, j) {
      tl.to(nodes[idx].g, { y: nodes[idx].dy, duration: 0.55, ease: 'power2.inOut' }, j === 0 ? undefined : '<+=0.05');
    });
    tl.to([strip, stripLbl], { opacity: 0.15, duration: 0.4 }, '-=0.3');

    tl.step('One operator needs FP32. The Neural Engine refuses it, so it falls back to the CPU — and the graph splits.');
    tl.to(nodes[5].g, { y: nodes[5].dy, duration: 0.55, ease: 'power2.inOut' });
    tl.to(nodes[0].g, { y: nodes[0].dy, duration: 0.55, ease: 'power2.inOut' }, '<');
    tl.to([nodes[5].rect, nodes[0].rect], { stroke: S.role('loss'), duration: 0.35 });
    tl.to(foot, { opacity: 1, duration: 0.3 }, '<');

    tl.step('The last matrix multiply, against the whole vocabulary, goes to the GPU. Three chips are now in use.');
    tl.to(nodes[9].g, { y: nodes[9].dy, duration: 0.55, ease: 'power2.inOut' });

    tl.step('Every place the chain changes lane is a tensor copy. So "it runs on the Neural Engine" is a claim to verify with the partition report, not to assume.');
    tl.to(links.filter(function (l) { return !l.cross; }).map(function (l) { return l.line; }),
          { opacity: 0.5, duration: 0.3 });
    var crossLines = links.filter(function (l) { return l.cross; });
    tl.to(crossLines.map(function (l) { return l.line; }), { opacity: 1, duration: 0.3, stagger: 0.12 });
    tl.to(crossLines.map(function (l) { return l.label; }), { opacity: 1, duration: 0.3, stagger: 0.12 }, '-=0.4');
    tl.to(counter, { opacity: 1, duration: 0.3 });
    k.pulse(tl, counter, { scale: 1.15 });
  });

  /* ======================================================================
     Scene 3 — the cold-start waterfall
     ====================================================================== */

  Scene.register('dev-cold', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#dc-plot');

    var X0 = 200, PX = 620 / 2900;          // pixels per millisecond
    var COLD_Y = 90, WARM_Y = 160, BH = 34;

    var wMap = Math.max(6, 12 * PX);        // 12 ms is thinner than a hairline
    var wComp = 2400 * PX;                  // 513 px
    var wPre = 380 * PX;                    // 81 px
    var wCompWarm = Math.max(6, 40 * PX);

    /* axis */
    S.add(host, S.e('line', { x1: X0, y1: 214, x2: 830, y2: 214, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    [0, 1000, 2000].forEach(function (ms) {
      var x = X0 + ms * PX;
      S.add(host, S.e('line', { x1: x, y1: 214, x2: x, y2: 221, stroke: 'var(--line)', 'stroke-width': 1.5 }));
      S.add(host, txt(x, 236, ms === 0 ? '0' : (ms / 1000) + ' 000 ms', { anchor: 'middle', small: true }));
    });

    S.add(host, txt(190, COLD_Y + 22, 'cold start', { anchor: 'end', mono: true, size: 13, fill: 'var(--text)' }));
    S.add(host, txt(190, WARM_Y + 22, 'warm start', { anchor: 'end', mono: true, size: 13, fill: 'var(--text)' }));

    function seg(x, y, role) {
      var r = S.e('rect', { x: x, y: y, width: 0, height: BH, rx: 4, fill: S.role(role) });
      host.appendChild(r);
      return r;
    }

    var cMap = seg(X0, COLD_Y, 'frozen');
    var cComp = seg(X0 + wMap, COLD_Y, 'loss');
    var cPre = seg(X0 + wMap + wComp, COLD_Y, 'data');

    var wMapEl = seg(X0, WARM_Y, 'frozen');
    var wCompEl = seg(X0 + wMap, WARM_Y, 'loss');
    var wPreEl = seg(X0 + wMap + wCompWarm, WARM_Y, 'data');

    var coldTot = S.e('text', {
      x: X0 + wMap + wComp + wPre + 12, y: COLD_Y + 22, class: 'dg-mono', 'font-size': 15,
      fill: S.role('loss'), opacity: 0
    }, '0 ms');
    var warmTot = S.e('text', {
      x: X0 + wMap + wCompWarm + wPre + 12, y: WARM_Y + 22, class: 'dg-mono', 'font-size': 15,
      fill: S.role('ok'), opacity: 0
    }, '432 ms');
    var mapTag = txt(X0 + 2, 80, '12 ms', { mono: true, size: 11.5, fill: 'var(--text-dim)', opacity: 0 });
    S.add(host, coldTot, warmTot, mapTag);

    /* legend */
    var legend = S.g({ opacity: 0 });
    [['frozen', 'open + mmap', 200], ['loss', 'backend compile', 380], ['data', 'first prefill', 600]]
      .forEach(function (item) {
        S.add(legend, S.e('rect', { x: item[2], y: 258, width: 12, height: 12, rx: 3, fill: S.role(item[0]) }));
        S.add(legend, txt(item[2] + 18, 268, item[1], { small: true }));
      });
    host.appendChild(legend);

    /* ---- steps ---- */
    tl.step('Start-up is not one number. It is three costs with three different fixes.');
    tl.to(legend, { opacity: 1, duration: 0.35 });

    tl.step('Open the file and map it into memory. Twelve milliseconds. Nothing is copied — pages arrive from storage when a weight is first touched.');
    tl.to(cMap, { attr: { width: wMap }, duration: 0.3 });
    tl.to(mapTag, { opacity: 1, duration: 0.3 }, '<');
    tl.to(coldTot, { opacity: 1, duration: 0.2 }, '<');
    k.count(tl, coldTot, 0, 12, { duration: 0.3, position: '<', format: fmtMs });

    tl.step('Then compile the model for this exact device: an <span class="kw">.mlmodelc</span> on Apple, GPU shaders in a browser. Seconds, not milliseconds.');
    tl.to(cComp, { attr: { width: wComp }, duration: 1.4, ease: 'power1.inOut' });
    k.count(tl, coldTot, 12, 2412, { duration: 1.4, position: '<', format: fmtMs });

    tl.step('Then prefill: run the prompt through the model once. This is real work, and it grows with the length of the prompt.');
    tl.to(cPre, { attr: { width: wPre }, duration: 0.5 });
    k.count(tl, coldTot, 2412, 2792, { duration: 0.5, position: '<', format: fmtMs });
    k.pulse(tl, cComp, { scale: 1.02 });

    tl.step('Now write the compiled artifact to disk and reuse it. The red block collapses, and launch is dominated by prefill.');
    tl.to(wMapEl, { attr: { width: wMap }, duration: 0.2 });
    tl.to(wCompEl, { attr: { width: wCompWarm }, duration: 0.35 });
    tl.to(wPreEl, { attr: { width: wPre }, duration: 0.5 });
    tl.to(warmTot, { opacity: 1, duration: 0.3 }, '-=0.2');
    k.dim(tl, [cComp], { to: 0.4, position: '<' });

    tl.step('Measure this after a reboot. On a warm page cache you will report a number that no first-time user ever sees.');
    k.pulse(tl, warmTot, { scale: 1.25 });
    tl.to(cMap, { opacity: 0.35, duration: 0.4 });
    tl.to(cPre, { opacity: 0.35, duration: 0.4 }, '<');
    tl.to(coldTot, { opacity: 0.35, duration: 0.4 }, '<');

    function fmtMs(v) {
      var n = Math.round(v);
      return (n >= 1000 ? String(n).replace(/(\d)(\d{3})$/, '$1 $2') : String(n)) + ' ms';
    }
  });

  /* ======================================================================
     Scene 4 — the browser: first visit pays, second visit does not
     ====================================================================== */

  Scene.register('dev-cache', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#dw-plot');

    /* browser window */
    var win = S.g({ opacity: 0 });
    S.add(win, rect(60, 60, 250, 140, { rx: 12, fill: 'var(--surface-2)' }));
    S.add(win, rect(60, 60, 250, 26, { rx: 12, fill: 'var(--surface-3)', noStroke: true }));
    [78, 94, 110].forEach(function (cx) {
      S.add(win, S.e('circle', { cx: cx, cy: 73, r: 4, fill: 'var(--line)' }));
    });
    S.add(win, rect(70, 96, 230, 94, { rx: 8, fill: 'var(--bg)' }));
    S.add(win, S.e('text', {
      x: 185, y: 148, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13,
      fill: 'var(--text-dim)'
    }, 'your page'));
    host.appendChild(win);

    /* the host of the weights */
    var cdn = S.box(640, 60, 210, 80, { title: 'model host', sub: 'model.onnx', role: 'param' });
    host.appendChild(cdn);

    var wire = S.arrow(636, 100, 316, 100, { role: 'data', sw: 2 });
    host.appendChild(wire);

    /* progress */
    var meter = S.meter(360, 152, 260, 18, { value: 0, role: 'data' });
    meter.setAttribute('opacity', '0');
    host.appendChild(meter);
    var meterTxt = S.e('text', {
      x: 490, y: 144, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13,
      fill: S.role('data'), opacity: 0
    }, '0 / 200 MB');
    var shaderNote = txt(490, 190, 'shaders still compile unless the browser cached them',
      { anchor: 'middle', small: true, role: 'param', opacity: 0 });
    S.add(host, meterTxt, shaderNote);

    /* cache storage */
    var cache = S.g({ opacity: 0 });
    var cacheRect = rect(60, 232, 250, 58, { rx: 10, dashed: true });
    S.add(cache, cacheRect);
    S.add(cache, S.e('text', {
      x: 185, y: 256, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13, fill: 'var(--text)'
    }, 'Cache Storage'));
    var cacheSub = S.e('text', {
      x: 185, y: 276, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12,
      fill: 'var(--text-dim)'
    }, 'empty');
    S.add(cache, cacheSub);
    host.appendChild(cache);

    var upArrow = S.arrow(185, 228, 185, 206, { role: 'param', sw: 2 });
    host.appendChild(upArrow);
    var evictNote = txt(185, 304, 'the browser may empty this', { anchor: 'middle', small: true, role: 'loss', opacity: 0 });
    host.appendChild(evictNote);

    /* readout */
    var panel = S.g({ opacity: 0 });
    S.add(panel, rect(600, 196, 260, 96, { rx: 12 }));
    S.add(panel, txt(616, 220, 'bytes over the network', { small: true }));
    S.add(panel, S.e('text', { x: 616, y: 250, class: 'dg-mono', 'font-size': 13, fill: 'var(--text-dim)' }, 'first visit'));
    var v1 = S.e('text', { x: 844, y: 250, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 15, fill: S.role('loss') }, '—');
    S.add(panel, v1);
    S.add(panel, S.e('text', { x: 616, y: 276, class: 'dg-mono', 'font-size': 13, fill: 'var(--text-dim)' }, 'second visit'));
    var v2 = S.e('text', { x: 844, y: 276, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 15, fill: S.role('ok') }, '—');
    S.add(panel, v2);
    host.appendChild(panel);

    /* ---- steps ---- */
    tl.step('A browser tab has no bundle. On the first visit the weights arrive over the network.');
    tl.to([win, cdn], { opacity: 1, duration: 0.4, stagger: 0.12 });
    tl.to(wire, { opacity: 1, duration: 0.3 });

    tl.step('Two hundred megabytes at four bits, for a 360-million-parameter model. On a slow connection this is a long wait, and the page has to say so.');
    tl.to([meter, meterTxt, panel], { opacity: 1, duration: 0.3 });
    tl.to(meter.fill, { attr: { width: 260 }, duration: 1.6, ease: 'none' });
    k.count(tl, meterTxt, 0, 200, {
      duration: 1.6, position: '<', ease: 'none',
      format: function (v) { return Math.round(v) + ' / 200 MB'; }
    });
    tl.call(function () { v1.textContent = '200 MB'; });

    tl.step('The files land in <b>Cache Storage</b>, keyed by URL. That happens once per origin, not once per visit.');
    tl.to(cache, { opacity: 1, duration: 0.35 });
    tl.to(cacheRect, { stroke: S.role('param'), fill: S.tintOf('param'), strokeDasharray: '0', duration: 0.5 });
    tl.call(function () { cacheSub.textContent = 'model.onnx · 200 MB'; });

    tl.step('Second visit: the same URLs resolve from disk. Zero bytes travel over the network.');
    k.dim(tl, [cdn, wire, meter, meterTxt], { to: 0.2 });
    tl.to(upArrow, { opacity: 1, duration: 0.35 });
    tl.call(function () { v2.textContent = '0 MB'; });
    k.pulse(tl, v2, { scale: 1.3 });

    tl.step('The browser can still evict that cache when storage runs low. A cache miss is a normal state, not an error.');
    tl.to(evictNote, { opacity: 1, duration: 0.3 });
    tl.to(cache, { opacity: 0.25, duration: 0.5 });
    tl.to(cache, { opacity: 1, duration: 0.4 });

    tl.step('And the compile step from the previous figure still happens. Your code caches the weights; the compiled shaders are the browser\'s business — so measure the second visit, do not assume it.');
    tl.to(shaderNote, { opacity: 1, duration: 0.35 });
    k.pulse(tl, panel, { scale: 1.03 });
  });

  /* ======================================================================
     Scene 5 — WebGPU against WebAssembly, on the same matrix multiply
     ====================================================================== */

  Scene.register('dev-gpu', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#dg-plot');

    var EMPTY = 'var(--surface-2)';

    var titleL = txt(70, 46, 'WebAssembly · CPU', { mono: true, size: 13, fill: 'var(--text)', opacity: 0 });
    var titleR = txt(520, 46, 'WebGPU · GPU', { mono: true, size: 13, fill: 'var(--text)', opacity: 0 });
    var mid = txt(395, 62, 'the same output tile', { anchor: 'middle', small: true, opacity: 0 });
    S.add(host, titleL, titleR, mid);

    var gridL = S.matrix(70, 70, 8, 8, { cell: 22, gap: 3, fill: EMPTY });
    var gridR = S.matrix(520, 70, 8, 8, { cell: 22, gap: 3, fill: EMPTY });
    gridL.setAttribute('opacity', '0');
    gridR.setAttribute('opacity', '0');
    S.add(host, gridL, gridR);

    var threads = [0, 1, 2, 3].map(function (i) {
      var p = S.pill(70 + i * 50, 284, 42, 22, 't' + (i + 1), { role: 'data' });
      host.appendChild(p);
      return p;
    });
    var gpuNote = txt(520, 300, 'one dispatch, thousands of invocations',
      { small: true, role: 'data', opacity: 0 });
    host.appendChild(gpuNote);

    /* the failure box */
    var fail = S.g({ opacity: 0 });
    S.add(fail, rect(300, 104, 190, 130, { rx: 12, role: 'loss' }));
    [['no COOP / COEP', 132, 'var(--text)'],
     ['no SharedArrayBuffer', 156, 'var(--text-dim)'],
     ['1 thread', 182, 'var(--text)']].forEach(function (r) {
      S.add(fail, S.e('text', {
        x: 395, y: r[1], 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12, fill: r[2]
      }, r[0]));
    });
    S.add(fail, S.e('text', {
      x: 395, y: 212, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 16, fill: S.role('loss')
    }, '4–8× slower'));
    host.appendChild(fail);

    function rowCells(grid, r) { return grid.cells[r]; }

    /* ---- steps ---- */
    tl.step('Both paths compute exactly the same thing: one tile of the output matrix. Only the number of workers differs.');
    tl.to([gridL, gridR, titleL, titleR, mid], { opacity: 1, duration: 0.4, stagger: 0.06 });

    tl.step('WebAssembly runs the arithmetic on the CPU, with SIMD — one instruction, several numbers at once. With four worker threads, four rows advance at a time.');
    tl.to(threads, { opacity: 1, duration: 0.3, stagger: 0.06 });
    [[0, 1, 2, 3], [4, 5, 6, 7]].forEach(function (wave) {
      wave.forEach(function (rowIndex, j) {
        tl.to(rowCells(gridL, rowIndex),
              { fill: S.role('data'), duration: 0.5, stagger: 0.03 },
              j === 0 ? undefined : '<');
      });
    });

    tl.step('Threads need <span class="kw">SharedArrayBuffer</span>, which needs a cross-origin-isolated page, which needs two response headers. Without them you silently get one thread.');
    tl.set(gridL.flat, { fill: EMPTY });
    tl.to(fail, { opacity: 1, duration: 0.35 });
    tl.to(threads.slice(1), { opacity: 0.2, duration: 0.35 }, '<');
    for (var r = 0; r < 8; r++) {
      tl.to(rowCells(gridL, r), { fill: S.role('loss'), duration: 0.3, stagger: 0.02 });
    }

    tl.step('WebGPU sends the same work to the GPU as a single dispatch of many parallel invocations. This is why in-browser transformers became practical at all.');
    tl.to(gpuNote, { opacity: 1, duration: 0.3 });
    tl.to(gridR.flat, { fill: S.role('data'), duration: 0.35, stagger: { each: 0.004, from: 'random' } });
    k.pulse(tl, gridR, { scale: 1.03 });

    tl.step('WebGPU has been Baseline since January 2026 — Chrome, Edge, Firefox 141 and Safari 26. Keep WebAssembly as the fallback, not as the plan.');
    k.dim(tl, [fail, gridL], { to: 0.3 });
    tl.to(gridR.flat, { fill: S.role('ok'), duration: 0.4, stagger: 0.004 });
    k.pulse(tl, titleR, { scale: 1.15 });
  });

  /* ======================================================================
     Scene 6 — the memory budget, and what the OS can and cannot reclaim
     ====================================================================== */

  Scene.register('dev-mem', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#dm-plot');

    var BASE = 280, GB = 71.9, CX = 180, CW = 120;
    function yOf(gb) { return BASE - gb * GB; }

    /* danger band, drawn first so everything sits on top of it */
    S.add(host, S.e('rect', {
      x: 150, y: yOf(3), width: 170, height: GB, fill: S.role('loss'), opacity: 0.14
    }));
    [2, 3].forEach(function (g) {
      S.add(host, S.e('line', {
        x1: 150, y1: yOf(g), x2: 790, y2: yOf(g), stroke: S.role('loss'),
        'stroke-width': 1.5, 'stroke-dasharray': '5 5', opacity: 0.7
      }));
      S.add(host, txt(798, yOf(g) + 5, g + ' GB', { mono: true, size: 12.5, role: 'loss' }));
    });
    S.add(host, S.e('line', { x1: 150, y1: BASE, x2: 320, y2: BASE, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    S.add(host, txt(144, BASE + 5, '0', { anchor: 'end', small: true }));
    S.add(host, txt(150, 46, 'what one foreground app may safely hold on a 6 GB phone', { small: true }));
    S.add(host, txt(798, yOf(2.5) + 5, 'kill zone', { mono: true, size: 12.5, role: 'loss' }));

    /* segments */
    var appH = 0.25 * GB;
    var wH = 1.83 * GB;
    var segApp = S.e('rect', {
      x: CX, y: BASE - appH, width: CW, height: appH, rx: 4,
      fill: S.tintOf('data'), stroke: S.role('data'), 'stroke-width': 1.4, opacity: 0
    });
    var segW = S.e('rect', {
      x: CX, y: BASE - appH - wH, width: CW, height: wH, rx: 4,
      fill: S.tintOf('param'), stroke: S.role('param'), 'stroke-width': 1.4, opacity: 0
    });
    var kvTop = BASE - appH - wH;
    var segKV = S.e('rect', {
      x: CX, y: kvTop, width: CW, height: 0, rx: 4,
      fill: S.tintOf('grad'), stroke: S.role('grad'), 'stroke-width': 1.4, opacity: 0
    });
    S.add(host, segApp, segW, segKV);

    function lead(y, text, roleName) {
      var g = S.g({ opacity: 0 });
      S.add(g, S.e('line', { x1: CX + CW + 2, y1: y - 4, x2: 334, y2: y - 4, stroke: 'var(--line)', 'stroke-width': 1.2 }));
      S.add(g, S.e('text', { x: 340, y: y, class: 'dg-mono', 'font-size': 12.5, fill: S.role(roleName) }, text));
      host.appendChild(g);
      return g;
    }

    var lApp = lead(272, 'your UI and buffers — dirty', 'data');
    var lW = lead(200, 'weights, mmap-ed from the file — clean', 'param');
    var lKV = lead(110, 'KV cache — dirty, grows with every token', 'grad');

    /* outcome banners */
    function banner(roleName, a, b) {
      var g = S.g({ opacity: 0 });
      S.add(g, rect(560, 236, 290, 58, { rx: 12, role: roleName }));
      S.add(g, S.e('text', { x: 705, y: 262, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13, fill: S.role(roleName) }, a));
      S.add(g, S.e('text', { x: 705, y: 282, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, b));
      host.appendChild(g);
      return g;
    }
    var killed = banner('loss', 'the OS terminates your app', 'no swap, no warning');
    var saved = banner('ok', 'context capped — the app survives', 'and the weights stay mapped');

    /* ---- steps ---- */
    tl.step('A phone does not give your app all of its memory. On a 6 GB device a foreground app can safely hold roughly 2 to 3 GB.');

    tl.step('Your own code is a small part of it. The weights are the block: a 3-billion-parameter model at 4 bits is 1.83 GB.');
    tl.to(segApp, { opacity: 1, duration: 0.3 });
    tl.to(lApp, { opacity: 1, duration: 0.3 }, '<');
    tl.to(segW, { opacity: 1, duration: 0.5 });
    tl.to(lW, { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('Those weights are <b>clean</b> pages, mapped from the file. Under pressure the system drops them and reads them again. That costs latency, not your process.');
    k.pulse(tl, segW, { scale: 1.04 });
    tl.to(segW, { opacity: 0.2, duration: 0.5 });
    tl.to(segW, { opacity: 1, duration: 0.5 });

    tl.step('The KV cache is the opposite. It is <b>dirty</b> memory that exists nowhere else, and it grows with every token you generate.');
    tl.to(segKV, { opacity: 1, duration: 0.25 });
    tl.to(lKV, { opacity: 1, duration: 0.3 }, '<');
    tl.to(segKV, { attr: { y: kvTop - 0.45 * GB, height: 0.45 * GB }, duration: 0.9, ease: 'power1.inOut' });

    tl.step('Cross the budget and iOS does not swap. It terminates the app, and the user watches it restart from nothing.');
    tl.to(segKV, { attr: { y: kvTop - 0.97 * GB, height: 0.97 * GB }, duration: 1.0, ease: 'power1.in' });
    tl.to(killed, { opacity: 1, duration: 0.35 });
    tl.to([segApp, segW, segKV], { opacity: 0.25, duration: 0.4 });

    tl.step('So maximum context length is a memory setting, not a product setting. Cap it, and release the cache when the app goes to the background.');
    tl.to([segApp, segW], { opacity: 1, duration: 0.35 });
    tl.to(killed, { opacity: 0, duration: 0.3 }, '<');
    tl.to(segKV, { opacity: 1, attr: { y: kvTop - 0.4 * GB, height: 0.4 * GB }, duration: 0.7, ease: 'power2.out' });
    tl.to(saved, { opacity: 1, duration: 0.35 });
  });

  /* ======================================================================
     Scene 7 — 200 MB of your own weights, against zero bytes from the OS
     ====================================================================== */

  Scene.register('dev-os', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#do-plot');

    var BW = 360, BY = 66, BH = 34;

    function column(x, title, sub) {
      var g = S.g({ opacity: 0 });
      S.add(g, txt(x, 46, title, { mono: true, size: 13, fill: 'var(--text)' }));
      S.add(g, rect(x, BY, BW, BH, { rx: 8, fill: 'var(--surface-3)', noStroke: true }));
      S.add(g, txt(x, 124, sub, { small: true }));
      host.appendChild(g);
      return g;
    }

    var colA = column(70, 'ship your own model', 'SmolLM2-360M at 4 bits');
    var colB = column(470, 'use the system model', 'Foundation Models · Gemini Nano');

    var fillA = S.e('rect', { x: 70, y: BY, width: 0, height: BH, rx: 8, fill: S.role('loss') });
    var fillB = S.e('rect', { x: 470, y: BY, width: 0, height: BH, rx: 8, fill: S.role('ok') });
    S.add(host, fillA, fillB);

    var readA = S.e('text', {
      x: 430, y: 124, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 15,
      fill: S.role('loss'), opacity: 0
    }, '0 MB');
    var readB = S.e('text', {
      x: 830, y: 124, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 15,
      fill: S.role('ok'), opacity: 0
    }, '0 MB');
    var noteA = txt(70, 148, 'about 160 seconds on a 10 Mbit/s connection',
      { small: true, role: 'loss', opacity: 0 });
    var noteB = txt(470, 148, 'already on the device — nothing to download',
      { small: true, role: 'ok', opacity: 0 });
    S.add(host, readA, readB, noteA, noteB);

    /* the four reasons to pay the 200 MB anyway */
    var head = txt(70, 190, 'you ship your own anyway when you need:', { small: true, opacity: 0 });
    host.appendChild(head);

    var reasons = [
      [70, 206, '1 · a specific fine-tune'],
      [470, 206, '2 · a modality the platform skips'],
      [70, 254, '3 · old devices with no system model'],
      [470, 254, '4 · one behaviour on every platform']
    ].map(function (r) {
      var g = S.g({ opacity: 0 });
      S.add(g, rect(r[0], r[1], 360, 38, { rx: 8, role: 'param' }));
      S.add(g, S.e('text', {
        x: r[0] + 16, y: r[1] + 24, class: 'dg-mono', 'font-size': 12.5, fill: 'var(--text)'
      }, r[2]));
      host.appendChild(g);
      return g;
    });

    /* ---- steps ---- */
    tl.step('Two download bars for the same feature. On the left you ship the weights yourself. On the right the operating system already has a model.');
    tl.to([colA, colB], { opacity: 1, duration: 0.4, stagger: 0.12 });

    tl.step('Your own model is 200 MB, and every new user pays it before the app does anything.');
    tl.to(readA, { opacity: 1, duration: 0.25 });
    tl.to(fillA, { attr: { width: BW }, duration: 1.1, ease: 'none' });
    k.count(tl, readA, 0, 200, {
      duration: 1.1, position: '<', ease: 'none',
      format: function (v) { return Math.round(v) + ' MB'; }
    });

    tl.step('On a 10 Mbit/s mobile connection that bar is about 160 seconds of waiting.');
    tl.to(noteA, { opacity: 1, duration: 0.35 });
    k.pulse(tl, noteA, { scale: 1.06 });

    tl.step('The system model costs zero bytes. It is shared by every app on the phone, so there is nothing to download and nothing to cache.');
    tl.to([readB, noteB], { opacity: 1, duration: 0.35 });
    k.pulse(tl, colB, { scale: 1.03 });
    k.dim(tl, [colA, fillA, readA, noteA], { to: 0.3 });

    tl.step('So the default is the right-hand bar. You pay for the left one only when you need one of these four things.');
    tl.to(head, { opacity: 1, duration: 0.3 });
    tl.to(reasons, { opacity: 1, duration: 0.35, stagger: 0.14 });

    tl.step('When one of them is true, the 200 MB is worth paying — and the rest of this lesson is how to spend it well.');
    tl.to([colA, fillA, readA, noteA], { opacity: 1, duration: 0.4 });
    k.pulse(tl, fillA, { scale: 1.02 });
  });

})();
