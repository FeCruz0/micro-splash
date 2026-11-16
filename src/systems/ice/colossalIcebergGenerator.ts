/**
 * Gerador Procedural de Iceberg Colossal à Esquerda (16-Bit) — Micro Splash
 *
 * Gera uma formação gigantesca de iceberg parcialmente submerso com cadeia de picos
 * assimétricos na superfície, formações verticais fundidas de larguras e profundidades
 * variadas e contorno submerso irregular com reprodutibilidade por seed.
 */

import { GLACIER_CLIFF_BASE_OFFSET_X, type GlacierPoint } from "./glacierCliffPalette";

export const DEFAULT_COLOSSAL_ICEBERG_SEED = 20261116;

export interface ColossalIcebergGenerationOptions {
  readonly seed?: number;
  readonly peakCount?: number;
  readonly keelCount?: number;
  readonly formationCount?: number;
  readonly volumeWidthVariance?: number;
  readonly irregularity?: number;
  readonly leftBoundaryX?: number;
}

export interface ColossalIcebergPeak {
  readonly left: GlacierPoint;
  readonly peak: GlacierPoint;
  readonly right: GlacierPoint;
}

export interface ColossalIcebergKeel {
  readonly left: GlacierPoint;
  readonly keel: GlacierPoint;
  readonly right: GlacierPoint;
}

export interface ColossalIceFormation {
  readonly index: number;
  readonly leftX: number;
  readonly rightX: number;
  readonly topY: number;
  readonly bottomY: number;
  readonly leanX: number;
  readonly tierRatios: readonly number[];
}

export interface ColossalIcebergSpec {
  readonly seed: number;
  readonly seaLevelY: number;
  readonly screenHeight: number;
  readonly leftBoundaryX: number;
  readonly rightWaterlineX: number;
  readonly surfaceContour: readonly GlacierPoint[];
  readonly submergedContour: readonly GlacierPoint[];
  readonly peaks: readonly ColossalIcebergPeak[];
  readonly keels: readonly ColossalIcebergKeel[];
  readonly formations: readonly ColossalIceFormation[];
}

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

function snapPixel(value: number): number {
  return Math.round(value / 2) * 2;
}

/**
 * Gera a silhueta procedural e formações verticais fundidas do iceberg colossal.
 */
export function generateColossalIcebergSpec(
  screenHeight: number,
  seaLevelY: number,
  options: ColossalIcebergGenerationOptions = {}
): ColossalIcebergSpec {
  const seed = options.seed ?? DEFAULT_COLOSSAL_ICEBERG_SEED;
  const peakCount = Math.max(5, options.peakCount ?? 11);
  const keelCount = Math.max(4, options.keelCount ?? 6);
  const formationCount = Math.max(10, options.formationCount ?? 16);
  const irregularity = options.irregularity ?? 1.0;
  const variance = options.volumeWidthVariance ?? 1.0;
  const leftBoundaryX = options.leftBoundaryX ?? GLACIER_CLIFF_BASE_OFFSET_X;
  const rng = createSeededRandom(seed);

  const rightWaterlineX = snapPixel(randomInRange(rng, 24, 34));
  const totalSpan = rightWaterlineX - leftBoundaryX;
  const aboveHeight = Math.max(24, seaLevelY);
  const submergedDepth = Math.max(120, screenHeight - seaLevelY);

  // 1. Cadeia de picos irregulares na superfície (altos, baixos, degraus e projeções)
  const surfaceContour: GlacierPoint[] = [{ x: leftBoundaryX, y: seaLevelY + 2 }];
  const peaks: ColossalIcebergPeak[] = [];
  const slotWidth = (totalSpan - 24) / peakCount;

  for (let i = 0; i < peakCount; i++) {
    const slotStartX = leftBoundaryX + slotWidth * i;
    const widthFactor = randomInRange(rng, 0.82, 1.18) * variance;
    const progress = i / Math.max(1, peakCount - 1);
    const envelope = 1.0 - progress * 0.36;
    const isMajorPeak = i % 3 === 0 || i === 1;
    const peakHeight = snapPixel(
      aboveHeight *
        envelope *
        randomInRange(rng, isMajorPeak ? 0.72 : 0.42, isMajorPeak ? 1.0 : 0.76)
    );
    const peakY = Math.max(0, seaLevelY - peakHeight);
    const peakX = snapPixel(
      slotStartX + slotWidth * randomInRange(rng, 0.32, 0.66) * Math.min(1.1, widthFactor)
    );

    const shoulderX = snapPixel(slotStartX + slotWidth * 0.16);
    const shoulderY = Math.max(
      2,
      seaLevelY - snapPixel(peakHeight * randomInRange(rng, 0.45, 0.74))
    );
    const leftAnchor: GlacierPoint =
      shoulderX > surfaceContour[surfaceContour.length - 1].x + 10
        ? { x: shoulderX, y: shoulderY }
        : surfaceContour[surfaceContour.length - 1];

    if (leftAnchor !== surfaceContour[surfaceContour.length - 1]) {
      surfaceContour.push(leftAnchor);
    }

    const peakPoint: GlacierPoint = { x: peakX, y: peakY };
    surfaceContour.push(peakPoint);

    let rightAnchor: GlacierPoint;
    if (i < peakCount - 1) {
      const valleyX = snapPixel(slotStartX + slotWidth * randomInRange(rng, 0.84, 1.02));
      const valleyY = Math.max(
        6,
        seaLevelY - snapPixel(peakHeight * randomInRange(rng, 0.2, 0.52))
      );
      rightAnchor = { x: valleyX, y: valleyY };
      surfaceContour.push(rightAnchor);
    } else {
      rightAnchor = {
        x: rightWaterlineX - 6,
        y: Math.max(8, seaLevelY - snapPixel(aboveHeight * randomInRange(rng, 0.24, 0.4))),
      };
      surfaceContour.push(rightAnchor);
    }
    peaks.push({ left: leftAnchor, peak: peakPoint, right: rightAnchor });
  }
  surfaceContour.push({ x: rightWaterlineX, y: seaLevelY + 2 });

  // 2. Silhueta submersa ancorada ao leito com pé oceânico escalonado à direita (como na referência)
  const submergedContour: GlacierPoint[] = [{ x: leftBoundaryX, y: seaLevelY + 2 }];
  const keels: ColossalIcebergKeel[] = [];
  const keelSpan = (totalSpan - 40) / keelCount;
  const oceanJutPoints: GlacierPoint[] = [
    { x: rightWaterlineX, y: seaLevelY + 2 },
    { x: rightWaterlineX + 10, y: seaLevelY + snapPixel(submergedDepth * 0.16) },
    { x: rightWaterlineX - 4, y: seaLevelY + snapPixel(submergedDepth * 0.34) },
    { x: rightWaterlineX + 14, y: seaLevelY + snapPixel(submergedDepth * 0.52) },
    { x: rightWaterlineX + 36, y: seaLevelY + snapPixel(submergedDepth * 0.68) },
    { x: rightWaterlineX + 86, y: seaLevelY + snapPixel(submergedDepth * 0.82) },
    { x: rightWaterlineX + 146, y: seaLevelY + snapPixel(submergedDepth * 0.93) },
    { x: rightWaterlineX + 188, y: screenHeight },
  ];

  const keelPoints: GlacierPoint[] = [];
  for (let k = keelCount - 1; k >= 0; k--) {
    const slotStartX = leftBoundaryX + keelSpan * k;
    const keelX = snapPixel(slotStartX + keelSpan * randomInRange(rng, 0.28, 0.72));
    const depthRatio = k % 2 === 0 ? randomInRange(rng, 0.9, 1.0) : randomInRange(rng, 0.82, 0.94);
    const keelY = seaLevelY + snapPixel(submergedDepth * Math.min(1.0, depthRatio * irregularity));
    keelPoints.push({ x: keelX, y: keelY });
    if (k > 0) {
      const notchX = snapPixel(slotStartX + keelSpan * randomInRange(rng, 0.04, 0.16));
      const notchY = seaLevelY + snapPixel(submergedDepth * randomInRange(rng, 0.72, 0.86));
      keelPoints.push({ x: notchX, y: notchY });
    }
  }

  submergedContour.push(...oceanJutPoints, ...keelPoints);
  submergedContour.push({ x: leftBoundaryX, y: screenHeight });
  for (let i = 1; i < keelPoints.length - 1; i += 2) {
    keels.push({
      left: keelPoints[i + 1] ?? {
        x: leftBoundaryX,
        y: seaLevelY + snapPixel(submergedDepth * 0.6),
      },
      keel: keelPoints[i],
      right: keelPoints[i - 1],
    });
  }

  // 3. Formações verticais fundidas com larguras, comprimentos, inclinações e subdivisões variadas
  const formations: ColossalIceFormation[] = [];
  const formSlot = totalSpan / formationCount;
  for (let f = 0; f < formationCount; f++) {
    const leftX =
      f === 0
        ? leftBoundaryX
        : snapPixel(leftBoundaryX + f * formSlot - randomInRange(rng, 10, 22));
    const rightX =
      f === formationCount - 1
        ? rightWaterlineX + 14
        : snapPixel(leftBoundaryX + (f + 1) * formSlot + randomInRange(rng, 8, 18));
    const depthFactor = randomInRange(rng, 0.84, 1.0);
    const bottomY = seaLevelY + snapPixel(submergedDepth * depthFactor);
    const leanX = snapPixel(randomInRange(rng, -18, 22));
    const r1 = randomInRange(rng, 0.16, 0.28);
    const r2 = randomInRange(rng, 0.4, 0.54);
    const r3 = randomInRange(rng, 0.66, 0.8);
    formations.push({
      index: f,
      leftX,
      rightX,
      topY: seaLevelY,
      bottomY,
      leanX,
      tierRatios: [0, r1, r2, r3, 1.0],
    });
  }

  return {
    seed,
    seaLevelY,
    screenHeight,
    leftBoundaryX,
    rightWaterlineX,
    surfaceContour,
    submergedContour,
    peaks,
    keels,
    formations,
  };
}
