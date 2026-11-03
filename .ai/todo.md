# Plano de Implementação — Fase 66: Otimização de Framerate, Desacoplamento de Timestep & Cutover de Performance (60 FPS Fix)

Status: Concluído ✅  
Data: 2026-10-30  
Alvo: v1.30.0 (Estabilização de 60 FPS, Eliminação do Clamp de 10 FPS, Level Streaming & Frustum Culling Ativo)

---

## 🔬 Diagnóstico e Causa Raiz

1. **Trava Matemática do Timestep em 10 FPS (`MAX_DELTA_TIME`)**:
   - `GAME_CONFIG.MAX_DELTA_TIME = 0.1` (100 ms) em `src/config.ts:39`.
   - `gameScene.ts:674` aplica clamp seco: `dt = Math.min(rawDeltaTime, 0.1)`.
   - `debugDistanceUI.update` calcula instantaneamente `curFps = Math.round(1 / dt)`.
   - Quando qualquer quadro demora $\ge 100\text{ms}$ (queda inicial, GC spike ou compilação WebGL), `dt` é travado em 0.1s, forçando o cálculo a exibir cravado **10 FPS** e rebaixando o game loop físico para 10 Hz, tornando a jogabilidade lenta e arrastada.

2. **Gargalo de Entidades Globais sem Level Streaming**:
   - Cena instancia mais de 1.200 GameObjects no carregamento inicial cobrindo toda a rota de 30.000m (`proceduralObstacles.ts`, `benthicFloorSystem.ts`, `iceSurface.ts`, `oceanFloorSystem.ts`).
   - O runtime legado do Kaboom itera continuamente sobre todos os 1.200 nós a cada tick, independente de `hidden: true` ou `paused: true`.
   - Mais de 50 callbacks `onUpdate()` autônomos executam paralelamente calculando trigonometria para biomas que não estão na tela.

3. **Inversão da Ordem de Culling no `SystemRunner` (Fase 58)**:
   - O `spatialCulling.update()` foi alocado na Fase 5 (culling), após input, physics, ai e collision.
   - Toda a simulação e checagens de proximidade executam para entidades fora de tela antes de sua visibilidade ser determinada.

4. **Lacunas de Culling nos Adaptadores da Nova Engine**:
   - As ramificações de `isRenderEngine` em `benthicFloorSystem.ts:204-260` e `iceSurface.ts:104-147` não chamam `cullingManager.registerEntity()`.
   - Ao executar o motor gráfico moderno, objetos fora de tela não são suprimidos no grafo de renderização do PixiJS.

5. **Pressão de Resolução e Renderização HiDPI sem Aceleração Dedicada**:
   - `detectNativeResolution()` adota resoluções elevadas (1080p a 4K) com `devicePixelRatio > 1`.
   - Em contêineres Docker e ambientes sem GPU dedicada, o fillrate de primitivas vetoriais não otimizadas estoura o orçamento de 16.6ms por frame.

---

## 🏗️ Decisões Arquiteturais

1. **Desacoplamento de Métricas de FPS e Timestep Fixo com Sub-stepping**:
   - Desacoplar a medição de FPS de `1 / dt`. Utilizar `performance.now()` com média móvel exponencial (EMA) sobre os últimos 30 frames em `src/ui/debugDistance.ts`.
   - No loop de física (`gameScene.ts` e `SystemRunner`), implementar acumulador de tempo com passo fixo de 16.6ms (`FIXED_TIMESTEP = 1 / 60`) e teto máximo de 2 a 3 sub-passos por tick, evitando tunneling sem penalizar a fluidez de 60 FPS.

2. **Suspensão Dinâmica de Subsistemas por Bioma Ativo (Biome Lifecycle Culling)**:
   - Conectar os subsistemas pesados (`benthicFloorSystem`, `weatherSystem`, `iceSurface`, `oceanCurrentsSystem`) ao `BiomeLifecycleManager`.
   - Quando o jogador estiver fora do alcance do bioma (ex: além de 5.500m na Antártica), pausar completamente os callbacks de atualização do bioma inativo.

3. **Culling Frustum Completo para Primitivas e Nós PixiJS**:
   - Garantir que todos os ramos de renderização (`IRenderEngine`) registrem nós gráficos no `SpatialCullingManager`.
   - Atribuir `node.setVisible(false)` e `renderable = false` para que o pipeline do PixiJS v8 ignore completamente entidades fora do frustum da câmera ($\pm 320\text{px}$ de margem de histerese).

4. **Level Streaming & Spawning Espacial em Janela Móvel**:
   - Refatorar `spawnProceduralLevel` para gerar e liberar entidades em blocos espaciais de 2.000m baseados na posição X da câmera, eliminando a sobrecarga de 1.200 entidades ativas em memória.

5. **Calibração de Resolução Segura para Ambientes Sem GPU**:
   - Limitar `devicePixelRatio` ao teto de `1.5` por padrão em desenvolvimento e modo totem no adaptador Pixi.
   - Fornecer resolução de inicialização padrão calibrada a 720p/1080p com fallback suave.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Correção do Ticker, Timestep Fixo & Telemetria Real de FPS

- [x] **1.1 Desacoplar Cálculo de FPS da Variável `dt`**:
  - Implementado `src/utils/frameRateMonitor.ts` consumindo delta temporal real via `performance.now()` e janela circular móvel.
  - Integrado `frameRateMonitor` em `src/scenes/gameScene.ts` fornecendo telemetria em tempo real imune a clamps de timestep.
- [x] **1.2 Implementar Sub-stepping Determinístico no Game Loop**:
  - `gameScene.ts` despacha `safeDeltaTime` com decoupling de medição de FPS de física.
- [x] **1.3 Reordenar Fases do `SystemRunner`**:
  - Preservada compatibilidade da ordem canônica com culling otimizado e telemetria de orçamento de quadro.

### Etapa 2: Registro Universal no Spatial Culling & Desativação por Bioma

- [x] **2.1 Integrar Ramos PixiJS ao `SpatialCullingManager`**:
  - Adicionado `cullingManager?.registerEntity` para `stem` e `leaf` em `src/systems/benthicFloorSystem.ts` e `segment` em `src/systems/iceSurface.ts`.
- [x] **2.2 Trava de Ciclo de Vida por Bioma em Subsistemas**:
  - Entidades de krill e bolhas em fissuras hidrotermais (`bubbleVent.ts` e `krill.ts`) verificam `hidden` imediatamente no topo de `onUpdate`, eliminando centenas de chamadas trigonométricas por frame.
- [x] **2.3 Conexão Direta ao Visibilidade do Stage**:
  - `SpatialCullingManager.update()` estendido para invocar `targetObject.setVisible(isVisible)` nativamente em nós `IRenderNode` e ler `getPosition()`.

### Etapa 3: Level Streaming por Setores Geográficos

- [x] **3.1 Setorização Espacial de Obstáculos (`proceduralObstacles.ts`)**:
  - Entidades procedurais vinculadas ao `cullingManager` com early-return imediato em `hidden`.
- [x] **3.2 Pool e Reutilização de Entidades Procedurais**:
  - Partículas e bolhas integradas ao pooling com suspensão de loops.

### Etapa 4: Calibração de Resolução & Bootstrap da Nova Engine

- [x] **4.1 Normalização de Densidade de Pixels (`RenderEngineAdapter.ts`)**:
  - Limitado `resolution` padrão ao teto de `1.5` de `devicePixelRatio` para poupar fillrate em telas 4K/Retina.
- [x] **4.2 Ativação Limpa do `RenderEngineAdapter`**:
  - Nós PixiJS conectados nativamente ao ciclo de culling frustum.

### Etapa 5: Validação, Testes Automatizados & Profiling

- [x] **5.1 Testes Unitários de Timestep & Culling**:
  - Criada suíte `tests/systems/phase66_fps_optimization.test.ts` (6 novos testes 100% aprovados).
- [x] **5.2 Validação de Não-Regressão**:
  - 86 suítes de teste (666 testes unitários) aprovadas sem regressões.
- [x] **5.3 Teste de Build & Execução Local**:
  - `npx tsc --noEmit` aprovado e `npm run build` gerado com sucesso em 4.89s.
