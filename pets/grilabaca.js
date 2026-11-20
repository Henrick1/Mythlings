Pets.register({
  id: "grilabaca",
  dex: 43,
  name: "Grilabaça",
  color: "#c98a3a",
  types: ["bug", "fighting"],
  description: "Um filhotinho de grilo que nasceu dentro de uma cabacinha laqueada e nunca mais quis sair. Anda com ela como se fosse uma fralda, com as perninhas e os bracinhos saindo pelos furos, e usa a tampa furada como chapéu. Já se acha um lutador: amarra fitinhas vermelhas nos pulsos e dá tapinhas em tudo, mas quando leva um susto se esconde inteirinho dentro da cabaça.",
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
    big.scale.setScalar(1.05);
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

    const gG = new THREE.Group();
    const GY = 0.13;
    const GS = 0.72;
    gG.position.set(0, GY, 0);
    gG.scale.setScalar(GS);
    bodyG.add(gG);
    const NP = 90;
    const lobe = (phi, s) => 1 + 0.035 * Math.cos(8 * phi) * smooth(0.0, 0.12, s - S0) * smooth(0.0, 0.1, S1 - s);
    const profile = [];
    for (let i = 0; i <= NP; i++) {
      const s = sOfV(i / NP);
      profile.push(V2(Math.max(i === 0 ? 0.0001 : 0.002, R(s)), s));
    }
    const shapeGourd = g => {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        const m = lobe(Math.atan2(x, z), p.getY(i));
        p.setX(i, x * m);
        p.setZ(i, z * m);
      }
      g.computeVertexNormals();
      return g;
    };
    gG.add(mesh(shapeGourd(new THREE.LatheGeometry(profile, 72)), gourdMat));
    const inProfile = profile.map(v => V2(Math.max(0.0001, v.x - 0.022), v.y));
    inProfile[0].y += 0.02;
    gG.add(mesh(shapeGourd(new THREE.LatheGeometry(inProfile, 72)), gourdIn, false));
    const OR = R(S1);
    const ring = (pts, r, m) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), pts.length * 2, r, 10, true), m);
    const rimPts = [];
    for (let k = 0; k < 72; k++) {
      const phi = (k / 72) * TAU;
      const rr = (OR - 0.011) * lobe(phi, S1);
      rimPts.push(V3(Math.sin(phi) * rr, S1, Math.cos(phi) * rr));
    }
    gG.add(ring(rimPts, 0.016, ivory));
    const nub = mesh(new THREE.SphereGeometry(0.035, 14, 10), chitinLight, false);
    nub.scale.set(1, 0.6, 1);
    nub.position.y = S0 + 0.01;
    gG.add(nub);
    const NECK = 0.79;
    const KA = 0.75;
    const cordPts = [];
    for (let k = 0; k < 72; k++) {
      const phi = (k / 72) * TAU;
      const rr = R(NECK) * lobe(phi, NECK) + 0.012;
      cordPts.push(V3(Math.sin(phi) * rr, NECK + 0.012 * Math.sin(phi * 2), Math.cos(phi) * rr));
    }
    gG.add(ring(cordPts, 0.017, silk));
    const knot = mesh(new THREE.SphereGeometry(0.04, 16, 12), silk);
    knot.position.set(Math.sin(KA) * (R(NECK) + 0.02), NECK, Math.cos(KA) * (R(NECK) + 0.02));
    knot.scale.set(1, 1.15, 0.9);
    gG.add(knot);
    const tasselG = new THREE.Group();
    tasselG.scale.setScalar(0.72);
    bodyG.add(tasselG);
    tasselG.add(mesh(new THREE.SphereGeometry(0.03, 12, 10), silkDark, false));
    const tasselBand = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), ivory, false);
    tasselBand.position.y = -0.04;
    tasselG.add(tasselBand);
    tasselG.add(mesh(new THREE.LatheGeometry([V2(0.0001, -0.2), V2(0.03, -0.2), V2(0.055, -0.17), V2(0.045, -0.1), V2(0.028, -0.05), V2(0.0001, -0.04)], 18), silk));
    const tasselCord = mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), silk, false);
    bodyG.add(tasselCord);

    const dR = s => (R(s + 0.004) - R(s - 0.004)) / 0.008;
    const holeAt = (s, phi, rh) => {
      const rr = R(s) * lobe(phi, s);
      const p = V3(Math.sin(phi) * rr, s, Math.cos(phi) * rr);
      const n = V3(Math.sin(phi), -dR(s), Math.cos(phi)).normalize();
      const pts = [];
      const t1 = V3(0, 1, 0).cross(n).normalize();
      const t2 = n.clone().cross(t1).normalize();
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * TAU;
        const d = t1.clone().multiplyScalar(Math.cos(a) * rh).addScaledVector(t2, Math.sin(a) * rh);
        const q = p.clone().add(d);
        const qs = q.y;
        const qphi = Math.atan2(q.x, q.z);
        const qr = R(qs) * lobe(qphi, qs);
        pts.push(V3(Math.sin(qphi) * qr, qs, Math.cos(qphi) * qr).addScaledVector(n, 0.004));
      }
      gG.add(ring(pts, 0.014, ivory));
      const disc = mesh(new THREE.CircleGeometry(rh * 0.98, 32), darkMat, false);
      disc.material = darkMat.clone();
      disc.material.side = THREE.DoubleSide;
      disc.position.copy(p).addScaledVector(n, -0.012);
      disc.quaternion.setFromUnitVectors(V3(0, 0, 1), n);
      gG.add(disc);
      const anchor = new THREE.Object3D();
      anchor.position.copy(p).addScaledVector(n, -0.01);
      gG.add(anchor);
      return { anchor, n };
    };

    const front = new THREE.Group();
    gG.add(front);
    const collar = mesh(new THREE.SphereGeometry(0.2, 32, 20), chitin);
    collar.scale.set(1.1, 0.8, 1.1);
    collar.position.set(0, S1 - 0.02, 0);
    front.add(collar);
    const headPivot = new THREE.Group();
    headPivot.position.set(0, S1 + 0.27, 0.03);
    front.add(headPivot);
    const head = new THREE.Group();
    head.scale.setScalar(1.38);
    headPivot.add(head);
    const skull = mesh(new THREE.SphereGeometry(0.27, 44, 30), headMat);
    skull.scale.set(1.08, 0.98, 0.98);
    head.add(skull);
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.62, whiteColor: 0xfffaf0, pupilColor: 0x160c06 });
      e.g.position.set(0.11 * s, 0.06, 0.215);
      e.g.rotation.y = 0.45 * s;
      head.add(e.g);
      return e;
    });
    const mandibles = [-1, 1].map(s => {
      const mg = new THREE.Group();
      mg.position.set(0.026 * s, -0.142, 0.226);
      head.add(mg);
      const m = mesh(new THREE.ConeGeometry(0.014, 0.035, 10), ivory, false);
      m.position.y = -0.03;
      m.rotation.z = -0.3 * s;
      mg.add(m);
      return mg;
    });
    const mouth = mesh(new THREE.TorusGeometry(0.042, 0.01, 6, 16, Math.PI), darkMat, false);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.125, 0.238);
    mouth.rotation.x = -0.45;
    head.add(mouth);
    const lidAnchorHead = new THREE.Object3D();
    lidAnchorHead.position.set(0.0, 0.235, -0.03);
    lidAnchorHead.rotation.set(-0.16, 0, 0.16);
    head.add(lidAnchorHead);
    const lidAnchorGourd = new THREE.Object3D();
    lidAnchorGourd.position.set(0, S1 + 0.012, 0);
    gG.add(lidAnchorGourd);

    const lid = new THREE.Group();
    big.add(lid);
    const LR = 0.25;
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
    lid.add(mesh(new THREE.LatheGeometry([V2(0.0001, 0.06), V2(0.04, 0.062), V2(0.045, 0.08), V2(0.03, 0.1), V2(0.035, 0.118), V2(0.022, 0.135), V2(0.0001, 0.14)], 20), ivory));
    const holeLocal = [-1, 1].map(s => V3(0.08 * s, 0.058, 0.1));
    holeLocal.forEach(h => {
      const r = mesh(new THREE.TorusGeometry(0.024, 0.008, 8, 18), ivory, false);
      r.rotation.x = Math.PI / 2;
      r.position.copy(h);
      lid.add(r);
    });

    const antMeshes = [-1, 1].map(() => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), chitin);
      m.castShadow = true;
      m.frustumCulled = false;
      big.add(m);
      const tip = mesh(new THREE.SphereGeometry(0.03, 14, 10), chitinLight, false);
      big.add(tip);
      return { m, tip };
    });
    const AN = 22;
    const buildAntenna = (a, pts) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const n = 60;
      const rs = 8;
      const g = new THREE.TubeGeometry(curve, n, 1, rs - 1, false);
      const p = g.attributes.position;
      for (let i = 0; i <= n; i++) {
        const c = curve.getPointAt(i / n);
        const r = lerp(0.02, 0.009, i / n);
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
      return new THREE.LatheGeometry(pts, 22);
    };
    const DOWN = V3(0, -1, 0);
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const placeLimb = (m, a, b, len, sc) => {
      m.position.copy(a);
      tmpA.subVectors(b, a);
      const d = tmpA.length();
      if (d < 1e-5) return;
      m.quaternion.setFromUnitVectors(DOWN, tmpA.multiplyScalar(1 / d));
      m.scale.set(sc, d / len, sc);
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

    const legs = [-1, 1].map(sx => {
      const hole = holeAt(0.26, sx * 1.15, 0.11);
      const l1 = 0.15;
      const l2 = 0.15;
      const thigh = mesh(limbGeo(l1, 0.072, 0.06, 0.02, 10), femurMat);
      const shin = mesh(limbGeo(l2, 0.06, 0.056, 0.0, 6), chitin);
      const hipBall = mesh(new THREE.SphereGeometry(0.072, 18, 14), chitin, false);
      const kneeBall = mesh(new THREE.SphereGeometry(0.06, 16, 12), chitin, false);
      const foot = new THREE.Group();
      const sole = mesh(new THREE.SphereGeometry(1, 22, 14), chitinLight);
      sole.scale.set(0.085, 0.055, 0.115);
      sole.position.set(0, 0.04, 0.04);
      foot.add(sole);
      [-1, 1].forEach(c => {
        const cl = mesh(new THREE.SphereGeometry(0.026, 12, 10), chitinLight, false);
        cl.position.set(c * 0.042, 0.03, 0.14);
        foot.add(cl);
      });
      const ankleBall = mesh(new THREE.SphereGeometry(0.056, 14, 10), chitin, false);
      big.add(thigh, shin, hipBall, kneeBall, foot, ankleBall);
      return { sx, hole, l1, l2, thigh, shin, hipBall, kneeBall, foot, ankleBall, rest: V3(0.17 * sx, 0, 0.07), pole: V3(sx * 0.2, 0.2, 1), knee: V3(0, 0, 0), ft: V3(0, 0, 0) };
    });
    const arms = [-1, 1].map(sx => {
      const hole = holeAt(0.95, sx * 1.5, 0.085);
      const l1 = 0.1;
      const l2 = 0.1;
      const upperArm = mesh(limbGeo(l1, 0.052, 0.046, 0.008, 6), chitin);
      const fore = mesh(limbGeo(l2, 0.046, 0.044, 0.0, 6), chitinLight);
      const shoulder = mesh(new THREE.SphereGeometry(0.056, 16, 12), chitin, false);
      const elbow = mesh(new THREE.SphereGeometry(0.048, 14, 10), chitin, false);
      const fist = new THREE.Group();
      const ball = mesh(new THREE.SphereGeometry(0.068, 22, 16), chitinLight);
      ball.position.y = -0.05;
      fist.add(ball);
      const w = mesh(new THREE.TorusGeometry(0.046, 0.014, 8, 26), silk, false);
      w.rotation.x = Math.PI / 2;
      w.position.y = 0.0;
      fist.add(w);
      const bow = mesh(new THREE.SphereGeometry(0.02, 10, 8), silk, false);
      bow.position.set(0, 0.0, -0.058);
      fist.add(bow);
      big.add(upperArm, fore, shoulder, elbow, fist);
      return { sx, hole, l1, l2, upperArm, fore, shoulder, elbow, fist, ball, pole: V3(sx * 0.7, -0.4, -0.7), el: V3(0, 0, 0), hand: V3(0, 0, 0) };
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
    const gToBig = v => big.worldToLocal(gG.localToWorld(v));
    let tasselVel = 0;
    let tasselAng = 0;
    const HAND_REST = [-1, 1].map(sx => V3(sx * 0.34, 0.74, 0.22));

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;

        const breath = Math.sin(t * 1.8) * motion;
        let lift = 0;
        let squat = 0;
        let lean = 0.04;
        let twist = 0;
        let rock = Math.sin(t * 0.9) * 0.012 * motion;
        let shake = 0;
        let retract = 0;
        let lidOff = 0;
        let lidRaise = 0;
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
        let saw = 0;
        let starK = 0;
        const hands = HAND_REST.map(h => h.clone().add(V3(0, breath * 0.012, 0)));
        const feet = legs.map(L => L.rest.clone());

        if (nm === "jump") {
          const crouch = smooth(0.02, 0.2, p) * (1 - smooth(0.2, 0.3, p));
          const air = Math.sin(Math.PI * smooth(0.22, 0.78, p));
          const land = smooth(0.76, 0.82, p) * (1 - smooth(0.84, 1, p));
          squat = 0.06 * crouch + 0.05 * land;
          lift = 0.4 * air;
          follow = smooth(0.3, 0.45, p) * (1 - smooth(0.68, 0.8, p));
          lean = 0.04 + 0.1 * crouch - 0.06 * air;
          antSweep = -0.5 * air;
          hands.forEach((h, i) => h.lerp(V3((i ? 1 : -1) * 0.42, 1.2, 0.05), air));
          if (p > 0.78 && p < 0.97) impact = Math.sin(((p - 0.78) / 0.19) * Math.PI) * 0.6;
        } else if (nm === "jab") {
          const up = smooth(0.0, 0.16, p) * (1 - smooth(0.86, 1, p));
          const pk = (st, en) => (p > st && p < en ? Math.sin(Math.PI * smooth(st, en, p)) : 0);
          const jL = pk(0.18, 0.4);
          const jR = pk(0.4, 0.62);
          const jB = pk(0.62, 0.86);
          hands.forEach((h, i) => {
            const sx = i ? 1 : -1;
            h.lerp(V3(sx * 0.17, 1.12, 0.34), up);
            h.lerp(V3(sx * 0.07, 1.05, 0.72), (i ? jR : jL) + jB);
          });
          twist = 0.22 * (jL - jR);
          lean = 0.04 + 0.12 * up + 0.08 * (jL + jR + jB);
          squat = 0.05 * up;
          headPitch = 0.05 * up;
          const pkv = Math.max(jL, jR, jB);
          if (pkv > 0.75) {
            impact = 0.4;
            starK = 1;
          }
          antQuiver = up * 0.5;
        } else if (nm === "chirp") {
          const k = smooth(0.04, 0.16, p) * (1 - smooth(0.84, 0.97, p));
          shake = k;
          saw = k;
          headPitch = -0.15 * k;
          antQuiver = k;
          ringK = k;
          hands.forEach((h, i) => h.lerp(V3((i ? 1 : -1) * 0.3, 0.88, 0.32), k));
        } else if (nm === "hide") {
          lidRaise = smooth(0.03, 0.12, p) * (1 - smooth(0.88, 0.96, p));
          lidOff = smooth(0.14, 0.32, p) * (1 - smooth(0.68, 0.84, p));
          retract = smooth(0.08, 0.26, p) * (1 - smooth(0.74, 0.92, p));
          const wob = smooth(0.38, 0.45, p) * (1 - smooth(0.56, 0.64, p));
          rock += Math.sin(t * 9) * 0.06 * wob;
          if (p > 0.3 && p < 0.4) impact = Math.sin(((p - 0.3) / 0.1) * Math.PI) * 0.35;
        } else if (nm === "sniff") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.85, 1, p));
          antPoke = k;
          antSweep = Math.sin(p * Math.PI * 3) * 0.6 * k;
          headPitch = 0.28 * k;
          headYaw = Math.sin(p * Math.PI * 3) * 0.3 * k;
          lean = 0.04 + 0.12 * k;
        } else if (nm === "taunt") {
          const k = smooth(0, 0.14, p) * (1 - smooth(0.82, 1, p));
          const w = Math.sin(p * Math.PI * 6);
          hands[1].lerp(V3(0.38 + 0.06 * w, 1.32, 0.3 - 0.08 * w), k);
          hands[0].lerp(V3(-0.2, 1.0, 0.36), k);
          headRoll = -0.18 * k;
          headYaw = 0.12 * k;
          squat = 0.05 * k * Math.abs(Math.sin(p * Math.PI * 4));
          antQuiver = 0.6 * k;
        } else if (nm === "eat") {
          const k = smooth(0.14, 0.3, p) * (1 - smooth(0.86, 0.98, p));
          hands.forEach((h, i) => h.lerp(V3((i ? 1 : -1) * 0.12, 1.18, 0.42), k));
          headPitch = 0.22 * k;
          chew = ph && ph.chew ? ph.chew : 0;
        }

        root.rotation.y = lookYaw;
        pivot.rotation.x = lean + rock * 0.3;
        pivot.rotation.z = rock + Math.sin(t * 46) * 0.018 * shake;
        bodyG.rotation.y = twist;
        const settle = smooth(0.2, 0.55, retract) * GY;
        bodyG.position.y = lift - squat - settle + breath * 0.006 + Math.abs(Math.sin(t * 40)) * 0.01 * shake;

        front.position.y = -0.5 * smooth(0, 0.8, retract);
        headPivot.scale.setScalar(lerp(1, 0.42, smooth(0, 0.6, retract)));
        collar.scale.set(lerp(1, 0.7, smooth(0, 0.6, retract)), lerp(0.8, 0.56, smooth(0, 0.6, retract)), lerp(1, 0.7, smooth(0, 0.6, retract)));
        head.rotation.set(headPitch + lookPitch * 0.4 + breath * 0.02, headYaw + pointer.x * 0.15, headRoll);
        mandibles.forEach((m, i) => (m.rotation.z = (i ? -1 : 1) * (0.08 + chew * 0.35)));
        mouth.scale.set(1, 1 + chew * 0.8, 1);

        root.updateMatrixWorld(true);
        mInv.copy(big.matrixWorld).invert();
        mA.multiplyMatrices(mInv, lidAnchorHead.matrixWorld);
        mB.multiplyMatrices(mInv, lidAnchorGourd.matrixWorld);
        mA.decompose(pA, qA, sA);
        mB.decompose(pB, qB, v3);
        pA.y += 0.2 * lidRaise;
        v1.copy(pA).lerp(pB, lidOff);
        v1.y += 0.12 * Math.sin(Math.PI * lidOff);
        lid.position.copy(v1);
        lid.quaternion.copy(qA).slerp(qB, lidOff);
        lid.scale.setScalar(lerp(sA.x, v3.x, lidOff));
        lid.updateMatrixWorld(true);

        const lidUp = V3(0, 1, 0).applyQuaternion(lid.quaternion);
        const fwd = V3(0, 0, 1).applyQuaternion(lid.quaternion);
        antMeshes.forEach((a, i) => {
          const sx = i ? 1 : -1;
          const b = big.worldToLocal(lid.localToWorld(holeLocal[i].clone()));
          const sway = Math.sin(t * 1.6 + i * 1.3) * 0.06 * motion;
          const q = Math.sin(t * 38 + i) * 0.025 * antQuiver;
          const pts = [];
          for (let k = 0; k < AN; k++) {
            const u = k / (AN - 1);
            const arch = Math.min(1, u / 0.75);
            const curl = smooth(0.7, 1, u);
            const h = 0.24 * Math.sin(Math.PI * 0.62 * arch) - curl * 0.05 * (1 - Math.cos((u - 0.7) * 14));
            const f = 0.1 * arch - 0.22 * arch * arch + curl * 0.07 * Math.sin((u - 0.7) * 14);
            const v = b.clone();
            v.addScaledVector(lidUp, lerp(h, 0.1 * u - 0.45 * u * u, antPoke));
            v.addScaledVector(fwd, lerp(f, 0.45 * u, antPoke));
            v.x += sx * (0.02 + 0.13 * u) + antSweep * u * 0.3 * sx + (sway + q) * u * u;
            v.y += (sway * 0.5 - q) * u * u;
            if (v.y < 0.03) v.y = 0.03;
            pts.push(v);
          }
          buildAntenna(a, pts);
        });

        const limbSc = lerp(1, 0.0, smooth(0.05, 0.4, retract));
        const limbVis = limbSc > 0.04;
        legs.forEach((L, i) => {
          const hip = toBig(L.hole.anchor, v1.set(0, 0, 0)).clone();
          const target = feet[i];
          if (saw && L.sx > 0) {
            const sw = Math.sin(t * 24);
            target.set(0.32, 0.22 + 0.06 * sw, 0.05 + 0.12 * sw);
            target.lerp(L.rest, 1 - saw);
          }
          target.y += (lift + breath * 0.006) * follow;
          target.lerp(hip, 1 - limbSc);
          ik(hip, target, L.l1 * Math.max(limbSc, 0.05), L.l2 * Math.max(limbSc, 0.05), L.pole, L.knee, L.ft);
          placeLimb(L.thigh, hip, L.knee, L.l1, limbSc);
          placeLimb(L.shin, L.knee, L.ft, L.l2, limbSc);
          L.hipBall.position.copy(hip);
          L.kneeBall.position.copy(L.knee);
          L.ankleBall.position.copy(L.ft);
          L.foot.position.copy(L.ft).setY(L.ft.y - 0.035 * limbSc);
          L.foot.rotation.set(0, L.sx * 0.18, 0);
          [L.hipBall, L.kneeBall, L.ankleBall, L.foot].forEach(m => m.scale.setScalar(limbSc));
          [L.thigh, L.shin, L.hipBall, L.kneeBall, L.ankleBall, L.foot].forEach(m => (m.visible = limbVis));
        });
        arms.forEach((A, i) => {
          const sh = toBig(A.hole.anchor, v1.set(0, 0, 0)).clone();
          const target = gToBig(hands[i].clone());
          target.lerp(sh, 1 - limbSc);
          ik(sh, target, A.l1 * Math.max(limbSc, 0.05), A.l2 * Math.max(limbSc, 0.05), A.pole, A.el, A.hand);
          placeLimb(A.upperArm, sh, A.el, A.l1, limbSc);
          placeLimb(A.fore, A.el, A.hand, A.l2, limbSc);
          A.shoulder.position.copy(sh);
          A.elbow.position.copy(A.el);
          A.fist.position.copy(A.hand);
          v2.subVectors(A.hand, A.el).normalize();
          A.fist.quaternion.setFromUnitVectors(DOWN, v2);
          [A.shoulder, A.elbow, A.fist].forEach(m => m.scale.setScalar(limbSc));
          [A.upperArm, A.fore, A.shoulder, A.elbow, A.fist].forEach(m => (m.visible = limbVis));
        });

        toBig(knot, v2);
        tasselVel += (-tasselAng * 30 - tasselVel * 4 + shake * Math.sin(t * 46) * 40 + (nm === "jump" ? Math.cos(Math.PI * smooth(0.22, 0.78, p)) * 6 : 0) + twist * 20) * 0.016;
        tasselAng += tasselVel * 0.016;
        tasselAng = Math.max(-0.8, Math.min(0.8, tasselAng));
        const tp = v2.clone();
        const out = V3(Math.sin(KA), 0, Math.cos(KA)).applyQuaternion(bodyG.getWorldQuaternion(new THREE.Quaternion()));
        const bottom = tp.clone().addScaledVector(out, 0.15 + Math.abs(tasselAng) * 0.02);
        bottom.y -= 0.13;
        bottom.x += Math.sin(tasselAng) * 0.05;
        const bl = bodyG.worldToLocal(big.localToWorld(bottom.clone()));
        tasselG.position.copy(bl);
        tasselG.rotation.set(0, 0, tasselAng * 0.5);
        const tpl = bodyG.worldToLocal(big.localToWorld(tp.clone()));
        tasselCord.position.copy(tpl).add(bl).multiplyScalar(0.5);
        v3.subVectors(tpl, bl);
        tasselCord.scale.set(1, Math.max(0.01, v3.length()), 1);
        tasselCord.quaternion.setFromUnitVectors(V3(0, 1, 0), v3.normalize());

        const close = Math.max(1 - blink, retract > 0.3 ? 1 : 0);
        eyes.forEach(({ g }) => {
          g.scale.y = lerp(1, 0.1, close);
        });
        followPupils(eyes, pointer, 0.6);

        rings.forEach((r, i) => {
          r.visible = ringK > 0.05;
          if (!r.visible) return;
          const q = (t * 1.6 + i / 3) % 1;
          r.position.copy(toBig(gG, v2)).add(V3(0, 0.45, 0));
          r.rotation.set(Math.PI / 2, 0, 0);
          r.scale.setScalar(0.45 + q * 0.7);
          r.material.opacity = 0.55 * (1 - q) * ringK;
        });
        stars.forEach((st, i) => {
          st.visible = starK > 0;
          if (!st.visible) return;
          const a = t * 9 + (i / 3) * TAU;
          st.position.copy(gToBig(V3(0, 1.05, 0.85))).add(V3(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0));
          st.rotation.set(t * 5, t * 3, 0);
        });
        const fx = impact > 0.05 && nm !== "jab";
        dust.forEach(d => {
          d.m.visible = fx;
          if (!fx) return;
          const u = 1 - impact;
          const r = 0.5 + u * 0.45;
          d.m.position.set(Math.cos(d.a) * r, 0.06 + u * 0.12, Math.sin(d.a) * r * 0.8);
          d.m.scale.setScalar(0.4 + u * 0.7);
          dustMat.opacity = 0.32 * impact;
        });

        if (nm === "eat" && ph) {
          food.visible = ph.visible;
          const target = gToBig(V3(0, 1.2, 0.5));
          food.position.set(target.x, lerp(3.4, target.y, ph.fall * ph.fall), target.z);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.62);
        } else food.visible = false;
      }
    };
  }
});
