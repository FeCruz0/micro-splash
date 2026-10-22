# Plano de Implementação — Fase 56: Tutorial Intuitivo & Mimético — Baleia-Guia NPC (Mãe-Guia Antártica)

Status: Concluído ✅  
Data: 2026-10-22  
Alvo: v1.21.0 (Tutorial Intuitivo & Naturalista)

---

## 🔬 Diagnóstico e Escopo da Fase 56

1. **Objetivo Pedagógico & Game Design**:
   - Substituir tutoriais textuais estáticos por aprendizado mimético (_cultural transmission_ na etologia de cetáceos).
   - Nos primeiros 3.200 metros da rota antártica (0m – 3.200m), o jogador é acompanhado por uma **Baleia-Guia (Mãe-Guia / Matriarca NPC)** que nada à sua frente com ritmo adaptativo (_rubber-banding_).
   - A Baleia-Guia demonstra ativamente as quatro mecânicas vitais do jogo:
     1. **Propulsão e Ritmo da Cauda (0m – 500m)**: Ritmo de planeio e cadência de batidas.
     2. **Alimentação por Filtração & Krill (500m – 1.200m)**: Consumo visual de krill com animação de boca aberta.
     3. **Identificação de Fendas e Respiração Pulmonar (1.200m – 1.900m)**: Rota até a fenda polar e duplo borrifo de vapor.
     4. **Biosonar Acústico & Evasão de Obstáculos (1.900m – 2.700m)**: Emissão de onda de sonar iluminando o relevo.
     5. **Salto de Despedida & Transição Rumo ao Mar Aberto (2.700m – 3.200m)**: Salto acrobático (_breach_) e mergulho pelágico.

2. **Decisões Alinhadas com o Usuário**:
   - **Identidade Visual**: Sprite `baleia` oficial em escala reduzida (`scale(0.85)`), com tom azul-ardósia escurecido (`color(140, 165, 195)`) para diferenciação nítida em relação ao jogador.
   - **Abordagem Pedagógica**: 100% diegética e naturalista (sem botões ou ícones artificiais flutuantes na tela).
   - **Modos de Ativação**:
     - _Migração Serena_: Ativa por padrão (pode ser desativada nas Opções).
     - _Modo Padrão_: Ativa na primeira partida ou caso ativada nas Opções.
     - _Desafio Semanal / Quick Challenge_: Inativa por padrão.

3. **Arquitetura & Restrições Técnicas**:
   - Zero alocações (`vec2`) por frame no loop cinemático.
   - Entidade cinemática sem colisão sólida de bloqueio (não empurra nem trava o jogador).
   - Partículas via `ParticlePool` consolidado.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Schemas, Configuração e Persistência

- [x] **1.1 Adicionar Schemas de Armazenamento para a Baleia-Guia**
  - **Arquivo**: `src/schemas/storageSchemas.ts`.
  - **Ação**: Criar schemas Zod para persistência do tutorial (`CompanionTutorialSeenSchema` e `CompanionTutorialEnabledSchema`).
- [x] **1.2 Configurações de Trajetória da Baleia-Guia**
  - **Arquivo**: `src/config.ts`.
  - **Ação**: Exportar `COMPANION_CONFIG` com limites de distância, targets de demonstração e velocidade base.
- [x] **1.3 Módulo de Configurações de Tutorial do Companheiro**
  - **Arquivo**: `src/systems/companionTutorialSettings.ts`.
  - **Ação**: Implementar getters/setters seguros com tipagem estrita para habilitar/desabilitar e marcar como visualizado.

---

### Etapa 2: Entidade de IA Autônoma & Mecânicas Espelho (`src/entities/companionWhale.ts`)

- [x] **2.1 Criação da Entidade de IA Autônoma, Colisão e Mecânicas Espelho**
  - **Arquivo**: `src/entities/companionWhale.ts`, `src/systems/collisions.ts`, `src/entities/player/playerSonar.ts`, `src/systems/iceSurface.ts`.
  - **Ação**: Implementar colisor ativo `k.area` proporcional (0.85x), consumo de krill real com recarga de fôlego, sonar 360° revelador de itens, ciclo de oxigênio pulmonar com busca de fendas polares, resolução de colisão de gelo e IA reativa não-repetitiva.
- [x] **2.2 Física Hidrodinâmica Direcional, Colisão Real com Gelo e Repouso Estacionário**
  - **Arquivo**: `src/entities/companionWhale.ts`, `src/systems/proceduralObstacles.ts`.
  - **Ação**: Adicionar `k.body()` para resolução sólida contra blocos de gelo estáticos; implementar giro vertical lento limitando taxa angular; aplicar impulso muscular unicamente na direção virada (sem deslizar de lado); expandir quantidade de cardumes de krill na Antártica (de 12-15 para 20-24) e demais biomas; implementar estado de repouso contemplativo (`RESTING`) no fim do percurso sem destruição da entidade.

---

### Etapa 3: Integração na Cena do Jogo (`src/scenes/gameScene.ts`)

- [x] **3.1 Spawn Condicional e Ciclo de Vida na Cena**
  - **Arquivo**: `src/scenes/gameScene.ts`.
  - **Ação**: Instanciar `createCompanionWhale` na inicialização do bioma Antártico quando aplicável, conectar com culling e registrar teardown limpo.

---

### Etapa 4: Configurações de UI e Acessibilidade (`src/ui/options/controlsOptionsTab.ts`)

- [x] **4.1 Alternador da Baleia-Guia no Menu de Opções**
  - **Arquivo**: `src/ui/options/controlsOptionsTab.ts`.
  - **Ação**: Adicionar botão e controle acessível na linha 6 da coluna de controles/sistema para alternar a Baleia-Guia (Ativa / Desativada).

---

### Etapa 5: Suíte de Testes Automatizados TDD

- [x] **5.1 Testes Unitários da Baleia-Guia e Mecânicas Espelho**
  - **Arquivo**: `tests/entities/companionWhale.test.ts`.
  - **Ação**: Cobrir colisor `k.area`, consumo real de krill, depleção/recarga de oxigênio em fendas polares, varredura acústica com revelação de itens, rubber-banding e teardown.
- [x] **5.2 Testes de Física Hidrodinâmica, Colisão com Gelo e Repouso Estacionário**
  - **Arquivo**: `tests/entities/companionWhale.test.ts`.
  - **Ação**: Validar componente `k.body()`, colisão e amortecimento em gelo, taxa de giro vertical lento, impulso vetorial direcional e permanência em estado `RESTING` sem sumir da cena (18/18 testes aprovados).
  - **Validação**: Executar suíte completa de testes (`npm test -- --run`).

---

### Etapa 6: Documentação e Roadmap

- [x] **6.1 Atualizar `docs/ROADMAP.md` e `.ai/todo.md`**
  - **Arquivo**: `docs/ROADMAP.md` e `.ai/todo.md`.
  - **Ação**: Registrar Fase 56 em status Concluído e validar consistência de documentação.
