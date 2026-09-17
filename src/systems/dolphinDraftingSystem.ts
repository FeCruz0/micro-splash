import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";

/**
 * Sistema de Cardumes Residentes de Golfinhos-Rotadores em Loop Contínuo (Fase 9.3)
 * Cardumes distribuídos pela Travessia Oceânica:
 *   - Cardume 1 (Entrada da Travessia & Recifes): 5.400m a 6.500m (Loop de 1.100m)
 *   - Cardume 2 (Alto Mar / Bacia Central): 7.600m a 8.800m (Loop de 1.200m)
 *   - Cardume 3 (Fossas Pelágicas / Pré-Cânion): 10.000m a 11.200m (Loop de 1.200m)
 * 
 * Cada cardume já está no mapa e executa um circuito pré-programado permanente:
 * navega até o ponto de retorno, salta fora d'água no meio da rota, realiza mergulho de U-turn 180°
 * e volta para a origem, repetindo o loop indefinidamente sem sumir do cenário.
 */
export function setupDolphinDraftingSystem(k: KaboomCtx, playerController: any) {
  const POD_ROUTES = [
    {
      name: "Cardume dos Recifes",
      minX: 5400,
      maxX: 6500,
      initialX: 5650,
      initialDir: 1,
      baseSpeed: 130,
      depth: 85,
    },
    {
      name: "Cardume do Alto Mar",
      minX: 7600,
      maxX: 8800,
      initialX: 7850,
      initialDir: 1,
      baseSpeed: 135,
      depth: 90,
    },
    {
      name: "Cardume das Fossas Pelágicas",
      minX: 10000,
      maxX: 11200,
      initialX: 10250,
      initialDir: 1,
      baseSpeed: 140,
      depth: 95,
    },
  ];

  const podDraftingStatus = [false, false, false];

  POD_ROUTES.forEach((route, podIndex) => {
    const dolphins: any[] = [];
    const offsets = [
      { x: 0, y: 0 },
      { x: -55, y: -20 },
      { x: -65, y: 22 },
      { x: -115, y: 4 },
    ];

    offsets.forEach((off, i) => {
      // Corpo fusiforme do golfinho
      const dolphin = k.add([
        k.rect(46, 15, { radius: 6 }),
        k.pos(route.initialX + off.x, GAME_CONFIG.SEA_LEVEL + route.depth + off.y),
        k.color(68, 108, 148),
        k.anchor("center"),
        k.scale(k.vec2(route.initialDir, 1)),
        k.z(11),
        "dolphin",
      ]);

      // Ventre claro
      dolphin.add([
        k.rect(34, 5, { radius: 2 }),
        k.pos(-2, 4),
        k.color(225, 238, 248),
        k.anchor("center"),
      ]);

      // Bico / Rostro
      dolphin.add([
        k.rect(9, 4, { radius: 2 }),
        k.pos(25, 1),
        k.color(68, 108, 148),
        k.anchor("center"),
      ]);

      // Nadadeira dorsal curvada
      dolphin.add([
        k.polygon([k.vec2(0, 0), k.vec2(-8, -10), k.vec2(-14, 0)]),
        k.pos(2, -7),
        k.color(52, 88, 124),
      ]);

      // Nadadeira peitoral
      dolphin.add([
        k.polygon([k.vec2(0, 0), k.vec2(-6, 8), k.vec2(-10, 2)]),
        k.pos(8, 5),
        k.color(52, 88, 124),
      ]);

      // Cauda / Flukes
      const tail = dolphin.add([
        k.polygon([k.vec2(0, 0), k.vec2(-7, -7), k.vec2(-7, 7)]),
        k.pos(-23, 0),
        k.color(52, 88, 124),
      ]);

      dolphins.push({ obj: dolphin, tail, offset: off, index: i });
    });

    let podX = route.initialX;
    let dir = route.initialDir;
    let turnState: "cruise" | "turn" = "cruise";
    let turnTimer = 0;
    let turnFromDir = route.initialDir;
    let targetDir = -route.initialDir;
    const turnDuration = 2.0;
    const turnRadius = 50;

    // Salto no ponto médio do percurso
    const midpoint = (route.minX + route.maxX) / 2;
    let leapTriggeredThisLeg = false;
    let isLeaping = false;
    let leapTime = 0;
    const leapDuration = 1.35;
    let clickSoundTimer = 0;

    k.onUpdate(() => {
      const dt = k.dt();
      const player = playerController.gameObj;

      // 1. Simulação do Loop Pré-Programado
      if (turnState === "cruise") {
        podX += dir * route.baseSpeed * dt;

        // Gatilho de salto acrobático exatamente no ponto médio da rota (longe das viradas)
        if (!isLeaping && !leapTriggeredThisLeg) {
          const reachedMidpoint = dir === 1 ? podX >= midpoint : podX <= midpoint;
          if (reachedMidpoint) {
            isLeaping = true;
            leapTime = 0;
            leapTriggeredThisLeg = true;
          }
        }

        // Checagem determinística das bordas da rota de ida e volta
        if (dir === 1 && podX >= route.maxX) {
          podX = route.maxX;
          turnState = "turn";
          turnTimer = 0;
          turnFromDir = 1;
          targetDir = -1;
          isLeaping = false;
        } else if (dir === -1 && podX <= route.minX) {
          podX = route.minX;
          turnState = "turn";
          turnTimer = 0;
          turnFromDir = -1;
          targetDir = 1;
          isLeaping = false;
        }
      } else {
        // Manobra de Virada em U Suave
        turnTimer += dt;
        const p = Math.min(1.0, turnTimer / turnDuration);

        // Deslocamento determinístico durante a curva (arco para o interior do setor)
        const turnProgressOffset = turnRadius * ((1 - Math.cos(p * Math.PI)) / 2);
        if (turnFromDir === 1) {
          podX = route.maxX - turnProgressOffset;
        } else {
          podX = route.minX + turnProgressOffset;
        }

        if (p >= 1.0) {
          turnState = "cruise";
          dir = targetDir;
          turnTimer = 0;
          leapTriggeredThisLeg = false;
          podX = turnFromDir === 1 ? route.maxX - turnRadius : route.minX + turnRadius;
        }
      }

      // 2. Interpolação Matemática da Formação e Perspectiva
      const p = turnState === "turn" ? Math.min(1.0, turnTimer / turnDuration) : 0;
      const turnYOffset = turnState === "turn" ? Math.sin(p * Math.PI) * 45 : 0;
      
      // Fator de formação contínuo: interpola de turnFromDir a targetDir via cosseno
      const formationFactor = turnState === "turn" 
        ? turnFromDir * Math.cos(p * Math.PI) 
        : dir;

      // Escala horizontal em perspectiva 3D
      const currentFacing = turnState === "turn" ? (p < 0.5 ? turnFromDir : targetDir) : dir;
      const scaleSquash = turnState === "turn" ? Math.max(0.18, Math.abs(Math.cos(p * Math.PI))) : 1.0;
      const effectiveScaleX = currentFacing * scaleSquash;

      // Inclinação suave do corpo na curva
      const turnPitchAngle = turnState === "turn" 
        ? currentFacing * Math.sin(p * Math.PI * 2) * 16 
        : 0;

      let leapYOffset = 0;
      let leapPitch = 0;

      if (isLeaping) {
        leapTime += dt;
        const leapProgress = leapTime / leapDuration;

        if (leapProgress <= 1.0) {
          leapYOffset = -Math.sin(leapProgress * Math.PI) * 110;
          leapPitch = leapProgress < 0.5 ? -24 : 26;

          // Respingo na água visível se o jogador estiver por perto
          if (player && Math.abs(podX - player.pos.x) < 800) {
            if (leapProgress < 0.12 || leapProgress > 0.88) {
              if (Math.random() < 0.3) {
                const splash = k.add([
                  k.circle(1.8),
                  k.pos(podX + (Math.random() - 0.5) * 40, GAME_CONFIG.SEA_LEVEL + 3),
                  k.color(210, 240, 255),
                  k.opacity(0.85),
                  k.z(14),
                ]);
                splash.onUpdate(() => {
                  splash.pos.y -= dt * 25;
                  splash.opacity -= dt * 3.5;
                  if (splash.opacity <= 0) k.destroy(splash);
                });
              }
            }
          }
        } else {
          isLeaping = false;
          leapTime = 0;
        }
      }

      // 3. Atualização Contínua de Posição de Cada Golfinho
      const time = k.time();

      dolphins.forEach((d, i) => {
        const swimWave = Math.sin(time * 6 + i * 1.2) * 7;
        const targetY = GAME_CONFIG.SEA_LEVEL + route.depth + d.offset.y + swimWave + leapYOffset + turnYOffset;

        d.obj.pos.x = podX + d.offset.x * formationFactor;
        d.obj.pos.y = targetY;
        d.obj.scale.x = effectiveScaleX;
        d.tail.angle = Math.sin(time * 8 + i * 1.2) * 16;

        if (isLeaping) {
          d.obj.angle = -dir * leapPitch;
        } else if (turnState === "turn") {
          d.obj.angle = turnPitchAngle;
        } else {
          d.obj.angle = -dir * (Math.cos(time * 6 + i * 1.2) * 7);
        }
      });

      // 4. Detecção de Vácuo Hidrodinâmico (Drafting) Bidirecional
      if (!player) return;

      const leadDolphin = dolphins[0].obj;
      const distToPod = player.pos.dist(leadDolphin.pos);

      const isAlignedWithPod = dir === 1 
        ? (player.pos.x <= leadDolphin.pos.x + 85 && player.pos.x >= leadDolphin.pos.x - 180)
        : (player.pos.x >= leadDolphin.pos.x - 85 && player.pos.x <= leadDolphin.pos.x + 180);

      const isEligibleForDrafting = distToPod < 165 && isAlignedWithPod && turnState === "cruise";

      podDraftingStatus[podIndex] = isEligibleForDrafting;

      if (isEligibleForDrafting) {
        playerController.setDrafting(true);

        clickSoundTimer += dt;
        if (clickSoundTimer >= 3.2) {
          clickSoundTimer = 0;
          audioSystem.playDolphinClicks();
        }
      } else {
        if (!podDraftingStatus[0] && !podDraftingStatus[1] && !podDraftingStatus[2]) {
          playerController.setDrafting(false);
        }
      }
    });
  });
}

