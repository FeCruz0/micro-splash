import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { accessibilitySystem } from "../systems/accessibilitySystem";

export function createTrash(k: KaboomCtx, position: Vec2) {
  let revealTimer = 0;
  const isHighContrast = accessibilitySystem.isHighContrast();
  const baseOpacity = isHighContrast ? 0.55 : 0.25;

  // 3 tipos procedurais de lixo plástico intercalados
  const trashType = Math.floor(Math.random() * 3);
  let trash: any;

  if (trashType === 0) {
    // Garrafa PET — silhueta vertical azul translúcida
    trash = k.add([
      k.rect(9, 20, { radius: 3 }),
      k.pos(position),
      k.color(isHighContrast ? k.rgb(240, 60, 60) : k.rgb(80, 140, 200)),
      k.outline(
        isHighContrast ? 2.5 : 1.5,
        isHighContrast ? k.rgb(255, 240, 50) : k.rgb(40, 80, 140)
      ),
      k.area({ shape: new k.Rect(k.vec2(-11, -11), 22, 22) }),
      k.anchor("center"),
      k.opacity(baseOpacity),
      TAGS.TRASH,
      {
        reveal() {
          revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
        },
      },
    ]);
    // Tampa da garrafa
    trash.add([
      k.rect(13, 5, { radius: 1 }),
      k.pos(0, -13),
      k.color(isHighContrast ? k.rgb(240, 60, 60) : k.rgb(55, 95, 160)),
      k.anchor("center"),
    ]);
  } else if (trashType === 1) {
    // Sacola plástica — forma arredondada branco-translúcida
    trash = k.add([
      k.rect(18, 16, { radius: 8 }),
      k.pos(position),
      k.color(isHighContrast ? k.rgb(240, 60, 60) : k.rgb(200, 220, 230)),
      k.outline(
        isHighContrast ? 2.5 : 1.5,
        isHighContrast ? k.rgb(255, 240, 50) : k.rgb(160, 190, 210)
      ),
      k.area({ shape: new k.Rect(k.vec2(-11, -11), 22, 22) }),
      k.anchor("center"),
      k.opacity(isHighContrast ? 0.55 : 0.3),
      TAGS.TRASH,
      {
        reveal() {
          revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
        },
      },
    ]);
  } else {
    // Embalagem amassada — forma circular amarelo desbotado
    trash = k.add([
      k.circle(11),
      k.pos(position),
      k.color(isHighContrast ? k.rgb(240, 60, 60) : k.rgb(220, 200, 60)),
      k.outline(
        isHighContrast ? 2.5 : 1.5,
        isHighContrast ? k.rgb(255, 240, 50) : k.rgb(170, 150, 20)
      ),
      k.area(),
      k.anchor("center"),
      k.opacity(baseOpacity),
      TAGS.TRASH,
      {
        reveal() {
          revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
        },
      },
    ]);
  }

  const baseY = position.y;

  // Flutuação suave e decaimento de revelação
  let time = Math.random() * 10;
  trash.onUpdate(() => {
    time += k.dt();
    trash.pos.y = baseY + Math.sin(time * 2.2) * 5;

    if (revealTimer > 0) {
      revealTimer -= k.dt();
      trash.opacity = k.lerp(baseOpacity, 1, Math.min(1, revealTimer / 1.5));
    } else {
      trash.opacity = baseOpacity;
    }
  });

  return trash;
}
