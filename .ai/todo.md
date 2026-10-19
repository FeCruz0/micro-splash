# Plano de Implementação — Fase 46: Bundle, Code-Splitting & Performance de Renderização

Status: Concluído
Data: 2026-10-19
Alvo: v1.14.0

---

## 🔬 Diagnóstico e Escopo da Fase 46

1. **Code-Splitting e Otimização de Chunks (`vite.config.ts`, `src/scenes/`, `src/ui/`)**:
   - O chunk principal de produção atinge ~588 kB, excedendo o teto padrão do Vite (500 kB).
   - Extrair `kaboom` e `zod` em chunks vendor dedicados (`vendor_kaboom`, `vendor_zod`) via `rollupOptions.output.manualChunks`.
   - Implementar carregamento dinâmico (`import()`) para telas e modais pesados (`codexScreen`, `optionsScreen`, `modeSelectScreen`, `victoryCard`, `shareModal`, `statsModal`, `quizModal`).

2. **Registro Completo de Subsistemas no Culling e Ciclo de Vida (`src/systems/`, `src/scenes/gameScene.ts`)**:
   - Integrar `parallaxSkySystem`, `weatherSystem`, `bioluminescenceSystem`, `marineSnowSystem` e `lightRaysSystem` ao `SpatialCullingManager` e `BiomeLifecycleManager`.
   - Pausar emissões de partículas e simulações quando fora da viewport ou fora da faixa horizontal do bioma.

3. **Eliminação Universal de Consultas `k.get()` Residuais em Produção**:
   - Remover varreduras lineares $O(N)$ em hot loops:
     - `src/systems/penguinFlockSystem.ts`: remover fallback `k.get(TAGS.PLAYER)` em favor de `getActivePlayerObject()`.
     - `src/systems/iceSurface.ts`: remover fallbacks `k.get(TAGS.PLAYER)` em `segment.onUpdate()` e `breakIce()`.
     - `src/entities/krill.ts`: remover fallback `k.get(TAGS.PLAYER)` em `krillCluster.onUpdate()`.
     - `src/entities/player/playerSonar.ts`: substituir 6 chamadas simultâneas `k.get()` por registro acumulado e pooling de alvos acústicos.
     - `src/scenes/gameScene.ts`: reduzir ou eliminar contagem `k.get("*").length` no HUD de diagnóstico.

4. **Atlas de Sprites Unificado & Consolidação de Assets (`scripts/`, `public/sprites/`)**:
   - Consolidar spritesheets de fauna secundária (`orca_bg.png`, `cachalote_bg.png`, `humpback_bg.png`) ou unificar pipelines de carregamento mantendo pixel art, proporções e `sliceX`.

5. **Cache e Reutilização de Texturas Procedurais & Buffers**:
   - Evitar recriação de gradientes, buffers de cor e geradores procedurais entre transições de cena e resets de partida.

6. **Orçamento de Bundle e Suíte de Testes Automatizados (`tests/phase46_bundle_performance.test.ts`)**:
   - Testes unitários para frustum de culling, ausência de `k.get()` em arquivos de simulação e validação do limite de tamanho do chunk principal (< 350 kB).

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Otimização de Bundling & Vendor Code-Splitting (`vite.config.ts`)

- [x] **1.1 Configurar `manualChunks` no Rollup**
  - **Arquivo**: `vite.config.ts`
  - **Ação**: Configurar `build.rollupOptions.output.manualChunks` para segregar `kaboom` em `vendor_kaboom` e `zod` em `vendor_zod`. Ajustar `chunkSizeWarningLimit` para 400 kB.
  - **Validação**: Executar `npm run build` e verificar geração dos chunks vendor separados.

- [x] **1.2 Lazy-Loading Dinâmico de Modais e Telas em `menuScene.ts` e `mainMenu.ts`**
  - **Arquivos**: `src/scenes/menuScene.ts`, `src/ui/mainMenu.ts`
  - **Ação**: Substituir imports estáticos de `showOptionsScreen`, `showCodexScreen`, `showModeSelectScreen` e `showStatsModal` por chamadas assíncronas com `await import(...)`.
  - **Validação**: Verificar que os módulos só são requisitados sob demanda ao clicar nos respectivos botões.

- [x] **1.3 Lazy-Loading Dinâmico de Modais Pós-Jogo em Telas de Vitória e Desafio**
  - **Arquivos**: `src/ui/victoryScreen.ts`, `src/ui/challengeEndScreen.ts`, `src/ui/codexScreen.ts`
  - **Ação**: Carregar `showShareModal`, `showQuizModal` e geradores pesados de `victoryCard` sob demanda via `import()`.
  - **Validação**: Confirmar transição fluida nas telas finais sem quebra de fluxo.

---

### Etapa 2: Registro Completo no Culling Espacial e Ciclo de Vida

- [x] **2.1 Integração de Partículas e Atmosfera no `SpatialCullingManager`**
  - **Arquivos**: `src/systems/spatialCullingSystem.ts`, `src/scenes/gameScene.ts`
  - **Ação**: Registrar emissores e camadas de `lightRaysSystem`, `marineSnowSystem`, `parallaxSkySystem` e `bioluminescenceSystem` para pausar renderização e atualização quando distantes da câmera.
  - **Validação**: Validar via `spatialCulling.update(camX)` ocultação de entidades fora do campo de visão.

- [x] **2.2 Integração do `weatherSystem` e `benthicFloorSystem` no `BiomeLifecycleManager`**
  - **Arquivos**: `src/systems/weatherSystem.ts`, `src/scenes/gameScene.ts`
  - **Ação**: Atrelar o ciclo de vida de tempestades, nevascas e vegetação bentônica às faixas de coordenadas de cada bioma com margem de histerese.
  - **Validação**: Confirmar interrupção de loops em biomas onde o sistema não é visível.

---

### Etapa 3: Eliminação Universal de `k.get()` Residual em Simulação

- [x] **3.1 Substituição de `k.get(TAGS.PLAYER)` em Entidades e Pinguins**
  - **Arquivos**: `src/systems/penguinFlockSystem.ts`, `src/systems/iceSurface.ts`, `src/entities/krill.ts`
  - **Ação**: Substituir acessos diretos e fallbacks `k.get(TAGS.PLAYER)` pelo singleton $O(1)$ `getActivePlayerObject()`.
  - **Validação**: Garantir zero chamadas `k.get(TAGS.PLAYER)` em loops de atualização.

- [x] **3.2 Otimização do Sonar Acústico sem Varredura Linear Múltipla**
  - **Arquivo**: `src/entities/player/playerSonar.ts`
  - **Ação**: Eliminar as 6 chamadas lineares `this.k.get(...)`. Utilizar lista cacheada/registro de alvos acústicos ou consulta agrupada por tag unificada.
  - **Validação**: Emitir sonar repetidamente sem degradação de frame time.

- [x] **3.3 Otimização da Contagem de Entidades do HUD de Diagnóstico**
  - **Arquivo**: `src/scenes/gameScene.ts`
  - **Ação**: Substituir `k.get("*").length` por amostragem throttled (a cada 500ms) ou contador centralizado de entidades ativas.
  - **Validação**: Verificar estabilidade do HUD de telemetria sem varredura global por frame.

---

### Etapa 4: Atlas de Sprites Unificado & Cache de Texturas Procedurais

- [x] **4.1 Script de Consolidação / Pipeline Unificado de Fauna Secundária**
  - **Arquivos**: `scripts/generateFaunaAtlas.cjs` (ou ajuste nos geradores de sprites), `src/systems/backgroundFaunaSystem.ts`
  - **Ação**: Unificar texturas de fauna de segundo plano ou reutilizar buffer de canvas em atlas único com mapeamento de frames preservando pixel art.
  - **Validação**: Executar script gerador e validar carregamento no `backgroundFaunaSystem`.

- [x] **4.2 Cache de Texturas Procedurais e Gradientes**
  - **Arquivos**: `src/systems/oceanFloor.ts`, `src/systems/waterSurface.ts`
  - **Ação**: Armazenar texturas geradas proceduralmente para reutilização entre sessões e reinícios sem nova alocação de canvas.
  - **Validação**: Reiniciar a migração e verificar ausência de re-geração redundante de texturas.

---

### Etapa 5: Suíte de Testes Automatizados da Fase 46 (`tests/phase46_bundle_performance.test.ts`)

- [x] **5.1 Testes Unitários e Estáticos de Performance e Bundle**
  - **Arquivo**: `tests/phase46_bundle_performance.test.ts`
  - **Ação**: Implementar testes automatizados:
    1. Validação estática de ausência de `k.get(TAGS.PLAYER)` em `penguinFlockSystem.ts`, `iceSurface.ts` e `krill.ts`.
    2. Validação estática de ausência de varreduras lineares múltiplas em `playerSonar.ts`.
    3. Teste unitário do `SpatialCullingManager` cobrindo registro de subsistemas e cálculo de frustum.
    4. Teste de orçamento de bundle (chunk principal < 350 kB após build).
  - **Validação**: Executar `npm test tests/phase46_bundle_performance.test.ts`.

- [x] **5.2 Atualização da Documentação e Roadmap**
  - **Arquivo**: `docs/ROADMAP.md`
  - **Ação**: Marcar todos os itens 46.1 a 46.6 da Fase 46 como concluídos `[x]`.

---

### Etapa 6: Validação Geral de Qualidade e Build

- [x] **6.1 Execução de Linter, Tipagem e Testes Globais**
  - **Comandos**:
    - `npm run lint` (0 erros, 0 warnings em `src`, `tests`, `scripts`, `server`, `public/sw.js`)
    - `npm test` (100% de aprovação em todas as suítes)
    - `npm run build` (`tsc && vite build` com chunk principal abaixo de 350 kB e zero warnings)
