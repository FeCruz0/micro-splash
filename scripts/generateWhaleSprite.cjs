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
    buffer[idx + 3] = Math.min(255, buffer[idx + 3] + a);
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
  if (len === 0) return;
  const steps = Math.ceil(len * 2.5);
  const r = width / 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    fillCircle(px, py, r, color);
  }
}

// Paleta autêntica Megaptera novaeangliae
const PALETTE = {
  dorsalDark: [22, 32, 46, 255],       // Azul escuro quase preto ardósia
  dorsalMid: [36, 52, 72, 255],        // Azul marinho profundo
  dorsalLight: [52, 74, 102, 255],     // Destaque de luz no topo do dorso
  bellyWhite: [220, 235, 246, 255],    // Ventre esbranquiçado
  bellyMid: [165, 188, 208, 255],      // Meio tom do ventre
  bellyGroove: [90, 115, 140, 255],    // Pregas ventrais
  pectoralWhite: [242, 248, 254, 255], // Branco da nadadeira peitoral
  pectoralDark: [26, 38, 54, 255],     // Borda dorsal da nadadeira
  eyeDark: [10, 15, 22, 255],          // Olho
  eyeLight: [120, 190, 255, 255],      // Glint
  tubercle: [45, 65, 90, 255],         // Tubérculos no focinho
  tubercleTip: [75, 105, 140, 255],
  baleenPaler: [240, 230, 200, 255],   // Cerdas filtradoras
  baleenDark: [170, 150, 115, 255],
  mouthInside: [75, 28, 38, 255],
};

function renderWhaleFrame(frameIndex) {
  const offsetX = frameIndex * FRAME_W;

  let tailYOffset = 0;
  let flukeTilt = 0;
  let pecYOffset = 0;
  const isFeeding = (frameIndex === 3);

  if (frameIndex === 1) { // stroke_up
    tailYOffset = -5;
    flukeTilt = -0.35;
    pecYOffset = -2;
  } else if (frameIndex === 2) { // stroke_down
    tailYOffset = 6;
    flukeTilt = 0.4;
    pecYOffset = 2;
  }

  // Desenha o corpo fusiforme contínuo através de discos verticais interpolados
  // x vai de 18 (base da cauda) até 114 (ponta do focinho)
  for (let lx = 18; lx <= 114; lx++) {
    // Fator de posição x normalizado ao longo do corpo
    let topY, botY;
    const tailFactor = Math.max(0, (55 - lx) / 37); // mais forte na cauda
    const currentTailY = tailYOffset * tailFactor;

    if (lx > 90) {
      // Cabeça / Focinho
      const t = (lx - 90) / 24; // 0 em 90, 1 em 114
      topY = 22 + t * 8; // afunila para a ponta do focinho
      botY = isFeeding ? (35 + (1 - t) * 7) : (35 - t * 3);
    } else if (lx > 50) {
      // Tórax, abdômen e corcunda
      const t = (lx - 50) / 40;
      // Corcunda sutil no dorso da jubarte por volta de lx = 52
      const hump = Math.sin(t * Math.PI) * 2;
      topY = 19 - hump + currentTailY * 0.2;
      botY = isFeeding ? (41 + Math.sin(t * Math.PI) * 4) : (37 + Math.sin(t * Math.PI) * 1.5);
    } else {
      // Pedúnculo caudal afunilando em direção aos flukes
      const t = (lx - 18) / 32; // 0 na cauda, 1 na pélvis
      topY = 31 - t * 11 + currentTailY;
      botY = 34 + t * 4 + currentTailY;
    }

    const colX = offsetX + lx;
    const colH = botY - topY;

    for (let py = Math.floor(topY); py <= Math.ceil(botY); py++) {
      const relY = (py - topY) / colH; // 0 = topo, 1 = fundo

      if (relY < 0.22) {
        setPixel(colX, py, PALETTE.dorsalLight[0], PALETTE.dorsalLight[1], PALETTE.dorsalLight[2]);
      } else if (relY < 0.55) {
        setPixel(colX, py, PALETTE.dorsalMid[0], PALETTE.dorsalMid[1], PALETTE.dorsalMid[2]);
      } else if (relY < 0.72) {
        // Transição ventre / dorso
        setPixel(colX, py, PALETTE.bellyMid[0], PALETTE.bellyMid[1], PALETTE.bellyMid[2]);
      } else {
        // Ventre esbranquiçado
        setPixel(colX, py, PALETTE.bellyWhite[0], PALETTE.bellyWhite[1], PALETTE.bellyWhite[2]);
      }
    }
  }

  // Contorno dorsal limpo e suave
  for (let lx = 18; lx <= 114; lx++) {
    const tailFactor = Math.max(0, (55 - lx) / 37);
    const currentTailY = tailYOffset * tailFactor;
    let topY;
    if (lx > 90) {
      const t = (lx - 90) / 24;
      topY = 22 + t * 8;
    } else if (lx > 50) {
      const t = (lx - 50) / 40;
      const hump = Math.sin(t * Math.PI) * 2;
      topY = 19 - hump + currentTailY * 0.2;
    } else {
      const t = (lx - 18) / 32;
      topY = 31 - t * 11 + currentTailY;
    }
    setPixel(offsetX + lx, Math.floor(topY), PALETTE.dorsalDark[0], PALETTE.dorsalDark[1], PALETTE.dorsalDark[2]);
  }

  // Nadadeira dorsal falcada (pequena e curvada em cima da corcunda, lx: 50 a 55)
  const dX = offsetX + 51;
  const dY = 17 + tailYOffset * 0.15;
  drawLine(dX, dY + 3, dX - 5, dY - 2, 2.2, PALETTE.dorsalDark);
  drawLine(dX - 5, dY - 2, dX - 8, dY + 3, 1.8, PALETTE.dorsalMid);
  fillCircle(dX - 5, dY - 1, 1.2, PALETTE.dorsalDark);

  // Pregas ventrais (linhas suaves ao longo do ventre)
  const grooveStart = offsetX + 52;
  const grooveEnd = offsetX + 96;
  const numGrooves = isFeeding ? 6 : 4;
  for (let g = 0; g < numGrooves; g++) {
    const gy = (isFeeding ? 33 : 33) + g * (isFeeding ? 2.3 : 1.7);
    for (let gx = grooveStart; gx <= grooveEnd; gx += 2) {
      setPixel(gx, Math.round(gy + Math.sin((gx - grooveStart) * 0.08) * 0.6), PALETTE.bellyGroove[0], PALETTE.bellyGroove[1], PALETTE.bellyGroove[2]);
    }
  }

  // Boca e Cerdas (Baleen)
  if (isFeeding) {
    // Cavidade bucal aberta
    fillEllipse(offsetX + 104, 32, 7, 3.5, PALETTE.mouthInside);
    // Cerdas de baleen filtradoras (marfim)
    for (let b = 0; b < 8; b++) {
      const bx = offsetX + 99 + b * 1.3;
      const by = 29;
      drawLine(bx, by, bx + 0.5, by + 3.5, 1, PALETTE.baleenPaler);
      setPixel(bx, by + 4, PALETTE.baleenDark[0], PALETTE.baleenDark[1], PALETTE.baleenDark[2]);
    }
  } else {
    // Linha da boca fechada
    drawLine(offsetX + 114, 32, offsetX + 95, 30, 1.2, PALETTE.dorsalDark);
  }

  // Tubérculos da cabeça (folículos proeminentes da Jubarte)
  const tubercles = [
    { x: 111, y: 29 },
    { x: 106, y: 26 },
    { x: 100, y: 24.5 },
    { x: 94,  y: 23 },
    { x: 109, y: 34 },
    { x: 103, y: 35 },
    { x: 97,  y: 36 },
  ];
  for (const t of tubercles) {
    fillCircle(offsetX + t.x, t.y, 1.3, PALETTE.tubercle);
    setPixel(offsetX + t.x, t.y - 0.5, PALETTE.tubercleTip[0], PALETTE.tubercleTip[1], PALETTE.tubercleTip[2]);
  }

  // Espiráculo duplo
  fillEllipse(offsetX + 86, 21, 2.2, 1.1, PALETTE.dorsalDark);
  setPixel(offsetX + 85.5, 21, 8, 12, 18);
  setPixel(offsetX + 87, 21, 8, 12, 18);

  // Olho escuro com reflexo aquático
  fillCircle(offsetX + 93, 27.5, 2.0, PALETTE.eyeDark);
  fillCircle(offsetX + 93, 27.5, 1.2, [25, 40, 55, 255]);
  setPixel(offsetX + 93.5, 27, PALETTE.eyeLight[0], PALETTE.eyeLight[1], PALETTE.eyeLight[2]);

  // Nadadeira Peitoral Longa (Gigante, 1/3 do corpo, recortada com manchas brancas)
  const pBaseX = offsetX + 74;
  const pBaseY = 32 + pecYOffset;
  const pTipX = offsetX + 46;
  const pTipY = pBaseY + 23 + (frameIndex === 1 ? -4 : (frameIndex === 2 ? 4 : 0));

  // Lâmina principal da nadadeira
  drawLine(pBaseX, pBaseY, pTipX + 10, pTipY - 6, 4.5, PALETTE.pectoralWhite);
  drawLine(pTipX + 10, pTipY - 6, pTipX, pTipY, 3.2, PALETTE.pectoralWhite);
  // Borda dorsal escura
  drawLine(pBaseX + 1, pBaseY - 1, pTipX + 2, pTipY - 1, 1.3, PALETTE.pectoralDark);

  // Serrilhado característico na borda anterior
  for (let s = 1; s <= 4; s++) {
    const frac = s / 5;
    const sx = pBaseX - (pBaseX - pTipX) * frac;
    const sy = pBaseY + (pTipY - pBaseY) * frac;
    fillCircle(sx - 1.2, sy + 0.8, 1.3, PALETTE.pectoralWhite);
  }

  // Cauda e Flukes (Grandes, com bordo serrilhado e entalhe central)
  const tailX = offsetX + 18;
  const tailY = 32 + tailYOffset;
  const span = 14;
  const sweep = 12;

  // Lobo superior
  const topX = tailX - sweep;
  const topY = tailY - span + flukeTilt * 7;
  // Lobo inferior
  const botX = tailX - sweep;
  const botY = tailY + span + flukeTilt * 7;

  // Massa dos flukes
  drawLine(tailX, tailY, topX, topY, 3.2, PALETTE.dorsalDark);
  drawLine(tailX, tailY, botX, botY, 3.2, PALETTE.dorsalDark);
  drawLine(tailX - 4, tailY, topX + 3, topY + 3, 3.8, PALETTE.dorsalMid);
  drawLine(tailX - 4, tailY, botX + 3, botY - 3, 3.8, PALETTE.dorsalMid);
  // Mancha branca inferior típica
  drawLine(tailX - 2, tailY, topX + 4, topY + 4, 1.8, PALETTE.bellyWhite);
  drawLine(tailX - 2, tailY, botX + 4, botY - 4, 1.8, PALETTE.bellyWhite);

  // Bordo serrilhado (trailing edge)
  for (let i = 1; i <= 4; i++) {
    const frac = i / 5;
    const tyT = tailY - span * frac + flukeTilt * 3.5;
    const txT = topX + (tailX - topX) * frac;
    setPixel(txT - 1, tyT, PALETTE.dorsalDark[0], PALETTE.dorsalDark[1], PALETTE.dorsalDark[2]);

    const tyB = tailY + span * frac + flukeTilt * 3.5;
    const txB = botX + (tailX - botX) * frac;
    setPixel(txB - 1, tyB, PALETTE.dorsalDark[0], PALETTE.dorsalDark[1], PALETTE.dorsalDark[2]);
  }

  // Entalhe central (notch)
  setPixel(tailX - 1, tailY, 0, 0, 0, 0);
  setPixel(tailX - 2, tailY, 0, 0, 0, 0);
}

for (let f = 0; f < 4; f++) {
  renderWhaleFrame(f);
}

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
console.log(`Sprite aprimorado salvo em: ${outFile} (${pngData.length} bytes)`);
