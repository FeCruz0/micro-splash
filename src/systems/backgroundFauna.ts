import { audioSystem } from "./audioSystem";
import { getActivePlayerObject } from "../entities/player";
import { getParticlePool } from "./particlePool";
import { getSpatialCullingManager } from "./spatialCullingSystem";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";
import { getRandomFloat } from "../utils/random";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../engine/adapters/RenderEngineAdapter";
import {
  createNativeCircleNode,
  createNativeRectNode,
  createNativeSpriteNode,
  scheduleNativeSceneDelay,
} from "../engine/adapters/NativeRenderNodeFactory";

export interface BackgroundFaunaVector2D {
  x: number;
  y: number;
  dist?: (other: BackgroundFaunaVector2D) => number;
}

export interface BackgroundFaunaGameObject {
  pos: BackgroundFaunaVector2D;
  scale?: number | { x: number; y: number } | unknown;
  angle?: number;
  radius?: number;
  opacity?: number;
  height?: number;
  hidden?: boolean;
  onUpdate: (cb: () => void) => void;
  destroy?: () => void;
}

export interface BackgroundFaunaEngineContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = BackgroundFaunaVector2D,
> {
  add: (components: unknown[]) => unknown;
  destroy: (obj: TDestroyable) => void;
  dt: () => number;
  sprite: (name: string, opt?: { anim?: string }) => unknown;
  rect: (w: number, h: number, opt?: { radius?: number }) => unknown;
  circle: (r: number) => unknown;
  pos: (x: number, y: number) => unknown;
  scale: (s: number) => unknown;
  rotate: (a: number) => unknown;
  opacity: (o: number) => unknown;
  anchor: (a: "center") => unknown;
  z: (v: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  rgb?: (r: number, g: number, b: number) => TColor;
  vec2: (x: number, y: number) => TVec;
  wait: (time: number, cb: () => void) => void;
  onSceneLeave?: (callback: () => void) => unknown;
}

/**
 * Cria elementos estéticos de fauna marinha de fundo com sprites e comportamentos enriquecidos:
 * - Pods familiares de Orcas na Antártida (0m - 5.000m)
 * - Jubartes Passantes com redes de bolhas e cantos (5.000m - 12.000m)
 * - Berçário acolhedor de Mãe e Filhote no Santuário (25.000m - 27.000m)
 * - Cachalote Abissal com cliques ultrassônicos do espermacete (8.000m - 10.800m)
 */
export function setupBackgroundFaunaSystem<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = BackgroundFaunaVector2D,
>(k: IRenderEngine | BackgroundFaunaEngineContext<TDestroyable, TColor, TVec>) {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const nativeWorldContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;
  const legacyContext = k as BackgroundFaunaEngineContext<TDestroyable, TColor, TVec>;
  const createdNativeNodes: Array<{ destroy(): void }> = [];

  const getDeltaTime = (): number => {
    if (typeof legacyContext.dt === "function") {
      return legacyContext.dt();
    }
    return resolvedNativeRenderEngine
      ? resolvedNativeRenderEngine.getTicker().getDeltaTime()
      : 0.016;
  };

  const createVector = (x: number, y: number): { x: number; y: number } => {
    return typeof legacyContext.vec2 === "function" ? legacyContext.vec2(x, y) : { x, y };
  };

  const resolveRgbColor = (red: number, green: number, blue: number): unknown => {
    return typeof legacyContext.rgb === "function"
      ? legacyContext.rgb(red, green, blue)
      : { r: red, g: green, b: blue };
  };

  const spawnSpriteEntity = (params: {
    assetAlias: string;
    animationName: string;
    positionX: number;
    positionY: number;
    scaleFactor?: number;
    opacity: number;
    zIndex: number;
  }): BackgroundFaunaGameObject => {
    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      const spriteAdapter = createNativeSpriteNode(
        k,
        resolvedNativeRenderEngine,
        nativeWorldContainer,
        {
          identifier: `fauna_${params.assetAlias}`,
          assetAlias: params.assetAlias,
          animationName: params.animationName,
          positionX: params.positionX,
          positionY: params.positionY,
          scaleX: params.scaleFactor ?? 1,
          scaleY: params.scaleFactor ?? 1,
          opacity: params.opacity,
          zIndex: params.zIndex,
          anchor: "center",
        }
      );
      createdNativeNodes.push(spriteAdapter);
      return spriteAdapter as unknown as BackgroundFaunaGameObject;
    }

    const components: unknown[] = [
      legacyContext.sprite(params.assetAlias, { anim: params.animationName }),
      legacyContext.pos(params.positionX, params.positionY),
    ];
    if (params.scaleFactor !== undefined) {
      components.push(legacyContext.scale(params.scaleFactor));
    }
    components.push(
      legacyContext.rotate(0),
      legacyContext.opacity(params.opacity),
      legacyContext.anchor("center"),
      legacyContext.z(params.zIndex)
    );
    return legacyContext.add(components) as BackgroundFaunaGameObject;
  };

  const spawnCircleEntity = (params: {
    radius: number;
    positionX: number;
    positionY: number;
    colorTuple: [number, number, number];
    opacity: number;
    zIndex: number;
  }): BackgroundFaunaGameObject => {
    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      return createNativeCircleNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
        identifier: "fauna_circle_effect",
        radius: params.radius,
        positionX: params.positionX,
        positionY: params.positionY,
        fillColor: params.colorTuple,
        opacity: params.opacity,
        zIndex: params.zIndex,
        anchor: "center",
      }) as unknown as BackgroundFaunaGameObject;
    }
    return legacyContext.add([
      legacyContext.circle(params.radius),
      legacyContext.pos(params.positionX, params.positionY),
      legacyContext.color(params.colorTuple[0], params.colorTuple[1], params.colorTuple[2]),
      legacyContext.opacity(params.opacity),
      legacyContext.anchor("center"),
      legacyContext.z(params.zIndex),
    ]) as BackgroundFaunaGameObject;
  };

  const spawnRectEntity = (params: {
    width: number;
    height: number;
    cornerRadius?: number;
    positionX: number;
    positionY: number;
    colorTuple: [number, number, number];
    opacity: number;
    zIndex: number;
  }): BackgroundFaunaGameObject => {
    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      return createNativeRectNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
        identifier: "fauna_rect_effect",
        width: params.width,
        height: params.height,
        cornerRadius: params.cornerRadius,
        positionX: params.positionX,
        positionY: params.positionY,
        fillColor: params.colorTuple,
        opacity: params.opacity,
        zIndex: params.zIndex,
        anchor: "center",
      }) as unknown as BackgroundFaunaGameObject;
    }
    return legacyContext.add([
      legacyContext.rect(params.width, params.height, { radius: params.cornerRadius }),
      legacyContext.pos(params.positionX, params.positionY),
      legacyContext.color(params.colorTuple[0], params.colorTuple[1], params.colorTuple[2]),
      legacyContext.opacity(params.opacity),
      legacyContext.anchor("center"),
      legacyContext.z(params.zIndex),
    ]) as BackgroundFaunaGameObject;
  };

  const destroyEntity = (target: BackgroundFaunaGameObject): void => {
    if (resolvedNativeRenderEngine && typeof target.destroy === "function") {
      target.destroy();
      return;
    }
    legacyContext.destroy(target as unknown as TDestroyable);
  };

  const scheduleDelayed = (delaySeconds: number, callback: () => void): void => {
    if (resolvedNativeRenderEngine) {
      scheduleNativeSceneDelay(k, resolvedNativeRenderEngine, delaySeconds, callback);
      return;
    }
    legacyContext.wait(delaySeconds, callback);
  };

  if (resolvedNativeRenderEngine && typeof legacyContext.onSceneLeave === "function") {
    legacyContext.onSceneLeave(() => {
      for (let index = 0; index < createdNativeNodes.length; index++) {
        createdNativeNodes[index].destroy();
      }
      createdNativeNodes.length = 0;
    });
  }

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

  const cullingManager = getSpatialCullingManager();
  const orcaObjects: BackgroundFaunaGameObject[] = [];

  orcaPods.forEach((pod) => {
    pod.members.forEach((m) => {
      const orca = spawnSpriteEntity({
        assetAlias: "orca_bg",
        animationName: "swim",
        positionX: pod.basePos.x + m.offsetX,
        positionY: pod.basePos.y + m.offsetY,
        scaleFactor: m.scale,
        opacity: 0.72,
        zIndex: -5,
      });
      orcaObjects.push(orca);
      cullingManager?.registerEntity(orca, () => pod.basePos.x + m.offsetX, 120);

      let timer = getRandomFloat(0, 10);
      let bubbleTimer = getRandomFloat(0, 3);

      orca.onUpdate(() => {
        if (orca.hidden) return;
        const dt = getDeltaTime();
        timer += dt;
        bubbleTimer += dt;

        // Nado ondulatório ágil com arfagem (pitch) hidrodinâmica
        const wave = Math.sin(timer * 0.85);
        orca.pos.x = pod.basePos.x + m.offsetX + wave * 14;
        orca.pos.y = pod.basePos.y + m.offsetY + Math.cos(timer * 0.55) * 9;
        orca.angle = Math.cos(timer * 0.85) * 3.5;

        // Bolhas de mergulho / respiração polar subaquática via pool de partículas
        if (bubbleTimer >= 3.8) {
          bubbleTimer = 0;
          const pool = getParticlePool();
          const bubblePos = createVector(orca.pos.x + 22 * m.scale, orca.pos.y - 8 * m.scale);
          if (pool) {
            pool.spawnCircle({
              pos: bubblePos,
              radius: 1.5 * m.scale,
              color: resolveRgbColor(200, 235, 255),
              opacity: 0.45,
              z: -4,
              vel: createVector(0, -24),
              fadeRate: 0.35,
              maxLife: 1.4,
            });
          }
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

  const passingWhaleObjects: BackgroundFaunaGameObject[] = [];

  passingWhalePositions.forEach((pos) => {
    const whaleBg = spawnSpriteEntity({
      assetAlias: "jubarte_bg",
      animationName: "swim",
      positionX: pos.x,
      positionY: pos.y,
      opacity: 0.75,
      zIndex: -4,
    });
    passingWhaleObjects.push(whaleBg);
    cullingManager?.registerEntity(whaleBg, () => pos.x, 180);

    let pulseTimer = 0;
    let swimTimer = getRandomFloat(0, 10);

    whaleBg.onUpdate(() => {
      if (whaleBg.hidden) return;
      const dt = getDeltaTime();
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
        const ring = spawnCircleEntity({
          radius: 16,
          positionX: whaleBg.pos.x,
          positionY: whaleBg.pos.y,
          colorTuple: [0, 190, 255],
          opacity: 0.52,
          zIndex: -3,
        });

        ring.onUpdate(() => {
          const dtStep = getDeltaTime();
          if (ring.radius !== undefined) {
            ring.radius += dtStep * 145;
          }
          if (ring.opacity !== undefined) {
            ring.opacity -= dtStep * 0.32;
            if (ring.opacity <= 0) {
              destroyEntity(ring);
            }
          }
        });

        // 2. Rede de bolhas (Bubble Net spiral) típica das jubartes
        for (let b = 0; b < 5; b++) {
          const bubbleAngle = (b / 5) * Math.PI * 2;
          const bubble = spawnCircleEntity({
            radius: getRandomFloat(2.2, 3.7),
            positionX: whaleBg.pos.x + Math.cos(bubbleAngle) * 28,
            positionY: whaleBg.pos.y + Math.sin(bubbleAngle) * 18,
            colorTuple: [180, 230, 255],
            opacity: 0.6,
            zIndex: -3,
          });

          const upwardSpeed = getRandomFloat(35, 60);
          bubble.onUpdate(() => {
            const dtStep = getDeltaTime();
            bubble.pos.y -= dtStep * upwardSpeed;
            bubble.pos.x += Math.sin(bubble.pos.y * 0.08) * 0.6;
            if (bubble.opacity !== undefined) {
              bubble.opacity -= dtStep * 0.38;
              if (bubble.opacity <= 0) destroyEntity(bubble);
            }
          });
        }

        // 3. Canto da baleia distante se o jogador estiver em alcance auditivo (< 1500px)
        const player = getActivePlayerObject();
        if (player) {
          const dx = player.pos.x - whaleBg.pos.x;
          const dy = player.pos.y - whaleBg.pos.y;
          const dist =
            typeof player.pos.dist === "function"
              ? player.pos.dist(whaleBg.pos)
              : Math.hypot(dx, dy);
          if (dist < 1500) {
            audioSystem.playWhaleSong(0.42, 0.88);
          }
        }
      }
    });
  });

  // ===========================================================================
  // 3. BERÇÁRIO DE MÃE E FILHOTE NO SANTUÁRIO (25.000m - 27.000m)
  // Nado em escalão hidrodinâmico (Echelon swimming) e acolhimento afetuoso
  // ===========================================================================
  const motherWhale = spawnSpriteEntity({
    assetAlias: "jubarte_bg",
    animationName: "swim",
    positionX: 25800,
    positionY: 260,
    scaleFactor: 0.66, // Escala biológica de fundo: ~95×32px (~13m, harmonizado com plano distante)
    opacity: 0.85,
    zIndex: -4,
  });

  const calfWhale = spawnSpriteEntity({
    assetAlias: "jubarte_bg",
    animationName: "swim",
    positionX: 25848,
    positionY: 245,
    scaleFactor: 0.26, // Escala filhote: ~38×13px (~40% da mãe, filhote do ano autêntico)
    opacity: 0.85,
    zIndex: -4,
  });

  cullingManager?.registerEntity(motherWhale, () => 25800, 160);
  cullingManager?.registerEntity(calfWhale, () => 25848, 80);

  let sanctuaryTimer = 0;
  let motherPulseTimer = 0;

  motherWhale.onUpdate(() => {
    if (motherWhale.hidden) return;
    const dt = getDeltaTime();
    sanctuaryTimer += dt;
    motherPulseTimer += dt;

    // Nado em escalão: a mãe gera uma esteira suave e o filhote a acompanha
    motherWhale.pos.y = 260 + Math.sin(sanctuaryTimer * 0.75) * 8;
    motherWhale.angle = Math.cos(sanctuaryTimer * 0.75) * 2.2;

    calfWhale.pos.y = motherWhale.pos.y - 15 + Math.sin(sanctuaryTimer * 1.1) * 4;
    calfWhale.pos.x = motherWhale.pos.x + 48 + Math.cos(sanctuaryTimer * 0.8) * 5;
    calfWhale.angle = Math.cos(sanctuaryTimer * 1.1) * 3.5;

    // Emissão de sonar acolhedor e canto do berçário se o jogador estiver próximo
    if (motherPulseTimer >= 8.5) {
      motherPulseTimer = 0;
      const player = getActivePlayerObject();
      if (player) {
        const dx = player.pos.x - motherWhale.pos.x;
        const dy = player.pos.y - motherWhale.pos.y;
        const dist =
          typeof player.pos.dist === "function"
            ? player.pos.dist(motherWhale.pos)
            : Math.hypot(dx, dy);
        if (dist < 1800) {
          // Anel de sonar ciano-dourado acolhedor
          const ring = spawnCircleEntity({
            radius: 20,
            positionX: motherWhale.pos.x,
            positionY: motherWhale.pos.y,
            colorTuple: [100, 240, 255],
            opacity: 0.6,
            zIndex: -3,
          });

          ring.onUpdate(() => {
            const dtStep = getDeltaTime();
            if (ring.radius !== undefined) {
              ring.radius += dtStep * 125;
            }
            if (ring.opacity !== undefined) {
              ring.opacity -= dtStep * 0.28;
              if (ring.opacity <= 0) destroyEntity(ring);
            }
          });

          // Bolhinhas lúdicas do filhote
          for (let cb = 0; cb < 4; cb++) {
            const cBubble = spawnCircleEntity({
              radius: 1.4,
              positionX: calfWhale.pos.x + (cb - 2) * 3,
              positionY: calfWhale.pos.y - 4,
              colorTuple: [210, 248, 255],
              opacity: 0.65,
              zIndex: -3,
            });
            cBubble.onUpdate(() => {
              const dtStep = getDeltaTime();
              cBubble.pos.y -= dtStep * 32;
              if (cBubble.opacity !== undefined) {
                cBubble.opacity -= dtStep * 0.4;
                if (cBubble.opacity <= 0) destroyEntity(cBubble);
              }
            });
          }

          audioSystem.playWhaleSong(0.52, 0.95);
        }
      }
    }
  });

  // ===========================================================================
  // 4. CACHALOTE ABISSAL NAS PROFUNDEZAS (8.000m - 10.800m - FASE 9.4)
  // Sprite autêntico de Physeter macrocephalus com cliques do órgão do espermacete
  // ===========================================================================
  const leviathan = spawnSpriteEntity({
    assetAlias: "cachalote_bg",
    animationName: "swim",
    positionX: 8800,
    positionY: 425,
    scaleFactor: 0.95, // Escala biológica autêntica: 182×59px (~19m / 50t, claramente maior e mais maciço que a jubarte de 14m/120px)
    opacity: 0.65,
    zIndex: -7, // Plano mais distante de fundo abissal
  });

  cullingManager?.registerEntity(leviathan, () => leviathan.pos.x, 220);

  let levTimer = 0;
  let levCallTimer = 0;

  leviathan.onUpdate(() => {
    const dt = getDeltaTime();
    levTimer += dt;
    levCallTimer += dt;

    // Nado lento e solene nas profundezas
    leviathan.pos.x += dt * 17;
    if (leviathan.pos.x > 10800) {
      leviathan.pos.x = 8000;
    }

    if (leviathan.hidden) return;

    leviathan.pos.y = 425 + Math.sin(levTimer * 0.4) * 14;
    leviathan.angle = Math.sin(levTimer * 0.4) * 3.0; // arfagem de mergulho profundo

    // A cada ~11 segundos, emite um infrassom oceânico e feixe de cliques acústicos
    if (levCallTimer >= 11.5) {
      levCallTimer = 0;
      const player = getActivePlayerObject();
      if (player) {
        const dx = player.pos.x - leviathan.pos.x;
        const dy = player.pos.y - leviathan.pos.y;
        const dist =
          typeof player.pos.dist === "function"
            ? player.pos.dist(leviathan.pos)
            : Math.hypot(dx, dy);
        if (dist < 1700) {
          audioSystem.playAbyssalWhaleCall();

          // 1. Onda esférica de baixa frequência
          const pulse = spawnCircleEntity({
            radius: 30,
            positionX: leviathan.pos.x,
            positionY: leviathan.pos.y,
            colorTuple: [65, 185, 245],
            opacity: 0.48,
            zIndex: -6,
          });
          pulse.onUpdate(() => {
            const dtStep = getDeltaTime();
            if (pulse.radius !== undefined) {
              pulse.radius += dtStep * 105;
            }
            if (pulse.opacity !== undefined) {
              pulse.opacity -= dtStep * 0.16;
              if (pulse.opacity <= 0) destroyEntity(pulse);
            }
          });

          // 2. Feixe de cliques direcionais do espermacete (projetados para a frente da cabeça quadrada)
          for (let c = 0; c < 3; c++) {
            scheduleDelayed(c * 0.12, () => {
              const clickRing = spawnRectEntity({
                width: 5,
                height: 26,
                cornerRadius: 2,
                positionX: leviathan.pos.x + 84,
                positionY: leviathan.pos.y - 2,
                colorTuple: [100, 220, 255],
                opacity: 0.65,
                zIndex: -6,
              });
              clickRing.onUpdate(() => {
                const dtStep = getDeltaTime();
                clickRing.pos.x += dtStep * 180;
                if (clickRing.height !== undefined) {
                  clickRing.height += dtStep * 60;
                }
                if (clickRing.opacity !== undefined) {
                  clickRing.opacity -= dtStep * 0.7;
                  if (clickRing.opacity <= 0) destroyEntity(clickRing);
                }
              });
            });
          }
        }
      }
    }
  });

  // ===========================================================================
  // 5. REGISTRO NO GERENCIADOR DE CICLO DE VIDA GEOGRÁFICO
  // ===========================================================================
  const biomeMgr = getBiomeLifecycleManager();
  if (biomeMgr) {
    let orcasActive = true;
    biomeMgr.registerModule({
      id: "fauna_orcas",
      name: "Orcas Polares (Antártica)",
      minX: 0,
      maxX: 5000,
      activate: () => {
        orcasActive = true;
      },
      deactivate: () => {
        orcasActive = false;
      },
      isActive: () => orcasActive,
    });

    let pelagicActive = true;
    biomeMgr.registerModule({
      id: "fauna_pelagic_whales",
      name: "Jubartes Passantes (Mar Aberto)",
      minX: 5000,
      maxX: 12000,
      activate: () => {
        pelagicActive = true;
      },
      deactivate: () => {
        pelagicActive = false;
      },
      isActive: () => pelagicActive,
    });

    let cachaloteActive = true;
    biomeMgr.registerModule({
      id: "fauna_cachalote",
      name: "Cachalote Abissal",
      minX: 7500,
      maxX: 11200,
      activate: () => {
        cachaloteActive = true;
      },
      deactivate: () => {
        cachaloteActive = false;
      },
      isActive: () => cachaloteActive,
    });

    let sanctuaryActive = true;
    biomeMgr.registerModule({
      id: "fauna_sanctuary",
      name: "Berçário de Baleias (Santuário)",
      minX: 24500,
      maxX: 27500,
      activate: () => {
        sanctuaryActive = true;
      },
      deactivate: () => {
        sanctuaryActive = false;
      },
      isActive: () => sanctuaryActive,
    });
  }
}
