import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";

export function createTrash(k: KaboomCtx, position: Vec2) {
  let revealTimer = 0;

  const trash = k.add([
    k.rect(22, 22, { radius: 4 }),
    k.pos(position),
    k.color(220, 50, 50),
    k.outline(1.5, k.rgb(255, 120, 120)),
    k.area(),
    k.anchor("center"),
    k.opacity(0.25), // Camuflado nas águas escuras
    TAGS.TRASH,
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]);

  // Efeito de flutuação suave e decaimento de revelação
  let time = Math.random() * 10;
  trash.onUpdate(() => {
    time += k.dt();
    trash.pos.y += Math.sin(time * 3) * 0.3;

    if (revealTimer > 0) {
      revealTimer -= k.dt();
      trash.opacity = k.lerp(0.25, 1, Math.min(1, revealTimer / 1.5));
    } else {
      trash.opacity = 0.25;
    }
  });

  return trash;
}

