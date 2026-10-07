/**
 * Deterministic pseudo-random number generation utilities.
 * Supports optional seed injection for test determinism and frame-rate invariant logic.
 */

export type RandomNumberGenerator = () => number;

/**
 * Creates a deterministic 32-bit PRNG using the Mulberry32 algorithm.
 */
export function createDeterministicRandomGenerator(initialSeed: number): RandomNumberGenerator {
  let seedState = initialSeed >>> 0;
  return function generateNextFloat(): number {
    seedState = (seedState + 0x6d2b79f5) >>> 0;
    let intermediateValue = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
    intermediateValue =
      (intermediateValue +
        Math.imul(intermediateValue ^ (intermediateValue >>> 7), 61 | intermediateValue)) ^
      intermediateValue;
    return ((intermediateValue ^ (intermediateValue >>> 14)) >>> 0) / 4294967296;
  };
}

let activeDefaultGenerator: RandomNumberGenerator = () => Math.random();

export function setDefaultRandomGenerator(generator: RandomNumberGenerator): void {
  activeDefaultGenerator = generator;
}

export function resetDefaultRandomGenerator(): void {
  activeDefaultGenerator = () => Math.random();
}

export function getRandomFloat(
  minimumValue = 0,
  maximumValue = 1,
  customGenerator: RandomNumberGenerator = activeDefaultGenerator
): number {
  const normalizedValue = customGenerator();
  return minimumValue + normalizedValue * (maximumValue - minimumValue);
}

export function getRandomInteger(
  minimumInteger: number,
  maximumInteger: number,
  customGenerator: RandomNumberGenerator = activeDefaultGenerator
): number {
  const minimumCeiled = Math.ceil(minimumInteger);
  const maximumFloored = Math.floor(maximumInteger);
  return Math.floor(customGenerator() * (maximumFloored - minimumCeiled + 1)) + minimumCeiled;
}

export function getRandomChoice<ItemType>(
  collection: readonly ItemType[],
  customGenerator: RandomNumberGenerator = activeDefaultGenerator
): ItemType | undefined {
  if (collection.length === 0) return undefined;
  const selectedIndex = getRandomInteger(0, collection.length - 1, customGenerator);
  return collection[selectedIndex];
}
