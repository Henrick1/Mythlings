(function (root) {
  function create(opts) {
    const { canvas, THREE, kit, Pets } = opts;
    const fx = opts.fx;
    const { lerp } = kit;
    const reduce = !!opts.reduceMotion;
    const motion = reduce ? 0.3 : 1;
    const TAU = Math.PI * 2;
    const rand = (a, b) => a + Math.random() * (b - a);
    const noop = () => {};
    let audible = false;
    const sfx = (name, x) => audible && root.Sfx && root.Sfx.play(name, x);
    const onTap = opts.onTap || noop;
    const onKick = opts.onKick || noop;
    const onEmpty = opts.onEmpty || noop;
    const insets = opts.insets || (() => ({ top: 58, bottom: 140 }));
    const stageOf = opts.stageOf || (() => 1);
    const STAGE_SIZE = [1, 1.4, 1.85];

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const maxPR = Math.min(window.devicePixelRatio || 1, opts.wide ? 1.5 : 2);
    let pr = maxPR;
    renderer.setPixelRatio(pr);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xcfeaf2, 16, 42);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 220);
    const CAM_TARGET = new THREE.Vector3(0, 0.2, 0.15);
    const CAM_DIR = new THREE.Vector3(0, 0.7, 0.71).normalize();

    const hemi = new THREE.HemisphereLight(0xe8f0ff, 0x4a6a3a, 0.55);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d8, 0.85);
    sun.position.set(5, 10, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -7.5, right: 7.5, top: 7.5, bottom: -7.5, near: 1, far: 34 });
    sun.shadow.bias = -0.0008;
    scene.add(sun);

    const wide = !!opts.wide;
    const RX = wide ? 6.4 : 3.15;
    const RZ = wide ? 4.5 : 5.6;
    const KX = RX / 3.15;
    const KZ = RZ / 5.6;
    const SE = 3.2;
    const seR = a => Math.pow(Math.pow(Math.abs(Math.cos(a)), SE) + Math.pow(Math.abs(Math.sin(a)), SE), -1 / SE);
    const islandF = (x, z, m = 0) => Math.pow(Math.abs(x / (RX - m)), SE) + Math.pow(Math.abs(z / (RZ - m)), SE);
    const inIsland = (x, z, m = 0) => islandF(x, z, m) < 1;
    const POND = { x: 1.4 * KX, z: -2.05 * KZ, rx: 1.15, rz: 0.88 };
    const inPond = (x, z, m = 0) => ((x - POND.x) / (POND.rx + m)) ** 2 + ((z - POND.z) / (POND.rz + m)) ** 2 < 1;
    const PM = 0.38;
    const pondOut = (x, z, m) => {
      const dx = x - POND.x;
      const dz = z - POND.z;
      const d = Math.hypot(dx / (POND.rx + m), dz / (POND.rz + m)) || 1;
      return [POND.x + dx / d, POND.z + dz / d];
    };
    const obstacles = [];
    let shipG = null;
    let skyMat = null;
    const clouds = [];

    const mat = (c, r = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
    const add = (m, shadow = true, recv = true) => {
      m.castShadow = shadow;
      m.receiveShadow = recv;
      scene.add(m);
      return m;
    };
    const noise2 = (x, z) => Math.sin(x * 1.7 + z * 0.6) * 0.5 + Math.sin(x * 0.5 - z * 1.9) * 0.5 + Math.sin((x + z) * 3.1) * 0.25;

    const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
    {
      const g = new THREE.PlaneGeometry(2 * RX + 4, 2 * RZ + 4, 160, 200);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      const col = new Float32Array(p.count * 3);
      const inA = new THREE.Color(0x6fb552);
      const inB = new THREE.Color(0x58a043);
      const inC = new THREE.Color(0x84c25e);
      const outA = new THREE.Color(0x4f9440);
      const outB = new THREE.Color(0x3f7f37);
      const path = new THREE.Color(0xc9b07a);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        const f = islandF(x, z);
        const n = noise2(x, z);
        const inside = inA.clone().lerp(inB, Math.max(0, n) * 0.7).lerp(inC, Math.max(0, -n) * 0.4);
        const outside = outA.clone().lerp(outB, Math.max(0, n) * 0.8);
        const k = Math.min(1, Math.max(0, (f - 0.92) / 0.25));
        const c = inside.lerp(outside, k);
        const rim = Math.max(0, 1 - Math.abs(f - 1.06) / 0.05);
        c.lerp(path, rim * 0.55);
        col.set([c.r, c.g, c.b], i * 3);
        p.setY(i, f > 1.17 ? -0.4 : 0);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const idx = g.index.array;
      const keep = [];
      for (let i = 0; i < idx.length; i += 3) {
        if (p.getY(idx[i]) < 0 && p.getY(idx[i + 1]) < 0 && p.getY(idx[i + 2]) < 0) continue;
        keep.push(idx[i], idx[i + 1], idx[i + 2]);
      }
      g.setIndex(keep);
      g.computeVertexNormals();
      const ground = new THREE.Mesh(g, groundMat);
      ground.receiveShadow = true;
      scene.add(ground);
    }
    {
      const tuft = new THREE.ConeGeometry(0.035, 0.16, 4);
      const tm = mat(0x5aa646, 0.9, { flatShading: true });
      const tm2 = mat(0x447f36, 0.9, { flatShading: true });
      const N = Math.round(520 * KX * KZ);
      const N2 = 0;
      const inst = new THREE.InstancedMesh(tuft, tm, N);
      const inst2 = new THREE.InstancedMesh(tuft, tm2, N2);
      const o = new THREE.Object3D();
      let n = 0;
      while (n < N) {
        const x = rand(-RX, RX);
        const z = rand(-RZ, RZ);
        if (!inIsland(x, z, 0.1) || inPond(x, z, 0.12)) continue;
        o.position.set(x, 0.06, z);
        o.rotation.set(rand(-0.3, 0.3), rand(0, TAU), rand(-0.3, 0.3));
        o.scale.setScalar(rand(0.6, 1.3));
        o.updateMatrix();
        inst.setMatrixAt(n++, o.matrix);
      }
      n = 0;
      while (n < N2) {
        const x = rand(-RX - 5, RX + 5);
        const z = rand(-RZ - 6, RZ + 4);
        if (islandF(x, z) < 1.12) continue;
        o.position.set(x, 0.08, z);
        o.rotation.set(rand(-0.3, 0.3), rand(0, TAU), rand(-0.3, 0.3));
        o.scale.set(rand(1, 1.6), rand(1.2, 2.4), rand(1, 1.6));
        o.updateMatrix();
        inst2.setMatrixAt(n++, o.matrix);
      }
      inst.receiveShadow = true;
      inst2.receiveShadow = true;
      scene.add(inst, inst2);
    }

    const pondUniform = { t: { value: 0 } };
    {
      const g = new THREE.RingGeometry(0.0001, 1, 64, 6);
      g.rotateX(-Math.PI / 2);
      const water = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x5cc6d9, roughness: 0.12, metalness: 0.1, emissive: 0x1a6a8a, emissiveIntensity: 0.15 }));
      water.scale.set(POND.rx, 1, POND.rz);
      water.position.set(POND.x, 0.012, POND.z);
      water.receiveShadow = true;
      scene.add(water);
      const deep = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x2f8fb3, transparent: true, opacity: 0.35 }));
      deep.scale.set(POND.rx * 0.6, 1, POND.rz * 0.55);
      deep.position.set(POND.x + 0.05, 0.016, POND.z - 0.05);
      scene.add(deep);
      const stoneG = new THREE.DodecahedronGeometry(0.13, 0);
      const stoneM = mat(0xb9b2a4, 0.9, { flatShading: true });
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * TAU + rand(-0.05, 0.05);
        const s = add(new THREE.Mesh(stoneG, stoneM));
        s.position.set(POND.x + Math.cos(a) * (POND.rx + 0.05), 0.02, POND.z + Math.sin(a) * (POND.rz + 0.05));
        s.scale.set(rand(0.8, 1.3), rand(0.45, 0.7), rand(0.8, 1.2));
        s.rotation.y = rand(0, TAU);
      }
      const padM = mat(0x5aa646, 0.6, { side: THREE.DoubleSide });
      [
        [0.72, -2.27, 0.2, 0.4],
        [1.89, -1.62, 0.17, 2.4],
        [1.62, -2.6, 0.14, 4.4]
      ].forEach(([px, pz, r, rot], i) => {
        const x = POND.x + px - 1.4;
        const z = POND.z + pz + 2.05;
        const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 24, 0.3, TAU - 0.6), padM);
        pad.rotation.set(-Math.PI / 2, 0, rot);
        pad.position.set(x, 0.022, z);
        scene.add(pad);
        if (i === 1) {
          const bud = add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), mat(0xf07aa6, 0.5)));
          bud.scale.set(0.8, 1.6, 0.8);
          bud.position.set(x + 0.03, 0.1, z);
        }
      });
      obstacles.push({ pond: true });
    }

    const canopyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
    const lumps = (x, y, z, sd) => Math.sin(x * 7.1 + sd) * Math.sin(y * 6.3 + sd * 1.7) * Math.sin(z * 5.9 - sd) * 0.6 + Math.sin(x * 13.7 - y * 11.1 + z * 9.3 + sd * 2.3) * 0.3;
    const canopyGeos = [0, 1, 2].map(k => {
      const g = new THREE.SphereGeometry(1, 12, 8);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const A = new THREE.Color(0x1d4a22);
      const B = new THREE.Color(0x347a34);
      const C = new THREE.Color(0x5a9c44);
      const tc = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const pz = pos.getZ(i);
        const n = lumps(px * 1.3, py * 1.3, pz * 1.3, k * 1.7 + 0.4);
        const kk = 0.84 + n * 0.1;
        pos.setXYZ(i, px * kk, py * kk * 0.86, pz * kk);
        const f = Math.max(0, Math.min(1, 0.4 + py * 0.45 + n * 0.6));
        if (f < 0.5) tc.copy(A).lerp(B, f * 2);
        else tc.copy(B).lerp(C, (f - 0.5) * 2);
        col.set([tc.r, tc.g, tc.b], i * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    });
    const leafGeo = (() => {
      const len = 0.24;
      const wid = 0.09;
      const N = 6;
      const left = [];
      for (let i = 1; i < N; i++) {
        const f = i / N;
        left.push([-wid * Math.pow(Math.sin(Math.PI * f), 0.75) * (0.78 + 0.22 * Math.abs(Math.cos(f * Math.PI * 3))), f * len]);
      }
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      left.forEach(([px, py]) => shape.lineTo(px, py));
      shape.lineTo(0, len);
      for (let i = left.length - 1; i >= 0; i--) shape.lineTo(-left[i][0], left[i][1]);
      const g = new THREE.ShapeGeometry(shape, 1);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const A = new THREE.Color(0x2f7a36);
      const B = new THREE.Color(0x7cc85a);
      const M = new THREE.Color(0xb8e690);
      const tc = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const f = pos.getY(i) / len;
        pos.setZ(i, -Math.abs(px) * 0.35 * (1 - f * 0.5) + f * f * 0.3 * len);
        const rib = Math.max(0, 1 - Math.abs(px) / (wid * 0.1));
        tc.copy(A).lerp(B, Math.min(1, f * 0.8 + (Math.abs(px) / wid) * 0.3)).lerp(M, rib * 0.6);
        col.set([tc.r, tc.g, tc.b], i * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.translate(0, -0.03, 0);
      g.computeVertexNormals();
      return g;
    })();
    const leafSlots = [];
    const foliage = (g, clumps, density, seed, ls = 1) => {
      const local = [];
      clumps.forEach(([px, py, pz, r], k) => {
        const m = new THREE.Mesh(canopyGeos[(k + seed) % 3], canopyMat);
        m.position.set(px, py, pz);
        m.scale.setScalar(r);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
        const cnt = Math.round(density * (r / 0.5) * (r / 0.5));
        for (let i = 0; i < cnt; i++) {
          const yy = 1 - (2 * (i + 0.5)) / cnt;
          if (yy < -0.55) continue;
          const rad = Math.sqrt(1 - yy * yy);
          const th = i * 2.39996 + k + seed;
          const dir = new THREE.Vector3(Math.cos(th) * rad, yy, Math.sin(th) * rad);
          const d = r * rand(0.8, 0.95);
          local.push({ p: new THREE.Vector3(px + dir.x * d, py + dir.y * d * 0.86, pz + dir.z * d), dir, yy });
        }
      });
      return () => {
        g.updateMatrixWorld(true);
        const sc = g.scale.x;
        const q = new THREE.Quaternion();
        g.getWorldQuaternion(q);
        local.forEach(l => leafSlots.push({ p: l.p.clone().applyMatrix4(g.matrixWorld), dir: l.dir.clone().applyQuaternion(q), s: sc * ls, yy: l.yy }));
      };
    };
    const leafy = (x, z) => Math.abs(x) < RX + (wide ? 3.6 : 2.6) && z > -RZ - (wide ? 2.4 : 3.2);

    const tree = (x, z, s, solid = true) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 1.1, 10), mat(0x7a5236, 0.9));
      trunk.position.y = 0.55;
      trunk.castShadow = true;
      g.add(trunk);
      const done = foliage(
        g,
        [
          [0, 1.45, 0, 0.62],
          [-0.38, 1.22, 0.1, 0.45],
          [0.36, 1.25, -0.08, 0.48],
          [0.05, 1.85, -0.05, 0.42],
          [0.1, 1.2, 0.36, 0.38]
        ],
        leafy(x, z) ? 64 : 0,
        Math.floor(rand(0, 3)),
        0.8
      );
      g.position.set(x, 0, z);
      g.scale.setScalar(s);
      g.rotation.y = rand(0, TAU);
      scene.add(g);
      done();
      if (solid) obstacles.push({ x, z, r: 0.45 * s });
      return g;
    };

    const bush = (x, z, s, solid = true, berries = true) => {
      const g = new THREE.Group();
      const done = foliage(
        g,
        [
          [0, 0.22, 0, 0.3],
          [0.26, 0.17, 0.05, 0.22],
          [-0.24, 0.16, 0.06, 0.22]
        ],
        leafy(x, z) ? 46 : 0,
        Math.floor(rand(0, 3)),
        0.5
      );
      for (let i = 0; i < (berries ? 7 : 0); i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat(0xe8465a, 0.4));
        const a = rand(0, TAU);
        b.position.set(Math.cos(a) * rand(0.15, 0.36), rand(0.18, 0.4), Math.sin(a) * 0.12 + 0.2);
        g.add(b);
      }
      g.position.set(x, 0, z);
      g.scale.setScalar(s);
      scene.add(g);
      done();
      if (solid) obstacles.push({ x, z, r: 0.42 * s });
    };

    const rock = (x, z, s, moss) => {
      const m = add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), mat(0xa39c8d, 0.95, { flatShading: true })));
      m.position.set(x, 0.12 * s, z);
      m.scale.set(s * 1.2, s * 0.75, s);
      m.rotation.y = rand(0, TAU);
      if (moss) {
        const mm = add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, TAU, 0, 1.1), mat(0x6bb352, 0.9)));
        mm.position.set(x, 0.18 * s, z);
        mm.scale.set(s * 1.1, s * 0.6, s * 0.9);
      }
      obstacles.push({ x, z, r: 0.32 * s });
    };
    rock(-2.27 * KX, -0.82 * KZ, 1.1, true);
    rock(2.56 * KX, -0.35 * KZ, 0.75, false);
    rock(0.68 * KX, 4.44 * KZ, 0.6, false);

    [
      [2.35, -4.55],
      [2.6, -4.25]
    ].forEach(([mx, mz], i) => {
      const x = mx * KX;
      const z = mz * KZ;
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.16 - i * 0.04, 8), mat(0xf6ecd8, 0.7));
      stem.position.y = 0.08;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12 - i * 0.03, 16, 10, 0, TAU, 0, Math.PI / 2), mat(0xe24a3b, 0.5));
      cap.position.y = 0.15 - i * 0.04;
      cap.castShadow = true;
      g.add(stem, cap);
      for (let k = 0; k < 4; k++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat(0xffffff, 0.6));
        const a = (k / 4) * TAU + i;
        d.position.set(Math.cos(a) * 0.07, 0.2 - i * 0.05, Math.sin(a) * 0.07);
        g.add(d);
      }
      g.position.set(x, 0, z);
      scene.add(g);
    });

    {
      const colors = [0xffd84a, 0xffffff, 0xff8fb8, 0xb59cff];
      let n = 0;
      while (n < Math.round(40 * KX * KZ)) {
        const x = rand(-RX, RX);
        const z = rand(-RZ, RZ);
        if (!inIsland(x, z, 0.25) || inPond(x, z, 0.25) || Math.hypot(x, z - 0.6) < 1.1) continue;
        const g = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 5), mat(0x4f9a44));
        stem.position.y = 0.07;
        g.add(stem);
        const pm = mat(colors[n % colors.length], 0.6);
        for (let k = 0; k < 5; k++) {
          const pt = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), pm);
          const a = (k / 5) * TAU;
          pt.position.set(Math.cos(a) * 0.04, 0.15, Math.sin(a) * 0.04);
          pt.scale.set(1, 0.4, 1);
          g.add(pt);
        }
        const ctr = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(0xffb52e, 0.5));
        ctr.position.y = 0.16;
        g.add(ctr);
        g.position.set(x, 0, z);
        scene.add(g);
        n++;
      }
    }

    const bowlBerries = [];
    {
      const BOWL = { x: -1.65 * KX, z: 3.3 * KZ };
      const pts = [
        [0.001, 0],
        [0.32, 0],
        [0.42, 0.06],
        [0.46, 0.2],
        [0.42, 0.22],
        [0.38, 0.1],
        [0.001, 0.08]
      ].map(p => new THREE.Vector2(p[0], p[1]));
      const bowl = add(new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat(0xa4703f, 0.8)));
      bowl.position.set(BOWL.x, 0, BOWL.z);
      const band = add(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.02, 6, 32), mat(0x6b4426, 0.8)));
      band.rotation.x = Math.PI / 2;
      band.position.set(BOWL.x, 0.13, BOWL.z);
      for (let i = 0; i < 6; i++) {
        const b = kit.berry();
        bowlBerries.push(b);
        b.scale.setScalar(0.65);
        const a = (i / 6) * TAU;
        b.position.set(BOWL.x + Math.cos(a) * 0.17, 0.18 + (i % 2) * 0.05, BOWL.z + Math.sin(a) * 0.17);
        b.rotation.set(rand(-0.4, 0.4), a, rand(-0.4, 0.4));
        scene.add(b);
      }
      obstacles.push({ x: BOWL.x, z: BOWL.z, r: 0.55 });
    }

    {
      const postM = mat(0x9a6a42, 0.85);
      const ropeM = mat(0xd9c39a, 0.9);
      const ring = [];
      const N = 400;
      let acc = 0;
      let prev = null;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        const p = new THREE.Vector3(Math.cos(a) * seR(a) * (RX + 0.18), 0, Math.sin(a) * seR(a) * (RZ + 0.18));
        if (prev) acc += p.distanceTo(prev);
        prev = p;
        ring.push({ p, acc, a });
      }
      const posts = [];
      let next = 0;
      ring.forEach(r => {
        if (r.acc >= next) {
          next += 0.95;
          const gate = r.p.z > RZ * 0.8 && Math.abs(r.p.x) < 0.75;
          posts.push({ p: r.p.clone(), gate });
        }
      });
      posts.forEach(({ p, gate }) => {
        if (gate) return;
        const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.46, 8), postM));
        m.position.set(p.x, 0.23, p.z);
        const cap = add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.08, 8), postM));
        cap.position.set(p.x, 0.5, p.z);
      });
      for (let i = 0; i < posts.length; i++) {
        const A = posts[i];
        const B = posts[(i + 1) % posts.length];
        if (A.gate || B.gate) continue;
        [0.38, 0.2].forEach(h => {
          const mid = A.p.clone().add(B.p).multiplyScalar(0.5);
          mid.y = h - 0.07;
          const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(A.p.x, h, A.p.z), mid, new THREE.Vector3(B.p.x, h, B.p.z));
          scene.add(new THREE.Mesh(new THREE.TubeGeometry(c, 8, 0.012, 5), ropeM));
        });
      }
      const gp = [-0.8, 0.8].map(x => {
        const z = RZ * Math.pow(1 - Math.pow(Math.abs(x / (RX + 0.18)), SE), 1 / SE) + 0.18;
        const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.7, 8), postM));
        m.position.set(x, 0.35, z);
        return m.position;
      });
      gp.forEach(g => {
        let best = null;
        let bd = 1e9;
        posts.forEach(({ p, gate }) => {
          if (gate) return;
          const d = p.distanceTo(new THREE.Vector3(g.x, 0, g.z));
          if (d < bd) {
            bd = d;
            best = p;
          }
        });
        if (!best) return;
        [0.38, 0.2].forEach(h => {
          const mid = best.clone().add(new THREE.Vector3(g.x, 0, g.z)).multiplyScalar(0.5);
          mid.y = h - 0.06;
          const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(best.x, h, best.z), mid, new THREE.Vector3(g.x, h, g.z));
          scene.add(new THREE.Mesh(new THREE.TubeGeometry(c, 8, 0.012, 5), ropeM));
        });
      });
      const arch = new THREE.QuadraticBezierCurve3(new THREE.Vector3(gp[0].x, 0.68, gp[0].z), new THREE.Vector3(0, 0.95, gp[0].z), new THREE.Vector3(gp[1].x, 0.68, gp[1].z));
      add(new THREE.Mesh(new THREE.TubeGeometry(arch, 16, 0.045, 6), postM));

      const curbS = Math.pow(1.13, 1 / SE);
      const curbPts = [];
      for (let i = 0; i < 160; i++) {
        const a = (i / 160) * TAU;
        curbPts.push(new THREE.Vector3(Math.cos(a) * seR(a) * RX * curbS, 0.035, Math.sin(a) * seR(a) * RZ * curbS));
      }
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curbPts, true), 320, 0.075, 8, true), mat(0x7a5236, 0.8)), false, true);
      if (root.Ship) {
        const lgx = (wide ? RZ : RX) * curbS + 0.1;
        const lgz = (wide ? RX : RZ) * curbS + 0.1;
        shipG = root.Ship.build(THREE, { gx: lgx, gz: lgz, deckY: -0.006, depth: 3.4 });
        if (wide) shipG.rotation.y = Math.PI / 2;
        shipG.traverse(m => {
          if (m.isMesh) m.receiveShadow = true;
        });
        scene.add(shipG);
        [[-1, -0.3], [1, -0.36]].forEach(([sg, fz]) => {
          const lx = sg * (lgx + 0.55);
          const lz = lgz * fz;
          const x = wide ? lz : lx;
          const z = wide ? -lx : lz;
          const pot = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.34, 10), mat(0x8a5a36, 0.8)));
          pot.position.set(x, 0.17, z);
          const soil = add(new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), mat(0x5a3a26, 0.95)), false);
          soil.rotation.x = -Math.PI / 2;
          soil.position.set(x, 0.33, z);
          const tr = tree(x, z, 0.85, false);
          tr.position.y = 0.3;
        });
      }
      const skyGeo = new THREE.SphereGeometry(80, 32, 16);
      {
        const p = skyGeo.attributes.position;
        const col = new Float32Array(p.count * 3);
        const top = new THREE.Color(0x5fb8ec);
        const hor = new THREE.Color(0xd9f1fb);
        const low = new THREE.Color(0xa9d8f2);
        const tc = new THREE.Color();
        for (let i = 0; i < p.count; i++) {
          const y = p.getY(i) / 80;
          if (y > 0) tc.copy(hor).lerp(top, Math.pow(y, 0.6));
          else tc.copy(hor).lerp(low, Math.min(1, -y * 2.5));
          col.set([tc.r, tc.g, tc.b], i * 3);
        }
        skyGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      }
      skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
      const sky = new THREE.Mesh(skyGeo, skyMat);
      sky.renderOrder = -10;
      scene.add(sky);
      const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2a3550, roughness: 1, transparent: true, opacity: 0.92 });
      const CX = wide ? 44 : 26;
      const NL = wide ? 34 : 18;
      for (let i = 0; i < NL + 10; i++) {
        const c = new THREE.Group();
        const n = 3 + (i % 4);
        const low = i < NL;
        const big = low ? rand(1.6, 2.8) : rand(0.6, 1.0);
        for (let k = 0; k < n; k++) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(rand(0.7, 1.1) * big, 14, 10), cloudM);
          m.position.set(rand(-1.4, 1.4) * big, rand(-0.1, 0.3) * big, rand(-0.7, 0.7) * big);
          m.scale.y = 0.55;
          c.add(m);
        }
        const side = i % 2 ? -1 : 1;
        const lx = (i % 2 ? -1 : 1) * (Math.abs(rand(-1, 1)) * (CX - RX - 2) + RX + 2);
        if (wide) c.position.set(rand(-48, 48), low ? rand(-12, -4) : rand(-2.4, 0.6), low ? (i % 3 ? rand(-46, -9) : rand(9, 22)) : side > 0 ? -rand(9, 16) : rand(10, 15));
        else c.position.set(low ? (i % 3 ? lx : rand(-CX, CX)) : side * rand(RX + 3.4, RX + 8), low ? rand(-12, -4) : rand(-2.6, 0.2), rand(-46, 18));
        c.userData.v = low ? rand(1.0, 1.6) : rand(1.6, 2.4);
        scene.add(c);
        clouds.push(c);
      }
    }

    {
      const H = { x: -1.75 * KX, z: -4.25 * KZ };
      const g = new THREE.Group();
      const wall = mat(0xe9c48c, 0.8);
      const wood = mat(0x9a6a42, 0.85);
      const roofM = mat(0xc4543e, 0.7, { flatShading: true });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.9), wall);
      body.position.y = 0.38;
      body.castShadow = body.receiveShadow = true;
      g.add(body);
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-0.72, 0);
      roofShape.lineTo(0, 0.55);
      roofShape.lineTo(0.72, 0);
      roofShape.lineTo(-0.72, 0);
      const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 1.1, bevelEnabled: false }), roofM);
      roof.position.set(0, 0.74, -0.55);
      roof.castShadow = true;
      g.add(roof);
      const door = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24, 0, Math.PI), mat(0x3a2418, 0.8));
      door.position.set(0, 0.32, 0.451);
      g.add(door);
      const doorB = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.32), mat(0x3a2418, 0.8));
      doorB.position.set(0, 0.16, 0.451);
      g.add(doorB);
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 6, 20, Math.PI), wood);
      frame.position.set(0, 0.32, 0.46);
      g.add(frame);
      const win = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), mat(0xfff0b0, 0.4, { emissive: 0xffc860, emissiveIntensity: 0.4 }));
      win.position.set(0.551, 0.5, 0);
      win.rotation.y = Math.PI / 2;
      g.add(win);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.03), wood);
      sign.position.set(0, 0.68, 0.47);
      g.add(sign);
      g.position.set(H.x, 0, H.z);
      g.rotation.y = 0.35;
      scene.add(g);
      obstacles.push({ x: H.x, z: H.z, r: 0.8 });
    }
    {
      const P0 = { x: 1.85 * KX, z: 2.55 * KZ };
      const g = new THREE.Group();
      const wood = mat(0x9a6a42, 0.85);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 1.3), wood);
      bed.position.y = 0.07;
      bed.castShadow = true;
      g.add(bed);
      const soilTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 1.2), mat(0x6b4426, 0.95));
      soilTop.position.y = 0.15;
      g.add(soilTop);
      const leaf = mat(0x5fb355, 0.8, { flatShading: true });
      const carrot = mat(0xf08a2a, 0.6);
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++) {
          const x = -0.33 + r * 0.33;
          const z = -0.45 + c * 0.3;
          if (r === 1) {
            const top = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 8), carrot);
            top.rotation.x = Math.PI;
            top.position.set(x, 0.19, z);
            g.add(top);
          }
          for (let k = 0; k < 3; k++) {
            const l = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 4), leaf);
            l.position.set(x + (k - 1) * 0.03, 0.26, z);
            l.rotation.z = (k - 1) * 0.4;
            l.castShadow = true;
            g.add(l);
          }
        }
      g.position.set(P0.x, 0, P0.z);
      g.rotation.y = -0.15;
      scene.add(g);
      obstacles.push({ x: P0.x, z: P0.z, r: 0.75 });
    }
    {
      const st = add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.3, 14), mat(0x8a5a36, 0.9)));
      st.position.set(-2.2 * KX, 0.15, 1.6 * KZ);
      const ring = add(new THREE.Mesh(new THREE.CircleGeometry(0.25, 20), mat(0xd9b07a, 0.9)), false);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(-2.2 * KX, 0.302, 1.6 * KZ);
      obstacles.push({ x: -2.2 * KX, z: 1.6 * KZ, r: 0.35 });
    }

    {
      const stoneM = mat(0xe3d6bd, 0.9, { flatShading: true });
      [
        [0.2, 4.62],
        [0.52, 3.84],
        [0.72, 3.06],
        [0.65, 2.27]
      ].forEach(([x, z], i) => {
        const s = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 9), stoneM), false);
        s.position.set(x * Math.min(KX, 1.2), 0.01, z * KZ);
        s.rotation.y = i;
        s.scale.set(1, 1, 0.8);
      });
    }

    const flies = [];
    {
      const g = new THREE.SphereGeometry(0.03, 8, 6);
      for (let i = 0; i < 18; i++) {
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 0 }));
        scene.add(m);
        flies.push({ m, x: rand(-RX + 0.3, RX - 0.3), z: rand(-RZ + 0.4, RZ - 0.4), ph: rand(0, TAU), h: rand(0.3, 1.4) });
      }
    }
    const butterflies = [];
    {
      const wingG = new THREE.CircleGeometry(0.07, 12);
      [0xffb52e, 0xb59cff].forEach((c, i) => {
        const g = new THREE.Group();
        const wm = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
        const l = new THREE.Mesh(wingG, wm);
        const r = new THREE.Mesh(wingG, wm);
        l.position.x = -0.06;
        r.position.x = 0.06;
        const L = new THREE.Group();
        const Rg = new THREE.Group();
        L.add(l);
        Rg.add(r);
        g.add(L, Rg);
        scene.add(g);
        butterflies.push({ g, L, R: Rg, ph: i * 2.2, cx: (i ? -1.2 : 1.4) * KX, cz: (i ? 0.4 : -0.4) * KZ });
      });
    }

    if (leafSlots.length) {
      const inst = new THREE.InstancedMesh(leafGeo, leafMat, leafSlots.length);
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      const up = new THREE.Vector3();
      leafSlots.forEach((l, i) => {
        dummy.position.copy(l.p);
        up.set(rand(-0.4, 0.4), 0.35 + rand(-0.3, 0.3), rand(-0.4, 0.4)).add(l.dir).add(l.p);
        dummy.lookAt(up);
        dummy.rotateZ(rand(0, TAU));
        dummy.scale.setScalar(l.s * rand(0.85, 1.25) * 1.15);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        const light = 0.6 + 0.4 * (l.yy * 0.5 + 0.5) + rand(-0.1, 0.1);
        col.setRGB(light * rand(0.9, 1.1), light, light * rand(0.85, 1));
        inst.setColorAt(i, col);
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.receiveShadow = true;
      inst.matrixAutoUpdate = false;
      scene.add(inst);
    }

    {
      const skip = new Set();
      flies.forEach(f => skip.add(f.m));
      bowlBerries.forEach(b => b.traverse(o => skip.add(o)));
      butterflies.forEach(b => b.g.traverse(o => skip.add(o)));
      scene.updateMatrixWorld(true);
      const groups = new Map();
      const victims = [];
      scene.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh || skip.has(o) || !o.geometry || Array.isArray(o.material)) return;
        const m = o.material;
        if (m.map || !m.color) return;
        const key = [m.type, m.color.getHex(), m.roughness, m.metalness, m.flatShading, m.emissive ? m.emissive.getHex() : 0, m.emissiveIntensity, m.vertexColors, m.side, m.transparent, m.opacity, m.depthWrite, o.castShadow, o.receiveShadow].join("|");
        if (!groups.has(key)) groups.set(key, { m, cast: o.castShadow, recv: o.receiveShadow, list: [] });
        groups.get(key).list.push(o);
        victims.push(o);
      });
      groups.forEach(gr => {
        const parts = gr.list.map(o => {
          let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
          if (!g.attributes.normal) g.computeVertexNormals();
          g.applyMatrix4(o.matrixWorld);
          return g;
        });
        const total = parts.reduce((n, g) => n + g.attributes.position.count, 0);
        const pos = new Float32Array(total * 3);
        const nor = new Float32Array(total * 3);
        const col = gr.m.vertexColors ? new Float32Array(total * 3) : null;
        let off = 0;
        parts.forEach(g => {
          pos.set(g.attributes.position.array, off * 3);
          nor.set(g.attributes.normal.array, off * 3);
          if (col) {
            if (g.attributes.color) col.set(g.attributes.color.array, off * 3);
            else col.fill(1, off * 3, (off + g.attributes.position.count) * 3);
          }
          off += g.attributes.position.count;
          g.dispose();
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
        if (col) geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        geo.computeBoundingSphere();
        const merged = new THREE.Mesh(geo, gr.m);
        merged.castShadow = gr.cast;
        merged.receiveShadow = gr.recv;
        merged.matrixAutoUpdate = false;
        scene.add(merged);
      });
      victims.forEach(o => {
        if (o.parent) o.parent.remove(o);
        o.geometry.dispose();
      });
      const empty = [];
      scene.children.forEach(o => {
        if (o.isGroup && !o.children.length) empty.push(o);
      });
      empty.forEach(o => scene.remove(o));
    }

    const blobTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 64;
      const x = cv.getContext("2d");
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(0,0,0,1)");
      gr.addColorStop(0.55, "rgba(0,0,0,0.75)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(cv);
    })();
    const blobGeo = new THREE.PlaneGeometry(1, 1);
    blobGeo.rotateX(-Math.PI / 2);
    const ripples = [];
    const rippleGeo = new THREE.RingGeometry(0.82, 1, 40);
    rippleGeo.rotateX(-Math.PI / 2);
    const ripple = (x, z, r) => {
      let rp = ripples.find(o => !o.m.visible);
      if (!rp) {
        if (ripples.length > 14) return;
        rp = { m: new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, depthWrite: false })) };
        rp.m.renderOrder = 2;
        scene.add(rp.m);
        ripples.push(rp);
      }
      rp.m.position.set(x, 0.022, z);
      rp.r = Math.max(0.2, r * 0.6);
      rp.age = 0;
      rp.m.visible = true;
    };
    const stepRipples = dt => {
      ripples.forEach(rp => {
        if (!rp.m.visible) return;
        rp.age += dt;
        const k = rp.age / 1.3;
        if (k >= 1) {
          rp.m.visible = false;
          return;
        }
        rp.m.scale.setScalar(rp.r * (1 + k * 0.9));
        rp.m.material.opacity = 0.55 * (1 - k);
      });
    };
    const makeBlob = () => {
      const m = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.4 }));
      m.position.y = 0.012;
      m.renderOrder = 1;
      return m;
    };

    const seg = (n, d, m) => Math.max(m, Math.round((n === undefined ? d : n) * 0.5));
    const lite = Object.assign(Object.create(THREE), {
      SphereGeometry: function (r, w, h, ...a) {
        return w >= 40 ? new THREE.SphereGeometry(r, seg(w, 32, 24), seg(h, 16, 16), ...a) : new THREE.SphereGeometry(r, w, h, ...a);
      }
    });

    const SPOTS = [
      [-0.91, 1.17],
      [1.17, 0.78],
      [1.3, -1.95],
      [-1.69, -1.56],
      [0.26, 2.6],
      [-0.4, -0.3],
      [2.0, 1.6]
    ].map(([x, z]) => [x * KX, z * KZ]);
    const tmpBox = new THREE.Box3();
    const tmpV = new THREE.Vector3();
    const SCALE = 0.34;
    let critters = [];
    let selected = null;
    const clock = new THREE.Clock();

    const disposeTree = node => {
      node.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
    };

    const freeSpot = () => {
      for (let k = 0; k < 60; k++) {
        const x = rand(-RX, RX);
        const z = rand(-RZ, RZ);
        if (!inIsland(x, z, 0.6) || inPond(x, z, 0.5)) continue;
        if (obstacles.some(o => o.r && Math.hypot(o.x - x, o.z - z) < o.r + 0.4)) continue;
        if (critters.some(c => Math.hypot(c.holder.position.x - x, c.holder.position.z - z) < 0.9)) continue;
        return [x, z];
      }
      return [rand(-0.5, 0.5), rand(0, 1)];
    };

    const build = (c, species) => {
      const def = Pets.find(species);
      if (!def) return false;
      if (c.pet) {
        c.scaler.remove(c.pet.root);
        disposeTree(c.pet.root);
      }
      const pet = def.create({ THREE: lite, kit, reduceMotion: reduce, motion });
      if (c.variant && kit.variant) kit.variant(pet.root, def.id);
      if (c.core && kit.core) kit.core(pet, c.core);
      c.scaler.add(pet.root);
      pet.update({ t: 0, pointer: { x: 0, y: 0 }, lookYaw: 0, lookPitch: 0, blink: 1, action: null, hunger: 100, life: 100, joy: 100, dying: false, motion: 0, reduceMotion: true });
      c.scaler.scale.setScalar(1);
      c.scaler.position.set(0, 0, 0);
      c.scaler.rotation.set(0, 0, 0);
      pet.root.updateMatrixWorld(true);
      tmpBox.makeEmpty();
      pet.root.traverse(o => {
        if (o.isMesh && o.visible && o.castShadow && o.geometry) {
          o.geometry.computeBoundingBox();
          tmpBox.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
        }
      });
      const h = tmpBox.isEmpty() ? 1 : Math.max(0.5, tmpBox.max.y - Math.max(0, tmpBox.min.y));
      const wd = tmpBox.isEmpty() ? 1 : Math.max(tmpBox.max.x - tmpBox.min.x, tmpBox.max.z - tmpBox.min.z);
      const stage = Math.max(1, Math.min(3, Math.round(stageOf(species)) || 1));
      const sc = SCALE * Math.pow(2 / Math.max(0.5, h, wd * 0.7), 0.7) * STAGE_SIZE[stage - 1];
      c.scaler.scale.setScalar(sc);
      pet.root.traverse(o => {
        if (o.isMesh) {
          o.userData.critter = c;
          o.castShadow = false;
        }
      });
      c.def = def;
      c.pet = pet;
      c.species = species;
      c.height = h * sc;
      c.radius = Math.max(0.32, wd * sc * 0.45);
      c.sel.scale.setScalar(Math.max(1, c.radius / 0.4));
      c.blob.scale.set(c.radius * 2.6, 1, c.radius * 2.6);
      c.action = null;
      c.counts = {};
      return true;
    };

    const makeCritter = (row, i) => {
      const holder = new THREE.Group();
      const scaler = new THREE.Group();
      holder.add(scaler);
      const at = i < SPOTS.length && !critters.some(o => Math.hypot(o.holder.position.x - SPOTS[i][0], o.holder.position.z - SPOTS[i][1]) < 0.9) ? SPOTS[i] : freeSpot();
      holder.position.set(at[0], 0, at[1]);
      holder.rotation.y = rand(-0.6, 0.6);
      const sel = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40), new THREE.MeshBasicMaterial({ color: 0xffcd3c, transparent: true, opacity: 0, depthWrite: false }));
      sel.rotation.x = -Math.PI / 2;
      sel.position.y = 0.03;
      holder.add(sel);
      const blob = makeBlob();
      holder.add(blob);
      const c = {
        blob,
        uid: row.uid,
        i,
        holder,
        scaler,
        sel,
        pet: null,
        name: row.name,
        hunger: row.hunger,
        joy: row.joy,
        life: row.life,
        dying: !!row.dying,
        hidden: false,
        mode: "idle",
        wait: rand(0.5, 2.5),
        target: null,
        speed: rand(0.95, 1.2),
        hopT: rand(0, 10),
        action: null,
        counts: {},
        face: null,
        then: null,
        look: { x: 0, y: 0 },
        blinkAt: rand(1, 4),
        blinkStart: -10
      };
      c.variant = !!row.variant;
      c.core = row.core || null;
      if (!build(c, row.species)) return null;
      scene.add(holder);
      return c;
    };

    const removeCritter = c => {
      if (c.berry) {
        scene.remove(c.berry.g);
        c.berry.taken = true;
      }
      scene.remove(c.holder);
      disposeTree(c.holder);
      if (c.purseEl) c.purseEl.remove();
      if (selected === c) selected = null;
      if (hoverTag === c) hoverTag = null;
      if (hovered === c) hovered = null;
      for (let k = emotes.length - 1; k >= 0; k--) {
        if (emotes[k].c === c) {
          emotes[k].el.remove();
          emotes.splice(k, 1);
        }
      }
    };

    const setParty = rows => {
      const keep = [];
      rows.forEach(row => {
        let c = critters.find(o => o.uid === row.uid);
        if (c && (c.species !== row.species || !!c.variant !== !!row.variant)) {
          c.variant = !!row.variant;
          if (!build(c, row.species)) return;
        }
        if (!c) {
          c = makeCritter(row, critters.length + keep.length);
          if (!c) return;
        }
        if ((row.core || null) !== c.core) {
          c.core = row.core || null;
          if (c.pet && kit.core) kit.core(c.pet, c.core);
        }
        c.name = row.name;
        c.purse = row.purse || 0;
        c.purseCap = row.cap || 0;
        c.hunger = row.hunger;
        c.joy = row.joy;
        c.life = row.life;
        if (row.dying && !c.dying) {
          c.mode = "idle";
          c.target = null;
          c.wait = 1;
        }
        c.dying = !!row.dying;
        keep.push(c);
      });
      critters.filter(c => !keep.includes(c)).forEach(removeCritter);
      critters = keep;
      critters.forEach((c, i) => (c.i = i));
    };
    const byUid = uid => critters.find(c => c.uid === uid) || null;

    const panOf = c => {
      if (!cw) return 0;
      const [x] = project(c.holder.position, 0);
      return Math.max(-0.7, Math.min(0.7, (x / cw) * 1.4 - 0.7));
    };
    const play = (c, name, x) => {
      if (!c.def.actions || !c.def.actions[name]) return false;
      c.counts[name] = (c.counts[name] || 0) + 1;
      c.action = { name, start: clock.getElapsedTime(), n: c.counts[name], dur: c.def.actions[name].duration };
      if (audible && root.Sfx && !c.hidden) root.Sfx.action(c.def, name, { pan: panOf(c), vol: x && x.cry ? 0.9 : 0.55, cry: !!(x && x.cry) });
      return true;
    };
    const busy = c => !!c.action;

    const ICONS = {
      heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z" fill="#ff6f9c"/></svg>',
      berry: '<svg viewBox="0 0 24 24"><circle cx="12" cy="14" r="7" fill="#e8465a"/><ellipse cx="14" cy="6" rx="3.4" ry="1.6" fill="#4fa86e" transform="rotate(-25 14 6)"/></svg>',
      bang: '<svg viewBox="0 0 24 24"><path d="M10 3h4l-1 12h-2z" fill="#f2b630"/><circle cx="12" cy="19" r="2" fill="#f2b630"/></svg>',
      note: '<svg viewBox="0 0 24 24"><path d="M9 17V5l10-2v12" fill="none" stroke="#2e7d54" stroke-width="2.2"/><circle cx="7" cy="17" r="3" fill="#2e7d54"/><circle cx="17" cy="15" r="3" fill="#2e7d54"/></svg>',
      spark: '<svg viewBox="0 0 24 24"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="#ffcd3c"/></svg>',
      zzz: '<svg viewBox="0 0 24 24"><path d="M4 8h6l-6 7h6M13 4h7l-7 8h7" fill="none" stroke="#59b7ff" stroke-width="2.2" stroke-linejoin="round"/></svg>',
      drop: '<svg viewBox="0 0 24 24"><path d="M12 3c3 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.5 6-11z" fill="#59b7ff"/></svg>'
    };
    const emotes = [];
    const emote = (c, kind, life = 1.6) => {
      if (!fx || c.hidden) return;
      const el = document.createElement("div");
      el.className = "hab-emote";
      el.innerHTML = ICONS[kind];
      const dx = rand(-8, 8);
      const [x, y] = project(c.holder.position, c.height + 0.15);
      el.style.translate = x + dx + "px " + y + "px";
      fx.appendChild(el);
      if (kind !== "zzz" && kind !== "berry") sfx(kind === "drop" ? "sad" : kind, { pan: cw ? Math.max(-0.7, Math.min(0.7, (x / cw) * 1.4 - 0.7)) : 0, vol: 0.7 });
      emotes.push({ el, c, t0: clock.getElapsedTime(), life, dx });
    };
    let tagEl = null;
    if (fx) {
      tagEl = document.createElement("div");
      tagEl.className = "hab-tag";
      tagEl.hidden = true;
      fx.appendChild(tagEl);
    }

    const randomSpot = c => {
      const swim = c.def && c.def.move === "swim" && Math.random() < 0.4;
      for (let k = 0; k < 40; k++) {
        const x = swim ? POND.x + rand(-1, 1) * POND.rx * 0.6 : rand(-RX, RX);
        const z = swim ? POND.z + rand(-1, 1) * POND.rz * 0.6 : rand(-RZ, RZ);
        if (swim && !inPond(x, z, -0.25)) continue;
        if (blockedAt(x, z, padOf(c) + 0.15, wet(c))) continue;
        if (Math.hypot(x - c.holder.position.x, z - c.holder.position.z) < 0.9) continue;
        return new THREE.Vector3(x, 0, z);
      }
      return new THREE.Vector3(0, 0, 0.5);
    };
    const padOf = c => Math.max(0.3, (c.radius || 0.32) * 0.8);
    const wet = c => !!(c && c.def && (c.def.move === "fly" || c.def.move === "swim"));
    const blockedAt = (x, z, pad, water) => !inIsland(x, z, Math.max(0.4, pad)) || (!water && inPond(x, z, Math.max(PM, pad * 0.9))) || obstacles.some(o => o.r && Math.hypot(o.x - x, o.z - z) < o.r + pad);
    const clearLine = (ax, az, bx, bz, pad, water) => {
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.12);
      for (let i = 1; i <= n; i++) {
        const k = i / n;
        if (blockedAt(ax + (bx - ax) * k, az + (bz - az) * k, pad, water)) return false;
      }
      return true;
    };
    const CELL = 0.25;
    const GW = Math.ceil((2 * RX) / CELL) + 1;
    const GH = Math.ceil((2 * RZ) / CELL) + 1;
    const cx = i => -RX + (i % GW) * CELL;
    const cz = i => -RZ + Math.floor(i / GW) * CELL;
    const cellOf = (x, z) => Math.max(0, Math.min(GH - 1, Math.round((z + RZ) / CELL))) * GW + Math.max(0, Math.min(GW - 1, Math.round((x + RX) / CELL)));
    const freeNear = (i, free) => {
      if (free[i]) return i;
      let best = -1;
      let bd = 1e9;
      for (let j = 0; j < free.length; j++) {
        if (!free[j]) continue;
        const d = Math.hypot(cx(j) - cx(i), cz(j) - cz(i));
        if (d < bd) {
          bd = d;
          best = j;
        }
      }
      return best;
    };
    const findPath = (c, tx, tz) => {
      const pos = c.holder.position;
      const pad = padOf(c);
      const water = wet(c);
      if (clearLine(pos.x, pos.z, tx, tz, pad, water)) return [];
      const free = new Uint8Array(GW * GH);
      for (let i = 0; i < free.length; i++) free[i] = blockedAt(cx(i), cz(i), pad, water) ? 0 : 1;
      const a = freeNear(cellOf(pos.x, pos.z), free);
      const b = freeNear(cellOf(tx, tz), free);
      if (a < 0 || b < 0) return [];
      const g = new Float32Array(GW * GH).fill(1e9);
      const from = new Int32Array(GW * GH).fill(-1);
      const done = new Uint8Array(GW * GH);
      const open = [a];
      g[a] = 0;
      const h = i => Math.hypot(cx(i) - cx(b), cz(i) - cz(b));
      let found = false;
      while (open.length) {
        let bi = 0;
        for (let k = 1; k < open.length; k++) if (g[open[k]] + h(open[k]) < g[open[bi]] + h(open[bi])) bi = k;
        const cur = open.splice(bi, 1)[0];
        if (cur === b) {
          found = true;
          break;
        }
        done[cur] = 1;
        const x = cur % GW;
        const y = Math.floor(cur / GW);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
            const n = ny * GW + nx;
            if (!free[n] || done[n]) continue;
            if (dx && dy && (!free[y * GW + nx] || !free[ny * GW + x])) continue;
            const ng = g[cur] + (dx && dy ? 1.414 : 1) * CELL;
            if (ng < g[n]) {
              g[n] = ng;
              from[n] = cur;
              if (!open.includes(n)) open.push(n);
            }
          }
      }
      if (!found) return [];
      const cells = [];
      for (let i = b; i !== -1; i = from[i]) cells.unshift(i);
      const pts = cells.map(i => [cx(i), cz(i)]);
      if (!blockedAt(tx, tz, pad, water)) pts.push([tx, tz]);
      const out = [];
      let ax = pos.x;
      let az = pos.z;
      let k = 0;
      while (k < pts.length) {
        let j = pts.length - 1;
        while (j > k && !clearLine(ax, az, pts[j][0], pts[j][1], pad, water)) j--;
        out.push(new THREE.Vector3(pts[j][0], 0, pts[j][1]));
        ax = pts[j][0];
        az = pts[j][1];
        k = j + 1;
      }
      return out;
    };
    const goTo = (c, target, mode, then, speed) => {
      c.mode = mode;
      c.target = target;
      c.path = target ? findPath(c, target.x, target.z) : [];
      c.pathAt = clock.getElapsedTime();
      c.face = null;
      c.faceTarget = null;
      c.bestD = 1e9;
      c.stuckT = 0;
      c.then = then || null;
      c.runSpeed = speed || c.speed;
    };

    const berries = [];
    const ball = { g: null, v: new THREE.Vector3(), on: false, until: 0 };
    {
      const geo = new THREE.SphereGeometry(0.17, 32, 20);
      const p = geo.attributes.position;
      const col = new Float32Array(p.count * 3);
      const cs = [new THREE.Color(0xff6f9c), new THREE.Color(0xffffff), new THREE.Color(0x59b7ff), new THREE.Color(0xffffff), new THREE.Color(0xffcd3c), new THREE.Color(0xffffff)];
      for (let i = 0; i < p.count; i++) {
        const a = Math.atan2(p.getZ(i), p.getX(i)) + Math.PI;
        const c = cs[Math.floor((a / TAU) * 6) % 6];
        col.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      ball.g = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }));
      ball.g.visible = false;
      scene.add(ball.g);
      ball.blob = makeBlob();
      ball.blob.visible = false;
      scene.add(ball.blob);
    }

    const spillBerry = c => {
      const base = c.holder.position;
      let x = base.x;
      let z = base.z;
      for (let k = 0; k < 30; k++) {
        const a = rand(0, TAU);
        const r = rand(0.7, 1.4);
        x = base.x + Math.cos(a) * r;
        z = base.z + Math.sin(a) * r;
        if (!blockedAt(x, z, padOf(c) + 0.1)) break;
      }
      const g = kit.berry();
      g.scale.setScalar(1.15);
      g.position.set(x, 3.2 + rand(0, 0.8), z);
      scene.add(g);
      const b = { g, vy: 0, landed: false, owner: c, taken: false };
      berries.push(b);
      goTo(c, new THREE.Vector3(x, 0, z), "food", null, c.speed * (c.dying ? 0.6 : 1.35));
      c.berry = b;
      emote(c, "bang", 1.0);
    };
    const feed = uid => {
      const c = byUid(uid);
      if (!c || c.hidden || c.mode === "food" || c.mode === "eating") return;
      c.action = null;
      spillBerry(c);
    };

    const pickPlayers = () => {
      const free = critters.filter(c => !c.dying && !c.hidden && c.mode !== "food" && c.mode !== "eating" && c.mode !== "ball");
      const already = critters.filter(c => c.mode === "ball").length;
      const want = Math.max(0, Math.min(2, free.length) - already);
      free
        .sort(() => Math.random() - 0.5)
        .slice(0, want)
        .forEach(c => {
          c.mode = "ball";
          c.target = null;
          c.face = null;
          c.faceTarget = null;
          c.action = null;
          c.kickWait = rand(0, 0.4);
          emote(c, "bang", 1.0);
        });
    };
    const throwBall = () => {
      const tx = rand(-1, 1);
      const tz = rand(-0.5, 1.5);
      ball.g.position.set(tx * 0.3, 2.6, RZ * 0.75);
      ball.v.set((tx - ball.g.position.x) * 0.9, 3.8, (tz - ball.g.position.z) * 0.9);
      ball.g.visible = true;
      ball.on = true;
      ball.until = clock.getElapsedTime() + 14;
      sfx("throw");
      pickPlayers();
    };

    const call = () => {
      sfx("whistle");
      const list = critters.filter(c => !c.hidden && c.mode !== "food" && c.mode !== "eating");
      const n = list.length;
      list.forEach((c, i) => {
        const a = n > 1 ? (i / (n - 1) - 0.5) * Math.min(2.3, 0.6 * (n - 1)) : 0;
        const x = Math.sin(a) * 1.35 * Math.min(KX, 1.5);
        const z = (1.55 + Math.cos(a) * 0.55 - 0.45) * KZ;
        c.action = null;
        goTo(
          c,
          new THREE.Vector3(x, 0, z),
          "gather",
          () => {
            c.mode = "posing";
            c.face = 0;
            c.wait = 3.2 + i * 0.25;
            c.jumpAt = c.dying ? 0 : clock.getElapsedTime() + 0.25 + i * 0.22;
          },
          c.speed * (c.dying ? 0.6 : 1.4)
        );
      });
    };

    const BALL_R = 0.17;
    const stepBall = (dt, t) => {
      if (!ball.on) return;
      if (drag.on) {
        ball.g.rotation.x += dt * 2;
        return;
      }
      const p = ball.g.position;
      ball.v.y -= 9.8 * dt;
      p.addScaledVector(ball.v, dt);
      if (p.y < 0.6 && inPond(p.x, p.z, 0.12)) {
        const q = pondOut(p.x, p.z, 0.12);
        let nx = (p.x - POND.x) / (POND.rx * POND.rx);
        let nz = (p.z - POND.z) / (POND.rz * POND.rz);
        const nl = Math.hypot(nx, nz) || 1;
        nx /= nl;
        nz /= nl;
        p.x = q[0];
        p.z = q[1];
        if (ball.v.length() > 1.2) sfx("splash", { vol: Math.min(1, ball.v.length() / 4) });
        const dot = ball.v.x * nx + ball.v.z * nz;
        if (dot < 0) {
          ball.v.x -= 1.6 * dot * nx;
          ball.v.z -= 1.6 * dot * nz;
        }
      }
      if (p.y < BALL_R) {
        p.y = BALL_R;
        if (ball.v.y < -0.6) {
          sfx("bounce", { v: Math.min(1, -ball.v.y / 6) });
          ball.v.y *= -0.52;
        }
        else ball.v.y = 0;
        ball.v.x *= 0.985;
        ball.v.z *= 0.985;
      }
      if (!inIsland(p.x, p.z, 0.35)) {
        const n = new THREE.Vector3((Math.sign(p.x) * Math.pow(Math.abs(p.x / RX), SE - 1)) / RX, 0, (Math.sign(p.z) * Math.pow(Math.abs(p.z / RZ), SE - 1)) / RZ).normalize();
        const d = ball.v.dot(n);
        if (d > 0) ball.v.addScaledVector(n, -1.8 * d);
        p.x *= 0.995;
        p.z *= 0.995;
      }
      obstacles.forEach(o => {
        if (!o.r) return;
        const dx = p.x - o.x;
        const dz = p.z - o.z;
        const d = Math.hypot(dx, dz);
        if (d < o.r + BALL_R && d > 0) {
          const nx = dx / d;
          const nz = dz / d;
          p.x = o.x + nx * (o.r + BALL_R);
          p.z = o.z + nz * (o.r + BALL_R);
          const dot = ball.v.x * nx + ball.v.z * nz;
          if (dot < 0) {
            ball.v.x -= 1.7 * dot * nx;
            ball.v.z -= 1.7 * dot * nz;
          }
        }
      });
      const sp = Math.hypot(ball.v.x, ball.v.z);
      if (sp > 0.01) {
        ball.g.rotation.x += (ball.v.z / BALL_R) * dt;
        ball.g.rotation.z -= (ball.v.x / BALL_R) * dt;
      }
      if (t > ball.until && sp < 0.3) {
        ball.on = false;
        ball.g.visible = false;
        critters.forEach(c => {
          if (c.mode === "ball") {
            c.mode = "idle";
            c.wait = rand(0.5, 1.5);
          }
        });
      }
    };

    const cuddle = c => {
      if (c.mode === "eating" || c.mode === "food") {
        emote(c, "heart");
        return;
      }
      if (c.mode === "ball") pickPlayers();
      c.mode = "idle";
      c.target = null;
      c.wait = 2.2;
      c.face = 0;
      if (c.dying) {
        emote(c, "drop", 1.4);
        return;
      }
      const name = c.def.clickAction ? c.def.clickAction((c.counts.__click = (c.counts.__click || 0) + 1)) : "jump";
      if (!play(c, name, { cry: true })) play(c, "jump", { cry: true });
      emote(c, "heart");
    };

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hitCritter = (cx, cy) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const meshes = [];
      critters.forEach(c => !c.hidden && c.pet.root.traverse(o => o.isMesh && o.visible && meshes.push(o)));
      const hits = ray.intersectObjects(meshes, false);
      if (hits.length && hits[0].object.userData.critter) return hits[0].object.userData.critter;
      let best = null;
      let bd = 1e9;
      critters.forEach(c => {
        if (c.hidden) return;
        tmpV.copy(c.holder.position).setY(c.height * 0.5).project(camera);
        const sx = (tmpV.x * 0.5 + 0.5) * r.width;
        const sy = (-tmpV.y * 0.5 + 0.5) * r.height;
        const d = Math.hypot(sx - (cx - r.left), sy - (cy - r.top));
        if (d < bd) {
          bd = d;
          best = c;
        }
      });
      return bd < 44 ? best : null;
    };
    let downAt = null;
    const drag = { on: false, id: null, last: new THREE.Vector3(), lastT: 0, vel: new THREE.Vector3() };
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45);
    const toPlane = (cx, cy, out) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(plane, out);
    };
    const hitBall = (cx, cy) => {
      if (!ball.on) return false;
      const r = canvas.getBoundingClientRect();
      tmpV.copy(ball.g.position).project(camera);
      const sx = (tmpV.x * 0.5 + 0.5) * r.width + r.left;
      const sy = (-tmpV.y * 0.5 + 0.5) * r.height + r.top;
      return Math.hypot(sx - cx, sy - cy) < 34;
    };
    canvas.addEventListener("pointerdown", e => {
      downAt = { x: e.clientX, y: e.clientY };
      if (hitBall(e.clientX, e.clientY)) {
        drag.on = true;
        drag.id = e.pointerId;
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (err) {
          drag.id = e.pointerId;
        }
        drag.last.copy(ball.g.position);
        drag.lastT = performance.now();
        drag.vel.set(0, 0, 0);
        canvas.style.cursor = "grabbing";
        downAt = null;
      }
    });
    canvas.addEventListener("pointermove", e => {
      if (!drag.on || e.pointerId !== drag.id) return;
      const p = toPlane(e.clientX, e.clientY, tmpV);
      if (!p) return;
      const k = Math.min(1, Math.pow(1 / Math.max(1e-6, islandF(p.x, p.z, 0.3)), 1 / SE));
      p.x *= k;
      p.z *= k;
      const now = performance.now();
      const dtm = Math.max(1, now - drag.lastT) / 1000;
      drag.vel
        .set((p.x - drag.last.x) / dtm, 0, (p.z - drag.last.z) / dtm)
        .multiplyScalar(0.6)
        .add(drag.vel.multiplyScalar(0.4));
      drag.last.set(p.x, 0.45, p.z);
      drag.lastT = now;
      ball.g.position.set(p.x, 0.45, p.z);
      ball.v.set(0, 0, 0);
      ball.until = clock.getElapsedTime() + 12;
    });
    const endDrag = () => {
      if (!drag.on) return;
      drag.on = false;
      canvas.style.cursor = "default";
      const sp = Math.min(7, drag.vel.length());
      if (sp > 0.01) drag.vel.setLength(sp);
      ball.v.set(drag.vel.x, 1.2 + sp * 0.25, drag.vel.z);
      pickPlayers();
    };
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointerup", e => {
      if (drag.on) {
        endDrag();
        return;
      }
      if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 10) return;
      downAt = null;
      const c = hitCritter(e.clientX, e.clientY);
      if (c) {
        cuddle(c);
        onTap(c.uid);
      } else onEmpty();
    });
    let hoverTag = null;
    let hovered = null;
    canvas.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse" || drag.on) return;
      if (hitBall(e.clientX, e.clientY)) {
        canvas.style.cursor = "grab";
        hoverTag = null;
        return;
      }
      const c = hitCritter(e.clientX, e.clientY);
      hoverTag = c && c !== selected ? c : null;
      canvas.style.cursor = c ? "pointer" : "default";
    });
    canvas.addEventListener("pointerleave", () => (hoverTag = null));

    let night = false;
    let nightK = 0;
    const setNight = v => {
      night = !!v;
    };

    const rim = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU;
      rim.push(new THREE.Vector3(Math.cos(a) * seR(a) * RX, 0, Math.sin(a) * seR(a) * RZ));
    }
    const pv = new THREE.Vector3();
    const place = d => {
      camera.position.copy(CAM_TARGET).addScaledVector(CAM_DIR, d);
      camera.lookAt(CAM_TARGET.x, CAM_TARGET.y - 0.1, CAM_TARGET.z + 0.75);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      let x0 = 9;
      let x1 = -9;
      let y0 = 9;
      let y1 = -9;
      rim.forEach(p => {
        pv.copy(p).project(camera);
        x0 = Math.min(x0, pv.x);
        x1 = Math.max(x1, pv.x);
        y0 = Math.min(y0, pv.y);
        y1 = Math.max(y1, pv.y);
      });
      return { x0, x1, y0, y1 };
    };
    let cw = 0;
    let ch = 0;
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      cw = w;
      ch = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.clearViewOffset();
      const ins = insets() || {};
      const top = Math.max(0, ins.top || 0) + 8;
      const bottom = Math.max(0, ins.bottom || 0) + 8;
      const right = Math.max(0, ins.right || 0);
      const bandN = (2 * Math.max(120, h - top - bottom)) / h;
      const spanX = wide ? 1.8 : Math.min(1.9, (1.9 * Math.min(w - right, 560)) / w);
      let lo = 4;
      let hi = 60;
      for (let k = 0; k < 28; k++) {
        const mid = (lo + hi) / 2;
        const b = place(mid);
        if (b.x1 - b.x0 <= spanX && b.y1 - b.y0 <= bandN) hi = mid;
        else lo = mid;
      }
      const b = place(hi);
      const want = 1 - (2 * (top + (h - top - bottom) / 2)) / h;
      const shift = want - (b.y0 + b.y1) / 2;
      const shiftX = -right / w - (b.x0 + b.x1) / 2;
      camera.setViewOffset(w, h, (-shiftX * w) / 2, (shift * h) / 2, w, h);
      camera.updateProjectionMatrix();
    };
    if (root.ResizeObserver) new ResizeObserver(resize).observe(canvas);

    const project = (pos, y) => {
      tmpV.set(pos.x, y, pos.z).project(camera);
      return [(tmpV.x * 0.5 + 0.5) * cw, (-tmpV.y * 0.5 + 0.5) * ch];
    };

    let last = 0;
    let running = false;
    let raf = 0;
    const step = () => {
      const t = clock.getElapsedTime();
      const dt = Math.min(0.05, Math.max(0, t - last));
      last = t;

      nightK = lerp(nightK, night ? 1 : 0, 0.04);
      if (skyMat) skyMat.color.setRGB(lerp(1, 0.2, nightK), lerp(1, 0.27, nightK), lerp(1, 0.46, nightK));
      if (shipG && shipG.userData.tick) shipG.userData.tick(t, motion);
      if (shipG && shipG.userData.night) shipG.userData.night(nightK);
      clouds.forEach(c => {
        if (wide) {
          c.position.x += c.userData.v * dt * motion;
          if (c.position.x > 48) c.position.x -= 96;
        } else {
          c.position.z += c.userData.v * dt * motion;
          if (c.position.z > 20) c.position.z -= 66;
        }
      });
      scene.fog.color.setRGB(lerp(0.81, 0.13, nightK), lerp(0.92, 0.2, nightK), lerp(0.95, 0.36, nightK));
      hemi.intensity = lerp(0.55, 0.26, nightK);
      hemi.color.setRGB(lerp(0.91, 0.45, nightK), lerp(0.94, 0.55, nightK), lerp(1, 0.95, nightK));
      sun.intensity = lerp(0.85, 0.26, nightK);
      sun.color.setRGB(lerp(1, 0.6, nightK), lerp(0.94, 0.7, nightK), lerp(0.85, 1, nightK));
      flies.forEach(f => {
        f.m.material.opacity = nightK * (0.5 + 0.5 * Math.sin(t * 3 + f.ph * 3));
        f.m.position.set(f.x + Math.sin(t * 0.5 + f.ph) * 0.4, f.h + Math.sin(t * 0.9 + f.ph) * 0.2, f.z + Math.cos(t * 0.4 + f.ph) * 0.4);
      });
      butterflies.forEach(b => {
        b.g.visible = 1 - nightK > 0.3;
        const a = t * 0.5 + b.ph;
        b.g.position.set(b.cx + Math.sin(a) * 0.9, 0.9 + Math.sin(t * 2 + b.ph) * 0.2, b.cz + Math.sin(a * 2) * 0.6);
        b.g.rotation.y = Math.atan2(Math.cos(a) * 0.9, Math.cos(a * 2) * 1.2);
        const flap = Math.sin(t * 18 + b.ph) * 0.9 * motion;
        b.L.rotation.y = flap;
        b.R.rotation.y = -flap;
      });

      for (let k = berries.length - 1; k >= 0; k--) {
        const b = berries[k];
        if (b.taken) {
          berries.splice(k, 1);
          continue;
        }
        if (b.landed) continue;
        b.vy -= 9.8 * dt;
        b.g.position.y += b.vy * dt;
        if (b.g.position.y < 0.18) {
          b.g.position.y = 0.18;
          if (b.vy < -1.5) {
            sfx("plop", { vol: Math.min(1, -b.vy / 5) });
            b.vy *= -0.35;
          } else {
            b.vy = 0;
            b.landed = true;
          }
        }
      }
      stepBall(dt, t);
      stepRipples(dt);
      ball.blob.visible = ball.g.visible;
      if (ball.on) {
        const bh = Math.max(0, ball.g.position.y - BALL_R);
        ball.blob.position.set(ball.g.position.x, 0.014, ball.g.position.z);
        ball.blob.scale.setScalar(0.42 + bh * 0.12);
        ball.blob.material.opacity = Math.max(0.08, 0.4 - bh * 0.12) * (1 - nightK * 0.35);
      }

      critters.forEach(c => {
        const pos = c.holder.position;
        c.holder.visible = !c.hidden;
        if (c.action && t - c.action.start >= c.action.dur) {
          const finished = c.action.name;
          c.action = null;
          if (c.mode !== "posing") c.face = null;
          if (finished === "eat" && c.mode === "eating") {
            c.mode = "idle";
            c.wait = rand(0.8, 2);
            emote(c, "heart");
          }
        }
        let moving = false;
        let want = null;

        if (c.mode === "idle" && !c.hidden) {
          c.wait -= dt;
          if (c.wait <= 0 && !busy(c)) {
            const r = Math.random();
            if (c.dying) {
              c.wait = rand(3, 6);
              if (r < 0.4) emote(c, "drop", 1.6);
            } else if (r < 0.18) {
              const names = (c.def.idle || []).map(i => i.action).filter(n => c.def.actions[n]);
              const nm = names.length ? names[Math.floor(Math.random() * names.length)] : "jump";
              if (play(c, nm)) {
                c.wait = c.def.actions[nm].duration + rand(0.6, 1.5);
                if (Math.random() < 0.4) emote(c, nm === "jump" ? "note" : "spark", 1.3);
              } else c.wait = 1;
            } else if (r < 0.38 && critters.length > 1) {
              const other = critters[(c.i + 1 + Math.floor(Math.random() * (critters.length - 1))) % critters.length];
              if (other !== c && !other.hidden && (other.mode === "idle" || other.mode === "walk")) {
                const a = Math.atan2(pos.z - other.holder.position.z, pos.x - other.holder.position.x);
                const meet = new THREE.Vector3(other.holder.position.x + Math.cos(a) * (0.55 + c.radius + other.radius), 0, other.holder.position.z + Math.sin(a) * (0.55 + c.radius + other.radius));
                if (inIsland(meet.x, meet.z, 0.5)) {
                  goTo(c, meet, "visit", () => {
                    c.mode = "idle";
                    c.wait = 2.6;
                    if (!critters.includes(other)) return;
                    c.faceTarget = other;
                    play(c, "jump");
                    emote(c, "note", 1.4);
                    if (other.mode === "idle" && !busy(other) && !other.dying) {
                      other.faceTarget = c;
                      other.wait = Math.max(other.wait, 2.2);
                      setTimeout(() => critters.includes(other) && play(other, "jump"), 350);
                    }
                  });
                } else c.wait = 1;
              } else c.wait = 0.8;
            } else if (r < 0.46 && c.hunger < 40) {
              emote(c, "berry", 1.8);
              c.wait = 2.5;
            } else if (r < 0.52 && night) {
              emote(c, "zzz", 2);
              c.wait = 3.5;
            } else {
              goTo(c, randomSpot(c), "walk");
            }
          }
        }
        if (c.mode === "posing") {
          if (c.jumpAt && t > c.jumpAt) {
            c.jumpAt = 0;
            play(c, "jump");
            if (c.i % 2 === 0) emote(c, "heart", 1.4);
          }
          c.wait -= dt;
          if (c.wait <= 0 && !busy(c)) {
            c.mode = "idle";
            c.face = null;
            c.wait = rand(0.2, 1.2);
          }
        }
        if (c.mode === "ball" && !ball.on) {
          c.mode = "idle";
          c.wait = rand(0.5, 1.5);
        }
        if (c.mode === "ball" && ball.on) {
          const bp = ball.g.position;
          const dx = bp.x - pos.x;
          const dz = bp.z - pos.z;
          const d = Math.hypot(dx, dz);
          c.kickWait -= dt;
          const kick = 0.3 + c.radius;
          if (d > kick) {
            want = new THREE.Vector3(bp.x - (dx / d) * (kick - 0.15), 0, bp.z - (dz / d) * (kick - 0.15));
          } else if (bp.y < 0.6 && c.kickWait <= 0 && !busy(c) && !drag.on) {
            const a = Math.atan2(dz, dx) + rand(-0.7, 0.7);
            const pw = rand(2.4, 3.6);
            ball.v.set(Math.cos(a) * pw, rand(2.4, 3.8), Math.sin(a) * pw);
            sfx("kick", { pan: panOf(c) });
            play(c, "jump");
            c.kickWait = 1.2;
            emote(c, Math.random() < 0.5 ? "spark" : "note", 1.1);
            ball.until = Math.max(ball.until, t + 4);
            onKick(c.uid);
            c.kicks = (c.kicks || 0) + 1;
            if (c.kicks > 2 && Math.random() < 0.35) {
              c.kicks = 0;
              c.mode = "idle";
              c.wait = rand(1, 2.5);
              c.target = null;
              pickPlayers();
            }
          }
          if (want && !busy(c)) {
            c.target = want;
            c.runSpeed = c.speed * 1.55;
            if (t - (c.pathAt || 0) > 0.5) {
              c.pathAt = t;
              c.path = findPath(c, want.x, want.z);
            }
          } else c.target = null;
        }
        if (c.mode === "food") {
          if (!c.berry) {
            c.mode = "idle";
            c.wait = 1;
          } else if (c.berry.landed) c.target = new THREE.Vector3(c.berry.g.position.x, 0, c.berry.g.position.z);
          else c.target = null;
        }

        if (c.target && !wet(c) && inPond(c.target.x, c.target.z, PM)) {
          const q = pondOut(c.target.x, c.target.z, PM + 0.02);
          c.target.x = q[0];
          c.target.z = q[1];
        }
        if (c.target && !busy(c)) {
          const dx = c.target.x - pos.x;
          const dz = c.target.z - pos.z;
          const d = Math.hypot(dx, dz);
          const reach = c.mode === "food" ? Math.max(0.5, c.radius * 0.7) : c.mode === "ball" ? 0.05 : 0.12;
          const path = c.path || [];
          while (path.length && Math.hypot(path[0].x - pos.x, path[0].z - pos.z) < 0.15) path.shift();
          const aim = path.length ? path[0] : c.target;
          const ad = Math.hypot(aim.x - pos.x, aim.z - pos.z) || 0.0001;
          let rem = ad;
          for (let k = 0; k < path.length; k++) rem += Math.hypot((k + 1 < path.length ? path[k + 1] : c.target).x - path[k].x, (k + 1 < path.length ? path[k + 1] : c.target).z - path[k].z);
          if (rem < c.bestD - 0.04) {
            c.bestD = rem;
            c.stuckT = 0;
          } else c.stuckT = (c.stuckT || 0) + dt;
          const stuck = c.stuckT > (c.mode === "ball" ? 2.5 : 1.6);
          if (stuck && c.mode === "ball") {
            c.stuckT = 0;
            c.bestD = 1e9;
          }
          if (d > reach && !(stuck && c.mode !== "ball")) {
            let ux = (aim.x - pos.x) / ad;
            let uz = (aim.z - pos.z) / ad;
            const ax = pos.x + ux * 0.45;
            const az = pos.z + uz * 0.45;
            if (!wet(c) && inPond(ax, az, PM)) {
              let nx = (pos.x - POND.x) / ((POND.rx + PM) * (POND.rx + PM));
              let nz = (pos.z - POND.z) / ((POND.rz + PM) * (POND.rz + PM));
              const nl = Math.hypot(nx, nz) || 1;
              nx /= nl;
              nz /= nl;
              let tx = -nz;
              let tz = nx;
              if (c.pondSide === undefined || !c.avoiding) c.pondSide = tx * ux + tz * uz >= 0 ? 1 : -1;
              tx *= c.pondSide;
              tz *= c.pondSide;
              ux = tx + nx * 0.25;
              uz = tz + nz * 0.25;
              const ul = Math.hypot(ux, uz) || 1;
              ux /= ul;
              uz /= ul;
              c.avoiding = true;
            } else c.avoiding = false;
            c.heading = Math.atan2(ux, uz);
            let dy = c.heading - c.holder.rotation.y;
            dy = Math.atan2(Math.sin(dy), Math.cos(dy));
            const align = Math.max(0, Math.cos(dy));
            const sp = (c.runSpeed || c.speed) * dt * (reduce ? 0.7 : 1) * (Math.abs(dy) > 0.9 ? 0 : align);
            const stepLen = Math.min(path.length ? ad : d, sp);
            pos.x += ux * stepLen;
            pos.z += uz * stepLen;
            moving = true;
          } else if (c.mode === "food") {
            if (c.berry) {
              c.berry.taken = true;
              scene.remove(c.berry.g);
              c.berry = null;
            }
            c.mode = "eating";
            c.target = null;
            c.face = 0;
            if (!play(c, "eat")) {
              c.mode = "idle";
              c.wait = 1;
              emote(c, "heart");
            }
          } else if (c.mode !== "ball") {
            c.target = null;
            const fn = c.then;
            c.then = null;
            if (fn) fn();
            else {
              c.mode = "idle";
              c.wait = rand(1.2, 3.5);
            }
          }
        }

        critters.forEach(o => {
          if (o === c || o.hidden) return;
          const dx = pos.x - o.holder.position.x;
          const dz = pos.z - o.holder.position.z;
          const d = Math.hypot(dx, dz);
          const min = Math.max(0.8, c.radius + o.radius + 0.12);
          if (d < min && d > 0.0001) {
            const push = (min - d) * 0.5;
            pos.x += (dx / d) * push * 0.5;
            pos.z += (dz / d) * push * 0.5;
          }
        });
        obstacles.forEach(o => {
          if (!o.r) return;
          const dx = pos.x - o.x;
          const dz = pos.z - o.z;
          const d = Math.hypot(dx, dz);
          const pad = Math.max(0.3, c.radius * 0.8);
          if (d < o.r + pad && d > 0.0001) {
            pos.x = o.x + (dx / d) * (o.r + pad);
            pos.z = o.z + (dz / d) * (o.r + pad);
          }
        });
        if (!inIsland(pos.x, pos.z, 0.45)) {
          pos.x *= 0.985;
          pos.z *= 0.985;
        }
        if (!wet(c) && inPond(pos.x, pos.z, PM - 0.06)) {
          const q = pondOut(pos.x, pos.z, PM - 0.06);
          pos.x = q[0];
          pos.z = q[1];
        }

        let faceYaw = null;
        if (moving) faceYaw = c.heading;
        else if (c.face !== null && c.face !== undefined) faceYaw = c.face;
        else if (c.faceTarget) {
          faceYaw = Math.atan2(c.faceTarget.holder.position.x - pos.x, c.faceTarget.holder.position.z - pos.z);
          if (!busy(c) && c.mode === "idle" && c.wait < 0.3) c.faceTarget = null;
        } else if (ball.on && !c.dying && (c.mode === "ball" || (c.mode === "idle" && !busy(c)))) faceYaw = Math.atan2(ball.g.position.x - pos.x, ball.g.position.z - pos.z);
        if (faceYaw !== null) {
          let dy = faceYaw - c.holder.rotation.y;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          c.holder.rotation.y += dy * Math.min(1, dt * 7);
        }

        const mv = c.def.move;
        const overPond = inPond(pos.x, pos.z, -0.05);
        if (moving) c.hopT += dt * 7.5 * ((c.runSpeed || c.speed) / c.speed);
        let hop = moving && mv !== "fly" ? Math.abs(Math.sin(c.hopT)) : 0;
        if (mv === "fly") {
          c.flyLift = lerp(c.flyLift || 0, c.dying ? 0 : moving ? 0.18 : 0.08, Math.min(1, dt * 2.5));
          c.scaler.position.y = c.flyLift + Math.sin(t * 1.8 + c.i * 1.7) * 0.05 * motion;
          c.scaler.rotation.x = lerp(c.scaler.rotation.x, moving ? 0.12 : 0, 0.06);
          c.scaler.rotation.z = lerp(c.scaler.rotation.z, moving ? Math.sin(t * 1.3 + c.i) * 0.05 * motion : 0, 0.06);
          c.scaler.scale.y = c.scaler.scale.x;
          c.blob.position.y = overPond ? 0.03 : 0.012;
        } else {
          const swimK = (c.swimK = lerp(c.swimK || 0, mv === "swim" && overPond ? 1 : 0, Math.min(1, dt * 4)));
          if (mv === "swim") {
            const inNow = swimK > 0.5;
            if (inNow !== !!c.inWater) {
              c.inWater = inNow;
              sfx(inNow ? "splash" : "plop", { pan: panOf(c), vol: 0.45 });
            }
            if (inNow && moving && t > (c.rippleAt || 0) && inPond(pos.x, pos.z, -0.2)) {
              c.rippleAt = t + 0.55;
              ripple(pos.x, pos.z, c.radius);
            }
          }
          hop *= 1 - swimK;
          const depth = (c.def.swimDepth === undefined ? 0.3 : c.def.swimDepth) * c.height;
          c.scaler.position.y = lerp(c.scaler.position.y, hop * (c.dying ? 0.05 : 0.14) * motion * (1 - swimK) - depth * swimK + Math.sin(t * 2 + c.i) * 0.02 * swimK * motion, 0.5);
          c.scaler.rotation.x = lerp(c.scaler.rotation.x, moving ? 0.08 * (1 - swimK) : 0, 0.2);
          const sq = moving ? 1 - (1 - hop) * 0.05 * (1 - swimK) : 1;
          c.scaler.scale.y = c.scaler.scale.x * sq;
        }

        if (t > c.blinkAt) {
          c.blinkStart = t;
          c.blinkAt = t + rand(2.5, 5.5);
        }
        const bp = (t - c.blinkStart) / 0.16;
        const blink = bp >= 0 && bp <= 1 ? 1 - Math.sin(bp * Math.PI) * 0.9 : 1;
        const camYaw = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z) - c.holder.rotation.y;
        const lk = c === selected || c.mode === "posing" ? Math.max(-1, Math.min(1, Math.atan2(Math.sin(camYaw), Math.cos(camYaw)) * 1.2)) : 0;
        c.look.x = lerp(c.look.x, lk, 0.1);
        c.look.y = lerp(c.look.y, c === selected ? 0.3 : 0, 0.1);
        const act = c.action ? { name: c.action.name, p: Math.min(1, (t - c.action.start) / c.action.dur), n: c.action.n } : null;
        c.pet.update({ t: t + c.i * 3.1, pointer: c.look, lookYaw: 0, lookPitch: 0, blink, action: act, hunger: c.hunger, life: c.life, joy: c.joy, dying: c.dying, motion, reduceMotion: reduce, swim: c.swimK || 0 });

        c.blob.material.opacity = (0.42 - hop * 0.14) * (1 - nightK * 0.35) * (1 - (c.swimK || 0)) * (mv === "fly" ? 0.75 : 1);
        c.sel.material.opacity = lerp(c.sel.material.opacity, (c === selected || c === hovered) && !c.hidden ? 0.9 : 0, 0.2);
        c.sel.rotation.z = t * 0.8;
      });

      for (let k = emotes.length - 1; k >= 0; k--) {
        const e = emotes[k];
        const age = t - e.t0;
        if (age > e.life || e.c.hidden) {
          e.el.remove();
          emotes.splice(k, 1);
          continue;
        }
        const [x, y] = project(e.c.holder.position, e.c.height + 0.15);
        e.el.style.translate = x + e.dx + "px " + (y - age * 18) + "px";
        e.el.style.opacity = Math.min(1, (e.life - age) * 4);
      }
      if (fx) {
        critters.forEach(c => {
          const show = c.purse >= 1 && !c.hidden;
          if (!show) {
            if (c.purseEl) c.purseEl.hidden = true;
            return;
          }
          if (!c.purseEl) {
            c.purseEl = document.createElement("div");
            c.purseEl.className = "hab-purse";
            c.purseEl.innerHTML = '<i class="coin" aria-hidden="true"></i><b></b>';
            fx.appendChild(c.purseEl);
            c.purseN = -1;
          }
          c.purseEl.hidden = false;
          if (c.purseN !== c.purse) {
            c.purseN = c.purse;
            c.purseEl.lastChild.textContent = String(c.purse);
            c.purseEl.classList.toggle("full", c.purseCap > 0 && c.purse >= c.purseCap);
          }
          const [x, y] = project(c.holder.position, c.height + 0.15);
          c.purseEl.style.transform = "translate(" + x + "px," + (y + Math.sin(t * 2.4 + c.i) * 2) + "px) translateX(-50%)";
        });
      }
      if (tagEl) {
        const tc = hoverTag && !hoverTag.hidden ? hoverTag : null;
        if (tc) {
          const [x, y] = project(tc.holder.position, tc.height + 0.1);
          tagEl.hidden = false;
          tagEl.textContent = tc.name;
          tagEl.style.transform = "translate(" + x + "px," + y + "px) translateX(-50%)";
        } else tagEl.hidden = true;
      }

      renderer.render(scene, camera);
    };
    let frames = 0;
    let acc = 0;
    let lastNow = 0;
    const tune = () => {
      const now = performance.now();
      const gap = lastNow ? now - lastNow : 0;
      lastNow = now;
      if (!gap || gap > 250) return;
      acc += gap;
      if (++frames < 45) return;
      const avg = acc / frames;
      frames = 0;
      acc = 0;
      if (avg > 21 && pr > 0.6) {
        pr = Math.max(0.6, +(pr - 0.2).toFixed(2));
        renderer.setPixelRatio(pr);
        if (cw && ch) renderer.setSize(cw, ch, false);
      }
    };
    const frame = () => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      tune();
      if (opts.paused && opts.paused()) {
        last = clock.getElapsedTime();
        return;
      }
      step();
    };
    const start = () => {
      if (running) return;
      running = true;
      audible = true;
      lastNow = 0;
      last = clock.getElapsedTime();
      resize();
      frame();
    };
    const stop = () => {
      running = false;
      audible = false;
      cancelAnimationFrame(raf);
      drag.on = false;
    };

    return {
      setParty,
      select: uid => {
        selected = uid ? byUid(uid) : null;
        if (selected && hoverTag === selected) hoverTag = null;
      },
      feed,
      pick: (x, y) => {
        const c = hitCritter(x, y);
        return c ? c.uid : null;
      },
      hover: uid => {
        hovered = uid ? byUid(uid) : null;
        hoverTag = hovered;
      },
      emote: (uid, kind) => {
        const c = byUid(uid);
        if (c) emote(c, kind);
      },
      coins: (uid, n) => {
        const c = byUid(uid);
        if (!c || !fx || c.hidden) return;
        c.purse = 0;
        const el = document.createElement("div");
        el.className = "hab-coinpop";
        el.innerHTML = '<i class="coin" aria-hidden="true"></i><b>+' + n + "</b>";
        const [x, y] = project(c.holder.position, c.height + 0.15);
        el.style.translate = x + "px " + y + "px";
        fx.appendChild(el);
        emotes.push({ el, c, t0: clock.getElapsedTime(), life: 1.3, dx: 0 });
      },
      cuddle: uid => {
        const c = byUid(uid);
        if (c && !c.hidden) cuddle(c);
      },
      throwBall,
      call,
      act: (uid, name) => {
        const c = byUid(uid);
        if (!c || c.hidden) return;
        if (name === "eat" && c.mode !== "eating") {
          c.mode = "idle";
          c.target = null;
          c.wait = 2;
          c.face = 0;
        }
        play(c, name, { cry: true }) || play(c, "jump", { cry: true });
      },
      hide: (uid, v) => {
        const c = byUid(uid);
        if (c) c.hidden = !!v;
      },
      setNight,
      isNight: () => night,
      resize,
      start,
      stop
    };
  }

  root.PetHabitat = { create };
})(typeof self !== "undefined" ? self : this);
