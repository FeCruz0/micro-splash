import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { isPositionInIceGap } from "../systems/iceSurface";
import { audioSystem } from "../systems/audioSystem";

export function createPlayer(k: KaboomCtx, initialX: number = 120, isSereneMode: boolean = false) {
  const baleia = k.add([
    k.sprite("baleia", { anim: "glide" }),
    k.pos(initialX, 200),
    k.area({ shape: new k.Rect(k.vec2(0, 0), 108, 38) }),
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
  let spoutCooldown = 0;

  // Animações anatômicas da Jubarte
  let animState: "glide" | "stroke_up" | "stroke_down" | "feed" = "glide";
  let feedTimer = 0;

  // Sistema de partículas do espiráculo (Blowhole Spout)
  function spawnBlowholeSpout(pos: any, isFacingRight: boolean, hSpeed: number) {
    audioSystem.playBlowholeSpout();

    const spoutOrigin = pos.add(k.vec2(isFacingRight ? 18 : -18, -14));

    // 32 partículas de condensação e vapor marinho em formato de V
    for (let i = 0; i < 32; i++) {
      const isRightPlume = i % 2 === 0;
      // Ângulos das duas plumas em V: esquerda ~ -98° (-1.71 rad), direita ~ -82° (-1.43 rad)
      const baseAngle = isRightPlume ? -1.45 : -1.69;
      const spread = (Math.random() - 0.5) * 0.22;
      const speed = 190 + Math.random() * 170;
      const dir = k.vec2(Math.cos(baseAngle + spread), Math.sin(baseAngle + spread));

      let vel = dir.scale(speed);
      vel.x += hSpeed * 0.35; // herda parte do movimento horizontal da baleia

      const particle = k.add([
        k.circle(1.8 + Math.random() * 2.2),
        k.pos(spoutOrigin.x + (Math.random() - 0.5) * 6, spoutOrigin.y),
        k.color(225, 242, 255),
        k.opacity(0.85),
        k.z(15),
      ]);

      let life = 0.65 + Math.random() * 0.45;
      const maxLife = life;

      particle.onUpdate(() => {
        const dt = k.dt();
        vel.y += 240 * dt; // gravidade puxando gotículas de volta ao mar
        particle.pos = particle.pos.add(vel.scale(dt));
        particle.radius += dt * 3.2; // expansão de vapor
        life -= dt;
        particle.opacity = Math.max(0, (life / maxLife) * 0.85);

        if (life <= 0 || particle.pos.y > GAME_CONFIG.SEA_LEVEL + 35) {
          k.destroy(particle);
        }
      });
    }
  }

  // Partículas de sucção convergente ao alimentar-se de Krill
  function spawnBaleenSuction(pos: any, isFacingRight: boolean) {
    const mouthPos = pos.add(k.vec2(isFacingRight ? 46 : -46, 2));
    for (let i = 0; i < 12; i++) {
      const pAngle = Math.random() * Math.PI * 2;
      const dist = 22 + Math.random() * 24;
      const p = k.add([
        k.circle(1.2 + Math.random() * 1.5),
        k.pos(mouthPos.x + Math.cos(pAngle) * dist, mouthPos.y + Math.sin(pAngle) * dist),
        k.color(255, 175, 145),
        k.opacity(0.85),
        k.z(20),
      ]);

      p.onUpdate(() => {
        const toMouth = mouthPos.sub(p.pos);
        if (toMouth.len() < 6) {
          k.destroy(p);
        } else {
          p.pos = p.pos.add(toMouth.unit().scale(190 * k.dt()));
          p.opacity -= k.dt() * 2.4;
          if (p.opacity <= 0) k.destroy(p);
        }
      });
    }
  }

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
    // se estiver desmaiada
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

      // SONAR OMNIDIRECIONAL EM 360° (Varredura Total da Tela)
      if (sonarCooldown > 0) {
        sonarCooldown -= k.dt();
      }

      if ((k.isKeyDown("shift") || k.isKeyDown("e")) && sonarCooldown <= 0) {
        sonarCooldown = GAME_CONFIG.SONAR_COOLDOWN;
        audioSystem.playSonarSound();
        audioSystem.playWhaleSong(1.0, 1.0); // Baleia emite seu canto sagrado ao usar o biosonar

        // Posição de disparo (melão / testa da baleia)
        const headPos = baleia.pos.add(k.vec2(facingRight ? 42 : -42, -4));

        // 1. Onda acústica concêntrica primária (360°)
        const primaryPulse = k.add([
          k.circle(15),
          k.pos(headPos),
          k.color(0, 230, 255),
          k.outline(3, k.rgb(180, 255, 255)),
          k.opacity(0.8),
          k.z(20),
        ]);

        primaryPulse.onUpdate(() => {
          primaryPulse.radius += k.dt() * 520;
          primaryPulse.opacity -= k.dt() * 0.9;
          if (primaryPulse.opacity <= 0 || primaryPulse.radius >= GAME_CONFIG.SONAR_RANGE) {
            k.destroy(primaryPulse);
          }
        });

        // 2. Onda secundária (eco sonoplástico concêntrico)
        k.wait(0.08, () => {
          const secondaryPulse = k.add([
            k.circle(10),
            k.pos(headPos),
            k.color(0, 160, 240),
            k.outline(2, k.rgb(120, 220, 255)),
            k.opacity(0.6),
            k.z(19),
          ]);

          secondaryPulse.onUpdate(() => {
            secondaryPulse.radius += k.dt() * 480;
            secondaryPulse.opacity -= k.dt() * 0.85;
            if (secondaryPulse.opacity <= 0 || secondaryPulse.radius >= GAME_CONFIG.SONAR_RANGE) {
              k.destroy(secondaryPulse);
            }
          });
        });

        // 3. Varredura de 360° de todos os objetos e relevos submersos
        const targets = [
          ...k.get(TAGS.TRASH),
          ...k.get(TAGS.KRILL),
          ...k.get(TAGS.NET),
          ...k.get("canyon_rock"),
        ];

        let echoCount = 0;
        targets.forEach((targetEntity: any) => {
          const distanceToObject = headPos.dist(targetEntity.pos);
          if (distanceToObject <= GAME_CONFIG.SONAR_RANGE) {
            // Tempo proporcional para a onda de choque acústico atingir o objeto
            const travelTime = (distanceToObject / 520);
            k.wait(travelTime, () => {
              if (targetEntity.reveal) {
                targetEntity.reveal();
              } else {
                targetEntity.opacity = 1;
              }

              // Anel de reflexão acústica (eco visual no alvo)
              const echoPing = k.add([
                k.circle(8),
                k.pos(targetEntity.pos),
                k.color(0, 240, 255),
                k.outline(2, k.rgb(255, 255, 255)),
                k.opacity(0.9),
                k.z(22),
              ]);

              echoPing.onUpdate(() => {
                echoPing.radius += k.dt() * 45;
                echoPing.opacity -= k.dt() * 2.8;
                if (echoPing.opacity <= 0) k.destroy(echoPing);
              });

              // Eco sonoro no ouvido do jogador
              if (echoCount < 4) {
                echoCount++;
                audioSystem.playSonarEcho(Math.min(280, distanceToObject * 0.35));
              }
            });
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

    // Atualização de animações orgânicas de nado e alimentação
    if (feedTimer > 0) {
      feedTimer -= k.dt();
      if (animState !== "feed") {
        animState = "feed";
        baleia.play("feed");
      }
    } else {
      if (k.isKeyDown("space") && !isTrapped && !isFainting) {
        const strokePhase = strokeTimer / GAME_CONFIG.MAX_STROKE_TIME;
        const targetAnim = strokePhase < 0.5 ? "stroke_up" : "stroke_down";
        if (animState !== targetAnim) {
          animState = targetAnim;
          baleia.play(targetAnim);
        }
      } else {
        if (animState !== "glide") {
          animState = "glide";
          baleia.play("glide");
        }
      }
    }

    // Leve oscilação de cauda orgânica em movimento
    const swimSway = (currentSpeed.len() > 20 && !isFainting)
      ? Math.sin(k.time() * 7) * Math.min(2.5, currentSpeed.len() / 80)
      : 0;

    baleia.angle = (facingRight ? angle : -angle) + swimSway;
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

    if (spoutCooldown > 0) {
      spoutCooldown -= k.dt();
    }

    if (isSereneMode) {
      // Modo Navegação Serena: Oxigênio infinito permanente, sem risco de desmaio
      oxygen = getMaxOxygen();
      isFainting = false;

      // Mesmo no modo Serena, permite esguicho estético do espiráculo ao emergir
      if (canBreathe && spoutCooldown <= 0 && baleia.pos.y <= GAME_CONFIG.SEA_LEVEL + 15) {
        spoutCooldown = 2.5;
        spawnBlowholeSpout(baleia.pos, facingRight, currentSpeed.x);
      }
    } else if (!canBreathe) {
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
        const hadLowOxygen = oxygen < GAME_CONFIG.BLOWHOLE_OXYGEN_THRESHOLD;
        oxygen = currentMaxOx;
        blackoutTimer = GAME_CONFIG.BLACKOUT_GRACE_TIME;
        k.shake(2); // leve tremor e esguicho

        // Efeito de Esguicho do Espiráculo (Blowhole Spout)
        if (hadLowOxygen && spoutCooldown <= 0) {
          spoutCooldown = 2.0;
          spawnBlowholeSpout(baleia.pos, facingRight, currentSpeed.x);
        }
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

    // Indicador no HUD
    if (isSereneMode) {
      k.debug.log(`Migração Serena 🌸 | Fôlego: ∞ | Nutrição: +${krillsEaten}%`);
    } else {
      k.debug.log(`Fôlego: ${Math.floor(oxygen)}% | Nutrição: +${krillsEaten}%`);
    }
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
    isSereneMode: () => isSereneMode,

    // Consumo de Krill: +1% permanente em velocidade máxima e oxigênio máximo com animação de alimentação
    consumeKrill: () => {
      krillsEaten++;
      const newMaxOx = getMaxOxygen();
      oxygen = Math.min(oxygen + GAME_CONFIG.KRILL_OXYGEN_RESTORE, newMaxOx);
      currentSpeed = currentSpeed.scale(GAME_CONFIG.KRILL_BOOST);

      feedTimer = 0.4;
      animState = "feed";
      baleia.play("feed");
      spawnBaleenSuction(baleia.pos, facingRight);
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

