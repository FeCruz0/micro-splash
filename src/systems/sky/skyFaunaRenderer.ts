/**
 * Criador e gerenciador de fauna aerea (albatrozes, fragatas e garcas).
 */

import type { IRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";
import type { BirdData, SkyRenderObject } from "./skyTypes";
import { createSkyObject } from "./skyObjectRenderer";

export function createSkyBirds(
  engineOrContext: IRenderEngine | unknown,
  textureCache: Map<string, unknown>
): BirdData[] {
  const birds: BirdData[] = [];
  const birdSpawnPoints = [
    { x: 900, y: 35, type: "albatross" as const, speed: 72 },
    { x: 2600, y: 24, type: "albatross" as const, speed: 80 },
    { x: 4300, y: 38, type: "albatross" as const, speed: 68 },
    { x: 7200, y: 28, type: "albatross" as const, speed: 75 },
    { x: 10400, y: 25, type: "frigatebird" as const, speed: 82 },
    { x: 13600, y: 30, type: "frigatebird" as const, speed: 78 },
    { x: 16900, y: 20, type: "frigatebird" as const, speed: 85 },
    { x: 21500, y: 34, type: "egret" as const, speed: 58 },
    { x: 24200, y: 26, type: "egret" as const, speed: 52 },
    { x: 26400, y: 18, type: "egret" as const, speed: 48 },
  ];

  birdSpawnPoints.forEach((b, idx) => {
    let bodyColor: [number, number, number];
    let wingColor: [number, number, number];
    let wingLength: number;
    let bodyWidth: number;
    let extraObj: SkyRenderObject | undefined = undefined;

    if (b.type === "albatross") {
      bodyColor = [240, 245, 255];
      wingColor = [55, 65, 75];
      wingLength = 22;
      bodyWidth = 13;
    } else if (b.type === "frigatebird") {
      bodyColor = [25, 25, 30];
      wingColor = [35, 35, 42];
      wingLength = 16;
      bodyWidth = 11;

      extraObj = createSkyObject(engineOrContext, {
        tag: "sky_bird_tail",
        type: "polygon",
        x: b.x - 5,
        y: b.y,
        points: [
          { x: 0, y: 0 },
          { x: -7, y: -3.5 },
          { x: -3, y: 0 },
          { x: -7, y: 3.5 },
        ],
        color: [25, 25, 30],
        opacity: 1,
        zIndex: -7,
        textureCache,
      });
    } else {
      bodyColor = [255, 255, 255];
      wingColor = [235, 240, 245];
      wingLength = 13;
      bodyWidth = 9;

      extraObj = createSkyObject(engineOrContext, {
        tag: "sky_bird_legs",
        type: "rect",
        x: b.x - 6,
        y: b.y + 2,
        width: 6,
        height: 1.2,
        color: [30, 30, 35],
        opacity: 1,
        zIndex: -7,
        textureCache,
      });
    }

    const body = createSkyObject(engineOrContext, {
      tag: "sky_bird",
      type: "rect",
      x: b.x,
      y: b.y,
      width: bodyWidth,
      height: 3,
      color: bodyColor,
      opacity: 1,
      zIndex: -7,
      textureCache,
    });

    const wingLeft = createSkyObject(engineOrContext, {
      tag: "sky_bird_wing_left",
      type: "rect",
      x: b.x - 2,
      y: b.y,
      width: wingLength,
      height: 2.2,
      color: wingColor,
      opacity: 1,
      zIndex: -7,
      textureCache,
    });

    const wingRight = createSkyObject(engineOrContext, {
      tag: "sky_bird_wing_right",
      type: "rect",
      x: b.x + 2,
      y: b.y,
      width: wingLength,
      height: 2.2,
      color: wingColor,
      opacity: 1,
      zIndex: -7,
      textureCache,
    });

    birds.push({
      body,
      wingLeft,
      wingRight,
      extra: extraObj,
      worldX: b.x,
      worldY: b.y,
      speedX: b.speed,
      flightType: b.type,
      animOffset: idx * 1.3,
    });
  });

  return birds;
}

export function updateSkyBirds(birds: readonly BirdData[], deltaTime: number, time: number): void {
  const birdCount = birds.length;
  for (let i = 0; i < birdCount; i++) {
    const b = birds[i];
    b.worldX += b.speedX * deltaTime;

    let flapSpeed: number;
    let flapAmplitude: number;

    if (b.flightType === "albatross") {
      flapSpeed = 3.4;
      flapAmplitude = 18;
    } else if (b.flightType === "frigatebird") {
      flapSpeed = 6.2;
      flapAmplitude = 26;
    } else {
      flapSpeed = 7.2;
      flapAmplitude = 22;
    }

    const wingAngle = Math.sin(time * flapSpeed + b.animOffset) * flapAmplitude;
    const altSway = Math.cos(time * 2.0 + b.animOffset) * 4;
    const currentY = b.worldY + altSway;

    b.body.pos.x = b.worldX;
    b.body.pos.y = currentY;

    b.wingLeft.pos.x = b.worldX - 2;
    b.wingLeft.pos.y = currentY;
    b.wingLeft.angle = -wingAngle;

    b.wingRight.pos.x = b.worldX + 2;
    b.wingRight.pos.y = currentY;
    b.wingRight.angle = wingAngle;

    if (b.extra && typeof b.extra.exists === "function" && b.extra.exists()) {
      b.extra.pos.x = b.worldX - 5;
      b.extra.pos.y = currentY + (b.flightType === "egret" ? 2 : 0);
    }
  }
}
