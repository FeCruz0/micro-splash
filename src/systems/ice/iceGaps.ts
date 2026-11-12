/**
 * Fendas de respiracao (polinias naturais) na camada de gelo polar.
 */

export interface IceGap {
  /** Inicio da abertura em metros horizontais */
  start: number;
  /** Termino da abertura em metros horizontais */
  end: number;
}

// Fendas de respiracao pre-definidas na camada de gelo (0m a 5.000m) - Modelo Imutavel
export const DEFAULT_ICE_GAPS: IceGap[] = [
  { start: 60, end: 240 }, // Fenda inicial de respiracao e salto no ponto de largada (120m)
  { start: 600, end: 750 },
  { start: 1400, end: 1550 },
  { start: 2200, end: 2350 },
  { start: 3100, end: 3250 },
  { start: 4000, end: 4150 },
  { start: 4700, end: 4850 },
];

export const ICE_GAPS = DEFAULT_ICE_GAPS;

// Fendas ativas da partida em execucao (resetadas a cada reinicio de partida)
export let activeIceGaps: IceGap[] = [];

export function resetActiveIceGaps(): void {
  activeIceGaps = DEFAULT_ICE_GAPS.map((gap) => ({ ...gap }));
}

/**
 * Checa se uma coordenada X no Oceano Antartico (0 a 5.000m) localiza-se dentro de uma fenda de ar livre.
 *
 * @param x - Posicao horizontal no mundo em metros.
 * @returns `true` se o ar estiver livre para respiracao (ou fora da Antartica); `false` se houver teto de gelo.
 */
export function isPositionInIceGap(x: number): boolean {
  if (x < 0 || x > 5000) return true; // Fora do gelo antartico, ar sempre livre
  const gapsToCheck = activeIceGaps.length > 0 ? activeIceGaps : DEFAULT_ICE_GAPS;
  return gapsToCheck.some((gap) => x >= gap.start && x <= gap.end);
}

/**
 * Retorna a fenda de gelo antartica mais proxima da coordenada X para respiracao de emergencia.
 */
export function getNearestIceGap(x: number): IceGap | null {
  const gapsToCheck = activeIceGaps.length > 0 ? activeIceGaps : DEFAULT_ICE_GAPS;
  let nearestGap: IceGap | null = null;
  let minDistance = Infinity;
  for (let i = 0; i < gapsToCheck.length; i++) {
    const gap = gapsToCheck[i];
    const center = (gap.start + gap.end) / 2;
    const distance = Math.abs(center - x);
    if (distance < minDistance) {
      minDistance = distance;
      nearestGap = gap;
    }
  }
  return nearestGap;
}
