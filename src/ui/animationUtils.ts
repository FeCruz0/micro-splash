import type { KaboomCtx } from "kaboom";

/**
 * Utilitários Universais de UI & Animação (Fase 34: Telas de Jogo — Visual & Polimento)
 */

export interface ModalEntranceOptions {
  duration?: number;
  startScale?: number;
  onComplete?: () => void;
}

/**
 * Anima a abertura de um card modal com escala (0.85 → 1.0) e opacidade progressiva via easeOutBack (Fase 34.1).
 */
export function animateModalEntrance(
  k: KaboomCtx,
  cardObj: any,
  options: ModalEntranceOptions = {}
): void {
  const duration = options.duration ?? 0.25;
  const startScale = options.startScale ?? 0.85;

  if (!cardObj) return;

  // Define escala e opacidade iniciais
  cardObj.scale = k.vec2 ? k.vec2(startScale, startScale) : { x: startScale, y: startScale };
  if ("opacity" in cardObj) {
    cardObj.opacity = 0;
  }

  if (typeof k.tween === "function" && k.easings?.easeOutBack) {
    k.tween(
      startScale,
      1.0,
      duration,
      (val) => {
        try {
          cardObj.scale = k.vec2 ? k.vec2(val, val) : { x: val, y: val };
          if ("opacity" in cardObj) {
            const progress = (val - startScale) / Math.max(0.001, 1.0 - startScale);
            cardObj.opacity = Math.min(1, Math.max(0, progress));
          }
        } catch {}
      },
      k.easings.easeOutBack
    ).then(() => {
      try {
        cardObj.scale = k.vec2 ? k.vec2(1, 1) : { x: 1, y: 1 };
        if ("opacity" in cardObj) cardObj.opacity = 1;
      } catch {}
      options.onComplete?.();
    });
  } else {
    // Fallback instantâneo para ambientes sem suporte a tween
    cardObj.scale = k.vec2 ? k.vec2(1, 1) : { x: 1, y: 1 };
    if ("opacity" in cardObj) cardObj.opacity = 1;
    options.onComplete?.();
  }
}

export interface ButtonHoverOptions {
  baseColor: [number, number, number];
  hoverColor?: [number, number, number];
  baseScale?: number;
  hoverScale?: number;
  textObj?: any;
  baseTextColor?: [number, number, number];
  hoverTextColor?: [number, number, number];
  canInteract?: () => boolean;
}

/**
 * Anexa feedback tátil consistente de hover aos botões de UI com iluminação e expansão elástica suave (Fase 34.5).
 */
export function attachButtonHoverEffect(
  k: KaboomCtx,
  btnObj: any,
  options: ButtonHoverOptions
): void {
  const baseScale = options.baseScale ?? 1.0;
  const hoverScale = options.hoverScale ?? 1.04;

  const defaultHoverColor: [number, number, number] = options.hoverColor ?? [
    Math.min(255, Math.round(options.baseColor[0] * 1.25 + 18)),
    Math.min(255, Math.round(options.baseColor[1] * 1.25 + 18)),
    Math.min(255, Math.round(options.baseColor[2] * 1.25 + 18)),
  ];

  if (typeof btnObj.onHoverUpdate === "function") {
    btnObj.onHoverUpdate(() => {
      if (options.canInteract && !options.canInteract()) return;
      try {
        if (typeof document !== "undefined" && document.body) {
          document.body.style.cursor = "pointer";
        }
        btnObj.scale = k.vec2 ? k.vec2(hoverScale, hoverScale) : { x: hoverScale, y: hoverScale };
        btnObj.color = k.rgb(defaultHoverColor[0], defaultHoverColor[1], defaultHoverColor[2]);
        if (options.textObj && options.hoverTextColor) {
          options.textObj.color = k.rgb(
            options.hoverTextColor[0],
            options.hoverTextColor[1],
            options.hoverTextColor[2]
          );
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
        btnObj.scale = k.vec2 ? k.vec2(baseScale, baseScale) : { x: baseScale, y: baseScale };
        btnObj.color = k.rgb(options.baseColor[0], options.baseColor[1], options.baseColor[2]);
        if (options.textObj && options.baseTextColor) {
          options.textObj.color = k.rgb(
            options.baseTextColor[0],
            options.baseTextColor[1],
            options.baseTextColor[2]
          );
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
export function createOceanConfetti(k: KaboomCtx, count = 50): any[] {
  const confettiList: any[] = [];
  const screenW = k.width();
  const screenH = k.height();

  for (let i = 0; i < count; i++) {
    const paletteColor = OCEAN_CONFETTI_PALETTE[i % OCEAN_CONFETTI_PALETTE.length];
    const confettiW = k.rand(3, 6);
    const confettiH = k.rand(7, 12);

    const confetti = k.add([
      k.rect(confettiW, confettiH, { radius: 2 }),
      k.pos(k.rand(30, screenW - 30), k.rand(-60, 40)),
      k.color(paletteColor[0], paletteColor[1], paletteColor[2]),
      k.anchor("center"),
      k.rotate(k.rand(0, 360)),
      k.opacity(k.rand(0.75, 1.0)),
      k.fixed(),
      k.z(500),
    ]);

    const fallSpeed = k.rand(90, 180);
    const swaySpeed = k.rand(2, 5);
    const swayAmp = k.rand(12, 28);
    const rotSpeed = k.rand(-180, 180);
    let swayPhase = k.rand(0, Math.PI * 2);

    confetti.onUpdate(() => {
      const dt = k.dt();
      swayPhase += dt * swaySpeed;
      confetti.pos.y += fallSpeed * dt;
      confetti.pos.x += Math.sin(swayPhase) * swayAmp * dt;
      confetti.angle += rotSpeed * dt;

      if (confetti.pos.y > screenH + 30) {
        try {
          k.destroy(confetti);
        } catch {}
      }
    });

    confettiList.push(confetti);
  }

  return confettiList;
}

/**
 * Cria overlay de fade-out suave cinematográfico em z: 9999 antes de recarregar a resolução (Fase 34.8).
 */
export function createResolutionTransitionOverlay(
  k: KaboomCtx,
  onComplete: () => void,
  duration = 0.3
): void {
  const overlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(6, 14, 28),
    k.opacity(0),
    k.fixed(),
    k.z(9999),
  ]);

  if (typeof k.tween === "function" && k.easings?.easeOutQuad) {
    k.tween(
      0,
      1,
      duration,
      (val) => {
        try {
          overlay.opacity = val;
        } catch {}
      },
      k.easings.easeOutQuad
    ).then(() => {
      onComplete();
    });
  } else {
    overlay.opacity = 1;
    if (typeof k.wait === "function") {
      k.wait(duration, onComplete);
    } else {
      onComplete();
    }
  }
}
