import type { KaboomCtx, GameObj } from "kaboom";
import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";

/**
 * Função pura que calcula a opacidade do filtro de escuridão com base na profundidade Y da baleia (Fase 30.5).
 * Simula a absorção física real do espectro luminoso (especialmente luz vermelha) à medida que a baleia mergulha.
 *
 * @param playerY - Posição Y da baleia no mundo
 * @param seaLevel - Nível do mar (superfície)
 * @param screenHeight - Altura da tela
 * @param maxDarkness - Opacidade máxima do overlay (padrão 0.38)
 */
export function calculateDepthDarknessOpacity(
  playerY: number,
  seaLevel: number = GAME_CONFIG.SEA_LEVEL,
  screenHeight: number = 360,
  maxDarkness: number = 0.38
): number {
  if (playerY <= seaLevel + 10) {
    return 0;
  }

  const floorY = screenHeight - 40;
  const maxMergulho = Math.max(1, floorY - seaLevel);
  const currentDepth = Math.max(0, playerY - seaLevel);
  const depthRatio = Math.min(1, currentDepth / maxMergulho);

  // Curva quadrática suave para que os primeiros metros fiquem límpidos e o fundo escureça progressivamente
  return Math.min(maxDarkness, Math.pow(depthRatio, 1.25) * maxDarkness);
}

/**
 * Sistema de Escuridão Progressiva com Profundidade (Fase 30.5):
 * Sobrepõe um filtro ótico abissal proporcional à profundidade do mergulho da jubarte.
 */
export function setupDepthDarknessSystem(
  k: KaboomCtx,
  playerController: PlayerController
): {
  destroy: () => void;
  getOverlay: () => GameObj;
} {
  const overlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.fixed(),
    k.color(0, 10, 25), // Tom azul-abissal profundo
    k.opacity(0),
    k.z(8), // Acima da baleia e cenário marítimo, mas estritamente abaixo do HUD (z >= 100)
    "depth_darkness_overlay",
  ]);

  const updateEvt = k.onUpdate(() => {
    const playerObj = playerController.gameObj;
    if (!playerObj) return;

    const targetOpacity = calculateDepthDarknessOpacity(
      playerObj.pos.y,
      GAME_CONFIG.SEA_LEVEL,
      k.height()
    );

    // Interpolação suave para transições fluidas de iluminação
    overlay.opacity = k.lerp(overlay.opacity, targetOpacity, k.dt() * 5.0);
  });

  return {
    destroy: () => {
      updateEvt.cancel();
      k.destroy(overlay);
    },
    getOverlay: () => overlay,
  };
}
