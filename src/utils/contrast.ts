export type RGBColor = [number, number, number] | { r: number; g: number; b: number };

/**
 * Normaliza uma representação de cor RGB em tupla [r, g, b] com valores inteiros [0, 255].
 */
export function normalizeRgb(color: RGBColor): [number, number, number] {
  if (Array.isArray(color)) {
    return [Math.round(color[0]), Math.round(color[1]), Math.round(color[2])];
  }
  return [Math.round(color.r), Math.round(color.g), Math.round(color.b)];
}

/**
 * Calcula a luminância relativa de uma cor RGB conforme a especificação W3C WCAG 2.1.
 * Retorna um valor no intervalo [0.0, 1.0].
 */
export function calculateRelativeLuminance(color: RGBColor): number {
  const [r255, g255, b255] = normalizeRgb(color);

  const [rLinear, gLinear, bLinear] = [r255 / 255, g255 / 255, b255 / 255].map((channel) => {
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calcula a razão de contraste entre duas cores RGB segundo a fórmula WCAG 2.1:
 * (Lighter + 0.05) / (Darker + 0.05)
 * O resultado varia entre 1.0 (sem contraste) e 21.0 (máximo contraste: preto vs branco).
 */
export function calculateContrastRatio(colorA: RGBColor, colorB: RGBColor): number {
  const luminanceA = calculateRelativeLuminance(colorA);
  const luminanceB = calculateRelativeLuminance(colorB);

  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Avalia se o par de cores satisfaz os critérios de acessibilidade WCAG 2.1 Nível AA:
 * - Texto padrão (< 18pt): razão de contraste mínima de 4.5:1.
 * - Texto grande (>= 18pt ou >= 14pt em negrito): razão de contraste mínima de 3.0:1.
 */
export function isWcagAaCompliant(
  foregroundColor: RGBColor,
  backgroundColor: RGBColor,
  isLargeText = false
): boolean {
  const ratio = calculateContrastRatio(foregroundColor, backgroundColor);
  const minimumThreshold = isLargeText ? 3.0 : 4.5;
  return ratio >= minimumThreshold;
}
