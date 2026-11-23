/* ==========================================================
   ONEVEA — procedural 3D smart eyewear (Three.js r128)
   window.OneveaGlasses(canvas, options) -> controller
   ========================================================== */
(function () {
  const MODES = {
    day:   { lens: 0xf3d9a4, opacity: 0.28, emissive: 0x2a1c05, glow: 0.0, frame: 0xe9e1cc, wire: false },
    night: { lens: 0x7ef9ff, opacity: 0.55, emissive: 0x0b6b70, glow: 1.0, frame: 0xcfc8b6, wire: false },
    focus: { lens: 0x8a0d0d, opacity: 0.62, emissive: 0x3e0101, glow: 0.5, frame: 0xfdf4df, wire: true }
  };

  // Lens outline: a slightly wayfarer "D" shape
  function lensPath(p, w, h, inset) {
    const x0 = -w / 2 + inset, x1 = w / 2 - inset;
    const y0 = -h / 2 + inset, y1 = h / 2 - inset;
    const rt = 0.16, rb = 0.46 - inset * 0.6;
    p.moveTo(x0 + rt, y1);
    p.lineTo(x1 - rt, y1 + 0.02);
    p.quadraticCurveTo(x1, y1, x1, y1 - rt);
    p.lineTo(x1 - 0.02, y0 + rb);
    p.quadraticCurveTo(x1 - 0.06, y0, x1 - rb, y0);
    p.lineTo(x0 + rb, y0);
    p.quadraticCurveTo(x0 + 0.04, y0, x0 + 0.02, y0 + rb);
    p.lineTo(x0, y1 - rt);
    p.quadraticCurveTo(x0, y1, x0 + rt, y1);
    return p;
  }

  window.OneveaGlasses = function (canvas, opts) {
    opts = Object.assign({ interactive: true, particles: true, autoSpin: false, startFolded: true }, opts || {});
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    // Lights — warm key, cyan + red rims for chromatic edges
    scene.add(new THREE.AmbientLight(0xfdf4df, 0.35));
    const key = new THREE.DirectionalLight(0xfff4df, 1.3); key.position.set(3, 4, 6); scene.add(key);
    const rimC = new THREE.PointLight(0x7ef9ff, 2.2, 20); rimC.position.set(-5, 1, -3); scene.add(rimC);
    const rimR = new THREE.PointLight(0xff3344, 1.6, 20); rimR.position.set(5, -2, -2); scene.add(rimR);
    const front = new THREE.PointLight(0xfdf4df, 0.8, 30); front.position.set(0, 0, 8); scene.add(front);

    const root = new THREE.Group(); scene.add(root);
    const rig = new THREE.Group(); root.add(rig);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0xe9e1cc, metalness: 0.55, roughness: 0.32 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x15130f, metalness: 0.8, roughness: 0.25 });
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0xf3d9a4, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1,
      clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x2a1c05, side: THREE.DoubleSide
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x7ef9ff, transparent: true, opacity: 0 });
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xfdf4df });

    const W = 1.9, H = 1.22, LX = 1.17, DEPTH = 0.16;
    const extrude = { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 4, curveSegments: 32 };

    const sides = [];
    [-1, 1].forEach((s) => {
      const side = new THREE.Group();
      side.position.x = s * LX;
      // Frame ring
      const shape = lensPath(new THREE.Shape(), W, H, 0);
      shape.holes.push(lensPath(new THREE.Path(), W, H, 0.13));
      const fg = new THREE.ExtrudeGeometry(shape, extrude); fg.translate(0, 0, -DEPTH / 2);
      const frame = new THREE.Mesh(fg, frameMat); side.add(frame);
      // Lens
      const lg = new THREE.ShapeGeometry(lensPath(new THREE.Shape(), W, H, 0.11), 32);
      const lens = new THREE.Mesh(lg, lensMat); lens.position.z = 0.01; side.add(lens);
      // Lens glow layer (night mode)
      const glow = new THREE.Mesh(lg, glowMat); glow.position.z = 0.03; glow.scale.setScalar(0.98); side.add(glow);
      // Top bar accent
      const bar = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.06, 0.08), darkMat);
      bar.position.set(0, H / 2 + 0.035, 0.08); side.add(bar);
      // Sensor cam + LED on outer corner
      const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 24), darkMat);
      cam.rotation.x = Math.PI / 2; cam.position.set(s * (W / 2 - 0.22), H / 2 - 0.2, DEPTH / 2 + 0.06); side.add(cam);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), ledMat);
      led.position.set(s * (W / 2 - 0.22), H / 2 - 0.2, DEPTH / 2 + 0.11); side.add(led);
      // Hinge
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.3), frameMat);
      hinge.position.set(s * (W / 2 + 0.05), H / 2 - 0.3, -0.1); side.add(hinge);
      // Temple arm on a pivot so it can fold
      const pivot = new THREE.Group(); pivot.position.set(s * (W / 2 + 0.08), H / 2 - 0.3, -0.22); side.add(pivot);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.02, -1.4),
        new THREE.Vector3(0, -0.05, -2.6), new THREE.Vector3(0, -0.45, -3.2)
      ]);
      const arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.055, 10, false), frameMat); pivot.add(arm);
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 20), darkMat);
      pod.rotation.x = Math.PI / 2; pod.position.set(0, 0, -1.0); pivot.add(pod);
      // Nose pad
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), lensMat);
      pad.scale.set(0.6, 1, 0.6); pad.position.set(-s * (W / 2 - 0.1), -0.25, -0.18); side.add(pad);

      side.userData = { pivot, s };
      rig.add(side); sides.push(side);
    });

    // Bridge
    const bridgeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.24, 0.28, 0), new THREE.Vector3(0, 0.44, 0.06), new THREE.Vector3(0.24, 0.28, 0)
    ]);
    rig.add(new THREE.Mesh(new THREE.TubeGeometry(bridgeCurve, 24, 0.06, 10, false), frameMat));
    const topBridge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.08), darkMat);
    topBridge.position.set(0, H / 2 + 0.035, 0.08); rig.add(topBridge);

    // Wireframe ghost (focus mode / scan)
    const ghost = rig.clone(true);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xfdf4df, wireframe: true, transparent: true, opacity: 0 });
    ghost.traverse((o) => { if (o.isMesh) o.material = wireMat; });
    ghost.scale.setScalar(1.002);
    root.add(ghost);

    // Particles
    let points;
    if (opts.particles) {
      const n = 520, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const r = 3 + Math.random() * 5, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t) * 0.6; pos[i * 3 + 2] = r * Math.cos(p) - 2;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      points = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfdf4df, size: 0.025, transparent: true, opacity: 0.6 }));
      scene.add(points);
    }

    // State
    const state = { fold: opts.startFolded ? 1 : 0, rx: 0.12, ry: -0.45, scroll: 0, mx: 0, my: 0, tx: 0, ty: 0, glow: 0, wire: 0, spin: 0 };
    root.scale.setScalar(opts.startFolded ? 0.001 : 1);

    function applyFold() {
      sides.forEach((sd) => { sd.userData.pivot.rotation.y = -sd.userData.s * state.fold * Math.PI * 0.48; });
      ghost.children.forEach((c, i) => {
        if (c.children.length > 5) {
          const pv = c.children.find((k) => k.type === "Group");
          if (pv) pv.rotation.y = -(i === 0 ? -1 : 1) * state.fold * Math.PI * 0.48;
        }
      });
    }

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const needW = opts.fitWidth || 6.2;
      camera.position.z = Math.max(9.5, needW / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * camera.aspect));
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize); resize();

    if (opts.interactive) {
      window.addEventListener("pointermove", (e) => {
        state.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        state.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      });
    }

    let visible = true;
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(canvas);

    const clock = new THREE.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      if (!visible) return;
      const t = clock.getElapsedTime();
      state.mx += (state.tx - state.mx) * 0.05; state.my += (state.ty - state.my) * 0.05;
      if (opts.autoSpin) state.spin += 0.004;
      root.rotation.y = state.ry + state.mx * 0.45 + state.spin + state.scroll * Math.PI * 2;
      root.rotation.x = state.rx + state.my * 0.25 + Math.sin(t * 0.6) * 0.03;
      root.position.y = Math.sin(t * 0.9) * 0.08;
      applyFold();
      glowMat.opacity = state.glow * (0.25 + Math.sin(t * 3) * 0.08);
      wireMat.opacity = state.wire * 0.35;
      ledMat.color.setHSL(0.12, 0.6, 0.6 + Math.sin(t * 4) * 0.3);
      if (points) { points.rotation.y = t * 0.03; points.rotation.x = Math.sin(t * 0.2) * 0.1; }
      renderer.render(scene, camera);
    })();

    const tw = (target, vars) => (window.gsap ? gsap.to(target, vars) : Object.assign(target, vars));

    return {
      state, root,
      intro(delay) {
        if (!window.gsap) { root.scale.setScalar(1); state.fold = 0; return; }
        const tl = gsap.timeline({ delay: delay || 0 });
        tl.fromTo(root.scale, { x: .001, y: .001, z: .001 }, { x: 1, y: 1, z: 1, duration: 1.6, ease: "expo.out" })
          .fromTo(state, { ry: -Math.PI * 1.5 }, { ry: -0.45, duration: 2.2, ease: "expo.out" }, 0)
          .to(state, { fold: 0, duration: 1.4, ease: "power3.inOut" }, 0.7)
          .fromTo(state, { wire: 1 }, { wire: 0, duration: 1.6, ease: "power2.out" }, 0.4);
        return tl;
      },
      setMode(name) {
        const m = MODES[name] || MODES.day;
        const c = new THREE.Color(m.lens), e = new THREE.Color(m.emissive), f = new THREE.Color(m.frame);
        tw(lensMat.color, { r: c.r, g: c.g, b: c.b, duration: 0.8 });
        tw(lensMat.emissive, { r: e.r, g: e.g, b: e.b, duration: 0.8 });
        tw(frameMat.color, { r: f.r, g: f.g, b: f.b, duration: 0.8 });
        tw(lensMat, { opacity: m.opacity, duration: 0.8 });
        tw(state, { glow: m.glow, wire: m.wire ? 1 : 0, duration: 0.8 });
        if (window.gsap) gsap.fromTo(state, { spin: state.spin }, { spin: state.spin + Math.PI * 2, duration: 1.4, ease: "expo.inOut" });
      },
      setTint(p) { // p 0..1 light level -> lens darkens in bright light
        lensMat.opacity = 0.15 + p * 0.7;
        const c = new THREE.Color().setHSL(0.1 - p * 0.08, 0.5, 0.75 - p * 0.6);
        lensMat.color.copy(c);
      },
      setScroll(p) { state.scroll = p; }
    };
  };
})();
