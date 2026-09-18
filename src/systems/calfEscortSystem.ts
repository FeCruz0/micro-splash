import type { KaboomCtx } from "kaboom";
import type { PlayerController } from "../entities/player";
import type { GameState } from "./state";
import { createCalf, type CalfController } from "../entities/calf";
import { audioSystem } from "./audioSystem";
import { TAGS } from "../config";

export function setupCalfEscortSystem(
  k: KaboomCtx,
  playerController: PlayerController,
  gameState: GameState
) {
  let calfController: CalfController | null = null;
  let hasSpawnedCalf = false;
  let hasTriggeredMiniBreach = false;

  let hudBadge: any = null;
  let hudText: any = null;

  k.onUpdate(() => {
    const playerX = playerController.gameObj.pos.x;

    // 1. Ativação no Santuário Marinho de Arraial do Cabo (25.000m)
    if (!hasSpawnedCalf && playerX >= 25000) {
      hasSpawnedCalf = true;

      // Cria o filhote com callback para libertação via biosonar
      calfController = createCalf(k, playerController.gameObj, () => {
        gameState.addCalfRescue();
        audioSystem.playWhaleSong(0.7, 1.35);

        // Feedback flutuante de sucesso
        const cheer = k.add([
          k.text("💖 FILHOTE LIBERTADO! (+150 pts)", { size: 14, font: "sans-serif" }),
          k.pos(calfController!.gameObj.pos.add(k.vec2(0, -30))),
          k.color(100, 255, 230),
          k.outline(2, k.rgb(10, 40, 60)),
          k.opacity(1),
          k.anchor("center"),
          k.z(105),
        ]);
        cheer.onUpdate(() => {
          cheer.pos.y -= k.dt() * 35;
          cheer.opacity -= k.dt() * 0.7;
          if (cheer.opacity <= 0) k.destroy(cheer);
        });
      });

      gameState.triggerCalfEscort();
      audioSystem.playWhaleSong(0.8, 1.25); // Vocalização afetuosa mais aguda

      // Banner de notificação visual festivo
      const banner = k.add([
        k.rect(540, 48, { radius: 8 }),
        k.pos(k.width() / 2, 75),
        k.color(12, 38, 70),
        k.outline(2, k.rgb(100, 240, 255)),
        k.anchor("center"),
        k.fixed(),
        k.opacity(0),
        k.z(100),
      ]);

      const label = k.add([
        k.text("🐋 BERÇÁRIO DE ARRAIAL: Proteja seu filhote até a enseada (30.000m)!", {
          size: 13,
          font: "sans-serif",
        }),
        k.pos(k.width() / 2, 75),
        k.color(220, 250, 255),
        k.anchor("center"),
        k.fixed(),
        k.opacity(0),
        k.z(101),
      ]);

      let bannerTimer = 4.5;
      banner.onUpdate(() => {
        const dt = k.dt();
        bannerTimer -= dt;
        if (bannerTimer > 3.8) {
          banner.opacity = k.lerp(banner.opacity, 0.95, 0.15);
          label.opacity = k.lerp(label.opacity, 1.0, 0.15);
        } else if (bannerTimer <= 0.6) {
          banner.opacity = k.lerp(banner.opacity, 0, 0.12);
          label.opacity = k.lerp(label.opacity, 0, 0.12);
          if (bannerTimer <= 0) {
            k.destroy(banner);
            k.destroy(label);
          }
        }
      });

      // HUD de Proteção do Filhote (Badge no topo)
      hudBadge = k.add([
        k.rect(260, 28, { radius: 6 }),
        k.pos(k.width() / 2, 22),
        k.color(12, 35, 65),
        k.outline(1.5, k.rgb(80, 220, 255)),
        k.anchor("center"),
        k.fixed(),
        k.z(95),
      ]);

      hudText = k.add([
        k.text("🐋 Filhote: Seguro 🟢", { size: 12, font: "sans-serif" }),
        k.pos(k.width() / 2, 22),
        k.color(200, 245, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(96),
      ]);

      // Tratamento de colisão do filhote com Redes Fantasmas
      calfController.gameObj.onCollide(TAGS.NET, () => {
        if (!calfController!.isEntangled()) {
          calfController!.entangle();
          audioSystem.playWhaleSong(0.4, 1.8); // Grito de socorro
          gameState.setCalfSafetyScore(calfController!.getSafetyScore());
        }
      });

      // Tratamento de colisão com Lixo Plástico
      calfController.gameObj.onCollide(TAGS.TRASH, () => {
        calfController!.hitByDebris();
        audioSystem.playTrashThud();
        gameState.setCalfSafetyScore(calfController!.getSafetyScore());
      });

      // Tratamento de colisão com Obstáculos / Paredões
      calfController.gameObj.onCollide(TAGS.OBSTACLE, () => {
        calfController!.hitByDebris();
        audioSystem.playTrashThud();
        gameState.setCalfSafetyScore(calfController!.getSafetyScore());
      });
    }

    // 2. Atualização de estado da escolta e HUD
    if (calfController && hudBadge && hudText) {
      if (calfController.isEntangled()) {
        hudBadge.color = k.rgb(120, 30, 30);
        hudBadge.outline.color = k.rgb(255, 80, 80);
        hudText.text = "⚠️ FILHOTE PRESO! Use Sonar [E/Shift]! 📡";
        hudText.color = k.rgb(255, 220, 220);

        // Desvencilhamento por contato corporal da mãe
        const dist = playerController.gameObj.pos.dist(calfController.gameObj.pos);
        if (dist < 75) {
          calfController.untangle();
          gameState.addCalfRescue();
          audioSystem.playWhaleSong(0.7, 1.25);
        }
      } else if (playerX >= 29500) {
        hudBadge.color = k.rgb(20, 80, 70);
        hudBadge.outline.color = k.rgb(100, 255, 200);
        hudText.text = "🐋 Filhote Seguro na Enseada! ✨";
        hudText.color = k.rgb(200, 255, 230);
      } else {
        hudBadge.color = k.rgb(12, 35, 65);
        hudBadge.outline.color = k.rgb(80, 220, 255);
        hudText.text = `🐋 Filhote: Seguro 🟢 (${calfController.getSafetyScore()}%)`;
        hudText.color = k.rgb(200, 245, 255);
      }
    }

    // 3. Salto sincronizado durante o Salto Majestoso (Breach)
    if (
      calfController &&
      !hasTriggeredMiniBreach &&
      playerController.isBreaching()
    ) {
      hasTriggeredMiniBreach = true;
      k.wait(0.12, () => {
        calfController?.startMiniBreach();
      });
    }
  });
}

