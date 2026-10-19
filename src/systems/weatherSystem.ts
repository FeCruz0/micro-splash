/**
 * Sistema de Eventos Climáticos Dinâmicos na Rota (Fase 19.1)
 * Modela micro-climas ao longo da migração da jubarte:
 * 1. Nevasca Polar (Antártica: 800m - 4.200m)
 * 2. Céu Encoberto & Vendaval com Chuva (Travessia Pelágica: 9.000m - 15.500m)
 * 3. Calmaria Solar Radiante (Santuário de Arraial do Cabo: 25.000m - 30.000m)
 */

import type { GameObj, KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";
import { getRandomFloat } from "../utils/random";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";

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
 *
 * @param x - Distância horizontal atual da jubarte no mundo em metros.
 * @returns Objeto com o tipo de clima ativo e fator de intensidade normalizado [0, 1].
 */
export function calculateWeatherAtDistance(x: number): {
  weather: WeatherType;
  intensity: number;
} {
  for (const zone of WEATHER_ZONES) {
    if (x >= zone.startX && x <= zone.endX) {
      let intensity = 1.0;

      // Interpolação suave de entrada (fade-in)
      if (x < zone.startX + zone.fadeInDist && zone.fadeInDist > 0) {
        intensity = (x - zone.startX) / zone.fadeInDist;
      }
      // Interpolação suave de saída (fade-out)
      else if (x > zone.endX - zone.fadeOutDist && zone.fadeOutDist > 0) {
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

interface WeatherParticle {
  obj: GameObj;
  relX: number;
  relY: number;
  speedX: number;
  speedY: number;
  swaySpeed: number;
  swayAmp: number;
  phase: number;
  baseOpacity: number;
}

/**
 * Inicializa os geradores de partículas atmosféricas e micro-climas dinâmicos.
 *
 * Cria três emissores ambientais:
 * 1. Flocos de nevasca polar com deriva horizontal pela força do vento antártico.
 * 2. Gotas oblíquas de tempestade/vendaval e borrifos de superfície em alto-mar.
 * 3. Raios solares dourados radiantes com cáusticos intensificados na calmaria de Arraial do Cabo.
 *
 * @param k - Instância do contexto Kaboom.js.
 * @param playerController - Controlador físico da jubarte para rastreamento da posição de câmera.
 */
export function setupWeatherSystem(k: KaboomCtx, playerController: PlayerController) {
  const cam = k.camPos();
  const screenW = k.width();
  const screenH = k.height();

  // 1. POOL DE NEVASCA POLAR (Flocos de neve com deriva e vento antártico)
  const snowflakeCount = 32;
  const snowflakes: WeatherParticle[] = [];

  for (let i = 0; i < snowflakeCount; i++) {
    const size = k.rand(1.5, 3.2);
    const obj = k.add([
      k.circle(size),
      k.pos(cam.x - screenW / 2 + getRandomFloat(0, screenW), getRandomFloat(0, 140)),
      k.color(240, 248, 255),
      k.opacity(0),
      k.z(26),
      "weather_snow",
    ]);

    snowflakes.push({
      obj,
      relX: getRandomFloat(-50, screenW + 50),
      relY: getRandomFloat(-20, 130),
      speedX: k.rand(80, 160), // Vento polar da esquerda para a direita
      speedY: k.rand(40, 85),
      swaySpeed: k.rand(2.0, 4.5),
      swayAmp: k.rand(12, 28),
      phase: getRandomFloat(0, Math.PI * 2),
      baseOpacity: k.rand(0.45, 0.85),
    });
  }

  // 2. POOL DE VENDAVAL E CHUVA EM ALTO-MAR (Gotas oblíquas e borrifos)
  const raindropCount = 42;
  const raindrops: WeatherParticle[] = [];

  for (let i = 0; i < raindropCount; i++) {
    const len = k.rand(8, 15);
    const obj = k.add([
      k.rect(1.6, len, { radius: 0.8 }),
      k.pos(cam.x - screenW / 2 + getRandomFloat(0, screenW), getRandomFloat(0, 160)),
      k.rotate(-22), // Chuva oblíqua cortando o céu com vento
      k.color(200, 225, 255),
      k.opacity(0),
      k.z(26),
      "weather_rain",
    ]);

    raindrops.push({
      obj,
      relX: getRandomFloat(-60, screenW + 60),
      relY: getRandomFloat(-30, 130),
      speedX: k.rand(180, 290), // Vendaval rápido
      speedY: k.rand(300, 480),
      swaySpeed: 0,
      swayAmp: 0,
      phase: 0,
      baseOpacity: k.rand(0.35, 0.7),
    });
  }

  // 3. POOL DE CALMARIA SOLAR EM ARRAIAL DO CABO (Partículas douradas de poeira solar)
  const glintCount = 26;
  const goldenGlints: WeatherParticle[] = [];

  for (let i = 0; i < glintCount; i++) {
    const size = k.rand(1.8, 3.8);
    const obj = k.add([
      k.circle(size),
      k.pos(cam.x - screenW / 2 + getRandomFloat(0, screenW), getRandomFloat(40, screenH - 20)),
      k.color(255, 230, 110),
      k.opacity(0),
      k.z(17),
      "weather_sun_glint",
    ]);

    goldenGlints.push({
      obj,
      relX: getRandomFloat(0, screenW),
      relY: getRandomFloat(40, screenH - 20),
      speedX: k.rand(15, 38), // Brisa suave
      speedY: k.rand(-8, 8),
      swaySpeed: k.rand(1.2, 2.5),
      swayAmp: k.rand(8, 18),
      phase: getRandomFloat(0, Math.PI * 2),
      baseOpacity: k.rand(0.3, 0.65),
    });
  }

  // 4. CICLO DE VIDA GEOGRÁFICO E LOOP PRINCIPAL DE ATUALIZAÇÃO CLIMÁTICA
  let isWeatherActive = true;
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

  k.onUpdate(() => {
    if (!isWeatherActive) return;

    const playerPos = playerController.gameObj.pos;
    const { weather, intensity } = calculateWeatherAtDistance(playerPos.x);

    // Early-return para clima limpo sem transições ativas
    if (weather === "clear" && intensity === 0) {
      return;
    }

    const dt = k.dt();
    const currentCam = k.camPos();
    const camLeft = currentCam.x - screenW / 2;

    // --- ATUALIZAÇÃO DA NEVASCA ---
    const isBlizzard = weather === "polar_blizzard" && intensity > 0;
    snowflakes.forEach((p) => {
      if (isBlizzard) {
        p.phase += dt * p.swaySpeed;
        p.relX += p.speedX * dt;
        p.relY += p.speedY * dt;

        // Recicla se sair da tela
        if (p.relX > screenW + 40) p.relX = -40;
        if (p.relY > 150) p.relY = -20;

        const sway = Math.sin(p.phase) * p.swayAmp;
        p.obj.pos = k.vec2(camLeft + p.relX + sway, p.relY);
        p.obj.opacity = p.baseOpacity * intensity;
      } else {
        p.obj.opacity = 0;
      }
    });

    // --- ATUALIZAÇÃO DO VENDAVAL E CHUVA ---
    const isGale = weather === "open_sea_gale" && intensity > 0;
    raindrops.forEach((p) => {
      if (isGale) {
        p.relX += p.speedX * dt;
        p.relY += p.speedY * dt;

        // Respingo na água quando a gota atinge o nível do mar (SEA_LEVEL ~ 80px)
        if (p.relY >= GAME_CONFIG.SEA_LEVEL && p.relY - p.speedY * dt < GAME_CONFIG.SEA_LEVEL) {
          if (getRandomFloat(0, 1) < 0.18 * intensity) {
            const splash = k.add([
              k.circle(k.rand(1.2, 2.2)),
              k.pos(camLeft + p.relX, GAME_CONFIG.SEA_LEVEL + k.rand(-1, 2)),
              k.color(220, 240, 255),
              k.opacity(0.65 * intensity),
              k.z(27),
            ]);
            splash.onUpdate(() => {
              splash.opacity -= k.dt() * 3.5;
              if (splash.opacity <= 0) k.destroy(splash);
            });
          }
        }

        // Recicla chuva
        if (p.relX > screenW + 80 || p.relY > 180) {
          p.relX = getRandomFloat(-60, screenW);
          p.relY = -30;
        }

        p.obj.pos = k.vec2(camLeft + p.relX, p.relY);
        p.obj.opacity = p.baseOpacity * intensity;
      } else {
        p.obj.opacity = 0;
      }
    });

    // --- ATUALIZAÇÃO DA CALMARIA SOLAR ---
    const isSolarCalm = weather === "arraial_solar_calm" && intensity > 0;
    goldenGlints.forEach((p) => {
      if (isSolarCalm) {
        p.phase += dt * p.swaySpeed;
        p.relX += p.speedX * dt;
        p.relY += p.speedY * dt;

        if (p.relX > screenW + 30) p.relX = -30;
        if (p.relY > screenH + 20) p.relY = 30;
        if (p.relY < 20) p.relY = screenH;

        const glintPulse = Math.sin(p.phase) * 0.35 + 0.65;
        p.obj.pos = k.vec2(camLeft + p.relX, p.relY);
        p.obj.opacity = p.baseOpacity * intensity * glintPulse;
      } else {
        p.obj.opacity = 0;
      }
    });
  });
}
