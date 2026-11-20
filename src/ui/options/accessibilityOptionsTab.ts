import { audioSystem } from "../../systems/audioSystem";
import { accessibilitySystem, type ReducedMotionMode } from "../../systems/accessibilitySystem";
import { i18n } from "../../i18n/i18n";
import type { OptionsScreenContext } from "./optionsTypes";

const REDUCED_MOTION_DESCRIPTIONS: Record<ReducedMotionMode, string> = {
  auto: "Movimento Automático: segue a preferência do sistema operacional (prefers-reduced-motion).",
  reduced:
    "Movimento Reduzido: desativa tremores de tela, flashes intensos e animações ambientais não essenciais.",
  full: "Movimento Completo: mantém todos os efeitos de câmera, tremores de impacto e animações ambientais.",
};

export function renderAccessibilityOptions(context: OptionsScreenContext): void {
  const {
    k,
    elements,
    focusItems,
    col1X,
    colW,
    btnH,
    rowGap,
    rowStartY,
    updateReloadHint,
    setOptionHint,
  } = context;

  const row0Y = rowStartY + 0 * (btnH + rowGap);
  const row1Y = rowStartY + 1 * (btnH + rowGap);
  const row2Y = rowStartY + 2 * (btnH + rowGap);
  const row3Y = rowStartY + 3 * (btnH + rowGap);
  const row4Y = rowStartY + 4 * (btnH + rowGap);

  // --- Linha 0: Filtro de Cores / Daltonismo ---
  const btnAccessibilityPos = k.vec2(col1X, row0Y);
  const btnAccessibility = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnAccessibilityPos),
    k.color(accessibilitySystem.isHighContrast() ? k.rgb(30, 110, 150) : k.rgb(22, 75, 125)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnAccessibility);

  const accessibilityText = k.add([
    k.text(accessibilitySystem.getLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnAccessibilityPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(accessibilityText);

  const colorHint =
    "Cores: filtros compensatórios para daltonismo (Protanopia/Deuteranopia) ou Alto Contraste.";
  const handleAccessibility = () => {
    accessibilitySystem.cycleNextColorMode();
    audioSystem.playUiClick();
    accessibilityText.text = accessibilitySystem.getLabel();
    btnAccessibility.color = accessibilitySystem.isHighContrast()
      ? k.rgb(30, 110, 150)
      : k.rgb(22, 75, 125);
    setOptionHint?.(colorHint);
  };

  btnAccessibility.onHoverUpdate(() => {
    btnAccessibility.scale = k.vec2(1.015, 1.015);
    setOptionHint?.(colorHint);
  });
  btnAccessibility.onHoverEnd(() => {
    btnAccessibility.scale = k.vec2(1, 1);
  });
  btnAccessibility.onClick(handleAccessibility);
  focusItems.push({
    pos: btnAccessibilityPos,
    width: colW,
    height: btnH,
    onActivate: handleAccessibility,
    onFocus: () => {
      btnAccessibility.color = k.rgb(26, 98, 146);
      setOptionHint?.(colorHint);
    },
    onBlur: () => {
      btnAccessibility.color = accessibilitySystem.isHighContrast()
        ? k.rgb(30, 110, 150)
        : k.rgb(22, 75, 125);
    },
  });

  // --- Linha 1: Movimento de Câmera Reduzido ---
  const btnMotionPos = k.vec2(col1X, row1Y);
  const btnMotion = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnMotionPos),
    k.color(accessibilitySystem.isReducedMotion() ? k.rgb(30, 110, 140) : k.rgb(20, 75, 120)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnMotion);

  const motionText = k.add([
    k.text(accessibilitySystem.getReducedMotionLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnMotionPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(motionText);

  const showMotionHint = () => {
    setOptionHint?.(REDUCED_MOTION_DESCRIPTIONS[accessibilitySystem.getReducedMotionMode()]);
  };

  const handleMotion = () => {
    accessibilitySystem.cycleReducedMotion();
    audioSystem.playUiClick();
    motionText.text = accessibilitySystem.getReducedMotionLabel();
    btnMotion.color = accessibilitySystem.isReducedMotion()
      ? k.rgb(30, 110, 140)
      : k.rgb(20, 75, 120);
    showMotionHint();
  };

  btnMotion.onHoverUpdate(() => {
    btnMotion.scale = k.vec2(1.015, 1.015);
    showMotionHint();
  });
  btnMotion.onHoverEnd(() => {
    btnMotion.scale = k.vec2(1, 1);
  });
  btnMotion.onClick(handleMotion);
  focusItems.push({
    pos: btnMotionPos,
    width: colW,
    height: btnH,
    onActivate: handleMotion,
    onFocus: () => {
      btnMotion.color = k.rgb(26, 98, 146);
      showMotionHint();
    },
    onBlur: () => {
      btnMotion.color = accessibilitySystem.isReducedMotion()
        ? k.rgb(30, 110, 140)
        : k.rgb(20, 75, 120);
    },
  });

  // --- Linha 2: Tamanho da Fonte ---
  const btnFontPos = k.vec2(col1X, row2Y);
  const btnFont = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnFontPos),
    k.color(20, 75, 120),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnFont);

  const fontText = k.add([
    k.text(accessibilitySystem.getFontScaleLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnFontPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(fontText);

  const fontHint =
    "Tamanho da Fonte: ajusta a legibilidade dos textos (Pequena 0.85x, Normal 1.0x, Grande 1.2x).";
  const handleFont = () => {
    accessibilitySystem.cycleFontScale();
    audioSystem.playUiClick();
    fontText.text = accessibilitySystem.getFontScaleLabel();
    updateReloadHint();
    setOptionHint?.(fontHint);
  };

  btnFont.onHoverUpdate(() => {
    btnFont.scale = k.vec2(1.015, 1.015);
    setOptionHint?.(fontHint);
  });
  btnFont.onHoverEnd(() => {
    btnFont.scale = k.vec2(1, 1);
  });
  btnFont.onClick(handleFont);
  focusItems.push({
    pos: btnFontPos,
    width: colW,
    height: btnH,
    onActivate: handleFont,
    onFocus: () => {
      btnFont.color = k.rgb(26, 98, 146);
      setOptionHint?.(fontHint);
    },
    onBlur: () => {
      btnFont.color = k.rgb(20, 75, 120);
    },
  });

  // --- Linha 3: Idioma / Language ---
  const btnLangPos = k.vec2(col1X, row3Y);
  const btnLang = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnLangPos),
    k.color(24, 85, 140),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnLang);

  const langText = k.add([
    k.text(i18n.getLocaleLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnLangPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(langText);

  const langHint = "Idioma: alterna entre Português, English e Español (recarrega ao salvar).";
  const handleLang = () => {
    i18n.cycleNextLocale();
    audioSystem.playUiClick();
    langText.text = i18n.getLocaleLabel();
    updateReloadHint();
    setOptionHint?.(langHint);
  };

  btnLang.onHoverUpdate(() => {
    btnLang.scale = k.vec2(1.015, 1.015);
    setOptionHint?.(langHint);
  });
  btnLang.onHoverEnd(() => {
    btnLang.scale = k.vec2(1, 1);
  });
  btnLang.onClick(handleLang);
  focusItems.push({
    pos: btnLangPos,
    width: colW,
    height: btnH,
    onActivate: handleLang,
    onFocus: () => {
      btnLang.color = k.rgb(26, 98, 146);
      setOptionHint?.(langHint);
    },
    onBlur: () => {
      btnLang.color = k.rgb(24, 85, 140);
    },
  });

  // --- Linha 4 (Direita): Breve descrição dos 3 modos de movimento ---
  elements.push(
    k.add([
      k.rect(colW, btnH, { radius: 8 }),
      k.pos(col1X, row4Y),
      k.color(10, 28, 56),
      k.outline(1, k.rgb(38, 78, 130)),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  elements.push(
    k.add([
      k.text(
        "Movimento — Automático: segue o sistema • Reduzido: sem tremores/flashes\nCompleto: mantém todos os efeitos de câmera e animações ambientais",
        {
          size: accessibilitySystem.scaleFont(10.5),
          font: "Inter",
          width: colW - 18,
          align: "center",
          lineSpacing: 3,
        }
      ),
      k.pos(col1X, row4Y),
      k.color(176, 214, 242),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );
}
