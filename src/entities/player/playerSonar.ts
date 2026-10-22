import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import { hapticsSystem } from "../../systems/hapticsSystem";
import { getParticlePool } from "../../systems/particlePool";

interface RevealableTarget extends GameObj {
  reveal?: () => void;
}

export const activeSonarTargets: Set<RevealableTarget> = new Set();

export function registerSonarTarget(target: RevealableTarget): void {
  activeSonarTargets.add(target);
}

export function unregisterSonarTarget(target: RevealableTarget): void {
  activeSonarTargets.delete(target);
}

export class PlayerSonarManager {
  private k: KaboomCtx;
  private sonarCooldown = GAME_CONFIG.SONAR_COOLDOWN;

  constructor(k: KaboomCtx) {
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

  public triggerSonar(pos: Vec2, facingRight: boolean): void {
    if (this.sonarCooldown > 0) return;

    this.sonarCooldown = GAME_CONFIG.SONAR_COOLDOWN;
    audioSystem.playWhaleSong(1.0, 1.0);
    hapticsSystem.triggerSonar();

    const headPos = pos.add(this.k.vec2(facingRight ? 42 : -42, -4));

    // 1. Onda acústica concêntrica primária (360°)
    const primaryPulse = this.k.add([
      this.k.circle(15),
      this.k.pos(headPos),
      this.k.color(0, 230, 255),
      this.k.outline(3, this.k.rgb(180, 255, 255)),
      this.k.opacity(0.8),
      this.k.z(20),
    ]);

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
        this.k.pos(headPos),
        this.k.color(0, 160, 240),
        this.k.outline(2, this.k.rgb(120, 220, 255)),
        this.k.opacity(0.6),
        this.k.z(19),
      ]);

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
    revealEntitiesInSonarRadius(this.k, headPos, GAME_CONFIG.SONAR_RANGE);
  }
}

/**
 * Executa a varredura acústica em 360 graus, revelando entidades ocultas (krill, obstáculos, redes e relevo)
 * com anéis de reflexão sonora e partículas. Pode ser executado pelo jogador ou pela baleia-guia NPC.
 */
export function revealEntitiesInSonarRadius(
  k: KaboomCtx,
  centerPosition: Vec2,
  scanRadius: number = GAME_CONFIG.SONAR_RANGE
): number {
  const targets: RevealableTarget[] = [];
  if (activeSonarTargets.size > 0) {
    for (const target of activeSonarTargets) {
      if (!target.exists || target.exists()) {
        targets.push(target);
      } else {
        activeSonarTargets.delete(target);
      }
    }
  } else {
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
        targets.push(found[j]);
      }
    }
  }

  let revealedCount = 0;
  let echoCount = 0;
  targets.forEach((targetEntity: RevealableTarget) => {
    if (!targetEntity.pos) return;
    if (Math.abs(targetEntity.pos.x - centerPosition.x) > scanRadius) return;
    const distanceToObject = centerPosition.dist(targetEntity.pos);
    if (distanceToObject <= scanRadius) {
      revealedCount++;
      const travelTime = distanceToObject / 520;
      k.wait(travelTime, () => {
        if (typeof targetEntity.reveal === "function") {
          targetEntity.reveal();
        }

        // Anel de reflexão acústica adaptado ao tipo de objeto
        const isKrill = targetEntity.is && targetEntity.is(TAGS.KRILL);

        if (isKrill) {
          // Reflexão acústica especial para alimento: anel dourado com halo esmeralda e partículas radiantes
          const echoPing = k.add([
            k.circle(12),
            k.pos(targetEntity.pos),
            k.color(255, 220, 80),
            k.outline(2.5, k.rgb(100, 255, 210)),
            k.opacity(0.95),
            k.z(22),
          ]);

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
                pos: targetEntity.pos,
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
                k.pos(targetEntity.pos),
                k.color(255, 235, 120),
                k.opacity(0.9),
                k.z(23),
              ]);
              spark.onUpdate(() => {
                const dt = k.dt();
                spark.pos = spark.pos.add(dir.scale(dt));
                spark.opacity -= dt * 2.5;
                if (spark.opacity <= 0) k.destroy(spark);
              });
            }
          }
        } else {
          const echoPing = k.add([
            k.circle(8),
            k.pos(targetEntity.pos),
            k.color(0, 240, 255),
            k.outline(2, k.rgb(255, 255, 255)),
            k.opacity(0.9),
            k.z(22),
          ]);

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
  });

  return revealedCount;
}
