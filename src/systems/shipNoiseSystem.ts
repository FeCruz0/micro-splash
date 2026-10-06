import kaboom, { type GameObj } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import type { PlayerController } from "../entities/player";
import { createFishingTrawler } from "../entities/boat";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";

export function setupShipNoiseSystem(
  k: ReturnType<typeof kaboom>,
  playerController: PlayerController
) {
  let isSystemActive = true;
  const allShipBodies: GameObj[] = [];

  // Traineiras de pesca artesanal estacionadas com redes na Costa Urbana (Fase 35.5)
  const fishingTrawlerPositions = [13800, 16200];
  fishingTrawlerPositions.forEach((positionX) => {
    const trawler = createFishingTrawler(k, positionX);
    allShipBodies.push(trawler);
  });

  const ships = [
    { minX: 12400, maxX: 14400, currentX: 13200, speed: 45, dir: 1 },
    { minX: 14700, maxX: 16700, currentX: 15500, speed: 50, dir: -1 },
    { minX: 17000, maxX: 18900, currentX: 17800, speed: 55, dir: 1 },
  ];

  ships.forEach((shipData) => {
    // Casco do Navio Cargueiro (Proporção industrial imponente: 280×50px)
    const ship = k.add([
      k.rect(280, 50, { radius: 12 }),
      k.pos(shipData.currentX, GAME_CONFIG.SEA_LEVEL),
      k.color(60, 65, 80),
      k.outline(2.5, k.rgb(180, 50, 50)),
      k.opacity(0.88),
      k.anchor("center"),
      k.z(-2),
    ]);

    allShipBodies.push(ship);

    // Linha de flutuação (faixa vermelha na metade inferior do casco)
    ship.add([k.rect(280, 14), k.pos(0, 16), k.color(160, 35, 35), k.anchor("center"), k.z(-2)]);

    // Janelas de convés (9 vigias industriais)
    for (let w = 0; w < 9; w++) {
      ship.add([
        k.rect(6, 4, { radius: 1 }),
        k.pos(-100 + w * 25, -10),
        k.color(255, 230, 120),
        k.opacity(0.9),
        k.anchor("center"),
        k.z(-2),
      ]);
    }

    // Chaminé monumental (corpo 35×45px + anel de topo escuro 42×10px)
    ship.add([k.rect(35, 45), k.pos(65, -45), k.color(180, 50, 50), k.anchor("center"), k.z(-2)]);
    ship.add([k.rect(42, 10), k.pos(65, -67), k.color(40, 40, 44), k.anchor("center"), k.z(-2)]);

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

        const ejectX = ship.pos.x - shipData.dir * 130;
        const ejectY = ship.pos.y + 24;
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
    allShipBodies.forEach((shipBody) => {
      shipBody.hidden = false;
    });
  };

  const deactivate = () => {
    isSystemActive = false;
    allShipBodies.forEach((shipBody) => {
      shipBody.hidden = true;
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
