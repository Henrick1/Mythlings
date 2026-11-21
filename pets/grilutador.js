Pets.register({
  id: "grilutador",
  dex: 44,
  name: "Grilutador",
  color: "#b8742c",
  types: ["bug", "fighting"],
  stage: 2,
  evolvesTo: "grilendario",
  evolveLevel: 36,
  description: "Cresceu tanto que a cabaça rachou ao meio: a metade de baixo virou o peitoral laqueado e a de cima virou o capacete, com a tampa furada no topo. Treina chutes o dia inteiro com as pernas de saltador e luta de punhos enrolados em seda vermelha. Quando esfrega as asas, solta um trinado tão alto que faz o adversário tremer.",
  actions: {
    jump: { duration: 1.3 },
    eat: { duration: 2.4 },
    jab: { duration: 1.4 },
    kick: { duration: 1.5 },
    chirp: { duration: 2.4 },
    guard: { duration: 2.4 },
    sniff: { duration: 2.2 },
    taunt: { duration: 2.0 }
  },
  battle: { attack: { action: "kick", hit: 0.46, speed: 1.0 }, special: { action: "chirp", hit: 0.5, speed: 1.0 } },
  idle: [
    { action: "jab", min: 12, max: 30 },
    { action: "sniff", min: 18, max: 40 },
    { action: "chirp", min: 30, max: 70 },
    { action: "taunt", min: 35, max: 70 }
  ],
  clickAction: n => ["kick", "jab", "chirp", "guard", "taunt", "jump", "sniff"][(n - 1) % 7],

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
    big.add(pivot);
    const bodyG = new THREE.Group();
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

    const wingTex = (() => {
      if (!hasDoc) return null;
      const W = 512;
      const H = 512;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#c98638");
      bg.addColorStop(0.5, "#b06c26");
      bg.addColorStop(1, "#c98638");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      let sd = 17;
      const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      g.strokeStyle = "rgba(60,28,8,0.85)";
      g.lineCap = "round";
      for (let k = 0; k < 9; k++) {
        const x = (k / 9) * W + W / 18;
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(x, 0);
        g.bezierCurveTo(x + 30, H * 0.3, x - 30, H * 0.6, x + 10, H);
        g.stroke();
      }
      g.lineWidth = 2.5;
      for (let k = 0; k < 140; k++) {
        const x = rnd() * W;
        const y = rnd() * H;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (rnd() - 0.5) * 50, y + 18 + rnd() * 20);
        g.stroke();
      }
      g.fillStyle = "rgba(240,200,120,0.35)";
      for (let k = 0; k < 40; k++) {
        g.beginPath();
        g.ellipse(rnd() * W, rnd() * H, 8 + rnd() * 14, 5 + rnd() * 8, rnd() * 3, 0, TAU);
        g.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 8;
      return t;
    })();
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wingTex, roughness: 0.3, metalness: 0.05 });
    kit.surface(wingMat, wingTex, { seed: 4, rough: [0.2, 0.45], metal: 0.02, scratch: 0.2, pits: 0.2, bump: 0.05 });
    const gourdMat2 = gourdMat.clone();
    gourdMat2.side = THREE.DoubleSide;
    const lidMat2 = lidMat.clone();
    lidMat2.side = THREE.DoubleSide;

    const tube = (pts, r, m, closed) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, !!closed), Math.max(32, pts.length * 3), r, 10, !!closed), m);
    const ringPts = (rad, y, n) => {
      const p = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        p.push(V3(Math.sin(a) * rad, y, Math.cos(a) * rad));
      }
      return p;
    };

    const HIP = 0.8;
    const pelvis = new THREE.Group();
    pelvis.position.y = HIP;
    bodyG.add(pelvis);
    const hips = mesh(new THREE.SphereGeometry(0.2, 32, 22), chitin);
    hips.scale.set(1.2, 0.85, 1);
    pelvis.add(hips);
    const belt = tube(ringPts(0.226, 0, 48), 0.04, silk, true);
    belt.position.y = 0.07;
    belt.scale.set(1.12, 1, 0.98);
    pelvis.add(belt);
    const beltKnot = mesh(new THREE.SphereGeometry(0.05, 16, 12), silk);
    beltKnot.scale.set(1.2, 1, 0.8);
    beltKnot.position.set(0.06, 0.07, 0.225);
    pelvis.add(beltKnot);
    const beltTails = [0, 1].map(k => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), silk);
      m.castShadow = true;
      m.frustumCulled = false;
      big.add(m);
      return { m, k };
    });

    const chest = new THREE.Group();
    chest.position.y = 0.08;
    pelvis.add(chest);
    const TS = 0.86;
    const TZ = 0.82;
    const SA = 0.05;
    const SB = 0.7;
    const chestProfile = [];
    for (let i = 0; i <= 50; i++) {
      const s = lerp(SA, SB, i / 50);
      chestProfile.push(V2(R(s), s - SA));
    }
    const lathUv = (g, off) => {
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setY(i, (p.getY(i) + off - S0) / (S1 - S0));
      return g;
    };
    const chestGeo = lathUv(new THREE.LatheGeometry(chestProfile, 72), SA);
    const chestShell = mesh(chestGeo, gourdMat);
    chestShell.scale.set(TS, TS, TS * TZ);
    chest.add(chestShell);
    const chestIn = mesh(new THREE.LatheGeometry(chestProfile.map(v => V2(Math.max(0.001, v.x - 0.022), v.y)), 72), gourdIn, false);
    chestIn.scale.copy(chestShell.scale);
    chest.add(chestIn);
    const CH = (SB - SA) * TS;
    const topR = R(SB) * TS;
    const botR = R(SA) * TS;
    const topRim = tube(ringPts(topR - 0.006, 0, 64), 0.018, ivory, true);
    topRim.position.y = CH;
    topRim.scale.z = TZ;
    chest.add(topRim);
    const botRim = tube(ringPts(botR - 0.006, 0, 64), 0.018, ivory, true);
    botRim.scale.z = TZ;
    chest.add(botRim);
    const sashPts = [];
    for (let k = 0; k <= 40; k++) {
      const u = k / 40;
      const a = lerp(-0.95, 0.95 + Math.PI, u);
      const s = lerp(0.62, 0.18, u);
      const rr = R(s) * TS + 0.018;
      sashPts.push(V3(Math.sin(a) * rr, (s - SA) * TS, Math.cos(a) * rr * TZ + (Math.cos(a) > 0 ? 0.004 : 0)));
    }
    const neck = mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.2, 24), chitin);
    neck.position.y = CH + 0.02;
    chest.add(neck);
    const collar = mesh(new THREE.SphereGeometry(topR - 0.02, 32, 16, 0, TAU, 0, Math.PI / 2), chitin);
    collar.scale.set(1, 0.35, TZ);
    collar.position.y = CH - 0.01;
    chest.add(collar);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, CH + 0.22, 0.02);
    chest.add(headPivot);
    const head = new THREE.Group();
    headPivot.add(head);
    const skull = mesh(new THREE.SphereGeometry(0.235, 44, 30), headMat);
    skull.scale.set(1.06, 1, 1);
    head.add(skull);
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.48, whiteColor: 0xfffaf0, pupilColor: 0x160c06 });
      e.g.position.set(0.105 * s, 0.0, 0.19);
      e.g.rotation.y = 0.45 * s;
      head.add(e.g);
      return e;
    });
    const lids = eyes.map(({ g }) => {
      const hold = new THREE.Group();
      hold.scale.set(1.05, 1.13, 0.74);
      g.add(hold);
      const l = mesh(new THREE.SphereGeometry(0.22 * 0.48 * 1.03, 28, 16, 0, TAU, 0, Math.PI * 0.55), chitin, false);
      l.rotation.x = -1.77;
      hold.add(l);
      return l;
    });
    const brows = [-1, 1].map(s => {
      const b = mesh(new THREE.SphereGeometry(1, 16, 10), chitin, false);
      b.scale.set(0.055, 0.016, 0.02);
      b.rotation.set(0, 0.4 * s, -0.38 * s);
      b.position.set(0.1 * s, 0.11, 0.215);
      head.add(b);
      return b;
    });
    const mandibles = [-1, 1].map(s => {
      const mg = new THREE.Group();
      mg.position.set(0.032 * s, -0.15, 0.17);
      head.add(mg);
      const m = mesh(new THREE.ConeGeometry(0.018, 0.06, 10), ivory, false);
      m.position.y = -0.024;
      m.rotation.z = -0.3 * s;
      mg.add(m);
      return mg;
    });
    const mouth = mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 14, Math.PI * 0.8), darkMat, false);
    mouth.rotation.set(-0.4, 0, Math.PI + 0.25);
    mouth.position.set(0.01, -0.11, 0.205);
    head.add(mouth);

    const HC = 1.12;
    const HR = 0.252;
    const helmetGeo = new THREE.SphereGeometry(HR, 56, 22, 0, TAU, 0, HC);
    {
      const p = helmetGeo.attributes.position;
      const uv = helmetGeo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) / HR;
        const s = lerp(0.86, 1.1, (y - Math.cos(HC)) / (1 - Math.cos(HC)));
        uv.setY(i, (s - S0) / (S1 - S0));
      }
    }
    const helmet = mesh(helmetGeo, gourdMat2);
    helmet.rotation.x = 0.14;
    helmet.scale.x = 1.06;
    head.add(helmet);
    const hRim = tube(ringPts(HR * Math.sin(HC), HR * Math.cos(HC), 64), 0.016, ivory, true);
    hRim.rotation.x = 0.14;
    hRim.scale.x = 1.06;
    head.add(hRim);
    const BH = HR * Math.cos(HC) + 0.04;
    const band = tube(ringPts(Math.sqrt(HR * HR - BH * BH) + 0.014, BH, 64), 0.022, silk, true);
    band.rotation.x = 0.14;
    band.scale.x = 1.06;
    head.add(band);
    const bandKnot = mesh(new THREE.SphereGeometry(0.04, 14, 10), silk);
    bandKnot.position.set(0, BH, -Math.sqrt(HR * HR - BH * BH) - 0.03).applyAxisAngle(V3(1, 0, 0), 0.14);
    head.add(bandKnot);
    const ribbons = [-1, 1].map(s => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), silk);
      m.castShadow = true;
      m.frustumCulled = false;
      big.add(m);
      return { m, s };
    });

    const lid = new THREE.Group();
    lid.position.set(0, HR - 0.006, 0).applyAxisAngle(V3(1, 0, 0), 0.14);
    lid.rotation.x = 0.14;
    head.add(lid);
    const LR = 0.17;
    const lidGeo = new THREE.LatheGeometry([V2(0.0001, -0.018), V2(LR * 0.72, -0.018), V2(LR * 0.95, -0.01), V2(LR, 0.006), V2(LR * 0.96, 0.024), V2(LR * 0.7, 0.05), V2(LR * 0.35, 0.064), V2(0.0001, 0.068)], 48);
    {
      const p = lidGeo.attributes.position;
      const uv = lidGeo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (LR * 2.05) + 0.5, -p.getZ(i) / (LR * 2.05) + 0.5);
    }
    lid.add(mesh(lidGeo, lidMat));
    const lidRim = mesh(new THREE.TorusGeometry(LR * 0.985, 0.011, 8, 48), ivory, false);
    lidRim.rotation.x = Math.PI / 2;
    lidRim.position.y = 0.006;
    lid.add(lidRim);
    lid.add(mesh(new THREE.LatheGeometry([V2(0.0001, 0.06), V2(0.035, 0.062), V2(0.04, 0.08), V2(0.026, 0.1), V2(0.03, 0.116), V2(0.018, 0.13), V2(0.0001, 0.135)], 20), ivory));
    const holeLocal = [-1, 1].map(s => V3(0.065 * s, 0.056, 0.07));
    holeLocal.forEach(h => {
      const r = mesh(new THREE.TorusGeometry(0.019, 0.007, 8, 18), ivory, false);
      r.rotation.x = Math.PI / 2;
      r.position.copy(h);
      lid.add(r);
    });

    const antMeshes = [-1, 1].map(() => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), chitin);
      m.castShadow = true;
      m.frustumCulled = false;
      big.add(m);
      const tip = mesh(new THREE.SphereGeometry(0.009, 8, 6), chitin, false);
      big.add(tip);
      return { m, tip };
    });
    const flexTube = (m, pts, r0, r1, flat) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const n = 60;
      const rs = 9;
      const g = new THREE.TubeGeometry(curve, n, 1, rs - 1, false);
      const p = g.attributes.position;
      const fr = curve.computeFrenetFrames(n, false);
      for (let i = 0; i <= n; i++) {
        const c = curve.getPointAt(i / n);
        const r = lerp(r0, r1, i / n);
        for (let j = 0; j < rs; j++) {
          const k = i * rs + j;
          let dx = p.getX(k) - c.x;
          let dy = p.getY(k) - c.y;
          let dz = p.getZ(k) - c.z;
          if (flat) {
            const b = fr.binormals[i];
            const d = dx * b.x + dy * b.y + dz * b.z;
            dx -= b.x * d * (1 - flat);
            dy -= b.y * d * (1 - flat);
            dz -= b.z * d * (1 - flat);
          }
          p.setXYZ(k, c.x + dx * r, c.y + dy * r, c.z + dz * r);
        }
      }
      g.computeVertexNormals();
      m.geometry.dispose();
      m.geometry = g;
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
      return new THREE.LatheGeometry(pts, 22);
    };
    const DOWN = V3(0, -1, 0);
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const placeLimb = (m, a, b, len) => {
      m.position.copy(a);
      tmpA.subVectors(b, a);
      const d = tmpA.length();
      if (d < 1e-5) return;
      m.quaternion.setFromUnitVectors(DOWN, tmpA.multiplyScalar(1 / d));
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

    const arms = [-1, 1].map(sx => {
      const anchor = new THREE.Object3D();
      anchor.position.set(0.34 * sx, CH - 0.17, -0.02);
      chest.add(anchor);
      const pauldron = mesh(new THREE.SphereGeometry(0.105, 30, 14, 0, TAU, 0, 1.3), lidMat2);
      {
        const p = pauldron.geometry.attributes.position;
        const uv = pauldron.geometry.attributes.uv;
        for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 1.6 + 0.5, p.getZ(i) * 1.6 + 0.5);
      }
      pauldron.position.set(0.345 * sx, CH - 0.15, -0.02);
      pauldron.rotation.z = -0.55 * sx;
      chest.add(pauldron);
      const pr = mesh(new THREE.TorusGeometry(0.105 * Math.sin(1.3), 0.011, 8, 32), ivory, false);
      pr.rotation.x = Math.PI / 2;
      pr.position.y = 0.105 * Math.cos(1.3);
      pauldron.add(pr);
      const l1 = 0.27;
      const l2 = 0.27;
      const upperArm = mesh(limbGeo(l1, 0.062, 0.05, 0.012, 8), chitin);
      const fore = mesh(limbGeo(l2, 0.056, 0.06, 0.008, 8), chitinLight);
      const shoulder = mesh(new THREE.SphereGeometry(0.075, 18, 14), chitin, false);
      const elbow = mesh(new THREE.SphereGeometry(0.056, 16, 12), chitin, false);
      const fist = new THREE.Group();
      const ball = mesh(new THREE.SphereGeometry(0.095, 22, 16), chitinLight);
      ball.scale.set(1, 0.95, 1.05);
      ball.position.y = -0.075;
      fist.add(ball);
      [0.0, -0.035, -0.07].forEach((y, k) => {
        const w = mesh(new THREE.TorusGeometry([0.066, 0.086, 0.094][k], 0.017, 8, 26), silk, false);
        w.rotation.x = Math.PI / 2;
        w.position.y = y;
        fist.add(w);
      });
      big.add(upperArm, fore, shoulder, elbow, fist);
      return { sx, anchor, l1, l2, upperArm, fore, shoulder, elbow, fist, pole: V3(sx * 0.8, -0.5, -0.5), el: V3(0, 0, 0), hand: V3(0, 0, 0) };
    });

    const legs = [-1, 1].map(sx => {
      const anchor = new THREE.Object3D();
      anchor.position.set(0.17 * sx, -0.04, 0.0);
      pelvis.add(anchor);
      const l1 = 0.4;
      const l2 = 0.42;
      const thigh = mesh(limbGeo(l1, 0.1, 0.06, 0.06, 14), femurMat);
      const shin = mesh(limbGeo(l2, 0.066, 0.05, 0.008, 8), chitin);
      const hipBall = mesh(new THREE.SphereGeometry(0.1, 20, 14), chitin, false);
      const kneeBall = mesh(new THREE.SphereGeometry(0.072, 16, 12), chitin, false);
      for (let k = 0; k < 4; k++) {
        const sp = mesh(new THREE.ConeGeometry(0.014, 0.065, 8), ivory, false);
        sp.position.set(0, -l2 * (0.22 + k * 0.18), 0.04);
        sp.rotation.x = Math.PI / 2 - 0.55;
        shin.add(sp);
      }
      const foot = new THREE.Group();
      const ankleBall = mesh(new THREE.SphereGeometry(0.056, 14, 10), chitin, false);
      foot.add(ankleBall);
      const tarsus = mesh(limbGeo(0.14, 0.044, 0.04, 0, 6), chitinLight);
      tarsus.rotation.x = -1.05;
      foot.add(tarsus);
      const pad = mesh(new THREE.SphereGeometry(1, 20, 14), chitinLight);
      pad.scale.set(0.07, 0.04, 0.09);
      pad.position.set(0, -0.075, 0.12);
      foot.add(pad);
      [-1, 1].forEach(c => {
        const cl = mesh(new THREE.ConeGeometry(0.016, 0.06, 8), ivory, false);
        cl.position.set(c * 0.035, -0.085, 0.2);
        cl.rotation.set(Math.PI / 2 - 0.15, 0, -c * 0.25);
        foot.add(cl);
      });
      const wrap = mesh(new THREE.TorusGeometry(0.05, 0.016, 8, 24), silk, false);
      wrap.rotation.x = Math.PI / 2;
      wrap.position.y = 0.035;
      foot.add(wrap);
      big.add(thigh, shin, hipBall, kneeBall, foot);
      return { sx, anchor, l1, l2, thigh, shin, hipBall, kneeBall, foot, pole: V3(sx * 0.15, 0.1, -1), knee: V3(0, 0, 0), ft: V3(0, 0, 0) };
    });

    const wings = [-1, 1].map(sx => {
      const pv = new THREE.Group();
      pv.position.set(0.075 * sx, CH - 0.08, -0.25);
      chest.add(pv);
      const w = mesh(new THREE.SphereGeometry(1, 28, 20), wingMat);
      w.scale.set(0.15, 0.4, 0.03);
      w.position.y = -0.36;
      pv.add(w);
      return { pv, sx };
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
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), starMat);
      m.visible = false;
      big.add(m);
      return m;
    });

    const food = berry();
    food.visible = false;
    big.add(food);

    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const toBig = (obj, out) => {
      obj.getWorldPosition(out);
      return big.worldToLocal(out);
    };
    const pelToBig = v => big.worldToLocal(pelvis.localToWorld(v));
    const chestToBig = v => big.worldToLocal(chest.localToWorld(v));
    const GUARD = [-1, 1].map(sx => V3(sx * 0.2, CH + 0.08, 0.38));
    const FOOT = [-1, 1].map(sx => V3(sx * 0.25, 0.125, -0.1));

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;

        const bounce = Math.abs(Math.sin(t * 3.2)) * motion;
        const breath = Math.sin(t * 1.8) * motion;
        let lift = 0;
        let squat = 0.03 * bounce;
        let lean = 0.1;
        let twist = 0;
        let chestPitch = 0.02 * breath;
        let headPitch = -0.05;
        let headYaw = 0;
        let headRoll = 0;
        let chew = 0;
        let antSweep = 0;
        let antPoke = 0;
        let antQuiver = 0;
        let impact = 0;
        let ringK = -1;
        let wingOpen = 0;
        let wingBuzz = 0;
        let starK = 0;
        let starAt = null;
        let squint = 0;
        let tuck = 0;
        const hands = GUARD.map((h, i) => h.clone().add(V3(0, 0.02 * Math.sin(t * 3.2 + i * 1.6) * motion, 0)));
        const feet = FOOT.map(f => f.clone());
        const footLift = [0, 0];

        if (nm === "jump") {
          const crouch = smooth(0.02, 0.2, p) * (1 - smooth(0.2, 0.3, p));
          const air = Math.sin(Math.PI * smooth(0.22, 0.78, p));
          const land = smooth(0.76, 0.82, p) * (1 - smooth(0.84, 1, p));
          squat = 0.16 * crouch + 0.12 * land;
          lift = 0.9 * air;
          tuck = air;
          lean = 0.1 + 0.2 * crouch - 0.1 * air;
          antSweep = -0.4 * air;
          wingOpen = 0.5 * air;
          hands.forEach((h, i) => h.lerp(V3((i ? 1 : -1) * 0.42, CH + 0.4, 0.15), air));
          if (p > 0.78 && p < 0.97) impact = Math.sin(((p - 0.78) / 0.19) * Math.PI) * 0.7;
        } else if (nm === "jab") {
          const up = smooth(0.0, 0.12, p) * (1 - smooth(0.88, 1, p));
          const pk = (st, en) => (p > st && p < en ? Math.sin(Math.PI * smooth(st, en, p)) : 0);
          const jL = pk(0.14, 0.34);
          const jR = pk(0.32, 0.52);
          const jU = pk(0.54, 0.84);
          hands[0].lerp(V3(-0.05, CH + 0.12, 0.95), jL);
          hands[1].lerp(V3(0.05, CH + 0.12, 0.95), jR);
          hands[1].lerp(V3(0.08, CH + 0.45, 0.75), jU);
          twist = 0.35 * (jL - jR) - 0.25 * jU;
          lean = 0.1 + 0.12 * (jL + jR) + 0.06 * jU;
          squat = 0.05 * up + 0.08 * jU * (1 - jU);
          squint = up * 0.35;
          const pkv = Math.max(jL, jR, jU);
          if (pkv > 0.8) {
            starK = 1;
            starAt = V3(0, CH + (jU > 0.5 ? 0.6 : 0.2), 1.05);
          }
          antQuiver = up * 0.4;
        } else if (nm === "kick") {
          const wind = smooth(0.02, 0.3, p) * (1 - smooth(0.32, 0.42, p));
          const strike = smooth(0.32, 0.46, p) * (1 - smooth(0.66, 0.86, p));
          const hold = Math.max(wind, strike);
          footLift[1] = 1;
          feet[1].lerp(V3(0.2, 0.5, -0.35), wind);
          feet[1].lerp(V3(0.08, 1.05, 0.85), strike);
          lean = 0.1 - 0.35 * strike + 0.12 * wind;
          twist = -0.4 * strike + 0.15 * wind;
          squat = 0.08 * hold;
          hands.forEach((h, i) => h.lerp(V3((i ? 1 : -1) * 0.24, CH, 0.46), wind));
          hands[0].lerp(V3(-0.42, CH - 0.08, 0.26), strike);
          hands[1].lerp(V3(0.42, CH - 0.2, -0.15), strike);
          footLift[1] = hold;
          squint = hold * 0.4;
          if (strike > 0.85) {
            starK = 1;
            starAt = V3(0.08, 1.25, 1.0);
          }
          if (p > 0.66 && p < 0.86) impact = Math.sin(((p - 0.66) / 0.2) * Math.PI) * 0.35;
        } else if (nm === "chirp") {
          const k = smooth(0.04, 0.16, p) * (1 - smooth(0.84, 0.97, p));
          wingOpen = k;
          wingBuzz = k;
          headPitch = -0.25 * k;
          antQuiver = k;
          ringK = k;
          lean = 0.1 - 0.12 * k;
          squint = 0.7 * k;
          hands.forEach((h, i) => h.lerp(V3((i ? 1 : -1) * 0.55, CH - 0.05, 0.2), k));
        } else if (nm === "guard") {
          const k = smooth(0.04, 0.18, p) * (1 - smooth(0.82, 0.96, p));
          hands.forEach((h, i) => h.lerp(V3((i ? 1 : -1) * 0.1, CH + 0.2, 0.46), k));
          squat = 0.14 * k;
          lean = 0.1 + 0.15 * k;
          headPitch = 0.15 * k;
          squint = 0.5 * k;
          const hit = smooth(0.45, 0.5, p) * (1 - smooth(0.5, 0.62, p));
          lean -= 0.1 * hit;
          if (hit > 0.3) impact = 0.3;
        } else if (nm === "sniff") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.85, 1, p));
          antPoke = k;
          antSweep = Math.sin(p * Math.PI * 3) * 0.6 * k;
          headPitch = 0.3 * k;
          headYaw = Math.sin(p * Math.PI * 3) * 0.3 * k;
          lean = 0.1 + 0.15 * k;
          hands.forEach((h, i) => h.lerp(V3((i ? 1 : -1) * 0.3, CH - 0.2, 0.2), k));
        } else if (nm === "taunt") {
          const k = smooth(0, 0.14, p) * (1 - smooth(0.82, 1, p));
          const w = Math.sin(p * Math.PI * 6);
          hands[1].lerp(V3(0.3 + 0.04 * w, CH + 0.25, 0.5 - 0.12 * w), k);
          hands[0].lerp(V3(-0.36, CH - 0.25, 0.05), k);
          headRoll = -0.2 * k;
          headYaw = 0.15 * k;
          lean = 0.1 - 0.1 * k;
          twist = 0.2 * k;
          antQuiver = 0.5 * k;
          squint = 0.3 * k;
        } else if (nm === "eat") {
          const k = smooth(0.14, 0.3, p) * (1 - smooth(0.86, 0.98, p));
          hands.forEach((h, i) => h.lerp(V3((i ? 1 : -1) * 0.07, CH + 0.12, 0.36), k));
          headPitch = 0.2 * k;
          lean = 0.1 - 0.04 * k;
          chew = ph && ph.chew ? ph.chew : 0;
        }

        root.rotation.y = lookYaw;
        pivot.rotation.x = 0;
        bodyG.position.y = lift;
        pelvis.position.y = HIP - squat;
        pelvis.rotation.set(lean * 0.4, twist * 0.4, 0);
        chest.rotation.set(lean * 0.6 + chestPitch, twist * 0.6, 0);
        head.rotation.set(headPitch - lean + lookPitch * 0.4, headYaw + pointer.x * 0.15, headRoll);
        mandibles.forEach((m, i) => (m.rotation.z = (i ? -1 : 1) * (0.08 + chew * 0.35)));
        mouth.scale.set(1, 1 + chew * 0.8, 1);
        brows.forEach((b, i) => (b.position.y = 0.11 - 0.02 * squint));

        root.updateMatrixWorld(true);

        const lidUp = V3(0, 1, 0).applyQuaternion(lid.getWorldQuaternion(new THREE.Quaternion()));
        const fwd = V3(0, 0, 1).applyQuaternion(lid.getWorldQuaternion(new THREE.Quaternion()));
        antMeshes.forEach((a, i) => {
          const sx = i ? 1 : -1;
          const b = big.worldToLocal(lid.localToWorld(holeLocal[i].clone()));
          const sway = Math.sin(t * 1.4 + i * 1.3) * 0.08 * motion;
          const q = Math.sin(t * 38 + i) * 0.03 * antQuiver;
          const pts = [];
          const AN = 22;
          for (let k = 0; k < AN; k++) {
            const u = k / (AN - 1);
            const h = 0.5 * Math.sin(Math.PI * Math.min(1, u * 0.9)) * (1 - 0.5 * u) - 0.25 * u * u;
            const f = 0.15 * u - 1.1 * u * u;
            const v = b.clone();
            v.addScaledVector(lidUp, lerp(h, 0.15 * u - 0.7 * u * u, antPoke));
            v.addScaledVector(fwd, lerp(f, 0.75 * u, antPoke));
            v.x += sx * (0.03 + 0.28 * u) + antSweep * u * 0.4 * sx + (sway + q) * u * u;
            v.y += (sway * 0.5 - q) * u * u;
            if (v.y < 0.03) v.y = 0.03;
            pts.push(v);
          }
          flexTube(a.m, pts, 0.013, 0.005, 0);
          a.tip.position.copy(pts[pts.length - 1]);
        });

        const knotW = toBig(bandKnot, V3(0, 0, 0));
        const back = V3(0, 0, -1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
        ribbons.forEach(({ m, s: sx }, i) => {
          const pts = [];
          for (let k = 0; k < 12; k++) {
            const u = k / 11;
            const v = knotW.clone().addScaledVector(back, 0.03 + u * 0.32);
            v.y -= u * u * 0.34 + u * 0.05;
            v.x += sx * (0.03 + u * 0.08) + Math.sin(t * 4 + u * 4 + i) * 0.035 * u;
            pts.push(v);
          }
          flexTube(m, pts, 0.03, 0.022, 0.25);
        });
        const bk = toBig(beltKnot, V3(0, 0, 0));
        const pelFwd = V3(0, 0, 1).applyQuaternion(pelvis.getWorldQuaternion(new THREE.Quaternion()));
        beltTails.forEach(({ m, k }) => {
          const pts = [];
          for (let j = 0; j < 10; j++) {
            const u = j / 9;
            const v = bk.clone().addScaledVector(pelFwd, 0.035 + 0.04 * u);
            v.y -= u * (0.26 + k * 0.06);
            v.x += (k ? 0.05 : -0.02) * u + Math.sin(t * 3 + u * 3 + k) * 0.02 * u;
            pts.push(v);
          }
          flexTube(m, pts, 0.028, 0.022, 0.3);
        });

        legs.forEach((L, i) => {
          const hip = toBig(L.anchor, v1.set(0, 0, 0)).clone();
          let target = feet[i].clone();
          if (tuck > 0) target.lerp(V3(L.sx * 0.24, lift + 0.42, 0.05), tuck * 0.8);
          if (!footLift[i] && tuck === 0) target.y = Math.max(target.y, 0.125);
          ik(hip, target, L.l1, L.l2, L.pole, L.knee, L.ft);
          placeLimb(L.thigh, hip, L.knee, L.l1);
          placeLimb(L.shin, L.knee, L.ft, L.l2);
          L.hipBall.position.copy(hip);
          L.kneeBall.position.copy(L.knee);
          L.foot.position.copy(L.ft);
          const kick = footLift[i];
          L.foot.rotation.set(-0.9 * kick * (feet[i].y > 0.7 ? 1 : 0), L.sx * 0.15, 0);
        });
        arms.forEach((A, i) => {
          const sh = toBig(A.anchor, v1.set(0, 0, 0)).clone();
          const target = chestToBig(hands[i].clone());
          ik(sh, target, A.l1, A.l2, A.pole, A.el, A.hand);
          placeLimb(A.upperArm, sh, A.el, A.l1);
          placeLimb(A.fore, A.el, A.hand, A.l2);
          A.shoulder.position.copy(sh);
          A.elbow.position.copy(A.el);
          A.fist.position.copy(A.hand);
          v2.subVectors(A.hand, A.el).normalize();
          A.fist.quaternion.setFromUnitVectors(DOWN, v2);
        });

        wings.forEach(({ pv, sx }) => {
          const buzz = Math.sin(t * 52 + (sx > 0 ? 0 : Math.PI)) * 0.08 * wingBuzz;
          pv.rotation.set(0.12 - 0.85 * wingOpen, sx * 0.3 * wingOpen, sx * (0.05 + 0.5 * wingOpen + buzz));
        });

        const close = Math.max(1 - blink, squint * 0.55);
        lids.forEach(l => {
          l.rotation.x = lerp(-1.77, Math.PI / 2, close);
        });
        followPupils(eyes, pointer, 0.6);

        rings.forEach((r, i) => {
          r.visible = ringK > 0.05;
          if (!r.visible) return;
          const q = (t * 1.6 + i / 3) % 1;
          r.position.copy(chestToBig(V3(0, CH * 0.6, -0.4)));
          r.rotation.set(0, 0, 0);
          r.scale.setScalar(0.4 + q * 1.0);
          r.material.opacity = 0.55 * (1 - q) * ringK;
        });
        stars.forEach((st, i) => {
          st.visible = starK > 0;
          if (!st.visible) return;
          const a = t * 9 + (i / 3) * TAU;
          st.position.copy(starAt).add(V3(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0));
          st.rotation.set(t * 5, t * 3, 0);
        });
        const fx = impact > 0.05;
        dust.forEach(d => {
          d.m.visible = fx;
          if (!fx) return;
          const u = 1 - impact;
          const r = 0.5 + u * 0.5;
          d.m.position.set(Math.cos(d.a) * r, 0.06 + u * 0.12, Math.sin(d.a) * r * 0.8);
          d.m.scale.setScalar(0.4 + u * 0.7);
          dustMat.opacity = 0.32 * impact;
        });

        if (nm === "eat" && ph) {
          food.visible = ph.visible;
          const target = chestToBig(V3(0, CH + 0.12, 0.36)).add(V3(0, 0.12, 0.06));
          food.position.set(target.x, lerp(3.6, target.y, ph.fall * ph.fall), target.z);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.7);
        } else food.visible = false;
      }
    };
  }
});
