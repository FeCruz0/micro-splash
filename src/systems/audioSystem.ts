/**
 * Sistema de Áudio Procedural - Micro Splash
 * Utiliza Web Audio API nativa para síntese sonora submarina:
 * - Ambiência marinha e cantos reais de baleia-jubarte (Mysticeti)
 * - SFX de sonar/ecolocalização, alimentação, colisões e salto majestoso
 * - 100% offline, sem dependência de arquivos externos ou falhas de rede.
 */

class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private ambientGain: GainNode | null = null;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private whaleSongTimer: any = null;

  /**
   * Inicializa o contexto de áudio após a primeira interação do usuário
   * (exigência das políticas de autoplay dos navegadores).
   */
  public init() {
    if (this.isInitialized) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);

      this.isInitialized = true;

      // Inicia a faixa ambiente de fundo
      this.startAmbientOcean();
    } catch (e) {
      console.warn("Web Audio não suportado neste navegador:", e);
    }
  }

  public resumeIfSuspended() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    if (!this.masterGain || !this.ctx) return this.isMuted;
    this.isMuted = !this.isMuted;
    const targetGain = this.isMuted ? 0 : 0.6;
    this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public pauseAmbient() {
    if (this.whaleSongTimer) {
      clearTimeout(this.whaleSongTimer);
      this.whaleSongTimer = null;
    }
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
  }

  public resumeAmbient() {
    if (this.isMuted) return;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0.28, this.ctx.currentTime, 0.2);
    }
    if (!this.whaleSongTimer && this.isInitialized) {
      this.scheduleWhaleSong();
    }
  }

  public cleanup() {
    this.pauseAmbient();
    if (this.ambientNoiseSource) {
      try {
        this.ambientNoiseSource.stop();
      } catch {}
    }
  }

  /**
   * Trilha ambiente contínua: ruído marinho filtrado (ondas/profundidade)
   * e cantos esparsos e ressonantes de baleias no fundo.
   */
  private startAmbientOcean() {
    if (!this.ctx || !this.masterGain) return;

    // 1. Gerador de Ruído Marinho Submerso (Brown/Pink Noise filtrado)
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Filtro browniano para simular o rugido calmo das profundezas
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 1.8;
    }

    this.ambientNoiseSource = this.ctx.createBufferSource();
    this.ambientNoiseSource.buffer = noiseBuffer;
    this.ambientNoiseSource.loop = true;

    // Filtro passa-baixa para som subaquático (abafado e profundo)
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 280;
    lowpass.Q.value = 2;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.28;

    this.ambientNoiseSource.connect(lowpass);
    lowpass.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    this.ambientNoiseSource.start();

    // 2. Disparo periódico do Canto de Baleia de Fundo
    this.scheduleWhaleSong();
  }

  private scheduleWhaleSong() {
    if (this.whaleSongTimer) return;
    const delay = 9000 + Math.random() * 7000;
    this.whaleSongTimer = setTimeout(() => {
      this.whaleSongTimer = null;
      if (!this.isMuted && this.ctx && this.ctx.state === "running") {
        this.playWhaleSong();
      }
      this.scheduleWhaleSong();
    }, delay);
  }

  /**
   * Canto de Baleia-Jubarte (Vocalização Mística)
   * Glissando senoidal modulado com harmônicos e vibrato.
   */
  public playWhaleSong() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // LFO de Vibrato natural
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.value = 4.5;
    vibratoGain.gain.value = 12;
    vibrato.connect(osc.frequency);
    vibrato.start(now);
    vibrato.stop(now + 3.2);

    osc.type = "sine";
    // Glissando clássico de jubarte: sobe, modula e desce suavemente
    const startFreq = 160 + Math.random() * 40;
    const peakFreq = startFreq + 100 + Math.random() * 60;
    const endFreq = startFreq - 30;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 1.2);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 2.8);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(280, now);
    filter.Q.value = 3.5;

    // Envelope suave
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 3.2);
  }

  /**
   * Pulso de Ecolocalização / Sonar (Shift / E)
   * Sweep rápido descendente com ressonância metálica/aquática.
   */
  public playSonarSound() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1150, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.35);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(750, now);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  /**
   * Som de coleta e nutrição de Krill
   * Acorde cintilante ascendente (E5 -> B5).
   */
  public playKrillChime() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const notes = [659.25, 987.77]; // E5, B5

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.07;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  /**
   * Som de colisão com lixo plástico
   * Batida surda subaquática com desaceleração.
   */
  public playTrashThud() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Som de emaranhamento na rede de pesca fantasma
   */
  public playNetTangle() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.2);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Salto Majestoso (Breach) - Arrancada / Vôo no céu
   * Rugido de ar, canto agudo ascendente e libertação.
   */
  public playBreachLaunch() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.9);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.2);
  }

  /**
   * Splash de Reentrada na Água após o Salto Majestoso
   * Estrondo de baixa frequência e explosão de espuma.
   */
  public playWaterSplash() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Sub-grave de impacto na água
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(95, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.8);
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.8);

    // Ruído de borrifo de água
    const bufferSize = this.ctx.sampleRate * 0.8;
    const splashBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = splashBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = splashBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(180, now + 0.7);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + 0.8);
  }

  /**
   * Fanfarra Triunfal ao Concluir a Migração com Sucesso
   */
  public playVictoryFanfare() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Acordes comemorativos: C4 -> E4 -> G4 -> C5 (brilho majestoso)
    const chord = [261.63, 329.63, 392.0, 523.25, 659.25];

    chord.forEach((freq, idx) => {
      const noteStart = now + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.28, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 1.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteStart);
      osc.stop(noteStart + 1.4);
    });
  }
}

// Instância Singleton compartilhada
export const audioSystem = new AudioSystem();
