import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "./shared/pngWriter.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function renderIconBuffer(size) {
  const buf = Buffer.alloc(size * size * 4, 0);

  function setPixel(x, y, r, g, b, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size || a <= 0) return;
    const idx = (y * size + x) * 4;
    const alpha = a / 255;
    const inv = 1 - alpha;
    buf[idx] = Math.round(r * alpha + buf[idx] * inv);
    buf[idx + 1] = Math.round(g * alpha + buf[idx + 1] * inv);
    buf[idx + 2] = Math.round(b * alpha + buf[idx + 2] * inv);
    buf[idx + 3] = Math.min(255, Math.round(buf[idx + 3] * inv + a));
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.46;
  const radius2 = radius * radius;

  // 1. Fundo Circular Azul Oceânico Profundo
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= radius2) {
        const edge = Math.sqrt(d2) / radius;
        // Borda circular com anel ciano brilhante
        if (edge > 0.94) {
          setPixel(x, y, 56, 189, 248, 255);
        } else if (edge > 0.9) {
          setPixel(x, y, 14, 116, 144, 255);
        } else {
          // Gradiente vertical oceânico
          const t = y / size;
          const r = Math.round(6 + (10 - 6) * t);
          const g = Math.round(24 + (40 - 24) * t);
          const b = Math.round(52 + (80 - 52) * t);
          setPixel(x, y, r, g, b, 255);
        }
      }
    }
  }

  // 2. Ondas do Mar
  const waveY = size * 0.62;
  for (let y = Math.floor(waveY - size * 0.05); y < Math.floor(size * 0.92); y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < radius2 * 0.88) {
        const wave = Math.sin((x / size) * Math.PI * 4) * (size * 0.03);
        if (y > waveY + wave) {
          const depth = (y - (waveY + wave)) / (size * 0.3);
          const r = Math.round(3 + depth * 10);
          const g = Math.round(105 + depth * 30);
          const b = Math.round(161 + depth * 40);
          setPixel(x, y, r, g, b, 180);
        }
      }
    }
  }

  // 3. Silhueta e Flukes da Cauda da Jubarte
  const pedW = size * 0.07;
  const pedTop = size * 0.44;
  const pedBottom = size * 0.8;
  for (let y = Math.floor(pedTop); y <= Math.floor(pedBottom); y++) {
    const t = (y - pedTop) / (pedBottom - pedTop);
    const w = pedW * (0.6 + t * 0.6);
    for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < radius2 * 0.9) {
        setPixel(x, y, 2, 132, 199, 255);
      }
    }
  }

  // Flukes (Nadadeiras Caudais em V)
  const flukeCenterY = size * 0.44;
  for (let x = Math.floor(cx - size * 0.38); x <= Math.ceil(cx + size * 0.38); x++) {
    const relX = (x - cx) / (size * 0.38); // -1 a +1
    const absRelX = Math.abs(relX);
    if (absRelX < 0.04) continue; // chanfro central

    // Curva aerodinâmica do bordo de ataque e fuga da cauda
    const tipCurve = Math.sin(absRelX * Math.PI * 0.5);
    const topY = flukeCenterY - tipCurve * (size * 0.16) + absRelX * (size * 0.04);
    const thickness = (1 - absRelX * 0.8) * (size * 0.085);
    const bottomY = topY + thickness;

    for (let y = Math.floor(topY); y <= Math.ceil(bottomY); y++) {
      const dy = y - cy;
      const dx = x - cx;
      if (dx * dx + dy * dy < radius2 * 0.9) {
        const edgeGleam = y === Math.floor(topY) || y === Math.ceil(bottomY);
        if (edgeGleam) {
          setPixel(x, y, 224, 242, 254, 255); // Contorno branco brilhante
        } else {
          setPixel(x, y, 14, 165, 233, 255); // Azul cerúleo
        }
      }
    }
  }

  // 4. Gotas de Água e Borrifos
  const drops = [
    { x: cx - size * 0.1, y: size * 0.24, r: size * 0.024 },
    { x: cx + size * 0.1, y: size * 0.24, r: size * 0.024 },
    { x: cx, y: size * 0.18, r: size * 0.03 },
    { x: cx - size * 0.2, y: size * 0.19, r: size * 0.016 },
    { x: cx + size * 0.2, y: size * 0.19, r: size * 0.016 },
  ];

  drops.forEach((d) => {
    const r2 = d.r * d.r;
    for (let y = Math.floor(d.y - d.r); y <= Math.ceil(d.y + d.r); y++) {
      for (let x = Math.floor(d.x - d.r); x <= Math.ceil(d.x + d.r); x++) {
        const dist2 = (x - d.x) ** 2 + (y - d.y) ** 2;
        if (dist2 <= r2) {
          setPixel(x, y, 186, 230, 253, 230);
        }
      }
    }
  });

  return buf;
}

export function generatePwaIcons() {
  const iconsDir = path.resolve(__dirname, "../public/icons");
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Gera 192x192
  const buf192 = renderIconBuffer(192);
  const png192 = encodePng(192, 192, buf192);
  fs.writeFileSync(path.join(iconsDir, "icon-192.png"), png192);

  // Gera 512x512
  const buf512 = renderIconBuffer(512);
  const png512 = encodePng(512, 512, buf512);
  fs.writeFileSync(path.join(iconsDir, "icon-512.png"), png512);

  return { icon192Bytes: png192.length, icon512Bytes: png512.length };
}

if (process.argv[1] === __filename) {
  generatePwaIcons();
  process.stdout.write("Ícones PWA gerados com sucesso em public/icons/ via ESM!\n");
}
