/**
 * Manipulador e Gerenciador de Tela Cheia (Fullscreen API) — Micro Splash
 *
 * Trata o atalho de teclado F11 e as transições de tela cheia exclusivamente
 * através da Fullscreen API nativa do documento (document.documentElement),
 * com resiliência para navegadores com prefixos de fabricante e ambientes SSR/headless.
 */

export interface VendorDocument extends Document {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

export interface VendorHTMLElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

/**
 * Verifica se o documento atual está em modo de tela cheia nativo.
 */
export function isDocumentFullscreen(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  const vendorDocument = document as VendorDocument;
  return Boolean(
    vendorDocument.fullscreenElement ??
      vendorDocument.webkitFullscreenElement ??
      vendorDocument.mozFullScreenElement ??
      vendorDocument.msFullscreenElement
  );
}

/**
 * Solicita a transição para modo de tela cheia no elemento alvo (padrão: document.documentElement).
 */
export async function requestDocumentFullscreen(
  targetElement?: HTMLElement
): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }
  const elementToRequest = targetElement ?? document.documentElement;
  const vendorElement = elementToRequest as VendorHTMLElement;

  try {
    if (typeof elementToRequest.requestFullscreen === "function") {
      await elementToRequest.requestFullscreen();
    } else if (typeof vendorElement.webkitRequestFullscreen === "function") {
      await vendorElement.webkitRequestFullscreen();
    } else if (typeof vendorElement.mozRequestFullScreen === "function") {
      await vendorElement.mozRequestFullScreen();
    } else if (typeof vendorElement.msRequestFullscreen === "function") {
      await vendorElement.msRequestFullscreen();
    }
  } catch (_error) {
    // Falha silenciosa caso rejeitado por políticas de permissão do navegador
  }
}

/**
 * Sai do modo de tela cheia no documento atual.
 */
export async function exitDocumentFullscreen(): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }
  const vendorDocument = document as VendorDocument;

  try {
    if (typeof document.exitFullscreen === "function") {
      await document.exitFullscreen();
    } else if (typeof vendorDocument.webkitExitFullscreen === "function") {
      await vendorDocument.webkitExitFullscreen();
    } else if (typeof vendorDocument.mozCancelFullScreen === "function") {
      await vendorDocument.mozCancelFullScreen();
    } else if (typeof vendorDocument.msExitFullscreen === "function") {
      await vendorDocument.msExitFullscreen();
    }
  } catch (_error) {
    // Falha silenciosa caso o documento já não esteja em tela cheia
  }
}

/**
 * Alterna entre modo janela e tela cheia.
 */
export async function toggleDocumentFullscreen(
  targetElement?: HTMLElement
): Promise<void> {
  if (isDocumentFullscreen()) {
    await exitDocumentFullscreen();
  } else {
    await requestDocumentFullscreen(targetElement);
  }
}

/**
 * Trata o evento de teclado para a tecla F11.
 * Retorna true se o evento foi interceptado e tratado.
 */
export function handleFullscreenKeyboardEvent(keyboardEvent: KeyboardEvent): boolean {
  if (keyboardEvent.key && keyboardEvent.key.toLowerCase() === "f11") {
    keyboardEvent.preventDefault();
    void toggleDocumentFullscreen();
    return true;
  }
  return false;
}

/**
 * Inicializa o ouvinte de eventos de janela para o atalho F11.
 * Retorna uma função para remover o ouvinte registrado.
 */
export function initializeFullscreenHandler(targetWindow?: Window): () => void {
  const windowInstance = targetWindow ?? (typeof window !== "undefined" ? window : undefined);
  if (!windowInstance) {
    return () => {};
  }

  const keyboardEventListener = (keyboardEvent: KeyboardEvent): void => {
    handleFullscreenKeyboardEvent(keyboardEvent);
  };

  windowInstance.addEventListener("keydown", keyboardEventListener);

  return () => {
    windowInstance.removeEventListener("keydown", keyboardEventListener);
  };
}

export const fullscreenHandler = {
  isFullscreen: isDocumentFullscreen,
  requestFullscreen: requestDocumentFullscreen,
  exitFullscreen: exitDocumentFullscreen,
  toggleFullscreen: toggleDocumentFullscreen,
  handleKeyboardEvent: handleFullscreenKeyboardEvent,
  initialize: initializeFullscreenHandler,
};
