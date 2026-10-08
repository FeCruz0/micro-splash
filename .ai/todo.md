# Plano de Implementação — Fase 38: PWA Offline Avançado & Telemetria Educativa

Status: Concluído
Data: 2026-10-07
Alvo: v1.14.0

---

## 📋 Lista de Tarefas Atômicas

- [x] **38.1 Gerenciador PWA, Prompt Customizado de Instalação & Status de Rede (`src/utils/pwaManager.ts`, `src/ui/pwaInstallModal.ts`)**
  - **Arquivos**: `src/utils/pwaManager.ts`, `src/ui/pwaInstallModal.ts`, `src/main.ts`
  - **Ação**:
    - Capturar `beforeinstallprompt` sem alertas nativos intrusivos (Regra 6 de UX).
    - Criado helper `pwaManager` com detecção de estado instalável e monitoramento de rede (`online` / `offline`).
    - Modal customizado e estilizado `showPwaInstallModal`.

- [x] **38.2 Gestão de Cache Dinâmico & Atualização Silenciosa do Service Worker (`public/sw.js`, `src/utils/swManager.ts`)**
  - **Arquivos**: `public/sw.js`, `src/utils/swManager.ts`
  - **Ação**:
    - Estratégia Stale-While-Revalidate e cache-first no Service Worker.
    - Criado `swManager` com suporte a `hasUpdateAvailable`, `checkForServiceWorkerUpdates` e `skipWaitingAndReload`.

- [x] **38.3 Telemetria Educativa Local & Métrica de Conscientização (`src/systems/telemetrySystem.ts`)**
  - **Arquivos**: `src/systems/telemetrySystem.ts`, `src/ui/factPopup.ts`, `src/ui/quizModal.ts`, `src/ui/statsModal.ts`
  - **Ação**:
    - Criado `TelemetrySystem` com rastreamento local-first validado por Zod: contagem de fatos lidos, quizzes, acertos e lixo plástico.
    - Exibição de índice de conscientização no modal de estatísticas.

- [x] **38.4 Modo Exibição Contínua para Totens (Kiosk Auto-Reset Configurável)**
  - **Arquivos**: `src/systems/kioskMode.ts`, `src/ui/mainMenu.ts`
  - **Ação**:
    - Configurado tempo limite de totem via `getKioskIdleTimeoutSeconds` e `setKioskIdleTimeoutSeconds` com persistência segura em Zod.
    - Integrado no loop de inatividade do menu principal.

- [x] **38.5 Testes Automatizados da Fase 38 (`tests/phase38_pwa_telemetry.test.ts`)**
  - **Arquivos**: `tests/phase38_pwa_telemetry.test.ts`
  - **Ação**:
    - Suíte com 13 testes unitários cobrindo ciclo de vida PWA, telemetria, storage e kiosk timeout (341 testes globais passando).

- [x] **Debug: Contador de FPS em Tempo Real no Cabeçalho do HUD de Diagnósticos**
  - **Arquivos**: `src/ui/debugDistance.ts`, `src/main.ts`, `tests/f3Diagnostics.test.ts`
  - **Ação**:
    - Adicionado badge de FPS com paleta adaptativa (verde >=55, âmbar 45-54, vermelho <45).
    - Exibição consistente em ambos os modos (migração serena e padrão).
    - Suporte a acionamento pelas teclas F8 e F3.

---

## 🧪 Estratégia de Testes

1. Executado `tests/f3Diagnostics.test.ts` (8 testes passando).
2. Executado `tests/phase38_pwa_telemetry.test.ts` (13 testes passando).
3. Executado `npm test` garantindo regressão zero na suíte global (49 arquivos de teste, 343 testes no total).
