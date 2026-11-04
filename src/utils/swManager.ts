import { reportInformation, reportWarning } from "./errorReporter";

let registrationInstance: ServiceWorkerRegistration | null = null;
let isUpdateReady = false;
let updateCallback: (() => void) | null = null;

export function initServiceWorker(onUpdateAvailable?: () => void): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (onUpdateAvailable) {
    updateCallback = onUpdateAvailable;
  }

  window.addEventListener("load", async () => {
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      const swPath = `${base.endsWith("/") ? base : `${base}/`}sw.js`;
      const registration = await navigator.serviceWorker.register(swPath, {
        scope: base,
      });
      registrationInstance = registration;
      reportInformation("Service Worker registrado com sucesso.");

      // Se já houver um worker esperando ativação
      if (registration.waiting) {
        isUpdateReady = true;
        if (updateCallback) updateCallback();
      }

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            isUpdateReady = true;
            reportInformation("Nova versão do Service Worker pronta para ativação.");
            if (updateCallback) {
              updateCallback();
            }
          }
        });
      });
    } catch (error) {
      reportWarning("Falha ao registrar Service Worker", undefined, error);
    }
  });

  // Escuta troca de controlador para recarregar se solicitado
  let isRefreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!isRefreshing) {
      isRefreshing = true;
      window.location.reload();
    }
  });
}

export function hasUpdateAvailable(): boolean {
  return isUpdateReady;
}

export function skipWaitingAndReload(): void {
  if (registrationInstance?.waiting) {
    registrationInstance.waiting.postMessage({ type: "SKIP_WAITING" });
  } else if (typeof window !== "undefined") {
    window.location.reload();
  }
}

export async function checkForServiceWorkerUpdates(): Promise<boolean> {
  if (!registrationInstance) return false;

  try {
    await registrationInstance.update();
    return isUpdateReady;
  } catch {
    return false;
  }
}
