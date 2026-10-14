// =============================================================================
// TTS SYSTEM (Web Speech API) - Micro Splash (Fase 21)
// Permite narração acessível dos fatos ecológicos usando síntese nativa de voz.
// 100% offline e sem arquivos de áudio externos.
// =============================================================================

import { readLocalStorageWithSchema, writeLocalStorage } from "../utils/storage";
import { HapticsEnabledSchema } from "../schemas/storageSchemas";

const STORAGE_KEY = "micro_splash_tts";

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window !== "undefined" && window.speechSynthesis) return window.speechSynthesis;
  if (
    typeof globalThis !== "undefined" &&
    "speechSynthesis" in globalThis &&
    (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis
  ) {
    return (globalThis as { speechSynthesis: SpeechSynthesis }).speechSynthesis;
  }
  return null;
}

function getUtteranceClass(): typeof SpeechSynthesisUtterance | null {
  if (typeof SpeechSynthesisUtterance !== "undefined") return SpeechSynthesisUtterance;
  const targetScope = (typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : null) as unknown as Record<string, unknown> | null;
  if (targetScope && typeof targetScope.SpeechSynthesisUtterance === "function") {
    return targetScope.SpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance;
  }
  return null;
}

class TtsSystem {
  private enabled: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.loadState();
  }

  private loadState() {
    this.enabled = readLocalStorageWithSchema(STORAGE_KEY, HapticsEnabledSchema, false);
  }

  public isSupported(): boolean {
    return getSpeechSynthesis() !== null && getUtteranceClass() !== null;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(value: boolean): void {
    this.enabled = value;
    writeLocalStorage(STORAGE_KEY, value);
    if (!value) {
      this.stop();
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public getLabel(): string {
    return this.enabled ? "Narração por Voz: LIGADA 🗣️" : "Narração por Voz: DESLIGADA 🔇";
  }

  public speak(text: string): void {
    if (!this.enabled || !this.isSupported()) return;

    try {
      this.stop();

      const UtteranceConstructor = getUtteranceClass();
      const synth = getSpeechSynthesis();
      if (!UtteranceConstructor || !synth) return;

      const utterance = new UtteranceConstructor(text);
      utterance.lang = "pt-BR";
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      if (synth.getVoices) {
        const voices = synth.getVoices();
        const ptVoice = voices.find(
          (v) =>
            v.lang === "pt-BR" ||
            v.lang.startsWith("pt") ||
            (v.name && v.name.toLowerCase().includes("brazil")) ||
            (v.name && v.name.toLowerCase().includes("portuguese"))
        );
        if (ptVoice) {
          utterance.voice = ptVoice;
        }
      }

      this.currentUtterance = utterance;

      utterance.onend = () => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
      };

      utterance.onerror = () => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
      };

      synth.speak(utterance);
    } catch {
      this.currentUtterance = null;
    }
  }

  public stop(): void {
    const synth = getSpeechSynthesis();
    if (synth) {
      try {
        synth.cancel();
      } catch {}
    }
    this.currentUtterance = null;
  }
}

export const ttsSystem = new TtsSystem();
