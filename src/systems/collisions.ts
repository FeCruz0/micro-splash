import type { KaboomCtx } from "kaboom";
import { TAGS, GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";

export function setupCollisions(k: KaboomCtx, playerController: any, gameState: any) {

  // colisão com lixo
  k.onCollide(TAGS.PLAYER, TAGS.TRASH, (_player, trash) => {
    // Destrói o lixo plástico colidido
    k.destroy(trash);
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
