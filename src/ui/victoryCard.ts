import type { GameState } from "../systems/state";
import { GAME_CONFIG } from "../config";

export interface VictoryCardData {
  playerName?: string;
  finalScore: number;
  highScore: number;
  distance: number;
  elapsedTime: number;
  krillCount: number;
  trashCount: number;
  hasBreached: boolean;
  ancestralWisdom: string;
  rank: string;
  mode: string;
  dateStr?: string;
  quizScore?: number;
  quizCorrectCount?: number;
  isWeeklyChallenge?: boolean;
  seed?: number;
  weekKey?: string;
}

/**
 * Extrai os dados formatados da vitória a partir de uma instância de GameState.
 */
export function extractVictoryCardData(gameState: GameState, playerName: string = "Guardião dos Mares"): VictoryCardData {
  const finalScore = gameState.calculateFinalScore();
  let rank = "🥉 RANK B - Navegador Aprendiz";
  if (finalScore >= 3500) rank = "🥇 RANK S - Guardião dos Oceanos!";
  else if (finalScore >= 2500) rank = "🥈 RANK A - Protetor das Jubartes!";

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return {
    playerName,
    finalScore,
    highScore: gameState.getHighScore(),
    distance: gameState.getDistance(),
    elapsedTime: gameState.getElapsedTime(),
    krillCount: gameState.getKrillCount(),
    trashCount: gameState.getTrashCount(),
    hasBreached: gameState.hasBreached(),
    ancestralWisdom: gameState.getAncestralWisdom(),
    rank,
    mode: gameState.getMode(),
    dateStr,
    quizScore: gameState.getQuizScore(),
    quizCorrectCount: gameState.getQuizCorrectCount(),
    isWeeklyChallenge: gameState.getMode() === "weekly",
    seed: gameState.getSeed(),
    weekKey: gameState.getWeekKey(),
  };
}

/**
 * Gera o elemento HTMLCanvasElement em alta resolução (1200x675, 16:9)
 * desenhando todo o conteúdo gráfico e ornamental do certificado.
 */
export function createVictoryCardCanvas(data: VictoryCardData): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return false as any;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1. Fundo Oceânico em Gradiente Noturno / Abissal
  const grad = ctx.createLinearGradient(0, 0, 1200, 675);
  grad.addColorStop(0, "#051833");
  grad.addColorStop(0.5, "#0b2b52");
  grad.addColorStop(1, "#031326");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 675);

  // 2. Ondas de luz sutis no fundo
  ctx.save();
  ctx.strokeStyle = "rgba(80, 200, 255, 0.08)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const waveY = 120 + i * 90;
    ctx.moveTo(0, waveY);
    ctx.bezierCurveTo(300, waveY - 40, 700, waveY + 50, 1200, waveY - 20);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Moldura Ornamental Dupla com Detalhe Dourado
  ctx.save();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 4;
  ctx.strokeRect(35, 35, 1130, 605);

  ctx.strokeStyle = "rgba(100, 220, 255, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(45, 45, 1110, 585);

  // Cantoneiras douradas decorativas
  const cornerSize = 25;
  const corners = [
    [35, 35],
    [1165, 35],
    [35, 640],
    [1165, 640],
  ];
  ctx.fillStyle = "#ffd700";
  corners.forEach(([cx, cy]) => {
    ctx.fillRect(cx - cornerSize / 2, cy - 2, cornerSize, 4);
    ctx.fillRect(cx - 2, cy - cornerSize / 2, 4, cornerSize);
  });
  ctx.restore();

  // 4. Cabeçalho / Título do Certificado
  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(
    data.isWeeklyChallenge
      ? "★ CERTIFICADO OFICIAL: DESAFIO SEMANAL DA ROTA ★"
      : "★ CERTIFICADO OFICIAL DE GUARDIÃO DOS OCEANOS ★",
    600,
    85
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 44px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("MICRO-SPLASH: A JORNADA DA BALEIA-JUBARTE", 600, 138);

  ctx.fillStyle = "#a5d8ff";
  ctx.font = "16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(
    data.isWeeklyChallenge
      ? `Conclusão do Desafio Semanal ${data.weekKey || ""} • Semente Determinística #${data.seed || "42"}`
      : "Em reconhecimento à conclusão bem-sucedida da Rota Migratória até o Santuário de Arraial do Cabo",
    600,
    168
  );
  ctx.restore();

  // Linha divisória horizontal
  ctx.strokeStyle = "rgba(255, 215, 0, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, 190);
  ctx.lineTo(1080, 190);
  ctx.stroke();

  // 5. Bloco de Dados do Jogador e Classificação
  ctx.save();
  ctx.fillStyle = "#74c0fc";
  ctx.font = "16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("Navegador Credenciado:", 90, 225);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(data.playerName || "Guardião dos Mares", 90, 258);

  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(data.rank, 90, 298);

  ctx.fillStyle = "#a5d8ff";
  ctx.font = "15px 'Segoe UI', Arial, sans-serif";
  const modeDisplay = data.isWeeklyChallenge
    ? `DESAFIO SEMANAL (${data.weekKey || ""})`
    : data.mode.toUpperCase();
  ctx.fillText(`Data: ${data.dateStr || "2026"}   |   Modo: ${modeDisplay}`, 90, 325);
  ctx.restore();

  // 6. Placar Central em Destaque (Eco-Score)
  ctx.save();
  const scoreBoxX = 760;
  const scoreBoxY = 210;
  const scoreBoxW = 350;
  const scoreBoxH = 120;

  ctx.fillStyle = "rgba(10, 45, 85, 0.75)";
  ctx.fillRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2;
  ctx.strokeRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH);

  ctx.textAlign = "center";
  ctx.fillStyle = "#a5d8ff";
  ctx.font = "15px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("ECO-SCORE FINAL ALCANÇADO", scoreBoxX + scoreBoxW / 2, scoreBoxY + 32);

  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 46px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(`${data.finalScore.toLocaleString("pt-BR")} pts`, scoreBoxX + scoreBoxW / 2, scoreBoxY + 80);

  ctx.fillStyle = "#d0ebff";
  ctx.font = "13px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(`Recorde Pessoal: ${data.highScore.toLocaleString("pt-BR")} pts`, scoreBoxX + scoreBoxW / 2, scoreBoxY + 105);
  ctx.restore();

  // 7. Grade de Estatísticas da Travessia
  ctx.save();
  const gridY = 365;
  const col1X = 90;
  const col2X = 460;
  const col3X = 820;

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("ESTATÍSTICAS DA EXPEDIÇÃO:", col1X, gridY);

  ctx.font = "16px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = "#e7f5ff";

  // Coluna 1
  ctx.fillText(`📏 Rota Percorrida: ${GAME_CONFIG.ROUTE_TOTAL_DISTANCE.toLocaleString("pt-BR")}m (100%)`, col1X, gridY + 34);
  ctx.fillText(`⏱️ Duração da Travessia: ${data.elapsedTime} segundos`, col1X, gridY + 65);
  ctx.fillText(`🦐 Biomassa de Krill Coletada: ${data.krillCount} cardumes`, col1X, gridY + 96);

  // Coluna 2
  ctx.fillText(`🗑️ Resíduos Plásticos Encontrados: ${data.trashCount}`, col2X, gridY + 34);
  ctx.fillText(`✨ Salto Majestoso (Breach): ${data.hasBreached ? "Executado (+500 pts)" : "Não"}`, col2X, gridY + 65);
  ctx.fillText(
    data.quizScore && data.quizScore > 0
      ? `🧪 Quiz Ecológico: ${data.quizCorrectCount || 0}/3 acertos (+${data.quizScore} pts)`
      : `🧭 Modo: ${data.isWeeklyChallenge ? "Desafio Semanal 📅" : data.mode === "serene" ? "Sereno" : data.mode === "quick_challenge" ? "Rápido (60s)" : "Padrão"}`,
    col2X,
    gridY + 96
  );

  // Coluna 3: Selo Digital de Autenticidade
  ctx.strokeStyle = data.isWeeklyChallenge ? "#ffd700" : "rgba(100, 220, 255, 0.6)";
  ctx.lineWidth = data.isWeeklyChallenge ? 2 : 1;
  ctx.strokeRect(col3X + 20, gridY - 10, 270, 115);
  ctx.fillStyle = data.isWeeklyChallenge ? "rgba(18, 48, 60, 0.8)" : "rgba(12, 38, 70, 0.6)";
  ctx.fillRect(col3X + 20, gridY - 10, 270, 115);

  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(data.isWeeklyChallenge ? "SELO OFICIAL SEMANAL 📅" : "PROJETO CONSERVAÇÃO MARINHA", col3X + 155, gridY + 20);
  ctx.fillStyle = "#a5d8ff";
  ctx.font = "12px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(data.isWeeklyChallenge ? `Semana ${data.weekKey || ""} Autenticada` : "Autenticação Digital Ecológica", col3X + 155, gridY + 45);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px 'Courier New', monospace";
  const certId = data.isWeeklyChallenge
    ? `ID: MS-W#${data.seed || 0}-${Math.abs(data.finalScore * 7919).toString(16).toUpperCase()}`
    : `ID: MS-${Math.abs(data.finalScore * 7919).toString(16).toUpperCase()}`;
  ctx.fillText(certId, col3X + 155, gridY + 74);
  ctx.restore();

  // 8. Mensagem de Sabedoria Ancestral / Conscientização
  ctx.save();
  ctx.fillStyle = "rgba(100, 220, 255, 0.12)";
  ctx.fillRect(90, 500, 1020, 68);
  ctx.strokeStyle = "rgba(100, 220, 255, 0.35)";
  ctx.strokeRect(90, 500, 1020, 68);

  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("MENSAGEM DE SABEDORIA ANCESTRAL:", 108, 525);

  ctx.fillStyle = "#ffffff";
  ctx.font = "italic 14px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(`"${data.ancestralWisdom}"`, 108, 550);
  ctx.restore();

  // 9. Rodapé Institucional
  ctx.save();
  ctx.fillStyle = "#74c0fc";
  ctx.font = "12px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Micro-Splash — Jogo Educativo de Conservação Marinha • Proteja os oceanos e descarte o plástico corretamente.",
    600,
    600
  );
  ctx.restore();

  return canvas;
}

/**
 * Gera um certificado / cartão de vitória em alta resolução (1200x675, 16:9)
 * utilizando a Canvas 2D API e dispara o download como imagem PNG.
 */
export function generateAndDownloadVictoryCard(data: VictoryCardData): boolean {
  try {
    const canvas = createVictoryCardCanvas(data);
    if (!canvas) return false;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `micro_splash_certificado_${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error("Erro ao gerar imagem do cartão de vitória:", err);
    return false;
  }
}

/**
 * Converte o certificado renderizado para um Blob PNG para compartilhamento nativo.
 */
export function getVictoryCardBlob(data: VictoryCardData): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const canvas = createVictoryCardCanvas(data);
      if (!canvas) {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retorna o texto formatado para compartilhamento em redes sociais.
 */
export function getShareText(data: VictoryCardData): string {
  const modeText =
    data.mode === "quick_challenge"
      ? "no Desafio Rápido de 60s"
      : data.mode === "serene"
      ? "no Modo Sereno"
      : "na Rota Migratória";

  return (
    `🐋 Concluí a jornada da baleia-jubarte ${modeText} no jogo Micro-Splash!\n` +
    `⭐ Eco-Score Final: ${data.finalScore.toLocaleString("pt-BR")} pts\n` +
    `🎖️ Classificação: ${data.rank}\n` +
    `🌊 Distância: ${Math.floor(data.distance).toLocaleString("pt-BR")}m | Krill: ${data.krillCount}\n\n` +
    `Jogue você também e ajude na conservação dos oceanos! 🎮💙\n` +
    `#MicroSplash #BaleiaJubarte #ConservacaoMarinha #ArraialDoCabo`
  );
}

/**
 * Dispara o compartilhamento nativo (Web Share API) anexando o arquivo PNG do certificado se suportado.
 */
export async function shareVictoryCard(data: VictoryCardData): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return false;
  }

  const text = getShareText(data);
  const title = "Certificado Oficial Micro-Splash - Guardião dos Oceanos 🐋";

  try {
    const blob = await getVictoryCardBlob(data);
    if (blob && typeof File !== "undefined") {
      const file = new File([blob], "certificado_micro_splash.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text,
          files: [file],
        });
        return true;
      }
    }

    // Fallback para compartilhamento de texto/url caso o navegador não suporte compartilhamento de arquivos
    await navigator.share({
      title,
      text,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });
    return true;
  } catch (err: any) {
    // Se o usuário cancelou o compartilhamento, não consideramos como erro grave
    if (err.name === "AbortError") {
      return false;
    }
    console.warn("Falha no compartilhamento nativo:", err);
    return false;
  }
}

