/* =========================================================================
   "When it breaks" — three figures:
   the debugging ladder, the training memory stack, gradient checkpointing.
   ========================================================================= */

(function () {
  'use strict';
  var S = window.SVG;

  /* ====================================================== the check ladder */

  Scene.register('dbg-ladder', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#dl-plot');

    var CHECKS = [
      'Overfit ten examples',
      'Loss at step zero = ln(classes)',
      'Decode one batch and read it',
      'Do gradients exist and are they finite?',
      'Do the parameters actually move?',
      'Now try the learning rate',
      'Bisect the data'
    ];

    var X = 60, Y = 26, ROW = 39, W = 470;
    var rows = CHECKS.map(function (t, i) {
      var g = S.g({ opacity: 0.25 });
      S.add(g, S.e('rect', {
        x: X, y: Y + i * ROW, width: W, height: 30, rx: 8,
        fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.4
      }));
      S.add(g, S.e('text', {
        x: X + 15, y: Y + i * ROW + 20, class: 'dg-mono', 'font-size': 12.5, fill: 'var(--text-dim)'
      }, String(i + 1)));
      S.add(g, S.e('text', {
        x: X + 38, y: Y + i * ROW + 20, class: 'dg-label', 'font-size': 13.5, fill: 'var(--text)'
      }, t));
      host.appendChild(g);
      return g;
    });

    /* the "most bugs live here" bracket */
    var bracket = S.g({ opacity: 0 });
    S.add(bracket, S.e('path', {
      d: 'M' + (X + W + 14) + ',' + (Y + 4) + ' h10 v' + (ROW * 2 + 26) + ' h-10',
      fill: 'none', stroke: 'var(--c-ok)', 'stroke-width': 2
    }));
    S.add(bracket, S.e('text', {
      x: X + W + 34, y: Y + ROW + 12, class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-ok)'
    }, 'most bugs are here'));
    S.add(bracket, S.e('text', {
      x: X + W + 34, y: Y + ROW + 30, class: 'dg-label dg-label--sm'
    }, 'and they take a minute to find'));
    host.appendChild(bracket);

    var wrong = S.g({ opacity: 0 });
    S.add(wrong, S.e('path', {
      d: 'M' + (X + W + 14) + ',' + (Y + 5 * ROW + 2) + ' h10 v30 h-10',
      fill: 'none', stroke: 'var(--c-loss)', 'stroke-width': 2
    }));
    S.add(wrong, S.e('text', {
      x: X + W + 34, y: Y + 5 * ROW + 22, class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-loss)'
    }, 'where most people start'));
    host.appendChild(wrong);

    tl.step('When a model will not learn, there is a right order to check things.');
    tl.to(rows, { opacity: 0.35, duration: 0.4, stagger: 0.05 });

    tl.step('<b>Check one finds most bugs.</b> If the loss on ten examples will not go to nearly zero, the training loop itself is wrong.');
    tl.to(rows[0], { opacity: 1, duration: 0.35 });
    tl.to(rows[0].querySelector('rect'), { stroke: 'var(--c-ok)', 'stroke-width': 2.2, duration: 0.35 }, '<');

    tl.step('Checks two and three catch the other common cause: the <b>data</b> is not what you think it is.');
    tl.to([rows[1], rows[2]], { opacity: 1, duration: 0.35, stagger: 0.12 });
    tl.to([rows[1].querySelector('rect'), rows[2].querySelector('rect')],
          { stroke: 'var(--c-ok)', 'stroke-width': 2.2, duration: 0.35 }, '<');
    tl.to(bracket, { opacity: 1, duration: 0.4 });

    tl.step('Only after those do you look at gradients and at the parameters themselves.');
    tl.to([rows[3], rows[4]], { opacity: 1, duration: 0.35, stagger: 0.12 });

    tl.step('<b>The learning rate is check six.</b> Almost everyone starts here, and that is why debugging takes them a day instead of a minute.');
    tl.to(rows[5], { opacity: 1, duration: 0.35 });
    tl.to(rows[5].querySelector('rect'), { stroke: 'var(--c-loss)', 'stroke-width': 2.2, duration: 0.35 }, '<');
    tl.to(wrong, { opacity: 1, duration: 0.4 }, '<');
    k.pulse(tl, rows[5], { scale: 1.02 });

    tl.step('And if ten examples train but the full set does not, the answer is somewhere in the data you have not looked at yet.');
    tl.to(rows[6], { opacity: 1, duration: 0.35 });
  });

  /* ================================================== the memory stack */

  Scene.register('dbg-mem', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap, k = ctx.k;
    var host = q('#dm-plot');

    /* 1 GB of memory = PX pixels */
    var X = 70, Y = 96, H = 58, PX = 33;

    var parts = [
      { key: 'w', label: 'weights',    gb: 4, role: 'param' },
      { key: 'g', label: 'gradients',  gb: 4, role: 'grad' },
      { key: 'o', label: 'AdamW state', gb: 8, role: 'loss' },
      { key: 'a', label: 'activations', gb: 4, role: 'data' }
    ];

    var segs = parts.map(function (p) {
      var g = S.g({ opacity: 0 });
      var rect = S.e('rect', {
        x: X, y: Y, width: p.gb * PX, height: H, rx: 5,
        fill: 'var(--c-' + p.role + '-dim)', stroke: 'var(--c-' + p.role + ')', 'stroke-width': 1.6
      });
      S.add(g, rect);
      var t = S.e('text', {
        x: X, y: Y + H + 19, 'text-anchor': 'middle',
        class: 'dg-label dg-label--sm', fill: 'var(--c-' + p.role + ')'
      }, p.label);
      S.add(g, t);
      host.appendChild(g);
      return { g: g, rect: rect, text: t, gb: p.gb };
    });

    /* Lay the four blocks out end to end for a given set of sizes.
       Doing it in one place keeps them joined when they resize.        */
    function layout(gbs, dur) {
      var x = X;
      gbs.forEach(function (gb, i) {
        var w = gb * PX;
        if (dur) {
          tl.to(segs[i].rect, { attr: { x: x, width: w }, duration: dur, ease: 'power2.inOut' }, i === 0 ? undefined : '<');
          tl.to(segs[i].text, { attr: { x: x + w / 2 }, duration: dur, ease: 'power2.inOut' }, '<');
          tl.to(segs[i].text, { opacity: w < 26 ? 0 : 1, duration: dur * 0.6 }, '<');
        } else {
          segs[i].rect.setAttribute('x', x);
          segs[i].rect.setAttribute('width', w);
          segs[i].text.setAttribute('x', x + w / 2);
        }
        x += w + 3;
      });
    }
    layout([4, 4, 8, 4], 0);

    /* device limit */
    var limitX = X + 16 * PX;
    var limit = S.g({ opacity: 0 });
    S.add(limit, S.e('line', {
      x1: limitX, y1: Y - 26, x2: limitX, y2: Y + H + 34,
      stroke: 'var(--c-loss)', 'stroke-width': 2, 'stroke-dasharray': '5 5'
    }));
    S.add(limit, S.e('text', {
      x: limitX + 10, y: Y - 12, class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-loss)'
    }, '16 GB — all the memory you have'));
    host.appendChild(limit);

    var total = S.e('text', { x: X, y: Y - 22, class: 'dg-mono', 'font-size': 19, fill: 'var(--text)' }, '20 GB');
    host.appendChild(total);
    var caption = S.e('text', { x: X, y: 250, class: 'dg-label' }, 'full fine-tuning, 1 billion parameters, AdamW');
    host.appendChild(caption);

    tl.step('Training a 1-billion-parameter model. The weights are only the first quarter of the problem.');
    tl.to(segs[0].g, { opacity: 1, duration: 0.4 });

    tl.step('Every trainable weight needs a <b>gradient</b> beside it — the same size again.');
    tl.to(segs[1].g, { opacity: 1, duration: 0.4 });

    tl.step('And AdamW keeps <b>two more numbers per parameter</b>. That is already 16 GB before any data has moved through the model.');
    tl.to(segs[2].g, { opacity: 1, duration: 0.4 });
    tl.to(limit, { opacity: 1, duration: 0.4 });

    tl.step('Then the <b>activations</b>: every layer keeps its output until the backward pass needs it. Now you are over the limit and the run dies.');
    tl.to(segs[3].g, { opacity: 1, duration: 0.4 });
    k.pulse(tl, limit, { scale: 1.03 });

    tl.step('<b>LoRA</b> freezes the weights, so the gradient and optimizer blocks almost vanish. This is the biggest single saving available to you.');
    layout([4, 0.12, 0.2, 4], 0.8);
    k.count(tl, total, 20, 8.3, { duration: 0.8, decimals: 1, position: '<', format: function (v) { return v.toFixed(1) + ' GB'; } });
    tl.call(function () { caption.textContent = 'LoRA: the weights are frozen, so almost nothing is stored beside them'; });

    tl.step('But notice what LoRA did <b>not</b> remove. The activations are still there — and that is why people still run out of memory after switching to LoRA.');
    k.pulse(tl, segs[3].g, { scale: 1.06 });
    tl.to(segs[3].rect, { stroke: 'var(--c-loss)', 'stroke-width': 2.4, duration: 0.4 }, '<');

    tl.step('For those you need <b>gradient checkpointing</b>: store a few, recompute the rest. About 30% more time, most of the memory back.');
    layout([4, 0.12, 0.2, 1.4], 0.8);
    tl.to(segs[3].rect, { stroke: 'var(--c-data)', 'stroke-width': 1.6, duration: 0.5 }, '<');
    k.count(tl, total, 8.3, 5.7, { duration: 0.8, decimals: 1, position: '<', format: function (v) { return v.toFixed(1) + ' GB'; } });
    tl.call(function () { caption.textContent = 'LoRA + gradient checkpointing: it fits, with room to spare'; });
    tl.to(total, { fill: 'var(--c-ok)', duration: 0.4 });
  });

  /* ============================================== gradient checkpointing */

  Scene.register('dbg-ckpt', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#dc-plot');

    var N = 9, X = 90, Y = 96, GAP = 82, BOX = 46;

    var layers = [], dots = [];
    for (var i = 0; i < N; i++) {
      var lx = X + i * GAP;
      var g = S.g({ opacity: 1 });
      S.add(g, S.e('rect', {
        x: lx, y: Y, width: BOX, height: BOX, rx: 8,
        fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.4
      }));
      S.add(g, S.e('text', {
        x: lx + BOX / 2, y: Y + BOX / 2 + 5, 'text-anchor': 'middle',
        class: 'dg-mono', 'font-size': 12, fill: 'var(--text-dim)'
      }, String(i + 1)));
      host.appendChild(g);
      layers.push(g);

      var d = S.e('circle', {
        cx: lx + BOX / 2, cy: Y - 24, r: 7,
        fill: 'var(--c-data)', opacity: 0
      });
      host.appendChild(d);
      dots.push(d);
    }

    S.add(host, S.e('text', { x: X, y: Y - 46, class: 'dg-label dg-label--sm' }, 'kept in memory'));
    S.add(host, S.e('text', { x: X, y: Y + BOX + 30, class: 'dg-label dg-label--sm' }, 'layers →'));

    var note = S.e('text', { x: X, y: 232, class: 'dg-label' }, '');
    host.appendChild(note);

    var recompute = S.g({ opacity: 0 });
    S.add(recompute, S.e('path', {
      d: 'M' + (X + 4 * GAP + BOX / 2) + ',' + (Y + BOX + 14) + ' L' + (X + 7 * GAP + BOX / 2) + ',' + (Y + BOX + 14),
      stroke: 'var(--c-grad)', 'stroke-width': 2, 'stroke-dasharray': '5 4', fill: 'none'
    }));
    S.add(recompute, S.e('text', {
      x: X + 5.5 * GAP + BOX / 2, y: Y + BOX + 32, 'text-anchor': 'middle',
      class: 'dg-mono', 'font-size': 12, fill: 'var(--c-grad)'
    }, 'recomputed on the way back'));
    host.appendChild(recompute);

    tl.step('The backward pass needs the values the forward pass produced. So by default <b>every layer keeps its output</b>.');
    tl.to(dots, { opacity: 1, duration: 0.3, stagger: 0.07 });
    tl.call(function () { note.textContent = '9 activations stored — memory grows with depth, batch size and sequence length'; });

    tl.step('With <b>gradient checkpointing</b> you keep only a few of them and throw the rest away.');
    tl.to([dots[1], dots[2], dots[4], dots[5], dots[7], dots[8]], { opacity: 0.12, duration: 0.5, stagger: 0.05 });
    tl.call(function () { note.textContent = '3 activations stored — roughly a third of the memory'; });

    tl.step('When the backward pass reaches a gap, it <b>runs those layers forward again</b> from the nearest saved point.');
    tl.to(recompute, { opacity: 1, duration: 0.4 });
    k.draw(tl, recompute.querySelector('path'), { duration: 0.8 });
    tl.to([layers[5], layers[6], layers[7]], { opacity: 1, duration: 0.3 });
    tl.to([dots[5], dots[7]], { opacity: 0.75, duration: 0.4, stagger: 0.1 });

    tl.step('You paid about <b>30% more compute</b> and got most of the memory back. On a laptop that is usually the difference between running and not running.');
    tl.to([dots[5], dots[7]], { opacity: 0.12, duration: 0.4 });
    tl.to(recompute, { opacity: 0.35, duration: 0.3 }, '<');
    tl.call(function () { note.textContent = 'the trade: time you have, memory you do not'; });
  });

})();
