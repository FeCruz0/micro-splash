import type { KaboomCtx, GameObj } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { createKrill } from "../entities/krill";
import type { PlayerController } from "../entities/player";

export function createUpwellingStream(
  k: KaboomCtx,
  spawnXPosition: number,
  spawnYPosition: number
) {
  const upwellingStream = k.add([
    k.rect(36, 84),
    k.pos(spawnXPosition, spawnYPosition),
    k.color(0, 220, 255),
    k.opacity(0),
    k.rotate(-25), // 25º de inclinação ascendente
    k.area({ scale: k.vec2(4, 10) }),
    k.anchor("center"),
    k.z(-1),
    TAGS.UPWELLING_STREAM,
    "upwelling_stream_parent",
  ]);

  const strands: GameObj[] = [];
  const strandCount = 6;
  for (let strandIndex = 0; strandIndex < strandCount; strandIndex++) {
    const strandOffsetX = (strandIndex - (strandCount - 1) / 2) * 5.5;
    const strandAngle = (strandIndex - (strandCount - 1) / 2) * 2.2;

    const baseSegment = upwellingStream.add([
      k.rect(4, 30, { radius: 2 }),
      k.pos(strandOffsetX, 20),
      k.color(0, 210, 255),
      k.opacity(0.55),
      k.rotate(strandAngle),
      k.anchor("center"),
      "upwelling_strand_base",
    ]);

    const middleSegment = upwellingStream.add([
      k.rect(3.5, 30, { radius: 1.5 }),
      k.pos(strandOffsetX + strandAngle * 0.4, -8),
      k.color(60, 225, 255),
      k.opacity(0.35),
      k.rotate(strandAngle),
      k.anchor("center"),
      "upwelling_strand_mid",
    ]);

    const topSegment = upwellingStream.add([
      k.rect(3, 25, { radius: 1.5 }),
      k.pos(strandOffsetX + strandAngle * 0.8, -34),
      k.color(160, 245, 255),
      k.opacity(0.18),
      k.rotate(strandAngle),
      k.anchor("center"),
      "upwelling_strand_top",
    ]);

    strands.push(baseSegment, middleSegment, topSegment);
  }

  let streamTime = 0;
  let streamLifetime = 1.0;
  upwellingStream.onUpdate(() => {
    const deltaTime = k.dt();
    streamTime += deltaTime;
    // move jato diagonalmente para direita e para cima
    upwellingStream.pos.x += deltaTime * GAME_CONFIG.UPWELLING_PUSH_X;
    upwellingStream.pos.y += deltaTime * GAME_CONFIG.UPWELLING_PUSH_Y;
    upwellingStream.pos.x += Math.sin(streamTime * 4) * 0.8; // oscilação orgânica

    streamLifetime -= deltaTime * 0.25;
    for (let strandIndex = 0; strandIndex < strands.length; strandIndex++) {
      strands[strandIndex].opacity = Math.max(0, strands[strandIndex].opacity - deltaTime * 0.12);
    }
    if (upwellingStream.pos.y <= -50 || streamLifetime <= 0) {
      k.destroy(upwellingStream);
    }
  });

  return { upwellingStream, strands };
}

export function setupUpwellingSystem(k: KaboomCtx, playerController: PlayerController) {
  let upwellingTimer = 0;
  let isUpwellingActive = false;
  let upwellingEventTimer = 0;
  let eventOriginXPosition = 0;

  k.onUpdate(() => {
    // só produz ressurgencia se baleia não estiver desmaiando
    if (playerController.isFainting()) return;

    const currentXPosition = playerController.gameObj.pos.x;
    const isInUpwellingZone =
      currentXPosition >= GAME_CONFIG.UPWELLING_ZONE_START &&
      currentXPosition <= GAME_CONFIG.UPWELLING_ZONE_END;

    // se estiver fora da zona de ressurgência (19.000m - 25.000m), reseta timer e não inicia novos eventos
    if (!isInUpwellingZone) {
      upwellingTimer = 0;
      return;
    }

    upwellingTimer += k.dt();

    // ativa ressurgencia a cada 18 segundos
    if (upwellingTimer >= GAME_CONFIG.UPWELLING_INTERVAL && !isUpwellingActive) {
      isUpwellingActive = true;
      upwellingEventTimer = GAME_CONFIG.UPWELLING_DURATION;
      upwellingTimer = 0;
      eventOriginXPosition = currentXPosition;
      k.shake(2); // leve tremida na tela
    }

    // ativa ressurgencia (4 segundos)
    if (isUpwellingActive) {
      upwellingEventTimer -= k.dt();

      // fluxo de agua ascendente na diagonal para direita
      if (Math.random() < 0.4) {
        const spawnXPosition = eventOriginXPosition + (Math.random() * 400 - 100);
        const spawnYPosition = k.height() - 40;
        createUpwellingStream(k, spawnXPosition, spawnYPosition);
      }

      // gera cardume de krill na area
      if (Math.random() < 0.005) {
        const krillXPosition = eventOriginXPosition + 300 + Math.random() * 200;
        const krillYPosition = k.height() - 100 - Math.random() * 200;
        createKrill(k, k.vec2(krillXPosition, krillYPosition));
      }

      if (upwellingEventTimer <= 0) {
        isUpwellingActive = false;
      }
    }
  });

  // física: ressurgencia empurra baleia
  k.onCollideUpdate(TAGS.PLAYER, TAGS.UPWELLING_STREAM, (_player, _upwellingStream) => {
    const currentVelocity = playerController.getSpeed();
    playerController.setSpeed(
      k.vec2(
        k.clamp(currentVelocity.x + 10, -GAME_CONFIG.MAX_SPEED, GAME_CONFIG.MAX_SPEED),
        k.clamp(currentVelocity.y - 14, -GAME_CONFIG.MAX_SPEED, GAME_CONFIG.MAX_SPEED)
      )
    );
  });
}
