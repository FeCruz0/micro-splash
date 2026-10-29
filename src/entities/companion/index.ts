import { COMPANION_CONFIG } from "../../config";
import { createDeterministicRandomGenerator } from "../../utils/random";
import type { PlayerController } from "../player/types";
import { createCompanionLocomotion } from "./companionLocomotion";
import { createCompanionSenses } from "./companionSenses";
import { createCompanionStates } from "./companionStates";
import type {
  CompanionCollidable,
  CompanionOptions,
  CompanionWhaleController,
  CompanionGameObject,
  CompanionVector2D,
} from "./types";
import type { CompanionEngineContext } from "./states/types";

export * from "./types";

/**
 * Cria a Baleia-Guia autônoma e ecológica (Mãe-Guia Antártica).
 * Arquitetura modular dividida em Sentidos/Radar, Locomoção Hidrodinâmica e Estados FSM.
 * Suporta semente determinística para corridas reproduzíveis e testes de regressão.
 */
export function createCompanionWhale<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
  TGameObj = CompanionGameObject,
>(
  k: CompanionEngineContext<TDestroyable, TColor, TVec>,
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

  // Dimensões do colisor proporcionais à escala
  const colliderWidth = COMPANION_CONFIG.COLLIDER_WIDTH;
  const colliderHeight = COMPANION_CONFIG.COLLIDER_HEIGHT;

  const companion = k.add([
    typeof k.sprite === "function" ? k.sprite("baleia", { anim: "idle_swim" }) : "baleia",
    k.pos(startX, startY),
    typeof k.rotate === "function" ? k.rotate(0) : 0,
    k.color(140, 165, 195), // Tom azul-ardósia escurecido para diferenciação visual nítida
    typeof k.anchor === "function" ? k.anchor("center") : "center",
    k.z(19),
    "companion_whale",
    ...(typeof k.scale === "function"
      ? [k.scale(COMPANION_CONFIG.SCALE, COMPANION_CONFIG.SCALE)]
      : []),
    ...(typeof k.area === "function"
      ? [
          typeof k.Rect === "function"
            ? k.area({
                shape: new k.Rect(
                  k.vec2(-colliderWidth / 2, -colliderHeight / 2),
                  colliderWidth,
                  colliderHeight
                ),
              })
            : k.area(),
        ]
      : []),
    ...(typeof k.body === "function" ? [k.body()] : []),
  ]) as unknown as CompanionGameObject;

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
  });

  const handleConsumeKrill = (krillObj: TGameObj): void => {
    companionStates.consumeKrill(krillObj);
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

  // Loop de atualização contínua
  if (typeof companion.onUpdate === "function") {
    companion.onUpdate(() => {
      if (companionStates.shouldStopUpdate()) return;

      const deltaTime = k.dt();
      const playerObj = playerController?.gameObj;
      const hasActivePlayer =
        playerObj && (typeof playerObj.exists !== "function" || playerObj.exists());

      const playerX = hasActivePlayer && playerObj.pos ? playerObj.pos.x : undefined;
      const playerSpeed =
        hasActivePlayer && playerController?.getSpeed ? playerController.getSpeed().x : undefined;

      // 1. Atualização Sensorial e Radar
      companionSenses.update(
        deltaTime,
        playerX,
        companionStates.getOxygen(),
        companionStates.getState()
      );

      // 2. Atualização de FSM e cálculo de mira angular
      const targetKrill = companionSenses.getTargetKrill();
      const targetHazard = companionSenses.getTargetHazard();
      const targetAngle = companionStates.update(
        deltaTime,
        playerX,
        targetKrill,
        targetHazard,
        () => {
          const speed = companionLocomotion.getSpeed();
          speed.y = 0;
          companionLocomotion.setSpeed(speed);
        }
      );

      // 3. Cinemática hidrodinâmica e giro vertical
      companionLocomotion.update(
        deltaTime,
        targetAngle,
        playerX,
        playerSpeed,
        companionStates.getState()
      );
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
