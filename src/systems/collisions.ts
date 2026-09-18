import type { KaboomCtx } from "kaboom";
import { TAGS, GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";
import type { PlayerController } from "../entities/player";
import type { GameState } from "./state";

export function setupCollisions(
  k: KaboomCtx,
  playerController: PlayerController,
  gameState: GameState
) {

  // colisão com lixo
  k.onCollide(TAGS.PLAYER, TAGS.TRASH, (_player, trash) => {
    // Destrói o lixo plástico colidido
    k.destroy(trash);

    // Se a baleia estiver protegida pelo Escudo de Bolhas, consome o escudo sem sofrer dano
    if (playerController.hasBubbleShield()) {
      playerController.popBubbleShield();
      audioSystem.playShieldPop();
      k.shake(1.5);
      return;
    }

    gameState.addTrash();

    // Som de impacto no plástico
    audioSystem.playTrashThud();

    // Aplica desaceleração instantânea (perde 50% da velocidade)
    const currentSpeed = playerController.getSpeed();
    playerController.setSpeed(currentSpeed.scale(GAME_CONFIG.TRASH_SLOWDOWN));

    // penalidade de oxigenio
    playerController.penalizeTrash();

    // Efeito visual rápido de impacto
    k.shake(3);
  });

  // colisão com power-ups ambientais temporários (Fase 12)
  k.onCollide(TAGS.PLAYER, TAGS.POWERUP, (_player, powerup: any) => {
    const type = powerup.powerupType;
    k.destroy(powerup);
    audioSystem.playPowerupCollect();

    switch (type) {
      case "bubble_shield":
        playerController.activateBubbleShield();
        break;
      case "tailwind":
        audioSystem.playSpeedBoost();
        playerController.applySpeedBoost(5.0, 1.5);
        break;
      case "air_pocket":
        playerController.restoreOxygen(playerController.getMaxOxygen() * 0.3);
        break;
      case "bioluminescence":
        playerController.activateBioluminescence(8.0);
        break;
    }
  });

  // colisão com krill (Fase 3: Progressão Nutricional)
  k.onCollide(TAGS.PLAYER, TAGS.KRILL, (_player, krill) => {
    k.destroy(krill);
    gameState.addKrill();

    // Som biológico de sucção e deglutição de krill (Fase 5)
    audioSystem.playKrillGulp();

    // Aplica impulso, restaura fôlego e evolui +1% em velocidade máx e oxigênio máx permanente
    playerController.consumeKrill();
  });

  // colisao com rede fantasma
  k.onCollide(TAGS.PLAYER, TAGS.NET, (_player, net) => {
    k.destroy(net); // remove rede do mapa
    audioSystem.playNetTangle();

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
    const vel = playerController.getSpeed();
    if (player.pos.y <= iceBlock.pos.y + 8 && vel.y >= 0) {
      if (iceBlock.breakIce) {
        iceBlock.breakIce();
      }
    }
  });
}
