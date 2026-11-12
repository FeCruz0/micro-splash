/**
 * Renderizador procedural e gerador de nuvens para o ceu em paralaxe.
 */

import type {
  IRenderEngine,
  IRenderNode,
  IGraphicsNode,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveInitializedRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import type { SkyRenderObject, LegacyParallaxSkyEngineContext } from "./skyTypes";
import { PixiSkyNodeProxy } from "./pixiSkyNodeProxy";

// Paleta 16-bits canonica para nuvens oceanicas (SKILL.md)
export const CLOUD_PALETTE_BASE_HEX = 0xcfe2f3; // Base sombreada celeste (0xCFE2F3)
export const CLOUD_PALETTE_TOP_HEX = 0xffffff; // Topo iluminado solar (0xFFFFFF)
export const CLOUD_PALETTE_BASE_RGB: [number, number, number] = [207, 226, 243];
export const CLOUD_PALETTE_TOP_RGB: [number, number, number] = [255, 255, 255];

export function drawRetro16BitCloud(
  gfx: IGraphicsNode,
  width: number,
  height: number,
  puffs: number
): void {
  const baseHeight = height * 0.65;
  const baseOffset = height * 0.35;
  const baseRadius = baseHeight / 2;

  // 1. Camada Base Sombreada Celeste (0xCFE2F3) - volume e base plana arredondada
  gfx.drawRoundedRect(0, baseOffset, width, baseHeight, baseRadius, {
    fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
  });

  if (puffs === 4) {
    gfx.drawCircle(width * 0.2, height * 0.48, height * 0.42, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.42, height * 0.34, height * 0.54, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.66, height * 0.38, height * 0.48, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.82, height * 0.52, height * 0.38, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
  } else {
    gfx.drawCircle(width * 0.26, height * 0.48, height * 0.44, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.52, height * 0.35, height * 0.54, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.76, height * 0.5, height * 0.42, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
  }

  // 2. Camada Topo Iluminado (0xFFFFFF) - volume iluminado pela luz solar superior
  const topHeight = height * 0.48;
  const topOffset = height * 0.22;
  const topInset = height * 0.1;
  gfx.drawRoundedRect(topInset, topOffset, width - topInset * 2, topHeight, topHeight / 2, {
    fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
  });

  if (puffs === 4) {
    gfx.drawCircle(width * 0.2, height * 0.42, height * 0.36, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.42, height * 0.28, height * 0.48, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.66, height * 0.32, height * 0.42, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.82, height * 0.46, height * 0.32, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
  } else {
    gfx.drawCircle(width * 0.26, height * 0.42, height * 0.38, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.52, height * 0.29, height * 0.48, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.76, height * 0.44, height * 0.36, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
  }
}

export function createCloudObject(
  engineOrContext: IRenderEngine | unknown,
  options: {
    width: number;
    height: number;
    baseY: number;
    puffs: number;
    textureCache: Map<string, unknown>;
  }
): SkyRenderObject {
  const resolvedRenderEngine = resolveInitializedRenderEngine(engineOrContext);
  if (resolvedRenderEngine) {
    const { width, height, baseY, puffs, textureCache } = options;
    const cacheKey = `${width}_${height}_${puffs}`;

    const gfx = resolvedRenderEngine.createGraphics("sky_cloud");
    drawRetro16BitCloud(gfx, width, height, puffs);

    let bakedTexture: unknown = textureCache.get(cacheKey) ?? null;
    if (!bakedTexture) {
      if (typeof resolvedRenderEngine.generateTexture === "function") {
        bakedTexture = resolvedRenderEngine.generateTexture(gfx, {
          resolution: 0.5,
          scaleMode: "nearest",
        });
      } else {
        const renderer =
          typeof resolvedRenderEngine.getRenderer === "function"
            ? (resolvedRenderEngine.getRenderer() as {
                generateTexture?: (opts: unknown) => unknown;
              })
            : null;
        if (renderer && typeof renderer.generateTexture === "function") {
          const nativeGfx = typeof gfx.getNativeNode === "function" ? gfx.getNativeNode() : gfx;
          try {
            bakedTexture = renderer.generateTexture({
              target: nativeGfx,
              resolution: 0.5,
              scaleMode: "nearest",
            });
          } catch {
            bakedTexture = null;
          }
        }
      }
      if (bakedTexture) {
        textureCache.set(cacheKey, bakedTexture);
      }
    }

    let renderNode: IRenderNode = gfx;
    if (bakedTexture && typeof resolvedRenderEngine.createSprite === "function") {
      try {
        const spriteNode = resolvedRenderEngine.createSprite(bakedTexture, "sky_cloud");
        const nativeSprite = spriteNode.getNativeNode<{
          roundPixels?: boolean;
          cullable?: boolean;
          eventMode?: string;
        }>();
        if (nativeSprite) {
          nativeSprite.roundPixels = true;
          nativeSprite.cullable = true;
          nativeSprite.eventMode = "none";
        }
        renderNode = spriteNode;
        gfx.destroy();
      } catch {
        renderNode = gfx;
      }
    }

    renderNode.setPosition(0, baseY);
    renderNode.setZIndex(-8);
    renderNode.setOpacity(1);
    resolveWorldRenderContainer(resolvedRenderEngine).addChild(renderNode);

    const comps: unknown[] = [
      "sky_cloud",
      {
        type: "rect",
        w: width,
        h: height,
        opts: { radius: height / 2 },
      },
    ];

    return new PixiSkyNodeProxy(renderNode, ["sky_cloud"], comps);
  }

  const legacyEngineContext = engineOrContext as LegacyParallaxSkyEngineContext;

  // Legacy Kaboom engine: silhueta blocada em 2 camadas (base celeste + topo iluminado)
  const rawCloud = legacyEngineContext.add([
    legacyEngineContext.rect(options.width, options.height, { radius: options.height / 2 }),
    legacyEngineContext.pos(0, options.baseY),
    legacyEngineContext.color(
      CLOUD_PALETTE_BASE_RGB[0],
      CLOUD_PALETTE_BASE_RGB[1],
      CLOUD_PALETTE_BASE_RGB[2]
    ),
    legacyEngineContext.opacity(1),
    legacyEngineContext.z(-8),
    "sky_cloud",
  ]) as SkyRenderObject;

  const cloudObj = rawCloud as unknown as { add?: (components: unknown[]) => void };
  if (typeof cloudObj.add === "function") {
    cloudObj.add([
      legacyEngineContext.rect(options.width - 6, options.height * 0.55, {
        radius: (options.height * 0.55) / 2,
      }),
      legacyEngineContext.pos(3, 0),
      legacyEngineContext.color(
        CLOUD_PALETTE_TOP_RGB[0],
        CLOUD_PALETTE_TOP_RGB[1],
        CLOUD_PALETTE_TOP_RGB[2]
      ),
      legacyEngineContext.opacity(1),
      legacyEngineContext.z(-7.9),
    ]);
  }

  return rawCloud;
}
