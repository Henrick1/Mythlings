Pets.register({
  id: "tatubola",
  dex: 41,
  name: "Tatubola",
  color: "#c8923e",
  types: ["ground", "steel"],
  stage: 2,
  evolvesTo: "escavatatu",
  evolveLevel: 36,
  description: "Já passa a maior parte do tempo sentado nas patas de trás, com as garras da frente sempre prontas para cavar. O corpo ficou redondo como uma bola, e quando se assusta encolhe a cabeça, os braços e as pernas e fecha o casco por inteiro, saindo rolando ladeira abaixo. As cintas de aço seguram as placas no lugar mesmo nas pancadas mais fortes.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    curl: { duration: 2.8 },
    roll: { duration: 2.3 },
    drift: { duration: 3.0 },
    dig: { duration: 2.6 },
    sniff: { duration: 1.9 },
    spin: { duration: 2.2 }
  },
  battle: { attack: { action: "roll", hit: 0.48, speed: 1.0 }, special: { action: "drift", hit: 0.62, speed: 1.0 } },
  idle: [
    { action: "sniff", min: 12, max: 30 },
    { action: "drift", min: 30, max: 60 },
    { action: "dig", min: 30, max: 70 },
    { action: "curl", min: 40, max: 80 }
  ],
  clickAction: n => ["curl", "drift", "sniff", "roll", "dig", "spin"][(n - 1) % 6],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const TAU = Math.PI * 2;

    const root = new THREE.Group();
    const big = new THREE.Group();
    big.scale.setScalar(1.0);
    root.add(big);
    const bodyG = new THREE.Group();
    big.add(bodyG);
    const HIP = 0.48;
    const upper = new THREE.Group();
    upper.position.y = HIP;
    bodyG.add(upper);

    const BANDS = [-0.13, -0.01, 0.11, 0.23];
    const hasDoc = typeof document !== "undefined";

    const hexPath = (g, cx, cy, rr) => {
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath();
    };
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const scute = (g, cx, cy, r) => {
      const v = rnd();
      hexPath(g, cx, cy, r * 0.86);
      const gr = g.createRadialGradient(cx - r * 0.18, cy - r * 0.22, r * 0.05, cx, cy, r * 0.9);
      gr.addColorStop(0, v > 0.5 ? "#f0cf8c" : "#e9c27e");
      gr.addColorStop(0.55, v > 0.5 ? "#c9954f" : "#c08945");
      gr.addColorStop(1, "#8a5a28");
      g.fillStyle = gr;
      g.fill();
      g.lineWidth = r * 0.07;
      g.strokeStyle = "rgba(255,236,190,0.35)";
      hexPath(g, cx, cy, r * 0.62);
      g.stroke();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + Math.PI / 6 + 0.5;
        g.beginPath();
        g.arc(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72, r * 0.035, 0, TAU);
        g.fillStyle = "rgba(60,36,16,0.6)";
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
      g.fillStyle = "#3e2812";
      g.fillRect(0, 0, W, H);
      const ux = u => ((u + 1) / 2) * W;
      const shield = (x0, x1) => {
        g.save();
        g.beginPath();
        g.rect(x0, 0, x1 - x0, H);
        g.clip();
        const r = 512 / 6 / 1.5;
        for (let row = -1; row * r * 1.5 < H + r; row++)
          for (let col = -1; col * r * 1.732 < W + r; col++) scute(g, col * r * 1.732 + (row % 2 ? r * 0.866 : 0), row * r * 1.5, r);
        g.restore();
      };
      shield(0, ux(BANDS[0]));
      shield(ux(BANDS[3]), W);
      for (let b = 0; b < 3; b++) {
        const x0 = ux(BANDS[b]);
        const x1 = ux(BANDS[b + 1]);
        if (b === 1) {
          const gr = g.createLinearGradient(x0, 0, x1, 0);
          gr.addColorStop(0, "#4c535c");
          gr.addColorStop(0.5, "#98a2ad");
          gr.addColorStop(1, "#c0c8d0");
          g.fillStyle = gr;
          g.fillRect(x0, 0, x1 - x0, H);
          g.save();
          g.beginPath();
          g.rect(x0 + 9, 0, x1 - x0 - 18, H);
          g.clip();
          g.fillStyle = "#f2b705";
          g.fillRect(x0, 0, x1 - x0, H);
          g.fillStyle = "#1d1d1f";
          for (let y = -64; y < H + 64; y += 32) {
            g.beginPath();
            g.moveTo(x0, y);
            g.lineTo(x0, y + 16);
            g.lineTo(x1, y + 48);
            g.lineTo(x1, y + 32);
            g.closePath();
            g.fill();
          }
          g.restore();
        } else {
          const gr = g.createLinearGradient(x0, 0, x1, 0);
          gr.addColorStop(0, "#222326");
          gr.addColorStop(0.5, "#3a3c40");
          gr.addColorStop(1, "#26282b");
          g.fillStyle = gr;
          g.fillRect(x0, 0, x1 - x0, H);
          g.strokeStyle = "#121315";
          g.lineWidth = 6;
          for (let y = -32; y < H + 32; y += 32) {
            g.beginPath();
            g.moveTo(x0 + 8, y);
            g.lineTo((x0 + x1) / 2, y + 14);
            g.lineTo(x1 - 8, y);
            g.stroke();
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
      for (let row = -1; row <= rows; row++)
        for (let col = -1; col <= cols; col++) scute(g, col * r * Math.sqrt(3) + (row % 2 ? (r * Math.sqrt(3)) / 2 : 0), row * r * 1.5, r);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      return t;
    })();

    const bellyTex = (() => {
      if (!hasDoc) return null;
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "#ecc29c";
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

    const shellMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: shellTex, roughness: 0.55, metalness: 0.15 });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: plateTex, roughness: 0.55, metalness: 0.1 });
    const plateMat2 = plateMat.clone();
    plateMat2.side = THREE.DoubleSide;
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x3a2814, roughness: 0.9, side: THREE.BackSide });
    const skinMat = mat(0xc08a64, 0.72);
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: bellyTex, roughness: 0.8 });
    const noseMat = mat(0x9c5a50, 0.5);
    const keratin = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.35, metalness: 0.15 });
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
      const S = 40;
      for (let i = 0; i <= S; i++) {
        const th = 1.3 * (1 - i / S);
        const q = ((1.3 - th) / 1.3) * n;
        const fr = q - Math.floor(q);
        const lip = i < S ? 1 + 0.06 * Math.pow(1 - fr, 2) * (1 - (i / S) * 0.5) : 1;
        pts.push(V2(Math.max(0.0001, R * Math.sin(th) * lip), R * Math.cos(th)));
      }
      const g = new THREE.LatheGeometry(pts, 40);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) / R) * k + 0.5, (p.getZ(i) / R) * k + 0.5);
      return g;
    };
    const domeWithRim = (R, n, k, tr) => {
      const d = mesh(lameDome(R, n, k), plateMat2);
      const rim = mesh(new THREE.TorusGeometry(R * Math.sin(1.3) * 1.06, tr, 8, 40), rimMat, false);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = R * Math.cos(1.3);
      d.add(rim);
      return d;
    };
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

    const TC = V3(0, 0.45, -0.02);
    const TR = V3(0.6, 0.62, 0.56);
    const torso = mesh(new THREE.SphereGeometry(1, 56, 40), skinMat);
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
        const k = 1 + 0.045 * Math.pow(Math.max(0, Math.sin(ph * 6 + 0.4)), 0.6) * Math.max(0, z);
        bp.setXYZ(i, bp.getX(i) * k, y, z * k);
      }
      bellyGeo.computeVertexNormals();
    }
    const belly = mesh(bellyGeo, bellyMat);
    upper.add(belly);

    const NU = 64;
    const NV = 56;
    const LT = Math.PI / 2 - 0.015;
    const sPos = new Float32Array((NU + 1) * (NV + 1) * 3);
    const sUv = new Float32Array((NU + 1) * (NV + 1) * 2);
    const sIdx = [];
    for (let i = 0; i <= NU; i++)
      for (let j = 0; j <= NV; j++) {
        const k = i * (NV + 1) + j;
        sUv[k * 2] = i / NU;
        sUv[k * 2 + 1] = j / NV;
        if (i < NU && j < NV) sIdx.push(k, k + NV + 1, k + 1, k + NV + 1, k + NV + 2, k + 1);
      }
    const shellGeo = new THREE.BufferGeometry();
    shellGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    shellGeo.setAttribute("uv", new THREE.BufferAttribute(sUv, 2));
    shellGeo.setIndex(sIdx);
    const ridge = u => {
      let r = 0;
      BANDS.forEach((b, i) => {
        const d = u - b;
        if (i > 0) r += 0.035 * Math.exp(-((d + 0.012) * (d + 0.012)) / 0.00025) - 0.015 * Math.exp(-((d - 0.018) * (d - 0.018)) / 0.0003);
        else r -= 0.018 * Math.exp(-(d * d) / 0.0003);
      });
      return r;
    };
    const azOpen = u => lerp(2.05, 1.62, smooth(-0.1, 0.5, u));
    const buildShell = c => {
      const LB = lerp(1.0, Math.PI / 2 - 0.015, c);
      for (let i = 0; i <= NU; i++) {
        const u = (i / NU) * 2 - 1;
        const la = u * (u < 0 ? LB : LT);
        const AZ = lerp(azOpen(u), Math.PI - 0.004, c);
        for (let j = 0; j <= NV; j++) {
          const v = (j / NV) * 2 - 1;
          const az = v * AZ;
          const e = Math.min((1 - Math.abs(v)) * AZ * 1.1, 1 - u, (1 + u) * 1.4);
          const w = lerp(0.3 + 0.7 * smooth(-0.35, 0.85, Math.cos(az)), 1, c);
          const rk = (1.03 + 0.14 * w * smooth(0, lerp(0.45, 0.05, c), e)) * (1 + ridge(u) * smooth(0, 0.1, e));
          const k = i * (NV + 1) + j;
          sPos[k * 3] = TR.x * rk * Math.cos(la) * Math.sin(az);
          sPos[k * 3 + 1] = TC.y + TR.y * rk * Math.sin(la);
          sPos[k * 3 + 2] = TC.z - TR.z * rk * Math.cos(la) * Math.cos(az);
        }
      }
      shellGeo.attributes.position.needsUpdate = true;
      shellGeo.computeVertexNormals();
      shellGeo.computeBoundingSphere();
    };
    const sN = () => shellGeo.attributes.normal;
    const at = (i, j, off = 0) => {
      const k = i * (NV + 1) + j;
      const n = sN();
      return V3(sPos[k * 3] + n.getX(k) * off, sPos[k * 3 + 1] + n.getY(k) * off, sPos[k * 3 + 2] + n.getZ(k) * off);
    };
    const nAt = (i, j) => {
      const k = i * (NV + 1) + j;
      const n = sN();
      return V3(n.getX(k), n.getY(k), n.getZ(k)).normalize();
    };
    upper.add(mesh(shellGeo, shellMat));
    const shellIn = new THREE.Mesh(shellGeo, innerMat);
    shellIn.scale.setScalar(0.985);
    shellIn.position.copy(TC).multiplyScalar(0.015);
    upper.add(shellIn);

    const edgeG = new THREE.Group();
    upper.add(edgeG);
    const capGeo = new THREE.SphereGeometry(0.04, 12, 10);
    const ribCapGeo = new THREE.SphereGeometry(0.026, 12, 10);
    const buildEdges = () => {
      edgeG.children.slice().forEach(m => {
        edgeG.remove(m);
        if (m.geometry !== capGeo && m.geometry !== ribCapGeo) m.geometry.dispose();
      });
      const tube = (pts, r, m) => {
        const t = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(24, pts.length * 2), r, 10, false), m);
        edgeG.add(t);
      };
      const col = j => {
        const p = [];
        for (let i = 0; i <= NU; i += 2) p.push(at(i, j));
        return p;
      };
      const row = (i, off) => {
        const p = [];
        for (let j = 0; j <= NV; j += 2) p.push(at(i, j, off));
        return p;
      };
      tube(col(0), 0.04, rimMat);
      tube(col(NV), 0.04, rimMat);
      tube(row(0, 0), 0.04, rimMat);
      [0, NV].forEach(j => {
        const c = mesh(capGeo, rimMat, false);
        c.position.copy(at(0, j));
        edgeG.add(c);
      });
      const crown = mesh(capGeo, rimMat, false);
      crown.position.copy(at(NU, NV / 2));
      edgeG.add(crown);
      BANDS.forEach(b => {
        const i = Math.round(((b + 1) / 2) * NU);
        const p = row(i, 0.01);
        tube(p, 0.026, ribMat);
        [p[0], p[p.length - 1]].forEach(q => {
          const c = mesh(ribCapGeo, ribMat, false);
          c.position.copy(q);
          edgeG.add(c);
        });
      });
    };

    const UPV = V3(0, 1, 0);
    const knobGeo = new THREE.LatheGeometry([V2(0.06, -0.025), V2(0.062, 0.008), V2(0.054, 0.034), V2(0.038, 0.054), V2(0.018, 0.068), V2(0.0001, 0.072)], 16);
    const knobs = [];
    for (let i = 6; i <= NU - 6; i += 6) {
      const u = (i / NU) * 2 - 1;
      if (u > BANDS[0] - 0.06 && u < BANDS[3] + 0.06) continue;
      if (u > 0.8) continue;
      [NV / 2 - 8, NV / 2, NV / 2 + 8].forEach((j, n) => {
        const m = mesh(knobGeo, knobMat, n === 1);
        if (n !== 1) m.scale.setScalar(0.75);
        upper.add(m);
        knobs.push({ m, i, j });
      });
    }
    let shellC = -1;
    const setShell = c => {
      if (Math.abs(c - shellC) < 0.002) return;
      shellC = c;
      buildShell(c);
      buildEdges();
      knobs.forEach(({ m, i, j }) => {
        m.position.copy(at(i, j));
        m.quaternion.setFromUnitVectors(UPV, nAt(i, j));
      });
    };

    const headPivot = new THREE.Group();
    upper.add(headPivot);
    const head = new THREE.Group();
    head.scale.setScalar(0.95);
    headPivot.add(head);
    const skull = mesh(new THREE.SphereGeometry(0.36, 40, 28), skinMat);
    skull.scale.set(1.05, 0.9, 1.02);
    head.add(skull);
    const snoutProfile = [V2(0.22, -0.05), V2(0.2, 0.06), V2(0.155, 0.2), V2(0.115, 0.31), V2(0.085, 0.38), V2(0.0001, 0.395)];
    const snoutGeo = new THREE.LatheGeometry(snoutProfile, 36);
    snoutGeo.rotateX(Math.PI / 2);
    const snout = mesh(snoutGeo, skinMat);
    snout.scale.set(1, 0.8, 1);
    snout.position.set(0, -0.1, 0.18);
    snout.rotation.x = 0.2;
    head.add(snout);
    const nose = mesh(new THREE.SphereGeometry(0.08, 20, 14), noseMat, false);
    nose.scale.set(1.25, 0.85, 0.6);
    nose.position.set(0, 0, 0.385);
    snout.add(nose);
    [-1, 1].forEach(s => {
      const n = mesh(new THREE.SphereGeometry(0.018, 10, 8), darkMat, false);
      n.position.set(0.032 * s, 0, 0.045);
      nose.add(n);
    });
    const HC = 1.05;
    const HT = -0.22;
    const helmetGeo = new THREE.SphereGeometry(0.36, 56, 24, 0, TAU, 0, HC);
    helmetGeo.rotateX(HT);
    capUv(helmetGeo, 0.36, 0.55);
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
    head.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hEdge, true), 128, 0.02, 8, true), rimMat));
    const plateProf = [];
    for (let k = 0; k <= 10; k++) {
      const y = 0.04 + k * 0.026;
      let x = 0;
      for (let q = 0; q < snoutProfile.length - 1; q++) {
        const A = snoutProfile[q];
        const B = snoutProfile[q + 1];
        if (y >= A.y && y <= B.y) x = lerp(A.x, B.x, (y - A.y) / (B.y - A.y));
      }
      plateProf.push(V2(x * 1.045, y));
    }
    const snoutPlateGeo = new THREE.LatheGeometry(plateProf, 32, Math.PI - 0.9, 1.8);
    snoutPlateGeo.rotateX(Math.PI / 2);
    {
      const pp = snoutPlateGeo.attributes.position;
      const uv = snoutPlateGeo.attributes.uv;
      for (let i = 0; i < pp.count; i++) uv.setXY(i, pp.getX(i) * 2.6, pp.getZ(i) * 2.6);
    }
    snout.add(mesh(snoutPlateGeo, plateMat2));
    const ears = [-1, 1].map(s => {
      const eg = new THREE.Group();
      eg.position.set(0.3 * s, 0.07, -0.17);
      eg.rotation.set(-0.35, 0.5 * s, -0.55 * s);
      head.add(eg);
      const outer = mesh(new THREE.SphereGeometry(0.1, 20, 14), skinMat);
      outer.scale.set(0.95, 1.5, 0.38);
      outer.position.y = 0.11;
      eg.add(outer);
      const inner = mesh(new THREE.SphereGeometry(0.07, 18, 12), noseMat, false);
      inner.scale.set(0.95, 1.45, 0.25);
      inner.position.set(0, 0.12, 0.024);
      eg.add(inner);
      return eg;
    });
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.5, whiteColor: 0xfffaf2, pupilColor: 0x1e1612 });
      e.g.position.set(0.17 * s, 0.03, 0.27);
      e.g.rotation.y = 0.42 * s;
      head.add(e.g);
      return e;
    });
    const lids = [-1, 1].map(s => {
      const l = mesh(new THREE.SphereGeometry(0.125, 20, 10, 0, TAU, 0, Math.PI * 0.5), skinMat, false);
      l.scale.set(1, 1.08, 0.62);
      l.position.set(0.17 * s, 0.03, 0.262);
      l.rotation.set(-0.8, 0.42 * s, 0);
      head.add(l);
      return l;
    });
    const mouth = mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 14, Math.PI), darkMat, false);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.24, 0.26);
    head.add(mouth);

    const arms = [-1, 1].map(sx => {
      const base = V3(0.5 * sx, TC.y + 0.22, 0.12);
      const sh = new THREE.Group();
      sh.position.copy(base);
      upper.add(sh);
      sh.add(mesh(new THREE.SphereGeometry(0.15, 20, 14), skinMat));
      const pg = new THREE.Group();
      pg.position.copy(base);
      upper.add(pg);
      const pauld = domeWithRim(0.2, 2, 0.45, 0.02);
      pauld.position.set(0.01 * sx, 0, 0);
      pauld.rotation.z = -0.5 * sx;
      pg.add(pauld);
      sh.add(mesh(new THREE.LatheGeometry([V2(0.0001, -0.31), V2(0.09, -0.3), V2(0.105, -0.25), V2(0.115, -0.15), V2(0.13, -0.05), V2(0.12, 0.02), V2(0.0001, 0.06)], 22), skinMat));
      const el = new THREE.Group();
      el.position.y = -0.28;
      sh.add(el);
      el.add(mesh(new THREE.SphereGeometry(0.1, 18, 12), skinMat));
      el.add(mesh(new THREE.LatheGeometry([V2(0.0001, -0.3), V2(0.1, -0.29), V2(0.13, -0.24), V2(0.135, -0.16), V2(0.12, -0.06), V2(0.1, 0.02), V2(0.0001, 0.05)], 22), skinMat));
      el.add(mesh(ringBand(0.142, -0.26, -0.08, 3), rimMat));
      const hand = new THREE.Group();
      hand.position.y = -0.3;
      el.add(hand);
      const palm = mesh(new THREE.SphereGeometry(0.12, 20, 14), skinMat);
      palm.scale.set(1, 0.75, 0.9);
      palm.position.y = -0.03;
      hand.add(palm);
      [-1, 0, 1].forEach(c => {
        const cg = new THREE.Group();
        cg.position.set(c * 0.068, -0.07, 0.04);
        cg.rotation.z = c * 0.16;
        hand.add(cg);
        cg.add(mesh(new THREE.SphereGeometry(c ? 0.036 : 0.044, 12, 10), keratin, false));
        cg.add(mesh(clawGeo(c ? 0.17 : 0.22, c ? 0.036 : 0.044, 0.32), keratin));
      });
      return { sh, el, hand, pg, palm, sx, base };
    });

    const legs = [-1, 1].map(sx => {
      const base = V3(0.27 * sx, HIP, 0.05);
      const hip = new THREE.Group();
      hip.position.copy(base);
      bodyG.add(hip);
      hip.add(mesh(new THREE.SphereGeometry(0.19, 22, 14), skinMat));
      hip.add(mesh(new THREE.LatheGeometry([V2(0.0001, -0.21), V2(0.13, -0.2), V2(0.16, -0.14), V2(0.18, -0.06), V2(0.185, 0.0), V2(0.0001, 0.05)], 24), skinMat));
      const knee = new THREE.Group();
      knee.position.y = -0.2;
      hip.add(knee);
      knee.add(mesh(new THREE.SphereGeometry(0.13, 18, 12), skinMat));
      const kcap = domeWithRim(0.135, 2, 0.35, 0.014);
      kcap.rotation.x = Math.PI / 2 - 0.15;
      kcap.position.set(0, 0.01, 0.02);
      knee.add(kcap);
      knee.add(mesh(new THREE.LatheGeometry([V2(0.0001, -0.21), V2(0.11, -0.2), V2(0.12, -0.12), V2(0.125, -0.04), V2(0.13, 0.0), V2(0.0001, 0.04)], 22), skinMat));
      knee.add(mesh(ringBand(0.132, -0.17, -0.05, 2), rimMat));
      const ankle = new THREE.Group();
      ankle.position.y = -0.2;
      knee.add(ankle);
      ankle.add(mesh(new THREE.SphereGeometry(0.11, 16, 12), skinMat));
      const foot = mesh(new THREE.SphereGeometry(0.15, 24, 16), skinMat);
      foot.scale.set(1.05, 0.55, 1.4);
      foot.position.set(0, -0.08, 0.06);
      ankle.add(foot);
      [-1, 0, 1].forEach(c => {
        const t = mesh(clawGeo(0.1, 0.03, 0.0), keratin, false);
        t.rotation.x = -Math.PI / 2 - 0.35;
        t.position.set(c * 0.075, -0.09, 0.25 - Math.abs(c) * 0.03);
        ankle.add(t);
      });
      return { hip, knee, ankle, sx, base };
    });
    const L1 = 0.2;
    const L2 = 0.2;
    const FH = 0.08;

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, TC.y - 0.42, -0.38);
    upper.add(tailPivot);
    const NS = 56;
    const NC = 26;
    const tailGeo = new THREE.BufferGeometry();
    const tPos = new Float32Array(((NS + 1) * (NC + 1) + 1) * 3);
    const tUv = new Float32Array(((NS + 1) * (NC + 1) + 1) * 2);
    const tIdx = [];
    for (let i = 0; i <= NS; i++)
      for (let j = 0; j <= NC; j++) {
        const k = i * (NC + 1) + j;
        tUv[k * 2] = (j / NC) * 1.1;
        tUv[k * 2 + 1] = (i / NS) * 1.4;
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
    const tailRoot = mesh(new THREE.SphereGeometry(0.145, 22, 16), plateMat);
    tailRoot.scale.set(1, 0.95, 1.2);
    tailRoot.position.z = 0.04;
    tailPivot.add(tailRoot);
    const tipFrame = new THREE.Group();
    tailPivot.add(tipFrame);
    [-1, 0, 1].forEach(k => {
      const tooth = mesh(new THREE.ConeGeometry(0.03, 0.1, 10), keratin, false);
      tooth.rotation.x = -Math.PI / 2;
      tooth.scale.set(1, 1, 0.6);
      tooth.position.set(k * 0.07, -0.012, -0.03);
      tipFrame.add(tooth);
    });
    const TL = 0.78;
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
        const ring = 0.018 * Math.pow(Math.max(0, Math.sin(s * Math.PI * 8)), 2) * (1 - m) * smooth(0.04, 0.12, s);
        const r = lerp(0.13, 0.065, Math.pow(Math.min(1, s / SPLIT), 0.75)) + ring;
        const end = smooth(0.9, 1, s);
        const w = lerp(r, 0.23, m) * (1 - 0.15 * end);
        const h = lerp(r, 0.08, m) * (1 - 0.35 * end);
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
    for (let k = 0; k < 16; k++) {
      const m = mesh(new THREE.DodecahedronGeometry(0.035 + (k % 4) * 0.015), k % 3 ? dirtMat : rockMat, false);
      m.visible = false;
      big.add(m);
      debris.push({ m, k, a: (k / 16) * 2 - 1, sp: 0.7 + (k % 5) * 0.15 });
    }
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xd6c4a2, transparent: true, opacity: 0.4, depthWrite: false });
    const dust = [];
    for (let k = 0; k < 12; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), dustMat);
      m.visible = false;
      big.add(m);
      dust.push({ m, a: (k / 12) * TAU });
    }
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff0b8, transparent: true, opacity: 0.95, depthWrite: false });
    const sparks = [];
    for (let k = 0; k < 12; k++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), sparkMat);
      m.visible = false;
      big.add(m);
      sparks.push({ m, k });
    }

    const food = berry();
    food.visible = false;
    big.add(food);
    const tmpV = new THREE.Vector3();
    const qA = new THREE.Quaternion();
    const qB = new THREE.Quaternion();
    const XA = V3(1, 0, 0);
    const YA = V3(0, 1, 0);
    const mix = (a, b, k) => {
      const o = {};
      Object.keys(a).concat(Object.keys(b)).forEach(n => (o[n] = lerp(a[n] || 0, b[n] || 0, k)));
      return o;
    };
    const RB = 0.72;

    setShell(0);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;

        const breath = Math.sin(t * 1.6) * motion;
        let curl = 0;
        let drop = 0.02 + breath * 0.006;
        let lean = 0.06;
        let headPitch = 0.05;
        let headYaw = 0;
        let earK = 0;
        let impact = 0;
        let shut = 0;
        let rollA = 0;
        let yawA = 0;
        let dx = 0;
        let dz = 0;
        let hop = 0;
        let digK = 0;
        let sparkK = 0;
        let fxZ = 0;
        let baseA = -0.75 + Math.sin(t * 0.9) * 0.03 * motion;
        let bendA = 0.42 + Math.sin(t * 1.2 + 1) * 0.04 * motion;
        let hookA = -1.45 + Math.sin(t * 1.5 + 2) * 0.06 * motion;
        let tailYaw = Math.sin(t * 0.8) * 0.15 * motion;
        const rest = { sx: -0.35 + breath * 0.03, sz: 0.22, ex: -0.95 };
        let poseL = Object.assign({}, rest);
        let poseR = Object.assign({}, rest);

        if (nm === "jump") {
          const crouch = smooth(0, 0.18, p) * (1 - smooth(0.18, 0.3, p));
          const air = Math.sin(Math.PI * smooth(0.25, 0.75, p));
          const land = smooth(0.72, 0.8, p) * (1 - smooth(0.82, 1, p));
          drop += 0.1 * crouch + 0.1 * land;
          hop = 0.55 * air;
          poseL = mix(rest, { sx: -1.6, sz: 0.5, ex: -0.6 }, air);
          poseR = mix(rest, { sx: -1.6, sz: 0.5, ex: -0.6 }, air);
          earK = air;
          headPitch = -0.15 * air;
          if (p > 0.74 && p < 0.95) impact = Math.sin(((p - 0.74) / 0.21) * Math.PI) * 0.6;
        } else if (nm === "curl" || nm === "spin") {
          curl = smooth(0.06, 0.28, p) * (1 - smooth(0.76, 0.96, p));
          if (nm === "curl") {
            const wob = smooth(0.3, 0.4, p) * (1 - smooth(0.66, 0.76, p));
            rollA = Math.sin(t * 5) * 0.12 * wob;
          } else {
            const sp = smooth(0.25, 0.4, p) * (1 - smooth(0.7, 0.8, p));
            yawA = -(Math.cos(Math.PI * smooth(0.25, 0.8, p)) - 1) * 0.5 * TAU * 3;
            sparkK = sp;
            fxZ = 0;
            if (sp > 0.3) impact = 0.3 + Math.abs(Math.sin(t * 11)) * 0.2;
          }
        } else if (nm === "roll") {
          curl = smooth(0.0, 0.15, p) * (1 - smooth(0.85, 1, p));
          const go = Math.sin(Math.PI * smooth(0.15, 0.85, p));
          dz = 1.5 * go;
          rollA = dz / RB;
          if (p > 0.4 && p < 0.58) impact = Math.sin(((p - 0.4) / 0.18) * Math.PI) * 0.7;
          fxZ = dz;
        } else if (nm === "drift") {
          curl = smooth(0.0, 0.12, p) * (1 - smooth(0.88, 1, p));
          const q = smooth(0.12, 0.88, p);
          const ang = q * TAU;
          dx = Math.sin(ang) * 0.9;
          dz = (1 - Math.cos(ang)) * 0.55;
          yawA = Math.atan2(Math.cos(ang) * 0.9, Math.sin(ang) * 0.55);
          yawA = -ang;
          rollA = q * 14;
          sparkK = Math.sin(Math.PI * q);
          if (sparkK > 0.3) impact = 0.35 + Math.abs(Math.sin(t * 9)) * 0.2;
          fxZ = dz;
        } else if (nm === "dig") {
          const k = smooth(0.05, 0.2, p) * (1 - smooth(0.82, 0.96, p));
          lean = lerp(0.06, 0.45, k);
          drop += 0.08 * k;
          digK = k;
          const a1 = Math.sin(t * 12);
          poseL = mix(rest, { sx: -1.25 + a1 * 0.35, sz: 0.1, ex: -0.5 - a1 * 0.25 }, k);
          poseR = mix(rest, { sx: -1.25 - a1 * 0.35, sz: 0.1, ex: -0.5 + a1 * 0.25 }, k);
          headPitch = 0.15 * k;
          shut = k * 0.4;
          if (k > 0.5) impact = 0.25 + Math.abs(a1) * 0.2;
        } else if (nm === "sniff") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.85, 1, p));
          headYaw = Math.sin(p * Math.PI * 4) * 0.4 * k;
          headPitch = -0.15 * k + Math.sin(t * 20) * 0.02 * k;
          lean = lerp(0.06, -0.06, k);
          earK = k * Math.abs(Math.sin(p * Math.PI * 6));
          tailYaw += Math.sin(p * Math.PI * 3) * 0.25 * k;
        } else if (nm === "eat") {
          const k = smooth(0.0, 0.25, p) * (1 - smooth(0.88, 1, p));
          const hold = { sx: -0.8, sz: -0.5, ex: -0.9 };
          poseL = mix(rest, hold, k);
          poseR = mix(rest, hold, k);
          headPitch = 0.22 * smooth(0.25, 0.35, p) * (1 - smooth(0.85, 0.95, p));
          shut = p > 0.35 && p < 0.85 ? 0.45 : 0;
        }

        setShell(curl);
        drop = lerp(drop, HIP + TC.y - RB, curl);
        lean = lerp(lean, 0, curl);

        root.rotation.y = lookYaw;
        upper.rotation.set(lean + lookPitch * 0.3 * (1 - curl), 0, 0);
        const C = V3(0, HIP + TC.y, TC.z);
        qA.setFromAxisAngle(YA, yawA);
        qB.setFromAxisAngle(XA, rollA);
        qA.multiply(qB);
        bodyG.quaternion.copy(qA);
        tmpV.copy(C).applyQuaternion(qA);
        bodyG.position.set(dx + C.x - tmpV.x, hop - drop + C.y - tmpV.y, dz + C.z - tmpV.z);
        const sq = 1 + breath * 0.012 * (1 - curl);
        torso.scale.set(TR.x * sq, TR.y, TR.z * sq);
        belly.scale.set(0.4 * lerp(1, 0.6, curl), 0.5 * lerp(1, 0.6, curl), 0.28 * lerp(1, 0.5, curl));
        belly.position.set(0, TC.y - 0.05, lerp(0.27, 0.1, curl));

        const tuck = curl;
        legs.forEach(({ hip, knee, ankle, base }) => {
          const H = Math.max(0.15, HIP - drop - FH);
          const a = Math.acos(Math.min(1, H / (L1 + L2)));
          const k2 = 1 - tuck;
          hip.position.set(base.x * lerp(1, 0.6, tuck), lerp(HIP, HIP + 0.2, tuck), lerp(base.z, 0.0, tuck));
          hip.scale.setScalar(lerp(1, 0.35, tuck));
          hip.rotation.set((-a) * k2, 0, 0);
          knee.rotation.set(2 * a * k2, 0, 0);
          ankle.rotation.set(-a * k2, 0, 0);
        });

        arms.forEach(a => {
          const ps = a.sx > 0 ? poseR : poseL;
          a.sh.rotation.set(ps.sx, 0, (ps.sz || 0) * a.sx);
          a.el.rotation.set(ps.ex, 0, 0);
          a.pg.rotation.set(a.sh.rotation.x * 0.3, 0, a.sh.rotation.z * 0.45);
          a.sh.position.set(a.base.x * lerp(1, 0.5, tuck), lerp(a.base.y, TC.y, tuck), lerp(a.base.z, TC.z, tuck));
          a.sh.scale.setScalar(lerp(1, 0.3, tuck));
          a.pg.position.copy(a.sh.position);
          a.pg.scale.setScalar(lerp(1, 0.5, tuck));
        });

        headPivot.position.set(0, lerp(TC.y + 0.5, TC.y + 0.05, tuck), lerp(0.33, 0.02, tuck));
        headPivot.scale.setScalar(lerp(1, 0.55, tuck));
        head.rotation.set(headPitch - lean * 0.8, headYaw, 0);
        mouth.scale.set(1, nm === "eat" && ph && ph.chew ? 0.4 + ph.chew * 0.8 : 1, 1);

        tailPivot.rotation.set(0, tailYaw * (1 - tuck), 0);
        tailPivot.scale.setScalar(lerp(1, 0.25, tuck));
        tailPivot.position.set(0, lerp(TC.y - 0.42, TC.y - 0.2, tuck), lerp(-0.38, -0.15, tuck));
        tailShape(baseA - lean, bendA, hookA);

        ears.forEach((e, i) => {
          const s2 = i ? 1 : -1;
          e.rotation.z = -0.55 * s2 + Math.sin(t * 9 + i) * 0.16 * earK;
        });
        const close = Math.max(shut, 1 - blink, tuck > 0.5 ? 1 : 0);
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
          const r = 0.6 + u * 0.5;
          const cz = nm === "dig" ? 0.75 : fxZ;
          d.m.position.set(dx + Math.cos(d.a) * r, 0.08 + u * 0.15, cz + Math.sin(d.a) * r * 0.7);
          d.m.scale.setScalar(0.35 + u * 0.7);
          dustMat.opacity = 0.3 * impact;
        });
        debris.forEach(d => {
          const vis = digK > 0.4;
          d.m.visible = vis;
          if (!vis) return;
          const q = (t * d.sp * 1.4 + d.k * 0.31) % 1;
          d.m.position.set(d.a * 0.5, 0.06 + Math.sin(q * Math.PI) * 0.7, 0.75 + q * 0.4 - q * q * 0.2);
          d.m.rotation.set(t * 4 + d.k, t * 3, 0);
        });
        sparks.forEach(sp => {
          sp.m.visible = sparkK > 0.3;
          if (!sp.m.visible) return;
          const q = (t * 3 + sp.k * 0.17) % 1;
          const a = sp.k * 2.1 + t * 2;
          sp.m.position.set(dx + Math.cos(a) * (0.55 + q * 0.4), 0.05 + q * 0.45, dz + Math.sin(a) * (0.55 + q * 0.4));
          sp.m.scale.setScalar(1 - q);
        });

        if (nm === "eat" && ph) {
          food.visible = ph.visible;
          root.updateMatrixWorld(true);
          arms[1].palm.getWorldPosition(tmpV);
          const v2 = new THREE.Vector3();
          arms[0].palm.getWorldPosition(v2);
          tmpV.add(v2).multiplyScalar(0.5);
          big.worldToLocal(tmpV);
          tmpV.z += 0.08;
          tmpV.y += 0.06;
          food.position.set(tmpV.x, lerp(3.0, tmpV.y, ph.fall * ph.fall), tmpV.z);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.8);
        } else food.visible = false;
      }
    };
  }
});
