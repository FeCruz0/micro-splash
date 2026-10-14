import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import type { CanyonConfig } from "./canyon/canyonTypes";
import { setupCanyonGeometry } from "./canyon/canyonGeometry";
import { setupCanyonObstacles } from "./canyon/canyonObstacles";
import { setupCanyonCurrents } from "./canyon/canyonCurrents";

/**
 * Sistema Geológico da Ilha do Farol e Garganta do Boqueirão (Arraial do Cabo — 25.400m a 27.300m).
 *
 * Simula a geografia costeira real da entrada do berçário de reprodução (Fase 16):
 * 1. Fundo Rochoso Submarino do Boqueirão: elevação gradual da placa continental que reduz a profundidade
 *    da água de ~320px para apenas ~85px, exigindo pilotagem de precisão em nado raso.
 * 2. Falésias Monumentais da Ilha do Farol: paredões rochosos acima da linha da maré com vegetação atlântica.
 * 3. Farol Histórico de Arraial do Cabo: cúpula no cume da ilha com feixe de luz volumétrico giratório de 360°.
 * 4. Reverberação de Biosonar: toda a formação rochosa responde com contornos fluorescentes e retorno de eco
 *    ao ser atingida pelos pulsos de ecolocalização da jubarte.
 *
 * @param k - Instância do contexto Kaboom.js.
 */
export function setupCanyonSystem(k: KaboomCtx) {
  const surfaceY = GAME_CONFIG.SEA_LEVEL; // 80px (nível do mar)
  const deepFloorY = k.height() - 40; // Leito oceânico profundo padrão (~320px em 360p)

  // Altura do topo da laje rochosa rasa do Boqueirão:
  // Deixa uma lâmina d'água livre de cerca de 85px entre o nível do mar (80) e a rocha (165)
  const shallowRockTopY = Math.round(surfaceY + (k.height() - surfaceY) * 0.3);
  const seabedThickness = deepFloorY + 140 - shallowRockTopY;

  // Extensão horizontal da passagem
  const boqueiraoStartX = 25400;
  const rampUpEndX = 25800;
  const plateauEndX = 26900;
  const boqueiraoEndX = 27300;

  const lighthouseX = 26350; // Ponto mais alto da ilha onde fica o farol

  const config: CanyonConfig = {
    surfaceY,
    deepFloorY,
    shallowRockTopY,
    seabedThickness,
    boqueiraoStartX,
    rampUpEndX,
    plateauEndX,
    boqueiraoEndX,
    lighthouseX,
  };

  const geometry = setupCanyonGeometry(k, config);
  const anemones = setupCanyonObstacles(k, config);
  setupCanyonCurrents(k, geometry, anemones, config);
}
