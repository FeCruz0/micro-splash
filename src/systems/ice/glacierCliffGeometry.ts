/**
 * Geometria 16-Bit da Falésia Glacial Submersa (Antártica) — Micro Splash
 *
 * Orquestra os contrafortes verticais densos, cristas cristalinas ramificadas,
 * fendas abissais, talus marinho e pináculos nevados com nervuras direcionais.
 */

import {
  DEPTH_SAMPLE_RATIOS,
  extendSeamlessGlacierToLeftBoundary,
  GLACIER_16BIT_COLOR_PALETTE,
  GLACIER_CLIFF_BASE_OFFSET_X,
  normalizeGlacierTopBoundaryPoints,
  PILLAR_BOUNDARIES_X,
  RIGHT_CLIFF_KEYPOINTS,
  type GlacierPoint,
  type GlacierPolygonLayer,
} from "./glacierCliffPalette";
import { buildSubmergedColumnFacetLayers } from "./glacierColumnFacets";
import {
  buildAlpineSnowCrestPeakLayers,
  buildEmergedGlacierSpireLayers,
  buildSubmarineTalusButtressLayers,
} from "./glacierEmergedAndTalus";

export {
  extendSeamlessGlacierToLeftBoundary,
  GLACIER_16BIT_COLOR_PALETTE,
  GLACIER_CLIFF_BASE_OFFSET_X,
  normalizeGlacierTopBoundaryPoints,
  type GlacierPoint,
  type GlacierPolygonLayer,
};

function resolvePillarEdgeKeypoints(
  pillarIndex: number
): ReadonlyArray<{ readonly r: number; readonly x: number }> {
  if (pillarIndex === 0) {
    return DEPTH_SAMPLE_RATIOS.map((r) => ({ r, x: GLACIER_CLIFF_BASE_OFFSET_X }));
  }
  if (pillarIndex >= PILLAR_BOUNDARIES_X.length) {
    return RIGHT_CLIFF_KEYPOINTS;
  }
  const baseX = PILLAR_BOUNDARIES_X[pillarIndex];
  const previousSpan = Math.abs(baseX - PILLAR_BOUNDARIES_X[pillarIndex - 1]);
  const nextSpan =
    pillarIndex + 1 < PILLAR_BOUNDARIES_X.length
      ? Math.abs(PILLAR_BOUNDARIES_X[pillarIndex + 1] - baseX)
      : previousSpan;
  const maxSafeAmplitude = Math.max(
    8,
    Math.min(20, Math.floor(Math.min(previousSpan, nextSpan) * 0.2))
  );

  return DEPTH_SAMPLE_RATIOS.map((r, depthIndex) => {
    const harmonic =
      Math.sin(pillarIndex * 2.15 + depthIndex * 1.45) * 0.65 +
      Math.cos(pillarIndex * 3.6 - depthIndex * 2.1) * 0.35;
    const organicOffset = Math.round(harmonic * maxSafeAmplitude);
    return { r, x: baseX + organicOffset };
  });
}

/**
 * Renderiza massas glaciais 16-bit amplas e irregulares com cristas de luz quebradas,
 * bifurcações diagonais e sombras abissais individuais na base de cada bloco.
 */
export function renderBroadIrregularGlacierMasses(
  screenHeight: number,
  seaLevelY: number
): readonly GlacierPolygonLayer[] {
  const submergedHeight = Math.max(1, screenHeight - seaLevelY);
  const layers: GlacierPolygonLayer[] = [];
  const totalPillars = PILLAR_BOUNDARIES_X.length;

  for (let pillarIndex = 0; pillarIndex < totalPillars; pillarIndex++) {
    const leftKeypoints = resolvePillarEdgeKeypoints(pillarIndex);
    const rightKeypoints = resolvePillarEdgeKeypoints(pillarIndex + 1);
    layers.push(
      ...buildSubmergedColumnFacetLayers(
        leftKeypoints,
        rightKeypoints,
        pillarIndex,
        totalPillars,
        seaLevelY,
        submergedHeight
      )
    );
  }

  return normalizeGlacierTopBoundaryPoints(layers, seaLevelY);
}

export const renderCleanFacetedGlacierColumns = renderBroadIrregularGlacierMasses;
export const renderInterlockingDiagonalGlacierBlocks = renderBroadIrregularGlacierMasses;
export const renderSolidWidePolygonalGlacierBlocks = renderBroadIrregularGlacierMasses;
export const renderMonolithicVerticalShardsWithDiagonalFaults = renderBroadIrregularGlacierMasses;
export const renderMassiveMonolithicIceBlocks = renderBroadIrregularGlacierMasses;
export const renderAuthenticGlacierFractures = renderBroadIrregularGlacierMasses;
export const renderMassiveVerticalGlacierPillars = renderBroadIrregularGlacierMasses;
export const createChaoticIceBlockMatrix = renderBroadIrregularGlacierMasses;
export const renderChaoticFracturedIceBlocks = renderBroadIrregularGlacierMasses;
export const renderTriangularFacetedGlacierBlocks = renderBroadIrregularGlacierMasses;
export const createTriangularFacetedGlacierBlocks = renderBroadIrregularGlacierMasses;
export const renderUniformlyDetailedGlacierBlocks = renderBroadIrregularGlacierMasses;
export const createOrganicFracturedGlacierBlocks = renderBroadIrregularGlacierMasses;
export const createVerticalFacetedGlacierPrisms = renderBroadIrregularGlacierMasses;

/**
 * Renderiza o polígono de fundo maciço contínuo por trás de todas as massas glaciais
 * (`OCEAN_COBALT_DEEP`, `GLACIAL_BLUE_MAIN` e `GLACIAL_BLUE_SHADE`).
 */
export function renderSolidGlacierBackdropBase(
  screenHeight: number,
  seaLevelY: number
): readonly GlacierPolygonLayer[] {
  const submergedHeight = Math.max(1, screenHeight - seaLevelY);
  const outerCliffPolygonPoints: GlacierPoint[] = [
    { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY },
    ...RIGHT_CLIFF_KEYPOINTS.map((keypoint) => ({
      x: keypoint.x,
      y: seaLevelY + Math.round(submergedHeight * keypoint.r),
    })),
    { x: GLACIER_CLIFF_BASE_OFFSET_X, y: screenHeight },
  ];

  return [
    {
      points: outerCliffPolygonPoints,
      color: GLACIER_16BIT_COLOR_PALETTE.OCEAN_COBALT_DEEP,
      alpha: 1.0,
    },
    {
      points: [
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY },
        ...RIGHT_CLIFF_KEYPOINTS.slice(0, 6).map((keypoint) => ({
          x: keypoint.x,
          y: seaLevelY + Math.round(submergedHeight * keypoint.r),
        })),
        { x: -240, y: seaLevelY + Math.round(submergedHeight * 0.62) },
        { x: -640, y: seaLevelY + Math.round(submergedHeight * 0.8) },
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY + Math.round(submergedHeight * 0.68) },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_MAIN,
      alpha: 0.9,
    },
    {
      points: [
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY + Math.round(submergedHeight * 0.34) },
        { x: -320, y: seaLevelY + Math.round(submergedHeight * 0.24) },
        { x: 19, y: seaLevelY + Math.round(submergedHeight * 0.32) },
        { x: 34, y: seaLevelY + Math.round(submergedHeight * 0.64) },
        { x: 108, y: seaLevelY + Math.round(submergedHeight * 0.9) },
        { x: 158, y: screenHeight },
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: screenHeight },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_SHADE,
      alpha: 0.68,
    },
  ];
}

/**
 * Gera as camadas da falésia submersa, talus do leito marinho e pináculos emersos.
 */
export function createSubmergedGlacierCliffLayers(
  screenHeight: number,
  seaLevelY: number,
  snowCrestHeight: number
): readonly GlacierPolygonLayer[] {
  const submergedAndTalusLayers = normalizeGlacierTopBoundaryPoints(
    [
      ...renderSolidGlacierBackdropBase(screenHeight, seaLevelY),
      ...renderMonolithicVerticalShardsWithDiagonalFaults(screenHeight, seaLevelY),
      ...buildSubmarineTalusButtressLayers(screenHeight, seaLevelY),
    ],
    seaLevelY
  );

  return [
    ...submergedAndTalusLayers,
    ...buildEmergedGlacierSpireLayers(seaLevelY, snowCrestHeight),
  ];
}

/**
 * Gera picos alpinos de neve serrilhados com nervuras azuis glaciais (0 <= y <= snowCrestHeight).
 */
export function createAlpineSnowCrestLayers(
  snowCrestHeight: number
): readonly GlacierPolygonLayer[] {
  return buildAlpineSnowCrestPeakLayers(snowCrestHeight);
}
