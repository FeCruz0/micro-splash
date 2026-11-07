/**
 * Utilitários de Câmera — Micro Splash
 *
 * Fornece métodos seguros para tremor de tela (screen shake) e controle de viewport,
 * respeitando preferências de movimento reduzido (WCAG 2.1 AA).
 * Desacoplado do Kaboom.js, com tipagem estrita e zero any.
 */

import { accessibilitySystem } from "../systems/accessibilitySystem";
import type { IRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import type { LegacyEngineBridge } from "../engine/adapters/LegacyBridge";
import { getActiveRenderEngine } from "../engine/adapters/RenderEngineAdapter";

export { cameraSystem, CameraSystem, type CameraFollowOptions } from "../systems/cameraSystem";

export interface CameraShakeContext {
  shake?(intensity: number): unknown;
}

/**
 * Dispara um tremor de câmera respeitando as diretrizes de acessibilidade para movimento reduzido.
 * Caso o modo de movimento reduzido esteja ativo, o tremor é suprimido silenciosamente.
 *
 * @param engineOrContext Instância de IRenderEngine, LegacyEngineBridge ou contexto gráfico com suporte a shake.
 * @param shakeIntensityInPixels Intensidade do tremor em pixels.
 */
export function safeShake(
  engineOrContext: CameraShakeContext | IRenderEngine | LegacyEngineBridge,
  shakeIntensityInPixels: number
): void {
  if (!engineOrContext) return;

  if (accessibilitySystem.isReducedMotion()) {
    return;
  }

  const shakeTarget = engineOrContext as CameraShakeContext;
  if (typeof shakeTarget.shake === "function") {
    shakeTarget.shake(shakeIntensityInPixels);
    return;
  }

  const activeRenderEngine = getActiveRenderEngine();
  if (activeRenderEngine && typeof activeRenderEngine.shake === "function") {
    activeRenderEngine.shake(shakeIntensityInPixels);
  }
}
