import { z } from "zod";
import { audioSystem } from "./audioSystem";
import { setupLightRaysSystem } from "./lightRaysSystem";
import { readLocalStorageWithSchema, writeLocalStorage } from "../utils/storage";

const KIOSK_TIMEOUT_STORAGE_KEY = "micro_splash_kiosk_timeout";
const KioskTimeoutSchema = z.number().int().nonnegative().default(45);

export function getKioskIdleTimeoutSeconds(): number {
  return readLocalStorageWithSchema(KIOSK_TIMEOUT_STORAGE_KEY, KioskTimeoutSchema, 45);
}

export function setKioskIdleTimeoutSeconds(seconds: number): void {
  writeLocalStorage(KIOSK_TIMEOUT_STORAGE_KEY, Math.max(0, Math.floor(seconds)));
}

export interface ShowKioskEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
}

export interface LegacyKioskUiObject {
  hidden?: boolean;
  color?: unknown;
  scale?: { x: number; y: number } | unknown;
  width?: number;
  height?: number;
  text?: string;
  outline?: { color?: unknown; width?: number };
  opacity?: number;
  pos?: { x: number; y: number };
  angle?: number;
  radius?: number;
  destroy?(): void;
  play?(anim: string): void;
  onUpdate?(callback: () => void): unknown;
}

export interface LegacyKioskEngineContext {
  width(): number;
  height(): number;
  rand(min: number, max: number): number;
  dt(): number;
  time(): number;
  lerp(a: number, b: number, t: number): number;
  add(components?: unknown): LegacyKioskUiObject;
  rect(width: number, height: number, options?: unknown): unknown;
  circle(radius: number): unknown;
  pos(x: number, y: number): unknown;
  pos(position: { x: number; y: number }): unknown;
  color(...args: unknown[]): unknown;
  rgb(red: number, green: number, blue: number): unknown;
  outline(width: number, color: unknown): unknown;
  opacity(alpha: number): unknown;
  anchor(anchorPoint: "center" | "topleft" | "left" | "right" | "top"): unknown;
  rotate(degrees: number): unknown;
  fixed(): unknown;
  z(zIndex: number): unknown;
  scale(factor: number): unknown;
  scale(factor: { x: number; y: number }): unknown;
  scale(factorX: number, factorY: number): unknown;
  text(content: string, options?: unknown): unknown;
  sprite?(id: string, options?: unknown): unknown;
  destroy(target: unknown): void;
  onKeyPress(callback: () => void): { cancel: () => void };
  onMousePress(callback: () => void): { cancel: () => void };
  go(sceneName: string): void;
  tween(
    from: number,
    to: number,
    duration: number,
    setter: (value: number) => void
  ): { then(callback: () => void): void };
}

/**
 * Modo Kiosk (Attract Mode / Demonstração Cinematográfica Autônoma)
 * Projetado para totens interativos e demonstrações em eventos e exposições.
 */
export function createKioskScene(k: ShowKioskEngineContext) {
  const engine = k as unknown as LegacyKioskEngineContext;
  // Prepara áudio ambiente suave e canto de baleia espaçado
  audioSystem.init();
  audioSystem.startMigrationAudio(6000);

  // Fundo marinho gradiente profundo
  engine.add([
    engine.rect(engine.width(), engine.height()),
    engine.pos(0, 0),
    engine.color(8, 28, 62),
    engine.fixed(),
    engine.z(-20),
  ]);

  // Faixa de céu na superfície
  engine.add([
    engine.rect(engine.width(), 75),
    engine.pos(0, 0),
    engine.color(110, 185, 240),
    engine.fixed(),
    engine.z(-15),
  ]);

  // Linha da superfície
  engine.add([
    engine.rect(engine.width(), 8),
    engine.pos(0, 75),
    engine.color(30, 90, 160),
    engine.fixed(),
    engine.z(-10),
  ]);

  // Leito oceânico de fundo
  engine.add([
    engine.rect(engine.width(), 35),
    engine.pos(0, engine.height() - 35),
    engine.color(15, 38, 70),
    engine.fixed(),
    engine.z(-10),
  ]);

  // Feixes de luz solares subaquáticos (God Rays)
  setupLightRaysSystem(engine as unknown as Parameters<typeof setupLightRaysSystem>[0]);

  // Cardumes estéticos de Krill nadando em bandos decorativos
  for (let i = 0; i < 24; i++) {
    const krill = engine.add([
      engine.rect(4, 3, { radius: 1 }),
      engine.pos(engine.rand(100, engine.width() - 100), engine.rand(120, engine.height() - 70)),
      engine.color(255, 110, 90),
      engine.opacity(engine.rand(0.4, 0.8)),
      engine.z(-2),
    ]);
    const kSpeed = engine.rand(15, 35);
    const kAngleOffset = engine.rand(0, Math.PI * 2);
    if (typeof krill.onUpdate === "function") {
      krill.onUpdate(() => {
        if (krill.pos) {
          krill.pos.x -= engine.dt() * kSpeed;
          krill.pos.y += Math.sin(engine.time() * 2 + kAngleOffset) * 0.3;
          if (krill.pos.x < -20) {
            krill.pos.x = engine.width() + 20;
            krill.pos.y = engine.rand(120, engine.height() - 70);
          }
        }
      });
    }
  }

  // =========================================================================
  // BALEIA-JUBARTE AUTÔNOMA (CENOGRÁFICA)
  // =========================================================================
  const baleia = engine.add([
    ...(typeof engine.sprite === "function"
      ? [engine.sprite("baleia", { anim: "idle_swim" })]
      : []),
    engine.pos(120, 220),
    engine.scale(1, 1),
    engine.anchor("center"),
    engine.rotate(0),
    engine.z(10),
  ]);

  let whaleTimer = 0;
  let animTimer = 0;
  let songTimer = 2.0; // Primeiro canto após 2s
  let sonarTimer = 4.0;
  let currentAnim = "idle_swim";

  if (typeof baleia.onUpdate === "function") {
    baleia.onUpdate(() => {
      const dt = engine.dt();
      whaleTimer += dt;
      animTimer += dt;
      songTimer -= dt;
      sonarTimer -= dt;

      // Movimento senoidal gracioso simulando cruzeiro migratório
      if (baleia.pos) {
        baleia.pos.x += dt * 55;
        baleia.pos.y = 210 + Math.sin(whaleTimer * 0.9) * 45;
      }

      // Inclinação suave do corpo acompanhando a trajetória vertical com swell oceânico
      const swell = Math.sin(whaleTimer * 0.8) * 2.2;
      const ripple = Math.sin(whaleTimer * 2.1) * 0.6;
      const trajectoryAngle = Math.cos(whaleTimer * 0.9) * 12;
      const targetAngle = trajectoryAngle + (currentAnim === "idle_swim" ? swell + ripple : 0);
      if (typeof baleia.angle === "number") {
        baleia.angle = engine.lerp(baleia.angle, targetAngle, 0.08);
      }

      // Respiração abdominal e squash & stretch orgânico
      const idleBreath = Math.sin(whaleTimer * 1.4) * 0.016;
      const scaleObj = baleia.scale as { x: number; y: number } | undefined;
      if (scaleObj && typeof scaleObj.x === "number") {
        if (currentAnim === "swim") {
          const strokePhase = Math.sin((animTimer / 1.2) * Math.PI) * 0.06;
          scaleObj.x = engine.lerp(scaleObj.x, 1.0 + strokePhase, dt * 8);
          scaleObj.y = engine.lerp(scaleObj.y, 1.0 - strokePhase * 0.65, dt * 8);
        } else {
          scaleObj.x = engine.lerp(scaleObj.x, 1.0 - idleBreath * 0.35, dt * 8);
          scaleObj.y = engine.lerp(scaleObj.y, 1.0 + idleBreath, dt * 8);
        }
      }

      // Ciclo de nado (idle_swim calmo contínuo -> batida muscular ativa -> idle_swim)
      if (animTimer > 3.2) {
        animTimer = 0;
        currentAnim = "swim";
        baleia.play?.("swim");
        audioSystem.playStrokeThrust();

        // Borbulhas do impulso da cauda
        for (let b = 0; b < 4; b++) {
          const bubble = engine.add([
            engine.circle(engine.rand(2, 4)),
            engine.pos((baleia.pos?.x ?? 0) - 45, (baleia.pos?.y ?? 0) + engine.rand(-5, 8)),
            engine.color(200, 240, 255),
            engine.opacity(0.7),
            engine.z(5),
          ]);
          if (typeof bubble.onUpdate === "function") {
            bubble.onUpdate(() => {
              if (bubble.pos && typeof bubble.opacity === "number") {
                bubble.pos.x -= dt * 40;
                bubble.pos.y -= dt * 18;
                bubble.opacity -= dt * 0.8;
                if (bubble.opacity <= 0) engine.destroy(bubble);
              }
            });
          }
        }
      } else if (animTimer > 1.2 && currentAnim === "swim") {
        currentAnim = "idle_swim";
        baleia.play?.("idle_swim");
      }

      // Wrap da tela: quando a baleia cruza o canto direito, reentra pelo esquerdo
      if (baleia.pos && baleia.pos.x > engine.width() + 100) {
        baleia.pos.x = -80;
      }

      // Cantos majestosos espaçados
      if (songTimer <= 0) {
        songTimer = 8.5;
        audioSystem.playWhaleSong(1.0, 1.0);
      }

      // Biosonar demonstrativo periódico (efeito visual)
      if (sonarTimer <= 0) {
        sonarTimer = 6.0;

        const pulse = engine.add([
          engine.circle(12),
          engine.pos((baleia.pos?.x ?? 0) + 40, (baleia.pos?.y ?? 0) - 2),
          engine.color(0, 230, 255),
          engine.outline(2, engine.rgb(180, 255, 255)),
          engine.opacity(0.8),
          engine.z(15),
        ]);

        if (typeof pulse.onUpdate === "function") {
          pulse.onUpdate(() => {
            if (typeof pulse.radius === "number" && typeof pulse.opacity === "number") {
              pulse.radius += dt * 420;
              pulse.opacity -= dt * 1.1;
              if (pulse.opacity <= 0 || pulse.radius >= 400) engine.destroy(pulse);
            }
          });
        }
      }
    });
  }

  // =========================================================================
  // OVERLAY KIOSK & CHAMADA PARA AÇÃO (ATTRACT BANNER)
  // =========================================================================
  // Faixa Superior
  engine.add([
    engine.rect(engine.width(), 44),
    engine.pos(0, 0),
    engine.color(4, 14, 32),
    engine.opacity(0.85),
    engine.fixed(),
    engine.z(100),
  ]);

  engine.add([
    engine.text("🌊 MICRO SPLASH: A GRANDE MIGRAÇÃO DA BALEIA-JUBARTE 🐋", {
      size: 15,
      font: "Outfit",
    }),
    engine.pos(engine.width() / 2, 22),
    engine.color(100, 240, 255),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(101),
  ]);

  // Faixa Inferior / Chamada Interativa
  engine.add([
    engine.rect(engine.width(), 56),
    engine.pos(0, engine.height() - 56),
    engine.color(4, 14, 32),
    engine.opacity(0.9),
    engine.fixed(),
    engine.z(100),
  ]);

  const callToActionText = engine.add([
    engine.text("👉 TOQUE NA TELA OU PRESSIONE QUALQUER TECLA PARA JOGAR! 👈", {
      size: 16,
      font: "Outfit",
    }),
    engine.pos(engine.width() / 2, engine.height() - 28),
    engine.color(255, 230, 80),
    engine.opacity(1),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(101),
  ]);

  // Efeito de pulsação e brilho no texto de chamada
  if (typeof callToActionText.onUpdate === "function") {
    callToActionText.onUpdate(() => {
      const pulse = 0.75 + Math.sin(engine.time() * 5) * 0.25;
      callToActionText.opacity = pulse;
    });
  }

  // =========================================================================
  // INTERRUPÇÃO DA DEMONSTRAÇÃO (RETORNO OU INÍCIO)
  // =========================================================================
  let hasExited = false;
  const exitKiosk = () => {
    if (hasExited) return;
    hasExited = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("touchstart", exitKiosk);
    }
    audioSystem.playUiClick();
    audioSystem.stopMigrationAudio();

    // Transição suave de volta ao menu
    const fade = engine.add([
      engine.rect(engine.width(), engine.height()),
      engine.pos(0, 0),
      engine.color(6, 18, 42),
      engine.opacity(0),
      engine.fixed(),
      engine.z(200),
    ]);

    engine
      .tween(0, 1, 0.35, (val) => (fade.opacity = val))
      .then(() => {
        engine.go("menu");
      });
  };

  // Qualquer interação do usuário encerra a demo
  engine.onKeyPress(exitKiosk);
  engine.onMousePress(exitKiosk);
  if (typeof window !== "undefined") {
    window.addEventListener("touchstart", exitKiosk, { once: true, passive: true });
  }
}
