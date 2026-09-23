/**
 * Sistema de Feedback Háptico para Dispositivos Móveis (Fase 18.4)
 * Utiliza a API navigator.vibrate para fornecer retorno sensorial tátil
 * em saltos polares, colisões e no pulso do Biosonar.
 */

const STORAGE_KEY = "micro_splash_haptics_enabled";

class HapticsSystem {
  private enabled: boolean = true;

  constructor() {
    this.loadSettings();
  }

  public isSupported(): boolean {
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
      }
    } catch {}
  }

  public toggle(): boolean {
    const newState = !this.enabled;
    this.setEnabled(newState);
    if (newState) {
      this.vibrate(30);
    }
    return newState;
  }

  private vibrate(pattern: number | number[]): boolean {
    if (!this.enabled || !this.isSupported()) return false;
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  /**
   * Pulso firme duplo ao romper blocos de gelo polar no salto
   */
  public triggerIceBreach(): void {
    this.vibrate([40, 30, 90]);
  }

  /**
   * Vibração áspera de impacto ao colidir com lixo plástico ou rede fantasma
   */
  public triggerCollision(): void {
    this.vibrate([30, 25, 60]);
  }

  /**
   * Micro-pulso tátil suave ao emitir o pulso circular do Biosonar 360°
   */
  public triggerSonar(): void {
    this.vibrate(25);
  }

  /**
   * Micro-vibração ao receber impulso hidrodinâmico de correnteza ou vácuo
   */
  public triggerSpeedBoost(): void {
    this.vibrate([15, 20, 30]);
  }

  private loadSettings(): void {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          this.enabled = JSON.parse(saved);
        }
      }
    } catch {}
  }
}

export const hapticsSystem = new HapticsSystem();
