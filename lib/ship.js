(function (root) {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function cnv(w, h) {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function toTex(THREE, c, wrapS, wrapT) {
    if (!c) return null;
    const t = new THREE.CanvasTexture(c);
    t.wrapS = wrapS ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.wrapT = wrapT ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.anisotropy = 4;
    return t;
  }

  function rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  function deckTex(THREE) {
    const W = 512;
    const c = cnv(W, W);
    if (!c) return null;
    const g = c.getContext("2d");
    const rnd = rng(7);
    const n = 10;
    const pw = W / n;
    for (let i = 0; i < n; i++) {
      let y = -rnd() * W;
      while (y < W) {
        const len = W * (0.45 + rnd() * 0.5);
        const k = 0.86 + rnd() * 0.2;
        g.fillStyle = "rgb(" + [196, 152, 102].map(v => Math.round(v * k)).join(",") + ")";
        g.fillRect(i * pw, y, pw, len);
        for (let j = 0; j < 9; j++) {
          g.strokeStyle = "rgba(90,56,28," + (0.06 + rnd() * 0.1) + ")";
          g.lineWidth = 1 + rnd();
          g.beginPath();
          const x = i * pw + 3 + rnd() * (pw - 6);
          g.moveTo(x, y);
          g.bezierCurveTo(x + rnd() * 3 - 1.5, y + len * 0.3, x + rnd() * 3 - 1.5, y + len * 0.7, x + rnd() * 2 - 1, y + len);
          g.stroke();
        }
        g.fillStyle = "rgba(58,34,16,0.7)";
        g.fillRect(i * pw, y, pw, 2);
        g.fillStyle = "rgba(40,26,14,0.55)";
        [5, -5].forEach(d => {
          g.beginPath();
          g.arc(i * pw + 6, y + (d > 0 ? d : len + d), 1.7, 0, TAU);
          g.arc((i + 1) * pw - 6, y + (d > 0 ? d : len + d), 1.7, 0, TAU);
          g.fill();
        });
        y += len;
      }
      g.fillStyle = "rgba(52,32,16,0.75)";
      g.fillRect(i * pw, 0, 2.5, W);
    }
    return toTex(THREE, c, true, true);
  }

  const BAND = { top: 0.05, g1: 0.066, paint: 0.2, g2: 0.215, plank: 0.66, line: 0.675 };

  function hullTex(THREE) {
    const W = 1024;
    const H = 512;
    const c = cnv(W, H);
    const e = cnv(W, H);
    if (!c) return {};
    const g = c.getContext("2d");
    const ge = e.getContext("2d");
    ge.fillStyle = "#000";
    ge.fillRect(0, 0, W, H);
    const rnd = rng(11);
    const Y = f => Math.round(f * H);
    let y = Y(BAND.g2);
    while (y < Y(BAND.plank)) {
      const rh = 15;
      let x = -rnd() * 200;
      while (x < W) {
        const len = 150 + rnd() * 160;
        const k = 0.85 + rnd() * 0.22;
        g.fillStyle = "rgb(" + [124, 76, 44].map(v => Math.round(v * k)).join(",") + ")";
        g.fillRect(x, y, len, rh);
        for (let j = 0; j < 4; j++) {
          g.fillStyle = "rgba(60,32,14," + (0.08 + rnd() * 0.1) + ")";
          g.fillRect(x, y + 2 + rnd() * (rh - 4), len, 1);
        }
        g.fillStyle = "rgba(38,20,8,0.7)";
        g.fillRect(x, y, 2, rh);
        x += len;
      }
      g.fillStyle = "rgba(34,18,8,0.75)";
      g.fillRect(0, y + rh - 2, W, 2);
      g.fillStyle = "rgba(255,220,170,0.08)";
      g.fillRect(0, y, W, 2);
      y += rh;
    }
    g.fillStyle = "#4b2c17";
    g.fillRect(0, 0, W, Y(BAND.top));
    g.fillStyle = "rgba(255,210,150,0.12)";
    g.fillRect(0, 3, W, 2);
    g.fillStyle = "rgba(20,10,4,0.5)";
    g.fillRect(0, Y(BAND.top) - 9, W, 2);
    const gold = (y0, y1) => {
      const gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, "#f2cf7a");
      gr.addColorStop(0.5, "#d6a046");
      gr.addColorStop(1, "#9c6c24");
      g.fillStyle = gr;
      g.fillRect(0, y0, W, y1 - y0);
    };
    gold(Y(BAND.top), Y(BAND.g1));
    const pr = g.createLinearGradient(0, Y(BAND.g1), 0, Y(BAND.paint));
    pr.addColorStop(0, "#a33a2f");
    pr.addColorStop(1, "#7c241f");
    g.fillStyle = pr;
    g.fillRect(0, Y(BAND.g1), W, Y(BAND.paint) - Y(BAND.g1));
    gold(Y(BAND.paint), Y(BAND.g2));
    const py = (Y(BAND.g1) + Y(BAND.paint)) / 2;
    const step = W / 8;
    for (let i = 0; i < 8; i++) {
      const px = step * (i + 0.5);
      g.fillStyle = "#5a3412";
      g.beginPath();
      g.arc(px, py, 21, 0, TAU);
      g.fill();
      const rg = g.createRadialGradient(px - 5, py - 6, 2, px, py, 19);
      rg.addColorStop(0, "#ffe7a6");
      rg.addColorStop(0.6, "#d19a3e");
      rg.addColorStop(1, "#8a5a1c");
      g.fillStyle = rg;
      g.beginPath();
      g.arc(px, py, 18, 0, TAU);
      g.fill();
      const gl = g.createLinearGradient(px - 12, py - 12, px + 12, py + 12);
      gl.addColorStop(0, "#5f8fa8");
      gl.addColorStop(1, "#1d3444");
      g.fillStyle = gl;
      g.beginPath();
      g.arc(px, py, 12, 0, TAU);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.55)";
      g.beginPath();
      g.ellipse(px - 4, py - 5, 4, 2.4, -0.6, 0, TAU);
      g.fill();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        g.fillStyle = "#6e4614";
        g.beginPath();
        g.arc(px + Math.cos(a) * 15.5, py + Math.sin(a) * 15.5, 1.5, 0, TAU);
        g.fill();
      }
      ge.fillStyle = "#ffcf7a";
      ge.beginPath();
      ge.arc(px, py, 12, 0, TAU);
      ge.fill();
    }
    g.fillStyle = "#2e1a0c";
    g.fillRect(0, Y(BAND.plank), W, Y(BAND.line) - Y(BAND.plank));
    const cy0 = Y(BAND.line);
    const cg = g.createLinearGradient(0, cy0, 0, H);
    cg.addColorStop(0, "#b8703f");
    cg.addColorStop(1, "#8d4f2b");
    g.fillStyle = cg;
    g.fillRect(0, cy0, W, H - cy0);
    const ph = 34;
    const pwd = 64;
    for (let r = 0, yy = cy0; yy < H; r++, yy += ph) {
      for (let xx = (r % 2) * (pwd / 2) - pwd; xx < W; xx += pwd) {
        const k = 0.9 + rnd() * 0.18;
        g.fillStyle = "rgba(" + [190, 116, 66].map(v => Math.round(v * k)).join(",") + ",0.55)";
        g.fillRect(xx + 1, yy + 1, pwd - 2, ph - 2);
        g.fillStyle = "rgba(255,190,140,0.18)";
        g.fillRect(xx + 1, yy + 1, pwd - 2, 2);
        g.fillStyle = "rgba(70,34,14,0.55)";
        g.fillRect(xx, yy, 1.5, ph);
        g.fillRect(xx, yy + ph - 1.5, pwd, 1.5);
        g.fillStyle = "rgba(255,214,160,0.55)";
        for (let q = 0; q < 4; q++) {
          g.beginPath();
          g.arc(xx + 6 + q * ((pwd - 12) / 3), yy + 5, 1.3, 0, TAU);
          g.fill();
        }
      }
    }
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const yy = cy0 + 20 + rnd() * (H - cy0 - 30);
      const r = 10 + rnd() * 30;
      const rg = g.createRadialGradient(x, yy, 1, x, yy, r);
      rg.addColorStop(0, "rgba(96,160,138,0.34)");
      rg.addColorStop(1, "rgba(96,160,138,0)");
      g.fillStyle = rg;
      g.fillRect(x - r, yy - r, r * 2, r * 2);
    }
    return { map: toTex(THREE, c, true, false), emi: toTex(THREE, e, true, false) };
  }

  function panelTex(THREE, w, h, opts) {
    const PX = 160;
    const W = Math.min(2048, Math.max(64, Math.round(w * PX)));
    const H = Math.min(1024, Math.max(32, Math.round(h * PX)));
    const c = cnv(W, H);
    const e = cnv(W, H);
    if (!c) return {};
    const g = c.getContext("2d");
    const ge = e.getContext("2d");
    ge.fillStyle = "#000";
    ge.fillRect(0, 0, W, H);
    const rnd = rng(opts.seed || 5);
    const rh = Math.max(10, Math.round(PX * 0.17));
    for (let y = 0; y < H; y += rh) {
      let x = -rnd() * 200;
      while (x < W) {
        const len = 140 + rnd() * 200;
        const k = 0.85 + rnd() * 0.2;
        g.fillStyle = "rgb(" + (opts.base || [150, 98, 58]).map(v => Math.round(v * k)).join(",") + ")";
        g.fillRect(x, y, len, rh);
        g.fillStyle = "rgba(40,22,10,0.6)";
        g.fillRect(x, y, 2, rh);
        x += len;
      }
      g.fillStyle = "rgba(40,22,10,0.7)";
      g.fillRect(0, y + rh - 2, W, 2);
    }
    const frame = (x, y, fw, fh) => {
      g.fillStyle = "#3b2210";
      g.fillRect(x - 6, y - 6, fw + 12, fh + 12);
      const gr = g.createLinearGradient(0, y - 4, 0, y + fh + 4);
      gr.addColorStop(0, "#f0c96f");
      gr.addColorStop(1, "#a8762a");
      g.fillStyle = gr;
      g.fillRect(x - 4, y - 4, fw + 8, fh + 8);
    };
    (opts.windows || []).forEach(([cx, cy, ww, wh, arch]) => {
      const x = cx * W - (ww * PX) / 2;
      const y = cy * H - (wh * PX) / 2;
      const fw = ww * PX;
      const fh = wh * PX;
      frame(x, y, fw, fh);
      const gl = g.createLinearGradient(x, y, x + fw, y + fh);
      gl.addColorStop(0, "#6f9cb2");
      gl.addColorStop(1, "#243e4f");
      g.fillStyle = gl;
      g.fillRect(x, y, fw, fh);
      if (arch) {
        g.fillStyle = "#a8762a";
        g.beginPath();
        g.ellipse(x + fw / 2, y, fw / 2 + 4, fh * 0.22, 0, Math.PI, 0);
        g.fill();
      }
      g.fillStyle = "#3b2210";
      g.fillRect(x + fw / 2 - 2, y, 4, fh);
      g.fillRect(x, y + fh / 2 - 2, fw, 4);
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(x + 4, y + 4, fw * 0.22, 3);
      ge.fillStyle = "#ffcf7a";
      ge.fillRect(x, y, fw, fh);
      ge.fillStyle = "#000";
      ge.fillRect(x + fw / 2 - 2, y, 4, fh);
      ge.fillRect(x, y + fh / 2 - 2, fw, 4);
    });
    (opts.doors || []).forEach(([cx, dw, dh]) => {
      const fw = dw * PX;
      const fh = Math.min(H - 4, dh * PX);
      const x = cx * W - fw / 2;
      const y = H - fh;
      frame(x, y + fw * 0.2, fw, fh);
      g.fillStyle = "#5a3417";
      g.fillRect(x, y + fw * 0.2, fw, fh);
      g.beginPath();
      g.ellipse(x + fw / 2, y + fw * 0.2 + 2, fw / 2, fw * 0.22, 0, Math.PI, 0);
      g.fill();
      for (let k = 1; k < 4; k++) {
        g.fillStyle = "rgba(25,12,4,0.55)";
        g.fillRect(x + (fw * k) / 4 - 1, y + fw * 0.12, 2, fh);
      }
      g.fillStyle = "#3b2210";
      g.fillRect(x, y + fh * 0.35, fw, 6);
      g.fillRect(x, y + fh * 0.8, fw, 6);
      g.fillStyle = "#e6b85a";
      g.beginPath();
      g.arc(x + fw * 0.78, y + fh * 0.6, 4.5, 0, TAU);
      g.fill();
    });
    if (opts.trim) {
      const gr = g.createLinearGradient(0, 0, 0, 12);
      gr.addColorStop(0, "#f0c96f");
      gr.addColorStop(1, "#a8762a");
      g.fillStyle = gr;
      g.fillRect(0, 0, W, 10);
      g.fillStyle = "#3b2210";
      g.fillRect(0, 10, W, 3);
    }
    if (opts.crest) {
      const cx = W / 2;
      const cy = H * opts.crest;
      const r = Math.min(W, H) * 0.12;
      g.fillStyle = "#3b2210";
      g.beginPath();
      g.arc(cx, cy, r + 6, 0, TAU);
      g.fill();
      const rg = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 2, cx, cy, r);
      rg.addColorStop(0, "#ffe3a0");
      rg.addColorStop(1, "#a8762a");
      g.fillStyle = rg;
      g.beginPath();
      g.arc(cx, cy, r, 0, TAU);
      g.fill();
      g.fillStyle = "#8f2d27";
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU - Math.PI / 2;
        const rr = k % 2 ? r * 0.32 : r * 0.78;
        g[k ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
      [-1, 1].forEach(sg => {
        g.strokeStyle = "#d6a046";
        g.lineWidth = Math.max(4, r * 0.14);
        g.lineCap = "round";
        g.beginPath();
        for (let k = 0; k <= 30; k++) {
          const t = k / 30;
          const a = t * 4.2;
          const rr = r * (1.9 - t * 1.4);
          const px = cx + sg * (r * 1.15 + t * r * 2.6) + sg * Math.cos(a) * rr * 0.25;
          const pyy = cy + Math.sin(a) * rr * 0.35;
          g[k ? "lineTo" : "moveTo"](px, pyy);
        }
        g.stroke();
      });
    }
    return { map: toTex(THREE, c, false, false), emi: toTex(THREE, e, false, false) };
  }

  function sailTex(THREE, emblem) {
    const W = 256;
    const c = cnv(W, W);
    if (!c) return null;
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, W);
    gr.addColorStop(0, "#fbf4e2");
    gr.addColorStop(1, "#ece0c4");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, W);
    for (let x = 0; x < W; x += W / 7) {
      g.fillStyle = "rgba(150,118,70,0.22)";
      g.fillRect(x, 0, 2, W);
      g.fillStyle = "rgba(255,255,255,0.4)";
      g.fillRect(x + 2, 0, 1, W);
    }
    g.fillStyle = "rgba(150,118,70,0.25)";
    g.fillRect(0, W * 0.33, W, 3);
    g.fillRect(0, W * 0.66, W, 3);
    g.strokeStyle = "#b98d55";
    g.lineWidth = 7;
    g.strokeRect(3, 3, W - 6, W - 6);
    g.fillStyle = "rgba(120,84,40,0.6)";
    for (let x = 14; x < W - 8; x += 18) {
      g.beginPath();
      g.arc(x, 9, 2, 0, TAU);
      g.fill();
    }
    if (emblem) {
      const cx = W / 2;
      const cy = W * 0.52;
      const r = W * 0.22;
      g.fillStyle = "#8f2d27";
      g.beginPath();
      g.arc(cx, cy, r, 0, TAU);
      g.fill();
      g.strokeStyle = "#d6a046";
      g.lineWidth = 7;
      g.stroke();
      g.fillStyle = "#e9b955";
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU - Math.PI / 2;
        const rr = k % 2 ? r * 0.28 : r * 0.78;
        g[k ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    }
    return toTex(THREE, c, false, false);
  }

  function wingTex(THREE) {
    const W = 256;
    const H = 128;
    const c = cnv(W, H);
    if (!c) return null;
    const g = c.getContext("2d");
    g.fillStyle = "#f3e9d0";
    g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 22) {
      g.fillStyle = "rgba(150,118,70,0.22)";
      g.fillRect(x, 0, 2, H);
    }
    g.fillStyle = "#8f2d27";
    g.fillRect(W * 0.74, 0, W * 0.12, H);
    g.fillStyle = "#d6a046";
    g.fillRect(W * 0.72, 0, 5, H);
    g.fillRect(W * 0.86, 0, 5, H);
    g.fillStyle = "#b98d55";
    g.fillRect(W - 8, 0, 8, H);
    return toTex(THREE, c, false, false);
  }

  function flagTex(THREE) {
    const c = cnv(128, 64);
    if (!c) return null;
    const g = c.getContext("2d");
    g.fillStyle = "#2f7a4f";
    g.fillRect(0, 0, 128, 64);
    g.fillStyle = "#f3e9d0";
    g.fillRect(0, 26, 128, 12);
    g.fillStyle = "#e9b955";
    g.beginPath();
    g.arc(30, 32, 14, 0, TAU);
    g.fill();
    g.fillStyle = "#2f7a4f";
    g.beginPath();
    g.arc(30, 32, 8, 0, TAU);
    g.fill();
    return toTex(THREE, c, false, false);
  }

  function outline(hw, hl, bow = 0.62, n = 96) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const e = 2 / 2.6;
      let x = hw * Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), e);
      let z = hl * Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), e);
      if (z < 0) x *= 1 - bow * Math.pow(-z / hl, 2.4);
      pts.push([x, z]);
    }
    return pts;
  }

  function mergeStatic(THREE, grp) {
    grp.updateMatrixWorld(true);
    const dyn = o => {
      for (let p = o; p && p !== grp; p = p.parent) if (p.userData.dyn) return true;
      return false;
    };
    const buckets = new Map();
    grp.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || dyn(o)) return;
      const k = o.material.uuid;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(o);
    });
    buckets.forEach(list => {
      if (list.length < 2) return;
      const pos = [];
      const nor = [];
      const uv = [];
      const idx = [];
      let cast = false;
      list.forEach(m => {
        const g = m.geometry.clone();
        g.applyMatrix4(m.matrixWorld);
        if (!g.attributes.normal) g.computeVertexNormals();
        const P = g.attributes.position;
        const N = g.attributes.normal;
        const U = g.attributes.uv;
        const base = pos.length / 3;
        for (let i = 0; i < P.count; i++) {
          pos.push(P.getX(i), P.getY(i), P.getZ(i));
          nor.push(N.getX(i), N.getY(i), N.getZ(i));
          uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0);
        }
        if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
        else for (let i = 0; i < P.count; i++) idx.push(base + i);
        cast = cast || m.castShadow;
        m.parent.remove(m);
        g.dispose();
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      const mm = new THREE.Mesh(g, list[0].material);
      mm.castShadow = cast;
      mm.receiveShadow = true;
      grp.add(mm);
    });
  }

  function build(THREE, o = {}) {
    const s = o.s || 1;
    const deckY = o.deckY || 0;
    const gx = o.gx || 3;
    const gz = o.gz || 5;
    const B = Math.max(o.beam || 0, gx + 1.45 * s);
    const F = o.fore || gz + 3.9 * s;
    const A = o.aft || gz + 2.1 * s;
    const D = o.depth || B * 0.72;
    const hR = 0.55 * s;
    const hF = 0.8 * s;
    const hQ = 0.46 * s;
    const tB = 0.14 * s;
    const zF = -(gz + 0.45 * s);
    const zQ = gz + 0.45 * s;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const w = z => (z >= 0 ? B * (1 - 0.38 * Math.pow(Math.min(1, z / A), 3.2)) : B * Math.max(0, 1 - Math.pow(Math.min(1, -z / F), 2.4)));
    const xIn = z => Math.max(0, w(z) * 0.975 - tB);
    const deckAt = z => deckY + (z < zF ? hF : z > zQ ? hQ : 0);
    const hT = z => {
      const kF = smooth(-0.3 * s, 0.3 * s, zF - z);
      const kQ = smooth(-0.3 * s, 0.3 * s, z - zQ);
      const bf = Math.max(0, (zF - z) / (F + zF));
      const bq = Math.max(0, (z - zQ) / (A - zQ));
      return deckY + hR + hF * kF + hQ * kQ + 0.75 * s * bf * bf + 0.28 * s * bq * bq;
    };
    const yK = z => deckY - D * (z < 0 ? 1 - 0.7 * Math.pow(Math.min(1, -z / F), 3) : 1 - 0.42 * Math.pow(Math.min(1, z / A), 2.5));
    const VM = 0.17;
    const NE = 2 / 2.7;
    const sec = (z, v) => {
      const wz = w(z);
      const top = hT(z);
      const yk = yK(z);
      const yM = Math.max(yk + 0.2 * s, deckY - 0.5 * s);
      if (v <= VM) {
        const a = v / VM;
        return [lerp(wz * 0.975, wz * 1.035, Math.sin((a * Math.PI) / 2)), lerp(top, yM, a)];
      }
      const th = ((v - VM) / (1 - VM)) * (Math.PI / 2);
      return [wz * 1.035 * Math.pow(Math.max(0, Math.cos(th)), NE), yM - (yM - yk) * Math.pow(Math.sin(th), NE)];
    };
    const NV = 30;
    const ring = z => {
      const pts = [];
      let L = 0;
      const ls = [0];
      for (let j = 0; j <= NV; j++) {
        const p = sec(z, j / NV);
        if (j) {
          L += Math.hypot(p[0] - pts[j - 1][0], p[1] - pts[j - 1][1]);
          ls.push(L);
        }
        pts.push(p);
      }
      return { pts, t: ls.map(l => (L ? l / L : 0)), L };
    };
    const atT = (z, tv) => {
      const r = ring(z);
      for (let j = 1; j <= NV; j++) {
        if (r.t[j] >= tv) {
          const k = (tv - r.t[j - 1]) / Math.max(1e-6, r.t[j] - r.t[j - 1]);
          return [lerp(r.pts[j - 1][0], r.pts[j][0], k), lerp(r.pts[j - 1][1], r.pts[j][1], k)];
        }
      }
      return r.pts[NV];
    };

    const grp = new THREE.Group();
    const glowMats = [];
    const std = (c, r = 0.75, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, extra));
    const M = {
      wood: std(0x6b4326, 0.8),
      dark: std(0x3d2414, 0.85),
      light: std(0xc39466, 0.8),
      inner: std(0xb07e52, 0.85, { side: THREE.DoubleSide }),
      gold: std(0xd9a54a, 0.38, { metalness: 0.55 }),
      brass: std(0xc8913a, 0.32, { metalness: 0.65 }),
      iron: std(0x3a3632, 0.6, { metalness: 0.4 }),
      rope: std(0x4a3a2a, 0.9),
      red: std(0x8f2d27, 0.7)
    };
    const glass = std(0x40606e, 0.25, { emissive: 0xffc067, emissiveIntensity: 0.1 });
    glowMats.push(glass);
    const add = (geo, mat, cast = false, parent = grp) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = cast;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const rod = (a, b, r, mat, parent = grp, r2) => {
      const d = new THREE.Vector3().subVectors(b, a);
      const m = add(new THREE.CylinderGeometry(r2 == null ? r : r2, r, d.length(), 6, 1), mat, false, parent);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
      return m;
    };
    const sweep = (frames, prof, closed, mat, cast) => {
      const pos = [];
      const uv = [];
      const idx = [];
      const n = frames.length;
      const P = prof.length;
      for (let e = 0; e < P; e++) {
        const p0 = prof[e];
        const p1 = prof[(e + 1) % P];
        const base = pos.length / 3;
        for (let i = 0; i < n; i++) {
          const f = frames[i];
          [p0, p1].forEach(p => {
            pos.push(f.p.x + f.n.x * p[0] + f.u.x * p[1], f.p.y + f.n.y * p[0] + f.u.y * p[1], f.p.z + f.n.z * p[0] + f.u.z * p[1]);
            uv.push(i / (n - 1), p === p0 ? 0 : 1);
          });
        }
        const segs = closed ? n : n - 1;
        for (let i = 0; i < segs; i++) {
          const a = base + i * 2;
          const b = base + ((i + 1) % n) * 2;
          idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return add(g, mat, cast);
    };

    const zs = [];
    const NZ = 96;
    for (let i = 0; i <= NZ; i++) {
      const u = i / NZ;
      const u2 = 0.55 * u + 0.45 * (1 - Math.cos((u * Math.PI) / 2));
      zs.push(-F + (F + A) * u2);
    }
    const rings = zs.map(ring);
    const mid = ring(0);
    const tile = mid.L * 2;
    {
      const ht = hullTex(THREE);
      const pos = [];
      const uv = [];
      const idx = [];
      const C = NV * 2 + 1;
      rings.forEach((r, i) => {
        for (let j = 0; j < C; j++) {
          const port = j <= NV;
          const v = port ? j : 2 * NV - j;
          const p = r.pts[v];
          pos.push(port ? -p[0] : p[0], p[1], zs[i]);
          uv.push((zs[i] + F) / tile, 1 - r.t[v]);
        }
      });
      for (let i = 0; i < NZ; i++)
        for (let j = 0; j < C - 1; j++) {
          const a = i * C + j;
          const b = a + C;
          idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const hm = std(0xffffff, 0.72, { map: ht.map || null, emissiveMap: ht.emi || null, emissive: ht.emi ? 0xffffff : 0x000000, emissiveIntensity: 0.05 });
      glowMats.push(hm);
      add(g, hm, true);

      const last = rings[NZ];
      const top = hT(A);
      const bot = yK(A);
      const tw = w(A) * 1.04;
      const st = panelTex(THREE, tw * 2, top - bot, { seed: 9, base: [112, 66, 36], trim: true, crest: 0.62, windows: [-0.36, -0.18, 0, 0.18, 0.36].map(x => [0.5 + x * 0.9, 0.26, 0.34 * s, 0.4 * s, true]) });
      const tp = [];
      const tuv = [];
      const tix = [];
      const cy = (top + bot) / 2;
      tp.push(0, cy, A + 0.002);
      tuv.push(0.5, (cy - bot) / (top - bot));
      for (let j = 0; j < C; j++) {
        const port = j <= NV;
        const v = port ? j : 2 * NV - j;
        const p = last.pts[v];
        const x = port ? -p[0] : p[0];
        tp.push(x, p[1], A + 0.002);
        tuv.push(0.5 + x / (tw * 2), (p[1] - bot) / (top - bot));
      }
      for (let j = 1; j < C; j++) tix.push(0, j, j + 1);
      tix.push(0, C, 1);
      const tg = new THREE.BufferGeometry();
      tg.setAttribute("position", new THREE.Float32BufferAttribute(tp, 3));
      tg.setAttribute("uv", new THREE.Float32BufferAttribute(tuv, 2));
      tg.setIndex(tix);
      tg.computeVertexNormals();
      const tm = std(0xffffff, 0.75, { map: st.map || null, emissiveMap: st.emi || null, emissive: st.emi ? 0xffffff : 0, emissiveIntensity: 0.05, side: THREE.DoubleSide });
      glowMats.push(tm);
      add(tg, tm, true);
    }

    [BAND.g2 + 0.004, BAND.line - 0.004, 0.035].forEach((tv, k) => {
      [-1, 1].forEach(sg => {
        const pts = [];
        for (let i = 2; i <= NZ; i++) {
          const z = zs[i];
          if (w(z) < 0.15 * s) continue;
          const p = atT(z, tv);
          pts.push(V3(sg * (p[0] + 0.02 * s), p[1], z));
        }
        if (pts.length < 4) return;
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, (k === 2 ? 0.05 : 0.06) * s, 6, false), k === 1 ? M.dark : k === 2 ? M.gold : M.wood);
      });
    });

    const zTip = (() => {
      let z = -F;
      while (xIn(z) <= 0.001 && z < 0) z += 0.01 * s;
      return z;
    })();
    const z1 = A - tB;
    const innerLoop = [];
    const NI = 110;
    for (let i = 0; i <= NI; i++) {
      const z = lerp(zTip, z1, i / NI);
      innerLoop.push([-xIn(z), z]);
    }
    for (let i = 1; i < 12; i++) innerLoop.push([lerp(-xIn(z1), xIn(z1), i / 12), z1]);
    for (let i = NI; i >= 1; i--) {
      const z = lerp(zTip, z1, i / NI);
      innerLoop.push([xIn(z), z]);
    }

    const dt = deckTex(THREE);
    const deckM = std(0xffffff, 0.85, { map: dt || null });
    const flat = (poly, y) => {
      const sh = new THREE.Shape();
      poly.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
      const g = new THREE.ShapeGeometry(sh, 1);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (3.2 * s), p.getZ(i) / (3.2 * s));
      const m = add(g, deckM, false);
      m.position.y = y;
      return m;
    };
    flat(innerLoop, deckY);
    const sub = (z0, z1b) => {
      const poly = [];
      const N = 40;
      for (let i = 0; i <= N; i++) {
        const z = lerp(z0, z1b, i / N);
        poly.push([-xIn(z), z]);
      }
      if (z1b >= z1 - 1e-6) for (let i = 1; i < 12; i++) poly.push([lerp(-xIn(z1), xIn(z1), i / 12), z1]);
      for (let i = N; i >= 0; i--) {
        const z = lerp(z0, z1b, i / N);
        poly.push([xIn(z), z]);
      }
      return poly;
    };
    flat(sub(zTip, zF), deckY + hF);
    flat(sub(zQ, z1), deckY + hQ);

    {
      const pos = [];
      const idx = [];
      innerLoop.forEach(([x, z]) => {
        pos.push(x, deckAt(z), z, x, hT(Math.min(z, A)) - 0.02 * s, z);
      });
      const n = innerLoop.length;
      for (let i = 0; i < n; i++) {
        const a = i * 2;
        const b = ((i + 1) % n) * 2;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      add(g, M.inner, false);
    }

    {
      const outer = [];
      const NO = 140;
      for (let i = 0; i <= NO; i++) {
        const z = lerp(-F, A, i / NO);
        outer.push([-w(z) * 0.975, z]);
      }
      for (let i = 1; i < 14; i++) outer.push([lerp(-w(A) * 0.975, w(A) * 0.975, i / 14), A]);
      for (let i = NO; i >= 1; i--) {
        const z = lerp(-F, A, i / NO);
        outer.push([w(z) * 0.975, z]);
      }
      const n = outer.length;
      const frames = outer.map(([x, z], i) => {
        const [px, pz] = outer[(i - 1 + n) % n];
        const [nx, nz] = outer[(i + 1) % n];
        const d1 = V3(x - px, 0, z - pz).normalize();
        const d2 = V3(nx - x, 0, nz - z).normalize();
        const n1 = V3(-d1.z, 0, d1.x);
        const n2 = V3(-d2.z, 0, d2.x);
        const nn = n1.clone().add(n2);
        if (nn.lengthSq() < 1e-6) nn.copy(n1);
        nn.normalize();
        const k = 1 / Math.max(0.55, nn.dot(n1));
        if (nn.x * -x + nn.z * ((A - F) / 2 - z) < 0) nn.multiplyScalar(-1);
        return { p: V3(x, hT(z), z), n: nn.multiplyScalar(k), u: V3(0, 1, 0) };
      });
      sweep(frames, [[-0.07 * s, 0], [tB + 0.06 * s, 0], [tB + 0.06 * s, 0.09 * s], [-0.07 * s, 0.09 * s]], true, M.light, true);
      sweep(frames.map(f => ({ p: f.p.clone().setY(f.p.y - 0.01 * s), n: f.n, u: f.u })), [[-0.09 * s, -0.08 * s], [-0.02 * s, -0.08 * s], [-0.02 * s, 0.02 * s], [-0.09 * s, 0.02 * s]], true, M.gold, false);
    }

    {
      const step = 0.62 * s;
      const pts = [];
      const walk = (fz, from, to) => {
        let L = 0;
        let prev = null;
        for (let i = 0; i <= 300; i++) {
          const z = lerp(from, to, i / 300);
          const p = fz(z);
          if (prev) L += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
          prev = p;
          if (L >= step) {
            L = 0;
            pts.push(p);
          }
        }
      };
      [-1, 1].forEach(sg => walk(z => [sg * xIn(z), z], zTip + 0.4 * s, z1 - 0.2 * s));
      const g = new THREE.BoxGeometry(0.09 * s, 1, 0.12 * s);
      g.translate(0, 0.5, 0);
      const im = new THREE.InstancedMesh(g, M.wood, pts.length);
      const mm = new THREE.Matrix4();
      pts.forEach(([x, z], i) => {
        const y0 = deckAt(z);
        const hh = hT(z) - y0;
        mm.makeScale(1, hh, 1);
        mm.setPosition(x - Math.sign(x) * 0.04 * s, y0, z);
        im.setMatrixAt(i, mm);
      });
      im.receiveShadow = true;
      grp.add(im);
    }

    const balustrade = (z, y, x0, x1, face) => {
      const top = y + 0.52 * s;
      rod(V3(x0, top, z), V3(x1, top, z), 0.05 * s, M.light);
      rod(V3(x0, y + 0.06 * s, z), V3(x1, y + 0.06 * s, z), 0.035 * s, M.wood);
      const n = Math.max(2, Math.round(Math.abs(x1 - x0) / (0.2 * s)));
      const g = new THREE.CylinderGeometry(0.03 * s, 0.035 * s, 0.46 * s, 6);
      const im = new THREE.InstancedMesh(g, M.light, n + 1);
      const mm = new THREE.Matrix4();
      for (let i = 0; i <= n; i++) {
        mm.makeTranslation(lerp(x0, x1, i / n), y + 0.29 * s, z);
        im.setMatrixAt(i, mm);
      }
      grp.add(im);
      [x0, x1].forEach(x => {
        const p = add(new THREE.BoxGeometry(0.13 * s, 0.6 * s, 0.13 * s), M.wood);
        p.position.set(x, y + 0.3 * s, z);
        const b = add(new THREE.SphereGeometry(0.075 * s, 10, 8), M.gold);
        b.position.set(x, y + 0.66 * s, z);
      });
      return face;
    };

    const stairs = (zTop, dir, yTop, x, wd) => {
      const n = 5;
      const run = 0.68 * s;
      const rise = yTop - deckY;
      for (let k = 0; k < n; k++) {
        const st = add(new THREE.BoxGeometry(wd, 0.05 * s, run / n + 0.03 * s), M.light, true);
        st.position.set(x, deckY + (rise * (n - k)) / (n + 1), zTop + dir * (run * (k + 0.5)) / n);
      }
      [-1, 1].forEach(sg => {
        const a = V3(x + (sg * wd) / 2, yTop, zTop);
        const b = V3(x + (sg * wd) / 2, deckY, zTop + dir * run);
        const m = rod(a, b, 0.045 * s, M.wood);
        m.scale.set(1.4, 1, 2.4);
      });
      const inner = x - (Math.sign(x) * wd) / 2;
      const p0 = V3(inner, yTop + 0.5 * s, zTop);
      const p1 = V3(inner, deckY + 0.5 * s, zTop + dir * run);
      rod(p0, p1, 0.03 * s, M.light);
      rod(V3(inner, deckY, zTop + dir * run), p1, 0.03 * s, M.wood);
      const b = add(new THREE.SphereGeometry(0.06 * s, 8, 6), M.gold);
      b.position.copy(p1).y += 0.04 * s;
      return run;
    };

    const wall = (z, y0, h, facing, doors, windows) => {
      const wd = xIn(z) * 2;
      const t = panelTex(THREE, wd, h, { seed: facing > 0 ? 3 : 4, base: [150, 98, 58], trim: true, doors, windows });
      const m = std(0xffffff, 0.8, { map: t.map || null, emissiveMap: t.emi || null, emissive: t.emi ? 0xffffff : 0, emissiveIntensity: 0.05 });
      glowMats.push(m);
      const pl = add(new THREE.PlaneGeometry(wd, h), m, true);
      pl.position.set(0, y0 + h / 2, z);
      if (facing < 0) pl.rotation.y = Math.PI;
      return wd;
    };

    const lantern = (x, y, z, hang) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      grp.add(g);
      const L = 0.3 * s;
      add(new THREE.CylinderGeometry(0.11 * s, 0.13 * s, 0.05 * s, 8), M.iron, false, g).position.y = 0.02 * s;
      const gl = add(new THREE.CylinderGeometry(0.085 * s, 0.085 * s, L * 0.7, 6), glass, false, g);
      gl.position.y = 0.05 * s + L * 0.35;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        const r = add(new THREE.BoxGeometry(0.018 * s, L * 0.72, 0.018 * s), M.iron, false, g);
        r.position.set(Math.cos(a) * 0.09 * s, 0.05 * s + L * 0.35, Math.sin(a) * 0.09 * s);
      }
      const roof = add(new THREE.ConeGeometry(0.14 * s, 0.14 * s, 6), M.iron, false, g);
      roof.position.y = 0.05 * s + L * 0.7 + 0.07 * s;
      const ring = add(new THREE.TorusGeometry(0.04 * s, 0.012 * s, 5, 10), M.brass, false, g);
      ring.position.y = roof.position.y + 0.1 * s;
      if (hang) g.position.y -= L + 0.2 * s;
      return g;
    };

    {
      const wF = wall(zF, deckY, hF, 1, [[0.5, 0.5 * s, 0.72 * s]], [[0.3, 0.45, 0.26 * s, 0.3 * s, true], [0.7, 0.45, 0.26 * s, 0.3 * s, true]]);
      const sx = xIn(zF) - 0.36 * s;
      const sw = 0.5 * s;
      [-1, 1].forEach(sg => stairs(zF, 1, deckY + hF, sg * sx, sw));
      balustrade(zF + 0.05 * s, deckY + hF, -sx + sw / 2 + 0.08 * s, sx - sw / 2 - 0.08 * s);
      [-1, 1].forEach(sg => lantern(sg * (sx - sw / 2 - 0.08 * s), deckY + hF + 0.72 * s, zF + 0.05 * s));
      void wF;
      wall(zQ, deckY, hQ, -1, [], []);
      const qx = xIn(zQ) - 0.36 * s;
      [-1, 1].forEach(sg => stairs(zQ, -1, deckY + hQ, sg * qx, sw));
      balustrade(zQ - 0.05 * s, deckY + hQ, -qx + sw / 2 + 0.08 * s, qx - sw / 2 - 0.08 * s);
    }

    const wheel = new THREE.Group();
    {
      const zw = lerp(zQ, z1, 0.78);
      const y0 = deckY + hQ;
      const ped = add(new THREE.BoxGeometry(0.22 * s, 0.62 * s, 0.22 * s), M.wood, true);
      ped.position.set(0, y0 + 0.31 * s, zw);
      const cap = add(new THREE.BoxGeometry(0.28 * s, 0.06 * s, 0.28 * s), M.gold);
      cap.position.set(0, y0 + 0.64 * s, zw);
      wheel.position.set(0, y0 + 0.78 * s, zw - 0.16 * s);
      wheel.userData.dyn = true;
      grp.add(wheel);
      add(new THREE.TorusGeometry(0.4 * s, 0.035 * s, 6, 28), M.light, true, wheel);
      add(new THREE.TorusGeometry(0.4 * s, 0.012 * s, 4, 28), M.gold, false, wheel).position.z = -0.03 * s;
      add(new THREE.CylinderGeometry(0.09 * s, 0.09 * s, 0.14 * s, 10), M.brass, false, wheel).rotation.x = Math.PI / 2;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        const sp = add(new THREE.CylinderGeometry(0.022 * s, 0.03 * s, 0.62 * s, 6), M.light, false, wheel);
        sp.position.set(Math.cos(a) * 0.32 * s, Math.sin(a) * 0.32 * s, 0);
        sp.rotation.z = a - Math.PI / 2;
        const hd = add(new THREE.SphereGeometry(0.04 * s, 8, 6), M.wood, false, wheel);
        hd.position.set(Math.cos(a) * 0.64 * s, Math.sin(a) * 0.64 * s, 0);
      }
      const bin = add(new THREE.CylinderGeometry(0.13 * s, 0.16 * s, 0.4 * s, 10), M.wood, true);
      bin.position.set(0, y0 + 0.2 * s, zw - 0.6 * s);
      const dome = add(new THREE.SphereGeometry(0.13 * s, 12, 8, 0, TAU, 0, Math.PI / 2), M.brass);
      dome.position.set(0, y0 + 0.4 * s, zw - 0.6 * s);
      [-1, 1].forEach(sg => {
        const x = sg * (xIn(z1 - 0.2 * s) - 0.05 * s);
        const post = add(new THREE.CylinderGeometry(0.05 * s, 0.06 * s, 0.75 * s, 6), M.wood, true);
        post.position.set(x, hT(z1) + 0.4 * s, z1 - 0.2 * s);
        lantern(x, hT(z1) + 0.78 * s, z1 - 0.2 * s);
      });
      const fs = V3(0, hT(A), A - 0.12 * s);
      const fe = V3(0, hT(A) + 2.3 * s, A + 0.55 * s);
      rod(fs, fe, 0.045 * s, M.wood);
      const fl = flagTex(THREE);
      const fg = new THREE.PlaneGeometry(1.05 * s, 0.6 * s, 10, 1);
      fg.translate(0.525 * s, 0, 0);
      const flag = add(fg, std(0xffffff, 0.8, { map: fl || null, side: THREE.DoubleSide }));
      flag.position.set(0, fe.y - 0.32 * s, fe.z - 0.1 * s);
      flag.rotation.y = -Math.PI / 2;
      flag.userData.dyn = true;
      grp.userData.ensign = flag;
    }

    {
      const pts = [];
      for (let i = NZ; i >= 0; i--) {
        const z = zs[i];
        if (z < -F * 0.985) continue;
        pts.push(V3(0, yK(z), z));
      }
      const y0 = yK(-F);
      const y1 = hT(-F) + 0.3 * s;
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        pts.push(V3(0, lerp(y0, y1, t), -F + 0.02 * s - 0.06 * s * t * t));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const N = 160;
      const frames = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const p = curve.getPointAt(u);
        const tg = curve.getTangentAt(u);
        const n = V3(1, 0, 0);
        const up = new THREE.Vector3().crossVectors(tg, n).normalize();
        frames.push({ p, n, u: up });
      }
      sweep(frames, [[-0.09 * s, -0.08 * s], [0.09 * s, -0.08 * s], [0.09 * s, 0.3 * s], [-0.09 * s, 0.3 * s]], false, M.dark, true);
      sweep(frames.slice(Math.floor(N * 0.8)), [[-0.1 * s, 0.26 * s], [0.1 * s, 0.26 * s], [0.1 * s, 0.34 * s], [-0.1 * s, 0.34 * s]], false, M.gold, false);
    }

    const bowTop = V3(0, hT(-F) + 0.22 * s, -F - 0.05 * s);
    const bsDir = V3(0, Math.sin(0.3), -Math.cos(0.3));
    const bsLen = 3.4 * s;
    const bsEnd = bowTop.clone().addScaledVector(bsDir, bsLen);
    rod(bowTop.clone().addScaledVector(bsDir, -1.2 * s), bsEnd, 0.07 * s, M.wood, grp, 0.15 * s);
    [0.35, 0.7].forEach(f => {
      const p = bowTop.clone().addScaledVector(bsDir, bsLen * f);
      const r = add(new THREE.CylinderGeometry(0.15 * s * (1 - f * 0.5), 0.15 * s * (1 - f * 0.5), 0.07 * s, 10), M.gold);
      r.position.copy(p);
      r.quaternion.setFromUnitVectors(V3(0, 1, 0), bsDir);
    });
    {
      const tip = add(new THREE.SphereGeometry(0.13 * s, 12, 10), M.gold);
      tip.position.copy(bsEnd);
      [-1, 1].forEach(sg => {
        const pts = [];
        for (let k = 0; k <= 30; k++) {
          const t = k / 30;
          const a = t * 5.2;
          const r = 0.55 * s * (1 - t * 0.78);
          pts.push(V3(sg * (0.11 * s + t * 0.04 * s), hT(-F) - 0.35 * s + Math.sin(a) * r * 0.6, -F + 0.35 * s - t * 0.85 * s - Math.cos(a) * r * 0.35));
        }
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.055 * s, 6, false), M.gold);
        const ball = add(new THREE.SphereGeometry(0.07 * s, 8, 6), M.gold);
        ball.position.copy(pts[pts.length - 1]);
      });
    }

    const zm = lerp(zF, -F, 0.4);
    const mH = 7.0 * s;
    const mast = new THREE.Group();
    mast.position.set(0, deckAt(zm), zm);
    grp.add(mast);
    const sails = [];
    {
      const seg = [[0, 0.6, 0.17], [0.55, 0.85, 0.12], [0.8, 1, 0.075]];
      seg.forEach(([a, b, r]) => {
        const m = add(new THREE.CylinderGeometry(r * 0.75 * s, r * s, (b - a) * mH, 10), M.wood, true, mast);
        m.position.y = ((a + b) / 2) * mH;
      });
      [0.6, 0.85].forEach(f => {
        const c = add(new THREE.BoxGeometry(0.34 * s, 0.22 * s, 0.34 * s), M.dark, false, mast);
        c.position.y = f * mH - 0.05 * s;
      });
      [0.1, 0.3, 0.5].forEach(f => {
        const band = add(new THREE.CylinderGeometry(0.185 * s, 0.185 * s, 0.06 * s, 10), M.iron, false, mast);
        band.position.y = f * mH;
      });
      const top = add(new THREE.SphereGeometry(0.11 * s, 10, 8), M.gold, false, mast);
      top.position.y = mH + 0.05 * s;
      const nestY = 0.58 * mH;
      add(new THREE.CylinderGeometry(0.62 * s, 0.5 * s, 0.12 * s, 16), M.wood, true, mast).position.y = nestY;
      const nr = add(new THREE.CylinderGeometry(0.62 * s, 0.62 * s, 0.34 * s, 16, 1, true), M.light, false, mast);
      nr.material = M.inner;
      nr.position.y = nestY + 0.23 * s;
      add(new THREE.TorusGeometry(0.62 * s, 0.03 * s, 5, 20), M.gold, false, mast).rotation.x = Math.PI / 2;
      mast.children[mast.children.length - 1].position.y = nestY + 0.4 * s;

      const plain = sailTex(THREE, false);
      const crest = sailTex(THREE, true);
      const mkSail = (y, wt, wb, h, tex, belly) => {
        const NX = 12;
        const NY = 8;
        const g = new THREE.BufferGeometry();
        const pos = [];
        const uv = [];
        const base = [];
        const idx = [];
        for (let j = 0; j <= NY; j++)
          for (let i = 0; i <= NX; i++) {
            const u = i / NX;
            const v = j / NY;
            const hw = lerp(wt, wb, v) / 2;
            const x = (u * 2 - 1) * hw;
            const sag = v === 1 ? 0.12 * h * (1 - Math.pow(u * 2 - 1, 2)) : 0;
            const yy = -v * h + sag;
            const bz = -belly * (1 - Math.pow(u * 2 - 1, 2) * 0.85) * Math.sin(Math.min(1, v * 1.05) * Math.PI * 0.92);
            pos.push(x, yy, bz);
            base.push(bz);
            uv.push(u, 1 - v);
          }
        for (let j = 0; j < NY; j++)
          for (let i = 0; i < NX; i++) {
            const a = j * (NX + 1) + i;
            idx.push(a, a + NX + 1, a + 1, a + 1, a + NX + 1, a + NX + 2);
          }
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
        g.computeVertexNormals();
        const m = add(g, std(0xffffff, 0.85, { map: tex || null, side: THREE.DoubleSide }), false, mast);
        m.position.set(0, y, -0.2 * s);
        m.userData.base = base;
        m.userData.dyn = true;
        sails.push(m);
        const yard = add(new THREE.CylinderGeometry(0.05 * s, 0.075 * s, wt * 1.12, 8), M.wood, false, mast);
        yard.rotation.z = Math.PI / 2;
        yard.position.set(0, y + 0.05 * s, -0.16 * s);
        [-1, 1].forEach(sg => {
          const cap = add(new THREE.SphereGeometry(0.06 * s, 8, 6), M.gold, false, mast);
          cap.position.set((sg * wt * 1.12) / 2, y + 0.05 * s, -0.16 * s);
        });
        return m;
      };
      mkSail(0.55 * mH, 4.4 * s, 5.0 * s, 0.3 * mH, crest, 0.7 * s);
      mkSail(0.79 * mH, 3.5 * s, 4.1 * s, 0.2 * mH, plain, 0.48 * s);
      mkSail(0.97 * mH, 2.4 * s, 3.1 * s, 0.15 * mH, plain, 0.34 * s);

      const pg = new THREE.PlaneGeometry(1.6 * s, 0.26 * s, 12, 1);
      const pp = pg.attributes.position;
      for (let i = 0; i < pp.count; i++) pp.setY(i, pp.getY(i) * (1 - (pp.getX(i) / (1.6 * s) + 0.5) * 0.85));
      pg.translate(0.8 * s, 0, 0);
      const pen = add(pg, std(0x8f2d27, 0.7, { side: THREE.DoubleSide }), false, mast);
      pen.position.y = mH + 0.02 * s;
      pen.rotation.y = -Math.PI / 2;
      pen.userData.dyn = true;
      pen.userData.base = Array.from({ length: pp.count }, (_, i) => pp.getX(i));
      grp.userData.pennant = pen;
    }

    {
      const mp = mast.position;
      const nestW = V3(0, mp.y + 0.58 * mH, mp.z);
      [-1, 1].forEach(sg => {
        for (let k = 0; k < 4; k++) {
          const z = mp.z + (k - 1.2) * 0.42 * s;
          const a = V3(sg * (xIn(z) + 0.04 * s), hT(z) + 0.05 * s, z);
          const b = V3(sg * 0.5 * s, nestW.y, mp.z + (k - 1.5) * 0.12 * s);
          rod(a, b, 0.018 * s, M.rope);
        }
        for (let k = 0; k < 2; k++) {
          const z = zF + (0.3 + k * 0.45) * s;
          rod(V3(sg * (xIn(z) - 0.05 * s), hT(z) + 0.05 * s, z), V3(0, mp.y + (0.88 + k * 0.06) * mH, mp.z + 0.05 * s), 0.014 * s, M.rope);
        }
      });
      rod(V3(0, mp.y + mH * 0.98, mp.z - 0.05 * s), bsEnd, 0.016 * s, M.rope);
      rod(V3(0, mp.y + mH * 0.6, mp.z - 0.1 * s), bowTop.clone().addScaledVector(bsDir, bsLen * 0.72), 0.016 * s, M.rope);
      const jA = V3(0, mp.y + mH * 0.56, mp.z - 0.2 * s);
      const jB = bsEnd.clone().addScaledVector(bsDir, -0.25 * s);
      const jC = bowTop.clone().addScaledVector(bsDir, 0.2 * s).add(V3(0, 0.15 * s, 0));
      const g = new THREE.BufferGeometry();
      const pos = [];
      const uv = [];
      const idx = [];
      const N = 8;
      const base = [];
      for (let j = 0; j <= N; j++)
        for (let i = 0; i <= N - j; i++) {
          const u = i / N;
          const v = j / N;
          const p = jC.clone().multiplyScalar(1 - u - v).addScaledVector(jB, u).addScaledVector(jA, v);
          const bulge = 0.45 * s * Math.sin(Math.PI * Math.min(1, (u + v) * 1.0)) * (1 - Math.abs(u - v)) * Math.min(1, (1 - u - v) * 3 + 0.2);
          p.x += bulge;
          base.push(bulge);
          pos.push(p.x, p.y, p.z);
          uv.push(u, v);
        }
      let r0 = 0;
      for (let j = 0; j < N; j++) {
        const n0 = N - j + 1;
        const r1 = r0 + n0;
        for (let i = 0; i < n0 - 1; i++) {
          idx.push(r0 + i, r0 + i + 1, r1 + i);
          if (i < n0 - 2) idx.push(r0 + i + 1, r1 + i + 1, r1 + i);
        }
        r0 = r1;
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      add(g, std(0xf6eedb, 0.85, { side: THREE.DoubleSide }));
    }

    {
      const zA = zF - 0.9 * s;
      [-1, 1].forEach(sg => {
        const ag = new THREE.Group();
        const x = sg * (w(zA) * 1.0 + 0.1 * s);
        ag.position.set(x, hT(zA) - 0.42 * s, zA);
        grp.add(ag);
        const sh = add(new THREE.CylinderGeometry(0.045 * s, 0.045 * s, 1.0 * s, 6), M.iron, false, ag);
        sh.position.y = -0.4 * s;
        const arms = add(new THREE.TorusGeometry(0.32 * s, 0.045 * s, 6, 16, Math.PI), M.iron, false, ag);
        arms.rotation.z = Math.PI;
        arms.position.y = -0.62 * s;
        [-1, 1].forEach(k => {
          const fl = add(new THREE.ConeGeometry(0.08 * s, 0.18 * s, 4), M.iron, false, ag);
          fl.position.set(k * 0.32 * s, -0.56 * s, 0);
          fl.rotation.z = k * 0.6;
        });
        const st = add(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.6 * s, 6), M.dark, false, ag);
        st.rotation.x = Math.PI / 2;
        st.position.y = 0.04 * s;
        [-1, 1].forEach(k => {
          const b = add(new THREE.SphereGeometry(0.05 * s, 6, 5), M.dark, false, ag);
          b.position.set(0, 0.04 * s, k * 0.3 * s);
        });
        const rg = add(new THREE.TorusGeometry(0.09 * s, 0.02 * s, 5, 12), M.iron, false, ag);
        rg.position.y = 0.14 * s;
        ag.rotation.y = sg * 0.12;
        ag.rotation.z = sg * 0.06;
      });
    }

    {
      const top = deckY - 0.45 * s;
      const bot = yK(A) - 0.32 * s;
      const sh = new THREE.Shape();
      sh.moveTo(0, top);
      sh.lineTo(0, bot + 0.2 * s);
      sh.quadraticCurveTo(0.05 * s, bot, 0.5 * s, bot);
      sh.lineTo(0.95 * s, bot + 0.3 * s);
      sh.lineTo(0.62 * s, top - 0.3 * s);
      sh.lineTo(0.2 * s, top);
      sh.lineTo(0, top);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.12 * s, bevelEnabled: true, bevelThickness: 0.02 * s, bevelSize: 0.02 * s, bevelSegments: 1 });
      g.translate(0, 0, -0.06 * s);
      const rd = add(g, M.wood, true);
      rd.rotation.y = -Math.PI / 2;
      rd.position.set(0, 0, A - 0.05 * s);
      [0.25, 0.6].forEach(f => {
        const hg = add(new THREE.BoxGeometry(0.18 * s, 0.08 * s, 0.3 * s), M.gold);
        hg.position.set(0, lerp(top, bot, f), A + 0.05 * s);
      });
    }

    const wingFlaps = [];
    {
      const span = 4.4 * s;
      const zW = -0.4 * s;
      const yW = deckY - 0.55 * s;
      const wt = wingTex(THREE);
      const memM = std(0xffffff, 0.8, { map: wt || null, side: THREE.DoubleSide });
      const angs = [-0.95, -0.5, -0.05, 0.38, 0.78];
      const lens = [0.74, 0.96, 1, 0.86, 0.62];
      [-1, 1].forEach(sg => {
        const hullX = (() => {
          const r = ring(zW);
          let best = r.pts[0];
          r.pts.forEach(p => {
            if (Math.abs(p[1] - yW) < Math.abs(best[1] - yW)) best = p;
          });
          return best[0];
        })();
        const piv = new THREE.Group();
        piv.position.set(sg * hullX, yW, zW);
        grp.add(piv);
        const hub = add(new THREE.CylinderGeometry(0.34 * s, 0.4 * s, 0.26 * s, 16), M.brass, true, piv);
        hub.rotation.z = Math.PI / 2;
        const hub2 = add(new THREE.CylinderGeometry(0.2 * s, 0.24 * s, 0.2 * s, 12), M.iron, false, piv);
        hub2.rotation.z = Math.PI / 2;
        hub2.position.x = sg * 0.2 * s;
        const wg = new THREE.Group();
        wg.userData.dyn = true;
        wg.position.x = sg * 0.22 * s;
        piv.add(wg);
        const rib = (k, r) => {
          const L = span * lens[k];
          const a = angs[k] + 0.1 * r;
          const d = r * L;
          return V3(sg * Math.cos(a) * d, 0.22 * d * (1 - r * 0.45) - 0.05 * s * r * r, Math.sin(a) * d * 0.95);
        };
        angs.forEach((_, k) => {
          const pts = [];
          for (let i = 0; i <= 10; i++) pts.push(rib(k, i / 10));
          add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.055 * s, 6, false), M.wood, true, wg);
          const tip = add(new THREE.ConeGeometry(0.07 * s, 0.22 * s, 8), M.brass, false, wg);
          const pa = pts[10];
          const pb = pts[9];
          tip.position.copy(pa);
          tip.quaternion.setFromUnitVectors(V3(0, 1, 0), pa.clone().sub(pb).normalize());
        });
        const NR = 10;
        const NC = 6;
        const pos = [];
        const uv = [];
        const idx = [];
        for (let k = 0; k < angs.length - 1; k++) {
          const base = pos.length / 3;
          for (let i = 0; i <= NR; i++)
            for (let j = 0; j <= NC; j++) {
              const c = j / NC;
              const edge = 1 - 0.2 * Math.sin(c * Math.PI);
              const r = (i / NR) * edge;
              const a = rib(k, r);
              const b = rib(k + 1, r);
              const p = a.lerp(b, c);
              p.y -= 0.12 * s * Math.sin(c * Math.PI) * r;
              pos.push(p.x, p.y, p.z);
              uv.push(i / NR, (k + c) / (angs.length - 1));
            }
          for (let i = 0; i < NR; i++)
            for (let j = 0; j < NC; j++) {
              const a = base + i * (NC + 1) + j;
              idx.push(a, a + NC + 1, a + 1, a + 1, a + NC + 1, a + NC + 2);
            }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
        g.computeVertexNormals();
        add(g, memM, false, wg);
        wingFlaps.push({ g: wg, sg });
      });
    }

    const props = [];
    {
      const zE = lerp(0, A, 0.62);
      const yE = deckY - 1.55 * s;
      const prof = [[0, -0.95], [0.12, -0.92], [0.24, -0.8], [0.32, -0.6], [0.34, -0.2], [0.33, 0.35], [0.28, 0.62], [0.2, 0.78], [0.16, 0.86], [0, 0.88]].map(([r, y]) => new THREE.Vector2(r * s, y * s));
      [-1, 1].forEach(sg => {
        const r = ring(zE);
        let hx = r.pts[0];
        r.pts.forEach(p => {
          if (Math.abs(p[1] - yE) < Math.abs(hx[1] - yE)) hx = p;
        });
        const x = sg * (hx[0] + 0.62 * s);
        const eg = new THREE.Group();
        eg.position.set(x, yE, zE);
        grp.add(eg);
        const body = add(new THREE.LatheGeometry(prof, 16), M.brass, true, eg);
        body.rotation.x = Math.PI / 2;
        [-0.55, -0.1, 0.4].forEach(zz => {
          const band = add(new THREE.TorusGeometry(0.335 * s, 0.035 * s, 6, 18), M.iron, false, eg);
          band.position.z = zz * s;
        });
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU;
          const fin = add(new THREE.BoxGeometry(0.03 * s, 0.14 * s, 0.5 * s), M.iron, false, eg);
          fin.position.set(Math.cos(a) * 0.36 * s, Math.sin(a) * 0.36 * s, 0.1 * s);
          fin.rotation.z = a + Math.PI / 2;
        }
        const pyl = rod(V3(x - sg * 0.1 * s, yE + 0.25 * s, zE), V3(sg * (hx[0] - 0.05 * s), yE + 0.55 * s, zE), 0.08 * s, M.dark);
        pyl.scale.set(1, 1, 3.5);
        const strut = rod(V3(x - sg * 0.05 * s, yE + 0.15 * s, zE - 0.55 * s), V3(sg * (hx[0] - 0.05 * s), yE + 0.75 * s, zE - 0.9 * s), 0.04 * s, M.iron);
        void strut;
        const pr = new THREE.Group();
        pr.userData.dyn = true;
        pr.position.z = 0.98 * s;
        eg.add(pr);
        const sp = add(new THREE.ConeGeometry(0.15 * s, 0.32 * s, 12), M.gold, false, pr);
        sp.rotation.x = Math.PI / 2;
        sp.position.z = 0.12 * s;
        for (let k = 0; k < 4; k++) {
          const arm = new THREE.Group();
          arm.rotation.z = (k / 4) * TAU;
          pr.add(arm);
          const bl = add(new THREE.SphereGeometry(1, 12, 8), M.light, false, arm);
          bl.scale.set(0.16 * s, 0.62 * s, 0.035 * s);
          bl.position.y = 0.62 * s;
          bl.rotation.y = 0.5;
          const tipB = add(new THREE.SphereGeometry(1, 10, 6), M.red, false, arm);
          tipB.scale.set(0.12 * s, 0.12 * s, 0.038 * s);
          tipB.position.y = 1.1 * s;
          tipB.rotation.y = 0.5;
        }
        props.push({ g: pr, sg });
      });
    }

    mergeStatic(THREE, grp);
    grp.userData.outline = innerLoop;
    grp.userData.dims = { B, F, A, zF, zQ, deckAt, hT, xIn, w };
    grp.userData.tick = (t, k = 1) => {
      props.forEach(p => (p.g.rotation.z = t * 11 * k * p.sg));
      wingFlaps.forEach(f => (f.g.rotation.z = f.sg * (0.06 + Math.sin(t * 1.3) * 0.07 * k)));
      const breathe = 1 + Math.sin(t * 0.9) * 0.08 * k;
      sails.forEach((m, i) => {
        const p = m.geometry.attributes.position;
        const b = m.userData.base;
        const ph = 1 + Math.sin(t * 1.1 + i) * 0.05 * k;
        for (let j = 0; j < p.count; j++) p.setZ(j, b[j] * breathe * ph);
        p.needsUpdate = true;
      });
      const pen = grp.userData.pennant;
      if (pen) {
        const p = pen.geometry.attributes.position;
        const b = pen.userData.base;
        for (let j = 0; j < p.count; j++) p.setZ(j, Math.sin(b[j] * 3 / s - t * 5) * 0.12 * s * (b[j] / (1.6 * s)) * k);
        p.needsUpdate = true;
      }
      const en = grp.userData.ensign;
      if (en) en.rotation.y = -Math.PI / 2 + Math.sin(t * 2.2) * 0.18 * k;
      wheel.rotation.z = Math.sin(t * 0.35) * 0.5 * k;
    };
    grp.userData.night = k => {
      glowMats.forEach(m => (m.emissiveIntensity = (m === glass ? 0.15 : 0.04) + k * (m === glass ? 1.6 : 1.1)));
    };
    grp.userData.night(0);
    return grp;
  }

  root.Ship = { build, outline };
})(window);
