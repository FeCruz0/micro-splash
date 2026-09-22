import { describe, it, expect, beforeEach } from "vitest";
import {
  RESOLUTION_PRESETS,
  getSavedResolution,
  getSavedDisplayMode,
  setSavedDisplayMode,
  type ResolutionKey,
} from "../src/config";

describe("Configuração de Resoluções e Modo de Tela", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("possui presets válidos com proporção 16:9", () => {
    const keys = Object.keys(RESOLUTION_PRESETS) as ResolutionKey[];
    expect(keys.length).toBeGreaterThanOrEqual(3);

    keys.forEach((key) => {
      const preset = RESOLUTION_PRESETS[key];
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.height).toBeGreaterThan(0);
      const ratio = preset.width / preset.height;
      expect(ratio).toBeCloseTo(16 / 9, 2);
    });
  });

  it("retorna resolução padrão (720p) quando localStorage está vazio", () => {
    const res = getSavedResolution();
    expect(res.key).toBe("720p");
    expect(res.width).toBe(1280);
    expect(res.height).toBe(720);
  });

  it("recupera resolução configurada pelo usuário no localStorage", () => {
    localStorage.setItem("micro_splash_resolution", "1080p");
    const res = getSavedResolution();
    expect(res.key).toBe("1080p");
    expect(res.width).toBe(1920);
    expect(res.height).toBe(1080);
  });

  it("faz fallback para 720p em caso de valor inválido no localStorage", () => {
    localStorage.setItem("micro_splash_resolution", "resolucao_inexistente");
    const res = getSavedResolution();
    expect(res.key).toBe("720p");
    expect(res.width).toBe(1280);
    expect(res.height).toBe(720);
  });

  it("retorna 'stretch' (sem bordas) como modo de tela padrão", () => {
    expect(getSavedDisplayMode()).toBe("stretch");
  });

  it("permite salvar e recuperar o modo de tela letterbox (com bordas)", () => {
    setSavedDisplayMode("letterbox");
    expect(getSavedDisplayMode()).toBe("letterbox");

    setSavedDisplayMode("stretch");
    expect(getSavedDisplayMode()).toBe("stretch");
  });
});
