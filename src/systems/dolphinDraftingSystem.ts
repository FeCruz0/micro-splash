import { GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";
import type { PlayerController } from "../entities/player";
import { getParticlePool } from "./particlePool";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";
import { getRandomFloat } from "../utils/random";

export interface DolphinVector2D {
  x: number;
  y: number;
  dist?: (other: DolphinVector2D) => number;
}

export interface DolphinGameObject {
  pos: DolphinVector2D;
  scale: { x: number; y: number } | number | unknown;
  angle?: number;
  opacity?: number;
  hidden?: boolean;
  add: (components: unknown[]) => DolphinGameObject;
  onUpdate?: (cb: () => void) => void;
}

export interface DolphinEngineContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = DolphinVector2D,
> {
  add: (components: unknown[]) => unknown;
  destroy: (obj: TDestroyable) => void;
  dt: () => number;
  time: () => number;
  onUpdate: (cb: () => void) => void;
  rect: (w: number, h: number, opt?: { radius?: number }) => unknown;
  circle: (r: number) => unknown;
  polygon: (pts: TVec[]) => unknown;
  pos: (x: number, y: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  scale: (s: TVec | number) => unknown;
  anchor: (a: "center") => unknown;
  opacity: (o: number) => unknown;
  z: (v: number) => unknown;
  rgb?: (r: number, g: number, b: number) => TColor;
  vec2: (x: number, y: number) => TVec;
}

/**
 * Sistema de Cardumes Residentes de Golfinhos-Rotadores (*Stenella longirostris*) e Vácuo Hidrodinâmico (Drafting).
 *
 * Reproduz o comportamento biológico cooperativo dos cetáceos pelágicos (Fases 9.3 e 15):
 * 1. Distribui três pods familiares permanentes ao longo da Travessia Pelágica (5.400m a 11.200m).
 * 2. Cada cardume navega em patrulha cíclica, executando saltos em arco fora d'água e mergulhos em curva (U-turn).
 * 3. Dinâmica de Vácuo Hidrodinâmico (*Drafting*): ao nadar emparelhado com o cardume (raio < 120px),
 *    a esteira de vórtices gerada pelos golfinhos concede bônus de velocidade (+18%) e reduz o esforço metabólico da jubarte.
 *
 * @param k - Instância do contexto agnóstico do motor.
 * @param playerController - Controlador físico da baleia do jogador.
 */
export function setupDolphinDraftingSystem<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = DolphinVector2D,
>(k: DolphinEngineContext<TDestroyable, TColor, TVec>, playerController: PlayerController) {
  let isSystemActive = true;
  const allDolphinBodies: DolphinGameObject[] = [];

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
    const dolphins: Array<{
      obj: DolphinGameObject;
      tail: DolphinGameObject;
      offset: { x: number; y: number };
      index: number;
    }> = [];
    const offsets = [
      { x: 0, y: 0 },
      { x: -36, y: -14 },
      { x: -44, y: 15 },
      { x: -76, y: 3 },
    ];

    offsets.forEach((off, i) => {
      // Corpo fusiforme do golfinho (proporção biológica 28x9px em relação à jubarte de 108px)
      const dolphin = k.add([
        k.rect(28, 9, { radius: 4 }),
        k.pos(route.initialX + off.x, GAME_CONFIG.SEA_LEVEL + route.depth + off.y),
        k.color(68, 108, 148),
        k.anchor("center"),
        k.scale(k.vec2(route.initialDir, 1)),
        k.z(11),
        "dolphin",
      ]) as DolphinGameObject;

      allDolphinBodies.push(dolphin);

      // Ventre claro
      dolphin.add([
        k.rect(20, 3.2, { radius: 1.5 }),
        k.pos(-1, 2.5),
        k.color(225, 238, 248),
        k.anchor("center"),
      ]);

      // Bico / Rostro
      dolphin.add([
        k.rect(5.5, 2.5, { radius: 1 }),
        k.pos(15.5, 0.8),
        k.color(68, 108, 148),
        k.anchor("center"),
      ]);

      // Nadadeira dorsal curvada falcada
      dolphin.add([
        k.polygon([k.vec2(0, 0), k.vec2(-5, -6), k.vec2(-9, 0)]),
        k.pos(1, -4.5),
        k.color(52, 88, 124),
      ]);

      // Nadadeira peitoral
      dolphin.add([
        k.polygon([k.vec2(0, 0), k.vec2(-4, 5), k.vec2(-7, 1.5)]),
        k.pos(5, 3),
        k.color(52, 88, 124),
      ]);

      // Cauda / Flukes
      const tail = dolphin.add([
        k.polygon([k.vec2(0, 0), k.vec2(-5, -5), k.vec2(-5, 5)]),
        k.pos(-14, 0),
        k.color(52, 88, 124),
      ]) as DolphinGameObject;

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
      if (!isSystemActive) return;

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
      const formationFactor = turnState === "turn" ? turnFromDir * Math.cos(p * Math.PI) : dir;

      // Escala horizontal em perspectiva 3D
      const currentFacing = turnState === "turn" ? (p < 0.5 ? turnFromDir : targetDir) : dir;
      const scaleSquash =
        turnState === "turn" ? Math.max(0.18, Math.abs(Math.cos(p * Math.PI))) : 1.0;
      const effectiveScaleX = currentFacing * scaleSquash;

      // Inclinação suave do corpo na curva
      const turnPitchAngle =
        turnState === "turn" ? currentFacing * Math.sin(p * Math.PI * 2) * 16 : 0;

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
              if (getRandomFloat(0, 1) < 0.3) {
                const splashPos = k.vec2(podX + getRandomFloat(-20, 20), GAME_CONFIG.SEA_LEVEL + 3);
                const pool = getParticlePool();
                if (pool) {
                  pool.spawnCircle({
                    pos: splashPos,
                    radius: 1.8,
                    color:
                      typeof k.rgb === "function"
                        ? k.rgb(210, 240, 255)
                        : { r: 210, g: 240, b: 255 },
                    opacity: 0.85,
                    z: 14,
                    vel: k.vec2(0, -25),
                    fadeRate: 3.5,
                    maxLife: 0.3,
                  });
                } else {
                  const splash = k.add([
                    k.circle(1.8),
                    k.pos(splashPos.x, splashPos.y),
                    k.color(210, 240, 255),
                    k.opacity(0.85),
                    k.z(14),
                  ]) as DolphinGameObject;
                  splash.onUpdate = (cb: () => void) => {
                    cb();
                  };
                  k.onUpdate(() => {
                    if (splash.opacity !== undefined) {
                      splash.pos.y -= dt * 25;
                      splash.opacity -= dt * 3.5;
                      if (splash.opacity <= 0) k.destroy(splash as unknown as TDestroyable);
                    }
                  });
                }
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
        const targetY =
          GAME_CONFIG.SEA_LEVEL + route.depth + d.offset.y + swimWave + leapYOffset + turnYOffset;

        d.obj.pos.x = podX + d.offset.x * formationFactor;
        d.obj.pos.y = targetY;
        if (typeof d.obj.scale === "object" && d.obj.scale !== null && "x" in d.obj.scale) {
          (d.obj.scale as { x: number; y: number }).x = effectiveScaleX;
        }
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
      const dx = player.pos.x - leadDolphin.pos.x;
      const dy = player.pos.y - leadDolphin.pos.y;
      const distToPod =
        typeof player.pos.dist === "function"
          ? player.pos.dist(leadDolphin.pos)
          : Math.hypot(dx, dy);

      const isAlignedWithPod =
        dir === 1
          ? player.pos.x <= leadDolphin.pos.x + 85 && player.pos.x >= leadDolphin.pos.x - 180
          : player.pos.x >= leadDolphin.pos.x - 85 && player.pos.x <= leadDolphin.pos.x + 180;

      const isEligibleForDrafting = distToPod < 165 && isAlignedWithPod && turnState === "cruise";

      podDraftingStatus[podIndex] = isEligibleForDrafting;

      if (isEligibleForDrafting) {
        playerController.setDrafting(true);

        clickSoundTimer += dt;
        if (clickSoundTimer >= 3.2) {
          clickSoundTimer = 0;
          audioSystem.playDolphinClicks(podX, player.pos.x);
        }
      } else {
        if (!podDraftingStatus[0] && !podDraftingStatus[1] && !podDraftingStatus[2]) {
          playerController.setDrafting(false);
        }
      }
    });
  });

  const activate = () => {
    isSystemActive = true;
    allDolphinBodies.forEach((d) => {
      d.hidden = false;
    });
  };

  const deactivate = () => {
    isSystemActive = false;
    playerController.setDrafting(false);
    allDolphinBodies.forEach((d) => {
      d.hidden = true;
    });
  };

  const biomeMgr = getBiomeLifecycleManager();
  if (biomeMgr) {
    biomeMgr.registerModule({
      id: "dolphin_pods",
      name: "Cardumes de Golfinhos (Travessia Pelágica)",
      minX: 4800,
      maxX: 11800,
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
