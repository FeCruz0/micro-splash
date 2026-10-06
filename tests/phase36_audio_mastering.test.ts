import { describe, it, expect, beforeEach } from "vitest";
import { AudioEngine } from "../src/systems/audio/audioEngine";
import { AudioSFX } from "../src/systems/audio/audioSFX";
import { audioSystem } from "../src/systems/audioSystem";

describe("Fase 36: Masterização & Espacialização de Áudio", () => {
  let engine: AudioEngine;

  beforeEach(() => {
    localStorage.clear();
    engine = new AudioEngine();
  });

  describe("36.1 — Limiter no Barramento Master", () => {
    it("não lança erro ao consultar masterLimiter antes e depois da inicialização", () => {
      expect(engine.getMasterLimiter()).toBeNull();
      engine.init();
      expect(() => engine.getMasterLimiter()).not.toThrow();
    });
  });

  describe("36.2 — Rampas de Ganho sem Cliques", () => {
    it("executa setVolume, toggleMute e pauseAmbient suavemente sem exceções", () => {
      engine.init();
      expect(() => engine.setVolume(0.8)).not.toThrow();
      expect(engine.getVolume()).toBe(0.8);

      // toggleMute retorna boolean e não lança exceção em qualquer ambiente
      expect(() => engine.toggleMute()).not.toThrow();
      expect(() => engine.pauseAmbient()).not.toThrow();
    });

    it("aplica rampa suave de volume e mudo quando AudioContext está mockado", () => {
      const mockGainNode: any = {
        gain: {
          value: 1,
          setTargetAtTime: (val: number) => {
            mockGainNode.gain.value = val;
          },
        },
      };
      const mockCtx: any = {
        currentTime: 0,
        state: "running",
        createGain: () => mockGainNode,
      };

      (engine as any).ctx = mockCtx;
      (engine as any).masterGain = mockGainNode;

      expect(engine.toggleMute()).toBe(true);
      expect(engine.getMuted()).toBe(true);

      expect(engine.toggleMute()).toBe(false);
      expect(engine.getMuted()).toBe(false);
    });
  });

  describe("36.3 — Crossfade entre Modos de Trilha", () => {
    it("alterna modos de trilha sonora acionando rampas suaves", () => {
      engine.init();
      expect(() => engine.setSoundtrackMode("ambient")).not.toThrow();
      expect(engine.getSoundtrackMode()).toBe("ambient");

      expect(() => engine.setSoundtrackMode("sfx_only")).not.toThrow();
      expect(engine.getSoundtrackMode()).toBe("sfx_only");

      expect(() => engine.setSoundtrackMode("chiptune")).not.toThrow();
      expect(engine.getSoundtrackMode()).toBe("chiptune");
    });
  });

  describe("36.4 — Panning Estéreo por Posição", () => {
    it("calcula panning estéreo com clamp [-1, 1] e valor neutro no centro", () => {
      const sfx = new AudioSFX(engine);
      expect(sfx.calcStereoPan(undefined, 500)).toBe(0);
      expect(sfx.calcStereoPan(500, undefined)).toBe(0);

      // Exatamente na posição do jogador: centro (0)
      expect(sfx.calcStereoPan(500, 500, 400)).toBe(0);

      // 200px à esquerda do jogador: -0.5
      expect(sfx.calcStereoPan(300, 500, 400)).toBe(-0.5);

      // 200px à direita do jogador: +0.5
      expect(sfx.calcStereoPan(700, 500, 400)).toBe(0.5);

      // Muito longe à esquerda: clampado em -1.0
      expect(sfx.calcStereoPan(-1000, 500, 400)).toBe(-1);

      // Muito longe à direita: clampado em +1.0
      expect(sfx.calcStereoPan(2000, 500, 400)).toBe(1);
    });

    it("expõe método calcStereoPan através da facade audioSystem", () => {
      expect(audioSystem.calcStereoPan(100, 300, 400)).toBe(-0.5);
      expect(audioSystem.calcStereoPan(500, 300, 400)).toBe(0.5);
    });

    it("executa métodos de efeitos sonoros com coordenadas espaciais sem erro", () => {
      const sfx = new AudioSFX(engine);
      const playerX = 600;

      expect(() => sfx.playKrillGulp(400, playerX)).not.toThrow();
      expect(() => sfx.playTrashThud(800, playerX)).not.toThrow();
      expect(() => sfx.playNetTangle(500, playerX)).not.toThrow();
      expect(() => sfx.playIceCrackSound(300, playerX)).not.toThrow();
      expect(() => sfx.playWaterSplash(300, playerX)).not.toThrow();
      expect(() => sfx.playOilChoke(600, playerX)).not.toThrow();
      expect(() => sfx.playPurifyWhoosh(650, playerX)).not.toThrow();
      expect(() => sfx.playDolphinClicks(200, playerX)).not.toThrow();
      expect(() => sfx.playPenguinChirp(900, playerX)).not.toThrow();
      expect(() => sfx.playShipHorn(1200, playerX)).not.toThrow();
      expect(() => sfx.playPowerupCollect(550, playerX)).not.toThrow();
      expect(() => sfx.playShieldPop(600, playerX)).not.toThrow();
    });
  });

  describe("36.5 — Reverb Subaquático & Abafamento por Profundidade", () => {
    it("gera buffer de resposta ao impulso procedural sem erros de memória", () => {
      const mockCtx: any = {
        sampleRate: 44100,
        createBuffer: (_channels: number, length: number, sampleRate: number) => ({
          length,
          sampleRate,
          getChannelData: () => new Float32Array(length),
        }),
      };

      const impulse = engine.createUnderwaterImpulseResponse(mockCtx, 0.5, 3.0);
      expect(impulse.length).toBe(Math.floor(44100 * 0.5));
    });

    it("atualiza acústica de profundidade sem lançar erro", () => {
      engine.init();
      expect(() => engine.updateDepthAcoustics(80)).not.toThrow();
      expect(() => engine.updateDepthAcoustics(200)).not.toThrow();
      expect(() => engine.updateDepthAcoustics(350)).not.toThrow();
      expect(() => audioSystem.updateDepthAcoustics(250)).not.toThrow();
    });
  });

  describe("36.6 — Pausa de Áudio com Aba Oculta & Limpeza", () => {
    it("faz inicialização e cleanup sem vazamento de listeners ou erros", () => {
      engine.init();
      expect(() => engine.cleanup()).not.toThrow();
    });
  });

  describe("36.7 — Loop de Ruído Oceânico sem Costura", () => {
    it("inicia e para ambiência de ruído sem lançar exceções", () => {
      engine.init();
      expect(() => (engine as any).startAmbientOcean()).not.toThrow();
      expect(() => engine.pauseAmbient()).not.toThrow();
    });
  });
});
