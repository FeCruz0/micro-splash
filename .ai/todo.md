# Plano de Implementação — Fase 38: PWA Offline Avançado, Conquistas (Badges) & Telemetria Educativa

Status: Pronto para Execução
Data: 2026-10-07
Alvo: v1.14.0

---

## 📋 Lista de Tarefas Atômicas

- [ ] **38.1 Schema e Persistência de Conquistas (`src/schemas/achievementSchema.ts`, `src/systems/achievementsSystem.ts`)**
  - **Arquivos**: `src/schemas/achievementSchema.ts`, `src/systems/achievementsSystem.ts`
  - **Ação**:
    - Definir `AchievementSchema` com Zod (`id`, `title`, `description`, `icon`, `unlockedAt`, `category: "conservation" | "navigation" | "wisdom"`).
    - Criar `AchievementsSystem` com métodos puros `isUnlocked(id)`, `unlock(id)`, `getProgress()`, `getAllAchievements()`.
    - Persistência tipada utilizando `src/utils/storage.ts` (`readLocalStorageWithSchema` / `writeLocalStorage`).

- [ ] **38.2 Notificação Visual de Conquista com Toast Animado (`src/ui/achievementToast.ts`)**
  - **Arquivos**: `src/ui/achievementToast.ts`
  - **Ação**:
    - Implementar `showAchievementToast(k, achievement)` animado com `k.tween` de descida e esmaecimento (`easeOutBack`).
    - Integração de áudio retrô via `audioSystem.playPowerupCollect()`.
    - Fila de exibição não-bloqueante para quando múltiplas medalhas forem desbloqueadas em sequência rápida.

- [ ] **38.3 Integração de Gatilhos de Conquistas no Gameplay (`src/systems/collisions.ts`, `src/systems/breachSystem.ts`, `src/main.ts`)**
  - **Arquivos**: `src/systems/collisions.ts`, `src/systems/breachSystem.ts`, `src/entities/player.ts`
  - **Ação**:
    - Conquistas atômicas:
      - `"polar_sentinel"`: Concluir Antártica sem colisões.
      - `"ocean_cleaner"`: Coletar 10 lixos plásticos na rota.
      - `"biosonar_master"`: Revelar 20 perigos com o Biosonar 360°.
      - `"calf_guardian"`: Libertar o filhote de redes no berçário.
      - `"majestic_breach"`: Atingir pontuação máxima no Salto Majestoso.

- [ ] **38.4 Galeria de Conquistas no Codex (`src/ui/codexAchievementsTab.ts`, `src/ui/codexScreen.ts`)**
  - **Arquivos**: `src/ui/codexAchievementsTab.ts`, `src/ui/codexScreen.ts`
  - **Ação**:
    - Adicionar aba "Medalhas & Conquistas" no menu do Codex.
    - Exibir grade de cartões com estado visual (desbloqueado com brilho/dourado vs silhueta cinza com dica), data de conquista e barra de progresso total.

- [ ] **38.5 Gerenciador PWA e Modal Customizado de Instalação (`src/utils/pwaManager.ts`, `src/ui/pwaInstallModal.ts`)**
  - **Arquivos**: `src/utils/pwaManager.ts`, `src/ui/pwaInstallModal.ts`, `src/ui/optionsScreen.ts`
  - **Ação**:
    - Capturar evento `beforeinstallprompt` sem prompts nativos intrusivos (Regra 6 de UX).
    - Criar botão "Instalar Aplicativo 📲" nas Opções e Menu quando o app for instalável.
    - Monitorar eventos `online` e `offline` exibindo indicador sutil na barra de status.

- [ ] **38.6 Cache Avançado no Service Worker & Notificação de Atualização (`public/sw.js`, `src/utils/swUpdateNotifier.ts`)**
  - **Arquivos**: `public/sw.js`, `src/utils/swUpdateNotifier.ts`
  - **Ação**:
    - Atualizar `sw.js` com estratégia Stale-While-Revalidate para `facts.json` e fontes web.
    - Detectar novo Service Worker (`waiting`) e emitir notificação discreta: _"Nova versão disponível! Clique para recarregar"_.

- [ ] **38.7 Telemetria Educativa Local & Métrica de Conscientização (`src/systems/telemetrySystem.ts`)**
  - **Arquivos**: `src/systems/telemetrySystem.ts`, `src/ui/statsModal.ts`
  - **Ação**:
    - Rastreamento ético local (sem envio para servidores externos) de engajamento pedagógico: quantidade de fatos lidos, acertos em quizzes, espécies descobertas.
    - Exibição de resumo "Impacto da Expedição" no modal de estatísticas.

- [ ] **38.8 Tempo de Inatividade Configurável para Totens em Feiras (`src/systems/kioskMode.ts`, `src/ui/optionsScreen.ts`)**
  - **Arquivos**: `src/systems/kioskMode.ts`, `src/ui/optionsScreen.ts`
  - **Ação**:
    - Adicionar seletor nas Opções para auto-reset de totem: 30s, 60s, 120s ou Infinito (padrão).
    - Retorno seguro para o menu principal com demonstração autônoma.

- [ ] **38.9 Suíte de Testes Automatizados da Fase 38 (`tests/phase38_pwa_achievements.test.ts`)**
  - **Arquivos**: `tests/phase38_pwa_achievements.test.ts`
  - **Ação**:
    - Testes unitários para `AchievementSchema` e persistência via Zod.
    - Validação de gatilhos e cálculo de progresso de conquistas.
    - Testes de telemetria local e ciclo de vida do PWA.

---

## 🧪 Estratégia de Testes

1. Executar `tests/phase38_pwa_achievements.test.ts` para validação isolada de conquistas, storage e telemetria.
2. Executar `tests/pwa.test.ts` para verificar integridade do manifesto e service worker.
3. Executar `npm test` garantindo regressão zero na suíte global (327+ testes).
