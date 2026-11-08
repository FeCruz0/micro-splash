/**
 * Overlay de erro de boot — Micro Splash
 *
 * Torna visível no DOM qualquer falha crítica de inicialização ou de transição de cena,
 * evitando que o jogo pareça "congelado" sem nenhuma indicação além do console.
 */

const BOOT_ERROR_OVERLAY_ELEMENT_ID = "micro-splash-boot-error-overlay";
const MAXIMUM_STACK_TRACE_CHARACTERS = 1200;

function describeBootError(bootError: unknown): string {
  if (bootError instanceof Error) {
    const stackTraceText = bootError.stack ?? "";
    const detailText = stackTraceText.includes(bootError.message)
      ? stackTraceText
      : `${bootError.message}\n${stackTraceText}`;
    return detailText.slice(0, MAXIMUM_STACK_TRACE_CHARACTERS);
  }
  return String(bootError).slice(0, MAXIMUM_STACK_TRACE_CHARACTERS);
}

/**
 * Exibe (ou acrescenta uma entrada a) um painel de erro fixo sobre o canvas.
 * Usa apenas textContent, sem innerHTML, para não interpretar conteúdo de mensagens de erro.
 */
export function showBootErrorOverlay(titleText: string, bootError: unknown): void {
  if (typeof document === "undefined" || !document.body) {
    return;
  }

  let overlayElement = document.getElementById(BOOT_ERROR_OVERLAY_ELEMENT_ID);
  if (!overlayElement) {
    overlayElement = document.createElement("div");
    overlayElement.id = BOOT_ERROR_OVERLAY_ELEMENT_ID;
    overlayElement.setAttribute("role", "alert");
    overlayElement.style.cssText = [
      "position:fixed",
      "left:12px",
      "right:12px",
      "bottom:12px",
      "max-height:45vh",
      "overflow:auto",
      "z-index:2147483647",
      "padding:12px 14px",
      "border:1px solid #ff6b6b",
      "border-radius:8px",
      "background:rgba(40,8,12,0.94)",
      "color:#ffd9d9",
      "font:12px/1.4 monospace",
      "white-space:pre-wrap",
    ].join(";");
    document.body.appendChild(overlayElement);
  }

  const entryElement = document.createElement("div");
  entryElement.style.marginBottom = "8px";
  entryElement.textContent = `${titleText}\n${describeBootError(bootError)}`;
  overlayElement.appendChild(entryElement);
}
