import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { audioSystem } from "./audioSystem";
import { getParticlePool } from "./particlePool";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";

/**
 * Sistema de Colônias Residentes de Pinguins-de-Magalhães (*Spheniscus magellanicus*) em Loop Contínuo.
 *
 * Modela o ecossistema polar antártico (0m a 5.000m) através de bandos autônomos (Fase 9.5):
 * 1. Quatro colônias familiares distribuídas ao longo das fendas glaciais antárticas.
 * 2. Comportamento de Porpoising: os pinguins alternam nado veloz subaquático com saltos rasantes
 *    fora da lâmina d'água para respirar e reduzir o arrasto hidrodinâmico em alta velocidade.
 * 3. Inteligência de Bando (Flocking/Boid): os indivíduos mantêm espaçamento elástico,
 *    curvas em U sincronizadas e emissão de micro-bolhas de mergulho.
 *
 * @param k - Instância do contexto Kaboom.js.
 */
export function setupPenguinFlockSystem(k: KaboomCtx) {
  let isSystemActive = true;
  const allPenguinBodies: any[] = [];

  const COLONIES = [
    {
      name: "Colônia da Largada",
      minX: 180,
      maxX: 720,
      initialX: 240,
      initialDir: 1,
      speed: 140,
      count: 4,
      depth: 42,
    },
    {
      name: "Colônia das Fendas Médias",
      minX: 1350,
      maxX: 2050,
      initialX: 1500,
      initialDir: 1,
      speed: 145,
      count: 4,
      depth: 44,
    },
    {
      name: "Colônia das Geleiras",
      minX: 2900,
      maxX: 3700,
      initialX: 3100,
      initialDir: 1,
      speed: 150,
      count: 4,
      depth: 42,
    },
    {
      name: "Colônia da Borda Polar",
      minX: 4400,
      maxX: 5250,
      initialX: 4600,
      initialDir: 1,
      speed: 155,
      count: 5,
      depth: 46,
    },
  ];

  COLONIES.forEach((colony) => {
    const penguins: any[] = [];

    for (let i = 0; i < colony.count; i++) {
      const pOffsetX = -i * 18 - Math.random() * 5;
      const pOffsetY = (i % 2 === 0 ? -6 : 6) + (Math.random() - 0.5) * 4;

      // Corpo em torpedo do pinguim (proporção biológica 14x5px para escala com a jubarte de 108px)
      const pBody = k.add([
        k.rect(14, 5, { radius: 2 }),
        k.pos(colony.initialX + pOffsetX, GAME_CONFIG.SEA_LEVEL + colony.depth + pOffsetY),
        k.color(12, 14, 18), // Dorso preto de alto contraste
        k.anchor("center"),
        k.scale(k.vec2(colony.initialDir, 1)),
        k.z(13),
        "penguin",
      ]);

      // Ventre branco brilhante
      pBody.add([
        k.rect(10, 2.5, { radius: 1 }),
        k.pos(-0.5, 1),
        k.color(255, 255, 255),
        k.anchor("center"),
      ]);

      // Faixa facial branca do Pinguim-de-Magalhães
      pBody.add([k.circle(1.2), k.pos(3.5, -1.2), k.color(245, 250, 255)]);

      // Bico âmbar
      pBody.add([
        k.rect(3, 1.5, { radius: 0.8 }),
        k.pos(7.5, 0),
        k.color(230, 165, 40),
        k.anchor("center"),
      ]);

      // Asa / Nadadeira
      const wing = pBody.add([
        k.polygon([k.vec2(0, 0), k.vec2(-2.5, 4), k.vec2(-5, 0.8)]),
        k.pos(0.5, 0.5),
        k.color(10, 12, 16),
      ]);

      // Patas
      pBody.add([k.rect(2.5, 1.5), k.pos(-7, 1.2), k.color(215, 120, 45), k.anchor("center")]);

      allPenguinBodies.push(pBody);
      penguins.push({
        obj: pBody,
        wing,
        baseOffsetX: pOffsetX,
        baseOffsetY: pOffsetY,
        swimPhase: Math.random() * Math.PI * 2,
        isLeaping: false,
        leapProgress: 0,
        leapDelay: i * 0.12, // cascata de saltos sincronizados
      });
    }

    let flockX = colony.initialX;
    let dir = colony.initialDir;
    let turnState: "cruise" | "turn" = "cruise";
    let turnTimer = 0;
    let turnFromDir = colony.initialDir;
    let targetDir = -colony.initialDir;
    const turnDuration = 1.8;
    const turnRadius = 40;

    const midpoint = (colony.minX + colony.maxX) / 2;
    let leapTriggeredThisLeg = false;
    let soundTimer = 0;

    k.onUpdate(() => {
      if (!isSystemActive) return;

      const dt = k.dt();
      const player = k.get(TAGS.PLAYER)[0];

      // 1. Simulação do Loop Pré-Programado
      if (turnState === "cruise") {
        flockX += dir * colony.speed * dt;

        // Gatilho de salto fora d'água no meio da rota
        if (!leapTriggeredThisLeg) {
          const reachedMidpoint = dir === 1 ? flockX >= midpoint : flockX <= midpoint;
          if (reachedMidpoint) {
            leapTriggeredThisLeg = true;
            penguins.forEach((p) => {
              p.isLeaping = true;
              p.leapProgress = -p.leapDelay; // inicia com leve atraso em cascata
            });

            if (player && soundTimer >= 3.0 && Math.abs(flockX - player.pos.x) < 600) {
              soundTimer = 0;
              audioSystem.playPenguinChirp(flockX, player.pos.x);
            }
          }
        }

        // Checagem determinística das bordas de retorno da colônia
        if (dir === 1 && flockX >= colony.maxX) {
          flockX = colony.maxX;
          turnState = "turn";
          turnTimer = 0;
          turnFromDir = 1;
          targetDir = -1;
        } else if (dir === -1 && flockX <= colony.minX) {
          flockX = colony.minX;
          turnState = "turn";
          turnTimer = 0;
          turnFromDir = -1;
          targetDir = 1;
        }
      } else {
        // Manobra de retorno ágil em U
        turnTimer += dt;
        const p = Math.min(1.0, turnTimer / turnDuration);

        // Deslocamento determinístico durante a curva
        const turnProgressOffset = turnRadius * ((1 - Math.cos(p * Math.PI)) / 2);
        if (turnFromDir === 1) {
          flockX = colony.maxX - turnProgressOffset;
        } else {
          flockX = colony.minX + turnProgressOffset;
        }

        if (p >= 1.0) {
          turnState = "cruise";
          dir = targetDir;
          turnTimer = 0;
          leapTriggeredThisLeg = false;
          flockX = turnFromDir === 1 ? colony.maxX - turnRadius : colony.minX + turnRadius;
        }
      }

      // 2. Interpolação Orgânica da Formação e Rotação
      const p = turnState === "turn" ? Math.min(1.0, turnTimer / turnDuration) : 0;
      const turnYOffset = turnState === "turn" ? Math.sin(p * Math.PI) * 22 : 0;

      // Fator de formação contínuo (zero saltos instantâneos)
      const formationFactor = turnState === "turn" ? turnFromDir * Math.cos(p * Math.PI) : dir;

      // Escala horizontal em perspectiva 3D
      const currentFacing = turnState === "turn" ? (p < 0.5 ? turnFromDir : targetDir) : dir;
      const scaleSquash =
        turnState === "turn" ? Math.max(0.2, Math.abs(Math.cos(p * Math.PI))) : 1.0;
      const effectiveScaleX = currentFacing * scaleSquash;

      // Inclinação suave do corpo na curva
      const turnPitchAngle =
        turnState === "turn" ? currentFacing * Math.sin(p * Math.PI * 2) * 15 : 0;

      soundTimer += dt;

      // 3. Atualização de Cada Pinguim da Colônia
      penguins.forEach((penguin) => {
        penguin.swimPhase += dt * 9;
        penguin.wing.angle = Math.sin(penguin.swimPhase * 1.6) * 22;

        let leapY = 0;
        let leapPitch = 0;

        if (penguin.isLeaping) {
          penguin.leapProgress += dt * 1.7; // salto ágil (~0.58s)
          if (penguin.leapProgress >= 0 && penguin.leapProgress <= 1.0) {
            leapY = -Math.sin(penguin.leapProgress * Math.PI) * 46;
            leapPitch = penguin.leapProgress < 0.5 ? -26 : 26;

            // Respingos na quebra da água
            if (player && Math.abs(penguin.obj.pos.x - player.pos.x) < 700) {
              if (penguin.leapProgress < 0.15 || penguin.leapProgress > 0.85) {
                if (Math.random() < 0.3) {
                  const splashPos = k.vec2(penguin.obj.pos.x, GAME_CONFIG.SEA_LEVEL + 2);
                  const pool = getParticlePool();
                  if (pool) {
                    pool.spawnCircle({
                      pos: splashPos,
                      radius: 1.2,
                      color: k.rgb(220, 240, 255),
                      opacity: 0.8,
                      z: 14,
                      vel: k.vec2(0, -25),
                      fadeRate: 3.0,
                      maxLife: 0.3,
                    });
                  } else {
                    const splash = k.add([
                      k.circle(1.2),
                      k.pos(splashPos),
                      k.color(220, 240, 255),
                      k.opacity(0.8),
                      k.z(14),
                    ]);
                    splash.onUpdate(() => {
                      splash.pos.y -= dt * 25;
                      splash.opacity -= dt * 3.0;
                      if (splash.opacity <= 0) k.destroy(splash);
                    });
                  }
                }
              }
            }
          } else if (penguin.leapProgress > 1.0) {
            penguin.isLeaping = false;
            penguin.leapProgress = 0;
          }
        }

        // Posicionamento contínuo
        const waveY = Math.sin(penguin.swimPhase) * 4;
        penguin.obj.pos.x = flockX + penguin.baseOffsetX * formationFactor;
        penguin.obj.pos.y =
          GAME_CONFIG.SEA_LEVEL + colony.depth + penguin.baseOffsetY + waveY + leapY + turnYOffset;

        penguin.obj.scale.x = effectiveScaleX;

        if (penguin.isLeaping && penguin.leapProgress >= 0) {
          penguin.obj.angle = -dir * leapPitch;
        } else if (turnState === "turn") {
          penguin.obj.angle = turnPitchAngle;
        } else {
          penguin.obj.angle = -dir * (Math.sin(penguin.swimPhase) * 6);
        }

        // Trilha de bolhas subaquáticas
        if (player && Math.abs(penguin.obj.pos.x - player.pos.x) < 900) {
          if (!penguin.isLeaping && Math.random() < 0.12) {
            const bubblePos = k.vec2(
              penguin.obj.pos.x - currentFacing * 12,
              penguin.obj.pos.y + (Math.random() - 0.5) * 4
            );
            const pool = getParticlePool();
            if (pool) {
              pool.spawnCircle({
                pos: bubblePos,
                radius: 1.0,
                color: k.rgb(210, 240, 255),
                opacity: 0.65,
                z: 11,
                vel: k.vec2(-currentFacing * 20, -15),
                fadeRate: 2.5,
                maxLife: 0.35,
              });
            } else {
              const bubble = k.add([
                k.circle(1.0),
                k.pos(bubblePos),
                k.color(210, 240, 255),
                k.opacity(0.65),
                k.z(11),
              ]);
              bubble.onUpdate(() => {
                bubble.pos.x -= currentFacing * dt * 20;
                bubble.pos.y -= dt * 15;
                bubble.opacity -= dt * 2.5;
                if (bubble.opacity <= 0) k.destroy(bubble);
              });
            }
          }
        }
      });
    });
  });

  const activate = () => {
    isSystemActive = true;
    allPenguinBodies.forEach((p) => {
      p.hidden = false;
    });
  };

  const deactivate = () => {
    isSystemActive = false;
    allPenguinBodies.forEach((p) => {
      p.hidden = true;
    });
  };

  const biomeMgr = getBiomeLifecycleManager();
  if (biomeMgr) {
    biomeMgr.registerModule({
      id: "penguin_colonies",
      name: "Colônias de Pinguins (Antártica)",
      minX: 0,
      maxX: 5400,
      activate,
      deactivate,
      isActive: () => isSystemActive,
    });
  }

  return {
    activate,
    deactivate,
    isActive: () => isSystemActive,
  };
}
