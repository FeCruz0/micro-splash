# Plano de Implementação — Fase 53: Otimização Extrema de Frame Time & Taxa de Quadros (Zero Frame Drops)

Status: Concluído ✅  
Data: 2026-10-20  
Alvo: v1.18.0

---

## 🔬 Diagnóstico e Escopo da Fase 53

1. **Throttling & Caching de Atualizações Globais (`src/scenes/gameScene.ts` & `src/systems/oceanEnvironment.ts`)**:
   - Atualmente, `k.camPos()`, `k.width()` e `k.height()` são consultados repetidas vezes em múltiplos pontos do loop principal de `gameScene.ts`.
   - `updateOceanColors` executa 12 interpolações `k.lerp` e instancia 4 novos objetos de cor `k.rgb()` todos os frames, mesmo quando a baleia se move poucos pixels e a transição cromática entre biomas é imperceptível.
   - **Solução**:
     - Cachear `cameraPosition`, `screenWidth` e `screenHeight` uma única vez no início de cada frame em `gameScene.ts`.
     - Implementar dirty-check e throttling em `updateOceanColors`: recalcular a paleta ambiental somente quando a distância percorrida variar mais de 5 metros ou se a cena acabou de carregar.

2. **Culling Espacial Acelerado & Pausa O(1) Fora da Tela (`src/systems/spatialCullingSystem.ts`)**:
   - Ao remover entidades destruídas no array de culling, `this.cullableEntities.splice(index, 1)` gera custo O(N) com realocação de memória.
   - Entidades marcadas com `hidden = true` ainda executam seus callbacks `onUpdate` a cada frame.
   - **Solução**:
     - Substituir `splice` por remoção O(1) via swap-and-pop (`cullableEntities[index] = cullableEntities[lastIndex]; cullableEntities.pop()`).
     - Propagar `paused = !isVisible` para entidades com lógica pesada ou que suportem o componente de pausa.

3. **Reutilização de Buffers & Redução de Pressão no Garbage Collector**:
   - `calculateWhaleSliceTransforms` (`src/entities/player/playerSliceRenderer.ts`) aloca um novo array `WhaleSliceData[]` com 4 novos objetos em cada frame da simulação.
   - `createKrill` (`src/entities/krill.ts`) instancia entre 3 e 4 objetos `Vec2` (`scale`, `lerp`, `add`, `vec2`) por boid por frame (com 9 boids e múltiplos cardumes, centenas de alocações por frame).
   - `updateSnowParticlePosition` (`src/systems/marineSnowSystem.ts`) retorna novos objetos anônimos `{ y, driftOffset }` todo frame.
   - **Solução**:
     - Permitir injeção de buffer reutilizável pré-alocado em `calculateWhaleSliceTransforms`.
     - Refatorar a física dos boids de krill para utilizar coordenadas e velocidades escalares (`relX`, `relY`), mutando posições diretamente sem instanciar novos `Vec2`.
     - Atualizar a neve marinha in-place na própria estrutura `MarineSnowFlake`.

4. **Short-Circuit de Subsistemas Inativos & Pool com Lista Ativa Densa (`src/systems/weatherSystem.ts`, `src/systems/particlePool.ts`, `src/systems/benthicFloorSystem.ts`)**:
   - Em `weatherSystem.ts`, quando o clima é `clear` ou inativo, o sistema continua executando `forEach` sobre todos os arrays de partículas para atribuir `opacity = 0`.
   - Em `particlePool.ts`, o método `update` itera todos os slots (círculos e retângulos) mesmo quando inativos.
   - **Solução**:
     - Implementar flag de clima limpo em `weatherSystem.ts` para sair imediatamente do loop quando as partículas já estiverem ocultadas.
     - Implementar arrays densos de índices ativos (`activeCircleIndices`, `activeRectIndices`) com swap-and-pop na desativação em `particlePool.ts`.
     - Eliminar alocações vetoriais na atração magnética de partículas substituindo por matemática escalar direta.
     - Registrar flora bentônica (`benthicFloorSystem.ts`) no culling para não atualizar nós fora da viewport.

5. **Roteamento de Spawns Residuais para ParticlePool (`src/entities/player/playerParticles.ts` & `src/systems/breachSystem.ts`)**:
   - Partículas de bolhas caudais, vórtices de nadadeiras peitorais e splashes de breach criam nós temporários ad-hoc via `k.add()` com timers de destruição.
   - **Solução**:
     - Rotear emissão de bolhas e respingos para `ParticlePool.spawnCircle` e `ParticlePool.spawnRect`, eliminando instanciação e destruição de nós no Kaboom.

6. **Métricas de Frame Time p95/p99 no Overlay de Diagnóstico F3 (`src/ui/debugDistance.ts`)**:
   - O painel atual exibe apenas FPS instantâneo e entidades brutas.
   - **Solução**:
     - Implementar buffer circular de 120 amostras de frame time (`dt` em ms).
     - Criar funções puras `calculateFrameTimeMetrics(history: number[])` calculando média, p95 e p99 em milissegundos.
     - Exibir as métricas de latência e a contagem de entidades visíveis vs culled no painel F3/F8.

7. **Suíte de Testes Automatizados de Performance e Estabilidade (`tests/systems/phase53_frame_time_optimization.test.ts`)**:
   - Cobertura completa de:
     - Reutilização de buffers em `playerSliceRenderer`.
     - Lista densa ativa em `particlePool`.
     - Cálculo de métricas de frame time p95/p99.
     - Dirty-check de `updateOceanColors`.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Throttling & Caching de Atualizações Globais

- [x] **1.1 Cachear Propriedades Globais no Loop Principal**
  - **Arquivo**: `src/scenes/gameScene.ts`.
  - **Ação**: Extrair `cameraPos = k.camPos()`, `screenWidth = k.width()`, `screenHeight = k.height()` uma vez por frame e reutilizar em todos os subsistemas dependentes.
  - **Validação**: Verificação de ausência de chamadas redundantes a `k.camPos()`.

- [x] **1.2 Dirty-Check e Throttling em `updateOceanColors`**
  - **Arquivo**: `src/systems/oceanEnvironment.ts`.
  - **Ação**: Implementar cache da última distância e cores, recalculando interpolações apenas se a variação for superior ao limiar (`threshold = 5m`).
  - **Validação**: Teste unitário validando que pequenas variações não acionam novos cálculos.

---

### Etapa 2: Culling Espacial O(1) e Pausa Fora de Tela

- [x] **2.1 Otimizar Limpeza de Entidades com Swap-and-Pop**
  - **Arquivo**: `src/systems/spatialCullingSystem.ts`.
  - **Ação**: Substituir `splice(index, 1)` por swap-and-pop O(1) e adicionar suporte a pausa de processamento em entidades fora de tela.
  - **Validação**: Testes em `tests/systems/phase39_performance_culling.test.ts`.

---

### Etapa 3: Reutilização de Buffers e Eliminação de Alocações por Frame

- [x] **3.1 Buffer Reutilizável de Fatias em `playerSliceRenderer.ts`**
  - **Arquivo**: `src/entities/player/playerSliceRenderer.ts`.
  - **Ação**: Permitir injeção de `targetBuffer?: WhaleSliceData[]` para escrita in-place, eliminando `result = []` por frame.
  - **Validação**: Teste unitário comparando integridade com o modo legado.

- [x] **3.2 Eliminar Alocações Vetoriais nos Boids de Krill**
  - **Arquivo**: `src/entities/krill.ts`.
  - **Ação**: Migrar a física dos boids para matemática escalar com variáveis `relX`, `relY`, evitando `targetScatter`, `sub()`, `unit()` e `lerp()` vetoriais a cada quadro.
  - **Validação**: Teste em `tests/systems/krill.test.ts`.

- [x] **3.3 Atualização In-Place de Neve Marinha**
  - **Arquivo**: `src/systems/marineSnowSystem.ts`.
  - **Ação**: Mutar coordenadas diretamente na estrutura `MarineSnowFlake`, evitando alocações anônimas `{ y, driftOffset }`.
  - **Validação**: `tests/systems/phase35_visual_systems.test.ts`.

---

### Etapa 4: Short-Circuit e Lista Ativa Densa no ParticlePool

- [x] **4.1 Lista Ativa Densa com Swap-and-Pop no `ParticlePool`**
  - **Arquivo**: `src/systems/particlePool.ts`.
  - **Ação**: Gerenciar `activeCircleIndices` e `activeRectIndices` iterando apenas partículas em vida útil e eliminando vetores em `targetPos`.
  - **Validação**: Testes de integridade em `tests/systems/particlePool.test.ts`.

- [x] **4.2 Short-Circuit de Clima Inativo em `weatherSystem.ts`**
  - **Arquivo**: `src/systems/weatherSystem.ts`.
  - **Ação**: Adicionar flag para evitar percorrer arrays de partículas quando o clima estiver inativo e opacidades zeradas.
  - **Validação**: `tests/systems/weather.test.ts`.

---

### Etapa 5: Roteamento de Spawns Residuais para ParticlePool

- [x] **5.1 Rotear Bolhas e Vórtices para o Pool**
  - **Arquivos**: `src/entities/player/playerParticles.ts`, `src/systems/breachSystem.ts`.
  - **Ação**: Substituir `k.add()` ad-hoc de partículas por chamadas a `particlePool.spawnCircle`.
  - **Validação**: Testes de emissão de partículas.

---

### Etapa 6: Métricas de Frame Time p95/p99 no Diagnóstico F3

- [x] **6.1 Implementar Buffer Circular e Métricas de Frame Time**
  - **Arquivo**: `src/ui/debugDistance.ts`.
  - **Ação**: Implementar buffer circular de 120 quadros e funções puras `calculateFrameTimeMetrics` (média, p95, p99).
  - **Validação**: Testes unitários para cálculos estatísticos.

- [x] **6.2 Exibir Métricas no Painel de Telemetria**
  - **Arquivo**: `src/ui/debugDistance.ts`.
  - **Ação**: Integrar p95/p99 e contagem visível vs culled no layout do HUD F3/F8.
  - **Validação**: Testes em `tests/systems/f3Diagnostics.test.ts`.

---

### Etapa 7: Suíte de Testes da Fase 53 e Documentação

- [x] **7.1 Implementar `tests/systems/phase53_frame_time_optimization.test.ts`**
  - **Arquivo**: `tests/systems/phase53_frame_time_optimization.test.ts`.
  - **Ação**: Criar testes validando buffer de fatias, lista ativa do pool, throttling de cores e métricas de frame time.
  - **Validação**: `npx vitest run tests/systems/phase53_frame_time_optimization.test.ts`.

- [x] **7.2 Atualizar `docs/ROADMAP.md` e `CHANGELOG.md`**
  - **Arquivos**: `docs/ROADMAP.md`, `CHANGELOG.md`.
  - **Ação**: Marcar checkboxes e documentar a versão 1.18.0.

---

### Etapa 8: Validação Integrada do Projeto

- [x] **8.1 Executar Script Agregador `npm run check`**
  - **Comando**: `npm run check` (formatação, lint, validação de dados, tipos TypeScript, testes e build).
  - **Validação**: Retorno com código 0 e todos os testes verdes.
