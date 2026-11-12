import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";
import { getParticlePool } from "./particlePool";
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
  registerNativeSceneUpdate,
} from "../engine/adapters/NativeRenderNodeFactory";

export interface OilSpillVector2D {
  x: number;
  y: number;
}

export interface OilSpillGameObject<TColor = unknown> {
  pos: OilSpillVector2D;
  color?: TColor;
  hidden?: boolean;
  opacity?: number;
  add: (components: unknown[]) => OilSpillGameObject<TColor>;
  onUpdate: (cb: () => void) => void;
  destroy?: () => void;
}

export interface OilSpillEngineContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = OilSpillVector2D,
> {
  add: (components: unknown[]) => unknown;
  destroy: (obj: TDestroyable) => void;
  dt: () => number;
  onUpdate: (cb: () => void) => void;
  rect: (w: number, h: number, opt?: { radius?: number }) => unknown;
  circle: (r: number) => unknown;
  pos: (x: number | TVec, y?: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  opacity: (o: number) => unknown;
  outline?: (w: number, col: TColor) => unknown;
  anchor: (a: "bot" | "center") => unknown;
  z: (v: number) => unknown;
  rgb: (r: number, g: number, b: number) => TColor;
  vec2: (x: number, y: number) => TVec;
  onSceneLeave?: (callback: () => void) => unknown;
}

/**
 * Sistema de Mancha de Óleo Pré-Arraial (Fase 9.1)
 * Faixa: 17.400m a 18.900m (antes do Boqueirão)
 *
 * Simula um derramamento industrial de hidrocarbonetos na superfície.
 * Respirar ou romper a superfície nessa zona obstrui o espiráculo da baleia,
 * impedindo a recarga de oxigênio até que ela mergulhe fundo em águas limpas.
 */
/**
 * Calcula a cor da película iridescente com alternância senoidal de 3 cores químicas (Fase 30.7).
 * Cores: Azul cobalto / petróleo, Verde esmeralda, Violeta furta-cor.
 */
export function calculateIridescentOilColor(
  time: number,
  patchIndex: number
): [number, number, number] {
  const t = time * 2.0 + patchIndex * 0.7;
  const s1 = (Math.sin(t) + 1) * 0.5;
  const s2 = (Math.sin(t + 2.094) + 1) * 0.5; // +120°
  const s3 = (Math.sin(t + 4.188) + 1) * 0.5; // +240°

  const total = s1 + s2 + s3 || 1;
  const r = Math.round((s1 * 45 + s2 * 35 + s3 * 175) / total);
  const g = Math.round((s1 * 120 + s2 * 215 + s3 * 65) / total);
  const b = Math.round((s1 * 230 + s2 * 150 + s3 * 210) / total);
  return [r, g, b];
}

/**
 * Sistema de Mancha de Óleo Pré-Arraial (Fase 9.1 & 30.7)
 * Faixa: 17.400m a 18.900m (antes do Boqueirão)
 *
 * Simula um derramamento industrial de hidrocarbonetos na superfície com 3 camadas físicas.
 */
export function setupOilSpillSystem<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = OilSpillVector2D,
>(
  k: IRenderEngine | OilSpillEngineContext<TDestroyable, TColor, TVec>,
  playerController: PlayerController
) {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const nativeWorldContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;
  const legacyContext = k as OilSpillEngineContext<TDestroyable, TColor, TVec>;
  const createdNativeNodes: Array<{ destroy(): void }> = [];

  const getDeltaTime = (): number => {
    if (typeof legacyContext.dt === "function") {
      return legacyContext.dt();
    }
    return resolvedNativeRenderEngine
      ? resolvedNativeRenderEngine.getTicker().getDeltaTime()
      : 0.016;
  };

  const resolveRgbColor = (red: number, green: number, blue: number): TColor => {
    if (typeof legacyContext.rgb === "function") {
      return legacyContext.rgb(red, green, blue);
    }
    return [red, green, blue] as unknown as TColor;
  };

  const createVector = (x: number, y: number): TVec => {
    if (typeof legacyContext.vec2 === "function") {
      return legacyContext.vec2(x, y);
    }
    return { x, y } as TVec;
  };

  let isSystemActive = true;
  const SPILL_START = 17400;
  const SPILL_END = 18900;
  const PATCH_WIDTH = 180;

  let buoy: OilSpillGameObject<TColor>;
  let buoyLight: OilSpillGameObject<TColor>;

  if (resolvedNativeRenderEngine && nativeWorldContainer) {
    const buoyNode = createNativeRectNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
      identifier: "oil_spill_buoy",
      width: 24,
      height: 30,
      cornerRadius: 3,
      positionX: SPILL_START + 20,
      positionY: GAME_CONFIG.SEA_LEVEL - 5,
      fillColor: [255, 140, 0],
      outlineColor: [30, 30, 30],
      outlineWidth: 2,
      anchor: "bot",
      zIndex: 25,
    });
    const buoyLightNode = createNativeCircleNode(
      k,
      resolvedNativeRenderEngine,
      buoyNode.renderNode,
      {
        identifier: "oil_spill_buoy_light",
        radius: 4,
        positionX: 0,
        positionY: -32,
        fillColor: [255, 40, 40],
      }
    );
    createdNativeNodes.push(buoyNode);
    buoy = buoyNode as unknown as OilSpillGameObject<TColor>;
    buoyLight = buoyLightNode as unknown as OilSpillGameObject<TColor>;
  } else {
    // Boia de alerta ecológico no início do derramamento
    const buoyComponents: unknown[] = [
      legacyContext.rect(24, 30, { radius: 3 }),
      legacyContext.pos(SPILL_START + 20, GAME_CONFIG.SEA_LEVEL - 5),
      legacyContext.color(255, 140, 0), // Laranja de segurança
      legacyContext.anchor("bot"),
      legacyContext.z(25),
    ];
    if (legacyContext.outline) {
      buoyComponents.push(legacyContext.outline(2, legacyContext.rgb(30, 30, 30)));
    }
    buoy = legacyContext.add(buoyComponents) as OilSpillGameObject<TColor>;

    // Luz piscante de perigo na boia
    buoyLight = buoy.add([
      legacyContext.circle(4),
      legacyContext.pos(0, -32),
      legacyContext.color(255, 40, 40),
    ]);
  }

  let buoyTime = 0;
  buoy.onUpdate(() => {
    if (!isSystemActive) return;

    buoyTime += getDeltaTime();
    buoyLight.color =
      Math.floor(buoyTime * 4) % 2 === 0
        ? resolveRgbColor(255, 30, 30)
        : resolveRgbColor(60, 10, 10);
    buoy.pos.y = GAME_CONFIG.SEA_LEVEL - 5 + Math.sin(buoyTime * 2.5) * 2;
  });

  // Gera manchas sequenciais de óleo viscoso com 3 camadas realistas (Fase 30.7)
  const patches: Array<{
    slick: OilSpillGameObject<TColor>;
    film: OilSpillGameObject<TColor>;
    foamDrops: OilSpillGameObject<TColor>[];
    baseX: number;
  }> = [];
  for (let x = SPILL_START; x < SPILL_END; x += PATCH_WIDTH - 20) {
    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      const slickNode = createNativeRectNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
        identifier: "oil_spill_slick",
        width: PATCH_WIDTH,
        height: 14,
        cornerRadius: 4,
        positionX: x,
        positionY: GAME_CONFIG.SEA_LEVEL - 2,
        fillColor: [8, 5, 5],
        opacity: 0.9,
        zIndex: 18,
        tags: ["oil_spill"],
      });
      const filmNode = createNativeRectNode(k, resolvedNativeRenderEngine, slickNode.renderNode, {
        identifier: "oil_spill_film",
        width: PATCH_WIDTH - 12,
        height: 3,
        positionX: 6,
        positionY: 2,
        fillColor: [160, 60, 200],
        opacity: 0.8,
      });
      const foamPositions = [4, 12, PATCH_WIDTH - 16, PATCH_WIDTH - 8];
      const foamDrops = foamPositions.map(
        (relX, fIdx) =>
          createNativeCircleNode(k, resolvedNativeRenderEngine, slickNode.renderNode, {
            identifier: "oil_spill_foam",
            radius: fIdx % 2 === 0 ? 2.5 : 2,
            positionX: relX,
            positionY: 2 + (fIdx % 2) * 2,
            fillColor: [245, 245, 235],
            opacity: 0.3,
          }) as unknown as OilSpillGameObject<TColor>
      );
      createdNativeNodes.push(slickNode);
      patches.push({
        slick: slickNode as unknown as OilSpillGameObject<TColor>,
        film: filmNode as unknown as OilSpillGameObject<TColor>,
        foamDrops,
        baseX: x,
      });
    } else {
      // Camada 1: Base densa de petróleo bruto na linha d'água
      const slick = legacyContext.add([
        legacyContext.rect(PATCH_WIDTH, 14, { radius: 4 }),
        legacyContext.pos(x, GAME_CONFIG.SEA_LEVEL - 2),
        legacyContext.color(8, 5, 5), // petróleo bruto ultra-escuro (8, 5, 5)
        legacyContext.opacity(0.9),
        legacyContext.z(18),
        "oil_spill",
      ]) as OilSpillGameObject<TColor>;

      // Camada 2: Película iridescente central (furta-cor com shimmer)
      const film = slick.add([
        legacyContext.rect(PATCH_WIDTH - 12, 3),
        legacyContext.pos(6, 2),
        legacyContext.color(160, 60, 200),
        legacyContext.opacity(0.8),
      ]);

      // Camada 3: Gotas de espuma emulsionada de contaminação nas bordas
      const foamPositions = [4, 12, PATCH_WIDTH - 16, PATCH_WIDTH - 8];
      const foamDrops = foamPositions.map((relX, fIdx) => {
        return slick.add([
          legacyContext.circle(fIdx % 2 === 0 ? 2.5 : 2),
          legacyContext.pos(relX, 2 + (fIdx % 2) * 2),
          legacyContext.color(245, 245, 235), // espuma branca/amarelada
          legacyContext.opacity(0.3),
        ]);
      });

      patches.push({ slick, film, foamDrops, baseX: x });
    }
  }

  let shimmerTime = 0;

  const updateOilSpill = (deltaTime: number) => {
    if (!isSystemActive) return;

    const player = playerController.gameObj;
    if (!player) return;

    shimmerTime += deltaTime;

    // Atualiza reflexos iridescentes (onda de cores químicas de hidrocarbonetos)
    patches.forEach((p, idx) => {
      // Ativa somente se estiver próximo da visão do jogador
      if (Math.abs(p.baseX - player.pos.x) < 1400) {
        p.slick.hidden = false;
        // Ondulação suave da mancha
        p.slick.pos.y = GAME_CONFIG.SEA_LEVEL - 2 + Math.sin(shimmerTime * 2 + idx * 0.8) * 1.5;

        // Variação química de cor da película iridescente
        const [r, g, b] = calculateIridescentOilColor(shimmerTime, idx);
        p.film.color = resolveRgbColor(r, g, b);
      } else {
        p.slick.hidden = true;
      }
    });

    // Detecção: Jogador na superfície dentro da área do derramamento
    if (player.pos.x >= SPILL_START && player.pos.x <= SPILL_END) {
      if (player.pos.y <= GAME_CONFIG.SEA_LEVEL + 16) {
        // Obstrui espiráculo
        playerController.setOilObstructed(true);

        // Respingo de gotículas de óleo negro em contato
        if (getRandomFloat(0, 1) < 0.4) {
          const dropPos = createVector(
            player.pos.x + getRandomFloat(-15, 15),
            GAME_CONFIG.SEA_LEVEL + getRandomFloat(0, 4)
          );
          const dropRadius = getRandomFloat(1.5, 3.3);
          const pool = getParticlePool();
          if (pool) {
            pool.spawnCircle({
              pos: dropPos,
              radius: dropRadius,
              color: resolveRgbColor(24, 16, 12),
              opacity: 0.85,
              z: 20,
              vel: createVector(0, 40),
              fadeRate: 2.0,
              maxLife: 0.45,
            });
          } else if (resolvedNativeRenderEngine && nativeWorldContainer) {
            const drop = createNativeCircleNode(
              k,
              resolvedNativeRenderEngine,
              nativeWorldContainer,
              {
                identifier: "oil_spill_droplet",
                radius: dropRadius,
                positionX: dropPos.x,
                positionY: dropPos.y,
                fillColor: [24, 16, 12],
                opacity: 0.85,
                zIndex: 20,
              }
            );
            drop.onUpdate((stepDelta) => {
              drop.pos.y += stepDelta * 40;
              drop.opacity -= stepDelta * 2.0;
              if (drop.opacity <= 0) drop.destroy();
            });
          } else {
            const drop = legacyContext.add([
              legacyContext.circle(dropRadius),
              legacyContext.pos(dropPos),
              legacyContext.color(24, 16, 12),
              legacyContext.opacity(0.85),
              legacyContext.z(20),
            ]) as OilSpillGameObject<TColor>;
            drop.onUpdate(() => {
              drop.pos.y += getDeltaTime() * 40;
              if (drop.opacity !== undefined) {
                drop.opacity -= getDeltaTime() * 2.0;
                if (drop.opacity <= 0) legacyContext.destroy(drop as unknown as TDestroyable);
              }
            });
          }
        }
      }
    }
  };

  let unregisterSystemUpdate: (() => void) | null = null;
  if (resolvedNativeRenderEngine) {
    unregisterSystemUpdate = registerNativeSceneUpdate(
      k,
      resolvedNativeRenderEngine,
      updateOilSpill
    );
  } else {
    legacyContext.onUpdate(() => {
      updateOilSpill(getDeltaTime());
    });
  }

  const activate = () => {
    isSystemActive = true;
    buoy.hidden = false;
  };

  const deactivate = () => {
    isSystemActive = false;
    buoy.hidden = true;
    patches.forEach((p) => {
      p.slick.hidden = true;
    });
  };

  const destroy = () => {
    unregisterSystemUpdate?.();
    unregisterSystemUpdate = null;
    for (let index = 0; index < createdNativeNodes.length; index++) {
      createdNativeNodes[index].destroy();
    }
    createdNativeNodes.length = 0;
  };

  if (resolvedNativeRenderEngine && typeof legacyContext.onSceneLeave === "function") {
    legacyContext.onSceneLeave(destroy);
  }

  const biomeMgr = getBiomeLifecycleManager();
  if (biomeMgr) {
    biomeMgr.registerModule({
      id: "oil_spill",
      name: "Mancha de Petróleo (Pré-Arraial)",
      minX: 16500,
      maxX: 19800,
      activate,
      deactivate,
      isActive: () => isSystemActive,
    });
  }

  return {
    activate,
    deactivate,
    destroy,
    isActive: () => isSystemActive,
  };
}
