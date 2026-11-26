(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Game = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const C = {
    DEFAULT_PET: "bolota",
    PARTY_SIZE: 5,
    TICK_MS: 10000,
    IDLE_CAP_MS: 2 * 24 * 3600000,
    DECAY_PER_MIN: 100 / 480,
    LIFE_DECAY_PER_MIN: 100 / 120,
    FEED_AMOUNT: 30,
    TREAT_AMOUNT: 10,
    TREAT_HEAL_MIN: 120,
    FED_HEAL_MIN: 60,
    JOY_DECAY_PER_MIN: 100 / 360,
    PLAY_AMOUNT: 5,
    DIRT_PER_MIN: 100 / 900,
    DIRTY_AT: 35,
    CLEAN_JOY: 10,
    REVIVE_AT: 20,
    HAPPY_SPLIT: 50,
    MAX_LEVEL: 99,
    STARTERS: ["bolota", "axolinho", "chamisco"],
    EGG_PRICE: 100,
    HATCH_MS: 10 * 60000,
    EGG_TIERS: {
      common: { name: "Ovo comum", price: 100, ms: 10 * 60000, dupCoins: 50, dupXp: 120 },
      rare: { name: "Ovo raro", price: 350, ms: 60 * 60000, dupCoins: 175, dupXp: 400 },
      legendary: { name: "Ovo lendário", price: 0, ms: 4 * 60 * 60000, dupCoins: 500, dupXp: 1200 }
    },
    EGG_RARITY: { matrinho: "rare", carretilho: "rare" },
    VARIANT_BASE: 0.01,
    VARIANT_CARE: 0.05,
    INCUBATOR_SLOTS: 3,
    CARE_DECAY_PER_MIN: 20,
    CLEAN_AMOUNT: 25,
    EGG_PLAY_AMOUNT: 20,
    ALLOWANCE_BASE: 1,
    ALLOWANCE_JOY: 1,
    ALLOWANCE_FED: 1,
    ALLOWANCE_MIN_HUNGER: 25,
    LEVEL_COINS: 10,
    PURSE_CAP: 30,
    DAILY_REWARDS: [10, 15, 20, 25, 30, 35, 80],
    DAILY_BONUS_ITEM: "dourada",
    EXPEDITION_SIZE: 3,
    EXPEDITIONS: {
      curta: { ms: 30 * 60000, coins: [15, 25], items: 1, rare: 0.05, xp: [5, 15], hunger: [10, 20], hurt: 0.2, life: [5, 15] },
      media: { ms: 2 * 3600000, coins: [50, 80], items: 2, rare: 0.2, xp: [15, 45], hunger: [10, 30], hurt: 0.35, life: [10, 25] },
      longa: { ms: 8 * 3600000, coins: [150, 220], items: 4, rare: 0.5, xp: [40, 120], hunger: [10, 45], hurt: 0.5, life: [15, 35] }
    }
  };

  const ITEMS = {
    fruta: { name: "Fruta", hunger: 40, sell: 2 },
    doce: { name: "Doce", price: 12, joy: 30, joyLock: 180 },
    petisco: { name: "Petisco nutritivo", price: 15, hunger: 15, xp: 40 },
    banquete: { name: "Banquete", price: 30, hunger: 60, all: true },
    brinquedos: { name: "Caixa de brinquedos", price: 30, joy: 40, all: true },
    treino: { name: "Faixa de treino", price: 45, train: 5 },
    peixe: { name: "Peixe fresco", hunger: 50, xp: 30, sell: 10 },
    pocao: { name: "Poção pequena", price: 12, life: 30 },
    "pocao-grande": { name: "Poção grande", price: 30, life: 100 },
    reviver: { name: "Reviver", price: 60, revive: true, life: 50 },
    dourada: { name: "Fruta dourada", hunger: 100, joy: 100, xp: 100, sell: 40 },
    cristal: { name: "Cristal", sell: 30 }
  };

  const TYPE_LOOT = {
    water: "peixe",
    psychic: "doce",
    grass: "fruta",
    bug: "fruta",
    rock: "cristal",
    ground: "cristal",
    steel: "cristal",
    poison: "pocao",
    ghost: "pocao",
    dark: "doce",
    fire: "petisco",
    electric: "petisco",
    light: "doce",
    fighting: "petisco"
  };

  const clamp100 = v => Math.max(0, Math.min(100, v));
  const isNum = v => typeof v === "number" && Number.isFinite(v);

  const hungerOf = (s, id = s.pet) => (isNum(s.hunger[id]) ? s.hunger[id] : 100);
  const lifeOf = (s, id = s.pet) => (isNum(s.life[id]) ? s.life[id] : 100);
  const isDying = (s, id = s.pet) => s.dying[id] === true;
  const joyOf = (s, id = s.pet) => (isNum(s.joy[id]) ? s.joy[id] : 100);
  const dirtOf = (s, id = s.pet) => (s.dirt && isNum(s.dirt[id]) ? s.dirt[id] : 0);
  const addDirt = (s, id, n) => {
    if (!s.dirt) s.dirt = {};
    s.dirt[id] = clamp100(dirtOf(s, id) + n);
  };
  const xpOf = (s, id = s.pet) => (isNum(s.xp[id]) ? s.xp[id] : 0);
  const kosOf = (s, id = s.pet) => (s.kos && isNum(s.kos[id]) ? Math.floor(s.kos[id]) : 0);
  const addKo = (s, id) => {
    if (!s.kos) s.kos = {};
    s.kos[id] = kosOf(s, id) + 1;
  };
  const CORE_TYPES = ["fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "light"];
  const CORE_DEFAULT = { taloco: "steel" };
  const coreOf = (s, id = s.pet) => (s.core && CORE_TYPES.includes(s.core[id]) ? s.core[id] : CORE_DEFAULT[s.species && s.species[id]] || null);
  const setCore = (s, id, type) => {
    if (!CORE_TYPES.includes(type)) return false;
    if (!s.core) s.core = {};
    s.core[id] = type;
    return true;
  };
  const levelOf = (s, id = s.pet) => (isNum(s.level[id]) && s.level[id] >= 1 ? Math.floor(s.level[id]) : 1);
  const xpNeeded = level => 50 + (level - 1) * 25;

  function create(now = Date.now()) {
    return {
      pet: null,
      party: [],
      owned: [],
      species: {},
      seen: [],
      variant: {},
      fresh: null,
      coins: 0,
      eggs: [],
      hunger: {},
      life: {},
      joy: {},
      joyAvg: {},
      dying: {},
      heal: {},
      treatDay: {},
      xp: {},
      kos: {},
      core: {},
      level: {},
      joyLock: {},
      train: {},
      dirt: {},
      offers: { day: -1, got: [] },
      purse: {},
      statMax: {},
      inventory: {},
      daily: { day: -1, streak: 0 },
      expeditions: [],
      stash: {},
      moves: {},
      battle: null,
      savedAt: now,
      actionAt: 0
    };
  }

  function orderedIds(petIds) {
    return petIds.includes(C.DEFAULT_PET) ? [C.DEFAULT_PET].concat(petIds.filter(x => x !== C.DEFAULT_PET)) : petIds.slice();
  }

  function numberMap(raw, min, max) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    Object.keys(raw).forEach(k => {
      if (isNum(raw[k])) out[k] = Math.max(min, Math.min(max, raw[k]));
    });
    return out;
  }

  function normalize(raw, petIds, now = Date.now()) {
    const s = create(now);
    if (raw && typeof raw === "object") {
      if (typeof raw.pet === "string") s.pet = raw.pet;
      s.hunger = numberMap(raw.hunger, 0, 100);
      s.life = numberMap(raw.life, 0, 100);
      s.joy = numberMap(raw.joy, 0, 100);
      s.xp = numberMap(raw.xp, 0, 1e9);
      s.kos = numberMap(raw.kos, 0, 1e9);
      s.level = numberMap(raw.level, 1, C.MAX_LEVEL);
      s.heal = numberMap(raw.heal, 0, 1e15);
      s.treatDay = numberMap(raw.treatDay, 0, 1e9);
      s.purse = numberMap(raw.purse, 0, C.PURSE_CAP);
      s.joyLock = numberMap(raw.joyLock, 0, 1e15);
      s.train = numberMap(raw.train, 0, 99);
      s.dirt = numberMap(raw.dirt, 0, 100);
      if (raw.offers && isNum(raw.offers.day) && Array.isArray(raw.offers.got)) s.offers = { day: Math.floor(raw.offers.day), got: raw.offers.got.slice(0, 8).map(n => (isNum(n) ? Math.max(0, Math.floor(n)) : 0)) };
      if (raw.statMax && typeof raw.statMax === "object") {
        Object.keys(raw.statMax).forEach(k => {
          const l = Array.isArray(raw.statMax[k]) ? raw.statMax[k].filter(x => ["hp", "atk", "def", "spa", "spd", "spe"].includes(x)) : [];
          if (l.length) s.statMax[k] = Array.from(new Set(l));
        });
      }
      if (raw.dying && typeof raw.dying === "object") {
        Object.keys(raw.dying).forEach(k => {
          if (typeof raw.dying[k] === "boolean") s.dying[k] = raw.dying[k];
        });
      }
      if (raw.joyAvg && typeof raw.joyAvg === "object") {
        Object.keys(raw.joyAvg).forEach(k => {
          const a = raw.joyAvg[k];
          if (a && isNum(a.sum) && isNum(a.t) && a.t >= 0) s.joyAvg[k] = { sum: Math.max(0, a.sum), t: a.t };
        });
      }
      if (isNum(raw.savedAt)) s.savedAt = raw.savedAt;
      if (isNum(raw.actionAt)) s.actionAt = raw.actionAt;
      if (isNum(raw.coins)) s.coins = Math.max(0, Math.floor(raw.coins));
      if (raw.inventory && typeof raw.inventory === "object") {
        Object.keys(raw.inventory).forEach(k => {
          const n = raw.inventory[k];
          if (ITEMS[k] && isNum(n) && n >= 1) s.inventory[k] = Math.min(9999, Math.floor(n));
        });
      }
      if (raw.fresh && typeof raw.fresh.uid === "string" && C.EGG_TIERS[raw.fresh.tier]) s.fresh = { uid: raw.fresh.uid, tier: raw.fresh.tier };
      if (raw.variant && typeof raw.variant === "object")
        Object.keys(raw.variant).forEach(k => {
          if (raw.variant[k] === 1) s.variant[k] = 1;
        });
      if (raw.daily && isNum(raw.daily.day) && isNum(raw.daily.streak)) {
        s.daily = { day: Math.floor(raw.daily.day), streak: Math.max(0, Math.floor(raw.daily.streak)) };
      }
      if (Array.isArray(raw.eggs)) {
        const used = new Set();
        raw.eggs.forEach(e => {
          if (!e || typeof e.id !== "string" || typeof e.species !== "string") return;
          let slot = Number.isInteger(e.slot) && e.slot >= 0 && e.slot < C.INCUBATOR_SLOTS && !used.has(e.slot) ? e.slot : null;
          if (slot !== null) used.add(slot);
          const tier = C.EGG_TIERS[e.tier] ? e.tier : "common";
          const ms = C.EGG_TIERS[tier].ms;
          s.eggs.push({
            id: e.id.slice(0, 40),
            species: e.species,
            tier,
            slot,
            care: isNum(e.care) ? clamp100(e.care) : 100,
            left: isNum(e.left) ? Math.max(0, Math.min(ms, e.left)) : ms,
            careAcc: isNum(e.careAcc) ? Math.max(0, e.careAcc) : 0,
            careMin: isNum(e.careMin) ? Math.max(0, e.careMin) : 0
          });
        });
      }
    }
    const ids = Array.isArray(petIds) && petIds.length ? petIds : null;
    const valid = id => typeof id === "string" && (!ids || ids.includes(id));
    const rawSpecies = raw && raw.species && typeof raw.species === "object" ? raw.species : {};
    const rawStash = raw && raw.stash && typeof raw.stash === "object" ? raw.stash : {};
    const adopt = uid => {
      if (typeof uid !== "string" || s.owned.includes(uid)) return;
      const sp = typeof rawSpecies[uid] === "string" ? rawSpecies[uid] : typeof rawStash[uid] === "string" ? rawStash[uid] : uid;
      if (!valid(sp)) {
        if (typeof sp === "string" && sp) s.stash[uid] = sp.slice(0, 40);
        return;
      }
      delete s.stash[uid];
      s.owned.push(uid);
      s.species[uid] = sp;
    };
    if (raw && typeof raw === "object" && Array.isArray(raw.owned)) {
      raw.owned.forEach(adopt);
      Object.keys(rawStash).forEach(adopt);
    } else if (raw && typeof raw === "object") {
      if (ids) orderedIds(ids).forEach(adopt);
      else (Array.isArray(raw.party) ? raw.party : []).concat([raw.pet]).forEach(adopt);
    }
    if (ids) s.eggs = s.eggs.filter(e => ids.includes(e.species));
    let party = [];
    if (raw && Array.isArray(raw.party)) {
      raw.party.forEach(id => {
        if (s.owned.includes(id) && !party.includes(id)) party.push(id);
      });
    }
    if (s.owned.includes(s.pet) && !party.includes(s.pet)) party.unshift(s.pet);
    s.owned.forEach(id => {
      if (party.length < C.PARTY_SIZE && !party.includes(id)) party.push(id);
    });
    s.party = party.slice(0, C.PARTY_SIZE);
    if (raw && Array.isArray(raw.expeditions)) {
      raw.expeditions.forEach(x => {
        if (!x || !C.EXPEDITIONS[x.kind] || !isNum(x.endsAt) || !isNum(x.startAt)) return;
        const pets = (Array.isArray(x.pets) ? x.pets : [x.pet]).filter(id => typeof id === "string" && s.owned.includes(id) && !isAway(s, id));
        if (!pets.length) return;
        const same = s.expeditions.find(y => y.kind === x.kind);
        if (same) {
          pets.forEach(id => {
            if (same.pets.length < C.EXPEDITION_SIZE && !same.pets.includes(id)) same.pets.push(id);
          });
          same.endsAt = Math.max(same.endsAt, x.endsAt);
          return;
        }
        s.expeditions.push({ kind: x.kind, pets: pets.slice(0, C.EXPEDITION_SIZE), startAt: x.startAt, endsAt: x.endsAt });
      });
    }
    if (raw && raw.moves && typeof raw.moves === "object") {
      Object.keys(raw.moves).forEach(uid => {
        const list = raw.moves[uid];
        if (!s.owned.includes(uid) || !Array.isArray(list)) return;
        const clean = Array.from(new Set(list.filter(x => typeof x === "string" && x.length < 40))).slice(0, 4);
        if (clean.length) s.moves[uid] = clean;
      });
    }
    if (raw && raw.core && typeof raw.core === "object") {
      Object.keys(raw.core).forEach(uid => {
        if (s.owned.includes(uid) && CORE_TYPES.includes(raw.core[uid])) s.core[uid] = raw.core[uid];
      });
    }
    if (raw && raw.battle && typeof raw.battle === "object" && raw.battle.v === 1 && Array.isArray(raw.battle.me) && Array.isArray(raw.battle.foe) && raw.battle.me.length && raw.battle.foe.length) {
      try {
        s.battle = JSON.parse(JSON.stringify(raw.battle));
      } catch (e) {
        s.battle = null;
      }
    }
    if (!s.party.includes(s.pet) || isAway(s, s.pet)) s.pet = s.party.find(id => !isAway(s, id)) || (s.party.length ? s.party[0] : null);
    const seen = raw && Array.isArray(raw.seen) ? raw.seen.filter(valid) : [];
    s.owned.forEach(id => seen.push(s.species[id]));
    s.seen = Array.from(new Set(seen));
    return s;
  }

  const markSeen = (s, sp) => {
    if (sp && !s.seen.includes(sp)) s.seen.push(sp);
  };

  const isAway = (s, uid) => s.expeditions.some(x => x.pets.includes(uid));
  const inBattle = (s, uid) => !!(s.battle && Array.isArray(s.battle.me) && s.battle.me.some(f => f && f.uid === uid && !f.gone));
  const awayOf = (s, uid) => s.expeditions.find(x => x.pets.includes(uid)) || null;

  const speciesOf = (s, uid = s.pet) => (uid && s.species[uid]) || uid || null;

  function needsStarter(s) {
    return s.owned.length === 0 && s.eggs.length === 0;
  }

  function addOwned(s, species, rand = Math.random) {
    let uid = species;
    while (s.owned.includes(uid) || s.species[uid]) uid = species + "-" + Math.floor(rand() * 1e9).toString(36);
    s.owned.push(uid);
    s.species[uid] = species;
    markSeen(s, species);
    if (s.party.length < C.PARTY_SIZE) s.party.push(uid);
    if (!s.pet) s.pet = uid;
    return uid;
  }

  function chooseStarter(s, id, now = Date.now()) {
    if (!needsStarter(s) || !C.STARTERS.includes(id)) return { changed: false };
    catchUp(s, now);
    s.pet = addOwned(s, id);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  const eggTierOf = id => C.EGG_RARITY[id] || "common";

  function eggPool(s, baseIds, tier = "common") {
    const list = baseIds.filter(id => eggTierOf(id) === tier);
    return list.length ? list : baseIds.slice();
  }

  function rollEggSpecies(s, pool, rand) {
    const has = new Set(s.seen.concat(s.owned.map(x => speciesOf(s, x))));
    const weights = pool.map(id => (has.has(id) ? 1 : 3));
    let r = rand() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r < 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function makeEgg(s, baseIds, tier, now, rand) {
    const pool = eggPool(s, baseIds, tier);
    if (!pool.length) return null;
    const egg = { id: "e" + now.toString(36) + Math.floor(rand() * 1e6).toString(36), species: rollEggSpecies(s, pool, rand), tier, slot: null, care: 100, left: C.EGG_TIERS[tier].ms, careAcc: 0, careMin: 0 };
    s.eggs.push(egg);
    return egg;
  }

  function buyEgg(s, baseIds, now = Date.now(), rand = Math.random, tier = "common") {
    const t = C.EGG_TIERS[tier];
    if (!t || !t.price) return { changed: false, reason: "tier" };
    if (s.coins < t.price) return { changed: false, reason: "coins" };
    if (!eggPool(s, baseIds, tier).length) return { changed: false, reason: "pool" };
    catchUp(s, now);
    const egg = makeEgg(s, baseIds, tier, now, rand);
    s.coins -= t.price;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, egg };
  }

  function grantEgg(s, baseIds, tier, now = Date.now(), rand = Math.random) {
    if (!C.EGG_TIERS[tier]) return null;
    return makeEgg(s, baseIds, tier, now, rand);
  }

  function incubate(s, eggId, now = Date.now()) {
    const egg = s.eggs.find(e => e.id === eggId);
    if (!egg || egg.slot !== null) return { changed: false };
    let slot = -1;
    for (let i = 0; i < C.INCUBATOR_SLOTS; i++) {
      if (!s.eggs.some(e => e.slot === i)) {
        slot = i;
        break;
      }
    }
    if (slot < 0) return { changed: false, reason: "full" };
    catchUp(s, now);
    egg.slot = slot;
    egg.care = 100;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, slot };
  }

  function careEgg(s, eggId, kind, now = Date.now()) {
    catchUp(s, now);
    const egg = s.eggs.find(e => e.id === eggId);
    if (!egg || egg.slot === null || egg.left <= 0) return { changed: false };
    const before = egg.care;
    egg.care = clamp100(egg.care + (kind === "clean" ? C.CLEAN_AMOUNT : C.EGG_PLAY_AMOUNT));
    if (egg.care === before) return { changed: false };
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function hatchEgg(s, eggId, now = Date.now()) {
    catchUp(s, now);
    const egg = s.eggs.find(e => e.id === eggId);
    if (!egg || egg.slot === null || egg.left > 0) return { changed: false };
    s.eggs = s.eggs.filter(e => e !== egg);
    const dupe = s.owned.some(x => speciesOf(s, x) === egg.species);
    const uid = addOwned(s, egg.species);
    const q = eggQuality(egg);
    s.joy[uid] = clamp100(Math.round(50 + 50 * q));
    const variant = Math.random() < C.VARIANT_BASE + C.VARIANT_CARE * q * q;
    if (variant) s.variant[uid] = 1;
    s.fresh = dupe ? { uid, tier: egg.tier || "common" } : null;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, species: egg.species, uid, dupe, variant, tier: egg.tier || "common", quality: q };
  }

  function convertDupe(s, uid, mode, target, lineIds, now = Date.now()) {
    if (!s.fresh || s.fresh.uid !== uid || !s.owned.includes(uid) || s.owned.length < 2 || inBattle(s, uid)) return { changed: false };
    const t = C.EGG_TIERS[s.fresh.tier] || C.EGG_TIERS.common;
    catchUp(s, now);
    let levels = 0;
    if (mode === "xp") {
      if (!target || target === uid || !s.owned.includes(target) || !Array.isArray(lineIds) || !lineIds.includes(speciesOf(s, target))) return { changed: false };
      levels = addXp(s, target, t.dupXp);
    } else if (mode === "coins") s.coins += t.dupCoins;
    else return { changed: false };
    removeOwned(s, uid);
    s.fresh = null;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, coins: mode === "coins" ? t.dupCoins : 0, xp: mode === "xp" ? t.dupXp : 0, levels, level: mode === "xp" ? levelOf(s, target) : 0 };
  }

  function canEvolve(s, id, target, level) {
    return !!target && s.owned.includes(id) && speciesOf(s, id) !== target && levelOf(s, id) >= level && !inBattle(s, id);
  }

  function evolve(s, id, target, level, now = Date.now()) {
    if (!canEvolve(s, id, target, level)) return { changed: false };
    catchUp(s, now);
    s.species[id] = target;
    markSeen(s, target);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function joyAverage(s, id = s.pet) {
    const a = s.joyAvg[id];
    return a && a.t > 0 ? a.sum / a.t : joyOf(s, id);
  }

  function evolveTarget(m, s, id = s.pet) {
    if (!m) return null;
    if (m.evolveBranches && m.evolveKos) return (kosOf(s, id) >= m.evolveKos ? m.evolveBranches.happy : m.evolveBranches.sad) || null;
    if (m.evolveBranches) return (joyAverage(s, id) >= C.HAPPY_SPLIT ? m.evolveBranches.happy : m.evolveBranches.sad) || null;
    return m.evolvesTo || null;
  }

  const eggDecay = e => (C.CARE_DECAY_PER_MIN * C.HATCH_MS) / (C.EGG_TIERS[e.tier] || C.EGG_TIERS.common).ms;

  function advanceEggs(s, minutes) {
    s.eggs.forEach(e => {
      const r = eggDecay(e);
      if (e.slot === null || e.left <= 0) return;
      const m = Math.min(minutes, e.left / 60000);
      const c0 = e.care;
      const area = c0 >= r * m ? (c0 - (r * m) / 2) * m : (c0 * c0) / (2 * r);
      e.careAcc = (e.careAcc || 0) + area;
      e.careMin = (e.careMin || 0) + m;
      e.left = Math.max(0, e.left - minutes * 60000);
      e.care = clamp100(e.care - minutes * r);
    });
  }

  const eggQuality = e => (e.careMin > 0 ? Math.max(0, Math.min(1, e.careAcc / e.careMin / 100)) : 1);

  function updateDying(s, id = s.pet) {
    const life = lifeOf(s, id);
    if (life <= 0) s.dying[id] = true;
    else if (life >= C.REVIVE_AT) s.dying[id] = false;
  }

  const above = (v, rate, t, minutes) => (v > t ? Math.min(minutes, (v - t) / rate) : 0);

  function allowance(s, id, minutes) {
    if (isDying(s, id)) return 0;
    const h = hungerOf(s, id);
    const j = joyOf(s, id);
    const fedMin = above(h, C.DECAY_PER_MIN, C.ALLOWANCE_MIN_HUNGER, minutes);
    const fullMin = above(h, C.DECAY_PER_MIN, 50, minutes);
    const joyMin = Math.min(fedMin, above(j, C.JOY_DECAY_PER_MIN, 50, minutes));
    return (fedMin * C.ALLOWANCE_BASE + fullMin * C.ALLOWANCE_FED + joyMin * C.ALLOWANCE_JOY) / 60;
  }

  function advancePet(s, id, minutes, t0) {
    s.purse[id] = Math.min(C.PURSE_CAP, (s.purse[id] || 0) + allowance(s, id, minutes));
    const h = hungerOf(s, id);
    const starving = Math.max(0, minutes - h / C.DECAY_PER_MIN);
    const fedMin = above(h, C.DECAY_PER_MIN, C.ALLOWANCE_MIN_HUNGER, minutes);
    const healMin = s.heal[id] ? Math.max(0, Math.min(minutes, (s.heal[id] - t0) / 60000)) : 0;
    if (fedMin > 0 || healMin > 0) s.life[id] = clamp100(lifeOf(s, id) + (fedMin * 100) / C.FED_HEAL_MIN + (healMin * 100) / C.TREAT_HEAL_MIN);
    if (s.heal[id] && s.heal[id] <= t0 + minutes * 60000) delete s.heal[id];
    s.hunger[id] = clamp100(h - minutes * C.DECAY_PER_MIN);
    const decayMin = starving - Math.max(0, healMin + starving - minutes);
    if (decayMin > 0) s.life[id] = clamp100(lifeOf(s, id) - decayMin * C.LIFE_DECAY_PER_MIN);
    const j0 = joyOf(s, id);
    const lockMin = s.joyLock[id] ? Math.max(0, Math.min(minutes, (s.joyLock[id] - t0) / 60000)) : 0;
    if (s.joyLock[id] && s.joyLock[id] <= t0 + minutes * 60000) delete s.joyLock[id];
    const d0 = dirtOf(s, id);
    s.joy[id] = clamp100(j0 - (minutes - lockMin) * C.JOY_DECAY_PER_MIN * (d0 >= 60 ? 1.5 : 1));
    addDirt(s, id, minutes * C.DIRT_PER_MIN);
    const avg = s.joyAvg[id] || { sum: 0, t: 0 };
    avg.sum += ((j0 + s.joy[id]) / 2) * minutes;
    avg.t += minutes;
    s.joyAvg[id] = avg;
    updateDying(s, id);
  }

  function advance(s, minutes, t0 = s.savedAt) {
    if (!(minutes > 0)) return s;
    s.party.forEach(id => {
      if (!isAway(s, id)) advancePet(s, id, minutes, t0);
    });
    advanceEggs(s, minutes);
    return s;
  }

  function catchUp(s, now = Date.now()) {
    const elapsed = now - s.savedAt;
    if (elapsed > C.IDLE_CAP_MS) {
      const frozenAt = s.savedAt + C.IDLE_CAP_MS;
      const extra = elapsed - C.IDLE_CAP_MS;
      advance(s, C.IDLE_CAP_MS / 60000, s.savedAt);
      s.expeditions.forEach(x => {
        if (x.endsAt > frozenAt) {
          x.startAt += extra;
          x.endsAt += extra;
        }
      });
      Object.keys(s.heal).forEach(id => {
        if (s.heal[id] > frozenAt) s.heal[id] += extra;
      });
    } else advance(s, elapsed / 60000, s.savedAt);
    s.savedAt = Math.max(s.savedAt, now);
    return s;
  }

  function addXp(s, id, amount) {
    let xp = xpOf(s, id) + amount;
    let level = levelOf(s, id);
    let gained = 0;
    while (level < C.MAX_LEVEL && xp >= xpNeeded(level)) {
      xp -= xpNeeded(level);
      level += 1;
      gained += 1;
      s.coins += C.LEVEL_COINS + level;
    }
    s.xp[id] = level >= C.MAX_LEVEL ? Math.min(xp, xpNeeded(level)) : xp;
    s.level[id] = level;
    return gained;
  }

  function feed(s, now = Date.now(), id = s.pet) {
    catchUp(s, now);
    const before = hungerOf(s, id);
    if (before >= 100) return { changed: false, levels: 0 };
    const after = clamp100(before + C.FEED_AMOUNT);
    s.hunger[id] = after;
    const levels = addXp(s, id, after - before);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, levels, level: levelOf(s, id) };
  }

  function treatStatus(s, id = s.pet, now = Date.now()) {
    const used = s.treatDay[id] === dayNumber(now);
    const healing = !!s.heal[id] && s.heal[id] > now;
    return { used, healing, healUntil: healing ? s.heal[id] : 0, can: isDying(s, id) && !used && !healing };
  }

  function treat(s, now = Date.now()) {
    catchUp(s, now);
    const id = s.pet;
    if (!treatStatus(s, id, now).can) return { changed: false };
    s.heal[id] = now + C.TREAT_HEAL_MIN * 60000;
    s.treatDay[id] = dayNumber(now);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function clean(s, id = s.pet, now = Date.now()) {
    catchUp(s, now);
    if (!s.owned.includes(id) || isAway(s, id) || dirtOf(s, id) < 12) return { changed: false };
    s.dirt[id] = 0;
    if (!isDying(s, id)) s.joy[id] = clamp100(joyOf(s, id) + C.CLEAN_JOY);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function play(s, now = Date.now(), id = s.pet) {
    catchUp(s, now);
    if (isDying(s, id) || joyOf(s, id) >= 100) return { changed: false };
    s.joy[id] = clamp100(joyOf(s, id) + C.PLAY_AMOUNT);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  const addItem = (s, item, n = 1) => {
    s.inventory[item] = (s.inventory[item] || 0) + n;
  };

  const OFFER_POOL = [
    { item: "dourada", n: 1, price: 45, stock: 1 },
    { item: "reviver", n: 1, price: 40, stock: 1 },
    { item: "pocao-grande", n: 1, price: 21, stock: 2 },
    { item: "banquete", n: 1, price: 21, stock: 2 },
    { item: "brinquedos", n: 1, price: 21, stock: 2 },
    { item: "treino", n: 1, price: 30, stock: 1 },
    { item: "petisco", n: 3, price: 32, stock: 1 },
    { item: "doce", n: 3, price: 25, stock: 1 },
    { item: "pocao", n: 3, price: 26, stock: 1 }
  ];
  const OFFER_COUNT = 4;

  function offerList(s, now = Date.now()) {
    const day = dayNumber(now);
    let seed = (day * 2654435761) >>> 0;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) >>> 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pool = OFFER_POOL.slice();
    const pick = [];
    while (pick.length < OFFER_COUNT && pool.length) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    const got = s.offers && s.offers.day === day ? s.offers.got : [];
    const next = (day + 1) * 86400000 + new Date(now).getTimezoneOffset() * 60000;
    return pick.map((o, i) => {
      const it = ITEMS[o.item];
      const full = (it.price || Math.round((it.sell || 10) * 2.5)) * o.n;
      return Object.assign({ i, left: Math.max(0, o.stock - (got[i] || 0)), full, endsAt: next }, o);
    });
  }

  function buyOffer(s, i, now = Date.now()) {
    const o = offerList(s, now)[i];
    if (!o || o.left <= 0) return { changed: false, reason: "stock" };
    catchUp(s, now);
    if (s.coins < o.price) return { changed: false, reason: "coins" };
    const day = dayNumber(now);
    if (!s.offers || s.offers.day !== day) s.offers = { day, got: [] };
    s.offers.got[i] = (s.offers.got[i] || 0) + 1;
    s.coins -= o.price;
    addItem(s, o.item, o.n);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, item: o.item, n: o.n };
  }

  function buyItem(s, item, n = 1, now = Date.now()) {
    const it = ITEMS[item];
    n = Math.max(1, Math.floor(n) || 1);
    if (!it || !it.price) return { changed: false, reason: "item" };
    catchUp(s, now);
    if (s.coins < it.price * n) return { changed: false, reason: "coins" };
    s.coins -= it.price * n;
    addItem(s, item, n);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function sellItem(s, item, now = Date.now()) {
    const it = ITEMS[item];
    if (!it || !it.sell || !(s.inventory[item] >= 1)) return { changed: false };
    catchUp(s, now);
    s.inventory[item] -= 1;
    if (!s.inventory[item]) delete s.inventory[item];
    s.coins += it.sell;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, coins: it.sell };
  }

  const groupOf = s => s.party.filter(x => !isAway(s, x) && !inBattle(s, x));

  function canUseItem(s, item, id = s.pet, now = Date.now()) {
    const it = ITEMS[item];
    if (!it || !(s.inventory[item] >= 1) || !s.owned.includes(id) || isAway(s, id) || inBattle(s, id)) return false;
    if (it.all) return groupOf(s).some(x => (it.hunger && hungerOf(s, x) < 100) || (it.joy && !isDying(s, x) && joyOf(s, x) < 100));
    if (it.train) return (s.train[id] || 0) < 20;
    const dying = isDying(s, id);
    if (it.joyLock && !dying && (s.joyLock[id] || 0) < now + 60 * 60000) return true;
    if (it.revive) return dying || lifeOf(s, id) < 100;
    return (
      (it.hunger && hungerOf(s, id) < 100) ||
      (it.life && lifeOf(s, id) < 100) ||
      (it.joy && !dying && joyOf(s, id) < 100) ||
      (it.xp && levelOf(s, id) < C.MAX_LEVEL)
    ) || false;
  }

  function useItem(s, item, id = s.pet, now = Date.now()) {
    catchUp(s, now);
    if (!canUseItem(s, item, id, now)) return { changed: false };
    const it = ITEMS[item];
    if (it.all) {
      groupOf(s).forEach(x => {
        if (it.hunger) s.hunger[x] = clamp100(hungerOf(s, x) + it.hunger);
        if (it.joy && !isDying(s, x)) s.joy[x] = clamp100(joyOf(s, x) + it.joy);
      });
      s.inventory[item] -= 1;
      if (!s.inventory[item]) delete s.inventory[item];
      s.actionAt = Math.max(now, s.actionAt + 1);
      return { changed: true, levels: 0, level: levelOf(s, id), all: groupOf(s) };
    }
    if (it.train) s.train[id] = (s.train[id] || 0) + it.train;
    if (it.joyLock && !isDying(s, id)) s.joyLock[id] = Math.max(s.joyLock[id] || 0, now) + it.joyLock * 60000;
    if (it.revive) {
      s.dying[id] = false;
      s.life[id] = Math.max(lifeOf(s, id), it.life);
    } else if (it.life) {
      s.life[id] = clamp100(lifeOf(s, id) + it.life);
      updateDying(s, id);
    }
    if (it.hunger) s.hunger[id] = clamp100(hungerOf(s, id) + it.hunger);
    if (it.joy && !isDying(s, id)) s.joy[id] = clamp100(joyOf(s, id) + it.joy);
    const levels = it.xp ? addXp(s, id, it.xp) : 0;
    s.inventory[item] -= 1;
    if (!s.inventory[item]) delete s.inventory[item];
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, levels, level: levelOf(s, id) };
  }

  const dayNumber = now => Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000);

  function dailyStatus(s, now = Date.now()) {
    const today = dayNumber(now);
    const available = s.daily.day !== today;
    const streak = available ? (s.daily.day === today - 1 ? s.daily.streak + 1 : 1) : s.daily.streak;
    const step = ((streak - 1) % C.DAILY_REWARDS.length) + 1;
    return {
      available,
      streak,
      step,
      coins: C.DAILY_REWARDS[step - 1],
      item: step === C.DAILY_REWARDS.length ? C.DAILY_BONUS_ITEM : null,
      egg: step === C.DAILY_REWARDS.length ? "legendary" : null
    };
  }

  function claimDaily(s, now = Date.now(), baseIds = null) {
    const d = dailyStatus(s, now);
    if (!d.available) return { changed: false };
    catchUp(s, now);
    s.daily = { day: dayNumber(now), streak: d.streak };
    s.coins += d.coins;
    if (d.item) addItem(s, d.item);
    const egg = d.egg && Array.isArray(baseIds) && baseIds.length ? grantEgg(s, baseIds, d.egg, now) : null;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, coins: d.coins, item: d.item, egg: egg ? egg.tier : null, streak: d.streak, step: d.step };
  }

  function canExplore(s, id) {
    return s.owned.includes(id) && !isAway(s, id) && !isDying(s, id) && !inBattle(s, id);
  }

  function startExpedition(s, kind, ids, now = Date.now()) {
    const ex = C.EXPEDITIONS[kind];
    if (!ex || s.expeditions.some(x => x.kind === kind) || !Array.isArray(ids)) return { changed: false };
    const pets = Array.from(new Set(ids));
    if (!pets.length || pets.length > C.EXPEDITION_SIZE || !pets.every(id => canExplore(s, id))) return { changed: false };
    if (!s.party.some(id => !pets.includes(id) && !isAway(s, id))) return { changed: false, reason: "home" };
    catchUp(s, now);
    s.expeditions.push({ kind, pets, startAt: now, endsAt: now + ex.ms });
    if (isAway(s, s.pet)) s.pet = s.party.find(x => !isAway(s, x));
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function rollLoot(ex, types, level, rand) {
    const lo = ex.coins[0];
    const hi = ex.coins[1];
    let coins = Math.round((lo + rand() * (hi - lo)) * (1 + Math.min(level, 50) / 100));
    const items = {};
    const typed = (types || []).map(t => TYPE_LOOT[t]).filter(Boolean);
    for (let i = 0; i < ex.items; i++) {
      const pick = typed.length && rand() < 0.7 ? typed[Math.floor(rand() * typed.length) % typed.length] : rand() < 0.5 ? "fruta" : "doce";
      items[pick] = (items[pick] || 0) + 1;
    }
    if (rand() < ex.rare) items.dourada = (items.dourada || 0) + 1;
    return { coins, items };
  }

  function collectExpedition(s, kind, typesOf, now = Date.now(), rand = Math.random) {
    const x = s.expeditions.find(e => e.kind === kind);
    if (!x || x.endsAt > now) return { changed: false };
    catchUp(s, now);
    const ex = C.EXPEDITIONS[x.kind];
    const total = { coins: 0, items: {}, levels: [], effects: [] };
    const roll = ([a, b]) => Math.round(a + rand() * (b - a));
    s.expeditions = s.expeditions.filter(e => e !== x);
    x.pets.forEach(id => {
      if (!s.owned.includes(id)) return;
      const loot = rollLoot(ex, typeof typesOf === "function" ? typesOf(id) : [], levelOf(s, id), rand);
      total.coins += loot.coins;
      Object.keys(loot.items).forEach(k => {
        total.items[k] = (total.items[k] || 0) + loot.items[k];
        addItem(s, k, loot.items[k]);
      });
      const fx = { id, hunger: Math.min(hungerOf(s, id), roll(ex.hunger)), life: 0, xp: rand() < 0.7 ? roll(ex.xp) : 0 };
      s.hunger[id] = clamp100(hungerOf(s, id) - fx.hunger);
      addDirt(s, id, 25);
      if (rand() < ex.hurt) {
        const life0 = lifeOf(s, id);
        s.life[id] = Math.max(Math.min(life0, 5), life0 - roll(ex.life));
        fx.life = Math.round(life0 - s.life[id]);
        updateDying(s, id);
      }
      total.effects.push(fx);
      const gained = fx.xp ? addXp(s, id, fx.xp) : 0;
      if (gained > 0) total.levels.push({ id, level: levelOf(s, id) });
    });
    s.coins += total.coins;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return Object.assign({ changed: true, pets: x.pets.slice() }, total);
  }

  function effectText(fx) {
    const parts = ["-" + fx.hunger + "% fome"];
    if (fx.life) parts.push("-" + fx.life + "% vida");
    if (fx.xp) parts.push("+" + fx.xp + " XP");
    return parts.join(" · ");
  }

  function selectPet(s, id, now = Date.now()) {
    if (typeof id !== "string" || !s.party.includes(id) || id === s.pet || isAway(s, id)) return { changed: false };
    catchUp(s, now);
    s.pet = id;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function canRelease(s, id) {
    return s.owned.includes(id) && s.owned.length > 1 && !isAway(s, id) && !inBattle(s, id);
  }

  function releasePet(s, id, now = Date.now()) {
    if (!canRelease(s, id)) return { changed: false };
    catchUp(s, now);
    removeOwned(s, id);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function removeOwned(s, id) {
    if (s.fresh && s.fresh.uid === id) s.fresh = null;
    s.owned = s.owned.filter(x => x !== id);
    s.party = s.party.filter(x => x !== id);
    ["species", "hunger", "life", "joy", "joyAvg", "dying", "heal", "treatDay", "xp", "kos", "core", "level", "moves", "variant", "purse", "statMax"].forEach(k => {
      if (s[k]) delete s[k][id];
    });
    if (!s.party.length) {
      const next = s.owned.find(x => !isAway(s, x)) || s.owned[0];
      if (next) s.party.push(next);
    }
    if (s.pet === id || !s.party.includes(s.pet)) s.pet = s.party.find(x => !isAway(s, x)) || s.party[0] || null;
  }

  function swapParty(s, outId, inId, petIds, now = Date.now()) {
    const at = s.party.indexOf(outId);
    if (at < 0 || s.party.includes(inId) || !s.owned.includes(inId) || isAway(s, outId) || isAway(s, inId) || inBattle(s, outId)) return { changed: false };
    catchUp(s, now);
    s.party[at] = inId;
    if (s.pet === outId) s.pet = inId;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function maxedOf(s, id) {
    return (s.statMax && s.statMax[id]) || [];
  }

  function purseOf(s, id) {
    return Math.floor(s.purse[id] || 0);
  }

  function collect(s, id, now = Date.now()) {
    if (!s.owned.includes(id) || isAway(s, id)) return { changed: false };
    catchUp(s, now);
    const n = purseOf(s, id);
    if (n < 1) return { changed: false };
    s.coins += n;
    s.purse[id] -= n;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, coins: n };
  }

  function reorderParty(s, order, now = Date.now()) {
    if (!Array.isArray(order) || order.length !== s.party.length || s.battle) return { changed: false };
    if (new Set(order).size !== order.length || !order.every(id => s.party.includes(id))) return { changed: false };
    if (order.every((id, i) => s.party[i] === id)) return { changed: false };
    catchUp(s, now);
    s.party = order.slice();
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function view(s, petsMeta) {
    const meta = {};
    const all = petsMeta || [];
    all.forEach(m => {
      meta[m.id] = m;
    });
    const info = id => meta[speciesOf(s, id)] || {};
    const row = id => ({
      id,
      species: speciesOf(s, id),
      name: info(id).name || speciesOf(s, id),
      color: info(id).color || "#999999",
      types: info(id).types || [],
      hunger: hungerOf(s, id),
      life: lifeOf(s, id),
      joy: joyOf(s, id),
      dirt: dirtOf(s, id),
      dying: isDying(s, id),
      level: levelOf(s, id),
      away: awayOf(s, id),
      variant: s.variant[id] === 1,
      core: coreOf(s, id),
      purse: purseOf(s, id)
    });
    const id = s.pet;
    const level = levelOf(s, id);
    return {
      pet: id,
      species: speciesOf(s, id),
      variant: s.variant[id] === 1,
      core: coreOf(s, id),
      types: info(id).types || [],
      hunger: hungerOf(s, id),
      life: lifeOf(s, id),
      joy: joyOf(s, id),
      dying: isDying(s, id),
      treat: treatStatus(s, id),
      level,
      xp: xpOf(s, id),
      xpNext: xpNeeded(level),
      party: s.party.map(row),
      box: s.owned.filter(x => !s.party.includes(x)).map(row),
      owned: s.owned.slice(),
      ownedSpecies: Array.from(new Set(s.seen.concat(s.owned.map(x => speciesOf(s, x))))),
      coins: s.coins,
      eggs: s.eggs.map(e => Object.assign({ decay: eggDecay(e), total: (C.EGG_TIERS[e.tier] || C.EGG_TIERS.common).ms }, e)),
      inventory: Object.assign({}, s.inventory),
      expeditions: s.expeditions.map(x => Object.assign({}, x, { pets: x.pets.slice() })),
      needsStarter: needsStarter(s)
    };
  }

  function merge(local, remote, now = Date.now(), opts = {}) {
    if (!remote) {
      local.actionAt = Math.max(local.actionAt, now);
      return { state: local, source: "local", push: true };
    }
    const adopt = opts.preferRemote ? true : remote.actionAt >= local.actionAt;
    if (adopt) {
      const next = catchUp(remote, now);
      return { state: next, source: "remote", push: false };
    }
    return { state: local, source: "local", push: local.actionAt > remote.actionAt };
  }

  return {
    C,
    ITEMS,
    TYPE_LOOT,
    xpNeeded,
    offerList,
    buyOffer,
    clean,
    dirtOf,
    addDirt,
    create,
    isAway,
    inBattle,
    addXp,
    addKo,
    kosOf,
    coreOf,
    setCore,
    buyItem,
    sellItem,
    canUseItem,
    useItem,
    dailyStatus,
    claimDaily,
    canExplore,
    startExpedition,
    collectExpedition,
    normalize,
    advance,
    catchUp,
    feed,
    treat,
    treatStatus,
    effectText,
    play,
    needsStarter,
    chooseStarter,
    eggPool,
    eggTierOf,
    eggQuality,
    eggDecay,
    buyEgg,
    grantEgg,
    convertDupe,
    incubate,
    careEgg,
    hatchEgg,
    canEvolve,
    evolve,
    speciesOf,
    selectPet,
    swapParty,
    reorderParty,
    collect,
    purseOf,
    maxedOf,
    canRelease,
    releasePet,
    view,
    merge,
    hungerOf,
    lifeOf,
    joyOf,
    joyAverage,
    evolveTarget,
    isDying,
    xpOf,
    levelOf,
    xpNeeded
  };
});
