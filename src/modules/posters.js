// ─────────────────────────────────────────────────────────────────────────────
//  Poster resolver — TMDB
//
//  Data una voce del catalogo, cerca il poster su TMDB per titolo + anno.
//  I risultati vengono messi in cache in localStorage (i poster_path non
//  cambiano), quindi ogni titolo viene risolto una sola volta.
//
//  La API key TMDB è OPZIONALE:
//   • se presente → poster reali
//   • se assente / errore → nessun poster, l'interfaccia mostra la card di
//     fallback stilizzata.
// ─────────────────────────────────────────────────────────────────────────────

import { POSTER_PATHS } from '../data/posters.generated.js';

const IMG_BASE = 'https://image.tmdb.org/t/p/w342';
const CACHE_KEY = 'mcu_poster_cache_v1';
const KEY_STORE = 'mcu_tmdb_key';

let cache = {};
try {
  cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
} catch {
  cache = {};
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota o storage non disponibile: ignora */
  }
}

export function getApiKey() {
  return (localStorage.getItem(KEY_STORE) || '').trim();
}

export function setApiKey(key) {
  const k = (key || '').trim();
  if (k) localStorage.setItem(KEY_STORE, k);
  else localStorage.removeItem(KEY_STORE);
}

export function clearPosterCache() {
  cache = {};
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

// Restituisce l'URL del poster (o null). Usa la cache; interroga TMDB solo
// se c'è una key e il titolo non è già stato risolto.
export async function resolvePoster(item) {
  // 1) Percorso "cotto" nel dataset → nessuna API key necessaria.
  if (POSTER_PATHS[item.id]) return IMG_BASE + POSTER_PATHS[item.id];

  // 2) Cache locale da precedenti ricerche.
  if (Object.prototype.hasOwnProperty.call(cache, item.id)) {
    return cache[item.id] ? IMG_BASE + cache[item.id] : null;
  }

  // 3) Ricerca dal vivo su TMDB (richiede la key inserita nelle impostazioni).
  const key = getApiKey();
  if (!key) return null;

  const endpoint = item.tmdbType === 'tv' ? 'tv' : 'movie';
  const params = new URLSearchParams({
    api_key: key,
    query: item.query || item.title,
    language: 'it-IT',
    include_adult: 'false',
  });
  if (endpoint === 'tv') params.set('first_air_date_year', String(item.year));
  else params.set('year', String(item.year));

  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/${endpoint}?${params}`);
    if (!res.ok) throw new Error('TMDB ' + res.status);
    const data = await res.json();
    const hit = (data.results || []).find((r) => r.poster_path) || (data.results || [])[0];
    const path = hit?.poster_path || null;
    cache[item.id] = path; // memorizza anche null per non riprovare
    saveCache();
    return path ? IMG_BASE + path : null;
  } catch (err) {
    // Non mettiamo in cache gli errori di rete: si potrà riprovare più tardi.
    console.warn('[posters] impossibile risolvere', item.title, err.message);
    return null;
  }
}
