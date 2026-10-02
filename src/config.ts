export const GAME_CONFIG = {
  GRAVITY: 0,
  SINK_RATE: 20, // Afundamento suave constante da água
  MAX_SPEED: 240, // Teto máximo de velocidade acumulada
  MAX_STROKE_TIME: 0.5, // Duração máxima de uma batida de cauda (0.5s)
  STROKE_COOLDOWN: 1.0, // Intervalo mínimo de 1 segundo entre batidas consecutivas de cauda
  BASE_THRUST: 90, // Impulso inicial suave e orgânico da batida (reduzido de 125)
  PEAK_THRUST: 450, // Adicional de impulso no pico da batida (reduzido de 625)
  WATER_DRAG: 0.955, // Resistência da água com perda de momentum acentuada (desacelera rápido da velocidade máxima)
  ROTATION_SPEED: 40, // Velocidade de rotação das nadadeiras
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
  let saved: string | null = null;
  const deviceKey = getDeviceResolutionStorageKey();

  if (typeof localStorage !== "undefined") {
    saved = localStorage.getItem(deviceKey) || localStorage.getItem("micro_splash_resolution");
  }

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
  if (typeof localStorage !== "undefined") {
    const deviceKey = getDeviceResolutionStorageKey();
    localStorage.setItem(deviceKey, key);
    localStorage.setItem("micro_splash_resolution", key);
  }
}

export type DisplayMode = "stretch" | "letterbox";

export function getSavedDisplayMode(): DisplayMode {
  if (typeof localStorage === "undefined") return "stretch";
  const saved = localStorage.getItem("micro_splash_display_mode");
  return saved === "letterbox" ? "letterbox" : "stretch";
}

export function setSavedDisplayMode(mode: DisplayMode): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("micro_splash_display_mode", mode);
  }
}

export type LetterboxColor = "black" | "ocean";

export function getSavedLetterboxColor(): LetterboxColor {
  if (typeof localStorage === "undefined") return "black";
  const saved = localStorage.getItem("micro_splash_letterbox_color");
  return saved === "ocean" ? "ocean" : "black";
}

export function setSavedLetterboxColor(color: LetterboxColor): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("micro_splash_letterbox_color", color);
  }
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
