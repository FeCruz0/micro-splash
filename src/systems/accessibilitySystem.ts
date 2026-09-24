/**
 * Sistema de Acessibilidade Visual e Filtros Daltonismo / Alto Contraste
 * Fase 18.2 do Micro Splash
 */

export type ColorMode = "normal" | "protanopia" | "deuteranopia" | "high_contrast";

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  normal: "Cores: PADRÃO 🎨",
  protanopia: "Cores: PROTANOPIA 👁️",
  deuteranopia: "Cores: DEUTERANOPIA 👁️",
  high_contrast: "Cores: ALTO CONTRASTE ⚡",
};

const STORAGE_KEY = "micro_splash_color_mode";
let currentColorMode: ColorMode = "normal";

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

class AccessibilitySystem {
  constructor() {
    this.loadSettings();
  }

  public init(): void {
    this.loadSettings();
    applyCanvasFilter(currentColorMode);
  }

  public getColorMode(): ColorMode {
    return currentColorMode;
  }

  public setColorMode(mode: ColorMode): void {
    currentColorMode = mode;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, mode);
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

  private loadSettings(): void {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem(STORAGE_KEY) as ColorMode | null;
        if (
          saved &&
          (saved === "normal" ||
            saved === "protanopia" ||
            saved === "deuteranopia" ||
            saved === "high_contrast")
        ) {
          currentColorMode = saved;
        }
      }
    } catch {}
  }
}

export const accessibilitySystem = new AccessibilitySystem();
