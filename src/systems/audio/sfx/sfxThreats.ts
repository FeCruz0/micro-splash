import type { AudioEngine } from "../audioEngine";
import type { GetDestinationNodeFn } from "./sfxTypes";
import { getRandomFloat } from "../../../utils/random";

export function playTrashThud(
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
  const filter = ctx.createBiquadFilter();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(36, now + 0.2);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(280, now);
  filter.frequency.exponentialRampToValueAtTime(85, now + 0.2);

  gain.gain.setValueAtTime(0.42, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(now);
  osc.stop(now + 0.22);
}

export function playNetTangle(
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
  const filter = ctx.createBiquadFilter();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(95, now);
  osc.frequency.linearRampToValueAtTime(155, now + 0.18);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(400, now);
  filter.Q.value = 3.5;

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(now);
  osc.stop(now + 0.3);
}

export function playOilChoke(
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
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(320, now);
  filter.frequency.exponentialRampToValueAtTime(120, now + 0.35);
  filter.Q.value = 3.5;

  const bufferSize = Math.floor(ctx.sampleRate * 0.35);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = getRandomFloat(-1, 1) * Math.sin(i * 0.05);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(400, now);
  noiseFilter.Q.value = 4.0;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.38, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(filter);
  filter.connect(gain);
  noise.connect(noiseFilter);
  noiseFilter.connect(gain);
  gain.connect(dest);

  osc.start(now);
  noise.start(now);
  osc.stop(now + 0.35);
  noise.stop(now + 0.35);
}

export function playShipHorn(
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
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(110, now);
  osc2.type = "square";
  osc2.frequency.setValueAtTime(138.6, now); // Dissonância naval industrial

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(380, now);
  filter.Q.value = 2.0;

  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.24, now + 0.15);
  gain.gain.setValueAtTime(0.24, now + 0.9);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.4);
  osc2.stop(now + 1.4);
}
