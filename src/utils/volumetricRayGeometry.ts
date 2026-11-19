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
  readonly widthScale: number;
  readonly lengthScale: number;
  readonly angleSpreadScale: number;
  readonly swayScale: number;
}

interface BiomeRayStop {
  readonly transitionOut?: { readonly startDistance: number; readonly endDistance: number };
  readonly rayColor: readonly [number, number, number];
  readonly lightFactor: number;
  readonly widthScale: number;
  readonly lengthScale: number;
  readonly angleSpreadScale: number;
  readonly swayScale: number;
}

const BIOME_RAY_STOPS: readonly BiomeRayStop[] = [
  // 1. Oceano Polar (Antártica): fria, azulada e mais concentrada
  {
    transitionOut: { startDistance: 4200, endDistance: 5800 },
    rayColor: [120, 195, 235],
    lightFactor: 0.036,
    widthScale: 0.78,
    lengthScale: 0.86,
    angleSpreadScale: 0.72,
    swayScale: 0.75,
  },
  // 2. Travessia Pelágica: mais profunda e difusa, com influência dourada do pôr do sol
  {
    transitionOut: { startDistance: 11000, endDistance: 13000 },
    rayColor: [195, 212, 188],
    lightFactor: 0.048,
    widthScale: 1.15,
    lengthScale: 1.12,
    angleSpreadScale: 1.05,
    swayScale: 1.0,
  },
  // 3. Oceano Impactado (Costa Urbana): mais escura e discreta (noite urbana)
  {
    transitionOut: { startDistance: 18200, endDistance: 20200 },
    rayColor: [105, 182, 200],
    lightFactor: 0.024,
    widthScale: 0.85,
    lengthScale: 0.78,
    angleSpreadScale: 0.85,
    swayScale: 0.65,
  },
  // 4. Cânions & Ressurgência: feixes direcionados e contrastados valorizando o relevo
  {
    transitionOut: { startDistance: 24200, endDistance: 25800 },
    rayColor: [215, 230, 190],
    lightFactor: 0.056,
    widthScale: 0.95,
    lengthScale: 1.08,
    angleSpreadScale: 1.22,
    swayScale: 1.1,
  },
  // 5. Santuário de Arraial: iluminação mais clara, turquesa e expansiva
  {
    rayColor: [165, 240, 232],
    lightFactor: 0.068,
    widthScale: 1.28,
    lengthScale: 1.15,
    angleSpreadScale: 1.15,
    swayScale: 1.15,
  },
];

const BIOME_CORE_BOUNDARIES = [5000, 12000, 19000, 25000] as const;

function lerpNumber(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

const reusableRayColor: [number, number, number] = [120, 195, 235];
const reusableLightState: {
  rayColor: [number, number, number];
  lightFactor: number;
  widthScale: number;
  lengthScale: number;
  angleSpreadScale: number;
  swayScale: number;
} = {
  rayColor: reusableRayColor,
  lightFactor: 0.036,
  widthScale: 0.78,
  lengthScale: 0.86,
  angleSpreadScale: 0.72,
  swayScale: 0.75,
};

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
      bottomWidth: baseWidth * 1.35,
      relativeAlpha: 1.0,
    },
    {
      topY: 180,
      bottomY: 380,
      topWidth: baseWidth * 1.35,
      bottomWidth: baseWidth * 2.2,
      relativeAlpha: 0.55,
    },
    {
      topY: 380,
      bottomY: 580,
      topWidth: baseWidth * 2.2,
      bottomWidth: baseWidth * 3.2,
      relativeAlpha: 0.22,
    },
    {
      topY: 580,
      bottomY: 760,
      topWidth: baseWidth * 3.2,
      bottomWidth: baseWidth * 4.4,
      relativeAlpha: 0.05,
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
 * Resolve a cor, intensidade, dispersão angular e escala dos feixes de luz por bioma,
 * com núcleos estáveis e interpolação smoothstep nas 4 faixas de transição (zero alocações).
 */
export function resolveBiomeLightColor(cameraXPosition: number): BiomeAtmosphericLight {
  let coreIndex: number = BIOME_CORE_BOUNDARIES.length;
  for (let i = 0; i < BIOME_CORE_BOUNDARIES.length; i++) {
    if (cameraXPosition < BIOME_CORE_BOUNDARIES[i]) {
      coreIndex = i;
      break;
    }
  }

  let source = BIOME_RAY_STOPS[coreIndex];
  let target = source;
  let t = 0;

  for (let i = 0; i < BIOME_RAY_STOPS.length - 1; i++) {
    const stop = BIOME_RAY_STOPS[i];
    const transition = stop.transitionOut;
    if (
      transition &&
      cameraXPosition >= transition.startDistance &&
      cameraXPosition <= transition.endDistance
    ) {
      source = stop;
      target = BIOME_RAY_STOPS[i + 1];
      const span = transition.endDistance - transition.startDistance;
      const raw = span > 0 ? (cameraXPosition - transition.startDistance) / span : 0;
      const clamped = Math.min(Math.max(raw, 0), 1);
      t = clamped * clamped * (3 - 2 * clamped);
      break;
    }
  }

  reusableRayColor[0] = Math.round(lerpNumber(source.rayColor[0], target.rayColor[0], t));
  reusableRayColor[1] = Math.round(lerpNumber(source.rayColor[1], target.rayColor[1], t));
  reusableRayColor[2] = Math.round(lerpNumber(source.rayColor[2], target.rayColor[2], t));

  reusableLightState.lightFactor = lerpNumber(source.lightFactor, target.lightFactor, t);
  reusableLightState.widthScale = lerpNumber(source.widthScale, target.widthScale, t);
  reusableLightState.lengthScale = lerpNumber(source.lengthScale, target.lengthScale, t);
  reusableLightState.angleSpreadScale = lerpNumber(
    source.angleSpreadScale,
    target.angleSpreadScale,
    t
  );
  reusableLightState.swayScale = lerpNumber(source.swayScale, target.swayScale, t);

  return reusableLightState;
}
