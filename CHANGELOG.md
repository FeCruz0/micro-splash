# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 2026-09-24 — Lançamento Oficial (Release 1.0)

### Adicionado

- **Developer Experience & Qualidade de Código (Fase 24)**:
  - Configuração oficial do **ESLint 9 Flat Config** (`eslint.config.js`) com `@typescript-eslint` e desativação de conflitos via `eslint-config-prettier`.
  - Padronização de código com **Prettier** (`.prettierrc.json`) e validação via script `npm run format:check`.
  - Pre-commit hooks com **Husky** e **lint-staged** para garantir que nenhum commit entre sem formatação ou com testes quebrados.
  - Relatório visual de cobertura de testes com **`@vitest/coverage-v8`** via `npm run coverage` (formatos text, JSON e HTML).
  - Validação estrita de dados educacionais com **Zod** (`src/schemas/dataSchemas.ts`):
    - `FactSchema` para `data/facts.json`.
    - `QuizQuestionSchema` para `data/quiz.json` (validação de 4 opções, índice correto e bioma).
    - `LevelLayoutSchema` para `data/level_layout.json`.
    - Script CLI `npm run validate:data` (`scripts/validateData.cjs`) e suíte de testes `tests/dataSchema.test.ts`.
  - Script unificado de geração de assets: `npm run generate` (spritesheet 8-frames e ícones PWA 192x192 / 512x512).
- **Qualidade Técnica & Plataformas (Fase 23)**:
  - Refatoração modular do sistema de áudio: `AudioEngine` (Web Audio API e ruído rosa ambiente), `AudioSFX` (efeitos procedurais), `AudioWhale` (síntese 3 canais dos cantos de baleia e chamados abissais) e `AudioMusic` (trilha estilo David Wise). `AudioSystem` mantido como Fachada retrocompatível.
  - Suporte nativo a Gamepad / Joystick físico via **W3C Gamepad API** (`gamepadSystem.ts`), com zona morta calibrada (0.22) e mapeamento ergonômico de nado, biosonar e pausa.
  - Telemetria de desenvolvedor (F3) expandida com histórico circular de 60 amostras, minigráfico sparkline inline em Unicode (` ▂▃▄▅▆▇█`) e alerta visual para gargalos críticos (< 45 FPS).
  - Spritesheet da Jubarte expandido para 8 frames (1024x64 px), introduzindo cinemática hidrodinâmica suave para subida, descida de propulsão e engolfamento alimentar (_feed_).
- **Progressão, Competição & Rejogabilidade (Fase 22)**:
  - Desafios Semanais comunitários determinísticos calculados por semana ISO-8601 (`YYYY-Www`) com semente determinística pseudoaleatória (FNV-1a).
  - Ranking Online Global com arquitetura _Offline-First_ (`leaderboardApi.ts`), sincronização com backend em Cloudflare Worker + KV e fallback local para totens sem internet.
  - Interface do placar com 3 abas de navegação (`Global`, `Semanal` e `Local/Totem`).
  - Emissão de **Certificado Oficial com Selo Digital de Autenticidade** no Victory Card para o modo semanal.
- **Conteúdo Educacional Expandido & Acessibilidade (Fase 21)**:
  - Banco expandido com mais de 50 perguntas pedagógicas em `data/quiz.json`, organizadas por bioma e nível de dificuldade, acessíveis opcionalmente no pós-jogo e no Codex.
  - Narração em voz acessível dos fatos ecológicos via **Web Speech API (TTS)** para crianças em fase de alfabetização.
  - Onboarding interativo em 3 slides ilustrados para primeira abertura em totens e na web.

---

## [0.9.0] - 2026-09-17 — Imersão Visual Avançada

### Adicionado

- Esteira de bioluminescência procedural ativada pela passagem da jubarte nas águas escuras da Costa Urbana.
- Vinhetas narrativas cinematográficas de 2s exibindo o nome poético de cada bioma ao cruzar marcos da rota.
- Zoom cinematográfico suave de câmera (1.3×) durante eventos narrativos de alta tensão.
- Sombra elíptica dinâmica projetada sob a baleia com escala baseada na profundidade da lâmina d'água.

---

## [0.8.0] - 2026-09-15 — Totens & Eventos Climáticos

### Adicionado

- Suporte a Progressive Web App (PWA) Offline-First para totens escolares e feiras de ciências sem dependência de internet.
- Micro-climas meteorológicos dinâmicos: nevasca polar na Antártica, céu encoberto com vendaval em alto-mar e calmaria radiante em Arraial do Cabo.

---

## [0.7.0] - 2026-09-14 — Acessibilidade & Navegação Oceânica

### Adicionado

- Dinâmica biofísica de fôlego: nado a favor da correnteza reduz o consumo de oxigênio em 35%, enquanto o nado contra o fluxo exige maior esforço físico (+35%).
- Modos de acessibilidade visual: Alto Contraste, Protanopia e Deuteranopia.
- Jukebox Oceânica comutável: Trilha 16-Bit Chiptune, Trilha Contemplativa de Hidrofones ou Modo Foco (apenas SFX).
- Feedback háptico tátil (`navigator.vibrate`) em celulares e tablets para colisões, rompimento de gelo e biosonar.

---

## [0.6.0] - 2026-09-12 — Animação Orgânica da Jubarte

### Adicionado

- Deformação corporal contínua da jubarte (_Squash & Stretch_) durante o nado muscular.
- Dinâmica de _roll_ tridimensional em perspectiva durante subidas e descidas de profundidade.
- Reflexos cáusticos procedurais de luz solar sobre a pele escura da baleia em águas rasas.

---

## [0.5.0] - 2026-09-10 — Totens & Kiosk Mode

### Adicionado

- Modo Kiosk para operação autônoma em museus, com detecção de inatividade de 60 segundos e demonstração automática atraente.
- Diário de Bordo / Codex de Biodiversidade com catálogo interativo de todos os fatos e espécies observadas.
- Modal de compartilhamento com geração de Victory Card em Canvas e classificação por estrelas.

---

## [0.4.0] - 2026-09-08 — Trilha Sonora & Ecossistemas Vivos

### Adicionado

- Trilha musical dinâmica 16-bit adaptativa sintetizada no estilo David Wise (_Donkey Kong Country_).
- Bandos de pinguins saltadores (_porpoising_), golfinhos nadando em esteira (_drafting_) e cachalote abissal em fossas marinhas.
- Cena de abertura cinematográfica animada com título estilizado e logotipo do jogo.

---

## [0.3.0] - 2026-09-05 — Cânions Submarinos & Obstáculos

### Adicionado

- Cânions submarinos de Arraial do Cabo com corrente ascendente de ressurgência (ACAS).
- Obstáculos antropogênicos: redes de pesca fantasmas e manchas de óleo com filme iridescente.
- Correntes marinhas horizontais e verticais empurrando o jogador.

---

## [0.2.0] - 2026-09-02 — Mecânicas Centrais & Menus

### Adicionado

- Sistema de Biosonar / Ecolocalização com onda expansiva para revelar obstáculos no escuro.
- Mecânica de oxigênio e fôlego: mergulhos profundos drenam fôlego; saltos na superfície renovam o ar.
- Menu Principal com seletor de modos (Modo Clássico, Desafio Sereno com oxigênio infinito e Mar Aberto).

---

## [0.1.0] - 2026-08-30 — Fundação Inicial

### Adicionado

- Física de nado baseada em impulsos de batida de cauda e arrasto hidrodinâmico.
- Travessia contínua de 30.000 metros cobrindo 5 biomas marinhos (Antártica, Oceano Pelágico, Costa Urbana, Cânions e Arraial do Cabo).
- Cardumes de krill nutritivo e banquisa de gelo polar com fendas de respiração.
