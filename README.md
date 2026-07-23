# MCU Timeline

Timeline interattiva in stile **Marvel Studios** con tutti i film, le serie TV e
le animazioni del Marvel Cinematic Universe. Due modalità di visualizzazione
(ordine di uscita e ordine cronologico interno), filtri per tipo, ricerca,
scroll orizzontale, card con poster e schede di dettaglio.

## Avvio

```bash
npm install
npm run dev      # server di sviluppo (http://localhost:5173)
npm run build    # build di produzione in /dist
npm run preview  # anteprima della build
```

## Poster reali (TMDB)

I poster ufficiali vengono da [The Movie Database](https://www.themoviedb.org).
Le **immagini** TMDB sono pubbliche: serve una API key gratuita solo per *cercare*
il percorso del poster, non per mostrarlo. Due modi:

### A) "Cuocere" i poster nel progetto (consigliato — poi niente key per nessuno)

```bash
TMDB_KEY=la_tua_chiave npm run posters
```

Lo script cerca ogni titolo e salva i percorsi in `src/data/posters.generated.js`.
Da quel momento i poster si vedono **senza alcuna key a runtime**. La chiave è usata
solo in locale e non viene mai salvata nel file.

### B) Inserire la key nell'app (al volo, per titolo)

Clicca l'ingranaggio ⚙ in alto a destra e incolla la chiave (v3 auth). Viene salvata
solo nel tuo browser (localStorage). Utile per riempire eventuali poster mancanti dopo
la generazione del punto A.

Ordine di risoluzione poster: **percorso generato → cache locale → ricerca dal vivo**.
Senza nulla di tutto ciò, l'app mostra card stilizzate.

## Struttura

```
src/
  data/mcu.js          Catalogo MCU (Fasi 1–6) con date, tipo, saga, cronologia
  modules/posters.js   Resolver poster TMDB con cache e fallback
  main.js              Rendering timeline, interazioni, modale
  style.css            Stile Marvel Studios
```

## Aggiungere / modificare titoli

Tutto il contenuto è in `src/data/mcu.js`: basta aggiungere una voce all'array
`ITEMS` seguendo i campi documentati in cima al file.

## Note

- L'ordine **cronologico interno** (in-universe) di alcuni titoli post-Endgame è
  una ricostruzione curata, non ufficiale.
- Le date della Fase 6 possono cambiare in base agli annunci ufficiali.
