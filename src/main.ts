import { getSavedResolution, getSavedDisplayMode } from "./config";
import { accessibilitySystem } from "./systems/accessibilitySystem";
import { errorReporter } from "./services/errorReporter";
import { initPwaManager } from "./utils/pwaManager";
import { reportError, reportInformation, reportWarning } from "./utils/errorReporter";
import { showBootErrorOverlay } from "./utils/bootErrorOverlay";
import { setupLetterboxBorders } from "./systems/letterboxSystem";
import { registerAllScenes } from "./scenes";
import { loadAllGameAssets } from "./scenes/assetLoader";
import { RenderEngineAdapter } from "./engine/adapters/RenderEngineAdapter";
import { SceneManager, type SceneTransitionFailure } from "./engine/SceneManager";
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

/**
 * Tempo máximo que o boot aguarda o carregamento de assets antes de seguir adiante.
 * O jogo não pode depender de um carregamento que nunca termina (rede lenta, arquivo travado).
 */
const ASSET_LOADING_TIMEOUT_IN_MILLISECONDS = 8000;

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

/**
 * Torna uma falha crítica de boot visível: log estruturado, relatório de erro e overlay no DOM.
 */
function reportBootFailure(failureDescription: string, bootError: unknown): void {
  console.error(`[Boot] ${failureDescription}`, bootError);
  reportError(`[Boot] ${failureDescription}`, bootError);
  showBootErrorOverlay(failureDescription, bootError);
}

/**
 * Carrega os assets sem nunca bloquear o boot de forma indefinida e sem jamais lançar:
 * em caso de erro ou de estouro do tempo limite, registra um aviso e o boot segue.
 */
async function loadGameAssetsWithTimeout(): Promise<void> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<"timeout">((resolveTimeout) => {
    timeoutHandle = setTimeout(
      () => resolveTimeout("timeout"),
      ASSET_LOADING_TIMEOUT_IN_MILLISECONDS
    );
  });

  try {
    const loadingOutcome = await Promise.race([
      loadAllGameAssets().then(() => "loaded" as const),
      timeoutPromise,
    ]);
    if (loadingOutcome === "timeout") {
      reportWarning(
        `[Boot] Carregamento de assets excedeu ${ASSET_LOADING_TIMEOUT_IN_MILLISECONDS} ms; seguindo sem aguardar.`
      );
    }
  } catch (assetLoadingError) {
    reportWarning("[Boot] Falha ao carregar assets; seguindo com o boot.", undefined, assetLoadingError);
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function bootstrapRenderEngine(): Promise<void> {
  let currentBootStage = "inicialização do motor de renderização";

  try {
    // Falhas de transição de cena (ex.: exceção em enter) ficam visíveis em vez de congelar o jogo.
    sceneManager.setTransitionErrorHandler((transitionFailure: SceneTransitionFailure) => {
      reportBootFailure(
        `Falha na transição para a cena "${transitionFailure.sceneName}" (fase ${transitionFailure.phase})`,
        transitionFailure.error
      );
    });

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

    currentBootStage = "barras de letterbox";
    // Barras Protetoras de Letterbox (Fase 33.4) no stageRoot do PixiJS v8
    setupLetterboxBorders(renderEngine);

    currentBootStage = "carregamento de assets";
    // Carrega tipografia vetorial e sprites modulares (Fase 48.2), com tempo limite
    await loadGameAssetsWithTimeout();

    currentBootStage = "acessibilidade e tela cheia";
    accessibilitySystem.init();

    // Suporte global para alternar Tela Cheia com F11 via Fullscreen API nativa
    initializeFullscreenHandler();

    currentBootStage = "registro de cenas";
    // Registra todas as cenas modulares do jogo (Fase 37.7 / Migração IScene Etapa 1.3)
    registerAllScenes(renderingContext, sceneManager);

    currentBootStage = "ticker principal";
    // Sincroniza o SceneManager com o ticker único do RenderEngineAdapter
    renderEngine.getTicker().add((deltaTimeInSeconds) => {
      sceneManager.update(deltaTimeInSeconds);
    });

    currentBootStage = "cena splash";
    // Inicia o jogo na Splash Screen Animada (Fase 13).
    // A falha já é reportada pelo handler de transição do SceneManager; aqui apenas se evita
    // uma segunda rejeição não tratada.
    await sceneManager.loadScene("splash").catch(() => undefined);
  } catch (bootError) {
    reportBootFailure(`Falha durante o boot (${currentBootStage})`, bootError);
  }
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
