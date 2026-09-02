import type { KaboomCtx, Vec2 } from "kaboom";

export function createRescueBoat(k: KaboomCtx, targetPos: Vec2) {
  // Barco da Guarda Marítima flutuando no teto
  const boat = k.add([
    k.rect(90, 30, { radius: 4 }),
    k.pos(targetPos.x - 300, 20), // Começa um pouco atrás na superfície
    k.color(240, 240, 240),      // Barco branco
    k.outline(3, k.rgb(220, 50, 50)), // Listra vermelha da Guarda Marítima
    k.anchor("botleft"),
    k.z(50),
  ]);

  // Cabine do barco
  boat.add([
    k.rect(30, 20),
    k.pos(20, -30),
    k.color(200, 200, 220),
    k.outline(2, k.rgb(50, 50, 50)),
  ]);

  // Luz do sinalizador piscando (Vermelho/Azul da guarda)
  const beacon = boat.add([
    k.circle(6),
    k.pos(35, -55),
    k.color(255, 0, 0),
  ]);

  let time = 0;
  // Animação: O barco navega até ficar acima da baleia desmaiada
  boat.onUpdate(() => {
    time += k.dt();
    beacon.color = Math.floor(time * 6) % 2 === 0 ? k.rgb(255, 50, 50) : k.rgb(50, 150, 255);

    // Desloca o barco até o topo da baleia
    const targetX = targetPos.x - 45;
    if (boat.pos.x < targetX) {
      boat.pos.x += k.dt() * 120;
    }
  });

  return boat;
}
