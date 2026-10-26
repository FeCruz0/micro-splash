# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.21.0] - 2026-10-22 — Tutorial Mimético & Baleia-Guia Autônoma (Fase 56)

### Adicionado & Modificado

- **Entidade da Baleia-Guia Autônoma (`src/entities/companionWhale.ts`)**:
  - Implementação da Mãe-Guia Antártica para aprendizado mimético nos primeiros 3.200m da rota migratória com sprite `baleia` oficial em escala 0.85x, tom azul-ardósia escurecido (`color(140, 165, 195)`) e colisor ativo `k.area` (`91.8 × 35.7` px).
  - **Física Hidrodinâmica Direcional Idêntica ao Jogador**:
    - Giro vertical lento: controle gradual de arfagem limitado por `GAME_CONFIG.ROTATION_SPEED * 0.75 * dt` (~90°/s) ao manobrar em direção a cardumes, fendas ou cruzeiro, sem guinadas instantâneas.
    - Impulso vetorial direcional: empuxo muscular das batidas de cauda (`stroke_down` e `stroke_up`) aplicado estritamente no vetor apontado `vec2(cos θ, sin θ)`.
    - Fase de planeio (`glide`) por inércia hidrodinâmica pura com arrasto aquático (`WATER_DRAG = 0.985`) e afundamento natural suave (`SINK_RATE`), eliminando qualquer deslize lateral.
  - **Colisão Física Sólida com Gelo**:
    - Registro de corpo físico `k.body()` e deslocamento com `companion.move(...)`, bloqueando travessia sólida contra a calota estática (`ice_block`).
    - Manipulador `handleIceCollision`: anulação de velocidade ascendente e nivelamento horizontal de rotação no contato.
  - **Mecânicas Ecológicas Espelho**:
    - Alimentação real por filtração: detecção sensorial de `TAGS.KRILL` e consumo destruindo a entidade, emitindo som `playKrillGulp`, animação `feed` e restauração de oxigênio.
    - Ciclo pulmonar de oxigênio: depleção biológica e busca autônoma de fendas na banquisa polar (`getNearestIceGap`), com subida à superfície, borrifo duplo com som e recarga completa.
    - Biosonar funcional 360°: varredura acústica com ondas visuais concêntricas e revelação de itens, krills e obstáculos no escuro através de `revealEntitiesInSonarRadius`.
  - **Repouso Estacionário Permanente (`RESTING`)**:
    - Ao concluir a jornada pedagógica antártica (~3.150m), transiciona para o estado de repouso, desacelera suavemente até parar (`currentSpeed -> 0`), assume a animação `idle_swim` e permanece contemplativa no cenário, eliminando qualquer desaparecimento abrupto (`k.destroy` removido).
- **Densidade Ampliada de Krill (`src/systems/proceduralObstacles.ts`)**:
  - Elevação na Antártica de 12–15 para 20–24 cardumes de krill, provendo alimento abundante simultâneo para demonstração pedagógica e consumo do jogador.
  - Inserção de cardumes suplementares na Travessia Pelágica e nos Cânions de Ressurgência.
- **Configurações, Persistência e Acessibilidade (`src/schemas/storageSchemas.ts`, `src/systems/companionTutorialSettings.ts`, `src/ui/options/controlsOptionsTab.ts`)**:
  - Schemas Zod `CompanionTutorialSeenSchema` e `CompanionTutorialEnabledSchema` com persistência segura em `localStorage`.
  - Alternador acessível na aba de controles das Opções com suporte nativo a navegação por teclado.
- **Suíte de Testes Automatizados da Fase 56 (`tests/entities/companionWhale.test.ts`)**:
  - 18 testes unitários cobrindo persistência, colisor `k.area`, corpo `k.body()`, consumo real de krill, depleção/recarga de oxigênio em fendas, emissão de sonar com revelação ativa, reações de colisão com gelo/obstáculos, giro vertical gradual, impulso direcional na orientação corporal e estado de repouso permanente sem destruição.

---

## [1.18.0] - 2026-10-20 — Otimização Extrema de Frame Time & Taxa de Quadros (Fase 53)

### Adicionado & Modificado

- **Throttling & Caching de Atualizações Globais (Fase 53.1)**:
  - `src/scenes/gameScene.ts`: Extração e cache de `camPos()`, `width()` e `height()` da câmera uma única vez por quadro no início do loop principal, eliminando chamadas redundantes de viewport.
  - `src/systems/oceanEnvironment.ts`: Dirty-checking com limiar de 5 metros (`isOceanColorDirty`, `resetOceanColorsCache`) na atualização de cores oceânicas, eliminando 12 lerps e 4 instanciações de `k.rgb()` na maioria dos frames.
- **Culling Espacial Acelerado & Pausa Fora de Tela (Fase 53.2)**:
  - `src/systems/spatialCullingSystem.ts`: Remoção de entidades destruídas via swap-and-pop O(1) em substituição a `splice(index, 1)`. Pausa de execução (`paused = !isVisible`) propagada para atores fora do frustum horizontal da câmera.
- **Reutilização de Buffers e Redução de Pressão no GC (Fase 53.3)**:
  - `src/entities/player/playerSliceRenderer.ts`: Suporte a `targetBuffer` mutado in-place em `calculateWhaleSliceTransforms`, eliminando alocações anônimas de objetos e arrays a cada frame.
  - `src/entities/player.ts`: Pré-alocação e reutilização contínua de buffer estático no pipeline de renderização da baleia.
  - `src/entities/krill.ts`: Refatoração da cinemática e atração dos boids de cardumes para matemática escalar pura (`relX`, `relY`), poupando centenas de vetores Kaboom por segundo.
  - `src/systems/marineSnowSystem.ts`: Mutação in-place em loop indexado reaproveitando resultado estático sem alocar novos pares de coordenadas.
- **Short-Circuit de Clima e Lista Ativa Densa no ParticlePool (Fase 53.4)**:
  - `src/systems/particlePool.ts`: Implementação de listas ativas densas `activeCircleIndices` e `activeRectIndices` gerenciadas via swap-and-pop bidirecional O(1); loops de atualização agora iteram estritamente partículas vivas; cálculo de estatísticas tornado O(1).
  - `src/systems/weatherSystem.ts`: Flags de controle de estado (`wasBlizzardActive`, `wasGaleActive`, `wasSolarCalmActive`) para short-circuit imediato de emissores atmosféricos quando o clima for inativo ou limpo.
- **Roteamento de Emissões Residuais para ParticlePool (Fase 53.5)**:
  - `src/systems/breachSystem.ts` e `src/systems/weatherSystem.ts`: Redirecionamento de sparkles do salto, micro-bolhas subaquáticas, gotas de reentrada e respingos de chuva para `getParticlePool()?.spawnCircle` / `spawnRect`.
- **Métricas de Frame Time p95/p99 no Overlay de Telemetria F3/F8 (Fase 53.6)**:
  - `src/ui/debugDistance.ts`: Buffer circular de 120 amostras de frame time e função pura `calculateFrameTimeMetrics` computando média, mediana, p95, p99 e tempo máximo em milissegundos. Exibição da contagem de entidades visíveis vs ocultadas (culled).
- **Suíte de Testes da Fase 53 (Fase 53.7)**:
  - `tests/systems/phase53_frame_time_optimization.test.ts`: Suíte de testes automatizados com 8 cenários cobrindo reutilização de buffers, lista ativa do pool, dirty checking oceânico, estatísticas de latência e swap-and-pop do culling.

## [1.16.0] - 2026-10-20 — Polimento Visual & Áudio Retrô (Chiptune Preservado) (Fase 51)

### Adicionado & Modificado

- **Pipeline Unificada de Renderização da Baleia (Fase 51.1)**:
  - `src/entities/player/playerRenderPipeline.ts`: Criado coordenador determinístico `executeWhaleRenderPipeline` integrando em sequência de execução estrita e auditável: 1. Cinemática do Puppet Rig (cadeia esquelética de 4 nós) -> 2. Fatiamento Sagital acoplado à onda viajante -> 3. Hidroplanos Peitorais (diedro e perspectiva) -> 4. Paleta de Fôlego.
  - `src/entities/player.ts`: Substituição de chamadas sequenciais dispersas no loop de update pelo snapshot imutável `WhaleRenderPipelineSnapshot`, eliminando jitter entre camadas e sincronizando nadadeiras peitorais e fatias sagitais.
- **Paleta Centralizada por Estado de Fôlego (Fase 51.2)**:
  - `src/entities/player/playerBreathPalette.ts`: Centralização da colorimetria (`getWhaleBreathColor`) mapeando deterministicamente os estados da jubarte (calm/normal, warning/âmbar, critical/alerta pulsante, trapped/púrpura mecânico e fainting/anóxia fosca) com suporte nativo a alto contraste (`prefers-contrast`).
  - Aplicação unificada da paleta no corpo principal e nas nadadeiras ventrais.
- **Padronização de Transições de UI (Fase 51.3)**:
  - `src/ui/animationUtils.ts`: Criação do conjunto de tokens `UI_TRANSITIONS` (`MODAL_ENTER_DURATION: 0.25`, `MODAL_EXIT_DURATION: 0.18`, `FADE_SCENE_DURATION: 0.35`, `BUTTON_HOVER_SCALE: 1.04`, `TOAST_DURATION: 3.0`) e função de saída simétrica com easing `animateModalExit`.
- **Calibração de Ganho e Dinâmica Retrô (Fase 51.4)**:
  - `src/systems/audio/audioEngine.ts`: Calibrado ganho master para 1.0 (eliminando boost saturador de 1.35x contra o limiter de -6dB), preservando headroom transparente para SFX e trilhas sintetizadas sem distorção ou bombeamento do compressor.
- **Crossfade Chiptune entre Biomas (Fase 51.5)**:
  - `src/systems/audio/audioMusic.ts`: Implementados `setBiomeWithCrossfade(targetBiome, crossfadeDuration)` e `getCurrentBiome()`, aplicando curvas de ganho suaves e interpolação harmônica durante a transição entre biomas com andamento fixo de 75 BPM.
- **Otimização de Fontes e Precache PWA (Fase 51.6)**:
  - `index.html`: Priorização do formato moderno WOFF2 (`Inter-Bold.woff2`) com fallback TTF e política `font-display: swap`.
  - `public/sw.js`: Inclusão do asset WOFF2 no array `PRECACHE_ASSETS` para carregamento instantâneo offline em totens.
- **Suíte de Testes da Fase 51 (Fase 51.7)**:
  - `tests/player/phase51_player_render_pipeline.test.ts`, `tests/audio/phase51_audio_mix.test.ts`, `tests/ui/phase51_ui_transitions.test.ts`: 18 novos testes unitários garantindo estabilidade, pureza e ausência de regressões.

## [1.15.0] - 2026-10-19 — Acessibilidade & Internacionalização Avançadas (Fase 50)

### Adicionado & Modificado

- **Auditoria de Contraste WCAG 2.1 AA (Fase 50.1)**:
  - `src/utils/contrast.ts`: Criado módulo de cálculo de luminância relativa conforme W3C WCAG 2.1 e razão de contraste determinística (`calculateContrastRatio`, `isWcagAaCompliant`), validando conformidade para textos regulares (>= 4.5:1) e grandes (>= 3.0:1).
  - Validação de elementos visuais do HUD, badges e modais sobre fundos translúcidos e oceânicos garantindo taxas superiores a 10:1.
- **Gestão de Foco em Modais & Focus Trap (Fase 50.2)**:
  - `src/ui/keyboardNav.ts`: Implementada pilha de foco (`pushFocusSnapshot`, `popFocusSnapshot`, `clearFocusStack`, `getFocusStackDepth`) com suporte à restauração automática de foco ao fechar modais (`restoreFocusOnDestroy: true`).
- **Paridade Total de Chaves i18n (Fase 50.3)**:
  - `src/i18n/locales/`: Validada paridade estrita de 100% das chaves entre `pt-BR.json`, `en-US.json` e `gn.json` (Guarani Nhandewa), com zero chaves órfãs ou faltantes.
- **Formatação Acessível via `Intl` (Fase 50.4)**:
  - `src/i18n/i18n.ts`: Adicionados formatadores baseados na API padrão ECMAScript `Intl` (`formatNumber`, `formatDistance`, `formatDate`) mapeando as tags BCP-47 (`pt-BR`, `en-US`, `gn`).
  - `src/utils/navigation.ts` e `src/ui/hudSystem.ts`: Integração da formatação localizada em `formatHudDistance`, `toNauticalMiles` e `formatDualDistance`.
- **Suporte a Movimento Reduzido nos Subsistemas Recentes (Fase 50.5)**:
  - `src/entities/player/playerSliceRenderer.ts`: Atenuação de 75% da amplitude da onda viajante e flexão angular sagital quando `accessibilitySystem.isReducedMotion()` for verdadeiro.
  - `src/entities/player/playerPectoralFin.ts`: Atenuação suave de ângulo diedro, batimento peitoral e rolagem sob movimento reduzido.
  - `src/entities/player/playerPuppetRig.ts`: Amortecimento do ângulo de ataque hidrodinâmico e rotações angulares da cadeia esquelética caudal.
- **Suíte de Testes da Fase 50 (Fase 50.6)**:
  - `tests/ui/phase50_accessibility_i18n.test.ts`: Suíte completa com 16 testes automatizados cobrindo luminância, foco LIFO, paridade i18n, formatação `Intl` e atenuação por movimento reduzido.

## [1.14.0] - 2026-10-19 — Decomposição Arquitetural, Qualidade & Pipeline de CI (Fases 45 a 49)

### Adicionado & Modificado

- **Qualidade, Testes & Pipeline de CI (Fase 49)**:
  - `tests/`: Reorganização completa das 62 suítes de testes em subdiretórios semânticos por domínio (`player/`, `audio/`, `ui/`, `systems/`, `core/`), preservando o nome das fases nos blocos `describe` e mantendo a raiz limpa com apenas `setup.ts`.
  - `vitest.config.ts`: Definição de thresholds mínimos de cobertura de código (`lines: 45`, `functions: 45`, `branches: 38`, `statements: 45`) para blindar contra regressões.
  - `.github/workflows/ci.yml`: Pipeline de CI fortalecido com verificação estrita de tipagem TypeScript (`npx tsc --noEmit`) e auditoria de vulnerabilidades (`npm audit --audit-level=high`).
  - `tests/systems/proceduralSnapshots.test.ts`: Suíte de snapshots determinísticos com PRNG baseado em semente fixa (`createDeterministicRandomGenerator`), validando invariância numérica e estrutural de relevo e obstáculos.
  - `.github/dependabot.yml`: Configuração automatizada para monitoramento semanal de dependências do ecossistema `npm` e `github-actions`.
  - `package.json`: Criação do comando agregador `"check"`, executando em passo único `format:check`, `lint`, `validate:data`, `tsc --noEmit`, `test` e `build`.
  - `tests/core/phase49_quality_ci.test.ts`: Suíte de 8 testes automatizados validando a arquitetura de testes, thresholds, integridade do CI e Dependabot.

- **Decomposição Arquitetural & Organização de Módulos (Fase 48)**:
  - `src/ui/codexScreen.ts` e `src/ui/optionsScreen.ts`: Decomposição modular reduzindo o tamanho de telas monolíticas para menos de 300 linhas, extraindo navegação e cabeçalhos para submódulos (`src/ui/codex/codexNavigation.ts`, `src/ui/options/optionsNavigation.ts`).
  - `src/entities/player.ts`: Modularização da física de drift oceânico (`playerDrift.ts`), iluminação e cáusticos ventrais (`playerCaustics.ts`) e gerenciamento de armadilhas/redes e colisão (`playerCollision.ts`).
  - `src/scenes/assetLoader.ts`: Criação de carregador centralizado de recursos eliminando registros inline de atlas e animações em `src/main.ts`.
  - `src/systems/audio/index.ts` e `src/systems/audioSystem.ts`: Padronização de responsabilidades unificando o subsistema de áudio como fachada canônica.
  - `src/types/leaderboard.ts`: Segregação de tipos e contratos de placar, desacoplando o sistema local do serviço de API remota (`leaderboardApi.ts`).
  - `src/ui/`: Reorganização estrutural em subdiretórios semânticos com index barrels (`screens/`, `modals/`, `hud/`, `shared/` e `src/ui/index.ts`).
  - `src/config.ts`: Segmentação de domínio com constantes nomeadas para física do jogador, opacidades de acessibilidade e ambiente.
  - `scripts/shared/pngWriter.mjs`: Utilitário compartilhado de geração de PNG nativo via ESM, migrando scripts de atlas, ícones PWA e service worker para `.mjs`.
  - `tests/phase48_architecture_decomposition.test.ts`: Suíte com 13 testes automatizados validando contratos estruturais, integridade de barrels e scripts ESM.

- **PWA Versionado, Precache Completo & Tela Offline (Fase 47)**:
  - `vite.config.ts`: Adicionado plugin `pwaVersionPlugin` para injeção automática da versão do `package.json` em `dist/sw.js`.
  - `public/sw.js`: Sincronizado `CACHE_NAME` com versionamento semântico (`micro-splash-v${version}`); expandido `PRECACHE_ASSETS` para incluir `/about.html`, `/offline.html`, `/data/facts.json`, `/data/quiz.json` e `/sprites/fauna_manifest.json`.
  - Implementada função de poda de cache LRU (`trimCache`) limitando o cache dinâmico a 60 entradas máximas para prevenir vazamento de memória em totens.
  - `public/offline.html`: Criada tela de contingência offline estilizada com estética glassmórfica, paleta oceânica profunda e botão tátil de reconexão sem diálogos nativos.
  - `tests/phase47_pwa_versioning.test.ts`: 8 testes automatizados validando integridade de cache, precache completo e semântica offline.
- **Code-Splitting e Chunks Vendor Rollup (Fase 46.1)**:
  - `vite.config.ts`: Configurado `build.rollupOptions.output.manualChunks` para segregar `vendor_kaboom` (129.9 kB) e `vendor_zod` (83.7 kB).
  - `src/scenes/menuScene.ts`: Substituídos imports estáticos por carregamento sob demanda com `await import(...)` para `modeSelectScreen`, `optionsScreen`, `codexScreen` e `leaderboardScreen`.
  - `src/ui/mainMenu.ts`: Carregamento dinâmico assíncrono para o modal coletivo `statsModal`.
  - `src/ui/victoryScreen.ts`: Carregamento dinâmico assíncrono para `quizModal`, `shareModal` e `victoryCard`.
  - `src/ui/challengeEndScreen.ts`: Carregamento dinâmico de `quizModal`, `shareModal` e `victoryCard`.
  - `src/ui/codexScreen.ts`: Carregamento dinâmico de `quizModal` e `onboardingModal`.
  - Otimização do bundle: chunk principal de produção reduzido em mais de 61% (de 588.4 kB para 226.1 kB), eliminando os alertas de chunk size do Rollup/Vite.
- **Ativação Global de Modo Estrito TypeScript (Fase 45.1)**:
  - `tsconfig.json`: Habilitados `"strict": true`, `"strictNullChecks": true` e `"noImplicitAny": true` em todo o código-fonte.
- **Regra Estrita de Ausência de `any` no ESLint (Fase 45.2 & 45.6)**:
  - `eslint.config.js`: Promovida a regra `@typescript-eslint/no-explicit-any` para `"error"`. Adicionados ambientes/globals para scripts Node (`scripts/**/*.cjs`), Cloudflare Worker (`server/**/*.js`) e Service Worker (`public/sw.js`).
  - `package.json`: Script `lint` expandido para cobrir `src`, `tests`, `scripts`, `server` e `public/sw.js`.
- **Barramento Unificado de Telemetria e Erros (Fase 45.4)**:
  - `src/utils/errorReporter.ts`: Barramento canônico unificado integrando níveis de severidade (`information`, `warning`, `error`), listeners e bridge para Sentry/offline.
  - `src/services/errorReporter.ts`: Transformado em reexportação canônica preservando 100% de compatibilidade reversa.
- **Sanitização de Acesso a Armazenamento Local (Fase 45.5)**:
  - `src/utils/storage.ts`: Implementada a função pura `removeLocalStorageItemsByPrefix`, eliminando o acesso direto residual a `localStorage.*` em `src/systems/accessibilitySystem.ts`.
- **Correções Globais de Linting em Scripts e Workers**:
  - `scripts/*.cjs`, `server/cloudflare-worker/worker.js`, `public/sw.js`: Corrigidas variáveis não utilizadas, atribuições redundantes e variáveis de ambiente globais.
- **Suíte de Testes da Fase 45**:
  - `tests/phase45_type_safety.test.ts`: 7 testes automatizados validando type safety, ausência de `Math.random` e acessos diretos a `localStorage`.

---

## [1.13.7] - 2026-10-17 — Spritesheet de Alta Fluidez & Animação Harmônica (Fase 44)

### Adicionado & Modificado

- **Expansão do Spritesheet da Baleia para 16 Quadros (Fase 44.1)**:
  - `public/sprites/whale.png`: Ampliação do spritesheet anatômico da jubarte de 8 para 16 quadros de alta resolução, incorporando poses detalhadas de subida e descida caudal, distensão gular e arqueamento dorsal.
- **Interpolador Harmônico de Estados de Nado (Fase 44.2)**:
  - `src/entities/player/playerAnimation.ts`: Implementação de interpolador que calcula transições harmônicas contínuas entre quadros baseando-se no vetor de velocidade e cadência física.
- **Suíte de Testes da Fase 44 (Fase 44.3)**:
  - `tests/player/phase44_high_frame_sprites.test.ts`: Validação de integridade das dimensões, ordenação dos framesets e interpolação harmônica.

---

## [1.13.6] - 2026-10-16 — Articulação Multissegmentar de Cauda & Flukes Puppet Rig (Fase 43)

### Adicionado & Modificado

- **Decomposição Hierárquica em Nós Cinemáticos (Fase 43.1)**:
  - `src/entities/player/playerPuppetRig.ts`: Estruturação do esqueleto da baleia em 4 juntas cinemáticas (`cranialThorax` ➔ `abdominalSpine` ➔ `caudalPeduncle` ➔ `flukeBlade`), dividindo o corpo entre líder cinemático e seguidor inercial amortecido.
- **Ângulo de Ataque Dinâmico dos Flukes (Fase 43.2)**:
  - Cálculo trigonométrico do ângulo ótimo de ataque da lâmina caudal contra o fluxo de fluido para gerar sustentação e empuxo realistas.
- **Suíte de Testes da Fase 43 (Fase 43.3)**:
  - `tests/player/phase43_puppet_rig.test.ts`: Cobertura completa de estabilidade cinemática, ausência de jitter e cálculo de forças.

---

## [1.13.5] - 2026-10-15 — Nadadeiras Peitorais Independentes & Hidrodinâmica de Diedro (Fase 42)

### Adicionado & Modificado

- **Camadas Peitorais Independentes com Diedro e Projeção 2.5D (Fase 42.1)**:
  - `src/entities/player/playerPectoralFin.ts`: Criação de nadadeiras peitorais brancas independentes com diedro adaptativo, oscilação por batimento e ordenação por camadas de profundidade.
- **Enflechamento Hidrodinâmico e Vórtices Peitorais (Fase 42.2)**:
  - Variação do ângulo de enflechamento em altas velocidades e emissão de vórtices hidrodinâmicos nas pontas das nadadeiras.
- **Suíte de Testes da Fase 42 (Fase 42.3)**:
  - `tests/player/phase42_pectoral_fin.test.ts`: Testes de diedro, projeção em perspectiva e emissão de vórtices.

---

## [1.13.4] - 2026-10-14 — Deformação Sagital por Fatiamento Segmentado (Fase 41)

### Adicionado & Modificado

- **Fatiamento Vertical Ribbon e Onda Viajante (Fase 41.1 & 41.2)**:
  - `src/entities/player/playerSliceRenderer.ts`: Renderizador que divide o corpo em tiras sagitais verticais acopladas a uma onda senoidal viajante, produzindo ondulação corporal orgânica.
  - Suporte a atenuação de 75% da amplitude quando o modo de movimento reduzido estiver habilitado.
- **Suíte de Testes da Fase 41 (Fase 41.3)**:
  - `tests/player/phase41_whale_slice_deformation.test.ts`: Testes da discretização das fatias e propagação contínua da onda.

---

## [1.13.3] - 2026-10-12 — Biomecânica de Arfagem, Curvatura Espinhal & Deriva de Maré (Fase 40)

### Adicionado & Modificado

- **Biomecânica de Arfagem e Curvatura Espinhal (Fase 40.1)**:
  - `src/entities/player.ts`: Rotação dinâmica de arfagem baseada na aceleração vertical e curvatura da coluna dorsal.
- **Balanço Oceânico e Deriva Orbital (Fase 40.2)**:
  - `src/entities/player/playerDrift.ts`: Simulação de ondas superficiais e maré aplicando suave deriva orbital na jubarte quando em repouso.
- **Suíte de Testes da Fase 40 (Fase 40.3)**:
  - `tests/player/phase40_whale_pitch_biomechanics.test.ts`: Cobertura de cálculos de arfagem, inércia e deriva.

---

## [1.13.2] - 2026-10-10 — Culling Espacial de Frustum & Otimização de Renderização (Fase 39)

### Adicionado & Modificado

- **Sistema de Culling Espacial com Margens de Histerese (Fase 39.1)**:
  - `src/systems/spatialCullingSystem.ts`: Monitoramento de viewport com histerese (margens de 200px) desativando a renderização de entidades fora de tela.
- **Otimização O(1) do Jogador e Culling de Fauna/Gelo (Fase 39.2)**:
  - Substituição de `k.get("player")` por singleton ativo; registro de fauna decorativa e blocos de gelo no gerenciador de ciclo de vida.
- **Suíte de Testes da Fase 39 (Fase 39.3)**:
  - `tests/systems/phase39_performance_culling.test.ts`: Testes de margens de histerese e culling determinístico.

---

## [1.13.1] - 2026-10-08 — PWA Telemetria Offline, Modo Totem & Diagnóstico FPS (Fase 38)

### Adicionado & Modificado

- **Gerenciador PWA e Instalação (Fase 38.1)**:
  - `src/utils/pwaManager.ts` & `src/ui/pwaInstallModal.ts`: Suporte completo a instalação PWA e modo standalone.
- **Overlay de Diagnóstico F3 e Badge de FPS (Fase 38.2)**:
  - `src/systems/f3Diagnostics.ts`: Painel de telemetria em tempo real com taxa de quadros, tempo de frame e métricas.
- **Suíte de Testes da Fase 38 (Fase 38.3)**:
  - `tests/systems/phase38_pwa_telemetry.test.ts`: Testes de registro de telemetria, diagnóstico F3 e ciclo PWA.

---

## [1.13.0] - 2026-10-06 — Qualidade de Código & Consistência Técnica Visual (Fase 37)

### Adicionado & Modificado

- **Spawn Independente de Taxa de Quadros (Fase 37.1)**:
  - `src/systems/upwellingSystem.ts` & `src/systems/oceanCurrentsSystem.ts`: Normalizadas probabilidades de spawn de jatos de ressurgência, cardumes de krill e partículas de fluxo hidrodinâmico pelo fator `deltaTime * 60`, assegurando geração invariante em monitores de 60Hz, 120Hz ou 144Hz+.
- **Centralização de `prefers-reduced-motion` com `safeShake` (Fase 37.2)**:
  - `src/utils/camera.ts`: Criado helper `safeShake(k, intensity)` consultando o subsistema de acessibilidade; substituídas chamadas diretas de `k.shake()` em `upwellingSystem.ts`, `oceanCurrentsSystem.ts`, `iceSurface.ts`, `breachSystem.ts` e `shipNoiseSystem.ts` para suprimir tremores em modo reduzido.
- **Adoção Unificada de `attachButtonHoverEffect` (Fase 37.3)**:
  - `src/ui/challengeEndScreen.ts`: Substituídos listeners manuais de `onHoverUpdate`/`onHoverEnd` pelo utilitário padronizado com transições táteis e realce cromático consistente.
- **Nomenclatura Explícita e Clean Code (Fase 37.4)**:
  - Renomeadas variáveis crípticas em múltiplos módulos: `currentX` → `initialXPosition` e `dir` → `movementDirection` em `shipNoiseSystem.ts`; `rad` → `angleInRadians` em `breachSystem.ts`; `btn`/`idx` → `button`/`buttonIndex` em `gamepadSystem.ts`.
- **Utilitário Tipado de Persistência com Schemas Zod (Fase 37.5)**:
  - `src/utils/storage.ts`: Desenvolvidas funções puras `readLocalStorageWithSchema<T>`, `writeLocalStorage<T>` e `removeLocalStorageItem` com validação de schemas em tempo de execução e tolerância a falhas.
- **Remoção de Usos Residuais de `any` (Fase 37.6)**:
  - `src/systems/audio/audioEngine.ts`: Tipados timers com `ReturnType<typeof setInterval>` e extensões de `Window` com `webkitAudioContext`.
  - `src/systems/breachSystem.ts` & `src/systems/shipNoiseSystem.ts`: Tipados elementos de interface e resíduos com `GameObj`.
  - `src/systems/gamepadSystem.ts`: Tipado evento com `GamepadEvent`.
- **Guardas de Ambiente no `AudioEngine` (Fase 37.8)**:
  - `src/systems/audio/audioEngine.ts`: Adicionadas guardas de ambiente `typeof window !== "undefined"` e `typeof localStorage !== "undefined"` para evitar exceções em SSR e suítes de teste.
- **Logs e Telemetria Estruturada com Níveis (Fase 37.9)**:
  - `src/utils/errorReporter.ts`: Centralização de emissão de mensagens com severidade (`information`, `warning`, `error`), suporte a ouvintes, supressão em testes e ponte com o serviço de telemetria `errorReporter`.
- **Gerador Pseudoaleatório Determinístico (Fase 37.10)**:
  - `src/utils/random.ts`: Implementado algoritmo Mulberry32 com injeção de semente arbitrária para testes determinísticos e métodos utilitários `getRandomFloat`, `getRandomInteger` e `getRandomChoice`.
- **Suíte de Testes da Fase 37**:
  - `tests/phase37_code_quality.test.ts`: 9 testes automatizados cobrindo persistência com Zod, determinismo do PRNG, guarda de movimento reduzido no `safeShake` e controle de telemetria.

---

## [1.12.0] - 2026-10-06 — Masterização & Espacialização de Áudio (Fase 36)

### Adicionado & Modificado

- **Limiter no Barramento Master (Fase 36.1)**:
  - `src/systems/audio/audioEngine.ts`: Inserido `DynamicsCompressorNode` (threshold `-6dB`, ratio `12`, attack `3ms`, release `250ms`) conectado entre o `masterGain` e o `destination` para prevenir saturação acústica (clipping) em picos com múltiplos SFX simultâneos.
- **Rampas de Ganho Suaves sem Cliques (Fase 36.2)**:
  - `src/systems/audio/audioEngine.ts`: Substituídos os saltos instantâneos de `setValueAtTime` por interpolação assintótica `setTargetAtTime(valor, now, 0.05)` nos controles de volume, comutação de mudo, pausa de áudio ambiente e trocas de trilha, eliminando estalos audíveis.
- **Crossfade Gradual entre Modos de Trilha Sonora (Fase 36.3)**:
  - `src/systems/audio/audioEngine.ts`: Aplicada constante de tempo de `0.2s` (~0.6s de transição completa) no `ambientGain` e motor de biomas ao alternar dinamicamente entre Chiptune 16-Bit, Ambiente Contemplativa e Modo Foco.
- **Panning Estéreo 2D por Coordenada Espacial (Fase 36.4)**:
  - `src/systems/audio/audioSFX.ts` & `src/systems/audioSystem.ts`: Implementado algoritmo de balanço estéreo com `StereoPannerNode` limitado em `[-1, 1]` baseado na posição relativa `(sourceX - playerX) / 400`. Integrado espacialmente aos sons de sucção de krill, impacto em plástico, emaranhamento de redes, quebra de gelo, espirros d'água, vazamento de óleo, cliques de golfinhos, chilreios de pinguins e buzinas graves de navios cargueiros.
- **Reverb Subaquático Convolutivo & Filtro Passa-Baixas por Profundidade (Fase 36.5)**:
  - `src/systems/audio/audioEngine.ts`: Barramento de efeitos com resposta ao impulso convolutiva procedural marinha (`1.8s`, decaimento exponencial `3.2`, blend dry/wet `0.78 / 0.22`) e filtro `BiquadFilterNode` modulado em tempo real pela profundidade do mergulho da jubarte (8.000Hz na lâmina d'água até 1.200Hz nas fossas abissais).
- **Pausa Automática no Gerenciamento de Ciclo de Vida da Aba (Fase 36.6)**:
  - `src/systems/audio/audioEngine.ts`: Adicionado listener para `document.visibilitychange` suspendendo o `AudioContext` ao minimizar ou ocultar a aba e restabelecendo-o graciosamente ao retornar, prevenindo gasto desnecessário de CPU e descontinuidade sonora.
- **Loop de Ruído Oceânico Contínuo sem Costura (Fase 36.7)**:
  - `src/systems/audio/audioEngine.ts`: Aplicado crossfade de blend de 50ms nos extremos do buffer de ruído marrom de 4 segundos, eliminando cliques periódicos na reprodução contínua da ambiência submarina.

---

## [1.11.0] - 2026-10-06 — Polimento Visual dos Sistemas Ausentes (Fase 35)

### Adicionado & Modificado

- **Jatos de Ressurgência em Leque com Gradiente de Opacidade (Fase 35.1)**:
  - `src/systems/upwellingSystem.ts`: Substituído o retângulo rígido e bordas grossas por um sistema orgânico de feixes ascendentes em leque (6 filamentos com 3 segmentos cada), com dispersão angular (`-7°` a `+7°`), cores turquesa-luminosas e gradiente vertical de opacidade (base densa `0.55`, meio `0.35`, topo etéreo `0.18`), além de ondulação senoidal e preservação da física de colisão.
- **Kelp Bentônico com Gradiente de Cor por Altura e Exposição Solar (Fase 35.2)**:
  - `src/systems/benthicFloorSystem.ts`: Implementada função `calculateKelpSegmentColor` com interpolação linear contínua dos nós da alga, variando do marrom-escuro de fixação rochosa na base (`rgb(55, 35, 15)`) até as folhas dourado-esverdeadas no topo (`rgb(110, 130, 40)`), refletindo o fototropismo marinho real.
- **Anêmonas Bentônicas com Pulsação Rítmica e Tentáculos Vivos (Fase 35.3)**:
  - `src/systems/benthicFloorSystem.ts`: Animação de pulsação respiratória senoidal em anêmonas (escala vertical oscilando entre `0.85` e `1.15` em ciclo de ~2.5s) acompanhada por tentáculos periféricos radiantes oscilando em contra-fase.
- **Linhas de Fluxo Visíveis em Correntes Oceânicas (Fase 35.4)**:
  - `src/systems/oceanCurrentsSystem.ts`: Renderização de 5 vetores horizontais translúcidos (`rect 42×2.5px`, tom oceanográfico `rgb(100, 150, 200, 0.25)`) com deslocamento contínuo na direção da corrente (tanto favorável quanto contrária), tornando o perigo/impulso visível e intuitivo para o jogador.
- **Traineira de Pesca Artesanal no Setor Urbano com Rede Lançada (Fase 35.5)**:
  - `src/entities/boat.ts` & `src/systems/shipNoiseSystem.ts`: Criação do barco pesqueiro `createFishingTrawler` (60×20px) com cabine de comando, mastro central, braço de guincho com carretel de tração e rede de arrasto suspensa na popa entrando na água, conferindo contexto narrativo autêntico à presença de redes na Costa Urbana.
- **Refluxo de Espuma Circular ao Quebrar Blocos de Gelo (Fase 35.6)**:
  - `src/systems/iceSurface.ts`: Adicionadas 6–8 partículas circulares brancas (`circle 3–6px`, opacidade 0.9, gravidade 480px/s²) simulando respingos espumosos de água do mar gelada espirrada no impacto de quebra do gelo polar, diferenciadas dos estilhaços cristalinos retangulares.

---

## [1.10.0] - 2026-10-05 — Telas de Jogo: Visual & Polimento de UI (Fase 34)

### Adicionado & Modificado

- **Animações Fluidas de Entrada em Modais (Fase 34.1)**:
  - `src/ui/animationUtils.ts`: Criado o utilitário universal `animateModalEntrance` com tween suave de escala (`0.85 → 1.0`) e opacidade progressiva via `easeOutBack`, aplicado nos modais de Seleção de Modo, Opções, Diário de Bordo (Codex), Vitória e Resgate da Guarda Marítima.
- **Splash Screen com Logo Bicolor Animado Letra por Letra (Fase 34.2)**:
  - `src/ui/splashScreen.ts`: Redesenhado o título "MICRO-SPLASH" com entrada progressiva letra por letra (`k.wait`), cores alternadas em Turquesa cintilante (`#38bdf8`) e Branco Polar (`#ffffff`), hífen dourado e subtítulo enriquecido com ícones náuticos (`⚓ A JORNADA DA BALEIA-JUBARTE 🐋`).
- **Barco de Resgate com Riqueza de Detalhes Náuticos (Fase 34.3)**:
  - `src/entities/boat.ts`: Casco enriquecido com mastro vertical metálico, flâmula triangular verde-amarela com oscilação física de vento, faixa diagonal de salvamento laranja (`rgb(249, 115, 22)`) da Guarda Marítima e gerador de esteira de espuma d'água (scia) na popa em movimento.
- **Chuva de Confetes Oceânicos na Tela de Vitória (Fase 34.4)**:
  - `src/ui/animationUtils.ts` & `src/ui/victoryScreen.ts`: Disparo celebratório único de confetes rotativos em tons oceânicos (turquesa, ouro solar, branco espuma, verde esmeralda e azul celeste) com gravidade suave ao concluir a migração.
- **Micro-interações Táteis & Hover Consistente em Botões (Fase 34.5)**:
  - `src/ui/animationUtils.ts`: Utilitário padronizado `attachButtonHoverEffect` com expansão suave (`1.0 → 1.04`), realce de iluminação e cursor `pointer` aplicado aos botões do Menu Principal, Opções, Modos, Diário e Vitória.
- **Cards Visuais Temáticos de Seleção de Modo (Fase 34.6)**:
  - `src/ui/modeSelectScreen.ts`: Interface estilizada com cards temáticos por modo (Serena em verde relaxante, Difícil em coral desafiador, Desafio Semanal em roxo crepuscular e Rápido em âmbar esportivo), com previews de o que esperar e badges informativos.
- **Diário de Bordo com Progresso por Bioma & Barra de Rota (Fase 34.7)**:
  - `src/ui/codexScreen.ts`: Adicionadas estatísticas de descobertas por bioma (`❄️ Antártica`, `🌊 Travessia`, `🏭 Urbana`, `🌀 Cânions`, `☀️ Santuário`), barra de progresso horizontal 100% da rota com marcadores nos pontos de fatos e emojis de identificação em cada card.
- **Loading Overlay Suave ao Alternar Resolução (Fase 34.8)**:
  - `src/ui/animationUtils.ts` & `src/ui/optionsScreen.ts`: Transição com fade-out preto cinematográfico em `z: 9999` antes de recarregar a tela após alteração de configurações gráficas.
- **Redesign & Polimento da Tela de Resgate (Fase 34.9)**:
  - `src/ui/rescueScreen.ts`: Modal de derrota reformulado para formato ultra-limpo e compacto (800×340px) com remoção da caixa de texto narrativa, 4 cards visuais padronizados (`📏 Distância`, `⭐ Pontuação`, `🏆 Recorde`, `🦐 Krill & Tempo`), cabeçalho oficial com badge da Guarda Marítima e botão destacado com atalhos Enter/Espaço.
- **Espaçamento e Harmonia Visual do Menu Principal (Fase 34.10)**:
  - `src/ui/mainMenu.ts`: Reorganização vertical completa eliminando sobreposição do Recorde Histórico sobre o primeiro botão, ampliação da distância entre botões (de 6px para 14px de respiro líquido), elevação do título/subtítulo e badge dourado estilizado para o recorde.
- **Harmonia Geométrica & Correção de Overflow na Tela de Opções (Fase 34.11)**:
  - `src/ui/optionsScreen.ts`: Integração do indicador de proporção diretamente dentro do botão de resolução eliminando colisão com os botões de borda/tela cheia, reformulação do guia de controles em 2 linhas com largura delimitada para não vazar do card e redistribuição equilibrada dos botões de ação e rodapé de conformidade LGPD.
- **Remoção de Container Redundante no Diário de Bordo (Fase 34.12)**:
  - `src/ui/codexScreen.ts`: Eliminação da caixa retangular de fundo intermediária (`contentBoxBg`), acabando com a sensação de "caixa dentro de caixa"; expansão proporcional da largura dos cards de espécies, fatos da rota e conservação (460px), com bordas e contrastes aprimorados repousando diretamente sobre o card do modal.

---

## [1.9.0] - 2026-10-02 — Sistema de Resoluções, Modos de Tela & Responsividade (Fase 33)

### Adicionado & Modificado

- **Presets de Alta Resolução 16:9 Cristalinos (4K, 1440p, 1080p) (Fase 33.1)**:
  - `src/config.ts`: Adicionados presets de alta fidelidade `"4K"` (`3840×2160` UHD) e `"1440p"` (`2560×1440` QHD), mantendo o padrão `"1080p"` (FHD) como padrão do sistema.
  - Remoção intencional de resoluções com distorção de aspecto (`tablet_portrait`, `ultrawide21`, `ultrawide32`) e de baixa resolução (`720p`, `540p` equilibrado e `450p` retrô clássico) para garantir fidelidade visual e ausência total de achatamento de sprites.
- **Detecção Automática de Resolução Nativa (Fase 33.2)**:
  - `src/config.ts`: Criada a rotina `detectNativeResolution` e preset virtual `"auto"` exibindo dinamicamente a resolução real do monitor (ex.: `Auto (Detectado: 1920×1080) 🔍`).
- **Modo Letterbox com Barras Protetoras e Cores Customizáveis (Fase 33.4)**:
  - `src/systems/letterboxSystem.ts`: Criado overlay com 4 barras fixas em `z: 999` com alternância cíclica de cores: Preto (`#000000`) ou Azul Oceânico (`#06122a`), sincronizando com o background do DOM.
- **Persistência de Resolução por Dispositivo (Fase 33.6)**:
  - `src/config.ts`: Chave de armazenamento individualizada `micro_splash_resolution_${width}x${height}` impedindo que configurações de telas diferentes no mesmo navegador se sobreponham.
- **Preview de Proporção em Tempo Real nas Opções (Fase 33.7)**:
  - `src/ui/optionsScreen.ts`: Tag visual dinâmica calculando e exibindo a proporção de aspecto (ex.: `Proporção: 16:9 • 1920×1080`) a cada ciclo no seletor.
- **Indicador de Resolução Ativa no HUD F3 (Fase 33.8)**:
  - `src/ui/debugDistance.ts`: Exibição da linha `Tela: W×H (Modo)` no painel de diagnóstico técnico F3.
- **Testes & Qualidade**:
  - `tests/phase33_resolutions_responsiveness.test.ts`: Nova suíte de testes cobrindo proporções matemáticas 16:9, detecção automática, persistência por tela, letterbox overlay e telemetria F3.
  - Cobertura total de 44 arquivos de teste e 290 testes unitários passando 100%.

---

## [1.8.0] - 2026-10-02 — Tipografia, Texto & Hierarquia Visual (Fase 32)

### Adicionado & Modificado

- **Fontes Customizadas Google Fonts (Fase 32.1)**:
  - `index.html`: Importação otimizada das famílias `Orbitron:wght@500;700;800;900` e `Inter:wght@400;500;600;700`.
  - `src/config.ts`: Exportadas as constantes centrais `FONT_TITLE = "Orbitron"` e `FONT_BODY = "Inter"` para unificação tipográfica do jogo.
- **Hierarquia Tipográfica Unificada (Fase 32.2)**:
  - `src/config.ts`: Definição de design tokens padronizados: `TEXT_SIZE_DISPLAY = 44px`, `TEXT_SIZE_H1 = 24px`, `TEXT_SIZE_H2 = 18px`, `TEXT_SIZE_BODY = 14px` e `TEXT_SIZE_CAPTION = 11px`.
- **Sombras de Legibilidade em UI (Fase 32.3)**:
  - `src/ui/textUtils.ts`: Criado o utilitário `addShadowedText` aplicando offset escuro (+1.5px, opacidade 0.75) sob textos de títulos em modais contra fundos marinhos dinâmicos.
  - Aplicado nas telas `splashScreen.ts`, `modeSelectScreen.ts` e `rescueScreen.ts`.
- **Quebra de Linha Adaptativa em Fatos Científicos (Fase 32.4)**:
  - `src/ui/factPopup.ts`: Cálculo adaptativo de largura `Math.min(500, k.width() - 80)` evitando transbordamento em telas compactas (450p retrô ou mobile) com espaçamento de linha aprimorado.
- **Formatação de Distância em Milhas Náuticas (Fase 32.5)**:
  - `src/utils/navigation.ts`: Módulo de navegação marítima com constantes internacionais (`METERS_PER_NAUTICAL_MILE = 1852`) e funções `toNauticalMiles` e `formatDualDistance` (ex.: `"14.238m • 7,7 mn"`).
  - Integrado no HUD (`src/ui/hudSystem.ts`) e na tela de resgate (`src/ui/rescueScreen.ts`).
- **Nomenclatura Harmonizada dos Biomas (Fase 32.6)**:
  - `src/ui/hudSystem.ts`: Sincronização rigorosa dos nomes e emojis dos 5 biomas (`❄️ Oceano Antártico`, `🌊 Travessia Pelágica`, `🏭 Costa Urbana`, `🌀 Cânions & Ressurgência`, `☀️ Santuário de Arraial`).
- **Tom Narrativo e Imersivo na Tela de Resgate (Fase 32.7)**:
  - `src/ui/rescueScreen.ts`: Substituição de linhas planas de depuração por narrativa infantil acolhedora da jornada e resgate da jovem baleia, com chips de pontuação e recorde.
- **Componente Visual de Teclas Físicas Mecânicas (Fase 32.8)**:
  - `src/ui/keyBadge.ts`: Criação do helper `createKeyBadge` desenhando teclas em 3D tátil (`[ESPAÇO]`, `[ENTER]`) com chanfro, contorno e rótulos iluminados na tela de apresentação e modais.
- **Testes & Qualidade**:
  - `tests/phase32_typography_hierarchy.test.ts`: Nova suíte com 11 testes cobrindo conversão náutica, hierarquia de escala de texto, consistência de biomas, utilitários de sombra e key badges.
  - Cobertura total de 43 arquivos de teste e 279 testes unitários passando 100%.

---

## [1.7.0] - 2026-10-02 — Partículas, Coerência de Bioma & Polimento de Interface (Fase 31)

### Adicionado & Modificado

- **Splash de Re-entrada Dramática após o Breach (Fase 31.1)**:
  - `src/systems/breachSystem.ts`: Implementadas a função pura `calculateBreachReentryParticleData` e a rotina `createBreachReentrySplash` disparando 24 partículas brancas retangulares (`rect 3×8px`) com contorno ciano em arco balístico simétrico (12 para a esquerda e 12 para a direita) com gravidade calculada de 620 px/s² e ondas concêntricas de choque.
  - `src/entities/player/playerPhysics.ts`: Disparo automático do splashdown de reentrada ao penetrar a superfície com velocidade descendente Y > 200 ou com breach ativo.
- **Rastro de Bolhas da Batida de Cauda (Fase 31.2)**:
  - `src/entities/player/playerParticles.ts`: Implementadas a função pura `calculateTailStrokeBubbleData` e a rotina `spawnTailStrokeBubbles` emitindo de 5 a 8 micro-bolhas translúcidas (`circle 2–4px`) que sobem em direção à superfície (`vel.y = -20 a -40 px/s`) alinhadas à cauda da jubarte.
  - `src/entities/player.ts`: Conexão direta com a física muscular da batida de cauda submarina.
- **Plâncton Bioluminescente Discreto de Ambiente (Fase 31.3)**:
  - `src/systems/bioluminescenceSystem.ts`: Implementadas `isAmbientPlanktonActive` e `calculateAmbientPlanktonOpacity`, adicionando 24 pontos estáticos de dinoflagelados espalhados na área de visão submersa entre 12.000m e 25.000m pulsando organicamente com `sin(tempo + fase) * 0.4`.
- **Paletas de Obstáculos Contextuais por Bioma (Fase 31.4)**:
  - `src/entities/trash.ts`: Exportada função `getBiomeTrashPalette` aplicando cores contextuais a garrafas PET, sacolas e copos (cinza-azulado polar na Antártica, azul oceânico no Pelágico, vermelho saturado com grafite na Costa Urbana e laranja solar desbotado em Arraial do Cabo), preservando alto contraste WCAG.
  - `src/entities/net.ts`: Exportada função `getBiomeNetPalette` calibrando redes e boias (verde-cinza polar, azul ciano pelágico, malha oliva industrial costeira e turquesa vivo em Arraial do Cabo).
- **Zonas de Transição Suave e Easing de Biomas (Fase 31.5)**:
  - `src/systems/biomeTransitionSystem.ts`: Criado utilitário com `calculateBiomeTransitionFactor` (interpolação smoothstep nos primeiros e últimos 300m de cada bioma).
  - `src/systems/benthicFloorSystem.ts`: Modulação suave de opacidade e altura/escala de Kelp gigante, algas vermelhas, pradarias de ervas marinhas, crostas de Lithothamnion e corais nas fronteiras de 5.000m, 12.000m, 19.000m e 25.000m.
- **Partículas Temáticas do Menu Principal (Fase 31.6)**:
  - `src/ui/mainMenu.ts`: Cenário do menu enriquecido com 3 categorias oceânicas: bolhas ascendentes com contorno leve, plâncton luminoso em ângulo de 45° com pulsação suave, e mini-águas-vivas/medusas com contração elástica.
- **HUD de Distância & Indicador de Bioma (Fase 31.7)**:
  - `src/ui/hudSystem.ts`: Container translúcido no topo esquerdo (`k.fixed()`, `z: 110`) exibindo progresso formatado (`14.238m • 47%`) e identificação contextual do bioma com emoji (❄️ Antártica, 🌊 Pelágico, 🏭 Costa Urbana, 🌀 Cânions, ☀️ Arraial do Cabo).
- **Barra de Oxigênio com 3 Estados Visuais de Urgência (Fase 31.8)**:
  - `src/ui/hudSystem.ts`: Barra de fôlego com 3 estados reativos: **>50%** azul calmo sereno; **20–50%** âmbar pulsante com tremor; **<20%** vermelho crítico intermitente com tremor acentuado e vinheta periférica avermelhada na tela (`z: 109`).
- **Cursor de Navegação Oceânico (Fase 31.9)**:
  - `index.html`: Estilização nativa em CSS via Data URIs SVG: bolha turquesa translúcida com reflexo especular como cursor padrão e âncora náutica estilizada no hover de botões e links.
- **Testes & Qualidade**:
  - `tests/phase31_particles_biome_hud.test.ts`: Criada nova suíte com 8 testes cobrindo balística de reentrada, bolhas caudais, dinoflagelados, paletas de bioma, curvas smoothstep e estados do HUD.
  - Cobertura de 42 arquivos e 265 testes unitários passando 100%.

---

## [1.6.0] - 2026-10-01 — Fundo Submarino, Iluminação & Identidade dos Obstáculos (Fase 30)

### Adicionado & Modificado

- **Geologia Procedural do Fundo Oceânico**:
  - `src/systems/oceanFloorSystem.ts`: Implementadas funções puras `generateReliefPolygonPoints` e `generateReliefCapPolygonPoints` com silhuetas especializadas e diferenciadas para cada tipo geológico de relevo:
    - **Moraina**: Cristas serrilhadas e recortadas de cascalho glacial polar.
    - **Monte Submarino**: Perfil cônico vulcânico pronunciado com ápice abissal.
    - **Banco de Areia**: Curvas de dunas suaves com platô aplanado e declive gradual.
    - **Paredões do Cânion**: Escarpas fraturadas quase verticais com fraturas graníticas.
    - **Arrecifes**: Plataformas carbonáticas com cavidades rasas na enseada.
- **Flora Bentônica por Bioma**:
  - `src/systems/benthicFloorSystem.ts`: Enriquecimento da vegetação submarina por contexto ecológico:
    - **Antártica**: Algas vermelhas polares (_Rhodophyta_) com lâminas flexíveis e ondulação senoidal suave (`sin(time)`).
    - **Pelágico**: Preservada a vastidão afótica e ausência de flora fotossintética nas profundezas.
    - **Costa Urbana**: Pradarias de ervas marinhas cinza-esverdeadas (_Halodule_) com fragmentos de micro-plásticos coloridos emaranhados em suas bases.
    - **Arraial do Cabo**: Expansão sistemática de nódulos e crostas rosadas/aroxeadas de _Lithothamnion_ ao longo de toda a enseada.
- **Neve Marinha Abissal (_Marine Snow_)**:
  - `src/systems/marineSnowSystem.ts`: Criado novo sistema simulando a precipitação orgânica contínua de micro-sedimentos oceânicos (16 partículas, `circle 1–1.8px`, tom cinza-azulado `rgb(120, 140, 160)`) na coluna d'água da Travessia Pelágica (5.000m a 12.000m) com deriva lateral e velocidade terminal suave.
- **Iluminação Volumétrica (_God Rays_)**:
  - `src/systems/lightRaysSystem.ts`: Feixes volumétricos alargados para 8px a 18px (`calculateGodRayWidth`) com opacidade base atenuada para 0.04–0.06 e variação fotossensível por bioma, eliminando o aspecto de tiras sólidas e criando volumetria etérea e fluida.
- **Escuridão Progressiva com Profundidade**:
  - `src/systems/depthDarknessSystem.ts`: Criado novo sistema que sobrepõe overlay abissal `rgb(0, 10, 25)` em camada fixa `z: 8` com opacidade proporcional ao mergulho da baleia (`calculateDepthDarknessOpacity`), reproduzindo a absorção real da luz com o avanço vertical Y.
- **Halo Solar do Espiráculo na Respiração**:
  - `src/entities/player/playerParticles.ts`: Adicionado efeito de refração solar elíptica (`circle 30px`, branco, `opacity: 0.20`) na lâmina da água (`SEA_LEVEL`) ao romper a superfície para respirar, expandindo e sumindo em 0.5s.
- **Mancha de Óleo com 3 Camadas Iridescentes**:
  - `src/systems/oilSpillSystem.ts`: Reconstrução do vazamento industrial com 3 camadas físicas:
    1. Base densa de petróleo bruto viscoso `rgb(8, 5, 5)` com `opacity: 0.90`.
    2. Película iridescente central com cálculo químico senoidal `calculateIridescentOilColor` alternando azul cobalto, verde esmeralda e violeta.
    3. Micro-gotículas de espuma emulsionada nas bordas da contaminação.
- **Gelo Glacial Cristalino & Estratificado**:
  - `src/systems/iceSurface.ts`: Blocos de gelo aprimorados com 3 faixas horizontais de estratificação cristalina compactada, bordas superior e de fusão inferior translúcidas (`opacity: 0.40`) e 3–4 veias diagonais de azul glacial profundo cruzando cada bloco.
- **Testes Automatizados**:
  - `tests/phase30_seabed_lighting.test.ts`: Nova suíte de testes com 11 especificações cobrindo geologia procedural, flora bentônica, neve marinha, raios solares, escuridão progressiva e iridescência de hidrocarbonetos (totalizando 255 testes 100% aprovados).

---

## [1.5.0] - 2026-09-29 — Superfície, Céu & Atmosfera (Fase 29)

### Adicionado & Modificado

- **Superfície Marítima Viva & Rebentação**:
  - `src/systems/waterSurfaceSystem.ts`: Implementada linha d'água ondulada e orgânica composta por colisor físico contínuo (`TAGS.SURFACE`) e 14 segmentos verticais interconectados com ondulação harmônica senoidal desfasada e crista de espuma branca translúcida (`opacity: 0.38`).
  - `src/systems/coastalSurfSystem.ts`: Adicionado sistema de ondas e espuma costeira para a aproximação e chegada em Arraial do Cabo (>= 24.800m), com filetes de rebentação flutuantes deslizando suavemente pela superfície da Enseada dos Anjos.
- **Fenômenos Celestiais e Atmosféricos por Bioma**:
  - `src/systems/auroraSystem.ts`: Criado sistema de Aurora Austral (_Lights Australis_) com 6 cortinas de luz verticais ondulantes em verde-esmeralda e magenta sobre o céu polar antártico (0–5.000m), com respiração luminosa suave.
  - `src/systems/parallaxSkySystem.ts`: Adicionado pôr do sol estratificado em 5 camadas de gradiente crepuscular na Travessia Pelágica (5.000–12.000m): azul-crepúsculo escuro, lilás, rosa coral, âmbar alaranjado e dourado solar rasante.
  - `src/systems/parallaxSkySystem.ts`: Adicionado disco lunar marfim suave com halo difuso e coluna de 5 filetes luminosos de reflexo aquático na Costa Urbana noturna (12.000–19.000m).
  - `src/systems/parallaxSkySystem.ts`: Nuvens elegantes e harmoniosas em formato horizontal suave, com deriva dinâmica de vento e tonalidade adaptativa por bioma.
- **Fauna Aérea Específica**:
  - `src/systems/parallaxSkySystem.ts`: Aves marinhas diferenciadas com anatomia autêntica por bioma: Albatroz-viajante com envergadura colossal de 44px e planeio majestoso; Fragata-magnífica com plumagem escura e cauda bifurcada em tesoura; Garça-branca com pescoço em S e pernas estendidas sobre a rebentação costeira.
- **Horizonte Oceânico Inferior**:
  - `src/systems/abyssalFogSystem.ts`: Adicionadas 4 camadas graduais de névoa abissal na base da tela (`opacity: 0.12, 0.24, 0.42, 0.70`), dissolvendo o leito oceânico suavemente nas trevas e eliminando cortes secos.
- **Testes Automatizados**:
  - `tests/phase29_atmosphere_sky.test.ts`: Nova suíte de testes com 8 especificações cobrindo todos os sistemas atmosféricos, de superfície e de fauna aérea (totalizando 244 testes 100% aprovados).

---

## [1.4.0] - 2026-09-29 — Proporcionalidade Biológica & Redesenho de Entidades (Fase 28)

### Adicionado & Modificado

- **Proporcionalidade Biológica das Criaturas**:
  - `src/systems/penguinFlockSystem.ts`: Pinguins-de-Magalhães recalibrados para proporção anatômica autêntica (corpo `14×5px`, ventre branco `10×2.5px`, bico `3×1.5px`, nadadeiras poligonais e pés escuros), com bando compacto e dinâmico (~18px de espaçamento inter-aves).
  - `src/systems/dolphinDraftingSystem.ts`: Golfinhos-rotadores reduzidos para escala de `28×9px` com ventre claro `20×3.2px`, rostro delgado `5.5×2.5px`, barbatana dorsal falcada e offsets de formação em escalão calibrados para drafting suave ao lado da jubarte (108px).
  - `src/systems/backgroundFauna.ts`: Cachalote abissal redefinido com proporção anatômica imponente e escala biológica `0.95` (renderizando `182×59px` a partir do frame 192×64px com cabeça quadrada de espermacete profunda e maciça, representando ~19m e 50 toneladas contra os 14m/120px da jubarte do jogador). Ponto de emissão dos cliques do espermacete calibrado para a frente do focinho (`pos.x + 84`).
  - `src/systems/backgroundFauna.ts`: Berçário no Santuário ajustado com escala `0.66` para a mãe (`95×32px`) e escala `0.26` para o filhote (`38×13px`, exatos ~40% da mãe, condizente com filhote do ano real de 5m), com nado sincronizado em escalão e bolhas de acolhimento.
  - `src/systems/shipNoiseSystem.ts`: Navio cargueiro expandido para escala industrial imponente de `280×50px`, linha d'água `280×14px` em camada `z: -2` (`opacity: 0.88`), chaminé monumental `35×45px` com anel de topo `42×10px`, 9 vigias iluminadas e ejeção de resíduos na esteira da popa.
- **Redesenho de Obstáculos & Elementos Interativos**:
  - `src/entities/trash.ts`: 3 variantes procedurais realistas com hitboxes calibradas: garrafa PET (`11×22px` com gargalo estreito `6×4px` e área `11×26px`), sacola plástica (`20×17px` com alças e área `20×19px`) e embalagem/copo amassado (`circle(10px)`).
  - `src/entities/net.ts`: Rede fantasma enriquecida com malha monofilamento realista, cabo superior de sustentação (floatline), 4 boias de pesca de deriva, grade de linhas cruzadas e nós de interseção.
  - `src/entities/bubbleVent.ts`: Bolsão de ar dotado de núcleo etéreo pulsante central com anéis luminosos orgânicos (`circle 22px` e `12px`), pulsação harmônica contínua e atenuação em estado de resfriamento.
- **Correções & Refinamentos Visuais**:
  - `src/systems/canyonSystem.ts`: Isolamento dos 8 degraus de colisão física das rampas do Boqueirão com a tag dedicada `"boqueirao_rock_collider"`, impedindo interferência de sistemas visuais.
  - `src/entities/player/playerSonar.ts`: Remoção do fallback de mutação direta de opacidade (`targetEntity.opacity = 1`) e restrição do eco visual exclusivamente a entidades com método `reveal()`, eliminando o bug de degraus brancos sobre o terreno ao emitir sonar.
- **Testes Automatizados**:
  - `tests/phase28_biological_proportions.test.ts`: Nova suíte de testes com 7 especificações validando todas as escalas biológicas, proporções anatômicas, componentes gráficos e transições de estado.
  - `tests/canyon.test.ts`: Teste dedicado para garantir o isolamento estrito e invisibilidade dos colisores físicos de rampa do Boqueirão (totalizando 236 testes 100% aprovados).

---

## [1.3.0] - 2026-09-28 — Marketing, Analytics, Conteúdo & Internacionalização (Fase 27)

### Adicionado

- **Compartilhamento Social & Open Graph**:
  - `index.html`: Inserção de meta tags completas Open Graph (`og:type`, `og:title`, `og:description`, `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`) e Twitter Cards (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`) com link canônico oficial.
  - `scripts/generateOgImage.cjs`: Script autônomo em Node.js puro e `node:zlib` que gera o card visual oficial `public/og-image.png` (1200×630px) com gradiente marinho profundo, feixes de luz solar, silhueta estilizada da jubarte, biomas e tipografia cristalina. Mapeado no script npm `generate:og`.
- **Landing Page Estática Educacional**:
  - `public/about.html`: Página independente, responsiva e ultraleve para escolas, feiras de ciências, aquários e totens interativos. Apresenta os 4 pilares oceanográficos do jogo, alinhamento com a BNCC, guia de modo quiosque/kiosk, atalhos de teclado e QR Code vetorial SVG para abertura instantânea em smartphones e tablets.
- **Analytics Ético & Observabilidade Segura**:
  - `src/services/analytics.ts`: Serviço de métricas agregadas via Plausible Analytics, 100% sem cookies e aderente à LGPD/GDPR. Respeita o cabeçalho `Do Not Track` (`navigator.doNotTrack`), envia eventos de forma assíncrona não bloqueante via `sendBeacon`/`fetch` e opera em modo silencioso mock offline quando não configurado.
  - Eventos tipados integrados no fluxo do jogo: `game_started`, `migration_completed`, `migration_abandoned`, `biome_reached`, `quiz_taken` e `breach_triggered`.
  - `src/services/errorReporter.ts`: Capturador de exceções não tratadas e falhas de WebGL/AudioContext com fallback silencioso para totens sem internet.
- **Content Security Policy (CSP) & Proteção Contra Injeção**:
  - Diretivas rígidas de segurança em `nginx.conf` e `public/_headers` restringindo scripts, estilos e fontes a origens seguras e bloqueando sensores desnecessários via `Permissions-Policy`.
- **CMS Lite Educacional para Professores & Pesquisadores**:
  - `tools/editor.html`: Aplicação web autônoma client-side (sem dependências de servidor) com formulários interativos, importação por drag-and-drop, validação em tempo real alinhada aos schemas Zod e exportação com 1 clique para `facts.json` e `quiz.json`.
- **Internacionalização (i18n) & Línguas Indígenas Brasileiras**:
  - `src/i18n/`: Módulo i18n com dicionários estruturados para Português (`pt-BR`), Inglês (`en-US`) e **Guarani Nhandewa (`gn`)** — valorizando o conhecimento tradicional costeiro sobre cetáceos e ecossistemas marinhos.
  - Seletor cíclico de idioma integrado ao menu de Opções (`optionsScreen.ts`) com persistência no `localStorage` sob a chave `micro_splash_locale`.
- **Testes Automatizados**:
  - `tests/phase27_marketing_i18n.test.ts`: 17 novos testes unitários e de integração validando tags Open Graph, geração do PNG 1200×630, landing page estática, serviços de analytics e erro, cabeçalhos CSP, CMS Lite e tradução multilíngue.

---

## [1.2.0] - 2026-09-28 — Documentação, Acessibilidade & Compliance (Fase 26)

### Adicionado

- **Documentação para Comunidade & Educadores**:
  - `CONTRIBUTING.md`: Guia completo de boas-vindas, setup de ambiente (Docker e Node.js 20+), padronização Conventional Commits, tabela de scripts e fluxo passo a passo para educadores e biólogos adicionarem fatos e perguntas em JSON sem necessidade de tocar em código TypeScript.
  - `docs/DATA_SCHEMA.md`: Especificação técnica detalhada dos schemas Zod (`facts.json`, `quiz.json`, `level_layout.json`), tipagens e restrições.
  - `README.md` reestruturado com badges de status (CI, Deploy Pages, Versão v1.2.0, Licença MIT, PWA e WCAG 2.1 AA), tabela de controles universais (Teclado, Touch e Gamepad) e guia de implantação em totens escolares.
- **Documentação JSDoc nos 10 Sistemas Centrais**:
  - Adição de documentação formal JSDoc com `@param`, `@returns` e fundamentos biofísicos em `oceanCurrentsSystem.ts`, `breachSystem.ts`, `particlePool.ts`, `weatherSystem.ts`, `dolphinDraftingSystem.ts`, `iceSurface.ts`, `proceduralObstacles.ts`, `penguinFlockSystem.ts`, `canyonSystem.ts` e `biomeLifecycleManager.ts`.
- **Acessibilidade Universal & WCAG 2.1 Nível AA**:
  - `src/ui/keyboardNav.ts`: Utilitário universal de gerenciamento de foco acessível (`createFocusGroup`) com suporte a `Tab`, `Shift+Tab`, setas direcionais, acionamento por `Enter`/`Espaço`, tecla `Escape` e anel visual pulsante de alto contraste.
  - Navegação por teclado integrada no Menu Principal (`mainMenu.ts`) e no Menu de Opções (`optionsScreen.ts`).
  - Suporte completo a `prefers-reduced-motion` no `accessibilitySystem.ts` (modos `auto`, `reduced`, `full`), desativando tremores de tela (`screenShake`) e flashes no gameplay para pessoas com sensibilidade vestibular.
  - Escalonamento de tamanho de fonte dinâmico na UI (3 níveis: `Pequeno 0.85x`, `Normal 1.0x`, `Grande 1.2x`).
- **Conformidade Legal & LGPD (Lei nº 13.709/2018)**:
  - `docs/PRIVACIDADE.md`: Declaração oficial de arquitetura _offline-first_ para redes de ensino públicas municipais e museus, com zero cookies, zero rastreadores e tabela exaustiva de chaves locais.
  - Botão "🗑️ Apagar Dados (LGPD)" na interface de Opções com diálogo de confirmação seguro que remove todas as chaves `micro_splash_*` do navegador e restaura as configurações de fábrica.

---

## [1.1.0] - 2026-09-25 — Infraestrutura, CI/CD & Deploy (Fase 25)

### Adicionado

- **Pipeline de Integração Contínua (CI)**:
  - Workflow GitHub Actions completo (`.github/workflows/ci.yml`) com execução em push e PR para `main` e `develop`.
  - Etapas automatizadas: formatação Prettier (`format:check`), linting ESLint (`lint`), validação de schemas Zod (`validate:data`), cobertura de testes Vitest (`coverage`) e compilação de produção (`build`).
- **Deploy Automatizado (CD)**:
  - Workflow GitHub Actions (`.github/workflows/deploy.yml`) para publicação automática no GitHub Pages com suporte nativo a PWA e job pronto para Cloudflare Pages via Wrangler.
- **Docker Multi-Stage & Nginx Otimizado**:
  - Imagem de produção `Dockerfile.prod` utilizando Node 20 Alpine para build e Nginx 1.27 Alpine para runtime.
  - Redução drástica do tamanho da imagem de ~900MB para apenas ~21.2MB.
  - Servidor `nginx.conf` dedicado com fallback SPA (`try_files`), compressão gzip, headers de segurança (CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy), cache imutável para assets estáticos e endpoint `/healthz` para checagem de saúde.
  - Arquivo `.dockerignore` otimizado.
- **Orquestração para Totens & Kiosks**:
  - Arquivo `docker-compose.prod.yml` com política de auto-recuperação `restart: always` contra quedas de energia em museus/escolas, mapeamento na porta 8080 e healthcheck integrado.
- **Variáveis de Ambiente & Versionamento Automático**:
  - Configuração de ambientes `.env.example`, `.env.development` e `.env.production` com tipagem estrita em `src/vite-env.d.ts`.
  - Injeção global da constante `__APP_VERSION__` via `vite.config.ts` alimentada dinamicamente pelo `package.json`.
  - Exibição de badge discreto de versão (`v1.1.0`) no rodapé do menu principal (`mainMenu.ts`) e no rodapé do menu de opções (`optionsScreen.ts`).

---

## [1.0.0] - 2026-09-24 — Lançamento Oficial (Release 1.0)

### Adicionado

- **Developer Experience & Qualidade de Código (Fase 24)**:
  - Configuração oficial do **ESLint 9 Flat Config** (`eslint.config.js`) com `@typescript-eslint` e desativação de conflitos via `eslint-config-prettier`.
  - Padronização de código com **Prettier** (`.prettierrc.json`) e validação via script `npm run format:check`.
  - Pre-commit hooks com **Husky** e **lint-staged** para garantir que nenhum commit entre sem formatação ou com testes quebrados.
  - Relatório visual de cobertura de testes com **`@vitest/coverage-v8`** via `npm run coverage` (formatos text, JSON e HTML).
  - Validação estrita de dados educacionais com **Zod** (`src/schemas/dataSchemas.ts`):
    - `FactSchema` para `data/facts.json`.
    - `QuizQuestionSchema` para `data/quiz.json` (validação de 4 opções, índice correto e bioma).
    - `LevelLayoutSchema` para `data/level_layout.json`.
    - Script CLI `npm run validate:data` (`scripts/validateData.cjs`) e suíte de testes `tests/dataSchema.test.ts`.
  - Script unificado de geração de assets: `npm run generate` (spritesheet 8-frames e ícones PWA 192x192 / 512x512).
- **Qualidade Técnica & Plataformas (Fase 23)**:
  - Refatoração modular do sistema de áudio: `AudioEngine` (Web Audio API e ruído rosa ambiente), `AudioSFX` (efeitos procedurais), `AudioWhale` (síntese 3 canais dos cantos de baleia e chamados abissais) e `AudioMusic` (trilha estilo David Wise). `AudioSystem` mantido como Fachada retrocompatível.
  - Suporte nativo a Gamepad / Joystick físico via **W3C Gamepad API** (`gamepadSystem.ts`), com zona morta calibrada (0.22) e mapeamento ergonômico de nado, biosonar e pausa.
  - Telemetria de desenvolvedor (F3) expandida com histórico circular de 60 amostras, minigráfico sparkline inline em Unicode (` ▂▃▄▅▆▇█`) e alerta visual para gargalos críticos (< 45 FPS).
  - Spritesheet da Jubarte expandido para 8 frames (1024x64 px), introduzindo cinemática hidrodinâmica suave para subida, descida de propulsão e engolfamento alimentar (_feed_).
- **Progressão, Competição & Rejogabilidade (Fase 22)**:
  - Desafios Semanais comunitários determinísticos calculados por semana ISO-8601 (`YYYY-Www`) com semente determinística pseudoaleatória (FNV-1a).
  - Ranking Online Global com arquitetura _Offline-First_ (`leaderboardApi.ts`), sincronização com backend em Cloudflare Worker + KV e fallback local para totens sem internet.
  - Interface do placar com 3 abas de navegação (`Global`, `Semanal` e `Local/Totem`).
  - Emissão de **Certificado Oficial com Selo Digital de Autenticidade** no Victory Card para o modo semanal.
- **Conteúdo Educacional Expandido & Acessibilidade (Fase 21)**:
  - Banco expandido com mais de 50 perguntas pedagógicas em `data/quiz.json`, organizadas por bioma e nível de dificuldade, acessíveis opcionalmente no pós-jogo e no Codex.
  - Narração em voz acessível dos fatos ecológicos via **Web Speech API (TTS)** para crianças em fase de alfabetização.
  - Onboarding interativo em 3 slides ilustrados para primeira abertura em totens e na web.

---

## [0.9.0] - 2026-09-17 — Imersão Visual Avançada

### Adicionado

- Esteira de bioluminescência procedural ativada pela passagem da jubarte nas águas escuras da Costa Urbana.
- Vinhetas narrativas cinematográficas de 2s exibindo o nome poético de cada bioma ao cruzar marcos da rota.
- Zoom cinematográfico suave de câmera (1.3×) durante eventos narrativos de alta tensão.
- Sombra elíptica dinâmica projetada sob a baleia com escala baseada na profundidade da lâmina d'água.

---

## [0.8.0] - 2026-09-15 — Totens & Eventos Climáticos

### Adicionado

- Suporte a Progressive Web App (PWA) Offline-First para totens escolares e feiras de ciências sem dependência de internet.
- Micro-climas meteorológicos dinâmicos: nevasca polar na Antártica, céu encoberto com vendaval em alto-mar e calmaria radiante em Arraial do Cabo.

---

## [0.7.0] - 2026-09-14 — Acessibilidade & Navegação Oceânica

### Adicionado

- Dinâmica biofísica de fôlego: nado a favor da correnteza reduz o consumo de oxigênio em 35%, enquanto o nado contra o fluxo exige maior esforço físico (+35%).
- Modos de acessibilidade visual: Alto Contraste, Protanopia e Deuteranopia.
- Jukebox Oceânica comutável: Trilha 16-Bit Chiptune, Trilha Contemplativa de Hidrofones ou Modo Foco (apenas SFX).
- Feedback háptico tátil (`navigator.vibrate`) em celulares e tablets para colisões, rompimento de gelo e biosonar.

---

## [0.6.0] - 2026-09-12 — Animação Orgânica da Jubarte

### Adicionado

- Deformação corporal contínua da jubarte (_Squash & Stretch_) durante o nado muscular.
- Dinâmica de _roll_ tridimensional em perspectiva durante subidas e descidas de profundidade.
- Reflexos cáusticos procedurais de luz solar sobre a pele escura da baleia em águas rasas.

---

## [0.5.0] - 2026-09-10 — Totens & Kiosk Mode

### Adicionado

- Modo Kiosk para operação autônoma em museus, com detecção de inatividade de 60 segundos e demonstração automática atraente.
- Diário de Bordo / Codex de Biodiversidade com catálogo interativo de todos os fatos e espécies observadas.
- Modal de compartilhamento com geração de Victory Card em Canvas e classificação por estrelas.

---

## [0.4.0] - 2026-09-08 — Trilha Sonora & Ecossistemas Vivos

### Adicionado

- Trilha musical dinâmica 16-bit adaptativa sintetizada no estilo David Wise (_Donkey Kong Country_).
- Bandos de pinguins saltadores (_porpoising_), golfinhos nadando em esteira (_drafting_) e cachalote abissal em fossas marinhas.
- Cena de abertura cinematográfica animada com título estilizado e logotipo do jogo.

---

## [0.3.0] - 2026-09-05 — Cânions Submarinos & Obstáculos

### Adicionado

- Cânions submarinos de Arraial do Cabo com corrente ascendente de ressurgência (ACAS).
- Obstáculos antropogênicos: redes de pesca fantasmas e manchas de óleo com filme iridescente.
- Correntes marinhas horizontais e verticais empurrando o jogador.

---

## [0.2.0] - 2026-09-02 — Mecânicas Centrais & Menus

### Adicionado

- Sistema de Biosonar / Ecolocalização com onda expansiva para revelar obstáculos no escuro.
- Mecânica de oxigênio e fôlego: mergulhos profundos drenam fôlego; saltos na superfície renovam o ar.
- Menu Principal com seletor de modos (Modo Clássico, Desafio Sereno com oxigênio infinito e Mar Aberto).

---

## [0.1.0] - 2026-08-30 — Fundação Inicial

### Adicionado

- Física de nado baseada em impulsos de batida de cauda e arrasto hidrodinâmico.
- Travessia contínua de 30.000 metros cobrindo 5 biomas marinhos (Antártica, Oceano Pelágico, Costa Urbana, Cânions e Arraial do Cabo).
- Cardumes de krill nutritivo e banquisa de gelo polar com fendas de respiração.
