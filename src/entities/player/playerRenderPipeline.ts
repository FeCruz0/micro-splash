/**
 * Pipeline Unificada de Renderização da Baleia (Fase 51.1).
 *
 * Coordena em ordem estrita e determinística a resolução cinemática e cromática
 * da jubarte, eliminando jitter, descompasso e dessincronização entre:
 * 1. Cadeia esquelética multissegmentar (Puppet Rig).
 * 2. Deformação sagital contínua (Vertical Slice Ribbon).
 * 3. Hidroplanos das nadadeiras peitorais independentes (Pectoral Fins).
 * 4. Paleta centralizada por estado de fôlego e oxigênio (Breath Palette).
 */

import { calculateWhalePuppetRig, type PuppetRigTransforms } from "./playerPuppetRig";
import { calculateWhaleSliceTransforms, type WhaleSliceData } from "./playerSliceRenderer";
import { calculatePectoralFinTransforms, type DualPectoralFinsData } from "./playerPectoralFin";
import { getWhaleBreathColor, type WhaleColorPalette } from "./playerBreathPalette";

export interface WhaleRenderPipelineParameters {
  /** Ângulo direcional de orientação do corpo em graus */
  bodyAngleInDegrees: number;
  /** Curvatura elástica da coluna vertebral em graus */
  spineCurvatureInDegrees: number;
  /** Flexão de arfagem vertical (subida/descida) em graus */
  pitchFlexionInDegrees: number;
  /** Velocidade angular de arfagem em graus por segundo */
  pitchAngularVelocity: number;
  /** Progresso normalizado da batida de cauda muscular (0.0 a 1.0) */
  strokeProgress: number;
  /** Indica se está em ciclo muscular ativo de propulsão */
  isMuscularStroke: boolean;
  /** Velocidade horizontal instantânea em pixels por segundo */
  horizontalSpeed: number;
  /** Velocidade vertical instantânea em pixels por segundo */
  verticalSpeed: number;
  /** Fator de transição para repouso no oceano (0.0 a 1.0) */
  idleBlendFactor: number;
  /** Fator de rolagem em perspectiva (-1.0 a 1.0) */
  currentRoll: number;
  /** Tempo total decorrido da simulação em segundos */
  timeInSeconds: number;
  /** Orientação horizontal da baleia (true = direita, false = esquerda) */
  isFacingRight: boolean;
  /** Razão de oxigênio restante (0.0 a 1.0) */
  oxygenRatio: number;
  /** Indica se está presa em rede de pesca */
  isTrapped?: boolean;
  /** Indica se está em estado de desmaio por falta de oxigênio */
  isFainting?: boolean;
  /** Modo de alto contraste para acessibilidade */
  isHighContrast?: boolean;
  /** Preferência de movimento reduzido */
  isReducedMotion?: boolean;
}

export interface WhaleRenderPipelineSnapshot {
  /** Timestamp de resolução do pipeline */
  timestamp: number;
  /** Transformações da cadeia esquelética de 4 elos */
  puppetRig: PuppetRigTransforms;
  /** Matrizes de fatiamento sagital acopladas ao rig */
  slices: WhaleSliceData[];
  /** Transformações e diedros das nadadeiras peitorais */
  pectoralFins: DualPectoralFinsData;
  /** Paleta cromática consolidada para o frame */
  palette: WhaleColorPalette;
}

/**
 * Executa de forma síncrona e sem efeitos colaterais a pipeline unificada de renderização.
 */
export function executeWhaleRenderPipeline(
  parameters: WhaleRenderPipelineParameters,
  reusableSliceBuffer?: WhaleSliceData[],
  reusablePuppetRigBuffer?: PuppetRigTransforms,
  reusableSnapshotBuffer?: WhaleRenderPipelineSnapshot
): WhaleRenderPipelineSnapshot {
  // 1. Passo 1: Resolução da cinemática direta do Puppet Rig (reutilizando buffer se fornecido)
  const puppetRig = calculateWhalePuppetRig(parameters, reusablePuppetRigBuffer);

  // 2. Passo 2: Deformação sagital por fatiamento acoplada dinamicamente ao rig
  const slices = calculateWhaleSliceTransforms(parameters, reusableSliceBuffer, puppetRig);

  // 3. Passo 3: Cinemática dos hidroplanos peitorais ancorados ao tórax
  const pectoralFins = calculatePectoralFinTransforms(parameters);

  // 4. Passo 4: Paleta cromática centralizada por estado respiratório
  const palette = getWhaleBreathColor(parameters);

  if (reusableSnapshotBuffer) {
    reusableSnapshotBuffer.timestamp = parameters.timeInSeconds;
    reusableSnapshotBuffer.puppetRig = puppetRig;
    reusableSnapshotBuffer.slices = slices;
    reusableSnapshotBuffer.pectoralFins = pectoralFins;
    reusableSnapshotBuffer.palette = palette;
    return reusableSnapshotBuffer;
  }

  return {
    timestamp: parameters.timeInSeconds,
    puppetRig,
    slices,
    pectoralFins,
    palette,
  };
}
