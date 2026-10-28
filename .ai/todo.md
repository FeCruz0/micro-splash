# Plano de Implementação — Fases 62 & 63: Ocultação de Recursos em Desenvolvimento (Desafio Semanal & Narração TTS)

Status: Concluído ✅  
Data: 2026-10-28  
Alvo: v1.27.0 (Ocultação de Recursos Experimentais e Polimento de Layouts de UI)

---

## 🔬 Diagnóstico e Escopo

### 1. Fase 62: Ajuste de Interface & Ocultação do Desafio Semanal

- **Problema**: O card do Desafio Semanal na tela de seleção de modos (`src/ui/modeSelectScreen.ts`) ocupa 92px verticais e sugere um modo com rankings competitivos comunitários globais que ainda está em desenvolvimento ativo no backend.
- **Solução Arquitetural**:
  - Remover/ocultar a renderização do Card 3 (`cardWeekly`, ícone 📅 e textos de semente/ranking).
  - Reposicionar o Card 4 (Migração Rápida - 60s) diretamente abaixo do Card 2 (Migração Difícil/Serena) com `card4Y = card2Y + card2H / 2 + 16 + card4H / 2`.
  - Atualizar o array de acessibilidade e navegação por teclado (`focusItems`), reduzindo de 4 para 3 itens de foco de modo de jogo.
  - Preservar integralmente `src/systems/weeklyChallenge.ts`, o schema Zod `micro_splash_weekly` em `src/schemas/storageSchemas.ts`, a geração Mulberry32 e a suíte de testes `tests/systems/weeklyChallenge.test.ts` para reativação futura.

### 2. Fase 63: Ocultação da Narração por Voz nas Opções de Acessibilidade

- **Problema**: O botão de toggle de Narração em Voz (TTS) em `src/ui/options/accessibilityOptionsTab.ts` ocupa a linha vertical 3 (`row3Y`). A síntese nativa de voz (Web Speech API) necessita de aprimoramento em suporte multiplataforma e vozes offline em totens.
- **Solução Arquitetural**:
  - Remover a renderização do botão `btnTts` e do texto `ttsText` da Linha 3 na aba de acessibilidade.
  - Promover a Linha 4 (Idioma / Language) para a Linha 3 (`row3Y = rowStartY + 3 * (btnH + rowGap)`), eliminando o cálculo de `row4Y` e consolidando 4 linhas contínuas (Linha 0: Daltonismo, Linha 1: Movimento Reduzido, Linha 2: Tamanho de Fonte, Linha 3: Idioma).
  - Atualizar o registro de itens navegáveis via teclado (`focusItems`).
  - Preservar o módulo `src/systems/ttsSystem.ts`, as chamadas não-bloqueantes em pop-ups/insights e os testes unitários em `tests/core/education_phase21.test.ts`.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Fase 62 — Ajuste de Interface & Ocultação do Desafio Semanal

- [x] **1.1 Ocultar Card de Desafio Semanal em `src/ui/modeSelectScreen.ts`**
  - **Arquivo**: `src/ui/modeSelectScreen.ts`.
  - **Ação**: Suprimir a criação dos componentes gráficos do Card 3 (`cardWeekly`, ícone, label da semana e descrição de semente).
- [x] **1.2 Reorganizar Alinhamento Vertical e Foco do Teclado**
  - **Arquivo**: `src/ui/modeSelectScreen.ts`.
  - **Ação**: Recalcular a coordenada Y do Card de Migração Rápida (`card4Y = card2Y + card2H / 2 + 16 + card4H / 2`) e remover o registro do Card 3 de `focusItems`.
- [x] **1.3 Criar Teste Automatizado de Layout da Tela de Modos**
  - **Arquivo**: `tests/ui/phase62_63_ui_refinement.test.ts`.
  - **Ação**: Validar que a tela de seleção de modos exibe estritamente 3 modos ativos (Normal, Difícil/Serena e Rápida) e posiciona os elementos sem sobreposição.

---

### Etapa 2: Fase 63 — Ocultação da Narração por Voz nas Opções

- [x] **2.1 Remover Botão de Toggle de TTS em `src/ui/options/accessibilityOptionsTab.ts`**
  - **Arquivo**: `src/ui/options/accessibilityOptionsTab.ts`.
  - **Ação**: Suprimir a renderização de `btnTts`, `ttsText` e seu handler `handleTts`.
- [x] **2.2 Reindexar Grade Vertical e Itens de Foco da Aba de Acessibilidade**
  - **Arquivo**: `src/ui/options/accessibilityOptionsTab.ts`.
  - **Ação**: Mover o botão de Idioma para `row3Y`, remover a variável `row4Y` e atualizar `focusItems`.
- [x] **2.3 Criar Teste Automatizado da Aba de Acessibilidade**
  - **Arquivo**: `tests/ui/phase62_63_ui_refinement.test.ts`.
  - **Ação**: Validar que a aba de acessibilidade renderiza 4 linhas de botões ativos, sem o controle de TTS.

---

### Etapa 3: Validação de Qualidade, Linting & Documentação

- [x] **3.1 Validação de Tipos, Linter e Testes**
  - **Ação**: Executar `npx eslint src/ tests/`, `npx tsc --noEmit` e `npx vitest run`, garantindo 100% de aprovação (80 arquivos e 615 testes).
- [x] **3.2 Sincronizar Documentação e Changelog**
  - **Arquivo**: `docs/ROADMAP.md`, `CHANGELOG.md`.
  - **Ação**: Marcar as tarefas 62.1, 62.2, 63.1 e 63.2 como concluídas no roadmap e documentar a v1.27.0 no changelog.
