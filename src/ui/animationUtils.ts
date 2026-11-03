/**
 * Utilitários Universais de UI & Animação (Fase 34 e Fase 51: Polimento Visual & Transições Padronizadas)
 *
 * Desacoplado do Kaboom.js, com tipagem estrita e zero any.
 */

export const UI_TRANSITIONS = {
  MODAL_ENTER_DURATION: 0.25,
  MODAL_EXIT_DURATION: 0.18,
  FADE_SCENE_DURATION: 0.35,
  BUTTON_HOVER_SCALE: 1.04,
  TOAST_DURATION: 2.5,
} as const;

export interface ModalEntranceOptions {
  duration?: number;
  startScale?: number;
  onComplete?: () => void;
}

export interface ModalExitOptions {
  duration?: number;
  endScale?: number;
  onComplete?: () => void;
}

export interface AnimationUiObject {
  scale?: { x: number; y: number };
  opacity?: number;
  color?: unknown;
  pos?: { x: number; y: number };
  angle?: number;
  onHoverUpdate?(callback: () => void): unknown;
  onHoverEnd?(callback: () => void): unknown;
  onUpdate?(callback: () => void): unknown;
}

export interface AnimationEngineContext<TObj = unknown> {
  width(): number;
  height(): number;
  rand(min: number, max: number): number;
  dt(): number;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  anchor?(anchorPoint: "center"): unknown;
  rotate?(degrees: number): unknown;
  opacity?(alpha: number): unknown;
  fixed?(): unknown;
  z?(layerIndex: number): unknown;
  vec2?(x: number, y: number): { x: number; y: number };
  add(components?: unknown): TObj;
  destroy?(targetObject: unknown): void;
  tween?(
    from: number,
    to: number,
    duration: number,
    setter: (value: number) => void,
    ease?: unknown
  ): { then(callback: () => void): void };
  wait?(duration: number, callback: () => void): void;
  easings?: {
    easeOutBack?: unknown;
    easeInQuad?: unknown;
    easeOutQuad?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Anima a abertura de um card modal com escala (0.85 → 1.0) e opacidade progressiva via easeOutBack (Fase 34.1 e 51.3).
 */
export function animateModalEntrance(
  engineContext: AnimationEngineContext,
  cardObj: AnimationUiObject,
  options: ModalEntranceOptions = {}
): void {
  const duration = options.duration ?? UI_TRANSITIONS.MODAL_ENTER_DURATION;
  const startScale = options.startScale ?? 0.85;

  if (!cardObj) return;

  const createVector2 = (x: number, y: number): { x: number; y: number } => {
    return typeof engineContext.vec2 === "function" ? engineContext.vec2(x, y) : { x, y };
  };

  // Define escala e opacidade iniciais
  cardObj.scale = createVector2(startScale, startScale);
  if ("opacity" in cardObj) {
    cardObj.opacity = 0;
  }

  if (typeof engineContext.tween === "function" && engineContext.easings?.easeOutBack) {
    engineContext
      .tween(
        startScale,
        1.0,
        duration,
        (val: number) => {
          try {
            cardObj.scale = createVector2(val, val);
            if ("opacity" in cardObj) {
              const progress = (val - startScale) / Math.max(0.001, 1.0 - startScale);
              cardObj.opacity = Math.min(1, Math.max(0, progress));
            }
          } catch {}
        },
        engineContext.easings.easeOutBack
      )
      .then(() => {
        try {
          cardObj.scale = createVector2(1, 1);
          if ("opacity" in cardObj) cardObj.opacity = 1;
        } catch {}
        options.onComplete?.();
      });
  } else {
    // Fallback instantâneo para ambientes sem suporte a tween
    cardObj.scale = createVector2(1, 1);
    if ("opacity" in cardObj) cardObj.opacity = 1;
    options.onComplete?.();
  }
}

/**
 * Anima o fechamento de um card modal com escala (1.0 → 0.85) e redução de opacidade via easeInQuad (Fase 51.3).
 */
export function animateModalExit(
  engineContext: AnimationEngineContext,
  cardObj: AnimationUiObject,
  options: ModalExitOptions = {}
): void {
  const duration = options.duration ?? UI_TRANSITIONS.MODAL_EXIT_DURATION;
  const endScale = options.endScale ?? 0.85;

  if (!cardObj) {
    options.onComplete?.();
    return;
  }

  const createVector2 = (x: number, y: number): { x: number; y: number } => {
    return typeof engineContext.vec2 === "function" ? engineContext.vec2(x, y) : { x, y };
  };

  if (typeof engineContext.tween === "function" && engineContext.easings?.easeInQuad) {
    engineContext
      .tween(
        1.0,
        endScale,
        duration,
        (val: number) => {
          try {
            cardObj.scale = createVector2(val, val);
            if ("opacity" in cardObj) {
              const progress = (val - endScale) / Math.max(0.001, 1.0 - endScale);
              cardObj.opacity = Math.min(1, Math.max(0, progress));
            }
          } catch {}
        },
        engineContext.easings.easeInQuad
      )
      .then(() => {
        options.onComplete?.();
      });
  } else {
    options.onComplete?.();
  }
}

export interface ButtonHoverOptions {
  baseColor: [number, number, number];
  hoverColor?: [number, number, number];
  baseScale?: number;
  hoverScale?: number;
  textObj?: AnimationUiObject;
  baseTextColor?: [number, number, number];
  hoverTextColor?: [number, number, number];
  canInteract?: () => boolean;
}

/**
 * Anexa feedback tátil consistente de hover aos botões de UI com iluminação e expansão elástica suave (Fase 34.5).
 */
export function attachButtonHoverEffect(
  engineContext: AnimationEngineContext,
  btnObj: AnimationUiObject,
  options: ButtonHoverOptions
): void {
  const baseScale = options.baseScale ?? 1.0;
  const hoverScale = options.hoverScale ?? UI_TRANSITIONS.BUTTON_HOVER_SCALE;

  const defaultHoverColor: [number, number, number] = options.hoverColor ?? [
    Math.min(255, Math.round(options.baseColor[0] * 1.25 + 18)),
    Math.min(255, Math.round(options.baseColor[1] * 1.25 + 18)),
    Math.min(255, Math.round(options.baseColor[2] * 1.25 + 18)),
  ];

  const createVector2 = (x: number, y: number): { x: number; y: number } => {
    return typeof engineContext.vec2 === "function" ? engineContext.vec2(x, y) : { x, y };
  };

  const resolveColor = (rgbValues: [number, number, number]): unknown => {
    if (typeof engineContext.rgb === "function") {
      return engineContext.rgb(rgbValues[0], rgbValues[1], rgbValues[2]);
    }
    return engineContext.color(rgbValues[0], rgbValues[1], rgbValues[2]);
  };

  if (typeof btnObj.onHoverUpdate === "function") {
    btnObj.onHoverUpdate(() => {
      if (options.canInteract && !options.canInteract()) return;
      try {
        if (typeof document !== "undefined" && document.body) {
          document.body.style.cursor = "pointer";
        }
        btnObj.scale = createVector2(hoverScale, hoverScale);
        btnObj.color = resolveColor(defaultHoverColor);
        if (options.textObj && options.hoverTextColor) {
          options.textObj.color = resolveColor(options.hoverTextColor);
        }
      } catch {}
    });
  }

  if (typeof btnObj.onHoverEnd === "function") {
    btnObj.onHoverEnd(() => {
      try {
        if (typeof document !== "undefined" && document.body) {
          document.body.style.cursor = "default";
        }
        btnObj.scale = createVector2(baseScale, baseScale);
        btnObj.color = resolveColor(options.baseColor);
        if (options.textObj && options.baseTextColor) {
          options.textObj.color = resolveColor(options.baseTextColor);
        }
      } catch {}
    });
  }
}

export const OCEAN_CONFETTI_PALETTE: [number, number, number][] = [
  [34, 211, 238], // Turquesa cintilante (#22d3ee)
  [250, 204, 21], // Ouro solar (#facc15)
  [248, 250, 252], // Branco espuma polar (#f8fafc)
  [52, 211, 153], // Verde esmeralda santuário (#34d399)
  [56, 189, 248], // Azul celeste (#38bdf8)
];

/**
 * Cria chuva de confetes temáticos oceânicos para celebração da vitória (Fase 34.4).
 */
export function createOceanConfetti<TObj = AnimationUiObject>(
  engineContext: AnimationEngineContext<TObj>,
  count: number = 50
): TObj[] {
  const confettiList: TObj[] = [];
  const screenW = engineContext.width();
  const screenH = engineContext.height();

  for (let index = 0; index < count; index++) {
    const paletteColor = OCEAN_CONFETTI_PALETTE[index % OCEAN_CONFETTI_PALETTE.length];
    const confettiW = engineContext.rand(3, 6);
    const confettiH = engineContext.rand(7, 12);

    const rectComponent = engineContext.rect(confettiW, confettiH, { radius: 2 });
    const posComponent = engineContext.pos(
      engineContext.rand(30, screenW - 30),
      engineContext.rand(-60, 40)
    );
    const colorComponent =
      typeof engineContext.rgb === "function"
        ? engineContext.rgb(paletteColor[0], paletteColor[1], paletteColor[2])
        : engineContext.color(paletteColor[0], paletteColor[1], paletteColor[2]);
    const anchorComponent =
      typeof engineContext.anchor === "function"
        ? engineContext.anchor("center")
        : { anchor: "center" };
    const rotateComponent =
      typeof engineContext.rotate === "function"
        ? engineContext.rotate(engineContext.rand(0, 360))
        : { angle: engineContext.rand(0, 360) };
    const opacityComponent =
      typeof engineContext.opacity === "function"
        ? engineContext.opacity(engineContext.rand(0.75, 1.0))
        : { opacity: engineContext.rand(0.75, 1.0) };
    const fixedComponent =
      typeof engineContext.fixed === "function" ? engineContext.fixed() : { fixed: true };
    const zComponent = typeof engineContext.z === "function" ? engineContext.z(500) : { z: 500 };

    const confetti = engineContext.add([
      rectComponent,
      posComponent,
      colorComponent,
      anchorComponent,
      rotateComponent,
      opacityComponent,
      fixedComponent,
      zComponent,
    ]);

    const confettiUi = confetti as unknown as AnimationUiObject;
    const fallSpeed = engineContext.rand(90, 180);
    const swaySpeed = engineContext.rand(2, 5);
    const swayAmp = engineContext.rand(12, 28);
    const rotSpeed = engineContext.rand(-180, 180);
    let swayPhase = engineContext.rand(0, Math.PI * 2);

    if (typeof confettiUi.onUpdate === "function") {
      confettiUi.onUpdate(() => {
        const dt = engineContext.dt();
        swayPhase += dt * swaySpeed;
        if (confettiUi.pos) {
          confettiUi.pos.y += fallSpeed * dt;
          confettiUi.pos.x += Math.sin(swayPhase) * swayAmp * dt;
        }
        if (typeof confettiUi.angle === "number") {
          confettiUi.angle += rotSpeed * dt;
        }

        if (confettiUi.pos && confettiUi.pos.y > screenH + 30) {
          try {
            if (typeof engineContext.destroy === "function") {
              engineContext.destroy(confetti);
            }
          } catch {}
        }
      });
    }

    confettiList.push(confetti);
  }

  return confettiList;
}

/**
 * Cria overlay de fade-out suave cinematográfico em z: 9999 antes de recarregar a resolução (Fase 34.8).
 */
export function createResolutionTransitionOverlay(
  engineContext: AnimationEngineContext,
  onComplete: () => void,
  duration: number = 0.3
): void {
  const rectComponent = engineContext.rect(engineContext.width(), engineContext.height());
  const posComponent = engineContext.pos(0, 0);
  const colorComponent =
    typeof engineContext.rgb === "function"
      ? engineContext.rgb(6, 14, 28)
      : engineContext.color(6, 14, 28);
  const opacityComponent =
    typeof engineContext.opacity === "function" ? engineContext.opacity(0) : { opacity: 0 };
  const fixedComponent =
    typeof engineContext.fixed === "function" ? engineContext.fixed() : { fixed: true };
  const zComponent = typeof engineContext.z === "function" ? engineContext.z(9999) : { z: 9999 };

  const overlay = engineContext.add([
    rectComponent,
    posComponent,
    colorComponent,
    opacityComponent,
    fixedComponent,
    zComponent,
  ]);

  const overlayUi = overlay as unknown as AnimationUiObject;

  if (typeof engineContext.tween === "function" && engineContext.easings?.easeOutQuad) {
    engineContext
      .tween(
        0,
        1,
        duration,
        (val: number) => {
          try {
            overlayUi.opacity = val;
          } catch {}
        },
        engineContext.easings.easeOutQuad
      )
      .then(() => {
        onComplete();
      });
  } else {
    overlayUi.opacity = 1;
    if (typeof engineContext.wait === "function") {
      engineContext.wait(duration, onComplete);
    } else {
      onComplete();
    }
  }
}
