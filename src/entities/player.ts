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
  let sonarCooldown = GAME_CONFIG.SONAR_COOLDOWN;

  // sistema de oxygenio
  let maxOxygen = 100;
  let oxygen = 100;
  let blackoutTimer = GAME_CONFIG.BLACKOUT_GRACE_TIME;
  let isFainting = false;

  k.onUpdate(() => {
    // se estiver demaiada
    if (isFainting) {
      baleia.color = k.rgb(60, 60, 80); // fica cinza escuro
      baleia.move(0, GAME_CONFIG.SINK_RATE * 2); // afunda mais rapido
      return; 
    }

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

    // SONAR
    if (sonarCooldown > 0) {
      sonarCooldown -= k.dt();
    }

    if ((k.isKeyDown("shift") || k.isKeyDown("e")) && sonarCooldown <=0) {
      sonarCooldown = GAME_CONFIG.SONAR_COOLDOWN;

      // posição de disparo (testa/melão da baleia)
      const headPos = baleia.pos.add(k.vec2(facingRight ? 30 : -30, 0));

      // onda visual sonica
      const pulse = k.add([
        k.circle(10),
        k.pos(headPos),
        k.color(0, 220, 255),
        k.opacity(0.8),
        k.z(10),
      ]);

      pulse.onUpdate(() => {
        pulse.radius += k.dt() * 350;
        pulse.opacity -= k.dt() *1.5;
        if (pulse.opacity <= 0) {
          k.destroy(pulse);
        }
      });

      // busca objetos e krills no mapa
      const targets = [...k.get(TAGS.TRASH), ...k.get(TAGS.KRILL)];

      targets.forEach((obje: any) => {
        const dist = headPos.dist(obje.pos);
        if (dist <= GAME_CONFIG.SONAR_RANGE) {
          // calcula angulo em direcao ao objeto
          const dirToObject = obje.pos.sub(headPos);
          const anguloObjeto = k.rad2deg(Math.atan2(dirToObject.y, dirToObject.x));

          // angulo de visual atual da baleia
          const baseAngle = facingRight ? angle : (180 - angle);
          let diff = Math.abs(anguloObjeto - baseAngle) % 360;
          if (diff > 180) diff = 360 - diff; // Normalização circular

          // Se o objeto estiver dentro do sonar (30º abertura)
          if (diff <= GAME_CONFIG.SONAR_ANGLE) {
            obje.opacity =1; // objeto revelado

            // tempo de visibilidade
            k.wait(3, () => {
              obje.opacity = 0;
            });
          }

        }
      });
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
   
    // se baleia submersa, perde oxigênio
    if (baleia.pos.y > 80) {
      oxygen = Math.max(0, oxygen - k.dt() * GAME_CONFIG.OXYGEN_DRAIN_RATE);

      if (oxygen === 0) {
        blackoutTimer -= k.dt();
        if (blackoutTimer <= 0) {
          isFainting = true;
          k.shake(4); // tremor forte quando desmaia
        }
      }
    
    } else {
      // na superficie recarrega folego para máximo atual
      if (oxygen < maxOxygen) {
        oxygen = maxOxygen;
        blackoutTimer = GAME_CONFIG.BLACKOUT_GRACE_TIME;
        k.shake(2); //leve tremor e esguicho
      }
    }

    // Transição de cor conforme perda de oxigenio
    const factor = oxygen / maxOxygen;
    const r = k.lerp(60, 255, factor);
    const g = k.lerp(80, 255, factor);
    const b = k.lerp(120, 255, factor);

    baleia.color = k.rgb(r, g, b);

     // Câmera
    k.camPos(k.lerp(k.camPos().x, baleia.pos.x + targetCamOffset, 0.05), k.camPos().y);

    // debug valor oxygenio
    k.debug.log(`Fôlego: ${Math.floor(oxygen)}%`);
  });

  return {
    gameObj: baleia,
    getSpeed: () => currentSpeed,
    setSpeed: (newSpeed: any) => { currentSpeed = newSpeed; },
    getOxygen: () => oxygen,
    getMaxOxygen: () => maxOxygen,
    isFainting: () => isFainting,

    modifyMaxOxygen: (amount: number) => {
      maxOxygen = k.clamp(maxOxygen + amount, 30, 100);
      oxygen = Math.min(oxygen, maxOxygen);
    },
  };
}
