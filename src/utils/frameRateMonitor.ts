/**
 * Monitor de Taxa de Quadros (FPS) e Latência em Tempo Real — Micro Splash
 *
 * Mede a taxa de quadros e o tempo de quadro real usando timestamps do sistema (performance.now()),
 * prevenindo que clamps de delta time (MAX_DELTA_TIME) mascarem ou forcem o framerate real para 10 FPS.
 */

export class FrameRateMonitor {
  private lastTimestamp: number = 0;
  private currentFps: number = 60;
  private currentFrameTimeMs: number = 16.6;
  private readonly history: number[] = [];
  private readonly sampleLimit: number;

  constructor(sampleLimit: number = 60) {
    this.sampleLimit = Math.max(10, sampleLimit);
  }

  /**
   * Atualiza a telemetria com base na chamada atual de renderização.
   * Se timestamp não for informado, usa performance.now() ou Date.now().
   */
  public tick(customTimestamp?: number): { fps: number; frameTimeMs: number } {
    const currentNow =
      customTimestamp ?? (typeof performance !== "undefined" ? performance.now() : Date.now());

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = currentNow;
      return { fps: this.currentFps, frameTimeMs: this.currentFrameTimeMs };
    }

    const elapsedMilliseconds = Math.max(0.5, currentNow - this.lastTimestamp);
    this.lastTimestamp = currentNow;
    this.currentFrameTimeMs = elapsedMilliseconds;

    const instantFps = Math.min(120, Math.max(1, Math.round(1000 / elapsedMilliseconds)));

    this.history.push(instantFps);
    if (this.history.length > this.sampleLimit) {
      this.history.shift();
    }

    const averageFps = Math.round(
      this.history.reduce((sum, value) => sum + value, 0) / this.history.length
    );
    this.currentFps = averageFps;

    return { fps: this.currentFps, frameTimeMs: this.currentFrameTimeMs };
  }

  public getFps(): number {
    return this.currentFps;
  }

  public getFrameTimeMs(): number {
    return this.currentFrameTimeMs;
  }

  public reset(): void {
    this.lastTimestamp = 0;
    this.currentFps = 60;
    this.currentFrameTimeMs = 16.6;
    this.history.length = 0;
  }
}
