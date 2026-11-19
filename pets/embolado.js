Pets.register({
  id: "embolado",
  dex: 37,
  name: "Embolado",
  color: "#2b2d33",
  types: ["electric"],
  evolveBranches: { happy: "fiacarca", sad: "emaranhidra" },
  evolveKos: 30,
  evolveLevel: 32,
  description: "Uma bola de fios embaraçados que rola pela cidade juntando cabos soltos pelo caminho. Várias pontas desencapadas ficam para fora soltando faísca, e ninguém sabe ao certo quantas cabeças ele tem, nem ele mesmo.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 3.0 },
    choque: { duration: 2.3 },
    roll: { duration: 1.7 },
    count: { duration: 3.0 },
    wobble: { duration: 1.6 },
    attack: { duration: 1.1 }
  },
  battle: { special: { action: "choque", hit: 0.5, speed: 1.2 } },
  idle: [
    { action: "count", min: 20, max: 45 },
    { action: "wobble", min: 30, max: 60 },
    { action: "roll", min: 45, max: 90 }
  ],
  clickAction: n => ["count", "jump", "choque", "roll"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;
    const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    const TAU = Math.PI * 2;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const hasDoc = typeof document !== "undefined";
    let seed = 23;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    const rubber = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.45 });
    const metal = (c, r = 0.3) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    const copperMat = metal(0xd07a3c, 0.28);
    const nickelMat = metal(0xd9dbe0, 0.22);
    const goldMat = metal(0xe6b545, 0.25);
    const clearMat = new THREE.MeshPhysicalMaterial({ color: 0xe9f1ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.45, depthWrite: false });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.7 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x5a1c24, roughness: 0.6 });
    const C = {
      black: 0x1d1f25,
      gray: 0x4b5058,
      orange: 0xf07a1a,
      blue: 0x2f6fd6,
      beige: 0xe3d7bd,
      white: 0xf1f1ec,
      red: 0xc8323a,
      yellow: 0xf2c230
    };

    const computeFrames = (S, T, N, B, n) => {
      for (let i = 0; i <= n; i++) {
        T[i].subVectors(S[Math.min(n, i + 1)], S[Math.max(0, i - 1)]);
        if (T[i].lengthSq() < 1e-10) T[i].set(0, 1, 0);
        T[i].normalize();
      }
      const up = Math.abs(T[0].y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0);
      N[0].crossVectors(T[0], up).normalize();
      B[0].crossVectors(T[0], N[0]).normalize();
      for (let i = 1; i <= n; i++) {
        B[i].crossVectors(T[i], N[i - 1]);
        if (B[i].lengthSq() < 1e-10) B[i].copy(B[i - 1]);
        B[i].normalize();
        N[i].crossVectors(B[i], T[i]).normalize();
      }
    };

    const flexTube = (nSeg, nRad, material, shadow = true) => {
      const vc = (nSeg + 1) * (nRad + 1);
      const pos = new Float32Array(vc * 3);
      const nor = new Float32Array(vc * 3);
      const uv = new Float32Array(vc * 2);
      const idx = [];
      for (let i = 0; i < nSeg; i++)
        for (let j = 0; j < nRad; j++) {
          const a = i * (nRad + 1) + j;
          const b = a + nRad + 1;
          idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      for (let i = 0; i <= nSeg; i++)
        for (let j = 0; j <= nRad; j++) {
          const k = (i * (nRad + 1) + j) * 2;
          uv[k] = i / nSeg;
          uv[k + 1] = j / nRad;
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx);
      const m = mesh(g, material, shadow);
      m.frustumCulled = false;
      const S = [];
      const T = [];
      const N = [];
      const B = [];
      for (let i = 0; i <= nSeg; i++) {
        S.push(V3());
        T.push(V3());
        N.push(V3());
        B.push(V3());
      }
      const curve = new THREE.CatmullRomCurve3([V3(), V3(0, 1, 0)], false, "centripetal");
      const build = rFn => {
        computeFrames(S, T, N, B, nSeg);
        let k = 0;
        for (let i = 0; i <= nSeg; i++) {
          const r = rFn(i / nSeg);
          for (let j = 0; j <= nRad; j++) {
            const a = (j / nRad) * TAU;
            const c = Math.cos(a);
            const s = Math.sin(a);
            const nx = N[i].x * c + B[i].x * s;
            const ny = N[i].y * c + B[i].y * s;
            const nz = N[i].z * c + B[i].z * s;
            pos[k] = S[i].x + nx * r;
            pos[k + 1] = S[i].y + ny * r;
            pos[k + 2] = S[i].z + nz * r;
            nor[k] = nx;
            nor[k + 1] = ny;
            nor[k + 2] = nz;
            k += 3;
          }
        }
        g.attributes.position.needsUpdate = true;
        g.attributes.normal.needsUpdate = true;
      };
      return {
        m,
        S,
        T,
        N,
        B,
        n: nSeg,
        fromPoints(pts, rFn) {
          curve.points = pts;
          for (let i = 0; i <= nSeg; i++) curve.getPoint(i / nSeg, S[i]);
          build(rFn);
        },
        fromSamples(rFn) {
          build(rFn);
        }
      };
    };

    const staticTube = (pts, r, material, closed = false, segs = 64, rad = 10, shadow = true) =>
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed, "centripetal"), segs, r, rad, closed), material, shadow);

    const root = new THREE.Group();
    const bounce = new THREE.Group();
    root.add(bounce);
    const ball = new THREE.Group();
    bounce.add(ball);

    const KC = V3(0, 0.78, 0);
    const KR = 0.6;
    const FACE = V3(0, 0.12, 1).normalize();
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x17181d, roughness: 0.8, emissive: 0x58c8ff, emissiveIntensity: 0.03 });
    const core = mesh(new THREE.SphereGeometry(KR * 0.95, 36, 26), coreMat);
    core.position.copy(KC);
    ball.add(core);
    const ballLight = new THREE.PointLight(0x8fdcff, 0, 2.4);
    ballLight.position.copy(KC).add(V3(0, 0, 0.4));
    ball.add(ballLight);

    const loopMats = {};
    const matOf = c => loopMats[c] || (loopMats[c] = rubber(c));
    const loopCols = [C.black, C.gray, C.black, C.orange, C.black, C.blue, C.gray, C.black, C.red, C.black, C.beige, C.gray, C.black];
    let made = 0;
    let tries = 0;
    while (made < loopCols.length && tries < 400) {
      tries += 1;
      const n = V3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
      if (n.lengthSq() < 0.05) continue;
      n.normalize();
      const fd = Math.abs(n.dot(FACE));
      const frame = made === 0 || made === 1;
      if (frame ? fd < 0.64 || fd > 0.7 : fd < 0.76) continue;
      const a = V3().crossVectors(n, Math.abs(n.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0)).normalize();
      const b = V3().crossVectors(n, a).normalize();
      const ph = rnd() * TAU;
      const amp = 0.02 + rnd() * 0.03;
      const lay = 1.0 + (made % 3) * 0.05;
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const q = (i / 16) * TAU;
        const d = a.clone().multiplyScalar(Math.cos(q)).addScaledVector(b, Math.sin(q));
        d.addScaledVector(n, Math.sin(q * 2 + ph) * amp * 1.5);
        const w = KR * (lay + Math.sin(q * 3 + ph) * amp);
        pts.push(KC.clone().addScaledVector(d, w));
      }
      const col = loopCols[made];
      ball.add(staticTube(pts, col === C.black ? 0.075 : 0.062, matOf(col), true, 72, 10));
      made += 1;
    }

    [
      [V3(0.2, 0.3, -1), 0.75, C.black],
      [V3(-0.45, -0.25, -1), 0.7, C.gray],
      [V3(0.5, -0.35, -0.9), 0.62, C.black],
      [V3(-0.15, 0.7, -0.7), 0.6, C.red],
      [V3(0.05, -0.1, -1), 0.45, C.black]
    ].forEach(([c, ang, col], k) => {
      c.normalize();
      const a = V3().crossVectors(c, V3(0, 1, 0)).normalize();
      const b = V3().crossVectors(c, a).normalize();
      const pts = [];
      const lay = KR * (1.02 + (k % 2) * 0.05);
      for (let i = 0; i < 14; i++) {
        const q = (i / 14) * TAU;
        const d = c.clone().multiplyScalar(Math.cos(ang)).addScaledVector(a, Math.sin(ang) * Math.cos(q)).addScaledVector(b, Math.sin(ang) * Math.sin(q)).normalize();
        pts.push(KC.clone().addScaledVector(d, lay * (1 + Math.sin(q * 3 + k) * 0.02)));
      }
      ball.add(staticTube(pts, col === C.black ? 0.075 : 0.065, matOf(col), true, 60, 10));
    });

    const faceG = new THREE.Group();
    faceG.position.copy(KC);
    faceG.quaternion.setFromUnitVectors(V3(0, 0, 1), FACE);
    ball.add(faceG);
    const eyes = [-1, 1].map(sd => {
      const e = eye({ size: 0.62, pupilColor: 0x1c1d26 });
      e.g.position.set(sd * 0.15, 0.07, KR * 0.93);
      e.g.rotation.set(-0.05, sd * 0.24, 0);
      faceG.add(e.g);
      return e;
    });
    const mouthPts = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const x = lerp(-0.075, 0.075, u);
      mouthPts.push(V3(x, -0.12 - Math.sin(u * Math.PI) * 0.03 + (u > 0.6 ? Math.sin((u - 0.6) * 8) * 0.008 : 0), KR * 0.955 - Math.abs(x) * 0.25));
    }
    const mouth = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPts), 24, 0.012, 6, false), darkMat, false);
    faceG.add(mouth);
    const mouthOpen = mesh(new THREE.SphereGeometry(1, 18, 12), mouthMat, false);
    mouthOpen.scale.set(0.075, 0.05, 0.03);
    mouthOpen.position.set(0, -0.13, KR * 0.94);
    mouthOpen.visible = false;
    faceG.add(mouthOpen);
    const fang = mesh(new THREE.ConeGeometry(0.014, 0.035, 8), new THREE.MeshStandardMaterial({ color: 0xfbfbf6, roughness: 0.35 }), false);
    fang.position.set(0.035, -0.135, KR * 0.965);
    fang.rotation.x = Math.PI;
    faceG.add(fang);
    const bang = staticTube(
      [V3(-0.42, 0.42, 0.25), V3(-0.18, 0.3, 0.55), V3(0.08, 0.27, 0.62), V3(0.3, 0.33, 0.52), V3(0.5, 0.22, 0.2)].map(p => p.add(KC)),
      0.06,
      matOf(C.blue),
      false,
      40,
      10
    );
    ball.add(bang);

    const strandGeo = new THREE.CylinderGeometry(0.007, 0.011, 1, 5);
    strandGeo.translate(0, 0.5, 0);
    const fray = (parent, n = 7, len = 0.08) => {
      const g = new THREE.Group();
      const c = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.04, 10), copperMat, false);
      c.position.y = 0.02;
      g.add(c);
      for (let i = 0; i < n; i++) {
        const s = mesh(strandGeo, copperMat, false);
        const a = (i / n) * TAU + rnd() * 0.4;
        s.position.set(Math.cos(a) * 0.013, 0.035, Math.sin(a) * 0.013);
        s.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
        s.scale.y = len * (0.7 + rnd() * 0.5);
        g.add(s);
      }
      parent.add(g);
      return g;
    };
    const tipOf = kind => {
      const g = new THREE.Group();
      if (kind === "plug") {
        const b = mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.1, 6), rubber(C.black), false);
        b.position.y = 0.05;
        g.add(b);
        [-0.025, 0.025].forEach(x => {
          const p = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.07, 10), nickelMat, false);
          p.position.set(x, 0.13, 0);
          g.add(p);
        });
      } else if (kind === "rj") {
        const b = mesh(new THREE.BoxGeometry(0.09, 0.11, 0.06), clearMat, false);
        b.position.y = 0.07;
        b.renderOrder = 2;
        g.add(b);
        [0xf07a1a, 0x3f9b4c, 0x2f6fd6, 0x7a4a2a].forEach((c, i) => {
          const w = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 5), rubber(c), false);
          w.position.set((i / 3 - 0.5) * 0.06, 0.06, 0);
          g.add(w);
          const p = mesh(new THREE.BoxGeometry(0.008, 0.02, 0.012), goldMat, false);
          p.position.set((i / 3 - 0.5) * 0.06, 0.115, 0.022);
          g.add(p);
        });
        const clip = mesh(new THREE.BoxGeometry(0.04, 0.08, 0.008), clearMat, false);
        clip.position.set(0, 0.06, -0.04);
        clip.rotation.x = 0.3;
        g.add(clip);
      } else if (kind === "sock") {
        const b = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 22), rubber(0xff9a3d), false);
        b.position.y = 0.035;
        g.add(b);
        const f = mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.008, 22), rubber(0xf3eadb), false);
        f.position.y = 0.072;
        g.add(f);
        [
          [-0.022, -0.008],
          [0.022, -0.008],
          [0, 0.024]
        ].forEach(([x, z]) => {
          const h = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 10), darkMat, false);
          h.position.set(x, 0.077, z);
          g.add(h);
        });
      } else if (kind === "coax") {
        const n = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.045, 6), nickelMat, false);
        n.position.y = 0.025;
        g.add(n);
        const br = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 16), nickelMat, false);
        br.position.y = 0.075;
        g.add(br);
        const p = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 8), copperMat, false);
        p.position.y = 0.14;
        g.add(p);
      } else fray(g, 8, 0.09);
      return g;
    };

    const ENDS = [
      { kind: "plug", dir: V3(0.15, 1, 0.1), col: C.black, len: 0.62, r: 0.055, ph: 0 },
      { kind: "rj", dir: V3(-0.75, 0.75, 0.15), col: C.blue, len: 0.55, r: 0.045, ph: 1.3 },
      { kind: "sock", dir: V3(0.85, 0.55, 0.05), col: C.orange, len: 0.55, r: 0.05, ph: 2.1 },
      { kind: "coax", dir: V3(-0.9, 0.0, 0.3), col: C.white, len: 0.45, r: 0.05, ph: 3.4 },
      { kind: "fray", dir: V3(0.85, -0.1, 0.45), col: C.red, len: 0.38, r: 0.045, ph: 4.2 },
      { kind: "fray", dir: V3(-0.25, 0.65, -0.75), col: C.yellow, len: 0.42, r: 0.042, ph: 5.1 },
      { kind: "fray", dir: V3(0.55, 0.45, -0.7), col: C.gray, len: 0.36, r: 0.045, ph: 0.7 }
    ].map(e => {
      e.dir.normalize();
      e.base = KC.clone().addScaledVector(e.dir, KR * 0.98);
      e.tube = flexTube(30, 8, matOf(e.col));
      ball.add(e.tube.m);
      e.tip = tipOf(e.kind);
      ball.add(e.tip);
      e.pts = [V3(), V3(), V3(), V3(), V3()];
      e.side = V3().crossVectors(e.dir, Math.abs(e.dir.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0)).normalize();
      e.up = V3().crossVectors(e.side, e.dir).normalize();
      return e;
    });

    const tail = new THREE.Group();
    tail.position.copy(KC).add(V3(0, -0.25, -KR * 0.85));
    ball.add(tail);
    {
      const spinePts = [V3(0, 0, 0), V3(0, -0.12, -0.22), V3(0.08, -0.38, -0.38), V3(0.22, -0.5, -0.42)];
      const sp = new THREE.CatmullRomCurve3(spinePts, false, "centripetal");
      const n = 60;
      const S = [];
      const T = [];
      const N = [];
      const B = [];
      for (let i = 0; i <= n; i++) {
        S.push(sp.getPoint(i / n));
        T.push(V3());
        N.push(V3());
        B.push(V3());
      }
      computeFrames(S, T, N, B, n);
      [copperMat, matOf(C.black), matOf(C.blue)].forEach((m, k) => {
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const a = (k / 3) * TAU + (i / n) * TAU * 3;
          const rr = 0.045 * (1 - (i / n) * 0.3);
          pts.push(S[i].clone().addScaledVector(N[i], Math.cos(a) * rr).addScaledVector(B[i], Math.sin(a) * rr));
        }
        tail.add(staticTube(pts, 0.04 * (1 - k * 0.03), m, false, 60, 8));
      });
      const coil = new THREE.Group();
      coil.position.copy(S[n]);
      coil.quaternion.setFromUnitVectors(V3(0, 1, 0), T[n]);
      tail.add(coil);
      const cp = [];
      for (let i = 0; i <= 80; i++) {
        const u = i / 80;
        const a = u * 8 * TAU;
        cp.push(V3(Math.cos(a) * 0.045, u * 0.15, Math.sin(a) * 0.045));
      }
      coil.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp), 160, 0.011, 5, false), copperMat, false));
      const cap = mesh(new THREE.SphereGeometry(0.035, 12, 8), nickelMat, false);
      cap.position.y = 0.16;
      coil.add(cap);
    }

    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb98a55, roughness: 0.75 });
    const feet = [-1, 1].map(sd => {
      const f = new THREE.Group();
      f.position.set(sd * 0.32, 0.16, 0.18);
      f.scale.setScalar(1.3);
      bounce.add(f);
      const spool = new THREE.Group();
      spool.rotation.z = Math.PI / 2;
      f.add(spool);
      const drum = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 24), matOf(sd < 0 ? C.orange : C.black));
      spool.add(drum);
      [-0.1, 0.1].forEach(y => {
        const fl = mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.025, 28), woodMat);
        fl.position.y = y;
        spool.add(fl);
      });
      for (let i = 0; i < 5; i++) {
        const w = mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 24), matOf(sd < 0 ? C.orange : C.black), false);
        w.rotation.x = Math.PI / 2;
        w.position.y = -0.07 + i * 0.035;
        spool.add(w);
      }
      const hub = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.27, 12), woodMat, false);
      spool.add(hub);
      return f;
    });

    let sparkTex = null;
    if (hasDoc) {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const x = c.getContext("2d");
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 30);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.25, "rgba(190,235,255,0.9)");
      gr.addColorStop(1, "rgba(80,170,255,0)");
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      x.strokeStyle = "rgba(255,255,255,0.95)";
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(32, 2);
      x.lineTo(32, 62);
      x.moveTo(2, 32);
      x.lineTo(62, 32);
      x.stroke();
      sparkTex = new THREE.CanvasTexture(c);
    }
    const sparks = [];
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: 0xcfefff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      s.visible = false;
      ball.add(s);
      sparks.push({ s, life: 0, max: 1, v: V3(), size: 0.1 });
    }
    let sparkI = 0;
    const spark = (p, v, size = 0.1, life = 0.25) => {
      const sp = sparks[sparkI++ % sparks.length];
      sp.s.position.copy(p);
      sp.v.copy(v);
      sp.life = life;
      sp.max = life;
      sp.size = size;
      sp.s.visible = true;
    };

    const food = berry();
    food.visible = false;
    bounce.add(food);
    const muzzle = new THREE.Group();
    muzzle.position.copy(KC).add(V3(0, -0.1, KR + 0.05));
    ball.add(muzzle);
    let lastT = null;
    const UP = V3(0, 1, 0);
    const AX = V3(1, 0, 0);
    const tmpK = V3();

    return {
      root,
      muzzle,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const dt = lastT === null ? 1 / 60 : Math.max(0, Math.min(0.05, t - lastT));
        lastT = t;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const joy = typeof s.joy === "number" ? s.joy : 100;
        const dying = !!s.dying;
        const is = n => (action && action.name === n ? action : null);
        const jump = is("jump");
        const eat = is("eat");
        const choque = is("choque");
        const roll = is("roll");
        const count = is("count");
        const wob = is("wobble");
        const atk = is("attack") ? strike(action.p) : null;
        const vigor = dying ? 0.3 : 0.6 + 0.4 * clamp01(hunger / 100);
        const glad = joy >= 90 && !dying && !action ? 1 : 0;

        let y = 0;
        let z = 0;
        let sy = 1 + Math.sin(t * 2) * 0.015 * motion;
        let tiltX = 0;
        let tiltZ = Math.sin(t * 1.1) * 0.03 * motion;
        let spin = 0;
        let stiff = 0;
        let droop = dying ? 1 : 0;
        let glow = 0.03 * vigor;
        let squint = dying ? 0.5 : 0;
        let mouthO = false;
        let look = null;
        let whip = 0;
        let crackle = 0.4 * vigor;
        let footLift = [0, 0];
        const endBoost = ENDS.map(() => 0);

        if (jump) {
          const p = jump.p;
          if (p < 0.22) sy = 1 - 0.18 * Math.sin((p / 0.22) * Math.PI * 0.5);
          else if (p < 0.8) {
            const q = (p - 0.22) / 0.58;
            y = Math.sin(q * Math.PI) * 0.55;
            sy = 1 + 0.12 * Math.cos(q * Math.PI);
            mouthO = q > 0.2 && q < 0.7;
            stiff = Math.sin(q * Math.PI) * 0.4;
          } else sy = 1 - 0.14 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
        }
        if (wob) {
          const p = wob.p;
          const damp = Math.pow(1 - p, 1.4);
          tiltZ += Math.sin(p * Math.PI * 6) * 0.2 * damp;
          footLift = [Math.max(0, Math.sin(p * Math.PI * 6)) * 0.08 * damp, Math.max(0, -Math.sin(p * Math.PI * 6)) * 0.08 * damp];
          squint = p > 0.1 && p < 0.8 ? 0.6 : squint;
        }
        if (roll) {
          const p = roll.p;
          const k = smooth(0.05, 0.85, p);
          spin = k * TAU;
          z = Math.sin(Math.PI * p) * 0.35;
          y = Math.abs(Math.sin(p * Math.PI * 2)) * 0.06;
          squint = p > 0.1 && p < 0.9 ? 0.75 : squint;
        }
        if (count) {
          const p = count.p;
          const seq = [0, 1, 3, 5, 2, 4];
          const step = Math.min(seq.length - 1, Math.floor(p * seq.length * 1.05));
          const i = seq[step];
          endBoost[i] = Math.sin(Math.PI * clamp01((p * seq.length * 1.05) % 1)) * 0.6;
          look = ENDS[i];
          tiltZ += Math.sin(p * Math.PI * 3) * 0.08;
          if (p > 0.88) {
            tiltZ += 0.18 * smooth(0.88, 0.95, p);
            squint = 0.3;
            look = null;
          }
        }
        if (choque) {
          const p = choque.p;
          const charge = smooth(0.05, 0.42, p) * (1 - smooth(0.46, 0.5, p));
          const flash = smooth(0.46, 0.52, p) * (1 - smooth(0.6, 0.85, p));
          stiff = Math.max(charge, flash);
          glow = Math.max(glow, charge * 0.6 + flash * 2.6);
          crackle = 0.6 + charge * 4 + flash * 10;
          sy += -charge * 0.08 + flash * 0.1;
          tiltZ += Math.sin(p * 120) * 0.03 * charge;
          squint = charge > 0.3 ? 0.75 : squint;
          mouthO = flash > 0.3;
        }
        if (eat) {
          const p = eat.p;
          const ph = eatPhase(p);
          mouthO = p > 0.15 && p < 0.32;
          sy += -ph.chew * 0.05 * motion;
          squint = p > 0.35 && p < 0.85 ? 0.55 : squint;
          const fall = clamp01(ph.fall);
          food.visible = ph.visible && p < 0.32;
          const mp = muzzle.getWorldPosition(V3());
          bounce.worldToLocal(mp);
          food.position.set(mp.x, lerp(mp.y + 2.2, mp.y, fall * fall), mp.z + 0.05);
          food.scale.setScalar(1 - smooth(0.28, 0.32, p) * 0.9);
          ENDS.forEach((e, i) => (endBoost[i] = ph.chew * 0.15));
        } else food.visible = false;
        if (atk) {
          tiltX += -atk.wind * 0.25 + atk.lunge * 0.3;
          z = atk.lunge * 0.55 - atk.wind * 0.1;
          y += Math.sin(Math.min(1, atk.lunge * 1.2) * Math.PI) * 0.1;
          whip = atk.lunge;
          squint = atk.lunge > 0.2 ? 0.7 : squint;
          mouthO = atk.lunge > 0.2;
        }
        if (glad) ENDS.forEach((e, i) => (endBoost[i] += Math.max(0, Math.sin(t * 3 + e.ph)) * 0.2 * motion));

        const sx = 1 / Math.sqrt(sy);
        bounce.scale.set(sx, sy, sx);
        root.position.set(0, y, z);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        bounce.rotation.set(tiltX, 0, tiltZ);
        ball.rotation.x = spin;
        ball.position.copy(KC).sub(tmpK.copy(KC).applyAxisAngle(AX, spin));

        ENDS.forEach((e, i) => {
          const len = e.len * (1 + endBoost[i] * 0.35 + stiff * 0.25);
          const w = (1 - stiff) * (1 - droop * 0.5);
          const ph = e.ph;
          const wave = k => Math.sin(t * 2.4 + ph + k * 1.6) * 0.12 * motion * w;
          const g = droop * 0.6 + (1 - stiff) * 0.08;
          e.pts[0].copy(KC).addScaledVector(e.dir, KR * 0.82);
          for (let k = 1; k < 5; k++) {
            const u = k / 4;
            const p = e.pts[k];
            p.copy(e.base).addScaledVector(e.dir, len * u);
            p.addScaledVector(e.side, wave(k) * u + (stiff ? Math.sin(t * 60 + k + i) * 0.02 * stiff : 0));
            p.addScaledVector(e.up, Math.cos(t * 1.9 + ph + k) * 0.08 * motion * w * u);
            p.y -= g * u * u * len;
            if (whip) p.z += whip * u * u * 0.4;
          }
          e.tube.fromPoints(e.pts, u => e.r * (1 - u * 0.15));
          const n = e.tube.n;
          e.tip.position.copy(e.tube.S[n]);
          e.tip.quaternion.setFromUnitVectors(UP, e.tube.T[n]);
          e.tip.scale.setScalar(1 + endBoost[i] * 0.3);
          if (rnd() < crackle * dt * (e.kind === "fray" ? 2.2 : 0.5)) {
            const tp = e.tip.position.clone().addScaledVector(e.tube.T[n], 0.1);
            spark(tp, V3((rnd() - 0.5) * 0.8, rnd() * 0.8, (rnd() - 0.5) * 0.8), 0.07 + rnd() * 0.07 + stiff * 0.06, 0.16 + rnd() * 0.12);
          }
        });
        if (choque && choque.p > 0.46 && choque.p < 0.56) for (let k = 0; k < 4; k++) spark(KC.clone().add(V3(0, 0, 0.3)), V3((rnd() - 0.5) * 5, (rnd() - 0.2) * 4, rnd() * 4), 0.14, 0.35);

        feet.forEach((f, i) => {
          f.position.y = 0.16 + footLift[i] + (jump && jump.p > 0.22 && jump.p < 0.8 ? -0.04 : 0);
          f.rotation.x = roll ? spin * 0.5 : Math.sin(t * 1.4 + i) * 0.03 * motion;
        });

        coreMat.emissiveIntensity = glow;
        ballLight.intensity = Math.min(1.2, glow * 0.5);
        mouth.visible = !mouthO;
        mouthOpen.visible = mouthO;
        if (eat) mouthOpen.scale.y = 0.05;

        const lid = squint ? 1 - squint : blink;
        eyes.forEach(({ g }) => (g.scale.y = Math.max(0.08, lid)));
        if (look) {
          const tp = faceG.worldToLocal(look.tip.getWorldPosition(V3()));
          const px = Math.max(-1, Math.min(1, tp.x * 2.2));
          const py = Math.max(-1, Math.min(1, (tp.y - 0.05) * 2.2));
          followPupils(eyes, { x: px, y: py }, 1);
        } else followPupils(eyes, pointer, 0.8);

        sparks.forEach(sk => {
          if (sk.life <= 0) {
            sk.s.visible = false;
            return;
          }
          sk.life -= dt;
          sk.s.position.addScaledVector(sk.v, dt);
          sk.v.y -= dt * 2;
          const k = clamp01(sk.life / sk.max);
          sk.s.material.opacity = k;
          sk.s.scale.setScalar(sk.size * (0.6 + k * 0.6));
        });
      }
    };
  }
});
