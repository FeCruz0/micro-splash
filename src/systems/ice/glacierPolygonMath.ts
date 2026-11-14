/**
 * Funções Matemáticas para Polígonos Cristalinos Verticais e Diagonais da Geleira
 */

import type { GlacierPoint } from "./glacierCliffPalette";

export interface ColumnBoundaryKeypoint {
  readonly r: number;
  readonly x: number;
}

export interface DiagonalCrystalFacetOptions {
  readonly leftBoundaryKeypoints: readonly ColumnBoundaryKeypoint[];
  readonly rightBoundaryKeypoints: readonly ColumnBoundaryKeypoint[];
  readonly seaLevelCoordinateY: number;
  readonly submergedColumnHeight: number;
  readonly depthStartRatio: number;
  readonly depthMidRatio: number;
  readonly depthEndRatio: number;
  readonly startLeftFraction: number;
  readonly startRightFraction: number;
  readonly midLeftFraction: number;
  readonly midRightFraction: number;
  readonly endLeftFraction: number;
  readonly endRightFraction: number;
}

function sampleKeypointCoordinateX(
  depthRatio: number,
  keypoints: readonly ColumnBoundaryKeypoint[]
): number {
  for (let index = 0; index < keypoints.length - 1; index++) {
    if (depthRatio >= keypoints[index].r && depthRatio <= keypoints[index + 1].r) {
      const span = keypoints[index + 1].r - keypoints[index].r;
      const ratio = span > 0 ? (depthRatio - keypoints[index].r) / span : 0;
      return Math.round(keypoints[index].x + (keypoints[index + 1].x - keypoints[index].x) * ratio);
    }
  }
  return keypoints[keypoints.length - 1].x;
}

/**
 * Constrói um polígono vertical facetado entre duas arestas de coluna, mantendo
 * largura mínima segura e recorte diagonal escalonado conforme a profundidade.
 */
export function buildVerticalColumnFacetPolygon(
  leftBoundaryKeypoints: readonly ColumnBoundaryKeypoint[],
  rightBoundaryKeypoints: readonly ColumnBoundaryKeypoint[],
  seaLevelCoordinateY: number,
  submergedColumnHeight: number,
  depthStartRatio: number,
  depthEndRatio: number,
  leftOffsetFraction: number,
  rightOffsetFraction: number,
  taperFraction: number
): GlacierPoint[] {
  const verticalStepCount = 5;
  const leftEdgePoints: GlacierPoint[] = [];
  const rightEdgePoints: GlacierPoint[] = [];

  for (let stepIndex = 0; stepIndex <= verticalStepCount; stepIndex++) {
    const progress = stepIndex / verticalStepCount;
    const depthRatio = depthStartRatio + (depthEndRatio - depthStartRatio) * progress;
    const coordinateY = seaLevelCoordinateY + Math.round(submergedColumnHeight * depthRatio);
    const boundaryLeftX = sampleKeypointCoordinateX(depthRatio, leftBoundaryKeypoints);
    const boundaryRightX = sampleKeypointCoordinateX(depthRatio, rightBoundaryKeypoints);
    const columnSpanWidth = Math.max(8, boundaryRightX - boundaryLeftX);
    const facetJagOffset = Math.round(Math.sin(progress * 8.4 + leftOffsetFraction * 13) * 4);

    const leftEdgeX =
      Math.round(
        boundaryLeftX + columnSpanWidth * (leftOffsetFraction + taperFraction * progress * 0.35)
      ) + facetJagOffset;
    const rightEdgeX =
      Math.round(
        boundaryLeftX + columnSpanWidth * (rightOffsetFraction - taperFraction * progress * 0.55)
      ) + facetJagOffset;

    leftEdgePoints.push({ x: leftEdgeX, y: coordinateY });
    rightEdgePoints.unshift({ x: Math.max(leftEdgeX + 5, rightEdgeX), y: coordinateY });
  }

  return [...leftEdgePoints, ...rightEdgePoints];
}

/**
 * Constrói uma fratura ou crista diagonal de 6 vértices atravessando uma coluna glacial.
 */
export function buildDiagonalCrystalFacetPolygon(
  options: DiagonalCrystalFacetOptions
): GlacierPoint[] {
  const sampleBand = (ratio: number, leftFraction: number, rightFraction: number) => {
    const clampedRatio = Math.min(1, Math.max(0, ratio));
    const coordinateY =
      options.seaLevelCoordinateY + Math.round(options.submergedColumnHeight * clampedRatio);
    const leftBound = sampleKeypointCoordinateX(clampedRatio, options.leftBoundaryKeypoints);
    const rightBound = sampleKeypointCoordinateX(clampedRatio, options.rightBoundaryKeypoints);
    const span = Math.max(8, rightBound - leftBound);
    const startX = Math.round(leftBound + span * leftFraction);
    const endX = Math.max(startX + 4, Math.round(leftBound + span * rightFraction));
    return { coordinateY, startX, endX };
  };

  const topBand = sampleBand(
    options.depthStartRatio,
    options.startLeftFraction,
    options.startRightFraction
  );
  const middleBand = sampleBand(
    options.depthMidRatio,
    options.midLeftFraction,
    options.midRightFraction
  );
  const bottomBand = sampleBand(
    options.depthEndRatio,
    options.endLeftFraction,
    options.endRightFraction
  );

  return [
    { x: topBand.startX, y: topBand.coordinateY },
    { x: topBand.endX, y: topBand.coordinateY },
    { x: middleBand.endX, y: middleBand.coordinateY },
    { x: bottomBand.endX, y: bottomBand.coordinateY },
    { x: bottomBand.startX, y: bottomBand.coordinateY },
    { x: middleBand.startX, y: middleBand.coordinateY },
  ];
}

export interface CrystalVeinWaypoint {
  readonly depthRatio: number;
  readonly leftFraction: number;
  readonly rightFraction: number;
}

/**
 * Constrói uma cadeia de segmentos poligonais conectados formando cristas de luz
 * quebradas e bifurcadas em ângulos irregulares sem paralelismo vertical.
 */
export function buildConnectedCrystalRidgeSegments(
  leftBoundaryKeypoints: readonly ColumnBoundaryKeypoint[],
  rightBoundaryKeypoints: readonly ColumnBoundaryKeypoint[],
  seaLevelCoordinateY: number,
  submergedColumnHeight: number,
  waypoints: readonly CrystalVeinWaypoint[]
): GlacierPoint[][] {
  const segments: GlacierPoint[][] = [];

  for (let index = 0; index < waypoints.length - 1; index++) {
    const startPoint = waypoints[index];
    const endPoint = waypoints[index + 1];

    const startY = seaLevelCoordinateY + Math.round(submergedColumnHeight * startPoint.depthRatio);
    const endY = seaLevelCoordinateY + Math.round(submergedColumnHeight * endPoint.depthRatio);

    const startLeftBound = sampleKeypointCoordinateX(startPoint.depthRatio, leftBoundaryKeypoints);
    const startRightBound = sampleKeypointCoordinateX(
      startPoint.depthRatio,
      rightBoundaryKeypoints
    );
    const startSpan = Math.max(10, startRightBound - startLeftBound);

    const endLeftBound = sampleKeypointCoordinateX(endPoint.depthRatio, leftBoundaryKeypoints);
    const endRightBound = sampleKeypointCoordinateX(endPoint.depthRatio, rightBoundaryKeypoints);
    const endSpan = Math.max(10, endRightBound - endLeftBound);

    const topLeftX = Math.round(startLeftBound + startSpan * startPoint.leftFraction);
    const topRightX = Math.max(
      topLeftX + 5,
      Math.round(startLeftBound + startSpan * startPoint.rightFraction)
    );
    const bottomLeftX = Math.round(endLeftBound + endSpan * endPoint.leftFraction);
    const bottomRightX = Math.max(
      bottomLeftX + 5,
      Math.round(endLeftBound + endSpan * endPoint.rightFraction)
    );

    segments.push([
      { x: topLeftX, y: startY },
      { x: topRightX, y: startY },
      { x: bottomRightX, y: endY },
      { x: bottomLeftX, y: endY },
    ]);
  }

  return segments;
}

export interface WideChamferedPlateOptions {
  readonly leftBoundaryKeypoints: readonly ColumnBoundaryKeypoint[];
  readonly rightBoundaryKeypoints: readonly ColumnBoundaryKeypoint[];
  readonly seaLevelCoordinateY: number;
  readonly submergedColumnHeight: number;
  readonly topLeftDepthRatio: number;
  readonly topRightDepthRatio: number;
  readonly bottomLeftDepthRatio: number;
  readonly bottomRightDepthRatio: number;
  readonly leftFraction: number;
  readonly rightFraction: number;
  readonly bottomChamferCenterRatio?: number;
  readonly bottomChamferFraction?: number;
}

/**
 * Constrói uma placa glacial sólida larga de 4 ou 5 vértices estritos com corte
 * inferior chanfrado (horizontal ou angulado largo, sem pontas finas soltas).
 */
export function buildWideChamferedPlatePolygon(options: WideChamferedPlateOptions): GlacierPoint[] {
  const resolvePoint = (depthRatio: number, widthFraction: number): GlacierPoint => {
    const clampedRatio = Math.min(1, Math.max(0, depthRatio));
    const coordinateY =
      options.seaLevelCoordinateY + Math.round(options.submergedColumnHeight * clampedRatio);
    const leftBound = sampleKeypointCoordinateX(clampedRatio, options.leftBoundaryKeypoints);
    const rightBound = sampleKeypointCoordinateX(clampedRatio, options.rightBoundaryKeypoints);
    const span = Math.max(16, rightBound - leftBound);
    return {
      x: Math.round(leftBound + span * widthFraction),
      y: coordinateY,
    };
  };

  const topLeft = resolvePoint(options.topLeftDepthRatio, options.leftFraction);
  const topRight = resolvePoint(options.topRightDepthRatio, options.rightFraction);
  const bottomRight = resolvePoint(options.bottomRightDepthRatio, options.rightFraction);
  const bottomLeft = resolvePoint(options.bottomLeftDepthRatio, options.leftFraction);

  if (
    options.bottomChamferCenterRatio !== undefined &&
    options.bottomChamferFraction !== undefined
  ) {
    const bottomChamfer = resolvePoint(
      options.bottomChamferCenterRatio,
      options.bottomChamferFraction
    );
    return [topLeft, topRight, bottomRight, bottomChamfer, bottomLeft];
  }

  return [topLeft, topRight, bottomRight, bottomLeft];
}
