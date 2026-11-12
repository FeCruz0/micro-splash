import { GAME_CONFIG, TAGS } from "../config";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { getRandomFloat, getRandomInteger } from "../utils/random";
import { getActivePlayerObject } from "./player";
import { getParticlePool } from "../systems/particlePool";
import { getEntityFamilyTicker } from "../systems/entityFamilyTicker";
import {
  registerSonarTarget,
  unregisterSonarTarget,
  type RevealableTarget,
} from "./player/playerSonar";
import { resolveInitializedRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../engine/adapters/RenderEngineAdapter";
import {
  createNativeCircleNode,
  createNativeRectNode,
  type NativeVisualObjectAdapter,
} from "../engine/adapters/NativeRenderNodeFactory";

export interface KrillVector2D {
  x: number;
  y: number;
}

export interface KrillColor {
  r: number;
  g: number;
  b: number;
  lerp?: (other: KrillColor, t: number) => KrillColor;
}

export interface KrillGameObject {
  pos: KrillVector2D;
  opacity: number;
  hidden?: boolean;
  angle?: number;
  color?: KrillColor | unknown;
  scale?: KrillVector2D | { x: number; y: number } | number | unknown;
  radius?: number;
  exists: () => boolean;
  onUpdate: (cb: () => void) => void;
  onDestroy: (cb: () => void) => void;
  reveal?: () => void;
  isRevealed?: () => boolean;
  is?: (tag: string) => boolean;
}

export interface KrillClusterObject extends KrillGameObject {
  reveal: () => void;
  isRevealed: () => boolean;
  is: (tag: string) => boolean;
  setVisible?: (visible: boolean) => void;
}

export interface KrillEngineContext<TDestroyable = unknown, TColor = unknown> {
  add: (components: unknown[]) => unknown;
  destroy: (obj: TDestroyable) => void;
  dt: () => number;
  rect: (w: number, h: number, opt?: { radius?: number }) => unknown;
  circle: (r: number) => unknown;
  pos: (x: number | KrillVector2D, y?: number) => unknown;
  opacity: (o: number) => unknown;
  area: () => unknown;
  anchor: (a: "center") => unknown;
  rotate: (a: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  outline: (w: number, col: TColor) => unknown;
  scale: (s: number | KrillVector2D) => unknown;
  z: (v: number) => unknown;
  rgb: (r: number, g: number, b: number) => TColor;
  rand: (min: number, max: number) => number;
  choose: <T>(arr: T[]) => T;
  vec2: (x: number, y: number) => KrillVector2D;
}

interface BoidMember<TColor = unknown> {
  obj: KrillGameObject;
  nativeAdapter?: NativeVisualObjectAdapter;
  relX: number;
  relY: number;
  phase: number;
  speed: number;
  baseColor: TColor;
}

/**
 * Cria um cardume reativo de krill composto por 8 a 10 indivíduos com
 * comportamento coletivo de boids, ondulação senoidal, bioluminescência sutil,
 * dispersão assustada na proximidade da baleia e destaque vibrante (halo e cintilação)
 * ao ser iluminado pelo Biosonar 360°.
 */
export function createKrill<TDestroyable = unknown, TColor = unknown>(
  k: KrillEngineContext<TDestroyable, TColor>,
  position: KrillVector2D
): KrillClusterObject {
  let revealTimer = 0;
  let haloCircle: KrillGameObject | null = null;
  let haloInner: KrillGameObject | null = null;
  let nativeHaloCircle: NativeVisualObjectAdapter | null = null;
  let nativeHaloInner: NativeVisualObjectAdapter | null = null;

  const boidCount = 9;
  const boids: BoidMember<TColor>[] = [];
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const worldRenderContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;

  const createColorSafe = (red: number, green: number, blue: number): TColor =>
    typeof k.rgb === "function"
      ? k.rgb(red, green, blue)
      : ({ r: red, g: green, b: blue } as unknown as TColor);

  const setClusterVisible = (visible: boolean) => {
    for (let i = 0; i < boids.length; i++) {
      boids[i].obj.hidden = !visible;
    }
    if (haloCircle) haloCircle.hidden = !visible;
    if (haloInner) haloInner.hidden = !visible;
  };

  let krillCluster: KrillClusterObject;
  let nativeClusterAdapter: NativeVisualObjectAdapter | null = null;

  if (resolvedNativeRenderEngine && worldRenderContainer) {
    nativeClusterAdapter = createNativeRectNode(
      k,
      resolvedNativeRenderEngine,
      worldRenderContainer,
      {
        identifier: "krill_swarm_core",
        width: 26,
        height: 26,
        positionX: position.x,
        positionY: position.y,
        opacity: 0,
        anchor: "center",
        tags: [TAGS.KRILL, "krill_swarm"],
        onReveal: () => {
          revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
          spawnSonarAura();
        },
      }
    );
    krillCluster = nativeClusterAdapter as unknown as KrillClusterObject;
    krillCluster.isRevealed = () => revealTimer > 0;
    krillCluster.setVisible = setClusterVisible;
    registerSonarTarget(krillCluster as unknown as RevealableTarget);
  } else {
    // Entidade central com colisor para TAGS.KRILL (legado)
    krillCluster = k.add([
      k.rect(26, 26),
      k.pos(position),
      k.opacity(0), // Invisível, o colisor central representa o núcleo do cardume
      k.area(),
      k.anchor("center"),
      TAGS.KRILL,
      "krill_swarm",
      {
        reveal() {
          revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
          spawnSonarAura();
        },
        isRevealed() {
          return revealTimer > 0;
        },
        setVisible(visible: boolean) {
          setClusterVisible(visible);
        },
      },
    ]) as KrillClusterObject;
  }

  for (let i = 0; i < boidCount; i++) {
    const angle = (i / boidCount) * Math.PI * 2 + getRandomFloat(-0.2, 0.2);
    const radius = getRandomFloat(3, 14);
    const relX = Math.cos(angle) * radius;
    const relY = Math.sin(angle) * radius;

    const isHighContrast = accessibilitySystem.isHighContrast();
    const baseRgb: [number, number, number] = isHighContrast
      ? [255, 230, 50]
      : [255, getRandomInteger(150, 194), getRandomInteger(60, 99)];
    const baseColor = createColorSafe(baseRgb[0], baseRgb[1], baseRgb[2]);

    let boidObj: KrillGameObject;
    let nativeBoidAdapter: NativeVisualObjectAdapter | undefined;

    if (resolvedNativeRenderEngine && worldRenderContainer) {
      nativeBoidAdapter = createNativeRectNode(
        k,
        resolvedNativeRenderEngine,
        worldRenderContainer,
        {
          identifier: `krill_boid_${i}`,
          width: isHighContrast ? 4.8 : 4.2,
          height: isHighContrast ? 2.8 : 2.4,
          cornerRadius: 1,
          positionX: position.x + relX,
          positionY: position.y + relY,
          rotationDegrees: 0,
          fillColor: baseColor,
          outlineColor: isHighContrast ? [0, 0, 0] : undefined,
          outlineWidth: isHighContrast ? 1 : 0,
          opacity: isHighContrast ? 1.0 : 0.85,
          anchor: "center",
          scaleX: 1,
          scaleY: 1,
          zIndex: 11,
        }
      );
      boidObj = nativeBoidAdapter as unknown as KrillGameObject;
    } else {
      boidObj = k.add(
        [
          k.rect(isHighContrast ? 4.8 : 4.2, isHighContrast ? 2.8 : 2.4, { radius: 1 }),
          k.pos(position.x + relX, position.y + relY),
          k.rotate(0),
          k.color(baseColor),
          isHighContrast ? k.outline(1, k.rgb(0, 0, 0)) : null,
          k.opacity(isHighContrast ? 1.0 : 0.85),
          k.anchor("center"),
          k.scale(1),
          k.z(11),
        ].filter(Boolean)
      ) as KrillGameObject;
    }

    boids.push({
      obj: boidObj,
      nativeAdapter: nativeBoidAdapter,
      relX,
      relY,
      phase: getRandomFloat(0, Math.PI * 2),
      speed: getRandomFloat(1.8, 3.4),
      baseColor,
    });
  }

  const spawnSonarAura = () => {
    if (resolvedNativeRenderEngine && worldRenderContainer) {
      if (!nativeHaloCircle) {
        nativeHaloCircle = createNativeCircleNode(
          k,
          resolvedNativeRenderEngine,
          worldRenderContainer,
          {
            identifier: "krill_sonar_halo_outer",
            radius: 30,
            positionX: krillCluster.pos.x,
            positionY: krillCluster.pos.y,
            fillColor: [255, 215, 80],
            outlineColor: [100, 255, 220],
            outlineWidth: 2.5,
            opacity: 0.4,
            anchor: "center",
            zIndex: 9,
          }
        );
        haloCircle = nativeHaloCircle as unknown as KrillGameObject;
      }
      if (!nativeHaloInner) {
        nativeHaloInner = createNativeCircleNode(
          k,
          resolvedNativeRenderEngine,
          worldRenderContainer,
          {
            identifier: "krill_sonar_halo_inner",
            radius: 18,
            positionX: krillCluster.pos.x,
            positionY: krillCluster.pos.y,
            fillColor: [255, 235, 120],
            opacity: 0.3,
            anchor: "center",
            zIndex: 10,
          }
        );
        haloInner = nativeHaloInner as unknown as KrillGameObject;
      }
    } else {
      // 1. Halo externo bioluminescente
      if (!haloCircle) {
        haloCircle = k.add([
          k.circle(30),
          k.pos(krillCluster.pos),
          k.color(255, 215, 80),
          k.outline(2.5, k.rgb(100, 255, 220)),
          k.opacity(0.4),
          k.anchor("center"),
          k.z(9),
        ]) as KrillGameObject;
      }

      // 2. Halo pulsante interno
      if (!haloInner) {
        haloInner = k.add([
          k.circle(18),
          k.pos(krillCluster.pos),
          k.color(255, 235, 120),
          k.opacity(0.3),
          k.anchor("center"),
          k.z(10),
        ]) as KrillGameObject;
      }
    }

    // Partículas de explosão de bioluminescência via ParticlePool
    const pool = getParticlePool();
    if (pool) {
      for (let i = 0; i < 6; i++) {
        pool.spawnCircle({
          pos: {
            x: krillCluster.pos.x + getRandomFloat(-14, 14),
            y: krillCluster.pos.y + getRandomFloat(-14, 14),
          },
          radius: getRandomFloat(1.5, 2.5),
          color: { r: 255, g: 235, b: 120 },
          opacity: 0.9,
          z: 13,
          vel: { x: getRandomFloat(-35, 35), y: getRandomFloat(-35, 35) },
          fadeRate: 2.2,
          maxLife: 0.5,
        });
      }
    } else if (resolvedNativeRenderEngine && worldRenderContainer) {
      for (let i = 0; i < 6; i++) {
        const sparkNode = createNativeCircleNode(
          k,
          resolvedNativeRenderEngine,
          worldRenderContainer,
          {
            identifier: "krill_sonar_spark",
            radius: getRandomFloat(1.5, 2.5),
            positionX: krillCluster.pos.x + getRandomFloat(-14, 14),
            positionY: krillCluster.pos.y + getRandomFloat(-14, 14),
            fillColor: i % 2 === 0 ? [255, 235, 120] : [100, 255, 220],
            opacity: 0.9,
            zIndex: 13,
          }
        );
        const dirX = getRandomFloat(-35, 35);
        const dirY = getRandomFloat(-35, 35);
        sparkNode.onUpdate((sparkDeltaTime: number) => {
          sparkNode.pos.x += dirX * sparkDeltaTime;
          sparkNode.pos.y += dirY * sparkDeltaTime;
          sparkNode.opacity -= sparkDeltaTime * 2.2;
          if (sparkNode.opacity <= 0) sparkNode.destroy();
        });
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const spark = k.add([
          k.circle(k.rand(1.5, 2.5)),
          k.pos(krillCluster.pos.x + k.rand(-14, 14), krillCluster.pos.y + k.rand(-14, 14)),
          k.color(k.choose([k.rgb(255, 235, 120), k.rgb(100, 255, 220)])),
          k.opacity(0.9),
          k.z(13),
        ]) as KrillGameObject;
        const dir = k.vec2(k.rand(-35, 35), k.rand(-35, 35));
        spark.onUpdate(() => {
          spark.pos.x += dir.x * k.dt();
          spark.pos.y += dir.y * k.dt();
          spark.opacity -= k.dt() * 2.2;
          if (spark.opacity <= 0) k.destroy(spark as unknown as TDestroyable);
        });
      }
    }
  };

  let time = getRandomFloat(0, 10);
  const baseY = position.y;

  const updateKrillSwarm = (dt: number) => {
    for (let i = 0; i < boids.length; i++) {
      boids[i].obj.hidden = false;
    }

    time += dt;

    // Ondulação vertical coletiva do cardume
    const currentY = baseY + Math.sin(time * 2.2) * 5;
    krillCluster.pos.y = currentY;
    krillCluster.pos.x = position.x;

    // Detecção de proximidade com a baleia para dispersão reativa com matemática escalar (Fase 53)
    const player = getActivePlayerObject();
    let isScattering = false;
    let scatterDirX = 0;
    let scatterDirY = 0;

    if (player && (!player.exists || player.exists())) {
      const dx = krillCluster.pos.x - player.pos.x;
      const dy = krillCluster.pos.y - player.pos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 12100 && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        isScattering = true;
        scatterDirX = dx / dist;
        scatterDirY = dy / dist;
      }
    }

    // Atualização dos Halos do Sonar
    if (revealTimer > 0) {
      revealTimer -= dt;
      const revealProgress = Math.min(1, revealTimer / 1.5);
      const pulseBreathe = 0.85 + Math.sin(time * 5.5) * 0.15;

      if (haloCircle) {
        haloCircle.pos.x = krillCluster.pos.x;
        haloCircle.pos.y = krillCluster.pos.y;
        haloCircle.radius = (28 + Math.sin(time * 4) * 4) * pulseBreathe;
        haloCircle.opacity = 0.45 * revealProgress * pulseBreathe;
      }
      if (haloInner) {
        haloInner.pos.x = krillCluster.pos.x;
        haloInner.pos.y = krillCluster.pos.y;
        haloInner.radius = 16 * pulseBreathe;
        haloInner.opacity = 0.35 * revealProgress;
      }
    } else {
      if (haloCircle) {
        k.destroy(haloCircle as unknown as TDestroyable);
        haloCircle = null;
      }
      if (haloInner) {
        k.destroy(haloInner as unknown as TDestroyable);
        haloInner = null;
      }
    }

    for (const b of boids) {
      if (!b.obj.exists()) continue;

      if (isScattering) {
        // Dispersão em leque para longe da baleia (escalar)
        const scatterMag = 22 + Math.sin(b.phase + time * 3) * 8;
        const targetScatterX = scatterDirX * scatterMag;
        const targetScatterY = scatterDirY * scatterMag;
        const lerpFactor = Math.min(1, dt * 5.5);
        b.relX += (targetScatterX - b.relX) * lerpFactor;
        b.relY += (targetScatterY - b.relY) * lerpFactor;
      } else {
        // Órbita suave e coesão em torno do centro do cardume (escalar)
        const orbitAngle = time * b.speed + b.phase;
        const targetRelX = Math.cos(orbitAngle) * 11;
        const targetRelY = Math.sin(orbitAngle * 1.2) * 7;
        const lerpFactor = Math.min(1, dt * 3);
        b.relX += (targetRelX - b.relX) * lerpFactor;
        b.relY += (targetRelY - b.relY) * lerpFactor;
      }

      b.obj.pos.x = krillCluster.pos.x + b.relX;
      b.obj.pos.y = krillCluster.pos.y + b.relY;
      b.obj.angle = Math.sin(time * 3.5 + b.phase) * 14;

      if (revealTimer > 0) {
        // Iluminação de alta intensidade, dourado-esmeralda com brilho cintilante
        const revealFactor = Math.min(1, revealTimer / 1.2);
        const targetColor = createColorSafe(255, 240, 130);
        const baseCol = b.baseColor as unknown as KrillColor;
        const targetCol = targetColor as unknown as KrillColor;
        b.obj.color = baseCol.lerp
          ? baseCol.lerp(targetCol, revealFactor)
          : createColorSafe(
              baseCol.r + (targetCol.r - baseCol.r) * revealFactor,
              baseCol.g + (targetCol.g - baseCol.g) * revealFactor,
              baseCol.b + (targetCol.b - baseCol.b) * revealFactor
            );
        if (typeof b.obj.scale === "object" && b.obj.scale !== null && "x" in b.obj.scale) {
          (b.obj.scale as { x: number; y: number }).x = 1.35;
          (b.obj.scale as { x: number; y: number }).y = 1.35;
        } else {
          b.obj.scale = k.vec2(1.35, 1.35);
        }
        b.obj.opacity = 0.95;

        // Micro-cintilação biológica via ParticlePool
        if (getRandomFloat(0, 1) < 0.06) {
          const glintPool = getParticlePool();
          if (glintPool) {
            glintPool.spawnCircle({
              pos: { x: b.obj.pos.x, y: b.obj.pos.y },
              radius: 1.2,
              color: { r: 255, g: 235, b: 130 },
              opacity: 0.8,
              z: 12,
              vel: { x: 0, y: -12 },
              fadeRate: 2.5,
              maxLife: 0.4,
            });
          }
        }
      } else {
        b.obj.color = b.baseColor;
        if (typeof b.obj.scale === "object" && b.obj.scale !== null && "x" in b.obj.scale) {
          (b.obj.scale as { x: number; y: number }).x = 1;
          (b.obj.scale as { x: number; y: number }).y = 1;
        } else {
          b.obj.scale = k.vec2(1, 1);
        }
        // Glimmer bioluminescente orgânico suave no escuro
        b.obj.opacity = 0.72 + Math.sin(time * 4.5 + b.phase) * 0.22;
      }
    }
  };

  const familyTicker = getEntityFamilyTicker();
  if (familyTicker) {
    familyTicker.registerEntity({
      id: `krill_${Math.round(position.x)}_${Math.round(position.y)}_${Math.round(Math.random() * 100000)}`,
      family: "krill",
      getXPosition: () => krillCluster.pos.x,
      width: 30,
      targetObject: krillCluster,
      isDestroyed: () => (krillCluster.exists ? !krillCluster.exists() : false),
      update: updateKrillSwarm,
    });
  } else if (nativeClusterAdapter) {
    nativeClusterAdapter.onUpdate((deltaTimeInSeconds: number) => {
      if (nativeClusterAdapter.hidden) {
        for (let i = 0; i < boids.length; i++) {
          boids[i].obj.hidden = true;
        }
        return;
      }
      updateKrillSwarm(deltaTimeInSeconds);
    });
  } else {
    krillCluster.onUpdate(() => {
      if (krillCluster.hidden) {
        for (let i = 0; i < boids.length; i++) {
          boids[i].obj.hidden = true;
        }
        return;
      }
      updateKrillSwarm(k.dt());
    });
  }

  krillCluster.onDestroy(() => {
    if (resolvedNativeRenderEngine) {
      unregisterSonarTarget(krillCluster as unknown as RevealableTarget);
    }

    if (nativeHaloCircle) {
      nativeHaloCircle.destroy();
    } else if (haloCircle) {
      try {
        k.destroy(haloCircle as unknown as TDestroyable);
      } catch {}
    }
    if (nativeHaloInner) {
      nativeHaloInner.destroy();
    } else if (haloInner) {
      try {
        k.destroy(haloInner as unknown as TDestroyable);
      } catch {}
    }

    // Destrói todos os boids filhos
    for (const b of boids) {
      if (b.nativeAdapter) {
        b.nativeAdapter.destroy();
      } else if (b.obj.exists()) {
        k.destroy(b.obj as unknown as TDestroyable);
      }
    }

    // Micro-partículas bioluminescentes ao ser engolido via ParticlePool
    const pool = getParticlePool();
    if (pool) {
      for (let i = 0; i < 6; i++) {
        pool.spawnCircle({
          pos: {
            x: krillCluster.pos.x + getRandomFloat(-7, 7),
            y: krillCluster.pos.y + getRandomFloat(-7, 7),
          },
          radius: 1.8,
          color: { r: 255, g: 215, b: 120 },
          opacity: 0.85,
          z: 12,
          vel: { x: getRandomFloat(-35, 35), y: getRandomFloat(-35, 35) },
          fadeRate: 3.2,
          maxLife: 0.4,
        });
      }
    } else if (resolvedNativeRenderEngine && worldRenderContainer) {
      for (let i = 0; i < 6; i++) {
        const gulpParticle = createNativeCircleNode(
          k,
          resolvedNativeRenderEngine,
          worldRenderContainer,
          {
            identifier: "krill_gulp_particle",
            radius: 1.8,
            positionX: krillCluster.pos.x + getRandomFloat(-7, 7),
            positionY: krillCluster.pos.y + getRandomFloat(-7, 7),
            fillColor: [255, 215, 120],
            opacity: 0.85,
            zIndex: 12,
          }
        );
        const velX = getRandomFloat(-35, 35);
        const velY = getRandomFloat(-35, 35);
        gulpParticle.onUpdate((particleDeltaTime: number) => {
          gulpParticle.pos.x += velX * particleDeltaTime;
          gulpParticle.pos.y += velY * particleDeltaTime;
          gulpParticle.opacity -= particleDeltaTime * 3.2;
          if (gulpParticle.opacity <= 0) gulpParticle.destroy();
        });
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const p = k.add([
          k.circle(1.8),
          k.pos(
            krillCluster.pos.x + getRandomFloat(-7, 7),
            krillCluster.pos.y + getRandomFloat(-7, 7)
          ),
          k.color(255, 215, 120),
          k.opacity(0.85),
          k.z(12),
        ]) as KrillGameObject;
        const dir = k.vec2(getRandomFloat(-35, 35), getRandomFloat(-35, 35));
        p.onUpdate(() => {
          p.pos.x += dir.x * k.dt();
          p.pos.y += dir.y * k.dt();
          p.opacity -= k.dt() * 3.2;
          if (p.opacity <= 0) k.destroy(p as unknown as TDestroyable);
        });
      }
    }
  });

  return krillCluster;
}
