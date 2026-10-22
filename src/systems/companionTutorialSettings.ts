import { readLocalStorageWithSchema, writeLocalStorage } from "../utils/storage";
import {
  CompanionTutorialEnabledSchema,
  CompanionTutorialSeenSchema,
} from "../schemas/storageSchemas";

export const COMPANION_TUTORIAL_ENABLED_STORAGE_KEY = "micro_splash_companion_whale_enabled";
export const COMPANION_TUTORIAL_SEEN_STORAGE_KEY = "micro_splash_companion_whale_seen";

/**
 * Checks if the companion whale tutorial is enabled by the player in settings.
 * Defaults to true.
 */
export function isCompanionTutorialEnabled(): boolean {
  return readLocalStorageWithSchema(
    COMPANION_TUTORIAL_ENABLED_STORAGE_KEY,
    CompanionTutorialEnabledSchema,
    true
  );
}

/**
 * Persists the enabled/disabled preference for the companion whale tutorial.
 */
export function setCompanionTutorialEnabled(isEnabled: boolean): void {
  writeLocalStorage(COMPANION_TUTORIAL_ENABLED_STORAGE_KEY, isEnabled);
}

/**
 * Checks if the player has already completed or witnessed the companion whale tutorial.
 */
export function hasSeenCompanionTutorial(): boolean {
  return readLocalStorageWithSchema(
    COMPANION_TUTORIAL_SEEN_STORAGE_KEY,
    CompanionTutorialSeenSchema,
    false
  );
}

/**
 * Marks the companion whale tutorial as completed in local storage.
 */
export function markCompanionTutorialSeen(): void {
  writeLocalStorage(COMPANION_TUTORIAL_SEEN_STORAGE_KEY, true);
}

/**
 * Resets the companion whale tutorial seen state (useful for tests and manual resets).
 */
export function resetCompanionTutorialSeen(): void {
  writeLocalStorage(COMPANION_TUTORIAL_SEEN_STORAGE_KEY, false);
}

/**
 * Determines whether the companion whale should spawn for the given game mode.
 * - quick_challenge / weekly: disabled by default to protect speedrun / competitive integrity.
 * - serene: enabled by default if user hasn't explicitly disabled it.
 * - standard: enabled for first-time players or if explicitly enabled and not completed yet.
 */
export function shouldSpawnCompanionWhale(gameMode: string): boolean {
  if (gameMode === "quick_challenge" || gameMode === "weekly") {
    return false;
  }

  const isEnabled = isCompanionTutorialEnabled();
  if (!isEnabled) {
    return false;
  }

  if (gameMode === "serene") {
    return true;
  }

  // Modo padrão: exibe se não concluiu ainda
  return !hasSeenCompanionTutorial();
}
