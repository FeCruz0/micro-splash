# Plano de Implementação — Fase 57: Refinamento Físico, Timestep & Consistência de Dados

Status: Concluído ✅  
Data: 2026-10-26  
Alvo: v1.22.0 (Física Invariante a FPS & Integridade de Biomas)

---

## 🔬 Diagnóstico e Escopo da Fase 57

1. **Problemas Identificados**:
   - **Arrasto Dependente de Framerate**: Em `playerPhysics.ts` e `companionWhale.ts`, a desaceleração era calculada a cada quadro via `currentSpeed.scale(WATER_DRAG)` e o arrasto do ar por `currentSpeed.x * 0.998`. Em 60Hz, $0.955^{60} \approx 0.063$ de velocidade retida por segundo; em 144Hz, $0.955^{144} \approx 0.0013$, tornando a baleia excessivamente travada e pesada em monitores com alta taxa de atualização.
   - **Interpolações Angulares sem Delta Time**: `lerp(angle, 0, 0.05)` interpolava 5% a cada quadro fixo, fazendo a rotação e o alinhamento corporal ocorrerem 2,4x mais rápido a 144 FPS do que a 60 FPS.
   - **Vulnerabilidade a Picos de Delta Time (Tunneling & Leaps)**: Em `gameScene.ts`, `dt = k.dt()` não possuía limitação superior (clamp). Quando o usuário alternava abas ou ocorriam engasgos por coleta de lixo (GC) ou carregamento, `dt` podia atingir valores de 0.5s a 2.0s, disparando cálculos de física que arremessavam a baleia através de colisores sólidos de gelo polar ou do leito marinho.
   - **Redundância e Duplicação na Delimitação de Biomas**: Os limites de distância dos biomas (0m, 5.000m, 12.000m, 19.000m, 25.000m, 30.000m) estavam espalhados com números mágicos literais em `state.ts` (`getCurrentBiome`), `config.ts` (`BIOME_COLOR_STOPS`), `biomeLifecycleManager.ts` e outros módulos, carecendo de uma fonte única da verdade e helper puro canônico.

2. **Decisões Técnicas**:
   - **Arrasto Exponencial Invariante**: Usar formulação contínua baseada no tempo decorrido `deltaTime`:
     - Água: `Math.pow(GAME_CONFIG.WATER_DRAG, deltaTime * 60)`
     - Ar: `Math.pow(0.998, deltaTime * 60)`
     - Interpolação angular suave: `1 - Math.pow(1 - alpha, deltaTime * 60)`
   - **Clamp de Delta Time Seguro**: Definir `GAME_CONFIG.MAX_DELTA_TIME = 0.0333` (~30 FPS mínimo) em `config.ts` e aplicar clamp `Math.min(Math.max(0, rawDeltaTime), GAME_CONFIG.MAX_DELTA_TIME)` na entrada do loop em `gameScene.ts`.
   - **Fonte Canônica de Biomas**:
     - Definir `BiomeType` canônico: `"antartica" | "pelagico" | "costa_urbana" | "canyons" | "arraial"`.
     - Definir `BIOME_BOUNDARIES` em `src/config.ts`.
     - Implementar helper puro `getBiomeAtDistance(distanceInMeters: number): BiomeType`.
     - Refatorar `src/systems/state.ts` para consumir `getBiomeAtDistance`.

3. **Arquitetura & Restrições**:
   - Respeito integral a `ai.rules` (Matt Pocock pure functions, Clean Code, TypeScript estrito, zero alocações por quadro no loop de física).
   - Suíte de testes TDD com cobertura unitária para invariância de framerate (comparando simulações a 60 FPS vs 120 FPS vs 144 FPS com tolerância < 1%) e validação de fronteiras de biomas.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Constantes, Tipos e Helper Canônico de Biomas (`src/config.ts`)

- [x] **1.1 Definir `MAX_DELTA_TIME`, `BiomeType`, `BIOME_BOUNDARIES` e `getBiomeAtDistance`**
  - **Arquivo**: `src/config.ts`.
  - **Ação**: Adicionar `MAX_DELTA_TIME: 0.0333` em `GAME_CONFIG`, declarar `BiomeType`, exportar constante `BIOME_BOUNDARIES` e função utilitária pura `getBiomeAtDistance(distanceInMeters: number): BiomeType`.

---

### Etapa 2: Refatoração de Estado com Fonte Canônica (`src/systems/state.ts`)

- [x] **2.1 Migrar `getCurrentBiome()` para `getBiomeAtDistance`**
  - **Arquivo**: `src/systems/state.ts`.
  - **Ação**: Substituir condicionais literais mágicos (`< 5000`, `< 12000`, etc.) pelo consumo direto do helper puro `getBiomeAtDistance`.

---

### Etapa 3: Física & Arrasto Hidrodinâmico Invariantes ao Framerate

- [x] **3.1 Arrasto Exponencial e Alinhamento Angular Invariantes no Jogador**
  - **Arquivo**: `src/entities/player/playerPhysics.ts`, `src/entities/player/playerControls.ts`.
  - **Ação**:
    - Em `playerPhysics.ts`: aplicar atenuação d'água via `Math.pow(GAME_CONFIG.WATER_DRAG, dt * 60)`, arrasto aéreo via `Math.pow(0.998, dt * 60)` e `lerp` angular com fator temporal `1 - Math.pow(0.9, dt * 60)`.
    - Em `playerControls.ts`: substituir `lerp(angle, 0, 0.05)` por decaimento exponencial `1 - Math.pow(0.95, dt * 60)`.
- [x] **3.2 Arrasto Exponencial e Alinhamento Angular na Baleia-Guia (NPC)**
  - **Arquivo**: `src/entities/companionWhale.ts`.
  - **Ação**: Atualizar arrasto aquático para `Math.pow(GAME_CONFIG.WATER_DRAG, deltaTime * 60)` e retorno angular de repouso para `1 - Math.pow(0.95, deltaTime * 60)`.

---

### Etapa 4: Timestep Seguro com Limitação de Delta Time (`src/scenes/gameScene.ts`)

- [x] **4.1 Clamping de Delta Time na Cena Principal**
  - **Arquivo**: `src/scenes/gameScene.ts`.
  - **Ação**: Aplicar clamp no delta time retornado pelo motor: `const dt = Math.min(Math.max(0, k.dt()), GAME_CONFIG.MAX_DELTA_TIME)` antes de distribuir aos subsistemas de física, entidades e culling.

---

### Etapa 5: Suíte de Testes Automatizados TDD

- [x] **5.1 Testes de Invariância de Framerate na Física**
  - **Arquivo**: `tests/player/physics.test.ts`.
  - **Ação**: Implementar testes comparando desaceleração após 1.0s simulado a 60 FPS, 120 FPS e 144 FPS com tolerância < 1%.
- [x] **5.2 Testes Unitários de `getBiomeAtDistance` e Fronteiras Geográficas**
  - **Arquivo**: `tests/core/config.test.ts`.
  - **Ação**: Cobrir pontos de corte (0m, 4999m, 5000m, 11999m, 12000m, 18999m, 19000m, 24999m, 25000m, 30000m e extremos).
- [x] **5.3 Testes de Timestep Clamping**
  - **Arquivo**: `tests/player/physics.test.ts`.
  - **Ação**: Testar estabilidade da física sob picos artificiais de delta time (ex: 1.5s).

---

### Etapa 6: Validação e Atualização Documental

- [x] **6.1 Executar Verificação de Tipos e Suíte de Testes**
  - **Ação**: Executados `npx tsc --noEmit` e `npm test -- --run` (73 arquivos, 558 testes aprovados).
- [x] **6.2 Sincronizar ROADMAP.md e CHANGELOG.md**
  - **Arquivo**: `docs/ROADMAP.md`, `CHANGELOG.md`.
  - **Ação**: Atualizar checkboxes e registrar notas de versão para a Fase 57.
