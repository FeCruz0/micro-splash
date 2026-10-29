import { TAGS, GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";
import { hapticsSystem } from "./hapticsSystem";
import { accessibilitySystem } from "./accessibilitySystem";
import type { PlayerController } from "../entities/player";
import type { GameState } from "./state";
import { getSereneInsightsManager } from "./sereneMigrationInsights";
import { isCompanionCollidable } from "../entities/companion/types";

export interface CollisionVector2D {
  x: number;
  y: number;
}

export interface CollisionGameObject {
  pos?: { x?: number; y?: number };
}

export interface AirVentEntity extends CollisionGameObject {
  collectAir?: () => boolean;
}

export interface IceBlockEntity extends CollisionGameObject {
  pos: { y: number; x?: number };
  breakIce?: () => void;
}

export interface CompanionCollisionGameObject extends CollisionGameObject {
  consumeKrill?: (krill: unknown) => void;
  handleIceCollision?: (iceBlock: unknown) => void;
  handleObstacleCollision?: (obstacle: unknown) => void;
  handleNetCollision?: (net: unknown) => void;
}

export interface CollisionsEngineContext<TDestroyable = unknown> {
  onCollide: (tag1: string, tag2: string, cb: (obj1: unknown, obj2: unknown) => void) => unknown;
  destroy: (obj: TDestroyable) => void;
  time: () => number;
  shake?: (amount: number) => void;
}

export function setupCollisions<TDestroyable = unknown>(
  k: CollisionsEngineContext<TDestroyable>,
  playerController: PlayerController,
  gameState: GameState
) {
  // colisão com lixo
  k.onCollide(TAGS.PLAYER, TAGS.TRASH, (playerObj, trashObj) => {
    if (playerController.isFrozen()) return;

    const trash = trashObj as CollisionGameObject;
    const player = playerObj as CollisionGameObject;

    // Destrói o lixo plástico colidido
    k.destroy(trashObj as unknown as TDestroyable);

    gameState.addTrash();
    getSereneInsightsManager()?.trigger("ocean_trash_threat");

    // Som de impacto no plástico e vibração tátil
    audioSystem.playTrashThud(trash.pos?.x, player.pos?.x);
    hapticsSystem.triggerCollision();

    // Aplica desaceleração instantânea (perde 50% da velocidade)
    const currentSpeed = playerController.getSpeed();
    playerController.setSpeed(currentSpeed.scale(GAME_CONFIG.TRASH_SLOWDOWN));

    // penalidade de oxigenio
    playerController.penalizeTrash();

    // Efeito visual rápido de impacto
    accessibilitySystem.triggerShake(k, 3);
  });

  // Interação com Bolsão de Ar Natural (coluna de micro-bolhas de oxigênio)
  k.onCollide(TAGS.PLAYER, TAGS.AIR_POCKET, (playerObj, ventObj) => {
    if (playerController.isFrozen()) return;

    const vent = ventObj as AirVentEntity;
    const player = playerObj as CollisionGameObject;

    if (vent.collectAir && vent.collectAir()) {
      audioSystem.playPowerupCollect(vent.pos?.x, player.pos?.x);
      playerController.restoreOxygen(playerController.getMaxOxygen() * 0.35);
      accessibilitySystem.triggerShake(k, 1.5);
    }
  });

  // colisão com krill (Fase 3: Progressão Nutricional)
  k.onCollide(TAGS.PLAYER, TAGS.KRILL, (playerObj, krillObj) => {
    if (playerController.isFrozen()) return;

    const krill = krillObj as CollisionGameObject;
    const player = playerObj as CollisionGameObject;

    k.destroy(krillObj as unknown as TDestroyable);
    gameState.addKrill();
    getSereneInsightsManager()?.trigger("krill_feeding");

    // Som biológico de sucção e deglutição de krill com espacialização estéreo (Fase 5/34)
    audioSystem.playKrillGulp(krill.pos?.x, player.pos?.x);

    // Aplica impulso, restaura fôlego e evolui +1% em velocidade máx e oxigênio máx permanente
    playerController.consumeKrill();
  });

  // colisao com rede fantasma
  k.onCollide(TAGS.PLAYER, TAGS.NET, (playerObj, netObj) => {
    if (playerController.isFrozen()) return;

    const net = netObj as CollisionGameObject;
    const player = playerObj as CollisionGameObject;

    k.destroy(netObj as unknown as TDestroyable); // remove rede do mapa
    getSereneInsightsManager()?.trigger("ghost_net_entanglement");
    audioSystem.playNetTangle(net.pos?.x, player.pos?.x);
    hapticsSystem.triggerCollision();

    if (!playerController.isTrapped()) {
      playerController.trapInNet(GAME_CONFIG.NET_ESCAPE_COUNT); // prende a baleia
      accessibilitySystem.triggerShake(k, 5);
    } else {
      // Se já estiver presa e afundar em outra rede, emaranha mais
      playerController.addTrapCount(3);
      accessibilitySystem.triggerShake(k, 4);
    }
  });

  // Colisão com blocos de gelo: quebra apenas quando atingido por cima ao cair do salto
  k.onCollide(TAGS.PLAYER, "ice_block", (playerObj, iceBlockObj) => {
    if (playerController.isFrozen()) return;

    const player = playerObj as CollisionGameObject;
    const iceBlock = iceBlockObj as IceBlockEntity;

    const vel = playerController.getSpeed();
    if (
      player.pos &&
      player.pos.y !== undefined &&
      player.pos.y <= iceBlock.pos.y + 8 &&
      vel.y >= 0
    ) {
      if (iceBlock.breakIce) {
        hapticsSystem.triggerIceBreach();
        iceBlock.breakIce();
      }
    }
  });

  // Colisão com formações rochosas (Ilha do Farol e Fundo Rochoso do Boqueirão)
  let lastObstacleBumpTime = 0;
  k.onCollide(TAGS.PLAYER, TAGS.OBSTACLE, () => {
    if (playerController.isFrozen()) return;

    const now = k.time();
    if (now - lastObstacleBumpTime > 0.35) {
      lastObstacleBumpTime = now;
      audioSystem.playTrashThud(); // Impacto sólido e surdo contra a rocha
      accessibilitySystem.triggerShake(k, 2.0);
    }
  });

  // =========================================================================
  // COLISÕES DA BALEIA-GUIA NPC (Fase 56: Ecologia e Mecânicas Espelho)
  // =========================================================================

  // Alimentação por filtração autônoma: consome krill real do mapa
  k.onCollide("companion_whale", TAGS.KRILL, (companionObj, krillObj) => {
    const companion = companionObj as CompanionCollisionGameObject;
    const krill = krillObj as CollisionGameObject;

    if (isCompanionCollidable(companion) && typeof companion.consumeKrill === "function") {
      companion.consumeKrill(krillObj);
    } else {
      k.destroy(krillObj as unknown as TDestroyable);
      audioSystem.playKrillGulp(krill.pos?.x, companion.pos?.x);
    }
  });

  // Reação a blocos de gelo: impede travessia sólida da banquisa polar por baixo
  k.onCollide("companion_whale", "ice_block", (companionObj, iceBlockObj) => {
    const companion = companionObj as CompanionCollisionGameObject;
    if (isCompanionCollidable(companion) && typeof companion.handleIceCollision === "function") {
      companion.handleIceCollision(iceBlockObj);
    }
  });

  // Reação a obstáculos rochosos
  k.onCollide("companion_whale", TAGS.OBSTACLE, (companionObj, obstacleObj) => {
    const companion = companionObj as CompanionCollisionGameObject;
    if (
      isCompanionCollidable(companion) &&
      typeof companion.handleObstacleCollision === "function"
    ) {
      companion.handleObstacleCollision(obstacleObj);
    }
  });

  // Reação a redes fantasmas (Fase 60)
  k.onCollide("companion_whale", TAGS.NET, (companionObj, netObj) => {
    const companion = companionObj as CompanionCollisionGameObject;
    if (isCompanionCollidable(companion) && typeof companion.handleNetCollision === "function") {
      companion.handleNetCollision(netObj);
    }
  });
}
