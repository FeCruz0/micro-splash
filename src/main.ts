import kaboom from "kaboom";
import { GAME_CONFIG } from "./config";
import { createPlayer } from "./entities/player";
import { createTrash } from "./entities/trash";
import { createKrill } from "./entities/krill";
import { createRescueBoat } from "./entities/boat";
import { setupCollisions } from "./systems/collisions";
import { createGameState } from "./systems/state";
import { showRescueScreen } from "./ui/rescueScreen";

const k = kaboom({
  background: [10, 25, 60],
});

k.loadSprite("baleia", "https://kaboomjs.com/sprites/bean.png");

// Define a cena do jogo principal
k.scene("game", () => {
  k.setGravity(GAME_CONFIG.GRAVITY);

  // Limites do mar
  const chao = k.add([
    k.rect(k.width(), 40),
    k.pos(0, k.height() - 40),
    k.area(),
    k.body({ isStatic: true }),
    k.color(20, 50, 120),
  ]);

  const teto = k.add([
    k.rect(k.width(), 40),
    k.pos(0, 0),
    k.area(),
    k.body({ isStatic: true }),
    k.color(20, 50, 120),
  ]);

  // 1. Instancia Estado e Jogador
  const gameState = createGameState();
  const playerController = createPlayer(k);

  // 2. Instancia objetos no caminho
  createTrash(k, k.vec2(500, 250));
  createTrash(k, k.vec2(800, 300));
  createTrash(k, k.vec2(1200, 200));

  createKrill(k, k.vec2(650, 180));
  createKrill(k, k.vec2(1000, 220));
  createKrill(k, k.vec2(1400, 160));

  // 3. Ativa colisões
  setupCollisions(k, playerController, gameState);

  let isRescueSequenceStarted = false;

  // 4. Loop Principal
  k.onUpdate(() => {
    const currentX = playerController.gameObj.pos.x;
    
    // Se a baleia não desmaiou, atualiza distância normalmente
    if (!playerController.isFainting()) {
      gameState.update(k.dt(), currentX);
    } else if (!isRescueSequenceStarted) {
      // SE A BALEIA DESMAIOU: Inicia a sequência de resgate da Guarda Marítima!
      isRescueSequenceStarted = true;

      // Spawna o barco da Guarda Marítima na superfície acima da baleia
      createRescueBoat(k, playerController.gameObj.pos);

      // Espera 3.5 segundos (tempo do barco chegar) e exibe o relatório
      k.wait(3.5, () => {
        showRescueScreen(k, gameState, () => {
          k.go("game"); // Reinicia a cena limpa!
        });
      });
    }

    chao.pos.x = k.camPos().x - k.width() / 2;
    teto.pos.x = k.camPos().x - k.width() / 2;
  });
});

// Inicia a cena do jogo
k.go("game");
