(function () {
  const lerp = (a, b, k) => a + (b - a) * k;

  const smooth = (a, b, x) => {
    const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };

  const mat = (color, rough = 0.55) => new THREE.MeshStandardMaterial({ color, roughness: rough });

  const mesh = (geo, material, shadow = true) => {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = shadow;
    return m;
  };

  function eye(o = {}) {
    const size = o.size || 1;
    const g = new THREE.Group();
    const white = mesh(new THREE.SphereGeometry(0.22 * size, 32, 24), mat(o.whiteColor ?? 0xffffff, 0.3), false);
    white.scale.set(1, 1.1, 0.55);
    const pupil = mesh(new THREE.SphereGeometry(0.12 * size, 32, 24), mat(o.pupilColor ?? 0x1e2340, 0.2), false);
    pupil.scale.set(1, 1.1, 0.5);
    pupil.position.z = 0.09 * size;
    const shine = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 * size, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    shine.position.set(0.04 * size, 0.05 * size, 0.06 * size);
    pupil.add(shine);
    g.add(white, pupil);
    return { g, pupil };
  }

  function followPupils(eyes, pointer, amp = 1) {
    eyes.forEach(({ pupil }) => {
      pupil.position.x = lerp(pupil.position.x, pointer.x * 0.07 * amp, 0.15);
      pupil.position.y = lerp(pupil.position.y, pointer.y * 0.06 * amp, 0.15);
    });
  }

  function eatPhase(p) {
    if (p < 0.3) return { fall: p / 0.3, chew: 0, bite: 0, visible: true };
    if (p < 0.85) {
      const q = (p - 0.3) / 0.55;
      return { fall: 1, chew: Math.abs(Math.sin(q * Math.PI * 4)), bite: q, visible: true };
    }
    return { fall: 1, chew: 0, bite: 1, visible: false };
  }

  function berry() {
    const g = new THREE.Group();
    const fruit = mesh(new THREE.SphereGeometry(0.16, 24, 16), mat(0xe8465a, 0.4), false);
    const leaf = mesh(new THREE.SphereGeometry(0.07, 16, 12), mat(0x4fa86e), false);
    leaf.scale.set(1, 0.4, 1);
    leaf.position.y = 0.15;
    g.add(fruit, leaf);
    if (typeof document !== "undefined" && THREE.GLTFLoader) {
      const src = "assets/models/berry.glb";
      const cache = THREE.__mythGlb || (THREE.__mythGlb = {});
      if (!cache[src])
        cache[src] = new Promise(res => {
          try {
            new THREE.GLTFLoader().load(src, m => res(m), undefined, () => res(null));
          } catch (err) {
            res(null);
          }
        });
      cache[src].then(m => {
        if (!m) return;
        const sc = m.scene.clone(true);
        const box = new THREE.Box3().setFromObject(sc);
        const k = 0.4 / Math.max(1e-3, box.max.y - box.min.y);
        sc.scale.setScalar(k);
        sc.position.set(-(box.min.x + box.max.x) * 0.5 * k, -0.16 - box.min.y * k, -(box.min.z + box.max.z) * 0.5 * k);
        sc.traverse(o => {
          if (!o.isMesh) return;
          o.castShadow = true;
          o.material = o.material.clone();
          ["map", "emissiveMap"].forEach(q => o.material[q] && (o.material[q].encoding = THREE.LinearEncoding));
        });
        g.remove(fruit, leaf);
        g.add(sc);
      });
    }
    return g;
  }

  function fish(color = 0x7fb2e8) {
    const g = new THREE.Group();
    const body = mesh(new THREE.SphereGeometry(0.2, 24, 16), mat(color, 0.35), false);
    body.scale.set(1.7, 0.8, 0.6);
    const tail = mesh(new THREE.ConeGeometry(0.14, 0.24, 3), mat(color, 0.35), false);
    tail.rotation.z = -Math.PI / 2;
    tail.position.x = -0.38;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x1e2340 })
    );
    dot.position.set(0.22, 0.04, 0.1);
    g.add(body, tail, dot);
    return g;
  }

  function spin(pivot, now) {
    pivot.rotation.order = "YXZ";
    const st = { yaw: 0, pitch: 0, vyaw: 0, vpitch: 0, held: false, at: -100 };
    const TAU = Math.PI * 2;
    return {
      active: () => st.held || Math.abs(st.yaw) > 0.01 || Math.abs(st.pitch) > 0.01,
      begin() {
        st.held = true;
        st.vyaw = 0;
        st.vpitch = 0;
        st.at = now();
      },
      drag(dx, dy) {
        const vy = dx * 0.011;
        const vp = dy * 0.007;
        st.yaw += vy;
        st.pitch = Math.max(-0.5, Math.min(0.8, st.pitch + vp));
        st.vyaw = vy;
        st.vpitch = vp;
        st.at = now();
      },
      end() {
        st.held = false;
        st.at = now();
      },
      update() {
        if (!st.held) {
          st.yaw += st.vyaw;
          st.vyaw *= 0.93;
          st.pitch = Math.max(-0.5, Math.min(0.8, st.pitch + st.vpitch));
          st.vpitch *= 0.9;
          if (now() - st.at > 6) {
            const home = Math.round(st.yaw / TAU) * TAU;
            st.yaw = lerp(st.yaw, home, 0.05);
            st.pitch = lerp(st.pitch, 0, 0.05);
            if (Math.abs(st.yaw - home) < 0.002) st.yaw = 0;
          }
        }
        pivot.rotation.set(st.pitch, st.yaw, 0);
      }
    };
  }

  const lavaCache = {};
  function lavaRock(o = {}) {
    const N = o.size || 256;
    const cells = o.cells || 26;
    const crack = o.crack || 3.2;
    const rock = o.rock || [62, 48, 44];
    const lava = o.lava || [255, 128, 34];
    const key = [N, cells, crack, rock, lava, o.seed || 1, o.stripes || 0, o.cols || 3, o.patches || 0].join("|");
    if (lavaCache[key]) return lavaCache[key];
    let seed = (o.seed || 1) * 9301 + 49297;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const pts = [];
    for (let i = 0; i < cells; i++) pts.push([rnd() * N, rnd() * N, 0.72 + rnd() * 0.42]);
    if (o.stripes) {
      pts.length = 0;
      const rows = o.stripes;
      const cols = o.cols || 3;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push([(c + 0.5 + (r % 2) * 0.5) * (N / cols), (r + 0.5) * (N / rows), 0.85 + rnd() * 0.3]);
    }
    const patches = [];
    for (let i = 0; i < (o.patches || 0); i++) patches.push([rnd() * N, rnd() * N, N * (0.1 + rnd() * 0.1)]);
    const patchK = (x, y) => {
      if (!patches.length) return 1;
      let k = 0;
      patches.forEach(([px, py, pr]) => {
        let dx = Math.abs(x - px);
        let dy = Math.abs(y - py);
        if (dx > N / 2) dx = N - dx;
        if (dy > N / 2) dy = N - dy;
        k = Math.max(k, 1 - smooth(pr * 0.4, pr, Math.sqrt(dx * dx + dy * dy)));
      });
      return k;
    };
    const mk = () => {
      const cv = document.createElement("canvas");
      cv.width = N;
      cv.height = N;
      const ctx = cv.getContext("2d");
      return { cv, ctx, img: ctx.createImageData(N, N) };
    };
    const cMap = mk();
    const cEmi = mk();
    const cBump = mk();
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let f1 = 1e9;
        let f2 = 1e9;
        let id = 0;
        for (let i = 0; i < pts.length; i++) {
          let dx = Math.abs(x - pts[i][0]);
          let dy = Math.abs(y - pts[i][1]);
          if (dx > N / 2) dx = N - dx;
          if (dy > N / 2) dy = N - dy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < f1) {
            f2 = f1;
            f1 = d;
            id = i;
          } else if (d < f2) {
            f2 = d;
          }
        }
        const e = f2 - f1;
        const pk = patchK(x, y);
        const c0 = 1 - smooth(crack * 0.45, crack, e);
        const c = c0 * pk;
        const halo = (1 - smooth(0, crack * 3.2, e)) * pk;
        const seam = c0 * (1 - pk) * 0.55;
        const tone = pts[id][2] * (0.82 + 0.18 * smooth(0, crack * 6, e)) + (((x * 7 + y * 13) % 17) / 17 - 0.5) * 0.08;
        const k = (y * N + x) * 4;
        const lr = Math.min(1, c + halo * 0.18);
        cMap.img.data[k] = lerp(rock[0] * tone * (1 - seam), lava[0], lr);
        cMap.img.data[k + 1] = lerp(rock[1] * tone * (1 - seam), lava[1], lr);
        cMap.img.data[k + 2] = lerp(rock[2] * tone * (1 - seam), lava[2], lr);
        cMap.img.data[k + 3] = 255;
        const em = Math.min(255, c * 255 + halo * 70);
        cEmi.img.data[k] = em;
        cEmi.img.data[k + 1] = em;
        cEmi.img.data[k + 2] = em;
        cEmi.img.data[k + 3] = 255;
        const b = 40 + 200 * smooth(0, crack * 2.5, e) * tone;
        cBump.img.data[k] = b;
        cBump.img.data[k + 1] = b;
        cBump.img.data[k + 2] = b;
        cBump.img.data[k + 3] = 255;
      }
    }
    const tex = c => {
      c.ctx.putImageData(c.img, 0, 0);
      const t = new THREE.CanvasTexture(c.cv);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      return t;
    };
    lavaCache[key] = { map: tex(cMap), emi: tex(cEmi), bump: tex(cBump) };
    return lavaCache[key];
  }

  function strike(p) {
    const wind = smooth(0, 0.3, p) * (1 - smooth(0.32, 0.42, p));
    const lunge = smooth(0.3, 0.44, p) * (1 - smooth(0.58, 0.95, p));
    const impact = smooth(0.4, 0.46, p) * (1 - smooth(0.5, 0.62, p));
    return { wind, lunge, impact, on: p < 1 };
  }

  function cast(p) {
    const charge = smooth(0, 0.46, p) * (1 - smooth(0.5, 0.6, p));
    const burst = smooth(0.46, 0.54, p) * (1 - smooth(0.62, 0.92, p));
    const shake = charge * Math.sin(p * 90) * 0.5;
    return { charge, burst, shake, on: p < 1 };
  }

  function glow(root, color, k) {
    if (!root.userData.glowMats) {
      const list = [];
      root.traverse(o => {
        if (!o.isMesh || !o.material) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          if (m.emissive && !list.some(x => x.m === m)) list.push({ m, e: m.emissive.clone(), i: m.emissiveIntensity });
        });
      });
      root.userData.glowMats = list;
      root.userData.glowColor = new THREE.Color();
    }
    const c = root.userData.glowColor.set(color);
    root.userData.glowMats.forEach(x => {
      x.m.emissive.copy(x.e).lerp(c, Math.min(1, k));
      x.m.emissiveIntensity = lerp(x.i === undefined ? 1 : x.i, Math.max(x.i || 1, 1), k);
    });
  }

  const variantHue = id => {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return (0.3 + ((h % 1000) / 1000) * 0.4) * Math.PI * 2;
  };
  const HUE_GLSL = "uniform float uVarHue;\nvec3 varHue(vec3 c, float a) { const vec3 k = vec3(0.57735); float ca = cos(a); return max(c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca), 0.0); }\n";

  function variant(root, id) {
    const angle = variantHue(id || "x");
    const done = new Set();
    root.traverse(o => {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (!m || done.has(m) || m.isShaderMaterial || m.userData.varHue !== undefined) return;
        done.add(m);
        m.userData.varHue = angle;
        const prev = m.onBeforeCompile;
        m.onBeforeCompile = (sh, r) => {
          if (prev) prev.call(m, sh, r);
          sh.uniforms.uVarHue = { value: angle };
          sh.fragmentShader =
            HUE_GLSL +
            sh.fragmentShader
              .replace("#include <color_fragment>", "#include <color_fragment>\n\tdiffuseColor.rgb = varHue(diffuseColor.rgb, uVarHue);")
              .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n\ttotalEmissiveRadiance = varHue(totalEmissiveRadiance, uVarHue);");
        };
        const prevKey = m.customProgramCacheKey;
        m.customProgramCacheKey = () => (prevKey ? prevKey.call(m) : "") + "|var" + angle.toFixed(3);
        m.needsUpdate = true;
      });
    });
    root.userData.variant = true;
    return root;
  }

  function surface(m, tex, o = {}) {
    if (!tex || !tex.image || typeof document === "undefined") return m;
    const src = tex.image;
    const W = src.width;
    const H = src.height;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    g.filter = "blur(" + (o.blur ?? 2.2) + "px) grayscale(1)";
    g.drawImage(src, 0, 0);
    g.filter = "none";
    const base = g.getImageData(0, 0, W, H).data.slice();
    let sd = o.seed || 13;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const area = W * H;
    for (let k = 0; k < area / 2500; k++) {
      const r = (6 + rnd() * 26) * (W / 1024);
      const x = rnd() * W;
      const y = rnd() * H;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const d = rnd() > 0.5 ? "255,255,255" : "0,0,0";
      gr.addColorStop(0, "rgba(" + d + "," + (0.05 + rnd() * 0.07) + ")");
      gr.addColorStop(1, "rgba(" + d + ",0)");
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let k = 0; k < (area / 2600) * (o.pits ?? 1); k++) {
      g.beginPath();
      g.arc(rnd() * W, rnd() * H, (0.8 + rnd() * 1.4) * (W / 1024), 0, Math.PI * 2);
      g.fillStyle = "rgba(0,0,0," + (0.18 + rnd() * 0.2) + ")";
      g.fill();
    }
    g.lineCap = "round";
    for (let k = 0; k < (area / 9000) * (o.scratch ?? 1); k++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const a = rnd() * Math.PI * 2;
      const l = 6 + rnd() * 22;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.lineWidth = 0.8 + rnd();
      g.strokeStyle = "rgba(0,0,0," + (0.18 + rnd() * 0.2) + ")";
      g.stroke();
    }
    const img = g.getImageData(0, 0, W, H);
    const a = img.data;
    const rc = document.createElement("canvas");
    rc.width = W;
    rc.height = H;
    const rg = rc.getContext("2d");
    const rimg = rg.createImageData(W, H);
    const ra = rimg.data;
    const flat = (o.flat || []).map(f => [f[0] * W, f[1] * W, f[2] ?? 0.75, f[3] ?? 0.32]);
    const grain = o.grain ?? 3;
    const hRough = o.rough ?? [0.48, 0.82];
    const hMetal = o.metal ?? 0.04;
    for (let i = 0, px = 0; i < a.length; i += 4, px++) {
      const x = px % W;
      let fl = null;
      for (let k = 0; k < flat.length; k++) if (x >= flat[k][0] && x < flat[k][1]) fl = flat[k];
      let v;
      let rough;
      let metal;
      if (fl) {
        v = 128 + (base[i] - 128) * 0.3 + (rnd() - 0.5) * 3;
        rough = fl[3] + (rnd() - 0.5) * 0.06;
        metal = fl[2];
      } else {
        v = a[i] + (rnd() - 0.5) * grain;
        const h = Math.max(0, Math.min(1, v / 255));
        rough = lerp(hRough[1], hRough[0], h) + (rnd() - 0.5) * 0.04;
        metal = hMetal;
      }
      v = Math.max(0, Math.min(255, v));
      a[i] = a[i + 1] = a[i + 2] = v;
      ra[i] = 0;
      ra[i + 1] = Math.max(0, Math.min(255, rough * 255));
      ra[i + 2] = Math.max(0, Math.min(255, metal * 255));
      ra[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    rg.putImageData(rimg, 0, 0);
    const mk = cv => {
      const t = new THREE.CanvasTexture(cv);
      t.wrapS = tex.wrapS;
      t.wrapT = tex.wrapT;
      t.repeat.copy(tex.repeat);
      t.anisotropy = tex.anisotropy;
      return t;
    };
    m.bumpMap = mk(c);
    m.bumpScale = o.bump ?? 0.06;
    const rt = mk(rc);
    m.roughnessMap = rt;
    m.metalnessMap = rt;
    m.roughness = 1;
    m.metalness = 1;
    m.needsUpdate = true;
    return m;
  }

  function glb(o) {
    const st = { scene: null, active: false };
    if (typeof document === "undefined" || !THREE.GLTFLoader || !THREE.SkeletonUtils || !o.src) return Object.assign(st, { drive: () => false, bone: () => null });
    const glbCache = THREE.__mythGlb || (THREE.__mythGlb = {});
    if (!glbCache[o.src])
      glbCache[o.src] = new Promise(res => {
        try {
          new THREE.GLTFLoader().load(o.src, g => res(g), undefined, () => res(null));
        } catch (err) {
          res(null);
        }
      });
    let mixer = null;
    const acts = {};
    let tinted = false;
    glbCache[o.src].then(g => {
      if (!g) return;
      const sc = THREE.SkeletonUtils.clone(g.scene);
      const box = new THREE.Box3();
      sc.updateMatrixWorld(true);
      sc.traverse(m => {
        if (!m.isMesh) return;
        m.castShadow = true;
        m.frustumCulled = false;
        m.material = m.material.clone();
        if (m.material.color) m.material.color.convertLinearToSRGB();
        if (m.material.emissive) m.material.emissive.convertLinearToSRGB();
        ["map", "emissiveMap"].forEach(k => m.material[k] && (m.material[k].encoding = THREE.LinearEncoding));
        if (o.ignore && o.ignore.test(m.name)) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));
      });
      const k = o.height / Math.max(1e-3, box.max.y - box.min.y);
      sc.scale.setScalar(k);
      sc.position.set(-(box.min.x + box.max.x) * 0.5 * k, (o.bottom || 0) - box.min.y * k, -(box.min.z + box.max.z) * 0.5 * k + (o.dz || 0));
      mixer = new THREE.AnimationMixer(sc);
      g.animations.forEach(c => {
        const a = mixer.clipAction(c);
        a.play();
        a.setEffectiveWeight(0);
        acts[c.name] = a;
      });
      o.parent.add(sc);
      st.scene = sc;
      st.active = true;
      if (o.onReady) o.onReady(st);
    });
    st.bone = name => (st.scene ? st.scene.getObjectByName(name) : null);
    st.drive = (t, name, p, blend = {}) => {
      if (!st.scene) return false;
      if (!tinted && o.owner && o.owner.userData.variant) {
        variant(st.scene, o.id);
        tinted = true;
      }
      const clips = o.clips || {};
      const A = name && acts[clips[name]];
      const w = A ? smooth(0, 0.08, p) * (1 - smooth(0.92, 1, p)) : 0;
      Object.values(acts).forEach(a => a.setEffectiveWeight(0));
      let rest = 1 - w;
      Object.entries(blend).forEach(([clip, bw]) => {
        const B = acts[clip];
        if (!B || bw <= 0) return;
        const ww = rest * Math.min(1, bw);
        B.time = t % B.getClip().duration;
        B.setEffectiveWeight(ww);
        rest -= ww;
      });
      const idle = acts[o.idle || "Idle"];
      if (idle) {
        idle.time = t % idle.getClip().duration;
        idle.setEffectiveWeight(rest);
      }
      if (A) {
        A.time = Math.min(p, 0.999) * A.getClip().duration;
        A.setEffectiveWeight(w);
      }
      mixer.update(0);
      return true;
    };
    return st;
  }

  function core(pet, type) {
    if (pet && typeof pet.setCore === "function") pet.setCore(type || null);
  }

  window.PetKit = { lerp, smooth, mat, mesh, eye, followPupils, eatPhase, berry, fish, spin, lavaRock, strike, cast, glow, variant, surface, core, glb };

  window.Pets = {
    list: [],
    register(def) {
      def.types = window.PetTypes ? window.PetTypes.clean(def.types) : Array.isArray(def.types) ? def.types.slice(0, 2) : [];
      this.list.push(def);
    },
    find(id) {
      return this.list.find(p => p.id === id);
    }
  };
})();
