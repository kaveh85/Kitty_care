/* Kitty Care – hoofdlogica: verzorging, levels, winkel, opslaan */

(() => {
  const SAVE_KEY = 'kittycare-save-v1';
  const STAT_IDS = ['eten', 'drinken', 'schoon', 'plezier', 'energie'];
  const $ = (sel, root = document) => root.querySelector(sel);
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

  const ACTIONS = [
    { id: 'voeren',     name: 'Eten',      icon: '🍗', inv: 'voer' },
    { id: 'water',      name: 'Water',     icon: '💧' },
    { id: 'snoepje',    name: 'Snoepje',   icon: '🍬', inv: 'snoepje' },
    { id: 'spelen',     name: 'Spelen',    icon: '🧶' },
    { id: 'borstelen',  name: 'Borstelen', icon: '🪮' },
    { id: 'wassen',     name: 'Wassen',    icon: '🛁', inv: 'shampoo' },
    { id: 'kattenbak',  name: 'Kattenbak', icon: '🪣', inv: 'korrels' },
    { id: 'slapen',     name: 'Slapen',    icon: '😴' },
    { id: 'medicijn',   name: 'Medicijn',  icon: '💊', inv: 'medicijn' },
    { id: 'dierenarts', name: 'Dokter',    icon: '🩺' },
  ];
  const ACTION_NAMES = {
    voeren: ['Geef je kat eten', 'keer'], water: ['Geef je kat water', 'keer'], snoepje: ['Geef een snoepje', 'keer'],
    spelen: ['Speel met je kat', 'keer'], borstelen: ['Borstel je kat', 'keer'], wassen: ['Was je kat', 'keer'],
    kattenbak: ['Maak de kattenbak schoon', 'keer'], slapen: ['Laat je kat slapen', 'keer'], medicijn: ['Geef medicijn', 'keer'],
    dierenarts: ['Ga naar de dierenarts', 'keer'], aaien: ['Aai je kat (tik op de kat)', 'keer'],
  };
  const VET_PRICE = 20;

  let state = null;
  let paused = false;
  let lastTick = Date.now();
  let lastMood = '';
  let levelModalOpen = false;
  let cooldowns = {};
  let shopCat = 'verzorging';
  let mg = null; // actieve minigame

  /* ------------------------------------------------------------ opslaan */
  function newState(name, color) {
    return {
      v: 1, name, color, coins: 25, level: 1,
      stats: { eten: 45, drinken: 45, schoon: 80, plezier: 60, energie: 80, gezondheid: 100 },
      litter: 15,
      inv: { voer: 5, snoepje: 2, korrels: 3, shampoo: 1, medicijn: 0 },
      owned: { wol: true, creme: true },
      wearing: null, wall: 'creme',
      sleeping: false, sick: false,
      prog: {}, levelCoins: 0,
      best: {}, plays: 0,
      sound: true,
      lastSeen: Date.now(),
    };
  }

  function save() {
    if (!state) return;
    state.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* privémodus */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const base = newState(s.name, s.color);
      return { ...base, ...s, stats: { ...base.stats, ...s.stats }, inv: { ...base.inv, ...s.inv } };
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------------ helpers */
  const owns = (id) => !!state.owned[id];
  const houseCount = () => Object.keys(ITEMS).filter((k) => ITEMS[k].cat === 'huis' && owns(k)).length;
  const bestToy = () => Object.keys(ITEMS).filter((k) => ITEMS[k].cat === 'speelgoed' && owns(k))
    .sort((a, b) => ITEMS[b].power - ITEMS[a].power)[0] || 'wol';

  function toast(msg, type = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2300);
    setTimeout(() => el.remove(), 2700);
  }

  function floatText(text, cls = '') {
    const host = $('#cat-wrap');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'float ' + cls;
    el.textContent = text;
    el.style.left = 30 + Math.random() * 40 + '%';
    host.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  function bounceCat(cls = 'bounce') {
    const c = $('#cat-wrap');
    if (!c) return;
    c.classList.remove('bounce', 'shake', 'wiggle');
    void c.offsetWidth;
    c.classList.add(cls);
  }

  function addStat(id, amount) {
    state.stats[id] = clamp(state.stats[id] + amount);
  }

  function addCoins(n, fromGame = false) {
    if (n <= 0) return;
    state.coins += n;
    if (fromGame) state.levelCoins += n;
    renderTop();
    const pill = $('.coin-pill');
    pill.classList.remove('pulse'); void pill.offsetWidth; pill.classList.add('pulse');
  }

  /* ------------------------------------------------------------ modal */
  const modalQueue = [];
  function modal(html, onOpen) {
    if (!$('#modal').classList.contains('hidden')) { modalQueue.push([html, onOpen]); return; }
    $('#modal-card').innerHTML = html;
    $('#modal').classList.remove('hidden');
    if (onOpen) onOpen($('#modal-card'));
  }
  function closeModal() {
    $('#modal').classList.add('hidden');
    $('#modal-card').innerHTML = '';
    if (modalQueue.length) {
      const [h, f] = modalQueue.shift();
      setTimeout(() => modal(h, f), 150);
    }
  }

  function confetti() {
    const box = $('#confetti');
    const colors = ['#ff6b9d', '#ffd23f', '#5ad1a2', '#5aa9ff', '#b58cff', '#ff9f43'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.6 + 's';
      p.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
      setTimeout(() => p.remove(), 3800);
    }
  }

  /* ------------------------------------------------------------ levels & taken */
  function seeded(seed) {
    let s = seed * 9301 + 49297;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  function levelDef(n) {
    if (n <= LEVELS.length) return LEVELS[n - 1];
    // Na level 10: steeds nieuwe uitdagingen
    const r = seeded(n);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const k = n - LEVELS.length;
    const scoreTask = () => {
      const g = pick(['rekenen', 'klimmen', 'puzzel', 'muizen']);
      const n2 = { rekenen: Math.min(26, 10 + k), klimmen: Math.min(70, 20 + k * 4), puzzel: Math.min(26, 20 + k), muizen: Math.min(32, 18 + k) }[g];
      return { t: 'score', g, n: n2 };
    };
    const careTask = () => ({ t: 'action', a: pick(['voeren', 'spelen', 'borstelen', 'water', 'kattenbak', 'aaien']), n: 3 + Math.floor(k / 2) });
    const tasks = [scoreTask(), careTask(), pick([
      { t: 'keep', v: Math.min(80, 65 + k), s: 60 },
      { t: 'earn', n: 50 + k * 10 },
      { t: 'play', g: 'any', n: 3 + Math.floor(k / 3) },
    ])];
    const names = ['Superverzorger', 'Kattenfluisteraar', 'Dag vol plezier', 'Poezenprof', 'Snorharen-held', 'Spinkampioen', 'Pootjes-expert', 'Kattenkoning'];
    const icons = ['🌟', '🐾', '💖', '🏆', '🎈', '🌈', '🍀', '🎉'];
    return {
      name: pick(names), icon: pick(icons), reward: 60 + k * 10,
      story: 'Je bent nu een echte kattenexpert. Kun jij deze uitdaging aan?', tasks,
    };
  }

  function taskText(t) {
    switch (t.t) {
      case 'action': return ACTION_NAMES[t.a][0] + (t.n > 1 ? ` (${t.n}x)` : '');
      case 'play': return t.g === 'any' ? `Speel ${t.n} ${t.n === 1 ? 'minigame' : 'minigames'}` : `Speel ${gameById(t.g).name} ${t.n}x`;
      case 'score': { const g = gameById(t.g); return `Haal ${t.n} ${g.unit} bij ${g.name}`; }
      case 'earn': return `Verdien ${t.n} munten met spelletjes`;
      case 'own': return `Koop: ${ITEMS[t.item].name} ${ITEMS[t.item].icon}`;
      case 'house': return `Heb ${t.n} spullen in je huis`;
      case 'keep': return `Houd alle balkjes boven ${t.v}% voor ${t.s} sec.`;
      case 'wear': return 'Doe je kat iets moois aan (winkel → kleding)';
    }
    return '';
  }

  function taskStatus(t, i) {
    let live = null, max = 1;
    switch (t.t) {
      case 'action': case 'play': case 'score': case 'keep': max = t.t === 'keep' ? t.s : t.n; break;
      case 'earn': live = state.levelCoins; max = t.n; break;
      case 'own': live = owns(t.item) ? 1 : 0; break;
      case 'house': live = houseCount(); max = t.n; break;
      case 'wear': live = state.wearing ? 1 : 0; break;
    }
    if (live !== null) state.prog[i] = Math.max(state.prog[i] || 0, live);
    const cur = Math.min(max, Math.floor(state.prog[i] || 0));
    return { cur, max, done: cur >= max };
  }

  function emit(type, data) {
    const def = levelDef(state.level);
    def.tasks.forEach((t, i) => {
      if (type === 'action' && t.t === 'action' && t.a === data) state.prog[i] = (state.prog[i] || 0) + 1;
      if (type === 'play') {
        if (t.t === 'play' && (t.g === 'any' || t.g === data.game)) state.prog[i] = (state.prog[i] || 0) + 1;
        if (t.t === 'score' && t.g === data.game) state.prog[i] = Math.max(state.prog[i] || 0, data.score);
      }
    });
    checkLevel();
    renderTaskStrip();
    save();
  }

  function checkLevel() {
    if (levelModalOpen) return;
    const def = levelDef(state.level);
    const all = def.tasks.every((t, i) => taskStatus(t, i).done);
    if (!all) return;
    levelModalOpen = true;
    const next = state.level + 1;
    const unlockedItems = Object.keys(ITEMS).filter((k) => ITEMS[k].level === next);
    const unlockedGames = MINIGAMES.filter((g) => g.level === next);
    const news = [...unlockedGames.map((g) => `${g.icon} ${g.name}`), ...unlockedItems.map((k) => `${ITEMS[k].icon} ${ITEMS[k].name}`)];
    Sound.levelUp();
    confetti();
    modal(`
      <div class="lvl-done">
        <div class="lvl-badge">⭐ ${state.level}</div>
        <h2>Level voltooid!</h2>
        <div class="modal-cat">${catSVG(state.color, 'happy', state.wearing)}</div>
        <p><b>${esc(state.name)}</b> is heel blij met jou!</p>
        <div class="reward">+${def.reward} 🪙</div>
        ${news.length ? `<div class="unlocks"><div class="unlocks-title">Nieuw vrijgespeeld:</div>${news.map((n) => `<span>${n}</span>`).join('')}</div>` : ''}
        <button class="btn btn-primary btn-big" id="lvl-next">Naar level ${next} ➜</button>
      </div>`, (card) => {
      $('#lvl-next', card).onclick = () => {
        state.level = next;
        state.prog = {};
        state.levelCoins = 0;
        addCoins(def.reward);
        levelModalOpen = false;
        closeModal();
        renderAll();
        save();
        showLevelIntro();
      };
    });
  }

  function showLevelIntro() {
    const def = levelDef(state.level);
    modal(`
      <div class="lvl-intro">
        <div class="lvl-icon">${def.icon}</div>
        <div class="lvl-num">Level ${state.level}</div>
        <h2>${def.name}</h2>
        <p>${def.story}</p>
        <ul class="task-list">${def.tasks.map((t) => `<li>☐ ${taskText(t)}</li>`).join('')}</ul>
        <button class="btn btn-primary btn-big" id="lvl-go">Aan de slag!</button>
      </div>`, (card) => { $('#lvl-go', card).onclick = closeModal; });
  }

  /* ------------------------------------------------------------ verzorging */
  function doAction(id) {
    Sound.unlock();
    const s = state.stats;
    const now = Date.now();
    if (cooldowns[id] && cooldowns[id] > now) return;

    if (state.sleeping && id !== 'slapen') {
      toast(`${state.name} slaapt... 💤 Maak je kat eerst wakker.`);
      return;
    }

    const act = ACTIONS.find((a) => a.id === id);
    if (act && act.inv && state.inv[act.inv] <= 0) {
      toast(`Op! Koop ${ITEMS[act.inv].name} in de winkel 🛒`, 'warn');
      Sound.bad();
      return;
    }
    const use = () => { if (act && act.inv) state.inv[act.inv]--; };

    switch (id) {
      case 'voeren': {
        if (s.eten >= 95) return toast(`${state.name} zit helemaal vol! 😸`);
        const bonus = owns('voerbak') ? 15 : 0;
        use(); addStat('eten', 35 + bonus); addStat('plezier', 3); state.litter = clamp(state.litter + 8);
        floatText(`+${35 + bonus} 🍗`); bounceCat(); Sound.meow();
        break;
      }
      case 'water':
        if (s.drinken >= 95) return toast(`${state.name} heeft geen dorst.`);
        addStat('drinken', 40); floatText('+40 💧'); bounceCat(); Sound.pop();
        break;
      case 'snoepje':
        use(); addStat('eten', 10); addStat('plezier', 15);
        floatText('+15 😺'); bounceCat('wiggle'); Sound.meow();
        break;
      case 'spelen': {
        if (s.energie < 12) return toast(`${state.name} is te moe om te spelen. Tijd om te slapen 😴`, 'warn');
        const toy = bestToy();
        let gain = ITEMS[toy].power;
        if (state.sick) gain = Math.round(gain / 2);
        addStat('plezier', gain); addStat('energie', -10); addStat('eten', -3); addStat('drinken', -4);
        floatText(`${ITEMS[toy].icon} +${gain} 😺`); bounceCat('wiggle'); Sound.jump();
        cooldowns[id] = now + 1200;
        break;
      }
      case 'borstelen':
        addStat('schoon', 15); addStat('plezier', 4);
        floatText('+15 🫧'); bounceCat('wiggle'); Sound.purr();
        cooldowns[id] = now + 2500;
        break;
      case 'wassen':
        if (s.schoon >= 90) return toast(`${state.name} is al hartstikke schoon ✨`);
        use(); addStat('schoon', 55); addStat('plezier', -8);
        floatText('+55 🫧'); setTimeout(() => floatText('Brrr! 💦', 'small'), 300); bounceCat('shake'); Sound.pop();
        break;
      case 'kattenbak':
        if (state.litter < 15) return toast('De kattenbak is al schoon 👍');
        use(); state.litter = 0; addStat('schoon', 5); addStat('gezondheid', 3);
        toast('Kattenbak is weer fris! ✨', 'good'); Sound.good();
        break;
      case 'slapen':
        if (state.sleeping) {
          state.sleeping = false; toast(`${state.name} is wakker! ☀️`); Sound.meow();
          renderScene(); renderActions(); save();
          return;
        }
        if (s.energie >= 90) return toast(`${state.name} is nog niet moe.`);
        state.sleeping = true;
        toast(`Welterusten, ${state.name}! 💤`);
        renderScene();
        break;
      case 'medicijn':
        if (!state.sick && s.gezondheid >= 90) return toast(`${state.name} is niet ziek, medicijn is niet nodig.`);
        use(); addStat('gezondheid', 45); if (s.gezondheid >= 60) state.sick = false;
        floatText('+45 ❤️'); Sound.good();
        break;
      case 'dierenarts':
        return vetVisit();
    }
    emit('action', id);
    renderAll();
  }

  function vetVisit() {
    modal(`
      <div class="vet">
        <div class="lvl-icon">🩺</div>
        <h2>Dierenarts</h2>
        <p>De dokter geeft ${esc(state.name)} een controle, maakt je kat helemaal beter en geeft een hapje en drankje.</p>
        <p class="price-line">Kosten: <b>${VET_PRICE} 🪙</b> (jij hebt ${state.coins} 🪙)</p>
        <div class="btn-row">
          <button class="btn" id="vet-no">Nee</button>
          <button class="btn btn-primary" id="vet-yes" ${state.coins < VET_PRICE ? 'disabled' : ''}>Ja, ga maar!</button>
        </div>
        ${state.coins < VET_PRICE ? '<p class="hint">Verdien munten met de spelletjes 🎮</p>' : ''}
      </div>`, (card) => {
      $('#vet-no', card).onclick = closeModal;
      $('#vet-yes', card).onclick = () => {
        state.coins -= VET_PRICE;
        state.stats.gezondheid = 100;
        state.sick = false;
        addStat('eten', 20); addStat('drinken', 20);
        closeModal();
        toast(`Dokter: "${state.name} is kerngezond!" 💚`, 'good');
        Sound.good();
        emit('action', 'dierenarts');
        renderAll();
      };
    });
  }

  function petCat() {
    Sound.unlock();
    const now = Date.now();
    if (cooldowns.aaien && cooldowns.aaien > now) return;
    cooldowns.aaien = now + 350;
    if (state.sleeping) { floatText('💤', 'small'); return; }
    addStat('plezier', 2);
    floatText(['💖', '💕', '❤️', '😻'][Math.floor(Math.random() * 4)], 'heart');
    bounceCat();
    Sound.purr();
    emit('action', 'aaien');
    renderStats();
  }

  /* ------------------------------------------------------------ tijd */
  function tick() {
    const now = Date.now();
    let dt = (now - lastTick) / 1000;
    lastTick = now;
    if (!state || paused) return;
    if (dt > 30) { offline(dt); return; }
    simulate(dt, 1);
    renderStats();
    updateMood();
    renderTaskStripIfVisible();
  }

  function simulate(dt, factor) {
    const s = state.stats;
    const mult = Math.min(1.8, 1 + (state.level - 1) * 0.05) * factor;
    for (const id of STAT_IDS) {
      if (id === 'energie') continue;
      let r = DECAY[id] * mult;
      if (id === 'plezier') { if (owns('krabpaal')) r *= 0.8; if (owns('raam')) r *= 0.85; if (owns('aquarium')) r *= 0.85; }
      if (id === 'drinken' && owns('fontein')) r *= 0.7;
      if (id === 'schoon' && state.litter > 60) r *= 2;
      if (state.sleeping) r *= 0.5;
      s[id] = clamp(s[id] - r * dt);
    }
    if (state.sleeping) {
      s.energie = clamp(s.energie + (owns('kattenmand') ? 4 : 2) * dt);
      if (s.energie >= 100) {
        state.sleeping = false;
        toast(`${state.name} is uitgerust en wakker! ☀️`, 'good');
        renderScene(); renderActions();
      }
    } else {
      s.energie = clamp(s.energie - DECAY.energie * mult * dt);
    }
    state.litter = clamp(state.litter + 0.07 * factor * dt);

    // gezondheid
    const low = STAT_IDS.filter((id) => s[id] < 20).length;
    if (low > 0) s.gezondheid = clamp(s.gezondheid - 0.25 * low * dt * factor);
    else if (state.litter > 85) s.gezondheid = clamp(s.gezondheid - 0.1 * dt * factor);
    else if (STAT_IDS.every((id) => s[id] >= 50)) s.gezondheid = clamp(s.gezondheid + 0.1 * dt);

    if (!state.sick && s.gezondheid < 40) {
      state.sick = true;
      toast(`Oh nee, ${state.name} is ziek! 🤒 Geef medicijn of ga naar de dokter.`, 'warn');
      Sound.bad();
    } else if (state.sick && s.gezondheid >= 70) {
      state.sick = false;
      toast(`${state.name} is weer beter! 💚`, 'good');
    }

    // "houd alles boven X%" taken
    if (factor === 1) {
      levelDef(state.level).tasks.forEach((t, i) => {
        if (t.t !== 'keep' || (state.prog[i] || 0) >= t.s) return;
        const ok = STAT_IDS.every((id) => s[id] >= t.v) && s.gezondheid >= t.v;
        state.prog[i] = ok ? (state.prog[i] || 0) + dt : 0;
        if (state.prog[i] >= t.s) { toast('Taak gehaald! ✅', 'good'); checkLevel(); renderTaskStrip(); }
      });
    }
  }

  // Als de app dicht was: langzamer laten zakken en nooit onder 15%
  function offline(sec) {
    sec = Math.min(sec, 8 * 3600);
    const s = state.stats;
    const before = { ...s };
    const wasSleeping = state.sleeping;
    for (const id of STAT_IDS) {
      if (id === 'energie' && wasSleeping) { s.energie = 100; continue; }
      s[id] = Math.max(Math.min(before[id], 15), s[id] - DECAY[id] * 0.2 * sec);
    }
    state.sleeping = false;
    state.litter = clamp(state.litter + 0.02 * sec);
    if (sec > 120) toast(`Welkom terug! ${state.name} heeft je gemist 💕`);
    renderAll();
    save();
  }

  /* ------------------------------------------------------------ tekenen */
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function renderAll() {
    renderTop(); renderStats(); renderScene(); renderActions(); renderTaskStrip();
    renderLevels(); renderGames(); renderShop();
  }

  function renderTop() {
    $('#top-level').textContent = state.level;
    $('#top-coins').textContent = state.coins;
    $('#top-name').textContent = state.name;
  }

  function renderStats() {
    const box = $('#stats');
    if (!box.children.length) {
      box.innerHTML = STATS.map((st) => `
        <div class="stat" data-s="${st.id}">
          <span class="stat-icon">${st.icon}</span>
          <div class="bar"><div class="fill" style="background:${st.color}"></div></div>
        </div>`).join('');
    }
    STATS.forEach((st) => {
      const v = state.stats[st.id];
      const el = box.querySelector(`[data-s="${st.id}"]`);
      el.querySelector('.fill').style.width = v + '%';
      el.classList.toggle('low', v < 25);
    });
  }

  function mood() {
    if (state.sleeping) return 'sleep';
    if (state.sick) return 'sick';
    const s = state.stats;
    const avg = STAT_IDS.reduce((a, id) => a + s[id], 0) / STAT_IDS.length;
    const min = Math.min(...STAT_IDS.map((id) => s[id]));
    if (min < 25) return 'sad';
    if (avg > 68) return 'happy';
    return 'normal';
  }

  function need() {
    const s = state.stats;
    if (state.sleeping) return 'Zzz...';
    if (state.sick) return 'Ik voel me niet lekker 🤒';
    if (s.eten < 30) return 'Ik heb honger! 🍗';
    if (s.drinken < 30) return 'Ik heb dorst! 💧';
    if (state.litter > 65) return 'Bah, de kattenbak! 💩';
    if (s.energie < 25) return 'Ik ben moe... 😴';
    if (s.schoon < 30) return 'Ik voel me vies 🫧';
    if (s.plezier < 30) return 'Ik verveel me! 🧶';
    return '';
  }

  function updateMood() {
    const m = mood() + '|' + need() + '|' + (state.litter > 50);
    if (m === lastMood) return;
    lastMood = m;
    const cat = $('#cat');
    if (cat) cat.innerHTML = catSVG(state.color, mood(), state.wearing);
    const b = $('#bubble');
    if (b) { const n = need(); b.textContent = n; b.classList.toggle('show', !!n); }
    const lb = $('#litterbox');
    if (lb) lb.classList.toggle('dirty', state.litter > 50);
  }

  function furniture(id) {
    switch (id) {
      case 'raam': return `<div class="f f-raam"><div class="sky"><span class="sun">☀️</span><span class="bird">🐦</span></div></div>`;
      case 'schilderij': return `<div class="f f-schilderij"><div class="canvas">🐟</div></div>`;
      case 'klok': return `<div class="f f-klok">🕰️</div>`;
      case 'lichtjes': return `<div class="f f-lichtjes">${Array.from({ length: 14 }, (_, i) => `<i style="animation-delay:${(i % 4) * 0.3}s"></i>`).join('')}</div>`;
      case 'aquarium': return `<div class="f f-aquarium"><span class="fish">🐠</span><span class="fish f2">🐟</span></div>`;
      case 'plant': return `<div class="f f-plant">🪴</div>`;
      case 'krabpaal': return `<div class="f f-krabpaal"><div class="top"></div><div class="post"></div><div class="base"></div></div>`;
      case 'kattentoren': return `<div class="f f-toren"><div class="plat p1"></div><div class="plat p2"></div><div class="plat p3"></div><div class="pole"></div><div class="house"></div></div>`;
      case 'kattenmand': return `<div class="f f-mand"><div class="cushion"></div></div>`;
      case 'kussen': return `<div class="f f-kussen"></div>`;
      case 'vloerkleed': return `<div class="f f-kleed"></div>`;
      case 'fontein': return `<div class="f f-fontein">⛲</div>`;
      case 'voerbak': return '';
    }
    return '';
  }

  function renderScene() {
    const scene = $('#scene');
    const wall = ITEMS[state.wall] || ITEMS.creme;
    const order = ['lichtjes', 'raam', 'schilderij', 'klok', 'aquarium', 'plant', 'vloerkleed', 'krabpaal', 'kattentoren', 'kattenmand', 'kussen', 'fontein'];
    const sleepInBed = state.sleeping && owns('kattenmand');
    scene.innerHTML = `
      <div class="wall ${wall.dark ? 'dark' : ''}" style="background:${wall.wall}">${wall.dark ? '<div class="stars"></div>' : ''}</div>
      <div class="floor"></div>
      ${order.filter(owns).map(furniture).join('')}
      <div class="f f-bowl food ${owns('voerbak') ? 'luxe' : ''}"><div class="kibble"></div></div>
      ${owns('fontein') ? '' : '<div class="f f-bowl water"><div class="liquid"></div></div>'}
      <div class="f f-litter ${state.litter > 50 ? 'dirty' : ''}" id="litterbox"><div class="sand"></div><span class="poop">💩</span><span class="stink">〰️</span></div>
      <div id="cat-wrap" class="cat-wrap ${state.sleeping ? 'sleeping' : ''} ${sleepInBed ? 'in-bed' : ''}">
        <div id="bubble" class="bubble"></div>
        <div id="cat" class="cat"></div>
        ${state.sleeping ? '<div class="zzz"><span>z</span><span>z</span><span>Z</span></div>' : ''}
      </div>`;
    lastMood = '';
    updateMood();
    $('#cat-wrap').addEventListener('pointerdown', (e) => { e.preventDefault(); petCat(); });
  }

  function renderActions() {
    $('#actions').innerHTML = ACTIONS.map((a) => {
      const count = a.inv ? state.inv[a.inv] : null;
      let label = a.name, icon = a.icon;
      if (a.id === 'slapen' && state.sleeping) { label = 'Wakker'; icon = '☀️'; }
      if (a.id === 'spelen') icon = ITEMS[bestToy()].icon;
      const dim = (state.sleeping && a.id !== 'slapen') || (count === 0);
      return `<button class="act ${dim ? 'dim' : ''}" data-a="${a.id}">
        <span class="act-icon">${icon}</span><span class="act-label">${label}</span>
        ${count !== null ? `<span class="badge ${count === 0 ? 'zero' : ''}">${count}</span>` : ''}
      </button>`;
    }).join('');
  }

  function renderTaskStrip() {
    const def = levelDef(state.level);
    const st = def.tasks.map((t, i) => taskStatus(t, i));
    const done = st.filter((x) => x.done).length;
    const nextIdx = st.findIndex((x) => !x.done);
    const nextText = nextIdx >= 0 ? `${taskText(def.tasks[nextIdx])} <b>${st[nextIdx].cur}/${st[nextIdx].max}</b>` : 'Alles klaar! 🎉';
    $('#task-strip').innerHTML = `
      <span class="ts-level">${def.icon} Lvl ${state.level}</span>
      <span class="ts-text">${nextText}</span>
      <span class="ts-count">${done}/${def.tasks.length} ✅</span>`;
  }

  function renderTaskStripIfVisible() {
    const def = levelDef(state.level);
    if (def.tasks.some((t) => t.t === 'keep')) renderTaskStrip();
    if ($('#tab-levels').classList.contains('active')) renderLevels();
  }

  function renderLevels() {
    const def = levelDef(state.level);
    $('#level-current').innerHTML = `
      <div class="lc-head"><span class="lc-icon">${def.icon}</span>
        <div><div class="lc-num">Level ${state.level}</div><div class="lc-name">${def.name}</div></div>
        <div class="lc-reward">🎁 ${def.reward} 🪙</div></div>
      <p class="lc-story">${def.story}</p>
      <ul class="tasks">${def.tasks.map((t, i) => {
        const s = taskStatus(t, i);
        return `<li class="${s.done ? 'done' : ''}">
          <span class="check">${s.done ? '✅' : '⬜'}</span>
          <div class="task-body"><div>${taskText(t)}</div>
          <div class="tbar"><div style="width:${(s.cur / s.max) * 100}%"></div></div></div>
          <span class="tcount">${s.cur}/${s.max}</span></li>`;
      }).join('')}</ul>`;

    const total = Math.max(LEVELS.length, state.level + 2);
    let html = '';
    for (let n = 1; n <= total; n++) {
      const d = levelDef(n);
      const cls = n < state.level ? 'done' : n === state.level ? 'current' : 'locked';
      html += `<div class="lm-node ${cls}" style="--x:${[0, 1, 2, 1][n % 4]}">
        <div class="lm-dot">${n < state.level ? '⭐' : n === state.level ? d.icon : '🔒'}</div>
        <div class="lm-label">${n}. ${n <= state.level ? d.name : '???'}</div></div>`;
    }
    $('#level-map').innerHTML = html;
  }

  function gameById(id) { return MINIGAMES.find((g) => g.id === id); }

  function renderGames() {
    $('#game-list').innerHTML = MINIGAMES.map((g) => {
      const locked = state.level < g.level;
      return `<div class="game-card ${locked ? 'locked' : ''}">
        <div class="gc-icon">${g.icon}</div>
        <div class="gc-info"><div class="gc-name">${g.name}</div><div class="gc-desc">${g.desc}</div>
          <div class="gc-best">🏆 Record: ${state.best[g.id] || 0} ${g.unit}</div></div>
        <button class="btn btn-primary gc-play" data-g="${g.id}" ${locked ? 'disabled' : ''}>${locked ? `🔒 Lvl ${g.level}` : 'Speel'}</button>
      </div>`;
    }).join('');
  }

  function renderShop() {
    $('#shop-cats').innerHTML = SHOP_CATS.map((c) =>
      `<button class="chip ${c.id === shopCat ? 'active' : ''}" data-c="${c.id}">${c.icon} ${c.name}</button>`).join('');
    const items = Object.keys(ITEMS).filter((k) => ITEMS[k].cat === shopCat);
    $('#shop-list').innerHTML = items.map((k) => {
      const it = ITEMS[k];
      const locked = state.level < it.level;
      let btn;
      let extra = '';
      if (locked) btn = `<button class="btn" disabled>🔒 Lvl ${it.level}</button>`;
      else if (it.cat === 'verzorging') {
        extra = `<div class="si-have">Je hebt: <b>${state.inv[k] || 0}</b></div>`;
        btn = `<button class="btn btn-buy" data-buy="${k}" ${state.coins < it.price ? 'disabled' : ''}>🪙 ${it.price}</button>`;
      } else if (owns(k)) {
        if (it.cat === 'kleding') btn = `<button class="btn ${state.wearing === k ? 'btn-on' : ''}" data-wear="${k}">${state.wearing === k ? 'Uitdoen' : 'Aandoen'}</button>`;
        else if (it.cat === 'behang') btn = `<button class="btn ${state.wall === k ? 'btn-on' : ''}" data-wall="${k}">${state.wall === k ? '✔ Gekozen' : 'Kiezen'}</button>`;
        else btn = `<button class="btn btn-on" disabled>✔ Heb je</button>`;
      } else {
        btn = `<button class="btn btn-buy" data-buy="${k}" ${state.coins < it.price ? 'disabled' : ''}>🪙 ${it.price}</button>`;
      }
      const preview = it.cat === 'behang' ? `<span class="swatch" style="background:${it.wall}"></span>` : it.icon;
      return `<div class="shop-item ${locked ? 'locked' : ''}">
        <div class="si-icon">${preview}</div>
        <div class="si-info"><div class="si-name">${it.name}</div><div class="si-desc">${it.desc}</div>${extra}</div>
        ${btn}</div>`;
    }).join('');
  }

  /* ------------------------------------------------------------ winkel */
  function buy(id) {
    const it = ITEMS[id];
    if (state.coins < it.price) { toast('Niet genoeg munten! Speel een spelletje 🎮', 'warn'); Sound.bad(); return; }
    state.coins -= it.price;
    if (it.cat === 'verzorging') {
      state.inv[id] = (state.inv[id] || 0) + it.gives;
      toast(`Gekocht: ${it.icon} ${it.name}`, 'good');
    } else {
      state.owned[id] = true;
      if (it.cat === 'kleding') state.wearing = id;
      if (it.cat === 'behang') state.wall = id;
      toast(`Gekocht: ${it.icon} ${it.name}!`, 'good');
      if (it.cat === 'huis') setTimeout(() => toast('Kijk maar eens in je huis 🏠'), 600);
    }
    Sound.coin();
    renderAll();
    checkLevel();
    save();
  }

  /* ------------------------------------------------------------ minigames */
  function openMinigame(id) {
    const g = gameById(id);
    if (!g || state.level < g.level) return;
    Sound.unlock();
    paused = true;
    mg = { game: g, cleanup: null };
    $('#mg-title').textContent = `${g.icon} ${g.name}`;
    $('#mg-hud').innerHTML = '';
    $('#minigame').classList.remove('hidden');
    showMgIntro();
  }

  function showMgIntro() {
    const g = mg.game;
    $('#mg-hud').innerHTML = '';
    $('#mg-body').innerHTML = `
      <div class="mg-intro">
        <div class="mg-big">${g.icon}</div>
        <h2>${g.name}</h2>
        <p>${g.howto}</p>
        <div class="mg-best">🏆 Jouw record: ${state.best[g.id] || 0} ${g.unit}</div>
        <button class="btn btn-primary btn-big" id="mg-start">Start!</button>
      </div>`;
    $('#mg-start').onclick = () => startMg();
  }

  function startMg() {
    const g = mg.game;
    const body = $('#mg-body');
    body.innerHTML = '';
    let ended = false;
    mg.cleanup = g.start(body, {
      level: state.level,
      color: state.color,
      hud: (html) => { $('#mg-hud').innerHTML = html; },
      end: (score) => {
        if (ended || !mg) return;
        ended = true;
        if (mg.cleanup) { mg.cleanup(); mg.cleanup = null; }
        finishMg(score);
      },
    });
  }

  function finishMg(score) {
    const g = mg.game;
    const coins = Math.max(0, g.coins(score));
    const record = score > (state.best[g.id] || 0);
    if (record) state.best[g.id] = score;
    state.plays++;
    addCoins(coins, true);
    addStat('plezier', 5);
    emit('play', { game: g.id, score });
    if (coins > 0) Sound.coin();
    $('#mg-body').innerHTML = `
      <div class="mg-result">
        <div class="mg-cat">${catSVG(state.color, score > 0 ? 'happy' : 'normal', state.wearing)}</div>
        <h2>${record && score > 0 ? '🏆 Nieuw record!' : score > 0 ? 'Goed gedaan!' : 'Volgende keer beter!'}</h2>
        <div class="mg-score">${score} ${g.unit}</div>
        <div class="reward">+${coins} 🪙</div>
        <div class="btn-row">
          <button class="btn" id="mg-home">🏠 Naar huis</button>
          <button class="btn btn-primary" id="mg-again">🔁 Nog een keer</button>
        </div>
      </div>`;
    $('#mg-again').onclick = () => startMg();
    $('#mg-home').onclick = () => closeMinigame();
    save();
  }

  function closeMinigame() {
    if (mg && mg.cleanup) mg.cleanup();
    mg = null;
    $('#minigame').classList.add('hidden');
    $('#mg-body').innerHTML = '';
    paused = false;
    lastTick = Date.now();
    renderAll();
    checkLevel();
  }

  /* ------------------------------------------------------------ instellingen */
  function settings() {
    modal(`
      <div class="settings">
        <h2>⚙️ Instellingen</h2>
        <label class="row-toggle"><span>🔊 Geluid</span><input type="checkbox" id="set-sound" ${state.sound ? 'checked' : ''}></label>
        <label class="field-label" for="set-name">Naam van je kat</label>
        <input id="set-name" class="text-input" maxlength="14" value="${esc(state.name)}">
        <div class="field-label">Vachtkleur</div>
        <div class="color-picker" id="set-colors">${colorButtons(state.color)}</div>
        <div class="btn-row"><button class="btn btn-primary" id="set-ok">Klaar</button></div>
        <button class="btn btn-danger" id="set-reset">Opnieuw beginnen</button>
      </div>`, (card) => {
      let color = state.color;
      $('#set-colors', card).onclick = (e) => {
        const b = e.target.closest('[data-color]');
        if (!b) return;
        color = b.dataset.color;
        $('#set-colors', card).innerHTML = colorButtons(color);
      };
      $('#set-ok', card).onclick = () => {
        state.sound = $('#set-sound', card).checked;
        Sound.setEnabled(state.sound);
        const n = $('#set-name', card).value.trim();
        if (n) state.name = n;
        state.color = color;
        closeModal(); renderAll(); save();
      };
      $('#set-reset', card).onclick = () => {
        if (!confirm('Weet je het zeker? Al je voortgang, munten en spullen zijn dan weg.')) return;
        try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ }
        location.reload();
      };
    });
  }

  function colorButtons(sel) {
    return Object.keys(CAT_COLORS).map((k) => `
      <button class="color-btn ${k === sel ? 'sel' : ''}" data-color="${k}" aria-label="${CAT_COLORS[k].name}">
        <span style="background:${CAT_COLORS[k].main}"></span>${CAT_COLORS[k].name}</button>`).join('');
  }

  /* ------------------------------------------------------------ start */
  function showStart() {
    let color = 'oranje';
    $('#screen-start').classList.remove('hidden');
    $('#screen-game').classList.add('hidden');
    const draw = () => {
      $('#start-cat').innerHTML = catSVG(color, 'happy');
      $('#color-picker').innerHTML = colorButtons(color);
    };
    draw();
    $('#color-picker').onclick = (e) => {
      const b = e.target.closest('[data-color]');
      if (!b) return;
      color = b.dataset.color; draw(); Sound.unlock(); Sound.meow();
    };
    $('#btn-start').onclick = () => {
      const name = $('#cat-name').value.trim() || 'Minoes';
      state = newState(name, color);
      Sound.unlock();
      save();
      startGame(true);
    };
  }

  function switchTab(tab) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + tab));
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'levels') renderLevels();
    if (tab === 'winkel') renderShop();
    if (tab === 'spellen') renderGames();
    $('#tabs').scrollTop = 0;
  }

  function startGame(isNew) {
    $('#screen-start').classList.add('hidden');
    $('#screen-game').classList.remove('hidden');
    Sound.setEnabled(state.sound);
    lastTick = Date.now();
    const away = (Date.now() - (state.lastSeen || Date.now())) / 1000;
    renderAll();
    if (!isNew && away > 30) offline(away);
    if (isNew) showLevelIntro();
    else checkLevel();
  }

  function bindUI() {
    $('#actions').addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]');
      if (b) doAction(b.dataset.a);
    });
    $('#task-strip').onclick = () => switchTab('levels');
    $('#btn-level').onclick = () => switchTab('levels');
    $('#btn-settings').onclick = settings;
    document.querySelectorAll('.nav-btn').forEach((b) => { b.onclick = () => { Sound.tap(); switchTab(b.dataset.tab); }; });
    $('#game-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-g]');
      if (b) openMinigame(b.dataset.g);
    });
    $('#shop-cats').addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (b) { shopCat = b.dataset.c; renderShop(); }
    });
    $('#shop-list').addEventListener('click', (e) => {
      const buyBtn = e.target.closest('[data-buy]');
      const wear = e.target.closest('[data-wear]');
      const wall = e.target.closest('[data-wall]');
      if (buyBtn) buy(buyBtn.dataset.buy);
      if (wear) { state.wearing = state.wearing === wear.dataset.wear ? null : wear.dataset.wear; renderAll(); checkLevel(); save(); }
      if (wall) { state.wall = wall.dataset.wall; renderAll(); save(); }
    });
    $('#mg-close').onclick = () => closeMinigame();
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !levelModalOpen) closeModal(); });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) save();
      else if (state) tick();
    });
    window.addEventListener('pagehide', save);
  }

  bindUI();
  state = load();
  if (state) startGame(false); else showStart();
  setInterval(tick, 1000);
  setInterval(save, 5000);
})();
