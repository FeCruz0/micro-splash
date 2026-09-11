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

    // penalidade de oxigenio
    playerController.penalizeTrash();

    // Efeito visual rápido de impacto
    k.shake(3);
  });

  // colisão com krill (Fase 3: Progressão Nutricional)
  k.onCollide(TAGS.PLAYER, TAGS.KRILL, (_player, krill) => {
    k.destroy(krill);
    gameState.addKrill();

    // Aplica impulso, restaura fôlego e evolui +1% em velocidade máx e oxigênio máx permanente
    playerController.consumeKrill();
  });

  // colisao com rede fantasma
  k.onCollide(TAGS.PLAYER, TAGS.NET, (_player, net) =>{
    if (!playerController.isTrapped()) {
      k.destroy(net); // remove rede
      playerController.trapInNet(GAME_CONFIG.NET_ESCAPE_COUNT); // prende a baleia
      k.shake(5);
    }
  });

}
