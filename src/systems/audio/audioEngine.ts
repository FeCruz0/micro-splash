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

  // Motor musical procedural Aquatic Ambience + 16-Bit Lofi Ocean
  public readonly biomeEngine: BiomeMusicEngine = new BiomeMusicEngine();

  public init() {
    if (this.isInitialized) return;

    this.loadSettings();

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume * 1.35;
      this.masterGain.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio não suportado neste navegador:", e);
    }
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterGain(): GainNode | null {
    return this.masterGain;
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
        if (typeof parsed.volume === "number") this.volume = Math.max(0, Math.min(1, parsed.volume));
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
    if (!this.ctx || !this.isMigrationAudioRunning) return;

    if (this.ambientWhaleTimer) {
      clearInterval(this.ambientWhaleTimer);
      this.ambientWhaleTimer = null;
    }

    if (this.soundtrackMode === "chiptune") {
      this.biomeEngine.setVolume(this.musicEnabled ? 0.38 : 0);
      if (this.ambientGain) {
        this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      }
    } else if (this.soundtrackMode === "ambient") {
      this.biomeEngine.setVolume(0);
      if (this.ambientGain) {
        this.ambientGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
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
        this.ambientGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      }
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume * 1.35, this.ctx.currentTime);
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

  public toggleMute(): boolean {
    this.init();
    if (!this.masterGain || !this.ctx) return false;
    this.resumeIfSuspended();

    this.isMuted = !this.isMuted;
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 1.35, this.ctx.currentTime);
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

  public pauseAmbient() {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    this.biomeEngine.stop();
  }

  public resumeAmbient() {
    if (!this.ctx || !this.masterGain) return;
    this.resumeIfSuspended();
    this.updateSoundtrackPlayback();
  }

  public cleanup() {
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

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
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
