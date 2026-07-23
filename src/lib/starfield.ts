// ─────────────────────────────────────────────────────────────────────────────
//  Starfield — sfondo cosmico animato.
//
//  Prova prima lo shader WebGL (GPU); se non disponibile, ripiega sul Canvas 2D.
//  Entrambe le versioni disegnano sul <canvas> passato e restituiscono una
//  funzione di pulizia (per React: cancella rAF e listener allo smontaggio).
//
//  PARALLASSE: le stelle scorrono in base allo scroll orizzontale della
//  timeline (elemento con id "scroller"), i livelli lontani più lentamente.
// ─────────────────────────────────────────────────────────────────────────────

type Cleanup = () => void;

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollX = (): number => {
  const s = document.getElementById('scroller');
  return s ? s.scrollLeft : 0;
};

export function initStarfield(canvas: HTMLCanvasElement): Cleanup {
  return initShader(canvas) ?? initCanvas2D(canvas);
}

// ── WebGL ────────────────────────────────────────────────────────────────────
const VERT = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2  u_resolution;
uniform float u_scroll;
uniform vec2  u_mouse;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int k = 0; k < 3; k++) { v += amp * vnoise(p); p *= 2.0; amp *= 0.5; }
  return v;
}
void main() {
  float m = min(u_resolution.x, u_resolution.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / m;
  uv += (u_mouse / u_resolution - 0.5) * 0.06;
  float scrollUV = u_scroll / m;

  vec3 color = vec3(0.005, 0.006, 0.012);

  for (float i = 0.0; i < 3.0; i += 1.0) {
    float size  = mix(420.0, 150.0, i / 2.0);
    float speed = 0.035 + 0.05 * i;
    float thr   = 0.982 + 0.006 * i;
    vec2 p    = uv - vec2(scrollUV * speed, 0.0);
    vec2 grid = p * size + i * 17.0 + u_time * 0.02 * (i + 1.0);
    vec2 ip   = floor(grid);
    vec2 fp   = fract(grid);
    float h = hash(ip);
    if (h > thr) {
      float blink = 0.55 + 0.45 * sin(u_time * 1.6 + h * 100.0);
      float d     = length(fp - 0.5);
      float star  = (1.0 - smoothstep(0.0, 0.42, d)) * blink;
      color += star * mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.80), h);
    }
  }

  vec2 np = uv - vec2(scrollUV * 0.015, 0.0);
  float n = fbm(np * 1.6 + u_time * 0.008);
  n = smoothstep(0.30, 0.72, n);
  vec3 tint = mix(vec3(0.05, 0.06, 0.18), vec3(0.16, 0.05, 0.12), vnoise(np * 0.6));
  color += tint * n * 0.6;

  gl_FragColor = vec4(color, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[starfield] shader', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function initShader(canvas: HTMLCanvasElement): Cleanup | null {
  const gl = (canvas.getContext('webgl', { antialias: false, depth: false }) ||
    canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[starfield] program', gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uScroll = gl.getUniformLocation(prog, 'u_scroll');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  const mouse = { x: 0, y: 0 };
  const onMouse = (e: MouseEvent) => {
    mouse.x = (e.clientX / window.innerWidth) * canvas.width;
    mouse.y = (1 - e.clientY / window.innerHeight) * canvas.height;
  };
  window.addEventListener('mousemove', onMouse);

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      mouse.x = w / 2;
      mouse.y = h / 2;
    }
  }

  function draw(timeMs: number) {
    resize();
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.uniform1f(uTime, timeMs * 0.001);
    gl!.uniform2f(uRes, canvas.width, canvas.height);
    gl!.uniform1f(uScroll, scrollX());
    gl!.uniform2f(uMouse, mouse.x, mouse.y);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  let raf = 0;
  if (REDUCED) {
    const redraw = () => draw(0);
    redraw();
    window.addEventListener('resize', redraw);
    document.addEventListener('scroll', redraw, true);
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', redraw);
      document.removeEventListener('scroll', redraw, true);
    };
  }

  const loop = (t: number) => {
    draw(t);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('mousemove', onMouse);
  };
}

// ── Canvas 2D (fallback) ─────────────────────────────────────────────────────
interface Star {
  x: number; y: number; r: number; a: number; tw: number; tws: number; speed: number;
}
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const LAYERS = [
  { count: 150, speed: 0.015, size: [0.4, 0.9], alpha: [0.2, 0.55] },
  { count: 90, speed: 0.04, size: [0.6, 1.3], alpha: [0.35, 0.75] },
  { count: 45, speed: 0.085, size: [1.0, 2.0], alpha: [0.55, 1.0] },
];

function initCanvas2D(canvas: HTMLCanvasElement): Cleanup {
  const ctx = canvas.getContext('2d')!;
  const bg = document.createElement('canvas');
  const bctx = bg.getContext('2d')!;
  let W = 0, H = 0, dpr = 1;
  let stars: Star[] = [];

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

  function nebula(c: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `${rgb}${a})`);
    g.addColorStop(1, `${rgb}0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  function renderBackground() {
    bg.width = W * dpr;
    bg.height = H * dpr;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = bctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, '#040509');
    g.addColorStop(1, '#000000');
    bctx.fillStyle = g;
    bctx.fillRect(0, 0, W, H);
    const D = Math.max(W, H);
    bctx.globalCompositeOperation = 'lighter';
    nebula(bctx, W * 0.12, H * 0.08, D * 0.3, 'rgba(48,72,150,', 0.05);
    nebula(bctx, W * 0.92, H * 0.96, D * 0.32, 'rgba(96,54,160,', 0.045);
    nebula(bctx, W * 0.78, H * 0.16, D * 0.24, 'rgba(24,110,130,', 0.04);
    nebula(bctx, W * 0.04, H * 0.92, D * 0.22, 'rgba(170,40,48,', 0.03);
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

  function paint(time: number) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0, W, H);
    const sx = scrollX();
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

  const onResize = () => {
    resize();
    if (REDUCED) paint(0);
  };
  window.addEventListener('resize', onResize);
  resize();

  let raf = 0;
  if (REDUCED) {
    paint(0);
    return () => window.removeEventListener('resize', onResize);
  }
  const loop = (t: number) => {
    paint(t);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
  };
}
