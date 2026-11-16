/**
 * Subdivisão de Formações Verticais e Contrafortes Conectados da Base (16-Bit) — Micro Splash
 */

import type { ColossalIceFormation, ColossalIcebergSpec } from "./colossalIcebergGenerator";
import {
  DEPTH_PALETTE_BANDS,
  GLACIER_16BIT_COLOR_PALETTE,
  ICEBERG_FAMILY_PALETTE,
  type GlacierPolygonLayer,
} from "./glacierCliffPalette";

export function snapStep(value: number): number {
  return Math.round(value / 2) * 2;
}

export function appendFormationSubfacets(
  layers: GlacierPolygonLayer[],
  formation: ColossalIceFormation
): void {
  const { index, leftX, rightX, topY, bottomY, leanX, tierRatios } = formation;
  const totalDepth = Math.max(60, bottomY - topY);

  for (let tier = 0; tier < tierRatios.length - 1; tier++) {
    const r0 = tierRatios[tier];
    const r1 = tierRatios[tier + 1];
    const isTop = tier === 0;
    const isBottom = tier === tierRatios.length - 2;

    const diagOffset0 = isTop ? 0 : snapStep(((index + tier) % 2 === 0 ? 1 : -1) * 22);
    const diagOffset1 = isBottom ? 0 : snapStep(((index + tier) % 2 === 0 ? -1 : 1) * 24);
    const y0L = snapStep(topY + totalDepth * r0);
    const y0R = isTop ? y0L : snapStep(y0L + diagOffset0);
    const y1L = snapStep(topY + totalDepth * r1);
    const y1R = isBottom ? y1L : snapStep(y1L + diagOffset1);

    const taper0 = r0 * 0.26;
    const taper1 = isBottom ? -0.14 : r1 * 0.24;
    const baseW = Math.max(36, rightX - leftX);
    const l0 = snapStep(leftX + leanX * r0 + baseW * taper0 * 0.35);
    const r0X = snapStep(rightX + leanX * r0 * 0.8 - baseW * taper0 * 0.35);
    const l1 = snapStep(leftX + leanX * r1 + baseW * taper1 * 0.35);
    const r1X = snapStep(rightX + leanX * r1 * 0.8 - baseW * taper1 * 0.35);

    const ridge0 = snapStep(l0 + (r0X - l0) * (0.38 + ((index + tier) % 3) * 0.08));
    const ridge1 = snapStep(l1 + Math.max(8, r1X - l1) * (0.42 + ((index * 2 + tier) % 3) * 0.08));
    const yMid = snapStep((y0L + y1L) * 0.5 + ((index + tier) % 2 === 0 ? -8 : 10));
    const band = DEPTH_PALETTE_BANDS[Math.min(tier, DEPTH_PALETTE_BANDS.length - 1)];

    layers.push({
      points: [
        { x: l0, y: y0L },
        { x: ridge0, y: snapStep((y0L + y0R) * 0.5) },
        { x: ridge1, y: yMid },
        { x: l1, y: y1L },
      ],
      color: tier === 0 ? ICEBERG_FAMILY_PALETTE.EMERGED_HIGHLIGHT : band.leftHighlightColor,
      alpha: 0.94,
    });

    layers.push({
      points: [
        { x: ridge0, y: snapStep((y0L + y0R) * 0.5) },
        { x: r0X, y: y0R },
        { x: ridge1, y: y1R },
        { x: l1, y: y1L },
      ],
      color: tier === 0 ? ICEBERG_FAMILY_PALETTE.EMERGED_MID : band.topLightColor,
      alpha: 0.9,
    });

    layers.push({
      points: [
        { x: ridge0, y: snapStep((y0L + y0R) * 0.5) },
        { x: r0X, y: y0R },
        { x: r1X, y: y1R },
        { x: ridge1, y: yMid },
      ],
      color: tier >= 2 ? ICEBERG_FAMILY_PALETTE.SUBMERGED_DEEP : band.rightShadowColor,
      alpha: 0.92,
    });

    if (isBottom) {
      const baseFootY = snapStep(y1L + (index % 3 === 0 ? 18 : index % 3 === 1 ? 8 : -6));
      layers.push({
        points: [
          { x: l1 - 6, y: y1L },
          { x: ridge1, y: yMid },
          { x: snapStep((l1 + r1X) * 0.52), y: baseFootY },
          { x: l1 - 8, y: baseFootY },
        ],
        color: ICEBERG_FAMILY_PALETTE.SUBMERGED_LIT,
        alpha: 0.82,
      });
      layers.push({
        points: [
          { x: ridge1, y: yMid },
          { x: r1X + 8, y: y1R },
          { x: r1X + 10, y: baseFootY },
          { x: snapStep((l1 + r1X) * 0.52), y: baseFootY },
        ],
        color: ICEBERG_FAMILY_PALETTE.SUBMERGED_DEEP,
        alpha: 0.9,
      });
    }
  }
}

export function appendConnectedBaseButtresses(
  layers: GlacierPolygonLayer[],
  spec: ColossalIcebergSpec
): void {
  const { seaLevelY, screenHeight, rightWaterlineX, formations } = spec;
  const submergedDepth = Math.max(80, screenHeight - seaLevelY);
  const baseStartY = snapStep(seaLevelY + submergedDepth * 0.66);

  for (let i = 0; i < formations.length - 1; i += 2) {
    const fA = formations[i];
    const fB = formations[i + 1];
    const leftX = snapStep(fA.leftX + 6);
    const rightX = snapStep(fB.rightX - 4);
    const apexX = snapStep((leftX + rightX) * 0.5 + (i % 4 === 0 ? -14 : 16));
    const apexY = snapStep(baseStartY + (i % 3) * 18);

    layers.push({
      points: [
        { x: leftX, y: screenHeight },
        { x: leftX + 14, y: apexY + 26 },
        { x: apexX, y: apexY },
        { x: apexX + 8, y: screenHeight },
      ],
      color: ICEBERG_FAMILY_PALETTE.SUBMERGED_LIT,
      alpha: 0.62,
    });
    layers.push({
      points: [
        { x: apexX, y: apexY },
        { x: rightX - 10, y: apexY + 34 },
        { x: rightX, y: screenHeight },
        { x: apexX + 8, y: screenHeight },
      ],
      color: GLACIER_16BIT_COLOR_PALETTE.BATHYAL_SHADOW,
      alpha: 0.78,
    });
  }

  const footTopY = snapStep(seaLevelY + submergedDepth * 0.56);
  const footMidY = snapStep(seaLevelY + submergedDepth * 0.8);
  layers.push(
    {
      points: [
        { x: rightWaterlineX - 24, y: footTopY },
        { x: rightWaterlineX + 24, y: footTopY + 38 },
        { x: rightWaterlineX + 86, y: footMidY },
        { x: rightWaterlineX + 34, y: screenHeight },
        { x: rightWaterlineX - 30, y: screenHeight },
      ],
      color: ICEBERG_FAMILY_PALETTE.SUBMERGED_LIT,
      alpha: 0.86,
    },
    {
      points: [
        { x: rightWaterlineX + 24, y: footTopY + 38 },
        { x: rightWaterlineX + 86, y: footMidY },
        { x: rightWaterlineX + 188, y: screenHeight },
        { x: rightWaterlineX + 34, y: screenHeight },
      ],
      color: ICEBERG_FAMILY_PALETTE.SUBMERGED_MID,
      alpha: 0.92,
    }
  );
}
