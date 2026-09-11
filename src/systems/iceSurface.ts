import kaboom from "kaboom";
import { TAGS } from "../config";

export interface IceGap {
  start: number;
  end: number;
}

// Fendas de respiração pré-definidas na camada de gelo (0m a 5.000m)
export const ICE_GAPS: IceGap[] = [
  { start: 600, end: 750 },
  { start: 1400, end: 1550 },
  { start: 2200, end: 2350 },
  { start: 3100, end: 3250 },
  { start: 4000, end: 4150 },
  { start: 4700, end: 4850 },
];

/**
 * Checa se uma posição X na Antártida (0-5000m) está em uma fenda de ar livre.
 */
export function isPositionInIceGap(x: number): boolean {
  if (x < 0 || x > 5000) return true; // Fora do gelo antártico, ar sempre livre
  return ICE_GAPS.some((gap) => x >= gap.start && x <= gap.end);
}

/**
 * Cria a camada de gelo, o iceberg de parede inicial e as aberturas de respiração no bioma Antártico (0m - 5000m).
 */
export function setupIceSurfaceSystem(k: ReturnType<typeof kaboom>) {
  const iceHeight = 40;
  const totalDistance = 5000;
  let currentX = 0;

  // 1. Grande Paredão e Massivo de Iceberg estendido de x = -1100m até x = 0m
  const wallWidth = 1100;
  const wallStartX = -1100;

  // Corpo rígido principal de colisão cobrindo os 1100m à esquerda
  k.add([
    k.rect(wallWidth, k.height()),
    k.pos(wallStartX, 0),
    k.area(),
    k.body({ isStatic: true }),
    k.color(150, 195, 235),
    k.opacity(0.95),
    "iceberg_wall",
    TAGS.OBSTACLE,
  ]);

  // Camada de relevo visual: Colunas de gelo verticais e facetas cristalinas (x = -1000m até x = 0m)
  for (let x = wallStartX; x < 0; x += 75) {
    const colWidth = 65 + Math.sin(x * 0.04) * 20;
    const bumpX = x + Math.cos(x * 0.02) * 12;

    // Colunas de gelo em relevo com variação de profundidade
    k.add([
      k.polygon([
        k.vec2(bumpX, 0),
        k.vec2(bumpX + colWidth, 0),
        k.vec2(bumpX + colWidth - 15, k.height()),
        k.vec2(bumpX - 20, k.height()),
      ]),
      k.color(180, 220, 255),
      k.opacity(0.35),
      k.z(1),
    ]);

    // Ridges / Linhas de fratura em brilho de cristal branco-ciano
    k.add([
      k.polygon([
        k.vec2(bumpX + 8, 0),
        k.vec2(bumpX + colWidth * 0.45, 0),
        k.vec2(bumpX + colWidth * 0.25, k.height()),
      ]),
      k.color(230, 248, 255),
      k.opacity(0.55),
      k.z(2),
    ]);
  }

  // Crista pontiaguda e irregular na borda frontal de contato com o mar (x = -50m a x = 0m)
  const cliffFacePts = [
    k.vec2(-50, 0),
    k.vec2(0, 35),
    k.vec2(-20, 95),
    k.vec2(8, 165),
    k.vec2(-25, 235),
    k.vec2(5, 315),
    k.vec2(-30, 385),
    k.vec2(0, 455),
    k.vec2(-35, k.height()),
    k.vec2(-120, k.height()),
    k.vec2(-120, 0),
  ];

  k.add([
    k.polygon(cliffFacePts),
    k.color(210, 240, 255),
    k.outline(3, k.rgb(120, 180, 230)),
    k.opacity(0.98),
    k.z(3),
  ]);

  ICE_GAPS.forEach((gap) => {
    // Bloco de gelo congelado antes da fenda
    if (gap.start > currentX) {
      const blockWidth = gap.start - currentX;
      k.add([
        k.rect(blockWidth, iceHeight, { radius: 4 }),
        k.pos(currentX, 0),
        k.area(),
        k.body({ isStatic: true }),
        k.color(210, 235, 255),
        k.opacity(0.85),
        k.outline(2, k.rgb(160, 200, 240)),
        "ice_block",
        TAGS.OBSTACLE,
      ]);
    }

    // Sinalizador visual de água livre / fenda de ar na fenda
    k.add([
      k.rect(gap.end - gap.start, 6),
      k.pos(gap.start, iceHeight - 6),
      k.color(0, 220, 255),
      k.opacity(0.6),
      k.z(5),
    ]);

    currentX = gap.end;
  });

  // Bloco de gelo final entre a última fenda e os 5.000m
  if (currentX < totalDistance) {
    const blockWidth = totalDistance - currentX;
    k.add([
      k.rect(blockWidth, iceHeight, { radius: 4 }),
      k.pos(currentX, 0),
      k.area(),
      k.body({ isStatic: true }),
      k.color(210, 235, 255),
      k.opacity(0.85),
      k.outline(2, k.rgb(160, 200, 240)),
      "ice_block",
      TAGS.OBSTACLE,
    ]);
  }
}
