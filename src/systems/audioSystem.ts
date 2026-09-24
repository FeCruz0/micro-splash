/**
 * Fachada Modular do Sistema de Áudio - Micro Splash
 *
 * Centraliza e orquestra os submódulos de áudio mantendo 100% de retrocompatibilidade:
 * - AudioEngine: Inicialização, ciclo de vida, volume, mudo e ambiência oceânica
 * - AudioSFX: Efeitos sonoros procedurais (nado, bolhas, impactos, cliques, fanfarras)
 * - AudioWhale: Síntese bioacústica avançada dos cantos ancestrais da baleia-jubarte
 * - BiomeMusicEngine: Trilha musical dinâmica 16-Bit estilo David Wise (DKC SNES)
 */

import { AudioEngine, type SoundtrackMode } from "./audio/audioEngine";
import { AudioSFX } from "./audio/audioSFX";
import { AudioWhale } from "./audio/audioWhale";

export type { SoundtrackMode };
export { SOUNDTRACK_MODE_LABELS } from "./audio/audioEngine";
export { BIOME_INDEX } from "./audio/audioMusic";
export { AudioEngine } from "./audio/audioEngine";
export { AudioSFX } from "./audio/audioSFX";
export { AudioWhale } from "./audio/audioWhale";

export class AudioSystem {
  public readonly engine: AudioEngine;
  public readonly sfx: AudioSFX;
  public readonly whale: AudioWhale;

  constructor() {
    this.engine = new AudioEngine();
    this.sfx = new AudioSFX(this.engine);
    this.whale = new AudioWhale(this.engine);
  }

  // =========================================================================
  // CICLO DE VIDA E CONFIGURAÇÕES
  // =========================================================================
  public init() {
    this.engine.init();
  }

  public startMigrationAudio(initialX: number = 0) {
    this.engine.startMigrationAudio(initialX, () => {
      this.whale.playWhaleSong(0.5, 0.95);
    });
  }

  public stopMigrationAudio() {
    this.engine.stopMigrationAudio();
  }

  public getSoundtrackMode(): SoundtrackMode {
    return this.engine.getSoundtrackMode();
  }

  public setSoundtrackMode(mode: SoundtrackMode) {
    this.engine.setSoundtrackMode(mode, () => {
      this.whale.playWhaleSong(0.5, 0.95);
    });
  }

  public cycleNextSoundtrackMode(): SoundtrackMode {
    return this.engine.cycleNextSoundtrackMode(() => {
      this.whale.playWhaleSong(0.5, 0.95);
    });
  }

  public getSoundtrackModeLabel(): string {
    return this.engine.getSoundtrackModeLabel();
  }

  public updateSoundtrackPlayback() {
    this.engine.updateSoundtrackPlayback(() => {
      this.whale.playWhaleSong(0.5, 0.95);
    });
  }

  public setVolume(val: number) {
    this.engine.setVolume(val);
  }

  public getVolume(): number {
    return this.engine.getVolume();
  }

  public setMusicEnabled(enabled: boolean) {
    this.engine.setMusicEnabled(enabled);
  }

  public isMusicEnabled(): boolean {
    return this.engine.isMusicEnabled();
  }

  public setSfxEnabled(enabled: boolean) {
    this.engine.setSfxEnabled(enabled);
  }

  public isSfxEnabled(): boolean {
    return this.engine.isSfxEnabled();
  }

  public resumeIfSuspended() {
    this.engine.resumeIfSuspended();
  }

  public toggleMute(): boolean {
    return this.engine.toggleMute();
  }

  public getMuted(): boolean {
    return this.engine.getMuted();
  }

  public updateBiomeTrack(playerX: number) {
    this.engine.updateBiomeTrack(playerX);
  }

  public pauseAmbient() {
    this.engine.pauseAmbient();
  }

  public resumeAmbient() {
    this.engine.resumeAmbient();
  }

  public cleanup() {
    this.engine.cleanup();
  }

  // =========================================================================
  // CANTOS DE BALEIA
  // =========================================================================
  public playWhaleSong(volumeScale: number = 1.0, pitchShift: number = 1.0) {
    this.whale.playWhaleSong(volumeScale, pitchShift);
  }

  public playAbyssalWhaleCall() {
    this.whale.playAbyssalWhaleCall();
  }

  // =========================================================================
  // EFEITOS SONOROS (SFX)
  // =========================================================================
  public playUiClick() {
    this.sfx.playUiClick();
  }

  public playSonarSound() {
    this.sfx.playSonarSound();
  }

  public playSonarEcho(delayMs: number = 60) {
    this.sfx.playSonarEcho(delayMs);
  }

  public playBlowholeSpout() {
    this.sfx.playBlowholeSpout();
  }

  public playStrokeThrust() {
    this.sfx.playStrokeThrust();
  }

  public playKrillGulp() {
    this.sfx.playKrillGulp();
  }

  public playKrillChime() {
    this.sfx.playKrillChime();
  }

  public playTrashThud() {
    this.sfx.playTrashThud();
  }

  public playNetTangle() {
    this.sfx.playNetTangle();
  }

  public playBreachLaunch() {
    this.sfx.playBreachLaunch();
  }

  public playWaterSplash() {
    this.sfx.playWaterSplash();
  }

  public playIceCrackSound() {
    this.sfx.playIceCrackSound();
  }

  public playVictoryFanfare() {
    this.sfx.playVictoryFanfare();
  }

  public playOilChoke() {
    this.sfx.playOilChoke();
  }

  public playPurifyWhoosh() {
    this.sfx.playPurifyWhoosh();
  }

  public playDolphinClicks() {
    this.sfx.playDolphinClicks();
  }

  public playPenguinChirp() {
    this.sfx.playPenguinChirp();
  }

  public playPowerupCollect() {
    this.sfx.playPowerupCollect();
  }

  public playShieldPop() {
    this.sfx.playShieldPop();
  }

  public playSpeedBoost() {
    this.sfx.playSpeedBoost();
  }
}

export const audioSystem = new AudioSystem();
