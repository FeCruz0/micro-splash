import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";

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
  // =========================================================================
  // 1. BIOMA 1: ANTÁRTICA (0m – 5.000m) — Morainas e Elevações Basálticas Glaciais
  // =========================================================================
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

  // =========================================================================
  // 2. BIOMA 2: MAR ABERTO / PELÁGICO (5.000m – 12.000m) — Talude e Montes Submarinos
  // =========================================================================
  { startX: 6300, width: 420, height: 52, type: "seamount", name: "Monte Submarino Austral" },
  {
    startX: 8100,
    width: 560,
    height: 68,
    type: "seamount",
    name: "Dorsal Oceânica do Atlântico Sul",
  },
  { startX: 10300, width: 480, height: 58, type: "seamount", name: "Cume Abissal Pelágico" },

  // =========================================================================
  // 3. BIOMA 3: COSTA URBANA (12.000m – 19.000m) — Bancos de Areia e Lajes de Arenito
  // =========================================================================
  { startX: 12800, width: 360, height: 26, type: "sandbar", name: "Banco de Areia Costeiro" },
  { startX: 14500, width: 440, height: 36, type: "sandbar", name: "Laje de Arenito Submerso" },
  { startX: 16200, width: 380, height: 32, type: "sandbar", name: "Ondulação de Areia da Bacia" },
  { startX: 17800, width: 420, height: 40, type: "sandbar", name: "Recife de Arenito Continental" },

  // =========================================================================
  // 4. BIOMA 4: CÂNICONS DE CABO FRIO (19.000m – 25.000m) — Paredões Escarpados de Ressurgência
  // =========================================================================
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

  // =========================================================================
  // 5. BIOMA 5: ENSEADA DE ARRAIAL (27.300m – 30.000m) — Bancos de Areia e Arrecifes Rasos
  // =========================================================================
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
      // Topo irregular serrilhado com 3-5 picos de cascalho glacial recortado
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
      // Monte submarino cônico vulcânico com encostas íngremes e ápice pronunciado
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
      // Banco de areia suave com topo aplanado e declive gradual
      return [
        { x: 0, y: floorBaseY + 60 },
        { x: 0, y: floorBaseY },
        { x: w * 0.2, y: floorBaseY - h * 0.3 },
        { x: w * 0.36, y: floorBaseY - h * 0.82 },
        { x: w * 0.44, y: floorBaseY - h * 0.98 },
        { x: w * 0.5, y: peakY },
        { x: w * 0.56, y: floorBaseY - h * 0.98 },
        { x: w * 0.64, y: floorBaseY - h * 0.82 },
        { x: w * 0.8, y: floorBaseY - h * 0.3 },
        { x: w, y: floorBaseY },
        { x: w, y: floorBaseY + 60 },
      ];

    case "canyon_ridge":
      // Paredões graníticos abruptos e quase verticais com fendas
      return [
        { x: 0, y: floorBaseY + 60 },
        { x: 0, y: floorBaseY },
        { x: w * 0.2, y: floorBaseY - h * 0.15 },
        { x: w * 0.28, y: floorBaseY - h * 0.88 },
        { x: w * 0.34, y: floorBaseY - h * 0.96 },
        { x: w * 0.48, y: peakY },
        { x: w * 0.68, y: floorBaseY - h * 0.98 },
        { x: w * 0.74, y: floorBaseY - h * 0.88 },
        { x: w * 0.82, y: floorBaseY - h * 0.18 },
        { x: w, y: floorBaseY },
        { x: w, y: floorBaseY + 60 },
      ];

    case "reef_shoal":
      // Plataforma carbonática irregular com degraus de arrecife
      return [
        { x: 0, y: floorBaseY + 60 },
        { x: 0, y: floorBaseY },
        { x: w * 0.16, y: floorBaseY - h * 0.4 },
        { x: w * 0.3, y: floorBaseY - h * 0.85 },
        { x: w * 0.42, y: floorBaseY - h * 0.92 },
        { x: w * 0.52, y: peakY },
        { x: w * 0.62, y: floorBaseY - h * 0.88 },
        { x: w * 0.74, y: floorBaseY - h * 0.95 },
        { x: w * 0.85, y: floorBaseY - h * 0.45 },
        { x: w, y: floorBaseY },
        { x: w, y: floorBaseY + 60 },
      ];
  }
}

/**
 * Gera os vértices da camada superficial (sedimento, musgo, areia) adaptados ao tipo geológico.
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
        { x: w * 0.18, y: floorBaseY - h * 0.4 },
        { x: w * 0.28, y: floorBaseY - h * 0.65 },
        { x: w * 0.4, y: floorBaseY - h * 0.85 },
        { x: w * 0.5, y: floorBaseY - h * 0.68 },
        { x: w * 0.62, y: floorBaseY - h * 1.0 },
        { x: w * 0.74, y: floorBaseY - h * 0.72 },
        { x: w * 0.84, y: floorBaseY - h * 0.42 },
        { x: w * 0.8, y: floorBaseY - h * 0.38 + 5 },
        { x: w * 0.62, y: floorBaseY - h * 1.0 + 7 },
        { x: w * 0.5, y: floorBaseY - h * 0.68 + 6 },
        { x: w * 0.4, y: floorBaseY - h * 0.85 + 7 },
        { x: w * 0.24, y: floorBaseY - h * 0.4 + 5 },
      ];

    case "seamount":
      return [
        { x: w * 0.32, y: floorBaseY - h * 0.55 },
        { x: w * 0.46, y: floorBaseY - h * 0.95 },
        { x: w * 0.5, y: peakY - 1 },
        { x: w * 0.54, y: floorBaseY - h * 0.95 },
        { x: w * 0.68, y: floorBaseY - h * 0.55 },
        { x: w * 0.62, y: floorBaseY - h * 0.55 + 6 },
        { x: w * 0.5, y: peakY + 7 },
        { x: w * 0.38, y: floorBaseY - h * 0.55 + 6 },
      ];

    case "sandbar":
      return [
        { x: w * 0.28, y: floorBaseY - h * 0.65 },
        { x: w * 0.44, y: floorBaseY - h * 0.98 },
        { x: w * 0.5, y: peakY - 1 },
        { x: w * 0.56, y: floorBaseY - h * 0.98 },
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
export function setupOceanFloorSystem(k: KaboomCtx) {
  const floorBaseY = k.height() - 40;

  SUBMARINE_RELIEFS.forEach((relief) => {
    let revealTimer = 0;
    const peakY = floorBaseY - relief.height;

    // Paleta de cores geológica por bioma
    let bodyColor = k.rgb(20, 36, 52);
    let capColor = k.rgb(35, 65, 85);
    let outlineColor = k.rgb(40, 60, 80);

    if (relief.type === "moraine") {
      // Tons glaciais frios com topo de sedimentos polares
      bodyColor = k.rgb(25, 42, 60);
      capColor = k.rgb(55, 95, 125);
      outlineColor = k.rgb(65, 110, 145);
    } else if (relief.type === "seamount") {
      // Basalto vulcânico escuro do leito abissal
      bodyColor = k.rgb(16, 26, 42);
      capColor = k.rgb(32, 54, 82);
      outlineColor = k.rgb(38, 64, 96);
    } else if (relief.type === "sandbar") {
      // Arenito e sedimentos costeiros
      bodyColor = k.rgb(18, 28, 44);
      capColor = k.rgb(48, 68, 88);
      outlineColor = k.rgb(42, 60, 78);
    } else if (relief.type === "canyon_ridge") {
      // Paredões graníticos escarpados do cânion
      bodyColor = k.rgb(22, 34, 48);
      capColor = k.rgb(32, 78, 82); // Veios minerais esmeralda da ressurgência
      outlineColor = k.rgb(45, 90, 95);
    } else if (relief.type === "reef_shoal") {
      // Areia cristalina e carbonato de cálcio
      bodyColor = k.rgb(12, 48, 76);
      capColor = k.rgb(24, 105, 120);
      outlineColor = k.rgb(35, 130, 150);
    }

    // 1. Corpo Geológico Poligonal do Relevo
    const bodyPoints = generateReliefPolygonPoints(relief, floorBaseY).map((pt) =>
      k.vec2(pt.x, pt.y)
    );
    const shapeObj = k.add([
      k.polygon(bodyPoints),
      k.pos(relief.startX, 0),
      k.color(bodyColor),
      k.outline(2, outlineColor),
      k.z(1),
      TAGS.OBSTACLE,
      "ocean_relief",
      {
        reliefData: relief,
        reveal() {
          revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
        },
      },
    ]);

    // 2. Colisor Físico Sólido (Impede a baleia de atravessar o relevo)
    k.add([
      k.rect(relief.width * 0.65, relief.height + 40),
      k.pos(relief.startX + relief.width * 0.175, peakY),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      k.z(2),
      TAGS.OBSTACLE,
      "ocean_relief_collider",
    ]);

    // 3. Camada de Cobertura Superficial (Sedimentos, Algas e Musgo Marinho)
    const capPoints = generateReliefCapPolygonPoints(relief, floorBaseY).map((pt) =>
      k.vec2(pt.x, pt.y)
    );
    k.add([k.polygon(capPoints), k.pos(relief.startX, 0), k.color(capColor), k.z(2)]);

    // 4. Detalhes Geológicos (Fendas minerais e pedregulhos)
    const detailCount = 3;
    for (let d = 0; d < detailCount; d++) {
      const dx = relief.startX + relief.width * (0.32 + d * 0.16);
      const dy = peakY + 12 + d * 6;
      k.add([
        k.rect(14 + d * 6, 2.5, { radius: 1 }),
        k.pos(dx, dy),
        k.color(k.rgb(capColor.r * 1.3, capColor.g * 1.3, capColor.b * 1.3)),
        k.opacity(0.6),
        k.z(2),
      ]);
    }

    // 5. Atualização de luminescência e eco por Biosonar
    shapeObj.onUpdate(() => {
      if (revealTimer > 0) {
        revealTimer -= k.dt();
        const flashIntensity = Math.min(1, revealTimer / 1.5);
        shapeObj.outline.color = k.rgb(
          k.lerp(outlineColor.r, 0, flashIntensity),
          k.lerp(outlineColor.g, 240, flashIntensity),
          k.lerp(outlineColor.b, 255, flashIntensity)
        );
        shapeObj.outline.width = 1.5 + flashIntensity * 2;
      } else {
        shapeObj.outline.color = outlineColor;
        shapeObj.outline.width = 1.5;
      }
    });
  });
}
