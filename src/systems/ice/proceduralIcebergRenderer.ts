/**
 * Renderizador 16-Bit em 3 Camadas para Icebergs Procedurais — PixiJS 8
 *
 * Constrói geometria poligonal facetada diretamente em PIXI.Graphics (IRenderNode):
 * - Camada 3: Volume submerso irregular com quilhas e facetas azul-profundo
 * - Camada 2: Corpo visível facetado em tons de ciano e azul-celeste com contorno pixel art
 * - Camada 1: Superfície superior nevada e realce especular na linha d'água
 */

import type {
  IGraphicsNode,
  IRenderEngine,
  IRenderNode,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import type { IcebergContourPoint, ProceduralIcebergSpec } from "./proceduralIcebergGenerator";

interface RgbTuple {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

function shiftRgb(base: RgbTuple, shift: number): [number, number, number] {
  const clampChannel = (val: number) => Math.max(0, Math.min(255, Math.round(val + shift)));
  return [clampChannel(base.r), clampChannel(base.g), clampChannel(base.b)];
}

const PALETTE = {
  SNOW_PURE: { r: 248, g: 253, b: 255 },
  SNOW_ICE: { r: 206, g: 238, b: 255 },
  EMERGED_HIGHLIGHT: { r: 146, g: 228, b: 255 },
  EMERGED_MID: { r: 88, g: 192, b: 242 },
  EMERGED_SHADE: { r: 44, g: 132, b: 204 },
  EMERGED_OUTLINE: { r: 16, g: 68, b: 132 },
  WATERLINE_FOAM: { r: 222, g: 248, b: 255 },
  SUBMERGED_LIT: { r: 40, g: 118, b: 196 },
  SUBMERGED_MID: { r: 24, g: 82, b: 152 },
  SUBMERGED_DEEP: { r: 14, g: 52, b: 108 },
} as const;

function toWorldPointList(points: readonly IcebergContourPoint[]): Array<{ x: number; y: number }> {
  return points.map((p) => ({ x: p.offsetX, y: p.offsetY }));
}

function findLocalPeaks(
  contour: readonly IcebergContourPoint[]
): Array<{ left: IcebergContourPoint; peak: IcebergContourPoint; right: IcebergContourPoint }> {
  const peaks: Array<{
    left: IcebergContourPoint;
    peak: IcebergContourPoint;
    right: IcebergContourPoint;
  }> = [];

  for (let i = 1; i < contour.length - 1; i++) {
    const prev = contour[i - 1];
    const curr = contour[i];
    const next = contour[i + 1];
    if (curr.offsetY <= prev.offsetY && curr.offsetY <= next.offsetY && curr.offsetY <= -8) {
      peaks.push({ left: prev, peak: curr, right: next });
    }
  }
  return peaks;
}

/**
 * Desenha as 3 camadas 16-bits de um iceberg procedural no nó gráfico fornecido
 * (coordenadas locais com y = 0 na linha d'água SEA_LEVEL).
 */
export function drawProceduralIcebergLayers(
  graphicsNode: IGraphicsNode,
  spec: ProceduralIcebergSpec
): void {
  const tone = spec.toneShift;

  // --- CAMADA 3: Parte Submersa (Volume irregular abaixo da linha d'água) ---
  const submergedPolygon = toWorldPointList(spec.submergedContour);
  graphicsNode.drawPolygon(submergedPolygon, {
    fill: { color: shiftRgb(PALETTE.SUBMERGED_MID, tone * 0.4), alpha: 0.92 },
    stroke: { color: shiftRgb(PALETTE.SUBMERGED_DEEP, 0), width: 1.5, alpha: 0.85 },
  });

  // Facetas submersas alternando luz esquerda e sombra direita em cada quilha
  for (let i = 1; i < spec.submergedContour.length - 1; i++) {
    const curr = spec.submergedContour[i];
    const prev = spec.submergedContour[i - 1];
    const next = spec.submergedContour[i + 1];
    if (curr.offsetY > prev.offsetY && curr.offsetY >= next.offsetY) {
      graphicsNode.drawPolygon(
        [
          { x: prev.offsetX, y: 2 },
          { x: curr.offsetX, y: 2 },
          { x: curr.offsetX, y: curr.offsetY },
        ],
        {
          fill: { color: shiftRgb(PALETTE.SUBMERGED_LIT, tone * 0.5), alpha: 0.68 },
        }
      );
      graphicsNode.drawPolygon(
        [
          { x: curr.offsetX, y: 2 },
          { x: next.offsetX, y: 2 },
          { x: curr.offsetX, y: curr.offsetY },
        ],
        {
          fill: { color: shiftRgb(PALETTE.SUBMERGED_DEEP, tone * 0.3), alpha: 0.78 },
        }
      );
    }
  }

  // --- CAMADA 2: Corpo Visível (Facetas ciano e azul-celeste com contorno pixel art) ---
  const emergedPolygon = toWorldPointList(spec.surfaceContour);
  graphicsNode.drawPolygon(emergedPolygon, {
    fill: { color: shiftRgb(PALETTE.EMERGED_MID, tone), alpha: 0.98 },
    stroke: { color: shiftRgb(PALETTE.EMERGED_OUTLINE, 0), width: 2, alpha: 0.92 },
  });

  const peaks = findLocalPeaks(spec.surfaceContour);
  for (const { left, peak, right } of peaks) {
    // Face esquerda iluminada em ciano claro
    graphicsNode.drawPolygon(
      [
        { x: left.offsetX, y: left.offsetY },
        { x: peak.offsetX, y: peak.offsetY },
        { x: peak.offsetX + 4, y: 2 },
        { x: left.offsetX, y: 2 },
      ],
      {
        fill: { color: shiftRgb(PALETTE.EMERGED_HIGHLIGHT, tone * 0.8), alpha: 0.88 },
      }
    );

    // Face direita sombreada em azul glacial profundo
    graphicsNode.drawPolygon(
      [
        { x: peak.offsetX, y: peak.offsetY },
        { x: right.offsetX, y: right.offsetY },
        { x: right.offsetX, y: 2 },
        { x: peak.offsetX - 2, y: 2 },
      ],
      {
        fill: { color: shiftRgb(PALETTE.EMERGED_SHADE, tone * 0.6), alpha: 0.82 },
      }
    );
  }

  // --- CAMADA 1: Superfície Superior Nevada e Realce na Linha D'Água ---
  for (const { left, peak, right } of peaks) {
    const snowDropY = Math.round(peak.offsetY * 0.48);
    const rightCapX = Math.round(peak.offsetX + (right.offsetX - peak.offsetX) * 0.55);
    const rightCapY = Math.round(peak.offsetY + (right.offsetY - peak.offsetY) * 0.55);

    graphicsNode.drawPolygon(
      [
        { x: left.offsetX, y: left.offsetY },
        { x: peak.offsetX, y: peak.offsetY },
        { x: rightCapX, y: rightCapY },
        { x: peak.offsetX + 2, y: snowDropY },
      ],
      {
        fill: { color: shiftRgb(PALETTE.SNOW_ICE, tone * 0.3), alpha: 0.96 },
      }
    );

    graphicsNode.drawPolygon(
      [
        { x: left.offsetX + 2, y: left.offsetY + 1 },
        { x: peak.offsetX, y: peak.offsetY },
        {
          x: Math.round((peak.offsetX + rightCapX) * 0.5),
          y: Math.round((peak.offsetY + rightCapY) * 0.5),
        },
        { x: peak.offsetX - 2, y: Math.round(peak.offsetY * 0.66) },
      ],
      {
        fill: { color: shiftRgb(PALETTE.SNOW_PURE, 0), alpha: 0.98 },
      }
    );
  }

  // Realce especular de espuma na linha d'água (y = 0..2)
  graphicsNode.drawPolygon(
    [
      { x: 2, y: -1 },
      { x: spec.width - 2, y: -1 },
      { x: spec.width - 4, y: 2 },
      { x: 4, y: 2 },
    ],
    {
      fill: { color: shiftRgb(PALETTE.WATERLINE_FOAM, 0), alpha: 0.72 },
    }
  );
}

/**
 * Cria o nó gráfico PixiJS 8 de um iceberg procedural posicionado na linha d'água.
 */
export function createProceduralIcebergNode(
  engine: IRenderEngine,
  spec: ProceduralIcebergSpec,
  seaLevelY: number
): IRenderNode {
  const graphicsNode = engine.createGraphics(spec.id);
  drawProceduralIcebergLayers(graphicsNode, spec);
  graphicsNode.setPosition(spec.x, seaLevelY);
  graphicsNode.setZIndex(10);
  return graphicsNode;
}
