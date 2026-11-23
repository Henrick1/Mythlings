(function (root) {
  const CAT = { phys: "Ataque", spec: "Ataque Especial", status: "Status" };
  const STAT_ROWS = [["hp", "Vida", "#38c873"], ["spe", "Velocidade", "#59b7ff"], ["atk", "Ataque", "#f08030"], ["def", "Defesa", "#e2a23a"], ["spa", "Ataque Esp.", "#a46be8"], ["spd", "Defesa Esp.", "#7a8fe0"]];
  const STAT_IDX = { hp: 0, atk: 1, def: 2, spa: 3, spd: 4, spe: 5 };

  function h(tag, cls, text) {
    const el = root.document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function tagColor(hex) {
    const n = parseInt(String(hex || "#888888").slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.62 ? "#1f2a24" : "#ffffff";
  }

  const icon = (key, size, w) => (root.PetIcons ? root.PetIcons.svg(key, size, w) : "");
  const typeIcon = (t, size, w) => (root.PetIcons ? root.PetIcons.typeSvg(t || "none", size, w) : "");

  function mount(el, o) {
    const { THREE, kit, Pets, Battle, Types, Game, api } = o;
    const reduceMotion = !!o.reduceMotion;
    el.innerHTML = "";
    const host = h("div", "bt");
    el.append(host);

    const typeInfo = t => (t && Types.INFO[t]) || { name: "Neutro", color: "#9aa3a0" };
    const pill = t => {
      const i = typeInfo(t);
      const s = h("span", "bt-type");
      s.innerHTML = typeIcon(t, 13, 2.4);
      s.append(h("span", "", i.name));
      s.style.setProperty("--tc", i.color);
      s.style.color = tagColor(i.color);
      return s;
    };
    const typeDot = t => {
      const d = h("i", "bt-tdot");
      d.style.setProperty("--tc", typeInfo(t).color);
      return d;
    };
    const metaOf = sp => (api.meta && api.meta(sp)) || { name: sp, color: "#999999", types: [] };
    const nameOf = sp => metaOf(sp).name || sp;
    const itemName = id => (Game.ITEMS[id] && Game.ITEMS[id].name) || id;
    const artImg = (sp, cls, v) => {
      const box = h("span", cls || "bt-art");
      const url = api.thumb ? api.thumb(sp, v) : null;
      if (url) {
        const img = h("img");
        img.src = url;
        img.alt = "";
        box.append(img);
      }
      return box;
    };

    const lobby = h("section", "bt-lobby");
    const lobbyHead = h("header", "bt-head");
    const closeBtn = h("button", "bt-x");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Fechar");
    closeBtn.innerHTML = icon("back", 22, 2.6);
    const lobbyTitle = h("h2", "bt-plate");
    lobbyTitle.innerHTML = icon("fight", 20, 2.6);
    lobbyTitle.append(h("span", "", "Preparar batalha"));
    lobbyHead.append(closeBtn, lobbyTitle);
    const teamList = h("div", "bt-team");
    const regionBox = h("div", "bt-region");
    regionBox.hidden = true;
    const lobbyFoot = h("div", "bt-foot");
    const lobbyNote = h("p", "bt-note");
    const startBtn = h("button", "bt-primary");
    startBtn.type = "button";
    lobbyFoot.append(lobbyNote, startBtn);
    lobby.append(lobbyHead, regionBox, teamList, lobbyFoot);

    const arena = h("section", "bt-arena");
    arena.hidden = true;
    const view = h("div", "bt-view");
    const canvas = h("canvas", "bt-canvas");
    const hudFoe = h("div", "bt-hud bt-hud-foe");
    const hudMe = h("div", "bt-hud bt-hud-me");
    view.append(canvas, hudFoe, hudMe);
    const panel = h("div", "bt-panel");
    const prompt = h("div", "bt-prompt");
    const msg = h("span", "bt-msg");
    msg.setAttribute("aria-live", "polite");
    const movesBack = h("button", "bt-pback");
    movesBack.type = "button";
    movesBack.innerHTML = icon("back", 15, 2.8);
    movesBack.append(h("span", "", "Voltar"));
    movesBack.hidden = true;
    prompt.append(msg, movesBack);
    const cmd = h("div", "bt-cmd");
    const cmdGrid = h("div", "bt-cmds");
    const moveGrid = h("div", "bt-moves");
    moveGrid.hidden = true;
    const tile = (key, title, cls) => {
      const b = h("button", "bt-tile " + cls);
      b.type = "button";
      const wm = h("span", "bt-wm");
      wm.innerHTML = icon(key, 84, 1.8);
      const t = h("b", "", title);
      const sub = h("small", "");
      b.append(wm, t, sub);
      b.sub = sub;
      return b;
    };
    const fightBtn = tile("fight", "Lutar", "bt-t-fight");
    const swBtn = tile("swap", "Trocar", "bt-t-swap");
    const itBtn = tile("bag", "Itens", "bt-t-items");
    const runBtn = tile("run", "Fugir", "bt-t-run");
    cmdGrid.append(fightBtn, swBtn, itBtn, runBtn);
    cmd.append(cmdGrid, moveGrid);
    const sheet = h("div", "bt-sheet");
    sheet.hidden = true;
    panel.append(prompt, cmd, sheet);
    const result = h("div", "bt-result");
    result.hidden = true;
    arena.append(view, panel, result);

    host.append(lobby, arena);

    function makeHud(box) {
      const top = h("div", "bt-hud-top");
      const name = h("span", "bt-hud-name");
      const types = h("span", "bt-hud-types");
      const lv = h("span", "bt-hud-lv");
      const stb = h("span", "bt-st");
      stb.hidden = true;
      top.append(name, types, stb, lv);
      const barRow = h("div", "bt-hud-bar");
      const bar = h("div", "bt-bar ticks");
      const fill = h("div", "bt-fill");
      bar.append(fill);
      barRow.append(h("span", "bt-pv", "PV"), bar);
      const bottom = h("div", "bt-hud-bottom");
      const dots = h("div", "bt-dots");
      const num = h("span", "bt-hud-num");
      bottom.append(dots, num);
      box.append(top, barRow, bottom);
      return { box, name, types, lv, stb, fill, dots, num, hp: 0, max: 1, raf: 0 };
    }
    const huds = { me: makeHud(hudMe), foe: makeHud(hudFoe) };

    let state = { team: [], battle: null, inventory: {} };
    let shown = null;
    let stage = null;
    let busy = false;
    let skip = null;
    let xpLog = {};
    let mode = "lobby";

    function show(which) {
      mode = which;
      lobby.hidden = which !== "lobby";
      arena.hidden = which !== "arena";
      if (which === "arena") {
        if (!stage) {
          stage = root.BattleStage.create({ canvas, THREE, kit, Pets, reduceMotion });
        }
        stage.start();
        requestAnimationFrame(() => stage && stage.resize());
      } else if (stage) stage.stop();
    }

    function lifeColor(k) {
      return k > 0.5 ? "var(--bt-ok)" : k > 0.2 ? "var(--bt-warn)" : "var(--bt-low)";
    }

    function renderLobby() {
      teamList.innerHTML = "";
      const active = !!state.battle;
      teamList.classList.toggle("locked", active);
      state.team.forEach(row => {
        const card = h("div", "bt-row" + (row.able ? "" : " off"));
        card.dataset.uid = row.uid;
        card.append(artImg(row.species, null, row.variant));
        const mid = h("div", "bt-row-mid");
        const top = h("div", "bt-row-top");
        top.append(h("b", "", nameOf(row.species)), h("span", "bt-card-lv", "Nv " + row.level));
        const types = h("span", "bt-row-types");
        (row.types || []).forEach(t => {
          const c = h("i", "bt-tchip");
          c.innerHTML = typeIcon(t, 13, 2.4);
          c.style.background = typeInfo(t).color;
          c.style.color = tagColor(typeInfo(t).color);
          c.title = typeInfo(t).name;
          types.append(c);
        });
        top.append(types);
        const bar = h("span", "bt-bar");
        const fill = h("span", "bt-fill");
        fill.style.width = Math.max(0, Math.min(100, row.life)) + "%";
        fill.style.background = lifeColor(row.life / 100);
        bar.append(fill);
        const hpLine = h("div", "bt-row-hp");
        hpLine.append(h("span", "", row.away ? "Em expedição" : !row.able ? "Desmaiado" : "Vida"), h("b", "", row.hp + "/" + row.stats.hp));
        mid.append(top, bar, hpLine);
        card.append(mid);
        if (!active && state.team.length > 1) {
          const grip = h("span", "bt-grip");
          grip.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>';
          card.append(grip);
          card.addEventListener("pointerdown", e => dragStart(e, card));
        }
        teamList.append(card);
      });
      const able = state.team.filter(r => r.able).length;
      startBtn.innerHTML = icon("fight", 22, 2.6);
      startBtn.append(h("span", "", active ? "Continuar batalha" : "Procurar batalha"));
      startBtn.disabled = !active && !able;
      lobbyNote.textContent = active ? "Há uma batalha em andamento." : able ? able + (able === 1 ? " criatura pronta" : " criaturas prontas") + " para lutar." : "Nenhuma criatura do grupo pode lutar agora.";
    }

    let drag = null;
    function dragStart(e, card) {
      if (drag || state.battle || (e.pointerType !== "mouse" && !e.target.closest(".bt-grip"))) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      const rows = Array.from(teamList.children);
      const from = rows.indexOf(card);
      if (from < 0 || rows.length < 2) return;
      const step = rows[1].offsetTop - rows[0].offsetTop;
      drag = { card, rows, from, to: from, step, y0: e.clientY, id: e.pointerId };
      try {
        card.setPointerCapture(e.pointerId);
      } catch (err) {}
      card.classList.add("drag");
      teamList.classList.add("sorting");
      card.addEventListener("pointermove", dragMove);
      card.addEventListener("pointerup", dragEnd);
      card.addEventListener("pointercancel", dragEnd);
    }
    function dragMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      const n = d.rows.length;
      const minDy = -d.from * d.step - 8;
      const maxDy = (n - 1 - d.from) * d.step + 8;
      const dy = Math.max(minDy, Math.min(maxDy, e.clientY - d.y0));
      d.card.style.transform = "translateY(" + dy + "px)";
      d.to = Math.max(0, Math.min(n - 1, d.from + Math.round(dy / d.step)));
      d.rows.forEach((r, i) => {
        if (r === d.card) return;
        let sh = 0;
        if (d.to > d.from && i > d.from && i <= d.to) sh = -d.step;
        if (d.to < d.from && i >= d.to && i < d.from) sh = d.step;
        r.style.transform = sh ? "translateY(" + sh + "px)" : "";
      });
    }
    async function dragEnd(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      d.card.removeEventListener("pointermove", dragMove);
      d.card.removeEventListener("pointerup", dragEnd);
      d.card.removeEventListener("pointercancel", dragEnd);
      const order = d.rows.map(r => r.dataset.uid);
      const [moved] = order.splice(d.from, 1);
      order.splice(d.to, 0, moved);
      d.rows.forEach(r => {
        r.classList.remove("drag");
        r.style.transform = "";
      });
      teamList.classList.remove("sorting");
      if (d.to === d.from) return;
      order.forEach(uid => teamList.append(d.rows.find(r => r.dataset.uid === uid)));
      state.team = order.map(uid => state.team.find(r => r.uid === uid));
      const r = api.reorder ? await api.reorder(order) : null;
      if (r) state = Object.assign({ team: [], battle: null, inventory: {} }, r);
      if (mode === "lobby" && !drag) renderLobby();
    }

    closeBtn.addEventListener("click", () => {
      if (o.onClose) o.onClose();
    });

    function setHud(side, f, team, animate) {
      const hud = huds[side];
      if (!f) {
        hud.box.classList.remove("on");
        return;
      }
      hud.box.classList.add("on");
      hud.name.textContent = nameOf(f.sp);
      hud.types.innerHTML = "";
      (Battle.speciesInfo(f.sp).types || []).forEach(t => hud.types.append(typeDot(t)));
      hud.lv.innerHTML = "Nv <b>" + f.lv + "</b>";
      setStatus(side, f.status);
      hud.dots.innerHTML = "";
      (team || []).forEach(x => {
        const d = h("i", x.down ? "down" : "");
        hud.dots.append(d);
      });
      setBar(side, f.hp, f.max, animate);
    }

    const ST_SHORT = { brn: "QUE", psn: "ENV", par: "PAR", slp: "DOR", frz: "CON" };
    function setStatus(side, st) {
      const hud = huds[side];
      hud.stb.hidden = !st;
      hud.stb.className = "bt-st" + (st ? " st-" + st : "");
      hud.stb.textContent = st ? ST_SHORT[st] || "" : "";
      hud.stb.title = st ? Battle.STATUS_NAMES[st] || "" : "";
    }

    function setBar(side, hp, max, animate) {
      const hud = huds[side];
      const from = hud.hp;
      hud.max = max;
      cancelAnimationFrame(hud.raf);
      const paint = v => {
        const k = Math.max(0, Math.min(1, v / max));
        hud.fill.style.width = k * 100 + "%";
        hud.fill.style.background = lifeColor(k);
        if (side === "me") hud.num.innerHTML = Math.round(v) + "<small>/" + max + "</small>";
        else hud.num.textContent = "";
        hud.hp = v;
      };
      if (!animate || reduceMotion) {
        paint(hp);
        return Promise.resolve();
      }
      return new Promise(res => {
        const t0 = performance.now();
        const dur = Math.min(900, 250 + Math.abs(hp - from) / Math.max(1, max) * 900);
        const step = () => {
          const p = Math.min(1, (performance.now() - t0) / dur);
          paint(from + (hp - from) * p);
          if (p < 1) hud.raf = requestAnimationFrame(step);
          else res();
        };
        step();
      });
    }

    function say(text, ms) {
      msg.textContent = text;
      movesBack.hidden = true;
      return new Promise(res => {
        const done = () => {
          clearTimeout(timer);
          skip = null;
          res();
        };
        const timer = setTimeout(done, reduceMotion ? Math.min(ms || 1100, 900) : ms || 1100);
        skip = done;
      });
    }

    arena.addEventListener("click", e => {
      if (e.target.closest("button")) return;
      if (skip) skip();
    });

    const fighter = (b, side) => (side === "me" ? b.me[b.mi] : b.foe[b.fi]);
    const label = (side, sp) => (side === "me" ? nameOf(sp) : nameOf(sp) + " adversário");
    const power = sp => {
      const info = Battle.speciesInfo(sp);
      const t = info.base.reduce((a, x) => a + x, 0);
      return Math.max(0, Math.min(1, (t - 300) / 250));
    };

    async function ensure(b) {
      if (!api.ensure || !b) return;
      await api.ensure(b.me.map(f => f.sp).concat(b.foe.map(f => f.sp)));
    }

    async function enterBattle(b, events) {
      shown = JSON.parse(JSON.stringify(b));
      xpLog = {};
      result.hidden = true;
      sheet.hidden = true;
      show("arena");
      await ensure(b);
      stage.remove("me");
      stage.remove("foe");
      setHud("me", null);
      setHud("foe", null);
      renderCmd(true);
      const fresh = events && events.some(e => e.t === "start");
      const me = fighter(shown, "me");
      const foe = fighter(shown, "foe");
      if (fresh) {
        const names = shown.foe.map(f => nameOf(f.sp));
        const list = names.length > 1 ? names.slice(0, -1).join(", ") + " e " + names[names.length - 1] : names[0];
        await say("Seus oponentes: " + list + "!", 1500);
        setHud("foe", foe, shown.foe, false);
        await Promise.all([stage.setFighter("foe", foe.sp, { power: power(foe.sp) }), say(label("foe", foe.sp) + " entrou na batalha!", 1100)]);
        setHud("me", me, shown.me, false);
        await Promise.all([stage.setFighter("me", me.sp, { power: power(me.sp), variant: me.variant, core: me.core }), say("Vai, " + nameOf(me.sp) + "!", 1000)]);
      } else {
        setHud("foe", foe, shown.foe, false);
        stage.setFighter("foe", foe.sp, { instant: true, power: power(foe.sp) });
        if (!me.down) {
          setHud("me", me, shown.me, false);
          stage.setFighter("me", me.sp, { instant: true, power: power(me.sp), variant: me.variant, core: me.core });
        }
      }
      ready();
    }

    let cmdView = "cmd";

    function ready() {
      busy = false;
      if (!shown) return;
      if (shown.need || fighter(shown, "me").down) {
        msg.textContent = "Escolha quem vai entrar na batalha.";
        openSwitch(true);
        renderCmd(true);
        return;
      }
      cmdView = "cmd";
      msg.textContent = "O que " + nameOf(fighter(shown, "me").sp) + " vai fazer?";
      renderCmd(false);
    }

    function renderCmd(lock) {
      const f = shown && fighter(shown, "me");
      const list = f && !f.down ? f.moves : [];
      const showMoves = cmdView === "moves" && !lock;
      cmdGrid.hidden = showMoves;
      moveGrid.hidden = !showMoves;
      movesBack.hidden = !showMoves;
      moveGrid.innerHTML = "";
      const foe = shown && fighter(shown, "foe");
      list.forEach(id => {
        const m0 = Battle.MOVES[id];
        if (!m0) return;
        const m = m0.collect && f.core ? Object.assign({}, m0, { type: f.core }) : m0;
        const ti = typeInfo(m.type);
        const b = h("button", "bt-mv");
        b.type = "button";
        b.style.setProperty("--tc", ti.color);
        const badge = h("span", "bt-tb");
        badge.innerHTML = typeIcon(m.type, 18, 2.3);
        const name = h("span", "bt-mn");
        name.append(h("b", "", m.name));
        const sub = h("small");
        sub.innerHTML = icon(m.cat, 12, 2.3);
        sub.append(h("span", "", CAT[m.cat] + " · " + ti.name));
        name.append(sub);
        b.append(badge, name);
        if (m.cat !== "status" && foe && !foe.down) {
          const eff = Battle.effectiveness(m, foe.sp);
          if (eff !== 1) b.append(h("span", "bt-eff" + (eff >= 2 ? "" : " weak"), eff >= 2 ? "×" + eff : eff === 0 ? "×0" : eff === 0.25 ? "×¼" : "×½"));
        }
        const pw = h("span", "bt-pw");
        pw.append(h("b", "", m.power ? String(m.power) : "–"), h("small", "", m.power ? "poder" : "status"));
        b.append(pw);
        b.disabled = !!lock;
        b.addEventListener("click", () => send({ kind: "move", move: id }));
        moveGrid.append(b);
      });
      const usable = Battle.BATTLE_ITEMS.reduce((a, k) => a + (state.inventory[k] || 0), 0);
      const others = shown ? shown.me.filter((x, i) => !x.down && i !== shown.mi).length : 0;
      fightBtn.disabled = !!lock || !list.length;
      fightBtn.sub.textContent = list.length + (list.length === 1 ? " ataque" : " ataques");
      swBtn.disabled = !!lock || others === 0;
      swBtn.sub.textContent = others ? others + (others === 1 ? " pronto no grupo" : " prontos no grupo") : "Ninguém para trocar";
      itBtn.disabled = !!lock || !usable;
      itBtn.sub.textContent = usable ? usable + (usable === 1 ? " item" : " itens") : "Sem itens de batalha";
      runBtn.disabled = !!lock;
      runBtn.sub.textContent = "Sai sem recompensa";
    }

    fightBtn.addEventListener("click", () => {
      if (busy) return;
      cmdView = "moves";
      msg.textContent = "Escolha um ataque";
      renderCmd(false);
    });
    movesBack.addEventListener("click", () => {
      if (busy) return;
      ready();
    });

    function closeSheet() {
      sheet.hidden = true;
      sheet.innerHTML = "";
      cmd.hidden = false;
    }

    function sheetHead(title, canClose) {
      sheet.innerHTML = "";
      const head = h("div", "bt-sheet-head");
      head.append(h("strong", "", title));
      if (canClose) {
        const x = h("button", "bt-pback");
        x.type = "button";
        x.innerHTML = icon("back", 15, 2.8);
        x.append(h("span", "", "Voltar"));
        x.addEventListener("click", closeSheet);
        head.append(x);
      }
      sheet.append(head);
      sheet.hidden = false;
      cmd.hidden = true;
    }

    function memberRow(f, i, extra) {
      const b = h("button", "bt-member" + (f.down ? " down" : "") + (i === shown.mi && !shown.need ? " cur" : ""));
      b.type = "button";
      const art = artImg(f.sp, "bt-art small", f.variant);
      const info = h("span", "bt-card-info");
      const top = h("span", "bt-card-top");
      top.append(h("strong", "", nameOf(f.sp)), h("span", "bt-lv", "Nv " + f.lv));
      const bar = h("span", "bt-bar small");
      const fill = h("span", "bt-fill");
      fill.style.width = (f.hp / f.max) * 100 + "%";
      fill.style.background = lifeColor(f.hp / f.max);
      bar.append(fill);
      info.append(top, bar, h("span", "bt-why", f.down ? "Desmaiado" : f.hp + "/" + f.max + (extra ? " · " + extra : "")));
      b.append(art, info);
      return b;
    }

    function openSwitch(forced) {
      sheetHead(forced ? "Quem entra agora?" : "Trocar criatura", !forced);
      const list = h("div", "bt-sheet-list");
      shown.me.forEach((f, i) => {
        const cur = i === shown.mi && !f.down;
        const b = memberRow(f, i, cur ? "Em campo" : "");
        b.disabled = f.down || cur;
        b.addEventListener("click", () => {
          closeSheet();
          send({ kind: "switch", to: i });
        });
        list.append(b);
      });
      sheet.append(list);
      if (!forced) sheet.append(h("p", "bt-note", "Trocar gasta o seu turno."));
    }

    function openItems() {
      sheetHead("Itens", true);
      const list = h("div", "bt-sheet-list");
      Battle.BATTLE_ITEMS.forEach(id => {
        const n = state.inventory[id] || 0;
        if (!n) return;
        const it = Game.ITEMS[id];
        const b = h("button", "bt-item");
        b.type = "button";
        const ic = h("span", "bt-item-ico");
        ic.innerHTML = icon("heal", 20, 2.3);
        const tx = h("span", "bt-item-txt");
        tx.append(h("strong", "", it.name), h("span", "bt-why", it.revive ? "Reanima com " + it.life + "% de vida" : "Recupera " + it.life + "% da vida"));
        b.append(ic, tx, h("span", "bt-qty", "×" + n));
        b.disabled = !shown.me.some(f => !f.gone && (it.revive ? f.down : !f.down && f.hp < f.max));
        b.addEventListener("click", () => openTargets(id));
        list.append(b);
      });
      sheet.append(list, h("p", "bt-note", "Usar um item gasta o seu turno."));
    }

    function openTargets(item) {
      const it = Game.ITEMS[item];
      sheetHead("Usar " + it.name + " em quem?", true);
      const list = h("div", "bt-sheet-list");
      shown.me.forEach((f, i) => {
        const ok = !f.gone && (it.revive ? f.down : !f.down && f.hp < f.max);
        const b = memberRow(f, i, i === shown.mi ? "Em campo" : "");
        b.disabled = !ok;
        b.addEventListener("click", () => {
          closeSheet();
          send({ kind: "item", item, target: i });
        });
        list.append(b);
      });
      sheet.append(list);
    }

    function openRun() {
      sheetHead("Fugir da batalha?", true);
      const p = h("p", "bt-sub", "Você não ganha recompensas, e a vida perdida pelas criaturas continua assim.");
      const row = h("div", "bt-row");
      const yes = h("button", "bt-btn danger", "Fugir");
      const no = h("button", "bt-btn", "Continuar");
      yes.type = no.type = "button";
      yes.addEventListener("click", () => {
        closeSheet();
        send({ kind: "run" });
      });
      no.addEventListener("click", closeSheet);
      row.append(no, yes);
      sheet.append(p, row);
    }

    swBtn.addEventListener("click", () => !busy && openSwitch(false));
    itBtn.addEventListener("click", () => !busy && openItems());
    runBtn.addEventListener("click", () => !busy && openRun());

    async function send(action) {
      if (busy) return;
      busy = true;
      renderCmd(true);
      let r = null;
      try {
        r = await api.act(action);
      } catch (e) {
        r = null;
      }
      if (!r || !r.ok) {
        busy = false;
        if (r && r.battle === null) {
          await back();
          return;
        }
        ready();
        return;
      }
      if (r.inventory) state.inventory = r.inventory;
      if (r.battle) await ensure(r.battle);
      await playEvents(r.events || []);
      if (r.battle) {
        shown = JSON.parse(JSON.stringify(r.battle));
        setHud("me", fighter(shown, "me").down ? null : fighter(shown, "me"), shown.me, false);
        setHud("foe", fighter(shown, "foe"), shown.foe, false);
        ready();
      }
    }

    const STAT_MSG = (name, stat, d) => {
      const s = Battle.STAT_NAMES[stat] || stat;
      if (d === 0) return s + " de " + name + " não pode mudar mais!";
      if (d >= 2) return s + " de " + name + " aumentou muito!";
      if (d > 0) return s + " de " + name + " aumentou!";
      if (d <= -2) return s + " de " + name + " diminuiu muito!";
      return s + " de " + name + " diminuiu!";
    };

    async function playEvents(events) {
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        if (e.t === "use") {
          const side = e.side;
          const tside = side === "me" ? "foe" : "me";
          const att = fighter(shown, side);
          const next = events[i + 1];
          const m = Battle.MOVES[e.move];
          const hits = next && next.t === "hit" && next.side === tside ? next : null;
          const miss = next && next.t === "miss" ? next : null;
          msg.textContent = label(side, att.sp) + " usou " + (m ? m.name : e.move) + "!";
          await stage.attack(side, { type: e.type, cat: e.cat, eff: hits ? hits.eff : 1 }, () => {
            if (hits) {
              const tf = fighter(shown, tside);
              tf.hp = hits.hp;
              stage.hitReact(tside, { eff: hits.eff, crit: hits.crit });
              setBar(tside, hits.hp, hits.max, true);
            } else if (miss) stage.dodge(tside);
          });
          await stage.wait(0.35);
          if (hits) {
            i += 1;
            if (hits.crit) await say("Acerto crítico!", 900);
            if (hits.eff === 0) await say("Não afeta " + label(tside, fighter(shown, tside).sp) + "...", 1100);
            else if (hits.eff >= 2) await say("É super efetivo!", 1000);
            else if (hits.eff < 1) await say("Não é muito efetivo...", 1000);
          } else if (miss) {
            i += 1;
            await say("Mas errou!", 900);
          }
          continue;
        }
        if (e.t === "hit") {
          const tf = fighter(shown, e.side);
          tf.hp = e.hp;
          await Promise.all([stage.hitReact(e.side, e), setBar(e.side, e.hp, e.max, true)]);
          continue;
        }
        if (e.t === "miss") {
          await say("Mas errou!", 900);
          continue;
        }
        if (e.t === "fail") {
          await say("Mas não funcionou!", 900);
          continue;
        }
        if (e.t === "heal") {
          const f = fighter(shown, e.side);
          f.hp = e.hp;
          await Promise.all([stage.healFx(e.side), setBar(e.side, e.hp, e.max, true)]);
          await say(e.drain ? label(e.side, f.sp) + " absorveu energia!" : label(e.side, f.sp) + " recuperou vida!", 900);
          continue;
        }
        if (e.t === "stat") {
          const f = fighter(shown, e.side);
          if (e.d !== 0) await Promise.all([stage.statFx(e.side, e.d > 0), say(STAT_MSG(label(e.side, f.sp), e.stat, e.d), 1100)]);
          else await say(STAT_MSG(label(e.side, f.sp), e.stat, 0), 1000);
          continue;
        }
        if (e.t === "faint") {
          const list = e.side === "me" ? shown.me : shown.foe;
          const f = list[e.i];
          f.down = true;
          f.hp = 0;
          setHud(e.side, f, list, false);
          await Promise.all([stage.faint(e.side), say(label(e.side, f.sp) + " desmaiou!", 1300)]);
          if (e.side === "me") setHud("me", null);
          continue;
        }
        if (e.t === "xp") {
          const f = shown.me[e.i];
          const log = xpLog[e.uid] || (xpLog[e.uid] = { sp: f.sp, xp: 0, level: 0, learned: [] });
          log.xp += e.amount;
          if (e.levels) log.level = e.level;
          (e.learned || []).forEach(id => log.learned.push(id));
          await say(nameOf(f.sp) + " ganhou " + e.amount + " XP!", 950);
          if (e.levels) {
            if (root.Sfx) root.Sfx.play("levelup");
            await say(nameOf(f.sp) + " subiu para o nível " + e.level + "!", 1200);
          }
          for (const id of e.learned || []) {
            if (root.Sfx) root.Sfx.play("toast");
            await say(nameOf(f.sp) + " aprendeu " + (Battle.MOVES[id] ? Battle.MOVES[id].name : id) + "!", 1200);
          }
          continue;
        }
        if (e.t === "switch") {
          const list = e.side === "me" ? shown.me : shown.foe;
          const prevIdx = e.side === "me" ? shown.mi : shown.fi;
          const prev = list[prevIdx];
          if (e.side === "me" && prev && !prev.down && prevIdx !== e.i && stage.has("me")) {
            await Promise.all([stage.recall("me"), say("Volta, " + nameOf(prev.sp) + "!", 900)]);
          }
          if (e.side === "me") shown.mi = e.i;
          else shown.fi = e.i;
          const f = list[e.i];
          f.hp = e.hp;
          if (e.status !== undefined) f.status = e.status;
          setHud(e.side, f, list, false);
          await Promise.all([
            stage.setFighter(e.side, f.sp, { power: power(f.sp), variant: f.variant, core: f.core }),
            say(e.side === "me" ? "Vai, " + nameOf(f.sp) + "!" : label("foe", f.sp) + " entrou na batalha!", 1100)
          ]);
          renderCmd(true);
          continue;
        }
        if (e.t === "item") {
          const f = shown.me[e.i];
          const was = f.down;
          f.hp = e.hp;
          if (e.revive) f.down = false;
          if (root.Sfx) root.Sfx.play("give");
          await say("Você usou " + itemName(e.item) + " em " + nameOf(f.sp) + "!", 1000);
          if (e.i === shown.mi && !was) await Promise.all([stage.healFx("me"), setBar("me", e.hp, e.max, true)]);
          else if (e.revive) await say(nameOf(f.sp) + " voltou a ficar de pé!", 1000);
          setHud("me", fighter(shown, "me").down ? null : fighter(shown, "me"), shown.me, false);
          continue;
        }
        if (e.t === "collect") {
          const f = fighter(shown, e.side);
          f.core = e.type;
          stage.setCore(e.side, e.type);
          if (root.Sfx) root.Sfx.play("toast");
          await say(label(e.side, f.sp) + " guardou o tipo " + typeInfo(e.type).name + " no núcleo!", 1400);
          continue;
        }
        if (e.t === "ability") {
          const f = fighter(shown, e.side);
          await say(e.ab + " de " + label(e.side, f.sp) + "!", 1000);
          if (e.sturdy) await say(label(e.side, f.sp) + " aguentou firme!", 900);
          continue;
        }
        if (e.t === "status") {
          const f = fighter(shown, e.side);
          f.status = e.st;
          setStatus(e.side, e.st);
          if (root.Sfx) root.Sfx.play("statDown");
          const verb = { brn: " foi queimado!", psn: " foi envenenado!", par: " ficou paralisado!", slp: " adormeceu!", frz: " foi congelado!" }[e.st] || "!";
          await Promise.all([stage.statFx(e.side, false), say(label(e.side, f.sp) + verb, 1100)]);
          continue;
        }
        if (e.t === "stuck") {
          const f = fighter(shown, e.side);
          const verb = { par: " está paralisado e não consegue se mexer!", slp: " está dormindo profundamente.", frz: " está congelado!" }[e.st] || " não consegue se mexer!";
          await say(label(e.side, f.sp) + verb, 1100);
          continue;
        }
        if (e.t === "cure") {
          const f = fighter(shown, e.side);
          f.status = null;
          setStatus(e.side, null);
          await say(label(e.side, f.sp) + (e.st === "slp" ? " acordou!" : " descongelou!"), 1000);
          continue;
        }
        if (e.t === "stdmg") {
          const f = fighter(shown, e.side);
          f.hp = e.hp;
          const verb = { brn: " sofreu com a queimadura!", psn: " sofreu com o veneno!", thorn: " se machucou nos espinhos!" }[e.st] || " se machucou!";
          await Promise.all([stage.hitReact(e.side, { eff: 1 }), setBar(e.side, e.hp, e.max, true), say(label(e.side, f.sp) + verb, 1000)]);
          continue;
        }
        if (e.t === "need") continue;
        if (e.t === "run") {
          if (root.Sfx) root.Sfx.play("run");
          await say("Você fugiu da batalha.", 1100);
          continue;
        }
        if (e.t === "end") {
          await showResult(e);
          continue;
        }
      }
    }

    async function showResult(e) {
      busy = true;
      renderCmd(true);
      if (root.Sfx && (e.result === "win" || e.result === "lose")) root.Sfx.play(e.result);
      if (e.result === "win") await say("Você venceu a batalha!", 1300);
      else if (e.result === "lose") await say("Todas as suas criaturas desmaiaram...", 1500);
      result.innerHTML = "";
      const card = h("div", "bt-result-card " + e.result);
      card.append(h("h3", "", e.result === "win" ? "Vitória!" : e.result === "lose" ? "Derrota" : "Você fugiu"));
      if (e.coins) card.append(h("p", "bt-coins", "+" + e.coins + " moedas"));
      const rows = Object.keys(xpLog);
      if (rows.length) {
        const list = h("ul", "bt-xp");
        rows.forEach(uid => {
          const x = xpLog[uid];
          const li = h("li");
          li.append(h("strong", "", nameOf(x.sp)), h("span", "", "+" + x.xp + " XP" + (x.level ? " · Nv " + x.level : "")));
          list.append(li);
        });
        card.append(list);
      }
      if (e.result === "lose") card.append(h("p", "bt-sub", "Suas criaturas desmaiadas precisam ser curadas com poções ou tratamento antes de lutar de novo."));
      else if (e.result === "win") card.append(h("p", "bt-sub", "A vida perdida na batalha continua depois dela. Cuide do seu time!"));
      const ok = h("button", "bt-primary", "Voltar");
      ok.type = "button";
      ok.addEventListener("click", back);
      card.append(ok);
      result.append(card);
      result.hidden = false;
      shown = null;
    }

    async function back() {
      result.hidden = true;
      closeSheet();
      if (stage) {
        stage.remove("me");
        stage.remove("foe");
      }
      shown = null;
      await refresh();
      show("lobby");
      if (o.onChange) o.onChange();
    }

    startBtn.addEventListener("click", async () => {
      if (busy) return;
      if (state.battle) {
        await enterBattle(state.battle, null);
        return;
      }
      busy = true;
      startBtn.disabled = true;
      lobbyNote.textContent = "Procurando oponentes...";
      let r = null;
      try {
        r = await api.start();
      } catch (e) {
        r = null;
      }
      busy = false;
      if (!r || !r.ok) {
        lobbyNote.textContent = r && r.reason === "team" ? "Nenhuma criatura do grupo pode lutar agora." : "Não foi possível começar a batalha.";
        startBtn.disabled = false;
        if (r && r.battle) {
          state.battle = r.battle;
          renderLobby();
        }
        return;
      }
      if (r.inventory) state.inventory = r.inventory;
      state.battle = r.battle;
      busy = true;
      await enterBattle(r.battle, r.events);
    });

    async function refresh() {
      const r = await api.lobby();
      if (r) state = Object.assign({ team: [], battle: null, inventory: {} }, r);
      const rg = api.region ? api.region() : null;
      lobbyTitle.lastChild.textContent = rg ? rg.name : "Preparar batalha";
      regionBox.hidden = !rg;
      regionBox.innerHTML = "";
      if (rg) {
        regionBox.append(h("span", "", "Mais comuns aqui"));
        const pills = h("span", "bt-types");
        rg.types.forEach(t => pills.append(pill(t)));
        regionBox.append(pills);
      }
      if (mode === "lobby") renderLobby();
      return state;
    }

    async function open() {
      await refresh();
      if (state.battle) await enterBattle(state.battle, null);
      else show("lobby");
    }

    function close() {
      if (stage) stage.stop();
    }

    function destroy() {
      if (stage) stage.dispose();
      stage = null;
      el.innerHTML = "";
    }

    return { open, close, refresh, destroy, busy: () => busy, mode: () => mode };
  }

  function detail(el, o) {
    const { Battle, Types } = o;
    let row = o.row;
    let note = "";
    const typeInfo = t => (t && Types.INFO[t]) || { name: "Neutro", color: "#9aa3a0" };
    const pill = t => {
      const i = typeInfo(t);
      const s = h("span", "bt-type");
      s.innerHTML = typeIcon(t, 13, 2.4);
      s.append(h("span", "", i.name));
      s.style.setProperty("--tc", i.color);
      s.style.color = tagColor(i.color);
      return s;
    };
    const moveRow = (info, extraCls) => {
      const b = h("button", "bt-mrow" + (extraCls || ""));
      b.type = "button";
      b.style.setProperty("--tc", typeInfo(info.type).color);
      const name = h("span", "bt-mn");
      name.append(h("b", "", info.name));
      const sub = h("small");
      sub.innerHTML = icon(info.cat, 12, 2.3);
      sub.append(h("span", "", CAT[info.cat] + (info.cat !== "status" ? " · " + (info.acc ? info.acc + "% precisão" : "nunca erra") : "") + (info.desc ? " · " + info.desc : "")));
      name.append(sub);
      const pw = h("span", "bt-pw");
      pw.append(h("b", "", info.power ? String(info.power) : "–"), h("small", "", info.power ? "poder" : "status"));
      b.append(name, pill(info.type), pw);
      return b;
    };
    const host = h("div", "bt bt-insp");
    el.replaceChildren(host);
    const toggle = async id => {
      const on = row.moves.includes(id);
      let next;
      if (on) {
        if (row.moves.length <= 1) {
          note = "Deixe pelo menos um ataque equipado.";
          render();
          return;
        }
        next = row.moves.filter(x => x !== id);
      } else {
        if (row.moves.length >= Battle.MAX_MOVES) {
          note = "Já tem " + Battle.MAX_MOVES + " ataques. Toque em um equipado para tirar.";
          render();
          return;
        }
        next = row.moves.concat([id]);
      }
      note = "";
      row = Object.assign({}, row, { moves: next });
      render();
      const r = o.setMoves ? await o.setMoves(row.uid, next) : null;
      if (r) {
        row = r;
        render();
      }
    };
    function render() {
      host.innerHTML = "";
      if (row.passive) {
        const pv = h("div", "bt-passive");
        pv.append(h("b", "", row.passive.name), h("span", "", row.passive.desc));
        host.append(pv);
      }
      const base = Battle.speciesInfo(row.species).base;
      const stats = h("div", "bt-stats");
      STAT_ROWS.forEach(([k, label, color]) => {
        const st = h("div", "bt-stat");
        st.append(h("span", "", label), h("b", "", String(row.stats[k])));
        const bar = h("span", "bt-bar small");
        const fill = h("span", "bt-fill");
        fill.style.width = Math.min(100, (base[STAT_IDX[k]] / 130) * 100) + "%";
        fill.style.background = color;
        bar.append(fill);
        st.append(bar);
        stats.append(st);
      });
      host.append(stats);
      const sec = h("div", "bt-sec-title");
      sec.append(h("b", "", "Ataques equipados"), h("span", "", row.moves.length + " de " + Battle.MAX_MOVES));
      host.append(sec);
      if (note) host.append(h("p", "bt-warnline", note));
      const list = h("div", "bt-mlist");
      const known = row.learnset.filter(e => e.known);
      const ordered = row.moves.map(id => known.find(e => e.id === id)).filter(Boolean).concat(known.filter(e => !row.moves.includes(e.id)));
      ordered.forEach(entry => {
        const info = Battle.moveInfo(entry.id);
        if (!info) return;
        const on = row.moves.includes(entry.id);
        const b = moveRow(info, on ? " on" : "");
        b.setAttribute("aria-pressed", String(on));
        b.addEventListener("click", () => toggle(entry.id));
        list.append(b);
      });
      const locked = row.learnset.filter(e => !e.known);
      if (locked.length) {
        list.append(h("p", "bt-sublabel", "Próximos ataques"));
        locked.forEach(entry => {
          const info = Battle.moveInfo(entry.id);
          if (!info) return;
          const b = moveRow(Object.assign({}, info, { desc: "" }), " locked");
          b.disabled = true;
          b.querySelector("small").innerHTML = icon("lock", 12, 2.3) + "<span>Libera no Nv " + entry.level + "</span>";
          list.append(b);
        });
      }
      host.append(list);
    }
    render();
    return {
      update(r) {
        row = r;
        note = "";
        render();
      }
    };
  }

  root.BattleUI = { mount, detail };
})(typeof self !== "undefined" ? self : this);
