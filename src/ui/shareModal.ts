import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import {
  type VictoryCardData,
  getShareText,
  generateAndDownloadVictoryCard,
  shareVictoryCard,
} from "./victoryCard";

export function showShareModal(k: KaboomCtx, data: VictoryCardData, onClose: () => void) {
  audioSystem.playUiClick();

  const elements: any[] = [];
  const keyListeners: any[] = [];
  let isClosed = false;

  const screenW = k.width();
  const screenH = k.height();
  const cX = screenW / 2;
  const cY = screenH / 2;

  const cardW = Math.min(580, screenW - 24);
  const cardH = Math.min(410, screenH - 24);

  // Fundo escuro semi-transparente que bloqueia cliques na tela de fundo
  const backdrop = k.add([
    k.rect(screenW, screenH),
    k.pos(0, 0),
    k.color(4, 12, 28),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(500),
  ]);
  elements.push(backdrop);

  // Card principal
  const card = k.add([
    k.rect(cardW, cardH, { radius: 12 }),
    k.pos(cX, cY),
    k.color(10, 30, 64),
    k.outline(2.5, k.rgb(100, 220, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(501),
  ]);
  elements.push(card);

  // Título e Subtítulo
  elements.push(
    k.add([
      k.text("COMPARTILHAR CERTIFICADO 📲🌊", { size: 16, font: "sans-serif" }),
      k.pos(cX, cY - cardH / 2 + 28),
      k.color(255, 215, 80),
      k.anchor("center"),
      k.fixed(),
      k.z(502),
    ])
  );

  elements.push(
    k.add([
      k.text("Mostre sua pontuação nas redes e ajude na conscientização da vida marinha!", {
        size: 11,
        font: "sans-serif",
        width: cardW - 50,
        align: "center",
      }),
      k.pos(cX, cY - cardH / 2 + 54),
      k.color(180, 225, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(502),
    ])
  );

  // Preview das Conquistas (Banner de Resumo)
  const previewY = cY - cardH / 2 + 100;
  elements.push(
    k.add([
      k.rect(cardW - 50, 52, { radius: 8 }),
      k.pos(cX, previewY),
      k.color(14, 42, 85),
      k.outline(1, k.rgb(80, 160, 230)),
      k.anchor("center"),
      k.fixed(),
      k.z(502),
    ])
  );

  elements.push(
    k.add([
      k.text(`⭐ ${data.finalScore.toLocaleString("pt-BR")} Eco-Pontos   |   ${data.rank}`, {
        size: 13,
        font: "sans-serif",
      }),
      k.pos(cX, previewY - 11),
      k.color(255, 225, 90),
      k.anchor("center"),
      k.fixed(),
      k.z(503),
    ])
  );

  elements.push(
    k.add([
      k.text(
        `📏 ${Math.floor(data.distance).toLocaleString("pt-BR")}m percorridos   •   🦐 ${data.krillCount} Krill   •   🗑️ ${data.trashCount} Lixo`,
        { size: 11, font: "sans-serif" }
      ),
      k.pos(cX, previewY + 13),
      k.color(200, 235, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(503),
    ])
  );

  const destroyAll = () => {
    if (isClosed) return;
    isClosed = true;

    keyListeners.forEach((l) => {
      try {
        if (l && typeof l.cancel === "function") l.cancel();
      } catch {}
    });

    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
  };

  const doClose = () => {
    audioSystem.playUiClick();
    destroyAll();
    onClose();
  };

  // Botão Fechar [✕]
  const btnClose = k.add([
    k.rect(28, 28, { radius: 6 }),
    k.pos(cX + cardW / 2 - 24, cY - cardH / 2 + 24),
    k.color(25, 45, 80),
    k.outline(1, k.rgb(100, 200, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(505),
  ]);
  elements.push(btnClose);

  elements.push(
    k.add([
      k.text("✕", { size: 14, font: "sans-serif" }),
      k.pos(cX + cardW / 2 - 24, cY - cardH / 2 + 24),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(506),
    ])
  );

  btnClose.onHoverUpdate(() => {
    btnClose.color = k.rgb(150, 40, 40);
  });
  btnClose.onHoverEnd(() => {
    btnClose.color = k.rgb(25, 45, 80);
  });
  btnClose.onClick(doClose);
  keyListeners.push(k.onKeyPress("escape", doClose));

  // Botões de Compartilhamento
  const startBtnY = previewY + 54;
  const btnSpacing = 42;
  const btnW = cardW - 50;
  const btnH = 34;

  const shareText = getShareText(data);
  const currentUrl =
    typeof window !== "undefined" ? window.location.href : "https://micro-splash.local";

  // 1. WhatsApp
  const btnWhatsApp = k.add([
    k.rect(btnW, btnH, { radius: 7 }),
    k.pos(cX, startBtnY),
    k.color(20, 115, 60),
    k.outline(1.5, k.rgb(80, 220, 120)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(503),
  ]);
  elements.push(btnWhatsApp);

  elements.push(
    k.add([
      k.text("📱 Compartilhar no WhatsApp", { size: 12.5, font: "sans-serif" }),
      k.pos(cX, startBtnY),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(504),
    ])
  );

  btnWhatsApp.onHoverUpdate(() => {
    btnWhatsApp.color = k.rgb(28, 145, 75);
  });
  btnWhatsApp.onHoverEnd(() => {
    btnWhatsApp.color = k.rgb(20, 115, 60);
  });
  btnWhatsApp.onClick(() => {
    audioSystem.playUiClick();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + "\n" + currentUrl)}`;
    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  });

  // 2. X / Twitter
  const btnTwitter = k.add([
    k.rect(btnW, btnH, { radius: 7 }),
    k.pos(cX, startBtnY + btnSpacing),
    k.color(20, 75, 130),
    k.outline(1.5, k.rgb(90, 180, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(503),
  ]);
  elements.push(btnTwitter);

  elements.push(
    k.add([
      k.text("🐦 Compartilhar no X (Twitter)", { size: 12.5, font: "sans-serif" }),
      k.pos(cX, startBtnY + btnSpacing),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(504),
    ])
  );

  btnTwitter.onHoverUpdate(() => {
    btnTwitter.color = k.rgb(30, 95, 160);
  });
  btnTwitter.onHoverEnd(() => {
    btnTwitter.color = k.rgb(20, 75, 130);
  });
  btnTwitter.onClick(() => {
    audioSystem.playUiClick();
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;
    if (typeof window !== "undefined") {
      window.open(twUrl, "_blank", "noopener,noreferrer");
    }
  });

  // 3. Copiar Texto Formatado
  const btnCopy = k.add([
    k.rect(btnW, btnH, { radius: 7 }),
    k.pos(cX, startBtnY + btnSpacing * 2),
    k.color(30, 50, 90),
    k.outline(1.5, k.rgb(110, 170, 240)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(503),
  ]);
  elements.push(btnCopy);

  const copyLabel = k.add([
    k.text("📋 Copiar Texto do Certificado (Instagram / Discord)", {
      size: 12,
      font: "sans-serif",
    }),
    k.pos(cX, startBtnY + btnSpacing * 2),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(504),
  ]);
  elements.push(copyLabel);

  btnCopy.onHoverUpdate(() => {
    btnCopy.color = k.rgb(40, 70, 120);
  });
  btnCopy.onHoverEnd(() => {
    btnCopy.color = k.rgb(30, 50, 90);
  });
  btnCopy.onClick(async () => {
    audioSystem.playUiClick();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareText + "\n" + currentUrl);
        copyLabel.text = "Copiado com Sucesso para a Área de Transferência! ✓";
        k.wait(2.5, () => {
          if (!isClosed) {
            copyLabel.text = "📋 Copiar Texto do Certificado (Instagram / Discord)";
          }
        });
      }
    } catch {
      copyLabel.text = "Texto gerado! Pressione Ctrl+C";
    }
  });

  // 4. Compartilhar Imagem com App (Nativo) ou Baixar PNG
  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const btnAction = k.add([
    k.rect(btnW, btnH, { radius: 7 }),
    k.pos(cX, startBtnY + btnSpacing * 3),
    k.color(hasNativeShare ? k.rgb(18, 110, 120) : k.rgb(18, 90, 75)),
    k.outline(1.5, hasNativeShare ? k.rgb(90, 230, 230) : k.rgb(90, 240, 180)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(503),
  ]);
  elements.push(btnAction);

  const actionLabel = k.add([
    k.text(
      hasNativeShare
        ? "✨ Compartilhar Imagem com App (Nativo)"
        : "📥 Baixar Imagem PNG do Certificado",
      {
        size: 12.5,
        font: "sans-serif",
      }
    ),
    k.pos(cX, startBtnY + btnSpacing * 3),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(504),
  ]);
  elements.push(actionLabel);

  btnAction.onHoverUpdate(() => {
    btnAction.color = hasNativeShare ? k.rgb(25, 140, 150) : k.rgb(24, 120, 100);
  });
  btnAction.onHoverEnd(() => {
    btnAction.color = hasNativeShare ? k.rgb(18, 110, 120) : k.rgb(18, 90, 75);
  });

  btnAction.onClick(async () => {
    audioSystem.playUiClick();
    if (hasNativeShare) {
      actionLabel.text = "Abrindo Compartilhamento... 📲";
      const shared = await shareVictoryCard(data);
      if (shared) {
        actionLabel.text = "Compartilhado com Sucesso! ✓";
      } else {
        // Fallback para download direto caso cancele ou não envie
        generateAndDownloadVictoryCard(data);
        actionLabel.text = "Certificado PNG Baixado! ✓";
      }
      k.wait(2.5, () => {
        if (!isClosed) {
          actionLabel.text = "✨ Compartilhar Imagem com App (Nativo)";
        }
      });
    } else {
      generateAndDownloadVictoryCard(data);
      actionLabel.text = "Certificado PNG Baixado! ✓ (Poste nos Stories)";
      k.wait(2.5, () => {
        if (!isClosed) {
          actionLabel.text = "📥 Baixar Imagem PNG do Certificado";
        }
      });
    }
  });

  // Botão Concluir / Voltar
  const btnDone = k.add([
    k.rect(170, 30, { radius: 6 }),
    k.pos(cX, cY + cardH / 2 - 22),
    k.color(18, 45, 80),
    k.outline(1, k.rgb(80, 160, 220)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(503),
  ]);
  elements.push(btnDone);

  elements.push(
    k.add([
      k.text("Voltar (ESC)", { size: 11.5, font: "sans-serif" }),
      k.pos(cX, cY + cardH / 2 - 22),
      k.color(210, 235, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(504),
    ])
  );

  btnDone.onHoverUpdate(() => {
    btnDone.color = k.rgb(28, 65, 110);
  });
  btnDone.onHoverEnd(() => {
    btnDone.color = k.rgb(18, 45, 80);
  });
  btnDone.onClick(doClose);
}
