const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

// =============================================================================
// GERADOR PROCEDURAL DE SPRITE DA ORCA DE FUNDO (Orcinus orca)
// 4 Frames de animação de nado | Resolução: 96x40 por frame | Total: 384x40 px
// =============================================================================

const FRAME_W = 96;
const HEIGHT = 40;
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
  const steps = Math.max(12, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.8));
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
// PALETA DE CORES DA ORCA (Orcinus orca)
// =============================================================================
const PALETTE = {
  // Dorso e flancos superiores (Preto-azeviche marinho profundo)
  dorsalDark: [14, 18, 28, 255], // #0e121c preto carvão profundo
  dorsalMid: [24, 32, 46, 255], // #18202e tom escuro médio
  dorsalHighlight: [44, 60, 84, 255], // #2c3c54 reflexo sutil na crista dorsal

  // Ventre, garganta e manchas brancas puras
  whitePure: [245, 250, 255, 255], // #f5faff branco puro com leve tom polar
  whiteShade: [200, 215, 230, 255], // #c8d7e6 sombra inferior do ventre

  // Sela dorsal cinza-ardósia (Saddle Patch)
  saddlePatch: [72, 88, 108, 235], // #48586c mancha cinza atrás da barbatana dorsal
  saddleHighlight: [92, 110, 134, 255],

  // Olho camuflado e nadadeiras
  eyeCamouflage: [8, 10, 14, 255],
  flipperOpposite: [10, 14, 22, 210], // nadadeira do lado oposto no fundo
};

/**
 * Curvatura da coluna da orca para animação de nado ágil
 */
function getOrcaSpineOffset(lx, tailOffset) {
  if (lx >= 55 || tailOffset === 0) return 0;
  const t = (55 - lx) / 45; // 0 em lx=55, 1 em lx=10
  return tailOffset * t * t;
}

function renderOrcaFrame(frameIndex) {
  const offsetX = frameIndex * FRAME_W;

  let tailOffset = 0;
  let flukeTilt = 0;

  if (frameIndex === 1) {
    // Upstroke
    tailOffset = -3.2;
    flukeTilt = -0.32;
  } else if (frameIndex === 2) {
    // Glide / Transição
    tailOffset = -0.8;
    flukeTilt = -0.08;
  } else if (frameIndex === 3) {
    // Downstroke propulsivo
    tailOffset = 3.6;
    flukeTilt = 0.38;
  }

  // 1. Nadadeira peitoral do lado oposto (profundidade 3D)
  {
    const pecBackBaseX = offsetX + 57;
    const pecBackBaseY = 23;
    const pecBackTipX = offsetX + 50;
    const pecBackTipY = 31;
    drawQuadCurve(
      pecBackBaseX,
      pecBackBaseY,
      pecBackBaseX - 3,
      pecBackBaseY + 5,
      pecBackTipX,
      pecBackTipY,
      3.2,
      PALETTE.flipperOpposite
    );
  }

  // 2. Barbatana dorsal alta e ereta (Assinatura da Orca)
  // Localizada entre lx ~ 43 e lx ~ 53
  {
    const finBaseFront = { x: offsetX + 52, y: 15 };
    const finBaseRear = { x: offsetX + 42, y: 16 };
    const finTip = { x: offsetX + 46, y: 4.5 }; // Alta, ereta, quase 12px de altura!

    fillTriangle(finBaseFront, finBaseRear, finTip, PALETTE.dorsalDark);
    drawLine(finBaseFront.x, finBaseFront.y, finTip.x, finTip.y, 1.8, PALETTE.dorsalMid);
    // Leve curvatura e borda falcada posterior
    drawLine(finTip.x, finTip.y, finBaseRear.x, finBaseRear.y, 1.4, PALETTE.dorsalDark);
  }

  // 3. Sela cinza-ardósia (Saddle Patch) logo atrás da barbatana dorsal
  {
    const saddleX = offsetX + 38;
    const saddleY = 16.5;
    fillEllipse(saddleX, saddleY, 5.5, 2.8, PALETTE.saddlePatch);
    fillEllipse(saddleX + 1, saddleY - 0.5, 3.2, 1.5, PALETTE.saddleHighlight);
  }

  // 4. Construção do corpo fusiforme hidrodinâmico (perfil vertical por coluna x)
  for (let lx = 14; lx <= 86; lx++) {
    const spineY = getOrcaSpineOffset(lx, tailOffset);
    const x = offsetX + lx;

    let topY = 20,
      botY = 20;

    if (lx > 72) {
      // Cabeça arredondada / melon (focinho compacto)
      const t = (lx - 72) / 14; // 0..1
      topY = 15.5 + t * 4.5;
      botY = 25.0 - t * 4.0;
    } else if (lx >= 42) {
      // Tórax e abdômen (área mais ampla)
      const t = (lx - 42) / 30; // 0..1
      topY = 14.0 + Math.sin((1 - t) * Math.PI) * -1.5;
      botY = 26.5 + Math.sin(t * Math.PI) * 1.5;
    } else {
      // Pedúnculo caudal esguio
      const t = (lx - 14) / 28; // 0..1
      topY = 19.5 - t * 5.0 + spineY;
      botY = 21.5 + t * 5.0 + spineY;
    }

    // Preenchimento vertical da coluna do corpo
    const yStart = Math.floor(topY);
    const yEnd = Math.ceil(botY);

    for (let y = yStart; y <= yEnd; y++) {
      // Determinação de cor anatômica: Preto dorsal vs Branco ventral / Flancos
      let color = PALETTE.dorsalDark;

      // Crista dorsal com leve highlight de iluminação marinha
      if (y === yStart && lx > 24 && lx < 75) {
        color = PALETTE.dorsalHighlight;
      } else if (y <= yStart + 2 && lx > 30) {
        color = PALETTE.dorsalMid;
      }

      // Ventre branco da orca:
      // - Garganta e queixo (lx 66 a 84, no terço inferior)
      // - Ventre central (lx 44 a 66, linha inferior)
      // - Mancha lateral/flanco (Flank Patch) que sobe suavemente entre lx 25 e 38
      const isChinWhite = lx >= 68 && lx <= 84 && y >= botY - 3.5;
      const isBellyWhite = lx >= 44 && lx < 68 && y >= botY - 3.0;
      const isFlankPatch = lx >= 26 && lx <= 38 && y >= botY - 4.5 && y <= botY - 0.5;

      if (isChinWhite || isBellyWhite || isFlankPatch) {
        color = y >= botY - 1 ? PALETTE.whiteShade : PALETTE.whitePure;
      }

      setPixel(x, y, color[0], color[1], color[2], color[3] ?? 255);
    }
  }

  // 5. Mancha ocular oval branca conspícua (Eye patch / Post-ocular patch)
  // Assinatura visual indispensável: oval branco inclinado logo acima/atrás da boca
  {
    const eyePatchX = offsetX + 72;
    const eyePatchY = 17.5;
    fillEllipse(eyePatchX, eyePatchY, 3.8, 2.0, PALETTE.whitePure);
    // Olho camuflado minúsculo na frente da mancha na área escura
    setPixel(
      offsetX + 77,
      19,
      PALETTE.eyeCamouflage[0],
      PALETTE.eyeCamouflage[1],
      PALETTE.eyeCamouflage[2],
      255
    );
  }

  // 6. Nadadeira peitoral frontal em formato de remo (Paddle-shaped flipper)
  {
    const pecBaseX = offsetX + 61;
    const pecBaseY = 24.5;
    const pecTipX = offsetX + 52;
    const pecTipY = 33.5;

    drawQuadCurve(
      pecBaseX,
      pecBaseY,
      pecBaseX - 3,
      pecBaseY + 6,
      pecTipX,
      pecTipY,
      3.8,
      PALETTE.dorsalDark
    );
    drawQuadCurve(
      pecBaseX - 1,
      pecBaseY + 1,
      pecBaseX - 4,
      pecBaseY + 6,
      pecTipX + 1,
      pecTipY - 1,
      2.4,
      PALETTE.dorsalMid
    );
  }

  // 7. Flukes caudais (Cauda recortada com chanfro central)
  {
    const tailSpine = getOrcaSpineOffset(14, tailOffset);
    const flukeCenterX = offsetX + 14;
    const flukeCenterY = 20.5 + tailSpine;

    const upperTip = {
      x: flukeCenterX - 8 + flukeTilt * 4,
      y: flukeCenterY - 7 + flukeTilt * 8,
    };
    const lowerTip = {
      x: flukeCenterX - 8 - flukeTilt * 4,
      y: flukeCenterY + 7 + flukeTilt * 8,
    };
    const flukeNotch = {
      x: flukeCenterX - 5,
      y: flukeCenterY + flukeTilt * 4,
    };

    // Lobo superior da cauda
    fillTriangle({ x: flukeCenterX, y: flukeCenterY }, upperTip, flukeNotch, PALETTE.dorsalDark);
    // Lobo inferior da cauda (com ventre branco visível na base)
    fillTriangle({ x: flukeCenterX, y: flukeCenterY }, lowerTip, flukeNotch, PALETTE.dorsalDark);
    fillTriangle(
      { x: flukeCenterX - 2, y: flukeCenterY + 1 },
      lowerTip,
      flukeNotch,
      PALETTE.whitePure
    );

    // Contorno suave dos bordos
    drawLine(flukeCenterX, flukeCenterY, upperTip.x, upperTip.y, 1.4, PALETTE.dorsalMid);
    drawLine(flukeCenterX, flukeCenterY, lowerTip.x, lowerTip.y, 1.4, PALETTE.whiteShade);
  }
}

// Renderizar todos os 4 frames
for (let f = 0; f < FRAMES; f++) {
  renderOrcaFrame(f);
}

// =============================================================================
// ENCODER PNG NATIVO W3C (Idêntico a generateWhaleSprite.cjs)
// =============================================================================
function createPNG(w, h, rgba) {
  const scanlines = Buffer.alloc(h * (w * 4 + 1));
  let destIdx = 0;
  let srcIdx = 0;

  for (let y = 0; y < h; y++) {
    scanlines[destIdx++] = 0; // Filter: None
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
const outFile = path.join(outDir, "orca_bg.png");
fs.writeFileSync(outFile, pngData);
console.log(
  `Sprite da Orca de Fundo salvo em: ${outFile} (${pngData.length} bytes, ${WIDTH}x${HEIGHT})`
);
