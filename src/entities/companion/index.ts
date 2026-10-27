import type { GameObj, KaboomCtx } from "kaboom";
import { COMPANION_CONFIG } from "../../config";
import { createDeterministicRandomGenerator } from "../../utils/random";
import type { PlayerController } from "../player/types";
import { createCompanionLocomotion } from "./companionLocomotion";
import { createCompanionSenses } from "./companionSenses";
import { createCompanionStates } from "./companionStates";
import type { CompanionCollidable, CompanionOptions, CompanionWhaleController } from "./types";

export * from "./types";

/**
 * Cria a Baleia-Guia autônoma e ecológica (Mãe-Guia Antártica).
 * Arquitetura modular dividida em Sentidos/Radar, Locomoção Hidrodinâmica e Estados FSM.
 * Suporta semente determinística para corridas reproduzíveis e testes de regressão.
 */
export function createCompanionWhale(
  k: KaboomCtx,
  playerController: PlayerController,
  options: CompanionOptions = {}
): CompanionWhaleController {
  const startX = options.initialX ?? playerController.gameObj.pos.x + 140;
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
    k.sprite("baleia", { anim: "idle_swim" }),
    k.pos(startX, startY),
    k.rotate(0),
    k.color(140, 165, 195), // Tom azul-ardósia escurecido para diferenciação visual nítida
    k.anchor("center"),
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
  ]);

  // Submódulos da arquitetura modular
  const companionSenses = createCompanionSenses({
    k,
    companion,
    prng,
    spatialGrid: options.spatialGrid,
  });
  const companionLocomotion = createCompanionLocomotion({ k, companion, prng });
  const companionStates = createCompanionStates({ k, companion, options, prng });

  const handleConsumeKrill = (krillObj: GameObj): void => {
    companionStates.consumeKrill(krillObj);
    companionSenses.clearTargetKrill();
  };

  // Vinculação tipada com o contrato de colisão
  const collidableCompanion = companion as unknown as CompanionCollidable;
  collidableCompanion.consumeKrill = handleConsumeKrill;
  collidableCompanion.handleIceCollision = (iceBlock: GameObj) => {
    companionLocomotion.handleIceBlockCollision(iceBlock);
  };
  collidableCompanion.handleObstacleCollision = (obstacle: GameObj) => {
    companionLocomotion.handleObstacleBlockCollision(obstacle);
  };
  collidableCompanion.handleNetCollision = (net: GameObj) => {
    companionLocomotion.handleNetCollision(net);
    companionStates.forceState("TRAPPED");
  };

  // Loop de atualização contínua
  companion.onUpdate(() => {
    if (companionStates.shouldStopUpdate()) return;

    const deltaTime = k.dt();
    const playerObj = playerController.gameObj;
    if (!playerObj || (typeof playerObj.exists === "function" && !playerObj.exists())) {
      return;
    }

    const playerX = playerObj.pos.x;
    const playerSpeed = playerController.getSpeed
      ? playerController.getSpeed().x
      : COMPANION_CONFIG.BASE_SPEED;

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

  return {
    gameObj: companion,
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
