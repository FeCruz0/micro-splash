import type { CodexTabContext } from "./codexTypes";
import { getCodexBiomeInfo } from "./codexUtils";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import { audioSystem } from "../../systems/audioSystem";
import factsData from "../../../data/facts.json";

export function renderRouteTab(
  context: CodexTabContext,
  routePage: number,
  unlockedFactIds: string[],
  onPageChange: (newPage: number) => void
): void {
  const { k, cX, cardW, contentBoxTop, contentBoxBottom, contentElements, dynamicFocusItems } =
    context;

  const pageSize = 4;
  const totalPages = Math.ceil(factsData.length / pageSize);
  const startIndex = routePage * pageSize;
  const currentFacts = factsData.slice(startIndex, startIndex + pageSize);
  const countUnlocked = factsData.filter((f) => unlockedFactIds.includes(f.id)).length;

  // Estatísticas de Descobertas por Bioma (Fase 34.7)
  const biomes = [
    { name: "Antártica", emoji: "❄️", maxDist: 5000, minDist: 0 },
    { name: "Travessia", emoji: "🌊", maxDist: 12000, minDist: 5000 },
    { name: "Urbana", emoji: "🏭", maxDist: 19000, minDist: 12000 },
    { name: "Cânions", emoji: "🌀", maxDist: 25000, minDist: 19000 },
    { name: "Santuário", emoji: "☀️", maxDist: 30000, minDist: 25000 },
  ];

  const biomeChipsText = biomes
    .map((b) => {
      const inBiome = factsData.filter((f) => f.triggerX >= b.minDist && f.triggerX < b.maxDist);
      const unlocked = inBiome.filter((f) => unlockedFactIds.includes(f.id)).length;
      return `${b.emoji} ${b.name}: ${unlocked}/${inBiome.length}`;
    })
    .join("   •   ");

  // Cabeçalho de Status da Rota
  contentElements.push(
    k.add([
      k.text(
        `🗺️ Descobertas na Rota: ${countUnlocked} de ${factsData.length} desbloqueadas (${Math.round((countUnlocked / factsData.length) * 100)}%)  •  Página ${routePage + 1} de ${totalPages}`,
        {
          size: accessibilitySystem.scaleFont(15),
          font: "Outfit",
        }
      ),
      k.pos(cX, contentBoxTop + 14),
      k.color(255, 220, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(304),
    ])
  );

  // Linha de Progresso por Bioma (Fase 34.7)
  contentElements.push(
    k.add([
      k.text(biomeChipsText, {
        size: accessibilitySystem.scaleFont(12.5),
        font: "Inter",
      }),
      k.pos(cX, contentBoxTop + 33),
      k.color(175, 225, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(304),
    ])
  );

  // Barra Horizontal de Progresso da Rota Completa (0 a 30.000m) com Marcadores
  const barW = cardW - 72;
  const barY = contentBoxTop + 48;

  contentElements.push(
    k.add([
      k.rect(barW, 6, { radius: 3 }),
      k.pos(cX, barY),
      k.color(16, 38, 72),
      k.outline(1, k.rgb(35, 70, 120)),
      k.anchor("center"),
      k.fixed(),
      k.z(304),
    ])
  );

  const fillW = Math.max(6, (barW * countUnlocked) / Math.max(1, factsData.length));
  contentElements.push(
    k.add([
      k.rect(fillW, 6, { radius: 3 }),
      k.pos(cX - barW / 2 + fillW / 2, barY),
      k.color(56, 189, 248),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ])
  );

  // Marcadores pontuais de cada fato na rota
  factsData.forEach((f) => {
    const norm = Math.min(1, Math.max(0, f.triggerX / 30000));
    const dotX = cX - barW / 2 + norm * barW;
    const isUnl = unlockedFactIds.includes(f.id);

    contentElements.push(
      k.add([
        k.circle(isUnl ? 3.5 : 2.5),
        k.pos(dotX, barY),
        k.color(isUnl ? k.rgb(250, 204, 21) : k.rgb(70, 95, 135)),
        k.anchor("center"),
        k.fixed(),
        k.z(306),
      ])
    );
  });

  const factBoxW = cardW - 64;
  const factBoxH = 78;
  const factGap = 10;
  const factStartY = contentBoxTop + 64 + factBoxH / 2;

  currentFacts.forEach((fact, i) => {
    const isUnlocked = unlockedFactIds.includes(fact.id);
    const bInfo = getCodexBiomeInfo(fact.triggerX);
    const itemY = factStartY + i * (factBoxH + factGap);

    const fBox = k.add([
      k.rect(factBoxW, factBoxH, { radius: 10 }),
      k.pos(cX, itemY),
      k.color(14, 34, 68),
      k.outline(1.5, isUnlocked ? k.rgb(35, 100, 80) : k.rgb(38, 65, 100)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(304),
    ]);
    contentElements.push(fBox);

    fBox.onHoverUpdate(() => {
      fBox.color = k.rgb(18, 45, 88);
      fBox.outline = {
        width: 1.5,
        color: isUnlocked ? k.rgb(52, 211, 153) : k.rgb(80, 200, 255),
      };
    });
    fBox.onHoverEnd(() => {
      fBox.color = k.rgb(14, 34, 68);
      fBox.outline = {
        width: 1.5,
        color: isUnlocked ? k.rgb(35, 100, 80) : k.rgb(38, 65, 100),
      };
    });

    // Badge de Status com Emoji do Bioma (Fase 34.7)
    const badgeX = cX - factBoxW / 2 + 32;
    contentElements.push(
      k.add([
        k.rect(46, 46, { radius: 8 }),
        k.pos(badgeX, itemY),
        k.color(isUnlocked ? k.rgb(16, 50, 40) : k.rgb(20, 32, 52)),
        k.outline(1, isUnlocked ? k.rgb(52, 211, 153) : k.rgb(75, 95, 125)),
        k.anchor("center"),
        k.fixed(),
        k.z(305),
      ])
    );

    contentElements.push(
      k.add([
        k.text(isUnlocked ? `${bInfo.emoji}` : "🔒", {
          size: accessibilitySystem.scaleFont(20),
          font: "Outfit",
        }),
        k.pos(badgeX, itemY),
        k.anchor("center"),
        k.fixed(),
        k.z(306),
      ])
    );

    // Título e Localização com identificador do bioma
    const textStartX = cX - factBoxW / 2 + 66;
    contentElements.push(
      k.add([
        k.text(`${bInfo.emoji} ${fact.title} • [${fact.location}]`, {
          size: accessibilitySystem.scaleFont(15.5),
          font: "Outfit",
        }),
        k.pos(textStartX, itemY - factBoxH / 2 + 10),
        k.color(isUnlocked ? k.rgb(255, 225, 110) : k.rgb(160, 175, 200)),
        k.anchor("topleft"),
        k.fixed(),
        k.z(305),
      ])
    );

    // Descrição do Fato Ecológico
    contentElements.push(
      k.add([
        k.text(
          isUnlocked
            ? fact.description
            : "Navegue pela rota migratória na expedição para desbloquear esta descoberta ecológica!",
          {
            size: accessibilitySystem.scaleFont(14),
            font: "Inter",
            width: factBoxW - 84,
            lineSpacing: 3.5,
          }
        ),
        k.pos(textStartX, itemY - factBoxH / 2 + 36),
        k.color(isUnlocked ? k.rgb(225, 240, 255) : k.rgb(145, 165, 190)),
        k.anchor("topleft"),
        k.fixed(),
        k.z(305),
      ])
    );
  });

  // Controles de Paginação no Rodapé da Caixa
  const pagY = contentBoxBottom - 24;

  if (routePage > 0) {
    const btnPrevPos = k.vec2(cX - 95, pagY);
    const btnPrev = k.add([
      k.rect(140, 38, { radius: 8 }),
      k.pos(btnPrevPos),
      k.color(20, 50, 95),
      k.outline(1.5, k.rgb(100, 200, 255)),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(305),
    ]);
    contentElements.push(btnPrev);

    contentElements.push(
      k.add([
        k.text("◀ Anterior", {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Outfit",
        }),
        k.pos(btnPrevPos),
        k.color(255, 255, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(306),
      ])
    );

    btnPrev.onHoverUpdate(() => {
      btnPrev.color = k.rgb(28, 70, 130);
      btnPrev.scale = k.vec2(1.03, 1.03);
    });
    btnPrev.onHoverEnd(() => {
      btnPrev.color = k.rgb(20, 50, 95);
      btnPrev.scale = k.vec2(1, 1);
    });

    btnPrev.onClick(() => {
      audioSystem.playUiClick();
      onPageChange(routePage - 1);
    });

    dynamicFocusItems.push({
      pos: btnPrevPos,
      width: 140,
      height: 38,
      onActivate: () => {
        audioSystem.playUiClick();
        onPageChange(routePage - 1);
      },
    });
  }

  if (routePage < totalPages - 1) {
    const btnNextPos = k.vec2(cX + 95, pagY);
    const btnNext = k.add([
      k.rect(140, 38, { radius: 8 }),
      k.pos(btnNextPos),
      k.color(20, 50, 95),
      k.outline(1.5, k.rgb(100, 200, 255)),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(305),
    ]);
    contentElements.push(btnNext);

    contentElements.push(
      k.add([
        k.text("Próxima ▶", {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Outfit",
        }),
        k.pos(btnNextPos),
        k.color(255, 255, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(306),
      ])
    );

    btnNext.onHoverUpdate(() => {
      btnNext.color = k.rgb(28, 70, 130);
      btnNext.scale = k.vec2(1.03, 1.03);
    });
    btnNext.onHoverEnd(() => {
      btnNext.color = k.rgb(20, 50, 95);
      btnNext.scale = k.vec2(1, 1);
    });

    btnNext.onClick(() => {
      audioSystem.playUiClick();
      onPageChange(routePage + 1);
    });

    dynamicFocusItems.push({
      pos: btnNextPos,
      width: 140,
      height: 36,
      onActivate: () => {
        audioSystem.playUiClick();
        onPageChange(routePage + 1);
      },
    });
  }
}
