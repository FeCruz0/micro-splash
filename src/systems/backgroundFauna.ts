import kaboom from "kaboom";
import { TAGS } from "../config";
import { audioSystem } from "./audioSystem";

/**
 * Cria elementos estéticos de fauna marinha de fundo com sprites e comportamentos enriquecidos:
 * - Pods familiares de Orcas na Antártida (0m - 5.000m)
 * - Jubartes Passantes com redes de bolhas e cantos (5.000m - 12.000m)
 * - Berçário acolhedor de Mãe e Filhote no Santuário (25.000m - 27.000m)
 * - Cachalote Abissal com cliques ultrassônicos do espermacete (8.000m - 10.800m)
 */
export function setupBackgroundFaunaSystem(k: ReturnType<typeof kaboom>) {
  // ===========================================================================
  // 1. PODS FAMILIARES DE ORCAS NA ANTÁRTIDA (0m - 5.000m)
  // Orcas vivem e caçam em formações matrilineares coordenadas
  // ===========================================================================
  const orcaPods = [
    // Pod 1: Matriarca líder + filhote acompanhante
    {
      members: [
        { offsetX: 0, offsetY: 0, scale: 1.0, isLeader: true },
        { offsetX: -55, offsetY: 18, scale: 0.54, isLeader: false },
      ],
      basePos: { x: 800, y: 340 },
    },
    // Pod 2: Par de caçadoras adultas em formação coordenada
    {
      members: [
        { offsetX: 0, offsetY: 0, scale: 1.0, isLeader: true },
        { offsetX: -60, offsetY: -16, scale: 0.92, isLeader: false },
      ],
      basePos: { x: 1800, y: 390 },
    },
    // Pod 3: Trio familiar (Matriarca, jovem e filhote)
    {
      members: [
        { offsetX: 0, offsetY: 0, scale: 1.0, isLeader: true },
        { offsetX: -50, offsetY: -18, scale: 0.74, isLeader: false },
        { offsetX: -95, offsetY: 14, scale: 0.52, isLeader: false },
      ],
      basePos: { x: 3200, y: 310 },
    },
    // Pod 4: Par de patrulha ártica
    {
      members: [
        { offsetX: 0, offsetY: 0, scale: 1.0, isLeader: true },
        { offsetX: -58, offsetY: 15, scale: 0.88, isLeader: false },
      ],
      basePos: { x: 4400, y: 410 },
    },
  ];

  orcaPods.forEach((pod) => {
    pod.members.forEach((m) => {
      const orca = k.add([
        k.sprite("orca_bg", { anim: "swim" }),
        k.pos(pod.basePos.x + m.offsetX, pod.basePos.y + m.offsetY),
        k.scale(m.scale),
        k.rotate(0),
        k.opacity(0.72),
        k.anchor("center"),
        k.z(-5),
      ]);

      let timer = Math.random() * 10;
      let bubbleTimer = Math.random() * 3;

      orca.onUpdate(() => {
        const dt = k.dt();
        timer += dt;
        bubbleTimer += dt;

        // Nado ondulatório ágil com arfagem (pitch) hidrodinâmica
        const wave = Math.sin(timer * 0.85);
        orca.pos.x = pod.basePos.x + m.offsetX + wave * 14;
        orca.pos.y = pod.basePos.y + m.offsetY + Math.cos(timer * 0.55) * 9;
        orca.angle = Math.cos(timer * 0.85) * 3.5;

        // Bolhas de mergulho / respiração polar subaquática
        if (bubbleTimer >= 3.8) {
          bubbleTimer = 0;
          const bubble = k.add([
            k.circle(1.5 * m.scale),
            k.pos(orca.pos.x + 22 * m.scale, orca.pos.y - 8 * m.scale),
            k.color(200, 235, 255),
            k.opacity(0.45),
            k.anchor("center"),
            k.z(-4),
          ]);
          bubble.onUpdate(() => {
            bubble.pos.y -= k.dt() * 24;
            bubble.pos.x += Math.sin(bubble.pos.y * 0.1) * 0.5;
            bubble.opacity -= k.dt() * 0.35;
            if (bubble.opacity <= 0) k.destroy(bubble);
          });
        }
      });
    });
  });

  // ===========================================================================
  // 2. JUBARTES PASSANTES EM MAR ABERTO (5.000m - 12.000m)
  // Comunicação acústica, anéis de ecolocalização e redes de bolhas (Bubble Net)
  // ===========================================================================
  const passingWhalePositions = [
    { x: 6200, y: 280 },
    { x: 8500, y: 360 },
    { x: 10800, y: 320 },
  ];

  passingWhalePositions.forEach((pos) => {
    const whaleBg = k.add([
      k.sprite("jubarte_bg", { anim: "swim" }),
      k.pos(pos.x, pos.y),
      k.rotate(0),
      k.opacity(0.75),
      k.anchor("center"),
      k.z(-4),
    ]);

    let pulseTimer = 0;
    let swimTimer = Math.random() * 10;

    whaleBg.onUpdate(() => {
      const dt = k.dt();
      pulseTimer += dt;
      swimTimer += dt;

      // Movimentação majestosa com arfagem (pitch) solene
      whaleBg.pos.x = pos.x + Math.sin(swimTimer * 0.4) * 16;
      whaleBg.pos.y = pos.y + Math.cos(swimTimer * 0.35) * 10;
      whaleBg.angle = Math.sin(swimTimer * 0.4) * 2.8;

      // A cada ~7.5 segundos, emite um pulso de sonar azul, canto e rede de bolhas
      if (pulseTimer >= 7.5) {
        pulseTimer = 0;

        // 1. Anel de sonar expansivo
        const ring = k.add([
          k.circle(16),
          k.pos(whaleBg.pos),
          k.color(0, 190, 255),
          k.opacity(0.52),
          k.anchor("center"),
          k.z(-3),
        ]);

        ring.onUpdate(() => {
          ring.radius += k.dt() * 145;
          ring.opacity -= k.dt() * 0.32;
          if (ring.opacity <= 0) {
            k.destroy(ring);
          }
        });

        // 2. Rede de bolhas (Bubble Net spiral) típica das jubartes
        for (let b = 0; b < 5; b++) {
          const bubbleAngle = (b / 5) * Math.PI * 2;
          const bubble = k.add([
            k.circle(2.2 + Math.random() * 1.5),
            k.pos(
              whaleBg.pos.x + Math.cos(bubbleAngle) * 28,
              whaleBg.pos.y + Math.sin(bubbleAngle) * 18
            ),
            k.color(180, 230, 255),
            k.opacity(0.6),
            k.anchor("center"),
            k.z(-3),
          ]);

          const upwardSpeed = 35 + Math.random() * 25;
          bubble.onUpdate(() => {
            bubble.pos.y -= k.dt() * upwardSpeed;
            bubble.pos.x += Math.sin(bubble.pos.y * 0.08) * 0.6;
            bubble.opacity -= k.dt() * 0.38;
            if (bubble.opacity <= 0) k.destroy(bubble);
          });
        }

        // 3. Canto da baleia distante se o jogador estiver em alcance auditivo (< 1500px)
        const player = k.get(TAGS.PLAYER)[0];
        if (player && player.pos.dist(whaleBg.pos) < 1500) {
          audioSystem.playWhaleSong(0.42, 0.88);
        }
      }
    });
  });

  // ===========================================================================
  // 3. BERÇÁRIO DE MÃE E FILHOTE NO SANTUÁRIO (25.000m - 27.000m)
  // Nado em escalão hidrodinâmico (Echelon swimming) e acolhimento afetuoso
  // ===========================================================================
  const motherWhale = k.add([
    k.sprite("jubarte_bg", { anim: "swim" }),
    k.pos(25800, 260),
    k.rotate(0),
    k.opacity(0.85),
    k.anchor("center"),
    k.z(-4),
  ]);

  const calfWhale = k.add([
    k.sprite("jubarte_bg", { anim: "swim" }),
    k.pos(25865, 235),
    k.scale(0.48),
    k.rotate(0),
    k.opacity(0.85),
    k.anchor("center"),
    k.z(-4),
  ]);

  let sanctuaryTimer = 0;
  let motherPulseTimer = 0;

  motherWhale.onUpdate(() => {
    sanctuaryTimer += k.dt();
    motherPulseTimer += k.dt();

    // Nado em escalão: a mãe gera uma esteira suave e o filhote a acompanha
    motherWhale.pos.y = 260 + Math.sin(sanctuaryTimer * 0.75) * 8;
    motherWhale.angle = Math.cos(sanctuaryTimer * 0.75) * 2.2;

    calfWhale.pos.y = motherWhale.pos.y - 25 + Math.sin(sanctuaryTimer * 1.1) * 5;
    calfWhale.pos.x = motherWhale.pos.x + 65 + Math.cos(sanctuaryTimer * 0.8) * 6;
    calfWhale.angle = Math.cos(sanctuaryTimer * 1.1) * 3.5;

    // Emissão de sonar acolhedor e canto do berçário se o jogador estiver próximo
    if (motherPulseTimer >= 8.5) {
      motherPulseTimer = 0;
      const player = k.get(TAGS.PLAYER)[0];
      if (player && player.pos.dist(motherWhale.pos) < 1800) {
        // Anel de sonar ciano-dourado acolhedor
        const ring = k.add([
          k.circle(20),
          k.pos(motherWhale.pos),
          k.color(100, 240, 255),
          k.opacity(0.6),
          k.anchor("center"),
          k.z(-3),
        ]);

        ring.onUpdate(() => {
          ring.radius += k.dt() * 125;
          ring.opacity -= k.dt() * 0.28;
          if (ring.opacity <= 0) k.destroy(ring);
        });

        // Bolhinhas lúdicas do filhote
        for (let cb = 0; cb < 4; cb++) {
          const cBubble = k.add([
            k.circle(1.8),
            k.pos(calfWhale.pos.x + (cb - 2) * 5, calfWhale.pos.y - 6),
            k.color(210, 248, 255),
            k.opacity(0.65),
            k.anchor("center"),
            k.z(-3),
          ]);
          cBubble.onUpdate(() => {
            cBubble.pos.y -= k.dt() * 32;
            cBubble.opacity -= k.dt() * 0.4;
            if (cBubble.opacity <= 0) k.destroy(cBubble);
          });
        }

        audioSystem.playWhaleSong(0.52, 0.95);
      }
    }
  });

  // ===========================================================================
  // 4. CACHALOTE ABISSAL NAS PROFUNDEZAS (8.000m - 10.800m - FASE 9.4)
  // Sprite autêntico de Physeter macrocephalus com cliques do órgão do espermacete
  // ===========================================================================
  const leviathan = k.add([
    k.sprite("cachalote_bg", { anim: "swim" }),
    k.pos(8800, 425),
    k.rotate(0),
    k.opacity(0.62),
    k.anchor("center"),
    k.z(-7), // Plano mais distante de fundo abissal
  ]);

  let levTimer = 0;
  let levCallTimer = 0;

  leviathan.onUpdate(() => {
    const dt = k.dt();
    levTimer += dt;
    levCallTimer += dt;

    // Nado lento e solene nas profundezas
    leviathan.pos.x += dt * 17;
    if (leviathan.pos.x > 10800) {
      leviathan.pos.x = 8000;
    }
    leviathan.pos.y = 425 + Math.sin(levTimer * 0.4) * 14;
    leviathan.angle = Math.sin(levTimer * 0.4) * 3.0; // arfagem de mergulho profundo

    // A cada ~11 segundos, emite um infrassom oceânico e feixe de cliques acústicos
    if (levCallTimer >= 11.5) {
      levCallTimer = 0;
      const player = k.get(TAGS.PLAYER)[0];
      if (player && player.pos.dist(leviathan.pos) < 1700) {
        audioSystem.playAbyssalWhaleCall();

        // 1. Onda esférica de baixa frequência
        const pulse = k.add([
          k.circle(30),
          k.pos(leviathan.pos),
          k.color(65, 185, 245),
          k.opacity(0.48),
          k.anchor("center"),
          k.z(-6),
        ]);
        pulse.onUpdate(() => {
          pulse.radius += k.dt() * 105;
          pulse.opacity -= k.dt() * 0.16;
          if (pulse.opacity <= 0) k.destroy(pulse);
        });

        // 2. Feixe de cliques direcionais do espermacete (projetados para a frente da cabeça quadrada)
        for (let c = 0; c < 3; c++) {
          k.wait(c * 0.12, () => {
            const clickRing = k.add([
              k.rect(4, 22, { radius: 2 }),
              k.pos(leviathan.pos.x + 85, leviathan.pos.y - 2),
              k.color(100, 220, 255),
              k.opacity(0.65),
              k.anchor("center"),
              k.z(-6),
            ]);
            clickRing.onUpdate(() => {
              clickRing.pos.x += k.dt() * 180;
              clickRing.height += k.dt() * 60;
              clickRing.opacity -= k.dt() * 0.7;
              if (clickRing.opacity <= 0) k.destroy(clickRing);
            });
          });
        }
      }
    }
  });
}
