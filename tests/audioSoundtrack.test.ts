import { describe, it, expect, beforeEach } from "vitest";
import { audioSystem } from "../src/systems/audioSystem";

describe("Fase 18.3: Seletor de Trilha Sonora / Jukebox Oceânica", () => {
  beforeEach(() => {
    localStorage.clear();
    audioSystem.setSoundtrackMode("chiptune");
  });

  it("inicia com a trilha 16-bit dinâmica chiptune por padrão", () => {
    expect(audioSystem.getSoundtrackMode()).toBe("chiptune");
    expect(audioSystem.getSoundtrackModeLabel()).toContain("16-BIT DINÂMICA");
  });

  it("comuta entre os modos chiptune, ambiente e sfx_only", () => {
    audioSystem.setSoundtrackMode("ambient");
    expect(audioSystem.getSoundtrackMode()).toBe("ambient");
    expect(audioSystem.getSoundtrackModeLabel()).toContain("AMBIENTE CONTEMPLATIVA");

    audioSystem.setSoundtrackMode("sfx_only");
    expect(audioSystem.getSoundtrackMode()).toBe("sfx_only");
    expect(audioSystem.getSoundtrackModeLabel()).toContain("MODO FOCO (APENAS SFX)");

    audioSystem.setSoundtrackMode("chiptune");
    expect(audioSystem.getSoundtrackMode()).toBe("chiptune");
  });

  it("rotaciona sequencialmente entre os 3 modos da Jukebox (cycleNextSoundtrackMode)", () => {
    audioSystem.setSoundtrackMode("chiptune");

    expect(audioSystem.cycleNextSoundtrackMode()).toBe("ambient");
    expect(audioSystem.cycleNextSoundtrackMode()).toBe("sfx_only");
    expect(audioSystem.cycleNextSoundtrackMode()).toBe("chiptune");
  });

  it("persiste as configurações de trilha no localStorage", () => {
    audioSystem.setSoundtrackMode("ambient");
    const saved = localStorage.getItem("micro_splash_audio_settings");
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.soundtrackMode).toBe("ambient");
  });
});
