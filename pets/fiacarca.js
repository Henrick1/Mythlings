Pets.register({
  id: "fiacarca",
  dex: 39,
  name: "Fiaçarca",
  color: "#c8743a",
  types: ["electric", "dragon"],
  description: "Quando o emaranhado se desembaraça por completo, os fios se trançam numa serpente de cobre que vive do próprio arco elétrico. Entre os chifres de cada cabeça um raio sobe sem parar, e as três juntas fecham um triângulo de luz que zumbe como uma subestação.",
  actions: {
    jump: { duration: 1.1 },
    eat: { duration: 3.4 },
    arco: { duration: 2.7 },
    cross: { duration: 2.6 },
    curl: { duration: 2.2 },
    wobble: { duration: 1.8 },
    attack: { duration: 1.2 }
  },
  battle: { special: { action: "arco", hit: 0.5, speed: 1.3 } },
  idle: [
    { action: "cross", min: 22, max: 45 },
    { action: "wobble", min: 35, max: 70 },
    { action: "curl", min: 50, max: 100 }
  ],
  clickAction: n => ["cross", "jump", "arco", "curl"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, berry, strike } = kit;
    const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    const TAU = Math.PI * 2;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const hasDoc = typeof document !== "undefined";
    let seed = 11;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    const rubber = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.5 });
    const metal = (c, r = 0.3, cc = 0.6) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0.4, clearcoat: cc, clearcoatRoughness: 0.15 });
    const copperMat = metal(0xd27a40, 0.26, 1);
    const copperDark = metal(0x8a4422, 0.4);
    const steelMat = metal(0x9aa2ad, 0.3);
    const nickelMat = metal(0xdfe2e8, 0.2);
    const porcelain = new THREE.MeshPhysicalMaterial({ color: 0xf6f4ee, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.7 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xfff6e0, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.32, depthWrite: false });
    const arcMat = new THREE.MeshBasicMaterial({ color: 0xe4dcff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const arcGlowMat = new THREE.MeshBasicMaterial({ color: 0x7d5cff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });

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


    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const STR = [
      { mat: copperMat, r: 0.14 },
      { mat: rubber(0x1b1c21), r: 0.14 },
      { mat: rubber(0x2f6fd6), r: 0.14 }
    ];
    const NS = 420;
    const spine = flexTube(NS, 3, darkMat, false);
    const strands = STR.map(st => {
      const f = flexTube(NS, 10, st.mat);
      body.add(f.m);
      return f;
    });
    const spinePts = [];
    for (let i = 0; i < 15; i++) spinePts.push(V3());

    const insProfile = [
      [0.3, -0.08],
      [0.33, -0.082],
      [0.42, -0.045],
      [0.44, -0.02],
      [0.42, 0.0],
      [0.35, 0.016],
      [0.395, 0.036],
      [0.405, 0.054],
      [0.385, 0.07],
      [0.33, 0.09],
      [0.3, 0.094]
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const insGeo = new THREE.LatheGeometry(insProfile, 40);
    const insulators = [0.22, 0.5, 0.76, 0.88].map(u => {
      const m = mesh(insGeo, porcelain);
      body.add(m);
      return { u, m };
    });

    const tailCoil = new THREE.Group();
    body.add(tailCoil);
    {
      const pts = [];
      for (let i = 0; i <= 160; i++) {
        const u = i / 160;
        const a = u * 14 * TAU;
        const r = 0.075 + 0.01 * Math.sin(u * Math.PI);
        pts.push(V3(Math.cos(a) * r, u * 0.32, Math.sin(a) * r));
      }
      tailCoil.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.016, 6, false), copperMat));
      const core = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.36, 16), darkMat, false);
      core.position.y = 0.16;
      tailCoil.add(core);
      const cap = mesh(new THREE.SphereGeometry(0.06, 16, 10), nickelMat, false);
      cap.position.y = 0.35;
      tailCoil.add(cap);
    }

    let glowTex = null;
    if (hasDoc) {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const x = c.getContext("2d");
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 30);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.3, "rgba(200,180,255,0.7)");
      gr.addColorStop(1, "rgba(110,80,255,0)");
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      glowTex = new THREE.CanvasTexture(c);
    }
    const glowSprite = (color = 0xc9b8ff) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      body.add(s);
      return s;
    };

    const arcLine = (n = 9, glow = true) => {
      const cm = arcMat.clone();
      const hm = arcGlowMat.clone();
      const core = flexTube(n * 2, 4, cm, false);
      body.add(core.m);
      const halo = glow ? flexTube(n * 2, 5, hm, false) : null;
      if (halo) body.add(halo.m);
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(V3());
      return {
        core,
        halo,
        pts,
        set(a, b, jag, on, w = 1) {
          const vis = on > 0.02;
          core.m.visible = vis;
          if (halo) halo.m.visible = vis;
          if (!vis) return;
          const d = tmpA.subVectors(b, a);
          const len = d.length();
          const side = tmpB.set(-d.z, 0, d.x);
          if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
          side.normalize();
          const up = tmpC.crossVectors(d, side).normalize();
          for (let i = 0; i <= n; i++) {
            const u = i / n;
            const env = Math.sin(Math.PI * u);
            pts[i].copy(a).addScaledVector(d, u);
            if (i > 0 && i < n) pts[i].addScaledVector(side, (rnd() - 0.5) * jag * len * env).addScaledVector(up, (rnd() - 0.5) * jag * len * env);
          }
          core.fromPoints(pts, () => 0.008 * w);
          if (halo) halo.fromPoints(pts, () => 0.03 * w);
          cm.opacity = Math.min(1, on * 1.2);
          hm.opacity = Math.min(0.4, on * 0.4);
        }
      };
    };
    const tmpA = V3();
    const tmpB = V3();
    const tmpC = V3();

    const HEADS = [
      { key: "c", rest: V3(0, 2.9, 0.6), yaw: 0, pitch: 0.3, s: 1.95, strand: 1 },
      { key: "l", rest: V3(-1.12, 2.5, 0.5), yaw: -0.32, pitch: 0.3, s: 1.7, strand: 2 },
      { key: "r", rest: V3(1.12, 2.5, 0.5), yaw: 0.32, pitch: 0.3, s: 1.7, strand: 0 }
    ];
    const J_LOCAL = V3(0, -0.01, -0.37);
    const J_DIR = V3(0, -0.35, -1).normalize();
    const HORN_A = 0.34;
    const HORN_L = 0.5;
    const hornBase = sd => V3(sd * 0.055, 0.15, -0.075);
    const hornDir = sd => V3(sd * Math.sin(HORN_A), Math.cos(HORN_A), -0.18).normalize();

    const buildHead = h => {
      const g = new THREE.Group();
      g.rotation.order = "YXZ";
      body.add(g);
      const barrel = mesh(new THREE.CylinderGeometry(0.1, 0.108, 0.24, 28), copperMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, -0.01, -0.25);
      g.add(barrel);
      [-0.3, -0.21].forEach(z => {
        const cr = mesh(new THREE.TorusGeometry(0.104, 0.012, 8, 28), copperDark, false);
        cr.position.set(0, -0.01, z);
        g.add(cr);
      });
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
      const loft = (keys, nTop = 2.6, nBot = 4, NZ = 40, NU = 28) => {
        const z0 = keys[0][0];
        const z1 = keys[keys.length - 1][0];
        const pos = [];
        const idx = [];
        for (let j = 0; j <= NZ; j++) {
          const z = lerp(z0, z1, j / NZ);
          const [w, top, bot] = keyAt(keys, z);
          const mid = (top + bot) / 2;
          for (let i = 0; i < NU; i++) {
            const a = (i / NU) * TAU;
            const c = Math.cos(a);
            const sn = Math.sin(a);
            const ex = sn >= 0 ? 2 / nTop : 2 / nBot;
            const x = w * Math.sign(c) * Math.pow(Math.abs(c), ex);
            const y = mid + (sn >= 0 ? top - mid : mid - bot) * Math.sign(sn) * Math.pow(Math.abs(sn), ex);
            pos.push(x, y, z);
          }
        }
        for (let j = 0; j < NZ; j++)
          for (let i = 0; i < NU; i++) {
            const a = j * NU + i;
            const b = j * NU + ((i + 1) % NU);
            const c = a + NU;
            const d = b + NU;
            idx.push(a, b, c, b, d, c);
          }
        const capA = pos.length / 3;
        const ka = keyAt(keys, z0);
        pos.push(0, (ka[1] + ka[2]) / 2, z0);
        const capB = pos.length / 3;
        const kb = keyAt(keys, z1);
        pos.push(0, (kb[1] + kb[2]) / 2, z1);
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
      const SK = [
        [-0.35, 0.07, 0.06, -0.05],
        [-0.31, 0.14, 0.11, -0.085],
        [-0.17, 0.2, 0.162, -0.1],
        [-0.03, 0.19, 0.158, -0.088],
        [0.08, 0.15, 0.112, -0.074],
        [0.22, 0.122, 0.082, -0.066],
        [0.35, 0.098, 0.064, -0.07],
        [0.42, 0.078, 0.046, -0.078],
        [0.46, 0.036, 0.02, -0.072]
      ];
      const skAt = z => keyAt(SK, z);
      const skull = mesh(loft(SK, 2.5, 4.5, 48, 32), copperMat);
      g.add(skull);
      const palate = mesh(new THREE.SphereGeometry(1, 20, 10), new THREE.MeshStandardMaterial({ color: 0x2a1410, roughness: 0.7 }), false);
      palate.scale.set(0.12, 0.012, 0.26);
      palate.position.set(0, -0.074, 0.14);
      g.add(palate);
      const chisel = new THREE.MeshPhysicalMaterial({ color: 0x9a4c26, roughness: 0.35, metalness: 0.4, clearcoat: 0.6, flatShading: true });
      [-1, 1].forEach(sd => {
        const br = mesh(new THREE.SphereGeometry(1, 7, 5), chisel);
        br.scale.set(0.06, 0.03, 0.16);
        br.position.set(sd * 0.128, 0.158, -0.01);
        br.rotation.set(0.08, sd * 0.22, sd * 0.32);
        g.add(br);
        const bs = mesh(new THREE.ConeGeometry(0.026, 0.11, 6), chisel, false);
        bs.position.set(sd * 0.165, 0.17, -0.15);
        bs.rotation.set(-1.15, 0, -sd * 0.45);
        g.add(bs);
        const ck = mesh(new THREE.SphereGeometry(1, 7, 5), chisel, false);
        ck.scale.set(0.032, 0.03, 0.13);
        ck.position.set(sd * 0.188, -0.03, -0.11);
        ck.rotation.y = sd * 0.12;
        g.add(ck);
        const ckSpike = mesh(new THREE.ConeGeometry(0.018, 0.07, 5), chisel, false);
        ckSpike.position.set(sd * 0.2, -0.04, -0.24);
        ckSpike.rotation.set(-1.4, 0, -sd * 0.6);
        g.add(ckSpike);
        const nos = mesh(new THREE.SphereGeometry(1, 12, 8), darkMat, false);
        nos.scale.set(0.017, 0.008, 0.024);
        nos.position.set(sd * 0.034, skAt(0.39)[1] - 0.004, 0.39);
        nos.rotation.set(0.25, sd * 0.4, 0);
        g.add(nos);
        const rim = mesh(new THREE.TorusGeometry(0.019, 0.006, 6, 14), chisel, false);
        rim.scale.set(1, 1.3, 1);
        rim.position.copy(nos.position).add(V3(0, 0.004, 0));
        rim.rotation.set(Math.PI / 2 - 0.25, 0, sd * 0.4);
        g.add(rim);
      });
      [
        [0, -0.17, 0.15, 0.036, -0.8],
        [0, -0.27, 0.12, 0.03, -0.95],
        [0, -0.34, 0.08, 0.024, -1.1],
        [0.1, -0.24, 0.08, 0.022, -1.0],
        [-0.1, -0.24, 0.08, 0.022, -1.0],
        [0, 0.12, 0.035, 0.018, -0.35],
        [0, 0.21, 0.03, 0.016, -0.35]
      ].forEach(([x, z, hgt, r, tilt]) => {
        const sp = mesh(new THREE.ConeGeometry(r, hgt, 6), chisel, false);
        sp.position.set(x, skAt(z)[1] - Math.abs(x) * 0.25 + hgt * 0.25, z);
        sp.rotation.set(tilt, 0, -x * 3);
        g.add(sp);
      });
      [-1, 1].forEach(sd => {
        const rg = mesh(new THREE.SphereGeometry(1, 7, 5), chisel, false);
        rg.scale.set(0.016, 0.013, 0.17);
        const [w, top] = skAt(0.2);
        rg.position.set(sd * w * 0.62, top - 0.008, 0.2);
        rg.rotation.set(0.12, -sd * 0.13, 0);
        g.add(rg);
      });
      const toothGeo = new THREE.ConeGeometry(0.011, 0.036, 6);
      const fangGeo = new THREE.ConeGeometry(0.016, 0.075, 7);
      [0.03, 0.09, 0.15, 0.2, 0.25, 0.31, 0.37].forEach(z => {
        const [w, , bot] = skAt(z);
        const fang = Math.abs(z - 0.31) < 0.01;
        [-1, 1].forEach(sd => {
          const tt = mesh(fang ? fangGeo : toothGeo, steelMat, false);
          tt.position.set(sd * w * 0.93, bot - (fang ? 0.026 : 0.012), z);
          tt.rotation.set(Math.PI, 0, sd * 0.08);
          g.add(tt);
        });
      });
      [-0.022, 0.022].forEach(x => {
        const tt = mesh(toothGeo, steelMat, false);
        tt.position.set(x, skAt(0.43)[2] - 0.012, 0.43);
        tt.rotation.x = Math.PI - 0.25;
        g.add(tt);
      });
      const bulbs = [-1, 1].map(sd => {
        const bg = new THREE.Group();
        bg.position.set(sd * 0.158, 0.088, 0.03);
        bg.rotation.set(-0.12, sd * 0.62, 0);
        bg.scale.setScalar(1.05);
        const ring = mesh(new THREE.TorusGeometry(0.072, 0.014, 8, 24), new THREE.MeshPhysicalMaterial({ color: 0x5a2a14, roughness: 0.45, metalness: 0.4 }), false);
        ring.position.z = 0.0;
        bg.add(ring);
        g.add(bg);
        const sock = mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.05, 16), nickelMat, false);
        sock.rotation.x = Math.PI / 2;
        sock.position.z = -0.045;
        bg.add(sock);
        for (let i = 0; i < 3; i++) {
          const th = mesh(new THREE.TorusGeometry(0.043, 0.005, 6, 18), nickelMat, false);
          th.position.z = -0.06 + i * 0.014;
          bg.add(th);
        }
        const glass = mesh(new THREE.SphereGeometry(0.068, 24, 18), glassMat, false);
        glass.position.z = 0.03;
        glass.renderOrder = 2;
        bg.add(glass);
        const fm = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffa630, emissiveIntensity: 1.6, roughness: 0.4 });
        const fp = [];
        for (let i = 0; i <= 24; i++) {
          const u = i / 24;
          const a = u * 5 * TAU;
          fp.push(V3(Math.cos(a) * 0.012, (u - 0.5) * 0.06, 0.03 + Math.sin(a) * 0.012));
        }
        const fil = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fp), 60, 0.0045, 5, false), fm, false);
        fil.rotation.z = Math.PI / 2;
        fil.position.z = 0.0;
        bg.add(fil);
        const coreS = mesh(new THREE.SphereGeometry(0.026, 12, 10), fm, false);
        coreS.position.z = 0.03;
        bg.add(coreS);
        const shine = mesh(new THREE.SphereGeometry(0.013, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), false);
        shine.position.set(0.022, 0.03, 0.085);
        bg.add(shine);
        const lid = new THREE.Group();
        lid.position.z = 0.03;
        bg.add(lid);
        const lm = mesh(new THREE.SphereGeometry(0.074, 20, 10, 0, TAU, 0, Math.PI / 2), copperDark, false);
        lid.add(lm);
        lid.rotation.x = -1.3;
        return { bg, fm, lid };
      });
      const horns = [-1, 1].map(sd => {
        const hg = new THREE.Group();
        hg.position.copy(hornBase(sd));
        hg.quaternion.setFromUnitVectors(V3(0, 1, 0), hornDir(sd));
        g.add(hg);
        const disc = mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.03, 18), porcelain, false);
        disc.position.y = 0.01;
        hg.add(disc);
        const disc2 = mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.025, 18), porcelain, false);
        disc2.position.y = 0.04;
        hg.add(disc2);
        const rod = mesh(new THREE.CylinderGeometry(0.013, 0.017, HORN_L, 10), nickelMat, false);
        rod.position.y = HORN_L / 2 + 0.03;
        hg.add(rod);
        const tip = mesh(new THREE.SphereGeometry(0.022, 12, 8), nickelMat, false);
        tip.position.y = HORN_L + 0.03;
        hg.add(tip);
        return hg;
      });
      const HINGE = V3(0, -0.085, -0.17);
      const jawHinge = new THREE.Group();
      jawHinge.position.copy(HINGE);
      g.add(jawHinge);
      const JK = [
        [-0.23, 0.1, -0.06, -0.13],
        [-0.12, 0.138, -0.074, -0.158],
        [0.05, 0.12, -0.076, -0.14],
        [0.22, 0.092, -0.074, -0.122],
        [0.36, 0.07, -0.074, -0.106],
        [0.43, 0.048, -0.077, -0.099],
        [0.465, 0.02, -0.082, -0.093]
      ];
      const jaw = mesh(loft(JK, 4, 2.6, 40, 28), steelMat);
      jaw.position.copy(HINGE).negate();
      jawHinge.add(jaw);
      const tongue = mesh(new THREE.SphereGeometry(1, 18, 10), new THREE.MeshStandardMaterial({ color: 0x5a1c24, roughness: 0.6 }), false);
      tongue.scale.set(0.075, 0.014, 0.22);
      tongue.position.set(0, -0.075, 0.12).sub(HINGE);
      jawHinge.add(tongue);
      [0.06, 0.12, 0.18, 0.28, 0.34].forEach(z => {
        const [w, top] = keyAt(JK, z);
        const fang = Math.abs(z - 0.28) < 0.01;
        [-1, 1].forEach(sd => {
          const tt = mesh(fang ? fangGeo : toothGeo, steelMat, false);
          tt.position.set(sd * w * 0.78, top + (fang ? 0.024 : 0.01), z).sub(HINGE);
          tt.scale.setScalar(fang ? 0.8 : 0.9);
          jawHinge.add(tt);
        });
      });
      [-1, 1].forEach(sd => {
        const rv = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.026, 16), nickelMat, false);
        rv.rotation.z = Math.PI / 2;
        rv.position.set(sd * 0.155, HINGE.y, HINGE.z);
        g.add(rv);
        const cap = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 6), steelMat, false);
        cap.rotation.z = Math.PI / 2;
        cap.position.set(sd * 0.165, HINGE.y, HINGE.z);
        g.add(cap);
      });
      const hornArc = arcLine(8);
      const hornGlow = glowSprite();
      return Object.assign(h, { g, bulbs, horns, jawHinge, hornArc, hornGlow, ph: rnd(), pos: V3(), mouthAt: V3(0, -0.075, 0.38) });
    };
    HEADS.forEach(buildHead);

    const necks = HEADS.map(h => {
      const t = flexTube(40, 12, STR[h.strand].mat);
      body.add(t.m);
      return t;
    });

    const triArcs = [0, 1, 2].map(() => arcLine(12));
    const triGlow = [0, 1, 2].map(() => glowSprite());
    const netLines = [];
    for (let i = 0; i < 9; i++) netLines.push(arcLine(9));
    const netGlow = glowSprite(0xb8a4ff);
    const ball = glowSprite(0xffffff);

    const sparks = [];
    for (let i = 0; i < 24; i++) {
      const s = glowSprite(0xd8ccff);
      s.visible = false;
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
    body.add(food);
    const muzzle = new THREE.Group();
    body.add(muzzle);

    const UP = V3(0, 1, 0);
    const worldOf = (h, local, out) => out.copy(local).multiplyScalar(h.g.scale.x).applyQuaternion(h.g.quaternion).add(h.g.position);
    const hornPoint = (h, sd, k, out) => worldOf(h, hornBase(sd).addScaledVector(hornDir(sd), 0.03 + HORN_L * k), out);
    const pointOn = (tube, u, out) => {
      const f = u * tube.n;
      const i0 = Math.min(tube.n - 1, Math.floor(f));
      return out.copy(tube.S[i0]).lerp(tube.S[i0 + 1], f - i0);
    };
    let lastT = null;
    const hexPts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      hexPts.push(V3(Math.cos(a), Math.sin(a), 0));
    }
    const netSegs = [];
    for (let i = 0; i < 6; i++) netSegs.push([hexPts[i], hexPts[(i + 1) % 6]]);
    for (let i = 0; i < 3; i++) netSegs.push([hexPts[i], hexPts[i + 3]]);

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
        const arco = is("arco");
        const cross = is("cross");
        const curl = is("curl");
        const wob = is("wobble");
        const atk = is("attack") ? strike(action.p) : null;
        const vigor = dying ? 0.3 : 0.6 + 0.4 * clamp01(hunger / 100);
        const glad = joy >= 90 && !dying && !action ? 1 : 0;

        let y = 0;
        let sy = 1;
        let breath = Math.sin(t * 1.5) * motion;
        let topOff = V3(Math.sin(t * 0.8) * 0.05 * motion, Math.sin(t * 1.5) * 0.03 * motion, 0);
        let tuck = 0;
        let spread = 0;
        let charge = 0;
        let fire = 0;
        let netK = -1;
        let arcRate = 0.55;
        let arcMax = dying ? 0.45 : 1;
        let triOn = 0.4 * vigor;
        let coilK = 1;
        let lag = 0;

        const off = HEADS.map(() => V3());
        const rot = HEADS.map(() => ({ yaw: 0, pitch: 0, roll: 0 }));
        const jawO = HEADS.map(() => 0);
        const dim = HEADS.map(() => 1);

        HEADS.forEach((h, i) => {
          const ph = i * 2.1;
          off[i].set(Math.sin(t * 0.85 + ph) * 0.06, Math.sin(t * 1.2 + ph) * 0.05, Math.sin(t * 0.7 + ph) * 0.04).multiplyScalar(motion);
          rot[i].roll = Math.sin(t * 0.9 + ph) * 0.05 * motion;
        });
        if (glad) {
          HEADS.forEach((h, i) => {
            const a = t * 1.6 + (i / 3) * TAU;
            off[i].x += Math.cos(a) * 0.07 * motion;
            off[i].y += Math.sin(a) * 0.06 * motion;
          });
          triOn = Math.max(triOn, 0.35);
        }
        if (dying) {
          sy -= 0.05;
          topOff.y -= 0.35;
          HEADS.forEach((h, i) => {
            off[i].y -= 0.5;
            off[i].z -= 0.1;
            rot[i].pitch += 0.5;
            dim[i] = 0.25 + 0.5 * Math.abs(Math.sin(t * 7 + i * 3)) * (Math.sin(t * 2.3 + i) > 0.3 ? 1 : 0.2);
          });
          triOn = 0;
        }
        if (jump) {
          const p = jump.p;
          if (p < 0.24) {
            const q = Math.sin((p / 0.24) * Math.PI * 0.5);
            sy = 1 - 0.18 * q;
            coilK = 1 + 0.06 * q;
            lag = -0.4 * q;
          } else if (p < 0.8) {
            const q = (p - 0.24) / 0.56;
            y = Math.sin(q * Math.PI) * 0.5;
            sy = 1 + 0.1 * Math.cos(q * Math.PI);
            lag = -Math.cos(q * Math.PI) * 0.5;
            HEADS.forEach((h, i) => (jawO[i] = q > 0.25 && q < 0.7 ? 0.4 : 0));
          } else {
            const q = Math.sin(((p - 0.8) / 0.2) * Math.PI);
            sy = 1 - 0.12 * q;
            lag = 0.4 * q;
          }
        }
        if (wob) {
          const p = wob.p;
          const damp = Math.pow(1 - p, 1.4);
          topOff.x += Math.sin(p * Math.PI * 7) * 0.12 * damp;
          HEADS.forEach((h, i) => {
            off[i].x += Math.sin(p * 38 + i * 2) * 0.08 * damp;
            rot[i].yaw += Math.sin(p * 31 + i * 1.7) * 0.3 * damp;
            rot[i].roll += Math.sin(p * 27 + i) * 0.25 * damp;
          });
        }
        if (cross) {
          const p = cross.p;
          const k = smooth(0.05, 0.4, p) * (1 - smooth(0.6, 0.95, p));
          const a = k * Math.PI;
          const il = HEADS.findIndex(h => h.key === "l");
          const ir = HEADS.findIndex(h => h.key === "r");
          const R = HEADS[ir].rest.x;
          off[il].x += -Math.cos(a) * R - HEADS[il].rest.x;
          off[il].z += Math.sin(a) * 0.45;
          off[ir].x += Math.cos(a) * R - HEADS[ir].rest.x;
          off[ir].z -= Math.sin(a) * 0.35;
          off[il].y += Math.sin(a) * 0.08;
          rot[il].yaw += Math.sin(a) * 0.6;
          rot[ir].yaw -= Math.sin(a) * 0.6;
          const ic = HEADS.findIndex(h => h.key === "c");
          off[ic].y += Math.sin(Math.PI * p) * 0.12;
          rot[ic].pitch -= Math.sin(Math.PI * p) * 0.15;
          triOn = Math.max(triOn, 0.6 * Math.sin(Math.PI * p));
        }
        if (curl) {
          const p = curl.p;
          tuck = smooth(0.05, 0.32, p) * (1 - smooth(0.74, 0.97, p));
          coilK = 1 - tuck * 0.12;
          topOff.y -= tuck * 0.95;
          topOff.z -= tuck * 0.2;
          triOn *= 1 - tuck;
        }
        if (arco) {
          const p = arco.p;
          spread = smooth(0.04, 0.3, p) * (1 - smooth(0.62, 0.9, p));
          charge = smooth(0.18, 0.45, p) * (1 - smooth(0.48, 0.55, p));
          fire = smooth(0.46, 0.52, p) * (1 - smooth(0.58, 0.75, p));
          netK = p >= 0.3 && p < 0.9 ? p : -1;
          arcRate = 0.55 + spread * 2.5;
          triOn = Math.max(triOn, spread);
          topOff.y += spread * 0.15;
          topOff.z -= spread * 0.1 - fire * 0.25;
          sy += -charge * 0.04 + fire * 0.04;
          HEADS.forEach((h, i) => {
            const dir = h.key === "c" ? V3(0, 0.3, 0) : V3(Math.sign(h.rest.x) * 0.5, 0.18, 0);
            off[i].addScaledVector(dir, spread);
            off[i].z += fire * 0.25;
            rot[i].pitch -= spread * 0.12;
            rot[i].yaw -= Math.sign(h.rest.x) * spread * 0.2;
            jawO[i] = Math.max(jawO[i], spread * 0.5 + fire * 0.4);
          });
        }
        if (atk) {
          const ic = HEADS.findIndex(h => h.key === "c");
          off[ic].z += atk.lunge * 1.05 - atk.wind * 0.3;
          off[ic].y += atk.wind * 0.18 - atk.lunge * 0.42;
          rot[ic].pitch += -atk.wind * 0.35 + atk.lunge * 0.35;
          jawO[ic] = atk.lunge > 0.15 ? 0.9 * (1 - atk.impact) : 0;
          topOff.z += atk.lunge * 0.4 - atk.wind * 0.12;
          topOff.y += atk.wind * 0.1 - atk.lunge * 0.12;
          HEADS.forEach((h, i) => {
            if (i === ic) return;
            off[i].z += atk.lunge * 0.25;
            off[i].x -= Math.sign(h.rest.x) * atk.lunge * 0.12;
          });
        }

        body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
        root.position.set(0, y, 0);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;

        {
          const NC = 11;
          for (let i = 0; i < NC; i++) {
            const u = i / (NC - 1);
            const a = -Math.PI / 2 - (1 - u) * 1.02 * TAU;
            const r = lerp(1.18, 0.56, u) * coilK;
            spinePts[i].set(Math.cos(a) * r, 0.3, Math.sin(a) * r);
          }
          const top = V3(0, 1.82, 0.1).add(topOff);
          top.y += lag * 0.25;
          spinePts[11].set(0, 0.68 - tuck * 0.2, -0.66);
          spinePts[12].set(topOff.x * 0.3, lerp(1.18, 0.85, tuck), lerp(-0.48, -0.58, tuck) + topOff.z * 0.3);
          spinePts[13].set(topOff.x * 0.7, lerp(1.58, 0.95, tuck) + topOff.y * 0.4, -0.12 + topOff.z * 0.7);
          spinePts[14].copy(top);
        }
        spine.fromPoints(spinePts, () => 0.01);
        const sp = spine;
        const L = sp.n;
        strands.forEach((st, k) => {
          for (let i = 0; i <= L; i++) {
            const u = i / L;
            const tw = u * 96 + (k / 3) * TAU;
            const tail = smooth(0, 0.06, u);
            const rr = 0.152 * (0.45 + 0.55 * tail) * (1 + 0.05 * breath * Math.sin(u * 20 - t * 2));
            st.S[i].copy(sp.S[i]).addScaledVector(sp.N[i], Math.cos(tw) * rr).addScaledVector(sp.B[i], Math.sin(tw) * rr);
          }
          st.fromSamples(u => STR[k].r * (0.5 + 0.5 * smooth(0, 0.06, u)));
        });

        insulators.forEach(({ u, m }) => {
          pointOn(sp, u, m.position);
          const i0 = Math.min(L, Math.round(u * L));
          m.quaternion.setFromUnitVectors(UP, sp.T[i0]);
          m.scale.setScalar(1 + breath * 0.02);
        });
        tailCoil.position.copy(sp.S[0]);
        tailCoil.quaternion.setFromUnitVectors(UP, tmpA.copy(sp.T[0]).negate());
        const buzz = Math.sin(t * 90) * 0.012 * vigor;
        tailCoil.scale.set(1 + buzz, 1, 1 - buzz);
        if (!dying && rnd() < dt * 1.2 * vigor) spark(V3(0, 0.36, 0).applyQuaternion(tailCoil.quaternion).add(tailCoil.position), V3((rnd() - 0.5) * 0.4, 0.5, (rnd() - 0.5) * 0.4), 0.08, 0.22);

        HEADS.forEach((h, i) => {
          const P = h.pos.copy(h.rest).add(off[i]);
          P.y += lag * (0.15 + i * 0.03);
          if (tuck > 0) {
            const tgt = V3(h.rest.x * 0.32, 0.95, 0.32 + (h.key === "c" ? 0.05 : -0.05));
            P.lerp(tgt, tuck * 0.9);
          }
          h.g.position.copy(P);
          const lx = clamp01(1 - tuck - spread);
          h.g.rotation.set(h.pitch + rot[i].pitch - pointer.y * 0.12 * lx + tuck * 0.2, h.yaw + rot[i].yaw + pointer.x * 0.25 * lx, rot[i].roll);
          h.g.scale.setScalar(h.s * (1 - tuck * 0.25));
          h.g.updateMatrix();
          h.jawHinge.rotation.x = lerp(h.jawHinge.rotation.x, jawO[i] * 0.42, 0.35);
          const lit = Math.max(0.05, (blink < 1 ? 0.35 : 1) * dim[i] * vigor);
          h.bulbs.forEach(b => {
            b.fm.emissiveIntensity = 1.8 * lit + charge * 1.5;
            b.lid.rotation.x = lerp(b.lid.rotation.x, dying ? -0.4 : tuck > 0.4 ? 0.1 : atk && i === 0 && atk.lunge > 0.3 ? -0.55 : -1.3, 0.3);
          });
          const J = worldOf(h, J_LOCAL, V3());
          const d = J_DIR.clone().applyQuaternion(h.g.quaternion);
          const S0 = strands[h.strand].S[L];
          const S1 = strands[h.strand].S[L - 6];
          const out = tmpA.subVectors(S0, S1).normalize();
          const P1 = S0.clone().addScaledVector(out, 0.2).add(V3(h.rest.x * 0.12, 0.12, 0.05));
          const P3 = J.clone().addScaledVector(d, 0.26 * h.g.scale.x);
          const mid = P1.clone().lerp(P3, 0.5).add(V3(h.rest.x * 0.1, 0.05, 0));
          necks[i].fromPoints([S1, S0, P1, mid, P3, J], u => lerp(0.14, 0.11, u));

          const ph = (t * arcRate + h.ph) % 1;
          const hk = lerp(0.06, arcMax, ph);
          const fade = smooth(0, 0.08, ph) * (1 - smooth(0.88, 1, ph)) * (dying ? 0.6 : 1) * (1 - tuck);
          const a = hornPoint(h, -1, hk, V3());
          const b = hornPoint(h, 1, hk, V3());
          h.hornArc.set(a, b, 0.5, fade, 1 + charge);
          const mid2 = a.clone().lerp(b, 0.5);
          h.hornGlow.position.copy(mid2);
          h.hornGlow.material.opacity = fade * (0.55 + 0.4 * rnd()) * vigor;
          h.hornGlow.scale.setScalar(0.18 + hk * 0.16 + charge * 0.2);
          if (ph > 0.97 && !dying && rnd() < 0.5) spark(mid2, V3((rnd() - 0.5) * 0.6, 0.6, (rnd() - 0.5) * 0.6), 0.1, 0.2);
        });

        const tops = HEADS.map(h => hornPoint(h, h.key === "c" ? 1 : h.key === "l" ? 1 : -1, 1.02, V3()));
        triArcs.forEach((ar, k) => {
          const a = tops[k];
          const b = tops[(k + 1) % 3];
          const flick = rnd() < 0.85 ? 1 : 0.2;
          const on = triOn * flick;
          ar.set(a, b, 0.16, on, 0.6 + spread * 1.0);
          triGlow[k].position.copy(a).lerp(b, 0.5);
          triGlow[k].material.opacity = on * 0.5;
          triGlow[k].scale.setScalar(0.3 + spread * 0.4);
        });
        if (cross || glad) {
          const q = ((t * 0.6) % 1) * 3;
          const k = Math.floor(q);
          ball.position.copy(tops[k]).lerp(tops[(k + 1) % 3], q - k);
          ball.material.opacity = 0.9 * (cross ? Math.sin(Math.PI * cross.p) : 0.6);
          ball.scale.setScalar(0.25);
        } else ball.material.opacity = 0;

        const ctr = tops[0].clone().add(tops[1]).add(tops[2]).multiplyScalar(1 / 3);
        if (netK >= 0) {
          const p = netK;
          const form = smooth(0.3, 0.46, p);
          const fly = smooth(0.5, 0.88, p);
          const R = lerp(0.55, 1.5, fly) * form;
          const c = ctr.clone().add(V3(0, -0.15 * fly, lerp(0.15, 4.2, fly)));
          const op = form * (1 - smooth(0.75, 0.9, p));
          netSegs.forEach(([pa, pb], k) => {
            const a = c.clone().addScaledVector(pa, R);
            const b = c.clone().addScaledVector(pb, R);
            netLines[k].set(a, b, 0.18, op, 1.2);
          });
          netGlow.position.copy(c);
          netGlow.material.opacity = op * 0.8;
          netGlow.scale.setScalar(R * 2.2 + 0.2);
          if (p > 0.48 && p < 0.55) for (let k = 0; k < 3; k++) spark(c.clone(), V3((rnd() - 0.5) * 4, (rnd() - 0.5) * 4, rnd() * 3), 0.16, 0.35);
        } else {
          netLines.forEach(l => l.set(ctr, ctr, 0, 0));
          netGlow.material.opacity = 0;
        }

        if (eat) {
          const p = eat.p;
          const ir = HEADS.findIndex(h => h.key === "r");
          const h = HEADS[ir];
          const M = worldOf(h, h.mouthAt, V3());
          food.visible = p < 0.82;
          if (p < 0.24) {
            const q = p / 0.24;
            food.position.copy(M).add(V3(0.1, 2.2, 0.2)).lerp(M, q * q);
            h.jawHinge.rotation.x = smooth(0.1, 0.22, p) * 0.7;
          } else {
            food.position.copy(M).add(V3(0, 0.04, 0.05));
            const bite = smooth(0.24, 0.3, p);
            h.jawHinge.rotation.x = 0.7 * (1 - bite) + (p > 0.5 ? Math.abs(Math.sin((p - 0.5) * 36)) * 0.35 : 0.18 * bite);
          }
          food.scale.setScalar(p > 0.5 ? 1 - smooth(0.6, 0.82, p) * 0.95 : 1);
          const zap = p > 0.28 && p < 0.5;
          food.traverse(o => {
            if (o.isMesh && o.material && o.material.emissive) {
              o.material.emissive.setHex(0x8a70ff);
              o.material.emissiveIntensity = zap ? 0.5 + 0.5 * Math.abs(Math.sin(t * 50)) : 0;
            }
          });
          if (zap && rnd() < 0.6) spark(food.position.clone().add(V3((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3)), V3((rnd() - 0.5), rnd(), (rnd() - 0.5)), 0.1, 0.18);
        } else food.visible = false;

        const ic = HEADS.findIndex(h => h.key === "c");
        worldOf(HEADS[ic], HEADS[ic].mouthAt, muzzle.position);

        sparks.forEach(sk => {
          if (sk.life <= 0) {
            sk.s.visible = false;
            return;
          }
          sk.life -= dt;
          sk.s.position.addScaledVector(sk.v, dt);
          sk.v.y -= dt * 1.5;
          const k = clamp01(sk.life / sk.max);
          sk.s.material.opacity = k;
          sk.s.scale.setScalar(sk.size * (0.5 + k * 0.7));
        });
      }
    };
  }
});
