import { ITEMS } from '../data/mcu';

// Dati strutturati schema.org: un CollectionPage con la lista di tutti i titoli
// (film → Movie, serie/animazioni → TVSeries). Aiuta i motori di ricerca a
// capire che la pagina è un catalogo di prodotti MCU.
const schemaType = (t: string): string =>
  t === 'film' ? 'Movie' : t === 'series' || t === 'animation' ? 'TVSeries' : 'CreativeWork';

const DATA = {
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
      },
    })),
  },
};

export function StructuredData() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(DATA) }} />;
}
