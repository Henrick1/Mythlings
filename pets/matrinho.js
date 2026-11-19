Pets.register({
  id: "matrinho",
  dex: 33,
  name: "Matrinho",
  color: "#2f5bc4",
  types: ["ice"],
  evolvesTo: "matriosca",
  evolveLevel: 16,
  description: "Uma bonequinha de gelo pintada à mão com flores azuis, no jeito da porcelana Gzhel. Por dentro é oca e guarda um friozinho que nunca acaba. Quando fica feliz, gira a cabeça como quem desenrosca a tampa e solta flocos de neve.",
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    frost: { duration: 1.8 },
    spin: { duration: 1.6 },
    wobble: { duration: 1.8 },
    attack: { duration: 1.0 }
  },
  battle: { special: { action: "frost", hit: 0.5, speed: 1.25 } },
  idle: [
    { action: "wobble", min: 20, max: 45 },
    { action: "spin", min: 35, max: 70 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["jump", "spin", "frost", "wobble"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const TAU = Math.PI * 2;

    const H = 1.305;
    const SEAM = 0.6;
    const COBALT = "#1f43a8";
    const COBALT_D = "#132c78";
    const COBALT_L = "#dbe6fa";

    const root = new THREE.Group();
    const sway = new THREE.Group();
    root.add(sway);
    const squash = new THREE.Group();
    sway.add(squash);

    const profile = (() => {
      const ctrl = [
        [0.26, 0.0],
        [0.34, 0.02],
        [0.42, 0.07],
        [0.49, 0.15],
        [0.525, 0.26],
        [0.52, 0.36],
        [0.49, 0.46],
        [0.445, 0.55],
        [0.4, 0.63],
        [0.365, 0.71],
        [0.347, 0.79],
        [0.344, 0.87],
        [0.347, 0.95],
        [0.337, 1.04],
        [0.31, 1.12],
        [0.265, 1.19],
        [0.195, 1.25],
        [0.105, 1.29],
        [0.0, H]
      ];
      const curve = new THREE.CatmullRomCurve3(ctrl.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, "centripetal");
      const pts = [new THREE.Vector2(0.0, 0.0)];
      curve.getPoints(110).forEach(p => pts.push(new THREE.Vector2(Math.max(0, p.x), p.y)));
      pts[pts.length - 1].set(0, H);
      return pts;
    })();
    const radiusAt = y => {
      for (let i = 1; i < profile.length; i++) {
        const a = profile[i - 1];
        const b = profile[i];
        if (y >= a.y && y <= b.y && b.y > a.y) return lerp(a.x, b.x, (y - a.y) / (b.y - a.y));
      }
      return y <= 0 ? 0.26 : 0;
    };
    const R_SEAM = radiusAt(SEAM);
    const splitAt = (pts, y, below) => {
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (below ? p.y <= y : p.y >= y) out.push(p.clone());
      }
      const seamPt = new THREE.Vector2(radiusAt(y), y);
      if (below) out.push(seamPt);
      else out.unshift(seamPt);
      return out;
    };

    const SEG = 72;
    const lathe = pts => {
      const g = new THREE.LatheGeometry(pts, SEG, Math.PI, TAU);
      const pos = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setY(i, pos.getY(i) / H);
      uv.needsUpdate = true;
      g.computeVertexNormals();
      return g;
    };

    let paintTex = null;
    if (typeof document !== "undefined") {
      const CW = 2048;
      const CH = 1024;
      const cv = document.createElement("canvas");
      cv.width = CW;
      cv.height = CH;
      const g = cv.getContext("2d");
      const X = u => u * CW;
      const Y = v => (1 - v) * CH;
      const pxU = v => CW / (TAU * Math.max(0.12, radiusAt(v * H)));
      const pxV = CH / H;
      const at = (u, v, fn) => {
        [u, u - 1, u + 1].forEach(uu => {
          if (uu < -0.2 || uu > 1.2) return;
          g.save();
          g.setTransform(pxU(v), 0, 0, -pxV, X(uu), Y(v));
          fn();
          g.restore();
        });
      };

      const base = g.createLinearGradient(0, CH, 0, 0);
      base.addColorStop(0, "#c6dcf3");
      base.addColorStop(0.12, "#e7f1fc");
      base.addColorStop(0.5, "#f7fbff");
      base.addColorStop(1, "#ffffff");
      g.fillStyle = base;
      g.fillRect(0, 0, CW, CH);
      let seed = 7;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.55)" : "rgba(170,200,240,0.18)";
        const r = 0.6 + rnd() * 1.8;
        g.beginPath();
        g.arc(rnd() * CW, rnd() * CH, r, 0, TAU);
        g.fill();
      }

      const stroke = (len, wid, flip = 1) => {
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(wid * 1.1 * flip, len * 0.25, wid * 0.9 * flip, len * 0.8, 0, len);
        g.bezierCurveTo(-wid * 0.35 * flip, len * 0.7, -wid * 0.45 * flip, len * 0.3, 0, 0);
        const gr = g.createLinearGradient(-wid * 0.4 * flip, 0, wid * flip, 0);
        gr.addColorStop(0, COBALT_D);
        gr.addColorStop(0.45, COBALT);
        gr.addColorStop(1, COBALT_L);
        g.fillStyle = gr;
        g.fill();
      };
      const petal = (ang, dist, len, wid, flip = 1) => {
        g.save();
        g.rotate(ang);
        g.translate(0, dist);
        stroke(len, wid, flip);
        g.restore();
      };
      const rose = R => {
        for (let i = 0; i < 8; i++) petal((i / 8) * TAU + 0.2, R * 0.38, R * 0.62, R * 0.42, 1);
        for (let i = 0; i < 6; i++) petal((i / 6) * TAU + 0.6, R * 0.16, R * 0.42, R * 0.3, -1);
        g.beginPath();
        g.arc(0, 0, R * 0.2, 0, TAU);
        const c = g.createRadialGradient(-R * 0.05, R * 0.05, 0, 0, 0, R * 0.2);
        c.addColorStop(0, COBALT_L);
        c.addColorStop(1, COBALT_D);
        g.fillStyle = c;
        g.fill();
        g.strokeStyle = COBALT_D;
        g.lineWidth = R * 0.03;
        g.beginPath();
        for (let a = 0; a < TAU * 1.6; a += 0.2) {
          const r = R * 0.02 + a * R * 0.017;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (a === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.stroke();
      };
      const leaf = (ang, len, wid) => {
        g.save();
        g.rotate(ang);
        stroke(len, wid, 1);
        g.strokeStyle = COBALT_L;
        g.globalAlpha = 0.7;
        g.lineWidth = wid * 0.08;
        g.beginPath();
        g.moveTo(0, len * 0.08);
        g.quadraticCurveTo(wid * 0.25, len * 0.5, 0, len * 0.92);
        g.stroke();
        g.restore();
      };
      const curl = (ang, size, dir = 1) => {
        g.save();
        g.rotate(ang);
        g.strokeStyle = COBALT;
        g.lineCap = "round";
        g.lineWidth = size * 0.07;
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(size * 0.2 * dir, size * 0.5, size * 0.75 * dir, size * 0.75, size * 0.62 * dir, size * 0.38);
        g.quadraticCurveTo(size * 0.52 * dir, size * 0.2, size * 0.36 * dir, size * 0.34);
        g.stroke();
        g.restore();
      };
      const bud = (ang, dist, R) => {
        g.save();
        g.rotate(ang);
        g.translate(0, dist);
        petal(0, 0, R, R * 0.55, 1);
        petal(0.4, 0, R * 0.8, R * 0.4, -1);
        petal(-0.4, 0, R * 0.8, R * 0.4, 1);
        g.restore();
      };
      const dots = (n, r, rad) => {
        g.fillStyle = COBALT;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          g.beginPath();
          g.arc(Math.cos(a) * rad, Math.sin(a) * rad, r, 0, TAU);
          g.fill();
        }
      };

      const band = (v, h, fill) => {
        g.fillStyle = fill;
        g.fillRect(0, Y(v + h / H), CW, (h / H) * CH);
      };
      band(0.0, 0.07, COBALT);
      g.fillStyle = "#ffffff";
      for (let i = 0; i < 40; i++) {
        const u = (i + 0.5) / 40;
        g.beginPath();
        g.ellipse(X(u), Y(0.035 / H), 6, 9, 0, 0, TAU);
        g.fill();
      }
      for (let i = 0; i < 40; i++) {
        const u = i / 40;
        at(u + 0.0125, 0.07 / H, () => {
          g.fillStyle = COBALT;
          g.beginPath();
          g.arc(0, 0, 0.012, 0, Math.PI, true);
          g.fill();
        });
      }
      const seamV = SEAM / H;
      [-0.028, 0.028].forEach(d => band(seamV + d / H - 0.004 / H, 0.008, COBALT));
      for (let i = 0; i < 48; i++) {
        at((i + 0.5) / 48, seamV, () => {
          g.fillStyle = COBALT;
          g.beginPath();
          g.arc(0, 0, 0.011, 0, TAU);
          g.fill();
        });
      }

      const HOOD_Y = 0.86;
      const HOOD_V = HOOD_Y / H;
      g.fillStyle = COBALT;
      g.fillRect(0, 0, CW, Y(HOOD_V));
      for (let i = 0; i < 18; i++) {
        const u = (i + 0.5) / 18;
        at(u, HOOD_V, () => {
          g.fillStyle = COBALT;
          g.beginPath();
          g.ellipse(0, 0, 0.068, 0.034, 0, Math.PI, TAU);
          g.fill();
          g.fillStyle = "#ffffff";
          g.beginPath();
          g.arc(0, -0.008, 0.008, 0, TAU);
          g.fill();
        });
      }
      const FACE_Y = 1.0;
      at(0.5, FACE_Y / H, () => {
        g.fillStyle = "#f6faff";
        g.beginPath();
        const win = () => {
          g.moveTo(-0.27, -0.2);
          g.lineTo(-0.27, 0.0);
          g.bezierCurveTo(-0.27, 0.15, -0.14, 0.19, -0.06, 0.16);
          g.quadraticCurveTo(-0.018, 0.145, 0, 0.1);
          g.quadraticCurveTo(0.018, 0.145, 0.06, 0.16);
          g.bezierCurveTo(0.14, 0.19, 0.27, 0.15, 0.27, 0.0);
          g.lineTo(0.27, -0.2);
        };
        g.beginPath();
        win();
        g.closePath();
        g.fill();
        g.strokeStyle = COBALT_D;
        g.lineWidth = 0.008;
        g.beginPath();
        win();
        g.stroke();
        g.fillStyle = COBALT;
        [-1, 1].forEach(s => {
          [
            [0.165, -0.06, 0.013],
            [0.195, -0.035, 0.01],
            [0.19, -0.085, 0.009]
          ].forEach(([x, y, r]) => {
            g.beginPath();
            g.arc(s * x, y, r, 0, TAU);
            g.fill();
          });
        });
      });
      for (let i = 0; i < 46; i++) {
        const u = rnd();
        const v = HOOD_V + 0.03 + rnd() * (1 - HOOD_V - 0.07);
        const du = Math.abs(u - 0.5);
        if (du < 0.15 && v * H < FACE_Y + 0.2) continue;
        at(u, v, () => {
          g.fillStyle = "#ffffff";
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * TAU;
            g.beginPath();
            g.arc(Math.cos(a) * 0.012, Math.sin(a) * 0.012, 0.0075, 0, TAU);
            g.fill();
          }
          g.fillStyle = "#9fb6ec";
          g.beginPath();
          g.arc(0, 0, 0.005, 0, TAU);
          g.fill();
        });
      }
      [0.18, 0.82, 0.0].forEach(u => {
        at(u, 1.06 / H, () => {
          g.strokeStyle = "#ffffff";
          g.lineCap = "round";
          g.lineWidth = 0.012;
          g.beginPath();
          g.moveTo(0, -0.1);
          g.bezierCurveTo(0.06, -0.04, -0.06, 0.03, 0.0, 0.1);
          g.quadraticCurveTo(0.04, 0.13, 0.05, 0.08);
          g.stroke();
          g.beginPath();
          g.moveTo(0, -0.02);
          g.quadraticCurveTo(-0.06, -0.01, -0.07, 0.04);
          g.stroke();
        });
      });

      at(0.5, 0.28 / H, () => {
        leaf(-2.2, 0.17, 0.06);
        leaf(2.2, 0.17, 0.06);
        leaf(-0.9, 0.15, 0.05);
        leaf(0.9, 0.15, 0.05);
        leaf(Math.PI, 0.13, 0.05);
        curl(-1.5, 0.16, -1);
        curl(1.5, 0.16, 1);
        g.save();
        g.translate(-0.14, -0.09);
        rose(0.075);
        g.restore();
        g.save();
        g.translate(0.14, -0.09);
        rose(0.075);
        g.restore();
        bud(0.28, 0.15, 0.065);
        bud(-0.28, 0.15, 0.065);
        rose(0.145);
      });

      [0.0, 0.25, 0.75].forEach(u => {
        at(u, 0.27 / H, () => {
          g.strokeStyle = COBALT;
          g.lineWidth = 0.006;
          g.beginPath();
          g.moveTo(0, -0.18);
          g.bezierCurveTo(0.05, -0.08, -0.05, 0.05, 0.0, 0.18);
          g.stroke();
          [-0.13, -0.04, 0.06, 0.15].forEach((y, i) => {
            g.save();
            g.translate(0, y);
            leaf(i % 2 ? 1.0 : -1.0, 0.07, 0.025);
            g.restore();
          });
          rose(u === 0 ? 0.08 : 0.05);
        });
      });
      [0.28, 0.72].forEach(u => {
        at(u, 0.71 / H, () => {
          g.save();
          rose(0.035);
          g.restore();
          leaf(-1.2, 0.06, 0.022);
          leaf(1.2, 0.06, 0.022);
        });
      });
      at(0.5, 0.69 / H, () => {
        leaf(-1.9, 0.08, 0.03);
        leaf(1.9, 0.08, 0.03);
        rose(0.045);
      });
      paintTex = new THREE.CanvasTexture(cv);
      paintTex.anisotropy = 4;
    }

    const paintMat = new THREE.MeshPhysicalMaterial({ map: paintTex, color: 0xffffff, roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1 });
    const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xd6f0ff, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.14, depthWrite: false });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x2b5aa8, roughness: 0.35, emissive: 0x123a7a, emissiveIntensity: 0.35, side: THREE.DoubleSide });
    const rimMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf5ff, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });
    const crystalMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.82, emissive: 0x3d8fe0, emissiveIntensity: 0.18 });
    const cobaltMat = new THREE.MeshPhysicalMaterial({ color: 0x2146ab, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf5faff, roughness: 0.3, clearcoat: 0.8 });

    const bottomPts = splitAt(profile, SEAM, true);
    const topPts = splitAt(profile, SEAM, false);
    const shellPts = pts => pts.map(p => new THREE.Vector2(p.x > 0.001 ? p.x + 0.012 : 0, p.y));
    const innerPts = (y0, y1) => {
      const out = [];
      for (let i = 0; i <= 24; i++) {
        const y = lerp(y0, y1, i / 24);
        out.push(new THREE.Vector2(Math.max(0.02, radiusAt(y) - 0.04), y));
      }
      return out;
    };

    const lower = new THREE.Group();
    squash.add(lower);
    lower.add(mesh(lathe(bottomPts), paintMat));
    lower.add(mesh(lathe(shellPts(bottomPts)), iceMat, false));
    {
      const inner = innerPts(0.09, SEAM);
      inner.unshift(new THREE.Vector2(0.001, 0.09));
      lower.add(mesh(new THREE.LatheGeometry(inner, 48), innerMat, false));
      const rim = mesh(new THREE.RingGeometry(R_SEAM - 0.04, R_SEAM, 64), rimMat, false);
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = SEAM - 0.001;
      lower.add(rim);
    }
    const coreGlow = new THREE.PointLight(0x8fd2ff, 0, 2.2);
    coreGlow.position.set(0, 0.42, 0);
    lower.add(coreGlow);

    const hinge = new THREE.Group();
    hinge.position.set(0, SEAM, -R_SEAM);
    squash.add(hinge);
    const lidOff = new THREE.Group();
    lidOff.position.set(0, -SEAM, R_SEAM);
    hinge.add(lidOff);
    const lid = new THREE.Group();
    lidOff.add(lid);
    lid.add(mesh(lathe(topPts), paintMat));
    lid.add(mesh(lathe(shellPts(topPts)), iceMat, false));
    {
      const inner = innerPts(SEAM, 1.05);
      inner.push(new THREE.Vector2(0.001, 1.05));
      const g = new THREE.LatheGeometry(inner, 48);
      lid.add(mesh(g, innerMat, false));
      const rim = mesh(new THREE.RingGeometry(R_SEAM - 0.04, R_SEAM, 64), rimMat, false);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = SEAM + 0.001;
      lid.add(rim);
    }

    const HC = 1.0;
    const HR = 0.348;
    const face = (yaw, pitch, k = 1) => {
      const y = HC + Math.sin(pitch) * HR;
      const r = radiusAt(Math.min(H - 0.01, Math.max(SEAM, y))) * k;
      return new THREE.Vector3(Math.sin(yaw) * r, y, Math.cos(yaw) * r);
    };
    const orient = (o, yaw, pitch) => {
      o.rotation.order = "YXZ";
      o.rotation.set(-pitch * 0.9, yaw, 0);
    };

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.37, pupilColor: 0x1c3d9e });
      const yaw = 0.3 * s;
      const pitch = 0.02;
      e.g.position.copy(face(yaw, pitch, 0.955));
      orient(e.g, yaw, pitch);
      lid.add(e.g);
      return e;
    });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1b2f6e, roughness: 0.5 });
    const mouth = (() => {
      const pts = [];
      for (let i = 0; i <= 20; i++) {
        const u = i / 20;
        const yaw = lerp(-0.13, 0.13, u);
        const w = Math.abs(Math.sin(u * Math.PI * 2));
        pts.push(face(yaw, -0.27 - w * 0.045, 1.004));
      }
      return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.009, 6, false), mouthMat, false);
    })();
    lid.add(mouth);
    const mouthOpen = mesh(new THREE.SphereGeometry(1, 20, 14), mouthMat, false);
    mouthOpen.scale.set(0.05, 0.034, 0.016);
    mouthOpen.position.copy(face(0, -0.3, 0.998));
    orient(mouthOpen, 0, -0.3);
    mouthOpen.visible = false;
    lid.add(mouthOpen);
    const fang = mesh(new THREE.ConeGeometry(0.012, 0.026, 6), whiteMat, false);
    fang.position.copy(face(0.045, -0.305, 1.006));
    fang.rotation.set(Math.PI, 0, 0);
    lid.add(fang);
    const muzzle = new THREE.Group();
    muzzle.position.copy(face(0, -0.3, 1.2));
    lid.add(muzzle);

    const crown = new THREE.Group();
    crown.position.set(0, HC + 0.02, -0.05);
    crown.rotation.x = -0.26;
    lid.add(crown);
    const shards = [];
    {
      const RO = 0.43;
      const RI = 0.31;
      const A = 1.32;
      const sh = new THREE.Shape();
      const N = 64;
      for (let i = 0; i <= N; i++) {
        const a = lerp(-A, A, i / N);
        const r = RO + 0.022 * Math.cos(a * 11) * smooth(0, 0.25, A - Math.abs(a)) + 0.05 * (1 - Math.abs(a) / A);
        const px = Math.sin(a) * r;
        const py = Math.cos(a) * r;
        if (i === 0) sh.moveTo(px, py);
        else sh.lineTo(px, py);
      }
      for (let i = N; i >= 0; i--) {
        const a = lerp(-A, A, i / N);
        sh.lineTo(Math.sin(a) * RI, Math.cos(a) * RI);
      }
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 4 });
      g.translate(0, 0, -0.0175);
      crown.add(mesh(g, crystalMat, false));
      const band = mesh(new THREE.TorusGeometry(0.335, 0.014, 8, 48, A * 2), cobaltMat, false);
      band.rotation.z = Math.PI / 2 - A;
      band.position.z = 0.03;
      crown.add(band);
      const beadGeo = new THREE.SphereGeometry(0.014, 10, 8);
      for (let i = 0; i <= 16; i++) {
        const a = lerp(-A + 0.08, A - 0.08, i / 16);
        const r = RO - 0.035 + 0.05 * (1 - Math.abs(a) / A);
        const b = mesh(beadGeo, i % 2 ? whiteMat : cobaltMat, false);
        b.position.set(Math.sin(a) * r, Math.cos(a) * r, 0.032);
        crown.add(b);
      }
      [-0.9, -0.45, 0, 0.45, 0.9].forEach((a, i) => {
        const mid = 1 - Math.abs(a);
        const len = 0.05 + mid * 0.05;
        const cg = new THREE.CylinderGeometry(0, 0.022, len, 6);
        cg.translate(0, len / 2, 0);
        const spike = mesh(cg, crystalMat, false);
        const piv = new THREE.Group();
        const r = RO + 0.05 * (1 - Math.abs(a) / A) - 0.005;
        piv.position.set(Math.sin(a) * r, Math.cos(a) * r, 0);
        piv.rotation.z = -a;
        piv.add(spike);
        crown.add(piv);
        shards.push({ sh: spike, mid, ph: i * 0.9 });
      });
      const gem = new THREE.Group();
      gem.position.set(0, 0.395, 0.045);
      crown.add(gem);
      for (let k = 0; k < 6; k++) {
        const arm = mesh(new THREE.BoxGeometry(0.011, 0.07, 0.011), whiteMat, false);
        arm.position.set(Math.sin((k / 6) * TAU) * 0.034, Math.cos((k / 6) * TAU) * 0.034, 0);
        arm.rotation.z = -(k / 6) * TAU;
        gem.add(arm);
      }
      gem.add(mesh(new THREE.OctahedronGeometry(0.022, 0), cobaltMat, false));
    }


    const arms = [-1, 1].map(s => {
      const sh = new THREE.Group();
      const y = 0.74;
      sh.position.set(s * (radiusAt(y) - 0.02), y, 0.04);
      lid.add(sh);
      const piv = new THREE.Group();
      sh.add(piv);
      const g = new THREE.SphereGeometry(1, 20, 14);
      const arm = mesh(g, whiteMat);
      arm.scale.set(0.055, 0.11, 0.06);
      arm.position.set(s * 0.03, -0.08, 0.02);
      arm.rotation.z = s * 0.25;
      piv.add(arm);
      const cuff = mesh(new THREE.TorusGeometry(0.05, 0.016, 8, 24), cobaltMat, false);
      cuff.rotation.x = Math.PI / 2;
      cuff.rotation.y = s * 0.25;
      cuff.position.set(s * 0.045, -0.13, 0.02);
      piv.add(cuff);
      const hand = mesh(new THREE.SphereGeometry(0.042, 16, 12), whiteMat, false);
      hand.position.set(s * 0.055, -0.175, 0.025);
      piv.add(hand);
      return { piv, s };
    });

    const boots = [-1, 1].map(s => {
      const b = new THREE.Group();
      b.position.set(s * 0.14, 0.0, 0.34);
      squash.add(b);
      const boot = mesh(new THREE.SphereGeometry(1, 20, 14), cobaltMat);
      boot.scale.set(0.085, 0.06, 0.12);
      boot.position.y = 0.05;
      b.add(boot);
      const top = mesh(new THREE.TorusGeometry(0.055, 0.014, 8, 20), whiteMat, false);
      top.rotation.x = Math.PI / 2 - 0.4;
      top.position.set(0, 0.095, -0.05);
      b.add(top);
      const flake = mesh(new THREE.OctahedronGeometry(0.016, 0), whiteMat, false);
      flake.position.set(0, 0.07, 0.11);
      b.add(flake);
      return { b, s };
    });

    let flakeTex = null;
    let mistTex = null;
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const x = c.getContext("2d");
      x.translate(32, 32);
      x.strokeStyle = "rgba(255,255,255,1)";
      x.lineCap = "round";
      for (let k = 0; k < 6; k++) {
        x.save();
        x.rotate((k / 6) * TAU);
        x.lineWidth = 4;
        x.beginPath();
        x.moveTo(0, 0);
        x.lineTo(0, -27);
        x.stroke();
        x.lineWidth = 3;
        [-12, -20].forEach(d => {
          x.beginPath();
          x.moveTo(0, d);
          x.lineTo(-7, d - 6);
          x.moveTo(0, d);
          x.lineTo(7, d - 6);
          x.stroke();
        });
        x.restore();
      }
      flakeTex = new THREE.CanvasTexture(c);
      const m = document.createElement("canvas");
      m.width = m.height = 64;
      const y = m.getContext("2d");
      const gr = y.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(235,248,255,0.85)");
      gr.addColorStop(0.5, "rgba(200,232,255,0.35)");
      gr.addColorStop(1, "rgba(200,232,255,0)");
      y.fillStyle = gr;
      y.fillRect(0, 0, 64, 64);
      mistTex = new THREE.CanvasTexture(m);
    }
    const flakeMat = () => new THREE.SpriteMaterial({ map: flakeTex, color: 0xeaf6ff, transparent: true, depthWrite: false, opacity: 0 });
    const flakes = [];
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(flakeMat());
      s.visible = false;
      root.add(s);
      flakes.push({ s, a: (i / 16) * TAU * 3.7, sp: 0.75 + (i % 5) * 0.12, d: (i % 4) * 0.06, r: 0.12 + (i % 3) * 0.07 });
    }
    const mists = [];
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      root.add(s);
      mists.push({ s, k: i });
    }
    const happy = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(flakeMat());
      s.visible = false;
      root.add(s);
      happy.push({ s, ph: i / 6, a: i * 1.9 });
    }

    const glints = [];
    {
      const gGeo = new THREE.OctahedronGeometry(0.012, 0);
      const gMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let i = 0; i < 26; i++) {
        const y = 0.08 + ((i * 0.6180339) % 1) * 1.1;
        const a = Math.PI + ((i * 0.381966) % 1) * TAU;
        const r = radiusAt(y) + 0.014;
        const m = new THREE.Mesh(gGeo, gMat);
        m.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
        (y > SEAM ? lid : lower).add(m);
        glints.push({ m, ph: i * 2.3, sp: 0.6 + (i % 4) * 0.25 });
      }
    }

    const drops = [];
    {
      const dMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 4; i++) {
        const d = mesh(new THREE.SphereGeometry(0.022, 12, 10), dMat, false);
        d.scale.y = 1.4;
        d.visible = false;
        root.add(d);
        drops.push({ d, a: Math.PI * 0.5 + i * 1.6, ph: i * 0.27 });
      }
    }

    const food = berry();
    food.visible = false;
    squash.add(food);

    const crownEmit = crystalMat.emissiveIntensity;

    return {
      root,
      muzzle,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const joy = typeof s.joy === "number" ? s.joy : 100;
        const is = n => (action && action.name === n ? action : null);
        const jump = is("jump");
        const eat = is("eat");
        const frost = is("frost");
        const spinA = is("spin");
        const wob = is("wobble");
        const atk = is("attack") ? strike(action.p) : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const dying = !!s.dying;
        const vigor = dying ? 0.35 : 0.65 + 0.35 * clamp01(hunger / 100);

        let y = 0;
        let z = 0;
        let sy = 1 + Math.sin(t * 1.9) * 0.012 * motion;
        let tiltZ = Math.sin(t * 1.4) * 0.045 * motion;
        let tiltX = Math.sin(t * 1.05 + 0.6) * 0.02 * motion;
        let open = 0;
        let lift = 0;
        let twist = 0;
        let armUp = 0;
        let armWave = Math.sin(t * 2.1) * 0.08 * motion;
        let mouthO = false;
        let squint = 0;
        let charge = 0;
        let burst = 0;
        let airborne = false;
        let feetLift = 0;
        let flurry = 0;

        if (dying) {
          tiltZ = 0.12 + Math.sin(t * 0.8) * 0.02 * motion;
          tiltX = 0.08;
          sy -= 0.03;
          squint = 0.45;
        }
        if (jump) {
          const p = jump.p;
          if (p < 0.2) sy = 1 - 0.14 * Math.sin((p / 0.2) * Math.PI * 0.5);
          else if (p < 0.8) {
            const q = (p - 0.2) / 0.6;
            y = Math.sin(q * Math.PI) * 0.85;
            sy = 1 + 0.07 * Math.cos(q * Math.PI);
            twist = Math.sin(q * Math.PI) * 0.5;
            lift = Math.sin(q * Math.PI) * 0.012;
            armUp = Math.sin(q * Math.PI);
            mouthO = q > 0.15 && q < 0.75;
            airborne = true;
            feetLift = Math.sin(q * Math.PI);
          } else sy = 1 - 0.12 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
        }
        if (wob) {
          const p = wob.p;
          const damp = Math.pow(1 - p, 1.6);
          tiltZ += Math.sin(p * Math.PI * 5) * 0.32 * damp;
          tiltX += Math.sin(p * Math.PI * 5 + 1.2) * 0.06 * damp;
          armUp = 0.45 * damp + 0.2;
          armWave += Math.sin(p * Math.PI * 10) * 0.3 * damp;
          squint = p > 0.15 && p < 0.85 ? 0.6 : squint;
          feetLift = Math.max(0, Math.sin(p * Math.PI * 5)) * 0.4 * damp;
        }
        if (spinA) {
          const p = spinA.p;
          const k = smooth(0.08, 0.82, p);
          lift = Math.sin(Math.PI * clamp01((p - 0.04) / 0.86)) * 0.07;
          twist = k * TAU;
          squint = p > 0.1 && p < 0.9 ? 0.7 : 0;
          armUp = Math.sin(Math.PI * p) * 0.7;
          flurry = Math.sin(Math.PI * clamp01((p - 0.3) / 0.7));
          mouthO = p > 0.25 && p < 0.8;
        }
        if (frost) {
          const p = frost.p;
          charge = smooth(0, 0.42, p) * (1 - smooth(0.44, 0.5, p));
          burst = smooth(0.44, 0.52, p) * (1 - smooth(0.7, 0.95, p));
          open = smooth(0.42, 0.5, p) * (1 - smooth(0.82, 0.96, p));
          lift = open * 0.12;
          sy += -charge * 0.08 + burst * 0.05;
          tiltZ += Math.sin(p * 90) * 0.035 * charge * motion;
          tiltX += -charge * 0.08 + burst * 0.1;
          armUp = charge * 0.9 + burst * 0.6;
          squint = charge > 0.3 ? 0.8 : 0;
          mouthO = burst > 0.2;
        }
        if (eat) {
          const p = eat.p;
          open = smooth(0.08, 0.2, p) * (1 - smooth(0.3, 0.38, p));
          lift = open * 0.08;
          sy += -ph.chew * 0.05 * motion;
          tiltZ += Math.sin(p * 40) * 0.03 * ph.chew * motion;
          food.visible = ph.visible && p < 0.36;
          const fall = clamp01(ph.fall);
          food.position.set(0, lerp(3.0, 0.55, fall * fall), lerp(0.2, 0.05, fall));
          food.scale.setScalar(1 - smooth(0.28, 0.36, p) * 0.9);
          food.rotation.z = (1 - fall) * 1.2;
          squint = p > 0.38 ? 0.65 : 0;
          mouthO = p > 0.4 && p < 0.85 && ph.chew > 0.4;
          armUp = open * 0.6;
          flurry = smooth(0.36, 0.42, p) * (1 - smooth(0.6, 0.8, p));
        } else food.visible = false;
        if (atk) {
          tiltX += -atk.wind * 0.35 + atk.lunge * 0.42;
          z = atk.lunge * 0.7 - atk.wind * 0.12;
          y += Math.sin(Math.min(1, atk.lunge * 1.2) * Math.PI) * 0.14;
          sy += -atk.wind * 0.07 + atk.lunge * 0.05;
          armUp = atk.wind * 0.5;
          squint = atk.lunge > 0.25 ? 0.75 : 0;
          burst = Math.max(burst, atk.impact * 0.6);
          mouthO = atk.lunge > 0.2;
        }

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.set(0, y, z);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        sway.rotation.set(tiltX, 0, tiltZ);

        hinge.rotation.x = lerp(hinge.rotation.x, -open * 1.05, 0.35);
        hinge.position.y = lerp(hinge.position.y, SEAM + lift, 0.35);
        lid.rotation.y = twist;
        lid.rotation.z = Math.sin(t * 1.3) * 0.015 * motion;

        arms.forEach(({ piv, s: sd }) => {
          piv.rotation.z = lerp(piv.rotation.z, sd * (0.15 + armUp * 1.6 + armWave * (sd > 0 ? 1 : -1)), 0.25);
          piv.rotation.x = lerp(piv.rotation.x, -armUp * 0.3, 0.25);
        });
        boots.forEach(({ b, s: sd }, i) => {
          const step = wob ? Math.max(0, Math.sin(wob.p * Math.PI * 5 + i * Math.PI)) * 0.06 : 0;
          b.position.y = lerp(b.position.y, (airborne ? -0.02 : 0) + step, 0.3);
          b.rotation.x = lerp(b.rotation.x, feetLift * 0.4, 0.3);
          b.rotation.z = sd * feetLift * 0.15;
        });

        mouth.visible = !mouthO;
        mouthOpen.visible = mouthO;
        mouthOpen.scale.y = eat ? 0.02 + ph.chew * 0.022 : 0.034;

        const shine = (0.9 + 0.1 * Math.sin(t * 2.3)) * vigor;
        crystalMat.emissiveIntensity = crownEmit * shine + charge * 0.9 + burst * 1.2;
        shards.forEach(({ sh, mid, ph: sp }) => {
          sh.scale.y = 1 + Math.sin(t * 2.2 + sp) * 0.04 * motion + charge * 0.25 * (0.4 + mid);
        });
        coreGlow.intensity = open * 1.4 + charge * 0.4 + burst * 1.6;
        innerMat.emissiveIntensity = 0.35 + open * 0.9 + burst * 0.6;

        glints.forEach(({ m, ph: gp, sp }) => {
          const k = Math.max(0, Math.sin(t * sp * 2.2 + gp));
          m.scale.setScalar(Math.pow(k, 8) * 1.6 * vigor + 0.001);
          m.rotation.y = t * 2 + gp;
        });

        flakes.forEach(f => {
          if (!frost || frost.p < 0.44 || frost.p > 0.98) {
            f.s.visible = false;
            return;
          }
          const q = clamp01((frost.p - 0.44 - f.d * 0.5) / 0.5);
          if (q <= 0 || q >= 1) {
            f.s.visible = false;
            return;
          }
          f.s.visible = true;
          const dist = q * 3.2 * f.sp;
          const a = f.a + q * 5;
          const spread = 0.1 + q * 0.75;
          f.s.position.set(Math.cos(a) * f.r * spread * 2, SEAM + 0.12 + 0.35 * Math.sin(q * Math.PI) + Math.sin(a) * f.r * spread, 0.05 + dist);
          f.s.scale.setScalar(0.14 + q * 0.12);
          f.s.material.rotation = a;
          f.s.material.opacity = Math.sin(Math.PI * q);
        });
        mists.forEach(m => {
          const on = burst > 0.02 || (eat && flurry > 0.02);
          if (!on) {
            m.s.visible = false;
            return;
          }
          m.s.visible = true;
          const k = eat ? flurry : burst;
          const q = (m.k + 1) / mists.length;
          m.s.position.set(Math.sin(m.k * 2.1) * 0.25, SEAM + 0.15 + q * 0.25, eat ? 0.1 : 0.25 + q * k * 1.6);
          m.s.scale.setScalar((0.4 + q * 0.5) * (0.6 + k));
          m.s.material.opacity = k * 0.6 * (1 - q * 0.4);
        });
        const flurryK = Math.max(flurry, joy >= 90 && !dying ? 0.35 * Math.max(0, Math.sin(t * 0.35)) : 0);
        happy.forEach(h => {
          if (flurryK < 0.02) {
            h.s.visible = false;
            return;
          }
          h.s.visible = true;
          const u = (((t * 0.35 + h.ph) % 1) + 1) % 1;
          const a = h.a + t * 0.7;
          h.s.position.set(Math.sin(a) * (0.35 + u * 0.35), H + 0.45 - u * 1.1, Math.cos(a) * (0.35 + u * 0.35));
          h.s.scale.setScalar(0.09 + 0.04 * Math.sin(h.ph * 9));
          h.s.material.rotation = t + h.a;
          h.s.material.opacity = Math.sin(Math.PI * u) * flurryK;
        });
        drops.forEach(d => {
          if (!dying) {
            d.d.visible = false;
            return;
          }
          const u = (((t * 0.5 + d.ph) % 1) + 1) % 1;
          d.d.visible = true;
          const r = radiusAt(0.3) + 0.02;
          d.d.position.set(Math.sin(d.a) * r, 0.3 - u * 0.3, Math.cos(d.a) * r);
          d.d.scale.setScalar(1 - u * 0.4);
          d.d.scale.y = 1.4;
        });

        const lid0 = squint ? 1 - squint : blink;
        eyes.forEach(({ g }) => {
          g.scale.y = Math.max(0.08, lid0) * (airborne ? 1.08 : 1);
        });
        followPupils(eyes, pointer, 0.6);
      }
    };
  }
});
