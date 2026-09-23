const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const WIDTH = 512;
const HEIGHT = 64;
const FRAME_W = 128;

// Buffer RGBA
const buffer = Buffer.alloc(WIDTH * HEIGHT * 4, 0);

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
    const alpha = a / 255;
    const inv = 1 - alpha;
    buffer[idx] = Math.round(r * alpha + buffer[idx] * inv);
    buffer[idx + 1] = Math.round(g * alpha + buffer[idx + 1] * inv);
    buffer[idx + 2] = Math.round(b * alpha + buffer[idx + 2] * inv);
    buffer[idx + 3] = Math.min(255, Math.round(buffer[idx + 3] * inv + a));
  }
}

function fillCircle(cx, cy, r, color) {
  const r2 = r * r;
  const yStart = Math.max(0, Math.floor(cy - r));
  const yEnd = Math.min(HEIGHT - 1, Math.ceil(cy + r));
  const xStart = Math.max(0, Math.floor(cx - r));
  const xEnd = Math.min(WIDTH - 1, Math.ceil(cx + r));

  for (let y = yStart; y <= yEnd; y++) {
    for (let x = xStart; x <= xEnd; x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d2 <= r2) {
        setPixel(x, y, color[0], color[1], color[2], color[3] ?? 255);
      }
    }
  }
}

function fillEllipse(cx, cy, rx, ry, color) {
  const yStart = Math.max(0, Math.floor(cy - ry));
  const yEnd = Math.min(HEIGHT - 1, Math.ceil(cy + ry));
  const xStart = Math.max(0, Math.floor(cx - rx));
  const xEnd = Math.min(WIDTH - 1, Math.ceil(cx + rx));

  for (let y = yStart; y <= yEnd; y++) {
    for (let x = xStart; x <= xEnd; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1.0) {
        setPixel(x, y, color[0], color[1], color[2], color[3] ?? 255);
      }
    }
  }
}

function drawLine(x0, y0, x1, y1, width, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    fillCircle(x0, y0, width / 2, color);
    return;
  }
  const steps = Math.ceil(len * 2.5);
  const r = width / 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    fillCircle(px, py, r, color);
  }
}

function drawQuadCurve(x0, y0, cx, cy, x1, y1, width, color) {
  const steps = Math.max(16, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.8));
  let prevX = x0, prevY = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const it = 1 - t;
    const px = it * it * x0 + 2 * it * t * cx + t * t * x1;
    const py = it * it * y0 + 2 * it * t * cy + t * t * y1;
    drawLine(prevX, prevY, px, py, width, color);
    prevX = px;
    prevY = py;
  }
}

// =============================================================================
// PALETA COERENTE COM A ILUSTRAÇÃO DE DANIELA WEIL (Megaptera novaeangliae)
// =============================================================================
const PALETTE = {
  // Dorso / corpo superior (Charcoal-Umber ardósia quente)
  dorsalDarkest: [30, 22, 16, 255],    // #1e1610 contorno escuro e sombras
  dorsalDark:    [52, 40, 32, 255],    // #342820 corpo dorsal escuro
  dorsalMid:     [78, 64, 52, 255],    // #4e4034 tom médio terroso
  dorsalLight:   [114, 96, 78, 255],   // #72604e crista dorsal iluminada
  dorsalHighlight: [146, 126, 104, 255], // #927e68 reflexo suave na crista

  // Ventre e bolsa gular (Creme marfim e bege quente)
  bellyWhite:    [248, 244, 236, 255], // #f8f4ec marfim puro
  bellyMid:      [224, 214, 198, 255], // #e0d6c6 tom médio do ventre gular
  bellyShade:    [172, 156, 138, 255], // #ac9c8a sombra gular suave
  bellyPatch:    [252, 250, 244, 255], // #fcfaf4 mancha branca do flanco posterior

  // Pregas gulares (Sulcos ventrais profundos característicos)
  grooveDeep:    [34, 24, 16, 255],    // #221810 fenda escura bem definida
  grooveMid:     [68, 52, 38, 255],    // #443426 borda da fenda
  grooveRidge:   [254, 252, 246, 255], // #fefcf6 crista clara entre pregas

  // Nadadeiras Peitorais (Megaptera - longas asas de foice)
  pectoralWhite: [250, 248, 242, 255], // #faf8f2 superfície ventral branca
  pectoralCream: [232, 226, 216, 255], // #e8e2d8 tom suave de transição
  pectoralMottle:[112, 96, 80, 255],   // #706050 sardas/manchas escuras
  pectoralDark:  [38, 28, 20, 255],    // #261c14 bordo anterior escuro
  pectoralBack:  [106, 90, 76, 240],   // Nadadeira oposta ao fundo (3D)
  pectoralBackDark: [54, 42, 32, 255],

  // Tubérculos (Nódulos sensoriais na cabeça, queixo e nadadeira)
  tubercleBase:  [34, 24, 18, 255],
  tubercleTip:   [184, 166, 146, 255],
  tubercleGlint: [240, 230, 215, 255],

  // Olho e Espiráculo
  eyeRing:       [64, 48, 36, 255],
  eyeDark:       [14, 10, 8, 255],
  eyeGlint:      [245, 250, 255, 255],
  blowhole:      [22, 14, 10, 255],

  // Boca, Cavidade Oral e Barbas Filtradoras (Baleen - Megaptera novaeangliae)
  baleenPlate:     [250, 240, 205, 255], // #faf0cd cerdas douradas brilhantes
  baleenMid:       [225, 205, 165, 255], // #e1cda5 lâmina de queratina marfim-dourada
  baleenShadow:    [145, 125, 90, 255],  // #917d5a franja e sombra das cerdas
  mouthGape:       [46, 16, 22, 255],    // #2e1016 cavidade oral profunda / garganta
  mouthTongue:     [84, 28, 38, 255],    // #541c26 assoalho da boca / língua carnosa
  mouthStream:     [190, 230, 255, 160], // fluxo translúcido de água entrando na boca
  krillBody:       [255, 110, 70, 255],  // #ff6e46 corpo do krill coral bioluminescente
  krillGlow:       [255, 220, 160, 230], // #ffdca0 brilho dourado do krill
  krillEye:        [24, 16, 14, 255],    // olho minúsculo do krill
};

/**
 * Curvatura anatômica progressiva da coluna vertebral da jubarte.
 * Começa suavemente após a inserção torácica (lx ~ 76) e atinge flexão máxima
 * no pedúnculo caudal (lx = 18), gerando ondas de downstroke côncavo e upstroke convexo.
 */
function getSpineYOffset(lx, tailYOffset) {
  if (lx >= 76 || tailYOffset === 0) return 0;
  const t = Math.min(1, Math.max(0, (76 - lx) / 58));
  // Interpolação cúbica de Hermite suave (smoothstep) para flexão biológica contínua
  const factor = t * t * (3 - 2 * t);
  return tailYOffset * factor;
}

function renderWhaleFrame(frameIndex) {
  const offsetX = frameIndex * FRAME_W;

  let tailYOffset = 0;
  let flukeTilt = 0;
  let pecYOffset = 0;
  const isFeeding = (frameIndex === 3);

  if (frameIndex === 1) { // stroke_up (arco convexo)
    tailYOffset = -7.0;
    flukeTilt = -0.44;
    pecYOffset = -2.2;
  } else if (frameIndex === 2) { // stroke_down (arco côncavo)
    tailYOffset = 7.6;
    flukeTilt = 0.48;
    pecYOffset = 2.2;
  }

  // ===========================================================================
  // 1. NADADEIRA PEITORAL OPOSTA (Ao fundo - dá profundidade 3D imediata)
  // ===========================================================================
  {
    const bBaseX = offsetX + 80;
    const bBaseY = 36.5 + pecYOffset * 0.7;
    const bTipX = offsetX + 71;
    const bTipY = bBaseY + 14.0 + (frameIndex === 1 ? -2.5 : (frameIndex === 2 ? 3.0 : 0));

    drawQuadCurve(bBaseX, bBaseY, bBaseX - 3, bBaseY + 7, bTipX, bTipY, 3.8, PALETTE.pectoralBackDark);
    drawQuadCurve(bBaseX - 1, bBaseY + 1, bBaseX - 4, bBaseY + 8, bTipX + 1, bTipY, 2.5, PALETTE.pectoralBack);
    fillCircle(bTipX, bTipY, 1.3, PALETTE.bellyMid);
  }

  // ===========================================================================
  // 2. CORPO FUSIFORME VOLUMOSO DA JUBARTE (Megaptera novaeangliae)
  // ===========================================================================
  // Guardamos os limites verticais da bolsa gular para renderizar as pregas com perfeição
  const pouchBounds = [];

  for (let lx = 18; lx <= 114; lx++) {
    const currentTailY = getSpineYOffset(lx, tailYOffset);

    let topY, botY, jawY;

    if (lx > 88) {
      // CABEÇA / ROSTRO / BOLSA GULAR ANTERIOR
      const t = (lx - 88) / 26; // 0 em 88, 1 em 114

      if (isFeeding) {
        // ROSTRO SUPERIOR: achatado, típico de baleinídeo
        topY = 19.5 + t * 4.0;         // 19.5 -> 23.5 (linha reta do dorso superior)
        jawY = 23.5 + t * 2.5;         // teto do palato (interior): 23.5 -> 26.0
        // BOLSA GULAR: expansão máxima do engolfamento
        botY = 57.0 - Math.pow(t, 1.8) * 9.0; // 57.0 -> 48.0 no queixo
      } else {
        topY = 20.0 + t * 6.5; // de 20.0 a 26.5
        jawY = 28.5 - t * 0.5; // de 28.5 a 28.0
        botY = 42.0 - Math.pow(t, 1.2) * 12.5; // de 42.0 até 29.5 no queixo
      }
    } else if (lx > 50) {
      // TÓRAX, ABDÔMEN E CORCUNDA
      const t = (lx - 50) / 38; // 0 em 50, 1 em 88
      jawY = 28.5;

      let hump = 0;
      if (lx >= 50 && lx <= 66) {
        const ht = (lx - 50) / 16;
        hump = Math.sin(ht * Math.PI) * 2.8;
      }
      topY = 18.2 - hump + currentTailY;

      if (isFeeding) {
        // BOLSA GULAR: Cresce a partir de lx=54, atingindo ~57px em lx=88
        if (lx < 54) {
          botY = 34.0 + (lx - 50) * 0.5;
        } else {
          const bt = (lx - 54) / 34; // 0 em 54, 1 em 88
          botY = 36.0 + Math.pow(bt, 0.7) * 21.0; // 36 -> 57px
        }
      } else {
        const bellyFactor = Math.sin(t * Math.PI * 0.9);
        botY = 35.5 + bellyFactor * 7.5 + currentTailY;
      }
    } else {
      // PEDÚNCULO CAUDAL COM NÓDULOS DORSAIS
      const t = (lx - 18) / 32;
      jawY = 32.0;

      let knuckle = 0;
      if (lx >= 24 && lx <= 46) {
        knuckle = Math.max(0, Math.sin((lx - 24) * 0.78) * 1.2);
      }

      topY = 29.5 - t * 11.3 - knuckle + currentTailY;
      botY = 33.5 + t * 2.0 + currentTailY;
    }

    const colX = offsetX + lx;
    const colH = Math.max(1, botY - topY);

    // Salva os limites da bolsa gular
    if (lx >= 54 && lx <= 114) {
      const pTop = (isFeeding && lx >= 88)
        // Para a cabeça: o topo da bolsa começa abaixo da mandíbula
        ? (29.0 + Math.pow((lx - 88) / 25, 0.6) * 20.0 + 2.2)
        : ((lx >= 88) ? (jawY + 0.8) : (topY + (botY - topY) * 0.50));
      pouchBounds[lx] = { top: pTop, bot: botY };
    }

    for (let py = Math.floor(topY); py <= Math.ceil(botY); py++) {
      const relY = (py - topY) / colH;

      if (lx >= 88) {
        const t = (lx - 88) / 26;

        if (isFeeding) {
          const palateY = 23.5 + t * 2.5;  // teto do palato: 23.5 -> 26.0
          const jawY_f = 29.0 + Math.pow(t, 0.6) * 20.0; // mandíbula: 29.0 -> 49.0

          if (py <= Math.ceil(palateY)) {
            // MAXILA SUPERIOR (ROSTRO)
            if (py <= topY + 1.0) {
              setPixel(colX, py, PALETTE.dorsalDarkest[0], PALETTE.dorsalDarkest[1], PALETTE.dorsalDarkest[2]);
            } else if (py <= topY + 2.5) {
              setPixel(colX, py, PALETTE.dorsalLight[0], PALETTE.dorsalLight[1], PALETTE.dorsalLight[2]);
            } else if (py >= Math.ceil(palateY) - 1) {
              setPixel(colX, py, PALETTE.dorsalDarkest[0], PALETTE.dorsalDarkest[1], PALETTE.dorsalDarkest[2]);
            } else {
              setPixel(colX, py, PALETTE.dorsalDark[0], PALETTE.dorsalDark[1], PALETTE.dorsalDark[2]);
            }
          } else if (py < Math.floor(jawY_f)) {
            // CAVIDADE BUCAL (INTERIOR DA BOCA)
            const depthT = (py - palateY) / (jawY_f - palateY);
            if (depthT > 0.70) {
              setPixel(colX, py, PALETTE.mouthTongue[0], PALETTE.mouthTongue[1], PALETTE.mouthTongue[2]);
            } else {
              setPixel(colX, py, PALETTE.mouthGape[0], PALETTE.mouthGape[1], PALETTE.mouthGape[2]);
            }
          } else if (py <= Math.ceil(jawY_f) + 2) {
            // OSSO DA MANDÍBULA INFERIOR
            setPixel(colX, py, py === Math.floor(jawY_f)
              ? PALETTE.dorsalDarkest[0] : PALETTE.dorsalDark[0],
              py === Math.floor(jawY_f)
              ? PALETTE.dorsalDarkest[1] : PALETTE.dorsalDark[1],
              py === Math.floor(jawY_f)
              ? PALETTE.dorsalDarkest[2] : PALETTE.dorsalDark[2]);
          } else {
            // BOLSA GULAR INFLADA ABAIXO DA MANDÍBULA
            const jawBotY = Math.ceil(jawY_f) + 2;
            const pouchT = (py - jawBotY) / (botY - jawBotY);
            if (pouchT < 0.4) {
              setPixel(colX, py, PALETTE.bellyShade[0], PALETTE.bellyShade[1], PALETTE.bellyShade[2]);
            } else {
              setPixel(colX, py, PALETTE.bellyMid[0], PALETTE.bellyMid[1], PALETTE.bellyMid[2]);
            }
          }
        } else {
          // REGIÃO CEFÁLICA COM BOCA FECHADA
          if (py < jawY) {
            if (py <= topY + 1.2) {
              setPixel(colX, py, PALETTE.dorsalLight[0], PALETTE.dorsalLight[1], PALETTE.dorsalLight[2]);
            } else {
              setPixel(colX, py, PALETTE.dorsalDark[0], PALETTE.dorsalDark[1], PALETTE.dorsalDark[2]);
            }
          } else if (Math.abs(py - jawY) < 1.0) {
            setPixel(colX, py, PALETTE.dorsalDarkest[0], PALETTE.dorsalDarkest[1], PALETTE.dorsalDarkest[2]);
          } else {
            setPixel(colX, py, PALETTE.bellyMid[0], PALETTE.bellyMid[1], PALETTE.bellyMid[2]);
          }
        }
      } else {
        // CORPO MÉDIO E POSTERIOR
        if (relY < 0.16) {
          setPixel(colX, py, PALETTE.dorsalLight[0], PALETTE.dorsalLight[1], PALETTE.dorsalLight[2]);
        } else if (relY < 0.44) {
          setPixel(colX, py, PALETTE.dorsalDark[0], PALETTE.dorsalDark[1], PALETTE.dorsalDark[2]);
        } else if (relY < 0.56) {
          setPixel(colX, py, PALETTE.dorsalMid[0], PALETTE.dorsalMid[1], PALETTE.dorsalMid[2]);
        } else {
          // Ventre
          if (lx >= 46 && lx <= 64 && relY > 0.60 && !isFeeding) {
            setPixel(colX, py, PALETTE.bellyPatch[0], PALETTE.bellyPatch[1], PALETTE.bellyPatch[2]);
          } else if (lx > 64) {
            setPixel(colX, py, PALETTE.bellyMid[0], PALETTE.bellyMid[1], PALETTE.bellyMid[2]);
          } else {
            setPixel(colX, py, PALETTE.bellyShade[0], PALETTE.bellyShade[1], PALETTE.bellyShade[2]);
          }
        }
      }
    }
  }

  // ===========================================================================
  // 3. PREGAS GULARES / SULCOS VENTRAIS DISTRIBUÍDAS COM PRECISÃO ANATÔMICA
  // ===========================================================================
  {
    const numGrooves = isFeeding ? 11 : 7;
    for (let g = 0; g < numGrooves; g++) {
      const frac = (g + 0.5) / numGrooves;

      const startLx = isFeeding ? 113 : ((g < 2) ? 104 : ((g < 4) ? 109 : 112));
      const endLx   = isFeeding ? 54  : ((g < 2) ? 68 : 62);

      for (let lx = startLx; lx >= endLx; lx--) {
        const bounds = pouchBounds[lx];
        if (!bounds) continue;
        const gy = bounds.top + frac * (bounds.bot - bounds.top);
        const colX = offsetX + lx;
        const rowY = Math.round(gy);

        if (rowY > bounds.top && rowY < bounds.bot) {
          setPixel(colX, rowY, PALETTE.grooveDeep[0], PALETTE.grooveDeep[1], PALETTE.grooveDeep[2]);
          if (rowY - 1 > bounds.top) {
            setPixel(colX, rowY - 1, PALETTE.grooveRidge[0], PALETTE.grooveRidge[1], PALETTE.grooveRidge[2]);
          }
        }
      }
    }
  }

  // ===========================================================================
  // 4. CONTORNO DORSAL PRECISO E DESTAQUE NA CRISTA
  // ===========================================================================
  for (let lx = 18; lx <= 114; lx++) {
    const currentTailY = getSpineYOffset(lx, tailYOffset);
    let topY;
    if (lx > 88) {
      const t = (lx - 88) / 26;
      topY = isFeeding ? (19.5 + t * 4.0) : (20.0 + t * 6.5);
    } else if (lx > 50) {
      let hump = 0;
      if (lx >= 50 && lx <= 66) {
        const ht = (lx - 50) / 16;
        hump = Math.sin(ht * Math.PI) * 2.8;
      }
      topY = 18.2 - hump + currentTailY;
    } else {
      const t = (lx - 18) / 32;
      let knuckle = 0;
      if (lx >= 24 && lx <= 46) {
        knuckle = Math.max(0, Math.sin((lx - 24) * 0.78) * 1.2);
      }
      topY = 29.5 - t * 11.3 - knuckle + currentTailY;
    }
    setPixel(offsetX + lx, Math.floor(topY), PALETTE.dorsalDarkest[0], PALETTE.dorsalDarkest[1], PALETTE.dorsalDarkest[2]);
    if (lx >= 60 && lx <= 84) {
      setPixel(offsetX + lx, Math.floor(topY) + 1, PALETTE.dorsalHighlight[0], PALETTE.dorsalHighlight[1], PALETTE.dorsalHighlight[2]);
    }
  }

  // ===========================================================================
  // 5. NADADEIRA DORSAL FALCADA (Sólida, curvada sobre a corcunda a 2/3 do corpo)
  // ===========================================================================
  {
    const dX = offsetX + 53;
    const dY = 15.4 + getSpineYOffset(53, tailYOffset);
    drawLine(dX + 4.5, dY + 3.2, dX - 0.5, dY - 3.2, 2.8, PALETTE.dorsalDark);
    drawLine(dX - 0.5, dY - 3.2, dX - 4.2, dY + 3.0, 2.2, PALETTE.dorsalDarkest);
    fillCircle(dX - 1.0, dY - 1.5, 1.5, PALETTE.dorsalDark);
    setPixel(dX - 0.5, Math.round(dY - 3.2), PALETTE.dorsalLight[0], PALETTE.dorsalLight[1], PALETTE.dorsalLight[2]);
    setPixel(dX - 1.5, Math.round(dY - 2.5), PALETTE.dorsalDarkest[0], PALETTE.dorsalDarkest[1], PALETTE.dorsalDarkest[2]);
  }

  // ===========================================================================
  // 6. BOCA, BARBAS FILTRADORAS E MANDÍBULA
  // ===========================================================================
  if (isFeeding) {
    // Linha escura da mandíbula inferior em arco bem pronunciado (29 -> 49px!)
    drawQuadCurve(offsetX + 113, 49.5, offsetX + 101, 41.0, offsetX + 88, 29.0, 2.2, PALETTE.dorsalDarkest);
    drawQuadCurve(offsetX + 113, 48.0, offsetX + 101, 39.5, offsetX + 88, 29.5, 1.2, PALETTE.mouthTongue);

    // Borda do palato / maxila superior
    drawQuadCurve(offsetX + 113, 25.8, offsetX + 101, 24.8, offsetX + 88, 23.5, 1.5, PALETTE.dorsalDarkest);

    // BARBAS FILTRADORAS: pente dourado pendente do palato
    for (let b = 90; b <= 112; b++) {
      const t2 = (b - 88) / 26;
      const palY = 23.5 + t2 * 2.5;
      const midT = (b - 90) / 22;
      const hangLen = 3.5 + Math.sin(midT * Math.PI) * 8.5;

      const bx = offsetX + b;
      for (let py = Math.floor(palY + 1.2); py <= Math.floor(palY + hangLen); py++) {
        const fracDown = (py - (palY + 1.2)) / (hangLen - 1.2);
        const isTip = fracDown > 0.85;
        const isPlate = (b % 2 === 0);
        if (isTip) {
          setPixel(bx, py, PALETTE.baleenShadow[0], PALETTE.baleenShadow[1], PALETTE.baleenShadow[2]);
        } else if (isPlate) {
          setPixel(bx, py, PALETTE.baleenPlate[0], PALETTE.baleenPlate[1], PALETTE.baleenPlate[2]);
        } else {
          setPixel(bx, py, PALETTE.baleenMid[0], PALETTE.baleenMid[1], PALETTE.baleenMid[2]);
        }
      }
    }

    // Fluxo de água sendo succionada
    drawLine(offsetX + 112, 32, offsetX + 99, 34, 1.0, PALETTE.mouthStream);
    drawLine(offsetX + 115, 38, offsetX + 97, 40, 1.2, PALETTE.mouthStream);
    drawLine(offsetX + 112, 44, offsetX + 95, 41, 0.8, PALETTE.mouthStream);

    // Cardume de Krill sendo engolfado
    const krillSwarm = [
      { x: 98,  y: 36 },
      { x: 105, y: 39 },
      { x: 111, y: 35 },
      { x: 116, y: 33 },
      { x: 114, y: 41 },
    ];

    for (const kr of krillSwarm) {
      const kx = offsetX + kr.x;
      const ky = kr.y;
      fillCircle(kx, ky, 1.3, PALETTE.krillGlow);
      setPixel(kx, ky, PALETTE.krillBody[0], PALETTE.krillBody[1], PALETTE.krillBody[2]);
      setPixel(kx - 1, ky, PALETTE.krillBody[0], PALETTE.krillBody[1], PALETTE.krillBody[2]);
    }
  } else {
    drawQuadCurve(offsetX + 114, 28.5, offsetX + 103, 31.0, offsetX + 88, 28.5, 1.5, PALETTE.dorsalDarkest);
  }

  // ===========================================================================
  // 7. TUBÉRCULOS SENSORIAIS DA CABEÇA E DO QUEIXO (Megaptera)
  // ===========================================================================
  const tubercles = isFeeding ? [
    // Crista medial do rostro superior
    { x: 113,   y: 23.5, r: 1.4 },
    { x: 108,   y: 22.2, r: 1.4 },
    { x: 102,   y: 21.0, r: 1.4 },
    { x: 96,    y: 20.2, r: 1.3 },
    { x: 90,    y: 19.8, r: 1.2 },
    // Laterais do rostro
    { x: 106,   y: 24.0, r: 1.2 },
    { x: 100,   y: 23.0, r: 1.2 },
    { x: 94,    y: 22.0, r: 1.1 },
    // Queixo e mandíbula inferior REBAIXADA (em arco)
    { x: 113.0, y: 50.5, r: 1.7 }, // Grande tubérculo no queixo rebaixado
    { x: 107.0, y: 46.5, r: 1.4 },
    { x: 100.0, y: 41.5, r: 1.3 },
    { x: 93.0,  y: 35.5, r: 1.2 },
    { x: 88.0,  y: 29.5, r: 1.1 },
  ] : [
    // Crista medial do rostro (frame normal)
    { x: 113, y: 27.2, r: 1.4 },
    { x: 108, y: 24.8, r: 1.4 },
    { x: 102, y: 23.2, r: 1.4 },
    { x: 96,  y: 21.8, r: 1.3 },
    { x: 90,  y: 20.8, r: 1.2 },
    // Laterais do rostro (acima da boca)
    { x: 106, y: 27.5, r: 1.2 },
    { x: 100, y: 26.2, r: 1.2 },
    { x: 94,  y: 25.0, r: 1.1 },
    // Queixo e mandíbula inferior (proeminência clássica)
    { x: 113.5, y: 30.5, r: 1.6 },
    { x: 108,   y: 33.5, r: 1.3 },
    { x: 102,   y: 36.5, r: 1.3 },
    { x: 96,    y: 39.0, r: 1.2 },
  ];

  for (const t of tubercles) {
    fillCircle(offsetX + t.x, t.y, t.r, PALETTE.tubercleBase);
    fillCircle(offsetX + t.x - 0.3, t.y - 0.4, t.r * 0.65, PALETTE.tubercleTip);
    setPixel(offsetX + t.x - 0.4, t.y - 0.6, PALETTE.tubercleGlint[0], PALETTE.tubercleGlint[1], PALETTE.tubercleGlint[2]);
  }

  // ===========================================================================
  // 8. ESPIRÁCULO DUPLO (Com montículo splashguard)
  // ===========================================================================
  {
    const blowX = offsetX + 86;
    const blowY = 19.0;
    fillEllipse(blowX, blowY, 2.6, 1.2, PALETTE.dorsalDarkest);
    setPixel(blowX - 0.8, blowY, PALETTE.blowhole[0], PALETTE.blowhole[1], PALETTE.blowhole[2]);
    setPixel(blowX + 0.8, blowY, PALETTE.blowhole[0], PALETTE.blowhole[1], PALETTE.blowhole[2]);
    setPixel(blowX, blowY - 0.8, PALETTE.dorsalLight[0], PALETTE.dorsalLight[1], PALETTE.dorsalLight[2]);
  }

  // ===========================================================================
  // 9. OLHO COM ÓRBITA E REFLEXO AQUÁTICO
  // ===========================================================================
  {
    const eyeX = isFeeding ? offsetX + 83.5 : offsetX + 88.5;
    const eyeY = isFeeding ? 22.0 : 26.5; // No feeding, olho fica no dorso lateral acima da boca
    fillCircle(eyeX, eyeY, 2.2, PALETTE.eyeRing);
    fillCircle(eyeX, eyeY, 1.4, PALETTE.eyeDark);
    setPixel(eyeX + 0.4, eyeY - 0.4, PALETTE.eyeGlint[0], PALETTE.eyeGlint[1], PALETTE.eyeGlint[2]);
  }

  // ===========================================================================
  // 10. NADADEIRA PEITORAL GIGANTE EM FOICE (Fiel à ilustração de Daniela Weil)
  // ===========================================================================
  {
    const pBaseX = offsetX + 74;
    const pBaseY = 35.0 + pecYOffset;

    const pCtrlX = offsetX + 61;
    const pCtrlY = pBaseY + 11.5;

    const pTipX = offsetX + 42;
    const pTipY = pBaseY + 21.0 + (frameIndex === 1 ? -3.5 : (frameIndex === 2 ? 1.0 : 0));

    // Renderiza a lâmina por fatias transversais contínuas (fita preenchida)
    const ribbonSteps = 40;
    for (let i = 0; i <= ribbonSteps; i++) {
      const t = i / ribbonSteps;
      const it = 1 - t;

      const cx = it * it * pBaseX + 2 * it * t * pCtrlX + t * t * pTipX;
      const cy = it * it * pBaseY + 2 * it * t * pCtrlY + t * t * pTipY;

      const dx = 2 * (1 - t) * (pCtrlX - pBaseX) + 2 * t * (pTipX - pCtrlX);
      const dy = 2 * (1 - t) * (pCtrlY - pBaseY) + 2 * t * (pTipY - pCtrlY);
      const len = Math.hypot(dx, dy);
      const nx = -dy / (len || 1);
      const ny = dx / (len || 1);

      const halfW = 2.9 * (1 - t * 0.68) + 0.5;

      const pTopX = cx + nx * halfW;
      const pTopY = cy + ny * halfW;
      const pBotX = cx - nx * halfW;
      const pBotY = cy - ny * halfW;

      // Face ventral clara (marfim/branco)
      drawLine(pBotX, pBotY, pTopX, pTopY, 1.6, PALETTE.pectoralWhite);

      // Bordo anterior escuro integrado
      setPixel(pTopX, pTopY, PALETTE.pectoralDark[0], PALETTE.pectoralDark[1], PALETTE.pectoralDark[2]);
      setPixel(pTopX - nx * 0.5, pTopY - ny * 0.5, PALETTE.pectoralDark[0], PALETTE.pectoralDark[1], PALETTE.pectoralDark[2]);
    }

    // 5 Tubérculos da borda anterior suaves e orgânicos
    const tubFracs = [0.18, 0.36, 0.54, 0.72, 0.88];
    for (const t of tubFracs) {
      const it = 1 - t;
      const cx = it * it * pBaseX + 2 * it * t * pCtrlX + t * t * pTipX;
      const cy = it * it * pBaseY + 2 * it * t * pCtrlY + t * t * pTipY;
      const dx = 2 * (1 - t) * (pCtrlX - pBaseX) + 2 * t * (pTipX - pCtrlX);
      const dy = 2 * (1 - t) * (pCtrlY - pBaseY) + 2 * t * (pTipY - pCtrlY);
      const len = Math.hypot(dx, dy);
      const nx = -dy / (len || 1);
      const ny = dx / (len || 1);
      const halfW = 2.9 * (1 - t * 0.68) + 0.5;

      const kx = cx + nx * halfW;
      const ky = cy + ny * halfW;
      fillCircle(kx, ky, 1.2, PALETTE.pectoralDark);
      setPixel(kx - nx * 0.3, ky - ny * 0.3, PALETTE.tubercleTip[0], PALETTE.tubercleTip[1], PALETTE.tubercleTip[2]);
    }

    // Manchas/sardas escuras na face ventral
    const mottles = [
      { t: 0.28, shift: 0.0 },
      { t: 0.44, shift: -0.7 },
      { t: 0.58, shift: 0.4 },
      { t: 0.72, shift: -0.4 },
      { t: 0.84, shift: 0.2 },
    ];
    for (const m of mottles) {
      const it = 1 - m.t;
      const cx = it * it * pBaseX + 2 * it * m.t * pCtrlX + m.t * m.t * pTipX;
      const cy = it * it * pBaseY + 2 * it * m.t * pCtrlY + m.t * m.t * pTipY;
      fillCircle(cx + m.shift, cy + m.shift, 0.9, PALETTE.pectoralMottle);
    }

    fillCircle(pTipX, pTipY, 1.2, PALETTE.pectoralWhite);
  }

  // ===========================================================================
  // 11. CAUDA E FLUKES (Asas caudais amplas com bordo serrilhado e entalhe)
  // ===========================================================================
  {
    const tailX = offsetX + 18;
    const tailY = 30.5 + tailYOffset;
    const span = 15.0;
    const sweep = 11.5;

    const topX = tailX - sweep;
    const topY = tailY - span + flukeTilt * 7.5;
    const botX = tailX - sweep;
    const botY = tailY + span + flukeTilt * 7.5;

    // Lobo superior
    drawQuadCurve(tailX, tailY, tailX - 4, topY + 4, topX, topY, 3.4, PALETTE.dorsalDark);
    drawQuadCurve(tailX - 2, tailY, tailX - 6, topY + 5, topX + 2, topY + 1.5, 2.4, PALETTE.dorsalMid);

    // Lobo inferior
    drawQuadCurve(tailX, tailY, tailX - 4, botY - 4, botX, botY, 3.4, PALETTE.dorsalDark);
    drawQuadCurve(tailX - 2, tailY, tailX - 6, botY - 5, botX + 2, botY - 1.5, 2.4, PALETTE.dorsalMid);

    // Manchas claras nas pontas
    drawLine(topX + 1, topY + 1, topX + 5, topY + 4.5, 1.8, PALETTE.bellyWhite);
    drawLine(botX + 1, botY - 1, botX + 5, botY - 4.5, 1.8, PALETTE.bellyWhite);

    // Bordo serrilhado
    for (let i = 1; i <= 5; i++) {
      const frac = i / 6;
      const stX = topX + (tailX - topX) * frac - Math.sin(frac * Math.PI) * 1.3;
      const stY = topY + (tailY - topY) * frac;
      setPixel(stX - 0.5, stY, PALETTE.dorsalDarkest[0], PALETTE.dorsalDarkest[1], PALETTE.dorsalDarkest[2]);

      const sbX = botX + (tailX - botX) * frac - Math.sin(frac * Math.PI) * 1.3;
      const sbY = botY + (tailY - botY) * frac;
      setPixel(sbX - 0.5, sbY, PALETTE.dorsalDarkest[0], PALETTE.dorsalDarkest[1], PALETTE.dorsalDarkest[2]);
    }

    // Entalhe central (notch em V)
    setPixel(tailX - 0.5, tailY, 0, 0, 0, 0);
    setPixel(tailX - 1.5, tailY, 0, 0, 0, 0);
    setPixel(tailX - 2.5, tailY, 0, 0, 0, 0);
  }
}

// Renderiza os 4 frames da folha de sprites
for (let f = 0; f < 4; f++) {
  renderWhaleFrame(f);
}

// =============================================================================
// ENCODER PNG NATIVO
// =============================================================================
function createPNG(w, h, rgbaBuffer) {
  const scanlines = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    const scanlineOffset = y * (w * 4 + 1);
    scanlines[scanlineOffset] = 0;
    rgbaBuffer.copy(scanlines, scanlineOffset + 1, y * w * 4, (y + 1) * w * 4);
  }

  const deflated = zlib.deflateSync(scanlines, { level: 9 });

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(4 + 4 + len + 4);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const typeAndData = chunk.subarray(4, 8 + len);
    const crcVal = crc32(typeAndData);
    chunk.writeUInt32BE(crcVal, 8 + len);
    return chunk;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const pngData = createPNG(WIDTH, HEIGHT, buffer);
const outDir = path.join(__dirname, '../public/sprites');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outFile = path.join(outDir, 'whale.png');
fs.writeFileSync(outFile, pngData);
console.log(`Sprite autêntico da Jubarte salvo em: ${outFile} (${pngData.length} bytes)`);
