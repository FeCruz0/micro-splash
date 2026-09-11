import kaboom from "kaboom";
import { GAME_CONFIG } from "../config";

export function setupShipNoiseSystem(k: ReturnType<typeof kaboom>, playerController: any) {
  const ships = [
    { minX: 12400, maxX: 14400, currentX: 13200, speed: 45, dir: 1 },
    { minX: 14700, maxX: 16700, currentX: 15500, speed: 50, dir: -1 },
    { minX: 17000, maxX: 18900, currentX: 17800, speed: 55, dir: 1 },
  ];

  ships.forEach((shipData) => {
    // Casco do Navio Cargueiro
    const ship = k.add([
      k.rect(140, 30, { radius: 8 }),
      k.pos(shipData.currentX, GAME_CONFIG.SEA_LEVEL),
      k.color(60, 65, 80),
      k.outline(2, k.rgb(180, 50, 50)),
      k.anchor("center"),
      k.z(10),
    ]);

    // Chaminé do Navio (adicionada como filha do navio para navegar junto)
    ship.add([
      k.rect(20, 25),
      k.pos(30, -25),
      k.color(180, 50, 50),
      k.anchor("center"),
      k.z(9),
    ]);

    let noiseTimer = 0;

    ship.onUpdate(() => {
      // Movimento de patrulha (ida e volta pelo setor)
      ship.pos.x += shipData.speed * shipData.dir * k.dt();
      if (ship.pos.x >= shipData.maxX) {
        shipData.dir = -1;
      } else if (ship.pos.x <= shipData.minX) {
        shipData.dir = 1;
      }

      noiseTimer += k.dt();

      // A cada 2.5 segundos, o navio emite uma onda de ruído sonoro vermelho/alaranjado
      if (noiseTimer >= 2.5) {
        noiseTimer = 0;

        const noiseRing = k.add([
          k.circle(20),
          k.pos(ship.pos.x, ship.pos.y + 20),
          k.color(255, 80, 50),
          k.opacity(0.6),
          k.anchor("center"),
          k.z(8),
          "noise_ring",
        ]);

        let ringRadius = 20;

        noiseRing.onUpdate(() => {
          ringRadius += k.dt() * 120;
          noiseRing.radius = ringRadius;
          noiseRing.opacity -= k.dt() * 0.25;

          // Se a baleia estiver dentro do raio da onda de ruído, causa desorientação e a empurra para o fundo
          const distToPlayer = noiseRing.pos.dist(playerController.gameObj.pos);
          if (distToPlayer <= ringRadius && noiseRing.opacity > 0.2) {
            k.shake(1.5);
            const speed = playerController.getSpeed();
            const downwardForce = 400 * k.dt(); // Força acústica contínua empurrando a baleia para o fundo

            playerController.setSpeed(
              k.vec2(
                speed.x + (Math.random() * 20 - 10),
                k.clamp(speed.y + downwardForce, -300, 300)
              )
            );
          }

          if (noiseRing.opacity <= 0) {
            k.destroy(noiseRing);
          }
        });
      }
    });
  });
}
