import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateRelativeLuminance,
  calculateContrastRatio,
  isWcagAaCompliant,
  normalizeRgb,
} from "../../src/utils/contrast";
import {
  createFocusGroup,
  pushFocusSnapshot,
  popFocusSnapshot,
  clearFocusStack,
  getFocusStackDepth,
  type FocusableItem,
} from "../../src/ui/keyboardNav";
import { i18n, formatNumber, formatDistance, formatDate } from "../../src/i18n/i18n";
import ptBR from "../../src/i18n/locales/pt-BR.json";
import enUS from "../../src/i18n/locales/en-US.json";
import gn from "../../src/i18n/locales/gn.json";
import { formatHudDistance } from "../../src/ui/hudSystem";
import { toNauticalMiles, formatDualDistance } from "../../src/utils/navigation";
import { calculateWhaleSliceTransforms } from "../../src/entities/player/playerSliceRenderer";
import { calculatePectoralFinTransforms } from "../../src/entities/player/playerPectoralFin";
import {
  calculateFlukeAngleOfAttackInDegrees,
  calculateWhalePuppetRig,
} from "../../src/entities/player/playerPuppetRig";
import { accessibilitySystem } from "../../src/systems/accessibilitySystem";

function extractAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...extractAllKeys(value as Record<string, unknown>, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys.sort();
}

describe("Fase 50: Acessibilidade & Internacionalização Avançadas", () => {
  beforeEach(() => {
    localStorage.clear();
    clearFocusStack();
    i18n.setLocale("pt-BR");
    accessibilitySystem.setReducedMotion("auto");
  });

  describe("50.1: Auditoria e Utilitários de Contraste WCAG 2.1 AA", () => {
    it("normaliza tuplas [r, g, b] e objetos { r, g, b } arredondando canais", () => {
      expect(normalizeRgb([10.4, 20.8, 30.1])).toEqual([10, 21, 30]);
      expect(normalizeRgb({ r: 254.9, g: 0.1, b: 128 })).toEqual([255, 0, 128]);
    });

    it("calcula a luminância relativa conforme W3C WCAG 2.1", () => {
      expect(calculateRelativeLuminance([0, 0, 0])).toBe(0);
      expect(calculateRelativeLuminance([255, 255, 255])).toBeCloseTo(1.0, 4);
    });

    it("calcula a razão de contraste simetricamente", () => {
      const black = [0, 0, 0] as [number, number, number];
      const white = [255, 255, 255] as [number, number, number];

      expect(calculateContrastRatio(white, black)).toBe(21);
      expect(calculateContrastRatio(black, white)).toBe(21);
      expect(calculateContrastRatio(white, white)).toBe(1);
    });

    it("valida conformidade WCAG AA para textos padrão e grandes", () => {
      // Preto sobre branco: passa texto padrão e grande
      expect(isWcagAaCompliant([0, 0, 0], [255, 255, 255], false)).toBe(true);
      expect(isWcagAaCompliant([0, 0, 0], [255, 255, 255], true)).toBe(true);

      // Cinza [140, 140, 140] sobre branco (~3.65:1): reprova texto normal (<4.5), aprova texto grande (>=3.0)
      const mediumGray = [140, 140, 140] as [number, number, number];
      const white = [255, 255, 255] as [number, number, number];
      const ratio = calculateContrastRatio(mediumGray, white);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
      expect(ratio).toBeLessThan(4.5);

      expect(isWcagAaCompliant(mediumGray, white, false)).toBe(false);
      expect(isWcagAaCompliant(mediumGray, white, true)).toBe(true);
    });

    it("assegura que os elementos essenciais do HUD satisfazem o critério WCAG AA", () => {
      const hudCardBg = [6, 18, 42] as [number, number, number];
      const hudDistanceText = [225, 245, 255] as [number, number, number];
      const hudBiomeSubtext = [150, 210, 245] as [number, number, number];

      expect(isWcagAaCompliant(hudDistanceText, hudCardBg, false)).toBe(true);
      expect(isWcagAaCompliant(hudBiomeSubtext, hudCardBg, false)).toBe(true);
      expect(calculateContrastRatio(hudDistanceText, hudCardBg)).toBeGreaterThan(10);
    });
  });

  describe("50.2: Gestão de Foco e Focus Stack em Modais", () => {
    it("gerencia snapshots de foco em pilha LIFO (push / pop / clear)", () => {
      expect(getFocusStackDepth()).toBe(0);

      const restoreFn1 = vi.fn();
      const restoreFn2 = vi.fn();

      pushFocusSnapshot({ groupId: "mainMenu", index: 1, onRestore: restoreFn1 });
      expect(getFocusStackDepth()).toBe(1);

      pushFocusSnapshot({ groupId: "optionsModal", index: 3, onRestore: restoreFn2 });
      expect(getFocusStackDepth()).toBe(2);

      const popped2 = popFocusSnapshot();
      expect(popped2?.groupId).toBe("optionsModal");
      expect(popped2?.index).toBe(3);
      popped2?.onRestore?.();
      expect(restoreFn2).toHaveBeenCalledTimes(1);
      expect(getFocusStackDepth()).toBe(1);

      clearFocusStack();
      expect(getFocusStackDepth()).toBe(0);
      expect(popFocusSnapshot()).toBeUndefined();
    });

    it("restaura o foco automaticamente ao destruir grupo com restoreFocusOnDestroy", () => {
      const restoreCaller = vi.fn();
      pushFocusSnapshot({ groupId: "pauseMenu", index: 0, onRestore: restoreCaller });

      const mockRing = {
        pos: { x: 0, y: 0 },
        width: 0,
        height: 0,
        opacity: 0,
        onUpdate: vi.fn(() => ({ cancel: vi.fn() })),
      };

      const mockKaboom: any = {
        add: vi.fn(() => mockRing),
        destroy: vi.fn(),
        dt: vi.fn(() => 0.016),
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: vi.fn((r: number, g: number, b: number) => ({ r, g, b })),
        rect: vi.fn(),
        pos: vi.fn(),
        outline: vi.fn(),
        color: vi.fn(),
        opacity: vi.fn(),
        anchor: vi.fn(),
        fixed: vi.fn(),
        z: vi.fn(),
        onKeyPress: vi.fn(() => ({ cancel: vi.fn() })),
        isKeyDown: vi.fn(() => false),
      };

      const items: FocusableItem[] = [{ pos: { x: 100, y: 100 }, onActivate: vi.fn() }];

      const focusGroup = createFocusGroup(mockKaboom, {
        items,
        restoreFocusOnDestroy: true,
      });

      expect(restoreCaller).not.toHaveBeenCalled();
      focusGroup.destroy();
      expect(restoreCaller).toHaveBeenCalledTimes(1);
      expect(getFocusStackDepth()).toBe(0);
    });
  });

  describe("50.3: Paridade de Chaves i18n entre Locales", () => {
    it("garante 100% de paridade entre pt-BR, en-US e gn", () => {
      const keysPt = extractAllKeys(ptBR);
      const keysEn = extractAllKeys(enUS);
      const keysGn = extractAllKeys(gn);

      expect(keysPt.length).toBeGreaterThan(30);
      expect(keysEn).toEqual(keysPt);
      expect(keysGn).toEqual(keysPt);
    });
  });

  describe("50.4: Formatação Acessível via Intl", () => {
    it("mapeia a tag BCP-47 para os idiomas suportados", () => {
      i18n.setLocale("pt-BR");
      expect(i18n.getIntlLocaleTag()).toBe("pt-BR");

      i18n.setLocale("en-US");
      expect(i18n.getIntlLocaleTag()).toBe("en-US");

      i18n.setLocale("gn");
      expect(i18n.getIntlLocaleTag()).toBe("gn");
    });

    it("formata números respeitando o padrão cultural do idioma ativo", () => {
      i18n.setLocale("pt-BR");
      const ptFormatted = formatNumber(12345.67, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      // Padrão pt-BR utiliza vírgula para decimal
      expect(ptFormatted).toMatch(/12\.345,67|12345,67/);

      i18n.setLocale("en-US");
      const enFormatted = formatNumber(12345.67, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      // Padrão en-US utiliza ponto para decimal
      expect(enFormatted).toMatch(/12,345\.67|12345\.67/);
    });

    it("formata distâncias em metros e quilômetros com formatDistance", () => {
      i18n.setLocale("pt-BR");
      expect(formatDistance(450)).toBe("450 m");
      expect(formatDistance(2500)).toMatch(/2,5 km|2\.5 km/);
      expect(formatDistance(0)).toBe("0 m");
      expect(formatDistance(-50)).toBe("0 m");
    });

    it("formata datas respeitando o idioma ativo", () => {
      const date = new Date("2026-10-19T12:00:00Z");
      i18n.setLocale("pt-BR");
      const ptDate = formatDate(date, { timeZone: "UTC" });
      expect(typeof ptDate).toBe("string");
      expect(ptDate.length).toBeGreaterThan(0);

      i18n.setLocale("en-US");
      const enDate = formatDate(date, { timeZone: "UTC" });
      expect(typeof enDate).toBe("string");
      expect(enDate.length).toBeGreaterThan(0);
    });

    it("integra formatação em formatHudDistance e toNauticalMiles", () => {
      i18n.setLocale("pt-BR");
      expect(formatHudDistance(15000)).toMatch(/15\.000m|15000m/);
      expect(toNauticalMiles(1852)).toMatch(/1,0 mn|1\.0 mn/);
      expect(formatDualDistance(3704)).toMatch(/mn/);
    });
  });

  describe("50.5: Suporte a Movimento Reduzido nos Subsistemas Recentes", () => {
    it("atenua amplitude de onda viajante e curvatura em playerSliceRenderer", () => {
      const baseParams = {
        spineCurvatureInDegrees: 20,
        pitchFlexionInDegrees: 10,
        pitchAngularVelocity: 15,
        strokeProgress: 0.25,
        isMuscularStroke: true,
        timeInSeconds: 1.0,
        horizontalSpeed: 100,
        idleBlendFactor: 0,
        isFacingRight: true,
      };

      const fullMotionSlices = calculateWhaleSliceTransforms({
        ...baseParams,
        isReducedMotion: false,
      });

      const reducedMotionSlices = calculateWhaleSliceTransforms({
        ...baseParams,
        isReducedMotion: true,
      });

      const flukeFull = fullMotionSlices.find((s) => s.name === "flukes")!;
      const flukeReduced = reducedMotionSlices.find((s) => s.name === "flukes")!;

      // Sob movimento reduzido, o deslocamento e ângulo relativo são atenuados em 75%
      expect(Math.abs(flukeReduced.localOffset.y)).toBeLessThan(Math.abs(flukeFull.localOffset.y));
      expect(Math.abs(flukeReduced.relativeAngleInDegrees)).toBeLessThan(
        Math.abs(flukeFull.relativeAngleInDegrees)
      );
    });

    it("atenua diedro e batimento peitoral em playerPectoralFin", () => {
      const baseParams = {
        bodyAngleInDegrees: 0,
        pitchAngularVelocity: 40,
        spineCurvatureInDegrees: 15,
        currentRoll: 0.5,
        horizontalSpeed: 120,
        strokeProgress: 0.5,
        isMuscularStroke: true,
        idleBlendFactor: 0,
        timeInSeconds: 1.0,
        isFacingRight: true,
      };

      const fullFin = calculatePectoralFinTransforms({
        ...baseParams,
        isReducedMotion: false,
      });

      const reducedFin = calculatePectoralFinTransforms({
        ...baseParams,
        isReducedMotion: true,
      });

      expect(Math.abs(reducedFin.nearFin.finAngleInDegrees)).toBeLessThan(
        Math.abs(fullFin.nearFin.finAngleInDegrees)
      );
    });

    it("atenua ângulo de ataque e cadeia articular em playerPuppetRig", () => {
      const baseParams = {
        bodyAngleInDegrees: 0,
        spineCurvatureInDegrees: 25,
        pitchAngularVelocity: 30,
        strokeProgress: 0.5,
        isMuscularStroke: true,
        horizontalSpeed: 100,
        verticalSpeed: 20,
        idleBlendFactor: 0,
        timeInSeconds: 1.0,
        isFacingRight: true,
      };

      const aoaFull = calculateFlukeAngleOfAttackInDegrees({
        ...baseParams,
        isReducedMotion: false,
      });
      const aoaReduced = calculateFlukeAngleOfAttackInDegrees({
        ...baseParams,
        isReducedMotion: true,
      });

      expect(Math.abs(aoaReduced)).toBeLessThan(Math.abs(aoaFull));
      expect(aoaReduced).toBeCloseTo(aoaFull * 0.25, 2);

      const rigFull = calculateWhalePuppetRig({
        ...baseParams,
        isReducedMotion: false,
      });
      const rigReduced = calculateWhalePuppetRig({
        ...baseParams,
        isReducedMotion: true,
      });

      expect(Math.abs(rigReduced.caudalPeduncle.relativeAngleInDegrees)).toBeLessThan(
        Math.abs(rigFull.caudalPeduncle.relativeAngleInDegrees)
      );
      expect(Math.abs(rigReduced.flukeBlade.relativeAngleInDegrees)).toBeLessThan(
        Math.abs(rigFull.flukeBlade.relativeAngleInDegrees)
      );
    });
  });
});
