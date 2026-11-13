/**
 * Geometria 16-Bit da Falésia Glacial Submersa (Antártica) — Micro Splash
 *
 * Reproduz a estética da arte de referência 16-bit: paredão glacial maciço com
 * contrafortes verticais irregulares, cristas cristalinas ramificadas em ciano/turquesa,
 * fendas abissais profundas, linha d'água cintilante e picos nevados com nervuras.
 */

import {
  DEPTH_PALETTE_BANDS,
  DEPTH_SAMPLE_RATIOS,
  extendSeamlessGlacierToLeftBoundary,
  GLACIER_16BIT_COLOR_PALETTE,
  GLACIER_CLIFF_BASE_OFFSET_X,
  normalizeGlacierTopBoundaryPoints,
  PILLAR_BOUNDARIES_X,
  RIGHT_CLIFF_KEYPOINTS,
  resolveInterpolatedX,
  type GlacierPoint,
  type GlacierPolygonLayer,
} from "./glacierCliffPalette";

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
  return DEPTH_SAMPLE_RATIOS.map((r, depthIndex) => {
    const organicOffset = Math.round(Math.sin(pillarIndex * 2.7 + depthIndex * 2.1) * 22);
    return { r, x: baseX + organicOffset };
  });
}

function buildSpinePolygon(
  leftKeypoints: ReadonlyArray<{ readonly r: number; readonly x: number }>,
  rightKeypoints: ReadonlyArray<{ readonly r: number; readonly x: number }>,
  seaLevelY: number,
  submergedHeight: number,
  startRatio: number,
  endRatio: number,
  leftFrac: number,
  rightFrac: number,
  taperFrac: number
): GlacierPoint[] {
  const steps = 4;
  const leftPts: GlacierPoint[] = [];
  const rightPts: GlacierPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = startRatio + (endRatio - startRatio) * t;
    const y = seaLevelY + Math.round(submergedHeight * r);
    const lx = resolveInterpolatedX(r, leftKeypoints);
    const rx = resolveInterpolatedX(r, rightKeypoints);
    const w = rx - lx;
    const jag = Math.round(Math.sin(t * 7.5 + leftFrac * 11) * 7);
    const lEdge = Math.round(lx + w * (leftFrac + taperFrac * t * 0.35)) + jag;
    const rEdge = Math.round(lx + w * (rightFrac - taperFrac * t * 0.55)) + jag;
    leftPts.push({ x: lEdge, y });
    rightPts.unshift({ x: Math.max(lEdge + 6, rEdge), y });
  }
  return [...leftPts, ...rightPts];
}

/**
 * Renderiza contrafortes glaciais 16-bit com fendas abissais profundas, massa azul glacial
 * intermediária, cristas cristalinas ramificadas em turquesa/ciano e realces na linha d'água.
 */
export function renderMonolithicVerticalShardsWithDiagonalFaults(
  screenHeight: number,
  seaLevelY: number
): readonly GlacierPolygonLayer[] {
  const submergedHeight = Math.max(1, screenHeight - seaLevelY);
  const layers: GlacierPolygonLayer[] = [];
  const totalPillars = PILLAR_BOUNDARIES_X.length;

  for (let p = 0; p < totalPillars; p++) {
    const leftKp = resolvePillarEdgeKeypoints(p);
    const rightKp = resolvePillarEdgeKeypoints(p + 1);
    const phase = (p % 3) * 0.06;

    // 1. Corpo do contraforte em azul glacial médio (cobre de topo a base com sobreposição lateral)
    layers.push({
      points: buildSpinePolygon(
        leftKp,
        rightKp,
        seaLevelY,
        submergedHeight,
        0,
        1.0,
        -0.04,
        1.04,
        0
      ),
      color:
        p % 2 === 0
          ? GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_SHADE
          : GLACIER_16BIT_COLOR_PALETTE.OCEAN_COBALT_DEEP,
      alpha: 0.96,
    });

    // 2. Face intermediária iluminada em azul glacial e azul cristal (0..0.84)
    layers.push({
      points: buildSpinePolygon(
        leftKp,
        rightKp,
        seaLevelY,
        submergedHeight,
        0,
        0.84 - phase,
        0.06,
        0.72,
        0.28
      ),
      color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_MAIN,
      alpha: 0.95,
    });
    layers.push({
      points: buildSpinePolygon(
        leftKp,
        rightKp,
        seaLevelY,
        submergedHeight,
        0.08,
        0.72 - phase,
        0.14,
        0.58,
        0.24
      ),
      color: GLACIER_16BIT_COLOR_PALETTE.CRYSTAL_AZURE,
      alpha: 0.88,
    });

    // 3. Crista subsuperficial turquesa e ramo diagonal secundário (efeito 16-bit escarpado)
    layers.push({
      points: buildSpinePolygon(
        leftKp,
        rightKp,
        seaLevelY,
        submergedHeight,
        0,
        0.54 + phase,
        0.08,
        0.46,
        0.26
      ),
      color: GLACIER_16BIT_COLOR_PALETTE.SUBSURFACE_TURQUOISE,
      alpha: 0.94,
    });
    layers.push({
      points: buildSpinePolygon(
        leftKp,
        rightKp,
        seaLevelY,
        submergedHeight,
        0.24,
        0.68,
        0.32,
        0.62,
        0.22
      ),
      color: DEPTH_PALETTE_BANDS[1].topLightColor,
      alpha: 0.86,
    });

    // 4. Espinha especular ciano/branca na aresta esquerda e reflexo na linha d'água
    layers.push({
      points: buildSpinePolygon(
        leftKp,
        rightKp,
        seaLevelY,
        submergedHeight,
        0,
        0.42 + phase * 0.5,
        0.1,
        0.3,
        0.18
      ),
      color: GLACIER_16BIT_COLOR_PALETTE.SPECULAR_CYAN_LIGHT,
      alpha: 0.95,
    });
    layers.push({
      points: buildSpinePolygon(
        leftKp,
        rightKp,
        seaLevelY,
        submergedHeight,
        0,
        0.16,
        0.06,
        0.42,
        0.2
      ),
      color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_EMERGED_LIGHT,
      alpha: 0.92,
    });

    // 5. Fenda de sombra abissal profunda entre contrafortes adjacentes
    if (p < totalPillars - 1) {
      layers.push({
        points: buildSpinePolygon(
          leftKp,
          rightKp,
          seaLevelY,
          submergedHeight,
          0.04,
          1.0,
          0.84,
          1.06,
          -0.04
        ),
        color: GLACIER_16BIT_COLOR_PALETTE.BATHYAL_SHADOW,
        alpha: 0.84,
      });
    }
  }

  return normalizeGlacierTopBoundaryPoints(layers, seaLevelY);
}

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

/**
 * Renderiza o polígono de fundo maciço contínuo por trás de todos os contrafortes
 * (`OCEAN_COBALT_DEEP`, `GLACIAL_BLUE_MAIN` e `GLACIAL_BLUE_SHADE`).
 */
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
        { x: 30, y: seaLevelY + Math.round(submergedHeight * 0.16) },
        { x: 22, y: seaLevelY + Math.round(submergedHeight * 0.34) },
        { x: 28, y: seaLevelY + Math.round(submergedHeight * 0.52) },
        { x: 38, y: seaLevelY + Math.round(submergedHeight * 0.64) },
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY + Math.round(submergedHeight * 0.64) },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_MAIN,
      alpha: 0.94,
    },
    {
      points: [
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY + Math.round(submergedHeight * 0.28) },
        { x: 24, y: seaLevelY + Math.round(submergedHeight * 0.28) },
        { x: 28, y: seaLevelY + Math.round(submergedHeight * 0.52) },
        { x: 46, y: seaLevelY + Math.round(submergedHeight * 0.72) },
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY + Math.round(submergedHeight * 0.72) },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_SHADE,
      alpha: 0.72,
    },
  ];
}

/**
 * Gera as camadas da falésia submersa, talus do leito marinho e corpo emerso.
 */
export function createSubmergedGlacierCliffLayers(
  screenHeight: number,
  seaLevelY: number,
  snowCrestHeight: number
): readonly GlacierPolygonLayer[] {
  const submergedHeight = Math.max(1, screenHeight - seaLevelY);
  const layers: GlacierPolygonLayer[] = [
    ...renderSolidGlacierBackdropBase(screenHeight, seaLevelY),
  ];

  layers.push(...renderMonolithicVerticalShardsWithDiagonalFaults(screenHeight, seaLevelY));

  // Contrafortes abissais na base do leito submarino (esporões escuros como na referência)
  layers.push(
    {
      points: [
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY + Math.round(submergedHeight * 0.74) },
        { x: 64, y: seaLevelY + Math.round(submergedHeight * 0.79) },
        { x: 118, y: seaLevelY + Math.round(submergedHeight * 0.91) },
        { x: 175, y: screenHeight },
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: screenHeight },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.BATHYAL_SHADOW,
      alpha: 0.72,
    },
    {
      points: [
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY + Math.round(submergedHeight * 0.88) },
        { x: 96, y: seaLevelY + Math.round(submergedHeight * 0.94) },
        { x: 220, y: screenHeight },
        { x: GLACIER_CLIFF_BASE_OFFSET_X, y: screenHeight },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.ABYSSAL_COBALT_BASE,
      alpha: 0.82,
    }
  );

  // Corpo glacial emerso com nervuras verticais acima da linha d'água
  layers.push({
    points: [
      { x: GLACIER_CLIFF_BASE_OFFSET_X, y: snowCrestHeight },
      { x: 22, y: snowCrestHeight },
      { x: 28, y: Math.round((snowCrestHeight + seaLevelY) * 0.55) },
      { x: 26, y: seaLevelY + 2 },
      { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelY + 2 },
    ],
    color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_EMERGED_BODY,
    alpha: 0.98,
  });
  for (let rx = GLACIER_CLIFF_BASE_OFFSET_X + 40; rx < 20; rx += 75) {
    layers.push({
      points: [
        { x: rx, y: snowCrestHeight },
        { x: rx + 24, y: snowCrestHeight },
        { x: rx + 18, y: seaLevelY + 2 },
        { x: rx - 4, y: seaLevelY + 2 },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_EMERGED_CLEAVAGE,
      alpha: 0.78,
    });
  }

  return layers;
}

/**
 * Gera picos alpinos de neve serrilhados com nervuras azuis glaciais (0 <= y <= snowCrestHeight).
 */
export function createAlpineSnowCrestLayers(
  snowCrestHeight: number
): readonly GlacierPolygonLayer[] {
  const layers: GlacierPolygonLayer[] = [];
  const stepWidth = 96;
  const serratedTopPoints: GlacierPoint[] = [];

  for (let x = GLACIER_CLIFF_BASE_OFFSET_X; x <= 20; x += stepWidth) {
    const idx = Math.round((x - GLACIER_CLIFF_BASE_OFFSET_X) / stepWidth);
    const peakY = idx % 2 === 0 ? 0 : Math.round(snowCrestHeight * 0.14);
    const valleyY = Math.round(snowCrestHeight * (0.44 + (idx % 3) * 0.08));
    serratedTopPoints.push({ x, y: peakY });
    if (x + Math.round(stepWidth * 0.5) < 20) {
      serratedTopPoints.push({ x: x + Math.round(stepWidth * 0.5), y: valleyY });
    }
  }

  layers.push({
    points: [
      ...serratedTopPoints,
      { x: 20, y: 0 },
      { x: 24, y: Math.round(snowCrestHeight * 0.56) },
      { x: 22, y: snowCrestHeight },
      { x: GLACIER_CLIFF_BASE_OFFSET_X, y: snowCrestHeight },
    ],
    color: GLACIER_16BIT_COLOR_PALETTE.SNOW_CREST_PURE,
    alpha: 1.0,
  });

  for (let x = GLACIER_CLIFF_BASE_OFFSET_X; x < 16; x += stepWidth) {
    const idx = Math.round((x - GLACIER_CLIFF_BASE_OFFSET_X) / stepWidth);
    const peakX = x + Math.round(stepWidth * 0.18);
    const rightX = Math.min(22, x + Math.round(stepWidth * 0.64));
    const peakY = idx % 2 === 0 ? 0 : Math.round(snowCrestHeight * 0.14);
    layers.push({
      points: [
        { x: peakX, y: peakY },
        { x: rightX, y: snowCrestHeight },
        { x: peakX - 8, y: snowCrestHeight },
      ],
      color:
        idx % 2 === 0
          ? GLACIER_16BIT_COLOR_PALETTE.SNOW_CREST_SHADOW
          : GLACIER_16BIT_COLOR_PALETTE.SNOW_CREST_AZURE,
      alpha: 0.9,
    });
  }

  return layers;
}
