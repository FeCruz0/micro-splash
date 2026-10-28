# Plano de Implementação — Fase 65: Polimento Visual, Micro-Interações & Dinâmica Oceânica (Motion & Juice)

Status: Concluído ✅  
Data: 2026-10-28  
Alvo: v1.29.0 (Micro-Animações Sutis, Contadores de Pontuação, Escala Tipográfica Padronizada & Transições de Bioma)

---

## 🔬 Diagnóstico e Motivação

1. **Micro-Interações Estáticas nos Call-to-Action Principais**:
   - Botões primários cruciais (`JOGAR / INICIAR`, `JOGAR NOVAMENTE`, `EMITIR CERTIFICADO`) possuíam apenas expansão reativa ao ponteiro via `attachButtonHoverEffect`, sem atratividade orgânica passiva (respiração/brilho suave).
   - Telas de seleção de modo (`modeSelectScreen.ts`) e o quadro de recordes (`leaderboardScreen.ts`) exibiam seus cards e linhas instantaneamente, sem entrada escalonada (_stagger_ visual), resultando em aparição visual abrupta.

2. **Pontuações Estáticas e Ausência de "Juice" nos Resultados**:
   - Ao concluir a migração ou o desafio rápido de 60s, o placar de Eco-Pontos era exibido de forma imediata e numérica fria em `victoryScreen.ts` e `challengeEndScreen.ts`. A experiência se torna mais gratificante com contagem animada progressiva (_slot counter_ suave) que respeite o modo de movimento reduzido (`isReducedMotion`).
   - O Quadro de Recordes (`leaderboardScreen.ts`) já possuía ícones de medalha (🥇, 🥈, 🥉), mas carecia de distinção visual marcante e escalonamento na exibição das linhas.

3. **Disparidade de Escala Tipográfica e Contraste**:
   - Variações dispersas de tamanhos de fonte literais (`size: 14.5`, `15`, `16`, `17.5`, `23`, `25`) entre modais e telas, sem uma enumeração tipada formal no Design System.
   - Embora `addShadowedText` existisse em `src/ui/textUtils.ts`, vários títulos e labels em modais ainda usavam texto plano sobreposto a fundos dinâmicos sem sombra protetora de contraste.

4. **Transições Ambientais de Bioma em Tempo Real**:
   - `biomeTransitionSystem.ts` e `biomeVignetteSystem.ts` continham cálculos matemáticos de atenuação e apresentação de marcos, porém necessitavam de padronização nas curvas de opacidade, garantia estrita de não-alocação no loop quente do Kaboom (`onUpdate`) e conformidade com o orçamento estável de 60 FPS (Fase 53).

---

## 🏗️ Decisões Arquiteturais

1. **Módulo de Micro-Interações e Movimento (`src/ui/shared/motion.ts`)**:
   - **`attachPulseEffect`**: Pulso harmônico suave de escala e opacidade (fator `1.0` a `1.025` em período de ~1.4s) em botões primários, com cancelamento automático no ciclo de vida e suspensão imediata caso `accessibilitySystem.isReducedMotion()` retorne verdadeiro.
   - **`staggerElementsEntrance`**: Função utilitária que recebe uma lista de `GameObj[]`, escalonando a entrada com delay incremental (~40ms a 50ms por item) e deslocamento vertical sutil via `k.tween` ou atribuição direta caso `reducedMotion` esteja ativo.

2. **Contador Progressivo de Eco-Pontuação (`src/ui/shared/scoreCounter.ts`)**:
   - **`animateScoreCounter`**: Função pura/modular que interpola numericamente do valor base ao valor alvo ao longo de ~0.8s a 1.2s usando curva `easeOutQuad` / `easeOutCubic`, formatando com separador de milhar pt-BR e disparando callback `onComplete` opcional.

3. **Consolidação dos Tokens Tipográficos Canônicos (`src/ui/theme.ts`)**:
   - Formalização de `UI_FONTS` (`title: "Orbitron"`, `body: "Inter"`, `accent: "Outfit"`) e `UI_TYPOGRAPHY_SCALE` com 5 degraus canônicos padronizados:
     - `caption`: 11px (badges, rodapés, dicas de tecla)
     - `body`: 14px (texto corrido, descrições)
     - `label`: 16px (rótulos de botões e itens de formulário)
     - `h2`: 18px (subtítulos e seções)
     - `h1`: 24px (títulos de modais)
     - `display`: 44px (logos monumentais e destaques comemorativos)
   - Padronização do uso de `addShadowedText` em títulos e cabeçalhos em superfícies transparentes ou submarinas.

4. **Polimento das Transições de Bioma (`src/systems/biomeVignetteSystem.ts` & `src/systems/biomeTransitionSystem.ts`)**:
   - Reforço visual na vinheta do cartão de marco com entrada suave (fade-in 0.35s), permanência pedagógica e saída (fade-out 0.45s).
   - Validação de que não há instanciação excessiva de objetos efêmeros que cause pressão no Garbage Collector (GC).

5. **Acessibilidade Universal e Não-Bloqueio**:
   - Respeito irrestrito a `accessibilitySystem.isReducedMotion()`: todos os tweens de pulso, stagger e contadores adotam estado final estático instantâneo sem atrasos quando o usuário optar por movimento reduzido.
   - Zero dependência de diálogo nativo do navegador (`alert`, `confirm`, `prompt`).

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Utilitários de Movimento & Micro-Interações (`src/ui/shared/motion.ts`)

- [x] **1.1 Implementar `src/ui/shared/motion.ts`**
  - Implementar `attachPulseEffect(k, buttonObj, options)` com pulso suave de escala (1.0 → 1.025) e suporte a checagem de `isReducedMotion()`.
  - Implementar `staggerElementsEntrance(k, elements, options)` com deslocamento vertical inicial e atraso progressivo (~50ms por item).
  - Adicionar controle de cleanup/cancelamento de tweens para evitar memory leaks em destruição de objetos.
- [x] **1.2 Reexportar utilitários de movimento em `src/ui/shared/index.ts`**
  - Exportar `attachPulseEffect`, `staggerElementsEntrance` e interfaces associadas.

### Etapa 2: Contador Numérico Progressivo (`src/ui/shared/scoreCounter.ts`)

- [x] **2.1 Implementar `src/ui/shared/scoreCounter.ts`**
  - Definir interface `ScoreCounterOptions` (`duration`, `startValue`, `prefix`, `suffix`, `onComplete`).
  - Implementar `animateScoreCounter(k, textObj, targetScore, options)` com interpolação `easeOutQuad` e formatação `pt-BR`.
  - Adicionar bypass instantâneo se `isReducedMotion()` for verdadeiro ou ambiente de teste sem tween.
- [x] **2.2 Integrar contador progressivo nas telas de finalização**
  - Integrar `animateScoreCounter` em `src/ui/challengeEndScreen.ts` para contagem dinâmica dos Eco-Pontos da rodada.
  - Integrar em `src/ui/victoryScreen.ts` na exibição dos pontos conquistados.

### Etapa 3: Pódio, Stagger & Realce no Quadro de Recordes e Seleção de Modos

- [x] **3.1 Aplicar entrada escalonada em `src/ui/modeSelectScreen.ts`**
  - Aplicar `staggerElementsEntrance` nos 3 cards de seleção de modo (Normal, Sereno, Rápido) para entrada harmoniosa.
- [x] **3.2 Refinar pódio e entrada de linhas em `src/ui/leaderboardScreen.ts`**
  - Integrar `staggerElementsEntrance` nas linhas renderizadas da tabela de recordes.
  - Adicionar realce cromático refinado na borda e fundo do 1º colocado (🥇 Ouro Oceânico).

### Etapa 4: Padronização da Escala Tipográfica & Contraste (`src/ui/theme.ts`)

- [x] **4.1 Adicionar `UI_FONTS` e `UI_TYPOGRAPHY_SCALE` em `src/ui/theme.ts`**
  - Formalizar a hierarquia de 5 degraus canônicos (`caption`, `body`, `label`, `h2`, `h1`, `display`) compatíveis com `accessibilitySystem.scaleFont`.
  - Reexportar tokens tipográficos em `src/ui/shared/index.ts`.
- [x] **4.2 Padronização do uso de `addShadowedText`**
  - Garantir que modais fundacionais utilizem `addShadowedText` ou sombra nativa do Design System para títulos de primeiro nível.

### Etapa 5: Transições Ambientais de Bioma & Performance (`src/systems/`)

- [x] **5.1 Refinar apresentação de marcos em `src/systems/biomeVignetteSystem.ts`**
  - Suavizar a transição de fade-in/fade-out do cartão de apresentação de bioma.
  - Validar limpeza imediata de timers e referências na destruição ou transição de cena.
- [x] **5.2 Auditoria de Alocação e Frame Budget**
  - Confirmar ausência de alocações transitórias em `calculateBiomeTransitionFactor` e `checkBiomeVignetteTrigger`.

### Etapa 6: Suíte de Testes Automatizados & Validação de Qualidade

- [x] **6.1 Criar `tests/ui/phase65_ui_motion.test.ts`**
  - Teste 1: `attachPulseEffect` — variação de escala e comportamento quando `isReducedMotion` está ativado.
  - Teste 2: `staggerElementsEntrance` — cálculo correto dos tempos escalonados e posicionamento final.
  - Teste 3: `animateScoreCounter` — interpolação progressiva, formatação correta de texto e disparo de `onComplete`.
  - Teste 4: `UI_TYPOGRAPHY_SCALE` e `UI_FONTS` — integridade dos tokens e compatibilidade de escala.
  - Teste 5: `biomeVignetteSystem` e `calculateBiomeTransitionFactor` — cálculo puro e transição de marcos sem vazamentos.
- [x] **6.2 Execução de Testes e Linters**
  - `npx vitest run` (100% de aprovação em todos os 82 arquivos de teste e 642 testes).
  - `npx tsc --noEmit` (0 erros de tipagem).
  - `npx eslint src/ tests/` (0 avisos ou violações de regras).

---

## 🔒 Critérios de Aceite

1. **Acessibilidade (WCAG 2.1 AA)**:
   - Todas as animações (pulso, stagger, contador) são instantaneamente desativadas ou colapsadas para o estado final estático se `isReducedMotion()` for verdadeiro.
2. **Performance (60 FPS)**:
   - As novas micro-animações utilizam exclusivamente tweens com callbacks leves, sem alocações contínuas de objetos dentro de `onUpdate`.
3. **Tipagem Estrita**:
   - Nenhum uso de `any`; todos os contratos e handles possuem interfaces TypeScript exportadas.
4. **Regressão Zero**:
   - Todos os 642 testes unitários existentes passando sem alterações disruptivas.
