# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
