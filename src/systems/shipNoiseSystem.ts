import { GAME_CONFIG, TAGS } from "../config";
import type { PlayerController } from "../entities/player";
import { createFishingTrawler } from "../entities/boat";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";
import { audioSystem } from "./audioSystem";
import { safeShake } from "../utils/camera";
import { getRandomFloat, getRandomInteger } from "../utils/random";
import { getSpatialCullingManager, type CullableTargetObject } from "./spatialCullingSystem";
import { getSpatialGrid } from "./spatialHashGrid";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";
import type { IRenderEngine, ISpriteNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import { getParticlePool } from "./particlePool";
import { getEntityFamilyTicker } from "./entityFamilyTicker";

function resolveCameraX(engineOrContext: unknown): number {
  if (
    engineOrContext &&
    typeof engineOrContext === "object" &&
    "getCamera" in engineOrContext &&
    typeof (engineOrContext as { getCamera: () => { getPosition: () => { x: number } } })
      .getCamera === "function"
  ) {
    return (engineOrContext as { getCamera: () => { getPosition: () => { x: number } } })
      .getCamera()
      .getPosition().x;
  }
  if (
    engineOrContext &&
    typeof engineOrContext === "object" &&
    "camPos" in engineOrContext &&
    typeof (engineOrContext as { camPos: () => { x: number } }).camPos === "function"
  ) {
    return (engineOrContext as { camPos: () => { x: number } }).camPos().x;
  }
  return 0;
}

export interface ShipVector2D {
  x: number;
  y: number;
}

export interface ShipGameObject<TColor = unknown> {
  pos: ShipVector2D;
  hidden?: boolean;
  opacity?: number;
  radius?: number;
  add: (components: unknown[]) => ShipGameObject<TColor>;
  onUpdate: (cb: () => void) => void;
}

export interface ShipNoiseEngineContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = ShipVector2D,
> {
  add: (components: unknown[]) => unknown;
  destroy: (obj: TDestroyable) => void;
  dt: () => number;
  width?: () => number;
  height: () => number;
  rect: (w: number, h: number, opt?: { radius?: number }) => unknown;
  circle: (r: number) => unknown;
  pos: (x: number, y: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  opacity: (o: number) => unknown;
  outline: (w: number, col: TColor) => unknown;
  rotate: (angle: number) => unknown;
  area: () => unknown;
  anchor: (a: "center" | "bot" | "topleft" | "botleft") => unknown;
  z: (v: number) => unknown;
  rand: (min: number, max: number) => number;
  rgb: (r: number, g: number, b: number) => TColor;
  vec2: (x: number, y: number) => TVec;
  clamp: (val: number, min: number, max: number) => number;
  shake?: (amount: number) => void;
}

export function setupShipNoiseSystem<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = ShipVector2D,
>(k: ShipNoiseEngineContext<TDestroyable, TColor, TVec>, playerController: PlayerController) {
  let isSystemActive = true;
  const allShipBodies: { pos: { x: number; y: number }; hidden?: boolean }[] = [];
  const cullingManager = getSpatialCullingManager();
  const spatialGrid = getSpatialGrid();
  const isEngine = isRenderEngine(k);
  const engineContext = isEngine ? (k as unknown as IRenderEngine) : null;

  // Pre-bake de texturas de navio cargueiro e anel de ruído exclusivamente no carregamento (SKILL.md / Seção 3)
  let bakedCargoShipTexture: unknown = null;
  let bakedNoiseRingTexture: unknown = null;
  const pooledNoiseRings: Array<{
    sprite: ISpriteNode;
    active: boolean;
    scale: number;
    opacity: number;
    x: number;
    y: number;
  }> = [];

  if (
    engineContext &&
    typeof engineContext.generateTexture === "function" &&
    typeof engineContext.createGraphics === "function" &&
    typeof engineContext.createSprite === "function"
  ) {
    try {
      const tempShip = engineContext.createGraphics("cargo_ship_bake");
      tempShip.drawRoundedRect(-140, -25, 280, 50, 12, {
        fill: { color: [60, 65, 80], alpha: 0.95 },
      });
      tempShip.drawRect(-140, 6, 280, 14, { fill: { color: [160, 35, 35], alpha: 1 } });
      for (let w = 0; w < 9; w++) {
        tempShip.drawRoundedRect(-100 + w * 25 - 3, -12, 6, 4, 1, {
          fill: { color: [255, 230, 120], alpha: 0.9 },
        });
      }
      tempShip.drawRect(65 - 17.5, -45 - 22.5, 35, 45, {
        fill: { color: [180, 50, 50], alpha: 1 },
      });
      tempShip.drawRect(65 - 21, -67 - 5, 42, 10, { fill: { color: [40, 40, 44], alpha: 1 } });
      tempShip.drawRoundedRect(-85, -40, 32, 15, 2, { fill: { color: [45, 95, 155], alpha: 1 } });
      tempShip.drawRoundedRect(-50, -44, 36, 19, 2, { fill: { color: [195, 75, 45], alpha: 1 } });
      tempShip.drawRoundedRect(-10, -38, 30, 13, 2, { fill: { color: [40, 140, 120], alpha: 1 } });

      bakedCargoShipTexture = engineContext.generateTexture(tempShip, {
        resolution: 0.5,
        scaleMode: "nearest",
      });
      tempShip.destroy();

      const tempRing = engineContext.createGraphics("noise_ring_bake");
      tempRing.drawCircle(0, 0, 32, { fill: { color: [255, 80, 50], alpha: 0.8 } });
      bakedNoiseRingTexture = engineContext.generateTexture(tempRing, {
        resolution: 0.5,
        scaleMode: "nearest",
      });
      tempRing.destroy();

      if (bakedNoiseRingTexture) {
        for (let r = 0; r < 8; r++) {
          const spr = engineContext.createSprite(bakedNoiseRingTexture, "pooled_noise_ring");
          spr.setAnchor(0.5, 0.5);
          spr.setVisible(false);
          spr.setOpacity(0);
          spr.setZIndex(8);
          engineContext.getStageRoot().addChild(spr);
          pooledNoiseRings.push({
            sprite: spr,
            active: false,
            scale: 0.2,
            opacity: 0,
            x: -9999,
            y: -9999,
          });
        }
      }
    } catch {
      bakedCargoShipTexture = null;
      bakedNoiseRingTexture = null;
    }
  }

  // Traineiras de pesca artesanal estacionadas com redes na Costa Urbana (Fase 35.5)
  const fishingTrawlerPositions = [13800, 16200];
  fishingTrawlerPositions.forEach((positionX) => {
    const trawler = createFishingTrawler(k, positionX);
    allShipBodies.push(trawler);
    cullingManager?.registerEntity(trawler as unknown as CullableTargetObject, () => positionX);
    if (spatialGrid) {
      spatialGrid.insert(`trawler_${positionX}`, trawler, {
        minX: positionX - 30,
        minY: GAME_CONFIG.SEA_LEVEL,
        maxX: positionX + 30,
        maxY: GAME_CONFIG.SEA_LEVEL + 25,
      });
    }
  });

  const ships = [
    { minX: 12400, maxX: 14400, initialXPosition: 13200, speed: 45, movementDirection: 1 },
    { minX: 14700, maxX: 16700, initialXPosition: 15500, speed: 50, movementDirection: -1 },
    { minX: 17000, maxX: 18900, initialXPosition: 17800, speed: 55, movementDirection: 1 },
  ];

  ships.forEach((shipData) => {
    // Casco do Navio Cargueiro (Proporção industrial imponente: 280×50px)
    const shipComponents: unknown[] = [
      k.rect(280, 50, { radius: 12 }),
      k.pos(shipData.initialXPosition, GAME_CONFIG.SEA_LEVEL),
      k.color(60, 65, 80),
      k.opacity(0.88),
      k.anchor("center"),
      k.z(-2),
    ];
    if (k.outline) {
      shipComponents.push(k.outline(2.5, k.rgb(180, 50, 50)));
    }

    const ship = k.add(shipComponents) as ShipGameObject<TColor>;

    allShipBodies.push(ship);
    cullingManager?.registerEntity(ship as unknown as CullableTargetObject, () => ship.pos.x);
    if (spatialGrid) {
      spatialGrid.insert(`ship_${shipData.initialXPosition}`, ship, {
        minX: shipData.initialXPosition - 140,
        minY: GAME_CONFIG.SEA_LEVEL - 25,
        maxX: shipData.initialXPosition + 140,
        maxY: GAME_CONFIG.SEA_LEVEL + 25,
      });
    }

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
    let trashEjectTimer = getRandomFloat(3.0, 7.0);

    const familyTicker = getEntityFamilyTicker();
    const updateCargoShip = (deltaTime: number) => {
      if (!isSystemActive) return;

      // Movimento de patrulha (ida e volta pelo setor)
      ship.pos.x += shipData.speed * shipData.movementDirection * deltaTime;
      if (ship.pos.x >= shipData.maxX) {
        shipData.movementDirection = -1;
      } else if (ship.pos.x <= shipData.minX) {
        shipData.movementDirection = 1;
      }

      // Culling Lógico por Distância da Câmera (Active Simulation Window: camX - screenWidth - 600 .. camX + screenWidth + 600)
      const camX = resolveCameraX(k);
      const screenWidth = typeof k.width === "function" ? k.width() : 1280;
      const minActiveX = camX - screenWidth - 600;
      const maxActiveX = camX + screenWidth + 600;
      const shipWidth = 320; // Margem segura cobrindo casco e esteira

      const isVisible =
        ship.pos.x + shipWidth >= minActiveX && ship.pos.x - shipWidth <= maxActiveX;

      if (!isVisible) {
        ship.hidden = true;
        return;
      }
      ship.hidden = false;

      if (spatialGrid) {
        spatialGrid.update(`ship_${shipData.initialXPosition}`, {
          minX: ship.pos.x - 140,
          minY: ship.pos.y - 25,
          maxX: ship.pos.x + 140,
          maxY: ship.pos.y + 25,
        });
      }

      // 1. Emissão periódica de ondas acústicas de ruído (ruído submarino)
      noiseTimer += deltaTime;
      if (noiseTimer >= 2.5) {
        noiseTimer = 0;

        const distToPlayer = Math.abs(ship.pos.x - playerController.gameObj.pos.x);
        if (distToPlayer <= 1400) {
          audioSystem.playShipHorn(ship.pos.x, playerController.gameObj.pos.x);

          // Animação de onda acústica via Sprite em pool pre-baked (SKILL.md / Seção 3)
          if (pooledNoiseRings.length > 0) {
            const availableRing = pooledNoiseRings.find((r) => !r.active);
            if (availableRing) {
              availableRing.active = true;
              availableRing.scale = 0.25;
              availableRing.opacity = 0.65;
              availableRing.x = ship.pos.x;
              availableRing.y = ship.pos.y + 20;
              availableRing.sprite.setPosition(availableRing.x, availableRing.y);
              availableRing.sprite.setScale(0.25, 0.25);
              availableRing.sprite.setOpacity(0.65);
              availableRing.sprite.setVisible(true);
            }
          } else {
            const particlePool = getParticlePool();
            if (particlePool) {
              particlePool.spawnCircle({
                pos: { x: ship.pos.x, y: ship.pos.y + 20 },
                radius: 20,
                color:
                  typeof k.rgb === "function" ? k.rgb(255, 80, 50) : { r: 255, g: 80, b: 50 },
                opacity: 0.6,
                growthRate: 120,
                fadeRate: 0.25,
                maxLife: 2.5,
                z: 8,
              });
            } else {
              const noiseRing = k.add([
                k.circle(20),
                k.pos(ship.pos.x, ship.pos.y + 20),
                k.color(255, 80, 50),
                k.opacity(0.6),
                k.anchor("center"),
                k.z(8),
                "noise_ring",
              ]) as ShipGameObject<TColor>;

              let ringRadius = 20;

              noiseRing.onUpdate(() => {
                ringRadius += k.dt() * 120;
                noiseRing.radius = ringRadius;
                if (noiseRing.opacity !== undefined) {
                  noiseRing.opacity -= k.dt() * 0.25;

                  const playerP = playerController.gameObj.pos;
                  const dist = Math.hypot(noiseRing.pos.x - playerP.x, noiseRing.pos.y - playerP.y);
                  if (dist <= ringRadius && noiseRing.opacity > 0.2) {
                    safeShake(k, 1.5);
                    const speed = playerController.getSpeed();
                    const downwardForce = 400 * k.dt();

                    playerController.setSpeed(
                      k.vec2(
                        speed.x + getRandomFloat(-10, 10),
                        k.clamp(speed.y + downwardForce, -300, 300)
                      ) as unknown as Parameters<PlayerController["setSpeed"]>[0]
                    );
                  }

                  if (noiseRing.opacity <= 0) {
                    k.destroy(noiseRing as unknown as TDestroyable);
                  }
                }
              });
            }
          }
        }
      }

      // Atualização dos anéis de ruído acústico no pool de sprites (sem redraw de geometria)
      const totalRings = pooledNoiseRings.length;
      for (let r = 0; r < totalRings; r++) {
        const ring = pooledNoiseRings[r];
        if (!ring.active) continue;

        ring.scale += deltaTime * 3.5;
        ring.opacity -= deltaTime * 0.25;
        ring.sprite.setScale(ring.scale, ring.scale);
        ring.sprite.setOpacity(Math.max(0, ring.opacity));

        const effectiveRadius = ring.scale * 32;
        const playerPos = playerController.gameObj.pos;
        const dist = Math.hypot(ring.x - playerPos.x, ring.y - playerPos.y);

        if (dist <= effectiveRadius && ring.opacity > 0.2) {
          safeShake(k, 1.5);
          const speed = playerController.getSpeed();
          const downwardForce = 400 * deltaTime;
          playerController.setSpeed(
            k.vec2(
              speed.x + getRandomFloat(-10, 10),
              k.clamp(speed.y + downwardForce, -300, 300)
            ) as unknown as Parameters<PlayerController["setSpeed"]>[0]
          );
        }

        if (ring.opacity <= 0) {
          ring.active = false;
          ring.sprite.setVisible(false);
        }
      }

      // 2. Descarte ativo de resíduos industriais pela esteira da popa (Fase 9.2)
      trashEjectTimer += deltaTime;
      const playerPos = playerController.gameObj.pos;
      const distToPlayer = Math.hypot(playerPos.x - ship.pos.x, playerPos.y - ship.pos.y);

      if (trashEjectTimer >= 8.5 && distToPlayer < 1600) {
        trashEjectTimer = 0;

        const ejectX = ship.pos.x - shipData.movementDirection * 130;
        const ejectY = ship.pos.y + 24;
        const trashType = getRandomInteger(0, 2);

        let trashItem: ShipGameObject<TColor>;
        let sinkSpeed = getRandomFloat(28, 42);
        const swaySpeed = getRandomFloat(1.5, 2.5);
        const swayAmp = getRandomFloat(10, 18);
        let trashAgeInSeconds = 0;

        if (trashType === 0) {
          // Tambor de óleo corrosivo / resíduo químico
          const trashComponents: unknown[] = [
            k.rect(18, 24, { radius: 3 }),
            k.pos(ejectX, ejectY),
            k.color(150, 70, 40),
            k.area(),
            k.anchor("center"),
            k.z(14),
            TAGS.TRASH,
            "ship_ejected_trash",
          ];
          if (k.outline) {
            trashComponents.push(k.outline(1.5, k.rgb(40, 20, 15)));
          }
          trashItem = k.add(trashComponents) as ShipGameObject<TColor>;
          trashItem.add([k.rect(18, 6), k.pos(0, 0), k.color(240, 200, 30), k.anchor("center")]);
          sinkSpeed = 36;
        } else if (trashType === 1) {
          // Engradado de madeira industrial
          const trashComponents: unknown[] = [
            k.rect(22, 18, { radius: 2 }),
            k.pos(ejectX, ejectY),
            k.color(120, 85, 55),
            k.area(),
            k.anchor("center"),
            k.z(14),
            TAGS.TRASH,
            "ship_ejected_trash",
          ];
          if (k.outline) {
            trashComponents.push(k.outline(1.5, k.rgb(60, 40, 25)));
          }
          trashItem = k.add(trashComponents) as ShipGameObject<TColor>;
          sinkSpeed = 22;
        } else {
          // Saco plástico de resíduo
          const trashComponents: unknown[] = [
            k.rect(20, 15, { radius: 5 }),
            k.pos(ejectX, ejectY),
            k.color(55, 65, 75),
            k.area(),
            k.anchor("center"),
            k.z(14),
            TAGS.TRASH,
            "ship_ejected_trash",
          ];
          if (k.outline) {
            trashComponents.push(k.outline(1.5, k.rgb(25, 30, 40)));
          }
          trashItem = k.add(trashComponents) as ShipGameObject<TColor>;
          sinkSpeed = 26;
        }

        const startX = ejectX;
        let isTrashDestroyed = false;
        const updateEjectedTrash = (trashDeltaTime: number) => {
          if (isTrashDestroyed) return;
          trashAgeInSeconds += trashDeltaTime;
          trashItem.pos.y += sinkSpeed * trashDeltaTime;
          trashItem.pos.x = startX + Math.sin(trashAgeInSeconds * swaySpeed) * swayAmp;

          // Destrói se afundar até o leito ou ficar muito para trás
          const screenHeight = typeof k.height === "function" ? k.height() : 720;
          if (
            trashItem.pos.y > screenHeight - 40 ||
            trashItem.pos.x < playerController.gameObj.pos.x - 1200
          ) {
            isTrashDestroyed = true;
            k.destroy(trashItem as unknown as TDestroyable);
          }
        };

        if (familyTicker) {
          familyTicker.registerEntity({
            id: `ship_trash_${Date.now()}_${Math.random()}`,
            family: "trash",
            getXPosition: () => trashItem.pos.x,
            width: 25,
            targetObject: trashItem,
            isDestroyed: () => isTrashDestroyed,
            update: updateEjectedTrash,
          });
        } else {
          trashItem.onUpdate(() => {
            updateEjectedTrash(k.dt());
          });
        }
      }
    };

    if (familyTicker) {
      familyTicker.registerEntity({
        id: `cargo_ship_${shipData.initialXPosition}`,
        family: "ship",
        getXPosition: () => ship.pos.x,
        width: 320,
        targetObject: ship,
        update: updateCargoShip,
      });
    } else {
      ship.onUpdate(() => {
        updateCargoShip(k.dt());
      });
    }
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

  const destroy = () => {
    deactivate();
    if (
      bakedCargoShipTexture &&
      typeof (bakedCargoShipTexture as { destroy?: (b?: boolean) => void }).destroy === "function"
    ) {
      (bakedCargoShipTexture as { destroy: (b?: boolean) => void }).destroy(true);
      bakedCargoShipTexture = null;
    }
    if (
      bakedNoiseRingTexture &&
      typeof (bakedNoiseRingTexture as { destroy?: (b?: boolean) => void }).destroy === "function"
    ) {
      (bakedNoiseRingTexture as { destroy: (b?: boolean) => void }).destroy(true);
      bakedNoiseRingTexture = null;
    }
  };

  return {
    activate,
    deactivate,
    isActive: () => isSystemActive,
    destroy,
  };
}
