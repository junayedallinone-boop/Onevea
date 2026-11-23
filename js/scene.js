/* ==========================================================
   ONEVEA — Light-range comparator
   Halftone night-road scene, split into naked eye vs. through-lens.
   window.OneveaScene(box) -> { setLevel(p 0..1), setSplit(s 0..1) }
   ========================================================== */
(function () {
  window.OneveaScene = function (box) {
    const canvas = box.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const off = document.createElement("canvas");
    const octx = off.getContext("2d", { willReadFrequently: true });
    const splitEl = box.querySelector(".range__split");
    const state = { P: 0.38, target: 0.38, split: 0.5, splitT: 0.5 };
    let W = 0, H = 0, cell = 6, cols = 0, rows = 0, dpr = 1, visible = false;

    // Static scene data (normalised coordinates)
    const rnd = (a, b) => a + Math.random() * (b - a);
    const stars = Array.from({ length: 140 }, () => [Math.random(), Math.random() * 0.5, Math.random() * 6.28]);
    const ridge = (n, amp, base) => {
      const ph = Array.from({ length: 4 }, () => rnd(0, 6.28));
      return Array.from({ length: n + 1 }, (_, i) => {
        const x = i / n;
        return base - amp * (0.55 * Math.sin(x * 5 + ph[0]) + 0.3 * Math.sin(x * 11 + ph[1]) + 0.15 * Math.sin(x * 23 + ph[2]) + 0.5);
      });
    };
    const ridges = [ridge(80, 0.16, 0.6), ridge(80, 0.11, 0.65), ridge(80, 0.07, 0.69)];
    const trees = Array.from({ length: 34 }, () => {
      const side = Math.random() < 0.5 ? -1 : 1;
      const d = Math.random();
      return { x: 0.5 + side * (0.1 + d * 0.45 + Math.random() * 0.05), d };
    }).sort((a, b) => a.d - b.d);

    function size() {
      const r = box.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = Math.round(r.width * dpr);
      H = canvas.height = Math.round(r.height * dpr);
      cell = Math.max(4, Math.round((r.width < 500 ? 5 : 6.5) * dpr));
      cols = Math.ceil(W / cell); rows = Math.ceil(H / cell);
      off.width = cols; off.height = rows;
    }

    // Scene drawn in grey luminance only; halftone pass turns it into dots
    function drawScene(t, p) {
      const c = octx, g = (l, a = 1) => { const v = Math.round(Math.max(0, Math.min(1, l)) * 255); return `rgba(${v},${v},${v},${a})`; };
      c.setTransform(cols, 0, 0, rows, 0, 0);
      const horizon = 0.7;
      // sky
      const sky = c.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, g(0.02 + p * 0.62)); sky.addColorStop(1, g(0.1 + p * 0.82));
      c.fillStyle = sky; c.fillRect(0, 0, 1, horizon);
      // stars
      const sa = Math.max(0, 1 - p * 2.2);
      if (sa > 0) stars.forEach(([x, y, ph]) => { c.fillStyle = g(0.9, sa * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + ph)))); c.fillRect(x, y, 0.006, 0.008); });
      // moon / sun with glow
      const sx = 0.72, sy = 0.42 - p * 0.3, sr = 0.045 + p * 0.02;
      const glow = c.createRadialGradient(sx, sy, 0, sx, sy, 0.3 + p * 0.25);
      glow.addColorStop(0, g(1, 0.45 + p * 0.45)); glow.addColorStop(1, g(1, 0));
      c.fillStyle = glow; c.fillRect(0, 0, 1, horizon);
      c.fillStyle = g(0.95 + p * 0.05); c.beginPath(); c.arc(sx, sy, sr, 0, 6.29); c.fill();
      // mountain ridges (far = lighter haze)
      ridges.forEach((rg, i) => {
        const drift = Math.sin(t * 0.05 + i) * 0.004 * (i + 1);
        c.fillStyle = g((0.06 + p * 0.55) * [0.75, 0.5, 0.3][i]);
        c.beginPath(); c.moveTo(0, 1);
        rg.forEach((y, k) => c.lineTo(k / (rg.length - 1) + drift, y));
        c.lineTo(1, 1); c.closePath(); c.fill();
      });
      // ground
      c.fillStyle = g(0.03 + p * 0.3); c.fillRect(0, horizon, 1, 1 - horizon);
      // road
      c.fillStyle = g(0.07 + p * 0.38);
      c.beginPath(); c.moveTo(0.49, horizon); c.lineTo(0.51, horizon); c.lineTo(0.85, 1); c.lineTo(0.15, 1); c.closePath(); c.fill();
      // centre dashes rushing toward viewer
      for (let i = 0; i < 8; i++) {
        const s = ((i / 8 + t * 0.12) % 1), z = s * s;
        const y = horizon + z * (1 - horizon), w = 0.002 + z * 0.012, h = 0.004 + z * 0.04;
        c.fillStyle = g(0.35 + p * 0.4); c.fillRect(0.5 - w / 2, y, w, h);
      }
      // roadside trees
      trees.forEach((tr) => {
        const z = 0.15 + tr.d * 0.85, y = horizon + z * z * (1 - horizon) * 0.95;
        const x = 0.5 + (tr.x - 0.5) * (0.25 + z), h = 0.04 + z * 0.22, w = h * 0.32;
        c.fillStyle = g((0.02 + p * 0.22) * (1 - z * 0.4));
        c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + w, y); c.lineTo(x - w, y); c.closePath(); c.fill();
      });
      // oncoming car headlights
      const cs = (t * 0.09) % 1, cz = cs * cs, cy = horizon + cz * (1 - horizon) * 0.9, cx = 0.47 - cz * 0.12;
      const hr = 0.01 + cz * 0.12;
      [-1, 1].forEach((k) => {
        const hx = cx + k * (0.004 + cz * 0.05);
        const hl = c.createRadialGradient(hx, cy, 0, hx, cy, hr);
        hl.addColorStop(0, g(1, 0.95)); hl.addColorStop(1, g(1, 0));
        c.fillStyle = hl; c.fillRect(hx - hr, cy - hr, hr * 2, hr * 2);
      });
      // walker on the road shoulder
      const fz = 0.55, fy = horizon + fz * fz * (1 - horizon) + 0.07, fx = 0.62 + Math.sin(t * 0.25) * 0.04;
      const fh = 0.11, step = Math.sin(t * 6) * 0.008;
      c.fillStyle = g(0.04 + p * 0.12);
      c.beginPath(); c.arc(fx, fy - fh, fh * 0.13, 0, 6.29); c.fill();
      c.fillRect(fx - fh * 0.1, fy - fh * 0.88, fh * 0.2, fh * 0.5);
      c.fillRect(fx - fh * 0.08 + step, fy - fh * 0.4, fh * 0.07, fh * 0.4);
      c.fillRect(fx + fh * 0.01 - step, fy - fh * 0.4, fh * 0.07, fh * 0.4);
      c.setTransform(1, 0, 0, 1, 0, 0);
      return { fx, fy, fh };
    }

    function frame(now) {
      requestAnimationFrame(frame);
      state.P += (state.target - state.P) * 0.08;
      state.split += (state.splitT - state.split) * 0.18;
      if (!visible || !cols) return;
      const t = now / 1000, P = state.P;
      const fig = drawScene(t, P);
      const data = octx.getImageData(0, 0, cols, rows).data;
      const night = Math.max(0, 0.55 - P) / 0.55;      // 1 = darkest
      const glare = Math.max(0, P - 0.55) / 0.45;       // 1 = full sun
      const sx = state.split * W;

      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      const left = new Path2D(), right = new Path2D();
      const maxR = cell * 0.56;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = (j * cols + i) * 4;
          const lum = data[k] / 255;
          const x = i * cell + cell / 2, y = j * cell + cell / 2;
          let L;
          if (x < sx) {
            // naked eye: night crushes detail, sun blows it out
            L = Math.pow(lum, 1 + night * 1.4) * (0.35 + 0.65 * (1 - night * 0.6));
            L = Math.min(1, L + glare * glare * 0.9 + glare * lum * 0.8);
          } else {
            // Onevea: gain in the dark, tone-mapped glare in the sun
            const gain = 1 + night * 2.2;
            L = Math.min(1, Math.pow(lum * gain, 0.85 - night * 0.2)) * 0.92;
            L = L * (1 - glare * 0.3);
          }
          const r = maxR * Math.sqrt(L);
          if (r < 0.35) continue;
          const path = x < sx ? left : right;
          path.moveTo(x + r, y); path.arc(x, y, r, 0, 6.2832);
        }
      }
      ctx.fillStyle = "#fdf4df"; ctx.fill(left);
      const cyan = night > 0.05;
      ctx.fillStyle = cyan ? `rgb(${Math.round(253 - night * 80)},${Math.round(244 - night * 4)},${Math.round(223 + night * 14)})` : "#fdf4df";
      ctx.fill(right);

      // Lens-side HUD: tracking bracket on the walker + horizon tick marks
      const bx = fig.fx * W, by = (fig.fy - fig.fh * 1.2) * H, bw = fig.fh * H * 0.6, bh = fig.fh * H * 1.3;
      if (bx > sx + bw) {
        const pulse = 1 + Math.sin(t * 5) * 0.05;
        ctx.save(); ctx.translate(bx, by + bh / 2); ctx.scale(pulse, pulse);
        ctx.strokeStyle = "#fdf4df"; ctx.lineWidth = 1.5 * dpr;
        const q = 8 * dpr, hw = bw / 2 + 6 * dpr, hh = bh / 2 + 6 * dpr;
        ctx.beginPath();
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => {
          ctx.moveTo(a * hw, b * hh + -b * q); ctx.lineTo(a * hw, b * hh); ctx.lineTo(a * hw + -a * q, b * hh);
        });
        ctx.stroke(); ctx.restore();
        const label = `HUMAN · ${Math.round(38 + Math.sin(t * 0.25) * 4)}M`;
        ctx.font = `${Math.round(10 * dpr)}px "JetBrains Mono", monospace`;
        const lx = bx - bw / 2 - 6 * dpr, ly = by - 12 * dpr, lw = ctx.measureText(label).width;
        ctx.fillStyle = "#fdf4df"; ctx.fillRect(lx - 4 * dpr, ly - 11 * dpr, lw + 8 * dpr, 15 * dpr);
        ctx.fillStyle = "#000"; ctx.fillText(label, lx, ly);
      }
      ctx.strokeStyle = "rgba(253,244,223,.5)"; ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      for (let x = Math.ceil(sx / (40 * dpr)) * 40 * dpr; x < W; x += 40 * dpr) { ctx.moveTo(x, 0.7 * H - 4 * dpr); ctx.lineTo(x, 0.7 * H + 4 * dpr); }
      ctx.stroke();

      splitEl.style.left = state.split * 100 + "%";
    }

    // Drag to compare
    let dragging = false;
    const setFromEvent = (e) => {
      const r = box.getBoundingClientRect();
      state.splitT = Math.min(0.97, Math.max(0.03, (e.clientX - r.left) / r.width));
    };
    box.addEventListener("pointerdown", (e) => { dragging = true; box.setPointerCapture(e.pointerId); setFromEvent(e); });
    box.addEventListener("pointermove", (e) => { if (dragging || e.pointerType === "mouse") setFromEvent(e); });
    box.addEventListener("pointerup", () => (dragging = false));
    box.addEventListener("pointerleave", () => { if (!dragging) state.splitT = 0.5; });

    new IntersectionObserver((en) => (visible = en[0].isIntersecting)).observe(box);
    window.addEventListener("resize", size);
    size(); requestAnimationFrame(frame);

    return {
      state,
      setLevel(p) { state.target = p; },
      setSplit(s) { state.splitT = s; }
    };
  };
})();
