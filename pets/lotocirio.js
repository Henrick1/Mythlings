Pets.register({
  id: "lotocirio",
  dex: 31,
  name: "Lotocírio",
  color: "#f07aa6",
  types: ["light", "water"],
  move: "swim",
  swimDepth: 0.15,
  evolvesTo: "lanternaga",
  evolveLevel: 32,
  description: "O botão finalmente se abre e o Candeloto se levanta de dentro da flor, com um círio aceso equilibrado na cabeça. Anda devagar, de mãos juntas, cumprimentando quem encontra pelo caminho, e nunca deixa a chama apagar. O incenso que carrega nas pétalas guia de volta quem se perdeu no rio.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    bless: { duration: 2.4 },
    bow: { duration: 2.2 },
    attack: { duration: 1.1 }
  },
  battle: { special: { action: "bless", hit: 0.5, speed: 1.3 } },
  idle: [
    { action: "bow", min: 28, max: 55 },
    { action: "bless", min: 30, max: 60 },
    { action: "jump", min: 45, max: 85 }
  ],
  clickAction: n => ["bow", "bless", "jump"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);
    const body = new THREE.Group();
    squash.add(body);

    const rgb = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
    const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const table = rows => x => {
      let i = 0;
      while (i < rows.length - 2 && x > rows[i + 1][0]) i++;
      const a = rows[i];
      const b = rows[i + 1];
      const k = clamp01((x - a[0]) / (b[0] - a[0]));
      return lerp(a[1], b[1], k * k * (3 - 2 * k));
    };
    const colored = (g, fn) => {
      const p = g.attributes.position;
      const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) col.set(fn(p.getX(i), p.getY(i), p.getZ(i)), i * 3);
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return g;
    };

    const IVORY = 0xf2d29c;
    const WAXSHADE = 0xd3a06a;
    const BELLY = 0xffe8b4;
    const PINK = 0xf07aa6;
    const MAGENTA = 0xd24a86;
    const PETALBASE = 0xf9d3d2;
    const LEAF = 0x5fae4e;
    const LEAFLIGHT = 0x9bd45f;
    const LEAFDARK = 0x357a40;

    const skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
    const waxMat = mat(0xf7e3bd, 0.4);
    const petalMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide, emissive: 0xe0508c, emissiveIntensity: 0.32 });
    const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, flatShading: true, side: THREE.DoubleSide });
    const trunkMat = mat(0xd9e2a6, 0.7);
    const trunkLine = mat(0xa9bd74, 0.7);
    const darkMat = mat(0x3a2218, 0.5);
    const seamMat = mat(0xd9a45e, 0.6);
    const mouthMat = mat(0x8a2f3e, 0.5);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc23a, roughness: 0.28, metalness: 0.3, emissive: 0xff9a1a, emissiveIntensity: 0.7 });
    const spotMat = mat(0xf7a9c0, 0.5);
    const beadMat = mat(0xfffaf0, 0.4);
    const podMat = mat(0xc9d468, 0.6);
    const podDark = mat(0x8ea23c, 0.6);
    const seedMat = mat(0x5c6a22, 0.4);
    const stamenMat = mat(0xffd84a, 0.5);
    const marigoldA = mat(0xff8a1e, 0.7);
    const marigoldB = mat(0xffb52e, 0.7);
    const stickMat = mat(0xa8452e, 0.7);
    const ashMat = mat(0x6a5a52, 0.8);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a });

    {
      const pts = [
        [0.001, 0.15],
        [0.46, 0.15],
        [0.57, 0.18],
        [0.62, 0.24],
        [0.62, 0.36],
        [0.58, 0.42],
        [0.001, 0.44]
      ].map(p => new THREE.Vector2(p[0], p[1]));
      body.add(mesh(new THREE.LatheGeometry(pts, 56), trunkMat));
      [0.24, 0.32].forEach(y => {
        const ring = mesh(new THREE.TorusGeometry(0.622, 0.008, 6, 72), trunkLine, false);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
        body.add(ring);
      });
      const cup = [
        [0.6, 0.42],
        [0.52, 0.52],
        [0.44, 0.66],
        [0.4, 0.8]
      ].map(p => new THREE.Vector2(p[0], p[1]));
      const cupMesh = mesh(new THREE.LatheGeometry(cup, 48), new THREE.MeshStandardMaterial({ color: 0xe0699b, roughness: 0.55, side: THREE.DoubleSide }));
      body.add(cupMesh);
    }

    const foldGeo = (w, h, d, light, dark) => {
      const A = [-w, 0, 0];
      const B = [w, 0, 0];
      const C = [0, 0, d];
      const T = [0, h, d * 0.3];
      const pos = [];
      const col = [];
      [
        [A, C, T, light],
        [C, B, T, dark],
        [B, A, T, LEAFDARK],
        [A, B, C, LEAFDARK]
      ].forEach(([p, q, r, c]) => {
        const cc = rgb(c);
        const tip = mix3(cc, rgb(0xd8e27a), 0.35);
        [p, q, r].forEach(v => {
          pos.push(v[0], v[1], v[2]);
          col.push(...(v === T ? tip : cc));
        });
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    };
    const folds = [];
    {
      const foldA = foldGeo(0.2, 0.4, 0.1, LEAFLIGHT, LEAF);
      const foldB = foldGeo(0.18, 0.3, 0.08, LEAF, LEAFDARK);
      const N = 12;
      for (let i = 0; i < N; i++)
        [0, 1].forEach(layer => {
          const holder = new THREE.Group();
          holder.rotation.y = ((i + layer * 0.5) / N) * Math.PI * 2;
          const m = mesh(layer ? foldB : foldA, leafMat);
          m.position.set(0, layer ? 0.36 : 0.4, layer ? 0.6 : 0.58);
          m.rotation.x = layer ? 1.35 : 0.95;
          m.userData.rx = m.rotation.x;
          holder.add(m);
          body.add(holder);
          folds.push({ m, ph: i * 0.9 + layer });
        });
    }

    const petalGeo = o => {
      const NU = 20;
      const NV = 12;
      const pos = [];
      const col = [];
      const idx = [];
      const cBase = rgb(o.base ?? PETALBASE);
      const cMid = rgb(o.mid ?? PINK);
      const cTip = rgb(o.tip ?? MAGENTA);
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        const f = 0.3 * (1 - u) + (0.7 * Math.pow(u, 0.45) * Math.pow(1 - u, 0.6)) / 0.488;
        for (let j = 0; j <= NV; j++) {
          const v = (j / NV) * 2 - 1;
          pos.push(v * o.w * f, u * o.len, o.cup * (1 - v * v) * f - o.cup * 0.6 * f + o.bend * u * u + 0.03 * v * v * v * v * u);
          let c = u < 0.25 ? mix3(cBase, cMid, u / 0.25) : mix3(cMid, cTip, (u - 0.25) / 0.75);
          c = mix3(c, cBase, Math.pow(1 - Math.abs(v), 8) * 0.18 * (1 - u * 0.6));
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
      return g;
    };
    const petals = [];
    const ring = (n, offset, geo, y, r, tilt, layer) => {
      for (let i = 0; i < n; i++) {
        const holder = new THREE.Group();
        holder.rotation.y = offset + (i / n) * Math.PI * 2;
        const m = mesh(geo, petalMat);
        m.position.set(0, y, r);
        m.rotation.x = tilt;
        holder.add(m);
        body.add(holder);
        petals.push({ m, tilt, layer, ph: i * 1.3 + layer });
      }
    };
    ring(8, 0, petalGeo({ w: 0.3, len: 0.72, cup: 0.12, bend: -0.2 }), 0.44, 0.5, 1.08, 0);
    ring(8, Math.PI / 8, petalGeo({ w: 0.27, len: 0.56, cup: 0.12, bend: -0.16, base: 0xfde6e2, mid: 0xf7a3c0, tip: 0xe5679b }), 0.48, 0.42, 0.82, 1);

    const blobGeo = new THREE.SphereGeometry(1, 12, 10);
    const marigold = r => {
      const g = new THREE.Group();
      [
        [11, 0.78, 0.0, 1.15, marigoldA],
        [8, 0.5, 0.2, 0.75, marigoldB],
        [5, 0.24, 0.36, 0.38, marigoldA]
      ].forEach(([n, rad, y, lean, m], tier) => {
        for (let i = 0; i < n; i++) {
          const a = ((i + tier * 0.5) / n) * Math.PI * 2;
          const holder = new THREE.Group();
          holder.rotation.y = a;
          const b = mesh(blobGeo, m, false);
          b.scale.set(r * 0.3, r * 0.13, r * 0.36);
          b.position.set(0, r * y, r * rad);
          b.rotation.x = -lean + 0.9;
          holder.add(b);
          g.add(holder);
        }
      });
      const heart = mesh(blobGeo, marigoldB, false);
      heart.scale.set(r * 0.26, r * 0.2, r * 0.26);
      heart.position.y = r * 0.46;
      g.add(heart);
      const calyx = mesh(new THREE.ConeGeometry(r * 0.6, r * 0.6, 10), mat(LEAFDARK, 0.6), false);
      calyx.rotation.x = Math.PI;
      calyx.position.y = -r * 0.3;
      g.add(calyx);
      return g;
    };
    [0.39, -0.39, 1.96, -1.96, 3.14].forEach((a, i) => {
      const f = marigold(0.17 + (i % 2) * 0.02);
      f.position.set(Math.sin(a) * 0.74, 0.62, Math.cos(a) * 0.74);
      f.rotation.set(Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7);
      body.add(f);
    });

    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const st = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 5), stamenMat, false);
      const lean = 0.5 + (i % 3) * 0.12;
      st.position.set(Math.sin(a) * 0.43, 0.84, Math.cos(a) * 0.43);
      st.rotation.set(Math.cos(a) * lean, 0, -Math.sin(a) * lean);
      const tip = mesh(new THREE.SphereGeometry(0.02, 8, 6), stamenMat, false);
      tip.scale.y = 1.5;
      tip.position.y = 0.08;
      st.add(tip);
      body.add(st);
    }

    const smokes = [];
    const smokeMat = () => new THREE.MeshBasicMaterial({ color: 0xf2ece4, transparent: true, opacity: 0.3, depthWrite: false });
    [
      [2.42, 0.2, 0.52],
      [2.62, -0.05, 0.6],
      [2.82, -0.28, 0.5]
    ].forEach(([a, lean, h], i) => {
      const g = new THREE.Group();
      g.position.set(Math.sin(a) * 0.52, 0.66, Math.cos(a) * 0.52);
      g.rotation.set(-0.32, 0, lean);
      const stick = mesh(new THREE.CylinderGeometry(0.009, 0.009, h, 6), stickMat, false);
      stick.position.y = h / 2;
      const coat = mesh(new THREE.CylinderGeometry(0.016, 0.014, h * 0.55, 8), mat(0x8a6a4a, 0.9), false);
      coat.position.y = h * 0.7;
      const ash = mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.04, 8), ashMat, false);
      ash.position.y = h * 0.975 + 0.02;
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), tipMat);
      ember.position.y = h * 0.975;
      g.add(stick, coat, ash, ember);
      body.add(g);
      for (let k = 0; k < 3; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), smokeMat());
        body.add(puff);
        const top = V3(0, h + 0.03, 0).applyEuler(g.rotation).add(g.position);
        smokes.push({ puff, top, ph: k / 3 + i * 0.21, sw: i * 2.1 + k });
      }
    });

    const feet = [-1, 1].map(s => {
      const f = new THREE.Group();
      f.position.set(0.27 * s, 0.08, 0.36);
      const sole = mesh(new THREE.SphereGeometry(1, 20, 14), mat(IVORY, 0.5));
      sole.scale.set(0.15, 0.08, 0.2);
      f.add(sole);
      [-1, 0, 1].forEach(k => {
        const toe = mesh(new THREE.SphereGeometry(0.05, 12, 8), mat(0xf9b6c6, 0.5), false);
        toe.scale.y = 0.8;
        toe.position.set(0.075 * k, -0.01, 0.17 - Math.abs(k) * 0.03);
        f.add(toe);
      });
      body.add(f);
      return f;
    });
    const tail = mesh(new THREE.ConeGeometry(0.07, 0.24, 14), mat(WAXSHADE, 0.5));
    tail.position.set(0, 0.2, -0.64);
    tail.rotation.x = -1.9;
    body.add(tail);

    const UY = 0.72;
    const upper = new THREE.Group();
    upper.position.y = UY;
    body.add(upper);

    const torsoR = table([
      [0.5, 0.29],
      [0.72, 0.36],
      [0.98, 0.385],
      [1.24, 0.34],
      [1.44, 0.25],
      [1.6, 0.17]
    ]);
    {
      const pts = [];
      for (let i = 0; i <= 26; i++) {
        const y = lerp(0.5, 1.6, i / 26);
        pts.push(new THREE.Vector2(torsoR(y), y - UY));
      }
      const g = colored(new THREE.LatheGeometry(pts, 44), (x, y, z) => mix3(rgb(WAXSHADE), rgb(IVORY), clamp01(0.55 + z * 1.2 + y * 0.3)));
      upper.add(mesh(g, skinMat));

      const NU = 22;
      const NV = 16;
      const pos = [];
      const idx = [];
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        const y = lerp(0.66, 1.4, u);
        const half = 0.78 * Math.pow(1 - Math.pow(Math.abs(2 * u - 1), 3.2), 0.5);
        for (let j = 0; j <= NV; j++) {
          const v = (j / NV) * 2 - 1;
          const th = v * half;
          const edge = Math.max(Math.abs(v), Math.abs(2 * u - 1));
          const r = torsoR(y) + 0.014 * (1 - smooth(0.82, 1, edge)) - 0.004;
          pos.push(Math.sin(th) * r, y - UY, Math.cos(th) * r);
        }
      }
      for (let i = 0; i < NU; i++)
        for (let j = 0; j < NV; j++) {
          const a = i * (NV + 1) + j;
          const b = a + NV + 1;
          idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      pg.setIndex(idx);
      pg.computeVertexNormals();
      upper.add(mesh(pg, mat(BELLY, 0.5), false));

      const seam = (y, span) => {
        const p = [];
        for (let i = 0; i <= 12; i++) {
          const th = lerp(-span, span, i / 12);
          const r = torsoR(y) + 0.012;
          p.push(V3(Math.sin(th) * r, y - UY, Math.cos(th) * r));
        }
        upper.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 24, 0.007, 5, false), seamMat, false));
      };
      seam(0.88, 0.66);
      seam(1.19, 0.58);
      const mid = [];
      for (let i = 0; i <= 10; i++) {
        const y = lerp(0.72, 1.34, i / 10);
        mid.push(V3(0, y - UY, torsoR(y) + 0.012));
      }
      upper.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mid), 24, 0.007, 5, false), seamMat, false));

      const shellPt = (u, v, lift = 0) => {
        const y = lerp(0.7, 1.47, u);
        const half = 1.2 * Math.pow(1 - Math.pow(Math.abs(2 * u - 1), 3), 0.5);
        const th = Math.PI + v * half;
        const edge = Math.max(Math.abs(v), Math.abs(2 * u - 1));
        const r = torsoR(y) + 0.06 * (1 - Math.pow(edge, 2.5)) + 0.004 + lift + 0.006 * Math.cos(v * 14) * Math.pow(edge, 4);
        return [Math.sin(th) * r, y - UY, Math.cos(th) * r, edge];
      };
      {
        const SU = 28;
        const SV = 28;
        const sp = [];
        const sc = [];
        const si = [];
        for (let i = 0; i <= SU; i++)
          for (let j = 0; j <= SV; j++) {
            const q = shellPt(i / SU, (j / SV) * 2 - 1);
            sp.push(q[0], q[1], q[2]);
            const c = mix3(mix3(rgb(LEAFLIGHT), rgb(LEAF), smooth(0, 0.8, q[3])), rgb(LEAFDARK), smooth(0.86, 1, q[3]));
            sc.push(c[0], c[1], c[2]);
          }
        for (let i = 0; i < SU; i++)
          for (let j = 0; j < SV; j++) {
            const a = i * (SV + 1) + j;
            const b = a + SV + 1;
            si.push(a, b, a + 1, b, b + 1, a + 1);
          }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
        sg.setAttribute("color", new THREE.Float32BufferAttribute(sc, 3));
        sg.setIndex(si);
        sg.computeVertexNormals();
        upper.add(mesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide })));
        const veinMat = mat(0xcdeb8e, 0.5);
        for (let k = 0; k < 11; k++) {
          const a = (k / 11) * Math.PI * 2 + 0.28;
          const pts = [];
          for (let q = 0; q <= 8; q++) {
            const sL = (q / 8) * 0.93;
            const w = shellPt(0.56 + 0.44 * sL * Math.cos(a), sL * Math.sin(a), 0.004);
            pts.push(V3(w[0], w[1], w[2]));
          }
          upper.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.007, 5, false), veinMat, false));
        }
        const hub = shellPt(0.56, 0, 0.004);
        const nub = mesh(new THREE.SphereGeometry(0.03, 12, 10), veinMat, false);
        nub.scale.z = 0.5;
        nub.position.set(hub[0], hub[1], hub[2]);
        upper.add(nub);
      }

      const drop = new THREE.Shape();
      drop.moveTo(0, 0.1);
      drop.bezierCurveTo(0.012, 0.05, 0.042, 0.02, 0.042, -0.02);
      drop.bezierCurveTo(0.042, -0.06, -0.042, -0.06, -0.042, -0.02);
      drop.bezierCurveTo(-0.042, 0.02, -0.012, 0.05, 0, 0.1);
      const dg = new THREE.ExtrudeGeometry(drop, { depth: 0.005, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.007, bevelSegments: 2, curveSegments: 14 });
      const emblem = new THREE.Group();
      emblem.position.set(0, 1.04 - UY, torsoR(1.04) + 0.012);
      [-0.75, 0, 0.75].forEach(a => {
        const m = mesh(dg, goldMat, false);
        m.rotation.z = -a;
        m.scale.setScalar(a ? 0.72 : 1);
        m.position.set(Math.sin(a) * 0.035, Math.cos(a) * 0.035 - 0.02, 0);
        emblem.add(m);
      });
      upper.add(emblem);
    }

    {
      const g = new THREE.Group();
      g.position.set(0, 1.5 - UY, 0.03);
      g.rotation.x = 0.42;
      const N = 20;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const b = mesh(new THREE.SphereGeometry(i % 4 === 2 ? 0.044 : 0.036, 12, 10), i % 4 === 2 ? marigoldA : beadMat, false);
        b.scale.y = 0.85;
        b.position.set(Math.sin(a) * 0.235, 0, Math.cos(a) * 0.235);
        g.add(b);
      }
      upper.add(g);
    }

    const arms = [1, -1].map(s => {
      const side = new THREE.Group();
      side.scale.x = s;
      const pivot = new THREE.Group();
      pivot.position.set(0.31, 1.36 - UY, 0.04);
      const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.07, -0.13, 0.06), V3(0.08, -0.25, 0.16), V3(-0.08, -0.22, 0.31), V3(-0.25, -0.15, 0.375)]);
      const NU = 26;
      const NR = 14;
      const fr = curve.computeFrenetFrames(NU, false);
      const pos = [];
      const idx = [];
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        const c = curve.getPointAt(u);
        const r = lerp(0.105, 0.07, smooth(0, 1, u)) * (1 - 0.5 * smooth(0.94, 1, u));
        for (let j = 0; j <= NR; j++) {
          const a = (j / NR) * Math.PI * 2;
          pos.push(c.x + (fr.normals[i].x * Math.cos(a) + fr.binormals[i].x * Math.sin(a)) * r, c.y + (fr.normals[i].y * Math.cos(a) + fr.binormals[i].y * Math.sin(a)) * r, c.z + (fr.normals[i].z * Math.cos(a) + fr.binormals[i].z * Math.sin(a)) * r);
        }
      }
      for (let i = 0; i < NU; i++)
        for (let j = 0; j < NR; j++) {
          const a = i * (NR + 1) + j;
          const b = a + NR + 1;
          idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      colored(g, (x, y) => mix3(rgb(WAXSHADE), rgb(IVORY), clamp01(0.75 + y * 1.5)));
      pivot.add(mesh(g, skinMat));
      const cap = mesh(new THREE.SphereGeometry(0.1, 16, 12), mat(IVORY, 0.5));
      pivot.add(cap);

      const wristAt = curve.getPointAt(0.8);
      const wristDir = curve.getTangentAt(0.8);
      const band = mesh(new THREE.TorusGeometry(0.079, 0.015, 8, 24), goldMat, false);
      band.position.copy(wristAt);
      band.quaternion.setFromUnitVectors(V3(0, 0, 1), wristDir);
      pivot.add(band);

      const hand = new THREE.Group();
      hand.position.set(-0.283, -0.16, 0.39);
      hand.rotation.z = -0.06;
      const palm = mesh(new THREE.SphereGeometry(1, 18, 14), mat(IVORY, 0.5));
      palm.scale.set(0.038, 0.1, 0.075);
      palm.position.y = 0.04;
      hand.add(palm);
      [-1, 0, 1].forEach(k => {
        const fin = mesh(new THREE.SphereGeometry(1, 12, 10), mat(0xf9b6c6, 0.5), false);
        fin.scale.set(0.034, 0.05, 0.03);
        fin.position.set(0, 0.125 - Math.abs(k) * 0.018, k * 0.042);
        hand.add(fin);
      });
      const thumb = mesh(new THREE.SphereGeometry(1, 12, 10), mat(IVORY, 0.5), false);
      thumb.scale.set(0.034, 0.045, 0.03);
      thumb.position.set(0.0, 0.03, -0.075);
      hand.add(thumb);
      pivot.add(hand);

      side.add(pivot);
      upper.add(side);
      return { pivot };
    });

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
      return V3(p[0] * lift, p[1] * lift, p[2] * lift);
    };

    const HY = 1.86;
    const head = new THREE.Group();
    head.position.set(0, HY - UY, 0.1);
    upper.add(head);
    {
      const g = new THREE.SphereGeometry(1, 56, 40);
      const p = g.attributes.position;
      const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const q = headPt(p.getX(i), p.getY(i), p.getZ(i));
        col.set(mix3(rgb(WAXSHADE), rgb(IVORY), smooth(-0.9, 0.2, p.getY(i))), i * 3);
        p.setXYZ(i, q[0], q[1], q[2]);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      head.add(mesh(g, skinMat));
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
      const n = mesh(new THREE.SphereGeometry(0.014, 8, 8), darkMat, false);
      n.scale.set(1, 1.4, 0.6);
      n.position.copy(face(0.09 * s, -0.12, 1.0));
      head.add(n);
      const brow = mesh(new THREE.SphereGeometry(1, 10, 8), goldMat, false);
      brow.scale.set(0.03, 0.012, 0.01);
      brow.position.copy(face(0.6 * s, 0.62, 1.0));
      brow.rotation.set(-0.6, 0.5 * s, -0.25 * s);
      head.add(brow);
    });
    const mouthLine = (() => {
      const p = [];
      for (let i = 0; i <= 16; i++) {
        const yaw = lerp(-0.42, 0.42, i / 16);
        const a = Math.abs(yaw) / 0.42;
        p.push(face(yaw, -0.4 - 0.06 * Math.max(0, 1 - a / 0.3) + 0.17 * a * a, 1.005));
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
      mark.position.copy(face(0, 0.56, 0.985));
      mark.rotation.x = -0.95;
      head.add(mark);
    }
    const muzzle = new THREE.Group();
    muzzle.position.copy(face(0, -0.3, 1.25));
    head.add(muzzle);

    const hat = new THREE.Group();
    hat.position.set(0, 0.3, -0.03);
    hat.rotation.x = -0.1;
    head.add(hat);
    {
      const pts = [
        [0.001, 0],
        [0.2, 0],
        [0.23, 0.02],
        [0.31, 0.15],
        [0.325, 0.185],
        [0.31, 0.21],
        [0.27, 0.22],
        [0.001, 0.215]
      ].map(p => new THREE.Vector2(p[0], p[1]));
      hat.add(mesh(new THREE.LatheGeometry(pts, 40), podMat));
      const rim = mesh(new THREE.TorusGeometry(0.318, 0.012, 8, 48), podDark, false);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.19;
      hat.add(rim);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const rib = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.19, 5), podDark, false);
        rib.position.set(Math.sin(a) * 0.268, 0.09, Math.cos(a) * 0.268);
        rib.rotation.set(Math.cos(a) * 0.56, 0, -Math.sin(a) * 0.56);
        hat.add(rib);
      }
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.2;
        const hole = mesh(new THREE.TorusGeometry(0.034, 0.008, 6, 16), podDark, false);
        hole.rotation.x = Math.PI / 2;
        hole.position.set(Math.sin(a) * 0.2, 0.222, Math.cos(a) * 0.2);
        const seed = mesh(new THREE.SphereGeometry(0.028, 12, 10), seedMat, false);
        seed.scale.y = 0.7;
        seed.position.copy(hole.position);
        hat.add(hole, seed);
      }
    }

    const candle = new THREE.Group();
    candle.position.y = 0.215;
    hat.add(candle);
    const CH = 0.46;
    const CR = 0.088;
    {
      candle.add(mesh(new THREE.CylinderGeometry(CR, CR, CH, 28), waxMat));
      candle.children[0].position.y = CH / 2;
      const pool = [
        [0.001, 0.02],
        [0.1, 0.022],
        [0.135, 0.014],
        [0.15, 0.0]
      ].map(p => new THREE.Vector2(p[0], p[1]));
      candle.add(mesh(new THREE.LatheGeometry(pool, 28), waxMat, false));
      const LOBES = [
        [0.4, 0.26],
        [1.7, 0.12],
        [2.9, 0.34],
        [4.2, 0.18],
        [5.4, 0.08]
      ];
      const lobe = th =>
        LOBES.reduce((acc, [c, len]) => {
          let d = Math.abs(th - c);
          d = Math.min(d, Math.PI * 2 - d);
          return Math.max(acc, len * Math.exp(-Math.pow(d / 0.3, 4)));
        }, 0);
      const NT = 96;
      const NS = 22;
      const pos = [];
      const idx = [];
      for (let i = 0; i <= NT; i++) {
        const th = (i / NT) * Math.PI * 2;
        const drip = lobe(th);
        const yEnd = CH - 0.03 - drip - 0.008 * Math.sin(th * 6);
        for (let j = 0; j <= NS; j++) {
          const q = j / NS;
          let r;
          let y;
          if (q < 0.25) {
            r = (q / 0.25) * (CR + 0.014);
            y = CH + 0.012 - 0.006 * Math.cos((q / 0.25) * Math.PI);
          } else {
            const k = (q - 0.25) / 0.75;
            y = lerp(CH + 0.012, yEnd, k);
            const along = drip > 0.02 ? clamp01((CH - 0.03 - y) / drip) : 0;
            r = CR + 0.014 + 0.014 * smooth(0.5, 0.9, along) * Math.min(1, drip * 8) - 0.016 * smooth(0.9, 1, k);
          }
          pos.push(Math.sin(th) * r, y, Math.cos(th) * r);
        }
      }
      for (let i = 0; i < NT; i++)
        for (let j = 0; j < NS; j++) {
          const a = i * (NS + 1) + j;
          const b = a + NS + 1;
          idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      candle.add(mesh(g, mat(0xfff0cf, 0.35)));
      const wick = mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.09, 8), darkMat, false);
      wick.position.set(0.005, CH + 0.05, 0);
      wick.rotation.z = -0.18;
      candle.add(wick);
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
    flame.position.y = CH + 0.07;
    flame.add(new THREE.Mesh(flameGeo(0.5, 0.145), new THREE.MeshBasicMaterial({ color: 0xff8f1a, side: THREE.BackSide })));
    const flameMid = new THREE.Mesh(flameGeo(0.36, 0.1), new THREE.MeshBasicMaterial({ color: 0xffc93a, side: THREE.BackSide }));
    flameMid.position.y = 0.012;
    const flameCore = new THREE.Mesh(flameGeo(0.19, 0.055), new THREE.MeshBasicMaterial({ color: 0xfffbe6 }));
    flameCore.position.y = 0.03;
    flame.add(flameMid, flameCore);
    candle.add(flame);

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
    halo.position.y = CH + 0.3;
    candle.add(halo);
    const light = new THREE.PointLight(0xffc270, 0.6, 6);
    light.position.set(0, CH + 0.4, 0.3);
    candle.add(light);
    const motes = [];
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(spriteMat());
      body.add(s);
      motes.push({ s, ph: i / 7, a: i * 2.4, rad: 0.3 + (i % 3) * 0.2 });
    }

    const blessGeo = petalGeo({ w: 0.11, len: 0.26, cup: 0.04, bend: -0.05 });
    const blessMat = new THREE.MeshBasicMaterial({ color: 0xffd9ea, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const blessings = [];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(blessGeo, blessMat);
      m.visible = false;
      root.add(m);
      blessings.push({ m, a: (i / 12) * Math.PI * 2, d: (i % 4) * 0.06 });
    }

    const ripples = [0, 1].map(i => {
      const m = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.07, 72), new THREE.MeshBasicMaterial({ color: 0xa8e6ec, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.02;
      root.add(m);
      return { m, ph: i * 0.5 };
    });

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
        const bless = is("bless");
        const bowA = is("bow");
        const atk = is("attack") ? strike(action.p) : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const fire = s.dying ? 0.35 : 0.6 + 0.4 * clamp01(hunger / 100);

        let y = 0;
        let z = 0;
        let sy = 1 + Math.sin(t * 1.6) * 0.012 * motion;
        let sway = Math.sin(t * 1.6) * 0.035 * motion;
        let bow = Math.sin(t * 0.8) * 0.02 * motion;
        let open = Math.sin(t * 1.2) * 0.03 * motion;
        let raise = 0;
        let flameK = 1;
        let mouth = false;
        let squint = 0;
        let airborne = false;
        let charge = 0;
        let burst = 0;
        let step = motion;

        if (jump) {
          const p = jump.p;
          step = 0;
          if (p < 0.2) sy = 1 - 0.14 * Math.sin((p / 0.2) * Math.PI * 0.5);
          else if (p < 0.8) {
            const q = (p - 0.2) / 0.6;
            y = Math.sin(q * Math.PI) * 0.85;
            sy = 1 + 0.07 * Math.cos(q * Math.PI);
            open = -0.25 * Math.sin(q * Math.PI) + 0.3 * Math.sin(q * Math.PI * 2);
            raise = Math.sin(q * Math.PI) * 0.75;
            airborne = true;
            mouth = q > 0.15 && q < 0.75;
          } else sy = 1 - 0.12 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
        }
        if (bowA) {
          const k = smooth(0.08, 0.32, bowA.p) * (1 - smooth(0.66, 0.9, bowA.p));
          bow = k * 0.62;
          squint = k > 0.25 ? 1 : 0;
          sway *= 1 - k;
          step = 0;
          open = k * 0.08;
        }
        if (bless) {
          const p = bless.p;
          charge = smooth(0, 0.34, p) * (1 - smooth(0.36, 0.44, p));
          burst = smooth(0.38, 0.48, p) * (1 - smooth(0.74, 1, p));
          bow = charge * 0.3 - burst * 0.12;
          raise = burst;
          squint = charge > 0.25 ? 1 : 0;
          mouth = burst > 0.3;
          open = -charge * 0.12 + burst * 0.3;
          flameK = 1 - charge * 0.4 + burst * 1.1;
          sy += -charge * 0.05 + burst * 0.05;
          step = 0;
        }
        if (eat) {
          bow = 0.1;
          sy += -ph.chew * 0.03 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(4.0, HY - 0.22, ph.fall * ph.fall), lerp(0.7, 0.6, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = (1 - ph.fall) * 1.2;
          mouth = eat.p > 0.14 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3 ? 0.6 : 0;
        } else food.visible = false;
        if (atk) {
          bow = -atk.wind * 0.3 + atk.lunge * 0.75;
          z = atk.lunge * 0.7 - atk.wind * 0.15;
          y = Math.sin(Math.min(1, atk.lunge * 1.2) * Math.PI) * 0.18;
          sy += -atk.wind * 0.06 + atk.lunge * 0.04;
          raise = atk.wind * 0.3;
          flameK = 1 + atk.impact * 1.3;
          squint = atk.lunge > 0.3 ? 0.7 : 0;
          mouth = atk.lunge > 0.2;
          open = atk.lunge * 0.2;
          step = 0;
        }

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.set(0, y, z);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        body.rotation.z = sway;
        upper.rotation.x = lerp(upper.rotation.x, bow, 0.25);
        upper.rotation.z = -sway * 0.6;

        feet.forEach((f, i) => {
          const lift = Math.max(0, Math.sin(t * 1.6 + i * Math.PI)) * 0.05 * step;
          f.position.y = 0.08 + lift - (airborne ? 0.04 : 0);
          f.rotation.x = -lift * 4;
        });
        tail.rotation.y = Math.sin(t * 2.6) * 0.35 * motion;

        const lookK = 1 - clamp01(bow * 1.5);
        head.rotation.y = lerp(head.rotation.y, pointer.x * 0.4 * lookK, 0.12);
        head.rotation.x = lerp(head.rotation.x, -pointer.y * 0.2 * lookK + (eat ? 0.1 : 0) - burst * 0.25, 0.12);
        head.rotation.z = Math.sin(t * 1.1) * 0.04 * motion * lookK;
        candle.rotation.x = -(upper.rotation.x + head.rotation.x + hat.rotation.x) * 0.9 + Math.sin(t * 2.3) * 0.02 * motion;
        candle.rotation.z = -(head.rotation.z + upper.rotation.z + body.rotation.z) * 0.9 + Math.sin(t * 1.9) * 0.025 * motion;

        mouthLine.visible = !mouth;
        mouthOpen.visible = mouth;
        mouthOpen.scale.y = eat ? 0.04 + ph.chew * 0.05 : 0.07;

        arms.forEach(({ pivot }) => {
          pivot.rotation.z = lerp(pivot.rotation.z, raise * 1.75, 0.25);
          pivot.rotation.x = lerp(pivot.rotation.x, -raise * 0.5 + Math.sin(t * 1.6) * 0.015 * motion, 0.25);
          pivot.rotation.y = lerp(pivot.rotation.y, -raise * 0.5, 0.25);
        });

        petals.forEach(p => {
          const k = p.layer ? 0.6 : 1;
          p.m.rotation.x = lerp(p.m.rotation.x, p.tilt + open * k + Math.sin(t * 1.5 + p.ph) * 0.02 * motion, 0.25);
        });
        folds.forEach(f => {
          f.m.rotation.x = f.m.userData.rx + Math.sin(t * 1.9 + f.ph) * 0.03 * motion + open * 0.3;
        });

        const fk = flameK * fire;
        const flick = 1 + 0.1 * Math.sin(t * 11) + 0.06 * Math.sin(t * 19.3);
        flame.scale.set(fk * (1 + 0.06 * Math.sin(t * 7.3)), Math.max(0.05, fk * flick), fk * (1 + 0.06 * Math.sin(t * 8.1)));
        flame.rotation.z = Math.sin(t * 2.7) * 0.1 * motion;
        flame.rotation.x = Math.sin(t * 2.1) * 0.06 * motion;
        halo.scale.setScalar((1.15 + 0.08 * Math.sin(t * 9) + burst * 0.8) * (0.35 + Math.min(fk, 1.5) * 0.65));
        halo.material.opacity = 0.75 * Math.min(1, fk);
        light.intensity = (0.5 + 0.08 * Math.sin(t * 11) + burst * 1.6) * fk;
        goldMat.emissiveIntensity = 0.55 + 0.2 * Math.sin(t * 3) * motion + burst * 1.3;

        motes.forEach(mo => {
          const u = (((t * 0.14 + mo.ph) % 1) + 1) % 1;
          const a = mo.a + t * 0.6;
          mo.s.position.set(Math.sin(a) * mo.rad * (0.5 + u), 2.9 + u * 1.0, Math.cos(a) * mo.rad * (0.5 + u));
          mo.s.scale.setScalar(0.12 * Math.sin(Math.PI * u) * (0.5 + fk * 0.5));
          mo.s.material.opacity = Math.sin(Math.PI * u) * Math.min(1, fk);
        });

        smokes.forEach(sm => {
          const u = (((t * 0.22 + sm.ph) % 1) + 1) % 1;
          sm.puff.position.set(sm.top.x + Math.sin(t * 1.3 + sm.sw + u * 4) * 0.07 * u, sm.top.y + u * 0.75, sm.top.z + Math.cos(t * 1.1 + sm.sw + u * 3) * 0.07 * u);
          sm.puff.scale.setScalar(0.35 + u * 1.5);
          sm.puff.material.opacity = 0.34 * Math.sin(Math.PI * Math.pow(u, 0.6));
        });

        ripples.forEach(r => {
          const u = (((t * 0.3 + r.ph) % 1) + 1) % 1;
          r.m.scale.setScalar(0.85 + u * 0.7);
          r.m.material.opacity = airborne ? 0 : 0.4 * (1 - u) * (1 - u);
        });

        const bq = bless ? clamp01((bless.p - 0.4) / 0.58) : 0;
        blessMat.opacity = Math.sin(Math.PI * bq);
        blessings.forEach(b => {
          b.m.visible = bq > 0 && bq < 1;
          if (!b.m.visible) return;
          const q = clamp01(bq - b.d);
          const a = b.a + q * 4.2;
          const r = 0.55 + q * 1.5;
          b.m.position.set(Math.sin(a) * r, 0.9 + q * 2.1 + Math.sin(q * 9 + b.a) * 0.12, Math.cos(a) * r);
          b.m.rotation.set(q * 5 + b.a, a, q * 3);
          b.m.scale.setScalar(0.6 + Math.sin(Math.PI * q) * 0.9);
        });

        const lid = squint ? 1 - squint : blink;
        eyes.forEach(({ g }) => {
          g.scale.y = Math.max(0.08, lid) * (airborne ? 1.08 : 1);
        });
        followPupils(eyes, pointer, 0.8);
      }
    };
  }
});
