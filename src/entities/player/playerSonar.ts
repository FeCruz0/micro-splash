import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import { hapticsSystem } from "../../systems/hapticsSystem";
import { getParticlePool } from "../../systems/particlePool";

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

    // 3. Varredura de 360° de todos os objetos e relevos submersos
    const targets = [
      ...this.k.get(TAGS.TRASH),
      ...this.k.get(TAGS.KRILL),
      ...this.k.get(TAGS.NET),
      ...this.k.get("boqueirao_rock"),
      ...this.k.get("island_cliff"),
      ...this.k.get("island_cliff_visual"),
      ...this.k.get("ocean_relief"),
    ];

    let echoCount = 0;
    targets.forEach((targetEntity: any) => {
      const distanceToObject = headPos.dist(targetEntity.pos);
      if (distanceToObject <= GAME_CONFIG.SONAR_RANGE) {
        const travelTime = distanceToObject / 520;
        this.k.wait(travelTime, () => {
          if (targetEntity.reveal) {
            targetEntity.reveal();
          } else {
            targetEntity.opacity = 1;
          }

          // Anel de reflexão acústica adaptado ao tipo de objeto
          const isKrill = targetEntity.is && targetEntity.is(TAGS.KRILL);

          if (isKrill) {
            // Reflexão acústica especial para alimento: anel dourado com halo esmeralda e partículas radiantes
            const echoPing = this.k.add([
              this.k.circle(12),
              this.k.pos(targetEntity.pos),
              this.k.color(255, 220, 80),
              this.k.outline(2.5, this.k.rgb(100, 255, 210)),
              this.k.opacity(0.95),
              this.k.z(22),
            ]);

            echoPing.onUpdate(() => {
              const dt = this.k.dt();
              echoPing.radius += dt * 65;
              echoPing.opacity -= dt * 2.2;
              if (echoPing.opacity <= 0) this.k.destroy(echoPing);
            });

            // 4 cintilações radiantes em cruz/estrela
            const pool = getParticlePool();
            for (let s = 0; s < 4; s++) {
              const ang = (s / 4) * Math.PI * 2 + Math.PI / 4;
              const dir = this.k.vec2(Math.cos(ang) * 55, Math.sin(ang) * 55);

              if (pool) {
                pool.spawnCircle({
                  pos: targetEntity.pos,
                  radius: 2,
                  color: this.k.rgb(255, 235, 120),
                  opacity: 0.9,
                  z: 23,
                  vel: dir,
                  fadeRate: 2.5,
                  maxLife: 0.4,
                });
              } else {
                const spark = this.k.add([
                  this.k.circle(2),
                  this.k.pos(targetEntity.pos),
                  this.k.color(255, 235, 120),
                  this.k.opacity(0.9),
                  this.k.z(23),
                ]);
                spark.onUpdate(() => {
                  const dt = this.k.dt();
                  spark.pos = spark.pos.add(dir.scale(dt));
                  spark.opacity -= dt * 2.5;
                  if (spark.opacity <= 0) this.k.destroy(spark);
                });
              }
            }
          } else {
            const echoPing = this.k.add([
              this.k.circle(8),
              this.k.pos(targetEntity.pos),
              this.k.color(0, 240, 255),
              this.k.outline(2, this.k.rgb(255, 255, 255)),
              this.k.opacity(0.9),
              this.k.z(22),
            ]);

            echoPing.onUpdate(() => {
              const dt = this.k.dt();
              echoPing.radius += dt * 45;
              echoPing.opacity -= dt * 2.8;
              if (echoPing.opacity <= 0) this.k.destroy(echoPing);
            });
          }

          if (echoCount < 4) {
            echoCount++;
            audioSystem.playSonarEcho(Math.min(280, distanceToObject * 0.35));
          }
        });
      }
    });
  }
}
