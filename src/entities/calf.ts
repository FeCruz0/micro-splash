import type { GameObj, KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";

export interface CalfController {
  gameObj: GameObj;
  startMiniBreach: () => void;
  isBreaching: () => boolean;
  entangle: () => void;
  untangle: () => void;
  isEntangled: () => boolean;
  hitByDebris: () => void;
  getSafetyScore: () => number;
}

export function createCalf(k: KaboomCtx, motherObj: GameObj, onRescue?: () => void): CalfController {
  const initialPos = motherObj.pos.add(k.vec2(-80, 20));

  let isEntangled = false;
  let entangledPos = k.vec2(0, 0);
  let flashTimer = 0;
  let flashColor = k.rgb(175, 220, 255);
  let safetyDeductions = 0;

  const calf = k.add([
    k.sprite("baleia", { anim: "glide" }),
    k.pos(initialPos),
    k.scale(0.42),
    k.rotate(0),
    k.color(175, 220, 255), // Azul claro infantil de recém-nascido
    k.anchor("center"),
    k.area({ shape: new k.Rect(k.vec2(0, 0), 48, 18) }),
    k.z(14),
    "filhote",
    {
      reveal() {
        if (isEntangled) {
          isEntangled = false;
          flashTimer = 1.2;
          flashColor = k.rgb(120, 255, 230);
          if (onRescue) onRescue();
        }
      },
    },
  ]);

  let isBreaching = false;
  let breachVel = k.vec2(0, 0);

  calf.onUpdate(() => {
    const dt = k.dt();

    // Feedback de flash visual (dano/emaranhado ou libertação feliz)
    if (flashTimer > 0) {
      flashTimer -= dt;
      calf.color = flashColor;
    } else if (isEntangled) {
      // Tom avermelhado pulsante de aflição/perigo
      const pulse = Math.sin(k.time() * 10) * 0.5 + 0.5;
      calf.color = k.rgb(255, 120 + pulse * 60, 100);
    } else {
      calf.color = k.rgb(175, 220, 255);
    }

    if (isBreaching) {
      // Salto sincronizado com a mãe fora d'água
      breachVel.y += 560 * dt;
      calf.pos = calf.pos.add(breachVel.scale(dt));
      const trajectoryAngle = k.clamp(
        k.rad2deg(Math.atan2(breachVel.y, Math.abs(breachVel.x))),
        -40,
        40
      );
      calf.angle = k.lerp(calf.angle, trajectoryAngle, 0.12);

      // Limite ao reentrar na água: encerra o salto e retorna à formação de nado com a mãe
      if (calf.pos.y >= GAME_CONFIG.SEA_LEVEL + 25 && breachVel.y > 0) {
        calf.pos.y = GAME_CONFIG.SEA_LEVEL + 25;
        breachVel = k.vec2(0, 0);
        isBreaching = false;
      }
      return;
    }

    // Se estiver preso em rede fantasma: debate-se no ponto de emaranhamento
    if (isEntangled) {
      const struggle = Math.sin(k.time() * 18) * 4;
      calf.pos = entangledPos.add(k.vec2(Math.cos(k.time() * 12) * 2, struggle));
      calf.angle = Math.sin(k.time() * 14) * 8;
      if (calf.curAnim() !== "swim") {
        calf.play("swim");
      }
      return;
    }

    // Nado de acompanhamento em formação (atrás e levemente abaixo da mãe)
    const isMotherFacingRight = !motherObj.flipX;
    const targetOffset = k.vec2(isMotherFacingRight ? -65 : 65, 14);
    const targetPos = motherObj.pos.add(targetOffset);

    // Suavização do movimento de seguimento
    calf.pos = k.lerp(calf.pos, targetPos, 0.08);
    calf.flipX = motherObj.flipX;

    // Oscilação suave da cauda
    const sway = Math.sin(k.time() * 8) * 3;
    calf.angle = k.lerp(calf.angle, motherObj.angle + sway, 0.1);

    // Animação de nado
    const distToMother = calf.pos.dist(targetPos);
    if (distToMother > 15) {
      if (calf.curAnim() !== "stroke_up" && calf.curAnim() !== "stroke_down") {
        calf.play("swim");
      }
    } else if (calf.curAnim() !== "glide") {
      calf.play("glide");
    }
  });

  return {
    gameObj: calf,
    startMiniBreach: () => {
      isBreaching = true;
      breachVel = k.vec2(220, -320);
      calf.play("glide");
    },
    isBreaching: () => isBreaching,
    entangle: () => {
      if (!isEntangled) {
        isEntangled = true;
        entangledPos = calf.pos.clone();
        flashTimer = 0.5;
        flashColor = k.rgb(255, 60, 60);
        safetyDeductions += 1;
      }
    },
    untangle: () => {
      if (isEntangled) {
        isEntangled = false;
        flashTimer = 1.0;
        flashColor = k.rgb(120, 255, 230); // Brilho de alívio ciano
      }
    },
    isEntangled: () => isEntangled,
    hitByDebris: () => {
      flashTimer = 0.4;
      flashColor = k.rgb(255, 150, 80);
      safetyDeductions += 0.5;
    },
    getSafetyScore: () => Math.max(0, 100 - safetyDeductions * 20),
  };
}

