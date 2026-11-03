# DECISION LOG — Architecture Decision Records (ADR)

## Projeto: Micro Splash — Migração Kaboom.js → PixiJS v8

Este documento registra formalmente as decisões arquiteturais fundamentais adotadas para a migração da camada de apresentação do jogo, garantindo governança técnica, zero deriva de tipagem (_type drift_) e ausência de regressões na suíte de testes.

---

### ADR 001: Adoção do Padrão Adapter (`RenderEngineAdapter`) para Desacoplamento Gráfico

- **Status:** Aprovado e Vigente ✅
- **Data:** 2026-10-29
- **Contexto:**
  O projeto possui 109 arquivos TypeScript acoplados diretamente ao runtime do `kaboom` (`KaboomCtx`, `GameObj`). A substituição direta e indiscriminada do Kaboom por chamadas nativas do PixiJS v8 (`Container`, `Sprite`, `Graphics`) geraria um novo acoplamento proprietário de 64%, tornando futuras atualizações de engine onerosas e provocando regressões em cascata durante a migração.
- **Decisão:**
  Implementar uma camada de abstração com o padrão Adapter baseado estritamente nas interfaces declaradas em [`src/engine/contracts/INTERFACE_CONTRACTS.ts`](src/engine/contracts/INTERFACE_CONTRACTS.ts). As entidades de jogo (player, companion, obstáculos, cardumes de krill, biomas) interagirão exclusivamente com `IRenderEngine`, `IRenderNode`, `ISpriteNode`, `IGraphicsNode` e `ITextNode`.
- **Consequências:**
  - **Positivas:** Acoplamento à biblioteca gráfica externa reduzido de 64% para próximo de 0%. Apenas a pasta `src/engine/adapters/` conhecerá as APIs internas do PixiJS v8. Mocking e testes unitários tornam-se triviais sem dependência de WebGL/WebGPU em headless CI.
  - **Negativas:** Requer uma camada adicional de indirection e wrappers leves em torno dos objetos gráficos do PixiJS.

---

### ADR 002: Abordagem de Interface: Canvas PixiJS vs. DOM / HTML Overlay Híbrido

- **Status:** Aprovado e Vigente ✅
- **Data:** 2026-10-29
- **Contexto:**
  No Kaboom, botões e textos de modais eram desenhados diretamente no canvas com `k.text()`, `k.rect()` e coordenadas manuais. Essa abordagem resulta em:
  1. Dificuldade severa de conformidade estrita com leitores de tela e acessibilidade WCAG 2.1 AA (ausência de nós semânticos no DOM para navegação assistiva).
  2. Borrões e perda de nitidez tipográfica em telas Retina/HiDPI e resoluções dinâmicas de totens.
  3. Reimplementação manual de focus rings, inputs de texto e rolagem.
- **Decisão:**
  Adotar uma **arquitetura híbrida**:
  - **Canvas (PixiJS v8):** HUD dinâmico in-game de alto framerate (oxigênio, velocímetro hidrodinâmico, radar de sonar, indicadores de biomassa e vinhetas cinematográficas de bioma).
  - **DOM / HTML Overlay Semântico:** Telas estáticas, modais de leitura longa, opções de acessibilidade, quiz pedagógico, formulário de iniciais e quadros de recordes (`modalShell.ts`, `tabBar.ts`, `cardButton.ts`), renderizados em contêiner flexível/grid HTML5 sobreposto ao canvas, estilizados com Vanilla CSS e tokens centralizados de `theme.ts`.
- **Consequências:**
  - **Positivas:** 100% de nitidez tipográfica nativa do navegador; acessibilidade imediata com leitores de tela; simplificação drástica do código de modais; redução do tamanho do bundle gráfico.
  - **Negativas:** Necessidade de gerenciar a visibilidade e o pointer-events da camada overlay em sincronia com o estado das cenas do jogo.

---

### ADR 003: Desacoplamento entre Loop de Física/Regras e o Ticker de Renderização

- **Status:** Aprovado e Vigente ✅
- **Data:** 2026-10-29
- **Contexto:**
  O Kaboom atrelava o ciclo de vida dos objetos e sua detecção de colisões (`k.area()`, `k.onCollide()`) ao render loop do canvas. O projeto já dispõe de um particionador espacial em grade (`SpatialHashGrid.ts`) e 80 suítes de testes que validam física e regras de negócio de forma determinística sem qualquer engine visual.
- **Decisão:**
  Manter o loop de física, colisão e lógica de navegação estritamente desacoplado da taxa de quadros de renderização:
  1. A física hidrodinâmica e o cálculo de colisões operam sobre coordenadas e AABBs matemáticos agnósticos (`SpatialAABB`) no `SpatialHashGrid`.
  2. O ticker da engine gráfica (`IRenderTicker` / `app.ticker`) atua apenas como consumidor das posições resolvidas pela simulação física.
  3. Aplicação do teto de segurança temporal `MAX_DELTA_TIME = 0.1` (100ms) para blindar contra tunneling físico e picos de Garbage Collector.
- **Consequências:**
  - **Positivas:** Preservação integral dos 642 testes unitários ativos; física 100% reproduzível; suporte nativo a monitores de altas taxas de atualização (120Hz/144Hz) e displays de 60Hz sem divergência de velocidade do nado da baleia.
  - **Negativas:** Exige sincronização explícita de `node.setPosition(entity.pos.x, entity.pos.y)` a cada tick visual.

---

### ADR 004: Coexistência Paralela de Canvas durante a Transição sem Quebra do Docker

- **Status:** Aprovado e Vigente ✅
- **Data:** 2026-10-29
- **Contexto:**
  A base de código possui 109 arquivos interdependentes. Tentar uma substituição "big bang" em um único commit geraria centenas de erros no compilador TypeScript (`tsc --noEmit`), quebrando o ambiente Docker (`docker-compose up`) e paralisando o desenvolvimento.
- **Decisão:**
  Adotar uma estratégia de **migração por coexistência paralela (Strangler Fig Pattern)**:
  1. Manter o container Docker inalterado (`node:20-alpine`, Vite na porta 5173).
  2. Criar a raiz `src/engine/` com a nova infraestrutura e contratos.
  3. Implementar um adapter transitório que permita montar a `Application` do PixiJS v8 no DOM sob demanda sem desativar as rotas atuais do Kaboom.
  4. Migrar subsistemas em 5 ondas ordenadas (Folha → Tronco → Raiz), validando `npx tsc --noEmit` e `npm test` a cada arquivo migrado.
  5. Desinstalar o Kaboom exclusivamente na Onda 5, após 100% dos 109 arquivos estarem convertidos para os contratos.
- **Consequências:**
  - **Positivas:** Zero tempo de inatividade no ambiente Docker; integridade contínua do pipeline de CI (`npm run check`); possibilidade de commits atômicos e reversão granular.
  - **Negativas:** Coexistência temporária de duas dependências no `package.json` durante o período de transição.

---

### ADR 005: Erradicação da Física Clássica em Geometria Estática em Favor do `SpatialHashGrid`

- **Status:** Aprovado e Vigente ✅
- **Data:** 2026-11-03
- **Contexto:**
  O relevo do Boqueirão (paredões escarpados, degraus abissais, vale central e montanha da Ilha do Farol) instanciou milhares de blocos com componentes nativos do Kaboom (`k.area()`, `k.body({ isStatic: true })`). A cada tick da engine, o Kaboom executava rotinas internas de colisão de corpos rígidos em toda a geometria fixa, estrangulando o orçamento da CPU e reduzindo o framerate a patamares inaceitáveis (< 15 FPS).
- **Decisão:**
  1. Erradicar integralmente os componentes `k.area()` e `k.body({ isStatic: true })` de todas as entidades de geometria e relevo do cânion.
  2. Delegar a detecção e resolução de colisões exclusivamente ao `SpatialHashGrid` O(1) já existente, inserindo as AABBs estáticas com a flag `isStatic: true`.
  3. No `SpatialHashGrid.update()`, ignorar imediatamente chamadas de reposicionamento em itens estáticos (`existing.isStatic`), poupando 100% de ciclos computacionais.
- **Consequências:**
  - **Positivas:** Redução dramática da carga de CPU do motor Kaboom; ausência de loops internos de física; resposta de colisão O(1) imediata e determinística.
  - **Negativas:** Exige registro explícito das caixas delimitadoras no grid espacial no momento da geração procedural.

---

### ADR 006: Otimização de Pipeline PixiJS v8, Z-Sorting sob Demanda e Zero-Allocation na Heap

- **Status:** Aprovado e Vigente ✅
- **Data:** 2026-11-03
- **Contexto:**
  Mesmo com o particionamento espacial, picos de Garbage Collector (GC Spikes) e sobrecarga no grafo de cena do PixiJS degradavam a estabilidade a 60 FPS devido a:
  1. Reordenação contínua de mais de 1.300 objetos por `zIndex` a cada frame (`sortableChildren = true`).
  2. Cálculos matriciais e transformações em objetos fora da tela (`visible = false` não impedia o processamento na CPU).
  3. Hit-testing e eventos de ponteiro/mouse calculados desnecessariamente para entidades estáticas e nós gráficos decorativos.
  4. Alocação recorrente de arrays e chaves de strings (`cx + ":" + cy`) no `SpatialHashGrid` e em rotinas de partículas.
- **Decisão:**
  1. **PixiJS Pipeline Culling:** Acoplar `this.container.renderable = visible` no método `setVisible(visible)` do adapter `PixiNodes.ts`, cortando o nó na raiz do pipeline WebGL.
  2. **Supressão de Eventos:** Configurar `eventMode = "none"` e `interactiveChildren = false` nos nós do grafo e no palco nativo.
  3. **Z-Sorting sob Demanda:** Desativar `sortableChildren = false` contínuo no palco e acionar `parent.sortChildren()` exclusivamente quando houver mutação efetiva de `zIndex`.
  4. **Zero-Allocation Espacial:** Converter chaves de células para hashing numérico bitwise de 32 bits `(cx << 16) | (cy & 0xFFFF)` e reutilizar buffers internos fixos (`queryResult`, `querySeen`, `cellKeysBuffer`), eliminando instanciacões temporárias no loop de renderização e colisão.
- **Consequências:**
  - **Positivas:** Framerate cravado em 60 FPS com latência de frame estável (p95 < 16.6ms); eliminação de picos de Garbage Collection; renderização WebGL limpa e escalável.
  - **Negativas:** Requer disciplina estrita de buffers reutilizáveis e verificação atenta de mutações nos testes unitários.
