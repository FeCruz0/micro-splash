import type { KaboomCtx } from "kaboom";
import { APP_VERSION } from "../config";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { showStatsModal } from "./statsModal";
import { createFocusGroup, type FocusableItem } from "./keyboardNav";
import { hasSeenOnboarding, showOnboardingModal } from "./onboardingModal";
import { t } from "../i18n/i18n";

export function createMainMenu(
  k: KaboomCtx,
  onStartMigration: (onClose: () => void) => void,
  onOptions: (onClose: () => void) => void,
  onCodex: (onClose: () => void) => void,
  onLeaderboard?: (onClose: () => void) => void
) {
  // Inicializa contexto de áudio para cliques da interface, mas sem disparar a trilha de migração
  audioSystem.init();
  audioSystem.stopMigrationAudio();

  let isModalOpen = false;

  // Fundo oceânico profundo
  k.add([k.rect(k.width(), k.height()), k.pos(0, 0), k.color(6, 18, 42), k.fixed(), k.z(0)]);

  // Partículas oceânicas temáticas de ambientação (Fase 31.6)
  const particles: any[] = [];
  const screenW = typeof k.width === "function" ? k.width() : 640;
  const screenH = typeof k.height === "function" ? k.height() : 360;

  // 1. Bolhas translúcidas ascendentes com contorno leve
  for (let i = 0; i < 12; i++) {
    const radius = typeof k.rand === "function" ? k.rand(2, 4.5) : 3;
    const comps: any[] = [
      k.circle(radius),
      k.pos(
        typeof k.rand === "function" ? k.rand(0, screenW) : Math.random() * screenW,
        typeof k.rand === "function" ? k.rand(0, screenH) : Math.random() * screenH
      ),
      k.color(70, 205, 255),
      k.opacity(typeof k.rand === "function" ? k.rand(0.25, 0.55) : 0.4),
      k.fixed(),
      k.z(1),
    ];
    if (typeof k.outline === "function") {
      comps.push(k.outline(1, k.rgb(180, 240, 255)));
    }
    const p = k.add(comps);
    const speed = typeof k.rand === "function" ? k.rand(14, 28) : 20;
    let time = typeof k.rand === "function" ? k.rand(0, 10) : i;

    p.onUpdate(() => {
      const dt = typeof k.dt === "function" ? k.dt() : 0.016;
      time += dt;
      p.pos.y -= dt * speed;
      p.pos.x += Math.sin(time * 2.2) * 0.4;
      if (p.pos.y < -12) {
        p.pos.y = screenH + 10;
        p.pos.x = typeof k.rand === "function" ? k.rand(0, screenW) : Math.random() * screenW;
      }
    });
    particles.push(p);
  }

  // 2. Plâncton brilhante em ângulo de 45°
  for (let i = 0; i < 12; i++) {
    const pColor = i % 2 === 0 ? k.rgb(80, 250, 220) : k.rgb(170, 255, 230);
    const baseOpacity = typeof k.rand === "function" ? k.rand(0.2, 0.5) : 0.35;
    const comps: any[] = [
      k.rect(2, 6, { radius: 1 }),
      k.pos(
        typeof k.rand === "function" ? k.rand(0, screenW) : Math.random() * screenW,
        typeof k.rand === "function" ? k.rand(0, screenH) : Math.random() * screenH
      ),
      k.color(pColor),
      k.opacity(baseOpacity),
      k.fixed(),
      k.z(1),
    ];
    if (typeof k.rotate === "function") {
      comps.push(k.rotate(45));
    }
    const p = k.add(comps);
    const speed = typeof k.rand === "function" ? k.rand(8, 18) : 12;
    let time = typeof k.rand === "function" ? k.rand(0, 10) : i;

    p.onUpdate(() => {
      const dt = typeof k.dt === "function" ? k.dt() : 0.016;
      time += dt;
      p.pos.y -= dt * speed;
      p.pos.x += Math.cos(time * 1.5) * 0.3;
      p.opacity = Math.max(0.1, Math.min(0.8, baseOpacity + Math.sin(time * 3) * 0.15));
      if (p.pos.y < -12) {
        p.pos.y = screenH + 10;
        p.pos.x = typeof k.rand === "function" ? k.rand(0, screenW) : Math.random() * screenW;
      }
    });
    particles.push(p);
  }

  // 3. Mini-águas-vivas / medusas estilizadas
  for (let i = 0; i < 6; i++) {
    const baseOpacity = typeof k.rand === "function" ? k.rand(0.28, 0.55) : 0.4;
    const p = k.add([
      k.rect(9, 6, { radius: 3 }),
      k.pos(
        typeof k.rand === "function" ? k.rand(20, screenW - 20) : 50 + i * 90,
        typeof k.rand === "function" ? k.rand(50, screenH) : 100 + i * 40
      ),
      k.color(140, 220, 255),
      k.opacity(baseOpacity),
      k.scale(1, 1),
      k.anchor("center"),
      k.fixed(),
      k.z(1),
    ]);
    const speed = typeof k.rand === "function" ? k.rand(6, 14) : 10;
    let time = typeof k.rand === "function" ? k.rand(0, 10) : i * 1.5;

    p.onUpdate(() => {
      const dt = typeof k.dt === "function" ? k.dt() : 0.016;
      time += dt;
      p.pos.y -= dt * speed;
      p.pos.x += Math.sin(time * 0.8) * 0.25;
      const pulse = Math.sin(time * 2.8);
      if (typeof k.scale === "function" && p.scale) {
        p.scale = k.vec2(1 - pulse * 0.12, 1 + pulse * 0.22);
      }
      if (p.pos.y < -16) {
        p.pos.y = screenH + 15;
        p.pos.x = typeof k.rand === "function" ? k.rand(20, screenW - 20) : Math.random() * screenW;
      }
    });
    particles.push(p);
  }

  // Jubarte cenográfica de fundo navegando no menu principal com nado orgânico
  try {
    const menuWhale = k.add([
      k.sprite("baleia", { anim: "idle_swim" }),
      k.pos(k.width() / 2, k.height() / 2 + 10),
      k.scale(1.15),
      k.rotate(0),
      k.anchor("center"),
      k.color(140, 210, 245),
      k.opacity(0.18),
      k.fixed(),
      k.z(2),
    ]);

    let menuWhaleTime = 0;
    menuWhale.onUpdate(() => {
      menuWhaleTime += k.dt();
      const idleBreath = Math.sin(menuWhaleTime * 1.4) * 0.016;
      menuWhale.scale = k.vec2(1.15 * (1 - idleBreath * 0.35), 1.15 * (1 + idleBreath));
      menuWhale.pos.y = k.height() / 2 + 10 + Math.sin(menuWhaleTime * 0.9) * 8;
      menuWhale.pos.x = k.width() / 2 + Math.sin(menuWhaleTime * 0.35) * 22;
      const swell = Math.sin(menuWhaleTime * 0.8) * 2.2;
      const ripple = Math.sin(menuWhaleTime * 2.1) * 0.6;
      menuWhale.angle = swell + ripple;
    });
  } catch {
    // Ignora silenciosamente caso mock de teste não forneça sprite baleia
  }

  // Título Sombra
  // Sombra do Título
  k.add([
    k.text("MICRO SPLASH", { size: 56, font: "Outfit" }),
    k.pos(k.width() / 2 + 3, k.height() / 2 - 170 + 3),
    k.color(2, 8, 20),
    k.anchor("center"),
    k.fixed(),
    k.z(10),
  ]);

  // Título Principal
  k.add([
    k.text("MICRO SPLASH", { size: 56, font: "Outfit" }),
    k.pos(k.width() / 2, k.height() / 2 - 170),
    k.color(100, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(11),
  ]);

  // Subtítulo
  k.add([
    k.text(`${t("menu.subtitle")} 🐋`, {
      size: accessibilitySystem.scaleFont(20),
      font: "Outfit",
    }),
    k.pos(k.width() / 2, k.height() / 2 - 120),
    k.color(200, 235, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(11),
  ]);

  // Placar Recorde
  const highScore = Number(localStorage.getItem("micro_splash_highscore") || 0);
  if (highScore > 0) {
    k.add([
      k.text(`🏆 Recorde Histórico: ${highScore} Eco-Pontos`, {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(k.width() / 2, k.height() / 2 - 84),
      k.color(255, 215, 80),
      k.anchor("center"),
      k.fixed(),
      k.z(11),
    ]);
  }

  // ==========================================
  // BOTÕES PRINCIPAIS DO MENU
  // ==========================================
  const menuButtons = [
    {
      label: `🌊 ${t("menu.play")}`,
      y: k.height() / 2 - 50,
      bg: k.rgb(20, 140, 200),
      hover: k.rgb(35, 175, 240),
      outline: k.rgb(100, 250, 255),
      action: onStartMigration,
    },
    {
      label: "🏆 RANKING TOP 10",
      y: k.height() / 2 + 6,
      bg: k.rgb(26, 85, 150),
      hover: k.rgb(40, 120, 200),
      outline: k.rgb(255, 215, 80),
      action: (onClose: () => void) => {
        if (onLeaderboard) onLeaderboard(onClose);
        else onClose();
      },
    },
    {
      label: "📊 IMPACTO COLETIVO",
      y: k.height() / 2 + 62,
      bg: k.rgb(18, 95, 130),
      hover: k.rgb(28, 135, 180),
      outline: k.rgb(0, 230, 255),
      action: (onClose: () => void) => {
        showStatsModal(k, onClose);
      },
    },
    {
      label: `📖 ${t("menu.codex")}`,
      y: k.height() / 2 + 118,
      bg: k.rgb(20, 50, 100),
      hover: k.rgb(30, 80, 145),
      outline: k.rgb(180, 220, 255),
      action: onCodex,
    },
    {
      label: `⚙️ ${t("menu.options")}`,
      y: k.height() / 2 + 174,
      bg: k.rgb(24, 65, 120),
      hover: k.rgb(35, 95, 165),
      outline: k.rgb(80, 180, 240),
      action: onOptions,
    },
  ];

  const focusItems: FocusableItem[] = [];

  menuButtons.forEach((btnData) => {
    const btnPos = k.vec2(k.width() / 2, btnData.y);
    const btn = k.add([
      k.rect(420, 50, { radius: 11 }),
      k.pos(btnPos),
      k.color(btnData.bg),
      k.outline(2, btnData.outline),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(12),
    ]);

    k.add([
      k.text(btnData.label, {
        size: accessibilitySystem.scaleFont(18),
        font: "Outfit",
      }),
      k.pos(btnPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(13),
    ]);

    const activate = () => {
      resetIdle();
      if (isModalOpen) return;
      audioSystem.playUiClick();
      isModalOpen = true;
      btnData.action(() => {
        isModalOpen = false;
        resetIdle();
      });
    };

    btn.onHoverUpdate(() => {
      if (isModalOpen) return;
      btn.color = btnData.hover;
      btn.scale = k.vec2(1.02, 1.02);
    });
    btn.onHoverEnd(() => {
      btn.color = btnData.bg;
      btn.scale = k.vec2(1, 1);
    });

    btn.onClick(activate);

    focusItems.push({
      pos: btnPos,
      width: 420,
      height: 50,
      onActivate: activate,
    });
  });

  createFocusGroup(k, {
    items: focusItems,
    initialIndex: 0,
    ringZ: 14,
    isEnabled: () => !isModalOpen,
  });

  // Rodapé Educativo e Institucional
  k.add([
    k.text(
      "Inspirado nas pesquisas de conservação do Instituto Baleia Jubarte\nTrilha: 'Aquatic Ambience' (David Wise) & 16-Bit Lofi Ocean",
      {
        size: accessibilitySystem.scaleFont(13.5),
        font: "Inter",
        align: "center",
        lineSpacing: 4.5,
      }
    ),
    k.pos(k.width() / 2, k.height() - 34),
    k.color(140, 180, 220),
    k.anchor("center"),
    k.fixed(),
    k.z(11),
  ]);

  // Versão da aplicação (Fase 25 - Diagnóstico de Totem & PWA)
  k.add([
    k.text(`v${APP_VERSION}`, {
      size: accessibilitySystem.scaleFont(12),
      font: "Inter",
    }),
    k.pos(k.width() - 14, k.height() - 12),
    k.anchor("botright"),
    k.color(120, 160, 210),
    k.opacity(0.65),
    k.fixed(),
    k.z(11),
  ]);

  // =========================================================================
  // FASE 10: TIMER DE INATIVIDADE PARA MODO KIOSK (45 SEGUNDOS)
  // =========================================================================
  let idleTime = 0;
  const resetIdle = () => {
    idleTime = 0;
  };

  k.onKeyPress(resetIdle);
  k.onMousePress(resetIdle);
  k.onMouseMove(resetIdle);

  const idleLoop = k.onUpdate(() => {
    if (!isModalOpen) {
      idleTime += k.dt();
      if (idleTime >= 45) {
        idleLoop.cancel();
        k.go("kiosk");
      }
    } else {
      idleTime = 0;
    }
  });

  // Fase 21: Se for a primeira inicialização do jogo (totens ou novos jogadores), exibe o onboarding contextual protegido
  if (!hasSeenOnboarding()) {
    isModalOpen = true;
    showOnboardingModal(k, () => {
      isModalOpen = false;
      resetIdle();
    });
  }
}
