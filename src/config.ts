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
};

export const TAGS = {
  PLAYER: "baleia",
  TRASH: "lixo_plastico",
  KRILL: "krill",
  OBSTACLE: "obstaculo",
};
