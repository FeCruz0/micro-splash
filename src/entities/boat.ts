import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG } from "../config";

/**
 * Cria o barco de resgate da Guarda Marítima / Instituto Baleia Jubarte (Fase 34.3).
 * Conta com mastro vertical, flâmula oscilante, faixa de salvamento laranja,
 * cabine com vigias e esteira de espuma d'água (scia) durante o deslocamento.
 */
export function createRescueBoat(k: KaboomCtx, targetPos: Vec2) {
  // Barco da Guarda Marítima navegando na linha d'água
  const boat = k.add([
    k.rect(94, 30, { radius: 5 }),
    k.pos(targetPos.x - 300, GAME_CONFIG.SEA_LEVEL + 8),
    k.color(245, 248, 252), // Casco branco naval
    k.outline(2.5, k.rgb(30, 60, 110)), // Borda azul marinho de proteção
    k.anchor("botleft"),
    k.z(50),
  ]);

  // Faixa diagonal de salvamento laranja de alta visibilidade (Guarda Marítima / Salvamento)
  boat.add([k.rect(14, 26, { radius: 2 }), k.pos(60, -28), k.color(249, 115, 22), k.rotate(-18)]);

  // Segunda faixa fina de contraste azul
  boat.add([k.rect(5, 26, { radius: 1 }), k.pos(74, -28), k.color(30, 64, 175), k.rotate(-18)]);

  // Cabine do barco de salvamento
  const cabin = boat.add([
    k.rect(34, 22, { radius: 3 }),
    k.pos(18, -30),
    k.color(210, 220, 235),
    k.outline(2, k.rgb(40, 55, 80)),
  ]);

  // Vigias / Janelas de vidro com reflexo turquesa
  cabin.add([k.rect(7, 7, { radius: 1 }), k.pos(5, 4), k.color(125, 211, 252), k.opacity(0.85)]);
  cabin.add([k.rect(7, 7, { radius: 1 }), k.pos(15, 4), k.color(125, 211, 252), k.opacity(0.85)]);

  // Mastro vertical naval (Fase 34.3)
  boat.add([
    k.rect(3, 40),
    k.pos(33, -68),
    k.color(160, 175, 195),
    k.outline(1, k.rgb(50, 65, 85)),
  ]);

  // Flâmula / Bandeira triangular verde com detalhe dourado oscilante (Fase 34.3)
  const flag = boat.add([
    k.rect(14, 9, { radius: 1 }),
    k.pos(36, -68),
    k.color(34, 197, 94), // Verde floresta / brasileiro
    k.rotate(0),
  ]);

  boat.add([
    k.rect(5, 4),
    k.pos(40, -65.5),
    k.color(250, 204, 21), // Detalhe dourado
  ]);

  // Luz do sinalizador de emergência (Estroboscópio Vermelho / Azul Marinho)
  const beacon = cabin.add([k.circle(5), k.pos(17, -8), k.color(255, 0, 0)]);

  let time = 0;
  let wakeTimer = 0;

  boat.onUpdate(() => {
    const dt = k.dt();
    time += dt;
    wakeTimer += dt;

    // Alternância do sinalizador de socorro
    beacon.color = Math.floor(time * 6) % 2 === 0 ? k.rgb(255, 50, 50) : k.rgb(56, 189, 248);

    // Oscilação dinâmica da bandeira ao vento
    flag.angle = Math.sin(time * 10) * 8;

    // Deslocamento até o ponto da baleia desmaiada
    const targetX = targetPos.x - 45;
    const isMoving = boat.pos.x < targetX;

    if (isMoving) {
      boat.pos.x += dt * 125;

      // Geração de esteira de espuma d'água (scia) na popa (Fase 34.3)
      if (wakeTimer >= 0.07) {
        wakeTimer = 0;
        k.add([
          k.circle(k.rand(2, 4.5)),
          k.pos(boat.pos.x - 4, boat.pos.y - 6),
          k.color(240, 248, 255),
          k.opacity(0.85),
          k.lifespan(0.4, { fade: 0.2 }),
          k.z(48),
        ]);
      }
    } else {
      // Flutuação suave ancorada acima da baleia
      boat.pos.y = GAME_CONFIG.SEA_LEVEL + 8 + Math.sin(time * 2.8) * 2.2;
    }
  });

  return boat;
}

/**
 * Cria um barco de pesca artesanal / traineira estacionada no bioma da Costa Urbana (Fase 35.5).
 * Dimensão compacta de 60×20px, cabine de comando, mastro com guincho e rede visível
 * sendo lançada na popa, conferindo contexto narrativo à presença das redes fantasmas no setor.
 */
export function createFishingTrawler(k: KaboomCtx, positionX: number) {
  const baseWaterY = GAME_CONFIG.SEA_LEVEL + 6;

  // Casco rústico de traineira pesqueira (60×20px)
  const trawler = k.add([
    k.rect(60, 20, { radius: 4 }),
    k.pos(positionX, baseWaterY),
    k.color(52, 73, 94), // Azul ardósia náutico envelhecido
    k.outline(2, k.rgb(33, 47, 61)),
    k.anchor("botleft"),
    k.z(-2),
    "fishing_trawler",
  ]);

  // Faixa de linha d'água no casco
  trawler.add([
    k.rect(60, 6),
    k.pos(0, -6),
    k.color(180, 50, 40), // Faixa anti-incrustante vermelha
  ]);

  // Cabine de proa/comando
  trawler.add([
    k.rect(20, 15, { radius: 2 }),
    k.pos(8, -20),
    k.color(225, 230, 235),
    k.outline(1.5, k.rgb(40, 55, 70)),
  ]);

  // Vigia/janela da cabine
  trawler.add([
    k.rect(6, 6, { radius: 1 }),
    k.pos(12, -17),
    k.color(120, 200, 240),
    k.opacity(0.85),
  ]);

  // Mastro vertical central
  trawler.add([
    k.rect(2.5, 28),
    k.pos(28, -48),
    k.color(130, 140, 150),
    k.outline(1, k.rgb(50, 60, 70)),
  ]);

  // Lança / braço do guincho inclinada em direção à popa (+X)
  trawler.add([
    k.rect(2, 22),
    k.pos(38, -32),
    k.color(160, 120, 60),
    ...(typeof k.rotate === "function" ? [k.rotate(35)] : []),
  ]);

  // Carretel / guincho de tração na popa
  trawler.add([
    k.circle(3.5),
    k.pos(48, -12),
    k.color(60, 60, 65),
    k.outline(1, k.rgb(180, 100, 30)),
  ]);

  // Rede de arrasto visível sendo despejada na popa em direção à água
  trawler.add([
    k.rect(16, 26, { radius: 2 }),
    k.pos(44, 4),
    k.color(75, 125, 95), // Verde malha idêntico à getBiomeNetPalette da Costa Urbana
    k.opacity(0.65),
    k.outline(1.5, k.rgb(55, 80, 70)),
    ...(typeof k.rotate === "function" ? [k.rotate(12)] : []),
    "trawler_deployed_net",
  ]);

  // Boias alaranjadas na rede suspensa
  trawler.add([k.circle(2), k.pos(47, 6), k.color(245, 140, 40)]);
  trawler.add([k.circle(2), k.pos(56, 8), k.color(245, 140, 40)]);
  trawler.add([k.circle(2), k.pos(52, 18), k.color(245, 190, 40)]);

  let oscillationTime = Math.random() * Math.PI * 2;
  trawler.onUpdate(() => {
    const deltaTime = k.dt();
    oscillationTime += deltaTime * 2.2;
    // Balanço marítimo suave na superfície
    trawler.pos.y = baseWaterY + Math.sin(oscillationTime) * 1.8;
  });

  return trawler;
}
