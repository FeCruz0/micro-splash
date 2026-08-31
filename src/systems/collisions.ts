import type { KaboomCtx } from "kaboom";
import { TAGS, GAME_CONFIG } from "../config";

export function setupCollisions(k: KaboomCtx, playerController: any, gameState: any) {

  // colisão com lixo
  k.onCollide(TAGS.PLAYER, TAGS.TRASH, (_player, trash) => {
    // Destrói o lixo plástico colidido
    k.destroy(trash);
    gameState.addTrash();

    // Aplica desaceleração instantânea (perde 50% da velocidade)
    const currentSpeed = playerController.getSpeed();
    playerController.setSpeed(currentSpeed.scale(GAME_CONFIG.TRASH_SLOWDOWN));

    // Efeito visual rápido de impacto
    k.shake(3);
  });

  // colisão com krill
  k.onCollide(TAGS.PLAYER, TAGS.KRILL, (_player, krill) => {
    k.destroy(krill);
    gameState.addKrill();

    const currentSpeed = playerController.getSpeed();
    playerController.setSpeed(currentSpeed.scale(GAME_CONFIG.KRILL_BOOST));
  });

}
