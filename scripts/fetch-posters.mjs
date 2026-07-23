// ─────────────────────────────────────────────────────────────────────────────
//  Recupera i poster_path TMDB per ogni titolo MCU e li "cuoce" in
//  src/data/posters.generated.js  →  i poster si vedranno poi SENZA API key.
//
//  Uso:   TMDB_KEY=la_tua_chiave  npm run posters
//         (oppure passala come primo argomento:  npm run posters -- <chiave>)
//
//  La chiave viene usata SOLO in locale, non viene mai salvata nel file.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// Node 24 esegue i .ts strippando i tipi al volo, quindi possiamo importare
// direttamente il dataset TypeScript.
import { ITEMS } from '../src/data/mcu.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/posters.generated.ts');

const KEY = (process.env.TMDB_KEY || process.argv[2] || '').trim();
if (!KEY) {
  console.error('\n❌  Manca la chiave TMDB.\n   Uso:  TMDB_KEY=la_tua_chiave npm run posters\n');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(endpoint, query, year) {
  const params = new URLSearchParams({
    api_key: KEY,
    query,
    language: 'it-IT',
    include_adult: 'false',
  });
  if (year != null) {
    params.set(endpoint === 'tv' ? 'first_air_date_year' : 'year', String(year));
  }
  const res = await fetch(`https://api.themoviedb.org/3/search/${endpoint}?${params}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  return (data.results || []).find((r) => r.poster_path) || (data.results || [])[0] || null;
}

async function fetchPath(item) {
  const endpoint = item.tmdbType === 'tv' ? 'tv' : 'movie';
  const query = item.query || item.title;
  // 1° tentativo con l'anno; 2° tentativo senza (serie con più stagioni, date TBD).
  let hit = await search(endpoint, query, item.year);
  if (!hit) hit = await search(endpoint, query, null);
  return hit?.poster_path || null;
}

const paths = {};
let ok = 0, miss = 0;

for (const item of ITEMS) {
  try {
    const p = await fetchPath(item);
    if (p) {
      paths[item.id] = p;
      ok++;
      console.log(`  ✓ ${item.title}`);
    } else {
      miss++;
      console.log(`  · ${item.title}  (nessun poster trovato)`);
    }
  } catch (err) {
    miss++;
    console.log(`  ✗ ${item.title}  (${err.message})`);
  }
  await sleep(80); // gentile con il rate limit TMDB
}

const body = `// ─────────────────────────────────────────────────────────────────────────────
//  File GENERATO automaticamente da  \`npm run posters\`  (scripts/fetch-posters.mjs)
//
//  Mappa: id voce MCU → poster_path TMDB (es. "/abc123.jpg").
//  Le immagini su image.tmdb.org sono pubbliche: una volta salvati questi
//  percorsi, i poster si vedono SENZA bisogno di alcuna API key a runtime.
//
//  Per rigenerarlo:  TMDB_KEY=la_tua_chiave npm run posters
// ─────────────────────────────────────────────────────────────────────────────

export const POSTER_PATHS: Record<string, string> = ${JSON.stringify(paths, null, 2)};
`;

writeFileSync(OUT, body);
console.log(`\n✅  Salvati ${ok} poster (${miss} mancanti) in src/data/posters.generated.ts\n`);
