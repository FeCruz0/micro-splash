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

export const BIOME_INDEX = {
  ANTARCTICA: 0,   // 0m - 5.000m (Polar Aquatic Ambience: Cm9, Abmaj7#11, Fm9, Gsus4/Cm)
  OCEAN: 1,        // 5.000m - 12.000m (Aquatic Ambience Clássico de David Wise: Cm9, Abmaj7#11, Fm9, Gm7)
  URBAN: 2,        // 12.000m - 19.000m (Rainy Coastal Waters: Cm7, Ebmaj7, Bb7sus4, Fm9)
  ARRAIAL: 3,      // 19.000m - 27.000m (Sunken Coral Sanctuary: Cm9, Abmaj7#11, Ebmaj9, Bbadd9)
} as const;

interface BiomeHarmony {
  bassRoot: number;        // Nota fundamental do baixo (ex: C2 = 65.41 Hz)
  bassAlt: number;         // Nota alternativa/quinta para pulso síncopado (ex: G2 = 98.00 Hz)
  pad: number[];           // Acorde aveludado estilo Korg Wavestation (filtrado morno, < 500Hz)
  harpChoirArp: number[];  // Arpejo etéreo de Harpa + Coral vocal em 6 passos (196Hz - 420Hz)
}

/**
 * Motor Musical Aquatic Ambiance (David Wise - 75 BPM, Dó Menor)
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

  // Andamento exato de David Wise: 75 BPM (0.8s por semínima -> 0.20s por semicolcheia/16th step)
  private readonly stepDuration: number = (60 / 75) / 4;

  // Harmonias em Dó menor (C minor), arpejos de harpa+coral e graves por bioma
  private readonly biomeScores: Record<number, BiomeHarmony[]> = {
    // 1. Antártica: Polar Aquatic Ambience (Gelo milenar, águas límpidas e profundas)
    [BIOME_INDEX.ANTARCTICA]: [
      // Cm9: C, Eb, G, Bb, D
      {
        bassRoot: 65.41, bassAlt: 98.00,
        pad: [130.81, 155.56, 196.00, 233.08, 293.66],
        harpChoirArp: [196.00, 233.08, 293.66, 311.13, 293.66, 233.08]
      },
      // Abmaj7#11: Ab, C, Eb, G, D (O acorde lídio de David Wise)
      {
        bassRoot: 51.91, bassAlt: 77.78,
        pad: [103.83, 130.81, 155.56, 196.00, 293.66],
        harpChoirArp: [207.65, 261.63, 293.66, 392.00, 293.66, 261.63]
      },
      // Fm9: F, Ab, C, Eb, G
      {
        bassRoot: 43.65, bassAlt: 65.41,
        pad: [87.31, 103.83, 130.81, 155.56, 196.00],
        harpChoirArp: [174.61, 207.65, 261.63, 311.13, 261.63, 207.65]
      },
      // Gsus4 / Cm: G, C, D, F, Bb
      {
        bassRoot: 49.00, bassAlt: 73.42,
        pad: [98.00, 130.81, 146.83, 174.61, 233.08],
        harpChoirArp: [146.83, 196.00, 233.08, 261.63, 233.08, 196.00]
      },
    ],

    // 2. Travessia Oceânica: O Verdadeiro "Aquatic Ambiance" (Cm9 -> Abmaj7#11 -> Fm9 -> Gm7)
    [BIOME_INDEX.OCEAN]: [
      // Cm9: C, Eb, G, Bb, D
      {
        bassRoot: 65.41, bassAlt: 98.00,
        pad: [130.81, 155.56, 196.00, 233.08, 293.66],
        harpChoirArp: [196.00, 261.63, 293.66, 311.13, 392.00, 311.13]
      },
      // Abmaj7#11: Ab, C, Eb, G, D (Flutuação lídia majestosa)
      {
        bassRoot: 51.91, bassAlt: 77.78,
        pad: [103.83, 130.81, 155.56, 196.00, 293.66],
        harpChoirArp: [207.65, 261.63, 293.66, 392.00, 415.30, 392.00]
      },
      // Fm9: F, Ab, C, Eb, G
      {
        bassRoot: 43.65, bassAlt: 65.41,
        pad: [87.31, 103.83, 130.81, 155.56, 196.00],
        harpChoirArp: [174.61, 207.65, 261.63, 311.13, 349.23, 311.13]
      },
      // Gm7: G, Bb, D, F, Bb
      {
        bassRoot: 49.00, bassAlt: 73.42,
        pad: [98.00, 116.54, 146.83, 174.61, 233.08],
        harpChoirArp: [196.00, 233.08, 293.66, 349.23, 293.66, 233.08]
      },
    ],

    // 3. Costa Urbana: Rainy Coastal Waters (Nostalgia, névoa e reflexão aveludada)
    [BIOME_INDEX.URBAN]: [
      // Cm7
      {
        bassRoot: 65.41, bassAlt: 98.00,
        pad: [130.81, 155.56, 196.00, 233.08],
        harpChoirArp: [196.00, 233.08, 261.63, 311.13, 261.63, 233.08]
      },
      // Ebmaj7
      {
        bassRoot: 77.78, bassAlt: 116.54,
        pad: [77.78, 116.54, 155.56, 196.00, 233.08, 293.66],
        harpChoirArp: [233.08, 293.66, 311.13, 392.00, 311.13, 293.66]
      },
      // Bb7sus4
      {
        bassRoot: 58.27, bassAlt: 87.31,
        pad: [116.54, 146.83, 174.61, 207.65, 261.63],
        harpChoirArp: [174.61, 207.65, 233.08, 293.66, 261.63, 207.65]
      },
      // Fm9
      {
        bassRoot: 43.65, bassAlt: 65.41,
        pad: [87.31, 103.83, 130.81, 155.56, 196.00],
        harpChoirArp: [174.61, 207.65, 261.63, 311.13, 261.63, 207.65]
      },
    ],

    // 4. Santuário de Arraial: Sunken Coral Sanctuary (Raios de sol submersos, águas turquesas e serenidade)
    [BIOME_INDEX.ARRAIAL]: [
      // Cm9
      {
        bassRoot: 65.41, bassAlt: 98.00,
        pad: [130.81, 155.56, 196.00, 233.08, 293.66],
        harpChoirArp: [196.00, 261.63, 293.66, 392.00, 311.13, 261.63]
      },
      // Abmaj7#11
      {
        bassRoot: 51.91, bassAlt: 77.78,
        pad: [103.83, 130.81, 155.56, 196.00, 293.66],
        harpChoirArp: [207.65, 293.66, 392.00, 415.30, 392.00, 293.66]
      },
      // Ebmaj9
      {
        bassRoot: 77.78, bassAlt: 116.54,
        pad: [77.78, 116.54, 155.56, 196.00, 293.66, 349.23],
        harpChoirArp: [233.08, 293.66, 349.23, 392.00, 349.23, 293.66]
      },
      // Bbadd9
      {
        bassRoot: 58.27, bassAlt: 87.31,
        pad: [116.54, 146.83, 174.61, 233.08, 261.63],
        harpChoirArp: [174.61, 233.08, 261.63, 293.66, 261.63, 233.08]
      },
    ],
  };

  public init(ctx: AudioContext, masterGain: GainNode) {
    this.ctx = ctx;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.35; // Volume envolvente e confortável
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
    this.musicGain.gain.setTargetAtTime(0.35, this.ctx.currentTime, 0.2);
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.scheduleLoop();
  }

  public setEnabled(enabled: boolean) {
    if (!this.musicGain || !this.ctx) return;
    this.musicGain.gain.setTargetAtTime(enabled ? 0.35 : 0, this.ctx.currentTime, 0.05);
  }

  private scheduleLoop() {
    if (!this.isRunning || !this.ctx) return;

    const lookahead = 0.25;
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
   * Executa a grade rítmica e harmônica inspirada em David Wise / Aquatic Ambiance
   */
  private playStep(biome: number, bar: number, step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;

    const harmony = this.biomeScores[biome]?.[bar] || this.biomeScores[BIOME_INDEX.OCEAN][0];

    // Passo 0 (Tempo 1): Entrada do Acorde Atmosférico Korg Wavestation e Baixo Wavetable Principal
    if (step === 0) {
      this.synthAquaticPad(harmony.pad, time, 3.4);
      this.synthWavetableBass(harmony.bassRoot, time, 0.38, true);
    }

    // Passo 2: Pulso do baixo e 1ª nota do arpejo Harpa + Coral ("correnteza submersa")
    if (step === 2) {
      this.synthWavetableBass(harmony.bassRoot, time, 0.32, false);
      if (harmony.harpChoirArp[0]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[0], time, 1.2, 1.0);
      }
      this.synthBubbleShaker(time);
    }

    // Passo 4 (Tempo 2): Pulso de baixo com acento, 2ª nota do arpejo e toque suave de rim
    if (step === 4) {
      this.synthWavetableBass(harmony.bassRoot, time, 0.35, true);
      if (harmony.harpChoirArp[1]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[1], time, 1.1, 0.95);
      }
      this.synthSoftLofiRim(time);
    }

    // Passo 6: Sub-baixo syncopado estilo David Wise (quinta / baixo alternativo) e 3ª nota do arpejo
    if (step === 6) {
      this.synthWavetableBass(harmony.bassAlt, time, 0.32, false);
      if (harmony.harpChoirArp[2]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[2], time, 1.2, 1.05);
      }
      this.synthBubbleShaker(time);
    }

    // Passo 8 (Tempo 3): Pulso do baixo e 4ª nota do arpejo (ponto alto da correnteza)
    if (step === 8) {
      this.synthWavetableBass(harmony.bassRoot, time, 0.38, true);
      if (harmony.harpChoirArp[3]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[3], time, 1.3, 1.1);
      }
    }

    // Passo 10: Pulso do baixo, 5ª nota do arpejo (ondulação suave descendente) e bolhas
    if (step === 10) {
      this.synthWavetableBass(harmony.bassRoot, time, 0.32, false);
      if (harmony.harpChoirArp[4]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[4], time, 1.1, 0.95);
      }
      this.synthBubbleShaker(time);
    }

    // Passo 12 (Tempo 4): Toque de rim sutil, 6ª nota do arpejo e baixo alternativo
    if (step === 12) {
      this.synthWavetableBass(harmony.bassAlt, time, 0.35, false);
      if (harmony.harpChoirArp[5]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[5], time, 1.0, 0.85);
      }
      this.synthSoftLofiRim(time);
    }

    // Passo 14: Pulso de transição do baixo e shaker macio antes do próximo compasso
    if (step === 14) {
      this.synthWavetableBass(harmony.bassAlt, time, 0.30, false);
      this.synthBubbleShaker(time);
    }
  }

  // =========================================================================
  // INSTRUMENTAÇÃO CLÁSSICA DE "AQUATIC AMBIENCE" (DAVID WISE / SNES SPC700)
  // =========================================================================

  /**
   * 1. Pad Atmosférico Oceânico Korg Wavestation (David Wise)
   * Dupla camada de senoides e ondas suaves com filtro passa-baixa aveludado (< 480Hz)
   * Sem quaisquer frequências cortantes ou agudas.
   */
  private synthAquaticPad(frequencies: number[], time: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;

    frequencies.forEach((freq, idx) => {
      const noteTime = time + idx * 0.02;

      const oscA = this.ctx!.createOscillator();
      const oscB = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      oscA.type = "sine";
      oscA.frequency.setValueAtTime(freq, noteTime);

      oscB.type = "triangle";
      oscB.frequency.setValueAtTime(freq, noteTime);
      oscB.detune.setValueAtTime(5, noteTime); // Chorus analógico natural

      // Filtro passa-baixa estritamente controlado para som morno, relaxante e sem agudos
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(280, noteTime);
      filter.frequency.linearRampToValueAtTime(450, noteTime + 1.0);
      filter.frequency.exponentialRampToValueAtTime(240, noteTime + duration);
      filter.Q.value = 1.2;

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.055, noteTime + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.035, noteTime + 2.0);
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
   * 2. Baixo "Wavetable" Pulsante de David Wise (SNES SPC700 / Aquatic Ambiance)
   * Recria a lendária linha de baixo com textura de 8 micro-formas de onda,
   * pulso rítmico hipnótico e filtro passa-baixa ressonante subaquático.
   */
  private synthWavetableBass(freq: number, time: number, duration: number, isAccent: boolean = false) {
    if (!this.ctx || !this.musicGain) return;

    // Sub-grave senoidal puro para sustentar a pressão das profundezas
    const subOsc = this.ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(freq, time);

    // Oscilador Wavetable: síntese periódica de 8 harmônicos suaves
    const waveOsc = this.ctx.createOscillator();
    const real = new Float32Array([0, 1.0, 0.65, 0.45, 0.28, 0.16, 0.08, 0.04, 0.02]);
    const imag = new Float32Array(real.length);
    const wavetableWave = this.ctx.createPeriodicWave(real, imag);
    waveOsc.setPeriodicWave(wavetableWave);
    waveOsc.frequency.setValueAtTime(freq, time);
    waveOsc.detune.setValueAtTime(isAccent ? 3 : -2, time);

    // Filtro passa-baixa dinâmico ressonante ("Wavetable Filter Sweep")
    // Cria o pulso característico, elástico e líquido ("boww... boww...")
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    const baseCutoff = isAccent ? 180 : 130;
    const peakCutoff = isAccent ? 260 : 210;
    filter.frequency.setValueAtTime(baseCutoff, time);
    filter.frequency.linearRampToValueAtTime(peakCutoff, time + 0.04);
    filter.frequency.exponentialRampToValueAtTime(75, time + duration);
    filter.Q.value = 2.6; // Ressonância líquida analógica

    const gain = this.ctx.createGain();
    const volume = isAccent ? 0.26 : 0.19;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(volume * 0.55, time + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    subOsc.connect(filter);
    waveOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    subOsc.start(time);
    waveOsc.start(time);
    subOsc.stop(time + duration);
    waveOsc.stop(time + duration);
  }

  /**
   * 3. Arpejo Híbrido: Harpa Acústica + Coral Vocal Formante (David Wise)
   * "Para criar a sensação etérea de 'correnteza', combinou um sample de voz (coral)
   * com um sample de harpa, alterando levemente o tom (pitch) da harpa enquanto ela tocava"
   * Notas quentes na faixa média (170Hz - 420Hz), sem sons estridentes ou agudos.
   */
  private synthHarpChoirArp(freq: number, time: number, duration: number, velocity: number = 1.0) {
    if (!this.ctx || !this.musicGain) return;

    // --- CAMADA 1: HARPA COM MICRO-PITCH DRIFT ---
    const harpOsc = this.ctx.createOscillator();
    const harpFilter = this.ctx.createBiquadFilter();
    const harpGain = this.ctx.createGain();

    harpOsc.type = "triangle";
    // Pitch drift sutil da harpa de David Wise (+14 cents deslizando suavemente para a afinação real)
    harpOsc.frequency.setValueAtTime(freq * 1.008, time);
    harpOsc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);

    // Filtro aveludado da harpa (bloqueia frequências agudas acima de 580Hz)
    harpFilter.type = "lowpass";
    const harpCutoff = Math.min(freq * 2.1, 580);
    harpFilter.frequency.setValueAtTime(harpCutoff, time);
    harpFilter.frequency.exponentialRampToValueAtTime(freq * 0.95, time + 0.45);
    harpFilter.Q.value = 1.8;

    harpGain.gain.setValueAtTime(0.001, time);
    harpGain.gain.linearRampToValueAtTime(0.12 * velocity, time + 0.008);
    harpGain.gain.exponentialRampToValueAtTime(0.06 * velocity, time + 0.2);
    harpGain.gain.exponentialRampToValueAtTime(0.001, time + 0.55);

    harpOsc.connect(harpFilter);
    harpFilter.connect(harpGain);
    harpGain.connect(this.musicGain);

    harpOsc.start(time);
    harpOsc.stop(time + 0.55);

    // --- CAMADA 2: VOZ / CORAL FORMANT (Sample de Voz Efémero) ---
    // Cria a textura etérea de "correnteza submersa"
    const choirOscA = this.ctx.createOscillator();
    const choirOscB = this.ctx.createOscillator();
    const formantFilter1 = this.ctx.createBiquadFilter();
    const formantFilter2 = this.ctx.createBiquadFilter();
    const choirGain = this.ctx.createGain();

    choirOscA.type = "sine";
    choirOscA.frequency.setValueAtTime(freq, time);
    choirOscB.type = "triangle";
    choirOscB.frequency.setValueAtTime(freq, time);
    choirOscB.detune.setValueAtTime(5, time); // Chorus coral suave

    // Formante 1: Ressonância torácica vocal ("Oh/Ah" em torno de 420Hz)
    formantFilter1.type = "bandpass";
    formantFilter1.frequency.setValueAtTime(420, time);
    formantFilter1.Q.value = 4.0;

    // Formante 2: Ressonância aérea suave (limitada a 750Hz para evitar agudos)
    formantFilter2.type = "bandpass";
    formantFilter2.frequency.setValueAtTime(Math.min(freq * 1.8, 750), time);
    formantFilter2.Q.value = 3.5;

    // Envelope do coral: swell suave que floresce após a palhetada da harpa
    choirGain.gain.setValueAtTime(0.001, time);
    choirGain.gain.linearRampToValueAtTime(0.08 * velocity, time + 0.12);
    choirGain.gain.exponentialRampToValueAtTime(0.04 * velocity, time + duration * 0.6);
    choirGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    choirOscA.connect(formantFilter1);
    choirOscB.connect(formantFilter2);
    formantFilter1.connect(choirGain);
    formantFilter2.connect(choirGain);
    choirGain.connect(this.musicGain);

    choirOscA.start(time);
    choirOscB.start(time);
    choirOscA.stop(time + duration);
    choirOscB.stop(time + duration);
  }

  /**
   * 4. Shaker de Bolhas e Areia Macio (Subaquático)
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
    filter.frequency.setValueAtTime(1100, time); // Reduzido para textura morna sem chiado agudo
    filter.Q.value = 4.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.015, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.04);
  }

  /**
   * 5. Lofi Rim Tap Abafado e Orgânico
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
    filter.frequency.setValueAtTime(450, time); // Frequência baixa e acolhedora de madeira
    filter.Q.value = 2.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.03, time);
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
  private volume: number = 0.8;
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
      this.masterGain.gain.value = this.volume * 0.7;
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
      const targetGain = (!this.isMuted && this.musicEnabled) ? 0.22 : 0;
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
        if (typeof parsed.volume === "number") this.volume = parsed.volume;
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
      const targetGain = this.isMuted ? 0 : this.volume * 0.7;
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
    const targetGain = this.isMuted ? 0 : this.volume * 0.7;
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
    if (!this.musicEnabled || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Evita sobreposição embolada se acionado em rápida sucessão
    if (now - this.lastWhaleSongTime < 4.0) return;
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
   * Reentrada Majestosa na Água (Splashdown)
   */
  public playWaterSplash() {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;

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
}

export const audioSystem = new AudioSystem();
