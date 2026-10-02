/**
 * Utilitários de Navegação e Formatação de Medidas Oceânicas (Fase 32.5)
 * Converte distâncias para milhas náuticas (mn), unidade padrão internacional
 * de navegação marítima e rotas migratórias oceânicas.
 * 1 Milha Náutica internacional (NM / mn) = 1.852 metros.
 */

export const METERS_PER_NAUTICAL_MILE = 1852;

/**
 * Converte distância em metros para valor numérico em milhas náuticas com precisão decimal.
 */
export function toNauticalMilesValue(meters: number): number {
  if (meters <= 0) return 0;
  return Number((meters / METERS_PER_NAUTICAL_MILE).toFixed(1));
}

/**
 * Retorna a distância em milhas náuticas formatada no padrão brasileiro (ex: "7,7 mn").
 */
export function toNauticalMiles(meters: number): string {
  const safeMeters = Math.max(0, meters);
  const nm = safeMeters / METERS_PER_NAUTICAL_MILE;
  return `${nm.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} mn`;
}

/**
 * Formata distância dupla em metros e milhas náuticas em paralelo (ex: "14.238m • 7,7 mn").
 */
export function formatDualDistance(meters: number): string {
  const safeMeters = Math.max(0, Math.floor(meters));
  const metersFormatted = `${safeMeters.toLocaleString("pt-BR")}m`;
  const nmFormatted = toNauticalMiles(meters);
  return `${metersFormatted} • ${nmFormatted}`;
}
