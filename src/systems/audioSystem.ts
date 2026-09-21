/**
 * Sistema de Áudio Procedural - Micro Splash
 * Trilha Sonora Autêntica "Aquatic Ambiance" (David Wise / Donkey Kong Country SNES)
 * 
 * Arquitetura & Síntese Inspirada no SNES SPC700 & Korg Wavestation:
 * - Andamento & Tom: 75 BPM em Dó menor (C minor), o andamento e tom exatos da composição original
 *   de David Wise, produzindo a atmosfera característica "triste e inspiradora ao mesmo tempo".
 * - Linha de Baixo "Wavetable": Emulação do truque experimental de Wise no SNES com oscilador
 *   de 8 harmônicos e pulso líquido com filtro passa-baixa ressonante modulado (sem graves cortantes).
 * - Arpejos Híbridos (Harpa + Coral Formante): Textura etérea de correnteza subaquática combinando o
 *   ataque percussivo suave da harpa acústica (com micro-pitch drift orgânico) ao florescer celestial
 *   de um formante vocal/coral ("Oh/Ah"), eliminando sons agudos ou estridentes (tudo abaixo de 500Hz).
 * - Camadas Atmosféricas Korg Wavestation: Acordes estendidos (Cm9, Abmaj7#11 lídio, Fm9, Gm7)
 *   filtrados entre 260Hz e 480Hz para imersão oceânica profunda e aveludada.
 * - Percussão Submarina Orgânica: Shakers macios de bolhas e rim taps abafados.
 * - 100% sintetizado via Web Audio API procedimental, sem samples externos ou arquivos de áudio.
 */

import { BiomeMusicEngine } from "./audio/audioMusic";
export { BIOME_INDEX } from "./audio/audioMusic";

class AudioSystem {
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
  private lastWhaleSongTime: number = 0;
  private isMigrationAudioRunning: boolean = false;

  // Motor musical procedural Aquatic Ambience + 16-Bit Lofi Ocean
  private biomeEngine: BiomeMusicEngine = new BiomeMusicEngine();

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

  /**
   * Inicia a trilha sonora e os efeitos atmosféricos marinhos da migração
   */
  public startMigrationAudio(initialX: number = 0) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.resumeIfSuspended();

    this.isMigrationAudioRunning = true;

    // Inicia a ambiência de marés e correntes profundas se ainda não estiver ativa
    if (!this.ambientNoiseSource) {
      this.startAmbientOcean();
    } else if (this.ambientGain) {
      const targetGain = (!this.isMuted && this.musicEnabled) ? 0.30 : 0;
      this.ambientGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.2);
    }

    // Inicia o motor musical de bioma
    this.biomeEngine.init(this.ctx, this.masterGain);
    this.biomeEngine.setEnabled(!this.isMuted && this.musicEnabled);
    this.biomeEngine.updatePosition(initialX);
  }

  /**
   * Encerra a trilha sonora da migração ao retornar ao menu principal
   */
  public stopMigrationAudio() {
    this.isMigrationAudioRunning = false;
    this.pauseAmbient();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem("micro_splash_audio_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.volume === "number") this.volume = Math.max(1.0, parsed.volume);
        if (typeof parsed.musicEnabled === "boolean") this.musicEnabled = parsed.musicEnabled;
        if (typeof parsed.sfxEnabled === "boolean") this.sfxEnabled = parsed.sfxEnabled;
      }
    } catch {}
  }

  private saveSettings() {
    try {
      localStorage.setItem("micro_splash_audio_settings", JSON.stringify({
        volume: this.volume,
        musicEnabled: this.musicEnabled,
        sfxEnabled: this.sfxEnabled,
      }));
    } catch {}
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume * 1.35;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    this.saveSettings();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    this.biomeEngine.setEnabled(enabled && this.isMigrationAudioRunning);
    if (!enabled && this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    } else if (enabled && this.isMigrationAudioRunning && this.ambientGain && this.ctx && !this.isMuted) {
      this.ambientGain.gain.setTargetAtTime(0.20, this.ctx.currentTime, 0.05);
    }
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

  public playUiClick() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(1240, now + 0.05);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public resumeIfSuspended() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    if (!this.masterGain || !this.ctx) return this.isMuted;
    this.isMuted = !this.isMuted;
    const targetGain = this.isMuted ? 0 : this.volume * 1.35;
    this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public updateBiomeTrack(playerX: number) {
    this.biomeEngine.updatePosition(playerX);
  }

  public pauseAmbient() {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
    this.biomeEngine.pause();
  }

  public resumeAmbient() {
    if (!this.isMigrationAudioRunning || this.isMuted || !this.musicEnabled) return;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.2);
    }
    this.biomeEngine.resume();
  }

  public cleanup() {
    this.pauseAmbient();
    if (this.ambientNoiseSource) {
      try {
        this.ambientNoiseSource.stop();
      } catch {}
    }
    if (this.oceanLfo) {
      try {
        this.oceanLfo.stop();
      } catch {}
    }
  }

  /**
   * Ambiência de Marés e Correntes Oceânicas Profundas
   */
  private startAmbientOcean() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 1.5;
    }

    this.ambientNoiseSource = this.ctx.createBufferSource();
    this.ambientNoiseSource.buffer = noiseBuffer;
    this.ambientNoiseSource.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 240;
    lowpass.Q.value = 1.6;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.20;

    // LFO que modula as ondas e correntes oceânicas (~7.8s por ciclo de maré)
    this.oceanLfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    this.oceanLfo.frequency.value = 0.128;
    lfoGain.gain.value = 95;
    this.oceanLfo.connect(lfoGain);
    lfoGain.connect(lowpass.frequency);
    this.oceanLfo.start();

    this.ambientNoiseSource.connect(lowpass);
    lowpass.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    this.ambientNoiseSource.start();
  }

  /**
   * Canto Autêntico da Baleia-Jubarte (Síntese 16-bit SNES / Tracker)
   * Estruturado em 3 Patches principais orquestrados em frases A -> B -> C com eco abissal do oceano:
   * 1. Canal 1 (Assobio): Onda Sine limpa com ataque lento (1s), relaxamento longo (2s), vibrato constante (LFO),
   *    pitch bend subindo no 1º compasso e despencando lentamente ("chorando" até o final) - Frase A.
   * 2. Canal 2 (O Gemido / Cello): Onda Sine + Sawtooth tocadas duas oitavas abaixo, filtro passa-baixa severo
   *    com pitch sweep descendente lento imitando o tremor gutural da água vibrando - Frase B.
   * 3. Canal 3 (O Rangido): Onda Square ultragrave (C0) com pitch bend negativo extremo ("efeito zíper" biológico)
   *    imitando a desaceleração orgânica da baleia fechando a garganta - Frase C.
   * 4. Eco do SNES / Oceano: Delay de 180ms com alto feedback e filtro passa-baixa abafando agudos na escuridão.
   *
   * Disparo: Emitido SOMENTE quando o usuário usa o sonar (Shift/E) ou quando baleias próximas usam o sonar.
   */
  public playWhaleSong(volumeScale: number = 1.0, pitchShift: number = 1.0) {
    if ((!this.sfxEnabled && !this.musicEnabled) || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Evita sobreposição embolada se acionado em rápida sucessão (alinhado ao cooldown do sonar de 2.0s)
    if (now - this.lastWhaleSongTime < 1.9) return;
    this.lastWhaleSongTime = now;

    // =========================================================================
    // BARRAMENTO DE ECO OCEÂNICO DO SNES (Delay de 180ms com Low-pass de 420Hz)
    // =========================================================================
    const delayNode = this.ctx.createDelay(1.0);
    delayNode.delayTime.setValueAtTime(0.18, now);

    const feedbackGain = this.ctx.createGain();
    feedbackGain.gain.setValueAtTime(0.52, now); // Várias repetições com decaimento

    const echoFilter = this.ctx.createBiquadFilter();
    echoFilter.type = "lowpass";
    echoFilter.frequency.setValueAtTime(420, now); // Corta agudos para se perder no abismo
    echoFilter.Q.value = 1.2;

    const delayMasterGain = this.ctx.createGain();
    delayMasterGain.gain.setValueAtTime(0.25 * volumeScale, now);

    // Conexão do loop de eco
    delayNode.connect(echoFilter);
    echoFilter.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    echoFilter.connect(delayMasterGain);
    delayMasterGain.connect(this.masterGain);

    // Ganho seco (dry) da voz
    const dryGain = this.ctx.createGain();
    dryGain.gain.setValueAtTime(0.28 * volumeScale, now);
    dryGain.connect(this.masterGain);

    // Barramento de voz que alimenta dry e delay
    const vocalBus = this.ctx.createGain();
    vocalBus.gain.setValueAtTime(1.0, now);
    vocalBus.connect(dryGain);
    vocalBus.connect(delayNode);

    // =========================================================================
    // 1. CANAL 1 / FRASE A: LAMENTO LÍMPIDO (Assobio - Sine limpa com vibrato)
    // Início: t0. Duração: ~3.6s
    // Nota C4 (~261Hz) subindo suavemente a D4 (~295Hz) e caindo chorando até F3 (~175Hz)
    // =========================================================================
    const tA = now;
    const durA = 3.6;

    const oscA = this.ctx.createOscillator();
    const vibratoA = this.ctx.createOscillator();
    const vibratoGainA = this.ctx.createGain();
    const gainA = this.ctx.createGain();
    const filterA = this.ctx.createBiquadFilter();

    oscA.type = "sine";
    const baseFreqA = 261.63 * pitchShift;
    const peakFreqA = 295.00 * pitchShift;
    const endFreqA = 175.00 * pitchShift;

    oscA.frequency.setValueAtTime(baseFreqA, tA);
    oscA.frequency.exponentialRampToValueAtTime(peakFreqA, tA + 0.9);
    oscA.frequency.exponentialRampToValueAtTime(endFreqA, tA + durA);

    // Vibrato leve constante (LFO de ~4.6Hz)
    vibratoA.type = "sine";
    vibratoA.frequency.setValueAtTime(4.6, tA);
    vibratoGainA.gain.setValueAtTime(7.5, tA);
    vibratoA.connect(oscA.frequency);

    // Filtro formante aveludado (sem agudos cortantes)
    filterA.type = "lowpass";
    filterA.frequency.setValueAtTime(460, tA);
    filterA.Q.value = 1.6;

    // Ataque lento (1.0s), relaxamento longo (2.0s)
    gainA.gain.setValueAtTime(0.001, tA);
    gainA.gain.linearRampToValueAtTime(0.85, tA + 1.0);
    gainA.gain.exponentialRampToValueAtTime(0.5, tA + 2.0);
    gainA.gain.exponentialRampToValueAtTime(0.001, tA + durA);

    oscA.connect(filterA);
    filterA.connect(gainA);
    gainA.connect(vocalBus);

    vibratoA.start(tA);
    oscA.start(tA);
    vibratoA.stop(tA + durA);
    oscA.stop(tA + durA);

    // =========================================================================
    // 2. CANAL 2 / FRASE B: O MERGULHO CAVERNOSO (O Gemido / Cello Gutural)
    // Início: tB = tA + 3.2s. Duração: ~2.8s
    // Mix de Sine com Sawtooth 2 oitavas abaixo, passa-baixa severo (< 190Hz)
    // =========================================================================
    const tB = now + 3.2;
    const durB = 2.8;

    const oscSineB = this.ctx.createOscillator();
    const oscSawB = this.ctx.createOscillator();
    const gainB = this.ctx.createGain();
    const filterB = this.ctx.createBiquadFilter();

    oscSineB.type = "sine";
    oscSawB.type = "sawtooth";

    // Nota média-grave (G2 = 98Hz) com pitch sweep descendente lento
    const baseFreqB = 98.0 * pitchShift;
    const endFreqB = 54.0 * pitchShift;

    oscSineB.frequency.setValueAtTime(baseFreqB, tB);
    oscSineB.frequency.exponentialRampToValueAtTime(endFreqB, tB + durB);

    // Sawtooth 1 a 2 oitavas abaixo (~49Hz descendo a 27Hz)
    oscSawB.frequency.setValueAtTime(baseFreqB * 0.5, tB);
    oscSawB.frequency.exponentialRampToValueAtTime(endFreqB * 0.5, tB + durB);

    // Filtro passa-baixa severo para tremor gutural abafado e cavernoso da água
    filterB.type = "lowpass";
    filterB.frequency.setValueAtTime(190, tB);
    filterB.frequency.exponentialRampToValueAtTime(70, tB + durB);
    filterB.Q.value = 2.6;

    gainB.gain.setValueAtTime(0.001, tB);
    gainB.gain.linearRampToValueAtTime(0.9, tB + 0.45);
    gainB.gain.exponentialRampToValueAtTime(0.45, tB + 1.8);
    gainB.gain.exponentialRampToValueAtTime(0.001, tB + durB);

    oscSineB.connect(filterB);
    oscSawB.connect(filterB);
    filterB.connect(gainB);
    gainB.connect(vocalBus);

    oscSineB.start(tB);
    oscSawB.start(tB);
    oscSineB.stop(tB + durB);
    oscSawB.stop(tB + durB);

    // =========================================================================
    // 3. CANAL 3 / FRASE C: A PERCUSSÃO BIOLÓGICA (O Rangido / Estalos e Zíper)
    // Início: tC = tB + 2.2s. Sequência de estalos ultragraves desacelerando
    // =========================================================================
    const tC = tB + 2.2;
    const clickIntervals = [0, 0.11, 0.24, 0.40, 0.60];

    clickIntervals.forEach((offset, idx) => {
      if (!this.ctx) return;
      const clickTime = tC + offset;
      const clickDur = 0.07;

      const clickOsc = this.ctx.createOscillator();
      const clickFilter = this.ctx.createBiquadFilter();
      const clickGain = this.ctx.createGain();

      clickOsc.type = "square";
      // Extremo grave (C0) com pitch bend negativo extremo (efeito zíper orgânico)
      clickOsc.frequency.setValueAtTime(52 * pitchShift, clickTime);
      clickOsc.frequency.exponentialRampToValueAtTime(14, clickTime + clickDur);

      clickFilter.type = "lowpass";
      clickFilter.frequency.setValueAtTime(280, clickTime);
      clickFilter.Q.value = 2.0;

      const clickVol = 0.7 - idx * 0.1;
      clickGain.gain.setValueAtTime(0.001, clickTime);
      clickGain.gain.linearRampToValueAtTime(clickVol, clickTime + 0.005);
      clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + clickDur);

      clickOsc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(vocalBus);

      clickOsc.start(clickTime);
      clickOsc.stop(clickTime + clickDur);
    });

    // Cleanup dos nós de delay após a cauda de reverberação (~10.5s)
    setTimeout(() => {
      try {
        delayNode.disconnect();
        feedbackGain.disconnect();
        echoFilter.disconnect();
        delayMasterGain.disconnect();
        dryGain.disconnect();
        vocalBus.disconnect();
      } catch {}
    }, 10500);
  }

  /**
   * Biosonar 16-Bit Retrô (Shift / E / X)
   */
  public playSonarSound() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    const playFmPing = (time: number, volume: number) => {
      if (!this.ctx || !this.masterGain) return;

      const carrier = this.ctx.createOscillator();
      const modulator = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const carrierGain = this.ctx.createGain();
      const bandpass = this.ctx.createBiquadFilter();

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
      carrierGain.connect(this.masterGain);

      modulator.start(time);
      carrier.start(time);
      modulator.stop(time + 0.32);
      carrier.stop(time + 0.32);
    };

    playFmPing(now, 0.32);
    playFmPing(now + 0.11, 0.10);
  }

  /**
   * Eco de Retorno do Sonar (Reflexão Acústica de Objetos Detectados)
   */
  public playSonarEcho(delayMs: number = 60) {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

    const time = this.ctx.currentTime + delayMs / 1000;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

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
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  /**
   * Esguicho do Espiráculo (Blowhole Spout)
   * Síntese procedural de exalação potente e condensação de vapor marinho
   */
  public playBlowholeSpout() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const duration = 0.85;

    // 1. Jato de Ar Pressurizado (Ruído com varredura dinâmica passa-faixa)
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(2200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(650, now + 0.45);
    noiseFilter.Q.value = 2.4;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.12, now + 0.4);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // 2. Ressonância Sub-grave da Cavidade Corporal (30 toneladas de massa pulmonar)
    const subOsc = this.ctx.createOscillator();
    const subFilter = this.ctx.createBiquadFilter();
    const subGain = this.ctx.createGain();

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
    subGain.connect(this.masterGain);

    noiseSource.start(now);
    subOsc.start(now);
    noiseSource.stop(now + duration);
    subOsc.stop(now + 0.55);
  }

  /**
   * Batida de Nadadeira / Impulso de Nado (Espaço)
   */
  public playStrokeThrust() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

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
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Som de Alimentação de Krill - Engolida e Sucção Biológica
   */
  public playKrillGulp() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

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
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);

    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();

    popOsc.type = "sine";
    popOsc.frequency.setValueAtTime(180, now + 0.02);
    popOsc.frequency.exponentialRampToValueAtTime(75, now + 0.12);

    popGain.gain.setValueAtTime(0.001, now);
    popGain.gain.setValueAtTime(0.28, now + 0.03);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    popOsc.connect(popGain);
    popGain.connect(this.masterGain);

    popOsc.start(now + 0.02);
    popOsc.stop(now + 0.12);
  }

  public playKrillChime() {
    this.playKrillGulp();
  }

  /**
   * Colisão com Lixo Plástico - 16-Bit Percussive Thud
   */
  public playTrashThud() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

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
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Emaranhamento em Rede Fantasma - 16-Bit Frictional Saw
   */
  public playNetTangle() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

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
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Salto Majestoso (Breach) - Arrancada no céu
   */
  public playBreachLaunch() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

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
   * Reentrada Majestosa na Água (Splashdown 16-Bit Autêntico estilo SNES)
   */
  public playWaterSplash() {
    this.init();
    this.resumeIfSuspended();
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // 1. Corpo ressonante de mergulho aquático (Pitched "Ploosh" em frequências perfeitamente audíveis)
    const plungeOsc = this.ctx.createOscillator();
    const plungeGain = this.ctx.createGain();
    const plungeFilter = this.ctx.createBiquadFilter();

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
    plungeGain.connect(this.masterGain);
    plungeOsc.start(now);
    plungeOsc.stop(now + 0.35);

    // 2. Ruído estalado de espuma / borrifo 16-bits (Loud Quantized Noise Burst com filtro dinâmico)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
    const splashBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = splashBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const raw = Math.random() * 2 - 1;
      const quantized = Math.round(raw * 8) / 8; // Textura quantizada estilo chip de som 16-bit
      data[i] = quantized * Math.exp(-i / (bufferSize * 0.35));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = splashBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(2800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(450, now + 0.42);
    noiseFilter.Q.value = 1.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSource.start(now);
    noiseSource.stop(now + 0.45);

    // 3. Gotículas secundárias aquáticas ("Bloop/Gurgle" característico de 16-bits bem audível)
    const bloops = [
      { delay: 0.04, freqStart: 540, freqEnd: 240, gain: 0.65 },
      { delay: 0.11, freqStart: 440, freqEnd: 200, gain: 0.55 },
      { delay: 0.19, freqStart: 620, freqEnd: 280, gain: 0.45 },
    ];

    bloops.forEach((b) => {
      if (!this.ctx || !this.masterGain) return;
      const dropTime = now + b.delay;
      const dropOsc = this.ctx.createOscillator();
      const dropGain = this.ctx.createGain();

      dropOsc.type = "sine";
      dropOsc.frequency.setValueAtTime(b.freqStart, dropTime);
      dropOsc.frequency.exponentialRampToValueAtTime(b.freqEnd, dropTime + 0.14);

      dropGain.gain.setValueAtTime(b.gain, dropTime);
      dropGain.gain.exponentialRampToValueAtTime(0.01, dropTime + 0.14);

      dropOsc.connect(dropGain);
      dropGain.connect(this.masterGain);
      dropOsc.start(dropTime);
      dropOsc.stop(dropTime + 0.14);
    });
  }

  /**
   * Estilhaçamento de Gelo (Ice Crack / Shatter ao saltar e quebrar a camada)
   */
  public playIceCrackSound() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // 1. Estalido agudo de quebra de cristal
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = "sawtooth";
    crackOsc.frequency.setValueAtTime(2400, now);
    crackOsc.frequency.exponentialRampToValueAtTime(320, now + 0.18);

    crackGain.gain.setValueAtTime(0.38, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    crackOsc.connect(crackGain);
    crackGain.connect(this.masterGain);
    crackOsc.start(now);
    crackOsc.stop(now + 0.18);

    // 2. Ruído de estilhaçamento
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.25);
    filter.Q.value = 2.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.42, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSource.start(now);
  }

  /**
   * Fanfarra Triunfal ao Concluir a Migração com Sucesso
   */
  public playVictoryFanfare() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const noteStart = now + idx * 0.11;
      const carrier = this.ctx!.createOscillator();
      const mod = this.ctx!.createOscillator();
      const modGain = this.ctx!.createGain();
      const noteGain = this.ctx!.createGain();

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
      noteGain.connect(this.masterGain!);

      mod.start(noteStart);
      carrier.start(noteStart);
      mod.stop(noteStart + 1.6);
      carrier.stop(noteStart + 1.6);
    });
  }

  /**
   * Som de obstrução do espiráculo por mancha de óleo (tosse abafada / engasgo)
   */
  public playOilChoke() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.35);
    filter.Q.value = 3.5;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.05);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(400, now);
    noiseFilter.Q.value = 4.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    noise.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.35);
    noise.stop(now + 0.35);
  }

  /**
   * Som de desobstrução e purificação do espiráculo ao mergulhar fundo
   */
  public playPurifyWhoosh() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.45);

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.5);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.5);
    noise.stop(now + 0.5);
  }

  /**
   * Cliques e assobios agudos bioacústicos de golfinhos (16-bit)
   */
  public playDolphinClicks() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 4; i++) {
      const clickStart = now + i * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(2800 + i * 250, clickStart);
      osc.frequency.exponentialRampToValueAtTime(1600, clickStart + 0.035);

      gain.gain.setValueAtTime(0.18, clickStart);
      gain.gain.exponentialRampToValueAtTime(0.001, clickStart + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(clickStart);
      osc.stop(clickStart + 0.035);
    }

    const whistleStart = now + 0.18;
    const wOsc = this.ctx.createOscillator();
    const wGain = this.ctx.createGain();

    wOsc.type = "triangle";
    wOsc.frequency.setValueAtTime(2100, whistleStart);
    wOsc.frequency.exponentialRampToValueAtTime(3200, whistleStart + 0.12);
    wOsc.frequency.exponentialRampToValueAtTime(2400, whistleStart + 0.28);

    wGain.gain.setValueAtTime(0.16, whistleStart);
    wGain.gain.exponentialRampToValueAtTime(0.001, whistleStart + 0.30);

    wOsc.connect(wGain);
    wGain.connect(this.masterGain);

    wOsc.start(whistleStart);
    wOsc.stop(whistleStart + 0.30);
  }

  /**
   * Vocalização abissal ultra-grave de baixa frequência (Cachalote / Baleia-Azul)
   */
  public playAbyssalWhaleCall() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const carrier = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    carrier.type = "sine";
    carrier.frequency.setValueAtTime(70, now);
    carrier.frequency.exponentialRampToValueAtTime(95, now + 1.2);
    carrier.frequency.exponentialRampToValueAtTime(55, now + 2.8);

    mod.type = "sine";
    mod.frequency.setValueAtTime(4.5, now);
    modGain.gain.setValueAtTime(18, now);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(140, now);
    filter.Q.value = 2.2;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    mod.start(now);
    carrier.start(now);
    mod.stop(now + 3.0);
    carrier.stop(now + 3.0);
  }

  /**
   * Pio curto e alegre de pinguim saltando em arco (porpoising)
   */
  public playPenguinChirp() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);

    gain.gain.setValueAtTime(0.20, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Arpejo cristalino de coleta de power-up temporário
   */
  public playPowerupCollect() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const noteTime = now + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.22);
    });
  }

  /**
   * Estouro do escudo de bolhas ao absorver lixo marinho
   */
  public playShieldPop() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.14);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Zunido hidrodinâmico da correnteza favorável (tailwind)
   */
  public playSpeedBoost() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

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
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }
}

export const audioSystem = new AudioSystem();
