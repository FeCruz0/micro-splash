/**
 * Retorna as informações do bioma com base na distância de disparo da descoberta (Fase 34.7).
 */
export function getCodexBiomeInfo(triggerX: number): { name: string; emoji: string } {
  if (triggerX < 5000) return { name: "Oceano Antártico", emoji: "❄️" };
  if (triggerX < 12000) return { name: "Travessia Pelágica", emoji: "🌊" };
  if (triggerX < 19000) return { name: "Costa Urbana", emoji: "🏭" };
  if (triggerX < 25000) return { name: "Cânions & Ressurgência", emoji: "🌀" };
  return { name: "Santuário de Arraial", emoji: "☀️" };
}
