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

  // 4. Silhueta Abissal de Cachalote nas Profundezas (8.000m - 10.800m - Fase 9.4)
  const leviathan = k.add([
    k.rect(250, 62, { radius: 22 }),
    k.pos(8800, 425),
    k.color(16, 32, 54), // Azul abissal escuro
    k.opacity(0.42),
    k.anchor("center"),
    k.z(-7), // Plano mais distante de fundo
  ]);

  // Cabeça quadrada maciça característica do Cachalote
  leviathan.add([
    k.rect(85, 56, { radius: 16 }),
    k.pos(90, -2),
    k.color(18, 36, 60),
    k.anchor("center"),
  ]);

  // Mandíbula inferior delgada
  leviathan.add([
    k.rect(60, 10, { radius: 3 }),
    k.pos(95, 24),
    k.color(14, 28, 48),
    k.anchor("center"),
  ]);

  // Olho com brilho marinho suave nas profundezas
  leviathan.add([
    k.circle(3),
    k.pos(55, -4),
    k.color(80, 210, 255),
    k.opacity(0.6),
  ]);

  // Flukes caudais colossais
  const leviathanFlukes = leviathan.add([
    k.polygon([k.vec2(0, 0), k.vec2(-35, -28), k.vec2(-28, 0), k.vec2(-35, 28)]),
    k.pos(-125, 0),
    k.color(14, 28, 48),
    k.rotate(0),
  ]);

  let levTimer = 0;
  let levCallTimer = 0;

  leviathan.onUpdate(() => {
    levTimer += k.dt();
    levCallTimer += k.dt();

    // Nado lento e solene
    leviathan.pos.x += k.dt() * 16;
    if (leviathan.pos.x > 10800) {
      leviathan.pos.x = 8000;
    }
    leviathan.pos.y = 425 + Math.sin(levTimer * 0.45) * 12;

    // Ondulação suave da cauda
    leviathanFlukes.angle = Math.sin(levTimer * 1.2) * 10;

    // A cada ~12 segundos, emite um infrassom oceânico profundo se o jogador estiver por perto
    if (levCallTimer >= 12.0) {
      levCallTimer = 0;
      const player = k.get(TAGS.PLAYER)[0];
      if (player && player.pos.dist(leviathan.pos) < 1600) {
        audioSystem.playAbyssalWhaleCall();

        // Onda de choque acústica de baixa frequência
        const pulse = k.add([
          k.circle(25),
          k.pos(leviathan.pos),
          k.color(60, 180, 240),
          k.opacity(0.45),
          k.anchor("center"),
          k.z(-6),
        ]);
        pulse.onUpdate(() => {
          pulse.radius += k.dt() * 95;
          pulse.opacity -= k.dt() * 0.15;
          if (pulse.opacity <= 0) k.destroy(pulse);
        });
      }
    }
  });
}
