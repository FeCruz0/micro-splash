import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { accessibilitySystem } from "../systems/accessibilitySystem";

export function createGhostNet(k: KaboomCtx, position: Vec2) {
  let revealTimer = 0;
  const isHighContrast = accessibilitySystem.isHighContrast();
  // Totalmente invisível a olho nu sem sonar (rede fantasma), mantendo acessibilidade em alto contraste
  const baseOpacity = isHighContrast ? 0.35 : 0.0;

  // Fundo semi-transparente da rede (corpo principal)
  const net = k.add([
    k.rect(38, 52, { radius: 2 }),
    k.pos(position),
    k.color(isHighContrast ? k.rgb(210, 100, 255) : k.rgb(80, 200, 120)),
    k.outline(
      isHighContrast ? 2.5 : 1.5,
      isHighContrast ? k.rgb(255, 255, 255) : k.rgb(60, 160, 90)
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

  // Grade visual: linhas verticais da rede
  const netW = 38;
  const netH = 52;
  const lineColor = isHighContrast ? k.rgb(210, 100, 255) : k.rgb(80, 200, 120);
  const gridLines: any[] = [];

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

  // Grade visual: linhas horizontais da rede
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
