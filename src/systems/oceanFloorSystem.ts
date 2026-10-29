/**
 * Sistema de Topografia e Relevos Submarinos — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { GAME_CONFIG, TAGS } from "../config";
import { getSpatialCullingManager } from "./spatialCullingSystem";
import type { IRenderEngine, Vector2D } from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine, type LegacyEngineBridge } from "../engine/adapters/LegacyBridge";

export interface SubmarineRelief {
  startX: number;
  width: number;
  height: number;
  type: "moraine" | "seamount" | "sandbar" | "canyon_ridge" | "reef_shoal";
  name: string;
}

/**
 * Catálogo de Relevos Submarinos Autênticos ao longo dos 30.000m de rota migratória.
 * Cada formação geológica reflete a morfologia oceânica real da costa sul-americana.
 */
export const SUBMARINE_RELIEFS: SubmarineRelief[] = [
  // 1. BIOMA 1: ANTÁRTICA (0m – 5.000m)
  {
    startX: 850,
    width: 220,
    height: 28,
    type: "moraine",
    name: "Moraina Glacial das Ilhas Shetland",
  },
  { startX: 1800, width: 280, height: 35, type: "moraine", name: "Elevação Basáltica Polar" },
  { startX: 3050, width: 240, height: 30, type: "moraine", name: "Platô de Cascalho Glacial" },
  { startX: 4300, width: 300, height: 38, type: "moraine", name: "Borda da Plataforma Antártica" },

  // 2. BIOMA 2: MAR ABERTO / PELÁGICO (5.000m – 12.000m)
  { startX: 6300, width: 420, height: 52, type: "seamount", name: "Monte Submarino Austral" },
  {
    startX: 8100,
    width: 560,
    height: 68,
    type: "seamount",
    name: "Dorsal Oceânica do Atlântico Sul",
  },
  { startX: 10300, width: 480, height: 58, type: "seamount", name: "Cume Abissal Pelágico" },

  // 3. BIOMA 3: COSTA URBANA (12.000m – 19.000m)
  { startX: 12800, width: 360, height: 26, type: "sandbar", name: "Banco de Areia Costeiro" },
  { startX: 14500, width: 440, height: 36, type: "sandbar", name: "Laje de Arenito Submerso" },
  { startX: 16200, width: 380, height: 32, type: "sandbar", name: "Ondulação de Areia da Bacia" },
  { startX: 17800, width: 420, height: 40, type: "sandbar", name: "Recife de Arenito Continental" },

  // 4. BIOMA 4: CÂNICONS DE CABO FRIO (19.000m – 25.000m)
  {
    startX: 19600,
    width: 460,
    height: 65,
    type: "canyon_ridge",
    name: "Garganta Ocidental do Cânion de Cabo Frio",
  },
  {
    startX: 21100,
    width: 520,
    height: 75,
    type: "canyon_ridge",
    name: "Desfiladeiro Central da Ressurgência",
  },
  {
    startX: 22800,
    width: 480,
    height: 72,
    type: "canyon_ridge",
    name: "Escarpa Oriental de Fenda Geológica",
  },
  {
    startX: 24200,
    width: 440,
    height: 60,
    type: "canyon_ridge",
    name: "Contraforte Pré-Boqueirão",
  },

  // 5. BIOMA 5: ENSEADA DE ARRAIAL (27.300m – 30.000m)
  { startX: 27600, width: 380, height: 34, type: "reef_shoal", name: "Banco de Corais da Enseada" },
  {
    startX: 28800,
    width: 420,
    height: 28,
    type: "reef_shoal",
    name: "Plataforma de Areia Branca do Santuário",
  },
  {
    startX: 29650,
    width: 350,
    height: 42,
    type: "reef_shoal",
    name: "Soleira da Linha de Chegada",
  },
];

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Gera os vértices do polígono do relevo com morfologia geológica autêntica (Fase 30.1).
 */
export function generateReliefPolygonPoints(
  relief: SubmarineRelief,
  floorBaseY: number
): Point2D[] {
  const w = relief.width;
  const h = relief.height;
  const peakY = floorBaseY - h;

  switch (relief.type) {
    case "moraine":
      return [
        { x: 0, y: floorBaseY + 60 },
        { x: 0, y: floorBaseY },
        { x: w * 0.15, y: floorBaseY - h * 0.35 },
        { x: w * 0.28, y: floorBaseY - h * 0.65 },
        { x: w * 0.4, y: floorBaseY - h * 0.85 },
        { x: w * 0.5, y: floorBaseY - h * 0.68 },
        { x: w * 0.62, y: floorBaseY - h * 1.0 },
        { x: w * 0.74, y: floorBaseY - h * 0.72 },
        { x: w * 0.86, y: floorBaseY - h * 0.38 },
        { x: w, y: floorBaseY },
        { x: w, y: floorBaseY + 60 },
      ];

    case "seamount":
      return [
        { x: 0, y: floorBaseY + 60 },
        { x: 0, y: floorBaseY },
        { x: w * 0.22, y: floorBaseY - h * 0.22 },
        { x: w * 0.38, y: floorBaseY - h * 0.72 },
        { x: w * 0.46, y: floorBaseY - h * 0.95 },
        { x: w * 0.5, y: peakY },
        { x: w * 0.54, y: floorBaseY - h * 0.95 },
        { x: w * 0.62, y: floorBaseY - h * 0.72 },
        { x: w * 0.78, y: floorBaseY - h * 0.22 },
        { x: w, y: floorBaseY },
        { x: w, y: floorBaseY + 60 },
      ];

    case "sandbar":
      return [
        { x: 0, y: floorBaseY + 60 },
        { x: 0, y: floorBaseY },
        { x: w * 0.2, y: floorBaseY - h * 0.3 },
        { x: w * 0.36, y: floorBaseY - h * 0.82 },
        { x: w * 0.48, y: floorBaseY - h * 0.98 },
        { x: w * 0.56, y: peakY },
        { x: w * 0.68, y: floorBaseY - h * 0.92 },
        { x: w * 0.82, y: floorBaseY - h * 0.45 },
        { x: w, y: floorBaseY },
        { x: w, y: floorBaseY + 60 },
      ];

    case "canyon_ridge":
      return [
        { x: 0, y: floorBaseY + 60 },
        { x: 0, y: floorBaseY },
        { x: w * 0.12, y: floorBaseY - h * 0.45 },
        { x: w * 0.24, y: floorBaseY - h * 0.78 },
        { x: w * 0.35, y: floorBaseY - h * 0.98 },
        { x: w * 0.48, y: peakY },
        { x: w * 0.62, y: floorBaseY - h * 0.92 },
        { x: w * 0.78, y: floorBaseY - h * 0.8 },
        { x: w * 0.88, y: floorBaseY - h * 0.35 },
        { x: w, y: floorBaseY },
        { x: w, y: floorBaseY + 60 },
      ];

    case "reef_shoal":
      return [
        { x: 0, y: floorBaseY + 60 },
        { x: 0, y: floorBaseY },
        { x: w * 0.15, y: floorBaseY - h * 0.32 },
        { x: w * 0.3, y: floorBaseY - h * 0.7 },
        { x: w * 0.42, y: floorBaseY - h * 0.92 },
        { x: w * 0.52, y: peakY },
        { x: w * 0.65, y: floorBaseY - h * 0.88 },
        { x: w * 0.75, y: floorBaseY - h * 0.95 },
        { x: w * 0.88, y: floorBaseY - h * 0.4 },
        { x: w, y: floorBaseY },
        { x: w, y: floorBaseY + 60 },
      ];
  }
}

/**
 * Gera os vértices da camada de cobertura geológica superior (Fase 30.1).
 */
export function generateReliefCapPolygonPoints(
  relief: SubmarineRelief,
  floorBaseY: number
): Point2D[] {
  const w = relief.width;
  const h = relief.height;
  const peakY = floorBaseY - h;

  switch (relief.type) {
    case "moraine":
      return [
        { x: w * 0.25, y: floorBaseY - h * 0.65 },
        { x: w * 0.4, y: floorBaseY - h * 0.85 },
        { x: w * 0.5, y: floorBaseY - h * 0.68 },
        { x: w * 0.62, y: floorBaseY - h * 1.0 },
        { x: w * 0.74, y: floorBaseY - h * 0.72 },
        { x: w * 0.7, y: floorBaseY - h * 0.72 + 6 },
        { x: w * 0.62, y: floorBaseY - h * 1.0 + 8 },
        { x: w * 0.5, y: floorBaseY - h * 0.68 + 6 },
        { x: w * 0.4, y: floorBaseY - h * 0.85 + 7 },
        { x: w * 0.28, y: floorBaseY - h * 0.65 + 6 },
      ];

    case "seamount":
      return [
        { x: w * 0.36, y: floorBaseY - h * 0.72 },
        { x: w * 0.46, y: floorBaseY - h * 0.95 },
        { x: w * 0.5, y: peakY - 1 },
        { x: w * 0.54, y: floorBaseY - h * 0.95 },
        { x: w * 0.64, y: floorBaseY - h * 0.72 },
        { x: w * 0.58, y: floorBaseY - h * 0.72 + 8 },
        { x: w * 0.5, y: peakY + 8 },
        { x: w * 0.42, y: floorBaseY - h * 0.72 + 8 },
      ];

    case "sandbar":
      return [
        { x: w * 0.32, y: floorBaseY - h * 0.75 },
        { x: w * 0.48, y: floorBaseY - h * 0.98 },
        { x: w * 0.56, y: peakY },
        { x: w * 0.68, y: floorBaseY - h * 0.92 },
        { x: w * 0.72, y: floorBaseY - h * 0.65 },
        { x: w * 0.66, y: floorBaseY - h * 0.65 + 5 },
        { x: w * 0.5, y: peakY + 6 },
        { x: w * 0.34, y: floorBaseY - h * 0.65 + 5 },
      ];

    case "canyon_ridge":
      return [
        { x: w * 0.26, y: floorBaseY - h * 0.75 },
        { x: w * 0.34, y: floorBaseY - h * 0.96 },
        { x: w * 0.48, y: peakY - 1 },
        { x: w * 0.68, y: floorBaseY - h * 0.98 },
        { x: w * 0.76, y: floorBaseY - h * 0.75 },
        { x: w * 0.7, y: floorBaseY - h * 0.75 + 6 },
        { x: w * 0.48, y: peakY + 7 },
        { x: w * 0.3, y: floorBaseY - h * 0.75 + 6 },
      ];

    case "reef_shoal":
      return [
        { x: w * 0.22, y: floorBaseY - h * 0.65 },
        { x: w * 0.42, y: floorBaseY - h * 0.92 },
        { x: w * 0.52, y: peakY - 1 },
        { x: w * 0.62, y: floorBaseY - h * 0.88 },
        { x: w * 0.74, y: floorBaseY - h * 0.95 },
        { x: w * 0.8, y: floorBaseY - h * 0.65 },
        { x: w * 0.72, y: floorBaseY - h * 0.65 + 6 },
        { x: w * 0.52, y: peakY + 7 },
        { x: w * 0.3, y: floorBaseY - h * 0.65 + 6 },
      ];
  }
}

/**
 * Cria a topografia do leito marinho com colisões sólidas e resposta ao Biosonar.
 */
export function setupOceanFloorSystem(engineOrContext: IRenderEngine | LegacyEngineBridge): void {
  const isPixi = isRenderEngine(engineOrContext);
  const screenH = isPixi
    ? engineOrContext.getDimensions().height
    : typeof engineOrContext.height === "function"
      ? engineOrContext.height()
      : 360;

  const floorBaseY = screenH - 40;
  const cullingManager = getSpatialCullingManager();

  SUBMARINE_RELIEFS.forEach((relief) => {
    let revealTimer = 0;
    const peakY = floorBaseY - relief.height;

    // Paleta de cores geológica por bioma
    let bodyColor: [number, number, number] = [20, 36, 52];
    let capColor: [number, number, number] = [35, 65, 85];
    let outlineColor: [number, number, number] = [40, 60, 80];

    if (relief.type === "moraine") {
      bodyColor = [25, 42, 60];
      capColor = [55, 95, 125];
      outlineColor = [65, 110, 145];
    } else if (relief.type === "seamount") {
      bodyColor = [16, 26, 42];
      capColor = [32, 54, 82];
      outlineColor = [38, 64, 96];
    } else if (relief.type === "sandbar") {
      bodyColor = [18, 28, 44];
      capColor = [48, 68, 88];
      outlineColor = [42, 60, 78];
    } else if (relief.type === "canyon_ridge") {
      bodyColor = [22, 34, 48];
      capColor = [32, 78, 82];
      outlineColor = [45, 90, 95];
    } else if (relief.type === "reef_shoal") {
      bodyColor = [12, 48, 76];
      capColor = [24, 105, 120];
      outlineColor = [35, 130, 150];
    }

    const bodyPoints: Vector2D[] = generateReliefPolygonPoints(relief, floorBaseY);
    const capPoints: Vector2D[] = generateReliefCapPolygonPoints(relief, floorBaseY);

    if (isPixi) {
      // 1. Corpo Geológico Poligonal do Relevo
      const shapeGfx = engineOrContext.createGraphics("ocean_relief");
      shapeGfx.drawPolygon(bodyPoints, {
        fill: { color: bodyColor },
        stroke: { color: outlineColor, width: 2 },
      });
      shapeGfx.setPosition(relief.startX, 0);
      shapeGfx.setZIndex(1);
      engineOrContext.getStageRoot().addChild(shapeGfx);

      // 2. Camada de Cobertura Superficial
      const capGfx = engineOrContext.createGraphics("ocean_relief_cap");
      capGfx.drawPolygon(capPoints, {
        fill: { color: capColor },
      });
      capGfx.setPosition(relief.startX, 0);
      capGfx.setZIndex(2);
      engineOrContext.getStageRoot().addChild(capGfx);

      // 3. Detalhes Geológicos
      for (let d = 0; d < 3; d++) {
        const dx = relief.startX + relief.width * (0.32 + d * 0.16);
        const dy = peakY + 12 + d * 6;
        const detailGfx = engineOrContext.createGraphics("ocean_relief_detail");
        detailGfx.drawRoundedRect(0, 0, 14 + d * 6, 2.5, 1, {
          fill: {
            color: [
              Math.min(255, capColor[0] * 1.3),
              Math.min(255, capColor[1] * 1.3),
              Math.min(255, capColor[2] * 1.3),
            ],
            alpha: 0.6,
          },
        });
        detailGfx.setPosition(dx, dy);
        detailGfx.setZIndex(2);
        engineOrContext.getStageRoot().addChild(detailGfx);
      }
    } else {
      // Legacy Kaboom engine
      const legacyCtx = engineOrContext as LegacyEngineBridge & {
        rgb(r: number, g: number, b: number): unknown;
        vec2(x: number, y: number): unknown;
        area(): unknown;
        body(opts: unknown): unknown;
        outline(w: number, col: unknown): unknown;
      };

      const kBodyPoints = bodyPoints.map((pt) =>
        typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(pt.x, pt.y) : pt
      );
      const kCapPoints = capPoints.map((pt) =>
        typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(pt.x, pt.y) : pt
      );

      const legacyOutlineColor =
        typeof legacyCtx.rgb === "function"
          ? legacyCtx.rgb(outlineColor[0], outlineColor[1], outlineColor[2])
          : outlineColor;

      type CullingTarget = Parameters<NonNullable<typeof cullingManager>["registerEntity"]>[0];

      const shapeObj = legacyCtx.add([
        legacyCtx.polygon(kBodyPoints),
        legacyCtx.pos(relief.startX, 0),
        legacyCtx.color(bodyColor[0], bodyColor[1], bodyColor[2]),
        typeof legacyCtx.outline === "function" ? legacyCtx.outline(2, legacyOutlineColor) : null,
        legacyCtx.z(1),
        TAGS.OBSTACLE,
        "ocean_relief",
        {
          reliefData: relief,
          reveal() {
            revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
          },
        },
      ]) as {
        hidden?: boolean;
        outline?: { color: unknown; width: number };
        onUpdate(cb: () => void): void;
      };

      cullingManager?.registerEntity(
        shapeObj as unknown as CullingTarget,
        () => relief.startX + relief.width / 2
      );

      // Colisor Físico Sólido
      legacyCtx.add([
        legacyCtx.rect(relief.width * 0.65, relief.height + 40),
        legacyCtx.pos(relief.startX + relief.width * 0.175, peakY),
        typeof legacyCtx.area === "function" ? legacyCtx.area() : null,
        typeof legacyCtx.body === "function" ? legacyCtx.body({ isStatic: true }) : null,
        legacyCtx.opacity(0),
        legacyCtx.z(2),
        TAGS.OBSTACLE,
        "ocean_relief_collider",
      ]);

      const capObj = legacyCtx.add([
        legacyCtx.polygon(kCapPoints),
        legacyCtx.pos(relief.startX, 0),
        legacyCtx.color(capColor[0], capColor[1], capColor[2]),
        legacyCtx.z(2),
      ]);
      cullingManager?.registerEntity(
        capObj as unknown as CullingTarget,
        () => relief.startX + relief.width / 2
      );

      for (let d = 0; d < 3; d++) {
        const dx = relief.startX + relief.width * (0.32 + d * 0.16);
        const dy = peakY + 12 + d * 6;
        const detailObj = legacyCtx.add([
          legacyCtx.rect(14 + d * 6, 2.5, { radius: 1 }),
          legacyCtx.pos(dx, dy),
          legacyCtx.color(
            Math.min(255, capColor[0] * 1.3),
            Math.min(255, capColor[1] * 1.3),
            Math.min(255, capColor[2] * 1.3)
          ),
          legacyCtx.opacity(0.6),
          legacyCtx.z(2),
        ]);
        cullingManager?.registerEntity(detailObj as unknown as CullingTarget, () => dx);
      }

      if (shapeObj && typeof shapeObj.onUpdate === "function") {
        shapeObj.onUpdate(() => {
          if (shapeObj.hidden && revealTimer <= 0) return;

          if (revealTimer > 0) {
            revealTimer -= legacyCtx.dt();
            const flashIntensity = Math.min(1, revealTimer / 1.5);
            if (shapeObj.outline) {
              shapeObj.outline.width = 1.5 + flashIntensity * 2;
            }
          } else if (shapeObj.outline) {
            shapeObj.outline.width = 1.5;
          }
        });
      }
    }
  });
}
