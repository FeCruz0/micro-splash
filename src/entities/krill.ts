import { GAME_CONFIG, TAGS } from "../config";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { getRandomFloat, getRandomInteger } from "../utils/random";
import { getActivePlayerObject } from "./player";

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

  // Entidade central com colisor para TAGS.KRILL
  const krillCluster = k.add([
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
    },
  ]) as KrillClusterObject;

  const boidCount = 9;
  const boids: BoidMember<TColor>[] = [];

  for (let i = 0; i < boidCount; i++) {
    const angle = (i / boidCount) * Math.PI * 2 + getRandomFloat(-0.2, 0.2);
    const radius = getRandomFloat(3, 14);
    const relX = Math.cos(angle) * radius;
    const relY = Math.sin(angle) * radius;

    const isHighContrast = accessibilitySystem.isHighContrast();
    const baseColor = isHighContrast
      ? k.rgb(255, 230, 50)
      : k.rgb(255, getRandomInteger(150, 194), getRandomInteger(60, 99));

    const boidObj = k.add(
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

    boids.push({
      obj: boidObj,
      relX,
      relY,
      phase: getRandomFloat(0, Math.PI * 2),
      speed: getRandomFloat(1.8, 3.4),
      baseColor,
    });
  }

  const spawnSonarAura = () => {
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

    // Partículas de explosão de bioluminescência
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
  };

  let time = getRandomFloat(0, 10);
  const baseY = position.y;

  krillCluster.onUpdate(() => {
    const dt = k.dt();
    time += dt;

    // Ondulação vertical coletiva do cardume
    const currentY = baseY + Math.sin(time * 2.2) * 5;
    krillCluster.pos.y = currentY;
    krillCluster.pos.x = position.x;

    // Se estiver fora da tela pelo culling espacial, pula cálculos de dispersão
    if (krillCluster.hidden) {
      return;
    }

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
        haloCircle.pos = krillCluster.pos;
        haloCircle.radius = (28 + Math.sin(time * 4) * 4) * pulseBreathe;
        haloCircle.opacity = 0.45 * revealProgress * pulseBreathe;
      }
      if (haloInner) {
        haloInner.pos = krillCluster.pos;
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
        const targetColor = k.rgb(255, 240, 130);
        const baseCol = b.baseColor as unknown as KrillColor;
        const targetCol = targetColor as unknown as KrillColor;
        b.obj.color = baseCol.lerp
          ? baseCol.lerp(targetCol, revealFactor)
          : k.rgb(
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

        // Micro-cintilação biológica
        if (getRandomFloat(0, 1) < 0.06) {
          const glint = k.add([
            k.circle(1.2),
            k.pos(b.obj.pos),
            k.color(255, 235, 130),
            k.opacity(0.8),
            k.z(12),
          ]) as KrillGameObject;
          glint.onUpdate(() => {
            glint.opacity -= dt * 2.5;
            glint.pos.y -= dt * 12;
            if (glint.opacity <= 0) k.destroy(glint as unknown as TDestroyable);
          });
        }
      } else {
        b.obj.color = b.baseColor;
        b.obj.scale = k.vec2(1, 1);
        // Glimmer bioluminescente orgânico suave no escuro
        b.obj.opacity = 0.72 + Math.sin(time * 4.5 + b.phase) * 0.22;
      }
    }
  });

  krillCluster.onDestroy(() => {
    if (haloCircle) {
      try {
        k.destroy(haloCircle as unknown as TDestroyable);
      } catch {}
    }
    if (haloInner) {
      try {
        k.destroy(haloInner as unknown as TDestroyable);
      } catch {}
    }

    // Destrói todos os boids filhos
    for (const b of boids) {
      if (b.obj.exists()) {
        k.destroy(b.obj as unknown as TDestroyable);
      }
    }

    // Micro-partículas bioluminescentes ao ser engolido
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
  });

  return krillCluster;
}
