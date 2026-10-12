/* Kitty Care – speldata: kleuren, waarden, winkel, levels */

const CAT_COLORS = {
  oranje: { name: 'Oranje', main: '#f5a54a', dark: '#d9772b', belly: '#fde6c8', eye: '#5cae4a', stripes: true },
  grijs:  { name: 'Grijs',  main: '#a3abb5', dark: '#6f7884', belly: '#e9ecef', eye: '#e8b630', stripes: true },
  zwart:  { name: 'Zwart',  main: '#3b3b47', dark: '#25252d', belly: '#5a5a6c', eye: '#e8c930', stripes: false },
  wit:    { name: 'Wit',    main: '#fbf8f4', dark: '#e6d6c4', belly: '#ffffff', eye: '#4a90d9', stripes: false },
  bruin:  { name: 'Bruin',  main: '#a8764f', dark: '#74492c', belly: '#e6c8a8', eye: '#5cae4a', stripes: true },
};

const STATS = [
  { id: 'eten',       name: 'Eten',    icon: '🍗', color: '#f59e0b' },
  { id: 'drinken',    name: 'Drinken', icon: '💧', color: '#3b82f6' },
  { id: 'schoon',     name: 'Schoon',  icon: '🫧', color: '#06b6d4' },
  { id: 'plezier',    name: 'Plezier', icon: '😺', color: '#ec4899' },
  { id: 'energie',    name: 'Energie', icon: '⚡', color: '#84cc16' },
  { id: 'gezondheid', name: 'Gezond',  icon: '❤️', color: '#ef4444' },
];

// Hoe snel waarden per seconde dalen (level 1)
const DECAY = { eten: 0.10, drinken: 0.12, schoon: 0.06, plezier: 0.09, energie: 0.07 };

const SHOP_CATS = [
  { id: 'verzorging', name: 'Verzorging', icon: '🧴' },
  { id: 'speelgoed',  name: 'Speelgoed',  icon: '🧶' },
  { id: 'huis',       name: 'Huis',       icon: '🛋️' },
  { id: 'kleding',    name: 'Kleding',    icon: '🎀' },
  { id: 'behang',     name: 'Behang',     icon: '🎨' },
];

/*
 * Winkelspullen.
 *  verzorging: verbruiksartikelen (gives = aantal in voorraad)
 *  speelgoed:  eenmalig kopen, power = hoeveel plezier spelen geeft
 *  huis:       meubels die in de kamer verschijnen (slot = plek in de kamer)
 *  kleding:    je kat kan één ding tegelijk dragen
 *  behang:     kleur van de muur
 */
const ITEMS = {
  // Verzorging
  voer:      { cat: 'verzorging', name: 'Kattenvoer',       icon: '🥫', price: 10, gives: 5, level: 1, desc: '5 porties lekker voer.' },
  snoepje:   { cat: 'verzorging', name: 'Kattensnoepjes',   icon: '🍬', price: 8,  gives: 3, level: 1, desc: '3 snoepjes: minder honger én blij!' },
  korrels:   { cat: 'verzorging', name: 'Kattenbakkorrels', icon: '🪣', price: 8,  gives: 3, level: 1, desc: 'Genoeg om de kattenbak 3x te verschonen.' },
  shampoo:   { cat: 'verzorging', name: 'Kattenshampoo',    icon: '🧴', price: 10, gives: 2, level: 1, desc: 'Voor 2 wasbeurten.' },
  medicijn:  { cat: 'verzorging', name: 'Medicijn',         icon: '💊', price: 15, gives: 1, level: 1, desc: 'Helpt als je kat zich niet lekker voelt.' },

  // Speelgoed
  wol:       { cat: 'speelgoed', name: 'Bolletje wol',  icon: '🧶', price: 0,  power: 20, level: 1, desc: 'Je eerste speeltje.' },
  speelmuis: { cat: 'speelgoed', name: 'Speelmuis',     icon: '🐭', price: 15, power: 26, level: 1, desc: 'Piep piep! Meer plezier bij spelen.' },
  hengel:    { cat: 'speelgoed', name: 'Veren-hengel',  icon: '🪶', price: 30, power: 32, level: 2, desc: 'Springen en grijpen!' },
  laser:     { cat: 'speelgoed', name: 'Laserlampje',   icon: '🔦', price: 50, power: 40, level: 4, desc: 'Rood stipje achterna rennen.' },
  kruid:     { cat: 'speelgoed', name: 'Kattenkruid',   icon: '🌿', price: 70, power: 48, level: 6, desc: 'Je kat wordt er heel vrolijk van.' },

  // Huis (meubels)
  kattenmand:  { cat: 'huis', name: 'Kattenmand',   icon: '🧺', price: 25,  level: 1, slot: 'mand',     desc: 'Slapen gaat 2x zo snel.' },
  plant:       { cat: 'huis', name: 'Plant',        icon: '🪴', price: 15,  level: 1, slot: 'plant',    desc: 'Gezellig groen.' },
  krabpaal:    { cat: 'huis', name: 'Krabpaal',     icon: '🪵', price: 40,  level: 2, slot: 'krabpaal', desc: 'Plezier daalt langzamer.' },
  schilderij:  { cat: 'huis', name: 'Schilderij',   icon: '🖼️', price: 20,  level: 2, slot: 'schilderij', desc: 'Kunst voor aan de muur.' },
  vloerkleed:  { cat: 'huis', name: 'Vloerkleed',   icon: '🟣', price: 25,  level: 2, slot: 'kleed',    desc: 'Zacht en warm.' },
  raam:        { cat: 'huis', name: 'Raam',         icon: '🪟', price: 35,  level: 3, slot: 'raam',     desc: 'Vogeltjes kijken! Plezier daalt langzamer.' },
  voerbak:     { cat: 'huis', name: 'Luxe voerbak', icon: '🥣', price: 30,  level: 3, slot: 'voerbak',  desc: 'Voeren geeft extra veel eten.' },
  kussen:      { cat: 'huis', name: 'Kussen',       icon: '🛋️', price: 15,  level: 3, slot: 'kussen',   desc: 'Een zacht plekje.' },
  lichtjes:    { cat: 'huis', name: 'Lichtslinger', icon: '✨', price: 20,  level: 4, slot: 'lichtjes', desc: 'Twinkel twinkel.' },
  klok:        { cat: 'huis', name: 'Koekoeksklok', icon: '🕰️', price: 25,  level: 5, slot: 'klok',     desc: 'Tik tak.' },
  aquarium:    { cat: 'huis', name: 'Aquarium',     icon: '🐠', price: 60,  level: 5, slot: 'aquarium', desc: 'Kijken mag, vangen niet! Meer plezier.' },
  fontein:     { cat: 'huis', name: 'Drinkfontein', icon: '⛲', price: 45,  level: 6, slot: 'fontein',  desc: 'Drinken daalt langzamer.' },
  kattentoren: { cat: 'huis', name: 'Kattentoren',  icon: '🏰', price: 120, level: 8, slot: 'toren',    desc: 'Het mooiste klimpaleis!' },

  // Kleding
  strik:     { cat: 'kleding', name: 'Strikje',    icon: '🎀', price: 20,  level: 1, desc: 'Schattig!' },
  bloem:     { cat: 'kleding', name: 'Bloemetje',  icon: '🌸', price: 15,  level: 1, desc: 'Voor achter het oor.' },
  sjaal:     { cat: 'kleding', name: 'Sjaal',      icon: '🧣', price: 25,  level: 3, desc: 'Lekker warm.' },
  hoed:      { cat: 'kleding', name: 'Hoge hoed',  icon: '🎩', price: 35,  level: 5, desc: 'Heel deftig.' },
  bril:      { cat: 'kleding', name: 'Zonnebril',  icon: '🕶️', price: 40,  level: 6, desc: 'Cool cat.' },
  kroon:     { cat: 'kleding', name: 'Kroontje',   icon: '👑', price: 100, level: 8, desc: 'Voor de koning(in) van het huis.' },

  // Behang
  creme:     { cat: 'behang', name: 'Crème',  icon: '🟨', price: 0,  level: 1, wall: '#fbeedd', desc: 'Het standaard behang.' },
  roze:      { cat: 'behang', name: 'Roze',   icon: '🩷', price: 15, level: 1, wall: '#fbd3e0', desc: 'Lief roze.' },
  blauw:     { cat: 'behang', name: 'Blauw',  icon: '🩵', price: 15, level: 2, wall: '#cfe6fb', desc: 'Als de lucht.' },
  groen:     { cat: 'behang', name: 'Groen',  icon: '💚', price: 15, level: 3, wall: '#d6f2d3', desc: 'Fris groen.' },
  paars:     { cat: 'behang', name: 'Paars',  icon: '💜', price: 20, level: 4, wall: '#e3d5f7', desc: 'Magisch paars.' },
  sterren:   { cat: 'behang', name: 'Sterrennacht', icon: '🌙', price: 40, level: 7, wall: 'linear-gradient(#2d3a6b,#4b5aa0)', dark: true, desc: 'Met twinkelende sterren.' },
};

/*
 * Levels met zorg-uitdagingen.
 * Taaktypes:
 *   action  – voer een verzorgingsactie n keer uit (a = actie-id)
 *   play    – speel n minigames (g = spel-id of 'any')
 *   score   – haal minstens n punten in spel g
 *   earn    – verdien n munten in dit level
 *   own     – bezit het item
 *   house   – bezit n meubels voor het huis
 *   keep    – houd alle waarden minstens v% voor s seconden achter elkaar
 *   wear    – laat je kat kleding dragen
 */
const LEVELS = [
  { name: 'Welkom thuis!', icon: '🏠', reward: 15, story: 'Je nieuwe kat is net verhuisd. Zorg dat je kat zich thuis voelt!',
    tasks: [ { t: 'action', a: 'voeren', n: 2 }, { t: 'action', a: 'water', n: 1 }, { t: 'action', a: 'aaien', n: 5 } ] },
  { name: 'Speeltijd', icon: '🧶', reward: 20, story: 'Katten willen spelen en vachtverzorging. Tijd voor actie!',
    tasks: [ { t: 'action', a: 'spelen', n: 3 }, { t: 'action', a: 'borstelen', n: 2 }, { t: 'play', g: 'any', n: 1 } ] },
  { name: 'Een eigen plekje', icon: '🧺', reward: 25, story: 'Elke kat heeft een fijn bedje nodig om in te slapen.',
    tasks: [ { t: 'own', item: 'kattenmand' }, { t: 'action', a: 'slapen', n: 1 }, { t: 'earn', n: 30 } ] },
  { name: 'Schoon en fris', icon: '🫧', reward: 30, story: 'Een schone kattenbak en een schone kat: zo blijft je kat gezond.',
    tasks: [ { t: 'action', a: 'kattenbak', n: 2 }, { t: 'action', a: 'wassen', n: 1 }, { t: 'keep', v: 50, s: 45 } ] },
  { name: 'Rekenwonder', icon: '🧮', reward: 35, story: 'Je kat kijkt mee met je sommen. Laat zien hoe slim je bent!',
    tasks: [ { t: 'score', g: 'rekenen', n: 10 }, { t: 'own', item: 'krabpaal' }, { t: 'action', a: 'snoepje', n: 2 } ] },
  { name: 'Klimkampioen', icon: '🌳', reward: 40, story: 'Katten zijn echte klimmers. Hoe hoog kom jij?',
    tasks: [ { t: 'score', g: 'klimmen', n: 20 }, { t: 'play', g: 'any', n: 3 }, { t: 'house', n: 4 } ] },
  { name: 'Bij de dierenarts', icon: '🩺', reward: 45, story: 'Tijd voor een controle! En daarna mag je kat zich mooi maken.',
    tasks: [ { t: 'action', a: 'dierenarts', n: 1 }, { t: 'wear' }, { t: 'earn', n: 60 } ] },
  { name: 'Puzzelmeester', icon: '🧩', reward: 50, story: 'Train je geheugen terwijl je kat lekker speelt.',
    tasks: [ { t: 'score', g: 'puzzel', n: 20 }, { t: 'action', a: 'voeren', n: 5 }, { t: 'action', a: 'spelen', n: 5 } ] },
  { name: 'Muizenjager', icon: '🐭', reward: 60, story: 'Er zijn muizen in huis! Help je kat ze te vangen.',
    tasks: [ { t: 'score', g: 'muizen', n: 18 }, { t: 'keep', v: 65, s: 60 }, { t: 'play', g: 'any', n: 4 } ] },
  { name: 'Kattenpaleis', icon: '🏰', reward: 100, story: 'Maak van je huis een echt kattenpaleis!',
    tasks: [ { t: 'house', n: 8 }, { t: 'own', item: 'kattentoren' }, { t: 'keep', v: 70, s: 60 } ] },
];
