# Plano de Implementação — Fase 58: Arquitetura, Determinismo & Type Safety

Status: Concluído ✅  
Data: 2026-10-26  
Alvo: v1.23.0 (Arquitetura Modular, Determinismo & Type Safety Estrita)

---

## 🔬 Diagnóstico e Escopo da Fase 58

1. **Problemas Identificados**:
   - **Aleatoriedade Não-Determinística na IA Acompanhante**: `src/entities/companionWhale.ts` emprega `Math.random()` diretamente em 5 locais (raio e velocidade de partículas de vapor na respiração polar, intervalo de cooldown do biosonar e duração estocástica da fase de planeio hidrodinâmico). Isso impede reprodução idêntica de corridas em Desafios Semanais (`weeklyChallenge`).
   - **Dispersão de Parâmetros e Números Mágicos**: Constantes de comportamento e IA (taxa de oxigênio crítico 38%, tempo de respiração 1.2s, intervalo de varredura sensorial 0.35s, alcance de radar 400px/160px, dimensões do colisor 91.8x35.7px, amortecimento do leito marinho 55px) estão codificadas diretamente no corpo da função `createCompanionWhale`, sem centralização tipada em `COMPANION_CONFIG`.
   - **Type Casting Inseguro em Colisões**: `src/systems/collisions.ts` utiliza `(companion as unknown as { ... })` para chamar `consumeKrill`, `handleIceCollision` e `handleObstacleCollision`, ignorando checagem estrita de tipos em tempo de compilação.
   - **Monolito de Código na Entidade da Baleia-Guia**: `src/entities/companionWhale.ts` ultrapassa 550 linhas, acumulando responsabilidades díspares (sensores/radar, cinemática de propulsão e máquina de estados), diferentemente da entidade do jogador que já foi elegantemente decomposta em submódulos especializados.
   - **Ordem de Execução Implícita no Loop da Cena**: Em `src/scenes/gameScene.ts`, os subsistemas rodam misturados e dependem da ordem cronológica de registro em `onUpdate`, sem garantia explícita das fases vitais do game loop (Input -> Física -> IA -> Colisão -> Culling -> Render/Áudio).

2. **Decisões Técnicas**:
   - **PRNG Determinístico Mulberry32**: Injetar gerador determinístico `createDeterministicRandomGenerator(seed)` de `src/utils/random.ts` em `CompanionOptions`, garantindo repetibilidade determinística.
   - **Centralização Tipada em `COMPANION_CONFIG`**: Expandir `COMPANION_CONFIG` em `src/config.ts` com todos os parâmetros heurísticos e físicos da IA.
   - **Contrato de Interface Estrito para Colisores**: Criar interface `CompanionCollidable` e type guard `isCompanionCollidable(entity: GameObj): entity is GameObj & CompanionCollidable` em `src/entities/companion/types.ts`, consumido em `src/systems/collisions.ts`.
   - **Decomposição Modular da Baleia-Guia**: Fracionar `companionWhale.ts` em submódulos atômicos sob `src/entities/companion/`:
     - `types.ts`: interfaces de estado, opções, controlador e contrato de colisão.
     - `companionSenses.ts`: radar sensorial, escaneamento de krill e obstáculos à frente, disparo de biosonar.
     - `companionLocomotion.ts`: física hidrodinâmica, arfagem vertical lenta, impulso direcional da cauda e colisão sólida.
     - `companionStates.ts`: máquina de estados finita (INTRO, CRUISE, FEEDING, SEEK_BREATH, SURFACE_BREATHE, FAREWELL_BREACH, RESTING, DEPARTED).
     - `index.ts`: fachada pública `createCompanionWhale` mantendo compatibilidade 100% transparente com o resto do jogo.
   - **Orquestrador Determinístico de Sistemas (`SystemRunner`)**:
     - Criar `src/systems/systemRunner.ts` com fila de execução prioritária por fases canônicas: `input`, `physics`, `ai`, `collision`, `culling`, `render`.
     - Integrar `SystemRunner` em `src/scenes/gameScene.ts` para coordenar atualizações com ordem declarativa e determinística.

3. **Arquitetura & Restrições**:
   - Respeito integral a `ai.rules` (Matt Pocock pure functions, TypeScript estrito, Clean Code, zero regressão em testes).
   - Cobertura com testes unitários em `tests/entities/companion/` e `tests/systems/systemRunner.test.ts`.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Constantes e Configuração Centralizada (`src/config.ts`)

- [x] **1.1 Expandir `COMPANION_CONFIG` com Parâmetros Heurísticos da IA**
  - **Arquivo**: `src/config.ts`.
  - **Ação**: Adicionar constantes heurísticas (oxigênio crítico, dimensões de colisor, intervalos de radar e tempos de superfície) em `COMPANION_CONFIG`.

---

### Etapa 2: Interfaces e Type Safety em Colisões (`src/entities/companion/types.ts`, `src/systems/collisions.ts`)

- [x] **2.1 Criar Interfaces Canônicas e Type Guard de Colisão**
  - **Arquivo**: `src/entities/companion/types.ts`.
  - **Ação**: Definir `CompanionState`, `CompanionOptions`, `CompanionWhaleController`, `CompanionCollidable` e type guard `isCompanionCollidable`.
- [x] **2.2 Refatorar Handlers de Colisão para Type Safety Estrita**
  - **Arquivo**: `src/systems/collisions.ts`.
  - **Ação**: Substituir `(companion as unknown as { ... })` pelo type guard `isCompanionCollidable`, validando chamadas estritamente em tempo de compilação.

---

### Etapa 3: PRNG Determinístico & Decomposição Modular da Baleia-Guia (`src/entities/companion/`)

- [x] **3.1 Módulo Sensorial da IA (`src/entities/companion/companionSenses.ts`)**
  - **Arquivo**: `src/entities/companion/companionSenses.ts`.
  - **Ação**: Implementar `CompanionSensesManager` encapsulando radar de krill, evasão de obstáculos e disparo de biosonar com PRNG determinístico.
- [x] **3.2 Módulo de Locomoção & Hidrodinâmica (`src/entities/companion/companionLocomotion.ts`)**
  - **Arquivo**: `src/entities/companion/companionLocomotion.ts`.
  - **Ação**: Implementar `CompanionLocomotionManager` encapsulando arfagem lenta, impulso polar direcional, arrasto exponencial e colisão sólida de gelo.
- [x] **3.3 Módulo de Estados & FSM (`src/entities/companion/companionStates.ts`)**
  - **Arquivo**: `src/entities/companion/companionStates.ts`.
  - **Ação**: Implementar `CompanionStateManager` com ciclo biológico de oxigênio, borrifo de vapor determinístico e transições de estado pedagógicas.
- [x] **3.4 Fachada Consolidada e Orquestração (`src/entities/companion/index.ts`, `src/entities/companionWhale.ts`)**
  - **Arquivo**: `src/entities/companion/index.ts`, `src/entities/companionWhale.ts`.
  - **Ação**: Reexportar `createCompanionWhale` integrando os submódulos decompostos com suporte a injeção de semente determinística.

---

### Etapa 4: Orquestrador Central com Fases Prioritárias (`src/systems/systemRunner.ts`)

- [x] **4.1 Criar Despachante `SystemRunner` com Fases Determinísticas**
  - **Arquivo**: `src/systems/systemRunner.ts`.
  - **Ação**: Implementar classe pura `SystemRunner` com fases canônicas ordenadas (`input` -> `physics` -> `ai` -> `collision` -> `culling` -> `render`) e despacho prioritário.
- [x] **4.2 Integrar `SystemRunner` na Cena Principal**
  - **Arquivo**: `src/scenes/gameScene.ts`.
  - **Ação**: Registrar subsistemas da cena no `SystemRunner`, garantindo ordem determinística de execução a cada frame.

---

### Etapa 5: Suíte de Testes Automatizados TDD

- [x] **5.1 Testes Unitários de Determinismo e Decomposição da IA**
  - **Arquivo**: `tests/entities/companionWhale.test.ts` e novos testes em `tests/entities/companion/`.
  - **Ação**: Validar que sementes idênticas produzem trajetórias, intervalos de sonar e tempos de planeio 100% idênticos.
- [x] **5.2 Testes Unitários do Orquestrador `SystemRunner`**
  - **Arquivo**: `tests/systems/systemRunner.test.ts`.
  - **Ação**: Testar despacho estrito de fases, prioridades numéricas dentro da mesma fase, registro/cancelamento e resiliência a erros.

---

### Etapa 6: Validação, Verificação de Tipos e Documentação

- [x] **6.1 Executar Checagem de Tipos e Suíte Completa de Testes**
  - **Ação**: Rodar `npx tsc --noEmit` e `npm test -- --run`.
- [x] **6.2 Sincronizar ROADMAP.md, CHANGELOG.md e ARCHITECTURE.md**
  - **Arquivo**: `docs/ROADMAP.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`.
  - **Ação**: Registrar os novos módulos arquiteturais e marcar a Fase 58.
