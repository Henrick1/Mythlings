(function (root) {
  function mount(host, o) {
    const THREE = o.THREE;
    const R = o.Regions;
    const Types = o.Types;
    const TAU = Math.PI * 2;
    const reduce = !!o.reduceMotion;
    const icon = (k, s, w) => (root.PetIcons ? root.PetIcons.svg(k, s, w) : "");
    const h = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    };
    let sd = 7;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const rr = (a, b) => a + rnd() * (b - a);

    const wrap = h("div", "bt mp");
    const head = h("header", "bt-head");
    const backBtn = h("button", "bt-x");
    backBtn.type = "button";
    backBtn.setAttribute("aria-label", "Voltar");
    backBtn.innerHTML = icon("back", 22, 2.6);
    const plate = h("h2", "bt-plate");
    plate.innerHTML = icon("map", 20, 2.6);
    plate.append(h("span", "", "Mapa"));
    head.append(backBtn, plate);
    const view = h("div", "mp-view");
    const canvas = h("canvas", "mp-canvas");
    const tagLayer = h("div", "mp-tags");
    const card = h("div", "mp-card");
    card.hidden = true;
    const cardName = h("h3", "mp-name");
    const cardTypes = h("div", "mp-types");
    const cardInfo = h("p", "mp-info");
    const fightBtn = h("button", "bt-primary mp-go");
    fightBtn.type = "button";
    fightBtn.innerHTML = icon("fight", 22, 2.6);
    fightBtn.append(h("span", "", "Batalhar aqui"));
    card.append(cardName, cardTypes, cardInfo, fightBtn);
    view.append(canvas, tagLayer, card);
    wrap.append(head, view);
    host.replaceChildren(wrap);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x9fd3ea, 1);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xbfe4f2, 30, 60);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 200);
    camera.position.set(0, 26, 9.5);
    camera.lookAt(0, 0, 0.4);
    scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x5f7f4a, 0.62));
    const sun = new THREE.DirectionalLight(0xfff0d8, 0.9);
    sun.position.set(-8, 20, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 18, bottom: -18, near: 1, far: 60 });
    sun.shadow.bias = -0.0006;
    scene.add(sun);

    const mat = (c, r = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
    const glow = (c, i = 1) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.5 });
    const mesh = (g, m, cast = true) => {
      const x = new THREE.Mesh(g, m);
      x.castShadow = cast;
      x.receiveShadow = true;
      return x;
    };

    const tile = 26;
    const worldTex = (() => {
      const W = 1024;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = W;
      const g = c.getContext("2d");
      const wrapDraw = fn => [-W, 0, W].forEach(dx => [-W, 0, W].forEach(dy => fn(dx, dy)));
      g.fillStyle = "#8cc66a";
      g.fillRect(0, 0, W, W);
      for (let i = 0; i < 70; i++) {
        const x = rnd() * W;
        const y = rnd() * W;
        const r = 40 + rnd() * 120;
        const col = rnd() > 0.5 ? "rgba(110,176,84,0.55)" : "rgba(160,206,118,0.5)";
        wrapDraw((dx, dy) => {
          g.fillStyle = col;
          g.beginPath();
          g.ellipse(x + dx, y + dy, r, r * (0.6 + rnd() * 0.4), rnd() * 3, 0, TAU);
          g.fill();
        });
      }
      for (let i = 0; i < 26; i++) {
        const x = rnd() * W;
        const y = rnd() * W;
        const w = 50 + rnd() * 80;
        const hh = 40 + rnd() * 70;
        const a = rnd() * 3;
        const cols = ["#d9cf7a", "#b9d77a", "#e2c487", "#a6cf6f", "#cfe08a"];
        const col = cols[Math.floor(rnd() * cols.length)];
        const stripes = rnd() > 0.4;
        wrapDraw((dx, dy) => {
          g.save();
          g.translate(x + dx, y + dy);
          g.rotate(a);
          g.fillStyle = col;
          g.fillRect(-w / 2, -hh / 2, w, hh);
          if (stripes) {
            g.strokeStyle = "rgba(0,0,0,0.08)";
            g.lineWidth = 2;
            for (let k = -w / 2 + 6; k < w / 2; k += 8) {
              g.beginPath();
              g.moveTo(k, -hh / 2);
              g.lineTo(k, hh / 2);
              g.stroke();
            }
          }
          g.strokeStyle = "rgba(90,130,60,0.5)";
          g.lineWidth = 3;
          g.strokeRect(-w / 2, -hh / 2, w, hh);
          g.restore();
        });
      }
      const river = (x0, amp, ph, wd) => {
        wrapDraw((dx, dy) => {
          g.strokeStyle = "#e6dcb0";
          g.lineWidth = wd + 10;
          g.lineCap = "round";
          g.beginPath();
          for (let y = -20; y <= W + 20; y += 8) {
            const x = x0 + amp * Math.sin((y / W) * TAU * 2 + ph) + amp * 0.4 * Math.sin((y / W) * TAU * 3 + ph * 2);
            if (y === -20) g.moveTo(x + dx, y + dy);
            else g.lineTo(x + dx, y + dy);
          }
          g.stroke();
          g.strokeStyle = "#5fb7e0";
          g.lineWidth = wd;
          g.stroke();
        });
      };
      river(W * 0.3, 70, 0.5, 18);
      river(W * 0.78, 50, 2.1, 12);
      for (let i = 0; i < 5; i++) {
        const x = rnd() * W;
        const y = rnd() * W;
        const r = 30 + rnd() * 40;
        wrapDraw((dx, dy) => {
          g.fillStyle = "#e6dcb0";
          g.beginPath();
          g.ellipse(x + dx, y + dy, r + 7, r * 0.7 + 7, 0.4, 0, TAU);
          g.fill();
          g.fillStyle = "#5fb7e0";
          g.beginPath();
          g.ellipse(x + dx, y + dy, r, r * 0.7, 0.4, 0, TAU);
          g.fill();
        });
      }
      for (let i = 0; i < 30; i++) {
        const cx = rnd() * W;
        const cy = rnd() * W;
        const n = 8 + Math.floor(rnd() * 16);
        for (let k = 0; k < n; k++) {
          const x = cx + (rnd() - 0.5) * 90;
          const y = cy + (rnd() - 0.5) * 90;
          const r = 7 + rnd() * 7;
          wrapDraw((dx, dy) => {
            g.fillStyle = "rgba(40,80,40,0.35)";
            g.beginPath();
            g.arc(x + dx + 3, y + dy + 4, r, 0, TAU);
            g.fill();
            g.fillStyle = rnd() > 0.5 ? "#3f8a3e" : "#4f9a46";
            g.beginPath();
            g.arc(x + dx, y + dy, r, 0, TAU);
            g.fill();
            g.fillStyle = "rgba(255,255,255,0.18)";
            g.beginPath();
            g.arc(x + dx - r * 0.3, y + dy - r * 0.3, r * 0.45, 0, TAU);
            g.fill();
          });
        }
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      return t;
    })();
    const groundSize = [80, 130];
    worldTex.repeat.set(groundSize[0] / tile, groundSize[1] / tile);
    const ground = mesh(new THREE.PlaneGeometry(groundSize[0], groundSize[1]), mat(0xffffff, 0.95, { map: worldTex }), false);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const zoneTex = (() => {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      const g = c.getContext("2d");
      const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.7, "rgba(255,255,255,0.95)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    const zone = (grp, color, r = 2) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ color, map: zoneTex, transparent: true, roughness: 0.95, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.02;
      m.receiveShadow = true;
      grp.add(m);
      return m;
    };
    const put = (grp, m, x, y, z, s) => {
      m.position.set(x, y, z);
      if (s) typeof s === "number" ? m.scale.setScalar(s) : m.scale.set(s[0], s[1], s[2]);
      grp.add(m);
      return m;
    };
    const pine = (g, x, z, s, c = 0x2f6b3a, snow = false) => {
      put(g, mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 6), mat(0x6b4a30)), x, 0.1 * s, z, s);
      [0, 1, 2].forEach(k => {
        put(g, mesh(new THREE.ConeGeometry(0.22 - k * 0.05, 0.3, 7), mat(c, 0.8, { flatShading: true })), x, (0.25 + k * 0.17) * s, z, s);
        if (snow) put(g, mesh(new THREE.ConeGeometry(0.1 - k * 0.025, 0.13, 7), mat(0xf4f8fb)), x, (0.33 + k * 0.17) * s, z, s);
      });
    };
    const roundTree = (g, x, z, s, c = 0x4f9a46, tr = 0x6b4a30) => {
      put(g, mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 6), mat(tr)), x, 0.15 * s, z, s);
      put(g, mesh(new THREE.IcosahedronGeometry(0.24, 1), mat(c, 0.8, { flatShading: true })), x, 0.42 * s, z, s);
    };
    const stone = (g, x, z, s, c = 0x9a948a) => put(g, mesh(new THREE.DodecahedronGeometry(0.18, 0), mat(c, 0.9, { flatShading: true })), x, 0.08 * s, z, [s * 1.2, s * 0.7, s]);

    const THEMES = {
      snow(g, A) {
        zone(g, 0xf2f7fb, 2.1);
        [[0, -0.3, 1.0, 1.9], [-0.85, 0.25, 0.7, 1.3], [0.8, 0.35, 0.65, 1.15]].forEach(([x, z, r, hh]) => {
          put(g, mesh(new THREE.ConeGeometry(r, hh, 6), mat(0x8aa3b8, 0.9, { flatShading: true })), x, hh / 2, z);
          put(g, mesh(new THREE.ConeGeometry(r * 0.45, hh * 0.45, 6), mat(0xf6f9fc, 0.8, { flatShading: true })), x, hh - hh * 0.225 + 0.01, z);
        });
        for (let i = 0; i < 7; i++) pine(g, rr(-1.6, 1.6), rr(0.6, 1.4), rr(0.8, 1.2), 0x2c5f44, true);
      },
      darkwood(g, A) {
        zone(g, 0x2f3f33, 2.1);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU + rr(-0.2, 0.2);
          const r = rr(0.5, 1.6);
          roundTree(g, Math.cos(a) * r, Math.sin(a) * r * 0.8, rr(1.1, 1.7), i % 2 ? 0x2f2944 : 0x203a2c, 0x3a2a26);
        }
        const eyes = [];
        [[-0.3, 0.2], [0.5, -0.4], [0.1, 0.7]].forEach(([x, z]) => {
          [-0.05, 0.05].forEach(dx => eyes.push(put(g, mesh(new THREE.SphereGeometry(0.03, 8, 6), glow(0xfff066, 1.6), false), x + dx, 0.32, z)));
        });
        const fogM = new THREE.MeshBasicMaterial({ color: 0xc9b8e8, transparent: true, opacity: 0.3, depthWrite: false });
        const fogs = [0, 1, 2].map(k => put(g, new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), fogM), rr(-0.8, 0.8), 0.25 + k * 0.05, rr(-0.6, 0.6)));
        fogs.forEach(f => (f.rotation.x = -Math.PI / 2));
        A.push(t => {
          const on = Math.sin(t * 0.7) > -0.6;
          eyes.forEach(e => (e.visible = on));
          fogs.forEach((f, k) => (f.position.x = Math.sin(t * 0.3 + k * 2) * 0.8));
        });
      },
      volcano(g, A) {
        zone(g, 0x6a4636, 2.1);
        const prof = [[0.001, 1.5], [0.3, 1.5], [0.36, 1.42], [1.4, 0], [0.001, 0]].map(([x, y]) => new THREE.Vector2(x, y));
        put(g, mesh(new THREE.LatheGeometry(prof, 9), mat(0x6e4232, 0.9, { flatShading: true })), 0, 0, 0);
        const lava = put(g, mesh(new THREE.CircleGeometry(0.3, 20), glow(0xff4a12, 1.1), false), 0, 1.44, 0);
        lava.rotation.x = -Math.PI / 2;
        [0.6, 2.4, 4.3].forEach(a => {
          const pts = [];
          for (let i = 0; i <= 8; i++) {
            const f = i / 8;
            const r = lerp(0.34, 1.25, f);
            pts.push(new THREE.Vector3(Math.cos(a + Math.sin(f * 5) * 0.15) * r, lerp(1.43, 0.06, f) + 0.03, Math.sin(a + Math.sin(f * 5) * 0.15) * r));
          }
          put(g, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.028, 5), glow(0xff3a0a, 0.9)), 0, -0.012, 0);
        });
        const smoke = [0, 1, 2, 3].map(k => put(g, mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8a8580, transparent: true, opacity: 0.7, roughness: 1 }), false), 0, 1.6, 0));
        for (let i = 0; i < 5; i++) stone(g, rr(-1.6, 1.6), rr(0.9, 1.5), rr(0.8, 1.3), 0x4e3a32);
        A.push(t => {
          lava.material.emissiveIntensity = 0.9 + 0.3 * Math.sin(t * 3);
          smoke.forEach((s, k) => {
            const f = (t * 0.25 + k / 4) % 1;
            s.position.set(Math.sin(f * 4 + k) * 0.2, 1.6 + f * 1.4, -f * 0.4);
            s.scale.setScalar(0.6 + f * 1.4);
            s.material.opacity = 0.7 * (1 - f);
          });
        });
      },
      reef(g, A) {
        zone(g, 0xf1dfb0, 2.15);
        const water = put(g, mesh(new THREE.CircleGeometry(1.7, 40), mat(0x3fc0de, 0.2, { emissive: 0x0f5a7a, emissiveIntensity: 0.25 }), false), 0, 0.04, 0);
        water.rotation.x = -Math.PI / 2;
        const cols = [0xff7aa8, 0xff9a4a, 0xb06ad8, 0xffd25a];
        for (let i = 0; i < 9; i++) {
          const x = rr(-1.2, 1.2);
          const z = rr(-1.1, 1.1);
          const c = mat(cols[i % 4], 0.6);
          for (let k = 0; k < 4; k++) {
            const b = put(g, mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.4, 6), c), x, 0.2, z);
            b.rotation.set(rr(-0.6, 0.6), 0, rr(-0.6, 0.6));
            put(g, mesh(new THREE.SphereGeometry(0.06, 8, 6), c), x + Math.sin(b.rotation.z) * -0.2, 0.38, z + Math.sin(b.rotation.x) * 0.2);
          }
        }
        for (let i = 0; i < 4; i++) stone(g, rr(-1.3, 1.3), rr(-1.2, 1.2), 1, 0xc9b89a);
        A.push(t => (water.material.emissiveIntensity = 0.25 + 0.1 * Math.sin(t * 1.5)));
      },
      meadow(g, A) {
        zone(g, 0x9fdc72, 2.1);
        roundTree(g, 0, -0.2, 2.2, 0xf5a6c8);
        for (let i = 0; i < 5; i++) roundTree(g, rr(-1.5, 1.5), rr(-1.2, 1.2), rr(0.9, 1.3), 0x5bb04a);
        const fc = [0xffd84a, 0xffffff, 0xff8fb8, 0xb59cff, 0xff7a5a];
        for (let i = 0; i < 40; i++) {
          const a = rnd() * TAU;
          const r = rr(0.6, 1.8);
          put(g, mesh(new THREE.SphereGeometry(0.05, 6, 5), mat(fc[i % 5], 0.6), false), Math.cos(a) * r, 0.06, Math.sin(a) * r * 0.85);
        }
        const bugs = [0, 1, 2].map(() => put(g, mesh(new THREE.SphereGeometry(0.04, 6, 5), glow(0xfff2a0, 1), false), 0, 0.5, 0));
        A.push(t => bugs.forEach((b, k) => b.position.set(Math.sin(t * 0.8 + k * 2) * 1.1, 0.5 + Math.sin(t * 2 + k) * 0.15, Math.cos(t * 0.6 + k * 2) * 0.9)));
      },
      swamp(g, A) {
        zone(g, 0x52693e, 2.15);
        [[0, 0, 1.2], [-0.9, 0.7, 0.6], [0.9, -0.6, 0.55]].forEach(([x, z, r]) => {
          const w = put(g, mesh(new THREE.CircleGeometry(r, 28), mat(0x4e6e5e, 0.3, { emissive: 0x1d3a2c, emissiveIntensity: 0.3 }), false), x, 0.035, z);
          w.rotation.x = -Math.PI / 2;
        });
        for (let i = 0; i < 4; i++) {
          const x = rr(-1.5, 1.5);
          const z = rr(-1.3, 1.3);
          const tr = mat(0x5e5248, 0.95);
          put(g, mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.9, 6), tr), x, 0.45, z);
          [0, 1].forEach(k => {
            const b = put(g, mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.4, 5), tr), x + (k ? 0.12 : -0.1), 0.7, z);
            b.rotation.z = k ? -0.8 : 0.9;
          });
        }
        for (let i = 0; i < 6; i++) {
          const p = put(g, mesh(new THREE.CircleGeometry(0.1, 12, 0.4, TAU - 0.8), mat(0x6aa84f, 0.6, { side: THREE.DoubleSide }), false), rr(-0.9, 0.9), 0.045, rr(-0.8, 0.8));
          p.rotation.x = -Math.PI / 2;
        }
        const mist = new THREE.MeshBasicMaterial({ color: 0xc8a8e8, transparent: true, opacity: 0.28, depthWrite: false });
        const ms = [0, 1].map(k => put(g, new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), mist), 0, 0.3 + k * 0.1, 0));
        ms.forEach(m => (m.rotation.x = -Math.PI / 2));
        const bub = [0, 1, 2, 3].map(() => put(g, mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0xb6e07a, transparent: true, opacity: 0.8 }), false), 0, 0, 0));
        A.push(t => {
          ms.forEach((m, k) => (m.position.x = Math.sin(t * 0.25 + k * 3) * 0.6));
          bub.forEach((b, k) => {
            const f = (t * 0.5 + k / 4) % 1;
            b.position.set(Math.cos(k * 2) * 0.6, 0.05 + f * 0.25, Math.sin(k * 2) * 0.5);
            b.scale.setScalar(0.5 + f);
            b.material.opacity = 0.8 * (1 - f);
          });
        });
      },
      canyon(g) {
        zone(g, 0xe0a46a, 2.1);
        const cols = [0xc46a3a, 0xe09a5f, 0xb85a30, 0xd8834a];
        [[0, -0.2, 0.75, 1.1], [-1.0, 0.5, 0.5, 0.75], [0.95, 0.55, 0.55, 0.85], [0.3, 1.1, 0.35, 0.5]].forEach(([x, z, r, hh]) => {
          const n = 4;
          for (let k = 0; k < n; k++) put(g, mesh(new THREE.CylinderGeometry(r * (1 - k * 0.06), r * (1 - k * 0.06 + 0.06), hh / n, 7), mat(cols[k % 4], 0.9, { flatShading: true })), x, (hh / n) * (k + 0.5), z);
        });
        for (let i = 0; i < 3; i++) {
          const x = rr(-1.4, 1.4);
          const z = rr(-1.2, 1.2);
          const cm = mat(0x5f9a4a, 0.8);
          put(g, mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), cm), x, 0.17, z);
          const arm = put(g, mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 8), cm), x + 0.07, 0.22, z);
          arm.rotation.z = 0.3;
        }
      },
      storm(g, A) {
        zone(g, 0x8a979c, 2.1);
        put(g, mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.4, 9), mat(0x7f8a8e, 0.9, { flatShading: true })), 0, 0.2, 0);
        for (let i = 0; i < 5; i++) stone(g, rr(-1.2, 1.2), rr(-1, 1), rr(1, 1.6), 0x6d7478);
        const cm = mat(0x58606e, 0.95);
        const cloud = new THREE.Group();
        [[0, 0, 0, 0.55], [0.5, -0.05, 0.1, 0.42], [-0.5, -0.05, -0.05, 0.45], [0.2, 0.15, -0.2, 0.4]].forEach(([x, y, z, r]) => put(cloud, mesh(new THREE.SphereGeometry(r, 14, 10), cm), x, y, z));
        put(g, cloud, 0, 2.2, 0);
        const pts = [[0, 1.9, 0], [0.15, 1.5, 0.05], [-0.05, 1.3, 0], [0.12, 0.85, 0.05], [-0.02, 0.6, 0], [0.08, 0.4, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
        const bolt = put(g, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0), 24, 0.04, 5), glow(0xfff066, 2)), 0, 0, 0);
        A.push(t => {
          const k = (t * 0.6) % 1;
          bolt.visible = k < 0.08 || (k > 0.14 && k < 0.18);
          cloud.position.x = Math.sin(t * 0.3) * 0.2;
          bolt.position.x = cloud.position.x;
        });
      },
      temple(g, A) {
        zone(g, 0xd8cdb2, 2.1);
        const isl = new THREE.Group();
        put(isl, mesh(new THREE.CylinderGeometry(1.0, 0.3, 0.7, 8), mat(0x9c8e78, 0.9, { flatShading: true })), 0, -0.3, 0);
        put(isl, mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.08, 8), mat(0xe8ddc4, 0.8)), 0, 0.04, 0);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          put(isl, mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.6, 8), mat(0xf2ead8, 0.7)), Math.cos(a) * 0.65, 0.38, Math.sin(a) * 0.65);
        }
        put(isl, mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 8), mat(0xc85a7a, 0.7)), 0, 0.72, 0);
        put(isl, mesh(new THREE.ConeGeometry(0.85, 0.4, 8), mat(0xd86a8a, 0.7, { flatShading: true })), 0, 0.96, 0);
        const orb = put(isl, mesh(new THREE.IcosahedronGeometry(0.16, 1), glow(0xff6aa8, 1.6), false), 0, 0.35, 0);
        put(g, isl, 0, 1.0, 0);
        const rocks = [0, 1, 2].map(k => put(g, mesh(new THREE.DodecahedronGeometry(0.16, 0), mat(0x9c8e78, 0.9, { flatShading: true })), 0, 0, 0));
        A.push(t => {
          isl.position.y = 1.0 + Math.sin(t * 0.8) * 0.08;
          orb.rotation.y = t;
          orb.material.emissiveIntensity = 1.4 + 0.4 * Math.sin(t * 2);
          rocks.forEach((r, k) => r.position.set(Math.cos(t * 0.3 + k * 2.1) * 1.4, 0.7 + Math.sin(t + k) * 0.15, Math.sin(t * 0.3 + k * 2.1) * 1.2));
        });
      },
      graveyard(g, A) {
        zone(g, 0x3f4c41, 2.1);
        const sm = mat(0x9aa0a6, 0.9);
        for (let i = 0; i < 9; i++) {
          const x = -1.2 + (i % 3) * 1.1 + rr(-0.15, 0.15);
          const z = -0.9 + Math.floor(i / 3) * 0.8 + rr(-0.1, 0.1);
          if (Math.abs(x) < 0.35 && Math.abs(z + 0.1) < 0.4) continue;
          put(g, mesh(new THREE.BoxGeometry(0.22, 0.3, 0.07), sm), x, 0.15, z);
          put(g, mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 12, 1, false, 0, Math.PI), sm), x, 0.3, z).rotation.set(Math.PI / 2, 0, Math.PI / 2);
        }
        put(g, mesh(new THREE.BoxGeometry(0.55, 0.5, 0.5), mat(0x7a6e66, 0.9)), 0, 0.25, -0.1);
        put(g, mesh(new THREE.ConeGeometry(0.45, 0.4, 4), mat(0x4a3f48, 0.8, { flatShading: true })), 0, 0.7, -0.1).rotation.y = Math.PI / 4;
        const flames = [];
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          const x = Math.cos(a) * 1.55;
          const z = Math.sin(a) * 1.3;
          put(g, mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8), mat(0xf4ecd8, 0.6)), x, 0.09, z);
          flames.push(put(g, mesh(new THREE.ConeGeometry(0.035, 0.1, 8), glow(0xffc04a, 2), false), x, 0.23, z));
        }
        A.push(t => flames.forEach((f, k) => f.scale.set(1, 0.8 + 0.3 * Math.sin(t * 9 + k * 1.7), 1)));
      },
      mines(g, A) {
        zone(g, 0x8a7a68, 2.1);
        put(g, mesh(new THREE.DodecahedronGeometry(1.0, 1), mat(0x7a6d60, 0.95, { flatShading: true })), 0, 0.2, -0.4, [1.3, 0.75, 1]);
        const door = put(g, mesh(new THREE.CircleGeometry(0.32, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x15100c })), 0, 0.12, 0.42);
        door.rotation.x = -0.25;
        put(g, mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 16, Math.PI), mat(0x8a5a32)), 0, 0.12, 0.43);
        [-0.12, 0.12].forEach(x => put(g, mesh(new THREE.BoxGeometry(0.03, 0.03, 1.3), mat(0x9aa0a8, 0.4, { metalness: 0.6 })), x, 0.03, 1.05));
        for (let k = 0; k < 8; k++) put(g, mesh(new THREE.BoxGeometry(0.36, 0.02, 0.06), mat(0x6b4a30)), 0, 0.015, 0.5 + k * 0.17);
        put(g, mesh(new THREE.BoxGeometry(0.34, 0.2, 0.3), mat(0x5a4a3e, 0.6, { metalness: 0.4 })), 0, 0.14, 1.1);
        const ore = [];
        for (let i = 0; i < 7; i++) ore.push(put(g, mesh(new THREE.OctahedronGeometry(0.12, 0), mat(i % 2 ? 0xbfc8d4 : 0x8fb0d8, 0.25, { metalness: 0.8, emissive: 0x334455, emissiveIntensity: 0.3 })), rr(-1.5, 1.5), 0.12, rr(0.2, 1.5), [1, 1.6, 1]));
        A.push(t => ore.forEach((m, k) => (m.rotation.y = t * 0.5 + k)));
      },
      dragon(g, A) {
        zone(g, 0x6b4a3a, 2.1);
        const prof = [[0.001, 1.8], [0.25, 1.75], [0.45, 1.2], [0.6, 0.6], [1.0, 0], [0.001, 0]].map(([x, y]) => new THREE.Vector2(x, y));
        put(g, mesh(new THREE.LatheGeometry(prof, 7), mat(0x6a5246, 0.95, { flatShading: true })), 0, 0, 0);
        put(g, mesh(new THREE.TorusGeometry(0.32, 0.1, 8, 20), mat(0x8a6a40, 0.95)), 0, 1.82, 0).rotation.x = Math.PI / 2;
        const egg = put(g, mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xd8503a, 0.5, { emissive: 0x7a1a0a, emissiveIntensity: 0.4 })), 0, 2.0, 0, [1, 1.3, 1]);
        for (let i = 0; i < 6; i++) {
          const b = put(g, mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), mat(0xf0e8d8, 0.7)), rr(-1.5, 1.5), 0.04, rr(-1.3, 1.4));
          b.rotation.set(Math.PI / 2, 0, rr(0, 3));
        }
        for (let i = 0; i < 4; i++) stone(g, rr(-1.6, 1.6), rr(-1.3, 1.4), rr(0.8, 1.2), 0x5a463e);
        A.push(t => {
          egg.rotation.z = Math.sin(t * 3) * 0.08 * Math.max(0, Math.sin(t * 0.7));
          egg.material.emissiveIntensity = 0.4 + 0.3 * Math.max(0, Math.sin(t * 1.3));
        });
      },
      ruins(g, A) {
        zone(g, 0x5c5560, 2.1);
        const sm = mat(0x8a8290, 0.9, { flatShading: true });
        [[-0.9, -0.6, 0.9], [-0.3, -0.7, 0.5], [0.4, -0.6, 1.1], [1.0, -0.4, 0.35], [-1.1, 0.4, 0.6], [1.1, 0.6, 0.75]].forEach(([x, z, hh]) => {
          put(g, mesh(new THREE.CylinderGeometry(0.12, 0.13, hh, 8), sm), x, hh / 2, z);
          put(g, mesh(new THREE.BoxGeometry(0.3, 0.06, 0.3), sm), x, hh + 0.03, z);
        });
        for (let i = 0; i < 5; i++) put(g, mesh(new THREE.BoxGeometry(0.35, 0.2, 0.2), sm), rr(-1.3, 1.3), 0.1, rr(-0.2, 1.3)).rotation.y = rr(0, 3);
        const rune = put(g, mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 40), glow(0xa46cff, 1.5), false), 0, 0.05, 0.2);
        rune.rotation.x = -Math.PI / 2;
        const rune2 = put(g, mesh(new THREE.TorusGeometry(0.32, 0.02, 6, 6), glow(0xa46cff, 1.5), false), 0, 0.06, 0.2);
        rune2.rotation.x = -Math.PI / 2;
        A.push(t => {
          rune.material.emissiveIntensity = 1.2 + 0.5 * Math.sin(t * 2);
          rune2.rotation.z = t * 0.5;
        });
      },
      crystal(g, A) {
        zone(g, 0xc8b8e2, 2.1);
        const cols = [0xff8ad8, 0x8ae8ff, 0xb48aff, 0xffd08a];
        const cs = [];
        for (let i = 0; i < 12; i++) {
          const a = rnd() * TAU;
          const r = i < 3 ? rr(0, 0.5) : rr(0.6, 1.6);
          const s = i < 3 ? rr(1.6, 2.2) : rr(0.7, 1.2);
          const m = put(g, mesh(new THREE.OctahedronGeometry(0.2, 0), mat(cols[i % 4], 0.15, { emissive: cols[i % 4], emissiveIntensity: 0.35, transparent: true, opacity: 0.9, flatShading: true })), Math.cos(a) * r, 0.3 * s, Math.sin(a) * r * 0.85, [s * 0.7, s * 1.6, s * 0.7]);
          m.rotation.set(rr(-0.3, 0.3), rr(0, 3), rr(-0.3, 0.3));
          cs.push(m);
        }
        A.push(t => cs.forEach((m, k) => (m.material.emissiveIntensity = 0.3 + 0.25 * Math.max(0, Math.sin(t * 1.5 + k)))));
      }
    };
    const lerp = (a, b, k) => a + (b - a) * k;

    const ship = new THREE.Group();
    {
      const body = root.Ship ? root.Ship.build(THREE, { gx: 0.46, gz: 0.84, s: 0.13, deckY: 0, depth: 0.5 }) : new THREE.Group();
      ship.add(body);
      ship.userData.body = body;
      const grass = mesh(new THREE.CircleGeometry(1, 40), mat(0x6fb552, 0.9), false);
      grass.rotation.x = -Math.PI / 2;
      grass.scale.set(0.42, 0.8, 1);
      grass.position.set(0, 0.012, 0);
      ship.add(grass);
      const pond = mesh(new THREE.CircleGeometry(0.11, 18), mat(0x5cc6d9, 0.2), false);
      pond.rotation.x = -Math.PI / 2;
      pond.position.set(0.14, 0.02, -0.36);
      ship.add(pond);
      const house = mesh(new THREE.BoxGeometry(0.17, 0.12, 0.14), mat(0xe9c48c));
      house.position.set(-0.15, 0.07, -0.54);
      ship.add(house);
      const roof = mesh(new THREE.ConeGeometry(0.15, 0.11, 4), mat(0xc4543e, 0.7, { flatShading: true }));
      roof.rotation.y = Math.PI / 4;
      roof.position.set(-0.15, 0.18, -0.54);
      ship.add(roof);
      [[-0.12, 0.17, 0x4f9a46], [0.18, 0.32, 0x5bb04a], [0.05, 0.57, 0x4f9a46]].forEach(([x, z, c]) => {
        const tr = mesh(new THREE.IcosahedronGeometry(0.07, 1), mat(c, 0.8, { flatShading: true }));
        tr.position.set(x, 0.07, z);
        ship.add(tr);
      });
      const fence = mesh(new THREE.TorusGeometry(1, 0.01, 4, 48), mat(0x9a6a42));
      fence.rotation.x = Math.PI / 2;
      fence.scale.set(0.43, 0.81, 1);
      fence.position.set(0, 0.05, 0);
      ship.add(fence);
      ship.scale.setScalar(1.3);
      scene.add(ship);
    }

    const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.88 });
    const clouds = Array.from({ length: 11 }, (_, i) => {
      const c = new THREE.Group();
      const n = 3 + (i % 3);
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(rr(0.6, 1.0), 14, 10), cloudM);
        m.position.set(rr(-1.2, 1.2), rr(-0.15, 0.25), rr(-0.6, 0.6));
        m.scale.y = 0.55;
        c.add(m);
      }
      c.position.set(rr(-9, 9), rr(2.5, 8), rr(-16, 16));
      c.userData.v = rr(0.6, 1.2);
      scene.add(c);
      return c;
    });

    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const tmp = new THREE.Vector3();
    const onGround = (nx, ny, y = 0) => {
      ray.setFromCamera({ x: nx, y: ny }, camera);
      plane.constant = -y;
      const out = new THREE.Vector3();
      return ray.ray.intersectPlane(plane, out) ? out : new THREE.Vector3(0, y, 0);
    };

    const spots = new Map();
    let selected = null;
    const fmt = ms => {
      const m = Math.max(0, Math.round(ms / 60000));
      const hh = Math.floor(m / 60);
      return hh ? hh + " h " + String(m % 60).padStart(2, "0") + " min" : m + " min";
    };
    const typeName = t => (Types && Types.INFO[t] ? Types.INFO[t].name : t);
    const typeColor = t => (Types && Types.INFO[t] ? Types.INFO[t].color : "#999");
    const makeTag = sp => {
      const b = h("button", "mp-tag");
      b.type = "button";
      const dots = h("span", "mp-dots");
      sp.region.types.forEach(t => {
        const d = h("i", "mp-dot");
        d.style.background = typeColor(t);
        d.innerHTML = icon(t, 14, 2.4);
        dots.append(d);
      });
      b.append(dots, h("span", "mp-tag-name", sp.region.name));
      b.addEventListener("click", e => {
        e.stopPropagation();
        select(sp.k);
      });
      tagLayer.append(b);
      return b;
    };
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.06, 6, 64), new THREE.MeshBasicMaterial({ color: 0xffcd3c, transparent: true, opacity: 0.9 }));
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    scene.add(ring);

    function build(sp) {
      sd = 1000 + sp.k * 17;
      const g = new THREE.Group();
      const anim = [];
      (THEMES[sp.region.theme] || THEMES.meadow)(g, anim);
      g.rotation.y = (sp.sway - 0.5) * 0.6;
      scene.add(g);
      return { k: sp.k, region: sp.region, g, anim, tag: makeTag(sp), p: sp.p, x: sp.x };
    }

    function select(k) {
      selected = k;
      const e = spots.get(k);
      if (!e) {
        card.hidden = true;
        return;
      }
      cardName.textContent = e.region.name;
      cardTypes.replaceChildren(
        ...e.region.types.map(t => {
          const s = h("span", "type-tag", typeName(t));
          s.style.background = typeColor(t);
          const n = parseInt(typeColor(t).slice(1), 16);
          const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
          s.style.color = lum > 0.62 ? "#1f2a24" : "#ffffff";
          return s;
        })
      );
      cardInfo.textContent = "Criaturas desses tipos aparecem mais aqui. Sai do mapa em " + fmt((1 - e.p) * R.SHOWN * R.SLOT) + ".";
      card.hidden = false;
      spots.forEach(s => s.tag.classList.toggle("on", s.k === k));
    }

    fightBtn.addEventListener("click", () => {
      const e = spots.get(selected);
      if (!e || !R.isOpen(e.region.id)) return;
      if (o.onFight) o.onFight(e.region.id);
    });
    backBtn.addEventListener("click", () => o.onClose && o.onClose());
    canvas.addEventListener("click", ev => {
      const r = canvas.getBoundingClientRect();
      const nx = ((ev.clientX - r.left) / r.width) * 2 - 1;
      const ny = -((ev.clientY - r.top) / r.height) * 2 + 1;
      const p = onGround(nx, ny);
      let best = null;
      let bd = 2.6;
      spots.forEach(e => {
        const d = Math.hypot(e.g.position.x - p.x, e.g.position.z - p.z);
        if (d < bd) {
          bd = d;
          best = e.k;
        }
      });
      if (best !== null) select(best);
      else {
        selected = null;
        card.hidden = true;
        spots.forEach(s => s.tag.classList.remove("on"));
      }
    });

    let W = 1;
    let H = 1;
    const resize = () => {
      const r = view.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      const narrow = W / H < 0.75;
      camera.position.set(0, narrow ? 24 : 20, narrow ? 13 : 11);
      camera.lookAt(0, 0, 0.8);
      camera.updateProjectionMatrix();
    };
    const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(view);

    const clock = new THREE.Clock();
    let raf = 0;
    let running = false;
    const frame = () => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const t = clock.getElapsedTime();
      const now = Date.now();
      const vis = R.visible(now);
      const keep = new Set(vis.map(v => v.k));
      spots.forEach((e, k) => {
        if (!keep.has(k)) {
          scene.remove(e.g);
          e.tag.remove();
          spots.delete(k);
          if (selected === k) {
            selected = null;
            card.hidden = true;
          }
        }
      });
      const narrow = W / H < 0.75;
      vis.forEach(v => {
        let e = spots.get(v.k);
        if (!e) {
          e = build(v);
          spots.set(v.k, e);
        }
        e.p = v.p;
        const ny = lerp(1.12, -1.12, v.p);
        const nx = v.x * (narrow ? 1 : 0.62);
        const pos = onGround(nx, ny);
        e.g.position.copy(pos);
        const sc = narrow ? Math.min(1.2, (W / H) * 1.9) : 1.2;
        e.g.scale.setScalar(sc);
        e.anim.forEach(f => f(t));
        tmp.copy(pos).add(new THREE.Vector3(0, 2.4 * sc, 0)).project(camera);
        const sx = (tmp.x * 0.5 + 0.5) * W;
        const sy = (-tmp.y * 0.5 + 0.5) * H;
        e.tag.style.transform = "translate(" + Math.round(sx) + "px," + Math.round(sy) + "px) translate(-50%, -100%)";
        e.tag.hidden = sy < 30 || sy > H - 10;
        if (selected === v.k) {
          ring.visible = true;
          ring.position.set(pos.x, 0.05, pos.z);
          ring.scale.setScalar(sc * (1 + 0.04 * Math.sin(t * 4)));
        }
      });
      if (selected === null || !spots.has(selected)) ring.visible = false;
      const sp = onGround(0, -0.05, 5);
      ship.position.set(sp.x, 5 + Math.sin(t * 1.2) * 0.12, sp.z);
      ship.rotation.set(Math.sin(t * 0.9) * 0.03, 0, Math.sin(t * 0.7) * 0.05);
      if (ship.userData.body.userData.tick) ship.userData.body.userData.tick(t, reduce ? 0.2 : 1);
      const dz = (now / (R.SHOWN * R.SLOT)) * 30;
      worldTex.offset.y = -(dz / tile) % 1;
      const lim = 18;
      clouds.forEach(c => {
        c.position.z += c.userData.v * (reduce ? 0.004 : 0.02);
        if (c.position.z > lim) {
          c.position.z = -lim;
          c.position.x = rr(-9, 9);
        }
      });
      if (selected !== null && spots.has(selected) && !card.hidden) {
        const e = spots.get(selected);
        cardInfo.textContent = "Criaturas desses tipos aparecem mais aqui. Sai do mapa em " + fmt((1 - e.p) * R.SHOWN * R.SLOT) + ".";
      }
      renderer.render(scene, camera);
    };

    return {
      open() {
        resize();
        running = true;
        cancelAnimationFrame(raf);
        frame();
      },
      close() {
        running = false;
        cancelAnimationFrame(raf);
        selected = null;
        card.hidden = true;
        spots.forEach(s => s.tag.classList.remove("on"));
      },
      resize
    };
  }
  root.MapView = { mount };
})(window);
