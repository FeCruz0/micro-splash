import kaboom, { type GameObj } from "kaboom";
import { GAME_CONFIG } from "../config";

/**
 * Calcula a largura volumétrica do feixe solar (Fase 30.4: 8px a 18px).
 */
export function calculateGodRayWidth(rayIndex: number): number {
  return 8 + (rayIndex % 4) * 3.2;
}

/**
 * Sistema de Iluminação Subaquática: God Rays (Feixes Volumétricos) & Cáusticos de Superfície
 * Traz atmosfera cinematográfica e sensação de profundidade através da luz solar filtrada na água.
 */
export function setupLightRaysSystem(k: ReturnType<typeof kaboom>) {
  const rayCount = 15;
  const godRays: GameObj[] = [];

  // Criação dos feixes volumétricos de luz solar calibrados (8px a 18px de largura, opacidade suave 0.05)
  for (let i = 0; i < rayCount; i++) {
    const baseWidth = calculateGodRayWidth(i); // 8–18px — perceptíveis sem parecerem tiras sólidas
    const baseAngle = -18 + i * 2.6; // Ângulos graduais

    const ray = k.add([
      k.rect(baseWidth, 420),
      k.pos(0, GAME_CONFIG.SEA_LEVEL),
      k.rotate(baseAngle),
      k.color(210, 245, 255),
      k.opacity(0.05), // Opacidade base calibrada entre 0.04 e 0.06
      k.anchor("top"),
      k.z(-2), // Atrás da baleia, krill e lixo, mas sobre o fundo
      "god_ray",
      {
        baseXOffset: -60 + i * (k.width() / (rayCount - 1) + 10),
        pulseSpeed: 0.6 + (i % 5) * 0.2,
        pulsePhase: i * 0.85,
        angleOffset: baseAngle,
      },
    ]);

    godRays.push(ray);
  }

  // Cáusticos de Superfície: finos feixes ondulatórios de refração da luz solar sob o nível do mar
  const causticSegments = 10;
  const caustics: GameObj[] = [];

  for (let c = 0; c < causticSegments; c++) {
    const caustic = k.add([
      k.rect(k.width() / causticSegments + 10, 4, { radius: 2 }),
      k.pos(c * (k.width() / causticSegments), GAME_CONFIG.SEA_LEVEL + 2),
      k.color(240, 255, 255),
      k.opacity(0.12),
      k.z(1),
      "caustic_surface",
      {
        index: c,
      },
    ]);
    caustics.push(caustic);
  }

  let time = 0;

  k.onUpdate(() => {
    time += k.dt();
    const camX = k.camPos().x;
    const screenLeft = camX - k.width() / 2;

    // Fator de intensidade de luz solar baseado no bioma:
    // 0m - 5.000m (Antártica): Luz muito fria e tênue filtrada pelo teto de gelo
    // 5.000m - 12.000m (Atlântico Sul): Luz intermediária pura
    // 12.000m - 19.000m (Costa Urbana): Luz abafada/esverdeada pela turbidez
    // 19.000m - 30.000m (Arraial do Cabo): Luz dourada/turquesa radiante
    let biomeLightFactor = 0.05;
    let rayColor = k.rgb(190, 230, 255);

    if (camX < 5000) {
      biomeLightFactor = 0.035;
      rayColor = k.rgb(160, 210, 255); // Azul polar
    } else if (camX < 12000) {
      biomeLightFactor = 0.055;
      rayColor = k.rgb(180, 230, 255);
    } else if (camX < 19000) {
      biomeLightFactor = 0.045;
      rayColor = k.rgb(180, 220, 210); // Leve tom urbano
    } else {
      biomeLightFactor = 0.075;
      rayColor = k.rgb(255, 250, 210); // Dourado solar cintilante
    }

    // Atualiza raios de sol volumétricos
    godRays.forEach((ray) => {
      // Segue a câmera com oscilação orgânica horizontal e de ângulo
      const sway = Math.sin(time * ray.pulseSpeed + ray.pulsePhase);
      const angleSway = Math.cos(time * 0.6 + ray.pulsePhase) * 4;

      ray.pos.x = screenLeft + ray.baseXOffset + sway * 25;
      ray.angle = ray.angleOffset + angleSway;
      ray.color = rayColor;

      // Pulsação suave de intensidade calibrada (0.03 a 0.08)
      const pulseOpacity = (0.8 + sway * 0.2) * biomeLightFactor;
      ray.opacity = Math.max(0.02, Math.min(0.08, pulseOpacity));
    });

    // Atualiza cáusticos de refração na superfície
    caustics.forEach((c) => {
      const offsetC = c.index * (k.width() / causticSegments);
      c.pos.x = screenLeft + offsetC;
      c.pos.y = GAME_CONFIG.SEA_LEVEL + 4 + Math.sin(time * 2.5 + c.index * 1.2) * 5;
      c.opacity = (0.12 + Math.sin(time * 3.0 + c.index * 0.8) * 0.08) * (biomeLightFactor * 4.5);
      c.color = rayColor;
    });
  });
}
