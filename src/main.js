import './style.css';
import { ITEMS, PHASES, TYPES, SAGAS } from './data/mcu.js';
import { resolvePoster, getApiKey, setApiKey, clearPosterCache } from './modules/posters.js';
import { initStarfield } from './modules/starfield.js';

// ── Stato applicazione ───────────────────────────────────────────────────────
const state = {
  view: 'release', // 'release' | 'chrono'
  types: new Set(Object.keys(TYPES)), // tipi attivi
  query: '',
  selectedId: null,
  menuOpen: false,
};

const app = document.querySelector('#app');

// Chi ha ridotto le animazioni di sistema non riceve tilt né fluttuazione.
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Utility ──────────────────────────────────────────────────────────────────
const yearOf = (d) => d.slice(0, 4);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

function itemMatchesFilters(it) {
  if (!state.types.has(it.type)) return false;
  if (state.query) {
    const q = state.query.toLowerCase();
    if (!it.title.toLowerCase().includes(q) && !(it.overview || '').toLowerCase().includes(q))
      return false;
  }
  return true;
}

function visibleItems() {
  const list = ITEMS.filter(itemMatchesFilters);
  if (state.view === 'release') {
    list.sort((a, b) => a.release.localeCompare(b.release));
  } else {
    list.sort((a, b) => a.chrono - b.chrono || a.release.localeCompare(b.release));
  }
  return list;
}

// ── Rendering: shell ─────────────────────────────────────────────────────────
function render() {
  app.innerHTML = '';
  app.append(buildMenu(), buildStage(), buildModal());
  paintTimeline();
  updateFilterUI();
}

// Cambio vista: NON facciamo un render() completo (chiuderebbe il menù), basta
// ridipingere la timeline e aggiornare lo stato dei pulsanti.
function setView(id) {
  if (state.view === id) return;
  state.view = id;
  paintTimeline();
  updateFilterUI();
}

function setMenuOpen(open) {
  state.menuOpen = open;
  document.getElementById('drawer')?.classList.toggle('is-open', open);
  document.getElementById('menu-backdrop')?.classList.toggle('is-open', open);
  document.getElementById('menu-btn')?.classList.toggle('is-open', open);
}

// Pulsante hamburger + pannello laterale a comparsa con tutti i controlli.
function buildMenu() {
  const frag = document.createDocumentFragment();

  const btn = el('button', 'menu-btn', '<span></span><span></span><span></span>');
  btn.id = 'menu-btn';
  btn.setAttribute('aria-label', 'Apri il menù');
  btn.onclick = () => setMenuOpen(!state.menuOpen);

  const backdrop = el('div', 'menu-backdrop');
  backdrop.id = 'menu-backdrop';
  backdrop.onclick = () => setMenuOpen(false);

  const drawer = el('aside', 'drawer');
  drawer.id = 'drawer';

  // Intestazione con logo
  const head = el('div', 'drawer__head');
  head.innerHTML = `
    <img class="brand__logo" src="/marvel-logo.svg" alt="MARVEL" />
    <span class="brand__sub">STUDIOS · TIMELINE</span>`;
  const logo = head.querySelector('.brand__logo');
  logo.onerror = () => logo.replaceWith(el('span', 'brand__mark', 'MARVEL'));
  const closeBtn = el('button', 'drawer__close', '✕');
  closeBtn.setAttribute('aria-label', 'Chiudi il menù');
  closeBtn.onclick = () => setMenuOpen(false);
  head.append(closeBtn);

  // Vista
  const views = el('div', 'seg');
  views.setAttribute('role', 'tablist');
  for (const [id, label] of [['release', 'Ordine di uscita'], ['chrono', 'Cronologico']]) {
    const b = el('button', 'seg__btn' + (state.view === id ? ' is-active' : ''), label);
    b.dataset.view = id;
    b.onclick = () => setView(id);
    views.append(b);
  }

  // Filtri tipo
  const filters = el('div', 'filters');
  for (const t of Object.values(TYPES)) {
    const chip = el('button', 'chip', `<span class="chip__icon">${t.icon}</span>${t.label}`);
    chip.dataset.type = t.id;
    chip.onclick = () => {
      if (state.types.has(t.id)) state.types.delete(t.id);
      else state.types.add(t.id);
      if (state.types.size === 0) state.types.add(t.id); // almeno uno attivo
      paintTimeline();
      updateFilterUI();
    };
    filters.append(chip);
  }

  // Ricerca
  const search = el('div', 'search');
  const input = el('input', 'search__input');
  input.type = 'search';
  input.placeholder = 'Cerca un titolo…';
  input.value = state.query;
  input.oninput = () => {
    state.query = input.value.trim();
    paintTimeline();
  };
  search.append(input);

  // Audio (theme song) + volume
  const audioGroup = el('div', 'audio-group');
  const audioBtn = el('button', 'iconbtn', '🎵');
  audioBtn.id = 'audio-btn';
  audioBtn.onclick = toggleAudio;
  const vol = el('input', 'vol');
  vol.id = 'audio-vol';
  vol.type = 'range';
  vol.min = '0';
  vol.max = '100';
  vol.value = String(Math.round(audio.volume * 100));
  vol.title = 'Volume';
  vol.oninput = () => {
    audio.volume = vol.value / 100;
    localStorage.setItem(VOLUME_STORE, vol.value);
  };
  audioGroup.append(audioBtn, vol);

  // Impostazioni (API key TMDB)
  const gear = el('button', 'iconbtn', '⚙');
  gear.title = 'Impostazioni poster (TMDB)';
  gear.onclick = openSettings;
  const gearRow = el('div', 'drawer__row');
  gearRow.append(gear, el('span', 'drawer__row-label', 'Poster (TMDB)'));

  drawer.append(
    head,
    field('Visualizzazione', views),
    field('Tipo di contenuto', filters),
    field('Ricerca', search),
    field('Audio', audioGroup),
    field('Impostazioni', gearRow)
  );

  frag.append(btn, backdrop, drawer);
  return frag;
}

// Sezione del drawer: etichetta + contenuto
function field(label, content) {
  const f = el('div', 'field');
  f.append(el('div', 'field__label', label), content);
  return f;
}

function buildStage() {
  const stage = el('section', 'stage');
  const scroller = el('div', 'scroller');
  scroller.id = 'scroller';
  const track = el('div', 'track');
  track.id = 'track';
  scroller.append(track);

  // Mini-mappa / navigazione
  const minimap = el('div', 'minimap');
  minimap.id = 'minimap';
  minimap.innerHTML = '<div class="minimap__handle" id="minimap-handle"></div>';

  // Nota cronologica
  const note = el('div', 'chrono-note');
  note.id = 'chrono-note';
  note.innerHTML =
    '<span>ⓘ</span> Ordinamento interno alla storia — ricostruzione curata, non ufficiale.';

  stage.append(scroller, minimap, note);
  enableDragScroll(scroller);
  enableWheelScroll(scroller);
  scroller.addEventListener('scroll', updateMinimap, { passive: true });
  return stage;
}

// ── Rendering: timeline ──────────────────────────────────────────────────────
function paintTimeline() {
  const track = document.getElementById('track');
  if (!track) return;
  track.innerHTML = '';
  track.dataset.view = state.view;

  const items = visibleItems();
  document.getElementById('chrono-note').style.display =
    state.view === 'chrono' ? 'flex' : 'none';

  fitSizes(); // dimensiona i poster in base all'altezza reale disponibile

  if (items.length === 0) {
    track.append(el('div', 'empty', 'Nessun titolo corrisponde ai filtri.'));
    return;
  }

  const spine = el('div', 'spine');
  track.append(spine);

  const groups = []; // per la mini-mappa
  let idx = 0;
  if (state.view === 'release') {
    let lastPhase = null;
    let lastSaga = null;
    for (const it of items) {
      if (it.saga !== lastSaga) {
        track.append(buildSagaMarker(SAGAS[it.saga]));
        lastSaga = it.saga;
        lastPhase = null;
      }
      if (it.phase !== lastPhase) {
        track.append(buildPhaseMarker(PHASES[it.phase]));
        lastPhase = it.phase;
        groups.push({ label: 'F' + it.phase, full: PHASES[it.phase].name, color: PHASES[it.phase].color, count: 0, firstId: it.id });
      }
      groups[groups.length - 1].count++;
      track.append(buildItem(it, idx++));
    }
  } else {
    let lastEra = null;
    for (const it of items) {
      if (it.era !== lastEra) {
        track.append(buildEraMarker(it.era));
        lastEra = it.era;
        groups.push({ label: it.era, full: it.era, color: PHASES[it.phase].color, count: 0, firstId: it.id });
      }
      groups[groups.length - 1].count++;
      track.append(buildItem(it, idx++));
    }
  }

  buildMinimap(groups);

  // Carica i poster in modo asincrono
  loadPosters(items);
}

function buildSagaMarker(saga) {
  const m = el('div', 'saga-marker');
  m.innerHTML = `<div class="saga-marker__inner"><span class="saga-marker__label">${saga.name}</span></div>`;
  return m;
}

function buildPhaseMarker(phase) {
  const m = el('div', 'phase-marker');
  m.style.setProperty('--phase', phase.color);
  m.innerHTML = `
    <div class="phase-marker__num">0${phase.n}</div>
    <div class="phase-marker__name">${phase.name.toUpperCase()}</div>
    <div class="phase-marker__line"></div>`;
  return m;
}

function buildEraMarker(era) {
  const m = el('div', 'era-marker');
  m.innerHTML = `<div class="era-marker__dot"></div><div class="era-marker__label">${era}</div>`;
  return m;
}

function buildItem(it, idx) {
  const above = idx % 2 === 0;
  const wrap = el('article', 'item ' + (above ? 'item--up' : 'item--down'));
  wrap.dataset.id = it.id;
  wrap.dataset.phase = it.phase;
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'button');
  wrap.setAttribute('aria-label', `${it.title} (${yearOf(it.release)})`);
  wrap.style.setProperty('--phase', PHASES[it.phase].color);

  const card = el('div', 'card');
  const poster = el('div', 'card__poster');
  poster.innerHTML = `
    <div class="card__fallback">
      <span class="card__fallback-type">${TYPES[it.type].label}</span>
      <span class="card__fallback-title">${it.title}</span>
    </div>`;
  const meta = el('div', 'card__meta');
  // In cronologico nascondiamo la data di uscita: sarebbe fuorviante rispetto
  // all'epoca in cui il film/serie è ambientato.
  const dateLine =
    state.view === 'release' ? `<span class="card__date">${formatDate(it.release)}</span>` : '';
  meta.innerHTML = `
    <span class="card__type">${TYPES[it.type].icon} ${TYPES[it.type].label}</span>
    <h3 class="card__title">${it.title}</h3>
    ${dateLine}`;
  card.append(poster, meta);

  // Contenitore esterno: gestisce la fluttuazione e fornisce la prospettiva 3D.
  // La card interna gestisce l'inclinazione: due transform su due elementi
  // distinti, altrimenti si sovrascriverebbero a vicenda.
  const cardWrap = el('div', 'card-wrap');
  cardWrap.append(card);

  const node = el('div', 'item__node');

  if (above) wrap.append(cardWrap, node);
  else wrap.append(node, cardWrap);

  // Inclinazione 3D che segue il puntatore
  if (!REDUCED_MOTION) {
    cardWrap.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5; // -0.5 … 0.5
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--tilt-y', (px * 16).toFixed(2) + 'deg');
      card.style.setProperty('--tilt-x', (-py * 16).toFixed(2) + 'deg');
    });
    cardWrap.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  }

  // Click sulla card, non su .item: quest'ultimo copre tutta l'altezza della
  // timeline e aprirebbe la scheda anche cliccando nella metà vuota.
  cardWrap.onclick = () => openModal(it.id);
  // Il focus da tastiera resta su .item, che è l'elemento focalizzabile.
  wrap.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(it.id);
    }
  };
  return wrap;
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${d} ${months[+m - 1]} ${y}`;
}

async function loadPosters(items) {
  for (const it of items) {
    const url = await resolvePoster(it);
    if (!url) continue;
    const posterEl = document.querySelector(`.item[data-id="${it.id}"] .card__poster`);
    if (!posterEl) continue;
    const img = new Image();
    img.alt = it.title;
    img.className = 'card__img';
    img.onload = () => {
      posterEl.classList.add('has-img');
      posterEl.prepend(img);
    };
    img.src = url;
  }
}

// ── Modale dettaglio ─────────────────────────────────────────────────────────
function buildModal() {
  const overlay = el('div', 'modal');
  overlay.id = 'modal';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="modal__backdrop"></div>
    <div class="modal__panel" role="dialog" aria-modal="true">
      <button class="modal__close" aria-label="Chiudi">✕</button>
      <div class="modal__body"></div>
    </div>`;
  overlay.querySelector('.modal__backdrop').onclick = closeModal;
  overlay.querySelector('.modal__close').onclick = closeModal;
  return overlay;
}

async function openModal(id) {
  const it = ITEMS.find((x) => x.id === id);
  if (!it) return;
  state.selectedId = id;
  const modal = document.getElementById('modal');
  const body = modal.querySelector('.modal__body');
  const phase = PHASES[it.phase];
  const posterUrl = await resolvePoster(it);

  body.style.setProperty('--phase', phase.color);
  body.innerHTML = `
    <div class="modal__poster ${posterUrl ? '' : 'is-fallback'}">
      ${posterUrl ? `<img src="${posterUrl}" alt="${it.title}">` : `<span>${it.title}</span>`}
    </div>
    <div class="modal__info">
      <div class="modal__tags">
        <span class="tag tag--phase">${phase.name}</span>
        <span class="tag">${SAGAS[it.saga].name}</span>
        <span class="tag">${TYPES[it.type].icon} ${TYPES[it.type].label}</span>
      </div>
      <h2 class="modal__title">${it.title}</h2>
      <div class="modal__dates">
        <div><span>Uscita</span><strong>${formatDate(it.release)}</strong></div>
        <div><span>Epoca nella storia</span><strong>${it.era}</strong></div>
      </div>
      <p class="modal__overview">${it.overview || '—'}</p>
    </div>`;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('is-open'));
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('is-open');
  setTimeout(() => (modal.hidden = true), 220);
  state.selectedId = null;
}

// ── Impostazioni (API key TMDB) ──────────────────────────────────────────────
function openSettings() {
  const modal = document.getElementById('modal');
  const body = modal.querySelector('.modal__body');
  body.style.removeProperty('--phase');
  const current = getApiKey();
  body.innerHTML = `
    <div class="settings">
      <h2>Poster reali da TMDB</h2>
      <p>Per mostrare i poster ufficiali serve una API key gratuita di
      <strong>The Movie Database</strong>. Registrati su themoviedb.org →
      Impostazioni → API, e incolla qui la chiave (v3 auth).</p>
      <label class="settings__label">API key TMDB</label>
      <input id="tmdb-key" class="settings__input" type="text"
        placeholder="es. 1a2b3c4d…" value="${current.replace(/"/g, '')}">
      <div class="settings__actions">
        <button id="tmdb-save" class="btn btn--primary">Salva e ricarica poster</button>
        <button id="tmdb-clear" class="btn">Rimuovi</button>
      </div>
      <p class="settings__hint">Senza chiave l'app funziona comunque con card stilizzate.</p>
    </div>`;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('is-open'));

  body.querySelector('#tmdb-save').onclick = () => {
    setApiKey(body.querySelector('#tmdb-key').value);
    clearPosterCache();
    closeModal();
    paintTimeline();
  };
  body.querySelector('#tmdb-clear').onclick = () => {
    setApiKey('');
    clearPosterCache();
    body.querySelector('#tmdb-key').value = '';
    closeModal();
    paintTimeline();
  };
}

// ── UI filtri (stato attivo) ─────────────────────────────────────────────────
function updateFilterUI() {
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.classList.toggle('is-active', state.types.has(chip.dataset.type));
  });
  document.querySelectorAll('.seg__btn').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.view === state.view);
  });
}

// ── Adatta la dimensione dei poster all'altezza reale ────────────────────────
// Ogni item occupa metà track sopra la spina e metà sotto: la card (poster +
// testo) più il connettore deve stare dentro quella metà, altrimenti sborda e
// viene tagliata. Calcoliamo il poster dallo spazio effettivamente disponibile.
function fitSizes() {
  const scroller = document.getElementById('scroller');
  if (!scroller) return;
  const h = scroller.clientHeight;
  if (!h) return;

  const META = 80;      // altezza indicativa della fascia testo della card
  const NODE_HALF = 8;  // metà del nodo sulla spina
  const SAFE = 22;      // margine: copre anche il sollevamento in hover/fluttuazione
  const gap = Math.round(Math.min(30, Math.max(12, h * 0.028)));

  let poster = Math.floor(h / 2 - NODE_HALF - gap - META - SAFE);
  poster = Math.max(120, Math.min(240, poster));

  const root = document.documentElement.style;
  root.setProperty('--poster-h', poster + 'px');
  root.setProperty('--gap', gap + 'px');
}

// ── Mini-mappa / navigazione per fasi ────────────────────────────────────────
function buildMinimap(groups) {
  const minimap = document.getElementById('minimap');
  if (!minimap) return;
  const handle = document.getElementById('minimap-handle');
  minimap.innerHTML = '';
  minimap.append(handle);
  // In cronologico le epoche sono tante e strette: le teniamo chiuse e apriamo
  // solo quella attiva (vedi CSS .minimap.is-chrono).
  minimap.classList.toggle('is-chrono', state.view === 'chrono');

  for (const g of groups) {
    const seg = el('button', 'minimap__seg');
    // In release la larghezza è proporzionale ai titoli; in cronologico la
    // gestisce il CSS (segmenti chiusi + attivo espanso), quindi niente inline.
    if (state.view !== 'chrono') seg.style.flexGrow = g.count;
    seg.style.setProperty('--phase', g.color);
    seg.dataset.target = g.firstId;
    seg.title = `${g.full} — ${g.count} titoli`;
    seg.innerHTML = `<span class="minimap__seg-label">${g.label}</span>`;
    seg.onclick = () => scrollToItem(g.firstId);
    minimap.append(seg);
  }
  requestAnimationFrame(updateMinimap);
}

function scrollToItem(id) {
  const scroller = document.getElementById('scroller');
  const target = document.querySelector(`.item[data-id="${id}"]`);
  if (!scroller || !target) return;
  scroller.scrollTo({ left: Math.max(0, target.offsetLeft - 90), behavior: 'smooth' });
}

function updateMinimap() {
  const scroller = document.getElementById('scroller');
  const handle = document.getElementById('minimap-handle');
  const minimap = document.getElementById('minimap');
  if (!scroller || !handle || !minimap) return;

  const max = scroller.scrollWidth - scroller.clientWidth;
  const frac = max > 0 ? scroller.scrollLeft / max : 0;
  const visible = scroller.clientWidth / scroller.scrollWidth;
  const w = minimap.clientWidth - 44; // meno il padding orizzontale (22px * 2)
  const hw = Math.max(28, Math.min(w, visible * w));
  handle.style.width = hw + 'px';
  handle.style.transform = `translateX(${frac * (w - hw)}px)`;

  // Segmento attivo = ultima epoca il cui inizio ha superato una linea di messa
  // a fuoco vicina al bordo sinistro. Avanza una epoca alla volta e parte dalla
  // prima (1943). L'offset è piccolo: con un offset grande le prime epoche,
  // strettissime, venivano saltate all'avvio.
  const segs = [...document.querySelectorAll('.minimap__seg')];
  const starts = segs.map((seg) => {
    const t = document.querySelector(`.item[data-id="${seg.dataset.target}"]`);
    return (t ? t.offsetLeft : 0) - 80; // ~inizio del marker dell'epoca
  });
  const focus = scroller.scrollLeft + 120;
  let activeIdx = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] <= focus) activeIdx = i;
    else break;
  }
  const activeId = segs[activeIdx]?.dataset.target;
  segs.forEach((seg) => seg.classList.toggle('is-active', seg.dataset.target === activeId));
}

// ── Scroll orizzontale ───────────────────────────────────────────────────────
function enableWheelScroll(scroller) {
  scroller.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scroller.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

function enableDragScroll(scroller) {
  let down = false, startX = 0, startLeft = 0, moved = false;
  scroller.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.chip, .seg__btn, input, button')) return;
    down = true;
    moved = false;
    startX = e.clientX;
    startLeft = scroller.scrollLeft;
    scroller.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    scroller.scrollLeft = startLeft - dx;
  });
  window.addEventListener('pointerup', () => {
    down = false;
    scroller.classList.remove('is-dragging');
  });
  // Evita che il drag faccia scattare il click sulla card
  scroller.addEventListener(
    'click',
    (e) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true
  );
}

// ── Tastiera globale ─────────────────────────────────────────────────────────
let resizeRaf = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    fitSizes();
    updateMinimap();
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    setMenuOpen(false);
  }
  const scroller = document.getElementById('scroller');
  if (!scroller) return;
  if (document.activeElement?.tagName === 'INPUT') return;
  if (e.key === 'ArrowRight') scroller.scrollLeft += 320;
  if (e.key === 'ArrowLeft') scroller.scrollLeft -= 320;
});

// ── Audio di sottofondo (theme song) ─────────────────────────────────────────
// Il file NON è incluso (copyright). Metti il tuo MP3 in  public/theme.mp3 .
const AUDIO_STORE = 'mcu_audio';
const VOLUME_STORE = 'mcu_volume';
const audio = new Audio('/theme.mp3');
audio.loop = true;
const savedVol = parseInt(localStorage.getItem(VOLUME_STORE) ?? '35', 10);
audio.volume = (Number.isNaN(savedVol) ? 35 : Math.min(100, Math.max(0, savedVol))) / 100;
audio.preload = 'auto';
let audioReady = true;

audio.addEventListener('error', () => {
  audioReady = false;
  updateAudioBtn();
});
audio.addEventListener('play', updateAudioBtn);
audio.addEventListener('pause', updateAudioBtn);

function updateAudioBtn() {
  const btn = document.getElementById('audio-btn');
  const vol = document.getElementById('audio-vol');
  if (!btn) return;
  if (!audioReady) {
    btn.textContent = '🎵';
    btn.classList.add('is-off');
    btn.title = 'Aggiungi public/theme.mp3 per la musica di sottofondo';
    if (vol) vol.disabled = true;
    return;
  }
  btn.classList.remove('is-off');
  if (vol) vol.disabled = false;
  const playing = !audio.paused;
  btn.textContent = playing ? '🔊' : '🔈';
  btn.title = playing ? 'Silenzia la musica' : 'Riproduci la musica';
}

function toggleAudio() {
  if (!audioReady) {
    openAudioInfo();
    return;
  }
  if (audio.paused) {
    audio.play().then(
      () => localStorage.setItem(AUDIO_STORE, 'on'),
      () => {} // autoplay/altro bloccato: ignora
    );
  } else {
    audio.pause();
    localStorage.setItem(AUDIO_STORE, 'off');
  }
}

function openAudioInfo() {
  const modal = document.getElementById('modal');
  const body = modal.querySelector('.modal__body');
  body.style.removeProperty('--phase');
  body.innerHTML = `
    <div class="settings">
      <h2>Musica di sottofondo</h2>
      <p>La theme degli Avengers è protetta da copyright, quindi il file non è
      incluso nel progetto. Per abilitarla, aggiungi un tuo file audio:</p>
      <p><strong>1.</strong> Prendi il tuo brano e rinominalo <code>theme.mp3</code>.<br>
      <strong>2.</strong> Mettilo nella cartella <code>public/</code> del progetto.<br>
      <strong>3.</strong> Ricarica la pagina: il pulsante 🔊 attiverà/silenzierà la musica.</p>
      <p class="settings__hint">Puoi usare qualsiasi file MP3. Il volume parte basso
      (di sottofondo) e la traccia va in loop.</p>
    </div>`;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('is-open'));
}

// La musica è ATTIVA per impostazione predefinita: parte da sola all'apertura.
// Resta spenta solo se l'utente l'ha silenziata esplicitamente.
// Nota: i browser bloccano l'autoplay audio finché non c'è un'interazione, per
// questo, se il tentativo immediato fallisce, riproviamo al primo gesto.
if ((localStorage.getItem(AUDIO_STORE) ?? 'on') === 'on') {
  const GESTURES = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  const stopWaiting = () =>
    GESTURES.forEach((e) => window.removeEventListener(e, tryPlay));
  function tryPlay() {
    audio.play().then(stopWaiting, () => {}); // se bloccato, restiamo in ascolto
  }
  tryPlay(); // tentativo immediato al caricamento
  GESTURES.forEach((e) => window.addEventListener(e, tryPlay, { passive: true }));
}

initStarfield();
render();
updateAudioBtn();
