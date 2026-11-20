/**
 * Ícones Pixel Art 16-Bit para o Menu Principal — Micro Splash
 *
 * Grade lógica de 12x12 pixels desenhada diretamente via IGraphicsNode.drawRect,
 * garantindo estilo uniforme sem dependência de emojis de sistema operacional.
 */

import type { IGraphicsNode, IRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";

export type MenuPixelIconKind = "wave" | "trophy" | "chart" | "book" | "gear" | "whale";

type RgbColor = readonly [number, number, number];

interface IconPalette {
  readonly primary: RgbColor;
  readonly highlight: RgbColor;
  readonly shadow: RgbColor;
}

const ICON_GRIDS: Record<MenuPixelIconKind, readonly string[]> = {
  wave: [
    "............",
    "....BBBB....",
    "..BBHHHHBB..",
    ".BHBBBBBBH..",
    ".HB......B..",
    "....BBBB....",
    "..BBHHHHBB..",
    ".BHBBBBBBSB.",
    ".BSSSSSSSSB.",
    "..SSSSSSSS..",
    "............",
    "............",
  ],
  trophy: [
    "............",
    "..HHHHHHHH..",
    ".BHHHHHHHHB.",
    ".BHBBBBBBHB.",
    "..BBBBBBBB..",
    "...BBBBBB...",
    "....SSSS....",
    "....SSSS....",
    "...BBBBBB...",
    "..SSSSSSSS..",
    "............",
    "............",
  ],
  chart: [
    "............",
    ".........HH.",
    ".........HB.",
    "......HH.HB.",
    "......HB.HB.",
    "...HH.HB.HB.",
    "...HB.HB.HB.",
    ".HHHB.HB.HB.",
    ".BBBBBBBBBB.",
    ".SSSSSSSSSS.",
    "............",
    "............",
  ],
  book: [
    "............",
    ".HHHHHHHHHH.",
    ".HBBBBBBBBH.",
    ".HBHHBBHHBH.",
    ".HBBBBBBBBH.",
    ".HBHHBBHHBH.",
    ".HBBBBBBBBH.",
    ".HBSSSSSSBH.",
    ".SSSSSSSSSS.",
    "............",
    "............",
    "............",
  ],
  gear: [
    "............",
    "....HHHH....",
    "..HHBBBBHH..",
    "..HBBSSBBH..",
    ".HBBSSSSBBH.",
    ".HBBSSSSBBH.",
    "..HBBSSBBH..",
    "..SSBBBBSS..",
    "....SSSS....",
    "............",
    "............",
    "............",
  ],
  whale: [
    "............",
    "............",
    "...HHHHH....",
    "..HBBBBBB...",
    ".HBBBBBBBB.H",
    ".BBBBBBBBBBH",
    ".SSSSSSBBBB.",
    "...SSSSSSSS.",
    "............",
    "............",
    "............",
    "............",
  ],
};

const ICON_PALETTES: Record<MenuPixelIconKind, IconPalette> = {
  wave: {
    primary: [110, 232, 250],
    highlight: [220, 252, 255],
    shadow: [38, 152, 198],
  },
  trophy: {
    primary: [232, 188, 72],
    highlight: [255, 232, 148],
    shadow: [168, 124, 34],
  },
  chart: {
    primary: [86, 206, 232],
    highlight: [188, 244, 255],
    shadow: [36, 122, 168],
  },
  book: {
    primary: [142, 206, 245],
    highlight: [224, 245, 255],
    shadow: [58, 118, 174],
  },
  gear: {
    primary: [128, 194, 236],
    highlight: [208, 238, 255],
    shadow: [52, 112, 162],
  },
  whale: {
    primary: [126, 212, 245],
    highlight: [210, 246, 255],
    shadow: [48, 126, 178],
  },
};

/**
 * Cria um nó gráfico PixiJS 8 contendo o ícone pixel art centralizado em (centerX, centerY).
 */
export function createMenuPixelIconNode(
  renderEngine: IRenderEngine,
  kind: MenuPixelIconKind,
  centerX: number,
  centerY: number,
  pixelSize: number = 1.6,
  zIndex: number = 13
): IGraphicsNode {
  const graphicsNode = renderEngine.createGraphics(`menu_icon_${kind}`);
  const grid = ICON_GRIDS[kind];
  const palette = ICON_PALETTES[kind];
  const halfSize = (12 * pixelSize) / 2;

  for (let row = 0; row < grid.length; row++) {
    const line = grid[row];
    for (let col = 0; col < line.length; col++) {
      const symbol = line[col];
      if (symbol === ".") continue;
      const color =
        symbol === "H" ? palette.highlight : symbol === "S" ? palette.shadow : palette.primary;
      graphicsNode.drawRect(
        col * pixelSize - halfSize,
        row * pixelSize - halfSize,
        pixelSize + 0.15,
        pixelSize + 0.15,
        { fill: { color, alpha: 0.96 } }
      );
    }
  }

  graphicsNode.setPosition(centerX, centerY);
  graphicsNode.setZIndex(zIndex);
  return graphicsNode;
}

const TITLE_GLYPHS: Record<string, readonly string[]> = {
  M: ["1...1", "11.11", "1.1.1", "1...1", "1...1", "1...1", "1...1"],
  I: ["11111", "..1..", "..1..", "..1..", "..1..", "..1..", "11111"],
  C: [".1111", "1....", "1....", "1....", "1....", "1....", ".1111"],
  R: ["1111.", "1...1", "1...1", "1111.", "1.1..", "1..1.", "1...1"],
  O: [".111.", "1...1", "1...1", "1...1", "1...1", "1...1", ".111."],
  S: [".1111", "1....", "1....", ".111.", "....1", "....1", "1111."],
  P: ["1111.", "1...1", "1...1", "1111.", "1....", "1....", "1...."],
  L: ["1....", "1....", "1....", "1....", "1....", "1....", "11111"],
  A: [".111.", "1...1", "1...1", "11111", "1...1", "1...1", "1...1"],
  H: ["1...1", "1...1", "1...1", "11111", "1...1", "1...1", "1...1"],
  " ": ["...", "...", "...", "...", "...", "...", "..."],
};

/**
 * Renderiza o título "MICRO SPLASH" em pixel art 5x7 nativa (sem aparência sci-fi),
 * com sombra abissal discreta e realce superior em ciano luminoso.
 */
export function createMenuPixelTitleNode(
  renderEngine: IRenderEngine,
  text: string,
  centerX: number,
  centerY: number,
  pixelSize: number = 5,
  zIndex: number = 11
): IGraphicsNode {
  const graphicsNode = renderEngine.createGraphics("menu_pixel_title");
  const chars = text.toUpperCase().split("");
  const glyphWidths = chars.map((ch) => (TITLE_GLYPHS[ch]?.[0].length ?? 3) * pixelSize);
  const letterGap = pixelSize * 1.4;
  const totalWidth =
    glyphWidths.reduce((acc, w) => acc + w, 0) + Math.max(0, chars.length - 1) * letterGap;
  const totalHeight = 7 * pixelSize;

  let cursorX = -totalWidth / 2;
  const startY = -totalHeight / 2;
  const shadowOffset = Math.max(2, Math.round(pixelSize * 0.55));

  for (let idx = 0; idx < chars.length; idx++) {
    const glyph = TITLE_GLYPHS[chars[idx]] ?? TITLE_GLYPHS[" "];
    for (let row = 0; row < glyph.length; row++) {
      const line = glyph[row];
      for (let col = 0; col < line.length; col++) {
        if (line[col] !== "1") continue;
        const px = cursorX + col * pixelSize;
        const py = startY + row * pixelSize;

        // Sombra abissal discreta
        graphicsNode.drawRect(
          px + shadowOffset,
          py + shadowOffset,
          pixelSize + 0.2,
          pixelSize + 0.2,
          {
            fill: { color: [3, 14, 34], alpha: 0.78 },
          }
        );

        // Corpo em ciano luminoso com realce sutil nas 2 linhas superiores
        const fillColor: [number, number, number] = row <= 1 ? [174, 246, 255] : [116, 232, 252];
        graphicsNode.drawRect(px, py, pixelSize + 0.2, pixelSize + 0.2, {
          fill: { color: fillColor, alpha: 0.98 },
        });
      }
    }
    cursorX += glyphWidths[idx] + letterGap;
  }

  graphicsNode.setPosition(centerX, centerY);
  graphicsNode.setZIndex(zIndex);
  return graphicsNode;
}
