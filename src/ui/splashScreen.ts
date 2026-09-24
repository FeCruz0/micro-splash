import type { KaboomCtx } from "kaboom";

const CONSERVATION_TIPS = [
  "💡 Você sabia? As jubartes migram milhares de km todos os anos para se reproduzir em águas tropicais brasileiras.",
  "🐋 O som das jubartes pode viajar centenas de quilômetros pelo oceano para atrair pares e coordenar bandos.",
  "🌊 Redes fantasmas e resíduos plásticos estão entre as maiores ameaças à vida marinha global.",
  "🌱 O krill antártico é a base da cadeia alimentar oceânica e o alimento essencial das baleias-jubarte.",
];

/**
 * Cria a tela de Splash / Apresentação cinematográfica inicial (2.4s)
 * com bolhas ascendentes, logo animado, barra de progresso temática
 * e fatos de conservação marinha.
 */
export function createSplashScreen(k: KaboomCtx, onFinish: () => void) {
  let isFinished = false;

  const finish = () => {
    if (isFinished) return;
    isFinished = true;
    onFinish();
  };

  const cx = k.width() / 2;
  const cy = k.height() / 2;

  // Fundo marinho abissal profundo
  k.add([k.rect(k.width(), k.height()), k.pos(0, 0), k.color(6, 16, 36), k.z(0)]);

  // Bolhas ascendentes decorativas
  for (let i = 0; i < 30; i++) {
    const bubble = k.add([
      k.circle(k.rand(1.5, 4.5)),
      k.pos(k.rand(20, k.width() - 20), k.height() + k.rand(10, 150)),
      k.color(140, 225, 255),
      k.opacity(k.rand(0.3, 0.7)),
      k.z(2),
    ]);

    const speedY = k.rand(60, 140);
    const swaySpeed = k.rand(1.5, 3.5);
    const swayAmp = k.rand(8, 22);
    let swayPhase = k.rand(0, Math.PI * 2);

    bubble.onUpdate(() => {
      const dt = k.dt();
      swayPhase += dt * swaySpeed;
      bubble.pos.y -= speedY * dt;
      bubble.pos.x += Math.sin(swayPhase) * swayAmp * dt;
      if (bubble.pos.y < -20) {
        bubble.pos.y = k.height() + 20;
        bubble.pos.x = k.rand(20, k.width() - 20);
      }
    });
  }

  // Mini-baleia nadando na tela de abertura
  let whaleObj: any = null;
  try {
    whaleObj = k.add([
      k.sprite("baleia", { anim: "glide" }),
      k.pos(cx, cy - 75),
      k.scale(0.85),
      k.anchor("center"),
      k.color(210, 240, 255),
      k.z(5),
    ]);
  } catch {
    // Se sprite não carregar, ignora silenciosamente
  }

  // Título e Logo
  const titleShadow = k.add([
    k.text("MICRO-SPLASH", { size: 48 }),
    k.pos(cx + 2, cy - 10),
    k.scale(1),
    k.anchor("center"),
    k.color(10, 30, 60),
    k.opacity(0.8),
    k.z(9),
  ]);

  const title = k.add([
    k.text("MICRO-SPLASH", { size: 48 }),
    k.pos(cx, cy - 12),
    k.scale(1),
    k.anchor("center"),
    k.color(100, 230, 255),
    k.z(10),
  ]);

  k.add([
    k.text("A JORNADA DA BALEIA-JUBARTE", { size: 16 }),
    k.pos(cx, cy + 28),
    k.anchor("center"),
    k.color(190, 230, 255),
    k.opacity(0.9),
    k.z(10),
  ]);

  k.add([
    k.text("Em prol da conservação marinha e dos santuários dos oceanos", { size: 12 }),
    k.pos(cx, cy + 54),
    k.anchor("center"),
    k.color(130, 185, 215),
    k.opacity(0.75),
    k.z(10),
  ]);

  // Barra de carregamento
  const barWidth = 320;
  const barHeight = 14;
  const barY = cy + 105;

  // Fundo da barra
  k.add([
    k.rect(barWidth + 4, barHeight + 4, { radius: 8 }),
    k.pos(cx - barWidth / 2 - 2, barY - 2),
    k.color(15, 35, 65),
    k.outline(1.5, k.rgb(60, 130, 195)),
    k.z(8),
  ]);

  // Preenchimento animado
  const barFill = k.add([
    k.rect(0, barHeight, { radius: 6 }),
    k.pos(cx - barWidth / 2, barY),
    k.color(80, 220, 255),
    k.z(9),
  ]);

  // Percentual de carregamento
  const percentText = k.add([
    k.text("Iniciando migração... 0%", { size: 12 }),
    k.pos(cx, barY + 24),
    k.anchor("center"),
    k.color(180, 225, 255),
    k.z(10),
  ]);

  // Dica de conservação aleatória
  const randomTip = k.choose(CONSERVATION_TIPS);
  k.add([
    k.text(randomTip, { size: 12, width: Math.min(650, k.width() - 40) }),
    k.pos(cx, cy + 165),
    k.anchor("center"),
    k.color(200, 235, 250),
    k.opacity(0.85),
    k.z(10),
  ]);

  // Prompt de pular
  const skipText = k.add([
    k.text("[ Pressione ESPAÇO ou TOQUE para pular ]", { size: 12 }),
    k.pos(cx, k.height() - 32),
    k.anchor("center"),
    k.color(120, 175, 210),
    k.opacity(0.7),
    k.z(10),
  ]);

  // Controle de tempo e progresso
  let elapsed = 0;
  const totalDuration = 2.4;

  k.onUpdate(() => {
    if (isFinished) return;
    const dt = k.dt();
    elapsed += dt;

    const progress = Math.min(1.0, elapsed / (totalDuration * 0.9));
    barFill.width = barWidth * progress;
    percentText.text = `Carregando ecossistemas... ${Math.round(progress * 100)}%`;

    // Pulsação sutil do título e mini-baleia
    const pulse = Math.sin(elapsed * 4) * 0.04;
    title.scale = k.vec2(1 + pulse, 1 + pulse);
    titleShadow.scale = k.vec2(1 + pulse, 1 + pulse);

    if (whaleObj && whaleObj.exists()) {
      whaleObj.pos.y = cy - 75 + Math.sin(elapsed * 3) * 6;
      whaleObj.angle = Math.sin(elapsed * 2.5) * 6;
    }

    // Pulsação do texto de pular
    skipText.opacity = 0.4 + Math.abs(Math.sin(elapsed * 3)) * 0.5;

    if (elapsed >= totalDuration) {
      finish();
    }
  });

  // Interatividade para pular
  k.onKeyPress("space", finish);
  k.onKeyPress("enter", finish);
  k.onClick(finish);
}
