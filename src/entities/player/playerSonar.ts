import { GAME_CONFIG, TAGS } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import { hapticsSystem } from "../../systems/hapticsSystem";
import { getParticlePool } from "../../systems/particlePool";
import type { PlayerVector2D, StrictPlayerVector2D } from "./types";
import { resolveInitializedRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import {
  createNativeCircleNode,
  scheduleNativeSceneDelay,
} from "../../engine/adapters/NativeRenderNodeFactory";

export interface RevealableTarget {
  pos?: StrictPlayerVector2D | PlayerVector2D;
  reveal?: () => void;
  exists?: () => boolean;
  is?: (tag: string) => boolean;
  [key: string]: unknown;
}

export interface PlayerSonarPulseObject {
  radius: number;
  opacity: number;
  pos?: StrictPlayerVector2D | PlayerVector2D;
  onUpdate: (cb: () => void) => void;
  [key: string]: unknown;
}

export interface PlayerSonarEngineContext {
  vec2(x: number, y: number): StrictPlayerVector2D;
  rgb(r: number, g: number, b: number): unknown;
  circle(radius: number): unknown;
  pos(x: number | PlayerVector2D, y?: number): unknown;
  color(r: number | unknown, g?: number, b?: number): unknown;
  outline(width: number, col: unknown): unknown;
  opacity(val: number): unknown;
  z(layer: number): unknown;
  add(comps: unknown[]): unknown;
  destroy(obj?: unknown): void;
  dt(): number;
  wait(time: number, cb: () => void): void;
  get(tag: string): RevealableTarget[];
}

export const activeSonarTargets: Set<RevealableTarget> = new Set();

export function registerSonarTarget(target: RevealableTarget): void {
  activeSonarTargets.add(target);
}

export function unregisterSonarTarget(target: RevealableTarget): void {
  activeSonarTargets.delete(target);
}

export class PlayerSonarManager {
  private k: PlayerSonarEngineContext;
  private sonarCooldown = GAME_CONFIG.SONAR_COOLDOWN;

  constructor(k: PlayerSonarEngineContext) {
    this.k = k;
  }

  public updateCooldown(dt: number): void {
    if (this.sonarCooldown > 0) {
      this.sonarCooldown -= dt;
    }
  }

  public canTrigger(): boolean {
    return this.sonarCooldown <= 0;
  }

  public triggerSonar(pos: StrictPlayerVector2D | PlayerVector2D, facingRight: boolean): void {
    if (this.sonarCooldown > 0) return;

    this.sonarCooldown = GAME_CONFIG.SONAR_COOLDOWN;
    audioSystem.playWhaleSong(1.0, 1.0);
    hapticsSystem.triggerSonar();

    const resolvedNativeRenderEngine = resolveInitializedRenderEngine(this.k);
    const worldRenderContainer = resolvedNativeRenderEngine
      ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
      : null;

    const headOffsetX = facingRight ? 42 : -42;
    const headOffsetY = -4;
    const headPos: PlayerVector2D = {
      x: pos.x + headOffsetX,
      y: pos.y + headOffsetY,
    };

    if (resolvedNativeRenderEngine && worldRenderContainer) {
      // 1. Onda acústica concêntrica primária (360°) no pipeline nativo PixiJS v8
      const primaryPulse = createNativeCircleNode(
        this.k,
        resolvedNativeRenderEngine,
        worldRenderContainer,
        {
          identifier: "player_sonar_primary_pulse",
          radius: 15,
          positionX: headPos.x,
          positionY: headPos.y,
          fillColor: [0, 230, 255],
          outlineColor: [180, 255, 255],
          outlineWidth: 3,
          opacity: 0.8,
          zIndex: 20,
        }
      );

      primaryPulse.onUpdate((deltaTimeInSeconds: number) => {
        primaryPulse.radius += deltaTimeInSeconds * 520;
        primaryPulse.opacity -= deltaTimeInSeconds * 0.9;
        if (primaryPulse.opacity <= 0 || primaryPulse.radius >= GAME_CONFIG.SONAR_RANGE) {
          primaryPulse.destroy();
        }
      });

      // 2. Onda secundária (eco sonoplástico concêntrico)
      scheduleNativeSceneDelay(this.k, resolvedNativeRenderEngine, 0.08, () => {
        const secondaryPulse = createNativeCircleNode(
          this.k,
          resolvedNativeRenderEngine,
          worldRenderContainer,
          {
            identifier: "player_sonar_secondary_pulse",
            radius: 10,
            positionX: headPos.x,
            positionY: headPos.y,
            fillColor: [0, 160, 240],
            outlineColor: [120, 220, 255],
            outlineWidth: 2,
            opacity: 0.6,
            zIndex: 19,
          }
        );

        secondaryPulse.onUpdate((deltaTimeInSeconds: number) => {
          secondaryPulse.radius += deltaTimeInSeconds * 480;
          secondaryPulse.opacity -= deltaTimeInSeconds * 0.85;
          if (secondaryPulse.opacity <= 0 || secondaryPulse.radius >= GAME_CONFIG.SONAR_RANGE) {
            secondaryPulse.destroy();
          }
        });
      });

      // 3. Varredura acústica com revelação de itens e ecos concêntricos
      revealEntitiesInSonarRadius(this.k, headPos, GAME_CONFIG.SONAR_RANGE);
      return;
    }

    const legacyHeadOffset = this.k.vec2(headOffsetX, headOffsetY);
    const legacyHeadPos =
      typeof pos.add === "function"
        ? (pos.add(legacyHeadOffset) as StrictPlayerVector2D)
        : this.k.vec2(pos.x + legacyHeadOffset.x, pos.y + legacyHeadOffset.y);

    // 1. Onda acústica concêntrica primária (360°)
    const primaryPulse = this.k.add([
      this.k.circle(15),
      this.k.pos(legacyHeadPos),
      this.k.color(0, 230, 255),
      this.k.outline(3, this.k.rgb(180, 255, 255)),
      this.k.opacity(0.8),
      this.k.z(20),
    ]) as PlayerSonarPulseObject;

    primaryPulse.onUpdate(() => {
      const dt = this.k.dt();
      primaryPulse.radius += dt * 520;
      primaryPulse.opacity -= dt * 0.9;
      if (primaryPulse.opacity <= 0 || primaryPulse.radius >= GAME_CONFIG.SONAR_RANGE) {
        this.k.destroy(primaryPulse);
      }
    });

    // 2. Onda secundária (eco sonoplástico concêntrico)
    this.k.wait(0.08, () => {
      const secondaryPulse = this.k.add([
        this.k.circle(10),
        this.k.pos(legacyHeadPos),
        this.k.color(0, 160, 240),
        this.k.outline(2, this.k.rgb(120, 220, 255)),
        this.k.opacity(0.6),
        this.k.z(19),
      ]) as PlayerSonarPulseObject;

      secondaryPulse.onUpdate(() => {
        const dt = this.k.dt();
        secondaryPulse.radius += dt * 480;
        secondaryPulse.opacity -= dt * 0.85;
        if (secondaryPulse.opacity <= 0 || secondaryPulse.radius >= GAME_CONFIG.SONAR_RANGE) {
          this.k.destroy(secondaryPulse);
        }
      });
    });

    // 3. Varredura acústica com revelação de itens e ecos concêntricos
    revealEntitiesInSonarRadius(this.k, legacyHeadPos, GAME_CONFIG.SONAR_RANGE);
  }
}

/**
 * Executa a varredura acústica em 360 graus, revelando entidades ocultas (krill, obstáculos, redes e relevo)
 * com anéis de reflexão sonora e partículas. Pode ser executado pelo jogador ou pela baleia-guia NPC.
 */
export function revealEntitiesInSonarRadius(
  k: PlayerSonarEngineContext,
  centerPosition: StrictPlayerVector2D | PlayerVector2D,
  scanRadius: number = GAME_CONFIG.SONAR_RANGE
): number {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const worldRenderContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;

  const targets: RevealableTarget[] = [];
  const seenTargets = new Set<RevealableTarget>();

  if (activeSonarTargets.size > 0) {
    for (const target of activeSonarTargets) {
      if (!target.exists || target.exists()) {
        targets.push(target);
        seenTargets.add(target);
      } else {
        activeSonarTargets.delete(target);
      }
    }
  }

  if (typeof k.get === "function") {
    const sonarTags = [
      TAGS.TRASH,
      TAGS.KRILL,
      TAGS.NET,
      "boqueirao_rock",
      "island_cliff_visual",
      "ocean_relief",
    ];
    for (let i = 0; i < sonarTags.length; i++) {
      const found = k.get(sonarTags[i]);
      for (let j = 0; j < found.length; j++) {
        const candidate = found[j];
        if (!seenTargets.has(candidate)) {
          seenTargets.add(candidate);
          targets.push(candidate);
        }
      }
    }
  }

  const scheduleEchoDelay = (delaySeconds: number, callback: () => void) => {
    if (resolvedNativeRenderEngine) {
      scheduleNativeSceneDelay(k, resolvedNativeRenderEngine, delaySeconds, callback);
    } else {
      k.wait(delaySeconds, callback);
    }
  };

  let revealedCount = 0;
  let echoCount = 0;
  const targetCount = targets.length;
  for (let tIdx = 0; tIdx < targetCount; tIdx++) {
    const targetEntity = targets[tIdx] as RevealableTarget;
    if (!targetEntity.pos) continue;
    if (Math.abs(targetEntity.pos.x - centerPosition.x) > scanRadius) continue;
    const distanceToObject =
      typeof centerPosition.dist === "function"
        ? centerPosition.dist(targetEntity.pos)
        : Math.hypot(centerPosition.x - targetEntity.pos.x, centerPosition.y - targetEntity.pos.y);
    if (distanceToObject <= scanRadius) {
      revealedCount++;
      const travelTime = distanceToObject / 520;
      scheduleEchoDelay(travelTime, () => {
        if (typeof targetEntity.reveal === "function") {
          targetEntity.reveal();
        }

        // Anel de reflexão acústica adaptado ao tipo de objeto
        const isKrill = targetEntity.is && targetEntity.is(TAGS.KRILL);
        const targetPos = targetEntity.pos!;

        if (resolvedNativeRenderEngine && worldRenderContainer) {
          if (isKrill) {
            const echoPing = createNativeCircleNode(
              k,
              resolvedNativeRenderEngine,
              worldRenderContainer,
              {
                identifier: "sonar_krill_echo_ping",
                radius: 12,
                positionX: targetPos.x,
                positionY: targetPos.y,
                fillColor: [255, 220, 80],
                outlineColor: [100, 255, 210],
                outlineWidth: 2.5,
                opacity: 0.95,
                zIndex: 22,
              }
            );
            echoPing.onUpdate((deltaTimeInSeconds: number) => {
              echoPing.radius += deltaTimeInSeconds * 65;
              echoPing.opacity -= deltaTimeInSeconds * 2.2;
              if (echoPing.opacity <= 0) echoPing.destroy();
            });

            const pool = getParticlePool();
            for (let s = 0; s < 4; s++) {
              const ang = (s / 4) * Math.PI * 2 + Math.PI / 4;
              const dirX = Math.cos(ang) * 55;
              const dirY = Math.sin(ang) * 55;
              if (pool) {
                pool.spawnCircle({
                  pos: targetPos,
                  radius: 2,
                  color: typeof k.rgb === "function" ? k.rgb(255, 235, 120) : [255, 235, 120],
                  opacity: 0.9,
                  z: 23,
                  vel: { x: dirX, y: dirY },
                  fadeRate: 2.5,
                  maxLife: 0.4,
                });
              } else {
                const spark = createNativeCircleNode(
                  k,
                  resolvedNativeRenderEngine,
                  worldRenderContainer,
                  {
                    identifier: "sonar_echo_spark",
                    radius: 2,
                    positionX: targetPos.x,
                    positionY: targetPos.y,
                    fillColor: [255, 235, 120],
                    opacity: 0.9,
                    zIndex: 23,
                  }
                );
                spark.onUpdate((deltaTimeInSeconds: number) => {
                  spark.pos.x += dirX * deltaTimeInSeconds;
                  spark.pos.y += dirY * deltaTimeInSeconds;
                  spark.opacity -= deltaTimeInSeconds * 2.5;
                  if (spark.opacity <= 0) spark.destroy();
                });
              }
            }
          } else {
            const echoPing = createNativeCircleNode(
              k,
              resolvedNativeRenderEngine,
              worldRenderContainer,
              {
                identifier: "sonar_object_echo_ping",
                radius: 8,
                positionX: targetPos.x,
                positionY: targetPos.y,
                fillColor: [0, 240, 255],
                outlineColor: [255, 255, 255],
                outlineWidth: 2,
                opacity: 0.9,
                zIndex: 22,
              }
            );
            echoPing.onUpdate((deltaTimeInSeconds: number) => {
              echoPing.radius += deltaTimeInSeconds * 45;
              echoPing.opacity -= deltaTimeInSeconds * 2.8;
              if (echoPing.opacity <= 0) echoPing.destroy();
            });
          }
        } else if (isKrill) {
          // Reflexão acústica especial para alimento: anel dourado com halo esmeralda e partículas radiantes
          const echoPing = k.add([
            k.circle(12),
            k.pos(targetPos),
            k.color(255, 220, 80),
            k.outline(2.5, k.rgb(100, 255, 210)),
            k.opacity(0.95),
            k.z(22),
          ]) as PlayerSonarPulseObject;

          echoPing.onUpdate(() => {
            const dt = k.dt();
            echoPing.radius += dt * 65;
            echoPing.opacity -= dt * 2.2;
            if (echoPing.opacity <= 0) k.destroy(echoPing);
          });

          // 4 cintilações radiantes em cruz/estrela
          const pool = getParticlePool();
          for (let s = 0; s < 4; s++) {
            const ang = (s / 4) * Math.PI * 2 + Math.PI / 4;
            const dir = k.vec2(Math.cos(ang) * 55, Math.sin(ang) * 55);

            if (pool) {
              pool.spawnCircle({
                pos: targetPos,
                radius: 2,
                color: k.rgb(255, 235, 120),
                opacity: 0.9,
                z: 23,
                vel: dir,
                fadeRate: 2.5,
                maxLife: 0.4,
              });
            } else {
              const spark = k.add([
                k.circle(2),
                k.pos(targetPos),
                k.color(255, 235, 120),
                k.opacity(0.9),
                k.z(23),
              ]) as PlayerSonarPulseObject;
              spark.onUpdate(() => {
                const dt = k.dt();
                if (spark.pos) {
                  spark.pos.x += dir.x * dt;
                  spark.pos.y += dir.y * dt;
                }
                spark.opacity -= dt * 2.5;
                if (spark.opacity <= 0) k.destroy(spark);
              });
            }
          }
        } else {
          const echoPing = k.add([
            k.circle(8),
            k.pos(targetPos),
            k.color(0, 240, 255),
            k.outline(2, k.rgb(255, 255, 255)),
            k.opacity(0.9),
            k.z(22),
          ]) as PlayerSonarPulseObject;

          echoPing.onUpdate(() => {
            const dt = k.dt();
            echoPing.radius += dt * 45;
            echoPing.opacity -= dt * 2.8;
            if (echoPing.opacity <= 0) k.destroy(echoPing);
          });
        }

        if (echoCount < 4) {
          echoCount++;
          audioSystem.playSonarEcho(Math.min(280, distanceToObject * 0.35));
        }
      });
    }
  }

  return revealedCount;
}
