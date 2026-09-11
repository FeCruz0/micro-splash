import kaboom from "kaboom";
import { type Fact } from "../systems/state";

export function showFactPopup(k: ReturnType<typeof kaboom>, fact: Fact) {
  const width = Math.min(k.width() - 40, 520);
  const height = 110;
  const startY = k.height() + 20;
  const targetY = k.height() - height - 30;

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
      size: 15,
      width: width - 30,
    }),
    k.pos(k.width() / 2 - width / 2 + 15, startY - height / 2 + 12),
    k.color(255, 215, 100),
    k.fixed(),
    k.z(99),
  ]);

  // Descrição do fato científico
  const descText = k.add([
    k.text(fact.description, {
      size: 12,
      width: width - 30,
      lineSpacing: 4,
    }),
    k.pos(k.width() / 2 - width / 2 + 15, startY - height / 2 + 38),
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
        k.destroy(panel);
        k.destroy(titleText);
        k.destroy(descText);
      });
    });
  });
}
