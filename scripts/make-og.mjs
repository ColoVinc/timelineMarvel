// Genera public/og-image.png (1200×630) — l'anteprima social del sito.
// Disegna in SVG (stile del sito: spazio, spina della timeline con le sei
// gemme, titolo) e rasterizza con resvg.
//
//  Uso:  npm run og
//
// Le sei gemme e i loro colori sono allineati a src/data/stones.ts.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/og-image.png');

const W = 1200;
const H = 630;

const STONES = ['#2f6bff', '#ffcf1f', '#ff2436', '#a12bff', '#14c94a', '#ff6a1a'];

// Stelle deterministiche
let seed = 7;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
let stars = '';
for (let i = 0; i < 90; i++) {
  const x = (rand() * W).toFixed(1);
  const y = (rand() * H).toFixed(1);
  const r = (0.4 + rand() * 1.6).toFixed(2);
  const o = (0.2 + rand() * 0.6).toFixed(2);
  stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#dfe6ff" opacity="${o}"/>`;
}

// Spina + gemme
const SX0 = 200;
const SX1 = 1000;
const SY = 232;
let spineDefs = '';
let stonesSvg = '';
STONES.forEach((c, i) => {
  const x = SX0 + ((SX1 - SX0) / 5) * i;
  spineDefs += `
    <radialGradient id="glow${i}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${c}" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="${c}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
    </radialGradient>`;
  const s = 15; // semi-dimensione della gemma
  stonesSvg += `
    <circle cx="${x}" cy="${SY}" r="52" fill="url(#glow${i})"/>
    <polygon points="${x},${SY - s * 1.4} ${x + s},${SY} ${x},${SY + s * 1.4} ${x - s},${SY}"
      fill="${c}" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.5"/>
    <polygon points="${x},${SY - s * 1.4} ${x + s},${SY} ${x},${SY} ${x - s},${SY}"
      fill="#ffffff" fill-opacity="0.35"/>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#0a0c14"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <radialGradient id="neb1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3048aa" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#3048aa" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="neb2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7b2ff7" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#7b2ff7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="spine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="12%" stop-color="#ffffff" stop-opacity="0.4"/>
      <stop offset="88%" stop-color="#ffffff" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    ${spineDefs}
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="120" cy="90" rx="520" ry="420" fill="url(#neb1)"/>
  <ellipse cx="1120" cy="560" rx="560" ry="440" fill="url(#neb2)"/>
  ${stars}

  <line x1="${SX0}" y1="${SY}" x2="${SX1}" y2="${SY}" stroke="url(#spine)" stroke-width="2"/>
  ${stonesSvg}

  <rect x="${W / 2 - 70}" y="352" width="140" height="6" rx="3" fill="#e62429"/>
  <text x="${W / 2}" y="446" text-anchor="middle" font-family="DejaVu Sans" font-weight="700"
    font-size="92" letter-spacing="6" fill="#ffffff">MCU TIMELINE</text>
  <text x="${W / 2}" y="502" text-anchor="middle" font-family="DejaVu Sans" font-weight="400"
    font-size="31" fill="#c3c3d2">Tutti i film e le serie Marvel in ordine di uscita o cronologico</text>
  <text x="${W / 2}" y="556" text-anchor="middle" font-family="DejaVu Sans" font-weight="700"
    font-size="22" letter-spacing="2" fill="#8f8fa2">100 TITOLI · FILM · SERIE TV · ANIMAZIONI</text>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' },
  background: '#000000',
});
writeFileSync(OUT, resvg.render().asPng());
console.log('✅  Creato public/og-image.png (' + W + '×' + H + ')');
