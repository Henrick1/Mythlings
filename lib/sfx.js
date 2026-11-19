(function (root) {
  const KEY = "mythlings.sfx";
  let on = true;
  try {
    on = root.localStorage.getItem(KEY) !== "0";
  } catch (e) {}
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let active = 0;
  const last = {};
  let stageResolver = null;
  const listeners = [];

  function init() {
    if (ctx) {
      if (ctx.state === "suspended" && !document.hidden) ctx.resume().catch(() => {});
      return ctx;
    }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(comp);
    comp.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 1.5);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  if (root.addEventListener) {
    ["pointerdown", "keydown", "touchstart"].forEach(ev => root.addEventListener(ev, () => on && init(), { capture: true, passive: true }));
  }
  if (root.addEventListener) {
    root.addEventListener("storage", e => {
      if (e.key !== KEY) return;
      on = e.newValue !== "0";
      listeners.forEach(fn => fn(on));
    });
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else if (on) ctx.resume().catch(() => {});
    });
  }

  const ready = () => on && (ctx || init()) && ctx.state === "running";
  const now = () => ctx.currentTime;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function bus(vol, pan) {
    const g = ctx.createGain();
    g.gain.value = vol === undefined ? 1 : vol;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p);
      p.connect(master);
    } else g.connect(master);
    return g;
  }

  function env(param, t0, a, dur, v) {
    param.setValueAtTime(0.0001, t0);
    param.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + Math.max(0.002, a));
    param.exponentialRampToValueAtTime(0.0001, t0 + Math.max(a + 0.01, dur));
  }

  function track(node, end) {
    active += 1;
    node.onended = () => (active -= 1);
    node.stop(end);
  }

  function tone(out, o) {
    const t0 = now() + (o.t || 0);
    const osc = ctx.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.path) o.path.forEach(([dt, f]) => osc.frequency.exponentialRampToValueAtTime(Math.max(20, f), t0 + dt));
    else if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + (o.glide || o.dur));
    if (o.detune) osc.detune.value = o.detune;
    if (o.vib) {
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.frequency.setValueAtTime(o.vib[0], t0);
      if (o.vib[2]) l.frequency.linearRampToValueAtTime(o.vib[2], t0 + o.dur);
      lg.gain.value = o.vib[1];
      l.connect(lg);
      lg.connect(osc.frequency);
      l.start(t0);
      l.stop(t0 + o.dur + 0.05);
    }
    const g = ctx.createGain();
    env(g.gain, t0, o.a || 0.005, o.dur, o.vol || 0.2);
    let n = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = o.lp;
      f.Q.value = o.q || 0.7;
      osc.connect(f);
      n = f;
    }
    n.connect(g);
    g.connect(out);
    osc.start(t0);
    track(osc, t0 + o.dur + 0.05);
  }

  function noise(out, o) {
    const t0 = now() + (o.t || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.ft || "bandpass";
    f.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.path) o.path.forEach(([dt, v]) => f.frequency.exponentialRampToValueAtTime(Math.max(20, v), t0 + dt));
    else if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    env(g.gain, t0, o.a || 0.004, o.dur, o.vol || 0.2);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t0, Math.random() * 1.2);
    track(src, t0 + o.dur + 0.05);
  }

  const bell = (out, f, t, dur, vol) => {
    tone(out, { f, t, dur, vol, type: "sine", a: 0.003 });
    tone(out, { f: f * 2.01, t, dur: dur * 0.6, vol: vol * 0.35, type: "sine", a: 0.003 });
  };
  const sparkle = (out, n, t = 0, vol = 0.05, lo = 2000, hi = 4600) => {
    for (let i = 0; i < n; i++) bell(out, rnd(lo, hi), t + i * rnd(0.04, 0.08), rnd(0.15, 0.3), vol);
  };
  const arp = (out, notes, step, dur, vol, type = "triangle", t = 0) => notes.forEach((f, i) => tone(out, { f, t: t + i * step, dur, vol, type, a: 0.006 }));
  const thud = (out, t, vol, f = 120) => {
    tone(out, { f, f2: f * 0.4, t, dur: 0.16, vol, type: "sine" });
    noise(out, { t, dur: 0.07, vol: vol * 0.6, ft: "lowpass", f: 1400 });
  };
  const whoosh = (out, t, dur, vol, lo = 500, hi = 2400) => noise(out, { t, dur, vol, f: lo, path: [[dur * 0.45, hi], [dur, lo]], q: 1.4, a: dur * 0.35 });
  const munch = (out, t, vol) => {
    noise(out, { t, dur: 0.06, vol, f: rnd(1400, 2400), q: 1.2 });
    noise(out, { t: t + 0.03, dur: 0.05, vol: vol * 0.7, f: rnd(2600, 3600), q: 2 });
    tone(out, { f: rnd(110, 150), f2: 70, t, dur: 0.06, vol: vol * 0.6 });
  };
  const bubbles = (out, n, t, vol, lo = 300, hi = 900) => {
    for (let i = 0; i < n; i++) {
      const f = rnd(lo, hi);
      tone(out, { f, f2: f * 1.8, t: t + i * rnd(0.04, 0.09), dur: 0.07, vol, type: "sine" });
    }
  };

  const TYPE_FX = {
    fire(o, t, k) {
      noise(o, { t, dur: 0.8, vol: 0.3, ft: "lowpass", f: 500, path: [[0.25, 2800], [0.8, 400]], a: 0.12 });
      tone(o, { f: 90 * k, f2: 55, t, dur: 0.7, vol: 0.2, type: "sawtooth", lp: 300 });
      for (let i = 0; i < 9; i++) noise(o, { t: t + rnd(0.05, 0.6), dur: 0.02, vol: 0.12, ft: "highpass", f: 3000 });
    },
    water(o, t, k) {
      noise(o, { t, dur: 0.6, vol: 0.28, f: 500, path: [[0.2, 1600], [0.6, 500]], q: 0.8, a: 0.05 });
      bubbles(o, 8, t + 0.1, 0.07, 300 * k, 800 * k);
    },
    ice(o, t, k) {
      noise(o, { t, dur: 0.7, vol: 0.12, ft: "highpass", f: 5000, a: 0.08 });
      for (let i = 0; i < 10; i++) bell(o, rnd(1800, 4200) * k, t + i * 0.05, rnd(0.3, 0.6), 0.045);
      tone(o, { f: 900 * k, f2: 1800 * k, t, dur: 0.5, vol: 0.05, type: "triangle" });
    },
    electric(o, t, k) {
      tone(o, { f: 70 * k, t, dur: 0.6, vol: 0.12, type: "sawtooth", vib: [37, 120], lp: 2500 });
      tone(o, { f: 140 * k, t: t + 0.05, dur: 0.5, vol: 0.06, type: "square", vib: [23, 300], lp: 3000 });
      for (let i = 0; i < 10; i++) noise(o, { t: t + rnd(0, 0.55), dur: 0.025, vol: 0.14, ft: "highpass", f: 2500 });
    },
    grass(o, t) {
      for (let i = 0; i < 6; i++) noise(o, { t: t + i * 0.08, dur: 0.12, vol: 0.12, f: rnd(2500, 4500), q: 0.7 });
      tone(o, { f: 500, f2: 900, t, dur: 0.4, vol: 0.04, type: "sine" });
    },
    psychic(o, t, k) {
      tone(o, { f: 300 * k, f2: 700 * k, t, dur: 0.8, vol: 0.09, type: "sine", vib: [5, 60, 12], a: 0.15 });
      tone(o, { f: 303 * k, f2: 710 * k, t, dur: 0.8, vol: 0.07, type: "triangle", vib: [7, 50, 15], a: 0.2 });
    },
    dark(o, t, k) {
      tone(o, { f: 95 * k, f2: 45, t, dur: 0.7, vol: 0.2, type: "sawtooth", lp: 380, a: 0.08 });
      whoosh(o, t, 0.6, 0.15, 200, 700);
    },
    light(o, t, k) {
      [1568, 2093, 2637].forEach((f, i) => bell(o, f * k, t + i * 0.06, 0.8, 0.06));
      sparkle(o, 6, t + 0.1, 0.04);
    },
    ghost(o, t, k) {
      tone(o, { f: 420 * k, path: [[0.3, 300 * k], [0.8, 560 * k]], t, dur: 0.9, vol: 0.09, type: "sine", vib: [4, 25], a: 0.2 });
      noise(o, { t, dur: 0.9, vol: 0.06, ft: "lowpass", f: 700, a: 0.3 });
    },
    rock(o, t, k) {
      noise(o, { t, dur: 0.7, vol: 0.3, ft: "lowpass", f: 320, a: 0.05 });
      [0, 0.15, 0.32].forEach(d => thud(o, t + d, 0.22, 90 * k));
    },
    ground(o, t, k) {
      noise(o, { t, dur: 0.9, vol: 0.32, ft: "lowpass", f: 220, a: 0.1 });
      tone(o, { f: 55 * k, f2: 35, t, dur: 0.8, vol: 0.25, type: "sine", vib: [9, 6] });
    },
    steel(o, t, k) {
      [1, 2.76, 5.4, 8.93].forEach((m, i) => tone(o, { f: 420 * k * m, t, dur: 0.7 - i * 0.12, vol: 0.08 / (i + 1), type: "sine", a: 0.002 }));
      noise(o, { t, dur: 0.05, vol: 0.12, ft: "highpass", f: 3000 });
    },
    flying(o, t) {
      whoosh(o, t, 0.7, 0.22, 450, 2600);
      whoosh(o, t + 0.12, 0.5, 0.12, 900, 3200);
    },
    poison(o, t, k) {
      bubbles(o, 10, t, 0.08, 180 * k, 480 * k);
      noise(o, { t, dur: 0.6, vol: 0.08, ft: "lowpass", f: 600, a: 0.1 });
    },
    dragon(o, t, k) {
      tone(o, { f: 120 * k, path: [[0.2, 150 * k], [0.8, 70 * k]], t, dur: 0.85, vol: 0.18, type: "sawtooth", lp: 900, vib: [11, 8], a: 0.06 });
      noise(o, { t, dur: 0.8, vol: 0.14, ft: "lowpass", f: 900, a: 0.08 });
    },
    bug(o, t, k) {
      tone(o, { f: 180 * k, t, dur: 0.6, vol: 0.1, type: "sawtooth", vib: [27, 25], lp: 1600, a: 0.05 });
    },
    fighting(o, t) {
      whoosh(o, t, 0.2, 0.18, 900, 3000);
      thud(o, t + 0.16, 0.3, 140);
    },
    none(o, t) {
      whoosh(o, t, 0.3, 0.15, 600, 2400);
    }
  };

  const hash = s => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  const seeded = seed => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  function defOf(id) {
    return (root.Pets && root.Pets.find && root.Pets.find(id)) || null;
  }
  function stageOf(id) {
    if (stageResolver) {
      const s = stageResolver(id);
      if (s) return Math.max(1, Math.min(3, s));
    }
    const list = (root.Pets && root.Pets.list) || [];
    let s = 1;
    let cur = id;
    for (let k = 0; k < 3; k++) {
      const prev = list.find(p => p.evolvesTo === cur || (p.evolveBranches && (p.evolveBranches.happy === cur || p.evolveBranches.sad === cur)));
      if (!prev) break;
      s += 1;
      cur = prev.id;
    }
    return Math.min(3, s);
  }
  const pitchOf = id => [1.25, 1, 0.74][stageOf(id) - 1];

  function cry(out, id, mood) {
    const r = seeded(hash(id || "x"));
    const def = defOf(id);
    const types = (def && def.types) || [];
    const st = stageOf(id);
    const k = [1.3, 1, 0.68][st - 1];
    const heavy = types.some(t => ["dragon", "dark", "rock", "ground", "steel", "fighting"].includes(t));
    let base = (240 + r() * 360) * k * (heavy ? 0.8 : 1);
    if (mood === "happy") base *= 1.15;
    if (mood === "sad") base *= 0.82;
    const waves = ["triangle", "sine", "square", "sawtooth"];
    let wave = waves[Math.floor(r() * 4)];
    if (types.includes("electric")) wave = "square";
    if (types.includes("ghost") || types.includes("water")) wave = "sine";
    if (heavy && st > 1) wave = "sawtooth";
    const syl = 1 + Math.floor(r() * 3) + (mood === "happy" ? 1 : 0) - (mood === "sad" ? 1 : 0);
    const len = (0.08 + r() * 0.08) * [0.85, 1, 1.35][st - 1];
    const shape = Math.floor(r() * 4);
    const vibR = 6 + r() * 10;
    const vibD = base * (0.01 + r() * 0.04) * (types.includes("water") ? 3 : 1);
    let t = 0;
    for (let i = 0; i < Math.max(1, syl); i++) {
      const j = 1 + (r() - 0.5) * 0.12;
      const f = base * j;
      const up = shape === 0 || (shape === 2 && i % 2 === 0) || mood === "happy";
      const f2 = mood === "sad" ? f * 0.7 : shape === 3 ? f * 1.02 : up ? f * 1.45 : f * 0.72;
      const d = len * (i === syl - 1 ? 1.4 : 1) * (mood === "sad" ? 1.6 : 1);
      tone(out, { f, f2, t, dur: d, vol: 0.2, type: wave, lp: Math.min(5000, f * 5), vib: [vibR, vibD], a: 0.012 });
      if (st === 3) tone(out, { f: f * 0.5, f2: f2 * 0.5, t, dur: d, vol: 0.1, type: "sawtooth", lp: f * 2, a: 0.02 });
      if (st === 3 && heavy) noise(out, { t, dur: d, vol: 0.06, ft: "lowpass", f: 700 });
      t += d + 0.025 + r() * 0.03;
    }
  }

  const S = {
    tap(o) {
      tone(o, { f: 760, f2: 540, dur: 0.05, vol: 0.11, type: "sine" });
      noise(o, { dur: 0.015, vol: 0.03, ft: "highpass", f: 4500 });
    },
    open(o) {
      tone(o, { f: 520, f2: 760, dur: 0.08, vol: 0.09, type: "triangle" });
      tone(o, { f: 780, f2: 1040, t: 0.05, dur: 0.08, vol: 0.06, type: "triangle" });
    },
    close(o) {
      tone(o, { f: 760, f2: 520, dur: 0.08, vol: 0.08, type: "triangle" });
      tone(o, { f: 560, f2: 420, t: 0.05, dur: 0.08, vol: 0.05, type: "triangle" });
    },
    coin(o) {
      tone(o, { f: 1568, dur: 0.08, vol: 0.09, type: "square", lp: 5000 });
      tone(o, { f: 2093, t: 0.07, dur: 0.32, vol: 0.09, type: "square", lp: 5000 });
    },
    coins(o) {
      for (let i = 0; i < 4; i++) {
        const t = i * 0.07 + rnd(0, 0.02);
        tone(o, { f: rnd(1900, 2500), t, dur: 0.14, vol: 0.06, type: "square", lp: 5000 });
      }
    },
    buy(o) {
      noise(o, { dur: 0.05, vol: 0.12, ft: "highpass", f: 3000 });
      S.coin(o);
      sparkle(o, 3, 0.15, 0.035);
    },
    sell(o) {
      tone(o, { f: 2093, dur: 0.08, vol: 0.08, type: "square", lp: 4500 });
      tone(o, { f: 1568, t: 0.07, dur: 0.2, vol: 0.08, type: "square", lp: 4500 });
    },
    deny(o) {
      tone(o, { f: 200, dur: 0.09, vol: 0.08, type: "square", lp: 1200 });
      tone(o, { f: 170, t: 0.11, dur: 0.12, vol: 0.08, type: "square", lp: 1200 });
    },
    toast(o) {
      bell(o, 1046, 0, 0.25, 0.05);
      bell(o, 1318, 0.07, 0.3, 0.05);
    },
    reward(o) {
      arp(o, [523, 659, 784, 1046], 0.08, 0.3, 0.1);
      sparkle(o, 5, 0.3, 0.04);
    },
    levelup(o) {
      arp(o, [523, 659, 784, 1046, 1318], 0.06, 0.22, 0.09, "square");
      [784, 1046, 1318].forEach(f => tone(o, { f, t: 0.34, dur: 0.6, vol: 0.06, type: "triangle" }));
      sparkle(o, 4, 0.4, 0.03);
    },
    pick(o) {
      tone(o, { f: 620, f2: 940, dur: 0.09, vol: 0.15, type: "triangle" });
    },
    drop(o) {
      tone(o, { f: 820, f2: 520, dur: 0.1, vol: 0.13, type: "triangle" });
    },
    give(o) {
      [1318, 1760, 2637].forEach((f, i) => bell(o, f, i * 0.06, 0.6, 0.06));
      sparkle(o, 4, 0.2, 0.035);
    },
    heal(o) {
      bubbles(o, 7, 0, 0.06, 500, 1100);
      arp(o, [784, 988, 1175, 1568], 0.07, 0.3, 0.05, "sine", 0.1);
    },
    crack(o, x) {
      const lv = x.level || 1;
      tone(o, { f: 200, f2: 90, dur: 0.09, vol: 0.18, type: "sine" });
      for (let i = 0; i < lv + 1; i++) noise(o, { t: 0.02 + i * 0.035, dur: 0.05, vol: 0.16, f: rnd(2200, 3800), q: 3 });
    },
    hatch(o) {
      tone(o, { f: 300, f2: 1300, dur: 0.12, vol: 0.14, type: "sine" });
      noise(o, { dur: 0.18, vol: 0.18, f: 2500, q: 0.7 });
      arp(o, [659, 784, 1046, 1318], 0.07, 0.35, 0.08, "triangle", 0.15);
      sparkle(o, 7, 0.3, 0.04);
    },
    eggClean(o) {
      for (let i = 0; i < 4; i++) noise(o, { t: i * 0.12, dur: 0.1, vol: 0.08, f: rnd(3000, 5000), q: 1.5, a: 0.03 });
    },
    eggPlay(o) {
      tone(o, { f: 300, f2: 520, dur: 0.12, vol: 0.1 });
      tone(o, { f: 360, f2: 620, t: 0.3, dur: 0.12, vol: 0.08 });
    },
    evolveCharge(o, x) {
      const d = x.dur || 4.5;
      const t0 = now();
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, t0);
      osc.frequency.exponentialRampToValueAtTime(880, t0 + d);
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(2, t0);
      lfo.frequency.linearRampToValueAtTime(18, t0 + d);
      const lg = ctx.createGain();
      lg.gain.value = 0.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.6);
      g.gain.setValueAtTime(0.08, t0 + d - 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      const trem = ctx.createGain();
      trem.gain.value = 0.5;
      lfo.connect(lg);
      lg.connect(trem.gain);
      osc.connect(trem);
      trem.connect(g);
      g.connect(o);
      osc.start(t0);
      lfo.start(t0);
      lfo.stop(t0 + d + 0.05);
      track(osc, t0 + d + 0.05);
      noise(o, { dur: d, vol: 0.05, ft: "highpass", f: 2000, f2: 7000, a: d * 0.8 });
      for (let i = 0; i < 8; i++) bell(o, rnd(1500, 3500), d * (0.3 + i * 0.08), 0.25, 0.025);
    },
    evolve(o) {
      noise(o, { dur: 0.6, vol: 0.18, f: 600, path: [[0.2, 4000], [0.6, 1200]], q: 0.6 });
      [523, 659, 784, 1046].forEach(f => tone(o, { f, t: 0.05, dur: 1.6, vol: 0.06, type: "triangle", a: 0.02 }));
      tone(o, { f: 1568, t: 0.05, dur: 1.4, vol: 0.03, type: "sine" });
      sparkle(o, 10, 0.1, 0.04);
    },
    whistle(o) {
      tone(o, { f: 1300, f2: 1900, dur: 0.16, vol: 0.08, type: "sine", vib: [12, 15] });
      tone(o, { f: 1200, f2: 2100, t: 0.24, dur: 0.22, vol: 0.08, type: "sine", vib: [12, 15] });
    },
    throw(o) {
      whoosh(o, 0, 0.3, 0.15, 700, 2600);
    },
    bounce(o, x) {
      const v = Math.min(1, x.v || 0.5);
      tone(o, { f: 180 + v * 60, f2: 100, dur: 0.1, vol: 0.1 + v * 0.2, type: "sine" });
      noise(o, { dur: 0.03, vol: 0.04 + v * 0.06, ft: "lowpass", f: 900 });
    },
    kick(o) {
      tone(o, { f: 160, f2: 70, dur: 0.12, vol: 0.22 });
      noise(o, { dur: 0.05, vol: 0.12, ft: "lowpass", f: 1500 });
    },
    splash(o) {
      noise(o, { dur: 0.45, vol: 0.2, ft: "lowpass", f: 2400, f2: 500 });
      bubbles(o, 5, 0.1, 0.05);
    },
    plop(o) {
      tone(o, { f: 340, f2: 150, dur: 0.09, vol: 0.16 });
    },
    heart(o) {
      tone(o, { f: 700, f2: 1000, dur: 0.1, vol: 0.05, type: "sine" });
      tone(o, { f: 1000, f2: 1320, t: 0.08, dur: 0.12, vol: 0.05, type: "sine" });
    },
    bang(o) {
      tone(o, { f: 1250, dur: 0.05, vol: 0.04, type: "square", lp: 3000 });
      tone(o, { f: 1650, t: 0.06, dur: 0.07, vol: 0.04, type: "square", lp: 3000 });
    },
    note(o) {
      tone(o, { f: 880, dur: 0.1, vol: 0.05, vib: [9, 10] });
      tone(o, { f: 1175, t: 0.11, dur: 0.15, vol: 0.05, vib: [9, 12] });
    },
    spark(o) {
      sparkle(o, 3, 0, 0.03);
    },
    sad(o) {
      tone(o, { f: 620, f2: 320, dur: 0.35, vol: 0.09, type: "sine", vib: [6, 8] });
    },
    whooshFx(o) {
      whoosh(o, 0, 0.45, 0.14, 400, 2000);
    },
    swing(o) {
      noise(o, { dur: 0.18, vol: 0.14, f: 1200, f2: 3200, q: 1.2, a: 0.08 });
    },
    impact(o, x) {
      const p = x.power || 1;
      tone(o, { f: 130, f2: 45, dur: 0.18, vol: 0.22 * p });
      noise(o, { dur: 0.09, vol: 0.18 * p, ft: "lowpass", f: 2200 });
      if (p > 1.2) noise(o, { t: 0.02, dur: 0.12, vol: 0.12, ft: "highpass", f: 2500 });
    },
    puff(o) {
      noise(o, { dur: 0.25, vol: 0.18, ft: "lowpass", f: 900, a: 0.05 });
    },
    miss(o) {
      noise(o, { dur: 0.22, vol: 0.2, f: 2000, f2: 5000, q: 2, a: 0.05 });
    },
    faint(o) {
      tone(o, { f: 620, f2: 110, dur: 0.85, vol: 0.12, type: "triangle", vib: [7, 10] });
      noise(o, { t: 0.5, dur: 0.3, vol: 0.12, ft: "lowpass", f: 500 });
    },
    statUp(o) {
      arp(o, [660, 880, 1175, 1568], 0.06, 0.15, 0.06, "square");
    },
    statDown(o) {
      arp(o, [1175, 880, 660, 494], 0.07, 0.16, 0.06, "square");
    },
    enter(o) {
      noise(o, { dur: 0.3, vol: 0.16, f: 3000, f2: 800, q: 0.8 });
      tone(o, { f: 440, f2: 1320, dur: 0.18, vol: 0.08, type: "triangle" });
    },
    recall(o) {
      tone(o, { f: 1320, f2: 330, dur: 0.4, vol: 0.08, type: "triangle" });
      noise(o, { dur: 0.35, vol: 0.08, f: 800, f2: 3000, q: 1 });
    },
    win(o) {
      arp(o, [523, 659, 784], 0.12, 0.2, 0.09, "square");
      [523, 659, 784, 1046].forEach(f => tone(o, { f, t: 0.38, dur: 0.9, vol: 0.06, type: "square", lp: 4000 }));
      sparkle(o, 6, 0.5, 0.035);
    },
    lose(o) {
      arp(o, [392, 349, 311], 0.25, 0.3, 0.08, "triangle");
      tone(o, { f: 262, t: 0.75, dur: 0.9, vol: 0.08, type: "triangle", vib: [5, 4] });
    },
    run(o) {
      for (let i = 0; i < 4; i++) noise(o, { t: i * 0.08, dur: 0.04, vol: 0.1, ft: "lowpass", f: 1200 });
      whoosh(o, 0.2, 0.3, 0.12, 800, 2600);
    }
  };

  const GAP = { tap: 0.04, bounce: 0.06, munch: 0.04, heart: 0.12, bang: 0.12, note: 0.15, spark: 0.15, sad: 0.2, cry: 0.18, coin: 0.05, crack: 0.05 };

  function play(name, x = {}) {
    if (!ready() || !S[name]) return;
    if (active > 90) return;
    const t = now();
    const gap = GAP[name] === undefined ? 0.03 : GAP[name];
    if (last[name] && t - last[name] < gap) return;
    last[name] = t;
    try {
      S[name](bus(x.vol, x.pan), x);
    } catch (e) {}
  }

  function playCry(id, x = {}) {
    if (!ready() || !id) return;
    const t = now();
    if (last.cry && t - last.cry < GAP.cry) return;
    last.cry = t;
    try {
      cry(bus(x.vol, x.pan), id, x.mood);
    } catch (e) {}
  }

  function later(sec, fn) {
    if (sec <= 0.01) fn();
    else setTimeout(fn, sec * 1000);
  }

  function special(def, x = {}) {
    if (!ready()) return;
    const types = (def && def.types) || [];
    const k = def ? pitchOf(def.id) : 1;
    const o = bus(x.vol, x.pan);
    try {
      (TYPE_FX[types[0]] || TYPE_FX.none)(o, 0, k);
      if (types[1] && TYPE_FX[types[1]]) TYPE_FX[types[1]](bus((x.vol === undefined ? 1 : x.vol) * 0.45, x.pan), 0.08, k);
    } catch (e) {}
  }

  function action(def, name, x = {}) {
    if (!ready() || !def) return;
    const act = def.actions && def.actions[name];
    const dur = (act && act.duration) || 1;
    const spec = def.battle && def.battle.special;
    const o = { pan: x.pan, vol: x.vol };
    const k = pitchOf(def.id);
    if (spec && spec.action === name) {
      const hit = (spec.hit || 0.5) * dur;
      later(Math.max(0, hit - 0.25), () => special(def, o));
      if (x.cry !== false) playCry(def.id, o);
      return;
    }
    if (name === "eat") {
      [0.31, 0.37, 0.51, 0.64, 0.78].forEach((p, i) => later(p * dur, () => munchAt(o, i === 0 ? 0.16 : 0.12)));
      later(0.9 * dur, () => playCry(def.id, { pan: o.pan, vol: o.vol, mood: "happy" }));
      return;
    }
    if (name === "jump" || name === "hop" || name === "bounce") {
      later(0.15 * dur, () => play("jumpUp", { pan: o.pan, vol: o.vol, k }));
      later(0.78 * dur, () => play("land", { pan: o.pan, vol: o.vol, k }));
      if (x.cry) playCry(def.id, { pan: o.pan, vol: o.vol, mood: "happy" });
      return;
    }
    if (name === "spin" || name === "roll" || name === "twirl") {
      later(0.1 * dur, () => play("whooshFx", o));
      if (x.cry) playCry(def.id, o);
      return;
    }
    if (name === "attack") {
      later(0.25 * dur, () => play("swing", o));
      later(0.45 * dur, () => play("impact", { pan: o.pan, vol: (o.vol || 1) * 0.7 }));
      return;
    }
    if (/wobble|shake|wiggle|shiver/.test(name)) {
      later(0.05 * dur, () => play("wobbleFx", { pan: o.pan, vol: o.vol, k }));
      if (x.cry) playCry(def.id, o);
      return;
    }
    playCry(def.id, { pan: o.pan, vol: o.vol, mood: x.mood });
  }

  function munchAt(o, vol) {
    if (!ready()) return;
    const t = now();
    if (last.munch && t - last.munch < GAP.munch) return;
    last.munch = t;
    munch(bus(o.vol, o.pan), 0, vol);
  }

  S.jumpUp = (o, x) => tone(o, { f: 240 / (x.k || 1), f2: 560 / (x.k || 1), dur: 0.14, vol: 0.09, type: "sine" });
  S.land = (o, x) => thud(o, 0, 0.1 * (x.k ? 1 / x.k : 1), 110 * (x.k || 1));
  S.wobbleFx = (o, x) => tone(o, { f: 380 / (x.k || 1), dur: 0.55, vol: 0.06, type: "triangle", vib: [9, 40] });

  function battleMove(def, o, x = {}) {
    if (!ready()) return;
    if (o.cat === "phys") play("swing", x);
    else {
      const k = def ? pitchOf(def.id) : 1;
      const out = bus(x.vol, x.pan);
      try {
        (TYPE_FX[o.type] || TYPE_FX.none)(out, 0, k);
      } catch (e) {}
    }
  }

  function setEnabled(v) {
    on = !!v;
    try {
      root.localStorage.setItem(KEY, on ? "1" : "0");
    } catch (e) {}
    if (on) init();
    else if (ctx) ctx.suspend().catch(() => {});
    listeners.forEach(fn => fn(on));
  }

  root.Sfx = {
    play,
    cry: playCry,
    action,
    special,
    battleMove,
    typeFx: (type, x = {}) => {
      if (!ready()) return;
      try {
        (TYPE_FX[type] || TYPE_FX.none)(bus(x.vol, x.pan), 0, x.k || 1);
      } catch (e) {}
    },
    enabled: () => on,
    setEnabled,
    toggle: () => setEnabled(!on),
    onChange: fn => listeners.push(fn),
    setStageResolver: fn => (stageResolver = fn),
    unlock: init
  };
})(typeof window !== "undefined" ? window : self);
