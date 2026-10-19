import kaboom from "kaboom";
import { getSavedResolution, getSavedDisplayMode } from "./config";
import { accessibilitySystem } from "./systems/accessibilitySystem";
import { errorReporter } from "./services/errorReporter";
import { initPwaManager } from "./utils/pwaManager";
import { reportInformation, reportWarning } from "./utils/errorReporter";
import { setupLetterboxBorders } from "./systems/letterboxSystem";
import { registerAllScenes, loadAllGameAssets } from "./scenes";

// Inicializa observabilidade e proteção contra exceções em totens (Fase 27)
errorReporter.setupGlobalHandlers();
initPwaManager();

const resolution = getSavedResolution();
const displayMode = getSavedDisplayMode();
const isLetterbox = displayMode === "letterbox";

const k = kaboom({
  width: resolution.width,
  height: resolution.height,
  letterbox: isLetterbox,
  stretch: !isLetterbox,
  background: [6, 18, 42],
  debug: false,
  font: "Inter",
});

// Barras Protetoras de Letterbox (Fase 33.4)
setupLetterboxBorders(k);

// Carrega tipografia vetorial e sprites modulares (Fase 48.2)
loadAllGameAssets(k);

accessibilitySystem.init();

// Suporte global para alternar Tela Cheia com F11
k.onKeyPress("f11", () => {
  k.setFullscreen(!k.isFullscreen());
});

// Registra todas as cenas modulares do jogo (Fase 37.7)
registerAllScenes(k);

// Inicia o jogo na Splash Screen Animada (Fase 13)
k.go("splash");

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
      navigator.serviceWorker
        .register("/sw.js")
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
