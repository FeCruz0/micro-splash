import { GAME_CONFIG, TAGS } from "../config";
import { getRandomFloat } from "../utils/random";
import { getParticlePool } from "../systems/particlePool";
import { getEntityFamilyTicker } from "../systems/entityFamilyTicker";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../engine/adapters/RenderEngineAdapter";
import {
  createNativeCircleNode,
  createNativeRectNode,
  type NativeVisualObjectAdapter,
} from "../engine/adapters/NativeRenderNodeFactory";

export interface BoatVector2D {
  x: number;
  y: number;
}

export interface BoatGameObject {
  pos: BoatVector2D;
  color?: unknown;
  angle?: number;
  opacity?: number;
  hidden?: boolean;
  add: (components: unknown[]) => BoatGameObject;
  onUpdate: (cb: () => void) => void;
}

export interface BoatEngineContext<TColor = unknown> {
  add: (components: unknown[]) => unknown;
  dt: () => number;
  rect: (w: number, h: number, opt?: { radius?: number }) => unknown;
  circle: (r: number) => unknown;
  pos: (x: number, y: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  outline: (w: number, col: TColor) => unknown;
  anchor: (a: "botleft" | "center" | "topleft") => unknown;
  z: (v: number) => unknown;
  rotate: (a: number) => unknown;
  opacity: (o: number) => unknown;
  lifespan?: (time: number, opt?: { fade?: number }) => unknown;
  rgb: (r: number, g: number, b: number) => TColor;
  rand: (min: number, max: number) => number;
}

function createBoatColorValue<TColor = unknown>(
  k: BoatEngineContext<TColor>,
  red: number,
  green: number,
  blue: number
): TColor | [number, number, number] {
  return typeof k.rgb === "function" ? k.rgb(red, green, blue) : [red, green, blue];
}

function createNativeBoatVisuals<TColor = unknown>(
  k: BoatEngineContext<TColor>,
  resolvedNativeRenderEngine: IRenderEngine,
  targetPos: BoatVector2D
): {
  boat: NativeVisualObjectAdapter;
  flag: NativeVisualObjectAdapter;
  beacon: NativeVisualObjectAdapter;
} {
  const worldRenderContainer = resolveWorldRenderContainer(resolvedNativeRenderEngine);
  const boat = createNativeRectNode(k, resolvedNativeRenderEngine, worldRenderContainer, {
    identifier: "rescue_boat_hull",
    width: 94,
    height: 30,
    cornerRadius: 5,
    positionX: targetPos.x - 300,
    positionY: GAME_CONFIG.SEA_LEVEL + 8,
    fillColor: [245, 248, 252],
    outlineColor: [30, 60, 110],
    outlineWidth: 2.5,
    anchor: "botleft",
    zIndex: 50,
  });
  const boatRenderNode = boat.getRenderNode();

  // Faixa diagonal de salvamento laranja e azul de contraste
  createNativeRectNode(k, resolvedNativeRenderEngine, boatRenderNode, {
    identifier: "rescue_boat_stripe_orange",
    width: 14,
    height: 26,
    cornerRadius: 2,
    positionX: 60,
    positionY: -28,
    rotationDegrees: -18,
    fillColor: [249, 115, 22],
  });
  createNativeRectNode(k, resolvedNativeRenderEngine, boatRenderNode, {
    identifier: "rescue_boat_stripe_blue",
    width: 5,
    height: 26,
    cornerRadius: 1,
    positionX: 74,
    positionY: -28,
    rotationDegrees: -18,
    fillColor: [30, 64, 175],
  });

  // Cabine do barco de salvamento e vigias turquesa
  const cabin = createNativeRectNode(k, resolvedNativeRenderEngine, boatRenderNode, {
    identifier: "rescue_boat_cabin",
    width: 34,
    height: 22,
    cornerRadius: 3,
    positionX: 18,
    positionY: -30,
    fillColor: [210, 220, 235],
    outlineColor: [40, 55, 80],
    outlineWidth: 2,
  });
  const cabinRenderNode = cabin.getRenderNode();
  createNativeRectNode(k, resolvedNativeRenderEngine, cabinRenderNode, {
    identifier: "rescue_boat_window_left",
    width: 7,
    height: 7,
    cornerRadius: 1,
    positionX: 5,
    positionY: 4,
    fillColor: [125, 211, 252],
    opacity: 0.85,
  });
  createNativeRectNode(k, resolvedNativeRenderEngine, cabinRenderNode, {
    identifier: "rescue_boat_window_right",
    width: 7,
    height: 7,
    cornerRadius: 1,
    positionX: 15,
    positionY: 4,
    fillColor: [125, 211, 252],
    opacity: 0.85,
  });

  // Mastro, flâmula verde com detalhe dourado e sinalizador
  createNativeRectNode(k, resolvedNativeRenderEngine, boatRenderNode, {
    identifier: "rescue_boat_mast",
    width: 3,
    height: 40,
    positionX: 33,
    positionY: -68,
    fillColor: [160, 175, 195],
    outlineColor: [50, 65, 85],
    outlineWidth: 1,
  });
  const flag = createNativeRectNode(k, resolvedNativeRenderEngine, boatRenderNode, {
    identifier: "rescue_boat_flag",
    width: 14,
    height: 9,
    cornerRadius: 1,
    positionX: 36,
    positionY: -68,
    fillColor: [34, 197, 94],
  });
  createNativeRectNode(k, resolvedNativeRenderEngine, boatRenderNode, {
    identifier: "rescue_boat_flag_gold",
    width: 5,
    height: 4,
    positionX: 40,
    positionY: -65.5,
    fillColor: [250, 204, 21],
  });
  const beacon = createNativeCircleNode(k, resolvedNativeRenderEngine, cabinRenderNode, {
    identifier: "rescue_boat_beacon",
    radius: 5,
    positionX: 17,
    positionY: -8,
    fillColor: [255, 0, 0],
  });

  return { boat, flag, beacon };
}

/**
 * Cria o barco de resgate da Guarda Marítima / Instituto Baleia Jubarte (Fase 34.3).
 * Conta com mastro vertical, flâmula oscilante, faixa de salvamento laranja,
 * cabine com vigias e esteira de espuma d'água (scia) durante o deslocamento.
 */
export function createRescueBoat<TColor = unknown>(
  k: BoatEngineContext<TColor>,
  targetPos: BoatVector2D
): BoatGameObject {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  let boat: BoatGameObject;
  let flag: { angle?: number };
  let beacon: { color?: unknown };
  let nativeBoatAdapter: NativeVisualObjectAdapter | null = null;

  if (resolvedNativeRenderEngine) {
    const nativeVisuals = createNativeBoatVisuals(k, resolvedNativeRenderEngine, targetPos);
    nativeBoatAdapter = nativeVisuals.boat;
    boat = nativeVisuals.boat as unknown as BoatGameObject;
    flag = nativeVisuals.flag;
    beacon = nativeVisuals.beacon;
  } else {
    // Barco da Guarda Marítima navegando na linha d'água (caminho legado para mocks)
    boat = k.add([
      k.rect(94, 30, { radius: 5 }),
      k.pos(targetPos.x - 300, GAME_CONFIG.SEA_LEVEL + 8),
      k.color(245, 248, 252), // Casco branco naval
      k.outline(2.5, k.rgb(30, 60, 110)), // Borda azul marinho de proteção
      k.anchor("botleft"),
      k.z(50),
    ]) as BoatGameObject;

    boat.add([
      k.rect(14, 26, { radius: 2 }),
      k.pos(60, -28),
      k.color(249, 115, 22),
      ...(typeof k.rotate === "function" ? [k.rotate(-18)] : []),
    ]);

    boat.add([
      k.rect(5, 26, { radius: 1 }),
      k.pos(74, -28),
      k.color(30, 64, 175),
      ...(typeof k.rotate === "function" ? [k.rotate(-18)] : []),
    ]);

    const cabin = boat.add([
      k.rect(34, 22, { radius: 3 }),
      k.pos(18, -30),
      k.color(210, 220, 235),
      k.outline(2, k.rgb(40, 55, 80)),
    ]) as BoatGameObject;

    cabin.add([
      k.rect(7, 7, { radius: 1 }),
      k.pos(5, 4),
      k.color(125, 211, 252),
      ...(typeof k.opacity === "function" ? [k.opacity(0.85)] : []),
    ]);
    cabin.add([
      k.rect(7, 7, { radius: 1 }),
      k.pos(15, 4),
      k.color(125, 211, 252),
      ...(typeof k.opacity === "function" ? [k.opacity(0.85)] : []),
    ]);

    boat.add([
      k.rect(3, 40),
      k.pos(33, -68),
      k.color(160, 175, 195),
      k.outline(1, k.rgb(50, 65, 85)),
    ]);

    const legacyFlag = boat.add([
      k.rect(14, 9, { radius: 1 }),
      k.pos(36, -68),
      k.color(34, 197, 94),
      ...(typeof k.rotate === "function" ? [k.rotate(0)] : []),
    ]) as BoatGameObject;

    boat.add([k.rect(5, 4), k.pos(40, -65.5), k.color(250, 204, 21)]);

    const legacyBeacon = cabin.add([
      k.circle(5),
      k.pos(17, -8),
      k.color(255, 0, 0),
    ]) as BoatGameObject;
    flag = legacyFlag;
    beacon = legacyBeacon;
  }

  let time = 0;
  let wakeTimer = 0;

  const updateRescueBoat = (dt: number) => {
    time += dt;
    wakeTimer += dt;

    // Alternância do sinalizador de socorro
    beacon.color =
      Math.floor(time * 6) % 2 === 0
        ? createBoatColorValue(k, 255, 50, 50)
        : createBoatColorValue(k, 56, 189, 248);

    // Oscilação dinâmica da bandeira ao vento
    flag.angle = Math.sin(time * 10) * 8;

    // Deslocamento até o ponto da baleia desmaiada
    const targetX = targetPos.x - 45;
    const isMoving = boat.pos.x < targetX;

    if (isMoving) {
      boat.pos.x += dt * 125;

      // Geração de esteira de espuma d'água (scia) na popa via ParticlePool (Fase 34.3)
      if (wakeTimer >= 0.07) {
        wakeTimer = 0;
        const pool = getParticlePool();
        if (pool) {
          pool.spawnCircle({
            pos: { x: boat.pos.x - 4, y: boat.pos.y - 6 },
            radius: getRandomFloat(2, 4.5),
            color: { r: 240, g: 248, b: 255 },
            opacity: 0.85,
            z: 48,
            fadeRate: 2.0,
            maxLife: 0.4,
          });
        } else if (resolvedNativeRenderEngine) {
          const wakeNode = createNativeCircleNode(
            k,
            resolvedNativeRenderEngine,
            resolveWorldRenderContainer(resolvedNativeRenderEngine),
            {
              identifier: "rescue_boat_wake_bubble",
              radius: getRandomFloat(2, 4.5),
              positionX: boat.pos.x - 4,
              positionY: boat.pos.y - 6,
              fillColor: [240, 248, 255],
              opacity: 0.85,
              zIndex: 48,
            }
          );
          let wakeLife = 0.4;
          wakeNode.onUpdate((wakeDeltaTime: number) => {
            wakeLife -= wakeDeltaTime;
            wakeNode.opacity = Math.max(0, (wakeLife / 0.4) * 0.85);
            if (wakeLife <= 0) {
              wakeNode.destroy();
            }
          });
        } else {
          k.add([
            k.circle(k.rand(2, 4.5)),
            k.pos(boat.pos.x - 4, boat.pos.y - 6),
            k.color(240, 248, 255),
            ...(typeof k.opacity === "function" ? [k.opacity(0.85)] : []),
            ...(typeof k.lifespan === "function" ? [k.lifespan(0.4, { fade: 0.2 })] : []),
            k.z(48),
          ]);
        }
      }
    } else {
      // Flutuação suave ancorada acima da baleia
      boat.pos.y = GAME_CONFIG.SEA_LEVEL + 8 + Math.sin(time * 2.8) * 2.2;
    }
  };

  const familyTicker = getEntityFamilyTicker();
  if (familyTicker) {
    familyTicker.registerEntity({
      id: `rescue_boat_${Math.round(targetPos.x)}`,
      family: "boat",
      getXPosition: () => boat.pos.x,
      width: 100,
      targetObject: boat,
      update: updateRescueBoat,
    });
  } else if (nativeBoatAdapter) {
    nativeBoatAdapter.onUpdate((deltaTimeInSeconds: number) =>
      updateRescueBoat(deltaTimeInSeconds)
    );
  } else {
    boat.onUpdate(() => updateRescueBoat(k.dt()));
  }

  return boat;
}

function createNativeFishingTrawlerVisuals<TColor = unknown>(
  k: BoatEngineContext<TColor>,
  resolvedNativeRenderEngine: IRenderEngine,
  positionX: number,
  baseWaterY: number
): NativeVisualObjectAdapter {
  const worldRenderContainer = resolveWorldRenderContainer(resolvedNativeRenderEngine);
  const trawler = createNativeRectNode(k, resolvedNativeRenderEngine, worldRenderContainer, {
    identifier: "fishing_trawler_hull",
    width: 60,
    height: 20,
    cornerRadius: 4,
    positionX,
    positionY: baseWaterY,
    fillColor: [52, 73, 94],
    outlineColor: [33, 47, 61],
    outlineWidth: 2,
    anchor: "botleft",
    zIndex: -2,
    tags: ["fishing_trawler", TAGS.OBSTACLE, "ship"],
  });
  const trawlerRenderNode = trawler.getRenderNode();

  // Faixa anti-incrustante e cabine
  createNativeRectNode(k, resolvedNativeRenderEngine, trawlerRenderNode, {
    identifier: "fishing_trawler_waterline",
    width: 60,
    height: 6,
    positionX: 0,
    positionY: -6,
    fillColor: [180, 50, 40],
  });
  createNativeRectNode(k, resolvedNativeRenderEngine, trawlerRenderNode, {
    identifier: "fishing_trawler_cabin",
    width: 20,
    height: 15,
    cornerRadius: 2,
    positionX: 8,
    positionY: -20,
    fillColor: [225, 230, 235],
    outlineColor: [40, 55, 70],
    outlineWidth: 1.5,
  });
  createNativeRectNode(k, resolvedNativeRenderEngine, trawlerRenderNode, {
    identifier: "fishing_trawler_window",
    width: 6,
    height: 6,
    cornerRadius: 1,
    positionX: 12,
    positionY: -17,
    fillColor: [120, 200, 240],
    opacity: 0.85,
  });

  // Mastro, lança do guincho, carretel, rede e boias
  createNativeRectNode(k, resolvedNativeRenderEngine, trawlerRenderNode, {
    identifier: "fishing_trawler_mast",
    width: 2.5,
    height: 28,
    positionX: 28,
    positionY: -48,
    fillColor: [130, 140, 150],
    outlineColor: [50, 60, 70],
    outlineWidth: 1,
  });
  createNativeRectNode(k, resolvedNativeRenderEngine, trawlerRenderNode, {
    identifier: "fishing_trawler_boom",
    width: 2,
    height: 22,
    positionX: 38,
    positionY: -32,
    rotationDegrees: 35,
    fillColor: [160, 120, 60],
  });
  createNativeCircleNode(k, resolvedNativeRenderEngine, trawlerRenderNode, {
    identifier: "fishing_trawler_winch",
    radius: 3.5,
    positionX: 48,
    positionY: -12,
    fillColor: [60, 60, 65],
    outlineColor: [180, 100, 30],
    outlineWidth: 1,
  });
  createNativeRectNode(k, resolvedNativeRenderEngine, trawlerRenderNode, {
    identifier: "fishing_trawler_deployed_net",
    width: 16,
    height: 26,
    cornerRadius: 2,
    positionX: 44,
    positionY: 4,
    rotationDegrees: 12,
    fillColor: [75, 125, 95],
    opacity: 0.65,
    outlineColor: [55, 80, 70],
    outlineWidth: 1.5,
    tags: ["trawler_deployed_net"],
  });
  createNativeCircleNode(k, resolvedNativeRenderEngine, trawlerRenderNode, {
    identifier: "fishing_trawler_float_1",
    radius: 2,
    positionX: 47,
    positionY: 6,
    fillColor: [245, 140, 40],
  });
  createNativeCircleNode(k, resolvedNativeRenderEngine, trawlerRenderNode, {
    identifier: "fishing_trawler_float_2",
    radius: 2,
    positionX: 56,
    positionY: 8,
    fillColor: [245, 140, 40],
  });
  createNativeCircleNode(k, resolvedNativeRenderEngine, trawlerRenderNode, {
    identifier: "fishing_trawler_float_3",
    radius: 2,
    positionX: 52,
    positionY: 18,
    fillColor: [245, 190, 40],
  });

  return trawler;
}

/**
 * Cria um barco de pesca artesanal / traineira estacionada no bioma da Costa Urbana (Fase 35.5).
 * Dimensão compacta de 60×20px, cabine de comando, mastro com guincho e rede visível
 * sendo lançada na popa, conferindo contexto narrativo à presença das redes fantasmas no setor.
 */
export function createFishingTrawler<TColor = unknown>(
  k: BoatEngineContext<TColor>,
  positionX: number
): BoatGameObject {
  const baseWaterY = GAME_CONFIG.SEA_LEVEL + 6;
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  let trawler: BoatGameObject;
  let nativeTrawlerAdapter: NativeVisualObjectAdapter | null = null;

  if (resolvedNativeRenderEngine) {
    nativeTrawlerAdapter = createNativeFishingTrawlerVisuals(
      k,
      resolvedNativeRenderEngine,
      positionX,
      baseWaterY
    );
    trawler = nativeTrawlerAdapter as unknown as BoatGameObject;
  } else {
    // Casco rústico de traineira pesqueira (caminho legado)
    trawler = k.add([
      k.rect(60, 20, { radius: 4 }),
      k.pos(positionX, baseWaterY),
      k.color(52, 73, 94),
      k.outline(2, k.rgb(33, 47, 61)),
      k.anchor("botleft"),
      k.z(-2),
      "fishing_trawler",
      TAGS.OBSTACLE,
      "ship",
    ]) as BoatGameObject;

    trawler.add([k.rect(60, 6), k.pos(0, -6), k.color(180, 50, 40)]);
    trawler.add([
      k.rect(20, 15, { radius: 2 }),
      k.pos(8, -20),
      k.color(225, 230, 235),
      k.outline(1.5, k.rgb(40, 55, 70)),
    ]);
    trawler.add([
      k.rect(6, 6, { radius: 1 }),
      k.pos(12, -17),
      k.color(120, 200, 240),
      k.opacity(0.85),
    ]);
    trawler.add([
      k.rect(2.5, 28),
      k.pos(28, -48),
      k.color(130, 140, 150),
      k.outline(1, k.rgb(50, 60, 70)),
    ]);
    trawler.add([
      k.rect(2, 22),
      k.pos(38, -32),
      k.color(160, 120, 60),
      ...(typeof k.rotate === "function" ? [k.rotate(35)] : []),
    ]);
    trawler.add([
      k.circle(3.5),
      k.pos(48, -12),
      k.color(60, 60, 65),
      k.outline(1, k.rgb(180, 100, 30)),
    ]);
    trawler.add([
      k.rect(16, 26, { radius: 2 }),
      k.pos(44, 4),
      k.color(75, 125, 95),
      k.opacity(0.65),
      k.outline(1.5, k.rgb(55, 80, 70)),
      ...(typeof k.rotate === "function" ? [k.rotate(12)] : []),
      "trawler_deployed_net",
    ]);
    trawler.add([k.circle(2), k.pos(47, 6), k.color(245, 140, 40)]);
    trawler.add([k.circle(2), k.pos(56, 8), k.color(245, 140, 40)]);
    trawler.add([k.circle(2), k.pos(52, 18), k.color(245, 190, 40)]);
  }

  let oscillationTime = getRandomFloat(0, Math.PI * 2);

  const updateFishingTrawler = (deltaTime: number) => {
    oscillationTime += deltaTime * 2.2;
    // Balanço marítimo suave na superfície
    trawler.pos.y = baseWaterY + Math.sin(oscillationTime) * 1.8;
  };

  const familyTicker = getEntityFamilyTicker();
  if (familyTicker) {
    familyTicker.registerEntity({
      id: `trawler_${Math.round(positionX)}`,
      family: "boat",
      getXPosition: () => trawler.pos.x,
      width: 65,
      targetObject: trawler,
      update: updateFishingTrawler,
    });
  } else if (nativeTrawlerAdapter) {
    nativeTrawlerAdapter.onUpdate((deltaTimeInSeconds: number) => {
      if (nativeTrawlerAdapter.hidden) return;
      updateFishingTrawler(deltaTimeInSeconds);
    });
  } else {
    trawler.onUpdate(() => {
      if (trawler.hidden) return;
      updateFishingTrawler(k.dt());
    });
  }

  return trawler;
}
