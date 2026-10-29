/**
 * Sistema de Controles Táteis em Tela (D-Pad Virtual & Ações Náuticas) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Vector2D.
 */

import { readLocalStorageWithSchema } from "../utils/storage";
import { TouchControlsModeSchema } from "../schemas/storageSchemas";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

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

export interface LegacyTouchButtonObject {
  color?: unknown;
  opacity?: number;
  scale?: { x: number; y: number };
  onHoverUpdate?(callback: () => void): void;
  onHoverEnd?(callback: () => void): void;
  onMouseRelease?(callback: () => void): void;
  onClick?(callback: () => void): void;
}

export interface LegacyTouchControlsEngine {
  width(): number;
  height(): number;
  circle(radius: number): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  outline?(width: number, color: unknown): unknown;
  opacity?(alpha: number): unknown;
  anchor?(anchorPoint: "center"): unknown;
  scale?(scale: number): unknown;
  area?(): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  text(content: string, options?: unknown): unknown;
  vec2?(x: number, y: number): { x: number; y: number };
  add(components?: unknown): unknown;
  destroy?(target: unknown): void;
  isMouseDown?(): boolean;
  wait?(duration: number, callback: () => void): void;
  onUpdate(callback: () => void): { cancel: () => void };
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
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "touch") {
        markTouchActive();
      } else if (e.pointerType === "mouse") {
        // Se está usando mouse no PC, garante que a sessão não fique presa como touch
        sessionTouchDetected = false;
        try {
          sessionStorage.removeItem("micro_splash_touch_active");
        } catch {}
      }
    },
    { passive: true }
  );
}

export function isTouchEnvironment(): boolean {
  if (typeof window === "undefined") return false;

  const touchConfig = readLocalStorageWithSchema(
    "micro_splash_touch_controls",
    TouchControlsModeSchema,
    "auto"
  );
  if (touchConfig === "off") return false;
  if (touchConfig === "on") return true;

  // Se já foi detectado toque real comprovado na sessão atual
  if (sessionTouchDetected) return true;

  // Modo "auto":
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent
  );

  // pointer: coarse indica tela touch como entrada primária (celulares, tablets).
  // Se for mouse/trackpad no PC, pointer é "fine" e hover é "hover", mesmo que tenha tela touch secundária.
  const isPrimaryTouch =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse) and (hover: none)").matches;

  return !!(isMobileUA || isPrimaryTouch);
}

export function setupTouchControls(engineOrContext: IRenderEngine | LegacyTouchControlsEngine): {
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

  let isDestroyed = false;

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const dimensions = engineOrContext.getDimensions();
    const createdNodes: Array<IGraphicsNode | ITextNode> = [];

    const buildPixiControls = () => {
      if (createdNodes.length > 0) return;

      const dpadBaseX = 130;
      const dpadBaseY = dimensions.height - 120;
      const btnSize = 52;
      const spacing = 55;

      // Base circular suave sob o D-Pad
      const dpadBase = engineOrContext.createGraphics("touch_dpad_base");
      dpadBase.drawCircle(0, 0, 88, { fill: { color: [10, 25, 55], alpha: 0.45 } });
      dpadBase.setPosition(dpadBaseX, dpadBaseY);
      dpadBase.setZIndex(190);
      stageRoot.addChild(dpadBase);
      createdNodes.push(dpadBase);

      const createDirButton = (
        label: string,
        offsetX: number,
        offsetY: number,
        onState: (down: boolean) => void
      ) => {
        const btnNode = engineOrContext.createGraphics(`touch_dpad_${label}`);
        const posX = dpadBaseX + offsetX;
        const posY = dpadBaseY + offsetY;

        const drawButton = (isPressed: boolean) => {
          btnNode.clear();
          btnNode.drawRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 12, {
            fill: {
              color: isPressed ? [35, 120, 190] : [16, 45, 85],
              alpha: isPressed ? 0.95 : 0.7,
            },
            stroke: { width: 2, color: [70, 180, 240], alpha: 1 },
          });
        };
        drawButton(false);
        btnNode.setPosition(posX, posY);
        btnNode.setZIndex(191);
        stageRoot.addChild(btnNode);
        createdNodes.push(btnNode);

        const labelNode = engineOrContext.createText(
          label,
          { fontFamily: "Outfit", fontSize: 24, color: [220, 245, 255], align: "center" },
          `touch_dpad_label_${label}`
        );
        labelNode.setPosition(posX, posY);
        labelNode.setZIndex(192);
        stageRoot.addChild(labelNode);
        createdNodes.push(labelNode);

        // Suporte aos eventos de toque/ponteiro no nó
        const nativeNode = btnNode.getNativeNode<{
          interactive?: boolean;
          cursor?: string;
          on?: (event: string, callback: () => void) => void;
        }>();

        if (nativeNode && typeof nativeNode.on === "function") {
          nativeNode.interactive = true;
          nativeNode.cursor = "pointer";
          nativeNode.on("pointerdown", () => {
            drawButton(true);
            btnNode.setScale(0.92, 0.92);
            onState(true);
          });
          const release = () => {
            drawButton(false);
            btnNode.setScale(1, 1);
            onState(false);
          };
          nativeNode.on("pointerup", release);
          nativeNode.on("pointerupoutside", release);
          nativeNode.on("pointercancel", release);
        }
      };

      createDirButton("▲", 0, -spacing, (down) => (state.up = down));
      createDirButton("▼", 0, spacing, (down) => (state.down = down));
      createDirButton("◀", -spacing, 0, (down) => (state.left = down));
      createDirButton("▶", spacing, 0, (down) => (state.right = down));

      // Botão Principal: NADO / IMPULSO
      const strokeBtnX = dimensions.width - 115;
      const strokeBtnY = dimensions.height - 110;
      const strokeRadius = 52;

      const strokeBtn = engineOrContext.createGraphics("touch_stroke_btn");
      const drawStrokeButton = (isPressed: boolean) => {
        strokeBtn.clear();
        strokeBtn.drawCircle(0, 0, strokeRadius, {
          fill: {
            color: isPressed ? [30, 160, 240] : [14, 85, 160],
            alpha: isPressed ? 0.95 : 0.75,
          },
          stroke: { width: 3, color: [100, 240, 255], alpha: 1 },
        });
      };
      drawStrokeButton(false);
      strokeBtn.setPosition(strokeBtnX, strokeBtnY);
      strokeBtn.setZIndex(191);
      stageRoot.addChild(strokeBtn);
      createdNodes.push(strokeBtn);

      const strokeLabel = engineOrContext.createText(
        "NADO\n🌊",
        { fontFamily: "Outfit", fontSize: 16.5, color: [255, 255, 255], align: "center" },
        "touch_stroke_label"
      );
      strokeLabel.setPosition(strokeBtnX, strokeBtnY);
      strokeLabel.setZIndex(192);
      stageRoot.addChild(strokeLabel);
      createdNodes.push(strokeLabel);

      const strokeNative = strokeBtn.getNativeNode<{
        interactive?: boolean;
        cursor?: string;
        on?: (event: string, callback: () => void) => void;
      }>();
      if (strokeNative && typeof strokeNative.on === "function") {
        strokeNative.interactive = true;
        strokeNative.cursor = "pointer";
        strokeNative.on("pointerdown", () => {
          drawStrokeButton(true);
          strokeBtn.setScale(0.92, 0.92);
          state.strokePressed = true;
          state.strokeDown = true;
        });
        const releaseStroke = () => {
          drawStrokeButton(false);
          strokeBtn.setScale(1, 1);
          state.strokeDown = false;
        };
        strokeNative.on("pointerup", releaseStroke);
        strokeNative.on("pointerupoutside", releaseStroke);
        strokeNative.on("pointercancel", releaseStroke);
      }

      // Botão Secundário: BIOSONAR 360°
      const sonarBtnX = strokeBtnX - 95;
      const sonarBtnY = dimensions.height - 85;
      const sonarRadius = 38;

      const sonarBtn = engineOrContext.createGraphics("touch_sonar_btn");
      sonarBtn.drawCircle(0, 0, sonarRadius, {
        fill: { color: [20, 50, 95], alpha: 0.7 },
        stroke: { width: 2, color: [0, 230, 255], alpha: 1 },
      });
      sonarBtn.setPosition(sonarBtnX, sonarBtnY);
      sonarBtn.setZIndex(191);
      stageRoot.addChild(sonarBtn);
      createdNodes.push(sonarBtn);

      const sonarLabel = engineOrContext.createText(
        "SONAR\n📡",
        { fontFamily: "Outfit", fontSize: 13, color: [180, 245, 255], align: "center" },
        "touch_sonar_label"
      );
      sonarLabel.setPosition(sonarBtnX, sonarBtnY);
      sonarLabel.setZIndex(192);
      stageRoot.addChild(sonarLabel);
      createdNodes.push(sonarLabel);

      const sonarNative = sonarBtn.getNativeNode<{
        interactive?: boolean;
        cursor?: string;
        on?: (event: string, callback: () => void) => void;
      }>();
      if (sonarNative && typeof sonarNative.on === "function") {
        sonarNative.interactive = true;
        sonarNative.cursor = "pointer";
        sonarNative.on("pointerdown", () => {
          state.sonarPressed = true;
          sonarBtn.setScale(0.9, 0.9);
          setTimeout(() => {
            if (!isDestroyed) {
              sonarBtn.setScale(1, 1);
            }
          }, 120);
        });
      }
    };

    if (isEnabled) {
      buildPixiControls();
    }

    const onWindowTouchPixi = () => {
      if (isDestroyed) return;
      sessionTouchDetected = true;
      try {
        sessionStorage.setItem("micro_splash_touch_active", "true");
      } catch {}

      const touchConfig = readLocalStorageWithSchema(
        "micro_splash_touch_controls",
        TouchControlsModeSchema,
        "auto"
      );
      if (touchConfig !== "off" && createdNodes.length === 0) {
        buildPixiControls();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("touchstart", onWindowTouchPixi, { passive: true });
    }

    let clearStrokeNext = false;
    let clearSonarNext = false;

    const unregisterTicker = engineOrContext.getTicker().add(() => {
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
        unregisterTicker();
        if (typeof window !== "undefined") {
          window.removeEventListener("touchstart", onWindowTouchPixi);
        }
        createdNodes.forEach((node) => {
          try {
            stageRoot.removeChild(node);
            node.destroy();
          } catch {}
        });
      },
    };
  }

  // Fallback e interoperabilidade para contexto legado
  const legacyContext = engineOrContext as LegacyTouchControlsEngine;
  const elements: unknown[] = [];

  const resolveRgb = (red: number, green: number, blue: number): unknown => {
    if (typeof legacyContext.rgb === "function") {
      return legacyContext.rgb(red, green, blue);
    }
    return typeof legacyContext.color === "function"
      ? legacyContext.color(red, green, blue)
      : undefined;
  };

  const createVector2 = (x: number, y: number): { x: number; y: number } => {
    return typeof legacyContext.vec2 === "function" ? legacyContext.vec2(x, y) : { x, y };
  };

  function buildControls() {
    if (elements.length > 0) return;

    const screenHeight = typeof legacyContext.height === "function" ? legacyContext.height() : 720;
    const screenWidth = typeof legacyContext.width === "function" ? legacyContext.width() : 1280;

    const dpadBaseX = 130;
    const dpadBaseY = screenHeight - 120;
    const btnSize = 52;
    const spacing = 55;

    // Base circular suave sob o D-Pad
    elements.push(
      legacyContext.add([
        legacyContext.circle(88),
        legacyContext.pos(dpadBaseX, dpadBaseY),
        legacyContext.color(10, 25, 55),
        typeof legacyContext.opacity === "function" ? legacyContext.opacity(0.45) : undefined,
        typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
        typeof legacyContext.z === "function" ? legacyContext.z(190) : undefined,
      ])
    );

    function createDirButton(
      label: string,
      offsetX: number,
      offsetY: number,
      onState: (down: boolean) => void
    ) {
      const btn = legacyContext.add([
        legacyContext.rect(btnSize, btnSize, { radius: 12 }),
        legacyContext.pos(dpadBaseX + offsetX, dpadBaseY + offsetY),
        legacyContext.color(16, 45, 85),
        typeof legacyContext.outline === "function"
          ? legacyContext.outline(2, resolveRgb(70, 180, 240))
          : undefined,
        typeof legacyContext.opacity === "function" ? legacyContext.opacity(0.7) : undefined,
        typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
        typeof legacyContext.scale === "function" ? legacyContext.scale(1) : undefined,
        typeof legacyContext.area === "function" ? legacyContext.area() : undefined,
        typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
        typeof legacyContext.z === "function" ? legacyContext.z(191) : undefined,
      ]) as LegacyTouchButtonObject;
      elements.push(btn);

      const txt = legacyContext.add([
        legacyContext.text(label, { size: 24, font: "Outfit" }),
        legacyContext.pos(dpadBaseX + offsetX, dpadBaseY + offsetY),
        legacyContext.color(220, 245, 255),
        typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
        typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
        typeof legacyContext.z === "function" ? legacyContext.z(192) : undefined,
      ]);
      elements.push(txt);

      let isPressing = false;

      const press = () => {
        if (!isPressing) {
          isPressing = true;
          btn.color = resolveRgb(35, 120, 190);
          btn.opacity = 0.95;
          btn.scale = createVector2(0.92, 0.92);
          onState(true);
        }
      };

      const release = () => {
        if (isPressing) {
          isPressing = false;
          btn.color = resolveRgb(16, 45, 85);
          btn.opacity = 0.7;
          btn.scale = createVector2(1, 1);
          onState(false);
        }
      };

      if (typeof btn.onHoverUpdate === "function") {
        btn.onHoverUpdate(() => {
          if (typeof legacyContext.isMouseDown === "function" && legacyContext.isMouseDown()) {
            press();
          }
        });
      }
      if (typeof btn.onHoverEnd === "function") btn.onHoverEnd(release);
      if (typeof btn.onMouseRelease === "function") btn.onMouseRelease(release);

      return { btn, txt, press, release };
    }

    createDirButton("▲", 0, -spacing, (down) => (state.up = down));
    createDirButton("▼", 0, spacing, (down) => (state.down = down));
    createDirButton("◀", -spacing, 0, (down) => (state.left = down));
    createDirButton("▶", spacing, 0, (down) => (state.right = down));

    // Botão Principal: NADO / IMPULSO
    const strokeBtnX = screenWidth - 115;
    const strokeBtnY = screenHeight - 110;
    const strokeRadius = 52;

    const strokeBtn = legacyContext.add([
      legacyContext.circle(strokeRadius),
      legacyContext.pos(strokeBtnX, strokeBtnY),
      legacyContext.color(14, 85, 160),
      typeof legacyContext.outline === "function"
        ? legacyContext.outline(3, resolveRgb(100, 240, 255))
        : undefined,
      typeof legacyContext.opacity === "function" ? legacyContext.opacity(0.75) : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.scale === "function" ? legacyContext.scale(1) : undefined,
      typeof legacyContext.area === "function" ? legacyContext.area() : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(191) : undefined,
    ]) as LegacyTouchButtonObject;
    elements.push(strokeBtn);

    const strokeLabel = legacyContext.add([
      legacyContext.text("NADO\n🌊", { size: 16.5, font: "Outfit", align: "center" }),
      legacyContext.pos(strokeBtnX, strokeBtnY),
      legacyContext.color(255, 255, 255),
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(192) : undefined,
    ]);
    elements.push(strokeLabel);

    let isStrokeActive = false;

    const pressStroke = () => {
      if (!isStrokeActive) {
        isStrokeActive = true;
        state.strokePressed = true;
        state.strokeDown = true;
        strokeBtn.color = resolveRgb(30, 160, 240);
        strokeBtn.scale = createVector2(0.92, 0.92);
        strokeBtn.opacity = 0.95;
      }
    };

    const releaseStroke = () => {
      if (isStrokeActive) {
        isStrokeActive = false;
        state.strokeDown = false;
        strokeBtn.color = resolveRgb(14, 85, 160);
        strokeBtn.scale = createVector2(1, 1);
        strokeBtn.opacity = 0.75;
      }
    };

    if (typeof strokeBtn.onHoverUpdate === "function") {
      strokeBtn.onHoverUpdate(() => {
        if (typeof legacyContext.isMouseDown === "function" && legacyContext.isMouseDown()) {
          pressStroke();
        }
      });
    }
    if (typeof strokeBtn.onHoverEnd === "function") strokeBtn.onHoverEnd(releaseStroke);
    if (typeof strokeBtn.onMouseRelease === "function") strokeBtn.onMouseRelease(releaseStroke);

    // Botão Secundário: BIOSONAR 360°
    const sonarBtnX = strokeBtnX - 95;
    const sonarBtnY = screenHeight - 85;
    const sonarRadius = 38;

    const sonarBtn = legacyContext.add([
      legacyContext.circle(sonarRadius),
      legacyContext.pos(sonarBtnX, sonarBtnY),
      legacyContext.color(20, 50, 95),
      typeof legacyContext.outline === "function"
        ? legacyContext.outline(2, resolveRgb(0, 230, 255))
        : undefined,
      typeof legacyContext.opacity === "function" ? legacyContext.opacity(0.7) : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.scale === "function" ? legacyContext.scale(1) : undefined,
      typeof legacyContext.area === "function" ? legacyContext.area() : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(191) : undefined,
    ]) as LegacyTouchButtonObject;
    elements.push(sonarBtn);

    const sonarLabel = legacyContext.add([
      legacyContext.text("SONAR\n📡", { size: 13, font: "Outfit", align: "center" }),
      legacyContext.pos(sonarBtnX, sonarBtnY),
      legacyContext.color(180, 245, 255),
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(192) : undefined,
    ]);
    elements.push(sonarLabel);

    if (typeof sonarBtn.onClick === "function") {
      sonarBtn.onClick(() => {
        state.sonarPressed = true;
        sonarBtn.scale = createVector2(0.9, 0.9);
        sonarBtn.color = resolveRgb(0, 190, 240);
        if (typeof legacyContext.wait === "function") {
          legacyContext.wait(0.12, () => {
            if (!isDestroyed) {
              sonarBtn.scale = createVector2(1, 1);
              sonarBtn.color = resolveRgb(20, 50, 95);
            }
          });
        }
      });
    }
  }

  if (isEnabled) {
    buildControls();
  }

  const onWindowTouch = () => {
    if (isDestroyed) return;
    sessionTouchDetected = true;
    try {
      sessionStorage.setItem("micro_splash_touch_active", "true");
    } catch {}

    const touchConfig = readLocalStorageWithSchema(
      "micro_splash_touch_controls",
      TouchControlsModeSchema,
      "auto"
    );
    if (touchConfig !== "off" && elements.length === 0) {
      buildControls();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("touchstart", onWindowTouch, { passive: true });
  }

  let clearStrokeNext = false;
  let clearSonarNext = false;

  const updateEvt = legacyContext.onUpdate(() => {
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
      if (updateEvt && typeof updateEvt.cancel === "function") {
        updateEvt.cancel();
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("touchstart", onWindowTouch);
      }
      elements.forEach((el) => {
        try {
          if (typeof legacyContext.destroy === "function") {
            legacyContext.destroy(el);
          }
        } catch {}
      });
    },
  };
}
