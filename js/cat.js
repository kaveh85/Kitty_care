/* Kitty Care – de kat tekenen als SVG */

const ACCESSORY_POS = {
  strik: { x: 136, y: 62,  size: 30 },
  bloem: { x: 64,  y: 62,  size: 28 },
  sjaal: { x: 100, y: 142, size: 46 },
  hoed:  { x: 100, y: 54,  size: 48 },
  bril:  { x: 100, y: 98,  size: 46 },
  kroon: { x: 100, y: 52,  size: 40 },
};

/**
 * @param {string} colorId  sleutel uit CAT_COLORS
 * @param {string} mood     'normal' | 'happy' | 'sad' | 'sleep' | 'sick'
 * @param {string|null} accessory sleutel van kleding-item
 */
function catSVG(colorId, mood = 'normal', accessory = null) {
  const c = CAT_COLORS[colorId] || CAT_COLORS.oranje;
  const line = colorId === 'zwart' ? '#15151a' : '#3a2a20';

  const eye = (x) => {
    if (mood === 'happy') {
      return `<path d="M${x - 9} 88 Q${x} 74 ${x + 9} 88" stroke="${line}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    }
    if (mood === 'sleep') {
      return `<path d="M${x - 9} 84 Q${x} 93 ${x + 9} 84" stroke="${line}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    }
    const small = mood === 'sad' || mood === 'sick';
    return `<g class="eye">
      <ellipse cx="${x}" cy="85" rx="${small ? 8 : 9.5}" ry="${small ? 9 : 11.5}" fill="${c.eye}"/>
      <ellipse cx="${x}" cy="86" rx="${small ? 3.5 : 4.5}" ry="${small ? 7 : 9}" fill="#141414"/>
      <circle cx="${x + 3}" cy="80" r="3.2" fill="#fff"/>
    </g>`;
  };

  let brows = '';
  if (mood === 'sad' || mood === 'sick') {
    brows = `<path d="M70 70 L90 66" stroke="${line}" stroke-width="3.5" stroke-linecap="round"/>
             <path d="M130 70 L110 66" stroke="${line}" stroke-width="3.5" stroke-linecap="round"/>`;
  }

  let mouth;
  if (mood === 'happy') {
    mouth = `<path d="M90 100 Q100 116 110 100 Z" fill="#d9536f" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>`;
  } else if (mood === 'sad' || mood === 'sick') {
    mouth = `<path d="M90 108 Q100 99 110 108" stroke="${line}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  } else {
    mouth = `<path d="M100 99 Q94 107 88 102 M100 99 Q106 107 112 102" stroke="${line}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }

  const stripes = c.stripes ? `
    <path d="M100 46 L100 60" stroke="${c.dark}" stroke-width="5" stroke-linecap="round"/>
    <path d="M87 48 L90 60" stroke="${c.dark}" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M113 48 L110 60" stroke="${c.dark}" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M58 92 L68 90 M58 100 L68 97" stroke="${c.dark}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M142 92 L132 90 M142 100 L132 97" stroke="${c.dark}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M80 132 Q86 140 80 150 M120 132 Q114 140 120 150" stroke="${c.dark}" stroke-width="4" fill="none" stroke-linecap="round"/>` : '';

  const cheeks = (mood === 'happy' || mood === 'normal')
    ? `<circle cx="70" cy="100" r="7" fill="#ff8fa3" opacity=".45"/><circle cx="130" cy="100" r="7" fill="#ff8fa3" opacity=".45"/>`
    : mood === 'sick'
      ? `<circle cx="70" cy="100" r="8" fill="#9ccc65" opacity=".55"/><circle cx="130" cy="100" r="8" fill="#9ccc65" opacity=".55"/>`
      : '';

  let acc = '';
  if (accessory && ACCESSORY_POS[accessory] && ITEMS[accessory]) {
    const p = ACCESSORY_POS[accessory];
    acc = `<text x="${p.x}" y="${p.y}" font-size="${p.size}" text-anchor="middle" dominant-baseline="middle">${ITEMS[accessory].icon}</text>`;
  }

  return `
  <svg viewBox="0 0 200 200" class="cat-svg mood-${mood}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="188" rx="58" ry="8" fill="#000" opacity=".12"/>
    <g class="tail">
      <path d="M138 168 Q186 160 178 118 Q174 96 186 84" stroke="${c.main}" stroke-width="15" fill="none" stroke-linecap="round"/>
      <path d="M181 92 Q178 88 186 84" stroke="${c.dark}" stroke-width="15" fill="none" stroke-linecap="round"/>
    </g>
    <ellipse cx="100" cy="150" rx="50" ry="38" fill="${c.main}"/>
    <ellipse cx="100" cy="160" rx="28" ry="24" fill="${c.belly}"/>
    <ellipse cx="76" cy="183" rx="15" ry="9" fill="${c.main}"/>
    <ellipse cx="124" cy="183" rx="15" ry="9" fill="${c.main}"/>
    <path d="M70 184 v-4 M76 185 v-5 M82 184 v-4 M118 184 v-4 M124 185 v-5 M130 184 v-4" stroke="${c.dark}" stroke-width="2" stroke-linecap="round"/>
    <g class="head">
      <path d="M60 70 L66 26 L96 52 Z" fill="${c.main}" stroke="${c.main}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M140 70 L134 26 L104 52 Z" fill="${c.main}" stroke="${c.main}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M68 58 L70 36 L86 51 Z" fill="#ffb3c1"/>
      <path d="M132 58 L130 36 L114 51 Z" fill="#ffb3c1"/>
      <ellipse cx="100" cy="86" rx="47" ry="42" fill="${c.main}"/>
      <ellipse cx="100" cy="102" rx="22" ry="15" fill="${c.belly}"/>
      ${stripes}
      ${cheeks}
      <g class="eyes">${eye(80)}${eye(120)}</g>
      ${brows}
      <path d="M94 94 L106 94 L100 101 Z" fill="#f28ba0" stroke="#d9667f" stroke-width="1.5" stroke-linejoin="round"/>
      ${mouth}
      <g stroke="${colorId === 'zwart' ? '#9a9aa8' : '#7a6a60'}" stroke-width="1.8" stroke-linecap="round" opacity=".8">
        <path d="M74 100 L44 94 M74 104 L44 106 M74 108 L48 116"/>
        <path d="M126 100 L156 94 M126 104 L156 106 M126 108 L152 116"/>
      </g>
      ${acc}
    </g>
  </svg>`;
}
