/**
 * Escultura de Colunas Robustas com Facetas Poligonais Assimétricas (16-Bit)
 *
 * Alterna colunas salientes (iluminadas em ciano) e recuadas (sombreadas em cobalto)
 * com grandes faces poligonais de 4 e 5 lados, evitando faixas horizontais repetitivas.
 */

import {
  COLUMN_SCULPT_PROFILES,
  GLACIER_16BIT_COLOR_PALETTE,
  type GlacierPolygonLayer,
} from "./glacierCliffPalette";
import {
  buildForegroundProtrusionAndCleftLayers,
  buildIndividualAbyssalBaseShadow,
} from "./glacierColumnProtrusions";
import {
  buildVerticalColumnFacetPolygon,
  buildWideChamferedPlatePolygon,
  type ColumnBoundaryKeypoint,
} from "./glacierPolygonMath";

export { type ColumnBoundaryKeypoint };

interface PlateFaceSlice {
  readonly topLeftDepthRatio: number;
  readonly topRightDepthRatio: number;
  readonly bottomLeftDepthRatio: number;
  readonly bottomRightDepthRatio: number;
  readonly leftFraction: number;
  readonly rightFraction: number;
  readonly bottomChamferCenterRatio?: number;
  readonly bottomChamferFraction?: number;
  readonly color: [number, number, number];
  readonly alpha: number;
}

/**
 * Gera colunas robustas com grandes facetas assimétricas (4 e 5 vértices) e
 * contraste claro entre colunas salientes, colunas recuadas e borda oceânica.
 */
export function buildSubmergedColumnFacetLayers(
  leftBoundaryKeypoints: readonly ColumnBoundaryKeypoint[],
  rightBoundaryKeypoints: readonly ColumnBoundaryKeypoint[],
  columnIndex: number,
  totalColumnCount: number,
  seaLevelCoordinateY: number,
  submergedColumnHeight: number
): GlacierPolygonLayer[] {
  const profile = COLUMN_SCULPT_PROFILES[columnIndex % COLUMN_SCULPT_PROFILES.length];
  const isOuterOceanEdge = columnIndex >= totalColumnCount - 2;
  const isFinalCliffColumn = columnIndex === totalColumnCount - 1;
  const leftBound = columnIndex === 0 ? 0 : -0.02;
  const rightBound = isFinalCliffColumn ? 1.0 : 1.02;
  const layers: GlacierPolygonLayer[] = [];

  // 1. Corpo base contínuo da coluna em azul cobalto profundo
  layers.push({
    points: buildVerticalColumnFacetPolygon(
      leftBoundaryKeypoints,
      rightBoundaryKeypoints,
      seaLevelCoordinateY,
      submergedColumnHeight,
      0,
      1.0,
      leftBound,
      rightBound,
      0
    ),
    color: isFinalCliffColumn
      ? GLACIER_16BIT_COLOR_PALETTE.ABYSSAL_COBALT_BASE
      : GLACIER_16BIT_COLOR_PALETTE.OCEAN_COBALT_DEEP,
    alpha: 0.98,
  });

  // 2. Sombra abissal irregular na base de cada coluna
  layers.push(
    ...buildIndividualAbyssalBaseShadow(
      leftBoundaryKeypoints,
      rightBoundaryKeypoints,
      seaLevelCoordinateY,
      submergedColumnHeight,
      profile.abyssRiseRatio,
      columnIndex % 2 === 1
    )
  );

  const splitX = profile.litSplitFraction;
  const overlap = 0.03;
  const slope = profile.diagonalSlope;
  const t1 = profile.upperDepthEnd;
  const t2 = profile.midDepthEnd;
  const t3 = Math.min(0.92, profile.lowerDepthEnd);

  // Paleta ajustada por papel da coluna (saliente, recuada ou transição para o oceano)
  const upperLitColor = isFinalCliffColumn
    ? GLACIER_16BIT_COLOR_PALETTE.CRYSTAL_AZURE
    : isOuterOceanEdge
      ? GLACIER_16BIT_COLOR_PALETTE.SUBSURFACE_TURQUOISE
      : profile.isSalient
        ? GLACIER_16BIT_COLOR_PALETTE.SPECULAR_CYAN_LIGHT
        : GLACIER_16BIT_COLOR_PALETTE.CRYSTAL_AZURE;

  const upperShadeColor = isFinalCliffColumn
    ? GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_MAIN
    : profile.isSalient
      ? GLACIER_16BIT_COLOR_PALETTE.AZURE_MIDTONE_BLEND
      : GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_MAIN;

  const midLitColor = isFinalCliffColumn
    ? GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_MAIN
    : profile.isSalient
      ? GLACIER_16BIT_COLOR_PALETTE.CRYSTAL_AZURE
      : GLACIER_16BIT_COLOR_PALETTE.AZURE_MIDTONE_BLEND;

  const midShadeColor = isFinalCliffColumn
    ? GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_SHADE
    : profile.isSalient
      ? GLACIER_16BIT_COLOR_PALETTE.SAPPHIRE_DEEP_BLEND
      : GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_SHADE;

  const lowerLitColor = isFinalCliffColumn
    ? GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_SHADE
    : profile.isSalient
      ? GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_MAIN
      : GLACIER_16BIT_COLOR_PALETTE.SAPPHIRE_DEEP_BLEND;

  const lowerShadeColor = isFinalCliffColumn
    ? GLACIER_16BIT_COLOR_PALETTE.OCEAN_COBALT_DEEP
    : GLACIER_16BIT_COLOR_PALETTE.COBALT_ABYSSAL_MID;

  const cleanFacetSlices: PlateFaceSlice[] = [
    // Terço inferior: grandes facetas profundas mergulhando no azul-marinho
    {
      topLeftDepthRatio: t2 - slope * 0.6,
      topRightDepthRatio: t2 + slope * 0.4,
      bottomLeftDepthRatio: t3 - slope * 0.3,
      bottomRightDepthRatio: t3 + 0.04,
      leftFraction: Math.max(0.28, splitX - overlap),
      rightFraction: rightBound,
      bottomChamferCenterRatio: Math.min(0.97, t3 + 0.05),
      bottomChamferFraction: 0.72,
      color: lowerShadeColor,
      alpha: 0.92,
    },
    {
      topLeftDepthRatio: t2 + slope * 0.4,
      topRightDepthRatio: t2 - slope * 0.6,
      bottomLeftDepthRatio: t3 + 0.02,
      bottomRightDepthRatio: t3 - slope * 0.4,
      leftFraction: leftBound,
      rightFraction: Math.min(0.76, splitX + overlap),
      bottomChamferCenterRatio: Math.min(0.97, t3 + 0.04),
      bottomChamferFraction: splitX * 0.55,
      color: lowerLitColor,
      alpha: 0.92,
    },

    // Terço médio: planos largos em azul-celeste e azul-cobalto
    {
      topLeftDepthRatio: t1 - slope,
      topRightDepthRatio: t1 + slope * 0.5,
      bottomLeftDepthRatio: t2 - slope * 0.6,
      bottomRightDepthRatio: t2 + slope * 0.4,
      leftFraction: Math.max(0.28, splitX - overlap),
      rightFraction: rightBound,
      color: midShadeColor,
      alpha: 0.95,
    },
    {
      topLeftDepthRatio: t1 + slope * 0.5,
      topRightDepthRatio: t1 - slope,
      bottomLeftDepthRatio: t2 + slope * 0.4,
      bottomRightDepthRatio: t2 - slope * 0.6,
      leftFraction: leftBound,
      rightFraction: Math.min(0.76, splitX + overlap),
      bottomChamferCenterRatio: t2 + 0.03,
      bottomChamferFraction: splitX * 0.6,
      color: midLitColor,
      alpha: 0.95,
    },

    // Terço superior: iluminação predominante da superfície (ciano e azul-gelo)
    {
      topLeftDepthRatio: 0,
      topRightDepthRatio: 0,
      bottomLeftDepthRatio: t1 - slope,
      bottomRightDepthRatio: t1 + slope * 0.5,
      leftFraction: Math.max(0.28, splitX - overlap),
      rightFraction: rightBound,
      color: upperShadeColor,
      alpha: 0.96,
    },
    {
      topLeftDepthRatio: 0,
      topRightDepthRatio: 0,
      bottomLeftDepthRatio: t1 + slope * 0.5,
      bottomRightDepthRatio: t1 - slope,
      leftFraction: leftBound,
      rightFraction: Math.min(0.76, splitX + overlap),
      color: upperLitColor,
      alpha: 0.96,
    },
  ];

  // Realce especular apenas nas colunas salientes (evita faixa horizontal contínua)
  if (profile.isSalient && !isFinalCliffColumn) {
    cleanFacetSlices.push({
      topLeftDepthRatio: 0,
      topRightDepthRatio: 0,
      bottomLeftDepthRatio: t1 * 0.48,
      bottomRightDepthRatio: t1 * 0.28,
      leftFraction: leftBound,
      rightFraction: Math.min(0.68, splitX),
      color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_ICE_HIGHLIGHT,
      alpha: 0.78,
    });
  }

  for (const facetSlice of cleanFacetSlices) {
    layers.push({
      points: buildWideChamferedPlatePolygon({
        leftBoundaryKeypoints,
        rightBoundaryKeypoints,
        seaLevelCoordinateY,
        submergedColumnHeight,
        topLeftDepthRatio: facetSlice.topLeftDepthRatio,
        topRightDepthRatio: facetSlice.topRightDepthRatio,
        bottomLeftDepthRatio: facetSlice.bottomLeftDepthRatio,
        bottomRightDepthRatio: facetSlice.bottomRightDepthRatio,
        leftFraction: facetSlice.leftFraction,
        rightFraction: facetSlice.rightFraction,
        bottomChamferCenterRatio: facetSlice.bottomChamferCenterRatio,
        bottomChamferFraction: facetSlice.bottomChamferFraction,
      }),
      color: facetSlice.color,
      alpha: facetSlice.alpha,
    });
  }

  layers.push(
    ...buildForegroundProtrusionAndCleftLayers(
      leftBoundaryKeypoints,
      rightBoundaryKeypoints,
      columnIndex,
      totalColumnCount,
      seaLevelCoordinateY,
      submergedColumnHeight
    )
  );

  return layers;
}
