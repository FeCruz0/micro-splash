import type { AudioEngine } from "../audioEngine";
import type { GetDestinationNodeFn } from "./sfxTypes";
import { getRandomFloat } from "../../../utils/random";

export function playSonarSound(engine: AudioEngine, getDest: GetDestinationNodeFn): void {
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest();
  if (!ctx || !dest) return;

  const now = ctx.currentTime;

  const playFmPing = (time: number, volume: number) => {
    if (!ctx || !dest) return;

    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const carrierGain = ctx.createGain();
    const bandpass = ctx.createBiquadFilter();

    carrier.type = "sine";
    carrier.frequency.setValueAtTime(880, time);
    carrier.frequency.exponentialRampToValueAtTime(440, time + 0.28);

    modulator.type = "sine";
    modulator.frequency.setValueAtTime(1760, time);
    modulator.frequency.exponentialRampToValueAtTime(880, time + 0.28);

    modGain.gain.setValueAtTime(450, time);
    modGain.gain.exponentialRampToValueAtTime(10, time + 0.25);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(800, time);
    bandpass.Q.value = 4.0;

    carrierGain.gain.setValueAtTime(volume, time);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

    carrier.connect(bandpass);
    bandpass.connect(carrierGain);
    carrierGain.connect(dest);

    modulator.start(time);
    carrier.start(time);
    modulator.stop(time + 0.32);
    carrier.stop(time + 0.32);
  };

  playFmPing(now, 0.32);
  playFmPing(now + 0.11, 0.1);
}

export function playSonarEcho(
  engine: AudioEngine,
  getDest: GetDestinationNodeFn,
  delayMs: number = 60
): void {
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest();
  if (!ctx || !dest) return;

  const time = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.setValueAtTime(660, time);
  osc.frequency.exponentialRampToValueAtTime(330, time + 0.15);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, time);
  filter.Q.value = 3.5;

  gain.gain.setValueAtTime(0.08, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(time);
  osc.stop(time + 0.18);
}

export function playBlowholeSpout(engine: AudioEngine, getDest: GetDestinationNodeFn): void {
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest();
  if (!ctx || !dest) return;

  const now = ctx.currentTime;
  const duration = 0.85;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = getRandomFloat(-1, 1);
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(2200, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(650, now + 0.45);
  noiseFilter.Q.value = 2.4;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, now);
  noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.04);
  noiseGain.gain.exponentialRampToValueAtTime(0.12, now + 0.4);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(dest);

  const subOsc = ctx.createOscillator();
  const subFilter = ctx.createBiquadFilter();
  const subGain = ctx.createGain();

  subOsc.type = "sine";
  subOsc.frequency.setValueAtTime(140, now);
  subOsc.frequency.exponentialRampToValueAtTime(75, now + 0.5);

  subFilter.type = "lowpass";
  subFilter.frequency.setValueAtTime(180, now);
  subFilter.Q.value = 1.8;

  subGain.gain.setValueAtTime(0.001, now);
  subGain.gain.linearRampToValueAtTime(0.28, now + 0.05);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

  subOsc.connect(subFilter);
  subFilter.connect(subGain);
  subGain.connect(dest);

  noiseSource.start(now);
  subOsc.start(now);
  noiseSource.stop(now + duration);
  subOsc.stop(now + 0.55);
}

export function playStrokeThrust(engine: AudioEngine, getDest: GetDestinationNodeFn): void {
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest();
  if (!ctx || !dest) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.setValueAtTime(105, now);
  osc.frequency.exponentialRampToValueAtTime(42, now + 0.18);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(200, now);
  filter.frequency.exponentialRampToValueAtTime(75, now + 0.18);
  filter.Q.value = 2;

  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(now);
  osc.stop(now + 0.2);
}

export function playKrillGulp(
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
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(450, now);
  filter.frequency.exponentialRampToValueAtTime(140, now + 0.14);
  filter.Q.value = 4.5;

  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(now);
  osc.stop(now + 0.15);

  const popOsc = ctx.createOscillator();
  const popGain = ctx.createGain();

  popOsc.type = "sine";
  popOsc.frequency.setValueAtTime(180, now + 0.02);
  popOsc.frequency.exponentialRampToValueAtTime(75, now + 0.12);

  popGain.gain.setValueAtTime(0.001, now);
  popGain.gain.setValueAtTime(0.28, now + 0.03);
  popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  popOsc.connect(popGain);
  popGain.connect(dest);

  popOsc.start(now + 0.02);
  popOsc.stop(now + 0.12);
}

export function playBreachLaunch(engine: AudioEngine, getDest: GetDestinationNodeFn): void {
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest();
  if (!ctx || !dest) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(540, now + 0.9);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

  osc.connect(gain);
  gain.connect(dest);

  osc.start(now);
  osc.stop(now + 1.2);
}
