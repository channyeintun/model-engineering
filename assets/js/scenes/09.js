/* =========================================================================
   Lesson 09 — Export: leaving PyTorch.

   Six scenes:
     ex-capture    eager Python on the left, the captured graph on the right,
                   with the control flow that did not survive struck out in red
     ex-fanout     one ExportedProgram -> .pte / .onnx / .mlpackage,
                   and GGUF on a separate grey path from the checkpoint
     ex-dynamic    a fixed-shape export rejecting a longer input, then the
                   dimension declared dynamic and the same input accepted
     ex-partition  a backend claiming two islands, two nodes falling back to
                   CPU, and the four boundary copies that costs
     ex-kv         the KV cache passed in and out, versus held as state
     ex-verify     the same input through both paths, and the maximum absolute
                   difference against a tolerance line

   Colour convention (do not change): data = cyan, param = amber,
   grad = magenta, loss = red, ok = green, frozen = grey.
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;
  var e = S.e, add = S.add;

  var LINE   = 'var(--line)';
  var DIM    = 'var(--text-dim)';
  var TEXT   = 'var(--text)';
  var DATA   = 'var(--c-data)';
  var PARAM  = 'var(--c-param)';
  var LOSS   = 'var(--c-loss)';
  var OK     = 'var(--c-ok)';
  var FROZEN = 'var(--c-frozen)';
  var SURF   = 'var(--surface-2)';

  function panel(x, y, w, h, o) {
    o = o || {};
    return e('rect', {
      x: x, y: y, width: w, height: h, rx: o.rx != null ? o.rx : 12,
      fill: o.fill || SURF, stroke: o.stroke || LINE,
      'stroke-width': o.sw || 1.5,
      'stroke-dasharray': o.dashed ? '6 5' : null,
      opacity: o.opacity != null ? o.opacity : 1
    });
  }

  function txt(x, y, s, o) {
    o = o || {};
    return e('text', {
      x: x, y: y, 'text-anchor': o.anchor || 'start',
      class: o.mono ? 'dg-mono' : (o.small ? 'dg-label dg-label--sm' : 'dg-label'),
      'font-size': o.size || null, fill: o.fill || null,
      opacity: o.opacity != null ? o.opacity : null
    }, s);
  }

  /* ======================================================================
     Scene 1 — capture: what survives, what does not
     viewBox 900 x 340
     ====================================================================== */

  Scene.register('ex-capture', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#exc-plot');

    /* ---- left: the Python source -------------------------------------- */

    add(host, txt(30, 34, 'eager Python', { small: true }));
    add(host, panel(30, 44, 390, 272));

    var CODE = [
      'def forward(self, x, n):',
      '    x = self.norm(x)',
      '    if x.sum() > 0:',
      '        x = self.up(x)',
      '    else:',
      '        x = self.down(x)',
      '    for i in range(n):    # n = 3',
      '        x = self.blk(x)',
      '    return x'
    ];

    var lines = [];
    CODE.forEach(function (src, i) {
      var y = 76 + i * 26;
      var t = e('text', {
        x: 46, y: y, class: 'dg-mono', 'font-size': 13, fill: TEXT, opacity: 0
      }, src);
      add(host, t);
      lines.push({ el: t, y: y });
    });

    /* strike-through bars for the lines that vanish */
    function strike(i, w) {
      return e('line', {
        x1: 46, y1: lines[i].y - 4, x2: 46 + w, y2: lines[i].y - 4,
        stroke: LOSS, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0
      });
    }
    var sIf   = strike(2, 152);
    var sElse = strike(4, 82);
    var sDown = strike(5, 184);
    add(host, sIf, sElse, sDown);

    var noteGone = txt(408, lines[3].y - 2, 'branch decided once',
                       { anchor: 'end', small: true, fill: LOSS, opacity: 0 });
    var noteLoop = txt(408, lines[7].y - 2, 'unrolled 3 times',
                       { anchor: 'end', small: true, fill: PARAM, opacity: 0 });
    add(host, noteGone, noteLoop);

    /* ---- right: the captured graph ------------------------------------ */

    add(host, txt(452, 34, 'captured graph', { small: true }));

    var NAMES = ['norm', 'up', 'blk', 'blk', 'blk'];
    var nodes = [], edges = [];
    NAMES.forEach(function (name, i) {
      var x = 458 + i * 85;
      var g = S.g({ opacity: 0 });
      add(g, e('rect', { x: x, y: 76, width: 64, height: 44, rx: 9,
                         fill: 'var(--c-data-dim)', stroke: DATA, 'stroke-width': 1.6 }));
      add(g, e('text', { x: x + 32, y: 103, 'text-anchor': 'middle',
                         class: 'dg-mono', 'font-size': 12.5, fill: DATA }, name));
      add(host, g);
      nodes.push(g);
      if (i > 0) {
        var a = S.arrow(x - 21, 98, x - 3, 98, { role: 'data' });
        add(host, a);
        edges.push(a);
      }
    });

    /* the ExportedProgram summary */
    var summary = S.g({ opacity: 0 });
    add(summary, panel(452, 150, 418, 112));
    add(summary, txt(661, 176, 'ExportedProgram', { anchor: 'middle', size: 14, fill: TEXT }));
    add(summary, S.pill(468,  194, 94, 32, 'graph',      { role: 'data',  opacity: 1, size: 11 }));
    add(summary, S.pill(570,  194, 94, 32, 'state_dict', { role: 'param', opacity: 1, size: 11 }));
    add(summary, S.pill(672,  194, 94, 32, 'signature',  { role: 'ok',    opacity: 1, size: 11 }));
    add(summary, S.pill(774,  194, 82, 32, 'shapes',     { role: 'ok',    opacity: 1, size: 11 }));
    add(host, summary);

    var foot = txt(452, 288, 'flat graph · weights apart · who owns each input · which dims may vary',
                   { small: true, opacity: 0 });
    add(host, foot);

    /* ---- steps -------------------------------------------------------- */

    tl.step('On the left is ordinary Python. It has a branch that depends on the data, and a loop whose length is an argument.');
    k.appear(tl, lines.map(function (l) { return l.el; }), { stagger: 0.05, y: 4 });

    tl.step('<span class="kw">torch.export</span> runs the model <b>once</b> with your example inputs and writes down every tensor operation. It does not write down the Python.');
    tl.to(nodes[0], { opacity: 1, duration: 0.35 });

    tl.step('The branch was decided by that one input. The path not taken is not in the graph, and nothing will remind you later.');
    tl.to([sIf, sElse, sDown], { opacity: 1, duration: 0.4, stagger: 0.1 });
    tl.to(noteGone, { opacity: 1, duration: 0.3 });
    tl.to(edges[0], { opacity: 1, duration: 0.25 });
    tl.to(nodes[1], { opacity: 1, duration: 0.3 }, '-=0.1');

    tl.step('The loop is unrolled. <b>n was 3</b> at capture time, so the graph holds three blocks for ever — calling it with n = 5 changes nothing.');
    tl.to(noteLoop, { opacity: 1, duration: 0.3 });
    tl.to([edges[1], nodes[2]], { opacity: 1, duration: 0.3 });
    tl.to([edges[2], nodes[3]], { opacity: 1, duration: 0.3 });
    tl.to([edges[3], nodes[4]], { opacity: 1, duration: 0.3 });

    tl.step('What survives is a flat list of <b>ATen operators</b> — the small fixed vocabulary every backend agrees on.');
    k.pulse(tl, nodes, { scale: 1.08, stagger: 0.05 });

    tl.step('Add the weights kept separate, a signature saying which inputs are parameters and which the caller passes, and a record of which dimensions may vary. Those four parts together are the <b>ExportedProgram</b>.');
    tl.to(summary, { opacity: 1, duration: 0.45 });
    tl.to(foot, { opacity: 1, duration: 0.3 }, '-=0.1');
  });

  /* ======================================================================
     Scene 2 — the fan-out to four formats
     viewBox 900 x 330
     ====================================================================== */

  Scene.register('ex-fanout', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#exf-plot');

    /* ---- the two sources ---------------------------------------------- */

    var srcA = S.g({ opacity: 0 });
    add(srcA, panel(26, 76, 168, 76));
    add(srcA, txt(110, 106, 'ExportedProgram', { anchor: 'middle', size: 13.5, fill: TEXT }));
    add(srcA, txt(110, 132, '.pt2', { anchor: 'middle', mono: true, size: 13, fill: DATA }));
    add(host, srcA);

    var srcB = S.g({ opacity: 0 });
    add(srcB, panel(26, 228, 168, 70, { dashed: true, stroke: FROZEN }));
    add(srcB, txt(110, 256, 'HF checkpoint', { anchor: 'middle', size: 13.5, fill: TEXT }));
    add(srcB, txt(110, 280, 'safetensors', { anchor: 'middle', mono: true, size: 12.5, fill: FROZEN }));
    add(host, srcB);

    /* ---- four rows ----------------------------------------------------- */

    var ROWS = [
      { c: 50,  title: 'ExecuTorch lowering', sub: 'partition · lower', file: '.pte',
        t1: 'ExecuTorch runtime', t2: 'iOS · Android · desktop · MCU', role: 'data' },
      { c: 118, title: 'torch.onnx.export', sub: 'dynamo=True', file: '.onnx',
        t1: 'ONNX Runtime', t2: 'browser · server · phone', role: 'data' },
      { c: 186, title: 'coremltools.convert', sub: 'iOS 26 target', file: '.mlpackage',
        t1: 'Core ML', t2: 'iPhone · Mac · Neural Engine', role: 'data' },
      { c: 262, title: 'llama.cpp converter', sub: 'reads safetensors', file: '.gguf',
        t1: 'llama.cpp', t2: 'laptop CLI · server · desktop', role: 'frozen' }
    ];

    var rowEls = ROWS.map(function (r, i) {
      var g = S.g({ opacity: 0 });
      var y = r.c - 29;
      add(g, panel(250, y, 224, 58, { stroke: r.role === 'frozen' ? FROZEN : LINE }));
      add(g, txt(362, y + 26, r.title, { anchor: 'middle', size: 13, fill: TEXT }));
      add(g, txt(362, y + 46, r.sub, { anchor: 'middle', mono: true, size: 11.5,
                                       fill: r.role === 'frozen' ? FROZEN : DIM }));
      add(g, S.arrow(478, r.c, 496, r.c, { role: r.role, opacity: 1 }));
      add(g, S.pill(500, r.c - 17, 104, 34, r.file, { role: r.role, opacity: 1, size: 12.5 }));
      add(g, txt(624, r.c - 3, r.t1, { size: 13.5,
                                       fill: r.role === 'frozen' ? FROZEN : TEXT }));
      add(g, txt(624, r.c + 15, r.t2, { small: true }));
      add(host, g);

      /* feed line from the matching source */
      var from = i === 3 ? { x: 194, y: 263 } : { x: 194, y: 114 };
      var link = S.curve(from.x, from.y, 246, r.c,
                         { role: r.role, bow: 32, dashed: i === 3 });
      add(host, link);
      return { g: g, link: link };
    });

    var ggufNote = txt(250, 314, 'not a torch.export backend — its own converter, its own operator set',
                       { small: true, fill: LOSS, opacity: 0 });
    add(host, ggufNote);

    /* ---- steps -------------------------------------------------------- */

    tl.step('Capture happens once. What you do <b>after</b> capture decides the file, and the file decides which runtime can read it.');
    tl.to(srcA, { opacity: 1, duration: 0.4 });

    tl.step('<b>ExecuTorch</b> keeps you inside PyTorch. Partitioners hand subgraphs to backends, and the <span class="kw">.pte</span> flatbuffer is mapped straight from disk.');
    tl.to(rowEls[0].link, { opacity: 1, duration: 0.3 });
    tl.to(rowEls[0].g, { opacity: 1, duration: 0.4 }, '-=0.1');

    tl.step('<b>ONNX</b> rewrites the graph into a committee-defined operator set with a version number. One file, and a runtime that exists almost everywhere.');
    tl.to(rowEls[1].link, { opacity: 1, duration: 0.3 });
    tl.to(rowEls[1].g, { opacity: 1, duration: 0.4 }, '-=0.1');

    tl.step('<b>Core ML</b> targets Apple hardware. The <span class="kw">.mlpackage</span> is compiled on the device the first time it loads — that compilation is your cold start.');
    tl.to(rowEls[2].link, { opacity: 1, duration: 0.3 });
    tl.to(rowEls[2].g, { opacity: 1, duration: 0.4 }, '-=0.1');

    tl.step('<b>GGUF is not on this path.</b> It reads the checkpoint directly, packs the tokenizer inside the file, and only supports architectures llama.cpp has already implemented.');
    tl.to(srcB, { opacity: 1, duration: 0.35 });
    tl.to(rowEls[3].link, { opacity: 1, duration: 0.3 });
    tl.to(rowEls[3].g, { opacity: 1, duration: 0.4 }, '-=0.1');
    tl.to(ggufNote, { opacity: 1, duration: 0.3 });
    k.dim(tl, [srcA, rowEls[0].g, rowEls[1].g, rowEls[2].g], { to: 0.4, position: '<' });
  });

  /* ======================================================================
     Scene 3 — dynamic shapes
     viewBox 900 x 300
     ====================================================================== */

  Scene.register('ex-dynamic', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k, gsap = ctx.gsap;
    var host = q('#exd-plot');

    var PX = 1.1;   /* pixels per token */

    add(host, txt(60, 82, 'input  ids (1, T)', { small: true }));
    var bar = e('rect', { x: 60, y: 96, width: 128 * PX, height: 28, rx: 6,
                          fill: 'var(--c-data-dim)', stroke: DATA, 'stroke-width': 1.6, opacity: 0 });
    add(host, bar);
    var barTxt = e('text', { x: 60, y: 148, class: 'dg-mono',
                             'font-size': 13, fill: DATA, opacity: 0 }, 'T = 128');
    add(host, barTxt);

    var feed = S.arrow(300, 110, 334, 110, { role: 'data' });
    add(host, feed);

    /* the exported graph */
    var gbox = S.g({ opacity: 0 });
    add(gbox, panel(340, 86, 214, 118));
    add(gbox, txt(447, 118, 'exported graph', { anchor: 'middle', size: 13.5, fill: TEXT }));
    var shapeT = e('text', { x: 447, y: 150, 'text-anchor': 'middle', class: 'dg-mono',
                             'font-size': 15, fill: DATA }, 'ids: (1, 128)');
    add(gbox, shapeT);
    var guardT = e('text', { x: 447, y: 178, 'text-anchor': 'middle',
                             class: 'dg-label dg-label--sm', fill: DIM }, 'guard:  T == 128');
    add(gbox, guardT);
    add(host, gbox);

    /* the verdict */
    var vbox = S.g({ opacity: 0 });
    var vrect = panel(610, 100, 250, 90, { stroke: OK });
    add(vbox, vrect);
    var vTitle = e('text', { x: 735, y: 138, 'text-anchor': 'middle', class: 'dg-mono',
                             'font-size': 17, fill: OK }, 'runs');
    var vSub = e('text', { x: 735, y: 166, 'text-anchor': 'middle',
                           class: 'dg-label dg-label--sm', fill: DIM }, 'shape matches the guard');
    add(vbox, vTitle, vSub);
    add(host, vbox);

    /* the fix */
    var fix1 = e('text', { x: 60, y: 250, class: 'dg-mono', 'font-size': 13, fill: PARAM, opacity: 0 },
                 'dynamic_shapes={"ids": {1: Dim.DYNAMIC}}');
    var fix2 = e('text', { x: 60, y: 274, class: 'dg-mono', 'font-size': 12.5, fill: DIM, opacity: 0 },
                 'range_constraints:  s0 in [1, inf)');
    add(host, fix1, fix2);

    /* ---- steps -------------------------------------------------------- */

    tl.step('Export ran once, with a 128-token example. Every shape it observed became a <b>constant</b> in the graph.');
    tl.to([bar, barTxt], { opacity: 1, duration: 0.4 });
    tl.to(gbox, { opacity: 1, duration: 0.4 }, '-=0.2');
    tl.to(feed, { opacity: 1, duration: 0.25 }, '-=0.2');

    tl.step('Feed it 128 tokens again and it works. This is the test that gives false confidence.');
    tl.to(vbox, { opacity: 1, duration: 0.4 });
    k.pulse(tl, vTitle, { scale: 1.15 });

    tl.step('Now feed it <b>200</b>. The shape guard rejects the call. Nothing is wrong with the model — the graph was told this dimension is 128.');
    tl.to(bar, { attr: { width: 200 * PX }, duration: 0.5, ease: 'power2.inOut' });
    tl.call(function () { barTxt.textContent = 'T = 200'; }, null, '<');
    tl.to(vrect, { stroke: LOSS, duration: 0.3 });
    tl.to([vTitle, guardT], { fill: LOSS, duration: 0.3 }, '<');
    tl.call(function () {
      vTitle.textContent = 'refused';
      vSub.textContent = 'guard failed: 200 is not 128';
    }, null, '<');
    k.pulse(tl, vTitle, { scale: 1.2 });

    tl.step('Mark the dimension dynamic. Export now records a <b>symbol and a range</b> where the constant used to be.');
    tl.to([fix1, fix2], { opacity: 1, duration: 0.4, stagger: 0.12 });
    tl.call(function () {
      shapeT.textContent = 'ids: (1, s0)';
      guardT.textContent = 'guard:  s0 >= 1';
    });
    tl.to(guardT, { fill: OK, duration: 0.3 });
    tl.to(vrect, { stroke: OK, duration: 0.3 }, '<');
    tl.to(vTitle, { fill: OK, duration: 0.3 }, '<');
    tl.call(function () {
      vTitle.textContent = 'runs';
      vSub.textContent = '200, and 7, and 1000';
    }, null, '<');

    tl.step('Mark only the dimensions that really vary. Every symbol is one more thing the compiler is no longer allowed to assume.');
    k.pulse(tl, fix1, { scale: 1.06 });
    tl.to(fix2, { opacity: 0.5, duration: 0.3 }, '<');
  });

  /* ======================================================================
     Scene 4 — partial delegation
     viewBox 900 x 320
     ====================================================================== */

  Scene.register('ex-partition', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#exp-plot');

    var CY = 110, R = 19;
    var OPS = ['mm', 'add', 'norm', 'sort', 'mm', 'gelu', 'mm', 'mm', 'topk'];
    var CPU = [3, 8];

    /* islands drawn first, behind the nodes */
    var isl1 = e('rect', { x: 69, y: 77, width: 222, height: 66, rx: 16,
                           fill: 'var(--c-ok-dim)', stroke: OK, 'stroke-width': 1.8,
                           'stroke-dasharray': '7 5', opacity: 0 });
    var isl2 = e('rect', { x: 389, y: 77, width: 302, height: 66, rx: 16,
                           fill: 'var(--c-ok-dim)', stroke: OK, 'stroke-width': 1.8,
                           'stroke-dasharray': '7 5', opacity: 0 });
    add(host, isl1, isl2);

    var lbl1 = txt(180, 66, 'delegate call 1', { anchor: 'middle', small: true, fill: OK, opacity: 0 });
    var lbl2 = txt(540, 66, 'delegate call 2', { anchor: 'middle', small: true, fill: OK, opacity: 0 });
    add(host, lbl1, lbl2);

    /* the chain */
    add(host, S.arrow(46, CY, 81, CY, { role: 'data', opacity: 1 }));
    var nodes = [], rings = [];
    OPS.forEach(function (name, i) {
      var cx = 100 + i * 80;
      var g = S.g({ opacity: 0 });
      var c = e('circle', { cx: cx, cy: CY, r: R, fill: SURF, stroke: LINE, 'stroke-width': 1.8 });
      add(g, c);
      add(g, e('text', { x: cx, y: CY + 4, 'text-anchor': 'middle', class: 'dg-mono',
                         'font-size': 10.5, fill: TEXT }, name));
      add(host, g);
      nodes.push(g); rings.push(c);
      if (i < OPS.length - 1) {
        add(host, S.arrow(cx + R + 2, CY, cx + 80 - R - 2, CY, { role: 'data', opacity: 1, sw: 1.4 }));
      }
    });
    add(host, S.arrow(759, CY, 800, CY, { role: 'data', opacity: 1 }));

    var cpuLbl = S.g({ opacity: 0 });
    add(cpuLbl, txt(340, 162, 'CPU kernel', { anchor: 'middle', small: true, fill: FROZEN }));
    add(cpuLbl, txt(740, 162, 'CPU kernel', { anchor: 'middle', small: true, fill: FROZEN }));
    add(host, cpuLbl);

    /* boundary copies: diamonds sitting on the chain */
    var COPY_X = [64, 300, 380, 700];
    var copies = COPY_X.map(function (x) {
      var d = e('path', { d: 'M0,-7 L7,0 L0,7 L-7,0 Z', fill: LOSS,
                          transform: 'translate(' + x + ',' + CY + ')', opacity: 0 });
      add(host, d);
      return d;
    });

    /* readout */
    var read = S.g({ opacity: 0 });
    add(read, panel(100, 210, 700, 88));
    add(read, txt(130, 242, 'boundary crossings', { small: true }));
    var crossT = e('text', { x: 130, y: 276, class: 'dg-mono', 'font-size': 24, fill: LOSS }, '0');
    add(read, crossT);
    add(read, txt(350, 242, 'operators on the accelerator', { small: true }));
    var opsT = e('text', { x: 350, y: 276, class: 'dg-mono', 'font-size': 24, fill: OK }, '7 of 9');
    add(read, opsT);
    add(read, txt(560, 240, 'Each crossing copies a tensor between', { small: true }));
    add(read, txt(560, 258, 'accelerator memory and CPU memory.', { small: true }));
    add(read, txt(560, 276, 'More islands is not more speed.', { small: true, fill: LOSS }));
    add(host, read);

    /* ---- steps -------------------------------------------------------- */

    tl.step('After capture the graph is a list of ATen operators. Nothing here knows about hardware yet.');
    k.appear(tl, nodes, { stagger: 0.05, y: 6 });

    tl.step('The partitioner walks the graph and asks the backend, node by node: <b>can you run this one?</b>');
    tl.to(rings.filter(function (_, i) { return CPU.indexOf(i) === -1; }),
          { stroke: OK, 'stroke-width': 2.4, duration: 0.35, stagger: 0.07 });

    tl.step('Accepted nodes are grouped into <b>islands</b>. Each island is replaced by one opaque delegate call.');
    tl.to([isl1, isl2], { opacity: 1, duration: 0.45, stagger: 0.15 });
    tl.to([lbl1, lbl2], { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('Two operators were refused. They stay as portable CPU kernels — the export still succeeds. That is the point of <b>partial delegation</b>.');
    tl.to([rings[3], rings[8]], { stroke: FROZEN, 'stroke-width': 2.4, duration: 0.35 });
    tl.to(cpuLbl, { opacity: 1, duration: 0.3 });
    k.pulse(tl, [nodes[3], nodes[8]], { scale: 1.2 });

    tl.step('But every island border is a real <b>copy</b>. Here there are four of them, on every single call.');
    tl.to(read, { opacity: 1, duration: 0.35 });
    copies.forEach(function (d, i) {
      tl.to(d, { opacity: 1, duration: 0.25 });
      tl.call(function () { crossT.textContent = String(i + 1); }, null, '<');
    });
    k.pulse(tl, crossT, { scale: 1.25 });

    tl.step('So "it runs on the NPU" is a claim to check, not to assume. The partition report says it in four numbers: 9 nodes total, 7 delegated, 2 left on CPU, 2 subgraphs.');
    k.pulse(tl, opsT, { scale: 1.15 });
    tl.to([isl1, isl2], { opacity: 0.55, duration: 0.3 }, '<');
  });

  /* ======================================================================
     Scene 5 — the KV cache across the export boundary
     viewBox 900 x 340
     ====================================================================== */

  Scene.register('ex-kv', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#exk-plot');

    /* ---- A: cache in and out ------------------------------------------ */

    var A = S.g({ opacity: 0 });
    add(A, txt(40, 44, 'A · cache passed in and out as tensors', { small: true }));

    add(A, e('rect', { x: 40, y: 70, width: 110, height: 64, rx: 9,
                       fill: 'var(--c-data-dim)', stroke: DATA, 'stroke-width': 1.6 }));
    add(A, txt(95, 96, 'KV cache', { anchor: 'middle', size: 12.5, fill: TEXT }));
    add(A, txt(95, 118, 'T slots', { anchor: 'middle', mono: true, size: 12, fill: DATA }));

    add(A, S.arrow(158, 102, 214, 102, { role: 'data', opacity: 1 }));
    add(A, panel(220, 62, 150, 80));
    add(A, txt(295, 98, 'decode step', { anchor: 'middle', size: 13, fill: TEXT }));
    add(A, txt(295, 120, 'pure graph', { anchor: 'middle', small: true }));
    add(A, S.arrow(376, 102, 432, 102, { role: 'data', opacity: 1 }));

    add(A, e('rect', { x: 440, y: 70, width: 110, height: 64, rx: 9,
                       fill: 'var(--c-data-dim)', stroke: DATA, 'stroke-width': 1.6 }));
    add(A, txt(495, 96, 'KV cache', { anchor: 'middle', size: 12.5, fill: TEXT }));
    add(A, txt(495, 118, 'T+1 slots', { anchor: 'middle', mono: true, size: 12, fill: DATA }));
    add(host, A);

    var meterA = S.g({ opacity: 0 });
    add(meterA, txt(580, 86, 'copied per token', { small: true }));
    var barA = e('rect', { x: 580, y: 98, width: 0, height: 22, rx: 6, fill: LOSS });
    add(meterA, barA);
    add(meterA, txt(580, 140, '2 · n_layers · G · T · d_h · b', { mono: true, size: 12, fill: LOSS }));
    add(meterA, txt(580, 160, '11.7 MiB per token at T = 1000', { small: true, fill: LOSS }));
    add(host, meterA);

    /* ---- B: cache as state -------------------------------------------- */

    var B = S.g({ opacity: 0 });
    add(B, txt(40, 184, 'B · cache held as state inside the model', { small: true }));
    add(B, panel(220, 200, 330, 110));
    add(B, txt(385, 228, 'decode step', { anchor: 'middle', size: 13, fill: TEXT }));

    var slots = [];
    for (var i = 0; i < 8; i++) {
      var r = e('rect', { x: 240 + i * 36, y: 252, width: 30, height: 26, rx: 5,
                          fill: 'var(--c-data-dim)', stroke: DATA, 'stroke-width': 1.3 });
      add(B, r);
      slots.push(r);
    }
    add(B, txt(385, 300, 'state: T slots, one written in place', { anchor: 'middle', small: true }));
    add(host, B);

    var meterB = S.g({ opacity: 0 });
    add(meterB, txt(580, 222, 'copied per token', { small: true }));
    var barB = e('rect', { x: 580, y: 234, width: 0, height: 22, rx: 6, fill: OK });
    add(meterB, barB);
    add(meterB, txt(580, 276, '2 · n_layers · G · d_h · b', { mono: true, size: 12, fill: OK }));
    add(meterB, txt(580, 296, '12 KiB per token, at any T', { small: true, fill: OK }));
    add(host, meterB);

    /* ---- steps -------------------------------------------------------- */

    tl.step('A decode step is <b>not a pure function</b>. It reads the keys and values of every earlier token, then adds one more.');
    tl.to(A, { opacity: 1, duration: 0.45 });

    tl.step('A graph has no memory. The straightforward fix keeps the graph pure: pass the cache in as a tensor, return the new one, hand it back next call.');
    k.pulse(tl, A, { scale: 1.02 });

    tl.step('That is correct, and it is slow. The <b>whole</b> cache moves every token, and it grows with the context — 11.7 MiB per token at a thousand positions, on the Lesson 04 model.');
    tl.to(meterA, { opacity: 1, duration: 0.3 });
    tl.to(barA, { attr: { width: 280 }, duration: 0.9, ease: 'power2.out' });

    tl.step('The alternative gives the model a buffer it owns. Core ML calls this a <span class="kw">StateType</span>; ExecuTorch calls it a mutable buffer. You write <b>one slice</b> per step — 12 KiB, at any position.');
    tl.to(B, { opacity: 1, duration: 0.45 });
    tl.to(meterB, { opacity: 1, duration: 0.3 });
    tl.to(slots[5], { fill: 'var(--c-ok-dim)', stroke: OK, duration: 0.35 });
    tl.to(barB, { attr: { width: 35 }, duration: 0.6, ease: 'power2.out' }, '<');
    k.pulse(tl, slots[5], { scale: 1.3 });

    tl.step('Both designs need the position dimension declared dynamic, with a maximum. That maximum is your context limit — and you choose it at export time, not at run time.');
    k.dim(tl, [A, meterA], { to: 0.35 });
    k.pulse(tl, meterB, { scale: 1.06 });
  });

  /* ======================================================================
     Scene 6 — numerical verification
     viewBox 900 x 340
     ====================================================================== */

  Scene.register('ex-verify', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#exv-plot');

    /* ---- the two paths ------------------------------------------------ */

    var inp = S.pill(40, 80, 104, 40, 'same input', { role: 'data' });
    add(host, inp);
    var fan1 = S.arrow(150, 96, 176, 76, { role: 'data' });
    var fan2 = S.arrow(150, 108, 176, 146, { role: 'data' });
    add(host, fan1, fan2);

    var boxT = S.g({ opacity: 0 });
    add(boxT, panel(182, 44, 170, 56));
    add(boxT, txt(267, 78, 'PyTorch eager', { anchor: 'middle', size: 13.5, fill: TEXT }));
    add(host, boxT);

    var boxE = S.g({ opacity: 0 });
    add(boxE, panel(182, 124, 170, 56, { stroke: OK }));
    add(boxE, txt(267, 158, 'exported graph', { anchor: 'middle', size: 13.5, fill: OK }));
    add(host, boxE);

    /* two rows of five output values */
    var VAL_REF = ['0.4127', '-1.083', '2.0416', '0.7735', '-0.219'];
    var VAL_Q   = ['0.4145', '-1.080', '2.0388', '0.7712', '-0.223'];
    var rowT = [], rowE = [];
    function makeRow(y, fill, store) {
      var g = S.g({ opacity: 0 });
      for (var i = 0; i < 5; i++) {
        var x = 378 + i * 60;
        add(g, e('rect', { x: x, y: y, width: 54, height: 38, rx: 7,
                           fill: SURF, stroke: LINE, 'stroke-width': 1.3 }));
        var t = e('text', { x: x + 27, y: y + 24, 'text-anchor': 'middle', class: 'dg-mono',
                            'font-size': 11, fill: fill }, VAL_REF[i]);
        add(g, t);
        store.push(t);
      }
      add(host, g);
      return g;
    }
    var gT = makeRow(48, DATA, rowT);
    var gE = makeRow(132, OK, rowE);

    /* readout panel */
    var read = S.g({ opacity: 0 });
    add(read, panel(696, 44, 176, 134));
    add(read, txt(784, 76, 'max |difference|', { anchor: 'middle', small: true }));
    var maxT = e('text', { x: 784, y: 110, 'text-anchor': 'middle', class: 'dg-mono',
                           'font-size': 19, fill: OK }, '2.4e-06');
    add(read, maxT);
    add(read, txt(784, 140, 'tolerance', { anchor: 'middle', small: true }));
    var tolT = e('text', { x: 784, y: 164, 'text-anchor': 'middle', class: 'dg-mono',
                           'font-size': 15, fill: DIM }, '1e-04');
    add(read, tolT);
    add(host, read);

    /* ---- the difference chart ----------------------------------------- */

    var BASE = 310;
    function Y(v) { return BASE - (Math.log(v) / Math.LN10 + 7) * 25; }

    var chart = S.g({ opacity: 0 });
    add(chart, txt(360, 332, 'absolute difference per output, log scale', { small: true }));
    add(chart, e('line', { x1: 360, y1: 183, x2: 360, y2: BASE, stroke: LINE, 'stroke-width': 1.5 }));
    add(chart, e('line', { x1: 360, y1: BASE, x2: 700, y2: BASE, stroke: LINE, 'stroke-width': 1.5 }));
    ['1e-7', '1e-6', '1e-5', '1e-4', '1e-3', '1e-2'].forEach(function (s, i) {
      add(chart, txt(352, BASE - i * 25 + 4, s, { anchor: 'end', mono: true, size: 10.5, fill: DIM }));
    });
    add(host, chart);

    var FP32 = [6e-7, 2.4e-6, 9e-7, 1.5e-6, 7e-7];
    var INT8 = [1.8e-3, 3.1e-3, 9e-4, 2.2e-3, 4.0e-3];

    var bars = FP32.map(function (v, i) {
      var r = e('rect', { x: 378 + i * 60, y: BASE, width: 54, height: 0, rx: 4,
                          fill: 'var(--c-ok-dim)', stroke: OK, 'stroke-width': 1.4, opacity: 0 });
      add(host, r);
      return r;
    });

    var tolLine = e('line', { x1: 360, y1: Y(1e-4), x2: 700, y2: Y(1e-4), stroke: LOSS,
                              'stroke-width': 2, 'stroke-dasharray': '6 5', opacity: 0 });
    var tolLbl = txt(706, Y(1e-4) + 4, 'tolerance', { small: true, fill: LOSS, opacity: 0 });
    add(host, tolLine, tolLbl);

    /* ---- steps -------------------------------------------------------- */

    tl.step('Push the <b>same</b> input through both paths. Not a fresh random input for each — the same one.');
    tl.to(inp, { opacity: 1, duration: 0.35 });
    tl.to([fan1, fan2], { opacity: 1, duration: 0.3 }, '-=0.1');
    tl.to([boxT, boxE], { opacity: 1, duration: 0.35, stagger: 0.1 });

    tl.step('Compare the outputs element by element. At four decimals they look the same — which is exactly why you must measure instead of look.');
    tl.to([gT, gE], { opacity: 1, duration: 0.4, stagger: 0.12 });

    tl.step('Different kernels sum in a different order, so fp32 against fp32 lands near a millionth. Draw the line where you can defend it.');
    tl.to(chart, { opacity: 1, duration: 0.35 });
    bars.forEach(function (r, i) {
      var h = BASE - Y(FP32[i]);
      tl.to(r, { opacity: 1, attr: { y: Y(FP32[i]), height: h }, duration: 0.45 },
            i === 0 ? undefined : '-=0.32');
    });
    tl.to([tolLine, tolLbl], { opacity: 1, duration: 0.35 });
    tl.to(read, { opacity: 1, duration: 0.35 }, '-=0.2');

    tl.step('<span class="kw">torch.testing.assert_close</span> turns that line into a test. Put it in CI, not in your terminal history.');
    k.pulse(tl, maxT, { scale: 1.15 });
    tl.to(tolT, { fill: OK, duration: 0.3 }, '<');

    tl.step('Now export the <b>int8</b> model instead. Every difference jumps three orders of magnitude and crosses the line.');
    bars.forEach(function (r, i) {
      var h = BASE - Y(INT8[i]);
      tl.to(r, { attr: { y: Y(INT8[i]), height: h }, duration: 0.7, ease: 'power2.inOut',
                 fill: 'var(--c-loss-dim)', stroke: LOSS },
            i === 0 ? undefined : '<');
    });
    tl.call(function () {
      maxT.textContent = '4.0e-03';
      rowE.forEach(function (t, i) { t.textContent = VAL_Q[i]; });
    });
    tl.to(maxT, { fill: LOSS, duration: 0.3 });
    tl.to(rowE, { fill: LOSS, duration: 0.3 }, '<');
    k.pulse(tl, maxT, { scale: 1.25 });

    tl.step('Nothing broke. You compared against the wrong reference: quantize in PyTorch first and compare against <b>that</b> — or stop comparing numbers and compare the task metric.');
    tl.to(boxT, { opacity: 0.35, duration: 0.35 });
    tl.to(gT, { opacity: 0.35, duration: 0.35 }, '<');
    tl.call(function () { tolT.textContent = 'wrong baseline'; });
    tl.to(tolT, { fill: LOSS, duration: 0.3 });
  });

})();
