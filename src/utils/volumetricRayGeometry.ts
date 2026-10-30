/**
 * Geometria e Modelagem de Feixes Volumétricos (God Rays) — Micro Splash
 *
 * Módulo puro em TypeScript (zero dependências de Kaboom ou PixiJS).
 * Modela a dispersão angular cônica e a atenuação exponencial da luz solar na água (Beer-Lambert).
 * Elimina arestas ortogonais de 90° e cortes retos com fade-out gradual e segmentos trapezoidais.
 */

import type { Vector2D } from "../engine/contracts/INTERFACE_CONTRACTS";

export interface RaySegmentDefinition {
  readonly topY: number;
  readonly bottomY: number;
  readonly topWidth: number;
  readonly bottomWidth: number;
  readonly relativeAlpha: number;
}

export interface RayGeometryProfile {
  readonly segments: readonly RaySegmentDefinition[];
  readonly totalLength: number;
}

export interface BiomeAtmosphericLight {
  readonly rayColor: readonly [number, number, number];
  readonly lightFactor: number;
}

/**
 * Cria o perfil geométrico trapezoidal multi-camada para feixes de luz subaquáticos.
 * Converte retângulos rígidos em cones volumétricos com atenuação de absorção oceânica.
 */
export function createVolumetricRayProfile(baseWidth: number): RayGeometryProfile {
  const segments: RaySegmentDefinition[] = [
    {
      topY: 0,
      bottomY: 180,
      topWidth: baseWidth * 0.6,
      bottomWidth: baseWidth * 1.25,
      relativeAlpha: 1.0,
    },
    {
      topY: 180,
      bottomY: 380,
      topWidth: baseWidth * 1.25,
      bottomWidth: baseWidth * 2.1,
      relativeAlpha: 0.45,
    },
    {
      topY: 380,
      bottomY: 580,
      topWidth: baseWidth * 2.1,
      bottomWidth: baseWidth * 3.1,
      relativeAlpha: 0.18,
    },
    {
      topY: 580,
      bottomY: 760,
      topWidth: baseWidth * 3.1,
      bottomWidth: baseWidth * 4.2,
      relativeAlpha: 0.04,
    },
  ];

  return {
    segments,
    totalLength: 760,
  };
}

/**
 * Gera os 4 vértices do polígono trapezoidal de um segmento de raio relativo à superfície (0, 0).
 */
export function getRaySegmentPolygonVertices(segment: RaySegmentDefinition): readonly Vector2D[] {
  const halfTopWidth = segment.topWidth / 2;
  const halfBottomWidth = segment.bottomWidth / 2;

  return [
    { x: -halfTopWidth, y: segment.topY },
    { x: halfTopWidth, y: segment.topY },
    { x: halfBottomWidth, y: segment.bottomY },
    { x: -halfBottomWidth, y: segment.bottomY },
  ];
}

/**
 * Resolve a cor e intensidade da iluminação atmosférica calibradas por bioma.
 * Harmoniza a luminância perceptual entre backends ANGLE (Direct3D 11) e WebRender (Firefox).
 */
export function resolveBiomeLightColor(cameraXPosition: number): BiomeAtmosphericLight {
  if (cameraXPosition < 5000) {
    return {
      rayColor: [120, 195, 235],
      lightFactor: 0.035,
    };
  }

  if (cameraXPosition < 12000) {
    return {
      rayColor: [135, 205, 240],
      lightFactor: 0.05,
    };
  }

  if (cameraXPosition < 19000) {
    return {
      rayColor: [130, 200, 215],
      lightFactor: 0.042,
    };
  }

  return {
    rayColor: [215, 230, 190],
    lightFactor: 0.065,
  };
}
