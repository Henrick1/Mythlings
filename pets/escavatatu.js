Pets.register({
  id: "escavatatu",
  dex: 42,
  name: "Escavatatu",
  color: "#9c6a2c",
  types: ["ground", "steel"],
  stage: 3,
  description: "O casco do Tatubola parou de rolar e cresceu numa cúpula de rosetas de osso, presa por cintas de aço. As garras da frente se torceram em brocas que atravessam rocha, e a pá do rabo varre montanhas de terra de uma vez. Quando ameaçado, se abaixa, tampa a entrada com o elmo e vira uma fortaleza.",
  actions: {
    jump: { duration: 1.4 },
    eat: { duration: 2.4 },
    drill: { duration: 2.8 },
    sweep: { duration: 1.9 },
    hide: { duration: 3.0 },
    sniff: { duration: 2.0 }
  },
  battle: { attack: { action: "sweep", hit: 0.48, speed: 1.0 }, special: { action: "drill", hit: 0.6, speed: 1.0 } },
  idle: [
    { action: "sniff", min: 12, max: 30 },
    { action: "drill", min: 30, max: 70 },
    { action: "hide", min: 40, max: 80 },
    { action: "sweep", min: 40, max: 90 }
  ],
  clickAction: n => ["hide", "drill", "sniff", "sweep", "jump"][(n - 1) % 5],

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

    const R = 0.8;
    const CY = 0.86;
    const BANDS = [-0.12, 0.0, 0.12, 0.24];
    const LA_F = 1.12;
    const LA_B = 1.45;
    const AZ = 1.86;
    const ZS = 1.16;
    const YS = 1.18;
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
      const W = 512;
      const H = 256;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = "#5c3d1c";
      g.fillRect(0, 0, W, H);
      const r = 26;
      for (let row = -1; row * r * 1.5 < H + r; row++)
        for (let col = -1; col * r * 1.732 < W + r; col++) rosette(g, col * r * 1.732 + (row % 2 ? r * 0.866 : 0), row * r * 1.5, r);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      return t;
    })();

    const shellMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: shellTex, roughness: 0.55, metalness: 0.18 });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: plateTex, roughness: 0.55, metalness: 0.1 });
    const plateMat2 = plateMat.clone();
    plateMat2.side = THREE.DoubleSide;
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x3a2814, roughness: 0.9, side: THREE.BackSide });
    const skinMat = mat(0xc98f68, 0.72);
    const bellyMat = mat(0xd9a27c, 0.78);
    const noseMat = mat(0x8e5048, 0.5);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xc9d1d9, roughness: 0.3, metalness: 0.45 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x6b737c, roughness: 0.35, metalness: 0.5 });
    const keratin = new THREE.MeshStandardMaterial({ color: 0x5a3c1f, roughness: 0.4, metalness: 0.12 });
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xc28a46, roughness: 0.45, metalness: 0.1 });
    const darkMat = mat(0x221a14, 0.5);

    const NU = 90;
    const NV = 56;
    const sPos = new Float32Array((NU + 1) * (NV + 1) * 3);
    const sUv = new Float32Array((NU + 1) * (NV + 1) * 2);
    const sIdx = [];
    const ridge = u => {
      let r = 0;
      BANDS.forEach((b, i) => {
        const d = u - b;
        if (i > 0) r += 0.04 * Math.exp(-((d + 0.012) * (d + 0.012)) / 0.00025) - 0.018 * Math.exp(-((d - 0.018) * (d - 0.018)) / 0.0003);
        else r -= 0.02 * Math.exp(-(d * d) / 0.0003);
      });
      return r;
    };
    for (let i = 0; i <= NU; i++) {
      const u = (i / NU) * 2 - 1;
      const la = u * (u < 0 ? LA_B : LA_F);
      const rr = R * (1 + ridge(u));
      for (let j = 0; j <= NV; j++) {
        const v = (j / NV) * 2 - 1;
        const az = v * AZ;
        const flare = 1 + 0.07 * Math.pow(Math.abs(v), 6);
        const k = i * (NV + 1) + j;
        sPos[k * 3] = rr * Math.cos(la) * Math.sin(az) * flare;
        sPos[k * 3 + 1] = rr * Math.cos(la) * Math.cos(az) * YS;
        sPos[k * 3 + 2] = rr * Math.sin(la) * ZS * (1 + 0.04 * Math.pow(Math.abs(u), 6));
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

    const domeG = new THREE.Group();
    domeG.position.y = CY;
    bodyG.add(domeG);
    domeG.add(mesh(shellGeo, shellMat));
    const shellIn = new THREE.Mesh(shellGeo, innerMat);
    shellIn.scale.setScalar(0.975);
    domeG.add(shellIn);

    const rimMat = new THREE.MeshStandardMaterial({ color: 0x6e4a22, roughness: 0.55, metalness: 0.1 });
    const edgePts = [];
    for (let i = NU; i >= 0; i -= 2) edgePts.push(at(i, 0));
    const rimSide = (j, dir) => {
      const pts = [];
      for (let i = 0; i <= NU; i += 2) pts.push(at(dir > 0 ? i : NU - i, j));
      return pts;
    };
    [rimSide(0, 1), rimSide(NV, 1)].forEach(pts => domeG.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.045, 10, false), rimMat)));
    const frontPts = [];
    for (let j = 0; j <= NV; j += 2) frontPts.push(at(NU, j));
    domeG.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(frontPts), 60, 0.045, 10, false), rimMat));
    [0, NV].forEach(j => {
      [0, NU].forEach(i => {
        const cap = mesh(new THREE.SphereGeometry(0.045, 12, 10), rimMat, false);
        cap.position.copy(at(i, j));
        domeG.add(cap);
      });
    });

    const ribMat = new THREE.MeshStandardMaterial({ color: 0xaab3bd, roughness: 0.25, metalness: 0.85 });
    BANDS.forEach(b => {
      const i = Math.round(((b + 1) / 2) * NU);
      const pts = [];
      for (let j = 0; j <= NV; j += 2) pts.push(at(i, j, 0.012));
      domeG.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.03, 10, false), ribMat));
    });

    const UPV = V3(0, 1, 0);
    const knobGeo = new THREE.LatheGeometry([V2(0.085, -0.03), V2(0.088, 0.01), V2(0.078, 0.045), V2(0.055, 0.075), V2(0.025, 0.095), V2(0.0001, 0.1)], 18);
    const spikeGeo = new THREE.LatheGeometry([V2(0.05, -0.02), V2(0.05, 0.01), V2(0.035, 0.05), V2(0.012, 0.09), V2(0.0001, 0.1)], 12);
    for (let i = 4; i <= NU - 3; i += 6) {
      const u = (i / NU) * 2 - 1;
      if (u > BANDS[0] - 0.05 && u < BANDS[3] + 0.05) continue;
      [NV / 2 - 8, NV / 2, NV / 2 + 8].forEach((j, n) => {
        if (n !== 1 && (u > 0.8 || u < -0.85)) return;
        const m = mesh(knobGeo, knobMat, n === 1);
        if (n !== 1) m.scale.setScalar(0.7);
        m.position.copy(at(i, j));
        m.quaternion.setFromUnitVectors(UPV, nAt(i, j));
        domeG.add(m);
      });
    }
    [3, NV - 3].forEach(j => {
      for (let i = 6; i <= NU - 4; i += 7) {
        const u = (i / NU) * 2 - 1;
        if (u > BANDS[0] - 0.04 && u < BANDS[3] + 0.04) continue;
        const m = mesh(spikeGeo, knobMat, false);
        m.position.copy(at(i, j));
        m.quaternion.setFromUnitVectors(UPV, nAt(i, j));
        domeG.add(m);
      }
    });

    const bellyGeo = new THREE.SphereGeometry(1, 48, 32);
    const bp = bellyGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i);
      const y = bp.getY(i);
      const z = bp.getZ(i);
      bp.setXYZ(i, x * 0.7, y * (y > 0 ? 0.62 : 0.5), z * (z < 0 ? 0.78 : 0.92));
    }
    bellyGeo.computeVertexNormals();
    const belly = mesh(bellyGeo, bellyMat);
    belly.position.y = -0.14;
    domeG.add(belly);

    const headPivot = new THREE.Group();
    domeG.add(headPivot);
    const head = new THREE.Group();
    headPivot.add(head);
    const skull = mesh(new THREE.SphereGeometry(0.36, 40, 28), skinMat);
    skull.scale.set(1.05, 0.88, 1.02);
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
    const helmet = mesh(new THREE.SphereGeometry(0.385, 44, 22, 0, TAU, 0, 0.95), plateMat2);
    helmet.scale.set(0.9, 0.86, 1.08);
    helmet.rotation.x = -0.25;
    helmet.position.set(0, 0.035, -0.02);
    head.add(helmet);
    const snoutPlateGeo = new THREE.CylinderGeometry(0.142, 0.238, 0.34, 28, 6, true, Math.PI * 0.6, Math.PI * 0.8);
    snoutPlateGeo.rotateX(Math.PI / 2);
    const snoutPlate = mesh(snoutPlateGeo, plateMat2);
    snoutPlate.position.set(0, 0, 0.19);
    snout.add(snoutPlate);
    const ears = [-1, 1].map(s => {
      const eg = new THREE.Group();
      eg.position.set(0.3 * s, 0.04, -0.1);
      eg.rotation.set(-0.1, 0.55 * s, -1.2 * s);
      head.add(eg);
      const outer = mesh(new THREE.SphereGeometry(0.09, 18, 12, 0, TAU, 0, Math.PI * 0.55), skinMat);
      outer.scale.set(1, 1.3, 0.5);
      outer.rotation.x = -Math.PI / 2;
      eg.add(outer);
      const inner = mesh(new THREE.SphereGeometry(0.064, 16, 10, 0, TAU, 0, Math.PI * 0.5), noseMat, false);
      inner.scale.set(1, 1.25, 0.35);
      inner.rotation.x = -Math.PI / 2;
      inner.position.z = 0.012;
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

    const legs = [];
    const drills = [];
    const legSpec = [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1]
    ];
    legSpec.forEach(([sx, sz]) => {
      const front = sz > 0;
      const lg = new THREE.Group();
      lg.position.set(0.5 * sx, 0.62, front ? 0.46 : -0.5);
      bodyG.add(lg);
      const lr = front ? 0.215 : 0.205;
      const legGeo = new THREE.LatheGeometry([V2(0.0001, -0.6), V2(lr * 0.86, -0.6), V2(lr * 0.98, -0.56), V2(lr * 0.9, -0.42), V2(lr * 0.86, -0.28), V2(lr * 0.95, -0.12), V2(lr * 1.05, 0.02), V2(lr * 0.9, 0.14), V2(0.0001, 0.2)], 26);
      lg.add(mesh(legGeo, skinMat));
      const cuffPts = [V2(0.0001, -0.34), V2(lr * 0.9, -0.34)];
      for (let k = 0; k < 4; k++) {
        const y0 = -0.32 + k * 0.12;
        cuffPts.push(V2(lr * 1.08, y0 + 0.012), V2(lr * 1.16, y0 + 0.05), V2(lr * 1.12, y0 + 0.1), V2(lr * 1.04, y0 + 0.118));
      }
      cuffPts.push(V2(lr * 0.9, 0.17), V2(0.0001, 0.2));
      const cuff = mesh(new THREE.LatheGeometry(cuffPts, 28), rimMat);
      lg.add(cuff);
      const foot = mesh(new THREE.SphereGeometry(lr * 0.98, 22, 14, 0, TAU, 0, Math.PI / 2), skinMat);
      foot.scale.set(1.08, 0.5, front ? 1.15 : 1.28);
      foot.position.set(0, -0.6, 0.04);
      lg.add(foot);
      if (front) {
        const drillG = new THREE.Group();
        drillG.position.set(0, -0.47, 0.17);
        drillG.rotation.x = Math.PI / 2 + 0.22;
        drillG.scale.setScalar(1.3);
        lg.add(drillG);
        const spin = new THREE.Group();
        drillG.add(spin);
        const cone = mesh(new THREE.LatheGeometry([V2(0.075, 0), V2(0.072, 0.05), V2(0.058, 0.14), V2(0.038, 0.23), V2(0.014, 0.29), V2(0.0001, 0.31)], 24), steelMat);
        spin.add(cone);
        const hel = [];
        for (let k = 0; k <= 80; k++) {
          const q = k / 80;
          const yy = 0.02 + q * 0.26;
          const rr = lerp(0.075, 0.012, Math.pow(q, 1.15)) + 0.006;
          const a = q * TAU * 3.2;
          hel.push(V3(Math.cos(a) * rr, yy, Math.sin(a) * rr));
        }
        spin.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hel), 160, 0.012, 6, false), darkSteel, false));
        const collar = mesh(new THREE.TorusGeometry(0.078, 0.02, 8, 24), keratin, false);
        collar.rotation.x = Math.PI / 2;
        drillG.add(collar);
        [-1, 1].forEach(k => {
          const cl = mesh(new THREE.ConeGeometry(0.03, 0.13, 6), keratin, false);
          cl.position.set(k * 0.1, 0.04, 0.02);
          cl.rotation.z = -k * 0.25;
          drillG.add(cl);
        });
        drills.push(spin);
      } else {
        for (let c = 0; c < 4; c++) {
          const cl = mesh(new THREE.ConeGeometry(0.028, 0.1, 6), keratin, false);
          cl.rotation.x = Math.PI / 2 + 0.5;
          cl.position.set((c - 1.5) * 0.07, -0.585, 0.29);
          lg.add(cl);
        }
      }
      legs.push({ lg, sx, sz, front });
    });

    const tailPivot = new THREE.Group();
    domeG.add(tailPivot);
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
    const tailRoot = mesh(new THREE.SphereGeometry(0.235, 26, 18), plateMat);
    tailRoot.scale.set(1, 0.95, 1.2);
    tailRoot.position.z = 0.08;
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
    const TL = 1.08;
    const SPLIT = 0.55;
    const tailShape = (th0, bend, hook) => {
      let py = 0;
      let pz = 0;
      const ds = TL / NS;
      for (let i = 0; i <= NS; i++) {
        const s = i / NS;
        const th = lerp(-0.12, th0, smooth(0, 0.2, s)) + (bend * Math.min(s, SPLIT)) / SPLIT + hook * smooth(SPLIT - 0.08, 1, s);
        const ty = Math.sin(th);
        const tz = -Math.cos(th);
        const ny = Math.cos(th);
        const nz = Math.sin(th);
        const m = smooth(SPLIT - 0.06, SPLIT + 0.25, s);
        const ring = 0.028 * Math.pow(Math.max(0, Math.sin(s * Math.PI * 9)), 2) * (1 - m) * smooth(0.04, 0.12, s);
        const r = lerp(0.215, 0.1, Math.pow(Math.min(1, s / SPLIT), 0.75)) + ring;
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
    tailPivot.position.set(0, -0.08, -R * Math.sin(LA_B) * ZS * 0.9);

    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x86603c, roughness: 1 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.9 });
    const debris = [];
    for (let k = 0; k < 20; k++) {
      const m = mesh(new THREE.DodecahedronGeometry(0.04 + (k % 4) * 0.018), k % 3 ? dirtMat : rockMat, false);
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

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;

        let lift = 0;
        let pitch = 0;
        let roll = 0;
        let sink = 0;
        let sy = 1 + Math.sin(t * 1.3) * 0.008 * motion;
        let headPitch = 0;
        let headYaw = 0;
        let headIn = 0;
        let earK = 0;
        let impact = 0;
        let drillSpin = 0;
        let drillDig = 0;
        let frontReach = 0;
        let shut = 0;
        let baseA = -0.3 + Math.sin(t * 0.9) * 0.04 * motion;
        let bendA = 0.45 + Math.sin(t * 1.2 + 1) * 0.05 * motion;
        let hookA = -1.7 + Math.sin(t * 1.5 + 2) * 0.08 * motion;
        let tailYaw = Math.sin(t * 0.8) * 0.12 * motion;
        let throwK = -1;
        let sweepK = 0;

        if (nm === "jump") {
          const rear = smooth(0.08, 0.38, p) * (1 - smooth(0.46, 0.56, p));
          pitch = -0.42 * rear;
          lift = 0.12 * rear;
          frontReach = rear;
          earK = rear;
          if (p > 0.52 && p < 0.8) impact = Math.sin(((p - 0.52) / 0.28) * Math.PI);
          sy -= 0.06 * (p > 0.5 && p < 0.62 ? Math.sin(((p - 0.5) / 0.12) * Math.PI) : 0);
          hookA -= rear * 0.6;
        } else if (nm === "drill") {
          const k = smooth(0.05, 0.18, p) * (1 - smooth(0.86, 0.98, p));
          pitch = 0.22 * k;
          sink = 0.05 * k;
          headPitch = 0.25 * k;
          drillSpin = k;
          drillDig = smooth(0.25, 0.4, p) * (1 - smooth(0.78, 0.9, p));
          shut = drillDig * 0.55;
          if (drillDig > 0.3) impact = 0.35 + Math.abs(Math.sin(t * 9)) * 0.25;
        } else if (nm === "sweep") {
          const wind = smooth(0.05, 0.3, p) * (1 - smooth(0.32, 0.42, p));
          const swing = smooth(0.32, 0.55, p) * (1 - smooth(0.75, 0.95, p));
          tailYaw = 0.7 * wind - 1.1 * swing;
          roll = 0.06 * swing - 0.04 * wind;
          baseA = lerp(baseA, -0.55, Math.max(wind, swing));
          hookA = lerp(hookA, -1.2, swing);
          headYaw = -0.25 * swing + 0.2 * wind;
          sweepK = swing;
          if (p > 0.4 && p < 0.62) impact = Math.sin(((p - 0.4) / 0.22) * Math.PI) * 0.6;
          if (p > 0.42 && p < 0.82) throwK = (p - 0.42) / 0.4;
        } else if (nm === "hide") {
          const k = smooth(0.04, 0.22, p) * (1 - smooth(0.8, 0.96, p));
          sink = 0.5 * k;
          headIn = k;
          shut = k > 0.6 ? 1 : 0;
          const peek = smooth(0.46, 0.54, p) * (1 - smooth(0.64, 0.72, p));
          headIn -= peek * 0.4;
          shut = Math.max(0, shut - peek * 2);
          baseA = lerp(baseA, -0.75, k);
          bendA = lerp(bendA, -0.05, k);
          hookA = lerp(hookA, -0.6, k);
          if (p > 0.16 && p < 0.3) impact = Math.sin(((p - 0.16) / 0.14) * Math.PI) * 0.45;
        } else if (nm === "sniff") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.85, 1, p));
          headYaw = Math.sin(p * Math.PI * 4) * 0.4 * k;
          headPitch = -0.12 * k + Math.sin(t * 20) * 0.02 * k;
          earK = k * Math.abs(Math.sin(p * Math.PI * 6));
          tailYaw += Math.sin(p * Math.PI * 3) * 0.2 * k;
        } else if (nm === "eat") {
          headPitch = 0.28 * smooth(0.25, 0.35, p) * (1 - smooth(0.85, 0.95, p));
          shut = p > 0.35 && p < 0.85 ? 0.55 : 0;
        }

        root.rotation.y = lookYaw;
        bodyG.position.set(0, lift - sink, 0);
        bodyG.rotation.set(pitch + lookPitch * 0.4, 0, roll);
        const sx = 1 / Math.sqrt(sy);
        domeG.scale.set(sx, sy, sx);

        headPivot.position.set(0, lerp(-0.08, 0.02, headIn), lerp(R * Math.sin(LA_F) * ZS + 0.02, R * Math.sin(LA_F) * ZS - 0.2, headIn));
        headPivot.scale.setScalar(lerp(1, 0.94, headIn));
        head.rotation.set(headPitch + headIn * 1.15, headYaw, 0);
        mouth.scale.set(1, nm === "eat" && ph && ph.chew ? 0.4 + ph.chew * 0.8 : 1, 1);

        tailPivot.rotation.set(0, tailYaw, 0);
        tailShape(baseA, bendA, hookA);

        legs.forEach(({ lg, sx: lx, sz, front }) => {
          const tuck = sink / 0.5;
          lg.position.set(lerp(0.5, 0.32, tuck) * lx, 0.62 + sink * 0.8, (front ? 0.46 : -0.5) * lerp(1, 0.85, tuck));
          let rx = 0;
          if (front) {
            rx = -0.9 * frontReach + 0.55 * drillDig + Math.sin(t * 7 + (lx > 0 ? Math.PI : 0)) * 0.25 * drillDig;
          }
          lg.rotation.x = rx;
          lg.rotation.z = 0;
        });
        drills.forEach((d, i) => {
          d.rotation.y += drillSpin * 0.6 * (i ? 1 : -1);
        });

        ears.forEach((e, i) => {
          const s2 = i ? 1 : -1;
          e.rotation.z = -1.2 * s2 + Math.sin(t * 9 + i) * 0.16 * earK;
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
          const r = 1.0 + u * 0.6;
          const cz = nm === "drill" ? 1.0 : nm === "sweep" ? -1.2 : 0;
          d.m.position.set(Math.cos(d.a) * r * (nm === "drill" ? 0.5 : 1), 0.12 + u * 0.2, cz + Math.sin(d.a) * r * (nm === "drill" ? 0.4 : 1));
          d.m.scale.setScalar(0.35 + u * 0.7);
          dustMat.opacity = 0.3 * impact;
        });
        debris.forEach(d => {
          let vis = false;
          if (drillDig > 0.25) {
            vis = true;
            const q = (t * d.sp * 1.4 + d.k * 0.31) % 1;
            d.m.position.set(d.a * 0.7, 0.1 + Math.sin(q * Math.PI) * 0.9, 1.15 + q * 0.5 - q * q * 0.2);
          } else if (throwK >= 0) {
            vis = true;
            const q = Math.min(1, throwK * (0.75 + (d.k % 4) * 0.1));
            const side = Math.sin(tailYaw) > 0 ? 1 : -1;
            d.m.position.set(side * (0.6 + q * 1.4) + d.a * 0.3, 0.15 + Math.sin(q * Math.PI) * (0.5 + (d.k % 3) * 0.2), -1.3 + d.a * 0.4 + q * 0.4);
          }
          d.m.visible = vis;
          d.m.rotation.set(t * 4 + d.k, t * 3, 0);
        });
        sparks.forEach(sp => {
          sp.m.visible = drillDig > 0.3;
          if (!sp.m.visible) return;
          const q = (t * 3 + sp.k * 0.17) % 1;
          const sd = sp.k % 2 ? 1 : -1;
          sp.m.position.set(sd * (0.5 + Math.sin(sp.k) * 0.1) + Math.cos(sp.k * 2.3) * q * 0.5, 0.06 + q * 0.5, 1.0 + Math.sin(sp.k * 1.7) * q * 0.5);
          sp.m.scale.setScalar(1 - q);
        });

        if (nm === "eat" && ph) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.4, 0.25, ph.fall * ph.fall), 1.62);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.85);
        } else food.visible = false;
      }
    };
  }
});
