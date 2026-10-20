import { describe, it, expect, beforeEach, vi } from "vitest";
import { BiomeMusicEngine, BIOME_INDEX } from "../../src/systems/audio/audioMusic";
import { AudioEngine } from "../../src/systems/audio/audioEngine";

describe("Fase 51: Mixagem Retrô, Limiter & Crossfade Chiptune (phase51_audio_mix.test.ts)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("51.5: Crossfade Chiptune entre Biomas (BiomeMusicEngine)", () => {
    it("inicia no bioma Antártica e atualiza biomas por distância de percurso", () => {
      const musicEngine = new BiomeMusicEngine();
      expect(musicEngine.getCurrentBiome()).toBe(BIOME_INDEX.ANTARCTICA);

      musicEngine.updatePosition(3000);
      expect(musicEngine.getCurrentBiome()).toBe(BIOME_INDEX.ANTARCTICA);

      musicEngine.updatePosition(7000);
      expect(musicEngine.getCurrentBiome()).toBe(BIOME_INDEX.OCEAN);

      musicEngine.updatePosition(15000);
      expect(musicEngine.getCurrentBiome()).toBe(BIOME_INDEX.URBAN);

      musicEngine.updatePosition(22000);
      expect(musicEngine.getCurrentBiome()).toBe(BIOME_INDEX.ARRAIAL);
    });

    it("executa setBiomeWithCrossfade aplicando rampas suaves de atenuação e recuperação", () => {
      const musicEngine = new BiomeMusicEngine();

      const linearRampSpy = vi.fn();
      const setValueSpy = vi.fn();

      const mockGainNode: any = {
        gain: {
          value: 0.35,
          setValueAtTime: setValueSpy,
          linearRampToValueAtTime: linearRampSpy,
        },
      };

      const mockCtx: any = {
        currentTime: 10.0,
        createGain: () => mockGainNode,
      };

      (musicEngine as any).ctx = mockCtx;
      (musicEngine as any).musicGain = mockGainNode;

      musicEngine.setBiomeWithCrossfade(BIOME_INDEX.OCEAN, 1.0);

      expect(setValueSpy).toHaveBeenCalledWith(0.35, 10.0);
      expect(linearRampSpy).toHaveBeenCalledWith(0.12, 10.5);
    });
  });

  describe("51.4: Normalização de Volume Retrô & Limiter Master", () => {
    it("mantém compressor brickwall limiter calibrado em -6dB sem distorção", () => {
      const engine = new AudioEngine();

      const setValueSpy = vi.fn();
      const mockLimiter: any = {
        threshold: { setValueAtTime: setValueSpy },
        knee: { setValueAtTime: vi.fn() },
        ratio: { setValueAtTime: setValueSpy },
        attack: { setValueAtTime: vi.fn() },
        release: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
      };

      const mockGain: any = {
        gain: { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
        connect: vi.fn(),
      };

      const mockCtx: any = {
        currentTime: 0,
        destination: {},
        createDynamicsCompressor: () => mockLimiter,
        createGain: () => mockGain,
        createBiquadFilter: () => ({
          type: "lowpass",
          frequency: { setValueAtTime: vi.fn() },
          Q: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
        }),
        createConvolver: () => ({ buffer: null, connect: vi.fn() }),
        createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
      };

      (engine as any).ctx = mockCtx;

      engine.init();

      expect(setValueSpy).toHaveBeenCalledWith(-6, 0);
      expect(setValueSpy).toHaveBeenCalledWith(12, 0);
    });

    it("gerencia o volume master de forma estritamente normalizada [0.0, 1.0]", () => {
      const engine = new AudioEngine();

      engine.setVolume(0.75);
      expect(engine.getVolume()).toBe(0.75);

      engine.setVolume(1.5); // Limita ao teto 1.0
      expect(engine.getVolume()).toBe(1.0);

      engine.setVolume(-0.2); // Limita ao piso 0.0
      expect(engine.getVolume()).toBe(0.0);
    });
  });
});
