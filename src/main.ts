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
import { SceneManager } from "./engine/SceneManager";
import { createTween, Easings, type EasingFunction } from "./engine/utils/Tween";
import { detectGpuCapabilities } from "./utils/gpuDiagnostics";

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
  const cameraPos = { x: 0, y: 0 };
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

    body(options) {
      return { type: "body", options };
    },

    text(content, options) {
      return { type: "text", text: content, options };
    },

    add(components) {
      const entity: Record<string, unknown> = {
        pos: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        opacity: 1,
        z: 0,
        hidden: false,
        exists: () => true,
        onUpdate: (cb: () => void) => context.onUpdate(cb),
        onClick: (cb: () => void) => context.onMousePress(cb),
        onHoverUpdate: () => ({ cancel: () => {} }),
        onHoverEnd: () => ({ cancel: () => {} }),
        play: () => {},
        destroy: () => {
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
              entity.pos = { x: c.x, y: c.y };
            } else if (c.type === "opacity" && typeof c.opacity === "number") {
              entity.opacity = c.opacity;
            } else if (c.type === "z" && typeof c.z === "number") {
              entity.z = c.z;
            } else if (c.type === "text" && typeof c.text === "string") {
              entity.text = c.text;
            }
          }
        }
      }

      let allBucket = taggedEntities.get("*");
      if (!allBucket) {
        allBucket = new Set<unknown>();
        taggedEntities.set("*", allBucket);
      }
      allBucket.add(entity);

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

    camPos(xOrPos?: number | { x: number; y: number }, y?: number) {
      if (typeof xOrPos === "number") {
        cameraPos.x = xOrPos;
        cameraPos.y = y ?? cameraPos.y;
      } else if (xOrPos && typeof xOrPos === "object") {
        cameraPos.x = xOrPos.x;
        cameraPos.y = xOrPos.y;
      }
      return { x: cameraPos.x, y: cameraPos.y };
    },

    get(tag) {
      const bucket = taggedEntities.get(tag);
      return bucket ? Array.from(bucket) : [];
    },

    setFullscreen(fullscreen) {
      if (typeof document === "undefined") return;
      if (fullscreen && !document.fullscreenElement) {
        void document.documentElement.requestFullscreen?.().catch(() => undefined);
      } else if (!fullscreen && document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => undefined);
      }
    },

    isFullscreen() {
      return typeof document !== "undefined" && Boolean(document.fullscreenElement);
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

  // Suporte global para alternar Tela Cheia com F11
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "f11") {
        event.preventDefault();
        engineBridge.setFullscreen(!engineBridge.isFullscreen());
      }
    });
  }

  // Registra todas as cenas modulares do jogo (Fase 37.7)
  registerAllScenes(engineBridge);

  // Sincroniza o SceneManager com o ticker único do RenderEngineAdapter
  renderEngine.getTicker().add((dt) => {
    sceneManager.update(dt);
  });

  // Inicia o jogo na Splash Screen Animada (Fase 13)
  engineBridge.go("splash");
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
