import type { KaboomCtx } from "kaboom";
import { accessibilitySystem } from "../systems/accessibilitySystem";

/**
 * Triggers a camera shake effect respecting prefers-reduced-motion accessibility settings.
 * If reduced motion is active, the camera shake is safely suppressed.
 */
export function safeShake(k: KaboomCtx, shakeIntensityInPixels: number): void {
  if (!k || typeof k.shake !== "function") return;
  accessibilitySystem.triggerShake(k, shakeIntensityInPixels);
}
