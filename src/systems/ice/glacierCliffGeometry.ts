/**
 * Geometria e Renderização 16-Bit da Grande Geleira Flutuante (Antártica) — PixiJS 8
 *
 * Subdivide a massa glacial em dezenas de formações verticais fundidas de larguras,
 * comprimentos e inclinações variadas, com facetas pequenas, médias e grandes em pixel art
 * (bordas em degraus), cadeia de picos nevados e silhueta submersa irregular.
 */

import {
  DEFAULT_COLOSSAL_ICEBERG_SEED,
  generateColossalIcebergSpec,
  type ColossalIcebergGenerationOptions,
  type ColossalIcebergSpec,
} from "./colossalIcebergGenerator";
import {
  appendConnectedBaseButtresses,
  appendFormationSubfacets,
  snapStep,
} from "./glacierBaseAndFormationFacets";
import {
  extendSeamlessGlacierToLeftBoundary,
  GLACIER_16BIT_COLOR_PALETTE,
  GLACIER_CLIFF_BASE_OFFSET_X,
  ICEBERG_FAMILY_PALETTE,
  normalizeGlacierTopBoundaryPoints,
  renderMonolithicVerticalShardsWithDiagonalFaults,
  renderSolidGlacierBackdropBase,
  type GlacierPoint,
  type GlacierPolygonLayer,
} from "./glacierCliffPalette";

export {
  DEFAULT_COLOSSAL_ICEBERG_SEED,
  extendSeamlessGlacierToLeftBoundary,
  generateColossalIcebergSpec,
  GLACIER_16BIT_COLOR_PALETTE,
  GLACIER_CLIFF_BASE_OFFSET_X,
  ICEBERG_FAMILY_PALETTE,
  normalizeGlacierTopBoundaryPoints,
  renderMonolithicVerticalShardsWithDiagonalFaults,
  renderSolidGlacierBackdropBase,
  type ColossalIcebergGenerationOptions,
  type ColossalIcebergSpec,
  type GlacierPoint,
  type GlacierPolygonLayer,
};

/**
 * Gera a grande geleira flutuante com silhueta orgânica, dezenas de formações verticais
 * subdivididas em facetas pixel art, cadeia de picos e base submersa irregular.
 */
export function createColossalFloatingIcebergLayers(
  screenHeight: number,
  seaLevelY: number,
  options: ColossalIcebergGenerationOptions = {}
): readonly GlacierPolygonLayer[] {
  const spec = generateColossalIcebergSpec(screenHeight, seaLevelY, options);
  const layers: GlacierPolygonLayer[] = [];

  // --- CAMADA 3: Massa Submersa Contínua + Formações Verticais Subdivididas ---
  layers.push({
    points: spec.submergedContour,
    color: ICEBERG_FAMILY_PALETTE.SUBMERGED_MID,
    alpha: 0.98,
    stroke: { color: ICEBERG_FAMILY_PALETTE.SUBMERGED_DEEP, width: 1.5, alpha: 0.85 },
  });

  for (const formation of spec.formations) {
    appendFormationSubfacets(layers, formation);
  }
  appendConnectedBaseButtresses(layers, spec);

  // --- CAMADA 2: Cadeia de Montanhas de Gelo Emersas com Contorno Pixel Art ---
  layers.push({
    points: spec.surfaceContour,
    color: ICEBERG_FAMILY_PALETTE.EMERGED_MID,
    alpha: 0.98,
    stroke: { color: ICEBERG_FAMILY_PALETTE.EMERGED_OUTLINE, width: 2, alpha: 0.92 },
  });

  for (let i = 0; i < spec.peaks.length; i++) {
    const { left, peak, right } = spec.peaks[i];
    const baseY = seaLevelY + 2;
    const midRidgeX = snapStep(peak.x + (i % 2 === 0 ? 6 : -4));

    layers.push({
      points: [
        { x: left.x, y: left.y },
        { x: peak.x, y: peak.y },
        { x: midRidgeX, y: baseY },
        { x: left.x, y: baseY },
      ],
      color: ICEBERG_FAMILY_PALETTE.EMERGED_HIGHLIGHT,
      alpha: 0.9,
    });
    layers.push({
      points: [
        { x: peak.x, y: peak.y },
        { x: right.x, y: right.y },
        { x: right.x, y: baseY },
        { x: midRidgeX - 2, y: baseY },
      ],
      color: ICEBERG_FAMILY_PALETTE.EMERGED_SHADE,
      alpha: 0.85,
    });
    const leftCapX = snapStep(peak.x + (left.x - peak.x) * 0.42);
    const leftCapY = snapStep(peak.y + (left.y - peak.y) * 0.42);
    const rightCapX = snapStep(peak.x + (right.x - peak.x) * 0.42);
    const rightCapY = snapStep(peak.y + (right.y - peak.y) * 0.42);
    const midCapY = snapStep(peak.y + (seaLevelY - peak.y) * 0.36);

    layers.push({
      points: [
        { x: leftCapX, y: leftCapY },
        { x: peak.x, y: peak.y },
        { x: rightCapX, y: rightCapY },
        { x: snapStep(peak.x + 2), y: midCapY },
      ],
      color: ICEBERG_FAMILY_PALETTE.SNOW_ICE,
      alpha: 0.94,
    });

    const pureLeftX = snapStep(peak.x + (left.x - peak.x) * 0.28);
    const pureLeftY = snapStep(peak.y + (left.y - peak.y) * 0.28);
    const pureRightX = snapStep(peak.x + (right.x - peak.x) * 0.24);
    const pureRightY = snapStep(peak.y + (right.y - peak.y) * 0.24);
    const pureMidY = snapStep(peak.y + (seaLevelY - peak.y) * 0.22);

    layers.push({
      points: [
        { x: pureLeftX, y: pureLeftY },
        { x: peak.x, y: peak.y },
        { x: pureRightX, y: pureRightY },
        { x: peak.x, y: pureMidY },
      ],
      color: ICEBERG_FAMILY_PALETTE.SNOW_PURE,
      alpha: 0.98,
    });
  }

  // Realce especular na linha d'água
  layers.push({
    points: [
      { x: spec.leftBoundaryX + 2, y: seaLevelY - 1 },
      { x: spec.rightWaterlineX - 2, y: seaLevelY - 1 },
      { x: spec.rightWaterlineX - 6, y: seaLevelY + 3 },
      { x: spec.leftBoundaryX + 2, y: seaLevelY + 3 },
    ],
    color: ICEBERG_FAMILY_PALETTE.WATERLINE_FOAM,
    alpha: 0.8,
  });

  return layers;
}

/**
 * Gera a camada de neve superior dos picos do iceberg colossal (`0 <= y <= snowCrestHeight`).
 */
export function createAlpineSnowCrestLayers(
  snowCrestHeight: number,
  seed: number = DEFAULT_COLOSSAL_ICEBERG_SEED
): readonly GlacierPolygonLayer[] {
  const spec = generateColossalIcebergSpec(720, Math.max(24, snowCrestHeight * 3), { seed });
  const layers: GlacierPolygonLayer[] = [];
  const snowEndX = Math.min(-8, spec.rightWaterlineX - 34);

  const topRidgePoints: GlacierPoint[] = spec.peaks.flatMap(({ left, peak }, idx) => {
    const peakY =
      idx % 3 === 0
        ? 0
        : idx % 2 === 0
          ? Math.round(snowCrestHeight * 0.14)
          : Math.round(snowCrestHeight * 0.28);
    const valleyY = Math.round(snowCrestHeight * (0.48 + (idx % 3) * 0.1));
    return [
      { x: left.x, y: valleyY },
      { x: peak.x, y: peakY },
    ];
  });

  // Camada legada mantida transparente (alpha: 0) para não flutuar no céu acima dos picos reais
  layers.push({
    points: [
      { x: GLACIER_CLIFF_BASE_OFFSET_X, y: Math.round(snowCrestHeight * 0.35) },
      ...topRidgePoints.filter((pt) => pt.x < snowEndX),
      { x: snowEndX - 4, y: Math.round(snowCrestHeight * 0.55) },
      { x: snowEndX, y: snowCrestHeight },
      { x: GLACIER_CLIFF_BASE_OFFSET_X, y: snowCrestHeight },
    ],
    color: ICEBERG_FAMILY_PALETTE.SNOW_PURE,
    alpha: 0,
  });

  for (let i = 0; i < spec.peaks.length; i++) {
    const { left, peak, right } = spec.peaks[i];
    const peakY = i % 3 === 0 ? 0 : Math.round(snowCrestHeight * 0.2);
    const capBottomY = Math.round(snowCrestHeight * 0.82);
    const rightCapX = Math.round(peak.x + (right.x - peak.x) * 0.55);
    layers.push({
      points: [
        { x: left.x, y: capBottomY },
        { x: peak.x, y: peakY },
        { x: rightCapX, y: capBottomY },
        { x: peak.x + 4, y: snowCrestHeight },
      ],
      color: ICEBERG_FAMILY_PALETTE.SNOW_ICE,
      alpha: 0,
    });
  }

  return layers;
}

export function createSubmergedGlacierCliffLayers(
  screenHeight: number,
  seaLevelY: number,
  _snowCrestHeight: number,
  seed: number = DEFAULT_COLOSSAL_ICEBERG_SEED
): readonly GlacierPolygonLayer[] {
  return createColossalFloatingIcebergLayers(screenHeight, seaLevelY, { seed });
}

export const renderBroadIrregularGlacierMasses = renderMonolithicVerticalShardsWithDiagonalFaults;
export const renderCleanFacetedGlacierColumns = renderMonolithicVerticalShardsWithDiagonalFaults;
export const renderInterlockingDiagonalGlacierBlocks =
  renderMonolithicVerticalShardsWithDiagonalFaults;
export const renderSolidWidePolygonalGlacierBlocks =
  renderMonolithicVerticalShardsWithDiagonalFaults;
export const renderMassiveMonolithicIceBlocks = renderMonolithicVerticalShardsWithDiagonalFaults;
export const renderAuthenticGlacierFractures = renderMonolithicVerticalShardsWithDiagonalFaults;
export const renderMassiveVerticalGlacierPillars = renderMonolithicVerticalShardsWithDiagonalFaults;
export const createChaoticIceBlockMatrix = renderMonolithicVerticalShardsWithDiagonalFaults;
export const renderChaoticFracturedIceBlocks = renderMonolithicVerticalShardsWithDiagonalFaults;
export const renderTriangularFacetedGlacierBlocks =
  renderMonolithicVerticalShardsWithDiagonalFaults;
export const createTriangularFacetedGlacierBlocks =
  renderMonolithicVerticalShardsWithDiagonalFaults;
export const renderUniformlyDetailedGlacierBlocks =
  renderMonolithicVerticalShardsWithDiagonalFaults;
export const createOrganicFracturedGlacierBlocks = renderMonolithicVerticalShardsWithDiagonalFaults;
export const createVerticalFacetedGlacierPrisms = renderMonolithicVerticalShardsWithDiagonalFaults;
