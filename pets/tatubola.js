Pets.register({
  id: "tatubola",
  dex: 41,
  name: "Tatubola",
  color: "#c8923e",
  types: ["ground", "steel"],
  stage: 2,
  evolvesTo: "escavatatu",
  evolveLevel: 36,
  description: "O corpo virou uma bola quase perfeita, e só o rosto, as patinhas e a cauda ficam para fora. As cintas de aço passam por cima das costas de um lado ao outro, e quando se assusta ele recolhe tudo, tampa a abertura com o elmo e sai rolando ladeira abaixo.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    curl: { duration: 2.8 },
    roll: { duration: 2.3 },
    drift: { duration: 3.0 },
    dig: { duration: 2.6 },
    sniff: { duration: 1.9 },
    spin: { duration: 2.2 }
  },
  battle: { attack: { action: "roll", hit: 0.48, speed: 1.0 }, special: { action: "drift", hit: 0.62, speed: 1.0 } },
  idle: [
    { action: "sniff", min: 12, max: 30 },
    { action: "drift", min: 30, max: 60 },
    { action: "dig", min: 30, max: 70 },
    { action: "curl", min: 40, max: 80 }
  ],
  clickAction: n => ["curl", "drift", "sniff", "roll", "dig", "spin"][(n - 1) % 6],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const TAU = Math.PI * 2;

    const root = new THREE.Group();
    const big = new THREE.Group();
    big.scale.setScalar(1.0);
    root.add(big);
    const bodyG = new THREE.Group();
    big.add(bodyG);

    const hasDoc = typeof document !== "undefined";

    const hexPath = (g, cx, cy, rr) => {
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath();
    };
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const scute = (g, cx, cy, r) => {
      const v = rnd();
      hexPath(g, cx, cy, r * 0.86);
      const gr = g.createRadialGradient(cx - r * 0.18, cy - r * 0.22, r * 0.05, cx, cy, r * 0.9);
      gr.addColorStop(0, v > 0.5 ? "#f0cf8c" : "#e9c27e");
      gr.addColorStop(0.55, v > 0.5 ? "#c9954f" : "#c08945");
      gr.addColorStop(1, "#8a5a28");
      g.fillStyle = gr;
      g.fill();
      g.lineWidth = r * 0.07;
      g.strokeStyle = "rgba(255,236,190,0.35)";
      hexPath(g, cx, cy, r * 0.62);
      g.stroke();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + Math.PI / 6 + 0.5;
        g.beginPath();
        g.arc(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72, r * 0.035, 0, TAU);
        g.fillStyle = "rgba(60,36,16,0.6)";
        g.fill();
      }
    };

    const R = 0.75;
    const AC = Math.PI / 2 + 0.12;
    const BAND_A = [-1.0, -0.76, -0.52, -0.28];
    const wrapA = a => {
      let d = a - AC;
      while (d < 0) d += TAU;
      while (d >= TAU) d -= TAU;
      return d / TAU;
    };
    const shellTex = (() => {
      if (!hasDoc) return null;
      const W = 2048;
      const H = 512;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = "#3e2812";
      g.fillRect(0, 0, W, H);
      const cols = 22;
      const r = W / cols / Math.sqrt(3);
      for (let row = -1; row * r * 1.5 < H + r; row++)
        for (let col = -1; col <= cols; col++) scute(g, col * r * Math.sqrt(3) + (row % 2 ? (r * Math.sqrt(3)) / 2 : 0), row * r * 1.5, r);
      for (let b = 0; b < 3; b++) {
        const x0 = wrapA(BAND_A[b]) * W;
        const x1 = wrapA(BAND_A[b + 1]) * W;
        if (b === 1) {
          const gr = g.createLinearGradient(x0, 0, x1, 0);
          gr.addColorStop(0, "#4c535c");
          gr.addColorStop(0.5, "#98a2ad");
          gr.addColorStop(1, "#c0c8d0");
          g.fillStyle = gr;
          g.fillRect(x0, 0, x1 - x0, H);
          g.save();
          g.beginPath();
          g.rect(x0 + 10, 0, x1 - x0 - 20, H);
          g.clip();
          g.fillStyle = "#f2b705";
          g.fillRect(x0, 0, x1 - x0, H);
          g.fillStyle = "#1d1d1f";
          for (let y = -80; y < H + 80; y += 34) {
            g.beginPath();
            g.moveTo(x0, y);
            g.lineTo(x0, y + 17);
            g.lineTo(x1, y + 60);
            g.lineTo(x1, y + 43);
            g.closePath();
            g.fill();
          }
          g.restore();
        } else {
          const gr = g.createLinearGradient(x0, 0, x1, 0);
          gr.addColorStop(0, "#5a626b");
          gr.addColorStop(0.45, "#b9c2cb");
          gr.addColorStop(1, "#6d757e");
          g.fillStyle = gr;
          g.fillRect(x0, 0, x1 - x0, H);
          for (let y = 0; y < H; y += 24) {
            g.fillStyle = "rgba(40,44,50,0.55)";
            g.fillRect(x0, y, x1 - x0, 2);
          }
        }
        for (let y = 12; y < H; y += 24)
          [x0 + 6, x1 - 7].forEach(x => {
            g.beginPath();
            g.arc(x, y, 4, 0, TAU);
            g.fillStyle = "#2f343a";
            g.fill();
            g.beginPath();
            g.arc(x - 1.2, y - 1.2, 1.6, 0, TAU);
            g.fillStyle = "#eef2f5";
            g.fill();
          });
      }
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 8;
      return t;
    })();

    const plateTex = (() => {
      if (!hasDoc) return null;
      const N = 512;
      const c = document.createElement("canvas");
      c.width = N;
      c.height = N;
      const g = c.getContext("2d");
      const cols = 4;
      const rows = 4;
      const r = 70;
      const W0 = cols * r * Math.sqrt(3);
      const H0 = rows * r * 1.5;
      g.scale(N / W0, N / H0);
      g.fillStyle = "#3e2812";
      g.fillRect(0, 0, W0, H0);
      for (let row = -1; row <= rows; row++)
        for (let col = -1; col <= cols; col++) scute(g, col * r * Math.sqrt(3) + (row % 2 ? (r * Math.sqrt(3)) / 2 : 0), row * r * 1.5, r);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      return t;
    })();


    const shellMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: shellTex, roughness: 0.55, metalness: 0.15 });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: plateTex, roughness: 0.55, metalness: 0.1 });
    kit.surface(shellMat, shellTex, { flat: [[wrapA(BAND_A[0]), wrapA(BAND_A[1]), 0.38, 0.3], [wrapA(BAND_A[1]), wrapA(BAND_A[2]), 0.18, 0.42], [wrapA(BAND_A[2]), wrapA(BAND_A[3]), 0.38, 0.3]] });
    kit.surface(plateMat, plateTex, { seed: 5 });
    const plateMat2 = plateMat.clone();
    plateMat2.side = THREE.DoubleSide;
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x3a2814, roughness: 0.9, side: THREE.BackSide });
    const skinMat = mat(0xc08a64, 0.72);
        const noseMat = mat(0x9c5a50, 0.5);
    const keratin = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.35, metalness: 0.15 });
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xc28a46, roughness: 0.45, metalness: 0.1 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x6e4a22, roughness: 0.55, metalness: 0.1 });
    const ribMat = new THREE.MeshStandardMaterial({ color: 0xaab3bd, roughness: 0.25, metalness: 0.85 });
    const darkMat = mat(0x221a14, 0.5);

    const capUv = (g, r, k) => {
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) / r) * k * 0.5 + 0.5, (p.getZ(i) / r) * k + 0.5);
      return g;
    };
    const lameDome = (R, n, k) => {
      const pts = [];
      const S = 40;
      for (let i = 0; i <= S; i++) {
        const th = 1.3 * (1 - i / S);
        const q = ((1.3 - th) / 1.3) * n;
        const fr = q - Math.floor(q);
        const lip = i < S ? 1 + 0.06 * Math.pow(1 - fr, 2) * (1 - (i / S) * 0.5) : 1;
        pts.push(V2(Math.max(0.0001, R * Math.sin(th) * lip), R * Math.cos(th)));
      }
      const g = new THREE.LatheGeometry(pts, 40);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) / R) * k + 0.5, (p.getZ(i) / R) * k + 0.5);
      return g;
    };
    const domeWithRim = (R, n, k, tr) => {
      const d = mesh(lameDome(R, n, k), plateMat2);
      const rim = mesh(new THREE.TorusGeometry(R * Math.sin(1.3) * 1.06, tr, 8, 40), rimMat, false);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = R * Math.cos(1.3);
      d.add(rim);
      return d;
    };
    const clawGeo = (len, r, bend) => {
      const g = new THREE.ConeGeometry(r, len, 14, 10);
      g.rotateX(Math.PI);
      g.translate(0, -len / 2, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const t = -p.getY(i) / len;
        p.setZ(i, p.getZ(i) * 0.75 + t * t * len * bend);
        p.setX(i, p.getX(i) * 0.9);
      }
      g.computeVertexNormals();
      return g;
    };
    const ringBand = (r0, y0, y1, n) => {
      const pts = [V2(0.0001, y0 - 0.001), V2(r0 * 0.9, y0)];
      const h = (y1 - y0) / n;
      for (let k = 0; k < n; k++) {
        const a = y0 + k * h;
        pts.push(V2(r0 * 1.02, a + h * 0.08), V2(r0 * 1.1, a + h * 0.4), V2(r0 * 1.07, a + h * 0.85), V2(r0 * 0.99, a + h * 0.99));
      }
      pts.push(V2(r0 * 0.9, y1 + 0.001), V2(0.0001, y1 + 0.002));
      return new THREE.LatheGeometry(pts, 28);
    };

    const ball = new THREE.Group();
    bodyG.add(ball);
    const CY = 0.98;
    ball.position.y = CY;
    const core = mesh(new THREE.SphereGeometry(R * 0.95, 48, 32), skinMat);
    ball.add(core);

    const HW = 0.36;
    const B0 = 0.5;
    const NU = 96;
    const NV = 96;
    const ridge = a => {
      let r = 0;
      BAND_A.forEach((b, i) => {
        let d = a - b;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        if (i > 0) r += 0.03 * Math.exp(-((d + 0.012) * (d + 0.012)) / 0.0003) - 0.012 * Math.exp(-((d - 0.02) * (d - 0.02)) / 0.0004);
        else r -= 0.015 * Math.exp(-(d * d) / 0.0003);
      });
      return r;
    };
    const betaAt = x => (Math.abs(x) < HW ? B0 * Math.sqrt(1 - (x / HW) * (x / HW)) : 0);
    const sPos = [];
    const sUv = [];
    const sIdx = [];
    const rowAng = [];
    for (let i = 0; i <= NU; i++) {
      const th = (i / NU) * Math.PI;
      const x = R * Math.cos(th);
      const rho = R * Math.sin(th);
      const be = betaAt(x);
      const row = [];
      for (let j = 0; j <= NV; j++) {
        const ang = AC + be + ((TAU - 2 * be) * j) / NV;
        const rk = 1 + ridge(ang) * Math.min(1, Math.sin(th) * 4);
        sPos.push(x * rk, rho * Math.cos(ang) * rk, rho * Math.sin(ang) * rk);
        sUv.push((ang - AC) / TAU, th / Math.PI);
        row.push(ang);
        if (i < NU && j < NV) {
          const k = i * (NV + 1) + j;
          sIdx.push(k, k + NV + 1, k + 1, k + 1, k + NV + 1, k + NV + 2);
        }
      }
      rowAng.push(row);
    }
    const shellGeo = new THREE.BufferGeometry();
    shellGeo.setAttribute("position", new THREE.Float32BufferAttribute(sPos, 3));
    shellGeo.setAttribute("uv", new THREE.Float32BufferAttribute(sUv, 2));
    shellGeo.setIndex(sIdx);
    shellGeo.computeVertexNormals();
    ball.add(mesh(shellGeo, shellMat));
    const shellIn = new THREE.Mesh(shellGeo, innerMat);
    shellIn.scale.setScalar(0.985);
    ball.add(shellIn);
    const onBall = (th, a, off = 0) => {
      const x = Math.cos(th);
      const rho = Math.sin(th);
      return V3(x, rho * Math.cos(a), rho * Math.sin(a)).multiplyScalar(R + off);
    };
    const holeLoop = [];
    const NH = 72;
    for (let k = 0; k < NH; k++) {
      const q = (k / NH) * TAU;
      const x = -HW * Math.cos(q);
      const be = betaAt(x) * (Math.sin(q) >= 0 ? 1 : -1);
      const th = Math.acos(Math.max(-1, Math.min(1, x / R)));
      holeLoop.push(onBall(th, AC + be, 0.004));
    }
    ball.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(holeLoop, true), 160, 0.035, 10, true), rimMat));
    BAND_A.forEach((a, n) => {
      if (n === 0) return;
      const pts = [];
      for (let k = 1; k < 40; k++) pts.push(onBall((k / 40) * Math.PI, a, 0.01));
      ball.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.022, 8, false), ribMat));
    });
    [-1, 1].forEach(s => {
      const boss = domeWithRim(0.22, 2, 0.45, 0.02);
      boss.position.set(s * (R - 0.035), 0, 0);
      boss.rotation.z = -s * Math.PI / 2;
      ball.add(boss);
      const bolt = mesh(new THREE.SphereGeometry(0.05, 16, 12), knobMat);
      bolt.position.set(s * (R + 0.17), 0, 0);
      ball.add(bolt);
    });
    const UPV = V3(0, 1, 0);
    const knobGeo = new THREE.LatheGeometry([V2(0.065, -0.03), V2(0.068, 0.008), V2(0.058, 0.036), V2(0.04, 0.058), V2(0.019, 0.073), V2(0.0001, 0.078)], 16);
    [0.15, -0.08, -1.25, -1.55, -1.85, -2.15, -2.45].forEach(a => {
      [Math.PI / 2, Math.PI / 2 - 0.32, Math.PI / 2 + 0.32].forEach((th, n) => {
        const p = onBall(th, a, -0.01);
        const m = mesh(knobGeo, knobMat, n === 0);
        if (n) m.scale.setScalar(0.72);
        m.position.copy(p);
        m.quaternion.setFromUnitVectors(UPV, p.clone().normalize());
        ball.add(m);
      });
    });

    const paws = [-1, 1].map(sx => {
      const base = V3(0.27 * sx, -0.42, 0.5);
      const pg = new THREE.Group();
      pg.position.copy(base);
      ball.add(pg);
      pg.add(mesh(new THREE.LatheGeometry([V2(0.0001, -0.22), V2(0.075, -0.21), V2(0.09, -0.15), V2(0.095, -0.05), V2(0.1, 0.06), V2(0.0001, 0.1)], 20), skinMat));
      const hand = new THREE.Group();
      hand.position.y = -0.21;
      pg.add(hand);
      const palm = mesh(new THREE.SphereGeometry(0.095, 18, 12), skinMat);
      palm.scale.set(1.05, 0.7, 1);
      hand.add(palm);
      [-1, 0, 1].forEach(c => {
        const cg = new THREE.Group();
        cg.position.set(c * 0.052, -0.03, 0.06);
        cg.rotation.set(-1.0, 0, c * 0.12);
        hand.add(cg);
        cg.add(mesh(new THREE.SphereGeometry(c ? 0.027 : 0.032, 12, 10), keratin, false));
        cg.add(mesh(clawGeo(c ? 0.12 : 0.15, c ? 0.027 : 0.032, 0.35), keratin));
      });
      return { pg, hand, palm, sx, base };
    });

    const HIPY = 0.42;
    const legs = [-1, 1].map(sx => {
      const base = V3(0.34 * sx, HIPY, 0.0);
      const hip = new THREE.Group();
      hip.position.copy(base);
      bodyG.add(hip);
      hip.add(mesh(new THREE.SphereGeometry(0.17, 20, 14), skinMat));
      hip.add(mesh(new THREE.LatheGeometry([V2(0.0001, -0.18), V2(0.12, -0.17), V2(0.15, -0.11), V2(0.165, -0.04), V2(0.17, 0.02), V2(0.0001, 0.08)], 22), skinMat));
      const knee = new THREE.Group();
      knee.position.y = -0.17;
      hip.add(knee);
      knee.add(mesh(new THREE.SphereGeometry(0.12, 16, 12), skinMat));
      knee.add(mesh(new THREE.LatheGeometry([V2(0.0001, -0.18), V2(0.1, -0.17), V2(0.11, -0.1), V2(0.115, -0.03), V2(0.12, 0.0), V2(0.0001, 0.04)], 20), skinMat));
      const ankle = new THREE.Group();
      ankle.position.y = -0.17;
      knee.add(ankle);
      ankle.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), skinMat));
      const foot = mesh(new THREE.SphereGeometry(0.16, 24, 16), skinMat);
      foot.scale.set(1.05, 0.55, 1.4);
      foot.position.set(0, -0.07, 0.07);
      ankle.add(foot);
      [-1, 0, 1].forEach(c => {
        const t = mesh(clawGeo(0.1, 0.03, 0.0), keratin, false);
        t.rotation.x = -Math.PI / 2 - 0.35;
        t.position.set(c * 0.08, -0.08, 0.27 - Math.abs(c) * 0.03);
        ankle.add(t);
      });
      return { hip, knee, ankle, sx, base };
    });
    const L1 = 0.17;
    const L2 = 0.17;
    const FH = 0.07;

    const headPivot = new THREE.Group();
    ball.add(headPivot);
    const head = new THREE.Group();
    head.scale.setScalar(0.92);
    headPivot.add(head);
    const skull = mesh(new THREE.SphereGeometry(0.36, 40, 28), skinMat);
    skull.scale.set(1.05, 0.9, 1.02);
    head.add(skull);
    const snoutProfile = [V2(0.22, -0.05), V2(0.2, 0.06), V2(0.155, 0.2), V2(0.115, 0.31), V2(0.085, 0.38), V2(0.0001, 0.395)];
    const snoutGeo = new THREE.LatheGeometry(snoutProfile, 36);
    snoutGeo.rotateX(Math.PI / 2);
    const snout = mesh(snoutGeo, skinMat);
    snout.scale.set(1, 0.8, 1);
    snout.position.set(0, -0.1, 0.18);
    snout.rotation.x = 0.2;
    head.add(snout);
    const nose = mesh(new THREE.SphereGeometry(0.08, 20, 14), noseMat, false);
    nose.scale.set(1.25, 0.85, 0.6);
    nose.position.set(0, 0, 0.385);
    snout.add(nose);
    [-1, 1].forEach(s => {
      const n = mesh(new THREE.SphereGeometry(0.018, 10, 8), darkMat, false);
      n.position.set(0.032 * s, 0, 0.045);
      nose.add(n);
    });
    const HC = 1.05;
    const HT = -0.22;
    const helmetGeo = new THREE.SphereGeometry(0.36, 56, 24, 0, TAU, 0, HC);
    helmetGeo.rotateX(HT);
    capUv(helmetGeo, 0.36, 0.55);
    const helmet = mesh(helmetGeo, plateMat2);
    helmet.scale.set(1.05 * 1.04, 0.9 * 1.04, 1.02 * 1.04);
    head.add(helmet);
    const hEdge = [];
    for (let k = 0; k < 64; k++) {
      const ph = (k / 64) * TAU;
      const v = V3(-0.36 * Math.cos(ph) * Math.sin(HC), 0.36 * Math.cos(HC), 0.36 * Math.sin(ph) * Math.sin(HC));
      v.applyAxisAngle(V3(1, 0, 0), HT);
      v.set(v.x * 1.05 * 1.04, v.y * 0.9 * 1.04, v.z * 1.02 * 1.04);
      hEdge.push(v);
    }
    head.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hEdge, true), 128, 0.02, 8, true), rimMat));
    const plateProf = [];
    for (let k = 0; k <= 10; k++) {
      const y = 0.04 + k * 0.026;
      let x = 0;
      for (let q = 0; q < snoutProfile.length - 1; q++) {
        const A = snoutProfile[q];
        const B = snoutProfile[q + 1];
        if (y >= A.y && y <= B.y) x = lerp(A.x, B.x, (y - A.y) / (B.y - A.y));
      }
      plateProf.push(V2(x * 1.045, y));
    }
    const snoutPlateGeo = new THREE.LatheGeometry(plateProf, 32, Math.PI - 0.9, 1.8);
    snoutPlateGeo.rotateX(Math.PI / 2);
    {
      const pp = snoutPlateGeo.attributes.position;
      const uv = snoutPlateGeo.attributes.uv;
      for (let i = 0; i < pp.count; i++) uv.setXY(i, pp.getX(i) * 2.6, pp.getZ(i) * 2.6);
    }
    snout.add(mesh(snoutPlateGeo, plateMat2));
    const ears = [-1, 1].map(s => {
      const eg = new THREE.Group();
      eg.position.set(0.3 * s, 0.07, -0.17);
      eg.rotation.set(-0.35, 0.5 * s, -0.55 * s);
      head.add(eg);
      const outer = mesh(new THREE.SphereGeometry(0.1, 20, 14), skinMat);
      outer.scale.set(0.95, 1.5, 0.38);
      outer.position.y = 0.11;
      eg.add(outer);
      const inner = mesh(new THREE.SphereGeometry(0.07, 18, 12), noseMat, false);
      inner.scale.set(0.95, 1.45, 0.25);
      inner.position.set(0, 0.12, 0.024);
      eg.add(inner);
      return eg;
    });
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.5, whiteColor: 0xfffaf2, pupilColor: 0x1e1612 });
      e.g.position.set(0.17 * s, 0.03, 0.27);
      e.g.rotation.y = 0.42 * s;
      head.add(e.g);
      return e;
    });
    const lids = eyes.map(({ g }) => {
      const hold = new THREE.Group();
      hold.scale.set(1.05, 1.13, 0.74);
      g.add(hold);
      const l = mesh(new THREE.SphereGeometry(0.1133, 28, 16, 0, TAU, 0, Math.PI * 0.55), skinMat, false);
      l.rotation.x = -1.77;
      hold.add(l);
      return l;
    });
    const mouth = mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 14, Math.PI), darkMat, false);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.24, 0.26);
    head.add(mouth);

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, -0.5, -0.5);
    ball.add(tailPivot);
    const NS = 56;
    const NC = 26;
    const tailGeo = new THREE.BufferGeometry();
    const tPos = new Float32Array(((NS + 1) * (NC + 1) + 1) * 3);
    const tUv = new Float32Array(((NS + 1) * (NC + 1) + 1) * 2);
    const tIdx = [];
    for (let i = 0; i <= NS; i++)
      for (let j = 0; j <= NC; j++) {
        const k = i * (NC + 1) + j;
        tUv[k * 2] = (j / NC) * 1.1;
        tUv[k * 2 + 1] = (i / NS) * 1.4;
        if (i < NS && j < NC) tIdx.push(k, k + NC + 1, k + 1, k + 1, k + NC + 1, k + NC + 2);
      }
    const capI = (NS + 1) * (NC + 1);
    for (let j = 0; j < NC; j++) tIdx.push(NS * (NC + 1) + j + 1, NS * (NC + 1) + j, capI);
    tailGeo.setAttribute("position", new THREE.BufferAttribute(tPos, 3));
    tailGeo.setAttribute("uv", new THREE.BufferAttribute(tUv, 2));
    tailGeo.setIndex(tIdx);
    const tailMesh = mesh(tailGeo, plateMat);
    tailMesh.frustumCulled = false;
    tailPivot.add(tailMesh);
    const tailRoot = mesh(new THREE.SphereGeometry(0.145, 22, 16), plateMat);
    tailRoot.scale.set(1, 0.95, 1.2);
    tailRoot.position.z = 0.04;
    tailPivot.add(tailRoot);
    const tipFrame = new THREE.Group();
    tailPivot.add(tipFrame);
    [-1, 0, 1].forEach(k => {
      const tooth = mesh(new THREE.ConeGeometry(0.03, 0.1, 10), keratin, false);
      tooth.rotation.x = -Math.PI / 2;
      tooth.scale.set(1, 1, 0.6);
      tooth.position.set(k * 0.07, -0.012, -0.03);
      tipFrame.add(tooth);
    });
    const TL = 0.78;
    const SPLIT = 0.6;
    const tailShape = (th0, bend, hook) => {
      let py = 0;
      let pz = 0;
      const ds = TL / NS;
      for (let i = 0; i <= NS; i++) {
        const s = i / NS;
        const th = lerp(-0.4, th0, smooth(0, 0.2, s)) + (bend * Math.min(s, SPLIT)) / SPLIT + hook * smooth(SPLIT - 0.08, 1, s);
        const ty = Math.sin(th);
        const tz = -Math.cos(th);
        const ny = Math.cos(th);
        const nz = Math.sin(th);
        const m = smooth(SPLIT - 0.06, SPLIT + 0.25, s);
        const ring = 0.018 * Math.pow(Math.max(0, Math.sin(s * Math.PI * 8)), 2) * (1 - m) * smooth(0.04, 0.12, s);
        const r = lerp(0.13, 0.065, Math.pow(Math.min(1, s / SPLIT), 0.75)) + ring;
        const end = smooth(0.9, 1, s);
        const w = lerp(r, 0.23, m) * (1 - 0.15 * end);
        const h = lerp(r, 0.08, m) * (1 - 0.35 * end);
        const under = lerp(-1, 0.45, m);
        for (let j = 0; j <= NC; j++) {
          const a = (j / NC) * TAU;
          const sa = Math.sin(a);
          const yy = sa >= 0 ? h * sa : under * h * -sa;
          const k = (i * (NC + 1) + j) * 3;
          tPos[k] = w * Math.cos(a);
          tPos[k + 1] = py + yy * ny;
          tPos[k + 2] = pz + yy * nz;
        }
        if (i === NS) {
          const mid = h * (1 + under) * 0.25;
          tipFrame.position.set(0, py + mid * ny, pz + mid * nz);
          tipFrame.rotation.set(th, 0, 0);
          const c = capI * 3;
          tPos[c] = 0;
          tPos[c + 1] = py + mid * ny;
          tPos[c + 2] = pz + mid * nz;
        }
        if (i < NS) {
          py += ty * ds;
          pz += tz * ds;
        }
      }
      tailGeo.attributes.position.needsUpdate = true;
      tailGeo.computeVertexNormals();
    };

    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x86603c, roughness: 1 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.9 });
    const debris = [];
    for (let k = 0; k < 16; k++) {
      const m = mesh(new THREE.DodecahedronGeometry(0.035 + (k % 4) * 0.015), k % 3 ? dirtMat : rockMat, false);
      m.visible = false;
      big.add(m);
      debris.push({ m, k, a: (k / 16) * 2 - 1, sp: 0.7 + (k % 5) * 0.15 });
    }
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xd6c4a2, transparent: true, opacity: 0.4, depthWrite: false });
    const dust = [];
    for (let k = 0; k < 12; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), dustMat);
      m.visible = false;
      big.add(m);
      dust.push({ m, a: (k / 12) * TAU });
    }
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff0b8, transparent: true, opacity: 0.95, depthWrite: false });
    const sparks = [];
    for (let k = 0; k < 12; k++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), sparkMat);
      m.visible = false;
      big.add(m);
      sparks.push({ m, k });
    }

    const food = berry();
    food.visible = false;
    big.add(food);
    const tmpV = new THREE.Vector3();
    const qA = new THREE.Quaternion();
    const qB = new THREE.Quaternion();
    const XA = V3(1, 0, 0);
    const YA = V3(0, 1, 0);
    const mix = (a, b, k) => {
      const o = {};
      Object.keys(a).concat(Object.keys(b)).forEach(n => (o[n] = lerp(a[n] || 0, b[n] || 0, k)));
      return o;
    };

    const HOLE = V3(0, Math.cos(AC), Math.sin(AC));
    const HEAD_OUT = V3(0, -0.04, 0.66);
    const HEAD_IN = HOLE.clone().multiplyScalar(R - 0.33);
    const PLUG = Math.atan2(HOLE.z, HOLE.y) + 0.22;

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;

        const breath = Math.sin(t * 1.6) * motion;
        let curl = 0;
        let drop = 0.015 + breath * 0.006;
        let tilt = 0;
        let headPitch = 0.08;
        let headYaw = 0;
        let earK = 0;
        let impact = 0;
        let shut = 0;
        let rollA = 0;
        let yawA = 0;
        let dx = 0;
        let dz = 0;
        let hop = 0;
        let digK = 0;
        let sparkK = 0;
        let fxZ = 0;
        let sqY = 1;
        let baseA = -0.7 + Math.sin(t * 0.9) * 0.03 * motion;
        let bendA = 0.42 + Math.sin(t * 1.2 + 1) * 0.04 * motion;
        let hookA = -1.45 + Math.sin(t * 1.5 + 2) * 0.06 * motion;
        let tailYaw = Math.sin(t * 0.8) * 0.15 * motion;
        const rest = { x: -1.0 + breath * 0.04, z: -0.15 };
        let pawL = Object.assign({}, rest);
        let pawR = Object.assign({}, rest);

        if (nm === "jump") {
          const crouch = smooth(0, 0.18, p) * (1 - smooth(0.18, 0.3, p));
          const air = Math.sin(Math.PI * smooth(0.25, 0.75, p));
          const land = smooth(0.72, 0.8, p) * (1 - smooth(0.82, 1, p));
          drop += 0.08 * crouch + 0.08 * land;
          sqY = 1 - 0.06 * (crouch + land) + 0.04 * air;
          hop = 0.55 * air;
          pawL = mix(rest, { x: -1.4, z: 0.6 }, air);
          pawR = mix(rest, { x: -1.4, z: 0.6 }, air);
          earK = air;
          headPitch = -0.15 * air;
          if (p > 0.74 && p < 0.95) impact = Math.sin(((p - 0.74) / 0.21) * Math.PI) * 0.6;
        } else if (nm === "curl" || nm === "spin") {
          curl = smooth(0.06, 0.28, p) * (1 - smooth(0.76, 0.96, p));
          if (nm === "curl") {
            const wob = smooth(0.3, 0.4, p) * (1 - smooth(0.66, 0.76, p));
            rollA = Math.sin(t * 5) * 0.12 * wob;
          } else {
            const sp = smooth(0.25, 0.4, p) * (1 - smooth(0.7, 0.8, p));
            yawA = -(Math.cos(Math.PI * smooth(0.25, 0.8, p)) - 1) * 0.5 * TAU * 3;
            sparkK = sp;
            if (sp > 0.3) impact = 0.3 + Math.abs(Math.sin(t * 11)) * 0.2;
          }
        } else if (nm === "roll") {
          curl = smooth(0.0, 0.15, p) * (1 - smooth(0.85, 1, p));
          const go = Math.sin(Math.PI * smooth(0.15, 0.85, p));
          dz = 1.5 * go;
          rollA = dz / R;
          if (p > 0.4 && p < 0.58) impact = Math.sin(((p - 0.4) / 0.18) * Math.PI) * 0.7;
          fxZ = dz;
        } else if (nm === "drift") {
          curl = smooth(0.0, 0.12, p) * (1 - smooth(0.88, 1, p));
          const q = smooth(0.12, 0.88, p);
          const ang = q * TAU;
          dx = Math.sin(ang) * 0.9;
          dz = (1 - Math.cos(ang)) * 0.55;
          yawA = -ang;
          rollA = q * 14;
          sparkK = Math.sin(Math.PI * q);
          if (sparkK > 0.3) impact = 0.35 + Math.abs(Math.sin(t * 9)) * 0.2;
          fxZ = dz;
        } else if (nm === "dig") {
          const k = smooth(0.05, 0.2, p) * (1 - smooth(0.82, 0.96, p));
          tilt = 0.32 * k;
          drop += 0.06 * k;
          digK = k;
          const a1 = Math.sin(t * 13);
          pawL = mix(rest, { x: -0.55 + a1 * 0.45, z: 0.05 }, k);
          pawR = mix(rest, { x: -0.55 - a1 * 0.45, z: 0.05 }, k);
          headPitch = 0.1 * k;
          shut = k * 0.4;
          if (k > 0.5) impact = 0.25 + Math.abs(a1) * 0.2;
        } else if (nm === "sniff") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.85, 1, p));
          headYaw = Math.sin(p * Math.PI * 4) * 0.45 * k;
          headPitch = -0.2 * k + Math.sin(t * 20) * 0.02 * k;
          tilt = -0.06 * k;
          earK = k * Math.abs(Math.sin(p * Math.PI * 6));
          tailYaw += Math.sin(p * Math.PI * 3) * 0.25 * k;
        } else if (nm === "eat") {
          const k = smooth(0.0, 0.25, p) * (1 - smooth(0.88, 1, p));
          const hold = { x: -1.6, z: -0.3 };
          pawL = mix(rest, hold, k);
          pawR = mix(rest, hold, k);
          headPitch = 0.2 * smooth(0.25, 0.35, p) * (1 - smooth(0.85, 0.95, p));
          shut = p > 0.35 && p < 0.85 ? 0.45 : 0;
        }

        drop = lerp(drop, CY - R, curl);
        tilt = lerp(tilt, 0, curl);

        root.rotation.y = lookYaw;
        const C = V3(0, CY, 0);
        qA.setFromAxisAngle(YA, yawA);
        qB.setFromAxisAngle(XA, rollA);
        qA.multiply(qB);
        bodyG.quaternion.copy(qA);
        tmpV.copy(C).applyQuaternion(qA);
        bodyG.position.set(dx + C.x - tmpV.x, hop - drop + C.y - tmpV.y, dz + C.z - tmpV.z);
        ball.rotation.set(tilt + lookPitch * 0.15 * (1 - curl), 0, 0);
        const bs = 1 + breath * 0.008 * (1 - curl);
        ball.scale.set(bs / Math.sqrt(sqY), bs * sqY, bs / Math.sqrt(sqY));

        const tuck = curl;
        legs.forEach(({ hip, knee, ankle, base }) => {
          const H = Math.max(0.12, HIPY - drop - FH);
          const a = Math.acos(Math.min(1, H / (L1 + L2)));
          const k2 = 1 - tuck;
          hip.position.set(base.x * lerp(1, 0.7, tuck), lerp(HIPY, HIPY + 0.32, tuck), base.z);
          hip.scale.setScalar(lerp(1, 0.4, tuck));
          hip.rotation.set(-a * k2, 0, 0);
          knee.rotation.set(2 * a * k2, 0, 0);
          ankle.rotation.set(-a * k2, 0, 0);
        });

        paws.forEach(pw => {
          const ps = pw.sx > 0 ? pawR : pawL;
          pw.pg.rotation.set(ps.x, 0, ps.z * pw.sx);
          pw.pg.position.copy(pw.base).multiplyScalar(lerp(1, 0.55, tuck));
          pw.pg.scale.setScalar(lerp(1, 0.4, tuck));
        });

        headPivot.position.lerpVectors(HEAD_OUT, HEAD_IN, smooth(0, 0.7, tuck));
        headPivot.scale.setScalar(lerp(1, 1.12, smooth(0.3, 1, tuck)));
        head.rotation.set(lerp(headPitch - tilt * 0.8, PLUG, smooth(0.15, 1, tuck)), headYaw * (1 - tuck), 0);
        mouth.scale.set(1, nm === "eat" && ph && ph.chew ? 0.4 + ph.chew * 0.8 : 1, 1);

        tailPivot.rotation.set(0, tailYaw * (1 - tuck), 0);
        tailPivot.scale.setScalar(lerp(1, 0.25, tuck));
        tailPivot.position.set(0, lerp(-0.5, -0.3, tuck), lerp(-0.5, -0.3, tuck));
        tailShape(baseA - tilt, bendA, hookA);

        ears.forEach((e, i) => {
          const s2 = i ? 1 : -1;
          e.rotation.z = -0.55 * s2 + Math.sin(t * 9 + i) * 0.16 * earK;
          e.scale.setScalar(lerp(1, 0.25, smooth(0, 0.6, tuck)));
        });
        const close = Math.max(shut, 1 - blink, tuck > 0.3 ? 1 : 0);
        lids.forEach(l => {
          l.rotation.x = lerp(-1.77, Math.PI / 2, close);
        });
        followPupils(eyes, pointer, 0.6);

        const fx = impact > 0.05;
        dust.forEach(d => {
          d.m.visible = fx;
          if (!fx) return;
          const u = 1 - impact;
          const r = 0.6 + u * 0.5;
          const cz = nm === "dig" ? 0.85 : fxZ;
          d.m.position.set(dx + Math.cos(d.a) * r, 0.08 + u * 0.15, cz + Math.sin(d.a) * r * 0.7);
          d.m.scale.setScalar(0.35 + u * 0.7);
          dustMat.opacity = 0.3 * impact;
        });
        debris.forEach(d => {
          const vis = digK > 0.4;
          d.m.visible = vis;
          if (!vis) return;
          const q = (t * d.sp * 1.4 + d.k * 0.31) % 1;
          d.m.position.set(d.a * 0.45, 0.06 + Math.sin(q * Math.PI) * 0.7, 0.9 + q * 0.4 - q * q * 0.2);
          d.m.rotation.set(t * 4 + d.k, t * 3, 0);
        });
        sparks.forEach(sp => {
          sp.m.visible = sparkK > 0.3;
          if (!sp.m.visible) return;
          const q = (t * 3 + sp.k * 0.17) % 1;
          const a = sp.k * 2.1 + t * 2;
          sp.m.position.set(dx + Math.cos(a) * (0.6 + q * 0.4), 0.05 + q * 0.45, dz + Math.sin(a) * (0.6 + q * 0.4));
          sp.m.scale.setScalar(1 - q);
        });

        if (nm === "eat" && ph) {
          food.visible = ph.visible;
          root.updateMatrixWorld(true);
          paws[1].palm.getWorldPosition(tmpV);
          const v2 = new THREE.Vector3();
          paws[0].palm.getWorldPosition(v2);
          tmpV.add(v2).multiplyScalar(0.5);
          big.worldToLocal(tmpV);
          tmpV.z += 0.18;
          tmpV.y += 0.04;
          food.position.set(tmpV.x, lerp(3.0, tmpV.y, ph.fall * ph.fall), tmpV.z);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.8);
        } else food.visible = false;
      }
    };
  }
});
