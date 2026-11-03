import type { AudioEngine } from "../audioEngine";
import type { GetDestinationNodeFn } from "./sfxTypes";
import { getRandomFloat } from "../../../utils/random";

export function playWaterSplash(
  engine: AudioEngine,
  getDest: GetDestinationNodeFn,
  sourceX?: number,
  playerX?: number
): void {
  engine.init();
  engine.resumeIfSuspended();
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest(sourceX, playerX);
  if (!ctx || !dest) return;

  const now = ctx.currentTime;

  const plungeOsc = ctx.createOscillator();
  const plungeGain = ctx.createGain();
  const plungeFilter = ctx.createBiquadFilter();

  plungeOsc.type = "triangle";
  plungeOsc.frequency.setValueAtTime(360, now);
  plungeOsc.frequency.exponentialRampToValueAtTime(95, now + 0.32);

  plungeFilter.type = "lowpass";
  plungeFilter.frequency.setValueAtTime(850, now);
  plungeFilter.frequency.exponentialRampToValueAtTime(180, now + 0.32);
  plungeFilter.Q.value = 3.2;

  plungeGain.gain.setValueAtTime(1.1, now);
  plungeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

  plungeOsc.connect(plungeFilter);
  plungeFilter.connect(plungeGain);
  plungeGain.connect(dest);
  plungeOsc.start(now);
  plungeOsc.stop(now + 0.35);

  const bufferSize = Math.floor(ctx.sampleRate * 0.45);
  const splashBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = splashBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const raw = getRandomFloat(-1, 1);
    const quantized = Math.round(raw * 8) / 8;
    data[i] = quantized * Math.exp(-i / (bufferSize * 0.35));
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = splashBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(2800, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(450, now + 0.42);
  noiseFilter.Q.value = 1.8;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(1.0, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(dest);
  noiseSource.start(now);
  noiseSource.stop(now + 0.45);

  const bloops = [
    { delay: 0.04, freqStart: 540, freqEnd: 240, gain: 0.65 },
    { delay: 0.11, freqStart: 440, freqEnd: 200, gain: 0.55 },
    { delay: 0.19, freqStart: 620, freqEnd: 280, gain: 0.45 },
  ];

  bloops.forEach((b) => {
    if (!ctx || !dest) return;
    const dropTime = now + b.delay;
    const dropOsc = ctx.createOscillator();
    const dropGain = ctx.createGain();

    dropOsc.type = "sine";
    dropOsc.frequency.setValueAtTime(b.freqStart, dropTime);
    dropOsc.frequency.exponentialRampToValueAtTime(b.freqEnd, dropTime + 0.14);

    dropGain.gain.setValueAtTime(b.gain, dropTime);
    dropGain.gain.exponentialRampToValueAtTime(0.01, dropTime + 0.14);

    dropOsc.connect(dropGain);
    dropGain.connect(dest);
    dropOsc.start(dropTime);
    dropOsc.stop(dropTime + 0.14);
  });
}

export function playIceCrackSound(
  engine: AudioEngine,
  getDest: GetDestinationNodeFn,
  sourceX?: number,
  playerX?: number
): void {
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest(sourceX, playerX);
  if (!ctx || !dest) return;

  const now = ctx.currentTime;

  const crackOsc = ctx.createOscillator();
  const crackGain = ctx.createGain();
  crackOsc.type = "sawtooth";
  crackOsc.frequency.setValueAtTime(2400, now);
  crackOsc.frequency.exponentialRampToValueAtTime(320, now + 0.18);

  crackGain.gain.setValueAtTime(0.38, now);
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  crackOsc.connect(crackGain);
  crackGain.connect(dest);
  crackOsc.start(now);
  crackOsc.stop(now + 0.18);

  const bufferSize = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = getRandomFloat(-1, 1) * Math.exp(-i / (bufferSize * 0.3));
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1600, now);
  filter.frequency.exponentialRampToValueAtTime(500, now + 0.25);
  filter.Q.value = 2.0;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.42, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  noiseSource.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(dest);
  noiseSource.start(now);
  noiseSource.stop(now + 0.25);
}

export function playPurifyWhoosh(
  engine: AudioEngine,
  getDest: GetDestinationNodeFn,
  sourceX?: number,
  playerX?: number
): void {
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest(sourceX, playerX);
  if (!ctx || !dest) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(580, now + 0.45);

  const bufferSize = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = getRandomFloat(-1, 1) * Math.exp(-i / (bufferSize * 0.4));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(1400, now + 0.5);
  filter.Q.value = 3.0;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.32, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.connect(gain);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(now);
  noise.start(now);
  osc.stop(now + 0.5);
  noise.stop(now + 0.5);
}

export function playDolphinClicks(
  engine: AudioEngine,
  getDest: GetDestinationNodeFn,
  sourceX?: number,
  playerX?: number
): void {
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest(sourceX, playerX);
  if (!ctx || !dest) return;

  const now = ctx.currentTime;

  for (let i = 0; i < 4; i++) {
    const clickStart = now + i * 0.045;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(2800 + i * 250, clickStart);
    osc.frequency.exponentialRampToValueAtTime(1600, clickStart + 0.035);

    gain.gain.setValueAtTime(0.18, clickStart);
    gain.gain.exponentialRampToValueAtTime(0.001, clickStart + 0.035);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(clickStart);
    osc.stop(clickStart + 0.035);
  }

  const whistleStart = now + 0.18;
  const wOsc = ctx.createOscillator();
  const wGain = ctx.createGain();

  wOsc.type = "triangle";
  wOsc.frequency.setValueAtTime(2100, whistleStart);
  wOsc.frequency.exponentialRampToValueAtTime(3200, whistleStart + 0.12);
  wOsc.frequency.exponentialRampToValueAtTime(2400, whistleStart + 0.28);

  wGain.gain.setValueAtTime(0.16, whistleStart);
  wGain.gain.exponentialRampToValueAtTime(0.001, whistleStart + 0.3);

  wOsc.connect(wGain);
  wGain.connect(dest);

  wOsc.start(whistleStart);
  wOsc.stop(whistleStart + 0.3);
}

export function playPenguinChirp(
  engine: AudioEngine,
  getDest: GetDestinationNodeFn,
  sourceX?: number,
  playerX?: number
): void {
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest(sourceX, playerX);
  if (!ctx || !dest) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(2400, now + 0.05);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  gain.connect(dest);

  osc.start(now);
  osc.stop(now + 0.12);
}
