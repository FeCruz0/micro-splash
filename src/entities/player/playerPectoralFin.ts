import type { GameObj, KaboomCtx, Vec2 } from "kaboom";

/**
 * Módulo Cinemático de Hidroplanos Peitorais Independentes da Jubarte (Megaptera novaeangliae).
 *
 * As nadadeiras peitorais da jubarte atingem ~33% do comprimento corporal (as maiores da biosfera).
 * Este módulo modela a cinemática articular independente em duas camadas (frontal e dorsal oposta):
 * 1. Controle de ângulo diedro (abertura/floração em manobras de arfagem e rolagem).
 * 2. Enflechamento hidrodinâmico (sweep angle para trás proporcional ao fluxo de velocidade).
 * 3. Ondulação pendular de maré em repouso e planeio.
 * 4. Rastreamento da ponta da asa para emissão precisa de micro-vórtices.
 */

export interface PectoralFinTransform {
  /** Posição da base de inserção no tórax (relativa ao centro da baleia em px) */
  baseLocalOffset: { x: number; y: number };
  /** Posição calculada da ponta da nadadeira peitoral (relativa ao centro da baleia em px) */
  tipLocalOffset: { x: number; y: number };
  /** Ângulo diedro e inclinação articular efetiva da nadadeira em graus */
  finAngleInDegrees: number;
  /** Ângulo de enflechamento para trás em graus */
  sweepAngleInDegrees: number;
  /** Fatores de escala em perspectiva tridimensional */
  scaleFactor: { x: number; y: number };
  /** Opacidade visual da asa */
  opacity: number;
}

export interface DualPectoralFinsData {
  /** Nadadeira peitoral em primeiro plano (camada frontal, ventral/lateral visível) */
  nearFin: PectoralFinTransform;
  /** Nadadeira peitoral em segundo plano (camada dorsal oposta, comprimida em perspectiva) */
  farFin: PectoralFinTransform;
}

export interface PectoralFinComputationParameters {
  /** Ângulo direcional da cabeça/corpo em graus */
  bodyAngleInDegrees: number;
  /** Velocidade angular instantânea de arfagem em graus/segundo */
  pitchAngularVelocity: number;
  /** Curvatura espinhal instantânea em graus */
  spineCurvatureInDegrees: number;
  /** Fator de rolagem em perspectiva (currentRoll) entre -1.0 e 1.0 */
  currentRoll: number;
  /** Velocidade horizontal em pixels por segundo */
  horizontalSpeed: number;
  /** Progresso do ciclo muscular ativo (0.0 a 1.0) */
  strokeProgress: number;
  /** Indica se está em batida muscular ativa */
  isMuscularStroke: boolean;
  /** Fator de transição para repouso marinho (0.0 a 1.0) */
  idleBlendFactor: number;
  /** Tempo total de simulação decorrido em segundos */
  timeInSeconds: number;
  /** Orientação horizontal da baleia (true = virada para a direita, false = esquerda) */
  isFacingRight: boolean;
}

/** Comprimento físico da nadadeira peitoral da jubarte no jogo (em pixels) */
export const PECTORAL_FIN_LENGTH = 34;

/**
 * Calcula os polígonos locais em foice anatômica da nadadeira peitoral com tubérculos.
 *
 * @returns Array de vértices poligonais relativos à base de inserção no tórax (0, 0).
 */
export function getPectoralFinPolygonVertices(k?: KaboomCtx): Vec2[] {
  const points = [
    { x: 0, y: 0 }, // Inserção torácica anterior
    { x: -5, y: 3 }, // Borda de fuga proximal
    { x: -14, y: 12 }, // Borda de fuga medial
    { x: -24, y: 24 }, // Borda de fuga distal
    { x: -30, y: 34 }, // Ponta da nadadeira (Wingtip)
    { x: -25, y: 28 }, // Tubérculo 3 da borda de ataque
    { x: -17, y: 18 }, // Tubérculo 2 da borda de ataque
    { x: -8, y: 9 }, // Tubérculo 1 da borda de ataque
  ];

  if (k && typeof k.vec2 === "function") {
    return points.map((p) => k.vec2(p.x, p.y));
  }
  return points as unknown as Vec2[];
}

/**
 * Calcula a cinemática de transformação independente para ambas as nadadeiras peitorais.
 *
 * @param parameters - Parâmetros hidrodinâmicos e biomecânicos da jubarte.
 * @returns Dados cinemáticos completos das nadadeiras frontal e dorsal oposta.
 */
export function calculatePectoralFinTransforms(
  parameters: PectoralFinComputationParameters
): DualPectoralFinsData {
  const {
    pitchAngularVelocity,
    currentRoll,
    horizontalSpeed,
    strokeProgress,
    isMuscularStroke,
    idleBlendFactor,
    timeInSeconds,
    isFacingRight,
  } = parameters;

  // 1. Resposta ao pitch (guinada vertical):
  // Ao subir (-pitchAngularVelocity), as peitorais abrem para cima sustentando o vetor de fluxo.
  // Ao descer (+pitchAngularVelocity), as peitorais fecham para baixo cortando a penetração.
  const pitchDihedralDeflectionInDegrees = Math.max(
    -16,
    Math.min(20, -pitchAngularVelocity * 0.22)
  );

  // 2. Resposta à batida muscular de cauda (downstroke flaring):
  let strokeDihedralFlareInDegrees = 0;
  if (isMuscularStroke) {
    strokeDihedralFlareInDegrees = Math.sin(strokeProgress * Math.PI) * 7.5;
  }

  // 3. Resposta à velocidade (enflechamento / sweep para trás):
  const normalizedSpeed = Math.min(1.0, horizontalSpeed / 180);
  const sweepAngleInDegrees = normalizedSpeed * 18.0;

  // 4. Ondulação pendular suave em planeio e repouso na maré:
  const idleFlutterInDegrees = Math.sin(timeInSeconds * 0.85) * 3.2 * idleBlendFactor;
  const glideFlutterInDegrees =
    Math.sin(timeInSeconds * 3.0) * 1.8 * Math.min(1.0, horizontalSpeed / 100);

  // 5. Acoplamento de diedro para a nadadeira frontal (Near Fin):
  const nearFinDihedralAngleInDegrees =
    pitchDihedralDeflectionInDegrees +
    strokeDihedralFlareInDegrees +
    currentRoll * 14.0 +
    idleFlutterInDegrees +
    glideFlutterInDegrees;

  // 6. Acoplamento de diedro para a nadadeira oposta (Far Fin / dorsal):
  const farFinDihedralAngleInDegrees =
    pitchDihedralDeflectionInDegrees * 0.7 +
    strokeDihedralFlareInDegrees * 0.6 -
    currentRoll * 12.0 +
    idleFlutterInDegrees * 0.8;

  // Ponto de inserção anatômico no tórax (em coordenadas locais da baleia não espelhada)
  const baseLocalX = isFacingRight ? 16 : -16;
  const baseLocalY = 6;

  // Cálculo trigonométrico da ponta da asa para a nadadeira frontal nativa do sprite
  const nearSweepAngleInRadians = (sweepAngleInDegrees * Math.PI) / 180;
  const nearDihedralAngleInRadians = (nearFinDihedralAngleInDegrees * Math.PI) / 180;
  const nearTipDeltaX = -(10 + Math.sin(nearSweepAngleInRadians) * 4);
  const nearTipDeltaY = 10 + Math.sin(nearDihedralAngleInRadians) * 6;

  const nearTipLocalX = isFacingRight ? 16 + nearTipDeltaX : -(16 + nearTipDeltaX);
  const nearTipLocalY = baseLocalY + nearTipDeltaY;

  // Cálculo da ponta da asa para a nadadeira traseira (perspectiva atenuada)
  const farSweepAngleInRadians = (sweepAngleInDegrees * 1.1 * Math.PI) / 180;
  const farDihedralAngleInRadians = (farFinDihedralAngleInDegrees * Math.PI) / 180;
  const farTipDeltaX = -(8 + Math.sin(farSweepAngleInRadians) * 4);
  const farTipDeltaY = 8 + Math.sin(farDihedralAngleInRadians) * 5;

  const farTipLocalX = isFacingRight ? 16 + farTipDeltaX : -(16 + farTipDeltaX);
  const farTipLocalY = baseLocalY + farTipDeltaY;

  // Escalas e opacidades em perspectiva
  const nearScaleY = Math.max(0.65, 1.0 - Math.abs(currentRoll) * 0.15);
  const nearOpacity = 0.92;

  const farScaleY = Math.max(0.45, 0.78 - currentRoll * 0.25);
  const farOpacity = Math.max(0.3, Math.min(0.8, 0.7 - currentRoll * 0.2));

  return {
    nearFin: {
      baseLocalOffset: { x: baseLocalX, y: baseLocalY },
      tipLocalOffset: { x: nearTipLocalX, y: nearTipLocalY },
      finAngleInDegrees: isFacingRight
        ? nearFinDihedralAngleInDegrees
        : -nearFinDihedralAngleInDegrees,
      sweepAngleInDegrees,
      scaleFactor: { x: 1.0, y: nearScaleY },
      opacity: nearOpacity,
    },
    farFin: {
      baseLocalOffset: { x: baseLocalX, y: baseLocalY - 2 },
      tipLocalOffset: { x: farTipLocalX, y: farTipLocalY - 2 },
      finAngleInDegrees: isFacingRight
        ? farFinDihedralAngleInDegrees
        : -farFinDihedralAngleInDegrees,
      sweepAngleInDegrees,
      scaleFactor: { x: 0.82, y: farScaleY },
      opacity: farOpacity,
    },
  };
}

/**
 * Inicializa o rastreamento cinemático das pontas das nadadeiras peitorais para ancoragem de vórtices.
 *
 * Como o sprite original da jubarte já contém ambas as nadadeiras ilustradas em pixel art,
 * este módulo gerencia as coordenadas cinemáticas dinâmicas sem sobreposição poligonal intrusiva.
 *
 * @param k - Instância do contexto Kaboom.js.
 * @param baleia - GameObj representativo da baleia protagonista.
 * @returns Controlador cinemático das nadadeiras peitorais.
 */
export function setupPectoralFins(
  k: KaboomCtx,
  baleia: GameObj
): {
  update: (transforms: DualPectoralFinsData, isFacingRight: boolean) => void;
  destroy: () => void;
  getNearTipWorldPos: () => Vec2;
} {
  let currentNearTipWorldPos = baleia.pos;

  function update(transforms: DualPectoralFinsData, _isFacingRight: boolean): void {
    const { nearFin } = transforms;

    // Calcula posição no mundo da ponta da asa para ancoragem de micro-vórtices
    if (baleia.pos && typeof baleia.pos.add === "function") {
      currentNearTipWorldPos = baleia.pos.add(
        k.vec2(nearFin.tipLocalOffset.x, nearFin.tipLocalOffset.y)
      );
    }
  }

  function destroy(): void {
    // Cleanup sem alocações órfãs
  }

  return {
    update,
    destroy,
    getNearTipWorldPos: () => currentNearTipWorldPos,
  };
}
