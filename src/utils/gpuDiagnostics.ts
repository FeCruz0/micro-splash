/**
 * Diagnóstico de Recursos de GPU e Aceleração de Hardware — Micro Splash
 *
 * Inspeciona o contexto WebGL para detectar se o navegador está operando
 * em modo de emulação por software (ex: SwiftShader no Chrome / llvmpipe no Linux)
 * ou se a aceleração por hardware está devidamente engajada.
 */

import { reportWarning } from "./errorReporter";

export interface GpuCapabilitiesReport {
  isSoftwareRenderer: boolean;
  renderer: string;
  vendor: string;
}

const SOFTWARE_RENDERER_SUBSTRINGS = [
  "swiftshader",
  "llvmpipe",
  "software",
  "microsoft basic render",
  "software rasterizer",
] as const;

export function detectGpuCapabilities(customCanvas?: HTMLCanvasElement): GpuCapabilitiesReport {
  if (!customCanvas && typeof document === "undefined") {
    return {
      isSoftwareRenderer: false,
      renderer: "Headless / Server Environment",
      vendor: "Unknown",
    };
  }

  try {
    const canvas = customCanvas ?? document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) {
      reportWarning("[MicroSplash:PERF] Contexto WebGL indisponível no navegador.", {
        canvasPresent: !!canvas,
      });
      return {
        isSoftwareRenderer: true,
        renderer: "WebGL Unavailable",
        vendor: "Unavailable",
      };
    }

    let renderer = "Generic WebGL";
    let vendor = "Generic Vendor";

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || renderer;
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || vendor;
    } else {
      renderer = gl.getParameter(gl.RENDERER) || renderer;
      vendor = gl.getParameter(gl.VENDOR) || vendor;
    }

    const lowerRenderer = renderer.toLowerCase();
    const isSoftwareRenderer = SOFTWARE_RENDERER_SUBSTRINGS.some((substr) =>
      lowerRenderer.includes(substr)
    );

    if (isSoftwareRenderer) {
      reportWarning(
        "[MicroSplash:PERF] Aceleração de hardware WebGL ausente. Renderizador por software detectado (SwiftShader/CPU).",
        { renderer, vendor }
      );
    }

    return {
      isSoftwareRenderer,
      renderer,
      vendor,
    };
  } catch (error) {
    return {
      isSoftwareRenderer: false,
      renderer: "Error Querying WebGL",
      vendor: "Unknown",
    };
  }
}
