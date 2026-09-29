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
    // 1. Garrafa PET — corpo vertical com gargalo estreito e tampa calibrada
    trash = k.add([
      k.rect(11, 22, { radius: 3 }),
      k.pos(position),
      k.color(isHighContrast ? k.rgb(240, 60, 60) : k.rgb(80, 140, 200)),
      k.outline(
        isHighContrast ? 2.5 : 1.5,
        isHighContrast ? k.rgb(255, 240, 50) : k.rgb(40, 80, 140)
      ),
      k.area({ shape: new k.Rect(k.vec2(-5.5, -14), 11, 26) }),
      k.anchor("center"),
      k.opacity(baseOpacity),
      TAGS.TRASH,
      {
        reveal() {
          revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
        },
      },
    ]);
    // Gargalo e tampa estreita da garrafa (proporção autêntica)
    trash.add([
      k.rect(6, 4, { radius: 1 }),
      k.pos(0, -13),
      k.color(isHighContrast ? k.rgb(255, 240, 50) : k.rgb(55, 100, 165)),
      k.anchor("center"),
    ]);
    // Faixa de rótulo desbotado
    trash.add([
      k.rect(11, 6),
      k.pos(0, 1),
      k.color(isHighContrast ? k.rgb(255, 200, 50) : k.rgb(100, 160, 220)),
      k.opacity(0.7),
      k.anchor("center"),
    ]);
  } else if (trashType === 1) {
    // 2. Sacola plástica — corpo flutuante arredondado com alças superiores
    trash = k.add([
      k.rect(20, 17, { radius: 6 }),
      k.pos(position),
      k.color(isHighContrast ? k.rgb(240, 60, 60) : k.rgb(205, 225, 235)),
      k.outline(
        isHighContrast ? 2.5 : 1.5,
        isHighContrast ? k.rgb(255, 240, 50) : k.rgb(160, 190, 210)
      ),
      k.area({ shape: new k.Rect(k.vec2(-10, -10), 20, 19) }),
      k.anchor("center"),
      k.opacity(isHighContrast ? 0.55 : 0.32),
      TAGS.TRASH,
      {
        reveal() {
          revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
        },
      },
    ]);
    // Alças superiores da sacola plástica
    trash.add([
      k.rect(14, 4, { radius: 2 }),
      k.pos(0, -10),
      k.color(isHighContrast ? k.rgb(255, 240, 50) : k.rgb(180, 210, 225)),
      k.outline(1, isHighContrast ? k.rgb(240, 60, 60) : k.rgb(150, 180, 200)),
      k.anchor("center"),
    ]);
  } else {
    // 3. Copo/Embalagem amassada — geometria irregular com recorte plástico
    trash = k.add([
      k.circle(10),
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
    // Vinco de amassamento plástico
    trash.add([
      k.rect(8, 3, { radius: 1 }),
      k.pos(-1, -1),
      k.color(isHighContrast ? k.rgb(255, 255, 255) : k.rgb(180, 160, 40)),
      k.rotate(25),
      k.anchor("center"),
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
