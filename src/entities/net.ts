import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";

export function createGhostNet(k: KaboomCtx, position: Vec2) {
  let revealTimer = 0;

  const net = k.add([
    k.rect(38, 52, { radius: 4 }),
    k.pos(position),
    k.color(180, 80, 220), // violeta
    k.outline(1.5, k.rgb(220, 140, 255)),
    k.opacity(0.25), // Camuflada no leito marinho
    k.area(),
    k.anchor("center"),
    TAGS.NET,
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
      },
    },
  ]);

  let time = Math.random() * 5;
  net.onUpdate(() => {
    time += k.dt();
    net.pos.y += Math.sin(time * 2) * 0.2; // balanço na correnteza

    if (revealTimer > 0) {
      revealTimer -= k.dt();
      net.opacity = k.lerp(0.25, 1, Math.min(1, revealTimer / 1.5));
    } else {
      net.opacity = 0.25;
    }
  });

  return net;
}