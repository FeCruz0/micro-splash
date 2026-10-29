import { FONT_TITLE, FONT_BODY, TEXT_SIZE_DISPLAY, TEXT_SIZE_CAPTION } from "../config";
import { createKeyBadge } from "./keyBadge";

const CONSERVATION_TIPS = [
  "💡 Você sabia? As jubartes migram milhares de km todos os anos para se reproduzir em águas tropicais brasileiras.",
  "🐋 O som das jubartes pode viajar centenas de quilômetros pelo oceano para atrair pares e coordenar bandos.",
  "🌊 Redes fantasmas e resíduos plásticos estão entre as maiores ameaças à vida marinha global.",
  "🌱 O krill antártico é a base da cadeia alimentar oceânica e o alimento essencial das baleias-jubarte.",
];

export interface ShowSplashEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
}

export interface LegacySplashUiObject {
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
  destroy?(): void;
  exists?(): boolean;
  onUpdate?(callback: () => void): unknown;
}

export interface LegacySplashEngineContext {
  width(): number;
  height(): number;
  rand(min: number, max: number): number;
  dt(): number;
  add(components?: unknown): LegacySplashUiObject;
  rect(width: number, height: number, options?: unknown): unknown;
  circle(radius: number): unknown;
  pos(x: number, y: number): unknown;
  pos(position: { x: number; y: number }): unknown;
  color(...args: unknown[]): unknown;
  rgb(red: number, green: number, blue: number): unknown;
  outline(width: number, color: unknown): unknown;
  opacity(alpha: number): unknown;
  anchor(anchorPoint: "center" | "topleft" | "left" | "right" | "top"): unknown;
  fixed(): unknown;
  z(zIndex: number): unknown;
  scale(factor: number): unknown;
  scale(factor: { x: number; y: number }): unknown;
  text(content: string, options?: unknown): unknown;
  sprite?(id: string, options?: unknown): unknown;
  destroy(target: unknown): void;
  vec2(x: number, y: number): { x: number; y: number };
  wait(duration: number, callback: () => void): void;
  onKeyPress(key: string, callback: () => void): { cancel: () => void };
  onClick(callback: () => void): unknown;
  onUpdate(callback: () => void): unknown;
  choose?<T>(arr: T[]): T;
  tween?(
    from: number,
    to: number,
    duration: number,
    setter: (value: number) => void,
    ease?: unknown
  ): { then(callback: () => void): void };
  easings?: {
    easeOutBack?: unknown;
    easeInQuad?: unknown;
    easeOutQuad?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Cria a tela de Splash / Apresentação cinematográfica inicial (2.4s)
 * com bolhas ascendentes, logo animado, barra de progresso temática
 * e fatos de conservação marinha.
 */
export function createSplashScreen(k: ShowSplashEngineContext, onFinish: () => void) {
  const engine = k as unknown as LegacySplashEngineContext;
  let isFinished = false;

  const finish = () => {
    if (isFinished) return;
    isFinished = true;
    try {
      skipBadge?.destroy();
    } catch {}
    onFinish();
  };

  const cx = engine.width() / 2;
  const cy = engine.height() / 2;

  // Fundo marinho abissal profundo
  engine.add([
    engine.rect(engine.width(), engine.height()),
    engine.pos(0, 0),
    engine.color(6, 16, 36),
    engine.z(0),
  ]);

  // Bolhas ascendentes decorativas
  for (let i = 0; i < 30; i++) {
    const bubble = engine.add([
      engine.circle(engine.rand(1.5, 4.5)),
      engine.pos(engine.rand(20, engine.width() - 20), engine.height() + engine.rand(10, 150)),
      engine.color(140, 225, 255),
      engine.opacity(engine.rand(0.3, 0.7)),
      engine.z(2),
    ]);

    const speedY = engine.rand(60, 140);
    const swaySpeed = engine.rand(1.5, 3.5);
    const swayAmp = engine.rand(8, 22);
    let swayPhase = engine.rand(0, Math.PI * 2);

    if (typeof bubble.onUpdate === "function") {
      bubble.onUpdate(() => {
        const dt = engine.dt();
        swayPhase += dt * swaySpeed;
        if (bubble.pos) {
          bubble.pos.y -= speedY * dt;
          bubble.pos.x += Math.sin(swayPhase) * swayAmp * dt;
          if (bubble.pos.y < -20) {
            bubble.pos.y = engine.height() + 20;
            bubble.pos.x = engine.rand(20, engine.width() - 20);
          }
        }
      });
    }
  }

  // Mini-baleia nadando na tela de abertura
  let whaleObj: LegacySplashUiObject | null = null;
  try {
    if (typeof engine.sprite === "function") {
      whaleObj = engine.add([
        engine.sprite("baleia", { anim: "idle_swim" }),
        engine.pos(cx, cy - 75),
        engine.scale(0.85),
        engine.anchor("center"),
        engine.color(210, 240, 255),
        engine.z(5),
      ]);
    }
  } catch {
    // Se sprite não carregar, ignora silenciosamente
  }

  // Título e Logo Animado Letra a Letra Bicolor (Fase 34.2)
  const letters = "MICRO-SPLASH".split("");
  const letterSpacing = 31;
  const startX = cx - ((letters.length - 1) * letterSpacing) / 2;
  const letterObjects: LegacySplashUiObject[] = [];
  const letterShadows: LegacySplashUiObject[] = [];

  letters.forEach((char, i) => {
    const charX = startX + i * letterSpacing;
    const isEven = i % 2 === 0;
    const isHyphen = char === "-";

    const charColor = isHyphen
      ? engine.rgb(250, 204, 21)
      : isEven
        ? engine.rgb(56, 189, 248)
        : engine.rgb(255, 255, 255);

    const shadowObj = engine.add([
      engine.text(char, { size: TEXT_SIZE_DISPLAY, font: FONT_TITLE }),
      engine.pos(charX + 2, cy - 2),
      engine.anchor("center"),
      engine.color(10, 28, 56),
      engine.opacity(0),
      engine.z(9),
    ]);
    letterShadows.push(shadowObj);

    const charObj = engine.add([
      engine.text(char, { size: TEXT_SIZE_DISPLAY, font: FONT_TITLE }),
      engine.pos(charX, cy - 4),
      engine.anchor("center"),
      engine.color(charColor),
      engine.opacity(0),
      engine.z(10),
    ]);
    letterObjects.push(charObj);

    // Animação progressiva letter-by-letter
    engine.wait(0.04 * i, () => {
      if (typeof engine.tween === "function" && engine.easings?.easeOutBack) {
        engine.tween(
          cy - 4,
          cy - 12,
          0.3,
          (val) => {
            if (charObj.pos) charObj.pos.y = val;
            if (shadowObj.pos) shadowObj.pos.y = val + 2;
            charObj.opacity = 1;
            shadowObj.opacity = 0.8;
          },
          engine.easings.easeOutBack
        );
      } else {
        if (charObj.pos) charObj.pos.y = cy - 12;
        if (shadowObj.pos) shadowObj.pos.y = cy - 10;
        charObj.opacity = 1;
        shadowObj.opacity = 0.8;
      }
    });
  });

  // Subtítulo Enriquecido com Ícones Náuticos (Fase 34.2)
  engine.add([
    engine.text("⚓ A JORNADA DA BALEIA-JUBARTE 🐋", { size: 15.5, font: FONT_BODY }),
    engine.pos(cx, cy + 28),
    engine.anchor("center"),
    engine.color(190, 235, 255),
    engine.opacity(0.95),
    engine.z(10),
  ]);

  engine.add([
    engine.text("Em prol da conservação marinha e dos santuários dos oceanos", {
      size: 12,
      font: FONT_BODY,
    }),
    engine.pos(cx, cy + 54),
    engine.anchor("center"),
    engine.color(130, 185, 215),
    engine.opacity(0.75),
    engine.z(10),
  ]);

  // Barra de carregamento
  const barWidth = 320;
  const barHeight = 14;
  const barY = cy + 105;

  // Fundo da barra
  engine.add([
    engine.rect(barWidth + 4, barHeight + 4, { radius: 8 }),
    engine.pos(cx - barWidth / 2 - 2, barY - 2),
    engine.color(15, 35, 65),
    engine.outline(1.5, engine.rgb(60, 130, 195)),
    engine.z(8),
  ]);

  // Preenchimento animado
  const barFill = engine.add([
    engine.rect(0, barHeight, { radius: 6 }),
    engine.pos(cx - barWidth / 2, barY),
    engine.color(80, 220, 255),
    engine.z(9),
  ]);

  // Percentual de carregamento
  const percentText = engine.add([
    engine.text("Iniciando migração... 0%", { size: 12 }),
    engine.pos(cx, barY + 24),
    engine.anchor("center"),
    engine.color(180, 225, 255),
    engine.z(10),
  ]);

  // Dica de conservação aleatória
  const randomTip =
    typeof engine.choose === "function"
      ? engine.choose(CONSERVATION_TIPS)
      : CONSERVATION_TIPS[Math.floor(Math.random() * CONSERVATION_TIPS.length)];

  engine.add([
    engine.text(randomTip, { size: 12, width: Math.min(650, engine.width() - 40) }),
    engine.pos(cx, cy + 165),
    engine.anchor("center"),
    engine.color(200, 235, 250),
    engine.opacity(0.85),
    engine.z(10),
  ]);

  // Prompt de pular com Tecla Física Mecânica [ESPAÇO] (Fase 32.8)
  const skipBadge = createKeyBadge(engine as unknown as Parameters<typeof createKeyBadge>[0], {
    pos: engine.vec2(cx - 72, engine.height() - 32),
    keyLabel: "ESPAÇO",
    fontSize: 10.5,
    minWidth: 62,
    z: 11,
  });

  const skipText = engine.add([
    engine.text("ou TOQUE para pular", { size: TEXT_SIZE_CAPTION + 1, font: FONT_BODY }),
    engine.pos(cx + 36, engine.height() - 32),
    engine.anchor("center"),
    engine.color(135, 190, 225),
    engine.opacity(0.85),
    engine.z(10),
  ]);

  // Controle de tempo e progresso
  let elapsed = 0;
  const totalDuration = 2.4;

  engine.onUpdate(() => {
    if (isFinished) return;
    const dt = engine.dt();
    elapsed += dt;

    const progress = Math.min(1.0, elapsed / (totalDuration * 0.9));
    barFill.width = barWidth * progress;
    percentText.text = `Carregando ecossistemas... ${Math.round(progress * 100)}%`;

    // Pulsação sutil das letras do logo e da mini-baleia
    const pulse = Math.sin(elapsed * 4) * 0.04;
    letterObjects.forEach((lo) => {
      try {
        lo.scale = engine.vec2(1 + pulse, 1 + pulse);
      } catch {}
    });
    letterShadows.forEach((ls) => {
      try {
        ls.scale = engine.vec2(1 + pulse, 1 + pulse);
      } catch {}
    });

    if (whaleObj && (typeof whaleObj.exists !== "function" || whaleObj.exists())) {
      const idleBreath = Math.sin(elapsed * 1.4) * 0.016;
      whaleObj.scale = engine.vec2(0.85 * (1 - idleBreath * 0.35), 0.85 * (1 + idleBreath));
      if (whaleObj.pos) {
        whaleObj.pos.y = cy - 75 + Math.sin(elapsed * 1.0) * 5;
      }
      const swell = Math.sin(elapsed * 0.8) * 2.2;
      const ripple = Math.sin(elapsed * 2.1) * 0.6;
      whaleObj.angle = swell + ripple;
    }

    // Pulsação do texto de pular
    skipText.opacity = 0.4 + Math.abs(Math.sin(elapsed * 3)) * 0.5;

    if (elapsed >= totalDuration) {
      finish();
    }
  });

  // Interatividade para pular
  engine.onKeyPress("space", finish);
  engine.onKeyPress("enter", finish);
  engine.onClick(finish);
}
