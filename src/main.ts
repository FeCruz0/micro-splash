import kaboom from "kaboom";

const k = kaboom({
    background: [10, 25, 60],
});

k.loadSprite("baleia", "https://kaboomjs.com/sprites/bean.png");

// 1. Jogador (Baleia)
const baleia = k.add([
  k.sprite("baleia"),
  k.pos(120, 200),
  k.area(),
  k.body(),
  k.rotate(0),
  k.anchor("center"),
]);

k.setGravity(0); // Gravidade 0 (sem queda acelerada do ar)

const taxaAfundamento = 20; // Afundamento constante suave da água

// Limites do mar
const chao = k.add([
  k.rect(k.width(), 40),
  k.pos(0, k.height() - 40),
  k.area(),
  k.body({ isStatic: true }),
  k.color(20, 50, 120),
]);

const teto = k.add([
  k.rect(k.width(), 40),
  k.pos(0, 0),
  k.area(),
  k.body({ isStatic: true }),
  k.color(20, 50, 120),
]);

// Variáveis de Inércia (Velocidade 2D)
let currentSpeed = k.vec2(0, 0);

// Variáveis da Batida de Cauda
let strokeTimer = 0;           // Duração da batida atual
const MAX_STROKE_TIME = 0.5;   // Duração máxima da batida de cauda (0.5s)
const MAX_SPEED = 240;         // Teto máximo de velocidade acumulada

// Controle de Direção e Câmera
let facingRight = true;
let targetCamOffset = 200;
let angle = 0;                 // Ângulo virtual de rotação (negativo = subindo, positivo = descendo)

// 3. Loop Principal
k.onUpdate(() => {
  // DETECÇÃO DE DIREÇÃO (Virar para a esquerda/direita)
  if (k.isKeyDown("left")) {
    facingRight = false;
    targetCamOffset = -200;
    baleia.flipX = true;
  }
  if (k.isKeyDown("right")) {
    facingRight = true;
    targetCamOffset = 200;
    baleia.flipX = false;
  }

  // Lógica da batida de cauda (Ao Segurar Espaço)
  if (k.isKeyDown("space")) {
    if (strokeTimer < MAX_STROKE_TIME) {
      strokeTimer += k.dt();

      // Progresso da batida de 0.0 a 1.0
      const progresso = strokeTimer / MAX_STROKE_TIME;

      // CURVA DE FORÇA: começa em 150 (pequeno +1), sobe até o pico de ~900 (+5) e cai para 0 no final
      const curvaForca = 150 + (Math.sin(progresso * Math.PI) * 750);

      const rad = k.deg2rad(angle);
      // Direção aponta para a esquerda se não estiver virado para a direita
      const direcao = k.vec2(facingRight ? Math.cos(rad) : -Math.cos(rad), Math.sin(rad));

      // Soma o empuxo da batida à velocidade de inércia atual
      currentSpeed = currentSpeed.add(direcao.scale(curvaForca * k.dt()));

      // Limita a velocidade máxima acumulada para não acelerar infinitamente
      if (currentSpeed.len() > MAX_SPEED) {
        currentSpeed = currentSpeed.unit().scale(MAX_SPEED);
      }
    }
  }

  // RESET DA CAUDA: Ao soltar o Espaço, zera o temporizador para poder dar a próxima batida
  if (k.isKeyReleased("space")) {
    strokeTimer = 0;
  }

  // ROTAÇÃO PELAS NADADEIRAS (Só altera o ângulo se estiver em movimento)
  const velocidadeAtual = currentSpeed.len();

  if (velocidadeAtual > 15) {
    const velocidadeRotacao = 40 * k.dt(); // Giro mais lento e suave

    if (k.isKeyDown("up")) {
      angle = k.clamp(angle - velocidadeRotacao, -45, 45);
    }
    if (k.isKeyDown("down")) {
      angle = k.clamp(angle + velocidadeRotacao, -45, 45);
    }
  } else {
    // Retorna suavemente para a horizontal se parar
    angle = k.lerp(angle, 0, 0.05);
  }

  // Aplica o ângulo visual ao sprite (inverte se estiver virado para a esquerda para manter naturalidade)
  baleia.angle = facingRight ? angle : -angle;

  // Aplica a velocidade de inércia + o afundamento suave constante da água
  baleia.move(currentSpeed.x, currentSpeed.y + taxaAfundamento);

  // Resistência da água (Drag): atrito que consome a velocidade se não mantiver o ritmo
  currentSpeed = currentSpeed.scale(0.96);

  // Câmera segue a baleia de forma suave e sempre um pouco à frente de onde ela está olhando
  k.camPos(k.lerp(k.camPos().x, baleia.pos.x + targetCamOffset, 0.05), k.camPos().y);
  chao.pos.x = k.camPos().x - k.width() / 2;
  teto.pos.x = k.camPos().x - k.width() / 2;
});

// Pedras de referência visual
k.add([
  k.rect(60, 80),
  k.pos(600, k.height() - 120),
  k.color(100, 100, 100),
  k.area(),
]);

k.add([
  k.rect(40, 130),
  k.pos(1000, k.height() - 160),
  k.color(100, 100, 100),
  k.area(),
]);
