/**
 * Silhuetas bentônicas e relevo submarino facetado por etapa (16-bit) — Micro Splash
 *
 * Puramente visual (sem colisões): diferencia o leito oceânico em 5 perfis geológicos
 * ao longo das 3 grandes etapas da migração, com culling espacial e freeze(true).
 */

import { calculateAsymmetricTransitionFactor } from "../biomeTransitionSystem";
import { getSpatialCullingManager } from "../spatialCullingSystem";
import type { IGraphicsNode, IRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";

export type BenthicSilhouetteKind =
  "glacial_moraine" | "abyssal_ridge" | "urban_impact" | "canyon_plateau" | "sanctuary_reef_mound";

export interface BenthicSilhouetteSpec {
  readonly kind: BenthicSilhouetteKind;
  readonly x: number;
  readonly width: number;
  readonly height: number;
  readonly alpha: number;
}

export const GLACIAL_MORAINE_X = [700, 1450, 2250, 3050, 3850, 4550] as const;
export const ABYSSAL_RIDGE_X = [5100, 6100, 7100, 8100, 9150, 10200, 11200] as const;
export const URBAN_IMPACT_X = [
  11650, 12350, 13200, 14100, 15000, 15950, 16900, 17850, 18650,
] as const;
export const CANYON_PLATEAU_X = [19100, 20050, 21050, 22050, 23050, 24050, 24900] as const;
export const SANCTUARY_REEF_MOUND_X = [25150, 26050, 27450, 28350, 29250] as const;

/**
 * Gera a lista determinística de especificações de silhueta bentônica por região.
 */
export function buildBenthicSilhouetteSpecs(): BenthicSilhouetteSpec[] {
  const specs: BenthicSilhouetteSpec[] = [];

  GLACIAL_MORAINE_X.forEach((x, idx) => {
    const fade = calculateAsymmetricTransitionFactor(x, -Infinity, 0, 4100, 5000);
    specs.push({
      kind: "glacial_moraine",
      x,
      width: 170 + (idx % 3) * 32,
      height: Math.round((30 + (idx % 3) * 11) * (0.6 + 0.4 * fade)),
      alpha: 0.9 * (0.45 + 0.55 * fade),
    });
  });

  ABYSSAL_RIDGE_X.forEach((x, idx) => {
    const fade = calculateAsymmetricTransitionFactor(x, 4700, 5600, 11000, 12000);
    specs.push({
      kind: "abyssal_ridge",
      x,
      width: 260 + (idx % 3) * 48,
      height: Math.round((38 + (idx % 3) * 14) * (0.65 + 0.35 * fade)),
      alpha: 0.88 * (0.45 + 0.55 * fade),
    });
  });

  URBAN_IMPACT_X.forEach((x, idx) => {
    const fade = calculateAsymmetricTransitionFactor(x, 11400, 12700, 18200, 19200);
    specs.push({
      kind: "urban_impact",
      x,
      width: 155 + (idx % 3) * 38,
      height: Math.round((36 + (idx % 3) * 16) * (0.55 + 0.45 * fade)),
      alpha: 0.92 * (0.4 + 0.6 * fade),
    });
  });

  CANYON_PLATEAU_X.forEach((x, idx) => {
    const fade = calculateAsymmetricTransitionFactor(x, 18600, 19600, 23800, 25200);
    specs.push({
      kind: "canyon_plateau",
      x,
      width: 230 + (idx % 3) * 42,
      height: Math.round((72 + (idx % 3) * 20) * (0.55 + 0.45 * fade)),
      alpha: 0.9 * (0.45 + 0.55 * fade),
    });
  });

  SANCTUARY_REEF_MOUND_X.forEach((x, idx) => {
    const fade = calculateAsymmetricTransitionFactor(x, 24500, 25600, Infinity, Infinity);
    specs.push({
      kind: "sanctuary_reef_mound",
      x,
      width: 195 + (idx % 3) * 42,
      height: Math.round((34 + (idx % 3) * 12) * (0.65 + 0.35 * fade)),
      alpha: 0.9 * (0.5 + 0.5 * fade),
    });
  });

  return specs;
}

function drawSilhouetteGeometry(
  gfx: IGraphicsNode,
  spec: BenthicSilhouetteSpec,
  variantIndex: number
): void {
  const w = spec.width;
  const h = spec.height;
  const a = spec.alpha;

  if (spec.kind === "glacial_moraine") {
    gfx.drawPolygon(
      [
        { x: 0, y: 4 },
        { x: Math.round(w * 0.16), y: -Math.round(h * 0.55) },
        { x: Math.round(w * 0.42), y: -h },
        { x: Math.round(w * 0.68), y: -Math.round(h * 0.72) },
        { x: Math.round(w * 0.88), y: -Math.round(h * 0.38) },
        { x: w, y: 4 },
      ],
      { fill: { color: [24, 58, 92], alpha: a } }
    );
    gfx.drawPolygon(
      [
        { x: Math.round(w * 0.16), y: -Math.round(h * 0.55) },
        { x: Math.round(w * 0.42), y: -h },
        { x: Math.round(w * 0.68), y: -Math.round(h * 0.72) },
        { x: Math.round(w * 0.44), y: -Math.round(h * 0.62) },
      ],
      { fill: { color: [72, 134, 174], alpha: a * 0.85 } }
    );
    return;
  }

  if (spec.kind === "abyssal_ridge") {
    gfx.drawPolygon(
      [
        { x: 0, y: 4 },
        { x: Math.round(w * 0.22), y: -Math.round(h * 0.6) },
        { x: Math.round(w * 0.48), y: -h },
        { x: Math.round(w * 0.74), y: -Math.round(h * 0.65) },
        { x: w, y: 4 },
      ],
      { fill: { color: [14, 34, 66], alpha: a } }
    );
    gfx.drawPolygon(
      [
        { x: Math.round(w * 0.22), y: -Math.round(h * 0.6) },
        { x: Math.round(w * 0.48), y: -h },
        { x: Math.round(w * 0.74), y: -Math.round(h * 0.65) },
        { x: Math.round(w * 0.5), y: -Math.round(h * 0.75) },
      ],
      { fill: { color: [36, 74, 118], alpha: a * 0.8 } }
    );
    return;
  }

  if (spec.kind === "urban_impact") {
    // Base degradada e escura de entulho/concreto submerso
    gfx.drawPolygon(
      [
        { x: 0, y: 4 },
        { x: Math.round(w * 0.15), y: -Math.round(h * 0.35) },
        { x: Math.round(w * 0.55), y: -Math.round(h * 0.42) },
        { x: Math.round(w * 0.88), y: -Math.round(h * 0.25) },
        { x: w, y: 4 },
      ],
      { fill: { color: [12, 22, 36], alpha: a } }
    );

    const urbanVariant = variantIndex % 3;
    if (urbanVariant === 0) {
      // Estacas portuárias verticais em degraus com baliza discreta (sem colisão)
      const piling1X = Math.round(w * 0.24);
      const piling2X = Math.round(w * 0.56);
      gfx.drawRect(piling1X, -h, 14, h, { fill: { color: [24, 38, 56], alpha: a } });
      gfx.drawRect(piling1X, -h, 14, 4, { fill: { color: [48, 72, 86], alpha: a } });
      gfx.drawRect(piling1X + 4, -h - 4, 5, 3, {
        fill: { color: [215, 130, 55], alpha: a * 0.65 },
      });
      gfx.drawRect(piling2X, -Math.round(h * 0.78), 16, Math.round(h * 0.78), {
        fill: { color: [20, 34, 50], alpha: a },
      });
    } else if (urbanVariant === 1) {
      // Bloco estrutural / duto submerso com destaque superior fosco
      gfx.drawRect(Math.round(w * 0.18), -Math.round(h * 0.62), Math.round(w * 0.56), 18, {
        fill: { color: [22, 36, 52], alpha: a },
      });
      gfx.drawRect(Math.round(w * 0.18), -Math.round(h * 0.62), Math.round(w * 0.56), 3, {
        fill: { color: [44, 68, 78], alpha: a },
      });
      gfx.drawRect(Math.round(w * 0.28), -Math.round(h * 0.85), 10, Math.round(h * 0.23), {
        fill: { color: [28, 44, 62], alpha: a },
      });
    } else {
      // Silhueta de estrutura/guindaste de cais submerso em degraus 16-bit
      const towerX = Math.round(w * 0.34);
      gfx.drawRect(towerX, -h, 12, h, { fill: { color: [20, 34, 52], alpha: a } });
      gfx.drawRect(towerX - 18, -h + 4, 58, 7, { fill: { color: [28, 46, 68], alpha: a } });
      gfx.drawRect(towerX + 28, -h + 11, 4, 14, { fill: { color: [36, 58, 78], alpha: a * 0.85 } });
    }
    return;
  }

  if (spec.kind === "canyon_plateau") {
    // Paredão escalonado de cânion preparando a subida geológica
    gfx.drawPolygon(
      [
        { x: 0, y: 4 },
        { x: Math.round(w * 0.14), y: -Math.round(h * 0.62) },
        { x: Math.round(w * 0.34), y: -Math.round(h * 0.62) },
        { x: Math.round(w * 0.44), y: -h },
        { x: Math.round(w * 0.72), y: -h },
        { x: Math.round(w * 0.84), y: -Math.round(h * 0.48) },
        { x: w, y: 4 },
      ],
      { fill: { color: [12, 44, 68], alpha: a } }
    );
    gfx.drawPolygon(
      [
        { x: Math.round(w * 0.44), y: -h },
        { x: Math.round(w * 0.72), y: -h },
        { x: Math.round(w * 0.68), y: -Math.round(h * 0.84) },
        { x: Math.round(w * 0.4), y: -Math.round(h * 0.84) },
      ],
      { fill: { color: [34, 98, 130], alpha: a * 0.85 } }
    );
    return;
  }

  // sanctuary_reef_mound — 3 variações geométricas suaves para evitar repetição visual
  const reefVariant = variantIndex % 3;
  if (reefVariant === 0) {
    gfx.drawPolygon(
      [
        { x: 0, y: 4 },
        { x: Math.round(w * 0.18), y: -Math.round(h * 0.58) },
        { x: Math.round(w * 0.46), y: -h },
        { x: Math.round(w * 0.76), y: -Math.round(h * 0.68) },
        { x: w, y: 4 },
      ],
      { fill: { color: [16, 84, 112], alpha: a } }
    );
    gfx.drawPolygon(
      [
        { x: Math.round(w * 0.18), y: -Math.round(h * 0.58) },
        { x: Math.round(w * 0.46), y: -h },
        { x: Math.round(w * 0.76), y: -Math.round(h * 0.68) },
        { x: Math.round(w * 0.48), y: -Math.round(h * 0.74) },
      ],
      { fill: { color: [52, 152, 178], alpha: a * 0.85 } }
    );
  } else if (reefVariant === 1) {
    // Banco recifal em terraço duplo
    gfx.drawPolygon(
      [
        { x: 0, y: 4 },
        { x: Math.round(w * 0.14), y: -Math.round(h * 0.65) },
        { x: Math.round(w * 0.36), y: -Math.round(h * 0.92) },
        { x: Math.round(w * 0.58), y: -Math.round(h * 0.72) },
        { x: Math.round(w * 0.82), y: -Math.round(h * 0.82) },
        { x: w, y: 4 },
      ],
      { fill: { color: [18, 90, 118], alpha: a } }
    );
    gfx.drawPolygon(
      [
        { x: Math.round(w * 0.14), y: -Math.round(h * 0.65) },
        { x: Math.round(w * 0.36), y: -Math.round(h * 0.92) },
        { x: Math.round(w * 0.58), y: -Math.round(h * 0.72) },
        { x: Math.round(w * 0.38), y: -Math.round(h * 0.68) },
      ],
      { fill: { color: [58, 162, 186], alpha: a * 0.85 } }
    );
  } else {
    // Platô calcário alongado e luminoso
    gfx.drawPolygon(
      [
        { x: 0, y: 4 },
        { x: Math.round(w * 0.2), y: -Math.round(h * 0.78) },
        { x: Math.round(w * 0.62), y: -Math.round(h * 0.86) },
        { x: Math.round(w * 0.86), y: -Math.round(h * 0.48) },
        { x: w, y: 4 },
      ],
      { fill: { color: [15, 80, 108], alpha: a } }
    );
    gfx.drawPolygon(
      [
        { x: Math.round(w * 0.2), y: -Math.round(h * 0.78) },
        { x: Math.round(w * 0.62), y: -Math.round(h * 0.86) },
        { x: Math.round(w * 0.58), y: -Math.round(h * 0.66) },
        { x: Math.round(w * 0.24), y: -Math.round(h * 0.62) },
      ],
      { fill: { color: [56, 158, 184], alpha: a * 0.82 } }
    );
  }
}

/**
 * Instancia as silhuetas bentônicas por etapa no `worldContainer` (zIndex = -5)
 * e registra cada nó no `SpatialCullingManager` (sem alocar FBOs extras de cacheAsTexture).
 */
export function setupBenthicStageSilhouettes(
  realEngine: IRenderEngine,
  floorY: number
): IGraphicsNode[] {
  const worldContainer = resolveWorldRenderContainer(realEngine);
  const cullingManager = getSpatialCullingManager();
  type CullingTarget = Parameters<NonNullable<typeof cullingManager>["registerEntity"]>[0];

  const specs = buildBenthicSilhouetteSpecs();
  const createdNodes: IGraphicsNode[] = [];

  specs.forEach((spec, index) => {
    const gfx = realEngine.createGraphics(`benthic_silhouette_${spec.kind}_${index}`);
    drawSilhouetteGeometry(gfx, spec, index);
    gfx.setPosition(spec.x, floorY);
    gfx.setZIndex(-5);
    worldContainer.addChild(gfx);
    cullingManager?.registerEntity(gfx as unknown as CullingTarget, () => spec.x, spec.width);
    createdNodes.push(gfx);
  });

  return createdNodes;
}
