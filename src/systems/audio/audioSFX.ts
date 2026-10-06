import type { AudioEngine } from "./audioEngine";

export class AudioSFX {
  private engine: AudioEngine;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  /**
   * Calcula o balanceamento estéreo (-1.0 à esquerda, +1.0 à direita)
   * baseado na posição X do emissor sonoro relativa ao jogador.
   */
  public calcStereoPan(sourceX?: number, playerX?: number, halfWidth: number = 400): number {
    if (sourceX === undefined || playerX === undefined) return 0;
    if (isNaN(sourceX) || isNaN(playerX) || halfWidth <= 0) return 0;
    const rawPan = (sourceX - playerX) / halfWidth;
    return Math.max(-1, Math.min(1, rawPan));
  }

  /**
   * Obtém o nó de destino de áudio apropriado:
   * Se coordenadas espaciais forem fornecidas e StereoPannerNode estiver disponível,
   * cria um nó de pan estéreo conectado ao barramento sfxBus (ou masterGain).
   */
  public getDestinationNode(sourceX?: number, playerX?: number): AudioNode | null {
    const ctx = this.engine.getContext();
    if (!ctx) return null;

    const baseDest = this.engine.getSfxBus() || this.engine.getMasterGain();
    if (!baseDest) return null;

    if (
      sourceX !== undefined &&
      playerX !== undefined &&
      typeof ctx.createStereoPanner === "function"
    ) {
      try {
        const pan = this.calcStereoPan(sourceX, playerX);
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(pan, ctx.currentTime);
        panner.connect(baseDest);
        return panner;
      } catch {
        return baseDest;
      }
    }

    return baseDest;
  }

  public playUiClick() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode();
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

  public playSonarSound() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode();
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

  public playSonarEcho(delayMs: number = 60) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode();
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

  public playBlowholeSpout() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode();
    if (!ctx || !dest) return;

    const now = ctx.currentTime;
    const duration = 0.85;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(1400, now);
    bandpass.frequency.linearRampToValueAtTime(2800, now + 0.18);
    bandpass.frequency.exponentialRampToValueAtTime(650, now + duration);
    bandpass.Q.value = 4.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.48, now + 0.08);
    noiseGain.gain.exponentialRampToValueAtTime(0.18, now + 0.45);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(dest);

    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(95, now);
    subOsc.frequency.exponentialRampToValueAtTime(42, now + 0.4);

    subGain.gain.setValueAtTime(0.3, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    subGain.connect(dest);

    whiteNoise.start(now);
    subOsc.start(now);
    whiteNoise.stop(now + duration);
    subOsc.stop(now + 0.4);
  }

  public playStrokeThrust() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode();
    if (!ctx || !dest) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.18);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.18);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playKrillGulp(sourceX?: number, playerX?: number) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
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

  public playKrillChime(sourceX?: number, playerX?: number) {
    this.playKrillGulp(sourceX, playerX);
  }

  public playTrashThud(sourceX?: number, playerX?: number) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
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

  public playNetTangle(sourceX?: number, playerX?: number) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
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

  public playBreachLaunch() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode();
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

  public playWaterSplash(sourceX?: number, playerX?: number) {
    this.engine.init();
    this.engine.resumeIfSuspended();
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
    if (!ctx || !dest) return;

    const now = ctx.currentTime;

    const plungeOsc = ctx.createOscillator();
    const plungeGain = ctx.createGain();
    const plungeFilter = ctx.createBiquadFilter();

    plungeOsc.type = "triangle";
    plungeOsc.frequency.setValueAtTime(360, now);
    plungeOsc.frequency.exponentialRampToValueAtTime(95, now + 0.32);

    plungeFilter.type = "lowpass";
    plungeFilter.frequency.setValueAtTime(480, now);
    plungeFilter.frequency.exponentialRampToValueAtTime(120, now + 0.32);
    plungeFilter.Q.value = 3.5;

    plungeGain.gain.setValueAtTime(0.01, now);
    plungeGain.gain.linearRampToValueAtTime(0.5, now + 0.04);
    plungeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    plungeOsc.connect(plungeFilter);
    plungeFilter.connect(plungeGain);
    plungeGain.connect(dest);

    plungeOsc.start(now);
    plungeOsc.stop(now + 0.35);

    const noiseDuration = 0.5;
    const bufferSize = Math.floor(ctx.sampleRate * noiseDuration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(2200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(650, now + noiseDuration);
    noiseFilter.Q.value = 2.0;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.linearRampToValueAtTime(0.42, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);

    noiseSource.start(now);
    noiseSource.stop(now + noiseDuration);

    const playDroplet = (timeOffset: number, freq: number, vol: number) => {
      if (!ctx || !dest) return;
      const dropOsc = ctx.createOscillator();
      const dropGain = ctx.createGain();

      dropOsc.type = "sine";
      dropOsc.frequency.setValueAtTime(freq, now + timeOffset);
      dropOsc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + timeOffset + 0.06);

      dropGain.gain.setValueAtTime(vol, now + timeOffset);
      dropGain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.07);

      dropOsc.connect(dropGain);
      dropGain.connect(dest);

      dropOsc.start(now + timeOffset);
      dropOsc.stop(now + timeOffset + 0.07);
    };

    playDroplet(0.12, 1200, 0.14);
    playDroplet(0.19, 1650, 0.12);
    playDroplet(0.26, 950, 0.16);
    playDroplet(0.34, 1400, 0.09);
  }

  public playIceCrackSound(sourceX?: number, playerX?: number) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
    if (!ctx || !dest) return;

    const now = ctx.currentTime;

    const crackOsc = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crackOsc.type = "sawtooth";
    crackOsc.frequency.setValueAtTime(800, now);
    crackOsc.frequency.exponentialRampToValueAtTime(180, now + 0.18);

    crackGain.gain.setValueAtTime(0.38, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    crackOsc.connect(crackGain);
    crackGain.connect(dest);

    crackOsc.start(now);
    crackOsc.stop(now + 0.2);

    const noiseLen = 0.22;
    const bufSize = Math.floor(ctx.sampleRate * noiseLen);
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.value = 3.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);

    noiseSrc.start(now);
    noiseSrc.stop(now + noiseLen);
  }

  public playVictoryFanfare() {
    if (!this.engine.isSfxEnabled() && !this.engine.isMusicEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode();
    if (!ctx || !dest) return;

    const now = ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.14, t: 0 },
      { f: 659.25, d: 0.14, t: 0.14 },
      { f: 783.99, d: 0.14, t: 0.28 },
      { f: 1046.5, d: 0.45, t: 0.42 },
      { f: 880.0, d: 0.14, t: 0.9 },
      { f: 1046.5, d: 0.65, t: 1.05 },
    ];

    notes.forEach(({ f, t }) => {
      if (!ctx || !dest) return;
      const noteStart = now + t;
      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const noteGain = ctx.createGain();

      carrier.type = "sine";
      carrier.frequency.setValueAtTime(f, noteStart);

      mod.type = "triangle";
      mod.frequency.setValueAtTime(f * 2, noteStart);

      modGain.gain.setValueAtTime(f * 0.4, noteStart);
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

  public playOilChoke(sourceX?: number, playerX?: number) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
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
    gain.connect(dest);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.35);
    noise.stop(now + 0.35);
  }

  public playPurifyWhoosh(sourceX?: number, playerX?: number) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
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
    gain.connect(dest);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.5);
    noise.stop(now + 0.5);
  }

  public playDolphinClicks(sourceX?: number, playerX?: number) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
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

  public playPenguinChirp(sourceX?: number, playerX?: number) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
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

  public playShipHorn(sourceX?: number, playerX?: number) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
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

  public playPowerupCollect(sourceX?: number, playerX?: number) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
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

  public playShieldPop(sourceX?: number, playerX?: number) {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode(sourceX, playerX);
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

  public playSpeedBoost() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const dest = this.getDestinationNode();
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
}
