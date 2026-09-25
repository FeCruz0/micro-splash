import type { KaboomCtx } from "kaboom";
import { APP_VERSION } from "../config";
import { audioSystem } from "../systems/audioSystem";
import { showStatsModal } from "./statsModal";

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

  // Partículas bioluminescentes flutuantes
  const particles: any[] = [];
  for (let i = 0; i < 30; i++) {
    const p = k.add([
      k.circle(k.rand(1.5, 3.5)),
      k.pos(k.rand(0, k.width()), k.rand(0, k.height())),
      k.color(k.choose([k.rgb(100, 240, 255), k.rgb(180, 255, 230), k.rgb(255, 230, 120)])),
      k.opacity(k.rand(0.2, 0.7)),
      k.fixed(),
      k.z(1),
    ]);
    const speed = k.rand(10, 25);
    let time = k.rand(0, 10);
    p.onUpdate(() => {
      time += k.dt();
      p.pos.y -= k.dt() * speed;
      p.pos.x += Math.sin(time) * 0.4;
      if (p.pos.y < -10) {
        p.pos.y = k.height() + 10;
        p.pos.x = k.rand(0, k.width());
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
  k.add([
    k.text("MICRO SPLASH", { size: 48, font: "sans-serif" }),
    k.pos(k.width() / 2 + 3, k.height() / 2 - 170 + 3),
    k.color(2, 8, 20),
    k.anchor("center"),
    k.fixed(),
    k.z(10),
  ]);

  // Título Principal
  k.add([
    k.text("MICRO SPLASH", { size: 48, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 170),
    k.color(100, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(11),
  ]);

  // Subtítulo
  k.add([
    k.text("A Grande Migração da Baleia-Jubarte 🐋", { size: 16, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 124),
    k.color(200, 235, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(11),
  ]);

  // Placar Recorde
  const highScore = Number(localStorage.getItem("micro_splash_highscore") || 0);
  if (highScore > 0) {
    k.add([
      k.text(`🏆 Recorde Histórico: ${highScore} Eco-Pontos`, { size: 12, font: "sans-serif" }),
      k.pos(k.width() / 2, k.height() / 2 - 88),
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
      label: "🌊 INICIAR MIGRAÇÃO",
      y: k.height() / 2 - 50,
      bg: k.rgb(20, 140, 200),
      hover: k.rgb(35, 175, 240),
      outline: k.rgb(100, 250, 255),
      action: onStartMigration,
    },
    {
      label: "🏆 RANKING TOP 10",
      y: k.height() / 2 - 2,
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
      y: k.height() / 2 + 46,
      bg: k.rgb(18, 95, 130),
      hover: k.rgb(28, 135, 180),
      outline: k.rgb(0, 230, 255),
      action: (onClose: () => void) => {
        showStatsModal(k, onClose);
      },
    },
    {
      label: "📖 DIÁRIO DE BORDO",
      y: k.height() / 2 + 94,
      bg: k.rgb(20, 50, 100),
      hover: k.rgb(30, 80, 145),
      outline: k.rgb(180, 220, 255),
      action: onCodex,
    },
    {
      label: "⚙️ OPÇÕES",
      y: k.height() / 2 + 142,
      bg: k.rgb(24, 65, 120),
      hover: k.rgb(35, 95, 165),
      outline: k.rgb(80, 180, 240),
      action: onOptions,
    },
  ];

  menuButtons.forEach((btnData) => {
    const btn = k.add([
      k.rect(340, 44, { radius: 10 }),
      k.pos(k.width() / 2, btnData.y),
      k.color(btnData.bg),
      k.outline(2, btnData.outline),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(12),
    ]);

    k.add([
      k.text(btnData.label, { size: 15, font: "sans-serif" }),
      k.pos(k.width() / 2, btnData.y),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(13),
    ]);

    btn.onHoverUpdate(() => {
      if (isModalOpen) return;
      btn.color = btnData.hover;
      btn.scale = k.vec2(1.02, 1.02);
    });
    btn.onHoverEnd(() => {
      btn.color = btnData.bg;
      btn.scale = k.vec2(1, 1);
    });

    btn.onClick(() => {
      resetIdle();
      if (isModalOpen) return;
      audioSystem.playUiClick();
      isModalOpen = true;
      btnData.action(() => {
        isModalOpen = false;
        resetIdle();
      });
    });
  });

  // Rodapé Educativo e Institucional
  k.add([
    k.text(
      "Inspirado nas pesquisas de conservação do Instituto Baleia Jubarte\nTrilha: 'Aquatic Ambience' (David Wise) & 16-Bit Lofi Ocean",
      {
        size: 10,
        font: "sans-serif",
        align: "center",
        lineSpacing: 4,
      }
    ),
    k.pos(k.width() / 2, k.height() - 35),
    k.color(140, 180, 220),
    k.anchor("center"),
    k.fixed(),
    k.z(11),
  ]);

  // Versão da aplicação (Fase 25 - Diagnóstico de Totem & PWA)
  k.add([
    k.text(`v${APP_VERSION}`, { size: 10, font: "sans-serif" }),
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
}
