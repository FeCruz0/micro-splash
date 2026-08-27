import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";

export function createPlayer(k: KaboomCtx) {
  const baleia = k.add([
    k.sprite("baleia"),
    k.pos(120, 200),
    k.area(),
    k.body(),
    k.rotate(0),
    k.color(255, 255, 255),
    k.anchor("center"),
    TAGS.PLAYER,
  ]);

  let currentSpeed = k.vec2(0, 0);
  let strokeTimer = 0;
  let facingRight = true;
  let targetCamOffset = 200;
  let angle = 0;
  let oxygen = 100;

  k.onUpdate(() => {
    // Virar Esquerda / Direita
    if (k.isKeyDown("left") || k.isKeyDown("a")) {
      facingRight = false;
      targetCamOffset = -200;
      baleia.flipX = true;
    }
    if (k.isKeyDown("right") || k.isKeyDown("d")) {
      facingRight = true;
      targetCamOffset = 200;
      baleia.flipX = false;
    }

    // Impulso (Espaço)
    if (k.isKeyDown("space")) {
      if (strokeTimer < GAME_CONFIG.MAX_STROKE_TIME) {
        strokeTimer += k.dt();
        const progresso = strokeTimer / GAME_CONFIG.MAX_STROKE_TIME;
        const curvaForca = GAME_CONFIG.BASE_THRUST + (Math.sin(progresso * Math.PI) * GAME_CONFIG.PEAK_THRUST);
        const rad = k.deg2rad(angle);
        const direcao = k.vec2(facingRight ? Math.cos(rad) : -Math.cos(rad), Math.sin(rad));

        currentSpeed = currentSpeed.add(direcao.scale(curvaForca * k.dt()));

        if (currentSpeed.len() > GAME_CONFIG.MAX_SPEED) {
          currentSpeed = currentSpeed.unit().scale(GAME_CONFIG.MAX_SPEED);
        }
      }
    }

    if (k.isKeyReleased("space")) {
      strokeTimer = 0;
    }

    // Rotação (Cima / Baixo)
    const velocidadeAtual = currentSpeed.len();
    if (velocidadeAtual > 15) {
      const velocidadeRotacao = GAME_CONFIG.ROTATION_SPEED * k.dt();
      if (k.isKeyDown("up") || k.isKeyDown("w")) {
        angle = k.clamp(angle - velocidadeRotacao, -45, 45);
      }
      if (k.isKeyDown("down") || k.isKeyDown("s")) {
        angle = k.clamp(angle + velocidadeRotacao, -45, 45);
      }
    } else {
      angle = k.lerp(angle, 0, 0.05);
    }

    baleia.angle = facingRight ? angle : -angle;
    baleia.move(currentSpeed.x, currentSpeed.y + GAME_CONFIG.SINK_RATE);
    currentSpeed = currentSpeed.scale(GAME_CONFIG.WATER_DRAG);

    // Câmera
    k.camPos(k.lerp(k.camPos().x, baleia.pos.x + targetCamOffset, 0.05), k.camPos().y);
    
    // se baleia submersa, perde oxigênio
    if (baleia.pos.y > 80) {
      oxygen = Math.max(0, oxygen - k.dt() * 4);
    } else {
      // na superficie recarrega folego e faz esguicho
      if (oxygen < 100) {
        oxygen = 100;
        k.shake(2); //leve tremor e esguicho
      }
    }

    // Transição de cor conforme perda de oxigenio
    const factor = oxygen / 100;
    const r = k.lerp(60, 255, factor);
    const g = k.lerp(80, 255, factor);
    const b = k.lerp(120, 255, factor);

    baleia.color = k.rgb(r, g, b);

    // debug valor oxygenio
    k.debug.log(`Fôlego: ${Math.floor(oxygen)}%`);
  });

  return {
    gameObj: baleia,
    getSpeed: () => currentSpeed,
    setSpeed: (newSpeed: any) => { currentSpeed = newSpeed; },
  };
}
