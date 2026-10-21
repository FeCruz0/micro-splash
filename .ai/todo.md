# Plano de Implementação — Fase 55: Diário de Bordo da Migração Serena (Educação Ambiental & Narrativa Interativa)

Status: Concluído ✅  
Data: 2026-10-21  
Alvo: v1.20.0 (Modo Educativo Contemplativo)

---

## 🔬 Diagnóstico e Escopo da Fase 55

1. **Objetivo Pedagógico**:
   - A **Migração Serena** (`mode === "serene"`) foi concebida como uma experiência contemplativa, acessível e sem penalidades de morte por oxigênio.
   - Atualmente, ela exibe apenas vinhetas geográficas a cada bioma e fatos estáticos a cada ~2.000m.
   - O objetivo desta fase é transformar o percurso da Migração Serena em uma **verdadeira aula viva sobre a biologia e a ecologia da migração das baleias-jubarte**, disparando caixas informativas e educativas exatamente no momento em que o jogador interage com os elementos do ecossistema marinho.

2. **Gatilhos Educativos Interativos**:
   1. **`krill_feeding` (Alimentação por Filtração)**:
      - _Gatilho_: Primeira deglutição de krill na Antártida.
      - _Conteúdo_: Explica o que é o krill antártico (_Euphausia superba_), como as cerdas de baleen (barbas de queratina) filtram a água e por que as jubartes ingerem até 2 toneladas diárias no verão polar para estocar energia (blubber) para a viagem de 30.000m em jejum.
   2. **`surface_breathing` (Respiração Pulmonar & Espiráculo)**:
      - _Gatilho_: Primeira subida à superfície / recarga de oxigênio.
      - _Conteúdo_: Explica que as baleias são mamíferos pulmonares, respiram ar atmosférico por dois orifícios no topo da cabeça (espiráculos) e renovam até 90% do ar em um único sopro, não bebendo água salgada.
   3. **`tail_propulsion` (Propulsão Hidrodinâmica & Flukes)**:
      - _Gatilho_: Primeira batida de cauda / aceleração ativa no início da migração.
      - _Conteúdo_: Explica a biomecânica da nadadeira caudal (flukes), que se move de cima para baixo com força muscular dorsal para impulsionar 40 toneladas através das correntes com máxima eficiência hidrodinâmica.
   4. **`ice_gap_breathing` (Banquisa & Fendas Polares)**:
      - _Gatilho_: Passagem sob o teto de gelo antártico e encontro de fendas.
      - _Conteúdo_: Explica como as polínias naturais (aberturas na banquisa de gelo) são corredores de sobrevivência vitais para que os cetáceos não fiquem presos sob o mar congelado antes do inverno polar.
   5. **`sonar_communication` (Vocalizações & Canal SOFAR)**:
      - _Gatilho_: Primeiro acionamento do sonar (tecla E / toque).
      - _Conteúdo_: Explica os cantos complexos das baleias-jubarte, que viajam centenas de quilômetros pelas camadas térmicas profundas do oceano (canal SOFAR) para navegação, mapeamento do relevo submarino e comunicação nupcial.
   6. **`dolphin_drafting` (Nado em Esteira / Cooperação Pelágica)**:
      - _Gatilho_: Entrada na esteira hidrodinâmica de golfinhos.
      - _Conteúdo_: Explica o fenômeno físico de _drafting_, onde cetáceos aproveitam o vácuo de pressão criado pelo líder para economizar até 40% de energia em travessias oceânicas de milhares de quilômetros.
   7. **`ocean_trash_threat` (Ameaça dos Plásticos & Microplásticos)**:
      - _Gatilho_: Primeiro contato com lixo plástico na Costa Urbana.
      - _Conteúdo_: Explica o impacto do descarte de resíduos humanos nos oceanos, onde sacolas e embalagens se fragmentam em microplásticos ou causam asfixia e bloqueio gástrico na fauna marinha.
   8. **`ghost_net_entanglement` (Perigo das Redes Fantasmas)**:
      - _Gatilho_: Primeiro contato com rede de pesca abandonada.
      - _Conteúdo_: Explica o problema do emalhe acidental e da pesca fantasma, alertando que redes sintéticas perdidas continuam aprisionando animais marinhos por décadas sem decomposição.
   9. **`upwelling_currents` (Ressurgência de Cabo Frio & ACAS)**:
      - _Gatilho_: Entrada no jato de ressurgência nos cânions.
      - _Conteúdo_: Explica como os ventos empurram as águas superficiais quentes, permitindo que a Corrente Central do Atlântico Sul (ACAS), rica em nutrientes minerais e fitoplâncton, suba pelos cânions submarinos como um motor ecológico fértil.
   10. **`nursery_sanctuary` (O Berçário de Arraial do Cabo & Reprodução)**:
       - _Gatilho_: Aproximação dos últimos 3.000m (Santuário de Arraial).
       - _Conteúdo_: Explica a razão da migração: as jubartes deixam a Antártida gélida para encontrar águas rasas, calmas e mornas no Brasil, perfeitas para o parto, amamentação do filhote (que consome até 100 litros de leite com 50% de gordura por dia) e rituais de cortejo.

3. **Arquitetura & Engenharia de UX**:
   - **Módulo Dedicado**: `src/systems/sereneMigrationInsights.ts`.
   - **Fila Anti-Sobreposição (Non-Overlapping Queue)**: Se um insight for disparado enquanto outro estiver na tela, ele aguarda ou respeita um intervalo mínimo de respiração (~2s entre mensagens).
   - **Disparo Único (Single-Fire)**: Cada insight é acionado no máximo 1 vez por partida através de um `Set<string>`.
   - **Componente Visual**:
     - Posicionamento no canto superior ou inferior da tela, sem colidir com o HUD principal de distância e fôlego.
     - Painel glassmorphism náutico com cantos arredondados, borda luminescente suave, ícone temático, título destacado e texto claro em PT-BR.
     - Suporte à síntese de voz (TTS via `ttsSystem`) e acessibilidade de movimento reduzido (`accessibilitySystem`).
   - **Isolamento de Modo**: Ativado **exclusivamente quando `mode === "serene"`**.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Estrutura de Dados & Conteúdo Pedagógico (`src/systems/sereneMigrationInsights.ts`)

- [x] **1.1 Definir Tipos, Interfaces e Banco de Dados de Insights**
  - **Arquivo**: `src/systems/sereneMigrationInsights.ts`.
  - **Ação**: Criar interface `SereneInsight` e o array imutável de insights contendo os 10 eventos pedagógicos (krill, respiração, cauda, fendas, sonar, drafting, lixo, redes, ressurgência e berçário).
  - **Validação**: Verificação de tipos estritos TypeScript e consistência textual pedagógica.

- [x] **1.2 Implementar o Gerenciador de Fila e Apresentação Visual**
  - **Arquivo**: `src/systems/sereneMigrationInsights.ts`.
  - **Ação**: Implementar classe `SereneInsightsManager` com controle de fila, temporização de permanência (5.5s), transições suaves de fade/slide e integração com TTS.
  - **Validação**: Testes unitários de transição de estado da fila e descarte de nós no Kaboom.

---

### Etapa 2: Integração com Gatilhos de Gameplay (`src/scenes/gameScene.ts` & `src/systems/collisions.ts`)

- [x] **2.1 Conectar Gatilhos de Colisão no Modo Sereno**
  - **Arquivo**: `src/systems/collisions.ts`.
  - **Ação**: No callback de colisão de krill (`TAGS.KRILL`), lixo (`TAGS.TRASH`) e redes (`TAGS.NET`), notificar o despachante de insights caso o modo sereno esteja ativo.
  - **Validação**: Teste unitário de disparo sob colisão.

- [x] **2.2 Conectar Gatilhos de Respiração, Sonar, Esteira e Ressurgência**
  - **Arquivo**: `src/scenes/gameScene.ts`.
  - **Ação**: Inicializar `setupSereneInsightsSystem` exclusivamente quando `options.mode === "serene"` e interligar os listeners de respiração (`playerOxygen`), esteira de golfinhos, fendas de gelo e aproximação do berçário.
  - **Validação**: Verificação de que em modos `standard` e `quick_challenge` nenhuma instância visual é alocada.

---

### Etapa 3: Suíte de Testes Automatizados TDD (`tests/systems/sereneMigrationInsights.test.ts`)

- [x] **3.1 Criar Testes Unitários de Gatilhos e Fila**
  - **Arquivo**: `tests/systems/sereneMigrationInsights.test.ts`.
  - **Ação**: Cobertura completa para:
    - Integridade dos 10 insights pedagógicos (título, texto explicativo substantivo, categoria).
    - Disparo único por ID (mesmo evento chamado 10 vezes só exibe 1 vez).
    - Não-sobreposição na fila (dois eventos simultâneos são sequenciados respeitando o delay).
    - Respeito ao modo de jogo (inativo quando não for `serene`).
  - **Validação**: Execução via Vitest (`tests/systems/sereneMigrationInsights.test.ts`).

---

### Etapa 4: Documentação e Roadmap

- [x] **4.1 Registrar Fase 55 em `docs/ROADMAP.md` e Atualizar `.ai/todo.md`**
  - **Arquivo**: `docs/ROADMAP.md` e `.ai/todo.md`.
  - **Ação**: Adicionar documentação formal da Fase 55 e sincronizar com a suíte de consistência documental (`tests/core/phase52_documentation_consistency.test.ts`).
  - **Validação**: Execução da suíte completa de 72 arquivos de teste com 100% de sucesso.
