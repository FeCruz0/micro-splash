/**
 * Pináculos Emersos Assimétricos (Acima da Linha D'Água) e Contrafortes Abissais (16-Bit)
 */

import {
  GLACIER_16BIT_COLOR_PALETTE,
  GLACIER_CLIFF_BASE_OFFSET_X,
  type GlacierPoint,
  type GlacierPolygonLayer,
} from "./glacierCliffPalette";

interface IrregularPeakDescriptor {
  readonly width: number;
  readonly peakHeightFraction: number;
  readonly valleyDepthFraction: number;
}

const ALPINE_SNOW_PEAK_SEQUENCE: readonly IrregularPeakDescriptor[] = [
  { width: 64, peakHeightFraction: 0.0, valleyDepthFraction: 0.68 },
  { width: 42, peakHeightFraction: 0.24, valleyDepthFraction: 0.86 },
  { width: 82, peakHeightFraction: 0.04, valleyDepthFraction: 0.58 },
  { width: 50, peakHeightFraction: 0.36, valleyDepthFraction: 0.92 },
  { width: 72, peakHeightFraction: 0.1, valleyDepthFraction: 0.72 },
  { width: 38, peakHeightFraction: 0.42, valleyDepthFraction: 0.96 },
];

interface CoastalSeracSpec {
  readonly startX: number;
  readonly apexX: number;
  readonly endX: number;
  readonly peakOffsetY: number;
  readonly rightShoulderOffsetY: number;
}

/**
 * Gera os pináculos e cristas emersas da geleira (acima de SEA_LEVEL) com alturas e
 * larguras irregulares decaindo organicamente até a borda oceânica.
 */
export function buildEmergedGlacierSpireLayers(
  seaLevelCoordinateY: number,
  snowCrestHeight: number
): GlacierPolygonLayer[] {
  const layers: GlacierPolygonLayer[] = [];
  const waterlineY = seaLevelCoordinateY + 2;
  const westernTransitionX = -152;
  const basePeakTopY = Math.max(0, snowCrestHeight - 2);

  // 1. Maciço emerso ocidental com faces oblíquas sob a crista nevada (até x = -152)
  const westernSpans = [116, 84, 108, 76, 98, 72];
  let cursorX = GLACIER_CLIFF_BASE_OFFSET_X;
  let spanIndex = 0;

  while (cursorX < westernTransitionX) {
    const nextX = Math.min(
      westernTransitionX,
      cursorX + westernSpans[spanIndex % westernSpans.length]
    );
    const width = Math.max(20, nextX - cursorX);
    const midTopX = cursorX + Math.round(width * (spanIndex % 2 === 0 ? 0.54 : 0.4));
    const midBottomX = cursorX + Math.round(width * (spanIndex % 2 === 0 ? 0.36 : 0.62));

    layers.push(
      {
        points: [
          { x: cursorX - 1, y: basePeakTopY },
          { x: nextX + 1, y: basePeakTopY },
          { x: nextX + 1, y: waterlineY },
          { x: cursorX - 1, y: waterlineY },
        ],
        color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_EMERGED_BODY,
        alpha: 0.98,
      },
      {
        points: [
          { x: cursorX, y: basePeakTopY },
          { x: midTopX, y: basePeakTopY },
          { x: midBottomX, y: waterlineY },
          { x: cursorX, y: waterlineY },
        ],
        color:
          spanIndex % 3 === 0
            ? GLACIER_16BIT_COLOR_PALETTE.SNOW_CREST_SHADOW
            : GLACIER_16BIT_COLOR_PALETTE.GLACIAL_EMERGED_LIGHT,
        alpha: 0.92,
      },
      {
        points: [
          { x: midTopX, y: basePeakTopY + 1 },
          { x: nextX + 1, y: basePeakTopY + 1 },
          { x: nextX + 1, y: waterlineY },
          { x: midBottomX - 2, y: waterlineY },
        ],
        color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_EMERGED_CLEAVAGE,
        alpha: 0.84,
      }
    );

    cursorX = nextX;
    spanIndex++;
  }

  // 2. Pináculos descendentes irregulares até a borda direita (x = -152 .. +24) com recortes de céu
  const coastalSeracs: readonly CoastalSeracSpec[] = [
    { startX: -156, apexX: -124, endX: -94, peakOffsetY: 2, rightShoulderOffsetY: 22 },
    { startX: -98, apexX: -76, endX: -54, peakOffsetY: 14, rightShoulderOffsetY: 32 },
    { startX: -58, apexX: -32, endX: -10, peakOffsetY: 26, rightShoulderOffsetY: 42 },
    { startX: -14, apexX: 6, endX: 24, peakOffsetY: 40, rightShoulderOffsetY: 54 },
  ];

  for (const serac of coastalSeracs) {
    const peakY = Math.min(seaLevelCoordinateY - 6, snowCrestHeight + serac.peakOffsetY);
    const shoulderY = Math.min(waterlineY - 2, snowCrestHeight + serac.rightShoulderOffsetY);

    layers.push(
      {
        points: [
          { x: serac.startX, y: waterlineY },
          { x: serac.startX + Math.round((serac.apexX - serac.startX) * 0.35), y: peakY + 7 },
          { x: serac.apexX, y: peakY },
          { x: serac.endX, y: shoulderY },
          { x: serac.endX + 2, y: waterlineY },
        ],
        color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_EMERGED_BODY,
        alpha: 0.98,
      },
      {
        points: [
          { x: serac.startX + 1, y: waterlineY },
          { x: serac.startX + Math.round((serac.apexX - serac.startX) * 0.35), y: peakY + 7 },
          { x: serac.apexX, y: peakY },
          { x: serac.apexX + 3, y: waterlineY },
        ],
        color: GLACIER_16BIT_COLOR_PALETTE.SNOW_CREST_PURE,
        alpha: 0.96,
      },
      {
        points: [
          { x: serac.apexX, y: peakY + 2 },
          { x: serac.endX, y: shoulderY },
          { x: serac.endX + 1, y: waterlineY },
          { x: serac.apexX - 2, y: waterlineY },
        ],
        color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_EMERGED_CLEAVAGE,
        alpha: 0.88,
      }
    );
  }

  // 3. Faixa especular fragmentada na linha d'água
  layers.push({
    points: [
      { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelCoordinateY - 2 },
      { x: 24, y: seaLevelCoordinateY - 2 },
      { x: 26, y: seaLevelCoordinateY + 3 },
      { x: GLACIER_CLIFF_BASE_OFFSET_X, y: seaLevelCoordinateY + 3 },
    ],
    color: GLACIER_16BIT_COLOR_PALETTE.SPECULAR_CYAN_LIGHT,
    alpha: 0.86,
  });

  return layers;
}

/**
 * Gera picos nevados assimétricos com larguras e alturas bem variadas, mais altos à
 * esquerda e decaindo em vales irregulares em direção à borda direita (0 <= y <= snowCrestHeight).
 */
export function buildAlpineSnowCrestPeakLayers(
  snowCrestHeight: number
): readonly GlacierPolygonLayer[] {
  const layers: GlacierPolygonLayer[] = [];
  const rightRidgeLimitX = -148;
  const serratedTopPoints: GlacierPoint[] = [];
  const peakSpans: Array<{ startX: number; peakX: number; endX: number; peakY: number }> = [];

  let cursorX = GLACIER_CLIFF_BASE_OFFSET_X;
  let patternIndex = 0;

  while (cursorX < rightRidgeLimitX) {
    const pattern = ALPINE_SNOW_PEAK_SEQUENCE[patternIndex % ALPINE_SNOW_PEAK_SEQUENCE.length];
    const nextX = Math.min(rightRidgeLimitX, cursorX + pattern.width);
    const spanWidth = Math.max(18, nextX - cursorX);

    // Progressão de descenso: picos mais altos à esquerda (-400 ou menos), baixando rumo à borda direita
    const slopeDescent =
      cursorX > -290
        ? Math.round(((cursorX + 290) / (rightRidgeLimitX + 290)) * snowCrestHeight * 0.46)
        : 0;

    const peakY = Math.min(
      snowCrestHeight - 2,
      Math.round(snowCrestHeight * pattern.peakHeightFraction) + slopeDescent
    );
    const valleyY = Math.min(
      snowCrestHeight,
      Math.round(snowCrestHeight * pattern.valleyDepthFraction) + Math.round(slopeDescent * 0.45)
    );

    const peakX = cursorX + Math.round(spanWidth * 0.34);
    serratedTopPoints.push({ x: cursorX, y: Math.min(snowCrestHeight, valleyY) });
    serratedTopPoints.push({ x: peakX, y: peakY });
    peakSpans.push({ startX: cursorX, peakX, endX: nextX, peakY });

    cursorX = nextX;
    patternIndex++;
  }

  layers.push({
    points: [
      ...serratedTopPoints,
      { x: rightRidgeLimitX, y: snowCrestHeight },
      { x: GLACIER_CLIFF_BASE_OFFSET_X, y: snowCrestHeight },
    ],
    color: GLACIER_16BIT_COLOR_PALETTE.SNOW_CREST_PURE,
    alpha: 1.0,
  });

  for (let index = 0; index < peakSpans.length; index++) {
    const peak = peakSpans[index];
    layers.push({
      points: [
        { x: peak.peakX, y: peak.peakY },
        { x: peak.endX, y: snowCrestHeight },
        { x: peak.peakX - 4, y: snowCrestHeight },
      ],
      color:
        index % 2 === 0
          ? GLACIER_16BIT_COLOR_PALETTE.SNOW_CREST_SHADOW
          : GLACIER_16BIT_COLOR_PALETTE.SNOW_CREST_AZURE,
      alpha: 0.9,
    });
  }

  return layers;
}

/**
 * Gera os contrafortes abissais exclusivamente na encosta externa direita e cristas
 * irregulares rentes ao leito marinho, sem cruzar as colunas com faixas horizontais.
 */
export function buildSubmarineTalusButtressLayers(
  screenHeight: number,
  seaLevelCoordinateY: number
): GlacierPolygonLayer[] {
  const submergedColumnHeight = Math.max(1, screenHeight - seaLevelCoordinateY);
  const ratioY = (ratio: number) => seaLevelCoordinateY + Math.round(submergedColumnHeight * ratio);

  return [
    {
      points: [
        { x: -16, y: ratioY(0.76) },
        { x: 24, y: ratioY(0.66) },
        { x: 64, y: ratioY(0.75) },
        { x: 108, y: ratioY(0.85) },
        { x: 174, y: ratioY(0.93) },
        { x: 224, y: screenHeight },
        { x: -16, y: screenHeight },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.GLACIAL_BLUE_SHADE,
      alpha: 0.72,
    },
    {
      points: [
        { x: 8, y: ratioY(0.75) },
        { x: 50, y: ratioY(0.8) },
        { x: 96, y: ratioY(0.88) },
        { x: 158, y: ratioY(0.94) },
        { x: 210, y: screenHeight },
        { x: 8, y: screenHeight },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.OCEAN_COBALT_DEEP,
      alpha: 0.9,
    },
    {
      points: [
        { x: 46, y: ratioY(0.85) },
        { x: 94, y: ratioY(0.89) },
        { x: 148, y: ratioY(0.94) },
        { x: 218, y: ratioY(0.97) },
        { x: 286, y: screenHeight },
        { x: 46, y: screenHeight },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.ABYSSAL_COBALT_BASE,
      alpha: 0.86,
    },
    {
      points: [
        { x: 112, y: screenHeight },
        { x: 164, y: ratioY(0.92) },
        { x: 224, y: ratioY(0.96) },
        { x: 278, y: ratioY(0.93) },
        { x: 342, y: screenHeight },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.BATHYAL_SHADOW,
      alpha: 0.74,
    },
  ];
}
