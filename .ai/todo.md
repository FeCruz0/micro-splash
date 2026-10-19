# Plano de Implementação — Fase 47: PWA Versionado & Experiência Offline Refinada

Status: Concluído
Data: 2026-10-19
Alvo: v1.14.0

---

## 🔬 Diagnóstico e Escopo da Fase 47

1. **`CACHE_NAME` Dinâmico Derivado da Versão (`public/sw.js`, `vite.config.ts`, `scripts/`)**:
   - Atualmente, o Service Worker usa `const CACHE_NAME = "micro-splash-v9";` de forma estática e manual.
   - O nome do cache deve ser derivado diretamente de `package.json.version` (ex.: `micro-splash-v1.14.0`) via plugin/script de injeção ou compilação do Service Worker durante o build.

2. **Precache Estrutural Completo**:
   - `PRECACHE_ASSETS` atual omite recursos vitais para funcionamento 100% offline em totens:
     - `data/facts.json` e `data/quiz.json` (conteúdo pedagógico e desafio ecológico).
     - `sprites/fauna_manifest.json` (manifesto de atlas criado na Fase 46).
     - `about.html` e `offline.html` (páginas de apoio e contingência).

3. **Política de Expiração e Limite de Entradas no Cache Dinâmico (LRU)**:
   - Em totens públicos e quiosques de longa duração, requisições dinâmicas acumulam entradas indefinidamente.
   - Implementar função de poda de cache (LRU trim) limitando o cache dinâmico a 60 entradas máximas.

4. **Tela Offline Estilizada (`public/offline.html`)**:
   - Criar página de contingência offline com estética visual glassmórfica e paleta oceânica profunda, sem diálogos nativos do navegador (`alert`/`confirm`), permitindo reconexão graciosa com botão tátil "Tentar Novamente".

5. **Suíte de Testes Automatizados da Fase 47 (`tests/phase47_pwa_versioning.test.ts`)**:
   - Validar estaticamente sincronia da versão do cache com `package.json`, presença de todos os assets vitais no precache e lógica de poda do cache.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Injeção de Versão e Precache Completo no Service Worker

- [x] **1.1 Configurar Injeção Dinâmica de Versão no Service Worker**
  - **Arquivos**: `vite.config.ts`, `public/sw.js`, `scripts/buildSw.cjs` (ou plugin Vite).
  - **Ação**: Injetar automaticamente `package.json.version` no `CACHE_NAME` (`micro-splash-v${version}`).
  - **Validação**: Executar build e verificar se `dist/sw.js` ou `public/sw.js` reflete a versão exata do `package.json`.

- [x] **1.2 Expandir Lista de Precache com Recursos Educativos e Manifestos**
  - **Arquivo**: `public/sw.js`
  - **Ação**: Incluir `/data/facts.json`, `/data/quiz.json`, `/sprites/fauna_manifest.json` e `/about.html` em `PRECACHE_ASSETS`.
  - **Validação**: Confirmar presença de todos os arquivos estáticos na lista de pré-cacheamento.

---

### Etapa 2: Política de Limite de Entradas do Cache Dinâmico (LRU)

- [x] **2.1 Implementar Função de Poda LRU no Service Worker**
  - **Arquivo**: `public/sw.js`
  - **Ação**: Criar função `trimCache(cacheName, maxItems = 60)` que remove as entradas mais antigas quando o limite for excedido após requisições em runtime.
  - **Validação**: Simular adição de entradas acima do limite e verificar deleção FIFO/LRU.

---

### Etapa 3: Tela de Contingência Offline Glassmórfica (`public/offline.html`)

- [x] **3.1 Criar Página Offline Glassmórfica e Integrar ao Fallback de Navegação**
  - **Arquivos**: `public/offline.html`, `public/sw.js`
  - **Ação**:
    1. Criar `public/offline.html` estilizada com estética marítima do Micro Splash (fundo polar `#06122a`, tipografia Outfit/Inter, card translúcido com gradiente e botão de reload).
    2. Adicionar `/offline.html` ao precache e ao fallback de requisições de navegação quando sem rede e sem cache da página principal.
  - **Validação**: Acessar URL inexistente sem conexão e verificar renderização da tela estilizada.

---

### Etapa 4: Suíte de Testes da Fase 47 (`tests/phase47_pwa_versioning.test.ts`)

- [x] **4.1 Testes Automatizados de Versionamento e Integridade PWA**
  - **Arquivo**: `tests/phase47_pwa_versioning.test.ts`
  - **Ação**: Validar:
    1. Correspondência entre a versão do Service Worker e o `package.json`.
    2. Presença de todos os arquivos de dados, fontes, sprites e contingência no precache.
    3. Função de poda de cache mantendo teto máximo de entradas.
    4. Existência e estrutura semântica de `public/offline.html`.
  - **Validação**: Executar `npm test tests/phase47_pwa_versioning.test.ts`.

- [x] **4.2 Atualização da Documentação e Roadmap**
  - **Arquivo**: `docs/ROADMAP.md`
  - **Ação**: Marcar todos os itens 47.1 a 47.5 como concluídos `[x]`.

---

### Etapa 5: Validação Geral de Qualidade e Build

- [x] **5.1 Execução de Linter, Tipagem e Testes Globais**
  - **Comandos**:
    - `npm run lint` (0 erros, 0 warnings em `src`, `tests`, `scripts`, `server`, `public/sw.js`)
    - `npm test` (100% de aprovação em todas as suítes)
    - `npm run build` (`tsc && vite build`)
    - `npm test` (100% de aprovação em todas as suítes)
    - `npm run build` (`tsc && vite build`)
