import kaboom, { type GameObj } from "kaboom";
import { calculateBiomeTransitionFactor } from "./biomeTransitionSystem";

interface KelpPlant {
  segments: GameObj[];
  baseX: number;
  baseY: number;
  height: number;
  swaySpeed: number;
  swayPhase: number;
}

interface CoralDetail {
  obj: GameObj;
  type: "brain" | "fan" | "anemone";
  baseY: number;
  animPhase: number;
  tentacles?: GameObj[];
}

/**
 * Calcula a cor progressiva do segmento de kelp (Fase 35.2).
 * Interpola da base marrom-escura (55, 35, 15) para o topo dourado-esverdeado (110, 130, 40).
 */
export function calculateKelpSegmentColor(
  k: ReturnType<typeof kaboom>,
  segmentIndex: number,
  totalSegments: number
) {
  const progressRatio = totalSegments > 1 ? segmentIndex / (totalSegments - 1) : 0;
  const redChannel = Math.round(55 + (110 - 55) * progressRatio);
  const greenChannel = Math.round(35 + (130 - 35) * progressRatio);
  const blueChannel = Math.round(15 + (40 - 15) * progressRatio);
  return k.rgb(redChannel, greenChannel, blueChannel);
}

export const KELP_SPAWN_X = [
  250, 420, 600, 780, 1100, 1350, 1600, 1950, 2200, 2550, 2850, 3100, 3450, 3800, 4200, 4550, 4850,
];

export const POLAR_RED_ALGAE_SPAWN_X = [
  150, 500, 950, 1450, 1800, 2350, 2750, 3250, 3650, 4050, 4400, 4750,
];

export const URBAN_SEAGRASS_SPAWN_X = [
  12200, 12600, 13100, 13700, 14200, 14800, 15300, 15900, 16500, 17100, 17600, 18200, 18700,
];

export const LITHOTHAMNION_SPAWN_X = [
  19400, 19900, 20700, 21500, 22300, 23100, 24000, 24900, 25800, 26600, 27400, 28300, 29200, 29800,
];

/**
 * Sistema do Fundo Marinho Bentônico: Florestas de Kelp (Antártica) e Jardins de Corais (Arraial do Cabo)
 * Enriquece o leito oceânico com ecossistemas autênticos e física suave de ondulação subaquática.
 */
export function setupBenthicFloorSystem(k: ReturnType<typeof kaboom>) {
  const floorY = k.height() - 40;

  // ===========================================================================
  // 1. FLORESTAS DE KELP GIGANTE NA ANTÁRTICA (0m a 5.000m)
  // ===========================================================================
  const kelpForest: KelpPlant[] = [];
  const kelpSpawnX = KELP_SPAWN_X;

  kelpSpawnX.forEach((xPos, plantIdx) => {
    const transitionFactor = calculateBiomeTransitionFactor(xPos, 0, 5000, 300);
    const plantHeight = (120 + (plantIdx % 4) * 35) * (0.65 + 0.35 * transitionFactor); // Altura calibrada com atenuação de transição
    const segmentCount = 6;
    const segHeight = plantHeight / segmentCount;
    const segments: GameObj[] = [];

    for (let s = 0; s < segmentCount; s++) {
      // Largura afunilando em direção ao topo
      const segWidth = 14 - s * 1.4;
      const segmentColor = calculateKelpSegmentColor(k, s, segmentCount);

      // Haste central
      const stem = k.add([
        k.rect(segWidth, segHeight + 4, { radius: 3 }),
        k.pos(xPos, floorY - (s + 1) * segHeight),
        k.color(segmentColor),
        k.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
        k.anchor("bot"),
        k.z(s % 2 === 0 ? -3 : 2), // Alterna camadas para profundidade 2.5D
        "kelp_segment",
      ]);

      // Lâmina foliar lateral ondulante
      const leafSide = s % 2 === 0 ? 1 : -1;
      const leafWidth = 18 + s * 2;
      const leafHeight = 8 + s * 1.2;
      const leaf = k.add([
        k.rect(leafWidth, leafHeight, { radius: leafHeight / 2 }),
        k.pos(xPos + leafSide * (segWidth + 4), floorY - (s + 0.5) * segHeight),
        k.color(segmentColor),
        k.opacity(0.75 * (0.4 + 0.6 * transitionFactor)),
        k.anchor("center"),
        k.rotate(leafSide * 25),
        k.z(-3),
        "kelp_leaf",
      ]);

      segments.push(stem);
      segments.push(leaf);
    }

    kelpForest.push({
      segments,
      baseX: xPos,
      baseY: floorY,
      height: plantHeight,
      swaySpeed: 1.2 + (plantIdx % 3) * 0.4,
      swayPhase: plantIdx * 0.8,
    });
  });

  // ===========================================================================
  // 1.5. ALGAS VERMELHAS POLARES RASTEIRAS NA ANTÁRTICA (0m a 5.000m)
  // ===========================================================================
  const polarAlgaePlants: {
    blades: GameObj[];
    baseX: number;
    swaySpeed: number;
    swayPhase: number;
  }[] = [];
  POLAR_RED_ALGAE_SPAWN_X.forEach((xPos, aIdx) => {
    const transitionFactor = calculateBiomeTransitionFactor(xPos, 0, 5000, 300);
    const blades: GameObj[] = [];
    const bladeColor = aIdx % 2 === 0 ? k.rgb(145, 52, 45) : k.rgb(165, 88, 35);
    const bladeCount = 3 + (aIdx % 3);

    for (let b = 0; b < bladeCount; b++) {
      const bladeHeight = (22 + b * 6) * (0.7 + 0.3 * transitionFactor);
      const blade = k.add([
        k.rect(2.5, bladeHeight, { radius: 1 }),
        k.pos(xPos + (b - bladeCount / 2) * 4, floorY),
        k.color(bladeColor),
        k.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
        k.anchor("bot"),
        k.rotate((b - bladeCount / 2) * 8),
        k.z(-3),
        "polar_red_algae",
      ]);
      blades.push(blade);
    }

    polarAlgaePlants.push({
      blades,
      baseX: xPos,
      swaySpeed: 1.5 + (aIdx % 3) * 0.3,
      swayPhase: aIdx * 1.1,
    });
  });

  // ===========================================================================
  // 2. PRADARIAS DE ERVAS MARINHAS COM LIXO ENTRANHADO NA COSTA URBANA (12.000m a 19.000m)
  // ===========================================================================
  const urbanSeagrassPlants: {
    blades: GameObj[];
    baseX: number;
    swaySpeed: number;
    swayPhase: number;
  }[] = [];
  URBAN_SEAGRASS_SPAWN_X.forEach((xPos, sIdx) => {
    const transitionFactor = calculateBiomeTransitionFactor(xPos, 12000, 19000, 300);
    const blades: GameObj[] = [];
    // Ervas estressadas pela poluição com tons cinza-esverdeados escuros
    const grassColor = sIdx % 2 === 0 ? k.rgb(75, 95, 70) : k.rgb(65, 85, 75);
    const bladeCount = 4 + (sIdx % 3);

    for (let b = 0; b < bladeCount; b++) {
      const bladeH = (26 + b * 5) * (0.7 + 0.3 * transitionFactor);
      const blade = k.add([
        k.rect(2.2, bladeH, { radius: 1 }),
        k.pos(xPos + (b - bladeCount / 2) * 4.5, floorY),
        k.color(grassColor),
        k.opacity(0.82 * (0.4 + 0.6 * transitionFactor)),
        k.anchor("bot"),
        k.rotate((b - bladeCount / 2) * 6),
        k.z(-3),
        "urban_seagrass",
      ]);
      blades.push(blade);
    }

    // Micro-resíduos plásticos emaranhados nas raízes e folhas da vegetação
    const trashColor =
      sIdx % 4 === 0
        ? k.rgb(230, 70, 60) // Fragmento de canudo/tampa vermelha
        : sIdx % 4 === 1
          ? k.rgb(240, 210, 60) // Plástico amarelo desbotado
          : sIdx % 4 === 2
            ? k.rgb(60, 160, 230) // Sacola plástica azul
            : k.rgb(230, 230, 230); // Fita de isopor/branca

    k.add([
      k.rect(3.5, 3.5, { radius: 1 }),
      k.pos(xPos + 3, floorY - 8 - (sIdx % 3) * 6),
      k.color(trashColor),
      k.opacity(0.88 * (0.4 + 0.6 * transitionFactor)),
      k.anchor("center"),
      k.rotate((sIdx * 35) % 90),
      k.z(-2),
      "entangled_plastic_waste",
    ]);

    urbanSeagrassPlants.push({
      blades,
      baseX: xPos,
      swaySpeed: 1.1 + (sIdx % 3) * 0.35,
      swayPhase: sIdx * 0.9,
    });
  });

  // ===========================================================================
  // 3. BANCOS DE RODOLITOS E CROSTAS DE LITHOTHAMNION EM ARRAIAL (19.000m a 30.000m)
  // ===========================================================================
  LITHOTHAMNION_SPAWN_X.forEach((xPos, lIdx) => {
    const transitionFactor = calculateBiomeTransitionFactor(xPos, 19000, 30000, 300);
    const crustW = 28 + (lIdx % 4) * 8;
    const crustH = 4 + (lIdx % 3) * 1.5;
    // Tonalidades rosadas e arroxeadas autênticas de algas calcárias (Lithothamnion)
    const crustColor = k.rgb(180 + (lIdx % 3) * 12, 95 + (lIdx % 4) * 8, 135 + (lIdx % 2) * 16);

    k.add([
      k.rect(crustW, crustH, { radius: 2 }),
      k.pos(xPos, floorY - 2 + (lIdx % 3) * 1.2),
      k.color(crustColor),
      k.opacity(0.88 * (0.4 + 0.6 * transitionFactor)),
      k.z(-3),
      "lithothamnion_crust",
    ]);

    // Nódulos de rodolitos circulares dispersos adjacentes
    if (lIdx % 2 === 0) {
      k.add([
        k.circle(3.5),
        k.pos(xPos + crustW * 0.7, floorY - 3),
        k.color(195, 110, 145),
        k.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
        k.z(-3),
        "lithothamnion_nodule",
      ]);
    }
  });

  // ===========================================================================
  // 4. RECIFES DE CORAIS E ESCOLHOS EM ARRAIAL DO CABO (19.000m a 30.000m)
  // ===========================================================================
  const corals: CoralDetail[] = [];
  const coralSpawnX = [
    19250, 19600, 20100, 20450, 20900, 21350, 21650, 22100, 22450, 22950, 23400, 23750, 24150,
    24600, 25100, 25550, 26100, 26450, 26850, 27250, 27650, 28100, 28550, 29000, 29450,
  ];

  coralSpawnX.forEach((xPos, cIdx) => {
    const transitionFactor = calculateBiomeTransitionFactor(xPos, 19000, 30000, 300);
    const coralType = cIdx % 3 === 0 ? "brain" : cIdx % 3 === 1 ? "fan" : "anemone";

    if (coralType === "brain") {
      // Coral-Cérebro maciço e arredondado (tons quentes de coral rosado)
      const brain = k.add([
        k.rect(64, 40, { radius: 18 }),
        k.pos(xPos, floorY - 6),
        k.color(240, 125, 140),
        k.outline(3, k.rgb(190, 85, 100)),
        k.opacity(0.9 * (0.4 + 0.6 * transitionFactor)),
        k.anchor("bot"),
        k.z(-3),
        "coral_brain",
      ]);

      // Sulcos internos do coral-cérebro
      k.add([
        k.circle(12),
        k.pos(xPos, floorY - 14),
        k.color(255, 155, 165),
        k.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
        k.anchor("center"),
        k.z(-3),
      ]);

      corals.push({ obj: brain, type: "brain", baseY: floorY - 6, animPhase: cIdx });
    } else if (coralType === "fan") {
      // Gorgônia em Leque / Coral de Fogo ramificado
      const fan = k.add([
        k.polygon([
          k.vec2(0, 0),
          k.vec2(-28, -55),
          k.vec2(-10, -65),
          k.vec2(0, -58),
          k.vec2(14, -68),
          k.vec2(30, -50),
        ]),
        k.pos(xPos, floorY),
        k.color(255, 95, 80),
        k.opacity(0.9 * (0.4 + 0.6 * transitionFactor)),
        k.anchor("bot"),
        k.z(-3),
        "coral_fan",
      ]);

      corals.push({ obj: fan, type: "fan", baseY: floorY, animPhase: cIdx });
    } else {
      // Anêmona Marinha / Coral mole com tentáculos fluorescentes
      const anemone = k.add([
        k.rect(44, 26, { radius: 11 }),
        k.pos(xPos, floorY - 4),
        k.color(65, 230, 190), // Verde-água fluorescente
        k.opacity(0.9 * (0.4 + 0.6 * transitionFactor)),
        k.anchor("bot"),
        k.scale(1, 1),
        k.z(-3),
        "coral_anemone",
      ]);

      // Tentáculos da anêmona
      const tentacles: GameObj[] = [];
      for (let t = -3; t <= 3; t++) {
        const tentacle = k.add([
          k.rect(3, 16, { radius: 2 }),
          k.pos(xPos + t * 4, floorY - 12),
          k.color(110, 255, 220),
          k.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
          k.anchor("bot"),
          k.rotate(t * 8),
          k.z(-3),
        ]);
        tentacles.push(tentacle);
      }

      corals.push({ obj: anemone, type: "anemone", baseY: floorY - 4, animPhase: cIdx, tentacles });
    }

    // Pequenos Peixes de Recife coloridos passeando próximos aos corais (Donzelas e Cirurgiões)
    if (cIdx % 2 === 0) {
      const fishColor = cIdx % 4 === 0 ? k.rgb(255, 225, 60) : k.rgb(50, 160, 255);
      const reefFish = k.add([
        k.polygon([k.vec2(-8, -4), k.vec2(6, 0), k.vec2(-8, 4), k.vec2(-12, 0)]),
        k.pos(xPos + 15, floorY - 45 - (cIdx % 3) * 15),
        k.color(fishColor),
        k.z(-3),
        "reef_fish",
        {
          basePos: k.vec2(xPos + 15, floorY - 45 - (cIdx % 3) * 15),
          swimSpeed: 1.5 + (cIdx % 3) * 0.5,
          phase: cIdx * 1.7,
        },
      ]);

      reefFish.onUpdate(() => {
        const t = k.time();
        reefFish.pos.x =
          reefFish.basePos.x + Math.sin(t * reefFish.swimSpeed + reefFish.phase) * 18;
        reefFish.pos.y = reefFish.basePos.y + Math.cos(t * 1.8 + reefFish.phase) * 6;
      });
    }
  });

  let time = 0;

  k.onUpdate(() => {
    time += k.dt();
    const camX = k.camPos().x;
    const viewDist = k.width() + 200;

    // A. Animação de ondulação das Florestas de Kelp e Algas Vermelhas (somente no Bioma Antártico: x < 5500)
    if (camX < 5500) {
      kelpForest.forEach((plant) => {
        if (Math.abs(plant.baseX - camX) > viewDist) return;

        const baseSway = Math.sin(time * plant.swaySpeed + plant.swayPhase);

        // Deforma os nós progressivamente (ápice com maior curvatura)
        plant.segments.forEach((seg, idx) => {
          const segProgress = (idx + 1) / plant.segments.length;
          const currentSway = baseSway * segProgress * 16;
          seg.pos.x = plant.baseX + currentSway;
          seg.angle = baseSway * segProgress * 9;
        });
      });

      polarAlgaePlants.forEach((algae) => {
        if (Math.abs(algae.baseX - camX) > viewDist) return;
        const sway = Math.sin(time * algae.swaySpeed + algae.swayPhase);
        algae.blades.forEach((blade, bIdx) => {
          blade.angle = (bIdx - algae.blades.length / 2) * 8 + sway * 12;
        });
      });
    }

    // A.5. Animação de ondulação das Ervas Marinhas na Costa Urbana (11.500m a 19.500m)
    if (camX >= 11500 && camX <= 19500) {
      urbanSeagrassPlants.forEach((grass) => {
        if (Math.abs(grass.baseX - camX) > viewDist) return;
        const sway = Math.sin(time * grass.swaySpeed + grass.swayPhase);
        grass.blades.forEach((blade, bIdx) => {
          blade.angle = (bIdx - grass.blades.length / 2) * 6 + sway * 10;
        });
      });
    }

    // B. Animação sutil de respiração dos corais moles / gorgônias (somente em Arraial: x > 18500)
    if (camX > 18500) {
      corals.forEach((coral) => {
        if (Math.abs(coral.obj.pos.x - camX) > viewDist) return;

        if (coral.type === "fan") {
          coral.obj.angle = Math.sin(time * 1.4 + coral.animPhase) * 4;
        } else if (coral.type === "anemone") {
          const cycleTime = time * 2.5 + coral.animPhase;
          // Variação de escala Y entre 0.85 e 1.15 em ciclo senoidal de 2 a 3s (Fase 35.3)
          const verticalScale = 1.0 + Math.sin(cycleTime) * 0.15;
          const horizontalScale = 1.0 - Math.sin(cycleTime) * 0.08;
          coral.obj.scale = k.vec2(horizontalScale, verticalScale);

          if (coral.tentacles) {
            const totalTentacles = coral.tentacles.length;
            coral.tentacles.forEach((tentacle, tentacleIndex) => {
              const baseAngle = (tentacleIndex - (totalTentacles - 1) / 2) * 8;
              const angleSpread = Math.sin(cycleTime) * 6 * (baseAngle >= 0 ? 1 : -1);
              tentacle.angle = baseAngle + angleSpread;
              tentacle.scale = k.vec2(1.0, verticalScale);
            });
          }
        }
      });
    }
  });
}
