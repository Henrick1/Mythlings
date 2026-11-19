Pets.register({
  id: "carretilho",
  dex: 36,
  name: "Carretilho",
  color: "#f07a1a",
  types: ["electric"],
  evolvesTo: "embolado",
  evolveLevel: 16,
  description: "Um carretelzinho de fio que apareceu sozinho num canteiro de obras. Para andar ele desenrola um pedaço do próprio fio e puxa o corpo atrás, e quando leva um susto se enrola todo de novo e se esconde debaixo da aba de madeira.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 3.0 },
    zap: { duration: 2.0 },
    unwind: { duration: 3.0 },
    hide: { duration: 2.2 },
    spin: { duration: 1.4 },
    wobble: { duration: 1.5 },
    attack: { duration: 1.0 }
  },
  battle: { special: { action: "zap", hit: 0.55, speed: 1.1 } },
  idle: [
    { action: "unwind", min: 22, max: 45 },
    { action: "wobble", min: 30, max: 60 },
    { action: "spin", min: 40, max: 80 }
  ],
  clickAction: n => ["hide", "jump", "zap", "unwind", "spin"][(n - 1) % 5],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;
    const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    const TAU = Math.PI * 2;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const hasDoc = typeof document !== "undefined";
    let seed = 31;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    const rubber = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.4 });
    const metal = (c, r = 0.3) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    const copperMat = metal(0xd07a3c, 0.28);
    const nickelMat = metal(0xd9dbe0, 0.22);
    const cableMat = rubber(0xf07a1a);
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.7 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x5a1c24, roughness: 0.6 });

    const computeFrames = (S, T, N, B, n) => {
      for (let i = 0; i <= n; i++) {
        T[i].subVectors(S[Math.min(n, i + 1)], S[Math.max(0, i - 1)]);
        if (T[i].lengthSq() < 1e-10) T[i].set(0, 1, 0);
        T[i].normalize();
      }
      const up = Math.abs(T[0].y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0);
      N[0].crossVectors(T[0], up).normalize();
      B[0].crossVectors(T[0], N[0]).normalize();
      for (let i = 1; i <= n; i++) {
        B[i].crossVectors(T[i], N[i - 1]);
        if (B[i].lengthSq() < 1e-10) B[i].copy(B[i - 1]);
        B[i].normalize();
        N[i].crossVectors(B[i], T[i]).normalize();
      }
    };

    const flexTube = (nSeg, nRad, material, shadow = true) => {
      const vc = (nSeg + 1) * (nRad + 1);
      const pos = new Float32Array(vc * 3);
      const nor = new Float32Array(vc * 3);
      const uv = new Float32Array(vc * 2);
      const idx = [];
      for (let i = 0; i < nSeg; i++)
        for (let j = 0; j < nRad; j++) {
          const a = i * (nRad + 1) + j;
          const b = a + nRad + 1;
          idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      for (let i = 0; i <= nSeg; i++)
        for (let j = 0; j <= nRad; j++) {
          const k = (i * (nRad + 1) + j) * 2;
          uv[k] = i / nSeg;
          uv[k + 1] = j / nRad;
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx);
      const m = mesh(g, material, shadow);
      m.frustumCulled = false;
      const S = [];
      const T = [];
      const N = [];
      const B = [];
      for (let i = 0; i <= nSeg; i++) {
        S.push(V3());
        T.push(V3());
        N.push(V3());
        B.push(V3());
      }
      const curve = new THREE.CatmullRomCurve3([V3(), V3(0, 1, 0)], false, "centripetal");
      const build = rFn => {
        computeFrames(S, T, N, B, nSeg);
        let k = 0;
        for (let i = 0; i <= nSeg; i++) {
          const r = rFn(i / nSeg);
          for (let j = 0; j <= nRad; j++) {
            const a = (j / nRad) * TAU;
            const c = Math.cos(a);
            const s = Math.sin(a);
            const nx = N[i].x * c + B[i].x * s;
            const ny = N[i].y * c + B[i].y * s;
            const nz = N[i].z * c + B[i].z * s;
            pos[k] = S[i].x + nx * r;
            pos[k + 1] = S[i].y + ny * r;
            pos[k + 2] = S[i].z + nz * r;
            nor[k] = nx;
            nor[k + 1] = ny;
            nor[k + 2] = nz;
            k += 3;
          }
        }
        g.attributes.position.needsUpdate = true;
        g.attributes.normal.needsUpdate = true;
      };
      return {
        m,
        S,
        T,
        N,
        B,
        n: nSeg,
        fromPoints(pts, rFn) {
          curve.points = pts;
          for (let i = 0; i <= nSeg; i++) curve.getPoint(i / nSeg, S[i]);
          build(rFn);
        },
        fromSamples(rFn) {
          build(rFn);
        }
      };
    };

    const woodTex = (rings, holes) => {
      if (!hasDoc) return null;
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const x = c.getContext("2d");
      x.fillStyle = "#d9ac72";
      x.fillRect(0, 0, 256, 256);
      if (rings) {
        for (let r = 6; r < 128; r += 5 + rnd() * 6) {
          x.strokeStyle = "rgba(150,98,48," + (0.18 + rnd() * 0.22) + ")";
          x.lineWidth = 1 + rnd() * 2;
          x.beginPath();
          x.arc(128 + (rnd() - 0.5) * 3, 128 + (rnd() - 0.5) * 3, r, 0, TAU);
          x.stroke();
        }
      } else {
        for (let i = 0; i < 40; i++) {
          x.strokeStyle = "rgba(150,98,48," + (0.15 + rnd() * 0.2) + ")";
          x.lineWidth = 1 + rnd() * 2;
          const y0 = rnd() * 256;
          x.beginPath();
          x.moveTo(0, y0);
          x.bezierCurveTo(80, y0 + (rnd() - 0.5) * 20, 170, y0 + (rnd() - 0.5) * 20, 256, y0);
          x.stroke();
        }
      }
      if (holes) {
        x.fillStyle = "#3a2410";
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU + Math.PI / 4;
          x.beginPath();
          x.arc(128 + Math.cos(a) * 62, 128 + Math.sin(a) * 62, 7, 0, TAU);
          x.fill();
        }
        x.strokeStyle = "rgba(90,55,25,0.8)";
        x.lineWidth = 3;
        x.beginPath();
        x.arc(128, 128, 120, 0, TAU);
        x.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      return t;
    };
    const woodFace = new THREE.MeshStandardMaterial({ map: woodTex(true, true), color: 0xffffff, roughness: 0.7 });
    const woodSide = new THREE.MeshStandardMaterial({ map: woodTex(false, false), color: 0xf0d6b0, roughness: 0.75 });
    const coreMat = new THREE.MeshStandardMaterial({ map: woodTex(false, false), color: 0xfff1dc, roughness: 0.65 });

    const root = new THREE.Group();
    const bodyG = new THREE.Group();
    root.add(bodyG);
    const spinG = new THREE.Group();
    bodyG.add(spinG);

    const FR = 0.5;
    const FT = 0.07;
    const Y0 = 0.05;
    const DH = 0.5;
    const CR = 0.29;
    const CAB = 0.036;
    const bottom = mesh(new THREE.CylinderGeometry(FR, FR, FT, 48), [woodSide, woodFace, woodFace]);
    bottom.position.y = Y0 + FT / 2;
    spinG.add(bottom);
    const core = mesh(new THREE.CylinderGeometry(CR, CR, DH, 40), coreMat);
    core.position.y = Y0 + FT + DH / 2;
    spinG.add(core);
    const ROWS = 7;
    const rowY = i => Y0 + FT + CAB + i * ((DH - CAB * 2) / (ROWS - 1));
    const WR = CR + CAB;
    for (let i = 0; i < ROWS; i++) {
      const gap = false;
      const arc = gap ? TAU - 1.9 : TAU;
      const tor = mesh(new THREE.TorusGeometry(WR + (i % 2) * 0.004, CAB, 10, 64, arc), cableMat);
      tor.rotation.x = Math.PI / 2;
      tor.rotation.z = gap ? Math.PI / 2 + 0.95 : 0;
      tor.position.y = rowY(i);
      spinG.add(tor);
      if (gap)
        [-1, 1].forEach(sd => {
          const a = Math.PI / 2 + sd * 0.95;
          const capm = mesh(new THREE.SphereGeometry(CAB, 12, 8), cableMat, false);
          capm.position.set(Math.cos(a) * WR, rowY(i), Math.sin(a) * WR);
          spinG.add(capm);
        });
    }
    const outer = [];
    for (let i = 0; i < 2; i++) {
      const y = rowY(i === 0 ? 0.5 : 5.5);
      const tor = mesh(new THREE.TorusGeometry(WR + CAB * 1.8, CAB, 10, 64), cableMat);
      tor.rotation.x = Math.PI / 2;
      tor.position.y = y;
      spinG.add(tor);
      outer.push(tor);
    }

    const topG = new THREE.Group();
    topG.position.set(0, Y0 + FT + DH, -0.1);
    bodyG.add(topG);
    const top = mesh(new THREE.CylinderGeometry(FR, FR, FT, 48), [woodSide, woodFace, woodFace]);
    top.position.set(0, FT / 2, 0.1);
    topG.add(top);
    const hole = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 20), darkMat, false);
    hole.position.set(0, FT + 0.002, 0.1);
    topG.add(hole);

    const ant = flexTube(90, 6, metal(0xe08a48, 0.22));
    topG.add(ant.m);
    const antTip = new THREE.Group();
    topG.add(antTip);
    {
      const strandGeo = new THREE.CylinderGeometry(0.005, 0.009, 1, 5);
      strandGeo.translate(0, 0.5, 0);
      for (let i = 0; i < 6; i++) {
        const s = mesh(strandGeo, copperMat, false);
        const a = (i / 6) * TAU;
        s.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
        s.scale.y = 0.06 + rnd() * 0.03;
        antTip.add(s);
      }
    }

    const head = new THREE.Group();
    head.rotation.order = "YXZ";
    bodyG.add(head);
    {
      const skull = mesh(new THREE.SphereGeometry(0.17, 32, 24), cableMat);
      skull.scale.set(1, 0.92, 1.02);
      head.add(skull);
      const ribMat = rubber(0xd96a12);
      [0, 1].forEach(i => {
        const r = mesh(new THREE.TorusGeometry(0.075 - i * 0.012, 0.022, 8, 20), ribMat, false);
        r.position.set(0, -0.06 - i * 0.03, -0.14 - i * 0.04);
        r.rotation.x = Math.PI / 2 - 0.6;
        head.add(r);
      });
      const snout = new THREE.Group();
      snout.position.set(0, -0.055, 0.125);
      head.add(snout);
      const blk = mesh(new THREE.CylinderGeometry(0.056, 0.068, 0.09, 6), rubber(0x1d1f25));
      blk.rotation.set(Math.PI / 2, Math.PI / 6, 0);
      blk.position.z = 0.02;
      snout.add(blk);
      const plate = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 24), rubber(0x3a3d46), false);
      plate.rotation.x = Math.PI / 2;
      plate.position.z = 0.067;
      snout.add(plate);
      [-0.021, 0.021].forEach(x => {
        const pin = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.045, 12), nickelMat, false);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(x, 0, 0.095);
        snout.add(pin);
        const tp = mesh(new THREE.SphereGeometry(0.011, 10, 8), nickelMat, false);
        tp.position.set(x, 0, 0.12);
        snout.add(tp);
      });
    }
    const eyes = [-1, 1].map(sd => {
      const e = eye({ size: 0.37, pupilColor: 0x1c1d26 });
      e.g.position.set(sd * 0.075, 0.06, 0.135);
      e.g.rotation.set(-0.15, sd * 0.4, 0);
      head.add(e.g);
      return e;
    });
    const mouthPts = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const x = lerp(-0.045, 0.045, u);
      const yy = -0.128 - Math.sin(u * Math.PI) * 0.014;
      mouthPts.push(V3(x, yy, Math.sqrt(Math.max(0, 0.168 * 0.168 - x * x - (yy / 0.92) * (yy / 0.92))) * 1.02 + 0.004));
    }
    const mouth = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPts), 24, 0.008, 6, false), darkMat, false);
    head.add(mouth);
    const mouthOpen = mesh(new THREE.SphereGeometry(1, 18, 12), mouthMat, false);
    mouthOpen.scale.set(0.04, 0.03, 0.02);
    mouthOpen.position.set(0, -0.13, 0.11);
    mouthOpen.visible = false;
    head.add(mouthOpen);
    const neck = flexTube(40, 10, cableMat);
    bodyG.add(neck.m);
    const neckPts = [V3(), V3(), V3(), V3(), V3(), V3()];
    const HEAD_REST = V3(0, 0.98, 0.64);
    const NECK_J = V3(0, -0.09, -0.15);
    const NECK_D = V3(0, -0.6, -0.8).normalize();

    let sparkTex = null;
    if (hasDoc) {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const x = c.getContext("2d");
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 30);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.25, "rgba(190,235,255,0.9)");
      gr.addColorStop(1, "rgba(80,170,255,0)");
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      x.strokeStyle = "rgba(255,255,255,0.95)";
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(32, 2);
      x.lineTo(32, 62);
      x.moveTo(2, 32);
      x.lineTo(62, 32);
      x.stroke();
      sparkTex = new THREE.CanvasTexture(c);
    }
    const sparks = [];
    for (let i = 0; i < 20; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: 0xcfefff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      s.visible = false;
      root.add(s);
      sparks.push({ s, life: 0, max: 1, v: V3(), size: 0.1 });
    }
    let sparkI = 0;
    const spark = (p, v, size = 0.08, life = 0.22) => {
      const sp = sparks[sparkI++ % sparks.length];
      sp.s.position.copy(p);
      sp.v.copy(v);
      sp.life = life;
      sp.max = life;
      sp.size = size;
      sp.s.visible = true;
    };

    const food = berry();
    food.visible = false;
    root.add(food);
    const muzzle = new THREE.Group();
    muzzle.position.set(0, -0.04, 0.27);
    head.add(muzzle);
    const UP = V3(0, 1, 0);
    const SIZE = 1.4;
    let lastT = null;

    return {
      root,
      muzzle,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const dt = lastT === null ? 1 / 60 : Math.max(0, Math.min(0.05, t - lastT));
        lastT = t;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const joy = typeof s.joy === "number" ? s.joy : 100;
        const dying = !!s.dying;
        const is = n => (action && action.name === n ? action : null);
        const jump = is("jump");
        const eat = is("eat");
        const zap = is("zap");
        const unwind = is("unwind");
        const hide = is("hide");
        const spinA = is("spin");
        const wob = is("wobble");
        const atk = is("attack") ? strike(action.p) : null;
        const vigor = dying ? 0.3 : 0.6 + 0.4 * clamp01(hunger / 100);
        const glad = joy >= 90 && !dying && !action ? 1 : 0;

        let y = 0;
        let z = 0;
        let sy = 1 + Math.sin(t * 2.2) * 0.015 * motion;
        let tiltX = 0;
        let tiltZ = Math.sin(t * 1.3) * 0.03 * motion;
        let spin = 0;
        let lid = 0;
        let squint = dying ? 0.5 : 0;
        let mouthO = false;
        let antZap = 0;
        let crackle = 0.5 * vigor;
        let antDroop = dying ? 1 : 0;
        const hp = V3(Math.sin(t * 1.2) * 0.04 * motion, Math.sin(t * 1.7) * 0.03 * motion, 0);
        let hYaw = Math.sin(t * 0.9) * 0.12 * motion;
        let hPitch = 0;
        let hRoll = Math.sin(t * 1.1) * 0.06 * motion;
        let hScale = 1;
        let reach = 0;
        let rear = 0;
        let tuck = 0;
        let droop = dying ? 1 : 0;
        let lag = 0;
        if (glad) {
          hp.x += Math.sin(t * 4) * 0.06 * motion;
          hRoll += Math.sin(t * 4) * 0.2 * motion;
        }

        if (jump) {
          const p = jump.p;
          if (p < 0.22) {
            sy = 1 - 0.16 * Math.sin((p / 0.22) * Math.PI * 0.5);
            lag = -Math.sin((p / 0.22) * Math.PI * 0.5) * 0.12;
          } else if (p < 0.8) {
            const q = (p - 0.22) / 0.58;
            y = Math.sin(q * Math.PI) * 0.5;
            sy = 1 + 0.1 * Math.cos(q * Math.PI);
            mouthO = q > 0.2 && q < 0.7;
            lag = -Math.cos(q * Math.PI) * 0.12;
          } else {
            sy = 1 - 0.12 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
            lag = Math.sin(((p - 0.8) / 0.2) * Math.PI) * 0.1;
          }
        }
        if (wob) {
          const p = wob.p;
          const damp = Math.pow(1 - p, 1.4);
          tiltZ += Math.sin(p * Math.PI * 6) * 0.25 * damp;
          hYaw += Math.sin(p * 30) * 0.4 * damp;
          hp.x += Math.sin(p * 26) * 0.08 * damp;
          squint = p > 0.1 && p < 0.8 ? 0.6 : squint;
        }
        if (spinA) {
          const p = spinA.p;
          spin = smooth(0.05, 0.85, p) * TAU * 2;
          y = Math.sin(Math.PI * p) * 0.12;
          squint = p > 0.1 && p < 0.9 ? 0.7 : squint;
          hYaw += Math.sin(p * Math.PI * 4) * 0.5;
          hRoll += Math.sin(p * Math.PI * 3) * 0.3;
        }
        if (hide) {
          const p = hide.p;
          const k = smooth(0.04, 0.2, p) * (1 - smooth(0.78, 0.96, p));
          spin = -smooth(0.02, 0.25, p) * TAU * 1.5;
          tuck = k;
          lid = k;
          sy -= k * 0.12;
          squint = Math.max(squint, k * 0.95);
          tiltZ += Math.sin(p * 80) * 0.02 * k;
          crackle = 0.1;
        }
        if (unwind) {
          const p = unwind.p;
          reach = smooth(0.05, 0.4, p) * (1 - smooth(0.62, 0.95, p));
          spin = -reach * 0.8;
          z = smooth(0.35, 0.6, p) * 0.28 * (1 - smooth(0.7, 0.95, p));
          tiltX = Math.sin(p * Math.PI * 2) * 0.06 * reach;
          hYaw += Math.sin(p * 14) * 0.25 * reach;
          squint = p > 0.45 && p < 0.6 ? 0.4 : squint;
        }
        if (zap) {
          const p = zap.p;
          const up = smooth(0.05, 0.4, p) * (1 - smooth(0.75, 0.95, p));
          const shot = smooth(0.5, 0.56, p) * (1 - smooth(0.62, 0.8, p));
          rear = up;
          hPitch += -up * 0.25 + shot * 0.45;
          hp.z += shot * 0.15;
          antZap = Math.max(up * 0.6, shot);
          crackle = 0.5 + up * 3 + shot * 8;
          squint = up > 0.4 ? 0.7 : squint;
          mouthO = shot > 0.3;
          sy += -up * 0.06 + shot * 0.06;
          tiltX = -up * 0.06 + shot * 0.08;
        }
        if (eat) {
          const p = eat.p;
          const ph = eatPhase(p);
          mouthO = p > 0.15 && p < 0.32;
          hPitch += -0.2 * smooth(0.0, 0.15, p) * (1 - smooth(0.3, 0.4, p)) + ph.chew * 0.08;
          squint = p > 0.35 && p < 0.85 ? 0.55 : squint;
          const fall = clamp01(ph.fall);
          food.visible = ph.visible && p < 0.32;
          const mp = muzzle.getWorldPosition(V3());
          root.worldToLocal(mp);
          food.position.set(mp.x, lerp(mp.y + 1.8, mp.y, fall * fall), mp.z + 0.02);
          food.scale.setScalar(1 - smooth(0.28, 0.32, p) * 0.9);
          antDroop = -ph.chew * 0.2;
        } else food.visible = false;
        if (atk) {
          tiltX += -atk.wind * 0.15 + atk.lunge * 0.15;
          hp.z += atk.lunge * 0.55 - atk.wind * 0.18;
          hp.y += atk.wind * 0.1 - atk.lunge * 0.15;
          hPitch += -atk.wind * 0.3 + atk.lunge * 0.3;
          squint = atk.lunge > 0.2 ? 0.7 : squint;
          mouthO = atk.lunge > 0.2;
        }

        const sx = 1 / Math.sqrt(sy);
        bodyG.scale.set(sx * SIZE, sy * SIZE, sx * SIZE);
        root.position.set(0, y, z);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        bodyG.rotation.set(tiltX, 0, tiltZ);
        spinG.rotation.y = spin;
        outer.forEach((o, i) => o.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.01 * motion));

        topG.rotation.x = lid * 0.32 + Math.sin(t * 1.7) * 0.015 * motion;
        topG.rotation.z = Math.sin(t * 1.1) * 0.02 * motion;

        {
          const sway = Math.sin(t * 2.3) * 0.06 * motion * (1 - antDroop);
          const hgt = 0.34 * (1 - lid * 0.5);
          for (let k = 0; k <= ant.n; k++) {
            const u = k / ant.n;
            const a = u * 4 * TAU + t * 0.6;
            const rr = 0.045 * Math.sqrt(Math.sin(Math.PI * Math.min(1, u * 1.15)));
            ant.S[k].set(sway * u + Math.cos(a) * rr, FT + u * hgt * (1 - antDroop * 0.6) - antDroop * u * u * 0.15, 0.1 + Math.sin(a) * rr + antDroop * u * u * 0.25 + Math.cos(t * 1.9) * 0.03 * u * motion);
          }
          ant.fromSamples(u => 0.012 * (1 - u * 0.3));
          antTip.position.copy(ant.S[ant.n]);
          antTip.quaternion.setFromUnitVectors(UP, ant.T[ant.n]);
          antTip.scale.setScalar(1 + antZap * 0.4);
        }

        {
          const P = HEAD_REST.clone().add(hp);
          P.y += lag;
          if (reach > 0) {
            P.lerp(V3(0.08, 0.2, 1.25), reach);
            hPitch += reach * 0.55;
          }
          if (rear > 0) P.lerp(V3(0, 1.38, 0.5), rear);
          if (droop > 0) {
            P.lerp(V3(0.12, 0.18, 0.86), droop);
            hPitch += droop * 0.55;
            hRoll += droop * 0.3;
          }
          if (tuck > 0) {
            P.lerp(V3(0.04, rowY(3), WR + 0.18), tuck);
            hScale = 1 - tuck * 0.25;
            hPitch += tuck * 0.2;
          }
          head.position.copy(P);
          const lx = clamp01(1 - reach - tuck - droop);
          head.rotation.set(hPitch - pointer.y * 0.25 * lx, hYaw + pointer.x * 0.45 * lx, hRoll);
          head.scale.setScalar(hScale);
          head.updateMatrix();
          const J = NECK_J.clone().multiplyScalar(hScale).applyQuaternion(head.quaternion).add(P);
          const d = NECK_D.clone().applyQuaternion(head.quaternion);
          const a0 = Math.PI / 2 - 0.3;
          neckPts[0].set(Math.cos(a0) * (WR - 0.02), rowY(3), Math.sin(a0) * (WR - 0.02));
          neckPts[1].set(Math.cos(a0 - 0.12) * (WR + 0.06), rowY(3), Math.sin(a0 - 0.12) * (WR + 0.06));
          const low = V3(0.08, lerp(0.42, CAB + 0.01, Math.min(1, reach + droop * 0.6)), lerp(0.6, 0.7, reach));
          low.lerp(V3(0.08, rowY(2.4), WR + 0.12), tuck);
          neckPts[2].copy(low);
          neckPts[3].copy(low).lerp(J, 0.5).add(V3(0, 0.04 * (1 - reach), 0.05 + rear * 0.05));
          neckPts[4].copy(J).addScaledVector(d, 0.14 * hScale);
          neckPts[5].copy(J);
          neck.fromPoints(neckPts, () => CAB * 1.05);
        }

        mouth.visible = !mouthO;
        mouthOpen.visible = mouthO;
        const l = squint ? 1 - squint : blink;
        eyes.forEach(({ g }) => (g.scale.y = Math.max(0.08, l)));
        followPupils(eyes, pointer, 0.8);

        const tipW = antTip.getWorldPosition(V3());
        root.worldToLocal(tipW);
        if (rnd() < crackle * dt * 1.5) spark(tipW.clone(), V3((rnd() - 0.5) * 0.6, 0.4 + rnd() * 0.5, (rnd() - 0.5) * 0.6), 0.06 + antZap * 0.08, 0.18 + rnd() * 0.1);
        if (zap && zap.p > 0.5 && zap.p < 0.62) {
          const pw = muzzle.getWorldPosition(V3());
          root.worldToLocal(pw);
          for (let k = 0; k < 3; k++) spark(pw.clone(), V3((rnd() - 0.5) * 2.5, (rnd() - 0.4) * 2, 1 + rnd() * 3), 0.12, 0.3);
        }

        sparks.forEach(sk => {
          if (sk.life <= 0) {
            sk.s.visible = false;
            return;
          }
          sk.life -= dt;
          sk.s.position.addScaledVector(sk.v, dt);
          sk.v.y -= dt * 2;
          const k = clamp01(sk.life / sk.max);
          sk.s.material.opacity = k;
          sk.s.scale.setScalar(sk.size * (0.6 + k * 0.6));
        });
      }
    };
  }
});
