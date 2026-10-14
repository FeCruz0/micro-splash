import { audioSystem } from "../../systems/audioSystem";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import { hapticsSystem } from "../../systems/hapticsSystem";
import type { OptionsScreenContext } from "./optionsTypes";

export function renderAudioOptions(context: OptionsScreenContext): void {
  const { k, elements, focusItems, col0X, colW, btnH, rowGap, rowStartY } = context;

  // --- Linha 0: Volume Geral ---
  const row0Y = rowStartY + 0 * (btnH + rowGap);
  const volBox = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(col0X, row0Y),
    k.color(16, 40, 78),
    k.outline(1.5, k.rgb(38, 78, 130)),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(volBox);

  elements.push(
    k.add([
      k.text("Volume Geral:", {
        size: accessibilitySystem.scaleFont(15),
        font: "Inter",
      }),
      k.pos(col0X - colW / 2 + 16, row0Y),
      k.color(200, 230, 255),
      k.anchor("left"),
      k.fixed(),
      k.z(303),
    ])
  );

  const volumeText = k.add([
    k.text(`${Math.round(audioSystem.getVolume() * 100)}%`, {
      size: accessibilitySystem.scaleFont(16),
      font: "Outfit",
    }),
    k.pos(col0X + 35, row0Y),
    k.color(100, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(volumeText);

  // Botão Diminuir Volume [-]
  const btnVolDownPos = k.vec2(col0X - 18, row0Y);
  const btnVolDown = k.add([
    k.rect(36, 30, { radius: 6 }),
    k.pos(btnVolDownPos),
    k.color(22, 65, 120),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(304),
  ]);
  elements.push(btnVolDown);

  elements.push(
    k.add([
      k.text("-", {
        size: accessibilitySystem.scaleFont(20),
        font: "Outfit",
      }),
      k.pos(btnVolDownPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ])
  );

  const handleVolDown = () => {
    const newVol = Math.max(0, audioSystem.getVolume() - 0.1);
    audioSystem.setVolume(newVol);
    audioSystem.playUiClick();
    volumeText.text = `${Math.round(newVol * 100)}%`;
  };

  btnVolDown.onHoverUpdate(() => {
    btnVolDown.color = k.rgb(35, 95, 160);
    btnVolDown.scale = k.vec2(1.05, 1.05);
  });
  btnVolDown.onHoverEnd(() => {
    btnVolDown.color = k.rgb(22, 65, 120);
    btnVolDown.scale = k.vec2(1, 1);
  });
  btnVolDown.onClick(handleVolDown);
  focusItems.push({
    pos: btnVolDownPos,
    width: 36,
    height: 30,
    onActivate: handleVolDown,
  });

  // Botão Aumentar Volume [+]
  const btnVolUpPos = k.vec2(col0X + 90, row0Y);
  const btnVolUp = k.add([
    k.rect(36, 30, { radius: 6 }),
    k.pos(btnVolUpPos),
    k.color(22, 65, 120),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(304),
  ]);
  elements.push(btnVolUp);

  elements.push(
    k.add([
      k.text("+", {
        size: accessibilitySystem.scaleFont(20),
        font: "Outfit",
      }),
      k.pos(btnVolUpPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ])
  );

  const handleVolUp = () => {
    const newVol = Math.min(1, audioSystem.getVolume() + 0.1);
    audioSystem.setVolume(newVol);
    audioSystem.playUiClick();
    volumeText.text = `${Math.round(newVol * 100)}%`;
  };

  btnVolUp.onHoverUpdate(() => {
    btnVolUp.color = k.rgb(35, 95, 160);
    btnVolUp.scale = k.vec2(1.05, 1.05);
  });
  btnVolUp.onHoverEnd(() => {
    btnVolUp.color = k.rgb(22, 65, 120);
    btnVolUp.scale = k.vec2(1, 1);
  });
  btnVolUp.onClick(handleVolUp);
  focusItems.push({
    pos: btnVolUpPos,
    width: 36,
    height: 30,
    onActivate: handleVolUp,
  });

  // --- Linha 1: Trilha Sonora (Jukebox) ---
  const row1Y = rowStartY + 1 * (btnH + rowGap);
  const btnSoundtrackPos = k.vec2(col0X, row1Y);
  const btnSoundtrack = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnSoundtrackPos),
    k.color(20, 75, 135),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnSoundtrack);

  const soundtrackText = k.add([
    k.text(audioSystem.getSoundtrackModeLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnSoundtrackPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(soundtrackText);

  const handleSoundtrack = () => {
    audioSystem.cycleNextSoundtrackMode();
    audioSystem.playUiClick();
    soundtrackText.text = audioSystem.getSoundtrackModeLabel();
  };

  btnSoundtrack.onHoverUpdate(() => {
    btnSoundtrack.color = k.rgb(28, 100, 175);
    btnSoundtrack.scale = k.vec2(1.02, 1.02);
  });
  btnSoundtrack.onHoverEnd(() => {
    btnSoundtrack.color = k.rgb(20, 75, 135);
    btnSoundtrack.scale = k.vec2(1, 1);
  });
  btnSoundtrack.onClick(handleSoundtrack);
  focusItems.push({
    pos: btnSoundtrackPos,
    width: colW,
    height: btnH,
    onActivate: handleSoundtrack,
  });

  // --- Linha 2: Efeitos Sonoros (SFX) ---
  const row2Y = rowStartY + 2 * (btnH + rowGap);
  const btnSfxPos = k.vec2(col0X, row2Y);
  const btnSfx = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnSfxPos),
    k.color(audioSystem.isSfxEnabled() ? k.rgb(20, 85, 145) : k.rgb(45, 55, 75)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnSfx);

  const sfxText = k.add([
    k.text(`SFX: ${audioSystem.isSfxEnabled() ? "LIGADOS 🔊" : "DESLIGADOS 🔇"}`, {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnSfxPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(sfxText);

  const handleSfx = () => {
    const newState = !audioSystem.isSfxEnabled();
    audioSystem.setSfxEnabled(newState);
    audioSystem.playUiClick();
    btnSfx.color = newState ? k.rgb(20, 85, 145) : k.rgb(45, 55, 75);
    sfxText.text = `SFX: ${newState ? "LIGADOS 🔊" : "DESLIGADOS 🔇"}`;
  };

  btnSfx.onHoverUpdate(() => {
    btnSfx.scale = k.vec2(1.02, 1.02);
  });
  btnSfx.onHoverEnd(() => {
    btnSfx.scale = k.vec2(1, 1);
  });
  btnSfx.onClick(handleSfx);
  focusItems.push({
    pos: btnSfxPos,
    width: colW,
    height: btnH,
    onActivate: handleSfx,
  });

  // --- Linha 3: Vibração / Feedback Háptico ---
  const row3Y = rowStartY + 3 * (btnH + rowGap);
  const getHapticsLabel = () =>
    hapticsSystem.isEnabled() ? "Vibração: LIGADA 📳" : "Vibração: DESLIGADA 📴";
  const btnHapticsPos = k.vec2(col0X, row3Y);
  const btnHaptics = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnHapticsPos),
    k.color(hapticsSystem.isEnabled() ? k.rgb(20, 85, 145) : k.rgb(45, 55, 75)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnHaptics);

  const hapticsText = k.add([
    k.text(getHapticsLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnHapticsPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(hapticsText);

  const handleHaptics = () => {
    const newState = hapticsSystem.toggle();
    audioSystem.playUiClick();
    btnHaptics.color = newState ? k.rgb(20, 85, 145) : k.rgb(45, 55, 75);
    hapticsText.text = getHapticsLabel();
  };

  btnHaptics.onHoverUpdate(() => {
    btnHaptics.scale = k.vec2(1.02, 1.02);
  });
  btnHaptics.onHoverEnd(() => {
    btnHaptics.scale = k.vec2(1, 1);
  });
  btnHaptics.onClick(handleHaptics);
  focusItems.push({
    pos: btnHapticsPos,
    width: colW,
    height: btnH,
    onActivate: handleHaptics,
  });
}
