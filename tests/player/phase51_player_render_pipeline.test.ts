import { describe, it, expect, vi } from "vitest";
import { getWhaleBreathColor } from "../../src/entities/player/playerBreathPalette";
import {
  executeWhaleRenderPipeline,
  type WhaleRenderPipelineParameters,
} from "../../src/entities/player/playerRenderPipeline";

describe("Fase 51: Pipeline Unificada de Renderização e Paleta de Fôlego", () => {
  describe("51.2: Paleta Centralizada por Estado de Fôlego (playerBreathPalette.ts)", () => {
    it("retorna cor branca pura para estado calmo (> 50% de oxigênio)", () => {
      const palette = getWhaleBreathColor({ oxygenRatio: 0.85 });
      expect(palette.urgencyState).toBe("calm");
      expect(palette.bodyColor).toEqual([255, 255, 255]);
      expect(palette.finsColor).toEqual([255, 255, 255]);
      expect(palette.suffocationIntensity).toBe(0.0);
    });

    it("retorna tonalidade de transição para estado de aviso (20% a 50% de oxigênio)", () => {
      const palette = getWhaleBreathColor({ oxygenRatio: 0.35 });
      expect(palette.urgencyState).toBe("warning");
      expect(palette.bodyColor[0]).toBeLessThan(255);
      expect(palette.bodyColor[1]).toBeLessThan(255);
      expect(palette.suffocationIntensity).toBeCloseTo(0.65, 2);
    });

    it("retorna alerta e escurecimento para estado crítico (< 20% de oxigênio)", () => {
      const palette = getWhaleBreathColor({ oxygenRatio: 0.1, timeInSeconds: 1.0 });
      expect(palette.urgencyState).toBe("critical");
      expect(palette.bodyColor[0]).toBeLessThan(180);
      expect(palette.bodyColor[1]).toBeLessThan(180);
      expect(palette.suffocationIntensity).toBeCloseTo(0.9, 2);
    });

    it("mantém a cor natural da baleia quando presa em rede fantasma", () => {
      const palette = getWhaleBreathColor({ oxygenRatio: 0.9, isTrapped: true });
      expect(palette.urgencyState).toBe("trapped");
      expect(palette.bodyColor).toEqual([255, 255, 255]);
      expect(palette.finsColor).toEqual([255, 255, 255]);
    });

    it("retorna cor escura cianótica em estado de desmaio por anóxia", () => {
      const palette = getWhaleBreathColor({ oxygenRatio: 0.0, isFainting: true });
      expect(palette.urgencyState).toBe("fainting");
      expect(palette.bodyColor).toEqual([55, 60, 80]);
      expect(palette.finsColor).toEqual([48, 52, 70]);
      expect(palette.suffocationIntensity).toBe(1.0);
    });

    it("suporta paleta adaptada para modo de alto contraste", () => {
      const criticalHc = getWhaleBreathColor({
        oxygenRatio: 0.05,
        isHighContrast: true,
      });
      expect(criticalHc.bodyColor).toEqual([255, 60, 60]);

      const trappedHc = getWhaleBreathColor({
        oxygenRatio: 0.9,
        isTrapped: true,
        isHighContrast: true,
      });
      expect(trappedHc.bodyColor).toEqual([255, 255, 255]);
    });
  });

  describe("51.1: Pipeline Unificada de Renderização (playerRenderPipeline.ts)", () => {
    const defaultParams: WhaleRenderPipelineParameters = {
      bodyAngleInDegrees: 15,
      spineCurvatureInDegrees: 20,
      pitchFlexionInDegrees: 10,
      pitchAngularVelocity: 25,
      strokeProgress: 0.4,
      isMuscularStroke: true,
      horizontalSpeed: 110,
      verticalSpeed: -20,
      idleBlendFactor: 0.0,
      currentRoll: 0.3,
      timeInSeconds: 2.5,
      isFacingRight: true,
      oxygenRatio: 0.75,
      isTrapped: false,
      isFainting: false,
      isHighContrast: false,
      isReducedMotion: false,
    };

    it("executa as 4 etapas em ordem estrita e gera snapshot consolidado", () => {
      const snapshot = executeWhaleRenderPipeline(defaultParams);

      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toBe(2.5);

      // 1. Puppet Rig (4 nós esqueléticos)
      expect(snapshot.puppetRig.bones).toHaveLength(4);
      expect(snapshot.puppetRig.cranialThorax).toBeDefined();
      expect(snapshot.puppetRig.flukeBlade).toBeDefined();

      // 2. Fatias Sagitais (4 fatias anatômicas acopladas ao rig)
      expect(snapshot.slices).toHaveLength(4);
      expect(snapshot.slices[0].name).toBe("head");
      expect(snapshot.slices[3].name).toBe("flukes");

      // 3. Nadadeiras Peitorais (Near e Far)
      expect(snapshot.pectoralFins.nearFin).toBeDefined();
      expect(snapshot.pectoralFins.farFin).toBeDefined();

      // 4. Paleta de Fôlego
      expect(snapshot.palette.urgencyState).toBe("calm");
      expect(snapshot.palette.bodyColor).toEqual([255, 255, 255]);
    });

    it("propaga atenuadores de movimento reduzido para rig, fatias e peitorais", () => {
      const fullSnapshot = executeWhaleRenderPipeline({
        ...defaultParams,
        isReducedMotion: false,
      });
      const reducedSnapshot = executeWhaleRenderPipeline({
        ...defaultParams,
        isReducedMotion: true,
      });

      // Flukes e pedúnculo amortecidos
      expect(Math.abs(reducedSnapshot.puppetRig.flukeBlade.relativeAngleInDegrees)).toBeLessThan(
        Math.abs(fullSnapshot.puppetRig.flukeBlade.relativeAngleInDegrees)
      );

      // Deslocamento de fatia atenuado
      const fullFlukeSlice = fullSnapshot.slices.find((s) => s.name === "flukes")!;
      const reducedFlukeSlice = reducedSnapshot.slices.find((s) => s.name === "flukes")!;
      expect(Math.abs(reducedFlukeSlice.localOffset.y)).toBeLessThan(
        Math.abs(fullFlukeSlice.localOffset.y)
      );

      // Diedro peitoral atenuado
      expect(Math.abs(reducedSnapshot.pectoralFins.nearFin.finAngleInDegrees)).toBeLessThan(
        Math.abs(fullSnapshot.pectoralFins.nearFin.finAngleInDegrees)
      );
    });

    it("integra snapshot e paleta no PlayerController", async () => {
      const { createPlayer } = await import("../../src/entities/player");

      const registeredUpdate: (() => void) | null = null;

      const mockKaboom: any = {
        height: () => 360,
        width: () => 640,
        sprite: () => ({ anim: "glide" }),
        pos: (x: number, y: number) => ({ x, y }),
        area: () => ({ area: true }),
        body: () => ({ body: true }),
        rotate: (r: number) => ({ rotate: r }),
        color: (r: number, g: number, b: number) => ({ color: { r, g, b } }),
        anchor: (_a: string) => ({ anchor: _a }),
        scale: (x: number, y: number) => ({ scale: { x, y } }),
        opacity: (o: number) => ({ opacity: o }),
        z: (z: number) => ({ z }),
        rect: (w: number, h: number) => ({ type: "rect", w, h }),
        polygon: (pts: any) => ({ pts }),
        Rect: class {
          constructor(_pos: any, _w: number, _h: number) {}
        },
        dt: () => 0.016,
        time: () => 1.5,
        vec2: (x: number, y: number) => ({
          x,
          y,
          len: () => Math.sqrt(x * x + y * y),
          unit: () => ({ x: 0, y: 0 }),
          add: (other: any) => mockKaboom.vec2(x + other.x, y + other.y),
          scale: (s: number) => mockKaboom.vec2(x * s, y * s),
        }),
        deg2rad: (deg: number) => (deg * Math.PI) / 180,
        rad2deg: (rad: number) => (rad * 180) / Math.PI,
        clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
        lerp: (a: number, b: number, t: number) => a + (b - a) * t,
        isKeyDown: () => false,
        isKeyPressed: () => false,
        isKeyReleased: () => false,
        rand: (min: number) => min,
        camPos: () => ({ x: 0, y: 0 }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        add: () => ({
          pos: {
            x: 120,
            y: 200,
            add: (v: any) => ({ x: 120 + v.x, y: 200 + v.y }),
          },
          angle: 0,
          scale: { x: 1, y: 1 },
          opacity: 1,
          color: { r: 255, g: 255, b: 255 },
          play: () => {},
          move: () => {},
          onUpdate: () => {},
          onDestroy: () => {},
        }),
      };

      const player = createPlayer(mockKaboom, 120, false);
      expect(typeof player.getRenderPipelineSnapshot).toBe("function");
      expect(typeof player.getBreathPalette).toBe("function");

      if (registeredUpdate) {
        (registeredUpdate as () => void)();
      }

      const snapshot = player.getRenderPipelineSnapshot!();
      expect(snapshot).toBeDefined();
      expect(snapshot?.slices).toHaveLength(4);
      expect(snapshot?.palette).toBeDefined();
    }, 20000);

    it("deve acionar a animacao 'feed' no SpriteAnimationController ao consumir krill", async () => {
      const { createPlayer } = await import("../../src/entities/player");
      const { getSpriteSheetManager } =
        await import("../../src/engine/adapters/SpriteSheetManager");

      const playSpy = vi.fn();
      const updateSpy = vi.fn();
      const manager = getSpriteSheetManager();
      const createControllerSpy = vi.spyOn(manager, "createAnimationController").mockReturnValue({
        play: playSpy,
        update: updateSpy,
        stop: vi.fn(),
        getFrame: vi.fn(() => 14),
        setFrame: vi.fn(),
      } as unknown as ReturnType<typeof manager.createAnimationController>);

      const mockKaboom: any = {
        width: () => 1280,
        height: () => 720,
        sprite: () => ({}),
        pos: (x: number, y: number) => ({ x, y }),
        area: () => ({}),
        anchor: () => ({}),
        rotate: () => ({}),
        scale: () => ({}),
        opacity: () => ({}),
        color: () => ({}),
        z: () => ({}),
        Rect: class {
          constructor(_pos: any, _w: number, _h: number) {}
        },
        dt: () => 0.016,
        time: () => 1.5,
        vec2: (x: number, y: number) => ({
          x,
          y,
          len: () => Math.sqrt(x * x + y * y),
          unit: () => ({ x: 0, y: 0 }),
          add: (other: any) => mockKaboom.vec2(x + other.x, y + other.y),
          scale: (s: number) => mockKaboom.vec2(x * s, y * s),
        }),
        deg2rad: (deg: number) => (deg * Math.PI) / 180,
        rad2deg: (rad: number) => (rad * 180) / Math.PI,
        clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
        lerp: (a: number, b: number, t: number) => a + (b - a) * t,
        isKeyDown: () => false,
        isKeyPressed: () => false,
        isKeyReleased: () => false,
        rand: (min: number) => min,
        camPos: () => ({ x: 0, y: 0 }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        add: () => ({
          pos: { x: 120, y: 200, add: (v: any) => ({ x: 120 + v.x, y: 200 + v.y }) },
          angle: 0,
          scale: { x: 1, y: 1 },
          opacity: 1,
          color: { r: 255, g: 255, b: 255 },
          play: () => {},
          move: () => {},
          onUpdate: () => {},
          onDestroy: () => {},
        }),
      };

      try {
        const player = createPlayer(mockKaboom, 120, false);
        expect(createControllerSpy).toHaveBeenCalledWith(expect.anything(), "baleia", "idle_swim");

        player.consumeKrill();
        expect(playSpy).toHaveBeenCalledWith("feed");

        (player.gameObj as unknown as { _triggerUpdate?: () => void })._triggerUpdate?.();
        expect(updateSpy).toHaveBeenCalled();
      } finally {
        createControllerSpy.mockRestore();
      }
    });

    it("deve acionar 'anticipation_open' ao aproximar krill na margem frontal e retornar a 'idle_swim' ao afastar", async () => {
      const { createPlayer } = await import("../../src/entities/player");
      const { getSpriteSheetManager } =
        await import("../../src/engine/adapters/SpriteSheetManager");
      const { initSpatialGrid } = await import("../../src/systems/spatialHashGrid");
      const { TAGS } = await import("../../src/config");

      const playSpy = vi.fn();
      const updateSpy = vi.fn();
      const manager = getSpriteSheetManager();
      const createControllerSpy = vi.spyOn(manager, "createAnimationController").mockReturnValue({
        play: playSpy,
        update: updateSpy,
        stop: vi.fn(),
        getFrame: vi.fn(() => 14),
        setFrame: vi.fn(),
      } as unknown as ReturnType<typeof manager.createAnimationController>);

      const grid = initSpatialGrid({ cellSize: 256 });
      grid.insert(
        "krill_ahead",
        { id: "krill_ahead", tag: TAGS.KRILL, exists: () => true },
        { minX: 195, minY: 190, maxX: 215, maxY: 210 },
        false
      );

      const mockKaboom: any = {
        width: () => 1280,
        height: () => 720,
        sprite: () => ({}),
        pos: (x: number, y: number) => ({ x, y }),
        area: () => ({}),
        anchor: () => ({}),
        rotate: () => ({}),
        scale: () => ({}),
        opacity: () => ({}),
        color: () => ({}),
        z: () => ({}),
        Rect: class {
          constructor(_pos: any, _w: number, _h: number) {}
        },
        dt: () => 0.016,
        time: () => 1.5,
        vec2: (x: number, y: number) => ({
          x,
          y,
          len: () => Math.sqrt(x * x + y * y),
          unit: () => ({ x: 0, y: 0 }),
          add: (other: any) => mockKaboom.vec2(x + other.x, y + other.y),
          scale: (s: number) => mockKaboom.vec2(x * s, y * s),
        }),
        deg2rad: (deg: number) => (deg * Math.PI) / 180,
        rad2deg: (rad: number) => (rad * 180) / Math.PI,
        clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
        lerp: (a: number, b: number, t: number) => a + (b - a) * t,
        isKeyDown: () => false,
        isKeyPressed: () => false,
        isKeyReleased: () => false,
        rand: (min: number) => min,
        camPos: () => ({ x: 0, y: 0 }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        add: () => ({
          pos: { x: 120, y: 200, add: (v: any) => ({ x: 120 + v.x, y: 200 + v.y }) },
          angle: 0,
          scale: { x: 1, y: 1 },
          opacity: 1,
          color: { r: 255, g: 255, b: 255 },
          play: () => {},
          move: () => {},
          onUpdate: () => {},
          onDestroy: () => {},
        }),
      };

      try {
        const player = createPlayer(mockKaboom, 120, false);
        (player.gameObj as unknown as { _triggerUpdate?: () => void })._triggerUpdate?.();
        expect(playSpy).toHaveBeenCalledWith("anticipation_open");
        expect(player.getAnimationState?.()).toBe("anticipation_open");

        // Não deve reiniciar anticipation_open em quadros consecutivos enquanto o krill segue na área
        const callsBeforeSecondFrame = playSpy.mock.calls.length;
        (player.gameObj as unknown as { _triggerUpdate?: () => void })._triggerUpdate?.();
        expect(playSpy.mock.calls.length).toBe(callsBeforeSecondFrame);

        // Colisão durante antecipação deve transitar imediatamente para feed
        player.consumeKrill();
        expect(playSpy).toHaveBeenCalledWith("feed");
        expect(player.getAnimationState?.()).toBe("feed");

        // Estado prioritário (rede/freeze) interrompe feed e anticipation_open
        player.freeze();
        (player.gameObj as unknown as { _triggerUpdate?: () => void })._triggerUpdate?.();
        expect(player.getAnimationState?.()).toBe("glide");

        // Ao descongelar e afastar/remover o krill, retorna ao nado normal
        grid.remove("krill_ahead");
        player.unfreeze();
        (player.gameObj as unknown as { _triggerUpdate?: () => void })._triggerUpdate?.();
        expect(playSpy).toHaveBeenCalledWith("idle_swim");
        expect(player.getAnimationState?.()).toBe("idle_swim");

        // Aprisionamento em rede também interrompe antecipação com prioridade
        grid.insert(
          "krill_ahead",
          { id: "krill_ahead", tag: TAGS.KRILL, exists: () => true },
          { minX: 195, minY: 190, maxX: 215, maxY: 210 },
          false
        );
        player.trapInNet(3);
        (player.gameObj as unknown as { _triggerUpdate?: () => void })._triggerUpdate?.();
        expect(player.getAnimationState?.()).toBe("glide");
      } finally {
        grid.clear();
        createControllerSpy.mockRestore();
      }
    });

    it("detecta krill à frente respeitando a direção do nado (direita vs esquerda)", async () => {
      const { createPlayer } = await import("../../src/entities/player");
      const { getSpriteSheetManager } =
        await import("../../src/engine/adapters/SpriteSheetManager");
      const { initSpatialGrid } = await import("../../src/systems/spatialHashGrid");
      const { TAGS } = await import("../../src/config");

      const playSpy = vi.fn();
      const manager = getSpriteSheetManager();
      const createControllerSpy = vi.spyOn(manager, "createAnimationController").mockReturnValue({
        play: playSpy,
        update: vi.fn(),
        stop: vi.fn(),
        getFrame: vi.fn(() => 0),
        setFrame: vi.fn(),
      } as unknown as ReturnType<typeof manager.createAnimationController>);

      const grid = initSpatialGrid({ cellSize: 256 });
      // Krill atrás da baleia (x = 40 quando baleia está em x = 120 virada para direita)
      grid.insert(
        "krill_left",
        { id: "krill_left", tag: TAGS.KRILL, exists: () => true },
        { minX: 30, minY: 190, maxX: 50, maxY: 210 },
        false
      );

      let leftKeyPressed = false;
      const mockKaboom: any = {
        width: () => 1280,
        height: () => 720,
        sprite: () => ({}),
        pos: (x: number, y: number) => ({ x, y }),
        area: () => ({}),
        anchor: () => ({}),
        rotate: () => ({}),
        scale: () => ({}),
        opacity: () => ({}),
        color: () => ({}),
        z: () => ({}),
        Rect: class {
          constructor(_pos: any, _w: number, _h: number) {}
        },
        dt: () => 0.016,
        time: () => 1.5,
        vec2: (x: number, y: number) => ({
          x,
          y,
          len: () => Math.sqrt(x * x + y * y),
          unit: () => ({ x: 0, y: 0 }),
          add: (other: any) => mockKaboom.vec2(x + other.x, y + other.y),
          scale: (s: number) => mockKaboom.vec2(x * s, y * s),
        }),
        deg2rad: (deg: number) => (deg * Math.PI) / 180,
        rad2deg: (rad: number) => (rad * 180) / Math.PI,
        clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
        lerp: (a: number, b: number, t: number) => a + (b - a) * t,
        isKeyDown: (key: string) => (key === "left" || key === "a" ? leftKeyPressed : false),
        isKeyPressed: () => false,
        isKeyReleased: () => false,
        rand: (min: number) => min,
        camPos: () => ({ x: 0, y: 0 }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        add: () => ({
          pos: { x: 120, y: 200, add: (v: any) => ({ x: 120 + v.x, y: 200 + v.y }) },
          angle: 0,
          scale: { x: 1, y: 1 },
          opacity: 1,
          color: { r: 255, g: 255, b: 255 },
          play: () => {},
          move: () => {},
          onUpdate: () => {},
          onDestroy: () => {},
        }),
      };

      try {
        const player = createPlayer(mockKaboom, 120, false);
        // Virada para a direita: krill atrás (x=40) NÃO deve acionar anticipation_open
        (player.gameObj as unknown as { _triggerUpdate?: () => void })._triggerUpdate?.();
        expect(player.getAnimationState?.()).toBe("idle_swim");

        // Virando para a esquerda: krill à frente (x=40) DEVE acionar anticipation_open
        leftKeyPressed = true;
        (player.gameObj as unknown as { _triggerUpdate?: () => void })._triggerUpdate?.();
        expect(player.getAnimationState?.()).toBe("anticipation_open");
      } finally {
        grid.clear();
        createControllerSpy.mockRestore();
      }
    });

    it("reutiliza buffers de rig, fatias e snapshot com equivalência numérica exata (zero alocação)", () => {
      const sliceBuffer: ReturnType<typeof executeWhaleRenderPipeline>["slices"] = [];
      const firstSnapshot = executeWhaleRenderPipeline(defaultParams, sliceBuffer);

      const nextParams = {
        ...defaultParams,
        bodyAngleInDegrees: -22,
        spineCurvatureInDegrees: 14,
        isMuscularStroke: true,
        strokeProgress: 0.4,
        timeInSeconds: 3.1,
        isFacingRight: false,
      };

      const unbufferedExpected = executeWhaleRenderPipeline(nextParams);
      const reusedSnapshot = executeWhaleRenderPipeline(
        nextParams,
        sliceBuffer,
        firstSnapshot.puppetRig,
        firstSnapshot
      );

      expect(reusedSnapshot).toBe(firstSnapshot);
      expect(reusedSnapshot.puppetRig).toBe(firstSnapshot.puppetRig);
      expect(reusedSnapshot.slices).toBe(sliceBuffer);
      expect(reusedSnapshot.puppetRig).toEqual(unbufferedExpected.puppetRig);
      expect(reusedSnapshot.slices).toEqual(unbufferedExpected.slices);
      expect(reusedSnapshot.palette).toEqual(unbufferedExpected.palette);
    });

    it("mantém paletas constantes congeladas e evita aliasing ao reter getRenderPipelineSnapshot entre quadros", async () => {
      const calmPalette = getWhaleBreathColor({ oxygenRatio: 0.9 });
      const faintPalette = getWhaleBreathColor({ oxygenRatio: 0, isFainting: true });
      expect(Object.isFrozen(calmPalette)).toBe(true);
      expect(Object.isFrozen(calmPalette.bodyColor)).toBe(true);
      expect(Object.isFrozen(faintPalette)).toBe(true);
      expect(Object.isFrozen(faintPalette.bodyColor)).toBe(true);

      const { createPlayer } = await import("../../src/entities/player");
      let currentTime = 1.0;
      const mockKaboom: any = {
        width: () => 1280,
        height: () => 720,
        sprite: () => ({}),
        pos: (x: number, y: number) => ({ x, y }),
        area: () => ({}),
        anchor: () => ({}),
        rotate: () => ({}),
        scale: () => ({}),
        opacity: () => ({}),
        color: () => ({}),
        z: () => ({}),
        Rect: class {
          constructor(_pos: any, _w: number, _h: number) {}
        },
        dt: () => 0.016,
        time: () => currentTime,
        vec2: (x: number, y: number) => ({
          x,
          y,
          len: () => Math.sqrt(x * x + y * y),
          unit: () => ({ x: 0, y: 0 }),
          add: (other: any) => mockKaboom.vec2(x + other.x, y + other.y),
          scale: (s: number) => mockKaboom.vec2(x * s, y * s),
        }),
        deg2rad: (deg: number) => (deg * Math.PI) / 180,
        rad2deg: (rad: number) => (rad * 180) / Math.PI,
        clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
        lerp: (a: number, b: number, t: number) => a + (b - a) * t,
        isKeyDown: () => false,
        isKeyPressed: () => false,
        isKeyReleased: () => false,
        rand: (min: number) => min,
        camPos: () => ({ x: 0, y: 0 }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        add: () => ({
          pos: { x: 120, y: 200, add: (v: any) => ({ x: 120 + v.x, y: 200 + v.y }) },
          angle: 0,
          scale: { x: 1, y: 1 },
          opacity: 1,
          color: { r: 255, g: 255, b: 255 },
          play: () => {},
          move: () => {},
          onUpdate: () => {},
          onDestroy: () => {},
        }),
      };

      const player = createPlayer(mockKaboom, 120, false);
      const snap1 = player.getRenderPipelineSnapshot!();
      currentTime = 2.5;
      player.update?.();
      const snap2 = player.getRenderPipelineSnapshot!();

      expect(snap1).not.toBe(snap2);
      expect(snap1?.timestamp).toBe(1);
      expect(snap2?.timestamp).toBe(2.5);
    });
  });
});
