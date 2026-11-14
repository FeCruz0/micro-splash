/**
 * Paleta 16-Bit e Bandas Direcionais da Falésia Glacial (Antártica) — Micro Splash
 */

export interface GlacierPoint {
  readonly x: number;
  readonly y: number;
}

export interface GlacierPolygonLayer {
  readonly points: readonly GlacierPoint[];
  readonly color: [number, number, number];
  readonly alpha: number;
}

export const GLACIER_CLIFF_BASE_OFFSET_X = -1440;

export const GLACIER_16BIT_COLOR_PALETTE = {
  SNOW_CREST_PURE: [248, 252, 255] as [number, number, number],
  SNOW_CREST_SHADOW: [195, 228, 248] as [number, number, number],
  SNOW_CREST_AZURE: [152, 206, 240] as [number, number, number],
  GLACIAL_EMERGED_BODY: [110, 198, 238] as [number, number, number],
  GLACIAL_EMERGED_LIGHT: [182, 236, 255] as [number, number, number],
  GLACIAL_EMERGED_CLEAVAGE: [76, 152, 206] as [number, number, number],
  GLACIAL_ICE_HIGHLIGHT: [160, 238, 255] as [number, number, number],
  SPECULAR_CYAN_LIGHT: [132, 235, 252] as [number, number, number],
  SUBSURFACE_TURQUOISE: [52, 184, 224] as [number, number, number],
  CRYSTAL_AZURE: [78, 174, 226] as [number, number, number],
  AZURE_MIDTONE_BLEND: [62, 152, 212] as [number, number, number],
  GLACIAL_BLUE_MAIN: [44, 128, 194] as [number, number, number],
  SAPPHIRE_DEEP_BLEND: [34, 106, 174] as [number, number, number],
  GLACIAL_BLUE_SHADE: [26, 86, 152] as [number, number, number],
  OCEAN_COBALT_DEEP: [18, 56, 114] as [number, number, number],
  COBALT_ABYSSAL_MID: [16, 46, 98] as [number, number, number],
  ABYSSAL_COBALT_BASE: [14, 38, 86] as [number, number, number],
  FISSURE_ABYSS_LINE: [12, 28, 62] as [number, number, number],
  BATHYAL_SHADOW: [10, 26, 62] as [number, number, number],
} as const;

export interface DepthPaletteBand {
  readonly leftHighlightColor: [number, number, number];
  readonly topLightColor: [number, number, number];
  readonly rightShadowColor: [number, number, number];
  readonly bottomAbyssColor: [number, number, number];
}

export const DEPTH_PALETTE_BANDS: readonly DepthPaletteBand[] = [
  {
    leftHighlightColor: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_EMERGED_LIGHT,
    topLightColor: GLACIER_16BIT_COLOR_PALETTE.SPECULAR_CYAN_LIGHT,
    rightShadowColor: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_MAIN,
    bottomAbyssColor: GLACIER_16BIT_COLOR_PALETTE.SUBSURFACE_TURQUOISE,
  },
  {
    leftHighlightColor: GLACIER_16BIT_COLOR_PALETTE.SPECULAR_CYAN_LIGHT,
    topLightColor: GLACIER_16BIT_COLOR_PALETTE.CRYSTAL_AZURE,
    rightShadowColor: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_SHADE,
    bottomAbyssColor: GLACIER_16BIT_COLOR_PALETTE.OCEAN_COBALT_DEEP,
  },
  {
    leftHighlightColor: GLACIER_16BIT_COLOR_PALETTE.CRYSTAL_AZURE,
    topLightColor: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_MAIN,
    rightShadowColor: GLACIER_16BIT_COLOR_PALETTE.OCEAN_COBALT_DEEP,
    bottomAbyssColor: GLACIER_16BIT_COLOR_PALETTE.ABYSSAL_COBALT_BASE,
  },
  {
    leftHighlightColor: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_MAIN,
    topLightColor: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_SHADE,
    rightShadowColor: GLACIER_16BIT_COLOR_PALETTE.ABYSSAL_COBALT_BASE,
    bottomAbyssColor: GLACIER_16BIT_COLOR_PALETTE.BATHYAL_SHADOW,
  },
  {
    leftHighlightColor: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_SHADE,
    topLightColor: GLACIER_16BIT_COLOR_PALETTE.OCEAN_COBALT_DEEP,
    rightShadowColor: GLACIER_16BIT_COLOR_PALETTE.ABYSSAL_COBALT_BASE,
    bottomAbyssColor: GLACIER_16BIT_COLOR_PALETTE.BATHYAL_SHADOW,
  },
];

export const PILLAR_BOUNDARIES_X: readonly number[] = [
  GLACIER_CLIFF_BASE_OFFSET_X,
  -1295,
  -1175,
  -1025,
  -905,
  -760,
  -645,
  -495,
  -390,
  -250,
  -160,
  -72,
];

export const RIGHT_CLIFF_KEYPOINTS: ReadonlyArray<{ readonly r: number; readonly x: number }> = [
  { r: 0, x: 22 },
  { r: 0.16, x: 26 },
  { r: 0.34, x: 12 },
  { r: 0.5, x: 18 },
  { r: 0.65, x: 30 },
  { r: 0.78, x: 66 },
  { r: 0.9, x: 118 },
  { r: 1.0, x: 182 },
];

export const DEPTH_SAMPLE_RATIOS: readonly number[] = [0, 0.14, 0.3, 0.48, 0.68, 0.85, 1.0];

export interface ColumnSculptProfile {
  readonly isSalient: boolean;
  readonly litSplitFraction: number;
  readonly upperDepthEnd: number;
  readonly midDepthEnd: number;
  readonly lowerDepthEnd: number;
  readonly abyssRiseRatio: number;
  readonly diagonalSlope: number;
}

export const COLUMN_SCULPT_PROFILES: readonly ColumnSculptProfile[] = [
  {
    isSalient: true,
    litSplitFraction: 0.62,
    upperDepthEnd: 0.34,
    midDepthEnd: 0.62,
    lowerDepthEnd: 0.84,
    abyssRiseRatio: 0.72,
    diagonalSlope: 0.07,
  },
  {
    isSalient: false,
    litSplitFraction: 0.36,
    upperDepthEnd: 0.18,
    midDepthEnd: 0.44,
    lowerDepthEnd: 0.72,
    abyssRiseRatio: 0.66,
    diagonalSlope: -0.05,
  },
  {
    isSalient: true,
    litSplitFraction: 0.56,
    upperDepthEnd: 0.42,
    midDepthEnd: 0.68,
    lowerDepthEnd: 0.88,
    abyssRiseRatio: 0.78,
    diagonalSlope: 0.05,
  },
  {
    isSalient: false,
    litSplitFraction: 0.4,
    upperDepthEnd: 0.22,
    midDepthEnd: 0.48,
    lowerDepthEnd: 0.76,
    abyssRiseRatio: 0.68,
    diagonalSlope: -0.06,
  },
  {
    isSalient: true,
    litSplitFraction: 0.64,
    upperDepthEnd: 0.3,
    midDepthEnd: 0.58,
    lowerDepthEnd: 0.82,
    abyssRiseRatio: 0.75,
    diagonalSlope: 0.08,
  },
  {
    isSalient: false,
    litSplitFraction: 0.34,
    upperDepthEnd: 0.16,
    midDepthEnd: 0.4,
    lowerDepthEnd: 0.68,
    abyssRiseRatio: 0.64,
    diagonalSlope: -0.04,
  },
];

export function resolveInterpolatedX(
  r: number,
  keypoints: ReadonlyArray<{ readonly r: number; readonly x: number }>
): number {
  for (let i = 0; i < keypoints.length - 1; i++) {
    if (r >= keypoints[i].r && r <= keypoints[i + 1].r) {
      const span = keypoints[i + 1].r - keypoints[i].r;
      const t = span > 0 ? (r - keypoints[i].r) / span : 0;
      return Math.round(keypoints[i].x + (keypoints[i + 1].x - keypoints[i].x) * t);
    }
  }
  return keypoints[keypoints.length - 1].x;
}

export function normalizeGlacierTopBoundaryPoints(
  layers: readonly GlacierPolygonLayer[],
  seaLevelY: number
): GlacierPolygonLayer[] {
  return layers.map((layer) => ({
    ...layer,
    points: layer.points.map((point) =>
      point.y < seaLevelY && point.y > seaLevelY - 12 ? { ...point, y: seaLevelY } : point
    ),
  }));
}

export function extendSeamlessGlacierToLeftBoundary(
  layers: readonly GlacierPolygonLayer[],
  leftBoundaryX: number = GLACIER_CLIFF_BASE_OFFSET_X
): GlacierPolygonLayer[] {
  return layers.map((layer) => ({
    ...layer,
    points: layer.points.map((point) =>
      point.x <= -360 ? { ...point, x: Math.min(point.x, leftBoundaryX) } : point
    ),
  }));
}
