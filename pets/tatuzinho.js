Pets.register({
  id: "tatuzinho",
  dex: 40,
  name: "Tatuzinho",
  color: "#c9a26a",
  types: ["ground", "steel"],
  description: "Um tatuzinho medroso de casco cheio de plaquinhas. Ao menor susto se fecha numa bola perfeita, encaixando a cabeça e o rabo como peças de quebra-cabeça, e sai rolando até se sentir seguro.",
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    curl: { duration: 2.8 },
    roll: { duration: 2.3 },
    dig: { duration: 2.2 },
    sniff: { duration: 1.9 },
    spin: { duration: 2.2 }
  },
  battle: { attack: { action: "roll", hit: 0.48, speed: 1.0 }, special: { action: "spin", hit: 0.68, speed: 1.0 } },
  idle: [
    { action: "sniff", min: 12, max: 30 },
    { action: "curl", min: 30, max: 60 },
    { action: "dig", min: 40, max: 80 }
  ],
  clickAction: n => ["curl", "sniff", "jump", "roll"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const TAU = Math.PI * 2;

    const root = new THREE.Group();
    const bodyG = new THREE.Group();
    root.add(bodyG);

    const R = 0.62;
    const BANDS = [-0.12, 0.03, 0.18, 0.33];

    const shellTex = (() => {
      if (typeof document === "undefined") return null;
      const W = 512;
      const H = 256;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = "#d3ac70";
      g.fillRect(0, 0, W, H);
      const ux = u => ((u + 1) / 2) * W;
      const hex = (cx, cy, r, fill, edge) => {
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + Math.PI / 6;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
        g.fillStyle = fill;
        g.fill();
        g.lineWidth = 2.4;
        g.strokeStyle = edge;
        g.stroke();
      };
      const shield = (x0, x1) => {
        g.save();
        g.beginPath();
        g.rect(x0, 0, x1 - x0, H);
        g.clip();
        const r = 13;
        for (let row = -1; row * r * 1.5 < H + r; row++) {
          for (let col = -1; col * r * 1.732 < W + r; col++) {
            const cx = col * r * 1.732 + (row % 2 ? r * 0.866 : 0);
            const cy = row * r * 1.5;
            hex(cx, cy, r - 1.2, "#dcb57a", "#8d6a3a");
            g.beginPath();
            g.arc(cx, cy, r * 0.42, 0, TAU);
            g.fillStyle = "#e9c58c";
            g.fill();
            g.beginPath();
            g.arc(cx - 2, cy - 2, r * 0.16, 0, TAU);
            g.fillStyle = "#f6dcae";
            g.fill();
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
        gr.addColorStop(0, "#7c6d5c");
        gr.addColorStop(0.75, "#a99680");
        gr.addColorStop(1, "#bca88f");
        g.fillStyle = gr;
        g.fillRect(x0, 0, x1 - x0, H);
        for (let y = 0; y < H; y += 14) {
          g.fillStyle = "#6a5c4c";
          g.fillRect(x0, y, x1 - x0, 2);
          g.beginPath();
          g.moveTo(x0, y + 2);
          g.lineTo(x0 + (x1 - x0) * 0.35, y + 7);
          g.lineTo(x0, y + 12);
          g.closePath();
          g.fillStyle = "#5d5042";
          g.fill();
          g.beginPath();
          g.arc(x1 - 6, y + 7, 2.2, 0, TAU);
          g.fillStyle = "#e4d6c0";
          g.fill();
        }
        g.fillStyle = "#4d4136";
        g.fillRect(x0, 0, 3, H);
      }
      const side = g.createLinearGradient(0, 0, 0, H);
      side.addColorStop(0, "rgba(70,45,20,0.35)");
      side.addColorStop(0.12, "rgba(70,45,20,0)");
      side.addColorStop(0.88, "rgba(70,45,20,0)");
      side.addColorStop(1, "rgba(70,45,20,0.35)");
      g.fillStyle = side;
      g.fillRect(0, 0, W, H);
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      return t;
    })();

    const shellMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: shellTex, roughness: 0.55, metalness: 0.18, side: THREE.DoubleSide });
    const skinMat = mat(0xeccbaa, 0.75);
    const pinkMat = mat(0xe39a9a, 0.6);
    const clawMat = mat(0x5a4632, 0.5);
    const darkMat = mat(0x2a201a, 0.5);

    const NU = 72;
    const NV = 44;
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
        if (i === 0) return;
        const d = u - b;
        r += 0.045 * Math.exp(-((d + 0.012) * (d + 0.012)) / 0.0003) - 0.02 * Math.exp(-((d - 0.02) * (d - 0.02)) / 0.0004);
      });
      const d0 = u - BANDS[0];
      r -= 0.025 * Math.exp(-(d0 * d0) / 0.0004);
      return r;
    };
    const shellShape = c => {
      const la0 = lerp(1.12, Math.PI * 0.49, c);
      const az0 = lerp(1.62, Math.PI * 0.99, c);
      const zs = lerp(1.26, 1, c);
      const ys = lerp(0.94, 1, c);
      for (let i = 0; i <= NU; i++) {
        const u = (i / NU) * 2 - 1;
        const la = u * la0;
        const rr = R * (1 + ridge(u));
        for (let j = 0; j <= NV; j++) {
          const v = (j / NV) * 2 - 1;
          const az = v * az0;
          const edge = 1 - 0.035 * Math.pow(Math.abs(v), 10) - 0.03 * Math.pow(Math.abs(u), 12);
          const k = (i * (NV + 1) + j) * 3;
          sPos[k] = rr * Math.cos(la) * Math.sin(az) * edge;
          sPos[k + 1] = rr * Math.cos(la) * Math.cos(az) * ys * edge;
          sPos[k + 2] = rr * Math.sin(la) * zs * edge;
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

    const belly = mesh(new THREE.SphereGeometry(0.5, 32, 20), skinMat);
    belly.scale.set(0.92, 0.66, 1.2);
    belly.position.y = -0.1;
    ballG.add(belly);
    const hairMat = mat(0xd9b48c, 0.9);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU;
      const h = mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.07, 4), hairMat, false);
      h.position.set(Math.cos(a) * 0.42, -0.08 + Math.sin(k * 1.7) * 0.03, Math.sin(a) * 0.52);
      h.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      belly.add(h);
    }

    const headPivot = new THREE.Group();
    ballG.add(headPivot);
    const head = new THREE.Group();
    headPivot.add(head);
    const skull = mesh(new THREE.SphereGeometry(0.34, 36, 26), skinMat);
    skull.scale.set(1, 0.9, 0.98);
    head.add(skull);
    const snoutGeo = new THREE.LatheGeometry(
      [V3(0.0001, 0.36, 0), V3(0.075, 0.34, 0), V3(0.11, 0.28, 0), V3(0.15, 0.16, 0), V3(0.2, 0.02, 0), V3(0.22, -0.04, 0)],
      28
    );
    snoutGeo.rotateX(Math.PI / 2);
    const snout = mesh(snoutGeo, skinMat);
    snout.scale.set(1, 0.82, 1);
    snout.position.set(0, -0.08, 0.18);
    snout.rotation.x = 0.16;
    head.add(snout);
    const nose = mesh(new THREE.SphereGeometry(0.07, 20, 14), pinkMat, false);
    nose.scale.set(1.15, 0.85, 0.6);
    nose.position.set(0, 0.0, 0.36);
    snout.add(nose);
    [-1, 1].forEach(s => {
      const n = mesh(new THREE.SphereGeometry(0.016, 10, 8), darkMat, false);
      n.position.set(0.028 * s, 0.0, 0.04);
      nose.add(n);
    });
    const helmet = mesh(new THREE.SphereGeometry(0.352, 36, 18, 0, TAU, 0, 0.82), new THREE.MeshStandardMaterial({ color: 0xffffff, map: shellTex, roughness: 0.55, metalness: 0.18 }));
    helmet.scale.set(0.86, 0.92, 1.04);
    helmet.rotation.x = -0.32;
    helmet.position.set(0, 0.015, -0.02);
    head.add(helmet);
    const ears = [-1, 1].map(s => {
      const eg = new THREE.Group();
      eg.position.set(0.19 * s, 0.2, -0.13);
      eg.rotation.set(-0.2, 0.5 * s, -0.55 * s);
      head.add(eg);
      const outer = mesh(new THREE.SphereGeometry(0.085, 18, 12, 0, TAU, 0, Math.PI * 0.55), skinMat);
      outer.scale.set(1, 1.35, 0.5);
      outer.rotation.x = -Math.PI / 2;
      eg.add(outer);
      const inner = mesh(new THREE.SphereGeometry(0.06, 16, 10, 0, TAU, 0, Math.PI * 0.5), pinkMat, false);
      inner.scale.set(1, 1.3, 0.35);
      inner.rotation.x = -Math.PI / 2;
      inner.position.z = 0.012;
      eg.add(inner);
      return eg;
    });
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.58, whiteColor: 0xfffaf2, pupilColor: 0x221a16 });
      e.g.position.set(0.155 * s, 0.04, 0.24);
      e.g.rotation.y = 0.42 * s;
      head.add(e.g);
      return e;
    });
    const lids = [-1, 1].map(s => {
      const l = mesh(new THREE.SphereGeometry(0.142, 20, 10, 0, TAU, 0, Math.PI * 0.5), skinMat, false);
      l.scale.set(1, 1.08, 0.6);
      l.position.set(0.155 * s, 0.04, 0.237);
      l.rotation.set(-1.3, 0.42 * s, 0);
      head.add(l);
      return l;
    });
    const blushes = [];
    [-1, 1].forEach(s => {
      const blush = mesh(new THREE.CircleGeometry(0.045, 18), new THREE.MeshStandardMaterial({ color: 0xf0a4a0, roughness: 0.8, transparent: true, opacity: 0.7 }), false);
      blush.position.set(0.23 * s, -0.09, 0.2);
      blush.lookAt(V3(0.23 * s, -0.09, 0.2).multiply(V3(2.2, 1, 2.4)));
      head.add(blush);
      blushes.push(blush);
    });
    const mouth = mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 14, Math.PI), darkMat, false);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.2, 0.25);
    head.add(mouth);

    const tailPivot = new THREE.Group();
    ballG.add(tailPivot);
    const tail = new THREE.Group();
    tailPivot.add(tail);
    const tailGeo = new THREE.CylinderGeometry(0.035, 0.085, 0.26, 18, 6);
    tailGeo.translate(0, -0.13, 0);
    const tailTex = shellTex ? shellTex.clone() : null;
    if (tailTex) {
      tailTex.needsUpdate = true;
      tailTex.repeat.set(0.5, 1);
      tailTex.wrapS = THREE.RepeatWrapping;
    }
    const tailM = mesh(tailGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, map: tailTex, roughness: 0.6, metalness: 0.12 }));
    tail.add(tailM);
    const tailRings = [];
    for (let k = 0; k < 3; k++) {
      const ring = mesh(new THREE.TorusGeometry(0.075 - k * 0.016, 0.007, 6, 18), new THREE.MeshStandardMaterial({ color: 0xa7814c, roughness: 0.6, metalness: 0.2 }), false);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.05 - k * 0.07;
      tail.add(ring);
      tailRings.push(ring);
    }
    const tailCap = mesh(new THREE.SphereGeometry(0.11, 20, 12, 0, TAU, 0, Math.PI * 0.5), shellMat);
    tailCap.scale.set(1.3, 0.5, 1.3);
    tailCap.rotation.x = Math.PI;
    tail.add(tailCap);

    const legs = [];
    [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1]
    ].forEach(([sx, sz]) => {
      const lg = new THREE.Group();
      lg.position.set(0.3 * sx, 0.28, sz > 0 ? 0.33 : -0.36);
      bodyG.add(lg);
      const thigh = mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.24, 14), skinMat);
      thigh.position.y = -0.1;
      lg.add(thigh);
      const foot = mesh(new THREE.SphereGeometry(0.085, 16, 10), skinMat);
      foot.scale.set(1, 0.6, sz > 0 ? 1.05 : 1.35);
      foot.position.set(0, -0.23, sz > 0 ? 0.03 : 0.04);
      lg.add(foot);
      const n = sz > 0 ? 3 : 4;
      for (let c = 0; c < n; c++) {
        const big = sz > 0 && c === 1;
        const cl = mesh(new THREE.ConeGeometry(big ? 0.026 : 0.018, big ? 0.13 : 0.08, 8), clawMat, false);
        cl.rotation.x = Math.PI / 2 + 0.5;
        cl.position.set((c - (n - 1) / 2) * 0.045, -0.255, 0.1 + (big ? 0.03 : 0));
        lg.add(cl);
      }
      legs.push({ lg, sx, sz });
    });

    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 1 });
    const dirt = [];
    for (let k = 0; k < 14; k++) {
      const m = mesh(new THREE.DodecahedronGeometry(0.035 + (k % 3) * 0.015), dirtMat, false);
      m.visible = false;
      root.add(m);
      dirt.push({ m, k, a: (k / 14) * 1.6 - 0.8, sp: 0.7 + (k % 4) * 0.22 });
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
    const C0 = 0.55;

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
        let headRoll = 0;
        let earK = 0;
        let impact = 0;
        let digK = 0;
        let sparkK = 0;
        let airborne = false;
        let peek = 0;

        if (nm === "jump") {
          if (p < 0.2) sy = 1 - 0.14 * Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.78) {
            const q = (p - 0.2) / 0.58;
            y = Math.sin(q * Math.PI) * 0.7;
            sy = 1 + 0.06 * Math.cos(q * Math.PI);
            airborne = true;
            curl = Math.sin(q * Math.PI) * 0.25;
            earK = 1;
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
          y = Math.abs(Math.sin(p * Math.PI * 3)) * 0.04 * smooth(0.2, 0.3, p) * (1 - smooth(0.4, 0.45, p));
        } else if (nm === "roll" || nm === "spin") {
          curl = smooth(0, 0.14, p) * (1 - smooth(0.86, 0.98, p));
          if (nm === "roll") {
            const q = smooth(0.12, 0.88, p);
            z = Math.sin(q * TAU) * 0.9;
            rollA = (z / R) * 1.0 + q * TAU;
            y = Math.abs(Math.sin(q * TAU * 2)) * 0.03;
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
          if (nm === "roll" && p > 0.86) impact = Math.sin(((p - 0.86) / 0.14) * Math.PI) * 0.5;
        } else if (nm === "dig") {
          digK = smooth(0.05, 0.15, p) * (1 - smooth(0.85, 0.97, p));
          headPitch = 0.45 * digK;
          sy -= 0.05 * digK;
        } else if (nm === "sniff") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.85, 1, p));
          headYaw = Math.sin(p * Math.PI * 4) * 0.45 * k;
          headPitch = -0.12 * k + Math.sin(t * 22) * 0.025 * k;
          earK = k * Math.abs(Math.sin(p * Math.PI * 6));
        } else if (nm === "eat") {
          headPitch = 0.15 * smooth(0.25, 0.35, p) * (1 - smooth(0.85, 0.95, p));
        }

        curl = Math.max(0, Math.min(1, curl));
        if (Math.abs(curl - lastCurl) > 0.0005) {
          shellShape(curl);
          lastCurl = curl;
        }

        const zs = lerp(1.24, 1, curl);
        const ys = lerp(0.92, 1, curl);
        const cy = lerp(C0, R + 0.01, curl);
        bodyG.position.set(0, y, z);
        bodyG.rotation.y = spinA;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch * (1 - curl);
        const sx = 1 / Math.sqrt(sy);
        ballG.scale.set(sx, sy, sx);
        ballG.position.set(0, cy, 0);
        ballG.rotation.x = rollA + (1 - curl) * Math.sin(t * 1.3) * 0.015 * motion;

        headPivot.position.set(0, lerp(-0.02, 0.0, curl), lerp(0.7, R * 0.66, curl));
        headPivot.rotation.set(-1.45 * smooth(0.35, 1, curl), 0, 0);
        head.scale.setScalar(lerp(1, 0.64, curl));
        const tucked = curl < 0.82;
        [skull, snout, mouth, ...ears, ...eyes.map(e => e.g), ...lids, ...blushes].forEach(o => (o.visible = tucked));
        head.rotation.set(headPitch + (airborne ? -0.15 : 0) + digK * Math.sin(t * 14) * 0.08, headYaw, headRoll);
        head.position.set(0, digK * -0.06, 0);

        tailPivot.position.set(0, lerp(-0.12, 0, curl), lerp(-0.66, -R * 0.95, curl));
        tailPivot.rotation.set(lerp(0.62, Math.PI / 2, curl), 0, 0);
        tailCap.visible = curl > 0.6;
        tail.rotation.set(Math.sin(t * 2.2) * 0.06 * motion * (1 - curl), 0, Math.sin(t * 1.7) * 0.15 * motion * (1 - curl));
        tail.scale.setScalar(lerp(1, 0.75, curl));
        tailM.visible = tucked;
        tailRings.forEach(r => (r.visible = tucked));

        belly.scale.set(0.92 * lerp(1, 0.8, curl), 0.66 * lerp(1, 0.9, curl), 1.2 * lerp(1, 0.75, curl));

        legs.forEach(({ lg, sx: lx, sz }, i) => {
          const tuck = 1 - curl;
          lg.scale.set(1, Math.max(0.001, tuck), 1);
          lg.position.y = lerp(0.42, 0.28, tuck);
          let swing = 0;
          if (digK > 0 && sz > 0) swing = Math.sin(t * 16 + (lx > 0 ? Math.PI : 0)) * 0.7 * digK;
          if (airborne) swing = -0.4 * sz;
          lg.rotation.x = swing + (digK > 0 && sz > 0 ? -0.3 * digK : 0);
          lg.visible = tuck > 0.02;
        });

        ears.forEach((e, i) => {
          const s = i ? 1 : -1;
          e.rotation.z = -0.55 * s + Math.sin(t * 9 + i) * 0.18 * earK - (airborne ? 0.3 * s : 0);
        });
        const shut = Math.max(curl > 0.5 ? 1 : 0, nm === "eat" && p > 0.35 && p < 0.85 ? 0.65 : 0, digK * 0.4);
        eyes.forEach(({ g }) => {
          g.scale.y = lerp(blink, 0.08, shut);
        });
        lids.forEach(l => {
          l.rotation.x = lerp(-1.35, -0.25, Math.max(shut, 1 - blink) * 0.95);
        });
        followPupils(eyes, peek > 0.2 ? { x: Math.sin(t * 3), y: -0.3 } : pointer, 0.7);
        mouth.scale.set(1, nm === "eat" && ph && ph.chew ? 0.4 + ph.chew * 0.8 : 1, 1);

        const fx = impact > 0.05;
        dust.forEach(d => {
          d.m.visible = fx;
          if (!fx) return;
          const u = 1 - impact;
          const r = 0.7 + u * 0.5;
          d.m.position.set(Math.cos(d.a) * r, 0.1 + u * 0.15, z + Math.sin(d.a) * r);
          d.m.scale.setScalar(0.6 + u * 0.8);
          dustMat.opacity = 0.45 * impact;
        });
        dirt.forEach(d => {
          d.m.visible = digK > 0.2;
          if (!d.m.visible) return;
          const q = (t * d.sp * 1.6 + d.k * 0.37) % 1;
          d.m.position.set(d.a * 0.6, 0.1 + Math.sin(q * Math.PI) * 0.7, 0.6 - q * 1.8);
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
          food.position.set(0, lerp(3.0, 0.3, ph.fall * ph.fall), 1.24);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.75);
        } else food.visible = false;
      }
    };
  }
});
