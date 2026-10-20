# Plano de Implementação — Fase 52: Documentação & Experiência do Desenvolvedor

Status: Pronto para Execução  
Data: 2026-10-20  
Alvo: v1.17.0

---

## 🔬 Diagnóstico e Escopo da Fase 52

1. **Atualização Arquitetural em `docs/ARCHITECTURE.md` (Fase 52.1)**:
   - O documento atual de arquitetura parou na Fase 36/37 e não reflete os avanços recentes do projeto:
     - **Biomecânica da Jubarte (Fases 40 a 44 e Fase 51)**:
       - Diagrama Mermaid de arquitetura do jogador ilustrando o fluxo determinístico:
         `player.ts` ➔ `playerRenderPipeline.ts` ➔ (`playerPuppetRig.ts`, `playerSliceRenderer.ts`, `playerPectoralFin.ts`, `playerBreathPalette.ts`).
       - Detalhamento de cada camada do rig:
         1. Cinemática do Puppet Rig (cadeia esquelética de 4 nós e ângulo de ataque dos flukes).
         2. Fatiamento Sagital e propagação da onda viajante.
         3. Hidroplanos Peitorais independentes com diedro e perspectiva 2.5D.
         4. Colorimetria centralizada e mapeamento dos 5 estados de fôlego.
     - **Desacoplamento e Estrutura Modular da UI (Fases 46 e 48)**:
       - Reorganização em `src/ui/screens/`, `src/ui/modals/`, `src/ui/hud/`, `src/ui/shared/`.
       - Padrão de Code-Splitting dinâmico via `await import(...)` para modais pesados (`quizModal`, `codexScreen`, `optionsScreen`, etc.).
       - Gestão de foco LIFO acessível (`keyboardNav.ts`) e tokens padronizados de transição (`animationUtils.ts`).
     - **Subsistema de Persistência com Schemas Zod (Fases 45 e 48)**:
       - `src/utils/storage.ts` com validação de runtime via schemas Zod (`src/types/storageSchemas.ts`), eliminando acessos diretos desprotegidos ao `localStorage`.
     - **Subsistema PWA Offline-First & Cache Versionado (Fase 47)**:
       - Plugin `pwaVersionPlugin` injetando a versão do `package.json` no Service Worker.
       - Estratégia de precache com fallback para `offline.html` e poda LRU de cache dinâmico (`trimCache`).

2. **Reconciliação e Preenchimento do `CHANGELOG.md` para as Fases 38 a 44 (Fase 52.2)**:
   - Identificada uma lacuna documental no `CHANGELOG.md` entre as versões `1.13.0` (Fase 37) e `1.14.0` (Fases 45 a 49): as Fases 38 a 44 foram integralmente implementadas e commitadas no git, mas suas notas de versão não foram inseridas no arquivo.
   - Reconciliar e documentar formalmente cada fase histórica com base nos commits e testes do repositório:
     - **Fase 38**: PWA Telemetria Offline, Modo Totem/Kiosk e Badge de FPS em tempo real.
     - **Fase 39**: Culling Espacial de Frustum com Margens de Histerese e Cache O(1) do Jogador.
     - **Fase 40**: Biomecânica de Arfagem, Curvatura Espinhal e Deriva Orbital de Maré.
     - **Fase 41**: Deformação Sagital por Fatiamento Segmentado (Vertical Slice Ribbon) e Onda Viajante.
     - **Fase 42**: Nadadeiras Peitorais Independentes com Diedro e Enflechamento Hidrodinâmico.
     - **Fase 43**: Articulação Multissegmentar de Cauda e Flukes (Multi-Part Puppet Rig) com Ângulo de Ataque Dinâmico.
     - **Fase 44**: Spritesheet de Alta Fluidez de 16 Quadros e Interpolação Harmônica de Estados de Nado.

3. **Reconciliação ROADMAP × Código e Sincronização Geral (Fase 52.3)**:
   - Auditar todos os módulos ativos para certificar que os itens marcados com `[x]` no `docs/ROADMAP.md` correspondem com precisão à realidade do código.
   - Alinhar `.ai/todo.md`, `docs/ROADMAP.md` e referências cruzadas de documentação.

4. **Suíte de Testes de Consistência Documental e Arquitetural (Fase 52.4)**:
   - Criar `tests/core/phase52_documentation_consistency.test.ts`:
     - Validar que `docs/ARCHITECTURE.md` contém diagramas Mermaid válidos e cita explicitamente os subsistemas essenciais (`playerRenderPipeline`, `playerPuppetRig`, `playerSliceRenderer`, `playerPectoralFin`, `playerBreathPalette`, `storage.ts`, `trimCache`).
     - Validar que `CHANGELOG.md` contém seções para todas as fases até a Fase 51 sem lacunas.
     - Validar que caminhos de arquivos citados na documentação de arquitetura realmente existem no disco.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Atualização Abrangente de `docs/ARCHITECTURE.md`

- [ ] **1.1 Documentar Nova Árvore de Diretórios e Módulos**
  - **Arquivo**: `docs/ARCHITECTURE.md`.
  - **Ação**: Atualizar a árvore ASCII do projeto refletindo a organização modular de `src/entities/player/`, `src/scenes/`, `src/systems/audio/sfx/`, `src/ui/screens/`, `src/ui/modals/`, `src/ui/hud/` e `src/ui/shared/`.
  - **Validação**: Verificação visual e validação por teste automatizado.

- [ ] **1.2 Documentar Arquitetura Biomecânica da Jubarte e Diagrama Mermaid**
  - **Arquivo**: `docs/ARCHITECTURE.md`.
  - **Ação**: Inserir seção detalhada sobre o rig da baleia (Fases 40-44 e 51) com diagrama Mermaid de fluxo de renderização (`playerRenderPipeline`), cinemática direta do puppet rig, onda viajante sagital, hidroplanos diedrais e colorimetria de fôlego.
  - **Validação**: Validação da sintaxe Mermaid e conferência com os tipos em `src/entities/player/types.ts`.

- [ ] **1.3 Documentar Arquitetura de UI Desacoplada e Code-Splitting**
  - **Arquivo**: `docs/ARCHITECTURE.md`.
  - **Ação**: Adicionar seção explicando o carregamento dinâmico assíncrono via `await import(...)`, o sistema de transições com `animationUtils.ts` e a gestão de foco LIFO com `keyboardNav.ts`.
  - **Validação**: Coerência com `src/scenes/menuScene.ts` e `src/ui/`.

- [ ] **1.4 Documentar Persistência com Zod e PWA Versionado**
  - **Arquivo**: `docs/ARCHITECTURE.md`.
  - **Ação**: Documentar a camada de persistência em `src/utils/storage.ts` com schemas Zod e o ciclo de vida offline do Service Worker com poda de cache LRU (`trimCache`).
  - **Validação**: Coerência com `src/types/storageSchemas.ts` e `public/sw.js`.

---

### Etapa 2: Reconciliação do `CHANGELOG.md` (Fases 38 a 44)

- [ ] **2.1 Adicionar Notas de Versão das Fases 38 a 44 no `CHANGELOG.md`**
  - **Arquivo**: `CHANGELOG.md`.
  - **Ação**: Inserir seções padronizadas Keep a Changelog documentando detalhadamente as Fases 38, 39, 40, 41, 42, 43 e 44 com seus respectivos arquivos e impactos técnicos.
  - **Validação**: Conferência de commit hashes e arquivos alterados.

---

### Etapa 3: Reconciliação ROADMAP × Código

- [ ] **3.1 Auditar e Sincronizar `docs/ROADMAP.md`**
  - **Arquivo**: `docs/ROADMAP.md`.
  - **Ação**: Conferir descrições e checkboxes de todas as fases, confirmando que a Fase 52 está devidamente estruturada e sem discrepâncias em relação ao código real.
  - **Validação**: Inspeção minuciosa de links e referências.

---

### Etapa 4: Suíte de Testes da Fase 52

- [ ] **4.1 Implementar `tests/core/phase52_documentation_consistency.test.ts`**
  - **Arquivo**: `tests/core/phase52_documentation_consistency.test.ts`.
  - **Ação**: Criar testes automatizados para validar que `docs/ARCHITECTURE.md` cita os módulos de renderização e storage, que `CHANGELOG.md` cobre todas as fases planejadas e que arquivos referenciados existem.
  - **Validação**: `npx vitest run tests/core/phase52_documentation_consistency.test.ts`.

---

### Etapa 5: Validação Integrada do Projeto

- [ ] **5.1 Executar Script Agregador `npm run check`**
  - **Comando**: `npm run check` (formatação, lint, validação de schemas Zod, checagem de tipos TypeScript, testes unitários e build Vite).
  - **Validação**: Retorno com código 0 e todos os testes verdes.
