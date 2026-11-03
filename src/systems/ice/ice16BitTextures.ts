/**
 * Texturas Pré-Geradas 16-Bits para Geleiras e Icebergs (Fase 68 / Etapa 3).
 *
 * Gera proceduralmente silhuetas chanfradas em múltiplas camadas de cor:
 * - Base submersa azul-profundo (0x4A86E8)
 * - Corpo glacial ciano-claro (0xA2D9CE / 0xD0ECE7)
 * - Topo nevado branco puro (0xFFFFFF) com arestas pixeladas
 * Pre-bake com resolution: 0.5 e scaleMode: 'nearest', destruindo Graphics temporários.
 */

export const ICE_16BIT_PALETTE = {
  SUBMERGED_BASE: 0x4a86e8, // Base submersa azul-profundo
  SUBMERGED_SHADOW: 0x2d5bb9, // Sombra profunda subaquática
  GLACIAL_BODY_MAIN: 0xa2d9ce, // Corpo glacial ciano-claro principal
  GLACIAL_BODY_LIGHT: 0xd0ece7, // Corpo glacial iluminado
  GLACIAL_CLEAVAGE: 0x78bdb0, // Fissuras e arestas chanfradas internas
  SNOW_CREST: 0xffffff, // Topo nevado branco puro
  SNOW_SHADOW: 0xe0f2f1, // Sombra da neve
} as const;

export interface IceTextureEngineContext {
  createGraphics(id?: string): any;
  generateTexture?(
    target: unknown,
    options?: { resolution?: number; scaleMode?: "nearest" | "linear" }
  ): unknown;
}

/**
 * Desenha a silhueta chanfrada de um bloco de gelo 16-bits em múltiplas camadas.
 */
export function drawBeveled16BitIceBlock(gfx: any, width: number, height: number): void {
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

    // Sombra profunda na base inferior chanfrada
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
 * Desenha um paredão vertical de iceberg 16-bits em múltiplas camadas.
 */
export function draw16BitIcebergWall(gfx: any, width: number, height: number): void {
  const submergedY = Math.round(height * 0.45);

  // 1. Base submersa azul-profundo (0x4A86E8)
  if (typeof gfx.drawRect === "function") {
    gfx.drawRect(0, submergedY, width, height - submergedY, {
      fill: { color: ICE_16BIT_PALETTE.SUBMERGED_BASE, alpha: 0.96 },
    });
    gfx.drawRect(0, height - 25, width, 25, {
      fill: { color: ICE_16BIT_PALETTE.SUBMERGED_SHADOW, alpha: 0.95 },
    });
  }

  // 2. Corpo glacial ciano-claro (0xA2D9CE / 0xD0ECE7)
  const snowH = 14;
  if (typeof gfx.drawRect === "function") {
    gfx.drawRect(0, snowH, width, submergedY - snowH, {
      fill: { color: ICE_16BIT_PALETTE.GLACIAL_BODY_MAIN, alpha: 0.98 },
    });

    // Colunas de relevo glacial verticais
    const colStep = 45;
    for (let cx = 0; cx < width; cx += colStep) {
      gfx.drawRect(cx + 6, snowH + 4, colStep * 0.45, submergedY - snowH - 8, {
        fill: { color: ICE_16BIT_PALETTE.GLACIAL_BODY_LIGHT, alpha: 0.7 },
      });
      gfx.drawRect(cx + colStep * 0.5, snowH + 8, 2, submergedY - snowH - 12, {
        fill: { color: ICE_16BIT_PALETTE.GLACIAL_CLEAVAGE, alpha: 0.8 },
      });
    }
  }

  // 3. Topo nevado branco puro (0xFFFFFF) com arestas pixeladas
  if (typeof gfx.drawRect === "function") {
    gfx.drawRect(0, 4, width, snowH - 4, {
      fill: { color: ICE_16BIT_PALETTE.SNOW_CREST, alpha: 1.0 },
    });

    const stepW = 8;
    for (let sx = 0; sx < width; sx += stepW) {
      const stepOffset = ((sx / stepW) % 3) * 2;
      gfx.drawRect(sx, 4 - stepOffset, stepW, stepOffset + 2, {
        fill: { color: ICE_16BIT_PALETTE.SNOW_CREST, alpha: 1.0 },
      });
    }
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

  let iceBlockTexture: unknown | null = null;
  let icebergWallTexture: unknown | null = null;

  try {
    // 1. Pre-bake do bloco de gelo modular (120x40)
    const tempBlockG = engine.createGraphics("ice_block_16bit_bake");
    drawBeveled16BitIceBlock(tempBlockG, 120, 40);
    iceBlockTexture = engine.generateTexture(tempBlockG, {
      resolution: 0.5,
      scaleMode: "nearest",
    });
    if (tempBlockG && typeof tempBlockG.destroy === "function") {
      tempBlockG.destroy();
    }
  } catch {
    iceBlockTexture = null;
  }

  try {
    // 2. Pre-bake do paredão de iceberg (360x300)
    const tempWallG = engine.createGraphics("iceberg_wall_16bit_bake");
    draw16BitIcebergWall(tempWallG, 360, 300);
    icebergWallTexture = engine.generateTexture(tempWallG, {
      resolution: 0.5,
      scaleMode: "nearest",
    });
    if (tempWallG && typeof tempWallG.destroy === "function") {
      tempWallG.destroy();
    }
  } catch {
    icebergWallTexture = null;
  }

  return { iceBlockTexture, icebergWallTexture };
}
