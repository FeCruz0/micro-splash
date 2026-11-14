/**
 * Gerador Procedural de Icebergs Flutuantes e Espaços de Salto (16-Bit) — Micro Splash
 *
 * Separa integralmente a geração determinística (seed opcional) da renderização PixiJS 8
 * e da geometria de colisão, calibrando aberturas à física real da baleia.
 */

import { GAME_CONFIG } from "../../config";
import type { IceGap } from "./iceGaps";

export type IcebergCategory = "small" | "medium" | "large" | "elongated" | "irregular";
export type IcebergGapKind = "conventional" | "jump" | "wide";

export interface IcebergContourPoint {
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface ProceduralIcebergSpec {
  readonly id: string;
  readonly index: number;
  readonly category: IcebergCategory;
  readonly x: number;
  readonly width: number;
  readonly aboveWaterHeight: number;
  readonly submergedDepth: number;
  readonly peakCount: number;
  readonly leftSlopeFraction: number;
  readonly rightSlopeFraction: number;
  readonly toneShift: number;
  readonly surfaceContour: readonly IcebergContourPoint[];
  readonly submergedContour: readonly IcebergContourPoint[];
  readonly collisionMinY: number;
  readonly collisionMaxY: number;
}

export interface ProceduralIcebergLayout {
  readonly seed: number;
  readonly icebergs: readonly ProceduralIcebergSpec[];
  readonly gaps: readonly IceGap[];
}

export const WHALE_JUMP_PHYSICS = {
  HORIZONTAL_SPEED: GAME_CONFIG.MAX_SPEED,
  AIR_GRAVITY: 340,
  BREACH_GRAVITY: 620,
  HITBOX_WIDTH: 120,
  CONVENTIONAL_GAP_MIN: 78,
  CONVENTIONAL_GAP_MAX: 145,
  JUMP_GAP_MIN: 185,
  JUMP_GAP_MAX: 285,
  WIDE_GAP_MIN: 340,
  WIDE_GAP_MAX: 480,
} as const;

export const DEFAULT_ICEBERG_GENERATION_SEED = 20261114;

type CategoryTuple = readonly [
  minWidth: number,
  maxWidth: number,
  minAboveHeight: number,
  maxAboveHeight: number,
  minSubmergedDepth: number,
  maxSubmergedDepth: number,
  minPeaks: number,
  maxPeaks: number,
];

const CATEGORY_RANGES: Record<IcebergCategory, CategoryTuple> = {
  small: [84, 122, 16, 26, 24, 38, 1, 2],
  medium: [130, 182, 24, 38, 34, 54, 2, 3],
  large: [192, 264, 34, 52, 48, 76, 3, 4],
  elongated: [205, 285, 14, 23, 26, 42, 2, 4],
  irregular: [138, 218, 28, 48, 42, 68, 2, 4],
};

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function pickCategory(
  rng: () => number,
  previousCategory: IcebergCategory | null
): IcebergCategory {
  const categories = Object.keys(CATEGORY_RANGES) as IcebergCategory[];
  let chosen = categories[Math.floor(rng() * categories.length)];
  if (chosen === previousCategory) {
    chosen =
      categories[(categories.indexOf(chosen) + 1 + Math.floor(rng() * 3)) % categories.length];
  }
  return chosen;
}

function pickGapKind(
  rng: () => number,
  index: number,
  previousGapKind: IcebergGapKind | null
): IcebergGapKind {
  const roll = rng();
  if (index % 5 === 3 && previousGapKind !== "wide") return roll < 0.72 ? "wide" : "jump";
  if (roll < 0.48) {
    return previousGapKind === "conventional" && rng() < 0.45 ? "jump" : "conventional";
  }
  if (roll < 0.84) return "jump";
  return previousGapKind === "wide" ? "jump" : "wide";
}

const GAP_BOUNDS: Record<IcebergGapKind, readonly [number, number]> = {
  conventional: [WHALE_JUMP_PHYSICS.CONVENTIONAL_GAP_MIN, WHALE_JUMP_PHYSICS.CONVENTIONAL_GAP_MAX],
  jump: [WHALE_JUMP_PHYSICS.JUMP_GAP_MIN, WHALE_JUMP_PHYSICS.JUMP_GAP_MAX],
  wide: [WHALE_JUMP_PHYSICS.WIDE_GAP_MIN, WHALE_JUMP_PHYSICS.WIDE_GAP_MAX],
};

function computeGapWidth(rng: () => number, kind: IcebergGapKind): number {
  const [minGap, maxGap] = GAP_BOUNDS[kind];
  return Math.round(randomInRange(rng, minGap, maxGap));
}

function buildSurfaceContour(
  rng: () => number,
  category: IcebergCategory,
  width: number,
  aboveWaterHeight: number,
  peakCount: number,
  leftSlopeFraction: number,
  rightSlopeFraction: number
): IcebergContourPoint[] {
  const points: IcebergContourPoint[] = [{ offsetX: 0, offsetY: 2 }];
  const innerStart = Math.round(width * leftSlopeFraction);
  const innerEnd = Math.round(width * (1 - rightSlopeFraction));
  const innerSpan = Math.max(24, innerEnd - innerStart);
  const stepWidth = innerSpan / peakCount;

  for (let peakIndex = 0; peakIndex < peakCount; peakIndex++) {
    const peakStartX = innerStart + stepWidth * peakIndex;
    const peakCenterOffset = randomInRange(rng, 0.32, 0.68);
    const peakX = Math.round(peakStartX + stepWidth * peakCenterOffset);
    const heightScale =
      category === "elongated"
        ? randomInRange(rng, 0.72, 1.0)
        : category === "irregular"
          ? randomInRange(rng, 0.48, 1.05)
          : randomInRange(rng, 0.65, 1.0);
    const peakY = -Math.max(10, Math.round(aboveWaterHeight * heightScale));

    // Ombro esquerdo em degrau para estética pixel art 16-bit
    const shoulderX = Math.round(peakStartX + stepWidth * 0.16);
    const shoulderY = Math.round(peakY * randomInRange(rng, 0.45, 0.68));
    if (shoulderX > points[points.length - 1].offsetX + 4) {
      points.push({ offsetX: shoulderX, offsetY: shoulderY });
    }
    points.push({ offsetX: peakX, offsetY: peakY });

    if (peakIndex < peakCount - 1) {
      const valleyX = Math.round(peakStartX + stepWidth * randomInRange(rng, 0.88, 1.04));
      const valleyDrop =
        category === "irregular" ? randomInRange(rng, 0.22, 0.48) : randomInRange(rng, 0.38, 0.65);
      const valleyY = -Math.max(4, Math.round(aboveWaterHeight * valleyDrop));
      points.push({ offsetX: valleyX, offsetY: valleyY });
    }
  }

  const rightShoulderX = Math.round(width * (1 - rightSlopeFraction * 0.45));
  const rightShoulderY = -Math.max(4, Math.round(aboveWaterHeight * randomInRange(rng, 0.22, 0.4)));
  if (rightShoulderX > points[points.length - 1].offsetX + 4) {
    points.push({ offsetX: rightShoulderX, offsetY: rightShoulderY });
  }
  points.push({ offsetX: width, offsetY: 2 });
  return points;
}

function buildSubmergedContour(
  rng: () => number,
  width: number,
  submergedDepth: number,
  category: IcebergCategory
): IcebergContourPoint[] {
  const keelCount = category === "small" ? 2 : category === "large" ? 4 : 3;
  const points: IcebergContourPoint[] = [{ offsetX: Math.round(width * 0.04), offsetY: 2 }];
  const usableSpan = width * 0.88;
  const startX = width * 0.06;

  for (let keelIndex = 0; keelIndex < keelCount; keelIndex++) {
    const slotStart = startX + (usableSpan / keelCount) * keelIndex;
    const slotSpan = usableSpan / keelCount;
    const keelX = Math.round(slotStart + slotSpan * randomInRange(rng, 0.28, 0.72));
    const depthFactor =
      keelIndex === Math.floor(keelCount / 2)
        ? randomInRange(rng, 0.86, 1.05)
        : randomInRange(rng, 0.52, 0.85);
    const keelY = Math.max(18, Math.round(submergedDepth * depthFactor));
    points.push({ offsetX: keelX, offsetY: keelY });

    if (keelIndex < keelCount - 1) {
      const notchX = Math.round(slotStart + slotSpan * randomInRange(rng, 0.85, 1.02));
      const notchY = Math.max(10, Math.round(submergedDepth * randomInRange(rng, 0.34, 0.58)));
      points.push({ offsetX: notchX, offsetY: notchY });
    }
  }

  points.push({ offsetX: Math.round(width * 0.96), offsetY: 2 });
  return points;
}

/**
 * Gera a sequência procedural determinística de icebergs flutuantes e aberturas
 * entre x = 0 e totalDistance (5.000m), preservando a polínia inicial em x = 0..240.
 */
export function generateProceduralIcebergLayout(
  totalDistance: number = 5000,
  seed: number = DEFAULT_ICEBERG_GENERATION_SEED,
  seaLevelY: number = GAME_CONFIG.SEA_LEVEL
): ProceduralIcebergLayout {
  const rng = createSeededRandom(seed);
  const icebergs: ProceduralIcebergSpec[] = [];
  const gaps: IceGap[] = [{ start: 0, end: 245 }];

  let cursorX = 245;
  let index = 0;
  let previousCategory: IcebergCategory | null = null;
  let previousGapKind: IcebergGapKind | null = null;

  while (cursorX + 90 < totalDistance) {
    const category = pickCategory(rng, previousCategory);
    const [minW, maxW, minH, maxH, minD, maxD, minP, maxP] = CATEGORY_RANGES[category];
    const width = Math.min(totalDistance - cursorX, Math.round(randomInRange(rng, minW, maxW)));
    if (width < 72) break;

    const aboveWaterHeight = Math.round(randomInRange(rng, minH, maxH));
    const submergedDepth = Math.round(randomInRange(rng, minD, maxD));
    const peakCount = Math.min(maxP, Math.max(minP, Math.round(randomInRange(rng, minP, maxP))));
    const leftSlopeFraction = randomInRange(rng, 0.08, 0.18);
    const rightSlopeFraction = randomInRange(rng, 0.08, 0.18);

    const surfaceContour = buildSurfaceContour(
      rng,
      category,
      width,
      aboveWaterHeight,
      peakCount,
      leftSlopeFraction,
      rightSlopeFraction
    );
    const submergedContour = buildSubmergedContour(rng, width, submergedDepth, category);

    // Superfície de colisão coerente com a linha d'água e parte superior, sem obstáculos submersos profundos
    const collisionMinY = seaLevelY - Math.min(18, Math.round(aboveWaterHeight * 0.55));
    const collisionMaxY = seaLevelY + 14;

    icebergs.push({
      id: `ice_block_proc_${index}_${Math.round(cursorX)}`,
      index,
      category,
      x: Math.round(cursorX),
      width,
      aboveWaterHeight,
      submergedDepth,
      peakCount,
      leftSlopeFraction,
      rightSlopeFraction,
      toneShift: Math.round(randomInRange(rng, -10, 12)),
      surfaceContour,
      submergedContour,
      collisionMinY,
      collisionMaxY,
    });

    cursorX += width;
    previousCategory = category;

    if (cursorX + 80 >= totalDistance) {
      break;
    }

    const gapKind = pickGapKind(rng, index, previousGapKind);
    const gapWidth = computeGapWidth(rng, gapKind);
    const gapStart = Math.round(cursorX);
    const gapEnd = Math.min(totalDistance, gapStart + gapWidth);
    gaps.push({ start: gapStart, end: gapEnd });

    cursorX = gapEnd;
    previousGapKind = gapKind;
    index++;
  }

  return { seed, icebergs, gaps };
}
