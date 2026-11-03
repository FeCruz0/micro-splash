import { accessibilitySystem } from "../../systems/accessibilitySystem";
import type { CodexTabContext } from "./codexTypes";

export function renderConservationTab(context: CodexTabContext): void {
  const { k, cX, cardW, contentBoxTop, contentBoxH, contentElements } = context;

  contentElements.push(
    k.add([
      k.text("🛡️ PRESERVAÇÃO E PROTEÇÃO DAS BALEIAS-JUBARTE", {
        size: accessibilitySystem.scaleFont(17),
        font: "Outfit",
      }),
      k.pos(cX, contentBoxTop + 24),
      k.color(100, 240, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(304),
    ])
  );

  const conservationCards = [
    {
      icon: "🕸️",
      title: "Redes Fantasmas (Ghost Fishing)",
      desc: "Redes de pesca perdidas continuam aprisionando baleias e golfinhos por décadas. O jogo conscientiza sobre petrechos sustentáveis e descarte responsável.",
    },
    {
      icon: "🧴",
      title: "Poluição Plástica e Microplásticos",
      desc: "Resíduos flutuantes provocam lesões mecânicas e obstruções graves. A fragmentação em microplásticos contamina os cardumes de krill na base alimentar.",
    },
    {
      icon: "🚢",
      title: "Tráfego de Navios & Ruído Subaquático",
      desc: "O tráfego marítimo intenso gera poluição sonora contínua no canal SOFAR, abafando os cantos das baleias e desorientando sua comunicação acústica.",
    },
    {
      icon: "🐋",
      title: "Instituto Baleia Jubarte (IBJ)",
      desc: "Desde 1988 atua no monitoramento, pesquisa e resgate de jubartes no Brasil, recuperando a espécie de quase extinção para mais de 30 mil indivíduos!",
    },
  ];

  const colGap = 20;
  const boxW = Math.min(460, (cardW - 64 - colGap) / 2);
  const rowGap = 16;
  const boxH = Math.min(160, (contentBoxH - 64 - rowGap) / 2);
  const col0X = cX - boxW / 2 - colGap / 2;
  const col1X = cX + boxW / 2 + colGap / 2;
  const startY = contentBoxTop + 50 + boxH / 2;

  conservationCards.forEach((c, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const posX = col === 0 ? col0X : col1X;
    const posY = startY + row * (boxH + rowGap);

    const cBox = k.add([
      k.rect(boxW, boxH, { radius: 12 }),
      k.pos(posX, posY),
      k.color(14, 34, 68),
      k.outline(1.5, k.rgb(42, 85, 145)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(304),
    ]);
    contentElements.push(cBox);

    cBox.onHoverUpdate(() => {
      cBox.color = k.rgb(18, 48, 92);
      cBox.outline = { width: 1.5, color: k.rgb(80, 200, 255) };
    });
    cBox.onHoverEnd(() => {
      cBox.color = k.rgb(14, 34, 68);
      cBox.outline = { width: 1.5, color: k.rgb(42, 85, 145) };
    });

    // Badge de Ícone
    const iconPillX = posX - boxW / 2 + 32;
    contentElements.push(
      k.add([
        k.rect(50, 50, { radius: 10 }),
        k.pos(iconPillX, posY - boxH / 2 + 35),
        k.color(18, 48, 92),
        k.outline(1.5, k.rgb(56, 189, 248)),
        k.anchor("center"),
        k.fixed(),
        k.z(305),
      ])
    );

    contentElements.push(
      k.add([
        k.text(c.icon, {
          size: accessibilitySystem.scaleFont(24),
          font: "Outfit",
        }),
        k.pos(iconPillX, posY - boxH / 2 + 35),
        k.anchor("center"),
        k.fixed(),
        k.z(306),
      ])
    );

    // Título do Tópico
    const textStartX = posX - boxW / 2 + 66;
    contentElements.push(
      k.add([
        k.text(c.title, {
          size: accessibilitySystem.scaleFont(16),
          font: "Outfit",
          width: boxW - 78,
        }),
        k.pos(textStartX, posY - boxH / 2 + 14),
        k.color(110, 235, 255),
        k.anchor("topleft"),
        k.fixed(),
        k.z(305),
      ])
    );

    // Descrição Educativa
    contentElements.push(
      k.add([
        k.text(c.desc, {
          size: accessibilitySystem.scaleFont(14),
          font: "Inter",
          width: boxW - 78,
          lineSpacing: 4,
        }),
        k.pos(textStartX, posY - boxH / 2 + 42),
        k.color(225, 240, 255),
        k.anchor("topleft"),
        k.fixed(),
        k.z(305),
      ])
    );
  });
}
