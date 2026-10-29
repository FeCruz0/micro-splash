# Plano de Refatoração Atômico (WBS): Migração Kaboom.js → PixiJS v8

**Documento Canônico de Arquitetura — Micro Splash**  
**Critério de Ordenação**: Menor Impacto $\rightarrow$ Maior Dependência (Folha $\rightarrow$ Raiz).  
**Meta**: Transição Atômica dos 109 arquivos acoplados com Zero Downtime, Zero Type Drift e Zero regressões nos testes.

---

## Índice das Ondas de Execução

- [Onda 0: Infraestrutura, Setup e Coexistência (Concluída)](#onda-0-infraestrutura-setup-e-coexistência)
- [Onda 1: Leaf Systems — Efeitos Visuais & Primitivas Autônomas (23 arquivos)](#onda-1-leaf-systems-23-arquivos)
- [Onda 2: Camada de UI, Modais & Design System Acessível (36 arquivos)](#onda-2-camada-de-ui-modais--design-system-acessível-36-arquivos)
- [Onda 3: Dinâmica de Jogo, Obstáculos, Cânion & Companion (29 arquivos)](#onda-3-dinâmica-de-jogo-obstáculos-cânion--companion-29-arquivos)
- [Onda 4: Entidades do Loop Central, Cenas & Bootstrap (21 arquivos)](#onda-4-entidades-do-loop-central-cenas--bootstrap-21-arquivos)
- [Onda 5: Limpeza de Dependências, Homologação & Cutover Final](#onda-5-limpeza-de-dependências-homologação--cutover-final)

---

## Onda 0: Infraestrutura, Setup e Coexistência

| Atividade | Entregável / Arquivo                          | Descrição Técnica                                                                                                                                       | Validação Local                                    |
| :-------- | :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------- |
| **0.1**   | `package.json`                                | Instalação limpa de `pixi.js@^8.22.0` mantendo Docker (Node 20 Alpine) e Vite íntegros.                                                                 | `npm ls pixi.js`                                   |
| **0.2**   | `src/engine/contracts/INTERFACE_CONTRACTS.ts` | Contratos puros de interface (`IRenderEngine`, `IRenderNode`, `ISpriteNode`, `IGraphicsNode`, `ITextNode`, `IScene`, `ISceneManager`, `IRenderTicker`). | `npx tsc --noEmit`                                 |
| **0.3**   | `src/engine/adapters/PixiNodes.ts`            | Classes adaptadoras encapsulando nós nativos do PixiJS v8 com isolamento total de tipos.                                                                | `npx vitest run tests/engine/pixiNodes.test.ts`    |
| **0.4**   | `src/engine/adapters/RenderEngineAdapter.ts`  | Adaptador concreto de `IRenderEngine` com ciclo de vida seguro no DOM para Docker/Vite/HMR e clamp de frametime (`MAX_DELTA_TIME = 0.1s`).              | `npx vitest run tests/engine/`                     |
| **0.5**   | `src/engine/SceneManager.ts`                  | Gerenciador de cenas formal com FSM (`IDLE`, `EXITING`, `SWITCHING`, `ENTERING`, `ERROR`) e transições assíncronas.                                     | `npx vitest run tests/engine/sceneManager.test.ts` |
| **0.6**   | `src/engine/utils/Tween.ts`                   | Mecanismo puro de interpolação e atenuações numéricas substituindo `k.tween()`.                                                                         | `npx vitest run tests/engine/tween.test.ts`        |
| **0.7**   | `index.html`                                  | Coexistência paralela de contêineres: `#game-container` (Canvas PixiJS) e `#ui-overlay` (DOM Semântico acessível).                                      | `npm run build`                                    |

---

## Onda 1: Leaf Systems (23 arquivos)

_Sistemas visuais procedurais e shaders que não possuem dependências de entrada do jogador._

| #        | Caminho Exato                              | Contratos Consumidos                            | Substituição de Nós & Limpeza                                                                         | Validação Local Obrigatória                                                              |
| :------- | :----------------------------------------- | :---------------------------------------------- | :---------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| **1.1**  | `src/systems/marineSnowSystem.ts`          | `IRenderEngine`, `IGraphicsNode`, `Vector2D`    | `k.circle` $\rightarrow$ `drawCircle` em batch. Limpeza: `pool.forEach(p => p.destroy())`.            | `npx tsc --noEmit && npx vitest run tests/systems/particlePool.test.ts`                  |
| **1.2**  | `src/systems/bioluminescenceSystem.ts`     | `IRenderEngine`, `IGraphicsNode`                | Partículas luminescentes com alpha pulsante. Limpeza: `clear()` e `destroy()`.                        | `npx tsc --noEmit && npx vitest run tests/systems/phase30_seabed_lighting.test.ts`       |
| **1.3**  | `src/systems/parallaxSkySystem.ts`         | `IRenderEngine`, `IGraphicsNode`                | Fundo de céu em faixas horizontais com offsets de paralaxe. Limpeza: remoção dos nós filhos do stage. | `npx tsc --noEmit && npx vitest run tests/systems/phase29_atmosphere_sky.test.ts`        |
| **1.4**  | `src/systems/oceanFloorSystem.ts`          | `IRenderEngine`, `IGraphicsNode`, `Vector2D`    | Polígonos de terreno de fundo via `drawPolygon()`. Limpeza: `graphics.destroy()`.                     | `npx tsc --noEmit && npx vitest run tests/systems/phase30_seabed_lighting.test.ts`       |
| **1.5**  | `src/systems/benthicFloorSystem.ts`        | `IRenderEngine`, `IGraphicsNode`, `Vector2D`    | `k.polygon` $\rightarrow$ `drawPolygon()` e `drawLine()`. Limpeza: `destroy()`.                       | `npx tsc --noEmit && npx vitest run tests/systems/topography.test.ts`                    |
| **1.6**  | `src/systems/depthDarknessSystem.ts`       | `IRenderEngine`, `IGraphicsNode`                | Gradiente/retângulo de escuridão com opacidade em função da profundidade. Limpeza: `destroy()`.       | `npx tsc --noEmit && npx vitest run tests/systems/phase30_seabed_lighting.test.ts`       |
| **1.7**  | `src/systems/abyssalFogSystem.ts`          | `IRenderEngine`, `IGraphicsNode`                | Faixas de névoa abissal com opacidade variável. Limpeza: `fogNode.destroy()`.                         | `npx tsc --noEmit && npx vitest run tests/systems/phase30_seabed_lighting.test.ts`       |
| **1.8**  | `src/systems/auroraSystem.ts`              | `IRenderEngine`, `IGraphicsNode`                | Curvas de aurora boreal usando `drawLine()` e `drawPolygon()`. Limpeza: `destroy()`.                  | `npx tsc --noEmit && npx vitest run tests/systems/phase29_atmosphere_sky.test.ts`        |
| **1.9**  | `src/systems/coastalSurfSystem.ts`         | `IRenderEngine`, `IGraphicsNode`                | Espuma costeira na superfície com ondas procedurais. Limpeza: `surfNode.destroy()`.                   | `npx tsc --noEmit && npx vitest run tests/systems/phase35_visual_systems.test.ts`        |
| **1.10** | `src/systems/dynamicShadowSystem.ts`       | `IRenderEngine`, `IGraphicsNode`                | Projeção de sombras elípticas dos animais no leito marinho. Limpeza: `destroy()`.                     | `npx tsc --noEmit && npx vitest run tests/systems/phase35_visual_systems.test.ts`        |
| **1.11** | `src/systems/iceSurface.ts`                | `IRenderEngine`, `IGraphicsNode`, `ISpriteNode` | Blocos de gelo na Antártica com primitivas e texturas. Limpeza: `destroy()`.                          | `npx tsc --noEmit && npx vitest run tests/systems/phase35_visual_systems.test.ts`        |
| **1.12** | `src/systems/letterboxSystem.ts`           | `IRenderEngine`, `IGraphicsNode`                | Barras pretas de aspecto e proporção de tela via `drawRect()`. Limpeza: `destroy()`.                  | `npx tsc --noEmit && npx vitest run tests/ui/phase33_resolutions_responsiveness.test.ts` |
| **1.13** | `src/systems/lightRaysSystem.ts`           | `IRenderEngine`, `IGraphicsNode`                | Raios de sol descendentes desenhados com polígonos translúcidos. Limpeza: `destroy()`.                | `npx tsc --noEmit && npx vitest run tests/systems/phase30_seabed_lighting.test.ts`       |
| **1.14** | `src/systems/waterSurfaceSystem.ts`        | `IRenderEngine`, `IGraphicsNode`                | Superfície da água e fronteira com o ar via `drawLine()`. Limpeza: `destroy()`.                       | `npx tsc --noEmit && npx vitest run tests/systems/phase35_visual_systems.test.ts`        |
| **1.15** | `src/systems/weatherSystem.ts`             | `IRenderEngine`, `IGraphicsNode`                | Gotas de chuva, neve e neblina via batch de primitivas. Limpeza: `clear()` e `destroy()`.             | `npx tsc --noEmit && npx vitest run tests/systems/weather.test.ts`                       |
| **1.16** | `src/systems/oceanEnvironment.ts`          | `IRenderEngine`, `IRenderNode`                  | Orquestrador dos sistemas visuais ambientais. Limpeza: `cleanup()` chamando subsistemas.              | `npx tsc --noEmit && npx vitest run tests/systems/phase35_visual_systems.test.ts`        |
| **1.17** | `src/systems/particlePool.ts`              | `IRenderEngine`, `IGraphicsNode`                | Piscina de reciclagem de partículas geométricas (bolhas, poeira marinha). Limpeza: `pool.drain()`.    | `npx tsc --noEmit && npx vitest run tests/systems/particlePool.test.ts`                  |
| **1.18** | `src/systems/biomeLifecycleManager.ts`     | `IRenderEngine`, `IRenderNode`                  | Gerenciamento de ciclo de vida visual dos 5 biomas da jornada. Limpeza: descarte de bioma anterior.   | `npx tsc --noEmit && npx vitest run tests/systems/biomeLifecycle.test.ts`                |
| **1.19** | `src/systems/biomeVignetteSystem.ts`       | `IRenderEngine`, `IGraphicsNode`                | Vinheta gradiente de transição entre biomas. Limpeza: `destroy()`.                                    | `npx tsc --noEmit && npx vitest run tests/systems/biomeLifecycle.test.ts`                |
| **1.20** | `src/entities/bubbleVent.ts`               | `IRenderEngine`, `IGraphicsNode`                | Fendas hidrotermais emitindo bolhas de oxigênio. Limpeza: `destroy()`.                                | `npx tsc --noEmit && npx vitest run tests/systems/particlePool.test.ts`                  |
| **1.21** | `src/entities/player/playerCaustics.ts`    | `IRenderEngine`, `IGraphicsNode`                | Malha de cáusticas sobreposta ao dorso da baleia via `drawPolygon()`. Limpeza: `destroy()`.           | `npx tsc --noEmit && npx vitest run tests/player/swimmingRipples.test.ts`                |
| **1.22** | `src/entities/player/playerPectoralFin.ts` | `IRenderEngine`, `IGraphicsNode`                | Articulação geométrica das nadadeiras peitorais via rotação de nós. Limpeza: `destroy()`.             | `npx tsc --noEmit && npx vitest run tests/player/phase28_biological_proportions.test.ts` |
| **1.23** | `src/utils/camera.ts`                      | `Vector2D`, `IRenderEngine`                     | Controle matemático de viewport e lerp de foco. Limpeza: reset de offsets de translação.              | `npx tsc --noEmit && npx vitest run tests/ui/phase33_resolutions_responsiveness.test.ts` |

---

## Onda 2: Camada de UI, Modais & Design System Acessível (36 arquivos)

_Migração para a abordagem híbrida (ADR 002): Menus/Modais em DOM Overlay semântico e HUD de alta frequência no Canvas._

| #        | Caminho Exato                            | Contratos Consumidos                          | Estratégia de Interface & Foco Acessível                                     | Validação Local Obrigatória                                                              |
| :------- | :--------------------------------------- | :-------------------------------------------- | :--------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| **2.1**  | `src/ui/animationUtils.ts`               | `Tween.ts`, `Easings`, `IRenderTicker`        | Interpolações de UI respeitando `prefers-reduced-motion`.                    | `npx tsc --noEmit && npx vitest run tests/ui/phase65_ui_motion.test.ts`                  |
| **2.2**  | `src/ui/keyBadge.ts`                     | `ITextNode`, `IGraphicsNode`                  | Badges visuais de teclas e atalhos com alto contraste.                       | `npx tsc --noEmit && npx vitest run tests/ui/phase26_accessibility_compliance.test.ts`   |
| **2.3**  | `src/ui/keyboardNav.ts`                  | DOM Keyboard Events                           | Gerenciador de navegação por teclado, setas e focus trap.                    | `npx tsc --noEmit && npx vitest run tests/ui/phase26_accessibility_compliance.test.ts`   |
| **2.4**  | `src/ui/textUtils.ts`                    | `ITextNode`, `TextStyleOptions`               | Tipografia padronizada (Outfit, Inter) com sombra de contraste.              | `npx tsc --noEmit && npx vitest run tests/ui/phase32_typography_hierarchy.test.ts`       |
| **2.5**  | `src/ui/touchControls.ts`                | `IGraphicsNode`, `Vector2D`                   | D-Pad virtual e botões táteis no overlay com feedback visual.                | `npx tsc --noEmit && npx vitest run tests/ui/phase33_resolutions_responsiveness.test.ts` |
| **2.6**  | `src/ui/shared/cardButton.ts`            | DOM Component / `IRenderNode`                 | Botões card com estados hover/active, aria-labels e foco visível.            | `npx tsc --noEmit && npx vitest run tests/ui/phase64_design_system.test.ts`              |
| **2.7**  | `src/ui/shared/modalShell.ts`            | DOM Overlay Shell                             | Casca padronizada de modais com backdrop blur, esc para fechar e focus lock. | `npx tsc --noEmit && npx vitest run tests/ui/phase64_design_system.test.ts`              |
| **2.8**  | `src/ui/shared/motion.ts`                | `Tween.ts`, `Easings`                         | Animações de entrada stagger e pulso suave para elementos de tela.           | `npx tsc --noEmit && npx vitest run tests/ui/phase65_ui_motion.test.ts`                  |
| **2.9**  | `src/ui/shared/scoreCounter.ts`          | `Tween.ts`, `ITextNode`                       | Contador numérico animado com formatação regional (pt-BR).                   | `npx tsc --noEmit && npx vitest run tests/ui/phase65_ui_motion.test.ts`                  |
| **2.10** | `src/ui/shared/tabBar.ts`                | DOM Component                                 | Abas de navegação acessíveis (`role="tablist"`, `aria-selected`).            | `npx tsc --noEmit && npx vitest run tests/ui/phase64_design_system.test.ts`              |
| **2.11** | `src/ui/factPopup.ts`                    | DOM Overlay / `Tween.ts`                      | Pop-up com fatos educativos da Década dos Oceanos / UNESCO.                  | `npx tsc --noEmit && npx vitest run tests/ui/phase34_ui_polish.test.ts`                  |
| **2.12** | `src/ui/hudSystem.ts`                    | `IRenderEngine`, `ITextNode`, `IGraphicsNode` | HUD in-game (barra de oxigênio, velocímetro náutico, pontuação).             | `npx tsc --noEmit && npx vitest run tests/systems/phase31_particles_biome_hud.test.ts`   |
| **2.13** | `src/ui/initialsInputModal.ts`           | DOM Component                                 | Modal de inserção de 3 letras para o ranking local com suporte a gamepad.    | `npx tsc --noEmit && npx vitest run tests/ui/phase26_accessibility_compliance.test.ts`   |
| **2.14** | `src/ui/pwaInstallModal.ts`              | DOM Component                                 | Prompt customizado de instalação offline (PWA).                              | `npx tsc --noEmit && npx vitest run tests/systems/pwa.test.ts`                           |
| **2.15** | `src/ui/onboardingModal.ts`              | DOM Component                                 | Tutorial inicial com regras de respiração e nado.                            | `npx tsc --noEmit && npx vitest run tests/ui/phase26_accessibility_compliance.test.ts`   |
| **2.16** | `src/ui/quizModal.ts`                    | DOM Component                                 | Quiz interativo de biologia marinha com opções selecionáveis.                | `npx tsc --noEmit && npx vitest run tests/core/quiz.test.ts`                             |
| **2.17** | `src/ui/shareModal.ts`                   | DOM Component                                 | Compartilhamento social (Web Share API com fallback para cópia).             | `npx tsc --noEmit && npx vitest run tests/ui/share.test.ts`                              |
| **2.18** | `src/ui/statsModal.ts`                   | DOM Component                                 | Painel de estatísticas acumuladas da baleia (distância, krill consumido).    | `npx tsc --noEmit && npx vitest run tests/systems/cumulativeStats.test.ts`               |
| **2.19** | `src/ui/debugDistance.ts`                | `ITextNode`, `IGraphicsNode`                  | Painel F3 de telemetria diagnóstica e métricas de desempenho.                | `npx tsc --noEmit && npx vitest run tests/systems/f3Diagnostics.test.ts`                 |
| **2.20** | `src/ui/options/optionsTypes.ts`         | Agnóstico                                     | Tipos e contratos de configurações de áudio, gráficos e acessibilidade.      | `npx tsc --noEmit && npx vitest run tests/ui/phase26_accessibility_compliance.test.ts`   |
| **2.21** | `src/ui/options/optionsNavigation.ts`    | DOM Navigation                                | Navegação por abas e slider no menu de opções.                               | `npx tsc --noEmit && npx vitest run tests/ui/phase26_accessibility_compliance.test.ts`   |
| **2.22** | `src/ui/options/kioskOptionsTab.ts`      | DOM Component                                 | Aba específica para modo totem e evento educativo.                           | `npx tsc --noEmit && npx vitest run tests/systems/presentationMode.test.ts`              |
| **2.23** | `src/ui/optionsScreen.ts`                | DOM Component / `IScene`                      | Tela de opções completa com integração com `localStorage`.                   | `npx tsc --noEmit && npx vitest run tests/ui/phase26_accessibility_compliance.test.ts`   |
| **2.24** | `src/ui/codex/codexTypes.ts`             | Agnóstico                                     | Modelagem dos dados educativos das espécies marinhas.                        | `npx tsc --noEmit && npx vitest run tests/core/education_phase21.test.ts`                |
| **2.25** | `src/ui/codex/codexNavigation.ts`        | DOM Navigation                                | Navegação no compêndio de espécies catalogadas.                              | `npx tsc --noEmit && npx vitest run tests/core/education_phase21.test.ts`                |
| **2.26** | `src/ui/codexScreen.ts`                  | DOM Component / `IScene`                      | Tela do Códice Oceânico com ilustrações e informações biológicas.            | `npx tsc --noEmit && npx vitest run tests/core/education_phase21.test.ts`                |
| **2.27** | `src/ui/leaderboardScreen.ts`            | DOM Component / `IScene`                      | Tabela de classificação com recordes locais e globais.                       | `npx tsc --noEmit && npx vitest run tests/systems/leaderboard.test.ts`                   |
| **2.28** | `src/ui/modeSelectScreen.ts`             | DOM Component / `IScene`                      | Seletor de modalidade (Jornada, Zen, Desafio Semanal, Kiosk).                | `npx tsc --noEmit && npx vitest run tests/ui/phase34_ui_polish.test.ts`                  |
| **2.29** | `src/ui/challengeEndScreen.ts`           | DOM Component / `IScene`                      | Tela de encerramento de Desafio Semanal com medalhas e insígnias.            | `npx tsc --noEmit && npx vitest run tests/systems/weeklyChallenge.test.ts`               |
| **2.30** | `src/ui/rescueScreen.ts`                 | DOM Component / `IScene`                      | Tela de resgate de rede de pesca com micro-game interativo.                  | `npx tsc --noEmit && npx vitest run tests/ui/phase34_ui_polish.test.ts`                  |
| **2.31** | `src/ui/victoryScreen.ts`                | DOM Component / `IScene`                      | Tela de vitória ao alcançar Arraial do Cabo aos 30.000m.                     | `npx tsc --noEmit && npx vitest run tests/ui/phase34_ui_polish.test.ts`                  |
| **2.32** | `src/ui/splashScreen.ts`                 | `IRenderEngine`, `ITextNode`, `Tween.ts`      | Tela inicial de créditos com transição suave para o menu.                    | `npx tsc --noEmit && npx vitest run tests/ui/phase51_ui_transitions.test.ts`             |
| **2.33** | `src/ui/mainMenu.ts`                     | DOM Component / `IScene`                      | Menu principal com botões estilizados e fundo animado no canvas.             | `npx tsc --noEmit && npx vitest run tests/ui/phase34_ui_polish.test.ts`                  |
| **2.34** | `src/systems/presentationMode.ts`        | DOM Event Listeners                           | Alternância e trava para apresentações públicas e feiras de ciências.        | `npx tsc --noEmit && npx vitest run tests/systems/presentationMode.test.ts`              |
| **2.35** | `src/systems/kioskMode.ts`               | DOM / Auto-reset Timer                        | Gerenciamento de timeout de inatividade para retorno ao menu.                | `npx tsc --noEmit && npx vitest run tests/systems/presentationMode.test.ts`              |
| **2.36** | `src/systems/sereneMigrationInsights.ts` | DOM Component / `Tween.ts`                    | Cartões contextuais de conscientização ecológica durante o nado.             | `npx tsc --noEmit && npx vitest run tests/systems/sereneMigrationInsights.test.ts`       |

---

## Onda 3: Dinâmica de Jogo, Obstáculos, Cânion & Companion (29 arquivos)

_Entidades ativas, colisões espaciais com SpatialHashGrid (ADR 003) e IA da Baleia Companheira._

| #        | Caminho Exato                                     | Contratos Consumidos             | Integração com SpatialHashGrid & Física                                | Validação Local Obrigatória                                                            |
| :------- | :------------------------------------------------ | :------------------------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **3.1**  | `src/entities/krill.ts`                           | `ISpriteNode`, `Vector2D`        | Entidade alimentar com detecção por raio e animação de cardume.        | `npx tsc --noEmit && npx vitest run tests/systems/krill.test.ts`                       |
| **3.2**  | `src/entities/boat.ts`                            | `ISpriteNode`, `Vector2D`        | Barco na superfície com emissão de ruído sonoro e hélice de perigo.    | `npx tsc --noEmit && npx vitest run tests/systems/canyon.test.ts`                      |
| **3.3**  | `src/entities/net.ts`                             | `IGraphicsNode`, `Vector2D`      | Rede de pesca fantasma com desaceleração e engolfamento.               | `npx tsc --noEmit && npx vitest run tests/systems/canyon.test.ts`                      |
| **3.4**  | `src/entities/powerup.ts`                         | `ISpriteNode`, `Vector2D`        | Coletáveis especiais (bolhas de oxigênio denso, sonar ampliado).       | `npx tsc --noEmit && npx vitest run tests/systems/powerup.test.ts`                     |
| **3.5**  | `src/entities/trash.ts`                           | `ISpriteNode`, `Vector2D`        | Detritos marinhos com colisão elástica e perda de velocidade.          | `npx tsc --noEmit && npx vitest run tests/systems/canyon.test.ts`                      |
| **3.6**  | `src/systems/backgroundFauna.ts`                  | `ISpriteNode`, `IRenderEngine`   | Golfinhos, raias e tubarões de fundo com trajetórias autônomas.        | `npx tsc --noEmit && npx vitest run tests/systems/faunaSprites.test.ts`                |
| **3.7**  | `src/systems/dolphinDraftingSystem.ts`            | `ISpriteNode`, `Vector2D`        | Mecânica de vácuo hidrodinâmico ao nadar alinhado com golfinhos.       | `npx tsc --noEmit && npx vitest run tests/systems/faunaSprites.test.ts`                |
| **3.8**  | `src/systems/penguinFlockSystem.ts`               | `ISpriteNode`, `Vector2D`        | Cardume ártico de pinguins com boid algorithm (coesão, alinhamento).   | `npx tsc --noEmit && npx vitest run tests/systems/faunaSprites.test.ts`                |
| **3.9**  | `src/systems/oceanCurrentsSystem.ts`              | `IGraphicsNode`, `Vector2D`      | Jatos de corrente favoráveis ou desfavoráveis com vetores de força.    | `npx tsc --noEmit && npx vitest run tests/systems/currentsOxygen.test.ts`              |
| **3.10** | `src/systems/oilSpillSystem.ts`                   | `IGraphicsNode`, `Vector2D`      | Manchas de óleo com consumo acelerado de oxigênio.                     | `npx tsc --noEmit && npx vitest run tests/systems/canyon.test.ts`                      |
| **3.11** | `src/systems/shipNoiseSystem.ts`                  | `Vector2D`, Web Audio API        | Modulação de ruído motor em função da proximidade da embarcação.       | `npx tsc --noEmit && npx vitest run tests/audio/audioModules.test.ts`                  |
| **3.12** | `src/systems/upwellingSystem.ts`                  | `IGraphicsNode`, `Vector2D`      | Correntes verticais de ressurgência rica em nutrientes.                | `npx tsc --noEmit && npx vitest run tests/systems/currentsOxygen.test.ts`              |
| **3.13** | `src/systems/canyon/canyonTypes.ts`               | Agnóstico                        | Estruturas de dados dos corredores do cânion submarino.                | `npx tsc --noEmit && npx vitest run tests/systems/canyon.test.ts`                      |
| **3.14** | `src/systems/canyon/canyonGeometry.ts`            | `Vector2D`, `IGraphicsNode`      | Paredes rochosas poligonais do cânion com detecção de impacto.         | `npx tsc --noEmit && npx vitest run tests/systems/canyon.test.ts`                      |
| **3.15** | `src/systems/canyon/canyonCurrents.ts`            | `Vector2D`, `SpatialHashGrid`    | Correntes turbulentas afuniladas no desfiladeiro.                      | `npx tsc --noEmit && npx vitest run tests/systems/canyon.test.ts`                      |
| **3.16** | `src/systems/canyon/canyonObstacles.ts`           | `ISpriteNode`, `Vector2D`        | Estalactites e estalagmites submersas.                                 | `npx tsc --noEmit && npx vitest run tests/systems/canyon.test.ts`                      |
| **3.17** | `src/systems/canyonSystem.ts`                     | `IRenderEngine`, `IGraphicsNode` | Orquestrador da travessia claustrofóbica do cânion.                    | `npx tsc --noEmit && npx vitest run tests/systems/canyon.test.ts`                      |
| **3.18** | `src/systems/proceduralObstacles.ts`              | `Vector2D`, `SpatialHashGrid`    | Geração procedural de perigos com base na distância percorrida.        | `npx tsc --noEmit && npx vitest run tests/systems/procedural.test.ts`                  |
| **3.19** | `src/systems/levelLoader.ts`                      | `IRenderEngine`, `Vector2D`      | Carregador e streamer contínuo dos setores da jornada (0 a 30km).      | `npx tsc --noEmit && npx vitest run tests/core/levelLayout.test.ts`                    |
| **3.20** | `src/systems/spatialCullingSystem.ts`             | `SpatialHashGrid`, `IRenderNode` | Culling de nós fora do campo de visão da câmera (frustum culling).     | `npx tsc --noEmit && npx vitest run tests/systems/phase39_performance_culling.test.ts` |
| **3.21** | `src/systems/collisions.ts`                       | `SpatialHashGrid`, `Vector2D`    | Verificação ampla e estreita de colisões de todas as entidades ativas. | `npx tsc --noEmit && npx vitest run tests/systems/spatialHashGrid.test.ts`             |
| **3.22** | `src/entities/companion/types.ts`                 | Agnóstico                        | Tipos e contratos de estados da Baleia Companheira (Mãe/Guia).         | `npx tsc --noEmit && npx vitest run tests/entities/companionWhale.test.ts`             |
| **3.23** | `src/entities/companion/states/types.ts`          | `Vector2D`, `IRenderNode`        | Contexto de transição da máquina de estados do companion.              | `npx tsc --noEmit && npx vitest run tests/entities/companion/stateMachine.test.ts`     |
| **3.24** | `src/entities/companion/states/concreteStates.ts` | `Vector2D`, `IRenderNode`        | Estados concretos: `Intro`, `Cruise`, `Breach`, `Lead`, `Protect`.     | `npx tsc --noEmit && npx vitest run tests/entities/companion/stateMachine.test.ts`     |
| **3.25** | `src/entities/companion/companionLocomotion.ts`   | `Vector2D`, `IRenderNode`        | Física de nado em curva Bezier da baleia companheira.                  | `npx tsc --noEmit && npx vitest run tests/entities/companionWhale.test.ts`             |
| **3.26** | `src/entities/companion/companionSenses.ts`       | `SpatialHashGrid`, `Vector2D`    | Detecção de perigos à frente pelo companion para alertar o filhote.    | `npx tsc --noEmit && npx vitest run tests/entities/companionWhale.test.ts`             |
| **3.27** | `src/entities/companion/companionStateMachine.ts` | FSM Pura                         | Máquina de estados desacoplada sem dependências externas.              | `npx tsc --noEmit && npx vitest run tests/entities/companion/stateMachine.test.ts`     |
| **3.28** | `src/entities/companion/companionStates.ts`       | FSM Context                      | Orquestração dos comportamentos cooperativos da mãe baleia.            | `npx tsc --noEmit && npx vitest run tests/entities/companionWhale.test.ts`             |
| **3.29** | `src/entities/companion/index.ts`                 | `ISpriteNode`, `IRenderEngine`   | Agregado raiz da baleia companheira com nó de renderização e FSM.      | `npx tsc --noEmit && npx vitest run tests/entities/companionWhale.test.ts`             |

---

## Onda 4: Entidades do Loop Central, Cenas & Bootstrap (21 arquivos)

_O núcleo da jogabilidade: Player, Física de Batimento, Cenas Modulares e Ponto de Entrada._

| #        | Caminho Exato                            | Contratos Consumidos                      | Loop Central & Física de 30.000m                                            | Validação Local Obrigatória                                                       |
| :------- | :--------------------------------------- | :---------------------------------------- | :-------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **4.1**  | `src/entities/player/types.ts`           | `Vector2D`, `IRenderNode`                 | Modelos de estado do filhote (velocidade, aceleração, oxigênio).            | `npx tsc --noEmit && npx vitest run tests/player/physics.test.ts`                 |
| **4.2**  | `src/entities/player/playerCollision.ts` | `SpatialHashGrid`, `Vector2D`             | Colisão do corpo biológico da jubarte com sólidos e obstáculos.             | `npx tsc --noEmit && npx vitest run tests/player/physics.test.ts`                 |
| **4.3**  | `src/entities/player/playerControls.ts`  | Input / Gamepad / Keyboard                | Mapeamento de controles analógicos e teclado para impulsos de nado.         | `npx tsc --noEmit && npx vitest run tests/player/physics.test.ts`                 |
| **4.4**  | `src/entities/player/playerOxygen.ts`    | Lógica Pura                               | Consumo dinâmico de oxigênio por esforço e recarga na superfície.           | `npx tsc --noEmit && npx vitest run tests/player/oxygen.test.ts`                  |
| **4.5**  | `src/entities/player/playerParticles.ts` | `IRenderEngine`, `IGraphicsNode`          | Rastros de bolhas e esteira de nado proporcional à velocidade.              | `npx tsc --noEmit && npx vitest run tests/player/swimmingRipples.test.ts`         |
| **4.6**  | `src/entities/player/playerPhysics.ts`   | `Vector2D`, Física Integrada              | Física de batimento da cauda (tail beat impulse), flutuabilidade e arrasto. | `npx tsc --noEmit && npx vitest run tests/player/physics.test.ts`                 |
| **4.7**  | `src/entities/player/playerSonar.ts`     | `IGraphicsNode`, `Vector2D`               | Ecolocalização com emissão de pulsos cônicos para revelar o relevo.         | `npx tsc --noEmit && npx vitest run tests/player/physics.test.ts`                 |
| **4.8**  | `src/entities/player.ts`                 | `IRenderEngine`, `ISpriteNode`            | Agregador raiz do jogador unindo física, renderização e input.              | `npx tsc --noEmit && npx vitest run tests/player/physics.test.ts`                 |
| **4.9**  | `src/systems/breachSystem.ts`            | `IRenderEngine`, `Tween.ts`               | Salto épico fora d'água (breach) com splash, rotação e som festivo.         | `npx tsc --noEmit && npx vitest run tests/systems/visual_phase20.test.ts`         |
| **4.10** | `src/systems/cinematicCameraSystem.ts`   | `Vector2D`, `Tween.ts`                    | Câmera cinemática dinâmica (zoom out no salto, aproximação no cânion).      | `npx tsc --noEmit && npx vitest run tests/systems/phase35_visual_systems.test.ts` |
| **4.11** | `src/scenes/assetLoader.ts`              | PixiJS `Assets.load()`                    | Carregador unificado de áudios, fontes e texturas com barra de progresso.   | `npx tsc --noEmit && npx vitest run tests/core/scenesModular.test.ts`             |
| **4.12** | `src/scenes/splashScene.ts`              | `IScene`, `SceneManager`                  | Cena de abertura da Micro Splash com logos institucionais.                  | `npx tsc --noEmit && npx vitest run tests/core/scenesModular.test.ts`             |
| **4.13** | `src/scenes/menuScene.ts`                | `IScene`, `SceneManager`                  | Cena do menu principal com navegação entre modos.                           | `npx tsc --noEmit && npx vitest run tests/core/scenesModular.test.ts`             |
| **4.14** | `src/scenes/startScene.ts`               | `IScene`, `SceneManager`                  | Cena introdutória de contexto da migração antártica.                        | `npx tsc --noEmit && npx vitest run tests/core/scenesModular.test.ts`             |
| **4.15** | `src/scenes/gameScene.ts`                | `IScene`, `IRenderEngine`, `SceneManager` | Cena central da jornada: loop principal, streaming de biomas e HUD.         | `npx tsc --noEmit && npx vitest run tests/core/scenesModular.test.ts`             |
| **4.16** | `src/scenes/gameoverScene.ts`            | `IScene`, `SceneManager`                  | Cena de fim de jogo por esgotamento de oxigênio com dados educativos.       | `npx tsc --noEmit && npx vitest run tests/core/scenesModular.test.ts`             |
| **4.17** | `src/scenes/rescueScene.ts`              | `IScene`, `SceneManager`                  | Cena de resgate em caso de captura por petrecho de pesca.                   | `npx tsc --noEmit && npx vitest run tests/core/scenesModular.test.ts`             |
| **4.18** | `src/scenes/kioskScene.ts`               | `IScene`, `SceneManager`                  | Cena auto-explicativa em loop contínuo para eventos e totens.               | `npx tsc --noEmit && npx vitest run tests/systems/presentationMode.test.ts`       |
| **4.19** | `src/scenes/index.ts`                    | `IScene` registry                         | Registro formal de todas as cenas no `SceneManager`.                        | `npx tsc --noEmit && npx vitest run tests/core/scenesModular.test.ts`             |
| **4.20** | `src/systems/accessibilitySystem.ts`     | DOM Overlay, ARIA                         | Gerenciamento de alto contraste, legendas descritivas e narração.           | `npx tsc --noEmit && npx vitest run tests/ui/accessibility.test.ts`               |
| **4.21** | `src/main.ts`                            | Bootstrap do `RenderEngineAdapter`        | Ponto de entrada do jogo. Substitui `kaboom()` por `engine.init()`.         | `npx tsc --noEmit && npm test`                                                    |

---

## Onda 5: Limpeza de Dependências, Homologação & Cutover Final

1. **Remoção do Pacote Legado**:
   ```bash
   npm uninstall kaboom
   ```
2. **Atualização dos 2 Testes Unitários Acoplados a Tipos Legados**:
   - `tests/entities/companion/stateMachine.test.ts`: Remover `import type { GameObj } from "kaboom"` e usar os contratos puros de `INTERFACE_CONTRACTS.ts`.
   - `tests/ui/phase65_ui_motion.test.ts`: Substituir `KaboomCtx`, `GameObj` e `Vec2` pelos contratos `IRenderNode` e `Vector2D`.
3. **Validação Final de Compilação**:
   ```bash
   npx tsc --noEmit
   ```
4. **Homologação Completa da Suíte de Testes (659 Testes)**:
   ```bash
   npm test
   ```
5. **Auditoria de Empacotamento de Produção**:
   ```bash
   npm run build
   ```
6. **Verificação de Desempenho no Docker**:
   ```bash
   docker compose up --build -d
   ```
   Validação de carregamento limpo da porta 5173 com WebGL ativado e FPS estável a 60 fps.
