export const GAME_CONFIG = {
  GRAVITY: 0,
  SINK_RATE: 20,              // Afundamento suave constante da água
  MAX_SPEED: 240,             // Teto máximo de velocidade acumulada
  MAX_STROKE_TIME: 0.5,       // Duração máxima de uma batida de cauda (0.5s)
  BASE_THRUST: 150,           // Impulso inicial mínimo da batida
  PEAK_THRUST: 750,           // Adicional de impulso no pico da batida
  WATER_DRAG: 0.96,           // Resistência da água (atrito por frame)
  ROTATION_SPEED: 40,         // Velocidade de rotação das nadadeiras
  TRASH_SLOWDOWN: 0.5,        // Fator de desaceleração ao atingir lixo plástico (perde 50% da velocidade)
  KRILL_BOOST: 1.2,           // Fator de aceleração do cardume krill
  KRILL_POINTS: 100,          // Pontos por cardume krill
};

export const TAGS = {
  PLAYER: "baleia",
  TRASH: "lixo_plastico",
  KRILL: "krill",
  OBSTACLE: "obstaculo",
};
