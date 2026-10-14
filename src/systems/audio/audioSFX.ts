import type { AudioEngine } from "./audioEngine";
import * as sfxUI from "./sfx/sfxUI";
import * as sfxWhale from "./sfx/sfxWhale";
import * as sfxEnvironment from "./sfx/sfxEnvironment";
import * as sfxThreats from "./sfx/sfxThreats";

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

  private destFn = (sourceX?: number, playerX?: number) =>
    this.getDestinationNode(sourceX, playerX);

  public playUiClick() {
    sfxUI.playUiClick(this.engine, this.destFn);
  }

  public playVictoryFanfare() {
    sfxUI.playVictoryFanfare(this.engine, this.destFn);
  }

  public playPowerupCollect(sourceX?: number, playerX?: number) {
    sfxUI.playPowerupCollect(this.engine, this.destFn, sourceX, playerX);
  }

  public playShieldPop(sourceX?: number, playerX?: number) {
    sfxUI.playShieldPop(this.engine, this.destFn, sourceX, playerX);
  }

  public playSpeedBoost() {
    sfxUI.playSpeedBoost(this.engine, this.destFn);
  }

  public playSonarSound() {
    sfxWhale.playSonarSound(this.engine, this.destFn);
  }

  public playSonarEcho(delayMs: number = 60) {
    sfxWhale.playSonarEcho(this.engine, this.destFn, delayMs);
  }

  public playBlowholeSpout() {
    sfxWhale.playBlowholeSpout(this.engine, this.destFn);
  }

  public playStrokeThrust() {
    sfxWhale.playStrokeThrust(this.engine, this.destFn);
  }

  public playKrillGulp(sourceX?: number, playerX?: number) {
    sfxWhale.playKrillGulp(this.engine, this.destFn, sourceX, playerX);
  }

  public playKrillChime(sourceX?: number, playerX?: number) {
    this.playKrillGulp(sourceX, playerX);
  }

  public playBreachLaunch() {
    sfxWhale.playBreachLaunch(this.engine, this.destFn);
  }

  public playWaterSplash(sourceX?: number, playerX?: number) {
    sfxEnvironment.playWaterSplash(this.engine, this.destFn, sourceX, playerX);
  }

  public playIceCrackSound(sourceX?: number, playerX?: number) {
    sfxEnvironment.playIceCrackSound(this.engine, this.destFn, sourceX, playerX);
  }

  public playPurifyWhoosh(sourceX?: number, playerX?: number) {
    sfxEnvironment.playPurifyWhoosh(this.engine, this.destFn, sourceX, playerX);
  }

  public playDolphinClicks(sourceX?: number, playerX?: number) {
    sfxEnvironment.playDolphinClicks(this.engine, this.destFn, sourceX, playerX);
  }

  public playPenguinChirp(sourceX?: number, playerX?: number) {
    sfxEnvironment.playPenguinChirp(this.engine, this.destFn, sourceX, playerX);
  }

  public playTrashThud(sourceX?: number, playerX?: number) {
    sfxThreats.playTrashThud(this.engine, this.destFn, sourceX, playerX);
  }

  public playNetTangle(sourceX?: number, playerX?: number) {
    sfxThreats.playNetTangle(this.engine, this.destFn, sourceX, playerX);
  }

  public playOilChoke(sourceX?: number, playerX?: number) {
    sfxThreats.playOilChoke(this.engine, this.destFn, sourceX, playerX);
  }

  public playShipHorn(sourceX?: number, playerX?: number) {
    sfxThreats.playShipHorn(this.engine, this.destFn, sourceX, playerX);
  }
}
