Pets.register({
  id: "garraco",
  dex: 48,
  name: "Garraço",
  color: "#7f878f",
  types: ["steel"],
  variants: "types",
  stage: 2,
  evolvesTo: "taloco",
  evolveLevel: 36,
  move: "fly",
  description: "O metal derretido do braço escorreu pelo peito até chegar ao núcleo. Quando derrota alguém com a Garra Coletora, ele guarda o tipo do derrotado ali dentro, e todo o metal derretido muda para a cor roubada. As pernas começaram a brotar, mas ainda não servem para andar.",
  actions: {
    jump: { duration: 1.3 },
    eat: { duration: 2.6 },
    swipe: { duration: 1.3 },
    fling: { duration: 1.8 },
    spin: { duration: 1.6 },
    absorb: { duration: 2.2 }
  },
  battle: { attack: { action: "swipe", hit: 0.44, speed: 1.0 }, special: { action: "fling", hit: 0.6, speed: 1.0 } },
  idle: [
    { action: "absorb", min: 18, max: 40 },
    { action: "spin", min: 30, max: 60 },
    { action: "swipe", min: 35, max: 70 },
    { action: "jump", min: 45, max: 90 }
  ],
  clickAction: n => ["swipe", "absorb", "spin", "jump", "fling"][(n - 1) % 5],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const TAU = Math.PI * 2;
    const hasDoc = typeof document !== "undefined";

    const root = new THREE.Group();
    const big = new THREE.Group();
    root.add(big);
    const bodyG = new THREE.Group();
    big.add(bodyG);

    const TIP = 0.36;
    const ZS = 0.84;

    const canvas = (w, h, fn) => {
      if (!hasDoc) return null;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      fn(c.getContext("2d"), w, h);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = 4;
      return t;
    };
    let sd = 11;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;

    const steelTex = canvas(512, 512, (g, W, H) => {
      const tile = fn => [-W, 0, W].forEach(dx => {
        g.save();
        g.translate(dx, 0);
        fn();
        g.restore();
      });
      g.fillStyle = "#a7adb4";
      g.fillRect(0, 0, W, H);
      for (let k = 0; k < 90; k++) {
        const x = rnd() * W;
        const y = rnd() * H;
        const r = 20 + rnd() * 70;
        const d = rnd() > 0.55 ? "70,74,80" : "176,182,188";
        const al = 0.1 + rnd() * 0.14;
        tile(() => {
          const gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, "rgba(" + d + "," + al + ")");
          gr.addColorStop(1, "rgba(" + d + ",0)");
          g.fillStyle = gr;
          g.fillRect(x - r, y - r, r * 2, r * 2);
        });
      }
      for (let k = 0; k < 900; k++) {
        g.fillStyle = "rgba(" + (rnd() > 0.5 ? "40,42,46" : "200,204,210") + "," + (0.08 + rnd() * 0.12) + ")";
        g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2);
      }
      for (let k = 0; k < 220; k++) {
        const y = rnd() * H;
        const x = rnd() * W;
        const al = 0.04 + rnd() * 0.06;
        const l = 30 + rnd() * 90;
        const dy = (rnd() - 0.5) * 2;
        tile(() => {
          g.strokeStyle = "rgba(210,214,220," + al + ")";
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + l, y + dy);
          g.stroke();
        });
      }
      for (let k = 0; k < 26; k++) {
        const x = rnd() * W;
        const y = rnd() * H;
        const r = 6 + rnd() * 16;
        tile(() => {
          const gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, "rgba(120,78,52,0.22)");
          gr.addColorStop(1, "rgba(120,78,52,0)");
          g.fillStyle = gr;
          g.fillRect(x - r, y - r, r * 2, r * 2);
        });
      }
    });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: steelTex, roughness: 0.42, metalness: 0.55 });
    if (steelTex) steelTex.wrapT = THREE.RepeatWrapping;
    kit.surface(steelMat, steelTex, { seed: 5, rough: [0.42, 0.68], metal: 0.22, scratch: 0.8, pits: 0.8, bump: 0.05 });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x24161a });

    const MW = 256;
    const heatF = new Float32Array(MW * MW);
    const rimF = new Float32Array(MW * MW);
    const crustF = new Float32Array(MW * MW);
    const noiseF = new Float32Array(MW * MW);
    {
      const N = 7;
      const pts = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) pts.push([(i + 0.15 + rnd() * 0.7) / N, (j + 0.15 + rnd() * 0.7) / N, rnd()]);
      for (let y = 0; y < MW; y++)
        for (let x = 0; x < MW; x++) {
          const u0 = x / MW;
          const v0 = y / MW;
          const u = u0 + 0.035 * Math.sin(v0 * TAU * 3 + u0 * TAU * 2);
          const v = v0 + 0.035 * Math.sin(u0 * TAU * 4 + v0 * TAU);
          let d1 = 9;
          let d2 = 9;
          let c1 = null;
          for (const q of pts) {
            let dx = Math.abs(u - q[0]);
            let dy = Math.abs(v - q[1]);
            dx = Math.min(dx, 1 - dx);
            dy = Math.min(dy, 1 - dy);
            const dd = Math.sqrt(dx * dx + dy * dy);
            if (dd < d1) {
              d2 = d1;
              d1 = dd;
              c1 = q;
            } else if (dd < d2) d2 = dd;
          }
          const edge = d2 - d1;
          const prob = lerp(0.7, 0.05, Math.pow(c1[0], 0.7));
          const isCrust = c1[2] < prob;
          const k = y * MW + x;
          crustF[k] = isCrust ? smooth(0.012, 0.04, edge) : 0;
          rimF[k] = isCrust ? smooth(0.0, 0.012, edge) * (1 - smooth(0.012, 0.03, edge)) : 0;
          const heat = lerp(0.45, 1, u0);
          const mot = 0.5 + 0.25 * Math.sin(u0 * TAU * 5 + Math.sin(v0 * TAU * 2) * 2) + 0.25 * Math.sin(v0 * TAU * 3 + u0 * TAU * 3);
          heatF[k] = Math.min(1, heat * (0.82 + 0.3 * mot));
          noiseF[k] = (rnd() - 0.5) * 12;
        }
    }
    const hotSpots = Array.from({ length: 40 }, () => [rnd(), rnd(), 6 + rnd() * 14, rnd() > 0.5]);
    const hotCrust = Array.from({ length: 3 }, () => [rnd(), rnd() * 0.5, 3 + rnd() * 7, 2 + rnd() * 5, rnd() * 3]);
    const mkCanvas = n => {
      if (!hasDoc) return null;
      const c = document.createElement("canvas");
      c.width = n;
      c.height = n;
      return c;
    };
    const moltenCv = mkCanvas(MW);
    const hotCv = mkCanvas(128);
    const texOf = cv => {
      if (!cv) return null;
      const t = new THREE.CanvasTexture(cv);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      return t;
    };
    const moltenTex = texOf(moltenCv);
    const hotTex = texOf(hotCv);
    const palOf = hex => {
      const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
      const mix = (k, w) => c.map(v => lerp(v, 255, w) * k);
      return { deep: mix(0.62, 0), hot: mix(1, 0.35), rim: mix(1, 0.62), gam: [1.4, 1.4, 1.4] };
    };
    const css = (c, a) => "rgba(" + c.map(v => Math.round(Math.min(255, v))).join(",") + "," + a + ")";
    let pal = null;
    const paint = () => {
      if (moltenCv) {
        const g = moltenCv.getContext("2d");
        const img = g.createImageData(MW, MW);
        const d = img.data;
        for (let k = 0; k < MW * MW; k++) {
          const hk = heatF[k];
          const o = k * 4;
          for (let ch = 0; ch < 3; ch++) {
            let v = lerp(pal.deep[ch], pal.hot[ch], Math.pow(hk, pal.gam[ch]));
            v = lerp(v, pal.rim[ch], rimF[k] * 0.8);
            v = lerp(v, [62, 55, 52][ch] + noiseF[k], crustF[k]);
            d[o + ch] = v;
          }
          d[o + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        moltenTex.needsUpdate = true;
      }
      if (hotCv) {
        const g = hotCv.getContext("2d");
        const W = 128;
        g.fillStyle = css(pal.deep.map((v, i) => lerp(v, pal.hot[i], 0.55)), 1);
        g.fillRect(0, 0, W, W);
        hotSpots.forEach(([x, y, r, light]) => {
          const gr = g.createRadialGradient(x * W, y * W, 0, x * W, y * W, r);
          gr.addColorStop(0, light ? css(pal.rim, 0.7) : css(pal.deep.map(v => v * 0.9), 0.6));
          gr.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = gr;
          g.fillRect(x * W - r, y * W - r, r * 2, r * 2);
        });
        hotCrust.forEach(([x, y, rx, ry, a]) => {
          g.fillStyle = "rgba(90,52,40,0.5)";
          g.beginPath();
          g.ellipse(x * W, y * W, rx, ry, a, 0, TAU);
          g.fill();
        });
        hotTex.needsUpdate = true;
      }
    };
    const moltenMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, map: moltenTex, emissive: 0xffffff, emissiveMap: moltenTex, emissiveIntensity: 0.7, roughness: 0.45, metalness: 0.1 });
    if (!moltenTex) moltenMat.color.set(0xff7a1e);
    if (!moltenTex) moltenMat.emissive.set(0xc04010);
    const hotMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, map: hotTex, emissive: 0xffffff, emissiveMap: hotTex, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.1 });
    if (!hotTex) hotMat.color.set(0xe8702a);
    if (!hotTex) hotMat.emissive.set(0xd84a10);

    const clawMat = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.3, metalness: 0.55 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x5d646c, roughness: 0.38, metalness: 0.4 });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x8b9199, roughness: 0.4, metalness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fb4c8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x8a3a14, emissive: 0xff7a20, emissiveIntensity: 1, roughness: 0.3, metalness: 0.2, flatShading: true });
    const GLOW = {
      fire: 0xff6a1e, water: 0x1e8cff, grass: 0x18d060, electric: 0xffd400, ice: 0x48f8ff, fighting: 0xff2626,
      poison: 0xe020f0, ground: 0xc8902a, flying: 0xc0b0ff, psychic: 0xff3c78, bug: 0x9ad000, rock: 0x806650,
      ghost: 0xa64cff, dragon: 0x4020ff, dark: 0x40284c, steel: 0x8ea0b8, light: 0xfff4c0
    };
    let coreType = null;

    const PROF = new THREE.SplineCurve([V2(0.0, 0.0), V2(0.024, 0.07), V2(0.055, 0.17), V2(0.095, 0.28), V2(0.155, 0.39), V2(0.235, 0.5), V2(0.315, 0.62), V2(0.37, 0.75), V2(0.385, 0.88), V2(0.36, 0.98), V2(0.29, 1.06), V2(0.17, 1.11), V2(0.0, 1.125)]).getPoints(100);
    PROF[0].x = 0.0001;
    PROF[PROF.length - 1].x = 0.0001;
    const rOf = y => {
      for (let i = 1; i < PROF.length; i++)
        if (PROF[i].y >= y) {
          const a = PROF[i - 1];
          const b = PROF[i];
          return lerp(a.x, b.x, (y - a.y) / Math.max(1e-6, b.y - a.y));
        }
      return 0;
    };
    const torso = new THREE.Group();
    torso.position.y = TIP;
    bodyG.add(torso);
    const torsoMesh = mesh(new THREE.LatheGeometry(PROF, 80), steelMat);
    torsoMesh.scale.z = ZS;
    torsoMesh.rotation.y = Math.PI;
    torso.add(torsoMesh);
    const TP = (a, y) => {
      const r = rOf(y);
      return V3(Math.sin(a) * r, y, Math.cos(a) * r * ZS);
    };
    const TN = (a, y) => {
      const dr = (rOf(y + 0.01) - rOf(y - 0.01)) / 0.02;
      return V3(Math.sin(a), -dr, Math.cos(a) / ZS).normalize();
    };

    const tubeGeo = (pts, rf, n = 40, rs = 14) => {
      const c = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(c, n, 1, rs - 1, false);
      const p = g.attributes.position;
      for (let i = 0; i <= n; i++) {
        const cp = c.getPointAt(i / n);
        for (let j = 0; j < rs; j++) {
          const k = i * rs + j;
          const r = rf(i / n, j / (rs - 1));
          p.setXYZ(k, cp.x + (p.getX(k) - cp.x) * r, cp.y + (p.getY(k) - cp.y) * r, cp.z + (p.getZ(k) - cp.z) * r);
        }
      }
      g.computeVertexNormals();
      return { g, c };
    };
    const strip = (pts, nrm, wf, hf, topK = 0.78, uf = null) => {
      const pos = [];
      const uvs = [];
      const idx = [];
      const M = pts.length;
      pts.forEach((p, i) => {
        const n = nrm[i];
        const tIn = p.clone().sub(pts[Math.max(0, i - 1)]);
        const tOut = pts[Math.min(M - 1, i + 1)].clone().sub(p);
        if (tIn.lengthSq() < 1e-10) tIn.copy(tOut);
        if (tOut.lengthSq() < 1e-10) tOut.copy(tIn);
        tIn.normalize();
        tOut.normalize();
        const t = tIn.clone().add(tOut).normalize();
        const b = n.clone().cross(t).normalize();
        const bIn = n.clone().cross(tIn).normalize();
        const w = wf(i) / Math.max(0.35, b.dot(bIn));
        const h = hf(i);
        const lo = -0.014;
        pos.push(...p.clone().addScaledVector(n, h).addScaledVector(b, w * topK).toArray());
        pos.push(...p.clone().addScaledVector(n, h).addScaledVector(b, -w * topK).toArray());
        pos.push(...p.clone().addScaledVector(n, lo).addScaledVector(b, -w).toArray());
        pos.push(...p.clone().addScaledVector(n, lo).addScaledVector(b, w).toArray());
        const u = uf ? uf(i) : i / (M - 1);
        uvs.push(u, 0.3, u, 0.7, u, 1, u, 0);
      });
      for (let i = 0; i < M - 1; i++) {
        const a = i * 4;
        const c = a + 4;
        for (let k = 0; k < 4; k++) {
          const k2 = (k + 1) % 4;
          idx.push(a + k, a + k2, c + k, a + k2, c + k2, c + k);
        }
      }
      const e = (M - 1) * 4;
      idx.push(0, 2, 1, 0, 3, 2, e, e + 1, e + 2, e, e + 2, e + 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      const ng = g.toNonIndexed();
      ng.computeVertexNormals();
      return ng;
    };
    const vPath = (x0, y0, y1, K) => {
      const path = [];
      for (let i = 0; i <= K; i++) path.push([lerp(-x0, 0, i / K), lerp(y1, y0, i / K)]);
      for (let i = 1; i <= K; i++) path.push([lerp(0, x0, i / K), lerp(y0, y1, i / K)]);
      return path;
    };

    [[1.0, 0.46], [0.89, 0.42], [0.78, 0.38], [0.67, 0.34]].forEach(([y0, x0]) => {
      const path = vPath(x0, y0, y0 + 0.075, 14);
      const ax = i => Math.abs(path[i][0]) / x0;
      const back = path.map(([a, y]) => [a + Math.PI, y]);
      const g = strip(back.map(([a, y]) => TP(a, y)), back.map(([a, y]) => TN(a, y)), i => 0.03 * (1 - 0.9 * smooth(0.6, 1, ax(i))), i => 0.017 * (1 - 0.6 * smooth(0.7, 1, ax(i))));
      torso.add(mesh(g, plateMat));
    });

    const PY = 0.8;
    const port = new THREE.Group();
    {
      const pr = rOf(PY) * ZS;
      const slope = ((rOf(PY + 0.02) - rOf(PY - 0.02)) / 0.04) * ZS;
      port.position.set(0, PY, pr - 0.006);
      port.rotation.x = Math.atan(slope);
      torso.add(port);
      port.add(mesh(new THREE.TorusGeometry(0.098, 0.024, 12, 44), darkSteel));
      const socket = mesh(new THREE.CircleGeometry(0.1, 40), new THREE.MeshStandardMaterial({ color: 0x1d2126, roughness: 0.6, metalness: 0.2 }), false);
      socket.position.z = 0.008;
      port.add(socket);
      const gem = mesh(new THREE.IcosahedronGeometry(0.064, 1), coreMat, false);
      gem.position.z = 0.016;
      gem.scale.set(1, 1, 0.42);
      port.add(gem);
      const dome = mesh(new THREE.SphereGeometry(0.098, 32, 14, 0, TAU, 0, Math.PI / 2), glassMat, false);
      dome.rotation.x = Math.PI / 2;
      dome.scale.set(1, 0.5, 1);
      dome.renderOrder = 2;
      port.add(dome);
    }

    const SH = 0.95;
    const shoulders = [-1, 1].map(s => V3(s * 0.4, TIP + SH, 0.0));
    shoulders.forEach((p, i) => {
      const m = mesh(new THREE.SphereGeometry(0.12, 28, 20), i ? moltenMat : steelMat);
      m.position.copy(p);
      bodyG.add(m);
    });

    {
      const flow = (ctrl, wf, uf) => {
        const c = new THREE.SplineCurve(ctrl.map(([a, y]) => V2(a, y)));
        const sp = c.getSpacedPoints(48);
        const pts = sp.map(q => TP(q.x, q.y));
        torso.add(mesh(strip(pts, sp.map(q => TN(q.x, q.y)), i => wf(i / 48), i => 0.016 * (1 - 0.7 * smooth(0.85, 1, i / 48)), 0.62, i => uf(i / 48)), moltenMat));
      };
      flow([[1.5, 0.99], [1.25, 0.97], [1.0, 0.935], [0.75, 0.9], [0.5, 0.86], [0.27, PY + 0.03]], u => (0.085 - 0.03 * u) * (1 + 0.16 * Math.sin(u * 17) + 0.1 * Math.sin(u * 31 + 1)), u => lerp(0.45, 1, u));
      flow([[0.98, 0.93], [1.02, 0.86], [0.98, 0.78], [1.01, 0.7]], u => 0.04 * (1 - Math.pow(u, 1.6)) + 0.004, u => lerp(0.55, 0.8, u));
      flow([[0.58, 0.87], [0.6, 0.8], [0.56, 0.73]], u => 0.032 * (1 - Math.pow(u, 1.6)) + 0.004, u => lerp(0.6, 0.85, u));
      flow([[1.5, 1.0], [1.85, 1.0], [2.2, 0.965], [2.45, 0.9], [2.55, 0.82], [2.5, 0.74], [2.4, 0.68]], u => (0.075 - 0.035 * u) * (1 + 0.15 * Math.sin(u * 15 + 2) + 0.1 * Math.sin(u * 29)) * (1 - 0.6 * smooth(0.8, 1, u)) + 0.006, u => lerp(0.5, 0.85, u));
      flow([[2.08, 0.975], [2.12, 0.9], [2.08, 0.82]], u => 0.03 * (1 - Math.pow(u, 1.6)) + 0.004, u => lerp(0.55, 0.8, u));
      flow([[2.4, 0.925], [2.34, 0.86], [2.37, 0.79]], u => 0.026 * (1 - Math.pow(u, 1.6)) + 0.004, u => lerp(0.55, 0.75, u));
    }

    const legs = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(s * 0.13, TIP + 0.44, 0.03);
      bodyG.add(g);
      const radL = u => {
        const knee = 0.012 * Math.exp(-Math.pow((u - 0.52) / 0.1, 2));
        const r = u < 0.58 ? lerp(0.088, 0.072, u / 0.58) : 0.072 * (1 - Math.pow((u - 0.58) / 0.42, 1.5));
        return Math.max(0.003, r + knee);
      };
      const { g: geo, c: lc } = tubeGeo([V3(-s * 0.08, 0.06, -0.02), V3(0, 0, 0), V3(s * 0.08, -0.06, 0.05), V3(s * 0.13, -0.15, 0.09), V3(s * 0.155, -0.26, 0.05), V3(s * 0.165, -0.38, -0.01)], radL, 40, 18);
      g.add(mesh(geo, steelMat));
      const front = u => {
        const t = lc.getTangentAt(u);
        const f = V3(s * 0.3, 0, 1);
        return f.addScaledVector(t, -f.dot(t)).normalize();
      };
      const HIPU = 0.3;
      const onLeg = (u, k = 0) => lc.getPointAt(u).addScaledVector(front(u), radL(u) + k);
      {
        const hip = mesh(new THREE.TorusGeometry(radL(HIPU) + 0.003, 0.012, 10, 32), darkSteel);
        hip.position.copy(lc.getPointAt(HIPU));
        hip.quaternion.setFromUnitVectors(V3(0, 0, 1), lc.getTangentAt(HIPU));
        g.add(hip);
        const groove = mesh(new THREE.TorusGeometry(radL(0.71) + 0.002, 0.009, 8, 28), darkSteel);
        groove.position.copy(lc.getPointAt(0.71));
        groove.quaternion.setFromUnitVectors(V3(0, 0, 1), lc.getTangentAt(0.71));
        g.add(groove);
      }
      {
        const cap = mesh(new THREE.SphereGeometry(0.058, 22, 16), plateMat);
        cap.scale.set(1, 1.15, 0.42);
        cap.position.copy(onLeg(0.52, -0.006));
        cap.quaternion.setFromUnitVectors(V3(0, 0, 1), front(0.52));
        g.add(cap);
        const K = 16;
        const us = Array.from({ length: K + 1 }, (_, i) => lerp(0.6, 0.94, i / K));
        g.add(mesh(strip(us.map(u => onLeg(u, -0.004)), us.map(front), i => 0.028 * (1 - 0.85 * smooth(0.5, 1, i / K)) * (1 - 0.5 * (1 - smooth(0, 0.15, i / K))), i => 0.022 * (1 - 0.6 * smooth(0.6, 1, i / K))), plateMat));
      }
      return g;
    });

    const ring = new THREE.Group();
    ring.position.set(0, TIP + 0.14, 0);
    bodyG.add(ring);
    {
      const tor = mesh(new THREE.TorusGeometry(0.11, 0.02, 12, 48), darkSteel);
      tor.rotation.x = Math.PI / 2;
      ring.add(tor);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU;
        const n = mesh(new THREE.BoxGeometry(0.03, 0.05, 0.05), plateMat);
        n.position.set(Math.cos(a) * 0.11, 0, Math.sin(a) * 0.11);
        n.rotation.y = -a;
        ring.add(n);
      }
    }

    const HW = 0.37;
    const HH = 0.34;
    const HD = 0.35;
    const HP = (x, y) => V3(x * HW, y * HH, Math.sqrt(Math.max(0, 1 - x * x - y * y)) * HD);
    const HN = p => V3(p.x / (HW * HW), p.y / (HH * HH), p.z / (HD * HD)).normalize();
    const neck = new THREE.Group();
    neck.position.set(0, TIP + 1.06, 0);
    bodyG.add(neck);
    const head = new THREE.Group();
    head.position.y = 0.34;
    neck.add(head);
    {
      const g = new THREE.SphereGeometry(1, 72, 54);
      g.rotateY(-Math.PI / 2);
      g.scale(HW, HH, HD);
      head.add(mesh(g, steelMat));
    }
    {
      const path = [];
      const K = 20;
      const X = 0.5;
      const Y0 = 0.34;
      const Y1 = 0.6;
      for (let i = 0; i <= K; i++) path.push([lerp(-X, 0, i / K), lerp(Y1, Y0, i / K)]);
      for (let i = 1; i <= K; i++) path.push([lerp(0, X, i / K), lerp(Y0, Y1, i / K)]);
      const surf = path.map(([x, y]) => HP(x, y));
      const nS = surf.map(HN);
      const B = 12;
      const LEN = 0.44;
      const blade = sgn => {
        const E = HP(sgn * X, Y1);
        const n = HN(E);
        const D = V3(sgn, 0.74, -0.34).normalize();
        const pts = [];
        for (let i = 1; i <= B; i++) pts.push(E.clone().addScaledVector(D, (LEN * i) / B));
        return { pts, n };
      };
      const L = blade(-1);
      const R = blade(1);
      const pts = L.pts.slice().reverse().concat(surf, R.pts);
      const nrm = L.pts.map(() => L.n).concat(nS, R.pts.map(() => R.n));
      const M = pts.length;
      const out = i => (i < B ? (B - i) / B : i >= M - B ? (i - (M - B - 1)) / B : 0);
      const ax = i => (i < B || i >= M - B ? 1 : Math.abs(path[i - B][0]) / X);
      const wf = i => (0.05 * lerp(1, 0.78, ax(i))) * (1 - 0.92 * Math.pow(out(i), 1.3));
      const hf = i => 0.045 * (1 - 0.45 * out(i));
      head.add(mesh(strip(pts, nrm, wf, hf), plateMat));
    }
    {
      const th0 = Math.asin(0.4);
      const th1 = Math.PI - 0.5;
      const K = 40;
      const pts = [];
      const hs = [];
      for (let i = 0; i <= K; i++) {
        const u = i / K;
        const th = lerp(th0, th1, u);
        pts.push(V3(0, Math.sin(th) * HH, Math.cos(th) * HD));
        hs.push(0.03 + 0.06 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.25)), 0.8) * (1 - smooth(0.75, 1, u)));
      }
      head.add(mesh(strip(pts, pts.map(HN), i => 0.034 * (1 - 0.6 * smooth(0.8, 1, i / K)), i => hs[i], 0.55), plateMat));
    }
    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      const n = HP(0.33 * s, 0.07);
      const nd = HN(n);
      g.position.copy(n).addScaledVector(nd, -0.06);
      g.quaternion.setFromUnitVectors(V3(0, 0, 1), nd.add(V3(0, 0, 0.9)).normalize());
      head.add(g);
      const e = eye({ size: 0.5, whiteColor: 0xf3f5f8, pupilColor: 0x12161d });
      g.add(e.g);
      return { g: e.g, pupil: e.pupil };
    });
    const mouthG = new THREE.Group();
    {
      const p = HP(0, -0.4);
      mouthG.position.copy(p).addScaledVector(HN(p), 0.002);
      mouthG.quaternion.setFromUnitVectors(V3(0, 0, 1), HN(p));
      head.add(mouthG);
    }
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), mouthMat);
    mouthG.add(mouth);
    const smile = mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 24, 0.85), mouthMat, false);
    smile.rotation.z = Math.PI + (Math.PI - 0.85) / 2;
    smile.position.y = 0.082;
    mouthG.add(smile);

    const dyn = m => {
      const o = new THREE.Mesh(new THREE.BufferGeometry(), m);
      o.castShadow = true;
      o.frustumCulled = false;
      bodyG.add(o);
      return o;
    };
    const flexTube = (m, pts, rf, n = 40, rs = 14) => {
      const { g, c } = tubeGeo(pts, rf, n, rs);
      m.geometry.dispose();
      m.geometry = g;
      return c;
    };
    const ik = (A, B, l1, l2, pole) => {
      const d = B.clone().sub(A);
      const L = Math.min(l1 + l2 - 0.002, Math.max(0.02, d.length()));
      const dn = d.clone().normalize();
      const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L);
      const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      const pn = pole.clone().sub(dn.clone().multiplyScalar(pole.dot(dn))).normalize();
      return { elbow: A.clone().addScaledVector(dn, a).addScaledVector(pn, h), end: A.clone().addScaledVector(dn, L) };
    };
    const frame = d => {
      const hx = V3(0, 1, 0).cross(d);
      if (hx.lengthSq() < 1e-4) hx.set(1, 0, 0);
      hx.normalize();
      const hy = d.clone().cross(hx).normalize();
      return { hx, hy };
    };

    const armR = dyn(steelMat);
    const handR = new THREE.Group();
    bodyG.add(handR);
    {
      const mitt = mesh(new THREE.SphereGeometry(0.118, 28, 20), steelMat);
      mitt.scale.set(1.1, 0.74, 1.18);
      mitt.position.z = 0.09;
      handR.add(mitt);
      const th = new THREE.Group();
      th.position.set(0.095, 0.016, 0.05);
      th.rotation.set(-0.3, 0.75, 0);
      handR.add(th);
      const tm = mesh(new THREE.SphereGeometry(0.045, 18, 14), steelMat);
      tm.scale.set(0.95, 0.85, 1.6);
      tm.position.z = 0.045;
      th.add(tm);
    }

    const armL = dyn(moltenMat);
    const bands = [0.62, 0.75, 0.88].map((u, i) => {
      const r0 = 0.112 - i * 0.004;
      const g = new THREE.LatheGeometry([V2(0.08, -0.042), V2(r0 - 0.006, -0.04), V2(r0, -0.03), V2(r0 + 0.004, 0), V2(r0, 0.03), V2(r0 - 0.006, 0.04), V2(0.08, 0.042)], 36);
      const m = mesh(g, steelMat);
      bodyG.add(m);
      return { m, u, r: r0 + 0.004 };
    });
    const handL = new THREE.Group();
    bodyG.add(handL);
    const palm = mesh(new THREE.SphereGeometry(0.11, 32, 24), hotMat);
    palm.scale.set(1.05, 0.88, 1.1);
    handL.add(palm);
    {
      const cuff = mesh(new THREE.LatheGeometry([V2(0.085, -0.035), V2(0.108, -0.032), V2(0.116, 0), V2(0.108, 0.032), V2(0.085, 0.035)], 36), steelMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.z = -0.06;
      handL.add(cuff);
    }
    const clawGeo = (() => {
      const { g } = tubeGeo([V3(0, 0, 0), V3(0, 0.012, 0.06), V3(0, -0.01, 0.12), V3(0, -0.06, 0.17)], u => lerp(0.03, 0.002, Math.pow(u, 1.1)), 18, 10);
      return g;
    })();
    const claws = [-1, 0, 1].map(c => {
      const pv = new THREE.Group();
      pv.position.set(c * 0.06, -0.02 - Math.abs(c) * 0.012, 0.085 - Math.abs(c) * 0.014);
      pv.rotation.y = c * 0.26;
      handL.add(pv);
      const base = mesh(new THREE.SphereGeometry(0.036, 14, 10), hotMat);
      base.scale.set(0.95, 0.85, 1.25);
      pv.add(base);
      const cl = mesh(clawGeo, clawMat);
      cl.position.z = 0.018;
      pv.add(cl);
      return pv;
    });
    const thumb = new THREE.Group();
    thumb.position.set(-0.095, -0.02, 0.035);
    thumb.rotation.y = -1.0;
    handL.add(thumb);
    {
      const base = mesh(new THREE.SphereGeometry(0.032, 14, 10), hotMat);
      thumb.add(base);
      const cl = mesh(clawGeo, clawMat);
      cl.scale.setScalar(0.8);
      cl.position.z = 0.012;
      thumb.add(cl);
    }

    const dropGeo = new THREE.LatheGeometry([V2(0.0001, -0.035), V2(0.018, -0.028), V2(0.026, -0.012), V2(0.022, 0.006), V2(0.012, 0.022), V2(0.004, 0.034), V2(0.0001, 0.038)], 16);
    const drops = [0, 1].map(k => {
      const m = mesh(dropGeo, hotMat, false);
      m.visible = false;
      big.add(m);
      return { m, off: k / 2, per: 2.6 + k * 0.6, cyc: -1, from: V3(0, 0, 0) };
    });
    const lumps = [0.22, 0.42].map((u, i) => {
      const m = mesh(dropGeo, moltenMat, false);
      bodyG.add(m);
      return { m, u, k: [1.25, 1.05][i] };
    });
    const blobs = [0, 1, 2].map(k => {
      const m = mesh(new THREE.SphereGeometry(0.075 - k * 0.012, 16, 12), hotMat, false);
      m.visible = false;
      big.add(m);
      return m;
    });
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 1, depthWrite: false });
    const sparks = Array.from({ length: 8 }, (_, k) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.08), sparkMat);
      m.visible = false;
      big.add(m);
      return { m, a: (k / 8) * TAU, v: 0.8 + (k % 3) * 0.35 };
    });
    const trailMat = new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const trail = [0, 1].map(i => {
      const a = new THREE.Mesh(new THREE.TorusGeometry(0.72 + i * 0.08, 0.016, 6, 40, 2.2), trailMat);
      a.visible = false;
      bodyG.add(a);
      return a;
    });
    const motesMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    const motes = Array.from({ length: 10 }, (_, k) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), motesMat);
      m.visible = false;
      big.add(m);
      return { m, a: (k / 10) * TAU * 1.7, off: (k % 5) / 5, r: 0.55 + (k % 3) * 0.15 };
    });

    const food = berry();
    food.visible = false;
    big.add(food);

    const REST_R = V3(-0.74, TIP + 0.5, 0.26);
    const REST_L = V3(0.76, TIP + 0.44, 0.3);
    const L1 = 0.34;
    const L2 = 0.44;

    const applyCore = () => {
      pal = palOf(GLOW[coreType || "steel"]);
      paint();
      const hotC = new THREE.Color().setRGB(pal.hot[0] / 255, pal.hot[1] / 255, pal.hot[2] / 255);
      const deepC = new THREE.Color().setRGB(pal.deep[0] / 255, pal.deep[1] / 255, pal.deep[2] / 255);
      const rimC = new THREE.Color().setRGB(Math.min(1, pal.rim[0] / 255), Math.min(1, pal.rim[1] / 255), Math.min(1, pal.rim[2] / 255));
      coreMat.color.copy(deepC).multiplyScalar(0.6);
      coreMat.emissive.copy(hotC);
      if (!moltenTex) {
        moltenMat.color.copy(hotC);
        moltenMat.emissive.copy(deepC);
        hotMat.color.copy(hotC);
        hotMat.emissive.copy(deepC);
      }
      trailMat.color.copy(hotC);
      sparkMat.color.copy(rimC);
      motesMat.color.copy(rimC);
    };

    applyCore();
    root.traverse(o => {
      if (o.material) [].concat(o.material).forEach(m => m.userData.varHue === undefined && (m.userData.varHue = 0));
    });
    let shinyOn = false;
    const shine = () => {
      shinyOn = true;
      steelMat.color.setHex(0xf6d68e);
      plateMat.color.setHex(0xc89a48);
      darkSteel.color.setHex(0x7a5a2c);
    };

    return {
      root,
      setCore(type) {
        coreType = GLOW[type] ? type : null;
        applyCore();
      },
      update(s) {
        const { t, pointer, blink, lookYaw, lookPitch, action, motion } = s;
        if (root.userData.variant && !shinyOn) shine();
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;

        let hover = Math.sin(t * 1.2) * 0.04 * motion;
        let lean = Math.sin(t * 0.7) * 0.025 * motion;
        let roll = Math.sin(t * 0.9) * 0.02 * motion;
        let spinY = 0;
        let squash = 1;
        let headYaw = lookYaw * 0.5;
        let headPitch = -lookPitch * 0.3;
        let headRoll = 0;
        let mouthK = 0;
        let glow = 0;
        let trailK = 0;
        let pull = 0;
        let flash = 0;
        let open = 0;
        let legK = 0;
        const hR = REST_R.clone().add(V3(0, Math.sin(t * 1.4) * 0.02 * motion, 0));
        const hL = REST_L.clone().add(V3(0, Math.sin(t * 1.4 + 1.2) * 0.025 * motion, 0));
        let holdR = null;

        if (nm === "jump") {
          const c = smooth(0.02, 0.2, p) * (1 - smooth(0.2, 0.3, p));
          const air = Math.sin(Math.PI * smooth(0.22, 0.8, p));
          const land = p > 0.78 ? Math.sin(Math.PI * smooth(0.78, 1, p)) : 0;
          hover += -0.1 * c + 0.65 * air - 0.05 * land;
          squash = 1 - 0.08 * c + 0.05 * air - 0.07 * land;
          hR.lerp(V3(-0.62, TIP + 1.2, 0.12), air);
          hL.lerp(V3(0.64, TIP + 1.16, 0.12), air);
          headPitch -= 0.2 * air;
          mouthK = 0.6 * air;
          legK = air;
        } else if (nm === "eat" && ph) {
          const reach = smooth(0.0, 0.22, p) * (1 - smooth(0.88, 1, p));
          const bring = smooth(0.3, 0.46, p) * (1 - smooth(0.86, 0.98, p));
          hR.lerp(V3(-0.46, TIP + 0.9, 0.62), reach);
          hR.lerp(V3(-0.1, TIP + 1.07, 0.45), bring);
          headPitch += 0.15 * reach * (1 - bring);
          headYaw += -0.22 * reach * (1 - bring);
          mouthK = bring * (0.35 + 0.65 * ph.chew) * (1 - smooth(0.8, 0.9, p));
          if (p > 0.88) mouthK = 0;
        } else if (nm === "swipe") {
          const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.44, p));
          const strike = smooth(0.34, 0.46, p) * (1 - smooth(0.7, 0.95, p));
          hL.lerp(V3(0.8, TIP + 1.2, -0.28), wind);
          hL.lerp(V3(-0.16, TIP + 0.62, 0.85), strike);
          spinY = -0.45 * wind + 0.5 * strike;
          lean = 0.1 * strike - 0.05 * wind;
          trailK = p > 0.36 && p < 0.62 ? Math.sin(Math.PI * smooth(0.36, 0.62, p)) : 0;
          glow = 0.5 * wind + 0.6 * strike;
          open = smooth(0.2, 0.34, p) * (1 - smooth(0.5, 0.7, p));
          mouthK = 0.5 * strike;
        } else if (nm === "fling") {
          const raise = smooth(0.04, 0.35, p) * (1 - smooth(0.4, 0.5, p));
          const throwK = smooth(0.4, 0.5, p) * (1 - smooth(0.72, 0.95, p));
          hL.lerp(V3(0.46, TIP + 1.6, -0.24), raise);
          hL.lerp(V3(0.28, TIP + 0.95, 0.86), throwK);
          lean = -0.08 * raise + 0.14 * throwK;
          spinY = -0.2 * raise + 0.25 * throwK;
          hR.lerp(V3(-0.6, TIP + 0.8, 0.38), raise + throwK);
          glow = 1.2 * raise + 0.6 * throwK;
          open = smooth(0.42, 0.5, p) * (1 - smooth(0.7, 0.9, p));
          headPitch += 0.12 * raise;
          mouthK = 0.7 * throwK;
          hover += 0.06 * raise;
        } else if (nm === "spin") {
          const k = smooth(0.0, 0.15, p) * (1 - smooth(0.85, 1, p));
          spinY = smooth(0.08, 0.9, p) * TAU * 2;
          hover += 0.1 * k;
          hR.lerp(V3(-0.8, TIP + 0.92, 0.0), k);
          hL.lerp(V3(0.8, TIP + 0.92, 0.0), k);
          lean = Math.sin(t * 9) * 0.04 * k;
          roll = Math.cos(t * 9) * 0.04 * k;
          mouthK = 0.5 * k;
          legK = 0.6 * k;
        } else if (nm === "absorb") {
          const up = smooth(0.0, 0.18, p) * (1 - smooth(0.88, 1, p));
          pull = p > 0.18 && p < 0.78 ? smooth(0.18, 0.3, p) * (1 - smooth(0.7, 0.78, p)) : 0;
          const clench = smooth(0.74, 0.8, p) * (1 - smooth(0.9, 1, p));
          flash = p > 0.76 && p < 0.95 ? Math.sin(Math.PI * smooth(0.76, 0.95, p)) : 0;
          hL.lerp(V3(0.42, TIP + 1.02, 0.7), up);
          hL.add(V3(-0.04, 0.03, -0.06).multiplyScalar(clench));
          hR.lerp(V3(-0.62, TIP + 0.78, 0.32), up * 0.5);
          open = pull * (1 - clench);
          headPitch += 0.2 * up;
          headYaw += 0.3 * up;
          lean = 0.05 * up - 0.04 * flash;
          squash = 1 + 0.03 * flash;
          mouthK = 0.3 * pull;
        }

        bodyG.position.y = hover;
        bodyG.rotation.set(lean, spinY, roll);
        bodyG.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
        neck.rotation.set(headPitch * 0.35, headYaw * 0.3, headRoll * 0.3);
        head.rotation.set(headPitch * 0.65, headYaw * 0.7, headRoll * 0.7);
        mouth.scale.set(1, lerp(0.05, 1, mouthK), 1);
        mouth.visible = mouthK > 0.03;
        smile.visible = mouthK < 0.25;
        legs.forEach((g, i) => {
          const sgn = i ? 1 : -1;
          g.rotation.set(Math.sin(t * 1.3 + i * 1.7) * 0.07 * motion - 0.25 * legK, 0, sgn * (Math.sin(t * 1.1 + i) * 0.04 * motion + 0.15 * legK));
        });
        ring.rotation.set(0.12 * Math.sin(t * 0.9), t * 0.9, 0.1 * Math.cos(t * 0.7));
        ring.position.y = TIP + 0.14 + Math.sin(t * 1.6) * 0.025 * motion;

        const close = 1 - blink;
        eyes.forEach(({ g }) => {
          g.scale.y = lerp(1, 0.1, close);
        });
        followPupils(eyes, pointer, 0.5);

        root.updateMatrixWorld(true);

        {
          const A = shoulders[0];
          const r = ik(A, hR, L1, L2, V3(0, -0.6, -0.4));
          const pts = [A.clone(), A.clone().lerp(r.elbow, 0.5), r.elbow, r.elbow.clone().lerp(r.end, 0.5), r.end];
          const c = flexTube(armR, pts, u => 0.08 + 0.01 * Math.sin(u * Math.PI));
          const end = c.getPointAt(1);
          const d = c.getTangentAt(1);
          const { hx, hy } = frame(d);
          handR.position.copy(end);
          handR.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, d));
          holdR = end.clone().addScaledVector(d, 0.09).addScaledVector(hy, 0.1);
        }
        {
          const A = shoulders[1];
          const r = ik(A, hL, L1, L2, V3(0, -0.6, -0.4));
          const pts = [A.clone(), A.clone().lerp(r.elbow, 0.5), r.elbow, r.elbow.clone().lerp(r.end, 0.5), r.end];
          const rad = u => lerp(0.1, 0.086, u);
          const c = flexTube(armL, pts, (u, v) => {
            const a = v * TAU;
            const free = 1 - smooth(0.5, 0.58, u);
            const wob = 1 + (0.045 * Math.sin(a * 2 + u * 5 - t * 2.6) + 0.03 * Math.sin(a * 3 - u * 4 + t * 1.9)) * motion * free;
            const sag = 1 + 0.12 * Math.max(0, -Math.sin(a)) * Math.sin(u * Math.PI) * free;
            return rad(u) * wob * sag;
          }, 48, 18);
          bands.forEach(B => {
            B.m.position.copy(c.getPointAt(B.u));
            B.m.quaternion.setFromUnitVectors(V3(0, 1, 0), c.getTangentAt(B.u));
          });
          const end = c.getPointAt(1);
          const d = c.getTangentAt(1);
          const { hx, hy } = frame(d);
          handL.position.copy(end).addScaledVector(d, 0.05);
          handL.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, d));
          claws.forEach((pv, i) => {
            pv.rotation.x = -0.12 - 0.4 * open + Math.sin(t * 2 + i) * 0.04 * motion;
          });
          thumb.rotation.x = -0.3 * open;
          moltenMat.emissiveIntensity = 0.8 + 0.12 * Math.sin(t * 2.3) * motion + 0.5 * glow;
          hotMat.emissiveIntensity = 0.6 + 0.5 * glow;
          lumps.forEach((L, i) => {
            const q = c.getPointAt(L.u);
            const rr = rad(L.u);
            const w = 1 + 0.2 * Math.sin(t * 2.4 + i * 2) * motion;
            L.m.position.copy(q).add(V3(0, -rr * 0.86 - 0.02 * L.k * w, 0));
            L.m.scale.set(L.k * 1.6, L.k * 1.8 * w, L.k * 1.6);
          });
        }
        if (moltenTex) moltenTex.offset.y = (t * 0.04) % 1;
        coreMat.emissiveIntensity = (1.0 + 0.8 * pull + 1.6 * flash) * (0.85 + 0.15 * Math.sin(t * 2.2));
        moltenMat.emissiveIntensity += 0.5 * pull + 0.8 * flash;
        hotMat.emissiveIntensity += 0.5 * pull + 0.8 * flash;

        trail.forEach(a => {
          a.visible = trailK > 0.02;
          if (!a.visible) return;
          a.position.set(0.2, TIP + 1.2, 0.3);
          a.rotation.set(-0.6, 0.0, -2.44);
          trailMat.opacity = 0.55 * trailK;
        });

        const handBig = big.worldToLocal(handL.getWorldPosition(V3(0, 0, 0)));
        drops.forEach(D => {
          const u = (t / D.per + D.off) % 1;
          const cyc = Math.floor(t / D.per + D.off);
          if (u < 0.62) D.cyc = -1;
          if (nm === "spin" || nm === "absorb") {
            D.m.visible = false;
            return;
          }
          if (u < 0.62) {
            const g = smooth(0.0, 0.62, u);
            D.m.visible = g > 0.05;
            D.m.position.copy(handBig).add(V3(0.0, -0.1 - 0.03 * g, 0.03));
            D.m.scale.set(0.6 + 0.5 * g, 0.55 + 1.0 * g, 0.6 + 0.5 * g);
          } else {
            if (D.cyc !== cyc) {
              D.cyc = cyc;
              D.from.copy(handBig).add(V3(0, -0.13, 0.03));
            }
            const f = (u - 0.62) / 0.38;
            const y = D.from.y - 4.5 * f * f * 0.38 * 0.38 * 4;
            D.m.visible = y > 0.04;
            D.m.position.set(D.from.x, y, D.from.z);
            const k = Math.max(0, 1 - f * 1.1);
            D.m.scale.set(k, 1.6 * k, k);
          }
        });

        blobs.forEach((b, i) => {
          const st = 0.47 + i * 0.03;
          const f = nm === "fling" ? (p - st) / 0.4 : -1;
          b.visible = f > 0 && f < 1;
          if (!b.visible) return;
          const from = V3(0.3, TIP + 1.25, 0.9);
          const dir = V3(-0.15 + i * 0.15, 0, 1);
          b.position.copy(from).addScaledVector(dir, f * 2.6);
          b.position.y += Math.sin(f * Math.PI) * 0.5 - f * 1.0;
          b.scale.set(1, 1 + 0.6 * (1 - f), 1);
          b.rotation.x = f * 3;
        });

        const sparkK = nm === "swipe" ? (p > 0.42 && p < 0.7 ? smooth(0.42, 0.7, p) : -1) : nm === "fling" ? (p > 0.5 && p < 0.8 ? smooth(0.5, 0.8, p) : -1) : -1;
        sparks.forEach(sp => {
          sp.m.visible = sparkK >= 0;
          if (!sp.m.visible) return;
          const r = 0.1 + sparkK * 0.55 * sp.v;
          sp.m.position.copy(handBig).add(V3(Math.cos(sp.a) * r, Math.sin(sp.a) * r * 0.8 - sparkK * sparkK * 0.3, Math.sin(sp.a * 2) * r * 0.4 + 0.1));
          sp.m.lookAt(handBig);
          sparkMat.opacity = 1 - sparkK;
        });

        motes.forEach(M => {
          M.m.visible = pull > 0.02;
          if (!M.m.visible) return;
          const f = (t * 0.9 + M.off) % 1;
          const k = 1 - f;
          const ang = M.a + f * 2.4;
          M.m.position.copy(handBig).add(V3(Math.cos(ang) * M.r * k, Math.sin(ang * 1.3) * M.r * 0.6 * k, Math.abs(Math.sin(ang)) * M.r * k + 0.1 * k));
          M.m.scale.setScalar(0.6 + 0.8 * k);
          motesMat.opacity = 0.9 * pull;
        });

        if (nm === "eat" && ph && holdR) {
          food.visible = ph.visible && p < 0.9;
          const center = big.worldToLocal(bodyG.localToWorld(holdR.clone()));
          const lifted = V3(-0.46, 3.6, 0.7);
          food.position.copy(lifted.lerp(center, ph.fall * ph.fall));
          food.scale.setScalar(0.55 * (1 - 0.8 * ph.bite));
        } else food.visible = false;
      }
    };
  }
});
