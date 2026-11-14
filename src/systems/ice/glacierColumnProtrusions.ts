/**
 * Sombras Abissais Individuais e Juntas Equilibradas Entre Colunas Glaciais (16-Bit)
 */

import {
  GLACIER_16BIT_COLOR_PALETTE,
  resolveInterpolatedX,
  type GlacierPolygonLayer,
} from "./glacierCliffPalette";
import { buildWideChamferedPlatePolygon, type ColumnBoundaryKeypoint } from "./glacierPolygonMath";

/**
 * Constrói uma cunha de sombra abissal individual na base de cada coluna glacial,
 * mantendo transição suave e sem corte horizontal reto.
 */
export function buildIndividualAbyssalBaseShadow(
  leftBoundaryKeypoints: readonly ColumnBoundaryKeypoint[],
  rightBoundaryKeypoints: readonly ColumnBoundaryKeypoint[],
  seaLevelCoordinateY: number,
  submergedColumnHeight: number,
  apexRatio: number,
  isLeftHigh: boolean
): GlacierPolygonLayer[] {
  const apexDepthY = seaLevelCoordinateY + Math.round(submergedColumnHeight * apexRatio);
  const shoulderRatio = Math.min(0.95, apexRatio + 0.18);
  const shoulderDepthY = seaLevelCoordinateY + Math.round(submergedColumnHeight * shoulderRatio);
  const bottomDepthY = seaLevelCoordinateY + submergedColumnHeight;

  const apexLeftBound = resolveInterpolatedX(apexRatio, leftBoundaryKeypoints);
  const apexRightBound = resolveInterpolatedX(apexRatio, rightBoundaryKeypoints);
  const midSpan = Math.max(24, apexRightBound - apexLeftBound);
  const apexX = isLeftHigh
    ? Math.round(apexLeftBound + midSpan * 0.28)
    : Math.round(apexLeftBound + midSpan * 0.72);
  const shoulderLeftBound = resolveInterpolatedX(shoulderRatio, leftBoundaryKeypoints);
  const shoulderRightBound = resolveInterpolatedX(shoulderRatio, rightBoundaryKeypoints);
  const shoulderSpan = Math.max(24, shoulderRightBound - shoulderLeftBound);
  const shoulderX = isLeftHigh
    ? Math.round(shoulderLeftBound + shoulderSpan * 0.96)
    : Math.round(shoulderLeftBound + shoulderSpan * 0.04);

  const deepApexRatio = Math.min(0.92, apexRatio + 0.1);
  const deepApexY = seaLevelCoordinateY + Math.round(submergedColumnHeight * deepApexRatio);
  const deepLeftBound = resolveInterpolatedX(deepApexRatio, leftBoundaryKeypoints);
  const deepRightBound = resolveInterpolatedX(deepApexRatio, rightBoundaryKeypoints);
  const deepSpan = Math.max(24, deepRightBound - deepLeftBound);
  const bottomLeftBound = leftBoundaryKeypoints[leftBoundaryKeypoints.length - 1].x;
  const bottomRightBound = rightBoundaryKeypoints[rightBoundaryKeypoints.length - 1].x;

  return [
    {
      points: [
        { x: apexX, y: apexDepthY },
        { x: shoulderX, y: shoulderDepthY },
        { x: bottomRightBound + 2, y: bottomDepthY },
        { x: bottomLeftBound - 2, y: bottomDepthY },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.OCEAN_COBALT_DEEP,
      alpha: 0.9,
    },
    {
      points: [
        { x: Math.round(deepLeftBound + deepSpan * (isLeftHigh ? 0.36 : 0.64)), y: deepApexY },
        {
          x: Math.round(shoulderLeftBound + shoulderSpan * (isLeftHigh ? 0.92 : 0.08)),
          y: Math.round((deepApexY + bottomDepthY) * 0.56),
        },
        { x: bottomRightBound + 1, y: bottomDepthY },
        { x: bottomLeftBound - 1, y: bottomDepthY },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.ABYSSAL_COBALT_BASE,
      alpha: 0.86,
    },
  ];
}

/**
 * Gera juntas poligonais equilibradas nos vales entre colunas adjacentes, sem linhas
 * verticais finas ou poluição visual sobre as faces limpas dos blocos.
 */
export function buildForegroundProtrusionAndCleftLayers(
  leftBoundaryKeypoints: readonly ColumnBoundaryKeypoint[],
  rightBoundaryKeypoints: readonly ColumnBoundaryKeypoint[],
  columnIndex: number,
  totalColumnCount: number,
  seaLevelCoordinateY: number,
  submergedColumnHeight: number
): GlacierPolygonLayer[] {
  if (columnIndex >= totalColumnCount - 1) {
    return [];
  }

  const splitDepthRatio = 0.36 + (columnIndex % 4) * 0.07;

  return [
    {
      points: buildWideChamferedPlatePolygon({
        leftBoundaryKeypoints,
        rightBoundaryKeypoints,
        seaLevelCoordinateY,
        submergedColumnHeight,
        topLeftDepthRatio: 0.01,
        topRightDepthRatio: 0.0,
        bottomLeftDepthRatio: splitDepthRatio + 0.05,
        bottomRightDepthRatio: splitDepthRatio,
        leftFraction: 0.92,
        rightFraction: 1.02,
      }),
      color: GLACIER_16BIT_COLOR_PALETTE.BATHYAL_SHADOW,
      alpha: 0.52,
    },
    {
      points: buildWideChamferedPlatePolygon({
        leftBoundaryKeypoints,
        rightBoundaryKeypoints,
        seaLevelCoordinateY,
        submergedColumnHeight,
        topLeftDepthRatio: splitDepthRatio,
        topRightDepthRatio: splitDepthRatio - 0.03,
        bottomLeftDepthRatio: 1.0,
        bottomRightDepthRatio: 1.0,
        leftFraction: 0.89,
        rightFraction: 1.03,
        bottomChamferCenterRatio: 1.0,
        bottomChamferFraction: 0.96,
      }),
      color: GLACIER_16BIT_COLOR_PALETTE.BATHYAL_SHADOW,
      alpha: 0.78,
    },
  ];
}
