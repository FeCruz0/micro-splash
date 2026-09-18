import kaboom from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";

export function setupCanyonSystem(k: ReturnType<typeof kaboom>) {
  // Formações rochosas e cânions em Arraial do Cabo (19.000m - 29.500m)
  // Inicialmente invisíveis nas profundezas escuras, reveladas pelo Biosonar da jubarte
  const canyonFormations = [
    // Rocha do chão (Boqueirão - 19.800m)
    { x: 19800, y: k.height() - 40, width: 80, height: 180, fromBottom: true, title: "Paredão do Boqueirão" },
    // Rocha caindo do teto (Fenda - 20.600m)
    { x: 20600, y: 0, width: 90, height: 160, fromBottom: false, title: "Fenda Superior" },
    // Cânion duplo (Estreito de Arraial - 21.800m)
    { x: 21800, y: k.height() - 40, width: 110, height: 200, fromBottom: true, title: "Base do Cânion" },
    { x: 21850, y: 0, width: 100, height: 170, fromBottom: false, title: "Topo do Cânion" },
    // Rocha do chão em subida (23.200m)
    { x: 23200, y: k.height() - 40, width: 95, height: 190, fromBottom: true, title: "Laje de Pedra" },
    // Paredão de transição (24.300m)
    { x: 24300, y: 0, width: 85, height: 150, fromBottom: false, title: "Paredão da Fenda" },
    // Arrecife do Berçário (26.200m - Escolho Submerso)
    { x: 26200, y: k.height() - 40, width: 90, height: 175, fromBottom: true, title: "Arrecife do Berçário" },
    // Fenda Teto do Berçário (27.400m - Passagem Estreita)
    { x: 27400, y: 0, width: 95, height: 155, fromBottom: false, title: "Fenda da Enseada" },
    // Pilar de Pedra (28.500m - Desafio Final antes da Chegada)
    { x: 28500, y: k.height() - 40, width: 105, height: 190, fromBottom: true, title: "Pilar de Pedra" },
  ];

  canyonFormations.forEach((rock) => {
    const posY = rock.fromBottom ? rock.y - rock.height : rock.y;
    const anchorPt = "topleft";

    let revealTimer = 0;

    // Rocha física invisível até ser revelada por sonar
    const rockObj = k.add([
      k.rect(rock.width, rock.height, { radius: 6 }),
      k.pos(rock.x, posY),
      k.area(),
      k.body({ isStatic: true }),
      k.color(28, 38, 50),
      k.outline(3, k.rgb(0, 240, 255)),
      k.opacity(0), // Invisível por padrão
      k.anchor(anchorPt),
      TAGS.OBSTACLE,
      "canyon_rock",
      {
        reveal() {
          revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
        },
      },
    ]);

    // Textura de pedra/musgo marinho no topo/base da rocha (invisível por padrão)
    const mossObj = k.add([
      k.rect(rock.width, 10),
      k.pos(rock.x, rock.fromBottom ? posY : posY + rock.height - 10),
      k.color(20, 80, 70),
      k.opacity(0), // Invisível por padrão
      k.z(2),
    ]);

    rockObj.onUpdate(() => {
      if (revealTimer > 0) {
        revealTimer -= k.dt();
        const t = Math.min(1, revealTimer / 1.5);
        rockObj.opacity = k.lerp(0, 0.95, t);
        mossObj.opacity = k.lerp(0, 0.75, t);
        rockObj.outline.color = k.rgb(
          k.lerp(30, 0, t),
          k.lerp(120, 240, t),
          k.lerp(180, 255, t)
        );
        rockObj.outline.width = k.lerp(2, 4, t);
      } else {
        rockObj.opacity = 0;
        mossObj.opacity = 0;
      }
    });
  });
}

