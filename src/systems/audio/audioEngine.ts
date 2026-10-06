import { BiomeMusicEngine } from "./audioMusic";

export type SoundtrackMode = "chiptune" | "ambient" | "sfx_only";

export const SOUNDTRACK_MODE_LABELS: Record<SoundtrackMode, string> = {
  chiptune: "Trilha: 16-BIT DINÂMICA 🎶",
  ambient: "Trilha: AMBIENTE CONTEMPLATIVA 🌊",
  sfx_only: "Trilha: MODO FOCO (APENAS SFX) 🎧",
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private sfxBus: GainNode | null = null;
  private depthFilter: BiquadFilterNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private ambientGain: GainNode | null = null;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private oceanLfo: OscillatorNode | null = null;
  private volume: number = 1.0;
  private musicEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private isMigrationAudioRunning: boolean = false;
  private soundtrackMode: SoundtrackMode = "chiptune";
  private ambientWhaleTimer: any = null;
  private visibilityHandler: (() => void) | null = null;

  // Motor musical procedural Aquatic Ambience + 16-Bit Lofi Ocean
  public readonly biomeEngine: BiomeMusicEngine = new BiomeMusicEngine();

  public init() {
    if (this.isInitialized) return;

    this.loadSettings();

    if (typeof window === "undefined") return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();

      // 36.1 Limiter no Barramento Master (Threshold -6dB, ratio 12, attack 3ms, release 250ms)
      this.masterLimiter = this.ctx.createDynamicsCompressor();
      this.masterLimiter.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.masterLimiter.knee.setValueAtTime(0, this.ctx.currentTime);
      this.masterLimiter.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.masterLimiter.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume * 1.35, this.ctx.currentTime);

      // Conexão do grafo master: masterGain -> masterLimiter -> destination
      this.masterGain.connect(this.masterLimiter);
      this.masterLimiter.connect(this.ctx.destination);

      // 36.5 Configuração do barramento de SFX, Reverb Convolutivo e Filtro de Profundidade
      this.setupSfxBusAndReverb();

      // 36.6 Listener de Page Visibility API para pausa com aba oculta
      this.setupVisibilityListener();

      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio não suportado neste navegador:", e);
    }
  }

  private setupSfxBusAndReverb() {
    if (!this.ctx || !this.masterGain) return;

    try {
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Filtro passa-baixas hidrostático (superfície 8000Hz -> abismo 1200Hz)
      this.depthFilter = this.ctx.createBiquadFilter();
      this.depthFilter.type = "lowpass";
      this.depthFilter.frequency.setValueAtTime(8000, this.ctx.currentTime);
      this.depthFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

      this.sfxBus.connect(this.depthFilter);

      // Sinal direto (Dry) ~0.78
      this.reverbDryGain = this.ctx.createGain();
      this.reverbDryGain.gain.setValueAtTime(0.78, this.ctx.currentTime);
      this.depthFilter.connect(this.reverbDryGain);
      this.reverbDryGain.connect(this.masterGain);

      // Sinal com reverb convolutivo marinho (Wet) ~0.22
      this.reverbWetGain = this.ctx.createGain();
      this.reverbWetGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

      this.reverbConvolver = this.ctx.createConvolver();
      this.reverbConvolver.buffer = this.createUnderwaterImpulseResponse(this.ctx, 1.8, 3.2);

      this.depthFilter.connect(this.reverbConvolver);
      this.reverbConvolver.connect(this.reverbWetGain);
      this.reverbWetGain.connect(this.masterGain);
    } catch (e) {
      console.warn("Erro ao configurar barramento de SFX e reverb:", e);
    }
  }

  public createUnderwaterImpulseResponse(
    ctx: AudioContext,
    duration: number = 1.8,
    decay: number = 3.2
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.exp(-t * decay);
      // Atenuação suave de frequências muito altas na cauda simulando absorção na água salgada
      const highFreqDamping = 1 - 0.45 * t;
      left[i] = (Math.random() * 2 - 1) * env * highFreqDamping;
      right[i] = (Math.random() * 2 - 1) * env * highFreqDamping;
    }
    return impulse;
  }

  public updateDepthAcoustics(playerY: number, maxDepth: number = 360) {
    if (!this.depthFilter || !this.ctx || this.ctx.state === "closed") return;
    const surfaceY = 80; // GAME_CONFIG.SEA_LEVEL
    const abyssY = Math.max(surfaceY + 80, maxDepth - 40);
    const t = Math.max(0, Math.min(1, (playerY - surfaceY) / (abyssY - surfaceY)));
    const targetFreq = 8000 - t * (8000 - 1200);
    this.depthFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
  }

  private setupVisibilityListener() {
    if (typeof document === "undefined" || this.visibilityHandler) return;

    this.visibilityHandler = () => {
      if (!this.ctx || this.ctx.state === "closed") return;

      if (document.hidden) {
        if (this.ctx.state === "running") {
          this.ctx.suspend().catch(() => {});
        }
      } else {
        if (this.isMigrationAudioRunning && !this.isMuted) {
          if (this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => {});
          }
        }
      }
    };

    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  private removeVisibilityListener() {
    if (typeof document === "undefined" || !this.visibilityHandler) return;
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.visibilityHandler = null;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  public getMasterLimiter(): DynamicsCompressorNode | null {
    return this.masterLimiter;
  }

  public getSfxBus(): GainNode | null {
    return this.sfxBus;
  }

  public getDepthFilter(): BiquadFilterNode | null {
    return this.depthFilter;
  }

  public getReverbConvolver(): ConvolverNode | null {
    return this.reverbConvolver;
  }

  public getReverbDryGain(): GainNode | null {
    return this.reverbDryGain;
  }

  public getReverbWetGain(): GainNode | null {
    return this.reverbWetGain;
  }

  public isReady(): boolean {
    return Boolean(this.ctx && this.masterGain);
  }

  public startMigrationAudio(initialX: number = 0, onAmbientWhale?: () => void) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.resumeIfSuspended();

    this.isMigrationAudioRunning = true;

    if (!this.ambientNoiseSource) {
      this.startAmbientOcean();
    }

    this.biomeEngine.init(this.ctx, this.masterGain);
    this.biomeEngine.updatePosition(initialX);

    this.updateSoundtrackPlayback(onAmbientWhale);
  }

  public stopMigrationAudio() {
    this.isMigrationAudioRunning = false;
    if (this.ambientWhaleTimer) {
      clearInterval(this.ambientWhaleTimer);
      this.ambientWhaleTimer = null;
    }
    this.pauseAmbient();
  }

  public loadSettings() {
    try {
      if (typeof localStorage === "undefined") return;
      const saved = localStorage.getItem("micro_splash_audio_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.volume === "number")
          this.volume = Math.max(0, Math.min(1, parsed.volume));
        if (typeof parsed.musicEnabled === "boolean") this.musicEnabled = parsed.musicEnabled;
        if (typeof parsed.sfxEnabled === "boolean") this.sfxEnabled = parsed.sfxEnabled;
        if (
          parsed.soundtrackMode === "chiptune" ||
          parsed.soundtrackMode === "ambient" ||
          parsed.soundtrackMode === "sfx_only"
        ) {
          this.soundtrackMode = parsed.soundtrackMode;
        }
      }
    } catch {}
  }

  public saveSettings() {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(
        "micro_splash_audio_settings",
        JSON.stringify({
          volume: this.volume,
          musicEnabled: this.musicEnabled,
          sfxEnabled: this.sfxEnabled,
          soundtrackMode: this.soundtrackMode,
        })
      );
    } catch {}
  }

  public getSoundtrackMode(): SoundtrackMode {
    return this.soundtrackMode;
  }

  public setSoundtrackMode(mode: SoundtrackMode, onAmbientWhale?: () => void) {
    this.soundtrackMode = mode;
    this.updateSoundtrackPlayback(onAmbientWhale);
    this.saveSettings();
  }

  public cycleNextSoundtrackMode(onAmbientWhale?: () => void): SoundtrackMode {
    const modes: SoundtrackMode[] = ["chiptune", "ambient", "sfx_only"];
    const currentIdx = modes.indexOf(this.soundtrackMode);
    const nextIdx = (currentIdx + 1) % modes.length;
    const nextMode = modes[nextIdx];
    this.setSoundtrackMode(nextMode, onAmbientWhale);
    return nextMode;
  }

  public getSoundtrackModeLabel(): string {
    return SOUNDTRACK_MODE_LABELS[this.soundtrackMode] || SOUNDTRACK_MODE_LABELS.chiptune;
  }

  public updateSoundtrackPlayback(onAmbientWhale?: () => void) {
    if (!this.ctx || !this.isMigrationAudioRunning || this.ctx.state === "closed") return;

    if (this.ambientWhaleTimer) {
      clearInterval(this.ambientWhaleTimer);
      this.ambientWhaleTimer = null;
    }

    // 36.3 Crossfade gradual de ~0.6s entre modos (3 constantes de tempo = 0.6s)
    const fadeConstant = 0.2;

    if (this.soundtrackMode === "chiptune") {
      this.biomeEngine.setVolume(this.musicEnabled ? 0.38 : 0);
      if (this.ambientGain) {
        this.ambientGain.gain.setTargetAtTime(0.04, this.ctx.currentTime, fadeConstant);
      }
    } else if (this.soundtrackMode === "ambient") {
      this.biomeEngine.setVolume(0);
      if (this.ambientGain) {
        this.ambientGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, fadeConstant);
      }
      if (onAmbientWhale) {
        onAmbientWhale();
        this.ambientWhaleTimer = setInterval(() => {
          if (this.soundtrackMode === "ambient" && this.isMigrationAudioRunning) {
            onAmbientWhale();
          }
        }, 11000);
      }
    } else if (this.soundtrackMode === "sfx_only") {
      this.biomeEngine.setVolume(0);
      if (this.ambientGain) {
        this.ambientGain.gain.setTargetAtTime(0.015, this.ctx.currentTime, fadeConstant);
      }
    }
  }

  // 36.2 Rampa de ganho sem estalos (setTargetAtTime 50ms)
  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && this.ctx.state !== "closed" && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume * 1.35, this.ctx.currentTime, 0.05);
    }
    this.saveSettings();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    this.updateSoundtrackPlayback();
    this.saveSettings();
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    this.saveSettings();
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public resumeIfSuspended() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // 36.2 Rampa de ganho no mudo sem estalos (setTargetAtTime 50ms)
  public toggleMute(): boolean {
    this.init();
    if (!this.masterGain || !this.ctx || this.ctx.state === "closed") return false;
    this.resumeIfSuspended();

    this.isMuted = !this.isMuted;
    this.masterGain.gain.setTargetAtTime(
      this.isMuted ? 0 : this.volume * 1.35,
      this.ctx.currentTime,
      0.05
    );
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public updateBiomeTrack(playerX: number) {
    if (this.soundtrackMode === "chiptune" && this.musicEnabled) {
      this.biomeEngine.updatePosition(playerX);
    }
  }

  // 36.2 Rampa suave ao silenciar ambiência sem cliques
  public pauseAmbient() {
    if (this.ambientGain && this.ctx && this.ctx.state !== "closed") {
      this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    this.biomeEngine.stop();
  }

  public resumeAmbient() {
    if (!this.ctx || !this.masterGain) return;
    this.resumeIfSuspended();
    this.updateSoundtrackPlayback();
  }

  public cleanup() {
    this.removeVisibilityListener();
    this.stopMigrationAudio();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
    this.isInitialized = false;
  }

  private startAmbientOcean() {
    if (!this.ctx || !this.masterGain) return;

    try {
      const bufferSize = this.ctx.sampleRate * 4;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      // 36.7 Loop de ruído oceânico sem costura: crossfade de ~50ms entre fim e início do buffer
      const crossfadeSamples = Math.floor(this.ctx.sampleRate * 0.05); // ~50ms
      for (let i = 0; i < crossfadeSamples; i++) {
        const t = i / crossfadeSamples;
        const endIdx = bufferSize - crossfadeSamples + i;
        const blended = output[i] * t + output[endIdx] * (1 - t);
        output[i] = blended;
        output[endIdx] = blended;
      }

      this.ambientNoiseSource = this.ctx.createBufferSource();
      this.ambientNoiseSource.buffer = noiseBuffer;
      this.ambientNoiseSource.loop = true;

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 320;
      lowpass.Q.value = 1.8;

      this.oceanLfo = this.ctx.createOscillator();
      this.oceanLfo.frequency.value = 0.11;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 110;
      this.oceanLfo.connect(lfoGain);
      lfoGain.connect(lowpass.frequency);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.04;

      this.ambientNoiseSource.connect(lowpass);
      lowpass.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      this.oceanLfo.start();
      this.ambientNoiseSource.start();
    } catch (e) {
      console.warn("Erro ao iniciar ambiência oceânica:", e);
    }
  }
}
