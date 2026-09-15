import kaboom, { type GameObj } from "kaboom";

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
}

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
  const kelpSpawnX = [
    250, 420, 600, 780, 1100, 1350, 1600, 1950, 2200, 2550, 
    2850, 3100, 3450, 3800, 4200, 4550, 4850
  ];

  kelpSpawnX.forEach((xPos, plantIdx) => {
    const plantHeight = 120 + (plantIdx % 4) * 35; // Altura entre 120px e 225px
    const segmentCount = 6;
    const segHeight = plantHeight / segmentCount;
    const segments: GameObj[] = [];

    // Tonalidades dourado-esverdeadas autênticas de Macrocystis pyrifera (Kelp)
    const baseColor = (plantIdx % 2 === 0) 
      ? k.rgb(75, 95, 45) 
      : k.rgb(105, 115, 40);

    for (let s = 0; s < segmentCount; s++) {
      // Largura afunilando em direção ao topo
      const segWidth = 14 - s * 1.4;

      // Haste central
      const stem = k.add([
        k.rect(segWidth, segHeight + 4, { radius: 3 }),
        k.pos(xPos, floorY - (s + 1) * segHeight),
        k.color(baseColor),
        k.opacity(0.85),
        k.anchor("bot"),
        k.z(s % 2 === 0 ? -3 : 2), // Alterna camadas para profundidade 2.5D
        "kelp_segment",
      ]);

      // Lâmina foliar lateral ondulante
      const leafSide = (s % 2 === 0) ? 1 : -1;
      const leafWidth = 18 + s * 2;
      const leafHeight = 8 + s * 1.2;
      const leaf = k.add([
        k.rect(leafWidth, leafHeight, { radius: leafHeight / 2 }),
        k.pos(xPos + leafSide * (segWidth + 4), floorY - (s + 0.5) * segHeight),
        k.color(baseColor),
        k.opacity(0.75),
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
  // 2. RECIFES DE CORAIS E ESCOLHOS EM ARRAIAL DO CABO (19.000m a 27.000m)
  // ===========================================================================
  const corals: CoralDetail[] = [];
  const coralSpawnX = [
    19250, 19600, 20100, 20450, 20900, 21350, 21650, 22100,
    22450, 22950, 23400, 23750, 24150, 24600, 25100, 25550, 26100, 26450
  ];

  coralSpawnX.forEach((xPos, cIdx) => {
    const coralType = (cIdx % 3 === 0) ? "brain" : (cIdx % 3 === 1) ? "fan" : "anemone";

    if (coralType === "brain") {
      // Coral-Cérebro maciço e arredondado (tons quentes de coral rosado)
      const brain = k.add([
        k.rect(64, 40, { radius: 18 }),
        k.pos(xPos, floorY - 6),
        k.color(240, 125, 140),
        k.outline(3, k.rgb(190, 85, 100)),
        k.anchor("bot"),
        k.z(-3),
        "coral_brain",
      ]);

      // Sulcos internos do coral-cérebro
      k.add([
        k.circle(12),
        k.pos(xPos, floorY - 14),
        k.color(255, 155, 165),
        k.opacity(0.85),
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
        k.opacity(0.9),
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
        k.anchor("bot"),
        k.scale(1, 1),
        k.z(-3),
        "coral_anemone",
      ]);

      // Tentáculos da anêmona
      for (let t = -3; t <= 3; t++) {
        k.add([
          k.rect(3, 16, { radius: 2 }),
          k.pos(xPos + t * 4, floorY - 12),
          k.color(110, 255, 220),
          k.anchor("bot"),
          k.rotate(t * 8),
          k.z(-3),
        ]);
      }

      corals.push({ obj: anemone, type: "anemone", baseY: floorY - 4, animPhase: cIdx });
    }

    // Pequenos Peixes de Recife coloridos passeando próximos aos corais (Donzelas e Cirurgiões)
    if (cIdx % 2 === 0) {
      const fishColor = (cIdx % 4 === 0) ? k.rgb(255, 225, 60) : k.rgb(50, 160, 255);
      const reefFish = k.add([
        k.polygon([
          k.vec2(-8, -4),
          k.vec2(6, 0),
          k.vec2(-8, 4),
          k.vec2(-12, 0),
        ]),
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
        reefFish.pos.x = reefFish.basePos.x + Math.sin(t * reefFish.swimSpeed + reefFish.phase) * 18;
        reefFish.pos.y = reefFish.basePos.y + Math.cos(t * 1.8 + reefFish.phase) * 6;
      });
    }
  });

  let time = 0;

  k.onUpdate(() => {
    time += k.dt();
    const camX = k.camPos().x;
    const viewDist = k.width() + 200;

    // A. Animação de ondulação das Florestas de Kelp
    kelpForest.forEach((plant) => {
      // Culling leve: só anima se estiver perto da tela
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

    // B. Animação sutil de respiração dos corais moles / gorgônias
    corals.forEach((coral) => {
      if (Math.abs(coral.obj.pos.x - camX) > viewDist) return;

      if (coral.type === "fan") {
        coral.obj.angle = Math.sin(time * 1.4 + coral.animPhase) * 4;
      } else if (coral.type === "anemone") {
        const breathe = 1 + Math.sin(time * 2.2 + coral.animPhase) * 0.08;
        coral.obj.scale = k.vec2(breathe, 1 / breathe);
      }
    });
  });
}
