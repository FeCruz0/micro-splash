/**
 * Módulo de Deformação Sagital por Fatiamento Segmentado (Vertical Slice Ribbon).
 *
 * Reproduz a biomecânica de locomoção de cetáceos pelágicos (Megaptera novaeangliae),
 * particionando a renderização do sprite em 4 segmentos contínuos:
 * 1. Rostro / Crânio (0% flexão - massa óssea rígida condutora de direção).
 * 2. Tórax / Peitorais (~18% flexão - sustentação hidrodinâmica e empuxo).
 * 3. Pedúnculo Caudal (~58% flexão - coluna vertebral elástica epaxial/hipaxial).
 * 4. Cauda / Flukes (100% flexão - lâmina propulsora com onda viajante e atraso inercial).
 */

export type WhaleSliceName = "head" | "thorax" | "peduncle" | "flukes";

export interface WhaleSliceData {
  /** Índice da fatia de 0 a 3 (0 = Cabeça/Rostro, 3 = Flukes/Cauda) */
  index: number;
  /** Nome anatômico da seção corporal */
  name: WhaleSliceName;
  /** Região normalizada UV dentro do frame de 128x64 px (0.0 a 1.0) */
  sourceNormalizedRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Offset posicional local relativo ao pivô do corpo (em pixels) */
  localOffset: {
    x: number;
    y: number;
  };
  /** Deflexão angular relativa da fatia (em graus) */
  relativeAngleInDegrees: number;
  /** Escala local de compressão ou arqueamento (cambering) */
  scaleFactor: {
    x: number;
    y: number;
  };
}

export interface WhaleSliceComputationParameters {
  /** Curvatura espinhal elástica instantânea da coluna (headAngle - tailAngle, em graus) */
  spineCurvatureInDegrees: number;
  /** Flexão de arfagem vertical (subida/descida, em graus) */
  pitchFlexionInDegrees: number;
  /** Velocidade angular de arfagem (em graus/segundo) */
  pitchAngularVelocity: number;
  /** Progresso do ciclo muscular ativo (0.0 a 1.0) */
  strokeProgress: number;
  /** Indica se a baleia está em batida muscular ativa de cauda */
  isMuscularStroke: boolean;
  /** Tempo total decorrido da simulação em segundos */
  timeInSeconds: number;
  /** Velocidade horizontal instantânea em pixels por segundo */
  horizontalSpeed: number;
  /** Fator de transição para repouso marinho (0.0 a 1.0) */
  idleBlendFactor: number;
  /** Orientação horizontal da baleia (true = virada para a direita, false = esquerda) */
  isFacingRight: boolean;
}

/** Configuração anatômica estática das 4 seções corporais no spritesheet de 128x64 px */
const SLICE_CONFIGURATIONS: ReadonlyArray<{
  name: WhaleSliceName;
  /** Posição inicial X em pixels dentro do frame de 128 px (não espelhado) */
  pixelStartX: number;
  /** Largura da fatia em pixels */
  pixelWidth: number;
  /** Posição do centro geométrico X da fatia em pixels relativo ao centro do sprite (64px) */
  baseLocalCenterX: number;
  /** Peso de flexão estática da coluna (0.0 = rígido na cabeça, 1.0 = máxima na cauda) */
  curvatureWeight: number;
  /** Peso de amplitude da onda viajante de nado (0.0 = cabeça inerte, 1.0 = flukes) */
  travelingWaveWeight: number;
  /** Defasagem angular de fase da onda viajante (em radianos) */
  travelingWavePhaseLagInRadians: number;
}> = [
  {
    name: "head",
    pixelStartX: 96,
    pixelWidth: 32,
    baseLocalCenterX: 48,
    curvatureWeight: 0.0,
    travelingWaveWeight: 0.0,
    travelingWavePhaseLagInRadians: 0.0,
  },
  {
    name: "thorax",
    pixelStartX: 64,
    pixelWidth: 32,
    baseLocalCenterX: 16,
    curvatureWeight: 0.18,
    travelingWaveWeight: 0.18,
    travelingWavePhaseLagInRadians: 0.35, // ~20° de atraso de fase
  },
  {
    name: "peduncle",
    pixelStartX: 32,
    pixelWidth: 32,
    baseLocalCenterX: -16,
    curvatureWeight: 0.58,
    travelingWaveWeight: 0.58,
    travelingWavePhaseLagInRadians: 0.85, // ~49° de atraso de fase
  },
  {
    name: "flukes",
    pixelStartX: 0,
    pixelWidth: 32,
    baseLocalCenterX: -48,
    curvatureWeight: 1.0,
    travelingWaveWeight: 1.0,
    travelingWavePhaseLagInRadians: 1.35, // ~77° de atraso de fase
  },
];

/**
 * Calcula as matrizes de transformação geométrica para as 4 fatias sagitais da jubarte.
 *
 * Implementa a equação da onda viajante de propulsão cetácea:
 * y_i(t) = A(t) * w_i * sin(omega * t - phi_i)
 *
 * @param parameters - Parâmetros de cinemática e biomecânica corporal da jubarte.
 * @returns Array contendo os dados de transformação das 4 fatias corporais ordenadas da cabeça à cauda.
 */
export function calculateWhaleSliceTransforms(
  parameters: WhaleSliceComputationParameters
): WhaleSliceData[] {
  const {
    spineCurvatureInDegrees,
    pitchFlexionInDegrees,
    strokeProgress,
    isMuscularStroke,
    timeInSeconds,
    horizontalSpeed,
    idleBlendFactor,
    isFacingRight,
  } = parameters;

  // 1. Determinação da amplitude dinâmica da onda viajante
  let waveAmplitudeInPixels = 0;
  let waveFrequencyInRadiansPerSecond = 3.2;
  let waveProgressAngle = timeInSeconds * waveFrequencyInRadiansPerSecond;

  if (isMuscularStroke) {
    // Ciclo muscular de batida ativa (0.0s a 0.5s): amplitude máxima vigorosa
    waveAmplitudeInPixels = 4.8;
    waveProgressAngle = strokeProgress * Math.PI * 2;
  } else if (horizontalSpeed > 35) {
    // Planeio hidrodinâmico em velocidade
    const normalizedGlideSpeed = Math.min(1.0, horizontalSpeed / 120);
    waveAmplitudeInPixels = 1.4 * normalizedGlideSpeed;
    waveFrequencyInRadiansPerSecond = 3.2;
    waveProgressAngle = timeInSeconds * waveFrequencyInRadiansPerSecond;
  } else if (idleBlendFactor > 0.001) {
    // Repouso e deriva com a maré: onda lenta suave sincronizada com o swell
    waveAmplitudeInPixels = 1.8 * idleBlendFactor;
    waveFrequencyInRadiansPerSecond = 0.85;
    waveProgressAngle = timeInSeconds * waveFrequencyInRadiansPerSecond;
  }

  // 2. Modulação da curvatura sagital (cambering dorsal/ventral)
  const camberingSagittalFactor = 1.0 + Math.abs(pitchFlexionInDegrees) * 0.008;

  const result: WhaleSliceData[] = [];
  const totalFrameWidth = 128;

  let previousSliceVerticalOffset = 0;

  for (let sliceIndex = 0; sliceIndex < SLICE_CONFIGURATIONS.length; sliceIndex++) {
    const sliceConfig = SLICE_CONFIGURATIONS[sliceIndex];

    // Cálculo da ondulação vertical transversal da onda viajante
    const travelingWaveVerticalDisplacement =
      Math.sin(waveProgressAngle - sliceConfig.travelingWavePhaseLagInRadians) *
      waveAmplitudeInPixels *
      sliceConfig.travelingWaveWeight;

    // Deflexão angular elástica da coluna (proporcional ao peso anatômico da fatia)
    // Invertida na cauda para simular a curvatura convexa/côncava no dorso
    const spineDeflectionAngleInDegrees = spineCurvatureInDegrees * sliceConfig.curvatureWeight;

    // Deslocamento vertical cumulativo devido à curvatura estática da coluna
    const curvatureVerticalDisplacement =
      (spineDeflectionAngleInDegrees / 45) * Math.abs(sliceConfig.baseLocalCenterX) * 0.35;

    const totalVerticalOffset = travelingWaveVerticalDisplacement + curvatureVerticalDisplacement;

    // Inclinação angular relativa adicional baseada no gradiente de deslocamento entre fatias
    let shearAngleInDegrees = 0;
    if (sliceIndex > 0) {
      const deltaVerticalDisplacement = totalVerticalOffset - previousSliceVerticalOffset;
      const segmentSpan = 32;
      shearAngleInDegrees = Math.atan2(deltaVerticalDisplacement, segmentSpan) * (180 / Math.PI);
    }
    previousSliceVerticalOffset = totalVerticalOffset;

    // Se a baleia estiver virada para a esquerda, espelha o centro local no eixo X
    const directionalLocalCenterX = isFacingRight
      ? sliceConfig.baseLocalCenterX
      : -sliceConfig.baseLocalCenterX;

    // Ângulo relativo composto da fatia
    const relativeAngleInDegrees = isFacingRight
      ? spineDeflectionAngleInDegrees + shearAngleInDegrees * 0.4
      : -(spineDeflectionAngleInDegrees + shearAngleInDegrees * 0.4);

    // Compressão sagital em função da flexão
    const sliceScaleY =
      1.0 + Math.abs(spineDeflectionAngleInDegrees) * 0.006 * camberingSagittalFactor;
    const sliceScaleX = 1.0 - Math.abs(spineDeflectionAngleInDegrees) * 0.003;

    result.push({
      index: sliceIndex,
      name: sliceConfig.name,
      sourceNormalizedRect: {
        x: sliceConfig.pixelStartX / totalFrameWidth,
        y: 0,
        width: sliceConfig.pixelWidth / totalFrameWidth,
        height: 1.0,
      },
      localOffset: {
        x: directionalLocalCenterX,
        y: totalVerticalOffset,
      },
      relativeAngleInDegrees,
      scaleFactor: {
        x: sliceScaleX,
        y: sliceScaleY,
      },
    });
  }

  return result;
}
