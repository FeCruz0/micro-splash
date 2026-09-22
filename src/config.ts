export const GAME_CONFIG = {
  GRAVITY: 0,
  SINK_RATE: 20,              // Afundamento suave constante da água
  MAX_SPEED: 240,             // Teto máximo de velocidade acumulada
  MAX_STROKE_TIME: 0.5,       // Duração máxima de uma batida de cauda (0.5s)
  BASE_THRUST: 125,           // Impulso inicial restaurado da batida
  PEAK_THRUST: 625,           // Adicional de impulso no pico da batida (propulsão vigorosa restaurada)
  WATER_DRAG: 0.955,          // Resistência da água com perda de momentum acentuada (desacelera rápido da velocidade máxima)
  ROTATION_SPEED: 40,         // Velocidade de rotação das nadadeiras
  TRASH_SLOWDOWN: 0.5,        // Fator de desaceleração ao atingir lixo plástico (perde 50% da velocidade)
  KRILL_BOOST: 1.2,           // Fator de aceleração do cardume krill
  KRILL_POINTS: 100,          // Pontos por cardume krill
  OXYGEN_DRAIN_RATE: 5,       // taxa de perde de oxygenio
  TRASH_OXYGEN_PENALTY: 15,   // penalidade de oxygenio por lixo
  KRILL_OXYGEN_RESTORE: 15,   // bonus de oxigenio por krill
  BLACKOUT_GRACE_TIME: 4,     // tempo de tolerancia quando oxygenio é zerado
  SONAR_RANGE: 650,           // raio expansivo do sonar em 360°
  SONAR_ANGLE: 360,           // cobertura omnidirecional total
  SONAR_COOLDOWN: 2.0,        // tempo de recarga entre emissões do sonar
  SONAR_REVEAL_DURATION: 5.5, // tempo de iluminação de objetos escaneados no escuro
  BLOWHOLE_OXYGEN_THRESHOLD: 92, // gatilho do esguicho ao recarregar ar na superfície
  NET_ESCAPE_COUNT: 5,        // toques no espaço para se soltar da rede
  UPWELLING_INTERVAL: 18,     // intervalo entre ressurgencias
  UPWELLING_DURATION: 4,      // duração da ressurgência
  UPWELLING_PUSH_X: 120,      // força horizontal da ressurgência
  UPWELLING_PUSH_Y: -150,     // força vertical da ressurgência
  UPWELLING_ZONE_START: 19000, // início da zona de ressurgência em Arraial do Cabo (19.000m)
  UPWELLING_ZONE_END: 25000,   // fim da zona de ressurgência em Arraial do Cabo (25.000m)
  ROUTE_TOTAL_DISTANCE: 30000, // distancia total do percurso (30.000m - ~4 a 5 min de partida)
  SEA_LEVEL: 80,               // Nível do mar dobrado para 80px para dar espaço visível ao céu
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

export const RESOLUTION_PRESETS = {
  "1080p": { width: 1920, height: 1080, label: "1920x1080 (1080p Full HD) 🖥️✨" },
  "720p": { width: 1280, height: 720, label: "1280x720 (720p HD) 🖥️" },
  "540p": { width: 960, height: 540, label: "960x540 (Equilibrado) 📺" },
  "450p": { width: 800, height: 450, label: "800x450 (Retrô Clássico) 🕹️" },
} as const;

export type ResolutionKey = keyof typeof RESOLUTION_PRESETS;

export function getSavedResolution(): { width: number; height: number; key: ResolutionKey; label: string } {
  const saved = (typeof localStorage !== "undefined"
    ? localStorage.getItem("micro_splash_resolution") || "720p"
    : "720p") as ResolutionKey;

  const preset = RESOLUTION_PRESETS[saved] || RESOLUTION_PRESETS["720p"];
  return {
    width: preset.width,
    height: preset.height,
    label: preset.label,
    key: saved in RESOLUTION_PRESETS ? saved : "720p",
  };
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

