import { describe, it, expect, vi } from "vitest";
import { FrameRateMonitor } from "../../src/utils/frameRateMonitor";
import { SpatialCullingManager } from "../../src/systems/spatialCullingSystem";

describe("Fase 66: Otimização de Framerate, Desacoplamento de Timestep & 60 FPS Fix", () => {
  describe("66.1 Monitor de Taxa de Quadros (FrameRateMonitor)", () => {
    it("inicia com 60 FPS padrão e registra primeiro quadro sem crash", () => {
      const monitor = new FrameRateMonitor(30);
      expect(monitor.getFps()).toBe(60);
      expect(monitor.getFrameTimeMs()).toBeCloseTo(16.6, 1);

      // Primeiro tick
      const firstMetrics = monitor.tick(1000);
      expect(firstMetrics.fps).toBe(60);
      expect(firstMetrics.frameTimeMs).toBeCloseTo(16.6, 1);
    });

    it("calcula 60 FPS exatos em deltas de 16.66ms", () => {
      const monitor = new FrameRateMonitor(30);
      let time = 1000;
      monitor.tick(time);

      for (let i = 0; i < 10; i++) {
        time += 16.666;
        monitor.tick(time);
      }

      expect(monitor.getFps()).toBe(60);
      expect(monitor.getFrameTimeMs()).toBeCloseTo(16.666, 1);
    });

    it("recupera rapidamente de um pico isolado de lag (100ms) sem ficar travado em 10 FPS", () => {
      const monitor = new FrameRateMonitor(10);
      let time = 1000;
      monitor.tick(time);

      // 5 quadros estáveis a 60 FPS
      for (let i = 0; i < 5; i++) {
        time += 16.666;
        monitor.tick(time);
      }

      // Um soluço de 100ms (queda temporária para 10 FPS)
      time += 100;
      const spikeResult = monitor.tick(time);
      expect(spikeResult.frameTimeMs).toBe(100);

      // Quadros subsequentes voltam a 16.6ms e o FPS médio recupera acima de 45-50 FPS rapidamente
      for (let i = 0; i < 5; i++) {
        time += 16.666;
        monitor.tick(time);
      }

      expect(monitor.getFps()).toBeGreaterThanOrEqual(45);
      expect(monitor.getFps()).toBeLessThanOrEqual(60);
    });

    it("limpa histórico ao invocar reset()", () => {
      const monitor = new FrameRateMonitor(10);
      monitor.tick(1000);
      monitor.tick(1050);
      expect(monitor.getFrameTimeMs()).toBe(50);

      monitor.reset();
      expect(monitor.getFps()).toBe(60);
      expect(monitor.getFrameTimeMs()).toBeCloseTo(16.6, 1);
    });
  });

  describe("66.2 Culling Universal de Nós PixiJS & Suporte a setVisible", () => {
    function createMockEngineContext(width: number = 1280) {
      return {
        width: () => width,
      };
    }

    it("invoca setVisible(false) e setVisible(true) em nós compatíveis com IRenderNode", () => {
      const engineContext = createMockEngineContext(1280);
      const manager = new SpatialCullingManager(engineContext, 200);

      const setVisibleSpy = vi.fn();
      const mockNode: any = {
        pos: { x: 3000, y: 100 },
        hidden: false,
        setVisible: setVisibleSpy,
        exists: () => true,
      };

      manager.registerEntity(mockNode);

      // Câmera em x=500: entidade em 3000 está fora do frustum (500 + 640 + 200 = 1340)
      const culled = manager.update(500);
      expect(culled.hiddenCount).toBe(1);
      expect(mockNode.hidden).toBe(true);
      expect(setVisibleSpy).toHaveBeenCalledWith(false);

      // Câmera move para x=2900: entra no frustum
      const visible = manager.update(2900);
      expect(visible.visibleCount).toBe(1);
      expect(mockNode.hidden).toBe(false);
      expect(setVisibleSpy).toHaveBeenCalledWith(true);
    });

    it("suporta getPosition() nativo de nós quando pos literal não existe", () => {
      const engineContext = createMockEngineContext(1280);
      const manager = new SpatialCullingManager(engineContext, 200);

      const setVisibleSpy = vi.fn();
      const mockNode: any = {
        getPosition: () => ({ x: 2500, y: 200 }),
        setVisible: setVisibleSpy,
        exists: () => true,
      };

      manager.registerEntity(mockNode);

      // Câmera em 500: nó em 2500 fica oculto
      manager.update(500);
      expect(setVisibleSpy).toHaveBeenCalledWith(false);

      // Câmera em 2400: nó entra em tela
      manager.update(2400);
      expect(setVisibleSpy).toHaveBeenCalledWith(true);
    });
  });
});
