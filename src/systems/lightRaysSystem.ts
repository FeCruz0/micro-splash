import kaboom, { type GameObj } from "kaboom";
import { GAME_CONFIG } from "../config";

/**
 * Sistema de Iluminação Subaquática: God Rays (Feixes Volumétricos) & Cáusticos de Superfície
 * Traz atmosfera cinematográfica e sensação de profundidade através da luz solar filtrada na água.
 */
export function setupLightRaysSystem(k: ReturnType<typeof kaboom>) {
  const rayCount = 15;
  const godRays: GameObj[] = [];

  // Criação dos feixes ultrafinos e cristalinos de luz solar (1.5px a 3.5px de largura)
  for (let i = 0; i < rayCount; i++) {
    const baseWidth = 1.5 + (i % 3) * 1.0;
    const baseAngle = -18 + i * 2.6; // Ângulos graduais

    const ray = k.add([
      k.rect(baseWidth, 420),
      k.pos(0, GAME_CONFIG.SEA_LEVEL),
      k.rotate(baseAngle),
      k.color(210, 245, 255),
      k.opacity(0.08),
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
      k.opacity(0.14),
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
    // 0m - 5.000m (Antártica): Luz muito fria e sutil (0.04 - 0.08) filtrada pelo gelo
    // 5.000m - 12.000m (Atlântico Sul): Luz intermediária (0.08 - 0.12)
    // 12.000m - 19.000m (Costa Urbana): Luz abafada/esverdeada pela turbidez (0.06 - 0.10)
    // 19.000m - 27.000m (Arraial do Cabo): Luz dourada/turquesa cristalina radiante (0.16 - 0.28)
    let biomeLightFactor = 0.08;
    let rayColor = k.rgb(190, 230, 255);

    if (camX < 5000) {
      biomeLightFactor = 0.05;
      rayColor = k.rgb(160, 210, 255); // Azul polar
    } else if (camX < 12000) {
      biomeLightFactor = 0.1;
      rayColor = k.rgb(180, 230, 255);
    } else if (camX < 19000) {
      biomeLightFactor = 0.07;
      rayColor = k.rgb(180, 220, 210); // Leve tom urbano
    } else {
      // Ressurgência e Santuário de Arraial: águas caribenhas límpidas e raios dourados
      biomeLightFactor = 0.22;
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

      // Pulsação suave de intensidade
      const pulseOpacity = (0.7 + sway * 0.3) * biomeLightFactor;
      ray.opacity = Math.max(0.02, Math.min(0.35, pulseOpacity));
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
