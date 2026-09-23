import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { accessibilitySystem } from "../systems/accessibilitySystem";

export function createGhostNet(k: KaboomCtx, position: Vec2) {
  let revealTimer = 0;
  const isHighContrast = accessibilitySystem.isHighContrast();
  const baseOpacity = isHighContrast ? 0.55 : 0.25;

  const net = k.add([
    k.rect(38, 52, { radius: 4 }),
    k.pos(position),
    k.color(isHighContrast ? k.rgb(210, 100, 255) : k.rgb(180, 80, 220)), // violeta
    k.outline(
      isHighContrast ? 2.5 : 1.5,
      isHighContrast ? k.rgb(255, 255, 255) : k.rgb(220, 140, 255)
    ),
    k.opacity(baseOpacity), // Camuflada no leito marinho (reforçada em alto contraste)
    k.area(),
    k.anchor("center"),
    TAGS.NET,
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]);

  const baseY = position.y;

  let time = Math.random() * 10;
  net.onUpdate(() => {
    time += k.dt();
    net.pos.y = baseY + Math.sin(time * 1.8) * 5; // Balanço suave senoidal ancorado na posição inicial

    if (revealTimer > 0) {
      revealTimer -= k.dt();
      net.opacity = k.lerp(baseOpacity, 1, Math.min(1, revealTimer / 1.5));
    } else {
      net.opacity = baseOpacity;
    }
  });

  return net;
}