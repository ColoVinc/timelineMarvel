// ─────────────────────────────────────────────────────────────────────────────
//  Starfield WebGL — campo stellare come fragment shader (GPU)
//
//  Stelle disegnate su 3 livelli di profondità con una griglia hash: ogni cella
//  ha una probabilità di contenere una stella, resa come disco sfumato
//  (smoothstep) che pulsa. Fondo nero con nebulose di rumore frattale (fBm),
//  tenui ma percepibili.
//
//  PARALLASSE: ogni livello viene spostato in base allo scroll orizzontale
//  della timeline con una velocità diversa (i livelli lontani si muovono più
//  lentamente), più un tocco molto tenue legato al mouse.
//
//  Ritorna false se WebGL non è disponibile → si ripiega sulla versione 2D.
// ─────────────────────────────────────────────────────────────────────────────

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

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

// Rumore a valori interpolato sui vertici della griglia
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);           // interpolazione morbida
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Rumore frattale: 3 ottave, sufficienti per nubi morbide senza pesare troppo
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int k = 0; k < 3; k++) {
    v += amp * vnoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

void main() {
  float m = min(u_resolution.x, u_resolution.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / m;

  // parallasse del mouse: molto tenue, serve solo a dare profondità
  uv += (u_mouse / u_resolution - 0.5) * 0.06;

  float scrollUV = u_scroll / m;

  vec3 color = vec3(0.005, 0.006, 0.012); // spazio profondo, quasi nero

  for (float i = 0.0; i < 3.0; i += 1.0) {
    float size  = mix(420.0, 150.0, i / 2.0);   // densità della griglia
    float speed = 0.035 + 0.05 * i;             // livelli vicini = più veloci
    float thr   = 0.982 + 0.006 * i;            // livelli vicini = più radi

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

  // Nebulose: nubi di rumore frattale, tenui ma percepibili.
  // Parallasse 0.015 = più lenta di ogni livello di stelle → sembrano le più lontane.
  vec2 np = uv - vec2(scrollUV * 0.015, 0.0);
  float n = fbm(np * 1.6 + u_time * 0.008);
  n = smoothstep(0.30, 0.72, n);                 // isola solo le zone dense
  vec3 tint = mix(vec3(0.05, 0.06, 0.18),        // blu profondo
                  vec3(0.16, 0.05, 0.12),        // magenta spento
                  vnoise(np * 0.6));
  color += tint * n * 0.6;

  gl_FragColor = vec4(color, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[starfield-gl]', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function initShaderStarfield() {
  const canvas = document.createElement('canvas');
  canvas.id = 'starfield';

  const gl =
    canvas.getContext('webgl', { antialias: false, depth: false }) ||
    canvas.getContext('experimental-webgl');
  if (!gl) return false;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return false;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[starfield-gl]', gl.getProgramInfoLog(prog));
    return false;
  }
  gl.useProgram(prog);

  // Quad a schermo intero
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

  document.body.prepend(canvas);

  const mouse = { x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * canvas.width;
    mouse.y = (1 - e.clientY / window.innerHeight) * canvas.height;
  });

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

  const scrollX = () => {
    const s = document.getElementById('scroller');
    return s ? s.scrollLeft : 0;
  };

  function draw(timeMs) {
    resize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uTime, timeMs * 0.001);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uScroll, scrollX());
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    // Niente animazione continua: si ridisegna solo su scroll e ridimensionamento.
    const redraw = () => draw(0);
    redraw();
    window.addEventListener('resize', redraw);
    document.addEventListener('scroll', redraw, true);
  } else {
    const loop = (t) => {
      draw(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  return true;
}
