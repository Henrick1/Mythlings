Pets.register({
  id: "tatuzinho",
  dex: 40,
  name: "Tatuzinho",
  color: "#e0a42a",
  types: ["ground", "steel"],
  evolvesTo: "tatubola",
  evolveLevel: 16,
  description: "Um tatuzinho cavador de casco cheio de plaquinhas. A ponta do rabo é uma pá curva com dentes, parecida com a caçamba de uma escavadeira, que ele usa para abrir túneis. Ao menor susto se fecha numa bola perfeita.",
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    curl: { duration: 2.8 },
    roll: { duration: 2.3 },
    dig: { duration: 2.6 },
    sniff: { duration: 1.9 },
    spin: { duration: 2.2 }
  },
  battle: { attack: { action: "roll", hit: 0.48, speed: 1.0 }, special: { action: "dig", hit: 0.62, speed: 1.0 } },
  idle: [
    { action: "sniff", min: 12, max: 30 },
    { action: "curl", min: 30, max: 60 },
    { action: "dig", min: 30, max: 70 }
  ],
  clickAction: n => ["curl", "dig", "sniff", "roll", "spin"][(n - 1) % 5],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const TAU = Math.PI * 2;

    const root = new THREE.Group();
    const bodyG = new THREE.Group();
    root.add(bodyG);

    const R = 0.62;
    const BANDS = [-0.14, 0.02, 0.18, 0.34];

    const shellTex = (() => {
      if (typeof document === "undefined") return null;
      const W = 1024;
      const H = 512;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = "#b98a4e";
      g.fillRect(0, 0, W, H);
      const ux = u => ((u + 1) / 2) * W;
      const shield = (x0, x1) => {
        g.save();
        g.beginPath();
        g.rect(x0, 0, x1 - x0, H);
        g.clip();
        g.fillStyle = "#6b4a24";
        g.fillRect(x0, 0, x1 - x0, H);
        const r = 25;
        for (let row = -1; row * r * 1.5 < H + r; row++) {
          for (let col = -1; col * r * 1.732 < W + r; col++) {
            const cx = col * r * 1.732 + (row % 2 ? r * 0.866 : 0);
            const cy = row * r * 1.5;
            g.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * TAU + Math.PI / 6;
              const x = cx + Math.cos(a) * (r - 3.5);
              const y = cy + Math.sin(a) * (r - 3.5);
              i ? g.lineTo(x, y) : g.moveTo(x, y);
            }
            g.closePath();
            const gr = g.createRadialGradient(cx - 5, cy - 6, 2, cx, cy, r);
            gr.addColorStop(0, "#f2cf8e");
            gr.addColorStop(0.6, "#d9a961");
            gr.addColorStop(1, "#b58142");
            g.fillStyle = gr;
            g.fill();
            for (let k = 0; k < 5; k++) {
              const a = (k / 5) * TAU + row;
              g.beginPath();
              g.arc(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42, 2.2, 0, TAU);
              g.fillStyle = "#9c6c34";
              g.fill();
            }
          }
        }
        g.restore();
      };
      shield(0, ux(BANDS[0]));
      shield(ux(BANDS[3]), W);
      for (let b = 0; b < 3; b++) {
        const x0 = ux(BANDS[b]);
        const x1 = ux(BANDS[b + 1]);
        const gr = g.createLinearGradient(x0, 0, x1, 0);
        gr.addColorStop(0, "#565d66");
        gr.addColorStop(0.55, "#9aa3ad");
        gr.addColorStop(1, "#c3cad1");
        g.fillStyle = gr;
        g.fillRect(x0, 0, x1 - x0, H);
        if (b === 1) {
          g.save();
          g.beginPath();
          g.rect(x0 + 10, 0, x1 - x0 - 20, H);
          g.clip();
          g.fillStyle = "#f2b705";
          g.fillRect(x0, 0, x1 - x0, H);
          g.fillStyle = "#1d1d1f";
          for (let y = -60; y < H + 60; y += 44) {
            g.beginPath();
            g.moveTo(x0, y);
            g.lineTo(x0, y + 22);
            g.lineTo(x1, y + 22 + 50);
            g.lineTo(x1, y + 50);
            g.closePath();
            g.fill();
          }
          g.restore();
        }
        for (let y = 14; y < H; y += 36) {
          [x0 + 6, x1 - 7].forEach(x => {
            g.beginPath();
            g.arc(x, y, 4.2, 0, TAU);
            g.fillStyle = "#3c4148";
            g.fill();
            g.beginPath();
            g.arc(x - 1.2, y - 1.2, 1.8, 0, TAU);
            g.fillStyle = "#eef2f5";
            g.fill();
          });
        }
        g.fillStyle = "#2c3036";
        g.fillRect(x0, 0, 4, H);
      }
      const side = g.createLinearGradient(0, 0, 0, H);
      side.addColorStop(0, "rgba(40,25,10,0.45)");
      side.addColorStop(0.08, "rgba(40,25,10,0)");
      side.addColorStop(0.92, "rgba(40,25,10,0)");
      side.addColorStop(1, "rgba(40,25,10,0.45)");
      g.fillStyle = side;
      g.fillRect(0, 0, W, H);
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      return t;
    })();

    const plateTex = (() => {
      if (typeof document === "undefined") return null;
      const W = 512;
      const H = 256;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = "#6b4a24";
      g.fillRect(0, 0, W, H);
      const r = 21;
      for (let row = -1; row * r * 1.5 < H + r; row++)
        for (let col = -1; col * r * 1.732 < W + r; col++) {
          const cx = col * r * 1.732 + (row % 2 ? r * 0.866 : 0);
          const cy = row * r * 1.5;
          g.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + Math.PI / 6;
            i ? g.lineTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3)) : g.moveTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
          }
          g.closePath();
          const gr = g.createRadialGradient(cx - 4, cy - 5, 2, cx, cy, r);
          gr.addColorStop(0, "#f2cf8e");
          gr.addColorStop(0.6, "#d9a961");
          gr.addColorStop(1, "#b58142");
          g.fillStyle = gr;
          g.fill();
        }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      return t;
    })();
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: plateTex, roughness: 0.5, metalness: 0.12 });
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: shellTex, roughness: 0.5, metalness: 0.22 });
    kit.surface(shellMat, shellTex, { flat: [[(BANDS[0] + 1) / 2, (BANDS[1] + 1) / 2, 0.38, 0.3], [(BANDS[1] + 1) / 2, (BANDS[2] + 1) / 2, 0.18, 0.42], [(BANDS[2] + 1) / 2, (BANDS[3] + 1) / 2, 0.38, 0.3]] });
    kit.surface(plateMat, plateTex, { seed: 5 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9, side: THREE.BackSide });
    const skinMat = mat(0xd9a07a, 0.7);
    const bellyMat = mat(0xe2b08a, 0.75);
    const pinkMat = mat(0xd9777a, 0.55);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, roughness: 0.32, metalness: 0.75 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.45, metalness: 0.6 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.12, metalness: 0.95 });
    const darkMat = mat(0x2a201a, 0.5);

    const NU = 80;
    const NV = 48;
    const shellGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array((NU + 1) * (NV + 1) * 3);
    const sUv = new Float32Array((NU + 1) * (NV + 1) * 2);
    const sIdx = [];
    for (let i = 0; i <= NU; i++)
      for (let j = 0; j <= NV; j++) {
        const k = i * (NV + 1) + j;
        sUv[k * 2] = i / NU;
        sUv[k * 2 + 1] = j / NV;
        if (i < NU && j < NV) {
          const a = k;
          const b = k + NV + 1;
          sIdx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    shellGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    shellGeo.setAttribute("uv", new THREE.BufferAttribute(sUv, 2));
    shellGeo.setIndex(sIdx);
    const ridge = u => {
      let r = 0;
      BANDS.forEach((b, i) => {
        const d = u - b;
        if (i > 0) r += 0.05 * Math.exp(-((d + 0.014) * (d + 0.014)) / 0.0003) - 0.022 * Math.exp(-((d - 0.02) * (d - 0.02)) / 0.0004);
        else r -= 0.025 * Math.exp(-(d * d) / 0.0004);
      });
      return r;
    };
    const shellShape = c => {
      const la0 = lerp(1.14, Math.PI * 0.49, c);
      const laB = lerp(1.47, Math.PI * 0.49, c);
      const az0 = lerp(1.95, Math.PI, c);
      const zs = lerp(1.22, 1, c);
      const ys = lerp(0.98, 1, c);
      for (let i = 0; i <= NU; i++) {
        const u = (i / NU) * 2 - 1;
        const la = u * (u < 0 ? laB : la0);
        const rr = R * (1 + ridge(u));
        for (let j = 0; j <= NV; j++) {
          const v = (j / NV) * 2 - 1;
          const az = v * az0;
          const flare = 1 + 0.06 * Math.pow(Math.abs(v), 6) * (1 - c);
          const k = (i * (NV + 1) + j) * 3;
          sPos[k] = rr * Math.cos(la) * Math.sin(az) * flare;
          sPos[k + 1] = rr * Math.cos(la) * Math.cos(az) * ys;
          sPos[k + 2] = rr * Math.sin(la) * zs * (1 + 0.04 * Math.pow(Math.abs(u), 6) * (1 - c));
        }
      }
      shellGeo.attributes.position.needsUpdate = true;
      shellGeo.computeVertexNormals();
      shellGeo.computeBoundingSphere();
    };
    shellShape(0);

    const ballG = new THREE.Group();
    bodyG.add(ballG);
    const shell = mesh(shellGeo, shellMat);
    shell.frustumCulled = false;
    ballG.add(shell);
    const rimMatE = new THREE.MeshStandardMaterial({ color: 0x8a6234, roughness: 0.55, metalness: 0.1 });
    const rims = [NU].map(i => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), rimMatE);
      m.castShadow = true;
      m.frustumCulled = false;
      m.userData.row = i;
      return m;
    });
    const buildRims = () => {
      rims.forEach(m => {
        const i = m.userData.row;
        const pts = [];
        for (let j = 0; j <= NV; j += 2) {
          const k = (i * (NV + 1) + j) * 3;
          pts.push(V3(sPos[k], sPos[k + 1], sPos[k + 2]));
        }
        m.geometry.dispose();
        m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.032, 8, false);
      });
    };
    const shellIn = new THREE.Mesh(shellGeo, innerMat);
    shellIn.frustumCulled = false;
    shellIn.scale.setScalar(0.975);
    ballG.add(shellIn);
    rims.forEach(m => ballG.add(m));
    buildRims();

    const bellyGeo = new THREE.SphereGeometry(1, 48, 32);
    const bp = bellyGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i);
      const y = bp.getY(i);
      const z = bp.getZ(i);
      const back = Math.max(0, -z);
      bp.setXYZ(i, x * (0.55 - 0.05 * back), y * 0.44, z * (z < 0 ? 0.66 : 0.82));
    }
    bellyGeo.computeVertexNormals();
    const belly = mesh(bellyGeo, bellyMat);
    belly.position.y = -0.07;
    ballG.add(belly);

    const headPivot = new THREE.Group();
    ballG.add(headPivot);
    const head = new THREE.Group();
    headPivot.add(head);
    const skull = mesh(new THREE.SphereGeometry(0.31, 36, 26), skinMat);
    skull.scale.set(1.05, 0.9, 1);
    head.add(skull);
    const snoutGeo = new THREE.LatheGeometry([V2(0.2, -0.04), V2(0.18, 0.04), V2(0.13, 0.16), V2(0.09, 0.28), V2(0.06, 0.33), V2(0.0001, 0.34)], 28);
    snoutGeo.rotateX(Math.PI / 2);
    const snout = mesh(snoutGeo, skinMat);
    snout.scale.set(1, 0.8, 1);
    snout.position.set(0, -0.09, 0.17);
    snout.rotation.x = 0.2;
    head.add(snout);
    const nose = mesh(new THREE.SphereGeometry(0.068, 20, 14), pinkMat, false);
    nose.scale.set(1.2, 0.85, 0.6);
    nose.position.set(0, 0, 0.34);
    snout.add(nose);
    [-1, 1].forEach(s => {
      const n = mesh(new THREE.SphereGeometry(0.016, 10, 8), darkMat, false);
      n.position.set(0.028 * s, 0, 0.04);
      nose.add(n);
    });

    const helmetMat = plateMat.clone();
    helmetMat.side = THREE.DoubleSide;
    const helmet = mesh(new THREE.SphereGeometry(0.325, 36, 18, 0, TAU, 0, 0.85), helmetMat);
    helmet.scale.set(0.9, 0.9, 1.06);
    helmet.rotation.x = -0.3;
    helmet.position.set(0, 0.025, -0.015);
    head.add(helmet);
    const ears = [-1, 1].map(s => {
      const eg = new THREE.Group();
      eg.position.set(0.26 * s, 0.05, -0.07);
      eg.rotation.set(-0.1, 0.55 * s, -1.15 * s);
      head.add(eg);
      const outer = mesh(new THREE.SphereGeometry(0.08, 18, 12, 0, TAU, 0, Math.PI * 0.55), skinMat);
      outer.scale.set(1, 1.35, 0.5);
      outer.rotation.x = -Math.PI / 2;
      eg.add(outer);
      const inner = mesh(new THREE.SphereGeometry(0.056, 16, 10, 0, TAU, 0, Math.PI * 0.5), pinkMat, false);
      inner.scale.set(1, 1.3, 0.35);
      inner.rotation.x = -Math.PI / 2;
      inner.position.z = 0.012;
      eg.add(inner);
      return eg;
    });
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.54, whiteColor: 0xfffaf2, pupilColor: 0x221a16 });
      e.g.position.set(0.145 * s, 0.0, 0.235);
      e.g.rotation.y = 0.4 * s;
      head.add(e.g);
      return e;
    });
    const lids = [-1, 1].map(s => {
      const l = mesh(new THREE.SphereGeometry(0.132, 20, 10, 0, TAU, 0, Math.PI * 0.5), skinMat, false);
      l.scale.set(1, 1.08, 0.6);
      l.position.set(0.145 * s, 0.0, 0.232);
      l.rotation.set(-1.0, 0.4 * s, 0);
      head.add(l);
      return l;
    });
    const blushes = [-1, 1].map(s => {
      const b = mesh(new THREE.CircleGeometry(0.042, 18), new THREE.MeshStandardMaterial({ color: 0xe58a84, roughness: 0.8, transparent: true, opacity: 0.75 }), false);
      b.position.set(0.22 * s, -0.11, 0.19);
      b.lookAt(V3(0.22 * s, -0.11, 0.19).multiply(V3(2.2, 1, 2.4)));
      head.add(b);
      return b;
    });
    const mouth = mesh(new THREE.TorusGeometry(0.034, 0.009, 6, 14, Math.PI), darkMat, false);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.215, 0.23);
    head.add(mouth);

    const tailPivot = new THREE.Group();
    ballG.add(tailPivot);
    const keratin = new THREE.MeshStandardMaterial({ color: 0x5e4024, roughness: 0.4, metalness: 0.1 });
    const NS = 56;
    const NC = 28;
    const tailGeo = new THREE.BufferGeometry();
    const tPos = new Float32Array(((NS + 1) * (NC + 1) + 1) * 3);
    const tUv = new Float32Array(((NS + 1) * (NC + 1) + 1) * 2);
    const tIdx = [];
    for (let i = 0; i <= NS; i++)
      for (let j = 0; j <= NC; j++) {
        const k = i * (NC + 1) + j;
        tUv[k * 2] = (j / NC) * 3;
        tUv[k * 2 + 1] = (i / NS) * 4;
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
    const tipFrame = new THREE.Group();
    tailPivot.add(tipFrame);
    const tailRoot = mesh(new THREE.SphereGeometry(0.14, 24, 16), plateMat);
    tailRoot.scale.set(1, 0.95, 1.25);
    tailRoot.position.z = 0.06;
    tailPivot.add(tailRoot);
    const teeth = [-1, 0, 1].map(k => {
      const tooth = mesh(new THREE.ConeGeometry(0.026, 0.075, 10), keratin, false);
      tooth.rotation.x = -Math.PI / 2;
      tooth.scale.set(1, 1, 0.6);
      tooth.position.set(k * 0.085, -0.012, -0.02);
      tipFrame.add(tooth);
      return tooth;
    });
    const scoopDirt = [];
    for (let k = 0; k < 5; k++) {
      const m = mesh(new THREE.DodecahedronGeometry(0.026 + (k % 3) * 0.01), mat(0x8a6440, 1), false);
      m.position.set(-0.06 + (k % 3) * 0.06, -0.04 - (k > 2 ? 0.02 : 0), 0.09 + 0.02 * (k % 2));
      m.visible = false;
      tipFrame.add(m);
      scoopDirt.push(m);
    }
    const TL = 0.66;
    const SPLIT = 0.5;
    const tP = V3();
    const tailShape = (th0, bend, hook) => {
      let px = 0;
      let py = 0;
      let pz = 0;
      const ds = TL / NS;
      let th = th0;
      for (let i = 0; i <= NS; i++) {
        const sN = i / NS;
        th = lerp(-0.15, th0, smooth(0, 0.22, sN)) + bend * Math.min(sN, SPLIT) / SPLIT + hook * smooth(SPLIT - 0.08, 1, sN);
        const ty = Math.sin(th);
        const tz = -Math.cos(th);
        const ny = Math.cos(th);
        const nz = Math.sin(th);
        const m = smooth(SPLIT - 0.06, SPLIT + 0.26, sN);
        const ring = 0.006 * Math.max(0, Math.sin(sN * Math.PI * 13)) * (1 - m);
        const r = lerp(0.135, 0.06, Math.pow(Math.min(1, sN / SPLIT), 0.7)) + ring;
        const end = smooth(0.9, 1, sN);
        const w = lerp(r, 0.19, m) * (1 - 0.18 * end);
        const h = lerp(r, 0.08, m) * (1 - 0.35 * end);
        const under = lerp(-1, 0.45, m);
        for (let j = 0; j <= NC; j++) {
          const a = (j / NC) * TAU;
          const x = w * Math.cos(a);
          const sa = Math.sin(a);
          const yy = sa >= 0 ? h * sa : under * h * -sa;
          const k = (i * (NC + 1) + j) * 3;
          tPos[k] = x;
          tPos[k + 1] = py + yy * ny;
          tPos[k + 2] = pz + yy * nz;
        }
        if (i === NS) {
          tipFrame.position.set(0, py + h * 0.5 * (1 + under) * 0.5 * ny, pz + h * 0.5 * (1 + under) * 0.5 * nz);
          tipFrame.rotation.set(th, 0, 0);
          const c = capI * 3;
          tPos[c] = 0;
          tPos[c + 1] = py + ny * h * (1 + under) * 0.25;
          tPos[c + 2] = pz + nz * h * (1 + under) * 0.25;
        }
        if (i < NS) {
          py += ty * ds;
          pz += tz * ds;
        }
      }
      tailGeo.attributes.position.needsUpdate = true;
      tailGeo.computeVertexNormals();
    };
    const rearPlate = mesh(new THREE.SphereGeometry(0.26, 28, 12, 0, TAU, 0, 0.75), plateMat);
    rearPlate.rotation.x = -Math.PI / 2;
    rearPlate.scale.set(1, 0.55, 1);
    rearPlate.position.set(0, 0, -R * 0.88);
    rearPlate.visible = false;
    ballG.add(rearPlate);

    const legs = [];
    [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1]
    ].forEach(([sx, sz]) => {
      const lg = new THREE.Group();
      lg.position.set(0.33 * sx, 0.24, sz > 0 ? 0.3 : -0.34);
      bodyG.add(lg);
      const thigh = mesh(new THREE.SphereGeometry(0.12, 18, 14), skinMat);
      thigh.scale.set(0.9, 1.15, 1);
      thigh.position.y = -0.04;
      lg.add(thigh);
      const foot = mesh(new THREE.SphereGeometry(0.095, 18, 12), skinMat);
      foot.scale.set(1, 0.55, sz > 0 ? 1.15 : 1.4);
      foot.position.set(0, -0.18, 0.04);
      lg.add(foot);
      const n = sz > 0 ? 3 : 4;
      for (let c = 0; c < n; c++) {
        const big = sz > 0 && c === 1;
        const cl = mesh(new THREE.ConeGeometry(big ? 0.034 : 0.022, big ? 0.16 : 0.09, 4), steelMat, false);
        cl.rotation.set(Math.PI / 2 + 0.55, Math.PI / 4, 0);
        cl.position.set((c - (n - 1) / 2) * 0.05, -0.2, 0.13 + (big ? 0.03 : 0));
        lg.add(cl);
      }
      legs.push({ lg, sx, sz });
    });

    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 1 });
    const dirt = [];
    for (let k = 0; k < 16; k++) {
      const m = mesh(new THREE.DodecahedronGeometry(0.035 + (k % 3) * 0.015), dirtMat, false);
      m.visible = false;
      root.add(m);
      dirt.push({ m, k, a: (k / 16) * 1.6 - 0.8, sp: 0.7 + (k % 4) * 0.22 });
    }
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xd9c8a8, transparent: true, opacity: 0.4, depthWrite: false });
    const dust = [];
    for (let k = 0; k < 8; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), dustMat);
      m.visible = false;
      root.add(m);
      dust.push({ m, a: (k / 8) * TAU });
    }
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.9, depthWrite: false });
    const sparks = [];
    for (let k = 0; k < 10; k++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), sparkMat);
      m.visible = false;
      root.add(m);
      sparks.push({ m, a: (k / 10) * TAU, h: 0.2 + (k % 3) * 0.25 });
    }

    const food = berry();
    food.visible = false;
    root.add(food);

    let lastCurl = 0;
    const C0 = 0.52;

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;

        let curl = 0;
        let y = 0;
        let z = 0;
        let rollA = 0;
        let spinA = 0;
        let sy = 1 + Math.sin(t * 1.6) * 0.012 * motion;
        let headPitch = 0;
        let headYaw = 0;
        let earK = 0;
        let impact = 0;
        let pawDig = 0;
        let sparkK = 0;
        let airborne = false;
        let peek = 0;
        let baseA = -0.32 + Math.sin(t * 1.1) * 0.05 * motion;
        let bendA = 0.5 + Math.sin(t * 1.4 + 1) * 0.06 * motion;
        let bucketA = -1.75 + Math.sin(t * 1.7 + 2) * 0.1 * motion;
        let tailYaw = Math.sin(t * 0.9) * 0.1 * motion;
        let load = 0;
        let fling = -1;

        if (nm === "jump") {
          if (p < 0.2) sy = 1 - 0.14 * Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.78) {
            const q = (p - 0.2) / 0.58;
            y = Math.sin(q * Math.PI) * 0.7;
            sy = 1 + 0.06 * Math.cos(q * Math.PI);
            airborne = true;
            earK = 1;
            baseA += Math.sin(q * Math.PI) * 0.5;
            bendA += Math.sin(q * Math.PI) * 0.2;
          } else {
            const q = (p - 0.78) / 0.22;
            sy = 1 - 0.12 * Math.sin(q * Math.PI);
            impact = Math.sin(q * Math.PI) * 0.6;
          }
        } else if (nm === "curl") {
          curl = smooth(0.02, 0.18, p) * (1 - smooth(0.82, 0.97, p));
          const w = smooth(0.18, 0.3, p) * (1 - smooth(0.42, 0.5, p));
          rollA = Math.sin(t * 9) * 0.12 * w;
          peek = smooth(0.48, 0.56, p) * (1 - smooth(0.68, 0.76, p));
          curl -= peek * 0.28;
        } else if (nm === "roll" || nm === "spin") {
          curl = smooth(0, 0.14, p) * (1 - smooth(0.86, 0.98, p));
          if (nm === "roll") {
            const q = smooth(0.12, 0.88, p);
            z = Math.sin(q * TAU) * 0.9;
            rollA = z / R + q * TAU;
            y = Math.abs(Math.sin(q * TAU * 2)) * 0.03;
            if (p > 0.86) impact = Math.sin(((p - 0.86) / 0.14) * Math.PI) * 0.5;
          } else {
            const q = smooth(0.12, 0.62, p);
            spinA = q * q * TAU * 5;
            sparkK = smooth(0.25, 0.4, p) * (1 - smooth(0.62, 0.7, p));
            const lunge = smooth(0.6, 0.7, p) * (1 - smooth(0.74, 0.92, p));
            z = lunge * 1.0;
            rollA = lunge * 3;
            y = sparkK * 0.06 * Math.abs(Math.sin(t * 30));
            if (p > 0.62 && p < 0.8) impact = Math.sin(((p - 0.62) / 0.18) * Math.PI);
          }
        } else if (nm === "dig") {
          const k = smooth(0.0, 0.1, p) * (1 - smooth(0.9, 1, p));
          headPitch = 0.3 * k;
          sy -= 0.04 * k;
          if (p < 0.5) {
            pawDig = smooth(0.05, 0.12, p) * (1 - smooth(0.42, 0.5, p));
          }
          const reach = smooth(0.4, 0.55, p) * (1 - smooth(0.62, 0.72, p));
          const lift = smooth(0.62, 0.76, p) * (1 - smooth(0.86, 0.96, p));
          baseA = lerp(baseA, -0.75, reach) + lift * 0.9;
          bendA = lerp(bendA, 0.1, reach) + lift * 0.5;
          bucketA = lerp(bucketA, -0.7, reach) + lift * -1.0;
          load = p > 0.6 && p < 0.88 ? 1 : 0;
          if (p > 0.84 && p < 0.97) fling = (p - 0.84) / 0.13;
          if (p > 0.58 && p < 0.66) impact = Math.sin(((p - 0.58) / 0.08) * Math.PI) * 0.6;
        } else if (nm === "sniff") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.85, 1, p));
          headYaw = Math.sin(p * Math.PI * 4) * 0.45 * k;
          headPitch = -0.12 * k + Math.sin(t * 22) * 0.025 * k;
          earK = k * Math.abs(Math.sin(p * Math.PI * 6));
          tailYaw += Math.sin(p * Math.PI * 4) * 0.35 * k;
        } else if (nm === "eat") {
          headPitch = 0.15 * smooth(0.25, 0.35, p) * (1 - smooth(0.85, 0.95, p));
        }

        curl = Math.max(0, Math.min(1, curl));
        if (Math.abs(curl - lastCurl) > 0.0005) {
          shellShape(curl);
          lastCurl = curl;
          rims.forEach(m => (m.visible = curl < 0.9));
          if (curl < 0.9) buildRims();
        }

        const zs = lerp(1.22, 1, curl);
        const cy = lerp(C0, R + 0.01, curl);
        bodyG.position.set(0, y, z);
        bodyG.rotation.y = spinA;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch * (1 - curl);
        const sx = 1 / Math.sqrt(sy);
        ballG.scale.set(sx, sy, sx);
        ballG.position.set(0, cy, 0);
        ballG.rotation.x = rollA + (1 - curl) * Math.sin(t * 1.3) * 0.015 * motion;

        headPivot.position.set(0, lerp(-0.04, 0, curl), lerp(0.68, R * 0.76, curl));
        headPivot.rotation.set(1.5 * smooth(0.35, 1, curl), 0, 0);
        head.scale.setScalar(lerp(1, 0.7, curl));
        const tucked = curl < 0.82;
        [skull, snout, mouth, ...ears, ...eyes.map(e => e.g), ...lids, ...blushes].forEach(o => (o.visible = tucked));
        head.rotation.set(headPitch + (airborne ? -0.15 : 0) + pawDig * Math.sin(t * 14) * 0.06, headYaw, 0);

        tailPivot.position.set(0, -0.02, lerp(-0.62 * zs, -R * 0.9, curl));
        const cK = smooth(0, 0.7, curl);
        tailPivot.rotation.set(0, tailYaw * (1 - cK), 0);
        if (tailPivot.visible || curl < 0.78) tailShape(lerp(baseA, 1.2, cK), lerp(bendA, 1.2, cK), lerp(bucketA, 0.8, cK));
        tailPivot.scale.setScalar(lerp(1, 0.5, cK));
        tailPivot.visible = curl < 0.78;
        rearPlate.visible = curl >= 0.78;

        scoopDirt.forEach(m => (m.visible = load > 0));

        belly.scale.set(lerp(1, 0.86, curl), lerp(1, 0.8, curl), lerp(1, 0.6, curl));
        belly.position.y = lerp(-0.07, 0, curl);

        legs.forEach(({ lg, sx: lx, sz }) => {
          const tuck = 1 - curl;
          lg.scale.set(1, Math.max(0.001, tuck), 1);
          lg.position.y = lerp(0.4, 0.24, tuck);
          let swing = 0;
          if (pawDig > 0 && sz > 0) swing = Math.sin(t * 16 + (lx > 0 ? Math.PI : 0)) * 0.7 * pawDig;
          if (airborne) swing = -0.4 * sz;
          lg.rotation.x = swing + (pawDig > 0 && sz > 0 ? -0.3 * pawDig : 0);
          lg.visible = tuck > 0.02;
        });

        ears.forEach((e, i) => {
          const s2 = i ? 1 : -1;
          e.rotation.z = -1.15 * s2 + Math.sin(t * 9 + i) * 0.18 * earK - (airborne ? 0.3 * s2 : 0);
        });
        const shut = Math.max(curl > 0.5 ? 1 : 0, nm === "eat" && p > 0.35 && p < 0.85 ? 0.65 : 0, pawDig * 0.4);
        eyes.forEach(({ g }) => {
          g.scale.y = lerp(blink, 0.08, shut);
        });
        lids.forEach(l => {
          l.rotation.x = lerp(-1.0, -0.2, Math.max(shut, 1 - blink) * 0.95);
        });
        followPupils(eyes, peek > 0.2 ? { x: Math.sin(t * 3), y: -0.3 } : pointer, 0.7);
        mouth.scale.set(1, nm === "eat" && ph && ph.chew ? 0.4 + ph.chew * 0.8 : 1, 1);

        const fx = impact > 0.05;
        dust.forEach(d => {
          d.m.visible = fx;
          if (!fx) return;
          const u = 1 - impact;
          const r = 0.7 + u * 0.5;
          d.m.position.set(Math.cos(d.a) * r, 0.1 + u * 0.15, z + Math.sin(d.a) * r - (nm === "dig" ? 0.9 : 0));
          d.m.scale.setScalar(0.6 + u * 0.8);
          dustMat.opacity = 0.45 * impact;
        });
        dirt.forEach(d => {
          const front = pawDig > 0.2;
          const thrown = fling >= 0;
          d.m.visible = front || thrown;
          if (!d.m.visible) return;
          if (thrown) {
            const q = Math.min(1, fling * (0.8 + (d.k % 4) * 0.1));
            d.m.position.set(d.a * 0.5 * q, 1.2 + Math.sin(q * Math.PI) * 0.6 - q * 0.9, -1.0 - q * 0.9);
          } else {
            const q = (t * d.sp * 1.6 + d.k * 0.37) % 1;
            d.m.position.set(d.a * 0.6, 0.1 + Math.sin(q * Math.PI) * 0.7, 0.6 - q * 1.8);
          }
          d.m.rotation.set(t * 5 + d.k, t * 4, 0);
        });
        sparks.forEach((sp, i) => {
          sp.m.visible = sparkK > 0.05;
          if (!sp.m.visible) return;
          const a = sp.a + t * 9;
          const r = 0.7 + Math.sin(t * 20 + i) * 0.08;
          sp.m.position.set(Math.cos(a) * r, sp.h, z + Math.sin(a) * r);
          sp.m.scale.setScalar(sparkK * (0.6 + Math.abs(Math.sin(t * 25 + i)) * 0.8));
        });

        if (nm === "eat" && ph) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.0, 0.28, ph.fall * ph.fall), 1.2);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.75);
        } else food.visible = false;
      }
    };
  }
});
