/**
 * Sistema de Eventos Climáticos Dinâmicos na Rota (Fase 19.1) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";
import { getRandomFloat } from "../utils/random";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";
import { getParticlePool } from "./particlePool";
import type { IRenderEngine, IGraphicsNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  isRenderEngine,
  resolveCameraX,
  type LegacyEngineBridge,
} from "../engine/adapters/LegacyBridge";

/**
 * Tipo identificador do micro-clima em execução.
 */
export type WeatherType = "polar_blizzard" | "open_sea_gale" | "arraial_solar_calm" | "clear";

/**
 * Interface que delimita uma região climática ao longo do mapa de migração.
 */
export interface WeatherZone {
  /** Categoria do fenômeno meteorológico */
  type: WeatherType;
  /** Coordenada X inicial do evento em metros de migração */
  startX: number;
  /** Coordenada X final do evento em metros de migração */
  endX: number;
  /** Distância de transição suave de entrada (fade-in) em metros */
  fadeInDist: number;
  /** Distância de transição suave de saída (fade-out) em metros */
  fadeOutDist: number;
}

export const WEATHER_ZONES: WeatherZone[] = [
  // 1. Nevasca polar passageira na Antártica
  {
    type: "polar_blizzard",
    startX: 800,
    endX: 4200,
    fadeInDist: 350,
    fadeOutDist: 350,
  },
  // 2. Céu encoberto com vendaval em alto-mar (Travessia Pelágica)
  {
    type: "open_sea_gale",
    startX: 9000,
    endX: 15500,
    fadeInDist: 400,
    fadeOutDist: 400,
  },
  // 3. Calmaria solar radiante em Arraial do Cabo
  {
    type: "arraial_solar_calm",
    startX: 25000,
    endX: 30000,
    fadeInDist: 400,
    fadeOutDist: 400,
  },
];

/**
 * Calcula deterministicamente o micro-clima ativo e sua intensidade (0.0 a 1.0)
 * para uma dada coordenada X da rota migratória.
 */
export function calculateWeatherAtDistance(x: number): {
  weather: WeatherType;
  intensity: number;
} {
  for (const zone of WEATHER_ZONES) {
    if (x >= zone.startX && x <= zone.endX) {
      let intensity = 1.0;

      if (x < zone.startX + zone.fadeInDist && zone.fadeInDist > 0) {
        intensity = (x - zone.startX) / zone.fadeInDist;
      } else if (x > zone.endX - zone.fadeOutDist && zone.fadeOutDist > 0) {
        intensity = (zone.endX - x) / zone.fadeOutDist;
      }

      return {
        weather: zone.type,
        intensity: Math.max(0, Math.min(1, intensity)),
      };
    }
  }

  return { weather: "clear", intensity: 0 };
}

export interface WeatherParticleObject {
  pos: { x: number; y: number };
  opacity: number;
  tags?: string[];
  hidden?: boolean;
}

interface WeatherParticle {
  obj: WeatherParticleObject;
  relX: number;
  relY: number;
  speedX: number;
  speedY: number;
  swaySpeed: number;
  swayAmp: number;
  phase: number;
  baseOpacity: number;
}

class PixiWeatherParticleProxy implements WeatherParticleObject {
  private readonly node: IGraphicsNode;
  private currentX: number;
  private currentY: number;
  tags: string[];

  constructor(node: IGraphicsNode, tag: string) {
    this.node = node;
    this.currentX = 0;
    this.currentY = 0;
    this.tags = [tag];
  }

  get pos(): { x: number; y: number } {
    const nodeRef = this.node;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      get x() {
        return self.currentX;
      },
      set x(val: number) {
        self.currentX = val;
        nodeRef.setPosition(val, self.currentY);
      },
      get y() {
        return self.currentY;
      },
      set y(val: number) {
        self.currentY = val;
        nodeRef.setPosition(self.currentX, val);
      },
    };
  }
  set pos(val: { x: number; y: number }) {
    this.currentX = val.x;
    this.currentY = val.y;
    this.node.setPosition(val.x, val.y);
  }

  get opacity(): number {
    return this.node.getOpacity();
  }
  set opacity(val: number) {
    this.node.setOpacity(val);
  }

  get hidden(): boolean {
    return !this.node.isVisible();
  }
  set hidden(val: boolean) {
    this.node.setVisible(!val);
  }

  destroy(): void {
    this.node.destroy();
  }
}

/**
 * Inicializa os geradores de partículas atmosféricas e micro-climas dinâmicos.
 */
export function setupWeatherSystem(
  engineOrContext: IRenderEngine | LegacyEngineBridge,
  playerController: PlayerController
) {
  const isPixi = isRenderEngine(engineOrContext);
  const screenW = isPixi
    ? engineOrContext.getDimensions().width
    : typeof engineOrContext.width === "function"
      ? engineOrContext.width()
      : 640;
  const screenH = isPixi
    ? engineOrContext.getDimensions().height
    : typeof engineOrContext.height === "function"
      ? engineOrContext.height()
      : 360;

  type Pool = NonNullable<ReturnType<typeof getParticlePool>>;
  type ParticlePos = Parameters<Pool["spawnCircle"]>[0]["pos"];
  type ParticleColor = Parameters<Pool["spawnCircle"]>[0]["color"];
  const asPos = (x: number, y: number) => ({ x, y }) as unknown as ParticlePos;
  const asColor = (r: number, g: number, b: number) => ({ r, g, b }) as unknown as ParticleColor;

  const snowflakeCount = 32;
  const snowflakes: WeatherParticle[] = [];

  const raindropCount = 42;
  const raindrops: WeatherParticle[] = [];

  const glintCount = 26;
  const goldenGlints: WeatherParticle[] = [];

  if (isPixi) {
    const stageRoot = engineOrContext.getStageRoot();

    // 1. POOL DE NEVASCA POLAR
    for (let i = 0; i < snowflakeCount; i++) {
      const size = getRandomFloat(1.5, 3.2);
      const g = engineOrContext.createGraphics("weather_snow");
      g.drawCircle(0, 0, size, { fill: { color: [240, 248, 255], alpha: 1 } });
      g.setOpacity(0);
      g.setZIndex(26);
      stageRoot.addChild(g);

      const proxy = new PixiWeatherParticleProxy(g, "weather_snow");
      snowflakes.push({
        obj: proxy,
        relX: getRandomFloat(-50, screenW + 50),
        relY: getRandomFloat(-20, 130),
        speedX: getRandomFloat(80, 160),
        speedY: getRandomFloat(40, 85),
        swaySpeed: getRandomFloat(2.0, 4.5),
        swayAmp: getRandomFloat(12, 28),
        phase: getRandomFloat(0, Math.PI * 2),
        baseOpacity: getRandomFloat(0.45, 0.85),
      });
    }

    // 2. POOL DE VENDAVAL E CHUVA
    for (let i = 0; i < raindropCount; i++) {
      const len = getRandomFloat(8, 15);
      const g = engineOrContext.createGraphics("weather_rain");
      g.drawRoundedRect(0, 0, 1.6, len, 0.8, { fill: { color: [200, 225, 255], alpha: 1 } });
      g.setRotation((-22 * Math.PI) / 180);
      g.setOpacity(0);
      g.setZIndex(26);
      stageRoot.addChild(g);

      const proxy = new PixiWeatherParticleProxy(g, "weather_rain");
      raindrops.push({
        obj: proxy,
        relX: getRandomFloat(-60, screenW + 60),
        relY: getRandomFloat(-30, 130),
        speedX: getRandomFloat(180, 290),
        speedY: getRandomFloat(300, 480),
        swaySpeed: 0,
        swayAmp: 0,
        phase: 0,
        baseOpacity: getRandomFloat(0.35, 0.7),
      });
    }

    // 3. POOL DE CALMARIA SOLAR
    for (let i = 0; i < glintCount; i++) {
      const size = getRandomFloat(1.8, 3.8);
      const g = engineOrContext.createGraphics("weather_sun_glint");
      g.drawCircle(0, 0, size, { fill: { color: [255, 230, 110], alpha: 1 } });
      g.setOpacity(0);
      g.setZIndex(17);
      stageRoot.addChild(g);

      const proxy = new PixiWeatherParticleProxy(g, "weather_sun_glint");
      goldenGlints.push({
        obj: proxy,
        relX: getRandomFloat(0, screenW),
        relY: getRandomFloat(40, screenH - 20),
        speedX: getRandomFloat(15, 38),
        speedY: getRandomFloat(-8, 8),
        swaySpeed: getRandomFloat(1.2, 2.5),
        swayAmp: getRandomFloat(8, 18),
        phase: getRandomFloat(0, Math.PI * 2),
        baseOpacity: getRandomFloat(0.3, 0.65),
      });
    }

    let isWeatherActive = true;
    let wasBlizzardActive = false;
    let wasGaleActive = false;
    let wasSolarCalmActive = false;

    const biomeManager = getBiomeLifecycleManager();
    if (biomeManager) {
      biomeManager.registerModule({
        id: "weather_system",
        name: "Sistema Meteorológico Dinâmico",
        minX: 800,
        maxX: 30000,
        activate: () => {
          isWeatherActive = true;
        },
        deactivate: () => {
          isWeatherActive = false;
          wasBlizzardActive = false;
          wasGaleActive = false;
          wasSolarCalmActive = false;
          snowflakes.forEach((p) => {
            p.obj.opacity = 0;
          });
          raindrops.forEach((p) => {
            p.obj.opacity = 0;
          });
          goldenGlints.forEach((p) => {
            p.obj.opacity = 0;
          });
        },
        isActive: () => isWeatherActive,
      });
    }

    engineOrContext.getTicker().add((dt: number) => {
      if (!isWeatherActive) return;

      const playerPos = playerController.gameObj.pos;
      const { weather, intensity } = calculateWeatherAtDistance(playerPos.x);

      if (weather === "clear" && intensity === 0) {
        if (wasBlizzardActive) {
          snowflakes.forEach((p) => {
            p.obj.opacity = 0;
          });
          wasBlizzardActive = false;
        }
        if (wasGaleActive) {
          raindrops.forEach((p) => {
            p.obj.opacity = 0;
          });
          wasGaleActive = false;
        }
        if (wasSolarCalmActive) {
          goldenGlints.forEach((p) => {
            p.obj.opacity = 0;
          });
          wasSolarCalmActive = false;
        }
        return;
      }

      const camX = resolveCameraX(engineOrContext);
      const camLeft = camX - screenW / 2;

      // Nevasca
      const isBlizzard = weather === "polar_blizzard" && intensity > 0;
      if (isBlizzard) {
        wasBlizzardActive = true;
        snowflakes.forEach((p) => {
          p.phase += dt * p.swaySpeed;
          p.relX += p.speedX * dt;
          p.relY += p.speedY * dt;

          if (p.relX > screenW + 40) p.relX = -40;
          if (p.relY > 150) p.relY = -20;

          const sway = Math.sin(p.phase) * p.swayAmp;
          p.obj.pos = { x: camLeft + p.relX + sway, y: p.relY };
          p.obj.opacity = p.baseOpacity * intensity;
        });
      } else if (wasBlizzardActive) {
        snowflakes.forEach((p) => {
          p.obj.opacity = 0;
        });
        wasBlizzardActive = false;
      }

      // Vendaval e chuva
      const isGale = weather === "open_sea_gale" && intensity > 0;
      if (isGale) {
        wasGaleActive = true;
        const pool = getParticlePool();
        raindrops.forEach((p) => {
          p.relX += p.speedX * dt;
          p.relY += p.speedY * dt;

          if (p.relY >= GAME_CONFIG.SEA_LEVEL && p.relY - p.speedY * dt < GAME_CONFIG.SEA_LEVEL) {
            if (getRandomFloat(0, 1) < 0.18 * intensity) {
              const splashPos = asPos(
                camLeft + p.relX,
                GAME_CONFIG.SEA_LEVEL + getRandomFloat(-1, 2)
              );
              const splashRadius = getRandomFloat(1.2, 2.2);
              if (pool) {
                pool.spawnCircle({
                  pos: splashPos,
                  radius: splashRadius,
                  color: asColor(220, 240, 255),
                  opacity: 0.65 * intensity,
                  fadeRate: 3.5,
                  maxLife: 0.25,
                  z: 27,
                });
              }
            }
          }

          if (p.relX > screenW + 80 || p.relY > 180) {
            p.relX = getRandomFloat(-60, screenW);
            p.relY = -30;
          }

          p.obj.pos = { x: camLeft + p.relX, y: p.relY };
          p.obj.opacity = p.baseOpacity * intensity;
        });
      } else if (wasGaleActive) {
        raindrops.forEach((p) => {
          p.obj.opacity = 0;
        });
        wasGaleActive = false;
      }

      // Calmaria solar
      const isSolarCalm = weather === "arraial_solar_calm" && intensity > 0;
      if (isSolarCalm) {
        wasSolarCalmActive = true;
        goldenGlints.forEach((p) => {
          p.phase += dt * p.swaySpeed;
          p.relX += p.speedX * dt;
          p.relY += p.speedY * dt;

          if (p.relX > screenW + 30) p.relX = -30;
          if (p.relY > screenH + 20) p.relY = 30;
          if (p.relY < 20) p.relY = screenH;

          const glintPulse = Math.sin(p.phase) * 0.35 + 0.65;
          p.obj.pos = { x: camLeft + p.relX, y: p.relY };
          p.obj.opacity = p.baseOpacity * intensity * glintPulse;
        });
      } else if (wasSolarCalmActive) {
        goldenGlints.forEach((p) => {
          p.obj.opacity = 0;
        });
        wasSolarCalmActive = false;
      }
    });
  } else {
    // Modo Legacy Kaboom Bridge
    const legacyCtx = engineOrContext as LegacyEngineBridge & {
      camPos(): { x: number; y: number };
      width(): number;
      height(): number;
      rand(min: number, max?: number): number;
      circle(r: number): unknown;
      rect(w: number, h: number, opts?: unknown): unknown;
      rotate(a: number): unknown;
      pos(x: number, y: number): unknown;
      color(r: number, g: number, b: number): unknown;
      rgb(r: number, g: number, b: number): unknown;
      opacity(o: number): unknown;
      z(layer: number): unknown;
      vec2(x: number, y: number): unknown;
      dt(): number;
      destroy(obj: unknown): void;
      onUpdate(cb: () => void): void;
    };

    const cam = legacyCtx.camPos();

    for (let i = 0; i < snowflakeCount; i++) {
      const size = legacyCtx.rand(1.5, 3.2);
      const obj = legacyCtx.add([
        legacyCtx.circle(size),
        legacyCtx.pos(cam.x - screenW / 2 + getRandomFloat(0, screenW), getRandomFloat(0, 140)),
        legacyCtx.color(240, 248, 255),
        legacyCtx.opacity(0),
        legacyCtx.z(26),
        "weather_snow",
      ]) as unknown as WeatherParticleObject;

      snowflakes.push({
        obj,
        relX: getRandomFloat(-50, screenW + 50),
        relY: getRandomFloat(-20, 130),
        speedX: legacyCtx.rand(80, 160),
        speedY: legacyCtx.rand(40, 85),
        swaySpeed: legacyCtx.rand(2.0, 4.5),
        swayAmp: legacyCtx.rand(12, 28),
        phase: getRandomFloat(0, Math.PI * 2),
        baseOpacity: legacyCtx.rand(0.45, 0.85),
      });
    }

    for (let i = 0; i < raindropCount; i++) {
      const len = legacyCtx.rand(8, 15);
      const obj = legacyCtx.add([
        legacyCtx.rect(1.6, len, { radius: 0.8 }),
        legacyCtx.pos(cam.x - screenW / 2 + getRandomFloat(0, screenW), getRandomFloat(0, 160)),
        legacyCtx.rotate(-22),
        legacyCtx.color(200, 225, 255),
        legacyCtx.opacity(0),
        legacyCtx.z(26),
        "weather_rain",
      ]) as unknown as WeatherParticleObject;

      raindrops.push({
        obj,
        relX: getRandomFloat(-60, screenW + 60),
        relY: getRandomFloat(-30, 130),
        speedX: legacyCtx.rand(180, 290),
        speedY: legacyCtx.rand(300, 480),
        swaySpeed: 0,
        swayAmp: 0,
        phase: 0,
        baseOpacity: legacyCtx.rand(0.35, 0.7),
      });
    }

    for (let i = 0; i < glintCount; i++) {
      const size = legacyCtx.rand(1.8, 3.8);
      const obj = legacyCtx.add([
        legacyCtx.circle(size),
        legacyCtx.pos(
          cam.x - screenW / 2 + getRandomFloat(0, screenW),
          getRandomFloat(40, screenH - 20)
        ),
        legacyCtx.color(255, 230, 110),
        legacyCtx.opacity(0),
        legacyCtx.z(17),
        "weather_sun_glint",
      ]) as unknown as WeatherParticleObject;

      goldenGlints.push({
        obj,
        relX: getRandomFloat(0, screenW),
        relY: getRandomFloat(40, screenH - 20),
        speedX: legacyCtx.rand(15, 38),
        speedY: legacyCtx.rand(-8, 8),
        swaySpeed: legacyCtx.rand(1.2, 2.5),
        swayAmp: legacyCtx.rand(8, 18),
        phase: getRandomFloat(0, Math.PI * 2),
        baseOpacity: legacyCtx.rand(0.3, 0.65),
      });
    }

    let isWeatherActive = true;
    let wasBlizzardActive = false;
    let wasGaleActive = false;
    let wasSolarCalmActive = false;

    const biomeManager = getBiomeLifecycleManager();
    if (biomeManager) {
      biomeManager.registerModule({
        id: "weather_system",
        name: "Sistema Meteorológico Dinâmico",
        minX: 800,
        maxX: 30000,
        activate: () => {
          isWeatherActive = true;
        },
        deactivate: () => {
          isWeatherActive = false;
          wasBlizzardActive = false;
          wasGaleActive = false;
          wasSolarCalmActive = false;
          snowflakes.forEach((p) => {
            p.obj.opacity = 0;
          });
          raindrops.forEach((p) => {
            p.obj.opacity = 0;
          });
          goldenGlints.forEach((p) => {
            p.obj.opacity = 0;
          });
        },
        isActive: () => isWeatherActive,
      });
    }

    legacyCtx.onUpdate(() => {
      if (!isWeatherActive) return;

      const playerPos = playerController.gameObj.pos;
      const { weather, intensity } = calculateWeatherAtDistance(playerPos.x);

      if (weather === "clear" && intensity === 0) {
        if (wasBlizzardActive) {
          snowflakes.forEach((p) => {
            p.obj.opacity = 0;
          });
          wasBlizzardActive = false;
        }
        if (wasGaleActive) {
          raindrops.forEach((p) => {
            p.obj.opacity = 0;
          });
          wasGaleActive = false;
        }
        if (wasSolarCalmActive) {
          goldenGlints.forEach((p) => {
            p.obj.opacity = 0;
          });
          wasSolarCalmActive = false;
        }
        return;
      }

      const dt = typeof legacyCtx.dt === "function" ? legacyCtx.dt() : 0.016;
      const currentCam = legacyCtx.camPos();
      const camLeft = currentCam.x - screenW / 2;

      // Nevasca
      const isBlizzard = weather === "polar_blizzard" && intensity > 0;
      if (isBlizzard) {
        wasBlizzardActive = true;
        snowflakes.forEach((p) => {
          p.phase += dt * p.swaySpeed;
          p.relX += p.speedX * dt;
          p.relY += p.speedY * dt;

          if (p.relX > screenW + 40) p.relX = -40;
          if (p.relY > 150) p.relY = -20;

          const sway = Math.sin(p.phase) * p.swayAmp;
          p.obj.pos = { x: camLeft + p.relX + sway, y: p.relY };
          p.obj.opacity = p.baseOpacity * intensity;
        });
      } else if (wasBlizzardActive) {
        snowflakes.forEach((p) => {
          p.obj.opacity = 0;
        });
        wasBlizzardActive = false;
      }

      // Vendaval e chuva
      const isGale = weather === "open_sea_gale" && intensity > 0;
      if (isGale) {
        wasGaleActive = true;
        const pool = getParticlePool();
        raindrops.forEach((p) => {
          p.relX += p.speedX * dt;
          p.relY += p.speedY * dt;

          if (p.relY >= GAME_CONFIG.SEA_LEVEL && p.relY - p.speedY * dt < GAME_CONFIG.SEA_LEVEL) {
            if (getRandomFloat(0, 1) < 0.18 * intensity) {
              const splashPos = asPos(
                camLeft + p.relX,
                GAME_CONFIG.SEA_LEVEL + legacyCtx.rand(-1, 2)
              );
              const splashRadius = legacyCtx.rand(1.2, 2.2);
              if (pool) {
                pool.spawnCircle({
                  pos: splashPos,
                  radius: splashRadius,
                  color: asColor(220, 240, 255),
                  opacity: 0.65 * intensity,
                  fadeRate: 3.5,
                  maxLife: 0.25,
                  z: 27,
                });
              }
            }
          }

          if (p.relX > screenW + 80 || p.relY > 180) {
            p.relX = getRandomFloat(-60, screenW);
            p.relY = -30;
          }

          p.obj.pos = { x: camLeft + p.relX, y: p.relY };
          p.obj.opacity = p.baseOpacity * intensity;
        });
      } else if (wasGaleActive) {
        raindrops.forEach((p) => {
          p.obj.opacity = 0;
        });
        wasGaleActive = false;
      }

      // Calmaria solar
      const isSolarCalm = weather === "arraial_solar_calm" && intensity > 0;
      if (isSolarCalm) {
        wasSolarCalmActive = true;
        goldenGlints.forEach((p) => {
          p.phase += dt * p.swaySpeed;
          p.relX += p.speedX * dt;
          p.relY += p.speedY * dt;

          if (p.relX > screenW + 30) p.relX = -30;
          if (p.relY > screenH + 20) p.relY = 30;
          if (p.relY < 20) p.relY = screenH;

          const glintPulse = Math.sin(p.phase) * 0.35 + 0.65;
          p.obj.pos = { x: camLeft + p.relX, y: p.relY };
          p.obj.opacity = p.baseOpacity * intensity * glintPulse;
        });
      } else if (wasSolarCalmActive) {
        goldenGlints.forEach((p) => {
          p.obj.opacity = 0;
        });
        wasSolarCalmActive = false;
      }
    });
  }
}
