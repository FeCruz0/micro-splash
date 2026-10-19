# Plano de Implementação — Fase 50: Acessibilidade & Internacionalização Avançadas

Status: Concluído ✅  
Data: 2026-10-19  
Alvo: v1.15.0

---

## 🔬 Diagnóstico e Escopo da Fase 50

1. **Auditoria de Contraste WCAG AA**:
   - Implementar utilitários puros de cálculo de luminância relativa e contraste de cores em `src/utils/contrast.ts`:
     - Fórmula matemática oficial WCAG 2.1: $L = 0.2126 \times R + 0.7152 \times G + 0.0722 \times B$.
     - Razão de contraste: $(L_1 + 0.05) / (L_2 + 0.05)$.
     - Validação de conformidade: taxa mínima 4.5:1 para texto padrão e 3:1 para texto grande ($\ge$ 18pt ou $\ge$ 14pt em negrito).
   - Auditar combinações de cores essenciais da interface (textos do HUD sobre água/superfície, fundos translúcidos de modais, banners de bioma e badges de teclas).

2. **Gestão de Foco em Modais (Focus Trap & Focus Restore)**:
   - Em `src/ui/keyboardNav.ts`, adicionar gerenciador de pilha de foco (`focusStack`):
     - Ao abrir um modal, memorizar o índice/elemento ativo na tela anterior via `pushFocusSnapshot()`.
     - Ao fechar o modal (seja por tecla Escape ou botão Voltar/Fechar), restaurar o foco para o elemento chamador via `popFocusSnapshot()`.
     - Reforçar o focus trap impedindo que o cursor visual saia do modal enquanto ele estiver visível.

3. **Teste de Paridade de Chaves i18n (`src/i18n/locales/`)**:
   - Validar de forma recursiva se todas as chaves presentes em `pt-BR.json` também existem em `en-US.json` e `gn.json`.
   - Garantir que não existam chaves órfãs ou traduções pendentes entre os locales suportados.

4. **Formatação Acessível via `Intl`**:
   - Expandir `src/i18n/i18n.ts` com métodos baseados na API ECMAScript `Intl`:
     - `formatNumber(value: number, options?: Intl.NumberFormatOptions): string`: formatação numérica respeitando pontuação decimal e separador de milhar por locale.
     - `formatDistance(meters: number): string`: exibição acessível e internacionalizada de distâncias (m e km).
     - `formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string`: formatação de datas.
   - Integrar `formatDistance` com `src/utils/navigation.ts` para consistência em HUD e telas de vitória/placar.

5. **Movimento Reduzido nos Sistemas Recentes**:
   - Integrar `accessibilitySystem.isReducedMotion()` nos componentes de renderização adicionados nas fases recentes:
     - `src/entities/player/playerSliceRenderer.ts`: atenuar amplitude da onda viajante e flexão angular sagital (reduzir em 75% quando movimento reduzido estiver ativo).
     - `src/entities/player/playerPectoralFin.ts`: limitar diedro dinâmico e amplitude de batimento peitoral.
     - `src/entities/player/playerPuppetRig.ts`: restringir ângulos de arqueamento da coluna vertebral e flukes para evitar vertigem e desconforto visual.

6. **Suíte de Testes da Fase 50 (`tests/ui/phase50_accessibility_i18n.test.ts`)**:
   - Criar suíte completa testando conformidade WCAG AA, focus stack, paridade i18n, formatação `Intl` e atenuação por `prefers-reduced-motion`.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Utilitários e Auditoria de Contraste WCAG AA

- [x] **1.1 Implementar Módulo de Contraste `src/utils/contrast.ts`**
  - **Arquivo**: `src/utils/contrast.ts`.
  - **Ação**: Implementar funções puras `calculateRelativeLuminance`, `calculateContrastRatio` e `isWcagAaCompliant`.
  - **Validação**: Testes unitários com pares conhecidos (preto/branco = 21:1, amarelo sobre cinza escuro, etc.).

- [x] **1.2 Auditar e Ajustar Contraste de Componentes UI**
  - **Arquivos**: `src/ui/hudSystem.ts`, `src/config.ts`.
  - **Ação**: Garantir que as cores de texto e badges atendam ao threshold de 4.5:1 sobre fundos padrão e translúcidos.
  - **Validação**: Validação via testes automatizados de contraste.

---

### Etapa 2: Gestão de Foco e Focus Trap em Modais

- [x] **2.1 Implementar Pilha de Foco em `src/ui/keyboardNav.ts`**
  - **Arquivo**: `src/ui/keyboardNav.ts`.
  - **Ação**: Adicionar suporte a `pushFocusSnapshot` e `popFocusSnapshot` restaurando o foco anterior no fechamento de modais.
  - **Validação**: Testar transição de foco entre Menu Principal e Modais/Opções.

---

### Etapa 3: Paridade de Chaves i18n

- [x] **3.1 Criar Validador de Paridade de Locales**
  - **Arquivos**: `src/i18n/locales/*.json`.
  - **Ação**: Validar recursivamente a presença de todas as chaves em `en-US.json` e `gn.json` correspondentes a `pt-BR.json`.
  - **Validação**: Execução do teste de paridade garantindo 0 chaves faltantes.

---

### Etapa 4: Formatação Acessível via `Intl`

- [x] **4.1 Adicionar Formatadores `Intl` em `src/i18n/i18n.ts`**
  - **Arquivo**: `src/i18n/i18n.ts`.
  - **Ação**: Implementar `formatNumber`, `formatDistance` e `formatDate` com mapeamento adequado de locales (`pt-BR`, `en-US`, `gn`).
  - **Validação**: Testar saídas formatadas para cada idioma (ex.: `1.500 m` vs `1,500 m`).

- [x] **4.2 Integrar Formatação em `src/utils/navigation.ts`**
  - **Arquivo**: `src/utils/navigation.ts`.
  - **Ação**: Utilizar `i18n.formatDistance` ou `i18n.formatNumber` na renderização de distâncias náuticas e métricas.
  - **Validação**: `npm test tests/ui/`.

---

### Etapa 5: Suporte a Movimento Reduzido nos Subsistemas Recentes

- [x] **5.1 Atenuar Fatiamento Sagital em `playerSliceRenderer.ts`**
  - **Arquivo**: `src/entities/player/playerSliceRenderer.ts`.
  - **Ação**: Atenuar em 75% o deslocamento e curvatura senoidal quando `accessibilitySystem.isReducedMotion()` for verdadeiro.
  - **Validação**: Verificar matriz de fatias com e sem movimento reduzido.

- [x] **5.2 Atenuar Diedro de Nadadeira em `playerPectoralFin.ts`**
  - **Arquivo**: `src/entities/player/playerPectoralFin.ts`.
  - **Ação**: Fixar ângulo diedro e amplitude de batimento peitoral em valores suaves sob movimento reduzido.
  - **Validação**: `npm test tests/player/`.

- [x] **5.3 Atenuar Deformação Angular do Rig em `playerPuppetRig.ts`**
  - **Arquivo**: `src/entities/player/playerPuppetRig.ts`.
  - **Ação**: Amortecer rotações angulares da cauda e flukes quando movimento reduzido estiver ativado.
  - **Validação**: `npm test tests/player/`.

---

### Etapa 6: Suíte de Testes da Fase 50 e Documentação

- [x] **6.1 Implementar Suíte Automatizada da Fase 50**
  - **Arquivo**: `tests/ui/phase50_accessibility_i18n.test.ts`.
  - **Ação**: Criar testes para contraste WCAG AA, pilha de foco, paridade i18n, formatação `Intl` e atenuação por movimento reduzido.
  - **Validação**: `npx vitest run tests/ui/phase50_accessibility_i18n.test.ts`.

- [x] **6.2 Atualizar `docs/ROADMAP.md` e `CHANGELOG.md`**
  - **Arquivos**: `docs/ROADMAP.md`, `CHANGELOG.md`.
  - **Ação**: Registrar tarefas como concluídas e documentar novas funcionalidades acessíveis.

---

### Etapa 7: Validação Geral de Qualidade e Build

- [x] **7.1 Execução do Script Agregador `npm run check`**
  - **Comando**: `npm run check` (formatação, lint, validação de dados, tipagem, testes e build).
