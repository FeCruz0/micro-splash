import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";

/**
 * Sistema de Mancha de Óleo Pré-Arraial (Fase 9.1)
 * Faixa: 17.400m a 18.900m (antes do Boqueirão)
 * 
 * Simula um derramamento industrial de hidrocarbonetos na superfície.
 * Respirar ou romper a superfície nessa zona obstrui o espiráculo da baleia,
 * impedindo a recarga de oxigênio até que ela mergulhe fundo em águas limpas.
 */
export function setupOilSpillSystem(k: KaboomCtx, playerController: PlayerController) {
  const SPILL_START = 17400;
  const SPILL_END = 18900;
  const PATCH_WIDTH = 180;

  // Boia de alerta ecológico no início do derramamento
  const buoy = k.add([
    k.rect(24, 30, { radius: 3 }),
    k.pos(SPILL_START + 20, GAME_CONFIG.SEA_LEVEL - 5),
    k.color(255, 140, 0), // Laranja de segurança
    k.outline(2, k.rgb(30, 30, 30)),
    k.anchor("bot"),
    k.z(25),
  ]);

  // Luz piscante de perigo na boia
  const buoyLight = buoy.add([
    k.circle(4),
    k.pos(0, -32),
    k.color(255, 40, 40),
  ]);

  let buoyTime = 0;
  buoy.onUpdate(() => {
    buoyTime += k.dt();
    buoyLight.color = Math.floor(buoyTime * 4) % 2 === 0 ? k.rgb(255, 30, 30) : k.rgb(60, 10, 10);
    buoy.pos.y = GAME_CONFIG.SEA_LEVEL - 5 + Math.sin(buoyTime * 2.5) * 2;
  });

  // Gera manchas sequenciais de óleo viscoso com reflexos iridescentes
  const patches: any[] = [];
  for (let x = SPILL_START; x < SPILL_END; x += PATCH_WIDTH - 20) {
    // Camada principal de petróleo bruto na linha d'água
    const slick = k.add([
      k.rect(PATCH_WIDTH, 14, { radius: 4 }),
      k.pos(x, GAME_CONFIG.SEA_LEVEL - 2),
      k.color(20, 14, 10), // óleo negro denso
      k.opacity(0.88),
      k.z(18),
      "oil_spill",
    ]);

    // Película iridescente superior (arco-íris de hidrocarboneto)
    const film = slick.add([
      k.rect(PATCH_WIDTH - 10, 3),
      k.pos(5, 1),
      k.color(180, 80, 220),
      k.opacity(0.75),
    ]);

    patches.push({ slick, film, baseX: x });
  }

  let shimmerTime = 0;

  k.onUpdate(() => {
    const player = playerController.gameObj;
    if (!player) return;

    shimmerTime += k.dt();

    // Atualiza reflexos iridescentes (onda de cores de petróleo)
    patches.forEach((p, idx) => {
      // Ativa somente se estiver próximo da visão do jogador
      if (Math.abs(p.baseX - player.pos.x) < 1400) {
        p.slick.hidden = false;
        // Ondulação suave da mancha
        p.slick.pos.y = GAME_CONFIG.SEA_LEVEL - 2 + Math.sin(shimmerTime * 2 + idx * 0.8) * 1.5;

        // Variação de cor da película iridescente (arco-íris característico)
        const hue = (shimmerTime * 60 + idx * 45) % 360;
        const phase = (hue / 360) * 3;
        let r = 180, g = 80, b = 220;
        if (phase < 1) {
          r = 220 - phase * 140;
          g = 80 + phase * 140;
          b = 100;
        } else if (phase < 2) {
          const p2 = phase - 1;
          r = 80;
          g = 220 - p2 * 80;
          b = 100 + p2 * 140;
        } else {
          const p3 = phase - 2;
          r = 80 + p3 * 140;
          g = 140 - p3 * 60;
          b = 240 - p3 * 20;
        }
        p.film.color = k.rgb(r, g, b);
      } else {
        p.slick.hidden = true;
      }
    });

    // Detecção: Jogador na superfície dentro da área do derramamento
    if (player.pos.x >= SPILL_START && player.pos.x <= SPILL_END) {
      if (player.pos.y <= GAME_CONFIG.SEA_LEVEL + 16) {
        // Obstrui espiráculo
        playerController.setOilObstructed(true);

        // Respingo de gotículas de óleo negro em contato
        if (Math.random() < 0.4) {
          const drop = k.add([
            k.circle(1.5 + Math.random() * 1.8),
            k.pos(player.pos.x + (Math.random() - 0.5) * 30, GAME_CONFIG.SEA_LEVEL + Math.random() * 4),
            k.color(24, 16, 12),
            k.opacity(0.85),
            k.z(20),
          ]);
          drop.onUpdate(() => {
            drop.pos.y += k.dt() * 40;
            drop.opacity -= k.dt() * 2.0;
            if (drop.opacity <= 0) k.destroy(drop);
          });
        }
      }
    }
  });
}
