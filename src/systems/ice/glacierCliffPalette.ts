/**
 * Paleta 16-Bit e Bandas Direcionais da Falésia Glacial (Antártica) — Micro Splash
 */

export interface GlacierPoint {
  readonly x: number;
  readonly y: number;
}

export interface GlacierPolygonStroke {
  readonly color: [number, number, number];
  readonly width: number;
  readonly alpha: number;
}

export interface GlacierPolygonLayer {
  readonly points: readonly GlacierPoint[];
  readonly color: [number, number, number];
  readonly alpha: number;
  readonly stroke?: GlacierPolygonStroke;
}

/** Paleta compartilhada com `proceduralIcebergRenderer.ts` para identidade visual unificada. */
export const ICEBERG_FAMILY_PALETTE = {
  SNOW_PURE: [248, 253, 255] as [number, number, number],
  SNOW_ICE: [206, 238, 255] as [number, number, number],
  EMERGED_HIGHLIGHT: [146, 228, 255] as [number, number, number],
  EMERGED_MID: [88, 192, 242] as [number, number, number],
  EMERGED_SHADE: [44, 132, 204] as [number, number, number],
  EMERGED_OUTLINE: [16, 68, 132] as [number, number, number],
  WATERLINE_FOAM: [222, 248, 255] as [number, number, number],
  SUBMERGED_LIT: [40, 118, 196] as [number, number, number],
  SUBMERGED_MID: [24, 82, 152] as [number, number, number],
  SUBMERGED_DEEP: [14, 52, 108] as [number, number, number],
} as const;

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

export function renderSolidGlacierBackdropBase(
  screenHeight: number,
  seaLevelY: number
): readonly GlacierPolygonLayer[] {
  const submergedHeight = Math.max(1, screenHeight - seaLevelY);
  return [
    {
      points: [
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY },
        { x: 26, y: seaLevelY },
        { x: 30, y: seaLevelY + Math.round(submergedHeight * 0.16) },
        { x: 22, y: seaLevelY + Math.round(submergedHeight * 0.34) },
        { x: 28, y: seaLevelY + Math.round(submergedHeight * 0.52) },
        { x: 46, y: seaLevelY + Math.round(submergedHeight * 0.72) },
        { x: 88, y: seaLevelY + Math.round(submergedHeight * 0.88) },
        { x: 136, y: screenHeight },
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: screenHeight },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.OCEAN_COBALT_DEEP,
      alpha: 1.0,
    },
    {
      points: [
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY },
        { x: 26, y: seaLevelY },
        { x: 38, y: seaLevelY + Math.round(submergedHeight * 0.64) },
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY + Math.round(submergedHeight * 0.64) },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_MAIN,
      alpha: 0.94,
    },
    {
      points: [
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY + Math.round(submergedHeight * 0.28) },
        { x: 46, y: seaLevelY + Math.round(submergedHeight * 0.72) },
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY + Math.round(submergedHeight * 0.72) },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_SHADE,
      alpha: 0.72,
    },
  ];
}

export function renderMonolithicVerticalShardsWithDiagonalFaults(
  screenHeight: number,
  seaLevelY: number
): readonly GlacierPolygonLayer[] {
  const layers: GlacierPolygonLayer[] = [];
  for (let p = 0; p < PILLAR_BOUNDARIES_X.length; p++) {
    const lKp =
      p === 0
        ? DEPTH_SAMPLE_RATIOS.map((r) => ({ r, x: GLACIER_CLIFF_BASE_OFFSET_X }))
        : DEPTH_SAMPLE_RATIOS.map((r) => ({ r, x: PILLAR_BOUNDARIES_X[p] }));
    const rKp =
      p >= PILLAR_BOUNDARIES_X.length - 1
        ? RIGHT_CLIFF_KEYPOINTS
        : DEPTH_SAMPLE_RATIOS.map((r) => ({ r, x: PILLAR_BOUNDARIES_X[p + 1] }));
    layers.push({
      points: [
        { x: resolveInterpolatedX(0, lKp), y: seaLevelY },
        { x: resolveInterpolatedX(0, rKp), y: seaLevelY },
        { x: resolveInterpolatedX(1, rKp), y: screenHeight },
        { x: resolveInterpolatedX(1, lKp), y: screenHeight },
      ],
      color: DEPTH_PALETTE_BANDS[p % DEPTH_PALETTE_BANDS.length].topLightColor,
      alpha: 0.94,
    });
    if (p < PILLAR_BOUNDARIES_X.length - 1) {
      layers.push({
        points: [
          { x: resolveInterpolatedX(0, rKp) - 8, y: seaLevelY + 60 },
          { x: resolveInterpolatedX(0, rKp) + 8, y: seaLevelY + 60 },
          { x: resolveInterpolatedX(1, rKp) + 8, y: screenHeight - 80 },
          { x: resolveInterpolatedX(1, rKp) - 8, y: screenHeight - 80 },
        ],
        color: GLACIER_16BIT_COLOR_PALETTE.BATHYAL_SHADOW,
        alpha: 0.8,
      });
    }
  }
  return normalizeGlacierTopBoundaryPoints(layers, seaLevelY);
}
