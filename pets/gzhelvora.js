Pets.register({
  id: "gzhelvora",
  dex: 35,
  name: "Gzhelvora",
  color: "#1f43a8",
  types: ["ice", "psychic"],
  description: "A última camada não é mais boneca: é um botão de rosa de porcelana gelada, pintado de cobalto por fora e branco por dentro. Guarda a Matrióscea no peito, que ainda guarda o Matrinho. Quando floresce, as pétalas se abrem uma a uma e o menorzinho lá do fundo comanda a nevasca.",
  actions: {
    jump: { duration: 1.1 },
    eat: { duration: 3.4 },
    frost: { duration: 3.0 },
    bloom: { duration: 3.2 },
    spin: { duration: 1.9 },
    wobble: { duration: 2.0 },
    attack: { duration: 1.1 }
  },
  battle: { special: { action: "frost", hit: 0.62, speed: 1.2 } },
  idle: [
    { action: "bloom", min: 25, max: 50 },
    { action: "wobble", min: 30, max: 60 },
    { action: "spin", min: 45, max: 90 }
  ],
  clickAction: n => ["jump", "bloom", "frost", "spin", "wobble"][(n - 1) % 5],

  create({ THREE, kit }) {
    const innerPet = (function () {
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
          e.g.position.copy(face(yaw, 0.02, 0.972));
          orient(e.g, yaw, 0.02);
          lid.add(e.g);
          return e;
        });
        const mouth = (() => {
          const p = [];
          for (let i = 0; i <= 24; i++) {
            const u = i / 24;
            const w = Math.abs(Math.sin(u * Math.PI * 2));
            p.push(face(lerp(-o.mouthW, o.mouthW, u), -0.27 - w * 0.045, 1.004));
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
          f.position.copy(face(x, -0.305, 1.006));
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
        mouthW: 0.14,
        fangs: [-0.06, 0.06],
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
      const crown = new THREE.Group();
      crown.position.set(0, 1.02, -0.05);
      crown.rotation.x = -0.26;
      mini.lid.add(crown);
      const miniShards = [];
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
          miniShards.push(spike);
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


      const shards = [];
      [-1, 1].forEach(s => {
        const tuft = new THREE.Group();
        tuft.position.copy(big.face(1.0 * s, 0.5, 0.93));
        tuft.rotation.set(-0.05, 0, -s * 0.6);
        big.lid.add(tuft);
        [
          [0, 0.42, 0.06, 0, 1],
          [-0.08, 0.3, 0.05, 0.38, 0.7],
          [0.075, 0.27, 0.045, -0.36, 0.7],
          [-0.14, 0.18, 0.038, 0.75, 0.45],
          [0.13, 0.16, 0.035, -0.72, 0.45]
        ].forEach(([x, len, r, lean, mid], i) => {
          const c = crystal(len, r);
          const piv = new THREE.Group();
          piv.position.set(x * s, 0, i % 2 ? -0.025 : 0.01);
          piv.rotation.set(i ? 0.12 : -0.08, 0, lean * s);
          piv.add(c);
          const base = mesh(new THREE.CylinderGeometry(r, r * 0.9, 0.06, 6), crystalMat, false);
          base.position.y = -0.025;
          piv.add(base);
          tuft.add(piv);
          shards.push({ sh: c, mid, ph: i + s * 1.3 });
        });
      });
      [-0.1, 0, 0.1].forEach((x, i) => {
        const len = i === 1 ? 0.2 : 0.13;
        const c = crystal(len, 0.04);
        c.position.set(x, OH - 0.05 - Math.abs(x) * 0.3, -0.03);
        c.rotation.set(-0.2, 0, -x * 2.2);
        big.lid.add(c);
        shards.push({ sh: c, mid: i === 1 ? 0.8 : 0.5, ph: 3 + i });
      });

      const arms = [-1, 1].map(s => {
        const sh = new THREE.Group();
        const y = 1.06;
        sh.position.set(s * (big.radiusAt(y) - 0.03), y, 0.05);
        big.lid.add(sh);
        [0, 1, 2].forEach(i => {
          const c = crystal(0.1 + (i === 1 ? 0.06 : 0), 0.03);
          c.position.set(s * 0.02, 0.03, -0.04 + i * 0.045);
          c.rotation.set(-0.3 + i * 0.3, 0, -s * (0.55 + i * 0.1));
          sh.add(c);
        });
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
        const spike = crystal(0.08, 0.022);
        spike.position.set(s * 0.12, -0.12, 0.0);
        spike.rotation.z = -s * 1.25;
        piv.add(spike);
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
            piv.rotation.z = lerp(piv.rotation.z, sd * (0.12 + armUp * 1.4 + armWave * sd), 0.25);
            piv.rotation.x = lerp(piv.rotation.x, -armUp * 0.3, 0.25);
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
            g.scale.y = Math.max(0.08, lid0) * (airborne ? 1.08 : 1);
          });
          const lidM = miniSquint ? 1 - miniSquint : blink;
          mini.eyes.forEach(({ g }) => {
            g.scale.y = Math.max(0.08, lidM);
          });
          followPupils(allEyes, pointer, 0.6);
          followPupils(mini.eyes, { x: pointer.x * 0.5 + miniLook * 0.6, y: pointer.y * 0.5 }, 0.8);
        }
      };
    })();
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const TAU = Math.PI * 2;
    const COBALT = "#1f43a8";
    const COBALT_D = "#132c78";
    const COBALT_L = "#dbe6fa";
    const hasDoc = typeof document !== "undefined";
    const hex3 = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
    const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

    const crystalMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.86, emissive: 0x3d8fe0, emissiveIntensity: 0.22 });
    const cobaltMat = new THREE.MeshPhysicalMaterial({ color: 0x2146ab, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf5faff, roughness: 0.3, clearcoat: 0.8 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1b2f6e, roughness: 0.5 });
    const leafMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
    const paintPetal = outer => {
      if (!hasDoc) return null;
      const PW = 256;
      const PH = 512;
      const cv = document.createElement("canvas");
      cv.width = PW;
      cv.height = PH;
      const g = cv.getContext("2d");
      g.fillStyle = outer ? "#f7fbff" : "#ffffff";
      g.fillRect(0, 0, PW, PH);
      if (outer) {
        const gr = g.createLinearGradient(0, PH, 0, PH * 0.05);
        gr.addColorStop(0, COBALT_D);
        gr.addColorStop(0.45, COBALT);
        gr.addColorStop(0.8, "#4f74d0");
        gr.addColorStop(1, "rgba(219,230,250,0)");
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(PW * 0.5, PH);
        g.bezierCurveTo(PW * 1.05, PH * 0.75, PW * 0.98, PH * 0.3, PW * 0.5, PH * 0.06);
        g.bezierCurveTo(PW * 0.02, PH * 0.3, -PW * 0.05, PH * 0.75, PW * 0.5, PH);
        g.fill();
        [-1, 1].forEach(sd => {
          for (let k = 0; k < 4; k++) {
            const y = PH * (0.3 + k * 0.16);
            const x = PW * (0.5 + sd * (0.17 + k * 0.03));
            const sg = g.createLinearGradient(x, y - 50, x + sd * 30, y + 30);
            sg.addColorStop(0, "rgba(255,255,255,0.95)");
            sg.addColorStop(1, "rgba(255,255,255,0)");
            g.fillStyle = sg;
            g.beginPath();
            g.moveTo(x, y - 46);
            g.quadraticCurveTo(x + sd * 34, y - 6, x + sd * 10, y + 30);
            g.quadraticCurveTo(x + sd * 4, y, x, y - 46);
            g.fill();
          }
        });
        g.strokeStyle = "rgba(255,255,255,0.9)";
        g.lineWidth = 5;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(PW * 0.5, PH * 0.97);
        g.quadraticCurveTo(PW * 0.53, PH * 0.55, PW * 0.5, PH * 0.2);
        g.stroke();
        g.fillStyle = "#ffffff";
        for (let k = 0; k < 5; k++) {
          g.beginPath();
          g.arc(PW * 0.5, PH * (0.24 + k * 0.13), 6 - k * 0.5, 0, TAU);
          g.fill();
        }
        g.strokeStyle = COBALT_D;
        g.lineWidth = 6;
        g.strokeRect(0, 0, PW, PH);
      } else {
        const gr = g.createLinearGradient(0, PH, 0, 0);
        gr.addColorStop(0, "#9db6ea");
        gr.addColorStop(0.4, "#e3ecfb");
        gr.addColorStop(1, "#ffffff");
        g.fillStyle = gr;
        g.fillRect(0, 0, PW, PH);
        g.strokeStyle = "rgba(31,67,168,0.55)";
        g.lineWidth = 3;
        g.lineCap = "round";
        [-0.28, 0, 0.28].forEach(o => {
          g.beginPath();
          g.moveTo(PW * 0.5, PH * 0.98);
          g.quadraticCurveTo(PW * (0.5 + o * 0.6), PH * 0.6, PW * (0.5 + o), PH * 0.25);
          g.stroke();
        });
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 4;
      return tex;
    };
    const petalOutMat = new THREE.MeshPhysicalMaterial({ map: paintPetal(true), color: hasDoc ? 0xffffff : 0x2146ab, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.BackSide });
    const petalInMat = new THREE.MeshPhysicalMaterial({ map: paintPetal(false), color: 0xffffff, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.FrontSide });
    const petalMesh = (geo, shadow = true) => {
      const g = new THREE.Group();
      g.add(mesh(geo, petalOutMat, shadow));
      g.add(mesh(geo, petalInMat, false));
      return g;
    };
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x2a6fc0, emissiveIntensity: 0.18 });
    const cavMat = new THREE.MeshStandardMaterial({ color: 0x8fb4ee, roughness: 0.4, emissive: 0x2a6fc0, emissiveIntensity: 0.25, side: THREE.BackSide });

    const root = new THREE.Group();
    const sway = new THREE.Group();
    root.add(sway);
    const squash = new THREE.Group();
    sway.add(squash);

    const budCtrl = [
      [0.4, 0.04],
      [0.62, 0.3],
      [0.74, 0.62],
      [0.75, 0.95],
      [0.67, 1.25],
      [0.52, 1.52],
      [0.4, 1.72],
      [0.34, 1.86]
    ];
    const budCurve = new THREE.CatmullRomCurve3(budCtrl.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, "centripetal");
    const budPts = [new THREE.Vector2(0, 0.04)].concat(budCurve.getPoints(60).map(p => new THREE.Vector2(p.x, p.y)));
    const budR = y => {
      for (let i = 1; i < budPts.length; i++) {
        const a = budPts[i - 1];
        const b = budPts[i];
        if (y >= a.y && y <= b.y && b.y > a.y) return lerp(a.x, b.x, (y - a.y) / (b.y - a.y));
      }
      return 0.34;
    };
    const DOOR = 1.08;
    {
      const lower = budPts.filter(p => p.y <= 1.5);
      const og = new THREE.LatheGeometry(lower.map(p => new THREE.Vector2(Math.max(0, p.x - 0.008), p.y)), 56, DOOR - 0.02, TAU - 2 * DOOR + 0.04);
      squash.add(mesh(og, bodyMat));
      squash.add(mesh(og, cavMat, false));
      const upper = budPts.filter(p => p.y >= 1.36);
      squash.add(mesh(new THREE.LatheGeometry(upper.map(p => new THREE.Vector2(Math.max(0, p.x - 0.008), p.y)), 56), bodyMat));
    }
    {
      const floor = mesh(new THREE.CircleGeometry(0.42, 40), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.4, transparent: true, opacity: 0.7 }), false);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.06;
      squash.add(floor);
    }
    const coreLight = new THREE.PointLight(0x8fd2ff, 0.3, 3.2);
    coreLight.position.set(0, 0.9, 0.2);
    squash.add(coreLight);

    const innerHolder = new THREE.Group();
    innerHolder.position.set(0, 0.1, 0.03);
    innerHolder.scale.setScalar(0.62);
    squash.add(innerHolder);
    innerHolder.add(innerPet.root);

    const A = hex3(0x132c78);
    const B = hex3(0x2a52bd);
    const C = hex3(0xc9d9f6);
    const W = hex3(0xf6faff);
    const petalGeo = o => {
      const NU = 16;
      const NV = 20;
      const pos = [];
      const col = [];
      const uvs = [];
      const idx = [];
      for (let j = 0; j <= NV; j++) {
        const v = j / NV;
        const y = v * o.L;
        const hw = o.W * Math.pow(Math.sin(Math.PI * clamp01(v * 0.9 + 0.06)), 0.6) * (0.45 + 0.55 * Math.min(1, v * 1.4));
        const R = o.baseR + o.bow * Math.sin(Math.PI * v * 0.92) - o.close * v * v;
        for (let i = 0; i <= NU; i++) {
          const u = (i / NU) * 2 - 1;
          const rr = R + o.cup * (1 - u * u) * 0.14 + o.curl * Math.pow(v, 4) * (0.6 + 0.4 * Math.abs(u)) + (o.skew || 0) * u * Math.min(1, v * 3);
          const th = (u * hw) / Math.max(0.2, R);
          pos.push(Math.sin(th) * rr, y, Math.cos(th) * rr - o.baseR);
          let c = mix3(A, B, 0.35 + 0.65 * (0.5 + 0.5 * u) * Math.min(1, v * 1.6));
          c = mix3(c, C, smooth(0.35, 0.95, v) * (0.3 + 0.4 * (0.5 + 0.5 * u)));
          const rim = Math.max(smooth(0.8, 0.98, Math.abs(u)), smooth(0.9, 1, v));
          c = mix3(c, W, rim * 0.9);
          col.push(c[0], c[1], c[2]);
          uvs.push(i / NU, v);
        }
      }
      for (let j = 0; j < NV; j++)
        for (let i = 0; i < NU; i++) {
          const a = j * (NU + 1) + i;
          const b = a + NU + 1;
          idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    const plates = [];
    const plateGeo = o => {
      const NU = 14;
      const NV = 24;
      const pos = [];
      const uvs = [];
      const idx = [];
      for (let j = 0; j <= NV; j++) {
        const v = j / NV;
        const y = lerp(o.y0, o.y1, v);
        let hw = o.half * (0.82 + 0.18 * smooth(0, 0.12, v));
        if (v > 0.7) hw *= Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.7) / 0.3, 2)));
        for (let i = 0; i <= NU; i++) {
          const u = (i / NU) * 2 - 1;
          const rr = budR(y) + o.off + o.skew * u + o.cup * (1 - u * u) + o.curl * smooth(0.75, 1, v);
          const th = u * Math.max(0.002, hw);
          pos.push(Math.sin(th) * rr, y - o.y0, Math.cos(th) * rr - budR(o.y0));
          uvs.push(i / NU, v);
        }
      }
      for (let j = 0; j < NV; j++)
        for (let i = 0; i < NU; i++) {
          const a = j * (NU + 1) + i;
          const b = a + NU + 1;
          idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    const addPlate = (phi, o, layer) => {
      const rot = new THREE.Group();
      rot.rotation.y = phi;
      squash.add(rot);
      const hinge = new THREE.Group();
      hinge.position.set(0, o.y0, budR(o.y0));
      rot.add(hinge);
      hinge.add(petalMesh(plateGeo(o)));
      plates.push({ hinge, layer, ph: phi * 1.7 });
    };
    const deg = d => (d * Math.PI) / 180;
    [92, 152, 208, 268].forEach(d => addPlate(deg(d), { y0: 0.05, y1: 1.62, half: deg(37), off: 0.022, skew: 0.012, cup: 0.012, curl: 0.03 }, 0));
    [0, 60, 120, 180, 240, 300].forEach(d => addPlate(deg(d + 30), { y0: 1.4, y1: 1.92, half: deg(35), off: 0.03, skew: 0.012, cup: 0.01, curl: 0.04 }, 2));

    const paintDoor = () => {
      if (!hasDoc) return [null, null];
      const PW = 256;
      const PH = 512;
      const cv = document.createElement("canvas");
      cv.width = PW;
      cv.height = PH;
      const g = cv.getContext("2d");
      const av = document.createElement("canvas");
      av.width = PW;
      av.height = PH;
      const ga = av.getContext("2d");
      ga.fillStyle = "#ffffff";
      ga.fillRect(0, 0, PW, PH);
      g.fillStyle = "#f7fbff";
      g.fillRect(0, 0, PW, PH);
      const sx = PW / 0.82;
      const sy = PH / 1.38;
      const wy = PH * (1 - 0.56);
      const flower = (ctx, rs) => {
        ctx.beginPath();
        for (let k = 0; k <= 96; k++) {
          const a = (k / 96) * TAU;
          const r = rs * (0.8 + 0.2 * Math.cos(a * 6));
          const x = Math.sin(a) * r * sx;
          const y = wy - Math.cos(a) * r * sy;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };
      const gr = g.createLinearGradient(0, PH, 0, 0);
      gr.addColorStop(0, COBALT_D);
      gr.addColorStop(0.5, COBALT);
      gr.addColorStop(1, "#4f74d0");
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(PW * 0.18, PH);
      g.bezierCurveTo(PW * 1.1, PH * 0.92, PW * 1.0, PH * 0.4, PW * 0.62, PH * 0.12);
      g.bezierCurveTo(PW * 0.9, PH * 0.45, PW * 0.7, PH * 0.82, PW * 0.18, PH);
      g.fill();
      [0.3, 0.5, 0.7].forEach((k, i) => {
        const x = PW * (0.55 + i * 0.1);
        const y = PH * (0.62 + i * 0.1);
        const sg = g.createLinearGradient(x, y - 60, x + 30, y + 40);
        sg.addColorStop(0, COBALT_D);
        sg.addColorStop(1, "rgba(79,116,208,0)");
        g.fillStyle = sg;
        g.beginPath();
        g.moveTo(x, y - 60);
        g.quadraticCurveTo(x + 50, y - 10, x + 14, y + 44);
        g.quadraticCurveTo(x + 2, y, x, y - 60);
        g.fill();
      });
      g.strokeStyle = COBALT;
      g.lineWidth = 6;
      g.lineCap = "round";
      [[0.5, 0.22, 34], [0.75, 0.3, 26], [0.6, 0.86, 22]].forEach(([u, v, r]) => {
        g.beginPath();
        g.arc(PW * u, PH * v, r, 0.3, 4.6);
        g.stroke();
        g.beginPath();
        g.arc(PW * u + r * 0.9, PH * v - r * 0.2, 6, 0, TAU);
        g.fillStyle = COBALT;
        g.fill();
      });
      g.fillStyle = COBALT_D;
      g.fillRect(PW - 16, 0, 16, PH);
      g.fillRect(0, PH - 14, PW, 14);
      g.fillRect(0, 0, PW, 12);
      g.fillStyle = "#ffffff";
      g.fillRect(PW - 22, 0, 4, PH);
      g.strokeStyle = COBALT_D;
      g.lineWidth = 16;
      flower(g, 0.27);
      g.stroke();
      g.strokeStyle = "#ffffff";
      g.lineWidth = 4;
      flower(g, 0.3);
      g.stroke();
      ga.fillStyle = "#000000";
      flower(ga, 0.25);
      ga.fill();
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 4;
      return [tex, new THREE.CanvasTexture(av)];
    };
    const [doorTex, doorAlpha] = paintDoor();
    const doorOutMat = new THREE.MeshPhysicalMaterial({ map: doorTex, alphaMap: doorAlpha, alphaTest: 0.5, color: hasDoc ? 0xffffff : 0x2146ab, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.BackSide });
    const doorInMat = new THREE.MeshPhysicalMaterial({ map: petalInMat.map, alphaMap: doorAlpha, alphaTest: 0.5, color: 0x7f9fe0, roughness: 0.25, clearcoat: 1, side: THREE.FrontSide });
    const doors = [-1, 1].map(sd => {
      const RH = 0.765;
      const ph = sd * DOOR;
      const piv = new THREE.Group();
      piv.position.set(Math.sin(ph) * RH, 0, Math.cos(ph) * RH);
      squash.add(piv);
      const off = new THREE.Group();
      off.position.set(-piv.position.x, 0, -piv.position.z);
      piv.add(off);
      const NU = 16;
      const NV = 28;
      const pos = [];
      const uvs = [];
      const idx = [];
      const yTop = u => 1.42 + 0.16 * Math.sin((u * Math.PI) / 2);
      const at = (u, v, extra = 0) => {
        const y = lerp(0.08, yTop(u), v);
        const rr = budR(y) + 0.036 + extra;
        const a = sd * u * DOOR;
        return new THREE.Vector3(Math.sin(a) * rr, y, Math.cos(a) * rr);
      };
      for (let j = 0; j <= NV; j++)
        for (let i = 0; i <= NU; i++) {
          const u = i / NU;
          const v = j / NV;
          const p = at(u, v);
          pos.push(p.x, p.y, p.z);
          uvs.push(u, v);
        }
      for (let j = 0; j < NV; j++)
        for (let i = 0; i < NU; i++) {
          const a = j * (NU + 1) + i;
          const b = a + NU + 1;
          if (sd > 0) idx.push(a, b, a + 1, a + 1, b, b + 1);
          else idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      off.add(mesh(g, doorOutMat));
      off.add(mesh(g, doorInMat, false));
      const studGeo = new THREE.SphereGeometry(0.026, 12, 8, 0, TAU, 0, Math.PI / 2);
      const placeOut = (o, u, v, extra) => {
        const p = at(u, v, extra);
        o.position.copy(p);
        const n = new THREE.Vector3(p.x, 0, p.z).normalize();
        o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        off.add(o);
      };
      [0.08, 0.2, 0.32, 0.8, 0.92].forEach(v => placeOut(mesh(studGeo, cobaltMat, false), 0.05, v, 0));
      [0.25, 0.5, 0.75].forEach(u => placeOut(mesh(studGeo, cobaltMat, false), u, 0.97, 0));
      [0.25, 0.78].forEach(v => {
        const hg = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), cobaltMat, false);
        const p = at(1, v, 0.01);
        hg.position.copy(p);
        off.add(hg);
      });
      [[0.55, 0.12], [0.85, 0.3], [0.6, 0.36], [0.85, 0.62], [0.55, 0.86], [0.28, 0.14], [0.28, 0.9], [0.62, 0.62]].forEach(([u, v], i) => {
        const len = 0.14 + (i % 3) * 0.035;
        const cg = new THREE.ConeGeometry(0.036, len, 6);
        cg.translate(0, len / 2, 0);
        const sp = mesh(cg, crystalMat, false);
        const p = at(u, v, -0.006);
        sp.position.copy(p);
        sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-p.x, 0, -p.z).normalize());
        off.add(sp);
      });
      if (sd > 0) {
        const latch = new THREE.Group();
        placeOut(latch, 0.0, 0.3, 0.01);
        const plate = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 6), cobaltMat, false);
        latch.add(plate);
        for (let k = 0; k < 3; k++) {
          const arm = mesh(new THREE.BoxGeometry(0.015, 0.025, 0.12), whiteMat, false);
          arm.position.y = 0.015;
          arm.rotation.y = (k / 3) * Math.PI;
          latch.add(arm);
        }
      }
      return { piv, sd };
    });


    const leafGeo = (() => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.bezierCurveTo(0.16, 0.08, 0.15, 0.32, 0, 0.5);
      sh.bezierCurveTo(-0.15, 0.32, -0.16, 0.08, 0, 0);
      const g = new THREE.ShapeGeometry(sh, 10);
      const p = g.attributes.position;
      const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        p.setZ(i, y * y * 0.5 - Math.abs(x) * 0.15);
        let c = mix3(A, B, 0.4 + x * 2);
        c = mix3(c, C, smooth(0.25, 0.5, y) * 0.5);
        col.set(c, i * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    })();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.2;
      const l = mesh(leafGeo, leafMat, false);
      l.position.set(Math.sin(a) * 0.5, 0.025, Math.cos(a) * 0.5);
      l.rotation.order = "YXZ";
      l.rotation.set(-Math.PI / 2 + 0.12, a, 0);
      l.scale.setScalar(1.25);
      squash.add(l);
    }

    const HEAD_Y0 = 1.8;
    const headPts = (() => {
      const ctrl = [
        [0.34, 0.0],
        [0.4, 0.1],
        [0.445, 0.25],
        [0.445, 0.4],
        [0.4, 0.56],
        [0.3, 0.7],
        [0.16, 0.79],
        [0.0, 0.82]
      ];
      const c = new THREE.CatmullRomCurve3(ctrl.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, "centripetal");
      const pts = c.getPoints(60).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
      pts[pts.length - 1].set(0, 0.82);
      return pts;
    })();
    const HH = 0.82;
    const headR = y => {
      for (let i = 1; i < headPts.length; i++) {
        const a = headPts[i - 1];
        const b = headPts[i];
        if (y >= a.y && y <= b.y && b.y > a.y) return lerp(a.x, b.x, (y - a.y) / (b.y - a.y));
      }
      return y <= 0 ? 0.34 : 0;
    };
    let headTex = null;
    if (hasDoc) {
      const CW = 1024;
      const CH = 512;
      const cv = document.createElement("canvas");
      cv.width = CW;
      cv.height = CH;
      const g = cv.getContext("2d");
      const Y = v => (1 - v) * CH;
      const at = (u, y, fn) => {
        [u, u - 1, u + 1].forEach(uu => {
          if (uu < -0.2 || uu > 1.2) return;
          g.save();
          g.setTransform(CW / (TAU * Math.max(0.1, headR(y))), 0, 0, -CH / HH, uu * CW, Y(y / HH));
          fn();
          g.restore();
        });
      };
      const base = g.createLinearGradient(0, CH, 0, 0);
      base.addColorStop(0, "#eaf3ff");
      base.addColorStop(1, "#ffffff");
      g.fillStyle = base;
      g.fillRect(0, 0, CW, CH);
      const HOOD = 0.25;
      g.fillStyle = COBALT;
      g.fillRect(0, 0, CW, Y(HOOD / HH));
      for (let i = 0; i < 20; i++) {
        at((i + 0.5) / 20, HOOD, () => {
          g.fillStyle = COBALT;
          g.beginPath();
          g.ellipse(0, 0, 0.075, 0.036, 0, Math.PI, TAU);
          g.fill();
          g.fillStyle = "#ffffff";
          g.beginPath();
          g.arc(0, -0.009, 0.009, 0, TAU);
          g.fill();
        });
      }
      at(0.5, 0.36, () => {
        const w = 0.33;
        const win = () => {
          g.moveTo(-w, -0.24);
          g.lineTo(-w, 0.0);
          g.bezierCurveTo(-w, 0.17, -0.16, 0.22, -0.07, 0.19);
          g.quadraticCurveTo(-0.02, 0.17, 0, 0.12);
          g.quadraticCurveTo(0.02, 0.17, 0.07, 0.19);
          g.bezierCurveTo(0.16, 0.22, w, 0.17, w, 0.0);
          g.lineTo(w, -0.24);
        };
        g.fillStyle = "#f6faff";
        g.beginPath();
        win();
        g.closePath();
        g.fill();
        g.strokeStyle = COBALT_D;
        g.lineWidth = 0.01;
        g.beginPath();
        win();
        g.stroke();
        g.fillStyle = COBALT;
        [-1, 1].forEach(s => {
          [
            [0.2, -0.07, 0.016],
            [0.235, -0.04, 0.012],
            [0.23, -0.1, 0.011]
          ].forEach(([x, y, r]) => {
            g.beginPath();
            g.arc(s * x, y, r, 0, TAU);
            g.fill();
          });
        });
      });
      let seed = 23;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let i = 0; i < 40; i++) {
        const u = rnd();
        const y = HOOD + 0.04 + rnd() * 0.5;
        if (Math.abs(u - 0.5) < 0.17 && y < 0.62) continue;
        at(u, y, () => {
          g.fillStyle = "#ffffff";
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * TAU;
            g.beginPath();
            g.arc(Math.cos(a) * 0.014, Math.sin(a) * 0.014, 0.009, 0, TAU);
            g.fill();
          }
        });
      }
      g.fillStyle = COBALT;
      g.fillRect(0, Y(0.06 / HH), CW, (0.06 / HH) * CH);
      headTex = new THREE.CanvasTexture(cv);
      headTex.anisotropy = 4;
    }
    const headMat = new THREE.MeshPhysicalMaterial({ map: headTex, color: 0xffffff, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 });
    const headHinge = new THREE.Group();
    headHinge.position.set(0, HEAD_Y0, -0.34);
    squash.add(headHinge);
    const headOff = new THREE.Group();
    headOff.position.set(0, 0, 0.34);
    headHinge.add(headOff);
    const head = new THREE.Group();
    headOff.add(head);
    {
      const g = new THREE.LatheGeometry(headPts, 64, Math.PI, TAU);
      const pos = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setY(i, pos.getY(i) / HH);
      uv.needsUpdate = true;
      g.computeVertexNormals();
      head.add(mesh(g, headMat));
      const inner = [];
      for (let i = 0; i <= 16; i++) {
        const y = lerp(0.0, 0.5, i / 16);
        inner.push(new THREE.Vector2(Math.max(0.02, headR(y) - 0.04), y));
      }
      inner.push(new THREE.Vector2(0.001, 0.5));
      head.add(mesh(new THREE.LatheGeometry(inner, 40), new THREE.MeshStandardMaterial({ color: 0x2b5aa8, roughness: 0.35, emissive: 0x123a7a, emissiveIntensity: 0.4, side: THREE.DoubleSide }), false));
    }
    const HC = 0.36;
    const HR = 0.44;
    const face = (yaw, pitch, k = 1) => {
      const y = HC + Math.sin(pitch) * HR;
      const r = headR(Math.min(HH - 0.01, Math.max(0.01, y))) * k;
      return new THREE.Vector3(Math.sin(yaw) * r, y, Math.cos(yaw) * r);
    };
    const orient = (o, yaw, pitch) => {
      o.rotation.order = "YXZ";
      o.rotation.set(-pitch * 0.9, yaw, 0);
    };
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.44, pupilColor: 0x1c3d9e });
      const yaw = 0.3 * s;
      e.g.position.copy(face(yaw, 0.02, 0.97));
      orient(e.g, yaw, 0.02);
      head.add(e.g);
      return e;
    });
    const mouth = (() => {
      const p = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const w = Math.abs(Math.sin(u * Math.PI * 2));
        p.push(face(lerp(-0.15, 0.15, u), -0.27 - w * 0.045, 1.004));
      }
      return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 40, 0.012, 6, false), mouthMat, false);
    })();
    head.add(mouth);
    const mouthOpen = mesh(new THREE.SphereGeometry(1, 20, 14), mouthMat, false);
    mouthOpen.scale.set(0.07, 0.046, 0.02);
    mouthOpen.position.copy(face(0, -0.3, 0.998));
    orient(mouthOpen, 0, -0.3);
    mouthOpen.visible = false;
    head.add(mouthOpen);
    [-0.07, 0.07].forEach(x => {
      const f = mesh(new THREE.ConeGeometry(0.016, 0.035, 6), whiteMat, false);
      f.position.copy(face(x, -0.31, 1.006));
      f.rotation.set(Math.PI, 0, 0);
      head.add(f);
    });

    const shards = [];
    const crown = new THREE.Group();
    crown.position.set(0, HC + 0.03, -0.12);
    crown.rotation.x = -0.16;
    crown.scale.setScalar(1.38);
    head.add(crown);
    {
      const RO = 0.43;
      const RI = 0.31;
      const AA = 1.32;
      const RB = 0.46;
      const bendV = (x, y, z) => {
        const a = x / RB;
        const d = RB - z;
        return new THREE.Vector3(Math.sin(a) * d, y, RB - Math.cos(a) * d);
      };
      const place = (o, x, y, z) => {
        const w = new THREE.Group();
        w.position.copy(bendV(x, y, z));
        w.rotation.y = -x / RB;
        w.add(o);
        crown.add(w);
        return w;
      };
      const sh = new THREE.Shape();
      const N = 64;
      for (let i = 0; i <= N; i++) {
        const a = lerp(-AA, AA, i / N);
        const r = RO + 0.022 * Math.cos(a * 11) * smooth(0, 0.25, AA - Math.abs(a)) + 0.07 * (1 - Math.abs(a) / AA);
        if (i === 0) sh.moveTo(Math.sin(a) * r, Math.cos(a) * r);
        else sh.lineTo(Math.sin(a) * r, Math.cos(a) * r);
      }
      for (let i = N; i >= 0; i--) {
        const a = lerp(-AA, AA, i / N);
        sh.lineTo(Math.sin(a) * RI, Math.cos(a) * RI);
      }
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.01, bevelSegments: 2, curveSegments: 4 });
      g.translate(0, 0, -0.025);
      {
        const pa = g.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          const v = bendV(pa.getX(i), pa.getY(i), pa.getZ(i));
          pa.setXYZ(i, v.x, v.y, v.z);
        }
        g.computeVertexNormals();
      }
      crown.add(mesh(g, crystalMat, false));
      [0.042, -0.042].forEach(zz => {
        const pts = [];
        for (let i = 0; i <= 40; i++) {
          const a = lerp(-AA, AA, i / 40);
          pts.push(bendV(Math.sin(a) * 0.335, Math.cos(a) * 0.335, zz));
        }
        crown.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.014, 8, false), cobaltMat, false));
      });
      const beadGeo = new THREE.SphereGeometry(0.014, 10, 8);
      for (let i = 0; i <= 18; i++) {
        const a = lerp(-AA + 0.08, AA - 0.08, i / 18);
        const r = RO - 0.035 + 0.07 * (1 - Math.abs(a) / AA);
        [0.04, -0.04].forEach(zz => {
          const b = mesh(beadGeo, i % 2 ? whiteMat : cobaltMat, false);
          b.position.copy(bendV(Math.sin(a) * r, Math.cos(a) * r, zz));
          crown.add(b);
        });
      }
      [-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05].forEach((a, i) => {
        const mid = 1 - Math.abs(a) / 1.05;
        const len = 0.1 + mid * 0.22;
        const cg = new THREE.CylinderGeometry(0, 0.03 + mid * 0.012, len, 6);
        cg.translate(0, len / 2, 0);
        const spike = mesh(cg, crystalMat, false);
        const piv = new THREE.Group();
        const r = RO + 0.07 * (1 - Math.abs(a) / AA) - 0.005;
        piv.rotation.z = -a;
        piv.add(spike);
        place(piv, Math.sin(a) * r, Math.cos(a) * r, 0);
        shards.push({ sh: spike, mid, ph: i * 0.9 });
      });
      const gem = new THREE.Group();
      place(gem, 0, 0.42, 0.06);
      for (let k = 0; k < 6; k++) {
        const arm = mesh(new THREE.BoxGeometry(0.013, 0.085, 0.013), whiteMat, false);
        arm.position.set(Math.sin((k / 6) * TAU) * 0.042, Math.cos((k / 6) * TAU) * 0.042, 0);
        arm.rotation.z = -(k / 6) * TAU;
        gem.add(arm);
      }
      gem.add(mesh(new THREE.OctahedronGeometry(0.028, 0), cobaltMat, false));
    }

    const arms = [-1, 1].map(s => {
      const sh = new THREE.Group();
      const y = 1.45;
      sh.position.set(s * (budR(y) + 0.2), y, 0.05);
      squash.add(sh);
      const shoulder = mesh(new THREE.SphereGeometry(0.16, 22, 16), cobaltMat);
      sh.add(shoulder);
      const piv = new THREE.Group();
      sh.add(piv);
      const upper = mesh(new THREE.SphereGeometry(1, 22, 16), whiteMat);
      upper.scale.set(0.13, 0.21, 0.14);
      upper.position.set(s * 0.04, -0.17, 0.0);
      upper.rotation.z = s * 0.18;
      piv.add(upper);
      const fore = new THREE.Group();
      fore.position.set(s * 0.08, -0.36, 0.02);
      piv.add(fore);
      [0, 1, 2, 3].forEach(k => {
        const a = (k / 4) * TAU + 0.4;
        const pg = petalGeo({ baseR: 0.1, L: 0.3, W: 0.12, bow: 0.04, close: -0.02, cup: 0.3, curl: 0.06 });
        const p = petalMesh(pg, false);
        const pp = new THREE.Group();
        pp.position.set(Math.sin(a) * 0.1, -0.18, Math.cos(a) * 0.1);
        pp.rotation.y = a;
        pp.add(p);
        fore.add(pp);
      });
      const cuff = mesh(new THREE.TorusGeometry(0.105, 0.025, 8, 28), cobaltMat, false);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.17;
      fore.add(cuff);
      const fist = mesh(new THREE.SphereGeometry(0.14, 20, 16), whiteMat);
      fist.position.y = -0.24;
      fore.add(fist);
      const knuck = mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 24, Math.PI), cobaltMat, false);
      knuck.position.set(0, -0.25, 0.06);
      knuck.rotation.set(0, 0, Math.PI);
      fore.add(knuck);
      return { piv, fore, s };
    });

    const boots = [-1, 1].map(s => {
      const b = new THREE.Group();
      b.position.set(s * 0.28, 0, 0.6);
      squash.add(b);
      const boot = mesh(new THREE.SphereGeometry(1, 22, 16), cobaltMat);
      boot.scale.set(0.16, 0.11, 0.22);
      boot.position.y = 0.09;
      b.add(boot);
      const top = mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 22), whiteMat, false);
      top.rotation.x = Math.PI / 2 - 0.4;
      top.position.set(0, 0.17, -0.09);
      b.add(top);
      const flake = mesh(new THREE.OctahedronGeometry(0.028, 0), whiteMat, false);
      flake.position.set(0, 0.13, 0.205);
      b.add(flake);
      return { b, s };
    });

    let flakeTex = null;
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
    }
    const swirl = [];
    {
      const sGeo = petalGeo({ baseR: 0.06, L: 0.16, W: 0.07, bow: 0.02, close: 0, cup: 0.3, curl: 0.03 });
      for (let i = 0; i < 18; i++) {
        const m = petalMesh(sGeo, false);
        m.visible = false;
        root.add(m);
        swirl.push({ m, a: (i / 18) * TAU * 2.3, r: 0.25 + (i % 4) * 0.12, d: (i % 6) * 0.05, sp: 0.8 + (i % 3) * 0.2 });
      }
    }
    const happy = [];
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flakeTex, color: 0xeaf6ff, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      root.add(s);
      happy.push({ s, ph: i / 8, a: i * 1.9 });
    }
    const drops = [];
    {
      const dMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 6; i++) {
        const d = mesh(new THREE.SphereGeometry(0.035, 12, 10), dMat, false);
        d.visible = false;
        root.add(d);
        drops.push({ d, a: i * 1.05, ph: i * 0.19 });
      }
    }
    const food = berry();
    food.visible = false;
    squash.add(food);
    const muzzle = new THREE.Group();
    muzzle.position.copy(face(0, -0.3, 1.2));
    head.add(muzzle);
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
        const bloomA = is("bloom");
        const spinA = is("spin");
        const wob = is("wobble");
        const atk = is("attack") ? strike(action.p) : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const dying = !!s.dying;
        const vigor = dying ? 0.35 : 0.65 + 0.35 * clamp01(hunger / 100);

        let y = 0;
        let z = 0;
        let sy = 1 + Math.sin(t * 1.4) * 0.008 * motion;
        let tiltZ = Math.sin(t * 1.0) * 0.025 * motion;
        let tiltX = Math.sin(t * 0.8 + 0.6) * 0.012 * motion;
        let bloom = 0;
        let headOpen = 0;
        let headLift = 0;
        let twist = 0;
        let armUp = 0;
        let punch = 0;
        let armWave = Math.sin(t * 1.6) * 0.05 * motion;
        let mouthO = false;
        let squint = 0;
        let charge = 0;
        let burst = 0;
        let airborne = false;
        let rise = 0;
        let inner = null;
        let flurry = 0;

        if (dying) {
          tiltZ = 0.08 + Math.sin(t * 0.7) * 0.015 * motion;
          tiltX = 0.06;
          sy -= 0.025;
          squint = 0.45;
          bloom = -0.05;
        }
        if (jump) {
          const p = jump.p;
          if (p < 0.22) sy = 1 - 0.12 * Math.sin((p / 0.22) * Math.PI * 0.5);
          else if (p < 0.8) {
            const q = (p - 0.22) / 0.58;
            y = Math.sin(q * Math.PI) * 0.45;
            sy = 1 + 0.05 * Math.cos(q * Math.PI);
            bloom = Math.sin(q * Math.PI) * 0.25;
            armUp = Math.sin(q * Math.PI) * 0.9;
            mouthO = q > 0.15 && q < 0.75;
            airborne = true;
          } else sy = 1 - 0.1 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
          inner = { name: "jump", p, n: jump.n };
        }
        if (wob) {
          const p = wob.p;
          const damp = Math.pow(1 - p, 1.6);
          tiltZ += Math.sin(p * Math.PI * 4) * 0.2 * damp;
          tiltX += Math.sin(p * Math.PI * 4 + 1.2) * 0.04 * damp;
          bloom = Math.abs(Math.sin(p * Math.PI * 4)) * 0.18 * damp;
          armUp = 0.35 * damp + 0.15;
          armWave += Math.sin(p * Math.PI * 8) * 0.2 * damp;
          squint = p > 0.15 && p < 0.85 ? 0.6 : squint;
          inner = { name: "wobble", p, n: wob.n };
        }
        if (spinA) {
          const p = spinA.p;
          const k = smooth(0.08, 0.82, p);
          headLift = Math.sin(Math.PI * clamp01((p - 0.04) / 0.86)) * 0.08;
          twist = k * TAU;
          squint = p > 0.1 && p < 0.9 ? 0.7 : 0;
          armUp = Math.sin(Math.PI * p) * 0.5;
          bloom = Math.sin(Math.PI * p) * 0.3;
          flurry = Math.sin(Math.PI * clamp01((p - 0.3) / 0.7));
          mouthO = p > 0.25 && p < 0.8;
          inner = { name: "spin", p, n: spinA.n };
        }
        if (bloomA) {
          const p = bloomA.p;
          const k = smooth(0.06, 0.24, p) * (1 - smooth(0.8, 0.97, p));
          bloom = k * 0.75;
          rise = k * 0.18;
          squint = p > 0.25 && p < 0.75 ? 0.55 : 0;
          armUp = k * 0.6;
          flurry = k * 0.6;
          inner = { name: "peek", p: clamp01((p - 0.12) / 0.8), n: bloomA.n };
        }
        if (frost) {
          const p = frost.p;
          charge = smooth(0, 0.26, p) * (1 - smooth(0.28, 0.34, p));
          bloom = smooth(0.2, 0.34, p) * (1 - smooth(0.86, 0.98, p)) * 1.15;
          burst = smooth(0.5, 0.58, p) * (1 - smooth(0.8, 0.96, p));
          rise = bloom * 0.3;
          sy += -charge * 0.06 + burst * 0.03;
          tiltZ += Math.sin(p * 90) * 0.025 * charge * motion;
          tiltX += -charge * 0.06 + burst * 0.06;
          armUp = charge * 0.7 + bloom * 0.9;
          squint = charge > 0.3 ? 0.8 : 0;
          mouthO = bloom > 0.5;
          inner = { name: "frost", p: clamp01((p - 0.26) / 0.72), n: frost.n };
        }
        if (eat) {
          const p = eat.p;
          headOpen = smooth(0.04, 0.14, p) * (1 - smooth(0.32, 0.42, p));
          headLift = headOpen * 0.06;
          rise = headOpen * 0.25;
          sy += -ph.chew * 0.03 * motion;
          tiltZ += Math.sin(p * 40) * 0.02 * ph.chew * motion;
          const fall = clamp01(ph.fall);
          food.visible = ph.visible && p < 0.3;
          food.position.set(0, lerp(4.0, 1.4, fall * fall), lerp(0.25, 0.02, fall));
          food.scale.setScalar(1 - smooth(0.25, 0.3, p) * 0.9);
          food.rotation.z = (1 - fall) * 1.2;
          squint = p > 0.4 ? 0.6 : 0;
          armUp = headOpen * 0.5;
          mouthO = headOpen > 0.3;
          inner = { name: "eat", p: clamp01((p - 0.12) / 0.86), n: eat.n };
        } else food.visible = false;
        if (atk) {
          tiltX += -atk.wind * 0.22 + atk.lunge * 0.28;
          z = atk.lunge * 0.6 - atk.wind * 0.1;
          y += Math.sin(Math.min(1, atk.lunge * 1.2) * Math.PI) * 0.08;
          sy += -atk.wind * 0.05 + atk.lunge * 0.04;
          punch = atk.lunge;
          armUp = atk.wind * 0.4;
          squint = atk.lunge > 0.25 ? 0.75 : 0;
          burst = Math.max(burst, atk.impact * 0.6);
          bloom = atk.impact * 0.3;
          mouthO = atk.lunge > 0.2;
        }

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.set(0, y, z);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        sway.rotation.set(tiltX, 0, tiltZ);

        const glad = joy >= 90 && !dying && !action ? 1 : 0;
        if (glad) bloom = Math.max(bloom, 0.1 + 0.06 * Math.sin(t * 0.7) * motion);
        plates.forEach(({ hinge, layer, ph: pp }) => {
          const fan = frost ? Math.max(0, bloom) : 0;
          const flare = layer === 2 ? fan * 0.6 + glad * (Math.sin(t * 2.4 + pp) * 0.5 + 0.5) * 0.22 * motion : fan * 1.05;
          hinge.rotation.x = lerp(hinge.rotation.x, Math.max(0, flare) + charge * Math.sin(t * 40) * 0.01, 0.25);
        });
        const doorT = Math.max(0, bloom) * 1.45 + charge * Math.abs(Math.sin(t * 30)) * 0.05;
        doors.forEach(({ piv, sd }) => {
          piv.rotation.y = lerp(piv.rotation.y, sd * doorT, frost ? 0.18 : 0.25);
        });
        headHinge.rotation.x = lerp(headHinge.rotation.x, -headOpen * 1.1, 0.35);
        headHinge.position.y = lerp(headHinge.position.y, HEAD_Y0 + headLift + bloom * 0.05, 0.35);
        head.rotation.y = twist;

        innerHolder.position.y = lerp(innerHolder.position.y, 0.1 + rise, 0.3);
        innerPet.update({ t, pointer: { x: pointer.x * 0.6, y: pointer.y * 0.6 }, lookYaw: 0, lookPitch: 0, blink, action: inner, hunger, life: s.life, joy, dying, motion, reduceMotion: s.reduceMotion });

        arms.forEach(({ piv, fore, s: sd }) => {
          const p2 = sd > 0 ? punch : punch * 0.3;
          piv.rotation.z = lerp(piv.rotation.z, sd * (0.15 + armUp * 1.3 + armWave * sd) - sd * p2 * 0.2, 0.25);
          piv.rotation.x = lerp(piv.rotation.x, -armUp * 0.25 - p2 * 1.4, atk ? 0.6 : 0.25);
          fore.rotation.x = lerp(fore.rotation.x, -p2 * 0.4, 0.4);
        });
        boots.forEach(({ b, s: sd }, i) => {
          const step = wob ? Math.max(0, Math.sin(wob.p * Math.PI * 4 + i * Math.PI)) * 0.06 : 0;
          b.position.y = lerp(b.position.y, (airborne ? -0.02 : 0) + step, 0.3);
        });

        mouth.visible = !mouthO;
        mouthOpen.visible = mouthO;
        mouthOpen.scale.y = eat ? 0.03 + ph.chew * 0.03 : 0.046;

        const shine = (0.9 + 0.1 * Math.sin(t * 2.1)) * vigor;
        crystalMat.emissiveIntensity = crownEmit * shine + charge * 1.0 + burst * 1.2;
        shards.forEach(({ sh, mid, ph: sp }) => {
          sh.scale.y = 1 + Math.sin(t * 2 + sp) * 0.035 * motion + charge * 0.3 * (0.4 + mid);
        });
        coreLight.intensity = 0.3 * vigor + bloom * 0.3 + charge * 0.4 + burst * 0.7;
        cavMat.emissiveIntensity = 0.25 + charge * 0.5 + bloom * 0.1;

        swirl.forEach(w => {
          if (!frost || frost.p < 0.5 || frost.p > 0.98) {
            w.m.visible = false;
            return;
          }
          const q = clamp01((frost.p - 0.5 - w.d * 0.4) / 0.45);
          if (q <= 0 || q >= 1) {
            w.m.visible = false;
            return;
          }
          w.m.visible = true;
          const a = w.a + q * 9;
          const rad = w.r * (1 + q * 2.2);
          w.m.position.set(Math.cos(a) * rad, 1.1 + Math.sin(a) * rad * 0.5 + q * 0.3, 0.4 + q * 3.2 * w.sp);
          w.m.rotation.set(a, a * 0.7, q * 4);
          const sc = Math.sin(Math.PI * q) * 1.4;
          w.m.scale.setScalar(sc + 0.001);
        });
        const flurryK = Math.max(flurry, joy >= 90 && !dying ? 0.35 * Math.max(0, Math.sin(t * 0.3)) : 0);
        happy.forEach(h => {
          if (flurryK < 0.02) {
            h.s.visible = false;
            return;
          }
          h.s.visible = true;
          const u = (((t * 0.28 + h.ph) % 1) + 1) % 1;
          const a = h.a + t * 0.5;
          h.s.position.set(Math.sin(a) * (0.7 + u * 0.5), 3.2 - u * 2.2, Math.cos(a) * (0.7 + u * 0.5));
          h.s.scale.setScalar(0.14 + 0.05 * Math.sin(h.ph * 9));
          h.s.material.rotation = t + h.a;
          h.s.material.opacity = Math.sin(Math.PI * u) * flurryK;
        });
        drops.forEach(d => {
          if (!dying) {
            d.d.visible = false;
            return;
          }
          const u = (((t * 0.4 + d.ph) % 1) + 1) % 1;
          d.d.visible = true;
          const r = budR(0.7) + 0.15;
          d.d.position.set(Math.sin(d.a) * r, 0.7 - u * 0.7, Math.cos(d.a) * r);
          d.d.scale.set(1 - u * 0.4, 1.4 * (1 - u * 0.4), 1 - u * 0.4);
        });

        const lid0 = squint ? 1 - squint : blink;
        eyes.forEach(({ g }) => {
          g.scale.y = Math.max(0.08, lid0) * (airborne ? 1.06 : 1);
        });
        followPupils(eyes, pointer, 0.6);
      }
    };
  }
});
