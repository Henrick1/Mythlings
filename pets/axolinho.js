Pets.register({
  id: "axolinho",
  dex: 4,
  name: "Gosmilo",
  color: "#c48ae8",
  types: ["poison"],
  move: "swim",
  swimDepth: 0.3,
  description: "O filhote do Toxolote. Ainda é uma bolinha, mas já usa uma touca de lodo tóxico e sopra bolhas de veneno quando quer brincar.",
  evolvesTo: "axolote",
  evolveLevel: 5,
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    bubble: { duration: 2.2 },
    attack: { duration: 1.1 }
  },
  battle: { special: { action: "bubble", hit: 0.36, speed: 1.3 } },
  idle: [
    { action: "bubble", min: 25, max: 50 },
    { action: "jump", min: 35, max: 70 }
  ],
  clickAction: n => ["jump", "bubble", "jump"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eatPhase, berry, strike } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const std = (color, rough = 0.55, extra = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

    const skin = std(0xfce8ee);
    const slimeMat = std(0x7b3fb0, 0.15, {
      emissive: 0x3a1470,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9
    });
    const lumpMat = std(0x9a5cd0, 0.12, {
      emissive: 0x4a1c88,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    const dotMat = std(0x9a52d8, 0.3, { emissive: 0x2a1055, emissiveIntensity: 0.35 });
    const stalkMat = std(0xa24fc4, 0.5);
    const filMat = std(0xd16bd8, 0.5);
    const finMat = std(0xe6c4f2, 0.5, { transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x8a3b58 });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xffa6c1, transparent: true, opacity: 0.7 });

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);

    const CY = 0.92;
    const RX = 0.97;
    const RY = 0.86;
    const RZ = 0.9;

    const surf = (lon, lat, k = 1) =>
      new THREE.Vector3(
        RX * Math.cos(lat) * Math.sin(lon) * k,
        CY + RY * Math.sin(lat) * k,
        RZ * Math.cos(lat) * Math.cos(lon) * k
      );

    const outward = (lon, lat) =>
      new THREE.Vector3(
        (Math.cos(lat) * Math.sin(lon)) / RX,
        Math.sin(lat) / RY,
        (Math.cos(lat) * Math.cos(lon)) / RZ
      ).normalize();

    const stick = (m, lon, lat, k) => {
      const p = surf(lon, lat, k);
      const n = outward(lon, lat);
      m.position.copy(p);
      m.lookAt(p.x + n.x, p.y + n.y, p.z + n.z);
      return m;
    };

    const body = mesh(new THREE.SphereGeometry(1, 64, 48), skin);
    body.scale.set(RX, RY, RZ);
    body.position.y = CY;
    squash.add(body);

    [
      [0.0, 0.62, 0.13],
      [0.48, 0.5, 0.1],
      [-0.5, 0.52, 0.11],
      [0.95, 0.72, 0.09],
      [-0.9, 0.78, 0.1],
      [1.9, 0.45, 0.12],
      [-2.0, 0.5, 0.11],
      [2.8, 0.55, 0.13],
      [3.6, 0.2, 0.1],
      [2.4, 0.05, 0.09],
      [-2.5, 0.12, 0.1]
    ].forEach(([lon, lat, r]) => {
      const d = mesh(new THREE.SphereGeometry(1, 20, 12), dotMat, false);
      d.scale.set(r * 1.3, r, 0.02);
      squash.add(stick(d, lon, lat, 0.995));
    });

    const capGroup = new THREE.Group();
    capGroup.position.y = CY + RY * 0.86;
    squash.add(capGroup);
    [
      [0, 0, 0, 0.5, 0.2, 0.46],
      [0.24, 0, 0.16, 0.24, 0.14, 0.22],
      [-0.26, 0, 0.1, 0.22, 0.13, 0.22],
      [0.05, 0, -0.3, 0.26, 0.14, 0.22]
    ].forEach(([x, y, z, sx, sy, sz]) => {
      const b = mesh(new THREE.SphereGeometry(1, 28, 18), slimeMat, false);
      b.scale.set(sx, sy, sz);
      b.position.set(x, y, z);
      capGroup.add(b);
    });
    const capDrips = [0.7, -0.9, 2.9].map((lon, i) => {
      const d = mesh(new THREE.SphereGeometry(1, 14, 10), slimeMat, false);
      d.scale.set(0.05, 0.08, 0.05);
      d.position.copy(surf(lon, 0.95, 0.99));
      squash.add(d);
      return { d, ph: i * 2.1 };
    });
    [
      [0.1, 0.18, 0.12, 0.07],
      [-0.16, 0.16, -0.05, 0.055],
      [0.2, 0.12, -0.2, 0.05]
    ].forEach(([x, y, z, r]) => {
      const l = mesh(new THREE.SphereGeometry(1, 16, 12), lumpMat, false);
      l.scale.setScalar(r);
      l.position.set(x, y, z);
      capGroup.add(l);
    });

    const eyeMat = std(0x1a1424, 0.6);
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.copy(surf(0.36 * s, 0.1, 0.985));
      g.rotation.y = 0.36 * s;
      const ball = mesh(new THREE.SphereGeometry(0.085, 24, 18), eyeMat, false);
      ball.scale.set(1, 1.12, 0.55);
      const shine = new THREE.Group();
      const big = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), shineMat);
      big.position.set(0.026, 0.034, 0.042);
      const small = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), shineMat);
      small.position.set(-0.024, -0.03, 0.042);
      shine.add(big, small);
      g.add(ball, shine);
      squash.add(g);
      return { g, shine };
    });

    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), blushMat);
      c.scale.set(1, 0.65, 1);
      squash.add(stick(c, 0.72 * s, -0.1, 1.006));
      const n = mesh(new THREE.SphereGeometry(0.018, 8, 8), mouthMat, false);
      n.position.copy(surf(0.09 * s, -0.02, 1.0));
      squash.add(n);
    });

    const smilePts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 8 - 1;
      const x = 0.3 * u;
      const y = 0.79 - 0.08 * (1 - u * u);
      const dy = (y - CY) / RY;
      const z = RZ * Math.sqrt(Math.max(0, 1 - Math.pow(x / RX, 2) - dy * dy)) + 0.004;
      smilePts.push(new THREE.Vector3(x, y, z));
    }
    const smile = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smilePts), 32, 0.022, 8, false), mouthMat, false);
    squash.add(smile);
    const openMouth = mesh(new THREE.SphereGeometry(0.12, 20, 14), mouthMat, false);
    openMouth.scale.set(1.2, 0.8, 0.35);
    openMouth.position.set(0, 0.73, 0.86);
    openMouth.visible = false;
    squash.add(openMouth);

    const stalkGeo = new THREE.ConeGeometry(0.055, 1, 10);
    const filGeo = new THREE.ConeGeometry(0.017, 1, 6);
    const gills = [];
    [-1, 1].forEach(s => {
      [
        [1.12, 0.62, 0.95, 0.46],
        [1.25, 0.36, 0.45, 0.42],
        [1.3, 0.1, -0.05, 0.36]
      ].forEach(([lon, lat, up, len], i) => {
        const base = new THREE.Group();
        base.position.copy(surf(lon * s, lat, 0.97));
        const dir = new THREE.Vector3(s, up, -0.2).normalize();
        base.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const wig = new THREE.Group();
        base.add(wig);
        const stalk = mesh(stalkGeo, stalkMat, false);
        stalk.scale.y = len;
        stalk.position.y = len / 2;
        wig.add(stalk);
        [0.3, 0.55, 0.8].forEach((t, k) => {
          [-1, 1].forEach(side => {
            const f = mesh(filGeo, filMat, false);
            const fl = 0.13 - k * 0.025;
            const holder = new THREE.Group();
            holder.position.y = len * t;
            holder.rotation.z = side * 0.95;
            f.scale.y = fl;
            f.position.y = fl / 2;
            holder.add(f);
            wig.add(holder);
          });
        });
        squash.add(base);
        gills.push({ wig, side: s, i });
      });
    });

    const feet = [
      [-0.34, 0.22],
      [0.34, 0.22],
      [-0.33, -0.24],
      [0.33, -0.24]
    ].map(([x, z]) => {
      const f = mesh(new THREE.SphereGeometry(1, 20, 14), skin);
      f.scale.set(0.15, 0.1, 0.19);
      f.position.set(x, 0.1, z);
      squash.add(f);
      return f;
    });

    const tail = new THREE.Group();
    tail.position.set(0, 0.62, -0.78);
    squash.add(tail);
    const tailBody = mesh(new THREE.SphereGeometry(1, 20, 14), skin);
    tailBody.scale.set(0.12, 0.13, 0.28);
    tailBody.position.z = -0.16;
    const tailFin = mesh(new THREE.SphereGeometry(1, 20, 14), finMat, false);
    tailFin.scale.set(0.02, 0.2, 0.26);
    tailFin.position.set(0, 0.03, -0.24);
    tail.add(tailBody, tailFin);

    const floaters = [];
    for (let i = 0; i < 3; i++) {
      const m = std(0xb27ae0, 0.1, { transparent: true, opacity: 0, emissive: 0x5a2a99, emissiveIntensity: 0.3, depthWrite: false });
      const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), m);
      squash.add(b);
      floaters.push({ b, m, i });
    }

    const puffs = [];
    for (let i = 0; i < 7; i++) {
      const m = std(0xa060d8, 0.1, { transparent: true, opacity: 0, emissive: 0x6a2ab0, emissiveIntensity: 0.6, depthWrite: false });
      const b = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), m);
      b.visible = false;
      root.add(b);
      puffs.push({
        b,
        m,
        delay: i * 0.06,
        dir: [Math.sin(i * 2.4) * 0.45, 0.25 + Math.cos(i * 1.7) * 0.2, 1],
        size: 0.06 + (i % 3) * 0.025
      });
    }

    const food = berry();
    food.visible = false;
    squash.add(food);

    const model = kit.glb
      ? kit.glb({
          src: "assets/models/gosmilo.glb",
          parent: root,
          owner: root,
          id: "axolinho",
          height: 1.91,
          onReady: () => {
            squash.visible = false;
            root.add(food);
          }
        })
      : null;

    const ease = (a, b, p) => smooth(a, b, p);
    const pop = (p, a, b) => {
      const q = Math.max(0, Math.min(1, (p - a) / (b - a)));
      return 1 - Math.pow(1 - q, 3);
    };
    let flickAt = 2;
    let flickK = 0;
    let lastT = null;
    const spr = {};
    const spring = (k, target, dt, stiff = 140, damp = 13) => {
      const s0 = spr[k] || (spr[k] = { x: target, v: 0 });
      const n = Math.max(1, Math.ceil(dt / 0.016));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        s0.v += ((target - s0.x) * stiff - s0.v * damp) * h;
        s0.x += s0.v * h;
      }
      return s0.x;
    };
    function rig(s) {
      const { t, blink, action, motion, lookYaw, lookPitch } = s;
      const P = model.pose;
      P.reset();
      const dt = lastT === null ? 0 : Math.max(0, Math.min(0.05, t - lastT));
      lastT = t;
      const swim = s.swim || 0;
      const name = action ? action.name : null;
      const p = action ? action.p : 0;
      const m = motion;

      let y = 0;
      let sy = 1 + Math.sin(t * 2.1) * 0.018 * m;
      let sx = 0;
      let z = 0;
      let pitch = 0;
      let roll = Math.sin(t * 1.3) * 0.03 * m * (1 - swim);
      let spin = 0;
      let gillUp = 0;
      let gillBack = swim * 0.35;
      let gillSpeed = 2.2;
      let gillAmp = 0.1;
      let tailAmp = 0.22 + swim * 0.25;
      let tailSpeed = 2.4 + swim * 3.5;
      let tailCurl = 0;
      let feetTuck = 0;
      let mouth = 0;
      let eyes = blink;
      let bub = 0;
      let headPitch = 0;

      if (t > flickAt) {
        flickAt = t + 3 + Math.random() * 4;
        flickK = 1;
      }
      flickK = Math.max(0, flickK - dt * 2.4);
      const flick = flickK > 0.7 ? (1 - flickK) / 0.3 : flickK / 0.7;
      gillUp += flick * 0.35 * m;

      if (name === "jump") {
        const crouch = pop(p, 0, 0.16) * (1 - pop(p, 0.18, 0.24));
        const air = p > 0.2 && p < 0.76 ? (p - 0.2) / 0.56 : -1;
        const land = pop(p, 0.76, 0.8) * (1 - pop(p, 0.84, 1));
        sy -= crouch * 0.13 + land * 0.15;
        sx += crouch * 0.03 + land * 0.04;
        if (air >= 0) {
          y = Math.sin(air * Math.PI) * 1.25;
          sy += air < 0.35 ? (1 - air / 0.35) * 0.1 : 0;
          feetTuck = 1;
          gillUp += 0.5;
          tailCurl = 0.5;
          if (action.n % 3 === 0 && !s.reduceMotion) spin = pop(air, 0.1, 0.8) * Math.PI * 2;
        }
        gillUp -= crouch * 0.4;
        eyes = crouch > 0.3 || land > 0.3 ? 0.25 : air >= 0 ? 1.15 : eyes;
        mouth = air >= 0 ? 0.8 : 0;
      }

      if (name === "eat") {
        const look = pop(p, 0, 0.12) * (1 - pop(p, 0.28, 0.33));
        const chomp = pop(p, 0.29, 0.33) * (1 - pop(p, 0.36, 0.45));
        const chewing = p > 0.33 && p < 0.85;
        const chew = chewing ? Math.pow(Math.abs(Math.sin((p - 0.33) * Math.PI * 9)), 0.6) : 0;
        headPitch = -look * 0.28 + chomp * 0.22;
        mouth = chewing ? chew * 1.4 - 0.9 : look;
        sy += chomp * -0.07 + chew * -0.03;
        sx += chew * 0.025;
        eyes = chewing ? 0.25 : eyes;
        gillAmp = chewing ? 0.14 : gillAmp;
        gillSpeed = chewing ? 9 : gillSpeed;
        tailAmp = chewing ? 0.4 : tailAmp;
        tailSpeed = chewing ? 9 : tailSpeed;
        roll += chewing ? Math.sin(p * 40) * 0.03 : 0;
      }

      if (name === "bubble") {
        const inhale = pop(p, 0, 0.3) * (1 - pop(p, 0.38, 0.44));
        const hold = p > 0.3 && p < 0.38 ? Math.sin(p * 160) * 0.012 : 0;
        const blow = pop(p, 0.38, 0.42) * (1 - pop(p, 0.75, 0.95));
        sx += inhale * 0.14 + hold;
        sy += inhale * 0.08 - blow * 0.06;
        headPitch = -inhale * 0.12 + blow * 0.12;
        bub = inhale * 0.45 - blow * 0.2;
        mouth = blow;
        eyes = inhale > 0.2 ? 0.3 : eyes;
        gillUp += inhale * 0.3 - blow * 0.2;
        gillBack += blow * 0.4;
        z = -blow * 0.08;
      }

      if (name === "attack") {
        const at = strike(p);
        z = at.lunge * 0.4 - at.wind * 0.15;
        sy -= at.wind * 0.1 - at.impact * 0.04;
        sx += at.wind * 0.03;
        pitch = at.wind * -0.22 + at.lunge * 0.3;
        tailCurl = at.wind * 0.9 - at.lunge * 0.6;
        gillUp += at.wind * -0.3 + at.lunge * 0.45;
        gillBack += at.lunge * 0.4;
        eyes = at.wind > 0.2 ? 0.25 : eyes;
        mouth = at.lunge * 0.9;
        y = at.lunge * 0.15;
      }

      root.position.set(0, y, z);
      root.rotation.set(lookPitch * 0.5 + pitch, lookYaw + spin, roll);
      const k = Math.max(0.5, sy);
      root.scale.set(1 / Math.sqrt(k) + sx, k, 1 / Math.sqrt(k) + sx * 0.5);

      gillUp = spring("gu", gillUp, dt, 160, 11);
      gillBack = spring("gb", gillBack, dt, 120, 12);
      tailCurl = spring("tc", tailCurl, dt, 90, 9);
      bub = spring("bb", bub, dt, 220, 14);
      headPitch = spring("hp", headPitch, dt, 260, 20);
      if (headPitch) P.rot("Corpo", headPitch, 0, 0);
      ["Branquia.Alta", "Branquia.Baixa"].forEach((g, i) => {
        [-1, 1].forEach(sd => {
          const nm = g + (sd > 0 ? ".L" : ".R");
          const w = Math.sin(t * gillSpeed + i * 0.9 + (sd > 0 ? 0 : 1.7)) * gillAmp * m;
          P.rot(nm, -gillBack * 0.6, sd * gillBack * 0.15, sd * (gillUp + w));
        });
      });
      ["Cauda.01", "Cauda.02", "Cauda.03"].forEach((c, i) => {
        const w = Math.sin(t * tailSpeed - i * 0.8) * tailAmp * m * (0.6 + i * 0.25);
        P.rot(c, tailCurl * (0.35 + i * 0.15), w, 0);
      });
      [["Pata.Frente.L", 0], ["Pata.Frente.R", 1], ["Pata.Tras.L", 1], ["Pata.Tras.R", 0]].forEach(([f, ph], i) => {
        const paddle = Math.sin(t * 7 + ph * Math.PI) * 0.5 * swim * m;
        P.rot(f, paddle + feetTuck * (i < 2 ? -0.5 : 0.5), 0, 0);
      });
      const ey = Math.max(0.12, Math.min(1.15, eyes));
      P.scale("Olho.L", 1, ey, 1);
      P.scale("Olho.R", 1, ey, 1);
      if (mouth > 0) P.scale("Boca", 1 + mouth * 0.15, 1 + mouth * 0.9, 1);
      else if (mouth < 0) P.rot("Boca", -mouth * 0.5, 0, 0);
      const g1 = 1 + bub + Math.sin(t * 2.6) * 0.04 * m;
      const g2 = 1 + bub * 1.3 + Math.sin(t * 2.6 - 1.6) * 0.06 * m;
      P.scale("Bolha.Grande", g1, g1, g1);
      P.scale("Bolha.Pequena", g2, g2, g2);
      const blowP = name === "bubble" ? p : -1;
      let mo = null;
      const jawB = model.bone("Boca");
      if (jawB && (blowP >= 0 || name === "eat")) {
        root.updateMatrixWorld(true);
        mo = root.worldToLocal(jawB.getWorldPosition(V3(0, 0, 0)));
      }
      puffs.forEach(({ b, m: pm, delay, dir, size }) => {
        const q = (blowP - 0.38 - delay) / 0.5;
        const on = blowP >= 0 && q > 0 && q < 1;
        b.visible = on;
        if (on) {
          const o = mo || V3(0, 0.6, 1.1);
          b.position.set(o.x + dir[0] * q * 1.1, o.y + dir[1] * q * 1.1 + q * 0.2, o.z + 0.15 + dir[2] * q * 1.1);
          b.scale.setScalar(size * 1.6 * (0.6 + q * 1.4));
          pm.opacity = (1 - q) * 0.8;
        }
      });
      const ph = name === "eat" ? eatPhase(p) : null;
      if (ph) {
        food.visible = ph.visible;
        const target = mo ? mo.clone().add(V3(0, 0.05, 0.12)) : V3(0, 0.68, 0.85);
        food.position.set(0, lerp(3.2, target.y, ph.fall * ph.fall), lerp(0.85, target.z, ph.fall));
        food.scale.setScalar(1 - 0.85 * ph.bite);
        food.rotation.z = (1 - ph.fall) * 1.2;
      } else food.visible = false;
    }

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        if (model && model.active) {
          model.drive(t, null, 0);
          rig(s);
          return;
        }
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const bub = action && action.name === "bubble" ? action : null;
        const atk = action && action.name === "attack" ? strike(action.p) : null;
        const ph = eat ? eatPhase(eat.p) : null;

        let y = 0;
        let sy = 1 + Math.sin(t * 2) * 0.025 * motion;
        let sxExtra = 0;
        let spin = 0;
        let airborne = false;
        let mouthOpen = false;
        let squint = false;
        let flare = 0;

        if (jump) {
          const p = jump.p;
          if (p < 0.18) {
            sy = 1 - 0.22 * Math.sin((p / 0.18) * Math.PI / 2);
          } else if (p < 0.78) {
            const q = (p - 0.18) / 0.6;
            y = Math.sin(q * Math.PI) * 1.2;
            sy = 1 + 0.12 * Math.cos(q * Math.PI);
            airborne = true;
            if (jump.n % 3 === 0 && !reduceMotion) spin = q * Math.PI * 2;
          } else {
            const q = (p - 0.78) / 0.22;
            sy = 1 - 0.2 * Math.sin(q * Math.PI);
          }
        }

        let whip = 0;
        if (atk) {
          const p = action.p;
          spin = reduceMotion ? 0 : smooth(0.26, 0.62, p) * Math.PI * 2;
          whip = smooth(0.26, 0.4, p) * (1 - smooth(0.55, 0.7, p));
          y = Math.sin(smooth(0.26, 0.62, p) * Math.PI) * 0.35;
          sy = 1 - atk.wind * 0.2 + whip * 0.06;
          airborne = y > 0.08;
          squint = atk.wind > 0.2 || whip > 0.3;
        }

        let blowP = -1;
        if (bub) {
          const p = bub.p;
          const puff = smooth(0, 0.3, p) * (1 - smooth(0.32, 0.42, p));
          sxExtra = puff * 0.1;
          sy -= puff * 0.05;
          squint = p < 0.35;
          flare = smooth(0.3, 0.4, p) * (1 - smooth(0.75, 1, p));
          mouthOpen = p > 0.34 && p < 0.8;
          blowP = p;
        }

        if (eat) {
          sy += 0.05 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.1 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.2, 0.78, ph.fall * ph.fall), lerp(0.8, 1.0, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = (1 - ph.fall) * 1.2;
          mouthOpen = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3;
          openMouth.scale.y = 0.6 + ph.chew * 0.6;
        } else {
          food.visible = false;
          openMouth.scale.y = bub ? 0.9 : 0.8;
        }

        const sx = 1 / Math.sqrt(sy) + sxExtra;
        squash.scale.set(sx, sy, 1 / Math.sqrt(sy));
        root.position.y = y;
        root.position.z = atk ? atk.lunge * 0.35 - atk.wind * 0.12 : 0;
        root.rotation.y = lookYaw + spin;
        root.rotation.x = lookPitch;
        const happy = eat ? Math.sin(eat.p * Math.PI * 8) * 0.04 * motion : 0;
        squash.rotation.z = airborne ? 0 : Math.sin(t * 1.3) * 0.04 * motion + happy;

        smile.visible = !(airborne || mouthOpen);
        openMouth.visible = airborne || mouthOpen;

        const speed = eat || jump ? 9 : bub ? 12 : 3;
        gills.forEach(({ wig, side, i }) => {
          const wave = Math.sin(t * speed + i * 0.9) * (0.08 + flare * 0.1) * motion;
          wig.rotation.z = lerp(wig.rotation.z, side * (flare * 0.35 + (airborne ? 0.25 : 0)) + wave, 0.25);
          wig.rotation.x = Math.sin(t * speed * 0.7 + i) * 0.05 * motion;
        });

        tail.rotation.y = Math.sin(t * (eat || jump ? 10 : 2.4)) * (eat || jump ? 0.45 : 0.25) * motion * (1 - whip) + (atk ? atk.wind * 0.6 - whip * 0.5 : 0);
        tail.rotation.x = airborne ? -0.3 - whip * 0.3 : 0;
        tail.scale.setScalar(1 + whip * 0.35);

        capDrips.forEach(({ d, ph: dp }) => {
          d.scale.y = 0.08 * (1 + 0.25 * Math.sin(t * 1.5 + dp) * motion);
        });

        feet.forEach((f, i) => {
          f.position.y = airborne ? 0.04 : 0.1;
          f.rotation.x = airborne ? 0.4 * (i < 2 ? -1 : 1) : 0;
        });

        floaters.forEach(({ b, m, i }) => {
          const f = (t * 0.25 + i / 3) % 1;
          b.position.set(Math.sin(i * 2.3) * 0.25 + Math.sin(t * 1.5 + i) * 0.05, CY + RY + 0.1 + f * 0.9, -0.1 + i * 0.1);
          b.scale.setScalar(0.035 + 0.015 * (i % 2));
          m.opacity = Math.sin(f * Math.PI) * 0.5;
        });

        puffs.forEach(({ b, m, delay, dir, size }) => {
          const q = (blowP - 0.38 - delay) / 0.5;
          const on = blowP >= 0 && q > 0 && q < 1;
          b.visible = on;
          if (on) {
            b.position.set(dir[0] * q * 1.1, 0.75 + dir[1] * q * 1.1 + q * 0.2, 0.95 + dir[2] * q * 1.1);
            b.scale.setScalar(size * (0.6 + q * 1.4));
            m.opacity = (1 - q) * 0.75;
          }
        });

        eyes.forEach(({ g, shine }) => {
          g.scale.y = airborne ? 1.1 : squint ? 0.3 : blink;
          shine.position.x = lerp(shine.position.x, pointer.x * 0.012, 0.15);
          shine.position.y = lerp(shine.position.y, pointer.y * 0.01, 0.15);
        });
      }
    };
  }
});
