/**
 * Sistema de Textura Pré-Gerada e Overlay de Rede de Pesca 16-Bits (Fase 68 / Etapa 2).
 *
 * Gera proceduralmente uma trama de rede de pesca 16-bits com nós, boias e chumbos,
 * realizando pre-bake imediato via generateTexture com scaleMode 'nearest' e resolução 0.5.
 * Elimina qualquer Graphics vivo ou mutação rosa por frame (Zero-Overhead).
 */

import type { PlayerGameObject } from "./types";

export interface NetOverlayEngineContext {
  createGraphics?(id?: string): unknown;
  generateTexture?(
    target: unknown,
    options?: { resolution?: number; scaleMode?: "nearest" | "linear" }
  ): unknown;
  createSprite?(texture: unknown, id?: string): unknown;
  getStageRoot?(): unknown;
  destroy?(obj: unknown): void;
}

export interface NetOverlaySpriteNode {
  visible?: boolean;
  setVisible?(visible: boolean): void;
  setPosition?(x: number, y: number): void;
  setRotation?(angleInRadians: number): void;
  setScale?(scaleX: number, scaleY: number): void;
  setAnchor?(anchorX: number, anchorY: number): void;
  setZIndex?(index: number): void;
  destroy?(): void;
  getNativeNode?<T>(): T;
  [key: string]: unknown;
}

export interface WhaleNetOverlayController {
  readonly netOverlaySprite: NetOverlaySpriteNode | null;
  update(isTrapped: boolean, baleia: PlayerGameObject, isFacingRight: boolean): void;
  destroy(): void;
}

/** Paleta cromática autêntica de rede 16-bits */
export const NET_16BIT_PALETTE = {
  NYLON_LIGHT: 0xd2b48c, // Tom de corda / nylon claro
  NYLON_DARK: 0x8b7355, // Tom de corda / nylon sombreado
  FLOAT_BODY: 0xd2b48c, // Boia de cortiça / madeira
  FLOAT_ACCENT: 0xe58030, // Destaque alaranjado na boia
  SINKER_LEAD: 0x5a626a, // Chumbo / peso escuro
  SINKER_SPECULAR: 0x8a929a, // Reflexo metálico no chumbo
} as const;

/**
 * Desenha proceduralmente a trama de rede 16-bits em um Graphics temporário.
 */
export function drawRetro16BitNetMesh(gfx: any): void {
  const minX = -54;
  const maxX = 54;
  const minY = -21;
  const maxY = 21;
  const step = 10;

  // 1. Linhas diagonais cruzadas (Passo 1: Sombra / corda escura 0x8B7355)
  if (typeof gfx.drawLine === "function") {
    // Diagonais +45° (y - x = offset)
    for (let offset = -70; offset <= 70; offset += step) {
      const y1 = minY;
      const x1 = Math.max(minX, Math.min(maxX, y1 + offset));
      const y2 = maxY;
      const x2 = Math.max(minX, Math.min(maxX, y2 + offset));
      const isOutsideBoundary = (x1 === minX && x2 === minX) || (x1 === maxX && x2 === maxX);
      if (!isOutsideBoundary) {
        gfx.drawLine(
          [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          ],
          { color: NET_16BIT_PALETTE.NYLON_DARK, width: 1.5, alpha: 0.9 }
        );
      }
    }

    // Diagonais -45° (y + x = offset)
    for (let offset = -70; offset <= 70; offset += step) {
      const y1 = minY;
      const x1 = Math.max(minX, Math.min(maxX, offset - y1));
      const y2 = maxY;
      const x2 = Math.max(minX, Math.min(maxX, offset - y2));
      const isOutsideBoundary = (x1 === minX && x2 === minX) || (x1 === maxX && x2 === maxX);
      if (!isOutsideBoundary) {
        gfx.drawLine(
          [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          ],
          { color: NET_16BIT_PALETTE.NYLON_DARK, width: 1.5, alpha: 0.9 }
        );
      }
    }

    // Passo 2: Trama principal de nylon claro (0xD2B48C)
    for (let offset = -70; offset <= 70; offset += step) {
      const y1 = minY;
      const x1 = Math.max(minX, Math.min(maxX, y1 + offset));
      const y2 = maxY;
      const x2 = Math.max(minX, Math.min(maxX, y2 + offset));
      const isOutsideBoundary = (x1 === minX && x2 === minX) || (x1 === maxX && x2 === maxX);
      if (!isOutsideBoundary) {
        gfx.drawLine(
          [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          ],
          { color: NET_16BIT_PALETTE.NYLON_LIGHT, width: 1.0, alpha: 1.0 }
        );
      }
    }

    for (let offset = -70; offset <= 70; offset += step) {
      const y1 = minY;
      const x1 = Math.max(minX, Math.min(maxX, offset - y1));
      const y2 = maxY;
      const x2 = Math.max(minX, Math.min(maxX, offset - y2));
      const isOutsideBoundary = (x1 === minX && x2 === minX) || (x1 === maxX && x2 === maxX);
      if (!isOutsideBoundary) {
        gfx.drawLine(
          [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          ],
          { color: NET_16BIT_PALETTE.NYLON_LIGHT, width: 1.0, alpha: 1.0 }
        );
      }
    }
  }

  // 2. Pequenos nós nos cruzamentos das linhas diagonais
  if (typeof gfx.drawCircle === "function" || typeof gfx.drawRect === "function") {
    for (let offset1 = -60; offset1 <= 60; offset1 += step * 2) {
      for (let offset2 = -60; offset2 <= 60; offset2 += step * 2) {
        const intersectionX = (offset2 - offset1) / 2;
        const intersectionY = (offset2 + offset1) / 2;

        if (
          intersectionX >= minX + 2 &&
          intersectionX <= maxX - 2 &&
          intersectionY >= minY + 2 &&
          intersectionY <= maxY - 2
        ) {
          if (typeof gfx.drawCircle === "function") {
            gfx.drawCircle(intersectionX, intersectionY, 1.4, {
              fill: { color: NET_16BIT_PALETTE.NYLON_DARK, alpha: 1.0 },
            });
          }
          if (typeof gfx.drawRect === "function") {
            gfx.drawRect(intersectionX - 0.5, intersectionY - 0.5, 1, 1, {
              fill: { color: NET_16BIT_PALETTE.NYLON_LIGHT, alpha: 1.0 },
            });
          }
        }
      }
    }
  }

  // 3. Boias discretas na borda superior
  const floatPositionsX = [-45, -27, -9, 9, 27, 45];
  for (let index = 0; index < floatPositionsX.length; index++) {
    const floatX = floatPositionsX[index];
    if (typeof gfx.drawRoundedRect === "function") {
      gfx.drawRoundedRect(floatX - 3, minY - 2, 6, 4, 1.5, {
        fill: { color: NET_16BIT_PALETTE.FLOAT_BODY, alpha: 1.0 },
        stroke: { color: NET_16BIT_PALETTE.NYLON_DARK, width: 1.0 },
      });
    } else if (typeof gfx.drawRect === "function") {
      gfx.drawRect(floatX - 3, minY - 2, 6, 4, {
        fill: { color: NET_16BIT_PALETTE.FLOAT_BODY, alpha: 1.0 },
      });
    }

    if (typeof gfx.drawRect === "function") {
      gfx.drawRect(floatX - 1, minY - 1, 2, 2, {
        fill: { color: NET_16BIT_PALETTE.FLOAT_ACCENT, alpha: 1.0 },
      });
    }
  }

  // 4. Chumbos discretos na borda inferior
  const sinkerPositionsX = [-40, -20, 0, 20, 40];
  for (let index = 0; index < sinkerPositionsX.length; index++) {
    const sinkerX = sinkerPositionsX[index];
    if (typeof gfx.drawCircle === "function") {
      gfx.drawCircle(sinkerX, maxY - 1, 2.0, {
        fill: { color: NET_16BIT_PALETTE.SINKER_LEAD, alpha: 1.0 },
      });
      gfx.drawCircle(sinkerX, maxY - 1.5, 0.9, {
        fill: { color: NET_16BIT_PALETTE.SINKER_SPECULAR, alpha: 0.9 },
      });
    } else if (typeof gfx.drawRect === "function") {
      gfx.drawRect(sinkerX - 1.5, maxY - 2, 3, 3, {
        fill: { color: NET_16BIT_PALETTE.SINKER_LEAD, alpha: 1.0 },
      });
    }
  }
}

/**
 * Cria a textura 16-bits estática pré-gerada (bake imediato e descarte de Graphics).
 */
export function create16BitNetTexture(engineContext: NetOverlayEngineContext): unknown | null {
  if (
    !engineContext ||
    typeof engineContext.createGraphics !== "function" ||
    typeof engineContext.generateTexture !== "function"
  ) {
    return null;
  }

  try {
    const tempGfx = engineContext.createGraphics("whale_net_mesh_bake") as {
      destroy?: () => void;
      [key: string]: unknown;
    };
    drawRetro16BitNetMesh(tempGfx);

    const bakedTexture = engineContext.generateTexture(tempGfx, {
      resolution: 0.5,
      scaleMode: "nearest",
    });

    if (typeof tempGfx.destroy === "function") {
      tempGfx.destroy();
    }

    return bakedTexture ?? null;
  } catch {
    return null;
  }
}

/**
 * Inicializa o Sprite de Overlay de Rede 16-bits acoplado ao container da baleia.
 */
export function setupWhaleNetOverlay(
  engineContext: NetOverlayEngineContext,
  baleia: PlayerGameObject
): WhaleNetOverlayController {
  let netOverlaySprite: NetOverlaySpriteNode | null = null;
  let isChildAttachedToContainer = false;

  // 1. Tenta pré-bake da textura 16-bits via IRenderEngine
  const bakedTexture = create16BitNetTexture(engineContext);

  if (bakedTexture && typeof engineContext.createSprite === "function") {
    try {
      const spriteNode = engineContext.createSprite(
        bakedTexture,
        "whale_net_overlay"
      ) as NetOverlaySpriteNode;

      if (typeof spriteNode.setAnchor === "function") {
        spriteNode.setAnchor(0.5, 0.5);
      }
      if (typeof spriteNode.setVisible === "function") {
        spriteNode.setVisible(false);
      }
      spriteNode.visible = false;

      if (typeof spriteNode.setZIndex === "function") {
        spriteNode.setZIndex(5);
      }

      // Tenta acoplar diretamente como filho do container da baleia (Pixi)
      const nativeBaleia =
        typeof (baleia as any).getNativeNode === "function"
          ? (baleia as any).getNativeNode()
          : (baleia as any);

      if (nativeBaleia && typeof nativeBaleia.addChild === "function") {
        const nativeSprite =
          typeof spriteNode.getNativeNode === "function"
            ? spriteNode.getNativeNode()
            : spriteNode;
        nativeBaleia.addChild(nativeSprite);
        isChildAttachedToContainer = true;
      } else if (typeof (baleia as any).addChild === "function") {
        (baleia as any).addChild(spriteNode);
        isChildAttachedToContainer = true;
      } else if (typeof engineContext.getStageRoot === "function") {
        const stageRoot = engineContext.getStageRoot() as { addChild?: (node: unknown) => void };
        if (stageRoot && typeof stageRoot.addChild === "function") {
          stageRoot.addChild(spriteNode);
        }
      }

      netOverlaySprite = spriteNode;
    } catch {
      netOverlaySprite = null;
    }
  }

  // Fallback para Kaboom child object ou mock em testes caso não haja engine Pixi ativa
  if (!netOverlaySprite) {
    const fallbackSprite: NetOverlaySpriteNode = {
      visible: false,
      setVisible(isVisible: boolean) {
        this.visible = isVisible;
      },
      setPosition(_x: number, _y: number) {},
      setRotation(_angle: number) {},
      setScale(_sx: number, _sy: number) {},
      destroy() {
        this.visible = false;
      },
    };

    if (typeof (baleia as any).add === "function") {
      try {
        const kaboomChild = (baleia as any).add([
          {
            id: "netOverlaySprite",
            hidden: true,
          },
        ]);
        if (kaboomChild) {
          fallbackSprite.destroy = () => {
            if (typeof kaboomChild.destroy === "function") {
              kaboomChild.destroy();
            }
          };
          const originalSetVisible = fallbackSprite.setVisible;
          fallbackSprite.setVisible = function (isVisible: boolean) {
            this.visible = isVisible;
            kaboomChild.hidden = !isVisible;
            if (originalSetVisible) originalSetVisible.call(this, isVisible);
          };
        }
      } catch {
        // Mock seguro
      }
    }

    netOverlaySprite = fallbackSprite;
  }

  // Acopla referência pública na baleia
  (baleia as any).netOverlaySprite = netOverlaySprite;

  function update(
    isTrapped: boolean,
    targetWhale: PlayerGameObject,
    isFacingRight: boolean
  ): void {
    if (!netOverlaySprite) return;

    const currentlyVisible = netOverlaySprite.visible ?? false;
    if (currentlyVisible !== isTrapped) {
      netOverlaySprite.visible = isTrapped;
      if (typeof netOverlaySprite.setVisible === "function") {
        netOverlaySprite.setVisible(isTrapped);
      }
    }

    // Se o sprite não for filho direto do container da baleia no grafo de cena,
    // sincroniza posição, rotação e escala
    if (isTrapped && !isChildAttachedToContainer) {
      if (typeof netOverlaySprite.setPosition === "function" && targetWhale.pos) {
        netOverlaySprite.setPosition(targetWhale.pos.x, targetWhale.pos.y);
      }

      if (typeof netOverlaySprite.setRotation === "function" && typeof targetWhale.angle === "number") {
        netOverlaySprite.setRotation((targetWhale.angle * Math.PI) / 180);
      }

      if (typeof netOverlaySprite.setScale === "function") {
        const facingMultiplier = isFacingRight ? 1 : -1;
        const scaleX = ((targetWhale.scale as { x?: number })?.x ?? 1) * facingMultiplier;
        const scaleY = (targetWhale.scale as { y?: number })?.y ?? 1;
        netOverlaySprite.setScale(scaleX, scaleY);
      }
    }
  }

  function destroy(): void {
    if (netOverlaySprite && typeof netOverlaySprite.destroy === "function") {
      netOverlaySprite.destroy();
    }
    netOverlaySprite = null;
    (baleia as any).netOverlaySprite = null;
  }

  return {
    get netOverlaySprite() {
      return netOverlaySprite;
    },
    update,
    destroy,
  };
}
