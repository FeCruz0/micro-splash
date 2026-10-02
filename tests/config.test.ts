import { describe, it, expect, beforeEach } from "vitest";
import {
  RESOLUTION_PRESETS,
  getSavedResolution,
  getSavedDisplayMode,
  setSavedDisplayMode,
} from "../src/config";

describe("Configuração de Resoluções e Modo de Tela", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("possui presets válidos com proporção 16:9", () => {
    const keys = Object.keys(RESOLUTION_PRESETS) as (keyof typeof RESOLUTION_PRESETS)[];
    expect(keys.length).toBeGreaterThanOrEqual(3);

    const presets169 = keys.filter((k) => RESOLUTION_PRESETS[k].aspect === "16:9");
    expect(presets169.length).toBeGreaterThanOrEqual(3);

    presets169.forEach((key) => {
      const preset = RESOLUTION_PRESETS[key];
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.height).toBeGreaterThan(0);
      const ratio = preset.width / preset.height;
      expect(ratio).toBeCloseTo(16 / 9, 2);
    });
  });

  it("possui exatamente os presets de alta fidelidade 16:9 selecionados", () => {
    const keys = Object.keys(RESOLUTION_PRESETS);
    expect(keys).toEqual(["4K", "1440p", "1080p"]);
    expect(RESOLUTION_PRESETS["4K"].width).toBe(3840);
    expect(RESOLUTION_PRESETS["1440p"].width).toBe(2560);
    expect(RESOLUTION_PRESETS["1080p"].width).toBe(1920);
  });

  it("retorna resolução padrão (1080p) quando localStorage está vazio", () => {
    const res = getSavedResolution();
    expect(res.key).toBe("1080p");
    expect(res.width).toBe(1920);
    expect(res.height).toBe(1080);
  });

  it("recupera resolução configurada pelo usuário no localStorage", () => {
    localStorage.setItem("micro_splash_resolution", "1440p");
    const res = getSavedResolution();
    expect(res.key).toBe("1440p");
    expect(res.width).toBe(2560);
    expect(res.height).toBe(1440);
  });

  it("faz fallback para 1080p em caso de valor inválido no localStorage", () => {
    localStorage.setItem("micro_splash_resolution", "resolucao_inexistente");
    const res = getSavedResolution();
    expect(res.key).toBe("1080p");
    expect(res.width).toBe(1920);
    expect(res.height).toBe(1080);
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
