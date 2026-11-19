Pets.register({
  id: "candeloto",
  dex: 30,
  name: "Candeloto",
  color: "#f58fb0",
  types: ["light", "water"],
  move: "swim",
  swimDepth: 0.12,
  evolvesTo: "lotocirio",
  evolveLevel: 16,
  description: "Vive dentro de um botão de lótus que nunca abre de todo, com uma velinha acesa no topo. Passa as noites boiando rio abaixo, e dizem que cada pedido feito à beira d'água vira um pouco de cera nova na sua chama. Quando se assusta, se recolhe no botão e a luz quase apaga.",
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    spark: { duration: 1.8 },
    hide: { duration: 2.2 },
    attack: { duration: 1.0 }
  },
  battle: { special: { action: "spark", hit: 0.46, speed: 1.3 } },
  idle: [
    { action: "hide", min: 30, max: 60 },
    { action: "spark", min: 25, max: 55 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["jump", "spark", "hide"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);
    const body = new THREE.Group();
    body.position.z = -0.2;
    squash.add(body);

    const rgb = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
    const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
    const clamp01 = v => Math.max(0, Math.min(1, v));

    const IVORY = 0xf2d29c;
    const WAXSHADE = 0xd3a06a;
    const PINK = 0xf07aa6;
    const MAGENTA = 0xd24a86;
    const PETALBASE = 0xf9d3d2;
    const LEAF = 0x5fae4e;
    const LEAFLIGHT = 0x9bd45f;
    const LEAFDARK = 0x357a40;

    const BUD_Y0 = 0.34;
    const BUD_Y1 = 1.5;
    const BUD_ROWS = [
      [0, 0.86],
      [0.22, 1],
      [0.48, 0.9],
      [0.74, 0.6],
      [1, 0.26]
    ];
    const budR = y => {
      const s = clamp01((y - BUD_Y0) / (BUD_Y1 - BUD_Y0));
      let i = 0;
      while (i < BUD_ROWS.length - 2 && s > BUD_ROWS[i + 1][0]) i++;
      const a = BUD_ROWS[i];
      const b = BUD_ROWS[i + 1];
      const k = clamp01((s - a[0]) / (b[0] - a[0]));
      return 0.6 * lerp(a[1], b[1], k * k * (3 - 2 * k));
    };

    const skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
    const waxMat = mat(0xf7e3bd, 0.4);
    const petalMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
    const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, flatShading: true, side: THREE.DoubleSide });
    const trunkMat = mat(0xd9e2a6, 0.7);
    const trunkLine = mat(0xa9bd74, 0.7);
    const darkMat = mat(0x3a2218, 0.5);
    const mouthMat = mat(0x8a2f3e, 0.5);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc23a, roughness: 0.3, emissive: 0xff9a1a, emissiveIntensity: 0.8 });
    const spotMat = mat(0xf7a9c0, 0.5);

    {
      const pts = [];
      [
        [0.001, 0.11],
        [0.46, 0.11],
        [0.57, 0.14],
        [0.62, 0.2],
        [0.62, 0.3],
        [0.58, 0.36],
        [0.001, 0.38]
      ].forEach(p => pts.push(new THREE.Vector2(p[0], p[1])));
      body.add(mesh(new THREE.LatheGeometry(pts, 48), trunkMat));
      [0.19, 0.27].forEach(y => {
        const ring = mesh(new THREE.TorusGeometry(0.622, 0.008, 6, 64), trunkLine, false);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
        body.add(ring);
      });
    }

    {
      const pts = [];
      for (let i = 0; i <= 28; i++) {
        const y = lerp(BUD_Y0, BUD_Y1, i / 28);
        pts.push(new THREE.Vector2(budR(y) * 0.95, y));
      }
      pts.push(new THREE.Vector2(0.001, BUD_Y1 + 0.02));
      body.add(mesh(new THREE.LatheGeometry(pts, 40), mat(0xe0699b, 0.55)));
    }

    const petalGeo = o => {
      const NU = 18;
      const NV = 12;
      const pos = [];
      const col = [];
      const idx = [];
      const cBase = rgb(PETALBASE);
      const cMid = rgb(PINK);
      const cTip = rgb(MAGENTA);
      const pivot = [0, o.y0, budR(o.y0) * o.k];
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        const y = o.y0 + u * o.len;
        const f = Math.pow(1 - u, 0.55) * (0.8 + 0.5 * u);
        for (let j = 0; j <= NV; j++) {
          const v = (j / NV) * 2 - 1;
          const th = v * o.wide * f;
          const r = budR(y) * o.k + o.peel * 0.22 * u * u * u + 0.04 * (1 - v * v) * Math.sin(Math.PI * u) - 0.015 * v * v;
          pos.push(r * Math.sin(th) - pivot[0], y - pivot[1], r * Math.cos(th) - pivot[2]);
          let c = u < 0.22 ? mix3(cBase, cMid, u / 0.22) : mix3(cMid, cTip, (u - 0.22) / 0.78);
          const vein = Math.pow(1 - Math.abs(v), 8) * 0.16 * (1 - u * 0.6);
          c = mix3(c, cBase, vein);
          c = mix3(c, cTip, Math.pow(Math.abs(v), 3) * 0.4 + smooth(0.8, 1, u) * 0.3);
          col.push(c[0], c[1], c[2]);
        }
      }
      for (let i = 0; i < NU; i++)
        for (let j = 0; j < NV; j++) {
          const a = i * (NV + 1) + j;
          const b = a + NV + 1;
          idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return { g, pivot };
    };

    const petals = [];
    const addPetals = (n, offset, o, movable) => {
      const { g, pivot } = petalGeo(o);
      for (let i = 0; i < n; i++) {
        const holder = new THREE.Group();
        holder.rotation.y = offset + (i / n) * Math.PI * 2;
        const m = mesh(g, petalMat);
        m.position.set(pivot[0], pivot[1], pivot[2]);
        holder.add(m);
        body.add(holder);
        if (movable) petals.push({ m, ph: i * 1.3 });
      }
    };
    addPetals(5, 0, { y0: 0.5, len: 0.94, wide: 0.74, k: 1.03, peel: 0 }, false);
    addPetals(5, Math.PI / 5, { y0: 0.36, len: 0.74, wide: 0.68, k: 1.11, peel: 0.55 }, true);

    const foldGeo = (w, h, d, light, dark) => {
      const A = [-w, 0, 0];
      const B = [w, 0, 0];
      const C = [0, 0, d];
      const T = [0, h, d * 0.3];
      const faces = [
        [A, C, T, light],
        [C, B, T, dark],
        [B, A, T, LEAFDARK],
        [A, B, C, LEAFDARK]
      ];
      const pos = [];
      const col = [];
      faces.forEach(([p, q, r, c]) => {
        const cc = rgb(c);
        const tip = mix3(cc, rgb(0xd8e27a), 0.35);
        [p, q, r].forEach(v => {
          pos.push(v[0], v[1], v[2]);
          const k = v === T ? tip : cc;
          col.push(k[0], k[1], k[2]);
        });
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    };
    const folds = [];
    const foldA = foldGeo(0.23, 0.46, 0.11, LEAFLIGHT, LEAF);
    const foldB = foldGeo(0.2, 0.34, 0.09, LEAF, LEAFDARK);
    const FOLDS = 10;
    for (let i = 0; i < FOLDS; i++) {
      [0, 1].forEach(layer => {
        let a = ((i + layer * 0.5) / FOLDS) * Math.PI * 2;
        const front = Math.min(a, Math.PI * 2 - a);
        if (front < 0.7) return;
        const holder = new THREE.Group();
        holder.rotation.y = a;
        const m = mesh(layer ? foldB : foldA, leafMat);
        m.position.set(0, layer ? 0.31 : 0.35, layer ? 0.6 : 0.58);
        m.rotation.x = layer ? 1.05 : 0.5;
        m.userData.rx = m.rotation.x;
        holder.add(m);
        body.add(holder);
        folds.push({ m, ph: i * 0.9 + layer });
      });
    }

    {
      const LOBES = [
        [0.55, 0.3],
        [1.9, 0.15],
        [3.3, 0.38],
        [4.4, 0.11],
        [5.5, 0.23]
      ];
      const lobe = th =>
        LOBES.reduce((acc, [c, len]) => {
          let d = Math.abs(th - c);
          d = Math.min(d, Math.PI * 2 - d);
          return Math.max(acc, len * Math.exp(-Math.pow(d / 0.15, 4)));
        }, 0);
      const NT = 120;
      const NS = 28;
      const pos = [];
      const idx = [];
      for (let i = 0; i <= NT; i++) {
        const th = (i / NT) * Math.PI * 2;
        const drip = lobe(th);
        const yEnd = 1.31 - drip - 0.012 * Math.sin(th * 7);
        for (let j = 0; j <= NS; j++) {
          const q = j / NS;
          const y = lerp(1.575, yEnd, q);
          const dome = 0.3 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 1.33) / 0.245, 2)));
          const surf = budR(y) * 1.06 + 0.03;
          let r = y > 1.33 ? Math.min(dome, surf + 0.02) : surf;
          const along = drip > 0.02 ? clamp01((1.31 - y) / drip) : 0;
          r += 0.03 * smooth(0.55, 0.9, along) * (1 - smooth(0.93, 1, q)) * Math.min(1, drip * 8);
          r -= 0.028 * smooth(0.94, 1, q);
          pos.push(Math.sin(th) * r, y, Math.cos(th) * r);
        }
      }
      for (let i = 0; i < NT; i++)
        for (let j = 0; j < NS; j++) {
          const k = i * (NS + 1) + j;
          const n = k + NS + 1;
          idx.push(k, k + 1, n, n, k + 1, n + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      body.add(mesh(g, waxMat));
      const wick = mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.1, 8), darkMat, false);
      wick.position.set(0.006, 1.6, 0);
      wick.rotation.z = -0.18;
      body.add(wick);
    }

    const flameGeo = (h, w) => {
      const pts = [];
      for (let i = 0; i <= 18; i++) {
        const u = i / 18;
        const r = w * Math.sin(Math.PI * Math.pow(u, 0.6)) * (1 - 0.4 * u);
        pts.push(new THREE.Vector2(Math.max(r, 0.0001), u * h));
      }
      return new THREE.LatheGeometry(pts, 20);
    };
    const flame = new THREE.Group();
    flame.position.set(0, 1.62, 0);
    flame.add(new THREE.Mesh(flameGeo(0.42, 0.125), new THREE.MeshBasicMaterial({ color: 0xff8f1a, side: THREE.BackSide })));
    const flameMid = new THREE.Mesh(flameGeo(0.3, 0.085), new THREE.MeshBasicMaterial({ color: 0xffc93a, side: THREE.BackSide }));
    flameMid.position.y = 0.012;
    const flameCore = new THREE.Mesh(flameGeo(0.15, 0.045), new THREE.MeshBasicMaterial({ color: 0xfffbe6 }));
    flameCore.position.y = 0.03;
    flame.add(flameMid, flameCore);
    body.add(flame);

    let haloTex = null;
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      c.width = c.height = 96;
      const g2 = c.getContext("2d");
      const gr = g2.createRadialGradient(48, 48, 0, 48, 48, 48);
      gr.addColorStop(0, "rgba(255,236,170,0.9)");
      gr.addColorStop(0.35, "rgba(255,190,90,0.35)");
      gr.addColorStop(1, "rgba(255,170,60,0)");
      g2.fillStyle = gr;
      g2.fillRect(0, 0, 96, 96);
      haloTex = new THREE.CanvasTexture(c);
    }
    const spriteMat = () => new THREE.SpriteMaterial({ map: haloTex, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const halo = new THREE.Sprite(spriteMat());
    halo.position.set(0, 1.8, 0);
    body.add(halo);
    const motes = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(spriteMat());
      body.add(s);
      motes.push({ s, ph: i / 6, a: i * 2.4, rad: 0.25 + (i % 3) * 0.16 });
    }
    const light = new THREE.PointLight(0xffc270, 0.6, 5);
    light.position.set(0, 1.9, 0.3);
    body.add(light);

    const headPt = (nx, ny, nz) => {
      let x = nx * 0.42;
      const y = ny * (ny < 0 ? 0.31 : 0.35);
      let z = nz * 0.4;
      if (nz > 0) {
        const s = Math.exp(-(Math.pow(nx / 0.5, 2) + Math.pow((ny + 0.2) / 0.45, 2)));
        z += 0.1 * s * nz;
        x *= 1 - 0.1 * nz;
      }
      x += Math.sign(nx) * 0.045 * Math.exp(-Math.pow((ny + 0.35) / 0.32, 2)) * Math.abs(nx);
      return [x, y, z];
    };
    const face = (yaw, pitch, lift = 1) => {
      const p = headPt(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      return new THREE.Vector3(p[0] * lift, p[1] * lift, p[2] * lift);
    };

    const head = new THREE.Group();
    head.position.set(0, 0.58, 0.9);
    body.add(head);
    {
      const g = new THREE.SphereGeometry(1, 56, 40);
      const p = g.attributes.position;
      const col = new Float32Array(p.count * 3);
      const top = rgb(IVORY);
      const low = rgb(WAXSHADE);
      for (let i = 0; i < p.count; i++) {
        const q = headPt(p.getX(i), p.getY(i), p.getZ(i));
        const c = mix3(low, top, smooth(-0.9, 0.2, p.getY(i)));
        p.setXYZ(i, q[0], q[1], q[2]);
        col.set(c, i * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      head.add(mesh(g, skinMat));
    }
    {
      const g = new THREE.CylinderGeometry(0.21, 0.25, 0.62, 28, 1, true);
      g.rotateX(Math.PI / 2);
      const col = new Float32Array(g.attributes.position.count * 3);
      const low = rgb(WAXSHADE);
      const top = rgb(IVORY);
      for (let i = 0; i < g.attributes.position.count; i++) col.set(mix3(low, top, smooth(-0.2, 0.15, g.attributes.position.getY(i))), i * 3);
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const neck = mesh(g, skinMat);
      neck.position.set(0, -0.1, -0.42);
      head.add(neck);
      [-0.3, -0.42].forEach((z, i) => {
        const fold = mesh(new THREE.TorusGeometry(0.222 + i * 0.012, 0.022, 8, 32), mat(WAXSHADE, 0.5), false);
        fold.position.set(0, -0.1, z);
        head.add(fold);
      });
    }

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.8, whiteColor: 0xffffff, pupilColor: 0x3a2014 });
      e.g.position.copy(face(0.6 * s, 0.14, 0.9));
      e.g.rotation.set(-0.1, 0.5 * s, 0);
      head.add(e.g);
      return e;
    });

    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf78fb0, transparent: true, opacity: 0.6 });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), cheekMat);
      c.scale.set(1.15, 0.7, 1);
      c.position.copy(face(0.92 * s, -0.32, 1.012));
      c.rotation.set(0.28, 0.95 * s, 0);
      head.add(c);
    });

    [-1, 1].forEach(s => {
      const n = mesh(new THREE.SphereGeometry(0.014, 8, 8), darkMat, false);
      n.scale.set(1, 1.4, 0.6);
      n.position.copy(face(0.09 * s, -0.12, 1.0));
      head.add(n);
    });

    const mouthLine = (() => {
      const p = [];
      for (let i = 0; i <= 16; i++) {
        const yaw = lerp(-0.42, 0.42, i / 16);
        const a = Math.abs(yaw) / 0.42;
        const pitch = -0.4 - 0.06 * Math.max(0, 1 - a / 0.3) + 0.17 * a * a;
        p.push(face(yaw, pitch, 1.005));
      }
      return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 40, 0.011, 6, false), darkMat, false);
    })();
    head.add(mouthLine);
    const mouthOpen = mesh(new THREE.SphereGeometry(1, 20, 14), mouthMat, false);
    mouthOpen.scale.set(0.11, 0.07, 0.05);
    mouthOpen.position.copy(face(0, -0.56, 0.98));
    mouthOpen.visible = false;
    head.add(mouthOpen);

    {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0.085);
      sh.bezierCurveTo(0.012, 0.04, 0.05, 0.01, 0.05, -0.03);
      sh.bezierCurveTo(0.05, -0.075, -0.05, -0.075, -0.05, -0.03);
      sh.bezierCurveTo(-0.05, 0.01, -0.012, 0.04, 0, 0.085);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 14 });
      const mark = mesh(g, goldMat, false);
      mark.position.copy(face(0, 0.6, 0.985));
      mark.rotation.x = -1.0;
      mark.scale.setScalar(0.85);
      head.add(mark);
    }

    const muzzle = new THREE.Group();
    muzzle.position.copy(face(0, -0.3, 1.25));
    head.add(muzzle);

    const flipperGeo = (() => {
      const sh = new THREE.Shape();
      sh.moveTo(0, -0.08);
      sh.quadraticCurveTo(0.18, -0.21, 0.38, -0.18);
      sh.quadraticCurveTo(0.53, -0.17, 0.47, -0.065);
      sh.bezierCurveTo(0.59, -0.075, 0.59, 0.075, 0.47, 0.065);
      sh.quadraticCurveTo(0.53, 0.17, 0.38, 0.18);
      sh.quadraticCurveTo(0.18, 0.21, 0, 0.08);
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 4, curveSegments: 16 });
      g.translate(0, 0, -0.0175);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      const col = new Float32Array(p.count * 3);
      const a = rgb(IVORY);
      const b = rgb(0xf9b6c6);
      const low = rgb(WAXSHADE);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        p.setY(i, p.getY(i) - 0.18 * x * x);
        let c = mix3(a, b, smooth(0.3, 0.58, x));
        if (p.getY(i) + 0.18 * x * x < -0.01) c = mix3(c, low, 0.7);
        col.set(c, i * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    })();
    const flippers = [
      { x: 0.46, y: 0.2, z: 0.4, yaw: -0.55, size: 1, front: true },
      { x: 0.46, y: 0.2, z: 0.4, yaw: -0.55, size: 1, front: true, mirror: true },
      { x: 0.44, y: 0.18, z: -0.36, yaw: 0.95, size: 0.72, front: false },
      { x: 0.44, y: 0.18, z: -0.36, yaw: 0.95, size: 0.72, front: false, mirror: true }
    ].map((F, i) => {
      const side = new THREE.Group();
      if (F.mirror) side.scale.x = -1;
      const pivot = new THREE.Group();
      pivot.position.set(F.x, F.y, F.z);
      pivot.rotation.set(0, F.yaw, -0.22);
      pivot.scale.setScalar(F.size);
      pivot.add(mesh(flipperGeo, skinMat));
      [
        [0.2, 0, 0.045],
        [0.31, -0.07, 0.035],
        [0.31, 0.07, 0.035]
      ].forEach(([x, w, r]) => {
        const spot = mesh(new THREE.SphereGeometry(r, 12, 8), spotMat, false);
        spot.scale.y = 0.45;
        spot.position.set(x, 0.062 - 0.18 * x * x, w);
        pivot.add(spot);
      });
      side.add(pivot);
      body.add(side);
      return { pivot, F, ph: i * 1.7 };
    });

    const tail = mesh(new THREE.ConeGeometry(0.07, 0.24, 14), mat(WAXSHADE, 0.5));
    tail.position.set(0, 0.2, -0.66);
    tail.rotation.x = -1.9;
    body.add(tail);

    const ripples = [0, 1].map(i => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.86, 0.93, 64), new THREE.MeshBasicMaterial({ color: 0xa8e6ec, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.02;
      root.add(m);
      return { m, ph: i * 0.5 };
    });

    const spark = new THREE.Group();
    const sparkCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
    sparkCore.scale.set(0.7, 1.3, 0.7);
    const sparkHalo = new THREE.Sprite(spriteMat());
    sparkHalo.scale.setScalar(0.9);
    spark.add(sparkCore, sparkHalo);
    spark.visible = false;
    root.add(spark);

    const food = berry();
    food.visible = false;
    squash.add(food);

    return {
      root,
      muzzle,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const is = n => (action && action.name === n ? action : null);
        const jump = is("jump");
        const eat = is("eat");
        const cast = is("spark");
        const hideA = is("hide");
        const atk = is("attack") ? strike(action.p) : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const fire = s.dying ? 0.35 : 0.6 + 0.4 * clamp01(hunger / 100);

        let y = Math.sin(t * 1.7) * 0.035 * motion;
        let z = 0;
        let sy = 1 + Math.sin(t * 1.7 + 0.8) * 0.012 * motion;
        let pitch = Math.sin(t * 1.1) * 0.03 * motion;
        let roll = Math.sin(t * 0.85) * 0.045 * motion;
        let open = 0.02 + Math.sin(t * 1.3) * 0.02 * motion;
        let hide = 0;
        let flameK = 1;
        let mouth = false;
        let squint = 0;
        let headZ = 0;
        let flap = 0;
        let airborne = false;
        let charge = 0;
        let burst = 0;

        if (jump) {
          const p = jump.p;
          if (p < 0.2) sy = 1 - 0.16 * Math.sin((p / 0.2) * Math.PI * 0.5);
          else if (p < 0.8) {
            const q = (p - 0.2) / 0.6;
            y = Math.sin(q * Math.PI) * 0.95;
            sy = 1 + 0.08 * Math.cos(q * Math.PI);
            open = 0.1 + Math.sin(q * Math.PI) * 0.32;
            flap = Math.sin(q * Math.PI);
            airborne = true;
            mouth = q > 0.15 && q < 0.75;
            flameK = 1 + Math.sin(q * Math.PI) * 0.35;
          } else sy = 1 - 0.13 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
        }
        if (hideA) {
          const p = hideA.p;
          hide = smooth(0.04, 0.2, p) * (1 - smooth(0.72, 0.86, p));
          const peek = smooth(0.42, 0.5, p) * (1 - smooth(0.56, 0.64, p));
          hide *= 1 - peek * 0.35;
          open = -0.06 * hide + smooth(0.84, 0.9, p) * (1 - smooth(0.9, 1, p)) * 0.25;
          flameK = 1 - hide * 0.78;
          sy -= hide * 0.04;
          roll += Math.sin(p * 60) * 0.02 * hide * motion;
        }
        if (cast) {
          const p = cast.p;
          charge = smooth(0, 0.36, p) * (1 - smooth(0.38, 0.46, p));
          burst = smooth(0.4, 0.47, p) * (1 - smooth(0.56, 0.95, p));
          sy += -charge * 0.1 + burst * 0.08;
          flameK = 1 - charge * 0.7 + burst * 1.5;
          open = charge * -0.04 + burst * 0.42;
          squint = charge > 0.3 ? 0.75 : 0;
          mouth = burst > 0.25;
          pitch += -burst * 0.14 + charge * 0.06;
          roll += Math.sin(p * 80) * 0.025 * charge * motion;
        }
        if (eat) {
          headZ = Math.sin(clamp01(ph.fall) * Math.PI * 0.5) * 0.1;
          sy += -ph.chew * 0.04 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.0, 0.46, ph.fall * ph.fall), lerp(0.9, 1.16, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = (1 - ph.fall) * 1.2;
          mouth = eat.p > 0.14 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3 ? 0.6 : 0;
          open = 0.06 + ph.chew * 0.05;
        } else food.visible = false;
        if (atk) {
          hide = atk.wind * 0.6;
          headZ = atk.lunge * 0.22;
          z = atk.lunge * 0.75 - atk.wind * 0.15;
          y += Math.sin(Math.min(1, atk.lunge * 1.2) * Math.PI) * 0.22;
          pitch += atk.lunge * 0.2 - atk.wind * 0.1;
          sy += -atk.wind * 0.08 + atk.lunge * 0.05;
          open = atk.lunge * 0.3;
          flameK = 1 - atk.wind * 0.4 + atk.impact * 1.2;
          squint = atk.lunge > 0.3 ? 0.7 : 0;
          mouth = atk.lunge > 0.2;
          flap = atk.lunge;
        }

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.set(0, y, z);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        body.rotation.x = pitch;
        body.rotation.z = roll;

        head.position.z = lerp(head.position.z, 0.9 + headZ - hide * 0.52, 0.3);
        head.position.y = lerp(head.position.y, 0.58 - hide * 0.1, 0.3);
        head.scale.setScalar(lerp(head.scale.x, 1 - hide * 0.42, 0.3));
        head.rotation.y = lerp(head.rotation.y, pointer.x * 0.4 * (1 - hide), 0.12);
        head.rotation.x = lerp(head.rotation.x, -pointer.y * 0.22 * (1 - hide) + (eat ? 0.12 : 0), 0.12);
        head.rotation.z = Math.sin(t * 1.2) * 0.05 * motion * (1 - hide);

        mouthLine.visible = !mouth;
        mouthOpen.visible = mouth;
        mouthOpen.scale.y = eat ? 0.04 + ph.chew * 0.05 : 0.07;

        flippers.forEach(({ pivot, F, ph: fp }) => {
          const paddle = Math.sin(t * 2.3 + fp) * motion;
          const k = 1 - hide * 0.8;
          pivot.rotation.y = F.yaw + paddle * (F.front ? 0.3 : 0.2) * k - flap * (F.front ? 0.3 : -0.2);
          pivot.rotation.z = -0.22 + Math.cos(t * 2.3 + fp) * 0.12 * motion * k + flap * 0.75 + (airborne ? 0.1 : 0);
          pivot.scale.setScalar(lerp(pivot.scale.x, F.size * (1 - hide * 0.75), 0.3));
        });
        tail.rotation.y = Math.sin(t * 3.1) * 0.35 * motion;

        petals.forEach(({ m, ph: pp }) => {
          m.rotation.x = lerp(m.rotation.x, open + Math.sin(t * 1.5 + pp) * 0.012 * motion, 0.25);
        });
        folds.forEach(({ m, ph: fp }) => {
          m.rotation.x = m.userData.rx + Math.sin(t * 1.9 + fp) * 0.03 * motion + open * 0.35;
        });

        const fk = flameK * fire;
        const flick = 1 + 0.1 * Math.sin(t * 11) + 0.06 * Math.sin(t * 19.3);
        flame.scale.set(fk * (1 + 0.06 * Math.sin(t * 7.3)), Math.max(0.05, fk * flick), fk * (1 + 0.06 * Math.sin(t * 8.1)));
        flame.rotation.z = Math.sin(t * 2.7) * 0.1 * motion - roll * 1.5;
        flame.rotation.x = Math.sin(t * 2.1) * 0.06 * motion - pitch;
        halo.scale.setScalar((0.95 + 0.08 * Math.sin(t * 9) + burst * 0.8) * (0.35 + Math.min(fk, 1.5) * 0.65));
        halo.material.opacity = 0.75 * Math.min(1, fk);
        light.intensity = (0.5 + 0.08 * Math.sin(t * 11) + burst * 1.8) * fk;
        goldMat.emissiveIntensity = 0.6 + 0.25 * Math.sin(t * 3) * motion + burst * 1.2;

        motes.forEach(mo => {
          const u = (((t * 0.16 + mo.ph) % 1) + 1) % 1;
          const a = mo.a + t * 0.6;
          mo.s.position.set(Math.sin(a) * mo.rad * (0.5 + u), 1.75 + u * 1.0, Math.cos(a) * mo.rad * (0.5 + u));
          mo.s.scale.setScalar(0.11 * Math.sin(Math.PI * u) * (0.5 + fk * 0.5));
          mo.s.material.opacity = Math.sin(Math.PI * u) * Math.min(1, fk);
        });

        ripples.forEach(r => {
          const u = (((t * 0.32 + r.ph) % 1) + 1) % 1;
          r.m.scale.setScalar(0.85 + u * 0.75);
          r.m.material.opacity = airborne ? 0 : 0.42 * (1 - u) * (1 - u);
        });

        if (cast && cast.p > 0.42 && cast.p < 0.97) {
          const q = (cast.p - 0.42) / 0.55;
          spark.visible = true;
          spark.position.set(0, 0.3 + Math.abs(Math.sin(q * Math.PI * 3)) * (1.5 - q * 1.1) + (1 - Math.min(1, q * 6)) * 1.4, 0.2 + q * 3.2);
          spark.rotation.set(t * 7, t * 9, 0);
          const k = Math.sin(Math.PI * Math.min(1, q * 1.05));
          spark.scale.setScalar(0.4 + k * 0.9);
          sparkHalo.material.opacity = k;
        } else spark.visible = false;

        const lid = squint ? 1 - squint : blink;
        const shut = hide > 0.6 ? 0.25 : 1;
        eyes.forEach(({ g }) => {
          g.scale.y = Math.max(0.08, lid * shut) * (airborne ? 1.08 : 1);
        });
        followPupils(eyes, pointer, 0.8);
      }
    };
  }
});
