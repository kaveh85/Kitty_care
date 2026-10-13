/* Kitty Care – minigames om munten te verdienen
 *
 * Elk spel heeft start(body, api) en geeft een opruimfunctie terug.
 *   api.level     – het level van de speler (moeilijkheid)
 *   api.color     – vachtkleur van de kat
 *   api.hud(html) – toon score/tijd bovenin
 *   api.end(score)– spel klaar
 */

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/* ---------------------------------------------------------- Snel rekenen */
const RekenGame = {
  id: 'rekenen', name: 'Snel Rekenen', icon: '🧮', level: 1, unit: 'goed',
  desc: 'Los zoveel mogelijk sommen op in 45 seconden.',
  howto: 'Tik op het goede antwoord. Goed = +1 punt. Fout = 2 seconden eraf. Hoe meer je er achter elkaar goed hebt, hoe moeilijker het wordt!',
  coins: (s) => s,
  start(body, api) {
    body.innerHTML = `
      <div class="math">
        <div class="math-cat" id="m-cat"></div>
        <div class="math-q" id="m-q"></div>
        <div class="math-opts" id="m-opts"></div>
        <div class="math-fb" id="m-fb"></div>
      </div>`;
    const qEl = body.querySelector('#m-q');
    const optsEl = body.querySelector('#m-opts');
    const fbEl = body.querySelector('#m-fb');
    body.querySelector('#m-cat').innerHTML = catSVG(api.color, 'normal');

    let score = 0, streak = 0, time = 45, answer = 0, over = false, locked = false;

    const diff = () => Math.min(5, 1 + Math.floor((api.level - 1) / 2) + Math.floor(streak / 5));

    function makeQuestion() {
      const d = diff();
      const ops = d === 1 ? ['+', '-'] : d === 2 ? ['+', '-', '+'] : d === 3 ? ['+', '-', '×'] : ['+', '-', '×', '×', ':'];
      const op = ops[rand(0, ops.length - 1)];
      let a, b;
      const max = [10, 20, 50, 100, 100][d - 1];
      if (op === '+') { a = rand(1, max - 1); b = rand(1, max - a); answer = a + b; }
      else if (op === '-') { a = rand(2, max); b = rand(1, a); answer = a - b; }
      else if (op === '×') { const t = d <= 3 ? 5 : 10; a = rand(1, t); b = rand(1, 10); answer = a * b; }
      else { b = rand(2, 10); answer = rand(1, 10); a = b * answer; }
      qEl.textContent = `${a} ${op} ${b} = ?`;

      const opts = new Set([answer]);
      const deltas = [1, -1, 2, -2, 10, -10, 3, -3, 5];
      while (opts.size < 4) {
        const v = answer + deltas[rand(0, deltas.length - 1)] * (Math.random() < 0.2 ? 2 : 1);
        if (v >= 0) opts.add(v);
      }
      optsEl.innerHTML = shuffle([...opts]).map((v) => `<button class="math-opt" data-v="${v}">${v}</button>`).join('');
    }

    function hud() {
      api.hud(`<span>⏱ ${Math.ceil(time)}</span><span>✅ ${score}</span>${streak >= 3 ? `<span>🔥${streak}</span>` : ''}`);
    }

    optsEl.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.math-opt');
      if (!btn || over || locked) return;
      e.preventDefault();
      if (Number(btn.dataset.v) === answer) {
        score++; streak++;
        btn.classList.add('right');
        fbEl.textContent = ['Goed zo!', 'Super!', 'Knap!', 'Top!', 'Miauw!'][rand(0, 4)];
        fbEl.className = 'math-fb ok';
        Sound.good();
      } else {
        streak = 0; time = Math.max(0, time - 2);
        btn.classList.add('wrong');
        fbEl.textContent = `Oei! Het was ${answer}`;
        fbEl.className = 'math-fb no';
        Sound.bad();
      }
      locked = true;
      hud();
      setTimeout(() => { locked = false; if (!over) makeQuestion(); }, 280);
    });

    const timer = setInterval(() => {
      time -= 0.1;
      if (time <= 0) {
        time = 0; over = true; clearInterval(timer); hud();
        api.end(score);
        return;
      }
      if (Math.abs(time - Math.round(time)) < 0.05) hud();
    }, 100);

    makeQuestion();
    hud();
    return () => clearInterval(timer);
  },
};

/* ---------------------------------------------------------- Klimmen */
const KlimGame = {
  id: 'klimmen', name: 'Boom Klimmen', icon: '🌳', level: 1, unit: 'meter',
  desc: 'Klim zo hoog mogelijk in de boom zonder tegen takken te botsen.',
  howto: 'Tik op de linker- of rechterkant van het scherm om aan die kant omhoog te klimmen. Pas op voor takken! Klim snel, anders raakt je tijd op.',
  coins: (s) => Math.floor(s / 2.5),
  start(body, api) {
    body.innerHTML = `
      <div class="climb" id="climb">
        <canvas id="climb-canvas"></canvas>
        <div class="climb-hint" id="climb-hint"><span>◀ Tik links</span><span>Tik rechts ▶</span></div>
      </div>`;
    const wrap = body.querySelector('#climb');
    const hint = body.querySelector('#climb-hint');
    const canvas = body.querySelector('#climb-canvas');
    const g = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, SH = 0;

    const catImg = new Image();
    catImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(catSVG(api.color, 'happy').replace('<svg ', '<svg width="200" height="200" '));

    let segs = [];
    let side = 'L';
    let score = 0;
    let energy = 1;
    let started = false;
    let dead = false;
    let deadT = 0;
    let offset = 0;
    let raf = 0;
    let last = performance.now();
    let lastBranch = null;

    function newSeg() {
      let branch = null;
      if (lastBranch === null && Math.random() < 0.62) branch = Math.random() < 0.5 ? 'L' : 'R';
      else if (lastBranch !== null && Math.random() < 0.35) branch = lastBranch;
      lastBranch = branch;
      return { branch, leaf: Math.random() < 0.5, bird: branch && Math.random() < 0.15 };
    }

    function resize() {
      W = wrap.clientWidth; H = wrap.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      SH = Math.max(60, H / 7);
      const need = Math.ceil(H / SH) + 3;
      while (segs.length < need) segs.push(segs.length < 3 ? { branch: null } : newSeg());
    }

    function climb(s) {
      if (dead) return;
      if (!started) { started = true; hint.classList.add('fade'); }
      side = s;
      segs.shift();
      segs.push(newSeg());
      offset = -SH;
      if (segs[0].branch === side) {
        die();
        return;
      }
      score++;
      energy = Math.min(1, energy + 0.075);
      Sound.jump();
      hud();
    }

    function die() {
      dead = true; deadT = 0;
      Sound.bad();
      setTimeout(() => api.end(score), 900);
    }

    function hud() { api.hud(`<span>🌳 ${score} m</span>`); }

    function draw(dt) {
      // lucht wordt donkerder naarmate je hoger komt
      const h = Math.min(1, score / 80);
      const top = `hsl(${205 + h * 30}, ${70 - h * 20}%, ${70 - h * 45}%)`;
      const bot = `hsl(${195 + h * 30}, 75%, ${88 - h * 40}%)`;
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, top); sky.addColorStop(1, bot);
      g.fillStyle = sky; g.fillRect(0, 0, W, H);

      // sterren of wolken
      if (h > 0.5) {
        g.fillStyle = `rgba(255,255,255,${(h - 0.5) * 2})`;
        for (let i = 0; i < 30; i++) {
          const x = (i * 97) % W, y = (i * 53 + score * 2) % H;
          g.fillRect(x, y, 2, 2);
        }
      }
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 4; i++) {
        const y = ((i * 170 + score * 9 + offset * 0.3 + 6000) % (H + 120)) - 60;
        const x = (i * 131) % (W - 60) + 30;
        cloud(x, y, 22 + (i % 2) * 10);
      }

      const trunkW = Math.max(46, W * 0.17);
      const cx = W / 2;
      const groundH = SH * 0.55;
      const groundY = H - groundH + score * SH + offset;

      // grond (verdwijnt naar onder als je klimt)
      if (groundY < H) {
        g.fillStyle = '#7cc66b'; g.fillRect(0, groundY, W, H - groundY);
        g.fillStyle = '#69b358'; g.fillRect(0, groundY, W, 8);
      }

      // stam
      g.fillStyle = '#8b5a3c';
      g.fillRect(cx - trunkW / 2, 0, trunkW, Math.min(H, groundY));
      g.fillStyle = '#74492f';
      for (let i = 0; i < segs.length; i++) {
        const y = H - groundH - SH * (i + 0.5) + offset;
        g.fillRect(cx - trunkW / 4, y - 10, 5, 22);
        g.fillRect(cx + trunkW / 8, y + 8, 5, 16);
      }

      // takken
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (!s.branch) continue;
        const y = H - groundH - SH * (i + 0.5) + offset;
        const len = W * 0.34;
        const th = Math.max(12, SH * 0.2);
        const dir = s.branch === 'L' ? -1 : 1;
        const x0 = cx + dir * trunkW / 2;
        g.fillStyle = '#8b5a3c';
        g.beginPath();
        g.moveTo(x0, y - th / 2);
        g.lineTo(x0 + dir * len, y - th / 3);
        g.lineTo(x0 + dir * len, y + th / 3);
        g.lineTo(x0, y + th / 2);
        g.fill();
        g.fillStyle = '#4caf50';
        leaf(x0 + dir * len, y, th * 1.3);
        leaf(x0 + dir * len * 0.6, y - th * 0.7, th * 0.9);
        if (s.bird) {
          g.font = `${th * 1.6}px sans-serif`;
          g.textAlign = 'center';
          g.fillText('🐦', x0 + dir * len * 0.4, y - th * 0.6);
        }
      }

      // kat
      const size = SH * 1.05;
      let catY = H - groundH - SH * 0.5 - size * 0.55;
      let catX = cx + (side === 'L' ? -1 : 1) * (trunkW / 2 + size * 0.38);
      let rot = 0;
      if (dead) {
        deadT += dt;
        catY += deadT * deadT * 900;
        rot = deadT * 8 * (side === 'L' ? -1 : 1);
      }
      g.save();
      g.translate(catX, catY + size / 2);
      g.rotate(rot);
      if (side === 'R') g.scale(-1, 1);
      if (catImg.complete && catImg.naturalWidth) g.drawImage(catImg, -size / 2, -size / 2, size, size);
      g.restore();

      // energiebalk
      const bw = W * 0.6, bx = (W - bw) / 2, by = 14;
      g.fillStyle = 'rgba(0,0,0,.25)'; roundRect(bx - 3, by - 3, bw + 6, 20, 10);
      g.fillStyle = energy > 0.3 ? '#ffd23f' : '#ff5a5a';
      roundRect(bx, by, bw * energy, 14, 7);
    }

    function cloud(x, y, r) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.arc(x + r, y + 4, r * 0.8, 0, Math.PI * 2);
      g.arc(x - r, y + 6, r * 0.7, 0, Math.PI * 2);
      g.fill();
    }
    function leaf(x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    function roundRect(x, y, w, h, r) {
      if (w <= 0) return;
      r = Math.min(r, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.fill();
    }

    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (offset < 0) offset = Math.min(0, offset + dt * SH * 14);
      if (started && !dead) {
        energy -= dt * Math.min(0.75, 0.16 + score * 0.006);
        if (energy <= 0) { energy = 0; die(); }
      }
      draw(dt);
      raf = requestAnimationFrame(loop);
    }

    const onPointer = (e) => {
      e.preventDefault();
      const r = wrap.getBoundingClientRect();
      climb(e.clientX - r.left < r.width / 2 ? 'L' : 'R');
    };
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') climb('L');
      if (e.key === 'ArrowRight') climb('R');
    };
    wrap.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', resize);

    resize();
    hud();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', resize);
    };
  },
};

/* ---------------------------------------------------------- Geheugen puzzel */
const PuzzelGame = {
  id: 'puzzel', name: 'Kattenpuzzel', icon: '🧩', level: 2, unit: 'punten',
  desc: 'Zoek alle paartjes met zo min mogelijk beurten.',
  howto: 'Draai steeds 2 kaartjes om. Zijn ze hetzelfde? Dan blijven ze liggen. Vind alle 8 paartjes. Hoe minder beurten, hoe meer punten (max 30)!',
  coins: (s) => s,
  start(body, api) {
    const symbols = ['🐟', '🧶', '🐭', '🥛', '🐾', '🎀', '🐦', '🦋'];
    const cards = shuffle([...symbols, ...symbols]);
    body.innerHTML = `<div class="memory" id="memory">${cards.map((s, i) => `
      <button class="mcard" data-i="${i}">
        <span class="mface mback">🐱</span>
        <span class="mface mfront">${s}</span>
      </button>`).join('')}</div>`;
    const grid = body.querySelector('#memory');
    let open = [];
    let moves = 0;
    let found = 0;
    let busy = false;

    const score = () => Math.max(1, 30 - Math.max(0, moves - 8));
    const hud = () => api.hud(`<span>🔄 ${moves}</span><span>⭐ ${score()}</span>`);

    grid.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.mcard');
      if (!card || busy || card.classList.contains('flip')) return;
      e.preventDefault();
      card.classList.add('flip');
      Sound.tap();
      open.push(card);
      if (open.length < 2) return;
      moves++;
      const [a, b] = open;
      if (cards[a.dataset.i] === cards[b.dataset.i]) {
        a.classList.add('match'); b.classList.add('match');
        open = []; found++;
        Sound.good();
        if (found === symbols.length) setTimeout(() => api.end(score()), 600);
      } else {
        busy = true;
        setTimeout(() => {
          a.classList.remove('flip'); b.classList.remove('flip');
          open = []; busy = false;
        }, 750);
      }
      hud();
    });

    hud();
    return () => {};
  },
};

/* ---------------------------------------------------------- Muizen vangen */
const MuizenGame = {
  id: 'muizen', name: 'Muizen Vangen', icon: '🐭', level: 3, unit: 'muizen',
  desc: 'Vang zoveel mogelijk muizen in 30 seconden. Pas op voor de hond!',
  howto: 'Tik snel op de muizen 🐭 als ze uit hun holletje komen. Tik NIET op de hond 🐶, dan verlies je 2 punten. Een gouden kaas 🧀 is 3 punten waard!',
  coins: (s) => s,
  start(body, api) {
    body.innerHTML = `<div class="mice" id="mice">${Array.from({ length: 9 }, (_, i) => `
      <div class="hole" data-i="${i}"><div class="critter"></div><div class="hole-front"></div></div>`).join('')}</div>`;
    const holes = [...body.querySelectorAll('.hole')];
    let score = 0;
    let time = 30;
    let over = false;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

    const hud = () => api.hud(`<span>⏱ ${Math.ceil(time)}</span><span>🐭 ${score}</span>`);

    function spawn() {
      if (over) return;
      const free = holes.filter((h) => !h.classList.contains('up'));
      if (free.length) {
        const h = free[rand(0, free.length - 1)];
        const elapsed = 30 - time;
        const r = Math.random();
        const kind = elapsed > 4 && r < 0.18 ? 'dog' : r > 0.94 ? 'kaas' : 'mouse';
        const crit = h.querySelector('.critter');
        crit.textContent = kind === 'dog' ? '🐶' : kind === 'kaas' ? '🧀' : '🐭';
        h.dataset.kind = kind;
        h.classList.remove('hit');
        h.classList.add('up');
        const stay = Math.max(600, 1150 - elapsed * 18) + (kind === 'dog' ? 300 : 0);
        const id = Math.random();
        h.dataset.id = id;
        later(() => { if (h.dataset.id == id) h.classList.remove('up'); }, stay);
      }
      const elapsed = 30 - time;
      later(spawn, Math.max(330, 700 - elapsed * 12) + rand(0, 200));
    }

    body.querySelector('#mice').addEventListener('pointerdown', (e) => {
      const h = e.target.closest('.hole');
      if (!h || over || !h.classList.contains('up') || h.classList.contains('hit')) return;
      e.preventDefault();
      h.classList.add('hit');
      const kind = h.dataset.kind;
      if (kind === 'dog') { score = Math.max(0, score - 2); Sound.bad(); }
      else { score += kind === 'kaas' ? 3 : 1; Sound.pop(); }
      const crit = h.querySelector('.critter');
      crit.textContent = kind === 'dog' ? '😾' : '💥';
      hud();
      later(() => { h.classList.remove('up'); }, 220);
    });

    const tick = setInterval(() => {
      time -= 1;
      hud();
      if (time <= 0) {
        over = true;
        clearInterval(tick);
        holes.forEach((h) => h.classList.remove('up'));
        later(() => api.end(score), 400);
      }
    }, 1000);

    hud();
    later(spawn, 500);
    return () => { clearInterval(tick); timers.forEach(clearTimeout); over = true; };
  },
};

const MINIGAMES = [RekenGame, KlimGame, PuzzelGame, MuizenGame];
