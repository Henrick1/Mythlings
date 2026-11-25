Pets.register({
  id: "taloco",
  dex: 49,
  name: "Taloço",
  color: "#6f7780",
  types: ["steel"],
  variants: "types",
  stage: 3,
  move: "fly",
  description: "O núcleo travou de vez e o metal derretido nunca mais esfria. A ponta de baixo virou uma cauda de aço que ele usa como chicote, e as pernas cresceram o bastante para chutar, mas ele ainda prefere pairar acima do chão, olhando todo mundo de cima.",
  actions: {
    jump: { duration: 1.3 },
    eat: { duration: 2.6 },
    swipe: { duration: 1.3 },
    fling: { duration: 1.8 },
    spin: { duration: 1.7 },
    absorb: { duration: 2.2 }
  },
  battle: { attack: { action: "swipe", hit: 0.44, speed: 1.0 }, special: { action: "fling", hit: 0.6, speed: 1.0 } },
  idle: [
    { action: "absorb", min: 20, max: 45 },
    { action: "spin", min: 30, max: 60 },
    { action: "swipe", min: 35, max: 70 },
    { action: "jump", min: 50, max: 95 }
  ],
  clickAction: n => ["swipe", "spin", "absorb", "jump", "fling"][(n - 1) % 5],

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

    const TIP = 0.62;
    const ZS = 0.82;

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
    const castCv = mkCanvas(MW);
    const castGlowCv = mkCanvas(MW);
    const castTex = texOf(castCv);
    const castGlowTex = texOf(castGlowCv);
    const palOf = (hex, wh = 1) => {
      const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
      const mix = (k, w) => c.map(v => lerp(v, 255, w * wh) * k);
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
      if (castCv && castGlowCv) {
        const g = castCv.getContext("2d");
        const g2 = castGlowCv.getContext("2d");
        const img = g.createImageData(MW, MW);
        const img2 = g2.createImageData(MW, MW);
        const d = img.data;
        const d2 = img2.data;
        for (let k = 0; k < MW * MW; k++) {
          const o = k * 4;
          const crack = rimF[k];
          const shade = 172 + noiseF[k] * 1.4 - crustF[k] * 26 + heatF[k] * 14;
          for (let ch = 0; ch < 3; ch++) {
            d[o + ch] = lerp(shade + [0, 3, 8][ch], pal.rim[ch], crack * 0.9);
            d2[o + ch] = pal.rim[ch] * Math.min(1, crack * 1.3);
          }
          d[o + 3] = 255;
          d2[o + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        g2.putImageData(img2, 0, 0);
        castTex.needsUpdate = true;
        castGlowTex.needsUpdate = true;
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

    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x5d646c, roughness: 0.38, metalness: 0.4 });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x8b9199, roughness: 0.4, metalness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fb4c8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x8a3a14, emissive: 0xff7a20, emissiveIntensity: 1, roughness: 0.3, metalness: 0.2, flatShading: true });
    const GLOW = {
      fire: 0xff6a1e, water: 0x1e8cff, grass: 0x18d060, electric: 0xffd400, ice: 0x48f8ff, fighting: 0xff2626,
      poison: 0x9a28ff, ground: 0xc8902a, flying: 0x9c8cff, psychic: 0xff3c78, bug: 0x9ad000, rock: 0xd09018,
      ghost: 0xa64cff, dragon: 0x4020ff, dark: 0xa0081a, steel: 0x8ea0b8, light: 0xfff4c0
    };
    let coreType = null;

    const PROF = new THREE.SplineCurve([V2(0.0, -0.04), V2(0.075, -0.01), V2(0.135, 0.06), V2(0.185, 0.17), V2(0.215, 0.3), V2(0.265, 0.44), V2(0.35, 0.6), V2(0.43, 0.78), V2(0.455, 0.94), V2(0.43, 1.06), V2(0.35, 1.15), V2(0.2, 1.21), V2(0.0, 1.225)]).getPoints(110);
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

    [[1.08, 0.5], [0.97, 0.46], [0.86, 0.42], [0.75, 0.38], [0.64, 0.34]].forEach(([y0, x0]) => {
      const path = vPath(x0, y0, y0 + 0.075, 14);
      const ax = i => Math.abs(path[i][0]) / x0;
      const back = path.map(([a, y]) => [a + Math.PI, y]);
      const g = strip(back.map(([a, y]) => TP(a, y)), back.map(([a, y]) => TN(a, y)), i => 0.032 * (1 - 0.9 * smooth(0.6, 1, ax(i))), i => 0.019 * (1 - 0.6 * smooth(0.7, 1, ax(i))));
      torso.add(mesh(g, plateMat));
    });
    const arc = (pts, w, h) => {
      const K = pts.length - 1;
      return strip(pts.map(([a, y]) => TP(a, y)), pts.map(([a, y]) => TN(a, y)), i => w * (1 - 0.8 * smooth(0.75, 1, Math.abs(i / K - 0.5) * 2)), i => h * (1 - 0.5 * smooth(0.75, 1, Math.abs(i / K - 0.5) * 2)));
    };
    {
      const path = vPath(1.05, 1.0, 1.13, 16);
      const ax = i => Math.abs(path[i][0]) / 1.05;
      torso.add(mesh(strip(path.map(([a, y]) => TP(a, y)), path.map(([a, y]) => TN(a, y)), i => 0.036 * (1 - 0.9 * smooth(0.7, 1, ax(i))), i => 0.022 * (1 - 0.6 * smooth(0.7, 1, ax(i)))), plateMat));
      [[0.5, 0.8], [0.4, 0.72], [0.3, 0.62]].forEach(([y, A]) => {
        const pts = [];
        for (let i = 0; i <= 20; i++) pts.push([lerp(-A, A, i / 20), y + 0.018 * Math.cos(lerp(-1, 1, i / 20) * Math.PI * 0.5)]);
        torso.add(mesh(arc(pts, 0.024, 0.016), plateMat));
      });
      [-1, 1].forEach(sg => {
        const pts = [];
        for (let i = 0; i <= 14; i++) pts.push([sg * Math.PI * 0.5, lerp(0.22, 0.6, i / 14)]);
        torso.add(mesh(arc(pts, 0.022, 0.016), plateMat));
      });
      const belt = mesh(new THREE.TorusGeometry(rOf(0.06) + 0.008, 0.02, 10, 44), darkSteel);
      belt.rotation.x = Math.PI / 2;
      belt.scale.set(1, ZS, 1);
      belt.position.y = 0.06;
      torso.add(belt);
      const collar = mesh(new THREE.TorusGeometry(rOf(1.17) + 0.01, 0.026, 12, 48), darkSteel);
      collar.rotation.x = Math.PI / 2;
      collar.scale.set(1, ZS, 1);
      collar.position.y = 1.17;
      torso.add(collar);
      [-1, 1].forEach(sg => {
        const a = Math.PI + sg * 0.62;
        const base = TP(a, 1.07);
        const n = TN(a, 1.07);
        const sp = mesh(new THREE.ConeGeometry(0.045, 0.2, 4), plateMat);
        sp.position.copy(base).addScaledVector(n, 0.05);
        sp.quaternion.setFromUnitVectors(V3(0, 1, 0), n.clone().add(V3(0, 1.1, 0)).normalize());
        sp.scale.set(1, 1, 0.45);
        torso.add(sp);
      });
    }

    const PY = 0.86;
    const port = new THREE.Group();
    {
      const pr = rOf(PY) * ZS;
      const slope = ((rOf(PY + 0.02) - rOf(PY - 0.02)) / 0.04) * ZS;
      port.position.set(0, PY, pr - 0.006);
      port.rotation.x = Math.atan(slope);
      torso.add(port);
      port.scale.setScalar(1.15);
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

    const SH = 1.03;
    const shoulders = [-1, 1].map(s => V3(s * 0.47, TIP + SH, 0.0));
    shoulders.forEach((p, i) => {
      const m = mesh(new THREE.SphereGeometry(0.14, 28, 20), i ? moltenMat : steelMat);
      m.position.copy(p);
      bodyG.add(m);
    });
    {
      const pad = new THREE.Group();
      pad.position.copy(shoulders[0]).add(V3(-0.01, 0.02, 0));
      pad.rotation.z = 0.35;
      bodyG.add(pad);
      const shell = mesh(new THREE.SphereGeometry(0.175, 32, 16, 0, TAU, 0, Math.PI * 0.42), plateMat);
      shell.scale.set(1, 0.8, 1.05);
      pad.add(shell);
      const rim = mesh(new THREE.TorusGeometry(0.172 * Math.sin(Math.PI * 0.42), 0.014, 8, 40), darkSteel);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.175 * Math.cos(Math.PI * 0.42) * 0.8;
      rim.scale.set(1, 1.05, 1);
      pad.add(rim);
      const sp = mesh(new THREE.ConeGeometry(0.04, 0.16, 4), plateMat);
      sp.position.y = 0.17;
      sp.rotation.z = 0.25;
      sp.scale.set(1, 1, 0.5);
      pad.add(sp);
    }

    {
      const flow = (ctrl, wf, uf) => {
        const c = new THREE.SplineCurve(ctrl.map(([a, y]) => V2(a, y)));
        const sp = c.getSpacedPoints(48);
        const pts = sp.map(q => TP(q.x, q.y));
        torso.add(mesh(strip(pts, sp.map(q => TN(q.x, q.y)), i => wf(i / 48), i => 0.016 * (1 - 0.7 * smooth(0.85, 1, i / 48)), 0.62, i => uf(i / 48)), moltenMat));
      };
      flow([[1.55, 1.07], [1.32, 1.0], [1.05, 0.93], [0.78, 0.89], [0.52, 0.87], [0.3, PY]], u => (0.09 - 0.03 * u) * (1 + 0.16 * Math.sin(u * 17) + 0.1 * Math.sin(u * 31 + 1)), u => lerp(0.45, 1, u));
      flow([[1.05, 0.93], [1.09, 0.85], [1.05, 0.77], [1.08, 0.69]], u => 0.042 * (1 - Math.pow(u, 1.6)) + 0.004, u => lerp(0.55, 0.8, u));
      flow([[0.62, 0.875], [0.64, 0.8], [0.6, 0.72]], u => 0.034 * (1 - Math.pow(u, 1.6)) + 0.004, u => lerp(0.6, 0.85, u));
      flow([[1.55, 1.08], [1.9, 1.08], [2.2, 1.03], [2.42, 0.96], [2.52, 0.87], [2.48, 0.78], [2.38, 0.71]], u => (0.08 - 0.035 * u) * (1 + 0.15 * Math.sin(u * 15 + 2) + 0.1 * Math.sin(u * 29)) * (1 - 0.6 * smooth(0.8, 1, u)) + 0.006, u => lerp(0.5, 0.85, u));
      flow([[2.1, 1.045], [2.14, 0.96], [2.1, 0.88]], u => 0.032 * (1 - Math.pow(u, 1.6)) + 0.004, u => lerp(0.55, 0.8, u));
      flow([[2.4, 0.98], [2.34, 0.91], [2.37, 0.84]], u => 0.028 * (1 - Math.pow(u, 1.6)) + 0.004, u => lerp(0.55, 0.75, u));
    }

    const LEGL = 1.38;
    const buildLeg = (s, L) => {
      const g = new THREE.Group();
      const radL = u => {
        const knee = 0.012 * Math.exp(-Math.pow((u - 0.52) / 0.1, 2));
        const r = u < 0.58 ? lerp(0.1, 0.08, u / 0.58) : 0.08 * (1 - Math.pow((u - 0.58) / 0.42, 1.4));
        return Math.max(0.003, r + knee);
      };
      const { g: geo, c: lc } = tubeGeo([V3(-s * 0.09, 0.07, -0.02), V3(0, 0, 0), V3(s * 0.1, -0.08 * L, 0.06), V3(s * 0.17, -0.22 * L, 0.13), V3(s * 0.2, -0.38 * L, 0.08), V3(s * 0.215, -0.56 * L, -0.01)], radL, 48, 18);
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
        const cap = mesh(new THREE.SphereGeometry(0.068, 22, 16), plateMat);
        cap.scale.set(1, 1.15, 0.42);
        const ksp = mesh(new THREE.ConeGeometry(0.03, 0.09, 4), plateMat);
        ksp.position.copy(onLeg(0.5, 0.02));
        ksp.quaternion.setFromUnitVectors(V3(0, 1, 0), front(0.5).add(V3(0, 0.5, 0)).normalize());
        ksp.scale.set(1, 1, 0.5);
        g.add(ksp);
        cap.position.copy(onLeg(0.52, -0.006));
        cap.quaternion.setFromUnitVectors(V3(0, 0, 1), front(0.52));
        g.add(cap);
        const K = 16;
        const us = Array.from({ length: K + 1 }, (_, i) => lerp(0.6, 0.94, i / K));
        g.add(mesh(strip(us.map(u => onLeg(u, -0.004)), us.map(front), i => 0.032 * (1 - 0.85 * smooth(0.5, 1, i / K)) * (1 - 0.5 * (1 - smooth(0, 0.15, i / K))), i => 0.022 * (1 - 0.6 * smooth(0.6, 1, i / K))), plateMat));
      }
      {
        const side = u => {
          const t = lc.getTangentAt(u);
          const f = V3(s, 0, -0.2);
          return f.addScaledVector(t, -f.dot(t)).normalize();
        };
        const K = 12;
        const us = Array.from({ length: K + 1 }, (_, i) => lerp(0.32, 0.48, i / K));
        g.add(mesh(strip(us.map(u => lc.getPointAt(u).addScaledVector(side(u), radL(u) - 0.004)), us.map(side), i => 0.034 * (1 - 0.7 * smooth(0.6, 1, i / K)), i => 0.016), plateMat));
      }
      return g;
    };
    const legs = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(s * 0.15, TIP + 0.3, 0.03);
      bodyG.add(g);
      g.add(buildLeg(s, LEGL));
      return g;
    });

    const HW = 0.34;
    const HH = 0.31;
    const HD = 0.33;
    const HP = (x, y) => V3(x * HW, y * HH, Math.sqrt(Math.max(0, 1 - x * x - y * y)) * HD);
    const HN = p => V3(p.x / (HW * HW), p.y / (HH * HH), p.z / (HD * HD)).normalize();
    let browFull = null;
    let browHalf = null;
    let crestM = null;
    const neck = new THREE.Group();
    neck.position.set(0, TIP + 1.2, 0);
    bodyG.add(neck);
    const head = new THREE.Group();
    head.position.y = 0.27;
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
      const X = 0.52;
      const Y0 = 0.04;
      const Y1 = 0.5;
      for (let i = 0; i <= K; i++) path.push([lerp(-X, 0, i / K), lerp(Y1, Y0, i / K)]);
      for (let i = 1; i <= K; i++) path.push([lerp(0, X, i / K), lerp(Y0, Y1, i / K)]);
      const surf = path.map(([x, y]) => HP(x, y));
      const nS = surf.map(HN);
      const B = 12;
      const LEN = 0.52;
      const blade = sgn => {
        const E = HP(sgn * X, Y1);
        const n = HN(E);
        const D = V3(sgn, 0.86, -0.38).normalize();
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
      const wf = i => (0.056 * lerp(1, 0.8, ax(i))) * (1 - 0.94 * Math.pow(out(i), 1.2));
      const hf = i => 0.05 * (1 - 0.45 * out(i));
      browFull = mesh(strip(pts, nrm, wf, hf), plateMat);
      head.add(browFull);
      const H = B + K + 2;
      browHalf = mesh(strip(pts.slice(0, H), nrm.slice(0, H), wf, hf), plateMat);
      browHalf.visible = false;
      head.add(browHalf);
    }
    {
      const th0 = Math.asin(0.12);
      const th1 = Math.PI - 0.5;
      const K = 40;
      const pts = [];
      const hs = [];
      for (let i = 0; i <= K; i++) {
        const u = i / K;
        const th = lerp(th0, th1, u);
        pts.push(V3(0, Math.sin(th) * HH, Math.cos(th) * HD));
        hs.push(0.035 + 0.1 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.25)), 0.8) * (1 - smooth(0.75, 1, u)));
      }
      crestM = mesh(strip(pts, pts.map(HN), i => 0.036 * (1 - 0.6 * smooth(0.8, 1, i / K)), i => hs[i], 0.5), plateMat);
      head.add(crestM);
    }
    {
      const K = 20;
      const pts = [];
      for (let i = 0; i <= K; i++) {
        const u = i / K;
        pts.push(HP(lerp(-0.42, 0.42, u), -0.66 - 0.16 * (1 - Math.abs(u - 0.5) * 2)));
      }
      head.add(mesh(strip(pts, pts.map(HN), i => 0.03 * (1 - 0.8 * smooth(0.7, 1, Math.abs(i / K - 0.5) * 2)), i => 0.03), plateMat));
    }
    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      const n = HP(0.34 * s, -0.02);
      const nd = HN(n);
      g.position.copy(n).addScaledVector(nd, -0.05);
      g.quaternion.setFromUnitVectors(V3(0, 0, 1), nd.add(V3(0, 0, 0.9)).normalize());
      head.add(g);
      const tilt = new THREE.Group();
      tilt.rotation.z = s * 0.38;
      tilt.scale.set(1, 0.6, 1);
      g.add(tilt);
      const e = eye({ size: 0.46, whiteColor: 0xf1f2f4, pupilColor: 0x0e1014 });
      e.pupil.scale.multiplyScalar(0.8);
      tilt.add(e.g);
      return { g: e.g, pupil: e.pupil };
    });
    const mouthG = new THREE.Group();
    {
      const p = HP(0, -0.42);
      mouthG.position.copy(p).addScaledVector(HN(p), 0.002);
      mouthG.quaternion.setFromUnitVectors(V3(0, 0, 1), HN(p));
      head.add(mouthG);
    }
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), mouthMat);
    mouthG.add(mouth);
    const smile = mesh(new THREE.TorusGeometry(0.1, 0.011, 6, 24, 0.75), mouthMat, false);
    smile.rotation.z = (Math.PI - 0.75) / 2;
    smile.position.y = -0.095;
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
      const mitt = mesh(new THREE.SphereGeometry(0.135, 28, 20), steelMat);
      mitt.scale.set(1.1, 0.74, 1.18);
      mitt.position.z = 0.1;
      handR.add(mitt);
      const knuck = mesh(new THREE.SphereGeometry(0.12, 28, 12, 0, TAU, 0, Math.PI * 0.4), plateMat);
      knuck.scale.set(1.12, 0.6, 1.15);
      knuck.position.set(0, 0.04, 0.1);
      handR.add(knuck);
      const th = new THREE.Group();
      th.position.set(0.11, 0.016, 0.06);
      th.rotation.set(-0.3, 0.75, 0);
      handR.add(th);
      const tm = mesh(new THREE.SphereGeometry(0.05, 18, 14), steelMat);
      tm.scale.set(0.95, 0.85, 1.6);
      tm.position.z = 0.045;
      th.add(tm);
    }

    const fore = mesh(new THREE.LatheGeometry([V2(0.098, -0.11), V2(0.116, -0.108), V2(0.124, -0.09), V2(0.13, 0.0), V2(0.124, 0.08), V2(0.116, 0.104), V2(0.098, 0.108)], 36), plateMat);
    bodyG.add(fore);
    const foreRims = [0, 1].map(() => {
      const r = mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 32), darkSteel);
      bodyG.add(r);
      return r;
    });
    const socket = new THREE.Group();
    socket.position.copy(shoulders[1]);
    bodyG.add(socket);
    {
      const r1 = mesh(new THREE.TorusGeometry(0.135, 0.022, 10, 40), darkSteel);
      r1.rotation.y = Math.PI / 2;
      r1.position.x = 0.03;
      socket.add(r1);
      const r2 = mesh(new THREE.TorusGeometry(0.1, 0.016, 8, 32), plateMat);
      r2.rotation.y = Math.PI / 2;
      r2.position.x = 0.1;
      socket.add(r2);
    }

    const dropGeo = new THREE.LatheGeometry([V2(0.0001, -0.035), V2(0.018, -0.028), V2(0.026, -0.012), V2(0.022, 0.006), V2(0.012, 0.022), V2(0.004, 0.034), V2(0.0001, 0.038)], 16);
    const drops = [0, 1].map(k => {
      const m = mesh(dropGeo, hotMat, false);
      m.visible = false;
      big.add(m);
      return { m, off: k / 2, per: 2.6 + k * 0.6, cyc: -1, from: V3(0, 0, 0) };
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
      const a = new THREE.Mesh(new THREE.TorusGeometry(0.84 + i * 0.09, 0.018, 6, 40, 2.2), trailMat);
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

    const tailM = dyn(steelMat);
    const tailRings = [0.2, 0.36, 0.52, 0.68].map(u => {
      const m = mesh(new THREE.TorusGeometry(1, 0.13, 8, 28), darkSteel);
      bodyG.add(m);
      return { m, u };
    });
    const tailFins = [0.28, 0.44, 0.6].map((u, i) => {
      const m = mesh(new THREE.ConeGeometry(0.035 - i * 0.006, 0.12 - i * 0.02, 4), plateMat);
      m.scale.set(1, 1, 0.4);
      bodyG.add(m);
      return { m, u };
    });
    const tailTip = new THREE.Group();
    bodyG.add(tailTip);
    {
      const blade = mesh(new THREE.ConeGeometry(0.075, 0.26, 4), plateMat);
      blade.rotation.x = Math.PI / 2;
      blade.position.z = 0.11;
      blade.scale.set(1, 1, 0.35);
      tailTip.add(blade);
      [-1, 1].forEach(sg => {
        const barb = mesh(new THREE.ConeGeometry(0.03, 0.13, 4), plateMat);
        barb.position.set(sg * 0.06, 0, 0.0);
        barb.rotation.set(-Math.PI / 2, 0, -sg * 0.75);
        barb.scale.set(1, 1, 0.4);
        tailTip.add(barb);
      });
      const collarT = mesh(new THREE.TorusGeometry(0.032, 0.012, 8, 20), darkSteel);
      tailTip.add(collarT);
    }
    const tailRad = u => Math.max(0.006, lerp(0.12, 0.024, Math.pow(u, 0.85)));
    const baseTailParts = tailTip.children.slice();

    const castMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: castTex, emissive: 0xffffff, emissiveMap: castGlowTex, emissiveIntensity: 0.9, roughness: 0.32, metalness: 0.55 });
    if (!moltenTex) castMat.color.set(0x6e757d);
    const REST_R = V3(-0.86, TIP + 0.56, 0.3);
    const REST_L = V3(0.64, TIP + 0.2, 0.2);
    const L1 = 0.4;
    const L2 = 0.5;
    const PLATE = 0x8b9199;
    const PLATE_SHINY = 0xc89a48;

    const makeKit = () => {
      const parts = [];
      const add = (parent, m) => {
        parent.add(m);
        parts.push(m);
        return m;
      };
      const set = on => parts.forEach(m => (m.visible = on));
      return { parts, add, set };
    };
    const moltenArm = (m, A, target, t, motion, rad, rigidFrom = 0.5) => {
      const r = ik(A, target, L1, L2, V3(0, -0.5, -0.5));
      const pts = [A.clone(), A.clone().lerp(r.elbow, 0.5), r.elbow, r.elbow.clone().lerp(r.end, 0.5), r.end];
      return flexTube(m, pts, (u, v) => {
        const a = v * TAU;
        const free = 1 - smooth(rigidFrom, rigidFrom + 0.12, u);
        const wob = 1 + (0.045 * Math.sin(a * 2 + u * 5 - t * 2.6) + 0.03 * Math.sin(a * 3 - u * 4 + t * 1.9)) * motion * free;
        const sag = 1 + 0.1 * Math.max(0, -Math.sin(a)) * Math.sin(u * Math.PI) * free;
        return rad(u) * wob * sag;
      }, 48, 18);
    };
    const onHeadRing = (y, a) => {
      const r = Math.sqrt(1 - y * y);
      return V3(Math.sin(a) * r * HW, y * HH, Math.cos(a) * r * HD);
    };

    const hammerKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const grips = [0.66, 0.76, 0.86].map(() => add(bodyG, mesh(new THREE.TorusGeometry(1, 0.16, 8, 28), castMat)));
      const hammer = add(bodyG, new THREE.Group());
      const hamIn = new THREE.Group();
      hamIn.scale.setScalar(1.6);
      hammer.add(hamIn);
      {
        const prof = [V2(0.0001, -0.3), V2(0.13, -0.3), V2(0.15, -0.285), V2(0.152, -0.25), V2(0.13, -0.22), V2(0.112, -0.17), V2(0.104, -0.06), V2(0.112, 0), V2(0.104, 0.06), V2(0.112, 0.17), V2(0.13, 0.22), V2(0.152, 0.25), V2(0.15, 0.285), V2(0.13, 0.3), V2(0.0001, 0.3)];
        const g = new THREE.LatheGeometry(prof, 8);
        g.rotateY(Math.PI / 8);
        hamIn.add(mesh(g, castMat));
        [-0.205, 0.205].forEach(y => {
          const r = mesh(new THREE.TorusGeometry(0.125, 0.016, 6, 8), darkSteel);
          r.rotation.x = Math.PI / 2;
          r.rotation.z = Math.PI / 8;
          r.position.y = y;
          hamIn.add(r);
        });
        const collar = mesh(new THREE.TorusGeometry(0.1, 0.026, 10, 24), castMat);
        collar.position.z = -0.1;
        hamIn.add(collar);
        const pike = mesh(new THREE.ConeGeometry(0.06, 0.2, 6), castMat);
        pike.rotation.x = Math.PI / 2;
        pike.position.z = 0.2;
        hamIn.add(pike);
        [-1, 1].forEach(sg => {
          const st = mesh(new THREE.ConeGeometry(0.035, 0.1, 4), castMat);
          st.position.set(sg * 0.12, 0, 0);
          st.rotation.z = -sg * Math.PI / 2;
          hamIn.add(st);
        });
      }
      const crown = add(head, new THREE.Group());
      {
        const N = 30;
        const pts = [];
        for (let i = 0; i <= N; i++) pts.push(onHeadRing(0.42, lerp(Math.PI * 0.52, Math.PI * 1.48, i / N)));
        crown.add(mesh(strip(pts, pts.map(HN), i => 0.03 * (1 - 0.7 * smooth(0.85, 1, Math.abs(i / N - 0.5) * 2)), i => 0.026), castMat));
        [0.62, 0.81, 1.0, 1.19, 1.38].forEach((f, i) => {
          const pnt = onHeadRing(0.42, Math.PI * f);
          const n = HN(pnt);
          const len = i === 2 ? 0.3 : i === 1 || i === 3 ? 0.24 : 0.17;
          const sp = mesh(new THREE.ConeGeometry(0.036, len, 5), castMat);
          sp.position.copy(pnt).addScaledVector(n, 0.01).add(V3(0, len * 0.42, 0));
          sp.quaternion.setFromUnitVectors(V3(0, 1, 0), n.clone().add(V3(0, 1.6, 0)).normalize());
          crown.add(sp);
        });
      }
      const rays = add(port, new THREE.Group());
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        const r = mesh(new THREE.ConeGeometry(0.036, 0.13, 4), castMat);
        r.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, -0.008);
        r.rotation.z = a - Math.PI / 2;
        r.scale.set(1, 1, 0.4);
        rays.add(r);
      }
      const pad = add(socket, new THREE.Group());
      {
        pad.position.set(0.02, 0.03, 0);
        pad.rotation.z = -0.35;
        const shell = mesh(new THREE.SphereGeometry(0.19, 32, 16, 0, TAU, 0, Math.PI * 0.42), castMat);
        shell.scale.set(1, 0.78, 1.05);
        pad.add(shell);
        [-0.08, 0, 0.08].forEach((z, i) => {
          const sp = mesh(new THREE.ConeGeometry(0.035, i === 1 ? 0.19 : 0.14, 5), castMat);
          sp.position.set(0.02, 0.15, z);
          sp.rotation.set(z * 2.2, 0, -0.35);
          pad.add(sp);
        });
      }
      const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 48), trailMat);
      wave.rotation.x = Math.PI / 2;
      wave.visible = false;
      big.add(wave);
      return {
        set: on => {
          K.set(on);
          if (!on) wave.visible = false;
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0xc8a050 : 0x8a7458);
        },
        rest() {},
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.32, p) * (1 - smooth(0.34, 0.42, p));
            const strike = smooth(0.34, 0.44, p) * (1 - smooth(0.72, 0.95, p));
            S.hL.lerp(V3(0.42, TIP + 1.95, -0.32), wind);
            S.hL.lerp(V3(0.22, TIP + 0.5, 0.95), strike);
            S.lean = -0.1 * wind + 0.18 * strike;
            S.spinY = 0.15 * wind - 0.2 * strike;
            S.trailK = p > 0.34 && p < 0.56 ? Math.sin(Math.PI * smooth(0.34, 0.56, p)) : 0;
            S.glow = 0.5 * wind + 0.7 * strike;
            S.impact = p > 0.43 && p < 0.6 ? 1 - smooth(0.43, 0.6, p) : 0;
            S.swingK = smooth(0.02, 0.18, p) * (1 - smooth(0.82, 0.98, p));
            S.sparkK = p > 0.42 && p < 0.7 ? smooth(0.42, 0.7, p) : -1;
            S.headPitch += 0.15 * strike;
            S.mouthK = 0.6 * strike;
            return true;
          }
          if (nm === "fling") {
            const raise = smooth(0.04, 0.36, p) * (1 - smooth(0.4, 0.48, p));
            const slam = smooth(0.4, 0.48, p) * (1 - smooth(0.78, 0.98, p));
            S.hL.lerp(V3(0.3, TIP + 2.0, 0.05), raise);
            S.hL.lerp(V3(0.3, TIP - 0.05, 0.85), slam);
            S.hR.lerp(V3(-0.82, TIP + 1.2, 0.2), raise);
            S.lean = -0.14 * raise + 0.3 * slam;
            S.hover += 0.18 * raise - 0.12 * slam;
            S.squash = 1 + 0.05 * raise - 0.06 * slam;
            S.glow = 1.2 * raise + 0.8 * slam;
            S.flash = 0.6 * raise + 0.6 * slam;
            S.waveK = p > 0.46 && p < 0.92 ? smooth(0.46, 0.92, p) : -1;
            S.impact = p > 0.46 && p < 0.66 ? 1 - smooth(0.46, 0.66, p) : 0;
            S.swingK = smooth(0.02, 0.18, p) * (1 - smooth(0.82, 0.98, p));
            S.sparkK = p > 0.46 && p < 0.76 ? smooth(0.46, 0.76, p) : -1;
            S.headPitch += 0.2 * slam - 0.1 * raise;
            S.mouthK = 0.8 * slam;
            S.legK = 0.5 * raise;
            return true;
          }
          if (nm === "spin") S.hL.lerp(V3(0.95, TIP + 0.95, 0.0), S.spinK);
          if (nm === "jump") S.hL.lerp(V3(0.8, TIP + 0.9, 0.2), S.air);
          return false;
        },
        arm(S, t, motion) {
          const rad = u => lerp(0.125, 0.082, smooth(0.35, 0.7, u));
          const c = moltenArm(arm, shoulders[1], S.hL, t, motion, rad);
          [0.66, 0.76, 0.86].forEach((u, i) => {
            grips[i].position.copy(c.getPointAt(u));
            grips[i].quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(u));
            grips[i].scale.setScalar(rad(u) + 0.006);
          });
          const end = c.getPointAt(1);
          const d = c.getTangentAt(1);
          const { hx, hy } = frame(d);
          hammer.position.copy(end).addScaledVector(d, 0.19);
          hammer.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, d));
          hammer.rotateZ((Math.PI / 2) * (1 - S.swingK));
        },
        fx(S, nm) {
          const at = big.worldToLocal(hammer.getWorldPosition(V3(0, 0, 0)));
          if (nm === "swipe")
            trail.forEach((a, i) => {
              a.position.copy(shoulders[1]);
              a.rotation.set(0, Math.PI / 2, 0.75 + i * 0.05);
              a.scale.setScalar(1.15 + i * 0.05);
            });
          wave.visible = S.waveK >= 0;
          if (wave.visible) {
            wave.position.set(at.x, 0.04, at.z);
            wave.scale.set(0.2 + S.waveK * 1.6, 0.2 + S.waveK * 1.6, 1 + S.waveK);
            S.trailOpacity = 0.7 * (1 - S.waveK);
          }
          return at;
        },
        hide() {
          wave.visible = false;
        }
      };
    })();

    const redMat = new THREE.MeshStandardMaterial({ color: 0xb3241b, roughness: 0.42, metalness: 0.25 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x9c1c16, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
    const flameCore = new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    const flameGeo = new THREE.LatheGeometry([V2(0.0001, 0), V2(0.04, 0.03), V2(0.05, 0.09), V2(0.038, 0.17), V2(0.018, 0.25), V2(0.0001, 0.31)], 10);

    const swordKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const wraps = [0.7, 0.8, 0.9].map(() => add(bodyG, mesh(new THREE.TorusGeometry(1, 0.18, 8, 28), redMat)));
      const sword = add(bodyG, new THREE.Group());
      const BL = 1.3;
      const halfW = u => (u < 0.06 ? 0.062 : u < 0.1 ? lerp(0.062, 0.098, (u - 0.06) / 0.04) : u < 0.8 ? lerp(0.098, 0.084, (u - 0.1) / 0.7) : 0.084 * (1 - Math.pow((u - 0.8) / 0.2, 1.3)));
      {
        const sh = new THREE.Shape();
        const N = 24;
        sh.moveTo(-0.062, 0);
        for (let i = 1; i <= N; i++) {
          const u = i / N;
          sh.lineTo(-halfW(u) - 0.0001, u * BL);
        }
        for (let i = N - 1; i >= 0; i--) {
          const u = i / N;
          sh.lineTo(halfW(u) + 0.0001, u * BL);
        }
        sh.lineTo(-0.062, 0);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 1, curveSegments: 4 });
        g.translate(0, 0, -0.015);
        g.rotateX(Math.PI / 2);
        sword.add(mesh(g, castMat));
        [-1, 1].forEach(sg => {
          const fu = mesh(new THREE.BoxGeometry(0.02, 0.006, BL * 0.62), darkSteel);
          fu.position.set(0, sg * 0.03, BL * 0.42);
          sword.add(fu);
        });
        const sleeve = (() => {
          const g = new THREE.LatheGeometry([V2(0.097, -0.1), V2(0.104, -0.06), V2(0.1, -0.02), V2(0.088, 0.02), V2(0.074, 0.055), V2(0.066, 0.085)], 32);
          const q = g.attributes.position;
          for (let i = 0; i < q.count; i++) {
            const k = smooth(-0.06, 0.07, q.getY(i));
            q.setZ(i, q.getZ(i) * lerp(1, 0.42, k));
          }
          g.rotateX(Math.PI / 2);
          g.computeVertexNormals();
          return mesh(g, castMat);
        })();
        sword.add(sleeve);
        const guard = (() => {
          const pts = [V3(-0.28, 0, 0.2), V3(-0.22, 0, 0.12), V3(-0.13, 0, 0.085), V3(0, 0, 0.072), V3(0.13, 0, 0.085), V3(0.22, 0, 0.12), V3(0.28, 0, 0.2)];
          const { g } = tubeGeo(pts, u => 0.006 + 0.036 * Math.pow(Math.sin(Math.PI * u), 0.75), 40, 14);
          g.scale(1, 0.75, 1);
          return mesh(g, redMat);
        })();
        sword.add(guard);
        const gem = mesh(new THREE.OctahedronGeometry(0.03, 0), coreMat, false);
        gem.position.set(0, 0.028, 0.072);
        gem.scale.set(1, 0.55, 1);
        sword.add(gem);
      }
      const flames = [];
      for (let i = 0; i < 18; i++) {
        const sg = i % 2 ? 1 : -1;
        const u = 0.1 + (Math.floor(i / 2) / 8) * 0.84;
        const o = add(sword, new THREE.Group());
        const outer = mesh(flameGeo, flameMat, false);
        const inner = mesh(flameGeo, flameCore, false);
        inner.scale.setScalar(0.55);
        inner.position.y = 0.01;
        o.add(outer, inner);
        flames.push({ o, u, sg, ph: i * 1.7 });
      }
      const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.07, 8, 40, Math.PI * 0.9), flameMat);
      crescent.visible = false;
      big.add(crescent);
      const plume = add(head, new THREE.Group());
      {
        [[-0.55, 0.62, 0.22, -0.35], [0, 0.5, 0.3, 0], [0.55, 0.62, 0.22, 0.35]].forEach(([a, y, len, tilt]) => {
          const pnt = onHeadRing(y, Math.PI + a);
          const n = HN(pnt);
          const f = mesh(flameGeo, redMat);
          f.scale.set(1.3, len / 0.31 * 1.6, 1.3);
          f.position.copy(pnt).addScaledVector(n, -0.01);
          f.quaternion.setFromUnitVectors(V3(0, 1, 0), n.clone().add(V3(tilt, 1.4, -0.6)).normalize());
          plume.add(f);
        });
        const N = 30;
        const pts = [];
        for (let i = 0; i <= N; i++) pts.push(onHeadRing(0.36, lerp(Math.PI * 0.5, Math.PI * 1.5, i / N)));
        plume.add(mesh(strip(pts, pts.map(HN), i => 0.034 * (1 - 0.7 * smooth(0.85, 1, Math.abs(i / N - 0.5) * 2)), i => 0.024), redMat));
      }
      const emblem = add(port, new THREE.Group());
      for (let k = 0; k < 5; k++) {
        const a = Math.PI / 2 + ((k - 2) * Math.PI) / 4.2;
        const f = mesh(flameGeo, redMat);
        f.scale.set(0.9, 0.62, 0.5);
        f.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.01);
        f.rotation.z = a - Math.PI / 2;
        emblem.add(f);
      }
      const baldric = add(torso, new THREE.Group());
      {
        const N = 40;
        const ctrl = [[-1.25, 1.12], [-0.8, 0.92], [-0.35, 0.7], [0.2, 0.5], [0.75, 0.36], [1.25, 0.28]];
        const c = new THREE.SplineCurve(ctrl.map(([a, y]) => V2(a, y)));
        const sp = c.getSpacedPoints(N);
        baldric.add(mesh(strip(sp.map(q => TP(q.x, q.y)), sp.map(q => TN(q.x, q.y)), () => 0.05, () => 0.026), clothMat));
        [0.25, 0.55, 0.8].forEach(u => {
          const q = c.getPointAt(u);
          const st = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 12), castMat);
          st.position.copy(TP(q.x, q.y)).addScaledVector(TN(q.x, q.y), 0.03);
          st.quaternion.setFromUnitVectors(V3(0, 1, 0), TN(q.x, q.y));
          baldric.add(st);
        });
      }
      const sash = add(torso, new THREE.Group());
      {
        const tor = mesh(new THREE.TorusGeometry(rOf(0.06) + 0.026, 0.03, 10, 44), clothMat);
        tor.rotation.x = Math.PI / 2;
        tor.scale.set(1, ZS, 1);
        tor.position.y = 0.06;
        sash.add(tor);
      }
      const tails = [-1, 1].map(sg => {
        const m = dyn(clothMat);
        K.parts.push(m);
        return { m, sg };
      });
      const pad = add(socket, new THREE.Group());
      {
        pad.position.set(0.02, 0.03, 0);
        pad.rotation.z = -0.35;
        [0, 1, 2].forEach(i => {
          const sh = mesh(new THREE.SphereGeometry(0.2 - i * 0.03, 32, 12, 0, TAU, 0, Math.PI * 0.36), i === 1 ? castMat : redMat);
          sh.scale.set(1, 0.7, 1.05);
          sh.position.set(0.03 * i, -0.045 * i, 0);
          pad.add(sh);
        });
        const f = mesh(flameGeo, castMat);
        f.scale.setScalar(0.8);
        f.position.set(0.02, 0.12, 0);
        f.rotation.z = -0.3;
        pad.add(f);
      }
      const slashQ = (() => {
        const A = V3(0.51, 1.47, -0.53).normalize();
        const B = V3(-1.56, -0.71, 1.23).normalize();
        const n = A.clone().cross(B).normalize();
        const y = n.clone().cross(A).normalize();
        return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(A, y, n));
      })();
      let dir = V3(0, -1, 0);
      const want = V3(0, -1, 0);
      return {
        set: on => {
          K.set(on);
          if (!on) crescent.visible = false;
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0xc0402a : 0xa8231b);
        },
        rest(S, t, motion) {
          S.hL.set(0.5, TIP + 0.62, 0.5).add(V3(0, Math.sin(t * 1.4 + 1.2) * 0.02 * motion, 0));
          want.set(-0.35, -0.62, 0.7);
          S.hR.set(-0.6, TIP + 0.98, 0.5).add(V3(0, Math.sin(t * 1.4) * 0.015 * motion, 0));
          S.lean += 0.1;
          S.spinY -= 0.22;
          S.headPitch += 0.14;
          S.headYaw += 0.16;
          S.legK = 0.25;
        },
        act(nm, p, S, t) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.42, p));
            const strike = smooth(0.34, 0.46, p) * (1 - smooth(0.72, 0.95, p));
            S.hL.lerp(V3(0.66, TIP + 1.72, -0.12), wind);
            want.lerp(V3(0.35, 0.85, -0.45), wind);
            S.hL.lerp(V3(-0.28, TIP + 0.72, 0.78), strike);
            want.lerp(V3(-0.8, -0.4, 0.45), strike);
            S.spinY += 0.35 * wind - 0.6 * strike;
            S.lean += -0.06 * wind + 0.12 * strike;
            S.trailK = p > 0.34 && p < 0.6 ? Math.sin(Math.PI * smooth(0.34, 0.6, p)) : 0;
            S.glow = 0.6 * wind + 0.8 * strike;
            S.impact = p > 0.4 && p < 0.6 ? 1 - smooth(0.4, 0.6, p) : 0;
            S.burn = 0.6 * wind + 1.0 * strike;
            S.mouthK = 0.6 * strike;
            return true;
          }
          if (nm === "fling") {
            const raise = smooth(0.04, 0.36, p) * (1 - smooth(0.4, 0.48, p));
            const cut = smooth(0.4, 0.5, p) * (1 - smooth(0.78, 0.98, p));
            S.hL.lerp(V3(0.3, TIP + 1.95, 0.2), raise);
            want.lerp(V3(0.05, 1, 0.1), raise);
            S.hL.lerp(V3(0.18, TIP + 0.72, 0.92), cut);
            want.lerp(V3(-0.05, -0.55, 0.85), cut);
            S.hR.lerp(V3(-0.8, TIP + 1.15, 0.1), raise);
            S.spinY += 0.22 * raise - 0.1 * cut;
            S.lean += -0.12 * raise + 0.18 * cut;
            S.hover += 0.12 * raise;
            S.glow = 1.4 * raise + 0.8 * cut;
            S.flash = 0.8 * raise + 0.5 * cut;
            S.burn = 1.6 * raise + 0.8 * cut;
            S.waveK = p > 0.46 && p < 0.95 ? smooth(0.46, 0.95, p) : -1;
            S.headPitch += 0.12 * cut - 0.12 * raise;
            S.mouthK = 0.8 * cut;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(0.92, TIP + 1.0, 0.1), S.spinK);
            want.lerp(V3(1, 0.05, 0.1), S.spinK);
            S.burn = S.spinK;
          }
          if (nm === "jump") {
            S.hL.lerp(V3(0.62, TIP + 1.5, -0.1), S.air);
            want.lerp(V3(0.3, 0.9, -0.3), S.air);
          }
          return false;
        },
        arm(S, t, motion) {
          const A = shoulders[1];
          const r = ik(A, S.hL, L1, L2, V3(0, -0.5, -0.5));
          dir.lerp(want.clone().normalize(), 0.5).normalize();
          const stubEnd = r.elbow.clone().addScaledVector(dir, 0.2);
          const pts = [A.clone(), A.clone().lerp(r.elbow, 0.5), r.elbow.clone().addScaledVector(dir, -0.02), r.elbow.clone().addScaledVector(dir, 0.1), stubEnd];
          const rad = u => lerp(0.125, 0.092, smooth(0.35, 0.65, u));
          const c = flexTube(arm, pts, (u, v) => {
            const a = v * TAU;
            const free = 1 - smooth(0.5, 0.62, u);
            const wob = 1 + (0.045 * Math.sin(a * 2 + u * 5 - t * 2.6) + 0.03 * Math.sin(a * 3 - u * 4 + t * 1.9)) * motion * free;
            const sag = 1 + 0.1 * Math.max(0, -Math.sin(a)) * Math.sin(u * Math.PI) * free;
            return rad(u) * wob * sag;
          }, 48, 18);
          [0.72, 0.82, 0.92].forEach((u, i) => {
            wraps[i].position.copy(c.getPointAt(u));
            wraps[i].quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(u));
            wraps[i].scale.setScalar(rad(u) + 0.008);
          });
          const z = dir.clone();
          let x = V3(0, 1, 0).cross(z);
          if (x.lengthSq() < 1e-3) x = V3(1, 0, 0);
          x.normalize();
          const y = z.clone().cross(x).normalize();
          sword.position.copy(stubEnd).addScaledVector(dir, 0.02);
          sword.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
          sword.updateMatrixWorld(true);
          const inv = new THREE.Quaternion().copy(sword.getWorldQuaternion(new THREE.Quaternion())).invert();
          const upL = V3(0, 1, 0).applyQuaternion(inv);
          const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), upL);
          flames.forEach(F => {
            const fl = 0.75 + 0.25 * Math.sin(t * 11 + F.ph) + 0.12 * Math.sin(t * 23 + F.ph * 2);
            const big2 = 0.8 + 0.7 * (S.burn || 0);
            F.o.position.set(F.sg * (halfW(F.u) + 0.008), 0, F.u * BL);
            F.o.quaternion.copy(q);
            F.o.scale.set(0.9 * big2, fl * big2 * lerp(1.1, 0.7, F.u), 0.9 * big2);
          });
          flameMat.opacity = 0.75 + 0.15 * Math.sin(t * 17);
          tails.forEach(T => {
            const base = TP(1.15 + T.sg * 0.16, 0.05).add(V3(0, TIP, 0));
            const sw = Math.sin(t * 1.6 + T.sg) * 0.05 * motion;
            const pts = [base, base.clone().add(V3(T.sg * 0.03 + sw, -0.18, 0.06)), base.clone().add(V3(T.sg * 0.05 + sw * 2, -0.38, 0.05)), base.clone().add(V3(T.sg * 0.06 + sw * 3, -0.56, 0.02))];
            flexTube(T.m, pts, u => 0.034 * (1 - 0.3 * u), 16, 6);
          });
        },
        fx(S, nm, p) {
          const tipBig = big.worldToLocal(sword.localToWorld(V3(0, 0, BL * 0.7)));
          if (nm === "swipe")
            trail.forEach((a, i) => {
              a.position.copy(shoulders[1]);
              a.quaternion.copy(slashQ);
              a.scale.setScalar(1.7 + i * 0.08);
            });
          crescent.visible = S.waveK >= 0;
          if (crescent.visible) {
            const f = S.waveK;
            const sc = 0.6 + f * 0.9;
            crescent.position.set(0.15 - 0.75 * sc, 1.15 + 0.15 * f, 0.6 + f * 2.8);
            crescent.rotation.set(0, 0, -Math.PI * 0.45);
            crescent.scale.setScalar(sc);
            crescent.material.opacity = 0.9 * (1 - f);
          }
          S.sparkK = nm === "swipe" ? (p > 0.4 && p < 0.7 ? smooth(0.4, 0.7, p) : -1) : nm === "fling" ? (p > 0.46 && p < 0.76 ? smooth(0.46, 0.76, p) : -1) : -1;
          return tipBig;
        },
        hide() {
          crescent.visible = false;
        }
      };
    })();

    const memMat = new THREE.MeshStandardMaterial({ color: 0x3aa8e0, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false });
    const splashMat = new THREE.MeshBasicMaterial({ color: 0x7ad0ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
    const finGeo = (spines, R, a0, a1) => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      for (let i = 0; i < spines; i++) {
        const a = lerp(a0, a1, i / (spines - 1));
        const r = R * (1 - 0.25 * Math.abs(i / (spines - 1) - 0.4));
        sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        if (i < spines - 1) {
          const am = lerp(a0, a1, (i + 0.5) / (spines - 1));
          sh.lineTo(Math.cos(am) * r * 0.72, Math.sin(am) * r * 0.72);
        }
      }
      sh.lineTo(0, 0);
      return { g: new THREE.ShapeGeometry(sh), tips: Array.from({ length: spines }, (_, i) => {
        const a = lerp(a0, a1, i / (spines - 1));
        const r = R * (1 - 0.25 * Math.abs(i / (spines - 1) - 0.4));
        return V3(Math.cos(a) * r, Math.sin(a) * r, 0);
      }) };
    };
    const fin = (parent, spines, R, a0, a1, X, Y, at) => {
      const g = new THREE.Group();
      const Z = X.clone().cross(Y).normalize();
      const Yo = Z.clone().cross(X).normalize();
      g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X.clone().normalize(), Yo, Z));
      g.position.copy(at);
      parent.add(g);
      const F = finGeo(spines, R, a0, a1);
      g.add(mesh(F.g, memMat, false));
      F.tips.forEach(tp => {
        const { g: sg } = tubeGeo([V3(0, 0, 0), tp.clone().multiplyScalar(0.5), tp.clone().multiplyScalar(1.04)], u => lerp(0.013, 0.003, u), 10, 6);
        g.add(mesh(sg, plateMat));
      });
      return g;
    };

    const moltenGrip = (len, rs, rc, sd) => {
      const g = new THREE.Group();
      const N = 9;
      const pts = Array.from({ length: N }, (_, i) => V3(0, 0, lerp(-len / 2, len / 2, i / (N - 1))));
      const sleeve = tubeGeo(pts, (u, v) => {
        const a = v * TAU;
        const b = Math.pow(Math.sin(Math.PI * u), 2.2);
        const n = 1 + (0.13 * Math.sin(a * 3 + u * 7 + sd) + 0.08 * Math.sin(a * 5 - u * 11 + sd * 2)) * b;
        return (rs + 0.002 + (rc - rs) * b * (0.85 + 0.15 * Math.sin(u * 9 + sd))) * n;
      }, 40, 20).g;
      g.add(mesh(sleeve, moltenMat));
      [[0.4, 1, 0.12], [2.3, -1, 0.1], [3.6, 1, 0.08], [5.1, -1, 0.14], [1.3, -1, 0.06]].forEach(([a0, sg, l], k) => {
        const z0 = sg * len * 0.3;
        const rv = Array.from({ length: 6 }, (_, i) => {
          const f = i / 5;
          const a = a0 + sd * 0.1 + 0.2 * f * (k % 2 ? 1 : -1);
          const r = rs + 0.002;
          return V3(Math.cos(a) * r, Math.sin(a) * r, z0 + sg * (len * 0.2 + l * f));
        });
        g.add(mesh(tubeGeo(rv, u => lerp(0.017, 0.011, u), 16, 8).g, moltenMat));
        const bead = mesh(new THREE.SphereGeometry(0.014, 12, 10), moltenMat, false);
        bead.position.copy(rv[5]);
        bead.scale.set(1, 1, 1.3);
        g.add(bead);
      });
      const drip = mesh(dropGeo, moltenMat, false);
      drip.position.set(0.02, -0.01, -len / 2 - 0.035);
      drip.rotation.x = Math.PI / 2;
      drip.scale.set(1.2, 1.7, 1.2);
      g.add(drip);
      return g;
    };

    const tridentKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const wraps = [0.74, 0.86].map(() => add(bodyG, mesh(new THREE.TorusGeometry(1, 0.16, 8, 28), plateMat)));
      const tri = add(bodyG, new THREE.Group());
      const TL = 1.6;
      {
        const shaft = new THREE.CylinderGeometry(0.044, 0.048, 1.92, 14);
        shaft.rotateX(Math.PI / 2);
        shaft.translate(0, 0, 0.07);
        tri.add(mesh(shaft, castMat));
        const butt = mesh(new THREE.ConeGeometry(0.05, 0.16, 10), castMat);
        butt.rotation.x = -Math.PI / 2;
        butt.position.z = -0.97;
        tri.add(butt);
        const knob = mesh(new THREE.SphereGeometry(0.058, 14, 10), castMat);
        knob.position.z = -0.88;
        knob.scale.set(1, 1, 0.8);
        tri.add(knob);
        const grip = moltenGrip(0.44, 0.047, 0.11, 1.3);
        tri.add(grip);
        [-0.6, 0.42, 1.02].forEach((z, i) => {
          const r = mesh(new THREE.TorusGeometry(0.052, i === 2 ? 0.02 : 0.013, 8, 24), i === 2 ? castMat : plateMat);
          r.position.z = z;
          tri.add(r);
        });
        const bar = tubeGeo([V3(-0.2, 0, 1.2), V3(-0.15, 0, 1.08), V3(0, 0, 1.03), V3(0.15, 0, 1.08), V3(0.2, 0, 1.2)], u => 0.022 + 0.014 * Math.sin(Math.PI * u), 30, 12).g;
        tri.add(mesh(bar, castMat));
        [-1, 1].forEach(sg => {
          const pr = tubeGeo([V3(sg * 0.2, 0, 1.19), V3(sg * 0.22, 0, 1.3), V3(sg * 0.19, 0, 1.42), V3(sg * 0.13, 0, 1.52)], u => lerp(0.026, 0.004, Math.pow(u, 1.2)), 24, 10).g;
          tri.add(mesh(pr, castMat));
          const barb = mesh(new THREE.ConeGeometry(0.018, 0.07, 6), castMat);
          barb.position.set(sg * 0.2, 0, 1.43);
          barb.rotation.set(Math.PI / 2, 0, 0);
          barb.rotateZ(sg * 2.3);
          tri.add(barb);
          const curl = tubeGeo([V3(sg * 0.06, 0, 1.05), V3(sg * 0.12, 0, 0.98), V3(sg * 0.13, 0, 0.92), V3(sg * 0.09, 0, 0.9), V3(sg * 0.075, 0, 0.94)], u => lerp(0.018, 0.006, u), 20, 8).g;
          tri.add(mesh(curl, plateMat));
        });
        const mid = tubeGeo([V3(0, 0, 1.02), V3(0, 0, 1.3), V3(0, 0, TL)], u => (u < 0.75 ? 0.03 : lerp(0.03, 0.003, (u - 0.75) / 0.25)), 24, 10).g;
        tri.add(mesh(mid, castMat));
        [-1, 1].forEach(sg => {
          const barb = mesh(new THREE.ConeGeometry(0.02, 0.08, 6), castMat);
          barb.position.set(sg * 0.028, 0, 1.47);
          barb.rotation.set(Math.PI / 2, 0, 0);
          barb.rotateZ(sg * 2.4);
          tri.add(barb);
        });
        const gem = mesh(new THREE.OctahedronGeometry(0.032, 0), coreMat, false);
        gem.position.set(0, 0.03, 1.04);
        gem.scale.set(1, 0.6, 1);
        tri.add(gem);
      }
      const headFin = add(head, new THREE.Group());
      fin(headFin, 5, 0.34, 0.15, 1.45, V3(0.3, 0.05, -1), V3(0.55, 1, 0), V3(HW * 0.93, 0.02, -0.04));
      const shell = add(socket, new THREE.Group());
      {
        shell.position.set(0.04, 0.06, 0);
        shell.rotation.set(0, 0, -0.5);
        const g = new THREE.PlaneGeometry(1, 1, 48, 14);
        const q = g.attributes.position;
        const R = 0.24;
        for (let i = 0; i < q.count; i++) {
          const u = q.getX(i) + 0.5;
          const v = q.getY(i) + 0.5;
          const a = lerp(-Math.PI * 0.58, Math.PI * 0.58, u);
          const r = R * Math.max(0.02, v);
          const rib = 0.5 + 0.5 * Math.cos(a * 8);
          const h = 0.11 * (1 - v * v) + 0.016 * rib * v;
          q.setXYZ(i, Math.cos(a) * r - 0.13, h, Math.sin(a) * r);
        }
        g.computeVertexNormals();
        const shellBack = darkSteel.clone();
        shellBack.side = THREE.BackSide;
        shell.add(mesh(g, plateMat), mesh(g, shellBack, false));
        const hinge = mesh(new THREE.SphereGeometry(0.05, 14, 10), castMat);
        hinge.position.set(-0.13, 0.04, 0);
        hinge.scale.set(0.8, 0.6, 1.4);
        shell.add(hinge);
      }
      const scales = add(torso, new THREE.Group());
      {
        const sg = new THREE.SphereGeometry(0.04, 14, 8, 0, TAU, 0, Math.PI / 2);
        for (let row = 0; row < 8; row++) {
          const y = 0.74 - row * 0.058;
          const n = 7;
          for (let k = 0; k < n; k++) {
            const a = 1.2 + (k + (row % 2) * 0.5) * 0.105;
            const pnt = TP(a, y);
            const nr = TN(a, y);
            const dn = V3(0, -1, 0).addScaledVector(nr, nr.y).normalize();
            const X = nr.clone().cross(dn).normalize();
            const m = mesh(sg, plateMat);
            m.scale.set(1, 0.32, 1.3);
            m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, nr, dn));
            m.position.copy(pnt).addScaledVector(nr, -0.004).addScaledVector(dn, 0.01);
            scales.add(m);
          }
        }
      }
      const waves = add(port, new THREE.Group());
      [0.16, 0.2].forEach((r, i) => {
        const w = mesh(new THREE.TorusGeometry(r, 0.016 - i * 0.003, 8, 32, Math.PI * (0.75 - i * 0.15)), plateMat);
        w.rotation.z = -Math.PI * 0.62 + i * 0.2;
        waves.add(w);
        const end = mesh(new THREE.SphereGeometry(0.026 - i * 0.005, 12, 8), castMat);
        const a = w.rotation.z;
        end.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        waves.add(end);
      });
      const legFin = add(legs[1], new THREE.Group());
      fin(legFin, 4, 0.27, 0.2, 1.35, V3(0, -0.35, -1), V3(1, 0.2, 0), V3(0.25, -0.34 * LEGL, 0.02));
      const fluke = add(tailTip, new THREE.Group());
      [-1, 1].forEach(sg => {
        const lobe = mesh(new THREE.SphereGeometry(0.1, 18, 10), plateMat);
        lobe.scale.set(0.55, 0.14, 1.6);
        lobe.position.set(sg * 0.1, 0, 0.1);
        lobe.rotation.y = sg * 0.85;
        fluke.add(lobe);
      });
      const splash = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 48), splashMat);
      splash.rotation.x = Math.PI / 2;
      splash.visible = false;
      big.add(splash);
      const drops2 = Array.from({ length: 12 }, (_, k) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), splashMat);
        m.visible = false;
        big.add(m);
        return { m, a: (k / 12) * TAU, v: 0.7 + (k % 3) * 0.25 };
      });
      const jet = new THREE.Mesh(new THREE.ConeGeometry(0.09, 1, 12, 1, true), splashMat);
      jet.visible = false;
      bodyG.add(jet);
      let dir = V3(0, 1, 0);
      const want = V3(0, 1, 0);
      return {
        customTail: true,
        set: on => {
          K.set(on);
          if (!on) {
            splash.visible = false;
            jet.visible = false;
            drops2.forEach(d => (d.m.visible = false));
          }
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0x3ab0c8 : 0x2a6ea8);
          memMat.color.setHex(shiny ? 0x7ae0e0 : 0x3aa8e0);
        },
        rest(S, t, motion) {
          S.hL.set(0.86, TIP + 0.58, 0.36).add(V3(0, Math.sin(t * 1.4 + 1.2) * 0.02 * motion, 0));
          want.set(0.08, 1, 0.1);
          S.hR.set(-0.8, TIP + 0.62, 0.32).add(V3(0, Math.sin(t * 1.4) * 0.015 * motion, 0));
          S.lean -= 0.02;
          S.spinY -= 0.08;
          S.headPitch -= 0.06;
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.42, p));
            const strike = smooth(0.34, 0.44, p) * (1 - smooth(0.72, 0.95, p));
            S.hL.lerp(V3(0.78, TIP + 0.88, -0.25), wind);
            want.lerp(V3(-0.18, 0.05, 1), wind);
            S.hL.lerp(V3(0.45, TIP + 0.95, 0.75), strike);
            want.lerp(V3(-0.18, 0.0, 1), strike);
            S.spinY += 0.25 * wind - 0.3 * strike;
            S.lean += -0.05 * wind + 0.14 * strike;
            S.glow = 0.5 * wind + 0.7 * strike;
            S.impact = p > 0.42 && p < 0.6 ? 1 - smooth(0.42, 0.6, p) : 0;
            S.jetK = p > 0.4 && p < 0.7 ? smooth(0.4, 0.7, p) : -1;
            S.sparkK = p > 0.42 && p < 0.7 ? smooth(0.42, 0.7, p) : -1;
            S.mouthK = 0.6 * strike;
            return true;
          }
          if (nm === "fling") {
            const raise = smooth(0.04, 0.36, p) * (1 - smooth(0.4, 0.48, p));
            const plunge = smooth(0.4, 0.5, p) * (1 - smooth(0.8, 0.98, p));
            S.hL.lerp(V3(0.55, TIP + 1.5, 0.25), raise);
            want.lerp(V3(0.0, 1, 0.05), raise);
            S.hL.lerp(V3(0.42, TIP + 1.05, 0.62), plunge);
            want.lerp(V3(-0.05, -1, 0.3), plunge);
            S.hR.lerp(V3(-0.8, TIP + 1.2, 0.15), raise);
            S.hover += 0.2 * raise - 0.06 * plunge;
            S.lean += -0.1 * raise + 0.2 * plunge;
            S.glow = 1.2 * raise + 0.8 * plunge;
            S.flash = 0.6 * raise + 0.6 * plunge;
            S.waveK = p > 0.48 && p < 0.95 ? smooth(0.48, 0.95, p) : -1;
            S.headPitch += 0.18 * plunge - 0.12 * raise;
            S.mouthK = 0.8 * plunge;
            S.legK = 0.5 * raise;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(0.95, TIP + 0.75, 0.1), S.spinK);
            want.lerp(V3(0.25, 1, 0.1), S.spinK);
          }
          if (nm === "jump") {
            S.hL.lerp(V3(0.8, TIP + 1.1, 0.2), S.air);
            want.lerp(V3(0.1, 1, 0.15), S.air);
          }
          return false;
        },
        arm(S, t, motion) {
          dir.lerp(want.clone().normalize(), 0.5).normalize();
          const rad = u => lerp(0.125, 0.092, smooth(0.3, 0.9, u));
          const c = moltenArm(arm, shoulders[1], S.hL, t, motion, rad, 0.7);
          const stubEnd = c.getPointAt(1).addScaledVector(c.getTangentAt(1), 0.06);
          [0.74, 0.86].forEach((u, i) => {
            wraps[i].position.copy(c.getPointAt(u));
            wraps[i].quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(u));
            wraps[i].scale.setScalar(rad(u) + 0.008);
          });
          const z = dir.clone();
          let x = V3(0, 1, 0).cross(z);
          if (x.lengthSq() < 1e-3) x = V3(1, 0, 0);
          x.normalize();
          const y = z.clone().cross(x).normalize();
          tri.position.copy(stubEnd);
          tri.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
          jet.visible = S.jetK >= 0;
          if (jet.visible) {
            const f = S.jetK;
            const tip = tri.position.clone().addScaledVector(dir, TL);
            const len = 0.4 + 1.4 * f;
            jet.position.copy(tip).addScaledVector(dir, len / 2);
            jet.quaternion.setFromUnitVectors(V3(0, -1, 0), dir);
            jet.scale.set(1 + f, len, 1 + f);
            splashMat.opacity = 0.8 * (1 - f);
          }
        },
        fx(S, nm, p) {
          const tipBig = big.worldToLocal(tri.localToWorld(V3(0, 0, TL)));
          const hitBig = big.worldToLocal(tri.localToWorld(V3(0, 0, 1.3)));
          splash.visible = S.waveK >= 0;
          drops2.forEach(d => (d.m.visible = S.waveK >= 0));
          if (S.waveK >= 0) {
            const f = S.waveK;
            splash.position.set(hitBig.x, 0.04, hitBig.z);
            splash.scale.set(0.2 + f * 1.8, 0.2 + f * 1.8, 1 + f);
            splashMat.opacity = 0.85 * (1 - f);
            drops2.forEach(d => {
              const r = 0.1 + f * 0.9 * d.v;
              d.m.position.set(hitBig.x + Math.cos(d.a) * r, 0.05 + Math.sin(f * Math.PI) * 0.9 * d.v, hitBig.z + Math.sin(d.a) * r);
              d.m.scale.setScalar(1 - f * 0.6);
            });
          }
          return tipBig;
        }
      };
    })();

    const woodTex = canvas(256, 256, (g, W, H) => {
      g.fillStyle = "#6e4a2c";
      g.fillRect(0, 0, W, H);
      for (let k = 0; k < 80; k++) {
        const y0 = rnd() * H;
        const amp = 1.5 + rnd() * 5;
        const cyc = 1 + Math.floor(rnd() * 3);
        const ph = rnd() * TAU;
        const dark = rnd() > 0.42;
        g.strokeStyle = dark ? "rgba(38,22,10," + (0.22 + rnd() * 0.35) + ")" : "rgba(176,132,86," + (0.1 + rnd() * 0.2) + ")";
        g.lineWidth = 1 + rnd() * 2.6;
        g.beginPath();
        for (let x = 0; x <= W; x += 4) {
          const y = y0 + amp * Math.sin((x / W) * TAU * cyc + ph);
          if (x) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.stroke();
      }
      for (let k = 0; k < 6; k++) {
        const x = rnd() * W;
        const y = rnd() * H;
        const rx = 6 + rnd() * 8;
        [-W, 0, W].forEach(dx => {
          for (let j = 0; j < 4; j++) {
            g.strokeStyle = "rgba(40,22,10," + (0.5 - j * 0.1) + ")";
            g.lineWidth = 1.5;
            g.beginPath();
            g.ellipse(x + dx, y, rx + j * 4, (rx + j * 4) * 0.45, 0, 0, TAU);
            g.stroke();
          }
        });
      }
    });
    if (woodTex) woodTex.wrapT = THREE.RepeatWrapping;
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTex, roughness: 0.82, metalness: 0.0 });
    if (!woodTex) woodMat.color.set(0x6e4a2c);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2c6e2e, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide });
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x2e6428, roughness: 0.7, metalness: 0.0 });
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xf2e6f4, roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide });
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xc8ffd8 });
    const orient = (o, Y, Z) => {
      const z = Z.clone().normalize();
      const y = Y.clone().addScaledVector(z, -Y.dot(z)).normalize();
      const x = y.clone().cross(z).normalize();
      o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
      return o;
    };
    const leafGeo = (w, fold, curl) => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.bezierCurveTo(w, 0.22, w * 0.85, 0.68, 0, 1);
      sh.bezierCurveTo(-w * 0.85, 0.68, -w, 0.22, 0, 0);
      const g = new THREE.ShapeGeometry(sh, 10);
      const q = g.attributes.position;
      for (let i = 0; i < q.count; i++) {
        const x = q.getX(i);
        const v = q.getY(i);
        q.setZ(i, Math.abs(x) * fold + curl * v * v);
      }
      g.computeVertexNormals();
      return g;
    };
    const LEAF = leafGeo(0.36, 0.3, 0.2);
    const PETAL = leafGeo(0.5, 0.14, 0.5);
    const leaf = (parent, pos, along, nrm, s) => {
      const m = mesh(LEAF, leafMat, false);
      m.position.copy(pos);
      orient(m, along, nrm);
      m.scale.setScalar(s);
      parent.add(m);
      return m;
    };
    const flower = (parent, pos, nrm, s) => {
      const g = new THREE.Group();
      g.position.copy(pos);
      orient(g, Math.abs(nrm.y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0), nrm);
      g.scale.setScalar(s);
      parent.add(g);
      [[0, 1], [TAU / 10, 0.68]].forEach(([off, k]) => {
        for (let i = 0; i < 5; i++) {
          const pm = mesh(PETAL, petalMat, false);
          pm.rotation.z = off + (i * TAU) / 5;
          pm.scale.setScalar(k);
          pm.position.z = (1 - k) * 0.12;
          g.add(pm);
        }
      });
      const c = mesh(new THREE.SphereGeometry(0.17, 12, 8), coreMat, false);
      c.position.z = 0.12;
      c.scale.set(1, 1, 0.6);
      g.add(c);
      return g;
    };
    const rootTube = (parent, pts, r0, r1, n = 40, m = woodMat, rf = null) => {
      const { g, c } = tubeGeo(pts, u => Math.max(0.002, (rf ? rf(u) : lerp(r0, r1, Math.pow(u, 0.9))) * (1 + 0.12 * Math.sin(u * 23 + r0 * 50))), n, 9);
      parent.add(mesh(g, m));
      return c;
    };

    const bowKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const vine = dyn(vineMat);
      K.parts.push(vine);
      const vineLeaves = [0, 1, 2, 3].map(() => add(bodyG, mesh(LEAF, leafMat, false)));
      const bow = add(bodyG, new THREE.Group());
      const NY = 0.86;
      const NZ = -0.225;
      const AX = -0.07;
      {
        const riser = tubeGeo([V3(0, -0.27, -0.012), V3(0, -0.13, 0.024), V3(0, 0, 0.04), V3(0, 0.13, 0.024), V3(0, 0.27, -0.012)], u => 0.034 + 0.012 * Math.sin(Math.PI * u), 30, 14).g;
        riser.scale(1.25, 1, 1);
        bow.add(mesh(riser, castMat));
        const bladeGeo = (() => {
          const sh = new THREE.Shape();
          sh.moveTo(0, 0);
          sh.bezierCurveTo(0.42, 0.25, 0.3, 0.7, 0, 1);
          sh.bezierCurveTo(0.08, 0.6, 0.06, 0.25, 0, 0);
          const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 10 });
          g.translate(0, 0, -0.025);
          return g;
        })();
        [-1, 1].forEach(sg => {
          const lp = [V3(0, 0.18, 0.0), V3(0, 0.38, -0.045), V3(0, 0.58, -0.12), V3(0, 0.75, -0.19), V3(0, 0.87, -0.215), V3(0, 0.95, -0.17), V3(0, 0.99, -0.09)].map(p => V3(0, p.y * sg, p.z));
          const lr = u => lerp(0.032, 0.012, smooth(0, 0.85, u));
          const { g: lg, c: lc } = tubeGeo(lp, lr, 60, 14);
          lg.scale(1.7, 1, 1);
          bow.add(mesh(lg, woodMat));
          const fer = [0, 0.04, 0.08, 0.12, 0.16].map(u => lc.getPointAt(u));
          const fg = tubeGeo(fer, u => 0.044 - 0.01 * u + 0.006 * Math.sin(u * Math.PI), 16, 14).g;
          fg.scale(1.45, 1, 1);
          bow.add(mesh(fg, castMat));
          const inl = Array.from({ length: 13 }, (_, i) => {
            const u = lerp(0.14, 0.86, i / 12);
            const p = lc.getPointAt(u);
            const tg = lc.getTangentAt(u);
            const bk = V3(1, 0, 0).cross(tg).multiplyScalar(sg);
            return p.addScaledVector(bk, lr(u) * 0.92);
          });
          bow.add(mesh(tubeGeo(inl, u => 0.008 * (1 - 0.6 * smooth(0.8, 1, u)), 30, 6).g, castMat));
          const tip = tubeGeo([V3(0, sg * 0.985, -0.1), V3(0, sg * 1.02, -0.02), V3(0, sg * 1.01, 0.06), V3(0, sg * 0.965, 0.085), V3(0, sg * 0.94, 0.05)], u => lerp(0.014, 0.004, u), 24, 8).g;
          tip.scale(1.3, 1, 1);
          bow.add(mesh(tip, castMat));
          const bl = mesh(bladeGeo, castMat);
          bl.position.copy(lc.getPointAt(0.05)).add(V3(0, 0, 0.03));
          orient(bl, lc.getTangentAt(0.05).add(V3(0, 0, 0.55)), V3(1, 0, 0));
          bl.scale.set(0.11, 0.3, 0.16);
          bow.add(bl);
          const vp = [];
          const vo = [];
          for (let i = 0; i <= 40; i++) {
            const u = lerp(0.18, 0.84, i / 40);
            const tg = lc.getTangentAt(u);
            const nx = V3(1, 0, 0);
            const b = tg.clone().cross(nx);
            const ph = u * TAU * 2.4 + (sg > 0 ? 0 : 1.3);
            const o = nx.multiplyScalar(Math.cos(ph)).addScaledVector(b, Math.sin(ph));
            const p = o.clone().multiplyScalar(lr(u) + 0.006);
            p.x *= 1.7;
            vp.push(lc.getPointAt(u).add(p));
            vo.push(o);
          }
          bow.add(mesh(tubeGeo(vp, () => 0.007, 80, 6).g, vineMat));
          [10, 22, 34].forEach((i, k) => leaf(bow, vp[i], lc.getTangentAt(lerp(0.18, 0.84, i / 40)).multiplyScalar(sg * (k % 2 ? -1 : 1)).add(vo[i].clone().multiplyScalar(0.4)), vo[i], 0.075));
        });
        const gem = mesh(new THREE.OctahedronGeometry(0.03, 0), coreMat, false);
        gem.position.set(0, 0.17, 0.062);
        gem.scale.set(0.8, 1.4, 0.6);
        bow.add(gem);
        const grip = moltenGrip(0.44, 0.05, 0.11, 2.1);
        grip.rotation.x = -Math.PI / 2;
        grip.position.z = 0.03;
        grip.scale.set(1.15, 1, 1);
        bow.add(grip);
      }
      const segGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
      segGeo.translate(0, 0.5, 0);
      const str = [0, 1].map(() => {
        const m = mesh(segGeo, stringMat, false);
        bow.add(m);
        return m;
      });
      const seg = (m, a, b) => {
        const d = b.clone().sub(a);
        m.position.copy(a);
        m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.clone().normalize());
        m.scale.set(0.011, d.length(), 0.011);
      };
      const ARROW = 1.07;
      const shaftGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8);
      shaftGeo.rotateX(Math.PI / 2);
      shaftGeo.translate(0, 0, 0.45);
      const headGeo = new THREE.ConeGeometry(0.036, 0.17, 4);
      headGeo.rotateX(Math.PI / 2);
      headGeo.scale(1, 0.32, 1);
      headGeo.translate(0, 0, 0.985);
      const mkArrow = () => {
        const g = new THREE.Group();
        g.add(mesh(shaftGeo, stringMat, false), mesh(headGeo, castMat, false));
        const nk = mesh(new THREE.SphereGeometry(0.018, 10, 8), castMat, false);
        g.add(nk);
        [0, Math.PI / 2].forEach(r => {
          const h = new THREE.Group();
          h.rotation.z = r;
          const l = mesh(LEAF, leafMat, false);
          l.rotation.x = Math.PI / 2;
          l.position.z = 0.02;
          l.scale.set(0.13, 0.17, 0.13);
          h.add(l);
          g.add(h);
        });
        g.visible = false;
        return g;
      };
      const nocked = mkArrow();
      bow.add(nocked);
      const flyers = Array.from({ length: 6 }, () => {
        const a = mkArrow();
        big.add(a);
        return a;
      });
      const thorns = new THREE.Group();
      thorns.visible = false;
      big.add(thorns);
      const spikes = Array.from({ length: 7 }, (_, k) => {
        const a = (k / 6) * TAU + 0.3;
        const r = k ? 0.3 + (k % 3) * 0.09 : 0;
        const h = k ? 0.55 + (k % 2) * 0.25 : 1.0;
        const lx = k ? Math.cos(a) * 0.28 : 0.04;
        const lz = k ? Math.sin(a) * 0.28 : -0.04;
        const o = new THREE.Group();
        o.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        thorns.add(o);
        const pts = [V3(0, -0.12, 0), V3(lx * 0.15, h * 0.35, lz * 0.15), V3(lx * 0.55, h * 0.7, lz * 0.55), V3(lx, h, lz)];
        const base = k ? 0.075 : 0.115;
        const { g, c } = tubeGeo(pts, u => Math.max(0.003, base * (1 - Math.pow(u, 0.85))), 24, 10);
        o.add(mesh(g, woodMat));
        [0.3, 0.48, 0.66].forEach((u, j) => {
          const tg = c.getTangentAt(u);
          const side = V3(Math.cos(a + j * 2.1), 0, Math.sin(a + j * 2.1));
          side.addScaledVector(tg, -side.dot(tg)).normalize();
          const tn = mesh(new THREE.ConeGeometry(0.022, 0.1, 5), castMat);
          tn.position.copy(c.getPointAt(u)).addScaledVector(side, base * (1 - Math.pow(u, 0.85)) + 0.03);
          tn.quaternion.setFromUnitVectors(V3(0, 1, 0), side.clone().addScaledVector(tg, 0.6).normalize());
          o.add(tn);
        });
        return o;
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 48), trailMat);
      ring.rotation.x = Math.PI / 2;
      ring.visible = false;
      big.add(ring);

      const crown = add(head, new THREE.Group());
      const BT = 0.24;
      const brCv = mkCanvas(256);
      const brRm = mkCanvas(256);
      const brTex = texOf(brCv);
      const brRmTex = texOf(brRm);
      const brMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: brTex, roughnessMap: brRmTex, metalnessMap: brRmTex, roughness: 1, metalness: 1 });
      if (!brTex) {
        brMat.color.set(0x6e4a2c);
        brMat.roughness = 0.8;
        brMat.metalness = 0;
      }
      const brJag = Array.from({ length: 33 }, () => rnd());
      const brSliv = Array.from({ length: 7 }, () => [rnd(), 0.05 + rnd() * 0.16, 1 + rnd() * 2]);
      const brGrain = Array.from({ length: 46 }, () => [rnd(), 1 + rnd() * 2.5, rnd() > 0.42, rnd(), rnd() * TAU]);
      const paintBranch = (plateHex, woodK) => {
        if (!brCv) return;
        const W = 256;
        const g = brCv.getContext("2d");
        const r = brRm.getContext("2d");
        const pc = new THREE.Color(plateHex);
        const pcs = "rgb(" + [pc.r, pc.g, pc.b].map(v => Math.round(v * 255)).join(",") + ")";
        const edge = y => {
          const f = (y / W) * 32;
          const i = Math.floor(f);
          return W * (BT + 0.07 * lerp(brJag[i], brJag[i + 1], f - i) - 0.035);
        };
        const wb = [110, 74, 44].map(v => Math.round(v * woodK));
        g.fillStyle = "rgb(" + wb.join(",") + ")";
        g.fillRect(0, 0, W, W);
        brGrain.forEach(([y0, lw, dark, amp, ph]) => {
          g.strokeStyle = dark ? "rgba(38,22,10,0.45)" : "rgba(176,132,86,0.28)";
          g.lineWidth = lw;
          g.beginPath();
          for (let x = 0; x <= W; x += 4) {
            const y = y0 * W + (2 + amp * 4) * Math.sin((x / W) * TAU * 2 + ph);
            if (x) g.lineTo(x, y);
            else g.moveTo(x, y);
          }
          g.stroke();
        });
        r.fillStyle = "rgb(0,210,0)";
        r.fillRect(0, 0, W, W);
        g.fillStyle = pcs;
        r.fillStyle = "rgb(0,105,105)";
        [g, r].forEach(c => {
          c.beginPath();
          c.moveTo(0, 0);
          for (let y = 0; y <= W; y += 8) c.lineTo(edge(y), y);
          c.lineTo(0, W);
          c.closePath();
          c.fill();
        });
        brSliv.forEach(([y, l, w]) => {
          const yy = y * W;
          const x0 = edge(yy) - 4;
          [g, r].forEach(c => {
            c.beginPath();
            c.moveTo(x0, yy - w * 2);
            c.lineTo(x0 + l * W, yy);
            c.lineTo(x0, yy + w * 2);
            c.closePath();
            c.fill();
          });
        });
        g.strokeStyle = "rgba(30,18,8,0.6)";
        g.lineWidth = 2;
        g.beginPath();
        for (let y = 0; y <= W; y += 8) {
          if (y) g.lineTo(edge(y) + 1, y);
          else g.moveTo(edge(y) + 1, y);
        }
        g.stroke();
        brTex.needsUpdate = true;
        brRmTex.needsUpdate = true;
      };
      paintBranch(0x4e7a3e, 1);
      {
        const VX = 0.52;
        const VY0 = 0.04;
        const VY1 = 0.5;
        const hp = (x, y, off) => {
          const p = HP(x, y);
          return p.addScaledVector(HN(p), off);
        };
        const E = HP(VX, VY1);
        const nE = HN(E);
        const D = V3(1, 0.86, -0.38).normalize();
        const P = [];
        const NN = [];
        const NS = 16;
        for (let i = 0; i <= NS; i++) {
          const x = lerp(-0.01, VX, i / NS);
          const p = HP(x, lerp(VY0, VY1, x / VX));
          P.push(p);
          NN.push(HN(p));
        }
        const NE = 16;
        for (let i = 1; i <= NE; i++) {
          const l = i / NE;
          P.push(E.clone().addScaledVector(D, 0.6 * l).add(V3(-0.03 * l * l, 0.16 * l * l, -0.04 * l * l)).addScaledVector(nE, 0.02 * Math.sin(l * 6)));
          NN.push(nE.clone());
        }
        const cv = new THREE.CatmullRomCurve3(P);
        const M = 90;
        const R = 24;
        const smp = Array.from({ length: M + 1 }, (_, k) => cv.getPoint(k / M));
        const acc = [0];
        for (let k = 1; k <= M; k++) acc.push(acc[k - 1] + smp[k].distanceTo(smp[k - 1]));
        const total = acc[M];
        const sOf = k => acc[k] / total;
        const sE = (() => {
          let best = 0;
          let bd = 9;
          smp.forEach((q, k) => {
            const d = q.distanceTo(E);
            if (d < bd) {
              bd = d;
              best = k;
            }
          });
          return sOf(best);
        })();
        const pos = [];
        const uv = [];
        const idx = [];
        const brRad = s => {
          const tail = smooth(sE, 1, s);
          return lerp(0.036, 0.005, Math.pow(tail, 0.85)) * (1 + 0.12 * Math.sin(s * 38) * smooth(0.25, 0.4, s));
        };
        for (let k = 0; k <= M; k++) {
          const s = sOf(k);
          const tq = cv.getTangent(k / M);
          const f = (k / M) * (P.length - 1);
          const i0 = Math.min(P.length - 2, Math.floor(f));
          const n = NN[i0].clone().lerp(NN[i0 + 1], f - i0);
          n.addScaledVector(tq, -n.dot(tq)).normalize();
          const b = n.clone().cross(tq).normalize();
          const m = smooth(BT - 0.04, BT + 0.2, s);
          const ax = Math.min(1, Math.max(0, s / sE));
          const w = 0.056 * lerp(1, 0.8, ax);
          const h = 0.05;
          const lo = -0.014;
          const r = brRad(s);
          const cy = lerp(h * 0.45, 0, smooth(sE, sE + 0.15, s));
          for (let j = 0; j <= R; j++) {
            const ph = (j / R) * TAU;
            const c = Math.cos(ph);
            const sn = Math.sin(ph);
            const py0 = (h + lo) / 2 + ((h - lo) / 2) * Math.sign(sn) * Math.pow(Math.abs(sn), 1 / 3);
            const px0 = w * Math.sign(c) * Math.pow(Math.abs(c), 1 / 3) * lerp(1, 0.78, (py0 - lo) / (h - lo));
            const px = lerp(px0, r * c, m);
            const py = lerp(py0, cy + r * sn, m);
            pos.push(...smp[k].clone().addScaledVector(b, px).addScaledVector(n, py).toArray());
            uv.push(s, j / R);
          }
        }
        for (let k = 0; k < M; k++)
          for (let j = 0; j < R; j++) {
            const a = k * (R + 1) + j;
            const c2 = a + R + 1;
            idx.push(a, a + 1, c2, a + 1, c2 + 1, c2);
          }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        crown.add(mesh(geo, brMat));
        const at = s => cv.getPointAt(s);
        const twig = (s0, dirs, r0, r1) => {
          const p0 = at(s0);
          const pts = [p0.clone()];
          dirs.forEach(d => pts.push(pts[pts.length - 1].clone().add(d)));
          return rootTube(crown, pts, r0, r1, 24);
        };
        const t1 = twig(0.66, [V3(0.02, 0.07, -0.02), V3(0.0, 0.1, -0.03), V3(-0.04, 0.09, -0.01), V3(-0.05, 0.06, 0.02)], 0.02, 0.003);
        const t2 = twig(0.5, [V3(0.05, 0.0, -0.06), V3(0.05, -0.05, -0.07), V3(0.0, -0.08, -0.05), V3(-0.01, -0.06, -0.02)], 0.022, 0.003);
        const t3 = twig(0.82, [V3(0.07, 0.02, 0.02), V3(0.07, -0.01, 0.03), V3(0.04, -0.03, 0.02)], 0.012, 0.002);
        rootTube(crown, [hp(0.4, 0.45, 0.02), hp(0.38, 0.6, 0.012), hp(0.3, 0.75, 0.006), hp(0.22, 0.85, -0.004)], 0.014, 0.003, 24);
        leaf(crown, at(1), V3(-0.2, 1, -0.2), V3(0.3, 0.2, 1), 0.12);
        leaf(crown, t1.getPointAt(1), V3(-0.6, 1, 0), V3(0, 0.2, 1), 0.1);
        leaf(crown, t2.getPointAt(1), V3(0.3, -0.7, -0.4), V3(0.4, 1, 0), 0.08);
        leaf(crown, t3.getPointAt(1), V3(1, -0.2, 0.2), V3(0, 1, 0.3), 0.08);
        leaf(crown, at(0.74), V3(0.6, 0.6, 0.3), V3(0, 0.3, 1), 0.08);
      }

      const pad = add(socket, new THREE.Group());
      {
        pad.position.set(0.02, 0.03, 0);
        pad.rotation.z = -0.35;
        [0, 1, 2].forEach(i => {
          const sh = mesh(new THREE.SphereGeometry(0.21 - i * 0.035, 32, 12, 0, TAU, 0, Math.PI * 0.37), i === 1 ? castMat : woodMat);
          sh.scale.set(1, 0.72, 1.06);
          sh.position.set(0.03 * i, -0.045 * i, 0);
          pad.add(sh);
        });
        for (let k = 0; k < 13; k++) {
          const a = lerp(-Math.PI * 0.62, Math.PI * 0.62, k / 12);
          const rx = Math.cos(a);
          const rz = Math.sin(a);
          leaf(pad, V3(0.06 + rx * 0.13, -0.075, rz * 0.15), V3(rx, -0.8, rz * 1.1), V3(rx * 0.7, 1, rz * 0.7), 0.12 + 0.02 * (k % 2));
        }
        rootTube(pad, [V3(-0.13, 0.06, -0.17), V3(-0.02, 0.15, -0.09), V3(0.04, 0.165, 0.03), V3(0.02, 0.12, 0.15), V3(-0.05, 0.02, 0.22), V3(-0.12, -0.1, 0.23)], 0.022, 0.008, 40);
        rootTube(pad, [V3(0.1, 0.12, -0.12), V3(0.16, 0.08, -0.02), V3(0.15, 0.05, 0.1), V3(0.1, 0.0, 0.18)], 0.016, 0.004, 24);
        const tw = rootTube(pad, [V3(0.0, 0.13, -0.02), V3(0.04, 0.25, -0.05), V3(0.02, 0.37, -0.03), V3(0.06, 0.47, -0.01), V3(0.05, 0.54, 0.02)], 0.026, 0.004, 30);
        const tw2 = rootTube(pad, [V3(0.035, 0.29, -0.05), V3(0.11, 0.36, -0.07), V3(0.17, 0.41, -0.06), V3(0.21, 0.44, -0.03)], 0.014, 0.003, 16);
        leaf(pad, tw.getPointAt(1), V3(0.1, 1, 0.2), V3(0.2, 0, 1), 0.11);
        leaf(pad, tw.getPointAt(0.62), V3(-0.8, 0.6, 0.2), V3(0, 0.2, 1), 0.1);
        leaf(pad, tw2.getPointAt(1), V3(0.8, 0.5, 0.1), V3(0, 0.3, 1), 0.1);
        leaf(pad, tw.getPointAt(0.42), V3(0.6, 0.6, 0.4), V3(-0.3, 0, 1), 0.08);
        flower(pad, V3(0.02, 0.135, 0.14), V3(0.05, 0.6, 0.8), 0.075);
      }

      const chest = add(torso, new THREE.Group());
      {
        const on = (ctrl, r0, r1, off = 0.012) => {
          const c = new THREE.SplineCurve(ctrl.map(([a, y]) => V2(a, y)));
          const sp = c.getSpacedPoints(30);
          const pts = sp.map(q => TP(q.x, q.y).addScaledVector(TN(q.x, q.y), off));
          rootTube(chest, pts, r0, r1, 48);
          return { sp, pts };
        };
        const R1 = on([[1.42, 1.08], [1.18, 1.03], [0.92, 0.995], [0.66, 0.985], [0.44, 0.975], [0.27, 0.958]], 0.03, 0.008);
        on([[1.2, 1.035], [1.27, 0.88], [1.32, 0.72], [1.33, 0.56], [1.38, 0.43]], 0.022, 0.004);
        on([[0.8, 0.99], [0.7, 1.07], [0.58, 1.13], [0.46, 1.165]], 0.016, 0.003);
        on([[1.0, 1.0], [0.98, 0.9], [1.02, 0.8]], 0.014, 0.003);
        [[6, 1], [11, -1], [17, 1], [23, -1]].forEach(([i, s]) => {
          const q = R1.sp[i];
          const n = TN(q.x, q.y);
          const tg = R1.pts[i + 1].clone().sub(R1.pts[i - 1]).normalize();
          leaf(chest, R1.pts[i], tg.multiplyScalar(-0.6).add(V3(0, s, 0)), n, 0.1);
        });
        const fq = R1.sp[14];
        flower(chest, R1.pts[14].clone().addScaledVector(TN(fq.x, fq.y), 0.02), TN(fq.x, fq.y), 0.07);
      }

      const wreath = add(port, new THREE.Group());
      {
        const R = 0.158;
        const zf = x => 0.012 - 0.8 * x * x;
        const a0 = -1.75;
        const a1 = 1.95;
        const pts = [];
        for (let i = 0; i <= 30; i++) {
          const a = lerp(a0, a1, i / 30);
          const x = Math.cos(a) * R;
          pts.push(V3(x, Math.sin(a) * R, zf(x)));
        }
        rootTube(wreath, pts, 0.015, 0.009, 48);
        for (let k = 0; k < 10; k++) {
          const a = lerp(a0 + 0.2, a1 - 0.15, k / 9);
          const s = k % 2 ? 1 : -1;
          const rd = V3(Math.cos(a), Math.sin(a), 0);
          const tg = V3(-Math.sin(a), Math.cos(a), 0);
          const x = Math.cos(a) * (R + 0.01 * s);
          leaf(wreath, V3(x, Math.sin(a) * (R + 0.01 * s), zf(x) + 0.008), tg.clone().addScaledVector(rd, 0.7 * s), V3(0, 0, 1).addScaledVector(rd, 0.25), 0.08);
        }
        flower(wreath, V3(Math.cos(0.75) * R, Math.sin(0.75) * R, zf(Math.cos(0.75) * R) + 0.02), V3(0.15, 0.1, 1), 0.06);
      }

      let dir = V3(0, 0, 1);
      const want = V3(0, 0, 1);
      const upv = V3(0, 1, 0);
      const wantUp = V3(0, 1, 0);
      const TH = 1.15;
      const AIM = V3(Math.sin(TH), 0, Math.cos(TH));
      const ANC = V3(0.12, TIP + 1.2, 0.36);
      const G1 = ANC.clone().addScaledVector(AIM, 0.85);
      const SKY = V3(Math.sin(0.4) * Math.cos(0.96), Math.sin(0.96), Math.cos(0.4) * Math.cos(0.96));
      const G2 = V3(0.9, TIP + 1.6, 0.3);
      const TGT = V3(0, 0, 3.2);
      const hideFx = () => {
        flyers.forEach(f => (f.visible = false));
        thorns.visible = false;
        ring.visible = false;
      };
      return {
        set: on => {
          K.set(on);
          nocked.visible = false;
          if (!on) hideFx();
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0x9aa83a : 0x4e7a3e);
          woodMat.color.setHex(shiny ? 0xead2a4 : 0xffffff);
          leafMat.color.setHex(shiny ? 0xd0a030 : 0x2c6e2e);
          vineMat.color.setHex(shiny ? 0x8a7020 : 0x2e6428);
          petalMat.color.setHex(shiny ? 0xffc890 : 0xf2e6f4);
          paintBranch(shiny ? 0x9aa83a : 0x4e7a3e, shiny ? 1.45 : 1);
        },
        rest(S, t, motion) {
          S.hL.set(0.84, TIP + 0.64, 0.3).add(V3(0, Math.sin(t * 1.4 + 1.2) * 0.02 * motion, 0));
          want.set(1, 0, 0.35);
          wantUp.set(0, 1, 0);
          S.headPitch -= 0.05;
          S.spinY -= 0.06;
          S.bowDraw = 0;
          S.bowHand = false;
          S.nock = false;
          S.shot = -1;
          S.rain = -1;
          S.thornK = -1;
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const k = smooth(0.03, 0.22, p) * (1 - smooth(0.66, 0.92, p));
            const reach = smooth(0.08, 0.18, p) * (1 - smooth(0.36, 0.44, p));
            const draw = smooth(0.16, 0.34, p) * (1 - smooth(0.355, 0.375, p));
            S.hL.lerp(G1, k);
            want.lerp(AIM, k);
            S.spinY += -TH * k;
            S.headYaw += 0.95 * k;
            S.headPitch += 0.06 * k;
            S.lean += 0.04 * k;
            S.hR.lerp(G1.clone().addScaledVector(AIM, -(0.24 + 0.61 * draw)), reach);
            S.hR.lerp(V3(-0.08, TIP + 1.08, 0.46), smooth(0.36, 0.42, p) * (1 - smooth(0.58, 0.85, p)));
            S.bowDraw = draw;
            S.bowHand = true;
            S.nock = p > 0.14 && p < 0.362;
            S.shot = p >= 0.36 && p < 0.47 ? (p - 0.36) / 0.11 : -1;
            S.sparkK = p > 0.46 && p < 0.72 ? smooth(0.46, 0.72, p) : -1;
            S.glow = 0.4 * k + 0.8 * draw;
            S.impact = p > 0.36 && p < 0.5 ? 1 - smooth(0.36, 0.5, p) : 0;
            S.mouthK = 0.3 * draw;
            return true;
          }
          if (nm === "fling") {
            const k = smooth(0.03, 0.24, p) * (1 - smooth(0.7, 0.95, p));
            const draw = smooth(0.12, 0.38, p) * (1 - smooth(0.395, 0.415, p));
            S.hL.lerp(G2, k);
            want.lerp(SKY, k);
            S.spinY += -0.4 * k;
            S.lean += -0.12 * k;
            S.headYaw += 0.3 * k;
            S.headPitch += -0.25 * k;
            S.hR.lerp(V3(-0.72, TIP + 1.62, 0.32), smooth(0.08, 0.3, p) * (1 - smooth(0.44, 0.56, p)));
            S.hR.lerp(V3(-0.5, TIP + 1.15, 0.75), smooth(0.46, 0.58, p) * (1 - smooth(0.82, 0.96, p)));
            S.bowDraw = draw;
            S.bowHand = false;
            S.nock = p > 0.14 && p < 0.4;
            S.shot = p >= 0.4 && p < 0.52 ? (p - 0.4) / 0.12 : -1;
            S.rain = p >= 0.48 && p < 0.8 ? (p - 0.48) / 0.14 : -1;
            S.thornK = p >= 0.58 && p < 0.97 ? (p - 0.58) / 0.39 : -1;
            S.sparkK = S.thornK >= 0 && S.thornK < 0.5 ? S.thornK * 2 : -1;
            S.glow = 1.2 * draw + 0.6 * k;
            S.flash = 0.8 * draw;
            S.mouthK = 0.7 * draw + 0.5 * smooth(0.4, 0.5, p) * (1 - smooth(0.7, 0.9, p));
            S.hover += 0.12 * k;
            S.legK = 0.4 * k;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(0.95, TIP + 0.85, 0.1), S.spinK);
            want.lerp(V3(0.3, 0, 1), S.spinK);
          }
          if (nm === "jump") {
            S.hL.lerp(V3(0.8, TIP + 1.05, 0.25), S.air);
            want.lerp(V3(0.15, 0.1, 1), S.air);
          }
          return false;
        },
        arm(S, t, motion) {
          dir.lerp(want.clone().normalize(), 0.5).normalize();
          upv.lerp(wantUp, 0.5).normalize();
          const rad = u => lerp(0.125, 0.09, smooth(0.3, 0.9, u));
          const c = moltenArm(arm, shoulders[1], S.hL, t, motion, rad, 0.7);
          const vp = [];
          const vo = [];
          const N = 40;
          for (let i = 0; i <= N; i++) {
            const u = lerp(0.12, 0.93, i / N);
            const T = c.getTangentAt(u);
            const nn = V3(0, 1, 0).cross(T);
            if (nn.lengthSq() < 1e-4) nn.set(1, 0, 0);
            nn.normalize();
            const bb = T.clone().cross(nn);
            const ph = u * TAU * 2.2;
            const o = nn.multiplyScalar(Math.cos(ph)).addScaledVector(bb, Math.sin(ph));
            vp.push(c.getPointAt(u).addScaledVector(o, rad(u) * 1.02 + 0.006));
            vo.push(o);
          }
          flexTube(vine, vp, () => 0.012, 64, 6);
          [8, 17, 26, 35].forEach((i, k) => {
            const L = vineLeaves[k];
            L.position.copy(vp[i]);
            orient(L, c.getTangentAt(lerp(0.12, 0.93, i / N)).multiplyScalar(k % 2 ? 1 : -1).addScaledVector(vo[i], 0.5), vo[i]);
            L.scale.setScalar(0.09);
          });
          const end = c.getPointAt(1).addScaledVector(c.getTangentAt(1), 0.06);
          const z = dir.clone();
          const y = upv.clone().addScaledVector(z, -upv.dot(z)).normalize();
          const x = y.clone().cross(z).normalize();
          bow.position.copy(end);
          bow.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
          bow.updateMatrix();
          const sp = V3(0, 0, NZ);
          if (S.bowHand) {
            handR.updateMatrix();
            const hp = handR.position.clone().applyMatrix4(bow.matrix.clone().invert());
            sp.lerp(hp, Math.min(1, S.bowDraw * 4));
          } else sp.z -= 0.46 * S.bowDraw;
          seg(str[0], V3(0, NY, NZ), sp);
          seg(str[1], V3(0, -NY, NZ), sp);
          nocked.visible = !!S.nock;
          if (nocked.visible) {
            const d = V3(AX, 0.02, 0.05).sub(sp).normalize();
            nocked.position.copy(sp);
            nocked.quaternion.setFromUnitVectors(V3(0, 0, 1), d);
          }
          bow.updateMatrixWorld(true);
        },
        fx(S, nm, p) {
          const toBig = v => big.worldToLocal(bow.localToWorld(v.clone()));
          const o = toBig(V3(AX, 0.02, NZ - 0.42));
          const d = toBig(V3(AX, 0.02, 1)).sub(toBig(V3(AX, 0.02, 0))).normalize();
          const dist = nm === "fling" ? 3.6 : 3.7;
          const F0 = flyers[0];
          F0.visible = S.shot >= 0;
          if (F0.visible) {
            F0.position.copy(o).addScaledVector(d, S.shot * dist);
            F0.quaternion.setFromUnitVectors(V3(0, 0, 1), d);
          }
          flyers.slice(1).forEach((F, i) => {
            const f = S.rain >= 0 ? Math.min(1, S.rain * 1.3 - i * 0.07) : -1;
            F.visible = f >= 0;
            if (!F.visible) return;
            const ang = (i / 5) * TAU + 0.5;
            const rr = 0.2 + (i % 2) * 0.24;
            const ground = TGT.clone().add(V3(Math.cos(ang) * rr, 0.05, Math.sin(ang) * rr));
            const from = ground.clone().add(V3(-0.3, 3.2, -0.7));
            const fd = ground.clone().sub(from).normalize();
            F.position.copy(from.lerp(ground, f)).addScaledVector(fd, -ARROW * 0.85);
            F.quaternion.setFromUnitVectors(V3(0, 0, 1), fd);
          });
          thorns.visible = S.thornK >= 0;
          ring.visible = S.thornK >= 0;
          if (thorns.visible) {
            const f = S.thornK;
            thorns.position.copy(TGT);
            const rise = smooth(0, 0.2, f) * (1 - smooth(0.75, 1, f));
            spikes.forEach((sk, i) => {
              const r = Math.min(1, Math.max(0, rise * 1.2 - (i ? 0.05 + i * 0.02 : 0)));
              sk.scale.set(0.5 + 0.5 * r, Math.max(0.001, r), 0.5 + 0.5 * r);
            });
            ring.position.set(TGT.x, 0.04, TGT.z);
            ring.scale.set(0.3 + f * 1.6, 0.3 + f * 1.6, 1 + f);
            S.trailOpacity = 0.75 * (1 - f);
          }
          if (nm === "swipe" && S.sparkK >= 0) return o.clone().addScaledVector(d, dist + ARROW);
          if (nm === "fling" && S.sparkK >= 0) return TGT.clone().add(V3(0, 0.35, 0));
          return toBig(V3(0, 0, 0));
        }
      };
    })();

    const breathMat = new THREE.MeshBasicMaterial({ color: 0xb0a0ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x8c89a6, map: steelTex, roughness: 0.48, metalness: 0.45 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x3a2f78, roughness: 0.55, metalness: 0.2, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });

    const dragonKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const spineGeo = new THREE.ConeGeometry(0.032, 0.13, 4);
      const spines = Array.from({ length: 9 }, () => add(bodyG, mesh(spineGeo, castMat)));
      const bellyGeo = new THREE.CylinderGeometry(0.9, 1.06, 0.09, 18, 1, true, -Math.PI * 0.38, Math.PI * 0.76);
      bellyGeo.translate(0, 0.045, 0);
      const bellies = Array.from({ length: 9 }, () => add(bodyG, mesh(bellyGeo, plateMat)));
      const scaleGeo = (() => {
        const g = new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2);
        const q = g.attributes.position;
        for (let i = 0; i < q.count; i++) {
          const x = q.getX(i);
          const y = q.getY(i);
          const z = q.getZ(i);
          const tip = Math.max(0, z);
          q.setXYZ(i, x * 0.042 * (1 - 0.55 * tip), -z * 0.06 - tip * tip * 0.03, y * 0.016 + 0.01 * (1 - Math.abs(x)) * y);
        }
        g.computeVertexNormals();
        return g;
      })();
      const neckScales = [];
      [0.56, 0.64, 0.72, 0.8, 0.88, 0.95].forEach((u, r) => {
        for (let k = 0; k < 9; k++) neckScales.push({ u, a: lerp(-1.95, 1.95, k / 8) + (r % 2) * 0.22, m: add(bodyG, mesh(scaleGeo, plateMat)) });
      });
      const dh = add(bodyG, new THREE.Group());
      const dhIn = new THREE.Group();
      dhIn.scale.setScalar(2.6);
      dh.add(dhIn);
      const jaw = new THREE.Group();
      jaw.position.set(0, -0.042, -0.07);
      dhIn.add(jaw);
      {
        const tab = (T, Z) => {
          for (let i = 1; i < T.length; i++)
            if (Z <= T[i][0] || i === T.length - 1) {
              const a = T[i - 1];
              const b = T[i];
              const f = Math.min(1, Math.max(0, (Z - a[0]) / (b[0] - a[0])));
              const k = f * f * (3 - 2 * f);
              return a.slice(1).map((v, j) => lerp(v, b[j + 1], k));
            }
          return T[T.length - 1].slice(1);
        };
        const E = 0.72;
        const EX = 0.8;
        const se = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
        const gs = (v, m, d) => Math.exp(-Math.pow((v - m) / d, 2));
        const browB = (Z, c, s) => (0.035 * gs(Z, -0.005, 0.045) + 0.01 * gs(Z, 0.07, 0.05)) * gs(s, 0.7, 0.2) * smooth(0.15, 0.4, Math.abs(c));
        const sec = (T, Z, a, bul) => {
          const [w, top, bot, cy] = tab(T, Z);
          const c = Math.cos(a);
          const s = Math.sin(a);
          let x = w * se(c, EX);
          let y = cy + (s > 0 ? top : bot) * se(s, E);
          if (bul) {
            const b = bul(Z, c, s);
            x += Math.sign(c) * b * 0.55;
            y += b * 0.85;
          }
          return V3(x, y, Z);
        };
        const nrm = (T, Z, a, bul) => {
          const p0 = sec(T, Z, a, bul);
          const da = sec(T, Z, a + 0.02, bul).sub(sec(T, Z, a - 0.02, bul));
          const dz = sec(T, Z + 0.004, a, bul).sub(sec(T, Z - 0.004, a, bul));
          const n = da.cross(dz).normalize();
          return { p: p0, n };
        };
        const loft = (T, Z0, Z1, N, R, bul) => {
          const pos = [];
          const uv = [];
          const idx = [];
          for (let i = 0; i <= N; i++) {
            const Z = lerp(Z0, Z1, i / N);
            for (let j = 0; j <= R; j++) {
              const p = sec(T, Z, (j / R) * TAU, bul);
              pos.push(p.x, p.y, p.z);
              uv.push(j / R, i / N);
            }
          }
          for (let i = 0; i < N; i++)
            for (let j = 0; j < R; j++) {
              const a = i * (R + 1) + j;
              const b = a + R + 1;
              idx.push(a, a + 1, b, a + 1, b + 1, b);
            }
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
          g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
          g.setIndex(idx);
          g.computeVertexNormals();
          return g;
        };
        const SK = [
          [-0.13, 0.012, 0.012, 0.01, 0.015],
          [-0.1, 0.064, 0.072, 0.045, 0.012],
          [-0.05, 0.085, 0.092, 0.05, 0.008],
          [-0.005, 0.084, 0.088, 0.042, 0.0],
          [0.04, 0.06, 0.062, 0.034, -0.01],
          [0.09, 0.044, 0.046, 0.03, -0.02],
          [0.13, 0.038, 0.04, 0.029, -0.03],
          [0.16, 0.034, 0.033, 0.027, -0.04],
          [0.178, 0.018, 0.018, 0.016, -0.05],
          [0.185, 0.003, 0.003, 0.003, -0.053]
        ];
        dhIn.add(mesh(loft(SK, -0.13, 0.185, 52, 40, browB), skinMat));
        const JW = [
          [0.0, 0.07, 0.008, 0.04, 0.0],
          [0.06, 0.06, 0.01, 0.056, -0.004],
          [0.12, 0.045, 0.009, 0.044, -0.01],
          [0.18, 0.036, 0.008, 0.036, -0.018],
          [0.22, 0.031, 0.007, 0.042, -0.024],
          [0.24, 0.02, 0.005, 0.03, -0.028],
          [0.252, 0.003, 0.003, 0.003, -0.03]
        ];
        jaw.add(mesh(loft(JW, -0.01, 0.252, 36, 30), skinMat));
        const chin = mesh(new THREE.ConeGeometry(0.018, 0.08, 6), castMat);
        chin.position.set(0, -0.068, 0.205);
        chin.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(0, -1, 0.6).normalize());
        chin.scale.set(1, 1, 0.7);
        jaw.add(chin);
        const gumMat = new THREE.MeshStandardMaterial({ color: 0x2a1424, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide });
        const floorG = new THREE.CircleGeometry(1, 32);
        const palate = mesh(floorG, gumMat, false);
        palate.rotation.x = Math.PI / 2;
        palate.position.set(0, -0.047, 0.05);
        palate.scale.set(0.05, 0.1, 1);
        dhIn.add(palate);
        const floor = mesh(floorG, gumMat, false);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0.004, 0.12);
        floor.scale.set(0.042, 0.1, 1);
        jaw.add(floor);
        const throat = mesh(new THREE.SphereGeometry(0.045, 14, 10), breathMat, false);
        throat.position.set(0, -0.045, -0.04);
        throat.scale.set(1.1, 0.5, 1.6);
        dhIn.add(throat);
        const tongue = mesh(new THREE.SphereGeometry(0.04, 14, 8), moltenMat, false);
        tongue.position.set(0, 0.005, 0.11);
        tongue.scale.set(0.7, 0.2, 2.2);
        jaw.add(tongue);
        const toothGeo = new THREE.ConeGeometry(0.008, 0.03, 5);
        const blade = new THREE.ConeGeometry(1, 1, 4);
        const put = (o, at, Y, Z) => {
          o.position.copy(at);
          orient(o, Y, Z);
          dhIn.add(o);
          return o;
        };
        [-1, 1].forEach(sg => {
          const A = a => (sg > 0 ? a : Math.PI - a);
          [0.0, 0.035, 0.07, 0.1, 0.13].forEach((Z, k) => {
            const p = sec(SK, Z, A(-0.32));
            const tt = mesh(toothGeo, castMat, false);
            tt.position.copy(p).add(V3(-sg * 0.004, -0.004, 0));
            tt.rotation.x = Math.PI;
            tt.scale.setScalar(k === 4 ? 1.9 : 0.9);
            dhIn.add(tt);
          });
          [0.05, 0.1, 0.15, 0.19].forEach((Z, k) => {
            const p = sec(JW, Z, A(0.4));
            const tt = mesh(toothGeo, castMat, false);
            tt.position.copy(p).add(V3(-sg * 0.003, 0.008, 0));
            tt.scale.setScalar(k === 3 ? 1.6 : 0.85);
            jaw.add(tt);
          });
          const eye = nrm(SK, 0.02, A(0.42), browB);
          const sock = mesh(new THREE.SphereGeometry(1, 16, 10), gumMat, false);
          put(sock, eye.p.clone().addScaledVector(eye.n, -0.004), V3(0, 1, 0.45), eye.n);
          sock.scale.set(0.012, 0.024, 0.012);
          const eyeM = mesh(new THREE.SphereGeometry(1, 16, 10), stringMat, false);
          put(eyeM, eye.p.clone().addScaledVector(eye.n, 0.002), V3(0, 1, 0.45), eye.n);
          eyeM.scale.set(0.0055, 0.02, 0.007);
          for (let k = 0; k < 3; k++) {
            const b = nrm(SK, -0.005 - k * 0.03, A(0.95 - k * 0.08), browB);
            const sp = mesh(blade, castMat);
            put(sp, b.p, V3(sg * 0.3, 0.35, -1), b.n);
            sp.position.addScaledVector(V3(0, 0, -1), 0.02);
            sp.scale.set(0.015, 0.065 - k * 0.01, 0.006);
          }
          const horn = (Z, a, dirs, r0) => {
            const b = nrm(SK, Z, A(a), browB);
            const pts = [b.p.clone().addScaledVector(b.n, -0.01)];
            dirs.forEach(d => pts.push(pts[pts.length - 1].clone().add(V3(sg * d[0], d[1], d[2]))));
            dhIn.add(mesh(tubeGeo(pts, u => Math.max(0.003, lerp(r0, 0.003, Math.pow(u, 0.9)) * (1 + 0.12 * Math.max(0, Math.sin(u * 38)) * (1 - u))), 36, 10).g, castMat));
          };
          horn(-0.06, 1.22, [[0.015, 0.035, -0.05], [0.02, 0.05, -0.09], [0.01, 0.06, -0.09], [-0.015, 0.045, -0.05], [-0.02, 0.025, -0.02]], 0.03);
          horn(-0.05, 0.62, [[0.03, 0.015, -0.06], [0.03, 0.015, -0.09], [0.015, 0.03, -0.07]], 0.022);
          horn(-0.055, 0.1, [[0.03, 0.0, -0.05], [0.025, 0.005, -0.07], [0.01, 0.02, -0.05]], 0.017);
          const fr = sec(SK, -0.075, A(-0.3));
          for (let k = 0; k < 8; k++) {
            const ph = lerp(0.8, -0.9, k / 7);
            const d = V3(sg * 0.42, Math.sin(ph), -Math.cos(ph)).normalize();
            const len = 0.06 + 0.04 * Math.sin(Math.PI * (k / 7)) + (k % 2) * 0.01;
            const sp = mesh(blade, plateMat);
            put(sp, fr.clone().add(V3(0, Math.sin(ph) * 0.025, 0)).addScaledVector(d, len * 0.45), d, V3(sg, 0, 0.15));
            sp.scale.set(0.02, len, 0.007);
          }
          for (let k = 0; k < 6; k++) {
            const ph = lerp(0.5, -0.65, k / 5);
            const d = V3(sg * 0.55, Math.sin(ph), -Math.cos(ph)).normalize();
            const sp = mesh(blade, castMat);
            put(sp, fr.clone().add(V3(sg * 0.006, Math.sin(ph) * 0.02, 0.03)).addScaledVector(d, 0.022), d, V3(sg, 0, 0.2));
            sp.scale.set(0.016, 0.048, 0.006);
          }
          [[-0.02, 0.12], [-0.045, -0.05], [-0.07, 0.2], [0.005, -0.08], [-0.09, 0.02], [0.03, 0.05], [-0.06, 0.45], [-0.03, 0.4]].forEach(([Z, a]) => {
            const b = nrm(SK, Z, A(a), browB);
            const sp = mesh(blade, plateMat);
            put(sp, b.p.clone().addScaledVector(b.n, 0.003), V3(sg * 0.15, 0.15, -1), b.n);
            sp.position.z -= 0.012;
            sp.scale.set(0.017, 0.045, 0.006);
          });
          const ns = nrm(SK, 0.172, A(0.4));
          const nos = mesh(new THREE.SphereGeometry(1, 10, 8), gumMat, false);
          put(nos, ns.p.clone().addScaledVector(ns.n, -0.002), V3(0, 1, 0.3), ns.n);
          nos.scale.set(0.004, 0.009, 0.004);
          const nh = mesh(new THREE.ConeGeometry(0.008, 0.03, 5), castMat);
          const nb = nrm(SK, 0.14, A(1.05));
          nh.position.copy(nb.p);
          nh.quaternion.setFromUnitVectors(V3(0, 1, 0), nb.n.clone().add(V3(0, 0, 0.6)).normalize());
          dhIn.add(nh);
        });
        const nb = nrm(SK, 0.12, Math.PI / 2);
        const nasal = mesh(new THREE.ConeGeometry(0.012, 0.05, 6), castMat);
        nasal.position.copy(nb.p).addScaledVector(nb.n, 0.012);
        nasal.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(0, 1, 0.6).normalize());
        dhIn.add(nasal);
        [-0.11, -0.09, -0.07, -0.05, -0.03, -0.01, 0.015, 0.04].forEach((Z, r) => {
          const n = r < 5 ? 8 : 5;
          for (let k = 0; k < n; k++) {
            const a = Math.PI / 2 + lerp(-0.95, 0.95, k / (n - 1)) + (r % 2) * 0.12;
            const b = nrm(SK, Z, a, browB);
            const sp = mesh(blade, plateMat);
            const side = Math.cos(a);
            put(sp, b.p.clone().addScaledVector(b.n, 0.006), V3(side * 0.5, 0.55 + 0.3 * (1 - Math.abs(side)), -1), b.n);
            sp.position.z -= 0.016;
            const big = 1 - r / 9;
            sp.scale.set(0.022 * big + 0.006, (0.075 + 0.02 * (1 - Math.abs(side))) * big + 0.015, 0.008);
          }
        });
        for (let k = 0; k < 5; k++) {
          const Z = lerp(-0.115, 0.02, k / 4);
          const b = nrm(SK, Z, Math.PI / 2, browB);
          const sp = mesh(blade, castMat);
          sp.position.copy(b.p).addScaledVector(b.n, 0.018);
          sp.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(0, 1, -0.9).normalize());
          sp.scale.set(0.012, 0.045 - k * 0.005, 0.005);
          dhIn.add(sp);
        }
      }

      const finGeo = (() => {
        const sh = new THREE.Shape();
        sh.moveTo(-0.5, 0);
        sh.bezierCurveTo(-0.3, 0.35, 0.1, 0.75, 0.55, 1.0);
        sh.bezierCurveTo(0.35, 0.6, 0.45, 0.3, 0.5, 0);
        sh.lineTo(-0.5, 0);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 1, curveSegments: 10 });
        g.translate(0, 0, -0.025);
        return g;
      })();
      const fin = (parent, at, tg, n, w, h, m = plateMat) => {
        const f = mesh(finGeo, m);
        const z = tg.clone().cross(n).normalize();
        const y = z.clone().cross(tg).normalize();
        f.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tg.clone().normalize(), y, z));
        f.position.copy(at);
        f.scale.set(w, h, 0.25);
        parent.add(f);
        return f;
      };
      const horns = add(head, new THREE.Group());
      {
        const VX = 0.52;
        const VY0 = 0.04;
        const VY1 = 0.5;
        const E = HP(VX, VY1);
        const nE = HN(E);
        const P = [];
        const NN = [];
        for (let i = 0; i <= 16; i++) {
          const x = lerp(-0.01, VX, i / 16);
          const p = HP(x, lerp(VY0, VY1, x / VX));
          P.push(p);
          NN.push(HN(p));
        }
        [[0.05, 0.04, -0.02], [0.1, 0.09, -0.06], [0.13, 0.15, -0.13], [0.14, 0.21, -0.22], [0.12, 0.26, -0.31], [0.08, 0.29, -0.37]].forEach(([x, y, z]) => {
          P.push(E.clone().add(V3(x, y, z)));
          NN.push(nE.clone());
        });
        const cv = new THREE.CatmullRomCurve3(P);
        const M = 90;
        const R = 22;
        const smp = Array.from({ length: M + 1 }, (_, k) => cv.getPoint(k / M));
        const acc = [0];
        for (let k = 1; k <= M; k++) acc.push(acc[k - 1] + smp[k].distanceTo(smp[k - 1]));
        const sE = 16 / (P.length - 1);
        const pos = [];
        const uv = [];
        const idx = [];
        for (let k = 0; k <= M; k++) {
          const s = k / M;
          const tq = cv.getTangent(s);
          const f = s * (P.length - 1);
          const i0 = Math.min(P.length - 2, Math.floor(f));
          const n = NN[i0].clone().lerp(NN[i0 + 1], f - i0);
          n.addScaledVector(tq, -n.dot(tq)).normalize();
          const b = n.clone().cross(tq).normalize();
          const m = smooth(sE - 0.12, sE + 0.06, s);
          const ax = Math.min(1, s / sE);
          const w = 0.056 * lerp(1, 0.8, ax);
          const h = 0.05;
          const lo = -0.014;
          const tail = smooth(sE, 1, s);
          const r = lerp(0.045, 0.004, Math.pow(tail, 0.85)) * (1 + 0.1 * Math.max(0, Math.sin(s * 70)) * smooth(sE, sE + 0.05, s));
          const cy = lerp(h * 0.45, 0, smooth(sE, sE + 0.1, s));
          for (let j = 0; j <= R; j++) {
            const ph = (j / R) * TAU;
            const c = Math.cos(ph);
            const sn = Math.sin(ph);
            const py0 = (h + lo) / 2 + ((h - lo) / 2) * Math.sign(sn) * Math.pow(Math.abs(sn), 1 / 3);
            const px0 = w * Math.sign(c) * Math.pow(Math.abs(c), 1 / 3) * lerp(1, 0.78, (py0 - lo) / (h - lo));
            pos.push(...smp[k].clone().addScaledVector(b, lerp(px0, r * c, m)).addScaledVector(n, lerp(py0, cy + r * sn, m)).toArray());
            uv.push(s, j / R);
          }
        }
        for (let k = 0; k < M; k++)
          for (let j = 0; j < R; j++) {
            const a = k * (R + 1) + j;
            const c2 = a + R + 1;
            idx.push(a, a + 1, c2, a + 1, c2 + 1, c2);
          }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        horns.add(mesh(geo, plateMat));
        const base2 = onHeadRing(0.05, 2.2);
        const n2 = HN(base2.clone());
        const h2 = [base2.clone().addScaledVector(n2, -0.02), base2.clone().addScaledVector(n2, 0.05).add(V3(0.02, 0.0, -0.04)), base2.clone().add(V3(0.08, 0.03, -0.17)), base2.clone().add(V3(0.08, 0.09, -0.27)), base2.clone().add(V3(0.05, 0.14, -0.31))];
        horns.add(mesh(tubeGeo(h2, u => Math.max(0.004, lerp(0.04, 0.004, Math.pow(u, 0.85)) * (1 + 0.1 * Math.max(0, Math.sin(u * 40)) * (1 - u))), 32, 10).g, plateMat));
        const fo = onHeadRing(-0.25, 1.72);
        for (let k = 0; k < 7; k++) {
          const ph = lerp(0.7, -0.8, k / 6);
          const d = V3(0.35, Math.sin(ph), -Math.cos(ph)).normalize();
          const len = 0.17 + 0.1 * Math.sin(Math.PI * (k / 6));
          const sp = mesh(new THREE.ConeGeometry(1, 1, 4), k % 2 ? castMat : plateMat);
          sp.position.copy(fo).addScaledVector(d, len * 0.42).add(V3(0.02, 0, 0));
          orient(sp, d, V3(1, 0, 0.3));
          sp.scale.set(0.04, len, 0.012);
          horns.add(sp);
        }
        const ths = [0.3, 0.62, 0.95, 1.3, 1.68, 2.05, 2.4];
        const hts = [0.09, 0.15, 0.2, 0.22, 0.18, 0.14, 0.09];
        ths.forEach((th, i) => {
          const p = V3(0, Math.sin(th) * HH, Math.cos(th) * HD);
          const n = HN(p.clone());
          const tg = V3(0, Math.cos(th) * HH, -Math.sin(th) * HD).normalize();
          fin(horns, p.clone().addScaledVector(n, -0.01), tg, n, 0.13, hts[i], i % 2 ? castMat : plateMat);
        });
      }
      const back = add(torso, new THREE.Group());
      [1.12, 1.0, 0.88, 0.76, 0.64, 0.52, 0.4].forEach((y, i) => {
        const a = Math.PI;
        const n = TN(a, y);
        const tg = TP(a, y - 0.02).sub(TP(a, y + 0.02)).normalize();
        fin(back, TP(a, y).addScaledVector(n, -0.01), tg, n, 0.15 - i * 0.008, 0.2 - i * 0.017, i % 2 ? castMat : plateMat);
      });
      const ribs = add(torso, new THREE.Group());
      [[0.8, 0.07], [0.66, 0.06], [0.52, 0.05]].forEach(([y0, dy], i) => {
        const K = 30;
        const pts = [];
        for (let k = 0; k <= K; k++) {
          const u = k / K;
          pts.push([lerp(2.45, 0.85 + i * 0.08, u), y0 - dy * Math.sin(u * Math.PI * 0.5) - 0.03 * u]);
        }
        ribs.add(mesh(strip(pts.map(([a, y]) => TP(a, y)), pts.map(([a, y]) => TN(a, y)), k => 0.03 * (1 - 0.85 * smooth(0.7, 1, k / K)) * (0.5 + 0.5 * smooth(0, 0.12, k / K)), k => 0.024 * (1 - 0.6 * smooth(0.75, 1, k / K))), plateMat));
        const [a, y] = pts[0];
        const n = TN(a, y);
        const sp = mesh(new THREE.ConeGeometry(0.026, 0.12, 4), castMat);
        sp.position.copy(TP(a, y)).addScaledVector(n, 0.04);
        sp.quaternion.setFromUnitVectors(V3(0, 1, 0), n.clone().add(V3(0.0, 0.2, -0.6)).normalize());
        sp.scale.set(1, 1, 0.45);
        ribs.add(sp);
      });
      const fangs = add(torso, new THREE.Group());
      for (let k = 0; k < 7; k++) {
        const a = lerp(0.25, 1.75, k / 6);
        const y = 0.045;
        const p = TP(a, y);
        const n = TN(a, y);
        const len = k % 2 ? 0.07 : 0.1;
        const pts = [p.clone().addScaledVector(n, 0.02), p.clone().addScaledVector(n, 0.03).add(V3(0, -len * 0.5, 0)), p.clone().addScaledVector(n, 0.012).add(V3(0, -len, 0))];
        fangs.add(mesh(tubeGeo(pts, u => Math.max(0.002, lerp(0.016, 0.002, u)), 12, 8).g, castMat));
      }
      const claw = add(port, new THREE.Group());
      {
        const zf = x => 0.012 - 0.8 * x * x;
        const at = (r, a, lift) => {
          const x = Math.cos(a) * r;
          return V3(x, Math.sin(a) * r, zf(x) + lift);
        };
        const palm = mesh(new THREE.SphereGeometry(1, 24, 16), plateMat);
        palm.position.set(0.27, 0.02, zf(0.27) + 0.012);
        palm.rotation.set(0, 0.45, 0.25);
        palm.scale.set(0.07, 0.1, 0.035);
        claw.add(palm);
        const wrist = [V3(0.27, 0.03, zf(0.27) + 0.01), V3(0.33, 0.1, zf(0.33) + 0.02), V3(0.38, 0.18, zf(0.38) + 0.0), V3(0.4, 0.24, zf(0.4) - 0.04)];
        claw.add(mesh(tubeGeo(wrist, u => lerp(0.05, 0.035, u), 16, 12).g, plateMat));
        [[1.25, 0.9], [0.55, 1], [-0.1, 1], [-0.75, 0.9], [-1.55, 0.75]].forEach(([a, sc], i) => {
          const s0 = V3(0.27, 0.02, zf(0.27) + 0.02).add(V3(Math.cos(a) * 0.04, Math.sin(a) * 0.05, 0));
          const k1 = at(0.235, a * 0.6 + (i === 4 ? -0.4 : 0), 0.05);
          const k2 = at(0.19, a * 0.8, 0.045);
          const tip = at(0.145, a * 0.85, 0.02);
          const pts = [s0, s0.clone().lerp(k1, 0.5).add(V3(0, 0, 0.015)), k1, k2, tip];
          const fc = new THREE.CatmullRomCurve3(pts);
          claw.add(mesh(tubeGeo(pts, u => (lerp(0.03, 0.019, u) + 0.006 * Math.exp(-Math.pow((u - 0.45) / 0.06, 2)) + 0.006 * Math.exp(-Math.pow((u - 0.72) / 0.06, 2))) * sc, 36, 12).g, plateMat));
          [0.3, 0.58, 0.82].forEach((u, j) => {
            const q = fc.getPointAt(u);
            const tg = fc.getTangentAt(u);
            const sp = mesh(new THREE.ConeGeometry(1, 1, 4), castMat);
            sp.position.copy(q).add(V3(0, 0, 0.026 * sc - j * 0.002));
            orient(sp, tg, V3(0, 0, 1));
            sp.scale.set(0.018 * sc, 0.05 * sc, 0.008);
            claw.add(sp);
          });
          const dIn = V3(-Math.cos(a * 0.85), -Math.sin(a * 0.85), 0);
          const tl = [tip.clone(), tip.clone().addScaledVector(dIn, 0.035).add(V3(0, 0, 0.01)), tip.clone().addScaledVector(dIn, 0.07).add(V3(0, 0, -0.01)), tip.clone().addScaledVector(dIn, 0.085).add(V3(0, 0, -0.04))];
          claw.add(mesh(tubeGeo(tl, u => Math.max(0.002, lerp(0.02, 0.002, u)) * sc, 16, 8).g, castMat));
        });
      }
      const pad = add(socket, new THREE.Group());
      {
        pad.position.set(0.02, 0.03, 0);
        pad.rotation.z = -0.35;
        [0, 1, 2].forEach(i => {
          const sh = mesh(new THREE.SphereGeometry(0.21 - i * 0.032, 32, 12, 0, TAU, 0, Math.PI * 0.37), i === 1 ? castMat : plateMat);
          sh.scale.set(1, 0.7, 1.06);
          sh.position.set(0.03 * i, -0.045 * i, 0);
          pad.add(sh);
        });
        [[-0.13, 0.12, 0.26], [-0.04, 0.15, 0.34], [0.05, 0.15, 0.3], [0.13, 0.12, 0.22]].forEach(([z, y, l]) => {
          const pts = [V3(-0.02, y - 0.04, z), V3(0.02, y + 0.06, z - 0.03), V3(0.0, y + l * 0.55, z - l * 0.55), V3(-0.05, y + l * 0.75, z - l * 0.95)];
          pad.add(mesh(tubeGeo(pts, u => Math.max(0.003, lerp(0.034, 0.003, u)) * (1 + 0.1 * Math.max(0, Math.sin(u * 30)) * (1 - u)), 24, 8).g, castMat));
        });
        for (let k = 0; k < 11; k++) {
          const a = lerp(-Math.PI * 0.65, Math.PI * 0.65, k / 10);
          const d = V3(Math.cos(a), -0.75, Math.sin(a)).normalize();
          const len = k % 2 ? 0.09 : 0.13;
          const sp = mesh(new THREE.ConeGeometry(1, 1, 4), k % 2 ? castMat : plateMat);
          sp.position.set(Math.cos(a) * 0.19, 0.03, Math.sin(a) * 0.2).addScaledVector(d, len * 0.4);
          orient(sp, d, V3(Math.cos(a), 0.6, Math.sin(a)));
          sp.scale.set(0.035, len, 0.01);
          pad.add(sp);
        }
      }
      const wing = add(bodyG, new THREE.Group());
      const wingQ = new THREE.Quaternion();
      {
        const E = V3(0.12, 0.24, -0.08);
        const tips = [V3(0.15, 0.68, -0.2), V3(0.34, 0.56, -0.3), V3(0.44, 0.31, -0.28), V3(0.33, 0.06, -0.2)];
        const fc = tp => new THREE.QuadraticBezierCurve3(E.clone(), E.clone().lerp(tp, 0.5).add(V3(0.03, 0.04, -0.03)), tp.clone());
        const curves = tips.map(fc).concat([new THREE.LineCurve3(E.clone(), V3(0.0, -0.2, 0.02))]);
        const pos = [];
        const idx = [];
        const N = 10;
        const M = 8;
        for (let pi = 0; pi < 4; pi++) {
          const A = curves[pi];
          const B = curves[pi + 1];
          const off = pos.length / 3;
          for (let i = 0; i <= N; i++)
            for (let j = 0; j <= M; j++) {
              const s = i / N;
              const c = j / M;
              const s2 = s * (1 - 0.3 * Math.sin(Math.PI * c) * (pi === 3 ? 0.4 : 1));
              const p = A.getPoint(s2).lerp(B.getPoint(s2), c);
              p.z -= 0.025 * Math.sin(Math.PI * c) * Math.sin(Math.PI * s);
              pos.push(p.x, p.y, p.z);
            }
          for (let i = 0; i < N; i++)
            for (let j = 0; j < M; j++) {
              const a = off + i * (M + 1) + j;
              const b = a + M + 1;
              idx.push(a, b, a + 1, a + 1, b, b + 1);
            }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        wing.add(mesh(g, wingMat, false));
        wing.add(mesh(tubeGeo([V3(0, 0, 0), V3(0.05, 0.13, -0.03), E], u => lerp(0.032, 0.022, u), 12, 10).g, castMat));
        tips.forEach(tp => {
          const c = fc(tp);
          wing.add(mesh(tubeGeo(c.getPoints(6), u => lerp(0.018, 0.005, u), 16, 8).g, castMat));
        });
        const kn = mesh(new THREE.SphereGeometry(0.03, 12, 10), castMat);
        kn.position.copy(E);
        wing.add(kn);
        const cl = mesh(new THREE.ConeGeometry(0.016, 0.09, 5), castMat);
        cl.position.copy(E).add(V3(0.0, 0.05, 0.02));
        cl.rotation.set(0.4, 0, -0.2);
        wing.add(cl);
        const a = 2.3;
        const y = 1.0;
        wing.position.copy(TP(a, y)).add(V3(0, TIP, 0)).addScaledVector(TN(a, y), 0.01);
        const X = V3(0.95, 0, -0.32).normalize();
        wing.scale.setScalar(1.45);
        const Y = V3(0, 1, 0);
        wingQ.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, X.clone().cross(Y)));
        wing.quaternion.copy(wingQ);
      }
      const talons = add(legs[1], new THREE.Group());
      {
        const tip = V3(0.215, -0.56 * LEGL, -0.01);
        [[-0.04, 0.3], [0, 0], [0.04, -0.3]].forEach(([dx, yaw]) => {
          const d = V3(Math.sin(yaw) * 0.3 + dx, 0, 1).normalize();
          const pts = [tip.clone().add(V3(dx, 0.07, -0.01)), tip.clone().add(V3(dx, 0.03, 0.03)).addScaledVector(d, 0.03), tip.clone().add(V3(dx, -0.02, 0)).addScaledVector(d, 0.09), tip.clone().add(V3(dx, -0.07, 0)).addScaledVector(d, 0.1)];
          talons.add(mesh(tubeGeo(pts, u => Math.max(0.003, lerp(0.022, 0.003, u)), 16, 8).g, castMat));
        });
        const spur = mesh(new THREE.ConeGeometry(0.016, 0.08, 4), castMat);
        spur.position.copy(tip).add(V3(0, 0.1, -0.06));
        spur.rotation.x = -2.3;
        talons.add(spur);
      }
      const spade = add(tailTip, new THREE.Group());
      {
        const sh = new THREE.Shape();
        sh.moveTo(0, -0.02);
        sh.bezierCurveTo(0.06, -0.06, 0.16, 0.0, 0.15, 0.08);
        sh.bezierCurveTo(0.12, 0.17, 0.04, 0.24, 0, 0.34);
        sh.bezierCurveTo(-0.04, 0.24, -0.12, 0.17, -0.15, 0.08);
        sh.bezierCurveTo(-0.16, 0.0, -0.06, -0.06, 0, -0.02);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 10 });
        g.translate(0, 0, -0.01);
        g.rotateX(Math.PI / 2);
        spade.add(mesh(g, castMat));
        const rib = mesh(new THREE.ConeGeometry(0.02, 0.3, 4), plateMat);
        rib.rotation.x = Math.PI / 2;
        rib.position.set(0, 0.02, 0.16);
        rib.scale.set(1, 1, 0.5);
        spade.add(rib);
      }
      const beam = new THREE.Mesh((() => {
        const g = new THREE.ConeGeometry(1, 1, 20, 1, true);
        g.translate(0, -0.5, 0);
        return g;
      })(), trailMat);
      beam.visible = false;
      big.add(beam);
      const core2 = new THREE.Mesh((() => {
        const g = new THREE.CylinderGeometry(1, 0.4, 1, 14, 1, true);
        g.translate(0, -0.5, 0);
        return g;
      })(), breathMat);
      core2.visible = false;
      big.add(core2);
      const orbs = Array.from({ length: 10 }, (_, k) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), breathMat);
        m.visible = false;
        big.add(m);
        return { m, off: k / 10, a: k * 2.4 };
      });
      let dir = V3(0, 0, 1);
      const want = V3(0, 0, 1);
      const hideFx = () => {
        beam.visible = false;
        core2.visible = false;
        orbs.forEach(o => (o.m.visible = false));
      };
      return {
        customTail: true,
        set: on => {
          K.set(on);
          if (!on) hideFx();
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0x2f8a6a : 0x4a3c9c);
          wingMat.color.setHex(shiny ? 0x2a6a58 : 0x3a2f78);
          skinMat.color.setHex(shiny ? 0xe6c27a : 0x8c89a6);
        },
        rest(S, t, motion) {
          S.hL.set(1.05 + Math.sin(t * 1.1) * 0.035 * motion, TIP + 0.92 + Math.sin(t * 1.7) * 0.03 * motion, 0.42);
          want.set(0.3 + Math.sin(t * 1.1 + 0.6) * 0.08 * motion, 0.12, 1);
          S.lean += 0.08;
          S.headPitch += 0.05;
          S.spinY -= 0.1;
          S.legK = Math.max(S.legK, 0.15);
          S.jaw = 0.06 + 0.1 * Math.max(0, Math.sin(t * 0.7)) * motion;
          S.breath = 0;
          S.wingK = 0;
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.33, 0.4, p));
            const strike = smooth(0.33, 0.42, p) * (1 - smooth(0.7, 0.95, p));
            S.hL.lerp(V3(0.88, TIP + 1.36, 0.05), wind);
            want.lerp(V3(0.12, 0.35, 1), wind);
            S.hL.lerp(V3(0.3, TIP + 1.0, 0.85), strike);
            want.lerp(V3(-0.15, -0.12, 1), strike);
            S.jaw = Math.max(S.jaw, 0.95 * smooth(0.12, 0.32, p) * (1 - smooth(0.4, 0.45, p)));
            S.lean += -0.06 * wind + 0.18 * strike;
            S.spinY += 0.1 * wind - 0.3 * strike;
            S.glow = 0.5 * wind + 0.6 * strike;
            S.impact = p > 0.43 && p < 0.6 ? 1 - smooth(0.43, 0.6, p) : 0;
            S.sparkK = p > 0.44 && p < 0.7 ? smooth(0.44, 0.7, p) : -1;
            S.mouthK = 0.6 * strike;
            S.wingK = 0.3 * wind;
            return true;
          }
          if (nm === "fling") {
            const rear = smooth(0.04, 0.34, p) * (1 - smooth(0.38, 0.46, p));
            const fire = smooth(0.38, 0.46, p) * (1 - smooth(0.84, 0.97, p));
            S.hL.lerp(V3(0.86, TIP + 1.6, 0.15), rear);
            want.lerp(V3(0.2, 0.75, 0.55), rear);
            S.hL.lerp(V3(0.4, TIP + 1.12, 0.8), fire);
            want.lerp(V3(-0.1, -0.06, 1), fire);
            S.jaw = Math.max(S.jaw, smooth(0.16, 0.36, p) * (1 - smooth(0.86, 0.96, p)));
            S.breath = smooth(0.43, 0.5, p) * (1 - smooth(0.8, 0.9, p));
            S.lean += -0.12 * rear + 0.14 * fire;
            S.hover += 0.12 * rear;
            S.glow = 1.2 * rear + 0.9 * fire;
            S.flash = 0.7 * rear + 0.4 * S.breath;
            S.sparkK = p > 0.58 && p < 0.86 ? smooth(0.58, 0.86, p) : -1;
            S.mouthK = 0.7 * fire;
            S.headPitch += -0.12 * rear + 0.1 * fire;
            S.wingK = rear + 0.6 * fire;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(0.95, TIP + 1.0, 0.15), S.spinK);
            want.lerp(V3(1, 0, 0.3), S.spinK);
            S.wingK = 0.6 * S.spinK;
          }
          if (nm === "jump") {
            S.hL.lerp(V3(0.95, TIP + 1.35, 0.3), S.air);
            want.lerp(V3(0.25, 0.4, 1), S.air);
            S.wingK = S.air;
          }
          return false;
        },
        arm(S, t, motion) {
          dir.lerp(want.clone().normalize(), 0.5).normalize();
          const rad = u => lerp(0.125, 0.1, smooth(0.25, 0.6, u)) + 0.03 * smooth(0.82, 1, u);
          const c = moltenArm(arm, shoulders[1], S.hL, t, motion, rad, 0.75);
          const upOf = u => {
            const tg = c.getTangentAt(u);
            const up = V3(0, 1, 0).addScaledVector(tg, -tg.y);
            if (up.lengthSq() < 1e-4) up.set(0, 0, -1);
            return up.normalize();
          };
          spines.forEach((sp, i) => {
            const u = lerp(0.14, 0.9, i / 8);
            const tg = c.getTangentAt(u);
            const up = upOf(u);
            sp.position.copy(c.getPointAt(u)).addScaledVector(up, rad(u) * 0.92 + 0.03);
            sp.quaternion.setFromUnitVectors(V3(0, 1, 0), up.clone().addScaledVector(tg, -0.7).normalize());
            sp.scale.set(lerp(1.3, 0.8, i / 8), lerp(1.3, 0.75, i / 8), 0.5);
          });
          bellies.forEach((b, i) => {
            const u = lerp(0.4, 0.97, i / 8);
            const y = c.getTangentAt(u);
            const z = upOf(u).negate();
            const x = y.clone().cross(z).normalize();
            b.position.copy(c.getPointAt(u));
            b.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
            const r = rad(u) + 0.006;
            b.scale.set(r, 1, r);
          });
          neckScales.forEach(N => {
            const tg = c.getTangentAt(N.u);
            const up = upOf(N.u);
            const sd = tg.clone().cross(up).normalize();
            const rd = up.clone().multiplyScalar(Math.cos(N.a)).addScaledVector(sd, Math.sin(N.a));
            N.m.position.copy(c.getPointAt(N.u)).addScaledVector(rd, rad(N.u) * 0.93);
            orient(N.m, tg, rd);
            N.m.scale.setScalar((rad(N.u) / 0.1) * 1.25);
          });
          const tg = c.getTangentAt(1);
          const z = tg.clone().lerp(dir, 0.65).normalize();
          let x = V3(0, 1, 0).cross(z);
          if (x.lengthSq() < 1e-4) x = V3(1, 0, 0);
          x.normalize();
          const y = z.clone().cross(x).normalize();
          dh.position.copy(c.getPointAt(1)).addScaledVector(tg, 0.3);
          dh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
          jaw.rotation.x = 0.62 * (S.jaw || 0);
          dh.updateMatrix();
          const k = S.wingK || 0;
          const fl = Math.sin(t * 1.5) * 0.04 * motion + (k > 0 ? Math.sin(t * 9) * 0.12 * k : 0);
          wing.quaternion.copy(wingQ).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15 * k, -0.75 * k - fl, 0.3 * k + fl)));
          dh.updateMatrixWorld(true);
        },
        fx(S, nm, p, t) {
          const mouth = big.worldToLocal(dhIn.localToWorld(V3(0, -0.05, 0.17)));
          const d = big.worldToLocal(dhIn.localToWorld(V3(0, -0.05, 1.17))).sub(mouth).normalize();
          const on = (S.breath || 0) > 0.01;
          beam.visible = on;
          core2.visible = on;
          if (on) {
            const f = S.breath;
            const len = 0.4 + 3.2 * smooth(0, 1, f);
            const q = new THREE.Quaternion().setFromUnitVectors(V3(0, -1, 0), d);
            beam.position.copy(mouth);
            beam.quaternion.copy(q);
            beam.scale.set(0.42 * len * 0.35 + 0.05, len, 0.42 * len * 0.35 + 0.05);
            core2.position.copy(mouth);
            core2.quaternion.copy(q);
            core2.scale.set(0.09 + 0.05 * len, len * 0.95, 0.09 + 0.05 * len);
            S.trailOpacity = 0.26 * f;
            breathMat.opacity = 0.55 * f;
            orbs.forEach(o => {
              const u = (t * 1.6 + o.off) % 1;
              const r = 0.06 + 0.35 * u * len * 0.3;
              const side = V3(Math.cos(o.a + t * 6), Math.sin(o.a + t * 6), 0).applyQuaternion(q);
              o.m.visible = true;
              o.m.position.copy(mouth).addScaledVector(d, u * len).addScaledVector(side, r * 0.5);
              o.m.scale.setScalar(0.6 + 1.6 * u);
            });
          } else orbs.forEach(o => (o.m.visible = false));
          if (nm === "fling" && S.sparkK >= 0) return mouth.clone().addScaledVector(d, 3.4);
          return big.worldToLocal(dhIn.localToWorld(V3(0, 0, 0.28)));
        }
      };
    })();

    const fistKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const wraps = [0.6, 0.71, 0.82].map(() => add(bodyG, mesh(new THREE.TorusGeometry(1, 0.17, 8, 28), castMat)));
      const fist = add(bodyG, new THREE.Group());
      const fistIn = new THREE.Group();
      fist.add(fistIn);
      const FZ = 0.26;
      {
        const g = new THREE.SphereGeometry(1, 44, 32);
        const q = g.attributes.position;
        const f = v => Math.sign(v) * Math.pow(Math.abs(v), 0.55);
        for (let i = 0; i < q.count; i++) {
          const x = f(q.getX(i));
          const y = f(q.getY(i));
          const z = f(q.getZ(i));
          const k = (z + 1) / 2;
          q.setXYZ(i, x * 0.25 * lerp(0.82, 1, k), y * 0.2 * lerp(0.9, 1, k), z * 0.24 + FZ);
        }
        g.computeVertexNormals();
        fistIn.add(mesh(g, castMat));
        [-0.165, -0.055, 0.055, 0.165].forEach((x, i) => {
          const kn = mesh(new THREE.SphereGeometry(0.072, 20, 14), castMat);
          kn.scale.set(1, 0.78, 0.86);
          kn.position.set(x, 0.135, FZ + 0.2 - 0.016 * Math.abs(i - 1.5));
          fistIn.add(kn);
        });
        [-0.11, 0, 0.11].forEach(x => {
          const sf = mesh(new THREE.BoxGeometry(0.012, 0.13, 0.012), hotMat, false);
          sf.position.set(x, -0.02, FZ + 0.232);
          fistIn.add(sf);
          const st = mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), hotMat, false);
          st.position.set(x, 0.19, FZ + 0.06);
          fistIn.add(st);
        });
        const th = tubeGeo([V3(-0.25, -0.02, FZ - 0.08), V3(-0.22, -0.1, FZ + 0.1), V3(-0.12, -0.15, FZ + 0.22), V3(0.0, -0.16, FZ + 0.25)], u => 0.068 * (1 - 0.3 * u), 30, 14);
        fistIn.add(mesh(th.g, castMat));
        const tipT = mesh(new THREE.SphereGeometry(0.048, 16, 12), castMat);
        tipT.position.set(0.0, -0.16, FZ + 0.25);
        fistIn.add(tipT);
        const flare = mesh(new THREE.LatheGeometry([V2(0.118, -0.2), V2(0.124, -0.14), V2(0.138, -0.08), V2(0.158, -0.03), V2(0.172, 0.01), V2(0.17, 0.04)], 32), moltenMat);
        flare.rotation.x = Math.PI / 2;
        fistIn.add(flare);
        const cuff = mesh(new THREE.TorusGeometry(0.178, 0.038, 10, 32), castMat);
        cuff.position.z = 0.02;
        fistIn.add(cuff);
        const cuff2 = mesh(new THREE.TorusGeometry(0.176, 0.016, 8, 32), darkSteel);
        cuff2.position.z = 0.075;
        fistIn.add(cuff2);
      }
      const band = add(head, new THREE.Group());
      const bandY = a => 0.7 - 0.14 * (1 - Math.cos(a)) / 2;
      const knotP = onHeadRing(bandY(Math.PI), Math.PI);
      {
        const N = 72;
        const pts = [];
        for (let i = 0; i <= N; i++) {
          const a = (i / N) * TAU;
          pts.push(onHeadRing(bandY(a), a));
        }
        band.add(mesh(strip(pts, pts.map(HN), () => 0.058, () => 0.036), castMat));
        const n = HN(knotP);
        const kn = mesh(new THREE.SphereGeometry(0.055, 18, 14), castMat);
        kn.scale.set(1.3, 0.9, 0.75);
        kn.position.copy(knotP).addScaledVector(n, 0.04);
        band.add(kn);
        [-1, 1].forEach(sg => {
          const lp = mesh(new THREE.TorusGeometry(0.03, 0.016, 8, 18), castMat);
          lp.position.copy(knotP).addScaledVector(n, 0.045).add(V3(sg * 0.07, 0.01, 0));
          lp.rotation.set(0, Math.PI / 2 - sg * 0.5, sg * 0.5);
          band.add(lp);
        });
        [-0.9, -0.4, 0.4, 0.9].forEach((a, i) => {
          const y = bandY(a) - 0.16 - (i % 2) * 0.05;
          const pp = onHeadRing(y, a);
          const dr = mesh(dropGeo, castMat);
          dr.position.copy(pp).addScaledVector(HN(pp), 0.012);
          dr.scale.set(0.8, 1.2 + (i % 2) * 0.5, 0.8);
          band.add(dr);
        });
      }
      const tails = [-1, 1].map(sg => {
        const m = dyn(castMat);
        K.parts.push(m);
        return { m, sg };
      });
      const belt = add(torso, new THREE.Group());
      {
        const BY = 0.52;
        const N = 72;
        const pts = [];
        for (let i = 0; i <= N; i++) pts.push([(i / N) * TAU, BY]);
        belt.add(mesh(strip(pts.map(([a, y]) => TP(a, y)), pts.map(([a, y]) => TN(a, y)), () => 0.06, () => 0.03), castMat));
        const plate = new THREE.Group();
        const P = TP(0, BY + 0.01);
        const n = TN(0, BY + 0.01);
        plate.position.copy(P).addScaledVector(n, 0.03);
        plate.quaternion.setFromUnitVectors(V3(0, 0, 1), n);
        belt.add(plate);
        const disc = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 40), castMat);
        disc.rotation.x = Math.PI / 2;
        disc.scale.set(1.35, 1, 0.95);
        plate.add(disc);
        const rim = mesh(new THREE.TorusGeometry(0.13, 0.016, 8, 40), plateMat);
        rim.scale.set(1.35, 0.95, 1);
        rim.position.z = 0.02;
        plate.add(rim);
        const sh = new THREE.Shape();
        for (let k = 0; k < 10; k++) {
          const a = Math.PI / 2 + (k * Math.PI) / 5;
          const r = k % 2 ? 0.032 : 0.075;
          sh[k ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
        }
        const star = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 }), plateMat);
        star.position.z = 0.02;
        plate.add(star);
        [-1, 1].forEach(sg => {
          const a = sg * 0.95;
          const sp = new THREE.Group();
          sp.position.copy(TP(a, BY)).addScaledVector(TN(a, BY), 0.03);
          sp.quaternion.setFromUnitVectors(V3(0, 0, 1), TN(a, BY));
          belt.add(sp);
          const d = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 24), castMat);
          d.rotation.x = Math.PI / 2;
          d.scale.set(1, 1.2, 1);
          sp.add(d);
          const r2 = mesh(new THREE.TorusGeometry(0.06, 0.01, 6, 24), plateMat);
          r2.scale.set(1, 1.2, 1);
          r2.position.z = 0.016;
          sp.add(r2);
        });
      }
      const frameP = add(port, new THREE.Group());
      {
        const oct = mesh(new THREE.TorusGeometry(0.165, 0.03, 6, 8), castMat);
        oct.rotation.z = Math.PI / 8;
        oct.position.z = -0.006;
        frameP.add(oct);
        for (let k = 0; k < 4; k++) {
          const a = Math.PI / 4 + (k * Math.PI) / 2;
          const r = mesh(new THREE.SphereGeometry(0.026, 12, 8), plateMat);
          r.position.set(Math.cos(a) * 0.165, Math.sin(a) * 0.165, 0.016);
          frameP.add(r);
        }
      }
      const pad = add(socket, new THREE.Group());
      {
        pad.position.set(0.02, 0.04, 0);
        pad.rotation.z = -0.4;
        [0, 1, 2].forEach(i => {
          const sh = mesh(new THREE.SphereGeometry(0.215 - i * 0.025, 32, 12, 0, TAU, 0, Math.PI * 0.4), i === 1 ? plateMat : castMat);
          sh.scale.set(1, 0.72, 1.08);
          sh.position.set(0.035 * i, -0.05 * i, 0);
          pad.add(sh);
        });
        const ridge = mesh(new THREE.TorusGeometry(0.175, 0.03, 8, 24, Math.PI), plateMat);
        ridge.rotation.set(0, Math.PI / 2, 0);
        ridge.scale.set(1, 0.62, 1);
        ridge.position.y = 0.02;
        pad.add(ridge);
        [-0.12, 0, 0.12].forEach(z => {
          const rv = mesh(new THREE.SphereGeometry(0.02, 10, 8), plateMat);
          rv.position.set(0.15, 0.06, z);
          pad.add(rv);
        });
      }
      const rings = [0, 1, 2].map(() => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 40), trailMat);
        m.visible = false;
        big.add(m);
        return m;
      });
      let fistK = 1;
      return {
        set: on => {
          K.set(on);
          if (!on) rings.forEach(r => (r.visible = false));
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0xe05a3c : 0xc03028);
        },
        rest(S, t, motion) {
          S.hL.set(0.78, TIP + 0.5, 0.3).add(V3(0, Math.sin(t * 2.6) * 0.025 * motion, 0));
          S.hR.set(-0.56, TIP + 0.98, 0.42).add(V3(0, Math.sin(t * 2.6 + 0.8) * 0.02 * motion, 0));
          S.hover += Math.sin(t * 2.6) * 0.018 * motion;
          S.lean += 0.06;
          S.spinY -= 0.12;
          S.headPitch += 0.1;
          S.legK = 0.3;
          S.fistK = 1;
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.42, p));
            const strike = smooth(0.34, 0.44, p) * (1 - smooth(0.7, 0.95, p));
            S.hL.lerp(V3(0.72, TIP + 0.92, -0.18), wind);
            S.hL.lerp(V3(0.16, TIP + 1.02, 1.08), strike);
            S.hR.lerp(V3(-0.5, TIP + 1.05, 0.5), strike);
            S.spinY += 0.3 * wind - 0.38 * strike;
            S.lean += -0.06 * wind + 0.16 * strike;
            S.glow = 0.5 * wind + 0.8 * strike;
            S.impact = p > 0.42 && p < 0.6 ? 1 - smooth(0.42, 0.6, p) : 0;
            S.punchK = p > 0.42 && p < 0.66 ? smooth(0.42, 0.66, p) : -1;
            S.sparkK = p > 0.42 && p < 0.7 ? smooth(0.42, 0.7, p) : -1;
            S.mouthK = 0.6 * strike;
            S.fistK = 1 + 0.08 * strike;
            return true;
          }
          if (nm === "fling") {
            const charge = smooth(0.04, 0.4, p) * (1 - smooth(0.48, 0.55, p));
            const blast = smooth(0.5, 0.6, p) * (1 - smooth(0.82, 0.98, p));
            S.hL.lerp(V3(0.78, TIP + 0.72, -0.28), charge);
            S.hL.lerp(V3(0.14, TIP + 1.08, 1.12), blast);
            S.hR.lerp(V3(-0.6, TIP + 1.15, 0.35), charge);
            S.spinY += 0.4 * charge - 0.45 * blast;
            S.lean += -0.05 * charge + 0.24 * blast;
            S.hover += -0.05 * charge + 0.06 * blast;
            S.squash = 1 - 0.05 * charge + 0.03 * blast;
            S.legK = Math.max(S.legK, 0.5 * charge + 0.3 * blast);
            S.glow = 1.4 * charge + 1.0 * blast;
            S.flash = 0.7 * charge + 0.6 * blast;
            S.impact = p > 0.58 && p < 0.78 ? 1 - smooth(0.58, 0.78, p) : 0;
            S.waveK = p > 0.58 && p < 0.98 ? smooth(0.58, 0.98, p) : -1;
            S.sparkK = p > 0.58 && p < 0.85 ? smooth(0.58, 0.85, p) : -1;
            S.headPitch += 0.12 * blast - 0.08 * charge;
            S.mouthK = 0.8 * blast;
            S.fistK = 1 + 0.32 * charge + 0.22 * blast;
            return true;
          }
          if (nm === "spin") S.hL.lerp(V3(0.95, TIP + 0.95, 0.0), S.spinK);
          if (nm === "jump") S.hL.lerp(V3(0.42, TIP + 1.85, 0.32), S.air);
          return false;
        },
        arm(S, t, motion) {
          const rad = u => lerp(0.12, 0.185, smooth(0.2, 1, u));
          const c = moltenArm(arm, shoulders[1], S.hL, t, motion, rad);
          [0.6, 0.71, 0.82].forEach((u, i) => {
            wraps[i].position.copy(c.getPointAt(u));
            wraps[i].quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(u));
            wraps[i].rotateX(i % 2 ? 0.32 : -0.32);
            wraps[i].scale.setScalar(rad(u) + 0.006);
          });
          const end = c.getPointAt(1);
          const d = c.getTangentAt(1);
          const { hx, hy } = frame(d);
          fist.position.copy(end).addScaledVector(d, 0.1);
          fist.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, d));
          fistK = lerp(fistK, S.fistK || 1, 0.35);
          fistIn.scale.setScalar(1.55 * fistK);
          head.updateMatrixWorld(true);
          const kw = bodyG.worldToLocal(head.localToWorld(knotP.clone().addScaledVector(HN(knotP), 0.03)));
          tails.forEach(T => {
            const sw = Math.sin(t * 2.1 + T.sg) * 0.04 * motion;
            const sw2 = Math.sin(t * 2.1 + T.sg - 0.8) * 0.07 * motion;
            const back = 0.12 * (S.lean > 0.1 ? S.lean * 3 : 0);
            const pts = [kw, kw.clone().add(V3(T.sg * 0.06, -0.08, -0.08 - back * 0.3)), kw.clone().add(V3(T.sg * 0.11 + sw, -0.26, -0.17 - back * 0.6)), kw.clone().add(V3(T.sg * 0.15 + sw2, -0.46 + back * 0.4, -0.22 - back)), kw.clone().add(V3(T.sg * 0.17 + sw2 * 1.4, -0.62 + back * 0.5, -0.24 - back * 1.2))];
            flexTube(T.m, pts, (u, v) => (0.034 * (1 - 0.3 * u) - (u > 0.9 ? 0.016 * (u - 0.9) / 0.1 : 0)) * (0.55 + 0.45 * Math.abs(Math.cos(v * TAU))), 24, 10);
          });
        },
        fx(S, nm) {
          fist.updateMatrixWorld(true);
          const tip = big.worldToLocal(fistIn.localToWorld(V3(0, 0, FZ + 0.3)));
          const fwd = big.worldToLocal(fistIn.localToWorld(V3(0, 0, FZ + 1.3))).sub(tip).normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), fwd);
          rings.forEach((r, i) => {
            let k = -1;
            if (nm === "swipe" && S.punchK >= 0 && i === 0) k = S.punchK;
            if (nm === "fling" && S.waveK >= 0) k = S.waveK - i * 0.14;
            r.visible = k >= 0 && k <= 1;
            if (!r.visible) return;
            const far = nm === "fling" ? k * 2.4 : k * 0.4;
            r.position.copy(tip).addScaledVector(fwd, far);
            r.quaternion.copy(q);
            r.scale.setScalar(nm === "fling" ? 0.18 + k * 0.7 : 0.15 + k * 0.35);
          });
          if (nm === "fling" && S.waveK >= 0) S.trailOpacity = 0.8 * (1 - S.waveK);
          if (nm === "swipe" && S.punchK >= 0) S.trailOpacity = 0.7 * (1 - S.punchK);
          return tip;
        },
        hide() {
          rings.forEach(r => (r.visible = false));
        }
      };
    })();

    const furMat = new THREE.MeshStandardMaterial({ color: 0xe6edf2, roughness: 1, metalness: 0 });
    const iceMat = new THREE.MeshStandardMaterial({ color: 0xe4fbff, emissive: 0x58d4ff, emissiveIntensity: 0.45, roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.88, flatShading: true });
    const mergeGeos = list => {
      const pos = [];
      const nor = [];
      list.forEach(g0 => {
        const g = g0.index ? g0.toNonIndexed() : g0;
        if (!g.attributes.normal) g.computeVertexNormals();
        pos.push(...g.attributes.position.array);
        nor.push(...g.attributes.normal.array);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
      return g;
    };
    const spike = (at, dir, len, r, sides = 5) => {
      const g = new THREE.ConeGeometry(r, len, sides);
      g.translate(0, len / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
      g.translate(at.x, at.y, at.z);
      return g;
    };
    const iceKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const grips = [0.62, 0.95].map(() => add(bodyG, mesh(new THREE.TorusGeometry(1, 0.18, 8, 28), castMat)));
      const furRing = add(bodyG, new THREE.Group());
      const axe = add(bodyG, new THREE.Group());
      const HZ = 0.16;
      {
        const eye = new THREE.CylinderGeometry(0.085, 0.09, 0.26, 12);
        eye.rotateX(Math.PI / 2);
        eye.translate(0, 0, HZ);
        axe.add(mesh(eye, castMat));
        [-0.12, 0.12].forEach(dz => {
          const r = mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 24), plateMat);
          r.position.z = HZ + dz;
          axe.add(r);
        });
        const top = mesh(new THREE.ConeGeometry(0.05, 0.2, 8), castMat);
        top.rotation.x = Math.PI / 2;
        top.position.z = HZ + 0.23;
        axe.add(top);
        const sh = new THREE.Shape();
        sh.moveTo(0.06, 0.065);
        sh.quadraticCurveTo(0.27, 0.06, 0.33, 0.39);
        sh.quadraticCurveTo(0.67, -0.01, 0.33, -0.45);
        sh.quadraticCurveTo(0.27, -0.065, 0.06, -0.065);
        sh.lineTo(0.06, 0.065);
        const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 14 });
        bg.translate(0, 0, -0.03);
        const q = bg.attributes.position;
        for (let i = 0; i < q.count; i++) {
          const x = q.getX(i);
          const k = lerp(1, 0.22, smooth(0.14, 0.48, x));
          q.setZ(i, q.getZ(i) * k);
        }
        bg.rotateX(Math.PI / 2);
        bg.translate(0, 0, HZ);
        bg.computeVertexNormals();
        const bm = bg.clone();
        bm.rotateZ(Math.PI);
        axe.add(mesh(bg, castMat), mesh(bm, castMat));
        const ic = [];
        [-1, 1].forEach(sg => {
          [[0.305, -0.34, 0.08], [0.275, -0.25, 0.07], [0.2, -0.125, 0.05]].forEach(([x, z, l]) => ic.push(spike(V3(sg * x, 0, HZ + z), V3(0, 0, -1), l, 0.016)));
        });
        axe.add(mesh(mergeGeos(ic), iceMat, false));
        const furG = tubeGeo([V3(0, 0, -0.11), V3(0, 0, -0.055), V3(0, 0, 0), V3(0, 0, 0.055), V3(0, 0, 0.11)], (u, v) => {
          const a = v * TAU;
          return (0.07 + 0.065 * Math.pow(Math.sin(Math.PI * u), 0.5)) * (1 + 0.16 * Math.sin(a * 7 + u * 9) + 0.1 * Math.sin(a * 13 - u * 5));
        }, 24, 26).g;
        furRing.add(mesh(furG, furMat));
        let s2 = 5;
        const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
        const tufts = [];
        for (let i = 0; i < 40; i++) {
          const a = r2() * TAU;
          const z = lerp(-0.09, 0.09, r2());
          const rr = 0.12;
          const out = V3(Math.cos(a), Math.sin(a), 0);
          tufts.push(spike(V3(out.x * rr * 0.8, out.y * rr * 0.8, z), out.clone().add(V3(0, 0, -1.2 - r2())), 0.08 + r2() * 0.08, 0.022 + r2() * 0.012, 4));
        }
        furRing.add(mesh(mergeGeos(tufts), furMat));
        [-0.05, 0.06].forEach(z => {
          const st = mesh(new THREE.TorusGeometry(0.128, 0.014, 6, 24), darkSteel);
          st.position.z = z;
          st.rotation.x = z > 0 ? 0.25 : -0.25;
          furRing.add(st);
        });
      }
      const frost = add(head, new THREE.Group());
      {
        const parts = [];
        const crystal = (at, d, len, r) => {
          parts.push(spike(at, d, len, r, 6));
          const base = new THREE.ConeGeometry(r, r * 1.2, 6);
          base.rotateX(Math.PI);
          base.translate(0, -r * 0.5, 0);
          base.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.clone().normalize())));
          base.translate(at.x, at.y, at.z);
          parts.push(base);
        };
        [-1, 1].forEach(sg => {
          [[0.18, 0.1, 0.035, 0.4], [0.3, 0.15, 0.042, 0.55], [0.42, 0.21, 0.05, 0.7], [0.52, 0.27, 0.056, 0.85]].forEach(([x, len, r, out], i) => {
            const y = 0.04 + (0.46 * x) / 0.52;
            const p = HP(sg * x, y);
            const n = HN(p);
            const at = p.clone().addScaledVector(n, 0.045 + r * 0.4);
            crystal(at, V3(sg * out, 1, -0.12).addScaledVector(n, 0.25), len, r);
            if (i > 0) crystal(at.clone().add(V3(sg * 0.025, -0.01, -0.02)), V3(sg * (out + 0.5), 0.75, -0.2), len * 0.55, r * 0.65);
          });
          const E = HP(sg * 0.52, 0.5);
          const D = V3(sg, 0.86, -0.38).normalize();
          [0.3, 0.62].forEach((f, i) => {
            const at = E.clone().addScaledVector(D, 0.52 * f).addScaledVector(HN(E), 0.03);
            crystal(at, V3(sg * 0.25, 1, -0.15), 0.12 + i * 0.05, 0.03);
          });
        });
        frost.add(mesh(mergeGeos(parts), iceMat, false));
      }
      const iceTail = add(tailTip, new THREE.Group());
      {
        const parts = [];
        const cr = (d, len, r, back = 0) => {
          const dn = d.clone().normalize();
          const at = dn.clone().multiplyScalar(back);
          parts.push(spike(at, dn, len, r, 6));
          const b = new THREE.ConeGeometry(r, r * 1.3, 6);
          b.rotateX(Math.PI);
          b.translate(0, -r * 0.55, 0);
          b.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dn)));
          b.translate(at.x, at.y, at.z);
          parts.push(b);
        };
        cr(V3(0, 0.05, 1), 0.34, 0.05, 0.02);
        [[0.55, 0.5, 1, 0.21, 0.036], [-0.55, 0.45, 1, 0.19, 0.034], [0.15, 0.8, 0.6, 0.17, 0.032], [0.75, -0.15, 0.8, 0.15, 0.03], [-0.75, -0.1, 0.8, 0.14, 0.03], [-0.2, 0.9, 0.4, 0.13, 0.026], [0.0, -0.6, 0.7, 0.1, 0.024]].forEach(([x, y, z, len, r]) => cr(V3(x, y, z), len, r, 0.01));
        iceTail.add(mesh(mergeGeos(parts), iceMat, false));
        const collar = mesh(new THREE.TorusGeometry(0.034, 0.014, 8, 20), castMat);
        iceTail.add(collar);
        iceTail.scale.setScalar(1.3);
      }
      const mantle = add(socket, new THREE.Group());
      {
        mantle.position.set(0.0, 0.05, 0);
        mantle.rotation.z = -0.38;
        const g = new THREE.SphereGeometry(0.235, 40, 18, 0, TAU, 0, Math.PI * 0.52);
        const q = g.attributes.position;
        for (let i = 0; i < q.count; i++) {
          const v = V3(q.getX(i), q.getY(i), q.getZ(i));
          const a = Math.atan2(v.z, v.x);
          const k = 1 + 0.07 * Math.sin(a * 9 + v.y * 20) + 0.05 * Math.sin(a * 17 - v.y * 31) + 0.04 * Math.sin(a * 29 + v.y * 11);
          v.multiplyScalar(k);
          q.setXYZ(i, v.x, v.y, v.z);
        }
        g.computeVertexNormals();
        const m = mesh(g, furMat);
        m.scale.set(1, 0.8, 1.12);
        mantle.add(m);
        let s3 = 9;
        const r3 = () => (s3 = (s3 * 16807) % 2147483647) / 2147483647;
        const tufts = [];
        for (let i = 0; i < 46; i++) {
          const a = (i / 46) * TAU + r3() * 0.1;
          const rr = 0.235;
          const out = V3(Math.cos(a), 0, Math.sin(a));
          const at = V3(out.x * rr, 0.02 - r3() * 0.03, out.z * rr * 1.12).multiply(V3(1, 0.8, 1));
          tufts.push(spike(at, out.clone().multiplyScalar(0.5).add(V3(0, -1, 0)), 0.08 + r3() * 0.08, 0.026 + r3() * 0.012, 4));
        }
        for (let i = 0; i < 18; i++) {
          const a = r3() * TAU;
          const e = r3() * 0.9;
          const out = V3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
          const at = V3(out.x * 0.24, out.y * 0.19, out.z * 0.27);
          tufts.push(spike(at, out.clone().add(V3(0, -0.4, 0)), 0.05 + r3() * 0.04, 0.02, 4));
        }
        mantle.add(mesh(mergeGeos(tufts), furMat));
        const clasp = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), castMat);
        clasp.position.set(0.02, 0.1, 0.22);
        clasp.rotation.x = Math.PI / 2 - 0.4;
        mantle.add(clasp);
      }
      const spikes = Array.from({ length: 7 }, (_, i) => {
        const g = new THREE.ConeGeometry(0.12 + (i % 2) * 0.04, 0.7, 6);
        g.translate(0, 0.35, 0);
        const m = new THREE.Mesh(g, iceMat);
        m.visible = false;
        big.add(m);
        return { m, i, tilt: (i % 2 ? 1 : -1) * (0.15 + (i % 3) * 0.06) };
      });
      let turn = 0;
      let fwdBig = V3(0, 0, 1);
      let hitBig = V3(0, 0, 1);
      return {
        customTail: true,
        set: on => {
          K.set(on);
          if (!on) spikes.forEach(s => (s.m.visible = false));
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0xd8f4ff : 0x6fb4d4);
        },
        rest(S, t, motion) {
          S.hL.set(0.92, TIP + 0.42, 0.34).add(V3(0, Math.sin(t * 1.4 + 1.2) * 0.02 * motion, 0));
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.32, p) * (1 - smooth(0.34, 0.42, p));
            const strike = smooth(0.34, 0.44, p) * (1 - smooth(0.72, 0.95, p));
            S.hL.lerp(V3(0.42, TIP + 1.95, -0.32), wind);
            S.hL.lerp(V3(0.22, TIP + 0.55, 0.95), strike);
            S.lean = -0.1 * wind + 0.18 * strike;
            S.spinY = 0.15 * wind - 0.2 * strike;
            S.trailK = p > 0.34 && p < 0.56 ? Math.sin(Math.PI * smooth(0.34, 0.56, p)) : 0;
            S.glow = 0.5 * wind + 0.7 * strike;
            S.impact = p > 0.43 && p < 0.6 ? 1 - smooth(0.43, 0.6, p) : 0;
            S.sparkK = p > 0.42 && p < 0.7 ? smooth(0.42, 0.7, p) : -1;
            S.headPitch += 0.15 * strike;
            S.mouthK = 0.6 * strike;
            S.axeTurn = smooth(0.02, 0.18, p) * (1 - smooth(0.82, 0.98, p));
            return true;
          }
          if (nm === "fling") {
            const raise = smooth(0.04, 0.36, p) * (1 - smooth(0.4, 0.48, p));
            const chop = smooth(0.4, 0.48, p) * (1 - smooth(0.78, 0.98, p));
            S.hL.lerp(V3(0.3, TIP + 2.0, 0.05), raise);
            S.hL.lerp(V3(0.3, TIP + 0.1, 0.85), chop);
            S.hR.lerp(V3(-0.82, TIP + 1.2, 0.2), raise);
            S.lean = -0.14 * raise + 0.3 * chop;
            S.hover += 0.18 * raise - 0.12 * chop;
            S.squash = 1 + 0.05 * raise - 0.06 * chop;
            S.glow = 1.2 * raise + 0.8 * chop;
            S.flash = 0.6 * raise + 0.6 * chop;
            S.waveK = p > 0.46 && p < 0.96 ? smooth(0.46, 0.96, p) : -1;
            S.impact = p > 0.46 && p < 0.66 ? 1 - smooth(0.46, 0.66, p) : 0;
            S.sparkK = p > 0.46 && p < 0.76 ? smooth(0.46, 0.76, p) : -1;
            S.headPitch += 0.2 * chop - 0.1 * raise;
            S.mouthK = 0.8 * chop;
            S.legK = 0.5 * raise;
            S.axeTurn = smooth(0.02, 0.18, p) * (1 - smooth(0.85, 0.99, p));
            return true;
          }
          if (nm === "spin") S.hL.lerp(V3(0.95, TIP + 0.95, 0.0), S.spinK);
          if (nm === "jump") S.hL.lerp(V3(0.8, TIP + 0.9, 0.2), S.air);
          return false;
        },
        arm(S, t, motion) {
          const rad = u => lerp(0.125, 0.07, smooth(0.35, 0.7, u));
          const c = moltenArm(arm, shoulders[1], S.hL, t, motion, rad);
          [0.62, 0.95].forEach((u, i) => {
            grips[i].position.copy(c.getPointAt(u));
            grips[i].quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(u));
            grips[i].scale.setScalar(rad(u) + 0.006);
          });
          furRing.position.copy(c.getPointAt(0.82));
          furRing.quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(0.82));
          const end = c.getPointAt(1);
          const z = c.getTangentAt(1);
          let x = V3(1, 0, 0).addScaledVector(z, -z.x);
          if (x.lengthSq() < 1e-3) x = V3(0, 0, 1).addScaledVector(z, -z.z);
          x.normalize();
          const y = z.clone().cross(x).normalize();
          turn = lerp(turn, S.axeTurn || 0, 0.3);
          const ax = x.clone().multiplyScalar(Math.cos(turn * Math.PI / 2)).addScaledVector(y, Math.sin(turn * Math.PI / 2)).normalize();
          const ay = z.clone().cross(ax).normalize();
          axe.position.copy(end);
          axe.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ax, ay, z));
        },
        fx(S, nm) {
          axe.updateMatrixWorld(true);
          const edge = big.worldToLocal(axe.localToWorld(V3(0.5, 0, HZ)));
          if (nm === "swipe")
            trail.forEach((a, i) => {
              a.position.copy(shoulders[1]);
              a.rotation.set(0, Math.PI / 2, 0.6 + i * 0.05);
              a.scale.setScalar(1.6 + i * 0.06);
            });
          if (S.waveK >= 0 && S.waveK < 0.02) {
            hitBig = edge.clone();
            const f = big.worldToLocal(bodyG.localToWorld(V3(0, 0, 1))).sub(big.worldToLocal(bodyG.localToWorld(V3(0, 0, 0))));
            f.y = 0;
            fwdBig = f.normalize();
          }
          spikes.forEach(s => {
            const k = S.waveK >= 0 ? Math.max(0, Math.min(1, (S.waveK * 1.8 - s.i * 0.12) / 0.35)) : -1;
            s.m.visible = k > 0 && S.waveK < 1;
            if (!s.m.visible) return;
            const fade = 1 - smooth(0.7, 1, S.waveK);
            const at = hitBig.clone().addScaledVector(fwdBig, 0.35 + s.i * 0.32);
            s.m.position.set(at.x + (s.i % 2 ? 1 : -1) * 0.12, 0, at.z);
            s.m.rotation.set(s.tilt * 0.6, 0, s.tilt);
            const h = Math.min(1, k) * fade * (0.7 + 0.5 * Math.sin(s.i * 1.7) ** 2);
            s.m.scale.set(Math.max(0.01, fade), Math.max(0.01, h), Math.max(0.01, fade));
          });
          return edge;
        },
        hide() {
          spikes.forEach(s => (s.m.visible = false));
        }
      };
    })();

    const pitMat = new THREE.MeshStandardMaterial({ color: 0x1c1024, roughness: 0.9, metalness: 0.1 });
    const poisonKit = (() => {
      const K = makeKit();
      const { add } = K;
      const trunk = dyn(moltenMat);
      K.parts.push(trunk);
      const knot = add(bodyG, mesh(new THREE.SphereGeometry(1, 24, 18), moltenMat));
      const tents = [0, 1, 2].map(i => {
        const m = dyn(moltenMat);
        K.parts.push(m);
        const st = add(bodyG, new THREE.Group());
        const sting = tubeGeo([V3(0, 0, -0.02), V3(0, 0.01, 0.08), V3(0, 0.045, 0.17), V3(0, 0.1, 0.24)], u => lerp(0.055, 0.002, Math.pow(u, 0.9)), 30, 12).g;
        st.add(mesh(sting, castMat));
        st.scale.setScalar(1.25);
        const bulb = mesh(new THREE.SphereGeometry(0.06, 18, 14), hotMat);
        bulb.scale.set(1, 0.9, 1.25);
        bulb.position.z = -0.02;
        st.add(bulb);
        const ring = mesh(new THREE.TorusGeometry(0.052, 0.013, 8, 20), castMat);
        ring.position.z = 0.03;
        st.add(ring);
        const drop = mesh(dropGeo, hotMat, false);
        drop.visible = false;
        big.add(drop);
        K.parts.push(drop);
        return { m, st, i, drop, per: 1.7 + i * 0.45, from: V3(0, 0, 0), cyc: -1 };
      });
      const melt = add(torso, new THREE.Group());
      {
        [[1.05, 1.08, 0.62, 0.05], [1.32, 1.04, 0.74, 0.04], [0.82, 1.02, 0.8, 0.035], [1.58, 0.98, 0.7, 0.03]].forEach(([a, y0, y1, w0]) => {
          const N = 16;
          const pts = [];
          for (let i = 0; i <= N; i++) {
            const f = i / N;
            pts.push([a + 0.05 * Math.sin(f * 5 + a), lerp(y0, y1, f)]);
          }
          melt.add(mesh(strip(pts.map(([q, y]) => TP(q, y)), pts.map(([q, y]) => TN(q, y)), i => w0 * (0.6 + 0.4 * Math.sin((i / N) * Math.PI * 0.9 + 0.3)) * (1 - 0.5 * (i / N)), () => 0.014), moltenMat));
          const end = TP(pts[N][0], pts[N][1]);
          const n = TN(pts[N][0], pts[N][1]);
          const d = mesh(dropGeo, moltenMat);
          d.position.copy(end).addScaledVector(n, 0.012).add(V3(0, -0.02, 0));
          d.scale.set(w0 * 26, w0 * 34, w0 * 26);
          melt.add(d);
        });
        [[0.6, 0.98, 0.05], [0.95, 0.78, 0.04], [1.25, 0.9, 0.035], [0.3, 0.66, 0.045], [0.75, 0.55, 0.03], [1.45, 0.6, 0.04], [-0.35, 0.72, 0.03]].forEach(([a, y, r]) => {
          const p = TP(a, y);
          const n = TN(a, y);
          const g = new THREE.Group();
          g.position.copy(p).addScaledVector(n, 0.002);
          g.quaternion.setFromUnitVectors(V3(0, 0, 1), n);
          melt.add(g);
          const hole = mesh(new THREE.CircleGeometry(r * 0.78, 18), pitMat, false);
          hole.position.z = 0.004;
          g.add(hole);
          const rim = mesh(new THREE.TorusGeometry(r, r * 0.28, 8, 20), hotMat, false);
          rim.position.z = 0.006;
          g.add(rim);
          const shard = mesh(new THREE.SphereGeometry(r * 1.05, 14, 8, 0, Math.PI * 1.1, 0, Math.PI / 2), castMat);
          shard.rotation.x = Math.PI / 2;
          shard.rotation.y = (a * 7) % TAU;
          shard.scale.set(1, 1, 0.55);
          g.add(shard);
        });
      }
      const blob = add(socket, new THREE.Group());
      {
        const g = new THREE.SphereGeometry(0.2, 32, 18);
        const q = g.attributes.position;
        for (let i = 0; i < q.count; i++) {
          const v = V3(q.getX(i), q.getY(i), q.getZ(i));
          const k = 1 + 0.12 * Math.sin(v.x * 30 + v.z * 14) + 0.08 * Math.sin(v.y * 40 - v.z * 22) - 0.18 * smooth(0.0, -0.18, v.y) * 0;
          v.multiplyScalar(k);
          if (v.y < -0.02) v.y *= 1.5;
          q.setXYZ(i, v.x, v.y, v.z);
        }
        g.computeVertexNormals();
        const m = mesh(g, moltenMat);
        m.scale.set(1.05, 0.8, 1.05);
        m.position.set(0.04, 0.02, 0);
        blob.add(m);
        [[0.12, -0.12, 0.1, 1.3], [-0.02, -0.16, -0.1, 1.7], [0.16, -0.1, -0.06, 1.0]].forEach(([x, y, z, s]) => {
          const d = mesh(dropGeo, moltenMat);
          d.position.set(x, y, z);
          d.scale.set(1.3, s * 1.5, 1.3);
          d.rotation.x = Math.PI;
          blob.add(d);
        });
      }
      const crestDrops = add(head, new THREE.Group());
      [0.55, 0.95, 1.35, 1.75].forEach((th, i) => {
        const p = V3(0, Math.sin(th) * HH, Math.cos(th) * HD);
        const n = HN(p);
        [-1, 1].forEach(sg => {
          if ((i + (sg > 0 ? 1 : 0)) % 2) return;
          const d = mesh(dropGeo, hotMat);
          d.position.copy(p).addScaledVector(n, 0.06).add(V3(sg * 0.04, -0.04, 0));
          d.scale.set(1, 1.5 + i * 0.2, 1);
          d.rotation.x = Math.PI;
          crestDrops.add(d);
        });
      });
      const pit = (parent, p, n, r) => {
        const g = new THREE.Group();
        g.position.copy(p).addScaledVector(n, 0.002);
        g.quaternion.setFromUnitVectors(V3(0, 0, 1), n);
        parent.add(g);
        const hole = mesh(new THREE.CircleGeometry(r * 0.78, 16), pitMat, false);
        hole.position.z = 0.004;
        g.add(hole);
        const rim = mesh(new THREE.TorusGeometry(r, r * 0.28, 8, 18), hotMat, false);
        rim.position.z = 0.006;
        g.add(rim);
        return g;
      };
      const hang = (parent, p, s, k = 1.5) => {
        const d = mesh(dropGeo, hotMat);
        d.position.copy(p);
        d.scale.set(s, s * k, s);
        d.rotation.x = Math.PI;
        parent.add(d);
        return d;
      };
      const headAcid = add(head, new THREE.Group());
      {
        [[0.2, 1.3, 0.032], [-0.3, 2.2, 0.026], [0.5, 2.8, 0.03], [0.1, -2.4, 0.024], [-0.45, 1.75, 0.02], [0.62, 0.9, 0.022]].forEach(([y, a, r]) => {
          const p = onHeadRing(y, a);
          pit(headAcid, p, HN(p), r);
        });
        [[0.52, 0.5, 1.1, 1.9], [0.3, 0.3, 0.9, 1.4], [0.14, 0.17, 0.8, 1.2]].forEach(([x, y, s, k]) => {
          [-1, 1].forEach(sg => {
            if (sg < 0 && x < 0.2) return;
            const p = HP(sg * x, y - 0.12);
            hang(headAcid, p.clone().addScaledVector(HN(p), 0.035), s, k);
          });
        });
      }
      const bodyAcid = add(torso, new THREE.Group());
      {
        [0.55, 0.85, 1.15, 1.45].forEach((a, i) => {
          const p = TP(a, 1.13);
          hang(bodyAcid, p.addScaledVector(TN(a, 1.13), 0.03), 0.9 + (i % 2) * 0.3, 1.4 + (i % 3) * 0.4);
        });
        [[2.1, 1.06, 0.72, 0.045], [2.45, 1.02, 0.8, 0.035], [1.85, 0.6, 0.3, 0.03]].forEach(([a, y0, y1, w0]) => {
          const N = 14;
          const pts = [];
          for (let i = 0; i <= N; i++) {
            const f = i / N;
            pts.push([a + 0.05 * Math.sin(f * 6 + a * 3), lerp(y0, y1, f)]);
          }
          bodyAcid.add(mesh(strip(pts.map(([q, y]) => TP(q, y)), pts.map(([q, y]) => TN(q, y)), i => w0 * (0.6 + 0.4 * Math.sin((i / N) * Math.PI * 0.9 + 0.3)) * (1 - 0.5 * (i / N)), () => 0.013), moltenMat));
          const end = TP(pts[N][0], pts[N][1]);
          const d = mesh(dropGeo, moltenMat);
          d.position.copy(end).addScaledVector(TN(pts[N][0], pts[N][1]), 0.012).add(V3(0, -0.02, 0));
          d.scale.set(w0 * 26, w0 * 34, w0 * 26);
          bodyAcid.add(d);
        });
        [[2.7, 0.72, 0.04], [3.3, 0.92, 0.032], [2.2, 0.42, 0.03], [3.0, 0.5, 0.026], [-2.6, 0.82, 0.03]].forEach(([a, y, r]) => pit(bodyAcid, TP(a, y), TN(a, y), r));
      }
      const legAcid = add(legs[1], new THREE.Group());
      {
        const lc = new THREE.CatmullRomCurve3([V3(-0.09, 0.07, -0.02), V3(0, 0, 0), V3(0.1, -0.08 * LEGL, 0.06), V3(0.17, -0.22 * LEGL, 0.13), V3(0.2, -0.38 * LEGL, 0.08), V3(0.215, -0.56 * LEGL, -0.01)]);
        const radL = u => {
          const knee = 0.012 * Math.exp(-Math.pow((u - 0.52) / 0.1, 2));
          const r = u < 0.58 ? lerp(0.1, 0.08, u / 0.58) : 0.08 * (1 - Math.pow((u - 0.58) / 0.42, 1.4));
          return Math.max(0.003, r + knee);
        };
        const dirAt = (u, f) => {
          const t = lc.getTangentAt(u);
          return f.clone().addScaledVector(t, -f.dot(t)).normalize();
        };
        [[V3(1, 0, 0.5), 0.2, 0.47, 0.03], [V3(0.3, 0, 1), 0.24, 0.42, 0.026], [V3(1, 0, -0.6), 0.22, 0.38, 0.022]].forEach(([f, u0, u1, w0]) => {
          const N = 14;
          const us = Array.from({ length: N + 1 }, (_, i) => lerp(u0, u1, i / N));
          const pts = us.map(u => lc.getPointAt(u).addScaledVector(dirAt(u, f), radL(u) - 0.003));
          legAcid.add(mesh(strip(pts, us.map(u => dirAt(u, f)), i => w0 * (0.6 + 0.4 * Math.sin((i / N) * Math.PI * 0.9 + 0.3)) * (1 - 0.45 * (i / N)), () => 0.012), moltenMat));
          const d = mesh(dropGeo, moltenMat);
          d.position.copy(pts[N]).addScaledVector(dirAt(u1, f), 0.012).add(V3(0, -0.018, 0));
          d.scale.set(w0 * 26, w0 * 34, w0 * 26);
          legAcid.add(d);
        });
        [[0.64, V3(0.4, 0, 1), 0.026], [0.78, V3(1, 0, 0.2), 0.022], [0.36, V3(0.2, 0, 1), 0.024]].forEach(([u, f, r]) => {
          const n = dirAt(u, f);
          pit(legAcid, lc.getPointAt(u).addScaledVector(n, radL(u)), n, r);
        });
      }
      const stinger = add(tailTip, new THREE.Group());
      {
        const bulb = mesh(new THREE.SphereGeometry(0.085, 22, 16), hotMat);
        bulb.scale.set(1, 0.95, 1.3);
        bulb.position.z = 0.06;
        stinger.add(bulb);
        [0.0, 0.11].forEach(z => {
          const r = mesh(new THREE.TorusGeometry(z ? 0.07 : 0.05, 0.016, 8, 22), castMat);
          r.position.z = z;
          stinger.add(r);
        });
        const st = tubeGeo([V3(0, 0, 0.1), V3(0, 0.03, 0.2), V3(0, 0.11, 0.28), V3(0, 0.23, 0.3), V3(0, 0.32, 0.25)], u => lerp(0.06, 0.002, Math.pow(u, 0.85)), 36, 14).g;
        stinger.add(mesh(st, castMat));
        const dr = hang(stinger, V3(0, -0.07, 0.07), 0.9, 1.6);
        dr.rotation.x = Math.PI;
        stinger.scale.setScalar(1.15);
      }
      const bubbles = Array.from({ length: 6 }, (_, k) => {
        const m = mesh(new THREE.SphereGeometry(0.03, 12, 10), hotMat, false);
        bodyG.add(m);
        K.parts.push(m);
        return { m, k, per: 1.1 + (k % 3) * 0.35, a: (k / 6) * TAU };
      });
      const puddle = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 48), trailMat);
      puddle.rotation.x = Math.PI / 2;
      puddle.visible = false;
      big.add(puddle);
      const tipsBig = [V3(), V3(), V3()];
      let spread = 0.26;
      return {
        customTail: true,
        set: on => {
          K.set(on);
          tents.forEach(T => (T.drop.visible = false));
          if (!on) puddle.visible = false;
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0x40c878 : 0x7a3a8c);
        },
        rest(S, t, motion) {
          S.hL.set(0.78, TIP + 0.62, 0.42).add(V3(0, Math.sin(t * 1.3 + 1.2) * 0.04 * motion, 0));
          S.spread = 0.27;
          S.writhe = 1;
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.42, p));
            const strike = smooth(0.34, 0.44, p) * (1 - smooth(0.72, 0.95, p));
            S.hL.lerp(V3(0.78, TIP + 1.25, -0.2), wind);
            S.hL.lerp(V3(0.3, TIP + 0.95, 1.08), strike);
            S.spread = 0.27 + 0.12 * wind - 0.17 * strike;
            S.writhe = 1 - 0.7 * strike;
            S.spinY += 0.25 * wind - 0.3 * strike;
            S.lean += -0.05 * wind + 0.14 * strike;
            S.glow = 0.5 * wind + 0.8 * strike;
            S.impact = p > 0.42 && p < 0.6 ? 1 - smooth(0.42, 0.6, p) : 0;
            S.sparkK = p > 0.42 && p < 0.7 ? smooth(0.42, 0.7, p) : -1;
            S.mouthK = 0.6 * strike;
            return true;
          }
          if (nm === "fling") {
            const raise = smooth(0.04, 0.4, p) * (1 - smooth(0.46, 0.54, p));
            const stab = smooth(0.48, 0.58, p) * (1 - smooth(0.8, 0.97, p));
            S.hL.lerp(V3(0.72, TIP + 1.95, -0.1), raise);
            S.hL.lerp(V3(0.25, TIP + 0.55, 1.1), stab);
            S.hR.lerp(V3(-0.8, TIP + 1.1, 0.2), raise);
            S.spread = 0.27 + 0.18 * raise - 0.12 * stab;
            S.writhe = 1 + 0.8 * raise - 0.7 * stab;
            S.lean += -0.12 * raise + 0.24 * stab;
            S.hover += 0.12 * raise - 0.04 * stab;
            S.glow = 1.3 * raise + 0.9 * stab;
            S.flash = 0.6 * raise + 0.6 * stab;
            S.impact = p > 0.56 && p < 0.74 ? 1 - smooth(0.56, 0.74, p) : 0;
            S.waveK = p > 0.56 && p < 0.97 ? smooth(0.56, 0.97, p) : -1;
            S.sparkK = p > 0.56 && p < 0.82 ? smooth(0.56, 0.82, p) : -1;
            S.headPitch += 0.15 * stab - 0.12 * raise;
            S.mouthK = 0.8 * stab;
            S.legK = 0.4 * raise;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(0.98, TIP + 0.95, 0.05), S.spinK);
            S.spread = 0.27 + 0.15 * S.spinK;
          }
          if (nm === "jump") S.hL.lerp(V3(1.0, TIP + 0.85, 0.35), S.air);
          return false;
        },
        arm(S, t, motion) {
          const A = shoulders[1];
          const r = ik(A, S.hL, L1, L2, V3(0, -0.5, -0.5));
          const P = A.clone().lerp(r.elbow, 0.78);
          const trunkPts = [A.clone(), A.clone().lerp(P, 0.35), A.clone().lerp(P, 0.7), P.clone()];
          flexTube(trunk, trunkPts, (u, v) => {
            const a = v * TAU;
            const wob = 1 + (0.06 * Math.sin(a * 3 + u * 6 - t * 3.1) + 0.04 * Math.sin(a * 5 - u * 9 + t * 2.3)) * motion;
            return lerp(0.125, 0.135, u) * wob;
          }, 24, 18);
          knot.position.copy(P);
          const sb = socket.localToWorld(V3(0.06, 0.12, 0));
          const sbL = bodyG.worldToLocal(sb);
          bubbles.forEach(B => {
            const u = (t / B.per + B.k * 0.29) % 1;
            const r = 0.05 + 0.1 * ((B.k * 37) % 10) / 10;
            B.m.position.copy(sbL).add(V3(Math.cos(B.a) * r, u * 0.22, Math.sin(B.a) * r));
            const sc = (0.5 + 0.9 * u) * (u > 0.88 ? (1 - u) / 0.12 : 1) * (motion > 0 ? 1 : 0.6);
            B.m.scale.setScalar(Math.max(0.01, sc));
          });
          knot.scale.setScalar(0.14 * (1 + 0.04 * Math.sin(t * 3.3) * motion));
          spread = lerp(spread, S.spread || 0.27, 0.3);
          const D = S.hL.clone().sub(P);
          const len = Math.max(0.3, D.length());
          D.normalize();
          let u1 = V3(0, 1, 0).cross(D);
          if (u1.lengthSq() < 1e-3) u1 = V3(1, 0, 0);
          u1.normalize();
          const u2 = D.clone().cross(u1).normalize();
          const wr = (S.writhe === undefined ? 1 : S.writhe) * motion;
          tents.forEach(T => {
            const th = T.i * (TAU / 3) + 0.4 + Math.sin(t * 0.7 + T.i) * 0.25 * wr;
            const off = u1.clone().multiplyScalar(Math.cos(th)).addScaledVector(u2, Math.sin(th));
            const wv = (k, ph) => off.clone().multiplyScalar(Math.sin(t * 2.4 + T.i * 2.1 + ph) * 0.06 * k * wr).addScaledVector(off.clone().cross(D), Math.cos(t * 2.1 + T.i * 1.7 + ph) * 0.05 * k * wr);
            const tip = S.hL.clone().addScaledVector(D, 0.38).addScaledVector(off, spread * 1.3).add(wv(1.4, 2));
            const pts = [P.clone(), P.clone().addScaledVector(D, 0.1).addScaledVector(off, 0.08), P.clone().addScaledVector(D, len * 0.45).addScaledVector(off, spread * 0.7).add(wv(1, 0)), P.clone().addScaledVector(D, len * 0.85).addScaledVector(off, spread * 1.05).add(wv(1.2, 1)), tip];
            const c = flexTube(T.m, pts, (u, v) => {
              const a = v * TAU;
              const b = 1 + 0.08 * Math.sin(a * 2 + u * 12 - t * 4 + T.i) * motion;
              return lerp(0.072, 0.034, Math.pow(u, 0.8)) * b;
            }, 36, 12);
            const e = c.getPointAt(1);
            const d = c.getTangentAt(1);
            let x = off.clone().cross(d);
            if (x.lengthSq() < 1e-3) x = V3(1, 0, 0);
            x.normalize();
            const y = d.clone().cross(x).normalize();
            T.st.position.copy(e);
            T.st.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x.negate(), y.negate(), d));
          });
        },
        fx(S, nm, p, t) {
          tents.forEach((T, i) => {
            T.st.updateMatrixWorld(true);
            tipsBig[i].copy(big.worldToLocal(T.st.localToWorld(V3(0, 0.1, 0.24))));
            const base = big.worldToLocal(T.st.localToWorld(V3(0, -0.05, -0.02)));
            const u = (t / T.per + T.i * 0.37) % 1;
            const cyc = Math.floor(t / T.per + T.i * 0.37);
            if (u < 0.55) {
              const g = smooth(0, 0.55, u);
              T.drop.visible = g > 0.1;
              T.drop.position.copy(base);
              T.drop.scale.set(0.5 + 0.5 * g, 0.5 + 0.9 * g, 0.5 + 0.5 * g);
              T.cyc = -1;
            } else {
              if (T.cyc !== cyc) {
                T.cyc = cyc;
                T.from.copy(base);
              }
              const f = (u - 0.55) / 0.45;
              const y = T.from.y - 3.2 * f * f;
              T.drop.visible = y > 0.03;
              T.drop.position.set(T.from.x, y, T.from.z);
              T.drop.scale.set(1 - f * 0.4, 1.5, 1 - f * 0.4);
            }
          });
          puddle.visible = S.waveK >= 0;
          if (puddle.visible) {
            const c = tipsBig[0].clone().add(tipsBig[1]).add(tipsBig[2]).multiplyScalar(1 / 3);
            puddle.position.set(c.x, 0.03, c.z);
            const k = 0.2 + S.waveK * 1.5;
            puddle.scale.set(k, k, 1 + S.waveK);
            S.trailOpacity = 0.75 * (1 - S.waveK);
          }
          return tipsBig[1];
        },
        hide() {
          puddle.visible = false;
          tents.forEach(T => (T.drop.visible = false));
        }
      };
    })();

    const shellMat = new THREE.MeshStandardMaterial({ color: 0x24401c, roughness: 0.22, metalness: 0.7, side: THREE.DoubleSide });
    const wingMemMat = new THREE.MeshStandardMaterial({ color: 0xc8f080, emissive: 0x6a9a10, emissiveIntensity: 0.25, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
    const bugKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const segGeo = new THREE.LatheGeometry([V2(0.96, -0.55), V2(1.04, -0.42), V2(1.13, -0.05), V2(1.24, 0.38), V2(1.3, 0.55), V2(1.18, 0.62), V2(1.0, 0.56)], 20);
      const segU = [0.22, 0.36, 0.5, 0.64, 0.78, 0.9];
      const segs = segU.map((u, i) => {
        const g = add(bodyG, new THREE.Group());
        g.add(mesh(segGeo, shellMat));
        const sp = mesh(new THREE.ConeGeometry(0.16, 0.5, 4), shellMat);
        sp.position.set(0, 0.35, 1.3);
        sp.rotation.x = 1.15;
        sp.scale.set(1, 1, 0.5);
        g.add(sp);
        return { g, u };
      });
      const claw = add(bodyG, new THREE.Group());
      const clawIn = new THREE.Group();
      clawIn.scale.setScalar(1.35);
      claw.add(clawIn);
      const jawPivot = new THREE.Group();
      jawPivot.position.set(0, 0.075, 0.2);
      clawIn.add(jawPivot);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0xb0ff40, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), orbMat);
      orb.visible = false;
      orb.position.set(0, 0.02, 0.42);
      clawIn.add(orb);
      K.parts.push(orb);
      {
        const pg = new THREE.SphereGeometry(1, 40, 28);
        const q = pg.attributes.position;
        for (let i = 0; i < q.count; i++) {
          const v = V3(q.getX(i), q.getY(i), q.getZ(i));
          const k = 1 + 0.06 * Math.max(0, Math.sin(Math.atan2(v.y, v.x) * 6)) * (1 - Math.abs(v.z));
          q.setXYZ(i, v.x * 0.15 * k, v.y * 0.135 * k, v.z * 0.2 + 0.1);
        }
        pg.computeVertexNormals();
        clawIn.add(mesh(pg, castMat));
        const cap = mesh(new THREE.SphereGeometry(1, 32, 16, 0, TAU, 0, Math.PI * 0.45), shellMat);
        cap.scale.set(0.16, 0.15, 0.21);
        cap.position.z = 0.1;
        cap.rotation.x = -0.15;
        clawIn.add(cap);
        [[-0.02, 0.13, 0.04, 0.09], [0.0, 0.15, 0.12, 0.11], [0.02, 0.13, 0.2, 0.08]].forEach(([x, y, z, l]) => {
          const sp = mesh(new THREE.ConeGeometry(0.03, l, 5), shellMat);
          sp.position.set(x, y, z);
          sp.rotation.x = 0.55;
          clawIn.add(sp);
        });
        [-1, 1].forEach(sg => {
          const r = mesh(new THREE.TorusGeometry(0.02, 0.008, 6, 14), castMat);
          r.position.set(sg * 0.15, 0.03, 0.12);
          r.rotation.y = Math.PI / 2;
          clawIn.add(r);
        });
        const cuff = mesh(new THREE.TorusGeometry(0.135, 0.03, 10, 28), shellMat);
        cuff.position.z = -0.08;
        clawIn.add(cuff);
        const jaw = (pts, r0, flat) => {
          const { g, c } = tubeGeo(pts, (u, v) => {
            const a = v * TAU;
            const base = lerp(r0, 0.004, Math.pow(u, 0.9));
            return base * (Math.abs(Math.cos(a)) * (1 - flat) + flat + 0.0);
          }, 40, 16);
          return { g, c };
        };
        const low = jaw([V3(0, -0.04, 0.22), V3(0, -0.085, 0.36), V3(0, -0.075, 0.5), V3(0, -0.02, 0.62), V3(0, 0.05, 0.69)], 0.072, 0.55);
        const lowM = mesh(low.g, castMat);
        lowM.scale.x = 0.75;
        clawIn.add(lowM);
        const up = jaw([V3(0, 0, 0), V3(0, 0.07, 0.12), V3(0, 0.075, 0.27), V3(0, 0.03, 0.4), V3(0, -0.035, 0.47)], 0.07, 0.55);
        const upM = mesh(up.g, castMat);
        upM.scale.x = 0.75;
        jawPivot.add(upM);
        const hinge = mesh(new THREE.SphereGeometry(0.05, 16, 12), shellMat);
        hinge.scale.set(1.6, 1, 1);
        jawPivot.add(hinge);
        const teeth = (c, parent, sg, n, u0, u1, yoff) => {
          const list = [];
          for (let i = 0; i < n; i++) {
            const u = lerp(u0, u1, i / (n - 1));
            const p = c.getPointAt(u);
            const tg = c.getTangentAt(u);
            const inward = V3(0, sg, 0).addScaledVector(tg, -sg * tg.y).normalize();
            const r = lerp(0.06, 0.012, u) * yoff;
            const l = (i % 2 ? 0.045 : 0.07) * (1 - 0.4 * u);
            list.push(spike(p.clone().addScaledVector(inward, r * 0.55), inward.clone().addScaledVector(tg, 0.35), l, 0.016));
          }
          parent.add(mesh(mergeGeos(list), hotMat, false));
        };
        teeth(low.c, clawIn, 1, 7, 0.18, 0.82, 1);
        teeth(up.c, jawPivot, -1, 6, 0.2, 0.82, 1);
        const outer = [];
        [0.3, 0.5, 0.68].forEach(u => {
          const p = up.c.getPointAt(u);
          outer.push(spike(p.clone().add(V3(0, lerp(0.035, 0.012, u), 0)), V3(0, 1, -0.5), 0.07, 0.018, 4));
        });
        [0.35, 0.6].forEach(u => {
          const p = low.c.getPointAt(u);
          outer.push(spike(p.clone().add(V3(0, -lerp(0.035, 0.012, u), 0)), V3(0, -1, -0.4), 0.06, 0.016, 4));
        });
        jawPivot.add(mesh(mergeGeos(outer.slice(0, 3)), shellMat));
        clawIn.add(mesh(mergeGeos(outer.slice(3)), shellMat));
      }
      const horn = add(head, new THREE.Group());
      {
        const p0 = HP(0, 0.3);
        const pts = [p0.clone().addScaledVector(HN(p0), -0.03), p0.clone().add(V3(0, 0.14, 0.1)), V3(0, HH + 0.3, HD * 0.55), V3(0, HH + 0.5, HD * 0.1), V3(0, HH + 0.56, -HD * 0.45)];
        const { g, c } = tubeGeo(pts, (u, v) => {
          const a = v * TAU;
          return lerp(0.085, 0.012, Math.pow(u, 0.8)) * (0.8 + 0.2 * Math.abs(Math.sin(a)));
        }, 40, 16);
        horn.add(mesh(g, shellMat));
        const tip = c.getPointAt(0.82);
        [-1, 1].forEach(sg => {
          const f = tubeGeo([tip.clone(), tip.clone().add(V3(sg * 0.05, 0.04, -0.03)), tip.clone().add(V3(sg * 0.1, 0.1, -0.02))], u => lerp(0.022, 0.003, u), 14, 8).g;
          horn.add(mesh(f, shellMat));
        });
        [0.25, 0.45].forEach(u => {
          const p = c.getPointAt(u);
          const sp = mesh(new THREE.ConeGeometry(0.022, 0.07, 4), shellMat);
          sp.position.copy(p).add(V3(0, 0, 0.05));
          sp.rotation.x = 1.1;
          horn.add(sp);
        });
        [-1, 1].forEach(sg => {
          const b = onHeadRing(0.55, Math.PI - sg * 0.5);
          const pts2 = [b, b.clone().add(V3(sg * 0.06, 0.1, -0.06)), b.clone().add(V3(sg * 0.18, 0.2, -0.2)), b.clone().add(V3(sg * 0.34, 0.24, -0.38)), b.clone().add(V3(sg * 0.48, 0.2, -0.5))];
          const { g: ag, c: ac } = tubeGeo(pts2, u => lerp(0.016, 0.006, u) * (1 + 0.25 * Math.max(0, Math.sin(u * 40))), 50, 8);
          horn.add(mesh(ag, darkSteel));
          const club = mesh(new THREE.SphereGeometry(0.022, 10, 8), castMat);
          club.position.copy(ac.getPointAt(1));
          club.scale.set(1, 1, 1.8);
          horn.add(club);
        });
      }
      const hexes = add(torso, new THREE.Group());
      {
        const R = 0.05;
        const list = [];
        for (let q = -4; q <= 4; q++)
          for (let r = -3; r <= 3; r++) {
            const x = R * 1.75 * (q + r / 2);
            const y = R * 1.52 * r;
            const d = Math.hypot(x, y * 1.1);
            if (d < 0.19 || d > 0.34 || y < -0.16) continue;
            const yy = PY + y;
            const a = x / Math.max(0.2, rOf(yy));
            const n = TN(a, yy);
            const g = new THREE.CylinderGeometry(R * 0.9, R * 0.95, 0.022, 6);
            g.rotateY(Math.PI / 6);
            g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), n)));
            const pp = TP(a, yy).addScaledVector(n, 0.004);
            g.translate(pp.x, pp.y, pp.z);
            list.push(g);
          }
        hexes.add(mesh(mergeGeos(list), shellMat));
      }
      const elytra = add(torso, new THREE.Group());
      {
        [-1, 1].forEach(sg => {
          const NA = 16;
          const NY = 18;
          const pos = [];
          const idx = [];
          for (let j = 0; j <= NY; j++)
            for (let i = 0; i <= NA; i++) {
              const v = j / NY;
              const u = i / NA;
              const y = lerp(1.1, 0.34, v);
              const w = 0.95 * Math.sin(Math.PI * Math.min(1, 0.25 + v * 0.95)) * (1 - 0.15 * v);
              const a = Math.PI + sg * (0.04 + u * w);
              const p = TP(a, y).addScaledVector(TN(a, y), 0.04 + 0.05 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v));
              pos.push(p.x, p.y, p.z);
            }
          for (let j = 0; j < NY; j++)
            for (let i = 0; i < NA; i++) {
              const a = j * (NA + 1) + i;
              if (sg > 0) idx.push(a, a + 1, a + NA + 1, a + 1, a + NA + 2, a + NA + 1);
              else idx.push(a, a + NA + 1, a + 1, a + 1, a + NA + 1, a + NA + 2);
            }
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
          g.setIndex(idx);
          g.computeVertexNormals();
          elytra.add(mesh(g, shellMat));
          const seam = [];
          for (let j = 0; j <= NY; j++) {
            const y = lerp(1.1, 0.34, j / NY);
            const a = Math.PI + sg * 0.04;
            seam.push(TP(a, y).addScaledVector(TN(a, y), 0.045));
          }
          elytra.add(mesh(tubeGeo(seam, () => 0.012, 30, 6).g, castMat));
          [0.3, 0.55, 0.8].forEach((f, k) => {
            const ln = [];
            for (let j = 2; j <= NY - 2; j++) {
              const v = j / NY;
              const y = lerp(1.1, 0.34, v);
              const w = 0.95 * Math.sin(Math.PI * Math.min(1, 0.25 + v * 0.95)) * (1 - 0.15 * v);
              const a = Math.PI + sg * (0.04 + f * w);
              ln.push(TP(a, y).addScaledVector(TN(a, y), 0.04 + 0.05 * Math.sin(Math.PI * f) * Math.sin(Math.PI * v) + 0.006));
            }
            elytra.add(mesh(tubeGeo(ln, u => 0.007 * Math.sin(Math.PI * u), 30, 6).g, hotMat));
          });
          const mem = new THREE.Shape();
          mem.moveTo(0, 0.03);
          mem.quadraticCurveTo(0.2, 0.08, 0.42, 0.02);
          mem.quadraticCurveTo(0.3, -0.07, 0.12, -0.08);
          mem.quadraticCurveTo(0.03, -0.06, 0, 0.03);
          const mg = new THREE.ShapeGeometry(mem, 10);
          const wm = mesh(mg, wingMemMat, false);
          const wa = Math.PI + sg * 0.62;
          const wy = 0.62;
          const nrm = TN(wa, wy);
          const base = TP(wa, wy).addScaledVector(nrm, 0.02);
          const X = V3(Math.sign(base.x) * 0.75, -0.55, 0).addScaledVector(nrm, 0.25).normalize();
          const Z = nrm.clone().addScaledVector(X, -nrm.dot(X)).normalize();
          const Y = Z.clone().cross(X).normalize();
          wm.position.copy(base);
          wm.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
          elytra.add(wm);
        });
      }
      const pron = add(socket, new THREE.Group());
      {
        pron.position.set(0.03, 0.04, 0);
        pron.rotation.z = -0.4;
        const sh = mesh(new THREE.SphereGeometry(0.22, 36, 16, 0, TAU, 0, Math.PI * 0.45), shellMat);
        sh.scale.set(1, 0.8, 1.12);
        pron.add(sh);
        const rim = mesh(new THREE.TorusGeometry(0.2, 0.014, 6, 32), castMat);
        rim.rotation.x = Math.PI / 2;
        rim.scale.set(1, 1.12, 1);
        rim.position.y = 0.06;
        pron.add(rim);
        const hp = tubeGeo([V3(0.0, 0.16, 0.0), V3(0.05, 0.27, 0.03), V3(0.14, 0.33, 0.07), V3(0.22, 0.32, 0.1)], u => lerp(0.045, 0.004, u), 20, 10).g;
        pron.add(mesh(hp, shellMat));
        [-1, 1].forEach(sg => {
          const sp = mesh(new THREE.ConeGeometry(0.025, 0.1, 4), shellMat);
          sp.position.set(0.1, 0.1, sg * 0.14);
          sp.rotation.set(sg * 0.9, 0, -0.6);
          pron.add(sp);
        });
        [-1, 0, 1].forEach(k => {
          const ln = mesh(new THREE.TorusGeometry(0.13 + Math.abs(k) * 0.03, 0.006, 6, 20, 1.2), hotMat, false);
          ln.position.y = 0.155 - Math.abs(k) * 0.02;
          ln.rotation.set(-Math.PI / 2, 0, k * 0.6 - 0.6);
          pron.add(ln);
        });
      }
      const legSp = [0, 1].map(i => add(legs[i], new THREE.Group()));
      {
        [-1, 1].forEach((s, i) => {
          const lc = new THREE.CatmullRomCurve3([V3(-s * 0.09, 0.07, -0.02), V3(0, 0, 0), V3(s * 0.1, -0.08 * LEGL, 0.06), V3(s * 0.17, -0.22 * LEGL, 0.13), V3(s * 0.2, -0.38 * LEGL, 0.08), V3(s * 0.215, -0.56 * LEGL, -0.01)]);
          const radL = u => {
            const knee = 0.012 * Math.exp(-Math.pow((u - 0.52) / 0.1, 2));
            const r = u < 0.58 ? lerp(0.1, 0.08, u / 0.58) : 0.08 * (1 - Math.pow((u - 0.58) / 0.42, 1.4));
            return Math.max(0.003, r + knee);
          };
          const list = [];
          [0.62, 0.7, 0.78, 0.86].forEach((u, k) => {
            const t = lc.getTangentAt(u);
            const b = V3(0, 0, -1).addScaledVector(t, t.z).normalize();
            list.push(spike(lc.getPointAt(u).addScaledVector(b, radL(u) * 0.8), b.clone().addScaledVector(t, -0.6), 0.09 - k * 0.012, 0.02, 4));
          });
          legSp[i].add(mesh(mergeGeos(list), shellMat));
        });
      }
      const forceps = add(tailTip, new THREE.Group());
      {
        const base = mesh(new THREE.SphereGeometry(0.055, 16, 12), shellMat);
        base.scale.set(1.4, 0.8, 1.2);
        forceps.add(base);
        [-1, 1].forEach(sg => {
          const g = tubeGeo([V3(sg * 0.03, 0, 0.02), V3(sg * 0.09, 0, 0.12), V3(sg * 0.08, 0, 0.26), V3(sg * 0.02, 0, 0.36), V3(-sg * 0.03, 0.0, 0.38)], (u, v) => lerp(0.04, 0.004, Math.pow(u, 0.9)) * (0.6 + 0.4 * Math.abs(Math.cos(v * TAU))), 30, 12).g;
          forceps.add(mesh(g, shellMat));
          const tl = [];
          [0.35, 0.55].forEach(z => tl.push(spike(V3(sg * 0.075, 0, z * 0.7 + 0.04), V3(-sg, 0, 0.3), 0.04, 0.012, 4)));
          forceps.add(mesh(mergeGeos(tl), hotMat, false));
        });
        forceps.scale.setScalar(1.2);
      }
      const shock = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 6, 48), orbMat);
      shock.rotation.x = Math.PI / 2;
      shock.visible = false;
      big.add(shock);
      let dir = V3(0, 0, 1);
      const want = V3(0, 0, 1);
      let open = 0.2;
      let hitAt = V3();
      return {
        customTail: true,
        set: on => {
          K.set(on);
          if (!on) shock.visible = false;
          orb.visible = false;
        },
        style(shiny) {
          shellMat.color.setHex(shiny ? 0x6a2a8a : 0x24401c);
          plateMat.color.setHex(shiny ? 0x8a4ab0 : 0x4a7a1c);
        },
        rest(S, t, motion) {
          S.hL.set(0.98, TIP + 0.6, 0.5).add(V3(0, Math.sin(t * 1.4 + 1.2) * 0.02 * motion, 0));
          want.set(0.3, -0.3, 1);
          S.claw = 0.18 + 0.14 * Math.max(0, Math.sin(t * 1.7)) * Math.max(0, Math.sin(t * 5.3)) * motion;
          S.spinY -= 0.06;
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.42, p));
            const strike = smooth(0.34, 0.44, p) * (1 - smooth(0.74, 0.95, p));
            S.hL.lerp(V3(0.92, TIP + 1.05, -0.15), wind);
            want.lerp(V3(0.35, 0.3, 0.6), wind);
            S.hL.lerp(V3(0.3, TIP + 0.95, 1.0), strike);
            want.lerp(V3(-0.1, -0.05, 1), strike);
            S.claw = 0.2 + 0.85 * smooth(0.04, 0.32, p) * (1 - smooth(0.4, 0.46, p));
            S.spinY += 0.3 * wind - 0.35 * strike;
            S.lean += -0.06 * wind + 0.16 * strike;
            S.glow = 0.5 * wind + 0.8 * strike;
            S.impact = p > 0.44 && p < 0.6 ? 1 - smooth(0.44, 0.6, p) : 0;
            S.sparkK = p > 0.44 && p < 0.7 ? smooth(0.44, 0.7, p) : -1;
            S.mouthK = 0.6 * strike;
            return true;
          }
          if (nm === "fling") {
            const raise = smooth(0.04, 0.42, p) * (1 - smooth(0.48, 0.56, p));
            const slam = smooth(0.5, 0.6, p) * (1 - smooth(0.8, 0.98, p));
            S.hL.lerp(V3(1.0, TIP + 1.55, 0.15), raise);
            want.lerp(V3(0.45, 0.75, 0.45), raise);
            S.hL.lerp(V3(0.32, TIP + 0.55, 0.95), slam);
            want.lerp(V3(0, -0.75, 0.65), slam);
            S.hR.lerp(V3(-0.8, TIP + 1.15, 0.2), raise);
            S.claw = 0.2 + 1.0 * smooth(0.04, 0.4, p) * (1 - smooth(0.55, 0.6, p));
            S.orbK = smooth(0.1, 0.5, p) * (1 - smooth(0.56, 0.6, p));
            S.lean += -0.12 * raise + 0.28 * slam;
            S.hover += 0.14 * raise - 0.1 * slam;
            S.squash = 1 + 0.04 * raise - 0.06 * slam;
            S.glow = 1.3 * raise + 0.9 * slam;
            S.flash = 0.7 * raise + 0.7 * slam;
            S.waveK = p > 0.58 && p < 0.97 ? smooth(0.58, 0.97, p) : -1;
            S.impact = p > 0.58 && p < 0.76 ? 1 - smooth(0.58, 0.76, p) : 0;
            S.sparkK = p > 0.58 && p < 0.85 ? smooth(0.58, 0.85, p) : -1;
            S.headPitch += 0.18 * slam - 0.12 * raise;
            S.mouthK = 0.8 * slam;
            S.legK = 0.5 * raise;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(0.95, TIP + 0.95, 0.05), S.spinK);
            want.lerp(V3(1, 0.05, 0.1), S.spinK);
            S.claw = 0.2 + 0.6 * S.spinK;
          }
          if (nm === "jump") {
            S.hL.lerp(V3(1.02, TIP + 1.0, 0.35), S.air);
            want.lerp(V3(0.55, 0.45, 0.65), S.air);
            S.claw = 0.2 + 0.5 * S.air;
          }
          return false;
        },
        arm(S, t, motion) {
          dir.lerp(want.clone().normalize(), 0.5).normalize();
          const rad = u => lerp(0.125, 0.085, smooth(0.3, 0.9, u));
          const c = moltenArm(arm, shoulders[1], S.hL, t, motion, rad, 0.7);
          segs.forEach(sg => {
            const p = c.getPointAt(sg.u);
            const tg = c.getTangentAt(sg.u);
            const up = V3(0, 1, 0).addScaledVector(tg, -tg.y);
            if (up.lengthSq() < 1e-3) up.set(1, 0, 0);
            up.normalize();
            const x = up.clone().cross(tg).normalize();
            sg.g.position.copy(p);
            sg.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, tg).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
            const rr = rad(sg.u) * (1 + 0.04 * Math.sin(t * 3 + sg.u * 9) * motion);
            sg.g.scale.set(rr, 0.11, rr);
          });
          const stubEnd = c.getPointAt(1).addScaledVector(c.getTangentAt(1), 0.04);
          const z = dir.clone();
          let x = V3(0, 1, 0).cross(z);
          if (x.lengthSq() < 1e-3) x = V3(1, 0, 0);
          x.normalize();
          const y = z.clone().cross(x).normalize();
          claw.position.copy(stubEnd);
          claw.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
          open = lerp(open, S.claw === undefined ? 0.2 : S.claw, 0.45);
          jawPivot.rotation.x = -open * 0.75;
          const ok = S.orbK || 0;
          orb.visible = ok > 0.02;
          if (orb.visible) {
            orbMat.color.copy(trailMat.color);
            orbMat.opacity = 0.75 * ok;
            orb.scale.setScalar(0.03 + 0.08 * ok * (1 + 0.15 * Math.sin(t * 25)));
          }
        },
        fx(S, nm) {
          claw.updateMatrixWorld(true);
          const tip = big.worldToLocal(clawIn.localToWorld(V3(0, 0.03, 0.66)));
          if (nm === "swipe")
            trail.forEach((a, i) => {
              a.position.copy(shoulders[1]);
              a.rotation.set(0, Math.PI / 2, 0.75 + i * 0.05);
              a.scale.setScalar(1.3 + i * 0.05);
            });
          if (S.waveK >= 0 && S.waveK < 0.03) hitAt = tip.clone();
          shock.visible = S.waveK >= 0;
          if (shock.visible) {
            const k = 0.2 + S.waveK * 1.8;
            shock.position.set(hitAt.x, 0.04, hitAt.z);
            shock.scale.set(k, k, 1 + S.waveK);
            orbMat.color.copy(trailMat.color);
            orbMat.opacity = 0.85 * (1 - S.waveK);
          }
          return tip;
        },
        hide() {
          shock.visible = false;
          orb.visible = false;
        }
      };
    })();

    const shieldKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const grips = [0.6, 0.72].map(() => add(bodyG, mesh(new THREE.TorusGeometry(1, 0.17, 8, 28), darkSteel)));
      const shield = add(bodyG, new THREE.Group());
      const SW = 0.42;
      const BEND = 0.55;
      const bendZ = x => -BEND * x * x;
      const outline = (() => {
        const pts = [];
        const N = 64;
        for (let i = 0; i <= N; i++) {
          const f = i / N;
          let x;
          let y;
          if (f < 0.2) {
            const k = f / 0.2;
            x = lerp(-SW, SW, k);
            y = 0.5 + 0.06 * Math.sin(Math.PI * k);
          } else if (f < 0.45) {
            const k = (f - 0.2) / 0.25;
            x = SW * (1 - 0.04 * k);
            y = lerp(0.5, 0.0, k);
          } else if (f < 0.55) {
            const k = (f - 0.45) / 0.1;
            const a = k * Math.PI;
            x = SW * 0.96 * Math.cos(a * 0.5) * (1 - k) + 0 * k;
            y = -0.65 * Math.sin(a * 0.5) * 1;
            x = lerp(SW * 0.96, 0, k * k) * (1 - 0.0);
            y = lerp(0.0, -0.66, Math.sin((k * Math.PI) / 2));
          } else if (f < 0.8) {
            const k = (f - 0.55) / 0.25;
            x = -lerp(0, SW * 0.96, 1 - (1 - k) * (1 - k));
            y = lerp(-0.66, 0.0, 1 - Math.cos((k * Math.PI) / 2));
          } else {
            const k = (f - 0.8) / 0.2;
            x = -SW * (0.96 + 0.04 * k);
            y = lerp(0.0, 0.5, k);
          }
          pts.push(V2(x, y));
        }
        return pts;
      })();
      const heater = (inset, depth, mat, z0) => {
        const sh = new THREE.Shape();
        const cx = 0;
        const cy = -0.05;
        outline.forEach((p, i) => {
          const x = cx + (p.x - cx) * (1 - inset);
          const y = cy + (p.y - cy) * (1 - inset * 1.1);
          i ? sh.lineTo(x, y) : sh.moveTo(x, y);
        });
        const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: 0.012, bevelSegments: 2, curveSegments: 4, steps: 1 });
        const subdiv = g;
        const q = subdiv.attributes.position;
        for (let i = 0; i < q.count; i++) q.setZ(i, q.getZ(i) + z0 + bendZ(q.getX(i)));
        subdiv.computeVertexNormals();
        return mesh(subdiv, mat);
      };
      const shIn = new THREE.Group();
      shIn.scale.setScalar(1.3);
      shield.add(shIn);
      shIn.add(heater(0, 0.05, darkSteel, -0.03));
      shIn.add(heater(0.08, 0.03, castMat, 0.02));
      {
        const cross = [];
        const bar = (x0, y0, x1, y1, w) => {
          const N = 12;
          const pts = [];
          for (let i = 0; i <= N; i++) {
            const x = lerp(x0, x1, i / N);
            const y = lerp(y0, y1, i / N);
            pts.push(V3(x, y, 0.075 + bendZ(x)));
          }
          return strip(pts, pts.map(p => V3(2 * BEND * p.x, 0, 1).normalize()), () => w, () => 0.02);
        };
        shIn.add(mesh(bar(0, 0.44, 0, -0.55, 0.035), plateMat));
        shIn.add(mesh(bar(-0.36, 0.2, 0.36, 0.2, 0.035), plateMat));
        const boss = mesh(new THREE.SphereGeometry(0.13, 32, 20, 0, TAU, 0, Math.PI / 2), plateMat);
        boss.rotation.x = Math.PI / 2;
        boss.position.set(0, 0.2, 0.08);
        boss.scale.set(1, 0.6, 1);
        shIn.add(boss);
        const brim = mesh(new THREE.TorusGeometry(0.13, 0.022, 10, 32), darkSteel);
        brim.position.set(0, 0.2, 0.085);
        shIn.add(brim);
        const gem = mesh(new THREE.OctahedronGeometry(0.06, 0), coreMat, false);
        gem.position.set(0, 0.2, 0.16);
        gem.scale.set(1, 1, 0.7);
        shIn.add(gem);
        const spk = mesh(new THREE.ConeGeometry(0.035, 0.12, 6), darkSteel);
        spk.rotation.x = Math.PI / 2;
        spk.position.set(0, 0.2, 0.2);
        shIn.add(spk);
        const riv = [];
        outline.forEach((p, i) => {
          if (i % 4) return;
          const x = p.x * 0.955;
          const y = -0.05 + (p.y + 0.05) * 0.95;
          const g = new THREE.SphereGeometry(0.016, 8, 6);
          g.translate(x, y, 0.06 + bendZ(x));
          riv.push(g);
        });
        shIn.add(mesh(mergeGeos(riv), plateMat));
        [[-0.2, 0.36], [0.2, 0.36], [-0.2, -0.05], [0.2, -0.05]].forEach(([x, y]) => {
          const g = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 6), darkSteel);
          g.rotation.x = Math.PI / 2;
          g.position.set(x, y, 0.07 + bendZ(x));
          shIn.add(g);
        });
        const back = mesh(new THREE.SphereGeometry(0.17, 24, 16), moltenMat);
        back.scale.set(1, 1, 0.45);
        back.position.set(0, 0.05, -0.06);
        shIn.add(back);
        [[-0.12, -0.02, 1.3], [0.1, 0.12, 1.0], [0.02, -0.12, 1.6]].forEach(([x, y, s]) => {
          const d = mesh(dropGeo, moltenMat);
          d.position.set(x, y, -0.075);
          d.scale.set(1.2, s * 1.4, 1.2);
          d.rotation.x = Math.PI;
          shIn.add(d);
        });
      }
      const helm = add(head, new THREE.Group());
      {
        const N = 36;
        const pts = [];
        for (let i = 0; i <= N; i++) pts.push(onHeadRing(-0.05, lerp(Math.PI * 0.62, Math.PI * 1.38, i / N)));
        helm.add(mesh(strip(pts, pts.map(HN), () => 0.04, () => 0.024), plateMat));
        for (let i = 0; i <= 6; i++) {
          const p = onHeadRing(-0.05, lerp(Math.PI * 0.66, Math.PI * 1.34, i / 6));
          const r = mesh(new THREE.SphereGeometry(0.017, 8, 6), darkSteel);
          r.position.copy(p).addScaledVector(HN(p), 0.03);
          helm.add(r);
        }
      }
      const pad = add(socket, new THREE.Group());
      {
        pad.position.set(0.02, 0.03, 0);
        pad.rotation.z = -0.38;
        [0, 1, 2, 3].forEach(i => {
          const sh = mesh(new THREE.SphereGeometry(0.22 - i * 0.022, 32, 12, 0, TAU, 0, Math.PI * 0.4), i % 2 ? darkSteel : plateMat);
          sh.scale.set(1, 0.7, 1.08);
          sh.position.set(0.035 * i, -0.05 * i, 0);
          pad.add(sh);
        });
        const ridge = mesh(new THREE.TorusGeometry(0.18, 0.028, 8, 24, Math.PI), plateMat);
        ridge.rotation.set(0, Math.PI / 2, 0);
        ridge.scale.set(1, 0.7, 1);
        ridge.position.y = 0.03;
        pad.add(ridge);
        [-0.13, -0.045, 0.045, 0.13].forEach(z => {
          const rv = mesh(new THREE.SphereGeometry(0.018, 8, 6), darkSteel);
          rv.position.set(0.16, 0.05, z);
          pad.add(rv);
        });
      }
      const plate = add(port, new THREE.Group());
      {
        const ring = mesh(new THREE.TorusGeometry(0.17, 0.024, 8, 32), plateMat);
        ring.position.z = -0.006;
        plate.add(ring);
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU;
          const r = mesh(new THREE.SphereGeometry(0.016, 8, 6), darkSteel);
          r.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.016);
          plate.add(r);
        }
      }
      const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 48), trailMat);
      wave.rotation.x = Math.PI / 2;
      wave.visible = false;
      big.add(wave);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, TAU, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc8d8ff, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      dome.visible = false;
      big.add(dome);
      let face = V3(0.6, 0, 1);
      const want = V3(0.6, 0, 1);
      let hitAt = V3();
      return {
        set: on => {
          K.set(on);
          if (!on) {
            wave.visible = false;
            dome.visible = false;
          }
        },
        style() {},
        rest(S, t, motion) {
          S.hL.set(0.86, TIP + 0.72, 0.38).add(V3(0, Math.sin(t * 1.4 + 1.2) * 0.02 * motion, 0));
          want.set(1, 0, 0.32);
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.42, p));
            const bash = smooth(0.34, 0.44, p) * (1 - smooth(0.72, 0.95, p));
            S.hL.lerp(V3(0.75, TIP + 0.85, -0.05), wind);
            want.lerp(V3(1, 0, 0.2), wind);
            S.hL.lerp(V3(0.3, TIP + 0.85, 1.0), bash);
            want.lerp(V3(0.1, 0, 1), bash);
            S.spinY += 0.35 * wind - 0.4 * bash;
            S.lean += -0.06 * wind + 0.2 * bash;
            S.glow = 0.5 * wind + 0.8 * bash;
            S.impact = p > 0.42 && p < 0.6 ? 1 - smooth(0.42, 0.6, p) : 0;
            S.sparkK = p > 0.42 && p < 0.7 ? smooth(0.42, 0.7, p) : -1;
            S.mouthK = 0.6 * bash;
            return true;
          }
          if (nm === "fling") {
            const raise = smooth(0.04, 0.38, p) * (1 - smooth(0.42, 0.5, p));
            const slam = smooth(0.42, 0.5, p) * (1 - smooth(0.82, 0.98, p));
            S.hL.lerp(V3(0.55, TIP + 1.75, 0.35), raise);
            want.lerp(V3(0.2, 0.6, 1), raise);
            S.hL.lerp(V3(0.3, TIP + 0.45, 0.85), slam);
            want.lerp(V3(0.05, -0.1, 1), slam);
            S.hR.lerp(V3(-0.82, TIP + 1.2, 0.2), raise);
            S.lean += -0.14 * raise + 0.3 * slam;
            S.hover += 0.18 * raise - 0.12 * slam;
            S.squash = 1 + 0.05 * raise - 0.06 * slam;
            S.glow = 1.2 * raise + 0.8 * slam;
            S.flash = 0.6 * raise + 0.6 * slam;
            S.waveK = p > 0.48 && p < 0.97 ? smooth(0.48, 0.97, p) : -1;
            S.impact = p > 0.48 && p < 0.68 ? 1 - smooth(0.48, 0.68, p) : 0;
            S.sparkK = p > 0.48 && p < 0.78 ? smooth(0.48, 0.78, p) : -1;
            S.headPitch += 0.2 * slam - 0.1 * raise;
            S.mouthK = 0.8 * slam;
            S.legK = 0.5 * raise;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(0.95, TIP + 0.9, 0.0), S.spinK);
            want.lerp(V3(1, 0, 0), S.spinK);
          }
          if (nm === "jump") {
            S.hL.lerp(V3(0.85, TIP + 0.95, 0.3), S.air);
            want.lerp(V3(1, -0.4, 0.3), S.air);
          }
          return false;
        },
        arm(S, t, motion) {
          face.lerp(want.clone().normalize(), 0.4).normalize();
          const rad = u => lerp(0.125, 0.1, smooth(0.35, 0.7, u));
          const c = moltenArm(arm, shoulders[1], S.hL, t, motion, rad, 0.75);
          [0.6, 0.72].forEach((u, i) => {
            grips[i].position.copy(c.getPointAt(u));
            grips[i].quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(u));
            grips[i].scale.setScalar(rad(u) + 0.006);
          });
          const z = face.clone();
          let x = V3(0, 1, 0).cross(z);
          if (x.lengthSq() < 1e-3) x = V3(1, 0, 0);
          x.normalize();
          const y = z.clone().cross(x).normalize();
          shield.position.copy(S.hL).addScaledVector(z, 0.14);
          shield.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
        },
        fx(S, nm) {
          shield.updateMatrixWorld(true);
          const front = big.worldToLocal(shIn.localToWorld(V3(0, 0.2, 0.2)));
          const bottom = big.worldToLocal(shIn.localToWorld(V3(0, -0.66, 0.05)));
          if (S.waveK >= 0 && S.waveK < 0.03) hitAt = bottom.clone();
          wave.visible = S.waveK >= 0;
          dome.visible = S.waveK >= 0;
          if (wave.visible) {
            const k = 0.2 + S.waveK * 1.8;
            wave.position.set(hitAt.x, 0.04, hitAt.z);
            wave.scale.set(k, k, 1 + S.waveK);
            S.trailOpacity = 0.7 * (1 - S.waveK);
            const d = 0.4 + smooth(0, 0.4, S.waveK) * 1.1;
            dome.position.set(0, 0, 0);
            dome.scale.set(d, d * 1.15, d);
            dome.material.color.copy(trailMat.color).lerp(new THREE.Color(1, 1, 1), 0.5);
            dome.material.opacity = 0.14 * (1 - smooth(0.35, 1, S.waveK));
          }
          return nm === "fling" ? bottom : front;
        },
        hide() {
          wave.visible = false;
          dome.visible = false;
        }
      };
    })();

    const copperMat = new THREE.MeshStandardMaterial({ color: 0xc8743a, roughness: 0.3, metalness: 0.85 });
    const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.35, metalness: 0.05 });
    const railKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const cable = dyn(darkSteel);
      K.parts.push(cable);
      const grips = [0.66, 0.8].map(() => add(bodyG, mesh(new THREE.TorusGeometry(1, 0.17, 8, 28), copperMat)));
      const gun = add(bodyG, new THREE.Group());
      const MZ = 1.22;
      const chanMat = new THREE.MeshBasicMaterial({ color: 0xffe060, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending });
      const orbMat = new THREE.MeshBasicMaterial({ color: 0xffe060, transparent: true, opacity: 0.9, depthWrite: false });
      const box = (w, h, d, m, x, y, z) => {
        const b = mesh(new THREE.BoxGeometry(w, h, d), m);
        b.position.set(x, y, z);
        gun.add(b);
        return b;
      };
      {
        const hous = new THREE.CylinderGeometry(0.15, 0.16, 0.48, 20);
        hous.rotateX(Math.PI / 2);
        hous.translate(0, 0, 0.06);
        gun.add(mesh(hous, castMat));
        const cap = mesh(new THREE.SphereGeometry(0.16, 20, 12, 0, TAU, 0, Math.PI / 2), castMat);
        cap.rotation.x = -Math.PI / 2;
        cap.position.z = -0.18;
        cap.scale.set(1, 1, 0.5);
        gun.add(cap);
        [-0.1, 0.12].forEach(z => {
          const r = mesh(new THREE.TorusGeometry(0.162, 0.016, 8, 28), plateMat);
          r.position.z = z;
          gun.add(r);
        });
        for (let i = 0; i < 5; i++) box(0.012, 0.07, 0.26, plateMat, -0.08 + i * 0.04, 0.17, 0.04);
        [-1, 1].forEach(sg => {
          const c = new THREE.CylinderGeometry(0.05, 0.05, 0.34, 14);
          c.rotateX(Math.PI / 2);
          const cm = mesh(c, darkSteel);
          cm.position.set(sg * 0.19, -0.04, 0.05);
          gun.add(cm);
          [-0.08, 0.0, 0.08].forEach(z => {
            const b = mesh(new THREE.TorusGeometry(0.051, 0.008, 6, 18), hotMat, false);
            b.position.set(sg * 0.19, -0.04, 0.05 + z);
            gun.add(b);
          });
          const tcap = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), copperMat);
          tcap.rotation.x = Math.PI / 2;
          tcap.position.set(sg * 0.19, -0.04, 0.23);
          gun.add(tcap);
        });
        [-1, 1].forEach(sg => {
          box(0.07, 0.05, MZ - 0.26, castMat, 0, sg * 0.09, 0.26 + (MZ - 0.26) / 2);
          box(0.05, 0.008, MZ - 0.3, hotMat, 0, sg * 0.063, 0.3 + (MZ - 0.3) / 2);
          box(0.085, 0.018, MZ - 0.3, plateMat, 0, sg * 0.122, 0.3 + (MZ - 0.3) / 2);
          const tip = mesh(new THREE.ConeGeometry(0.035, 0.14, 4), castMat);
          tip.rotation.x = Math.PI / 2;
          tip.position.set(0, sg * 0.09, MZ + 0.06);
          tip.scale.set(1, 0.7, 1);
          gun.add(tip);
          [-1, 1].forEach(sx => {
            const pr = mesh(new THREE.ConeGeometry(0.014, 0.09, 4), castMat);
            pr.rotation.set(Math.PI / 2, 0, 0);
            pr.position.set(sx * 0.03, sg * 0.105, MZ + 0.02);
            pr.rotation.y = sx * 0.4;
            gun.add(pr);
          });
        });
        [0.36, 0.44, 0.52, 0.6].forEach(z => {
          const t = mesh(new THREE.TorusGeometry(0.13, 0.026, 8, 26), copperMat);
          t.position.z = z;
          gun.add(t);
        });
        [0.78, 1.02].forEach(z => {
          [-1, 1].forEach(sx => {
            box(0.024, 0.2, 0.05, ceramicMat, sx * 0.055, 0, z);
            [-1, 1].forEach(sy => box(0.04, 0.014, 0.06, plateMat, sx * 0.055, sy * 0.105, z));
          });
        });
        const chan = mesh(new THREE.BoxGeometry(0.06, 0.1, MZ - 0.3), chanMat, false);
        chan.position.z = 0.3 + (MZ - 0.3) / 2;
        gun.add(chan);
        gun.userData.chan = chan;
        const sight = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 10), darkSteel);
        sight.rotation.x = Math.PI / 2;
        sight.position.set(0.1, 0.2, 0.3);
        gun.add(sight);
        const lens = mesh(new THREE.CircleGeometry(0.02, 12), hotMat, false);
        lens.position.set(0.1, 0.2, 0.371);
        gun.add(lens);
      }
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), orbMat);
      ball.visible = false;
      big.add(ball);
      const ballIn = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      ball.add(ballIn);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true), orbMat);
      beam.visible = false;
      big.add(beam);
      const flash = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 6, 32), orbMat);
      flash.visible = false;
      big.add(flash);
      const charge = mesh(new THREE.SphereGeometry(1, 16, 12), orbMat, false);
      charge.visible = false;
      gun.add(charge);
      K.parts.push(charge);
      const lensG = add(head, new THREE.Group());
      {
        const eP = HP(0.34, -0.02);
        const n = HN(eP);
        const at = eP.clone().addScaledVector(n, 0.07);
        const g = new THREE.Group();
        g.position.copy(at);
        g.quaternion.setFromUnitVectors(V3(0, 0, 1), n.clone().add(V3(0, 0, 0.9)).normalize());
        lensG.add(g);
        const ring = mesh(new THREE.TorusGeometry(0.085, 0.016, 8, 28), darkSteel);
        g.add(ring);
        const ring2 = mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 24), copperMat);
        ring2.position.z = 0.01;
        g.add(ring2);
        const glass = mesh(new THREE.CircleGeometry(0.075, 24), new THREE.MeshStandardMaterial({ color: 0xfff0a0, emissive: 0xffd400, emissiveIntensity: 0.25, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 }), false);
        glass.position.z = 0.004;
        g.add(glass);
        const cross = [[0.12, 0.005], [0.005, 0.12]].map(([w, h]) => {
          const c = mesh(new THREE.PlaneGeometry(w, h), hotMat, false);
          c.position.z = 0.006;
          g.add(c);
          return c;
        });
        void cross;
        const ear = HP(0.95, 0.05);
        const en = HN(ear);
        const pod = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 18), plateMat);
        pod.position.copy(ear).addScaledVector(en, 0.02);
        pod.quaternion.setFromUnitVectors(V3(0, 1, 0), en);
        lensG.add(pod);
        const arm2 = tubeGeo([ear.clone().addScaledVector(en, 0.04), ear.clone().addScaledVector(en, 0.06).add(V3(-0.04, 0, 0.08)), at.clone().add(V3(0.08, 0, -0.02))], () => 0.012, 16, 6).g;
        lensG.add(mesh(arm2, darkSteel));
        const ant = tubeGeo([ear.clone().addScaledVector(en, 0.05), ear.clone().add(V3(0.08, 0.16, -0.05)), ear.clone().add(V3(0.1, 0.32, -0.1))], u => lerp(0.012, 0.005, u), 16, 6).g;
        lensG.add(mesh(ant, darkSteel));
        const bulb = mesh(new THREE.SphereGeometry(0.024, 10, 8), hotMat, false);
        bulb.position.copy(ear).add(V3(0.1, 0.33, -0.1));
        lensG.add(bulb);
      }
      const pack = add(socket, new THREE.Group());
      {
        pack.position.set(0.02, 0.04, 0);
        pack.rotation.z = -0.38;
        const sh = mesh(new THREE.SphereGeometry(0.21, 32, 12, 0, TAU, 0, Math.PI * 0.42), plateMat);
        sh.scale.set(1, 0.72, 1.08);
        pack.add(sh);
        [-0.08, 0.08].forEach(z => {
          const c = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 14), darkSteel);
          c.position.set(0.0, 0.17, z);
          pack.add(c);
          const b = mesh(new THREE.TorusGeometry(0.046, 0.008, 6, 16), hotMat, false);
          b.rotation.x = Math.PI / 2;
          b.position.set(0, 0.19, z);
          pack.add(b);
          const tcap = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), copperMat);
          tcap.position.set(0, 0.26, z);
          pack.add(tcap);
        });
      }
      const coreRing = add(port, new THREE.Group());
      {
        const t = mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 32), copperMat);
        t.position.z = -0.006;
        coreRing.add(t);
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU;
          const l = mesh(new THREE.BoxGeometry(0.03, 0.05, 0.02), k % 2 ? plateMat : hotMat, k % 2 === 1);
          l.position.set(Math.cos(a) * 0.215, Math.sin(a) * 0.215, 0.005);
          l.rotation.z = a;
          coreRing.add(l);
        }
      }
      const backPack = add(torso, new THREE.Group());
      {
        const P = TP(Math.PI, 0.82);
        const n = TN(Math.PI, 0.82);
        const g = new THREE.Group();
        g.position.copy(P).addScaledVector(n, 0.05);
        g.quaternion.setFromUnitVectors(V3(0, 0, 1), n);
        backPack.add(g);
        const body = mesh(new THREE.BoxGeometry(0.42, 0.4, 0.12), plateMat);
        g.add(body);
        [-0.12, 0, 0.12].forEach(x => {
          const c = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.36, 14), darkSteel);
          c.position.set(x, 0, 0.09);
          g.add(c);
          [-0.08, 0.04].forEach(y => {
            const b = mesh(new THREE.TorusGeometry(0.046, 0.008, 6, 16), hotMat, false);
            b.rotation.x = Math.PI / 2;
            b.position.set(x, y, 0.09);
            g.add(b);
          });
        });
        [-1, 1].forEach(sg => {
          const s = mesh(new THREE.BoxGeometry(0.05, 0.5, 0.04), darkSteel);
          s.position.set(sg * 0.17, 0.05, -0.02);
          g.add(s);
        });
      }
      const plug = add(tailTip, new THREE.Group());
      {
        const body = mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.14, 14), plateMat);
        body.rotation.x = Math.PI / 2;
        body.position.z = 0.06;
        plug.add(body);
        const ring = mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 18), copperMat);
        ring.position.z = 0.1;
        plug.add(ring);
        [-1, 1].forEach(sg => {
          const pin = mesh(new THREE.BoxGeometry(0.018, 0.035, 0.12), copperMat);
          pin.position.set(sg * 0.03, 0, 0.18);
          plug.add(pin);
        });
        plug.scale.setScalar(1.2);
      }
      let dir = V3(0.15, -0.2, 1).normalize();
      const want = V3(0.15, -0.2, 1);
      let recoil = 0;
      let muzzle0 = V3();
      let fwd0 = V3(0, 0, 1);
      let fired = false;
      return {
        customTail: true,
        set: on => {
          K.set(on);
          if (!on) {
            ball.visible = false;
            beam.visible = false;
            flash.visible = false;
          }
          charge.visible = false;
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0xe8e0c8 : 0x34405a);
        },
        rest(S, t, motion) {
          S.hL.set(0.86, TIP + 0.62, 0.4).add(V3(0, Math.sin(t * 1.4 + 1.2) * 0.02 * motion, 0));
          want.set(0.18, -0.2, 1);
          S.chargeK = 0.1 + 0.05 * Math.sin(t * 3);
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const aim = smooth(0.02, 0.2, p) * (1 - smooth(0.82, 0.98, p));
            S.hL.lerp(V3(0.62, TIP + 1.0, 0.75), aim);
            want.lerp(V3(-0.05, 0.02, 1), aim);
            S.chargeK = smooth(0.1, 0.4, p) * (1 - smooth(0.42, 0.45, p));
            S.shotK = p > 0.42 && p < 0.75 ? smooth(0.42, 0.75, p) : -1;
            S.kick = p > 0.42 ? Math.exp(-(p - 0.42) * 14) : 0;
            S.spinY -= 0.25 * aim;
            S.lean += -0.12 * S.kick;
            S.glow = 0.6 * S.chargeK + 0.8 * S.kick;
            S.flash = 0.5 * S.kick;
            S.impact = S.kick;
            S.sparkK = p > 0.62 && p < 0.85 ? smooth(0.62, 0.85, p) : -1;
            S.mouthK = 0.5 * S.kick;
            return true;
          }
          if (nm === "fling") {
            const aim = smooth(0.02, 0.18, p) * (1 - smooth(0.85, 0.99, p));
            S.hL.lerp(V3(0.55, TIP + 1.05, 0.7), aim);
            want.lerp(V3(-0.08, 0.06, 1), aim);
            S.hR.lerp(V3(-0.1, TIP + 1.05, 0.75), aim);
            S.chargeK = smooth(0.08, 0.52, p) * (1 - smooth(0.54, 0.57, p));
            S.shotK = p > 0.54 && p < 0.92 ? smooth(0.54, 0.92, p) : -1;
            S.beamK = p > 0.54 && p < 0.8 ? 1 - smooth(0.54, 0.8, p) : 0;
            S.kick = p > 0.54 ? Math.exp(-(p - 0.54) * 9) : 0;
            S.spinY -= 0.3 * aim;
            S.lean += -0.05 * S.chargeK - 0.22 * S.kick;
            S.hover += -0.04 * S.chargeK;
            S.squash = 1 - 0.04 * S.chargeK;
            S.legK = Math.max(S.legK, 0.5 * S.chargeK);
            S.glow = 1.4 * S.chargeK + 1.0 * S.kick;
            S.flash = 0.8 * S.chargeK + 0.8 * S.kick;
            S.impact = S.kick;
            S.sparkK = p > 0.82 && p < 0.99 ? smooth(0.82, 0.99, p) : -1;
            S.headPitch += 0.05 * aim;
            S.mouthK = 0.8 * S.kick;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(0.95, TIP + 0.9, 0.05), S.spinK);
            want.lerp(V3(1, 0, 0.1), S.spinK);
          }
          if (nm === "jump") {
            S.hL.lerp(V3(0.9, TIP + 0.85, 0.35), S.air);
            want.lerp(V3(0.3, -0.7, 0.6), S.air);
          }
          return false;
        },
        arm(S, t, motion) {
          dir.lerp(want.clone().normalize(), 0.5).normalize();
          recoil = lerp(recoil, S.kick || 0, 0.6);
          const hand = S.hL.clone().addScaledVector(dir, -0.18 * recoil);
          const rad = u => lerp(0.125, 0.11, smooth(0.3, 0.9, u));
          const c = moltenArm(arm, shoulders[1], hand, t, motion, rad, 0.7);
          [0.66, 0.8].forEach((u, i) => {
            grips[i].position.copy(c.getPointAt(u));
            grips[i].quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(u));
            grips[i].scale.setScalar(rad(u) + 0.008);
          });
          const z = dir.clone();
          let x = V3(0, 1, 0).cross(z);
          if (x.lengthSq() < 1e-3) x = V3(1, 0, 0);
          x.normalize();
          const y = z.clone().cross(x).normalize();
          gun.position.copy(c.getPointAt(1)).addScaledVector(dir, 0.2);
          gun.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
          const ck = S.chargeK || 0;
          gun.userData.chan.material.opacity = 0.15 + 0.6 * ck + 0.4 * recoil;
          charge.visible = ck > 0.15;
          if (charge.visible) {
            charge.position.set(0, 0, 0.32 + 0.05 * Math.sin(t * 30));
            charge.scale.setScalar(0.02 + 0.07 * ck * (1 + 0.12 * Math.sin(t * 40)));
          }
          const sp = shoulders[1].clone().add(V3(0.02, 0.24, -0.12));
          const gp = gun.position.clone().add(V3(0, 0.16, -0.1).applyQuaternion(gun.quaternion));
          const mid = sp.clone().lerp(gp, 0.5).add(V3(0.12, -0.12, -0.08));
          flexTube(cable, [sp, sp.clone().lerp(mid, 0.6).add(V3(0.04, 0, -0.02)), mid, gp.clone().lerp(mid, 0.4), gp], () => 0.022, 30, 8);
        },
        fx(S, nm, p, t) {
          gun.updateMatrixWorld(true);
          const muzzle = big.worldToLocal(gun.localToWorld(V3(0, 0, MZ + 0.05)));
          const back = big.worldToLocal(gun.localToWorld(V3(0, 0, 0.3)));
          const fwd = muzzle.clone().sub(back).normalize();
          const k = S.shotK === undefined ? -1 : S.shotK;
          if (k >= 0 && !fired) {
            fired = true;
            muzzle0.copy(muzzle);
            fwd0.copy(fwd);
          }
          if (k < 0) fired = false;
          const big2 = nm === "fling";
          ball.visible = k >= 0 && k < 1;
          let at = muzzle;
          if (ball.visible) {
            at = muzzle0.clone().addScaledVector(fwd0, k * (big2 ? 4.2 : 3.4));
            ball.position.copy(at);
            ball.scale.setScalar((big2 ? 0.2 : 0.11) * (1 + 0.15 * Math.sin(t * 50)));
            orbMat.color.copy(trailMat.color);
          }
          const bk = S.beamK || 0;
          beam.visible = bk > 0.02 && ball.visible;
          if (beam.visible) {
            const len = at.distanceTo(muzzle0);
            beam.position.copy(muzzle0).addScaledVector(fwd0, len / 2);
            beam.quaternion.setFromUnitVectors(V3(0, 1, 0), fwd0);
            beam.scale.set(0.05 + 0.1 * bk, len, 0.05 + 0.1 * bk);
          }
          const fk = S.kick || 0;
          flash.visible = fk > 0.1 && k >= 0;
          if (flash.visible) {
            flash.position.copy(muzzle0).addScaledVector(fwd0, 0.1 + (1 - fk) * 0.3);
            flash.quaternion.setFromUnitVectors(V3(0, 0, 1), fwd0);
            flash.scale.setScalar((big2 ? 0.35 : 0.2) * (1.6 - fk));
          }
          return S.sparkK >= 0 ? at : muzzle;
        },
        hide() {
          ball.visible = false;
          beam.visible = false;
          flash.visible = false;
        }
      };
    })();

    const ghostMat = new THREE.MeshStandardMaterial({ color: 0xe6dcff, emissive: 0xb090ff, emissiveIntensity: 0.55, roughness: 0.4, metalness: 0, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    const cloakMat = new THREE.MeshStandardMaterial({ color: 0x2a1f3a, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
    const scytheKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const SL = 2.35;
      const GZ = 0.92;
      const scythe = add(bodyG, new THREE.Group());
      const scy = new THREE.Group();
      scy.position.z = -GZ;
      scythe.add(scy);
      scythe.add(moltenGrip(0.42, 0.056, 0.115, 2.4));
      const spineC = new THREE.CubicBezierCurve(V2(-0.03, 0.08), V2(0.5, 0.16), V2(0.9, -0.3), V2(0.8, -1.05));
      const edgeC = new THREE.CubicBezierCurve(V2(0.8, -1.05), V2(0.72, -0.5), V2(0.42, -0.1), V2(-0.03, -0.07));
      const bladeShape = (() => {
        const sh = new THREE.Shape();
        sh.moveTo(-0.03, 0.08);
        sh.bezierCurveTo(0.5, 0.16, 0.9, -0.3, 0.8, -1.05);
        sh.bezierCurveTo(0.72, -0.5, 0.42, -0.1, -0.03, -0.07);
        sh.lineTo(-0.03, 0.08);
        return sh;
      })();
      const toLocal = new THREE.Matrix4().makeBasis(V3(0, 1, 0), V3(0, 0, 1), V3(1, 0, 0));
      const bladeGeo = (() => {
        const g = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 2, curveSegments: 40 });
        g.translate(0, 0, -0.015);
        const q = g.attributes.position;
        for (let i = 0; i < q.count; i++) {
          const x = q.getX(i);
          const y = q.getY(i);
          const k = lerp(1, 0.3, smooth(0.0, 1.0, Math.hypot(x, y) / 1.3));
          q.setZ(i, q.getZ(i) * k);
        }
        g.applyMatrix4(toLocal);
        g.computeVertexNormals();
        return g;
      })();
      {
        const snC = new THREE.CatmullRomCurve3([V3(0, 0, -0.05), V3(0.05, 0.02, SL * 0.18), V3(-0.04, -0.015, SL * 0.38), V3(0.045, 0.02, SL * 0.6), V3(-0.03, 0, SL * 0.8), V3(0, 0, SL)]);
        const part = (u0, u1) => snC.getPoints(60).filter((_, i) => i / 60 >= u0 - 1e-6 && i / 60 <= u1 + 1e-6);
        const knots = [0.07, 0.16, 0.25, 0.47, 0.82, 0.88, 0.95];
        const radS = (u, v) => {
          let r = lerp(0.058, 0.05, u);
          knots.forEach((k, i) => (r += 0.02 * Math.exp(-Math.pow((u - k) / 0.022, 2)) * (0.7 + 0.5 * Math.sin(v * TAU + i * 2))));
          return r * (1 + 0.08 * Math.sin(v * TAU * 3 + u * 40) + 0.05 * Math.sin(u * 90));
        };
        scy.add(mesh(tubeGeo(part(0, 0.49), (u, v) => radS(u * 0.49, v) * (1 - 0.35 * smooth(0.82, 1, u)), 70, 14).g, castMat));
        scy.add(mesh(tubeGeo(part(0.75, 1), (u, v) => radS(0.75 + u * 0.25, v) * (1 - 0.35 * (1 - smooth(0, 0.25, u))), 40, 14).g, castMat));
        scy.add(mesh(tubeGeo(part(0.46, 0.78), (u, v) => 0.06 * (1 + 0.18 * Math.sin(v * TAU * 3 + u * 14)), 30, 14).g, ghostMat, false));
        scy.userData.frags = [0.53, 0.59, 0.65, 0.71].map((u, i) => {
          const f = mesh(new THREE.DodecahedronGeometry(0.03 + (i % 2) * 0.012, 0), castMat);
          f.position.copy(snC.getPointAt(u));
          f.userData.base = f.position.clone();
          f.userData.i = i;
          scy.add(f);
          return f;
        });
        const pom = mesh(new THREE.SphereGeometry(0.075, 14, 10), castMat);
        pom.scale.set(1.1, 0.9, 1.3);
        pom.position.set(0.01, 0, -0.08);
        scy.add(pom);
        const head2 = mesh(new THREE.SphereGeometry(0.085, 18, 14), castMat);
        head2.scale.set(1, 1.15, 1.4);
        head2.position.set(0, 0.02, SL);
        scy.add(head2);
        const sp = [];
        for (let k = 0; k < 13; k++) {
          const a = (k / 13) * TAU;
          const d = V3(Math.cos(a), Math.sin(a), 0);
          if (d.y > 0.55) continue;
          const l = 0.07 + 0.08 * ((k * 7) % 5) / 4;
          sp.push(spike(V3(d.x * 0.07, d.y * 0.07, SL + 0.03 + ((k * 3) % 4) * 0.012), d.clone().add(V3(0, -0.25, 0.9)), l, 0.02, 4));
        }
        scy.add(mesh(mergeGeos(sp), castMat));
        [[0, 1], [0.045, 0.75], [-0.045, 0.75]].forEach(([x, k]) => {
          const h = tubeGeo([V3(x, -0.05, SL + 0.03), V3(x, -0.15 * k, SL + 0.1 * k), V3(x, -0.27 * k, SL + 0.1 * k), V3(x, -0.33 * k, SL + 0.03)], u => lerp(0.026, 0.003, u) * k, 20, 8).g;
          scy.add(mesh(h, plateMat));
        });
        const bl = mesh(bladeGeo, castMat);
        bl.position.set(0, 0.03, SL);
        scy.add(bl);
        const ep = edgeC.getPoints(40).map(p => V3(0, p.x + 0.03, p.y + SL));
        scy.add(mesh(tubeGeo(ep, u => 0.011 * Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.04)), 80, 6).g, hotMat, false));
        const sp2 = spineC.getPoints(40).map(p => V3(0, p.x + 0.03, p.y + SL));
        scy.add(mesh(tubeGeo(sp2, u => 0.02 * (1 - 0.85 * u), 80, 8).g, plateMat));
      }
      const wisps = Array.from({ length: 7 }, (_, k) => {
        const m = mesh(dropGeo, ghostMat, false);
        scy.add(m);
        K.parts.push(m);
        return { m, k, per: 1.4 + (k % 3) * 0.4, z: SL * 0.5 + (k / 7) * SL * 0.26 };
      });
      const crown = add(head, new THREE.Group());
      {
        const a0 = Math.asin(0.52 / Math.sqrt(0.75));
        const wa = a => Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
        const vY = w => {
          let y = 0.04;
          for (let k = 0; k < 30; k++) y = 0.04 + 0.46 * Math.min(1, (Math.sin(w) * Math.sqrt(1 - y * y)) / 0.52);
          return y;
        };
        const yE = a => {
          const w = wa(a);
          return w <= a0 ? vY(w) : lerp(0.5, 0.08, smooth(a0, a0 + 1.2, w));
        };
        const OFF = 0.028;
        const hp = (a, y, off) => {
          const p = onHeadRing(y, a);
          return p.addScaledVector(HN(p), off);
        };
        const NA = 120;
        const NS = 30;
        const pos = [];
        const idx = [];
        for (let i = 0; i <= NA; i++) {
          const a = Math.PI + (i / NA) * TAU;
          const f0 = Math.asin(yE(a));
          for (let j = 0; j <= NS; j++) {
            const y = Math.sin(lerp(f0, Math.PI / 2 - 0.001, j / NS));
            pos.push(...hp(a, y, OFF).toArray());
          }
        }
        for (let i = 0; i < NA; i++)
          for (let j = 0; j < NS; j++) {
            const q = i * (NS + 1) + j;
            const r = q + NS + 1;
            idx.push(q, r, q + 1, r, r + 1, q + 1);
          }
        const shell = new THREE.BufferGeometry();
        shell.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        shell.setIndex(idx);
        shell.computeVertexNormals();
        crown.add(mesh(shell, plateMat));
        const RN = 80;
        const rim = [];
        for (let i = 0; i <= RN; i++) {
          const a = lerp(a0, TAU - a0, i / RN);
          rim.push(onHeadRing(yE(a), a));
        }
        crown.add(mesh(strip(rim, rim.map(HN), i => 0.046 + 0.018 * smooth(a0 + 0.4, Math.PI, wa(lerp(a0, TAU - a0, i / RN))), () => 0.052), plateMat));
        {
          const t0 = Math.asin(0.24);
          const t1 = Math.PI - Math.asin(0.16);
          const K = 50;
          const pts = [];
          const hs = [];
          for (let k = 0; k <= K; k++) {
            const u = k / K;
            const th = lerp(t0, t1, u);
            const p = V3(0, Math.sin(th) * HH, Math.cos(th) * HD);
            pts.push(p.addScaledVector(HN(p), OFF - 0.006));
            hs.push(0.03 + 0.05 * Math.pow(Math.sin(Math.PI * u), 0.7));
          }
          crown.add(mesh(strip(pts, pts.map(HN), k => 0.026 * (1 - 0.5 * smooth(0.85, 1, Math.abs(k / K - 0.5) * 2)), k => hs[k], 0.5), plateMat));
        }
        const yB = a => lerp(0.5, 0.6, smooth(a0, a0 + 0.7, wa(a)));
        const band = [];
        for (let i = 0; i <= RN; i++) {
          const a = lerp(a0, TAU - a0, i / RN);
          band.push(hp(a, yB(a), OFF - 0.01));
        }
        crown.add(mesh(strip(band, band.map(HN), () => 0.04, () => 0.05), plateMat));
        const hs = [0.2, 0.3, 0.16, 0.36, 0.16, 0.3, 0.2];
        const sp = [];
        const gems = [];
        hs.forEach((h, i) => {
          const a = lerp(a0 + 0.55, TAU - a0 - 0.55, i / (hs.length - 1));
          const p = hp(a, yB(a) + 0.03, OFF + 0.02);
          const n = HN(p);
          sp.push(spike(p, V3(0, 1, 0).addScaledVector(n, 0.4), h, 0.05, 4));
          if (i % 2 === 0) gems.push(hp(a, yB(a) - 0.05, OFF + 0.06));
        });
        crown.add(mesh(mergeGeos(sp), plateMat));
        gems.push(hp(0, 0.2, OFF + 0.012));
        gems.forEach((p, i) => {
          const g = mesh(new THREE.OctahedronGeometry(i === gems.length - 1 ? 0.04 : 0.028, 0), hotMat, false);
          g.position.copy(p);
          crown.add(g);
        });
      }
      const crack = add(torso, new THREE.Group());
      {
        const paths = [
          [[0.3, 0.98], [0.42, 1.04], [0.5, 1.0], [0.62, 1.07], [0.72, 1.02]],
          [[0.26, 0.74], [0.36, 0.66], [0.33, 0.56], [0.45, 0.48], [0.5, 0.38]],
          [[-0.28, 0.8], [-0.38, 0.72], [-0.46, 0.78], [-0.58, 0.68]],
          [[0.45, 0.48], [0.58, 0.52], [0.66, 0.44]],
          [[-0.24, 0.98], [-0.3, 1.06], [-0.4, 1.08]]
        ];
        paths.forEach((pth, i) => {
          const dense = [];
          for (let j = 0; j < pth.length - 1; j++)
            for (let k = 0; k < 4; k++) {
              const f = k / 4;
              dense.push([lerp(pth[j][0], pth[j + 1][0], f), lerp(pth[j][1], pth[j + 1][1], f)]);
            }
          dense.push(pth[pth.length - 1]);
          const base = dense.map(([a, y]) => TP(a, y).addScaledVector(TN(a, y), 0.004));
          const top = dense.map(([a, y]) => TP(a, y).addScaledVector(TN(a, y), 0.012));
          const r0 = i < 2 ? 0.034 : 0.026;
          crack.add(mesh(tubeGeo(base, u => r0 * (1 - 0.6 * u), dense.length * 4, 6).g, pitMat));
          crack.add(mesh(tubeGeo(top, u => r0 * 0.6 * (1 - 0.6 * u), dense.length * 4, 6).g, hotMat, false));
        });
      }
      const cloak = add(socket, new THREE.Group());
      {
        cloak.position.set(0.0, 0.06, 0);
        cloak.rotation.z = -0.4;
        const hood = mesh(new THREE.SphereGeometry(0.22, 32, 12, 0, TAU, 0, Math.PI * 0.45), cloakMat);
        hood.scale.set(1, 0.7, 1.1);
        cloak.add(hood);
        const N = 11;
        const pos = [];
        const idx = [];
        let s5 = 3;
        const r5 = () => (s5 = (s5 * 16807) % 2147483647) / 2147483647;
        const R = 0.215;
        const M = 6;
        const lens = [];
        for (let i = 0; i <= N * 2; i++) lens.push(i % 2 ? 0.12 + r5() * 0.06 : 0.3 + r5() * 0.16);
        for (let i = 0; i <= N * 2; i++) {
          const a = (i / (N * 2)) * TAU;
          const L = lens[i];
          for (let j = 0; j <= M; j++) {
            const f = j / M;
            const rr = R * 1.02 + f * 0.06;
            pos.push(Math.cos(a) * rr, 0.02 - f * L, Math.sin(a) * rr * 1.1);
          }
        }
        for (let i = 0; i < N * 2; i++)
          for (let j = 0; j < M; j++) {
            const a = i * (M + 1) + j;
            const b = (i + 1) * (M + 1) + j;
            idx.push(a, b, a + 1, a + 1, b, b + 1);
          }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        cloak.add(mesh(g, cloakMat));
        const clasp = mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 16), plateMat);
        clasp.position.set(0.04, 0.08, 0.22);
        cloak.add(clasp);
      }
      const flames = [0, 1, 2].map(i => {
        const g = new THREE.Group();
        socket.add(g);
        K.parts.push(g);
        const m = mesh(dropGeo, ghostMat, false);
        m.rotation.x = Math.PI;
        g.add(m);
        g.position.set(0.02 + i * 0.05, 0.14, -0.08 + i * 0.08);
        return { g, i };
      });
      const tailWisp = add(tailTip, new THREE.Group());
      {
        const prof = [];
        for (let i = 0; i <= 12; i++) {
          const f = i / 12;
          prof.push(V2(0.075 * Math.sin(Math.PI * Math.pow(f, 0.55)) * (1 - f * 0.2), f * 0.42));
        }
        const lg = new THREE.LatheGeometry(prof, 18);
        const q = lg.attributes.position;
        for (let i = 0; i < q.count; i++) {
          const y = q.getY(i);
          q.setX(i, q.getX(i) + 0.12 * Math.pow(y / 0.42, 2));
        }
        lg.computeVertexNormals();
        const w = mesh(lg, ghostMat, false);
        w.rotation.x = Math.PI / 2;
        tailWisp.add(w);
        const r = mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 16), plateMat);
        tailWisp.add(r);
      }
      const reaper = new THREE.Mesh(bladeGeo, new THREE.MeshBasicMaterial({ color: 0xd0b0ff, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      reaper.visible = false;
      big.add(reaper);
      let dir = V3(0.1, 1, 0.1).normalize();
      const want = V3(0.1, 1, 0.1);
      let bdir = V3(0, 0, 1);
      const bwant = V3(0, 0, 1);
      let from = V3();
      let fdir = V3(0, 0, 1);
      let launched = false;
      return {
        customTail: true,
        set: on => {
          K.set(on);
          if (!on) reaper.visible = false;
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0xf0f0ff : 0x4a3a66);
          cloakMat.color.setHex(shiny ? 0x5a4a7a : 0x2a1f3a);
        },
        rest(S, t, motion) {
          S.hL.set(0.84, TIP + 0.72, 0.22).add(V3(0, Math.sin(t * 1.2 + 1.2) * 0.03 * motion, 0));
          want.set(0.05, 1, -0.12);
          bwant.set(0.85, 0, 0.55);
          S.hover += Math.sin(t * 1.6) * 0.03 * motion;
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.42, p));
            const reap = smooth(0.34, 0.5, p) * (1 - smooth(0.76, 0.95, p));
            S.hL.lerp(V3(0.95, TIP + 1.0, -0.15), wind);
            want.lerp(V3(0.6, 0.6, -0.5), wind);
            bwant.lerp(V3(0.3, 0, 1), wind);
            S.hL.lerp(V3(0.1, TIP + 0.95, 0.85), reap);
            want.lerp(V3(-0.9, 0.35, 0.3), reap);
            bwant.lerp(V3(0.1, -0.2, 1), reap);
            S.spinY += 0.35 * wind - 0.5 * reap;
            S.lean += -0.06 * wind + 0.14 * reap;
            S.trailK = p > 0.34 && p < 0.58 ? Math.sin(Math.PI * smooth(0.34, 0.58, p)) : 0;
            S.glow = 0.5 * wind + 0.8 * reap;
            S.impact = p > 0.44 && p < 0.6 ? 1 - smooth(0.44, 0.6, p) : 0;
            S.sparkK = p > 0.44 && p < 0.7 ? smooth(0.44, 0.7, p) : -1;
            S.mouthK = 0.6 * reap;
            return true;
          }
          if (nm === "fling") {
            const raise = smooth(0.04, 0.4, p) * (1 - smooth(0.44, 0.52, p));
            const reap = smooth(0.44, 0.56, p) * (1 - smooth(0.8, 0.98, p));
            S.hL.lerp(V3(0.6, TIP + 1.6, -0.1), raise);
            want.lerp(V3(0.1, 0.8, -0.6), raise);
            bwant.lerp(V3(0, 0.6, 0.8), raise);
            S.hL.lerp(V3(0.35, TIP + 1.0, 0.85), reap);
            want.lerp(V3(0.05, 0.05, 1), reap);
            bwant.lerp(V3(0, -1, 0.1), reap);
            S.hR.lerp(V3(-0.82, TIP + 1.2, 0.2), raise);
            S.hover += 0.22 * raise - 0.05 * reap;
            S.lean += -0.14 * raise + 0.28 * reap;
            S.glow = 1.3 * raise + 0.9 * reap;
            S.flash = 0.6 * raise + 0.7 * reap;
            S.waveK = p > 0.52 && p < 0.97 ? smooth(0.52, 0.97, p) : -1;
            S.impact = p > 0.52 && p < 0.7 ? 1 - smooth(0.52, 0.7, p) : 0;
            S.sparkK = p > 0.52 && p < 0.78 ? smooth(0.52, 0.78, p) : -1;
            S.headPitch += 0.15 * reap - 0.12 * raise;
            S.mouthK = 0.8 * reap;
            S.legK = 0.4 * raise;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(0.98, TIP + 0.95, 0.05), S.spinK);
            want.lerp(V3(1, 0.1, 0), S.spinK);
            bwant.lerp(V3(0, 0, 1), S.spinK);
          }
          if (nm === "jump") {
            S.hL.lerp(V3(0.85, TIP + 1.1, 0.2), S.air);
            want.lerp(V3(0.3, 1, 0.1), S.air);
          }
          return false;
        },
        arm(S, t, motion) {
          dir.lerp(want.clone().normalize(), 0.45).normalize();
          bdir.lerp(bwant.clone().normalize(), 0.45);
          const rad = u => lerp(0.125, 0.092, smooth(0.3, 0.9, u));
          const c = moltenArm(arm, shoulders[1], S.hL, t, motion, rad, 0.72);
          const z = dir.clone();
          let y = bdir.clone().addScaledVector(z, -bdir.dot(z));
          if (y.lengthSq() < 1e-4) y = V3(0, 0, 1).addScaledVector(z, -z.z);
          y.normalize();
          const x = y.clone().cross(z).normalize();
          scythe.position.copy(c.getPointAt(1)).addScaledVector(c.getTangentAt(1), 0.06);
          scythe.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
          wisps.forEach(W => {
            const u = (t / W.per + W.k * 0.31) % 1;
            W.m.position.set(Math.sin(W.k * 2.3) * 0.05 + Math.sin(t * 2 + W.k) * 0.03 * u, Math.cos(W.k * 1.7) * 0.05, W.z);
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(scythe.quaternion.clone().invert());
            W.m.position.addScaledVector(up, u * 0.3);
            const sc = (0.8 + 1.4 * u) * (1 - smooth(0.6, 1, u));
            W.m.scale.set(sc, sc * 1.6, sc);
            W.m.quaternion.setFromUnitVectors(V3(0, -1, 0), up);
          });
          scy.userData.frags.forEach(f => {
            const i = f.userData.i;
            f.position.copy(f.userData.base).add(V3(Math.sin(t * 1.7 + i * 2) * 0.05, Math.cos(t * 1.3 + i) * 0.05, Math.sin(t * 2.1 + i) * 0.02).multiplyScalar(motion));
            f.rotation.set(t * 0.8 + i, t * 0.6 + i * 2, 0);
          });
          flames.forEach(F => {
            const f = 1 + 0.25 * Math.sin(t * 7 + F.i * 2.1) * motion;
            F.g.scale.set(0.55 * (2 - f), (1.8 + 0.4 * F.i) * f, 0.55 * (2 - f));
          });
        },
        fx(S, nm) {
          scythe.updateMatrixWorld(true);
          const tip = big.worldToLocal(scy.localToWorld(V3(0, 0.83, SL - 1.0)));
          if (nm === "swipe")
            trail.forEach((a, i) => {
              a.position.copy(shoulders[1]).add(V3(-0.2, 0.15, 0));
              a.rotation.set(Math.PI / 2 - 0.55, 0, -0.6 + i * 0.05);
              a.scale.setScalar(1.6 + i * 0.06);
            });
          if (S.waveK >= 0 && !launched) {
            launched = true;
            from = big.worldToLocal(scy.localToWorld(V3(0, 0, SL)));
            const f = big.worldToLocal(bodyG.localToWorld(V3(0, 0, 1))).sub(big.worldToLocal(bodyG.localToWorld(V3(0, 0, 0))));
            f.y = 0;
            fdir = f.normalize();
          }
          if (S.waveK < 0) launched = false;
          reaper.visible = S.waveK >= 0;
          if (reaper.visible) {
            const k = S.waveK;
            reaper.position.copy(from).addScaledVector(fdir, 0.3 + k * 3.2);
            reaper.position.y = lerp(from.y, 0.6, smooth(0, 0.3, k));
            const side = V3(0, 1, 0).cross(fdir).normalize();
            reaper.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fdir, side, V3(0, 1, 0)));
            reaper.translateY(-0.42);
            reaper.translateZ(0.5);
            reaper.scale.setScalar(1.1 + k * 0.6);
            reaper.material.color.copy(trailMat.color).lerp(new THREE.Color(1, 1, 1), 0.35);
            reaper.material.opacity = 0.75 * (1 - smooth(0.6, 1, k));
          }
          return reaper.visible ? reaper.position.clone() : tip;
        },
        hide() {
          reaper.visible = false;
        }
      };
    })();

    const wingKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const fShape = new THREE.Shape();
      fShape.moveTo(0.016, 0);
      fShape.bezierCurveTo(0.07, 0.1, 0.09, 0.45, 0.06, 0.78);
      fShape.quadraticCurveTo(0.04, 0.93, 0, 1);
      fShape.quadraticCurveTo(-0.1, 0.9, -0.15, 0.74);
      fShape.lineTo(-0.105, 0.7);
      fShape.quadraticCurveTo(-0.17, 0.56, -0.16, 0.42);
      fShape.lineTo(-0.11, 0.38);
      fShape.quadraticCurveTo(-0.13, 0.16, -0.016, 0);
      fShape.lineTo(0.016, 0);
      const fGeo = (() => {
        const g = new THREE.ExtrudeGeometry(fShape, { depth: 0.024, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2, curveSegments: 18 });
        g.translate(0, 0, -0.012);
        const q = g.attributes.position;
        for (let i = 0; i < q.count; i++) {
          const x = q.getX(i);
          const y = q.getY(i);
          q.setZ(i, q.getZ(i) * lerp(1, 0.3, smooth(0, 0.12, Math.abs(x))) + 0.05 * x * x * 4);
          q.setX(i, x - 0.07 * y * y);
        }
        g.computeVertexNormals();
        return g;
      })();
      const rachisGeo = tubeGeo([V3(0, -0.02, 0), V3(-0.002, 0.3, 0.004), V3(-0.02, 0.6, 0.004), V3(-0.063, 0.95, 0)], u => lerp(0.017, 0.004, u), 24, 6).g;
      const feather = (bm, rm) => {
        const g = new THREE.Group();
        g.add(mesh(fGeo, bm));
        g.add(mesh(rachisGeo, rm, false));
        return g;
      };
      const place = (g, at, d, n, L, wx = 1) => {
        const y = d.clone().normalize();
        const z = n.clone().addScaledVector(y, -n.dot(y)).normalize();
        const x = y.clone().cross(z);
        g.position.copy(at);
        g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
        g.scale.set(L * wx, L, L);
      };
      const W = 1.0;
      const prim = [1.05, 1.0, 0.93, 0.85, 0.76, 0.67].map(L => ({ g: add(bodyG, feather(plateMat, hotMat)), L: L * W }));
      const sec = [0.62, 0.6, 0.58, 0.56, 0.54, 0.52, 0.5, 0.48].map((L, i, a) => ({ g: add(bodyG, feather(plateMat, hotMat)), L: L * W, u: lerp(0.94, 0.42, i / (a.length - 1)) }));
      const cov = [0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44].map((u, i) => ({ g: add(bodyG, feather(castMat, darkSteel)), L: 0.32 - i * 0.014, u }));
      const cuff = add(bodyG, mesh(new THREE.TorusGeometry(1, 0.2, 8, 28), castMat));
      const knob = add(bodyG, mesh(new THREE.SphereGeometry(0.085, 18, 14), castMat));
      const plume = add(head, new THREE.Group());
      [[0.75, 0.4, 0], [1.05, 0.52, 0.022], [1.35, 0.6, -0.022], [1.65, 0.52, 0.03], [1.95, 0.42, -0.03]].forEach(([th, L, x], i) => {
        const p = V3(x, Math.sin(th) * HH, Math.cos(th) * HD);
        const n = HN(p);
        const back = V3(0, Math.sin(th + Math.PI / 2), Math.cos(th + Math.PI / 2));
        const d = back.clone().multiplyScalar(0.75).addScaledVector(n, 0.66).add(V3(0, 0.1, 0));
        const f = feather(plateMat, hotMat);
        place(f, p.clone().addScaledVector(n, -0.02), d, V3(1, 0, 0).add(V3(x * 4, 0, 0)), L, 1.2);
        plume.add(f);
      });
      [-1, 1].forEach(sg => {
        [[1.0, 0.42, 0.55], [1.45, 0.36, 0.7]].forEach(([th, L, sx]) => {
          const p = onHeadRing(Math.sin(th) * 0.92, sg * (Math.PI / 2 - 0.25 + (th - 1) * 0.6));
          const n = HN(p);
          const d = V3(sg * sx, 0.7, -1);
          const f = feather(plateMat, hotMat);
          place(f, p.addScaledVector(n, -0.01), d, V3(sg, 0.4, 0.4).cross(d).cross(d).negate(), L, 1.2);
          plume.add(f);
        });
      });
      const scap = add(bodyG, new THREE.Group());
      [-1, 1].forEach(sg => {
        const base = shoulders[sg > 0 ? 1 : 0].clone().add(V3(sg * 0.02, 0.1, -0.02));
        [[-0.55, 0.36], [-0.15, 0.44], [0.25, 0.4], [0.62, 0.32]].forEach(([a, L], i) => {
          const d = V3(sg * 0.7, -1, 0).normalize().applyAxisAngle(V3(sg, 0, 0), a * 0.9).add(V3(0, 0, a * 0.25));
          const out = V3(sg, 0.5, 0).normalize();
          const f = feather(moltenMat, plateMat);
          place(f, base.clone().add(V3(0, 0.02 * i, a * 0.12)), d, out, L, 1.6);
          scap.add(f);
        });
      });
      const ruff = add(torso, new THREE.Group());
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        const y = 1.15;
        const p = TP(a, y);
        const n = TN(a, y);
        const down = TP(a, y - 0.08).sub(TP(a, y));
        const f = feather(plateMat, darkSteel);
        place(f, p.addScaledVector(n, 0.012 + (i % 2) * 0.012), down, n, 0.16 + (i % 2) * 0.02, 2.3);
        ruff.add(f);
      }
      const fan = add(tailTip, new THREE.Group());
      {
        [-0.62, -0.31, 0, 0.31, 0.62].forEach((a, i) => {
          const d = V3(Math.sin(a), 0.12, Math.cos(a));
          const f = feather(plateMat, hotMat);
          place(f, V3(0, 0.004 * (2 - Math.abs(i - 2)), -0.02), d, V3(0, 1, 0), 0.46 - Math.abs(a) * 0.12);
          fan.add(f);
        });
        fan.add(mesh(new THREE.SphereGeometry(0.05, 14, 10), castMat));
      }
      const darts = Array.from({ length: 5 }, (_, i) => {
        const g = feather(plateMat, hotMat);
        const st = new THREE.Mesh(new THREE.ConeGeometry(0.06, 1.2, 8, 1, true), trailMat);
        st.position.y = -0.55;
        st.rotation.z = Math.PI;
        g.add(st);
        g.visible = false;
        big.add(g);
        return { g, i, a: (i - 2) * 0.16, h: (i % 2 ? 0.08 : -0.04) };
      });
      let open = 0.15;
      const openW = { v: 0.15 };
      const nrm = V3(1, 0, 0.15).normalize();
      const nwant = V3(1, 0, 0.15);
      let from = V3();
      let fdir = V3(0, 0, 1);
      let launched = false;
      let tipBig = V3();
      return {
        customTail: true,
        set: on => {
          K.set(on);
          if (!on) darts.forEach(d => (d.g.visible = false));
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0xf4e2a8 : 0x9aa6d0);
        },
        rest(S, t, motion) {
          S.hL.set(0.98, TIP + 0.78, 0.02).add(V3(0, Math.sin(t * 1.4 + 1.2) * 0.02 * motion, 0));
          nwant.set(0.15, 0, -1);
          openW.v = 0.3 + 0.04 * Math.sin(t * 1.1) * motion;
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.42, p));
            const cut = smooth(0.34, 0.48, p) * (1 - smooth(0.76, 0.95, p));
            S.hL.lerp(V3(1.0, TIP + 1.15, -0.45), wind);
            nwant.lerp(V3(0.1, 0.35, -1), wind);
            S.hL.lerp(V3(0.15, TIP + 0.98, 0.95), cut);
            nwant.lerp(V3(0, 1, 0.6), cut);
            openW.v = lerp(openW.v, 1, Math.max(wind, cut));
            S.spinY += 0.35 * wind - 0.5 * cut;
            S.lean += -0.06 * wind + 0.14 * cut;
            S.trailK = p > 0.34 && p < 0.58 ? Math.sin(Math.PI * smooth(0.34, 0.58, p)) : 0;
            S.glow = 0.5 * wind + 0.8 * cut;
            S.impact = p > 0.44 && p < 0.6 ? 1 - smooth(0.44, 0.6, p) : 0;
            S.sparkK = p > 0.44 && p < 0.7 ? smooth(0.44, 0.7, p) : -1;
            S.mouthK = 0.6 * cut;
            return true;
          }
          if (nm === "fling") {
            const raise = smooth(0.04, 0.38, p) * (1 - smooth(0.42, 0.5, p));
            const flap = smooth(0.42, 0.52, p) * (1 - smooth(0.8, 0.98, p));
            S.hL.lerp(V3(0.78, TIP + 1.85, -0.2), raise);
            nwant.lerp(V3(0.1, 0.25, 1), raise);
            S.hL.lerp(V3(0.62, TIP + 0.75, 0.75), flap);
            nwant.lerp(V3(0, 0.7, 1), flap);
            openW.v = lerp(openW.v, 1, Math.max(raise, flap));
            S.hR.lerp(V3(-0.82, TIP + 1.2, 0.2), raise);
            S.hover += 0.22 * raise - 0.04 * flap;
            S.lean += -0.14 * raise + 0.26 * flap;
            S.glow = 1.3 * raise + 0.9 * flap;
            S.flash = 0.6 * raise + 0.7 * flap;
            S.waveK = p > 0.46 && p < 0.97 ? smooth(0.46, 0.97, p) : -1;
            S.impact = p > 0.46 && p < 0.64 ? 1 - smooth(0.46, 0.64, p) : 0;
            S.sparkK = p > 0.46 && p < 0.74 ? smooth(0.46, 0.74, p) : -1;
            S.headPitch += 0.12 * flap - 0.12 * raise;
            S.mouthK = 0.8 * flap;
            S.legK = 0.4 * raise;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(1.02, TIP + 0.98, 0.0), S.spinK);
            nwant.lerp(V3(0, 0.5, 1), S.spinK);
            openW.v = lerp(openW.v, 1, S.spinK);
          }
          if (nm === "jump") {
            S.hL.lerp(V3(0.95, TIP + 1.45, -0.15), S.air);
            nwant.lerp(V3(0.2, 0.2, -1), S.air);
            openW.v = lerp(openW.v, 0.9, S.air);
          }
          return false;
        },
        arm(S, t, motion) {
          nrm.lerp(nwant.clone().normalize(), 0.4).normalize();
          open = lerp(open, openW.v, 0.4);
          const rad = u => lerp(0.125, 0.075, smooth(0.3, 0.95, u));
          const c = moltenArm(arm, shoulders[1], S.hL, t, motion, rad, 0.7);
          const end = c.getPointAt(1);
          const z = c.getTangentAt(1);
          let n = nrm.clone().addScaledVector(z, -nrm.dot(z));
          if (n.lengthSq() < 1e-4) n = V3(1, 0, 0).addScaledVector(z, -z.x);
          n.normalize();
          const tr = n.clone().cross(z).normalize();
          const fl = Math.sin(t * 2.2) * 0.03 * motion;
          prim.forEach((P, i) => {
            const f = i / (prim.length - 1);
            const th = lerp(lerp(0.5, 0.1, open), lerp(1.0, 1.6, open), f) + fl * f;
            const d = z.clone().multiplyScalar(Math.cos(th)).addScaledVector(tr, Math.sin(th));
            place(P.g, end.clone().addScaledVector(tr, 0.04 * f).addScaledVector(n, 0.012 * (prim.length - i)), d, n, P.L);
          });
          sec.forEach((P, i) => {
            const tg = c.getTangentAt(P.u);
            const nn = n.clone().addScaledVector(tg, -n.dot(tg)).normalize();
            const tu = nn.clone().cross(tg).normalize();
            const a = lerp(1.15, 0.2, open) + 0.05 * i;
            const d = tu.clone().multiplyScalar(Math.cos(a)).addScaledVector(tg, Math.sin(a));
            place(P.g, c.getPointAt(P.u).addScaledVector(nn, -0.03 - 0.006 * i), d, nn, P.L);
          });
          cov.forEach(P => {
            const tg = c.getTangentAt(P.u);
            const nn = n.clone().addScaledVector(tg, -n.dot(tg)).normalize();
            const tu = nn.clone().cross(tg).normalize();
            const d = tu.clone().multiplyScalar(0.5).addScaledVector(tg, 0.85);
            place(P.g, c.getPointAt(P.u).addScaledVector(nn, 0.07).addScaledVector(tu, 0.02), d, nn, P.L);
          });
          cuff.position.copy(c.getPointAt(0.93));
          cuff.quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(0.93));
          cuff.scale.setScalar(rad(0.93) + 0.008);
          knob.position.copy(end);
          const P0 = prim[0];
          tipBig = big.worldToLocal(bodyG.localToWorld(P0.g.position.clone().addScaledVector(V3(0, 1, 0).applyQuaternion(P0.g.quaternion), P0.L * 0.9)));
        },
        fx(S, nm) {
          if (nm === "swipe")
            trail.forEach((a, i) => {
              a.position.copy(shoulders[1]).add(V3(-0.2, 0.0, 0));
              a.rotation.set(Math.PI / 2 - 0.1, 0, -0.4 + i * 0.05);
              a.scale.setScalar(1.75 + i * 0.06);
            });
          if (S.waveK >= 0 && !launched) {
            launched = true;
            from = big.worldToLocal(bodyG.localToWorld(knob.position.clone()));
            const f = big.worldToLocal(bodyG.localToWorld(V3(0, 0, 1))).sub(big.worldToLocal(bodyG.localToWorld(V3(0, 0, 0))));
            f.y = 0;
            fdir = f.normalize();
          }
          if (S.waveK < 0) launched = false;
          darts.forEach(D => {
            const k = S.waveK >= 0 ? S.waveK * 1.15 - D.i * 0.03 : -1;
            D.g.visible = k > 0 && k < 1;
            if (!D.g.visible) return;
            const dir = fdir.clone().applyAxisAngle(V3(0, 1, 0), D.a);
            const at = from.clone().lerp(V3(from.x, 1.15 + D.h, from.z), smooth(0, 0.12, k)).addScaledVector(dir, 0.2 + k * 3.4);
            const side = V3(0, 1, 0).cross(dir).normalize();
            place(D.g, at, dir, V3(0, 1, 0).applyAxisAngle(dir, k * 10 + D.i), 0.62 * (1 - smooth(0.85, 1, k)) + 0.001);
            D.g.position.addScaledVector(dir, -0.25).addScaledVector(side, 0);
          });
          const vis = darts.find(d => d.g.visible);
          return vis ? vis.g.position.clone() : tipBig;
        },
        hide() {
          darts.forEach(d => (d.g.visible = false));
        }
      };
    })();

    const clawKit = (() => {
      const K = makeKit();
      const { add } = K;
      const arm = dyn(moltenMat);
      K.parts.push(arm);
      const shadeMat = new THREE.MeshStandardMaterial({ color: 0x120c18, roughness: 0.35, metalness: 0.6 });
      const slitMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const tShape = new THREE.Shape();
      tShape.moveTo(-0.13, 0);
      tShape.bezierCurveTo(-0.12, 0.45, 0.1, 0.86, 0.56, 0.96);
      tShape.bezierCurveTo(0.3, 0.7, 0.14, 0.42, 0.13, 0);
      tShape.lineTo(-0.13, 0);
      const talonGeo = (() => {
        const g = new THREE.ExtrudeGeometry(tShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.012, bevelSegments: 2, curveSegments: 24 });
        g.translate(0, 0, -0.05);
        const q = g.attributes.position;
        for (let i = 0; i < q.count; i++) q.setZ(i, q.getZ(i) * lerp(1, 0.2, smooth(0, 1, Math.hypot(q.getX(i), q.getY(i)))));
        g.computeVertexNormals();
        return g;
      })();
      const edgeGeo = tubeGeo(new THREE.CubicBezierCurve(V2(0.54, 0.95), V2(0.3, 0.7), V2(0.14, 0.42), V2(0.134, 0.02)).getPoints(30).map(p => V3(p.x + 0.012, p.y, 0)), u => 0.022 * Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.03)), 50, 6).g;
      const talon = (bm, em) => {
        const g = new THREE.Group();
        g.add(mesh(talonGeo, bm));
        g.add(mesh(edgeGeo, em, false));
        return g;
      };
      const CL = 0.95;
      const claws = add(bodyG, new THREE.Group());
      {
        const fist = mesh(new THREE.SphereGeometry(0.17, 24, 18), castMat);
        fist.scale.set(1.25, 1.05, 1.6);
        fist.position.y = -0.02;
        claws.add(fist);
        [[-0.15, 0.9, -0.15], [0, 1.04, 0], [0.15, 0.88, 0.15]].forEach(([z, L, sp]) => {
          const t = talon(shadeMat, slitMat);
          t.position.set(-0.02, 0.06, z);
          t.rotation.x = sp * 0.9;
          t.scale.setScalar(L * CL);
          claws.add(t);
          const col = mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 20), plateMat);
          col.position.set(-0.01, 0.08, z * 1.05);
          col.rotation.x = Math.PI / 2 + sp * 0.9;
          col.scale.set(1.2, 0.8, 1);
          claws.add(col);
        });
        const dew = talon(shadeMat, slitMat);
        dew.position.set(-0.12, -0.02, 0);
        dew.rotation.z = Math.PI * 0.62;
        dew.scale.setScalar(0.42);
        claws.add(dew);
      }
      const grips = [0.62, 0.84].map(() => add(bodyG, mesh(new THREE.TorusGeometry(1, 0.2, 8, 28), plateMat)));
      const spurs = [0.5, 0.66, 0.8].map((u, i) => ({ m: add(bodyG, mesh(new THREE.ConeGeometry(0.045 - i * 0.006, 0.26 - i * 0.04, 5), shadeMat)), u }));
      let s7 = 11;
      const r7 = () => (s7 = (s7 * 16807) % 2147483647) / 2147483647;
      const armor = add(torso, new THREE.Group());
      {
        const cv = document.createElement("canvas");
        cv.width = 256;
        cv.height = 256;
        const cx = cv.getContext("2d");
        let s8 = 5;
        const r8 = () => (s8 = (s8 * 16807) % 2147483647) / 2147483647;
        const blob = (x, y, r, a) => {
          const gr = cx.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, "rgba(14,8,18," + a + ")");
          gr.addColorStop(1, "rgba(14,8,18,0)");
          cx.fillStyle = gr;
          cx.beginPath();
          cx.arc(x, y, r, 0, TAU);
          cx.fill();
        };
        const lg = cx.createLinearGradient(0, 0, 256, 0);
        lg.addColorStop(0, "rgba(14,8,18,0)");
        lg.addColorStop(0.1, "rgba(14,8,18,0.92)");
        lg.addColorStop(0.9, "rgba(14,8,18,0.92)");
        lg.addColorStop(1, "rgba(14,8,18,0)");
        cx.fillStyle = lg;
        cx.fillRect(0, 0, 256, 200);
        const vg = cx.createLinearGradient(0, 120, 0, 230);
        vg.addColorStop(0, "rgba(14,8,18,0.92)");
        vg.addColorStop(1, "rgba(14,8,18,0)");
        cx.fillStyle = vg;
        cx.fillRect(60, 120, 150, 110);
        cx.globalCompositeOperation = "destination-out";
        for (let i = 0; i < 90; i++) {
          const edge = r8() < 0.5;
          const x = edge ? (r8() < 0.5 ? r8() * 18 : 236 + r8() * 20) : 30 + r8() * 200;
          const y = edge ? r8() * 210 : 160 + r8() * 70;
          blob(x, y, 6 + r8() * 14, 1);
        }
        cx.globalCompositeOperation = "source-over";
        for (let i = 0; i < 40; i++) blob(70 + r8() * 130, 20 + r8() * 160, 10 + r8() * 20, 0.6);
        cx.lineCap = "round";
        for (let i = 0; i < 12; i++) {
          let x = 128 + (r8() - 0.5) * 150;
          let y = 120 + r8() * 60;
          const dx = (x - 128) / 50;
          cx.strokeStyle = "rgba(14,8,18,0.92)";
          for (let k = 0; k < 12; k++) {
            const nx = x + dx * 6 + (r8() - 0.5) * 14;
            const ny = y + 6 + r8() * 6;
            cx.lineWidth = Math.max(1, 6 - k * 0.45);
            cx.beginPath();
            cx.moveTo(x, y);
            cx.lineTo(nx, ny);
            cx.stroke();
            x = nx;
            y = ny;
          }
        }
        for (let i = 0; i < 6; i++) {
          let x = r8() < 0.5 ? 26 : 218;
          let y = 20 + r8() * 140;
          const dx = x < 128 ? -1 : 1;
          for (let k = 0; k < 10; k++) {
            const nx = x + dx * (5 + r8() * 5);
            const ny = y + (r8() - 0.5) * 12;
            cx.lineWidth = Math.max(1, 5 - k * 0.45);
            cx.beginPath();
            cx.moveTo(x, y);
            cx.lineTo(nx, ny);
            cx.stroke();
            x = nx;
            y = ny;
          }
        }
        const tex = new THREE.CanvasTexture(cv);
        const NA = 48;
        const NY = 36;
        const pos = [];
        const uv = [];
        const idx = [];
        for (let i = 0; i <= NA; i++)
          for (let j = 0; j <= NY; j++) {
            const aa = lerp(-0.4, Math.PI + 0.4, i / NA);
            const y = lerp(1.2, 0.2, j / NY);
            pos.push(...TP(aa, y).addScaledVector(TN(aa, y), 0.004).toArray());
            uv.push(i / NA, 1 - j / NY);
          }
        for (let i = 0; i < NA; i++)
          for (let j = 0; j < NY; j++) {
            const q = i * (NY + 1) + j;
            const r = q + NY + 1;
            idx.push(q, q + 1, r, r, q + 1, r + 1);
          }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
        g.computeVertexNormals();
        const stainMat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, roughness: 0.45, metalness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
        armor.add(mesh(g, stainMat, false));
        const sh = new THREE.Shape();
        sh.moveTo(-0.075, 0.05);
        sh.lineTo(0.075, 0.05);
        sh.lineTo(0.058, -0.06);
        sh.lineTo(0, -0.17);
        sh.lineTo(-0.058, -0.06);
        sh.lineTo(-0.075, 0.05);
        const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 });
        const list = [];
        for (let y = 1.1; y > 0.4; y -= 0.085) {
          for (let a = 0.3; a < 2.9; a += 0.17) {
            const ac = a + (Math.round((y - 0.4) / 0.085) % 2) * 0.085;
            const d = Math.hypot((ac - 1.6) / 1.05, (y - 1.02) / 0.5);
            if (d > 1 + (r7() - 0.5) * 0.35) continue;
            const p = TP(ac, y);
            const n = TN(ac, y);
            const up = TP(ac, y + 0.04).sub(p).normalize();
            const x = up.clone().cross(n).normalize();
            const g = sg.clone();
            const k = 0.85 + r7() * 0.45;
            g.scale(k, k, 1);
            g.rotateZ((r7() - 0.5) * 0.25);
            g.applyMatrix4(new THREE.Matrix4().makeBasis(x, up, n));
            const at = p.addScaledVector(n, 0.006 + (y - 0.4) * 0.03);
            g.translate(at.x, at.y, at.z);
            list.push(g);
          }
        }
        armor.add(mesh(mergeGeos(list), plateMat));
        const sp = [];
        [[1.45, 1.02, 0.3], [1.85, 0.95, 0.24], [1.2, 0.86, 0.18], [2.15, 0.82, 0.2], [1.65, 0.78, 0.16], [2.4, 0.98, 0.14], [0.95, 1.0, 0.14]].forEach(([a, y, L]) => {
          const p = TP(a, y);
          const n = TN(a, y);
          sp.push(spike(p.clone().addScaledVector(n, 0.01), n.clone().add(V3(0, 0.45, 0)), L, L * 0.2, 5));
          sp.push(spike(p.clone().addScaledVector(n, 0.01).add(V3(0.0, -0.04, 0.03)), n.clone().add(V3(0.3, 0.1, 0.4)), L * 0.55, L * 0.14, 5));
        });
        armor.add(mesh(mergeGeos(sp), shadeMat));
        const paths = [
          [[0.62, 0.98], [0.48, 0.92], [0.36, 0.98], [0.18, 0.9], [0.04, 0.95]],
          [[0.58, 0.72], [0.44, 0.64], [0.4, 0.52], [0.26, 0.44]],
          [[0.48, 0.92], [0.4, 0.8], [0.28, 0.76]],
          [[2.6, 0.92], [2.78, 0.86], [2.9, 0.94], [3.05, 0.88]],
          [[2.55, 0.62], [2.72, 0.54], [2.86, 0.58]]
        ];
        paths.forEach((pth, i) => {
          const dense = [];
          for (let j = 0; j < pth.length - 1; j++)
            for (let k = 0; k < 4; k++) dense.push([lerp(pth[j][0], pth[j + 1][0], k / 4), lerp(pth[j][1], pth[j + 1][1], k / 4)]);
          dense.push(pth[pth.length - 1]);
          const base = dense.map(([a, y]) => TP(a, y).addScaledVector(TN(a, y), 0.004));
          const top = dense.map(([a, y]) => TP(a, y).addScaledVector(TN(a, y), 0.012));
          const r0 = i < 2 ? 0.032 : 0.024;
          armor.add(mesh(tubeGeo(base, u => r0 * (1 - 0.6 * u), dense.length * 4, 6).g, pitMat));
          armor.add(mesh(tubeGeo(top, u => r0 * 0.55 * (1 - 0.6 * u), dense.length * 4, 6).g, hotMat, false));
        });
      }
      const paul = add(socket, new THREE.Group());
      {
        paul.position.set(0.02, 0.05, 0);
        paul.rotation.z = -0.4;
        const shell = mesh(new THREE.SphereGeometry(0.21, 32, 14, 0, TAU, 0, Math.PI * 0.46), plateMat);
        shell.scale.set(1, 0.75, 1.12);
        paul.add(shell);
        const rim = mesh(new THREE.TorusGeometry(0.21 * Math.sin(Math.PI * 0.46), 0.016, 8, 40), shadeMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.21 * Math.cos(Math.PI * 0.46) * 0.75;
        rim.scale.set(1, 1.12, 1);
        paul.add(rim);
        [[0.0, 0.42, 0.34], [-0.55, 0.32, 0.26], [0.55, 0.32, 0.26]].forEach(([zz, L, r]) => {
          const b = V3(0.02, 0.12, zz * 0.2);
          const pts = [b, b.clone().add(V3(0.04, L * 0.45, -0.04 + zz * 0.08)), b.clone().add(V3(0.0, L * 0.85, -0.16 + zz * 0.14)), b.clone().add(V3(-0.08, L, -0.32 + zz * 0.16))];
          paul.add(mesh(tubeGeo(pts, u => lerp(r * 0.2, 0.004, Math.pow(u, 0.8)), 24, 8).g, shadeMat));
        });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          const p = V3(Math.cos(a) * 0.19, 0.02, Math.sin(a) * 0.21);
          paul.add(mesh(spike(p, V3(Math.cos(a), -0.25, Math.sin(a)), 0.09, 0.022, 4), shadeMat));
        }
      }
      const mask = add(head, new THREE.Group());
      {
        const RO = 0.92;
        const IC = -0.34;
        const RI = 0.86;
        const NY = 40;
        const NX = 10;
        const pos = [];
        const idx = [];
        const xin = y => Math.max(0.02, IC + Math.sqrt(Math.max(0, RI * RI - y * y)));
        const xout = y => Math.sqrt(Math.max(0, RO * RO - y * y));
        let ylim = 0;
        for (let y = 0; y < RO; y += 0.002) if (xout(y) > xin(y) + 0.02) ylim = y;
        const off = 0.02;
        for (let j = 0; j <= NY; j++) {
          const y = lerp(-ylim, ylim * 1.02, j / NY);
          for (let i = 0; i <= NX; i++) {
            const x = lerp(xin(y), Math.max(xin(y), xout(y)), i / NX);
            const p = HP(x, y);
            pos.push(...p.addScaledVector(HN(p), off).toArray());
          }
        }
        for (let j = 0; j < NY; j++)
          for (let i = 0; i < NX; i++) {
            const a = j * (NX + 1) + i;
            const b = a + NX + 1;
            idx.push(a, a + 1, b, b, a + 1, b + 1);
          }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        mask.add(mesh(g, plateMat));
        const edge = [];
        for (let j = 0; j <= NY; j++) {
          const y = lerp(-ylim, ylim * 1.02, j / NY);
          edge.push(HP(xin(y), y));
        }
        for (let j = NY; j >= 0; j--) {
          const y = lerp(-ylim, ylim * 1.02, j / NY);
          edge.push(HP(xout(y), y));
        }
        mask.add(mesh(strip(edge, edge.map(HN), () => 0.014, () => off + 0.016), shadeMat));
        const ep = HP(0.36, -0.02);
        const slit = mesh(new THREE.SphereGeometry(1, 16, 8), slitMat, false);
        slit.position.copy(ep).addScaledVector(HN(ep), off + 0.006);
        slit.quaternion.setFromUnitVectors(V3(0, 0, 1), HN(ep));
        slit.rotateZ(0.32);
        slit.scale.set(0.085, 0.022, 0.012);
        mask.add(slit);
        const hole = mesh(new THREE.SphereGeometry(1, 16, 8), shadeMat, false);
        hole.position.copy(ep).addScaledVector(HN(ep), off + 0.001);
        hole.quaternion.copy(slit.quaternion);
        hole.scale.set(0.11, 0.045, 0.012);
        mask.add(hole);
      }
      const tailClaw = add(tailTip, new THREE.Group());
      {
        [[-0.6, 0.38], [0, 0.44], [0.6, 0.38]].forEach(([a, L]) => {
          const t = talon(shadeMat, slitMat);
          t.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(0, -1, 0), V3(Math.sin(a) * 0.5, 0.15, 1).normalize(), V3(0, -1, 0).cross(V3(Math.sin(a) * 0.5, 0.15, 1).normalize())));
          t.position.set(Math.sin(a) * 0.04, 0.02, 0);
          t.scale.setScalar(L);
          tailClaw.add(t);
        });
        tailClaw.add(mesh(new THREE.SphereGeometry(0.06, 14, 10), castMat));
      }
      const smokeTex = (() => {
        const cv = document.createElement("canvas");
        cv.width = 64;
        cv.height = 64;
        const cx = cv.getContext("2d");
        let s9 = 3;
        const r9 = () => (s9 = (s9 * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 14; i++) {
          const x = 32 + (r9() - 0.5) * 22;
          const y = 32 + (r9() - 0.5) * 22;
          const r = 10 + r9() * 12;
          const gr = cx.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, "rgba(255,255,255,0.35)");
          gr.addColorStop(1, "rgba(255,255,255,0)");
          cx.fillStyle = gr;
          cx.beginPath();
          cx.arc(x, y, r, 0, TAU);
          cx.fill();
        }
        return new THREE.CanvasTexture(cv);
      })();
      const smoke = add(bodyG, new THREE.Group());
      let s10 = 17;
      const r10 = () => (s10 = (s10 * 16807) % 2147483647) / 2147483647;
      const eyeAt = HP(0.36, -0.02).addScaledVector(HN(HP(0.36, -0.02)), 0.03);
      const puffs = Array.from({ length: 42 }, (_, i) => {
        const eye = i >= 34;
        const ember = eye || i % 7 === 0;
        const m = new THREE.SpriteMaterial({ map: smokeTex, color: ember ? 0x5a0a18 : 0x140a1a, transparent: true, depthWrite: false, opacity: 0 });
        const sp = new THREE.Sprite(m);
        smoke.add(sp);
        return { sp, m, ph: r10(), sp0: eye ? 0.07 + r10() * 0.04 : 0.18 + r10() * 0.12, last: 1, o: V3(), d: V3(), rot: r10() * TAU, ember, eye, claw: !eye && i % 2 === 0 };
      });
      const smokeFrom = P => {
        if (P.eye) {
          P.o.copy(bodyG.worldToLocal(head.localToWorld(eyeAt.clone())));
          P.d.set(0.25 + r10() * 0.1, 0.12 + r10() * 0.1, -0.45 - r10() * 0.2);
          P.rot = r10() * TAU;
          return;
        }
        if (P.claw) {
          const k = Math.floor(r10() * 3);
          const u = 0.25 + r10() * 0.7;
          const loc = V3((k - 1) * 0.0 + 0.3 * u * u, 0.1 + u * 0.85, (k - 1) * 0.15).multiplyScalar(CL);
          P.o.copy(loc.applyQuaternion(claws.quaternion).add(claws.position));
        } else {
          const r = r10();
          if (r < 0.35) P.o.copy(shoulders[1]).add(V3((r10() - 0.3) * 0.25, 0.1 + r10() * 0.15, (r10() - 0.5) * 0.3));
          else {
            const a = 0.5 + r10() * 2.2;
            const y = 0.55 + r10() * 0.55;
            P.o.copy(TP(a, y).addScaledVector(TN(a, y), 0.05)).add(V3(0, TIP, 0));
          }
        }
        P.d.set((r10() - 0.5) * 0.25, 0.55 + r10() * 0.35, (r10() - 0.5) * 0.25 - 0.1);
        P.rot = r10() * TAU;
      };
      const markGeo = (() => {
        const sh = new THREE.Shape();
        sh.absarc(0, 0, 0.62, -1.0, 1.0, false);
        sh.absarc(0.08, 0, 0.56, 1.06, -1.06, true);
        return new THREE.ShapeGeometry(sh, 40);
      })();
      const markDark = new THREE.MeshBasicMaterial({ color: 0x0c0612, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
      const markGlow = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const marks = [0, 1, 2].map(i => {
        const g = new THREE.Group();
        const d = new THREE.Mesh(markGeo, markDark);
        g.add(d);
        const gl = new THREE.Mesh(markGeo, markGlow);
        gl.scale.set(0.97, 0.7, 1);
        gl.position.z = 0.002;
        g.add(gl);
        g.visible = false;
        big.add(g);
        return { g, i };
      });
      let fwd = V3(0, 0, 1);
      const want = V3(0, 0, 1);
      let curl = V3(0, -1, 0);
      const cwant = V3(0, -1, 0);
      let from = V3();
      let fdir = V3(0, 0, 1);
      let launched = false;
      let tipBig = V3();
      return {
        customTail: true,
        halfBrow: true,
        set: on => {
          K.set(on);
          eyes[1].g.visible = !on;
          if (!on) marks.forEach(m => (m.g.visible = false));
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0xcfc6da : 0x2e2636);
          shadeMat.color.setHex(shiny ? 0x8a7a9e : 0x120c18);
        },
        rest(S, t, motion) {
          S.hL.set(0.9, TIP + 0.92, 0.32).add(V3(0, Math.sin(t * 1.4 + 1.2) * 0.02 * motion, 0));
          want.set(0.3, -0.05, 1);
          cwant.set(0.2, -1, 0.2);
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.42, p));
            const rip = smooth(0.34, 0.46, p) * (1 - smooth(0.74, 0.95, p));
            S.hL.lerp(V3(0.95, TIP + 1.55, -0.2), wind);
            want.lerp(V3(0.1, 1, -0.3), wind);
            cwant.lerp(V3(-0.3, 0.2, 1), wind);
            S.hL.lerp(V3(0.1, TIP + 0.95, 0.95), rip);
            want.lerp(V3(-0.75, -0.15, 0.6), rip);
            cwant.lerp(V3(-0.2, -1, -0.4), rip);
            S.spinY += 0.3 * wind - 0.45 * rip;
            S.lean += -0.08 * wind + 0.18 * rip;
            S.trailK = p > 0.34 && p < 0.58 ? Math.sin(Math.PI * smooth(0.34, 0.58, p)) : 0;
            S.markK = p > 0.4 && p < 0.8 ? smooth(0.4, 0.8, p) : -1;
            S.glow = 0.5 * wind + 0.8 * rip;
            S.impact = p > 0.43 && p < 0.6 ? 1 - smooth(0.43, 0.6, p) : 0;
            S.sparkK = p > 0.44 && p < 0.7 ? smooth(0.44, 0.7, p) : -1;
            S.mouthK = 0.6 * rip;
            return true;
          }
          if (nm === "fling") {
            const raise = smooth(0.04, 0.38, p) * (1 - smooth(0.42, 0.5, p));
            const rip = smooth(0.42, 0.52, p) * (1 - smooth(0.8, 0.98, p));
            S.hL.lerp(V3(0.7, TIP + 1.95, 0.05), raise);
            want.lerp(V3(0.1, 1, 0.3), raise);
            cwant.lerp(V3(0, 0.2, 1), raise);
            S.hL.lerp(V3(0.35, TIP + 1.15, 0.9), rip);
            want.lerp(V3(0, 0.1, 1), rip);
            cwant.lerp(V3(0, -1, -0.5), rip);
            S.hR.lerp(V3(-0.82, TIP + 1.2, 0.2), raise);
            S.hover += 0.24 * raise - 0.08 * rip;
            S.lean += -0.16 * raise + 0.2 * rip;
            S.glow = 1.3 * raise + 0.9 * rip;
            S.flash = 0.6 * raise + 0.7 * rip;
            S.waveK = p > 0.48 && p < 0.97 ? smooth(0.48, 0.97, p) : -1;
            S.impact = p > 0.48 && p < 0.66 ? 1 - smooth(0.48, 0.66, p) : 0;
            S.sparkK = p > 0.48 && p < 0.76 ? smooth(0.48, 0.76, p) : -1;
            S.headPitch += 0.15 * rip - 0.12 * raise;
            S.mouthK = 0.8 * rip;
            S.legK = 0.45 * raise;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(1.0, TIP + 0.95, 0.05), S.spinK);
            want.lerp(V3(1, 0, 0.2), S.spinK);
            cwant.lerp(V3(0, 0, 1), S.spinK);
          }
          if (nm === "jump") {
            S.hL.lerp(V3(0.85, TIP + 1.3, 0.2), S.air);
            want.lerp(V3(0.3, 1, 0.3), S.air);
            cwant.lerp(V3(0, 0, 1), S.air);
          }
          return false;
        },
        arm(S, t, motion) {
          const rad = u => lerp(0.125, 0.098, smooth(0.3, 0.9, u));
          const c = moltenArm(arm, shoulders[1], S.hL, t, motion, rad, 0.72);
          const end = c.getPointAt(1);
          const tg = c.getTangentAt(1);
          fwd.lerp(tg.clone().multiplyScalar(0.35).add(want.clone().normalize()).normalize(), 0.45).normalize();
          curl.lerp(cwant.clone().normalize(), 0.45);
          const y = fwd.clone();
          let x = curl.clone().addScaledVector(y, -curl.dot(y));
          if (x.lengthSq() < 1e-4) x = V3(0, -1, 0).addScaledVector(y, y.y);
          x.normalize();
          const z = x.clone().cross(y).normalize();
          claws.position.copy(end).addScaledVector(tg, 0.08);
          claws.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
          [0.62, 0.84].forEach((u, i) => {
            grips[i].position.copy(c.getPointAt(u));
            grips[i].quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(u));
            grips[i].scale.setScalar(rad(u) + 0.006);
          });
          spurs.forEach(Sp => {
            const tu = c.getTangentAt(Sp.u);
            let up = x.clone().negate().addScaledVector(tu, -x.dot(tu) * -1);
            up.addScaledVector(tu, -up.dot(tu)).normalize();
            Sp.m.position.copy(c.getPointAt(Sp.u)).addScaledVector(up, rad(Sp.u) + 0.06);
            Sp.m.quaternion.setFromUnitVectors(V3(0, 1, 0), up.clone().addScaledVector(tu, -0.9).normalize());
          });
          slitMat.color.copy(trailMat.color).lerp(new THREE.Color(1, 1, 1), 0.25);
          const boost = Math.min(1, (S.glow || 0) * 0.8);
          puffs.forEach(P => {
            const rate = P.eye ? 0.9 : P.claw ? 0.55 + boost * 0.5 : 0.32;
            const life = (t * rate + P.ph) % 1;
            if (life < P.last) smokeFrom(P);
            P.last = life;
            P.sp.position.copy(P.o).addScaledVector(P.d, life * (P.claw ? 0.6 : 0.85));
            P.sp.position.x += Math.sin(t * 1.3 + P.ph * 9) * 0.05 * life;
            const sc = P.sp0 * (0.6 + life * 1.8) * (P.claw ? 0.8 + boost * 0.4 : 1);
            P.sp.scale.set(sc, sc, 1);
            P.m.rotation = P.rot + life * 1.2;
            const a = Math.sin(Math.PI * life) * smooth(0, 0.15, life);
            P.m.opacity = a * (P.eye ? 0.8 : P.ember ? 0.55 : 0.75) * (P.claw ? 0.75 + boost * 0.25 : 1) * (motion > 0 ? 1 : 1);
          });
          tipBig = big.worldToLocal(bodyG.localToWorld(end.clone().addScaledVector(y, 0.9).addScaledVector(x, 0.3)));
        },
        fx(S, nm) {
          if (nm === "swipe") {
            const X = V3(0.6, 0.8, -0.2).normalize();
            const Y = V3(0, 0, 1).addScaledVector(X, -X.z).normalize();
            const Z = X.clone().cross(Y);
            trail.forEach((a, i) => {
              a.position.set(0.35, TIP + 0.95, 0.15);
              a.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
              a.rotateZ(-0.1 + i * 0.06);
              a.scale.setScalar(1.3 + i * 0.07);
            });
          }
          const fB = big.worldToLocal(bodyG.localToWorld(V3(0, 0, 1))).sub(big.worldToLocal(bodyG.localToWorld(V3(0, 0, 0))));
          fB.y = 0;
          fB.normalize();
          const side = V3(0, 1, 0).cross(fB).normalize();
          markGlow.color.copy(trailMat.color);
          if (S.waveK >= 0 && !launched) {
            launched = true;
            from = big.worldToLocal(bodyG.localToWorld(V3(0.2, TIP + 0.9, 0.6)));
            fdir = fB.clone();
          }
          if (S.waveK < 0) launched = false;
          const k = S.waveK >= 0 ? S.waveK : S.markK !== undefined && S.markK >= 0 ? S.markK : -1;
          const flying = S.waveK >= 0;
          marks.forEach(M => {
            M.g.visible = k >= 0 && k < 1;
            if (!M.g.visible) return;
            const dir = flying ? fdir : fB;
            const sd = V3(0, 1, 0).cross(dir).normalize();
            const base = flying ? from.clone().addScaledVector(dir, 0.3 + k * 3.0) : big.worldToLocal(bodyG.localToWorld(V3(0.05, TIP + 0.95, 1.0)));
            const off = (M.i - 1) * (flying ? 0.22 + k * 0.1 : 0.17);
            const tilt = V3(0, 1, 0).applyAxisAngle(dir, 0.6).normalize();
            const across = tilt.clone().cross(dir).normalize();
            M.g.position.copy(base).addScaledVector(across, off);
            M.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, tilt, dir));
            const grow = flying ? 1.2 + k * 0.8 : 0.6 + 0.5 * smooth(0, 0.3, k);
            M.g.scale.setScalar(grow);
            const fade = 1 - smooth(0.6, 1, k);
            markDark.opacity = 0.85 * fade;
            markGlow.opacity = 0.9 * fade;
          });
          return flying ? from.clone().addScaledVector(fdir, 0.3 + S.waveK * 3.0) : tipBig;
        },
        hide() {
          marks.forEach(m => (m.g.visible = false));
        }
      };
    })();

    const psyKit = (() => {
      const K = makeKit();
      const { add } = K;
      const sph = new THREE.SphereGeometry(1, 24, 16);
      const drops = [0, 1].map(() => add(bodyG, mesh(sph, moltenMat)));
      const elbowO = add(bodyG, mesh(sph, moltenMat));
      const elbowR = add(bodyG, mesh(new THREE.TorusGeometry(0.1, 0.011, 8, 40), hotMat, false));
      const wristO = add(bodyG, mesh(sph, moltenMat));
      const brace = add(bodyG, new THREE.Group());
      {
        const prof = [V2(0.104, -0.16), V2(0.124, -0.156), V2(0.134, -0.13), V2(0.142, -0.04), V2(0.142, 0.04), V2(0.134, 0.12), V2(0.12, 0.15), V2(0.1, 0.156)];
        brace.add(mesh(new THREE.LatheGeometry(prof, 40), plateMat));
        brace.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 24, 1, true), darkSteel));
        [-0.135, 0.135].forEach(y => {
          const r = mesh(new THREE.TorusGeometry(0.132, 0.013, 8, 40), darkSteel);
          r.rotation.x = Math.PI / 2;
          r.position.y = y;
          brace.add(r);
        });
        const band = mesh(new THREE.TorusGeometry(0.145, 0.01, 6, 48), hotMat, false);
        band.rotation.x = Math.PI / 2;
        brace.add(band);
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * TAU + Math.PI / 4;
          const gm = mesh(new THREE.OctahedronGeometry(0.024, 0), hotMat, false);
          gm.position.set(Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15);
          gm.scale.set(0.6, 1.3, 0.6);
          brace.add(gm);
        }
      }
      const HS = 1.3;
      const hand = add(bodyG, new THREE.Group());
      const handIn = new THREE.Group();
      handIn.scale.setScalar(HS);
      hand.add(handIn);
      {
        const mitt = mesh(new THREE.SphereGeometry(0.135, 32, 22), steelMat);
        mitt.scale.set(1.1, 0.62, 1.28);
        mitt.position.z = 0.11;
        handIn.add(mitt);
        const knuck = mesh(new THREE.SphereGeometry(0.12, 32, 12, 0, TAU, 0, Math.PI * 0.4), plateMat);
        knuck.scale.set(1.12, 0.52, 1.22);
        knuck.position.set(0, 0.035, 0.11);
        handIn.add(knuck);
        const gem = mesh(new THREE.OctahedronGeometry(0.03, 0), hotMat, false);
        gem.position.set(0, 0.098, 0.1);
        gem.scale.set(1, 0.5, 1.3);
        handIn.add(gem);
        const th = new THREE.Group();
        th.position.set(0.11, 0.0, 0.06);
        th.rotation.set(-0.15, 0.85, 0);
        handIn.add(th);
        const tm = mesh(new THREE.SphereGeometry(0.05, 20, 14), steelMat);
        tm.scale.set(0.95, 0.8, 1.7);
        tm.position.z = 0.05;
        th.add(tm);
        const sig = mesh(new THREE.TorusGeometry(0.058, 0.008, 6, 40), hotMat, false);
        sig.rotation.x = Math.PI / 2;
        sig.position.set(0, -0.082, 0.1);
        handIn.add(sig);
        const sig2 = mesh(new THREE.CircleGeometry(0.022, 24), hotMat, false);
        sig2.rotation.x = Math.PI / 2;
        sig2.position.set(0, -0.083, 0.1);
        handIn.add(sig2);
        const wr = mesh(new THREE.TorusGeometry(0.085, 0.016, 8, 32), darkSteel);
        wr.position.z = -0.01;
        handIn.add(wr);
      }
      const cap = add(socket, new THREE.Group());
      {
        const c = mesh(new THREE.TorusGeometry(0.15, 0.03, 10, 36), castMat);
        c.rotation.y = Math.PI / 2;
        c.position.x = 0.07;
        cap.add(c);
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * TAU;
          cap.add(mesh(spike(V3(0.08, Math.cos(a) * 0.15, Math.sin(a) * 0.15), V3(1, Math.cos(a) * 0.3, Math.sin(a) * 0.3), 0.08, 0.02, 4), plateMat));
        }
      }
      const discGeo = (() => {
        const sh = new THREE.Shape();
        const T = 12;
        for (let k = 0; k <= T * 2; k++) {
          const a = (k / (T * 2)) * TAU;
          const r = k % 2 ? 0.125 : 0.155;
          const aa = a + (k % 2 ? 0.08 : 0);
          if (k === 0) sh.moveTo(Math.cos(aa) * r, Math.sin(aa) * r);
          else sh.lineTo(Math.cos(aa) * r, Math.sin(aa) * r);
        }
        const hole = new THREE.Path();
        hole.absarc(0, 0, 0.035, 0, TAU, true);
        sh.holes.push(hole);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 1 });
        g.translate(0, 0, -0.008);
        return g;
      })();
      const discs = [0, 1, 2].map(i => {
        const g = add(bodyG, new THREE.Group());
        g.add(mesh(discGeo, castMat));
        const r = mesh(new THREE.TorusGeometry(0.085, 0.01, 6, 32), hotMat, false);
        g.add(r);
        const r2 = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 24), plateMat);
        g.add(r2);
        return { g, i };
      });
      const eye3 = add(head, new THREE.Group());
      {
        const ep = HP(0, 0.44);
        const n = HN(ep);
        eye3.position.copy(ep).addScaledVector(n, -0.005);
        eye3.quaternion.setFromUnitVectors(V3(0, 0, 1), n);
        eye3.scale.setScalar(1.35);
        const lens = mesh(sph, moltenMat);
        lens.scale.set(0.12, 0.062, 0.035);
        eye3.add(lens);
        const iris = mesh(new THREE.CircleGeometry(0.042, 28), darkSteel, false);
        iris.position.z = 0.034;
        eye3.add(iris);
        const ring = mesh(new THREE.TorusGeometry(0.042, 0.007, 6, 28), hotMat, false);
        ring.position.z = 0.036;
        eye3.add(ring);
        const pup = mesh(new THREE.SphereGeometry(1, 12, 8), hotMat, false);
        pup.position.z = 0.037;
        pup.scale.set(0.009, 0.03, 0.004);
        eye3.add(pup);
        [1, -1].forEach(sg => {
          const lid = mesh(new THREE.TorusGeometry(0.125, 0.016, 8, 24, Math.PI), plateMat);
          lid.scale.set(1, 0.55 * sg, 1);
          lid.position.z = 0.012;
          eye3.add(lid);
        });
        [-1, 1].forEach(sg => {
          const t = mesh(spike(V3(sg * 0.12, 0, 0.01), V3(sg, 0.12, 0), 0.07, 0.016, 4), plateMat);
          eye3.add(t);
        });
      }
      const halo = add(head, new THREE.Group());
      const haloB = Array.from({ length: 9 }, (_, i) => {
        const b = mesh(sph, i % 3 === 0 ? hotMat : moltenMat, false);
        halo.add(b);
        return b;
      });
      halo.position.set(0, HH * 1.22, -0.06);
      halo.rotation.x = -0.3;
      {
        const hr = mesh(new THREE.TorusGeometry(HW * 0.62, 0.008, 6, 64), hotMat, false);
        hr.rotation.x = Math.PI / 2;
        halo.add(hr);
      }
      const rings = add(port, new THREE.Group());
      const coreR = [0.17, 0.225, 0.28].map((r, i) => {
        const g = new THREE.Group();
        const t = mesh(new THREE.TorusGeometry(r, 0.009 + 0.003 * (2 - i), 6, 64), i === 1 ? hotMat : castMat, i !== 1);
        g.add(t);
        for (let k = 0; k < 3 + i; k++) {
          const a = (k / (3 + i)) * TAU;
          const d = mesh(new THREE.OctahedronGeometry(0.018, 0), i === 1 ? plateMat : hotMat, false);
          d.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
          g.add(d);
        }
        g.position.z = 0.03 + i * 0.025;
        rings.add(g);
        return g;
      });
      const tailRing = add(tailTip, new THREE.Group());
      {
        const t = mesh(new THREE.TorusGeometry(0.11, 0.014, 6, 36), castMat);
        tailRing.add(t);
        const t2 = mesh(new THREE.TorusGeometry(0.11, 0.006, 6, 36), hotMat, false);
        t2.position.z = 0.008;
        tailRing.add(t2);
        tailRing.position.z = 0.05;
      }
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const pulses = [0, 1].map(() => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 48), pulseMat);
        m.visible = false;
        bodyG.add(m);
        return m;
      });
      let bend = 0.2;
      const bendW = { v: 0.2 };
      let orbR = 0.3;
      const orbW = { r: 0.3, spd: 1.4 };
      let orbA = 0;
      let lastT = null;
      let handBig = V3();
      let leadBig = V3();
      return {
        set: on => {
          K.set(on);
          pulses.forEach(m => (m.visible = false));
        },
        style(shiny) {
          plateMat.color.setHex(shiny ? 0xf0d488 : 0xa8407e);
        },
        rest(S, t, motion) {
          S.hL.set(0.74, TIP + 0.5 + Math.sin(t * 1.6) * 0.03 * motion, 0.36);
          bendW.v = 0.25 + 0.08 * Math.sin(t * 1.1) * motion;
          orbW.r = 0.3;
          orbW.spd = 1.4;
        },
        act(nm, p, S) {
          if (nm === "swipe") {
            const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.42, p));
            const push = smooth(0.34, 0.46, p) * (1 - smooth(0.76, 0.95, p));
            S.hL.lerp(V3(0.95, TIP + 1.2, -0.3), wind);
            S.hL.lerp(V3(0.32, TIP + 1.12, 0.98), push);
            bendW.v = lerp(bendW.v, 1.25, push);
            orbW.r = lerp(orbW.r, 0.5, push);
            orbW.spd = lerp(orbW.spd, 7, Math.max(wind, push));
            S.spinY += 0.3 * wind - 0.35 * push;
            S.lean += -0.06 * wind + 0.14 * push;
            S.trailK = p > 0.36 && p < 0.6 ? Math.sin(Math.PI * smooth(0.36, 0.6, p)) : 0;
            S.pulseK = p > 0.42 && p < 0.85 ? smooth(0.42, 0.85, p) : -1;
            S.glow = 0.5 * wind + 0.9 * push;
            S.impact = p > 0.44 && p < 0.6 ? 1 - smooth(0.44, 0.6, p) : 0;
            S.sparkK = p > 0.44 && p < 0.7 ? smooth(0.44, 0.7, p) : -1;
            S.mouthK = 0.5 * push;
            return true;
          }
          if (nm === "fling") {
            const raise = smooth(0.04, 0.38, p) * (1 - smooth(0.42, 0.5, p));
            const thrust = smooth(0.42, 0.52, p) * (1 - smooth(0.84, 0.98, p));
            S.hL.lerp(V3(0.62, TIP + 1.85, 0.2), raise);
            bendW.v = lerp(bendW.v, -0.5, raise);
            S.hL.lerp(V3(0.38, TIP + 1.15, 0.95), thrust);
            bendW.v = lerp(bendW.v, 1.25, thrust);
            orbW.r = lerp(orbW.r, 0.45, raise);
            orbW.spd = lerp(orbW.spd, 9, Math.max(raise, thrust));
            S.hR.lerp(V3(-0.82, TIP + 1.25, 0.25), raise);
            S.hover += 0.25 * raise - 0.04 * thrust;
            S.lean += -0.12 * raise + 0.2 * thrust;
            S.glow = 1.4 * raise + 0.9 * thrust;
            S.flash = 0.7 * raise + 0.7 * thrust;
            S.waveK = p > 0.48 && p < 0.98 ? smooth(0.48, 0.98, p) : -1;
            S.pulseK = p > 0.46 && p < 0.8 ? smooth(0.46, 0.8, p) : -1;
            S.impact = p > 0.48 && p < 0.66 ? 1 - smooth(0.48, 0.66, p) : 0;
            S.sparkK = p > 0.6 && p < 0.82 ? smooth(0.6, 0.82, p) : -1;
            S.headPitch += 0.1 * thrust - 0.15 * raise;
            S.mouthK = 0.7 * thrust;
            S.legK = 0.4 * raise;
            return true;
          }
          if (nm === "spin") {
            S.hL.lerp(V3(1.05, TIP + 1.0, 0.1), S.spinK);
            bendW.v = lerp(bendW.v, 0.9, S.spinK);
            orbW.r = lerp(orbW.r, 0.5, S.spinK);
            orbW.spd = lerp(orbW.spd, 6, S.spinK);
          }
          if (nm === "jump") {
            S.hL.lerp(V3(0.85, TIP + 1.55, 0.25), S.air);
            bendW.v = lerp(bendW.v, -0.3, S.air);
          }
          return false;
        },
        arm(S, t, motion) {
          const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
          lastT = t;
          const A = shoulders[1];
          const r = ik(A, S.hL, L1, L2, V3(0, -0.5, -0.5));
          const E = r.elbow;
          const Wp = r.end;
          const ua = E.clone().sub(A);
          const fa = Wp.clone().sub(E);
          const uaN = ua.clone().normalize();
          const faN = fa.clone().normalize();
          const bob = k => Math.sin(t * 2.2 + k * 1.7) * 0.014 * motion;
          drops.forEach((d, i) => {
            const u = 0.48 + i * 0.27;
            d.position.copy(A).addScaledVector(ua, u).add(V3(0, bob(i), 0));
            d.quaternion.setFromUnitVectors(V3(0, 1, 0), uaN);
            const rr = 0.064 - i * 0.004;
            const pul = 1 + 0.08 * Math.sin(t * 3 + i * 2);
            d.scale.set(rr * pul, rr * 1.3 * pul, rr * pul);
          });
          elbowO.position.copy(E).add(V3(0, bob(4), 0));
          elbowO.scale.setScalar(0.082 * (1 + 0.06 * Math.sin(t * 2.6)));
          elbowR.position.copy(elbowO.position);
          elbowR.quaternion.setFromUnitVectors(V3(0, 0, 1), uaN.clone().add(faN).normalize());
          elbowR.rotateZ(t * 2);
          const bc = E.clone().addScaledVector(fa, 0.52).add(V3(0, bob(5), 0));
          brace.position.copy(bc);
          brace.quaternion.setFromUnitVectors(V3(0, 1, 0), faN);
          brace.rotateY(t * 0.6);
          wristO.position.copy(E).addScaledVector(fa, 0.93).add(V3(0, bob(6), 0));
          wristO.scale.setScalar(0.05 * (1 + 0.1 * Math.sin(t * 3.3)));
          bend = lerp(bend, bendW.v, 0.3);
          const { hx, hy } = frame(faN);
          const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, faN));
          q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), -bend));
          hand.position.copy(Wp).addScaledVector(faN, 0.05).add(V3(0, bob(7), 0));
          hand.quaternion.copy(q);
          const H = hand.position.clone();
          const palmN = V3(0, -1, 0).applyQuaternion(q);
          const palmC = H.clone().addScaledVector(V3(0, 0, 1).applyQuaternion(q), 0.13 * HS);
          orbR = lerp(orbR, orbW.r, 0.25);
          orbA += dt * orbW.spd;
          const oa = dt === 0 ? t * orbW.spd : orbA;
          const ox = V3(1, 0, 0).applyQuaternion(brace.quaternion);
          const oz = V3(0, 0, 1).applyQuaternion(brace.quaternion);
          handBig = big.worldToLocal(bodyG.localToWorld(palmC.clone()));
          const k = S.waveK >= 0 ? S.waveK : -1;
          const out = k >= 0 ? smooth(0, 0.5, k) * (1 - smooth(0.62, 1, k)) : 0;
          discs.forEach(D => {
            const a = oa + (D.i / 3) * TAU;
            const op = bc.clone().addScaledVector(ox, Math.cos(a) * orbR).addScaledVector(oz, Math.sin(a) * orbR);
            const dir = V3(Math.sin((D.i - 1) * 0.4), 0.02, Math.cos((D.i - 1) * 0.4));
            D.g.position.copy(op).addScaledVector(dir, out * 3.3);
            const nrm = faN.clone().lerp(V3(0, 1, 0), out).normalize();
            D.g.quaternion.setFromUnitVectors(V3(0, 0, 1), nrm);
            D.g.rotateZ(t * (8 + 10 * out) + D.i);
            D.g.scale.setScalar(0.72 * (1 + 0.6 * out));
          });
          leadBig = big.worldToLocal(bodyG.localToWorld(discs[1].g.position.clone()));
          haloB.forEach((b, i) => {
            const a = t * 0.9 + (i / haloB.length) * TAU;
            b.position.set(Math.cos(a) * HW * 0.62, Math.sin(t * 2 + i) * 0.015, Math.sin(a) * HW * 0.62);
            const r = i % 3 === 0 ? 0.034 : 0.024;
            b.scale.setScalar(r * (1 + 0.2 * Math.sin(t * 3 + i)));
          });
          coreR.forEach((g, i) => {
            g.rotation.z = t * (i % 2 ? -0.6 : 0.8) * (1 + (S.glow || 0));
            g.rotation.x = Math.sin(t * 0.9 + i) * 0.18;
            g.rotation.y = Math.cos(t * 0.7 + i * 2) * 0.18;
          });
          tailRing.rotation.z = t * 1.5;
          tailRing.position.y = Math.sin(t * 2) * 0.02;
          pulseMat.color.copy(trailMat.color);
          const pk = S.pulseK !== undefined ? S.pulseK : -1;
          pulses.forEach((m, i) => {
            const kk = pk - i * 0.15;
            m.visible = kk > 0 && kk < 1;
            if (!m.visible) return;
            m.position.copy(palmC).addScaledVector(palmN, 0.06 + kk * 0.6);
            m.quaternion.setFromUnitVectors(V3(0, 0, 1), palmN);
            m.scale.setScalar(0.12 + kk * 0.75);
          });
          pulseMat.opacity = pk >= 0 ? 0.75 * (1 - smooth(0.4, 1, pk)) : 0;
        },
        fx(S, nm) {
          if (nm === "swipe")
            trail.forEach((a, i) => {
              a.position.copy(shoulders[1]).add(V3(-0.25, 0.1, 0.05));
              a.rotation.set(Math.PI / 2 - 0.15, 0, -0.5 + i * 0.05);
              a.scale.setScalar(1.6 + i * 0.07);
            });
          return S.waveK >= 0 ? leadBig : handBig;
        },
        hide() {
          pulses.forEach(m => (m.visible = false));
        }
      };
    })();

    const KITS = { steel: shieldKit, rock: hammerKit, fire: swordKit, water: tridentKit, grass: bowKit, dragon: dragonKit, fighting: fistKit, ice: iceKit, poison: poisonKit, bug: bugKit, electric: railKit, ghost: scytheKit, flying: wingKit, dark: clawKit, psychic: psyKit };
    let kitNow = hammerKit;

    const food = berry();
    food.visible = false;
    big.add(food);

    let shinyOn = false;
    const restyle = () => {
      steelMat.color.setHex(shinyOn ? 0xf6d68e : 0xffffff);
      plateMat.color.setHex(shinyOn ? PLATE_SHINY : PLATE);
      darkSteel.color.setHex(shinyOn ? 0x7a5a2c : 0x5d646c);
      castMat.color.setHex(shinyOn ? 0xf0c880 : 0xffffff);
      redMat.color.setHex(shinyOn ? 0xc8402a : 0xb3241b);
      if (kitNow) kitNow.style(shinyOn);
    };
    const applyCore = () => {
      pal = palOf(GLOW[coreType || "steel"], coreType === "dark" ? 0.25 : 1);
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
      stringMat.color.copy(rimC);
      breathMat.color.copy(hotC);
      kitNow = KITS[coreType || "steel"] || null;
      Object.values(KITS).forEach(k => k.set(k === kitNow));
      baseTailParts.forEach(c => (c.visible = !(kitNow && kitNow.customTail)));
      const half = kitNow === bowKit || kitNow === dragonKit || kitNow === clawKit;
      browFull.visible = !half;
      browHalf.visible = half;
      crestM.visible = kitNow !== dragonKit && kitNow !== fistKit && kitNow !== bugKit && kitNow !== scytheKit && kitNow !== wingKit && kitNow !== clawKit && kitNow !== psyKit;

      restyle();
    };

    applyCore();
    root.traverse(o => {
      if (o.material) [].concat(o.material).forEach(m => m.userData.varHue === undefined && (m.userData.varHue = 0));
    });

    return {
      root,
      setCore(type) {
        coreType = GLOW[type] ? type : null;
        applyCore();
      },
      update(s) {
        const { t, pointer, blink, lookYaw, lookPitch, action, motion } = s;
        if (root.userData.variant && !shinyOn) {
          shinyOn = true;
          restyle();
        }
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;
        const K = kitNow;

        const S = {
          hover: Math.sin(t * 1.2) * 0.04 * motion,
          lean: Math.sin(t * 0.7) * 0.025 * motion,
          roll: Math.sin(t * 0.9) * 0.02 * motion,
          spinY: 0,
          squash: 1,
          headYaw: lookYaw * 0.5,
          headPitch: -lookPitch * 0.3,
          headRoll: 0,
          mouthK: 0,
          glow: 0,
          trailK: 0,
          trailOpacity: null,
          pull: 0,
          flash: 0,
          legK: 0,
          lash: 0,
          impact: 0,
          swingK: 0,
          waveK: -1,
          sparkK: -1,
          burn: 0,
          jetK: -1,
          air: 0,
          spinK: 0,
          hR: REST_R.clone().add(V3(0, Math.sin(t * 1.4) * 0.02 * motion, 0)),
          hL: REST_L.clone().add(V3(0, Math.sin(t * 1.4 + 1.2) * 0.02 * motion, 0))
        };
        if (K) K.rest(S, t, motion);
        const chargeK = nm === "fling" && !K ? smooth(0.04, 0.35, p) * (1 - smooth(0.4, 0.5, p)) : 0;
        let holdR = null;

        if (nm === "jump") {
          const c = smooth(0.02, 0.2, p) * (1 - smooth(0.2, 0.3, p));
          const air = Math.sin(Math.PI * smooth(0.22, 0.8, p));
          const land = p > 0.78 ? Math.sin(Math.PI * smooth(0.78, 1, p)) : 0;
          S.air = air;
          S.hover += -0.1 * c + 0.65 * air - 0.05 * land;
          S.squash = 1 - 0.08 * c + 0.05 * air - 0.07 * land;
          S.hR.lerp(V3(-0.713, TIP + 1.3, 0.132), air);
          S.headPitch -= 0.2 * air;
          S.mouthK = 0.6 * air;
          S.legK = Math.max(S.legK, air);
        } else if (nm === "eat" && ph) {
          const reach = smooth(0.0, 0.22, p) * (1 - smooth(0.88, 1, p));
          const bring = smooth(0.3, 0.46, p) * (1 - smooth(0.86, 0.98, p));
          S.hR.lerp(V3(-0.529, TIP + 1.0, 0.682), reach);
          S.hR.lerp(V3(-0.16, TIP + 1.19, 0.44), bring);
          S.headPitch += 0.15 * reach * (1 - bring) - S.headPitch * bring * 0.8;
          S.headYaw += -0.22 * reach * (1 - bring) - S.headYaw * bring * 0.8;
          S.mouthK = bring * (0.35 + 0.65 * ph.chew) * (1 - smooth(0.8, 0.9, p));
          if (p > 0.88) S.mouthK = 0;
        } else if (nm === "spin") {
          const k = smooth(0.0, 0.15, p) * (1 - smooth(0.85, 1, p));
          S.spinK = k;
          S.spinY = S.spinY * (1 - k) + smooth(0.08, 0.9, p) * TAU * 2;
          S.hover += 0.1 * k;
          S.hR.lerp(V3(-0.92, TIP + 1.02, 0.0), k);
          S.lean = S.lean * (1 - k) + Math.sin(t * 9) * 0.04 * k;
          S.roll = Math.cos(t * 9) * 0.04 * k;
          S.lash = k;
          S.legK = Math.max(S.legK, 0.6 * k);
        } else if (nm === "absorb") {
          const up = smooth(0.0, 0.18, p) * (1 - smooth(0.88, 1, p));
          S.pull = p > 0.18 && p < 0.78 ? smooth(0.18, 0.3, p) * (1 - smooth(0.7, 0.78, p)) : 0;
          const clench = smooth(0.74, 0.8, p) * (1 - smooth(0.9, 1, p));
          S.flash = p > 0.76 && p < 0.95 ? Math.sin(Math.PI * smooth(0.76, 0.95, p)) : 0;
          S.hR.lerp(V3(-0.62, TIP + 1.0, 0.5), up);
          S.hR.add(V3(0.04, 0.02, -0.05).multiplyScalar(clench));
          S.headPitch += 0.12 * up;
          S.lean += 0.05 * up - 0.04 * S.flash;
          S.squash = 1 + 0.03 * S.flash;
          S.mouthK = 0.3 * S.pull;
        }
        const handled = K ? K.act(nm, p, S, t) : false;
        if (!handled && nm === "swipe") {
          const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.44, p));
          const strike = smooth(0.34, 0.46, p) * (1 - smooth(0.7, 0.95, p));
          S.hR.lerp(V3(-0.95, TIP + 1.25, -0.25), wind);
          S.hR.lerp(V3(0.08, TIP + 1.02, 0.98), strike);
          S.spinY = 0.45 * wind - 0.5 * strike;
          S.lean = 0.1 * strike - 0.05 * wind;
          S.trailK = p > 0.36 && p < 0.62 ? Math.sin(Math.PI * smooth(0.36, 0.62, p)) : 0;
          S.glow = 0.5 * wind + 0.6 * strike;
          S.sparkK = p > 0.42 && p < 0.7 ? smooth(0.42, 0.7, p) : -1;
          S.mouthK = 0.5 * strike;
        } else if (!handled && nm === "fling") {
          const raise = smooth(0.04, 0.35, p) * (1 - smooth(0.4, 0.5, p));
          const throwK = smooth(0.4, 0.5, p) * (1 - smooth(0.72, 0.95, p));
          S.lean = -0.12 * raise + 0.16 * throwK;
          S.hR.lerp(V3(-0.8, TIP + 1.1, -0.1), raise);
          S.hR.lerp(V3(-0.75, TIP + 0.7, 0.3), throwK);
          S.glow = 1.4 * raise + 0.6 * throwK;
          S.flash = 0.8 * raise + 0.5 * throwK;
          S.sparkK = p > 0.46 && p < 0.76 ? smooth(0.46, 0.76, p) : -1;
          S.headPitch -= 0.15 * raise - 0.1 * throwK;
          S.mouthK = 0.7 * throwK;
          S.hover += 0.06 * raise;
        }

        bodyG.position.y = S.hover;
        bodyG.rotation.set(S.lean, S.spinY, S.roll);
        bodyG.scale.set(1 / Math.sqrt(S.squash), S.squash, 1 / Math.sqrt(S.squash));
        neck.rotation.set(S.headPitch * 0.35, S.headYaw * 0.3, S.headRoll * 0.3);
        head.rotation.set(S.headPitch * 0.65, S.headYaw * 0.7, S.headRoll * 0.7);
        mouth.scale.set(1, lerp(0.05, 1, S.mouthK), 1);
        mouth.visible = S.mouthK > 0.03;
        smile.visible = S.mouthK < 0.25;
        legs.forEach((g, i) => {
          const sgn = i ? 1 : -1;
          g.rotation.set(Math.sin(t * 1.3 + i * 1.7) * 0.07 * motion - 0.25 * S.legK, 0, sgn * (Math.sin(t * 1.1 + i) * 0.04 * motion + 0.15 * S.legK));
        });
        {
          const sw = k => Math.sin(t * 1.3 - k * 0.7) * 0.07 * k * motion;
          const L = S.lash;
          const pts = [
            V3(0, TIP + 0.1, 0),
            V3(sw(0.4), TIP - 0.12, -0.04),
            V3(sw(1) + L * 0.1, TIP - 0.33 + L * 0.2, -0.2 - L * 0.12),
            V3(sw(1.6) + L * 0.3, TIP - 0.44 + L * 0.3, -0.48 - L * 0.2),
            V3(sw(2.2) + L * 0.55, TIP - 0.38 + L * 0.32, -0.76 - L * 0.2),
            V3(sw(2.8) + L * 0.8, TIP - 0.2 + L * 0.2, -0.96 - L * 0.1)
          ];
          const c = flexTube(tailM, pts, u => tailRad(u), 48, 16);
          const top = u => {
            const tg = c.getTangentAt(u);
            const up = V3(0, 1, 0.3).addScaledVector(tg, -V3(0, 1, 0.3).dot(tg));
            return up.normalize();
          };
          tailRings.forEach(R => {
            R.m.position.copy(c.getPointAt(R.u));
            R.m.quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(R.u));
            R.m.scale.setScalar(tailRad(R.u) + 0.003);
          });
          tailFins.forEach(F => {
            const n = top(F.u);
            F.m.position.copy(c.getPointAt(F.u)).addScaledVector(n, tailRad(F.u) + 0.035);
            F.m.quaternion.setFromUnitVectors(V3(0, 1, 0), n.clone().addScaledVector(c.getTangentAt(F.u), 0.6).normalize());
          });
          const d = c.getTangentAt(1);
          const n = top(1);
          const x = n.clone().cross(d).normalize();
          tailTip.position.copy(c.getPointAt(1));
          tailTip.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, n, d));
        }

        const close = 1 - blink;
        eyes.forEach(({ g }) => {
          g.scale.y = lerp(1, 0.1, close);
        });
        followPupils(eyes, pointer, 0.5);

        root.updateMatrixWorld(true);

        {
          const A = shoulders[0];
          const r = ik(A, S.hR, L1, L2, V3(0, -0.6, -0.4));
          const pts = [A.clone(), A.clone().lerp(r.elbow, 0.5), r.elbow, r.elbow.clone().lerp(r.end, 0.5), r.end];
          const c = flexTube(armR, pts, u => 0.095 + 0.012 * Math.sin(u * Math.PI));
          fore.position.copy(c.getPointAt(0.78));
          fore.quaternion.setFromUnitVectors(V3(0, 1, 0), c.getTangentAt(0.78));
          foreRims.forEach((R, i) => {
            const u = i ? 0.9 : 0.64;
            R.position.copy(c.getPointAt(u));
            R.quaternion.setFromUnitVectors(V3(0, 0, 1), c.getTangentAt(u));
          });
          const end = c.getPointAt(1);
          const d = c.getTangentAt(1);
          const { hx, hy } = frame(d);
          handR.position.copy(end);
          handR.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, d));
          holdR = end.clone().addScaledVector(d, 0.11).addScaledVector(hy, 0.14);
        }
        if (K) K.arm(S, t, motion);
        moltenMat.emissiveIntensity = 0.8 + 0.12 * Math.sin(t * 2.3) * motion + 0.5 * S.glow;
        castMat.emissiveIntensity = 0.9 + 0.5 * S.glow + 1.2 * S.impact;
        hotMat.emissiveIntensity = 0.6 + 0.5 * S.glow;
        if (moltenTex) moltenTex.offset.y = (t * 0.04) % 1;
        coreMat.emissiveIntensity = (1.0 + 0.8 * S.pull + 1.6 * S.flash) * (0.85 + 0.15 * Math.sin(t * 2.2));
        moltenMat.emissiveIntensity += 0.5 * S.pull + 0.8 * S.flash;
        hotMat.emissiveIntensity += 0.5 * S.pull + 0.8 * S.flash;

        const handBig = big.worldToLocal(handR.getWorldPosition(V3(0, 0, 0)));
        const coreBig = big.worldToLocal(port.getWorldPosition(V3(0, 0, 0)));
        const sockBig = big.worldToLocal(socket.localToWorld(V3(0.04, -0.13, 0.02)));
        trail.forEach(a => {
          a.scale.setScalar(1);
          a.position.set(-0.22, TIP + 1.28, 0.34);
          a.rotation.set(-0.6, 0.0, Math.PI + 0.24);
        });
        const kitAt = K ? K.fx(S, nm, p, t) : null;
        trail.forEach(a => {
          a.visible = S.trailK > 0.02;
        });
        trailMat.opacity = S.trailOpacity !== null ? S.trailOpacity : 0.55 * S.trailK;

        drops.forEach(D => {
          const u = (t / D.per + D.off) % 1;
          const cyc = Math.floor(t / D.per + D.off);
          if (u < 0.62) D.cyc = -1;
          if (K || nm === "spin" || nm === "absorb") {
            D.m.visible = false;
            return;
          }
          if (u < 0.62) {
            const g = smooth(0.0, 0.62, u);
            D.m.visible = g > 0.05;
            D.m.position.copy(sockBig).add(V3(0.0, -0.01 - 0.03 * g, 0));
            D.m.scale.set(0.6 + 0.5 * g, 0.55 + 1.0 * g, 0.6 + 0.5 * g);
          } else {
            if (D.cyc !== cyc) {
              D.cyc = cyc;
              D.from.copy(sockBig).add(V3(0, -0.04, 0));
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
          const f = nm === "fling" && !K ? (p - st) / 0.4 : -1;
          b.visible = f > 0 && f < 1;
          if (!b.visible) return;
          const dir = V3(-0.12 + i * 0.12, 0.02, 1);
          b.position.copy(coreBig).addScaledVector(dir, 0.15 + f * 2.6);
          b.position.y += Math.sin(f * Math.PI) * 0.35 - f * 0.8;
          b.scale.set(1, 1 + 0.6 * (1 - f), 1);
          b.rotation.x = f * 3;
        });

        const sparkAt = kitAt || (nm === "fling" ? coreBig.clone().add(V3(0, 0, 0.12)) : handBig);
        sparks.forEach(sp => {
          sp.m.visible = S.sparkK >= 0;
          if (!sp.m.visible) return;
          const r = 0.1 + S.sparkK * 0.55 * sp.v;
          sp.m.position.copy(sparkAt).add(V3(Math.cos(sp.a) * r, Math.sin(sp.a) * r * 0.8 - S.sparkK * S.sparkK * 0.3, Math.sin(sp.a * 2) * r * 0.4 + 0.1));
          sp.m.lookAt(sparkAt);
          sparkMat.opacity = 1 - S.sparkK;
        });

        motes.forEach(M => {
          M.m.visible = Math.max(S.pull, chargeK) > 0.02;
          if (!M.m.visible) return;
          const f = (t * 0.9 + M.off) % 1;
          const k = 1 - f;
          const ang = M.a + f * 2.4;
          M.m.position.copy(coreBig).add(V3(Math.cos(ang) * M.r * k, Math.sin(ang * 1.3) * M.r * 0.6 * k, Math.abs(Math.sin(ang)) * M.r * k + 0.1 * k));
          M.m.scale.setScalar(0.6 + 0.8 * k);
          motesMat.opacity = 0.9 * Math.max(S.pull, chargeK);
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
