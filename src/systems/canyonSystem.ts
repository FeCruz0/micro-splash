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

  // 1. Costões rochosos escarpados de granito com silhueta serrilhada orgânica
  const cragCount = 14;
  for (let c = 0; c < cragCount; c++) {
    const cragX = rampUpEndX + 20 + c * 78;
    const cragW = 46 + (c % 4) * 14;
    const cragH = 9 + (c % 5) * 3;
    const peakOffset = (c % 2 === 0 ? -cragH : -cragH * 0.7);
    k.add([
      k.polygon([
        k.vec2(0, cragH + 4),
        k.vec2(cragW * 0.25, cragH * 0.4),
        k.vec2(cragW * 0.55, 0),
        k.vec2(cragW * 0.85, cragH * 0.3),
        k.vec2(cragW, cragH + 4),
      ]),
      k.pos(cragX, shallowRockTopY + peakOffset + 3),
      k.color(46 + (c % 3) * 6, 60 + (c % 3) * 6, 78 + (c % 3) * 8),
      k.outline(1.5, k.rgb(75, 98, 122)),
      k.z(3),
      "boqueirao_crag",
      TAGS.OBSTACLE,
    ]);
  }

  // 2. Fendas submarinas profundas e fraturas geológicas tectônicas verticais/diagonais
  const fissurePositions = [
    { x: rampUpEndX + 80,  h: 55, w: 5,  tilt: -12 },
    { x: rampUpEndX + 210, h: 70, w: 6,  tilt: 8 },
    { x: rampUpEndX + 350, h: 48, w: 4,  tilt: -6 },
    { x: rampUpEndX + 490, h: 80, w: 7,  tilt: 14 },
    { x: rampUpEndX + 620, h: 62, w: 5,  tilt: -10 },
    { x: rampUpEndX + 740, h: 75, w: 6,  tilt: 7 },
    { x: rampUpEndX + 870, h: 50, w: 4,  tilt: -8 },
    { x: rampUpEndX + 1010,h: 65, w: 6,  tilt: 11 },
  ];

  for (const fp of fissurePositions) {
    // Fenda escura profunda
    k.add([
      k.rect(fp.w, fp.h, { radius: 1 }),
      k.pos(fp.x, shallowRockTopY + 8),
      k.color(14, 20, 28),
      k.rotate(fp.tilt),
      k.opacity(0.95),
      k.z(3),
      "boqueirao_fissure",
    ]);
    // Veio de quartzo / mineral na borda da fenda
    k.add([
      k.rect(1.5, fp.h * 0.85),
      k.pos(fp.x + fp.w, shallowRockTopY + 12),
      k.color(75, 95, 120),
      k.rotate(fp.tilt),
      k.opacity(0.7),
      k.z(3),
    ]);
  }

  // 3. Bioincrustações: Crostas de algas calcárias rosadas/aroxeadas (Lithothamnion)
  const crustCount = 16;
  for (let c = 0; c < crustCount; c++) {
    const crustX = rampUpEndX + 15 + c * 68;
    const crustW = 28 + (c % 4) * 10;
    const crustH = 3.5 + (c % 3) * 1.5;
    k.add([
      k.rect(crustW, crustH, { radius: 1.5 }),
      k.pos(crustX, shallowRockTopY - 1 + (c % 3) * 1.2),
      k.color(175 + (c % 3) * 10, 95 + (c % 4) * 8, 130 + (c % 2) * 15),
      k.opacity(0.88),
      k.z(3),
      "boqueirao_bioincrustation",
    ]);
  }

  // 4. Bioincrustações: Ouriços-pretos (Echinometra lucunter) em tocas e concavidades
  const urchinPockets = [
    { x: rampUpEndX + 150, y: shallowRockTopY + 6 },
    { x: rampUpEndX + 270, y: shallowRockTopY + 10 },
    { x: rampUpEndX + 430, y: shallowRockTopY + 5 },
    { x: rampUpEndX + 610, y: shallowRockTopY + 9 },
    { x: rampUpEndX + 790, y: shallowRockTopY + 6 },
    { x: rampUpEndX + 930, y: shallowRockTopY + 10 },
    { x: rampUpEndX + 1050, y: shallowRockTopY + 7 },
  ];

  for (const up of urchinPockets) {
    // Corpo esférico central
    k.add([
      k.circle(3),
      k.pos(up.x, up.y),
      k.color(18, 18, 22),
      k.z(4),
      "boqueirao_urchin",
    ]);
    // Espinhos radiais
    for (let s = 0; s < 6; s++) {
      const angle = (s / 6) * Math.PI * 2;
      k.add([
        k.rect(1.2, 4.5, { radius: 0.5 }),
        k.pos(up.x, up.y),
        k.color(24, 24, 30),
        k.rotate(angle * (180 / Math.PI)),
        k.anchor("bot"),
        k.z(4),
        "boqueirao_urchin",
      ]);
    }
  }

  // 5. Bioincrustações: Tufos de Anêmonas Vivas (oscilam suavemente com a ressurgência)
  const anemones: { obj: any; baseAngle: number; phase: number }[] = [];
  const anemonePositions = [
    { x: rampUpEndX + 110, y: shallowRockTopY - 4, col: [230, 110, 85] },
    { x: rampUpEndX + 320, y: shallowRockTopY - 6, col: [75, 195, 155] },
    { x: rampUpEndX + 540, y: shallowRockTopY - 5, col: [240, 130, 95] },
    { x: rampUpEndX + 760, y: shallowRockTopY - 3, col: [85, 205, 165] },
    { x: rampUpEndX + 970, y: shallowRockTopY - 6, col: [225, 105, 80] },
  ];

  for (let a = 0; a < anemonePositions.length; a++) {
    const ap = anemonePositions[a];
    k.add([
      k.circle(3.5),
      k.pos(ap.x, ap.y + 2),
      k.color(Math.round(ap.col[0] * 0.7), Math.round(ap.col[1] * 0.7), Math.round(ap.col[2] * 0.7)),
      k.z(4),
      "boqueirao_anemone",
    ]);
    for (let t = -2; t <= 2; t++) {
      const tentacle = k.add([
        k.rect(2, 6, { radius: 1 }),
        k.pos(ap.x + t * 2.5, ap.y - 1),
        k.color(ap.col[0], ap.col[1], ap.col[2]),
        k.rotate(t * 12),
        k.anchor("bot"),
        k.opacity(0.85),
        k.z(4),
        "boqueirao_anemone",
      ]);
      anemones.push({ obj: tentacle, baseAngle: t * 12, phase: a * 1.3 + t * 0.5 });
    }
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
    // Só atualiza rotação do feixe do Farol se estiver próximo de Arraial (x > 23500) ou durante reveal
    const camX = k.camPos().x;
    if (camX < 23500 && revealTimer <= 0) return;

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

    // Micro-oscilação suave dos tentáculos das anêmonas marinhas com o fluxo da ressurgência
    for (const an of anemones) {
      if (an.obj) {
        an.obj.angle = an.baseAngle + Math.sin(time * 2.4 + an.phase) * 8;
      }
    }
  });
}
