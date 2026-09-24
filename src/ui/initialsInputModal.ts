import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { addLeaderboardEntry } from "../systems/leaderboard";
import type { GameMode } from "../systems/state";

export function showInitialsInputModal(
  k: KaboomCtx,
  score: number,
  distance: number,
  mode: GameMode,
  onSubmitted: () => void,
  weekKey?: string
) {
  const elements: any[] = [];
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  const initials = ["A", "A", "A"];
  let activeIndex = 0;

  // Fundo escurecido translúcido
  elements.push(
    k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(4, 14, 32),
      k.opacity(0.92),
      k.fixed(),
      k.z(400),
    ])
  );

  const cardW = 540;
  const cardH = 370;
  const centerX = k.width() / 2;
  const centerY = k.height() / 2;

  // Caixa principal com contorno dourado
  elements.push(
    k.add([
      k.rect(cardW, cardH, { radius: 14 }),
      k.pos(centerX, centerY),
      k.color(10, 32, 68),
      k.outline(3, k.rgb(255, 215, 60)),
      k.anchor("center"),
      k.fixed(),
      k.z(401),
    ])
  );

  // Título e Subtítulo
  elements.push(
    k.add([
      k.text(mode === "weekly" ? "📅 NOVO RECORDE SEMANAL!" : "🏆 NOVO RECORDE NO TOP 10!", { size: 19, font: "sans-serif" }),
      k.pos(centerX, centerY - 140),
      k.color(255, 220, 80),
      k.anchor("center"),
      k.fixed(),
      k.z(402),
    ])
  );

  elements.push(
    k.add([
      k.text(`⭐ ${score} Eco-Pontos  |  🌊 ${Math.floor(distance)}m`, {
        size: 14,
        font: "sans-serif",
      }),
      k.pos(centerX, centerY - 105),
      k.color(160, 240, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(402),
    ])
  );

  elements.push(
    k.add([
      k.text("Insira 3 letras para registrar seu nome no ranking arcade:", {
        size: 12,
        font: "sans-serif",
      }),
      k.pos(centerX, centerY - 72),
      k.color(210, 230, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(402),
    ])
  );

  // 3 Slots de iniciais
  const slotSpacing = 85;
  const startX = centerX - slotSpacing;
  const slotY = centerY + 10;

  const slotBoxes: any[] = [];
  const slotTexts: any[] = [];

  const updateSlots = () => {
    for (let i = 0; i < 3; i++) {
      slotTexts[i].text = initials[i];
      if (i === activeIndex) {
        slotBoxes[i].color = k.rgb(25, 80, 150);
        slotBoxes[i].outline = { width: 3, color: k.rgb(100, 250, 255) };
      } else {
        slotBoxes[i].color = k.rgb(14, 45, 90);
        slotBoxes[i].outline = { width: 1.5, color: k.rgb(80, 140, 200) };
      }
    }
  };

  const cycleChar = (index: number, direction: number) => {
    audioSystem.playUiClick();
    const curChar = initials[index];
    let charIdx = chars.indexOf(curChar);
    if (charIdx === -1) charIdx = 0;
    charIdx = (charIdx + direction + chars.length) % chars.length;
    initials[index] = chars[charIdx];
    updateSlots();
  };

  for (let i = 0; i < 3; i++) {
    const slotX = startX + i * slotSpacing;

    // Seta para cima (▲)
    const btnUp = k.add([
      k.rect(50, 28, { radius: 6 }),
      k.pos(slotX, slotY - 48),
      k.color(20, 60, 110),
      k.outline(1.5, k.rgb(120, 200, 255)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(403),
    ]);
    elements.push(btnUp);

    elements.push(
      k.add([
        k.text("▲", { size: 14, font: "sans-serif" }),
        k.pos(slotX, slotY - 48),
        k.color(255, 255, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(404),
      ])
    );

    btnUp.onClick(() => {
      activeIndex = i;
      cycleChar(i, 1);
    });

    // Caixa da letra
    const box = k.add([
      k.rect(64, 54, { radius: 8 }),
      k.pos(slotX, slotY),
      k.color(14, 45, 90),
      k.outline(2, k.rgb(80, 140, 200)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(402),
    ]);
    slotBoxes.push(box);
    elements.push(box);

    box.onClick(() => {
      activeIndex = i;
      updateSlots();
      audioSystem.playUiClick();
    });

    const letter = k.add([
      k.text(initials[i], { size: 28, font: "sans-serif" }),
      k.pos(slotX, slotY),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(403),
    ]);
    slotTexts.push(letter);
    elements.push(letter);

    // Seta para baixo (▼)
    const btnDown = k.add([
      k.rect(50, 28, { radius: 6 }),
      k.pos(slotX, slotY + 48),
      k.color(20, 60, 110),
      k.outline(1.5, k.rgb(120, 200, 255)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(403),
    ]);
    elements.push(btnDown);

    elements.push(
      k.add([
        k.text("▼", { size: 14, font: "sans-serif" }),
        k.pos(slotX, slotY + 48),
        k.color(255, 255, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(404),
      ])
    );

    btnDown.onClick(() => {
      activeIndex = i;
      cycleChar(i, -1);
    });
  }

  updateSlots();

  // Botão Confirmar Registro
  const btnSubmit = k.add([
    k.rect(340, 44, { radius: 8 }),
    k.pos(centerX, centerY + 125),
    k.color(25, 145, 90),
    k.outline(2, k.rgb(120, 255, 180)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(403),
  ]);
  elements.push(btnSubmit);

  elements.push(
    k.add([
      k.text("💾 SALVAR NO RANKING (ENTER)", { size: 14, font: "sans-serif" }),
      k.pos(centerX, centerY + 125),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(404),
    ])
  );

  btnSubmit.onHoverUpdate(() => {
    btnSubmit.color = k.rgb(35, 175, 110);
  });
  btnSubmit.onHoverEnd(() => {
    btnSubmit.color = k.rgb(25, 145, 90);
  });

  let submitted = false;
  const doSubmit = () => {
    if (submitted) return;
    submitted = true;
    cleanUpKeyHandlers();
    audioSystem.playUiClick();

    const tag = initials.join("");
    addLeaderboardEntry({
      initials: tag,
      score,
      distance,
      mode,
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      weekKey,
    });

    elements.forEach((el) => k.destroy(el));
    k.wait(0.1, () => {
      onSubmitted();
    });
  };

  btnSubmit.onClick(doSubmit);

  // Captura de teclado para totens e desktop
  const keyHandlers: any[] = [];

  keyHandlers.push(
    k.onKeyPress("enter", doSubmit)
  );

  keyHandlers.push(
    k.onKeyPress("up", () => cycleChar(activeIndex, 1))
  );

  keyHandlers.push(
    k.onKeyPress("down", () => cycleChar(activeIndex, -1))
  );

  keyHandlers.push(
    k.onKeyPress("left", () => {
      activeIndex = (activeIndex - 1 + 3) % 3;
      updateSlots();
      audioSystem.playUiClick();
    })
  );

  keyHandlers.push(
    k.onKeyPress("right", () => {
      activeIndex = (activeIndex + 1) % 3;
      updateSlots();
      audioSystem.playUiClick();
    })
  );

  keyHandlers.push(
    k.onKeyPress("backspace", () => {
      initials[activeIndex] = "A";
      activeIndex = Math.max(0, activeIndex - 1);
      updateSlots();
      audioSystem.playUiClick();
    })
  );

  // Digitação direta de caracteres A-Z ou 0-9
  keyHandlers.push(
    k.onCharInput((ch) => {
      const upper = ch.toUpperCase();
      if (chars.includes(upper)) {
        initials[activeIndex] = upper;
        activeIndex = Math.min(2, activeIndex + 1);
        updateSlots();
        audioSystem.playUiClick();
      }
    })
  );

  const cleanUpKeyHandlers = () => {
    keyHandlers.forEach((h) => {
      if (h && typeof h.cancel === "function") h.cancel();
    });
  };
}
