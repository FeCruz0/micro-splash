/**
 * Módulo de Articulação Multissegmentar da Cauda e Flukes (Multi-Part Puppet Rig).
 *
 * Implementa a cadeia cinemática esquelética de 4 elos articulados da jubarte (Megaptera novaeangliae):
 * 1. CranialThorax (Líder cinemático e sustentação cefálica).
 * 2. AbdominalSpine (Junta lombar flexível).
 * 3. CaudalPeduncle (Junta propulsora de alta velocidade angular).
 * 4. FlukeBlade (Hidroplano terminal com rotação de ângulo de ataque hidrodinâmico).
 */

export interface PuppetBoneNode {
  /** Identificador anatômico do elo esquelético */
  name: "cranialThorax" | "abdominalSpine" | "caudalPeduncle" | "flukeBlade";
  /** Comprimento físico do osso/segmento em pixels */
  lengthInPixels: number;
  /** Coordenadas locais da base de inserção relativas ao centro da baleia em pixels */
  baseLocalOffset: { x: number; y: number };
  /** Coordenadas locais da ponta distal relativas ao centro da baleia em pixels */
  tipLocalOffset: { x: number; y: number };
  /** Ângulo articular relativo ao elo pai em graus */
  relativeAngleInDegrees: number;
  /** Ângulo absoluto no espaço de coordenadas do corpo em graus */
  bodyAngleInDegrees: number;
}

export interface PuppetRigTransforms {
  /** Elo craniano/torácico frontal */
  cranialThorax: PuppetBoneNode;
  /** Elo espinhal abdominal intermediário */
  abdominalSpine: PuppetBoneNode;
  /** Elo propulsor do pedúnculo caudal */
  caudalPeduncle: PuppetBoneNode;
  /** Hidroplano terminal dos flukes com ângulo de ataque */
  flukeBlade: PuppetBoneNode;
  /** Ângulo de ataque hidrodinâmico da lâmina caudal (alfa AoA) em graus */
  flukeAngleOfAttackInDegrees: number;
  /** Vetor sequencial de todos os 4 elos da cadeia cinemática */
  bones: PuppetBoneNode[];
}

export interface PuppetRigParameters {
  /** Ângulo direcional da cabeça/corpo em graus */
  bodyAngleInDegrees: number;
  /** Curvatura espinhal elástica em graus */
  spineCurvatureInDegrees: number;
  /** Velocidade angular instantânea de arfagem em graus por segundo */
  pitchAngularVelocity: number;
  /** Progresso normalizado do ciclo muscular ativo (0.0 a 1.0) */
  strokeProgress: number;
  /** Indica se está em ciclo ativo de batida muscular */
  isMuscularStroke: boolean;
  /** Velocidade horizontal em pixels por segundo */
  horizontalSpeed: number;
  /** Velocidade vertical em pixels por segundo */
  verticalSpeed: number;
  /** Fator de transição para repouso no oceano (0.0 a 1.0) */
  idleBlendFactor: number;
  /** Tempo total decorrido da simulação em segundos */
  timeInSeconds: number;
  /** Orientação horizontal da baleia (true = direita, false = esquerda) */
  isFacingRight: boolean;
}

/** Comprimentos anatômicos proporcionais dos 4 segmentos esqueléticos em pixels */
export const BONE_LENGTH_CRANIAL_THORAX = 30;
export const BONE_LENGTH_ABDOMINAL_SPINE = 24;
export const BONE_LENGTH_CAUDAL_PEDUNCLE = 20;
export const BONE_LENGTH_FLUKE_BLADE = 16;

/**
 * Calcula o ângulo de ataque hidrodinâmico ótimo da lâmina dos flukes (alfa AoA).
 *
 * Durante o nado por oscilação carangiforme/subcarangiforme, a lâmina caudal ajusta
 * dinamicamente sua inclinação contra a esteira de fluxo para maximizar o empuxo vetorial
 * para frente e minimizar o arrasto viscoso.
 *
 * @param parameters - Parâmetros hidrodinâmicos do nado da baleia.
 * @returns Ângulo de ataque da lâmina dos flukes em graus.
 */
export function calculateFlukeAngleOfAttackInDegrees(parameters: PuppetRigParameters): number {
  const {
    strokeProgress,
    isMuscularStroke,
    horizontalSpeed,
    verticalSpeed,
    pitchAngularVelocity,
    idleBlendFactor,
    timeInSeconds,
  } = parameters;

  if (isMuscularStroke) {
    // Ciclo muscular: downstroke (0.0 a 0.5) empurra para baixo, upstroke (0.5 a 1.0) puxa para cima
    // No downstroke, a água empurra a lâmina para cima gerando ângulo de ataque positivo (+AoA)
    // No upstroke, a lâmina flexiona no sentido oposto (-AoA)
    const strokePhaseInRadians = strokeProgress * Math.PI * 2;
    const strokeVelocityDerivative = -Math.cos(strokePhaseInRadians);
    const maximumAngleOfAttackInDegrees = 26;
    return strokeVelocityDerivative * maximumAngleOfAttackInDegrees;
  }

  if (horizontalSpeed > 35) {
    // Planeio hidrodinâmico em velocidade: a cauda acompanha o fluxo com leve curvatura contra a velocidade vertical
    const verticalFlowDeflectionInDegrees = Math.max(
      -14,
      Math.min(14, -verticalSpeed * 0.12 - pitchAngularVelocity * 0.18)
    );
    const hydrodynamicGlideFlutterInDegrees =
      Math.sin(timeInSeconds * 3.4) * 2.2 * Math.min(1.0, horizontalSpeed / 120);
    return verticalFlowDeflectionInDegrees + hydrodynamicGlideFlutterInDegrees;
  }

  // Repouso na maré: complacência viscosa passiva oscilando suavemente com o swell oceânico
  const tidalCompliantDriftInDegrees = Math.sin(timeInSeconds * 0.85) * 4.5 * idleBlendFactor;
  return tidalCompliantDriftInDegrees;
}

/**
 * Resolve a cinemática direta (Forward Kinematics) da cadeia esquelética de 4 elos da jubarte.
 *
 * @param parameters - Parâmetros biomecânicos e hidrodinâmicos da baleia.
 * @returns Árvore hierárquica e posições absolutas de cada nó esquelético.
 */
export function calculateWhalePuppetRig(parameters: PuppetRigParameters): PuppetRigTransforms {
  const {
    bodyAngleInDegrees,
    spineCurvatureInDegrees,
    strokeProgress,
    isMuscularStroke,
    horizontalSpeed,
    idleBlendFactor,
    timeInSeconds,
    isFacingRight,
  } = parameters;

  // 1. Ângulo de ataque hidrodinâmico da lâmina caudal
  const flukeAngleOfAttackInDegrees = calculateFlukeAngleOfAttackInDegrees(parameters);

  // 2. Oscilação ondulatória transmitida ao longo da espinha
  const wavePropagationInDegrees = isMuscularStroke
    ? Math.sin(strokeProgress * Math.PI * 2) * 8.5
    : horizontalSpeed > 35
      ? Math.sin(timeInSeconds * 3.2) * 3.0 * Math.min(1.0, horizontalSpeed / 100)
      : Math.sin(timeInSeconds * 0.85) * 2.5 * idleBlendFactor;

  // 3. Rotações relativas graduais de cada junta articular
  // - CranialThorax: elo rígido de sustentação (ângulo de referência 0 relativo à carcaça)
  const relativeAngleCranialInDegrees = 0;

  // - AbdominalSpine: absorve curvatura lombar moderada (~30% da curvatura total)
  const relativeAngleAbdominalInDegrees =
    spineCurvatureInDegrees * 0.32 + wavePropagationInDegrees * 0.35;

  // - CaudalPeduncle: absorve a maior parte da oscilação caudal (~70% da curvatura total)
  const relativeAnglePeduncleInDegrees =
    spineCurvatureInDegrees * 0.68 + wavePropagationInDegrees * 0.85;

  // - FlukeBlade: junta terminal acoplada com ângulo de ataque dinâmico
  const relativeAngleFlukeInDegrees =
    spineCurvatureInDegrees * 0.25 + wavePropagationInDegrees * 0.4 + flukeAngleOfAttackInDegrees;

  // 4. Ângulos acumulados no espaço do corpo (cadeia de juntas forward kinematics)
  const accumulatedAngleCranialInDegrees = relativeAngleCranialInDegrees;
  const accumulatedAngleAbdominalInDegrees =
    accumulatedAngleCranialInDegrees + relativeAngleAbdominalInDegrees;
  const accumulatedAnglePeduncleInDegrees =
    accumulatedAngleAbdominalInDegrees + relativeAnglePeduncleInDegrees;
  const accumulatedAngleFlukeInDegrees =
    accumulatedAnglePeduncleInDegrees + relativeAngleFlukeInDegrees;

  // 5. Início da cadeia no centro torácico do corpo
  // Quando virada para a direita, a cauda se projeta para trás no eixo -x.
  const cranialRootBaseX = isFacingRight ? 20 : -20;
  const cranialRootBaseY = 0;

  function computeBoneSegment(
    name: "cranialThorax" | "abdominalSpine" | "caudalPeduncle" | "flukeBlade",
    baseX: number,
    baseY: number,
    boneLengthInPixels: number,
    relativeAngle: number,
    accumulatedBodyAngle: number
  ): PuppetBoneNode {
    const angleInRadians = (accumulatedBodyAngle * Math.PI) / 180;
    const directionMultiplier = isFacingRight ? -1 : 1;
    const deltaX = directionMultiplier * Math.cos(angleInRadians) * boneLengthInPixels;
    const deltaY = Math.sin(angleInRadians) * boneLengthInPixels;

    const tipX = baseX + deltaX;
    const tipY = baseY + deltaY;

    return {
      name,
      lengthInPixels: boneLengthInPixels,
      baseLocalOffset: { x: baseX, y: baseY },
      tipLocalOffset: { x: tipX, y: tipY },
      relativeAngleInDegrees: isFacingRight ? relativeAngle : -relativeAngle,
      bodyAngleInDegrees: isFacingRight
        ? bodyAngleInDegrees + accumulatedBodyAngle
        : -bodyAngleInDegrees - accumulatedBodyAngle,
    };
  }

  // Resolução sequencial dos nós na cadeia cinemática
  const cranialThorax = computeBoneSegment(
    "cranialThorax",
    cranialRootBaseX,
    cranialRootBaseY,
    BONE_LENGTH_CRANIAL_THORAX,
    relativeAngleCranialInDegrees,
    accumulatedAngleCranialInDegrees
  );

  const abdominalSpine = computeBoneSegment(
    "abdominalSpine",
    cranialThorax.tipLocalOffset.x,
    cranialThorax.tipLocalOffset.y,
    BONE_LENGTH_ABDOMINAL_SPINE,
    relativeAngleAbdominalInDegrees,
    accumulatedAngleAbdominalInDegrees
  );

  const caudalPeduncle = computeBoneSegment(
    "caudalPeduncle",
    abdominalSpine.tipLocalOffset.x,
    abdominalSpine.tipLocalOffset.y,
    BONE_LENGTH_CAUDAL_PEDUNCLE,
    relativeAnglePeduncleInDegrees,
    accumulatedAnglePeduncleInDegrees
  );

  const flukeBlade = computeBoneSegment(
    "flukeBlade",
    caudalPeduncle.tipLocalOffset.x,
    caudalPeduncle.tipLocalOffset.y,
    BONE_LENGTH_FLUKE_BLADE,
    relativeAngleFlukeInDegrees,
    accumulatedAngleFlukeInDegrees
  );

  return {
    cranialThorax,
    abdominalSpine,
    caudalPeduncle,
    flukeBlade,
    flukeAngleOfAttackInDegrees,
    bones: [cranialThorax, abdominalSpine, caudalPeduncle, flukeBlade],
  };
}
