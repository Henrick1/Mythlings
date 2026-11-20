Pets.register({
  id: "escavatatu",
  dex: 42,
  name: "Escavatatu",
  color: "#9c6a2c",
  types: ["ground", "steel"],
  stage: 3,
  description: "Depois de anos rolando, o Tatubola se levanta nas patas de trás e não volta mais a ficar de quatro. O casco virou uma armadura de rosetas de osso presa por cintas de aço, e os braços ganharam garras enormes que se fecham numa ponta só e giram como uma broca, atravessando rocha. A pá do rabo serve de apoio quando ele finca os pés para cavar.",
  actions: {
    jump: { duration: 1.5 },
    eat: { duration: 2.4 },
    drill: { duration: 2.8 },
    slash: { duration: 1.3 },
    sweep: { duration: 1.9 },
    hide: { duration: 3.0 },
    sniff: { duration: 2.0 }
  },
  battle: { attack: { action: "slash", hit: 0.5, speed: 1.0 }, special: { action: "drill", hit: 0.6, speed: 1.0 } },
  idle: [
    { action: "sniff", min: 12, max: 30 },
    { action: "drill", min: 30, max: 70 },
    { action: "hide", min: 40, max: 80 },
    { action: "sweep", min: 40, max: 90 }
  ],
  clickAction: n => ["hide", "drill", "slash", "sniff", "sweep", "jump"][(n - 1) % 6],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const TAU = Math.PI * 2;

    const root = new THREE.Group();
    const big = new THREE.Group();
    big.scale.setScalar(1.2);
    root.add(big);
    const bodyG = new THREE.Group();
    big.add(bodyG);
    const HIP = 0.84;
    const upper = new THREE.Group();
    upper.position.y = HIP;
    bodyG.add(upper);

    const BANDS = [-0.12, 0.0, 0.12, 0.24];
    const hasDoc = typeof document !== "undefined";

    const rosette = (g, cx, cy, r) => {
      const gr = g.createRadialGradient(cx - r * 0.2, cy - r * 0.25, 1, cx, cy, r * 0.5);
      gr.addColorStop(0, "#f1cc88");
      gr.addColorStop(1, "#c08945");
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        i ? g.lineTo(cx + Math.cos(a) * r * 0.46, cy + Math.sin(a) * r * 0.46) : g.moveTo(cx + Math.cos(a) * r * 0.46, cy + Math.sin(a) * r * 0.46);
      }
      g.closePath();
      g.fillStyle = gr;
      g.fill();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * TAU;
        const px = cx + Math.cos(a) * r * 0.74;
        const py = cy + Math.sin(a) * r * 0.74;
        g.beginPath();
        g.ellipse(px, py, r * 0.21, r * 0.15, a, 0, TAU);
        g.fillStyle = k % 2 ? "#c99350" : "#b8823f";
        g.fill();
      }
    };

    const shellTex = (() => {
      if (!hasDoc) return null;
      const W = 1024;
      const H = 512;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = "#5c3d1c";
      g.fillRect(0, 0, W, H);
      const ux = u => ((u + 1) / 2) * W;
      const shield = (x0, x1) => {
        g.save();
        g.beginPath();
        g.rect(x0, 0, x1 - x0, H);
        g.clip();
        const r = 50;
        for (let row = -1; row * r * 1.5 < H + r; row++)
          for (let col = -1; col * r * 1.732 < W + r; col++) rosette(g, col * r * 1.732 + (row % 2 ? r * 0.866 : 0), row * r * 1.5, r);
        g.restore();
      };
      shield(0, ux(BANDS[0]));
      shield(ux(BANDS[3]), W);
      for (let b = 0; b < 3; b++) {
        const x0 = ux(BANDS[b]);
        const x1 = ux(BANDS[b + 1]);
        const gr = g.createLinearGradient(x0, 0, x1, 0);
        gr.addColorStop(0, "#4c535c");
        gr.addColorStop(0.5, "#98a2ad");
        gr.addColorStop(1, "#c0c8d0");
        g.fillStyle = gr;
        g.fillRect(x0, 0, x1 - x0, H);
        if (b === 1) {
          g.save();
          g.beginPath();
          g.rect(x0 + 9, 0, x1 - x0 - 18, H);
          g.clip();
          g.fillStyle = "#f2b705";
          g.fillRect(x0, 0, x1 - x0, H);
          g.fillStyle = "#1d1d1f";
          for (let y = -60; y < H + 60; y += 40) {
            g.beginPath();
            g.moveTo(x0, y);
            g.lineTo(x0, y + 20);
            g.lineTo(x1, y + 64);
            g.lineTo(x1, y + 44);
            g.closePath();
            g.fill();
          }
          g.restore();
        } else {
          for (let y = 0; y < H; y += 32) {
            g.fillStyle = "#3d434a";
            g.fillRect(x0, y, x1 - x0, 3);
          }
        }
        for (let y = 16; y < H; y += 32)
          [x0 + 5, x1 - 6].forEach(x => {
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
      const side = g.createLinearGradient(0, 0, 0, H);
      side.addColorStop(0, "rgba(30,18,6,0.5)");
      side.addColorStop(0.07, "rgba(30,18,6,0)");
      side.addColorStop(0.93, "rgba(30,18,6,0)");
      side.addColorStop(1, "rgba(30,18,6,0.5)");
      g.fillStyle = side;
      g.fillRect(0, 0, W, H);
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
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
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const hex = (cx, cy, rr) => {
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + Math.PI / 6;
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
      };
      for (let row = -1; row <= rows; row++)
        for (let col = -1; col <= cols; col++) {
          const cx = col * r * Math.sqrt(3) + (row % 2 ? (r * Math.sqrt(3)) / 2 : 0);
          const cy = row * r * 1.5;
          const v = rnd();
          g.lineJoin = "round";
          hex(cx, cy, r * 0.86);
          const gr = g.createRadialGradient(cx - r * 0.18, cy - r * 0.22, r * 0.05, cx, cy, r * 0.9);
          gr.addColorStop(0, v > 0.5 ? "#f0cf8c" : "#e9c27e");
          gr.addColorStop(0.55, v > 0.5 ? "#c9954f" : "#c08945");
          gr.addColorStop(1, "#8a5a28");
          g.fillStyle = gr;
          g.fill();
          g.lineWidth = r * 0.07;
          g.strokeStyle = "rgba(255,236,190,0.35)";
          hex(cx, cy, r * 0.62);
          g.stroke();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * TAU + Math.PI / 6 + 0.5;
            g.beginPath();
            g.arc(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72, r * 0.035, 0, TAU);
            g.fillStyle = "rgba(60,36,16,0.6)";
            g.fill();
          }
        }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      return t;
    })();

    const shellMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: shellTex, roughness: 0.55, metalness: 0.18 });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: plateTex, roughness: 0.55, metalness: 0.1 });
    const plateMat2 = plateMat.clone();
    plateMat2.side = THREE.DoubleSide;
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x3a2814, roughness: 0.9, side: THREE.BackSide });
    const skinMat = mat(0xae7652, 0.72);
    const bellyTex = (() => {
      if (!hasDoc) return null;
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "#e6b58e";
      g.fillRect(0, 0, 64, 256);
      for (let y = 40; y < 230; y += 26) {
        const gr = g.createLinearGradient(0, y - 5, 0, y + 5);
        gr.addColorStop(0, "rgba(160,100,70,0)");
        gr.addColorStop(0.5, "rgba(160,100,70,0.45)");
        gr.addColorStop(1, "rgba(160,100,70,0)");
        g.fillStyle = gr;
        g.fillRect(0, y - 5, 64, 10);
      }
      return new THREE.CanvasTexture(c);
    })();
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: bellyTex, roughness: 0.8 });
    const noseMat = mat(0x8e5048, 0.5);
    const keratin = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.35, metalness: 0.15 });
    const clawTip = new THREE.MeshStandardMaterial({ color: 0xc9d1d9, roughness: 0.3, metalness: 0.45 });
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
      const y0 = R * Math.cos(1.3);
      const S = 40;
      for (let i = 0; i <= S; i++) {
        const th = 1.3 * (1 - i / S);
        const y = R * Math.cos(th);
        const q = ((1.3 - th) / 1.3) * n;
        const fr = q - Math.floor(q);
        const lip = i < S ? 1 + 0.06 * Math.pow(1 - fr, 2) * (1 - (i / S) * 0.5) : 1;
        pts.push(V2(Math.max(0.0001, R * Math.sin(th) * lip * 1.0), y));
      }
      pts[0].x *= 1.0;
      const g = new THREE.LatheGeometry(pts, 40);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) / R) * k + 0.5, (p.getZ(i) / R) * k + 0.5);
      return g;
    };
    const TC = V3(0, 1.32 - HIP, -0.04);
    const TR = V3(0.66, 0.74, 0.56);
    const LT = Math.PI / 2 - 0.015;
    const LB = 0.95;
    const azOf = u => (u < 0 ? lerp(2.15, 1.25, smooth(-0.6, -0.22, u)) : lerp(1.25, Math.PI - 0.32, smooth(0.32, 0.56, u)));

    const torsoGeo = new THREE.SphereGeometry(1, 56, 40);
    const torso = mesh(torsoGeo, skinMat);
    torso.scale.copy(TR);
    torso.position.copy(TC);
    upper.add(torso);
    const bellyGeo = new THREE.SphereGeometry(1, 48, 48);
    {
      const bp = bellyGeo.attributes.position;
      for (let i = 0; i < bp.count; i++) {
        const y = bp.getY(i);
        const ph = Math.asin(Math.max(-1, Math.min(1, y)));
        const z = bp.getZ(i);
        const k = 1 + 0.045 * Math.pow(Math.max(0, Math.sin(ph * 7 + 0.4)), 0.6) * Math.max(0, z);
        bp.setXYZ(i, bp.getX(i) * k, y, z * k);
      }
      bellyGeo.computeVertexNormals();
    }
    const belly = mesh(bellyGeo, bellyMat);
    belly.scale.set(0.45, 0.7, 0.32);
    belly.position.set(0, 1.3 - HIP, 0.24);
    upper.add(belly);

    const NU = 80;
    const NV = 60;
    const sPos = new Float32Array((NU + 1) * (NV + 1) * 3);
    const sUv = new Float32Array((NU + 1) * (NV + 1) * 2);
    const sIdx = [];
    const ridge = u => {
      let r = 0;
      BANDS.forEach((b, i) => {
        const d = u - b;
        if (i > 0) r += 0.035 * Math.exp(-((d + 0.012) * (d + 0.012)) / 0.00025) - 0.015 * Math.exp(-((d - 0.018) * (d - 0.018)) / 0.0003);
        else r -= 0.018 * Math.exp(-(d * d) / 0.0003);
      });
      return r;
    };
    for (let i = 0; i <= NU; i++) {
      const u = (i / NU) * 2 - 1;
      const la = u * (u < 0 ? LB : LT);
      const AZ = azOf(u);
      for (let j = 0; j <= NV; j++) {
        const v = (j / NV) * 2 - 1;
        const az = v * AZ;
        const e = Math.min((1 - Math.abs(v)) * AZ * 1.1, 1 - u, (1 + u) * 1.4);
        const rk = (1.03 + (0.06 + 0.3 * smooth(-0.35, 0.85, Math.cos(az))) * smooth(0, 0.45, e)) * (1 + ridge(u) * smooth(0, 0.1, e));
        const k = i * (NV + 1) + j;
        sPos[k * 3] = TR.x * rk * Math.cos(la) * Math.sin(az);
        sPos[k * 3 + 1] = TC.y + TR.y * rk * Math.sin(la);
        sPos[k * 3 + 2] = TC.z - TR.z * rk * Math.cos(la) * Math.cos(az);
        sUv[k * 2] = i / NU;
        sUv[k * 2 + 1] = j / NV;
        if (i < NU && j < NV) sIdx.push(k, k + NV + 1, k + 1, k + NV + 1, k + NV + 2, k + 1);
      }
    }
    const shellGeo = new THREE.BufferGeometry();
    shellGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    shellGeo.setAttribute("uv", new THREE.BufferAttribute(sUv, 2));
    shellGeo.setIndex(sIdx);
    shellGeo.computeVertexNormals();
    const sN = shellGeo.attributes.normal;
    const at = (i, j, off = 0) => {
      const k = i * (NV + 1) + j;
      return V3(sPos[k * 3] + sN.getX(k) * off, sPos[k * 3 + 1] + sN.getY(k) * off, sPos[k * 3 + 2] + sN.getZ(k) * off);
    };
    const nAt = (i, j) => {
      const k = i * (NV + 1) + j;
      return V3(sN.getX(k), sN.getY(k), sN.getZ(k)).normalize();
    };
    upper.add(mesh(shellGeo, shellMat));
    const shellIn = new THREE.Mesh(shellGeo, innerMat);
    shellIn.scale.setScalar(0.985);
    shellIn.position.copy(TC).multiplyScalar(0.015);
    upper.add(shellIn);

    const tube = (pts, r, m, closed) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, !!closed), Math.max(24, pts.length * 2), r, 10, !!closed), m);
    const colPts = j => {
      const p = [];
      for (let i = 0; i <= NU; i += 2) p.push(at(i, j));
      return p;
    };
    const rowPts = i => {
      const p = [];
      for (let j = 0; j <= NV; j += 2) p.push(at(i, j));
      return p;
    };
    upper.add(tube(colPts(0), 0.045, rimMat));
    upper.add(tube(colPts(NV), 0.045, rimMat));
    upper.add(tube(rowPts(0), 0.045, rimMat));
    [0, NV].forEach(j => {
      const c = mesh(new THREE.SphereGeometry(0.045, 12, 10), rimMat, false);
      c.position.copy(at(0, j));
      upper.add(c);
    });
    const crown = mesh(new THREE.SphereGeometry(0.05, 14, 10), rimMat, false);
    crown.position.copy(at(NU, NV / 2));
    upper.add(crown);
    BANDS.forEach(b => {
      const i = Math.round(((b + 1) / 2) * NU);
      const p = [];
      for (let j = 0; j <= NV; j += 2) p.push(at(i, j, 0.01));
      upper.add(tube(p, 0.028, ribMat));
      [p[0], p[p.length - 1]].forEach(q => {
        const c = mesh(new THREE.SphereGeometry(0.028, 12, 10), ribMat, false);
        c.position.copy(q);
        upper.add(c);
      });
    });

    const UPV = V3(0, 1, 0);
    const knobGeo = new THREE.LatheGeometry([V2(0.075, -0.03), V2(0.078, 0.01), V2(0.068, 0.042), V2(0.048, 0.068), V2(0.022, 0.085), V2(0.0001, 0.09)], 18);
    const spikeGeo = new THREE.LatheGeometry([V2(0.045, -0.02), V2(0.045, 0.01), V2(0.032, 0.045), V2(0.011, 0.08), V2(0.0001, 0.09)], 12);
    for (let i = 5; i <= NU - 4; i += 6) {
      const u = (i / NU) * 2 - 1;
      if (u > BANDS[0] - 0.05 && u < BANDS[3] + 0.05) continue;
      if (u > 0.8) continue;
      [NV / 2 - 9, NV / 2, NV / 2 + 9].forEach((j, n) => {
        const m = mesh(knobGeo, knobMat, n === 1);
        if (n !== 1) m.scale.setScalar(0.72);
        m.position.copy(at(i, j));
        m.quaternion.setFromUnitVectors(UPV, nAt(i, j));
        upper.add(m);
      });
    }
    for (let j = 4; j <= NV - 4; j += 5) {
      if (Math.cos(((j / NV) * 2 - 1) * azOf(-1)) < 0.05) continue;
      const m = mesh(spikeGeo, knobMat, false);
      m.position.copy(at(2, j));
      m.quaternion.setFromUnitVectors(UPV, nAt(2, j).add(V3(0, -0.8, 0)).normalize());
      upper.add(m);
    }

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 2.06 - HIP, 0.36);
    upper.add(headPivot);
    const head = new THREE.Group();
    head.scale.setScalar(1.15);
    headPivot.add(head);
    const skull = mesh(new THREE.SphereGeometry(0.36, 40, 28), skinMat);
    skull.scale.set(1.05, 0.9, 1.02);
    head.add(skull);
    const snoutGeo = new THREE.LatheGeometry([V2(0.24, -0.05), V2(0.22, 0.06), V2(0.17, 0.22), V2(0.125, 0.36), V2(0.09, 0.45), V2(0.0001, 0.465)], 36);
    snoutGeo.rotateX(Math.PI / 2);
    const snout = mesh(snoutGeo, skinMat);
    snout.scale.set(1, 0.78, 1);
    snout.position.set(0, -0.1, 0.18);
    snout.rotation.x = 0.22;
    head.add(snout);
    const nose = mesh(new THREE.SphereGeometry(0.085, 20, 14), noseMat, false);
    nose.scale.set(1.25, 0.85, 0.6);
    nose.position.set(0, 0, 0.455);
    snout.add(nose);
    [-1, 1].forEach(s => {
      const n = mesh(new THREE.SphereGeometry(0.02, 10, 8), darkMat, false);
      n.position.set(0.034 * s, 0, 0.045);
      nose.add(n);
    });
    const HC = 1.08;
    const HT = -0.2;
    const helmetGeo = new THREE.SphereGeometry(0.36, 56, 24, 0, TAU, 0, HC);
    helmetGeo.rotateX(HT);
    capUv(helmetGeo, 0.36, 0.62);
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
    head.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hEdge, true), 128, 0.022, 8, true), rimMat));
    const snoutProfile = [V2(0.24, -0.05), V2(0.22, 0.06), V2(0.17, 0.22), V2(0.125, 0.36), V2(0.09, 0.45), V2(0.0001, 0.465)];
    const plateProf = [];
    for (let k = 0; k <= 12; k++) {
      const y = 0.04 + k * 0.026;
      let x = 0;
      for (let q = 0; q < snoutProfile.length - 1; q++) {
        const A = snoutProfile[q];
        const B = snoutProfile[q + 1];
        if (y >= A.y && y <= B.y) x = lerp(A.x, B.x, (y - A.y) / (B.y - A.y));
      }
      plateProf.push(V2(x * 1.045, y));
    }
    const snoutPlateGeo = new THREE.LatheGeometry(plateProf, 32, Math.PI - 0.95, 1.9);
    snoutPlateGeo.rotateX(Math.PI / 2);
    {
      const pp = snoutPlateGeo.attributes.position;
      const uv = snoutPlateGeo.attributes.uv;
      for (let i = 0; i < pp.count; i++) uv.setXY(i, pp.getX(i) * 2.6, pp.getZ(i) * 2.6);
    }
    const snoutPlate = mesh(snoutPlateGeo, plateMat2);
    snout.add(snoutPlate);
    const ears = [-1, 1].map(s => {
      const eg = new THREE.Group();
      eg.position.set(0.3 * s, 0.07, -0.17);
      eg.rotation.set(-0.35, 0.5 * s, -0.55 * s);
      head.add(eg);
      const outer = mesh(new THREE.SphereGeometry(0.1, 20, 14), skinMat);
      outer.scale.set(0.95, 1.65, 0.38);
      outer.position.y = 0.12;
      eg.add(outer);
      const inner = mesh(new THREE.SphereGeometry(0.07, 18, 12), noseMat, false);
      inner.scale.set(0.95, 1.6, 0.25);
      inner.position.set(0, 0.13, 0.024);
      eg.add(inner);
      return eg;
    });
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.44, whiteColor: 0xfffaf2, pupilColor: 0x1e1612 });
      e.g.position.set(0.17 * s, 0.03, 0.27);
      e.g.rotation.y = 0.42 * s;
      head.add(e.g);
      return e;
    });
    const lids = [-1, 1].map(s => {
      const l = mesh(new THREE.SphereGeometry(0.112, 20, 10, 0, TAU, 0, Math.PI * 0.5), skinMat, false);
      l.scale.set(1, 1.08, 0.62);
      l.position.set(0.17 * s, 0.03, 0.267);
      l.rotation.set(-0.8, 0.42 * s, 0);
      head.add(l);
      return l;
    });
    const mouth = mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 14, Math.PI), darkMat, false);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.255, 0.27);
    head.add(mouth);

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
    const SEG_R = 0.13;
    const SEG_L = 0.46;
    const SEG_TW = Math.PI * 1.6;
    const segMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.35 });
    const cHorn = new THREE.Color(0x5a3a1c);
    const cSteel = new THREE.Color(0xd2d9e0);
    const cDark = new THREE.Color(0x3a2412);
    const segGeo = (fr, ff, lr) => {
      const NT = 28;
      const NP = 14;
      const NS = 4;
      const vt = [];
      const col = [];
      const idx = [];
      const add = (t, jf, sr, c) => {
        vt.push(t, jf, sr);
        col.push(c.r, c.g, c.b);
        return vt.length / 3 - 1;
      };
      const tmp = new THREE.Color();
      const outer = [];
      for (let i = 0; i <= NT; i++) {
        const t = i / NT;
        const row = [];
        for (let j = 0; j <= NP; j++) {
          const jf = j / NP;
          const st = Math.max(Math.exp(-((jf - 0.5) * (jf - 0.5)) / 0.0025) * smooth(0.02, 0.12, t), smooth(0.78, 0.9, t));
          tmp.copy(cHorn).lerp(cSteel, st);
          row.push(add(t, jf, 1, tmp));
        }
        outer.push(row);
      }
      for (let i = 0; i < NT; i++)
        for (let j = 0; j < NP; j++) idx.push([outer[i][j], outer[i + 1][j], outer[i][j + 1]], [outer[i][j + 1], outer[i + 1][j], outer[i + 1][j + 1]]);
      [0, NP].forEach(j => {
        const wall = [];
        for (let i = 0; i <= NT; i++) {
          const row = [];
          for (let k = 0; k <= NS; k++) row.push(add(i / NT, j / NP, k / NS, cDark));
          wall.push(row);
        }
        for (let i = 0; i < NT; i++)
          for (let k = 0; k < NS; k++) idx.push([wall[i][k], wall[i + 1][k], wall[i][k + 1]], [wall[i][k + 1], wall[i + 1][k], wall[i + 1][k + 1]]);
      });
      const cc = add(0, 0.5, 0, cDark);
      const cap = [];
      for (let j = 0; j <= NP; j++) cap.push(add(0, j / NP, 1, cDark));
      for (let j = 0; j < NP; j++) idx.push([cc, cap[j], cap[j + 1]]);
      const n = vt.length / 3;
      const pos = new Float32Array(n * 3);
      const place = (t, jf, sr, k, out, o) => {
        const fc = lerp(fr, ff, smooth(0, 0.7, k));
        const W = lerp(0.95, (Math.PI * 2) / 3, k);
        const tw = t * SEG_TW * smooth(0.35, 1, k);
        const f = fc - W / 2 + W * jf + tw;
        const groove = 1 - lerp(0.0, 0.12, k) * Math.exp(-((jf - 0.5) * (jf - 0.5)) / 0.004);
        const rr = t >= 1 ? 0 : sr * SEG_R * Math.pow(1 - t, lerp(0.72, 0.85, k)) * (lerp(0.75, 0.8, k) + lerp(0.25, 0.2, k) * Math.sin(Math.PI * jf)) * groove;
        const fcT = fc + tw;
        const push = (1 - k) * (0.16 * t + 0.3 * t * t) * SEG_L;
        const len = SEG_L * lerp(lr, 1, k);
        out[o] = rr * Math.sin(f) + push * Math.sin(fcT);
        out[o + 1] = -len * t;
        out[o + 2] = rr * Math.cos(f) + push * Math.cos(fcT);
      };
      const fill = k => {
        for (let i = 0; i < n; i++) place(vt[i * 3], vt[i * 3 + 1], vt[i * 3 + 2], k, pos, i * 3);
      };
      fill(1);
      const P = (i, v) => v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      const a = V3(0, 0, 0);
      const b = V3(0, 0, 0);
      const c = V3(0, 0, 0);
      const ref = [0, 0, 0];
      const flat = [];
      idx.forEach(tri => {
        P(tri[0], a);
        P(tri[1], b);
        P(tri[2], c);
        const nn = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
        const m = a.clone().add(b).add(c).multiplyScalar(1 / 3);
        const t = Math.min(0.98, Math.max(0.06, -m.y / SEG_L));
        place(t, 0.5, 0.45, 1, ref, 0);
        const rv = V3(ref[0], ref[1], ref[2]);
        place(Math.min(0.98, t + 0.01), 0.5, 0.45, 1, ref, 0);
        if (nn.dot(m.sub(rv)) < 0) flat.push(tri[0], tri[2], tri[1]);
        else flat.push(tri[0], tri[1], tri[2]);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(flat);
      let last = -1;
      g.userData.morph = k => {
        if (Math.abs(k - last) < 0.002) return;
        last = k;
        fill(k);
        g.attributes.position.needsUpdate = true;
        g.computeVertexNormals();
        g.computeBoundingSphere();
      };
      g.userData.morph(0);
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

    const arms = [-1, 1].map(sx => {
      const sh = new THREE.Group();
      sh.position.set(0.64 * sx, 1.72 - HIP, 0.08);
      upper.add(sh);
      const ball = mesh(new THREE.SphereGeometry(0.21, 24, 16), skinMat);
      sh.add(ball);
      const pg = new THREE.Group();
      pg.position.copy(sh.position);
      upper.add(pg);
      const pauld = mesh(lameDome(0.3, 3, 0.55), plateMat2);
      pauld.scale.set(1, 0.95, 1.05);
      pauld.position.set(0.02 * sx, 0.0, 0);
      pauld.rotation.z = -0.5 * sx;
      pg.add(pauld);
      const pRim = mesh(new THREE.TorusGeometry(0.3 * Math.sin(1.3) * 1.06, 0.026, 8, 40), rimMat, false);
      pRim.rotation.x = Math.PI / 2;
      pRim.position.y = 0.3 * Math.cos(1.3);
      pauld.add(pRim);
      const upperArm = mesh(new THREE.LatheGeometry([V2(0.0001, -0.5), V2(0.12, -0.49), V2(0.145, -0.42), V2(0.16, -0.25), V2(0.18, -0.1), V2(0.17, 0.02), V2(0.0001, 0.08)], 24), skinMat);
      sh.add(upperArm);
      const el = new THREE.Group();
      el.position.y = -0.46;
      sh.add(el);
      el.add(mesh(new THREE.SphereGeometry(0.145, 20, 14), skinMat));
      const fore = mesh(new THREE.LatheGeometry([V2(0.0001, -0.5), V2(0.15, -0.49), V2(0.19, -0.42), V2(0.2, -0.28), V2(0.175, -0.1), V2(0.14, 0.02), V2(0.0001, 0.06)], 26), skinMat);
      el.add(fore);
      el.add(mesh(ringBand(0.212, -0.44, -0.12, 4), rimMat));
      const wrist = new THREE.Group();
      wrist.position.y = -0.5;
      el.add(wrist);
      const hand = new THREE.Group();
      wrist.add(hand);
      const palm = mesh(new THREE.SphereGeometry(0.17, 22, 16), skinMat);
      palm.scale.set(1, 0.75, 0.9);
      palm.position.y = -0.05;
      hand.add(palm);
      const claws = [
        [0.55, (Math.PI * 2) / 3, 0.84],
        [0, 0, 1],
        [-0.55, -(Math.PI * 2) / 3, 0.84]
      ].map(([fr, ff, lr]) => {
        const cg = mesh(segGeo(fr, ff, lr), segMat, false);
        cg.castShadow = true;
        cg.position.y = -0.08;
        hand.add(cg);
        return { cg };
      });
      return { sh, el, wrist, hand, claws, sx, palm, pg };
    });

    const legs = [-1, 1].map(sx => {
      const hip = new THREE.Group();
      hip.position.set(0.33 * sx, HIP, 0.02);
      bodyG.add(hip);
      hip.add(mesh(new THREE.SphereGeometry(0.25, 24, 16), skinMat));
      hip.add(mesh(new THREE.LatheGeometry([V2(0.0001, -0.38), V2(0.17, -0.37), V2(0.2, -0.3), V2(0.24, -0.16), V2(0.25, -0.04), V2(0.0001, 0.05)], 26), skinMat));
      const knee = new THREE.Group();
      knee.position.y = -0.36;
      hip.add(knee);
      knee.add(mesh(new THREE.SphereGeometry(0.175, 20, 14), skinMat));
      const kcap = mesh(lameDome(0.19, 2, 0.4), plateMat2);
      const kRim = mesh(new THREE.TorusGeometry(0.19 * Math.sin(1.3) * 1.06, 0.018, 8, 32), rimMat, false);
      kRim.rotation.x = Math.PI / 2;
      kRim.position.y = 0.19 * Math.cos(1.3);
      kcap.add(kRim);
      kcap.rotation.x = Math.PI / 2 - 0.15;
      kcap.position.set(0, 0.02, 0.02);
      knee.add(kcap);
      knee.add(mesh(new THREE.LatheGeometry([V2(0.0001, -0.37), V2(0.15, -0.36), V2(0.16, -0.25), V2(0.165, -0.1), V2(0.17, 0.0), V2(0.0001, 0.05)], 24), skinMat));
      knee.add(mesh(ringBand(0.178, -0.3, -0.08, 3), rimMat));
      const ankle = new THREE.Group();
      ankle.position.y = -0.36;
      knee.add(ankle);
      ankle.add(mesh(new THREE.SphereGeometry(0.15, 18, 12), skinMat));
      const foot = mesh(new THREE.SphereGeometry(0.2, 26, 16), skinMat);
      foot.scale.set(1.05, 0.55, 1.4);
      foot.position.set(0, -0.11, 0.08);
      ankle.add(foot);
      [-1, 0, 1].forEach(c => {
        const t = mesh(clawGeo(0.13, 0.04, 0.0), keratin, false);
        t.rotation.x = -Math.PI / 2 - 0.35;
        t.position.set(c * 0.1, -0.12, 0.33 - Math.abs(c) * 0.04);
        ankle.add(t);
      });
      return { hip, knee, ankle, sx };
    });
    const L1 = 0.36;
    const L2 = 0.36;
    const FH = 0.12;

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.7 - HIP, -0.3);
    upper.add(tailPivot);
    const NS = 64;
    const NC = 30;
    const tailGeo = new THREE.BufferGeometry();
    const tPos = new Float32Array(((NS + 1) * (NC + 1) + 1) * 3);
    const tUv = new Float32Array(((NS + 1) * (NC + 1) + 1) * 2);
    const tIdx = [];
    for (let i = 0; i <= NS; i++)
      for (let j = 0; j <= NC; j++) {
        const k = i * (NC + 1) + j;
        tUv[k * 2] = (j / NC) * 1.3;
        tUv[k * 2 + 1] = (i / NS) * 1.8;
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
    const tailRoot = mesh(new THREE.SphereGeometry(0.22, 26, 18), plateMat);
    tailRoot.scale.set(1, 0.95, 1.2);
    tailRoot.position.z = 0.06;
    tailPivot.add(tailRoot);
    const tipFrame = new THREE.Group();
    tailPivot.add(tipFrame);
    [-2, -1, 0, 1, 2].forEach(k => {
      const tooth = mesh(new THREE.ConeGeometry(0.04, 0.13, 10), keratin, false);
      tooth.rotation.x = -Math.PI / 2;
      tooth.scale.set(1, 1, 0.6);
      tooth.position.set(k * 0.08, -0.016, -0.035);
      tipFrame.add(tooth);
    });
    const TL = 1.2;
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
        const ring = 0.028 * Math.pow(Math.max(0, Math.sin(s * Math.PI * 9)), 2) * (1 - m) * smooth(0.04, 0.12, s);
        const r = lerp(0.2, 0.095, Math.pow(Math.min(1, s / SPLIT), 0.75)) + ring;
        const end = smooth(0.9, 1, s);
        const w = lerp(r, 0.34, m) * (1 - 0.15 * end);
        const h = lerp(r, 0.115, m) * (1 - 0.35 * end);
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
    for (let k = 0; k < 20; k++) {
      const m = mesh(new THREE.DodecahedronGeometry(0.045 + (k % 4) * 0.02), k % 3 ? dirtMat : rockMat, false);
      m.visible = false;
      big.add(m);
      debris.push({ m, k, a: (k / 20) * 2 - 1, sp: 0.7 + (k % 5) * 0.15 });
    }
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xd6c4a2, transparent: true, opacity: 0.4, depthWrite: false });
    const dust = [];
    for (let k = 0; k < 12; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), dustMat);
      m.visible = false;
      big.add(m);
      dust.push({ m, a: (k / 12) * TAU });
    }
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff0b8, transparent: true, opacity: 0.95, depthWrite: false });
    const sparks = [];
    for (let k = 0; k < 12; k++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), sparkMat);
      m.visible = false;
      big.add(m);
      sparks.push({ m, k });
    }

    const food = berry();
    food.visible = false;
    big.add(food);
    const tmpV = new THREE.Vector3();

    const pose = (a, s) => {
      a.sh.rotation.set(s.sx || 0, 0, s.sz || 0);
      a.el.rotation.set(s.ex || 0, 0, s.ez || 0);
      a.wrist.rotation.set(s.wx || 0, 0, 0);
    };
    const mix = (a, b, k) => {
      const o = {};
      Object.keys(a).concat(Object.keys(b)).forEach(n => (o[n] = lerp(a[n] || 0, b[n] || 0, k)));
      return o;
    };

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;

        const breath = Math.sin(t * 1.4) * motion;
        let drop = 0.02 + breath * 0.008;
        let lean = 0.16;
        let twist = 0;
        let sideLean = 0;
        let headPitch = 0.05;
        let headYaw = 0;
        let headDuck = 0;
        let earK = 0;
        let impact = 0;
        let spin = 0;
        let converge = 0;
        let shut = 0;
        let liftL = 0;
        let liftR = 0;
        let baseA = -0.5 + Math.sin(t * 0.9) * 0.03 * motion;
        let bendA = 0.32 + Math.sin(t * 1.2 + 1) * 0.04 * motion;
        let hookA = -1.5 + Math.sin(t * 1.5 + 2) * 0.06 * motion;
        let tailYaw = Math.sin(t * 0.8) * 0.12 * motion;
        let throwK = -1;
        let digK = 0;
        const rest = { sx: 0.1 + breath * 0.02, sz: 0.3, ex: -0.45, wx: -0.15 };
        let poseL = Object.assign({}, rest);
        let poseR = Object.assign({}, rest);

        if (nm === "jump") {
          const up = smooth(0.05, 0.35, p) * (1 - smooth(0.5, 0.6, p));
          const fall = smooth(0.5, 0.6, p) * (1 - smooth(0.8, 0.98, p));
          const raise = { sx: -2.5, sz: 0.45, ex: -0.5, wx: 0 };
          const slam = { sx: -0.5, sz: 0.25, ex: -0.3, wx: -0.2 };
          poseL = mix(mix(rest, raise, up), slam, fall);
          poseR = mix(mix(rest, raise, up), slam, fall);
          liftR = 0.28 * up;
          lean = 0.16 - 0.18 * up + 0.2 * fall;
          drop += 0.1 * fall;
          headPitch = -0.3 * up + 0.15 * fall;
          earK = up;
          if (p > 0.55 && p < 0.85) impact = Math.sin(((p - 0.55) / 0.3) * Math.PI);
        } else if (nm === "drill") {
          const k = smooth(0.04, 0.18, p) * (1 - smooth(0.86, 0.98, p));
          const dig = { sx: -1.05, sz: -0.05, ex: -0.35, wx: -0.1 };
          poseL = mix(rest, dig, k);
          poseR = mix(rest, dig, k);
          lean = lerp(0.16, 0.45, k);
          drop += 0.18 * k;
          headPitch = 0.1 * k;
          converge = smooth(0.06, 0.2, p) * (1 - smooth(0.88, 0.97, p));
          spin = smooth(0.2, 0.3, p) * (1 - smooth(0.8, 0.88, p));
          digK = smooth(0.25, 0.4, p) * (1 - smooth(0.78, 0.9, p));
          shut = digK * 0.55;
          baseA = lerp(baseA, -0.62, k);
          if (digK > 0.3) impact = 0.35 + Math.abs(Math.sin(t * 9)) * 0.25;
        } else if (nm === "slash") {
          const wind = smooth(0.05, 0.35, p) * (1 - smooth(0.4, 0.52, p));
          const hit = smooth(0.4, 0.52, p) * (1 - smooth(0.75, 0.98, p));
          poseR = mix(mix(rest, { sx: -2.6, sz: 0.5, ex: -0.6, wx: 0 }, wind), { sx: -0.6, sz: -0.75, ex: -0.25, wx: 0 }, hit);
          poseL = mix(rest, { sx: -0.5, sz: 0.4, ex: -0.9, wx: -0.2 }, Math.max(wind, hit));
          twist = 0.3 * wind - 0.4 * hit;
          lean = 0.16 - 0.1 * wind + 0.2 * hit;
          headYaw = -0.2 * hit + 0.15 * wind;
          if (p > 0.46 && p < 0.7) impact = Math.sin(((p - 0.46) / 0.24) * Math.PI) * 0.45;
        } else if (nm === "sweep") {
          const wind = smooth(0.05, 0.3, p) * (1 - smooth(0.32, 0.42, p));
          const swing = smooth(0.32, 0.55, p) * (1 - smooth(0.75, 0.95, p));
          tailYaw = 0.75 * wind - 1.15 * swing;
          twist = -0.25 * wind + 0.35 * swing;
          baseA = lerp(baseA, -0.7, Math.max(wind, swing));
          hookA = lerp(hookA, -1.0, swing);
          headYaw = -0.3 * swing + 0.2 * wind;
          const brace = { sx: -0.35, sz: 0.45, ex: -0.9, wx: -0.1 };
          poseL = mix(rest, brace, Math.max(wind, swing));
          poseR = mix(rest, brace, Math.max(wind, swing));
          drop += 0.06 * swing;
          if (p > 0.4 && p < 0.62) impact = Math.sin(((p - 0.4) / 0.22) * Math.PI) * 0.6;
          if (p > 0.42 && p < 0.82) throwK = (p - 0.42) / 0.4;
        } else if (nm === "hide") {
          const k = smooth(0.04, 0.2, p) * (1 - smooth(0.82, 0.96, p));
          const peek = smooth(0.46, 0.54, p) * (1 - smooth(0.64, 0.72, p));
          const guard = { sx: -0.95, sz: -0.2, ex: -1.95, wx: 0.1 };
          poseL = mix(rest, guard, k);
          poseR = mix(rest, guard, k);
          drop += 0.2 * k;
          lean = lerp(0.16, 0.3, k);
          headDuck = k * (1 - peek * 0.7);
          shut = k > 0.5 ? 1 - peek * 2 : 0;
          baseA = lerp(baseA, -0.8, k);
          hookA = lerp(hookA, -1.1, k);
          if (p > 0.14 && p < 0.28) impact = Math.sin(((p - 0.14) / 0.14) * Math.PI) * 0.35;
        } else if (nm === "sniff") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.85, 1, p));
          headYaw = Math.sin(p * Math.PI * 4) * 0.4 * k;
          headPitch = 0.12 * k + Math.sin(t * 20) * 0.02 * k;
          lean = lerp(0.16, 0.28, k);
          earK = k * Math.abs(Math.sin(p * Math.PI * 6));
          tailYaw += Math.sin(p * Math.PI * 3) * 0.2 * k;
          poseR = mix(rest, { sx: -0.4, sz: 0.1, ex: -1.2, wx: -0.3 }, k);
        } else if (nm === "eat") {
          const k = smooth(0.0, 0.25, p) * (1 - smooth(0.88, 1, p));
          poseR = mix(rest, { sx: -0.6, sz: -0.8, ex: -1.0, wx: -0.4 }, k);
          headPitch = 0.25 * smooth(0.25, 0.35, p) * (1 - smooth(0.85, 0.95, p));
          shut = p > 0.35 && p < 0.85 ? 0.45 : 0;
        }

        root.rotation.y = lookYaw;
        bodyG.position.y = -drop;
        upper.rotation.set(lean + lookPitch * 0.3, twist, sideLean);
        const sq = 1 + breath * 0.012;
        torso.scale.set(TR.x * sq, TR.y, TR.z * sq);

        legs.forEach(({ hip, knee, ankle, sx }) => {
          const lift = sx > 0 ? liftR : liftL;
          const H = Math.max(0.2, HIP - drop - FH - lift);
          const a = Math.acos(Math.min(1, H / (L1 + L2)));
          hip.position.y = HIP;
          hip.rotation.set(-a - lift * 1.2, 0, 0);
          knee.rotation.set(2 * a + lift * 1.6, 0, 0);
          ankle.rotation.set(-a - lift * 0.4, 0, 0);
        });

        arms.forEach(a => {
          const ps = a.sx > 0 ? poseR : poseL;
          pose(a, { sx: ps.sx, sz: (ps.sz || 0) * a.sx, ex: ps.ex, wx: ps.wx });
          a.pg.rotation.set(a.sh.rotation.x * 0.3, 0, a.sh.rotation.z * 0.45);
          a.hand.rotation.y += spin * 0.55 * a.sx;
          if (spin < 0.02) {
            const q = TAU / 3;
            a.hand.rotation.y = lerp(a.hand.rotation.y, Math.round(a.hand.rotation.y / q) * q, 0.25);
          }
          a.claws.forEach(({ cg }) => cg.geometry.userData.morph(converge));
        });

        headPivot.position.set(0, lerp(2.06 - HIP, 1.92 - HIP, headDuck), lerp(0.36, 0.2, headDuck));
        head.rotation.set(headPitch - lean * 0.8 + headDuck * 0.45, headYaw, 0);
        mouth.scale.set(1, nm === "eat" && ph && ph.chew ? 0.4 + ph.chew * 0.8 : 1, 1);

        tailPivot.rotation.set(0, tailYaw, 0);
        tailShape(baseA - lean, bendA, hookA);

        ears.forEach((e, i) => {
          const s2 = i ? 1 : -1;
          e.rotation.z = -0.55 * s2 + Math.sin(t * 9 + i) * 0.16 * earK;
        });
        const close = Math.max(shut, 1 - blink);
        eyes.forEach(({ g }) => {
          g.scale.y = lerp(1, 0.08, close);
        });
        lids.forEach(l => {
          l.rotation.x = lerp(-0.8, -0.18, close * 0.95);
        });
        followPupils(eyes, pointer, 0.6);

        const fx = impact > 0.05;
        dust.forEach(d => {
          d.m.visible = fx;
          if (!fx) return;
          const u = 1 - impact;
          const r = 0.9 + u * 0.6;
          const cz = nm === "drill" ? 1.25 : nm === "sweep" ? -1.3 : 0.1;
          d.m.position.set(Math.cos(d.a) * r * (nm === "drill" ? 0.5 : 1), 0.1 + u * 0.2, cz + Math.sin(d.a) * r * (nm === "drill" ? 0.4 : 0.8));
          d.m.scale.setScalar(0.35 + u * 0.7);
          dustMat.opacity = 0.3 * impact;
        });
        debris.forEach(d => {
          let vis = false;
          if (digK > 0.25) {
            vis = true;
            const q = (t * d.sp * 1.4 + d.k * 0.31) % 1;
            d.m.position.set(d.a * 0.8, 0.1 + Math.sin(q * Math.PI) * 1.0, 1.3 + q * 0.5 - q * q * 0.2);
          } else if (throwK >= 0) {
            vis = true;
            const q = Math.min(1, throwK * (0.75 + (d.k % 4) * 0.1));
            const side = Math.sin(tailYaw) > 0 ? 1 : -1;
            d.m.position.set(side * (0.6 + q * 1.4) + d.a * 0.3, 0.15 + Math.sin(q * Math.PI) * (0.5 + (d.k % 3) * 0.2), -1.4 + d.a * 0.4 + q * 0.4);
          }
          d.m.visible = vis;
          d.m.rotation.set(t * 4 + d.k, t * 3, 0);
        });
        sparks.forEach(sp => {
          sp.m.visible = digK > 0.3;
          if (!sp.m.visible) return;
          const q = (t * 3 + sp.k * 0.17) % 1;
          const sd = sp.k % 2 ? 1 : -1;
          sp.m.position.set(sd * (0.45 + Math.sin(sp.k) * 0.1) + Math.cos(sp.k * 2.3) * q * 0.5, 0.06 + q * 0.6, 1.15 + Math.sin(sp.k * 1.7) * q * 0.5);
          sp.m.scale.setScalar(1 - q);
        });

        if (nm === "eat" && ph) {
          food.visible = ph.visible;
          root.updateMatrixWorld(true);
          arms[1].palm.getWorldPosition(tmpV);
          big.worldToLocal(tmpV);
          tmpV.z += 0.14;
          tmpV.y += 0.1;
          food.position.set(tmpV.x, lerp(3.6, tmpV.y, ph.fall * ph.fall), tmpV.z);
          food.scale.setScalar(1 - 0.85 * ph.bite);
        } else food.visible = false;
      }
    };
  }
});
