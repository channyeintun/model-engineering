/* =========================================================================
   Browser-side figure audit. Static checking cannot tell you that a bar
   grew past the top of its own stage, so this steps every scene through
   its whole timeline and measures what actually rendered.

   In the browser console on any lesson page:

       (await import('/tools/audit.js')).audit()

   Reports, per scene: the number of steps, and any element whose real
   rendered box (transforms included) leaves the SVG viewBox.
   ========================================================================= */

export function audit(opts) {
  opts = opts || {};
  const pad = opts.pad != null ? opts.pad : 4;
  const out = [];

  document.querySelectorAll('[data-scene]').forEach((el) => {
    const id = el.getAttribute('data-scene');
    const inst = window.Scene && window.Scene.get(id);
    if (!inst) { out.push({ scene: id, problem: 'NO BUILDER RAN' }); return; }

    const svg = el.querySelector('.scene__stage svg');
    if (!svg) { out.push({ scene: id, problem: 'no <svg> in the stage' }); return; }

    const vb = svg.viewBox.baseVal;
    const tl = inst.tl;
    const issues = {};

    /* Sample at every step boundary, and at the very end. */
    const times = Object.keys(tl.labels)
      .map((l) => tl.labels[l])
      .sort((a, b) => a - b)
      .concat([tl.duration()]);

    tl.pause();
    times.forEach((t, ti) => {
      tl.seek(t, false);   // false = let callbacks run, so captions/state are real
      svg.querySelectorAll('rect,circle,text,path,line,ellipse,polygon').forEach((n) => {
        const st = getComputedStyle(n);
        if (st.display === 'none' || parseFloat(st.opacity) < 0.03) return;

        let b;
        try { b = n.getBBox(); } catch (e) { return; }
        if (!b || (b.width === 0 && b.height === 0)) return;

        /* GSAP writes transforms, so the declared x/y is not where it is. */
        const m = n.getCTM && n.getCTM();
        const corners = [[b.x, b.y], [b.x + b.width, b.y],
                         [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]];
        const xs = [], ys = [];
        for (const [px, py] of corners) {
          if (m) { xs.push(m.a * px + m.c * py + m.e); ys.push(m.b * px + m.d * py + m.f); }
          else { xs.push(px); ys.push(py); }
        }
        const x0 = Math.min(...xs), x1 = Math.max(...xs);
        const y0 = Math.min(...ys), y1 = Math.max(...ys);

        const bad = [];
        if (x0 < vb.x - pad) bad.push(`left ${Math.round(x0)}`);
        if (x1 > vb.x + vb.width + pad) bad.push(`right ${Math.round(x1)} > ${vb.width}`);
        if (y0 < vb.y - pad) bad.push(`top ${Math.round(y0)}`);
        if (y1 > vb.y + vb.height + pad) bad.push(`bottom ${Math.round(y1)} > ${vb.height}`);

        if (bad.length) {
          const label = (n.textContent || '').trim().slice(0, 24);
          const key = `<${n.tagName}${label ? ' "' + label + '"' : ''}> ${bad.join(', ')}`;
          if (!issues[key]) issues[key] = `first at step ${ti}`;
        }
      });
    });

    tl.progress(0).pause();

    const keys = Object.keys(issues);
    out.push(keys.length
      ? { scene: id, steps: inst.steps.length, overflow: keys.slice(0, 8) }
      : { scene: id, steps: inst.steps.length, ok: true });
  });

  return out;
}

/* =========================================================================
   Overlap audit. The bounds check above catches a shape that leaves its
   stage; it says nothing about two shapes landing on the same spot, which
   is the other way a figure goes wrong — a row sliding under its own
   labels, or a second act drawn on top of a first one that was only dimmed.

   Two things are reported:

     collide  two visible <text> elements sharing space. Text on text is
              essentially never intentional.
     buried   a visible <text> covered by a shape painted after it that has
              a solid fill, so the reader sees the shape and not the words.

   In the browser console on any lesson page:

       (await import('/tools/audit.js')).collisions()
   ========================================================================= */

export function collisions(opts) {
  opts = opts || {};
  const minFrac = opts.minFrac != null ? opts.minFrac : 0.12;
  const minArea = opts.minArea != null ? opts.minArea : 20;
  const out = [];

  /* Opacity is inherited multiplicatively, and these scenes fade whole
     groups, so the element's own computed opacity is not the whole story. */
  const effOpacity = (n, root) => {
    let o = 1;
    for (let p = n; p && p !== root.parentNode; p = p.parentNode) {
      if (p.nodeType !== 1) break;
      const v = parseFloat(getComputedStyle(p).opacity);
      if (!isNaN(v)) o *= v;
    }
    return o;
  };

  const boxOf = (n) => {
    let b;
    try { b = n.getBBox(); } catch (e) { return null; }
    if (!b || (b.width === 0 && b.height === 0)) return null;
    const m = n.getCTM && n.getCTM();
    const pts = [[b.x, b.y], [b.x + b.width, b.y],
                 [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]];
    const xs = [], ys = [];
    for (const [px, py] of pts) {
      if (m) { xs.push(m.a * px + m.c * py + m.e); ys.push(m.b * px + m.d * py + m.f); }
      else { xs.push(px); ys.push(py); }
    }
    return { x0: Math.min(...xs), x1: Math.max(...xs),
             y0: Math.min(...ys), y1: Math.max(...ys) };
  };

  const inter = (a, b) => {
    const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    return (w > 0 && h > 0) ? w * h : 0;
  };
  const area = (a) => Math.max(1, (a.x1 - a.x0) * (a.y1 - a.y0));
  const say = (n) => (n.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);

  /* A translucent wash over a token is a highlight, not a mistake. The only
     covers worth reporting are the ones you cannot read through. */
  const fillAlpha = (f) => {
    const m = /rgba?\(([^)]+)\)/.exec(f || '');
    if (!m) return 1;
    const parts = m[1].split(/[,\/]/).map((x) => parseFloat(x));
    return parts.length > 3 && !isNaN(parts[3]) ? parts[3] : 1;
  };

  document.querySelectorAll('[data-scene]').forEach((el) => {
    const id = el.getAttribute('data-scene');
    const inst = window.Scene && window.Scene.get(id);
    const svg = el.querySelector('.scene__stage svg');
    if (!inst || !svg) return;

    const tl = inst.tl;
    const found = {};
    const times = Object.keys(tl.labels).map((l) => tl.labels[l])
      .sort((a, b) => a - b).concat([tl.duration()]);

    tl.pause();
    times.forEach((t, ti) => {
      tl.seek(t, false);

      const painted = [];
      svg.querySelectorAll('text,rect,circle,ellipse,polygon,path').forEach((n) => {
        const st = getComputedStyle(n);
        if (st.display === 'none') return;
        const o = effOpacity(n, svg);
        if (o < 0.15) return;
        const box = boxOf(n);
        if (box) painted.push({ n, box, o, tag: n.tagName.toLowerCase(), fill: st.fill });
      });

      const texts = painted.filter((p) => p.tag === 'text');

      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i], b = texts[j];
          const ov = inter(a.box, b.box);
          if (ov < minArea || ov / Math.min(area(a.box), area(b.box)) < minFrac) continue;
          const key = `collide "${say(a.n)}" × "${say(b.n)}"`;
          if (!found[key]) found[key] = `step ${ti}`;
        }
      }

      texts.forEach((t0) => {
        const after = painted.slice(painted.indexOf(t0) + 1);
        after.forEach((s) => {
          if (s.tag === 'text' || s.fill === 'none' || !s.fill) return;
          if (s.o < 0.85 || fillAlpha(s.fill) < 0.85) return;   // a wash is meant to show through
          if (s.n.contains(t0.n)) return;
          const ov = inter(t0.box, s.box);
          if (ov / area(t0.box) < 0.6) return;
          const key = `buried "${say(t0.n)}" under <${s.tag}>`;
          if (!found[key]) found[key] = `step ${ti}`;
        });
      });
    });

    tl.progress(0).pause();

    const keys = Object.keys(found);
    if (keys.length) out.push({ scene: id, issues: keys.map((k) => `${k} (${found[k]})`) });
  });

  return out;
}
