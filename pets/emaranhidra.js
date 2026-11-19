Pets.register({
  id: "emaranhidra",
  dex: 38,
  name: "Emaranhidra",
  color: "#f07a1a",
  types: ["electric", "dragon"],
  description: "Nasceu de um emaranhado de fios esquecido no alto do poste que resolveu ter vontade própria. Cada cabeça é um cabo diferente e nenhuma concorda com a outra, mas quando todas se encostam pelas pontas desencapadas o curto-circuito ilumina o quarteirão inteiro.",
  actions: {
    jump: { duration: 1.1 },
    eat: { duration: 3.6 },
    curto: { duration: 2.8 },
    tangle: { duration: 2.6 },
    curl: { duration: 2.0 },
    wobble: { duration: 1.8 },
    attack: { duration: 1.3 }
  },
  battle: { special: { action: "curto", hit: 0.5, speed: 1.2 } },
  idle: [
    { action: "tangle", min: 20, max: 45 },
    { action: "wobble", min: 35, max: 70 },
    { action: "curl", min: 50, max: 100 }
  ],
  clickAction: n => ["tangle", "jump", "curto", "curl"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, berry, strike } = kit;
    const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    const TAU = Math.PI * 2;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const hasDoc = typeof document !== "undefined";
    let seed = 7;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };

    const rubber = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.45 });
    const metal = (c, r = 0.3) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    const copperMat = metal(0xd07a3c, 0.3);
    const nickelMat = metal(0xd9dbe0, 0.22);
    const goldMat = metal(0xe6b545, 0.25);
    const clearMat = new THREE.MeshPhysicalMaterial({ color: 0xe9f1ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.42, depthWrite: false });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.7 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x5a1c24, roughness: 0.6 });
    const fangMat = new THREE.MeshStandardMaterial({ color: 0xfbfbf6, roughness: 0.35 });
    const tapeBlack = new THREE.MeshPhysicalMaterial({ color: 0x17181c, roughness: 0.35, clearcoat: 0.6 });
    const tapeWhite = new THREE.MeshPhysicalMaterial({ color: 0xf2f2ee, roughness: 0.35, clearcoat: 0.6 });
    const C = {
      black: 0x1d1f25,
      gray: 0x4b5058,
      orange: 0xf07a1a,
      blue: 0x2f6fd6,
      beige: 0xe3d7bd,
      white: 0xf1f1ec,
      red: 0xc8323a,
      green: 0x3f9b4c,
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
    const body = new THREE.Group();
    root.add(body);

    const KC = V3(0, 1.2, -0.05);
    const KR = V3(0.96, 0.84, 0.9);
    const onKnot = (d, k = 1) => {
      const n = d.clone().normalize();
      return V3(KC.x + n.x * KR.x * k, KC.y + n.y * KR.y * k, KC.z + n.z * KR.z * k);
    };

    const coreMat = new THREE.MeshStandardMaterial({ color: 0x15171d, roughness: 0.8, emissive: 0x58c8ff, emissiveIntensity: 0.04 });
    {
      const core = mesh(new THREE.SphereGeometry(1, 40, 28), coreMat);
      core.scale.set(KR.x * 0.93, KR.y * 0.93, KR.z * 0.93);
      core.position.copy(KC);
      body.add(core);
    }
    const knotLight = new THREE.PointLight(0x8fdcff, 0, 3.4);
    knotLight.position.set(KC.x, KC.y + 0.1, KC.z + 0.5);
    body.add(knotLight);

    const loopColors = [C.black, C.gray, C.black, C.orange, C.black, C.blue, C.gray, C.black, C.red, C.black, C.white, C.gray];
    const loopMats = {};
    const matOf = c => loopMats[c] || (loopMats[c] = rubber(c));
    const GA = Math.PI * (3 - Math.sqrt(5));
    loopColors.forEach((col, k) => {
      const y = 1 - ((k + 0.5) / loopColors.length) * 2;
      const rr = Math.sqrt(1 - y * y);
      const th = GA * k * 1.7;
      const n = V3(Math.cos(th) * rr, y, Math.sin(th) * rr).normalize();
      const a = V3().crossVectors(n, Math.abs(n.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0)).normalize();
      const b = V3().crossVectors(n, a).normalize();
      const ph = rnd() * TAU;
      const amp = 0.015 + rnd() * 0.025;
      const lay = 1.0 + (k % 3) * 0.04;
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const q = (i / 16) * TAU;
        const d = a.clone().multiplyScalar(Math.cos(q)).addScaledVector(b, Math.sin(q));
        d.addScaledVector(n, Math.sin(q * 2 + ph) * amp * 1.5);
        const w = lay + Math.sin(q * 3 + ph) * amp;
        pts.push(V3(KC.x + d.x * KR.x * w, KC.y + d.y * KR.y * w, KC.z + d.z * KR.z * w));
      }
      const r = col === C.black ? 0.1 : col === C.gray ? 0.09 : 0.075;
      body.add(staticTube(pts, r, matOf(col), true, 80, 10));
    });

    const strandGeo = new THREE.CylinderGeometry(0.008, 0.012, 1, 5);
    strandGeo.translate(0, 0.5, 0);
    const fray = (parent, at, dir, len = 0.09, n = 7, spread = 0.55) => {
      const g = new THREE.Group();
      g.position.copy(at);
      g.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
      const core = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10), copperMat, false);
      core.position.y = 0.02;
      g.add(core);
      for (let i = 0; i < n; i++) {
        const s = mesh(strandGeo, copperMat, false);
        const a = (i / n) * TAU + rnd() * 0.4;
        s.position.set(Math.cos(a) * 0.015, 0.04, Math.sin(a) * 0.015);
        s.rotation.set(Math.sin(a) * spread * (0.6 + rnd() * 0.5), 0, -Math.cos(a) * spread * (0.6 + rnd() * 0.5));
        s.scale.y = len * (0.7 + rnd() * 0.5);
        g.add(s);
      }
      parent.add(g);
      return g;
    };

    const stubTips = [];
    [
      [V3(0.92, -0.15, 0.45), C.red, V3(0.3, 0.3, 0.2)],
      [V3(-0.9, -0.05, 0.5), C.black, V3(-0.2, 0.35, 0.25)],
      [V3(0.35, -0.55, 0.85), C.blue, V3(0.25, -0.1, 0.35)],
      [V3(-0.45, -0.6, 0.8), C.yellow, V3(-0.3, -0.05, 0.3)],
      [V3(0.75, 0.55, -0.55), C.black, V3(0.25, 0.3, -0.2)],
      [V3(-0.7, 0.35, -0.7), C.gray, V3(-0.2, 0.35, -0.25)]
    ].forEach(([d, col, bend]) => {
      const p0 = onKnot(d, 0.95);
      const n = V3(d.x / KR.x, d.y / KR.y, d.z / KR.z).normalize();
      const p1 = p0.clone().addScaledVector(n, 0.16);
      const p2 = p1.clone().add(bend.clone().multiplyScalar(0.55)).addScaledVector(n, 0.08);
      body.add(staticTube([p0, p1, p2], 0.05, matOf(col), false, 16, 8));
      const dir = p2.clone().sub(p1).normalize();
      fray(body, p2.clone().addScaledVector(dir, -0.01), dir);
      stubTips.push(p2.clone().addScaledVector(dir, 0.1));
    });

    const clawGeo = new THREE.CylinderGeometry(0.008, 0.02, 0.2, 6);
    clawGeo.translate(0, 0.1, 0);
    const legMat = rubber(C.black);
    const legMat2 = rubber(C.gray);
    const legs = [];
    [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1]
    ].forEach(([sx, sz]) => {
      const g = new THREE.Group();
      body.add(g);
      const hip = V3(sx * 0.52, 0.66, KC.z + sz * 0.36);
      const knee = V3(sx * 0.86, 0.38, KC.z + sz * 0.6);
      const foot = V3(sx * 0.84, 0.06, KC.z + sz * 0.66);
      const spine = new THREE.CatmullRomCurve3([hip, knee, foot], false, "centripetal");
      const n = 40;
      const S = [];
      const T = [];
      const N = [];
      const B = [];
      for (let i = 0; i <= n; i++) {
        S.push(spine.getPoint(i / n));
        T.push(V3());
        N.push(V3());
        B.push(V3());
      }
      computeFrames(S, T, N, B, n);
      for (let k = 0; k < 3; k++) {
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const a = (k / 3) * TAU + (i / n) * TAU * 1.6;
          const rr = 0.075 * (1 - (i / n) * 0.2);
          pts.push(S[i].clone().addScaledVector(N[i], Math.cos(a) * rr).addScaledVector(B[i], Math.sin(a) * rr));
        }
        g.add(staticTube(pts, 0.066 * (1 - k * 0.04), k === 1 ? legMat2 : legMat, false, 48, 8));
      }
      const cuff = mesh(new THREE.TorusGeometry(0.13, 0.035, 8, 20), tapeWhite, false);
      cuff.position.copy(S[n - 6]);
      cuff.quaternion.setFromUnitVectors(V3(0, 0, 1), T[n - 6]);
      g.add(cuff);
      const claws = new THREE.Group();
      claws.position.set(foot.x, 0.05, foot.z);
      g.add(claws);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i / 5 - 0.5) * 2.0 + (sz < 0 ? Math.PI : 0);
        const tilt = new THREE.Group();
        tilt.rotation.y = -a + Math.PI / 2;
        claws.add(tilt);
        const c2 = mesh(clawGeo, copperMat, false);
        c2.rotation.x = 1.25;
        tilt.add(c2);
      }
      legs.push({ g, sx, sz });
    });

    const tail = flexTube(46, 10, rubber(C.orange));
    body.add(tail.m);
    const tailEnd = new THREE.Group();
    body.add(tailEnd);
    {
      const boxMat = rubber(0xf58a2c);
      const box = mesh(new THREE.BoxGeometry(0.36, 0.13, 0.17), boxMat);
      tailEnd.add(box);
      const capL = mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.17, 18, 1, false, 0, Math.PI), boxMat);
      capL.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      capL.position.x = -0.18;
      tailEnd.add(capL);
      const capR = capL.clone();
      capR.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
      capR.position.x = 0.18;
      tailEnd.add(capR);
      const faceMat = rubber(0xffa556);
      [-0.11, 0, 0.11].forEach(x => {
        const f = mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.012, 20), faceMat, false);
        f.position.set(x, 0.068, 0);
        tailEnd.add(f);
        [
          [-0.017, -0.008],
          [0.017, -0.008],
          [0, 0.018]
        ].forEach(([hx, hz]) => {
          const h = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 10), darkMat, false);
          h.position.set(x + hx, 0.075, hz);
          tailEnd.add(h);
        });
      });
    }

    let sparkTex = null;
    let smokeTex = null;
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
      const c2 = document.createElement("canvas");
      c2.width = c2.height = 64;
      const y = c2.getContext("2d");
      const g2 = y.createRadialGradient(32, 32, 0, 32, 32, 30);
      g2.addColorStop(0, "rgba(90,90,96,0.8)");
      g2.addColorStop(1, "rgba(90,90,96,0)");
      y.fillStyle = g2;
      y.fillRect(0, 0, 64, 64);
      smokeTex = new THREE.CanvasTexture(c2);
    }
    const sparks = [];
    for (let i = 0; i < 36; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: 0xcfefff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      s.visible = false;
      body.add(s);
      sparks.push({ s, life: 0, max: 1, v: V3(), size: 0.1 });
    }
    let sparkI = 0;
    const spark = (p, v, size = 0.12, life = 0.25) => {
      const sp = sparks[sparkI++ % sparks.length];
      sp.s.position.copy(p);
      sp.v.copy(v);
      sp.life = life;
      sp.max = life;
      sp.size = size;
      sp.s.visible = true;
    };
    const smokes = [];
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0x9a9aa2, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      body.add(s);
      smokes.push({ s, life: 0, max: 1, v: V3() });
    }
    let smokeI = 0;
    const smoke = p => {
      const sm = smokes[smokeI++ % smokes.length];
      sm.s.position.copy(p);
      sm.v.set((rnd() - 0.5) * 0.15, 0.35 + rnd() * 0.2, (rnd() - 0.5) * 0.15);
      sm.life = 1.4;
      sm.max = 1.4;
      sm.s.visible = true;
    };

    const HEADS = [
      { key: "power", dir: V3(0, 1, 0.42), H: V3(0, 3.0, 0.72), yaw: 0, pitch: -0.12, s: 1.75, neckR: 0.15, color: C.black, eye: 0.44 },
      { key: "phone", dir: V3(-0.62, 0.86, 0.42), H: V3(-1.08, 2.62, 0.74), yaw: -0.22, pitch: -0.04, s: 1.35, neckR: 0.075, color: C.beige, eye: 0.48 },
      { key: "net", dir: V3(0.62, 0.86, 0.42), H: V3(1.1, 2.68, 0.7), yaw: 0.22, pitch: -0.06, s: 1.4, neckR: 0.11, color: C.blue, eye: 0.46 },
      { key: "coax", dir: V3(-1, 0.4, 0.25), H: V3(-1.72, 1.92, 0.56), yaw: -0.4, pitch: 0.2, s: 1.3, neckR: 0.11, color: C.white, eye: 0.46 },
      { key: "ext", dir: V3(1, 0.48, 0.25), H: V3(1.74, 2.14, 0.62), yaw: 0.38, pitch: -0.06, s: 1.25, neckR: 0.105, color: C.orange, eye: 0.5 }
    ];
    const J_LOCAL = V3(0, -0.08, -0.12);
    const J_DIR = V3(0, -0.5, -1).normalize();
    const J_Q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), J_DIR);

    const keyAt = (keys, z) => {
      if (z <= keys[0][0]) return keys[0].slice(1);
      const n = keys.length;
      if (z >= keys[n - 1][0]) return keys[n - 1].slice(1);
      let i = 0;
      while (keys[i + 1][0] < z) i++;
      const k0 = keys[Math.max(0, i - 1)];
      const k1 = keys[i];
      const k2 = keys[i + 1];
      const k3 = keys[Math.min(n - 1, i + 2)];
      const u = (z - k1[0]) / (k2[0] - k1[0]);
      const out = [];
      for (let c = 1; c < k1.length; c++) {
        const m1 = ((k2[c] - k0[c]) / (k2[0] - k0[0] || 1)) * (k2[0] - k1[0]);
        const m2 = ((k3[c] - k1[c]) / (k3[0] - k1[0] || 1)) * (k2[0] - k1[0]);
        const u2 = u * u;
        const u3 = u2 * u;
        out.push((2 * u3 - 3 * u2 + 1) * k1[c] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * k2[c] + (u3 - u2) * m2);
      }
      return out;
    };
    const headLoft = (keys, nTop, nBot, NZ, NU) => {
      const z0 = keys[0][0];
      const z1 = keys[keys.length - 1][0];
      const pos = [];
      const idx = [];
      for (let j = 0; j <= NZ; j++) {
        const v = j / NZ;
        const z = lerp(z0, z1, (1 - Math.cos(v * Math.PI)) / 2);
        const [w, top, bot] = keyAt(keys, z);
        const mid = (top + bot) / 2;
        for (let i = 0; i < NU; i++) {
          const a = (i / NU) * TAU;
          const c = Math.cos(a);
          const sn = Math.sin(a);
          const ex = sn >= 0 ? 2 / nTop : 2 / nBot;
          pos.push(w * Math.sign(c) * Math.pow(Math.abs(c), ex), mid + (sn >= 0 ? top - mid : mid - bot) * Math.sign(sn) * Math.pow(Math.abs(sn), ex), z);
        }
      }
      for (let j = 0; j < NZ; j++)
        for (let i = 0; i < NU; i++) {
          const a = j * NU + i;
          const b = j * NU + ((i + 1) % NU);
          idx.push(a, b, a + NU, b, b + NU, a + NU);
        }
      const capA = pos.length / 3;
      const ka = keyAt(keys, z0);
      pos.push(0, (ka[1] + ka[2]) / 2, z0 - 0.012);
      const capB = pos.length / 3;
      const kb = keyAt(keys, z1);
      pos.push(0, (kb[1] + kb[2]) / 2, z1 + 0.008);
      for (let i = 0; i < NU; i++) {
        idx.push(capA, (i + 1) % NU, i);
        idx.push(capB, NZ * NU + i, NZ * NU + ((i + 1) % NU));
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return geo;
    };
    const buildHead = h => {
      const g = new THREE.Group();
      g.rotation.order = "YXZ";
      body.add(g);
      const skinMat = rubber(h.color);
      const mats = [skinMat];
      const SHAPE = {
        power: { keys: [[-0.25, 0.07, 0.04, -0.06], [-0.21, 0.17, 0.12, -0.13], [-0.1, 0.25, 0.175, -0.17], [0.04, 0.27, 0.185, -0.175], [0.15, 0.24, 0.15, -0.16], [0.23, 0.17, 0.075, -0.14], [0.27, 0.12, 0.03, -0.12]], nt: 3.2, nb: 2.4, eye: [0.13, 0.125, 0.135], eyeYaw: 0.42 },
        phone: { keys: [[-0.22, 0.07, 0.05, -0.05], [-0.18, 0.17, 0.15, -0.11], [-0.06, 0.22, 0.2, -0.13], [0.06, 0.215, 0.19, -0.13], [0.16, 0.17, 0.13, -0.12], [0.22, 0.11, 0.06, -0.1], [0.25, 0.08, 0.025, -0.08]], nt: 2.2, nb: 2.2, eye: [0.105, 0.1, 0.16], eyeYaw: 0.34 },
        net: { keys: [[-0.24, 0.07, 0.04, -0.05], [-0.2, 0.16, 0.12, -0.1], [-0.08, 0.23, 0.155, -0.12], [0.05, 0.235, 0.145, -0.115], [0.16, 0.2, 0.1, -0.1], [0.24, 0.15, 0.055, -0.09], [0.28, 0.12, 0.035, -0.085]], nt: 2.4, nb: 2.6, eye: [0.13, 0.115, 0.08], eyeYaw: 0.5 },
        coax: { keys: [[-0.23, 0.07, 0.05, -0.05], [-0.19, 0.16, 0.15, -0.11], [-0.07, 0.205, 0.19, -0.13], [0.05, 0.195, 0.17, -0.13], [0.14, 0.14, 0.1, -0.115], [0.2, 0.1, 0.045, -0.105], [0.23, 0.09, 0.025, -0.095]], nt: 2.1, nb: 2.3, eye: [0.11, 0.095, 0.11], eyeYaw: 0.4 },
        ext: { keys: [[-0.22, 0.08, 0.04, -0.05], [-0.18, 0.2, 0.11, -0.11], [-0.06, 0.27, 0.15, -0.14], [0.06, 0.28, 0.15, -0.14], [0.16, 0.24, 0.11, -0.13], [0.22, 0.17, 0.06, -0.12], [0.25, 0.13, 0.03, -0.11]], nt: 2.6, nb: 2.4, eye: [0.135, 0.14, 0.06], eyeYaw: 0.48 }
      }[h.key];
      const er = 0.22 * h.eye;
      const [EX, EY, EZ] = SHAPE.eye;
      const sculpt = () => {
        const geo = headLoft(SHAPE.keys, SHAPE.nt, SHAPE.nb, 56, 40);
        const pa = geo.attributes.position;
        const na = geo.attributes.normal;
        const bumps = [];
        [-1, 1].forEach(sd => {
          bumps.push([sd * EX, EY - er * 0.25, EZ - er * 0.35, er * 0.95, er * 0.45]);
          bumps.push([sd * EX * 1.05, EY + er * 0.75, EZ + er * 0.15, er * 0.7, 0.018]);
          bumps.push([sd * SHAPE.keys[3][1] * 0.72, -0.07, 0.1, 0.075, 0.018]);
        });
        bumps.push([0, SHAPE.keys[4][2] * 0.9, 0.17, 0.06, 0.012]);
        bumps.push([0, SHAPE.keys[2][2] * 0.5, -0.19, 0.11, 0.014]);
        const p = V3();
        for (let i = 0; i < pa.count; i++) {
          p.set(pa.getX(i), pa.getY(i), pa.getZ(i));
          let disp = 0;
          bumps.forEach(([bx, by, bz, br, ba]) => {
            const d2 = (p.x - bx) ** 2 + (p.y - by) ** 2 + (p.z - bz) ** 2;
            disp += ba * Math.exp(-d2 / (br * br));
          });
          pa.setXYZ(i, p.x + na.getX(i) * disp, p.y + na.getY(i) * disp, p.z + na.getZ(i) * disp);
        }
        geo.computeVertexNormals();
        return geo;
      };
      const skull = mesh(sculpt(), skinMat);
      g.add(skull);
      const neckEnd = (h.key === "phone" ? 0.1 : h.neckR * 0.92) / h.s;
      const flapMat = skinMat.clone();
      flapMat.side = THREE.DoubleSide;
      mats.push(flapMat);
      const flapGeo = (len, w) => {
        const sh = new THREE.Shape();
        sh.moveTo(-w * 0.5, 0);
        sh.bezierCurveTo(-w * 0.62, len * 0.5, -w * 0.5, len * 1.02, 0, len);
        sh.bezierCurveTo(w * 0.5, len * 1.02, w * 0.62, len * 0.5, w * 0.5, 0);
        sh.lineTo(-w * 0.5, 0);
        const geo = new THREE.ShapeGeometry(sh, 10);
        const pa = geo.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          const x = pa.getX(i);
          const y = pa.getY(i);
          const u = y / len;
          pa.setZ(i, u * u * len * 0.5 - (x / w) * (x / w) * w * 0.3);
        }
        geo.computeVertexNormals();
        return geo;
      };
      {
        const FL = { power: [5, 0.2, 0.13, 0.55], phone: [4, 0.13, 0.09, 0.6], net: [4, 0.15, 0.1, 0.5], coax: [4, 0.15, 0.1, 1.05], ext: [4, 0.15, 0.1, 0.35] }[h.key];
        const [nf, len, w, droop] = FL;
        const base = J_LOCAL.clone().addScaledVector(J_DIR, 0.02);
        const ax = J_DIR.clone();
        const a1 = V3().crossVectors(ax, V3(1, 0, 0)).normalize();
        const a2 = V3().crossVectors(ax, a1).normalize();
        const geo = flapGeo(len, w);
        for (let k = 0; k < nf; k++) {
          const ang = (k / nf) * TAU + 0.3;
          const radial = a1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(a2, Math.sin(ang));
          const up = ax.clone().multiplyScalar(Math.cos(droop)).addScaledVector(radial, Math.sin(droop)).normalize();
          const f = mesh(geo, flapMat, false);
          const m = new THREE.Matrix4().lookAt(V3(), radial.clone().negate(), up);
          f.quaternion.setFromRotationMatrix(m);
          f.position.copy(base).addScaledVector(radial, neckEnd * 0.95);
          g.add(f);
        }
      }
      const boot = mesh(new THREE.TorusGeometry(neckEnd + 0.012, 0.02, 10, 28), skinMat, false);
      boot.position.copy(J_LOCAL).addScaledVector(J_DIR, 0.12);
      boot.quaternion.copy(J_Q);
      g.add(boot);
      const jawHinge = new THREE.Group();
      jawHinge.position.set(0, -0.12, 0.05);
      g.add(jawHinge);
      const jawMat = h.key === "power" ? rubber(0x2a2c33) : skinMat;
      if (jawMat !== skinMat) mats.push(jawMat);
      const jaw = mesh(new THREE.SphereGeometry(0.15, 24, 14), jawMat);
      jaw.scale.set(1, 0.4, 1.22);
      jaw.position.set(0, -0.02, 0.14);
      jawHinge.add(jaw);
      const inner = mesh(new THREE.SphereGeometry(0.12, 18, 12), mouthMat, false);
      inner.scale.set(1, 0.5, 1.1);
      inner.position.set(0, -0.1, 0.17);
      g.add(inner);
      [-1, 1].forEach(sd => {
        const f = mesh(new THREE.ConeGeometry(0.018, 0.05, 8), fangMat, false);
        f.position.set(sd * 0.07, 0.03, 0.27);
        jawHinge.add(f);
      });
      const eyes = [-1, 1].map(sd => {
        const e = eye({ size: h.eye, pupilColor: h.key === "net" ? (sd < 0 ? 0x1f9a4a : 0xe2781c) : 0x1c1d26 });
        e.g.position.set(sd * EX, EY, EZ);
        e.g.rotation.set(-0.2, sd * SHAPE.eyeYaw, 0);
        g.add(e.g);
        return e;
      });
      const brows = [];
      const lids = [];
      const browMat = h.key === "power" || h.key === "net" ? darkMat : rubber(0x3a3020);
      const BR = { power: [[0.07, 0], [0.07, 0]], phone: [[-0.05, 0.02], [-0.05, 0.02]], net: [[-0.22, 0.032], [0.16, -0.004]], ext: [[-0.1, 0.014], [-0.1, 0.014]] }[h.key];
      const browGeo = new THREE.TorusGeometry(0.075, 0.016, 8, 16, 1.25);
      browGeo.rotateZ(Math.PI / 2 - 0.625);
      browGeo.translate(0, -0.075, 0);
      if (h.key !== "coax")
        [-1, 1].forEach((sd, k) => {
          const b = mesh(browGeo, h.color === C.black ? rubber(0x0c0d10) : browMat, false);
          b.scale.set(1, 1, 0.6);
          const y0 = EY + er * 1.02 + 0.015 + BR[k][1];
          b.position.set(sd * EX, y0, EZ + er * 0.15);
          b.rotation.set(-0.35, sd * SHAPE.eyeYaw * 0.8, 0);
          b.userData = { ang: BR[k][0], y0 };
          g.add(b);
          brows.push({ b, sd });
        });
      else {
        const lidMat = skinMat;
        eyes.forEach(({ g: eg }, i) => {
          const lid = new THREE.Group();
          eg.add(lid);
          const m = mesh(new THREE.SphereGeometry(0.22 * h.eye * 1.08, 20, 10, 0, TAU, 0, Math.PI / 2), lidMat, false);
          m.scale.set(1, 1.1, 0.62);
          lid.add(m);
          lids.push(lid);
        });
      }
      if (h.key === "phone" || h.key === "ext") {
        const blushMat = new THREE.MeshStandardMaterial({ color: h.key === "phone" ? 0xf2a0a8 : 0xe2563a, roughness: 0.8, transparent: true, opacity: 0.75 });
        [-1, 1].forEach(sd => {
          const bl = mesh(new THREE.CircleGeometry(0.036, 20), blushMat, false);
          const bx = SHAPE.keys[4][1] * 0.86;
          bl.position.set(sd * bx, -0.035, 0.15);
          bl.lookAt(V3(sd * (bx + 1), -0.035, 0.15 + 0.9));
          g.add(bl);
        });
      }
      if (h.key === "ext") {
        const tongue = mesh(new THREE.SphereGeometry(0.05, 16, 10), rubber(0xe8606e), false);
        tongue.scale.set(0.85, 0.35, 1.3);
        tongue.position.set(0.035, 0.02, 0.24);
        tongue.rotation.set(0.35, 0.3, 0);
        jawHinge.add(tongue);
      }
      if (h.key === "power")
        [-1, 1].forEach(sd => {
          const ear = new THREE.Group();
          ear.position.set(sd * 0.235, 0.11, -0.07);
          ear.rotation.set(0.25, sd * 0.35, sd * -2.0, "YXZ");
          g.add(ear);
          const e1 = mesh(flapGeo(0.17, 0.13), flapMat, false);
          e1.rotation.x = Math.PI / 2;
          e1.rotation.y = Math.PI;
          ear.add(e1);
          h.ears = (h.ears || []).concat([{ g: ear, sd }]);
        });
      if (h.key === "phone")
        [-1, 1].forEach(sd => {
          const pts = [];
          const A = V3(sd * 0.17, 0.13, -0.04);
          const B = V3(sd * 0.33, -0.1, -0.07);
          const d = B.clone().sub(A).normalize();
          const p1 = V3().crossVectors(d, V3(0, 0, 1)).normalize();
          const p2 = V3().crossVectors(d, p1).normalize();
          for (let i = 0; i <= 80; i++) {
            const u = i / 80;
            const a = u * TAU * 5;
            const r = 0.03 * Math.min(1, u * 6) * (1 - u * 0.2);
            const c = A.clone().lerp(B, u).addScaledVector(V3(sd, 0.4, 0), Math.sin(u * Math.PI) * 0.04);
            pts.push(c.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r));
          }
          const coil = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.012, 8), skinMat, false);
          g.add(coil);
          const tip = mesh(new THREE.BoxGeometry(0.04, 0.03, 0.05), clearMat, false);
          tip.position.copy(pts[80]).add(V3(0, -0.015, 0));
          g.add(tip);
        });
      if (h.key === "net") {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.bezierCurveTo(0.02, 0.07, 0.1, 0.11, 0.2, 0.09);
        sh.bezierCurveTo(0.17, 0.05, 0.2, 0.02, 0.26, 0);
        sh.lineTo(0, 0);
        const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
        fg.translate(0, 0, -0.006);
        const fin = mesh(fg, clearMat, false);
        fin.rotation.y = Math.PI / 2;
        fin.position.set(0, 0.13, 0.12);
        fin.renderOrder = 2;
        g.add(fin);
        const PAIRS = [[0xe2781c, 0xf6e9dc], [0x3f9b4c, 0xf6e9dc]];
        [-1, 1].forEach(sd =>
          PAIRS.forEach(([ca, cb], k) => {
            [ca, cb].forEach((c, j) => {
              const pts = [];
              for (let i = 0; i <= 30; i++) {
                const u = i / 30;
                const tw = u * TAU * 3 + j * Math.PI;
                const base = V3(sd * (0.11 + u * 0.14), -0.06 - k * 0.02 - u * (0.06 + k * 0.05) + u * u * 0.03, 0.22 - u * 0.05);
                pts.push(base.add(V3(0, Math.cos(tw) * 0.006, Math.sin(tw) * 0.006)));
              }
              g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0055, 5), rubber(c), false));
            });
          })
        );
      }
      if (h.key === "coax") {
        const hub = mesh(new THREE.SphereGeometry(0.035, 14, 10), nickelMat, false);
        hub.position.set(0, 0.195, -0.06);
        g.add(hub);
        [-1, 1].forEach(sd => {
          const ant = new THREE.Group();
          ant.position.copy(hub.position);
          ant.rotation.set(-0.3, 0, sd * -0.5);
          g.add(ant);
          [0.011, 0.008, 0.006].forEach((r, i) => {
            const seg = mesh(new THREE.CylinderGeometry(r, r, 0.11, 8), nickelMat, false);
            seg.position.y = 0.055 + i * 0.1;
            ant.add(seg);
          });
          const ball = mesh(new THREE.SphereGeometry(0.014, 10, 8), nickelMat, false);
          ball.position.y = 0.32;
          ant.add(ball);
          h.ears = (h.ears || []).concat([{ g: ant, sd }]);
        });
      }
      if (h.key === "ext") {
        const sw = mesh(new THREE.BoxGeometry(0.09, 0.03, 0.06), rubber(0x2a2c33), false);
        sw.position.set(0, 0.155, -0.06);
        sw.rotation.x = -0.25;
        g.add(sw);
        const rocker = mesh(new THREE.BoxGeometry(0.07, 0.025, 0.045), new THREE.MeshStandardMaterial({ color: 0xe0302a, emissive: 0xc01810, emissiveIntensity: 0.5, roughness: 0.4 }), false);
        rocker.position.set(0, 0.175, -0.06);
        rocker.rotation.x = -0.45;
        g.add(rocker);
        h.rocker = rocker;
      }
      if (h.key === "coax")
        for (let i = 0; i < 3; i++) {
          const ring = mesh(new THREE.TorusGeometry(neckEnd * 0.98, 0.01, 6, 28), nickelMat, false);
          ring.position.copy(J_LOCAL).addScaledVector(J_DIR, 0.16 + i * 0.03);
          ring.quaternion.copy(J_Q);
          g.add(ring);
        }
      h.lidRest = h.key === "coax" ? 0.5 : 0.42;
      const mouthAt = V3(0, -0.1, 0.34);
      if (h.key === "power") {
        const PY = -0.055;
        const plug = mesh(new THREE.CylinderGeometry(0.1, 0.125, 0.15, 6), skinMat);
        plug.rotation.set(Math.PI / 2, Math.PI / 6, 0);
        plug.position.set(0, PY, 0.3);
        g.add(plug);
        const face = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 32), rubber(0x3a3d46), false);
        face.rotation.x = Math.PI / 2;
        face.position.set(0, PY, 0.378);
        g.add(face);
        mats.push(face.material);
        [
          [-0.042, -0.012, 0.1],
          [0.042, -0.012, 0.1],
          [0, 0.034, 0.075]
        ].forEach(([x, y, l]) => {
          const pin = mesh(new THREE.CylinderGeometry(0.017, 0.017, l, 14), nickelMat, false);
          pin.rotation.x = Math.PI / 2;
          pin.position.set(x, PY + y, 0.384 + l / 2);
          g.add(pin);
          const tip = mesh(new THREE.SphereGeometry(0.017, 12, 8), nickelMat, false);
          tip.position.set(x, PY + y, 0.384 + l);
          g.add(tip);
        });
        [0, 1, 2].forEach(i => {
          const rib = mesh(new THREE.TorusGeometry(0.1 - i * 0.006, 0.022, 8, 24), skinMat, false);
          rib.position.copy(J_LOCAL).addScaledVector(J_DIR, 0.19 + i * 0.055);
          rib.quaternion.copy(J_Q);
          g.add(rib);
        });
        const tagWire = mesh(new THREE.TorusGeometry(0.025, 0.004, 6, 14), nickelMat, false);
        tagWire.position.set(0.215, -0.07, -0.02);
        tagWire.rotation.y = Math.PI / 2;
        g.add(tagWire);
        const tag = new THREE.Group();
        tag.position.set(0.218, -0.09, -0.02);
        g.add(tag);
        const tg = mesh(new THREE.BoxGeometry(0.012, 0.075, 0.055), rubber(C.yellow), false);
        tg.position.y = -0.045;
        tag.add(tg);
        h.tag = tag;
        mouthAt.set(0, -0.12, 0.3);
      } else if (h.key === "phone" || h.key === "net") {
        const big = h.key === "net";
        const w = big ? 0.2 : 0.15;
        const hh = big ? 0.12 : 0.1;
        const l = big ? 0.22 : 0.19;
        const cz = 0.25 + l / 2 - 0.04;
        const block = mesh(new THREE.BoxGeometry(w, hh, l), clearMat, false);
        block.position.set(0, -0.03, cz);
        block.renderOrder = 2;
        g.add(block);
        const cols = big ? [0xf6b98a, 0xf07a1a, 0x9fd6a4, 0x2f6fd6, 0xa9c4f0, 0x3f9b4c, 0xc7a27c, 0x7a4a2a] : [0x1d1f25, 0xc8323a, 0x3f9b4c, 0xf2c230];
        cols.forEach((c, i) => {
          const x = (i / (cols.length - 1) - 0.5) * w * 0.8;
          const wire = mesh(new THREE.CylinderGeometry(0.008, 0.008, l * 0.75, 6), rubber(c), false);
          wire.rotation.x = Math.PI / 2;
          wire.position.set(x, -0.03, cz - l * 0.08);
          g.add(wire);
          const pin = mesh(new THREE.BoxGeometry(w * 0.06, 0.035, 0.03), goldMat, false);
          pin.position.set(x, -0.03 - hh / 2 + 0.012, cz + l / 2 - 0.02);
          g.add(pin);
        });
        const clip = mesh(new THREE.BoxGeometry(w * 0.42, 0.012, l * 0.75), clearMat, false);
        clip.position.set(0, -0.03 + hh / 2 + 0.035, cz - 0.01);
        clip.rotation.x = -0.32;
        g.add(clip);
        const boot = mesh(new THREE.CylinderGeometry(w * 0.55, w * 0.62, 0.07, 20), skinMat, false);
        boot.rotation.x = Math.PI / 2;
        boot.position.set(0, -0.03, cz - l / 2 - 0.005);
        g.add(boot);
        mouthAt.set(0, -0.11, cz);
        if (big) {
          h.leds = [-1, 1].map(sd => {
            const led = mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshStandardMaterial({ color: sd < 0 ? 0x2fe06a : 0xffa020, emissive: sd < 0 ? 0x2fe06a : 0xffa020, emissiveIntensity: 1 }), false);
            led.position.set(sd * w * 0.36, -0.03 + hh / 2 + 0.004, cz + l / 2 - 0.03);
            g.add(led);
            return led;
          });
        }
      } else if (h.key === "coax") {
        const nut = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 6), nickelMat, false);
        nut.rotation.x = Math.PI / 2;
        nut.position.set(0, -0.035, 0.235);
        g.add(nut);
        const barrel = mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.14, 24), nickelMat, false);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, -0.035, 0.32);
        g.add(barrel);
        for (let i = 0; i < 5; i++) {
          const th = mesh(new THREE.TorusGeometry(0.073, 0.006, 6, 24), nickelMat, false);
          th.position.set(0, -0.035, 0.27 + i * 0.024);
          g.add(th);
        }
        const diel = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 20), rubber(0xfafaf4), false);
        diel.rotation.x = Math.PI / 2;
        diel.position.set(0, -0.035, 0.392);
        g.add(diel);
        const pin = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 10), copperMat, false);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(0, -0.035, 0.44);
        g.add(pin);
        mouthAt.set(0, -0.13, 0.28);
      } else {
        const sock = mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.1, 32), rubber(0xff9a3d), false);
        sock.rotation.x = Math.PI / 2;
        sock.position.set(0, -0.035, 0.28);
        g.add(sock);
        mats.push(sock.material);
        const rec = mesh(new THREE.CylinderGeometry(0.098, 0.098, 0.01, 32), rubber(0xf3eadb), false);
        rec.rotation.x = Math.PI / 2;
        rec.position.set(0, -0.035, 0.327);
        g.add(rec);
        [
          [-0.038, -0.012],
          [0.038, -0.012],
          [0, 0.036]
        ].forEach(([x, y]) => {
          const hole = mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.012, 14), darkMat, false);
          hole.rotation.x = Math.PI / 2;
          hole.position.set(x, -0.035 + y, 0.331);
          g.add(hole);
        });
        mouthAt.set(0, -0.12, 0.27);
      }
      return Object.assign(h, { g, jawHinge, eyes, brows, lids, mats, base: mats.map(m => m.color.clone()), mouthAt, pos: V3(), q: new THREE.Quaternion() });
    };
    HEADS.forEach(buildHead);

    const necks = HEADS.map(h => {
      if (h.key === "phone") {
        const spine = flexTube(40, 3, darkMat, false);
        const wire = flexTube(260, 6, rubber(C.beige));
        body.add(wire.m);
        return { h, spine, wire };
      }
      const t = flexTube(44, 12, rubber(h.color));
      body.add(t.m);
      return { h, t };
    });
    const neckOf = key => necks.find(n => n.h.key === key);

    const tapes = [];
    const addTape = (key, u, white, scale = 1) => {
      const m = mesh(new THREE.TorusGeometry(1, 0.22, 8, 24), white ? tapeWhite : tapeBlack, false);
      body.add(m);
      const t = { key, u, m, scale, pop: 1 };
      tapes.push(t);
      return t;
    };
    addTape("power", 0.42, false);
    addTape("power", 0.47, true);
    addTape("net", 0.58, false);
    addTape("coax", 0.36, false);
    addTape("coax", 0.66, true);
    const newTape = addTape("coax", 0.9, false);
    addTape("ext", 0.5, false);
    addTape("ext", 0.55, false);

    const shoeMat = rubber(0xc8323a);
    const soleMat = rubber(0xf4f2ea);
    const laceMat = rubber(0xf4f2ea);
    const shoes = new THREE.Group();
    body.add(shoes);
    const shoePair = [-1, 1].map(sd => {
      const pv = new THREE.Group();
      shoes.add(pv);
      const lace = mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), laceMat, false);
      lace.geometry.translate(0, -0.5, 0);
      pv.add(lace);
      const shoe = new THREE.Group();
      pv.add(shoe);
      const up = mesh(new THREE.SphereGeometry(0.075, 18, 12), shoeMat, false);
      up.scale.set(0.85, 0.9, 1.55);
      up.position.set(0, 0.02, 0);
      shoe.add(up);
      const sole = mesh(new THREE.SphereGeometry(0.075, 18, 10), soleMat, false);
      sole.scale.set(0.95, 0.35, 1.65);
      sole.position.set(0, -0.045, 0.005);
      shoe.add(sole);
      const toe = mesh(new THREE.SphereGeometry(0.05, 14, 10), soleMat, false);
      toe.scale.set(1.05, 0.75, 0.9);
      toe.position.set(0, -0.015, 0.085);
      shoe.add(toe);
      const collar = mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 16), soleMat, false);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0.075, -0.04);
      shoe.add(collar);
      shoe.rotation.x = -1.2;
      return { pv, lace, shoe, sd };
    });

    const kite = new THREE.Group();
    kite.position.set(0.6, 1.98, -0.72);
    kite.rotation.order = "YXZ";
    kite.rotation.set(-0.35, Math.PI + 0.55, -0.45);
    body.add(kite);
    {
      const KW = 0.3;
      const KT = 0.34;
      const KB = 0.5;
      const pts = [V3(0, KT, 0), V3(KW, 0, 0), V3(0, -KB, 0), V3(-KW, 0, 0)];
      const cols = [0xf2c230, 0x2f6fd6, 0xc8323a, 0x3f9b4c];
      const ctr = V3(0, 0, 0.05);
      for (let i = 0; i < 4; i++) {
        const g = new THREE.BufferGeometry().setFromPoints([ctr, pts[i], pts[(i + 1) % 4]]);
        g.computeVertexNormals();
        const m = mesh(g, new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.6, side: THREE.DoubleSide }), false);
        kite.add(m);
      }
      const stickMat = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.8 });
      kite.add(staticTube([V3(0, KT, 0.01), V3(0, 0, 0.06), V3(0, -KB, 0.01)], 0.008, stickMat, false, 12, 5, false));
      kite.add(staticTube([V3(-KW, 0, 0.01), V3(0, 0.02, 0.07), V3(KW, 0, 0.01)], 0.008, stickMat, false, 12, 5, false));
    }
    const rabiola = flexTube(30, 4, new THREE.MeshStandardMaterial({ color: 0xf4f2ea, roughness: 0.7 }), false);
    body.add(rabiola.m);
    const rabPts = [];
    for (let i = 0; i < 9; i++) rabPts.push(V3());
    const bows = [];
    for (let i = 0; i < 7; i++) {
      const col = [0xc8323a, 0xf2c230, 0x2f6fd6, 0xf4f2ea][i % 4];
      const b = new THREE.Group();
      const m1 = mesh(new THREE.ConeGeometry(0.04, 0.09, 3), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, side: THREE.DoubleSide }), false);
      m1.scale.z = 0.15;
      m1.rotation.z = Math.PI / 2;
      m1.position.x = 0.04;
      const m2 = m1.clone();
      m2.rotation.z = -Math.PI / 2;
      m2.position.x = -0.04;
      b.add(m1, m2);
      body.add(b);
      bows.push(b);
    }

    {
      let clayTex = null;
      if (hasDoc) {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const x = c.getContext("2d");
        x.fillStyle = "#a8714a";
        x.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 700; i++) {
          const v = 120 + Math.floor(rnd() * 70);
          x.fillStyle = "rgba(" + v + "," + Math.floor(v * 0.66) + "," + Math.floor(v * 0.44) + ",0.5)";
          x.fillRect(rnd() * 128, rnd() * 128, 2 + rnd() * 4, 1 + rnd() * 2);
        }
        clayTex = new THREE.CanvasTexture(c);
        clayTex.wrapS = clayTex.wrapT = THREE.RepeatWrapping;
      }
      const clay = new THREE.MeshStandardMaterial({ map: clayTex, color: 0xffffff, roughness: 0.95 });
      const nest = new THREE.Group();
      const nd = V3(-0.5, 0.82, -0.42);
      nest.position.copy(onKnot(nd, 0.97));
      nest.rotation.set(0.2, Math.atan2(nd.x, nd.z), 0);
      nest.scale.setScalar(1.3);
      body.add(nest);
      const dome = mesh(new THREE.SphereGeometry(0.2, 24, 16, 0, TAU, 0, Math.PI * 0.6), clay);
      dome.scale.set(1.25, 1, 1);
      nest.add(dome);
      const base = mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.06, 24), clay);
      base.scale.set(1.2, 1, 1);
      base.position.y = -0.0;
      nest.add(base);
      const door = mesh(new THREE.SphereGeometry(0.06, 16, 12), darkMat, false);
      door.scale.set(0.7, 1, 0.4);
      door.position.set(0, 0.075, 0.205);
      nest.add(door);
      const lip = mesh(new THREE.TorusGeometry(0.058, 0.02, 8, 18), clay, false);
      lip.scale.set(0.78, 1.05, 1);
      lip.position.set(0, 0.075, 0.21);
      nest.add(lip);
    }

    const stump = fray(body, V3(), V3(0, 1, 0), 0.11, 9, 0.7);
    const food = berry();
    food.visible = false;
    body.add(food);
    const muzzle = new THREE.Group();
    body.add(muzzle);

    const tmpV = V3();
    const tmpV2 = V3();
    const UP = V3(0, 1, 0);
    const BURNT = new THREE.Color(0x151313);
    const RING = { power: V3(0, 0.34, -0.12), phone: V3(-0.36, 0.12, -0.02), net: V3(0.36, 0.12, -0.02), coax: V3(-0.3, -0.26, 0.04), ext: V3(0.3, -0.26, 0.04) };
    const worldOf = (h, local, out) => out.copy(local).multiplyScalar(h.g.scale.x).applyQuaternion(h.g.quaternion).add(h.g.position);
    const mouthPos = (h, out) => worldOf(h, h.mouthAt, out);
    const anchors = HEADS.map(h => onKnot(h.dir, 0.9));
    const anchorN = HEADS.map(h => V3(h.dir.x / KR.x, h.dir.y / KR.y, h.dir.z / KR.z).normalize());
    let lastT = null;

    const placeNeck = (nk, i, droop) => {
      const h = nk.h;
      const A = anchors[i];
      const J = worldOf(h, J_LOCAL, V3());
      const d = J_DIR.clone().applyQuaternion(h.g.quaternion);
      const P1 = A.clone().addScaledVector(anchorN[i], 0.26).addScaledVector(UP, 0.12);
      const P3 = J.clone().addScaledVector(d, 0.24 * h.g.scale.x);
      const mid = P1.clone().lerp(P3, 0.5);
      const side = V3(h.H.x, 0, 0).normalize().multiplyScalar(Math.abs(h.H.x) > 0.1 ? 0.12 : 0);
      mid.add(side).addScaledVector(UP, 0.08 - droop * 0.3);
      const pts = [A, P1, mid, P3, J];
      const r0 = h.neckR;
      if (nk.t) nk.t.fromPoints(pts, u => r0 * lerp(1.3, 0.92, u));
      else {
        nk.spine.fromPoints(pts, () => 0.01);
        const sp = nk.spine;
        const W = nk.wire;
        const n = W.n;
        const turns = 20;
        for (let k = 0; k <= n; k++) {
          const u = k / n;
          const f = u * sp.n;
          const i0 = Math.min(sp.n - 1, Math.floor(f));
          const fr = f - i0;
          const a = u * turns * TAU;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const rh = 0.07 * smooth(0, 0.04, u) * (1 - smooth(0.96, 1, u)) + 0.004;
          const P = W.S[k];
          P.copy(sp.S[i0]).lerp(sp.S[i0 + 1], fr);
          tmpV.copy(sp.N[i0]).lerp(sp.N[i0 + 1], fr);
          tmpV2.copy(sp.B[i0]).lerp(sp.B[i0 + 1], fr);
          P.addScaledVector(tmpV, ca * rh).addScaledVector(tmpV2, sa * rh);
        }
        W.fromSamples(() => 0.03);
      }
      return nk.t || nk.spine;
    };
    const pointOn = (tube, u, out) => {
      const f = u * tube.n;
      const i0 = Math.min(tube.n - 1, Math.floor(f));
      return out.copy(tube.S[i0]).lerp(tube.S[i0 + 1], f - i0);
    };
    const tangentOn = (tube, u, out) => {
      const i0 = Math.min(tube.n, Math.round(u * tube.n));
      return out.copy(tube.T[i0]);
    };

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
        const curto = is("curto");
        const tangle = is("tangle");
        const curl = is("curl");
        const wob = is("wobble");
        const atk = is("attack") ? strike(action.p) : null;
        const vigor = dying ? 0.3 : 0.6 + 0.4 * clamp01(hunger / 100);
        const glad = joy >= 90 && !dying && !action ? 1 : 0;

        let y = 0;
        let z = 0;
        let sy = 1 + Math.sin(t * 1.5) * 0.012 * motion;
        let tiltX = 0;
        let tiltZ = Math.sin(t * 0.9) * 0.02 * motion;
        let lag = 0;
        let glow = 0.04 * vigor;
        let converge = 0;
        let burn = 0;
        let regrow = 1;
        let tuck = 0;
        let crackle = 0.25 * vigor;
        let squintAll = 0;

        const off = HEADS.map(() => V3());
        const rot = HEADS.map(() => ({ yaw: 0, pitch: 0, roll: 0 }));
        const jawO = HEADS.map(() => 0);
        const squint = HEADS.map(() => 0);

        HEADS.forEach((h, i) => {
          const ph = i * 1.37;
          off[i].set(Math.sin(t * 0.9 + ph) * 0.07, Math.sin(t * 1.3 + ph * 1.7) * 0.06, Math.sin(t * 0.7 + ph * 0.6) * 0.04).multiplyScalar(motion);
          rot[i].roll = Math.sin(t * 0.8 + ph) * 0.06 * motion;
          if (h.key === "ext") {
            off[i].x += Math.sin(t * 3.1) * 0.03 * motion;
            rot[i].yaw += Math.sin(t * 2.3) * 0.12 * motion;
          }
          if (h.key === "coax") off[i].y += Math.sin(t * 0.5) * 0.04 * motion;
          if (glad) {
            const a = t * 2.2 + (i / 5) * TAU;
            off[i].x += Math.cos(a) * 0.09 * motion;
            off[i].y += Math.sin(a) * 0.07 * motion;
          }
        });

        if (dying) {
          sy -= 0.04;
          tiltZ = 0.06;
          squintAll = 0.5;
          crackle = 0.05;
          HEADS.forEach((h, i) => {
            off[i].y -= 0.35 + i * 0.03;
            off[i].z -= 0.05;
            rot[i].pitch += 0.45;
          });
        }
        if (jump) {
          const p = jump.p;
          if (p < 0.22) {
            sy = 1 - 0.14 * Math.sin((p / 0.22) * Math.PI * 0.5);
            lag = -0.5 * Math.sin((p / 0.22) * Math.PI * 0.5);
          } else if (p < 0.8) {
            const q = (p - 0.22) / 0.58;
            y = Math.sin(q * Math.PI) * 0.5;
            sy = 1 + 0.06 * Math.cos(q * Math.PI);
            lag = -Math.cos(q * Math.PI) * 0.6;
            HEADS.forEach((h, i) => (jawO[i] = q > 0.2 && q < 0.7 ? 0.35 : 0));
          } else {
            sy = 1 - 0.12 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
            lag = 0.5 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
          }
        }
        if (wob) {
          const p = wob.p;
          const damp = Math.pow(1 - p, 1.4);
          tiltZ += Math.sin(p * Math.PI * 6) * 0.08 * damp;
          HEADS.forEach((h, i) => {
            off[i].x += Math.sin(p * 40 + i * 2) * 0.09 * damp;
            off[i].y += Math.sin(p * 33 + i) * 0.05 * damp;
            rot[i].yaw += Math.sin(p * 36 + i * 1.3) * 0.35 * damp;
          });
          squintAll = p > 0.1 && p < 0.8 ? 0.7 : 0;
        }
        if (tangle) {
          const p = tangle.p;
          const k = Math.sin(Math.PI * clamp01(p / 0.92));
          const ip = HEADS.findIndex(h => h.key === "phone");
          const ineT = HEADS.findIndex(h => h.key === "net");
          const ia = HEADS[ip].H;
          const ib = HEADS[ineT].H;
          const sw = smooth(0.08, 0.45, p) * (1 - smooth(0.6, 0.95, p));
          const a = sw * Math.PI;
          const cx = (ia.x + ib.x) / 2;
          const half = (ib.x - ia.x) / 2;
          off[ip].x += cx - Math.cos(a) * half - ia.x;
          off[ip].z += Math.sin(a) * 0.38;
          off[ineT].x += cx + Math.cos(a) * half - ib.x;
          off[ineT].z -= Math.sin(a) * 0.3;
          off[ip].y += k * 0.1;
          off[ineT].y += k * 0.05;
          const bump = p > 0.42 && p < 0.62;
          squint[ip] = bump ? 0.8 : 0;
          squint[ineT] = bump ? 0.8 : 0;
          rot[ip].yaw += sw * 0.9;
          rot[ineT].yaw -= sw * 0.9;
          const im = HEADS.findIndex(h => h.key === "power");
          rot[im].pitch += k * 0.25;
          rot[im].yaw += Math.sin(p * 18) * 0.1 * k;
          tiltZ += Math.sin(p * Math.PI * 2) * 0.04;
        }
        if (curl) {
          const p = curl.p;
          tuck = smooth(0.05, 0.3, p) * (1 - smooth(0.75, 0.97, p));
          sy -= tuck * 0.08;
          squintAll = tuck > 0.5 ? 0.85 : squintAll;
          crackle = 0.25 + tuck * 2.5;
        }
        if (curto) {
          const p = curto.p;
          converge = smooth(0.04, 0.32, p) * (1 - smooth(0.56, 0.7, p));
          const flash = smooth(0.38, 0.48, p) * (1 - smooth(0.52, 0.7, p));
          glow = Math.max(glow, converge * 0.8 + flash * 3.5);
          crackle = 0.6 + converge * 3 + flash * 8;
          sy += -converge * 0.05 + flash * 0.05;
          tiltX = -converge * 0.08 + flash * 0.06;
          burn = smooth(0.58, 0.66, p) * (1 - smooth(0.9, 0.98, p));
          regrow = p < 0.7 ? 1 : p < 0.82 ? 1 - smooth(0.7, 0.78, p) : smooth(0.82, 0.95, p);
          HEADS.forEach((h, i) => (squint[i] = converge > 0.4 ? 0.45 + flash * 0.4 : 0));
          HEADS.forEach((h, i) => (jawO[i] = converge > 0.3 ? 0.45 + flash * 0.4 : 0));
        }
        if (atk) {
          tiltX += -atk.wind * 0.12 + atk.lunge * 0.1;
          z = atk.lunge * 0.3 - atk.wind * 0.08;
          sy += -atk.wind * 0.05 + atk.lunge * 0.03;
        }

        body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
        root.position.set(0, y, z);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        body.rotation.set(tiltX, 0, tiltZ);

        const F = V3(0, 2.45, 1.45);
        const ic = HEADS.findIndex(h => h.key === "coax");
        HEADS.forEach((h, i) => {
          const o = off[i];
          o.y += lag * (0.12 + (h.H.y - 1.6) * 0.1);
          if (atk) {
            const d = Math.max(0, Math.min(1, (action.p - i * 0.06) / 0.9));
            const a2 = strike(d);
            o.z += a2.lunge * 0.75 - a2.wind * 0.25;
            o.y += a2.wind * 0.12 - a2.lunge * 0.18;
            rot[i].pitch += -a2.wind * 0.3 + a2.lunge * 0.25;
            jawO[i] = Math.max(jawO[i], a2.lunge > 0.2 ? 0.8 * (1 - a2.impact * 0.5) : 0);
            squint[i] = a2.lunge > 0.3 ? 0.6 : squint[i];
          }
          const P = h.pos.copy(h.H).add(o);
          if (converge > 0) {
            const tgt = F.clone().addScaledVector(RING[h.key], 0.62);
            const need = tgt.sub(mouthPos(h, tmpV).sub(h.g.position));
            P.lerp(need, converge * 0.72);
            const dir = F.clone().sub(P);
            rot[i].yaw = lerp(rot[i].yaw, Math.atan2(dir.x, dir.z) - h.yaw, converge);
            rot[i].pitch = lerp(rot[i].pitch, Math.max(-0.5, Math.min(0.3, -Math.atan2(dir.y, Math.hypot(dir.x, dir.z)))) - h.pitch, converge);
          }
          if (tuck > 0) {
            const A = anchors[i].clone().addScaledVector(anchorN[i], 0.32);
            P.lerp(A, tuck * 0.85);
            rot[i].pitch -= tuck * 0.2;
          }
          if (i === ic && burn > 0) {
            P.y -= burn * 0.6;
            P.x -= burn * 0.15;
            rot[i].pitch += burn * 0.9;
            rot[i].roll += burn * 0.5;
          }
          const sc = h.s * (1 - tuck * 0.35) * (i === ic ? Math.max(0.001, regrow) : 1);
          h.g.position.copy(P);
          const lx = clamp01(1 - converge - tuck);
          h.g.rotation.set(h.pitch + rot[i].pitch - pointer.y * 0.12 * lx, h.yaw + rot[i].yaw + pointer.x * 0.22 * lx, rot[i].roll);
          h.g.scale.setScalar(sc);
          h.g.updateMatrix();
          h.jawHinge.rotation.x = lerp(h.jawHinge.rotation.x, jawO[i] * 0.55, 0.35);
          const sq = Math.max(squint[i], squintAll);
          h.eyes.forEach(({ g }) => {
            g.scale.y = Math.max(0.08, sq ? 1 - sq : blink);
          });
          h.lids.forEach(l => {
            l.rotation.x = lerp(-1.2, 0.35, Math.max(sq, h.lidRest, 1 - blink));
          });
          h.brows.forEach(({ b, sd }) => {
            b.rotation.z = sd * (b.userData.ang + sq * 0.2);
            b.position.y = b.userData.y0 - sq * 0.02;
          });
          if (h.ears) h.ears.forEach(({ g: e, sd }, k) => {
            if (e.userData.rz0 === undefined) e.userData.rz0 = e.rotation.z;
            e.rotation.z = e.userData.rz0 + sd * (Math.sin(t * 2.1 + k * 1.3) * 0.08 * motion - sq * 0.25);
          });
          if (h.tag) h.tag.rotation.z = Math.sin(t * 2.4) * 0.25 * motion + rot[i].roll * -1.2;
          if (h.leds) h.leds.forEach((l, k) => (l.material.emissiveIntensity = (Math.sin(t * (k ? 9 : 13)) > 0.2 ? 1.2 : 0.15) * vigor));
          const burnK = i === ic ? burn : 0;
          h.mats.forEach((m, k) => m.color.copy(h.base[k]).lerp(BURNT, burnK * 0.85));
        });

        necks.forEach((nk, i) => placeNeck(nk, i, i === ic ? burn : 0));
        {
          const ck = neckOf("coax").t;
          const show = 1 - smooth(0.05, 0.6, regrow);
          stump.visible = show > 0.02;
          if (stump.visible) {
            stump.position.copy(ck.S[ck.n]);
            stump.quaternion.setFromUnitVectors(UP, ck.T[ck.n]);
            stump.scale.setScalar(show * 1.4);
          }
        }

        tapes.forEach(tp => {
          const nk = neckOf(tp.key);
          const tube = nk.t || nk.spine;
          pointOn(tube, tp.u, tp.m.position);
          tangentOn(tube, tp.u, tmpV);
          tp.m.quaternion.setFromUnitVectors(V3(0, 0, 1), tmpV);
          const r = tp.key === "phone" ? 0.07 : nk.h.neckR * lerp(1.3, 0.92, tp.u) + 0.012;
          let k = 1;
          if (tp === newTape && curto) k = smooth(0.86, 0.95, curto.p) * (1 + 0.4 * Math.sin(Math.PI * clamp01((curto.p - 0.86) / 0.12)));
          if (tp.key === "coax" && curto && tp !== newTape) k = 1;
          tp.m.scale.set(r * k + 0.0001, r * k + 0.0001, (0.09 / 0.22) * 0.5 * Math.max(0.001, k));
          tp.m.visible = !(tp.key === "coax" && regrow < 0.05 && tp.u > 0.8);
        });

        {
          const ck = neckOf("coax").t;
          pointOn(ck, 0.52, tmpV);
          shoes.position.copy(tmpV);
          const sw = Math.sin(t * 1.7) * 0.18 * motion + lag * 0.4 + (wob ? Math.sin(wob.p * 30) * 0.3 * (1 - wob.p) : 0);
          shoePair.forEach(({ pv, lace, shoe, sd }, k) => {
            const len = 0.24 + k * 0.05;
            pv.position.set(sd * 0.03, 0, 0);
            pv.rotation.set(sw * (k ? 0.8 : 1) + 0.1, 0, sd * 0.18 + Math.sin(t * 1.3 + k) * 0.06 * motion);
            lace.scale.y = len;
            shoe.position.set(0, -len - 0.04, 0);
          });
        }

        {
          const base = V3(0, -0.5, 0).applyEuler(kite.rotation).add(kite.position);
          rabPts[0].copy(base);
          for (let i = 1; i < rabPts.length; i++) {
            const u = i / (rabPts.length - 1);
            rabPts[i].set(base.x + 0.1 + u * 0.15 + Math.sin(t * 2.2 - u * 4) * 0.08 * u * motion, base.y - u * 0.75, base.z - 0.05 - u * 0.25 + Math.cos(t * 1.8 - u * 3) * 0.07 * u * motion);
          }
          rabiola.fromPoints(rabPts, () => 0.006);
          bows.forEach((b, i) => {
            const u = (i + 1) / (bows.length + 1);
            pointOn(rabiola, u, b.position);
            b.rotation.set(Math.sin(t * 3 + i) * 0.4 * motion, t * 0.5 * motion + i, 0);
          });
          kite.rotation.x = -0.35 + Math.sin(t * 1.1) * 0.04 * motion + glad * Math.sin(t * 2) * 0.1;
        }

        {
          const tp = [];
          for (let i = 0; i < 6; i++) {
            const u = i / 5;
            const a = -0.4 + u * 2.6;
            const wag = Math.sin(t * 1.3 - u * 2.5) * 0.12 * u * motion;
            tp.push(V3(Math.sin(a) * (0.66 + u * 0.6) + wag, lerp(0.5, 0.06, Math.min(1, u * 1.6)), KC.z - Math.cos(a) * (0.66 + u * 0.45)));
          }
          tail.fromPoints(tp, u => 0.055 * (1 - u * 0.15));
          tailEnd.position.copy(tp[5]).add(V3(0, 0.0, 0));
          tangentOn(tail, 1, tmpV);
          tailEnd.rotation.set(0, Math.atan2(tmpV.x, tmpV.z) + Math.PI / 2, 0);
        }

        legs.forEach(({ g, sx, sz }, i) => {
          const step = wob ? Math.max(0, Math.sin(wob.p * Math.PI * 5 + i * 1.6)) * 0.05 : 0;
          g.position.y = step + (jump && jump.p > 0.22 && jump.p < 0.8 ? -0.03 : 0);
          g.scale.y = 1 - tuck * 0.15;
        });

        coreMat.emissiveIntensity = glow;
        knotLight.intensity = Math.min(1.2, Math.max(0, glow - 0.1) * 0.5);

        if (eat) {
          const p = eat.p;
          const order = ["ext", "net", "power"].map(k => HEADS.findIndex(h => h.key === k));
          const M = order.map(i => mouthPos(HEADS[i], V3()));
          food.visible = p < 0.6;
          food.rotation.z = p * 6;
          const arc = (a, b, q, hgt) => {
            food.position.copy(a).lerp(b, q);
            food.position.y += Math.sin(q * Math.PI) * hgt;
          };
          if (p < 0.24) {
            const q = p / 0.24;
            const top = M[0].clone().add(V3(0.1, 2.2, 0.3));
            food.position.copy(top).lerp(M[0], q * q);
          } else if (p < 0.4) arc(M[0], M[1], (p - 0.24) / 0.16, 0.45);
          else if (p < 0.56) arc(M[1], M[2], (p - 0.4) / 0.16, 0.4);
          else food.position.copy(M[2]);
          food.scale.setScalar(p > 0.56 ? 1 - smooth(0.56, 0.6, p) : 1);
          const open = (i, a, b) => {
            HEADS[i].jawHinge.rotation.x = Math.max(HEADS[i].jawHinge.rotation.x, smooth(a - 0.06, a, p) * (1 - smooth(b, b + 0.05, p)) * 0.6);
          };
          open(order[0], 0.2, 0.26);
          open(order[1], 0.36, 0.42);
          open(order[2], 0.52, 0.58);
          if (p > 0.58 && p < 0.88) HEADS[order[2]].jawHinge.rotation.x = Math.abs(Math.sin((p - 0.58) * 40)) * 0.3;
          if (p > 0.6) HEADS[order[2]].eyes.forEach(({ g }) => (g.scale.y = 0.25));
        } else food.visible = false;

        const ip = HEADS.findIndex(h => h.key === "power");
        mouthPos(HEADS[ip], muzzle.position);

        const rate = crackle * dt * 7;
        if (rnd() < rate) {
          const tip = stubTips[Math.floor(rnd() * stubTips.length)];
          spark(tip, V3((rnd() - 0.5) * 0.6, rnd() * 0.6, (rnd() - 0.5) * 0.6), 0.08 + rnd() * 0.08, 0.18 + rnd() * 0.15);
        }
        const ie = HEADS.findIndex(h => h.key === "ext");
        if (!dying && rnd() < dt * 0.9 * vigor) spark(mouthPos(HEADS[ie], V3()).add(V3(0, 0.05, 0.08)), V3((rnd() - 0.5) * 0.4, 0.4, 0.3), 0.07, 0.2);
        if (curto) {
          const p = curto.p;
          if (converge > 0.5) for (let k = 0; k < 2; k++) if (rnd() < 0.7) spark(F.clone().add(V3((rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.25)), V3((rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.2), 0.12 + rnd() * 0.1, 0.2);
          if (p > 0.44 && p < 0.56) for (let k = 0; k < 5; k++) spark(F.clone(), V3((rnd() - 0.5) * 6, (rnd() - 0.3) * 5, rnd() * 5), 0.15 + rnd() * 0.15, 0.35 + rnd() * 0.25);
          if (burn > 0.3 && rnd() < dt * 12) smoke(mouthPos(HEADS[ic], V3()).add(V3(0, 0.15, 0)));
        }
        if (dying && rnd() < dt * 1.2) smoke(stubTips[Math.floor(rnd() * stubTips.length)].clone());

        sparks.forEach(sp => {
          if (sp.life <= 0) {
            sp.s.visible = false;
            return;
          }
          sp.life -= dt;
          sp.s.position.addScaledVector(sp.v, dt);
          sp.v.y -= dt * 2;
          const k = clamp01(sp.life / sp.max);
          sp.s.material.opacity = k;
          sp.s.scale.setScalar(sp.size * (0.6 + k * 0.6));
          sp.s.material.rotation = sp.life * 20;
        });
        smokes.forEach(sm => {
          if (sm.life <= 0) {
            sm.s.visible = false;
            return;
          }
          sm.life -= dt;
          sm.s.position.addScaledVector(sm.v, dt);
          const k = clamp01(sm.life / sm.max);
          sm.s.material.opacity = Math.sin(Math.PI * k) * 0.55;
          sm.s.scale.setScalar(0.15 + (1 - k) * 0.35);
        });

        HEADS.forEach(h => followPupils(h.eyes, pointer, 0.5));
      }
    };
  }
});
