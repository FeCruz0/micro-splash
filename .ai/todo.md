# Plano de Implementação — Resíduos Técnicos das Fases Anteriores (Fases 37.5, 37.6, 37.7, 37.9 e 37.10)

Status: Em Planejamento
Data: 2026-10-13
Alvo: v1.14.0

---

## 🔬 Diagnóstico e Escopo dos Resíduos

1. **RNG Injetável com Semente (Fase 37.10)**:
   - Utilitário `src/utils/random.ts` criado, mas consumido apenas em testes.
   - 28 arquivos de produção executam `Math.random()` diretamente sem suporte a sementes determinísticas.

2. **Persistência Tipada com Schemas Zod (Fase 37.5)**:
   - Utilitário `src/utils/storage.ts` criado, mas 16 arquivos continuam usando `localStorage` cru com blocos manuais de `try/catch`.

3. **Roteamento Centralizado de Logs (Fase 37.9)**:
   - 5 arquivos mantêm chamadas diretas a `console.log`, `console.warn` e `console.error` fora do `errorReporter`.

4. **Decomposição Modular de Arquivos Extensos (Fase 37.7 - Pendente `[ ]`)**:
   - `src/scenes/` inexistente; cenas acopladas em `src/main.ts` (597 linhas).
   - Monólitos pendentes: `src/ui/codexScreen.ts` (731 linhas), `src/ui/optionsScreen.ts` (786 linhas), `src/systems/audio/audioSFX.ts` (652 linhas) e `src/systems/canyonSystem.ts` (477 linhas).

5. **Eliminação de `any` Remanescente e Reativação do Linter (Fase 37.6)**:
   - `@typescript-eslint/no-explicit-any` desativada em `eslint.config.js`.
   - 49 arquivos contêm usos de `as any` ou `: any`.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Adoção Universal do RNG Injetável (`src/utils/random.ts`)

- [x] **1.1 Migração de RNG em Entidades e Partículas**
  - **Arquivos**: `src/entities/boat.ts`, `src/entities/net.ts`, `src/entities/krill.ts`, `src/entities/trash.ts`, `src/entities/bubbleVent.ts`, `src/entities/player.ts`, `src/entities/player/playerParticles.ts`.
  - **Ação**: Substituir chamadas diretas de `Math.random()` por `getRandomFloat`, `getRandomInteger` e `getRandomChoice`.
- [x] **1.2 Migração de RNG em Subsistemas de Cenário e Clima**
  - **Arquivos**: `src/systems/backgroundFauna.ts`, `src/systems/iceSurface.ts`, `src/systems/shipNoiseSystem.ts`, `src/systems/oceanCurrentsSystem.ts`, `src/systems/particlePool.ts`, `src/systems/weatherSystem.ts`, `src/systems/dolphinDraftingSystem.ts`, `src/systems/penguinFlockSystem.ts`, `src/systems/parallaxSkySystem.ts`, `src/systems/proceduralObstacles.ts`, `src/systems/upwellingSystem.ts`, `src/systems/bioluminescenceSystem.ts`, `src/systems/breachSystem.ts`, `src/systems/oilSpillSystem.ts`.
  - **Ação**: Integrar `getRandomFloat`/`getRandomInteger` preservando taxas de spawn e variação procedural.
- [x] **1.3 Migração de RNG em Áudio e Interface**
  - **Arquivos**: `src/systems/audio/audioMusic.ts`, `src/systems/audio/audioSFX.ts`, `src/systems/audio/audioEngine.ts`, `src/ui/mainMenu.ts`, `src/ui/hudSystem.ts`, `src/ui/quizModal.ts`, `src/services/errorReporter.ts`.
  - **Ação**: Trocar dispersões randômicas de frequência e UI por `getRandomFloat`/`getRandomChoice`.

---

### Etapa 2: Migração Total da Persistência para Schemas Zod (`src/utils/storage.ts`)

- [x] **2.1 Criação de Schemas Faltantes em `src/schemas/`**
  - **Arquivos**: `src/schemas/storageSchemas.ts` (ou schemas modulares correspondentes).
  - **Ação**: Definir schemas Zod estritos para Highscore, Estatísticas Cumulativas, Opções de Acessibilidade, Haptics, Áudio e Desafio Semanal.
- [x] **2.2 Migração em Configuração, Estado Global e Serviços**
  - **Arquivos**: `src/config.ts`, `src/systems/state.ts`, `src/i18n/i18n.ts`, `src/services/leaderboardApi.ts`, `src/systems/leaderboard.ts`, `src/systems/weeklyChallenge.ts`, `src/systems/cumulativeStats.ts`.
  - **Ação**: Substituir acessos diretos a `localStorage` por `readLocalStorageWithSchema` e `writeLocalStorage`.
- [x] **2.3 Migração em Sistemas Periféricos e UI**
  - **Arquivos**: `src/systems/accessibilitySystem.ts`, `src/systems/hapticsSystem.ts`, `src/systems/ttsSystem.ts`, `src/systems/audio/audioEngine.ts`, `src/ui/optionsScreen.ts`, `src/ui/codexScreen.ts`, `src/ui/mainMenu.ts`, `src/ui/onboardingModal.ts`, `src/ui/touchControls.ts`.
  - **Ação**: Padronizar leitura/escrita blindada contra falhas com fallback seguro.

---

### Etapa 3: Roteamento de Logs Residuais (`src/utils/errorReporter.ts`)

- [x] **3.1 Substituição de `console.*` nos 5 Arquivos Residuais**
  - **Arquivos**: `src/services/leaderboardApi.ts`, `src/ui/victoryCard.ts`, `src/systems/weeklyChallenge.ts`, `src/systems/leaderboard.ts`, `src/main.ts`.
  - **Ação**: Roteamento para `reportWarning`, `reportError` ou `reportInformation`.

---

### Etapa 4: Decomposição Modular de Arquivos Extensos (Fase 37.7)

- [ ] **4.1 Decomposição de `src/ui/codexScreen.ts` (~731 linhas)**
  - **Arquivos**: `src/ui/codex/` (`codexNavigation.ts`, `codexSpeciesTab.ts`, `codexMigrationTab.ts`, `codexConservationTab.ts`, `codexThreatsTab.ts`).
  - **Ação**: Modularizar abas temáticas isolando a renderização e reduzindo o orquestrador para < 250 linhas.
- [ ] **4.2 Decomposição de `src/ui/optionsScreen.ts` (~786 linhas)**
  - **Arquivos**: `src/ui/options/` (`audioOptionsTab.ts`, `controlsOptionsTab.ts`, `accessibilityOptionsTab.ts`, `kioskOptionsTab.ts`).
  - **Ação**: Segmentar categorias de configuração em submódulos atômicos.
- [ ] **4.3 Decomposição de `src/systems/audio/audioSFX.ts` (~652 linhas)**
  - **Arquivos**: `src/systems/audio/sfx/` (`sfxWhale.ts`, `sfxEnvironment.ts`, `sfxThreats.ts`, `sfxUI.ts`).
  - **Ação**: Separar geradores de áudio retro por famílias mantendo o barramento e o limiter 8-bit intactos.
- [ ] **4.4 Decomposição de `src/systems/canyonSystem.ts` (~477 linhas)**
  - **Arquivos**: `src/systems/canyon/` (`canyonGeometry.ts`, `canyonCurrents.ts`, `canyonObstacles.ts`).
  - **Ação**: Isolar geração de malha rochosa e dinâmica de fluxo de fendas profundas.
- [ ] **4.5 Extração de Cenas de `src/main.ts` para `src/scenes/`**
  - **Arquivos**: `src/scenes/startScene.ts`, `src/scenes/gameScene.ts`, `src/scenes/gameoverScene.ts`, `src/scenes/rescueScene.ts`, `src/main.ts`.
  - **Ação**: Deixar `src/main.ts` focado unicamente na inicialização do Kaboom, carregamento de assets e registro de cenas.

---

### Etapa 5: Limpeza Estrita de `any` e Reativação de Linter (Fase 37.6)

- [ ] **5.1 Tipagem Estrita em Entidades e UI**
  - **Arquivos**: 49 arquivos contendo `as any` ou `: any`.
  - **Ação**: Substituir por `GameObj`, tipos concretos de eventos e contratos Zod/TypeScript.
- [ ] **5.2 Reativação de `@typescript-eslint/no-explicit-any`**
  - **Arquivos**: `eslint.config.js`.
  - **Ação**: Alterar a regra de `"off"` para `"warn"` (ou `"error"`), validando conformidade estrita no CI.

---

### Etapa 6: Testes Automatizados e Validação Estática

- [ ] **6.1 Teste Estático de Ausência de Resíduos (`tests/phase37_residuals.test.ts`)**
  - **Arquivos**: `tests/phase37_residuals.test.ts`.
  - **Ação**: Validar estaticamente que não existem ocorrências de `Math.random()`, `localStorage.` direto nem `console.*` desprotegido em arquivos de produção fora de seus respectivos utilitários.
- [ ] **6.2 Validação da Suíte Completa e Build**
  - **Ação**: Executar `npm test`, `npm run lint` e `npm run build` garantindo 100% de aprovação e zero regressão.
