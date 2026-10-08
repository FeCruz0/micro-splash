import { describe, it, expect } from "vitest";
import {
  PlayerControlsManager,
  type PlayerInputSnapshot,
} from "../src/entities/player/playerControls";
import {
  calculatePectoralVortexData,
  spawnPectoralTipVortices,
} from "../src/entities/player/playerParticles";
import { calculateOceanIdleDrift } from "../src/entities/player";

function createMockKaboom() {
  return {
    isKeyDown: () => false,
    isKeyPressed: () => false,
    isKeyReleased: () => false,
    lerp: (a: number, b: number, t: number) => a + (b - a) * t,
    clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
    vec2: (x: number, y: number) => ({ x, y }),
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
  } as any;
}

function createMockBaleia(flipX = false) {
  return {
    flipX,
    pos: { x: 100, y: 100 },
  } as any;
}

function createInputs(partial: Partial<PlayerInputSnapshot> = {}): PlayerInputSnapshot {
  return {
    isStrokePressed: false,
    isStrokeDown: false,
    isStrokeReleased: false,
    isSonarTriggered: false,
    isLeftDown: false,
    isRightDown: false,
    isUpDown: false,
    isDownDown: false,
    ...partial,
  };
}

describe("Fase 40: Biomecânica de Arfagem e Animação de Curvatura da Baleia", () => {
  describe("40.1 Dinâmica Angular & Inércia Caudal (Fluke Lag)", () => {
    it("inicia com alinhamento neutro e curvatura espinhal zerada", () => {
      const k = createMockKaboom();
      const controls = new PlayerControlsManager(k);

      expect(controls.getAngle()).toBe(0);
      expect(controls.getTailAngle()).toBe(0);
      expect(controls.getSpineCurvature()).toBe(0);
      expect(controls.getPitchAngularVelocity()).toBe(0);
      expect(controls.getPitchFlexion()).toBe(0);
    });

    it("ao subir (isUpDown = true), a cabeça lidera e a cauda sofre atraso elástico hidrodinâmico", () => {
      const k = createMockKaboom();
      const controls = new PlayerControlsManager(k);
      const baleia = createMockBaleia(false);

      // Simula 5 frames de subida ativa (dt = 0.016s)
      for (let frame = 0; frame < 5; frame++) {
        controls.updateOrientation(0.016, baleia, createInputs({ isUpDown: true }), false, false);
      }

      // Em subida, o ângulo da cabeça deve ser negativo (inclinando para cima)
      const headAngle = controls.getAngle();
      const tailAngle = controls.getTailAngle();

      expect(headAngle).toBeLessThan(0);
      // A cauda ainda não atingiu o ângulo da cabeça (tailAngle > headAngle)
      expect(tailAngle).toBeGreaterThan(headAngle);

      // A curvatura da espinha (headAngle - tailAngle) deve ser negativa (dorso côncavo / subida)
      const spineCurvature = controls.getSpineCurvature();
      expect(spineCurvature).toBeLessThan(0);
      expect(controls.getPitchFlexion()).toBeLessThan(0);
      expect(controls.getPitchAngularVelocity()).toBeLessThan(0);
    });

    it("ao mergulhar (isDownDown = true), a cabeça desce e a cauda sofre atraso dorsal (dorso convexo)", () => {
      const k = createMockKaboom();
      const controls = new PlayerControlsManager(k);
      const baleia = createMockBaleia(false);

      // Simula 5 frames de mergulho ativo
      for (let frame = 0; frame < 5; frame++) {
        controls.updateOrientation(0.016, baleia, createInputs({ isDownDown: true }), false, false);
      }

      const headAngle = controls.getAngle();
      const tailAngle = controls.getTailAngle();

      expect(headAngle).toBeGreaterThan(0);
      expect(tailAngle).toBeLessThan(headAngle);

      const spineCurvature = controls.getSpineCurvature();
      expect(spineCurvature).toBeGreaterThan(0);
      expect(controls.getPitchFlexion()).toBeGreaterThan(0);
      expect(controls.getPitchAngularVelocity()).toBeGreaterThan(0);
    });

    it("respeita estritamente o teto angular de arfagem entre -45° e 45°", () => {
      const k = createMockKaboom();
      const controls = new PlayerControlsManager(k);
      const baleia = createMockBaleia(false);

      // Força giro contínuo para cima por 3 segundos
      for (let frame = 0; frame < 180; frame++) {
        controls.updateOrientation(0.016, baleia, createInputs({ isUpDown: true }), false, false);
      }
      expect(controls.getAngle()).toBe(-45);

      // Força giro contínuo para baixo por 3 segundos
      for (let frame = 0; frame < 180; frame++) {
        controls.updateOrientation(0.016, baleia, createInputs({ isDownDown: true }), false, false);
      }
      expect(controls.getAngle()).toBe(45);
    });

    it("ao soltar os controles, retorna suavemente ao alinhamento horizontal neutro", () => {
      const k = createMockKaboom();
      const controls = new PlayerControlsManager(k);
      const baleia = createMockBaleia(false);

      // Inclina a baleia para 30°
      controls.setAngle(30);

      // Atualiza sem comandos de direção
      for (let frame = 0; frame < 60; frame++) {
        controls.updateOrientation(0.016, baleia, createInputs(), false, false);
      }

      // O ângulo deve amortecer em direção a 0°
      expect(Math.abs(controls.getAngle())).toBeLessThan(5);
      expect(Math.abs(controls.getTailAngle())).toBeLessThan(5);
    });

    it("resetPitchDynamics restaura o equilíbrio axial imediatamente", () => {
      const k = createMockKaboom();
      const controls = new PlayerControlsManager(k);
      const baleia = createMockBaleia(false);

      controls.updateOrientation(0.016, baleia, createInputs({ isUpDown: true }), false, false);
      expect(controls.getSpineCurvature()).not.toBe(0);

      controls.resetPitchDynamics(0);
      expect(controls.getAngle()).toBe(0);
      expect(controls.getTailAngle()).toBe(0);
      expect(controls.getSpineCurvature()).toBe(0);
      expect(controls.getPitchAngularVelocity()).toBe(0);
    });
  });

  describe("40.5 Vórtices Hidrodinâmicos de Borda Peitoral", () => {
    it("calcula vetores de vórtice de escape adequados à direção e velocidade angular", () => {
      // Curva para cima (velocidade angular negativa): água deslocada para baixo (velY > 0)
      const dataUp = calculatePectoralVortexData(0, true, -40);
      expect(dataUp.radius).toBeGreaterThan(1);
      expect(dataUp.offsetX).toBeGreaterThan(0); // Peitorais à frente quando virada para direita
      expect(dataUp.velY).toBeGreaterThan(0);
      expect(dataUp.color).toEqual([190, 240, 255]);

      // Curva para baixo (velocidade angular positiva): água deslocada para cima (velY < 0)
      const dataDown = calculatePectoralVortexData(0, true, 40);
      expect(dataDown.velY).toBeLessThan(0);

      // Virada para a esquerda: offsets invertidos horizontalmente
      const dataLeft = calculatePectoralVortexData(0, false, -40);
      expect(dataLeft.offsetX).toBeLessThan(0);
      expect(dataLeft.velX).toBeGreaterThan(0);
    });

    it("executa spawnPectoralTipVortices sem falhas quando o pool de partículas está ausente ou presente", () => {
      const k = createMockKaboom();
      expect(() => {
        spawnPectoralTipVortices(k, k.vec2(100, 200), -20, true, -35);
      }).not.toThrow();
    });
  });

  describe("40.6 Balanço Oceânico e Deriva em Repouso (Current Drift)", () => {
    it("zera o deslocamento de deriva quando o blend de repouso é zero", () => {
      const drift = calculateOceanIdleDrift(5.0, 0);
      expect(drift.surgeVelocityX).toBe(0);
      expect(drift.heaveVelocityY).toBe(0);
    });

    it("gera oscilação horizontal de correnteza (surge) e vertical (heave) com idleBlend = 1", () => {
      const driftAtZero = calculateOceanIdleDrift(0, 1.0);
      // No instante t = 0, cos(0) = 1, surgeX atinge pico inicial positivo (~14.5 px/s)
      expect(driftAtZero.surgeVelocityX).toBeGreaterThan(13);
      // No instante t = 0, sin(0) = 0, heaveY inicia próximo de zero
      expect(Math.abs(driftAtZero.heaveVelocityY)).toBeLessThan(0.001);

      // No instante t = PI / (2 * 0.85) (~1.85s), cos(0.85t) passa por zero e sin(0.85t) atinge pico
      const peakHeaveTime = Math.PI / (2 * 0.85);
      const driftAtPeakHeave = calculateOceanIdleDrift(peakHeaveTime, 1.0);
      expect(driftAtPeakHeave.heaveVelocityY).toBeGreaterThan(4.5);

      // No instante t = PI / 0.85 (~3.7s), surgeX inverte a correnteza (indo e voltando)
      const reverseSurgeTime = Math.PI / 0.85;
      const driftReverse = calculateOceanIdleDrift(reverseSurgeTime, 1.0);
      expect(driftReverse.surgeVelocityX).toBeLessThan(-8);
    });

    it("integral de deriva ao longo de múltiplos ciclos é estritamente limitada (sem acúmulo infinito)", () => {
      let cumulativeDisplacementX = 0;
      let cumulativeDisplacementY = 0;
      const deltaTime = 0.016;
      const totalSimulationSteps = 3000; // ~48 segundos de simulação

      for (let step = 0; step < totalSimulationSteps; step++) {
        const timeInSeconds = step * deltaTime;
        const drift = calculateOceanIdleDrift(timeInSeconds, 1.0);
        cumulativeDisplacementX += drift.surgeVelocityX * deltaTime;
        cumulativeDisplacementY += drift.heaveVelocityY * deltaTime;

        // O deslocamento horizontal e vertical nunca deve exceder a amplitude orbital física
        expect(Math.abs(cumulativeDisplacementX)).toBeLessThan(35);
        expect(Math.abs(cumulativeDisplacementY)).toBeLessThan(16);
      }
    });
  });
});
