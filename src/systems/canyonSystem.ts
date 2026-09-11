import kaboom from "kaboom";
import { TAGS } from "../config";

export function setupCanyonSystem(k: ReturnType<typeof kaboom>) {
  // Formações rochosas e cânions na faixa de Arraial do Cabo (19.000m - 25.000m)
  const canyonFormations = [
    // Rocha do chão (Boqueirão)
    { x: 19800, y: k.height() - 40, width: 80, height: 180, fromBottom: true, title: "Paredão do Boqueirão" },
    // Rocha caindo do teto (Fenda)
    { x: 20600, y: 0, width: 90, height: 160, fromBottom: false, title: "Fenda Superior" },
    // Cânion duplo (Estreito de Arraial)
    { x: 21800, y: k.height() - 40, width: 110, height: 200, fromBottom: true, title: "Base do Cânion" },
    { x: 21850, y: 0, width: 100, height: 170, fromBottom: false, title: "Topo do Cânion" },
    // Rocha do chão em subida
    { x: 23200, y: k.height() - 40, width: 95, height: 190, fromBottom: true, title: "Laje de Pedra" },
    { x: 24300, y: 0, width: 85, height: 150, fromBottom: false, title: "Paredão Final" },
  ];

  canyonFormations.forEach((rock) => {
    const posY = rock.fromBottom ? rock.y - rock.height : rock.y;
    const anchorPt = rock.fromBottom ? "topleft" : "topleft";

    k.add([
      k.rect(rock.width, rock.height, { radius: 6 }),
      k.pos(rock.x, posY),
      k.area(),
      k.body({ isStatic: true }),
      k.color(35, 45, 55),
      k.outline(3, k.rgb(70, 85, 100)),
      k.anchor(anchorPt),
      TAGS.OBSTACLE,
      "canyon_rock",
    ]);

    // Textura estática de pedra/musgo marinho no topo/base da rocha
    k.add([
      k.rect(rock.width, 10),
      k.pos(rock.x, rock.fromBottom ? posY : posY + rock.height - 10),
      k.color(20, 70, 60),
      k.opacity(0.7),
      k.z(2),
    ]);
  });
}
