/**
 * Calcula a velocidade de deriva e oscilação hidrodinâmica em repouso (swell oceânico e correnteza).
 *
 * Reproduz o comportamento natural das criaturas marinhas do jogo (orcas e jubartes passantes),
 * aplicando um movimento orbital elíptico composto por:
 * 1. Surge horizontal (indo e voltando com a correnteza): ~±16px de oscilação em repouso.
 * 2. Heave vertical (subindo e descendo com o swell): ~±9.5px de flutuabilidade.
 *
 * @param timeInSeconds - Tempo de execução atual em segundos.
 * @param idleBlendFactor - Fator de blend de repouso (0.0 a 1.0).
 * @returns Vetor com componentes de velocidade `surgeVelocityX` e `heaveVelocityY` em px/s.
 */
export function calculateOceanIdleDrift(
  timeInSeconds: number,
  idleBlendFactor: number
): { surgeVelocityX: number; heaveVelocityY: number } {
  if (idleBlendFactor <= 0) {
    return { surgeVelocityX: 0, heaveVelocityY: 0 };
  }

  const swellFrequency = 0.85;
  const rippleFrequency = 2.1;

  const surgeVelocityX =
    (Math.cos(timeInSeconds * swellFrequency) * 12.0 +
      Math.cos(timeInSeconds * rippleFrequency) * 2.5) *
    idleBlendFactor;

  const heaveVelocityY =
    (Math.sin(timeInSeconds * swellFrequency) * 5.5 +
      Math.sin(timeInSeconds * rippleFrequency) * 1.2) *
    idleBlendFactor;

  return { surgeVelocityX, heaveVelocityY };
}
