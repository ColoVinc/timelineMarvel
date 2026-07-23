// ─────────────────────────────────────────────────────────────────────────────
//  Starfield — sfondo cosmico animato su <canvas>
//
//  • Base: nebulose disegnate con gradienti radiali (rosso/viola/blu/verde
//    acqua, i colori delle fasi) su fondo scuro. In alternativa, se esiste il
//    file  public/space-bg.jpg , viene usato come sfondo (le stelle restano
//    sopra).
//  • Stelle: 3 livelli di profondità con twinkle e PARALLASSE legata allo
//    scroll orizzontale della timeline.
//  • Rispetta prefers-reduced-motion (rende un fotogramma statico).
// ─────────────────────────────────────────────────────────────────────────────

import { initShaderStarfield } from './starfield-gl.js';

const rand = (a, b) => a + Math.random() * (b - a);

const LAYERS = [
  { count: 150, speed: 0.015, size: [0.4, 0.9], alpha: [0.2, 0.55] },
  { count: 90, speed: 0.04, size: [0.6, 1.3], alpha: [0.35, 0.75] },
  { count: 45, speed: 0.085, size: [1.0, 2.0], alpha: [0.55, 1.0] },
];

// Prova prima lo shader WebGL (resa migliore, gira su GPU); se non disponibile,
// ripiega sulla versione Canvas 2D qui sotto.
export function initStarfield() {
  if (initShaderStarfield()) return;
  initCanvasStarfield();
}

function initCanvasStarfield() {
  const canvas = document.createElement('canvas');
  canvas.id = 'starfield';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  const bg = document.createElement('canvas'); // sfondo pre-renderizzato
  const bctx = bg.getContext('2d');

  let W = 0, H = 0, dpr = 1;
  let stars = [];

  // Immagine opzionale (public/space-bg.jpg): se c'è, la usiamo come base.
  const bgImg = new Image();
  let bgImgReady = false;
  bgImg.onload = () => { bgImgReady = true; renderBackground(); };
  bgImg.src = '/space-bg.jpg';

  function makeStars() {
    stars = [];
    for (const L of LAYERS) {
      for (let i = 0; i < L.count; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: rand(L.size[0], L.size[1]),
          a: rand(L.alpha[0], L.alpha[1]),
          tw: Math.random() * Math.PI * 2,
          tws: rand(0.5, 1.8),
          speed: L.speed,
        });
      }
    }
  }

  function nebula(c, x, y, r, rgb, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `${rgb}${a})`);
    g.addColorStop(1, `${rgb}0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  function drawCover(c, img) {
    const ir = img.width / img.height;
    const cr = W / H;
    let w = W, h = H, x = 0, y = 0;
    if (ir > cr) { h = H; w = H * ir; x = (W - w) / 2; }
    else { w = W; h = W / ir; y = (H - h) / 2; }
    c.drawImage(img, x, y, w, h);
  }

  function renderBackground() {
    bg.width = W * dpr;
    bg.height = H * dpr;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (bgImgReady) {
      drawCover(bctx, bgImg);
      // velo scuro per far risaltare le card
      bctx.fillStyle = 'rgba(4,5,12,0.35)';
      bctx.fillRect(0, 0, W, H);
      return;
    }

    // Fondo quasi nero: è lo spazio profondo.
    const g = bctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, '#040509');
    g.addColorStop(1, '#000000');
    bctx.fillStyle = g;
    bctx.fillRect(0, 0, W, H);

    // Nebulose lontane: piccole, tenui e ai bordi → il centro resta nero.
    const D = Math.max(W, H);
    bctx.globalCompositeOperation = 'lighter';
    nebula(bctx, W * 0.12, H * 0.08, D * 0.3, 'rgba(48,72,150,', 0.05); // blu profondo
    nebula(bctx, W * 0.92, H * 0.96, D * 0.32, 'rgba(96,54,160,', 0.045); // viola tenue
    nebula(bctx, W * 0.78, H * 0.16, D * 0.24, 'rgba(24,110,130,', 0.04); // verde acqua
    nebula(bctx, W * 0.04, H * 0.92, D * 0.22, 'rgba(170,40,48,', 0.03); // accenno di rosso
    bctx.globalCompositeOperation = 'source-over';
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderBackground();
    makeStars();
  }

  const scrollerX = () => {
    const s = document.getElementById('scroller');
    return s ? s.scrollLeft : 0;
  };

  function paint(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0, W, H);

    const sx = scrollerX();
    const t = time * 0.001;
    ctx.fillStyle = '#e2e8ff';
    for (const s of stars) {
      let x = (s.x - sx * s.speed) % W;
      if (x < 0) x += W;
      const tw = 0.6 + 0.4 * Math.sin(t * s.tws + s.tw);
      ctx.globalAlpha = s.a * tw;
      ctx.beginPath();
      ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('resize', () => {
    resize();
    if (reduced) paint(0);
  });

  resize();

  if (reduced) {
    paint(0); // un solo fotogramma, niente animazione
  } else {
    const loop = (t) => {
      paint(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
