import { describe, it, expect, vi, beforeEach } from "vitest";
import { GAME_CONFIG } from "../../src/config";
import { PixiContainerNode } from "../../src/engine/adapters/PixiNodes";
import { RenderEngineAdapter } from "../../src/engine/adapters/RenderEngineAdapter";
import { createRenderingContext } from "../../src/engine/adapters/RenderingContextAdapter";
import { SceneManager } from "../../src/engine/SceneManager";
import {
  createGameScene,
  synchronizeGameSceneCameraTracking,
  type GameSceneEngineContext,
} from "../../src/scenes/gameScene";
import { createPlayer } from "../../src/entities/player";

function setupRenderEngineWithViewport(viewportWidth: number, viewportHeight: number) {
  const renderEngineAdapter = new RenderEngineAdapter();
  const worldContainer = new PixiContainerNode(undefined, "world_container");
  const screenContainer = new PixiContainerNode(undefined, "screen_container");

  (renderEngineAdapter as unknown as { worldContainer: PixiContainerNode }).worldContainer =
    worldContainer;
  (renderEngineAdapter as unknown as { screenContainer: PixiContainerNode }).screenContainer =
    screenContainer;
  (renderEngineAdapter as unknown as { viewportWidth: number }).viewportWidth = viewportWidth;
  (renderEngineAdapter as unknown as { viewportHeight: number }).viewportHeight = viewportHeight;

  renderEngineAdapter.setCameraPosition(viewportWidth / 2, viewportHeight / 2);

  return { renderEngineAdapter, worldContainer, screenContainer };
}

describe("Fases 1 e 2: Câmera com Y Fixo e Dono Único do Rastreamento (gameScene)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Fase 1 — Câmera com Y Fixo no Centro Vertical da Viewport", () => {
    it("synchronizePlayerCameraTracking preserva Y atual quando omitido, mantendo y=0 no topo e SEA_LEVEL a SEA_LEVEL px", () => {
      const viewportWidth = 1280;
      const viewportHeight = 720;
      const { renderEngineAdapter, worldContainer } = setupRenderEngineWithViewport(
        viewportWidth,
        viewportHeight
      );
      const sceneManager = new SceneManager();
      const renderingContext = createRenderingContext(renderEngineAdapter, sceneManager);

      // Posição inicial da câmera no centro (640, 360)
      expect(renderingContext.camPos()).toEqual({ x: 640, y: 360 });
      expect(worldContainer.getPosition().y).toBe(0);

      // Rastreia apenas X omitindo Y
      const updatedCameraPosition = renderingContext.synchronizePlayerCameraTracking!(1040);

      expect(updatedCameraPosition.y).toBe(viewportHeight / 2);
      expect(updatedCameraPosition.x).toBeCloseTo(640 + (1040 - 640) * 0.05, 4);

      // Projeção em tela = coordenadaMundo + worldContainer.y
      const worldContainerOffsetY = worldContainer.getPosition().y;
      expect(worldContainerOffsetY).toBe(0);
      expect(0 + worldContainerOffsetY).toBe(0); // topo do céu
      expect(GAME_CONFIG.SEA_LEVEL + worldContainerOffsetY).toBe(GAME_CONFIG.SEA_LEVEL); // linha d'água
    });

    it("synchronizeGameSceneCameraTracking mantém Y fixo em height()/2 independente da profundidade da baleia", () => {
      const viewportWidth = 1280;
      const viewportHeight = 720;
      const { renderEngineAdapter, worldContainer } = setupRenderEngineWithViewport(
        viewportWidth,
        viewportHeight
      );
      const sceneManager = new SceneManager();
      const renderingContext = createRenderingContext(renderEngineAdapter, sceneManager);

      // Simula câmera previamente descalibrada em Y = 0
      renderingContext.camPos(320, 0);
      expect(worldContainer.getPosition().y).toBe(viewportHeight / 2);

      const playerControllerStub = {
        gameObj: { pos: { x: 500, y: 480 } }, // baleia mergulhando em y = 480
        isFacingRight: () => true,
        getTargetCameraHorizontalOffset: () => 200,
      } as unknown as Parameters<typeof synchronizeGameSceneCameraTracking>[1];

      const trackedPosition = synchronizeGameSceneCameraTracking(
        renderingContext as unknown as GameSceneEngineContext,
        playerControllerStub
      );

      // X avança 1 passo de lerp 0.05 de 320 para (500 + 200 = 700)
      expect(trackedPosition.x).toBeCloseTo(320 + (700 - 320) * 0.05, 4);
      // Y é corrigido e travado em height()/2 = 360 (não 0 e não 480)
      expect(trackedPosition.y).toBe(viewportHeight / 2);
      expect(worldContainer.getPosition().y).toBe(0);
      expect(0 + worldContainer.getPosition().y).toBe(0);
      expect(GAME_CONFIG.SEA_LEVEL + worldContainer.getPosition().y).toBe(GAME_CONFIG.SEA_LEVEL);
    });
  });

  describe("Fase 2 — Rastreamento Único da Câmera em gameScene", () => {
    it("player.ts não atualiza camPos no próprio loop e expõe getTargetCameraHorizontalOffset", () => {
      const camPosSpy = vi.fn((x?: number, y?: number) => ({
        x: x ?? 320,
        y: y ?? 360,
      }));

      const mockEngineContext = {
        width: () => 1280,
        height: () => 720,
        vec2: (x: number, y: number) => ({
          x,
          y,
          len: () => Math.hypot(x, y),
          unit: () => ({ x: 0, y: 0 }),
          add: (other: { x: number; y: number }) =>
            mockEngineContext.vec2(x + other.x, y + other.y),
          scale: (factor: number) => mockEngineContext.vec2(x * factor, y * factor),
        }),
        deg2rad: (degrees: number) => (degrees * Math.PI) / 180,
        rad2deg: (radians: number) => (radians * 180) / Math.PI,
        clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
        lerp: (start: number, end: number, t: number) => start + (end - start) * t,
        isKeyDown: () => false,
        isKeyPressed: () => false,
        isKeyReleased: () => false,
        rand: (min: number) => min,
        dt: () => 0.016,
        time: () => 1.0,
        camPos: camPosSpy,
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        add: () => ({
          pos: { x: 120, y: 200, add: () => ({ x: 120, y: 200 }) },
          flipX: false,
          color: { r: 255, g: 255, b: 255 },
          play: () => {},
          move: () => {},
        }),
      };

      const playerController = createPlayer(mockEngineContext as never, 120, false);
      expect(playerController.getTargetCameraHorizontalOffset?.()).toBe(200);

      camPosSpy.mockClear();
      playerController.update?.();

      // Nenhuma chamada a camPos com coordenadas vinda de player.ts
      const setterCalls = camPosSpy.mock.calls.filter((call) => call.length > 0);
      expect(setterCalls).toHaveLength(0);
    });

    it("um quadro completo da gameScene desloca a câmera apenas um passo de lerp 0.05 mantendo Y fixo", async () => {
      const viewportWidth = 1280;
      const viewportHeight = 720;
      const { renderEngineAdapter, worldContainer } = setupRenderEngineWithViewport(
        viewportWidth,
        viewportHeight
      );
      const sceneManager = new SceneManager();
      const renderingContext = createRenderingContext(renderEngineAdapter, sceneManager);

      const gameScene = createGameScene(renderingContext as unknown as GameSceneEngineContext);
      await gameScene.enter({ mode: "serene" });

      // Após enter(), câmera inicia alinhada no jogador (120 + 200 = 320) e Y fixo (360)
      expect(renderingContext.camPos()).toEqual({ x: 320, y: 360 });
      expect(worldContainer.getPosition().y).toBe(0);

      // Posiciona câmera manualmente antes do quadro para observar exatamente 1 passo de lerp 0.05
      renderingContext.camPos(500, 360);
      const cameraSetSpy = vi.spyOn(renderEngineAdapter, "setCameraPosition");

      // Executa exatamente 1 quadro completo (gameScene.update + lifecycle onUpdate)
      gameScene.update(0.016);
      renderingContext.lifecycle.runSceneUpdateCallbacks(0.016);

      // Destino da câmera é ~320 (baleia ~120 + offset 200). 1 passo lerp 0.05 a partir de 500 = 491
      const finalCameraPosition = renderingContext.camPos();
      expect(cameraSetSpy).toHaveBeenCalledTimes(1);
      expect(finalCameraPosition.x).toBeGreaterThan(489);
      expect(finalCameraPosition.x).toBeLessThan(492);
      expect(finalCameraPosition.y).toBe(viewportHeight / 2);
      expect(worldContainer.getPosition().y).toBe(0);

      await gameScene.exit();
    });
  });
});
