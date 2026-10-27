# Plano de Implementação — Fase 60: Baleia Co-Migrante Autônoma & Ciclo de Vida Contínuo

Status: Concluído ✅  
Data: 2026-10-27  
Alvo: v1.25.0 (Baleia Co-Migrante Autônoma com Fôlego Aberto, Desvio de Perigos, Desmaio e Chegada em Abrolhos)

---

## 🔬 Diagnóstico e Escopo da Fase 60

1. **Problemas Identificados**:
   - **Despawn Prematuro / Parada Estacionária em 3.150m**: Atualmente, a Baleia-Guia foi projetada exclusivamente como tutora do bioma Antártico (`initialX < 3200`, `FAREWELL_TARGET_X: 3150`). Ao término do tutorial, ela transiciona para `RESTING` e para no leito marinho polar, sendo deixada para trás ou despawnada.
   - **Ausência de Ciclo de Vida Contínuo na Rota de 30.000m**: No Modo Sereno (e no Modo Padrão quando habilitada), o jogador nada por todos os 5 biomas até Abrolhos, mas perde a companheira ao sair da Antártica.
   - **Restrição de Respiração Exclusiva ao Gelo**: `SeekBreathState` checa unicamente `isPositionInIceGap(companion.pos.x)`. Fora da Antártica (após 3.200m), não há banquisa de gelo polar; a baleia precisa reconhecer a lâmina d'água de mar aberto (`SEA_LEVEL`) para respirar.
   - **Imunidade a Perigos e Falta de Mortalidade**: A baleia-guia não desvia ativamente de redes de pesca fantasma (`TAGS.NET`), embarcações industriais (`TAGS.SHIP`), traineiras (`TAGS.BOAT`), lixo plástico (`TAGS.TRASH`) e relevo abissal. Além disso, se o oxigênio cair a zero, ela não sofre consequências biológicas de anóxia (como o desmaio `fainting` do jogador).

2. **Decisões Técnicas**:
   - **Transição Fluida: Tutora ➔ Co-Migrante Autônoma (`INDEPENDENT_CRUISE`)**:
     - Ao atingir ~3.150m (fim do aprendizado de fôlego, alimentação e sonar), o tutorial é concluído e salvo no storage, mas a baleia NÃO para nem despawna. Ela entra no estado `INDEPENDENT_CRUISE`.
     - Nesse estado, ela tem objetivo idêntico ao do jogador: percorrer a rota migratória completa até Abrolhos (`GAME_CONFIG.ROUTE_TOTAL_DISTANCE`: 30.000m).
   - **Ciclo Pulmonar Universal & Mar Aberto**:
     - Na Antártica (`x < 3200`): busca fendas no gelo com `isPositionInIceGap`.
     - Nos demais biomas (`x >= 3200`): sobe suavemente para a superfície aberta (`companion.pos.y <= GAME_CONFIG.SEA_LEVEL`), expira vapor duplo determinístico e recarrega 100% do oxigênio.
     - Coleta contínua de cardumes de krill e plâncton usando o `SpatialHashGrid` para sustentar energia de nado.
   - **Sensoriamento Perceptivo & Desvio Proativo de Ameaças (`AVOID_OBSTACLE`)**:
     - Expansão de `companionSenses.ts` com varredura cônica à frente (`HAZARD_AVOID_RANGE: 320px`) via `SpatialHashGrid` para redes, barcos, cargueiros e obstáculos.
     - Ao detectar uma ameaça em rota de colisão, transiciona para `AVOID_OBSTACLE`, aplicando manobra evasiva calculada (mergulho profundo para evitar barcos/redes de superfície ou ascensão para contornar relevos rochosos).
   - **Mortalidade e Consequência Serena (`FAINTED` & `TRAPPED`)**:
     - Se colidir diretamente com uma rede de pesca fantasma (`TAGS.NET`), entra em `TRAPPED`, desacelerando bruscamente e perdendo oxigênio em ritmo dobrado até conseguir se desvencilhar (ou com apoio de sonar).
     - Se o oxigênio pulmonar atingir 0 (`currentOxygen <= 0`), ela entra em `FAINTED` (anóxia/desmaio biológico sereno, idêntico ao estado do jogador): cessa propulsão motora, emite canto fúnebre/melancólico e afunda suavemente até repousar no leito marinho, registrando seu sacrifício ou exaustão na migração.
   - **Clímax Compartilhado em Abrolhos (`VICTORY_BREACH`)**:
     - Caso chegue aos 30.000m viva ao lado do jogador, transiciona para `VICTORY_BREACH`, executando o Salto Majestoso sincronizado na celebração final.
   - **Pacing Migratório Orgânico & Culling Sem Despawn**:
     - Ritmo de nado autônomo equilibrado (`MIGRATION_PACE`), mantendo proximidade natural quando o jogador está perto, sem prender o jogador nem teleportar repentinamente.
     - Culling espacial adaptado para a companheira: preserva a simulação de deslocamento contínuo mesmo quando ligeiramente fora do frustum da câmera.

3. **Arquitetura & Restrições**:
   - Respeito estrito a `ai.rules`: funções puras, TypeScript estrito, zero any, sem regressões nos 78 arquivos e 598 testes existentes.
   - Nomes descritivos em inglês no código e documentação em PT-BR.
   - Cobertura de testes unitários TDD abrangente cobrindo todos os novos estados e comportamentos.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Configurações & Contratos de Estado da Co-Migração

- [x] **1.1 Expandir `COMPANION_CONFIG` em `src/config.ts`**
  - **Arquivo**: `src/config.ts`.
  - **Ação**: Adicionar constantes de co-migração de longo curso: `INDEPENDENT_SPEED: 190`, `HAZARD_AVOID_RANGE: 320`, `HAZARD_VERTICAL_CLEARANCE: 75`, `TRAPPED_OXYGEN_DRAIN_MULTIPLIER: 2.2`, `NET_ESCAPE_DURATION: 3.5`.
- [x] **1.2 Expandir União de Estados e Contratos em `src/entities/companion/types.ts`**
  - **Arquivo**: `src/entities/companion/types.ts`.
  - **Ação**: Expandir `CompanionState` com `"INDEPENDENT_CRUISE" | "AVOID_OBSTACLE" | "TRAPPED" | "FAINTED" | "VICTORY_BREACH"`. Adicionar `handleNetCollision` e `isFainted` na interface `CompanionCollidable` e `CompanionWhaleController`.

---

### Etapa 2: Respiração em Mar Aberto & Conclusão do Tutorial sem Despawn

- [x] **2.1 Adaptar Busca de Fôlego para Todos os Biomas em `concreteStates.ts`**
  - **Arquivo**: `src/entities/companion/states/concreteStates.ts`.
  - **Ação**: Em `SeekBreathState`, validar se a posição x está na Antártica (`x < 3200`) usando `isPositionInIceGap`, ou em mar aberto (`x >= 3200`), onde qualquer coordenada de superfície (`y <= SEA_LEVEL + 4`) permite subir e transicionar para `SURFACE_BREATHE`.
- [x] **2.2 Atualizar Transição de Conclusão do Tutorial em `companionStates.ts`**
  - **Arquivo**: `src/entities/companion/companionStates.ts`.
  - **Ação**: Ao ultrapassar ~3.150m, marcar o tutorial como visto (`markCompanionTutorialSeen`), mas em vez de ir para `RESTING`, transicionar para `INDEPENDENT_CRUISE` (ou manter `RESTING` apenas se o tutorial tiver sido explicitamente desativado pelo jogador).

---

### Etapa 3: Sensoriamento Cônico e Evasão de Perigos

- [x] **3.1 Implementar Detecção de Ameaças no Radar em `companionSenses.ts`**
  - **Arquivo**: `src/entities/companion/companionSenses.ts`.
  - **Ação**: Adicionar método `detectAheadHazards` usando o `SpatialHashGrid` para varrer um cone de 320px à frente buscando entidades com tags `TAGS.NET`, `TAGS.SHIP`, `TAGS.BOAT` e `TAGS.OBSTACLE`.
- [x] **3.2 Criar Nós Concretos `IndependentCruiseState` e `AvoidObstacleState`**
  - **Arquivo**: `src/entities/companion/states/concreteStates.ts`.
  - **Ação**:
    - `IndependentCruiseState`: navegação fluida em direção a 30.000m, oscilação oceânica natural, checagem contínua de oxigênio e escaneamento de perigos.
    - `AvoidObstacleState`: manobra evasiva angular calculada para desviar de redes e embarcações (arremetida para baixo ou subida).
- [x] **3.3 Registrar Colisão com Redes em `src/systems/collisions.ts` e Nó `TrappedState`**
  - **Arquivo**: `src/systems/collisions.ts`, `src/entities/companion/states/concreteStates.ts`.
  - **Ação**: Registrar colisão `companion_whale` com `TAGS.NET`, acionando `TrappedState` com perda acelerada de oxigênio e desaceleração.

---

### Etapa 4: Estados de Mortalidade e Vitória Compartilhada

- [x] **4.1 Implementar Nó `FaintedState` (Mortalidade Serena por Anóxia)**
  - **Arquivo**: `src/entities/companion/states/concreteStates.ts`.
  - **Ação**: Quando `currentOxygen <= 0`, transicionar para `FAINTED`. Bloquear controles de propulsão ativa, reproduzir animação de desmaio/repouso, descer suavemente via afundamento brando e emitir som melancólico de canto de baleia.
- [x] **4.2 Implementar Nó `VictoryBreachState` nos 30.000m**
  - **Arquivo**: `src/entities/companion/states/concreteStates.ts`.
  - **Ação**: Ao ultrapassar `ROUTE_TOTAL_DISTANCE - 400`, transicionar para `VICTORY_BREACH`, acelerando para cima e executando o salto majestoso em sincronia com o jogador.
- [x] **4.3 Ajustar Cinemática Hidrodinâmica em `companionLocomotion.ts`**
  - **Arquivo**: `src/entities/companion/companionLocomotion.ts`.
  - **Ação**: Suportar empuxo e arrasto de cruzeiro autônomo de longo curso, frenagem em `TRAPPED`, afundamento passivo em `FAINTED` e propulsão de salto em `VICTORY_BREACH`.

---

### Etapa 5: Integração na Cena Principal e Culling Frustum

- [x] **5.1 Estender Ciclo de Vida da Baleia-Guia em `src/scenes/gameScene.ts`**
  - **Arquivo**: `src/scenes/gameScene.ts`.
  - **Ação**: Remover o teto de spawn `initialX < 3200` para modos que suportam co-migração contínua (`serene` e `standard`), mantendo a baleia ativa por toda a migração.
- [x] **5.2 Proteção Contra Despawn por Culling Espacial**
  - **Arquivo**: `src/systems/spatialCullingSystem.ts`, `src/entities/companion/index.ts`.
  - **Ação**: Garantir que a Baleia-Guia não seja descartada ou permanentemente congelada quando o jogador se distanciar; manter atualização cinemática simplificada fora do frustum.

---

### Etapa 6: Suíte de Testes Automatizados TDD

- [x] **6.1 Criar Suíte `tests/entities/companion/coMigration.test.ts`**
  - **Arquivo**: `tests/entities/companion/coMigration.test.ts`.
  - **Ação**:
    - Testar transição de tutorial para `INDEPENDENT_CRUISE` sem interrupção de nado.
    - Testar respiração em mar aberto pós-Antártica (`x > 3200`).
    - Testar detecção e evasão de perigos (`AVOID_OBSTACLE`).
    - Testar aprisionamento em redes (`TRAPPED`) e aumento de consumo de oxigênio.
    - Testar esgotamento de oxigênio e entrada em `FAINTED`.
    - Testar chegada aos 30.000m e acionamento de `VICTORY_BREACH`.
- [x] **6.2 Atualizar Testes Existentes da FSM e da Baleia-Guia**
  - **Arquivo**: `tests/entities/companion/stateMachine.test.ts`, `tests/entities/companionWhale.test.ts`.
  - **Ação**: Assegurar 100% de retrocompatibilidade com os testes existentes de repouso e tutorial.

---

### Etapa 7: Validação de Tipos, Execução de Testes e Documentação

- [x] **7.1 Validação de Tipos e Suíte Completa**
  - **Ação**: Executar `npx tsc --noEmit` e `npm test -- --run`.
- [x] **7.2 Sincronizar Documentação Técnica**
  - **Arquivo**: `docs/ROADMAP.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`.
  - **Ação**: Registrar a Fase 60 e os novos estados da Baleia Co-Migrante.
