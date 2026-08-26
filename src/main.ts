import kaboom from "kaboom";
import { GAME_CONFIG } from "./config";
import { createPlayer } from "./entities/player";
import { createTrash } from "./entities/trash";
import { setupCollisions } from "./systems/collisions";

const k = kaboom({
  background: [10, 25, 60],
});

k.loadSprite("baleia", "https://kaboomjs.com/sprites/bean.png");
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

// 1. Instancia o Jogador
const playerController = createPlayer(k);

// 2. Instancia alguns lixos plásticos no caminho
createTrash(k, k.vec2(500, 250));
createTrash(k, k.vec2(800, 300));
createTrash(k, k.vec2(1200, 200));

// 3. Ativa o sistema de colisões
setupCollisions(k, playerController);

k.onUpdate(() => {
  chao.pos.x = k.camPos().x - k.width() / 2;
  teto.pos.x = k.camPos().x - k.width() / 2;
});
