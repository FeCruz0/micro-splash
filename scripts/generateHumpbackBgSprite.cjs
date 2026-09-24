const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

// =============================================================================
// GERADOR PROCEDURAL DE SPRITE DA BALEIA-JUBARTE DE FUNDO (Megaptera novaeangliae)
// 4 Frames de animação de nado | Resolução: 144x56 por frame | Total: 576x56 px
// =============================================================================

const FRAME_W = 144;
const HEIGHT = 56;
const FRAMES = 4;
const WIDTH = FRAME_W * FRAMES;

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
  const steps = Math.max(14, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.8));
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

function fillTriangle(p0, p1, p2, color) {
  const minX = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x)));
  const maxX = Math.min(WIDTH - 1, Math.ceil(Math.max(p0.x, p1.x, p2.x)));
  const minY = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y)));
  const maxY = Math.min(HEIGHT - 1, Math.ceil(Math.max(p0.y, p1.y, p2.y)));

  function sign(p, a, b) {
    return (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
  }

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const pt = { x, y };
      const d1 = sign(pt, p0, p1);
      const d2 = sign(pt, p1, p2);
      const d3 = sign(pt, p2, p0);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(hasNeg && hasPos)) {
        setPixel(x, y, color[0], color[1], color[2], color[3] ?? 255);
      }
    }
  }
}

// =============================================================================
// PALETA OCEÂNICA DA JUBARTE DE FUNDO (Megaptera novaeangliae)
// =============================================================================
const PALETTE = {
  // Dorso ardósia-azulado (profundidade aquática)
  dorsalDark: [22, 38, 58, 255], // #16263a contorno escuro e sombras
  dorsalMid: [38, 62, 88, 255], // #263e58 corpo dorsal
  dorsalHighlight: [64, 98, 134, 255], // #406286 reflexo de luz na crista

  // Ventre e garganta gular (marfim-azulado com ranhuras)
  bellyWhite: [210, 228, 244, 255], // #d2e4f4 ventre claro
  bellyMid: [160, 185, 210, 255], // #a0b9d2 tom médio gular
  grooveDeep: [16, 26, 40, 255], // #101a28 pregas gulares profundas

  // Nadadeiras peitorais longas (Megaptera)
  pectoralWhite: [230, 242, 255, 255],
  pectoralDark: [24, 40, 62, 255],
  pectoralOpposite: [18, 30, 48, 200], // nadadeira do lado de trás (3D)

  // Tubérculos da cabeça e bordo peitoral
  tubercleBase: [26, 44, 66, 255],
  tubercleTip: [140, 178, 212, 255],

  // Olho e espiráculo
  eyeDark: [10, 16, 26, 255],
  eyeGlint: [220, 240, 255, 255],
  blowhole: [14, 22, 34, 255],
};

/**
 * Ondulação da coluna vertebral da jubarte
 */
function getHumpbackSpineOffset(lx, tailOffset) {
  if (lx >= 88 || tailOffset === 0) return 0;
  const t = (88 - lx) / 68; // 0 em lx=88, 1 em lx=20
  return tailOffset * t * t * (3 - 2 * t);
}

function renderHumpbackFrame(frameIndex) {
  const offsetX = frameIndex * FRAME_W;

  let tailOffset = 0;
  let flukeTilt = 0;
  let pecOffset = 0;

  if (frameIndex === 1) {
    // Upstroke suave
    tailOffset = -4.5;
    flukeTilt = -0.35;
    pecOffset = -1.5;
  } else if (frameIndex === 2) {
    // Transição / Glide alto
    tailOffset = -1.5;
    flukeTilt = -0.12;
    pecOffset = -0.5;
  } else if (frameIndex === 3) {
    // Downstroke potente
    tailOffset = 4.8;
    flukeTilt = 0.42;
    pecOffset = 2.0;
  }

  // 1. Nadadeira peitoral oposta (fundo 3D)
  {
    const bBaseX = offsetX + 98;
    const bBaseY = 32 + pecOffset * 0.7;
    const bTipX = offsetX + 80;
    const bTipY = bBaseY + 16 + pecOffset * 1.2;

    drawQuadCurve(
      bBaseX,
      bBaseY,
      bBaseX - 5,
      bBaseY + 8,
      bTipX,
      bTipY,
      4.2,
      PALETTE.pectoralOpposite
    );
  }

  // 2. Barbatana dorsal pequena falcada sobre a corcunda dorsal (Hump)
  // Localizada entre lx ~ 52 e 64
  {
    const dorsalSpine = getHumpbackSpineOffset(58, tailOffset);
    const finBaseFront = { x: offsetX + 62, y: 17.5 + dorsalSpine };
    const finBaseRear = { x: offsetX + 52, y: 18.5 + dorsalSpine };
    const finTip = { x: offsetX + 56, y: 11.0 + dorsalSpine }; // Pequena, curva, recuada

    fillTriangle(finBaseFront, finBaseRear, finTip, PALETTE.dorsalDark);
    drawLine(finBaseFront.x, finBaseFront.y, finTip.x, finTip.y, 1.8, PALETTE.dorsalMid);
  }

  // 3. Estrutura do corpo maciço da Jubarte (perfil coluna por coluna)
  const throatBounds = [];

  for (let lx = 20; lx <= 134; lx++) {
    const spineY = getHumpbackSpineOffset(lx, tailOffset);
    const x = offsetX + lx;

    let topY = 28,
      botY = 28;

    if (lx > 105) {
      // CABEÇA / ROSTRO PLANO / QUEIXO COM TUBÉRCULOS
      const t = (lx - 105) / 29; // 0..1
      topY = 20.0 + t * 6.5; // dorso da cabeça ligeiramente descendente
      botY = 37.5 - t * 8.5; // mandíbula e queixo
    } else if (lx >= 68) {
      // TÓRAX E BOLSA GULAR (ponto mais espesso)
      const t = (lx - 68) / 37; // 0..1
      topY = 17.0 + Math.sin((1 - t) * Math.PI) * -1.5;
      botY = 38.5 + Math.sin(t * Math.PI) * 2.0;
    } else if (lx >= 48) {
      // CORCUNDA DORSAL (Hump característica da Jubarte)
      const t = (lx - 48) / 20; // 0..1
      topY = 18.0 - Math.sin(t * Math.PI) * 2.5 + spineY; // elevação da corcunda!
      botY = 36.5 + spineY;
    } else {
      // PEDÚNCULO CAUDAL ESBELTO
      const t = (lx - 20) / 28; // 0..1
      topY = 26.5 - t * 8.5 + spineY;
      botY = 29.5 + t * 7.0 + spineY;
    }

    const yStart = Math.floor(topY);
    const yEnd = Math.ceil(botY);

    if (lx >= 76 && lx <= 126) {
      throatBounds.push({ x, topY, botY });
    }

    for (let y = yStart; y <= yEnd; y++) {
      let color = PALETTE.dorsalDark;

      // Crista dorsal iluminada
      if (y === yStart && lx > 35 && lx < 115) {
        color = PALETTE.dorsalHighlight;
      } else if (y <= yStart + 2 && lx > 40) {
        color = PALETTE.dorsalMid;
      }

      // Ventre gular claro da jubarte
      if (lx >= 72 && lx <= 128 && y >= botY - 5.0) {
        color = y >= botY - 1.5 ? PALETTE.bellyWhite : PALETTE.bellyMid;
      } else if (lx < 72 && lx >= 50 && y >= botY - 2.5) {
        color = PALETTE.bellyMid;
      }

      setPixel(x, y, color[0], color[1], color[2], color[3] ?? 255);
    }
  }

  // 4. Pregas gulares (Sulcos longitudinais da garganta)
  for (let i = 0; i < throatBounds.length; i += 3) {
    const pt = throatBounds[i];
    const grooveY1 = pt.botY - 4.0;
    const grooveY2 = pt.botY - 2.0;
    setPixel(
      pt.x,
      Math.round(grooveY1),
      PALETTE.grooveDeep[0],
      PALETTE.grooveDeep[1],
      PALETTE.grooveDeep[2],
      230
    );
    setPixel(
      pt.x,
      Math.round(grooveY2),
      PALETTE.grooveDeep[0],
      PALETTE.grooveDeep[1],
      PALETTE.grooveDeep[2],
      230
    );
  }

  // 5. Tubérculos da cabeça e rostro (Sensory Knobs - Assinatura da Megaptera)
  const tuberclePoints = [
    { lx: 114, y: 22.0 },
    { lx: 120, y: 23.5 },
    { lx: 126, y: 25.0 },
    { lx: 131, y: 26.5 },
    // Queixo
    { lx: 128, y: 31.0 },
    { lx: 122, y: 33.5 },
    { lx: 116, y: 35.5 },
  ];
  tuberclePoints.forEach((tb) => {
    fillCircle(offsetX + tb.lx, tb.y, 1.2, PALETTE.tubercleTip);
    setPixel(
      offsetX + tb.lx,
      Math.round(tb.y),
      PALETTE.tubercleBase[0],
      PALETTE.tubercleBase[1],
      PALETTE.tubercleBase[2],
      255
    );
  });

  // 6. Olho e Espiráculo
  {
    const eyeX = offsetX + 112;
    const eyeY = 27;
    fillCircle(eyeX, eyeY, 1.3, PALETTE.eyeDark);
    setPixel(
      eyeX + 0.5,
      eyeY - 0.5,
      PALETTE.eyeGlint[0],
      PALETTE.eyeGlint[1],
      PALETTE.eyeGlint[2],
      255
    );

    // Duplo espiráculo no topo da cabeça
    setPixel(offsetX + 104, 19, PALETTE.blowhole[0], PALETTE.blowhole[1], PALETTE.blowhole[2], 255);
    setPixel(offsetX + 105, 19, PALETTE.blowhole[0], PALETTE.blowhole[1], PALETTE.blowhole[2], 255);
  }

  // 7. Nadadeira peitoral gigantesca em foice (Megaptera = "grandes asas")
  // Mede ~1/3 do comprimento do corpo, com bordo serrilhado e tubérculos
  {
    const pecBaseX = offsetX + 102;
    const pecBaseY = 33.5 + pecOffset;
    const pecMidX = offsetX + 88;
    const pecMidY = pecBaseY + 9 + pecOffset * 0.5;
    const pecTipX = offsetX + 72;
    const pecTipY = pecBaseY + 18 + pecOffset * 1.3;

    // Lâmina principal da nadadeira
    drawQuadCurve(
      pecBaseX,
      pecBaseY,
      pecMidX,
      pecMidY,
      pecTipX,
      pecTipY,
      4.4,
      PALETTE.pectoralDark
    );
    // Superfície ventral clara / branca
    drawQuadCurve(
      pecBaseX - 1,
      pecBaseY + 1,
      pecMidX - 1,
      pecMidY + 1,
      pecTipX + 1,
      pecTipY - 1,
      2.6,
      PALETTE.pectoralWhite
    );

    // Tubérculos no bordo anterior da nadadeira peitoral
    const pecKnobs = [
      { t: 0.25, x: pecBaseX - 4, y: pecBaseY + 4 },
      { t: 0.55, x: pecMidX - 2, y: pecMidY + 3 },
      { t: 0.85, x: pecTipX + 3, y: pecTipY - 2 },
    ];
    pecKnobs.forEach((k) => {
      fillCircle(k.x, k.y, 1.1, PALETTE.tubercleTip);
    });
  }

  // 8. Flukes caudais largos em V profundo com bordo serrilhado
  {
    const tailSpine = getHumpbackSpineOffset(20, tailOffset);
    const flukeCenterX = offsetX + 20;
    const flukeCenterY = 28.0 + tailSpine;

    const upperTip = {
      x: flukeCenterX - 14 + flukeTilt * 5,
      y: flukeCenterY - 11 + flukeTilt * 12,
    };
    const lowerTip = {
      x: flukeCenterX - 14 - flukeTilt * 5,
      y: flukeCenterY + 11 + flukeTilt * 12,
    };
    const flukeNotch = {
      x: flukeCenterX - 8,
      y: flukeCenterY + flukeTilt * 6,
    };

    // Lobos caudais amplos
    fillTriangle({ x: flukeCenterX, y: flukeCenterY }, upperTip, flukeNotch, PALETTE.dorsalDark);
    fillTriangle({ x: flukeCenterX, y: flukeCenterY }, lowerTip, flukeNotch, PALETTE.dorsalDark);

    // Manchas brancas ventrais na cauda (padrão de foto-identificação de jubarte)
    fillTriangle(
      { x: flukeCenterX - 3, y: flukeCenterY + 1 },
      lowerTip,
      flukeNotch,
      PALETTE.bellyWhite
    );
    fillCircle(flukeCenterX - 8, flukeCenterY + 3 + flukeTilt * 6, 1.5, PALETTE.dorsalDark); // mosqueado

    // Bordo de fuga serrilhado
    drawLine(flukeCenterX, flukeCenterY, upperTip.x, upperTip.y, 1.6, PALETTE.dorsalMid);
    drawLine(flukeCenterX, flukeCenterY, lowerTip.x, lowerTip.y, 1.6, PALETTE.bellyMid);
    setPixel(
      upperTip.x + 1,
      upperTip.y,
      PALETTE.tubercleTip[0],
      PALETTE.tubercleTip[1],
      PALETTE.tubercleTip[2],
      255
    );
    setPixel(
      lowerTip.x + 1,
      lowerTip.y,
      PALETTE.tubercleTip[0],
      PALETTE.tubercleTip[1],
      PALETTE.tubercleTip[2],
      255
    );
  }
}

// Renderizar todos os 4 frames
for (let f = 0; f < FRAMES; f++) {
  renderHumpbackFrame(f);
}

// =============================================================================
// ENCODER PNG NATIVO W3C
// =============================================================================
function createPNG(w, h, rgba) {
  const scanlines = Buffer.alloc(h * (w * 4 + 1));
  let destIdx = 0;
  let srcIdx = 0;

  for (let y = 0; y < h; y++) {
    scanlines[destIdx++] = 0;
    for (let x = 0; x < w; x++) {
      scanlines[destIdx++] = rgba[srcIdx++];
      scanlines[destIdx++] = rgba[srcIdx++];
      scanlines[destIdx++] = rgba[srcIdx++];
      scanlines[destIdx++] = rgba[srcIdx++];
    }
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
    chunk.write(type, 4, 4, "ascii");
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

  const ihdrChunk = makeChunk("IHDR", ihdr);
  const idatChunk = makeChunk("IDAT", deflated);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const pngData = createPNG(WIDTH, HEIGHT, buffer);
const outDir = path.join(__dirname, "../public/sprites");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outFile = path.join(outDir, "humpback_bg.png");
fs.writeFileSync(outFile, pngData);
console.log(
  `Sprite da Jubarte de Fundo salvo em: ${outFile} (${pngData.length} bytes, ${WIDTH}x${HEIGHT})`
);
