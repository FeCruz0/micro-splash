import type { KaboomCtx } from "kaboom";
import { TAGS } from "../config";
import type { PlayerController } from "../entities/player";
import { audioSystem } from "./audioSystem";

export interface CurrentZone {
  startX: number;
  endX: number;
  y: number;
  height: number;
  force: number;
  type: "opposing" | "favorable";
}

export const DEFAULT_OCEAN_CURRENTS: CurrentZone[] = [
  // 1. Correnteza Contrária 1 (Travessia inicial - meia água)
  { startX: 5800, endX: 7400, y: 180, height: 115, force: 170, type: "opposing" },
  // 2. Correnteza Favorável 1 (Travessia média - canal veloz de superfície)
  { startX: 7800, endX: 9400, y: 130, height: 110, force: 190, type: "favorable" },
  // 3. Correnteza Contrária 2 (Travessia profunda - fundo do mar)
  { startX: 9800, endX: 11400, y: 280, height: 125, force: 185, type: "opposing" },
];

/**
 * Sistema Unificado de Correntezas Oceânicas (Favoráveis e Contrárias).
 * Cria faixas marinhas fluídas, ricas em filamentos dinâmicos, vórtices
 * e forças físicas hidrodinâmicas.
 */
export function setupOceanCurrentsSystem(
  k: KaboomCtx,
  playerController: PlayerController,
  zones: CurrentZone[] = DEFAULT_OCEAN_CURRENTS
) {
  let lastFavorableAudioTime = 0;

  zones.forEach((zone) => {
    const width = zone.endX - zone.startX;
    const isFavorable = zone.type === "favorable";

    // 1. Âncora da correnteza (100% natural, sem contorno e sem cor diferente do fundo)
    const currentBox = k.add([
      k.pos(zone.startX, zone.y),
      k.z(2),
      isFavorable ? TAGS.FAVORABLE_CURRENT : TAGS.OPPOSING_CURRENT,
      "ocean_current",
    ]);

    // 2. Filamentos e esteiras aquáticas dinâmicas
    const filamentCount = Math.max(6, Math.min(16, Math.round(width / 180)));
    for (let i = 0; i < filamentCount; i++) {
      const filamentWidth = k.rand(40, 95);
      const filamentHeight = k.rand(2.0, 3.5);
      const offsetX = Math.random() * width;
      const offsetY = 8 + Math.random() * (zone.height - 16);

      const streamColor = isFavorable
        ? k.choose([k.rgb(140, 245, 255), k.rgb(255, 230, 140), k.rgb(200, 255, 255)])
        : k.choose([k.rgb(215, 230, 250), k.rgb(175, 195, 225), k.rgb(240, 245, 255)]);

      const streamLine = currentBox.add([
        k.rect(filamentWidth, filamentHeight, { radius: filamentHeight / 2 }),
        k.pos(offsetX, offsetY),
        k.color(streamColor),
        k.opacity(k.rand(0.45, 0.75)),
      ]);

      const streamSpeed = isFavorable ? k.rand(200, 320) : k.rand(150, 230);
      let sway = Math.random() * Math.PI * 2;

      streamLine.onUpdate(() => {
        const dt = k.dt();
        sway += dt * 3;

        if (isFavorable) {
          streamLine.pos.x += dt * streamSpeed;
          if (streamLine.pos.x > width + 40) {
            streamLine.pos.x = -filamentWidth;
          }
        } else {
          streamLine.pos.x -= dt * streamSpeed;
          if (streamLine.pos.x < -filamentWidth - 20) {
            streamLine.pos.x = width + 20;
          }
        }

        // Leve ondulação vertical do filamento
        streamLine.pos.y = offsetY + Math.sin(sway) * 2;
      });
    }

    // 3. Vórtices e redemoinhos sutis (para correntes contrárias)
    if (!isFavorable) {
      const vortexCount = Math.max(2, Math.round(width / 600));
      for (let v = 0; v < vortexCount; v++) {
        const vx = (v + 0.5) * (width / vortexCount);
        const vy = zone.height * 0.5 + (Math.random() - 0.5) * 25;

        const vortex = currentBox.add([
          k.circle(k.rand(6, 12)),
          k.pos(vx, vy),
          k.color(180, 210, 245),
          k.opacity(0.25),
          k.outline(1.5, k.rgb(230, 240, 255)),
        ]);

        let vAngle = Math.random() * 10;
        vortex.onUpdate(() => {
          vAngle -= k.dt() * 4;
          vortex.opacity = 0.18 + Math.sin(vAngle) * 0.12;
        });
      }
    }

    // 4. Interação física contínua com a baleia e cálculo de dinâmica de fôlego
    currentBox.onUpdate(() => {
      const playerPos = playerController.gameObj.pos;

      const isInX = playerPos.x >= zone.startX && playerPos.x <= zone.endX;
      const isInY = playerPos.y >= zone.y && playerPos.y <= zone.y + zone.height;

      if (isInX && isInY) {
        const dt = k.dt();
        const currentSpeed = playerController.getSpeed();
        const facingRight = playerController.isFacingRight
          ? playerController.isFacingRight()
          : true;

        // Sentido da correnteza (+1 para favorável/leste, -1 para contrária/oeste)
        const currentDir = isFavorable ? 1 : -1;
        const whaleDir = facingRight ? 1 : -1;
        const isAlignedWithFlow = currentDir === whaleDir;

        // Fase 18.1: A favor do fluxo = -35% de dreno (0.65x); Contra o fluxo = +35% de dreno (1.35x)
        const flowModifier = isAlignedWithFlow ? 0.65 : 1.35;
        if (playerController.setCurrentFlowModifier) {
          playerController.setCurrentFlowModifier(flowModifier);
        }

        if (isFavorable) {
          // Acelera a jubarte para a frente (+X) com empuxo hidrodinâmico
          playerController.setSpeed(k.vec2(currentSpeed.x + zone.force * dt, currentSpeed.y));

          // Áudio de impulso favorável com debounce
          const now = k.time();
          if (now - lastFavorableAudioTime > 2.0) {
            lastFavorableAudioTime = now;
            audioSystem.playSpeedBoost();
          }

          // Partículas douradas de fluxo favorável na baleia
          if (Math.random() < 0.25) {
            const p = k.add([
              k.circle(k.rand(2, 3.5)),
              k.pos(playerPos.x + k.rand(-25, 25), playerPos.y + k.rand(-10, 10)),
              k.color(255, 235, 140),
              k.opacity(0.8),
              k.z(15),
            ]);
            p.onUpdate(() => {
              p.pos.x += 180 * k.dt();
              p.opacity -= k.dt() * 2.8;
              if (p.opacity <= 0) k.destroy(p);
            });
          }
        } else {
          // Empurra a jubarte para trás (-X)
          playerController.setSpeed(k.vec2(currentSpeed.x - zone.force * dt, currentSpeed.y));

          // Leve turbulência visual na tela
          if (Math.random() < 0.15) {
            k.shake(1.0);
          }
        }

        // Micro-bolhas de esforço/resistência ao nadar contra a correnteza
        if (!isAlignedWithFlow && Math.random() < 0.22) {
          const bubble = k.add([
            k.circle(k.rand(1.5, 3)),
            k.pos(playerPos.x + (facingRight ? 40 : -40), playerPos.y + k.rand(-8, 8)),
            k.color(200, 230, 255),
            k.opacity(0.65),
            k.z(14),
          ]);
          bubble.onUpdate(() => {
            bubble.pos.x -= currentDir * 110 * k.dt();
            bubble.pos.y -= 20 * k.dt();
            bubble.opacity -= k.dt() * 2.2;
            if (bubble.opacity <= 0) k.destroy(bubble);
          });
        }
      }
    });
  });

  // Reset do modificador quando a baleia não estiver dentro de nenhuma zona
  k.onUpdate(() => {
    if (!playerController.gameObj || !playerController.gameObj.pos) return;
    const playerPos = playerController.gameObj.pos;
    const inAny = zones.some(
      (z) =>
        playerPos.x >= z.startX &&
        playerPos.x <= z.endX &&
        playerPos.y >= z.y &&
        playerPos.y <= z.y + z.height
    );
    if (!inAny && playerController.setCurrentFlowModifier) {
      if (
        playerController.getCurrentFlowModifier &&
        playerController.getCurrentFlowModifier() !== 1.0
      ) {
        playerController.setCurrentFlowModifier(1.0);
      }
    }
  });
}
