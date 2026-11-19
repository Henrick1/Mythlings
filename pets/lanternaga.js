Pets.register({
  id: "lanternaga",
  dex: 32,
  name: "Lanternaga",
  color: "#d24a86",
  types: ["light", "water"],
  move: "swim",
  swimDepth: 0.12,
  description: "Com os anos, a flor do Lotocírio cresce em andares até virar um pequeno templo, e o pescoço se estica como o das serpentes sagradas que guardam os rios. Quase não se move: fica parado na margem com as velas acesas, e as lanternas que sobem do seu telhado levam embora as tristezas de quem passa por perto.",
  actions: {
    jump: { duration: 1.2 },
    eat: { duration: 2.6 },
    lanterns: { duration: 3.0 },
    attack: { duration: 1.2 }
  },
  battle: { special: { action: "lanterns", hit: 0.55, speed: 1.2 } },
  idle: [
    { action: "lanterns", min: 35, max: 70 },
    { action: "jump", min: 50, max: 90 }
  ],
  clickAction: n => ["lanterns", "jump"][(n - 1) % 2],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);
    const rig = new THREE.Group();
    rig.scale.setScalar(0.8);
    squash.add(rig);
    const body = new THREE.Group();
    rig.add(body);

    const rgb = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
    const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const TAU = Math.PI * 2;
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
    const xf = (px, py, pz, rx = 0, ry = 0, rz = 0, sc = 1) => {
      const o = new THREE.Object3D();
      o.position.set(px, py, pz);
      o.rotation.set(rx, ry, rz);
      if (typeof sc === "number") o.scale.setScalar(sc);
      else o.scale.set(sc[0], sc[1], sc[2]);
      o.updateMatrix();
      return o.matrix.clone();
    };
    const around = (th, y, r, tilt, sc = 1) => new THREE.Matrix4().makeRotationY(th).multiply(xf(0, y, r, tilt, 0, 0, sc));
    const bake = parts => {
      const pos = [];
      const nor = [];
      const col = [];
      parts.forEach(({ g, m, c }) => {
        const q = g.index ? g.toNonIndexed() : g.clone();
        if (m) q.applyMatrix4(m);
        q.computeVertexNormals();
        const p = q.attributes.position;
        const n = q.attributes.normal;
        const k = q.attributes.color;
        const cc = c !== undefined ? rgb(c) : null;
        for (let i = 0; i < p.count; i++) {
          pos.push(p.getX(i), p.getY(i), p.getZ(i));
          nor.push(n.getX(i), n.getY(i), n.getZ(i));
          if (cc) col.push(cc[0], cc[1], cc[2]);
          else col.push(k.getX(i), k.getY(i), k.getZ(i));
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      return g;
    };
    const XA = V3(1, 0, 0);
    const ZA = V3(0, 0, 1);
    const tube = (pts, rad, NU, NR, colorFn) => {
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      const frame = u => {
        const c = curve.getPoint(u);
        const tg = curve.getTangent(u).normalize();
        const ref = Math.abs(tg.x) > 0.9 ? ZA : XA;
        const n2 = new THREE.Vector3().crossVectors(tg, ref).normalize();
        const n1 = new THREE.Vector3().crossVectors(n2, tg).normalize();
        return { c, tg, n1, n2 };
      };
      const pos = [];
      const col = [];
      const idx = [];
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        const f = frame(u);
        const r = rad(u);
        for (let j = 0; j <= NR; j++) {
          const a = (j / NR) * TAU;
          const ca = Math.cos(a) * r;
          const sa = Math.sin(a) * r;
          pos.push(f.c.x + f.n1.x * ca + f.n2.x * sa, f.c.y + f.n1.y * ca + f.n2.y * sa, f.c.z + f.n1.z * ca + f.n2.z * sa);
          if (colorFn) col.push(...colorFn(u, a));
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
      if (colorFn) g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return { g, frame };
    };

    const IVORY = 0xf2d29c;
    const WAXSHADE = 0xd3a06a;
    const BELLY = 0xffe8b4;
    const PINK = 0xf07aa6;
    const MAGENTA = 0xd24a86;
    const PETALBASE = 0xf9d3d2;
    const WALL = 0xa3326a;
    const LEAF = 0x5fae4e;
    const LEAFLIGHT = 0x9bd45f;
    const LEAFDARK = 0x357a40;
    const GOLD = 0xffc23a;

    const skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide });
    const petalMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide, emissive: 0xe0508c, emissiveIntensity: 0.3 });
    const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, flatShading: true, side: THREE.DoubleSide });
    const bakedMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    const trunkMat = mat(0xd9e2a6, 0.7);
    const trunkLine = mat(0xa9bd74, 0.7);
    const darkMat = mat(0x3a2218, 0.5);
    const seamMat = mat(0xd9a45e, 0.6);
    const mouthMat = mat(0x8a2f3e, 0.5);
    const goldMat = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.3, metalness: 0.25, emissive: 0xff8a1a, emissiveIntensity: 0.25 });
    const goldBaked = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.25, emissive: 0xff8a1a, emissiveIntensity: 0.22 });
    const roofMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xc03a78, emissiveIntensity: 0.16 });
    const wallMat = mat(WALL, 0.6);
    const underMat = new THREE.MeshStandardMaterial({ color: 0x8f2a5c, roughness: 0.6, side: THREE.DoubleSide });
    const waxMat = mat(0xf7e3bd, 0.4);
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffefb0 });
    const candleMat = new THREE.MeshBasicMaterial({ color: 0xf0a43a });
    const wflameMat = new THREE.MeshBasicMaterial({ color: 0xff6a1a });

    const petalGeo = o => {
      const NU = o.nu || 18;
      const NV = o.nv || 10;
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
          pos.push(v * o.w * f, u * o.len, o.cup * (1 - v * v) * f - o.cup * 0.6 * f + o.bend * u * u);
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

    const finShape = (() => {
      const sh = new THREE.Shape();
      sh.moveTo(-0.07, 0);
      sh.bezierCurveTo(-0.11, 0.08, -0.03, 0.12, 0.0, 0.2);
      sh.quadraticCurveTo(0.03, 0.28, 0.13, 0.31);
      sh.quadraticCurveTo(0.075, 0.21, 0.085, 0.13);
      sh.quadraticCurveTo(0.1, 0.05, 0.08, 0);
      sh.closePath();
      return sh;
    })();
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 12 });
    finGeo.translate(0, 0, -0.006);
    const dropShape = (() => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0.1);
      sh.bezierCurveTo(0.012, 0.05, 0.05, 0.02, 0.05, -0.02);
      sh.bezierCurveTo(0.05, -0.07, -0.05, -0.07, -0.05, -0.02);
      sh.bezierCurveTo(-0.05, 0.02, -0.012, 0.05, 0, 0.1);
      return sh;
    })();

    const blob = new THREE.SphereGeometry(1, 10, 8);
    const marigoldGeo = (() => {
      const parts = [];
      [
        [11, 0.78, 0.0, 1.15, 0xff8a1e],
        [8, 0.5, 0.2, 0.75, 0xffb52e],
        [5, 0.24, 0.36, 0.38, 0xff8a1e]
      ].forEach(([n, rad, y, lean, c], tier) => {
        for (let i = 0; i < n; i++) parts.push({ g: blob, m: around(((i + tier * 0.5) / n) * TAU, y, rad, -lean + 0.9, [0.3, 0.13, 0.36]), c });
      });
      parts.push({ g: blob, m: xf(0, 0.46, 0, 0, 0, 0, [0.26, 0.2, 0.26]), c: 0xffb52e });
      const cone = new THREE.ConeGeometry(0.6, 0.6, 10);
      parts.push({ g: cone, m: xf(0, -0.3, 0, Math.PI), c: LEAFDARK });
      return bake(parts);
    })();

    {
      const g = new THREE.SphereGeometry(1, 48, 32);
      g.scale(0.84, 0.42, 1.0);
      colored(g, (x, y) => mix3(rgb(BELLY), mix3(rgb(WAXSHADE), rgb(IVORY), smooth(-0.2, 0.3, y)), smooth(-0.3, -0.12, y)));
      const m = mesh(g, skinMat);
      m.position.y = 0.72;
      body.add(m);
    }

    const legs = [
      [0.56, 0.56],
      [-0.56, 0.56],
      [0.58, -0.56],
      [-0.58, -0.56]
    ].map(([x, z], i) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      const prof = table([
        [0, 0.235],
        [0.06, 0.25],
        [0.14, 0.21],
        [0.3, 0.175],
        [0.55, 0.2],
        [0.8, 0.24]
      ]);
      const pts = [new THREE.Vector2(0.001, 0)];
      for (let k = 0; k <= 16; k++) pts.push(new THREE.Vector2(prof((k / 16) * 0.8), (k / 16) * 0.8));
      const lg = colored(new THREE.LatheGeometry(pts, 24), (px, py) => mix3(rgb(WAXSHADE), rgb(IVORY), smooth(0.02, 0.4, py)));
      g.add(mesh(lg, skinMat));
      [0.24, 0.33].forEach(y => {
        const w = mesh(new THREE.TorusGeometry(prof(y) + 0.004, 0.014, 6, 24), mat(WAXSHADE, 0.5), false);
        w.rotation.x = Math.PI / 2;
        w.position.y = y;
        g.add(w);
      });
      const out = Math.sign(x);
      [-1, 0, 1].forEach(k => {
        const a = k * 0.5 + (z > 0 ? 0 : 0) + out * 0.25;
        const claw = mesh(new THREE.ConeGeometry(0.05, 0.15, 10), goldMat, false);
        claw.position.set(Math.sin(a) * 0.23, 0.045, Math.cos(a) * 0.23);
        claw.rotation.set(1.75, 0, 0);
        claw.rotation.order = "YXZ";
        claw.rotation.y = a;
        g.add(claw);
      });
      [
        [0.5, 0.52],
        [0.95, 0.44],
        [0.72, 0.62]
      ].forEach(([a, y]) => {
        const sp = mesh(new THREE.SphereGeometry(0.036, 10, 8), mat(0xf7a9c0, 0.5), false);
        const r = prof(y) - 0.012;
        sp.position.set(Math.sin(a * out) * r, y, Math.cos(a * out) * r * (z > 0 ? 1 : -1));
        g.add(sp);
      });
      body.add(g);
      return { g, ph: i };
    });

    {
      const pts = [
        [0.001, 0.9],
        [0.8, 0.9],
        [0.91, 0.93],
        [0.96, 0.99],
        [0.96, 1.08],
        [0.92, 1.14],
        [0.001, 1.16]
      ].map(p => new THREE.Vector2(p[0], p[1]));
      body.add(mesh(new THREE.LatheGeometry(pts, 64), trunkMat));
      [0.99, 1.06].forEach(y => {
        const ring = mesh(new THREE.TorusGeometry(0.962, 0.009, 6, 80), trunkLine, false);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
        body.add(ring);
      });
    }

    {
      const NR = 10;
      const NT = 108;
      const pos = [];
      const col = [];
      const idx = [];
      for (let i = 0; i <= NR; i++) {
        const q = i / NR;
        for (let j = 0; j <= NT; j++) {
          const th = (j / NT) * TAU;
          const r = q * 1.02 * (1 + 0.03 * Math.cos(th * 18) * q * q);
          const vein = Math.pow(Math.abs(Math.cos(th * 9)), 40) * smooth(0.1, 0.4, q);
          pos.push(Math.sin(th) * r, 1.172 - 0.07 * Math.pow(q, 3) + 0.012 * Math.cos(th * 18) * q * q * q, Math.cos(th) * r);
          const c = mix3(mix3(rgb(0x7cc25a), rgb(LEAF), smooth(0.2, 1, q)), rgb(0xbfe488), vein * 0.6);
          col.push(c[0], c[1], c[2]);
        }
      }
      for (let i = 0; i < NR; i++)
        for (let j = 0; j < NT; j++) {
          const a = i * (NT + 1) + j;
          const b = a + NT + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      body.add(mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide })));
    }

    {
      const fold = (w, h, d, light, dark) => {
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
        return g;
      };
      const fa = fold(0.2, 0.4, 0.1, LEAFLIGHT, LEAF);
      const fb = fold(0.18, 0.3, 0.08, LEAF, LEAFDARK);
      const parts = [];
      const N = 18;
      for (let i = 0; i < N; i++) {
        parts.push({ g: fa, m: around((i / N) * TAU, 1.06, 0.9, 2.0, 0.85) });
        parts.push({ g: fb, m: around(((i + 0.5) / N) * TAU, 1.0, 0.9, 2.45, 0.85) });
      }
      body.add(mesh(bake(parts), leafMat));
    }

    const throne = [];
    {
      const pg = petalGeo({ w: 0.21, len: 0.44, cup: 0.1, bend: -0.12 });
      const N = 14;
      for (let i = 0; i < N; i++) {
        const holder = new THREE.Group();
        holder.rotation.y = (i / N) * TAU;
        const m = mesh(pg, petalMat);
        m.position.set(0, 1.16, 0.62);
        m.rotation.x = 0.85;
        holder.add(m);
        body.add(holder);
        throne.push({ m, ph: i * 1.1 });
      }
      for (let i = 0; i < 7; i++) {
        const a = ((i + 0.5) / 7) * TAU;
        const f = mesh(marigoldGeo, bakedMat, false);
        f.scale.setScalar(0.15);
        f.position.set(Math.sin(a) * 0.86, 1.17, Math.cos(a) * 0.86);
        f.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
        body.add(f);
      }
    }

    const windowShape = (w, h) => {
      const sh = new THREE.Shape();
      sh.moveTo(-w, 0);
      sh.lineTo(-w, h - w);
      sh.absarc(0, h - w, w, Math.PI, 0, true);
      sh.lineTo(w, 0);
      sh.closePath();
      return sh;
    };
    const hookGeo = tube([V3(0, 0, -0.04), V3(0, 0.0, 0.1), V3(0, 0.07, 0.21), V3(0, 0.2, 0.24), V3(0, 0.3, 0.17), V3(0, 0.31, 0.08)], u => 0.028 * (1 - u * 0.62), 20, 8).g;
    const hookTip = new THREE.SphereGeometry(0.026, 10, 8);
    const bellGeo = (() => {
      const pts = [
        [0.001, 0],
        [0.012, 0],
        [0.03, -0.02],
        [0.04, -0.07],
        [0.058, -0.1]
      ].map(p => new THREE.Vector2(p[0], p[1]));
      return new THREE.LatheGeometry(pts, 14);
    })();
    const bellMat = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.28, metalness: 0.3, emissive: 0xff9a1a, emissiveIntensity: 0.5, side: THREE.DoubleSide });

    const winFlames = [];
    const glows = [];
    const bells = [];
    const TIERS = [
      { r: 0.6, y0: 1.16, y1: 1.6, yE: 1.58, rE: 1.04, yT: 1.98, rT: 0.5, tiles: [20, 16, 13], win: 8, hooks: 8 },
      { r: 0.43, y0: 1.96, y1: 2.3, yE: 2.28, rE: 0.78, yT: 2.62, rT: 0.36, tiles: [15, 12, 10], win: 6, hooks: 6 },
      { r: 0.29, y0: 2.6, y1: 2.86, yE: 2.84, rE: 0.56, yT: 3.32, rT: 0.09, tiles: [11, 9, 7, 5], win: 5, hooks: 5 }
    ];
    TIERS.forEach((T, ti) => {
      const h = T.y1 - T.y0;
      const drum = mesh(new THREE.CylinderGeometry(T.r, T.r * 1.04, h, 40), wallMat);
      drum.position.y = T.y0 + h / 2;
      body.add(drum);
      const goldParts = [];
      const ringG = (r, y, th) => {
        const g = new THREE.TorusGeometry(r, th, 8, 48);
        goldParts.push({ g, m: xf(0, y, 0, Math.PI / 2), c: GOLD });
      };
      ringG(T.r * 1.045, T.y0 + 0.02, 0.022);
      ringG(T.r + 0.004, T.y1 - 0.04, 0.016);
      const ww = Math.min(0.09, (Math.PI * T.r) / T.win * 0.42);
      const wh = h * 0.62;
      const wShape = windowShape(ww, wh);
      const wGeo = new THREE.ShapeGeometry(wShape, 10);
      const framePts = [];
      for (let k = 0; k <= 14; k++) {
        const u = k / 14;
        if (u < 0.3) framePts.push(V3(-ww, (u / 0.3) * (wh - ww), 0));
        else if (u > 0.7) framePts.push(V3(ww, ((1 - u) / 0.3) * (wh - ww), 0));
        else {
          const a = Math.PI - ((u - 0.3) / 0.4) * Math.PI;
          framePts.push(V3(Math.cos(a) * ww, wh - ww + Math.sin(a) * ww, 0));
        }
      }
      const frameGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(framePts, false, "catmullrom", 0.1), 28, 0.011, 5, false);
      const sillGeo = new THREE.BoxGeometry(ww * 2.5, 0.018, 0.03);
      const postGeo = new THREE.CylinderGeometry(0.014, 0.014, h * 0.9, 6);
      const cGeo = new THREE.PlaneGeometry(ww * 0.5, wh * 0.36);
      const fGeo = new THREE.ShapeGeometry(dropShape, 8);
      for (let i = 0; i < T.win; i++) {
        const a = (i / T.win) * TAU + (ti % 2 ? Math.PI / T.win : 0);
        const yb = T.y0 + h * 0.16;
        const holder = new THREE.Group();
        holder.rotation.y = a;
        const w = new THREE.Mesh(wGeo, windowMat);
        w.position.set(0, yb, T.r * 1.022 + 0.004);
        const c = new THREE.Mesh(cGeo, candleMat);
        c.position.set(0, yb + wh * 0.18, T.r * 1.022 + 0.007);
        const f = new THREE.Mesh(fGeo, wflameMat);
        f.position.set(0, yb + wh * 0.36 + 0.02, T.r * 1.022 + 0.008);
        f.scale.setScalar((ww / 0.09) * 0.62);
        f.userData.s = f.scale.x;
        holder.add(w, c, f);
        body.add(holder);
        winFlames.push({ f, ph: i * 1.7 + ti * 0.9 });
        goldParts.push({ g: frameGeo, m: around(a, yb, T.r * 1.022 + 0.006, 0), c: GOLD });
        goldParts.push({ g: sillGeo, m: around(a, yb - 0.01, T.r * 1.03 + 0.012, 0), c: GOLD });
        goldParts.push({ g: postGeo, m: around(a + Math.PI / T.win, T.y0 + h * 0.48, T.r * 1.02, 0), c: GOLD });
      }
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(T.r * 1.12, T.r * 1.16, h * 0.9, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      glow.position.y = T.y0 + h / 2;
      body.add(glow);
      glows.push(glow);

      const rows = T.tiles.length;
      const P = sv => [lerp(T.rE, T.rT, sv), T.yE + (T.yT - T.yE) * Math.pow(Math.max(0, sv), 1.45)];
      const under = [new THREE.Vector2(T.r * 0.98, T.yE - 0.01), new THREE.Vector2(T.rE * 0.9, T.yE + 0.005)];
      for (let k = 0; k <= 12; k++) {
        const q = P(k / 12);
        under.push(new THREE.Vector2(q[0] * (k === 0 ? 0.92 : 0.97), q[1] - 0.012));
      }
      body.add(mesh(new THREE.LatheGeometry(under, 40), underMat));
      const slope = Math.hypot(T.rE - T.rT, T.yT - T.yE);
      const tiles = [];
      T.tiles.forEach((n, k) => {
        const sb = (k + 1) / rows;
        const sm = (k + 0.35) / rows;
        const q = P(sb);
        const dy = (T.yT - T.yE) * 1.45 * Math.pow(sm, 0.45);
        const beta = Math.atan2(dy, T.rE - T.rT);
        const len = (slope / rows) * (k === 0 ? 1.62 : 1.5);
        const w = ((Math.PI * lerp(T.rE, T.rT, (k + 0.4) / rows)) / n) * 1.28;
        const eave = k === 0;
        const g = petalGeo({ w, len, cup: -0.045, bend: eave ? -0.42 * len : -0.06 * len, nu: 10, nv: 6, base: 0xb83a76, mid: eave ? PINK : 0xe5639a, tip: eave ? 0xf9b8cd : 0xf28fb4 });
        for (let i = 0; i < n; i++) tiles.push({ g, m: around(((i + (k % 2) * 0.5) / n) * TAU, q[1] + 0.012 + k * 0.004, q[0] + 0.006, Math.PI / 2 + beta) });
      });
      const roof = mesh(bake(tiles), roofMat);
      body.add(roof);

      ringG(T.rT + 0.035, T.yT - 0.01, 0.03);
      for (let i = 0; i < T.hooks; i++) {
        const a = ((i + 0.5) / T.hooks) * TAU;
        const sc = 1 - ti * 0.16;
        goldParts.push({ g: hookGeo, m: around(a, T.yE + 0.01, T.rE * 0.97, 0, sc), c: GOLD });
        goldParts.push({ g: hookTip, m: around(a, T.yE + 0.01 + 0.31 * sc, T.rE * 0.97 + 0.07 * sc, 0, sc), c: GOLD });
        if (ti < 2) {
          const holder = new THREE.Group();
          holder.rotation.y = a;
          const sw = new THREE.Group();
          sw.position.set(0, T.yE - 0.01, T.rE * 0.97 + 0.12 * sc);
          const cord = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 4), darkMat, false);
          cord.position.y = -0.035;
          const bell = mesh(bellGeo, bellMat, false);
          bell.position.y = -0.07;
          bell.scale.setScalar(sc);
          const clap = mesh(new THREE.SphereGeometry(0.014, 8, 6), goldMat, false);
          clap.position.y = -0.07 - 0.105 * sc;
          sw.add(cord, bell, clap);
          holder.add(sw);
          body.add(holder);
          bells.push({ sw, ph: i * 1.9 + ti });
        }
      }
      body.add(mesh(bake(goldParts), goldBaked));
    });

    const top = new THREE.Group();
    top.position.y = 3.3;
    body.add(top);
    {
      const prof = table([
        [0, 0.13],
        [0.05, 0.15],
        [0.09, 0.1],
        [0.13, 0.125],
        [0.17, 0.08],
        [0.21, 0.1],
        [0.25, 0.06],
        [0.32, 0.075]
      ]);
      const pts = [];
      for (let k = 0; k <= 32; k++) pts.push(new THREE.Vector2(prof((k / 32) * 0.32), (k / 32) * 0.32));
      top.add(mesh(new THREE.LatheGeometry(pts, 24), goldMat));
      const budR = table([
        [0, 0.075],
        [0.08, 0.125],
        [0.2, 0.1],
        [0.32, 0.03]
      ]);
      const bp = [];
      for (let k = 0; k <= 18; k++) bp.push(new THREE.Vector2(budR((k / 18) * 0.32), 0.32 + (k / 18) * 0.32));
      bp.push(new THREE.Vector2(0.001, 0.645));
      top.add(mesh(new THREE.LatheGeometry(bp, 20), mat(0xe0699b, 0.55)));
      const pg = petalGeo({ w: 0.085, len: 0.3, cup: 0.05, bend: -0.1, nu: 12, nv: 6 });
      for (let i = 0; i < 5; i++) {
        const holder = new THREE.Group();
        holder.rotation.y = (i / 5) * TAU;
        const m = mesh(pg, petalMat, false);
        m.position.set(0, 0.32, 0.075);
        m.rotation.x = 0.2;
        holder.add(m);
        top.add(holder);
      }
      const cap = [
        [0.03, 0.59],
        [0.045, 0.61],
        [0.04, 0.645],
        [0.02, 0.662],
        [0.001, 0.665]
      ].map(p => new THREE.Vector2(p[0], p[1]));
      top.add(mesh(new THREE.LatheGeometry(cap, 16), waxMat, false));
      const wick = mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.07, 6), darkMat, false);
      wick.position.y = 0.695;
      top.add(wick);
    }
    const flameGeo = (h, w) => {
      const pts = [];
      for (let i = 0; i <= 18; i++) {
        const u = i / 18;
        pts.push(new THREE.Vector2(Math.max(w * Math.sin(Math.PI * Math.pow(u, 0.6)) * (1 - 0.4 * u), 0.0001), u * h));
      }
      return new THREE.LatheGeometry(pts, 20);
    };
    const flame = new THREE.Group();
    flame.position.y = 0.72;
    flame.add(new THREE.Mesh(flameGeo(0.56, 0.16), new THREE.MeshBasicMaterial({ color: 0xff8f1a, side: THREE.BackSide })));
    const flameMid = new THREE.Mesh(flameGeo(0.4, 0.11), new THREE.MeshBasicMaterial({ color: 0xffc93a, side: THREE.BackSide }));
    flameMid.position.y = 0.012;
    const flameCore = new THREE.Mesh(flameGeo(0.21, 0.06), new THREE.MeshBasicMaterial({ color: 0xfffbe6 }));
    flameCore.position.y = 0.03;
    flame.add(flameMid, flameCore);
    top.add(flame);

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
    halo.position.y = 0.98;
    top.add(halo);
    const light = new THREE.PointLight(0xffc270, 0.7, 8);
    light.position.set(0, 2.2, 1.6);
    body.add(light);

    const NP = V3(0, 0.8, 0.8);
    const neckG = new THREE.Group();
    neckG.position.copy(NP);
    body.add(neckG);
    const neckR = u => lerp(0.3, 0.2, smooth(0, 0.9, u));
    const neckPts = [V3(0, -0.05, -0.2), V3(0, 0.08, 0.42), V3(0, 0.52, 0.84), V3(0, 0.98, 0.9), V3(0, 1.26, 1.02)];
    const neck = tube(neckPts, neckR, 40, 26, (u, a) => {
      const ventral = smooth(0.35, 0.6, -Math.sin(a));
      return mix3(mix3(rgb(WAXSHADE), rgb(IVORY), 0.5 + 0.5 * Math.cos(a) * 0.3 + 0.2), rgb(BELLY), ventral);
    });
    neckG.add(mesh(neck.g, skinMat));
    {
      const at = (u, a, lift) => {
        const f = neck.frame(u);
        const r = neckR(u) + lift;
        return V3(f.c.x + (f.n1.x * Math.cos(a) + f.n2.x * Math.sin(a)) * r, f.c.y + (f.n1.y * Math.cos(a) + f.n2.y * Math.sin(a)) * r, f.c.z + (f.n1.z * Math.cos(a) + f.n2.z * Math.sin(a)) * r);
      };
      for (let k = 0; k < 9; k++) {
        const u = 0.24 + k * 0.082;
        const p = [];
        for (let q = 0; q <= 10; q++) p.push(at(u, Math.PI + 0.75 + (q / 10) * (Math.PI - 1.5), 0.004));
        neckG.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 16, 0.007, 5, false), seamMat, false));
      }
      const scales = [];
      for (let k = 0; k < 10; k++)
        [0.12, 0.62, Math.PI - 0.12, Math.PI - 0.62].forEach((a, row) => {
          const u = 0.22 + (k + (row % 2) * 0.5) * 0.074;
          if (u > 0.95) return;
          const p = at(u, a, -0.012);
          scales.push({ g: blob, m: xf(p.x, p.y, p.z, 0, 0, 0, 0.042 - u * 0.012), c: 0xf7a9c0 });
        });
      neckG.add(mesh(bake(scales), bakedMat, false));
      const fins = [];
      for (let k = 0; k < 7; k++) {
        const u = 0.3 + k * 0.1;
        const f = neck.frame(u);
        const p = at(u, Math.PI / 2, -0.02);
        const m = new THREE.Matrix4().makeBasis(f.tg, f.n2, f.n1.clone().negate());
        m.setPosition(p);
        m.multiply(new THREE.Matrix4().makeScale(0.75 + Math.sin((k / 6) * Math.PI) * 0.45, 0.75 + Math.sin((k / 6) * Math.PI) * 0.45, 1));
        fins.push({ g: finGeo, m, c: GOLD });
      }
      neckG.add(mesh(bake(fins), goldBaked));

      const f0 = neck.frame(0.2);
      const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), f0.tg);
      const garland = new THREE.Group();
      garland.position.copy(f0.c);
      garland.quaternion.copy(q);
      const beads = [];
      const N = 26;
      const R = neckR(0.2) + 0.03;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        const big = i % 4 === 2;
        beads.push({ g: blob, m: xf(Math.sin(a) * R, 0, Math.cos(a) * R, 0, 0, 0, big ? 0.052 : 0.042), c: big ? 0xff8a1e : 0xfffaf0 });
      }
      garland.add(mesh(bake(beads), bakedMat, false));
      const pend = mesh(marigoldGeo, bakedMat, false);
      pend.scale.setScalar(0.12);
      pend.position.set(0, -0.02, -R - 0.05);
      pend.rotation.x = -1.4;
      garland.add(pend);
      neckG.add(garland);
    }

    const headPt = (nx, ny, nz) => {
      let x = nx * 0.42;
      const y = ny * (ny < 0 ? 0.31 : 0.35);
      let z = nz * 0.4;
      if (nz > 0) {
        const s = Math.exp(-(Math.pow(nx / 0.5, 2) + Math.pow((ny + 0.2) / 0.45, 2)));
        z += 0.16 * s * nz;
        x *= 1 - 0.14 * nz;
      }
      x += Math.sign(nx) * 0.045 * Math.exp(-Math.pow((ny + 0.35) / 0.32, 2)) * Math.abs(nx);
      return [x, y, z];
    };
    const face = (yaw, pitch, lift = 1) => {
      const p = headPt(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      return V3(p[0] * lift, p[1] * lift, p[2] * lift);
    };
    const head = new THREE.Group();
    head.position.set(0, 1.4, 1.12);
    head.scale.setScalar(1.12);
    neckG.add(head);
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
      e.g.position.copy(face(0.62 * s, 0.14, 0.9));
      e.g.rotation.set(-0.1, 0.52 * s, 0);
      head.add(e.g);
      const brow = tube([face(0.95 * s, 0.42, 1.01), face(0.62 * s, 0.6, 1.01), face(0.3 * s, 0.5, 1.01)], u => 0.016 * Math.sin(Math.PI * (0.15 + 0.85 * u)) + 0.004, 12, 6).g;
      head.add(mesh(brow, goldMat, false));
      return e;
    });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf78fb0, transparent: true, opacity: 0.6 });
    const nostrils = [-1, 1].map(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), cheekMat);
      c.scale.set(1.15, 0.7, 1);
      c.position.copy(face(0.95 * s, -0.32, 1.012));
      c.rotation.set(0.28, 1.0 * s, 0);
      head.add(c);
      const n = mesh(new THREE.SphereGeometry(0.014, 8, 8), darkMat, false);
      n.scale.set(1, 1.4, 0.6);
      n.position.copy(face(0.085 * s, -0.12, 1.0));
      head.add(n);
      return face(0.2 * s, -0.2, 1.03);
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
      const g = new THREE.ExtrudeGeometry(dropShape, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 14 });
      const mark = mesh(g, goldMat, false);
      mark.position.copy(face(0, 0.5, 0.985));
      mark.rotation.x = -0.85;
      head.add(mark);
      [
        [0.02, 0.33, 0.1, 1.5],
        [0, 0.32, -0.05, 1.15],
        [-0.0, 0.28, -0.19, 0.85]
      ].forEach(([x, y, z, sc]) => {
        const fin = mesh(finGeo, goldMat);
        fin.position.set(0, y, z);
        fin.rotation.y = Math.PI / 2;
        fin.scale.set(sc, sc, 1.3);
        head.add(fin);
      });
      const frill = petalGeo({ w: 0.12, len: 0.36, cup: 0.05, bend: -0.06, nu: 12, nv: 6 });
      [-1, 1].forEach(s => {
        [
          [0.3, -0.5, 1],
          [0.05, -0.62, 0.8],
          [-0.2, -0.6, 0.62]
        ].forEach(([up, back, sc]) => {
          const m = mesh(frill, petalMat, false);
          m.position.copy(face(1.32 * s, up * 0.6 - 0.05, 0.9));
          m.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(s * 0.75, up, back).normalize());
          m.scale.setScalar(sc);
          head.add(m);
        });
      });
    }
    const muzzle = new THREE.Group();
    muzzle.position.copy(face(0, -0.3, 1.3));
    head.add(muzzle);
    const mouthAnchor = new THREE.Group();
    mouthAnchor.position.copy(face(0, -0.62, 1.25));
    head.add(mouthAnchor);

    const whiskMat = new THREE.MeshBasicMaterial({ color: 0xf6f1e8, transparent: true, opacity: 0.45, depthWrite: false });
    const whiskers = [];
    [-1, 1].forEach((s, si) => {
      for (let i = 0; i < 13; i++) {
        const m = new THREE.Mesh(blob, whiskMat);
        head.add(m);
        whiskers.push({ m, s, i, start: nostrils[si] });
      }
    });

    const tailG = new THREE.Group();
    tailG.position.set(0, 0.74, -0.86);
    body.add(tailG);
    {
      const tp = [V3(0, 0, 0.2), V3(0, -0.1, -0.3), V3(0, -0.02, -0.62), V3(0, 0.22, -0.8), V3(0, 0.44, -0.78)];
      const t = tube(tp, u => lerp(0.24, 0.07, smooth(0, 1, u)), 26, 18, (u, a) => mix3(rgb(WAXSHADE), rgb(IVORY), 0.5 + 0.4 * Math.sin(a)));
      tailG.add(mesh(t.g, skinMat));
      const f = t.frame(1);
      const bud = new THREE.Group();
      bud.position.copy(f.c);
      bud.quaternion.setFromUnitVectors(V3(0, 1, 0), f.tg);
      const br = table([
        [0, 0.07],
        [0.08, 0.13],
        [0.2, 0.1],
        [0.3, 0.02]
      ]);
      const bp = [];
      for (let k = 0; k <= 16; k++) bp.push(new THREE.Vector2(br((k / 16) * 0.3), -0.02 + (k / 16) * 0.3));
      bp.push(new THREE.Vector2(0.001, 0.285));
      bud.add(mesh(new THREE.LatheGeometry(bp, 18), mat(0xe0699b, 0.55)));
      const pg = petalGeo({ w: 0.09, len: 0.3, cup: 0.05, bend: -0.1, nu: 12, nv: 6 });
      for (let i = 0; i < 5; i++) {
        const holder = new THREE.Group();
        holder.rotation.y = (i / 5) * TAU;
        const m = mesh(pg, petalMat, false);
        m.position.set(0, -0.02, 0.07);
        m.rotation.x = 0.22;
        holder.add(m);
        bud.add(holder);
      }
      const sep = fold3();
      function fold3() {
        const g = new THREE.ConeGeometry(0.1, 0.1, 5);
        return mesh(g, mat(LEAFDARK, 0.6), false);
      }
      sep.rotation.x = Math.PI;
      sep.position.y = -0.04;
      bud.add(sep);
      tailG.add(bud);
    }

    const pads = [
      [1.25, 1.1, 0.4, 0.4],
      [-1.35, 0.55, 0.34, 2.2],
      [1.2, -0.95, 0.36, 4.0],
      [-1.05, -1.2, 0.3, 5.3],
      [0.45, 1.75, 0.26, 1.2]
    ].map(([x, z, r, rot], i) => {
      const g = new THREE.Group();
      g.position.set(x, 0.02, z);
      g.rotation.y = rot;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 28, 0.22, TAU - 0.44), mat(LEAF, 0.6));
      disc.rotation.x = -Math.PI / 2;
      const inner = new THREE.Mesh(new THREE.CircleGeometry(r * 0.62, 24, 0.3, TAU - 0.6), mat(LEAFLIGHT, 0.6));
      inner.rotation.x = -Math.PI / 2;
      inner.position.y = 0.004;
      g.add(disc, inner);
      for (let k = 0; k < 7; k++) {
        const a = 0.5 + (k / 6) * (TAU - 1.0);
        const vein = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, r * 0.86), mat(LEAFDARK, 0.6));
        vein.position.set(Math.cos(a) * r * 0.45, 0.007, -Math.sin(a) * r * 0.45);
        vein.rotation.y = a + Math.PI / 2;
        g.add(vein);
      }
      if (i % 2 === 0) {
        const b = mesh(new THREE.SphereGeometry(0.07, 12, 10), mat(PINK, 0.5), false);
        b.scale.set(0.8, 1.5, 0.8);
        b.position.set(r * 0.2, 0.09, -r * 0.1);
        g.add(b);
      }
      rig.add(g);
      return { g, x, z, ph: i * 1.3 };
    });

    const lanternGeo = (() => {
      const pts = [
        [0.085, 0],
        [0.1, 0.02],
        [0.14, 0.16],
        [0.15, 0.25],
        [0.13, 0.31],
        [0.07, 0.345],
        [0.001, 0.35]
      ].map(p => new THREE.Vector2(p[0], p[1]));
      return new THREE.LatheGeometry(pts, 16);
    })();
    const lanternRim = new THREE.TorusGeometry(0.086, 0.008, 6, 20);
    const makeLantern = () => {
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: 0xffe2a8, roughness: 0.8, emissive: 0xffa53a, emissiveIntensity: 0.95, transparent: true, side: THREE.DoubleSide });
      g.add(new THREE.Mesh(lanternGeo, m));
      const rim = new THREE.Mesh(lanternRim, darkMat);
      rim.rotation.x = Math.PI / 2;
      g.add(rim);
      const sp = new THREE.Sprite(spriteMat());
      sp.position.y = 0.12;
      sp.scale.setScalar(0.55);
      g.add(sp);
      g.visible = false;
      rig.add(g);
      return { g, m, sp };
    };
    const drift = [];
    for (let i = 0; i < 6; i++) drift.push({ ...makeLantern(), ph: i / 6, a: i * 2.3 + 0.4, rad: 0.9 + (i % 3) * 0.35 });
    const swarm = [];
    for (let i = 0; i < 14; i++) swarm.push({ ...makeLantern(), a: (i / 14) * TAU + (i % 2) * 0.3, d: (i % 5) * 0.035, rad: 0.7 + (i % 4) * 0.3 });

    const ripples = [0, 1].map(i => {
      const m = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.58, 80), new THREE.MeshBasicMaterial({ color: 0xa8e6ec, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.02;
      rig.add(m);
      return { m, ph: i * 0.5 };
    });

    const food = berry();
    food.visible = false;
    squash.add(food);
    const tmp = new THREE.Vector3();

    return {
      root,
      muzzle,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const is = n => (action && action.name === n ? action : null);
        const jump = is("jump");
        const eat = is("eat");
        const cast = is("lanterns");
        const atk = is("attack") ? strike(action.p) : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const fire = s.dying ? 0.35 : 0.6 + 0.4 * clamp01(hunger / 100);

        let y = 0;
        let z = 0;
        let sy = 1 + Math.sin(t * 1.2) * 0.008 * motion;
        let neckX = Math.sin(t * 0.8) * 0.03 * motion - pointer.y * 0.08;
        let headX = -pointer.y * 0.2;
        let flameK = 1;
        let mouth = false;
        let squint = 0;
        let airborne = false;
        let jingle = 0.12;
        let charge = 0;
        let burst = 0;
        let pitch = 0;
        let ripple = 0;

        if (jump) {
          const p = jump.p;
          if (p < 0.3) sy = 1 - 0.07 * Math.sin((p / 0.3) * Math.PI * 0.5);
          else if (p < 0.7) {
            const q = (p - 0.3) / 0.4;
            y = Math.sin(q * Math.PI) * 0.42;
            sy = 1 + 0.03 * Math.cos(q * Math.PI);
            airborne = true;
            neckX -= Math.sin(q * Math.PI) * 0.12;
          } else {
            const q = (p - 0.7) / 0.3;
            sy = 1 - 0.09 * Math.sin(q * Math.PI) * (1 - q * 0.5);
            jingle = 1.2 * (1 - q);
            ripple = 1 - q;
          }
          mouth = p > 0.3 && p < 0.6;
        }
        if (cast) {
          const p = cast.p;
          charge = smooth(0, 0.3, p) * (1 - smooth(0.32, 0.4, p));
          burst = smooth(0.34, 0.44, p) * (1 - smooth(0.8, 1, p));
          neckX += charge * 0.2 - burst * 0.3;
          headX += -burst * 0.3;
          squint = charge > 0.3 ? 1 : 0;
          mouth = burst > 0.4 && p < 0.7;
          flameK = 1 - charge * 0.3 + burst * 1.1;
          sy += -charge * 0.03 + burst * 0.02;
          jingle = 0.12 + burst * 0.9;
        }
        if (eat) {
          const k = Math.sin(clamp01(ph.fall) * Math.PI * 0.5);
          neckX += k * 0.5;
          headX += k * 0.15 + ph.chew * 0.06;
          mouth = eat.p > 0.14 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3 ? 0.6 : 0;
        }
        if (atk) {
          neckX += -atk.wind * 0.35 + atk.lunge * 0.62;
          headX += atk.wind * 0.3 - atk.lunge * 0.5;
          z = atk.lunge * 0.55 - atk.wind * 0.12;
          pitch = atk.lunge * 0.07 - atk.wind * 0.04;
          sy += -atk.wind * 0.04;
          flameK = 1 + atk.impact * 1.2;
          squint = atk.lunge > 0.3 ? 0.7 : 0;
          mouth = atk.lunge > 0.2;
          jingle = 0.12 + atk.impact * 1.2;
        }

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.set(0, y, z);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        body.rotation.x = pitch;
        body.rotation.z = Math.sin(t * 0.6) * 0.008 * motion;

        neckG.rotation.x = lerp(neckG.rotation.x, neckX, 0.2);
        neckG.rotation.z = Math.sin(t * 0.7) * 0.035 * motion;
        neckG.rotation.y = lerp(neckG.rotation.y, pointer.x * 0.12, 0.08);
        head.rotation.y = lerp(head.rotation.y, pointer.x * 0.45, 0.1);
        head.rotation.x = lerp(head.rotation.x, headX, 0.15);
        head.rotation.z = Math.sin(t * 0.9) * 0.03 * motion;

        mouthLine.visible = !mouth;
        mouthOpen.visible = mouth;
        mouthOpen.scale.y = eat ? 0.04 + ph.chew * 0.05 : 0.07;

        if (eat) {
          root.updateMatrixWorld(true);
          mouthAnchor.getWorldPosition(tmp);
          squash.worldToLocal(tmp);
          food.visible = ph.visible;
          const k = ph.fall * ph.fall;
          food.position.set(tmp.x, lerp(tmp.y + 2.6, tmp.y, k), tmp.z);
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = (1 - ph.fall) * 1.2;
        } else food.visible = false;

        whiskers.forEach(w => {
          const i = w.i;
          const wave = Math.sin(t * 1.8 - i * 0.55 + w.s) * 0.012 * i * motion;
          w.m.position.set(w.start.x + w.s * (0.02 + 0.05 * i) + wave * 0.5, w.start.y - 0.022 * i + 0.0062 * i * i + wave, w.start.z + 0.05 * i - 0.0042 * i * i);
          w.m.scale.setScalar(0.024 * (1 - i / 15) + 0.004 + burst * 0.006);
        });

        tailG.rotation.y = Math.sin(t * 0.9) * 0.18 * motion;
        legs.forEach(L => {
          L.g.scale.y = airborne ? 1.06 : 1;
        });
        throne.forEach(p => {
          p.m.rotation.x = 0.85 + Math.sin(t * 1.3 + p.ph) * 0.025 * motion + burst * 0.2;
        });
        bells.forEach(b => {
          b.sw.rotation.x = Math.sin(t * 3.1 + b.ph) * 0.22 * jingle * (motion || 0.3);
          b.sw.rotation.z = Math.sin(t * 2.7 + b.ph * 1.3) * 0.22 * jingle * (motion || 0.3);
        });

        const fk = flameK * fire;
        const flick = 1 + 0.1 * Math.sin(t * 11) + 0.06 * Math.sin(t * 19.3);
        flame.scale.set(fk * (1 + 0.06 * Math.sin(t * 7.3)), Math.max(0.05, fk * flick), fk * (1 + 0.06 * Math.sin(t * 8.1)));
        flame.rotation.z = Math.sin(t * 2.7) * 0.1 * motion;
        halo.scale.setScalar((1.3 + 0.08 * Math.sin(t * 9) + burst * 0.9) * (0.35 + Math.min(fk, 1.5) * 0.65));
        halo.material.opacity = 0.75 * Math.min(1, fk);
        light.intensity = (0.55 + 0.08 * Math.sin(t * 11) + burst * 1.6) * fk;
        goldMat.emissiveIntensity = 0.25 + 0.06 * Math.sin(t * 2.4) * motion + burst * 0.9;
        goldBaked.emissiveIntensity = 0.22 + burst * 0.8;

        winFlames.forEach(w => {
          const k = w.f.userData.s * fire;
          w.f.scale.set(k * (1 + 0.1 * Math.sin(t * 8 + w.ph)), k * (1 + 0.22 * Math.sin(t * 12 + w.ph * 2) + burst * 0.5), 1);
        });
        const lit = 0.75 + 0.25 * fire;
        windowMat.color.setRGB(1 * lit, 0.94 * lit, 0.69 * lit * lit);
        glows.forEach((g, i) => {
          const wave = cast ? smooth(0.3 + i * 0.07, 0.36 + i * 0.07, cast.p) * (1 - smooth(0.8, 1, cast.p)) : 0;
          g.material.opacity = (0.05 + 0.03 * Math.sin(t * 3 + i * 2)) * fire + wave * 0.5;
        });

        drift.forEach(L => {
          const u = (((t * 0.07 + L.ph) % 1) + 1) % 1;
          const a = L.a + Math.sin(t * 0.3 + L.a) * 0.3;
          const fade = smooth(0, 0.12, u) * (1 - smooth(0.7, 1, u));
          L.g.visible = fade > 0.01;
          L.g.position.set(Math.sin(a) * L.rad * (1 + u * 0.5), 2.3 + u * 3.2, Math.cos(a) * L.rad * (1 + u * 0.5) - 0.2);
          L.g.rotation.z = Math.sin(t * 0.9 + L.a) * 0.08;
          L.g.scale.setScalar(0.25 + fade * 0.75);
          L.m.opacity = Math.min(1, fade * 4);
          L.sp.material.opacity = fade * 0.8;
        });
        const sq = cast ? clamp01((cast.p - 0.38) / 0.6) : 0;
        swarm.forEach(L => {
          const q = clamp01(sq * 1.15 - L.d * 3);
          L.g.visible = q > 0 && q < 1;
          if (!L.g.visible) return;
          const up = Math.sin(Math.PI * Math.pow(q, 0.8));
          const a = L.a + q * 1.4;
          const r = L.rad * (0.5 + q * 1.6);
          L.g.position.set(Math.sin(a) * r, 1.6 + up * 3.4, Math.cos(a) * r + q * q * 1.6);
          L.g.rotation.z = Math.sin(q * 9 + L.a) * 0.15;
          const fade = Math.sin(Math.PI * q);
          L.g.scale.setScalar(0.5 + fade * 0.6);
          L.m.opacity = Math.min(1, fade * 1.5);
          L.sp.material.opacity = fade;
        });

        pads.forEach(p => {
          p.g.position.y = 0.02 + Math.sin(t * 1.4 + p.ph) * 0.006 * motion;
          p.g.position.x = p.x + Math.sin(t * 0.5 + p.ph) * 0.03 * motion;
          p.g.rotation.z = Math.sin(t * 1.4 + p.ph) * 0.02 * motion;
        });
        ripples.forEach(r => {
          const u = (((t * 0.25 + r.ph) % 1) + 1) % 1;
          r.m.scale.setScalar(0.8 + u * 0.6 + ripple * 0.25);
          r.m.material.opacity = airborne ? 0 : (0.36 + ripple * 0.4) * (1 - u) * (1 - u);
        });

        const lid = squint ? 1 - squint : blink;
        eyes.forEach(({ g }) => {
          g.scale.y = Math.max(0.08, lid);
        });
        followPupils(eyes, pointer, 0.8);
      }
    };
  }
});
