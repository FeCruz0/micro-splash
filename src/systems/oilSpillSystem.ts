import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";
import { getParticlePool } from "./particlePool";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";

/**
 * Sistema de Mancha de Óleo Pré-Arraial (Fase 9.1)
 * Faixa: 17.400m a 18.900m (antes do Boqueirão)
 *
 * Simula um derramamento industrial de hidrocarbonetos na superfície.
 * Respirar ou romper a superfície nessa zona obstrui o espiráculo da baleia,
 * impedindo a recarga de oxigênio até que ela mergulhe fundo em águas limpas.
 */
/**
 * Calcula a cor da película iridescente com alternância senoidal de 3 cores químicas (Fase 30.7).
 * Cores: Azul cobalto / petróleo, Verde esmeralda, Violeta furta-cor.
 */
export function calculateIridescentOilColor(
  time: number,
  patchIndex: number
): [number, number, number] {
  const t = time * 2.0 + patchIndex * 0.7;
  const s1 = (Math.sin(t) + 1) * 0.5;
  const s2 = (Math.sin(t + 2.094) + 1) * 0.5; // +120°
  const s3 = (Math.sin(t + 4.188) + 1) * 0.5; // +240°

  const total = s1 + s2 + s3 || 1;
  const r = Math.round((s1 * 45 + s2 * 35 + s3 * 175) / total);
  const g = Math.round((s1 * 120 + s2 * 215 + s3 * 65) / total);
  const b = Math.round((s1 * 230 + s2 * 150 + s3 * 210) / total);
  return [r, g, b];
}

/**
 * Sistema de Mancha de Óleo Pré-Arraial (Fase 9.1 & 30.7)
 * Faixa: 17.400m a 18.900m (antes do Boqueirão)
 *
 * Simula um derramamento industrial de hidrocarbonetos na superfície com 3 camadas físicas.
 */
export function setupOilSpillSystem(k: KaboomCtx, playerController: PlayerController) {
  let isSystemActive = true;
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
  const buoyLight = buoy.add([k.circle(4), k.pos(0, -32), k.color(255, 40, 40)]);

  let buoyTime = 0;
  buoy.onUpdate(() => {
    if (!isSystemActive) return;

    buoyTime += k.dt();
    buoyLight.color = Math.floor(buoyTime * 4) % 2 === 0 ? k.rgb(255, 30, 30) : k.rgb(60, 10, 10);
    buoy.pos.y = GAME_CONFIG.SEA_LEVEL - 5 + Math.sin(buoyTime * 2.5) * 2;
  });

  // Gera manchas sequenciais de óleo viscoso com 3 camadas realistas (Fase 30.7)
  const patches: any[] = [];
  for (let x = SPILL_START; x < SPILL_END; x += PATCH_WIDTH - 20) {
    // Camada 1: Base densa de petróleo bruto na linha d'água
    const slick = k.add([
      k.rect(PATCH_WIDTH, 14, { radius: 4 }),
      k.pos(x, GAME_CONFIG.SEA_LEVEL - 2),
      k.color(8, 5, 5), // petróleo bruto ultra-escuro (8, 5, 5)
      k.opacity(0.9),
      k.z(18),
      "oil_spill",
    ]);

    // Camada 2: Película iridescente central (furta-cor com shimmer)
    const film = slick.add([
      k.rect(PATCH_WIDTH - 12, 3),
      k.pos(6, 2),
      k.color(160, 60, 200),
      k.opacity(0.8),
    ]);

    // Camada 3: Gotas de espuma emulsionada de contaminação nas bordas
    const foamPositions = [4, 12, PATCH_WIDTH - 16, PATCH_WIDTH - 8];
    const foamDrops = foamPositions.map((relX, fIdx) => {
      return slick.add([
        k.circle(fIdx % 2 === 0 ? 2.5 : 2),
        k.pos(relX, 2 + (fIdx % 2) * 2),
        k.color(245, 245, 235), // espuma branca/amarelada
        k.opacity(0.3),
      ]);
    });

    patches.push({ slick, film, foamDrops, baseX: x });
  }

  let shimmerTime = 0;

  k.onUpdate(() => {
    if (!isSystemActive) return;

    const player = playerController.gameObj;
    if (!player) return;

    shimmerTime += k.dt();

    // Atualiza reflexos iridescentes (onda de cores químicas de hidrocarbonetos)
    patches.forEach((p, idx) => {
      // Ativa somente se estiver próximo da visão do jogador
      if (Math.abs(p.baseX - player.pos.x) < 1400) {
        p.slick.hidden = false;
        // Ondulação suave da mancha
        p.slick.pos.y = GAME_CONFIG.SEA_LEVEL - 2 + Math.sin(shimmerTime * 2 + idx * 0.8) * 1.5;

        // Variação química de cor da película iridescente
        const [r, g, b] = calculateIridescentOilColor(shimmerTime, idx);
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
          const dropPos = k.vec2(
            player.pos.x + (Math.random() - 0.5) * 30,
            GAME_CONFIG.SEA_LEVEL + Math.random() * 4
          );
          const pool = getParticlePool();
          if (pool) {
            pool.spawnCircle({
              pos: dropPos,
              radius: 1.5 + Math.random() * 1.8,
              color: k.rgb(24, 16, 12),
              opacity: 0.85,
              z: 20,
              vel: k.vec2(0, 40),
              fadeRate: 2.0,
              maxLife: 0.45,
            });
          } else {
            const drop = k.add([
              k.circle(1.5 + Math.random() * 1.8),
              k.pos(dropPos),
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
    }
  });

  const activate = () => {
    isSystemActive = true;
    buoy.hidden = false;
  };

  const deactivate = () => {
    isSystemActive = false;
    buoy.hidden = true;
    patches.forEach((p) => {
      p.slick.hidden = true;
    });
  };

  const biomeMgr = getBiomeLifecycleManager();
  if (biomeMgr) {
    biomeMgr.registerModule({
      id: "oil_spill",
      name: "Mancha de Petróleo (Pré-Arraial)",
      minX: 16500,
      maxX: 19800,
      activate,
      deactivate,
      isActive: () => isSystemActive,
    });
  }

  return {
    activate,
    deactivate,
    isActive: () => isSystemActive,
  };
}
