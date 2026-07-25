# MCU Timeline

Timeline interattiva in stile **Marvel Studios** con tutti i film, le serie TV e
le animazioni del Marvel Cinematic Universe. Due modalità di visualizzazione
(ordine di uscita e ordine cronologico interno), filtri per tipo, ricerca,
scroll orizzontale, card con poster e schede di dettaglio.

**Stack:** React + TypeScript + Vite, con Tailwind CSS v4 (e un piccolo strato di
CSS custom per il "cuore" della timeline: spina, card 3D, marker, mini-mappa,
shader dello sfondo).

## Avvio

```bash
npm install
npm run dev      # server di sviluppo (http://localhost:5173)
npm run build    # build di produzione in /dist
npm run preview  # anteprima della build
```

## Poster reali (TMDB)

I poster vengono da [The Movie Database](https://www.themoviedb.org). Le **immagini**
image.tmdb.org sono pubbliche: **a runtime non serve alcuna API key**. I percorsi dei
poster sono già "cotti" nel dataset (`src/data/posters.generated.ts`), quindi ogni
visitatore vede subito i poster.

Per (ri)generarli — utile dopo aver aggiunto nuovi titoli — serve una API key gratuita
TMDB, usata **solo in locale** dallo script, mai salvata nel file:

```bash
TMDB_KEY=la_tua_chiave npm run posters
```

Un titolo senza poster salvato mostra una card stilizzata di fallback.

> Nota TMDB: usando le loro immagini va aggiunta un'attribuzione (es. nel footer):
> "This product uses the TMDB API but is not endorsed or certified by TMDB". (TODO)

## Struttura

```
src/
  main.tsx                 Entry point React
  App.tsx                  Stato, layout, scroll/keyboard, orchestrazione
  types.ts                 Tipi del dominio MCU
  index.css                Tailwind (@theme) + CSS custom del cuore timeline
  data/
    mcu.ts                 Catalogo MCU (100 titoli) con date, tipo, saga, cronologia
    posters.generated.ts   Poster_path TMDB "cotti" (generati dallo script)
  lib/
    posters.ts             Resolver poster TMDB (generato → cache → ricerca)
    starfield.ts           Sfondo cosmico (shader WebGL + fallback Canvas 2D)
    grouping.ts            Costruisce righe timeline e gruppi mini-mappa
    format.ts              Formattazione date
  hooks/
    useAudio.ts            Theme song di sottofondo
  components/
    Starfield · MenuButton · Drawer · Timeline · Card · Markers
    Minimap · Modal
```

## Aggiungere / modificare titoli

Tutto il contenuto è in `src/data/mcu.ts`: basta aggiungere una voce all'array
`ITEMS` (tipizzato `McuItem[]`) seguendo i campi documentati in cima al file. La
saga viene derivata automaticamente dalla fase.

## Note

- L'ordine **cronologico interno** (in-universe) di alcuni titoli post-Endgame è
  una ricostruzione curata, non ufficiale.
- Le date della Fase 6 possono cambiare in base agli annunci ufficiali.
