import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { accessibilitySystem } from "../systems/accessibilitySystem";

export interface BiomeNetPalette {
  mesh: [number, number, number];
  outline: [number, number, number];
  floats: [number, number, number];
}

/**
 * Retorna paleta de cores contextual para redes fantasmas conforme o bioma (Fase 31.4).
 */
export function getBiomeNetPalette(posX: number, isHighContrast = false): BiomeNetPalette {
  if (isHighContrast) {
    return {
      mesh: [210, 100, 255],
      outline: [255, 255, 255],
      floats: [255, 240, 50],
    };
  }

  if (posX < 5000) {
    // 1. Antártica: redes verde-cinza glacial polar
    return {
      mesh: [90, 145, 135],
      outline: [60, 110, 100],
      floats: [130, 175, 170],
    };
  }
  if (posX < 12000) {
    // 2. Travessia Pelágica: azul/ciano oceânico e boias alaranjadas
    return {
      mesh: [65, 170, 195],
      outline: [40, 120, 145],
      floats: [240, 110, 50],
    };
  }
  if (posX < 25000) {
    // 3. Costa Urbana e Cânions: malha oliva industrial e boias amarelo-alerta
    return {
      mesh: [75, 125, 95],
      outline: [55, 80, 70],
      floats: [245, 190, 40],
    };
  }
  // 4. Santuário de Arraial: turquesa vivo e boias coral
  return {
    mesh: [40, 210, 185],
    outline: [25, 150, 130],
    floats: [255, 120, 80],
  };
}

export function createGhostNet(k: KaboomCtx, position: Vec2) {
  let revealTimer = 0;
  const isHighContrast = accessibilitySystem.isHighContrast();
  // Totalmente invisível a olho nu sem sonar (rede fantasma), mantendo acessibilidade em alto contraste
  const baseOpacity = isHighContrast ? 0.35 : 0.0;
  const palette = getBiomeNetPalette(position.x, isHighContrast);

  // Fundo semi-transparente da rede (corpo principal)
  const net = k.add([
    k.rect(38, 52, { radius: 2 }),
    k.pos(position),
    k.color(palette.mesh[0], palette.mesh[1], palette.mesh[2]),
    k.outline(
      isHighContrast ? 2.5 : 1.5,
      k.rgb(palette.outline[0], palette.outline[1], palette.outline[2])
    ),
    k.opacity(baseOpacity),
    k.area(),
    k.anchor("center"),
    TAGS.NET,
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
        net.hidden = false;
      },
    },
  ]);

  net.hidden = !isHighContrast;

  // Grade visual: malha monofilamento autêntica (linhas verticais e horizontais, nós e boias)
  const netW = 38;
  const netH = 52;
  const lineColor = k.rgb(palette.mesh[0], palette.mesh[1], palette.mesh[2]);
  const floatColor = k.rgb(palette.floats[0], palette.floats[1], palette.floats[2]);
  const gridLines: any[] = [];

  // 1. Cabo superior de sustentação (floatline)
  const topCable = net.add([
    k.rect(netW + 4, 2),
    k.pos(0, -netH / 2),
    k.color(lineColor),
    k.opacity(baseOpacity),
    k.anchor("center"),
  ]);
  gridLines.push(topCable);

  // 2. Pequenas boias de flutuação no topo da rede fantasma
  for (let b = 0; b < 4; b++) {
    const floatObj = net.add([
      k.rect(6, 4, { radius: 2 }),
      k.pos(-netW / 2 + 5 + b * 9.5, -netH / 2 - 2),
      k.color(floatColor),
      k.opacity(baseOpacity),
      k.anchor("center"),
    ]);
    gridLines.push(floatObj);
  }

  // 3. Linhas verticais da malha
  for (let v = 1; v <= 3; v++) {
    const line = net.add([
      k.rect(1.2, netH),
      k.pos(-netW / 2 + v * (netW / 4), 0),
      k.color(lineColor),
      k.opacity(baseOpacity),
      k.anchor("center"),
    ]);
    gridLines.push(line);
  }

  // 4. Linhas horizontais da malha
  for (let h = 1; h <= 5; h++) {
    const line = net.add([
      k.rect(netW, 1.2),
      k.pos(0, -netH / 2 + h * (netH / 6)),
      k.color(lineColor),
      k.opacity(baseOpacity),
      k.anchor("center"),
    ]);
    gridLines.push(line);
  }

  // 5. Nós de cruzamento da malha monofilamento
  for (let v = 1; v <= 3; v++) {
    for (let h = 1; h <= 5; h++) {
      const knot = net.add([
        k.circle ? k.circle(0.9) : k.rect(1.8, 1.8),
        k.pos(-netW / 2 + v * (netW / 4), -netH / 2 + h * (netH / 6)),
        k.color(lineColor),
        k.opacity(baseOpacity),
        k.anchor("center"),
      ]);
      gridLines.push(knot);
    }
  }

  const baseY = position.y;

  let time = Math.random() * 10;
  net.onUpdate(() => {
    time += k.dt();
    net.pos.y = baseY + Math.sin(time * 1.8) * 5; // Balanço suave senoidal

    if (revealTimer > 0) {
      revealTimer -= k.dt();
      net.hidden = false;
      const currentOpacity = k.lerp(baseOpacity, 0.88, Math.min(1, revealTimer / 1.5));
      net.opacity = currentOpacity;
      for (const line of gridLines) {
        line.opacity = currentOpacity;
      }
    } else {
      net.hidden = !isHighContrast;
      net.opacity = baseOpacity;
      for (const line of gridLines) {
        line.opacity = baseOpacity;
      }
    }
  });

  return net;
}
