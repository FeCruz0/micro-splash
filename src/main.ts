import kaboom from "kaboom";
import { getSavedResolution, getSavedDisplayMode } from "./config";
import { accessibilitySystem } from "./systems/accessibilitySystem";
import { errorReporter } from "./services/errorReporter";
import { initPwaManager } from "./utils/pwaManager";
import { reportInformation, reportWarning } from "./utils/errorReporter";
import { setupLetterboxBorders } from "./systems/letterboxSystem";
import { registerAllScenes } from "./scenes";

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

k.loadFont("Inter", "/fonts/Inter-SemiBold.ttf", { size: 64, filter: "linear" });
k.loadFont("Outfit", "/fonts/Outfit-Bold.ttf", { size: 64, filter: "linear" });
k.loadFont("Orbitron", "/fonts/Orbitron-Bold.ttf", { size: 64, filter: "linear" });

accessibilitySystem.init();

// Suporte global para alternar Tela Cheia com F11
k.onKeyPress("f11", () => {
  k.setFullscreen(!k.isFullscreen());
});

k.loadSprite("baleia", "/sprites/whale.png", {
  sliceX: 16,
  sliceY: 1,
  anims: {
    glide: 0,
    idle_swim: { from: 1, to: 4, loop: true, speed: 4 },
    stroke_down: { from: 5, to: 9, speed: 14 },
    stroke_up: { from: 10, to: 13, speed: 12 },
    swim: { from: 5, to: 13, loop: true, speed: 10 },
    feed: { from: 14, to: 15, loop: true, speed: 6 },
  },
});

// Fauna de Fundo e Cenário (Fase 11 / Polimento Visual)
k.loadSprite("orca_bg", "/sprites/orca_bg.png", {
  sliceX: 4,
  sliceY: 1,
  anims: {
    swim: { from: 0, to: 3, loop: true, speed: 5 },
  },
});

k.loadSprite("jubarte_bg", "/sprites/humpback_bg.png", {
  sliceX: 4,
  sliceY: 1,
  anims: {
    swim: { from: 0, to: 3, loop: true, speed: 3.2 },
  },
});

k.loadSprite("cachalote_bg", "/sprites/cachalote_bg.png", {
  sliceX: 4,
  sliceY: 1,
  anims: {
    swim: { from: 0, to: 3, loop: true, speed: 2.4 },
  },
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
