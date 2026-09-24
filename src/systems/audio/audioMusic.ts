export const BIOME_INDEX = {
  ANTARCTICA: 0, // 0m - 5.000m (Polar Aquatic Ambience: Cm9, Abmaj7#11, Fm9, Gsus4/Cm)
  OCEAN: 1, // 5.000m - 12.000m (Aquatic Ambience Clássico de David Wise: Cm9, Abmaj7#11, Fm9, Gm7)
  URBAN: 2, // 12.000m - 19.000m (Rainy Coastal Waters: Cm7, Ebmaj7, Bb7sus4, Fm9)
  ARRAIAL: 3, // 19.000m - 27.000m (Sunken Coral Sanctuary: Cm9, Abmaj7#11, Ebmaj9, Bbadd9)
} as const;

export interface BiomeHarmony {
  bassRoot: number; // Nota fundamental do baixo (ex: C2 = 65.41 Hz)
  bassAlt: number; // Nota alternativa/quinta para pulso síncopado (ex: G2 = 98.00 Hz)
  pad: number[]; // Acorde aveludado estilo Korg Wavestation (filtrado morno, < 500Hz)
  harpChoirArp: number[]; // Arpejo etéreo de Harpa + Coral vocal em 6 passos (196Hz - 420Hz)
}

/**
 * Motor Musical Aquatic Ambiance (David Wise - 75 BPM, Dó Menor)
 */
export class BiomeMusicEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private isRunning: boolean = false;
  private currentBiome: number = BIOME_INDEX.ANTARCTICA;
  private currentBar: number = 0;
  private step: number = 0;
  private nextStepTime: number = 0;
  private timerId: any = null;

  // Andamento exato de David Wise: 75 BPM (0.8s por semínima -> 0.20s por semicolcheia/16th step)
  private readonly stepDuration: number = 60 / 75 / 4;

  // Harmonias em Dó menor (C minor), arpejos de harpa+coral e graves por bioma
  private readonly biomeScores: Record<number, BiomeHarmony[]> = {
    // 1. Antártica: Polar Aquatic Ambience (Gelo milenar, águas límpidas e profundas)
    [BIOME_INDEX.ANTARCTICA]: [
      {
        bassRoot: 65.41,
        bassAlt: 98.0,
        pad: [130.81, 155.56, 196.0, 233.08, 293.66],
        harpChoirArp: [196.0, 233.08, 293.66, 311.13, 293.66, 233.08],
      },
      {
        bassRoot: 51.91,
        bassAlt: 77.78,
        pad: [103.83, 130.81, 155.56, 196.0, 293.66],
        harpChoirArp: [207.65, 261.63, 293.66, 392.0, 293.66, 261.63],
      },
      {
        bassRoot: 43.65,
        bassAlt: 65.41,
        pad: [87.31, 103.83, 130.81, 155.56, 196.0],
        harpChoirArp: [174.61, 207.65, 261.63, 311.13, 261.63, 207.65],
      },
      {
        bassRoot: 49.0,
        bassAlt: 73.42,
        pad: [98.0, 130.81, 146.83, 174.61, 233.08],
        harpChoirArp: [146.83, 196.0, 233.08, 261.63, 233.08, 196.0],
      },
    ],

    // 2. Travessia Oceânica: O Verdadeiro "Aquatic Ambiance" (Cm9 -> Abmaj7#11 -> Fm9 -> Gm7)
    [BIOME_INDEX.OCEAN]: [
      {
        bassRoot: 65.41,
        bassAlt: 98.0,
        pad: [130.81, 155.56, 196.0, 233.08, 293.66],
        harpChoirArp: [196.0, 261.63, 293.66, 311.13, 392.0, 311.13],
      },
      {
        bassRoot: 51.91,
        bassAlt: 77.78,
        pad: [103.83, 130.81, 155.56, 196.0, 293.66],
        harpChoirArp: [207.65, 261.63, 293.66, 392.0, 415.3, 392.0],
      },
      {
        bassRoot: 43.65,
        bassAlt: 65.41,
        pad: [87.31, 103.83, 130.81, 155.56, 196.0],
        harpChoirArp: [174.61, 207.65, 261.63, 311.13, 349.23, 311.13],
      },
      {
        bassRoot: 49.0,
        bassAlt: 73.42,
        pad: [98.0, 116.54, 146.83, 174.61, 233.08],
        harpChoirArp: [196.0, 233.08, 293.66, 349.23, 293.66, 233.08],
      },
    ],

    // 3. Costa Urbana: Rainy Coastal Waters (Nostalgia, névoa e reflexão aveludada)
    [BIOME_INDEX.URBAN]: [
      {
        bassRoot: 65.41,
        bassAlt: 98.0,
        pad: [130.81, 155.56, 196.0, 233.08],
        harpChoirArp: [196.0, 233.08, 261.63, 311.13, 261.63, 233.08],
      },
      {
        bassRoot: 77.78,
        bassAlt: 116.54,
        pad: [77.78, 116.54, 155.56, 196.0, 233.08, 293.66],
        harpChoirArp: [233.08, 293.66, 311.13, 392.0, 311.13, 293.66],
      },
      {
        bassRoot: 58.27,
        bassAlt: 87.31,
        pad: [116.54, 146.83, 174.61, 207.65, 261.63],
        harpChoirArp: [174.61, 207.65, 233.08, 293.66, 261.63, 207.65],
      },
      {
        bassRoot: 43.65,
        bassAlt: 65.41,
        pad: [87.31, 103.83, 130.81, 155.56, 196.0],
        harpChoirArp: [174.61, 207.65, 261.63, 311.13, 261.63, 207.65],
      },
    ],

    // 4. Santuário de Arraial: Sunken Coral Sanctuary (Raios de sol submersos, águas turquesas e serenidade)
    [BIOME_INDEX.ARRAIAL]: [
      {
        bassRoot: 65.41,
        bassAlt: 98.0,
        pad: [130.81, 155.56, 196.0, 233.08, 293.66],
        harpChoirArp: [196.0, 261.63, 293.66, 392.0, 311.13, 261.63],
      },
      {
        bassRoot: 51.91,
        bassAlt: 77.78,
        pad: [103.83, 130.81, 155.56, 196.0, 293.66],
        harpChoirArp: [207.65, 293.66, 392.0, 415.3, 392.0, 293.66],
      },
      {
        bassRoot: 77.78,
        bassAlt: 116.54,
        pad: [77.78, 116.54, 155.56, 196.0, 293.66, 349.23],
        harpChoirArp: [233.08, 293.66, 349.23, 392.0, 349.23, 293.66],
      },
      {
        bassRoot: 58.27,
        bassAlt: 87.31,
        pad: [116.54, 146.83, 174.61, 233.08, 261.63],
        harpChoirArp: [174.61, 233.08, 261.63, 293.66, 261.63, 233.08],
      },
    ],
  };

  public init(ctx: AudioContext, masterGain: GainNode) {
    this.ctx = ctx;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(masterGain);

    this.start();
  }

  public updatePosition(playerX: number) {
    let targetBiome: number;
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

  public setVolume(val: number) {
    if (!this.musicGain || !this.ctx) return;
    this.musicGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  public stop() {
    this.pause();
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

  private playStep(biome: number, bar: number, step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;

    const harmony = this.biomeScores[biome]?.[bar] || this.biomeScores[BIOME_INDEX.OCEAN][0];

    if (step === 0) {
      this.synthAquaticPad(harmony.pad, time, 3.4);
      this.synthWavetableBass(harmony.bassRoot, time, 0.38, true);
    }

    if (step === 2) {
      this.synthWavetableBass(harmony.bassRoot, time, 0.32, false);
      if (harmony.harpChoirArp[0]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[0], time, 1.2, 1.0);
      }
      this.synthBubbleShaker(time);
    }

    if (step === 4) {
      this.synthWavetableBass(harmony.bassRoot, time, 0.35, true);
      if (harmony.harpChoirArp[1]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[1], time, 1.1, 0.95);
      }
      this.synthSoftLofiRim(time);
    }

    if (step === 6) {
      this.synthWavetableBass(harmony.bassAlt, time, 0.32, false);
      if (harmony.harpChoirArp[2]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[2], time, 1.2, 1.05);
      }
      this.synthBubbleShaker(time);
    }

    if (step === 8) {
      this.synthWavetableBass(harmony.bassRoot, time, 0.38, true);
      if (harmony.harpChoirArp[3]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[3], time, 1.3, 1.1);
      }
    }

    if (step === 10) {
      this.synthWavetableBass(harmony.bassRoot, time, 0.32, false);
      if (harmony.harpChoirArp[4]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[4], time, 1.1, 0.95);
      }
      this.synthBubbleShaker(time);
    }

    if (step === 12) {
      this.synthWavetableBass(harmony.bassAlt, time, 0.35, false);
      if (harmony.harpChoirArp[5]) {
        this.synthHarpChoirArp(harmony.harpChoirArp[5], time, 1.0, 0.85);
      }
      this.synthSoftLofiRim(time);
    }

    if (step === 14) {
      this.synthWavetableBass(harmony.bassAlt, time, 0.3, false);
      this.synthBubbleShaker(time);
    }
  }

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
      oscB.detune.setValueAtTime(5, noteTime);

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

  private synthWavetableBass(
    freq: number,
    time: number,
    duration: number,
    isAccent: boolean = false
  ) {
    if (!this.ctx || !this.musicGain) return;

    const subOsc = this.ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(freq, time);

    const waveOsc = this.ctx.createOscillator();
    const real = new Float32Array([0, 1.0, 0.65, 0.45, 0.28, 0.16, 0.08, 0.04, 0.02]);
    const imag = new Float32Array(real.length);
    const wavetableWave = this.ctx.createPeriodicWave(real, imag);
    waveOsc.setPeriodicWave(wavetableWave);
    waveOsc.frequency.setValueAtTime(freq, time);
    waveOsc.detune.setValueAtTime(isAccent ? 3 : -2, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    const baseCutoff = isAccent ? 180 : 130;
    const peakCutoff = isAccent ? 260 : 210;
    filter.frequency.setValueAtTime(baseCutoff, time);
    filter.frequency.linearRampToValueAtTime(peakCutoff, time + 0.04);
    filter.frequency.exponentialRampToValueAtTime(75, time + duration);
    filter.Q.value = 2.6;

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

  private synthHarpChoirArp(freq: number, time: number, duration: number, velocity: number = 1.0) {
    if (!this.ctx || !this.musicGain) return;

    const harpOsc = this.ctx.createOscillator();
    const harpFilter = this.ctx.createBiquadFilter();
    const harpGain = this.ctx.createGain();

    harpOsc.type = "triangle";
    harpOsc.frequency.setValueAtTime(freq * 1.008, time);
    harpOsc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);

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

    const choirOscA = this.ctx.createOscillator();
    const choirOscB = this.ctx.createOscillator();
    const formantFilter1 = this.ctx.createBiquadFilter();
    const formantFilter2 = this.ctx.createBiquadFilter();
    const choirGain = this.ctx.createGain();

    choirOscA.type = "sine";
    choirOscA.frequency.setValueAtTime(freq, time);
    choirOscB.type = "triangle";
    choirOscB.frequency.setValueAtTime(freq, time);
    choirOscB.detune.setValueAtTime(5, time);

    formantFilter1.type = "bandpass";
    formantFilter1.frequency.setValueAtTime(420, time);
    formantFilter1.Q.value = 4.0;

    formantFilter2.type = "bandpass";
    formantFilter2.frequency.setValueAtTime(Math.min(freq * 1.8, 750), time);
    formantFilter2.Q.value = 3.5;

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
    filter.frequency.setValueAtTime(1100, time);
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
    filter.frequency.setValueAtTime(450, time);
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
