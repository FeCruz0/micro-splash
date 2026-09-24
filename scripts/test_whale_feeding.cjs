const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const WIDTH = 128;
const HEIGHT = 64;
const SCALE = 3; // 3x scaled output for inspection: 384x192

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
  let prevX = x0,
    prevY = y0;
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

const PALETTE = {
  dorsalDarkest: [30, 22, 16, 255],
  dorsalDark: [52, 40, 32, 255],
  dorsalMid: [78, 64, 52, 255],
  dorsalLight: [114, 96, 78, 255],
  dorsalHighlight: [146, 126, 104, 255],

  bellyWhite: [248, 244, 236, 255],
  bellyMid: [224, 214, 198, 255],
  bellyShade: [172, 156, 138, 255],
  bellyPatch: [252, 250, 244, 255],

  grooveDeep: [34, 24, 16, 255],
  grooveMid: [68, 52, 38, 255],
  grooveRidge: [254, 252, 246, 255],

  pectoralWhite: [250, 248, 242, 255],
  pectoralCream: [232, 226, 216, 255],
  pectoralMottle: [112, 96, 80, 255],
  pectoralDark: [38, 28, 20, 255],
  pectoralBack: [106, 90, 76, 240],
  pectoralBackDark: [54, 42, 32, 255],

  tubercleBase: [34, 24, 18, 255],
  tubercleTip: [184, 166, 146, 255],
  tubercleGlint: [240, 230, 215, 255],

  eyeRing: [64, 48, 36, 255],
  eyeDark: [14, 10, 8, 255],
  eyeGlint: [245, 250, 255, 255],
  blowhole: [22, 14, 10, 255],

  baleenPlate: [252, 242, 210, 255],
  baleenMid: [228, 210, 170, 255],
  baleenShadow: [140, 120, 85, 255],
  mouthGape: [46, 16, 22, 255],
  mouthTongue: [86, 28, 40, 255],
  mouthStream: [180, 225, 255, 140],
  krillBody: [255, 95, 60, 255],
  krillGlow: [255, 210, 150, 220],
  krillEye: [24, 14, 12, 255],
};

function renderFeedingWhale() {
  // 1. NADADEIRA PEITORAL DE FUNDO (OPOSTA)
  {
    const bBaseX = 80;
    const bBaseY = 36.5;
    const bTipX = 71;
    const bTipY = 50.5;
    drawQuadCurve(
      bBaseX,
      bBaseY,
      bBaseX - 3,
      bBaseY + 7,
      bTipX,
      bTipY,
      3.8,
      PALETTE.pectoralBackDark
    );
    drawQuadCurve(
      bBaseX - 1,
      bBaseY + 1,
      bBaseX - 4,
      bBaseY + 8,
      bTipX + 1,
      bTipY,
      2.5,
      PALETTE.pectoralBack
    );
  }

  // 2. CORPO POSTERIOR E MÉDIO (lx = 18 até 88)
  const pouchBounds = [];

  for (let lx = 18; lx <= 88; lx++) {
    let topY, botY;
    if (lx > 50) {
      // Tórax, abdômen e corcunda
      const t = (lx - 50) / 38; // 0 em 50, 1 em 88
      let hump = 0;
      if (lx >= 50 && lx <= 66) {
        const ht = (lx - 50) / 16;
        hump = Math.sin(ht * Math.PI) * 2.8;
      }
      topY = 18.2 - hump;

      // Bolsa gular em expansão máxima: cresce a partir de lx=54 até botY~56 em lx=88
      if (lx < 54) {
        botY = 34.0 + (lx - 50) * 0.5;
      } else {
        const bt = (lx - 54) / 34; // 0 em 54, 1 em 88
        // Curva sanfonada: começa em 36 e termina em 56px (borda do canvas)
        botY = 36.0 + Math.pow(bt, 0.7) * 20.0;
      }
    } else {
      // Pedúnculo caudal
      const t = (lx - 18) / 32;
      let knuckle = 0;
      if (lx >= 24 && lx <= 46) {
        knuckle = Math.max(0, Math.sin((lx - 24) * 0.78) * 1.2);
      }
      topY = 29.5 - t * 11.3 - knuckle;
      botY = 33.5 + t * 2.0;
    }

    const colH = Math.max(1, botY - topY);
    if (lx >= 54) {
      pouchBounds[lx] = { top: topY + colH * 0.5, bot: botY };
    }

    for (let py = Math.floor(topY); py <= Math.ceil(botY); py++) {
      const relY = (py - topY) / colH;
      if (relY < 0.16) {
        setPixel(lx, py, PALETTE.dorsalLight[0], PALETTE.dorsalLight[1], PALETTE.dorsalLight[2]);
      } else if (relY < 0.44) {
        setPixel(lx, py, PALETTE.dorsalDark[0], PALETTE.dorsalDark[1], PALETTE.dorsalDark[2]);
      } else if (relY < 0.56) {
        setPixel(lx, py, PALETTE.dorsalMid[0], PALETTE.dorsalMid[1], PALETTE.dorsalMid[2]);
      } else {
        if (lx > 64) {
          setPixel(lx, py, PALETTE.bellyMid[0], PALETTE.bellyMid[1], PALETTE.bellyMid[2]);
        } else {
          setPixel(lx, py, PALETTE.bellyShade[0], PALETTE.bellyShade[1], PALETTE.bellyShade[2]);
        }
      }
    }
  }

  // 3. MAXILA SUPERIOR / ROSTRO (lx = 88 até 114)
  // O dorso do rostro vai de y=19 (lx=88) até y=24 (lx=114)
  // O palato interno (teto da boca) fica logo abaixo do dorso
  for (let lx = 88; lx <= 114; lx++) {
    const t = (lx - 88) / 26; // 0..1
    const topY = 19.5 + t * 4.0; // dorso do rostro: 19.5 -> 23.5
    const palateY = 23.5 + t * 2.5; // teto do palato: 23.5 -> 26.0

    for (let py = Math.floor(topY); py <= Math.ceil(palateY); py++) {
      if (py <= topY + 1.0) {
        setPixel(
          lx,
          py,
          PALETTE.dorsalDarkest[0],
          PALETTE.dorsalDarkest[1],
          PALETTE.dorsalDarkest[2]
        );
      } else if (py <= topY + 2.5) {
        setPixel(lx, py, PALETTE.dorsalLight[0], PALETTE.dorsalLight[1], PALETTE.dorsalLight[2]);
      } else if (py >= palateY - 0.8) {
        setPixel(
          lx,
          py,
          PALETTE.dorsalDarkest[0],
          PALETTE.dorsalDarkest[1],
          PALETTE.dorsalDarkest[2]
        );
      } else {
        setPixel(lx, py, PALETTE.dorsalDark[0], PALETTE.dorsalDark[1], PALETTE.dorsalDark[2]);
      }
    }
  }

  // 4. MANDÍBULA INFERIOR + BOLSA GULAR ANTERIOR (lx = 88 até 113)
  // Articulação em (88, ~29). A mandíbula CAI dramaticamente: 29 -> 49
  for (let lx = 88; lx <= 113; lx++) {
    const t = (lx - 88) / 25; // 0..1
    // Mandíbula: articula perto da comissura e desce em arco pronunciado
    const jawY = 29.0 + Math.pow(t, 0.6) * 20.0; // 29.0 -> 49.0
    const jawBoneH = 2.0 - t * 0.3;
    const jawBotY = jawY + jawBoneH;

    // Bolsa gular: já inflada em lx=88 (bot=57), fecha no queixo em lx=113 (bot=49)
    const pouchBotY = Math.min(HEIGHT - 1, 57.0 - Math.pow(t, 1.8) * 9.0);

    pouchBounds[lx] = { top: jawBotY, bot: pouchBotY };

    // Interior da boca (língua + garganta vermelha)
    const t2 = (lx - 88) / 26;
    const palateY = 23.5 + t2 * 2.5;
    for (let py = Math.ceil(palateY + 0.5); py < Math.floor(jawY); py++) {
      const depthT = (py - palateY) / (jawY - palateY);
      if (depthT > 0.7) {
        setPixel(lx, py, PALETTE.mouthTongue[0], PALETTE.mouthTongue[1], PALETTE.mouthTongue[2]);
      } else {
        setPixel(lx, py, PALETTE.mouthGape[0], PALETTE.mouthGape[1], PALETTE.mouthGape[2]);
      }
    }

    // Osso da mandíbula inferior
    for (let py = Math.floor(jawY); py <= Math.ceil(jawBotY); py++) {
      setPixel(
        lx,
        py,
        py === Math.floor(jawY) ? PALETTE.dorsalDarkest[0] : PALETTE.dorsalDark[0],
        py === Math.floor(jawY) ? PALETTE.dorsalDarkest[1] : PALETTE.dorsalDark[1],
        py === Math.floor(jawY) ? PALETTE.dorsalDarkest[2] : PALETTE.dorsalDark[2]
      );
    }

    // Tecido elástico da bolsa gular abaixo da mandíbula
    for (let py = Math.ceil(jawBotY + 0.5); py <= Math.ceil(pouchBotY); py++) {
      const pouchT = (py - jawBotY) / (pouchBotY - jawBotY);
      if (pouchT < 0.4) {
        setPixel(lx, py, PALETTE.bellyShade[0], PALETTE.bellyShade[1], PALETTE.bellyShade[2]);
      } else {
        setPixel(lx, py, PALETTE.bellyMid[0], PALETTE.bellyMid[1], PALETTE.bellyMid[2]);
      }
    }
  }

  // 6. PREGAS GULARES (SULCOS VENTRAIS EXPANDIDOS) - do tórax até o queixo
  const numGrooves = 11;
  for (let g = 0; g < numGrooves; g++) {
    const frac = (g + 0.5) / numGrooves;
    for (let lx = 113; lx >= 54; lx--) {
      const b = pouchBounds[lx];
      if (!b) continue;
      const gy = b.top + frac * (b.bot - b.top);
      const ry = Math.round(gy);
      if (ry > b.top && ry < b.bot) {
        setPixel(lx, ry, PALETTE.grooveDeep[0], PALETTE.grooveDeep[1], PALETTE.grooveDeep[2]);
        if (ry - 1 > b.top) {
          setPixel(
            lx,
            ry - 1,
            PALETTE.grooveRidge[0],
            PALETTE.grooveRidge[1],
            PALETTE.grooveRidge[2]
          );
        }
      }
    }
  }

  // 7. BARBAS FILTRADORAS (BALEEN PLATES)
  // Cada "placa" é uma linha vertical dourada pendurada do teto da boca
  // Cobertura: lx=90 até lx=112
  for (let lx = 90; lx <= 112; lx++) {
    const t2 = (lx - 88) / 26;
    const palateY = 23.5 + t2 * 2.5; // palato mais baixo agora

    // Comprimento da barba: máximo no centro da abertura (lx~100), diminui nas bordas
    const midT = (lx - 90) / 22; // 0..1
    const hangLen = 3.5 + Math.sin(midT * Math.PI) * 8.5; // 3.5 até 12px!

    for (let py = Math.floor(palateY + 1.2); py <= Math.floor(palateY + hangLen); py++) {
      const fracDown = (py - (palateY + 1.2)) / (hangLen - 1.2);
      const isTip = fracDown > 0.85;
      const isPlate = lx % 2 === 0;

      if (isTip) {
        setPixel(lx, py, PALETTE.baleenShadow[0], PALETTE.baleenShadow[1], PALETTE.baleenShadow[2]);
      } else if (isPlate) {
        setPixel(lx, py, PALETTE.baleenPlate[0], PALETTE.baleenPlate[1], PALETTE.baleenPlate[2]);
      } else {
        setPixel(lx, py, PALETTE.baleenMid[0], PALETTE.baleenMid[1], PALETTE.baleenMid[2]);
      }
    }
  }

  // 8. CONTORNO DORSAL E CRISTA
  for (let lx = 18; lx <= 114; lx++) {
    let topY;
    if (lx > 88) {
      const t = (lx - 88) / 26;
      topY = 20.2 + Math.pow(t, 1.2) * 6.8;
    } else if (lx > 50) {
      let hump = 0;
      if (lx >= 50 && lx <= 66) {
        const ht = (lx - 50) / 16;
        hump = Math.sin(ht * Math.PI) * 2.8;
      }
      topY = 18.2 - hump;
    } else {
      const t = (lx - 18) / 32;
      let knuckle = 0;
      if (lx >= 24 && lx <= 46) {
        knuckle = Math.max(0, Math.sin((lx - 24) * 0.78) * 1.2);
      }
      topY = 29.5 - t * 11.3 - knuckle;
    }
    setPixel(
      lx,
      Math.floor(topY),
      PALETTE.dorsalDarkest[0],
      PALETTE.dorsalDarkest[1],
      PALETTE.dorsalDarkest[2]
    );
    if (lx >= 60 && lx <= 84) {
      setPixel(
        lx,
        Math.floor(topY) + 1,
        PALETTE.dorsalHighlight[0],
        PALETTE.dorsalHighlight[1],
        PALETTE.dorsalHighlight[2]
      );
    }
  }

  // 9. NADADEIRA DORSAL
  {
    const dX = 53;
    const dY = 15.4;
    drawLine(dX + 4.5, dY + 3.2, dX - 0.5, dY - 3.2, 2.8, PALETTE.dorsalDark);
    drawLine(dX - 0.5, dY - 3.2, dX - 4.2, dY + 3.0, 2.2, PALETTE.dorsalDarkest);
    fillCircle(dX - 1.0, dY - 1.5, 1.5, PALETTE.dorsalDark);
    setPixel(
      dX - 0.5,
      Math.round(dY - 3.2),
      PALETTE.dorsalLight[0],
      PALETTE.dorsalLight[1],
      PALETTE.dorsalLight[2]
    );
  }

  // 10. ESPIRÁCULO E OLHO
  {
    const blowX = 86;
    const blowY = 19.0;
    fillCircle(blowX, blowY, 1.3, PALETTE.dorsalDarkest);
    setPixel(blowX - 0.6, blowY, PALETTE.blowhole[0], PALETTE.blowhole[1], PALETTE.blowhole[2]);
    setPixel(blowX + 0.6, blowY, PALETTE.blowhole[0], PALETTE.blowhole[1], PALETTE.blowhole[2]);
    setPixel(
      blowX,
      blowY - 0.8,
      PALETTE.dorsalLight[0],
      PALETTE.dorsalLight[1],
      PALETTE.dorsalLight[2]
    );

    // Olho: na região dorso-lateral da cabeça, BEM acima da abertura da boca
    // Na Megaptera, o olho fica no terço anterior da cabeça, no flanco escuro
    const eyeX = 83.5;
    const eyeY = 22.0; // No dorso lateral, acima do palato
    fillCircle(eyeX, eyeY, 2.2, PALETTE.eyeRing);
    fillCircle(eyeX, eyeY, 1.4, PALETTE.eyeDark);
    setPixel(eyeX + 0.4, eyeY - 0.4, PALETTE.eyeGlint[0], PALETTE.eyeGlint[1], PALETTE.eyeGlint[2]);
  }

  // 11. TUBÉRCULOS SENSORIAIS
  const tubercles = [
    // Crista medial do rostro
    { x: 113.5, y: 27.2, r: 1.4 },
    { x: 108, y: 25.5, r: 1.4 },
    { x: 102, y: 23.8, r: 1.4 },
    { x: 96, y: 22.2, r: 1.3 },
    { x: 90, y: 20.8, r: 1.2 },
    // Laterais do rostro
    { x: 106, y: 27.0, r: 1.2 },
    { x: 100, y: 25.4, r: 1.2 },
    { x: 94, y: 23.8, r: 1.1 },
    // Queixo e mandíbula inferior rebaixada
    { x: 111.0, y: 46.5, r: 1.8 }, // Grande nódulo clássico do queixo
    { x: 105.0, y: 44.2, r: 1.4 },
    { x: 98.0, y: 40.5, r: 1.3 },
    { x: 92.0, y: 34.5, r: 1.2 },
  ];

  for (const t of tubercles) {
    fillCircle(t.x, t.y, t.r, PALETTE.tubercleBase);
    fillCircle(t.x - 0.3, t.y - 0.4, t.r * 0.65, PALETTE.tubercleTip);
    setPixel(
      t.x - 0.4,
      t.y - 0.6,
      PALETTE.tubercleGlint[0],
      PALETTE.tubercleGlint[1],
      PALETTE.tubercleGlint[2]
    );
  }

  // 12. NADADEIRA PEITORAL GIGANTE (Sobrepondo lateralmente a bolsa)
  {
    const pBaseX = 74;
    const pBaseY = 35.0;
    const pCtrlX = 61;
    const pCtrlY = 46.5;
    const pTipX = 42;
    const pTipY = 57.5;

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

      drawLine(pBotX, pBotY, pTopX, pTopY, 1.6, PALETTE.pectoralWhite);
      setPixel(
        pTopX,
        pTopY,
        PALETTE.pectoralDark[0],
        PALETTE.pectoralDark[1],
        PALETTE.pectoralDark[2]
      );
      setPixel(
        pTopX - nx * 0.5,
        pTopY - ny * 0.5,
        PALETTE.pectoralDark[0],
        PALETTE.pectoralDark[1],
        PALETTE.pectoralDark[2]
      );
    }

    // Tubérculos na borda da peitoral
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
      setPixel(
        kx - nx * 0.3,
        ky - ny * 0.3,
        PALETTE.tubercleTip[0],
        PALETTE.tubercleTip[1],
        PALETTE.tubercleTip[2]
      );
    }
  }

  // 13. FLUXO DE ÁGUA E CARDUME DE KRILL SENDO ENGOLFADO NA BOCA
  {
    // Correntes de sucção translúcidas DENTRO do gape da boca
    drawLine(112, 32, 99, 34, 1.0, PALETTE.mouthStream);
    drawLine(115, 38, 97, 40, 1.2, PALETTE.mouthStream);
    drawLine(112, 44, 95, 41, 0.8, PALETTE.mouthStream);

    // Krill bioluminescente — discreta mas presente
    const krills = [
      { x: 98, y: 36, r: 1.2 }, // Dentro da abertura, perto das barbas
      { x: 105, y: 39, r: 1.4 }, // Meio da cavidade oral
      { x: 111, y: 35, r: 1.3 }, // Logo antes da boca
      { x: 116, y: 33, r: 1.2 }, // Fora, sendo sugado (ligeiro)
      { x: 114, y: 40, r: 1.2 }, // Fora abaixo, sendo sugado
    ];

    for (const kr of krills) {
      fillCircle(kr.x, kr.y, kr.r, PALETTE.krillGlow);
      setPixel(kr.x, kr.y, PALETTE.krillBody[0], PALETTE.krillBody[1], PALETTE.krillBody[2]);
      setPixel(kr.x - 1, kr.y, PALETTE.krillBody[0], PALETTE.krillBody[1], PALETTE.krillBody[2]);
    }
  }

  // 14. CAUDA E FLUKES
  {
    const fBaseX = 18;
    const fBaseY = 31.5;
    fillEllipse(fBaseX - 3, fBaseY, 3.5, 2.0, PALETTE.dorsalDark);

    // Lobo superior
    drawQuadCurve(
      fBaseX - 2,
      fBaseY,
      fBaseX - 7,
      fBaseY - 6,
      fBaseX - 14,
      fBaseY - 12,
      2.4,
      PALETTE.dorsalDarkest
    );
    drawQuadCurve(
      fBaseX - 1,
      fBaseY - 1,
      fBaseX - 5,
      fBaseY - 5,
      fBaseX - 13,
      fBaseY - 11,
      1.6,
      PALETTE.dorsalLight
    );

    // Lobo inferior
    drawQuadCurve(
      fBaseX - 2,
      fBaseY,
      fBaseX - 7,
      fBaseY + 6,
      fBaseX - 14,
      fBaseY + 12,
      2.4,
      PALETTE.dorsalDarkest
    );
    drawQuadCurve(
      fBaseX - 1,
      fBaseY + 1,
      fBaseX - 5,
      fBaseY + 5,
      fBaseX - 13,
      fBaseY + 11,
      1.6,
      PALETTE.dorsalLight
    );
  }
}

renderFeedingWhale();

// Gera PNG escalado 3x para visualização nítida
function createScaledPNG(scale) {
  const sw = WIDTH * scale;
  const sh = HEIGHT * scale;
  const sbuf = Buffer.alloc(sw * sh * 4, 0);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const sidx = (y * WIDTH + x) * 4;
      const r = buffer[sidx];
      const g = buffer[sidx + 1];
      const b = buffer[sidx + 2];
      const a = buffer[sidx + 3];

      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const didx = ((y * scale + sy) * sw + (x * scale + sx)) * 4;
          sbuf[didx] = r;
          sbuf[didx + 1] = g;
          sbuf[didx + 2] = b;
          sbuf[didx + 3] = a;
        }
      }
    }
  }

  // PNG encoder
  const rowBytes = sw * 4 + 1;
  const rawData = Buffer.alloc(sh * rowBytes);
  for (let y = 0; y < sh; y++) {
    const rowStart = y * rowBytes;
    rawData[rowStart] = 0;
    sbuf.copy(rawData, rowStart + 1, y * sw * 4, (y + 1) * sw * 4);
  }

  const deflated = zlib.deflateSync(rawData);
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function makeChunk(type, data) {
    const chunk = Buffer.alloc(4 + 4 + data.length + 4);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4, 4, "ascii");
    data.copy(chunk, 8);
    const crcVal = crc32(chunk.subarray(4, 8 + data.length));
    chunk.writeUInt32BE(crcVal, 8 + data.length);
    return chunk;
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk(
      "IHDR",
      (() => {
        const b = Buffer.alloc(13);
        b.writeUInt32BE(sw, 0);
        b.writeUInt32BE(sh, 4);
        b[8] = 8;
        b[9] = 6;
        return b;
      })()
    ),
    makeChunk("IDAT", deflated),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

const previewPng = createScaledPNG(3);
fs.writeFileSync("scratch_whale_feed_preview.png", previewPng);
console.log("Preview salvo com sucesso em scratch_whale_feed_preview.png");
