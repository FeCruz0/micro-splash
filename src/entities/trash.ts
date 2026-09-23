import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { accessibilitySystem } from "../systems/accessibilitySystem";

export function createTrash(k: KaboomCtx, position: Vec2) {
  let revealTimer = 0;
  const isHighContrast = accessibilitySystem.isHighContrast();
  const baseOpacity = isHighContrast ? 0.55 : 0.25;

  const trash = k.add([
    k.rect(22, 22, { radius: 4 }),
    k.pos(position),
    k.color(isHighContrast ? k.rgb(240, 60, 60) : k.rgb(220, 50, 50)),
    k.outline(
      isHighContrast ? 2.5 : 1.5,
      isHighContrast ? k.rgb(255, 240, 50) : k.rgb(255, 120, 120)
    ),
    k.area(),
    k.anchor("center"),
    k.opacity(baseOpacity), // Camuflado nas águas escuras (reforçado em alto contraste)
    TAGS.TRASH,
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]);

  const baseY = position.y;

  // Efeito de flutuação suave e decaimento de revelação
  let time = Math.random() * 10;
  trash.onUpdate(() => {
    time += k.dt();
    trash.pos.y = baseY + Math.sin(time * 2.2) * 5; // Flutuação senoidal suave ancorada sem deriva

    if (revealTimer > 0) {
      revealTimer -= k.dt();
      trash.opacity = k.lerp(baseOpacity, 1, Math.min(1, revealTimer / 1.5));
    } else {
      trash.opacity = baseOpacity;
    }
  });

  return trash;
}

