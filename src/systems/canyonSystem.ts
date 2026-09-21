import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";

/**
 * Sistema da Ilha do Farol e Boqueirão (Arraial do Cabo - 25.400m a 27.300m).
 * - Fundo rochoso submarino do Boqueirão com relevo geológico orgânico e contínuo (sem degraus retos),
 *   que se eleva gradualmente das profundezas até próximo à superfície, obrigando o nado raso.
 * - Falésias e montanha da Ilha do Farol acima do nível do mar com camadas de profundidade e colisão sólida.
 * - Farol Histórico de Arraial no topo com feixe de luz rotativo.
 * - Detecção, reverberação e eco por Biosonar em toda a formação rochosa.
 */
export function setupCanyonSystem(k: KaboomCtx) {
  const surfaceY = GAME_CONFIG.SEA_LEVEL; // 80px (nível do mar)
  const deepFloorY = k.height() - 40;     // Leito oceânico profundo padrão (~320px em 360p)

  // Altura do topo da laje rochosa rasa do Boqueirão:
  // Deixa uma lâmina d'água livre de cerca de 85px entre o nível do mar (80) e a rocha (165)
  const shallowRockTopY = Math.round(surfaceY + (k.height() - surfaceY) * 0.30);
  const seabedThickness = deepFloorY + 140 - shallowRockTopY;

  // Extensão horizontal da passagem
  const boqueiraoStartX = 25400;
  const rampUpEndX = 25800;
  const plateauEndX = 26900;
  const boqueiraoEndX = 27300;

  const lighthouseX = 26350; // Ponto mais alto da ilha onde fica o farol

  let revealTimer = 0;

  // =========================================================================
  // 1. FUNDO ROCHOSO DO BOQUEIRÃO (SUBMERSO - FORMAÇÃO ORGÂNICA CONTÍNUA)
  // =========================================================================

  // A. Rampa de Subida Orgânica (25.400m a 25.800m)
  // Relevo contínuo inclinado de rocha basal com encosta suave
  const rampUpWidth = rampUpEndX - boqueiraoStartX;
  const rampUpShape = k.add([
    k.polygon([
      k.vec2(0, deepFloorY + 140),
      k.vec2(0, deepFloorY),
      k.vec2(rampUpWidth * 0.20, deepFloorY - (deepFloorY - shallowRockTopY) * 0.22),
      k.vec2(rampUpWidth * 0.45, deepFloorY - (deepFloorY - shallowRockTopY) * 0.50),
      k.vec2(rampUpWidth * 0.72, deepFloorY - (deepFloorY - shallowRockTopY) * 0.78),
      k.vec2(rampUpWidth * 0.90, shallowRockTopY + 8),
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

  // Colisores Físicos Sólidos da Rampa de Subida (garante colisão sólida estável no Kaboom)
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
      "boqueirao_rock",
    ]);
  }

  // Cobertura vegetal de musgo e algas calcárias na rampa de subida
  k.add([
    k.polygon([
      k.vec2(0, deepFloorY),
      k.vec2(rampUpWidth * 0.20, deepFloorY - (deepFloorY - shallowRockTopY) * 0.22),
      k.vec2(rampUpWidth * 0.45, deepFloorY - (deepFloorY - shallowRockTopY) * 0.50),
      k.vec2(rampUpWidth * 0.72, deepFloorY - (deepFloorY - shallowRockTopY) * 0.78),
      k.vec2(rampUpWidth, shallowRockTopY),
      k.vec2(rampUpWidth, shallowRockTopY + 8),
      k.vec2(rampUpWidth * 0.72, deepFloorY - (deepFloorY - shallowRockTopY) * 0.78 + 8),
      k.vec2(rampUpWidth * 0.45, deepFloorY - (deepFloorY - shallowRockTopY) * 0.50 + 8),
      k.vec2(rampUpWidth * 0.20, deepFloorY - (deepFloorY - shallowRockTopY) * 0.22 + 8),
      k.vec2(0, deepFloorY + 8),
    ]),
    k.pos(boqueiraoStartX, 0),
    k.color(28, 105, 80),
    k.z(3),
  ]);

  // B. Platô Rochoso Central do Boqueirão (25.800m a 26.900m)
  // Laje submarina que força a jubarte a nadar na lâmina superficial d'água
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

  // Camada verdejante de algas e musgo marinho no topo da laje
  k.add([
    k.rect(plateauWidth, 10, { radius: 2 }),
    k.pos(rampUpEndX, shallowRockTopY),
    k.color(26, 100, 76),
    k.z(3),
  ]);

  // Ondulações e cristas rochosas naturais no leito do platô
  const cragCount = 9;
  for (let c = 0; c < cragCount; c++) {
    const cragX = rampUpEndX + 60 + c * 115;
    const cragW = 35 + (c % 3) * 12;
    const cragH = 6 + (c % 4) * 2;
    k.add([
      k.rect(cragW, cragH, { radius: 3 }),
      k.pos(cragX, shallowRockTopY - cragH + 2),
      k.color(44, 58, 74),
      k.outline(1.5, k.rgb(65, 85, 105)),
      k.z(3),
    ]);
  }

  // Fendas e veios minerais decorativos no platô rochoso
  const crackCount = 14;
  for (let c = 0; c < crackCount; c++) {
    const crackX = rampUpEndX + 35 + c * 75;
    const crackY = shallowRockTopY + 16 + (c % 4) * 18;
    k.add([
      k.rect(30 + (c % 4) * 15, 2.5, { radius: 1 }),
      k.pos(crackX, crackY),
      k.color(52, 70, 90),
      k.opacity(0.85),
      k.z(3),
    ]);
  }

  // C. Rampa de Descida Orgânica (26.900m a 27.300m)
  // Relevo contínuo inclinado descendo suavemente para o Santuário
  const rampDownWidth = boqueiraoEndX - plateauEndX;
  const rampDownShape = k.add([
    k.polygon([
      k.vec2(0, shallowRockTopY),
      k.vec2(rampDownWidth * 0.15, shallowRockTopY + 6),
      k.vec2(rampDownWidth * 0.35, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.30),
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
      "boqueirao_rock",
    ]);
  }

  // Cobertura de musgo na rampa de descida
  k.add([
    k.polygon([
      k.vec2(0, shallowRockTopY),
      k.vec2(rampDownWidth * 0.35, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.30),
      k.vec2(rampDownWidth * 0.62, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.65),
      k.vec2(rampDownWidth, deepFloorY),
      k.vec2(rampDownWidth, deepFloorY + 8),
      k.vec2(rampDownWidth * 0.62, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.65 + 8),
      k.vec2(rampDownWidth * 0.35, shallowRockTopY + (deepFloorY - shallowRockTopY) * 0.30 + 8),
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
  const islandPeakY = surfaceY - 82; // Ponto alto da montanha no céu (~0px)

  // A. Silhueta de Fundo da Cordilheira da Ilha (Bruma Atmosférica em Paralaxe)
  k.add([
    k.polygon([
      k.vec2(0, surfaceY),
      k.vec2(180, surfaceY - 45),
      k.vec2(islandWidth * 0.45, islandPeakY - 12),
      k.vec2(islandWidth * 0.60, islandPeakY - 8),
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

  // B. Promontório Rochoso Principal da Ilha do Farol (Falésias Costeiras)
  const cliffObj = k.add([
    k.polygon([
      k.vec2(0, surfaceY),                                      // Entrada no nível da água
      k.vec2(220, surfaceY - 38),                               // Encosta ocidental
      k.vec2(lighthouseX - islandStartX - 90, islandPeakY + 16),// Ombro do farol
      k.vec2(lighthouseX - islandStartX, islandPeakY),          // Cume do farol
      k.vec2(lighthouseX - islandStartX + 85, islandPeakY + 18),// Encosta oriental
      k.vec2(islandWidth - 190, surfaceY - 32),                 // Desfiladeiro
      k.vec2(islandWidth, surfaceY),                            // Saída no nível da água
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

  // C. Colisor Físico Sólido da Ilha (Impede a baleia de saltar/atravessar a montanha)
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

  // D. O Farol Histórico de Arraial no Cume da Ilha
  const lighthouseBaseY = islandPeakY;

  // Base de alvenaria do Farol
  k.add([
    k.rect(34, 12, { radius: 2 }),
    k.pos(lighthouseX, lighthouseBaseY),
    k.color(58, 66, 78),
    k.anchor("bot"),
    k.z(-4),
  ]);

  // Torre clássica do Farol (Branca com anel vermelho)
  k.add([
    k.rect(26, 68, { radius: 3 }),
    k.pos(lighthouseX, lighthouseBaseY - 12),
    k.color(245, 245, 250),
    k.anchor("bot"),
    k.z(-4),
  ]);

  k.add([
    k.rect(26, 18),
    k.pos(lighthouseX, lighthouseBaseY - 38),
    k.color(210, 45, 45),
    k.anchor("bot"),
    k.z(-3),
  ]);

  // Cúpula / Lanterna do Farol
  k.add([
    k.rect(20, 15, { radius: 4 }),
    k.pos(lighthouseX, lighthouseBaseY - 80),
    k.color(40, 45, 55),
    k.anchor("bot"),
    k.z(-4),
  ]);

  // Lâmpada brilhante da lanterna
  const lanternGlow = k.add([
    k.circle(7),
    k.pos(lighthouseX, lighthouseBaseY - 88),
    k.color(255, 240, 140),
    k.opacity(0.9),
    k.anchor("center"),
    k.z(-3),
  ]);

  // Feixe cônico de luz do Farol (varredura angular realista)
  const lighthouseBeam = k.add([
    k.polygon([
      k.vec2(0, 0),
      k.vec2(-400, -70),
      k.vec2(-460, 50),
    ]),
    k.pos(lighthouseX, lighthouseBaseY - 88),
    k.color(255, 245, 180),
    k.opacity(0.22),
    k.rotate(0),
    k.z(-3),
    "lighthouse_beam",
  ]);

  // =========================================================================
  // 3. ATUALIZAÇÃO CONTÍNUA & FEEDBACK DE BIOSONAR
  // =========================================================================
  let time = 0;
  k.onUpdate(() => {
    const dt = k.dt();
    time += dt;

    // Rotação dinâmica do feixe do Farol
    const beamPhase = Math.sin(time * 1.8);
    const beamBrightness = Math.max(0.04, Math.abs(beamPhase) * 0.28);
    lighthouseBeam.opacity = beamBrightness;
    lanternGlow.opacity = 0.5 + Math.abs(beamPhase) * 0.5;
    lighthouseBeam.angle = Math.sin(time * 1.2) * 16;

    // Biosonar: iluminação dos contornos da rocha
    if (revealTimer > 0) {
      revealTimer -= dt;
      const pulseCol = k.rgb(0, 230, 255);
      plateauObj.outline.color = pulseCol;
      plateauObj.outline.width = 3;
      rampUpShape.outline.color = pulseCol;
      rampUpShape.outline.width = 3;
      rampDownShape.outline.color = pulseCol;
      rampDownShape.outline.width = 3;
      cliffObj.outline.color = pulseCol;
      cliffObj.outline.width = 3;
    } else {
      const defaultCol = k.rgb(60, 80, 100);
      plateauObj.outline.color = defaultCol;
      plateauObj.outline.width = 2;
      rampUpShape.outline.color = defaultCol;
      rampUpShape.outline.width = 1.5;
      rampDownShape.outline.color = defaultCol;
      rampDownShape.outline.width = 1.5;
      cliffObj.outline.color = k.rgb(30, 38, 50);
      cliffObj.outline.width = 2;
    }
  });
}
