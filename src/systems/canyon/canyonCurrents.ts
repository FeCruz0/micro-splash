import type {
  CanyonConfig,
  CanyonGeometryResult,
  AnemoneItem,
  CanyonEngineContext,
  CanyonVector2D,
} from "./canyonTypes";

export function setupCanyonCurrents<
  TColor = unknown,
  TVec extends { x: number; y: number } = CanyonVector2D,
>(
  k: CanyonEngineContext<TColor, TVec>,
  geometry: CanyonGeometryResult<TColor>,
  anemones: AnemoneItem<TColor>[],
  config: CanyonConfig
): void {
  const { lighthouseX } = config;
  const {
    plateauObj,
    rampUpShape,
    rampDownShape,
    cliffObj,
    lighthouseBeam,
    lanternGlow,
    reflectionSegments,
    foamParticles,
    setRevealTimer,
    getRevealTimer,
  } = geometry;

  let time = 0;
  k.onUpdate(() => {
    // Só atualiza se estiver próximo de Arraial (x > 23500) ou durante reveal do biosonar
    const camX = k.camPos ? k.camPos().x : 0;
    let revealTimer = getRevealTimer();
    if (camX < 23500 && revealTimer <= 0) return;

    const dt = k.dt();
    time += dt;

    // Rotação dinâmica do feixe do Farol
    const beamPhase = Math.sin(time * 1.8);
    const beamBrightness = Math.max(0.04, Math.abs(beamPhase) * 0.28);
    lighthouseBeam.opacity = beamBrightness;
    lanternGlow.opacity = 0.5 + Math.abs(beamPhase) * 0.5;
    lighthouseBeam.angle = Math.sin(time * 1.2) * 16;

    // Reflexo do farol na água — distorção senoidal
    for (let r = 0; r < reflectionSegments.length; r++) {
      reflectionSegments[r].pos.x = lighthouseX + Math.sin(time * 1.8 + r * 0.7) * 5;
      reflectionSegments[r].opacity = Math.max(
        0,
        (0.1 - r * 0.02) * (0.4 + Math.abs(beamPhase) * 0.6)
      );
    }

    // Espuma costeira — deriva suave da direita para a esquerda
    for (const fp of foamParticles) {
      fp.obj.pos.x = fp.baseX - ((time * fp.speed) % 55);
      fp.obj.opacity = 0.22 + Math.sin(time * 2.2 + fp.phase) * 0.12;
    }

    // Biosonar: iluminação dos contornos da rocha
    if (revealTimer > 0) {
      revealTimer -= dt;
      setRevealTimer(revealTimer);
      const pulseCol = k.rgb(0, 230, 255);
      plateauObj.outline.color = pulseCol;
      plateauObj.outline.width = 3;
      rampUpShape.outline.color = pulseCol;
      rampUpShape.outline.width = 3;
      rampDownShape.outline.color = pulseCol;
      rampDownShape.outline.width = 3;
      cliffObj.outline.color = pulseCol;
      cliffObj.outline.width = 3;
    } else {
      const defaultCol = k.rgb(60, 80, 100);
      plateauObj.outline.color = defaultCol;
      plateauObj.outline.width = 2;
      rampUpShape.outline.color = defaultCol;
      rampUpShape.outline.width = 1.5;
      rampDownShape.outline.color = defaultCol;
      rampDownShape.outline.width = 1.5;
      cliffObj.outline.color = k.rgb(30, 38, 50);
      cliffObj.outline.width = 2;
    }

    // Micro-oscilação suave dos tentáculos das anêmonas marinhas com o fluxo da ressurgência
    for (const an of anemones) {
      if (an.obj) {
        an.obj.angle = an.baseAngle + Math.sin(time * 2.4 + an.phase) * 8;
      }
    }
  });
}
