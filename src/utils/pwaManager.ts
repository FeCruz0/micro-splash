import { reportInformation } from "./errorReporter";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let networkStatusChangeListeners: Array<(isOnline: boolean) => void> = [];
let isInitialized = false;

const handleBeforeInstallPrompt = (event: Event) => {
  event.preventDefault();
  deferredInstallPrompt = event as BeforeInstallPromptEvent;
  reportInformation("PWA pronto para instalação autônoma.");
};

const handleOnlineEvent = () => {
  networkStatusChangeListeners.forEach((callback) => callback(true));
};

const handleOfflineEvent = () => {
  networkStatusChangeListeners.forEach((callback) => callback(false));
};

export function initPwaManager(): void {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("online", handleOnlineEvent);
  window.addEventListener("offline", handleOfflineEvent);
}

export function cleanupPwaManager(): void {
  if (typeof window === "undefined" || !isInitialized) return;
  isInitialized = false;
  deferredInstallPrompt = null;
  networkStatusChangeListeners = [];

  window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.removeEventListener("online", handleOnlineEvent);
  window.removeEventListener("offline", handleOfflineEvent);
}

export function canInstallPwa(): boolean {
  return deferredInstallPrompt !== null;
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false;

  try {
    await deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return choiceResult.outcome === "accepted";
  } catch {
    deferredInstallPrompt = null;
    return false;
  }
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") {
    return true;
  }
  return navigator.onLine;
}

export function subscribeToNetworkStatusChange(callback: (isOnline: boolean) => void): () => void {
  networkStatusChangeListeners.push(callback);
  return () => {
    networkStatusChangeListeners = networkStatusChangeListeners.filter(
      (listener) => listener !== callback
    );
  };
}
