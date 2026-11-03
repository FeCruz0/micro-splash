export interface FontLoadOptions {
  size?: number;
  filter?: "linear" | "nearest" | string;
}

export interface SpriteAnimOptions {
  from: number;
  to: number;
  loop?: boolean;
  speed?: number;
}

export interface SpriteLoadOptions {
  sliceX?: number;
  sliceY?: number;
  anims?: Record<string, number | SpriteAnimOptions>;
}

export interface AssetLoaderEngineContext {
  loadFont(name: string, src: string, opt?: FontLoadOptions): unknown;
  loadSprite(name: string, src: string, opt?: SpriteLoadOptions): unknown;
}

/**
 * Carrega e configura todas as tipografias vetoriais do jogo.
 */
export function loadGameFonts(k: AssetLoaderEngineContext): void {
  k.loadFont("Inter", "/fonts/Inter-SemiBold.ttf", { size: 64, filter: "linear" });
  k.loadFont("Outfit", "/fonts/Outfit-Bold.ttf", { size: 64, filter: "linear" });
  k.loadFont("Orbitron", "/fonts/Orbitron-Bold.ttf", { size: 64, filter: "linear" });
}

/**
 * Carrega e registra as spritesheets da baleia-jubarte e da fauna oceânica de fundo.
 */
export function loadGameSprites(k: AssetLoaderEngineContext): void {
  // Baleia Principal - 16 quadros de animação (Fase 44)
  k.loadSprite("baleia", "/sprites/whale.png", {
    sliceX: 16,
    sliceY: 1,
    anims: {
      glide: 0,
      idle_swim: { from: 1, to: 4, loop: true, speed: 4 },
      stroke_down: { from: 5, to: 9, speed: 14 },
      stroke_up: { from: 10, to: 13, speed: 12 },
      swim: { from: 5, to: 13, loop: true, speed: 10 },
      feed: { from: 14, to: 15, loop: true, speed: 6 },
    },
  });

  // Fauna de Fundo e Cenário (Fase 11 / Polimento Visual)
  k.loadSprite("orca_bg", "/sprites/orca_bg.png", {
    sliceX: 4,
    sliceY: 1,
    anims: {
      swim: { from: 0, to: 3, loop: true, speed: 5 },
    },
  });

  k.loadSprite("jubarte_bg", "/sprites/humpback_bg.png", {
    sliceX: 4,
    sliceY: 1,
    anims: {
      swim: { from: 0, to: 3, loop: true, speed: 3.2 },
    },
  });

  k.loadSprite("cachalote_bg", "/sprites/cachalote_bg.png", {
    sliceX: 4,
    sliceY: 1,
    anims: {
      swim: { from: 0, to: 3, loop: true, speed: 2.4 },
    },
  });
}

/**
 * Agregador para carregamento síncrono de todos os assets gráficos e fontes.
 */
export function loadAllGameAssets(k: AssetLoaderEngineContext): void {
  loadGameFonts(k);
  loadGameSprites(k);
}
