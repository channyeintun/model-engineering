/* =========================================================================
   svgkit.js — shared building blocks for every diagram in the course.
   Load this before any lessons/scenes script. Everything lives on window.SVG.

   The point of this file is consistency: a box in Lesson 03 should look
   exactly like a box in Lesson 11, so the reader never has to re-learn how
   to read a picture.
   ========================================================================= */

(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /* Colour by meaning. Use these names, never raw hex. */
  var ROLE = {
    data:   'var(--c-data)',    // activations, things flowing forward
    param:  'var(--c-param)',   // weights, the things we learn
    grad:   'var(--c-grad)',    // gradients, flowing backward
    loss:   'var(--c-loss)',    // error, the thing we shrink
    ok:     'var(--c-ok)',      // output, correct, finished
    frozen: 'var(--c-frozen)',  // frozen, discarded, "the old way"
    line:   'var(--line)',
    text:   'var(--text)',
    dim:    'var(--text-dim)',
    soft:   'var(--text-soft)',
    surface:'var(--surface-2)',
    bg:     'var(--bg)'
  };
  function role(r) { return ROLE[r] || r; }
  function tint(r) { return 'var(--c-' + r + '-dim)'; }

  /* --------------------------------------------------------------- core */

  function e(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function add(parent) {
    for (var i = 1; i < arguments.length; i++) {
      if (arguments[i]) parent.appendChild(arguments[i]);
    }
    return parent;
  }

  function g(attrs) { return e('g', attrs || {}); }

  /* ------------------------------------------------------------- pieces */

  /* A labelled rounded box. Returns a <g> so you can tween it as one unit. */
  function box(x, y, w, h, o) {
    o = o || {};
    var grp = g({ opacity: o.opacity != null ? o.opacity : 0 });
    add(grp, e('rect', {
      x: x, y: y, width: w, height: h, rx: o.rx != null ? o.rx : 10,
      fill: o.role ? tint(o.role) : (o.fill || ROLE.surface),
      stroke: o.role ? role(o.role) : (o.stroke || ROLE.line),
      'stroke-width': o.sw || 1.5,
      'stroke-dasharray': o.dashed ? '5 5' : null
    }));
    var cy = o.sub ? y + 26 : y + h / 2 + 5;
    if (o.title) {
      add(grp, e('text', {
        x: x + w / 2, y: cy, 'text-anchor': 'middle', class: 'dg-title',
        fill: o.titleFill || null
      }, o.title));
    }
    if (o.sub) {
      add(grp, e('text', {
        x: x + w / 2, y: y + 50, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 14, fill: o.role ? role(o.role) : (o.subFill || ROLE.data)
      }, o.sub));
    }
    if (o.note) {
      add(grp, e('text', {
        x: x + w / 2, y: y + h + 20, 'text-anchor': 'middle', class: 'dg-label dg-label--sm'
      }, o.note));
    }
    return grp;
  }

  /* A straight arrow from (x1,y1) to (x2,y2). Horizontal or vertical. */
  function arrow(x1, y1, x2, y2, o) {
    o = o || {};
    var col = o.role ? role(o.role) : (o.stroke || ROLE.dim);
    var grp = g({ opacity: o.opacity != null ? o.opacity : 0 });
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    var hx = x2 - ux * 9, hy = y2 - uy * 9;
    add(grp, e('line', {
      x1: x1, y1: y1, x2: hx, y2: hy,
      stroke: col, 'stroke-width': o.sw || 1.6, 'stroke-linecap': 'round',
      'stroke-dasharray': o.dashed ? '5 5' : null
    }));
    var a = Math.atan2(uy, ux) * 180 / Math.PI;
    add(grp, e('path', {
      d: 'M0,0 L-9,-4.5 L-9,4.5 Z', fill: col,
      transform: 'translate(' + x2 + ',' + y2 + ') rotate(' + a + ')'
    }));
    if (o.label) {
      add(grp, e('text', {
        x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 9, 'text-anchor': 'middle',
        class: 'dg-label dg-label--sm'
      }, o.label));
    }
    return grp;
  }

  /* A curved arrow, useful when two boxes are not on the same line. */
  function curve(x1, y1, x2, y2, o) {
    o = o || {};
    var col = o.role ? role(o.role) : (o.stroke || ROLE.dim);
    var bow = o.bow != null ? o.bow : 40;
    var d = 'M' + x1 + ',' + y1 + ' C' + (x1 + bow) + ',' + y1 + ' ' +
            (x2 - bow) + ',' + y2 + ' ' + x2 + ',' + y2;
    var grp = g({ opacity: o.opacity != null ? o.opacity : 0 });
    add(grp, e('path', {
      d: d, fill: 'none', stroke: col, 'stroke-width': o.sw || 1.8,
      'stroke-dasharray': o.dashed ? '6 5' : null, class: o.class || null
    }));
    return grp;
  }

  function label(x, y, text, o) {
    o = o || {};
    return e('text', {
      x: x, y: y,
      'text-anchor': o.anchor || 'start',
      class: o.mono ? 'dg-mono' : (o.small ? 'dg-label dg-label--sm' : 'dg-label'),
      'font-size': o.size || null,
      fill: o.role ? role(o.role) : (o.fill || null),
      opacity: o.opacity != null ? o.opacity : null
    }, text);
  }

  /* A small rounded tag, for things like token pieces or format names. */
  function pill(x, y, w, h, text, o) {
    o = o || {};
    var grp = g({ opacity: o.opacity != null ? o.opacity : 0 });
    add(grp, e('rect', {
      x: x, y: y, width: w, height: h, rx: h / 2,
      fill: o.role ? tint(o.role) : ROLE.surface,
      stroke: o.role ? role(o.role) : ROLE.line, 'stroke-width': 1.3
    }));
    add(grp, e('text', {
      x: x + w / 2, y: y + h / 2 + 4.5, 'text-anchor': 'middle',
      class: 'dg-mono', 'font-size': o.size || 12,
      fill: o.role ? role(o.role) : ROLE.soft
    }, text));
    return grp;
  }

  /* A row of token boxes: SVG.tokens(x, y, ['The','cat','sat'], {}) */
  function tokens(x, y, list, o) {
    o = o || {};
    var w = o.w || 62, h = o.h || 34, gap = o.gap != null ? o.gap : 8;
    var grp = g({ opacity: o.opacity != null ? o.opacity : 1 });
    var cells = [];
    list.forEach(function (t, i) {
      var cx = x + i * (w + gap);
      var c = g({ opacity: o.cellOpacity != null ? o.cellOpacity : 1 });
      var r = e('rect', {
        x: cx, y: y, width: w, height: h, rx: 7,
        fill: o.role ? tint(o.role) : ROLE.surface,
        stroke: o.role ? role(o.role) : ROLE.line, 'stroke-width': 1.4
      });
      add(c, r);
      add(c, e('text', {
        x: cx + w / 2, y: y + h / 2 + 4.5, 'text-anchor': 'middle',
        class: 'dg-mono', 'font-size': o.size || 12.5, fill: ROLE.text
      }, t));
      add(grp, c);
      cells.push({ g: c, rect: r, x: cx, y: y, w: w, h: h, cx: cx + w / 2, cy: y + h / 2 });
    });
    grp.cells = cells;
    return grp;
  }

  /* A grid of cells — attention scores, a weight matrix, a spectrogram.
     Returns a <g> with .cells (row-major) so you can tween any cell.      */
  function matrix(x, y, rows, cols, o) {
    o = o || {};
    var s = o.cell || 26, gap = o.gap != null ? o.gap : 2;
    var grp = g({ opacity: o.opacity != null ? o.opacity : 1 });
    var cells = [];
    for (var r = 0; r < rows; r++) {
      cells[r] = [];
      for (var c = 0; c < cols; c++) {
        var cx = x + c * (s + gap), cy = y + r * (s + gap);
        var rect = e('rect', {
          x: cx, y: cy, width: s, height: s, rx: o.rx != null ? o.rx : 3,
          fill: o.fill || ROLE.surface,
          stroke: o.stroke || 'var(--line-soft)', 'stroke-width': 1,
          opacity: o.cellOpacity != null ? o.cellOpacity : 1
        });
        add(grp, rect);
        cells[r][c] = rect;
      }
    }
    grp.cells = cells;
    grp.flat = cells.reduce(function (a, b) { return a.concat(b); }, []);
    grp.at = function (r, c) { return cells[r] && cells[r][c]; };
    grp.geom = { x: x, y: y, s: s, gap: gap, rows: rows, cols: cols,
                 w: cols * (s + gap) - gap, h: rows * (s + gap) - gap };
    return grp;
  }

  /* Plain x/y axes with optional labels. */
  function axes(x0, y0, x1, y1, o) {
    o = o || {};
    var grp = g({ opacity: o.opacity != null ? o.opacity : 1 });
    add(grp, e('line', { x1: x0, y1: y1, x2: x1, y2: y1, stroke: ROLE.line, 'stroke-width': 1.5 }));
    add(grp, e('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: ROLE.line, 'stroke-width': 1.5 }));
    if (o.xLabel) add(grp, label(x1, y1 + 20, o.xLabel, { anchor: 'end', small: true }));
    if (o.yLabel) add(grp, label(x0 - 8, y0 + 6, o.yLabel, { anchor: 'end', small: true }));
    return grp;
  }

  /* A horizontal bar with a track behind it — memory, latency, accuracy. */
  function meter(x, y, w, h, o) {
    o = o || {};
    var grp = g({ opacity: o.opacity != null ? o.opacity : 1 });
    add(grp, e('rect', { x: x, y: y, width: w, height: h, rx: h / 2, fill: 'var(--surface-3)' }));
    var fill = e('rect', {
      x: x, y: y, width: (o.value != null ? o.value : 1) * w, height: h, rx: h / 2,
      fill: o.role ? role(o.role) : ROLE.data
    });
    add(grp, fill);
    grp.fill = fill;
    grp.track = w;
    return grp;
  }

  /* A phone outline, for the on-device lessons. Returns g with .screen */
  function phone(x, y, w, h, o) {
    o = o || {};
    var grp = g({ opacity: o.opacity != null ? o.opacity : 1 });
    add(grp, e('rect', { x: x, y: y, width: w, height: h, rx: Math.min(20, w * 0.16),
                         fill: ROLE.surface, stroke: ROLE.line, 'stroke-width': 2 }));
    var screen = e('rect', {
      x: x + 9, y: y + 16, width: w - 18, height: h - 32, rx: 11, fill: ROLE.bg
    });
    add(grp, screen);
    add(grp, e('rect', { x: x + w / 2 - 18, y: y + 6, width: 36, height: 5, rx: 2.5, fill: ROLE.line }));
    grp.screen = screen;
    return grp;
  }

  /* A brace-free "stack of layers" block, for model-size pictures. */
  function stack(x, y, w, layerH, n, o) {
    o = o || {};
    var grp = g({ opacity: o.opacity != null ? o.opacity : 1 });
    var layers = [];
    for (var i = 0; i < n; i++) {
      var r = e('rect', {
        x: x, y: y + i * (layerH + 3), width: w, height: layerH, rx: 4,
        fill: o.role ? tint(o.role) : ROLE.surface,
        stroke: o.role ? role(o.role) : ROLE.line, 'stroke-width': 1.2
      });
      add(grp, r); layers.push(r);
    }
    grp.layers = layers;
    return grp;
  }

  window.SVG = {
    NS: NS, e: e, add: add, g: g,
    box: box, arrow: arrow, curve: curve, label: label, pill: pill,
    tokens: tokens, matrix: matrix, axes: axes, meter: meter,
    phone: phone, stack: stack,
    role: role, tintOf: tint, ROLE: ROLE
  };
})();
