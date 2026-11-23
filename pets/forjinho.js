Pets.register({
  id: "forjinho",
  dex: 47,
  name: "Forjinho",
  color: "#8d949c",
  types: ["steel"],
  move: "fly",
  description: "Um golenzinho de aço que ganhou vida com o braço esquerdo ainda derretido. O metal nunca chegou a esfriar e vive pingando gotas incandescentes por onde ele passa. Não tem pernas: flutua sobre a ponta do corpo, gira feito pião quando fica contente e cutuca tudo que encontra com o outro bracinho.",
  actions: {
    jump: { duration: 1.2 },
    eat: { duration: 2.6 },
    swipe: { duration: 1.3 },
    fling: { duration: 1.8 },
    spin: { duration: 1.6 },
    poke: { duration: 1.9 }
  },
  battle: { attack: { action: "swipe", hit: 0.44, speed: 1.0 }, special: { action: "fling", hit: 0.6, speed: 1.0 } },
  idle: [
    { action: "poke", min: 12, max: 30 },
    { action: "spin", min: 25, max: 55 },
    { action: "swipe", min: 35, max: 70 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["spin", "poke", "jump", "swipe", "fling"][(n - 1) % 5],

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

    const TIP = 0.3;
    const ZS = 0.88;

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

    const moltenTex = canvas(256, 256, (g, W, H) => {
      const N = 7;
      const pts = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) pts.push([(i + 0.15 + rnd() * 0.7) / N, (j + 0.15 + rnd() * 0.7) / N, rnd()]);
      const img = g.createImageData(W, H);
      const d = img.data;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const u0 = x / W;
          const v0 = y / H;
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
          const crust = isCrust ? smooth(0.012, 0.04, edge) : 0;
          const rim = isCrust ? smooth(0.0, 0.012, edge) * (1 - smooth(0.012, 0.03, edge)) : 0;
          const heat = lerp(0.45, 1, u0);
          const mot = 0.5 + 0.25 * Math.sin(u0 * TAU * 5 + Math.sin(v0 * TAU * 2) * 2) + 0.25 * Math.sin(v0 * TAU * 3 + u0 * TAU * 3);
          const hk = Math.min(1, heat * (0.82 + 0.3 * mot));
          let r = lerp(185, 255, hk);
          let gg = lerp(48, 150, hk * hk);
          let b = lerp(12, 46, hk * hk);
          r = lerp(r, 255, rim * 0.8);
          gg = lerp(gg, 190, rim * 0.8);
          b = lerp(b, 80, rim * 0.8);
          const n = (rnd() - 0.5) * 12;
          r = lerp(r, 62 + n, crust);
          gg = lerp(gg, 55 + n, crust);
          b = lerp(b, 52 + n, crust);
          const o = (y * W + x) * 4;
          d[o] = r;
          d[o + 1] = gg;
          d[o + 2] = b;
          d[o + 3] = 255;
        }
      g.putImageData(img, 0, 0);
    });
    if (moltenTex) moltenTex.wrapT = THREE.RepeatWrapping;
    const moltenMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, map: moltenTex, emissive: 0xffffff, emissiveMap: moltenTex, emissiveIntensity: 0.7, roughness: 0.45, metalness: 0.1 });
    if (!moltenTex) moltenMat.color.set(0xff7a1e);
    if (!moltenTex) moltenMat.emissive.set(0xc04010);
    const hotTex = canvas(128, 128, (g, W, H) => {
      g.fillStyle = "#f07a26";
      g.fillRect(0, 0, W, H);
      for (let k = 0; k < 40; k++) {
        const x = rnd() * W;
        const y = rnd() * H;
        const r = 6 + rnd() * 14;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, rnd() > 0.5 ? "rgba(255,196,80,0.7)" : "rgba(196,60,16,0.6)");
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let k = 0; k < 3; k++) {
        g.fillStyle = "rgba(90,52,40,0.5)";
        g.beginPath();
        g.ellipse(rnd() * W, rnd() * H * 0.5, 3 + rnd() * 7, 2 + rnd() * 5, rnd() * 3, 0, TAU);
        g.fill();
      }
    });
    const hotMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, map: hotTex, emissive: 0xffffff, emissiveMap: hotTex, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.1 });
    if (!hotTex) hotMat.color.set(0xe8702a);
    if (!hotTex) hotMat.emissive.set(0xd84a10);
    const clawHot = new THREE.MeshStandardMaterial({ color: 0xc8742a, emissive: 0xf06a18, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.1 });

    const PROF = new THREE.SplineCurve([V2(0.0, 0.0), V2(0.02, 0.06), V2(0.045, 0.15), V2(0.078, 0.25), V2(0.125, 0.34), V2(0.192, 0.42), V2(0.25, 0.51), V2(0.276, 0.61), V2(0.272, 0.71), V2(0.238, 0.8), V2(0.165, 0.87), V2(0.075, 0.905), V2(0.0, 0.915)]).getPoints(90);
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
    const torsoGeo = new THREE.LatheGeometry(PROF, 72);
    const torsoMesh = mesh(torsoGeo, steelMat);
    torsoMesh.scale.z = ZS;
    torsoMesh.rotation.y = Math.PI;
    torso.add(torsoMesh);

    const HW = 0.4;
    const HH = 0.38;
    const HD = 0.37;
    const PE = 2;
    const sq = (x, y, z) => Math.pow(Math.pow(Math.abs(x), PE) + Math.pow(Math.abs(y), PE) + Math.pow(Math.abs(z), PE), 1 / PE);
    const onHead = (x, y, z) => {
      const d = V3(x, y, z).normalize();
      const f = sq(d.x, d.y, d.z);
      return V3((d.x / f) * HW, (d.y / f) * HH, (d.z / f) * HD);
    };
    const headGeo = new THREE.SphereGeometry(1, 72, 54);
    headGeo.rotateY(-Math.PI / 2);
    {
      const p = headGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const q = onHead(p.getX(i), p.getY(i), p.getZ(i));
        p.setXYZ(i, q.x, q.y, q.z);
      }
      headGeo.computeVertexNormals();
    }
    const neck = new THREE.Group();
    neck.position.set(0, TIP + 0.88, 0);
    bodyG.add(neck);
    const head = new THREE.Group();
    head.position.y = 0.33;
    neck.add(head);
    const skull = mesh(headGeo, steelMat);
    head.add(skull);
    const neckMesh = mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.16, 24), steelMat);
    neckMesh.position.y = 0.04;
    neck.add(neckMesh);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x8b9199, roughness: 0.4, metalness: 0.4 });
    const crest = (() => {
      const P = (x, y) => V3(x * HW, y * HH, Math.sqrt(Math.max(0, 1 - x * x - y * y)) * HD);
      const N = p => V3(p.x / (HW * HW), p.y / (HH * HH), p.z / (HD * HD)).normalize();
      const path = [];
      const K = 24;
      for (let i = 0; i <= K; i++) path.push([lerp(-0.46, 0, i / K), lerp(0.87, 0.55, i / K)]);
      for (let i = 1; i <= K; i++) path.push([lerp(0, 0.46, i / K), lerp(0.55, 0.87, i / K)]);
      const pts = path.map(([x, y]) => P(x, y));
      const pos = [];
      const idx = [];
      const M = pts.length;
      pts.forEach((p, i) => {
        const n = N(p);
        const tIn = p.clone().sub(pts[Math.max(0, i - 1)]);
        const tOut = pts[Math.min(M - 1, i + 1)].clone().sub(p);
        if (tIn.lengthSq() < 1e-10) tIn.copy(tOut);
        if (tOut.lengthSq() < 1e-10) tOut.copy(tIn);
        tIn.normalize();
        tOut.normalize();
        const t = tIn.clone().add(tOut).normalize();
        const b = n.clone().cross(t).normalize();
        const bIn = n.clone().cross(tIn).normalize();
        const ax = Math.abs(path[i][0]) / 0.46;
        const w = (0.046 * lerp(1, 0.7, ax) * (1 - 0.92 * smooth(0.62, 1, ax))) / Math.max(0.35, b.dot(bIn));
        const h = 0.02 * (1 - 0.6 * smooth(0.7, 1, ax));
        const lo = -0.012;
        pos.push(...p.clone().addScaledVector(n, h).addScaledVector(b, w * 0.78).toArray());
        pos.push(...p.clone().addScaledVector(n, h).addScaledVector(b, -w * 0.78).toArray());
        pos.push(...p.clone().addScaledVector(n, lo).addScaledVector(b, -w).toArray());
        pos.push(...p.clone().addScaledVector(n, lo).addScaledVector(b, w).toArray());
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
      g.setIndex(idx);
      const ng = g.toNonIndexed();
      ng.computeVertexNormals();
      return ng;
    })();
    head.add(mesh(crest, plateMat));
    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      const n = onHead(0.36 * s, 0.02, 1);
      const nd = V3(n.x / (HW * HW), n.y / (HH * HH), n.z / (HD * HD)).normalize();
      g.position.copy(n).addScaledVector(nd, -0.074);
      g.quaternion.setFromUnitVectors(V3(0, 0, 1), nd.add(V3(0, 0, 0.9)).normalize());
      head.add(g);
      const e = eye({ size: 0.72, whiteColor: 0xf6f8fb, pupilColor: 0x12161d });
      g.add(e.g);
      return { g: e.g, pupil: e.pupil };
    });
    const mouthG = new THREE.Group();
    const mz = onHead(0, -0.17 / HH, 1).z;
    mouthG.position.set(0, -0.17, mz + 0.002);
    mouthG.rotation.x = -0.12;
    head.add(mouthG);
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.058, 24), mouthMat);
    mouthG.add(mouth);
    const smile = mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 20, Math.PI), mouthMat, false);
    smile.rotation.z = Math.PI;
    smile.position.y = 0.012;
    mouthG.add(smile);

    const SH = TIP + 0.71;
    const shoulders = [-1, 1].map(s => V3(s * 0.262, SH, 0.0));
    const shR = mesh(new THREE.SphereGeometry(0.082, 24, 16), steelMat);
    shR.position.copy(shoulders[0]);
    bodyG.add(shR);
    const crust = mesh(new THREE.SphereGeometry(0.082, 24, 16), steelMat);
    crust.position.copy(shoulders[1]);
    bodyG.add(crust);

    const dyn = m => {
      const o = new THREE.Mesh(new THREE.BufferGeometry(), m);
      o.castShadow = true;
      o.frustumCulled = false;
      bodyG.add(o);
      return o;
    };
    const flexTube = (m, pts, rf, n = 40, rs = 14) => {
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
    const armR = dyn(steelMat);
    const armL = dyn(moltenMat);
    const handR = new THREE.Group();
    bodyG.add(handR);
    const mitt = mesh(new THREE.SphereGeometry(0.09, 28, 20), steelMat);
    mitt.scale.set(1.12, 0.72, 1.2);
    mitt.position.z = 0.07;
    handR.add(mitt);
    const thumbR = new THREE.Group();
    thumbR.position.set(0.07, 0.012, 0.035);
    thumbR.rotation.set(-0.3, 0.75, 0);
    handR.add(thumbR);
    {
      const th = mesh(new THREE.SphereGeometry(0.034, 18, 14), steelMat);
      th.scale.set(0.95, 0.85, 1.6);
      th.position.z = 0.035;
      thumbR.add(th);
    }
    const handL = new THREE.Group();
    bodyG.add(handL);
    const palmGeo = new THREE.SphereGeometry(0.092, 32, 24);
    {
      const q = palmGeo.attributes.position;
      for (let i = 0; i < q.count; i++) {
        const v = V3(q.getX(i), q.getY(i), q.getZ(i));
        const n = v.clone().normalize();
        const k = 1 + 0.035 * Math.sin(n.x * 4 + n.y * 2) * Math.cos(n.z * 3 - n.y * 2) + 0.1 * Math.max(0, -n.y - 0.55);
        v.multiplyScalar(k);
        q.setXYZ(i, v.x, v.y, v.z);
      }
      palmGeo.computeVertexNormals();
    }
    const palm = mesh(palmGeo, hotMat);
    palm.scale.set(1.05, 0.9, 1.1);
    handL.add(palm);
    const clawGeo = (() => {
      const c = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0, 0.01, 0.045), V3(0, -0.006, 0.09), V3(0, -0.04, 0.125)]);
      const n = 16;
      const rs = 10;
      const g = new THREE.TubeGeometry(c, n, 1, rs - 1, false);
      const p = g.attributes.position;
      for (let i = 0; i <= n; i++) {
        const cp = c.getPointAt(i / n);
        const r = lerp(0.022, 0.002, Math.pow(i / n, 1.2));
        for (let j = 0; j < rs; j++) {
          const k = i * rs + j;
          p.setXYZ(k, cp.x + (p.getX(k) - cp.x) * r * 1.1, cp.y + (p.getY(k) - cp.y) * r * 0.85, cp.z + (p.getZ(k) - cp.z) * r);
        }
      }
      g.computeVertexNormals();
      return g;
    })();
    const claws = [-1, 0, 1].map(c => {
      const pv = new THREE.Group();
      pv.position.set(c * 0.048, -0.01 - Math.abs(c) * 0.01, 0.07 - Math.abs(c) * 0.012);
      pv.rotation.y = c * 0.28;
      handL.add(pv);
      const base = mesh(new THREE.SphereGeometry(0.03, 14, 10), hotMat);
      base.scale.set(0.9, 0.8, 1.3);
      pv.add(base);
      const cl = mesh(clawGeo, clawHot);
      cl.position.z = 0.015;
      cl.scale.setScalar(0.82);
      pv.add(cl);
      return pv;
    });
    const thumb = new THREE.Group();
    thumb.position.set(-0.075, -0.015, 0.03);
    thumb.rotation.y = -1.0;
    handL.add(thumb);
    {
      const cl = mesh(clawGeo, clawHot);
      cl.scale.setScalar(0.75);
      thumb.add(cl);
    }

    const dropGeo = new THREE.LatheGeometry([V2(0.0001, -0.035), V2(0.018, -0.028), V2(0.026, -0.012), V2(0.022, 0.006), V2(0.012, 0.022), V2(0.004, 0.034), V2(0.0001, 0.038)], 16);
    const drops = [0, 1, 2].map(k => {
      const m = mesh(dropGeo, hotMat, false);
      m.visible = false;
      big.add(m);
      return { m, off: k / 3, per: 2.2 + k * 0.5, cyc: -1, from: V3(0, 0, 0) };
    });
    const lumps = [0.3, 0.55, 0.8].map((u, i) => {
      const m = mesh(dropGeo, moltenMat, false);
      bodyG.add(m);
      return { m, u, k: [1.05, 0.85, 1.15][i] };
    });
    const blobs = [0, 1, 2].map(k => {
      const m = mesh(new THREE.SphereGeometry(0.06 - k * 0.01, 16, 12), hotMat, false);
      m.visible = false;
      big.add(m);
      return m;
    });
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 1, depthWrite: false });
    const sparks = Array.from({ length: 8 }, (_, k) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.07), sparkMat);
      m.visible = false;
      big.add(m);
      return { m, a: (k / 8) * TAU, v: 0.8 + (k % 3) * 0.35 };
    });
    const trailMat = new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const trail = [0, 1].map(i => {
      const a = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.07, 0.014, 6, 40, 2.2), trailMat);
      a.visible = false;
      bodyG.add(a);
      return a;
    });

    const food = berry();
    food.visible = false;
    big.add(food);

    const REST_R = V3(-0.56, TIP + 0.4, 0.22);
    const REST_L = V3(0.57, TIP + 0.38, 0.22);
    const L1 = 0.25;
    const L2 = 0.35;

    return {
      root,
      update(s) {
        const { t, pointer, blink, lookYaw, lookPitch, action, motion } = s;
        const nm = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = nm === "eat" ? eatPhase(p) : null;

        let hover = Math.sin(t * 1.5) * 0.05 * motion;
        let lean = Math.sin(t * 0.8) * 0.03 * motion;
        let roll = Math.sin(t * 1.1) * 0.025 * motion;
        let spinY = 0;
        let squash = 1;
        let headYaw = lookYaw * 0.5;
        let headPitch = -lookPitch * 0.3;
        let headRoll = 0;
        let mouthK = 0;
        let glow = 0;
        let trailK = 0;
        let sparkK = 0;
        const hR = REST_R.clone().add(V3(0, Math.sin(t * 1.7) * 0.02 * motion, 0));
        const hL = REST_L.clone().add(V3(0, Math.sin(t * 1.7 + 1.2) * 0.025 * motion, 0));
        let tipR = null;

        if (nm === "jump") {
          const c = smooth(0.02, 0.2, p) * (1 - smooth(0.2, 0.3, p));
          const air = Math.sin(Math.PI * smooth(0.22, 0.8, p));
          const land = p > 0.78 ? Math.sin(Math.PI * smooth(0.78, 1, p)) : 0;
          hover += -0.1 * c + 0.75 * air - 0.05 * land;
          squash = 1 - 0.1 * c + 0.06 * air - 0.08 * land;
          hR.lerp(V3(-0.46, TIP + 0.98, 0.1), air);
          hL.lerp(V3(0.48, TIP + 0.95, 0.1), air);
          headPitch -= 0.25 * air;
          mouthK = 0.6 * air;
        } else if (nm === "eat" && ph) {
          const reach = smooth(0.0, 0.22, p) * (1 - smooth(0.88, 1, p));
          const bring = smooth(0.3, 0.46, p) * (1 - smooth(0.86, 0.98, p));
          hR.lerp(V3(-0.36, TIP + 0.72, 0.5), reach);
          hR.lerp(V3(-0.08, TIP + 0.88, 0.42), bring);
          headPitch += 0.18 * reach * (1 - bring);
          headYaw += -0.25 * reach * (1 - bring);
          mouthK = bring * (0.35 + 0.65 * ph.chew) * (1 - smooth(0.8, 0.9, p));
          if (p > 0.88) mouthK = 0;
        } else if (nm === "swipe") {
          const wind = smooth(0.04, 0.3, p) * (1 - smooth(0.34, 0.44, p));
          const strike = smooth(0.34, 0.46, p) * (1 - smooth(0.7, 0.95, p));
          hL.lerp(V3(0.62, TIP + 0.95, -0.22), wind);
          hL.lerp(V3(-0.12, TIP + 0.5, 0.66), strike);
          spinY = -0.45 * wind + 0.5 * strike;
          lean = 0.12 * strike - 0.05 * wind;
          trailK = p > 0.36 && p < 0.62 ? Math.sin(Math.PI * smooth(0.36, 0.62, p)) : 0;
          glow = 0.5 * wind + 0.6 * strike;
          mouthK = 0.5 * strike;
        } else if (nm === "fling") {
          const raise = smooth(0.04, 0.35, p) * (1 - smooth(0.4, 0.5, p));
          const throwK = smooth(0.4, 0.5, p) * (1 - smooth(0.72, 0.95, p));
          hL.lerp(V3(0.36, TIP + 1.25, -0.2), raise);
          hL.lerp(V3(0.22, TIP + 0.72, 0.68), throwK);
          lean = -0.1 * raise + 0.16 * throwK;
          spinY = -0.2 * raise + 0.25 * throwK;
          hR.lerp(V3(-0.46, TIP + 0.62, 0.3), raise + throwK);
          glow = 1.2 * raise + 0.6 * throwK;
          headPitch += 0.15 * raise;
          mouthK = 0.7 * throwK;
          hover += 0.08 * raise;
        } else if (nm === "spin") {
          const k = smooth(0.0, 0.15, p) * (1 - smooth(0.85, 1, p));
          spinY = smooth(0.08, 0.9, p) * TAU * 2;
          hover += 0.12 * k;
          hR.lerp(V3(-0.6, TIP + 0.7, 0.0), k);
          hL.lerp(V3(0.6, TIP + 0.7, 0.0), k);
          lean = Math.sin(t * 9) * 0.05 * k;
          roll = Math.cos(t * 9) * 0.05 * k;
          mouthK = 0.5 * k;
          sparkK = 0;
        } else if (nm === "poke") {
          const up = smooth(0.0, 0.15, p) * (1 - smooth(0.85, 1, p));
          const pk = q => (p > q && p < q + 0.16 ? Math.sin(Math.PI * smooth(q, q + 0.16, p)) : 0);
          const jab = pk(0.18) + pk(0.38) + pk(0.58);
          hR.lerp(V3(-0.24, TIP + 0.66, 0.5), up);
          hR.add(V3(0.04, 0.02, 0.2).multiplyScalar(jab));
          headRoll = 0.22 * up;
          headPitch += 0.2 * up;
          headYaw += -0.15 * up;
          lean = 0.06 * up + 0.04 * jab;
        }

        bodyG.position.y = hover;
        bodyG.rotation.set(lean, spinY, roll);
        bodyG.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
        neck.rotation.set(headPitch * 0.35, headYaw * 0.3, headRoll * 0.3);
        head.rotation.set(headPitch * 0.65, headYaw * 0.7, headRoll * 0.7);
        mouth.scale.set(1, lerp(0.05, 1, mouthK), 1);
        mouth.visible = mouthK > 0.03;
        smile.visible = mouthK < 0.25;

        const close = 1 - blink;
        eyes.forEach(({ g }) => {
          g.scale.y = lerp(1, 0.1, close);
        });
        followPupils(eyes, pointer, 0.55);

        root.updateMatrixWorld(true);

        {
          const A = shoulders[0];
          const r = ik(A, hR, L1, L2, V3(0, -0.6, -0.4));
          const pts = [A.clone(), A.clone().lerp(r.elbow, 0.5), r.elbow, r.elbow.clone().lerp(r.end, 0.5), r.end];
          const c = flexTube(armR, pts, u => 0.062 + 0.008 * Math.sin(u * Math.PI));
          const end = c.getPointAt(1);
          const d = c.getTangentAt(1);
          const hx = V3(0, 1, 0).cross(d);
          if (hx.lengthSq() < 1e-4) hx.set(1, 0, 0);
          hx.normalize();
          const hy = d.clone().cross(hx);
          handR.position.copy(end);
          handR.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, d));
          tipR = { pos: end.clone().addScaledVector(d, 0.06).addScaledVector(hy, 0.07), dir: d };
        }
        {
          const A = shoulders[1];
          const r = ik(A, hL, L1, L2, V3(0, -0.6, -0.4));
          const pts = [A.clone(), A.clone().lerp(r.elbow, 0.5), r.elbow, r.elbow.clone().lerp(r.end, 0.5), r.end];
          const c = flexTube(armL, pts, (u, v) => {
            const a = v * TAU;
            const wob = 1 + (0.045 * Math.sin(a * 2 + u * 5 - t * 2.6) + 0.03 * Math.sin(a * 3 - u * 4 + t * 1.9)) * motion;
            const sag = 1 + 0.12 * Math.max(0, -Math.sin(a)) * Math.sin(u * Math.PI);
            return lerp(0.082, 0.068, u) * wob * sag;
          }, 44, 18);
          const end = c.getPointAt(1);
          const d = c.getTangentAt(1);
          const hx = V3(0, 1, 0).cross(d);
          if (hx.lengthSq() < 1e-4) hx.set(1, 0, 0);
          hx.normalize();
          const hy = d.clone().cross(hx);
          handL.position.copy(end).addScaledVector(d, 0.04);
          handL.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, d));
          const open = nm === "swipe" ? smooth(0.2, 0.34, p) * (1 - smooth(0.5, 0.7, p)) : nm === "fling" ? smooth(0.42, 0.5, p) * (1 - smooth(0.7, 0.9, p)) : 0;
          claws.forEach((pv, i) => {
            pv.rotation.x = -0.1 - 0.25 * open + Math.sin(t * 2 + i) * 0.04 * motion;
          });
          moltenMat.emissiveIntensity = 0.8 + 0.12 * Math.sin(t * 2.3) * motion + 0.5 * glow;
          hotMat.emissiveIntensity = 0.6 + 0.5 * glow;
          clawHot.emissiveIntensity = 0.65 + 0.5 * glow;
          lumps.forEach((L, i) => {
            const q = c.getPointAt(L.u);
            const rr = lerp(0.082, 0.068, L.u);
            const w = 1 + 0.2 * Math.sin(t * 2.4 + i * 2) * motion;
            L.m.position.copy(q).add(V3(0, -rr * 0.86 - 0.02 * L.k * w, 0));
            L.m.scale.set(L.k * 1.5, L.k * 1.7 * w, L.k * 1.5);
          });
        }
        if (moltenTex) moltenTex.offset.y = (t * 0.04) % 1;

        trail.forEach((a, i) => {
          a.visible = trailK > 0.02;
          if (!a.visible) return;
          a.position.set(0.15, TIP + 1.0, 0.25);
          a.rotation.set(-0.6, 0.0, -2.44);
          trailMat.opacity = 0.55 * trailK;
        });

        const handBig = big.worldToLocal(handL.getWorldPosition(V3(0, 0, 0)));
        drops.forEach(D => {
          const on = nm !== "spin";
          const u = (t / D.per + D.off) % 1;
          const cyc = Math.floor(t / D.per + D.off);
          if (u < 0.62 || D.cyc !== cyc) {
            if (u < 0.62) D.cyc = -1;
          }
          if (!on) {
            D.m.visible = false;
            return;
          }
          if (u < 0.62) {
            const g = smooth(0.0, 0.62, u);
            D.m.visible = g > 0.05;
            D.m.position.copy(handBig).add(V3(0.0, -0.08 - 0.03 * g, 0.03));
            D.m.scale.set(0.55 + 0.45 * g, 0.5 + 0.9 * g, 0.55 + 0.45 * g);
            D.from.copy(D.m.position);
          } else {
            if (D.cyc !== cyc) {
              D.cyc = cyc;
              D.from.copy(handBig).add(V3(0, -0.11, 0.03));
            }
            const f = (u - 0.62) / 0.38;
            const y = D.from.y - 4.5 * f * f * 0.38 * 0.38 * 4;
            D.m.visible = y > 0.04;
            D.m.position.set(D.from.x, y, D.from.z);
            const k = Math.max(0, 1 - f * 1.1);
            D.m.scale.set(0.9 * k, 1.5 * k, 0.9 * k);
          }
        });

        blobs.forEach((b, i) => {
          const st = 0.47 + i * 0.03;
          const f = nm === "fling" ? (p - st) / 0.4 : -1;
          b.visible = f > 0 && f < 1;
          if (!b.visible) return;
          const from = V3(0.25, TIP + 1.0, 0.7);
          const dir = V3(-0.15 + i * 0.15, 0, 1);
          b.position.copy(from).addScaledVector(dir, f * 2.4);
          b.position.y += Math.sin(f * Math.PI) * 0.45 - f * 0.8;
          b.scale.set(1, 1 + 0.6 * (1 - f), 1);
          b.rotation.x = f * 3;
        });

        sparkK = nm === "swipe" ? (p > 0.42 && p < 0.7 ? smooth(0.42, 0.7, p) : -1) : nm === "fling" ? (p > 0.5 && p < 0.8 ? smooth(0.5, 0.8, p) : -1) : -1;
        sparks.forEach(sp => {
          sp.m.visible = sparkK >= 0;
          if (!sp.m.visible) return;
          const r = 0.08 + sparkK * 0.5 * sp.v;
          sp.m.position.copy(handBig).add(V3(Math.cos(sp.a) * r, Math.sin(sp.a) * r * 0.8 - sparkK * sparkK * 0.3, Math.sin(sp.a * 2) * r * 0.4 + 0.1));
          sp.m.lookAt(handBig);
          sparkMat.opacity = 1 - sparkK;
        });

        if (nm === "eat" && ph && tipR) {
          food.visible = ph.visible && p < 0.9;
          const tipW = bodyG.localToWorld(tipR.pos.clone());
          const center = big.worldToLocal(tipW);
          const lifted = V3(-0.36, 3.4, 0.6);
          food.position.copy(lifted.lerp(center, ph.fall * ph.fall));
          food.scale.setScalar(0.5 * (1 - 0.8 * ph.bite));
        } else food.visible = false;
      }
    };
  }
});
