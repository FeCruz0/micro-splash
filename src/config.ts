import { readLocalStorageWithSchema, writeLocalStorage } from "./utils/storage";
import {
  ResolutionKeySchema,
  DisplayModeSchema,
  LetterboxColorSchema,
} from "./schemas/storageSchemas";

export const GAME_CONFIG = {
  GRAVITY: 0,
  SINK_RATE: 15, // Afundamento suave calibrado para permitir subida natural à superfície
  MAX_SPEED: 240, // Teto máximo de velocidade acumulada
  MAX_STROKE_TIME: 0.7, // Duração máxima de uma batida de cauda (0.5s)
  STROKE_COOLDOWN: 1.0, // Intervalo mínimo de 1 segundo entre batidas consecutivas de cauda
  BASE_THRUST: 140, // Impulso inicial responsivo da batida
  PEAK_THRUST: 650, // Adicional de impulso no pico da batida
  WATER_DRAG: 0.968, // Arrasto com planeio hidrodinâmico contínuo entre batidas
  ROTATION_SPEED: 48, // Velocidade de rotação vertical das nadadeiras
  TRASH_SLOWDOWN: 0.5, // Fator de desaceleração ao atingir lixo plástico (perde 50% da velocidade)
  KRILL_BOOST: 1.2, // Fator de aceleração do cardume krill
  KRILL_POINTS: 100, // Pontos por cardume krill
  OXYGEN_DRAIN_RATE: 5, // taxa de perde de oxygenio
  TRASH_OXYGEN_PENALTY: 15, // penalidade de oxygenio por lixo
  KRILL_OXYGEN_RESTORE: 15, // bonus de oxigenio por krill
  BLACKOUT_GRACE_TIME: 4, // tempo de tolerancia quando oxygenio é zerado
  SONAR_RANGE: 650, // raio expansivo do sonar em 360°
  SONAR_ANGLE: 360, // cobertura omnidirecional total
  SONAR_COOLDOWN: 2.0, // tempo de recarga entre emissões do sonar
  SONAR_REVEAL_DURATION: 5.5, // tempo de iluminação de objetos escaneados no escuro
  BLOWHOLE_OXYGEN_THRESHOLD: 92, // gatilho do esguicho ao recarregar ar na superfície
  NET_ESCAPE_COUNT: 5, // toques no espaço para se soltar da rede
  UPWELLING_INTERVAL: 18, // intervalo entre ressurgencias
  UPWELLING_DURATION: 4, // duração da ressurgência
  UPWELLING_PUSH_X: 120, // força horizontal da ressurgência
  UPWELLING_PUSH_Y: -150, // força vertical da ressurgência
  UPWELLING_ZONE_START: 19000, // início da zona de ressurgência em Arraial do Cabo (19.000m)
  UPWELLING_ZONE_END: 25000, // fim da zona de ressurgência em Arraial do Cabo (25.000m)
  ROUTE_TOTAL_DISTANCE: 30000, // distancia total do percurso (30.000m - ~4 a 5 min de partida)
  SEA_LEVEL: 80, // Nível do mar dobrado para 80px para dar espaço visível ao céu
  MAX_DELTA_TIME: 0.1, // Teto máximo de delta time (100ms / 10 FPS) para prevenir tunneling sem penalizar 30-60 FPS
};

export const TAGS = {
  PLAYER: "baleia",
  TRASH: "lixo_plastico",
  KRILL: "krill",
  NET: "rede_fantasma",
  UPWELLING_STREAM: "jato_ressurgencia",
  OBSTACLE: "obstaculo",
  SURFACE: "superficie_agua",
  OPPOSING_CURRENT: "correnteza_contraria",
  FAVORABLE_CURRENT: "correnteza_favoravel",
  AIR_POCKET: "bolsao_ar",
  POWERUP: "powerup",
};

export type BiomeType = "antartica" | "pelagico" | "costa_urbana" | "canyons" | "arraial";

export interface BiomeBoundary {
  id: BiomeType;
  name: string;
  startDistance: number;
  endDistance: number;
}

export const BIOME_BOUNDARIES: readonly BiomeBoundary[] = [
  { id: "antartica", name: "Antártica (Manhã Polar)", startDistance: 0, endDistance: 5000 },
  {
    id: "pelagico",
    name: "Travessia Pelágica (Pôr do Sol)",
    startDistance: 5000,
    endDistance: 12000,
  },
  {
    id: "costa_urbana",
    name: "Costa Urbana (Noite Estrelada)",
    startDistance: 12000,
    endDistance: 19000,
  },
  {
    id: "canyons",
    name: "Cânions & Ressurgência (Alvorada)",
    startDistance: 19000,
    endDistance: 25000,
  },
  {
    id: "arraial",
    name: "Santuário de Arraial (Manhã Solar)",
    startDistance: 25000,
    endDistance: 30000,
  },
] as const;

export function getBiomeAtDistance(distanceInMeters: number): BiomeType {
  for (let index = 0; index < BIOME_BOUNDARIES.length; index++) {
    const boundary = BIOME_BOUNDARIES[index];
    if (distanceInMeters < boundary.endDistance) {
      return boundary.id;
    }
  }
  return "arraial";
}

export interface BiomeColorStop {
  name: string;
  distanceStart: number;
  distanceEnd: number;
  bgColor: [number, number, number];
  surfaceColor: [number, number, number];
  floorColor: [number, number, number];
  skyColor: [number, number, number];
}

export const BIOME_COLOR_STOPS: BiomeColorStop[] = [
  {
    name: "Antártica (Manhã Polar)",
    distanceStart: 0,
    distanceEnd: 5000,
    bgColor: [15, 38, 62],
    surfaceColor: [45, 95, 140],
    floorColor: [10, 24, 38],
    skyColor: [160, 205, 240], // Céu límpido azul polar
  },
  {
    name: "Travessia Pelágica (Pôr do Sol)",
    distanceStart: 5000,
    distanceEnd: 12000,
    bgColor: [18, 48, 88],
    surfaceColor: [75, 110, 160],
    floorColor: [12, 30, 55],
    skyColor: [225, 140, 95], // Céu alaranjado âmbar / golden hour
  },
  {
    name: "Costa Urbana (Noite Estrelada)",
    distanceStart: 12000,
    distanceEnd: 19000,
    bgColor: [8, 16, 32], // Noite profunda
    surfaceColor: [20, 42, 70],
    floorColor: [5, 10, 20],
    skyColor: [12, 18, 38], // Céu noturno escuro
  },
  {
    name: "Cânions & Ressurgência (Alvorada)",
    distanceStart: 19000,
    distanceEnd: 25000,
    bgColor: [12, 55, 82],
    surfaceColor: [30, 120, 150],
    floorColor: [8, 35, 55],
    skyColor: [125, 140, 205], // Alvorada límpida / lilás
  },
  {
    name: "Santuário de Arraial (Manhã Solar)",
    distanceStart: 25000,
    distanceEnd: 30000,
    bgColor: [0, 85, 135],
    surfaceColor: [10, 175, 205], // Turquesa cristalino brilhante
    floorColor: [0, 60, 100],
    skyColor: [135, 215, 255], // Céu ensolarado radiante
  },
];

export interface ResolutionPreset {
  width: number;
  height: number;
  label: string;
  aspect: "16:9" | "auto";
}

export const RESOLUTION_PRESETS = {
  // Presets 16:9 de Alta Fidelidade (Sem distorção)
  "4K": { width: 3840, height: 2160, label: "3840x2160 (4K UHD) 📺🌟", aspect: "16:9" },
  "1440p": { width: 2560, height: 1440, label: "2560x1440 (1440p 2K QHD) 🖥️💎", aspect: "16:9" },
  "1080p": { width: 1920, height: 1080, label: "1920x1080 (1080p Full HD) 🖥️✨", aspect: "16:9" },
} as const;

export type ResolutionKey = keyof typeof RESOLUTION_PRESETS | "auto";

/**
 * Retorna a chave de armazenamento individualizada para a resolução da tela nativa do dispositivo (Fase 33.6).
 */
export function getDeviceResolutionStorageKey(): string {
  if (typeof window !== "undefined" && window.screen) {
    const sw = window.screen.width || 0;
    const sh = window.screen.height || 0;
    return `micro_splash_resolution_${sw}x${sh}`;
  }
  return "micro_splash_resolution";
}

/**
 * Detecta dinamicamente a resolução nativa da tela do dispositivo (Fase 33.2).
 */
export function detectNativeResolution(): { width: number; height: number; detectedLabel: string } {
  if (typeof window !== "undefined" && window.screen) {
    const sw = window.screen.width || 1920;
    const sh = window.screen.height || 1080;
    return {
      width: sw,
      height: sh,
      detectedLabel: `${sw}×${sh}`,
    };
  }
  return {
    width: 1920,
    height: 1080,
    detectedLabel: "1920×1080",
  };
}

/**
 * Calcula o aspect ratio formatado e o valor numérico para preview proporcional (Fase 33.7).
 */
export function calculateAspectRatio(
  width: number,
  height: number
): {
  ratioText: string;
  ratioValue: number;
} {
  const safeH = Math.max(1, height);
  const ratioValue = Number((width / safeH).toFixed(2));

  if (Math.abs(ratioValue - 16 / 9) < 0.05) return { ratioText: "16:9", ratioValue };
  // 21:9 comercial cobre de 2.33 (64:27) a 2.39 (3440×1440 / 43:18)
  if (Math.abs(ratioValue - 2.39) < 0.08 || Math.abs(ratioValue - 21 / 9) < 0.08) {
    return { ratioText: "21:9", ratioValue };
  }
  if (Math.abs(ratioValue - 32 / 9) < 0.08) return { ratioText: "32:9", ratioValue };
  if (Math.abs(ratioValue - 4 / 3) < 0.05) return { ratioText: "4:3", ratioValue };
  if (Math.abs(ratioValue - 3 / 4) < 0.05) return { ratioText: "3:4", ratioValue };

  return {
    ratioText: `${Math.round(width / 100)}:${Math.round(height / 100)}`,
    ratioValue,
  };
}

/**
 * Recupera a resolução salva com suporte a persistência por dispositivo e detecção automática (Fase 33.2 e 33.6).
 */
export function getSavedResolution(): {
  width: number;
  height: number;
  key: ResolutionKey;
  label: string;
  aspect: string;
} {
  const deviceKey = getDeviceResolutionStorageKey();
  const savedDevice = readLocalStorageWithSchema(deviceKey, ResolutionKeySchema, "");
  const saved =
    savedDevice ||
    readLocalStorageWithSchema("micro_splash_resolution", ResolutionKeySchema, "1080p");

  // Modo Automático (Fase 33.2)
  if (saved === "auto") {
    const detected = detectNativeResolution();
    return {
      width: detected.width,
      height: detected.height,
      key: "auto",
      label: `Auto (Detectado: ${detected.detectedLabel}) 🔍`,
      aspect: calculateAspectRatio(detected.width, detected.height).ratioText,
    };
  }

  const effectiveKey = (
    saved && saved in RESOLUTION_PRESETS ? saved : "1080p"
  ) as keyof typeof RESOLUTION_PRESETS;
  const preset = RESOLUTION_PRESETS[effectiveKey] || RESOLUTION_PRESETS["1080p"];

  return {
    width: preset.width,
    height: preset.height,
    label: preset.label,
    aspect: preset.aspect,
    key: effectiveKey,
  };
}

/**
 * Salva a resolução tanto na chave global quanto na chave do dispositivo atual (Fase 33.6).
 */
export function setSavedResolution(key: ResolutionKey): void {
  const deviceKey = getDeviceResolutionStorageKey();
  writeLocalStorage(deviceKey, key);
  writeLocalStorage("micro_splash_resolution", key);
}

export type DisplayMode = "stretch" | "letterbox";

export function getSavedDisplayMode(): DisplayMode {
  const mode = readLocalStorageWithSchema(
    "micro_splash_display_mode",
    DisplayModeSchema,
    "stretch"
  );
  return mode === "letterbox" ? "letterbox" : "stretch";
}

export function setSavedDisplayMode(mode: DisplayMode): void {
  writeLocalStorage("micro_splash_display_mode", mode);
}

export type LetterboxColor = "black" | "ocean";

export function getSavedLetterboxColor(): LetterboxColor {
  const color = readLocalStorageWithSchema(
    "micro_splash_letterbox_color",
    LetterboxColorSchema,
    "black"
  );
  return color === "ocean" ? "ocean" : "black";
}

export function setSavedLetterboxColor(color: LetterboxColor): void {
  writeLocalStorage("micro_splash_letterbox_color", color);
}

export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.3.0";

// --- Design Tokens Tipográficos (Fase 32: Tipografia, Texto & Hierarquia Visual) ---
export const FONT_TITLE = "Orbitron";
export const FONT_BODY = "Inter";

export const TEXT_SIZE_DISPLAY = 44; // Logo, Splash monumental
export const TEXT_SIZE_H1 = 24; // Títulos de tela e modais principais
export const TEXT_SIZE_H2 = 18; // Subtítulos de seções e categorias
export const TEXT_SIZE_BODY = 14; // Texto corrido, leituras e opções
export const TEXT_SIZE_CAPTION = 11; // Badges, dicas de teclado e rodapés

// --- Constantes Segmentadas por Domínio (Fase 48.5) ---
export const PLAYER_ANIMATION_CONFIG = {
  STROKE_DOWN_PHASE_THRESHOLD: 0.55,
  FEED_TIMER_DURATION: 0.55,
} as const;

export const ACCESSIBILITY_VISUAL_CONFIG = {
  HIGH_CONTRAST_OPACITY: 0.55,
  STANDARD_TRASH_OPACITY: 0.25,
  ENHANCED_TRASH_OPACITY: 0.32,
} as const;

export const ENVIRONMENT_CONFIG = {
  BUBBLE_VENT_MAX_LIFE: 0.55,
  ICE_SURFACE_OPACITY: 0.55,
  CRAG_WIDTH_FACTOR: 0.55,
} as const;

// --- Configurações da Baleia-Guia (Fase 56: Tutorial Mimético & Fase 58: Determinismo) ---
export const COMPANION_CONFIG = {
  LEAD_DISTANCE_MIN: 120,
  LEAD_DISTANCE_MAX: 240,
  END_DISTANCE: 3200,
  FEED_TARGET_X: 750,
  BREATHE_TARGET_X: 1460,
  SONAR_TARGET_X: 2150,
  FAREWELL_TARGET_X: 3150,
  BASE_SPEED: 180,
  MAX_SPEED: 280,
  SCALE: 0.85,
  COLLIDER_WIDTH: 91.8,
  COLLIDER_HEIGHT: 35.7,
  CRITICAL_OXYGEN: 38,
  SURFACE_BREATHE_DURATION: 1.2,
  RADAR_INTERVAL: 0.35,
  RADAR_AHEAD_RANGE: 400,
  RADAR_VERTICAL_RANGE: 160,
  ROTATION_SPEED_FACTOR: 0.75,
  SEABED_OFFSET: 55,
  STEAM_PARTICLES_COUNT: 28,
  BASE_GLIDE_DURATION: 1.2,
} as const;
