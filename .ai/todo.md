# Plano de Implementação — Fase 45: Robustez de Tipagem & Consolidação de Utilitários

Status: Em Planejamento
Data: 2026-10-14
Alvo: v1.14.0

---

## 🔬 Diagnóstico e Escopo da Fase 45

1. **Ativação Estrita do TypeScript (Fase 45.1)**:
   - `tsconfig.json` opera atualmente sem `"strict": true` explícito.
   - A limpeza da Etapa 5 blindou `src/` e `tests/`, permitindo habilitar `"strict": true`, `"strictNullChecks": true` e `"noImplicitAny": true` sem quebrar o build.

2. **Reativação Definitiva de `no-explicit-any` como `"error"` (Fase 45.2)**:
   - A regra `@typescript-eslint/no-explicit-any` foi promovida para `"warn"` em `eslint.config.js`.
   - Deve ser promovida para `"error"` em `src/**/*.ts`, consolidando a eliminação de `any` em produção.

3. **Consolidação dos Utilitários de RNG e Storage (Fases 45.3 e 45.5)**:
   - Resíduos de `Math.random()` e `localStorage.*` direto foram migrados e validados pelo teste estático (`tests/phase37_residuals.test.ts`).
   - Requer atualização das marcações correspondentes no `docs/ROADMAP.md`.

4. **Unificação do Módulo `errorReporter` (Fase 45.4)**:
   - Existem dois módulos paralelos: `src/services/errorReporter.ts` (classe singleton Sentry/offline) e `src/utils/errorReporter.ts` (roteador de console com níveis e callbacks).
   - Deve-se fundir os dois em uma arquitetura única, modular e unificada, preservando compatibilidade de reexportação.

5. **Linting de Scripts, Worker e Service Worker (Fase 45.6)**:
   - `eslint.config.js` ignora atualmente `scripts/**`, `server/**` e `public/**`.
   - Configurar blocos específicos no ESLint com os ambientes corretos (`node` para scripts/server e `serviceworker` para `public/sw.js`).

6. **Suíte Dedicada de Testes da Fase 45 (Fase 45.7)**:
   - Criar `tests/phase45_type_safety.test.ts` cobrindo a unificação do `errorReporter`, tipagem estrita e conformidade dos utilitários.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Ativação Estrita de Compilação (`tsconfig.json`)

- [ ] **1.1 Habilitar Modo `strict` Total**
  - **Arquivos**: `tsconfig.json`.
  - **Ação**: Inserir `"strict": true`, `"strictNullChecks": true` e `"noImplicitAny": true`.
  - **Validação**: Executar `npx tsc --noEmit` assegurando conformidade de compilação sem erros.

---

### Etapa 2: Promoção de `@typescript-eslint/no-explicit-any` para `"error"` (`eslint.config.js`)

- [ ] **2.1 Elevar Severidade da Regra de `any` para Código de Produção**
  - **Arquivos**: `eslint.config.js`.
  - **Ação**: Alterar `@typescript-eslint/no-explicit-any` de `"warn"` para `"error"` no escopo `src/**/*.ts`, mantendo `"off"` em `tests/**/*.ts`.
  - **Validação**: Executar `npm run lint`.

---

### Etapa 3: Unificação da Arquitetura do `errorReporter` (`src/services/` & `src/utils/`)

- [ ] **3.1 Consolidar Ingestão, Níveis e Roteamento de Logs**
  - **Arquivos**: `src/services/errorReporter.ts`, `src/utils/errorReporter.ts`.
  - **Ação**: Integrar métodos de captura com severidade (`information`, `warning`, `error`), listeners de log, supressão para testes e fallback seguro para Sentry em um único barramento canônico.
  - **Validação**: Reexportar tipos e funções para evitar quebra de contratos em arquivos consumidores.

---

### Etapa 4: Expansão de Linting para Scripts, Worker e Service Worker

- [ ] **4.1 Configurar Ambientes e Regras no ESLint**
  - **Arquivos**: `eslint.config.js`, `public/sw.js`, `server/cloudflare-worker/worker.js`, `scripts/*.cjs`.
  - **Ação**: Remover pastas dos `ignores` globais e criar seções de configuração com globals de `node` para `scripts/` e globals de `serviceworker` para `public/sw.js` e `server/`.
  - **Validação**: Executar `npx eslint scripts server public/sw.js` e corrigir resíduos de linter.

---

### Etapa 5: Suíte de Testes da Fase 45 (`tests/phase45_type_safety.test.ts`)

- [ ] **5.1 Testes Unitários de Type Safety e Utilitários Unificados**
  - **Arquivos**: `tests/phase45_type_safety.test.ts`.
  - **Ação**: Validar a unificação do `errorReporter`, listeners, supressão de console e persistência validada por schema.
- [ ] **5.2 Atualização do Roadmap e Documentação**
  - **Arquivos**: `docs/ROADMAP.md`.
  - **Ação**: Marcar itens da Fase 45 como concluídos.

---

### Etapa 6: Validação Completa da Suíte e Build

- [ ] **6.1 Execução dos Testes, Lint e Build de Produção**
  - **Ação**: Executar `npm test`, `npm run lint` e `npm run build` garantindo zero falhas e zero regressão.
