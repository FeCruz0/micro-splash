import type { KaboomCtx, Vec2 } from "kaboom";
import { TAGS } from "../config";

export function createTrash(k: KaboomCtx, position: Vec2) {
  const trash = k.add([
    k.rect(20, 20),
    k.pos(position),
    k.color(220, 50, 50), // Quadrado vermelho representando lixo plástico por enquanto
    k.area(),
    k.anchor("center"),
    k.opacity(0),
    TAGS.TRASH,
  ]);

  // Efeito de flutuação suave no lixo
  let time = 0;
  k.onUpdate(() => {
    time += k.dt();
    trash.pos.y += Math.sin(time * 3) * 0.3;

    // fade-out
    if (trash.opacity > 0) {
      trash.opacity = Math.max(0, trash.opacity - k.dt() * 0.25);
    }
  });

  return trash;
}
