import type { KaboomCtx, GameObj } from "kaboom";
import { promptPwaInstall, canInstallPwa } from "../utils/pwaManager";
import { audioSystem } from "../systems/audioSystem";
import { attachButtonHoverEffect } from "./animationUtils";
import { accessibilitySystem } from "../systems/accessibilitySystem";

export interface PwaInstallModalOptions {
  onClose: () => void;
  onInstalled?: () => void;
}

export function showPwaInstallModal(k: KaboomCtx, options: PwaInstallModalOptions): void {
  const elements: GameObj[] = [];
  let isClosed = false;

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    elements.forEach((element) => {
      try {
        k.destroy(element);
      } catch {}
    });
    options.onClose();
  };

  const cX = k.width() / 2;
  const cY = k.height() / 2;
  const modalWidth = Math.min(480, k.width() - 40);
  const modalHeight = 280;

  // Fundo escuro semitransparente
  const overlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(6, 18, 42),
    k.opacity(0.85),
    k.fixed(),
    k.z(500),
    k.area(),
  ]);
  elements.push(overlay);

  // Cartão central
  const card = k.add([
    k.rect(modalWidth, modalHeight, { radius: 16 }),
    k.pos(cX, cY),
    k.color(14, 30, 58),
    k.outline(2, k.rgb(56, 189, 248)),
    k.anchor("center"),
    k.fixed(),
    k.z(501),
  ]);
  elements.push(card);

  // Ícone e Título
  elements.push(
    k.add([
      k.text("📱 Instalar Micro Splash", {
        size: accessibilitySystem.scaleFont(22),
        font: "Outfit",
      }),
      k.pos(cX, cY - modalHeight / 2 + 36),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(502),
    ])
  );

  // Descrição
  elements.push(
    k.add([
      k.text(
        "Instale o jogo para jogar offline em feiras, totens e telas cheias com carregamento instantâneo!",
        {
          size: accessibilitySystem.scaleFont(14),
          font: "Inter",
          width: modalWidth - 60,
          align: "center",
        }
      ),
      k.pos(cX, cY - 20),
      k.color(186, 230, 253),
      k.anchor("center"),
      k.fixed(),
      k.z(502),
    ])
  );

  // Botão Instalar
  const buttonInstallY = cY + modalHeight / 2 - 50;
  const buttonWidth = 160;
  const buttonHeight = 44;

  const btnInstall = k.add([
    k.rect(buttonWidth, buttonHeight, { radius: 10 }),
    k.pos(cX - buttonWidth / 2 - 12, buttonInstallY),
    k.color(16, 185, 129),
    k.outline(1.5, k.rgb(110, 231, 183)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(502),
  ]);
  elements.push(btnInstall);

  elements.push(
    k.add([
      k.text("Instalar 🚀", {
        size: accessibilitySystem.scaleFont(15),
        font: "Outfit",
      }),
      k.pos(cX - buttonWidth / 2 - 12, buttonInstallY),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(503),
    ])
  );

  attachButtonHoverEffect(k, btnInstall, {
    baseColor: [16, 185, 129],
    hoverColor: [5, 150, 105],
    baseScale: 1.0,
    hoverScale: 1.04,
  });

  btnInstall.onClick(async () => {
    if (!canInstallPwa()) {
      close();
      return;
    }
    const installed = await promptPwaInstall();
    if (installed && options.onInstalled) {
      options.onInstalled();
    }
    close();
  });

  // Botão Cancelar / Fechar
  const btnCancel = k.add([
    k.rect(buttonWidth, buttonHeight, { radius: 10 }),
    k.pos(cX + buttonWidth / 2 + 12, buttonInstallY),
    k.color(30, 41, 59),
    k.outline(1.5, k.rgb(100, 116, 139)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(502),
  ]);
  elements.push(btnCancel);

  elements.push(
    k.add([
      k.text("Agora Não", {
        size: accessibilitySystem.scaleFont(15),
        font: "Outfit",
      }),
      k.pos(cX + buttonWidth / 2 + 12, buttonInstallY),
      k.color(203, 213, 225),
      k.anchor("center"),
      k.fixed(),
      k.z(503),
    ])
  );

  attachButtonHoverEffect(k, btnCancel, {
    baseColor: [30, 41, 59],
    hoverColor: [51, 65, 85],
    baseScale: 1.0,
    hoverScale: 1.04,
  });

  btnCancel.onClick(close);
}
