Pets.register({
  id: "rachadalma",
  dex: 46,
  name: "Rachadalma",
  color: "#8a6a32",
  types: ["ghost", "steel"],
  stage: 2,
  move: "fly",
  description: "Um sino de bronze tão antigo que o fantasma cresceu demais para ele e o virou de boca para baixo, rachando o metal. Por uma fenda na frente só se vê um dos seus olhos brilhando, e pelas rachaduras dos lados ele estica braços com garras. Quando toca, o som sai trincado e arrepia quem escuta.",
  actions: {
    jump: { duration: 1.2 },
    eat: { duration: 2.6 },
    ring: { duration: 2.4 },
    claw: { duration: 2.0 },
    peek: { duration: 2.4 },
    spin: { duration: 2.2 }
  },
  battle: { attack: { action: "claw", hit: 0.48, speed: 1.0 }, special: { action: "ring", hit: 0.42, speed: 1.0 } },
  idle: [
    { action: "peek", min: 14, max: 32 },
    { action: "ring", min: 25, max: 55 },
    { action: "claw", min: 30, max: 60 },
    { action: "spin", min: 40, max: 80 }
  ],
  clickAction: n => ["ring", "claw", "peek", "spin", "jump"][(n - 1) % 5],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const TAU = Math.PI * 2;
    const hasDoc = typeof document !== "undefined";

    const root = new THREE.Group();
    const bodyG = new THREE.Group();
    root.add(bodyG);
    const BY = 0.78;
    const bell = new THREE.Group();
    bell.position.y = BY;
    bodyG.add(bell);

    const OUT = [
      [0.8, 0.0],
      [0.81, 0.04],
      [0.77, 0.11],
      [0.66, 0.26],
      [0.57, 0.48],
      [0.52, 0.72],
      [0.505, 0.95],
      [0.49, 1.1],
      [0.43, 1.2],
      [0.3, 1.27],
      [0.12, 1.3],
      [0.0, 1.3]
    ];
    const curve = new THREE.SplineCurve(OUT.map(([r, y]) => V2(r, y)));
    const NV = 96;
    const NU = 160;
    const TH = 0.055;
    const prof = [];
    for (let i = 0; i <= NV; i++) {
      const v = i / NV;
      const p = curve.getPointAt(v);
      const tg = curve.getTangentAt(v);
      const n = V2(tg.y, -tg.x).normalize();
      if (n.x < 0 && v < 0.95) n.multiplyScalar(-1);
      const th = TH * (1 + 0.6 * Math.exp(-((v - 0.07) * (v - 0.07)) / 0.003));
      prof.push({ o: V2(Math.max(0, p.x), p.y), i: V2(Math.max(0, p.x - n.x * th), p.y - n.y * th), v });
    }
    const profAt = (k, w) => {
      const k0 = Math.max(0, Math.min(NV - 1, Math.floor(k)));
      const f = Math.max(0, Math.min(1, k - k0));
      return prof[k0][w].clone().lerp(prof[k0 + 1][w], f);
    };
    const kOfY = y => {
      for (let k = 0; k < NV; k++) {
        const y0 = prof[k].o.y;
        const y1 = prof[k + 1].o.y;
        if (y >= y0 && y <= y1 && y1 > y0) return k + (y - y0) / (y1 - y0);
      }
      return y < prof[0].o.y ? 0 : NV;
    };
    const P = [];
    const pOut = (u, k) => {
      const th = u * TAU - Math.PI;
      const q = profAt(k, "o");
      return V3(q.x * Math.sin(th), q.y, q.x * Math.cos(th));
    };
    const pIn = (u, k) => {
      const th = u * TAU - Math.PI;
      const q = profAt(k, "i");
      return V3(q.x * Math.sin(th), q.y, q.x * Math.cos(th));
    };
    let sd = 7;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const jag = (cx, cy, rx, ry, n, rough) => {
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        const r = k % 2 ? 1 - rough * (0.3 + rnd() * 0.5) : 1 + rough * rnd() * 0.25;
        pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
      }
      return pts;
    };
    const HOLES = [
      { th: 0.12, y: 0.82, poly: jag(0, 0, 0.2, 0.17, 18, 0.55) },
      { th: Math.PI / 2, y: 0.58, poly: jag(0, 0, 0.13, 0.11, 14, 0.5) },
      { th: -Math.PI / 2, y: 0.58, poly: jag(0, 0, 0.13, 0.11, 14, 0.5) }
    ];
    const inPoly = (x, y, poly) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const cut = (u, k) => {
      const th = u * TAU - Math.PI;
      const q = profAt(k, "o");
      for (const h of HOLES) {
        let d = th - h.th;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        if (inPoly(d * q.x, q.y - h.y, h.poly)) return true;
      }
      return false;
    };
    const keep = [];
    for (let i = 0; i < NU; i++) {
      keep.push([]);
      for (let k = 0; k < NV; k++) keep[i].push(!cut((i + 0.5) / NU, k + 0.5));
    }
    const nearestOn = (x, y, poly) => {
      let best = null;
      let bd = 1e9;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [ax, ay] = poly[j];
        const [bx, by] = poly[i];
        const dx = bx - ax;
        const dy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
        const px = ax + dx * t;
        const py = ay + dy * t;
        const d = (px - x) * (px - x) + (py - y) * (py - y);
        if (d < bd) {
          bd = d;
          best = [px, py];
        }
      }
      return best;
    };
    for (let i = 0; i <= NU; i++) {
      P.push([]);
      for (let k = 0; k <= NV; k++) {
        let kept = 0;
        let cutn = 0;
        [[i - 1, k - 1], [i, k - 1], [i - 1, k], [i, k]].forEach(([qi, qk]) => {
          if (qk < 0 || qk >= NV) return;
          const ii = (qi + NU) % NU;
          if (keep[ii][qk]) kept++;
          else cutn++;
        });
        let u = i / NU;
        let kk = k;
        if (kept && cutn) {
          const th = u * TAU - Math.PI;
          const q = prof[k].o;
          for (const h of HOLES) {
            let d = th - h.th;
            while (d > Math.PI) d -= TAU;
            while (d < -Math.PI) d += TAU;
            const lx = d * q.x;
            const ly = q.y - h.y;
            if (Math.abs(lx) > 0.4 || Math.abs(ly) > 0.4) continue;
            const [nx, ny] = nearestOn(lx, ly, h.poly);
            const yy = h.y + ny;
            kk = kOfY(yy);
            const r = profAt(kk, "o").x;
            const nth = h.th + nx / r;
            u = (nth + Math.PI) / TAU;
            if (Math.abs(u - i / NU) > 0.5) u += u < i / NU ? 1 : -1;
            break;
          }
        }
        P[i].push([u, kk]);
      }
    }

    const bellTex = (() => {
      if (!hasDoc) return null;
      const W = 1024;
      const H = 512;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      const base = g.createLinearGradient(0, 0, 0, H);
      base.addColorStop(0, "#7a5a26");
      base.addColorStop(0.5, "#8f6c30");
      base.addColorStop(1, "#6a4c1e");
      g.fillStyle = base;
      g.fillRect(0, 0, W, H);
      let s2 = 3;
      const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < 90; k++) {
        const x = r2() * W;
        const y0 = r2() * H * 0.6;
        const len = 40 + r2() * 160;
        const w = 6 + r2() * 18;
        const gr = g.createLinearGradient(0, y0, 0, y0 + len);
        gr.addColorStop(0, "rgba(70,150,120,0)");
        gr.addColorStop(0.3, "rgba(80,160,128,0.55)");
        gr.addColorStop(1, "rgba(80,160,128,0)");
        g.fillStyle = gr;
        g.beginPath();
        g.ellipse(x, y0 + len / 2, w / 2, len / 2, 0, 0, TAU);
        g.fill();
      }
      const yOfV = v => (1 - v) * H;
      const band = (v0, v1) => {
        const y0 = yOfV(v1);
        const y1 = yOfV(v0);
        g.fillStyle = "rgba(40,26,10,0.45)";
        g.fillRect(0, y0, W, 3);
        g.fillRect(0, y1 - 3, W, 3);
        g.fillStyle = "rgba(230,190,110,0.5)";
        g.fillRect(0, y0 + 3, W, 2);
        g.fillRect(0, y1 - 1, W, 2);
        g.strokeStyle = "rgba(225,185,105,0.75)";
        g.lineWidth = 3;
        const n = 28;
        for (let k = 0; k < n; k++) {
          const x = (k / n) * W + W / n / 2;
          const cy = (y0 + y1) / 2;
          const s = (y1 - y0) * 0.32;
          g.beginPath();
          g.moveTo(x - s, cy + s * 0.6);
          g.quadraticCurveTo(x - s * 0.2, cy - s * 1.2, x, cy);
          g.quadraticCurveTo(x + s * 0.2, cy + s * 1.2, x + s, cy - s * 0.6);
          g.stroke();
        }
      };
      band(0.09, 0.16);
      band(0.78, 0.86);
      g.strokeStyle = "rgba(225,185,105,0.6)";
      g.lineWidth = 2;
      [0.24, 0.72].forEach(v => {
        g.beginPath();
        g.moveTo(0, yOfV(v));
        g.lineTo(W, yOfV(v));
        g.stroke();
      });
      const crackLine = (u0, v0, ang, len, depth) => {
        if (depth > 3 || len < 6) return;
        let x = u0 * W;
        let y = yOfV(v0);
        g.beginPath();
        g.moveTo(x, y);
        const steps = 5;
        for (let k = 0; k < steps; k++) {
          ang += (r2() - 0.5) * 0.9;
          x += Math.cos(ang) * (len / steps);
          y += Math.sin(ang) * (len / steps);
          g.lineTo(x, y);
        }
        g.lineWidth = Math.max(1.2, 4 - depth);
        g.strokeStyle = "rgba(20,12,6,0.9)";
        g.stroke();
        if (r2() < 0.7) crackLine(x / W, 1 - y / H, ang + (r2() - 0.5) * 1.4, len * 0.6, depth + 1);
      };
      HOLES.forEach(h => {
        const u = (h.th + Math.PI) / TAU;
        const vy = h.y / 1.3;
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * TAU + r2();
          crackLine(u + Math.cos(a) * 0.03, vy + Math.sin(a) * 0.1, -a, 60 + r2() * 60, 0);
        }
      });
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.anisotropy = 8;
      return t;
    })();
    const bronze = new THREE.MeshStandardMaterial({ color: 0xffffff, map: bellTex, roughness: 0.42, metalness: 0.35 });
    kit.surface(bronze, bellTex, { seed: 12, rough: [0.3, 0.7], metal: 0.3, scratch: 0.6, pits: 1, bump: 0.06 });
    const bronzeIn = new THREE.MeshStandardMaterial({ color: 0x2a1c0c, roughness: 0.8, metalness: 0.2 });
    const bronzeEdge = new THREE.MeshStandardMaterial({ color: 0xb08a48, roughness: 0.5, metalness: 0.45 });
    const darkBronze = new THREE.MeshStandardMaterial({ color: 0x5a4018, roughness: 0.5, metalness: 0.4 });
    const ghostMat = new THREE.MeshStandardMaterial({ color: 0xe6ecfa, roughness: 0.6, emissive: 0x6a7ac0, emissiveIntensity: 0.45 });
    const ghostWisp = new THREE.MeshStandardMaterial({ color: 0xe6ecfa, roughness: 0.6, emissive: 0x6a7ac0, emissiveIntensity: 0.35, transparent: true, opacity: 0.9 });
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x2c2640 });
    const hollowMat = new THREE.MeshBasicMaterial({ color: 0x05030a });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });

    const buildSurface = (fn, flip, skipCut) => {
      const pos = [];
      const uv = [];
      for (let k = 0; k <= NV; k++)
        for (let i = 0; i <= NU; i++) {
          const p = fn(P[i][k][0], P[i][k][1]);
          pos.push(p.x, p.y, p.z);
          uv.push(P[i][k][0], profAt(P[i][k][1], "o").y / 1.3);
        }
      const idx = [];
      const id = (i, k) => k * (NU + 1) + i;
      for (let k = 0; k < NV; k++)
        for (let i = 0; i < NU; i++) {
          if (!skipCut && !keep[i][k]) continue;
          const a = id(i, k);
          const b = id(i + 1, k);
          const c = id(i + 1, k + 1);
          const d = id(i, k + 1);
          if (flip) idx.push(a, d, b, b, d, c);
          else idx.push(a, b, d, b, c, d);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    const outerGeo = buildSurface(pOut, false);
    const innerGeo = buildSurface(pIn, true);
    const fixWinding = (g, inward) => {
      const p = g.attributes.position;
      const ix = g.index.array;
      const a = V3(0, 0, 0);
      const b = V3(0, 0, 0);
      const c = V3(0, 0, 0);
      let good = 0;
      let all = 0;
      for (let t = 0; t < ix.length; t += 3) {
        a.fromBufferAttribute(p, ix[t]);
        b.fromBufferAttribute(p, ix[t + 1]);
        c.fromBufferAttribute(p, ix[t + 2]);
        const n = b.clone().sub(a).cross(c.clone().sub(a));
        const m = a.clone().add(b).add(c).multiplyScalar(1 / 3);
        const out = V3(m.x, 0, m.z);
        if (out.lengthSq() < 1e-6) out.set(0, 1, 0);
        all++;
        if ((n.dot(out) > 0) !== inward) good++;
      }
      if (good < all / 2) {
        for (let t = 0; t < ix.length; t += 3) {
          const tmp = ix[t + 1];
          ix[t + 1] = ix[t + 2];
          ix[t + 2] = tmp;
        }
        g.index.needsUpdate = true;
        g.computeVertexNormals();
      }
    };
    fixWinding(outerGeo, false);
    fixWinding(innerGeo, true);
    bell.add(mesh(outerGeo, bronze));
    bell.add(mesh(innerGeo, bronzeIn));

    const wallPos = [];
    const wallIdx = [];
    const wallMap = new Map();
    const wv = (i, k, w) => {
      const key = i % NU + "," + k + w;
      if (wallMap.has(key)) return wallMap.get(key);
      const q = (w === "o" ? pOut : pIn)(P[i][k][0], P[i][k][1]);
      wallPos.push(q.x, q.y, q.z);
      wallMap.set(key, wallPos.length / 3 - 1);
      return wallPos.length / 3 - 1;
    };
    const vtx = id => V3(wallPos[id * 3], wallPos[id * 3 + 1], wallPos[id * 3 + 2]);
    const pushQuad = (A, B, C, D, dir) => {
      const n = vtx(B).sub(vtx(A)).cross(vtx(D).sub(vtx(A)));
      if (n.dot(dir) >= 0) wallIdx.push(A, B, D, B, C, D);
      else wallIdx.push(A, D, B, B, D, C);
    };
    const center = (i, k) => pOut((i + 0.5) / NU, Math.min(NV, k)).add(pOut((i + 0.5) / NU, Math.min(NV, k + 1))).multiplyScalar(0.5);
    for (let i = 0; i < NU; i++)
      for (let k = 0; k < NV; k++) {
        if (!keep[i][k]) continue;
        const nb = [
          [(i + NU - 1) % NU, k, i, k, i, k + 1],
          [(i + 1) % NU, k, i + 1, k, i + 1, k + 1],
          [i, k - 1, i, k, i + 1, k],
          [i, k + 1, i, k + 1, i + 1, k + 1]
        ];
        nb.forEach(([ni, nk, ai, ak, bi, bk]) => {
          if (nk < 0 || nk >= NV || keep[ni][nk]) return;
          const dir = center(ni, nk).sub(center(i, k));
          pushQuad(wv(ai, ak, "o"), wv(bi, bk, "o"), wv(bi, bk, "i"), wv(ai, ak, "i"), dir);
        });
      }
    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute("position", new THREE.Float32BufferAttribute(wallPos, 3));
    wallGeo.setIndex(wallIdx);
    wallGeo.computeVertexNormals();
    bell.add(mesh(wallGeo, bronzeEdge));

    const lipPts = [];
    for (let k = 0; k <= 64; k++) {
      const a = (k / 64) * TAU;
      const r = (prof[0].o.x + prof[0].i.x) / 2;
      lipPts.push(V3(Math.sin(a) * r, 0.0, Math.cos(a) * r));
    }
    const lip = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts, true), 128, (prof[0].o.x - prof[0].i.x) / 2 + 0.004, 10, true), darkBronze);
    bell.add(lip);

    const crown = new THREE.Group();
    crown.position.y = 1.3;
    bell.add(crown);
    crown.add(mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.1, 28), darkBronze));
    const loop = mesh(new THREE.TorusGeometry(0.15, 0.05, 12, 32, Math.PI), darkBronze);
    loop.position.y = 0.05;
    crown.add(loop);
    [-1, 1].forEach(s => {
      const l = mesh(new THREE.TorusGeometry(0.09, 0.035, 10, 24, Math.PI), darkBronze);
      l.rotation.y = Math.PI / 2;
      l.position.set(0.15 * s, 0.05, 0);
      crown.add(l);
    });
    const chain = new THREE.Group();
    chain.position.set(0.15, 0.13, 0);
    crown.add(chain);
    const chainCurve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.07, -0.05, 0.01), V3(0.15, -0.12, 0.03), V3(0.24, -0.2, 0.05), V3(0.31, -0.3, 0.06)]);
    const linkGeo = new THREE.TorusGeometry(0.045, 0.014, 8, 18);
    const links = [0, 1, 2, 3].map(k => {
      const ln = mesh(linkGeo, darkBronze);
      ln.scale.set(1, 1.55, 1);
      const len = chainCurve.getLength();
      const sa = Math.min(1, (0.04 + k * 0.1) / len);
      const c = chainCurve.getPointAt(sa);
      const d = chainCurve.getTangentAt(sa);
      ln.position.copy(c);
      ln.quaternion.setFromUnitVectors(V3(0, 1, 0), d);
      ln.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), k % 2 ? Math.PI / 2 : 0));
      chain.add(ln);
      return ln;
    });

    const ghost = new THREE.Group();
    ghost.position.y = 0.72;
    bell.add(ghost);
    const head = mesh(new THREE.SphereGeometry(0.4, 40, 28), ghostMat);
    head.scale.set(1, 1.05, 1);
    ghost.add(head);
    const hole0 = HOLES[0];
    const eyeDir = V3(Math.sin(hole0.th), 0, Math.cos(hole0.th));
    const eyes = [0].map(() => {
      const g = new THREE.Group();
      const ang = hole0.th;
      const ey = hole0.y - 0.72 + 0.02;
      const rr = Math.sqrt(Math.max(0, 0.4 * 0.4 - ey * ey * 0.9));
      g.position.set(Math.sin(ang) * rr * 0.99, ey, Math.cos(ang) * rr * 0.99);
      g.lookAt(g.position.clone().multiplyScalar(2));
      ghost.add(g);
      const ring = new THREE.Mesh(new THREE.SphereGeometry(0.06, 18, 12), socketMat);
      ring.scale.set(1.25, 1.65, 0.35);
      const pit = new THREE.Mesh(new THREE.SphereGeometry(0.06, 18, 12), hollowMat);
      pit.scale.set(0.95, 1.3, 0.4);
      pit.position.z = 0.008;
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), glowMat);
      glow.position.z = 0.022;
      g.add(ring, pit, glow);
      return { g, glow };
    });

    const dyn = m => {
      const o = new THREE.Mesh(new THREE.BufferGeometry(), m);
      o.castShadow = true;
      o.frustumCulled = false;
      bodyG.add(o);
      return o;
    };
    const flexTube = (m, pts, r0, r1) => {
      const c = new THREE.CatmullRomCurve3(pts);
      const n = 48;
      const rs = 10;
      const g = new THREE.TubeGeometry(c, n, 1, rs - 1, false);
      const p = g.attributes.position;
      for (let i = 0; i <= n; i++) {
        const cp = c.getPointAt(i / n);
        const r = lerp(r0, r1, Math.pow(i / n, 0.9));
        for (let j = 0; j < rs; j++) {
          const k = i * rs + j;
          p.setXYZ(k, cp.x + (p.getX(k) - cp.x) * r, cp.y + (p.getY(k) - cp.y) * r, cp.z + (p.getZ(k) - cp.z) * r);
        }
      }
      g.computeVertexNormals();
      m.geometry.dispose();
      m.geometry = g;
    };
    const SKN = 96;
    const SKV = 20;
    const skirtGeo = new THREE.BufferGeometry();
    const skPos = new Float32Array((SKN + 1) * (SKV + 1) * 3);
    const skUv = [];
    const skIdx = [];
    for (let k = 0; k <= SKV; k++) for (let i = 0; i <= SKN; i++) skUv.push(i / SKN, 1 - k / SKV);
    for (let k = 0; k < SKV; k++)
      for (let i = 0; i < SKN; i++) {
        const a = k * (SKN + 1) + i;
        skIdx.push(a, a + SKN + 1, a + 1, a + 1, a + SKN + 1, a + SKN + 2);
      }
    skirtGeo.setAttribute("position", new THREE.BufferAttribute(skPos, 3));
    skirtGeo.setAttribute("uv", new THREE.Float32BufferAttribute(skUv, 2));
    skirtGeo.setIndex(skIdx);
    const skirtMat = ghostWisp.clone();
    skirtMat.side = THREE.DoubleSide;
    skirtMat.depthWrite = false;
    skirtMat.opacity = 1;
    if (hasDoc) {
      const c = document.createElement("canvas");
      c.width = 4;
      c.height = 128;
      const g = c.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, "#ffffff");
      gr.addColorStop(0.65, "#e8e8e8");
      gr.addColorStop(1, "#8a8a8a");
      g.fillStyle = gr;
      g.fillRect(0, 0, 4, 128);
      skirtMat.alphaMap = new THREE.CanvasTexture(c);
    }
    skirtMat.emissiveIntensity = 0.5;
    const skirtBack = skirtMat.clone();
    skirtBack.side = THREE.BackSide;
    skirtMat.side = THREE.FrontSide;
    [skirtBack, skirtMat].forEach((m, k) => {
      const sk = new THREE.Mesh(skirtGeo, m);
      sk.frustumCulled = false;
      sk.renderOrder = 1 + k;
      bell.add(sk);
    });
    const shapeSkirt = (t, len) => {
      const L = 0.3 + len;
      for (let k = 0; k <= SKV; k++) {
        const v = k / SKV;
        const fl = v * v * (3 - 2 * v);
        for (let i = 0; i <= SKN; i++) {
          const a = (i / SKN) * TAU;
          const sc = 0.5 + 0.5 * Math.cos(a * 7 + t * 0.9 + Math.sin(a * 2 + t * 0.5) * 0.6);
          const r = 0.37 + 0.3 * fl + 0.03 * Math.sin(a * 4 - t * 1.8 + v * 2.5) * v * v;
          const y = 0.6 - L * v - len * 0.28 * sc * v * v - 0.04 * v * v * Math.sin(a * 3 + t * 1.4);
          const o = (k * (SKN + 1) + i) * 3;
          skPos[o] = Math.sin(a) * r;
          skPos[o + 1] = y;
          skPos[o + 2] = Math.cos(a) * r;
        }
      }
      skirtGeo.attributes.position.needsUpdate = true;
      skirtGeo.computeVertexNormals();
    };
    const clawGeo = (() => {
      const c = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0, 0.015, 0.07), V3(0, -0.005, 0.14), V3(0, -0.06, 0.2)]);
      const n = 20;
      const rs = 10;
      const g = new THREE.TubeGeometry(c, n, 1, rs - 1, false);
      const p = g.attributes.position;
      for (let i = 0; i <= n; i++) {
        const cp = c.getPointAt(i / n);
        const r = lerp(0.026, 0.002, Math.pow(i / n, 1.3));
        for (let j = 0; j < rs; j++) {
          const k = i * rs + j;
          p.setXYZ(k, cp.x + (p.getX(k) - cp.x) * r * 1.15, cp.y + (p.getY(k) - cp.y) * r * 0.8, cp.z + (p.getZ(k) - cp.z) * r);
        }
      }
      g.computeVertexNormals();
      return g;
    })();
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x3a3450, roughness: 0.35, metalness: 0.2, emissive: 0x1a1430, emissiveIntensity: 0.4 });
    const arms = [1, 2].map(hi => {
      const h = HOLES[hi];
      const sx = Math.sin(h.th) > 0 ? 1 : -1;
      const m = dyn(ghostMat);
      const hand = new THREE.Group();
      bodyG.add(hand);
      const palm = mesh(new THREE.SphereGeometry(0.085, 18, 14), ghostMat);
      palm.scale.set(1, 0.8, 1.1);
      hand.add(palm);
      const claws = [-1, 0, 1].map(c => {
        const pv = new THREE.Group();
        pv.position.set(c * 0.045, 0, 0.06);
        hand.add(pv);
        const fg = mesh(new THREE.SphereGeometry(0.036, 14, 10), ghostMat);
        fg.scale.set(0.9, 0.8, 1.5);
        fg.position.z = 0.03;
        pv.add(fg);
        const cl = mesh(clawGeo, clawMat);
        cl.position.z = 0.07;
        pv.add(cl);
        return { pv, c };
      });
      return { h, sx, m, hand, claws };
    });

    const swoosh = [0, 1, 2].map(i => {
      const mt = new THREE.MeshBasicMaterial({ color: 0xe8eeff, transparent: true, opacity: 0, depthWrite: false });
      const a = new THREE.Mesh(new THREE.TorusGeometry(0.72 + i * 0.09, 0.016, 6, 40, 1.5), mt);
      a.visible = false;
      bodyG.add(a);
      return { a, mt, i };
    });
    const rings = [0, 1, 2].map(() => {
      const mt = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0, depthWrite: false });
      const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 48), mt);
      r.rotation.x = Math.PI / 2;
      r.visible = false;
      root.add(r);
      return { r, mt };
    });
    const cracks = [0, 1, 2, 3, 4, 5].map(k => {
      const mt = new THREE.MeshBasicMaterial({ color: 0xfff0a8, transparent: true, opacity: 0, depthWrite: false });
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), mt);
      b.visible = false;
      root.add(b);
      return { b, mt, k };
    });

    const food = berry();
    food.visible = false;
    root.add(food);
    const tmp = V3(0, 0, 0);

    return {
      root,
      update(s) {
        const { t, pointer, blink, lookYaw, lookPitch, action, motion } = s;
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;

        let hover = Math.sin(t * 1.4) * 0.06 * motion;
        let swingZ = Math.sin(t * 1.1) * 0.04 * motion;
        let swingX = Math.sin(t * 0.8 + 1) * 0.03 * motion;
        let spinY = 0;
        let ringK = 0;
        let swat = 0;
        let reach = 0;
        let peek = 0;
        let squash = 1;
        let wispK = 1;
        let eatK = 0;
        let eatCatch = 0;
        let ghostRise = 0;
        const armUp = [0, 0];

        if (nm === "jump") {
          const c = smooth(0, 0.18, p) * (1 - smooth(0.18, 0.3, p));
          const air = Math.sin(Math.PI * smooth(0.2, 0.8, p));
          hover += -0.12 * c + 0.9 * air;
          squash = 1 - 0.08 * c + 0.05 * air;
          armUp[0] = armUp[1] = air;
          wispK = 1 + air * 0.45;
        } else if (nm === "ring") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.86, 1, p));
          ringK = k;
          swingZ = Math.sin(p * Math.PI * 7) * 0.35 * k;
          armUp[0] = armUp[1] = 0.4 * k;
        } else if (nm === "claw") {
          reach = smooth(0.05, 0.3, p) * (1 - smooth(0.78, 0.98, p));
          swat = smooth(0.38, 0.5, p) * (1 - smooth(0.56, 0.72, p));
          spinY = -0.35 * reach + 0.7 * swat;
          swingZ += 0.12 * swat;
        } else if (nm === "peek") {
          peek = smooth(0.05, 0.2, p) * (1 - smooth(0.8, 0.95, p));
          swingX = -0.18 * peek + Math.sin(t * 2) * 0.03;
        } else if (nm === "spin") {
          const k = smooth(0, 0.15, p) * (1 - smooth(0.85, 1, p));
          spinY = smooth(0.1, 0.9, p) * TAU;
          wispK = 1 + 0.3 * k;
          armUp[0] = armUp[1] = 0.6 * k;
          hover += 0.15 * k;
        } else if (nm === "eat") {
          eatK = smooth(0.32, 0.6, p) * (1 - smooth(0.8, 0.97, p));
          eatCatch = smooth(0.04, 0.26, p) * (1 - smooth(0.8, 0.97, p));
          const g = smooth(0.58, 0.66, p) * (1 - smooth(0.66, 0.8, p));
          squash = 1 - 0.07 * g;
          wispK = 1 + 0.25 * g;
        }

        root.rotation.y = lookYaw * 0.4;
        bodyG.position.y = hover;
        bodyG.rotation.y = spinY;
        bell.rotation.set(swingX + lookPitch * 0.15, 0, swingZ);
        bell.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
        ghost.position.y = 0.72 + ghostRise;
        ghost.rotation.set(lookPitch * 0.3, pointer.x * 0.25, 0);
        chain.rotation.set(Math.sin(t * 1.7) * 0.06, 0, -swingZ * 0.8 + Math.sin(t * 2.2) * 0.05);

        eyes.forEach(({ g, glow }) => {
          g.scale.y = lerp(1, 0.12, 1 - blink);
          glow.position.x = pointer.x * 0.02;
          glow.position.y = pointer.y * 0.02;
          glow.scale.setScalar(1 + 0.6 * peek + 0.4 * ringK);
        });

        root.updateMatrixWorld(true);
        shapeSkirt(t, 0.62 * wispK);

        arms.forEach((A, i) => {
          const h = A.h;
          const sx = A.sx;
          const qd = HOLES[0];
          const rr = prof[Math.round((h.y / 1.3) * NV)].i.x - 0.02;
          const base = bell.localToWorld(V3(sx * rr, h.y, 0));
          bodyG.worldToLocal(base);
          const out = bodyG.worldToLocal(bell.localToWorld(V3(sx * 1, h.y, 0))).sub(bodyG.worldToLocal(bell.localToWorld(V3(0, h.y, 0)))).normalize();
          const sway = Math.sin(t * 1.6 + i * 2) * 0.08 * motion;
          let target = base.clone().addScaledVector(out, 0.75).add(V3(0, -0.05 + 0.45 * armUp[i] + sway, 0.25));
          let mid = base.clone().addScaledVector(out, 0.45).add(V3(0, 0.25 + 0.2 * armUp[i], 0.05));
          if (i === 0 && (reach > 0 || swat > 0)) {
            const raised = base.clone().add(V3(sx * 0.35, 0.95, -0.15));
            const hit = base.clone().add(V3(sx * -0.1, 0.1, 1.15));
            target.lerp(raised, reach * (1 - swat));
            target.lerp(hit, swat);
            mid.lerp(base.clone().add(V3(sx * 0.45, 0.6, 0.1)), reach);
          }
          const low = mid.clone().lerp(target, 0.5);
          if (i === 0 && eatCatch > 0) {
            const catchP = V3(sx * 0.45, BY + 0.75, 1.0);
            const under = V3(sx * 0.12, BY - 0.12, 0.3);
            target.lerp(catchP, eatCatch);
            mid.lerp(base.clone().add(V3(sx * 0.45, 0.35, 0.35)), eatCatch);
            low.copy(mid.clone().lerp(target, 0.5)).lerp(V3(sx * 0.98, BY - 0.28, 0.55), eatK);
            target.lerp(under, eatK);
            mid.lerp(base.clone().addScaledVector(out, 0.45).add(V3(0, -0.15, 0.5)), eatK);
          }
          const pts = [base, base.clone().addScaledVector(out, 0.14), mid, low, target];
          flexTube(A.m, pts, 0.07, 0.06);
          A.hand.position.copy(target);
          const d = target.clone().sub(mid).normalize();
          const hx = V3(0, 1, 0).cross(d);
          if (hx.lengthSq() < 1e-4) hx.set(1, 0, 0);
          hx.normalize();
          const hy = d.clone().cross(hx);
          A.hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, d));
          const open = 0.35 + 0.5 * swat + 0.2 * Math.sin(t * 3 + i) * motion;
          A.claws.forEach(({ pv, c }) => {
            pv.rotation.set(-0.15 - 0.45 * (i === 0 ? eatCatch * smooth(0.26, 0.32, p) : 0) + 0.25 * swat, c * open * 0.45, 0);
          });
        });

        swoosh.forEach(({ a, mt, i }) => {
          a.visible = swat > 0.05;
          if (!a.visible) return;
          a.position.set(0.1, BY + 0.95, 0.5);
          a.rotation.set(0.45, -0.25, -0.7);
          mt.opacity = swat * (0.8 - i * 0.2);
        });
        rings.forEach(({ r, mt }, i) => {
          r.visible = ringK > 0.05;
          if (!r.visible) return;
          const q = (t * 1.4 + i / 3) % 1;
          r.position.set(0, BY + hover + 0.1, 0);
          r.scale.setScalar(0.8 + q * 1.4);
          mt.opacity = 0.55 * (1 - q) * ringK;
        });
        cracks.forEach(({ b, mt, k }) => {
          b.visible = ringK > 0.05;
          if (!b.visible) return;
          const q = (t * 2.2 + k / 6) % 1;
          const a = (k / 6) * TAU + 0.3;
          const r = 0.9 + q * 0.9;
          b.position.set(Math.cos(a) * r, BY + hover + 0.7 + Math.sin(a) * r * 0.6, 0.3);
          b.rotation.z = a + Math.PI / 2 + Math.sin(k * 7) * 0.4;
          mt.opacity = (1 - q) * 0.9 * ringK;
        });

        if (nm === "eat" && ph) {
          food.visible = p < 0.6;
          const A = arms[0];
          const grip = V3(0, -0.07, 0.17).applyQuaternion(A.hand.quaternion).add(A.hand.position);
          root.worldToLocal(bodyG.localToWorld(grip));
          const lifted = V3(0.9, 3.6, 1.0);
          food.position.copy(lifted.lerp(grip, ph.fall * ph.fall));
          food.scale.setScalar(0.75 * (1 - 0.5 * eatK));
        } else food.visible = false;
      }
    };
  }
});
