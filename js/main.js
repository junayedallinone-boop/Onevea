/* ==========================================================
   ONEVEA — interactions & animation
   ========================================================== */
(function () {
  const hasGsap = !!window.gsap;
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  /* ---------- Split text into chars ---------- */
  function splitChars(el) {
    if (el.dataset.splitDone) return $$(".char", el);
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach((ch) => {
            if (ch === " " || ch === "\n") { frag.appendChild(document.createTextNode(" ")); return; }
            const s = document.createElement("span"); s.className = "char"; s.textContent = ch; frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains("dot")) walk(n);
      });
    };
    walk(el); el.dataset.splitDone = 1;
    return $$(".char", el);
  }

  /* ---------- Cursor ---------- */
  const cursor = $(".cursor");
  if (cursor && matchMedia("(hover: hover)").matches) {
    const ring = $(".cursor__ring", cursor), dot = $(".cursor__dot", cursor), label = $(".cursor__label", cursor);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; });
    (function follow() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      label.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    })();
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("a, button, [data-cursor], input, textarea, select");
      cursor.classList.toggle("is-hover", !!t);
      label.textContent = t && t.dataset.cursor ? t.dataset.cursor : "";
    });
  }

  /* ---------- Text scramble ---------- */
  const GLYPHS = "ONEVA/\\<>_#01X+*";
  function scramble(el, finalText, dur = 600) {
    const text = finalText || el.dataset.text || el.textContent;
    el.dataset.text = text;
    const start = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = [...text].map((c, i) => (c === " " ? " " : i / text.length < p ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }
  $$("[data-scramble]").forEach((el) => el.addEventListener("mouseenter", () => scramble(el)));

  /* ---------- Magnetic ---------- */
  $$("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (hasGsap) gsap.to(el, { x: dx * 0.3, y: dy * 0.4, duration: 0.5, ease: "power3.out" });
    });
    el.addEventListener("pointerleave", () => hasGsap && gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, .4)" }));
  });

  /* ---------- Mobile menu ---------- */
  const mm = $(".mobile-menu");
  if (mm && hasGsap) {
    const links = $$("a", mm);
    $(".menu-btn").addEventListener("click", () => {
      mm.classList.add("is-open");
      gsap.to(mm, { clipPath: "inset(0 0 0% 0)", duration: 0.8, ease: "expo.inOut" });
      gsap.fromTo(links, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.08, delay: 0.35, duration: 0.8, ease: "expo.out" });
    });
    $(".mobile-menu__close").addEventListener("click", () => {
      gsap.to(mm, { clipPath: "inset(0 0 100% 0)", duration: 0.7, ease: "expo.inOut", onComplete: () => mm.classList.remove("is-open") });
    });
  }

  /* ---------- Page transition ---------- */
  const wipe = document.createElement("div");
  wipe.style.cssText = "position:fixed;inset:0;z-index:960;background:#fdf4df;transform:scaleY(0);transform-origin:bottom;pointer-events:none";
  document.body.appendChild(wipe);
  $$("a[href$='.html']").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!hasGsap || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      gsap.to(wipe, { scaleY: 1, duration: 0.6, ease: "expo.inOut", onComplete: () => (location.href = href) });
    });
  });
  addEventListener("pageshow", () => { if (hasGsap) gsap.set(wipe, { scaleY: 0 }); });

  /* ---------- HUD: progress, fps, clock ---------- */
  const prog = $(".hud__progress i"), pct = $(".hud__pct"), fpsEl = $(".hud__fps");
  addEventListener("scroll", () => {
    const p = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (prog) prog.style.transform = `scaleY(${p})`;
    if (pct) pct.textContent = String(Math.round(p * 100)).padStart(3, "0");
  }, { passive: true });
  if (fpsEl) {
    let frames = 0, last = performance.now();
    (function f(now) { frames++; if (now - last > 500) { fpsEl.textContent = Math.round(frames * 1000 / (now - last)); frames = 0; last = now; } requestAnimationFrame(f); })(last);
  }
  const clock = $(".js-clock");
  if (clock) setInterval(() => (clock.textContent = new Date().toLocaleTimeString("en-GB")), 1000);
  $$(".js-totop").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); }));

  /* ---------- 3D glasses ---------- */
  let g1 = null, g2 = null;
  const c1 = $("#glasses-canvas"), c2 = $("#glasses-canvas-2");
  try {
    if (window.THREE && window.OneveaGlasses) {
      if (c1) g1 = OneveaGlasses(c1, { fitWidth: 8 });
      if (c2) g2 = OneveaGlasses(c2, { fitWidth: 7.2, particles: false, startFolded: false, interactive: false });
    }
  } catch (err) { console.warn("WebGL unavailable", err); }
  // chromatic edge, like a scanned print
  [c1, c2].forEach((c) => c && (c.style.filter = "drop-shadow(2px 0 0 rgba(255,40,70,.55)) drop-shadow(-2px 0 0 rgba(90,230,255,.55))"));

  /* ---------- Hero modes ---------- */
  const modeName = $(".js-mode-name"), modeLabel = $(".mode-label");
  const MODE_TXT = { day: ["DAY / 0.28", "ADAPTIVE LENS LAYER ENGAGED"], night: ["NIGHT / ×6.0", "LOW-LIGHT AMPLIFICATION ACTIVE"], focus: ["FOCUS / 20-10", "EYE-TRACKED AUTOFOCUS LOCKED"] };
  $$(".mode").forEach((b) => b.addEventListener("click", () => {
    $$(".mode").forEach((x) => x.classList.toggle("is-active", x === b));
    const m = b.dataset.mode;
    if (g1) g1.setMode(m);
    if (modeName) scramble(modeName, MODE_TXT[m][0]);
    if (modeLabel) scramble(modeLabel, MODE_TXT[m][1], 800);
    if (hasGsap) gsap.fromTo(".lens-view svg", { scale: 0.94, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.8, ease: "expo.out" });
    const stage = $(".hero__stage");
    if (stage) stage.style.background = m === "night" ? "radial-gradient(circle at 50% 50%, rgba(126,249,255,.08), transparent 60%)" : m === "focus" ? "radial-gradient(circle at 50% 50%, rgba(74,3,3,.35), transparent 65%)" : "";
  }));

  /* ---------- Intro sequence ---------- */
  function heroIntro() {
    if (!hasGsap) return;
    const tl = gsap.timeline();
    tl.from(".header > *", { y: -30, opacity: 0, stagger: 0.08, duration: 0.9, ease: "expo.out" }, 0)
      .from(".hero__title .split-line > span, .page-hero__title .split-line > span", { yPercent: 110, stagger: 0.1, duration: 1.3, ease: "expo.out" }, 0.1)
      .from(".hero__title .dot", { scale: 0, duration: 1, ease: "back.out(3)" }, 0.6)
      .from(".hud__corner", { scale: 3, opacity: 0, stagger: 0.06, duration: 0.8, ease: "expo.out" }, 0.1)
      .from(".hero__grid", { opacity: 0, scale: 1.4, duration: 1.8, ease: "expo.out" }, 0)
      .from(".crosshair", { scaleX: 0, scaleY: 0, duration: 1.4, ease: "expo.inOut" }, 0)
      .from(".hero__ring", { opacity: 0, scale: 0.4, rotate: -90, duration: 1.8, ease: "expo.out" }, 0.2)
      .from(".hero__coord, .hero__status > div, .mode, .mode-label, .hero__foot, .page-hero__meta > *", { opacity: 0, y: 14, stagger: 0.05, duration: 0.7, ease: "power3.out" }, 0.5)
      .from(".lens-view text, .lens-view circle", { opacity: 0, stagger: 0.08, duration: 0.8, ease: "power2.out" }, 0.9);
    $$(".hero__bottom-labels [data-split-chars]").forEach((el, i) =>
      tl.from(splitChars(el), { opacity: 0, yPercent: 100, stagger: 0.03, duration: 0.6, ease: "expo.out" }, 0.8 + i * 0.1));
    if (g1) g1.intro(0);
    // number tickers
    $$("[data-num]").forEach((el) => {
      const o = { v: 0 }, dec = +el.dataset.dec || 0;
      tl.to(o, { v: +el.dataset.num, duration: 2, ease: "power2.out", onUpdate: () => (el.textContent = o.v.toFixed(dec)) }, 0.4);
    });
    $$(".lens-view path").forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 600;
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      gsap.to(p, { strokeDashoffset: 0, duration: 1.8, delay: 0.6, ease: "expo.inOut", onComplete: () => (p.style.strokeDasharray = "none") });
    });
    return tl;
  }

  const loader = $(".loader");
  function runLoader() {
    if (!loader || !hasGsap || reduce) {
      if (loader) loader.remove();
      document.body.classList.remove("is-loading");
      heroIntro(); return;
    }
    const count = $(".loader__count"), status = $(".loader__status");
    const msgs = ["CALIBRATING LENS", "SYNCING IRIS KEY", "MAPPING LIGHT RANGE", "OPTIC LAYER READY"];
    const o = { v: 0 };
    const tl = gsap.timeline();
    tl.to(".loader__brand span", { y: 0, stagger: 0.07, duration: 1, ease: "expo.out" })
      .to(".loader__bar i", { scaleX: 1, duration: 2.2, ease: "power2.inOut" }, 0.2)
      .to(o, { v: 100, duration: 2.2, ease: "power2.inOut", onUpdate: () => {
        count.textContent = String(Math.round(o.v)).padStart(3, "0");
        status.textContent = msgs[Math.min(3, Math.floor(o.v / 26))];
      } }, 0.2)
      .to(".loader__brand span", { y: "-110%", stagger: 0.04, duration: 0.7, ease: "expo.in" }, "+=0.15")
      .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 1, ease: "expo.inOut", onStart: () => { document.body.classList.remove("is-loading"); heroIntro(); } }, "-=0.2")
      .add(() => loader.remove());
  }
  // start right away — don't wait for webfonts/CDN "load"; fonts swap in while the loader plays
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]).then(runLoader);
  else runLoader();

  if (!hasGsap || !window.ScrollTrigger) {
    $$("[data-reveal]").forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });
    return;
  }

  /* ---------- Generic reveals ---------- */
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, stagger: 0.12, duration: 1.1, ease: "expo.out" })
  });
  $$(".split-line > span").forEach((el) => {
    if (el.closest(".hero__title, .page-hero__title")) return;
    gsap.from(el, { yPercent: 110, rotate: 3, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } });
  });
  $$("[data-split-chars]").forEach((el) => {
    if (el.closest(".hero__bottom-labels")) return;
    gsap.from(splitChars(el), { yPercent: 120, rotateX: -90, opacity: 0, stagger: 0.035, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });

  /* ---------- Marquees with scroll velocity ---------- */
  $$("[data-marquee]").forEach((track) => {
    const dir = +track.dataset.marquee;
    const tw = gsap.to(track, { xPercent: -50 * dir, duration: 22, ease: "none", repeat: -1 });
    if (dir < 0) gsap.set(track, { xPercent: -50 });
    ScrollTrigger.create({
      onUpdate: (self) => {
        const v = Math.min(4, 1 + Math.abs(self.getVelocity()) / 400);
        gsap.to(tw, { timeScale: v * (self.direction || 1), duration: 0.2, overwrite: true });
        gsap.to(tw, { timeScale: 1, duration: 1.2, delay: 0.2 });
      }
    });
    gsap.to(track, { skewX: () => 0, scrollTrigger: { trigger: track, onUpdate: (s) => gsap.to(track, { skewX: gsap.utils.clamp(-12, 12, s.getVelocity() / -200), duration: 0.3 }) } });
  });

  /* ---------- Hero parallax on scroll ---------- */
  if ($(".hero")) {
    gsap.to(".hero__title", { yPercent: -30, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero__stage", { scale: 0.92, filter: "blur(6px)", ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }

  /* ---------- Statement: pinned blur-to-sharp ---------- */
  const st = $("[data-blur-text]");
  if (st) {
    const chars = splitChars(st), rot = $(".js-rot");
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".statement", start: "top top", end: "+=180%", pin: true, scrub: 1,
        onUpdate: (s) => { if (g2) g2.setScroll(s.progress * 0.75); if (rot) rot.textContent = String(Math.round(s.progress * 270)).padStart(3, "0"); }
      }
    });
    tl.to(chars, { filter: "blur(0px)", opacity: 1, stagger: 0.04, duration: 0.5, ease: "power2.out" })
      .fromTo("#glasses-canvas-2", { scale: 1.6, opacity: 0 }, { scale: 0.9, opacity: 1, duration: chars.length * 0.04, ease: "power2.inOut" }, 0)
      .to(".statement__text", { scale: 0.92, duration: 0.6 }, ">-0.2");
  }

  /* ---------- Counters ---------- */
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count, dec = +el.dataset.dec || 0, o = { v: 0 };
    gsap.to(o, { v: end, duration: 2.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" }, onUpdate: () => (el.textContent = o.v.toFixed(dec)) });
  });

  /* ---------- Feature cards: tilt ---------- */
  $$(".feature, .value").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      gsap.to(card.querySelector(".feature__icon svg") || card, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 30, rotateX: -((e.clientY - r.top) / r.height - 0.5) * 30, transformPerspective: 600, duration: 0.6 });
    });
    card.addEventListener("pointerleave", () => gsap.to(card.querySelector(".feature__icon svg") || card, { rotateX: 0, rotateY: 0, duration: 0.8 }));
  });

  /* ---------- Light range scene ---------- */
  const sceneBox = $('.range__scene');
  if (sceneBox && window.OneveaScene) {
    const scene = OneveaScene(sceneBox);
    const input = $('.slider input'), fill = $('.slider__fill'), thumb = $('.slider__thumb');
    const luxEl = $('.js-lux'), tintEl = $('.js-tint'), gainEl = $('.js-gain'), rmodeEl = $('.js-rmode'), luxMini = $('.js-lux-mini'), timeEl = $('.js-scene-time');
    function update() {
      const p = input.value / 1000, lux = 10 * Math.pow(10, p * 4), pc = p * 100 + '%';
      fill.style.width = pc; thumb.style.left = pc;
      scene.setLevel(p);
      luxEl.textContent = fmt(lux); if (luxMini) luxMini.textContent = fmt(lux) + ' LX';
      tintEl.textContent = Math.round(p * 85) + '%';
      gainEl.textContent = '×' + Math.max(1, (1 - p) * 8).toFixed(1);
      const mode = p < 0.25 ? 'NIGHT' : p < 0.5 ? 'DUSK' : p < 0.75 ? 'DAY' : 'GLARE';
      rmodeEl.textContent = mode;
      if (timeEl) timeEl.textContent = { NIGHT: '02:10', DUSK: '20:40', DAY: '10:30', GLARE: '13:00' }[mode] + ' · ' + mode;
      if (g1) g1.setTint(p);
    }
    input.addEventListener('input', update); update();
    // demo on first view: sweep the light level and the split
    ScrollTrigger.create({ trigger: sceneBox, start: 'top 70%', once: true, onEnter: () => {
      const o = { v: +input.value };
      gsap.timeline()
        .fromTo(scene.state, { splitT: 0.08 }, { splitT: 0.5, duration: 1.6, ease: 'expo.inOut' })
        .to(o, { v: 60, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { input.value = o.v; update(); } }, 0.2)
        .to(o, { v: 940, duration: 2.4, ease: 'power2.inOut', onUpdate: () => { input.value = o.v; update(); } })
        .to(o, { v: 300, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { input.value = o.v; update(); } });
    } });
  }

  /* ---------- Iris + terminal ---------- */
  const fib = $(".js-iris-fibres");
  if (fib) {
    let d = "";
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * Math.PI * 2, r1 = 48 + Math.random() * 6, r2 = 110 + Math.random() * 38, wob = (Math.random() - 0.5) * 0.12;
      d += `M${200 + Math.cos(a) * r1} ${200 + Math.sin(a) * r1} L${200 + Math.cos(a + wob) * r2} ${200 + Math.sin(a + wob) * r2} `;
    }
    fib.innerHTML = `<path d="${d}"/>`;
    gsap.from(fib, { rotate: -120, scale: 0.3, opacity: 0, transformOrigin: "200px 200px", duration: 2, ease: "expo.out", scrollTrigger: { trigger: ".iris", start: "top 75%" } });
    const pupil = $(".js-pupil"), iris = $(".iris");
    addEventListener("pointermove", (e) => {
      const r = iris.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      gsap.to(pupil, { attr: { r: gsap.utils.clamp(26, 64, 26 + dist / 14) }, duration: 0.6 });
      gsap.to(fib, { x: (e.clientX - cx) / 60, y: (e.clientY - cy) / 60, duration: 0.8 });
    });
    const term = $(".js-terminal");
    const lines = [
      "> onevea.iris --scan", "  capturing 240 iris features ...", "  pattern hash  0x7F3A·91C2·E004",
      "  match score   99.982%", "  wearer        VERIFIED", "> lens.profile load --user",
      "  prescription  -1.25 / -1.00", "  focus map     synced", "<ok>READY. WELCOME BACK.</ok>"
    ];
    ScrollTrigger.create({ trigger: term, start: "top 80%", once: true, onEnter: async () => {
      for (const ln of lines) {
        const div = document.createElement("div");
        const ok = ln.startsWith("<ok>"); const txt = ln.replace(/<\/?ok>/g, "");
        if (ok) div.className = "ok"; term.appendChild(div);
        for (let i = 0; i <= txt.length; i++) { div.textContent = txt.slice(0, i); await new Promise((r) => setTimeout(r, 14)); }
        await new Promise((r) => setTimeout(r, 160));
      }
      const c = document.createElement("span"); c.className = "caret"; term.appendChild(c);
    } });
  }

  /* ---------- Tagline orb ---------- */
  if ($(".tagline__orb")) {
    gsap.fromTo(".tagline__orb", { scale: 0.2 }, { scale: 1.6, ease: "none", scrollTrigger: { trigger: ".tagline", start: "top bottom", end: "bottom top", scrub: true } });
  }

  /* ---------- Footer brand ---------- */
  const fb = $("[data-footer-brand]");
  if (fb) {
    gsap.from(splitChars(fb), { yPercent: 100, scaleY: 0.3, stagger: 0.06, ease: "expo.out", duration: 1.4, scrollTrigger: { trigger: fb, start: "top 95%" } });
  }

  /* ---------- About: timeline + page hero canvas ---------- */
  $$(".timeline__row").forEach((row) => {
    gsap.from(row, { opacity: 0, x: -60, duration: 1, ease: "expo.out", scrollTrigger: { trigger: row, start: "top 88%" } });
  });
  const phc = $(".page-hero__bg canvas");
  if (phc) {
    const ctx = phc.getContext("2d"); let w, h;
    const rs = () => { w = phc.width = phc.offsetWidth; h = phc.height = phc.offsetHeight; }; rs(); addEventListener("resize", rs);
    let mx = 0.5, my = 0.5; addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; });
    (function draw(now) {
      requestAnimationFrame(draw); const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      const cx = w * (0.55 + (mx - 0.5) * 0.1), cy = h * (0.45 + (my - 0.5) * 0.1);
      for (let i = 0; i < 26; i++) {
        const r = (i * 38 + t * 40) % (Math.max(w, h));
        ctx.strokeStyle = `rgba(253,244,223,${0.18 * (1 - r / Math.max(w, h))})`;
        ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.4, r * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(253,244,223,.12)";
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    })(0);
  }

  /* ---------- Contact form ---------- */
  $$(".field").forEach((f) => {
    const inp = f.querySelector("input, textarea, select");
    inp.addEventListener("focus", () => f.classList.add("is-focus"));
    inp.addEventListener("blur", () => { f.classList.remove("is-focus"); f.classList.toggle("is-filled", !!inp.value); });
  });
  $$(".chip").forEach((c) => c.addEventListener("click", () => { c.classList.toggle("is-on"); gsap.fromTo(c, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: "back.out(3)" }); }));
  const form = $(".form");
  if (form) {
    const st = $(".form__status");
    const say = (msg, kind) => { st.className = "form__status mono" + (kind ? " is-" + kind : ""); scramble(st, msg, 700); };
    const RULES = {
      name: (v) => (v.length < 2 ? "PLEASE ENTER YOUR NAME" : ""),
      email: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "PLEASE ENTER A VALID EMAIL" : ""),
      message: (v) => (v.length < 10 ? "TELL US A LITTLE MORE (10+ CHARACTERS)" : "")
    };
    const check = (inp) => {
      const rule = RULES[inp.name]; if (!rule) return true;
      const err = rule(inp.value.trim()), field = inp.closest(".field");
      field.classList.toggle("is-error", !!err);
      field.querySelector(".field__err").textContent = err;
      return !err;
    };
    $$("input[name], textarea[name]", form).forEach((inp) => {
      inp.addEventListener("blur", () => inp.value && check(inp));
      inp.addEventListener("input", () => inp.closest(".field.is-error") && check(inp));
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.classList.contains("is-sending")) return;
      const inputs = $$(".field input, .field textarea", form);
      const bad = inputs.filter((i) => !check(i));
      if (bad.length) {
        say("CHECK THE HIGHLIGHTED FIELDS", "bad");
        bad[0].focus();
        gsap.fromTo(bad.map((i) => i.closest(".field")), { x: -10 }, { x: 0, duration: 0.6, ease: "elastic.out(1, .3)" });
        return;
      }
      if (form.action.includes("YOUR_FORM_ID")) {
        console.warn("Onevea: set your Formspree form ID in contact.html (form action).");
        say("FORM NOT CONNECTED YET. EMAIL HELLO@ONEVEA.COM", "bad");
        return;
      }
      form.querySelector("[name=interests]").value = $$(".chip.is-on", form).map((c) => c.textContent.trim()).join(", ") || "Not specified";
      form.classList.add("is-sending");
      say("TRANSMITTING SIGNAL ...");
      try {
        const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data.errors || []).map((x) => x.message).join(", ") || "SERVER ERROR " + res.status);
        say("RECEIVED. WE WILL BE IN TOUCH WITHIN 48 HOURS.", "ok");
        form.reset();
        $$(".field").forEach((f) => f.classList.remove("is-filled", "is-error"));
        $$(".chip").forEach((c) => c.classList.remove("is-on"));
      } catch (err) {
        say("SIGNAL LOST: " + String(err.message || "NETWORK ERROR").toUpperCase() + ". PLEASE TRY AGAIN.", "bad");
      } finally {
        form.classList.remove("is-sending");
      }
    });
  }
})();
