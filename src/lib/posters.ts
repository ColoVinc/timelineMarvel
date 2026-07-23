// ─────────────────────────────────────────────────────────────────────────────
//  Poster resolver — TMDB
//
//  Ordine di risoluzione: percorso "cotto" nel dataset → cache locale →
//  ricerca dal vivo su TMDB (richiede la API key nelle impostazioni).
//  Le immagini image.tmdb.org sono pubbliche: la key serve solo per la ricerca.
// ─────────────────────────────────────────────────────────────────────────────

import { POSTER_PATHS } from '../data/posters.generated';
import type { McuItem } from '../types';

const IMG_BASE = 'https://image.tmdb.org/t/p/w342';
const CACHE_KEY = 'mcu_poster_cache_v1';
const KEY_STORE = 'mcu_tmdb_key';

let cache: Record<string, string | null> = {};
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

export function getApiKey(): string {
  return (localStorage.getItem(KEY_STORE) || '').trim();
}

export function setApiKey(key: string): void {
  const k = (key || '').trim();
  if (k) localStorage.setItem(KEY_STORE, k);
  else localStorage.removeItem(KEY_STORE);
}

export function clearPosterCache(): void {
  cache = {};
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

// Restituisce l'URL del poster, oppure null.
export async function resolvePoster(item: McuItem): Promise<string | null> {
  // 1) Percorso "cotto" nel dataset → nessuna API key necessaria.
  if (POSTER_PATHS[item.id]) return IMG_BASE + POSTER_PATHS[item.id];

  // 2) Cache locale da precedenti ricerche.
  if (Object.prototype.hasOwnProperty.call(cache, item.id)) {
    return cache[item.id] ? IMG_BASE + cache[item.id] : null;
  }

  // 3) Ricerca dal vivo su TMDB.
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
    const results: Array<{ poster_path?: string }> = data.results || [];
    const hit = results.find((r) => r.poster_path) || results[0];
    const path = hit?.poster_path || null;
    cache[item.id] = path; // memorizza anche null per non riprovare
    saveCache();
    return path ? IMG_BASE + path : null;
  } catch (err) {
    console.warn('[posters] impossibile risolvere', item.title, (err as Error).message);
    return null;
  }
}
