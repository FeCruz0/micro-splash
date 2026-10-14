import type { GameObj, KaboomCtx } from "kaboom";
import { GAME_CONFIG, TAGS } from "../../config";
import type { CanyonConfig, CanyonGeometryResult, CanyonFoamParticle } from "./canyonTypes";

export function setupCanyonGeometry(k: KaboomCtx, config: CanyonConfig): CanyonGeometryResult {
  const {
    surfaceY,
    deepFloorY,
    shallowRockTopY,
    seabedThickness,
    boqueiraoStartX,
    rampUpEndX,
    plateauEndX,
    boqueiraoEndX,
    lighthouseX,
  } = config;

  let revealTimer = 0;
  const setRevealTimer = (duration: number) => {
    revealTimer = duration;
  };
  const getRevealTimer = () => revealTimer;

  // =========================================================================
  // 1. FUNDO ROCHOSO DO BOQUEIRÃO (SUBMERSO - FORMAÇÃO ORGÂNICA CONTÍNUA)
  // =========================================================================

  // A. Rampa de Subida Orgânica (25.400m a 25.800m)
  const rampUpWidth = rampUpEndX - boqueiraoStartX;
  const rampUpShape = k.add([
    k.polygon([
      k.vec2(0, deepFloorY + 140),
      k.vec2(0, deepFloorY),
      k.vec2(rampUpWidth * 0.2, deepFloorY - (deepFloorY - shallowRockTopY) * 0.22),
      k.vec2(rampUpWidth * 0.45, deepFloorY - (deepFloorY - shallowRockTopY) * 0.5),
      k.vec2(rampUpWidth * 0.72, deepFloorY - (deepFloorY - shallowRockTopY) * 0.78),
      k.vec2(rampUpWidth * 0.9, shallowRockTopY + 8),
      k.vec2(rampUpWidth, shallowRockTopY),
      k.vec2(rampUpWidth, deepFloorY + 140),
    ]),
    k.pos(boqueiraoStartX, 0),
    k.color(36, 46, 60),
    k.outline(2, k.rgb(60, 80, 100)),
    k.z(2),
    TAGS.OBSTACLE,
    "boqueirao_rock",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]);

  // Colisores Físicos Sólidos da Rampa de Subida
  const upSegments = 4;
  const upSegW = rampUpWidth / upSegments;
  for (let i = 0; i < upSegments; i++) {
    const segX = boqueiraoStartX + i * upSegW;
    const t = (i + 0.5) / upSegments;
    const segTopY = deepFloorY - t * (deepFloorY - shallowRockTopY);
    k.add([
      k.rect(upSegW + 4, deepFloorY + 140 - segTopY),
      k.pos(segX, segTopY),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      k.z(3),
      TAGS.OBSTACLE,
      "boqueirao_rock_collider",
    ]);
  }

  // Cobertura vegetal de musgo e algas calcárias na rampa de subida
  k.add([
    k.polygon([
      k.vec2(0, deepFloorY),
      k.vec2(rampUpWidth * 0.2, deepFloorY - (deepFloorY - shallowRockTopY) * 0.22),
      k.vec2(rampUpWidth * 0.45, deepFloorY - (deepFloorY - shallowRockTopY) * 0.5),
      k.vec2(rampUpWidth * 0.72, deepFloorY - (deepFloorY - shallowRockTopY) * 0.78),
      k.vec2(rampUpWidth, shallowRockTopY),
      k.vec2(rampUpWidth, shallowRockTopY + 8),
      k.vec2(rampUpWidth * 0.72, deepFloorY - (deepFloorY - shallowRockTopY) * 0.78 + 8),
      k.vec2(rampUpWidth * 0.45, deepFloorY - (deepFloorY - shallowRockTopY) * 0.5 + 8),
      k.vec2(rampUpWidth * 0.2, deepFloorY - (deepFloorY - shallowRockTopY) * 0.22 + 8),
      k.vec2(0, deepFloorY + 8),
    ]),
    k.pos(boqueiraoStartX, 0),
    k.color(28, 105, 80),
    k.z(3),
  ]);

  // B. Platô Rochoso Central do Boqueirão (25.800m a 26.900m)
  const plateauWidth = plateauEndX - rampUpEndX;
  const plateauObj = k.add([
    k.rect(plateauWidth, seabedThickness),
    k.pos(rampUpEndX, shallowRockTopY),
    k.area(),
    k.body({ isStatic: true }),
    k.color(34, 44, 58),
    k.outline(2, k.rgb(60, 80, 100)),
    k.z(2),
    TAGS.OBSTACLE,
    "boqueirao_rock",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]);

  // C. Rampa de Descida Orgânica (26.900m a 27.300m)
  const rampDownWidth = boqueiraoEndX - plateauEndX;
  const rampDownShape = k.add([
    k.polygon([
      k.vec2(0, shallowRockTopY),
      k.vec2(rampDownWidth * 0.15, shallowRockTopY + 6),
      k.vec2(rampDownWidth * 0.35, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.3),
      k.vec2(rampDownWidth * 0.62, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.65),
      k.vec2(rampDownWidth * 0.85, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.88),
      k.vec2(rampDownWidth, deepFloorY),
      k.vec2(rampDownWidth, deepFloorY + 140),
      k.vec2(0, deepFloorY + 140),
    ]),
    k.pos(plateauEndX, 0),
    k.color(36, 46, 60),
    k.outline(2, k.rgb(60, 80, 100)),
    k.z(2),
    TAGS.OBSTACLE,
    "boqueirao_rock",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]);

  // Colisores Físicos Sólidos da Rampa de Descida
  const downSegments = 4;
  const downSegW = rampDownWidth / downSegments;
  for (let i = 0; i < downSegments; i++) {
    const segX = plateauEndX + i * downSegW;
    const t = (i + 0.5) / downSegments;
    const segTopY = shallowRockTopY + t * (deepFloorY - shallowRockTopY);
    k.add([
      k.rect(downSegW + 4, deepFloorY + 140 - segTopY),
      k.pos(segX, segTopY),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      k.z(3),
      TAGS.OBSTACLE,
      "boqueirao_rock_collider",
    ]);
  }

  // Cobertura de musgo na rampa de descida
  k.add([
    k.polygon([
      k.vec2(0, shallowRockTopY),
      k.vec2(rampDownWidth * 0.35, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.3),
      k.vec2(rampDownWidth * 0.62, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.65),
      k.vec2(rampDownWidth, deepFloorY),
      k.vec2(rampDownWidth, deepFloorY + 8),
      k.vec2(rampDownWidth * 0.62, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.65 + 8),
      k.vec2(rampDownWidth * 0.35, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.3 + 8),
      k.vec2(0, shallowRockTopY + 8),
    ]),
    k.pos(plateauEndX, 0),
    k.color(28, 105, 80),
    k.z(3),
  ]);

  // =========================================================================
  // 2. A ILHA DO FAROL (SUPERFÍCIE E CÉU COM CAMADAS DE PROFUNDIDADE)
  // =========================================================================

  const islandStartX = 25750;
  const islandEndX = 26950;
  const islandWidth = islandEndX - islandStartX;
  const islandPeakY = surfaceY - 82;

  // A. Silhueta de Fundo da Cordilheira da Ilha
  k.add([
    k.polygon([
      k.vec2(0, surfaceY),
      k.vec2(180, surfaceY - 45),
      k.vec2(islandWidth * 0.45, islandPeakY - 12),
      k.vec2(islandWidth * 0.6, islandPeakY - 8),
      k.vec2(islandWidth * 0.85, surfaceY - 40),
      k.vec2(islandWidth, surfaceY),
      k.vec2(islandWidth, surfaceY + 15),
      k.vec2(0, surfaceY + 15),
    ]),
    k.pos(islandStartX - 40, 0),
    k.color(28, 38, 52),
    k.opacity(0.85),
    k.z(-6),
  ]);

  // B. Promontório Rochoso Principal da Ilha do Farol
  const cliffObj = k.add([
    k.polygon([
      k.vec2(0, surfaceY),
      k.vec2(220, surfaceY - 38),
      k.vec2(lighthouseX - islandStartX - 90, islandPeakY + 16),
      k.vec2(lighthouseX - islandStartX, islandPeakY),
      k.vec2(lighthouseX - islandStartX + 85, islandPeakY + 18),
      k.vec2(islandWidth - 190, surfaceY - 32),
      k.vec2(islandWidth, surfaceY),
      k.vec2(islandWidth, surfaceY + 12),
      k.vec2(0, surfaceY + 12),
    ]),
    k.pos(islandStartX, 0),
    k.color(44, 56, 72),
    k.outline(3, k.rgb(30, 38, 50)),
    k.z(-5),
    "island_cliff_visual",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]);

  // Cobertura de vegetação de restinga e matas costeiras no topo da ilha
  k.add([
    k.polygon([
      k.vec2(210, surfaceY - 40),
      k.vec2(lighthouseX - islandStartX - 90, islandPeakY + 14),
      k.vec2(lighthouseX - islandStartX, islandPeakY - 2),
      k.vec2(lighthouseX - islandStartX + 85, islandPeakY + 16),
      k.vec2(islandWidth - 195, surfaceY - 34),
      k.vec2(islandWidth - 185, surfaceY - 28),
      k.vec2(lighthouseX - islandStartX, islandPeakY + 6),
      k.vec2(200, surfaceY - 34),
    ]),
    k.pos(islandStartX, 0),
    k.color(36, 90, 58),
    k.z(-4),
  ]);

  // Tufos de vegetação de restinga procedural ao longo da encosta da ilha
  const bushDefs = [
    { rx: 150, ry: surfaceY - 34, r: 8 },
    { rx: 280, ry: surfaceY - 46, r: 9 },
    { rx: 420, ry: surfaceY - 58, r: 7 },
    { rx: lighthouseX - islandStartX - 165, ry: islandPeakY + 30, r: 8 },
    { rx: lighthouseX - islandStartX - 82, ry: islandPeakY + 14, r: 6 },
    { rx: lighthouseX - islandStartX + 68, ry: islandPeakY + 18, r: 7 },
    { rx: lighthouseX - islandStartX + 148, ry: islandPeakY + 28, r: 8 },
    { rx: 855, ry: surfaceY - 48, r: 9 },
    { rx: 962, ry: surfaceY - 38, r: 7 },
    { rx: 1058, ry: surfaceY - 28, r: 8 },
  ];
  const bushCols: [number, number, number][] = [
    [40, 100, 55],
    [55, 130, 65],
    [35, 85, 45],
  ];
  for (let b = 0; b < bushDefs.length; b++) {
    const bd = bushDefs[b];
    const c0 = bushCols[b % 3];
    const c1 = bushCols[(b + 1) % 3];
    const c2 = bushCols[(b + 2) % 3];
    k.add([
      k.circle(bd.r),
      k.pos(islandStartX + bd.rx, bd.ry),
      k.color(c0[0], c0[1], c0[2]),
      k.anchor("center"),
      k.z(-4),
      "island_bush",
    ]);
    k.add([
      k.circle(bd.r - 2),
      k.pos(islandStartX + bd.rx - 9, bd.ry + 3),
      k.color(c1[0], c1[1], c1[2]),
      k.anchor("center"),
      k.z(-4),
      "island_bush",
    ]);
    k.add([
      k.circle(Math.max(2, bd.r - 3)),
      k.pos(islandStartX + bd.rx + 8, bd.ry + 2),
      k.color(c2[0], c2[1], c2[2]),
      k.anchor("center"),
      k.z(-4),
      "island_bush",
    ]);
  }

  // C. Colisor Físico Sólido da Ilha
  k.add([
    k.rect(islandWidth - 90, surfaceY - islandPeakY + 15),
    k.pos(islandStartX + 45, islandPeakY),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    k.z(10),
    TAGS.OBSTACLE,
    "island_cliff",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]);

  // D. Farol Histórico de Arraial
  const lighthouseBaseY = islandPeakY;

  // Base de alvenaria
  k.add([
    k.rect(36, 14, { radius: 2 }),
    k.pos(lighthouseX, lighthouseBaseY),
    k.color(58, 66, 78),
    k.anchor("bot"),
    k.z(-4),
  ]);

  // Torre branca principal
  k.add([
    k.rect(26, 68, { radius: 3 }),
    k.pos(lighthouseX, lighthouseBaseY - 14),
    k.color(245, 245, 250),
    k.anchor("bot"),
    k.z(-4),
  ]);

  // Listras vermelhas alternadas na torre (3 faixas)
  for (let s = 0; s < 3; s++) {
    k.add([
      k.rect(26, 5),
      k.pos(lighthouseX, lighthouseBaseY - 22 - s * 18),
      k.color(210, 45, 45),
      k.anchor("bot"),
      k.z(-3),
    ]);
  }

  // Varandim / galeria circular
  k.add([
    k.rect(34, 5, { radius: 1 }),
    k.pos(lighthouseX, lighthouseBaseY - 80),
    k.color(190, 195, 210),
    k.outline(1, k.rgb(140, 145, 160)),
    k.anchor("bot"),
    k.z(-3),
  ]);

  // Cúpula / Lanterna
  k.add([
    k.rect(22, 16, { radius: 4 }),
    k.pos(lighthouseX, lighthouseBaseY - 82),
    k.color(40, 45, 55),
    k.anchor("bot"),
    k.z(-3),
  ]);

  // Para-raios no topo
  k.add([
    k.rect(2, 12),
    k.pos(lighthouseX, lighthouseBaseY - 100),
    k.color(80, 88, 96),
    k.anchor("bot"),
    k.z(-3),
  ]);

  // Lâmpada brilhante da lanterna
  const lanternGlow = k.add([
    k.circle(7),
    k.pos(lighthouseX, lighthouseBaseY - 90),
    k.color(255, 240, 140),
    k.opacity(0.9),
    k.anchor("center"),
    k.z(-3),
  ]);

  // Feixe cônico de luz do Farol
  const lighthouseBeam = k.add([
    k.polygon([k.vec2(0, 0), k.vec2(-400, -70), k.vec2(-460, 50)]),
    k.pos(lighthouseX, lighthouseBaseY - 90),
    k.color(255, 245, 180),
    k.opacity(0.22),
    k.rotate(0),
    k.z(-3),
    "lighthouse_beam",
  ]);

  // E. Reflexo difuso do farol na superfície da água
  const reflectionSegments: GameObj[] = [];
  for (let r = 0; r < 4; r++) {
    reflectionSegments.push(
      k.add([
        k.rect(Math.max(1, 6 - r), Math.max(1, 9 - r * 2)),
        k.pos(lighthouseX, surfaceY + 12 + r * 14),
        k.color(255, 245, 180),
        k.opacity(0.1 - r * 0.02),
        k.anchor("center"),
        k.z(-2),
        "lighthouse_reflection",
      ])
    );
  }

  // F. Espuma costeira animada na base da ilha
  const foamParticles: CanyonFoamParticle[] = [];
  for (let f = 0; f < 8; f++) {
    const foamBaseX = islandStartX + 60 + Math.round((f * (islandEndX - islandStartX - 120)) / 7);
    foamParticles.push({
      obj: k.add([
        k.rect(10, 2, { radius: 1 }),
        k.pos(foamBaseX, surfaceY + 2),
        k.color(240, 250, 255),
        k.opacity(0.3),
        k.z(-2),
        "island_foam",
      ]),
      baseX: foamBaseX,
      speed: 14 + (f % 3) * 5,
      phase: f * 0.85,
    });
  }

  // G. Veios de estratificação rochosa no promontório
  for (const sd of [
    { yOff: -18, lenFrac: 0.55, op: 0.13 },
    { yOff: -36, lenFrac: 0.44, op: 0.1 },
    { yOff: -52, lenFrac: 0.3, op: 0.08 },
  ]) {
    k.add([
      k.rect(Math.round(islandWidth * sd.lenFrac), 2),
      k.pos(islandStartX + 80, surfaceY + sd.yOff),
      k.color(68, 86, 108),
      k.opacity(sd.op),
      k.z(-4),
      "island_strata",
    ]);
  }

  return {
    plateauObj,
    rampUpShape,
    rampDownShape,
    cliffObj,
    lighthouseBeam,
    lanternGlow,
    reflectionSegments,
    foamParticles,
    setRevealTimer,
    getRevealTimer,
  };
}
