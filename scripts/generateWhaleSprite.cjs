const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

// =============================================================================
// GERADOR PROCEDURAL DA JUBARTE PROTAGONISTA (Megaptera novaeangliae)
// Redesign Artístico 16-Bit — 16 frames × 128×64 px = 2048×64 px
// - Silhueta anatômica contínua (rostro com tubérculos, corcunda dorsal, pedúnculo esguio)
// - Nadadeiras peitorais longas em foice com tubérculos anteriores e contraste 3D
// - Flukes esculpidos com entalhe em V, serrilhado e padrão ventral assimétrico
// - Animação de propulsão progressiva (0..13) e lunge-feeding (14..15)
// =============================================================================

const WIDTH = 2048;
const HEIGHT = 64;
const FRAME_W = 128;

const buffer = Buffer.alloc(WIDTH * HEIGHT * 4, 0);

// -----------------------------------------------------------------------------
// PRIMITIVAS DE RENDERIZAÇÃO PIXEL ART
// -----------------------------------------------------------------------------
function setPixel(x, y, r, g, b, a = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT || a <= 0) return;
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

function setC(x, y, c, a = c[3] ?? 255) {
  setPixel(x, y, c[0], c[1], c[2], a);
}

function fillCircle(cx, cy, r, color) {
  const r2 = r * r;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(HEIGHT - 1, Math.ceil(cy + r)); y++) {
    for (
      let x = Math.max(0, Math.floor(cx - r));
      x <= Math.min(WIDTH - 1, Math.ceil(cx + r));
      x++
    ) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) setC(x, y, color);
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
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1.0) setC(x, y, color);
    }
  }
}

function fillPolygon(pts, color) {
  let minY = HEIGHT;
  let maxY = 0;
  for (const p of pts) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const yStart = Math.max(0, Math.floor(minY));
  const yEnd = Math.min(HEIGHT - 1, Math.ceil(maxY));
  for (let y = yStart; y <= yEnd; y++) {
    const xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const pi = pts[i];
      const pj = pts[j];
      if ((pi.y <= y && pj.y > y) || (pj.y <= y && pi.y > y)) {
        xs.push(pi.x + ((y - pi.y) / (pj.y - pi.y)) * (pj.x - pi.x));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k < xs.length - 1; k += 2) {
      const x0 = Math.max(0, Math.ceil(xs[k]));
      const x1 = Math.min(WIDTH - 1, Math.floor(xs[k + 1]));
      for (let x = x0; x <= x1; x++) setC(x, y, color);
    }
  }
}

function drawLine(x0, y0, x1, y1, w, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
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
  let px = x0;
  let py = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const it = 1 - t;
    const nx = it * it * x0 + 2 * it * t * cx + t * t * x1;
    const ny = it * it * y0 + 2 * it * t * cy + t * t * y1;
    drawLine(px, py, nx, ny, w, color);
    px = nx;
    py = ny;
  }
}

// -----------------------------------------------------------------------------
// DITHERING BAYER 2×2 CONTROLADO
// -----------------------------------------------------------------------------
const BAYER = [
  [0, 2],
  [3, 1],
];
function bayerThreshold(x, y) {
  return BAYER[y & 1][x & 1] / 4.0;
}
function pickSteppedTone(a, b, t, x, y, bandWidth = 0.22) {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5 - bandWidth) return a;
  if (clamped > 0.5 + bandWidth) return b;
  const localT = (clamped - (0.5 - bandWidth)) / (bandWidth * 2);
  return localT > bayerThreshold(x, y) ? b : a;
}

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
// PALETA REFINADA — Megaptera novaeangliae + Iluminação Oceânica Micro Splash
// -----------------------------------------------------------------------------
const P = {
  // Dorso (marrom-carvão com reflexo oceânico sutil na crista)
  d0: [22, 18, 22, 255], // contorno profundo
  d1: [40, 34, 34, 255], // dorso escuro
  d2: [64, 54, 48, 255], // dorso médio
  d3: [94, 82, 72, 255], // flanco iluminado
  d4: [126, 122, 118, 255], // realce dorsal superior (luz fria da superfície)
  dRim: [158, 178, 192, 255], // brilho oceânico sutil na crista dorsal

  // Ventre (branco-creme com sombras azul-acinzentadas coerentes)
  vShadow: [132, 134, 138, 255], // sombra ventral / transição
  v0: [170, 166, 156, 255], // ventre sombreado
  v1: [208, 200, 188, 255], // ventre médio
  v2: [236, 230, 218, 255], // ventre claro
  v3: [250, 248, 242, 255], // marfim puro

  // Pregas gulares
  gDeep: [38, 30, 28, 255],
  gMid: [112, 102, 94, 255],
  gRidge: [242, 238, 228, 255],

  // Boca / barbas (frames 14-15)
  baleenPlate: [246, 234, 194, 255],
  baleenMid: [216, 194, 150, 255],
  baleenTip: [128, 108, 78, 255],
  mouthDark: [36, 14, 22, 255],
  mouthTongue: [86, 28, 40, 255],
  mouthStream: [178, 226, 255, 165],
  krillBody: [255, 110, 62, 255],
  krillGlow: [255, 220, 160, 210],

  // Nadadeira peitoral próxima (contraste volumétrico + manchas naturais)
  pWhite: [246, 244, 238, 255],
  pCream: [220, 214, 202, 255],
  pShade: [168, 162, 154, 255],
  pDark: [32, 26, 24, 255],
  pMottle: [92, 80, 72, 255],

  // Nadadeira peitoral oposta (mais escura e fria em profundidade)
  pBack: [50, 52, 60, 230],
  pBackShade: [34, 34, 42, 245],
  pBackDark: [22, 20, 26, 255],

  // Tubérculos anatômicos (rostro e borda peitoral)
  tbBase: [30, 24, 22, 255],
  tbTip: [148, 138, 126, 255],
  tbGlint: [204, 198, 188, 255],

  // Olho
  eyeRing: [54, 44, 38, 255],
  eyeDark: [12, 10, 12, 255],
  eyeGlint: [240, 248, 255, 255],

  // Espiráculo e sombra oceânica
  blow: [18, 14, 16, 255],
  shadow: [8, 18, 36, 68],
};

// Pigmentação natural determinística no flanco
const SPECKLES = (() => {
  const rng = mulberry32(0x4a55424152);
  const items = [];
  for (let i = 0; i < 16; i++) {
    items.push({
      lx: 32 + rng() * 68,
      relY: 0.14 + rng() * 0.42,
      r: 0.55 + rng() * 0.75,
    });
  }
  return items;
})();

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Curvatura espinhal biológica com leve compensação no tórax para sensação de propulsão
function spineY(lx, tailOff, chestHeave) {
  if (lx >= 78) return chestHeave * 0.4;
  const t = Math.max(0, Math.min(1, (78 - lx) / 60));
  return tailOff * (t * t * (3 - 2 * t)) + chestHeave * (1 - t);
}

// Contorno anatômico contínuo (dorso e ventre) sem quebras abruptas
function sampleBodyProfile(lx, isFeed, feedPhase, sy) {
  let topY;
  let botY;
  let jawY = 30.0;

  if (lx >= 90) {
    const t = (lx - 90) / 30; // 0..1 testa -> ponta do rostro
    // Tubérculos sutis integrados à silhueta superior do rostro
    const tbWave = Math.max(0, Math.sin(t * Math.PI * 3.4)) * 0.65 * (1 - smoothstep(0.75, 1.0, t));
    if (isFeed) {
      const openAmp = 1.0 + feedPhase * 0.14;
      topY = 14.8 + t * 5.8 - tbWave;
      jawY = 23.5 + t * 2.2;
      botY = 53.5 * openAmp - Math.pow(t, 1.45) * 9.5;
    } else {
      topY = 16.2 + t * 7.8 - tbWave;
      jawY = 29.8 - t * 0.6;
      botY = 43.8 - Math.pow(t, 1.18) * 14.5;
    }
  } else if (lx > 50) {
    const t = (lx - 50) / 40; // 0 (pedúnculo) .. 1 (cabeça)
    const hump = Math.sin(smoothstep(54, 72, lx) * Math.PI) * 2.6;
    const headBlend = smoothstep(76, 90, lx);
    topY = 15.8 - hump + headBlend * 0.4 + sy;

    if (isFeed) {
      const bt = smoothstep(50, 90, lx);
      botY = 37.0 + Math.pow(bt, 0.72) * (17.5 + feedPhase * 1.5) + sy * 0.5;
    } else {
      const bellyArc = Math.sin(Math.pow(t, 0.85) * Math.PI * 0.92);
      botY = 35.2 + bellyArc * 13.8 + sy;
    }
  } else {
    // Pedúnculo caudal estreito e musculoso (lx 18..50)
    const t = (lx - 18) / 32;
    topY = 29.2 - Math.pow(t, 0.85) * 13.4 + sy;
    botY = 33.4 + Math.pow(t, 1.15) * 3.2 + sy;
  }

  return {
    topY: Math.max(4, topY),
    botY: Math.min(59, botY),
    jawY,
  };
}

// =============================================================================
// RENDERIZAÇÃO DE CADA FRAME (0..15)
// =============================================================================
function renderFrame(fi) {
  const ox = fi * FRAME_W;
  const isFeed = fi >= 14;
  const feedPhase = fi === 15 ? 1 : 0;

  let tailOff = 0;
  let flukeTilt = 0;
  let pecOff = 0;
  let chestHeave = 0;

  if (fi >= 1 && fi <= 4) {
    const a = ((fi - 1) / 4) * Math.PI * 2;
    tailOff = -Math.sin(a) * 1.3;
    flukeTilt = -Math.sin(a - 0.4) * 0.09;
    pecOff = -Math.sin(a) * 0.45;
    chestHeave = Math.sin(a) * 0.35;
  } else if (fi >= 5 && fi <= 13) {
    const a = ((fi - 5) / 9) * Math.PI * 2;
    tailOff = Math.sin(a) * 5.6;
    flukeTilt = Math.sin(a - 0.55) * 0.36;
    pecOff = Math.sin(a + 0.3) * 1.5;
    chestHeave = -Math.sin(a) * 0.95;
  } else if (isFeed) {
    tailOff = fi === 14 ? 0.6 : -0.4;
    flukeTilt = fi === 14 ? 0.04 : -0.03;
    pecOff = fi === 14 ? 0.3 : -0.2;
    chestHeave = fi === 14 ? -0.4 : 0.2;
  }

  // ---------------------------------------------------------------------------
  // A. NADADEIRA PEITORAL OPOSTA (atrás do corpo, perspectiva submersa)
  // ---------------------------------------------------------------------------
  {
    const bBx = ox + 78;
    const bBy = 35.0 + chestHeave + pecOff * 0.55;
    const bCx = ox + 69;
    const bCy = bBy + 7.2;
    const bTx = ox + 58;
    const bTy = bBy + 12.2 + pecOff * 0.85;

    const steps = 22;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const it = 1 - t;
      const cx = it * it * bBx + 2 * it * t * bCx + t * t * bTx;
      const cy = it * it * bBy + 2 * it * t * bCy + t * t * bTy;
      const dx = 2 * it * (bCx - bBx) + 2 * t * (bTx - bCx);
      const dy = 2 * it * (bCy - bBy) + 2 * t * (bTy - bCy);
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const hw = 2.4 * (1 - t * 0.62) + 0.4;
      drawLine(cx - nx * hw, cy - ny * hw, cx + nx * hw, cy + ny * hw, 1.1, P.pBack);
      setC(cx + nx * hw, cy + ny * hw, P.pBackDark);
      setC(cx - nx * (hw * 0.6), cy - ny * (hw * 0.6), P.pBackShade);
    }
  }

  // ---------------------------------------------------------------------------
  // B. CORPO PRINCIPAL — Silhueta volumétrica, sombreamento em planos e dither
  // ---------------------------------------------------------------------------
  const pouchBounds = [];
  const profileCache = [];

  for (let lx = 18; lx <= 120; lx++) {
    const sy = spineY(lx, tailOff, chestHeave);
    const prof = sampleBodyProfile(lx, isFeed, feedPhase, sy);
    profileCache[lx] = prof;

    const { topY, botY, jawY } = prof;
    const colH = Math.max(1, botY - topY);
    const ax = ox + lx;

    if (lx >= 56 && lx <= 120) {
      const pTop =
        isFeed && lx >= 90
          ? 30.0 + Math.pow((lx - 90) / 28, 0.55) * 18.0 + 2.0
          : lx >= 90
            ? jawY + 1.0
            : topY + colH * 0.54;
      pouchBounds[lx] = { top: pTop, bot: botY };
    }

    for (let py = Math.floor(topY); py <= Math.ceil(botY); py++) {
      const relY = (py - topY) / colH;

      if (lx >= 90) {
        const t = (lx - 90) / 30;
        if (isFeed) {
          const palY = 23.5 + t * 2.2;
          const jawF = 29.5 + Math.pow(t, 0.55) * (18.5 + feedPhase * 1.2);
          if (py <= Math.ceil(palY)) {
            const c = py <= topY + 1.4 ? P.d4 : py <= topY + 3.2 ? P.d2 : P.d1;
            setC(ax, py, c);
          } else if (py < Math.floor(jawF)) {
            const dt = (py - palY) / Math.max(1, jawF - palY);
            setC(ax, py, dt > 0.62 ? P.mouthTongue : P.mouthDark);
          } else if (py <= Math.ceil(jawF) + 2) {
            setC(ax, py, P.d0);
          } else {
            const pt = (py - Math.ceil(jawF) - 2) / Math.max(1, botY - Math.ceil(jawF) - 2);
            const c = pickSteppedTone(P.v0, P.v2, pt, ax, py, 0.25);
            setC(ax, py, c);
          }
        } else {
          if (py < jawY) {
            const c = py <= topY + 1.4 ? P.d4 : py <= topY + 4.0 ? P.d2 : P.d1;
            setC(ax, py, c);
          } else if (Math.abs(py - jawY) < 1.1) {
            setC(ax, py, P.d0);
          } else {
            const vt = (py - jawY) / Math.max(1, botY - jawY);
            const c = pickSteppedTone(P.v1, P.v2, vt, ax, py, 0.22);
            setC(ax, py, c);
          }
        }
      } else {
        if (relY < 0.08) {
          setC(ax, py, pickSteppedTone(P.d4, P.d3, relY / 0.08, ax, py, 0.2));
        } else if (relY < 0.3) {
          setC(ax, py, pickSteppedTone(P.d3, P.d2, (relY - 0.08) / 0.22, ax, py, 0.26));
        } else if (relY < 0.52) {
          setC(ax, py, pickSteppedTone(P.d2, P.d1, (relY - 0.3) / 0.22, ax, py, 0.24));
        } else if (relY < 0.68) {
          setC(ax, py, pickSteppedTone(P.d1, P.vShadow, (relY - 0.52) / 0.16, ax, py, 0.28));
        } else if (relY < 0.8) {
          setC(ax, py, pickSteppedTone(P.vShadow, P.v1, (relY - 0.68) / 0.12, ax, py, 0.25));
        } else {
          const isPatch = lx >= 48 && lx <= 74 && !isFeed;
          const ca = isPatch ? P.v2 : P.v1;
          const cb = isPatch ? P.v3 : P.v2;
          setC(ax, py, pickSteppedTone(ca, cb, (relY - 0.8) / 0.2, ax, py, 0.22));
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // C. MANCHAS NATURAIS SUTIS NO FLANCO
  // ---------------------------------------------------------------------------
  if (!isFeed) {
    for (const sp of SPECKLES) {
      const lxi = Math.round(sp.lx);
      const prof = profileCache[lxi];
      if (!prof) continue;
      const spY = prof.topY + sp.relY * (prof.botY - prof.topY);
      fillCircle(ox + lxi, spY, sp.r, P.d1);
    }
  }

  // ---------------------------------------------------------------------------
  // D. PREGAS GULARES ACOMPANHANDO A ANATOMIA VENTRAL
  // ---------------------------------------------------------------------------
  {
    const ng = isFeed ? 11 : 7;
    for (let g = 0; g < ng; g++) {
      const frac = (g + 0.55) / ng;
      const startLx = isFeed ? 118 : g < 2 ? 108 : 114;
      const endLx = isFeed ? 58 : g < 2 ? 72 : 65;
      for (let lx = startLx; lx >= endLx; lx--) {
        const b = pouchBounds[lx];
        if (!b || b.top < 24) continue;
        const gy = b.top + frac * (b.bot - b.top);
        const ry = Math.round(gy);
        if (ry > b.top + 1 && ry < b.bot - 1) {
          setC(ox + lx, ry, g < 2 ? P.gMid : P.gDeep);
          if (ry - 1 > b.top) setC(ox + lx, ry - 1, P.gRidge);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // E. CONTORNO NITIDO + REALCE OCEÂNICO DORSAL + TUBÉRCULOS CEFÁLICOS
  // ---------------------------------------------------------------------------
  for (let lx = 18; lx <= 120; lx++) {
    const prof = profileCache[lx];
    if (!prof) continue;
    setC(ox + lx, Math.floor(prof.topY), P.d0);
    setC(ox + lx, Math.ceil(prof.botY), P.d0);
    if (lx >= 58 && lx <= 96) {
      setC(ox + lx, Math.floor(prof.topY) + 1, lx >= 64 && lx <= 86 ? P.dRim : P.d4);
    }
  }

  // Tubérculos anatômicos sutis no rostro (sem parecer bolhas)
  for (const tbLx of [96, 103, 110, 116]) {
    const prof = profileCache[tbLx];
    if (!prof) continue;
    const ty = Math.floor(prof.topY);
    setC(ox + tbLx, ty - 1, P.tbBase);
    setC(ox + tbLx + 1, ty - 1, P.tbTip);
    setC(ox + tbLx, ty, P.tbGlint);
  }
  if (!isFeed) {
    // Nódulo característico na ponta da mandíbula inferior
    const chin = profileCache[118];
    if (chin) {
      setC(ox + 118, Math.ceil(chin.botY), P.tbBase);
      setC(ox + 119, Math.ceil(chin.botY) - 1, P.tbTip);
    }
  }

  // ---------------------------------------------------------------------------
  // F. NADADEIRA DORSAL FALCADA + KNUCKLES DO PEDÚNCULO
  // ---------------------------------------------------------------------------
  {
    const dX = ox + 55;
    const dBase = profileCache[55]?.topY ?? 15.5;
    fillPolygon(
      [
        { x: dX - 5, y: dBase + 1 },
        { x: dX - 1, y: dBase - 4.5 },
        { x: dX + 2, y: dBase - 3.0 },
        { x: dX + 5.5, y: dBase + 1 },
      ],
      P.d1
    );
    drawLine(dX - 4.5, dBase + 0.5, dX - 1, dBase - 4.5, 1.2, P.d0);
    setC(dX, dBase - 4.0, P.dRim);

    const kdata = [
      { lx: 47, r: 1.8 },
      { lx: 41, r: 1.6 },
      { lx: 35, r: 1.4 },
      { lx: 29, r: 1.2 },
      { lx: 23, r: 1.0 },
    ];
    for (const kn of kdata) {
      const top = profileCache[kn.lx]?.topY ?? 22;
      fillCircle(ox + kn.lx, top, kn.r, P.d0);
      setC(ox + kn.lx, top - 0.5, P.d4);
    }
  }

  // ---------------------------------------------------------------------------
  // G. BOCA E BARBAS (14..15) / COMISSURA FECHADA (0..13)
  // ---------------------------------------------------------------------------
  if (isFeed) {
    const openDrop = feedPhase * 2.0;
    drawQuadCurve(ox + 119, 49.0 + openDrop, ox + 105, 40.5 + openDrop, ox + 90, 30.0, 2.2, P.d0);
    drawQuadCurve(
      ox + 118,
      47.5 + openDrop,
      ox + 105,
      39.0 + openDrop,
      ox + 90,
      30.5,
      1.3,
      P.mouthTongue
    );
    drawQuadCurve(ox + 119, 25.8, ox + 105, 24.8, ox + 90, 23.8, 1.5, P.d0);

    for (let b = 92; b <= 118; b++) {
      const t2 = (b - 90) / 30;
      const palY = 23.5 + t2 * 2.2;
      const midT = (b - 92) / 26;
      const hang = 3.8 + Math.sin(midT * Math.PI) * (9.5 + feedPhase * 1.2);
      for (let py = Math.floor(palY + 1.5); py <= Math.floor(palY + hang); py++) {
        const fd = (py - (palY + 1.5)) / Math.max(1, hang - 1.5);
        const col = fd > 0.84 ? P.baleenTip : b % 2 === 0 ? P.baleenPlate : P.baleenMid;
        setC(ox + b, py, col);
      }
    }

    const flowShift = feedPhase * 4;
    drawLine(ox + 120 - flowShift, 32, ox + 103 - flowShift, 34, 1.0, P.mouthStream);
    drawLine(ox + 121 - flowShift, 39, ox + 101 - flowShift, 41, 1.2, P.mouthStream);

    for (const kr of [
      { x: 101 - flowShift, y: 36 },
      { x: 108 - flowShift, y: 39 },
      { x: 115 - flowShift, y: 35 },
      { x: 117 - flowShift, y: 42 },
    ]) {
      const kx = ox + kr.x;
      fillCircle(kx, kr.y, 1.3, P.krillGlow);
      setC(kx, kr.y, P.krillBody);
    }
  } else {
    drawQuadCurve(ox + 119, 29.4, ox + 106, 31.4, ox + 90, 29.8, 1.4, P.d0);
  }

  // ---------------------------------------------------------------------------
  // H. ESPIRÁCULO E OLHO DISCRETO E EXPRESSIVO
  // ---------------------------------------------------------------------------
  {
    const bx = ox + 88;
    const by = (profileCache[88]?.topY ?? 16.0) + 0.6;
    fillEllipse(bx, by, 2.4, 1.1, P.d0);
    setC(bx - 0.8, by, P.blow);
    setC(bx + 0.8, by, P.blow);

    const ex = isFeed ? ox + 86.0 : ox + 91.5;
    const ey = isFeed ? 22.8 : 27.0;
    fillCircle(ex, ey, 2.0, P.eyeRing);
    fillCircle(ex, ey, 1.2, P.eyeDark);
    setC(ex + 0.5, ey - 0.5, P.eyeGlint);
    setC(ex - 1.0, ey - 1.2, P.d0);
    setC(ex + 1.0, ey - 1.2, P.d0);
  }

  // ---------------------------------------------------------------------------
  // I. NADADEIRA PEITORAL PRÓXIMA EM FOICE (com sombra de inserção e volume)
  // ---------------------------------------------------------------------------
  {
    const pBx = ox + 78;
    const pBy = 35.5 + chestHeave + pecOff;
    const pCx = ox + 63;
    const pCy = pBy + 11.5;
    const pTx = ox + 45;
    const pTy = Math.min(58.5, pBy + 19.5 + (pecOff < 0 ? pecOff * 1.2 : pecOff * 0.4));

    // Sombra de contato na junção peitoral-tórax
    fillEllipse(pBx - 1, pBy + 1.5, 4.2, 2.4, P.d0);

    const rSteps = 44;
    for (let i = 0; i <= rSteps; i++) {
      const t = i / rSteps;
      const it = 1 - t;
      const cx = it * it * pBx + 2 * it * t * pCx + t * t * pTx;
      const cy = it * it * pBy + 2 * it * t * pCy + t * t * pTy;
      const dx = 2 * it * (pCx - pBx) + 2 * t * (pTx - pCx);
      const dy = 2 * it * (pCy - pBy) + 2 * t * (pTy - pCy);
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const hw = 3.2 * (1 - t * 0.64) + 0.55;

      // Plano ventral iluminado + sombreamento na borda posterior
      drawLine(cx - nx * hw, cy - ny * hw, cx + nx * hw, cy + ny * hw, 1.5, P.pCream);
      drawLine(
        cx - nx * hw * 0.35,
        cy - ny * hw * 0.35,
        cx + nx * hw * 0.65,
        cy + ny * hw * 0.65,
        1.2,
        P.pWhite
      );
      setC(cx - nx * hw, cy - ny * hw, P.pShade);
      setC(cx + nx * hw, cy + ny * hw, P.pDark);
      setC(cx + nx * (hw - 0.5), cy + ny * (hw - 0.5), P.pDark);
    }

    // 5 tubérculos sutis na borda anterior da foice
    for (const tf of [0.16, 0.34, 0.52, 0.7, 0.86]) {
      const it = 1 - tf;
      const cx = it * it * pBx + 2 * it * tf * pCx + tf * tf * pTx;
      const cy = it * it * pBy + 2 * it * tf * pCy + tf * tf * pTy;
      const dx = 2 * it * (pCx - pBx) + 2 * tf * (pTx - pCx);
      const dy = 2 * it * (pCy - pBy) + 2 * tf * (pTy - pCy);
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const hw = 3.2 * (1 - tf * 0.64) + 0.55;
      fillCircle(cx + nx * hw, cy + ny * hw, 1.15, P.pDark);
      setC(cx + nx * (hw - 0.4), cy + ny * (hw - 0.4), P.tbTip);
    }

    // Manchas naturais na face ventral
    for (const m of [
      { t: 0.25, s: 0.1 },
      { t: 0.44, s: -0.5 },
      { t: 0.62, s: 0.3 },
      { t: 0.78, s: -0.2 },
    ]) {
      const it = 1 - m.t;
      const cx = it * it * pBx + 2 * it * m.t * pCx + m.t * m.t * pTx;
      const cy = it * it * pBy + 2 * it * m.t * pCy + m.t * m.t * pTy;
      fillCircle(cx + m.s, cy + m.s, 0.9, P.pMottle);
    }
    fillCircle(pTx, pTy, 1.2, P.pWhite);
  }

  // ---------------------------------------------------------------------------
  // J. NADADEIRA CAUDAL ESCULPIDA (lobos, entalhe em V, pigmentação tipo 3)
  // ---------------------------------------------------------------------------
  {
    const baseProf = profileCache[18];
    const tX = ox + 18;
    const tY = baseProf ? (baseProf.topY + baseProf.botY) * 0.5 : 31.3 + tailOff;
    const span = 14.5;
    const sweep = 11.5;
    const topX = tX - sweep;
    const topY = Math.max(5.5, tY - span + flukeTilt * 8.5);
    const botX = tX - sweep;
    const botY = Math.min(58.5, tY + span + flukeTilt * 8.5);

    // Lobo superior preenchido
    fillPolygon(
      [
        { x: tX + 1, y: tY - 1.5 },
        { x: tX - 3.5, y: topY + 4.5 },
        { x: topX, y: topY },
        { x: topX + 3.0, y: topY + 5.0 },
        { x: tX - 4.0, y: tY - 0.8 },
      ],
      P.d1
    );
    // Lobo inferior preenchido
    fillPolygon(
      [
        { x: tX + 1, y: tY + 1.5 },
        { x: tX - 3.5, y: botY - 4.5 },
        { x: botX, y: botY },
        { x: botX + 3.0, y: botY - 5.0 },
        { x: tX - 4.0, y: tY + 0.8 },
      ],
      P.d1
    );

    // Realce dorsal + pigmentação assimétrica tipo 3
    drawLine(tX, tY - 1.2, topX + 1, topY + 1, 1.4, P.d3);
    drawLine(tX, tY + 1.2, botX + 1, botY - 1, 1.4, P.d2);
    fillPolygon(
      [
        { x: tX - 3.5, y: tY - 2.0 },
        { x: topX + 4.0, y: topY + 3.8 },
        { x: topX + 6.0, y: topY + 6.5 },
        { x: tX - 4.5, y: tY - 0.8 },
      ],
      P.v2
    );
    fillCircle(botX + 3.0, botY - 3.5, 2.2, P.v1);
    fillCircle(botX + 3.2, botY - 3.8, 1.2, P.v3);
    setC(topX + 2.0, topY + 2.0, P.v3);

    // Contorno e entalhe central em V
    drawLine(tX, tY - 1.5, topX, topY, 1.1, P.d0);
    drawLine(tX, tY + 1.5, botX, botY, 1.1, P.d0);
    for (let nx = 0; nx < 4; nx++) {
      setPixel(tX - 1 - nx, tY, 0, 0, 0, 0);
    }
  }
}

for (let f = 0; f < 16; f++) renderFrame(f);

// =============================================================================
// FASE FINAL: SOMBRA OCEÂNICA INFERIOR + AMBIENT OCCLUSION 1PX
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

const aoMask = new Uint8Array(WIDTH * HEIGHT);
for (let y = 1; y < HEIGHT - 1; y++) {
  for (let x = 1; x < WIDTH - 1; x++) {
    if (buffer[(y * WIDTH + x) * 4 + 3] === 0) {
      if (
        buffer[((y - 1) * WIDTH + x) * 4 + 3] > 180 ||
        buffer[((y + 1) * WIDTH + x) * 4 + 3] > 180 ||
        buffer[(y * WIDTH + x - 1) * 4 + 3] > 180 ||
        buffer[(y * WIDTH + x + 1) * 4 + 3] > 180
      ) {
        aoMask[y * WIDTH + x] = 1;
      }
    }
  }
}
for (let i = 0; i < WIDTH * HEIGHT; i++) {
  if (aoMask[i]) {
    const idx = i * 4;
    buffer[idx] = P.d0[0];
    buffer[idx + 1] = P.d0[1];
    buffer[idx + 2] = P.d0[2];
    buffer[idx + 3] = 48;
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
console.log(`Jubarte redesenhada salva: ${outFile} (${pngData.length} bytes)`);
