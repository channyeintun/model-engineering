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
