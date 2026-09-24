import { describe, it, expect, beforeEach } from "vitest";
import { AudioEngine } from "../src/systems/audio/audioEngine";
import { AudioSFX } from "../src/systems/audio/audioSFX";
import { AudioWhale } from "../src/systems/audio/audioWhale";
import { audioSystem } from "../src/systems/audioSystem";

describe("Modular Audio System (Fase 23.1)", () => {
  let engine: AudioEngine;

  beforeEach(() => {
    localStorage.clear();
    engine = new AudioEngine();
  });

  it("inicializa AudioEngine com configurações padrão e limites de volume", () => {
    expect(engine.getVolume()).toBe(1.0);
    expect(engine.isMusicEnabled()).toBe(true);
    expect(engine.isSfxEnabled()).toBe(true);
    expect(engine.getMuted()).toBe(false);
    expect(engine.getSoundtrackMode()).toBe("chiptune");

    engine.setVolume(0.5);
    expect(engine.getVolume()).toBe(0.5);

    // Clamping entre 0 e 1
    engine.setVolume(1.8);
    expect(engine.getVolume()).toBe(1.0);
    engine.setVolume(-0.2);
    expect(engine.getVolume()).toBe(0);
  });

  it("alterna e cicla modos de trilha sonora em AudioEngine", () => {
    expect(engine.getSoundtrackMode()).toBe("chiptune");
    const next1 = engine.cycleNextSoundtrackMode();
    expect(next1).toBe("ambient");
    expect(engine.getSoundtrackModeLabel()).toContain("AMBIENTE");

    const next2 = engine.cycleNextSoundtrackMode();
    expect(next2).toBe("sfx_only");
    expect(engine.getSoundtrackModeLabel()).toContain("MODO FOCO");

    const next3 = engine.cycleNextSoundtrackMode();
    expect(next3).toBe("chiptune");
  });

  it("salva e restaura preferências de áudio no localStorage", () => {
    engine.setVolume(0.75);
    engine.setMusicEnabled(false);
    engine.setSfxEnabled(false);
    engine.setSoundtrackMode("ambient");

    const newEngine = new AudioEngine();
    newEngine.loadSettings();

    expect(newEngine.getVolume()).toBe(0.75);
    expect(newEngine.isMusicEnabled()).toBe(false);
    expect(newEngine.isSfxEnabled()).toBe(false);
    expect(newEngine.getSoundtrackMode()).toBe("ambient");
  });

  it("garante que AudioSFX e AudioWhale executam com segurança sem contexto", () => {
    const sfx = new AudioSFX(engine);
    const whale = new AudioWhale(engine);

    // Não deve lançar erro mesmo se o Web Audio não estiver inicializado
    expect(() => sfx.playUiClick()).not.toThrow();
    expect(() => sfx.playStrokeThrust()).not.toThrow();
    expect(() => sfx.playWaterSplash()).not.toThrow();
    expect(() => sfx.playVictoryFanfare()).not.toThrow();
    expect(() => whale.playWhaleSong()).not.toThrow();
    expect(() => whale.playAbyssalWhaleCall()).not.toThrow();
  });

  it("garante integridade da fachada AudioSystem preservando métodos públicos", () => {
    expect(typeof audioSystem.init).toBe("function");
    expect(typeof audioSystem.playStrokeThrust).toBe("function");
    expect(typeof audioSystem.playWaterSplash).toBe("function");
    expect(typeof audioSystem.playWhaleSong).toBe("function");
    expect(typeof audioSystem.playVictoryFanfare).toBe("function");
    expect(typeof audioSystem.playSonarSound).toBe("function");
    expect(typeof audioSystem.toggleMute).toBe("function");
  });
});
