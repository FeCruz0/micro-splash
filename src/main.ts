import { Assets } from "pixi.js";
import { getSavedResolution, getSavedDisplayMode } from "./config";
import { accessibilitySystem } from "./systems/accessibilitySystem";
import { errorReporter } from "./services/errorReporter";
import { initPwaManager } from "./utils/pwaManager";
import { reportInformation, reportWarning } from "./utils/errorReporter";
import { setupLetterboxBorders } from "./systems/letterboxSystem";
import { registerAllScenes, loadAllGameAssets, type AllScenesEngineContext } from "./scenes";
import type { AssetLoaderEngineContext } from "./scenes/assetLoader";
import { RenderEngineAdapter } from "./engine/adapters/RenderEngineAdapter";
import type { IRenderNode } from "./engine/contracts/INTERFACE_CONTRACTS";
import { SceneManager } from "./engine/SceneManager";
import { createTween, Easings, type EasingFunction } from "./engine/utils/Tween";
import { detectGpuCapabilities } from "./utils/gpuDiagnostics";
import {
  initializeFullscreenHandler,
  isDocumentFullscreen,
  requestDocumentFullscreen,
  exitDocumentFullscreen,
} from "./systems/fullscreenHandler";
import { getScreenLayerGeometryChecker } from "./engine/screenLayerGeometryChecker";

// Inicializa observabilidade e proteção contra exceções em totens (Fase 27)
errorReporter.setupGlobalHandlers();
initPwaManager();
detectGpuCapabilities();

const resolution = getSavedResolution();
const displayMode = getSavedDisplayMode();
const isLetterbox = displayMode === "letterbox";

// Instância única do RenderEngineAdapter (PixiJS v8 WebGL) e gerenciador de cenas (ADR 004 / WBS 4.21)
export const renderEngine = new RenderEngineAdapter();
export const sceneManager = new SceneManager();

const appContainer =
  typeof document !== "undefined" ? (document.getElementById("app") ?? undefined) : undefined;

type EngineBridgeContext = AllScenesEngineContext &
  AssetLoaderEngineContext & {
    renderEngine: RenderEngineAdapter;
    setFullscreen(fullscreen: boolean): void;
    isFullscreen(): boolean;
  };

function createPixiBridgeContext(
  engine: RenderEngineAdapter,
  scenes: SceneManager
): EngineBridgeContext {
  const sceneLeaveCallbacks: Array<() => void> = [];
  const sceneCleanupCallbacks: Array<() => void> = [];
  const sceneUpdateCallbacks: Array<(deltaTimeInSeconds: number) => void> = [];
  const taggedEntities = new Map<string, Set<unknown>>();
  let mousePressed = false;

  if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", () => {
      mousePressed = true;
    });
    window.addEventListener("pointerup", () => {
      mousePressed = false;
    });
  }

  const flushActiveSceneResources = (): void => {
    while (sceneLeaveCallbacks.length > 0) {
      const leaveCb = sceneLeaveCallbacks.pop();
      try {
        leaveCb?.();
      } catch {}
    }
    while (sceneCleanupCallbacks.length > 0) {
      const cleanupCb = sceneCleanupCallbacks.pop();
      try {
        cleanupCb?.();
      } catch {}
    }
    sceneUpdateCallbacks.length = 0;
    taggedEntities.clear();
  };

  const context: EngineBridgeContext = {
    renderEngine: engine,
    debug: { paused: false },
    easings: {
      easeOutQuad: Easings.easeOutQuad,
      easeInQuad: Easings.easeInQuad,
    },

    loadFont(name, src) {
      void Assets.load({ alias: name, src }).catch(() => undefined);
      return name;
    },

    loadSprite(name, src) {
      void Assets.load({ alias: name, src }).catch(() => undefined);
      return name;
    },

    scene(id, action) {
      scenes.registerScene({
        name: id,
        enter: (data?: unknown) => {
          action(data);
        },
        update: (deltaTimeInSeconds: number) => {
          const updateCallbacks = sceneUpdateCallbacks.slice();
          for (let index = 0; index < updateCallbacks.length; index++) {
            try {
              updateCallbacks[index](deltaTimeInSeconds);
            } catch (error) {
              console.error(`[SceneManager] Erro no update da cena "${id}":`, error);
            }
          }
        },
        exit: () => {
          flushActiveSceneResources();
        },
      });
      return id;
    },

    go(id, ...args) {
      void scenes.loadScene(id, args[0]);
    },

    setGravity(_gravity) {
      return undefined;
    },

    width() {
      return engine.getDimensions().width;
    },

    height() {
      return engine.getDimensions().height;
    },

    dt() {
      return engine.isInitialized ? engine.getTicker().getDeltaTime() : 0.0166;
    },

    vec2(x, y) {
      return { x, y };
    },

    rgb(r, g, b) {
      return [r, g, b] as const;
    },

    pos(xOrPos: number | { x: number; y: number }, y?: number) {
      if (typeof xOrPos === "object" && xOrPos !== null) {
        return { type: "pos", x: xOrPos.x, y: xOrPos.y };
      }
      return { type: "pos", x: xOrPos, y: y ?? 0 };
    },

    rect(width, height, options) {
      return { type: "rect", width, height, options };
    },

    color(...args) {
      return { type: "color", args };
    },

    opacity(alpha) {
      return { type: "opacity", opacity: alpha };
    },

    fixed() {
      return { type: "fixed" };
    },

    z(zIndex) {
      return { type: "z", z: zIndex };
    },

    area(options) {
      return { type: "area", options };
    },

    text(content, options) {
      return { type: "text", text: content, options };
    },

    add(components) {
      let isFixedElement = false;
      let positionX = 0;
      let positionY = 0;
      let anchorPoint: "center" | "topleft" | "left" | "right" | "top" | "botright" = "topleft";
      let entityOpacity = 1;
      let entityZIndex = 0;
      let entityText: string | null = null;
      let textOptions: Record<string, unknown> | null = null;
      let rectWidth: number | null = null;
      let rectHeight: number | null = null;
      let entityColor: [number, number, number] = [255, 255, 255];
      let entityVisualNode: IRenderNode | null = null;

      const entity: Record<string, unknown> = {
        pos: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        opacity: 1,
        z: 0,
        hidden: false,
        fixed: false,
        exists: () => true,
        onUpdate: (cb: () => void) => context.onUpdate(cb),
        onClick: (callback: () => void) => {
          if (isFixedElement && rectWidth !== null && rectHeight !== null) {
            const activeChecker =
              engine.isInitialized && typeof engine.getScreenLayerGeometryChecker === "function"
                ? (engine.getScreenLayerGeometryChecker() as ReturnType<typeof getScreenLayerGeometryChecker>)
                : getScreenLayerGeometryChecker();

            const buttonWidth = rectWidth;
            const buttonHeight = rectHeight;
            const cancelHitTarget = activeChecker.registerHitTarget({
              id: `entity_screen_button_${Math.random().toString(36).slice(2, 9)}`,
              bounds: () => {
                const targetX = anchorPoint === "center" ? positionX - buttonWidth / 2 : positionX;
                const targetY = anchorPoint === "center" ? positionY - buttonHeight / 2 : positionY;
                return {
                  x: targetX,
                  y: targetY,
                  width: buttonWidth,
                  height: buttonHeight,
                };
              },
              zIndex: entityZIndex,
              onClick: () => callback(),
            });
            sceneCleanupCallbacks.push(cancelHitTarget);
            return { cancel: cancelHitTarget };
          }
          return context.onMousePress(callback);
        },
        onHoverUpdate: () => ({ cancel: () => {} }),
        onHoverEnd: () => ({ cancel: () => {} }),
        play: () => {},
        destroy: () => {
          if (entityVisualNode) {
            entityVisualNode.destroy();
            entityVisualNode = null;
          }
          for (const set of taggedEntities.values()) {
            set.delete(entity);
          }
        },
      };

      if (Array.isArray(components)) {
        for (const comp of components) {
          if (typeof comp === "string") {
            let bucket = taggedEntities.get(comp);
            if (!bucket) {
              bucket = new Set<unknown>();
              taggedEntities.set(comp, bucket);
            }
            bucket.add(entity);
          } else if (comp && typeof comp === "object") {
            const c = comp as Record<string, unknown>;
            if (c.type === "pos" && typeof c.x === "number" && typeof c.y === "number") {
              positionX = c.x;
              positionY = c.y;
            } else if (c.type === "opacity" && typeof c.opacity === "number") {
              entityOpacity = c.opacity;
            } else if (c.type === "z" && typeof c.z === "number") {
              entityZIndex = c.z;
            } else if (c.type === "fixed") {
              isFixedElement = true;
              entity.fixed = true;
            } else if (c.type === "anchor" && typeof c.anchorPoint === "string") {
              anchorPoint = c.anchorPoint as typeof anchorPoint;
            } else if (c.type === "text" && typeof c.text === "string") {
              entityText = c.text;
              textOptions = (c.options as Record<string, unknown>) ?? null;
              entity.text = entityText;
            } else if (
              c.type === "rect" &&
              typeof c.width === "number" &&
              typeof c.height === "number"
            ) {
              rectWidth = c.width;
              rectHeight = c.height;
            } else if (c.type === "color" && Array.isArray(c.args)) {
              const args = c.args as unknown[];
              if (args.length === 3 && typeof args[0] === "number") {
                entityColor = [args[0], args[1] as number, args[2] as number];
              } else if (args.length === 1 && Array.isArray(args[0])) {
                entityColor = args[0] as [number, number, number];
              }
            }
          }
        }
      }

      if (engine.isInitialized) {
        const targetContainer = isFixedElement
          ? engine.getScreenContainer()
          : engine.getWorldContainer();

        if (rectWidth !== null && rectHeight !== null) {
          const graphicsNode = engine.createGraphics(
            `entity_rect_${Math.random().toString(36).slice(2, 9)}`
          );
          graphicsNode.drawRect(0, 0, rectWidth, rectHeight, {
            fill: { color: entityColor, alpha: entityOpacity },
          });
          graphicsNode.setPosition(positionX, positionY);
          graphicsNode.setZIndex(entityZIndex);
          targetContainer.addChild(graphicsNode);
          entityVisualNode = graphicsNode;
          entity.renderNode = graphicsNode;
        } else if (entityText !== null) {
          const fontSize = typeof textOptions?.size === "number" ? textOptions.size : 16;
          const fontFamily = typeof textOptions?.font === "string" ? textOptions.font : "Outfit";
          const textNode = engine.createText(
            entityText,
            {
              fontSize,
              fontFamily,
              color: entityColor,
            },
            `entity_text_${Math.random().toString(36).slice(2, 9)}`
          );
          textNode.setPosition(positionX, positionY);
          textNode.setZIndex(entityZIndex);
          textNode.setOpacity(entityOpacity);
          targetContainer.addChild(textNode);
          entityVisualNode = textNode;
          entity.renderNode = textNode;
        }
      }

      Object.defineProperty(entity, "opacity", {
        get: () => entityOpacity,
        set: (newOpacity: number) => {
          entityOpacity = newOpacity;
          if (entityVisualNode) {
            entityVisualNode.setOpacity(newOpacity);
          }
        },
        configurable: true,
        enumerable: true,
      });

      const positionProxy = {
        get x() {
          return positionX;
        },
        set x(newX: number) {
          positionX = newX;
          if (entityVisualNode) {
            entityVisualNode.setPosition(positionX, positionY);
          }
        },
        get y() {
          return positionY;
        },
        set y(newY: number) {
          positionY = newY;
          if (entityVisualNode) {
            entityVisualNode.setPosition(positionX, positionY);
          }
        },
      };
      entity.pos = positionProxy;
      entity.z = entityZIndex;

      let allBucket = taggedEntities.get("*");
      if (!allBucket) {
        allBucket = new Set<unknown>();
        taggedEntities.set("*", allBucket);
      }
      allBucket.add(entity);

      if (entityVisualNode) {
        sceneCleanupCallbacks.push(() => {
          if (entityVisualNode) {
            entityVisualNode.destroy();
            entityVisualNode = null;
          }
        });
      }

      return entity;
    },

    destroy(target) {
      if (target && typeof target === "object" && "destroy" in target) {
        const destroyFn = (target as { destroy?: () => void }).destroy;
        if (typeof destroyFn === "function") {
          destroyFn();
        }
      }
      for (const set of taggedEntities.values()) {
        set.delete(target);
      }
    },

    tween(from, to, duration, setter, ease) {
      const easingFn = typeof ease === "function" ? (ease as EasingFunction) : Easings.easeOutQuad;
      const ticker = engine.isInitialized ? engine.getTicker() : undefined;
      const handle = createTween(from, to, duration, setter, easingFn, ticker);
      sceneCleanupCallbacks.push(() => handle.cancel());
      return {
        then(callback: () => void) {
          void handle.promise.then(callback);
        },
      };
    },

    onSceneLeave(callback) {
      sceneLeaveCallbacks.push(callback);
      return {
        cancel: () => {
          const idx = sceneLeaveCallbacks.indexOf(callback);
          if (idx !== -1) sceneLeaveCallbacks.splice(idx, 1);
        },
      };
    },

    onKeyPress(keyOrCallback: string | (() => void), maybeCallback?: () => void) {
      if (typeof window === "undefined") {
        return { cancel: () => {} };
      }
      const handler = (event: KeyboardEvent): void => {
        if (typeof keyOrCallback === "function") {
          keyOrCallback();
          return;
        }
        if (event.key.toLowerCase() === keyOrCallback.toLowerCase()) {
          maybeCallback?.();
        }
      };
      window.addEventListener("keydown", handler);
      const cancel = (): void => {
        window.removeEventListener("keydown", handler);
      };
      sceneCleanupCallbacks.push(cancel);
      return { cancel };
    },

    onMousePress(callback) {
      if (typeof window === "undefined") {
        return { cancel: () => {} };
      }
      const handler = (): void => {
        callback();
      };
      window.addEventListener("pointerdown", handler);
      const cancel = (): void => {
        window.removeEventListener("pointerdown", handler);
      };
      sceneCleanupCallbacks.push(cancel);
      return { cancel };
    },

    isMousePressed() {
      return mousePressed;
    },

    onUpdate(callback) {
      const handler = (deltaTimeInSeconds: number): void => {
        callback(deltaTimeInSeconds);
      };
      sceneUpdateCallbacks.push(handler);
      const cancel = (): void => {
        const index = sceneUpdateCallbacks.indexOf(handler);
        if (index !== -1) {
          sceneUpdateCallbacks.splice(index, 1);
        }
      };
      sceneCleanupCallbacks.push(cancel);
      return { cancel };
    },

    wait(duration, callback) {
      const timeoutId = setTimeout(callback, Math.max(0, duration * 1000));
      const cancel = (): void => {
        clearTimeout(timeoutId);
      };
      sceneCleanupCallbacks.push(cancel);
      return { cancel };
    },

    camPos(cameraPositionOrX?: number | { x: number; y: number }, cameraPositionY?: number) {
      if (typeof cameraPositionOrX === "number") {
        const currentCameraPosition = engine.getCameraPosition();
        const targetPositionY = cameraPositionY ?? currentCameraPosition.y;
        engine.setCameraPosition(cameraPositionOrX, targetPositionY);
      } else if (cameraPositionOrX && typeof cameraPositionOrX === "object") {
        engine.setCameraPosition(cameraPositionOrX.x, cameraPositionOrX.y);
      }
      return engine.getCameraPosition();
    },

    get(tag) {
      const bucket = taggedEntities.get(tag);
      return bucket ? Array.from(bucket) : [];
    },

    setFullscreen(fullscreen) {
      if (fullscreen) {
        void requestDocumentFullscreen();
      } else {
        void exitDocumentFullscreen();
      }
    },

    isFullscreen() {
      return isDocumentFullscreen();
    },
  };

  return context;
}

const engineBridge = createPixiBridgeContext(renderEngine, sceneManager);

async function bootstrapRenderEngine(): Promise<void> {
  // Garante que apenas um único canvas WebGL do PixiJS v8 exista no container #app
  if (appContainer) {
    const existingCanvases = appContainer.querySelectorAll("canvas");
    for (let i = 0; i < existingCanvases.length; i++) {
      existingCanvases[i].remove();
    }
  }

  await renderEngine.init({
    width: resolution.width,
    height: resolution.height,
    backgroundColor: [6, 18, 42],
    resolution: 1,
    antialias: false,
    autoDensity: true,
    containerElement: appContainer,
  });

  const canvas = renderEngine.getCanvas();
  if (canvas) {
    canvas.style.objectFit = isLetterbox ? "contain" : "fill";
  }

  // Barras Protetoras de Letterbox (Fase 33.4) no stageRoot do PixiJS v8
  setupLetterboxBorders(renderEngine);

  // Carrega tipografia vetorial e sprites modulares (Fase 48.2)
  loadAllGameAssets(engineBridge);

  accessibilitySystem.init();

  // Suporte global para alternar Tela Cheia com F11 via Fullscreen API nativa
  initializeFullscreenHandler();

  // Registra todas as cenas modulares do jogo (Fase 37.7 / Migração IScene Etapa 1.3)
  registerAllScenes(engineBridge, sceneManager);

  // Sincroniza o SceneManager com o ticker único do RenderEngineAdapter
  renderEngine.getTicker().add((dt) => {
    sceneManager.update(dt);
  });

  // Inicia o jogo na Splash Screen Animada (Fase 13)
  void sceneManager.loadScene("splash");
}

void bootstrapRenderEngine();

// Registro do PWA Service Worker Offline-First para Totens e Tablets (Fase 19.2)
// Em desenvolvimento (DEV), desregistra e limpa caches para assegurar código sempre atualizado em tempo real
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
        reportInformation("[PWA] Service Worker desregistrado para desenvolvimento ativo.");
      }
    });
    if ("caches" in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
  } else {
    window.addEventListener("load", () => {
      const base = import.meta.env.BASE_URL ?? "/";
      const swPath = `${base.endsWith("/") ? base : `${base}/`}sw.js`;
      navigator.serviceWorker
        .register(swPath, { scope: base })
        .then((registration) => {
          reportInformation(
            `[PWA] Micro Splash Service Worker ativo (Escopo: ${registration.scope})`
          );
        })
        .catch((err) => {
          reportWarning("[PWA] Falha no registro do Service Worker:", undefined, err);
        });
    });
  }
}
