import { GAME_CONFIG, TAGS } from "../../config";
import type {
  CanyonConfig,
  CanyonGeometryResult,
  CanyonFoamParticle,
  CanyonEngineContext,
  CanyonVector2D,
  CanyonGameObject,
  CanyonOutlinedGameObject,
} from "./canyonTypes";
import { getSpatialCullingManager, type CullableTargetObject } from "../spatialCullingSystem";
import { getSpatialGrid } from "../spatialHashGrid";

export function setupCanyonGeometry<
  TColor = unknown,
  TVec extends { x: number; y: number } = CanyonVector2D,
>(k: CanyonEngineContext<TColor, TVec>, config: CanyonConfig): CanyonGeometryResult<TColor> {
  const {
    surfaceY,
    deepFloorY,
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

  const cullingManager = getSpatialCullingManager();
  const spatialGrid = getSpatialGrid();

  // A. Rampa de Subida Orgânica (25.400m a 25.800m)
  const rampUpWidth = rampUpEndX - boqueiraoStartX;
  const crestY = 190;
  const rampUpShape = k.add([
    k.polygon([
      k.vec2(0, 1200),
      k.vec2(0, deepFloorY),
      k.vec2(rampUpWidth * 0.25, deepFloorY - (deepFloorY - crestY) * 0.2),
      k.vec2(rampUpWidth * 0.55, deepFloorY - (deepFloorY - crestY) * 0.5),
      k.vec2(rampUpWidth * 0.8, deepFloorY - (deepFloorY - crestY) * 0.8),
      k.vec2(rampUpWidth, crestY),
      k.vec2(rampUpWidth, 1200),
    ]),
    k.pos(boqueiraoStartX, 0),
    k.color(127, 140, 141), // 0x7F8C8D (gnaisse)
    k.outline(2, k.rgb(60, 80, 100)),
    k.z(2),
    TAGS.OBSTACLE,
    "boqueirao_rock",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]) as CanyonOutlinedGameObject<TColor>;
  cullingManager?.registerEntity(
    rampUpShape as unknown as CullableTargetObject,
    () => boqueiraoStartX + rampUpWidth / 2
  );

  // Colisores Físicos Sólidos da Rampa de Subida (estendidos até o limite abissal)
  const upSegments = 4;
  const upSegW = rampUpWidth / upSegments;
  for (let i = 0; i < upSegments; i++) {
    const segX = boqueiraoStartX + i * upSegW;
    const t = (i + 0.5) / upSegments;
    const segTopY = deepFloorY - t * (deepFloorY - crestY);
    k.add([
      k.rect(upSegW + 4, deepFloorY + 140 - segTopY + 800),
      k.pos(segX, segTopY),
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
      k.vec2(rampUpWidth * 0.25, deepFloorY - (deepFloorY - crestY) * 0.2),
      k.vec2(rampUpWidth * 0.55, deepFloorY - (deepFloorY - crestY) * 0.5),
      k.vec2(rampUpWidth * 0.8, deepFloorY - (deepFloorY - crestY) * 0.8),
      k.vec2(rampUpWidth, crestY),
      k.vec2(rampUpWidth, crestY + 8),
      k.vec2(rampUpWidth * 0.8, deepFloorY - (deepFloorY - crestY) * 0.8 + 8),
      k.vec2(rampUpWidth * 0.55, deepFloorY - (deepFloorY - crestY) * 0.5 + 8),
      k.vec2(rampUpWidth * 0.25, deepFloorY - (deepFloorY - crestY) * 0.2 + 8),
      k.vec2(0, deepFloorY + 8),
    ]),
    k.pos(boqueiraoStartX, 0),
    k.color(28, 105, 80),
    k.z(3),
  ]);

  // B. Estreito Submarino em V do Boqueirão (25.800m a 26.900m)
  // Substitui o platô plano trapezoidal por um desfiladeiro submarino fiel à geologia real
  // com rocha gnaisse (0x7F8C8D), diques vulcânicos de diabásio (0x2C3E50 e 0x1A252F) e pontilhamento 4x4px.
  const plateauWidth = plateauEndX - rampUpEndX;
  const canyonMidX = rampUpEndX + plateauWidth / 2;

  const rightWallOffsetX = plateauWidth - 640;
  const valleyStartX = rampUpEndX + 200;
  const valleyEndX = rampUpEndX + rightWallOffsetX + 440;
  const valleyWidth = Math.max(10, valleyEndX - valleyStartX);

  // Parede Esquerda
  const leftWallShape = k.add([
    k.polygon([k.vec2(0, 1200), k.vec2(0, 190), k.vec2(150, 340), k.vec2(200, 1200)]),
    k.pos(rampUpEndX, 0),
    k.color(127, 140, 141),
    k.z(2),
    TAGS.OBSTACLE,
    "boqueirao_rock",
    "canyon_left_wall",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]) as CanyonOutlinedGameObject<TColor>;
  cullingManager?.registerEntity(
    leftWallShape as unknown as CullableTargetObject,
    () => rampUpEndX + 100
  );
  spatialGrid?.insert(
    "boqueirao_canyon_left_wall",
    leftWallShape,
    { minX: rampUpEndX, minY: 190, maxX: rampUpEndX + 200, maxY: 1200 },
    true
  );

  // Parede Direita
  const rightWallShape = k.add([
    k.polygon([k.vec2(440, 1200), k.vec2(490, 340), k.vec2(640, 190), k.vec2(640, 1200)]),
    k.pos(rampUpEndX + rightWallOffsetX, 0),
    k.color(127, 140, 141),
    k.z(2),
    TAGS.OBSTACLE,
    "boqueirao_rock",
    "canyon_right_wall",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]) as CanyonOutlinedGameObject<TColor>;
  cullingManager?.registerEntity(
    rightWallShape as unknown as CullableTargetObject,
    () => rampUpEndX + rightWallOffsetX + 540
  );
  spatialGrid?.insert(
    "boqueirao_canyon_right_wall",
    rightWallShape,
    {
      minX: rampUpEndX + rightWallOffsetX + 440,
      minY: 190,
      maxX: rampUpEndX + rightWallOffsetX + 640,
      maxY: 1200,
    },
    true
  );

  // Fundo do Vale
  const plateauObj = k.add([
    k.polygon([
      k.vec2(-50, 340),
      k.vec2(valleyWidth + 50, 340),
      k.vec2(valleyWidth + 50, 1200),
      k.vec2(-50, 1200),
    ]),
    k.pos(valleyStartX, 0),
    k.color(127, 140, 141),
    k.z(2),
    TAGS.OBSTACLE,
    "boqueirao_rock",
    "canyon_valley_floor",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]) as CanyonOutlinedGameObject<TColor>;
  cullingManager?.registerEntity(plateauObj as unknown as CullableTargetObject, () => canyonMidX);
  spatialGrid?.insert(
    "boqueirao_canyon_valley_floor",
    plateauObj,
    { minX: valleyStartX - 50, minY: 340, maxX: valleyStartX + valleyWidth + 50, maxY: 1200 },
    true
  );

  // 4. Diques de Diabásio Vulcânico (0x2C3E50 e 0x1A252F) cortando o gnaisse dentro das novas paredes
  // Dique 1 (Parede Esquerda - diagonal ascendente na rocha)
  k.add([
    k.polygon([k.vec2(30, 205), k.vec2(55, 230), k.vec2(120, 335), k.vec2(95, 345)]),
    k.pos(rampUpEndX, 0),
    k.color(44, 62, 80), // 0x2C3E50
    k.z(3),
    "boqueirao_diabase_dike",
  ]);

  // Dique 2 (Parede Esquerda - faixa profunda perto do fundo)
  k.add([
    k.polygon([k.vec2(30, 240), k.vec2(55, 240), k.vec2(150, 340), k.vec2(130, 340)]),
    k.pos(rampUpEndX, 0),
    k.color(26, 37, 47), // 0x1A252F
    k.z(3),
    "boqueirao_diabase_dike",
  ]);

  // Dique 3 (Parede Direita - diagonal ascendente na rocha)
  k.add([
    k.polygon([k.vec2(610, 205), k.vec2(585, 230), k.vec2(520, 335), k.vec2(545, 340)]),
    k.pos(rampUpEndX + rightWallOffsetX, 0),
    k.color(44, 62, 80), // 0x2C3E50
    k.z(3),
    "boqueirao_diabase_dike",
  ]);

  // Dique 4 (Parede Direita - faixa profunda perto do fundo)
  k.add([
    k.polygon([k.vec2(610, 240), k.vec2(585, 240), k.vec2(490, 340), k.vec2(510, 340)]),
    k.pos(rampUpEndX + rightWallOffsetX, 0),
    k.color(26, 37, 47), // 0x1A252F
    k.z(3),
    "boqueirao_diabase_dike",
  ]);

  // Dique 5 (Fundo do Estreito - veio transversal no vale)
  k.add([
    k.polygon([
      k.vec2(valleyWidth * 0.42, 340),
      k.vec2(valleyWidth * 0.42 + 25, 340),
      k.vec2(valleyWidth * 0.42 + 20, 380),
      k.vec2(valleyWidth * 0.42 - 5, 380),
    ]),
    k.pos(valleyStartX, 0),
    k.color(26, 37, 47), // 0x1A252F
    k.z(3),
    "boqueirao_diabase_dike",
  ]);

  // 5. Bordas texturizadas com pontilhamento 4x4px nas beiradas inclinadas para quebrar a linha reta do polígono
  const leftEdgeSteps = [
    { x: 35, y: 200 },
    { x: 60, y: 230 },
    { x: 85, y: 260 },
    { x: 110, y: 285 },
    { x: 130, y: 310 },
    { x: 140, y: 325 },
    { x: 146, y: 334 },
  ];
  for (const step of leftEdgeSteps) {
    k.add([
      k.rect(4, 4),
      k.pos(rampUpEndX + step.x, step.y),
      k.color(44, 62, 80),
      k.z(3),
      "boqueirao_dither",
    ]);
    k.add([
      k.rect(4, 4),
      k.pos(rampUpEndX + step.x - 4, step.y + 4),
      k.color(26, 37, 47),
      k.z(3),
      "boqueirao_dither",
    ]);
  }

  const rightEdgeSteps = [
    { x: 605, y: 200 },
    { x: 580, y: 230 },
    { x: 555, y: 260 },
    { x: 530, y: 285 },
    { x: 510, y: 310 },
    { x: 500, y: 325 },
    { x: 494, y: 334 },
  ];
  for (const step of rightEdgeSteps) {
    k.add([
      k.rect(4, 4),
      k.pos(rampUpEndX + rightWallOffsetX + step.x, step.y),
      k.color(44, 62, 80),
      k.z(3),
      "boqueirao_dither",
    ]);
    k.add([
      k.rect(4, 4),
      k.pos(rampUpEndX + rightWallOffsetX + step.x + 4, step.y + 4),
      k.color(26, 37, 47),
      k.z(3),
      "boqueirao_dither",
    ]);
  }

  // 6. Colisores Físicos Sólidos nas Paredes e Vale do Estreito (estendidos até o limite abissal)
  // Parede Esquerda (degraus subindo de 340 até 190, ancorados no maciço profundo)
  const leftSegments = 5;
  for (let i = 0; i < leftSegments; i++) {
    const t = i / leftSegments;
    const sx = rampUpEndX + t * 150;
    const sy = 190 + t * 150; // de 190 até 340
    const segH = 360 - sy + 800;
    k.add([
      k.rect(35, segH),
      k.pos(sx, sy),
      k.opacity(0),
      k.z(3),
      TAGS.OBSTACLE,
      "boqueirao_wall_collider",
    ]);
  }

  // Parede Direita (degraus simétricos descendo de 190 até 340, ancorados no maciço profundo)
  const rightSegments = 5;
  for (let i = 0; i < rightSegments; i++) {
    const t = i / rightSegments;
    const sx = rampUpEndX + rightWallOffsetX + 640 - (1 - t) * 150;
    const sy = 340 - t * 150; // de 340 até 190
    const segH = 360 - sy + 800;
    k.add([
      k.rect(35, segH),
      k.pos(sx - 35, sy),
      k.opacity(0),
      k.z(3),
      TAGS.OBSTACLE,
      "boqueirao_wall_collider",
    ]);
  }

  // Colisor do Vale Central (Fundo do Estreito maciço selado hermeticamente)
  k.add([
    k.rect(valleyWidth + 100, 800),
    k.pos(valleyStartX - 50, 340),
    k.opacity(0),
    k.z(3),
    TAGS.OBSTACLE,
    "boqueirao_valley_collider",
  ]);

  // C. Rampa de Descida Orgânica (26.900m a 27.300m)
  const rampDownWidth = boqueiraoEndX - plateauEndX;
  const rampDownShape = k.add([
    k.polygon([
      k.vec2(0, crestY),
      k.vec2(rampDownWidth * 0.2, deepFloorY - (deepFloorY - crestY) * 0.8),
      k.vec2(rampDownWidth * 0.45, deepFloorY - (deepFloorY - crestY) * 0.5),
      k.vec2(rampDownWidth * 0.75, deepFloorY - (deepFloorY - crestY) * 0.2),
      k.vec2(rampDownWidth, deepFloorY),
      k.vec2(rampDownWidth, 1200),
      k.vec2(0, 1200),
    ]),
    k.pos(plateauEndX, 0),
    k.color(127, 140, 141), // 0x7F8C8D (gnaisse)
    k.outline(2, k.rgb(60, 80, 100)),
    k.z(2),
    TAGS.OBSTACLE,
    "boqueirao_rock",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]) as CanyonOutlinedGameObject<TColor>;
  cullingManager?.registerEntity(
    rampDownShape as unknown as CullableTargetObject,
    () => plateauEndX + rampDownWidth / 2
  );

  // Colisores Físicos Sólidos da Rampa de Descida (estendidos até o limite abissal)
  const downSegments = 4;
  const downSegW = rampDownWidth / downSegments;
  for (let i = 0; i < downSegments; i++) {
    const segX = plateauEndX + i * downSegW;
    const t = (i + 0.5) / downSegments;
    const segTopY = crestY + t * (deepFloorY - crestY);
    k.add([
      k.rect(downSegW + 4, deepFloorY + 140 - segTopY + 800),
      k.pos(segX, segTopY),
      k.opacity(0),
      k.z(3),
      TAGS.OBSTACLE,
      "boqueirao_rock_collider",
    ]);
  }

  // Cobertura de musgo na rampa de descida
  k.add([
    k.polygon([
      k.vec2(0, crestY),
      k.vec2(rampDownWidth * 0.2, deepFloorY - (deepFloorY - crestY) * 0.8),
      k.vec2(rampDownWidth * 0.45, deepFloorY - (deepFloorY - crestY) * 0.5),
      k.vec2(rampDownWidth * 0.75, deepFloorY - (deepFloorY - crestY) * 0.2),
      k.vec2(rampDownWidth, deepFloorY),
      k.vec2(rampDownWidth, deepFloorY + 8),
      k.vec2(rampDownWidth * 0.75, deepFloorY - (deepFloorY - crestY) * 0.2 + 8),
      k.vec2(rampDownWidth * 0.45, deepFloorY - (deepFloorY - crestY) * 0.5 + 8),
      k.vec2(rampDownWidth * 0.2, deepFloorY - (deepFloorY - crestY) * 0.8 + 8),
      k.vec2(0, crestY + 8),
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
    TAGS.OBSTACLE,
    "island_cliff_visual",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]) as CanyonOutlinedGameObject<TColor>;
  cullingManager?.registerEntity(
    cliffObj as unknown as CullableTargetObject,
    () => islandStartX + islandWidth / 2
  );

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
  ]) as CanyonGameObject<TColor>;

  // Feixe cônico de luz do Farol
  const lighthouseBeam = k.add([
    k.polygon([k.vec2(0, 0), k.vec2(-400, -70), k.vec2(-460, 50)]),
    k.pos(lighthouseX, lighthouseBaseY - 90),
    k.color(255, 245, 180),
    k.opacity(0.22),
    k.rotate(0),
    k.z(-3),
    "lighthouse_beam",
  ]) as CanyonGameObject<TColor>;

  // E. Reflexo difuso do farol na superfície da água
  const reflectionSegments: CanyonGameObject<TColor>[] = [];
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
      ]) as CanyonGameObject<TColor>
    );
  }

  // F. Espuma costeira animada na base da ilha
  const foamParticles: CanyonFoamParticle<TColor>[] = [];
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
      ]) as CanyonGameObject<TColor>,
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
    leftWallShape,
    rightWallShape,
    lighthouseBeam,
    lanternGlow,
    reflectionSegments,
    foamParticles,
    setRevealTimer,
    getRevealTimer,
  };
}
