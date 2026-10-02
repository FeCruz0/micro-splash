import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { accessibilitySystem } from "../systems/accessibilitySystem";

export interface BiomeTrashPalette {
  body: [number, number, number];
  outline: [number, number, number];
  accent: [number, number, number];
  cap?: [number, number, number];
}

/**
 * Retorna paleta de cores contextual para resíduos plásticos conforme o bioma (Fase 31.4).
 */
export function getBiomeTrashPalette(posX: number, isHighContrast = false): BiomeTrashPalette {
  if (isHighContrast) {
    return {
      body: [240, 60, 60],
      outline: [255, 240, 50],
      accent: [255, 200, 50],
      cap: [255, 240, 50],
    };
  }

  if (posX < 5000) {
    // 1. Antártica: plástico desbotado acinzentado polar congelado
    return {
      body: [175, 195, 210],
      outline: [120, 140, 160],
      accent: [140, 170, 190],
      cap: [130, 155, 175],
    };
  }
  if (posX < 12000) {
    // 2. Travessia Pelágica: azul oceânico translúcido
    return {
      body: [80, 140, 200],
      outline: [40, 80, 140],
      accent: [100, 160, 220],
      cap: [55, 100, 165],
    };
  }
  if (posX < 25000) {
    // 3. Costa Urbana e Cânions: vermelho saturado e grafite industrial
    return {
      body: [215, 65, 60],
      outline: [80, 80, 85],
      accent: [235, 100, 70],
      cap: [60, 60, 65],
    };
  }
  // 4. Santuário de Arraial: laranja queimado de sol e tons quentes
  return {
    body: [235, 155, 90],
    outline: [180, 105, 55],
    accent: [245, 190, 130],
    cap: [210, 120, 60],
  };
}

export function createTrash(k: KaboomCtx, position: Vec2) {
  let revealTimer = 0;
  const isHighContrast = accessibilitySystem.isHighContrast();
  const baseOpacity = isHighContrast ? 0.55 : 0.25;
  const palette = getBiomeTrashPalette(position.x, isHighContrast);

  // 3 tipos procedurais de lixo plástico intercalados
  const trashType = Math.floor(Math.random() * 3);
  let trash: any;

  if (trashType === 0) {
    // 1. Garrafa PET — corpo vertical com gargalo estreito e tampa calibrada
    trash = k.add([
      k.rect(11, 22, { radius: 3 }),
      k.pos(position),
      k.color(palette.body[0], palette.body[1], palette.body[2]),
      k.outline(
        isHighContrast ? 2.5 : 1.5,
        k.rgb(palette.outline[0], palette.outline[1], palette.outline[2])
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
    const capColor = palette.cap || palette.outline;
    trash.add([
      k.rect(6, 4, { radius: 1 }),
      k.pos(0, -13),
      k.color(capColor[0], capColor[1], capColor[2]),
      k.anchor("center"),
    ]);
    // Faixa de rótulo desbotado
    trash.add([
      k.rect(11, 6),
      k.pos(0, 1),
      k.color(palette.accent[0], palette.accent[1], palette.accent[2]),
      k.opacity(0.7),
      k.anchor("center"),
    ]);
  } else if (trashType === 1) {
    // 2. Sacola plástica — corpo flutuante arredondado com alças superiores
    trash = k.add([
      k.rect(20, 17, { radius: 6 }),
      k.pos(position),
      k.color(palette.body[0], palette.body[1], palette.body[2]),
      k.outline(
        isHighContrast ? 2.5 : 1.5,
        k.rgb(palette.outline[0], palette.outline[1], palette.outline[2])
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
      k.color(palette.accent[0], palette.accent[1], palette.accent[2]),
      k.outline(1, k.rgb(palette.outline[0], palette.outline[1], palette.outline[2])),
      k.anchor("center"),
    ]);
  } else {
    // 3. Copo/Embalagem amassada — geometria irregular com recorte plástico
    trash = k.add([
      k.circle(10),
      k.pos(position),
      k.color(palette.body[0], palette.body[1], palette.body[2]),
      k.outline(
        isHighContrast ? 2.5 : 1.5,
        k.rgb(palette.outline[0], palette.outline[1], palette.outline[2])
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
      k.color(palette.accent[0], palette.accent[1], palette.accent[2]),
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
