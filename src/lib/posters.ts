// ─────────────────────────────────────────────────────────────────────────────
//  Poster resolver — TMDB
//
//  I poster_path sono già "cotti" nel dataset (src/data/posters.generated.ts) da
//  `npm run posters`. Le immagini image.tmdb.org sono pubbliche: NON serve alcuna
//  API key a runtime. Se un titolo non ha un poster salvato, si mostra la card
//  di fallback stilizzata.
// ─────────────────────────────────────────────────────────────────────────────

import { POSTER_PATHS } from '../data/posters.generated';
import type { McuItem } from '../types';

const IMG_BASE = 'https://image.tmdb.org/t/p/w342';

export function posterUrl(item: McuItem): string | null {
  return POSTER_PATHS[item.id] ? IMG_BASE + POSTER_PATHS[item.id] : null;
}
