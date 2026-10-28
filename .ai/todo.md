# Plano de Implementação — Fase 61: Desacoplamento da Dependência do Jogador & Co-Migração 100% Autônoma (Organic Ocean Pod)

Status: Concluído ✅  
Data: 2026-10-28  
Alvo: v1.26.0 (Baleia Co-Migrante com Autonomia Plena, Nado Desatrelado, Partida Espontânea e Forrageamento Competitivo)

---

## 🔬 Diagnóstico e Escopo da Fase 61

1. **Problemas Identificados**:
   - **Rubber-Banding Artificial Compulsório**: Em `companionLocomotion.ts`, a cadência de remada é artificialmente forçada para baixo (35%) ou para cima (145%) baseando-se estritamente na distância relativa `distanceAhead = companion.pos.x - playerX`. Isso cria a sensação de um "elástico invisível" prendendo a baleia ao jogador.
   - **Freio por Inércia do Jogador**: Em `companionLocomotion.ts`, se o jogador para de nadar ou desacelera (`playerSpeed < 20`), a baleia-guia freia drasticamente suas remadas para 25%, mesmo que esteja no oceano aberto precisando respirar ou migrar.
   - **Partida Subordinada ao Jogador**: Em `IntroState`, a baleia fica congelada na largada esperando passivamente que o jogador nade além de `playerX > 40`, em vez de iniciar sua própria jornada biológica.
   - **Cedência Não-Natural de Alimento**: Em `companionSenses.ts`, a baleia detecta se o jogador está a menos de 50px de um cardume de krill e renuncia à alimentação (`playerDistToKrill > 50`). No mar aberto, isso prejudica sua sobrevivência biológica por anóxia.
   - **Progressão do Ciclo de Vida Vinculada à Posição do Jogador**: A transição da Antártica para o mar aberto checa `playerX >= FAREWELL_TARGET_X - 180`, em vez de respeitar a posição e o progresso da própria baleia (`companion.pos.x`).
   - **Acoplamento Estrutural Rígido no Construtor**: `createCompanionWhale` exige `PlayerController` obrigatório, impedindo que a baleia funcione como agente oceânico independente sem depender da existência do jogador.

2. **Decisões Técnicas & Design Arquitetural**:
   - **Dois Modos Coexistentes (Configuráveis)**:
     - `guided` (Modo Tutorial / Antártica inicial padrão): Mantém a assistência mútua e o acompanhamento próximo para jogadores iniciantes aprenderem fôlego, nado e sonar.
     - `autonomous` (Modo Sereno / Co-migração pós-tutorial): Desacoplamento integral. A baleia não espera o jogador, não freia se o jogador parar, nada na velocidade constante de cruzeiro de sua espécie (`INDEPENDENT_SPEED: 190`), parte de forma espontânea e compete naturalmente por krill.
   - **Referência Fraca ao Jogador (_Optional Weak Observer_)**:
     - Tornar `playerController` opcional na interface de criação e nos submódulos (`companionSenses.ts`, `companionLocomotion.ts`). Quando ausente ou quando em modo autônomo, a IA toma decisões 100% baseadas no ambiente (topografia, banquisa, lâmina d'água, cardumes e perigos via `SpatialHashGrid`).
   - **Co-Navegação Orgânica de Bando (_Pod Flocking Harmônico_)**:
     - Quando ambos estiverem próximos (alcance de ~150-300px), a baleia emite cantos ocasionais de reconhecimento e navega em harmonia, mas sem prender sua velocidade ou frear se o jogador parar.
     - Ultrapassagens e cruzamentos naturais: o jogador pode ultrapassá-la ao usar correntes/impulsos velozes ou reencontrá-la quilômetros à frente respirando na superfície.
   - **Partida Espontânea por Timer de Aclimatação**:
     - Em modo autônomo, a baleia se aclimata por 1.5s no ponto de partida e inicia o nado migratório por conta própria, sem requerer comando ou movimento do jogador.
   - **Forrageamento Competitivo Livre**:
     - Em modo autônomo, a baleia consome qualquer cardume em sua rota para recarregar oxigênio e manter sua sobrevivência rumo a Abrolhos.

3. **Arquitetura & Restrições**:
   - Respeito integral a `ai.rules`: funções puras, TypeScript estrito, zero `any`, sem regressões nos 78 arquivos e 598 testes existentes.
   - Preservação de 100% de compatibilidade com os testes do modo tutorial original (`tests/entities/companionWhale.test.ts`).
   - Nomes descritivos em inglês no código e documentação técnica em PT-BR.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Configurações & Tipagem de Autonomia Plena

- [x] **1.1 Expandir `COMPANION_CONFIG` em `src/config.ts`**
  - **Arquivo**: `src/config.ts`.
  - **Ação**: Adicionar parâmetros de desacoplamento: `AUTONOMOUS_STROKE_PACING: 1.0`, `AUTONOMOUS_INTRO_DELAY: 1.5`, `POD_HARMONY_DISTANCE: 250`, permitindo controle refinado de independência.
- [x] **1.2 Atualizar Contratos e Opções em `src/entities/companion/types.ts`**
  - **Arquivo**: `src/entities/companion/types.ts`.
  - **Ação**: Adicionar `autonomyMode?: "guided" | "autonomous"` a `CompanionOptions`. Tornar referências ao jogador opcionais nos contratos de atualização.

---

### Etapa 2: Desacoplamento da Locomoção e Cinemática

- [x] **2.1 Eliminar Rubber-Banding Compulsório em `companionLocomotion.ts`**
  - **Arquivo**: `src/entities/companion/companionLocomotion.ts`.
  - **Ação**: Quando `options.autonomyMode === "autonomous"` ou nos estados de co-migração, suprimir ajustes artificiais de cadência (`strokePacingBoost`) baseados em `distanceAhead` e `playerSpeed < 20`, mantendo cadência hidrodinâmica autônoma contínua.
- [x] **2.2 Desacoplar Assinatura de `update` em `companionLocomotion.ts`**
  - **Arquivo**: `src/entities/companion/companionLocomotion.ts`.
  - **Ação**: Tornar `playerX` e `playerSpeed` parâmetros opcionais (`playerX?: number, playerSpeed?: number`), operando com velocidade intrínseca autônoma quando não informados.

---

### Etapa 3: Desacoplamento Sensorial e Forrageamento Livre

- [x] **3.1 Habilitar Forrageamento Competitivo em `companionSenses.ts`**
  - **Arquivo**: `src/entities/companion/companionSenses.ts`.
  - **Ação**: Em modo autônomo, remover a restrição `playerDistToKrill > 50`, permitindo que a baleia co-migrante mire e consuma qualquer cardume de krill à frente para manter seu suprimento vital de oxigênio.
- [x] **3.2 Tornar `playerX` Opcional no Loop Sensorial**
  - **Arquivo**: `src/entities/companion/companionSenses.ts`.
  - **Ação**: Ajustar `companionSenses.update` para operar perfeitamente sem exigir coordenada do jogador.

---

### Etapa 4: Desacoplamento dos Estados FSM & Partida Espontânea

- [x] **4.1 Partida Espontânea em `IntroState` (`concreteStates.ts`)**
  - **Arquivo**: `src/entities/companion/states/concreteStates.ts`.
  - **Ação**: Em modo autônomo, transicionar de `INTRO` para `CRUISE` / `INDEPENDENT_CRUISE` quando `stateTimer >= COMPANION_CONFIG.AUTONOMOUS_INTRO_DELAY` (1.5s), dispensando a espera por `playerX > 40`.
- [x] **4.2 Transição Baseada na Própria Posição em `companionStates.ts`**
  - **Arquivo**: `src/entities/companion/companionStates.ts`.
  - **Ação**: Validar a conclusão da etapa antártica usando a posição da própria baleia (`companion.pos.x >= FAREWELL_TARGET_X - 180`) em vez de subordiná-la a `playerX`.

---

### Etapa 5: Orquestração Desacoplada da Entidade

- [x] **5.1 Tornar `PlayerController` Opcional em `createCompanionWhale` (`index.ts`)**
  - **Arquivo**: `src/entities/companion/index.ts`, `src/entities/companionWhale.ts`.
  - **Ação**: Aceitar `playerController?: PlayerController | null`, permitindo que a baleia seja instanciada como entidade de vida marinha 100% autônoma no mundo.
- [x] **5.2 Configuração da Co-Migração Serena em `src/scenes/gameScene.ts`**
  - **Arquivo**: `src/scenes/gameScene.ts`.
  - **Ação**: Configurar `autonomyMode: "autonomous"` no Modo Sereno (`options.mode === "serene"`), concedendo independência imediata ao co-migrante.

---

### Etapa 6: Suíte de Testes Automatizados TDD

- [x] **6.1 Criar Suíte de Testes de Autonomia em `tests/entities/companion/autonomousPod.test.ts`**
  - **Arquivo**: `tests/entities/companion/autonomousPod.test.ts`.
  - **Ação**: Cobrir:
    - Partida espontânea da baleia sem movimento do jogador (`stateTimer >= 1.5s`);
    - Nado com cadência constante (100%) mesmo quando o jogador para completamente (`playerSpeed = 0`);
    - Continuidade da migração quando o jogador fica a centenas de metros para trás;
    - Forrageamento livre de krill próximo ao jogador em modo autônomo;
    - Funcionamento do ciclo de vida sem `playerController` injetado;
    - Preservação da fidelidade do modo tutorial guiado em `autonomyMode: "guided"`.
- [x] **6.2 Validar Retrocompatibilidade dos Testes Existentes**
  - **Arquivo**: `tests/entities/companionWhale.test.ts`, `tests/entities/companion/coMigration.test.ts`.
  - **Ação**: Garantir 100% de aprovação de todos os testes anteriores.

---

### Etapa 7: Validação de Tipos, Execução de Testes e Documentação

- [x] **7.1 Validação de Tipos e Suíte Completa**
  - **Ação**: Executar `npx tsc --noEmit` e `npm test -- --run`.
- [x] **7.2 Sincronizar Documentação Técnica**
  - **Arquivo**: `docs/ROADMAP.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`.
  - **Ação**: Adicionar a Fase 61 no roadmap, documentar a arquitetura desatrelada de co-migração e atualizar o changelog para a versão v1.26.0.

---

## 📅 Backlog / Fase Planejada no Roadmap

### Fase 62: Ajuste de Interface & Ocultação do Desafio Semanal (Em Desenvolvimento)

- [ ] **62.1 Remover Botão de Desafio Semanal da Interface (`src/ui/modeSelectScreen.ts`)**:
  - Remover/ocultar card de seleção do Desafio Semanal e reorganizar a grade dos modos ativos (Migração Normal, Serena e Rápida).
- [x] **62.2 Deixar na Documentação o Desafio Semanal como "Em Desenvolvimento"**:
  - Atualizado em `docs/ROADMAP.md`, `docs/GDD.md`, `docs/ARCHITECTURE.md` e `README.md`.

### Fase 63: Ocultação da Narração por Voz & Recurso em Desenvolvimento

- [ ] **63.1 Remover Botão de Narração por Voz da Interface de Acessibilidade (`src/ui/options/accessibilityOptionsTab.ts`)**:
  - Remover/ocultar o botão de alternância de Narração em Voz (TTS) e reorganizar os controles verticais da aba.
- [x] **63.2 Atualizar a Documentação para Sinalizar a Narração por Voz como "Em Desenvolvimento"**:
  - Atualizado em `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/PRIVACIDADE.md` e `README.md`.
