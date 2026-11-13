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
  SPECULAR_CYAN_LIGHT: [132, 235, 252] as [number, number, number],
  SUBSURFACE_TURQUOISE: [52, 184, 224] as [number, number, number],
  CRYSTAL_AZURE: [78, 174, 226] as [number, number, number],
  GLACIAL_BLUE_MAIN: [44, 128, 194] as [number, number, number],
  GLACIAL_BLUE_SHADE: [26, 86, 152] as [number, number, number],
  OCEAN_COBALT_DEEP: [18, 56, 114] as [number, number, number],
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
  -1260,
  -1085,
  -915,
  -745,
  -580,
  -420,
  -265,
  -120,
];

export const RIGHT_CLIFF_KEYPOINTS: ReadonlyArray<{ readonly r: number; readonly x: number }> = [
  { r: 0, x: 26 },
  { r: 0.16, x: 30 },
  { r: 0.34, x: 22 },
  { r: 0.52, x: 28 },
  { r: 0.72, x: 46 },
  { r: 0.88, x: 88 },
  { r: 1.0, x: 136 },
];

export const DEPTH_SAMPLE_RATIOS: readonly number[] = [0, 0.22, 0.48, 0.74, 1.0];

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
