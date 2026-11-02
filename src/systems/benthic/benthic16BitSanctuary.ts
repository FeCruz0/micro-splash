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

  // Contra-sombreamento ventral e marcas de peixes tropicais (estilo orcas/jubartes)
  FISH_BELLY_LIGHT: 0xffffff,
  FISH_BELLY_SHADOW: 0xfff9c4,
  FISH_TURQUOISE_BELLY: 0xe0f7fa,
  FISH_PURPLE_BELLY: 0xf3e5f5,

  // Anêmonas e tentáculos oscilantes
  ANEMONE_BODY_TEAL: 0x00897b,
  ANEMONE_BODY_DARK: 0x004d40,
  ANEMONE_BODY_LIGHT: 0x4db6ac,
  ANEMONE_TENTACLE_PINK: 0xf06292,
  ANEMONE_TENTACLE_TIP: 0xffeb3b,
  ANEMONE_PURPLE_TENTACLE: 0xba68c8,
  ANEMONE_CYAN_TIP: 0x18ffff,

  // Pólipos contrastantes fluorescentes
  POLYP_GLOW_GOLD: 0xffd54f,
  POLYP_GLOW_CYAN: 0x80deea,
  POLYP_GLOW_PINK: 0xff80ab,

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
 * Retângulo arredondado 16-bits: usa drawRoundedRect quando disponível
 * e recorre a drawRect em contextos gráficos mínimos.
 */
function fillRoundedBlock(
  gfx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  color: number,
  alpha: number
): void {
  if (typeof gfx.drawRoundedRect === "function") {
    gfx.drawRoundedRect(x, y, w, h, radius, { fill: { color, alpha } });
  } else if (typeof gfx.drawRect === "function") {
    gfx.drawRect(x, y, w, h, { fill: { color, alpha } });
  }
}

/**
 * Desenha uma colônia de coral tubular multi-lóbulo 16-bits (5 chaminés orgânicas
 * de alturas diferentes) com sombra lateral, anéis frisados iluminados, abertura
 * escura com borda clara no topo, pólipos brilhantes e base rochosa escura.
 */
export function draw16BitBrainCoral(
  gfx: any,
  mainColor: number,
  baseColor: number,
  highlightColor: number,
  width: number = 64,
  height: number = 40,
  polypColor: number = ARRAIAL_16BIT_PALETTE.POLYP_GLOW_GOLD
): void {
  if (typeof gfx.drawRect !== "function") return;

  const tubeBottom = height - 2;
  const tubes = [
    { x: 8, w: 10, h: 20 },
    { x: 18, w: 12, h: 32 },
    { x: 28, w: 12, h: 38 },
    { x: 38, w: 12, h: 28 },
    { x: 48, w: 10, h: 18 },
  ];

  for (const tube of tubes) {
    const y0 = tubeBottom - tube.h;

    // Corpo principal do tubo + sombra lateral
    fillRoundedBlock(gfx, tube.x, y0, tube.w, tube.h, 3, mainColor, 0.98);
    gfx.drawRect(tube.x, y0 + 3, 3, tube.h - 3, {
      fill: { color: baseColor, alpha: 0.85 },
    });

    // Anéis horizontais frisados (gomos) iluminados
    const ringCount = tube.h >= 30 ? 4 : 3;
    const ringStep = Math.floor((tube.h - 10) / ringCount);
    for (let r = 0; r < ringCount; r++) {
      const ry = y0 + 7 + r * ringStep;
      gfx.drawRect(tube.x + 1, ry, tube.w - 2, 2, {
        fill: { color: highlightColor, alpha: 0.9 },
      });
      gfx.drawRect(tube.x + 1, ry + 2, tube.w - 2, 1, {
        fill: { color: baseColor, alpha: 0.7 },
      });
    }

    // Borda iluminada e abertura escura no topo
    gfx.drawRect(tube.x, y0, tube.w, 4, {
      fill: { color: highlightColor, alpha: 1.0 },
    });
    gfx.drawRect(tube.x + 2, y0 + 1, tube.w - 4, 2, {
      fill: { color: ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW, alpha: 0.95 },
    });

    // Pólipo brilhante 3x3 com ponto de luz
    const px = tube.x + Math.floor(tube.w / 2) - 1;
    const py = y0 + 7 + Math.floor(ringStep / 2) - 1;
    gfx.drawRect(px, py, 3, 3, { fill: { color: polypColor, alpha: 0.95 } });
    gfx.drawRect(px + 1, py + 1, 1, 1, { fill: { color: 0xffffff, alpha: 0.9 } });
  }

  // Base rochosa escura de ancoragem
  gfx.drawRect(2, height - 4, width - 4, 4, {
    fill: { color: ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW, alpha: 0.96 },
  });
}

/**
 * Desenha um coral ramificado 16-bits (Acropora / árvore de coral): 5 galhos
 * ascendentes em leque feitos de segmentos empilhados 6x8 com anéis de sombra,
 * sub-ramificações laterais e pontas brilhantes. O fundo entre galhos é vazado
 * (nenhum polígono sólido).
 */
export function draw16BitGorgonianFan(
  gfx: any,
  mainColor: number,
  baseColor: number,
  accentTipColor: number,
  width: number = 60,
  height: number = 64,
  polypColor: number = ARRAIAL_16BIT_PALETTE.POLYP_GLOW_GOLD
): void {
  if (typeof gfx.drawRect !== "function") return;

  const cx = Math.round(width / 2);
  const baseTopY = height - 8;

  // Base rochosa escura 24x8 no chão
  gfx.drawRect(cx - 12, baseTopY, 24, 8, {
    fill: { color: ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW, alpha: 0.96 },
  });
  gfx.drawRect(cx - 9, baseTopY - 2, 18, 3, {
    fill: { color: baseColor, alpha: 0.9 },
  });

  const branches = [
    { off: -18, h: 34 },
    { off: -9, h: 46 },
    { off: 0, h: 52 },
    { off: 9, h: 42 },
    { off: 18, h: 28 },
  ];

  for (const branch of branches) {
    const dir = branch.off === 0 ? 1 : Math.sign(branch.off);
    const segCount = Math.ceil(branch.h / 8);
    let topX = cx + branch.off;
    let topY = baseTopY;

    for (let s = 0; s < segCount; s++) {
      // Inclinação suave para fora formando o leque
      const lean = Math.round((branch.off / 18) * s * 1.5);
      const segX = cx + branch.off + lean;
      const segY = baseTopY - (s + 1) * 8;

      fillRoundedBlock(gfx, segX - 3, segY, 6, 8, 2, mainColor, 0.98);
      gfx.drawRect(segX - 3, segY + 1, 2, 7, { fill: { color: baseColor, alpha: 0.7 } });
      // Anel de sombra intercalado
      if (s % 2 === 0) {
        gfx.drawRect(segX - 3, segY + 6, 6, 2, { fill: { color: baseColor, alpha: 0.9 } });
      }

      // Sub-ramificações laterais curtas
      if (s === 2 || s === 4) {
        const stubDir = s === 2 ? dir : -dir;
        const stubX = stubDir > 0 ? segX + 3 : segX - 7;
        fillRoundedBlock(gfx, stubX, segY + 1, 4, 6, 2, mainColor, 0.95);
        const tipX = stubX + 2;
        gfx.drawRect(tipX - 1, segY - 1, 3, 3, { fill: { color: accentTipColor, alpha: 1.0 } });
      }

      topX = segX;
      topY = segY;
    }

    // Ponta arredondada brilhante + pólipo no topo do ramo
    gfx.drawRect(topX - 2, topY - 3, 4, 4, { fill: { color: accentTipColor, alpha: 1.0 } });
    gfx.drawRect(topX - 1, topY - 2, 2, 2, { fill: { color: polypColor, alpha: 1.0 } });
    gfx.drawRect(topX - 1, topY - 2, 1, 1, { fill: { color: 0xffffff, alpha: 0.9 } });
  }
}

/**
 * Desenha uma anêmona 16-bits de Arraial do Cabo com:
 * - Base rochosa escura de ancoragem
 * - Tronco/coluna cilíndrica com estrias e sombreamento intermediário
 * - Disco oral iluminado
 * - Coroa de tentáculos ondulantes radiados com pontas luminosas e núcleos claros
 */
export function draw16BitAnemone(
  gfx: any,
  bodyColor: number,
  baseColor: number,
  tentacleColor: number,
  tipColor: number,
  width: number = 56,
  height: number = 44
): void {
  const centerX = Math.round(width / 2);

  // 1. Base rochosa escura de sustentação ao costão
  if (typeof gfx.drawRect === "function") {
    gfx.drawRect(centerX - 18, height - 6, 36, 6, {
      fill: { color: ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW, alpha: 0.96 },
    });
    gfx.drawRect(centerX - 14, height - 9, 28, 4, {
      fill: { color: baseColor, alpha: 0.9 },
    });
  }

  // 2. Coluna cilíndrica carnosa (tronco) com estrias sombreadas
  const columnW = 28;
  const columnH = 18;
  const columnX = centerX - Math.round(columnW / 2);
  const columnY = height - 9 - columnH;

  if (typeof gfx.drawRect === "function") {
    // Corpo principal da coluna
    gfx.drawRect(columnX, columnY, columnW, columnH, {
      fill: { color: bodyColor, alpha: 0.98 },
    });
    // Sombra na base e bordo esquerdo
    gfx.drawRect(columnX, columnY, 4, columnH, {
      fill: { color: baseColor, alpha: 0.8 },
    });
    // Iluminação no bordo direito
    gfx.drawRect(columnX + columnW - 3, columnY, 3, columnH, {
      fill: { color: 0xffffff, alpha: 0.25 },
    });
    // Estrias verticais
    gfx.drawRect(columnX + 9, columnY + 3, 2, columnH - 6, {
      fill: { color: baseColor, alpha: 0.6 },
    });
    gfx.drawRect(columnX + 17, columnY + 3, 2, columnH - 6, {
      fill: { color: baseColor, alpha: 0.6 },
    });

    // 3. Disco oral iluminado no topo da coluna
    gfx.drawRect(columnX - 3, columnY - 3, columnW + 6, 4, {
      fill: { color: tipColor, alpha: 0.95 },
    });
    gfx.drawRect(columnX, columnY - 2, columnW, 2, {
      fill: { color: 0xffffff, alpha: 0.7 },
    });
  }

  // 4. Coroa de tentáculos ondulantes radiados (tentáculos externos e internos)
  const tentacles = [
    { x1: columnX - 1, y1: columnY, x2: columnX - 12, y2: columnY - 14, tipX: columnX - 14, tipY: columnY - 16 },
    { x1: columnX + 3, y1: columnY - 2, x2: columnX - 6, y2: columnY - 18, tipX: columnX - 8, tipY: columnY - 21 },
    { x1: columnX + 8, y1: columnY - 3, x2: columnX + 2, y2: columnY - 22, tipX: columnX + 1, tipY: columnY - 25 },
    { x1: columnX + 14, y1: columnY - 3, x2: columnX + 14, y2: columnY - 24, tipX: columnX + 14, tipY: columnY - 27 },
    { x1: columnX + 20, y1: columnY - 3, x2: columnX + 25, y2: columnY - 22, tipX: columnX + 27, tipY: columnY - 25 },
    { x1: columnX + 25, y1: columnY - 2, x2: columnX + 34, y2: columnY - 18, tipX: columnX + 36, tipY: columnY - 21 },
    { x1: columnX + columnW, y1: columnY, x2: columnX + columnW + 11, y2: columnY - 14, tipX: columnX + columnW + 13, tipY: columnY - 16 },
  ];

  if (typeof gfx.drawLine === "function") {
    for (const t of tentacles) {
      gfx.drawLine(
        [
          { x: t.x1, y: t.y1 },
          { x: t.x2, y: t.y2 },
        ],
        { color: tentacleColor, width: 3, alpha: 0.95 }
      );
    }
  } else if (typeof gfx.drawRect === "function") {
    for (const t of tentacles) {
      gfx.drawRect(t.x2 - 1, t.y2, 3, 10, { fill: { color: tentacleColor, alpha: 0.95 } });
    }
  }

  // 5. Pontas luminosas dos tentáculos (pólipos luminosos / pontas bulbosas)
  if (typeof gfx.drawRect === "function") {
    for (const t of tentacles) {
      gfx.drawRect(t.tipX - 2, t.tipY - 2, 4, 4, {
        fill: { color: tipColor, alpha: 1.0 },
      });
      gfx.drawRect(t.tipX - 1, t.tipY - 1, 2, 2, {
        fill: { color: 0xffffff, alpha: 0.9 },
      });
    }
  }
}

/**
 * Desenha um tentáculo individual 16-bits para anêmonas animadas dinâmicas.
 */
export function draw16BitAnemoneTentacle(
  gfx: any,
  tentacleColor: number,
  tipColor: number,
  width: number = 8,
  height: number = 22
): void {
  const centerX = Math.round(width / 2);

  if (typeof gfx.drawRect === "function") {
    // Base do tentáculo (mais larga)
    gfx.drawRect(centerX - 2, height - 8, 4, 8, {
      fill: { color: tentacleColor, alpha: 0.95 },
    });
    // Meio do tentáculo (afilado)
    gfx.drawRect(centerX - 1.5, height - 16, 3, 8, {
      fill: { color: tentacleColor, alpha: 0.95 },
    });
    // Ponta do tentáculo
    gfx.drawRect(centerX - 1, height - 20, 2, 4, {
      fill: { color: tentacleColor, alpha: 0.95 },
    });

    // Pólipo luminoso no topo (bulbo terminal)
    gfx.drawRect(centerX - 2, 0, 4, 4, {
      fill: { color: tipColor, alpha: 1.0 },
    });
    gfx.drawRect(centerX - 1, 1, 2, 2, {
      fill: { color: 0xffffff, alpha: 0.9 },
    });
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
 * - Corpo fusiforme em camadas anatômicas (dorso sombreado, flanco médio e contra-sombreamento ventral)
 * - Nadadeira dorsal definida e nadadeira ventral/anal
 * - Cauda bifurcada pronunciada em V (forked caudal fin)
 * - Faixa lateral e listras tropicais transversais
 * - Nadadeira peitoral sobreposta
 * - Olho pixelado anatômico (esclera branca, pupila preta, brilho especular puro)
 */
export function draw16BitReefFish(
  gfx: any,
  bodyColor: number,
  finColor: number,
  stripeColor: number,
  bellyColorOrWidth?: number,
  widthOrHeight?: number,
  maybeHeight?: number
): void {
  let bellyColor: number = ARRAIAL_16BIT_PALETTE.FISH_BELLY_LIGHT;
  let _width = 24;
  let height = 12;

  if (typeof bellyColorOrWidth === "number") {
    if (bellyColorOrWidth <= 64) {
      _width = bellyColorOrWidth;
      if (typeof widthOrHeight === "number") height = widthOrHeight;
    } else {
      bellyColor = bellyColorOrWidth;
      if (typeof widthOrHeight === "number") _width = widthOrHeight;
      if (typeof maybeHeight === "number") height = maybeHeight;
    }
  }

  void _width;
  const centerY = Math.round(height / 2);

  // 1. Cauda bifurcada em V (Forked caudal tail) à esquerda (x = 1 a 6)
  if (typeof gfx.drawPolygon === "function") {
    // Lobo superior da cauda bifurcada
    gfx.drawPolygon(
      [
        { x: 1, y: centerY - 5 },
        { x: 6, y: centerY - 1 },
        { x: 4, y: centerY },
        { x: 1, y: centerY - 2 },
      ],
      { fill: { color: finColor, alpha: 0.98 } }
    );

    // Lobo inferior da cauda bifurcada
    gfx.drawPolygon(
      [
        { x: 1, y: centerY + 5 },
        { x: 6, y: centerY + 1 },
        { x: 4, y: centerY },
        { x: 1, y: centerY + 2 },
      ],
      { fill: { color: finColor, alpha: 0.98 } }
    );
  } else if (typeof gfx.drawRect === "function") {
    gfx.drawRect(1, centerY - 5, 4, 3, { fill: { color: finColor, alpha: 0.98 } });
    gfx.drawRect(1, centerY + 2, 4, 3, { fill: { color: finColor, alpha: 0.98 } });
    gfx.drawRect(4, centerY - 1, 3, 3, { fill: { color: finColor, alpha: 0.98 } });
  }

  // 2. Nadadeira dorsal definida (topo traseiro e médio, x = 11 a 18)
  if (typeof gfx.drawPolygon === "function") {
    gfx.drawPolygon(
      [
        { x: 11, y: centerY - 3 },
        { x: 15, y: 1 },
        { x: 18, y: centerY - 3 },
      ],
      { fill: { color: finColor, alpha: 0.95 } }
    );
  } else if (typeof gfx.drawRect === "function") {
    gfx.drawRect(13, 1, 5, 3, { fill: { color: finColor, alpha: 0.95 } });
  }

  // 3. Nadadeira ventral/anal (baixo, x = 11 a 17)
  if (typeof gfx.drawPolygon === "function") {
    gfx.drawPolygon(
      [
        { x: 11, y: centerY + 3 },
        { x: 15, y: height - 1 },
        { x: 17, y: centerY + 3 },
      ],
      { fill: { color: finColor, alpha: 0.95 } }
    );
  } else if (typeof gfx.drawRect === "function") {
    gfx.drawRect(13, height - 3, 4, 2, { fill: { color: finColor, alpha: 0.95 } });
  }

  // 4. Corpo fusiforme em camadas anatômicas
  if (typeof gfx.drawRect === "function") {
    // Pedúnculo caudal
    gfx.drawRect(5, centerY - 2, 3, 4, { fill: { color: bodyColor, alpha: 1.0 } });

    // Dorso sombreado (camada superior do torso)
    gfx.drawRect(8, centerY - 4, 12, 2, { fill: { color: finColor, alpha: 0.85 } });

    // Flanco médio (corpo principal)
    gfx.drawRect(7, centerY - 3, 4, 6, { fill: { color: bodyColor, alpha: 1.0 } });
    gfx.drawRect(10, centerY - 3, 9, 6, { fill: { color: bodyColor, alpha: 1.0 } });

    // Cabeça e focinho hidrodinâmico
    gfx.drawRect(19, centerY - 3, 3, 6, { fill: { color: bodyColor, alpha: 1.0 } });
    gfx.drawRect(22, centerY - 1, 2, 3, { fill: { color: bodyColor, alpha: 1.0 } });

    // 5. Barriga iluminada / Contra-sombreamento ventral (ventral counter-shading)
    gfx.drawRect(8, centerY + 2, 11, 2, {
      fill: { color: bellyColor, alpha: 0.95 },
    });

    // 6. Listras e marcações tropicais (faixas transversais de recife)
    gfx.drawRect(11, centerY - 3, 2, 6, {
      fill: { color: stripeColor, alpha: 0.98 },
    });
    gfx.drawRect(15, centerY - 3, 2, 6, {
      fill: { color: stripeColor, alpha: 0.98 },
    });

    // Faixa lateral horizontal
    gfx.drawRect(6, centerY - 1, 13, 2, {
      fill: { color: stripeColor, alpha: 0.95 },
    });

    // 7. Nadadeira peitoral sobreposta
    gfx.drawRect(13, centerY, 4, 3, {
      fill: { color: finColor, alpha: 0.92 },
    });

    // 8. Olho anatômico com pixel de brilho especular
    // Esclera branca
    gfx.drawRect(18, centerY - 3, 3, 3, {
      fill: { color: ARRAIAL_16BIT_PALETTE.FISH_EYE_SCLERA, alpha: 1.0 },
    });
    // Pupila preta
    gfx.drawRect(19, centerY - 3, 2, 2, {
      fill: { color: ARRAIAL_16BIT_PALETTE.FISH_EYE_PUPIL, alpha: 1.0 },
    });
    // Brilho especular
    gfx.drawRect(19, centerY - 3, 1, 1, {
      fill: { color: ARRAIAL_16BIT_PALETTE.FISH_EYE_SPECULAR, alpha: 1.0 },
    });
  }
}

export interface SanctuaryTextures {
  readonly available: boolean;
  readonly brainCorals: unknown[];
  readonly seaFans: unknown[];
  readonly anemones: unknown[];
  readonly anemoneTentacles: unknown[];
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
      anemones: [],
      anemoneTentacles: [],
      sponges: [],
      fishVariants: [],
    };
  }

  const brainCorals: unknown[] = [];
  const seaFans: unknown[] = [];
  const anemones: unknown[] = [];
  const anemoneTentacles: unknown[] = [];
  const sponges: unknown[] = [];
  const fishVariants: unknown[] = [];

  const bakeOptions = { resolution: 0.5, scaleMode: "nearest" as const };

  try {
    // A. Corais-Cérebro: Laranja-coral e Roxo-recife com pólipos dourados/ciano
    const brainConfigs = [
      {
        main: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
        base: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_DARK,
        hl: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_LIGHT,
        polyp: ARRAIAL_16BIT_PALETTE.POLYP_GLOW_GOLD,
      },
      {
        main: ARRAIAL_16BIT_PALETTE.REEF_PURPLE,
        base: ARRAIAL_16BIT_PALETTE.REEF_PURPLE_DARK,
        hl: ARRAIAL_16BIT_PALETTE.REEF_PURPLE_LIGHT,
        polyp: ARRAIAL_16BIT_PALETTE.POLYP_GLOW_CYAN,
      },
    ];
    for (let i = 0; i < brainConfigs.length; i++) {
      const g = engine.createGraphics(`brain_coral_bake_${i}`);
      draw16BitBrainCoral(
        g,
        brainConfigs[i].main,
        brainConfigs[i].base,
        brainConfigs[i].hl,
        64,
        40,
        brainConfigs[i].polyp
      );
      const tex = engine.generateTexture(g, bakeOptions);
      if (g && typeof g.destroy === "function") g.destroy();
      if (tex) brainCorals.push(tex);
    }

    // B. Gorgônias Ramificadas: Turquesa e Laranja-coral com nós dendríticos e pólipos
    const fanConfigs = [
      {
        main: ARRAIAL_16BIT_PALETTE.TURQUOISE,
        base: ARRAIAL_16BIT_PALETTE.TURQUOISE_DARK,
        accent: ARRAIAL_16BIT_PALETTE.TURQUOISE_LIGHT,
        polyp: ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
      },
      {
        main: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
        base: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_DARK,
        accent: ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
        polyp: ARRAIAL_16BIT_PALETTE.POLYP_GLOW_CYAN,
      },
    ];
    for (let i = 0; i < fanConfigs.length; i++) {
      const g = engine.createGraphics(`fan_coral_bake_${i}`);
      draw16BitGorgonianFan(
        g,
        fanConfigs[i].main,
        fanConfigs[i].base,
        fanConfigs[i].accent,
        60,
        64,
        fanConfigs[i].polyp
      );
      const tex = engine.generateTexture(g, bakeOptions);
      if (g && typeof g.destroy === "function") g.destroy();
      if (tex) seaFans.push(tex);
    }

    // C. Anêmonas com coluna carnosa, tentáculos e pontas luminosas
    const anemoneConfigs = [
      {
        body: ARRAIAL_16BIT_PALETTE.ANEMONE_BODY_TEAL,
        base: ARRAIAL_16BIT_PALETTE.ANEMONE_BODY_DARK,
        tentacle: ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_PINK,
        tip: ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_TIP,
      },
      {
        body: ARRAIAL_16BIT_PALETTE.REEF_PURPLE,
        base: ARRAIAL_16BIT_PALETTE.REEF_PURPLE_DARK,
        tentacle: ARRAIAL_16BIT_PALETTE.TURQUOISE,
        tip: ARRAIAL_16BIT_PALETTE.ANEMONE_CYAN_TIP,
      },
    ];
    for (let i = 0; i < anemoneConfigs.length; i++) {
      const g = engine.createGraphics(`anemone_bake_${i}`);
      draw16BitAnemone(
        g,
        anemoneConfigs[i].body,
        anemoneConfigs[i].base,
        anemoneConfigs[i].tentacle,
        anemoneConfigs[i].tip,
        56,
        44
      );
      const tex = engine.generateTexture(g, bakeOptions);
      if (g && typeof g.destroy === "function") g.destroy();
      if (tex) anemones.push(tex);
    }

    // C.2. Tentáculos individuais para ondulação orgânica dinâmica
    for (let i = 0; i < anemoneConfigs.length; i++) {
      const g = engine.createGraphics(`anemone_tentacle_bake_${i}`);
      draw16BitAnemoneTentacle(g, anemoneConfigs[i].tentacle, anemoneConfigs[i].tip, 8, 22);
      const tex = engine.generateTexture(g, bakeOptions);
      if (g && typeof g.destroy === "function") g.destroy();
      if (tex) anemoneTentacles.push(tex);
    }

    // D. Esponjas: Amarelo-sol, Roxo-recife e Turquesa
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

    // E. Peixes de Recife com corpo fusiforme em camadas, contra-sombreamento ventral,
    // cauda bifurcada em V, nadadeiras, faixas tropicais e olho com pixel especular
    const fishConfigs = [
      // Amarelo-sol com nadadeiras laranja, faixas turquesa e barriga creme
      {
        body: ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
        fin: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
        stripe: ARRAIAL_16BIT_PALETTE.TURQUOISE,
        belly: ARRAIAL_16BIT_PALETTE.FISH_BELLY_SHADOW,
      },
      // Turquesa com nadadeiras roxas, faixas amarelo-sol e barriga ciano-claro
      {
        body: ARRAIAL_16BIT_PALETTE.TURQUOISE,
        fin: ARRAIAL_16BIT_PALETTE.REEF_PURPLE,
        stripe: ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
        belly: ARRAIAL_16BIT_PALETTE.FISH_TURQUOISE_BELLY,
      },
      // Roxo-recife com nadadeiras amarelo-sol, faixas turquesa e barriga lavanda
      {
        body: ARRAIAL_16BIT_PALETTE.REEF_PURPLE,
        fin: ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
        stripe: ARRAIAL_16BIT_PALETTE.TURQUOISE,
        belly: ARRAIAL_16BIT_PALETTE.FISH_PURPLE_BELLY,
      },
      // Laranja-coral com faixas claras e barriga branca
      {
        body: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
        fin: ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_DARK,
        stripe: ARRAIAL_16BIT_PALETTE.FISH_BELLY_LIGHT,
        belly: ARRAIAL_16BIT_PALETTE.FISH_BELLY_LIGHT,
      },
    ];
    for (let i = 0; i < fishConfigs.length; i++) {
      const g = engine.createGraphics(`reef_fish_bake_${i}`);
      draw16BitReefFish(
        g,
        fishConfigs[i].body,
        fishConfigs[i].fin,
        fishConfigs[i].stripe,
        fishConfigs[i].belly,
        24,
        12
      );
      const tex = engine.generateTexture(g, bakeOptions);
      if (g && typeof g.destroy === "function") g.destroy();
      if (tex) fishVariants.push(tex);
    }
  } catch (error) {
    console.warn("[Sanctuary16Bit] Falha no pre-bake das texturas:", error);
  }

  const available =
    brainCorals.length > 0 &&
    seaFans.length > 0 &&
    anemones.length > 0 &&
    anemoneTentacles.length > 0 &&
    sponges.length > 0 &&
    fishVariants.length > 0;

  return {
    available,
    brainCorals,
    seaFans,
    anemones,
    anemoneTentacles,
    sponges,
    fishVariants,
  };
}
