import kaboom from "kaboom";
import { type Fact } from "../systems/state";
import { ttsSystem } from "../systems/ttsSystem";
import { FONT_TITLE, FONT_BODY } from "../config";

export function showFactPopup(k: ReturnType<typeof kaboom>, fact: Fact) {
  // Quebra de linha adaptativa em conteúdo educacional (Fase 32.4)
  const contentW = Math.min(500, k.width() - 80);
  const width = contentW + 36;
  const height = 118;
  const startY = k.height() + 20;
  const targetY = k.height() - height - 30;

  // Narração por voz acessível via Web Speech API
  ttsSystem.speak(`${fact.title}. ${fact.description}`);

  // Painel de fundo com cantos arredondados e borda dourada
  const panel = k.add([
    k.rect(width, height, { radius: 10 }),
    k.pos(k.width() / 2, startY),
    k.anchor("center"),
    k.color(15, 30, 50),
    k.opacity(0.92),
    k.outline(2, k.rgb(240, 190, 70)),
    k.fixed(),
    k.z(98),
  ]);

  // Ícone pedagógico e título
  const titleText = k.add([
    k.text(`📖 ${fact.title} (${fact.location})`, {
      size: 14,
      font: FONT_TITLE,
      width: contentW,
    }),
    k.pos(k.width() / 2 - width / 2 + 18, startY - height / 2 + 14),
    k.color(255, 215, 100),
    k.fixed(),
    k.z(99),
  ]);

  // Descrição do fato científico com quebra adaptativa
  const descText = k.add([
    k.text(fact.description, {
      size: 12.5,
      font: FONT_BODY,
      width: contentW,
      lineSpacing: 4.5,
    }),
    k.pos(k.width() / 2 - width / 2 + 18, startY - height / 2 + 42),
    k.color(220, 235, 255),
    k.fixed(),
    k.z(99),
  ]);

  // Animação de entrada (Slide UP)
  k.tween(
    startY,
    targetY + height / 2,
    0.5,
    (val) => {
      panel.pos.y = val;
      titleText.pos.y = val - height / 2 + 12;
      descText.pos.y = val - height / 2 + 38;
    },
    k.easings.easeOutBack
  ).then(() => {
    // Permanece visível por 5.5 segundos antes de sumir
    k.wait(5.5, () => {
      k.tween(
        panel.pos.y,
        startY,
        0.5,
        (val) => {
          panel.pos.y = val;
          titleText.pos.y = val - height / 2 + 12;
          descText.pos.y = val - height / 2 + 38;
        },
        k.easings.easeInQuad
      ).then(() => {
        ttsSystem.stop();
        k.destroy(panel);
        k.destroy(titleText);
        k.destroy(descText);
      });
    });
  });
}
