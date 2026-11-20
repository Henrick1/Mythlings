Pets.register({
  id: "grilabaca",
  dex: 43,
  name: "Grilabaça",
  color: "#c98a3a",
  types: ["bug", "fighting"],
  description: "Um grilinho brigão que mora dentro de uma cabaça laqueada, como os grilos de briga criados na China. A cabaça cresceu dentro de um molde e saiu com relevos de nuvens e flores de lótus, e a tampa furada virou o chapéu dele, com as antenas passando pelos furinhos. Quando se assusta, entra na cabaça e se tampa.",
  actions: {
    jump: { duration: 1.3 },
    eat: { duration: 2.4 },
    jab: { duration: 1.4 },
    chirp: { duration: 2.4 },
    hide: { duration: 3.0 },
    sniff: { duration: 2.2 },
    taunt: { duration: 2.0 }
  },
  battle: { attack: { action: "jab", hit: 0.45, speed: 1.0 }, special: { action: "chirp", hit: 0.5, speed: 1.0 } },
  idle: [
    { action: "sniff", min: 10, max: 26 },
    { action: "chirp", min: 25, max: 60 },
    { action: "taunt", min: 35, max: 70 },
    { action: "hide", min: 45, max: 90 }
  ],
  clickAction: n => ["chirp", "jab", "hide", "taunt", "jump", "sniff"][(n - 1) % 6],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const TAU = Math.PI * 2;
    const hasDoc = typeof document !== "undefined";

    const root = new THREE.Group();
    const big = new THREE.Group();
    root.add(big);
    const pivot = new THREE.Group();
    pivot.position.set(0, 0, -0.25);
    big.add(pivot);
    const bodyG = new THREE.Group();
    bodyG.position.set(0, 0, 0.25);
    pivot.add(bodyG);

    const S0 = -0.02;
    const S1 = 1.16;
    const sOfV = v => S0 + v * (S1 - S0);
    const rawR = s => {
      const b1 = Math.sqrt(Math.max(0, 0.16 - (s - 0.38) * (s - 0.38)));
      const b2 = Math.sqrt(Math.max(0, 0.0729 - (s - 0.98) * (s - 0.98)));
      const k = 34;
      const m = Math.max(b1, b2);
      return m + Math.log(Math.exp(k * (b1 - m)) + Math.exp(k * (b2 - m))) / k - Math.log(2) / k * smooth(0.1, 0.0, Math.abs(b1 - b2));
    };
    const RES = 0.0045;
    const R = s => Math.max(0, rawR(s) - (s < S0 + RES ? 0 : 0));

    const gourdTex = (() => {
      if (!hasDoc) return null;
      const W = 1024;
      const H = 512;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      const yOf = s => (1 - (s - S0) / (S1 - S0)) * H;
      const base = g.createLinearGradient(0, 0, 0, H);
      base.addColorStop(0, "#d9963f");
      base.addColorStop(0.55, "#c9842f");
      base.addColorStop(1, "#9c5a1e");
      g.fillStyle = base;
      g.fillRect(0, 0, W, H);
      for (let k = 0; k < 8; k++) {
        const x = (k / 8) * W;
        const gr = g.createLinearGradient(x, 0, x + W / 8, 0);
        gr.addColorStop(0, "rgba(90,45,10,0.22)");
        gr.addColorStop(0.5, "rgba(255,220,150,0.12)");
        gr.addColorStop(1, "rgba(90,45,10,0.22)");
        g.fillStyle = gr;
        g.fillRect(x, 0, W / 8, H);
      }
      const raised = (draw, w) => {
        g.save();
        g.translate(2, 2.5);
        g.strokeStyle = "rgba(70,32,8,0.55)";
        g.fillStyle = "rgba(70,32,8,0.55)";
        draw(w + 1);
        g.restore();
        g.strokeStyle = "#f2c37a";
        g.fillStyle = "#f2c37a";
        draw(w);
      };
      const y0 = yOf(0.42);
      const y1 = yOf(0.22);
      const mh = y1 - y0;
      g.lineCap = "square";
      g.lineJoin = "miter";
      raised(lw => {
        g.lineWidth = lw;
        g.beginPath();
        g.moveTo(0, y0 + 4);
        g.lineTo(W, y0 + 4);
        g.moveTo(0, y1 - 4);
        g.lineTo(W, y1 - 4);
        g.stroke();
        const n = 16;
        const cw = W / n;
        for (let k = 0; k < n; k++) {
          const x = k * cw;
          const q = mh - 22;
          const t = y0 + 11;
          g.beginPath();
          g.moveTo(x + cw * 0.1, t + q);
          g.lineTo(x + cw * 0.1, t);
          g.lineTo(x + cw * 0.9, t);
          g.lineTo(x + cw * 0.9, t + q * 0.78);
          g.lineTo(x + cw * 0.3, t + q * 0.78);
          g.lineTo(x + cw * 0.3, t + q * 0.25);
          g.lineTo(x + cw * 0.7, t + q * 0.25);
          g.lineTo(x + cw * 0.7, t + q * 0.55);
          g.lineTo(x + cw * 0.5, t + q * 0.55);
          g.stroke();
        }
      }, 7);
      const p0 = yOf(0.66);
      const p1 = yOf(0.49);
      const np = 12;
      for (let k = 0; k < np; k++) {
        const cx = ((k + 0.5) / np) * W;
        const pw = (W / np) * 0.42;
        const petal = () => {
          g.beginPath();
          g.moveTo(cx, p0);
          g.bezierCurveTo(cx + pw, p0 + (p1 - p0) * 0.35, cx + pw * 0.8, p1, cx, p1);
          g.bezierCurveTo(cx - pw * 0.8, p1, cx - pw, p0 + (p1 - p0) * 0.35, cx, p0);
          g.closePath();
        };
        g.save();
        g.translate(2, 2.5);
        petal();
        g.fillStyle = "rgba(70,32,8,0.5)";
        g.fill();
        g.restore();
        petal();
        const pg = g.createLinearGradient(0, p0, 0, p1);
        pg.addColorStop(0, "#f5cf8e");
        pg.addColorStop(1, "#dca159");
        g.fillStyle = pg;
        g.fill();
        g.beginPath();
        g.moveTo(cx, p0 + 8);
        g.lineTo(cx, p1 - 6);
        g.strokeStyle = "rgba(150,85,30,0.6)";
        g.lineWidth = 3;
        g.stroke();
      }
      const cy0 = yOf(1.08);
      const cy1 = yOf(0.86);
      const cloud = (cx, cy, s) => {
        g.beginPath();
        g.arc(cx, cy, 14 * s, Math.PI * 0.5, Math.PI * 2.3);
        g.moveTo(cx + 14 * s + 18 * s, cy);
        g.arc(cx + 18 * s, cy, 18 * s, 0, Math.PI * 1.6, true);
        g.moveTo(cx + 18 * s + 12 * s, cy + 4 * s);
        g.arc(cx + 30 * s, cy + 4 * s, 10 * s, Math.PI, Math.PI * 2.6);
        g.stroke();
      };
      for (let k = 0; k < 7; k++) {
        const cx = ((k + 0.2) / 7) * W;
        const cy = lerp(cy0, cy1, k % 2 ? 0.62 : 0.38);
        raised(lw => {
          g.lineWidth = lw;
          cloud(cx, cy, 1.25);
        }, 6);
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.anisotropy = 8;
      return t;
    })();

    const lidTex = (() => {
      if (!hasDoc) return null;
      const N = 512;
      const c = document.createElement("canvas");
      c.width = N;
      c.height = N;
      const g = c.getContext("2d");
      g.fillStyle = "#b4762c";
      g.fillRect(0, 0, N, N);
      let sd = 5;
      const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < 70; k++) {
        const x = rnd() * N;
        const y = rnd() * N;
        const r = 14 + rnd() * 42;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const dark = rnd() > 0.35;
        gr.addColorStop(0, dark ? "rgba(52,24,8,0.85)" : "rgba(240,190,110,0.7)");
        gr.addColorStop(0.7, dark ? "rgba(70,32,10,0.45)" : "rgba(230,170,90,0.25)");
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.beginPath();
        g.ellipse(x, y, r, r * (0.5 + rnd() * 0.6), rnd() * Math.PI, 0, TAU);
        g.fill();
      }
      const cx = N / 2;
      const hole = (x, y, r) => {
        g.beginPath();
        g.arc(x, y, r + 3.5, 0, TAU);
        g.fillStyle = "#f0cf96";
        g.fill();
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.fillStyle = "#140a04";
        g.fill();
      };
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        g.save();
        g.translate(cx, cx);
        g.rotate(a);
        g.beginPath();
        g.moveTo(0, -60);
        g.bezierCurveTo(30, -95, 26, -150, 0, -168);
        g.bezierCurveTo(-26, -150, -30, -95, 0, -60);
        g.lineWidth = 5;
        g.strokeStyle = "#f0cf96";
        g.stroke();
        g.restore();
        hole(cx + Math.sin(a) * 118, cx - Math.cos(a) * 118, 13);
        const b = a + TAU / 16;
        hole(cx + Math.sin(b) * 190, cx - Math.cos(b) * 190, 9);
        hole(cx + Math.sin(a) * 190, cx - Math.cos(a) * 190, 6);
      }
      g.beginPath();
      g.arc(cx, cx, 46, 0, TAU);
      g.lineWidth = 6;
      g.strokeStyle = "#f0cf96";
      g.stroke();
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 8;
      return t;
    })();

    const headTex = (() => {
      if (!hasDoc) return null;
      const W = 512;
      const H = 256;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = "#5a2f14";
      g.fillRect(0, 0, W, H);
      const fx = 0.25 * W;
      const fg = g.createRadialGradient(fx, H * 0.56, 4, fx, H * 0.56, W * 0.2);
      fg.addColorStop(0, "#e0a04a");
      fg.addColorStop(0.65, "#c47d30");
      fg.addColorStop(1, "rgba(150,80,30,0)");
      g.fillStyle = fg;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = "#d99a46";
      g.lineCap = "round";
      [-0.09, -0.035, 0.035, 0.09].forEach(o => {
        g.beginPath();
        g.moveTo((0.25 + o) * W, H * 0.04);
        g.quadraticCurveTo((0.25 + o * 1.4) * W, H * 0.22, (0.25 + o * 1.9) * W, H * 0.36);
        g.lineWidth = 7;
        g.stroke();
      });
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      return t;
    })();

    const femurTex = (() => {
      if (!hasDoc) return null;
      const W = 256;
      const H = 256;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = "#7a4520";
      g.fillRect(0, 0, W, H);
      g.strokeStyle = "#c58a45";
      g.lineWidth = 9;
      for (let y = -40; y < H + 40; y += 30) {
        g.beginPath();
        g.moveTo(W * 0.0, y);
        g.lineTo(W * 0.25, y + 22);
        g.lineTo(W * 0.5, y);
        g.lineTo(W * 0.75, y + 22);
        g.lineTo(W, y);
        g.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    })();

    const gourdMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: gourdTex, roughness: 0.35, metalness: 0.05 });
    kit.surface(gourdMat, gourdTex, { seed: 3, rough: [0.22, 0.5], metal: 0.02, scratch: 0.4, pits: 0.4, bump: 0.05 });
    const gourdIn = new THREE.MeshStandardMaterial({ color: 0x3b2210, roughness: 0.9, side: THREE.BackSide });
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: lidTex, roughness: 0.25, metalness: 0.05 });
    kit.surface(lidMat, lidTex, { seed: 8, rough: [0.18, 0.45], metal: 0.02, scratch: 0.3, pits: 0.2, bump: 0.05 });
    const ivory = new THREE.MeshStandardMaterial({ color: 0xf1dfb8, roughness: 0.35, metalness: 0.02 });
    const silk = new THREE.MeshStandardMaterial({ color: 0xc8262a, roughness: 0.6, metalness: 0.0 });
    const silkDark = new THREE.MeshStandardMaterial({ color: 0x8e1418, roughness: 0.7, metalness: 0.0 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: headTex, roughness: 0.32, metalness: 0.05 });
    const chitin = new THREE.MeshStandardMaterial({ color: 0x4e2812, roughness: 0.3, metalness: 0.06 });
    const chitinLight = new THREE.MeshStandardMaterial({ color: 0xa8652a, roughness: 0.38, metalness: 0.05 });
    const femurMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: femurTex, roughness: 0.4, metalness: 0.04 });
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x2a160a, roughness: 0.35 });
    const darkMat = mat(0x1a0e06, 0.5);

    const TH = 1.2;
    const gG = new THREE.Group();
    gG.position.set(0, 0.265, -0.6);
    gG.rotation.x = TH;
    bodyG.add(gG);
    const AX = V3(0, Math.cos(TH), Math.sin(TH));
    const NP = 90;
    const lobe = (phi, s) => 1 + 0.035 * Math.cos(8 * phi) * smooth(0.0, 0.12, s - S0) * smooth(0.0, 0.1, S1 - s);
    const profile = [];
    for (let i = 0; i <= NP; i++) {
      const s = sOfV(i / NP);
      profile.push(V2(Math.max(i === 0 ? 0.0001 : 0.002, R(s)), s));
    }
    profile[NP].x = R(S1);
    const shapeGourd = (g, k) => {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        const phi = Math.atan2(x, z);
        const m = lobe(phi, p.getY(i)) * k;
        p.setX(i, x * m);
        p.setZ(i, z * m);
      }
      g.computeVertexNormals();
      return g;
    };
    const gourdGeo = shapeGourd(new THREE.LatheGeometry(profile, 72), 1);
    gG.add(mesh(gourdGeo, gourdMat));
    const inProfile = profile.map(v => V2(Math.max(0.0001, v.x - 0.022), v.y));
    inProfile[0].y += 0.02;
    const gourdInner = mesh(shapeGourd(new THREE.LatheGeometry(inProfile, 72), 1), gourdIn, false);
    gG.add(gourdInner);
    const OR = R(S1);
    const rimPts = [];
    for (let k = 0; k < 72; k++) {
      const phi = (k / 72) * TAU;
      const rr = (OR - 0.011) * lobe(phi, S1);
      rimPts.push(V3(Math.sin(phi) * rr, S1, Math.cos(phi) * rr));
    }
    gG.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 144, 0.016, 10, true), ivory));
    const nub = mesh(new THREE.SphereGeometry(0.035, 14, 10), chitinLight, false);
    nub.scale.set(1, 0.6, 1);
    nub.position.y = S0 + 0.01;
    gG.add(nub);
    const NECK = 0.79;
    const cordPts = [];
    for (let k = 0; k < 72; k++) {
      const phi = (k / 72) * TAU;
      const rr = R(NECK) * lobe(phi, NECK) + 0.012;
      cordPts.push(V3(Math.sin(phi) * rr, NECK + 0.012 * Math.sin(phi * 2), Math.cos(phi) * rr));
    }
    gG.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPts, true), 144, 0.017, 8, true), silk));
    const knotPos = V3(R(NECK) + 0.02, NECK, 0);
    const knot = mesh(new THREE.SphereGeometry(0.04, 16, 12), silk);
    knot.position.copy(knotPos);
    knot.scale.set(1, 1.15, 0.9);
    gG.add(knot);
    const tasselG = new THREE.Group();
    bodyG.add(tasselG);
    const tasselTop = mesh(new THREE.SphereGeometry(0.03, 12, 10), silkDark, false);
    tasselG.add(tasselTop);
    const tasselBand = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), ivory, false);
    tasselBand.position.y = -0.04;
    tasselG.add(tasselBand);
    const tasselBody = mesh(new THREE.LatheGeometry([V2(0.0001, -0.2), V2(0.03, -0.2), V2(0.055, -0.17), V2(0.045, -0.1), V2(0.028, -0.05), V2(0.0001, -0.04)], 18), silk);
    tasselG.add(tasselBody);
    const tasselCord = mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), silk, false);
    bodyG.add(tasselCord);

    const opening = V3(0, S1, 0);

    const front = new THREE.Group();
    gG.add(front);
    const thorax = mesh(new THREE.SphereGeometry(0.205, 32, 24), chitin);
    thorax.scale.set(1, 1.05, 1.1);
    thorax.position.set(0, S1 + 0.04, 0.0);
    front.add(thorax);
    const seg = mesh(new THREE.SphereGeometry(0.2, 28, 18), chitinLight);
    seg.scale.set(1, 0.9, 1);
    seg.position.set(0, S1 - 0.1, 0);
    front.add(seg);
    const pron = mesh(new THREE.SphereGeometry(0.225, 36, 16, 0, TAU, 0, 1.15), chitin);
    pron.material = chitin.clone();
    pron.material.side = THREE.DoubleSide;
    pron.rotation.x = -Math.PI / 2 + 0.55;
    pron.scale.set(1.04, 1, 1.12);
    pron.position.set(0, S1 + 0.05, 0.0);
    front.add(pron);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, S1 + 0.25, 0.06);
    front.add(headPivot);
    const headAim = new THREE.Group();
    headAim.rotation.x = -TH + 0.12;
    headPivot.add(headAim);
    const head = new THREE.Group();
    headAim.add(head);
    const skull = mesh(new THREE.SphereGeometry(0.24, 40, 28), headMat);
    skull.scale.set(1.08, 1, 0.96);
    head.add(skull);
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.52, whiteColor: 0xfffaf0, pupilColor: 0x160c06 });
      e.g.position.set(0.118 * s, 0.035, 0.172);
      e.g.rotation.y = 0.5 * s;
      head.add(e.g);
      return e;
    });
    const mandibles = [-1, 1].map(s => {
      const mg = new THREE.Group();
      mg.position.set(0.05 * s, -0.175, 0.15);
      head.add(mg);
      const m = mesh(new THREE.ConeGeometry(0.032, 0.11, 10), chitinLight, false);
      m.position.y = -0.045;
      m.rotation.z = -0.35 * s;
      mg.add(m);
      return mg;
    });
    const palps = [-1, 1].map(s => {
      const pg = new THREE.Group();
      pg.position.set(0.105 * s, -0.16, 0.12);
      head.add(pg);
      const a = mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.08, 8), chitinLight, false);
      a.position.y = -0.04;
      pg.add(a);
      const b = mesh(new THREE.SphereGeometry(0.02, 10, 8), chitinLight, false);
      b.position.y = -0.085;
      pg.add(b);
      return pg;
    });
    const lidAnchorHead = new THREE.Object3D();
    lidAnchorHead.position.set(0.0, 0.205, -0.03);
    lidAnchorHead.rotation.set(-0.22, 0, 0.2);
    head.add(lidAnchorHead);
    const lidAnchorGourd = new THREE.Object3D();
    lidAnchorGourd.position.set(0, S1 + 0.012, 0);
    gG.add(lidAnchorGourd);

    const lid = new THREE.Group();
    big.add(lid);
    const LR = 0.235;
    const lidGeo = new THREE.LatheGeometry([V2(0.0001, -0.018), V2(LR * 0.72, -0.018), V2(LR * 0.95, -0.01), V2(LR, 0.006), V2(LR * 0.96, 0.024), V2(LR * 0.7, 0.05), V2(LR * 0.35, 0.064), V2(0.0001, 0.068)], 56);
    {
      const p = lidGeo.attributes.position;
      const uv = lidGeo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (LR * 2.05) + 0.5, -p.getZ(i) / (LR * 2.05) + 0.5);
    }
    lid.add(mesh(lidGeo, lidMat));
    const lidRim = mesh(new THREE.TorusGeometry(LR * 0.985, 0.013, 8, 56), ivory, false);
    lidRim.rotation.x = Math.PI / 2;
    lidRim.position.y = 0.006;
    lid.add(lidRim);
    const knob = mesh(new THREE.LatheGeometry([V2(0.0001, 0.06), V2(0.04, 0.062), V2(0.045, 0.08), V2(0.03, 0.1), V2(0.035, 0.118), V2(0.022, 0.135), V2(0.0001, 0.14)], 20), ivory);
    lid.add(knob);
    const holeLocal = [-1, 1].map(s => V3(0.075 * s, 0.058, 0.095));
    holeLocal.forEach(h => {
      const ring = mesh(new THREE.TorusGeometry(0.019, 0.007, 8, 18), ivory, false);
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(h);
      lid.add(ring);
    });

    const antG = new THREE.Group();
    big.add(antG);
    const antMeshes = [-1, 1].map(() => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), chitin);
      m.castShadow = true;
      m.frustumCulled = false;
      antG.add(m);
      const tip = mesh(new THREE.SphereGeometry(0.007, 8, 6), chitin, false);
      antG.add(tip);
      return { m, tip };
    });
    const AN = 14;
    const antRadius = t => lerp(0.012, 0.004, t);
    const buildAntenna = (a, pts) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, 48, 0.009, 6, false);
      const p = g.attributes.position;
      const n = 48;
      const rs = 7;
      for (let i = 0; i <= n; i++) {
        const c = curve.getPointAt(i / n);
        const r = antRadius(i / n) / 0.009;
        for (let j = 0; j < rs; j++) {
          const k = i * rs + j;
          p.setXYZ(k, c.x + (p.getX(k) - c.x) * r, c.y + (p.getY(k) - c.y) * r, c.z + (p.getZ(k) - c.z) * r);
        }
      }
      g.computeVertexNormals();
      a.m.geometry.dispose();
      a.m.geometry = g;
      a.tip.position.copy(pts[pts.length - 1]);
    };

    const limbGeo = (len, r0, r1, bulge, segs) => {
      const pts = [V2(0.0001, -len - r1 * 0.95)];
      for (let k = 0; k <= 4; k++) {
        const a = (k / 4) * (Math.PI / 2);
        pts.push(V2(Math.max(0.0001, Math.sin(a) * r1), -len - Math.cos(a) * r1 * 0.95));
      }
      const N = segs || 10;
      for (let i = 1; i < N; i++) {
        const t = i / N;
        pts.push(V2(lerp(r1, r0, t) + bulge * Math.sin(Math.PI * Math.pow(t, 0.7)), -len * (1 - t)));
      }
      for (let k = 4; k >= 0; k--) {
        const a = (k / 4) * (Math.PI / 2);
        pts.push(V2(Math.max(0.0001, Math.sin(a) * r0), Math.cos(a) * r0 * 0.95));
      }
      return new THREE.LatheGeometry(pts, 18);
    };
    const DOWN = V3(0, -1, 0);
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const qTmp = new THREE.Quaternion();
    const placeLimb = (m, a, b, len) => {
      m.position.copy(a);
      tmpA.subVectors(b, a);
      const d = tmpA.length();
      if (d < 1e-5) return;
      qTmp.setFromUnitVectors(DOWN, tmpA.multiplyScalar(1 / d));
      m.quaternion.copy(qTmp);
      m.scale.set(1, d / len, 1);
    };
    const ik = (A, B, l1, l2, pole, knee, foot) => {
      const d = tmpB.subVectors(B, A);
      let L = d.length();
      const dir = d.clone().normalize();
      L = Math.min(Math.max(L, Math.abs(l1 - l2) + 0.002), l1 + l2 - 0.002);
      const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L);
      const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      const pv = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
      knee.copy(A).addScaledVector(dir, a).addScaledVector(pv, h);
      foot.copy(A).addScaledVector(dir, L);
    };

    const legsG = new THREE.Group();
    big.add(legsG);
    const mkLeg = (sx, kind) => {
      const hind = kind === "hind";
      const l1 = hind ? 0.6 : 0.4;
      const l2 = hind ? 0.58 : 0.46;
      const femur = mesh(limbGeo(l1, hind ? 0.06 : 0.055, hind ? 0.04 : 0.04, hind ? 0.05 : 0.012, 14), hind ? femurMat : chitinLight);
      const tibia = mesh(limbGeo(l2, hind ? 0.034 : 0.04, hind ? 0.026 : 0.03, 0, 8), chitin);
      const hipBall = mesh(new THREE.SphereGeometry(hind ? 0.065 : 0.058, 16, 12), chitin, false);
      const kneeBall = mesh(new THREE.SphereGeometry(hind ? 0.045 : 0.046, 14, 10), chitin, false);
      const foot = new THREE.Group();
      const tarsus = mesh(limbGeo(hind ? 0.12 : 0.08, hind ? 0.022 : 0.018, hind ? 0.018 : 0.014, 0, 4), chitinLight);
      tarsus.rotation.x = -Math.PI / 2 + 0.18;
      foot.add(tarsus);
      const pad = mesh(new THREE.SphereGeometry(hind ? 0.026 : 0.02, 12, 8), chitinLight, false);
      pad.position.set(0, -0.004, hind ? 0.12 : 0.08);
      pad.scale.set(1.2, 0.6, 1);
      foot.add(pad);
      [-1, 1].forEach(c => {
        const cl = mesh(new THREE.ConeGeometry(hind ? 0.01 : 0.008, hind ? 0.05 : 0.04, 6), spineMat, false);
        cl.position.set(c * 0.014, -0.004, (hind ? 0.12 : 0.08) + 0.02);
        cl.rotation.set(Math.PI / 2 - 0.25, 0, c * 0.4);
        foot.add(cl);
      });
      legsG.add(femur, tibia, hipBall, kneeBall, foot);
      const spines = [];
      if (hind) {
        for (let k = 0; k < 5; k++) {
          const sp = mesh(new THREE.ConeGeometry(0.011, 0.06, 6), spineMat, false);
          sp.position.set(0, -l2 * (0.25 + k * 0.15), -0.025);
          sp.rotation.x = -Math.PI / 2 - 0.5;
          tibia.add(sp);
          spines.push(sp);
        }
      }
      return { sx, kind, hind, l1, l2, femur, tibia, hipBall, kneeBall, foot, knee: V3(0, 0, 0), ft: V3(0, 0, 0), anchor: new THREE.Object3D() };
    };
    const legs = [];
    [-1, 1].forEach(sx => {
      const fore = mkLeg(sx, "fore");
      fore.anchor.position.set(0.12 * sx, S1 + 0.04 + 0.02, -0.15);
      front.add(fore.anchor);
      fore.rest = V3(0.3 * sx, 0, 0.84);
      fore.pole = V3(sx * 0.7, 1, 0.5);
      legs.push(fore);
      const mid = mkLeg(sx, "mid");
      mid.anchor.position.set(0.15 * sx, S1 - 0.06, -0.15);
      front.add(mid.anchor);
      mid.rest = V3(0.42 * sx, 0, 0.42);
      mid.pole = V3(sx * 0.8, 1, -0.4);
      legs.push(mid);
      const hind = mkLeg(sx, "hind");
      hind.anchor.position.set(0.2 * sx, S1 - 0.08, -0.06);
      gG.add(hind.anchor);
      hind.rest = V3(0.43 * sx, 0, 0.18);
      hind.pole = V3(sx * 0.35, 1.1, -0.75);
      legs.push(hind);
    });

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.6, depthWrite: false });
    const rings = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 48), ringMat.clone());
      m.visible = false;
      big.add(m);
      return m;
    });
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xd6c4a2, transparent: true, opacity: 0.4, depthWrite: false });
    const dust = [];
    for (let k = 0; k < 10; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), dustMat);
      m.visible = false;
      big.add(m);
      dust.push({ m, a: (k / 10) * TAU });
    }
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
    const stars = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), starMat);
      m.visible = false;
      big.add(m);
      return m;
    });

    const food = berry();
    food.visible = false;
    big.add(food);

    const mA = new THREE.Matrix4();
    const mB = new THREE.Matrix4();
    const mInv = new THREE.Matrix4();
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const qA = new THREE.Quaternion();
    const qB = new THREE.Quaternion();
    const sA = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const v3 = new THREE.Vector3();
    const toBig = (obj, out) => {
      obj.getWorldPosition(out);
      return big.worldToLocal(out);
    };
    const mix = (a, b, k) => a + (b - a) * k;
    const FRONT_REST = front.position.clone();
    let tasselVel = 0;
    let tasselAng = 0;

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;

        const breath = Math.sin(t * 1.8) * motion;
        let lift = 0;
        let tilt = 0;
        let rock = Math.sin(t * 0.9) * 0.01 * motion;
        let shake = 0;
        let retract = 0;
        let lidOff = 0;
        let lidSeat = 0;
        let headPitch = 0;
        let headYaw = 0;
        let headRoll = 0;
        let chew = 0;
        let antSweep = 0;
        let antPoke = 0;
        let antQuiver = 0;
        let impact = 0;
        let ringK = -1;
        let follow = 0;
        let hindFold = 0;
        let saw = 0;
        let squat = 0;
        const foreT = [null, null];
        const midT = [null, null];

        if (nm === "jump") {
          const crouch = smooth(0.02, 0.2, p) * (1 - smooth(0.2, 0.3, p));
          const air = Math.sin(Math.PI * smooth(0.22, 0.78, p));
          const land = smooth(0.76, 0.82, p) * (1 - smooth(0.84, 1, p));
          squat = 0.07 * crouch + 0.06 * land;
          lift = 0.45 * air;
          follow = smooth(0.32, 0.5, p) * (1 - smooth(0.66, 0.8, p));
          tilt = -0.18 * air + 0.06 * land;
          antSweep = -0.4 * air;
          if (p > 0.78 && p < 0.97) impact = Math.sin(((p - 0.78) / 0.19) * Math.PI) * 0.6;
        } else if (nm === "jab") {
          const up = smooth(0.0, 0.18, p) * (1 - smooth(0.85, 1, p));
          tilt = -0.2 * up;
          headPitch = -0.1 * up;
          const pk = (st, en) => Math.sin(Math.PI * smooth(st, en, p)) * (p > st && p < en ? 1 : 0);
          const jL = pk(0.2, 0.42);
          const jR = pk(0.42, 0.64);
          const jB = pk(0.64, 0.86);
          [0, 1].forEach(i => {
            const sx = i ? 1 : -1;
            const j = (i ? jR : jL) + jB;
            foreT[i] = V3(sx * lerp(0.24, 0.13, j), lerp(0.5, 0.6, j), lerp(0.84, 1.22, j));
            foreT[i].y += up * 0.08;
          });
          foreT.up = up;
          if (jL > 0.7 || jR > 0.7 || jB > 0.7) impact = 0.35;
          antQuiver = up * 0.5;
        } else if (nm === "chirp") {
          const k = smooth(0.04, 0.16, p) * (1 - smooth(0.84, 0.97, p));
          shake = k;
          saw = k;
          hindFold = 0.35 * k;
          headPitch = -0.18 * k;
          antQuiver = k;
          ringK = k;
        } else if (nm === "hide") {
          lidSeat = smooth(0.03, 0.13, p) * (1 - smooth(0.86, 0.95, p));
          lidOff = smooth(0.14, 0.32, p) * (1 - smooth(0.68, 0.84, p));
          retract = smooth(0.1, 0.26, p) * (1 - smooth(0.74, 0.9, p));
          hindFold = retract;
          const wob = smooth(0.38, 0.45, p) * (1 - smooth(0.56, 0.64, p));
          rock += Math.sin(t * 9) * 0.05 * wob;
          if (p > 0.33 && p < 0.42) impact = Math.sin(((p - 0.33) / 0.09) * Math.PI) * 0.3;
        } else if (nm === "sniff") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.85, 1, p));
          antPoke = k;
          antSweep = Math.sin(p * Math.PI * 3) * 0.6 * k;
          headPitch = 0.22 * k;
          headYaw = Math.sin(p * Math.PI * 3) * 0.25 * k;
          tilt = 0.05 * k;
        } else if (nm === "taunt") {
          const k = smooth(0, 0.14, p) * (1 - smooth(0.82, 1, p));
          tilt = -0.08 * k;
          headRoll = 0.22 * k;
          headYaw = -0.15 * k;
          const w = Math.max(0, Math.sin(p * Math.PI * 6)) * k;
          foreT[1] = V3(lerp(0.3, 0.42, k), lerp(0.0, 0.5, k) + 0.1 * w, lerp(0.84, 1.08, k) - 0.16 * w);
          foreT.taunt = k;
          antQuiver = 0.6 * k;
        } else if (nm === "eat") {
          const k = smooth(0.18, 0.32, p) * (1 - smooth(0.86, 0.98, p));
          headPitch = 0.3 * k;
          tilt = 0.06 * k;
          chew = ph && ph.chew ? ph.chew : 0;
          foreT.eat = k;
        }

        root.rotation.y = lookYaw;
        pivot.rotation.x = tilt + rock * 0.4;
        pivot.rotation.z = rock + Math.sin(t * 46) * 0.018 * shake;
        bodyG.position.y = lift - squat + breath * 0.004 + Math.abs(Math.sin(t * 40)) * 0.008 * shake;

        front.position.copy(FRONT_REST).addScaledVector(V3(0, 1, 0), -0.42 * retract);
        headPivot.scale.setScalar(lerp(1, 0.72, smooth(0, 0.6, retract)));
        head.rotation.set(headPitch + lookPitch * 0.4 + breath * 0.02, headYaw + pointer.x * 0.15, headRoll);
        mandibles.forEach((m, i) => (m.rotation.z = (i ? -1 : 1) * (0.1 + chew * 0.35 + Math.max(0, Math.sin(t * 3)) * 0.05)));
        palps.forEach((pp, i) => (pp.rotation.x = Math.sin(t * 5 + i * 1.7) * 0.25 + chew * 0.3));

        root.updateMatrixWorld(true);
        mInv.copy(big.matrixWorld).invert();
        mA.multiplyMatrices(mInv, lidAnchorHead.matrixWorld);
        mB.multiplyMatrices(mInv, lidAnchorGourd.matrixWorld);
        mA.decompose(pA, qA, sA);
        mB.decompose(pB, qB, v3);
        const hover = V3(0, 0, 0).copy(AX).applyQuaternion(pivot.quaternion);
        pA.y += 0.18 * lidSeat;
        v1.copy(pA).lerp(pB, lidOff);
        v1.addScaledVector(hover, 0.14 * Math.sin(Math.PI * lidOff));
        lid.position.copy(v1);
        lid.quaternion.copy(qA).slerp(qB, lidOff);
        const ls = lerp(sA.x, v3.x, lidOff);
        lid.scale.setScalar(ls);
        lid.updateMatrixWorld(true);

        const antBase = holeLocal.map(h => lid.localToWorld(h.clone()));
        const lidUp = V3(0, 1, 0).applyQuaternion(lid.quaternion);
        const fwd = V3(0, 0, 1).applyQuaternion(lid.quaternion);
        antMeshes.forEach((a, i) => {
          const sx = i ? 1 : -1;
          const b = big.worldToLocal(antBase[i].clone());
          const sway = Math.sin(t * 1.6 + i * 1.3) * 0.08 * motion;
          const q = Math.sin(t * 38 + i) * 0.03 * antQuiver;
          const pts = [];
          for (let k = 0; k < AN; k++) {
            const u = k / (AN - 1);
            const h = 0.42 * Math.sin(Math.PI * Math.min(1, u * 0.85)) + 0.06 * u;
            const f = 0.32 * u - 1.0 * u * u;
            const v = b.clone();
            v.addScaledVector(lidUp, lerp(h, 0.12 * u - 0.75 * u * u, antPoke));
            v.addScaledVector(fwd, lerp(f, 0.75 * u, antPoke));
            v.x += sx * (0.04 + 0.42 * u) + antSweep * u * 0.5 * sx + (sway + q) * u * u;
            v.y += (sway * 0.5 - q) * u * u;
            if (v.y < 0.02) v.y = 0.02;
            pts.push(v);
          }
          buildAntenna(a, pts);
        });

        const sinkY = 0;
        legs.forEach(L => {
          const hip = toBig(L.anchor, v1);
          let target = L.rest.clone();
          if (L.kind === "fore") {
            const i = L.sx > 0 ? 1 : 0;
            if (foreT[i]) target = foreT[i].clone();
            if (foreT.eat) target.lerp(V3(L.sx * 0.13, 0.44, 0.97), foreT.eat);
          }
          if (L.hind) {
            target.y += saw * Math.max(0, Math.sin(t * 22 + (L.sx > 0 ? 0 : Math.PI))) * 0.16;
            target.lerp(V3(L.sx * 0.36, 0.25, -0.05), hindFold);
          }
          target.y += (lift + breath * 0.004) * follow;
          if (!L.hind && retract > 0) target.lerp(hip, smooth(0, 0.35, retract));
          target.y = Math.max(target.y, sinkY);
          let pole = L.pole;
          if (L.kind === "fore" && (foreT.eat || (foreT.taunt && L.sx > 0))) pole = L.pole.clone().lerp(V3(L.sx, -0.5, 0.15), foreT.eat || foreT.taunt);
          ik(hip, target, L.l1, L.l2, pole, L.knee, L.ft);
          placeLimb(L.femur, hip, L.knee, L.l1);
          placeLimb(L.tibia, L.knee, L.ft, L.l2);
          L.hipBall.position.copy(hip);
          L.kneeBall.position.copy(L.knee);
          L.foot.position.copy(L.ft);
          L.foot.rotation.set(0, L.sx * (L.hind ? 0.25 : 0.4), 0);
          const vis = L.hind || retract < 0.34;
          const sc = L.hind ? 1 : lerp(1, 0.3, smooth(0.05, 0.34, retract));
          [L.femur, L.tibia, L.hipBall, L.kneeBall, L.foot].forEach(m => {
            m.visible = vis;
          });
          L.hipBall.scale.setScalar(sc);
          L.kneeBall.scale.setScalar(sc);
          L.foot.scale.setScalar(sc);
          L.femur.scale.x = L.femur.scale.z = sc;
          L.tibia.scale.x = L.tibia.scale.z = sc;
        });

        toBig(knot, v2);
        const kd = V3(1, 0, 0);
        tasselVel += (-tasselAng * 30 - tasselVel * 4 + (shake * Math.sin(t * 46) * 40 + (nm === "jump" ? Math.cos(Math.PI * smooth(0.22, 0.78, p)) * 6 : 0))) * 0.016;
        tasselAng += tasselVel * 0.016;
        tasselAng = Math.max(-0.8, Math.min(0.8, tasselAng));
        const hang = 0.16;
        const tp = v2.clone().add(kd.multiplyScalar(0.03));
        const bottom = V3(tp.x + Math.sin(tasselAng) * 0.05, tp.y - hang, tp.z + Math.sin(tasselAng * 0.7) * hang * 0.5);
        if (bottom.y < 0.25) bottom.y = 0.25;
        bodyG.worldToLocal(big.localToWorld(bottom));
        tasselG.position.copy(bottom);
        tasselG.rotation.set(tasselAng * 0.5, 0, tasselAng * 0.6);
        const tpl = bodyG.worldToLocal(big.localToWorld(tp.clone()));
        tasselCord.position.copy(tpl).add(bottom).multiplyScalar(0.5);
        v3.subVectors(tpl, bottom);
        tasselCord.scale.set(1, Math.max(0.01, v3.length()), 1);
        tasselCord.quaternion.setFromUnitVectors(V3(0, 1, 0), v3.normalize());

        const close = 1 - blink;
        eyes.forEach(({ g }) => {
          g.scale.y = lerp(1, 0.1, close);
        });
        followPupils(eyes, pointer, 0.6);

        rings.forEach((r, i) => {
          r.visible = ringK > 0.05;
          if (!r.visible) return;
          const q = (t * 1.6 + i / 3) % 1;
          toBig(gG, v2);
          const c = v2.clone().addScaledVector(AX, 0.45);
          r.position.copy(c);
          r.position.y = Math.max(r.position.y, 0.4);
          r.rotation.set(0, 0, 0);
          r.scale.setScalar(0.3 + q * 0.75);
          r.material.opacity = 0.55 * (1 - q) * ringK;
        });
        stars.forEach((st, i) => {
          st.visible = nm === "jab" && impact > 0.1;
          if (!st.visible) return;
          const a = t * 9 + (i / 3) * TAU;
          st.position.set(Math.cos(a) * 0.12, 0.8 + Math.sin(a) * 0.12, 1.22);
          st.rotation.set(t * 5, t * 3, 0);
        });
        const fx = impact > 0.05 && nm !== "jab";
        dust.forEach(d => {
          d.m.visible = fx;
          if (!fx) return;
          const u = 1 - impact;
          const r = 0.55 + u * 0.5;
          d.m.position.set(Math.cos(d.a) * r, 0.06 + u * 0.12, -0.1 + Math.sin(d.a) * r * 0.8);
          d.m.scale.setScalar(0.4 + u * 0.7);
          dustMat.opacity = 0.32 * impact;
        });

        if (nm === "eat" && ph) {
          food.visible = ph.visible;
          const target = V3(0, 0.52, 1.02);
          food.position.set(target.x, lerp(3.0, target.y, ph.fall * ph.fall), target.z);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.62);
        } else food.visible = false;
      }
    };
  }
});
