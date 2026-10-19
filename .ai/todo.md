# Plano de Implementação — Fase 49: Qualidade, Testes & Pipeline de CI

Status: Concluído  
Data: 2026-10-19  
Alvo: v1.15.0

---

## 🔬 Diagnóstico e Escopo da Fase 49

1. **Reorganização de Testes por Domínio (`tests/`)**:
   - Atualmente, existem 62 suítes de testes concentradas na raiz de `tests/`.
   - Agrupar arquivos em subdiretórios semânticos mantendo o nome das fases dentro do bloco `describe`:
     - `tests/player/` (`controls.test.ts`, `oxygen.test.ts`, `physics.test.ts`, `swimmingRipples.test.ts`, `phase28_biological_proportions.test.ts`, `phase40_whale_pitch_biomechanics.test.ts`, `phase41_whale_slice_deformation.test.ts`, `phase42_pectoral_fin.test.ts`, `phase43_puppet_rig.test.ts`, `phase44_high_frame_sprites.test.ts`).
     - `tests/audio/` (`audioModules.test.ts`, `audioSoundtrack.test.ts`, `phase36_audio_mastering.test.ts`).
     - `tests/ui/` (`accessibility.test.ts`, `share.test.ts`, `phase26_accessibility_compliance.test.ts`, `phase32_typography_hierarchy.test.ts`, `phase33_resolutions_responsiveness.test.ts`, `phase34_ui_polish.test.ts`).
     - `tests/systems/` (`biomeLifecycle.test.ts`, `canyon.test.ts`, `cumulativeStats.test.ts`, `currentsOxygen.test.ts`, `f3Diagnostics.test.ts`, `faunaSprites.test.ts`, `gamepadSystem.test.ts`, `haptics.test.ts`, `krill.test.ts`, `leaderboard.test.ts`, `leaderboardApi.test.ts`, `particlePool.test.ts`, `powerup.test.ts`, `presentationMode.test.ts`, `procedural.test.ts`, `pwa.test.ts`, `state.test.ts`, `topography.test.ts`, `weather.test.ts`, `weeklyChallenge.test.ts`, `visuals.test.ts`, `visual_phase20.test.ts`, `phase29_atmosphere_sky.test.ts`, `phase30_seabed_lighting.test.ts`, `phase31_particles_biome_hud.test.ts`, `phase35_visual_systems.test.ts`, `phase38_pwa_telemetry.test.ts`, `phase39_performance_culling.test.ts`, `proceduralSnapshots.test.ts`).
     - `tests/core/` (`config.test.ts`, `dataSchema.test.ts`, `education_phase21.test.ts`, `levelLayout.test.ts`, `quiz.test.ts`, `scenesModular.test.ts`, `storageSchemas.test.ts`, `phase25_infra.test.ts`, `phase27_marketing_i18n.test.ts`, `phase37_code_quality.test.ts`, `phase37_residuals.test.ts`, `phase45_type_safety.test.ts`, `phase46_bundle_performance.test.ts`, `phase47_pwa_versioning.test.ts`, `phase48_architecture_decomposition.test.ts`, `phase49_quality_ci.test.ts`).
   - Atualizar caminhos relativos de importação (`../../src/` e `../../package.json`) e garantir execução integral via Vitest.

2. **Limiares de Cobertura de Código (`vitest.config.ts`)**:
   - A cobertura global atual atinge ~46% de linhas, ~40% de ramos e ~45% de funções.
   - Definir limiares mínimos em `test.coverage.thresholds` para impedir regressões no CI:
     - `lines: 45`
     - `functions: 45`
     - `branches: 38`
     - `statements: 45`

3. **Workflow de CI Completo (`.github/workflows/ci.yml`)**:
   - Incluir verificação estrita de tipagem via `tsc --noEmit` separada antes dos testes.
   - Incluir verificação de segurança de dependências com `npm audit --audit-level=high`.
   - Garantir execução das etapas em jobs otimizados para PRs e pushes em `main` e `develop`.

4. **Snapshots Visuais Determinísticos**:
   - Criar teste de snapshot procedural em `tests/systems/proceduralSnapshots.test.ts` utilizando PRNG com semente (`createDeterministicRandomGenerator` de `src/utils/random.ts`).
   - Gerar matriz determinística de biomas, relevo oceânico e distribuição de obstáculos, garantindo reprodutibilidade idêntica a cada execução.

5. **Auditoria de Dependências & Dependabot**:
   - Criar arquivo `.github/dependabot.yml` configurando checagens semanais para pacotes `npm` e `github-actions`.
   - Adicionar passo de auditoria de vulnerabilidades ao workflow de CI.

6. **Script Agregador `npm run check` (`package.json`)**:
   - Criar comando unificado `"check"` no `package.json`:
     `npm run format:check && npm run lint && npm run validate:data && tsc --noEmit && npm run test && npm run build`
   - Permitir a verificação local completa e sem atrito em um único comando.

7. **Suíte de Testes da Fase 49 (`tests/core/phase49_quality_ci.test.ts`)**:
   - Validar estruturação dos diretórios de testes por domínio, integridade do `dependabot.yml`, limiares do `vitest.config.ts`, script `check` no `package.json` e snapshots determinísticos.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Reorganização de Testes por Domínio (`tests/`)

- [x] **1.1 Estruturar Diretórios Semânticos em `tests/`**
  - **Ação**: Criar pastas `tests/player/`, `tests/systems/`, `tests/ui/`, `tests/audio/`, `tests/core/`.
  - **Validação**: Verificar criação das pastas via listagem de diretórios.

- [x] **1.2 Migrar e Adequar Testes de Jogador (`tests/player/`)**
  - **Arquivos**: Mover `controls.test.ts`, `oxygen.test.ts`, `physics.test.ts`, `swimmingRipples.test.ts`, `phase28_biological_proportions.test.ts`, `phase40_whale_pitch_biomechanics.test.ts`, `phase41_whale_slice_deformation.test.ts`, `phase42_pectoral_fin.test.ts`, `phase43_puppet_rig.test.ts`, `phase44_high_frame_sprites.test.ts`.
  - **Ação**: Ajustar caminhos de importação relativa (`../../src/`) mantendo os `describe` originais.
  - **Validação**: `npx vitest run tests/player/`.

- [x] **1.3 Migrar e Adequar Testes de Áudio (`tests/audio/`)**
  - **Arquivos**: Mover `audioModules.test.ts`, `audioSoundtrack.test.ts`, `phase36_audio_mastering.test.ts`.
  - **Ação**: Ajustar caminhos relativos de importação.
  - **Validação**: `npx vitest run tests/audio/`.

- [x] **1.4 Migrar e Adequar Testes de UI (`tests/ui/`)**
  - **Arquivos**: Mover `accessibility.test.ts`, `share.test.ts`, `phase26_accessibility_compliance.test.ts`, `phase32_typography_hierarchy.test.ts`, `phase33_resolutions_responsiveness.test.ts`, `phase34_ui_polish.test.ts`.
  - **Ação**: Ajustar caminhos relativos de importação.
  - **Validação**: `npx vitest run tests/ui/`.

- [x] **1.5 Migrar e Adequar Testes de Sistemas (`tests/systems/`)**
  - **Arquivos**: Mover `biomeLifecycle.test.ts`, `canyon.test.ts`, `cumulativeStats.test.ts`, `currentsOxygen.test.ts`, `f3Diagnostics.test.ts`, `faunaSprites.test.ts`, `gamepadSystem.test.ts`, `haptics.test.ts`, `krill.test.ts`, `leaderboard.test.ts`, `leaderboardApi.test.ts`, `particlePool.test.ts`, `powerup.test.ts`, `presentationMode.test.ts`, `procedural.test.ts`, `pwa.test.ts`, `state.test.ts`, `topography.test.ts`, `weather.test.ts`, `weeklyChallenge.test.ts`, `visuals.test.ts`, `visual_phase20.test.ts`, `phase29_atmosphere_sky.test.ts`, `phase30_seabed_lighting.test.ts`, `phase31_particles_biome_hud.test.ts`, `phase35_visual_systems.test.ts`, `phase38_pwa_telemetry.test.ts`, `phase39_performance_culling.test.ts`.
  - **Ação**: Ajustar caminhos relativos de importação.
  - **Validação**: `npx vitest run tests/systems/`.

- [x] **1.6 Migrar e Adequar Testes de Core e Infra (`tests/core/`)**
  - **Arquivos**: Mover `config.test.ts`, `dataSchema.test.ts`, `education_phase21.test.ts`, `levelLayout.test.ts`, `quiz.test.ts`, `scenesModular.test.ts`, `storageSchemas.test.ts`, `phase25_infra.test.ts`, `phase27_marketing_i18n.test.ts`, `phase37_code_quality.test.ts`, `phase37_residuals.test.ts`, `phase45_type_safety.test.ts`, `phase46_bundle_performance.test.ts`, `phase47_pwa_versioning.test.ts`, `phase48_architecture_decomposition.test.ts`.
  - **Ação**: Ajustar caminhos relativos de importação.
  - **Validação**: `npx vitest run tests/core/`.

---

### Etapa 2: Limiares de Cobertura de Código (`vitest.config.ts`)

- [x] **2.1 Adicionar Thresholds de Cobertura**
  - **Arquivo**: `vitest.config.ts`.
  - **Ação**: Configurar `test.coverage.thresholds` com limites mínimos de `lines: 45`, `functions: 45`, `branches: 38`, `statements: 45`.
  - **Validação**: `npm run coverage` executa e passa com sucesso pelos thresholds.

---

### Etapa 3: Workflow de CI Completo (`.github/workflows/ci.yml`)

- [x] **3.1 Integrar `tsc --noEmit` e `npm audit` no CI**
  - **Arquivo**: `.github/workflows/ci.yml`.
  - **Ação**: Adicionar etapas para validação estrita de tipagem (`npx tsc --noEmit`) e auditoria de vulnerabilidades (`npm audit --audit-level=high`).
  - **Validação**: Validar sintaxe do YAML e execução local simulada dos comandos.

---

### Etapa 4: Snapshots Visuais Determinísticos

- [x] **4.1 Criar Teste de Snapshot Procedural Determinístico**
  - **Arquivo**: `tests/systems/proceduralSnapshots.test.ts`.
  - **Ação**: Usar PRNG com semente fixa (`createDeterministicRandomGenerator`) para gerar snapshot reproduzível de relevo oceânico, fauna e biomas.
  - **Validação**: `npx vitest run tests/systems/proceduralSnapshots.test.ts`.

---

### Etapa 5: Auditoria de Dependências & Dependabot

- [x] **5.1 Criar Configuração do Dependabot**
  - **Arquivo**: `.github/dependabot.yml`.
  - **Ação**: Configurar monitoramento semanal de dependências `npm` e `github-actions`.
  - **Validação**: Validar estrutura e sintaxe do arquivo YAML.

---

### Etapa 6: Script Agregador `npm run check`

- [x] **6.1 Adicionar Script `check` em `package.json`**
  - **Arquivo**: `package.json`.
  - **Ação**: Adicionar script `"check": "npm run format:check && npm run lint && npm run validate:data && tsc --noEmit && npm run test && npm run build"`.
  - **Validação**: Executar `npm run check` com 100% de sucesso.

---

### Etapa 7: Suíte de Testes da Fase 49 e Documentação

- [x] **7.1 Implementar Suíte Automatizada da Fase 49**
  - **Arquivo**: `tests/core/phase49_quality_ci.test.ts`.
  - **Ação**: Validar estrutura das subpastas de teste, thresholds do Vitest, presença do `dependabot.yml`, script `check` e snapshots determinísticos.
  - **Validação**: `npx vitest run tests/core/phase49_quality_ci.test.ts`.

- [x] **7.2 Atualizar `docs/ROADMAP.md` e `CHANGELOG.md`**
  - **Arquivos**: `docs/ROADMAP.md`, `CHANGELOG.md`.
  - **Ação**: Atualizar notas e marcação das tarefas.

---

### Etapa 8: Validação Geral de Qualidade e Build

- [x] **8.1 Execução de Verificação Unificada**
  - **Comando**: `npm run check` (0 erros, 0 avisos, 100% aprovação).
