import { describe, it, expect } from "vitest";
import {
  PixiContainerNode,
  PixiSpriteNode,
  PixiGraphicsNode,
  PixiTextNode,
  parseColor,
} from "../../src/engine/adapters/PixiNodes";
import { Sprite, Texture } from "pixi.js";

describe("PixiNodes Adapters", () => {
  describe("parseColor", () => {
    it("converte tuplas RGB [0..255] e [0..1] para instância Color", () => {
      const red255 = parseColor([255, 0, 0]);
      expect(red255.toHex()).toBe("#ff0000");

      const green1 = parseColor([0, 1, 0]);
      expect(green1.toHex()).toBe("#00ff00");
    });

    it("mantém suporte a números hex e strings CSS", () => {
      const hexNum = parseColor(0x0000ff);
      expect(hexNum.toHex()).toBe("#0000ff");

      const cssStr = parseColor("#ff00ff");
      expect(cssStr.toHex()).toBe("#ff00ff");
    });
  });

  describe("PixiContainerNode", () => {
    it("manipula posição, escala, rotação, opacidade e zIndex", () => {
      const node = new PixiContainerNode(undefined, "test_container");
      expect(node.id).toBe("test_container");

      node.setPosition(100, 200);
      expect(node.getPosition()).toEqual({ x: 100, y: 200 });

      node.setScale(2, 3);
      expect(node.getScale()).toEqual({ x: 2, y: 3 });

      node.setRotation(Math.PI / 2);
      expect(node.getRotation()).toBeCloseTo(Math.PI / 2, 4);

      node.setOpacity(0.5);
      expect(node.getOpacity()).toBe(0.5);

      node.setZIndex(15);
      expect(node.getZIndex()).toBe(15);

      expect(node.isVisible()).toBe(true);
      node.setVisible(false);
      expect(node.isVisible()).toBe(false);
    });

    it("gerencia hierarquia de nós filhos corretamente", () => {
      const parent = new PixiContainerNode();
      const childA = new PixiContainerNode();
      const childB = new PixiContainerNode();

      parent.addChild(childA);
      parent.addChild(childB);
      expect(parent.getChildren()).toHaveLength(2);

      parent.removeChild(childA);
      expect(parent.getChildren()).toHaveLength(1);
      expect(parent.getChildren()[0]).toBe(childB);

      parent.destroy();
      expect(parent.getChildren()).toHaveLength(0);
    });
  });

  describe("PixiSpriteNode", () => {
    it("manipula âncora, tamanho, tint e textureId", () => {
      const sprite = new Sprite(Texture.EMPTY);
      const spriteNode = new PixiSpriteNode(sprite, "player_whale");

      expect(spriteNode.getTextureId()).toBe("player_whale");

      spriteNode.setAnchor(0.5, 0.5);
      expect(spriteNode.getAnchor()).toEqual({ x: 0.5, y: 0.5 });

      spriteNode.setSize(120, 60);
      expect(spriteNode.getWidth()).toBe(120);
      expect(spriteNode.getHeight()).toBe(60);

      spriteNode.setTint(0xff5500);
      expect(spriteNode.getTint()).toBe(0xff5500);
    });
  });

  describe("PixiGraphicsNode", () => {
    it("desenha primitivas geométricas sem falhas", () => {
      const graphicsNode = new PixiGraphicsNode();

      expect(() => {
        graphicsNode.drawRect(0, 0, 100, 50, {
          fill: { color: [255, 0, 0], alpha: 0.8 },
          stroke: { color: 0xffffff, width: 2 },
        });

        graphicsNode.drawRoundedRect(10, 10, 80, 40, 8);
        graphicsNode.drawCircle(50, 50, 20);
        graphicsNode.drawPolygon([
          { x: 0, y: 0 },
          { x: 10, y: 20 },
          { x: 20, y: 0 },
        ]);
        graphicsNode.drawLine([
          { x: 0, y: 0 },
          { x: 50, y: 50 },
        ]);
        graphicsNode.clear();
      }).not.toThrow();
    });
  });

  describe("PixiTextNode", () => {
    it("inicializa com texto, estilos e sombreamento de contraste", () => {
      const textNode = new PixiTextNode("Micro Splash", {
        fontFamily: "Outfit",
        fontSize: 28,
        color: 0x5ce1e6,
        align: "center",
        shadow: {
          color: 0x000000,
          offsetX: 2,
          offsetY: 4,
          blur: 3,
          alpha: 0.9,
        },
      });

      expect(textNode.getText()).toBe("Micro Splash");
      textNode.setText("Game Over");
      expect(textNode.getText()).toBe("Game Over");

      expect(textNode.getFontSize()).toBe(28);
      textNode.setFontSize(32);
      expect(textNode.getFontSize()).toBe(32);

      expect(textNode.getAlign()).toBe("center");
      textNode.setAlign("left");
      expect(textNode.getAlign()).toBe("left");

      textNode.setColor(0xffffff);
      expect(textNode.getColor()).toBe(0xffffff);
    });
  });
});
