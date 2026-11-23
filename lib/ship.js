(function (root) {
  const TAU = Math.PI * 2;

  function outline(hw, hl, bow = 0.62, n = 96) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const e = 2 / 2.6;
      let x = hw * Math.sign(c) * Math.pow(Math.abs(c), e);
      let z = hl * Math.sign(s) * Math.pow(Math.abs(s), e);
      if (z < 0) {
        const f = -z / hl;
        x *= 1 - bow * Math.pow(f, 2.4);
        z *= 1 + 0.22 * Math.pow(f, 3);
      }
      pts.push([x, z]);
    }
    return pts;
  }

  function planks(THREE, light) {
    if (typeof document === "undefined") return null;
    const W = 256;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = W;
    const g = c.getContext("2d");
    let sd = 3;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const base = light ? [196, 150, 98] : [150, 98, 60];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const k = 0.85 + rnd() * 0.25;
      g.fillStyle = "rgb(" + base.map(v => Math.round(v * k)).join(",") + ")";
      g.fillRect((i * W) / n, 0, W / n, W);
      for (let j = 0; j < 14; j++) {
        g.strokeStyle = "rgba(60,36,18," + (0.08 + rnd() * 0.12) + ")";
        g.lineWidth = 1;
        g.beginPath();
        const x = (i * W) / n + rnd() * (W / n);
        g.moveTo(x, 0);
        g.bezierCurveTo(x + rnd() * 4 - 2, W * 0.3, x + rnd() * 4 - 2, W * 0.7, x + rnd() * 3 - 1.5, W);
        g.stroke();
      }
      const cut = rnd() * W;
      g.fillStyle = "rgba(50,30,15,0.55)";
      g.fillRect((i * W) / n, cut, W / n, 2);
      g.fillStyle = "rgba(50,30,15,0.65)";
      g.fillRect((i * W) / n, 0, 2, W);
      [cut + 6, cut - 6].forEach(y => {
        g.fillStyle = "rgba(40,30,20,0.6)";
        g.beginPath();
        g.arc((i * W) / n + 6, y, 1.6, 0, TAU);
        g.arc(((i + 1) * W) / n - 6, y, 1.6, 0, TAU);
        g.fill();
      });
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }

  function sailTex(THREE, base, band) {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = base;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = band;
    g.fillRect(0, 50, 128, 26);
    g.fillStyle = "rgba(0,0,0,0.06)";
    for (let x = 0; x < 128; x += 16) g.fillRect(x, 0, 2, 128);
    g.strokeStyle = "rgba(120,80,40,0.5)";
    g.lineWidth = 4;
    g.strokeRect(2, 2, 124, 124);
    return new THREE.CanvasTexture(c);
  }

  function build(THREE, o = {}) {
    const hw = o.hw || 1;
    const hl = o.hl || 2;
    const depth = o.depth || hw * 0.9;
    const scaleTex = o.texScale || 1;
    const grp = new THREE.Group();
    const mat = (c, r = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
    const mesh = (g, m, cast = true) => {
      const x = new THREE.Mesh(g, m);
      x.castShadow = cast;
      x.receiveShadow = true;
      return x;
    };
    const out = outline(hw, hl, o.bow);
    const N = out.length;

    const deckTex = planks(THREE, true);
    if (deckTex) deckTex.repeat.set(scaleTex, scaleTex);
    const shape = new THREE.Shape();
    out.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
    const dg = new THREE.ShapeGeometry(shape, 1);
    dg.rotateX(-Math.PI / 2);
    {
      const p = dg.attributes.position;
      const uv = dg.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2.2, p.getZ(i) / 2.2);
    }
    const deck = mesh(dg, mat(0xffffff, 0.85, { map: deckTex }), false);
    deck.position.y = o.deckY || 0;
    grp.add(deck);

    const rings = 9;
    const pos = [];
    const col = [];
    const idx = [];
    const cTrim = new THREE.Color(0xd9a25a);
    const cUp = new THREE.Color(o.hullColor || 0x9a3b2a);
    const cLow = new THREE.Color(0x5a3a26);
    const cStripe = new THREE.Color(0xe8c070);
    const tc = new THREE.Color();
    for (let r = 0; r <= rings; r++) {
      const t = r / rings;
      const s = 1 - 0.12 * t - 0.5 * t * t;
      const y = (o.deckY || 0) + 0.05 - depth * t;
      for (let i = 0; i <= N; i++) {
        const [x, z] = out[i % N];
        pos.push(x * s, y, z * (s * 0.3 + 0.7 * (1 - 0.35 * t * t)));
        if (t < 0.08) tc.copy(cTrim);
        else if (Math.abs(t - 0.34) < 0.045) tc.copy(cStripe);
        else if (t < 0.5) tc.copy(cUp);
        else tc.copy(cUp).lerp(cLow, Math.min(1, (t - 0.5) * 2.5));
        col.push(tc.r, tc.g, tc.b);
      }
    }
    for (let r = 0; r < rings; r++)
      for (let i = 0; i < N; i++) {
        const a = r * (N + 1) + i;
        const b = a + N + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const ci = pos.length / 3;
    pos.push(0, (o.deckY || 0) + 0.05 - depth * 1.05, 0);
    col.push(cLow.r, cLow.g, cLow.b);
    const last = rings * (N + 1);
    for (let i = 0; i < N; i++) idx.push(last + i, ci, last + i + 1);
    const hg = new THREE.BufferGeometry();
    hg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    hg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    hg.setIndex(idx);
    hg.computeVertexNormals();
    const hull = mesh(hg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }));
    grp.add(hull);

    const railH = o.railH || hw * 0.12;
    const rail = new THREE.CatmullRomCurve3(out.map(([x, z]) => new THREE.Vector3(x * 0.985, (o.deckY || 0) + railH, z * 0.985)), true);
    grp.add(mesh(new THREE.TubeGeometry(rail, N * 2, hw * 0.022, 6, true), mat(0xd9a25a, 0.6)));
    const wall = new THREE.CatmullRomCurve3(out.map(([x, z]) => new THREE.Vector3(x, (o.deckY || 0) + railH * 0.45, z)), true);
    const wm = mesh(new THREE.TubeGeometry(wall, N * 2, railH * 0.5, 6, true), mat(o.hullColor || 0x9a3b2a, 0.7));
    wm.scale.y = 1;
    grp.add(wm);
    const postG = new THREE.CylinderGeometry(hw * 0.014, hw * 0.014, railH, 6);
    const postM = mat(0xb07a46, 0.7);
    for (let i = 0; i < N; i += o.postStep || 3) {
      const [x, z] = out[i];
      const pm = mesh(postG, postM);
      pm.position.set(x * 0.985, (o.deckY || 0) + railH * 0.5, z * 0.985);
      grp.add(pm);
    }

    const sm = tex => new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.8, side: THREE.DoubleSide });
    const sailM = sm(sailTex(THREE, "#f4ecd8", o.band || "#c4543e"));
    const wingM = sm(sailTex(THREE, "#efe4cc", o.band || "#c4543e"));
    const wood = mat(0x6b4a30, 0.8);
    const masts = [];
    (o.masts || [[0, -hl * 0.72, hw * 1.4]]).forEach(([mx, mz, mh]) => {
      const m = new THREE.Group();
      m.position.set(mx, o.deckY || 0, mz);
      m.add(mesh(new THREE.CylinderGeometry(hw * 0.03, hw * 0.04, mh, 8), wood));
      m.children[0].position.y = mh / 2;
      [0.72, 0.42].forEach((f, k) => {
        const w = hw * (0.9 - k * 0.2) * (o.sailW || 1);
        const hh = mh * 0.26;
        const g = new THREE.PlaneGeometry(w, hh, 8, 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, -hh * 0.35 * (1 - Math.pow(p.getX(i) / (w / 2), 2)));
        g.computeVertexNormals();
        const s = mesh(g, sailM);
        s.position.set(0, mh * f, hw * 0.02);
        m.add(s);
        const yard = mesh(new THREE.CylinderGeometry(hw * 0.015, hw * 0.015, w * 1.08, 6), wood);
        yard.rotation.z = Math.PI / 2;
        yard.position.set(0, mh * f + hh / 2, 0);
        m.add(yard);
      });
      const flag = mesh(new THREE.PlaneGeometry(hw * 0.3, hw * 0.14, 6, 1), mat(o.flag || 0xc4543e, 0.7, { side: THREE.DoubleSide }), false);
      flag.position.set(hw * 0.15, mh + hw * 0.06, 0);
      m.add(flag);
      m.userData.flag = flag;
      grp.add(m);
      masts.push(m);
    });

    const wings = [-1, 1].map(sg => {
      const w = new THREE.Group();
      const L = hw * (o.wingL || 1.7);
      const ribs = 5;
      const tips = [];
      for (let k = 0; k < ribs; k++) {
        const a = -0.55 + (k / (ribs - 1)) * 1.1;
        tips.push([Math.cos(a) * L * (1 - 0.15 * Math.abs(a)), Math.sin(a) * L * 0.75]);
      }
      const sh = new THREE.Shape();
      sh.moveTo(0, -hl * 0.08);
      tips.forEach(([x, z], k) => {
        if (k === 0) sh.lineTo(x, z);
        else {
          const [px, pz] = tips[k - 1];
          sh.quadraticCurveTo((x + px) / 2 * 0.86, (z + pz) / 2 * 0.86, x, z);
        }
      });
      sh.lineTo(0, hl * 0.08);
      sh.lineTo(0, -hl * 0.08);
      const lift = x => (x / L) * (x / L) * L * 0.12;
      const g = new THREE.ShapeGeometry(sh, 8);
      {
        const p = g.attributes.position;
        const uv = g.attributes.uv;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          uv.setXY(i, x / L, (p.getY(i) / (L * 0.75)) * 0.5 + 0.5);
          p.setZ(i, lift(x));
        }
        g.rotateX(-Math.PI / 2);
        g.computeVertexNormals();
      }
      w.add(mesh(g, wingM));
      tips.forEach(([x, z]) => {
        const pts = [0, 0.5, 1].map(f => new THREE.Vector3(x * f, lift(x * f) + hw * 0.01, -z * f));
        w.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, hw * 0.018, 5), wood));
      });
      const hub = mesh(new THREE.SphereGeometry(hw * 0.07, 10, 8), mat(0xd9a25a, 0.5, { metalness: 0.3 }));
      w.add(hub);
      w.position.set(sg * hw * 0.97, (o.deckY || 0) + railH, hl * (o.wingZ || 0.05));
      w.scale.set(sg, 1, 1);
      w.rotation.z = sg * 0.18;
      grp.add(w);
      return w;
    });

    const props = [-1, 1].map(sg => {
      const pg = new THREE.Group();
      const r = hw * (o.propR || 0.32);
      const hubM = mat(0xd9a25a, 0.45, { metalness: 0.5 });
      pg.add(mesh(new THREE.SphereGeometry(r * 0.22, 12, 10), hubM));
      for (let k = 0; k < 4; k++) {
        const arm = new THREE.Group();
        arm.rotation.z = (k / 4) * TAU;
        const b = mesh(new THREE.SphereGeometry(1, 12, 8), mat(0xc9b08a, 0.6));
        b.scale.set(r * 0.22, r * 0.55, r * 0.06);
        b.position.y = r * 0.55;
        b.rotation.y = 0.5;
        arm.add(b);
        pg.add(arm);
      }
      const holder = new THREE.Group();
      holder.add(pg);
      const strut = mesh(new THREE.CylinderGeometry(hw * 0.03, hw * 0.03, r * 1.4, 6), mat(0x6b4a30));
      strut.rotation.x = Math.PI / 2;
      strut.position.z = -r * 0.7;
      holder.add(strut);
      holder.position.set(sg * hw * 0.55, (o.deckY || 0) - depth * (o.propY || 0.3), hl * (o.propZ || 1.0));
      grp.add(holder);
      return pg;
    });

    grp.userData = { wings, props, masts, outline: out };
    grp.userData.tick = (t, k = 1) => {
      props.forEach((p, i) => (p.rotation.z = t * 12 * k * (i ? 1 : -1)));
      wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * -(0.18 + Math.sin(t * 1.4) * 0.05)));
      masts.forEach(m => {
        const f = m.userData.flag;
        f.rotation.y = Math.sin(t * 3) * 0.25;
      });
    };
    return grp;
  }

  root.Ship = { build, outline };
})(window);
