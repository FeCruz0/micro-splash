import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PlayerOxygenManager } from "../../src/entities/player/playerOxygen";
import { accessibilitySystem } from "../../src/systems/accessibilitySystem";
import {
  RenderEngineAdapter,
  setActiveRenderEngine,
} from "../../src/engine/adapters/RenderEngineAdapter";
import { PixiContainerNode } from "../../src/engine/adapters/PixiNodes";
import type { IRenderTicker } from "../../src/engine/contracts/INTERFACE_CONTRACTS";

describe("Etapa 4.4: Integração de Oxigênio, Acessibilidade e Shake no PixiJS v8", () => {
  beforeEach(() => {
    localStorage.clear();
    accessibilitySystem.setColorMode("normal");
    accessibilitySystem.setReducedMotion("full"); // Permite shake para testes
    accessibilitySystem.setFontScale("normal");
  });

  afterEach(() => {
    setActiveRenderEngine(null);
  });

  describe("PlayerOxygenManager — Lógica e Alertas Semânticos", () => {
    it("calcula taxa de oxigênio (ratio), estado de urgência e flag de nível baixo", () => {
      const mockEngineContext = {
        shake: vi.fn(),
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: vi.fn(),
        circle: vi.fn(),
        rect: vi.fn(),
        pos: vi.fn(),
        color: vi.fn(),
        opacity: vi.fn(),
        z: vi.fn(),
        scale: vi.fn(),
        anchor: vi.fn(),
        add: vi.fn(() => ({ onUpdate: vi.fn(), pos: { x: 0, y: 0 } })),
        destroy: vi.fn(),
        dt: () => 0.016,
      };

      const oxygenManager = new PlayerOxygenManager(mockEngineContext as any);
      expect(oxygenManager.getOxygen()).toBe(100);
      expect(oxygenManager.getOxygenRatio()).toBe(1.0);
      expect(oxygenManager.getUrgencyState()).toBe("calm");
      expect(oxygenManager.isLowOxygen()).toBe(false);

      // Penaliza com lixo (15 por lixo): 100 -> 85 -> 70 -> 55 (calm > 50%)
      oxygenManager.penalizeTrash();
      oxygenManager.penalizeTrash();
      oxygenManager.penalizeTrash();
      expect(oxygenManager.getUrgencyState()).toBe("calm");

      // 55 -> 40 (warning: 20% a 50%)
      oxygenManager.penalizeTrash();
      expect(oxygenManager.getUrgencyState()).toBe("warning");

      // 40 -> 25 (warning)
      oxygenManager.penalizeTrash();
      expect(oxygenManager.getUrgencyState()).toBe("warning");

      // 25 -> 10 (critical: < 20%)
      oxygenManager.penalizeTrash();
      expect(oxygenManager.getUrgencyState()).toBe("critical");
      expect(oxygenManager.isLowOxygen()).toBe(true);

      // Recuperação total
      oxygenManager.restoreOxygen(100);
      expect(oxygenManager.getOxygenRatio()).toBe(1.0);
      expect(oxygenManager.getUrgencyState()).toBe("calm");
      expect(oxygenManager.isLowOxygen()).toBe(false);
    });

    it("chama safeShake ao engasgar com óleo e ao desmaiar por falta de ar", () => {
      const mockShake = vi.fn();
      const mockEngineContext = {
        shake: mockShake,
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: vi.fn(),
        circle: vi.fn(),
        rect: vi.fn(),
        pos: vi.fn(),
        color: vi.fn(),
        opacity: vi.fn(),
        z: vi.fn(),
        scale: vi.fn(),
        anchor: vi.fn(),
        add: vi.fn(() => ({ onUpdate: vi.fn(), pos: { x: 0, y: 0 } })),
        destroy: vi.fn(),
        dt: () => 0.016,
      };

      const oxygenManager = new PlayerOxygenManager(mockEngineContext as any);
      oxygenManager.setOilObstructed(true);
      expect(mockShake).toHaveBeenCalledWith(2);

      // Desmaio por falta de oxigênio
      oxygenManager.penalizeTrash();
      oxygenManager.penalizeTrash();
      oxygenManager.penalizeTrash();
      oxygenManager.penalizeTrash();
      oxygenManager.penalizeTrash();
      oxygenManager.penalizeTrash(); // oxygen = 0

      // Atualiza após término do tempo de graça do blackout
      const submergedPosition = { x: 500, y: 300 };
      const currentSpeed = { x: 100, y: 0 };
      oxygenManager.update(10.0, submergedPosition, currentSpeed, true, false, false);
      expect(oxygenManager.isFaintingState()).toBe(true);
      expect(mockShake).toHaveBeenCalledWith(4);
    });
  });

  describe("RenderEngineAdapter — Screen Shake como deslocamento exclusivo do worldContainer", () => {
    it("aplica deslocamento aleatório ao worldContainer e preserva screenContainer fixo em (0, 0)", () => {
      const adapter = new RenderEngineAdapter();
      const worldContainer = new PixiContainerNode(undefined, "worldContainer");
      const screenContainer = new PixiContainerNode(undefined, "screenContainer");

      // Injeta containers mockados para validar cálculo de posição
      (adapter as any).worldContainer = worldContainer;
      (adapter as any).screenContainer = screenContainer;

      let tickCallback: ((deltaTime: number) => void) | null = null;
      const mockTicker: IRenderTicker = {
        add: vi.fn((cb) => {
          tickCallback = cb;
          return () => {
            tickCallback = null;
          };
        }),
        start: vi.fn(),
        stop: vi.fn(),
        getFPS: () => 60,
        getDeltaTime: () => 0.016,
      };
      (adapter as any).tickerAdapter = mockTicker;

      adapter.setCameraPosition(1000, 250);
      expect(worldContainer.getPosition()).toEqual({ x: -600, y: 50 });
      expect(screenContainer.getPosition()).toEqual({ x: 0, y: 0 });

      // Dispara o tremor de tela
      adapter.shake(10);
      expect(mockTicker.add).toHaveBeenCalled();

      // Executa um tick do tremor
      tickCallback!(0.05);

      const offsetAfterShake = adapter.getShakeOffset();
      expect(Math.abs(offsetAfterShake.x) + Math.abs(offsetAfterShake.y)).toBeGreaterThan(0);

      // O worldContainer reflete o deslocamento do tremor somado à câmera centralizada
      expect(worldContainer.getPosition().x).toBeCloseTo(-600 + offsetAfterShake.x, 2);
      expect(worldContainer.getPosition().y).toBeCloseTo(50 + offsetAfterShake.y, 2);

      // O screenContainer permanece em (0, 0)
      expect(screenContainer.getPosition()).toEqual({ x: 0, y: 0 });

      // Avança além da duração total para encerrar o tremor
      tickCallback!(0.25);
      expect(adapter.getShakeOffset()).toEqual({ x: 0, y: 0 });
      expect(worldContainer.getPosition()).toEqual({ x: -600, y: 50 });
    });

    it("suprime o tremor de tela completamente quando o movimento reduzido está ativo", () => {
      accessibilitySystem.setReducedMotion("reduced");
      expect(accessibilitySystem.isReducedMotion()).toBe(true);

      const adapter = new RenderEngineAdapter();
      const worldContainer = new PixiContainerNode(undefined, "worldContainer");
      (adapter as any).worldContainer = worldContainer;

      const mockTicker: IRenderTicker = {
        add: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        getFPS: () => 60,
        getDeltaTime: () => 0.016,
      };
      (adapter as any).tickerAdapter = mockTicker;

      adapter.setCameraPosition(500, 100);
      adapter.shake(15);

      // Ticker de tremor não deve ser adicionado
      expect(mockTicker.add).not.toHaveBeenCalled();
      expect(adapter.getShakeOffset()).toEqual({ x: 0, y: 0 });
      expect(worldContainer.getPosition()).toEqual({ x: -100, y: 200 });
    });
  });

  describe("AccessibilitySystem — Configurações e Notificação de Ouvintes", () => {
    it("notifica ouvintes registrados ao alterar a escala tipográfica", () => {
      const listenerSpy = vi.fn();
      const unsubscribe = accessibilitySystem.addFontScaleListener(listenerSpy);

      accessibilitySystem.setFontScale("large");
      expect(listenerSpy).toHaveBeenCalledWith(1.2);
      expect(accessibilitySystem.getFontScale()).toBe(1.2);

      accessibilitySystem.setFontScale("small");
      expect(listenerSpy).toHaveBeenCalledWith(0.85);

      unsubscribe();
      accessibilitySystem.setFontScale("normal");
      expect(listenerSpy).toHaveBeenCalledTimes(2);
    });

    it("comuta modos de cor e reflete estado de alto contraste", () => {
      accessibilitySystem.setColorMode("high_contrast");
      expect(accessibilitySystem.isHighContrast()).toBe(true);

      accessibilitySystem.setColorMode("protanopia");
      expect(accessibilitySystem.isHighContrast()).toBe(false);
      expect(accessibilitySystem.getColorMode()).toBe("protanopia");
    });
  });
});
