const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

// =============================================================================
// GERADOR PROCEDURAL DE SPRITE DO CACHALOTE ABISSAL (Physeter macrocephalus)
// 4 Frames de animação de nado abissal | Resolução: 192x64 por frame | Total: 768x64 px
// =============================================================================

const FRAME_W = 192;
const HEIGHT = 64;
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
// PALETA ABISSAL DO CACHALOTE (Physeter macrocephalus)
// =============================================================================
const PALETTE = {
  // Corpo ardósia / cinza-chumbo abissal profundo
  dorsalDark: [16, 26, 42, 255], // #101a2a contorno abissal
  dorsalMid: [28, 44, 68, 255], // #1c2c44 corpo chumbo
  dorsalHighlight: [48, 72, 104, 255], // #304868 reflexo dorsal
  skinRipple: [22, 34, 54, 255], // rugosidade e estrias da pele

  // Mandíbula estreita e manchas brancas labiais
  jawWhite: [215, 230, 245, 255], // mancha branca característica ao redor da boca
  jawDark: [12, 18, 30, 255], // interior da boca estreita

  // Olho adaptado à penumbra abissal
  eyeGlow: [70, 190, 240, 255],
  eyeCenter: [10, 16, 26, 255],

  // Espiráculo frontal esquerdo
  blowhole: [10, 16, 24, 255],

  // Nadadeira oposta ao fundo
  flipperOpposite: [14, 22, 36, 200],
};

function getCachaloteSpineOffset(lx, tailOffset) {
  if (lx >= 115 || tailOffset === 0) return 0;
  const t = (115 - lx) / 95; // 0 em lx=115, 1 em lx=20
  return tailOffset * t * t * (3 - 2 * t);
}

function renderCachaloteFrame(frameIndex) {
  const offsetX = frameIndex * FRAME_W;

  let tailOffset = 0;
  let flukeTilt = 0;
  let pecOffset = 0;

  if (frameIndex === 1) {
    // Upstroke lento abissal
    tailOffset = -5.0;
    flukeTilt = -0.36;
    pecOffset = -1.2;
  } else if (frameIndex === 2) {
    // Glide neutro profundo
    tailOffset = -1.5;
    flukeTilt = -0.1;
    pecOffset = -0.4;
  } else if (frameIndex === 3) {
    // Downstroke potente de mergulho
    tailOffset = 5.2;
    flukeTilt = 0.4;
    pecOffset = 1.6;
  }

  // 1. Nadadeira peitoral do lado oposto (fundo 3D)
  {
    const bBaseX = offsetX + 130;
    const bBaseY = 44 + pecOffset * 0.7;
    const bTipX = offsetX + 112;
    const bTipY = bBaseY + 13 + pecOffset * 1.1;

    drawQuadCurve(
      bBaseX,
      bBaseY,
      bBaseX - 5,
      bBaseY + 7,
      bTipX,
      bTipY,
      5.2,
      PALETTE.flipperOpposite
    );
  }

  // 2. Corcunda dorsal triangular e cristas dorsais caudais (Knuckles)
  // No cachalote não há barbatana verdadeira, mas sim uma elevação seguida de nós
  {
    const humpSpine = getCachaloteSpineOffset(74, tailOffset);
    const humpBaseFront = { x: offsetX + 88, y: 11.5 + humpSpine };
    const humpBaseRear = { x: offsetX + 64, y: 13.0 + humpSpine };
    const humpTip = { x: offsetX + 74, y: 5.5 + humpSpine }; // corcunda proeminente

    fillTriangle(humpBaseFront, humpBaseRear, humpTip, PALETTE.dorsalDark);
    drawLine(humpBaseFront.x, humpBaseFront.y, humpTip.x, humpTip.y, 2.2, PALETTE.dorsalMid);

    // Nós / cristas no pedúnculo dorsal (Knuckles: 3 calosidades típicas)
    const knuckles = [54, 44, 34];
    knuckles.forEach((kx) => {
      const sp = getCachaloteSpineOffset(kx, tailOffset);
      fillCircle(offsetX + kx, 16.5 + sp, 2.6, PALETTE.dorsalMid);
      setPixel(
        offsetX + kx,
        Math.round(15.0 + sp),
        PALETTE.dorsalHighlight[0],
        PALETTE.dorsalHighlight[1],
        PALETTE.dorsalHighlight[2],
        255
      );
    });
  }

  // 3. Estrutura do corpo monumental do Cachalote (coluna por coluna)
  for (let lx = 18; lx <= 184; lx++) {
    const spineY = getCachaloteSpineOffset(lx, tailOffset);
    const x = offsetX + lx;

    let topY = 32,
      botY = 32;

    if (lx > 126) {
      // CABEÇA QUADRADA MONUMENTAL (Órgão do espermacete, 1/3 do comprimento total)
      const t = (lx - 126) / 58; // 0..1
      // Frente massiva, profunda e quadrada
      topY = 10.0 - Math.sin(t * Math.PI * 0.5) * 1.5;
      botY = 52.5 + Math.sin(t * Math.PI * 0.5) * 1.0;
      if (lx > 178) {
        // Ponta frontal arredondada em bloco sólido
        const bluntT = (lx - 178) / 6;
        topY += bluntT * 5.0;
        botY -= bluntT * 5.5;
      }
    } else if (lx >= 82) {
      // TRONCO CILÍNDRICO MASSIVO
      const t = (lx - 82) / 44; // 0..1
      topY = 9.5 + Math.sin((1 - t) * Math.PI) * -1.5;
      botY = 53.5 + Math.sin(t * Math.PI) * 1.5;
    } else {
      // PEDÚNCULO CAUDAL ROBUSTO
      const t = (lx - 18) / 64; // 0..1
      topY = 25.5 - t * 16.0 + spineY;
      botY = 38.5 + t * 15.0 + spineY;
    }

    const yStart = Math.floor(topY);
    const yEnd = Math.ceil(botY);

    for (let y = yStart; y <= yEnd; y++) {
      let color = PALETTE.dorsalDark;

      // Crista superior iluminada
      if (y === yStart && lx > 40 && lx < 176) {
        color = PALETTE.dorsalHighlight;
      } else if (y <= yStart + 3 && lx > 45) {
        color = PALETTE.dorsalMid;
      }

      // Pele ondulada com ranhuras verticais características
      if (lx > 55 && lx < 145 && (lx % 6 === 0 || lx % 10 === 0)) {
        if (y > yStart + 5 && y < botY - 5) {
          color = PALETTE.skinRipple;
        }
      }

      setPixel(x, y, color[0], color[1], color[2], color[3] ?? 255);
    }
  }

  // 4. Mandíbula inferior delgada recuada e manchas brancas labiais
  // No cachalote a mandíbula inferior é extremamente estreita e recuada sob o nariz quadrado gigante
  {
    const jawBaseX = offsetX + 134;
    const jawTipX = offsetX + 174;
    const jawY = 53.5;

    // Mancha esbranquiçada ao redor da boca
    fillEllipse(jawBaseX + 18, jawY - 1, 18, 3.2, PALETTE.jawWhite);

    // Mandíbula delgada inferior
    drawLine(jawBaseX, jawY, jawTipX, jawY - 2.0, 3.2, PALETTE.jawDark);
    drawLine(jawBaseX, jawY + 1, jawTipX, jawY - 0.8, 1.8, PALETTE.jawWhite);
  }

  // 5. Olho adaptado às profundezas abissais (atrás da comissura bucal)
  {
    const eyeX = offsetX + 134;
    const eyeY = 38.0;
    fillCircle(eyeX, eyeY, 2.2, PALETTE.eyeGlow);
    fillCircle(eyeX, eyeY, 1.2, PALETTE.eyeCenter);
  }

  // 6. Espiráculo único assimétrico na ponta frontal superior esquerda
  {
    setPixel(offsetX + 178, 12, PALETTE.blowhole[0], PALETTE.blowhole[1], PALETTE.blowhole[2], 255);
    setPixel(offsetX + 179, 12, PALETTE.blowhole[0], PALETTE.blowhole[1], PALETTE.blowhole[2], 255);
    setPixel(offsetX + 178, 13, PALETTE.blowhole[0], PALETTE.blowhole[1], PALETTE.blowhole[2], 255);
  }

  // 7. Nadadeira peitoral frontal curta em forma de pá / remo
  {
    const pecBaseX = offsetX + 130;
    const pecBaseY = 46.0 + pecOffset;
    const pecTipX = offsetX + 114;
    const pecTipY = pecBaseY + 14 + pecOffset * 1.2;

    drawQuadCurve(
      pecBaseX,
      pecBaseY,
      pecBaseX - 5,
      pecBaseY + 8,
      pecTipX,
      pecTipY,
      5.6,
      PALETTE.dorsalDark
    );
    drawQuadCurve(
      pecBaseX - 1,
      pecBaseY + 1,
      pecBaseX - 5,
      pecBaseY + 8,
      pecTipX + 1,
      pecTipY - 1,
      3.4,
      PALETTE.dorsalMid
    );
  }

  // 8. Lobos caudais colossais triangulares (Flukes do Cachalote)
  {
    const tailSpine = getCachaloteSpineOffset(18, tailOffset);
    const flukeCenterX = offsetX + 18;
    const flukeCenterY = 32.0 + tailSpine;

    const upperTip = {
      x: flukeCenterX - 18 + flukeTilt * 6,
      y: flukeCenterY - 20 + flukeTilt * 14,
    };
    const lowerTip = {
      x: flukeCenterX - 18 - flukeTilt * 6,
      y: flukeCenterY + 20 + flukeTilt * 14,
    };
    const flukeNotch = {
      x: flukeCenterX - 8,
      y: flukeCenterY + flukeTilt * 7,
    };

    // Lobos caudais retos e largos
    fillTriangle({ x: flukeCenterX, y: flukeCenterY }, upperTip, flukeNotch, PALETTE.dorsalDark);
    fillTriangle({ x: flukeCenterX, y: flukeCenterY }, lowerTip, flukeNotch, PALETTE.dorsalDark);

    // Contorno dorsal dos flukes
    drawLine(flukeCenterX, flukeCenterY, upperTip.x, upperTip.y, 2.4, PALETTE.dorsalMid);
    drawLine(flukeCenterX, flukeCenterY, lowerTip.x, lowerTip.y, 2.4, PALETTE.dorsalMid);
  }
}

// Renderizar todos os 4 frames
for (let f = 0; f < FRAMES; f++) {
  renderCachaloteFrame(f);
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
const outFile = path.join(outDir, "cachalote_bg.png");
fs.writeFileSync(outFile, pngData);
console.log(
  `Sprite do Cachalote Abissal salvo em: ${outFile} (${pngData.length} bytes, ${WIDTH}x${HEIGHT})`
);
