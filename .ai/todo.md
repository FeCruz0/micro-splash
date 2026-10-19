# Plano de Implementação — Fase 48: Decomposição Arquitetural & Organização de Módulos

Status: Concluído  
Data: 2026-10-19  
Alvo: v1.14.0

---

## 🔬 Diagnóstico e Escopo da Fase 48

1. **Decomposição de Arquivos Extensos (> 300 linhas)**:
   - `src/ui/codexScreen.ts` (528 linhas): extrair navegação de abas, cabeçalho e botões de ação para submódulos em `src/ui/codex/`.
   - `src/ui/optionsScreen.ts` (337 linhas): extrair barra de navegação e rodapé para `src/ui/options/optionsNavigation.ts`.
   - `src/entities/player.ts` (738 linhas): modularizar `calculateOceanIdleDrift` para `playerDrift.ts`, colisões de ameaças/obstáculos para `playerCollision.ts` e sucção/alimentação para `playerFeeding.ts`.
   - `src/systems/audio/audioSFX.ts` e `src/systems/canyonSystem.ts`: validar desacoplamento e manter fachadas limpas.

2. **Extração de Cenas e Registro de Sprites (`src/scenes/` e `src/main.ts`)**:
   - `src/main.ts` ainda declara inline os recortes de atlas e animações de sprites (`baleia`, `orca_bg`, `jubarte_bg`, `cachalote_bg`).
   - Criar `src/scenes/assetLoader.ts` para encapsular o carregamento de sprites/fontes e manter `src/main.ts` estritamente orquestrador (< 50 linhas).

3. **Padronização de Responsabilidades**:
   - `systems/audioSystem.ts` × `systems/audio/`: consolidar `AudioSystem` como fachada em `src/systems/audio/index.ts` com re-export retrocompatível em `src/systems/audioSystem.ts`.
   - `systems/leaderboard.ts` × `services/leaderboardApi.ts`: segregar contratos em `src/types/leaderboard.ts` separando claramente o gerenciador local/offline da API remota HTTP.

4. **Reorganização Estrutural de `src/ui/`**:
   - Reorganizar arquivos soltos em subdiretórios semânticos:
     - `src/ui/screens/` (`mainMenu.ts`, `modeSelectScreen.ts`, `splashScreen.ts`, `victoryScreen.ts`, `rescueScreen.ts`, `challengeEndScreen.ts`, `leaderboardScreen.ts`, `codexScreen.ts`, `optionsScreen.ts`).
     - `src/ui/modals/` (`quizModal.ts`, `onboardingModal.ts`, `statsModal.ts`, `shareModal.ts`, `pwaInstallModal.ts`, `initialsInputModal.ts`, `factPopup.ts`).
     - `src/ui/hud/` (`hudSystem.ts`, `touchControls.ts`, `victoryCard.ts`, `debugDistance.ts`).
     - `src/ui/shared/` (`animationUtils.ts`, `keyboardNav.ts`, `textUtils.ts`, `keyBadge.ts`).
   - Manter barrel `src/ui/index.ts` e re-exports de compatibilidade na raiz de `src/ui/`.

5. **Constantes Nomeadas e Segmentação de Domínio (`src/config.ts`)**:
   - Eliminar números mágicos isolados (ex.: `0.55` de `strokePhase`, `0.55` de `feedTimer`, opacidades de alto contraste).
   - Definir seções semânticas: `PLAYER_PHYSICS_CONFIG`, `ACCESSIBILITY_VISUAL_CONFIG`, `ENVIRONMENT_CONFIG`.

6. **Modernização dos Scripts Geradores em ESM (`scripts/`)**:
   - Criar utilitário compartilhado `scripts/shared/pngWriter.mjs` (eliminando duplicação de cabeçalhos PNG e zlib deflate).
   - Migrar `generate*.cjs` para `.mjs` em conformidade com `"type": "module"`.
   - Atualizar `package.json` para executar os scripts `.mjs`.

7. **Suíte de Testes da Fase 48 (`tests/phase48_architecture_decomposition.test.ts`)**:
   - Validar contratos estruturais de diretórios, integridade de barrel files, separação de responsabilidades e constantes nomeadas.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Decomposição de Telas e Entidades Monolíticas

- [x] **1.1 Modularizar `src/ui/codexScreen.ts`**
  - **Arquivos**: `src/ui/codex/codexNavigation.ts`, `src/ui/codexScreen.ts`.
  - **Ação**: Extrair abas de navegação, cabeçalho e botões de ação para reduzir `codexScreen.ts` para < 200 linhas.
  - **Validação**: Abrir o Diário de Bordo e verificar navegação de abas e botões.

- [x] **1.2 Modularizar `src/ui/optionsScreen.ts`**
  - **Arquivos**: `src/ui/options/optionsNavigation.ts`, `src/ui/optionsScreen.ts`.
  - **Ação**: Extrair cabeçalho e barra inferior de ações para reduzir `optionsScreen.ts` para < 200 linhas.
  - **Validação**: Acessar tela de Opções e testar troca de abas e retorno.

- [x] **1.3 Modularizar Subsistemas de `src/entities/player.ts`**
  - **Arquivos**: `src/entities/player/playerDrift.ts`, `src/entities/player/playerCollision.ts`, `src/entities/player/playerFeeding.ts`, `src/entities/player.ts`.
  - **Ação**: Extrair cálculo de drift oceânico, manipuladores de colisão e mecânica de alimentação para reduzir `player.ts` para < 300 linhas.
  - **Validação**: Executar testes unitários do jogador e validar nado e colisões.

---

### Etapa 2: Extração de Cenas e Registro de Sprites

- [x] **2.1 Criar Módulo de Carregamento de Recursos `src/scenes/assetLoader.ts`**
  - **Arquivos**: `src/scenes/assetLoader.ts`, `src/main.ts`.
  - **Ação**: Extrair definições de clipes de animação e carregamento de fontes/sprites de `src/main.ts`.
  - **Validação**: `src/main.ts` reduzido a orquestrador enxuto; sprites de baleia, orca e fundo carregados normalmente.

---

### Etapa 3: Padronização de Responsabilidades (Áudio e Leaderboard)

- [x] **3.1 Consolidar Fachada e Submódulos de Áudio**
  - **Arquivos**: `src/systems/audio/index.ts`, `src/systems/audioSystem.ts`.
  - **Ação**: Unificar definições em `src/systems/audio/` e manter `src/systems/audioSystem.ts` como re-export retrocompatível.
  - **Validação**: `npm test tests/audio*.test.ts`.

- [x] **3.2 Segregar Contratos e Serviços de Leaderboard**
  - **Arquivos**: `src/types/leaderboard.ts`, `src/systems/leaderboard.ts`, `src/services/leaderboardApi.ts`.
  - **Ação**: Mover interfaces compartilhadas (`LeaderboardEntry`, `DEFAULT_LEADERBOARD`) para `src/types/leaderboard.ts`.
  - **Validação**: `npm test tests/leaderboard*.test.ts`.

---

### Etapa 4: Reorganização Estrutural de `src/ui/`

- [x] **4.1 Criar Subpastas e Mover Componentes de `src/ui/`**
  - **Subpastas**: `src/ui/screens/`, `src/ui/modals/`, `src/ui/hud/`, `src/ui/shared/`.
  - **Ação**: Agrupar telas, modais, elementos de HUD e utilitários compartilhados, mantendo barrel `src/ui/index.ts` e shims em `src/ui/` para evitar quebra de imports existentes.
  - **Validação**: `npm run build` e `npm test`.

---

### Etapa 5: Segmentação de Domínio e Constantes Nomeadas

- [x] **5.1 Extrair Constantes de Física, Animação e Opacidade em `src/config.ts`**
  - **Arquivos**: `src/config.ts`, `src/entities/player/playerAnimation.ts`, `src/entities/player.ts`, `src/entities/trash.ts`.
  - **Ação**: Substituir `0.55` e outros números mágicos por constantes nomeadas (`STROKE_DOWN_PHASE_THRESHOLD`, `FEED_TIMER_DURATION`, etc.).
  - **Validação**: `npm test tests/player*.test.ts`.

---

### Etapa 6: Modernização dos Scripts Geradores em ESM

- [x] **6.1 Criar Utilitário Compartilhado `scripts/shared/pngWriter.mjs`**
  - **Arquivo**: `scripts/shared/pngWriter.mjs`.
  - **Ação**: Centralizar criação de buffer PNG, chunk IHDR, IDAT e cálculo CRC32.
  - **Validação**: Testar geração pontual com `node scripts/generateFaunaAtlas.cjs`.

- [x] **6.2 Migrar Scripts `scripts/generate*.cjs` para `.mjs`**
  - **Arquivos**: `scripts/generate*.mjs`, `package.json`.
  - **Ação**: Converter scripts para módulos ESM importando `pngWriter.mjs` e atualizar comandos em `package.json`.
  - **Validação**: Executar `npm run generate:atlas` e `npm run generate:icons`.

---

### Etapa 7: Suíte de Testes da Fase 48 e Documentação

- [x] **7.1 Implementar Suíte Automatizada da Fase 48**
  - **Arquivo**: `tests/phase48_architecture_decomposition.test.ts`.
  - **Ação**: Validar presença de subdiretórios de UI, integridade de barrels, desacoplamento de main.ts, ausência de arquivos UI > 300 linhas e constantes nomeadas em `src/config.ts`.
  - **Validação**: `npm test tests/phase48_architecture_decomposition.test.ts`.

- [x] **7.2 Atualizar `docs/ROADMAP.md`**
  - **Arquivo**: `docs/ROADMAP.md`.
  - **Ação**: Marcar itens 48.1 a 48.6 como concluídos `[x]`.

---

### Etapa 8: Validação Geral de Qualidade e Build

- [x] **8.1 Execução de Linter, Tipagem e Testes Globais**
  - **Comandos**:
    - `npm run lint` (0 erros, 0 warnings)
    - `npm test` (100% de aprovação)
    - `npm run build` (`tsc && vite build && node scripts/buildSw.mjs`)
