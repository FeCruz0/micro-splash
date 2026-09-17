import type { KaboomCtx } from "kaboom";

export interface TouchControlsState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  strokePressed: boolean;
  strokeDown: boolean;
  sonarPressed: boolean;
  active: boolean;
}

// Memória persistente do ambiente durante a sessão do navegador
let sessionTouchDetected = false;
if (typeof sessionStorage !== "undefined") {
  sessionTouchDetected = sessionStorage.getItem("micro_splash_touch_active") === "true";
}

// Ouvinte global: apenas toque físico ou toque emulado no F12 marca como touch ativo
if (typeof window !== "undefined") {
  const markTouchActive = () => {
    sessionTouchDetected = true;
    try {
      sessionStorage.setItem("micro_splash_touch_active", "true");
    } catch {}
  };
  window.addEventListener("touchstart", markTouchActive, { passive: true });
  window.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") {
      markTouchActive();
    } else if (e.pointerType === "mouse") {
      // Se está usando mouse no PC, garante que a sessão não fique presa como touch
      sessionTouchDetected = false;
      try {
        sessionStorage.removeItem("micro_splash_touch_active");
      } catch {}
    }
  }, { passive: true });
}

export function isTouchEnvironment(): boolean {
  if (typeof window === "undefined") return false;

  const touchConfig = localStorage.getItem("micro_splash_touch_controls") || "auto";
  if (touchConfig === "off") return false;
  if (touchConfig === "on") return true;

  // Se já foi detectado toque real comprovado na sessão atual
  if (sessionTouchDetected) return true;

  // Modo "auto":
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);

  // pointer: coarse indica tela touch como entrada primária (celulares, tablets).
  // Se for mouse/trackpad no PC, pointer é "fine" e hover é "hover", mesmo que tenha tela touch secundária.
  const isPrimaryTouch =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse) and (hover: none)").matches;

  return !!(isMobileUA || isPrimaryTouch);
}

export function setupTouchControls(k: KaboomCtx): {
  state: TouchControlsState;
  destroy: () => void;
} {
  const isEnabled = isTouchEnvironment();

  const state: TouchControlsState = {
    up: false,
    down: false,
    left: false,
    right: false,
    strokePressed: false,
    strokeDown: false,
    sonarPressed: false,
    active: isEnabled,
  };

  const elements: any[] = [];
  let isDestroyed = false;

  function buildControls() {
    if (elements.length > 0) return;

    // =========================================================================
    // D-PAD VIRTUAL (CANTO INFERIOR ESQUERDO) - Resolução Base 1280x720
    // =========================================================================
    const dpadBaseX = 130;
    const dpadBaseY = k.height() - 120;
    const btnSize = 52;
    const spacing = 55;

    // Base circular suave sob o D-Pad
    elements.push(
      k.add([
        k.circle(88),
        k.pos(dpadBaseX, dpadBaseY),
        k.color(10, 25, 55),
        k.opacity(0.45),
        k.fixed(),
        k.z(190),
      ])
    );

    function createDirButton(label: string, offsetX: number, offsetY: number, onState: (down: boolean) => void) {
      const btn = k.add([
        k.rect(btnSize, btnSize, { radius: 12 }),
        k.pos(dpadBaseX + offsetX, dpadBaseY + offsetY),
        k.color(16, 45, 85),
        k.outline(2, k.rgb(70, 180, 240)),
        k.opacity(0.7),
        k.anchor("center"),
        k.scale(1),
        k.area(),
        k.fixed(),
        k.z(191),
      ]);
      elements.push(btn);

      const txt = k.add([
        k.text(label, { size: 22, font: "sans-serif" }),
        k.pos(dpadBaseX + offsetX, dpadBaseY + offsetY),
        k.color(220, 245, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(192),
      ]);
      elements.push(txt);

      let isPressing = false;

      const press = () => {
        if (!isPressing) {
          isPressing = true;
          btn.color = k.rgb(35, 120, 190);
          btn.opacity = 0.95;
          btn.scale = k.vec2(0.92, 0.92);
          onState(true);
        }
      };

      const release = () => {
        if (isPressing) {
          isPressing = false;
          btn.color = k.rgb(16, 45, 85);
          btn.opacity = 0.7;
          btn.scale = k.vec2(1, 1);
          onState(false);
        }
      };

      btn.onHoverUpdate(() => {
        if (k.isMouseDown()) {
          press();
        }
      });

      btn.onHoverEnd(release);
      btn.onMouseRelease(release);

      return { btn, txt, press, release };
    }

    createDirButton("▲", 0, -spacing, (down) => (state.up = down));
    createDirButton("▼", 0, spacing, (down) => (state.down = down));
    createDirButton("◀", -spacing, 0, (down) => (state.left = down));
    createDirButton("▶", spacing, 0, (down) => (state.right = down));

    // =========================================================================
    // BOTÕES DE AÇÃO (CANTO INFERIOR DIREITO)
    // =========================================================================
    const strokeBtnX = k.width() - 115;
    const strokeBtnY = k.height() - 110;
    const strokeRadius = 52;

    // Botão Principal: NADO / IMPULSO (Tail Stroke)
    const strokeBtn = k.add([
      k.circle(strokeRadius),
      k.pos(strokeBtnX, strokeBtnY),
      k.color(14, 85, 160),
      k.outline(3, k.rgb(100, 240, 255)),
      k.opacity(0.75),
      k.anchor("center"),
      k.scale(1),
      k.area(),
      k.fixed(),
      k.z(191),
    ]);
    elements.push(strokeBtn);

    const strokeLabel = k.add([
      k.text("NADO\n🌊", { size: 16, font: "sans-serif", align: "center" }),
      k.pos(strokeBtnX, strokeBtnY),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(192),
    ]);
    elements.push(strokeLabel);

    let isStrokeActive = false;

    const pressStroke = () => {
      if (!isStrokeActive) {
        isStrokeActive = true;
        state.strokePressed = true;
        state.strokeDown = true;
        strokeBtn.color = k.rgb(30, 160, 240);
        strokeBtn.scale = k.vec2(0.92, 0.92);
        strokeBtn.opacity = 0.95;
      }
    };

    const releaseStroke = () => {
      if (isStrokeActive) {
        isStrokeActive = false;
        state.strokeDown = false;
        strokeBtn.color = k.rgb(14, 85, 160);
        strokeBtn.scale = k.vec2(1, 1);
        strokeBtn.opacity = 0.75;
      }
    };

    strokeBtn.onHoverUpdate(() => {
      if (k.isMouseDown()) {
        pressStroke();
      }
    });
    strokeBtn.onHoverEnd(releaseStroke);
    strokeBtn.onMouseRelease(releaseStroke);

    // Botão Secundário: BIOSONAR 360°
    const sonarBtnX = strokeBtnX - 95;
    const sonarBtnY = k.height() - 85;
    const sonarRadius = 38;

    const sonarBtn = k.add([
      k.circle(sonarRadius),
      k.pos(sonarBtnX, sonarBtnY),
      k.color(20, 50, 95),
      k.outline(2, k.rgb(0, 230, 255)),
      k.opacity(0.7),
      k.anchor("center"),
      k.scale(1),
      k.area(),
      k.fixed(),
      k.z(191),
    ]);
    elements.push(sonarBtn);

    const sonarLabel = k.add([
      k.text("SONAR\n📡", { size: 12, font: "sans-serif", align: "center" }),
      k.pos(sonarBtnX, sonarBtnY),
      k.color(180, 245, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(192),
    ]);
    elements.push(sonarLabel);

    sonarBtn.onClick(() => {
      state.sonarPressed = true;
      sonarBtn.scale = k.vec2(0.9, 0.9);
      sonarBtn.color = k.rgb(0, 190, 240);
      k.wait(0.12, () => {
        if (!isDestroyed) {
          sonarBtn.scale = k.vec2(1, 1);
          sonarBtn.color = k.rgb(20, 50, 95);
        }
      });
    });
  }

  if (isEnabled) {
    buildControls();
  }

  // Ouvinte para ativação dinâmica imediata caso o usuário toque na tela (ex: F12 touch emulation)
  const onWindowTouch = () => {
    if (isDestroyed) return;
    sessionTouchDetected = true;
    try {
      sessionStorage.setItem("micro_splash_touch_active", "true");
    } catch {}

    const touchConfig = localStorage.getItem("micro_splash_touch_controls") || "auto";
    if (touchConfig !== "off" && elements.length === 0) {
      buildControls();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("touchstart", onWindowTouch, { passive: true });
  }

  // Proteção de frames para transientes de clique (pressed)
  let clearStrokeNext = false;
  let clearSonarNext = false;

  const updateEvt = k.onUpdate(() => {
    if (clearStrokeNext) {
      state.strokePressed = false;
      clearStrokeNext = false;
    }
    if (state.strokePressed) {
      clearStrokeNext = true;
    }

    if (clearSonarNext) {
      state.sonarPressed = false;
      clearSonarNext = false;
    }
    if (state.sonarPressed) {
      clearSonarNext = true;
    }
  });

  return {
    state,
    destroy: () => {
      isDestroyed = true;
      updateEvt.cancel();
      if (typeof window !== "undefined") {
        window.removeEventListener("touchstart", onWindowTouch);
      }
      elements.forEach((el) => {
        try {
          k.destroy(el);
        } catch {}
      });
    },
  };
}
