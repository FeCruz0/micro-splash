export const GAME_CONFIG = {
  GRAVITY: 0,
  SINK_RATE: 20,              // Afundamento suave constante da água
  MAX_SPEED: 300,             // Teto máximo de velocidade acumulada
  MAX_STROKE_TIME: 0.5,       // Duração máxima de uma batida de cauda (0.5s)
  BASE_THRUST: 150,           // Impulso inicial mínimo da batida
  PEAK_THRUST: 750,           // Adicional de impulso no pico da batida
  WATER_DRAG: 0.96,           // Resistência da água (atrito por frame)
  ROTATION_SPEED: 40,         // Velocidade de rotação das nadadeiras
  TRASH_SLOWDOWN: 0.5,        // Fator de desaceleração ao atingir lixo plástico (perde 50% da velocidade)
  KRILL_BOOST: 1.2,           // Fator de aceleração do cardume krill
  KRILL_POINTS: 100,          // Pontos por cardume krill
  OXYGEN_DRAIN_RATE: 5,       // taxa de perde de oxygenio
  TRASH_OXYGEN_PENALTY: 15,   // penalidade de oxygenio por lixo
  KRILL_OXYGEN_RESTORE: 15,   // bonus de oxigenio por krill
  BLACKOUT_GRACE_TIME: 4,     // tempo de tolerancia quando oxygenio é zerado
  SONAR_RANGE: 450,           // raio do sonar
  SONAR_ANGLE: 30,            // angulo do feixe do sonar em graus
  SONAR_COOLDOWN: 1.5,        // tempo entre cada emissao do sonar
  NET_ESCAPE_COUNT: 5,        // toques no espaço para se soltar da rede
  UPWELLING_INTERVAL: 18,     // intervalo entre ressurgencias
  UPWELLING_DURATION: 4,      // duração da ressurgência
  UPWELLING_PUSH_X: 120,      // força horizontal da ressurgência
  UPWELLING_PUSH_Y: -150,     // força vertical da ressurgência
  UPWELLING_ZONE_START: 19000, // início da zona de ressurgência em Arraial do Cabo (19.000m)
  UPWELLING_ZONE_END: 25000,   // fim da zona de ressurgência em Arraial do Cabo (25.000m)
  ROUTE_TOTAL_DISTANCE: 27000, // distancia total do percurso (27.000m - ~3 a 4 min de partida)
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
    name: "Trópicos",
    distanceStart: 0,
    distanceEnd: 5400,
    bgColor: [0, 75, 130],
    surfaceColor: [0, 120, 180],
    floorColor: [0, 50, 95],
    skyColor: [120, 190, 245]
  },
  {
    name: "Subtrópicos",
    distanceStart: 5400,
    distanceEnd: 10800,
    bgColor: [0, 90, 150],
    surfaceColor: [0, 130, 200],
    floorColor: [0, 60, 110],
    skyColor: [110, 175, 230]
  },
  {
    name: "Zona Temperada",
    distanceStart: 10800,
    distanceEnd: 16200,
    bgColor: [10, 75, 110],
    surfaceColor: [20, 100, 150],
    floorColor: [5, 50, 80],
    skyColor: [100, 155, 210]
  },
  {
    name: "Sub-polar",
    distanceStart: 16200,
    distanceEnd: 21600,
    bgColor: [25, 45, 75],
    surfaceColor: [45, 75, 105],
    floorColor: [15, 30, 50],
    skyColor: [85, 130, 180]
  },
  {
    name: "Polar (Antártida)",
    distanceStart: 21600,
    distanceEnd: 27000,
    bgColor: [15, 30, 45],
    surfaceColor: [70, 95, 115],
    floorColor: [10, 20, 30],
    skyColor: [60, 95, 140]
  }
];

