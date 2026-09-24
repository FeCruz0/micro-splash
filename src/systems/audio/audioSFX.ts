import type { AudioEngine } from "./audioEngine";

export class AudioSFX {
  private engine: AudioEngine;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  public playUiClick() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(1240, now + 0.05);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playSonarSound() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;

    const playFmPing = (time: number, volume: number) => {
      if (!ctx || !masterGain) return;

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
      carrierGain.connect(masterGain);

      modulator.start(time);
      carrier.start(time);
      modulator.stop(time + 0.32);
      carrier.stop(time + 0.32);
    };

    playFmPing(now, 0.32);
    playFmPing(now + 0.11, 0.1);
  }

  public playSonarEcho(delayMs: number = 60) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

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
    gain.connect(masterGain);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  public playBlowholeSpout() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;
    const duration = 0.85;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
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
    noiseGain.connect(masterGain);

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
    subGain.connect(masterGain);

    noiseSource.start(now);
    subOsc.start(now);
    noiseSource.stop(now + duration);
    subOsc.stop(now + 0.55);
  }

  public playStrokeThrust() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

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
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playKrillGulp() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

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
    gain.connect(masterGain);

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
    popGain.connect(masterGain);

    popOsc.start(now + 0.02);
    popOsc.stop(now + 0.12);
  }

  public playKrillChime() {
    this.playKrillGulp();
  }

  public playTrashThud() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

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
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playNetTangle() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

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
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playBreachLaunch() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

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
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 1.2);
  }

  public playWaterSplash() {
    this.engine.init();
    this.engine.resumeIfSuspended();
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

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
    plungeGain.connect(masterGain);
    plungeOsc.start(now);
    plungeOsc.stop(now + 0.35);

    const bufferSize = Math.floor(ctx.sampleRate * 0.45);
    const splashBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = splashBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const raw = Math.random() * 2 - 1;
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
    noiseGain.connect(masterGain);
    noiseSource.start(now);
    noiseSource.stop(now + 0.45);

    const bloops = [
      { delay: 0.04, freqStart: 540, freqEnd: 240, gain: 0.65 },
      { delay: 0.11, freqStart: 440, freqEnd: 200, gain: 0.55 },
      { delay: 0.19, freqStart: 620, freqEnd: 280, gain: 0.45 },
    ];

    bloops.forEach((b) => {
      if (!ctx || !masterGain) return;
      const dropTime = now + b.delay;
      const dropOsc = ctx.createOscillator();
      const dropGain = ctx.createGain();

      dropOsc.type = "sine";
      dropOsc.frequency.setValueAtTime(b.freqStart, dropTime);
      dropOsc.frequency.exponentialRampToValueAtTime(b.freqEnd, dropTime + 0.14);

      dropGain.gain.setValueAtTime(b.gain, dropTime);
      dropGain.gain.exponentialRampToValueAtTime(0.01, dropTime + 0.14);

      dropOsc.connect(dropGain);
      dropGain.connect(masterGain);
      dropOsc.start(dropTime);
      dropOsc.stop(dropTime + 0.14);
    });
  }

  public playIceCrackSound() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;

    const crackOsc = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crackOsc.type = "sawtooth";
    crackOsc.frequency.setValueAtTime(2400, now);
    crackOsc.frequency.exponentialRampToValueAtTime(320, now + 0.18);

    crackGain.gain.setValueAtTime(0.38, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    crackOsc.connect(crackGain);
    crackGain.connect(masterGain);
    crackOsc.start(now);
    crackOsc.stop(now + 0.18);

    const bufferSize = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
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
    noiseGain.connect(masterGain);
    noiseSource.start(now);
  }

  public playVictoryFanfare() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
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
      noteGain.connect(masterGain);

      mod.start(noteStart);
      carrier.start(noteStart);
      mod.stop(noteStart + 1.6);
      carrier.stop(noteStart + 1.6);
    });
  }

  public playOilChoke() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

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
      data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.05);
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
    gain.connect(masterGain);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.35);
    noise.stop(now + 0.35);
  }

  public playPurifyWhoosh() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.45);

    const bufferSize = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
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
    gain.connect(masterGain);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.5);
    noise.stop(now + 0.5);
  }

  public playDolphinClicks() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

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
      gain.connect(masterGain);

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
    wGain.connect(masterGain);

    wOsc.start(whistleStart);
    wOsc.stop(whistleStart + 0.3);
  }

  public playPenguinChirp() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

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
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playPowerupCollect() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;
    const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7

    notes.forEach((freq, idx) => {
      if (!ctx || !masterGain) return;
      const noteTime = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.22);
    });
  }

  public playShieldPop() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.14);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playSpeedBoost() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

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
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }
}
