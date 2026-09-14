/**
 * Sistema de Áudio Procedural - Micro Splash
 * "Aquatic Ambience" (David Wise / Donkey Kong Country) + 16-Bit Lofi Ocean Waves
 * 
 * Elementos de Síntese Procedural:
 * - Acordes flutuantes característicos com 7ª, 9ª e 11ª aumentada (Fmaj9#11, Em7, Dm9, Am9)
 * - Timbre clássico de Flauta de Pã / Sopros de Garrafa (Bottle Blow / Pan Flute) com ar e vibrato
 * - Arpejos cintilantes de gotas de vidro e sinos de cristal (Glass Chimes / Music Box)
 * - Baixo subaquático aveludado estilo fretless bass com ataque orgânico
 * - Shakers suaves de bolhas e respiração contínua de marés oceânicas
 * - Cantos ressonantes de baleia-jubarte perfeitamente harmonizados
 * - Efeitos sonoros 16-bit nativos (biosonar FM, deglutição biológica de krill, impulso)
 * - 100% sintetizado via Web Audio API, sem qualquer arquivo externo de áudio.
 */

export const BIOME_INDEX = {
  ANTARCTICA: 0,   // 0m - 5.000m (Polar Aquatic Ambience: Dm9, Bbmaj7#11, Gm9, Asus4)
  OCEAN: 1,        // 5.000m - 12.000m (Aquatic Ambience Clássico: Fmaj9#11, Em7, Dm9, Am9)
  URBAN: 2,        // 12.000m - 19.000m (Rainy Harbor Ambience: Dm9, Gm7, Fmaj7, Asus4)
  ARRAIAL: 3,      // 19.000m - 27.000m (Sunken Coral Sanctuary: Amaj9, F#m11, Dmaj9#11, E6/9)
} as const;

interface BiomeHarmony {
  bass: number;
  bassAlt: number;
  pad: number[];
  fluteNote: number;
  chimes: number[];
}

/**
 * Motor Musical Aquatic Ambience & 16-Bit Lofi Ocean
 */
class BiomeMusicEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private isRunning: boolean = false;
  private currentBiome: number = BIOME_INDEX.ANTARCTICA;
  private currentBar: number = 0;
  private step: number = 0;
  private nextStepTime: number = 0;
  private timerId: any = null;

  // Andamento clássico de Aquatic Ambience: 72 BPM (~0.208s por 16th step)
  private readonly stepDuration: number = (60 / 72) / 4;

  // Harmonias, melodias de flauta e arpejos de cristal por bioma
  private readonly biomeScores: Record<number, BiomeHarmony[]> = {
    // 1. Antártica: Polar Aquatic Ambience (Gelo, solidão majestosa e água polar cristalina)
    [BIOME_INDEX.ANTARCTICA]: [
      { bass: 73.42, bassAlt: 110.00, pad: [146.83, 174.61, 220.00, 261.63, 329.63], fluteNote: 587.33, chimes: [587.33, 880.00, 1046.50, 1174.66] }, // Dm9 | Flauta: D5
      { bass: 58.27, bassAlt: 87.31,  pad: [116.54, 146.83, 174.61, 220.00, 311.13], fluteNote: 698.46, chimes: [698.46, 880.00, 1046.50, 1244.51] }, // Bbmaj7#11 | Flauta: F5
      { bass: 49.00, bassAlt: 73.42,  pad: [98.00, 116.54, 146.83, 174.61, 220.00],  fluteNote: 659.25, chimes: [587.33, 783.99, 987.77, 1174.66] },  // Gm9 | Flauta: E5
      { bass: 55.00, bassAlt: 82.41,  pad: [110.00, 146.83, 164.81, 196.00, 293.66], fluteNote: 587.33, chimes: [440.00, 659.25, 880.00, 1046.50] }, // A7sus4 | Flauta: D5
    ],

    // 2. Travessia Oceânica: O Verdadeiro "Aquatic Ambience" de David Wise (Fmaj9#11 -> Em7 -> Dm9 -> Am9)
    [BIOME_INDEX.OCEAN]: [
      // Fmaj9#11: F, A, C, E, G, B (A nota B natural cria a sensação mágica de flutuação lídia subaquática)
      { bass: 43.65, bassAlt: 65.41,  pad: [87.31, 130.81, 164.81, 196.00, 246.94, 329.63], fluteNote: 659.25, chimes: [659.25, 783.99, 987.77, 1318.51] }, // Flauta: E5
      // Em7: E, G, B, D
      { bass: 41.20, bassAlt: 61.74,  pad: [82.41, 123.47, 164.81, 196.00, 246.94, 293.66], fluteNote: 587.33, chimes: [587.33, 783.99, 987.77, 1174.66] }, // Flauta: D5
      // Dm9: D, F, A, C, E
      { bass: 36.71, bassAlt: 55.00,  pad: [73.42, 110.00, 146.83, 174.61, 220.00, 261.63], fluteNote: 523.25, chimes: [523.25, 698.46, 880.00, 1046.50] }, // Flauta: C5
      // Am9: A, C, E, G, B
      { bass: 55.00, bassAlt: 82.41,  pad: [110.00, 130.81, 164.81, 196.00, 246.94],         fluteNote: 493.88, chimes: [493.88, 659.25, 783.99, 987.77] },  // Flauta: B4 -> Am
    ],

    // 3. Costa Urbana: Rainy Harbor Ambience (Aconchegante, nostálgico, névoa e reflexão)
    [BIOME_INDEX.URBAN]: [
      { bass: 73.42, bassAlt: 110.00, pad: [146.83, 174.61, 220.00, 261.63], fluteNote: 587.33, chimes: [587.33, 698.46, 880.00, 1046.50] }, // Dm7
      { bass: 49.00, bassAlt: 73.42,  pad: [98.00, 116.54, 146.83, 174.61],  fluteNote: 659.25, chimes: [698.46, 880.00, 1046.50, 1174.66] }, // Gm7
      { bass: 43.65, bassAlt: 65.41,  pad: [87.31, 110.00, 130.81, 164.81],  fluteNote: 523.25, chimes: [523.25, 659.25, 880.00, 1046.50] }, // Fmaj7
      { bass: 55.00, bassAlt: 82.41,  pad: [110.00, 146.83, 164.81, 196.00], fluteNote: 440.00, chimes: [440.00, 587.33, 880.00, 1046.50] }, // Asus4
    ],

    // 4. Santuário de Arraial: Sunken Coral Sanctuary (Raios de sol submersos, águas turquesas, radiante)
    [BIOME_INDEX.ARRAIAL]: [
      // Amaj9: A, C#, E, G#, B
      { bass: 55.00, bassAlt: 82.41,  pad: [110.00, 138.59, 164.81, 207.65, 246.94], fluteNote: 659.25, chimes: [659.25, 830.61, 987.77, 1318.51] }, // Flauta: E5
      // F#m11: F#, A, C#, E, B
      { bass: 46.25, bassAlt: 69.30,  pad: [92.50, 110.00, 138.59, 164.81, 246.94],  fluteNote: 739.99, chimes: [739.99, 880.00, 1108.73, 1479.98] }, // Flauta: F#5
      // Dmaj9#11: D, F#, A, C#, G# (Brilho lídio solar)
      { bass: 36.71, bassAlt: 55.00,  pad: [73.42, 110.00, 146.83, 185.00, 220.00, 277.18], fluteNote: 880.00, chimes: [880.00, 1108.73, 1318.51, 1760.00] }, // Flauta: A5
      // E6/9: E, G#, B, C#, F#
      { bass: 41.20, bassAlt: 61.74,  pad: [82.41, 123.47, 164.81, 185.00, 246.94],  fluteNote: 659.25, chimes: [659.25, 830.61, 987.77, 1318.51] }, // Flauta: E5
    ],
  };

  public init(ctx: AudioContext, masterGain: GainNode) {
    this.ctx = ctx;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.32; // Volume ideal e envolvente
    this.musicGain.connect(masterGain);

    this.start();
  }

  public updatePosition(playerX: number) {
    let targetBiome: number = BIOME_INDEX.ANTARCTICA;
    if (playerX >= 19000) {
      targetBiome = BIOME_INDEX.ARRAIAL;
    } else if (playerX >= 12000) {
      targetBiome = BIOME_INDEX.URBAN;
    } else if (playerX >= 5000) {
      targetBiome = BIOME_INDEX.OCEAN;
    } else {
      targetBiome = BIOME_INDEX.ANTARCTICA;
    }

    if (this.currentBiome !== targetBiome) {
      this.currentBiome = targetBiome;
    }
  }

  public start() {
    if (this.isRunning || !this.ctx) return;
    this.isRunning = true;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.scheduleLoop();
  }

  public pause() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
  }

  public resume() {
    if (this.isRunning || !this.ctx || !this.musicGain) return;
    this.isRunning = true;
    this.musicGain.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.2);
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.scheduleLoop();
  }

  private scheduleLoop() {
    if (!this.isRunning || !this.ctx) return;

    const lookahead = 0.22;
    while (this.nextStepTime < this.ctx.currentTime + lookahead) {
      this.playStep(this.currentBiome, this.currentBar, this.step, this.nextStepTime);
      this.nextStepTime += this.stepDuration;

      this.step++;
      if (this.step >= 16) {
        this.step = 0;
        this.currentBar = (this.currentBar + 1) % 4;
      }
    }

    this.timerId = setTimeout(() => this.scheduleLoop(), 50);
  }

  /**
   * Executa a grade rítmica e harmônica inspirada em Aquatic Ambience
   */
  private playStep(biome: number, bar: number, step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;

    const harmony = this.biomeScores[biome]?.[bar] || this.biomeScores[BIOME_INDEX.OCEAN][0];

    // Passo 0 (Tempo 1): Entrada do Acorde Atmosférico (Wavestation Pad) e Baixo Fretless
    if (step === 0) {
      this.synthAquaticPad(harmony.pad, time, 3.4);
      this.synthFretlessBass(harmony.bass, time, 1.8);
    }

    // Passo 2: Início do Arpejo de Gotas de Vidro (Glass Chime Cascade)
    if (step === 2 && harmony.chimes[0]) {
      this.synthGlassChime(harmony.chimes[0], time, 1.0);
    }
    if (step === 3 && harmony.chimes[1]) {
      this.synthGlassChime(harmony.chimes[1], time, 0.9);
    }

    // Passo 4 (Tempo 2): Entrada solene da Flauta de Pã / Bottle Blow de David Wise
    if (step === 4) {
      this.synthPanFlute(harmony.fluteNote, time, 2.2);
      this.synthSoftLofiRim(time);
    }

    // Passo 6: Sub-baixo syncopado estilo David Wise (quinta no contra-tempo)
    if (step === 6) {
      this.synthFretlessBass(harmony.bassAlt, time, 1.2, 0.22);
    }

    // Passo 8 (Tempo 3): Brilho secundário de sinos de cristal
    if (step === 8 && harmony.chimes[2]) {
      this.synthGlassChime(harmony.chimes[2], time, 1.1);
    }
    if (step === 10 && harmony.chimes[3]) {
      this.synthGlassChime(harmony.chimes[3], time, 1.0);
    }

    // Passo 12 (Tempo 4): Toque sutil de rim tap e resolução da flauta
    if (step === 12) {
      this.synthSoftLofiRim(time);
    }

    // Passos pares (2, 6, 10, 14): Shaker subaquático suave de bolhas
    if (step % 4 === 2) {
      this.synthBubbleShaker(time);
    }
  }

  // =========================================================================
  // INSTRUMENTAÇÃO CLÁSSICA DE "AQUATIC AMBIENCE" (WAVESTATION / SNES SPC700)
  // =========================================================================

  /**
   * 1. Pad Atmosférico Oceânico (Inspirado no Korg Wavestation / Ski Jam de David Wise)
   * Dupla camada estéreo de ondas dente-de-serra e senoidais com filtro passa-baixa analógico
   */
  private synthAquaticPad(frequencies: number[], time: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;

    frequencies.forEach((freq, idx) => {
      const noteTime = time + idx * 0.02;

      // Camada 1: Senoidal pura para calor e corpo submerso
      const oscA = this.ctx!.createOscillator();
      // Camada 2: Triangular/Serra suave com detune para textura rica e cintilante
      const oscB = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      oscA.type = "sine";
      oscA.frequency.setValueAtTime(freq, noteTime);

      oscB.type = "triangle";
      oscB.frequency.setValueAtTime(freq, noteTime);
      oscB.detune.setValueAtTime(6, noteTime); // Chorus analógico natural

      // Filtro passa-baixa que se abre suavemente como luz solar através da água
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(420, noteTime);
      filter.frequency.linearRampToValueAtTime(750, noteTime + 1.2);
      filter.frequency.exponentialRampToValueAtTime(320, noteTime + duration);
      filter.Q.value = 1.4;

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.065, noteTime + 0.4); // Entrada gradual
      gain.gain.exponentialRampToValueAtTime(0.04, noteTime + 1.8);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

      oscA.connect(filter);
      oscB.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain!);

      oscA.start(noteTime);
      oscB.start(noteTime);
      oscA.stop(noteTime + duration);
      oscB.stop(noteTime + duration);
    });
  }

  /**
   * 2. Flauta de Pã / Sopros de Garrafa (Pan Flute / Bottle Blow de David Wise)
   * Onda triangular com componente de ar filtrado (narrow band noise) e vibrato atrasado
   */
  private synthPanFlute(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Portamento natural (glissando sutil para a nota)
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq * 0.97, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.06);

    // Vibrato expressivo que entra após 0.25s (assinatura do SNES de David Wise)
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.setValueAtTime(4.8, time);
    vibratoGain.gain.setValueAtTime(0, time);
    vibratoGain.gain.linearRampToValueAtTime(4.5, time + 0.35); // Entrada atrasada do vibrato
    vibrato.connect(osc.frequency);
    vibrato.start(time);
    vibrato.stop(time + duration);

    // Filtro formante para simular o corpo oco da madeira/garrafa
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, time);
    filter.Q.value = 3.5;

    oscGain.gain.setValueAtTime(0.001, time);
    oscGain.gain.linearRampToValueAtTime(0.16, time + 0.07); // Ataque suave de sopro
    oscGain.gain.exponentialRampToValueAtTime(0.12, time + duration * 0.7);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);

    // Componente de sopro de ar (Breath noise)
    const bufferSize = this.ctx.sampleRate * 0.18;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const breathSource = this.ctx.createBufferSource();
    breathSource.buffer = noiseBuffer;

    const breathFilter = this.ctx.createBiquadFilter();
    breathFilter.type = "bandpass";
    breathFilter.frequency.setValueAtTime(freq * 1.5, time);
    breathFilter.Q.value = 8.0;

    const breathGain = this.ctx.createGain();
    breathGain.gain.setValueAtTime(0.035, time);
    breathGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    breathSource.connect(breathFilter);
    breathFilter.connect(breathGain);
    breathGain.connect(this.musicGain);

    breathSource.start(time);
    breathSource.stop(time + 0.18);
  }

  /**
   * 3. Sinos de Cristal e Gotas de Vidro (Glass Chimes & Droplets)
   * Síntese FM cristalina com delay subaquático
   */
  private synthGlassChime(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;

    const playChimeNote = (t: number, vol: number) => {
      if (!this.ctx || !this.musicGain) return;

      const carrier = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      carrier.type = "sine";
      carrier.frequency.setValueAtTime(freq, t);

      // Modulador FM a 3.5x para produzir a ressonância cristalina da água
      mod.type = "sine";
      mod.frequency.setValueAtTime(freq * 3.5, t);
      modGain.gain.setValueAtTime(freq * 0.9, t);
      modGain.gain.exponentialRampToValueAtTime(1, t + 0.28);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(freq, t);
      filter.Q.value = 4.5;

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      carrier.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      mod.start(t);
      carrier.start(t);
      mod.stop(t + duration);
      carrier.stop(t + duration);
    };

    // Toque inicial cintilante
    playChimeNote(time, 0.14);
    // Eco estéreo subaquático a 130ms
    playChimeNote(time + 0.13, 0.045);
  }

  /**
   * 4. Baixo Subaquático Fretless
   * Sub-grave aveludado com ataque orgânico e calor analógico
   */
  private synthFretlessBass(freq: number, time: number, duration: number, volume: number = 0.28) {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Glissando de ataque sutil típico de fretless bass
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 1.04, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.04);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(160, time);
    filter.frequency.exponentialRampToValueAtTime(90, time + duration);
    filter.Q.value = 1.8;

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(volume * 0.5, time + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  /**
   * 5. Shaker de Bolhas e Areia
   */
  private synthBubbleShaker(time: number) {
    if (!this.ctx || !this.musicGain) return;

    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, time);
    filter.Q.value = 5.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.02, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.04);
  }

  /**
   * 6. Lofi Rim Tap Macio
   */
  private synthSoftLofiRim(time: number) {
    if (!this.ctx || !this.musicGain) return;

    const bufferSize = this.ctx.sampleRate * 0.035;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, time);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.035);
  }
}

class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private ambientGain: GainNode | null = null;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private oceanLfo: OscillatorNode | null = null;
  private whaleSongTimer: any = null;

  // Motor musical procedural Aquatic Ambience + 16-Bit Lofi Ocean
  private biomeEngine: BiomeMusicEngine = new BiomeMusicEngine();

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

      // Inicia a ambiência de marés e correntes profundas
      this.startAmbientOcean();

      // Inicia a trilha sonora Aquatic Ambience
      this.biomeEngine.init(this.ctx, this.masterGain);
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

  public updateBiomeTrack(playerX: number) {
    this.biomeEngine.updatePosition(playerX);
  }

  public pauseAmbient() {
    if (this.whaleSongTimer) {
      clearTimeout(this.whaleSongTimer);
      this.whaleSongTimer = null;
    }
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
    this.biomeEngine.pause();
  }

  public resumeAmbient() {
    if (this.isMuted) return;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.2);
    }
    if (!this.whaleSongTimer && this.isInitialized) {
      this.scheduleWhaleSong();
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

    this.scheduleWhaleSong();
  }

  private scheduleWhaleSong() {
    if (this.whaleSongTimer) return;
    const delay = 11000 + Math.random() * 9000;
    this.whaleSongTimer = setTimeout(() => {
      this.whaleSongTimer = null;
      if (!this.isMuted && this.ctx && this.ctx.state === "running") {
        this.playWhaleSong();
      }
      this.scheduleWhaleSong();
    }, delay);
  }

  /**
   * Canto Místico de Baleia-Jubarte (Harmonizado com a ambiência de Aquatic Ambience)
   */
  public playWhaleSong() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.value = 4.2;
    vibratoGain.gain.value = 9;
    vibrato.connect(osc.frequency);
    vibrato.start(now);
    vibrato.stop(now + 3.4);

    osc.type = "sine";
    const startFreq = 165 + Math.random() * 30;
    const peakFreq = startFreq + 85 + Math.random() * 45;
    const endFreq = startFreq - 25;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 1.3);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 3.0);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(260, now);
    filter.Q.value = 3.2;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 3.4);
  }

  /**
   * Biosonar 16-Bit Retrô (Shift / E / X)
   */
  public playSonarSound() {
    if (!this.ctx || !this.masterGain) return;

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
   * Batida de Nadadeira / Impulso de Nado (Espaço)
   */
  public playStrokeThrust() {
    if (!this.ctx || !this.masterGain) return;

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
    if (!this.ctx || !this.masterGain) return;

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
    if (!this.ctx || !this.masterGain) return;

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
    if (!this.ctx || !this.masterGain) return;

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
   * Reentrada Majestosa na Água (Splashdown)
   */
  public playWaterSplash() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(95, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.8);
    subGain.gain.setValueAtTime(0.58, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.8);

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
    noiseGain.gain.setValueAtTime(0.48, now);
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
}

export const audioSystem = new AudioSystem();
