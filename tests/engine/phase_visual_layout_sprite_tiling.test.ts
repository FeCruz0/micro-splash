import { describe, it, expect, beforeEach } from "vitest";
import { Texture } from "pixi.js";
import {
  SpriteSheetManager,
  setSpriteSheetManager,
} from "../../src/engine/adapters/SpriteSheetManager";
import { RenderEngineAdapter } from "../../src/engine/adapters/RenderEngineAdapter";
import {
  createRenderingContext,
  calculateOriginOffset,
  resolveAnchorCoordinates,
} from "../../src/engine/adapters/RenderingContextAdapter";
import { SceneManager } from "../../src/engine/SceneManager";
import { PixiSpriteNode, PixiTextNode } from "../../src/engine/adapters/PixiNodes";

describe("Correção de Layout Visual e Repetição de Sprites (PixiJS v8)", () => {
  let spriteSheetManager: SpriteSheetManager;

  beforeEach(() => {
    spriteSheetManager = new SpriteSheetManager();
    setSpriteSheetManager(spriteSheetManager);
  });

  describe("SpriteSheetManager e Particionamento de Atlas de Fauna", () => {
    it("registra e recupera os descritores canônicos de fauna (baleia, orca_bg, jubarte_bg, cachalote_bg)", () => {
      expect(spriteSheetManager.hasAtlasDescriptor("baleia")).toBe(true);
      expect(spriteSheetManager.hasAtlasDescriptor("orca_bg")).toBe(true);
      expect(spriteSheetManager.hasAtlasDescriptor("jubarte_bg")).toBe(true);
      expect(spriteSheetManager.hasAtlasDescriptor("cachalote_bg")).toBe(true);

      const whaleDescriptor = spriteSheetManager.getAtlasDescriptor("baleia");
      expect(whaleDescriptor?.sliceCountX).toBe(16);
      expect(whaleDescriptor?.sliceCountY).toBe(1);
    });

    it("fatia uma textura de spritesheet de 16 frames em 16 sub-texturas independentes", () => {
      // Simula uma textura base 2048x64 px (16 frames de 128x64 px)
      const mockBaseTexture = {
        source: {
          width: 2048,
          height: 64,
        },
      } as unknown as Texture;

      const slicedFrames = spriteSheetManager.sliceAtlasTexture("baleia", mockBaseTexture);

      expect(slicedFrames.length).toBe(16);
      expect(slicedFrames[0].frame.x).toBe(0);
      expect(slicedFrames[0].frame.y).toBe(0);
      expect(slicedFrames[0].frame.width).toBe(128);
      expect(slicedFrames[0].frame.height).toBe(64);

      expect(slicedFrames[1].frame.x).toBe(128);
      expect(slicedFrames[15].frame.x).toBe(15 * 128);
    });

    it("controlador de animação avança frames no tempo e respeita loops", () => {
      const mockBaseTexture = {
        source: {
          width: 2048,
          height: 64,
        },
      } as unknown as Texture;
      spriteSheetManager.sliceAtlasTexture("baleia", mockBaseTexture);

      const updatedTexturesList: Texture[] = [];
      const mockSpriteNode = {
        setTexture: (tex: Texture) => {
          updatedTexturesList.push(tex);
        },
      } as unknown as PixiSpriteNode;

      const controller = spriteSheetManager.createAnimationController(
        mockSpriteNode,
        "baleia",
        "idle_swim"
      );
      expect(controller).not.toBeNull();

      // idle_swim: frameStart: 1, frameEnd: 4, speed: 4
      expect(controller?.getFrame()).toBe(1);

      // Avança 0.25 segundos (1 frame a 4 FPS) -> frame 2
      controller?.update(0.25);
      expect(controller?.getFrame()).toBe(2);

      // Avança mais 0.25 segundos -> frame 3
      controller?.update(0.25);
      expect(controller?.getFrame()).toBe(3);

      // Avança mais 0.5 segundos -> loop de volta ao frame 1
      controller?.update(0.5);
      expect(controller?.getFrame()).toBe(1);
      expect(updatedTexturesList.length).toBeGreaterThan(0);
    });
  });

  describe("Cálculos de Geometria, Âncoras e Offsets de Origem", () => {
    it("resolve coordenadas de âncora para todos os pontos cardeais suportados", () => {
      expect(resolveAnchorCoordinates("center")).toEqual({ anchorX: 0.5, anchorY: 0.5 });
      expect(resolveAnchorCoordinates("topleft")).toEqual({ anchorX: 0, anchorY: 0 });
      expect(resolveAnchorCoordinates("top")).toEqual({ anchorX: 0.5, anchorY: 0 });
      expect(resolveAnchorCoordinates("topright")).toEqual({ anchorX: 1, anchorY: 0 });
      expect(resolveAnchorCoordinates("left")).toEqual({ anchorX: 0, anchorY: 0.5 });
      expect(resolveAnchorCoordinates("right")).toEqual({ anchorX: 1, anchorY: 0.5 });
      expect(resolveAnchorCoordinates("botleft")).toEqual({ anchorX: 0, anchorY: 1 });
      expect(resolveAnchorCoordinates("botright")).toEqual({ anchorX: 1, anchorY: 1 });
      expect(resolveAnchorCoordinates("bottom")).toEqual({ anchorX: 0.5, anchorY: 1 });
    });

    it("calcula offsets de origem precisos para retângulos e botões", () => {
      const buttonWidth = 430;
      const buttonHeight = 48;

      const centerOffset = calculateOriginOffset("center", buttonWidth, buttonHeight);
      expect(centerOffset).toEqual({ originX: -215, originY: -24 });

      const topLeftOffset = calculateOriginOffset("topleft", buttonWidth, buttonHeight);
      expect(topLeftOffset).toEqual({ originX: 0, originY: 0 });

      const botRightOffset = calculateOriginOffset("botright", buttonWidth, buttonHeight);
      expect(botRightOffset).toEqual({ originX: -430, originY: -48 });
    });
  });

  describe("Nós de Renderização e Adaptação de Âncora (PixiNodes)", () => {
    it("PixiTextNode aplica e retorna âncora corretamente", () => {
      const textNode = new PixiTextNode("MICRO SPLASH", { fontSize: 58 });
      expect(textNode.getAnchor()).toEqual({ x: 0, y: 0 });

      textNode.setAnchor(0.5, 0.5);
      expect(textNode.getAnchor()).toEqual({ x: 0.5, y: 0.5 });

      textNode.setAnchor(1, 1);
      expect(textNode.getAnchor()).toEqual({ x: 1, y: 1 });
    });

    it("PixiSpriteNode permite obter e atualizar texturas de animação", () => {
      const spriteNode = new PixiSpriteNode(undefined as never, "baleia");
      expect(typeof spriteNode.setTexture).toBe("function");
      expect(typeof spriteNode.getTexture).toBe("function");

      const testTexture = Texture.WHITE;
      spriteNode.setTexture(testTexture);
      expect(spriteNode.getTexture()).toBe(testTexture);
    });
  });

  describe("RenderingContextAdapter — Integração de nós de UI e Sprites Animados", () => {
    it("cria entidades com âncora centralizada e dimensões consistentes", () => {
      const renderEngine = new RenderEngineAdapter();
      const sceneManager = new SceneManager();
      const context = createRenderingContext(renderEngine, sceneManager);

      const titleEntity = context.add([
        context.text("MICRO SPLASH", { size: 58 }),
        context.pos(960, 315),
        context.anchor("center"),
        context.fixed(),
      ]);

      expect(titleEntity.pos.x).toBe(960);
      expect(titleEntity.pos.y).toBe(315);
      expect(titleEntity.text).toBe("MICRO SPLASH");

      const buttonEntity = context.add([
        context.rect(430, 48, { radius: 11 }),
        context.pos(960, 482),
        context.anchor("center"),
        context.fixed(),
      ]);

      expect(buttonEntity.width).toBe(430);
      buttonEntity.width = 450;
      expect(buttonEntity.width).toBe(450);

      const circleEntity = context.add([
        context.circle(20),
        context.pos(100, 100),
        context.fixed(),
      ]);

      expect(circleEntity.radius).toBe(20);
      circleEntity.radius = 35;
      expect(circleEntity.radius).toBe(35);
    });
  });
});
