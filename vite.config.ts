import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { ITEMS, PHASES, SAGAS, TYPES } from './src/data/mcu';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const yearOf = (iso: string) => iso.slice(0, 4);

// JSON-LD schema.org: CollectionPage + ItemList di tutti i titoli.
function buildJsonLd(): string {
  const schemaType = (t: string) =>
    t === 'film' ? 'Movie' : t === 'series' || t === 'animation' ? 'TVSeries' : 'CreativeWork';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Timeline MCU',
    inLanguage: 'it',
    description:
      'Timeline interattiva del Marvel Cinematic Universe: tutti i film, le serie TV e le animazioni in ordine di uscita o cronologico.',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: ITEMS.length,
      itemListElement: ITEMS.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': schemaType(it.type),
          name: it.title,
          datePublished: it.release,
          ...(it.overview ? { description: it.overview } : {}),
        },
      })),
    },
  };
  // Escape "<" per sicurezza dentro <script>.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// Contenuto testuale statico (crawlabile senza JS), sostituito da React al mount.
function buildSeoHtml(): string {
  const sections = [1, 2, 3, 4, 5, 6]
    .map((n) => {
      const items = ITEMS.filter((it) => it.phase === n).sort((a, b) =>
        a.release.localeCompare(b.release),
      );
      if (!items.length) return '';
      const lis = items
        .map((it) => {
          const desc = it.overview ? ` <span style="color:#a9a9b8">${esc(it.overview)}</span>` : '';
          return `<li style="margin-bottom:6px"><strong>${esc(it.title)}</strong> (${yearOf(
            it.release,
          )}) — ${TYPES[it.type].label}.${desc}</li>`;
        })
        .join('');
      return `<section style="margin-bottom:22px"><h2 style="font-size:19px;color:#fff;margin:0 0 10px">Fase ${n} · ${SAGAS[PHASES[n].saga].name}</h2><ul style="margin:0;padding-left:20px">${lis}</ul></section>`;
    })
    .join('');

  return `<div id="prerender" style="min-height:100vh;background:#07070b;color:#e8e8ee;font-family:system-ui,-apple-system,Arial,sans-serif;line-height:1.5;padding:40px 20px;max-width:920px;margin:0 auto"><h1 style="font-size:30px;margin:0 0 8px">Timeline del Marvel Cinematic Universe (MCU)</h1><p style="color:#b9b9c6;margin:0 0 24px">Tutti i ${ITEMS.length} film, serie TV e produzioni animate del Marvel Cinematic Universe, consultabili in <strong>ordine di uscita</strong> o in <strong>ordine cronologico</strong> interno. Fasi 1–6, dalla Saga dell'Infinito alla Saga del Multiverso.</p>${sections}</div>`;
}

// Inietta contenuto statico e JSON-LD nell'HTML (SEO + crawler AI senza JS).
function prerenderSeo(): Plugin {
  return {
    name: 'prerender-seo',
    transformIndexHtml(html) {
      return html
        .replace(
          '</head>',
          `  <style>body{margin:0;background:#07070b}</style>\n    <script type="application/ld+json">${buildJsonLd()}</script>\n  </head>`,
        )
        .replace('<div id="root"></div>', `<div id="root">${buildSeoHtml()}</div>`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), prerenderSeo()],
  build: {
    // Three.js è caricato in un chunk separato (lazy): alziamo la soglia di
    // avviso perché quel chunk è volutamente grande e non blocca il primo paint.
    chunkSizeWarningLimit: 1200,
  },
});
