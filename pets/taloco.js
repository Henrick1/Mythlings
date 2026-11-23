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

    const legs = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(s * 0.15, TIP + 0.3, 0.03);
      bodyG.add(g);
      const radL = u => {
        const knee = 0.012 * Math.exp(-Math.pow((u - 0.52) / 0.1, 2));
        const r = u < 0.58 ? lerp(0.1, 0.08, u / 0.58) : 0.08 * (1 - Math.pow((u - 0.58) / 0.42, 1.4));
        return Math.max(0.003, r + knee);
      };
      const { g: geo, c: lc } = tubeGeo([V3(-s * 0.09, 0.07, -0.02), V3(0, 0, 0), V3(s * 0.1, -0.08, 0.06), V3(s * 0.17, -0.22, 0.13), V3(s * 0.2, -0.38, 0.08), V3(s * 0.215, -0.56, -0.01)], radL, 48, 18);
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
    });

    const HW = 0.34;
    const HH = 0.31;
    const HD = 0.33;
    const HP = (x, y) => V3(x * HW, y * HH, Math.sqrt(Math.max(0, 1 - x * x - y * y)) * HD);
    const HN = p => V3(p.x / (HW * HW), p.y / (HH * HH), p.z / (HD * HD)).normalize();
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
      const X = 0.56;
      const Y0 = 0.15;
      const Y1 = 0.44;
      for (let i = 0; i <= K; i++) path.push([lerp(-X, 0, i / K), lerp(Y1, Y0, i / K)]);
      for (let i = 1; i <= K; i++) path.push([lerp(0, X, i / K), lerp(Y0, Y1, i / K)]);
      const surf = path.map(([x, y]) => HP(x, y));
      const nS = surf.map(HN);
      const B = 12;
      const LEN = 0.52;
      const blade = sgn => {
        const E = HP(sgn * X, Y1);
        const n = HN(E);
        const D = V3(sgn, 0.66, -0.4).normalize();
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
      head.add(mesh(strip(pts, nrm, wf, hf), plateMat));
    }
    {
      const th0 = Math.asin(0.3);
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
      head.add(mesh(strip(pts, pts.map(HN), i => 0.036 * (1 - 0.6 * smooth(0.8, 1, i / K)), i => hs[i], 0.5), plateMat));
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

    const food = berry();
    food.visible = false;
    big.add(food);

    const REST_R = V3(-0.86, TIP + 0.56, 0.3);
    const L1 = 0.4;
    const L2 = 0.5;

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
        const chargeK = nm === "fling" ? smooth(0.04, 0.35, p) * (1 - smooth(0.4, 0.5, p)) : 0;
        let flash = 0;
        let legK = 0;
        let lash = 0;
        const hR = REST_R.clone().add(V3(0, Math.sin(t * 1.4) * 0.02 * motion, 0));
        let holdR = null;

        if (nm === "jump") {
          const c = smooth(0.02, 0.2, p) * (1 - smooth(0.2, 0.3, p));
          const air = Math.sin(Math.PI * smooth(0.22, 0.8, p));
          const land = p > 0.78 ? Math.sin(Math.PI * smooth(0.78, 1, p)) : 0;
          hover += -0.1 * c + 0.65 * air - 0.05 * land;
          squash = 1 - 0.08 * c + 0.05 * air - 0.07 * land;
          hR.lerp(V3(-0.713, TIP + 1.3, 0.132), air);
          headPitch -= 0.2 * air;
          mouthK = 0.6 * air;
          legK = air;
        } else if (nm === "eat" && ph) {
          const reach = smooth(0.0, 0.22, p) * (1 - smooth(0.88, 1, p));
          const bring = smooth(0.3, 0.46, p) * (1 - smooth(0.86, 0.98, p));
          hR.lerp(V3(-0.529, TIP + 1.0, 0.682), reach);
          hR.lerp(V3(-0.16, TIP + 1.19, 0.44), bring);
          headPitch += 0.15 * reach * (1 - bring);
          headYaw += -0.22 * reach * (1 - bring);
          mouthK = bring * (0.35 + 0.65 * ph.chew) * (1 - smooth(0.8, 0.9, p));
          if (p > 0.88) mouthK = 0;
        } else if (nm === "swipe") {
          const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.44, p));
          const strike = smooth(0.34, 0.46, p) * (1 - smooth(0.7, 0.95, p));
          hR.lerp(V3(-0.95, TIP + 1.25, -0.25), wind);
          hR.lerp(V3(0.08, TIP + 1.02, 0.98), strike);
          spinY = 0.45 * wind - 0.5 * strike;
          lean = 0.1 * strike - 0.05 * wind;
          trailK = p > 0.36 && p < 0.62 ? Math.sin(Math.PI * smooth(0.36, 0.62, p)) : 0;
          glow = 0.5 * wind + 0.6 * strike;
          mouthK = 0.5 * strike;
        } else if (nm === "fling") {
          const raise = smooth(0.04, 0.35, p) * (1 - smooth(0.4, 0.5, p));
          const throwK = smooth(0.4, 0.5, p) * (1 - smooth(0.72, 0.95, p));
          lean = -0.12 * raise + 0.16 * throwK;
          hR.lerp(V3(-0.8, TIP + 1.1, -0.1), raise);
          hR.lerp(V3(-0.75, TIP + 0.7, 0.3), throwK);
          glow = 1.4 * raise + 0.6 * throwK;
          flash = 0.8 * raise + 0.5 * throwK;
          headPitch -= 0.15 * raise - 0.1 * throwK;
          mouthK = 0.7 * throwK;
          hover += 0.06 * raise;
        } else if (nm === "spin") {
          const k = smooth(0.0, 0.15, p) * (1 - smooth(0.85, 1, p));
          spinY = smooth(0.08, 0.9, p) * TAU * 2;
          hover += 0.1 * k;
          hR.lerp(V3(-0.92, TIP + 1.02, 0.0), k);
          lean = Math.sin(t * 9) * 0.04 * k;
          roll = Math.cos(t * 9) * 0.04 * k;
          lash = k;
          legK = 0.6 * k;
        } else if (nm === "absorb") {
          const up = smooth(0.0, 0.18, p) * (1 - smooth(0.88, 1, p));
          pull = p > 0.18 && p < 0.78 ? smooth(0.18, 0.3, p) * (1 - smooth(0.7, 0.78, p)) : 0;
          const clench = smooth(0.74, 0.8, p) * (1 - smooth(0.9, 1, p));
          flash = p > 0.76 && p < 0.95 ? Math.sin(Math.PI * smooth(0.76, 0.95, p)) : 0;
          hR.lerp(V3(-0.62, TIP + 1.0, 0.5), up);
          hR.add(V3(0.04, 0.02, -0.05).multiplyScalar(clench));
          headPitch += 0.12 * up;
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
        {
          const sw = k => Math.sin(t * 1.3 - k * 0.7) * 0.07 * k * motion;
          const L = lash;
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
          const r = ik(A, hR, L1, L2, V3(0, -0.6, -0.4));
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
        moltenMat.emissiveIntensity = 0.8 + 0.12 * Math.sin(t * 2.3) * motion + 0.5 * glow;
        hotMat.emissiveIntensity = 0.6 + 0.5 * glow;
        if (moltenTex) moltenTex.offset.y = (t * 0.04) % 1;
        coreMat.emissiveIntensity = (1.0 + 0.8 * pull + 1.6 * flash) * (0.85 + 0.15 * Math.sin(t * 2.2));
        moltenMat.emissiveIntensity += 0.5 * pull + 0.8 * flash;
        hotMat.emissiveIntensity += 0.5 * pull + 0.8 * flash;

        trail.forEach(a => {
          a.visible = trailK > 0.02;
          if (!a.visible) return;
          a.position.set(-0.22, TIP + 1.28, 0.34);
          a.rotation.set(-0.6, 0.0, Math.PI + 0.24);
          trailMat.opacity = 0.55 * trailK;
        });

        const handBig = big.worldToLocal(handR.getWorldPosition(V3(0, 0, 0)));
        const coreBig = big.worldToLocal(port.getWorldPosition(V3(0, 0, 0)));
        const sockBig = big.worldToLocal(socket.localToWorld(V3(0.04, -0.13, 0.02)));
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
          const f = nm === "fling" ? (p - st) / 0.4 : -1;
          b.visible = f > 0 && f < 1;
          if (!b.visible) return;
          const dir = V3(-0.12 + i * 0.12, 0.02, 1);
          b.position.copy(coreBig).addScaledVector(dir, 0.15 + f * 2.6);
          b.position.y += Math.sin(f * Math.PI) * 0.35 - f * 0.8;
          b.scale.set(1, 1 + 0.6 * (1 - f), 1);
          b.rotation.x = f * 3;
        });

        const sparkK = nm === "swipe" ? (p > 0.42 && p < 0.7 ? smooth(0.42, 0.7, p) : -1) : nm === "fling" ? (p > 0.46 && p < 0.76 ? smooth(0.46, 0.76, p) : -1) : -1;
        const sparkAt = nm === "fling" ? coreBig.clone().add(V3(0, 0, 0.12)) : handBig;
        sparks.forEach(sp => {
          sp.m.visible = sparkK >= 0;
          if (!sp.m.visible) return;
          const r = 0.1 + sparkK * 0.55 * sp.v;
          sp.m.position.copy(sparkAt).add(V3(Math.cos(sp.a) * r, Math.sin(sp.a) * r * 0.8 - sparkK * sparkK * 0.3, Math.sin(sp.a * 2) * r * 0.4 + 0.1));
          sp.m.lookAt(sparkAt);
          sparkMat.opacity = 1 - sparkK;
        });

        motes.forEach(M => {
          M.m.visible = Math.max(pull, chargeK) > 0.02;
          if (!M.m.visible) return;
          const f = (t * 0.9 + M.off) % 1;
          const k = 1 - f;
          const ang = M.a + f * 2.4;
          M.m.position.copy(coreBig).add(V3(Math.cos(ang) * M.r * k, Math.sin(ang * 1.3) * M.r * 0.6 * k, Math.abs(Math.sin(ang)) * M.r * k + 0.1 * k));
          M.m.scale.setScalar(0.6 + 0.8 * k);
          motesMat.opacity = 0.9 * Math.max(pull, chargeK);
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
