import kaboom from "kaboom";
import { TAGS } from "../config";

export interface CurrentZone {
  startX: number;
  endX: number;
  y: number;
  height: number;
  force: number;
}

export const OPEN_OCEAN_CURRENTS: CurrentZone[] = [
  // Correnteza 1: Meia-água (obriga a descer fundo ou subir rente à superfície)
  { startX: 5600, endX: 7200, y: 170, height: 110, force: 160 },
  // Correnteza 2: Fundo do mar (bloqueia o fundo, exige nadar mais alto)
  { startX: 7700, endX: 9300, y: 270, height: 120, force: 175 },
  // Correnteza 3: Superfície intermediária (obriga a mergulhar fundo no escuro)
  { startX: 9800, endX: 11500, y: 140, height: 120, force: 190 },
];

/**
 * Sistema de Correntezas Contrárias em Alto Mar (5.000m a 12.000m).
 * Empurra a baleia para trás (-X) se entrar na faixa da correnteza.
 */
export function setupOceanCurrentsSystem(k: ReturnType<typeof kaboom>, playerController: any) {
  OPEN_OCEAN_CURRENTS.forEach((zone) => {
    const width = zone.endX - zone.startX;

    // Faixa visual da correnteza
    const currentBox = k.add([
      k.rect(width, zone.height, { radius: 8 }),
      k.pos(zone.startX, zone.y),
      k.color(70, 160, 230),
      k.opacity(0.22),
      k.outline(2, k.rgb(180, 230, 255)),
      k.z(2),
      TAGS.OPPOSING_CURRENT,
    ]);

    // Linhas e partículas dinâmicas de água fluindo para a esquerda
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const offsetX = Math.random() * width;
      const offsetY = Math.random() * (zone.height - 10);
      const streamLine = currentBox.add([
        k.rect(40 + Math.random() * 30, 3, { radius: 2 }),
        k.pos(offsetX, offsetY),
        k.color(210, 245, 255),
        k.opacity(0.55),
      ]);

      const streamSpeed = 120 + Math.random() * 60;
      streamLine.onUpdate(() => {
        streamLine.pos.x -= k.dt() * streamSpeed;
        if (streamLine.pos.x < -40) {
          streamLine.pos.x = width;
        }
      });
    }

    // Monitora se o jogador está dentro da correnteza contrária
    currentBox.onUpdate(() => {
      const playerPos = playerController.gameObj.pos;

      const isInX = playerPos.x >= zone.startX && playerPos.x <= zone.endX;
      const isInY = playerPos.y >= zone.y && playerPos.y <= zone.y + zone.height;

      if (isInX && isInY) {
        // Empurra a jubarte para trás na horizontal
        const speed = playerController.getSpeed();
        playerController.setSpeed(
          k.vec2(
            speed.x - zone.force * k.dt(),
            speed.y
          )
        );

        // Leve turbulência na tela
        if (Math.random() < 0.2) {
          k.shake(1);
        }
      }
    });
  });
}
