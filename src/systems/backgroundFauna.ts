import kaboom from "kaboom";
import { TAGS } from "../config";
import { audioSystem } from "./audioSystem";

/**
 * Cria elementos estéticos de fauna marinha de fundo (Orcas, Jubartes Passantes e Berçário)
 */
export function setupBackgroundFaunaSystem(k: ReturnType<typeof kaboom>) {
  // 1. Silhuetas de Orcas na Antártida (0m - 5.000m)
  const orcaPositions = [
    { x: 800, y: 350 },
    { x: 1800, y: 400 },
    { x: 3200, y: 300 },
    { x: 4400, y: 420 },
  ];

  orcaPositions.forEach((pos) => {
    const orca = k.add([
      k.rect(70, 25, { radius: 10 }),
      k.pos(pos.x, pos.y),
      k.color(15, 30, 50),
      k.opacity(0.4),
      k.anchor("center"),
      k.z(-5),
    ]);

    let timer = Math.random() * 10;
    orca.onUpdate(() => {
      timer += k.dt();
      orca.pos.x = pos.x + Math.sin(timer * 0.8) * 12;
      orca.pos.y = pos.y + Math.cos(timer * 0.5) * 8;
    });
  });

  // 2. Jubartes Passantes em Mar Aberto (5.000m - 12.000m)
  const passingWhalePositions = [
    { x: 6200, y: 280 },
    { x: 8500, y: 360 },
    { x: 10800, y: 320 },
  ];

  passingWhalePositions.forEach((pos) => {
    const whaleBg = k.add([
      k.rect(110, 40, { radius: 15 }),
      k.pos(pos.x, pos.y),
      k.color(25, 55, 90),
      k.opacity(0.45),
      k.anchor("center"),
      k.z(-4),
    ]);

    let pulseTimer = 0;
    whaleBg.onUpdate(() => {
      pulseTimer += k.dt();

      // A cada ~7 segundos, emite um pulso de sonar azul e canto se o jogador estiver por perto
      if (pulseTimer >= 7.5) {
        pulseTimer = 0;
        const ring = k.add([
          k.circle(15),
          k.pos(whaleBg.pos),
          k.color(0, 180, 255),
          k.opacity(0.5),
          k.anchor("center"),
          k.z(-3),
        ]);

        ring.onUpdate(() => {
          ring.radius += k.dt() * 140;
          ring.opacity -= k.dt() * 0.35;
          if (ring.opacity <= 0) {
            k.destroy(ring);
          }
        });

        // Se o jogador estiver em alcance auditivo (< 1500px), a baleia de fundo emite um canto distante
        const player = k.get(TAGS.PLAYER)[0];
        if (player && player.pos.dist(whaleBg.pos) < 1500) {
          audioSystem.playWhaleSong(0.42, 0.88);
        }
      }
    });
  });

  // 3. Berçário de Mãe e Filhote no Santuário (25.000m - 27.000m)
  const motherWhale = k.add([
    k.rect(130, 45, { radius: 16 }),
    k.pos(25800, 260),
    k.color(40, 100, 160),
    k.opacity(0.6),
    k.anchor("center"),
    k.z(-4),
  ]);

  const calfWhale = k.add([
    k.rect(55, 20, { radius: 8 }),
    k.pos(25870, 240),
    k.color(50, 120, 180),
    k.opacity(0.6),
    k.anchor("center"),
    k.z(-4),
  ]);

  let sanctuaryTimer = 0;
  let motherPulseTimer = 0;
  motherWhale.onUpdate(() => {
    sanctuaryTimer += k.dt();
    motherPulseTimer += k.dt();
    motherWhale.pos.y = 260 + Math.sin(sanctuaryTimer * 0.8) * 8;
    calfWhale.pos.y = 240 + Math.sin(sanctuaryTimer * 1.2) * 6;

    // Emissão de sonar acolhedor e canto do berçário se o jogador estiver próximo
    if (motherPulseTimer >= 9.0) {
      motherPulseTimer = 0;
      const player = k.get(TAGS.PLAYER)[0];
      if (player && player.pos.dist(motherWhale.pos) < 1800) {
        const ring = k.add([
          k.circle(18),
          k.pos(motherWhale.pos),
          k.color(80, 220, 255),
          k.opacity(0.55),
          k.anchor("center"),
          k.z(-3),
        ]);

        ring.onUpdate(() => {
          ring.radius += k.dt() * 120;
          ring.opacity -= k.dt() * 0.3;
          if (ring.opacity <= 0) k.destroy(ring);
        });

        audioSystem.playWhaleSong(0.50, 0.95);
      }
    }
  });
}
