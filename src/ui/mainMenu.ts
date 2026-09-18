import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";

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
  k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(6, 18, 42),
    k.fixed(),
    k.z(0),
  ]);

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

  // Título Sombra
  k.add([
    k.text("MICRO SPLASH", { size: 48, font: "sans-serif" }),
    k.pos(k.width() / 2 + 3, k.height() / 2 - 165 + 3),
    k.color(2, 8, 20),
    k.anchor("center"),
    k.fixed(),
    k.z(10),
  ]);

  // Título Principal
  k.add([
    k.text("MICRO SPLASH", { size: 48, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 165),
    k.color(100, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(11),
  ]);

  // Subtítulo
  k.add([
    k.text("A Grande Migração da Baleia-Jubarte 🐋", { size: 16, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 118),
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
      k.pos(k.width() / 2, k.height() / 2 - 82),
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
      y: k.height() / 2 - 38,
      bg: k.rgb(20, 140, 200),
      hover: k.rgb(35, 175, 240),
      outline: k.rgb(100, 250, 255),
      action: onStartMigration,
    },
    {
      label: "🏆 RANKING TOP 10",
      y: k.height() / 2 + 18,
      bg: k.rgb(26, 85, 150),
      hover: k.rgb(40, 120, 200),
      outline: k.rgb(255, 215, 80),
      action: (onClose: () => void) => {
        if (onLeaderboard) onLeaderboard(onClose);
        else onClose();
      },
    },
    {
      label: "📖 DIÁRIO DE BORDO",
      y: k.height() / 2 + 74,
      bg: k.rgb(20, 50, 100),
      hover: k.rgb(30, 80, 145),
      outline: k.rgb(180, 220, 255),
      action: onCodex,
    },
    {
      label: "⚙️ OPÇÕES",
      y: k.height() / 2 + 130,
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
    k.text("Inspirado nas pesquisas de conservação do Instituto Baleia Jubarte\nTrilha: 'Aquatic Ambience' (David Wise) & 16-Bit Lofi Ocean", {
      size: 10,
      font: "sans-serif",
      align: "center",
      lineSpacing: 4,
    }),
    k.pos(k.width() / 2, k.height() - 35),
    k.color(140, 180, 220),
    k.anchor("center"),
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

