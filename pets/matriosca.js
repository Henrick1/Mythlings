Pets.register({
  id: "matriosca",
  dex: 34,
  name: "Matrióscea",
  color: "#2a52b8",
  types: ["ice"],
  description: "Vestiu a casca de guerreiro: elmo pontudo, cota de malha de geada, escudo pintado e uma maça de cristal. Guarda o Matrinho na barriga de gelo transparente e não deixa ninguém chegar perto dele. Quando a briga aperta, abre o elmo e o pequeno sopra a nevasca lá de dentro.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.6 },
    frost: { duration: 2.0 },
    spin: { duration: 1.7 },
    wobble: { duration: 1.9 },
    peek: { duration: 2.4 },
    attack: { duration: 1.05 }
  },
  battle: { special: { action: "frost", hit: 0.52, speed: 1.25 } },
  idle: [
    { action: "peek", min: 25, max: 50 },
    { action: "wobble", min: 30, max: 60 },
    { action: "spin", min: 40, max: 80 }
  ],
  clickAction: n => ["jump", "peek", "frost", "spin", "wobble"][(n - 1) % 5],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const TAU = Math.PI * 2;
    const COBALT = "#1f43a8";
    const COBALT_D = "#132c78";
    const COBALT_L = "#dbe6fa";
    const hasDoc = typeof document !== "undefined";

    const crystalMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85, emissive: 0x3d8fe0, emissiveIntensity: 0.2 });
    const cobaltMat = new THREE.MeshPhysicalMaterial({ color: 0x2146ab, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf5faff, roughness: 0.3, clearcoat: 0.8 });
    const rimMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf5ff, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1b2f6e, roughness: 0.5 });

    const makeProfile = (ctrl, H) => {
      const curve = new THREE.CatmullRomCurve3(ctrl.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, "centripetal");
      const pts = [new THREE.Vector2(0, 0)];
      curve.getPoints(110).forEach(p => pts.push(new THREE.Vector2(Math.max(0, p.x), p.y)));
      pts[pts.length - 1].set(0, H);
      const r0 = ctrl[0][0];
      const radiusAt = y => {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          if (y >= a.y && y <= b.y && b.y > a.y) return lerp(a.x, b.x, (y - a.y) / (b.y - a.y));
        }
        return y <= 0 ? r0 : 0;
      };
      return { pts, radiusAt };
    };

    const paintDoll = o => {
      if (!hasDoc) return null;
      const { H, SEAM, radiusAt, k } = o;
      const CW = o.CW;
      const CH = o.CH;
      const cv = document.createElement("canvas");
      cv.width = CW;
      cv.height = CH;
      const g = cv.getContext("2d");
      const X = u => u * CW;
      const Y = v => (1 - v) * CH;
      const pxU = v => CW / (TAU * Math.max(0.12 * k, radiusAt(v * H)));
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
      let seed = o.seed || 7;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const seamV = SEAM / H;
      if (o.clear) {
        const low = g.createLinearGradient(0, CH, 0, Y(seamV));
        low.addColorStop(0, "rgba(228,243,255,0.82)");
        low.addColorStop(0.18, "rgba(222,240,255,0.42)");
        low.addColorStop(0.55, "rgba(215,236,255,0.16)");
        low.addColorStop(1, "rgba(225,242,255,0.3)");
        g.fillStyle = low;
        g.fillRect(0, Y(seamV), CW, CH - Y(seamV));
        const up = g.createLinearGradient(0, Y(seamV), 0, 0);
        up.addColorStop(0, "#eef6ff");
        up.addColorStop(1, "#ffffff");
        g.fillStyle = up;
        g.fillRect(0, 0, CW, Y(seamV));
        g.lineCap = "round";
        for (let i = 0; i < 60; i++) {
          let x = rnd() * CW;
          let y = Y(seamV) + rnd() * (CH - Y(seamV));
          g.strokeStyle = "rgba(255,255,255," + (0.25 + rnd() * 0.35) + ")";
          g.lineWidth = 0.8 + rnd() * 1.6;
          g.beginPath();
          g.moveTo(x, y);
          for (let s = 0; s < 4; s++) {
            x += (rnd() - 0.5) * 70;
            y += (rnd() - 0.5) * 50;
            g.lineTo(x, y);
          }
          g.stroke();
        }
      } else {
        const base = g.createLinearGradient(0, CH, 0, 0);
        base.addColorStop(0, "#c6dcf3");
        base.addColorStop(0.12, "#e7f1fc");
        base.addColorStop(0.5, "#f7fbff");
        base.addColorStop(1, "#ffffff");
        g.fillStyle = base;
        g.fillRect(0, 0, CW, CH);
      }
      for (let i = 0; i < 2000; i++) {
        const y = rnd() * CH;
        if (o.clear && y > Y(seamV)) continue;
        g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.55)" : "rgba(170,200,240,0.18)";
        g.beginPath();
        g.arc(rnd() * CW, y, 0.6 + rnd() * 1.8, 0, TAU);
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
          if (a === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
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
      const curl = (ang, size, dir = 1, color = COBALT) => {
        g.save();
        g.rotate(ang);
        g.strokeStyle = color;
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
      const band = (y, h, fill) => {
        g.fillStyle = fill;
        g.fillRect(0, Y((y + h) / H), CW, (h / H) * CH);
      };
      const ringDots = (y, n, r, color) => {
        for (let i = 0; i < n; i++) {
          at((i + 0.5) / n, y / H, () => {
            g.fillStyle = color;
            g.beginPath();
            g.arc(0, 0, r, 0, TAU);
            g.fill();
          });
        }
      };
      const flower5 = (r, color) => {
        g.fillStyle = color;
        for (let q = 0; q < 5; q++) {
          const a = (q / 5) * TAU;
          g.beginPath();
          g.arc(Math.cos(a) * r, Math.sin(a) * r, r * 0.62, 0, TAU);
          g.fill();
        }
        g.fillStyle = "#9fb6ec";
        g.beginPath();
        g.arc(0, 0, r * 0.42, 0, TAU);
        g.fill();
      };

      band(0, 0.07 * k, COBALT);
      ringDots(0.035 * k, 40, 0.009 * k, "#ffffff");
      for (let i = 0; i < 40; i++) {
        at(i / 40 + 0.0125, (0.07 * k) / H, () => {
          g.fillStyle = COBALT;
          g.beginPath();
          g.arc(0, 0, 0.012 * k, 0, Math.PI, true);
          g.fill();
        });
      }
      [-0.028, 0.028].forEach(d => band(SEAM + d * k - 0.004 * k, 0.008 * k, COBALT));
      ringDots(SEAM, 48, 0.011 * k, COBALT);

      if (o.clear) {
        for (let i = 0; i < 26; i++) {
          at((i + 0.5) / 26, (SEAM - 0.045 * k) / H, () => {
            g.fillStyle = COBALT;
            g.beginPath();
            g.ellipse(0, 0, 0.075 * k, 0.04 * k, 0, Math.PI, TAU);
            g.fill();
            g.fillStyle = "#ffffff";
            g.beginPath();
            g.arc(0, -0.012 * k, 0.008 * k, 0, TAU);
            g.fill();
          });
        }
        const frieze = 0.34 * k;
        [0.02, 0.18, 0.34, 0.66, 0.82].forEach((u, i) => {
          at(u, frieze / H, () => {
            leaf(-1.9, 0.12 * k, 0.04 * k);
            leaf(1.9, 0.12 * k, 0.04 * k);
            leaf(-0.6, 0.1 * k, 0.035 * k);
            leaf(0.6, 0.1 * k, 0.035 * k);
            curl(-2.6, 0.12 * k, -1);
            curl(2.6, 0.12 * k, 1);
            rose((i === 0 ? 0.11 : 0.085) * k);
          });
        });
        [0.1, 0.26, 0.74, 0.9].forEach(u => {
          at(u, (frieze - 0.02) / H, () => {
            g.strokeStyle = COBALT;
            g.lineWidth = 0.007 * k;
            g.beginPath();
            g.moveTo(-0.15 * k, 0.03 * k);
            g.bezierCurveTo(-0.05 * k, -0.06 * k, 0.05 * k, 0.08 * k, 0.15 * k, 0.0);
            g.stroke();
            bud(Math.PI, 0.0, 0.05 * k);
          });
        });
      } else {
        at(0.5, (0.28 * k) / H, () => {
          leaf(-2.2, 0.17 * k, 0.06 * k);
          leaf(2.2, 0.17 * k, 0.06 * k);
          leaf(-0.9, 0.15 * k, 0.05 * k);
          leaf(0.9, 0.15 * k, 0.05 * k);
          leaf(Math.PI, 0.13 * k, 0.05 * k);
          curl(-1.5, 0.16 * k, -1);
          curl(1.5, 0.16 * k, 1);
          [-1, 1].forEach(s => {
            g.save();
            g.translate(s * 0.14 * k, -0.09 * k);
            rose(0.075 * k);
            g.restore();
            bud(-s * 0.28, 0.15 * k, 0.065 * k);
          });
          rose(0.145 * k);
        });
        [0.0, 0.25, 0.75].forEach(u => {
          at(u, (0.27 * k) / H, () => {
            g.strokeStyle = COBALT;
            g.lineWidth = 0.006 * k;
            g.beginPath();
            g.moveTo(0, -0.18 * k);
            g.bezierCurveTo(0.05 * k, -0.08 * k, -0.05 * k, 0.05 * k, 0, 0.18 * k);
            g.stroke();
            [-0.13, -0.04, 0.06, 0.15].forEach((y, i) => {
              g.save();
              g.translate(0, y * k);
              leaf(i % 2 ? 1.0 : -1.0, 0.07 * k, 0.025 * k);
              g.restore();
            });
            rose((u === 0 ? 0.08 : 0.05) * k);
          });
        });
      }

      const chestY = o.chestY;
      at(0.5, chestY / H, () => {
        leaf(-1.9, 0.09 * k, 0.03 * k);
        leaf(1.9, 0.09 * k, 0.03 * k);
        leaf(-0.7, 0.07 * k, 0.025 * k);
        leaf(0.7, 0.07 * k, 0.025 * k);
        rose(0.05 * k * (o.clear ? 1.5 : 1));
      });
      [0.28, 0.72].forEach(u => {
        at(u, (chestY + 0.02 * k) / H, () => {
          rose(0.035 * k * (o.clear ? 1.3 : 1));
          leaf(-1.2, 0.06 * k, 0.022 * k);
          leaf(1.2, 0.06 * k, 0.022 * k);
        });
      });

      const HOOD_V = o.hoodY / H;
      g.fillStyle = COBALT;
      g.fillRect(0, 0, CW, Y(HOOD_V));
      for (let i = 0; i < 18; i++) {
        at((i + 0.5) / 18, HOOD_V, () => {
          g.fillStyle = COBALT;
          g.beginPath();
          g.ellipse(0, 0, 0.068 * k, 0.034 * k, 0, Math.PI, TAU);
          g.fill();
          g.fillStyle = "#ffffff";
          g.beginPath();
          g.arc(0, -0.008 * k, 0.008 * k, 0, TAU);
          g.fill();
        });
      }
      at(0.5, o.faceY / H, () => {
        const w = 0.27 * k;
        const win = () => {
          g.moveTo(-w, -0.2 * k);
          g.lineTo(-w, 0.0);
          g.bezierCurveTo(-w, 0.15 * k, -0.14 * k, 0.19 * k, -0.06 * k, 0.16 * k);
          g.quadraticCurveTo(-0.018 * k, 0.145 * k, 0, 0.1 * k);
          g.quadraticCurveTo(0.018 * k, 0.145 * k, 0.06 * k, 0.16 * k);
          g.bezierCurveTo(0.14 * k, 0.19 * k, w, 0.15 * k, w, 0.0);
          g.lineTo(w, -0.2 * k);
        };
        g.fillStyle = "#f6faff";
        g.beginPath();
        win();
        g.closePath();
        g.fill();
        g.strokeStyle = COBALT_D;
        g.lineWidth = 0.008 * k;
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
            g.arc(s * x * k, y * k, r * k, 0, TAU);
            g.fill();
          });
        });
      });
      for (let i = 0; i < 50; i++) {
        const u = rnd();
        const v = HOOD_V + 0.03 + rnd() * (1 - HOOD_V - 0.07);
        if (Math.abs(u - 0.5) < 0.15 && v * H < o.faceY + 0.2 * k) continue;
        at(u, v, () => flower5(0.012 * k, "#ffffff"));
      }
      [0.18, 0.82, 0.0].forEach(u => {
        at(u, (o.faceY + 0.06 * k) / H, () => {
          curl(0, 0.2 * k, 1, "#ffffff");
          curl(Math.PI, 0.14 * k, -1, "#ffffff");
        });
      });
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 4;
      return tex;
    };

    const buildDoll = o => {
      const { pts, radiusAt } = makeProfile(o.ctrl, o.H);
      const { H, SEAM } = o;
      const R_SEAM = radiusAt(SEAM);
      const tex = paintDoll({ H, SEAM, radiusAt, k: o.k, hoodY: o.hoodY, faceY: o.faceY, chestY: o.chestY, clear: o.clear, CW: o.CW, CH: o.CH, seed: o.seed });
      const split = below => {
        const out = pts.filter(p => (below ? p.y <= SEAM : p.y >= SEAM)).map(p => p.clone());
        const sp = new THREE.Vector2(R_SEAM, SEAM);
        if (below) out.push(sp);
        else out.unshift(sp);
        return out;
      };
      const lathe = p => {
        const g = new THREE.LatheGeometry(p, o.seg, Math.PI, TAU);
        const pos = g.attributes.position;
        const uv = g.attributes.uv;
        for (let i = 0; i < pos.count; i++) uv.setY(i, pos.getY(i) / H);
        uv.needsUpdate = true;
        g.computeVertexNormals();
        return g;
      };
      const shell = p => p.map(q => new THREE.Vector2(q.x > 0.001 ? q.x + 0.012 * o.k : 0, q.y));
      const inner = (y0, y1) => {
        const out = [];
        for (let i = 0; i <= 24; i++) {
          const y = lerp(y0, y1, i / 24);
          out.push(new THREE.Vector2(Math.max(0.02, radiusAt(y) - 0.04 * o.k), y));
        }
        return out;
      };
      const solidMat = new THREE.MeshPhysicalMaterial({ map: tex, color: 0xffffff, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 });
      const lowMat = o.clear ? new THREE.MeshPhysicalMaterial({ map: tex, color: 0xffffff, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, depthWrite: false }) : solidMat;
      const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xd6f0ff, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.14, depthWrite: false });
      const innerMat = o.clear
        ? new THREE.MeshPhysicalMaterial({ color: 0x9fd2ff, roughness: 0.1, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false, emissive: 0x2a6fc0, emissiveIntensity: 0.2 })
        : new THREE.MeshStandardMaterial({ color: 0x2b5aa8, roughness: 0.35, emissive: 0x123a7a, emissiveIntensity: 0.35, side: THREE.DoubleSide });

      const group = new THREE.Group();
      const lower = new THREE.Group();
      group.add(lower);
      const bottom = split(true);
      lower.add(mesh(lathe(bottom), lowMat, !o.clear));
      if (!o.clear) lower.add(mesh(lathe(shell(bottom)), iceMat, false));
      {
        const p = inner(0.09 * o.k, SEAM);
        p.unshift(new THREE.Vector2(0.001, 0.09 * o.k));
        lower.add(mesh(new THREE.LatheGeometry(p, 48), innerMat, false));
        const rim = mesh(new THREE.RingGeometry(R_SEAM - 0.04 * o.k, R_SEAM, 64), rimMat, false);
        rim.rotation.x = -Math.PI / 2;
        rim.position.y = SEAM - 0.001;
        lower.add(rim);
      }
      const hinge = new THREE.Group();
      hinge.position.set(0, SEAM, -R_SEAM);
      group.add(hinge);
      const off = new THREE.Group();
      off.position.set(0, -SEAM, R_SEAM);
      hinge.add(off);
      const lid = new THREE.Group();
      off.add(lid);
      const top = split(false);
      lid.add(mesh(lathe(top), solidMat));
      lid.add(mesh(lathe(shell(top)), iceMat, false));
      {
        const p = inner(SEAM, o.faceY + 0.05 * o.k);
        p.push(new THREE.Vector2(0.001, o.faceY + 0.05 * o.k));
        lid.add(mesh(new THREE.LatheGeometry(p, 48), o.clear ? new THREE.MeshStandardMaterial({ color: 0x2b5aa8, roughness: 0.35, emissive: 0x123a7a, emissiveIntensity: 0.35, side: THREE.DoubleSide }) : innerMat, false));
        const rim = mesh(new THREE.RingGeometry(R_SEAM - 0.04 * o.k, R_SEAM, 64), rimMat, false);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = SEAM + 0.001;
        lid.add(rim);
      }
      const HR = o.headR;
      const face = (yaw, pitch, kk = 1) => {
        const y = o.headC + Math.sin(pitch) * HR;
        const r = radiusAt(Math.min(H - 0.01, Math.max(SEAM, y))) * kk;
        return new THREE.Vector3(Math.sin(yaw) * r, y, Math.cos(yaw) * r);
      };
      const orient = (obj, yaw, pitch) => {
        obj.rotation.order = "YXZ";
        obj.rotation.set(-pitch * 0.9, yaw, 0);
      };
      const eyes = [-1, 1].map(s => {
        const e = eye({ size: o.eye, pupilColor: 0x1c3d9e });
        const yaw = o.eyeYaw * s;
        const ep = o.eyePitch === undefined ? 0.02 : o.eyePitch;
        e.g.position.copy(face(yaw, ep, 0.972));
        orient(e.g, yaw, ep);
        lid.add(e.g);
        return e;
      });
      const mouth = (() => {
        const p = [];
        for (let i = 0; i <= 24; i++) {
          const u = i / 24;
          const w = Math.abs(Math.sin(u * Math.PI * 2));
          const c = 2 * u - 1;
          const pitch = o.grin ? -0.33 + 0.1 * c * c : -0.27 - w * 0.045;
          p.push(face(lerp(-o.mouthW, o.mouthW, u), pitch, 1.004));
        }
        return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 40, 0.009 * o.k, 6, false), mouthMat, false);
      })();
      lid.add(mouth);
      const mouthOpen = mesh(new THREE.SphereGeometry(1, 20, 14), mouthMat, false);
      mouthOpen.scale.set(0.05 * o.k, 0.034 * o.k, 0.016 * o.k);
      mouthOpen.position.copy(face(0, -0.3, 0.998));
      orient(mouthOpen, 0, -0.3);
      mouthOpen.visible = false;
      lid.add(mouthOpen);
      (o.fangs || [0.045]).forEach(x => {
        const f = mesh(new THREE.ConeGeometry(0.012 * o.k, 0.026 * o.k, 6), whiteMat, false);
        f.position.copy(face(x, o.grin ? -0.33 + 0.1 * Math.pow(x / o.mouthW, 2) - 0.014 : -0.305, 1.006));
        f.rotation.set(Math.PI, 0, 0);
        lid.add(f);
      });
      const coreGlow = new THREE.PointLight(0x8fd2ff, 0, 2.2 * o.k);
      coreGlow.position.set(0, SEAM * 0.7, 0);
      lower.add(coreGlow);
      return { group, lower, hinge, lid, face, orient, eyes, mouth, mouthOpen, R_SEAM, H, SEAM, radiusAt, innerMat, coreGlow };
    };

    const crystal = (len, r) => {
      const g = new THREE.CylinderGeometry(0, r, len, 6);
      g.translate(0, len / 2, 0);
      return mesh(g, crystalMat, false);
    };

    const root = new THREE.Group();
    const sway = new THREE.Group();
    root.add(sway);
    const squash = new THREE.Group();
    sway.add(squash);

    const OH = 1.78;
    const big = buildDoll({
      ctrl: [
        [0.4, 0.0],
        [0.52, 0.03],
        [0.63, 0.1],
        [0.71, 0.22],
        [0.74, 0.36],
        [0.72, 0.5],
        [0.67, 0.64],
        [0.6, 0.77],
        [0.545, 0.9],
        [0.505, 1.02],
        [0.49, 1.12],
        [0.493, 1.22],
        [0.492, 1.33],
        [0.472, 1.45],
        [0.432, 1.56],
        [0.36, 1.65],
        [0.262, 1.72],
        [0.14, 1.765],
        [0.0, OH]
      ],
      H: OH,
      SEAM: 0.92,
      k: 1.36,
      hoodY: 1.18,
      faceY: 1.36,
      chestY: 1.04,
      headC: 1.36,
      headR: 0.49,
      clear: true,
      CW: 2048,
      CH: 1024,
      seg: 80,
      eye: 0.5,
      eyeYaw: 0.29,
      eyePitch: -0.05,
      mouthW: 0.2,
      fangs: [-0.09, 0.09],
      grin: true,
      seed: 11
    });
    squash.add(big.group);

    const MH = 1.305;
    const MS = 0.5;
    const miniHolder = new THREE.Group();
    miniHolder.position.set(0, 0.08, 0.02);
    big.lower.add(miniHolder);
    const miniSway = new THREE.Group();
    miniHolder.add(miniSway);
    const mini = buildDoll({
      ctrl: [
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
        [0.0, MH]
      ],
      H: MH,
      SEAM: 0.6,
      k: 1,
      hoodY: 0.86,
      faceY: 1.0,
      chestY: 0.69,
      headC: 1.0,
      headR: 0.348,
      clear: false,
      CW: 1024,
      CH: 512,
      seg: 48,
      eye: 0.37,
      eyeYaw: 0.3,
      mouthW: 0.13,
      fangs: [0.045],
      seed: 7
    });
    mini.group.scale.setScalar(MS);
    miniSway.add(mini.group);
    [-1, 1].forEach(s => {
      const tuft = new THREE.Group();
      tuft.position.copy(mini.face(1.0 * s, 0.55, 0.92));
      tuft.rotation.set(0, 0, -s * 0.55);
      mini.lid.add(tuft);
      [
        [0, 0.24, 0.04, 0],
        [-0.055, 0.16, 0.03, 0.42],
        [0.05, 0.14, 0.028, -0.4]
      ].forEach(([x, len, r, lean]) => {
        const c = crystal(len, r);
        c.position.x = x * s;
        c.rotation.z = lean * s;
        tuft.add(c);
      });
    });

    const shards = [];
    const helm = new THREE.Group();
    big.lid.add(helm);
    {
      const RIM = 1.47;
      const r0 = big.radiusAt(RIM) + 0.04;
      const prof = [
        [r0, RIM],
        [r0 - 0.005, RIM + 0.08],
        [r0 - 0.035, RIM + 0.19],
        [r0 - 0.095, RIM + 0.31],
        [r0 - 0.185, RIM + 0.43],
        [r0 - 0.3, RIM + 0.55],
        [r0 - 0.4, RIM + 0.65],
        [r0 - 0.465, RIM + 0.72],
        [0.0, RIM + 0.76]
      ];
      const hc = new THREE.CatmullRomCurve3(prof.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, "centripetal");
      const hp = hc.getPoints(60).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
      hp[hp.length - 1].set(0, RIM + 0.76);
      let helmTex = null;
      if (hasDoc) {
        const c = document.createElement("canvas");
        c.width = 1024;
        c.height = 512;
        const x = c.getContext("2d");
        const gr = x.createLinearGradient(0, 512, 0, 0);
        gr.addColorStop(0, "#17388f");
        gr.addColorStop(1, "#2a55c2");
        x.fillStyle = gr;
        x.fillRect(0, 0, 1024, 512);
        x.strokeStyle = "#ffffff";
        x.lineCap = "round";
        for (let i = 0; i < 8; i++) {
          const u = (i / 8) * 1024;
          x.lineWidth = 7;
          x.beginPath();
          x.moveTo(u, 512);
          x.lineTo(u, 30);
          x.stroke();
          const m = u + 64;
          x.lineWidth = 5;
          x.beginPath();
          x.moveTo(m, 470);
          x.bezierCurveTo(m + 30, 400, m - 30, 330, m, 260);
          x.bezierCurveTo(m + 22, 210, m - 18, 170, m, 120);
          x.stroke();
          [430, 330, 220].forEach((y, k) => {
            x.beginPath();
            x.ellipse(m + (k % 2 ? -18 : 18), y, 14, 8, k % 2 ? 0.6 : -0.6, 0, Math.PI * 2);
            x.fillStyle = "#ffffff";
            x.fill();
          });
        }
        x.fillStyle = "#ffffff";
        for (let i = 0; i < 48; i++) {
          x.beginPath();
          x.arc((i + 0.5) * (1024 / 48), 490, 6, 0, Math.PI * 2);
          x.fill();
        }
        helmTex = new THREE.CanvasTexture(c);
      }
      const helmMat = new THREE.MeshPhysicalMaterial({ map: helmTex, color: 0xffffff, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
      helm.add(mesh(new THREE.LatheGeometry(hp, 64, Math.PI, TAU), helmMat));
      const rim = mesh(new THREE.TorusGeometry(r0, 0.034, 10, 64), whiteMat, false);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = RIM + 0.005;
      helm.add(rim);
      const beadGeo = new THREE.SphereGeometry(0.018, 10, 8);
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * TAU;
        const b = mesh(beadGeo, cobaltMat, false);
        b.position.set(Math.sin(a) * (r0 + 0.03), RIM + 0.005, Math.cos(a) * (r0 + 0.03));
        helm.add(b);
      }
      const nas = new THREE.Shape();
      nas.moveTo(-0.032, 0);
      nas.lineTo(0.032, 0);
      nas.lineTo(0.026, -0.15);
      nas.lineTo(0, -0.2);
      nas.lineTo(-0.026, -0.15);
      nas.closePath();
      const ng = new THREE.ExtrudeGeometry(nas, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
      const nasal = mesh(ng, cobaltMat, false);
      nasal.position.set(0, RIM + 0.02, big.radiusAt(RIM - 0.08) + 0.012);
      nasal.rotation.x = -0.12;
      helm.add(nasal);
      const tip = crystal(0.3, 0.055);
      tip.position.set(0, RIM + 0.73, 0);
      helm.add(tip);
      shards.push({ sh: tip, mid: 1, ph: 0 });
      const tipBall = mesh(new THREE.OctahedronGeometry(0.06, 0), crystalMat, false);
      tipBall.position.set(0, RIM + 0.74, 0);
      helm.add(tipBall);
      [-1, 1].forEach(s => {
        const w = new THREE.Group();
        w.position.set(s * (r0 - 0.06), RIM + 0.2, -0.05);
        w.rotation.z = -s * 0.85;
        helm.add(w);
        [0, 1].forEach(k => {
          const c = crystal(0.2 - k * 0.07, 0.04 - k * 0.01);
          c.position.set(0, 0, -0.06 * k);
          c.rotation.x = -0.25 - k * 0.3;
          w.add(c);
          shards.push({ sh: c, mid: 0.6, ph: s + k });
        });
      });

      let mailTex = null;
      if (hasDoc) {
        const c = document.createElement("canvas");
        c.width = 128;
        c.height = 64;
        const x = c.getContext("2d");
        x.fillStyle = "#3d5683";
        x.fillRect(0, 0, 128, 64);
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 9; col++) {
            const cx = col * 16 + (row % 2) * 8;
            const cy = row * 14 + 6;
            x.lineWidth = 4.2;
            x.strokeStyle = "#f2f8ff";
            x.beginPath();
            x.arc(cx, cy, 6, 0, Math.PI * 2);
            x.stroke();
          }
        }
        mailTex = new THREE.CanvasTexture(c);
        mailTex.wrapS = mailTex.wrapT = THREE.RepeatWrapping;
        mailTex.repeat.set(9, 2);
      }
      const mailMat = new THREE.MeshPhysicalMaterial({ map: mailTex, color: 0xffffff, metalness: 0.05, roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide });
      const mp = [];
      for (let i = 0; i <= 12; i++) {
        const q = i / 12;
        const y = lerp(RIM + 0.01, RIM - 0.36, q);
        mp.push(new THREE.Vector2(big.radiusAt(y) + 0.03 + q * q * 0.06, y));
      }
      const mailGeo = new THREE.LatheGeometry(mp.reverse(), 56, 0.9, TAU - 1.8);
      const mail = mesh(mailGeo, mailMat);
      helm.add(mail);
      const hemPts = [];
      for (let i = 0; i <= 40; i++) {
        const a = 0.9 + (i / 40) * (TAU - 1.8);
        const y = RIM - 0.36;
        const r = big.radiusAt(y) + 0.09;
        hemPts.push(new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r));
      }
      helm.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hemPts), 60, 0.018, 6, false), cobaltMat, false));
    }

    const brows = [-1, 1].map(s => {
      const b = mesh(new THREE.BoxGeometry(0.17, 0.045, 0.05), cobaltMat, false);
      const yaw = 0.29 * s;
      b.position.copy(big.face(yaw, 0.085, 1.014));
      b.rotation.order = "YXZ";
      b.rotation.set(-0.2, yaw, s * 0.32);
      big.lid.add(b);
      return { b, s, base: b.position.y };
    });

    let shieldTex = null;
    if (hasDoc) {
      const c = document.createElement("canvas");
      c.width = c.height = 512;
      const x = c.getContext("2d");
      x.translate(256, 256);
      x.fillStyle = "#f6faff";
      x.beginPath();
      x.arc(0, 0, 256, 0, TAU);
      x.fill();
      x.fillStyle = COBALT;
      x.beginPath();
      x.arc(0, 0, 256, 0, TAU);
      x.arc(0, 0, 214, 0, TAU, true);
      x.fill();
      x.fillStyle = "#ffffff";
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        x.beginPath();
        x.arc(Math.cos(a) * 235, Math.sin(a) * 235, 8, 0, TAU);
        x.fill();
      }
      const petalS = (ang, dist, len, wid) => {
        x.save();
        x.rotate(ang);
        x.translate(0, dist);
        x.beginPath();
        x.moveTo(0, 0);
        x.bezierCurveTo(wid * 1.1, len * 0.25, wid * 0.9, len * 0.8, 0, len);
        x.bezierCurveTo(-wid * 0.35, len * 0.7, -wid * 0.45, len * 0.3, 0, 0);
        const gr = x.createLinearGradient(-wid * 0.4, 0, wid, 0);
        gr.addColorStop(0, COBALT_D);
        gr.addColorStop(0.45, COBALT);
        gr.addColorStop(1, COBALT_L);
        x.fillStyle = gr;
        x.fill();
        x.restore();
      };
      for (let i = 0; i < 8; i++) petalS((i / 8) * TAU + 0.4, 150, 55, 30);
      for (let i = 0; i < 10; i++) petalS((i / 10) * TAU, 52, 80, 46);
      for (let i = 0; i < 7; i++) petalS((i / 7) * TAU + 0.3, 20, 50, 30);
      shieldTex = new THREE.CanvasTexture(c);
    }
    const arms = [-1, 1].map(s => {
      const sh = new THREE.Group();
      const y = 1.06;
      sh.position.set(s * (big.radiusAt(y) - 0.03), y, 0.05);
      big.lid.add(sh);
      const pad = mesh(new THREE.SphereGeometry(1, 24, 16, 0, TAU, 0, Math.PI * 0.55), cobaltMat);
      pad.scale.set(0.15, 0.11, 0.15);
      pad.position.set(s * 0.03, 0.02, 0);
      pad.rotation.z = -s * 0.35;
      sh.add(pad);
      const padRim = mesh(new THREE.TorusGeometry(0.14, 0.016, 8, 28), whiteMat, false);
      padRim.rotation.set(Math.PI / 2, 0, 0);
      padRim.rotation.y = -s * 0.35;
      padRim.position.set(s * 0.03, 0.005, 0);
      sh.add(padRim);
      const pc = crystal(0.12, 0.03);
      pc.position.set(s * 0.06, 0.1, 0);
      pc.rotation.z = -s * 0.5;
      sh.add(pc);
      const piv = new THREE.Group();
      sh.add(piv);
      const arm = mesh(new THREE.SphereGeometry(1, 22, 16), whiteMat);
      arm.scale.set(0.085, 0.17, 0.09);
      arm.position.set(s * 0.045, -0.12, 0.02);
      arm.rotation.z = s * 0.22;
      piv.add(arm);
      const cuff = mesh(new THREE.TorusGeometry(0.078, 0.022, 8, 28), cobaltMat, false);
      cuff.rotation.x = Math.PI / 2;
      cuff.rotation.y = s * 0.22;
      cuff.position.set(s * 0.07, -0.2, 0.025);
      piv.add(cuff);
      const hand = mesh(new THREE.SphereGeometry(0.064, 18, 14), whiteMat, false);
      hand.position.set(s * 0.085, -0.27, 0.03);
      piv.add(hand);
      if (s < 0) {
        const shield = new THREE.Group();
        shield.position.set(s * 0.17, -0.2, 0.1);
        shield.rotation.set(0, s * 0.95, 0);
        piv.add(shield);
        const face2 = new THREE.Group();
        face2.rotation.x = Math.PI / 2;
        shield.add(face2);
        const disc = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.035, 48), [whiteMat, new THREE.MeshPhysicalMaterial({ map: shieldTex, color: 0xffffff, roughness: 0.25, clearcoat: 1 }), cobaltMat]);
        face2.add(disc);
        const edge = mesh(new THREE.TorusGeometry(0.26, 0.022, 8, 48), cobaltMat, false);
        edge.rotation.x = Math.PI / 2;
        face2.add(edge);
        const boss = mesh(new THREE.OctahedronGeometry(0.06, 0), crystalMat, false);
        boss.position.y = 0.035;
        boss.scale.set(1, 0.6, 1);
        face2.add(boss);
      } else {
        const mace = new THREE.Group();
        mace.position.set(s * 0.09, -0.3, 0.06);
        mace.rotation.set(0.35, 0, -0.15);
        piv.add(mace);
        const handle = mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.46, 10), cobaltMat);
        handle.position.y = 0.1;
        mace.add(handle);
        [0, 0.08, 0.16].forEach(yy => {
          const band = mesh(new THREE.TorusGeometry(0.025, 0.007, 6, 14), whiteMat, false);
          band.rotation.x = Math.PI / 2;
          band.position.y = yy;
          mace.add(band);
        });
        const head = mesh(new THREE.IcosahedronGeometry(0.085, 0), crystalMat, false);
        head.position.y = 0.36;
        mace.add(head);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU;
          const sp = crystal(0.07, 0.02);
          sp.position.set(Math.cos(a) * 0.06, 0.36, Math.sin(a) * 0.06);
          sp.rotation.set(Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3);
          mace.add(sp);
        }
        const top = crystal(0.09, 0.022);
        top.position.y = 0.42;
        mace.add(top);
        shards.push({ sh: top, mid: 0.5, ph: 5 });
      }
      return { piv };
    });

    const boots = [-1, 1].map(s => {
      const b = new THREE.Group();
      b.position.set(s * 0.21, 0, 0.5);
      squash.add(b);
      const boot = mesh(new THREE.SphereGeometry(1, 22, 16), cobaltMat);
      boot.scale.set(0.12, 0.085, 0.17);
      boot.position.y = 0.07;
      b.add(boot);
      const top = mesh(new THREE.TorusGeometry(0.078, 0.02, 8, 22), whiteMat, false);
      top.rotation.x = Math.PI / 2 - 0.4;
      top.position.set(0, 0.135, -0.07);
      b.add(top);
      const flake = mesh(new THREE.OctahedronGeometry(0.022, 0), whiteMat, false);
      flake.position.set(0, 0.1, 0.155);
      b.add(flake);
      return { b, s };
    });

    let flakeTex = null;
    let mistTex = null;
    if (hasDoc) {
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
    for (let i = 0; i < 22; i++) {
      const s = new THREE.Sprite(flakeMat());
      s.visible = false;
      root.add(s);
      flakes.push({ s, a: (i / 22) * TAU * 3.7, sp: 0.75 + (i % 5) * 0.12, d: (i % 4) * 0.06, r: 0.14 + (i % 3) * 0.08 });
    }
    const mists = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      root.add(s);
      mists.push({ s, k: i });
    }
    const happy = [];
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Sprite(flakeMat());
      s.visible = false;
      root.add(s);
      happy.push({ s, ph: i / 8, a: i * 1.9 });
    }
    const glints = [];
    {
      const gGeo = new THREE.OctahedronGeometry(0.016, 0);
      const gMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let i = 0; i < 34; i++) {
        const y = 0.1 + ((i * 0.6180339) % 1) * 1.55;
        const a = Math.PI + ((i * 0.381966) % 1) * TAU;
        const r = big.radiusAt(y) + 0.018;
        const m = new THREE.Mesh(gGeo, gMat);
        m.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
        (y > big.SEAM ? big.lid : big.lower).add(m);
        glints.push({ m, ph: i * 2.3, sp: 0.6 + (i % 4) * 0.25 });
      }
    }
    const drops = [];
    {
      const dMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 5; i++) {
        const d = mesh(new THREE.SphereGeometry(0.03, 12, 10), dMat, false);
        d.visible = false;
        root.add(d);
        drops.push({ d, a: Math.PI * 0.5 + i * 1.3, ph: i * 0.23 });
      }
    }
    const food = berry();
    food.visible = false;
    squash.add(food);
    const muzzle = new THREE.Group();
    muzzle.position.copy(big.face(0, -0.3, 1.2));
    big.lid.add(muzzle);
    const crownEmit = crystalMat.emissiveIntensity;
    const allEyes = big.eyes;

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
        const peek = is("peek");
        const atk = is("attack") ? strike(action.p) : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const dying = !!s.dying;
        const vigor = dying ? 0.35 : 0.65 + 0.35 * clamp01(hunger / 100);

        let y = 0;
        let z = 0;
        let sy = 1 + Math.sin(t * 1.7) * 0.01 * motion;
        let tiltZ = Math.sin(t * 1.2) * 0.035 * motion;
        let tiltX = Math.sin(t * 0.95 + 0.6) * 0.018 * motion;
        let open = 0;
        let lift = 0;
        let twist = 0;
        let armUp = 0;
        let armWave = Math.sin(t * 1.9) * 0.07 * motion;
        let mouthO = false;
        let squint = 0;
        let charge = 0;
        let burst = 0;
        let airborne = false;
        let feetLift = 0;
        let flurry = 0;
        let rise = 0;
        let miniOpen = 0;
        let miniTwist = 0;
        let miniTilt = Math.sin(t * 1.6 + 1) * 0.06 * motion;
        let miniSquint = 0;
        let miniLook = 0;
        let miniMouth = false;
        let swingX = 0;
        let guardX = 0;
        let browK = 0;

        if (dying) {
          tiltZ = 0.1 + Math.sin(t * 0.8) * 0.02 * motion;
          tiltX = 0.07;
          sy -= 0.03;
          squint = 0.45;
          miniSquint = 0.8;
        }
        if (jump) {
          const p = jump.p;
          if (p < 0.2) sy = 1 - 0.13 * Math.sin((p / 0.2) * Math.PI * 0.5);
          else if (p < 0.8) {
            const q = (p - 0.2) / 0.6;
            y = Math.sin(q * Math.PI) * 0.7;
            sy = 1 + 0.06 * Math.cos(q * Math.PI);
            twist = Math.sin(q * Math.PI) * 0.4;
            lift = Math.sin(q * Math.PI) * 0.012;
            armUp = Math.sin(q * Math.PI);
            mouthO = q > 0.15 && q < 0.75;
            airborne = true;
            feetLift = Math.sin(q * Math.PI);
            miniTilt += Math.sin(q * Math.PI * 2) * 0.2;
          } else sy = 1 - 0.11 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
        }
        if (wob) {
          const p = wob.p;
          const damp = Math.pow(1 - p, 1.6);
          tiltZ += Math.sin(p * Math.PI * 5) * 0.28 * damp;
          tiltX += Math.sin(p * Math.PI * 5 + 1.2) * 0.05 * damp;
          miniTilt -= Math.sin(p * Math.PI * 5 - 0.8) * 0.35 * damp;
          armUp = 0.4 * damp + 0.2;
          armWave += Math.sin(p * Math.PI * 10) * 0.25 * damp;
          squint = p > 0.15 && p < 0.85 ? 0.6 : squint;
          miniSquint = squint;
          feetLift = Math.max(0, Math.sin(p * Math.PI * 5)) * 0.4 * damp;
        }
        if (spinA) {
          const p = spinA.p;
          const k = smooth(0.08, 0.82, p);
          lift = Math.sin(Math.PI * clamp01((p - 0.04) / 0.86)) * 0.07;
          twist = k * TAU;
          miniTwist = -k * TAU;
          squint = p > 0.1 && p < 0.9 ? 0.7 : 0;
          miniSquint = squint;
          armUp = Math.sin(Math.PI * p) * 0.6;
          flurry = Math.sin(Math.PI * clamp01((p - 0.3) / 0.7));
          mouthO = p > 0.25 && p < 0.8;
        }
        if (peek) {
          const p = peek.p;
          const k = smooth(0.08, 0.25, p) * (1 - smooth(0.78, 0.95, p));
          open = k * 0.55;
          lift = k * 0.06;
          rise = k * 0.42;
          miniLook = Math.sin(clamp01((p - 0.25) / 0.5) * Math.PI * 2) * 0.7;
          miniSquint = p > 0.58 && p < 0.7 ? 0.8 : 0;
          armUp = k * 0.3;
          squint = k > 0.5 ? 0.3 : 0;
        }
        if (frost) {
          const p = frost.p;
          charge = smooth(0, 0.36, p) * (1 - smooth(0.38, 0.44, p));
          burst = smooth(0.48, 0.55, p) * (1 - smooth(0.74, 0.95, p));
          open = smooth(0.34, 0.42, p) * (1 - smooth(0.86, 0.97, p));
          lift = open * 0.14;
          rise = smooth(0.38, 0.48, p) * (1 - smooth(0.82, 0.95, p)) * 0.62;
          miniOpen = smooth(0.46, 0.52, p) * (1 - smooth(0.76, 0.86, p));
          miniMouth = burst > 0.2;
          miniSquint = burst > 0.2 ? 0.6 : 0;
          sy += -charge * 0.07 + burst * 0.04;
          tiltZ += Math.sin(p * 90) * 0.03 * charge * motion;
          tiltX += -charge * 0.07 + burst * 0.08;
          armUp = charge * 0.9 + open * 0.7;
          squint = charge > 0.3 ? 0.8 : 0;
          mouthO = open > 0.3;
          guardX = -charge * 0.9;
          browK = charge;
        }
        if (eat) {
          const p = eat.p;
          open = smooth(0.06, 0.18, p) * (1 - smooth(0.34, 0.44, p));
          lift = open * 0.08;
          rise = open * 0.3;
          miniOpen = smooth(0.12, 0.2, p) * (1 - smooth(0.3, 0.36, p));
          sy += -ph.chew * 0.04 * motion;
          tiltZ += Math.sin(p * 40) * 0.025 * ph.chew * motion;
          miniTilt += Math.sin(p * 50) * 0.08 * ph.chew;
          const fall = clamp01(ph.fall);
          food.visible = ph.visible && p < 0.32;
          food.position.set(0, lerp(3.4, 0.5 + rise + 0.3, fall * fall), lerp(0.25, 0.02, fall));
          food.scale.setScalar(1 - smooth(0.26, 0.32, p) * 0.9);
          food.rotation.z = (1 - fall) * 1.2;
          squint = p > 0.4 ? 0.65 : 0;
          miniSquint = p > 0.36 ? 0.8 : 0;
          mouthO = p > 0.45 && p < 0.85 && ph.chew > 0.5;
          armUp = open * 0.6;
          flurry = smooth(0.4, 0.46, p) * (1 - smooth(0.62, 0.82, p));
        } else food.visible = false;
        if (atk) {
          tiltX += -atk.wind * 0.32 + atk.lunge * 0.38;
          z = atk.lunge * 0.75 - atk.wind * 0.12;
          y += Math.sin(Math.min(1, atk.lunge * 1.2) * Math.PI) * 0.12;
          sy += -atk.wind * 0.06 + atk.lunge * 0.05;
          armUp = atk.wind * 0.6;
          squint = atk.lunge > 0.25 ? 0.75 : 0;
          miniTilt += atk.lunge * -0.4;
          swingX = -atk.wind * 2.4 + atk.lunge * 1.4;
          guardX = -atk.wind * 0.6;
          browK = 1;
          burst = Math.max(burst, atk.impact * 0.6);
          mouthO = atk.lunge > 0.2;
        }

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.set(0, y, z);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        sway.rotation.set(tiltX, 0, tiltZ);

        big.hinge.rotation.x = lerp(big.hinge.rotation.x, -open * 1.05, 0.35);
        big.hinge.position.y = lerp(big.hinge.position.y, big.SEAM + lift, 0.35);
        big.lid.rotation.y = twist;

        miniHolder.position.y = lerp(miniHolder.position.y, 0.08 + rise, 0.3);
        miniSway.rotation.set(miniTilt * 0.3, miniTwist + miniLook, miniTilt);
        mini.hinge.rotation.x = lerp(mini.hinge.rotation.x, -miniOpen * 1.1, 0.4);
        mini.hinge.position.y = lerp(mini.hinge.position.y, mini.SEAM + miniOpen * 0.08, 0.4);
        mini.mouth.visible = !miniMouth;
        mini.mouthOpen.visible = miniMouth;
        mini.coreGlow.intensity = miniOpen * 0.8;
        mini.innerMat.emissiveIntensity = 0.35 + miniOpen * 0.9;

        arms.forEach(({ piv }, i) => {
          const sd = i ? 1 : -1;
          const swing = sd > 0 ? swingX : guardX;
          piv.rotation.z = lerp(piv.rotation.z, sd * (0.12 + armUp * 1.4 + armWave * sd), 0.25);
          piv.rotation.x = lerp(piv.rotation.x, -armUp * 0.3 + swing, sd > 0 && atk ? 0.6 : 0.25);
        });
        brows.forEach(({ b, s: sd }) => {
          b.rotation.z = sd * (0.32 + browK * 0.2);
        });
        boots.forEach(({ b, s: sd }, i) => {
          const step = wob ? Math.max(0, Math.sin(wob.p * Math.PI * 5 + i * Math.PI)) * 0.07 : 0;
          b.position.y = lerp(b.position.y, (airborne ? -0.02 : 0) + step, 0.3);
          b.rotation.x = lerp(b.rotation.x, feetLift * 0.4, 0.3);
          b.rotation.z = sd * feetLift * 0.15;
        });

        big.mouth.visible = !mouthO;
        big.mouthOpen.visible = mouthO;
        big.mouthOpen.scale.y = eat ? (0.02 + ph.chew * 0.022) * 1.36 : 0.034 * 1.36;

        const shine = (0.9 + 0.1 * Math.sin(t * 2.3)) * vigor;
        crystalMat.emissiveIntensity = crownEmit * shine + charge * 0.9 + burst * 1.2;
        shards.forEach(({ sh, mid, ph: sp }) => {
          sh.scale.y = 1 + Math.sin(t * 2.2 + sp) * 0.04 * motion + charge * 0.25 * (0.4 + mid);
        });
        big.coreGlow.intensity = 0.25 * vigor + open * 1.2 + charge * 0.6 + burst * 1.4;
        big.innerMat.opacity = 0.16 + charge * 0.12;

        glints.forEach(({ m, ph: gp, sp }) => {
          const k = Math.max(0, Math.sin(t * sp * 2.2 + gp));
          m.scale.setScalar(Math.pow(k, 8) * 1.6 * vigor + 0.001);
          m.rotation.y = t * 2 + gp;
        });

        const mouthY = 0.08 + rise + 0.6 * MS + 0.12;
        flakes.forEach(f => {
          if (!frost || frost.p < 0.48 || frost.p > 0.98) {
            f.s.visible = false;
            return;
          }
          const q = clamp01((frost.p - 0.48 - f.d * 0.5) / 0.48);
          if (q <= 0 || q >= 1) {
            f.s.visible = false;
            return;
          }
          f.s.visible = true;
          const dist = q * 3.6 * f.sp;
          const a = f.a + q * 5;
          const spread = 0.1 + q * 0.8;
          f.s.position.set(Math.cos(a) * f.r * spread * 2, mouthY + 0.3 * Math.sin(q * Math.PI) + Math.sin(a) * f.r * spread, 0.1 + dist);
          f.s.scale.setScalar(0.17 + q * 0.15);
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
          m.s.position.set(Math.sin(m.k * 2.1) * 0.3, mouthY + q * 0.25, eat ? 0.15 : 0.3 + q * k * 1.9);
          m.s.scale.setScalar((0.5 + q * 0.6) * (0.6 + k));
          m.s.material.opacity = k * 0.6 * (1 - q * 0.4);
        });
        const flurryK = Math.max(flurry, joy >= 90 && !dying ? 0.35 * Math.max(0, Math.sin(t * 0.35)) : 0);
        happy.forEach(h => {
          if (flurryK < 0.02) {
            h.s.visible = false;
            return;
          }
          h.s.visible = true;
          const u = (((t * 0.32 + h.ph) % 1) + 1) % 1;
          const a = h.a + t * 0.6;
          h.s.position.set(Math.sin(a) * (0.5 + u * 0.45), OH + 0.55 - u * 1.4, Math.cos(a) * (0.5 + u * 0.45));
          h.s.scale.setScalar(0.11 + 0.05 * Math.sin(h.ph * 9));
          h.s.material.rotation = t + h.a;
          h.s.material.opacity = Math.sin(Math.PI * u) * flurryK;
        });
        drops.forEach(d => {
          if (!dying) {
            d.d.visible = false;
            return;
          }
          const u = (((t * 0.45 + d.ph) % 1) + 1) % 1;
          d.d.visible = true;
          const r = big.radiusAt(0.4) + 0.02;
          d.d.position.set(Math.sin(d.a) * r, 0.4 - u * 0.4, Math.cos(d.a) * r);
          d.d.scale.set(1 - u * 0.4, 1.4 * (1 - u * 0.4), 1 - u * 0.4);
        });

        const lid0 = squint ? 1 - squint : blink;
        allEyes.forEach(({ g }) => {
          g.scale.y = Math.max(0.08, lid0) * (airborne ? 1.0 : 0.84);
        });
        const lidM = miniSquint ? 1 - miniSquint : blink;
        mini.eyes.forEach(({ g }) => {
          g.scale.y = Math.max(0.08, lidM);
        });
        followPupils(allEyes, pointer, 0.6);
        followPupils(mini.eyes, { x: pointer.x * 0.5 + miniLook * 0.6, y: pointer.y * 0.5 }, 0.8);
      }
    };
  }
});
