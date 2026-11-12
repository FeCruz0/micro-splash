import { COMPANION_CONFIG } from "../../config";
import { createDeterministicRandomGenerator } from "../../utils/random";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import { createNativeSpriteNode } from "../../engine/adapters/NativeRenderNodeFactory";
import type { PlayerController } from "../player/types";
import { createCompanionLocomotion } from "./companionLocomotion";
import { createCompanionSenses } from "./companionSenses";
import { createCompanionStates } from "./companionStates";
import { createCompanionVector2D } from "./companionMathHelpers";
import type {
  CompanionCollidable,
  CompanionOptions,
  CompanionWhaleController,
  CompanionGameObject,
  CompanionVector2D,
} from "./types";
import type { CompanionEngineContext } from "./states/types";

export * from "./types";

const activeCompanionWhaleObjects = new Set<CompanionGameObject>();

export function getActiveCompanionWhaleObjects(): CompanionGameObject[] {
  const activeCompanions: CompanionGameObject[] = [];
  for (const companionObject of activeCompanionWhaleObjects) {
    if (!companionObject.exists || companionObject.exists()) {
      activeCompanions.push(companionObject);
    } else {
      activeCompanionWhaleObjects.delete(companionObject);
    }
  }
  return activeCompanions;
}

/**
 * Cria a Baleia-Guia autônoma e ecológica (Mãe-Guia Antártica).
 * Arquitetura modular dividida em Sentidos/Radar, Locomoção Hidrodinâmica e Estados FSM.
 * Suporta semente determinística para corridas reproduzíveis e testes de regressão.
 */
export function createCompanionWhale(
  renderEngine: IRenderEngine,
  playerController?: PlayerController | null,
  options?: CompanionOptions<CompanionGameObject>
): CompanionWhaleController<CompanionGameObject, CompanionVector2D>;
export function createCompanionWhale<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
  TGameObj = CompanionGameObject,
>(
  k: CompanionEngineContext<TDestroyable, TColor, TVec>,
  playerController?: PlayerController | null,
  options?: CompanionOptions<TGameObj>
): CompanionWhaleController<TGameObj, TVec>;
export function createCompanionWhale<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
  TGameObj = CompanionGameObject,
>(
  k: IRenderEngine | CompanionEngineContext<TDestroyable, TColor, TVec>,
  playerController?: PlayerController | null,
  options: CompanionOptions<TGameObj> = {}
): CompanionWhaleController<TGameObj, TVec> {
  const startX =
    options.initialX ??
    (playerController?.gameObj?.pos ? playerController.gameObj.pos.x + 140 : 100);
  const startY = options.initialY ?? 200;

  // Gerador determinístico Mulberry32
  const prng =
    options.prng ??
    (options.seed !== undefined
      ? createDeterministicRandomGenerator(options.seed)
      : createDeterministicRandomGenerator(42));

  const colliderWidth = COMPANION_CONFIG.COLLIDER_WIDTH;
  const colliderHeight = COMPANION_CONFIG.COLLIDER_HEIGHT;

  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const legacyContext = k as CompanionEngineContext<TDestroyable, TColor, TVec>;
  let companion: CompanionGameObject;
  let registerNativeUpdate: ((callback: (deltaTimeInSeconds: number) => void) => void) | null =
    null;

  if (resolvedNativeRenderEngine) {
    const worldRenderContainer = resolveWorldRenderContainer(resolvedNativeRenderEngine);
    const nativeCompanionAdapter = createNativeSpriteNode(
      k,
      resolvedNativeRenderEngine,
      worldRenderContainer,
      {
        identifier: "companion_whale",
        assetAlias: "baleia",
        animationName: "idle_swim",
        positionX: startX,
        positionY: startY,
        tintColor: [140, 165, 195],
        anchor: "center",
        scaleX: COMPANION_CONFIG.SCALE,
        scaleY: COMPANION_CONFIG.SCALE,
        zIndex: 19,
        tags: ["companion_whale"],
      }
    );
    companion = nativeCompanionAdapter as unknown as CompanionGameObject;
    registerNativeUpdate = (callback) => nativeCompanionAdapter.onUpdate(callback);
  } else if (typeof legacyContext.add === "function") {
    companion = legacyContext.add([
      typeof legacyContext.sprite === "function"
        ? legacyContext.sprite("baleia", { anim: "idle_swim" })
        : "baleia",
      typeof legacyContext.pos === "function"
        ? legacyContext.pos(startX, startY)
        : { x: startX, y: startY },
      typeof legacyContext.rotate === "function" ? legacyContext.rotate(0) : 0,
      typeof legacyContext.color === "function"
        ? legacyContext.color(140, 165, 195)
        : [140, 165, 195],
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : "center",
      typeof legacyContext.z === "function" ? legacyContext.z(19) : 19,
      "companion_whale",
      ...(typeof legacyContext.scale === "function"
        ? [legacyContext.scale(COMPANION_CONFIG.SCALE, COMPANION_CONFIG.SCALE)]
        : []),
      ...(typeof legacyContext.area === "function"
        ? [
            typeof legacyContext.Rect === "function"
              ? legacyContext.area({
                  shape: new legacyContext.Rect(
                    createCompanionVector2D<TVec>(k, -colliderWidth / 2, -colliderHeight / 2),
                    colliderWidth,
                    colliderHeight
                  ),
                })
              : legacyContext.area(),
          ]
        : []),
    ]) as unknown as CompanionGameObject;
  } else {
    companion = {
      pos: createCompanionVector2D(k, startX, startY),
      angle: 0,
      comps: [],
      _triggerUpdate: () => {},
      exists: () => true,
      is: (tag: string) => tag === "companion_whale",
    };
  }

  activeCompanionWhaleObjects.add(companion);

  // Submódulos da arquitetura modular
  const companionSenses = createCompanionSenses<TDestroyable, TColor, TVec, TGameObj>({
    k,
    companion,
    prng,
    spatialGrid: options.spatialGrid,
    autonomyMode: options.autonomyMode,
    isCoMigration: options.isCoMigration,
  });
  const companionLocomotion = createCompanionLocomotion<TDestroyable, TColor, TVec>({
    k,
    companion,
    prng,
    autonomyMode: options.autonomyMode,
    isCoMigration: options.isCoMigration,
  });
  const companionStates = createCompanionStates<TDestroyable, TColor, TVec, TGameObj>({
    k,
    companion,
    options,
    prng,
    onDestroy: () => {
      activeCompanionWhaleObjects.delete(companion);
    },
  });

  const handleConsumeKrill = (krillObject: TGameObj): void => {
    companionStates.consumeKrill(krillObject);
    companionSenses.clearTargetKrill();
  };

  // Vinculação tipada com o contrato de colisão
  const collidableCompanion = companion as unknown as CompanionCollidable<TGameObj>;
  collidableCompanion.consumeKrill = handleConsumeKrill;
  collidableCompanion.handleIceCollision = (iceBlock: TGameObj) => {
    companionLocomotion.handleIceBlockCollision(iceBlock as unknown as CompanionGameObject);
  };
  collidableCompanion.handleObstacleCollision = (obstacle: TGameObj) => {
    companionLocomotion.handleObstacleBlockCollision(obstacle as unknown as CompanionGameObject);
  };
  collidableCompanion.handleNetCollision = (net: TGameObj) => {
    companionLocomotion.handleNetCollision(net as unknown as CompanionGameObject);
    companionStates.forceState("TRAPPED");
  };

  const stepCompanionFrame = (deltaTimeInSeconds: number): void => {
    if (companionStates.shouldStopUpdate()) return;

    const playerObject = playerController?.gameObj;
    const hasActivePlayer =
      playerObject && (typeof playerObject.exists !== "function" || playerObject.exists());

    const playerX = hasActivePlayer && playerObject.pos ? playerObject.pos.x : undefined;
    const playerSpeed =
      hasActivePlayer && playerController?.getSpeed ? playerController.getSpeed().x : undefined;

    companionSenses.update(
      deltaTimeInSeconds,
      playerX,
      companionStates.getOxygen(),
      companionStates.getState()
    );

    const targetKrill = companionSenses.getTargetKrill();
    const targetHazard = companionSenses.getTargetHazard();
    const targetAngle = companionStates.update(
      deltaTimeInSeconds,
      playerX,
      targetKrill,
      targetHazard,
      () => {
        const currentSpeed = companionLocomotion.getSpeed();
        currentSpeed.y = 0;
        companionLocomotion.setSpeed(currentSpeed);
      }
    );

    companionLocomotion.update(
      deltaTimeInSeconds,
      targetAngle,
      playerX,
      playerSpeed,
      companionStates.getState()
    );
  };

  if (registerNativeUpdate) {
    registerNativeUpdate(stepCompanionFrame);
  } else if (typeof companion.onUpdate === "function") {
    companion.onUpdate(() => {
      const deltaTimeInSeconds =
        typeof legacyContext.dt === "function" ? legacyContext.dt() : 0.016;
      stepCompanionFrame(deltaTimeInSeconds);
    });
  }

  return {
    gameObj: companion as unknown as TGameObj,
    getState: companionStates.getState,
    forceState: companionStates.forceState,
    getOxygen: companionStates.getOxygen,
    getMaxOxygen: companionStates.getMaxOxygen,
    restoreOxygen: companionStates.restoreOxygen,
    getKrillsEaten: companionStates.getKrillsEaten,
    consumeKrill: handleConsumeKrill,
    triggerSonar: companionSenses.triggerSonar,
    getSpeed: companionLocomotion.getSpeed,
    isDeparted: companionStates.isDeparted,
    isFainted: companionStates.isFainted,
    destroy: companionStates.destroy,
  };
}
