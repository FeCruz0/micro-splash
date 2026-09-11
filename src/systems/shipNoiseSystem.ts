import kaboom from "kaboom";

export function setupShipNoiseSystem(k: ReturnType<typeof kaboom>, playerController: any) {
  const shipPositions = [
    { x: 13200, y: 35 },
    { x: 15500, y: 35 },
    { x: 17800, y: 35 },
  ];

  shipPositions.forEach((pos) => {
    // Casco do Navio Cargueiro
    const ship = k.add([
      k.rect(140, 30, { radius: 8 }),
      k.pos(pos.x, pos.y),
      k.color(60, 65, 80),
      k.outline(2, k.rgb(180, 50, 50)),
      k.anchor("center"),
      k.z(10),
    ]);

    // Chaminé do Navio
    k.add([
      k.rect(20, 25),
      k.pos(pos.x + 30, pos.y - 25),
      k.color(180, 50, 50),
      k.anchor("center"),
      k.z(9),
    ]);

    let noiseTimer = 0;

    ship.onUpdate(() => {
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
