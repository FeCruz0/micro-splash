import type {
  CanyonConfig,
  AnemoneItem,
  CanyonEngineContext,
  CanyonVector2D,
  CanyonGameObject,
} from "./canyonTypes";
import type { IRenderEngine, IGraphicsNode, ISpriteNode } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../../engine/adapters/LegacyBridge";
import { getActiveRenderEngine } from "../../engine/adapters/RenderEngineAdapter";

/**
 * Desenha a tartaruga marinha (Chelonia mydas) de forma limpa e leve:
 * UM ÚNICO retângulo verde (68, 108, 64) 34x18 com raio 8.
 */
export function draw16BitSeaTurtle(gfx: IGraphicsNode | any): void {
  if (typeof gfx.drawRoundedRect === "function") {
    gfx.drawRoundedRect(-17, -9, 34, 18, 8, { fill: { color: 0x446c40, alpha: 1.0 } });
  } else if (typeof gfx.drawRect === "function") {
    gfx.drawRect(-17, -9, 34, 18, { fill: { color: 0x446c40, alpha: 1.0 } });
  }
}

/**
 * Desenha o peixe de passagem de forma limpa e leve:
 * UM ÚNICO retângulo azul (130, 165, 195) 28x10 com raio 5.
 */
export function draw16BitPassageFish(gfx: IGraphicsNode | any): void {
  if (typeof gfx.drawRoundedRect === "function") {
    gfx.drawRoundedRect(-14, -5, 28, 10, 5, { fill: { color: 0x82a5c3, alpha: 1.0 } });
  } else if (typeof gfx.drawRect === "function") {
    gfx.drawRect(-14, -5, 28, 10, { fill: { color: 0x82a5c3, alpha: 1.0 } });
  }
}

/**
 * Resolve o motor de renderização real (Pixi / RenderEngine) para pre-bake de texturas.
 */
function resolveEngine(engineContext?: unknown): IRenderEngine | null {
  if (isRenderEngine(engineContext)) return engineContext;
  if (engineContext && typeof engineContext === "object") {
    if ("renderEngine" in engineContext && isRenderEngine((engineContext as any).renderEngine)) {
      return (engineContext as any).renderEngine;
    }
    if (
      "getRenderEngine" in engineContext &&
      typeof (engineContext as any).getRenderEngine === "function"
    ) {
      const e = (engineContext as any).getRenderEngine();
      if (isRenderEngine(e)) return e;
    }
    if ("createGraphics" in engineContext && "createSprite" in engineContext) {
      return engineContext as unknown as IRenderEngine;
    }
  }
  const active = getActiveRenderEngine();
  if (active && isRenderEngine(active) && (active as any).isInitialized) {
    return active;
  }
  return null;
}

export function setupCanyonObstacles<
  TColor = unknown,
  TVec extends { x: number; y: number } = CanyonVector2D,
>(k: CanyonEngineContext<TColor, TVec>, config: CanyonConfig): AnemoneItem<TColor>[] {
  const { rampUpEndX } = config;

  // Bioincrustações: Tufos de Anêmonas Vivas no vale e nas bases rochosas (oscilam suavemente com a ressurgência)
  const plateauWidth = config.plateauEndX - rampUpEndX;
  const rightWallOffsetX = plateauWidth - 640;
  const valleyFloorY = 340;

  const anemones: AnemoneItem<TColor>[] = [];
  const anemonePositions = [
    { x: rampUpEndX + 180, y: 338, col: [230, 110, 85] },
    { x: rampUpEndX + 320, y: valleyFloorY - 2, col: [75, 195, 155] },
    { x: rampUpEndX + 540, y: valleyFloorY - 2, col: [240, 130, 95] },
    { x: rampUpEndX + 760, y: valleyFloorY - 2, col: [85, 205, 165] },
    { x: rampUpEndX + rightWallOffsetX + 460, y: 338, col: [225, 105, 80] },
  ];

  for (let a = 0; a < anemonePositions.length; a++) {
    const ap = anemonePositions[a];
    k.add([
      k.circle(3.5),
      k.pos(ap.x, ap.y + 2),
      k.color(
        Math.round(ap.col[0] * 0.7),
        Math.round(ap.col[1] * 0.7),
        Math.round(ap.col[2] * 0.7)
      ),
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
      ]) as CanyonGameObject<TColor>;
      anemones.push({ obj: tentacle, baseAngle: t * 12, phase: a * 1.3 + t * 0.5 });
    }
  }

  // 1.1 Costões rochosos escarpados de granito (boqueirao_crag)
  const cragCount = 12;
  for (let c = 0; c < cragCount; c++) {
    const cragX = rampUpEndX + 60 + c * 85;
    const cragW = 18 + (c % 3) * 6;
    const cragH = 12 + (c % 4) * 5;
    k.add([
      k.rect(cragW, cragH, { radius: 2 }),
      k.pos(cragX, valleyFloorY - cragH + 2),
      k.color(65, 75, 88),
      k.z(3),
      "boqueirao_crag",
    ]);
  }

  // 1.2 Fendas submarinas profundas e fraturas tectônicas (boqueirao_fissure)
  const fissurePositions = [
    { x: rampUpEndX + 80,  h: 45, w: 5,  tilt: -12 },
    { x: rampUpEndX + 210, h: 55, w: 6,  tilt: 8 },
    { x: rampUpEndX + 350, h: 40, w: 4,  tilt: -6 },
    { x: rampUpEndX + 490, h: 60, w: 6,  tilt: 14 },
    { x: rampUpEndX + 650, h: 50, w: 5,  tilt: -10 },
    { x: rampUpEndX + 820, h: 52, w: 6,  tilt: 7 },
    { x: rampUpEndX + 950, h: 42, w: 4,  tilt: -8 },
  ];
  for (const fp of fissurePositions) {
    k.add([
      k.rect(fp.w, fp.h, { radius: 1 }),
      k.pos(fp.x, valleyFloorY + 4),
      k.color(14, 20, 28),
      k.rotate(fp.tilt),
      k.opacity(0.95),
      k.z(3),
      "boqueirao_fissure",
    ]);
  }

  // 1.3 Bioincrustações de algas calcárias rosadas/aroxeadas (Lithothamnion)
  const crustCount = 14;
  for (let c = 0; c < crustCount; c++) {
    const crustX = rampUpEndX + 45 + c * 75;
    const crustW = 24 + (c % 4) * 8;
    const crustH = 3 + (c % 3) * 1.5;
    k.add([
      k.rect(crustW, crustH, { radius: 1.5 }),
      k.pos(crustX, valleyFloorY - 1 + (c % 3) * 1.2),
      k.color(175 + (c % 3) * 10, 95 + (c % 4) * 8, 130 + (c % 2) * 15),
      k.opacity(0.88),
      k.z(3),
      "boqueirao_bioincrustation",
    ]);
  }

  // 1.4 Ouriços-pretos (Echinometra lucunter) em tocas e concavidades
  const urchinPockets = [
    { x: rampUpEndX + 150, y: valleyFloorY + 2 },
    { x: rampUpEndX + 270, y: valleyFloorY + 5 },
    { x: rampUpEndX + 430, y: valleyFloorY + 3 },
    { x: rampUpEndX + 610, y: valleyFloorY + 4 },
    { x: rampUpEndX + 790, y: valleyFloorY + 2 },
    { x: rampUpEndX + 930, y: valleyFloorY + 5 },
    { x: rampUpEndX + 1050, y: valleyFloorY + 3 },
  ];
  for (const up of urchinPockets) {
    k.add([
      k.circle(3),
      k.pos(up.x, up.y),
      k.color(18, 18, 22),
      k.z(4),
      "boqueirao_urchin",
    ]);
  }

  // =========================================================================
  // 2. GORGÔNIAS 16-BITS NAS PAREDES INCLINADAS DO CÂNION (Fase 68)
  // =========================================================================
  const gorgonianWallPositions = [
    // Parede Esquerda (face inclinada de x=0, y=190 até x=150, y=340)
    { x: rampUpEndX + 30, y: 205, tilt: 35, col: [38, 198, 218], dark: [0, 131, 143], tip: [255, 202, 40] },
    { x: rampUpEndX + 70, y: 245, tilt: 35, col: [255, 112, 67], dark: [191, 54, 12], tip: [255, 202, 40] },
    { x: rampUpEndX + 110, y: 290, tilt: 35, col: [171, 71, 188], dark: [92, 34, 104], tip: [128, 222, 234] },
    { x: rampUpEndX + 145, y: 335, tilt: 20, col: [38, 198, 218], dark: [0, 131, 143], tip: [255, 202, 40] },

    // Parede Direita (face inclinada de x=490, y=340 até x=640, y=190)
    { x: rampUpEndX + rightWallOffsetX + 610, y: 205, tilt: -35, col: [255, 112, 67], dark: [191, 54, 12], tip: [255, 202, 40] },
    { x: rampUpEndX + rightWallOffsetX + 570, y: 245, tilt: -35, col: [38, 198, 218], dark: [0, 131, 143], tip: [255, 202, 40] },
    { x: rampUpEndX + rightWallOffsetX + 530, y: 290, tilt: -35, col: [171, 71, 188], dark: [92, 34, 104], tip: [128, 222, 234] },
    { x: rampUpEndX + rightWallOffsetX + 495, y: 335, tilt: -20, col: [38, 198, 218], dark: [0, 131, 143], tip: [255, 202, 40] },
  ];

  for (const gwp of gorgonianWallPositions) {
    k.add([
      k.rect(14, 5, { radius: 1 }),
      k.pos(gwp.x, gwp.y),
      k.color(15, 37, 55),
      k.rotate(gwp.tilt),
      k.anchor("center"),
      k.z(3),
      "boqueirao_gorgonian",
      "coral_fan",
    ]);

    const branches = [
      { offX: -10, h: 22 },
      { offX: -5, h: 30 },
      { offX: 0, h: 34 },
      { offX: 5, h: 28 },
      { offX: 10, h: 20 },
    ];
    for (const br of branches) {
      const segCount = Math.ceil(br.h / 6);
      for (let s = 0; s < segCount; s++) {
        const segX = gwp.x + br.offX;
        const segY = gwp.y - s * 6;
        k.add([
          k.rect(4, 6, { radius: 1 }),
          k.pos(segX, segY),
          k.color(gwp.col[0], gwp.col[1], gwp.col[2]),
          k.rotate(gwp.tilt + br.offX * 0.8),
          k.anchor("bot"),
          k.opacity(0.95),
          k.z(3),
          "boqueirao_gorgonian",
          "coral_fan",
        ]);
        if (s % 2 === 0) {
          k.add([
            k.rect(4, 2),
            k.pos(segX, segY - 1),
            k.color(gwp.dark[0], gwp.dark[1], gwp.dark[2]),
            k.rotate(gwp.tilt + br.offX * 0.8),
            k.anchor("bot"),
            k.z(3),
            "boqueirao_gorgonian",
            "coral_fan",
          ]);
        }
      }
      k.add([
        k.rect(3, 3),
        k.pos(gwp.x + br.offX, gwp.y - br.h),
        k.color(gwp.tip[0], gwp.tip[1], gwp.tip[2]),
        k.rotate(gwp.tilt),
        k.anchor("center"),
        k.z(3),
        "boqueirao_gorgonian",
        "coral_fan",
      ]);
    }
  }

  // =========================================================================
  // 3. FAUNA DO ESTREITO: PRE-BAKE ESTÁTICO (TARTARUGAS & PEIXES DE PASSAGEM)
  // =========================================================================
  // Pré-bake único na raiz: gera texturas estáticas via engine.generateTexture
  // resolution: 0.5 e scaleMode: 'nearest', destruindo o Graphics base imediatamente.
  const realEngine = resolveEngine(k);
  let bakedTurtleTex: unknown = null;
  let bakedFishTex: unknown = null;
  let stageRoot: { addChild: (child: unknown) => void } | null = null;

  if (
    realEngine &&
    typeof realEngine.createGraphics === "function" &&
    typeof realEngine.generateTexture === "function"
  ) {
    try {
      const bakeOptions = { resolution: 0.5, scaleMode: "nearest" as const };

      // Pre-bake da Tartaruga Marinha
      const turtleGfx = realEngine.createGraphics("turtle_bake");
      draw16BitSeaTurtle(turtleGfx);
      bakedTurtleTex = realEngine.generateTexture(turtleGfx, bakeOptions);
      if (typeof (turtleGfx as any).destroy === "function") {
        (turtleGfx as any).destroy();
      }

      // Pre-bake do Peixe de Passagem
      const fishGfx = realEngine.createGraphics("passage_fish_bake");
      draw16BitPassageFish(fishGfx);
      bakedFishTex = realEngine.generateTexture(fishGfx, bakeOptions);
      if (typeof (fishGfx as any).destroy === "function") {
        (fishGfx as any).destroy();
      }

      if (typeof realEngine.getStageRoot === "function") {
        stageRoot = realEngine.getStageRoot() as { addChild: (child: unknown) => void };
      }
    } catch {
      bakedTurtleTex = null;
      bakedFishTex = null;
    }
  }

  // A. Tartarugas Marinhas (Chelonia mydas) nadando pelo vão do cânion em Y=200 a Y=280
  const activeTurtles: {
    obj: CanyonGameObject<TColor>;
    spriteNode: ISpriteNode | null;
    speed: number;
    phase: number;
    baseY: number;
  }[] = [];

  const turtlePositions = [
    { x: rampUpEndX + 350, y: 220, speed: 28, phase: 0 },
    { x: rampUpEndX + 580, y: 260, speed: 32, phase: 2.1 },
    { x: rampUpEndX + 800, y: 210, speed: 25, phase: 4.2 },
  ];

  for (const tp of turtlePositions) {
    let turtleSpriteNode: ISpriteNode | null = null;
    if (bakedTurtleTex && realEngine && typeof realEngine.createSprite === "function") {
      try {
        const sprite = realEngine.createSprite(bakedTurtleTex, "boqueirao_turtle_sprite");
        if (typeof sprite.setAnchor === "function") {
          sprite.setAnchor(0.5, 0.5);
        }
        sprite.setPosition(tp.x, tp.y);
        sprite.setZIndex(4);
        if (stageRoot && typeof stageRoot.addChild === "function") {
          stageRoot.addChild(sprite);
        }
        turtleSpriteNode = sprite;
      } catch {
        turtleSpriteNode = null;
      }
    }

    // Entidade ativa única no Kaboom: UM ÚNICO k.rect(34, 18, { radius: 8 }) verde (68, 108, 64)
    const turtleObj = k.add([
      k.rect(34, 18, { radius: 8 }),
      k.pos(tp.x, tp.y),
      k.color(68, 108, 64),
      k.anchor("center"),
      k.z(4),
      "boqueirao_turtle",
    ]) as CanyonGameObject<TColor>;

    activeTurtles.push({
      obj: turtleObj,
      spriteNode: turtleSpriteNode,
      speed: tp.speed,
      phase: tp.phase,
      baseY: tp.y,
    });
  }

  // B. Cardume de "Peixes de Passagem" grandes atravessando o vão livre entre as paredes (em Y=200 a Y=280)
  const activeFish: {
    obj: CanyonGameObject<TColor>;
    spriteNode: ISpriteNode | null;
    speed: number;
    phase: number;
    baseY: number;
  }[] = [];

  const passageFishCount = 8;
  for (let f = 0; f < passageFishCount; f++) {
    const fx = rampUpEndX + 280 + f * 95;
    const fy = 210 + (f % 4) * 20; // Y = 210 a 270
    const fishSpeed = 48 + (f % 3) * 12;

    let fishSpriteNode: ISpriteNode | null = null;
    if (bakedFishTex && realEngine && typeof realEngine.createSprite === "function") {
      try {
        const sprite = realEngine.createSprite(bakedFishTex, "boqueirao_passage_fish_sprite");
        if (typeof sprite.setAnchor === "function") {
          sprite.setAnchor(0.5, 0.5);
        }
        sprite.setPosition(fx, fy);
        sprite.setZIndex(3);
        if (stageRoot && typeof stageRoot.addChild === "function") {
          stageRoot.addChild(sprite);
        }
        fishSpriteNode = sprite;
      } catch {
        fishSpriteNode = null;
      }
    }

    // Entidade ativa única no Kaboom: UM ÚNICO k.rect(28, 10, { radius: 5 }) azul (130, 165, 195)
    const fishObj = k.add([
      k.rect(28, 10, { radius: 5 }),
      k.pos(fx, fy),
      k.color(130, 165, 195),
      k.anchor("center"),
      k.z(3),
      "boqueirao_passage_fish",
    ]) as CanyonGameObject<TColor>;

    activeFish.push({
      obj: fishObj,
      spriteNode: fishSpriteNode,
      speed: fishSpeed,
      phase: f * 0.9,
      baseY: fy,
    });
  }

  // =========================================================================
  // ORQUESTRADOR DE LOOP ÚNICO DA FAUNA DO BOQUEIRÃO (Fase Zero-Allocation & Baixo Overhead)
  // =========================================================================
  const totalTurtles = activeTurtles.length;
  const totalFish = activeFish.length;
  const turtleResetLimit = config.plateauEndX + 100;
  const turtleResetStartX = rampUpEndX + 150;
  const fishResetLimit = config.plateauEndX + 200;
  const fishResetStartX = rampUpEndX + 180;

  if (typeof k.onUpdate === "function") {
    (k.onUpdate as unknown as (tagOrCb: unknown, cb?: () => void) => void)(
      "boqueirao_fauna_ticker",
      () => {
        const dt = k.dt();
        const camX = typeof k.camPos === "function" ? k.camPos().x : 0;

        // 1. Atualização consolidada de tartarugas com Culling Matemático
        for (let i = 0; i < totalTurtles; i++) {
          const t = activeTurtles[i];
          const turtleObj = t.obj;
          if (!turtleObj || !turtleObj.pos) continue;

          const dist = Math.abs(turtleObj.pos.x - camX);
          if (dist > 1200) {
            turtleObj.hidden = true;
            if (t.spriteNode && typeof t.spriteNode.setVisible === "function") {
              t.spriteNode.setVisible(false);
            }
            continue;
          }
          turtleObj.hidden = false;
          if (t.spriteNode && typeof t.spriteNode.setVisible === "function") {
            t.spriteNode.setVisible(true);
          }

          t.phase += dt;
          turtleObj.pos.x += dt * t.speed;
          const curY = t.baseY + Math.sin(t.phase * 1.5) * 8;
          turtleObj.pos.y = curY;
          const curAngle = Math.sin(t.phase * 1.5) * 0.08;
          turtleObj.angle = curAngle;

          if (turtleObj.pos.x > turtleResetLimit) {
            turtleObj.pos.x = turtleResetStartX;
          }

          if (t.spriteNode) {
            t.spriteNode.setPosition(turtleObj.pos.x, curY);
            t.spriteNode.setRotation(curAngle);
          }
        }

        // 2. Atualização consolidada de peixes de passagem com Culling Matemático
        for (let i = 0; i < totalFish; i++) {
          const f = activeFish[i];
          const fishObj = f.obj;
          if (!fishObj || !fishObj.pos) continue;

          const dist = Math.abs(fishObj.pos.x - camX);
          if (dist > 1200) {
            fishObj.hidden = true;
            if (f.spriteNode && typeof f.spriteNode.setVisible === "function") {
              f.spriteNode.setVisible(false);
            }
            continue;
          }
          fishObj.hidden = false;
          if (f.spriteNode && typeof f.spriteNode.setVisible === "function") {
            f.spriteNode.setVisible(true);
          }

          f.phase += dt;
          fishObj.pos.x += dt * f.speed;
          const curY = f.baseY + Math.sin(f.phase * 2.2) * 5;
          fishObj.pos.y = curY;
          const curAngle = Math.cos(f.phase * 2.2) * 0.06;
          fishObj.angle = curAngle;

          if (fishObj.pos.x > fishResetLimit) {
            fishObj.pos.x = fishResetStartX;
          }

          if (f.spriteNode) {
            f.spriteNode.setPosition(fishObj.pos.x, curY);
            f.spriteNode.setRotation(curAngle);
          }
        }
      }
    );
  }

  return anemones;
}

