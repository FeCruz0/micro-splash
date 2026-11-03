import type { AudioEngine } from "../audioEngine";
import type { GetDestinationNodeFn } from "./sfxTypes";

export function playUiClick(engine: AudioEngine, getDest: GetDestinationNodeFn): void {
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest();
  if (!ctx || !dest) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(1240, now + 0.05);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.06);
}

export function playVictoryFanfare(engine: AudioEngine, getDest: GetDestinationNodeFn): void {
  if (!engine.isSfxEnabled() && !engine.isMusicEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest();
  if (!ctx || !dest) return;

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];

  notes.forEach((freq, idx) => {
    if (!ctx || !dest) return;
    const noteStart = now + idx * 0.11;
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const noteGain = ctx.createGain();

    carrier.type = "triangle";
    carrier.frequency.setValueAtTime(freq, noteStart);

    mod.type = "sine";
    mod.frequency.setValueAtTime(freq * 2, noteStart);

    modGain.gain.setValueAtTime(freq * 0.5, noteStart);
    modGain.gain.exponentialRampToValueAtTime(1, noteStart + 1.2);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    noteGain.gain.setValueAtTime(0.24, noteStart);
    noteGain.gain.exponentialRampToValueAtTime(0.001, noteStart + 1.6);

    carrier.connect(noteGain);
    noteGain.connect(dest);

    mod.start(noteStart);
    carrier.start(noteStart);
    mod.stop(noteStart + 1.6);
    carrier.stop(noteStart + 1.6);
  });
}

export function playPowerupCollect(
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
  const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7

  notes.forEach((freq, idx) => {
    if (!ctx || !dest) return;
    const noteTime = now + idx * 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, noteTime);

    gain.gain.setValueAtTime(0.18, noteTime);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(noteTime);
    osc.stop(noteTime + 0.22);
  });
}

export function playShieldPop(
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

  osc.type = "sine";
  osc.frequency.setValueAtTime(380, now);
  osc.frequency.exponentialRampToValueAtTime(85, now + 0.14);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(dest);

  osc.start(now);
  osc.stop(now + 0.15);
}

export function playSpeedBoost(engine: AudioEngine, getDest: GetDestinationNodeFn): void {
  if (!engine.isSfxEnabled()) return;
  const ctx = engine.getContext();
  const dest = getDest();
  if (!ctx || !dest) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.35);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(320, now);
  filter.frequency.exponentialRampToValueAtTime(850, now + 0.35);

  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(now);
  osc.stop(now + 0.45);
}
