(function (root) {
  const HOUR = 3600 * 1000;
  const SLOT = 6 * HOUR;
  const SHOWN = 4;
  const LIST = [
    { id: "pico", name: "Pico Nevado", types: ["ice", "flying"], theme: "snow" },
    { id: "floresta", name: "Floresta Escura", types: ["dark", "ghost"], theme: "darkwood" },
    { id: "cratera", name: "Cratera Rubra", types: ["fire", "ground"], theme: "volcano" },
    { id: "recife", name: "Recife de Coral", types: ["water", "psychic"], theme: "reef" },
    { id: "bosque", name: "Bosque Florido", types: ["grass", "bug"], theme: "meadow" },
    { id: "pantano", name: "Pântano Nebuloso", types: ["poison", "water"], theme: "swamp" },
    { id: "canion", name: "Cânion de Pedra", types: ["rock", "fighting"], theme: "canyon" },
    { id: "tempestade", name: "Planalto das Tempestades", types: ["electric", "flying"], theme: "storm" },
    { id: "templo", name: "Templo Suspenso", types: ["psychic", "light"], theme: "temple" },
    { id: "cemiterio", name: "Cemitério das Velas", types: ["ghost", "light"], theme: "graveyard" },
    { id: "minas", name: "Minas de Ferro", types: ["steel", "ground"], theme: "mines" },
    { id: "ninho", name: "Ninho do Dragão", types: ["dragon", "fire"], theme: "dragon" },
    { id: "ruinas", name: "Ruínas Sombrias", types: ["dark", "fighting"], theme: "ruins" },
    { id: "cristal", name: "Jardim de Cristal", types: ["rock", "psychic"], theme: "crystal" }
  ];
  const BY = {};
  LIST.forEach((r, i) => {
    r.index = i;
    BY[r.id] = r;
  });

  const hash = n => {
    let x = (n | 0) ^ 0x5bd1e995;
    x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
    x = Math.imul(x ^ (x >>> 12), 0x297a2d39);
    x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
  };
  const shuffled = c => {
    const a = LIST.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(hash(c * 131 + i * 7 + 3) * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };
  const cache = {};
  const cycle = c => {
    if (cache[c]) return cache[c];
    const a = shuffled(c);
    const prev = shuffled(c - 1).slice(-3);
    const mid = Math.floor(a.length / 2);
    for (let i = 0; i < 3; i++) {
      let guard = 0;
      while (prev.includes(a[i]) && guard++ < a.length) {
        const v = a.splice(i, 1)[0];
        a.splice(mid, 0, v);
      }
    }
    cache[c] = a;
    return a;
  };
  const regionOf = k => {
    const n = LIST.length;
    const c = Math.floor(k / n);
    return LIST[cycle(c)[((k % n) + n) % n]];
  };
  const slotOf = now => Math.floor(now / SLOT);

  function visible(now = Date.now()) {
    const k0 = slotOf(now);
    const out = [];
    for (let k = k0 - SHOWN + 1; k <= k0; k++) {
      const p = (now - k * SLOT) / (SHOWN * SLOT);
      const side = k % 2 ? 1 : -1;
      const x = side * (0.42 + 0.22 * hash(k * 3 + 1));
      out.push({ k, region: regionOf(k), p, x, sway: hash(k * 5 + 2) });
    }
    return out;
  }

  function isOpen(id, now = Date.now()) {
    return visible(now).some(s => s.region.id === id);
  }

  function nextIn(now = Date.now()) {
    return (slotOf(now) + 1) * SLOT - now;
  }

  function upcoming(now = Date.now()) {
    const k = slotOf(now) + 1;
    return { k, region: regionOf(k), inMs: nextIn(now) };
  }

  root.Regions = { LIST, SLOT, SHOWN, byId: id => BY[id] || null, regionOf, slotOf, visible, isOpen, nextIn, upcoming };
})(typeof window !== "undefined" ? window : globalThis);
