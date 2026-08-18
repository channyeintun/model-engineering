/* =========================================================================
   scene.js — the animated-diagram engine for the course.
   -------------------------------------------------------------------------
   A "scene" is a figure that explains ONE idea by moving.

   Markup (written by the lesson author):

     <figure class="scene" data-scene="attention-scores">
       <div class="scene__head">
         <span class="scene__badge">animation</span>
         <span class="scene__title">How one token looks at the others</span>
       </div>
       <div class="scene__stage">
         <svg viewBox="0 0 900 320"> ... </svg>
       </div>
     </figure>

   Script (also written by the lesson author):

     Scene.register('attention-scores', ({ tl, q, qa, gsap, k }) => {
       tl.step('Every token becomes three vectors: query, key and value.');
       tl.to(qa('.qkv'), { opacity: 1, stagger: 0.08, duration: 0.4 });

       tl.step('The query of "sat" is compared with every key.');
       tl.to(q('#beam'), { scaleX: 1, duration: 0.6 });
     });

   `tl.step(caption)` marks a chapter. The engine then gives the reader
   Play / Previous / Next / Replay controls and shows the caption for the
   chapter they are watching. Everything is paused until the figure is on
   screen, and `prefers-reduced-motion` is honoured.
   ========================================================================= */

(function () {
  'use strict';

  var gsap = window.gsap;
  if (!gsap) { console.warn('[scene] GSAP not found'); return; }

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.setAttribute('data-reduced-motion', String(REDUCED));

  var registry = {};   // id -> builder
  var scenes = {};     // id -> instance

  /* ---------------------------------------------------------------- icons */

  var ICON = {
    play:  '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2.8v10.4c0 .5.6.8 1 .5l8-5.2c.4-.2.4-.8 0-1L5.5 2.3c-.4-.3-1 0-1 .5z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="4" y="3" width="3" height="10" rx="1"/><rect x="9" y="3" width="3" height="10" rx="1"/></svg>',
    prev:  '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11.5 3.2v9.6c0 .5-.6.8-1 .5L4.8 8.9a1 1 0 010-1.8l5.7-4.4c.4-.3 1 0 1 .5z"/></svg>',
    next:  '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 3.2v9.6c0 .5.6.8 1 .5l5.7-4.4a1 1 0 000-1.8L5.5 2.7c-.4-.3-1 0-1 .5z"/></svg>',
    replay:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 11-1.9-4.2"/><path d="M13.8 2v3.2h-3.2"/></svg>'
  };

  /* ------------------------------------------------------------- toolkit */
  /* Small helpers so every lesson animates the same ideas the same way.   */

  var k = {
    /* Count a number up or down inside an element, as part of a timeline. */
    count: function (tl, el, from, to, opts) {
      opts = opts || {};
      var node = typeof el === 'string' ? document.querySelector(el) : el;
      if (!node) return tl;
      var fmt = opts.format || function (v) {
        return opts.decimals != null ? v.toFixed(opts.decimals)
                                     : String(Math.round(v));
      };
      /* Deliberately not writing fmt(from) here. Building a timeline must not
         change the picture: when several counters share one element, the last
         one constructed would otherwise leave its own start value on screen
         as the element's apparent time-zero state. */
      var proxy = { v: from };
      return tl.to(proxy, {
        v: to,
        duration: opts.duration != null ? opts.duration : 0.9,
        ease: opts.ease || 'power2.out',
        onUpdate: function () { node.textContent = fmt(proxy.v); }
      }, opts.position);
    },

    /* Send a dot travelling along an SVG <path>, like data down a wire. */
    flow: function (tl, pathEl, dotEl, opts) {
      opts = opts || {};
      var path = typeof pathEl === 'string' ? document.querySelector(pathEl) : pathEl;
      var dot  = typeof dotEl  === 'string' ? document.querySelector(dotEl)  : dotEl;
      if (!path || !dot || !window.MotionPathPlugin) return tl;
      return tl.fromTo(dot,
        { opacity: 0 },
        {
          opacity: 1,
          duration: opts.duration != null ? opts.duration : 0.8,
          ease: opts.ease || 'none',
          motionPath: { path: path, align: path, alignOrigin: [0.5, 0.5], start: opts.reverse ? 1 : 0, end: opts.reverse ? 0 : 1 },
          repeat: opts.repeat || 0
        }, opts.position);
    },

    /* Draw an SVG stroke on, as if a hand were tracing it. */
    draw: function (tl, target, opts) {
      opts = opts || {};
      var els = k.list(target);
      els.forEach(function (el) {
        var len = 0;
        try { len = el.getTotalLength ? el.getTotalLength() : 0; } catch (e) { len = 0; }
        if (!len) len = 600;
        gsap.set(el, { strokeDasharray: len, strokeDashoffset: opts.reverse ? 0 : len });
      });
      return tl.to(els, {
        strokeDashoffset: opts.reverse ? function (i, t) { return t.getTotalLength ? t.getTotalLength() : 600; } : 0,
        duration: opts.duration != null ? opts.duration : 0.8,
        ease: opts.ease || 'power1.inOut',
        stagger: opts.stagger || 0
      }, opts.position);
    },

    /* A short attention pulse: "look here". */
    pulse: function (tl, target, opts) {
      opts = opts || {};
      return tl.to(k.list(target), {
        scale: opts.scale != null ? opts.scale : 1.12,
        transformOrigin: '50% 50%',
        duration: opts.duration != null ? opts.duration : 0.22,
        ease: 'power2.out',
        yoyo: true, repeat: 1,
        stagger: opts.stagger || 0
      }, opts.position);
    },

    /* Fade a group in with a stagger — the default "appear" move. */
    appear: function (tl, target, opts) {
      opts = opts || {};
      return tl.fromTo(k.list(target),
        { opacity: 0, y: opts.y != null ? opts.y : 8 },
        {
          opacity: 1, y: 0,
          duration: opts.duration != null ? opts.duration : 0.45,
          ease: 'power2.out',
          stagger: opts.stagger != null ? opts.stagger : 0.06
        }, opts.position);
    },

    /* Dim things that are no longer the point. */
    dim: function (tl, target, opts) {
      opts = opts || {};
      return tl.to(k.list(target), {
        opacity: opts.to != null ? opts.to : 0.22,
        duration: opts.duration != null ? opts.duration : 0.35,
        ease: 'power1.out'
      }, opts.position);
    },

    /* Colour a set of elements by meaning (data / param / grad / loss / ok). */
    tint: function (tl, target, role, opts) {
      opts = opts || {};
      var v = 'var(--c-' + role + ')';
      var props = { duration: opts.duration != null ? opts.duration : 0.4, ease: 'power1.out' };
      if (opts.stroke) props.stroke = v; else props.fill = v;
      return tl.to(k.list(target), props, opts.position);
    },

    list: function (t) {
      if (!t) return [];
      if (typeof t === 'string') return Array.prototype.slice.call(document.querySelectorAll(t));
      if (t.length != null && !t.nodeType) return Array.prototype.slice.call(t);
      return [t];
    }
  };

  /* ---------------------------------------------------------- the engine */

  function build(el) {
    var id = el.getAttribute('data-scene');
    var builder = registry[id];
    if (!builder) { console.warn('[scene] no builder registered for "' + id + '"'); return null; }

    var stage = el.querySelector('.scene__stage');
    var q  = function (sel) { return el.querySelector(sel); };
    var qa = function (sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); };

    var steps = [];
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });

    /* tl.step(caption) — mark a chapter of the explanation. */
    tl.step = function (caption) {
      var i = steps.length;
      var label = 's' + i;
      tl.addLabel(label);
      tl.call(function () { setCaption(i); }, null, label);
      steps.push({ label: label, caption: caption, time: 0 });
      return tl;
    };

    var ctx = { root: el, stage: stage, svg: stage ? stage.querySelector('svg') : null,
                q: q, qa: qa, gsap: gsap, tl: tl, k: k, reduced: REDUCED };

    try { builder(ctx); }
    catch (err) { console.error('[scene:' + id + '] builder failed', err); return null; }

    /* Resolve label times now that the timeline is fully built. */
    steps.forEach(function (s) { s.time = tl.labels[s.label] || 0; });

    /* The text state at time zero. Counters and callbacks write into <text>
       nodes imperatively, and seeking backwards cannot undo that, so jumping
       to an earlier step would leave numbers on screen from a step that has
       not happened yet. We snapshot now — after the builder has run, before
       anything has played — and restore it whenever we rewind. */
    var textAtZero = Array.prototype.map.call(
      el.querySelectorAll('text'), function (n) { return [n, n.textContent]; });
    function restoreText() {
      for (var i = 0; i < textAtZero.length; i++) textAtZero[i][0].textContent = textAtZero[i][1];
    }

    /* ----- UI ----- */
    var foot = document.createElement('div');
    foot.className = 'scene__foot';

    var cap = document.createElement('p');
    cap.className = 'scene__caption';
    cap.setAttribute('aria-live', 'polite');
    cap.innerHTML = steps.length ? steps[0].caption : '';

    var controls = document.createElement('div');
    controls.className = 'scene__controls';

    var dots = document.createElement('div');
    dots.className = 'scene__dots';
    steps.forEach(function (s, i) {
      var d = document.createElement('button');
      d.className = 'scene__dot';
      d.type = 'button';
      d.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + stripTags(s.caption));
      d.addEventListener('click', function () { playStep(i); });
      dots.appendChild(d);
    });

    var bPrev = mkBtn(ICON.prev, 'Previous step');
    var bPlay = mkBtn(ICON.play, 'Play', 'sbtn--primary');
    var bNext = mkBtn(ICON.next, 'Next step');
    var bReplay = mkBtn(ICON.replay, 'Replay from the start');

    if (steps.length > 1) { controls.appendChild(dots); controls.appendChild(bPrev); }
    controls.appendChild(bPlay);
    if (steps.length > 1) controls.appendChild(bNext);
    controls.appendChild(bReplay);

    foot.appendChild(cap);
    foot.appendChild(controls);

    var rm = document.createElement('div');
    rm.className = 'rm-notice';
    rm.textContent = 'Your system asks for reduced motion, so this diagram starts at its final state. Use Replay or the step buttons to watch it move.';

    el.appendChild(foot);
    el.appendChild(rm);

    /* ----- state ----- */
    var current = 0;
    var seg = null;          // the tween driving one segment
    var playingAll = false;

    function setCaption(i) {
      if (i < 0 || i >= steps.length) return;
      current = i;
      cap.innerHTML = steps[i].caption;
      Array.prototype.forEach.call(dots.children, function (d, j) {
        d.classList.toggle('is-active', j === i);
        d.classList.toggle('is-past', j < i);
      });
      bPrev.disabled = i === 0;
      bNext.disabled = i >= steps.length - 1;
    }

    function killSeg() { if (seg) { seg.kill(); seg = null; } }

    function segEnd(i) {
      return (i + 1 < steps.length) ? steps[i + 1].time : tl.duration();
    }

    function playStep(i) {
      i = Math.max(0, Math.min(steps.length - 1, i));
      killSeg(); tl.pause(); playingAll = false; showPlay();

      /* Rewind to the start, put the text back to how it began, then run
         forward to the target so every callback on the way is re-fired. */
      if (tl.time() > steps[i].time) { tl.time(0, true); restoreText(); }
      tl.time(steps[i].time, false);
      setCaption(i);
      var to = segEnd(i);
      if (to <= steps[i].time + 0.001) return;
      seg = tl.tweenFromTo(steps[i].time, to, { ease: 'none', onComplete: function () { seg = null; } });
    }

    function playAll() {
      killSeg();
      playingAll = true; showPause();
      if (tl.progress() > 0.995) tl.progress(0);
      tl.play();
    }
    function pauseAll() { playingAll = false; tl.pause(); killSeg(); showPlay(); }

    function showPlay()  { bPlay.innerHTML = ICON.play;  bPlay.setAttribute('aria-label', 'Play'); }
    function showPause() { bPlay.innerHTML = ICON.pause; bPlay.setAttribute('aria-label', 'Pause'); }

    tl.eventCallback('onComplete', function () { playingAll = false; showPlay(); });

    bPlay.addEventListener('click', function () { playingAll || seg ? pauseAll() : playAll(); });
    bNext.addEventListener('click', function () { playStep(current + 1); });
    bPrev.addEventListener('click', function () { playStep(current - 1); });
    bReplay.addEventListener('click', function () {
      killSeg(); tl.progress(0).pause(); restoreText(); setCaption(0); playAll();
    });

    /* Keyboard, when the figure has focus. */
    el.setAttribute('tabindex', '-1');
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); playStep(current + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); playStep(current - 1); }
      else if (e.key === ' ' || e.key === 'Enter') {
        if (e.target === el) { e.preventDefault(); playingAll ? pauseAll() : playAll(); }
      }
    });

    var inst = { id: id, el: el, tl: tl, steps: steps, playAll: playAll, playStep: playStep, started: false };

    /* Start in the right place. */
    if (REDUCED) { tl.progress(1).pause(); setCaption(steps.length - 1); inst.started = true; }
    else { setCaption(0); }

    scenes[id] = inst;
    return inst;
  }

  function mkBtn(icon, label, extra) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sbtn' + (extra ? ' ' + extra : '');
    b.innerHTML = icon;
    b.setAttribute('aria-label', label);
    b.title = label;
    return b;
  }

  function stripTags(s) { var d = document.createElement('div'); d.innerHTML = s || ''; return d.textContent || ''; }

  /* --------------------------------------------------------- public API */

  var pending = [];

  var Scene = {
    /* Register a builder. Safe to call before or after DOM ready. */
    register: function (id, builder) {
      registry[id] = builder;
      if (document.readyState !== 'loading') mount(id);
      else pending.push(id);
      return Scene;
    },
    get: function (id) { return scenes[id]; },
    k: k,
    reduced: REDUCED
  };

  function mount(id) {
    var el = document.querySelector('[data-scene="' + id + '"]');
    if (!el || el.__mounted) return;
    el.__mounted = true;
    var inst = build(el);
    if (!inst || REDUCED) return;

    /* Play once, the first time the reader can actually see it. */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !inst.started) {
          inst.started = true;
          inst.playAll();
          io.disconnect();
        }
      });
    }, { threshold: 0.35, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
  }

  document.addEventListener('DOMContentLoaded', function () {
    pending.forEach(mount);
    pending = [];
    /* Any scene element whose builder registered later is handled by register(). */
    document.querySelectorAll('[data-scene]').forEach(function (el) {
      var id = el.getAttribute('data-scene');
      if (registry[id]) mount(id);
    });
  });

  window.Scene = Scene;
})();
