/**
 * Sistema de Zonas de Atenuação e Transição Suave de Biomas (Fase 31.5)
 * Fornece atenuação suave (smoothstep) de 300m nas fronteiras de biomas
 * para flora bentônica, partículas ambientais e elementos cenográficos.
 */

/**
 * Calcula o fator de atenuação suave (0.0 a 1.0) para elementos distribuídos em um bioma.
 *
 * @param x - Posição horizontal no mundo em metros.
 * @param startX - Início do bioma em metros.
 * @param endX - Fim do bioma em metros.
 * @param transitionWidth - Largura da zona de transição em metros (padrão: 300m).
 * @returns Fator de transição normalizado de 0.0 a 1.0.
 */
export function calculateBiomeTransitionFactor(
  x: number,
  startX: number,
  endX: number,
  transitionWidth = 300
): number {
  if (x < startX || x > endX) {
    return 0.0;
  }

  // Distância das bordas
  const distFromStart = x - startX;
  const distFromEnd = endX - x;

  let factor = 1.0;

  // Easing suave nos primeiros 300m (entrada do bioma)
  if (distFromStart < transitionWidth && transitionWidth > 0) {
    const t = Math.max(0, Math.min(1, distFromStart / transitionWidth));
    factor = Math.min(factor, t * t * (3 - 2 * t));
  }

  // Easing suave nos últimos 300m (saída do bioma)
  if (distFromEnd < transitionWidth && transitionWidth > 0) {
    const t = Math.max(0, Math.min(1, distFromEnd / transitionWidth));
    factor = Math.min(factor, t * t * (3 - 2 * t));
  }

  return factor;
}
