/* Kitty Care – eenvoudige geluidjes met de Web Audio API (geen bestanden nodig) */

const Sound = (() => {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur = 0.12, type = 'sine', vol = 0.15, delay = 0, slideTo = null) {
    if (!enabled) return;
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + delay;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    setEnabled(v) { enabled = v; },
    unlock() { ac(); },
    tap()    { tone(660, 0.06, 'triangle', 0.08); },
    coin()   { tone(988, 0.08, 'square', 0.06); tone(1319, 0.14, 'square', 0.06, 0.07); },
    good()   { tone(660, 0.1, 'triangle', 0.12); tone(880, 0.14, 'triangle', 0.12, 0.08); },
    bad()    { tone(220, 0.2, 'sawtooth', 0.08, 0, 150); },
    meow()   { tone(700, 0.18, 'sine', 0.14, 0, 1100); tone(1100, 0.25, 'sine', 0.12, 0.17, 600); },
    purr()   { for (let i = 0; i < 5; i++) tone(70 + (i % 2) * 8, 0.09, 'sawtooth', 0.05, i * 0.08); },
    pop()    { tone(500, 0.07, 'sine', 0.12, 0, 900); },
    jump()   { tone(400, 0.09, 'triangle', 0.1, 0, 700); },
    levelUp(){ [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.13, i * 0.12)); },
  };
})();
