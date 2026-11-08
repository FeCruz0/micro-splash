import { getSavedResolution, getSavedDisplayMode } from "./config";
import { accessibilitySystem } from "./systems/accessibilitySystem";
import { errorReporter } from "./services/errorReporter";
import { initPwaManager } from "./utils/pwaManager";
import { reportInformation, reportWarning } from "./utils/errorReporter";
import { setupLetterboxBorders } from "./systems/letterboxSystem";
import { registerAllScenes } from "./scenes";
import { loadAllGameAssets } from "./scenes/assetLoader";
import { RenderEngineAdapter } from "./engine/adapters/RenderEngineAdapter";
import { SceneManager } from "./engine/SceneManager";
import {
  createRenderingContext,
  type RenderingContext,
} from "./engine/adapters/RenderingContextAdapter";
import { detectGpuCapabilities } from "./utils/gpuDiagnostics";
import { initializeFullscreenHandler } from "./systems/fullscreenHandler";

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

// Contexto de renderização fortemente tipado via contratos da engine (Etapa 5.1b)
export const renderingContext: RenderingContext = createRenderingContext(
  renderEngine,
  sceneManager
);

async function bootstrapRenderEngine(): Promise<void> {
  // Garante que apenas um único canvas WebGL do PixiJS v8 exista no container #app
  if (appContainer) {
    const existingCanvases = appContainer.querySelectorAll("canvas");
    for (let index = 0; index < existingCanvases.length; index++) {
      existingCanvases[index].remove();
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

  const canvasElement = renderEngine.getCanvas();
  if (canvasElement) {
    canvasElement.style.objectFit = isLetterbox ? "contain" : "fill";
  }

  // Barras Protetoras de Letterbox (Fase 33.4) no stageRoot do PixiJS v8
  setupLetterboxBorders(renderEngine);

  // Carrega tipografia vetorial e sprites modulares (Fase 48.2)
  await loadAllGameAssets();

  accessibilitySystem.init();

  // Suporte global para alternar Tela Cheia com F11 via Fullscreen API nativa
  initializeFullscreenHandler();

  // Registra todas as cenas modulares do jogo (Fase 37.7 / Migração IScene Etapa 1.3)
  registerAllScenes(renderingContext, sceneManager);

  // Sincroniza o SceneManager com o ticker único do RenderEngineAdapter
  renderEngine.getTicker().add((deltaTimeInSeconds) => {
    sceneManager.update(deltaTimeInSeconds);
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
        .catch((error) => {
          reportWarning("[PWA] Falha no registro do Service Worker:", undefined, error);
        });
    });
  }
}
