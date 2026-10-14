import { audioSystem } from "../../systems/audioSystem";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import { readLocalStorageWithSchema, writeLocalStorage } from "../../utils/storage";
import { TouchControlsModeSchema } from "../../schemas/storageSchemas";
import type { OptionsScreenContext } from "./optionsTypes";

export function renderControlsOptions(context: OptionsScreenContext): void {
  const { k, elements, focusItems, col1X, colW, btnH, rowGap, rowStartY } = context;

  const row5Y = rowStartY + 5 * (btnH + rowGap);

  // --- Linha 5: Controles Touch ---
  let touchMode = readLocalStorageWithSchema(
    "micro_splash_touch_controls",
    TouchControlsModeSchema,
    "auto"
  );
  const getTouchLabel = (mode: string) => {
    if (mode === "on") return "Touch: ATIVOS 📱";
    if (mode === "off") return "Touch: OFF ❌";
    return "Touch: AUTOMÁTICO 📱";
  };

  const btnTouchPos = k.vec2(col1X, row5Y);
  const btnTouch = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnTouchPos),
    k.color(touchMode === "off" ? k.rgb(45, 55, 75) : k.rgb(20, 90, 140)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnTouch);

  const touchText = k.add([
    k.text(getTouchLabel(touchMode), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnTouchPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(touchText);

  const handleTouch = () => {
    if (touchMode === "auto") touchMode = "on";
    else if (touchMode === "on") touchMode = "off";
    else touchMode = "auto";

    writeLocalStorage("micro_splash_touch_controls", touchMode);
    audioSystem.playUiClick();
    btnTouch.color = touchMode === "off" ? k.rgb(45, 55, 75) : k.rgb(20, 90, 140);
    touchText.text = getTouchLabel(touchMode);
  };

  btnTouch.onHoverUpdate(() => {
    btnTouch.scale = k.vec2(1.02, 1.02);
  });
  btnTouch.onHoverEnd(() => {
    btnTouch.scale = k.vec2(1, 1);
  });
  btnTouch.onClick(handleTouch);
  focusItems.push({
    pos: btnTouchPos,
    width: colW,
    height: btnH,
    onActivate: handleTouch,
  });
}

export function renderControlsGuide(context: OptionsScreenContext): void {
  const { k, elements, cardW, cardTop, cX } = context;

  // --- Guia Rápido de Controles ---
  const guideY = cardTop + 472;
  const guideBoxW = cardW - 56;
  const guideBoxH = 66;

  elements.push(
    k.add([
      k.rect(guideBoxW, guideBoxH, { radius: 10 }),
      k.pos(cX, guideY),
      k.color(8, 24, 52),
      k.outline(1.5, k.rgb(38, 80, 135)),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  elements.push(
    k.add([
      k.text("🎮 GUIA RÁPIDO DE CONTROLES & NAVEGAÇÃO", {
        size: accessibilitySystem.scaleFont(13.5),
        font: "Outfit",
      }),
      k.pos(cX, guideY - 15),
      k.color(255, 215, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  const guideControlText =
    "🏊 [Setas / WASD]: Nadar e Inclinar    💨 [Espaço]: Impulso    📡 [Shift / E]: Biossonar\n" +
    "⌨️ [Tab / Setas + Enter]: Navegar por Teclado    ✕ [Esc]: Fechar";

  elements.push(
    k.add([
      k.text(guideControlText, {
        size: accessibilitySystem.scaleFont(12.5),
        font: "Inter",
        width: guideBoxW - 32,
        align: "center",
        lineSpacing: 4,
      }),
      k.pos(cX, guideY + 13),
      k.color(215, 235, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );
}
