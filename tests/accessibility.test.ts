import { describe, it, expect, beforeEach } from "vitest";
import { accessibilitySystem } from "../src/systems/accessibilitySystem";

describe("Fase 18.2: Modos de Acessibilidade Visual e Daltonismo", () => {
  beforeEach(() => {
    localStorage.clear();
    accessibilitySystem.setColorMode("normal");
  });

  it("inicia no modo normal por padrão e comuta entre paletas", () => {
    expect(accessibilitySystem.getColorMode()).toBe("normal");
    expect(accessibilitySystem.isHighContrast()).toBe(false);

    accessibilitySystem.setColorMode("protanopia");
    expect(accessibilitySystem.getColorMode()).toBe("protanopia");
    expect(accessibilitySystem.isHighContrast()).toBe(false);

    accessibilitySystem.setColorMode("deuteranopia");
    expect(accessibilitySystem.getColorMode()).toBe("deuteranopia");
    expect(accessibilitySystem.isHighContrast()).toBe(false);

    accessibilitySystem.setColorMode("high_contrast");
    expect(accessibilitySystem.getColorMode()).toBe("high_contrast");
    expect(accessibilitySystem.isHighContrast()).toBe(true);
  });

  it("rotaciona sequencialmente entre os 4 modos (cycleNextColorMode)", () => {
    accessibilitySystem.setColorMode("normal");

    expect(accessibilitySystem.cycleNextColorMode()).toBe("protanopia");
    expect(accessibilitySystem.cycleNextColorMode()).toBe("deuteranopia");
    expect(accessibilitySystem.cycleNextColorMode()).toBe("high_contrast");
    expect(accessibilitySystem.cycleNextColorMode()).toBe("normal");
  });

  it("persiste a escolha do modo no localStorage", () => {
    accessibilitySystem.setColorMode("high_contrast");
    expect(localStorage.getItem("micro_splash_color_mode")).toBe("high_contrast");

    accessibilitySystem.setColorMode("protanopia");
    expect(localStorage.getItem("micro_splash_color_mode")).toBe("protanopia");
  });

  it("retorna labels descritivos formatados para UI", () => {
    accessibilitySystem.setColorMode("normal");
    expect(accessibilitySystem.getLabel()).toContain("PADRÃO");

    accessibilitySystem.setColorMode("protanopia");
    expect(accessibilitySystem.getLabel()).toContain("PROTANOPIA");

    accessibilitySystem.setColorMode("deuteranopia");
    expect(accessibilitySystem.getLabel()).toContain("DEUTERANOPIA");

    accessibilitySystem.setColorMode("high_contrast");
    expect(accessibilitySystem.getLabel()).toContain("ALTO CONTRASTE");
  });
});
