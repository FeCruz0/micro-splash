import type { KaboomCtx } from "kaboom";

/**
 * Sistema de Acessibilidade Universal, Filtros Daltonismo, Movimento Reduzido e Fontes Dinâmicas
 * Fases 18.2 e 26 do Micro Splash (WCAG 2.1 nível AA & LGPD)
 */

export type ColorMode = "normal" | "protanopia" | "deuteranopia" | "high_contrast";
export type ReducedMotionMode = "auto" | "reduced" | "full";
export type FontScaleKey = "small" | "normal" | "large";

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  normal: "Cores: PADRÃO 🎨",
  protanopia: "Cores: PROTANOPIA 👁️",
  deuteranopia: "Cores: DEUTERANOPIA 👁️",
  high_contrast: "Cores: ALTO CONTRASTE ⚡",
};

export const REDUCED_MOTION_LABELS: Record<ReducedMotionMode, string> = {
  auto: "Movimento: AUTOMÁTICO 🌊",
  reduced: "Movimento: REDUZIDO 🧘",
  full: "Movimento: COMPLETO ⚡",
};

export const FONT_SCALE_LABELS: Record<FontScaleKey, string> = {
  small: "Fonte: PEQUENA 🔡",
  normal: "Fonte: NORMAL 🔤",
  large: "Fonte: GRANDE 🔠",
};

export const FONT_SCALE_MULTIPLIERS: Record<FontScaleKey, number> = {
  small: 0.85,
  normal: 1.0,
  large: 1.2,
};

const STORAGE_KEY_COLOR = "micro_splash_color_mode";
const STORAGE_KEY_REDUCED_MOTION = "micro_splash_reduced_motion";
const STORAGE_KEY_FONT_SCALE = "micro_splash_font_scale";

let currentColorMode: ColorMode = "normal";
let currentReducedMotion: ReducedMotionMode = "auto";
let currentFontScale: FontScaleKey = "normal";

/**
 * Cria e injeta no DOM os filtros SVG baseados nas matrizes padrão Brettel/Machado
 * para compensação e simulação de Protanopia e Deuteranopia.
 */
function ensureSvgFiltersInjected(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("micro-splash-accessibility-filters")) return;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "micro-splash-accessibility-filters";
  svg.setAttribute(
    "style",
    "position: absolute; width: 0; height: 0; pointer-events: none; overflow: hidden;"
  );

  svg.innerHTML = `
    <defs>
      <!-- Protanopia: Perda de sensibilidade aos cones vermelhos (Brettel et al.) -->
      <filter id="filter-protanopia" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="
          0.56667 0.43333 0.00000 0 0
          0.55833 0.44167 0.00000 0 0
          0.00000 0.24167 0.75833 0 0
          0.00000 0.00000 0.00000 1 0
        "/>
      </filter>

      <!-- Deuteranopia: Perda de sensibilidade aos cones verdes (Brettel et al.) -->
      <filter id="filter-deuteranopia" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="
          0.62500 0.37500 0.00000 0 0
          0.70000 0.30000 0.00000 0 0
          0.00000 0.30000 0.70000 0 0
          0.00000 0.00000 0.00000 1 0
        "/>
      </filter>
    </defs>
  `;

  document.body.appendChild(svg);
}

/**
 * Aplica os filtros CSS ao canvas do jogo
 */
function applyCanvasFilter(mode: ColorMode): void {
  if (typeof document === "undefined") return;

  ensureSvgFiltersInjected();

  const canvas = document.querySelector("canvas");
  if (!canvas) return;

  switch (mode) {
    case "protanopia":
      canvas.style.filter = "url('#filter-protanopia')";
      break;
    case "deuteranopia":
      canvas.style.filter = "url('#filter-deuteranopia')";
      break;
    case "high_contrast":
      canvas.style.filter = "contrast(140%) saturate(135%) brightness(108%)";
      break;
    case "normal":
    default:
      canvas.style.filter = "none";
      break;
  }
}

export class AccessibilitySystem {
  constructor() {
    this.loadSettings();
  }

  public init(): void {
    this.loadSettings();
    applyCanvasFilter(currentColorMode);
  }

  // --- FILTROS DE CORES & DALTONISMO ---

  public getColorMode(): ColorMode {
    return currentColorMode;
  }

  public setColorMode(mode: ColorMode): void {
    currentColorMode = mode;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY_COLOR, mode);
      }
    } catch {}
    applyCanvasFilter(mode);
  }

  public cycleNextColorMode(): ColorMode {
    const modes: ColorMode[] = ["normal", "protanopia", "deuteranopia", "high_contrast"];
    const currentIdx = modes.indexOf(currentColorMode);
    const nextIdx = (currentIdx + 1) % modes.length;
    const nextMode = modes[nextIdx];
    this.setColorMode(nextMode);
    return nextMode;
  }

  public getLabel(): string {
    return COLOR_MODE_LABELS[currentColorMode] || COLOR_MODE_LABELS.normal;
  }

  public isHighContrast(): boolean {
    return currentColorMode === "high_contrast";
  }

  // --- MOVIMENTO REDUZIDO (PREFERS-REDUCED-MOTION) ---

  public getReducedMotionMode(): ReducedMotionMode {
    return currentReducedMotion;
  }

  public setReducedMotion(mode: ReducedMotionMode): void {
    currentReducedMotion = mode;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY_REDUCED_MOTION, mode);
      }
    } catch {}
  }

  public cycleReducedMotion(): ReducedMotionMode {
    const modes: ReducedMotionMode[] = ["auto", "reduced", "full"];
    const currentIdx = modes.indexOf(currentReducedMotion);
    const nextIdx = (currentIdx + 1) % modes.length;
    const nextMode = modes[nextIdx];
    this.setReducedMotion(nextMode);
    return nextMode;
  }

  public getReducedMotionLabel(): string {
    return REDUCED_MOTION_LABELS[currentReducedMotion] || REDUCED_MOTION_LABELS.auto;
  }

  /**
   * Determina se animações intensas, tremores de tela e flashes devem ser desativados
   */
  public isReducedMotion(): boolean {
    if (currentReducedMotion === "reduced") return true;
    if (currentReducedMotion === "full") return false;

    // Modo "auto": detecta consulta de mídia do SO
    try {
      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      }
    } catch {}
    return false;
  }

  // --- ESCALONAMENTO DE TAMANHO DE FONTE NA UI ---

  public getFontScaleKey(): FontScaleKey {
    return currentFontScale;
  }

  public getFontScale(): number {
    return FONT_SCALE_MULTIPLIERS[currentFontScale] || 1.0;
  }

  public setFontScale(key: FontScaleKey): void {
    currentFontScale = key;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY_FONT_SCALE, key);
      }
    } catch {}
  }

  public cycleFontScale(): FontScaleKey {
    const scales: FontScaleKey[] = ["normal", "large", "small"];
    const currentIdx = scales.indexOf(currentFontScale);
    const nextIdx = (currentIdx + 1) % scales.length;
    const nextScale = scales[nextIdx];
    this.setFontScale(nextScale);
    return nextScale;
  }

  public getFontScaleLabel(): string {
    return FONT_SCALE_LABELS[currentFontScale] || FONT_SCALE_LABELS.normal;
  }

  /**
   * Aplica o multiplicador de fonte atual a um tamanho base
   */
  public scaleFont(baseSize: number): number {
    return Math.round(baseSize * this.getFontScale());
  }

  /**
   * Dispara um tremor de tela (screen shake) respeitando a preferência de movimento reduzido
   */
  public triggerShake(k: KaboomCtx, intensity: number): void {
    if (this.isReducedMotion()) return;
    try {
      k.shake(intensity);
    } catch {}
  }

  // --- COMPLIANCE LGPD & EXCLUSÃO TOTAL DE DADOS ---

  /**
   * Remove todas as chaves do Micro Splash salvas no localStorage e redefine o estado
   */
  public clearAllUserData(): void {
    try {
      if (typeof localStorage !== "undefined") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("micro_splash_")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }
    } catch {}

    currentColorMode = "normal";
    currentReducedMotion = "auto";
    currentFontScale = "normal";
    applyCanvasFilter("normal");
  }

  private loadSettings(): void {
    try {
      if (typeof localStorage !== "undefined") {
        // Cores
        const savedColor = localStorage.getItem(STORAGE_KEY_COLOR) as ColorMode | null;
        if (
          savedColor &&
          (savedColor === "normal" ||
            savedColor === "protanopia" ||
            savedColor === "deuteranopia" ||
            savedColor === "high_contrast")
        ) {
          currentColorMode = savedColor;
        }

        // Movimento reduzido
        const savedMotion = localStorage.getItem(
          STORAGE_KEY_REDUCED_MOTION
        ) as ReducedMotionMode | null;
        if (
          savedMotion &&
          (savedMotion === "auto" || savedMotion === "reduced" || savedMotion === "full")
        ) {
          currentReducedMotion = savedMotion;
        }

        // Tamanho de fonte
        const savedFont = localStorage.getItem(STORAGE_KEY_FONT_SCALE) as FontScaleKey | null;
        if (
          savedFont &&
          (savedFont === "small" || savedFont === "normal" || savedFont === "large")
        ) {
          currentFontScale = savedFont;
        }
      }
    } catch {}
  }
}

export const accessibilitySystem = new AccessibilitySystem();
