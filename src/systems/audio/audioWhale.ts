import type { AudioEngine } from "./audioEngine";

export class AudioWhale {
  private lastWhaleSongTime: number = 0;
  private engine: AudioEngine;

  constructor(engine: AudioEngine) {
    this.engine = engine;
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
   */
  public playWhaleSong(volumeScale: number = 1.0, pitchShift: number = 1.0) {
    if (!this.engine.isSfxEnabled() && !this.engine.isMusicEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;
    if (now - this.lastWhaleSongTime < 1.9) return;
    this.lastWhaleSongTime = now;

    // BARRAMENTO DE ECO OCEÂNICO DO SNES (Delay de 180ms com Low-pass de 420Hz)
    const delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.setValueAtTime(0.18, now);

    const feedbackGain = ctx.createGain();
    feedbackGain.gain.setValueAtTime(0.52, now);

    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = "lowpass";
    echoFilter.frequency.setValueAtTime(420, now);
    echoFilter.Q.value = 1.2;

    const delayMasterGain = ctx.createGain();
    delayMasterGain.gain.setValueAtTime(0.25 * volumeScale, now);

    delayNode.connect(echoFilter);
    echoFilter.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    echoFilter.connect(delayMasterGain);
    delayMasterGain.connect(masterGain);

    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.28 * volumeScale, now);
    dryGain.connect(masterGain);

    const vocalBus = ctx.createGain();
    vocalBus.gain.setValueAtTime(1.0, now);
    vocalBus.connect(dryGain);
    vocalBus.connect(delayNode);

    // 1. CANAL 1 / FRASE A: LAMENTO LÍMPIDO (Assobio - Sine limpa com vibrato)
    const tA = now;
    const durA = 3.6;

    const oscA = ctx.createOscillator();
    const vibratoA = ctx.createOscillator();
    const vibratoGainA = ctx.createGain();
    const gainA = ctx.createGain();
    const filterA = ctx.createBiquadFilter();

    oscA.type = "sine";
    const baseFreqA = 261.63 * pitchShift;
    const peakFreqA = 295.00 * pitchShift;
    const endFreqA = 175.00 * pitchShift;

    oscA.frequency.setValueAtTime(baseFreqA, tA);
    oscA.frequency.exponentialRampToValueAtTime(peakFreqA, tA + 0.9);
    oscA.frequency.exponentialRampToValueAtTime(endFreqA, tA + durA);

    vibratoA.type = "sine";
    vibratoA.frequency.setValueAtTime(4.6, tA);
    vibratoGainA.gain.setValueAtTime(7.5, tA);
    vibratoA.connect(oscA.frequency);

    filterA.type = "lowpass";
    filterA.frequency.setValueAtTime(460, tA);
    filterA.Q.value = 1.6;

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

    // 2. CANAL 2 / FRASE B: O MERGULHO CAVERNOSO (O Gemido / Cello Gutural)
    const tB = now + 3.2;
    const durB = 2.8;

    const oscSineB = ctx.createOscillator();
    const oscSawB = ctx.createOscillator();
    const gainB = ctx.createGain();
    const filterB = ctx.createBiquadFilter();

    oscSineB.type = "sine";
    oscSawB.type = "sawtooth";

    const baseFreqB = 98.0 * pitchShift;
    const endFreqB = 54.0 * pitchShift;

    oscSineB.frequency.setValueAtTime(baseFreqB, tB);
    oscSineB.frequency.exponentialRampToValueAtTime(endFreqB, tB + durB);

    oscSawB.frequency.setValueAtTime(baseFreqB * 0.5, tB);
    oscSawB.frequency.exponentialRampToValueAtTime(endFreqB * 0.5, tB + durB);

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

    // 3. CANAL 3 / FRASE C: A PERCUSSÃO BIOLÓGICA (O Rangido / Estalos e Zíper)
    const tC = tB + 2.2;
    const clickIntervals = [0, 0.11, 0.24, 0.40, 0.60];

    clickIntervals.forEach((offset, idx) => {
      const clickTime = tC + offset;
      const clickDur = 0.07;

      const clickOsc = ctx.createOscillator();
      const clickFilter = ctx.createBiquadFilter();
      const clickGain = ctx.createGain();

      clickOsc.type = "square";
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
   * Vocalização abissal ultra-grave de baixa frequência (Cachalote / Baleia-Azul)
   */
  public playAbyssalWhaleCall() {
    if (!this.engine.isSfxEnabled()) return;
    const ctx = this.engine.getContext();
    const masterGain = this.engine.getMasterGain();
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;

    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

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
    gain.connect(masterGain);

    mod.start(now);
    carrier.start(now);
    mod.stop(now + 3.0);
    carrier.stop(now + 3.0);
  }
}
