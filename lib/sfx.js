(function (root) {
  const KEY = "mythlings.sfx";
  let on = true;
  try {
    on = root.localStorage.getItem(KEY) !== "0";
  } catch (e) {}
  let ctx = null;
  let master = null;
  let verbIn = null;
  let noiseBuf = null;
  let pinkBuf = null;
  let active = 0;
  const last = {};
  let stageResolver = null;
  const listeners = [];

  function impulse(sec, decay) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * sec);
    const pre = Math.floor(sr * 0.012);
    const b = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let lp = 0;
      for (let i = pre; i < len; i++) {
        const k = (i - pre) / (len - pre);
        const damp = 0.15 + 0.8 * k;
        lp += (Math.random() * 2 - 1 - lp) * (1 - damp);
        d[i] = lp * Math.pow(1 - k, decay);
      }
      [0.017, 0.029, 0.041, 0.053].forEach((s, i) => {
        const at = Math.floor(sr * (s + c * 0.004));
        if (at < len) d[at] += (0.5 - i * 0.1) * (c ? -1 : 1);
      });
    }
    return b;
  }

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
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 32;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3;
    lim.knee.value = 0;
    lim.ratio.value = 20;
    lim.attack.value = 0.001;
    lim.release.value = 0.08;
    const out = ctx.createGain();
    out.gain.value = 1.15;
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(hp);
    hp.connect(comp);
    comp.connect(out);
    out.connect(lim);
    lim.connect(ctx.destination);
    const verb = ctx.createConvolver();
    verb.buffer = impulse(1.9, 3.4);
    verbIn = ctx.createGain();
    verbIn.gain.value = 1;
    const vlp = ctx.createBiquadFilter();
    vlp.type = "lowpass";
    vlp.frequency.value = 5200;
    const vhp = ctx.createBiquadFilter();
    vhp.type = "highpass";
    vhp.frequency.value = 220;
    const vout = ctx.createGain();
    vout.gain.value = 0.62;
    verbIn.connect(vhp);
    vhp.connect(vlp);
    vlp.connect(verb);
    verb.connect(vout);
    vout.connect(master);
    const len = Math.floor(ctx.sampleRate * 2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    pinkBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    const p = pinkBuf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      d[i] = w;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
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
  const N = n => 440 * Math.pow(2, (n - 69) / 12);

  function bus(vol, pan, wet) {
    const g = ctx.createGain();
    g.gain.value = vol === undefined ? 1 : vol;
    let tail = g;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p);
      tail = p;
    }
    tail.connect(master);
    const w = wet === undefined ? 0.18 : wet;
    if (w > 0 && verbIn) {
      const s = ctx.createGain();
      s.gain.value = w;
      tail.connect(s);
      s.connect(verbIn);
    }
    return g;
  }

  function sub(out, pan) {
    if (!pan || !ctx.createStereoPanner) return out;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(out);
    return p;
  }

  function env(param, t0, a, dur, v, hold) {
    param.setValueAtTime(0.0001, t0);
    param.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + Math.max(0.002, a));
    if (hold) param.setValueAtTime(Math.max(0.0002, v), t0 + Math.max(a + 0.003, dur * hold));
    param.exponentialRampToValueAtTime(0.0001, t0 + Math.max(a + 0.01, dur));
  }

  function track(node, end) {
    active += 1;
    node.onended = () => (active -= 1);
    node.stop(end);
  }

  function tone(out, o) {
    const t0 = now() + (o.t || 0);
    const g = ctx.createGain();
    env(g.gain, t0, o.a || 0.005, o.dur, o.vol || 0.2, o.hold);
    let head = g;
    if (o.lp || o.fenv) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.Q.value = o.q || 0.7;
      if (o.fenv) {
        f.frequency.setValueAtTime(o.fenv[0], t0);
        f.frequency.exponentialRampToValueAtTime(o.fenv[1], t0 + o.fenv[2]);
        if (o.fenv[3]) f.frequency.exponentialRampToValueAtTime(o.fenv[3], t0 + o.dur);
      } else f.frequency.value = o.lp;
      f.connect(g);
      head = f;
    }
    g.connect(sub(out, o.pan));
    const voices = o.uni || 1;
    const spread = o.spread || 12;
    for (let u = 0; u < voices; u++) {
      const osc = ctx.createOscillator();
      osc.type = o.type || "sine";
      osc.frequency.setValueAtTime(o.f, t0);
      if (o.path) o.path.forEach(([dt, f]) => osc.frequency.exponentialRampToValueAtTime(Math.max(20, f), t0 + dt));
      else if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + (o.glide || o.dur));
      osc.detune.value = (o.detune || 0) + (voices > 1 ? (u / (voices - 1) - 0.5) * 2 * spread : 0);
      if (o.vib) {
        const l = ctx.createOscillator();
        const lg = ctx.createGain();
        l.frequency.setValueAtTime(o.vib[0], t0);
        if (o.vib[2]) l.frequency.linearRampToValueAtTime(o.vib[2], t0 + o.dur);
        lg.gain.setValueAtTime(o.vibA ? 0 : o.vib[1], t0);
        if (o.vibA) lg.gain.linearRampToValueAtTime(o.vib[1], t0 + o.vibA);
        l.connect(lg);
        lg.connect(osc.frequency);
        l.start(t0);
        l.stop(t0 + o.dur + 0.05);
      }
      const ug = ctx.createGain();
      ug.gain.value = 1 / Math.sqrt(voices);
      osc.connect(ug);
      ug.connect(head);
      osc.start(t0);
      track(osc, t0 + o.dur + 0.05);
    }
  }

  function noise(out, o) {
    const t0 = now() + (o.t || 0);
    const src = ctx.createBufferSource();
    src.buffer = o.pink ? pinkBuf : noiseBuf;
    src.loop = true;
    if (o.rate) src.playbackRate.value = o.rate;
    const f = ctx.createBiquadFilter();
    f.type = o.ft || "bandpass";
    f.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.path) o.path.forEach(([dt, v]) => f.frequency.exponentialRampToValueAtTime(Math.max(20, v), t0 + dt));
    else if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    env(g.gain, t0, o.a || 0.004, o.dur, o.vol || 0.2, o.hold);
    src.connect(f);
    f.connect(g);
    let tail = g;
    if (o.am) {
      const am = ctx.createGain();
      am.gain.value = 1 - o.am[1];
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.frequency.value = o.am[0];
      lg.gain.value = o.am[1];
      l.connect(lg);
      lg.connect(am.gain);
      l.start(t0);
      l.stop(t0 + o.dur + 0.05);
      g.connect(am);
      tail = am;
    }
    if (o.panPath && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(o.panPath[0], t0);
      p.pan.linearRampToValueAtTime(o.panPath[1], t0 + o.dur);
      tail.connect(p);
      p.connect(out);
    } else tail.connect(sub(out, o.pan));
    src.start(t0, Math.random() * 1.5);
    track(src, t0 + o.dur + 0.05);
  }

  const INST = {
    marimba: { r: [1, 3.93, 9.2], d: [0.55, 0.14, 0.05], g: [1, 0.22, 0.06], click: 0.12 },
    glock: { r: [1, 2.76, 5.4, 8.93], d: [1.3, 0.45, 0.2, 0.1], g: [1, 0.4, 0.2, 0.1], click: 0.05 },
    kalimba: { r: [1, 5.95, 10.2], d: [0.85, 0.09, 0.04], g: [1, 0.3, 0.1], click: 0.08 },
    wood: { r: [1, 2.57, 4.9], d: [0.07, 0.035, 0.02], g: [1, 0.45, 0.2], click: 0.3 },
    coin: { r: [1, 2.32, 4.25, 6.63, 9.38], d: [0.42, 0.3, 0.2, 0.13, 0.08], g: [1, 0.65, 0.45, 0.3, 0.18], click: 0.18 },
    bell: { r: [0.5, 1, 1.19, 1.51, 2, 2.52, 3.01], d: [1.6, 1.3, 0.9, 0.8, 0.6, 0.4, 0.3], g: [0.35, 1, 0.5, 0.4, 0.3, 0.2, 0.12], click: 0.04 },
    glass: { r: [1, 2.32, 4.1, 6.2], d: [0.9, 0.5, 0.25, 0.12], g: [1, 0.5, 0.3, 0.2], click: 0.06 },
    clang: { r: [1, 1.58, 2.42, 3.37, 4.73, 6.1], d: [0.9, 0.7, 0.5, 0.35, 0.25, 0.15], g: [1, 0.8, 0.6, 0.45, 0.3, 0.2], click: 0.3 }
  };

  function strike(out, inst, f, t = 0, vol = 0.1, o = {}) {
    const I = INST[inst];
    const t0 = now() + t;
    const len = o.len || 1;
    const dest = sub(out, o.pan);
    I.r.forEach((m, i) => {
      const fr = f * m;
      if (fr > 16000) return;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(fr, t0);
      if (o.bend) osc.frequency.exponentialRampToValueAtTime(fr * o.bend, t0 + I.d[i] * len);
      const g = ctx.createGain();
      env(g.gain, t0, 0.0015, I.d[i] * len, vol * I.g[i]);
      osc.connect(g);
      g.connect(dest);
      osc.start(t0);
      track(osc, t0 + I.d[i] * len + 0.05);
    });
    if (I.click) noise(dest, { t, dur: 0.012, vol: vol * I.click * 2, f: Math.min(9000, f * 3), q: 1.2, a: 0.001 });
  }

  const VOW = { a: [760, 1150, 2500], e: [450, 1900, 2600], i: [300, 2250, 3000], o: [500, 860, 2450], u: [340, 720, 2300], m: [280, 1000, 2200] };

  function voice(out, o) {
    const t0 = now() + (o.t || 0);
    const dur = o.dur;
    const size = o.size || 1;
    const g = ctx.createGain();
    env(g.gain, t0, o.a || 0.025, dur, o.vol || 0.2, 0.55);
    let tail = g;
    if (o.growl) {
      const am = ctx.createGain();
      am.gain.value = 1 - o.growl[1];
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.type = "triangle";
      l.frequency.value = o.growl[0];
      lg.gain.value = o.growl[1];
      l.connect(lg);
      lg.connect(am.gain);
      l.start(t0);
      l.stop(t0 + dur + 0.05);
      g.connect(am);
      tail = am;
    }
    tail.connect(sub(out, o.pan));
    const lpv = ctx.createBiquadFilter();
    lpv.type = "lowpass";
    lpv.frequency.value = Math.min(9000, 3800 * size);
    lpv.Q.value = 0.5;
    lpv.connect(g);
    const v1 = VOW[o.v1 || "a"];
    const v2 = VOW[o.v2 || o.v1 || "a"];
    const fs = [0, 1, 2].map(i => {
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = [5, 8, 10][i] * (o.qk || 1);
      f.frequency.setValueAtTime(v1[i] * size, t0);
      f.frequency.exponentialRampToValueAtTime(v2[i] * size, t0 + dur * 0.8);
      const fg = ctx.createGain();
      fg.gain.value = [1.4, 0.8, 0.35][i];
      f.connect(fg);
      fg.connect(lpv);
      return f;
    });
    const body = ctx.createBiquadFilter();
    body.type = "lowpass";
    body.frequency.value = Math.min(1800, o.f * 3);
    const bg = ctx.createGain();
    bg.gain.value = 0.18;
    body.connect(bg);
    bg.connect(lpv);
    const osc = ctx.createOscillator();
    osc.type = o.wave || "sawtooth";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.path) o.path.forEach(([dt, f]) => osc.frequency.exponentialRampToValueAtTime(Math.max(30, f), t0 + dt * dur));
    else if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t0 + dur * 0.9);
    const l = ctx.createOscillator();
    const lg = ctx.createGain();
    l.frequency.value = o.vib ? o.vib[0] : 6;
    lg.gain.setValueAtTime(0, t0);
    lg.gain.linearRampToValueAtTime(o.vib ? o.vib[1] : o.f * 0.015, t0 + dur * 0.4);
    l.connect(lg);
    lg.connect(osc.frequency);
    l.start(t0);
    l.stop(t0 + dur + 0.05);
    fs.forEach(f => osc.connect(f));
    osc.connect(body);
    osc.start(t0);
    track(osc, t0 + dur + 0.05);
    if (o.breath) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const ng = ctx.createGain();
      ng.gain.value = o.breath;
      src.connect(ng);
      fs.forEach(f => ng.connect(f));
      src.start(t0, Math.random());
      track(src, t0 + dur + 0.05);
    }
  }

  const sparkle = (out, n, t = 0, vol = 0.05, lo = 2400, hi = 5200) => {
    for (let i = 0; i < n; i++) strike(out, "glock", rnd(lo, hi), t + i * rnd(0.035, 0.07), vol * rnd(0.6, 1), { pan: rnd(-0.6, 0.6), len: 0.6 });
  };
  const play8 = (out, inst, notes, step, vol, t = 0, o = {}) => notes.forEach((n, i) => n && strike(out, inst, N(n), t + i * step, vol, o));
  const pad = (out, notes, t, dur, vol, o = {}) => {
    notes.forEach((n, i) =>
      tone(out, { f: N(n), t, dur, vol: vol / notes.length, type: o.type || "sawtooth", uni: 3, spread: o.spread || 9, a: o.a || dur * 0.3, hold: 0.6, fenv: o.fenv || [600, 2600, dur * 0.5, 900], pan: (i / Math.max(1, notes.length - 1) - 0.5) * 0.6 })
    );
  };
  const brass = (out, notes, t, dur, vol) => {
    notes.forEach((n, i) => tone(out, { f: N(n), t, dur, vol: vol / notes.length, type: "sawtooth", uni: 2, spread: 7, a: 0.03, hold: 0.7, fenv: [500, 3800, 0.08, 1400], q: 1.2, vib: [5.5, N(n) * 0.006], vibA: dur * 0.6, pan: (i / Math.max(1, notes.length - 1) - 0.5) * 0.5 }));
  };
  const thud = (out, t, vol, f = 120) => {
    tone(out, { f: f * 1.6, f2: f * 0.45, glide: 0.12, t, dur: 0.22, vol, type: "sine", a: 0.002 });
    noise(out, { t, dur: 0.05, vol: vol * 0.55, ft: "lowpass", f: 2200, a: 0.001 });
    noise(out, { t, dur: 0.14, vol: vol * 0.35, f: f * 3, q: 1.5, pink: true, a: 0.003 });
  };
  const whoosh = (out, t, dur, vol, lo = 500, hi = 2400, pan) => {
    noise(out, { t, dur, vol, f: lo, path: [[dur * 0.45, hi], [dur, lo * 0.8]], q: 1.2, a: dur * 0.4, pink: true, panPath: pan || [rnd(-0.5, -0.2), rnd(0.2, 0.5)] });
    noise(out, { t: t + dur * 0.1, dur: dur * 0.8, vol: vol * 0.35, ft: "highpass", f: hi * 1.4, a: dur * 0.35 });
  };
  const munch = (out, t, vol) => {
    noise(out, { t, dur: 0.05, vol, f: rnd(1200, 2000), q: 1.4, a: 0.002 });
    noise(out, { t: t + 0.02, dur: 0.04, vol: vol * 0.8, f: rnd(2600, 3800), q: 2.5, a: 0.002 });
    noise(out, { t: t + 0.045, dur: 0.035, vol: vol * 0.5, f: rnd(1800, 2600), q: 3, a: 0.002 });
    tone(out, { f: rnd(160, 210), f2: 80, t, dur: 0.07, vol: vol * 0.7, a: 0.002 });
  };
  const bubble = (out, t, vol, f) => {
    tone(out, { f, f2: f * 2.2, glide: 0.05, t, dur: 0.06, vol, type: "sine", a: 0.002 });
  };
  const bubbles = (out, n, t, vol, lo = 300, hi = 900) => {
    for (let i = 0; i < n; i++) bubble(out, t + i * rnd(0.035, 0.085), vol * rnd(0.6, 1), rnd(lo, hi));
  };
  const crackle = (out, n, t, span, vol, lo = 1500, hi = 6000) => {
    for (let i = 0; i < n; i++) noise(out, { t: t + rnd(0, span), dur: rnd(0.006, 0.02), vol: vol * rnd(0.4, 1), f: rnd(lo, hi), q: rnd(2, 6), a: 0.001, pan: rnd(-0.6, 0.6) });
  };

  const TYPE_FX = {
    fire(o, t, k) {
      noise(o, { t, dur: 0.12, vol: 0.32, ft: "lowpass", f: 200, f2: 1600, a: 0.005, pink: true });
      noise(o, { t, dur: 0.9, vol: 0.34, ft: "lowpass", f: 400, path: [[0.22, 2600], [0.9, 500]], a: 0.1, pink: true, am: [9, 0.35] });
      tone(o, { f: 75 * k, f2: 48, t, dur: 0.8, vol: 0.18, type: "sawtooth", lp: 260, a: 0.04 });
      crackle(o, 22, t + 0.05, 0.75, 0.2, 1800, 7000);
    },
    water(o, t, k) {
      noise(o, { t, dur: 0.75, vol: 0.3, f: 450, path: [[0.2, 1800], [0.75, 400]], q: 0.7, a: 0.04, pink: true, panPath: [-0.4, 0.4] });
      noise(o, { t: t + 0.18, dur: 0.4, vol: 0.18, ft: "highpass", f: 3500, a: 0.01 });
      bubbles(o, 12, t + 0.08, 0.07, 350 * k, 1100 * k);
      tone(o, { f: 160 * k, f2: 90, t, dur: 0.35, vol: 0.1, type: "sine", a: 0.01 });
    },
    ice(o, t, k) {
      noise(o, { t, dur: 0.8, vol: 0.12, ft: "highpass", f: 6000, a: 0.15 });
      for (let i = 0; i < 12; i++) strike(o, "glass", rnd(1800, 4600) * k, t + i * 0.045, 0.05, { pan: rnd(-0.7, 0.7) });
      tone(o, { f: 800 * k, f2: 2000 * k, t, dur: 0.6, vol: 0.04, type: "triangle", a: 0.1 });
      crackle(o, 8, t + 0.45, 0.25, 0.18, 2500, 8000);
    },
    electric(o, t, k) {
      tone(o, { f: 60 * k, t, dur: 0.65, vol: 0.12, type: "sawtooth", vib: [41, 70], lp: 3200, uni: 2, spread: 30 });
      tone(o, { f: 120 * k, t: t + 0.04, dur: 0.55, vol: 0.06, type: "square", vib: [27, 260], lp: 4000 });
      for (let i = 0; i < 9; i++) {
        const tt = t + rnd(0, 0.55);
        noise(o, { t: tt, dur: rnd(0.02, 0.05), vol: 0.18, f: rnd(2500, 6000), q: 4, a: 0.001, pan: rnd(-0.7, 0.7) });
        tone(o, { f: rnd(1500, 3000), f2: rnd(300, 600), t: tt, dur: 0.04, vol: 0.04, type: "square", lp: 5000 });
      }
    },
    grass(o, t, k) {
      for (let i = 0; i < 7; i++) noise(o, { t: t + i * 0.07, dur: 0.16, vol: 0.12, f: rnd(2200, 4800), q: 0.8, a: 0.03, pink: true, pan: rnd(-0.7, 0.7) });
      play8(o, "kalimba", [72, 76, 79], 0.08, 0.06 / k, t + 0.05);
      tone(o, { f: 500, f2: 900, t, dur: 0.45, vol: 0.03, type: "sine", a: 0.08 });
    },
    psychic(o, t, k) {
      tone(o, { f: 300 * k, f2: 760 * k, t, dur: 0.9, vol: 0.08, type: "sine", vib: [5, 50, 14], a: 0.18 });
      tone(o, { f: 302 * k, f2: 770 * k, t, dur: 0.9, vol: 0.07, type: "triangle", vib: [7, 45, 16], a: 0.22, pan: 0.4 });
      noise(o, { t, dur: 0.9, vol: 0.12, f: 400, path: [[0.45, 3200], [0.9, 900]], q: 6, a: 0.2, panPath: [0.5, -0.5] });
      play8(o, "glass", [84, 91], 0.25, 0.04, t + 0.2);
    },
    dark(o, t, k) {
      tone(o, { f: 80 * k, f2: 42, t, dur: 0.8, vol: 0.2, type: "sawtooth", lp: 340, a: 0.06, uni: 2, spread: 20 });
      voice(o, { f: 90 * k, f2: 60, t: t + 0.05, dur: 0.6, vol: 0.12, v1: "o", v2: "u", size: 0.7, growl: [32, 0.5], breath: 0.3 });
      whoosh(o, t, 0.6, 0.14, 180, 700);
    },
    light(o, t, k) {
      [79, 84, 88, 91].forEach((n, i) => strike(o, "bell", N(n) * k, t + i * 0.05, 0.06, { pan: (i - 1.5) * 0.25 }));
      pad(o, [72, 76, 79, 84], t, 1, 0.08, { type: "triangle", fenv: [1500, 4000, 0.4, 2000] });
      sparkle(o, 8, t + 0.1, 0.04);
    },
    ghost(o, t, k) {
      tone(o, { f: 440 * k, path: [[0.3, 320 * k], [0.9, 600 * k]], t, dur: 1, vol: 0.08, type: "sine", vib: [5, 22], a: 0.25 });
      voice(o, { f: 220 * k, path: [[0.5, 180 * k], [1, 260 * k]], t, dur: 1, vol: 0.06, v1: "u", v2: "o", size: 1.1, breath: 0.9, wave: "triangle" });
      noise(o, { t, dur: 1, vol: 0.06, ft: "lowpass", f: 700, a: 0.35, pink: true, panPath: [-0.6, 0.6] });
    },
    rock(o, t, k) {
      noise(o, { t, dur: 0.8, vol: 0.3, ft: "lowpass", f: 300, a: 0.05, pink: true, am: [14, 0.4] });
      [0, 0.14, 0.3].forEach(d => {
        thud(o, t + d, 0.24, 85 * k);
        crackle(o, 4, t + d, 0.05, 0.16, 800, 3000);
      });
    },
    ground(o, t, k) {
      noise(o, { t, dur: 1, vol: 0.34, ft: "lowpass", f: 200, a: 0.12, pink: true, am: [11, 0.5] });
      tone(o, { f: 52 * k, f2: 34, t, dur: 0.9, vol: 0.26, type: "sine", vib: [8, 5] });
      crackle(o, 10, t + 0.1, 0.7, 0.1, 500, 2000);
    },
    steel(o, t, k) {
      strike(o, "clang", 330 * k, t, 0.12);
      strike(o, "clang", 495 * k, t + 0.02, 0.06, { pan: 0.3 });
      noise(o, { t, dur: 0.06, vol: 0.18, ft: "highpass", f: 3000, a: 0.001 });
      tone(o, { f: 1320 * k, t: t + 0.03, dur: 0.9, vol: 0.02, type: "sine", vib: [6, 8] });
    },
    flying(o, t) {
      whoosh(o, t, 0.75, 0.22, 400, 2600, [-0.7, 0.7]);
      whoosh(o, t + 0.12, 0.55, 0.13, 900, 3400, [0.6, -0.6]);
      noise(o, { t: t + 0.05, dur: 0.4, vol: 0.06, f: 300, q: 1, am: [18, 0.7], pink: true });
    },
    poison(o, t, k) {
      bubbles(o, 14, t, 0.08, 150 * k, 420 * k);
      noise(o, { t, dur: 0.7, vol: 0.1, ft: "lowpass", f: 600, a: 0.12, pink: true });
      noise(o, { t: t + 0.25, dur: 0.45, vol: 0.06, ft: "highpass", f: 4000, a: 0.08 });
    },
    dragon(o, t, k) {
      voice(o, { f: 110 * k, path: [[0.25, 150 * k], [1, 70 * k]], t, dur: 0.95, vol: 0.2, v1: "a", v2: "o", size: 0.75, growl: [38, 0.55], breath: 0.5 });
      tone(o, { f: 55 * k, f2: 40, t, dur: 0.9, vol: 0.14, type: "sawtooth", lp: 220, a: 0.05 });
      noise(o, { t, dur: 0.9, vol: 0.16, ft: "lowpass", f: 900, a: 0.08, pink: true });
    },
    bug(o, t, k) {
      tone(o, { f: 190 * k, t, dur: 0.65, vol: 0.09, type: "sawtooth", vib: [29, 22], lp: 1800, a: 0.05, uni: 2, spread: 25 });
      noise(o, { t, dur: 0.65, vol: 0.08, f: 3200, q: 2, am: [55, 0.8], a: 0.05 });
    },
    fighting(o, t) {
      whoosh(o, t, 0.2, 0.18, 900, 3200);
      thud(o, t + 0.17, 0.32, 140);
      noise(o, { t: t + 0.17, dur: 0.05, vol: 0.2, f: 1500, q: 0.8, a: 0.001 });
    },
    none(o, t) {
      whoosh(o, t, 0.32, 0.16, 600, 2600);
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
    const k = [1.35, 1, 0.66][st - 1];
    const heavy = types.some(t => ["dragon", "dark", "rock", "ground", "steel", "fighting"].includes(t));
    const airy = types.some(t => ["ghost", "flying", "psychic", "light"].includes(t));
    let base = (230 + r() * 330) * k * (heavy ? 0.78 : 1);
    if (mood === "happy") base *= 1.12;
    if (mood === "sad") base *= 0.85;
    const vows = ["a", "e", "i", "o", "u", "m"];
    const va = vows[Math.floor(r() * vows.length)];
    const vb = vows[Math.floor(r() * vows.length)];
    let wave = ["sawtooth", "square", "triangle"][Math.floor(r() * 3)];
    if (types.includes("ghost") || types.includes("water")) wave = "triangle";
    if (types.includes("electric")) wave = "square";
    const size = (1.35 - (st - 1) * 0.25) * (heavy ? 0.85 : 1) * (0.92 + r() * 0.16);
    const syl = Math.max(1, 1 + Math.floor(r() * 3) + (mood === "happy" ? 1 : 0) - (mood === "sad" ? 1 : 0));
    const len = (0.11 + r() * 0.08) * [0.85, 1, 1.3][st - 1];
    const shape = Math.floor(r() * 4);
    const vibR = 5 + r() * 9;
    const vibD = base * (0.012 + r() * 0.03) * (types.includes("water") ? 2.5 : 1);
    const growl = heavy && st > 1 ? [28 + r() * 25, 0.35 + 0.2 * (st - 2)] : null;
    let t = 0;
    for (let i = 0; i < syl; i++) {
      const j = 1 + (r() - 0.5) * 0.14;
      const f = base * j;
      const up = shape === 0 || (shape === 2 && i % 2 === 0) || mood === "happy";
      const f2 = mood === "sad" ? f * 0.68 : shape === 3 ? f * 1.04 : up ? f * 1.38 : f * 0.74;
      const d = len * (i === syl - 1 ? 1.45 : 1) * (mood === "sad" ? 1.6 : 1);
      voice(out, { f, path: [[0.3, f * (up ? 1.08 : 1.02)], [1, f2]], t, dur: d, vol: 0.24, v1: i % 2 ? vb : va, v2: i % 2 ? va : vb, size, wave, vib: [vibR, vibD], breath: airy ? 0.7 : 0.18, growl, a: 0.018 });
      if (st === 3) voice(out, { f: f * 0.5, f2: f2 * 0.5, t, dur: d, vol: 0.1, v1: "o", v2: "u", size: size * 0.8, wave: "sawtooth", growl, a: 0.03 });
      if (types.includes("electric")) crackle(out, 3, t, d, 0.05, 3000, 7000);
      t += d + 0.03 + r() * 0.03;
    }
  }

  const S = {
    tap(o) {
      strike(o, "wood", 1250, 0, 0.12);
    },
    open(o) {
      strike(o, "marimba", N(79), 0, 0.12);
      strike(o, "marimba", N(84), 0.06, 0.1);
      noise(o, { dur: 0.16, vol: 0.04, f: 1200, f2: 3500, q: 0.8, a: 0.05, pink: true });
    },
    close(o) {
      strike(o, "marimba", N(84), 0, 0.1);
      strike(o, "marimba", N(79), 0.06, 0.1);
      noise(o, { dur: 0.14, vol: 0.035, f: 3000, f2: 1000, q: 0.8, a: 0.03, pink: true });
    },
    coin(o) {
      strike(o, "coin", 2350, 0, 0.11);
      strike(o, "coin", 3140, 0.075, 0.12, { len: 1.6 });
      sparkle(o, 2, 0.12, 0.025, 4500, 6500);
    },
    coins(o) {
      for (let i = 0; i < 7; i++) strike(o, "coin", rnd(2100, 3900), i * rnd(0.04, 0.07), rnd(0.05, 0.09), { pan: rnd(-0.5, 0.5), len: rnd(0.6, 1) });
      noise(o, { dur: 0.35, vol: 0.05, ft: "highpass", f: 5000, a: 0.02 });
      strike(o, "coin", 3520, 0.38, 0.08, { len: 1.6 });
    },
    buy(o) {
      noise(o, { dur: 0.08, vol: 0.12, f: 2500, q: 0.8, a: 0.002 });
      strike(o, "wood", 700, 0, 0.1);
      S.coin(o);
      strike(o, "bell", N(96), 0.2, 0.04);
    },
    sell(o) {
      strike(o, "coin", 3140, 0, 0.1);
      strike(o, "coin", 2350, 0.08, 0.1, { len: 1.4 });
    },
    deny(o) {
      strike(o, "marimba", N(52), 0, 0.16);
      strike(o, "marimba", N(51), 0.1, 0.16);
      tone(o, { f: N(40), t: 0.1, dur: 0.16, vol: 0.05, type: "square", lp: 500 });
    },
    toast(o) {
      strike(o, "glock", N(84), 0, 0.07);
      strike(o, "glock", N(88), 0.07, 0.07);
    },
    reward(o) {
      play8(o, "glock", [72, 76, 79, 84], 0.075, 0.08);
      play8(o, "marimba", [60, 64, 67, 72], 0.075, 0.08);
      pad(o, [60, 64, 67, 72], 0.28, 0.9, 0.09, { type: "triangle" });
      sparkle(o, 6, 0.3, 0.04);
    },
    levelup(o) {
      play8(o, "marimba", [67, 72, 76, 79, 84], 0.055, 0.1);
      play8(o, "glock", [79, 84, 88, 91, 96], 0.055, 0.05);
      brass(o, [60, 67, 72, 76], 0.3, 0.75, 0.22);
      tone(o, { f: N(48), t: 0.3, dur: 0.7, vol: 0.1, type: "triangle", a: 0.02 });
      sparkle(o, 6, 0.35, 0.035);
    },
    pick(o) {
      tone(o, { f: 520, f2: 980, glide: 0.07, dur: 0.1, vol: 0.12, type: "sine", a: 0.003 });
      strike(o, "wood", 1500, 0, 0.05);
    },
    drop(o) {
      tone(o, { f: 900, f2: 480, glide: 0.08, dur: 0.11, vol: 0.11, type: "sine", a: 0.003 });
      strike(o, "wood", 900, 0.06, 0.06);
    },
    give(o) {
      [88, 91, 96].forEach((n, i) => strike(o, "bell", N(n), i * 0.06, 0.06, { pan: (i - 1) * 0.3 }));
      sparkle(o, 5, 0.18, 0.035);
    },
    heal(o) {
      bubbles(o, 8, 0, 0.06, 500, 1300);
      pad(o, [67, 71, 74, 79], 0.05, 1, 0.08, { type: "triangle", fenv: [800, 3000, 0.5, 1500] });
      play8(o, "glock", [79, 83, 86, 91], 0.07, 0.05, 0.12);
    },
    crack(o, x) {
      const lv = x.level || 1;
      thud(o, 0, 0.08, 220);
      for (let i = 0; i < lv + 2; i++) noise(o, { t: 0.015 + i * 0.028, dur: rnd(0.012, 0.03), vol: 0.18, f: rnd(2500, 6000), q: rnd(3, 7), a: 0.001, pan: rnd(-0.3, 0.3) });
    },
    hatch(o) {
      noise(o, { dur: 0.12, vol: 0.2, f: 3000, q: 0.8, a: 0.001 });
      crackle(o, 8, 0, 0.12, 0.2, 2500, 7000);
      tone(o, { f: 260, f2: 1300, glide: 0.1, dur: 0.15, vol: 0.12, type: "sine" });
      play8(o, "marimba", [67, 72, 76, 79, 84], 0.07, 0.1, 0.15);
      pad(o, [60, 67, 72, 76], 0.45, 1.1, 0.08, { type: "triangle" });
      sparkle(o, 8, 0.35, 0.04);
    },
    eggClean(o) {
      for (let i = 0; i < 4; i++) noise(o, { t: i * 0.11, dur: 0.1, vol: 0.07, f: rnd(2500, 4500), path: [[0.05, rnd(4500, 6500)], [0.1, rnd(2500, 3500)]], q: 4, a: 0.02 });
    },
    eggPlay(o) {
      strike(o, "wood", 420, 0, 0.14);
      strike(o, "wood", 520, 0.25, 0.12);
    },
    evolveCharge(o, x) {
      const d = x.dur || 4.5;
      pad(o, [57, 64, 69], 0, d, 0.12, { fenv: [300, 3200, d * 0.95, 4000], a: d * 0.5, spread: 14 });
      tone(o, { f: N(45), f2: N(57), t: 0, dur: d, vol: 0.08, type: "triangle", a: d * 0.4, vib: [2, 3, 16] });
      noise(o, { dur: d, vol: 0.07, ft: "highpass", f: 1500, f2: 8000, a: d * 0.8 });
      for (let i = 0; i < 14; i++) strike(o, "glock", rnd(1500, 4500) * (1 + i / 14), d * (0.2 + i * 0.055), 0.03, { pan: rnd(-0.7, 0.7) });
    },
    evolve(o) {
      noise(o, { dur: 0.7, vol: 0.2, f: 500, path: [[0.2, 5000], [0.7, 1500]], q: 0.6, pink: true });
      thud(o, 0, 0.2, 90);
      [72, 79, 84, 88].forEach((n, i) => strike(o, "bell", N(n), 0.04 + i * 0.03, 0.07, { pan: (i - 1.5) * 0.25 }));
      pad(o, [60, 67, 72, 76, 79], 0.05, 1.8, 0.14, { type: "sawtooth", fenv: [800, 5000, 0.3, 1500] });
      sparkle(o, 12, 0.1, 0.04);
    },
    whistle(o) {
      [[1350, 1950, 0, 0.16], [1250, 2150, 0.24, 0.24]].forEach(([a, b, t, d]) => {
        tone(o, { f: a, f2: b, t, dur: d, vol: 0.08, type: "sine", vib: [11, 14], a: 0.02 });
        noise(o, { t, dur: d, vol: 0.05, f: a * 1.2, f2: b, q: 6, a: 0.02 });
      });
    },
    throw(o) {
      whoosh(o, 0, 0.32, 0.17, 700, 2800, [-0.4, 0.5]);
    },
    bounce(o, x) {
      const v = Math.min(1, x.v || 0.5);
      tone(o, { f: 240 + v * 80, f2: 120, glide: 0.06, dur: 0.11, vol: 0.1 + v * 0.18, type: "sine", a: 0.002 });
      tone(o, { f: 480 + v * 120, f2: 300, glide: 0.08, dur: 0.12, vol: 0.03 + v * 0.03, type: "triangle", vib: [30, 20] });
      noise(o, { dur: 0.025, vol: 0.04 + v * 0.06, ft: "lowpass", f: 1200, a: 0.001 });
    },
    kick(o) {
      thud(o, 0, 0.22, 130);
      noise(o, { dur: 0.04, vol: 0.14, f: 1800, q: 0.9, a: 0.001 });
    },
    splash(o) {
      noise(o, { dur: 0.5, vol: 0.22, ft: "lowpass", f: 3200, f2: 500, a: 0.004, pink: true });
      noise(o, { dur: 0.3, vol: 0.1, ft: "highpass", f: 4000, a: 0.002 });
      for (let i = 0; i < 6; i++) bubble(o, 0.08 + i * rnd(0.03, 0.07), 0.05, rnd(700, 1600));
    },
    plop(o) {
      tone(o, { f: 950, f2: 260, glide: 0.06, dur: 0.1, vol: 0.14, type: "sine", a: 0.002 });
      bubble(o, 0.06, 0.04, 700);
    },
    heart(o) {
      strike(o, "glock", N(88), 0, 0.05);
      strike(o, "glock", N(91), 0.08, 0.05);
      tone(o, { f: N(76), t: 0.02, dur: 0.3, vol: 0.03, type: "sine", a: 0.04 });
    },
    bang(o) {
      strike(o, "marimba", N(86), 0, 0.08);
      strike(o, "marimba", N(91), 0.06, 0.08);
    },
    note(o) {
      strike(o, "kalimba", N(81), 0, 0.08);
      strike(o, "kalimba", N(86), 0.11, 0.08);
    },
    spark(o) {
      sparkle(o, 4, 0, 0.035);
    },
    sad(o) {
      voice(o, { f: 560, path: [[0.5, 470], [1, 300]], dur: 0.42, vol: 0.12, v1: "u", v2: "o", size: 1.3, wave: "triangle", vib: [6, 10] });
    },
    whooshFx(o) {
      whoosh(o, 0, 0.45, 0.15, 400, 2200, [0.5, -0.5]);
    },
    swing(o) {
      noise(o, { dur: 0.2, vol: 0.15, f: 1100, f2: 3600, q: 1.3, a: 0.09, pink: true, panPath: [-0.3, 0.3] });
      noise(o, { t: 0.06, dur: 0.12, vol: 0.05, ft: "highpass", f: 5000, a: 0.04 });
    },
    impact(o, x) {
      const p = x.power || 1;
      thud(o, 0, 0.24 * p, 120);
      noise(o, { dur: 0.06, vol: 0.18 * p, f: 1400, q: 0.8, a: 0.001 });
      if (p > 1.2) {
        crackle(o, 6, 0.01, 0.08, 0.14, 2000, 6000);
        tone(o, { f: 60, f2: 38, dur: 0.35, vol: 0.12, type: "sine" });
      }
    },
    puff(o) {
      noise(o, { dur: 0.3, vol: 0.18, ft: "lowpass", f: 1400, f2: 400, a: 0.02, pink: true });
      noise(o, { dur: 0.15, vol: 0.05, ft: "highpass", f: 3000, a: 0.01 });
    },
    miss(o) {
      noise(o, { dur: 0.22, vol: 0.18, f: 2200, f2: 6000, q: 2, a: 0.06, panPath: [-0.6, 0.6] });
    },
    faint(o) {
      voice(o, { f: 520, path: [[0.4, 380], [1, 110]], dur: 0.9, vol: 0.13, v1: "a", v2: "u", size: 1.1, wave: "triangle", vib: [6, 12] });
      thud(o, 0.6, 0.12, 90);
    },
    statUp(o) {
      play8(o, "glock", [72, 76, 79, 84, 88], 0.05, 0.05);
      tone(o, { f: 300, f2: 1400, dur: 0.35, vol: 0.05, type: "sawtooth", fenv: [600, 4000, 0.3], uni: 2, a: 0.02 });
      noise(o, { dur: 0.35, vol: 0.06, f: 800, f2: 6000, q: 2, a: 0.1 });
    },
    statDown(o) {
      play8(o, "marimba", [76, 72, 67, 64, 60], 0.06, 0.08);
      tone(o, { f: 700, f2: 150, dur: 0.45, vol: 0.06, type: "sawtooth", fenv: [3000, 300, 0.4], vib: [7, 15], a: 0.02 });
    },
    enter(o) {
      whoosh(o, 0, 0.28, 0.14, 3000, 800, [0.2, -0.2]);
      tone(o, { f: 420, f2: 1400, glide: 0.15, dur: 0.2, vol: 0.07, type: "triangle" });
      noise(o, { t: 0.2, dur: 0.05, vol: 0.12, f: 1800, q: 1, a: 0.001 });
      sparkle(o, 4, 0.18, 0.03);
    },
    recall(o) {
      tone(o, { f: 1400, f2: 320, dur: 0.4, vol: 0.07, type: "triangle", a: 0.02 });
      noise(o, { dur: 0.38, vol: 0.09, f: 700, f2: 3600, q: 1, a: 0.3, pink: true });
      sparkle(o, 3, 0.05, 0.025);
    },
    win(o) {
      play8(o, "marimba", [67, 67, 67, 72], 0.11, 0.12);
      play8(o, "glock", [79, 79, 79, 84], 0.11, 0.05);
      brass(o, [60, 64, 67, 72], 0.44, 1.1, 0.26);
      tone(o, { f: N(48), t: 0.44, dur: 1, vol: 0.12, type: "triangle", a: 0.02 });
      thud(o, 0.44, 0.12, 100);
      sparkle(o, 8, 0.5, 0.035);
    },
    lose(o) {
      play8(o, "marimba", [67, 63, 60], 0.24, 0.12);
      pad(o, [48, 55, 60, 63], 0.7, 1.3, 0.1, { type: "triangle", fenv: [1200, 500, 1, 300] });
      voice(o, { f: N(55), f2: N(53), t: 0.72, dur: 1, vol: 0.05, v1: "o", v2: "u", size: 1, wave: "triangle" });
    },
    run(o) {
      for (let i = 0; i < 5; i++) noise(o, { t: i * 0.07, dur: 0.045, vol: 0.12, ft: "lowpass", f: 1300, a: 0.002, pink: true, pan: i % 2 ? 0.2 : -0.2 });
      whoosh(o, 0.22, 0.32, 0.13, 800, 2800, [-0.3, 0.7]);
    }
  };

  const GAP = { tap: 0.04, bounce: 0.06, munch: 0.04, heart: 0.12, bang: 0.12, note: 0.15, spark: 0.15, sad: 0.2, cry: 0.18, coin: 0.05, crack: 0.05 };
  const WET = { tap: 0.04, open: 0.08, close: 0.08, pick: 0.06, drop: 0.06, bounce: 0.06, kick: 0.08, munch: 0.03, run: 0.1, deny: 0.06, swing: 0.1, miss: 0.12, impact: 0.14, plop: 0.1, crack: 0.08, eggClean: 0.06, reward: 0.3, levelup: 0.3, win: 0.32, lose: 0.3, evolve: 0.4, evolveCharge: 0.35, hatch: 0.3, give: 0.3, heal: 0.3, coin: 0.18, coins: 0.2 };

  const LEVEL = {tap: 2.2, open: 0.35, close: 0.35, coin: 0.62, coins: 0.55, buy: 0.6, sell: 0.55, deny: 0.45, toast: 0.5, reward: 0.55, levelup: 0.6, pick: 2.2, drop: 0.7, give: 0.9, heal: 0.65, crack: 1.6, hatch: 0.62, eggClean: 1.4, eggPlay: 0.65, whistle: 0.93, throw: 0.85, bounce: 2.2, kick: 1.6, plop: 1.4, heart: 0.45, bang: 0.42, note: 0.42, spark: 1.4, sad: 0.3, whooshFx: 0.85, swing: 0.88, impact: 2, puff: 1.5, faint: 0.48, statUp: 0.52, statDown: 0.55, enter: 0.62, recall: 0.85, win: 0.72, lose: 0.58};
  const TLEVEL = {water: 0.58, grass: 0.66, electric: 1.35, ice: 0.75, ground: 0.78, bug: 1.2, steel: 0.65, light: 0.8, none: 0.88};
  const vmul = (x, m) => (x === undefined ? 1 : x) * m;

  function play(name, x = {}) {
    if (!ready() || !S[name]) return;
    if (active > 140) return;
    const t = now();
    const gap = GAP[name] === undefined ? 0.03 : GAP[name];
    if (last[name] && t - last[name] < gap) return;
    last[name] = t;
    try {
      S[name](bus(vmul(x.vol, LEVEL[name] || 1), x.pan, WET[name]), x);
    } catch (e) {}
  }

  function playCry(id, x = {}) {
    if (!ready() || !id) return;
    const t = now();
    if (last.cry && t - last.cry < GAP.cry) return;
    last.cry = t;
    try {
      cry(bus(vmul(x.vol, 0.42), x.pan, 0.14), id, x.mood);
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
    const t0 = types[0] && TYPE_FX[types[0]] ? types[0] : "none";
    const o = bus(vmul(x.vol, TLEVEL[t0] || 1), x.pan, 0.26);
    try {
      TYPE_FX[t0](o, 0, k);
      if (types[1] && TYPE_FX[types[1]]) TYPE_FX[types[1]](bus(vmul(x.vol, 0.45 * (TLEVEL[types[1]] || 1)), x.pan, 0.26), 0.08, k);
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
    munch(bus(o.vol, o.pan, WET.munch), 0, vol * 1.3);
  }

  S.jumpUp = (o, x) => {
    const k = x.k || 1;
    tone(o, { f: 220 / k, f2: 620 / k, glide: 0.12, dur: 0.16, vol: 0.08, type: "sine", vib: [18, 12], a: 0.004 });
    noise(o, { dur: 0.08, vol: 0.04, f: 2500, q: 0.8, pink: true, a: 0.004 });
  };
  S.land = (o, x) => {
    const k = x.k || 1;
    thud(o, 0, 0.11 / k, 110 * k);
    noise(o, { dur: 0.12, vol: 0.05, f: 3500, q: 0.7, a: 0.004, pink: true });
  };
  S.wobbleFx = (o, x) => tone(o, { f: 380 / (x.k || 1), dur: 0.55, vol: 0.06, type: "triangle", vib: [9, 40], lp: 1800 });

  function battleMove(def, o, x = {}) {
    if (!ready()) return;
    if (o.cat === "phys") play("swing", x);
    else {
      const k = def ? pitchOf(def.id) : 1;
      const ty = TYPE_FX[o.type] ? o.type : "none";
      const out = bus(vmul(x.vol, TLEVEL[ty] || 1), x.pan, 0.26);
      try {
        TYPE_FX[ty](out, 0, k);
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
        const ty = TYPE_FX[type] ? type : "none";
        TYPE_FX[ty](bus(vmul(x.vol, TLEVEL[ty] || 1), x.pan, 0.26), 0, x.k || 1);
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
