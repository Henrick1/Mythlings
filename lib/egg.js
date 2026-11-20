(function (root) {
  const texCache = {};

  function hexMix(a, b, k) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = sh => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
    return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }

  function typeColor(type) {
    const info = root.PetTypes && root.PetTypes.INFO && root.PetTypes.INFO[type];
    return info ? info.color : "#c48ae8";
  }

  function paintShell(type, tier, tint) {
    const W = 1024;
    const H = 512;
    const cv = root.document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const g = cv.getContext("2d");
    const tc = tint || typeColor(type);
    const legend = tier === "legendary";
    const lum = (() => {
      const n = parseInt(tc.slice(1), 16);
      return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    })();
    const base = legend ? hexMix("#f4d27a", tc, 0.1) : hexMix("#fff6e6", tc, 0.4);
    const deep = legend ? hexMix(tc, "#4a2e04", 0.45) : hexMix(tc, "#140f1a", 0.16 + Math.max(0, lum - 0.45) * 1.1);
    const pale = legend ? "#fff4c8" : hexMix("#ffffff", tc, 0.22);
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "rgba(255,255,255,0.18)");
    grad.addColorStop(0.6, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.10)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    let seed = 0;
    for (let i = 0; i < type.length; i++) seed = (seed * 31 + type.charCodeAt(i)) % 2147483647;
    seed = seed || 11;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const wrap = (x, fn) => [-W, 0, W].forEach(o => fn(x + o));
    const circle = (x, y, r, fill) => {
      wrap(x, xx => {
        g.beginPath();
        g.arc(xx, y, r, 0, Math.PI * 2);
        g.fillStyle = fill;
        g.fill();
      });
    };
    const path = (draw, fill, stroke, lw) => {
      [-W, 0, W].forEach(o => {
        g.save();
        g.translate(o, 0);
        g.beginPath();
        draw();
        if (fill) {
          g.fillStyle = fill;
          g.fill();
        }
        if (stroke) {
          g.strokeStyle = stroke;
          g.lineWidth = lw || 6;
          g.lineCap = "round";
          g.lineJoin = "round";
          g.stroke();
        }
        g.restore();
      });
    };
    const star = (x, y, r, n, inner, fill, rot = 0) =>
      path(() => {
        for (let i = 0; i < n * 2; i++) {
          const a = rot + (i / (n * 2)) * Math.PI * 2;
          const rr = i % 2 ? r * inner : r;
          i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.closePath();
      }, fill);
    const P = {
      fire() {
        for (let k = 0; k < 11; k++) {
          const x = (k / 11) * W + rnd() * 30;
          const w = 70 + rnd() * 30;
          const h = H * (0.42 + rnd() * 0.22);
          const flame = (ww, hh, c) =>
            path(() => {
              g.moveTo(x - ww / 2, H);
              g.bezierCurveTo(x - ww / 2, H - hh * 0.5, x - ww * 0.1, H - hh * 0.6, x + ww * 0.15, H - hh);
              g.bezierCurveTo(x + ww * 0.05, H - hh * 0.65, x + ww / 2, H - hh * 0.5, x + ww / 2, H);
              g.closePath();
            }, c);
          flame(w, h, deep);
          flame(w * 0.55, h * 0.6, hexMix(tc, "#ffe066", 0.55));
        }
        for (let k = 0; k < 26; k++) circle(rnd() * W, rnd() * H * 0.45, 3 + rnd() * 5, hexMix(tc, "#ffffff", 0.2));
      },
      water() {
        for (let b = 0; b < 5; b++) {
          const y0 = H * (0.18 + b * 0.17);
          const amp = 14 + b * 2;
          path(() => {
            g.moveTo(0, y0);
            for (let x = 0; x <= W; x += 16) g.lineTo(x, y0 + Math.sin((x / W) * Math.PI * 8 + b) * amp);
            g.lineTo(W, y0 + 24);
            for (let x = W; x >= 0; x -= 16) g.lineTo(x, y0 + 24 + Math.sin((x / W) * Math.PI * 8 + b + 0.6) * amp);
            g.closePath();
          }, b % 2 ? deep : hexMix(tc, "#ffffff", 0.35));
        }
        for (let k = 0; k < 22; k++) {
          const x = rnd() * W;
          const y = rnd() * H;
          path(() => g.arc(x, y, 6 + rnd() * 9, 0, Math.PI * 2), null, "rgba(255,255,255,0.75)", 3);
        }
      },
      grass() {
        path(() => {
          g.moveTo(0, H * 0.55);
          for (let x = 0; x <= W; x += 16) g.lineTo(x, H * 0.55 + Math.sin((x / W) * Math.PI * 6) * 40);
        }, null, deep, 7);
        for (let k = 0; k < 30; k++) {
          const x = rnd() * W;
          const y = H * 0.1 + rnd() * H * 0.85;
          const a = rnd() * Math.PI * 2;
          const len = 34 + rnd() * 22;
          path(() => {
            g.ellipse(x, y, len, len * 0.42, a, 0, Math.PI * 2);
          }, k % 3 ? deep : hexMix(tc, "#2e6b1c", 0.3));
          path(() => {
            g.moveTo(x - Math.cos(a) * len * 0.85, y - Math.sin(a) * len * 0.85);
            g.lineTo(x + Math.cos(a) * len * 0.85, y + Math.sin(a) * len * 0.85);
          }, null, pale, 3);
        }
      },
      electric() {
        [0.33, 0.68].forEach((yy, b) => {
          path(() => {
            const n = 14;
            g.moveTo(0, H * yy);
            for (let i = 1; i <= n; i++) g.lineTo((i / n) * W - (i % 2 ? 18 : 0), H * yy + (i % 2 ? -34 : 34));
          }, null, b ? deep : hexMix(tc, "#3a2a00", 0.35), 18);
        });
        for (let k = 0; k < 18; k++) star(rnd() * W, rnd() * H, 10 + rnd() * 8, 4, 0.35, pale, rnd());
      },
      ice() {
        for (let k = 0; k < 16; k++) {
          const x = rnd() * W;
          const y = H * 0.08 + rnd() * H * 0.86;
          const r = 34 + rnd() * 24;
          path(() => {
            for (let a = 0; a < 6; a++) {
              const ang = (a / 6) * Math.PI * 2;
              const cx = Math.cos(ang);
              const sy = Math.sin(ang);
              g.moveTo(x, y);
              g.lineTo(x + cx * r, y + sy * r);
              const bx = x + cx * r * 0.55;
              const by = y + sy * r * 0.55;
              g.moveTo(bx, by);
              g.lineTo(bx + Math.cos(ang + 0.7) * r * 0.3, by + Math.sin(ang + 0.7) * r * 0.3);
              g.moveTo(bx, by);
              g.lineTo(bx + Math.cos(ang - 0.7) * r * 0.3, by + Math.sin(ang - 0.7) * r * 0.3);
            }
          }, null, k % 3 ? deep : "#ffffff", 8);
        }
        for (let k = 0; k < 60; k++) circle(rnd() * W, rnd() * H, 3 + rnd() * 4, "rgba(255,255,255,0.9)");
      },
      poison() {
        for (let k = 0; k < 12; k++) {
          const x = (k / 12) * W + rnd() * 40;
          const len = 60 + rnd() * 120;
          const w = 22 + rnd() * 14;
          path(() => {
            g.moveTo(x - w, 0);
            g.lineTo(x - w * 0.55, len - w);
            g.arc(x, len - w * 0.55, w * 0.6, Math.PI, 0, true);
            g.lineTo(x + w, 0);
            g.closePath();
          }, deep);
        }
        g.fillStyle = deep;
        g.fillRect(0, 0, W, 26);
        for (let k = 0; k < 34; k++) {
          const x = rnd() * W;
          const y = H * 0.35 + rnd() * H * 0.6;
          const r = 6 + rnd() * 20;
          circle(x, y, r, k % 2 ? hexMix(tc, "#ffffff", 0.3) : deep);
          circle(x - r * 0.3, y - r * 0.3, r * 0.25, "rgba(255,255,255,0.7)");
        }
      },
      psychic() {
        for (let k = 0; k < 12; k++) {
          const x = rnd() * W;
          const y = H * 0.15 + rnd() * H * 0.75;
          const r = 36 + rnd() * 30;
          for (let i = 3; i >= 1; i--) circle(x, y, (r * i) / 3, i % 2 ? deep : "#ffffff");
        }
        path(() => {
          g.moveTo(0, H * 0.5);
          for (let x = 0; x <= W; x += 12) g.lineTo(x, H * 0.5 + Math.sin((x / W) * Math.PI * 10) * 16);
        }, null, deep, 5);
      },
      ghost() {
        for (let k = 0; k < 14; k++) {
          const x = rnd() * W;
          const y = H * 0.15 + rnd() * H * 0.7;
          const r = 30 + rnd() * 18;
          path(() => {
            g.arc(x, y, r, Math.PI, 0);
            g.lineTo(x + r, y + r * 1.4);
            for (let i = 0; i < 3; i++) g.quadraticCurveTo(x + r - (i + 0.5) * ((r * 2) / 3), y + r * 1.0, x + r - (i + 1) * ((r * 2) / 3), y + r * 1.4);
            g.closePath();
          }, k % 3 ? deep : "#ffffff");
          circle(x - r * 0.35, y, r * 0.16, k % 3 ? "#ffffff" : deep);
          circle(x + r * 0.35, y, r * 0.16, k % 3 ? "#ffffff" : deep);
        }
      },
      dark() {
        for (let k = 0; k < 13; k++) {
          const x = rnd() * W;
          const y = H * 0.12 + rnd() * H * 0.78;
          const r = 34 + rnd() * 22;
          path(() => {
            g.arc(x, y, r, 0, Math.PI * 2);
            g.arc(x + r * 0.45, y - r * 0.2, r * 0.85, 0, Math.PI * 2, true);
          }, deep);
        }
        for (let k = 0; k < 30; k++) star(rnd() * W, rnd() * H, 8 + rnd() * 8, 4, 0.4, k % 2 ? "#fff7d6" : deep, rnd());
      },
      light() {
        path(() => {
          for (let i = 0; i < 24; i++) {
            const x = (i / 24) * W;
            g.moveTo(x, H * 0.5);
            g.lineTo(x + 20, H * 0.5);
            g.lineTo(x + 10, i % 2 ? H * 0.2 : H * 0.8);
            g.closePath();
          }
        }, deep);
        g.fillStyle = hexMix(deep, "#000000", 0.2);
        g.fillRect(0, H * 0.47, W, H * 0.06);
        for (let k = 0; k < 22; k++) star(rnd() * W, rnd() * H, 16 + rnd() * 12, 4, 0.3, k % 2 ? deep : "#ffffff", 0);
      },
      steel() {
        [0.25, 0.5, 0.75].forEach(yy => {
          g.fillStyle = deep;
          g.fillRect(0, H * yy - 7, W, 14);
          for (let x = 18; x < W; x += 52) {
            circle(x, H * yy - 22, 10, deep);
            circle(x, H * yy + 22, 10, deep);
            circle(x - 2, H * yy - 20, 2.5, "#ffffff");
            circle(x - 2, H * yy + 16, 2.5, "#ffffff");
          }
        });
        for (let x = 0; x < W; x += 128) {
          g.fillStyle = deep;
          g.fillRect(x, 0, 9, H * 0.25);
          g.fillRect(x + 64, H * 0.5, 9, H * 0.25);
        }
      },
      dragon() {
        const rows = 9;
        for (let r = 0; r < rows; r++) {
          const y = (r / rows) * H + 20;
          const off = r % 2 ? 34 : 0;
          for (let x = -68; x < W + 68; x += 68) {
            path(() => {
              g.arc(x + off, y, 34, 0, Math.PI);
            }, r % 2 ? deep : hexMix(tc, "#000000", 0.05), "rgba(255,255,255,0.55)", 3);
          }
        }
      },
      bug() {
        g.fillStyle = deep;
        g.fillRect(W * 0.49, 0, 10, H);
        for (let k = 0; k < 18; k++) {
          const x = rnd() * W;
          const y = H * 0.12 + rnd() * H * 0.8;
          circle(x, y, 16 + rnd() * 18, k % 3 ? "#2a2018" : deep);
        }
        for (let k = 0; k < 40; k++) circle(rnd() * W, rnd() * H, 3, pale);
      },
      rock() {
        for (let k = 0; k < 26; k++) {
          const x = rnd() * W;
          const y = rnd() * H;
          const r = 18 + rnd() * 26;
          const n = 6 + Math.floor(rnd() * 3);
          path(() => {
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2;
              const rr = r * (0.7 + rnd() * 0.3);
              i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
            }
            g.closePath();
          }, k % 2 ? deep : hexMix(tc, "#ffffff", 0.3), "rgba(0,0,0,0.18)", 3);
        }
      },
      ground() {
        for (let b = 0; b < 7; b++) {
          const y0 = (b / 7) * H;
          path(() => {
            g.moveTo(0, y0);
            for (let x = 0; x <= W; x += 20) g.lineTo(x, y0 + Math.sin((x / W) * Math.PI * 4 + b * 1.3) * 12);
            g.lineTo(W, y0 + 36);
            for (let x = W; x >= 0; x -= 20) g.lineTo(x, y0 + 36 + Math.sin((x / W) * Math.PI * 4 + b * 1.3 + 0.5) * 12);
            g.closePath();
          }, b % 2 ? deep : hexMix(tc, "#ffffff", 0.25));
        }
      },
      flying() {
        for (let r = 0; r < 5; r++) {
          const y = H * (0.14 + r * 0.18);
          for (let x = 0; x < W; x += 64) {
            const xx = x + (r % 2) * 32;
            path(() => {
              g.moveTo(xx - 26, y - 18);
              g.lineTo(xx, y + 12);
              g.lineTo(xx + 26, y - 18);
            }, null, r % 2 ? deep : hexMix(deep, "#ffffff", 0.45), 12);
          }
        }
      },
      fighting() {
        [0.2, 0.42, 0.64, 0.86].forEach((yy, i) => {
          g.fillStyle = i % 2 ? deep : hexMix(tc, "#ffffff", 0.3);
          g.fillRect(0, H * yy - 16, W, 32);
        });
      }
    };
    (P[type] || (() => {
      for (let k = 0; k < 40; k++) circle(rnd() * W, rnd() * H, 8 + rnd() * 14, deep);
    }))();
    if (tier === "rare" || legend) {
      const band = legend ? "#fff1b0" : "#e9eef6";
      const edge = legend ? "#b8860b" : "#8a94a8";
      g.fillStyle = edge;
      g.fillRect(0, H * 0.47 - 18, W, 36);
      g.fillStyle = band;
      g.fillRect(0, H * 0.47 - 12, W, 24);
      for (let x = 16; x < W; x += 64) {
        g.save();
        g.translate(x, H * 0.47);
        g.rotate(Math.PI / 4);
        g.fillStyle = legend ? hexMix(tc, "#ffffff", 0.15) : tc;
        g.fillRect(-9, -9, 18, 18);
        g.restore();
      }
    }
    return cv;
  }

  function shellMap(THREE, type, tier, tint) {
    if (!root.document) return null;
    const key = type + ":" + tier + ":" + (tint || "");
    if (!texCache[key]) {
      const tex = new THREE.CanvasTexture(paintShell(type, tier, tint));
      tex.wrapS = THREE.RepeatWrapping;
      tex.anisotropy = 4;
      texCache[key] = tex;
    }
    return texCache[key];
  }

  function build(THREE, opts = {}) {
    const H = 1.5;
    const W = 0.6;
    const typed = !!opts.type;
    const tier = opts.tier || "common";
    const color = typed ? opts.tint || typeColor(opts.type) : opts.color || "#c48ae8";
    const map = typed ? shellMap(THREE, opts.type, tier, opts.tint) : null;
    const lerp = (a, b, k) => a + (b - a) * k;
    const smooth = (a, b, x) => {
      const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };

    const profile = t => new THREE.Vector2(Math.max(0.0001, W * Math.sin(t) * (1 + 0.12 * Math.cos(t))), ((1 - Math.cos(t)) / 2) * H);
    const T_CUT = 1.78;
    const span = (a, b, n) => {
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(profile(a + (b - a) * (i / n)));
      return pts;
    };
    const surf = (t, phi, k = 1) => {
      const p = profile(t);
      return new THREE.Vector3(Math.sin(phi) * p.x * k, p.y, Math.cos(phi) * p.x * k);
    };

    const shellOpts = () => ({
      color: map ? 0xffffff : 0xfff3df,
      map,
      roughness: tier === "legendary" ? 0.28 : tier === "rare" ? 0.35 : 0.45,
      metalness: tier === "legendary" ? 0.45 : tier === "rare" ? 0.12 : 0,
      transparent: true,
      opacity: 1,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0
    });
    const shellBottom = new THREE.MeshStandardMaterial(shellOpts());
    const shellTop = new THREE.MeshStandardMaterial(shellOpts());
    const rayMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const spotMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.9, transparent: true, opacity: 0, depthWrite: false });
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x5a4632 });
    const crackDark = new THREE.Color(0x5a4632);
    const crackHot = new THREE.Color(0xfff2a8).lerp(new THREE.Color(color), 0.25);
    const crackGlowMat = new THREE.MeshBasicMaterial({ color: crackHot, transparent: true, opacity: 0, depthWrite: false });
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfffbe8, transparent: true, opacity: 0, depthWrite: false });

    const rootG = new THREE.Group();
    const body = new THREE.Group();
    rootG.add(body);
    const bottom = new THREE.Group();
    const top = new THREE.Group();
    body.add(bottom, top);

    const mk = (geo, mat, shadow = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = shadow;
      return m;
    };

    const latheUv = geo => {
      const pa = geo.attributes.position;
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, pa.getY(i) / H);
      uv.needsUpdate = true;
      return geo;
    };
    bottom.add(mk(latheUv(new THREE.LatheGeometry(span(0, T_CUT, 24), 64)), shellBottom));
    const topPivot = new THREE.Group();
    const cutY = profile(T_CUT).y;
    topPivot.position.y = cutY;
    top.add(topPivot);
    const topMesh = mk(latheUv(new THREE.LatheGeometry(span(T_CUT, Math.PI, 20), 64)), shellTop);
    topMesh.position.y = -cutY;
    topPivot.add(topMesh);

    const place = (m, t, phi, k) => {
      const p = surf(t, phi, k);
      const n = new THREE.Vector3(Math.sin(phi), (Math.cos(t) * -0.9), Math.cos(phi)).normalize();
      m.position.copy(p);
      m.lookAt(p.x + n.x, p.y + n.y, p.z + n.z);
      return m;
    };

    [
      [0.9, 0.3, 0.13],
      [1.3, 2.2, 0.11],
      [1.15, -1.6, 0.12],
      [2.1, 0.9, 0.1],
      [2.3, -0.7, 0.12],
      [2.15, 3.0, 0.11],
      [2.65, 1.9, 0.08],
      [1.55, -0.2, 0.08],
      [0.7, 3.4, 0.1]
    ].forEach(([t, phi, r]) => {
      const spot = mk(new THREE.SphereGeometry(1, 16, 10), spotMat, false);
      spot.scale.set(r, r * 0.85, 0.025);
      spot.visible = !typed;
      if (t < T_CUT) bottom.add(place(spot, t, phi, 1.0));
      else {
        place(spot, t, phi, 1.0);
        spot.position.y -= cutY;
        topPivot.add(spot);
      }
    });

    const dirt = [];
    [
      [1.0, 0.8, 0.16],
      [1.6, -0.9, 0.13],
      [2.0, 2.4, 0.15],
      [1.25, 3.6, 0.12],
      [2.4, 0.2, 0.1]
    ].forEach(([t, phi, r]) => {
      const d = mk(new THREE.SphereGeometry(1, 14, 10), dirtMat, false);
      d.scale.set(r, r * 0.7, 0.03);
      place(d, t, phi, 1.004);
      if (t < T_CUT) bottom.add(d);
      else {
        d.position.y -= cutY;
        topPivot.add(d);
      }
      dirt.push(d);
    });

    const cracks = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const addSeg = (a, b, level) => {
      const len = a.distanceTo(b);
      const seg = mk(new THREE.BoxGeometry(0.022, 0.022, len), crackMat, false);
      seg.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      seg.lookAt(b.x, b.y, b.z);
      const halo = mk(new THREE.BoxGeometry(0.07, 0.07, len * 1.05), crackGlowMat, false);
      seg.add(halo);
      seg.visible = false;
      body.add(seg);
      cracks.push({ seg, level });
    };
    const crackLine = (t0, phi0, dt, dphi, steps, level, branches) => {
      let t = t0;
      let phi = phi0;
      let prev = surf(t, phi, 1.012);
      for (let i = 0; i < steps; i++) {
        const side = i % 2 ? 1 : -1;
        t = Math.max(0.35, Math.min(Math.PI - 0.35, t + dt + side * (0.05 + rnd() * 0.06)));
        phi += dphi + side * (0.05 + rnd() * 0.08) * (Math.abs(dt) > Math.abs(dphi) ? 1 : 0.3);
        const next = surf(t, phi, 1.012);
        addSeg(prev, next, level);
        if (branches && i === Math.floor(steps / 2)) crackLine(t, phi, dt * 0.4 + 0.08, -dphi * 1.2 + 0.1, 3, level, false);
        prev = next;
      }
    };
    crackLine(1.35, 0.35, 0.02, 0.16, 5, 1, true);
    crackLine(2.15, -0.7, -0.12, 0.05, 4, 1, false);
    crackLine(1.65, 1.0, 0.1, 0.14, 5, 2, true);
    crackLine(2.4, 0.9, -0.1, -0.1, 4, 2, false);
    crackLine(1.1, -0.5, 0.12, -0.12, 5, 2, false);
    crackLine(1.8, 2.4, 0.03, 0.17, 6, 3, true);
    crackLine(2.0, -1.6, -0.04, -0.15, 6, 3, true);
    crackLine(0.9, 2.9, 0.1, 0.1, 4, 3, false);

    let nest = null;
    if (opts.nest) {
      nest = new THREE.Group();
      const straw = new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.9 });
      const ring = mk(new THREE.TorusGeometry(0.64, 0.16, 12, 36), straw);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1;
      const bed = mk(new THREE.CylinderGeometry(0.64, 0.58, 0.1, 32), new THREE.MeshStandardMaterial({ color: 0xb08a52, roughness: 0.95 }));
      bed.position.y = 0.04;
      nest.add(ring, bed);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const st = mk(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), straw, false);
        st.position.set(Math.sin(a) * 0.68, 0.18, Math.cos(a) * 0.68);
        st.rotation.set(0.6 * Math.cos(a * 3), a, 0.9);
        nest.add(st);
      }
      rootG.add(nest);
      body.position.y = 0.08;
    }

    const sparks = [];
    for (let i = 0; i < 9; i++) {
      const m = mk(new THREE.OctahedronGeometry(0.05), sparkMat, false);
      m.visible = false;
      rootG.add(m);
      sparks.push({ m, a: (i / 9) * Math.PI * 2, h: 0.3 + (i % 3) * 0.35 });
    }

    const shards = [];
    for (let i = 0; i < 12; i++) {
      const m = mk(new THREE.TetrahedronGeometry(0.11), i % 3 ? shellBottom : spotMat, false);
      m.scale.set(1, 1, 0.3);
      m.visible = false;
      rootG.add(m);
      const a = (i / 12) * Math.PI * 2;
      shards.push({ m, vx: Math.sin(a) * (0.9 + (i % 4) * 0.25), vz: Math.cos(a) * (0.9 + (i % 3) * 0.3), vy: 2.2 + (i % 5) * 0.4, spin: 4 + (i % 4) * 2 });
    }

    const rays = [];
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      const ray = mk(new THREE.ConeGeometry(0.07, 1.4, 6, 1, true), rayMat, false);
      ray.position.y = 0.7;
      g.add(ray);
      g.position.y = profile(T_CUT).y;
      g.rotation.set(Math.PI / 2 - 0.25 + (i % 3) * 0.15, (i / 10) * Math.PI * 2, 0, "YXZ");
      g.visible = false;
      rootG.add(g);
      rays.push(g);
    }

    const ring = mk(new THREE.RingGeometry(0.5, 0.62, 48), ringMat, false);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.visible = false;
    rootG.add(ring);

    const confColors = [color, "#ffffff", "#ffd75e", color, "#ff9fb8"];
    const confetti = [];
    for (let i = 0; i < 30; i++) {
      const m = mk(new THREE.PlaneGeometry(0.07, 0.11), new THREE.MeshBasicMaterial({ color: new THREE.Color(confColors[i % confColors.length]), side: THREE.DoubleSide }), false);
      m.visible = false;
      rootG.add(m);
      const a = (i / 30) * Math.PI * 2 + (i % 3) * 0.4;
      confetti.push({ m, vx: Math.sin(a) * (0.6 + (i % 5) * 0.22), vz: Math.cos(a) * (0.6 + (i % 4) * 0.25), vy: 3 + (i % 6) * 0.45, spin: 5 + (i % 5) * 2, ph: i });
    }

    const orbitColors = [color, "#ffffff", "#ffe27a"];
    const orbiters = [];
    for (let i = 0; i < 14; i++) {
      const m = mk(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color(orbitColors[i % 3]) }), false);
      m.visible = false;
      rootG.add(m);
      orbiters.push({ m, a: (i / 14) * Math.PI * 2, h: 0.2 + (i % 5) * 0.32, sp: 1 + (i % 3) * 0.35 });
    }

    const glints = [];
    if (tier !== "common") {
      const gm = new THREE.MeshBasicMaterial({ color: tier === "legendary" ? 0xffe9a0 : 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
      for (let i = 0; i < (tier === "legendary" ? 7 : 3); i++) {
        const m = mk(new THREE.OctahedronGeometry(0.045), gm, false);
        rootG.add(m);
        glints.push({ m, a: (i / 7) * Math.PI * 2, h: 0.25 + ((i * 0.37) % 1) * 1.1, sp: 0.5 + (i % 3) * 0.2 });
      }
    }

    const flash = mk(new THREE.SphereGeometry(1, 24, 16), flashMat, false);
    flash.position.y = H * 0.55;
    flash.visible = false;
    rootG.add(flash);

    return {
      root: rootG,
      hatchDuration: 3.2,
      update(st) {
        const t = st.t;
        const motion = st.motion === undefined ? 1 : st.motion;
        const care = st.care === undefined ? 100 : st.care;
        const careK = care / 100;
        const hp = st.hatch;

        dirtMat.opacity = (1 - careK) * 0.85;
        const alive = 0.35 + 0.65 * careK;
        const pk = st.progress === undefined ? 0 : Math.max(0, Math.min(1, st.progress));
        const wob = 1 + pk * pk * 2.6;
        let rz = Math.sin(t * (1.6 + pk * 1.8)) * 0.035 * alive * motion * wob;
        let rx = Math.sin(t * 1.1 + 1) * 0.02 * alive * motion * wob;
        let y = 0;
        if (pk > 0.55 && motion) {
          const ph = (t * (0.25 + pk * 0.25)) % 1;
          if (ph < 0.1) {
            const q = Math.sin((ph / 0.1) * Math.PI);
            y += q * 0.07 * pk;
            rz += Math.sin((ph / 0.1) * Math.PI * 3) * 0.12 * pk;
          }
        }
        let sy = 1 + Math.sin(t * 2.2) * 0.012 * alive * motion;
        let ry = 0;

        const act = st.action;
        if (act && act.name === "play") {
          const p = act.p;
          rz += Math.sin(p * Math.PI * 4) * 0.28 * (1 - p);
          y += Math.abs(Math.sin(p * Math.PI * 2)) * 0.18 * (1 - p * 0.5);
          sy += Math.sin(p * Math.PI * 4) * 0.04;
        }
        const cleaning = act && act.name === "clean" ? act.p : -1;
        if (cleaning >= 0) ry = Math.sin(cleaning * Math.PI) * 0.6;
        sparkMat.opacity = cleaning >= 0 ? Math.sin(cleaning * Math.PI) : 0;
        sparks.forEach(({ m, a, h }, i) => {
          m.visible = cleaning >= 0;
          if (!m.visible) return;
          const aa = a + cleaning * 5;
          const rr = 0.72 + Math.sin(cleaning * Math.PI * 2 + i) * 0.08;
          m.position.set(Math.sin(aa) * rr, h + cleaning * 0.6, Math.cos(aa) * rr);
          m.rotation.set(t * 4, t * 3, 0);
          m.scale.setScalar(0.6 + Math.sin(cleaning * Math.PI) * 0.8);
        });

        let burst = false;
        const level = Math.max(0, Math.min(3, st.cracks || 0));
        let glowK = level / 3;
        let lift = 0;

        const knocking = act && act.name === "knock" ? act.p : -1;
        if (knocking >= 0) {
          const dir = level % 2 ? 1 : -1;
          rz += Math.sin(knocking * Math.PI * 3) * 0.32 * (1 - knocking) * dir;
          y += Math.sin(Math.min(1, knocking * 1.6) * Math.PI) * 0.32;
          const land = knocking > 0.62 ? Math.sin(((knocking - 0.62) / 0.38) * Math.PI) : 0;
          sy += -land * 0.16 + (knocking < 0.3 ? Math.sin((knocking / 0.3) * Math.PI) * 0.08 : 0);
          glowK = Math.min(1, glowK + Math.sin(knocking * Math.PI) * 0.6);
        }
        sparkMat.opacity = Math.max(sparkMat.opacity, knocking >= 0 ? Math.sin(knocking * Math.PI) : 0);
        if (knocking >= 0) {
          sparks.forEach(({ m, a }, i) => {
            m.visible = true;
            const rr = 0.45 + knocking * 0.9;
            m.position.set(Math.sin(a) * rr, cutY + (i % 3) * 0.08 + knocking * 0.5 - knocking * knocking * 0.6, Math.cos(a) * rr);
            m.rotation.set(t * 6, t * 5, 0);
            m.scale.setScalar(1.1 * (1 - knocking) + 0.2);
          });
        }

        const hatchingNow = hp !== null && hp !== undefined;
        cracks.forEach(c => {
          c.seg.visible = (hatchingNow || c.level <= level) && !(hatchingNow && hp >= 0.62);
        });
        const pulse = 0.75 + Math.sin(t * 6) * 0.25;
        crackMat.color.copy(crackDark).lerp(crackHot, Math.min(1, level / 3 + 0.2) * (level ? 1 : 0));
        crackGlowMat.opacity = (level / 3) * 0.55 * pulse + (knocking >= 0 ? Math.sin(knocking * Math.PI) * 0.4 : 0);

        if (hp !== null && hp !== undefined) {
          const pre = hp < 0.62;
          const frantic = smooth(0, 0.3, hp) * (pre ? 1 : 0);
          rz = Math.sin(t * 40) * 0.16 * frantic;
          rx = Math.sin(t * 31) * 0.07 * frantic;
          lift = smooth(0.02, 0.4, hp) * 0.5 * (pre ? 1 : 0);
          y = Math.sin(t * 3) * 0.04 * frantic;
          ry = smooth(0.05, 0.62, hp) * Math.PI * 3 * (pre ? 1 : 0);
          if (hp > 0.52 && pre) sy = 1 - Math.sin(((hp - 0.52) / 0.1) * Math.PI) * 0.24;
          glowK = pre ? 1 : 0;
          crackGlowMat.opacity = pre ? 0.6 + Math.sin(t * 18) * 0.3 : 0;
          crackMat.color.copy(crackHot);
          rays.forEach((g, i) => {
            g.visible = hp > 0.05 && hp < 0.7;
            if (!g.visible) return;
            const q = smooth(0.05, 0.55, hp);
            g.scale.set(1, (0.5 + q * 1.3) * (1 + Math.sin(t * 20 + i) * 0.15), 1);
            g.position.y = profile(T_CUT).y + lift + (nest ? 0.08 : 0);
          });
          rayMat.opacity = smooth(0.05, 0.5, hp) * (1 - smooth(0.62, 0.7, hp)) * 0.6;
          orbiters.forEach((o, i) => {
            const on = pre;
            o.m.visible = on;
            if (!on) return;
            const k = smooth(0, 0.12, hp);
            const rad = lerp(1.2, 0.5, smooth(0.1, 0.6, hp)) * k;
            const a = o.a + t * o.sp * (2 + hp * 10);
            o.m.position.set(Math.sin(a) * rad, (nest ? 0.08 : 0) + o.h + lift, Math.cos(a) * rad);
            o.m.rotation.set(t * 5, t * 4, 0);
            o.m.scale.setScalar(k * (0.8 + Math.sin(t * 9 + i) * 0.3));
          });
          flash.visible = hp > 0.58 && hp < 0.82;
          if (flash.visible) {
            const q = (hp - 0.58) / 0.24;
            flash.scale.setScalar(0.3 + q * 2.8);
            flashMat.opacity = Math.sin(Math.min(1, q * 1.3) * Math.PI) * 0.95;
          }
          ring.visible = hp > 0.62;
          if (ring.visible) {
            const q = (hp - 0.62) / 0.38;
            ring.scale.setScalar(1 + q * 4);
            ringMat.opacity = (1 - q) * 0.7;
          }
          if (!pre) {
            burst = true;
            const q = (hp - 0.62) / 0.38;
            topPivot.position.set(q * 0.6, cutY + q * 2.4 - q * q * 1.6, q * 0.25);
            topPivot.rotation.set(-q * 2.2, q * 1.5, q * 3.4);
            shellTop.opacity = 1 - smooth(0.55, 1, q);
            bottom.scale.setScalar(1 - smooth(0.2, 0.9, q) * 0.6);
            shellBottom.opacity = 1 - smooth(0.25, 0.85, q);
            bottom.position.y = -q * 0.4;
            shards.forEach(sh => {
              sh.m.visible = q < 0.95;
              sh.m.position.set(sh.vx * q * 1.3, cutY + sh.vy * q - 4.5 * q * q, sh.vz * q * 1.3);
              sh.m.rotation.set(q * sh.spin, q * sh.spin * 0.7, 0);
            });
            confetti.forEach(c => {
              c.m.visible = true;
              const qq = q * 1.25;
              c.m.position.set(c.vx * qq, cutY + c.vy * qq - 3.2 * qq * qq, c.vz * qq);
              c.m.rotation.set(t * c.spin, t * c.spin * 0.6 + c.ph, 0);
            });
          }
        } else {
          orbiters.forEach(o => {
            o.m.visible = false;
          });
          rays.forEach(g => {
            g.visible = false;
          });
        }
        glints.forEach((o, i) => {
          o.m.visible = hp === null || hp === undefined || hp < 0.6;
          const a = o.a + t * o.sp;
          const rr = 0.78 + Math.sin(t * 1.3 + i) * 0.06;
          o.m.position.set(Math.sin(a) * rr, (nest ? 0.08 : 0) + o.h + Math.sin(t * 2 + i) * 0.06, Math.cos(a) * rr);
          o.m.rotation.set(t * 2, t * 3, 0);
          o.m.scale.setScalar(0.6 + Math.abs(Math.sin(t * 2.4 + i * 1.7)) * 0.7);
        });
        shellBottom.emissiveIntensity = glowK * (0.35 + Math.sin(t * 6) * 0.08) + (tier === "legendary" ? 0.1 + Math.sin(t * 2) * 0.05 : 0);
        shellTop.emissiveIntensity = shellBottom.emissiveIntensity;
        y += lift;

        body.rotation.set(rx, ry, rz);
        body.position.y = (nest ? 0.08 : 0) + y;
        body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
        return burst;
      }
    };
  }

  root.PetEgg = { build };
})(typeof self !== "undefined" ? self : this);
