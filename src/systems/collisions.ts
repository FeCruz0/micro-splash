import type { KaboomCtx } from "kaboom";
import { TAGS, GAME_CONFIG } from "../config";

export function setupCollisions(k: KaboomCtx, playerController: any) {
  k.onCollide(TAGS.PLAYER, TAGS.TRASH, (_player, trash) => {
    // Destrói o lixo plástico colidido
    k.destroy(trash);

    // Aplica desaceleração instantânea (perde 50% da velocidade)
    const currentSpeed = playerController.getSpeed();
    playerController.setSpeed(currentSpeed.scale(GAME_CONFIG.TRASH_SLOWDOWN));

    // Efeito visual rápido de impacto
    k.shake(3);
  });
}
