import type { KaboomCtx } from "kaboom";
import { TAGS, GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";
import { hapticsSystem } from "./hapticsSystem";
import type { PlayerController } from "../entities/player";
import type { GameState } from "./state";

export function setupCollisions(
  k: KaboomCtx,
  playerController: PlayerController,
  gameState: GameState
) {
  // colisão com lixo
  k.onCollide(TAGS.PLAYER, TAGS.TRASH, (_player, trash) => {
    if (playerController.isFrozen()) return;

    // Destrói o lixo plástico colidido
    k.destroy(trash);

    gameState.addTrash();

    // Som de impacto no plástico e vibração tátil
    audioSystem.playTrashThud();
    hapticsSystem.triggerCollision();

    // Aplica desaceleração instantânea (perde 50% da velocidade)
    const currentSpeed = playerController.getSpeed();
    playerController.setSpeed(currentSpeed.scale(GAME_CONFIG.TRASH_SLOWDOWN));

    // penalidade de oxigenio
    playerController.penalizeTrash();

    // Efeito visual rápido de impacto
    k.shake(3);
  });

  // Interação com Bolsão de Ar Natural (coluna de micro-bolhas de oxigênio)
  k.onCollide(TAGS.PLAYER, TAGS.AIR_POCKET, (_player, vent: any) => {
    if (playerController.isFrozen()) return;

    if (vent.collectAir && vent.collectAir()) {
      audioSystem.playPowerupCollect();
      playerController.restoreOxygen(playerController.getMaxOxygen() * 0.35);
      k.shake(1.5);
    }
  });

  // colisão com krill (Fase 3: Progressão Nutricional)
  k.onCollide(TAGS.PLAYER, TAGS.KRILL, (_player, krill) => {
    if (playerController.isFrozen()) return;

    k.destroy(krill);
    gameState.addKrill();

    // Som biológico de sucção e deglutição de krill (Fase 5)
    audioSystem.playKrillGulp();

    // Aplica impulso, restaura fôlego e evolui +1% em velocidade máx e oxigênio máx permanente
    playerController.consumeKrill();
  });

  // colisao com rede fantasma
  k.onCollide(TAGS.PLAYER, TAGS.NET, (_player, net) => {
    if (playerController.isFrozen()) return;

    k.destroy(net); // remove rede do mapa
    audioSystem.playNetTangle();
    hapticsSystem.triggerCollision();

    if (!playerController.isTrapped()) {
      playerController.trapInNet(GAME_CONFIG.NET_ESCAPE_COUNT); // prende a baleia
      k.shake(5);
    } else {
      // Se já estiver presa e afundar em outra rede, emaranha mais
      playerController.addTrapCount(3);
      k.shake(4);
    }
  });

  // Colisão com blocos de gelo: quebra apenas quando atingido por cima ao cair do salto
  k.onCollide(TAGS.PLAYER, "ice_block", (player, iceBlock: any) => {
    if (playerController.isFrozen()) return;

    const vel = playerController.getSpeed();
    if (player.pos.y <= iceBlock.pos.y + 8 && vel.y >= 0) {
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
      k.shake(2.0);
    }
  });
}
