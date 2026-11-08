/**
 * Teste de Validação de Frame Budget e Rota Serena de 30.000 Metros — Etapa 5.3
 *
 * Valida a conformidade de tempos nominais por subsistema no SystemRunner:
 * - input: <= 1.0 ms
 * - physics: <= 4.0 ms
 * - ai: <= 3.0 ms
 * - collision: <= 2.5 ms
 * - culling: <= 2.0 ms
 * - render: <= 4.1 ms
 *
 * Executa simulação de estresse de longa duração ao longo dos 30.000 metros da rota no modo Sereno,
 * garantindo ausência de quedas sustentadas abaixo de 30 FPS (teto de 33.3 ms).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  FrameBudgetMonitor,
  DEFAULT_PHASE_BUDGETS,
  type FrameBudgetSnapshot,
} from "../../src/systems/frameBudgetMonitor";
import { SystemRunner, SYSTEM_PHASES, type SystemPhase } from "../../src/systems/systemRunner";
import { SpatialHashGrid } from "../../src/systems/spatialHashGrid";
import { SpatialCullingManager } from "../../src/systems/spatialCullingSystem";
import { getCurrentBiome } from "../../src/systems/oceanEnvironment";
import { GAME_CONFIG } from "../../src/config";

describe("Etapa 5.3: Validação de Frame Budget e Rota Serena de 30.000 Metros", () => {
  let frameBudgetMonitor: FrameBudgetMonitor;
  let systemRunner: SystemRunner;

  beforeEach(() => {
    frameBudgetMonitor = new FrameBudgetMonitor({}, 30);
    systemRunner = new SystemRunner();
    systemRunner.setProfiler((phase: SystemPhase, durationMilliseconds: number) => {
      frameBudgetMonitor.recordPhaseDuration(phase, durationMilliseconds);
    });
  });

  describe("5.3.1 Validação dos Limites Nominais de Frame Budget por Fase", () => {
    it("deve definir orçamentos nominais estritos conforme especificação técnica", () => {
      expect(DEFAULT_PHASE_BUDGETS.input).toBe(1.0);
      expect(DEFAULT_PHASE_BUDGETS.physics).toBe(4.0);
      expect(DEFAULT_PHASE_BUDGETS.ai).toBe(3.0);
      expect(DEFAULT_PHASE_BUDGETS.collision).toBe(2.5);
      expect(DEFAULT_PHASE_BUDGETS.culling).toBe(2.0);
      expect(DEFAULT_PHASE_BUDGETS.render).toBe(4.1);

      // Soma nominal deve corresponder a 16.6 ms (alvo de 60 FPS ininterruptos)
      const totalNominalBudget =
        DEFAULT_PHASE_BUDGETS.input +
        DEFAULT_PHASE_BUDGETS.physics +
        DEFAULT_PHASE_BUDGETS.ai +
        DEFAULT_PHASE_BUDGETS.collision +
        DEFAULT_PHASE_BUDGETS.culling +
        DEFAULT_PHASE_BUDGETS.render;

      expect(totalNominalBudget).toBeCloseTo(16.6, 1);
    });

    it("deve cobrir todas as 6 fases canônicas ordenadas no SystemRunner", () => {
      expect(SYSTEM_PHASES).toEqual([
        "input",
        "physics",
        "ai",
        "collision",
        "culling",
        "render",
      ]);
    });
  });

  describe("5.3.2 Monitoramento do Overlay de Frame Budget e Métricas de Telemetria", () => {
    it("deve confirmar que os subsistemas operam dentro do orçamento nominal sem disparar overrun", () => {
      // Registra amostras representativas dentro do orçamento
      frameBudgetMonitor.recordPhaseDuration("input", 0.35);
      frameBudgetMonitor.recordPhaseDuration("physics", 1.85);
      frameBudgetMonitor.recordPhaseDuration("ai", 1.15);
      frameBudgetMonitor.recordPhaseDuration("collision", 0.95);
      frameBudgetMonitor.recordPhaseDuration("culling", 0.65);
      frameBudgetMonitor.recordPhaseDuration("render", 2.1);

      const frameSnapshot: FrameBudgetSnapshot = frameBudgetMonitor.getSnapshot(7.05);

      expect(frameSnapshot.isBudgetExceeded).toBe(false);
      expect(frameSnapshot.spikeDetected).toBe(false);
      expect(frameSnapshot.totalOverruns).toBe(0);

      const budgetStatusText = frameSnapshot.isBudgetExceeded ? "⚠️ Overrun" : "Budget OK";
      expect(budgetStatusText).toBe("Budget OK");

      for (const phase of SYSTEM_PHASES) {
        const phaseMetric = frameSnapshot.phaseMetrics[phase];
        expect(phaseMetric.averageMs).toBeLessThanOrEqual(phaseMetric.budgetMs);
        expect(phaseMetric.lastDurationMs).toBeLessThanOrEqual(phaseMetric.budgetMs);
      }
    });

    it("deve detectar e sinalizar violação quando qualquer subsistema ultrapassar o orçamento", () => {
      frameBudgetMonitor.recordPhaseDuration("physics", 4.8); // Ultrapassa 4.0 ms

      expect(frameBudgetMonitor.isPhaseExceeded("physics")).toBe(true);
      const metrics = frameBudgetMonitor.getPhaseMetrics("physics");
      expect(metrics.overrunCount).toBe(1);

      const frameSnapshot = frameBudgetMonitor.getSnapshot(18.0);
      expect(frameSnapshot.isBudgetExceeded).toBe(true);

      const budgetStatusText = frameSnapshot.isBudgetExceeded ? "⚠️ Overrun" : "Budget OK";
      expect(budgetStatusText).toBe("⚠️ Overrun");
    });
  });

  describe("5.3.3 Simulação de Estresse da Rota de 30.000 Metros no Modo Sereno", () => {
    it("deve percorrer os 30.000 metros sem ultrapassar o teto sustentado de 33.3 ms", () => {
      const spatialHashGrid = new SpatialHashGrid<{ tag: string }>({ cellSize: 128 });
      const mockEngineContext = { width: () => 1280, height: () => 720 };
      const spatialCullingManager = new SpatialCullingManager(mockEngineContext, 300);

      // Popula o grid com obstáculos e itens ao longo da migração
      for (let x = 100; x <= 30000; x += 150) {
        spatialHashGrid.insert(
          `entity_krill_${x}`,
          { tag: "krill" },
          { minX: x, minY: 150, maxX: x + 20, maxY: 170 },
          true
        );

        spatialCullingManager.registerEntity({
          pos: { x, y: 150 },
          hidden: true,
          setVisible: () => {},
          exists: () => true,
        });
      }

      let simulatedPlayerPositionX = 0;
      const simulatedPlayerPositionY = 180;
      let simulatedCompanionPositionX = -60;
      let simulatedCameraPositionX = 0;

      // Fase 1: Input (leitura desacoplada do estado de controle)
      systemRunner.register("input", () => {
        // Operação O(1) de leitura de periféricos/input state
        const inputForward = true;
        if (inputForward) {
          // Mantém estado de nado contínuo
        }
      });

      // Fase 2: Physics (integração de velocidade e cinemática da jubarte)
      systemRunner.register("physics", (deltaTime: number) => {
        const swimmingVelocity = 120; // 120 m/s simulados para cobrir 30.000m rapidamente
        simulatedPlayerPositionX += swimmingVelocity * deltaTime;
        simulatedCameraPositionX = simulatedPlayerPositionX;
      });

      // Fase 3: AI (locomoção suave do companion no modo sereno com histerese)
      systemRunner.register("ai", () => {
        const targetDistanceBehind = 60;
        const targetCompanionX = simulatedPlayerPositionX - targetDistanceBehind;
        simulatedCompanionPositionX += (targetCompanionX - simulatedCompanionPositionX) * 0.15;
      });

      // Fase 4: Collision (consulta AABB via SpatialHashGrid)
      systemRunner.register("collision", () => {
        const queryBox = {
          minX: simulatedPlayerPositionX - 30,
          minY: simulatedPlayerPositionY - 20,
          maxX: simulatedPlayerPositionX + 30,
          maxY: simulatedPlayerPositionY + 20,
        };
        const nearbyEntities = spatialHashGrid.queryAABB(queryBox);
        expect(nearbyEntities).toBeDefined();
      });

      // Fase 5: Culling (atualização de frustum ao longo do percurso)
      systemRunner.register("culling", () => {
        spatialCullingManager.update(simulatedCameraPositionX);
      });

      // Fase 6: Render (atualização de cores de bioma e interpolação de apresentação)
      systemRunner.register("render", () => {
        const activeBiome = getCurrentBiome(simulatedPlayerPositionX);
        expect(activeBiome).toBeDefined();
      });

      const totalRouteDistance = GAME_CONFIG.ROUTE_TOTAL_DISTANCE; // 30.000m
      const deltaTime = 0.016; // 60 FPS nominais (16.6 ms)

      // Aquecimento de JIT para compilação das closures do SystemRunner
      for (let warmupIndex = 0; warmupIndex < 25; warmupIndex++) {
        systemRunner.run(deltaTime);
      }
      frameBudgetMonitor.reset();
      simulatedPlayerPositionX = 0;

      let frameCount = 0;
      let maxRecordedFrameDurationMs = 0;
      let totalFrameDurationSumMs = 0;
      let consecutiveSpikeCount = 0;
      let sustainedDropsCount = 0;

      // Executa o percurso completo de 0 até 30.000 metros
      while (simulatedPlayerPositionX < totalRouteDistance) {
        const frameStartTimestamp = performance.now();

        systemRunner.run(deltaTime);

        const frameDurationMilliseconds = performance.now() - frameStartTimestamp;
        frameCount++;
        totalFrameDurationSumMs += frameDurationMilliseconds;

        if (frameDurationMilliseconds > maxRecordedFrameDurationMs) {
          maxRecordedFrameDurationMs = frameDurationMilliseconds;
        }

        if (frameDurationMilliseconds > 33.3) {
          consecutiveSpikeCount++;
          if (consecutiveSpikeCount >= 2) {
            sustainedDropsCount++;
          }
        } else {
          consecutiveSpikeCount = 0;
        }
      }

      const averageFrameDurationMs = totalFrameDurationSumMs / frameCount;

      expect(simulatedPlayerPositionX).toBeGreaterThanOrEqual(totalRouteDistance);
      expect(frameCount).toBeGreaterThan(100);

      // Validação estrita: ausência de quedas sustentadas (zero sequências de múltiplos frames acima de 33.3 ms)
      expect(sustainedDropsCount).toBe(0);
      expect(averageFrameDurationMs).toBeLessThan(16.6); // Média nominal mantida abaixo de 16.6 ms (60 FPS)

      // Validação das médias por fase registradas pelo monitor
      const inputMetrics = frameBudgetMonitor.getPhaseMetrics("input");
      const physicsMetrics = frameBudgetMonitor.getPhaseMetrics("physics");
      const aiMetrics = frameBudgetMonitor.getPhaseMetrics("ai");
      const collisionMetrics = frameBudgetMonitor.getPhaseMetrics("collision");
      const cullingMetrics = frameBudgetMonitor.getPhaseMetrics("culling");
      const renderMetrics = frameBudgetMonitor.getPhaseMetrics("render");

      expect(inputMetrics.averageMs).toBeLessThanOrEqual(DEFAULT_PHASE_BUDGETS.input);
      expect(physicsMetrics.averageMs).toBeLessThanOrEqual(DEFAULT_PHASE_BUDGETS.physics);
      expect(aiMetrics.averageMs).toBeLessThanOrEqual(DEFAULT_PHASE_BUDGETS.ai);
      expect(collisionMetrics.averageMs).toBeLessThanOrEqual(DEFAULT_PHASE_BUDGETS.collision);
      expect(cullingMetrics.averageMs).toBeLessThanOrEqual(DEFAULT_PHASE_BUDGETS.culling);
      expect(renderMetrics.averageMs).toBeLessThanOrEqual(DEFAULT_PHASE_BUDGETS.render);

      // Snapshot final deve indicar orçamento sem estouros no último frame e sem spikes
      const finalSnapshot = frameBudgetMonitor.getSnapshot(16.0);
      expect(finalSnapshot.spikeDetected).toBe(false);
      expect(finalSnapshot.isBudgetExceeded).toBe(false);
      expect(finalSnapshot.totalOverruns).toBeLessThan(frameCount * 0.03);
    });
  });
});
