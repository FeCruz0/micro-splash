import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { isPositionInIceGap } from "../systems/iceSurface";
import { audioSystem } from "../systems/audioSystem";

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

  // sistema de oxigenio e progressao nutricional (Fase 3)
  let baseMaxOxygen = 100;
  let krillsEaten = 0;

  const getMaxOxygen = () => baseMaxOxygen + krillsEaten * 1;
  const getMaxSpeed = () => GAME_CONFIG.MAX_SPEED * (1 + krillsEaten * 0.01);

  let oxygen = 100;
  let blackoutTimer = GAME_CONFIG.BLACKOUT_GRACE_TIME;
  let isFainting = false;

  // sistema de rede e salto majestoso
  let isTrapped = false;
  let escapesNeeded = 0;
  let isBreaching = false;

  k.onUpdate(() => {
    // se estiver demaiada
    if (isFainting) {
      baleia.color = k.rgb(60, 60, 80); // fica cinza escuro
      baleia.move(0, GAME_CONFIG.SINK_RATE * 2); // afunda mais rapido
      return; 
    }

    // se estiver no Salto Majestoso (Breach)
    if (isBreaching) {
      facingRight = true;
      targetCamOffset = 200;
      baleia.flipX = false;
      if (currentSpeed.len() > 10) {
        angle = k.clamp(k.rad2deg(Math.atan2(currentSpeed.y, currentSpeed.x)), -45, 45);
      }
    } else if (isTrapped) {
      // Apenas o controle de nado fica travado; barra de espaço serve para se soltar
      if (k.isKeyPressed("space")) {
        escapesNeeded--;
        k.shake(2);
        if (escapesNeeded <= 0) {
          isTrapped = false; // se soltou da rede!
        }
      }
      // Alinha ângulo suavemente enquanto afunda enroscada
      angle = k.lerp(angle, 0, 0.05);
    } else {
      // CONTROLES DO JOGADOR (ativos quando livre)
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
      if (k.isKeyPressed("space")) {
        audioSystem.playStrokeThrust();
      }

      if (k.isKeyDown("space")) {
        if (strokeTimer < GAME_CONFIG.MAX_STROKE_TIME) {
          strokeTimer += k.dt();
          const progresso = strokeTimer / GAME_CONFIG.MAX_STROKE_TIME;
          const curvaForca = GAME_CONFIG.BASE_THRUST + (Math.sin(progresso * Math.PI) * GAME_CONFIG.PEAK_THRUST);
          const angleInRadians = k.deg2rad(angle);
          const direcao = k.vec2(facingRight ? Math.cos(angleInRadians) : -Math.cos(angleInRadians), Math.sin(angleInRadians));

          currentSpeed = currentSpeed.add(direcao.scale(curvaForca * k.dt()));

          const currentMaxSpeed = getMaxSpeed();
          if (currentSpeed.len() > currentMaxSpeed) {
            currentSpeed = currentSpeed.unit().scale(currentMaxSpeed);
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

      if ((k.isKeyDown("shift") || k.isKeyDown("e")) && sonarCooldown <= 0) {
        sonarCooldown = GAME_CONFIG.SONAR_COOLDOWN;
        audioSystem.playSonarSound();

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
          pulse.opacity -= k.dt() * 1.5;
          if (pulse.opacity <= 0) {
            k.destroy(pulse);
          }
        });

        // busca objetos e krills no mapa
        const targets = [...k.get(TAGS.TRASH), ...k.get(TAGS.KRILL), ...k.get(TAGS.NET)];

        targets.forEach((targetEntity: any) => {
          const distanceToObject = headPos.dist(targetEntity.pos);
          if (distanceToObject <= GAME_CONFIG.SONAR_RANGE) {
            // calcula angulo em direcao ao objeto
            const dirToObject = targetEntity.pos.sub(headPos);
            const anguloObjeto = k.rad2deg(Math.atan2(dirToObject.y, dirToObject.x));

            // angulo de visual atual da baleia
            const baseAngle = facingRight ? angle : (180 - angle);
            let angleDifference = Math.abs(anguloObjeto - baseAngle) % 360;
            if (angleDifference > 180) angleDifference = 360 - angleDifference; // Normalização circular

            // Se o objeto estiver dentro do sonar (30º abertura)
            if (angleDifference <= GAME_CONFIG.SONAR_ANGLE) {
              targetEntity.opacity = 1; // objeto revelado
            }
          }
        });
      }

      // Rotação (Cima / Baixo)
      const velocidadeRotacao = GAME_CONFIG.ROTATION_SPEED * k.dt();

      if (k.isKeyDown("up") || k.isKeyDown("w")) {
        angle = k.clamp(angle - velocidadeRotacao, -45, 45);
      } else if (k.isKeyDown("down") || k.isKeyDown("s")) {
        angle = k.clamp(angle + velocidadeRotacao, -45, 45);
      } else {
        angle = k.lerp(angle, 0, 0.05);
      }
    }
    

    baleia.angle = facingRight ? angle : -angle;
    const inAir = baleia.pos.y < GAME_CONFIG.SEA_LEVEL;
    const airGravity = inAir ? 120 : 0;

    if (isBreaching && inAir) {
      // Física balística aerodinâmica durante o Salto Majestoso
      currentSpeed.y += 620 * k.dt(); // gravidade realista no ar
      currentSpeed.x = currentSpeed.x * 0.996; // arrasto mínimo no ar
      baleia.move(currentSpeed.x, currentSpeed.y);
    } else {
      baleia.move(currentSpeed.x, currentSpeed.y + GAME_CONFIG.SINK_RATE + airGravity);
      currentSpeed = currentSpeed.scale(GAME_CONFIG.WATER_DRAG);
    }
   
    // se baleia submersa ou bloqueada por gelo na Antártida, perde oxigênio
    const isAtSurface = baleia.pos.y <= GAME_CONFIG.SEA_LEVEL + 40;
    const canBreathe = isAtSurface && isPositionInIceGap(baleia.pos.x);

    if (!canBreathe) {
      oxygen = Math.max(0, oxygen - k.dt() * GAME_CONFIG.OXYGEN_DRAIN_RATE);

      if (oxygen === 0) {
        blackoutTimer -= k.dt();
        if (blackoutTimer <= 0) {
          isFainting = true;
          k.shake(4); // tremor forte quando desmaia
        }
      }
    } else {
      // na superfície livre de gelo, recarrega fôlego para máximo atual
      const currentMaxOx = getMaxOxygen();
      if (oxygen < currentMaxOx) {
        oxygen = currentMaxOx;
        blackoutTimer = GAME_CONFIG.BLACKOUT_GRACE_TIME;
        k.shake(2); // leve tremor e esguicho
      }
    }

    // Transição de cor conforme perda de oxigenio e estado de emaranhada
    const currentMaxOx = getMaxOxygen();
    const oxygenRatio = oxygen / currentMaxOx;
    const r = k.lerp(60, 255, oxygenRatio);
    const g = k.lerp(80, 255, oxygenRatio);
    const b = k.lerp(120, 255, oxygenRatio);

    baleia.color = isTrapped ? k.rgb(190, 90, 230) : k.rgb(r, g, b);

     // Câmera
    k.camPos(k.lerp(k.camPos().x, baleia.pos.x + targetCamOffset, 0.05), k.camPos().y);

    // debug valor oxygenio
    k.debug.log(`Fôlego: ${Math.floor(oxygen)}% | Stats: +${krillsEaten}%`);
  });

  return {
    gameObj: baleia,
    getSpeed: () => currentSpeed,
    setSpeed: (newSpeed: any) => { currentSpeed = newSpeed; },
    getOxygen: () => oxygen,
    getMaxOxygen: () => getMaxOxygen(),
    getMaxSpeed: () => getMaxSpeed(),
    getKrillsEaten: () => krillsEaten,
    isFainting: () => isFainting,

    // Consumo de Krill: +1% permanente em velocidade máxima e oxigênio máximo (sem texto na tela)
    consumeKrill: () => {
      krillsEaten++;
      const newMaxOx = getMaxOxygen();
      oxygen = Math.min(oxygen + GAME_CONFIG.KRILL_OXYGEN_RESTORE, newMaxOx);
      currentSpeed = currentSpeed.scale(GAME_CONFIG.KRILL_BOOST);
    },

    // Penalidade por lixo (perda direta de oxigênio temporário)
    penalizeTrash: () => {
      oxygen = Math.max(0, oxygen - GAME_CONFIG.TRASH_OXYGEN_PENALTY);
    },

    trapInNet: (count: number) => {
      isTrapped = true;
      escapesNeeded = Math.max(escapesNeeded, count);
      currentSpeed = currentSpeed.scale(0.3);
    },

    addTrapCount: (count: number) => {
      isTrapped = true;
      escapesNeeded += count;
      currentSpeed = currentSpeed.scale(0.5);
    },

    isTrapped: () => isTrapped,

    startBreach: () => {
      isBreaching = true;
      isTrapped = false;
    },

    isBreaching: () => isBreaching,

  };
}
