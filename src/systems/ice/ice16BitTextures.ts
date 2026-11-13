/**
 * Texturas Pré-Geradas 16-Bits para Geleiras e Icebergs (Fase 68 / Etapa 3).
 *
 * Gera proceduralmente silhuetas chanfradas em múltiplas camadas de cor:
 * - Base submersa azul-profundo (0x4A86E8)
 * - Corpo glacial ciano-claro (0xA2D9CE / 0xD0ECE7)
 * - Topo nevado branco puro (0xFFFFFF) com arestas pixeladas
 * Pre-bake com resolution: 0.5 e scaleMode: 'nearest', destruindo Graphics temporários.
 */

import { GAME_CONFIG } from "../../config";

export const ICE_16BIT_PALETTE = {
  SUBMERGED_BASE: 0x4a86e8, // Base submersa azul-profundo
  SUBMERGED_SHADOW: 0x2d5bb9, // Sombra profunda subaquática
  SUBMERGED_DEEP_ABYSS: 0x16325c, // Transição batial polar escura
  SUBMERGED_TRENCH_SHADOW: 0x0f263e, // Base abissal integrada ao oceano antártico escuro
  GLACIAL_BODY_MAIN: 0xa2d9ce, // Corpo glacial ciano-claro principal
  GLACIAL_BODY_LIGHT: 0xd0ece7, // Corpo glacial iluminado
  GLACIAL_CLEAVAGE: 0x78bdb0, // Fissuras e arestas chanfradas internas
  SNOW_CREST: 0xffffff, // Topo nevado branco puro
  SNOW_SHADOW: 0xe0f2f1, // Sombra da neve
  WATERLINE_FOAM_BRIGHT: 0xe8fbff, // Espuma especular na linha d'água (y = 78..82)
  SUBSURFACE_TURQUOISE: 0x5ce1e6, // Turquesa translúcido logo abaixo da superfície (y = 80..150)
  FACET_HIGHLIGHT_CYAN: 0x6dd5fa, // Aresta esquerda iluminada dos blocos submersos
  FACET_MID_GLACIAL: 0x348ac7, // Face frontal principal dos prismas de gelo
  FACET_DARK_COBALT: 0x1c4e80, // Face lateral direita em sombra própria
  FISSURE_ABYSS_LINE: 0x0b213f, // Fendas verticais profundas entre colunas
  SEABED_TALUS_SILHOUETTE: 0x081a33, // Contrafortes rochosos/glaciais no leito marinho
} as const;

export interface IceTextureEngineContext {
  createGraphics(id?: string): unknown;
  getDimensions?(): { readonly width: number; readonly height: number };
  generateTexture?(
    target: unknown,
    options?: { resolution?: number; scaleMode?: "nearest" | "linear" }
  ): unknown;
}

export interface IceGraphicsContext {
  drawPolygon?: (
    points: { x: number; y: number }[],
    styleOptions?: {
      fill?: { color: number; alpha?: number };
      stroke?: { color: number; width?: number; alpha?: number };
    }
  ) => void;
  drawRect?: (
    coordinateX: number,
    coordinateY: number,
    rectangleWidth: number,
    rectangleHeight: number,
    styleOptions?: { fill?: { color: number; alpha?: number } }
  ) => void;
  drawLine?: (
    points: { x: number; y: number }[],
    styleOptions?: { color?: number; width?: number; alpha?: number }
  ) => void;
}

/**
 * Desenha a silhueta chanfrada de um bloco de gelo 16-bits em múltiplas camadas.
 */
export function drawBeveled16BitIceBlock(
  gfx: IceGraphicsContext,
  width: number,
  height: number
): void {
  // 1. Camada 1: Base Submersa Azul-Profundo (0x4A86E8) com chanfro inferior
  const submergedTopY = Math.round(height * 0.55);
  const bottomBevel = 4;

  if (typeof gfx.drawPolygon === "function") {
    gfx.drawPolygon(
      [
        { x: 0, y: submergedTopY },
        { x: width, y: submergedTopY },
        { x: width - bottomBevel, y: height },
        { x: bottomBevel, y: height },
      ],
      { fill: { color: ICE_16BIT_PALETTE.SUBMERGED_BASE, alpha: 0.98 } }
    );
    gfx.drawPolygon(
      [
        { x: bottomBevel, y: height - 4 },
        { x: width - bottomBevel, y: height - 4 },
        { x: width - bottomBevel, y: height },
        { x: bottomBevel, y: height },
      ],
      { fill: { color: ICE_16BIT_PALETTE.SUBMERGED_SHADOW, alpha: 0.95 } }
    );
  } else if (typeof gfx.drawRect === "function") {
    gfx.drawRect(0, submergedTopY, width, height - submergedTopY, {
      fill: { color: ICE_16BIT_PALETTE.SUBMERGED_BASE, alpha: 0.98 },
    });
  }

  // 2. Camada 2: Corpo Glacial Ciano-Claro (0xA2D9CE / 0xD0ECE7)
  const snowHeight = 8;
  const glacialHeight = submergedTopY - snowHeight + 4; // leve sobreposição para estanqueidade

  if (typeof gfx.drawRect === "function") {
    // Bloco principal de ciano-claro
    gfx.drawRect(0, snowHeight, width, glacialHeight, {
      fill: { color: ICE_16BIT_PALETTE.GLACIAL_BODY_MAIN, alpha: 0.98 },
    });

    // Painéis verticais facetados iluminados (0xD0ECE7)
    const facetCount = Math.max(2, Math.floor(width / 30));
    const facetWidth = width / facetCount;
    for (let f = 0; f < facetCount; f++) {
      if (f % 2 === 0) {
        gfx.drawRect(f * facetWidth + 2, snowHeight + 2, facetWidth - 4, glacialHeight - 4, {
          fill: { color: ICE_16BIT_PALETTE.GLACIAL_BODY_LIGHT, alpha: 0.85 },
        });
      }
    }
  }

  // Fissuras e arestas chanfradas verticais 16-bits
  if (typeof gfx.drawLine === "function") {
    const fissureInterval = 28;
    for (let fx = fissureInterval; fx < width - 10; fx += fissureInterval) {
      gfx.drawLine(
        [
          { x: fx, y: snowHeight + 2 },
          { x: fx + 3, y: snowHeight + Math.round(glacialHeight * 0.5) },
          { x: fx - 2, y: submergedTopY + 2 },
        ],
        { color: ICE_16BIT_PALETTE.GLACIAL_CLEAVAGE, width: 1.5, alpha: 0.9 }
      );
    }

    // Chanfros angulares nas arestas laterais
    gfx.drawLine(
      [
        { x: 0, y: snowHeight + 4 },
        { x: 4, y: snowHeight },
      ],
      { color: ICE_16BIT_PALETTE.SNOW_CREST, width: 1.5 }
    );
    gfx.drawLine(
      [
        { x: width, y: snowHeight + 4 },
        { x: width - 4, y: snowHeight },
      ],
      { color: ICE_16BIT_PALETTE.SNOW_CREST, width: 1.5 }
    );
  }

  // 3. Camada 3: Topo Nevado Branco Puro (0xFFFFFF) com arestas pixeladas
  if (typeof gfx.drawRect === "function") {
    // Faixa base de neve
    gfx.drawRect(0, 2, width, snowHeight - 2, {
      fill: { color: ICE_16BIT_PALETTE.SNOW_CREST, alpha: 1.0 },
    });

    // Sombra na base da neve para contraste com o gelo ciano
    gfx.drawRect(0, snowHeight - 2, width, 2, {
      fill: { color: ICE_16BIT_PALETTE.SNOW_SHADOW, alpha: 0.9 },
    });

    // Arestas pixeladas escalonadas em blocos de 4px a 8px (estética 16-bits)
    const stepWidth = 6;
    const totalSteps = Math.floor(width / stepWidth);
    for (let s = 0; s < totalSteps; s++) {
      const stepX = s * stepWidth;
      const stepH = s % 3 === 0 ? 3 : s % 3 === 1 ? 1 : 2;
      gfx.drawRect(stepX, 2 - stepH, stepWidth, stepH + 1, {
        fill: { color: ICE_16BIT_PALETTE.SNOW_CREST, alpha: 1.0 },
      });
    }
  }
}

/**
 * Desenha um paredão vertical de iceberg 16-bits em múltiplas camadas com atenuação batial de profundidade.
 */
export function draw16BitIcebergWall(
  graphicsContext: IceGraphicsContext,
  wallTextureWidth: number,
  wallTextureHeight: number,
  referenceViewportHeight: number = 720
): void {
  const seaLevelRatio = GAME_CONFIG.SEA_LEVEL / Math.max(360, referenceViewportHeight);
  const submergedStartY = Math.max(16, Math.round(wallTextureHeight * seaLevelRatio));
  const submergedTotalHeight = Math.max(1, wallTextureHeight - submergedStartY);
  const snowCrestHeight = Math.max(6, Math.round(submergedStartY * 0.3));

  if (typeof graphicsContext.drawRect !== "function") {
    return;
  }

  // 1. Base submersa estratificada com rápida transição para o oceano antártico escuro
  const depthStrata: ReadonlyArray<{ startRatio: number; color: number; alpha: number }> = [
    { startRatio: 0, color: ICE_16BIT_PALETTE.SUBMERGED_BASE, alpha: 0.94 },
    { startRatio: 0.14, color: ICE_16BIT_PALETTE.SUBMERGED_SHADOW, alpha: 0.95 },
    { startRatio: 0.3, color: ICE_16BIT_PALETTE.SUBMERGED_DEEP_ABYSS, alpha: 0.96 },
    { startRatio: 0.52, color: ICE_16BIT_PALETTE.SUBMERGED_TRENCH_SHADOW, alpha: 0.98 },
  ];
  for (const stratum of depthStrata) {
    const stratumY = submergedStartY + Math.round(submergedTotalHeight * stratum.startRatio);
    graphicsContext.drawRect(0, stratumY, wallTextureWidth, wallTextureHeight - stratumY, {
      fill: { color: stratum.color, alpha: stratum.alpha },
    });
  }

  const subsurfaceGlowHeight = Math.max(6, Math.round(submergedTotalHeight * 0.08));
  graphicsContext.drawRect(0, submergedStartY, wallTextureWidth, subsurfaceGlowHeight, {
    fill: { color: ICE_16BIT_PALETTE.SUBSURFACE_TURQUOISE, alpha: 0.88 },
  });

  // 2. Corpo glacial ciano-claro (0xA2D9CE / 0xD0ECE7) e colunas verticais de relevo
  graphicsContext.drawRect(
    0,
    snowCrestHeight,
    wallTextureWidth,
    submergedStartY - snowCrestHeight,
    {
      fill: { color: ICE_16BIT_PALETTE.GLACIAL_BODY_MAIN, alpha: 0.98 },
    }
  );

  const columnStepWidth = 45;
  const midShadowHeight = Math.round(submergedTotalHeight * 0.14);
  const emergedHeight = Math.max(2, submergedStartY - snowCrestHeight - 4);
  const columnSpecs: ReadonlyArray<{
    offsetX: number;
    y: number;
    width: number;
    height: number;
    color: number;
    alpha: number;
  }> = [
    {
      offsetX: 4,
      y: submergedStartY + 2,
      width: columnStepWidth * 0.4,
      height: midShadowHeight,
      color: ICE_16BIT_PALETTE.SUBMERGED_SHADOW,
      alpha: 0.42,
    },
    {
      offsetX: columnStepWidth * 0.55,
      y: submergedStartY,
      width: 2,
      height: submergedTotalHeight * 0.52,
      color: ICE_16BIT_PALETTE.SUBMERGED_DEEP_ABYSS,
      alpha: 0.65,
    },
    {
      offsetX: 6,
      y: snowCrestHeight + 2,
      width: columnStepWidth * 0.45,
      height: emergedHeight,
      color: ICE_16BIT_PALETTE.GLACIAL_BODY_LIGHT,
      alpha: 0.7,
    },
    {
      offsetX: columnStepWidth * 0.5,
      y: snowCrestHeight + 4,
      width: 2,
      height: Math.max(2, emergedHeight - 2),
      color: ICE_16BIT_PALETTE.GLACIAL_CLEAVAGE,
      alpha: 0.8,
    },
  ];
  for (let columnOffsetX = 0; columnOffsetX < wallTextureWidth; columnOffsetX += columnStepWidth) {
    for (const columnSpec of columnSpecs) {
      graphicsContext.drawRect(
        columnOffsetX + columnSpec.offsetX,
        columnSpec.y,
        columnSpec.width,
        columnSpec.height,
        { fill: { color: columnSpec.color, alpha: columnSpec.alpha } }
      );
    }
  }

  // 3. Topo nevado branco puro (0xFFFFFF) com arestas pixeladas (clamped >= 0)
  graphicsContext.drawRect(0, 2, wallTextureWidth, Math.max(2, snowCrestHeight - 2), {
    fill: { color: ICE_16BIT_PALETTE.SNOW_CREST, alpha: 1.0 },
  });
  graphicsContext.drawRect(0, Math.max(2, snowCrestHeight - 2), wallTextureWidth, 2, {
    fill: { color: ICE_16BIT_PALETTE.SNOW_SHADOW, alpha: 0.9 },
  });

  const pixelStepWidth = 8;
  for (let stepOffsetX = 0; stepOffsetX < wallTextureWidth; stepOffsetX += pixelStepWidth) {
    const stepElevation = ((stepOffsetX / pixelStepWidth) % 3) * 2;
    const clampedStepY = Math.max(0, 2 - stepElevation);
    graphicsContext.drawRect(stepOffsetX, clampedStepY, pixelStepWidth, stepElevation + 2, {
      fill: { color: ICE_16BIT_PALETTE.SNOW_CREST, alpha: 1.0 },
    });
  }
}

function bakeGraphicsTexture(
  engine: IceTextureEngineContext,
  graphicsId: string,
  drawCallback: (graphicsNode: IceGraphicsContext) => void
): unknown | null {
  try {
    const tempGraphics = engine.createGraphics(graphicsId) as IceGraphicsContext & {
      destroy?: () => void;
    };
    drawCallback(tempGraphics);
    const generatedTexture = engine.generateTexture?.(tempGraphics, {
      resolution: 0.5,
      scaleMode: "nearest",
    });
    if (tempGraphics && typeof tempGraphics.destroy === "function") {
      tempGraphics.destroy();
    }
    return generatedTexture ?? null;
  } catch {
    return null;
  }
}

/**
 * Realiza o pre-bake imediato das texturas 16-bits de gelo com resolução 0.5 e scaleMode nearest.
 */
export function create16BitIceTextures(engine: IceTextureEngineContext): {
  iceBlockTexture: unknown | null;
  icebergWallTexture: unknown | null;
} {
  if (
    !engine ||
    typeof engine.createGraphics !== "function" ||
    typeof engine.generateTexture !== "function"
  ) {
    return { iceBlockTexture: null, icebergWallTexture: null };
  }
  const viewportHeight =
    typeof engine.getDimensions === "function" ? engine.getDimensions().height || 720 : 720;
  return {
    iceBlockTexture: bakeGraphicsTexture(engine, "ice_block_16bit_bake", (graphics) =>
      drawBeveled16BitIceBlock(graphics, 120, 40)
    ),
    icebergWallTexture: bakeGraphicsTexture(engine, "iceberg_wall_16bit_bake", (graphics) =>
      draw16BitIcebergWall(graphics, 360, 300, viewportHeight)
    ),
  };
}
