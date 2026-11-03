const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

/**
 * Codifica buffer RGBA em arquivo PNG compatível com especificação W3C.
 */
function encodePng(width, height, rgbaBuffer) {
  const lineStride = width * 4;
  const rawData = Buffer.alloc(height * (lineStride + 1));

  for (let y = 0; y < height; y++) {
    const rawOffset = y * (lineStride + 1);
    rawData[rawOffset] = 0; // Filter None
    rgbaBuffer.copy(rawData, rawOffset + 1, y * lineStride, (y + 1) * lineStride);
  }

  const compressedData = zlib.deflateSync(rawData);

  // Assinatura PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // Chunk IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = createChunk("IHDR", ihdr);
  const idatChunk = createChunk("IDAT", compressedData);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, "ascii");
  data.copy(buf, 8);

  const crcTarget = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = crc32(crcTarget);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// Tabela e cálculo rápido de CRC32
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
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

// Fonte bitmap 5x7 simples para caracteres alfanuméricos e pontuação
const FONT_5X7 = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1c, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1c],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x11, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0e, 0x11, 0x10, 0x0e, 0x01, 0x11, 0x0e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  0: [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  1: [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  2: [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  3: [0x1f, 0x02, 0x04, 0x06, 0x01, 0x11, 0x0e],
  4: [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  5: [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  6: [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  7: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  8: [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  9: [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  "-": [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x06, 0x06],
  ":": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  ">": [0x10, 0x08, 0x04, 0x02, 0x04, 0x08, 0x10],
  "+": [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
};

function renderOgImageBuffer(width = 1200, height = 630) {
  const buf = Buffer.alloc(width * height * 4, 0);

  function setPixel(x, y, r, g, b, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= width || y < 0 || y >= height || a <= 0) return;
    const idx = (y * width + x) * 4;
    const alpha = a / 255;
    const inv = 1 - alpha;
    buf[idx] = Math.round(r * alpha + buf[idx] * inv);
    buf[idx + 1] = Math.round(g * alpha + buf[idx + 1] * inv);
    buf[idx + 2] = Math.round(b * alpha + buf[idx + 2] * inv);
    buf[idx + 3] = Math.min(255, Math.round(buf[idx + 3] * inv + a));
  }

  function fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        setPixel(px, py, r, g, b, a);
      }
    }
  }

  function drawText(text, startX, startY, scale, r, g, b, a = 255) {
    const upper = text.toUpperCase();
    let curX = startX;
    for (let i = 0; i < upper.length; i++) {
      const char = upper[i];
      const glyph = FONT_5X7[char] || FONT_5X7[" "];
      for (let row = 0; row < 7; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 5; col++) {
          if ((bits >> (4 - col)) & 1) {
            fillRect(curX + col * scale, startY + row * scale, scale, scale, r, g, b, a);
          }
        }
      }
      curX += 6 * scale;
    }
    return curX;
  }

  // 1. Fundo Gradiente Oceânico (Azul Abissal a Azul Profundo)
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const r = Math.round(4 + (12 - 4) * t);
    const g = Math.round(14 + (38 - 14) * t);
    const b = Math.round(35 + (92 - 35) * t);
    for (let x = 0; x < width; x++) {
      setPixel(x, y, r, g, b, 255);
    }
  }

  // 2. Feixes de Luz Solar entrando da superfície (Sun Rays)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const ray = Math.sin(x * 0.012 + y * 0.004) * Math.cos(x * 0.008 - y * 0.006);
      if (ray > 0.45 && y < 380) {
        const rayAlpha = Math.round((1 - y / 380) * (ray - 0.45) * 70);
        setPixel(x, y, 90, 200, 255, rayAlpha);
      }
    }
  }

  // 3. Superfície do Mar e Ondulações na Borda Superior
  for (let x = 0; x < width; x++) {
    const surfaceWave = Math.sin((x / 120) * Math.PI) * 6 + Math.cos((x / 75) * Math.PI) * 4;
    const surfY = 32 + surfaceWave;
    for (let y = 0; y < surfY; y++) {
      setPixel(x, y, 5, 25, 55, 255);
    }
    setPixel(x, surfY, 56, 189, 248, 200);
    setPixel(x, surfY + 1, 14, 116, 144, 150);
  }

  // 4. Círculos de Sonar e Echolocalização em Segundo Plano
  const sonarCenterX = 850;
  const sonarCenterY = 320;
  const rings = [100, 180, 270, 370];
  rings.forEach((rad) => {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.005) {
      const sx = sonarCenterX + Math.cos(angle) * rad;
      const sy = sonarCenterY + Math.sin(angle) * rad * 0.7;
      setPixel(sx, sy, 56, 189, 248, 22);
    }
  });

  // 5. Partículas de Krill / Bioluminescência
  const seed = 12345;
  for (let i = 0; i < 90; i++) {
    const px = ((i * 127 + seed) % (width - 40)) + 20;
    const py = ((i * 311 + seed * 2) % (height - 80)) + 40;
    const sz = (i % 3) + 1;
    const alpha = i % 2 === 0 ? 140 : 210;
    fillRect(px, py, sz, sz, 100, 240, 255, alpha);
  }

  // 6. Silhueta Estilizada da Baleia-Jubarte (Humpback Whale) no Lado Direito
  // Corpo principal aerodinâmico
  const whaleX = 640;
  const whaleY = 270;
  for (let dx = -180; dx <= 240; dx++) {
    // Perfil dorsal e ventral da jubarte
    const relX = dx / 200; // -0.9 a 1.2
    if (relX < -0.9 || relX > 1.2) continue;

    // Espessura do corpo modelada por curvas polinomiais suaves
    const topCurve = Math.sin(((relX + 0.9) / 2.1) * Math.PI) * 55;
    const bottomCurve = Math.sin(((relX + 0.9) / 2.1) * Math.PI) * 45;

    const dorsalFin = dx > 40 && dx < 90 ? Math.sin(((dx - 40) / 50) * Math.PI) * 22 : 0;

    const yStart = whaleY - topCurve - dorsalFin;
    const yEnd = whaleY + bottomCurve;

    for (let py = Math.floor(yStart); py <= Math.ceil(yEnd); py++) {
      const px = whaleX + dx;
      // Destaque de luz ciano no dorso
      if (py - yStart < 4) {
        setPixel(px, py, 100, 240, 255, 230);
      } else if (py - yStart < 9) {
        setPixel(px, py, 45, 150, 215, 240);
      } else {
        // Corpo azul-escuro marinho
        setPixel(px, py, 14, 42, 85, 250);
      }
    }
  }

  // Cauda e Flukes da Jubarte
  const tailBaseX = whaleX + 225;
  const tailBaseY = whaleY;
  for (let f = -55; f <= 55; f++) {
    const fx = tailBaseX + 45 - Math.abs(f) * 0.45;
    const fy = tailBaseY + f;
    fillRect(fx, fy, 8, 3, 56, 189, 248, 220);
    fillRect(fx - 15, fy, 15, 2, 14, 42, 85, 240);
  }

  // Nadadeira Peitoral Longa (Megaptera)
  for (let fin = 0; fin < 130; fin++) {
    const finX = whaleX - 40 + fin * 0.65;
    const finY = whaleY + 25 + fin * 0.85;
    fillRect(finX, finY, 14, 8, 20, 65, 125, 240);
    setPixel(finX, finY + 8, 100, 240, 255, 190); // Borda branca/ciano
  }

  // Rastro de Bolhas da Cauda
  for (let b = 0; b < 24; b++) {
    const bx = tailBaseX + 60 + b * 9;
    const by = tailBaseY + ((b * 17) % 50) - 25;
    const bsz = (b % 4) + 2;
    fillRect(bx, by, bsz, bsz, 200, 245, 255, 160);
  }

  // 7. Borda Decorativa com Gradiente Ciano no Card Social
  for (let x = 0; x < width; x++) {
    fillRect(x, 0, 1, 4, 56, 189, 248, 255);
    fillRect(x, height - 4, 1, 4, 14, 116, 144, 255);
  }
  for (let y = 0; y < height; y++) {
    fillRect(0, y, 4, 1, 56, 189, 248, 255);
    fillRect(width - 4, y, 4, 1, 14, 116, 144, 255);
  }

  // 8. Textos e Tipografia
  // Badge Superior
  fillRect(80, 85, 410, 36, 10, 45, 95, 220);
  for (let bx = 80; bx < 490; bx++) {
    setPixel(bx, 85, 56, 189, 248, 180);
    setPixel(bx, 120, 56, 189, 248, 180);
  }
  drawText("JOGO EDUCATIVO DE CONSERVACAO MARINHA", 95, 98, 2, 100, 240, 255, 255);

  // Título Principal "MICRO SPLASH"
  // Sombra suave do título
  drawText("MICRO SPLASH", 83, 163, 10, 5, 20, 45, 180);
  // Título em ciano/dourado brilhante
  drawText("MICRO SPLASH", 80, 160, 10, 255, 230, 90, 255);

  // Subtítulo
  drawText("A JORNADA DA BALEIA-JUBARTE", 82, 260, 4, 220, 245, 255, 255);

  // Rota Migratória
  drawText("ANTARTICA  >>>  ARRAIAL DO CABO, RJ", 82, 310, 3, 56, 189, 248, 255);

  // Linha divisória
  fillRect(80, 350, 480, 2, 56, 189, 248, 120);

  // Pilares Educativos
  drawText("- ROTA MIGRATORIA REAL DE 4.000 KM", 82, 375, 2, 180, 215, 245, 240);
  drawText("- BIOACUSTICA & CANTO DA JUBARTE", 82, 405, 2, 180, 215, 245, 240);
  drawText("- FISICA OCEÂNICA, RESSURGENCIA & ECOSSISTEMAS", 82, 435, 2, 180, 215, 245, 240);
  drawText("- CONSCIENTIZACAO SOBRE REDES FANTASMA E PLASTICO", 82, 465, 2, 180, 215, 245, 240);

  // Badges Inferiores
  const badges = [
    { text: "PWA OFFLINE", x: 80, w: 140 },
    { text: "WCAG 2.1 AA", x: 235, w: 140 },
    { text: "LGPD COMPLIANT", x: 390, w: 165 },
    { text: "100% GRATUITO", x: 570, w: 150 },
  ];

  badges.forEach((b) => {
    fillRect(b.x, 520, b.w, 36, 12, 50, 100, 220);
    // Borda do badge
    for (let px = b.x; px < b.x + b.w; px++) {
      setPixel(px, 520, 56, 189, 248, 120);
      setPixel(px, 555, 56, 189, 248, 120);
    }
    for (let py = 520; py <= 555; py++) {
      setPixel(b.x, py, 56, 189, 248, 120);
      setPixel(b.x + b.w - 1, py, 56, 189, 248, 120);
    }
    drawText(b.text, b.x + 12, 532, 2, 255, 255, 255, 255);
  });

  return buf;
}

function generateOgImage() {
  console.log("🌊 Gerando imagem de preview social (og-image.png, 1200x630)...");
  const width = 1200;
  const height = 630;
  const rgbaBuffer = renderOgImageBuffer(width, height);
  const pngBuffer = encodePng(width, height, rgbaBuffer);

  const outDir = path.join(__dirname, "../public");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, "og-image.png");
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`✅ og-image.png gerado com sucesso em: ${outPath} (${pngBuffer.length} bytes)`);
}

generateOgImage();
