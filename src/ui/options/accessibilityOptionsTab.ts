import { audioSystem } from "../../systems/audioSystem";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import { ttsSystem } from "../../systems/ttsSystem";
import { i18n } from "../../i18n/i18n";
import type { OptionsScreenContext } from "./optionsTypes";

export function renderAccessibilityOptions(context: OptionsScreenContext): void {
  const { k, elements, focusItems, col1X, colW, btnH, rowGap, rowStartY, updateReloadHint } =
    context;

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
    k.area(),
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

  const handleAccessibility = () => {
    accessibilitySystem.cycleNextColorMode();
    audioSystem.playUiClick();
    accessibilityText.text = accessibilitySystem.getLabel();
    btnAccessibility.color = accessibilitySystem.isHighContrast()
      ? k.rgb(30, 110, 150)
      : k.rgb(22, 75, 125);
  };

  btnAccessibility.onHoverUpdate(() => {
    btnAccessibility.scale = k.vec2(1.02, 1.02);
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
    k.area(),
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

  const handleMotion = () => {
    accessibilitySystem.cycleReducedMotion();
    audioSystem.playUiClick();
    motionText.text = accessibilitySystem.getReducedMotionLabel();
    btnMotion.color = accessibilitySystem.isReducedMotion()
      ? k.rgb(30, 110, 140)
      : k.rgb(20, 75, 120);
  };

  btnMotion.onHoverUpdate(() => {
    btnMotion.scale = k.vec2(1.02, 1.02);
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
    k.area(),
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

  const handleFont = () => {
    accessibilitySystem.cycleFontScale();
    audioSystem.playUiClick();
    fontText.text = accessibilitySystem.getFontScaleLabel();
    updateReloadHint();
  };

  btnFont.onHoverUpdate(() => {
    btnFont.scale = k.vec2(1.02, 1.02);
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
  });

  // --- Linha 3: Narração em Voz (TTS) ---
  const btnTtsPos = k.vec2(col1X, row3Y);
  const btnTts = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnTtsPos),
    k.color(ttsSystem.isEnabled() ? k.rgb(20, 100, 140) : k.rgb(45, 55, 75)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnTts);

  const ttsText = k.add([
    k.text(ttsSystem.getLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnTtsPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(ttsText);

  const handleTts = () => {
    const newState = ttsSystem.toggle();
    audioSystem.playUiClick();
    btnTts.color = newState ? k.rgb(20, 100, 140) : k.rgb(45, 55, 75);
    ttsText.text = ttsSystem.getLabel();
  };

  btnTts.onHoverUpdate(() => {
    btnTts.scale = k.vec2(1.02, 1.02);
  });
  btnTts.onHoverEnd(() => {
    btnTts.scale = k.vec2(1, 1);
  });
  btnTts.onClick(handleTts);
  focusItems.push({
    pos: btnTtsPos,
    width: colW,
    height: btnH,
    onActivate: handleTts,
  });

  // --- Linha 4: Idioma / Language ---
  const btnLangPos = k.vec2(col1X, row4Y);
  const btnLang = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnLangPos),
    k.color(24, 85, 140),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
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

  const handleLang = () => {
    i18n.cycleNextLocale();
    audioSystem.playUiClick();
    langText.text = i18n.getLocaleLabel();
    updateReloadHint();
  };

  btnLang.onHoverUpdate(() => {
    btnLang.scale = k.vec2(1.02, 1.02);
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
  });
}
