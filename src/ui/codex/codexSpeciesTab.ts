import { accessibilitySystem } from "../../systems/accessibilitySystem";
import type { CodexTabContext } from "./codexTypes";

export function renderSpeciesTab(context: CodexTabContext): void {
  const { k, cX, cardW, contentBoxTop, contentBoxH, contentElements } = context;

  const speciesData = [
    {
      icon: "🐋",
      name: "Baleia-Jubarte",
      sci: "Megaptera novaeangliae",
      desc: "Famosa pelas longas nadadeiras peitorais e saltos acrobáticos. Migra 27.000 km da Antártica ao litoral brasileiro para reprodução.",
    },
    {
      icon: "🌊",
      name: "Orca",
      sci: "Orcinus orca",
      desc: "Maior membro dos golfinhos e predador de topo polar. Comunica-se por dialetos acústicos únicos em grupos matriarcais.",
    },
    {
      icon: "🦐",
      name: "Krill Antártico",
      sci: "Euphausia superba",
      desc: "Minúsculos crustáceos bioluminescentes base da cadeia alimentar antártica. Fornecem a biomassa vital para a migração.",
    },
    {
      icon: "🐬",
      name: "Golfinho-Rotador",
      sci: "Stenella longirostris",
      desc: "Nadam em bandos criando esteiras hidrodinâmicas (drafting), economizando até 40% de energia e fôlego em navegação.",
    },
    {
      icon: "🐧",
      name: "Pinguim-de-Magalhães",
      sci: "Spheniscus magellanicus",
      desc: "Mestres do salto em arco (porpoising), migram das colônias austrais rumo ao Brasil seguindo as correntes de nutrientes.",
    },
    {
      icon: "🐋",
      name: "Cachalote",
      sci: "Physeter macrocephalus",
      desc: "Gigante abissal com o maior cérebro do reino animal. Mergulha a mais de 2.000m nas fossas oceânicas emitindo cliques.",
    },
  ];

  const colGap = 16;
  const boxW = Math.min(460, (cardW - 64 - colGap) / 2);
  const rowGap = 12;
  const boxH = Math.min(132, (contentBoxH - 20 - rowGap * 2) / 3);
  const col0X = cX - boxW / 2 - colGap / 2;
  const col1X = cX + boxW / 2 + colGap / 2;
  const startY = contentBoxTop + 14 + boxH / 2;

  speciesData.forEach((sp, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const posX = col === 0 ? col0X : col1X;
    const posY = startY + row * (boxH + rowGap);

    // Container do Card da Espécie
    const spBox = k.add([
      k.rect(boxW, boxH, { radius: 12 }),
      k.pos(posX, posY),
      k.color(14, 34, 68),
      k.outline(1.5, k.rgb(42, 85, 145)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(304),
    ]);
    contentElements.push(spBox);

    spBox.onHoverUpdate(() => {
      spBox.color = k.rgb(18, 48, 92);
      spBox.outline = { width: 1.5, color: k.rgb(80, 200, 255) };
    });
    spBox.onHoverEnd(() => {
      spBox.color = k.rgb(14, 34, 68);
      spBox.outline = { width: 1.5, color: k.rgb(42, 85, 145) };
    });

    // Badge com Ícone à esquerda
    const iconPillX = posX - boxW / 2 + 32;
    const iconPill = k.add([
      k.rect(50, 50, { radius: 10 }),
      k.pos(iconPillX, posY),
      k.color(18, 48, 92),
      k.outline(1, k.rgb(56, 189, 248)),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ]);
    contentElements.push(iconPill);

    contentElements.push(
      k.add([
        k.text(sp.icon, {
          size: accessibilitySystem.scaleFont(26),
          font: "Inter",
        }),
        k.pos(iconPillX, posY),
        k.anchor("center"),
        k.fixed(),
        k.z(306),
      ])
    );

    // Coluna de Texto
    const textStartX = posX - boxW / 2 + 68;

    // Nome Comum
    contentElements.push(
      k.add([
        k.text(sp.name, {
          size: accessibilitySystem.scaleFont(16.5),
          font: "Outfit",
        }),
        k.pos(textStartX, posY - boxH / 2 + 10),
        k.color(110, 235, 255),
        k.anchor("topleft"),
        k.fixed(),
        k.z(305),
      ])
    );

    // Nome Científico
    contentElements.push(
      k.add([
        k.text(`(${sp.sci})`, {
          size: accessibilitySystem.scaleFont(13),
          font: "Inter",
        }),
        k.pos(textStartX, posY - boxH / 2 + 33),
        k.color(255, 215, 120),
        k.anchor("topleft"),
        k.fixed(),
        k.z(305),
      ])
    );

    // Descrição Ecológica com topleft e sem sobreposição
    contentElements.push(
      k.add([
        k.text(sp.desc, {
          size: accessibilitySystem.scaleFont(13.5),
          font: "Inter",
          width: boxW - 76,
          lineSpacing: 3.5,
        }),
        k.pos(textStartX, posY - boxH / 2 + 53),
        k.color(225, 240, 255),
        k.anchor("topleft"),
        k.fixed(),
        k.z(305),
      ])
    );
  });
}
