const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

// =============================================================================
// GERADOR PROCEDURAL DA JUBARTE PROTAGONISTA (Megaptera novaeangliae)
// Polimento Visual Total — 8 frames × 128×64 px = 1024×64 px
// Proporções anatômicas reais: corpo achatado dorsoventralmente, ventre volumoso,
// cabeça larga com rostro achatado, peitorais gigantes em foice.
// =============================================================================

const WIDTH = 1024;
const HEIGHT = 64;
const FRAME_W = 128;

const buffer = Buffer.alloc(WIDTH * HEIGHT * 4, 0);

// -----------------------------------------------------------------------------
// PRIMITIVAS DE RENDERIZAÇÃO
// -----------------------------------------------------------------------------
function setPixel(x, y, r, g, b, a = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  if (a <= 0) return;
  const idx = (y * WIDTH + x) * 4;
  if (a === 255 || buffer[idx + 3] === 0) {
    buffer[idx] = r;
    buffer[idx + 1] = g;
    buffer[idx + 2] = b;
    buffer[idx + 3] = a;
  } else {
    const al = a / 255;
    const iv = 1 - al;
    buffer[idx] = Math.round(r * al + buffer[idx] * iv);
    buffer[idx + 1] = Math.round(g * al + buffer[idx + 1] * iv);
    buffer[idx + 2] = Math.round(b * al + buffer[idx + 2] * iv);
    buffer[idx + 3] = Math.min(255, Math.round(buffer[idx + 3] * iv + a));
  }
}

function getPixelAlpha(x, y) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return 0;
  return buffer[(y * WIDTH + x) * 4 + 3];
}

function fillCircle(cx, cy, r, color) {
  const r2 = r * r;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(HEIGHT - 1, Math.ceil(cy + r)); y++) {
    for (
      let x = Math.max(0, Math.floor(cx - r));
      x <= Math.min(WIDTH - 1, Math.ceil(cx + r));
      x++
    ) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2)
        setPixel(x, y, color[0], color[1], color[2], color[3] ?? 255);
    }
  }
}

function fillEllipse(cx, cy, rx, ry, color) {
  for (
    let y = Math.max(0, Math.floor(cy - ry));
    y <= Math.min(HEIGHT - 1, Math.ceil(cy + ry));
    y++
  ) {
    for (
      let x = Math.max(0, Math.floor(cx - rx));
      x <= Math.min(WIDTH - 1, Math.ceil(cx + rx));
      x++
    ) {
      const nx = (x - cx) / rx,
        ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1.0) setPixel(x, y, color[0], color[1], color[2], color[3] ?? 255);
    }
  }
}

function drawLine(x0, y0, x1, y1, w, color) {
  const dx = x1 - x0,
    dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    fillCircle(x0, y0, w / 2, color);
    return;
  }
  const steps = Math.ceil(len * 2.5);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    fillCircle(x0 + dx * t, y0 + dy * t, w / 2, color);
  }
}

function drawQuadCurve(x0, y0, cx, cy, x1, y1, w, color) {
  const steps = Math.max(16, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.8));
  let px = x0,
    py = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps,
      it = 1 - t;
    const nx = it * it * x0 + 2 * it * t * cx + t * t * x1;
    const ny = it * it * y0 + 2 * it * t * cy + t * t * y1;
    drawLine(px, py, nx, ny, w, color);
    px = nx;
    py = ny;
  }
}

// -----------------------------------------------------------------------------
// DITHERING BAYER 2×2 — anti-banding para gradientes suaves
// -----------------------------------------------------------------------------
const BAYER = [
  [0, 2],
  [3, 1],
];
function dither(x, y, strength = 10) {
  return (BAYER[y & 1][x & 1] / 4.0 - 0.5) * 2.0 * strength;
}
function lerpC(a, b, t, x, y, ds = 10) {
  const tc = Math.max(0, Math.min(1, t));
  const d = dither(x, y, ds);
  return [
    Math.max(0, Math.min(255, Math.round(a[0] + (b[0] - a[0]) * tc + d))),
    Math.max(0, Math.min(255, Math.round(a[1] + (b[1] - a[1]) * tc + d))),
    Math.max(0, Math.min(255, Math.round(a[2] + (b[2] - a[2]) * tc + d))),
    255,
  ];
}

// -----------------------------------------------------------------------------
// PRNG determinístico para sardas
// -----------------------------------------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -----------------------------------------------------------------------------
// PALETA — Megaptera novaeangliae (Daniela Weil reference + polimento)
// -----------------------------------------------------------------------------
const P = {
  // Dorso (carvão-umber com nuances quentes)
  d0: [24, 18, 12, 255], // contorno mais escuro
  d1: [44, 34, 26, 255], // dorso profundo
  d2: [68, 54, 42, 255], // dorso médio
  d3: [98, 80, 62, 255], // flanco dorsal iluminado
  d4: [132, 110, 88, 255], // crista dorsal / highlight

  // Ventre (marfim creme)
  v0: [160, 148, 132, 255], // ventre sombreado
  v1: [200, 190, 174, 255], // ventre médio
  v2: [232, 226, 214, 255], // ventre claro
  v3: [250, 246, 238, 255], // marfim puro (peitoral, patch)

  // Transição lateral (azul-acinzentado oceânico)
  lat: [82, 72, 62, 255], // flanco lateral

  // Pregas gulares
  gDeep: [28, 18, 12, 255],
  gRidge: [252, 250, 244, 255],

  // Boca / barbas
  baleenPlate: [248, 238, 200, 255],
  baleenMid: [222, 202, 160, 255],
  baleenTip: [140, 120, 85, 255],
  mouthDark: [40, 14, 18, 255],
  mouthTongue: [78, 26, 34, 255],
  mouthStream: [185, 228, 255, 150],
  krillBody: [255, 105, 60, 255],
  krillGlow: [255, 215, 150, 220],

  // Nadadeiras peitorais
  pWhite: [248, 246, 240, 255],
  pCream: [228, 220, 208, 255],
  pDark: [34, 26, 18, 255],
  pMottle: [108, 90, 74, 255],
  // Peitoral oposta (mais escura/azulada — perspectiva)
  pBack: [58, 50, 42, 200],
  pBackDark: [36, 26, 18, 255],

  // Tubérculos
  tbBase: [30, 22, 16, 255],
  tbTip: [178, 160, 138, 255],
  tbGlint: [238, 228, 212, 255],

  // Olho
  eyeRing: [58, 44, 32, 255],
  eyeDark: [12, 8, 6, 255],
  eyeGlit: [242, 248, 255, 255],

  // Espiráculo
  blow: [20, 12, 8, 255],

  // Cracas (Coronula diadema)
  bcOuter: [205, 200, 190, 255],
  bcInner: [28, 20, 14, 255],
  bcRidge: [238, 234, 226, 255],

  // Sombra projetada oceânica
  shadow: [8, 16, 32, 60],
};

// -----------------------------------------------------------------------------
// Sardas determinísticas (seed fixa — mesma aparência em todos os frames)
// -----------------------------------------------------------------------------
const SPECKLES = (() => {
  const rng = mulberry32(0x4a55424152); // "JUBAR"
  const s = [];
  for (let i = 0; i < 20; i++) {
    s.push({
      lx: 28 + rng() * 78, // ao longo do corpo
      relY: 0.04 + rng() * 0.48, // dorso e flanco superior
      r: 0.5 + rng() * 1.1,
    });
  }
  return s;
})();

// (Cracas e tubérculos do rostro removidos para eliminar efeito de bolhas na boca)

// -----------------------------------------------------------------------------
// Curvatura espinhal — flexão biológica da coluna da jubarte
// Propulsão oscila lx 18-72, tórax fixo 72-114
// -----------------------------------------------------------------------------
function spineY(lx, tailOff) {
  if (lx >= 76 || tailOff === 0) return 0;
  const t = Math.min(1, Math.max(0, (76 - lx) / 58));
  return tailOff * t * t * (3 - 2 * t);
}

// =============================================================================
// RENDERIZAÇÃO DE CADA FRAME
// =============================================================================
function renderFrame(fi) {
  const ox = fi * FRAME_W; // origin X do frame

  // Parâmetros de animação de batida de cauda
  let tailOff = 0,
    flukeTilt = 0,
    pecOff = 0;
  const isFeed = fi === 7;

  if (fi === 1) {
    tailOff = -3.5;
    flukeTilt = -0.22;
    pecOff = -1.0;
  } else if (fi === 2) {
    tailOff = -5.8;
    flukeTilt = -0.36;
    pecOff = -1.6;
  } else if (fi === 3) {
    tailOff = -1.2;
    flukeTilt = 0.08;
    pecOff = 0.4;
  } else if (fi === 4) {
    tailOff = 3.5;
    flukeTilt = 0.25;
    pecOff = 1.1;
  } else if (fi === 5) {
    tailOff = 5.8;
    flukeTilt = 0.38;
    pecOff = 1.6;
  } else if (fi === 6) {
    tailOff = 1.6;
    flukeTilt = 0.12;
    pecOff = 0.5;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // A. NADADEIRA PEITORAL OPOSTA (atrás do corpo, perspectiva 3D)
  //    Versão comprimida + escurecida. Renderizada ANTES do corpo.
  // ─────────────────────────────────────────────────────────────────────────
  {
    // Base inserção no tórax (lx=77), ponta inferior (lx=60, y=56)
    const bBx = ox + 78,
      bBy = 35.5 + pecOff * 0.6;
    const bCx = ox + 68,
      bCy = bBy + 7.0;
    const bTx = ox + 58,
      bTy = bBy + 12.5 + pecOff * 1.0;

    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps,
        it = 1 - t;
      const cx = it * it * bBx + 2 * it * t * bCx + t * t * bTx;
      const cy = it * it * bBy + 2 * it * t * bCy + t * t * bTy;
      const dx = 2 * (1 - t) * (bCx - bBx) + 2 * t * (bTx - bCx);
      const dy = 2 * (1 - t) * (bCy - bBy) + 2 * t * (bTy - bCy);
      const len = Math.hypot(dx, dy);
      const nx = -dy / (len || 1),
        ny = dx / (len || 1);
      const hw = 2.2 * (1 - t * 0.65) + 0.3;
      drawLine(cx - nx * hw, cy - ny * hw, cx + nx * hw, cy + ny * hw, 1.0, P.pBack);
      setPixel(cx + nx * hw, cy + ny * hw, P.pBackDark[0], P.pBackDark[1], P.pBackDark[2]);
    }
    // 2 tubérculos comprimidos
    for (const tf of [0.3, 0.65]) {
      const it = 1 - tf;
      const cx = it * it * bBx + 2 * it * tf * bCx + tf * tf * bTx;
      const cy = it * it * bBy + 2 * it * tf * bCy + tf * tf * bTy;
      fillCircle(cx, cy, 0.9, P.pBackDark);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // B. CORPO PRINCIPAL — perfil anatômico da Megaptera novaeangliae
  //
  //  Proporções reais:
  //   - Dorso quase reto, levemente inclinado do rostro à corcunda
  //   - Ventre muito convexo (volumoso) — não torpedo!
  //   - Cabeça achatada em cima, arredondada embaixo (rostro de balaenopterídeo)
  //   - Pedúnculo caudal estreito e alto
  //
  //  Coordenadas em espaço de frame (lx 16..120, y 14..60):
  //   lx: 16 = ponta da cauda, 120 = ponta do rostro
  //   y:  14 = dorso/crista, 56 = ventre máximo
  // ─────────────────────────────────────────────────────────────────────────
  const pouchBounds = [];

  for (let lx = 16; lx <= 120; lx++) {
    const sy = spineY(lx, tailOff);
    const ax = ox + lx;

    let topY,
      botY,
      jawY = 0;

    if (lx >= 92) {
      // ── CABEÇA: rostro longo e achatado ──
      const t = (lx - 92) / 28; // 0..1 da testa ao rostro
      if (isFeed) {
        // Boca aberta: bolsa gular expandida
        topY = 16.5 + t * 6.0; // dorso desce levemente
        jawY = 25.0 + t * 2.0; // palato
        botY = 55.0 - Math.pow(t, 1.5) * 10.0; // ventre = bolsa inflada
      } else {
        topY = 16.5 + t * 7.5; // dorso da cabeça (queda suave)
        jawY = 30.0 - t * 0.5; // comissura da boca
        botY = 44.0 - Math.pow(t, 1.1) * 14.0; // queixo arredondado
      }
    } else if (lx > 52) {
      // ── TÓRAX E ABDÔMEN: ventre muito volumoso ──
      const t = (lx - 52) / 40; // 0..1
      // Dorso: suave com corcunda (58..72)
      let hump = 0;
      if (lx >= 56 && lx <= 72) {
        const ht = (lx - 56) / 16;
        hump = Math.sin(ht * Math.PI) * 3.2;
      }
      topY = 15.5 - hump + sy;

      if (isFeed) {
        if (lx < 56) {
          botY = 38.0 + (lx - 52) * 0.8;
        } else {
          const bt = (lx - 56) / 36;
          botY = 41.0 + Math.pow(bt, 0.65) * 16.0;
        }
      } else {
        // Ventre convexo orgânico — MÁXIMO em lx≈74 (40px de altura total)
        const bellyPeak = Math.sin(t * Math.PI * 0.88) * 0.95 + 0.05;
        botY = 36.0 + bellyPeak * 13.0 + sy;
      }
    } else {
      // ── PEDÚNCULO CAUDAL: estreito e alto ──
      const t = (lx - 16) / 36;
      topY = 30.0 - t * 14.5 + sy;
      botY = 33.5 + t * 3.5 + sy;
    }

    const colH = Math.max(1, botY - topY);

    // Salva limites da bolsa gular
    if (lx >= 56 && lx <= 120) {
      const pTop =
        isFeed && lx >= 92
          ? 31.0 + Math.pow((lx - 92) / 26, 0.55) * 18.0 + 2.0
          : lx >= 92
            ? jawY + 1.0
            : topY + colH * 0.52;
      pouchBounds[lx] = { top: pTop, bot: botY };
    }

    // Preenche coluna com gradiente suave
    for (let py = Math.floor(topY); py <= Math.ceil(botY); py++) {
      const relY = (py - topY) / colH;

      if (lx >= 92) {
        // Região cefálica
        const t = (lx - 92) / 28;
        if (isFeed) {
          const palY = 25.0 + t * 2.0;
          const jawF = 31.0 + Math.pow(t, 0.55) * 18.0;
          if (py <= Math.ceil(palY)) {
            setPixel(
              ax,
              py,
              py <= topY + 1.0 ? P.d4[0] : P.d1[0],
              py <= topY + 1.0 ? P.d4[1] : P.d1[1],
              py <= topY + 1.0 ? P.d4[2] : P.d1[2]
            );
          } else if (py < Math.floor(jawF)) {
            const dt = (py - palY) / (jawF - palY);
            setPixel(
              ax,
              py,
              dt > 0.65 ? P.mouthTongue[0] : P.mouthDark[0],
              dt > 0.65 ? P.mouthTongue[1] : P.mouthDark[1],
              dt > 0.65 ? P.mouthTongue[2] : P.mouthDark[2]
            );
          } else if (py <= Math.ceil(jawF) + 2) {
            setPixel(ax, py, P.d0[0], P.d0[1], P.d0[2]);
          } else {
            const pt = (py - Math.ceil(jawF) - 2) / (botY - Math.ceil(jawF) - 2);
            const c = lerpC(P.v0, P.v2, pt, ax, py, 7);
            setPixel(ax, py, c[0], c[1], c[2]);
          }
        } else {
          if (py < jawY) {
            setPixel(
              ax,
              py,
              py <= topY + 1.5 ? P.d4[0] : P.d1[0],
              py <= topY + 1.5 ? P.d4[1] : P.d1[1],
              py <= topY + 1.5 ? P.d4[2] : P.d1[2]
            );
          } else if (Math.abs(py - jawY) < 1.2) {
            setPixel(ax, py, P.d0[0], P.d0[1], P.d0[2]);
          } else {
            const c = lerpC(P.v1, P.v2, (py - jawY) / (botY - jawY), ax, py, 6);
            setPixel(ax, py, c[0], c[1], c[2]);
          }
        }
      } else {
        // ── Corpo: gradiente 5 zonas com dithering ──
        // Gradiente longitudinal: tórax 5% mais claro que pedúnculo
        const longi = Math.max(0, Math.min(1, (lx - 16) / 96)) * 6;

        if (relY < 0.07) {
          // Crista dorsal
          const c = lerpC(P.d4, P.d3, relY / 0.07, ax, py, 7);
          setPixel(ax, py, Math.min(255, (c[0] + longi) | 0), c[1], c[2]);
        } else if (relY < 0.32) {
          // Dorso superior
          const c = lerpC(P.d3, P.d2, (relY - 0.07) / 0.25, ax, py, 12);
          setPixel(ax, py, c[0], c[1], c[2]);
        } else if (relY < 0.52) {
          // Flanco médio (transição dorso→ventre)
          const c = lerpC(P.d2, P.d1, (relY - 0.32) / 0.2, ax, py, 10);
          setPixel(ax, py, c[0], c[1], c[2]);
        } else if (relY < 0.68) {
          // Flanco ventral
          const c = lerpC(P.d1, P.v0, (relY - 0.52) / 0.16, ax, py, 9);
          setPixel(ax, py, c[0], c[1], c[2]);
        } else {
          // Ventre — mancha branca posterior (lx 48-72)
          const isPatch = lx >= 48 && lx <= 74 && !isFeed;
          const ca = isPatch ? P.v2 : P.v0;
          const cb = isPatch ? P.v3 : P.v2;
          const c = lerpC(ca, cb, (relY - 0.68) / 0.32, ax, py, 7);
          setPixel(ax, py, c[0], c[1], c[2]);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // C. SARDAS DORSAIS (SPECKLES determinísticos)
  // ─────────────────────────────────────────────────────────────────────────
  if (!isFeed) {
    for (const sp of SPECKLES) {
      const lxi = Math.round(sp.lx);
      const sy = spineY(lxi, tailOff);
      let topYs = 15.5 + sy,
        botYs = 38.0 + sy;
      if (lxi <= 52) {
        const t = (lxi - 16) / 36;
        topYs = 30.0 - t * 14.5 + sy;
        botYs = 33.5 + t * 3.5 + sy;
      }
      const spY = topYs + sp.relY * (botYs - topYs);
      fillCircle(ox + lxi, spY, sp.r, P.d0);
      fillCircle(ox + lxi, spY, sp.r * 0.42, P.d1);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // D. PREGAS GULARES (sulcos ventrais)
  // ─────────────────────────────────────────────────────────────────────────
  {
    const ng = isFeed ? 12 : 8;
    for (let g = 0; g < ng; g++) {
      const frac = (g + 0.5) / ng;
      const startLx = isFeed ? 119 : g < 3 ? 108 : 115;
      const endLx = isFeed ? 58 : g < 3 ? 70 : 65;
      for (let lx = startLx; lx >= endLx; lx--) {
        const b = pouchBounds[lx];
        if (!b || b.top < 24) continue;
        const gy = b.top + frac * (b.bot - b.top);
        const ry = Math.round(gy);
        if (ry > b.top && ry < b.bot) {
          setPixel(ox + lx, ry, P.gDeep[0], P.gDeep[1], P.gDeep[2]);
          if (ry - 1 > b.top) setPixel(ox + lx, ry - 1, P.gRidge[0], P.gRidge[1], P.gRidge[2]);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // E. CONTORNO DORSAL NÍTIDO + HIGHLIGHT DE CRISTA
  // ─────────────────────────────────────────────────────────────────────────
  for (let lx = 16; lx <= 120; lx++) {
    const sy = spineY(lx, tailOff);
    let topY;
    if (lx >= 92) {
      const t = (lx - 92) / 28;
      topY = isFeed ? 16.5 + t * 6.0 : 16.5 + t * 7.5;
    } else if (lx > 52) {
      let hump = 0;
      if (lx >= 56 && lx <= 72) {
        const ht = (lx - 56) / 16;
        hump = Math.sin(ht * Math.PI) * 3.2;
      }
      topY = 15.5 - hump + sy;
    } else {
      const t = (lx - 16) / 36;
      topY = 30.0 - t * 14.5 + sy;
    }
    setPixel(ox + lx, Math.floor(topY), P.d0[0], P.d0[1], P.d0[2]);
    // Highlight de crista só no tórax
    if (lx >= 62 && lx <= 88) setPixel(ox + lx, Math.floor(topY) + 1, P.d4[0], P.d4[1], P.d4[2]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // F. NADADEIRA DORSAL FALCADA
  // ─────────────────────────────────────────────────────────────────────────
  {
    const dX = ox + 57;
    const dY = 12.8 + spineY(57, tailOff);
    drawLine(dX + 5.0, dY + 3.8, dX - 0.5, dY - 4.2, 3.0, P.d1);
    drawLine(dX - 0.5, dY - 4.2, dX - 5.0, dY + 3.5, 2.4, P.d0);
    fillCircle(dX - 0.8, dY - 2.2, 1.6, P.d1);
    setPixel(dX - 0.5, Math.round(dY - 4.2), P.d4[0], P.d4[1], P.d4[2]); // glint no topo
    setPixel(dX - 1.5, Math.round(dY - 3.4), P.d0[0], P.d0[1], P.d0[2]); // sombra
  }

  // ─────────────────────────────────────────────────────────────────────────
  // G. KNUCKLES DO PEDÚNCULO (6 nódulos dorsais progressivos)
  // ─────────────────────────────────────────────────────────────────────────
  {
    const kdata = [
      { lx: 48, r: 2.3 },
      { lx: 42, r: 2.0 },
      { lx: 36, r: 1.7 },
      { lx: 30, r: 1.4 },
      { lx: 24, r: 1.1 },
      { lx: 19, r: 0.9 },
    ];
    for (const kn of kdata) {
      const sy2 = spineY(kn.lx, tailOff);
      const t = (kn.lx - 16) / 36;
      const baseTop = 30.0 - t * 14.5 + sy2;
      const ky = baseTop - kn.r * 0.4;
      fillCircle(ox + kn.lx, ky + kn.r * 0.35, kn.r, P.d0); // sombra
      fillCircle(ox + kn.lx, ky, kn.r * 0.82, P.d1); // corpo
      setPixel(ox + kn.lx, Math.round(ky - kn.r * 0.5), P.d4[0], P.d4[1], P.d4[2]); // highlight
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // H. BOCA E BARBAS (feed frame) / COMISSURA (frames normais)
  // ─────────────────────────────────────────────────────────────────────────
  if (isFeed) {
    // Arco da mandíbula inferior
    drawQuadCurve(ox + 119, 51.0, ox + 106, 42.0, ox + 92, 31.0, 2.4, P.d0);
    drawQuadCurve(ox + 119, 49.5, ox + 106, 40.5, ox + 92, 31.5, 1.4, P.mouthTongue);
    // Palato superior
    drawQuadCurve(ox + 119, 27.0, ox + 106, 26.0, ox + 92, 25.0, 1.6, P.d0);

    // Barbas filtradoras pendentes
    for (let b = 94; b <= 118; b++) {
      const t2 = (b - 92) / 28;
      const palY = 25.0 + t2 * 2.0;
      const midT = (b - 94) / 24;
      const hang = 4.0 + Math.sin(midT * Math.PI) * 9.5;
      for (let py = Math.floor(palY + 1.5); py <= Math.floor(palY + hang); py++) {
        const fd = (py - (palY + 1.5)) / (hang - 1.5);
        setPixel(
          ox + b,
          py,
          fd > 0.85 ? P.baleenTip[0] : b % 2 === 0 ? P.baleenPlate[0] : P.baleenMid[0],
          fd > 0.85 ? P.baleenTip[1] : b % 2 === 0 ? P.baleenPlate[1] : P.baleenMid[1],
          fd > 0.85 ? P.baleenTip[2] : b % 2 === 0 ? P.baleenPlate[2] : P.baleenMid[2]
        );
      }
    }

    // Fluxo de água
    drawLine(ox + 118, 33, ox + 102, 35, 1.0, P.mouthStream);
    drawLine(ox + 120, 40, ox + 100, 42, 1.2, P.mouthStream);
    drawLine(ox + 117, 46, ox + 98, 43, 0.8, P.mouthStream);

    // Krill
    for (const kr of [
      { x: 100, y: 37 },
      { x: 107, y: 40 },
      { x: 113, y: 36 },
      { x: 119, y: 34 },
      { x: 115, y: 43 },
    ]) {
      const kx = ox + kr.x;
      fillCircle(kx, kr.y, 1.4, P.krillGlow);
      setPixel(kx, kr.y, P.krillBody[0], P.krillBody[1], P.krillBody[2]);
    }
  } else {
    // Comissura da boca fechada
    drawQuadCurve(ox + 119, 30.0, ox + 108, 32.0, ox + 92, 30.0, 1.6, P.d0);
  }

  // I. Tubérculos do rostro/queixo removidos (eliminado efeito de bolhas saindo da boca)

  // ─────────────────────────────────────────────────────────────────────────
  // J. ESPIRÁCULO DUPLO
  // ─────────────────────────────────────────────────────────────────────────
  {
    const bx = ox + 90,
      by = 16.8;
    fillEllipse(bx, by, 2.8, 1.3, P.d0);
    setPixel(bx - 0.9, by, P.blow[0], P.blow[1], P.blow[2]);
    setPixel(bx + 0.9, by, P.blow[0], P.blow[1], P.blow[2]);
    setPixel(bx, by - 0.9, P.d4[0], P.d4[1], P.d4[2]); // glint superior
  }

  // ─────────────────────────────────────────────────────────────────────────
  // K. OLHO
  // ─────────────────────────────────────────────────────────────────────────
  {
    const ex = isFeed ? ox + 87.0 : ox + 92.0;
    const ey = isFeed ? 23.5 : 27.5;
    fillCircle(ex, ey, 2.4, P.eyeRing);
    fillCircle(ex, ey, 1.5, P.eyeDark);
    setPixel(ex + 0.5, ey - 0.5, P.eyeGlit[0], P.eyeGlit[1], P.eyeGlit[2]);
    // Pequeno arco de pálpebra
    setPixel(ex - 1.2, ey - 1.2, P.d0[0], P.d0[1], P.d0[2]);
    setPixel(ex + 1.2, ey - 1.2, P.d0[0], P.d0[1], P.d0[2]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // L. NADADEIRA PEITORAL GIGANTE EM FOICE (face ventral clara)
  //    Proporção real: 30% do comprimento do corpo = ~32px de ponta a base
  //    Base em lx=78, ponta em lx=40 (fora do frame é cortado pelo ventre)
  // ─────────────────────────────────────────────────────────────────────────
  {
    const pBx = ox + 78,
      pBy = 37.0 + pecOff;
    const pCx = ox + 62,
      pCy = pBy + 12.0;
    const pTx = ox + 44,
      pTy = pBy + 20.0 + (pecOff < 0 ? pecOff * 1.5 : pecOff * 0.4);

    const rSteps = 44;
    for (let i = 0; i <= rSteps; i++) {
      const t = i / rSteps,
        it = 1 - t;
      const cx = it * it * pBx + 2 * it * t * pCx + t * t * pTx;
      const cy = it * it * pBy + 2 * it * t * pCy + t * t * pTy;
      const dx = 2 * (1 - t) * (pCx - pBx) + 2 * t * (pTx - pCx);
      const dy = 2 * (1 - t) * (pCy - pBy) + 2 * t * (pTy - pCy);
      const len = Math.hypot(dx, dy);
      const nx = -dy / (len || 1),
        ny = dx / (len || 1);
      const hw = 3.1 * (1 - t * 0.66) + 0.5;
      // Face ventral clara
      drawLine(cx - nx * hw, cy - ny * hw, cx + nx * hw, cy + ny * hw, 1.7, P.pWhite);
      // Bordo anterior escuro
      setPixel(cx + nx * hw, cy + ny * hw, P.pDark[0], P.pDark[1], P.pDark[2]);
      setPixel(cx + nx * (hw - 0.5), cy + ny * (hw - 0.5), P.pDark[0], P.pDark[1], P.pDark[2]);
    }

    // 5 tubérculos da borda anterior
    for (const tf of [0.16, 0.34, 0.52, 0.7, 0.87]) {
      const it = 1 - tf;
      const cx = it * it * pBx + 2 * it * tf * pCx + tf * tf * pTx;
      const cy = it * it * pBy + 2 * it * tf * pCy + tf * tf * pTy;
      const dx = 2 * (1 - tf) * (pCx - pBx) + 2 * tf * (pTx - pCx);
      const dy = 2 * (1 - tf) * (pCy - pBy) + 2 * tf * (pTy - pCy);
      const len = Math.hypot(dx, dy);
      const nx = -dy / (len || 1),
        ny = dx / (len || 1);
      const hw = 3.1 * (1 - tf * 0.66) + 0.5;
      fillCircle(cx + nx * hw, cy + ny * hw, 1.3, P.pDark);
      setPixel(cx + nx * (hw - 0.4), cy + ny * (hw - 0.4), P.tbTip[0], P.tbTip[1], P.tbTip[2]);
    }

    // Sardas/manchas na face ventral
    for (const m of [
      { t: 0.26, s: 0 },
      { t: 0.42, s: -0.6 },
      { t: 0.57, s: 0.4 },
      { t: 0.71, s: -0.3 },
      { t: 0.84, s: 0.2 },
    ]) {
      const it = 1 - m.t;
      const cx = it * it * pBx + 2 * it * m.t * pCx + m.t * m.t * pTx;
      const cy = it * it * pBy + 2 * it * m.t * pCy + m.t * m.t * pTy;
      fillCircle(cx + m.s, cy + m.s, 1.0, P.pMottle);
    }
    fillCircle(pTx, pTy, 1.3, P.pWhite); // ponta arredondada
  }

  // ─────────────────────────────────────────────────────────────────────────
  // M. CAUDA E FLUKES — Pigmentação ventral individual (padrão tipo 3)
  // ─────────────────────────────────────────────────────────────────────────
  {
    const tX = ox + 16,
      tY = 32.0 + tailOff;
    const span = 15.0,
      sweep = 12.0;
    const topX = tX - sweep,
      topY = tY - span + flukeTilt * 8.0;
    const botX = tX - sweep,
      botY = tY + span + flukeTilt * 8.0;

    // Lobo superior (dorsal escuro)
    drawQuadCurve(tX, tY, tX - 4.5, topY + 5, topX, topY, 3.6, P.d1);
    drawQuadCurve(tX - 2, tY, tX - 6, topY + 6, topX + 2, topY + 2, 2.5, P.d2);
    // Lobo inferior (dorsal)
    drawQuadCurve(tX, tY, tX - 4.5, botY - 5, botX, botY, 3.6, P.d1);
    drawQuadCurve(tX - 2, tY, tX - 6, botY - 6, botX + 2, botY - 2, 2.5, P.d2);

    // Pigmentação ventral individual — patches assimétricos tipo 3 (mesclado)
    // Lobo superior: patch claro proximal
    drawQuadCurve(tX - 2, tY - 3, tX - 6, topY + 9, topX + 4, topY + 4, 2.2, P.v1);
    drawQuadCurve(tX - 3, tY - 5, tX - 7, topY + 10, topX + 5, topY + 5, 1.4, P.v3);
    // Lobo inferior: patch claro na ponta (assimetria individual)
    fillCircle(botX + 2.5, botY - 3.5, 3.0, P.v1);
    fillCircle(botX + 3.0, botY - 4.0, 1.8, P.v3);

    // Manchas brancas nas pontas (trailing edge)
    drawLine(topX + 1, topY + 1, topX + 6, topY + 5.5, 2.0, P.v3);
    drawLine(botX + 1, botY - 1, botX + 6, botY - 5.5, 2.0, P.v3);

    // Serrilhado do bordo posterior (mais pronunciado)
    for (let i = 1; i <= 5; i++) {
      const f = i / 6;
      const stX = topX + (tX - topX) * f - Math.sin(f * Math.PI) * 2.0;
      const stY = topY + (tY - topY) * f;
      setPixel(stX - 0.5, stY, P.d0[0], P.d0[1], P.d0[2]);
      setPixel(stX - 1.5, stY + 0.5, P.d0[0], P.d0[1], P.d0[2], 140);
      const sbX = botX + (tX - botX) * f - Math.sin(f * Math.PI) * 2.0;
      const sbY = botY + (tY - botY) * f;
      setPixel(sbX - 0.5, sbY, P.d0[0], P.d0[1], P.d0[2]);
      setPixel(sbX - 1.5, sbY - 0.5, P.d0[0], P.d0[1], P.d0[2], 140);
    }

    // Entalhe central em V
    setPixel(tX - 0.5, tY, 0, 0, 0, 0);
    setPixel(tX - 1.5, tY, 0, 0, 0, 0);
    setPixel(tX - 2.5, tY, 0, 0, 0, 0);
    setPixel(tX - 3.5, tY, 0, 0, 0, 0);
  }
}

// Renderiza os 8 frames
for (let f = 0; f < 8; f++) renderFrame(f);

// =============================================================================
// FASE 7: SELF-SHADOW — borda inferior de cada pixel opaco recebe sombra oceânica
// =============================================================================
for (let y = 0; y < HEIGHT - 1; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const idx = (y * WIDTH + x) * 4;
    const below = ((y + 1) * WIDTH + x) * 4;
    if (buffer[idx + 3] > 128 && buffer[below + 3] === 0) {
      buffer[below] = P.shadow[0];
      buffer[below + 1] = P.shadow[1];
      buffer[below + 2] = P.shadow[2];
      buffer[below + 3] = P.shadow[3];
    }
  }
}

// =============================================================================
// AMBIENT OCCLUSION LEVE — contorno externo de 1px semi-transparente
// Otimizado: verificação inline sem alocação de array por pixel
// =============================================================================
// Passe 1: marca pixels de borda em buffer de flags (1 byte por pixel)
const aoMask = new Uint8Array(WIDTH * HEIGHT);
for (let y = 1; y < HEIGHT - 1; y++) {
  for (let x = 1; x < WIDTH - 1; x++) {
    if (buffer[(y * WIDTH + x) * 4 + 3] === 0) {
      if (
        buffer[((y - 1) * WIDTH + x) * 4 + 3] > 180 ||
        buffer[((y + 1) * WIDTH + x) * 4 + 3] > 180 ||
        buffer[(y * WIDTH + x - 1) * 4 + 3] > 180 ||
        buffer[(y * WIDTH + x + 1) * 4 + 3] > 180
      )
        aoMask[y * WIDTH + x] = 1;
    }
  }
}
// Passe 2: aplica AO diretamente no buffer
for (let i = 0; i < WIDTH * HEIGHT; i++) {
  if (aoMask[i]) {
    const idx = i * 4;
    buffer[idx] = P.d0[0];
    buffer[idx + 1] = P.d0[1];
    buffer[idx + 2] = P.d0[2];
    buffer[idx + 3] = 45;
  }
}

// =============================================================================
// ENCODER PNG NATIVO
// =============================================================================
function createPNG(w, h, buf) {
  const scans = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    scans[y * (w * 4 + 1)] = 0;
    buf.copy(scans, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const deflated = zlib.deflateSync(scans, { level: 9 });
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  function crc32(b) {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const ch = Buffer.alloc(4 + 4 + data.length + 4);
    ch.writeUInt32BE(data.length, 0);
    ch.write(type, 4, 4, "ascii");
    data.copy(ch, 8);
    ch.writeUInt32BE(crc32(ch.subarray(4, 8 + data.length)), 8 + data.length);
    return ch;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflated),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const pngData = createPNG(WIDTH, HEIGHT, buffer);
const outFile = path.join(__dirname, "../public/sprites/whale.png");
fs.writeFileSync(outFile, pngData);
console.log(`Jubarte polida salva: ${outFile} (${pngData.length} bytes)`);
