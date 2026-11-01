/**
 * Texturas Pré-Geradas 16-Bits para o Santuário Bentônico de Arraial do Cabo (Fase 68 / Etapa 3).
 *
 * Pre-bake com resolution: 0.5 e scaleMode: 'nearest', mantendo 60+ FPS:
 * - Corais-cérebro com ranhuras labirínticas e sombreamento na base.
 * - Gorgônias ramificadas com nós dendríticos e âncora basal.
 * - Esponjas tubulares agrupadas com aberturas de ósculo e sombreamento basal.
 * - Peixes de recife com cauda bifurcada, nadadeiras, faixa lateral contrastante e olho pixelado.
 *
 * Paleta vibrante 16-bits:
 * - Laranja-coral (0xFF7043)
 * - Amarelo-sol (0xFFCA28)
 * - Roxo-recife (0xAB47BC)
 * - Turquesa (0x26C6DA)
 */

export const ARRAIAL_16BIT_PALETTE = {
  CORAL_ORANGE: 0xff7043,
  CORAL_ORANGE_DARK: 0xbf360c,
  CORAL_ORANGE_LIGHT: 0xffab91,

  SUN_YELLOW: 0xffca28,
  SUN_YELLOW_DARK: 0xb28704,
  SUN_YELLOW_LIGHT: 0xfff59d,

  REEF_PURPLE: 0xab47bc,
  REEF_PURPLE_DARK: 0x5c2268,
  REEF_PURPLE_LIGHT: 0xce93d8,

  TURQUOISE: 0x26c6da,
  TURQUOISE_DARK: 0x00838f,
  TURQUOISE_LIGHT: 0x80deea,

  BASE_BEDROCK_SHADOW: 0x0f2537,
  BASE_SEDIMENT: 0x1b3b52,

  FISH_EYE_SCLERA: 0xffffff,
  FISH_EYE_PUPIL: 0x111122,
  FISH_EYE_SPECULAR: 0xffffff,
} as const;

export interface SanctuaryTextureEngineContext {
  createGraphics(id?: string): any;
  generateTexture?(
    target: unknown,
    options?: { resolution?: number; scaleMode?: "nearest" | "linear" }
  ): unknown;
}

/**
 * Desenha um coral-cérebro 16-bits com silhueta abobadada chanfrada,
 * estrias/ranhuras labirínticas e base com sombreamento profundo.
 */
export function draw16BitBrainCoral(
  gfx: any,
  mainColor: number,
  baseColor: number,
  highlightColor: number,
  width: number = 64,
  height: number = 40
): void {
  const baseH = 8;

  // 1. Sombreamento escuro na base de ancoragem ao costão rochoso
  if (typeof gfx.drawRect === "function") {
    gfx.drawRect(4, height - baseH, width - 8, baseH, {
      fill: { color: ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW, alpha: 0.96 },
    });
    gfx.drawRect(8, height - baseH - 3, width - 16, 4, {
      fill: { color: baseColor, alpha: 0.95 },
    });
  }

  // 2. Silhueta abobadada com degraus pixelados (16-bits)
  const steps = [
    { y: 0, w: 28, h: 4 },
    { y: 4, w: 44, h: 6 },
    { y: 10, w: 56, h: 8 },
    { y: 18, w: 62, h: 14 },
  ];

  for (const step of steps) {
    const x = Math.round((width - step.w) / 2);
    if (typeof gfx.drawRect === "function") {
      gfx.drawRect(x, step.y, step.w, step.h, {
        fill: { color: mainColor, alpha: 0.98 },
      });
    }
  }

  // 3. Convoluções labirínticas (grooves / cumes iluminados e sombras)
  if (typeof gfx.drawRect === "function") {
    // Sulcos sombreados
    const grooves = [
      { x: 12, y: 12, w: 8, h: 3 },
      { x: 17, y: 15, w: 3, h: 8 },
      { x: 26, y: 8, w: 3, h: 14 },
      { x: 34, y: 10, w: 8, h: 3 },
      { x: 39, y: 13, w: 3, h: 9 },
      { x: 46, y: 14, w: 6, h: 3 },
      { x: 22, y: 24, w: 12, h: 3 },
      { x: 36, y: 23, w: 10, h: 3 },
    ];
    for (const g of grooves) {
      gfx.drawRect(g.x, g.y, g.w, g.h, {
        fill: { color: baseColor, alpha: 0.85 },
      });
    }

    // Arestas iluminadas das convoluções
    const highlights = [
      { x: 12, y: 10, w: 8, h: 2 },
      { x: 24, y: 6, w: 12, h: 2 },
      { x: 34, y: 8, w: 8, h: 2 },
      { x: 44, y: 12, w: 6, h: 2 },
      { x: 22, y: 22, w: 12, h: 2 },
      { x: 36, y: 21, w: 8, h: 2 },
    ];
    for (const hl of highlights) {
      gfx.drawRect(hl.x, hl.y, hl.w, hl.h, {
        fill: { color: highlightColor, alpha: 0.9 },
      });
    }
  }
}

/**
 * Desenha uma gorgônia ramificada 16-bits (leque de mar) com estrutura
 * dendrítica, nós salientes, pontas contrastantes e ancoragem com sombra.
 */
export function draw16BitGorgonianFan(
  gfx: any,
  mainColor: number,
  baseColor: number,
  accentTipColor: number,
  width: number = 60,
  height: number = 64
): void {
  // 1. Base rochosa de sustentação com sombra
  if (typeof gfx.drawRect === "function") {
    gfx.drawRect(width / 2 - 10, height - 6, 20, 6, {
      fill: { color: ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW, alpha: 0.96 },
    });
    gfx.drawRect(width / 2 - 7, height - 10, 14, 5, {
      fill: { color: baseColor, alpha: 0.9 },
    });
  }

  // 2. Tronco principal
  const stemX = Math.round(width / 2) - 2;
  if (typeof gfx.drawRect === "function") {
    gfx.drawRect(stemX, height - 26, 4, 18, {
      fill: { color: baseColor, alpha: 0.98 },
    });
    gfx.drawRect(stemX + 1, height - 24, 2, 14, {
      fill: { color: mainColor, alpha: 0.95 },
    });
  }

  // 3. Ramificações dendríticas 16-bits via retângulos/linhas pixeladas
  const branches = [
    // Tronco esquerdo e subdivisões
    { x1: stemX, y1: height - 24, x2: stemX - 12, y2: height - 38, w: 3 },
    { x1: stemX - 12, y1: height - 38, x2: stemX - 22, y2: height - 50, w: 2 },
    { x1: stemX - 12, y1: height - 38, x2: stemX - 8, y2: height - 52, w: 2 },
    { x1: stemX - 22, y1: height - 50, x2: stemX - 26, y2: height - 58, w: 2 },

    // Tronco central
    { x1: stemX + 1, y1: height - 26, x2: stemX + 1, y2: height - 46, w: 3 },
    { x1: stemX + 1, y1: height - 46, x2: stemX - 4, y2: height - 58, w: 2 },
    { x1: stemX + 1, y1: height - 46, x2: stemX + 5, y2: height - 60, w: 2 },

    // Tronco direito e subdivisões
    { x1: stemX + 3, y1: height - 24, x2: stemX + 14, y2: height - 38, w: 3 },
    { x1: stemX + 14, y1: height - 38, x2: stemX + 10, y2: height - 52, w: 2 },
    { x1: stemX + 14, y1: height - 38, x2: stemX + 22, y2: height - 48, w: 2 },
    { x1: stemX + 22, y1: height - 48, x2: stemX + 26, y2: height - 56, w: 2 },
  ];

  if (typeof gfx.drawLine === "function") {
    for (const b of branches) {
      gfx.drawLine(
        [
          { x: b.x1, y: b.y1 },
          { x: b.x2, y: b.y2 },
        ],
        { color: mainColor, width: b.w, alpha: 0.95 }
      );
    }
  }

  // 4. Pontas contrastantes (pólipos luminosos / crescimento ativo)
  const tips = [
    { x: stemX - 26, y: height - 60 },
    { x: stemX - 22, y: height - 53 },
    { x: stemX - 8, y: height - 55 },
    { x: stemX - 4, y: height - 60 },
    { x: stemX + 5, y: height - 62 },
    { x: stemX + 10, y: height - 54 },
    { x: stemX + 22, y: height - 50 },
    { x: stemX + 26, y: height - 58 },
  ];

  if (typeof gfx.drawRect === "function") {
    for (const tip of tips) {
      gfx.drawRect(tip.x - 2, tip.y - 2, 4, 4, {
        fill: { color: accentTipColor, alpha: 1.0 },
      });
      // Ponto de luz central
      gfx.drawRect(tip.x - 1, tip.y - 1, 2, 2, {
        fill: { color: 0xffffff, alpha: 0.9 },
      });
    }
  }
}

/**
 * Desenha esponjas tubulares agrupadas 16-bits com múltiplos tubos,
 * aberturas de ósculo e sombreamento basal.
 */
export function draw16BitSponge(
  gfx: any,
  mainColor: number,
  baseColor: number,
  osculumColor: number,
  width: number = 48,
  height: number = 44
): void {
  // 1. Sombreamento escuro basal
  if (typeof gfx.drawRect === "function") {
    gfx.drawRect(2, height - 7, width - 4, 7, {
      fill: { color: ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW, alpha: 0.95 },
    });
    gfx.drawRect(4, height - 12, width - 8, 6, {
      fill: { color: baseColor, alpha: 0.9 },
    });
  }

  // 2. Três tubos cilíndricos verticais com alturas variadas
  const tubes = [
    { x: 4, y: 12, w: 14, h: height - 12, osculumH: 4 }, // Tubo esquerdo
    { x: 16, y: 4, w: 16, h: height - 4, osculumH: 5 }, // Tubo central maior
    { x: 30, y: 16, w: 14, h: height - 16, osculumH: 4 }, // Tubo direito menor
  ];

  for (const tube of tubes) {
    if (typeof gfx.drawRect === "function") {
      // Corpo do tubo
      gfx.drawRect(tube.x, tube.y + tube.osculumH, tube.w, tube.h - tube.osculumH, {
        fill: { color: mainColor, alpha: 0.98 },
      });

      // Sombra na lateral esquerda do tubo
      gfx.drawRect(tube.x, tube.y + tube.osculumH, 3, tube.h - tube.osculumH, {
        fill: { color: baseColor, alpha: 0.8 },
      });

      // Brilho na lateral direita
      gfx.drawRect(tube.x + tube.w - 3, tube.y + tube.osculumH, 2, tube.h - tube.osculumH, {
        fill: { color: 0xffffff, alpha: 0.35 },
      });

      // Poros / textura pontilhada
      gfx.drawRect(tube.x + 5, tube.y + 10, 2, 2, {
        fill: { color: baseColor, alpha: 0.6 },
      });
      gfx.drawRect(tube.x + 8, tube.y + 18, 2, 2, {
        fill: { color: baseColor, alpha: 0.6 },
      });

      // Borda do Ósculo no topo
      gfx.drawRect(tube.x, tube.y, tube.w, tube.osculumH, {
        fill: { color: osculumColor, alpha: 1.0 },
      });

      // Abertura interna escura do Ósculo
      gfx.drawRect(tube.x + 3, tube.y + 1, tube.w - 6, tube.osculumH - 2, {
        fill: { color: ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW, alpha: 0.95 },
      });
    }
  }
}

/**
 * Desenha um peixe de recife 16-bits de Arraial do Cabo com:
 * - Corpo hidrodinâmico pixelado
 * - Nadadeiras dorsal e peitoral/ventral
 * - Cauda bifurcada pronunciada (forked caudal fin)
 * - Faixa lateral contrastante
 * - Olho pixelado (esclera branca, pupila preta, brilho especular)
 */
export function draw16BitReefFish(
  gfx: any,
  bodyColor: number,
  finColor: number,
  stripeColor: number,
  _width: number = 28,
  height: number = 16
): void {
  const centerY = Math.round(height / 2);

  // 1. Cauda bifurcada (forked caudal tail) à esquerda:
  // Duas pontas que convergem num pedúnculo estreito (x = 7)
  if (typeof gfx.drawPolygon === "function") {
    // Lobo superior da cauda bifurcada
    gfx.drawPolygon(
      [
        { x: 1, y: centerY - 6 },
        { x: 7, y: centerY - 1 },
        { x: 5, y: centerY },
        { x: 1, y: centerY - 2 },
      ],
      { fill: { color: finColor, alpha: 0.98 } }
    );

    // Lobo inferior da cauda bifurcada
    gfx.drawPolygon(
      [
        { x: 1, y: centerY + 6 },
        { x: 7, y: centerY + 1 },
        { x: 5, y: centerY },
        { x: 1, y: centerY + 2 },
      ],
      { fill: { color: finColor, alpha: 0.98 } }
    );
  } else if (typeof gfx.drawRect === "function") {
    gfx.drawRect(1, centerY - 6, 4, 3, { fill: { color: finColor, alpha: 0.98 } });
    gfx.drawRect(1, centerY + 3, 4, 3, { fill: { color: finColor, alpha: 0.98 } });
    gfx.drawRect(4, centerY - 2, 3, 4, { fill: { color: finColor, alpha: 0.98 } });
  }

  // 2. Nadadeira dorsal (topo)
  if (typeof gfx.drawPolygon === "function") {
    gfx.drawPolygon(
      [
        { x: 12, y: centerY - 4 },
        { x: 16, y: 1 },
        { x: 20, y: centerY - 4 },
      ],
      { fill: { color: finColor, alpha: 0.95 } }
    );
  } else if (typeof gfx.drawRect === "function") {
    gfx.drawRect(14, 1, 5, 3, { fill: { color: finColor, alpha: 0.95 } });
  }

  // 3. Nadadeira ventral/anal (baixo)
  if (typeof gfx.drawPolygon === "function") {
    gfx.drawPolygon(
      [
        { x: 13, y: centerY + 4 },
        { x: 17, y: height - 1 },
        { x: 19, y: centerY + 4 },
      ],
      { fill: { color: finColor, alpha: 0.95 } }
    );
  } else if (typeof gfx.drawRect === "function") {
    gfx.drawRect(14, height - 3, 4, 2, { fill: { color: finColor, alpha: 0.95 } });
  }

  // 4. Corpo do peixe (elipse/retângulos escalonados 16-bits)
  if (typeof gfx.drawRect === "function") {
    // Pedúnculo caudal
    gfx.drawRect(6, centerY - 2, 3, 4, { fill: { color: bodyColor, alpha: 1.0 } });
    // Corpo traseiro
    gfx.drawRect(9, centerY - 4, 4, 8, { fill: { color: bodyColor, alpha: 1.0 } });
    // Corpo médio
    gfx.drawRect(13, centerY - 5, 8, 10, { fill: { color: bodyColor, alpha: 1.0 } });
    // Cabeça
    gfx.drawRect(21, centerY - 4, 4, 8, { fill: { color: bodyColor, alpha: 1.0 } });
    // Focinho
    gfx.drawRect(25, centerY - 2, 2, 4, { fill: { color: bodyColor, alpha: 1.0 } });
  }

  // 5. Faixa lateral contrastante (horizontal ao longo do centro)
  if (typeof gfx.drawRect === "function") {
    gfx.drawRect(7, centerY - 1, 15, 2, {
      fill: { color: stripeColor, alpha: 1.0 },
    });
  }

  // 6. Nadadeira peitoral sobreposta
  if (typeof gfx.drawRect === "function") {
    gfx.drawRect(14, centerY + 1, 4, 3, {
      fill: { color: finColor, alpha: 0.9 },
    });
  }

  // 7. Olho pixelado (esclera branca, pupila preta, brilho especular)
  if (typeof gfx.drawRect === "function") {
    // Esclera branca
    gfx.drawRect(21, centerY - 3, 3, 3, {
      fill: { color: ARRAIAL_16BIT_PALETTE.FISH_EYE_SCLERA, alpha: 1.0 },
    });
    // Pupila preta
    gfx.drawRect(22, centerY - 3, 2, 2, {
      fill: { color: ARRAIAL_16BIT_PALETTE.FISH_EYE_PUPIL, alpha: 1.0 },
    });
    // Brilho especular
    gfx.drawRect(22, centerY - 3, 1, 1, {
      fill: { color: ARRAIAL_16BIT_PALETTE.FISH_EYE_SPECULAR, alpha: 1.0 },
    });
  }
}

export interface SanctuaryTextures {
  readonly available: boolean;
  readonly brainCorals: unknown[];
  readonly seaFans: unknown[];
  readonly sponges: unknown[];
  readonly fishVariants: unknown[];
}

/**
 * Realiza o pre-bake imediato de todas as variantes de corais e peixes de Arraial do Cabo.
 * Resolução 0.5 e scaleMode nearest, destruindo os nós Graphics temporários.
 */
export function create16BitSanctuaryTextures(
  engine: SanctuaryTextureEngineContext
): SanctuaryTextures {
  if (
    !engine ||
    typeof engine.createGraphics !== "function" ||
    typeof engine.generateTexture !== "function"
  ) {
    return {
      available: false,
      brainCorals: [],
      seaFans: [],
      sponges: [],
      fishVariants: [],
    };
  }

  const brainCorals: unknown[] = [];
  const seaFans: unknown[] = [];
  const sponges: unknown[] = [];
  const fishVariants: unknown[] = [];

  const bakeOptions = { resolution: 0.5, scaleMode: "nearest" as const };

  try {
    // A. Corais-Cérebro: Laranja-coral e Roxo-recife
    const brainConfigs = [
      {
        main: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
        base: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_DARK,
        hl: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_LIGHT,
      },
      {
        main: ARRAIAL_16BIT_PALETTE.REEF_PURPLE,
        base: ARRAIAL_16BIT_PALETTE.REEF_PURPLE_DARK,
        hl: ARRAIAL_16BIT_PALETTE.REEF_PURPLE_LIGHT,
      },
    ];
    for (let i = 0; i < brainConfigs.length; i++) {
      const g = engine.createGraphics(`brain_coral_bake_${i}`);
      draw16BitBrainCoral(g, brainConfigs[i].main, brainConfigs[i].base, brainConfigs[i].hl);
      const tex = engine.generateTexture(g, bakeOptions);
      if (g && typeof g.destroy === "function") g.destroy();
      if (tex) brainCorals.push(tex);
    }

    // B. Gorgônias Ramificadas: Turquesa e Laranja-coral
    const fanConfigs = [
      {
        main: ARRAIAL_16BIT_PALETTE.TURQUOISE,
        base: ARRAIAL_16BIT_PALETTE.TURQUOISE_DARK,
        accent: ARRAIAL_16BIT_PALETTE.TURQUOISE_LIGHT,
      },
      {
        main: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
        base: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_DARK,
        accent: ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
      },
    ];
    for (let i = 0; i < fanConfigs.length; i++) {
      const g = engine.createGraphics(`fan_coral_bake_${i}`);
      draw16BitGorgonianFan(g, fanConfigs[i].main, fanConfigs[i].base, fanConfigs[i].accent);
      const tex = engine.generateTexture(g, bakeOptions);
      if (g && typeof g.destroy === "function") g.destroy();
      if (tex) seaFans.push(tex);
    }

    // C. Esponjas: Amarelo-sol, Roxo-recife e Turquesa
    const spongeConfigs = [
      {
        main: ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
        base: ARRAIAL_16BIT_PALETTE.SUN_YELLOW_DARK,
        osculum: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
      },
      {
        main: ARRAIAL_16BIT_PALETTE.REEF_PURPLE,
        base: ARRAIAL_16BIT_PALETTE.REEF_PURPLE_DARK,
        osculum: ARRAIAL_16BIT_PALETTE.TURQUOISE,
      },
      {
        main: ARRAIAL_16BIT_PALETTE.TURQUOISE,
        base: ARRAIAL_16BIT_PALETTE.TURQUOISE_DARK,
        osculum: ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
      },
    ];
    for (let i = 0; i < spongeConfigs.length; i++) {
      const g = engine.createGraphics(`sponge_bake_${i}`);
      draw16BitSponge(g, spongeConfigs[i].main, spongeConfigs[i].base, spongeConfigs[i].osculum);
      const tex = engine.generateTexture(g, bakeOptions);
      if (g && typeof g.destroy === "function") g.destroy();
      if (tex) sponges.push(tex);
    }

    // D. Peixes de Recife com cauda bifurcada, faixa lateral e olho pixelado
    const fishConfigs = [
      // Amarelo-sol com faixa turquesa e nadadeiras laranja
      {
        body: ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
        fin: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
        stripe: ARRAIAL_16BIT_PALETTE.TURQUOISE,
      },
      // Turquesa com faixa amarelo-sol e nadadeiras roxas
      {
        body: ARRAIAL_16BIT_PALETTE.TURQUOISE,
        fin: ARRAIAL_16BIT_PALETTE.REEF_PURPLE,
        stripe: ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
      },
      // Roxo-recife com faixa turquesa e nadadeiras amarelo-sol
      {
        body: ARRAIAL_16BIT_PALETTE.REEF_PURPLE,
        fin: ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
        stripe: ARRAIAL_16BIT_PALETTE.TURQUOISE,
      },
    ];
    for (let i = 0; i < fishConfigs.length; i++) {
      const g = engine.createGraphics(`reef_fish_bake_${i}`);
      draw16BitReefFish(g, fishConfigs[i].body, fishConfigs[i].fin, fishConfigs[i].stripe);
      const tex = engine.generateTexture(g, bakeOptions);
      if (g && typeof g.destroy === "function") g.destroy();
      if (tex) fishVariants.push(tex);
    }
  } catch (error) {
    console.warn("[Sanctuary16Bit] Falha no pre-bake das texturas:", error);
  }

  const available =
    brainCorals.length > 0 && seaFans.length > 0 && sponges.length > 0 && fishVariants.length > 0;

  return {
    available,
    brainCorals,
    seaFans,
    sponges,
    fishVariants,
  };
}
