/**
 * Criador e gerenciador de objetos primitivos e de bake estatico para o ceu.
 */

import type { IRenderEngine, IRenderNode } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveInitializedRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import type { SkyRenderObject, LegacyParallaxSkyEngineContext } from "./skyTypes";
import { PixiSkyNodeProxy } from "./pixiSkyNodeProxy";

export function createSkyObject(
  engineOrContext: IRenderEngine | unknown,
  options: {
    tag: string;
    type: "rect" | "circle" | "polygon";
    x: number;
    y: number;
    zIndex: number;
    color: [number, number, number];
    opacity: number;
    width?: number;
    height?: number;
    radius?: number;
    points?: readonly { x: number; y: number }[];
    textureCache?: Map<string, unknown>;
  }
): SkyRenderObject {
  const resolvedRenderEngine = resolveInitializedRenderEngine(engineOrContext);
  if (resolvedRenderEngine) {
    const isPlainRect =
      options.type === "rect" &&
      (!options.radius || options.radius <= 0) &&
      options.width !== undefined &&
      options.height !== undefined;

    // Retangulos planos: instanciar como Sprite com zero overhead
    if (isPlainRect && typeof resolvedRenderEngine.createSprite === "function") {
      const sprite = resolvedRenderEngine.createSprite("white", options.tag);
      sprite.setPosition(options.x, options.y);
      if (typeof sprite.setSize === "function") {
        sprite.setSize(options.width ?? 1, options.height ?? 1);
      }
      sprite.setZIndex(options.zIndex);
      sprite.setOpacity(options.opacity);
      const colorNum =
        ((options.color[0] & 0xff) << 16) |
        ((options.color[1] & 0xff) << 8) |
        (options.color[2] & 0xff);
      if (typeof sprite.setTint === "function") {
        sprite.setTint(colorNum);
      }

      const nativeSprite = sprite.getNativeNode<{
        roundPixels?: boolean;
        cullable?: boolean;
        eventMode?: string;
      }>();
      if (nativeSprite) {
        nativeSprite.roundPixels = true;
        nativeSprite.cullable = true;
        nativeSprite.eventMode = "none";
      }

      resolveWorldRenderContainer(resolvedRenderEngine).addChild(sprite);

      const comps: unknown[] = [
        options.tag,
        {
          type: "rect",
          w: options.width,
          h: options.height,
        },
      ];
      return new PixiSkyNodeProxy(
        sprite,
        [options.tag],
        comps,
        options.x,
        options.y,
        options.opacity
      );
    }

    // Circulos, retangulos arredondados e poligonos: bake estatico de textura
    const cacheKey = `${options.tag}_${options.type}_${options.radius ?? 0}_${options.width ?? 0}_${options.height ?? 0}`;
    let bakedTexture: unknown = options.textureCache?.get(cacheKey) ?? null;

    const gfx = resolvedRenderEngine.createGraphics(options.tag);
    if (options.type === "circle" && options.radius !== undefined) {
      gfx.drawCircle(0, 0, options.radius, {
        fill: { color: options.color, alpha: 1 },
      });
    } else if (
      options.type === "rect" &&
      options.width !== undefined &&
      options.height !== undefined
    ) {
      if (options.radius !== undefined && options.radius > 0) {
        gfx.drawRoundedRect(0, 0, options.width, options.height, options.radius, {
          fill: { color: options.color, alpha: 1 },
        });
      } else {
        gfx.drawRect(0, 0, options.width, options.height, {
          fill: { color: options.color, alpha: 1 },
        });
      }
    } else if (options.type === "polygon" && options.points) {
      gfx.drawPolygon(options.points, {
        fill: { color: options.color, alpha: 1 },
      });
    }

    if (!bakedTexture && options.textureCache) {
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
        options.textureCache.set(cacheKey, bakedTexture);
      }
    }

    let renderNode: IRenderNode = gfx;
    if (bakedTexture && typeof resolvedRenderEngine.createSprite === "function") {
      try {
        const sprite = resolvedRenderEngine.createSprite(bakedTexture, options.tag);
        const nativeSprite = sprite.getNativeNode<{
          roundPixels?: boolean;
          cullable?: boolean;
          eventMode?: string;
        }>();
        if (nativeSprite) {
          nativeSprite.roundPixels = true;
          nativeSprite.cullable = true;
          nativeSprite.eventMode = "none";
        }
        renderNode = sprite;
        gfx.destroy();
      } catch {
        renderNode = gfx;
      }
    }

    renderNode.setPosition(options.x, options.y);
    renderNode.setZIndex(options.zIndex);
    renderNode.setOpacity(options.opacity);
    resolveWorldRenderContainer(resolvedRenderEngine).addChild(renderNode);

    const comps: unknown[] = [
      options.tag,
      options.type === "rect"
        ? {
            type: "rect",
            w: options.width,
            h: options.height,
            opts: {
              radius: options.radius ?? (options.height ? options.height / 2 : undefined),
            },
          }
        : null,
      options.type === "circle" ? { type: "circle", r: options.radius } : null,
      options.type === "polygon" ? { type: "polygon", pts: options.points } : null,
    ].filter(Boolean);

    return new PixiSkyNodeProxy(
      renderNode,
      [options.tag],
      comps,
      options.x,
      options.y,
      options.opacity
    );
  }

  // Legacy Kaboom engine
  const legacyEngineContext = engineOrContext as LegacyParallaxSkyEngineContext;
  const comps: unknown[] = [
    options.type === "circle" ? legacyEngineContext.circle(options.radius ?? 1) : null,
    options.type === "rect"
      ? legacyEngineContext.rect(
          options.width ?? 10,
          options.height ?? 10,
          options.radius !== undefined
            ? { radius: options.radius ?? (options.height ? options.height / 2 : undefined) }
            : undefined
        )
      : null,
    options.type === "polygon" && options.points
      ? legacyEngineContext.polygon(options.points)
      : null,
    legacyEngineContext.pos(options.x, options.y),
    legacyEngineContext.color(options.color[0], options.color[1], options.color[2]),
    legacyEngineContext.opacity(options.opacity),
    legacyEngineContext.z(options.zIndex),
    options.tag,
  ].filter(Boolean);

  const rawObj = legacyEngineContext.add(comps) as SkyRenderObject;
  return rawObj;
}
