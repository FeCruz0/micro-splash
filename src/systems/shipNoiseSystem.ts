import kaboom from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import type { PlayerController } from "../entities/player";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";

export function setupShipNoiseSystem(
  k: ReturnType<typeof kaboom>,
  playerController: PlayerController
) {
  let isSystemActive = true;
  const allShipBodies: any[] = [];

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

    allShipBodies.push(ship);

    // Chaminé do Navio (adicionada como filha do navio para navegar junto)
    ship.add([k.rect(20, 25), k.pos(30, -25), k.color(180, 50, 50), k.anchor("center"), k.z(9)]);

    let noiseTimer = 0;
    let trashEjectTimer = 3.0 + Math.random() * 4.0;

    ship.onUpdate(() => {
      if (!isSystemActive) return;

      // Movimento de patrulha (ida e volta pelo setor)
      ship.pos.x += shipData.speed * shipData.dir * k.dt();
      if (ship.pos.x >= shipData.maxX) {
        shipData.dir = -1;
      } else if (ship.pos.x <= shipData.minX) {
        shipData.dir = 1;
      }

      // 1. Emissão periódica de ondas acústicas de ruído (ruído submarino)
      noiseTimer += k.dt();
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
            const downwardForce = 400 * k.dt();

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

      // 2. Descarte ativo de resíduos industriais pela esteira da popa (Fase 9.2)
      trashEjectTimer += k.dt();
      const distToPlayer = playerController.gameObj.pos.dist(ship.pos);

      if (trashEjectTimer >= 8.5 && distToPlayer < 1600) {
        trashEjectTimer = 0;

        const ejectX = ship.pos.x - shipData.dir * 65;
        const ejectY = ship.pos.y + 16;
        const trashType = Math.floor(Math.random() * 3);

        let trashItem: any;
        let sinkSpeed = 28 + Math.random() * 14;
        const swaySpeed = 1.5 + Math.random();
        const swayAmp = 10 + Math.random() * 8;
        let tAge = 0;

        if (trashType === 0) {
          // Tambor de óleo corrosivo / resíduo químico
          trashItem = k.add([
            k.rect(18, 24, { radius: 3 }),
            k.pos(ejectX, ejectY),
            k.color(150, 70, 40),
            k.outline(1.5, k.rgb(40, 20, 15)),
            k.area(),
            k.anchor("center"),
            k.z(14),
            TAGS.TRASH,
            "ship_ejected_trash",
          ]);
          trashItem.add([k.rect(18, 6), k.pos(0, 0), k.color(240, 200, 30), k.anchor("center")]);
          sinkSpeed = 36;
        } else if (trashType === 1) {
          // Engradado de madeira industrial
          trashItem = k.add([
            k.rect(22, 18, { radius: 2 }),
            k.pos(ejectX, ejectY),
            k.color(120, 85, 55),
            k.outline(1.5, k.rgb(60, 40, 25)),
            k.area(),
            k.anchor("center"),
            k.z(14),
            TAGS.TRASH,
            "ship_ejected_trash",
          ]);
          sinkSpeed = 22;
        } else {
          // Saco plástico de resíduo
          trashItem = k.add([
            k.rect(20, 15, { radius: 5 }),
            k.pos(ejectX, ejectY),
            k.color(55, 65, 75),
            k.outline(1.5, k.rgb(25, 30, 40)),
            k.area(),
            k.anchor("center"),
            k.z(14),
            TAGS.TRASH,
            "ship_ejected_trash",
          ]);
          sinkSpeed = 26;
        }

        const startX = ejectX;
        trashItem.onUpdate(() => {
          tAge += k.dt();
          trashItem.pos.y += sinkSpeed * k.dt();
          trashItem.pos.x = startX + Math.sin(tAge * swaySpeed) * swayAmp;

          // Destrói se afundar até o leito ou ficar muito para trás
          if (
            trashItem.pos.y > k.height() - 40 ||
            trashItem.pos.x < playerController.gameObj.pos.x - 1200
          ) {
            k.destroy(trashItem);
          }
        });
      }
    });
  });

  const activate = () => {
    isSystemActive = true;
    allShipBodies.forEach((s) => {
      s.hidden = false;
    });
  };

  const deactivate = () => {
    isSystemActive = false;
    allShipBodies.forEach((s) => {
      s.hidden = true;
    });
  };

  const biomeMgr = getBiomeLifecycleManager();
  if (biomeMgr) {
    biomeMgr.registerModule({
      id: "cargo_ships",
      name: "Navios Cargueiros & Ruído (Costa Urbana)",
      minX: 11200,
      maxX: 19600,
      activate,
      deactivate,
      isActive: () => isSystemActive,
    });
  }

  return {
    activate,
    deactivate,
    isActive: () => isSystemActive,
  };
}
