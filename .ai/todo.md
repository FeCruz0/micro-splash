# Plano de Implementação — Fase 64: Design System Centralizado, Tokens Semânticos & Shell de Modais (UI Foundation)

Status: Concluído ✅  
Data: 2026-10-28  
Alvo: v1.28.0 (Camada Fundacional de UI, Design System Oceânico & Componentes Unificados)

---

## 🔬 Diagnóstico e Motivação

1. **Literais de Cor e Hardcoding (`k.rgb` espalhado)**:
   - Mais de 280 chamadas diretas a `k.rgb(...)` e `k.color(...)` espalhadas pelas telas (`leaderboardScreen.ts`, `modeSelectScreen.ts`, `victoryScreen.ts`, `shareModal.ts`, `quizModal.ts`, `statsModal.ts`, `onboardingModal.ts`).
   - Cores ligeiramente inconsistentes para superfícies semelhantes (ex.: `[10, 28, 56]` vs `[14, 36, 72]` vs `[18, 48, 95]`) sem uma hierarquia semântica explícita.
   - Dificulta a aplicação automática de temas de alto contraste (WCAG 2.1 AA) e personalização unificada.

2. **Geometria de Modais Redundante (14 ocorrências)**:
   - Cada tela recalcula `Math.min(1000, screenW - 24)`, `Math.min(660/580, screenH - 20)`, backdrop opaco, card centralizado, texto do título e botão de fechar `[X]` de forma independente.
   - Modais fecham com `destroy()` abrupto, ignorando o utilitário existente `animateModalExit` em `src/ui/animationUtils.ts`.

3. **Inconsistência de Hover e Foco Acessível**:
   - Apenas 8 telas utilizam `attachButtonHoverEffect`.
   - Modais como `leaderboardScreen`, `optionsScreen`, `quizModal`, `shareModal` e `statsModal` implementam listeners manuais (`onHoverUpdate`/`onHoverEnd`), gerando redundância e discrepância de transições.

---

## 🏗️ Decisões Arquiteturais

1. **Tokens Semânticos Centralizados (`src/ui/theme.ts`)**:
   - Criação de contratos imutáveis tipados em estilo Matt Pocock: `UI_COLORS`, `UI_FONTS`, `UI_RADII`, `UI_SPACING`, `UI_Z_INDEX`.
   - Mapeamento explícito de identidades cromáticas por modalidade de jogo:
     - _Migração Serena_: Esmeralda/Menta (`[52, 211, 153]`, texto `[140, 255, 200]`, fundo `[16, 50, 40]`).
     - _Migração Difícil_: Carmesim/Coral (`[244, 63, 94]`, texto `[255, 120, 140]`, fundo `[45, 20, 30]`).
     - _Migração Rápida_: Âmbar/Dourado (`[249, 115, 22]`, texto `[255, 190, 110]`, fundo `[45, 26, 14]`).
   - Função utilitária `getModalDimensions(screenW, screenH, variant)` para encapsular o dimensionamento canônico responsivo.

2. **Componente de Estrutura Universal (`src/ui/shared/modalShell.ts`)**:
   - Função `createModalShell(k, options)` que instancia:
     - Backdrop escuro semi-transparente que bloqueia eventos de fundo (`z: UI_Z_INDEX.backdrop`).
     - Card modal principal com raio de curvatura padronizado, borda oceânica e sombra (`z: UI_Z_INDEX.modalCard`).
     - Título com sombra de leitura universal via `addShadowedText`.
     - Botão fechar `[X]` com hover tátil e registro imediato de foco acessível.
     - Ciclo de vida completo: `animateModalEntrance` na abertura e `animateModalExit` antes do disparo de `onClose()`.
     - Gerenciador integrado de atalho de teclado `Escape`.

3. **Componentes Compartilhados de Seletores & Ações (`src/ui/shared/`)**:
   - `createTabBar<T extends string>(k, options)`: Centraliza simetricamente $N$ abas, computa espaçamentos uniformes (`tabGap`), gerencia estado ativo/inativo, aplica hover e expõe itens de foco acessível para navegação por teclado (`keyboardNav.ts`).
   - `createCardButton(k, options)`: Cria botões padronizados em variantes semânticas (`primary`, `secondary`, `danger`, `ghost`) com `attachButtonHoverEffect` embutido.

4. **Zero Regressão e Migração Gradual**:
   - Validação da arquitetura integrando as telas refinadas recentemente (`src/ui/leaderboardScreen.ts` e `src/ui/modeSelectScreen.ts`).
   - Manutenção rigorosa dos 81 arquivos de testes (628 testes passando) com acréscimo de cobertura para o Design System.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Tokens Semânticos & Design System (`src/ui/theme.ts`)

- [x] **1.1 Criar `src/ui/theme.ts`**
  - Declarar `UI_COLORS`, `UI_FONTS`, `UI_RADII`, `UI_SPACING`, `UI_Z_INDEX`.
  - Definir helper `getModalDimensions(screenWidth: number, screenHeight: number, variant?: "standard" | "compact" | "wide")`.
  - Tipos e exportações de alto nível com tipagem estrita `as const`.
- [x] **1.2 Reexportar Tokens em `src/ui/shared/index.ts`**
  - Garantir ponto de entrada limpo e modularizado para consumo interno em telas e componentes.

### Etapa 2: Shell de Modal Universal (`src/ui/shared/modalShell.ts`)

- [x] **2.1 Implementar `src/ui/shared/modalShell.ts`**
  - Definir interfaces `ModalShellOptions` e `ModalShellHandle`.
  - Instanciar backdrop, card, título com `addShadowedText`, botão fechar `[X]`.
  - Conectar `animateModalEntrance` e `animateModalExit` no callback de encerramento.
  - Adicionar listener de `Escape` seguro com remoção em cleanup.
- [x] **2.2 Reexportar `modalShell` em `src/ui/shared/index.ts`**
  - Adicionar exports em `src/ui/shared/index.ts` e `src/ui/index.ts`.

### Etapa 3: Componentes Unificados de Abas e Botões (`src/ui/shared/tabBar.ts`, `cardButton.ts`)

- [x] **3.1 Implementar `src/ui/shared/tabBar.ts`**
  - Definir tipos `TabItem<T>`, `TabBarOptions<T>`, `TabBarHandle<T>`.
  - Cálculo de largura e centralização simétrica horizontal adaptativa para 2 ou mais abas.
  - Atualização automática de estilos e retorno de `FocusableItem[]`.
- [x] **3.2 Implementar `src/ui/shared/cardButton.ts`**
  - Definir `CardButtonVariant = "primary" | "secondary" | "danger" | "ghost"`.
  - Acoplar `attachButtonHoverEffect` e retornar handle com `btn`, `txt`, e `focusItem`.
- [x] **3.3 Reexportar em `src/ui/shared/index.ts`**

### Etapa 4: Integração de Referência nas Telas Principais

- [x] **4.1 Refatorar `src/ui/leaderboardScreen.ts`**
  - Utilizar `UI_COLORS`, `getModalDimensions` e `createTabBar`.
  - Eliminar código redundante de hover manual e centralização matemática de abas.
- [x] **4.2 Refatorar `src/ui/modeSelectScreen.ts`**
  - Utilizar `UI_COLORS`, `getModalDimensions` e `createCardButton`.
  - Manter rigorosamente o layout e a hierarquia corrigidos na Fase 62.

### Etapa 5: Suíte de Testes Automatizados & Validação

- [x] **5.1 Criar `tests/ui/phase64_design_system.test.ts`**
  - Teste 1: Integridade dos tokens cromáticos (`UI_COLORS`), raio e espaçamento.
  - Teste 2: Cálculo responsivo de `getModalDimensions` em resoluções 4K, 1080p, 720p e telas compactas (640x360).
  - Teste 3: Criação do `createModalShell`, hierarquia de z-index, animações de entrada/saída e fechamento via ESC.
  - Teste 4: `createTabBar` com centralização simétrica exata e foco acessível.
  - Teste 5: `createCardButton` com variantes semânticas e hover anexado.
  - Teste 6: Regressão zero nos testes existentes de tela (`phase62_63_ui_refinement.test.ts`).
- [x] **5.2 Auditoria Completa de Qualidade**
  - Executar `npx tsc --noEmit` (0 erros).
  - Executar `npx eslint src/ tests/` (0 avisos/erros).
  - Executar `npx vitest run` (81 arquivos de teste aprovados, 628 testes).

### Etapa 6: Documentação & Sincronização

- [x] **6.1 Atualizar `docs/ARCHITECTURE.md`**
  - Documentar a seção de Design System, tokens semânticos e hierarquia de componentes compartilhados em `src/ui/shared/`.
- [x] **6.2 Atualizar `docs/ROADMAP.md`**
  - Marcar tarefas da Fase 64 como concluídas `[x]`.
