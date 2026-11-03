import { describe, it, expect, vi } from "vitest";
import {
  UI_TRANSITIONS,
  animateModalEntrance,
  animateModalExit,
} from "../../src/ui/animationUtils";
import indexHtmlRaw from "../../index.html?raw";
import swRawContent from "../../public/sw.js?raw";

describe("Fase 51: Transições Padronizadas & Otimização de Fontes (phase51_ui_transitions.test.ts)", () => {
  describe("51.3: Padronização de Transições de UI (animationUtils.ts)", () => {
    it("expõe constantes de transição UI_TRANSITIONS estritamente tipadas", () => {
      expect(UI_TRANSITIONS.MODAL_ENTER_DURATION).toBe(0.25);
      expect(UI_TRANSITIONS.MODAL_EXIT_DURATION).toBe(0.18);
      expect(UI_TRANSITIONS.FADE_SCENE_DURATION).toBe(0.35);
      expect(UI_TRANSITIONS.BUTTON_HOVER_SCALE).toBe(1.04);
      expect(UI_TRANSITIONS.TOAST_DURATION).toBe(2.5);
    });

    it("executa animateModalEntrance configurando escala inicial e tween de entrada", () => {
      const mockCard: any = {
        scale: { x: 1, y: 1 },
        opacity: 1,
      };

      const tweenSpy = vi.fn(() => ({
        then: (cb: () => void) => cb(),
      }));

      const mockKaboom: any = {
        vec2: (x: number, y: number) => ({ x, y }),
        tween: tweenSpy,
        easings: { easeOutBack: () => 1 },
      };

      const onComplete = vi.fn();

      animateModalEntrance(mockKaboom, mockCard, { onComplete });

      expect(tweenSpy).toHaveBeenCalledWith(
        0.85,
        1.0,
        UI_TRANSITIONS.MODAL_ENTER_DURATION,
        expect.any(Function),
        mockKaboom.easings.easeOutBack
      );
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("executa animateModalExit reduzindo escala para 0.85 e chamando onComplete", () => {
      const mockCard: any = {
        scale: { x: 1, y: 1 },
        opacity: 1,
      };

      const tweenSpy = vi.fn(() => ({
        then: (cb: () => void) => cb(),
      }));

      const mockKaboom: any = {
        vec2: (x: number, y: number) => ({ x, y }),
        tween: tweenSpy,
        easings: { easeInQuad: () => 1 },
      };

      const onComplete = vi.fn();

      animateModalExit(mockKaboom, mockCard, { onComplete });

      expect(tweenSpy).toHaveBeenCalledWith(
        1.0,
        0.85,
        UI_TRANSITIONS.MODAL_EXIT_DURATION,
        expect.any(Function),
        mockKaboom.easings.easeInQuad
      );
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("51.6: Otimização de Fontes e Precache", () => {
    it("assegura que index.html prioriza formato WOFF2 com font-display: swap", () => {
      expect(indexHtmlRaw).toContain('format("woff2")');
      expect(indexHtmlRaw).toContain("font-display: swap;");
    });

    it("assegura que public/sw.js inclui as fontes essenciais no PRECACHE_ASSETS", () => {
      expect(swRawContent).toContain('"/fonts/Inter-SemiBold.ttf"');
      expect(swRawContent).toContain('"/fonts/Inter-Bold.woff2"');
      expect(swRawContent).toContain('"/fonts/Outfit-Bold.ttf"');
      expect(swRawContent).toContain('"/fonts/Orbitron-Bold.ttf"');
    });
  });
});
