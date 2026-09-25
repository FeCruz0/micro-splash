import type { KaboomCtx } from "kaboom";
import { audioSystem } from "./audioSystem";
import { setupLightRaysSystem } from "./lightRaysSystem";

/**
 * Modo Kiosk (Attract Mode / Demonstração Cinematográfica Autônoma)
 * Projetado para totens interativos e demonstrações em eventos e exposições.
 */
export function createKioskScene(k: KaboomCtx) {
  // Prepara áudio ambiente suave e canto de baleia espaçado
  audioSystem.init();
  audioSystem.startMigrationAudio(6000);

  // Fundo marinho gradiente profundo
  k.add([k.rect(k.width(), k.height()), k.pos(0, 0), k.color(8, 28, 62), k.fixed(), k.z(-20)]);

  // Faixa de céu na superfície
  k.add([k.rect(k.width(), 75), k.pos(0, 0), k.color(110, 185, 240), k.fixed(), k.z(-15)]);

  // Linha da superfície
  k.add([k.rect(k.width(), 8), k.pos(0, 75), k.color(30, 90, 160), k.fixed(), k.z(-10)]);

  // Leito oceânico de fundo
  k.add([
    k.rect(k.width(), 35),
    k.pos(0, k.height() - 35),
    k.color(15, 38, 70),
    k.fixed(),
    k.z(-10),
  ]);

  // Feixes de luz solares subaquáticos (God Rays)
  setupLightRaysSystem(k);

  // Cardumes estéticos de Krill nadando em bandos decorativos
  for (let i = 0; i < 24; i++) {
    const krill = k.add([
      k.rect(4, 3, { radius: 1 }),
      k.pos(k.rand(100, k.width() - 100), k.rand(120, k.height() - 70)),
      k.color(255, 110, 90),
      k.opacity(k.rand(0.4, 0.8)),
      k.z(-2),
    ]);
    const kSpeed = k.rand(15, 35);
    const kAngleOffset = k.rand(0, Math.PI * 2);
    krill.onUpdate(() => {
      krill.pos.x -= k.dt() * kSpeed;
      krill.pos.y += Math.sin(k.time() * 2 + kAngleOffset) * 0.3;
      if (krill.pos.x < -20) {
        krill.pos.x = k.width() + 20;
        krill.pos.y = k.rand(120, k.height() - 70);
      }
    });
  }

  // =========================================================================
  // BALEIA-JUBARTE AUTÔNOMA (CENOGRÁFICA)
  // =========================================================================
  const baleia = k.add([
    k.sprite("baleia", { anim: "idle_swim" }),
    k.pos(120, 220),
    k.scale(1, 1),
    k.anchor("center"),
    k.rotate(0),
    k.z(10),
  ]);

  let whaleTimer = 0;
  let animTimer = 0;
  let songTimer = 2.0; // Primeiro canto após 2s
  let sonarTimer = 4.0;
  let currentAnim = "idle_swim";

  baleia.onUpdate(() => {
    const dt = k.dt();
    whaleTimer += dt;
    animTimer += dt;
    songTimer -= dt;
    sonarTimer -= dt;

    // Movimento senoidal gracioso simulando cruzeiro migratório
    baleia.pos.x += dt * 55;
    baleia.pos.y = 210 + Math.sin(whaleTimer * 0.9) * 45;

    // Inclinação suave do corpo acompanhando a trajetória vertical com swell oceânico
    const swell = Math.sin(whaleTimer * 0.8) * 2.2;
    const ripple = Math.sin(whaleTimer * 2.1) * 0.6;
    const trajectoryAngle = Math.cos(whaleTimer * 0.9) * 12;
    const targetAngle = trajectoryAngle + (currentAnim === "idle_swim" ? swell + ripple : 0);
    baleia.angle = k.lerp(baleia.angle, targetAngle, 0.08);

    // Respiração abdominal e squash & stretch orgânico
    const idleBreath = Math.sin(whaleTimer * 1.4) * 0.016;
    if (baleia.scale) {
      if (currentAnim === "swim") {
        const strokePhase = Math.sin((animTimer / 1.2) * Math.PI) * 0.06;
        baleia.scale.x = k.lerp(baleia.scale.x, 1.0 + strokePhase, dt * 8);
        baleia.scale.y = k.lerp(baleia.scale.y, 1.0 - strokePhase * 0.65, dt * 8);
      } else {
        baleia.scale.x = k.lerp(baleia.scale.x, 1.0 - idleBreath * 0.35, dt * 8);
        baleia.scale.y = k.lerp(baleia.scale.y, 1.0 + idleBreath, dt * 8);
      }
    }

    // Ciclo de nado (idle_swim calmo contínuo -> batida muscular ativa -> idle_swim)
    if (animTimer > 3.2) {
      animTimer = 0;
      currentAnim = "swim";
      baleia.play("swim");
      audioSystem.playStrokeThrust();

      // Borbulhas do impulso da cauda
      for (let b = 0; b < 4; b++) {
        const bubble = k.add([
          k.circle(k.rand(2, 4)),
          k.pos(baleia.pos.x - 45, baleia.pos.y + k.rand(-5, 8)),
          k.color(200, 240, 255),
          k.opacity(0.7),
          k.z(5),
        ]);
        bubble.onUpdate(() => {
          bubble.pos.x -= dt * 40;
          bubble.pos.y -= dt * 18;
          bubble.opacity -= dt * 0.8;
          if (bubble.opacity <= 0) k.destroy(bubble);
        });
      }
    } else if (animTimer > 1.2 && currentAnim === "swim") {
      currentAnim = "idle_swim";
      baleia.play("idle_swim");
    }

    // Wrap da tela: quando a baleia cruza o canto direito, reentra pelo esquerdo
    if (baleia.pos.x > k.width() + 100) {
      baleia.pos.x = -80;
    }

    // Cantos majestosos espaçados
    if (songTimer <= 0) {
      songTimer = 8.5;
      audioSystem.playWhaleSong(1.0, 1.0);
    }

    // Biosonar demonstrativo periódico (efeito visual, sem som de radar para deixar apenas o canto da baleia)
    if (sonarTimer <= 0) {
      sonarTimer = 6.0;

      const pulse = k.add([
        k.circle(12),
        k.pos(baleia.pos.x + 40, baleia.pos.y - 2),
        k.color(0, 230, 255),
        k.outline(2, k.rgb(180, 255, 255)),
        k.opacity(0.8),
        k.z(15),
      ]);

      pulse.onUpdate(() => {
        pulse.radius += dt * 420;
        pulse.opacity -= dt * 1.1;
        if (pulse.opacity <= 0 || pulse.radius >= 400) k.destroy(pulse);
      });
    }
  });

  // =========================================================================
  // OVERLAY KIOSK & CHAMADA PARA AÇÃO (ATTRACT BANNER)
  // =========================================================================
  // Faixa Superior
  k.add([
    k.rect(k.width(), 44),
    k.pos(0, 0),
    k.color(4, 14, 32),
    k.opacity(0.85),
    k.fixed(),
    k.z(100),
  ]);

  k.add([
    k.text("🌊 MICRO SPLASH: A GRANDE MIGRAÇÃO DA BALEIA-JUBARTE 🐋", {
      size: 14,
      font: "sans-serif",
    }),
    k.pos(k.width() / 2, 22),
    k.color(100, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(101),
  ]);

  // Faixa Inferior / Chamada Interativa
  k.add([
    k.rect(k.width(), 56),
    k.pos(0, k.height() - 56),
    k.color(4, 14, 32),
    k.opacity(0.9),
    k.fixed(),
    k.z(100),
  ]);

  const callToActionText = k.add([
    k.text("👉 TOQUE NA TELA OU PRESSIONE QUALQUER TECLA PARA JOGAR! 👈", {
      size: 15,
      font: "sans-serif",
    }),
    k.pos(k.width() / 2, k.height() - 28),
    k.color(255, 230, 80),
    k.opacity(1),
    k.anchor("center"),
    k.fixed(),
    k.z(101),
  ]);

  // Efeito de pulsação e brilho no texto de chamada
  callToActionText.onUpdate(() => {
    const pulse = 0.75 + Math.sin(k.time() * 5) * 0.25;
    callToActionText.opacity = pulse;
  });

  // =========================================================================
  // INTERRUPÇÃO DA DEMONSTRAÇÃO (RETORNO OU INÍCIO)
  // =========================================================================
  let hasExited = false;
  const exitKiosk = () => {
    if (hasExited) return;
    hasExited = true;
    audioSystem.playUiClick();
    audioSystem.stopMigrationAudio();

    // Transição suave de volta ao menu
    const fade = k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(6, 18, 42),
      k.opacity(0),
      k.fixed(),
      k.z(200),
    ]);

    k.tween(0, 1, 0.35, (val) => (fade.opacity = val)).then(() => {
      k.go("menu");
    });
  };

  // Qualquer interação do usuário encerra a demo
  k.onKeyPress(exitKiosk);
  k.onMousePress(exitKiosk);
  if (typeof window !== "undefined") {
    window.addEventListener("touchstart", exitKiosk, { once: true, passive: true });
  }
}
