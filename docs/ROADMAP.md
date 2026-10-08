# 🗺️ Roadmap de Desenvolvimento (Plano em Fases) - Micro Splash

Este documento organiza o plano de desenvolvimento em **Fases Sequenciais de Produção**, alinhadas aos princípios de Game Design Document (GDD) e desenvolvimento iterativo de jogos.

---

## ✅ Fases Já Concluídas e Implementadas

### 🚀 FASE 1: Base do Mapa & Geografia dos 27.000m

- [x] **1.1 Transição Dinâmica de Cores do Mar (`main.ts`):** Gradiente de fundo de azul polar escuro (`#051c38`) a azul turquesa luminoso (`#1490b8`).
- [x] **1.2 Restrição Geográfica da Ressurgência (`upwellingSystem.ts`):** Jatos ascensionais e geração de Krill exclusivos na faixa de Arraial do Cabo (`19.000m - 25.000m`).
- [x] **1.3 Redistribuição dos Pop-ups Educativos (`data/facts.json`):** Gatilhos pedagógicos nos 5 biomas da rota.

### ❄️ FASE 2: Biomas Específicos & Perigos (Level Design por Etapa)

- [x] **2.1 Etapa 1 - Oceano Antártico (0m - 5.000m):** Blocos de gelo na superfície com fendas de respiração e silhuetas de Orcas ao fundo.
- [x] **2.2 Etapa 2 - Travessia Oceânica (5.000m - 12.000m):** Jejum de Krill e correntes oceânicas contrárias exigindo desvio vertical.
- [x] **2.3 Etapa 3 - Costa Urbana & Tráfego Marítimo (12.000m - 19.000m):** Navios cargueiros móveis patrulhando em ida e volta, ruído sonoro empurrando para baixo, e lixo/redes em camadas escalonadas.
- [x] **2.4 Etapa 4 - Faixa de Ressurgência (19.000m - 25.000m):** Cânions rochosos estreitos de pedra (Boqueirão).
- [x] **2.5 Etapa 5 - Santuário Marinho (25.000m - 27.000m):** Águas cristalinas abrigadas da Ilha do Farol.

### 🦐 FASE 3: Progressão do Jogador & Sistema Nutricional

- [x] **3.1 Crescimento Progressivo via Krill:** +1% permanente em velocidade máxima e fôlego máximo por cardume consumido.
- [x] **Mecânica Aprimorada de Rede Fantasma:** Trava apenas controles, permitindo afundamento e perda de fôlego contínuos com colisões ativas.

### 🏆 FASE 4: Polimento, Áudio & Clímax Final

- [x] **4.1 Evento do Salto Majestoso (Breach):** Salto acrobático no céu de Arraial na linha de chegada (26.700m - 27.000m) com spray de água, tremor de tela e +500 Eco-Pontos.
- [x] **4.2 Paisagem Sonora e Áudio Ambiente (`audioSystem.ts`):** Web Audio API procedural com borbulhamento marinho, cantos ressonantes de baleia-jubarte e SFX (sonar, krill, lixo, rede, splash e fanfarra).
- [x] **4.3 Polimento do Relatório de Migração (`victoryScreen.ts`):** Indicador de Sabedoria Ancestral / Herança Cultural, partículas brilhantes e fanfarra de vitória.
- [x] **4.4 Silenciamento de Áudio no Fim de Jogo:** Interrupção imediata de sons ambientes e cantos ao desmaiar/morrer e durante a tela de resgate.

### 🎵 FASE 5: Sonoplastia 16-Bit Retrô & Redesenho de SFX

- [x] **5.1 Redesenho do Som de Alimentação de Krill (Engolida / Sucção):** Som biológico de sucção por cerdas (baleen filter sweep) e deglutição de massa d'água (`playKrillGulp`), eliminando o efeito de moeda.
- [x] **5.2 Síntese de Efeitos Sonoros 16-Bit Retrô:** Recriação em síntese FM clássica (2 operadores) para o sonar com eco secundário reflexivo (`playSonarSound`), impulso de nado (`playStrokeThrust`), colisão com lixo (`playTrashThud`), atrito em rede fantasma (`playNetTangle`), splash de reentrada e fanfarra de vitória (`playVictoryFanfare`).
- [x] **5.3 Trilha Sonora 16-Bit Adaptativa por Bioma:** Motor de sequenciamento musical procedural (`BiomeMusicEngine`) com arpejos gelados na Antártica, atmosfera submarina de mar aberto estilo _Ecco_ / _Aquatic Ambiance_, ritmo tenso e industrial na Costa Urbana, e progressão harmônica tropical solar em Arraial do Cabo.

### 🧭 FASE 6: Menu Inicial, Seleção de Modo & Diário de Bordo

- [x] **6.1 Tela de Menu Principal:** Menu inicial com visual marítimo, partículas bioluminescentes, high score persistente e opções: "Iniciar Migração", "Opções" e "Diário de Bordo (Codex)".
- [x] **6.2 Fluxo de Início com Escolha do Modo de Jogo:**
  - **Migração Normal:** Rota migratória clássica completa com dreno de oxigênio, perigos e pontuação no Eco-Score.
  - **Migração Serena:** Oxigênio infinito (`∞`) e navegação livre sem risco de desmaio, ideal para crianças, novatos e exploração contemplativa.
  - **Migração Rápida:** Partida cronometrada de 60 segundos com bioma selecionável (Labirinto Polar, Desvio Urbano ou Cânions de Arraial) e tela dedicada de estatísticas da rodada.
- [x] **6.3 Painel de Opções & Configurações de Áudio:** Ajuste de volume geral (+/-) e botões liga/desliga para música ambiente e efeitos sonoros com persistência em `localStorage`.
- [x] **6.4 Diário de Bordo da Expedição (Codex no Menu):** Painel categorizado em abas com consulta de espécies marinhas observadas, fatos ecológicos desbloqueados na rota e mensagens de conservação do _Instituto Baleia Jubarte_.

### 🐋 FASE 7: Identidade da Jubarte, Habilidades & Feedback Sensorial (Arte & Animação)

- [x] **7.1 Sprite Personalizado da Baleia-Jubarte:**
  - Substituição definitiva do `bean.png` por spritesheet dedicado com anatomia real da Jubarte (nadadeiras peitorais longas e brancas, tubérculos no focinho, corcunda e cauda serrilhada).
- [x] **7.2 Animações Orgânicas de Nado & Alimentação:**
  - Movimento ondulante da cauda/flukes sincronizado com o impulso de nado (`Espaço`).
  - Abertura suave da mandíbula de cerdas (baleen) com partículas de sucção ao engolir cardumes de Krill.
- [x] **7.3 Esguicho do Espiráculo (Blowhole Spout):**
  - Erupção vertical de vapor e borrifo d'água em formato de V com partículas e som de exalação profunda (_whoosh_) ao romper a superfície para respirar.
- [x] **7.4 Sonar Omnidirecional (Varredura de Tela Total) & Revelação Subaquática:**
  - O sonar deixa de ser direcional (eliminando o cone estreito de 30°) e passa a emitir uma onda acústica expansiva em 360° cobrindo toda a tela (raio de 650px).
  - Redes fantasmas e lixo plástico camuflados nas profundezas acendem com contorno acústico e esmaecem gradualmente, além de ecos nos cânions rochosos.
- [x] **7.5 Canto da Baleia Retrô 16-Bit em 3 Canais & Barramento de Eco SNES:**
  - Reconstrução da vocalização (`playWhaleSong`) em 3 canais inspirados em trackers (Assobio LFO, Gemido Cello Sine/Sawtooth submerso e Percussão Zíper em C0) com barramento de eco de 180ms e filtro passa-baixa a 420Hz.
  - Eliminação de temporizadores aleatórios: a baleia só canta quando o jogador aciona o sonar ou quando baleias próximas emitem pulsos acústicos no mar aberto ou santuário.

### 🌅 FASE 8: Cenários Vivos & Atmosfera em Paralaxe (Profundidade & Luz)

- [x] **8.1 Raios de Sol Subaquáticos (_God Rays_) & Caustics (`lightRaysSystem.ts`):**
  - Feixes translúcidos de luz solar filtrando dinamicamente da superfície em direção às profundezas, com destaque luminoso dourado e turquesa cintilante em Arraial do Cabo.
  - Cáusticos de refração luminosa ondulando na sub-superfície acompanhando o movimento das águas.
- [x] **8.2 Céu Vivo em Paralaxe (`parallaxSkySystem.ts`):**
  - Nuvens em deriva contínua e velocidade elástica relativa de paralaxe no topo da tela.
  - Aves marinhas migratórias com batimento de asas em tempo real (Albatrozes na Antártica; Gaivotas e Fragatas na Costa Urbana e Arraial).
  - Silhueta do Farol da Ilha do Farol no horizonte de Arraial (~25.950m) com torre listrada e feixe cônico rotativo varrendo o céu e o mar.
- [x] **8.3 Detalhamento do Fundo Marinho Bentônico (`benthicFloorSystem.ts`):**
  - Florestas de algas gigantes (_kelp_) na Antártica com física de deformação senoidal fluida de ondulação.
  - Recifes de corais em Arraial do Cabo (corais-cérebro com sulcos, leques de gorgônias e anêmonas fluorescentes) acompanhados de peixes de recife coloridos.

### 🌊 FASE 9: Dinâmica Ecológica, Fauna Rara & Perigos Adicionais

- [x] **9.1 Mancha de Óleo Pré-Arraial (antes do Boqueirão):** Mancha negra iridescente entre 17.400m e 18.900m que obstrui o espiráculo por lodo e impede a respiração até a realização de mergulho de limpeza em águas profundas.
- [x] **9.2 Descarte Ativo de Lixo por Navios Industriais:** Navios cargueiros da Costa Urbana ejetam periodicamente tambores tóxicos, engradados de madeira e sacos plásticos em sua esteira que afundam em zigue-zague com colisão ativa.
- [x] **9.3 Nado em Bando com Golfinhos (_Drafting_):** Bandos de Golfinhos-Rotadores em mar aberto que concedem esteira hidrodinâmica favorável (+25% velocidade e -40% dreno de O₂) com trilha aerodinâmica e cliques 16-bit.
- [x] **9.4 Silhueta de Cachalote nas Profundezas:** Encontro solene com leviatã abissal colossal de 280px no leito profundo (8.000m - 10.800m) emitindo infrassom oceânico ressonante e ondas de choque acústicas.
- [x] **9.5 Pinguins-de-Magalhães Saltando na Saída Antártica:** Bandos ágeis realizando _porpoising_ (saltos em arco fora d'água) com rastro de bolhas e pios rápidos na transição polar (4.000m - 5.200m).

### 📱 FASE 10: Modo Kiosk & Acessibilidade Mobile

_Objetivo: Maximizar o engajamento com totens interativos, visitantes e dispositivos touch._

- [x] **10.1 Modo Kiosk (Demonstração Interativa):**
  - Ativação de um screensaver/demonstração cinematográfica autônoma se o jogo permanecer inativo por 45 segundos no menu, com convite: _"Toque em qualquer tecla para guiar a Jubarte!"_.
- [x] **10.2 Controles Virtuais Touch na Tela:**
  - Suporte a botões virtuais na tela para tablets, celulares e totens interativos.

### 🏗️ FASE 11: Arquitetura & Qualidade de Código (Refatoração & Testes)

_Objetivo: Desacoplar sistemas monolíticos, eliminar dívidas técnicas e garantir estabilidade através de testes automatizados._

- [x] **11.1 Modularização de `player.ts` (God Object):**
  - Decompor o monólito em submódulos especializados: `playerPhysics.ts` (arrasto, gravidade e limites), `playerOxygen.ts` (dreno e recuperação de fôlego), `playerSonar.ts` (eco acústico 360°), `playerParticles.ts` (espiráculo, bolhas e rastros) e `playerControls.ts` (unificação de teclado e touch).
- [x] **11.2 Tipagem Estrita e Fim do `any` Generalizado:**
  - Criar e exportar interfaces explícitas `PlayerController`, `GameState` e tipos auxiliares do Kaboom, substituindo tipagens fracas em sistemas de colisões, telas de vitória e resgate.
- [x] **11.3 Modularização de `audioSystem.ts`:**
  - Dividir o módulo de áudio em arquivos dedicados: `audioEngine.ts` (contexto Web Audio, master volume e resume), `audioSfx.ts` (efeitos sonoros pontuais), `audioMusic.ts` (trilha adaptativa `BiomeMusicEngine`) e `audioAmbient.ts` (sons de fundo marinho e vocalizações).
- [x] **11.4 Externalização do Layout de Níveis:**
  - Mover posições e coordenadas manuais de lixo, krill e redes de `main.ts` para arquivo de configuração `data/level_layout.json` ou sistema de spawn determinístico por bioma.
- [x] **11.5 Testes Automatizados com Vitest:**
  - Implementar suíte de testes unitários cobrindo o gerenciador de estado (`createGameState`), persistência de resoluções, detecção de ambiente touch e física essencial da baleia.

### 🎮 FASE 12: Gameplay & Mecânicas Novas

_Objetivo: Enriquecer a dinâmica de navegação e introduzir novas camadas estratégicas durante a migração._

- [x] **12.1 Geração Procedural de Obstáculos por Bioma:**
  - Substituir posições fixas por geração dinâmica de perigos e cardumes com base no avanço horizontal X da baleia, garantindo rejogabilidade única em cada tentativa sem memorização prévia de rota.
- [x] **12.2 Filhote de Baleia Acompanhante (Calf Escort) & Rota de 30.000m:**
  - Expansão da rota final para 30.000m com 5.000m de escolta ativa no berçário (25.000m a 30.000m). O filhote enfrenta perigos residuais (redes fantasmas, lixo e paredões rochosos invisíveis que só aparecem com Biosonar). O jogador pode usar o Biosonar em 360° para cortar redes e libertar o filhote em apuros.
- [x] **12.3 Power-ups Temporários Ambientais:**
  - Introduzir itens colecionáveis temáticos: _Escudo de Bolhas_ (imunidade a uma colisão com lixo), _Corrente Favorável_ (+50% de velocidade por 5s), _Bolsão de Ar Submerso_ (+30% fôlego instantâneo) e _Bioluminescência_ (revelação luminosa de perigos próximos por 8s).
- [x] **12.4 Leaderboard Local Top 10 (Ranking Arcade):**
  - Expandir o high score único para um ranking Top 10 persistente em `localStorage`, com inserção de iniciais do jogador (estilo arcade de 3 letras), ideal para disputa entre jogadores.

### 🎨 FASE 13: Polimento Visual, Atmosfera & Identidade

_Objetivo: Elevar o impacto visual e a imersão sensorial com micro-animações e apresentação profissional._

- [x] **13.1 Partículas Dinâmicas de Bolhas de Nado:**
  - Adicionar emissão contínua de rastro de micro-bolhas (2-4px) partindo da cauda da baleia durante a propulsão, com intensidade proporcional à velocidade instantânea.
- [x] **13.2 Cardumes de Krill Reactivos (Comportamento de Boids):**
  - Substituir os blocos estáticos de krill por pequenos enxames orgânicos (8 a 12 micro-entidades) que se dispersam dinamicamente quando a baleia se aproxima.
- [x] **13.3 Ciclo Dia/Noite Sutil ao Longo da Rota:**
  - Implementar transição gradativa da paleta de iluminação ambiente ao longo dos 30.000m: luz polar límpida na Antártica, entardecer alaranjado no Mar Aberto, noite com luzes de navegação e estrelas na Costa Urbana, alvorada mística nos cânions e amanhecer dourado e radiante em Arraial do Cabo.
- [x] **13.4 Tela de Loading / Splash Screen Animada:**
  - Criar tela de introdução estilizada de 2 a 3 segundos com logo animado emergindo em bolhas, barra de carregamento temática e créditos institucionais.
- [x] **13.5 Cartão de Vitória / Compartilhamento de Resultado:**
  - Gerar cartão de resultado exportável em imagem PNG na tela de vitória, contendo nome do jogador, pontuação final, estatísticas da migração, logo do projeto e selo digital.

### 📚 FASE 14: Conteúdo Educativo Expandido & Avaliação

_Objetivo: Fortalecer o valor pedagógico e a fixação do aprendizado para jurados e público estudantil._

- [x] **14.1 Expansão do Acervo de Fatos Científicos (`facts.json`):**
  - Ampliar de 5 para 12+ fatos ecológicos baseados em dados reais (propagação acústica no canal SOFAR, mortalidade por redes fantasmas, correntes oceânicas e a história da Reserva Extrativista de Arraial do Cabo).
- [x] **14.2 Quiz Interativo Pós-Vitória:**
  - Adicionar mini-desafio opcional ao final da rota com 3 perguntas de múltipla escolha sobre os fatos ecológicos desbloqueados durante a partida, premiando acertos com pontuação extra no Eco-Score.

### ⚡ FASE 15: Otimização & Performance em Baixo Nível

_Objetivo: Garantir taxa de quadros estável (60 FPS) em dispositivos com hardware modesto (tablets e notebooks)._

- [x] **15.1 Object Pooling para Partículas e Projéteis:**
  - Implementar pool de objetos reutilizáveis para bolhas de nado, spray do espiráculo, ecos do sonar e rastros hidrodinâmicos, reduzindo alocações e pausas de Garbage Collection.
- [x] **15.2 Ciclo de Vida e Lazy Loading de Sistemas por Bioma:**
  - Ativar e desativar a execução de sistemas específicos (ex: `iceSurface`, `shipNoise`, `oilSpill`) estritamente dentro de suas faixas de coordenadas X, poupando processamento de CPU.

### 🎪 FASE 16: Engajamento & Ferramentas de Apresentação

_Objetivo: Fornecer métricas coletivas e recursos para apresentação aos avaliadores._

- [x] **16.1 Dashboard de Estatísticas Acumuladas:**
  - Painel persistente visível no menu principal exibindo contadores coletivos de todos os jogadores (total de migrações tentadas, migrações concluídas com sucesso, krill total coletado, lixo desviado e tempo total acumulado de jogo).
- [x] **16.2 Modo Apresentação Guiada (Apoio aos Jurados/Professores):**
  - Atalho dedicado (`Ctrl+P`) que ativa sobreposição de legendas explicativas e destaques conceituais em tempo real, permitindo aos apresentadores guiar a banca avaliadora pelos conceitos ecológicos e de programação implementados.

---

## 🎯 Próximas Fases (Ordenadas por Prioridade)

---

### 🐋 FASE 17: Animação Orgânica da Jubarte & Cenários de Arraial

_Objetivo: Elevar a fidelidade visual da criatura marinha e a organicidade dos relevos costeiros submersos._

- [x] **17.1 Redesenho do Spritesheet da Baleia com Flexão Caudal (Spine Curvature):**
  - Adicionar curvatura real da coluna vertebral e do pedúnculo caudal nos frames de batida (`whale.png`), com arco côncavo no _downstroke_ e arco convexo no _upstroke_, enriquecendo a silhueta da jubarte.
- [x] **17.2 Animação de Manobra & Roll em Perspectiva:**
  - Variação de rotação/roll sutil ao mudar bruscamente de profundidade, exibindo o padrão estriado do ventre e as nadadeiras peitorais brancas em perspectiva.
- [x] **17.3 Efeito de Reflexo Cáustico sobre a Pele da Baleia:**
  - Projeção sutil de cáusticos de luz solar ondulando sobre o dorso da baleia enquanto ela navega próximo à superfície cristalina.
- [x] **17.4 Relevo Orgânico Submerso do Boqueirão da Ilha do Farol:**
  - Reformulação visual da parte submersa do relevo rochoso (25.400m a 27.300m): substituir a laje retangular plana e rígida por costões rochosos escarpados de granito com silhueta orgânica irregular, fendas submarinas, estratificação geológica, fissuras, tufos de anêmonas, ouriços e bioincrustações de costão marinho real de Arraial do Cabo.

### 🌊 FASE 18: Dinâmica Hidrodinâmica de Correntezas & Acessibilidade

_Objetivo: Aprofundar a física biológica da navegação e garantir acessibilidade a todos os perfis de jogadores._

- [x] **18.1 Dinâmica de Fôlego em Correntezas (Nado a Favor vs. Contra o Fluxo):**
  - Modelar o consumo de oxigênio conforme o alinhamento da baleia com o vetor da correnteza: se a jubarte estiver virada e nadando contra o fluxo, o esforço físico intensificado aumenta o dreno de oxigênio (+35%); se estiver virada e nadando a favor da correnteza, a esteira hidrodinâmica reduz o dreno de oxigênio (-35%), criando uma camada tática e biológica realista de navegação oceânica.
- [x] **18.2 Modos de Alto Contraste & Daltonismo:**
  - Paletas comutáveis no menu de opções (Protanopia, Deuteranopia e Alto Contraste com contornos reforçados para lixo, redes e krill).
- [x] **18.3 Seletor de Trilha Sonora / Jukebox Oceânica:**
  - Opção no menu para alternar em tempo real entre: _Trilha 16-Bit Chiptune Dinâmica_ (estilo David Wise), _Trilha Ambiente Contemplativa_ (apenas hidrofones, água e cantos de baleia) e _Modo Foco_ (apenas SFX).
- [x] **18.4 Feedback Háptico em Dispositivos Móveis:**
  - Vibração tátil (`navigator.vibrate`) em tablets e celulares ao romper o gelo polar, sofrer colisão ou emitir o Biosonar.

### 🌐 FASE 19: Eventos Climáticos & Distribuição para Totens (PWA)

_Objetivo: Preparar o jogo para eventos públicos, feiras de ciências escolares e totens de museus sem dependência de internet._

- [x] **19.1 Eventos Climáticos Dinâmicos na Rota:**
  - Micro-climas ao longo da migração: nevasca polar passageira na Antártica, céu encoberto com vendaval em alto-mar e calmaria solar radiante em Arraial do Cabo.
- [x] **19.2 Modo PWA Offline-First para Totens Interativos & Feiras de Ciências:**
  - Configuração de Service Worker e Web App Manifest permitindo instalação autônoma no desktop ou tela inicial de tablets, com cache local de todos os assets (sprites, sons, scripts), rodando 100% offline em estandes e museus sem necessidade de conexão com a internet.

---

### 🌌 FASE 20: Imersão Visual Avançada

_Objetivo: Elevar o impacto estético do jogo com fenômenos naturais visuais e storytelling cinematográfico de baixo custo de implementação._

- [x] **20.1 Esteira de Bioluminescência Procedural:**
  - Na Costa Urbana (bioma noturno, `skyColor = [12, 18, 38]`), a passagem da jubarte ativa uma esteira de partículas bioluminescentes azul-esverdeadas persistindo 2–3s atrás dela — fenômeno real documentado e visualmente espetacular no bioma mais escuro.
- [x] **20.2 Vinhetas Narrativas de Transição de Bioma:**
  - Ao cruzar 5.000m, 12.000m, 19.000m e 25.000m, exibir brevemente (2s) uma vinheta com o nome do bioma e uma frase poética, estilo títulos de mapa de _Donkey Kong Country_. Ex.: _"TRAVESSIA PELÁGICA — Onde o krill acaba e os golfinhos começam."_
- [x] **20.3 Zoom Cinematográfico em Eventos Narrativos:**
  - Em momentos de alta tensão dramática (entrada na ressurgência, primeiro navio, encontro com golfinhos), a câmera executa um suave zoom-in de 1.3× por 2–3s com `k.tween` de `camScale` — custo de implementação mínimo, impacto máximo.
- [x] **20.4 Sombras Dinâmicas Projetadas sob a Baleia:**
  - Projetar uma sombra elíptica difusa abaixo da jubarte que cresce quanto mais rasa ela estiver (perto do `SEA_LEVEL`) e desaparece nas profundezas, reutilizando o `depthFactor` já implementado nos cáusticos solares.

---

## 🔜 Próximas Fases Planejadas

### 📚 FASE 21: Conteúdo Educacional & Acessibilidade Expandida

_Objetivo: Aprofundar o impacto pedagógico com quiz rico (exclusivo para o final do jogo), narração em voz acessível e onboarding contextual._

- [x] **21.1 Banco de Quiz Expandido (50+ Perguntas por Bioma & Dificuldade):**
  - Expandir o `data/quiz.json` de 10 para 50+ perguntas organizadas por bioma e dificuldade progressiva (fácil → médio → difícil). **Nota de Design Estrita:** O quiz permanece exclusivamente como desafio opcional pós-jogo (na tela de vitória e no Diário de Bordo/Codex no menu), nunca interrompendo a natação durante a migração ativa.
- [x] **21.2 Narração em Voz via Web Speech API (TTS):**
  - Usar `SpeechSynthesisUtterance` nativo do browser para narrar os fatos ecológicos em voz neutra em português quando surgem na tela — sem necessidade de arquivos de áudio externos. Configurável nas Opções (ativar/desativar). Torna o jogo acessível para crianças menores que ainda não leem fluentemente.
- [x] **21.3 Onboarding PWA para Primeira Abertura:**
  - Na primeira abertura como PWA ou web (detectada via `localStorage`), exibir 3 slides rápidos de contextualização: (1) quem é a jubarte (_Megaptera novaeangliae_), (2) como os controles funcionam (nado, oxigênio e Biosonar), (3) por que ela migra (30.000m até Arraial do Cabo). Essencial para totens onde não há monitor humano explicando o jogo, acessível também a qualquer momento pelo menu.

### 🏆 FASE 22: Progressão, Competição & Rejogabilidade

_Objetivo: Criar motivação para retorno e competição saudável entre jogadores e turmas escolares._

- [x] **22.1 Ranking Online Global (Cloudflare Worker + KV):**
  - Substituir o ranking local pelo envio de score ao backend (Cloudflare Worker gratuito + KV Store) com arquitetura offline-first transparente. O nome/iniciais já é coletado pelo `initialsInputModal.ts`. Exibir top 10 global, semanal e local com abas de navegação.
- [x] **22.2 Desafios Semanais por Semente Procedural:**
  - Usar a data da semana como semente determinística para um layout de obstáculos idêntico no mundo todo a cada 7 dias. Ranking semanal separado do ranking padrão. Ao completar, gera um Certificado Oficial com selo único, data e semente no Victory Card.

### 🔧 FASE 23: Qualidade Técnica & Plataformas

_Objetivo: Reduzir débito técnico, ampliar alcance de plataformas e garantir robustez de longo prazo do projeto._

- [x] **23.1 Refatoração Modular do `audioSystem.ts`:**
  - O `audioSystem.ts` possuía 1.338 linhas — o maior arquivo do projeto. Quebrado em módulos coesos: `audioEngine.ts` (AudioContext, gain, mute/volume, loop de áudio ambiente), `audioSFX.ts` (todos os efeitos sonoros procedurais e aquáticos), `audioWhale.ts` (síntese dos cantos de baleia em 3 canais e chamados abissais) e integração harmônica com o `audioMusic.ts`, mantendo `audioSystem.ts` como fachada 100% retrocompatível.
- [x] **23.2 Suporte a Gamepad/Joystick (Gamepad API):**
  - Mapeamento de `navigator.getGamepads()` no loop de update: botão A (sul) → batida de cauda, direcional/analógico esquerdo Y → controle de profundidade vertical, botão B/X → Biosonar, botão Start → Pausa/Apresentação. Deadzone calibrada em 0.22 para joysticks de totens e consoles.
- [x] **23.3 HUD de Diagnóstico com Histórico de FPS (Expandir F3):**
  - Expandido o HUD F3 para registrar buffer circular de 60 amostras de FPS com gráfico sparkline inline em caracteres unicode (` ▂▃▄▅▆▇█`), métricas de mínimo, média e máximo, e alerta visual com destaque em vermelho para gargalos críticos (< 45 FPS).
- [x] **23.4 Sprite da Jubarte com 8 Frames (vs. 4 Anteriores):**
  - Spritesheet expandido de 4 para 8 frames (1024x64 px) em `scripts/generateWhaleSprite.cjs`, gerando nova folha de sprites biológica com ciclos suaves de subida (upstroke), descida potente (downstroke), retorno elástico, deslizamento e engolfamento alimentar (feed). Atualizado no `main.ts` com animações fluídas.

### 🛠️ FASE 24: Developer Experience & Qualidade de Código

_Objetivo: Estabelecer ferramentas de qualidade, padronização e observabilidade do código que sustentem o crescimento do projeto a longo prazo._

- [x] **24.1 ESLint + Prettier — Linting e Formatação Padronizada:**
  - Configurado `eslint.config.js` oficial do ESLint 9 Flat Config com `@typescript-eslint` e Prettier integrado via `eslint-config-prettier`. Adicionados scripts `"lint"`, `"lint:fix"`, `"format"` e `"format:check"` ao `package.json`.
- [x] **24.2 Husky + lint-staged — Pre-commit Hooks:**
  - Configurados `husky` e `lint-staged` para executar automaticamente formatação Prettier, linting com fix e suite completa de testes unitários antes de cada commit.
- [x] **24.3 Cobertura de Testes com Relatório Visual (`vitest --coverage`):**
  - Adicionado `@vitest/coverage-v8` e o script `"coverage": "vitest run --coverage"` com relatórios visuais text, JSON e HTML nativos do Vitest.
- [x] **24.4 Versionamento Semântico (`package.json` + `CHANGELOG.md`):**
  - Atualizado pacote para `"name": "micro-splash"` e `"version": "1.0.0"`. Criado `CHANGELOG.md` seguindo Keep a Changelog e SemVer com histórico retroativo completo cobrindo todas as Fases de 1 a 24.
- [x] **24.5 Script de Geração de Assets Unificado (`npm run generate`):**
  - Adicionados scripts no `package.json`: `"generate": "node scripts/generateWhaleSprite.cjs && node scripts/generatePwaIcons.cjs"`, `"generate:whale"` e `"generate:icons"`.
- [x] **24.6 Validação de Schema com Zod para `data/*.json`:**
  - Criados schemas Zod em `src/schemas/dataSchemas.ts` para `facts.json`, `quiz.json` e `level_layout.json`. Criados script executável `scripts/validateData.cjs` (`npm run validate:data`) e suíte de testes `tests/dataSchema.test.ts` com 8 verificações integradas ao pipeline de testes.

### 🚀 FASE 25: Infraestrutura, CI/CD & Deploy

_Objetivo: Automatizar o ciclo de integração, testes e publicação do jogo, tornando o deploy nos totens e a URL pública triviais._

- [x] **25.1 GitHub Actions — Pipeline de CI Completo:**
  - Criado `.github/workflows/ci.yml` executando em push e pull requests para `main` e `develop`: checkout + Node 20, `npm ci`, verificação Prettier (`npm run format:check`), linting (`npm run lint`), validação de dados Zod (`npm run validate:data`), cobertura completa de testes com Vitest (`npm run coverage`), compilação de produção (`npm run build`) e upload de artefatos de cobertura.
- [x] **25.2 GitHub Actions — Deploy Automático para Cloudflare Pages / GitHub Pages:**
  - Criado workflow `.github/workflows/deploy.yml` disparado no merge para `main`: build de produção (`npm run build`), deploy automático via GitHub Pages (`actions/deploy-pages`) e job integrado pronto para publicação Cloudflare Pages via Wrangler (`cloudflare/pages-action`).
- [x] **25.3 Docker Multi-Stage Build — Imagem de Produção Otimizada:**
  - Criado `Dockerfile.prod` com arquitetura multi-stage (Node 20 Alpine builder -> Nginx 1.27 Alpine runtime) e `nginx.conf` dedicado com fallback SPA (`try_files $uri $uri/ /index.html`), compressão gzip, headers de segurança (CSP, X-Frame-Options, Permissions-Policy), cache imutável para assets e endpoint de saúde `/healthz`. A imagem de produção foi reduzida de ~900MB para ~21.2MB.
- [x] **25.4 `docker-compose.prod.yml` para Totens:**
  - Criado `docker-compose.prod.yml` com imagem de produção, política de auto-recuperação `restart: always` contra quedas de energia em museus/totens, mapeamento de porta `8080:80`, healthcheck contínuo via `curl http://localhost/healthz` e inicialização em comando único (`docker compose -f docker-compose.prod.yml up -d`).
- [x] **25.5 Variáveis de Ambiente com Vite (`.env` files) & Versionamento em UI:**
  - Criados `.env.example`, `.env.development` e `.env.production` com tipagem estrita em `src/vite-env.d.ts`. Injetado `__APP_VERSION__` automaticamente a partir do `package.json` no `vite.config.ts`, exportado no `src/config.ts` e exibido como badge discreto de versão (`v1.0.0`) no rodapé do menu principal (`mainMenu.ts`) e no modal de opções (`optionsScreen.ts`), facilitando diagnósticos remotos em totens sem console aberto.

### 📄 FASE 26: Documentação, Acessibilidade & Compliance

_Objetivo: Tornar o projeto acessível para colaboradores, educadores, usuários com necessidades especiais e compatível com requisitos legais de ambientes escolares públicos._

- [x] **26.1 `CONTRIBUTING.md` — Guia de Contribuição:**
  - Criado `CONTRIBUTING.md` oficial documentando configuração com Docker e Node, convenção de Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`), scripts de validação e guia passo a passo para educadores e oceanógrafos adicionarem novos fatos e perguntas sem tocar em código TypeScript.
- [x] **26.2 `docs/DATA_SCHEMA.md` — Documentação dos Dados Educacionais:**
  - Criado `docs/DATA_SCHEMA.md` com especificação completa dos schemas Zod (`FactSchema`, `QuizQuestionSchema`, `LevelLayoutSchema`), detalhamento de campos, restrições e exemplos didáticos de contribuição.
- [x] **26.3 README.md com Badges, Controles e Instruções Kiosk:**
  - Atualizado `README.md` com badges de CI, Deploy Pages, Versão v1.1.0, Licença MIT, PWA e WCAG 2.1 AA. Tabela universal de controles (Teclado, Touch, Gamepad), guia para totens escolares e links para a documentação de compliance.
- [x] **26.4 Documentação JSDoc nos 10 Sistemas Principais:**
  - Documentação formal JSDoc adicionada com anotações `@param`, `@returns` e fundamentos biofísicos em `oceanCurrentsSystem`, `breachSystem`, `particlePool`, `weatherSystem`, `dolphinDraftingSystem`, `iceSurface`, `proceduralObstacles`, `penguinFlockSystem`, `canyonSystem` e `biomeLifecycleManager`.
- [x] **26.5 Navegação por Teclado Completa nos Menus (WCAG 2.1 AA):**
  - Implementado utilitário `src/ui/keyboardNav.ts` com gerenciador de foco `createFocusGroup`, navegação direcional (`Tab`, `Shift+Tab`, `Setas`), acionamento por `Enter`/`Espaço`, tecla `Escape` e anel indicador visual de foco de alto contraste no Menu Principal e Menu de Opções.
- [x] **26.6 Suporte a `prefers-reduced-motion`:**
  - Integração no `accessibilitySystem.ts` com detecção de `window.matchMedia('(prefers-reduced-motion: reduce)')`, modos `auto`, `reduced` e `full`, persistência em `localStorage` e supressão de tremores de tela (`screenShake`) e flashes no `collisions.ts` e `playerPhysics.ts`.
- [x] **26.7 Tamanho de Fonte Configurável na UI (3 Níveis):**
  - Adicionado suporte a três níveis de escala (`Pequena 0.85x`, `Normal 1.0x`, `Grande 1.2x`) no `accessibilitySystem.ts`, com alternador nas Opções e helper `scaleFont(baseSize)` para adequação a baixa visão e totens de grande porte.
- [x] **26.8 `docs/PRIVACIDADE.md` + Botão "Apagar Dados" nas Opções (LGPD):**
  - Criado `docs/PRIVACIDADE.md` detalhando política de privacidade escolar sem rastreadores ou cookies de terceiros. Adicionado botão "🗑️ Apagar Dados (LGPD)" no menu de opções com modal de confirmação e rotina de exclusão imediata de todas as chaves `micro_splash_*`.

### 🌍 FASE 27: Marketing, Analytics, Conteúdo & Internacionalização

_Objetivo: Ampliar o alcance do jogo para audiências nacionais e internacionais, obter dados reais de uso e abrir o conteúdo educacional para co-criação institucional._

- [x] **27.1 Open Graph e Twitter Cards no `index.html`:**
  - Adicionado meta tags `og:title`, `og:description`, `og:image`, `og:type` e `twitter:card` ao `index.html`. Quando professores compartilharem o link do jogo no WhatsApp, Telegram ou Twitter, o preview exibirá imagem e título em vez de URL crua.
- [x] **27.2 Imagem de Preview Social (`public/og-image.png`):**
  - Criada imagem estática 1200×630px com logo "Micro Splash", silhueta da jubarte e slogan. Gerada via `scripts/generateOgImage.cjs` com canvas puro e script npm `generate:og`.
- [x] **27.3 Landing Page Estática (`public/about.html`):**
  - Página standalone com screenshot/preview do jogo, botões de ação, pilares biológicos da migração, guia para totens/kiosks, atalhos universais, QR Code vetorial e selo de conformidade com a LGPD e WCAG 2.1 AA.
- [x] **27.4 Analytics de Privacidade via Plausible (Self-hosted ou Cloud):**
  - Integrado Plausible Analytics via `src/services/analytics.ts` (open-source, sem cookies, LGPD-compliant) com eventos: `game_started`, `migration_completed`, `migration_abandoned`, `biome_reached`, `quiz_taken`, `breach_triggered` e respeito ao cabeçalho `Do Not Track`.
- [x] **27.5 Relatório de Erros com Sentry (Free Tier / Fallback Gracioso):**
  - Criado `src/services/errorReporter.ts` com fallback automático quando não configurado. Captura exceções globais (`window.onerror`), rejeições não tratadas e falhas de `AudioContext` nos totens.
- [x] **27.6 Content Security Policy (CSP) via Nginx/Cloudflare Headers:**
  - Configurado header `Content-Security-Policy` restritivo e `Permissions-Policy` no `nginx.conf` e no arquivo estático `public/_headers`. Previne XSS e injeção de scripts externos em totens escolares.
- [x] **27.7 Ferramenta de Edição de Conteúdo Educacional (CMS Lite):**
  - Criado `tools/editor.html` — aplicação web autônoma client-side para adicionar, editar e validar fatos (`facts.json`) e quiz (`quiz.json`) com validação alinhada aos schemas Zod e exportação com 1 clique.
- [x] **27.8 Tradução para Inglês (i18n pt-BR / en-US):**
  - Criado módulo `src/i18n/` com `locales/pt-BR.json` e `locales/en-US.json`, função `t(key, params)` e seletor cíclico de idioma nas Opções com persistência no `localStorage`.
- [x] **27.9 Suporte a Línguas Indígenas Brasileiras (Guarani Nhandewa):**
  - Adicionada tradução para Guarani Nhandewa (`gn`) em `src/i18n/locales/gn.json` — celebrando o patrimônio e vocabulário tradicional marinho costeiro (_Piraju_, _Para_, _Mborai_, _Pytu_).

### 🐋 FASE 28: Proporcionalidade Biológica & Redesenho de Entidades

_Objetivo: Corrigir as proporções de todas as criaturas e objetos em relação à jubarte controlável (108px de referência), tornando o ecossistema visual biologicamente crível e pedagogicamente honesto._

- [x] **28.1 Redimensionamento dos Pinguins-de-Magalhães:**
  - Corpo recalibrado para `14×5px` com `radius: 2`, barriga ventral branca de alto contraste `10×2.5px`, bico preto `3×1.5px`, nadadeiras em polígono e pés escuros. Bando compacto com espaçamento inter-aves reduzido para ~18px.
- [x] **28.2 Redimensionamento dos Golfinhos-Rotadores:**
  - Corpo reduzido para `28×9px` com `radius: 4`, ventre claro `20×3.2px`, rostro/bico delgado `5.5×2.5px` e barbatana dorsal falcada em polígono. Formação em escalão ajustada para drafting proporcional.
- [x] **28.3 Redimensionamento do Cachalote Abissal:**
  - Escala biológica calibrada em `0.95` (renderizando `182×59px` com cabeça retangular massiva de espermacete a partir do frame `192×64px`), representando ~19m e 50 toneladas contra os 14m/120px da jubarte do jogador — garantindo superioridade anatômica e imponência volumétrica. Ponto de emissão dos cliques do espermacete calibrado para a frente do focinho (`pos.x + 84`).
- [x] **28.4 Ajuste do Berçário de Mãe e Filhote:**
  - Mãe jubilosa ajustada com escala `0.66` (95×32px, plano de fundo harmônico). Filhote recalibrado com escala `0.26` (38×13px, exatos ~40% do comprimento da mãe, correspondendo a um filhote do ano real de 5m). Nado sincronizado em esteira de escalão e bolhas de acolhimento.
- [x] **28.5 Aumento e Redesenho do Navio Cargueiro:**
  - Casco expandido para `280×50px` (`radius: 12`), linha d'água rubro-marítima `280×14px` em camada `z: -2` (`opacity: 0.88`), chaminé monumental `35×45px` com anel de topo `42×10px` e 9 vigias de convés iluminadas. Ejeção de resíduos industriais calibrada na esteira da popa.
- [x] **28.6 Redesenho do Lixo Plástico — 3 Formas Procedurais:**
  - 3 variantes realistas: (1) garrafa PET `11×22px` com gargalo/tampa estreita `6×4px` e hitbox calibrada `11×26px`; (2) sacola plástica `20×17px` com alças e hitbox `20×19px`; (3) embalagem/copo amassado `circle(10px)`. Decaimento e revelação por ecolocalização calibrados.
- [x] **28.7 Redesenho da Rede Fantasma — Grade Visual Real:**
  - Malha geométrica monofilamento autêntica com cabo superior de sustentação (floatline), 4 boias de pesca de deriva, grade de linhas cruzadas e nós de interseção nos cruzamentos. Revelação integral por sonar.
- [x] **28.8 Representação Visual dos Bolsões de Ar:**
  - Núcleo etéreo pulsante central com duplo anel luminoso (`circle 22px` e `12px`), pulsação harmônica senoidal em estado ativo e atenuação transparente translúcida (`opacity: 0.12 / 0.20`) durante o resfriamento de 4s.

### 🌊 FASE 29: Superfície, Céu & Atmosfera

_Objetivo: Transformar a interface visual entre ar e água — o elemento mais visível do jogo — e enriquecer o céu de cada bioma com fenômenos atmosféricos reais e coerentes com a geografia da rota._

- [x] **29.1 Linha d'Água Ondulada e Orgânica:**
  - Substituído o retângulo monolítico por `src/systems/waterSurfaceSystem.ts`, composto por colisor contínuo invisível (`TAGS.SURFACE`) e 14 segmentos verticais interconectados animados por ondas senoidais harmônicas desfasadas, com crista de espuma branca translúcida (`opacity: 0.38`).
- [x] **29.2 Reflexo Lunar na Costa Urbana Noturna:**
  - Adicionado disco lunar `circle(16)` marfim suave (`rgb(248, 242, 215)`) com halo difuso (`circle(26)`) no céu noturno (12.000–19.000m) e coluna de 5 filetes luminosos de reflexo aquático na superfície, oscilando organicamente conforme a ondulação do mar.
- [x] **29.3 Névoa de Profundidade no Horizonte Inferior:**
  - Criado `src/systems/abyssalFogSystem.ts` com 4 camadas graduais de névoa marinha na borda inferior da tela (`opacity: 0.12, 0.24, 0.42, 0.70`), dissolvendo o leito oceânico suavemente nas trevas abissais e eliminando cortes secos.
- [x] **29.4 Ondas e Espuma Costeira em Arraial do Cabo:**
  - Criado `src/systems/coastalSurfSystem.ts`: ao cruzar 24.800m, gera filetes de espuma e rebentação costeira (`rect(10–26, 2.2px)`) derivando de leste para oeste na superfície da Enseada dos Anjos.
- [x] **29.5 Nuvens em Paralaxe Harmoniosas:**
  - Preservado o formato clássico e elegante de nuvens horizontais arredondadas em `src/systems/parallaxSkySystem.ts`, com deriva suave do vento, fatores de paralaxe multicamada e transição cromática orgânica ao longo do ciclo dia/noite da rota.
- [x] **29.6 Aurora Austral na Antártica (Lights Australis):**
  - Criado `src/systems/auroraSystem.ts` com 6 cortinas verticais ondulantes de luz em verde-esmeralda elétrico e magenta estelar no céu polar antártico (0–5.000m), com respiração luminosa suave e fade-out gracioso.
- [x] **29.7 Pôr do Sol em Camadas na Travessia Pelágica:**
  - Implementadas 5 faixas horizontais de gradiente crepuscular no céu da travessia (5.000–12.000m): azul-crepúsculo escuro → lilás/roxo → rosa coral → âmbar alaranjado → dourado solar rasante.
- [x] **29.8 Pássaros Marinhos com Anatomia e Identidade de Espécie:**
  - Aves marinhas diferenciadas com anatomia autêntica por bioma: **Albatroz-viajante** (envergadura de 44px, pontas escuras, planeio longo), **Fragata-magnífica** (plumagem escura, cauda em tesoura bifurcada, voo ágil) e **Garça-branca/Atobá** (plumagem alva, pescoço em S e pernas estendidas).

### 🌿 FASE 30: Fundo Submarino, Iluminação & Identidade dos Obstáculos

_Objetivo: Enriquecer o leito marinho com flora e geologia procedural por bioma, corrigir a iluminação subaquática e dar identidade visual real a cada tipo de obstáculo._

- [x] **30.1 Silhuetas Procedurais do Fundo por Tipo Geológico:**
  - `oceanFloorSystem.ts` atualizado com funções puras `generateReliefPolygonPoints` e `generateReliefCapPolygonPoints`: morainas com cristas serrilhadas de cascalho glacial, montes submarinos cônicos com ápice pronunciado, bancos de areia com topo suave e declive gradual, paredões escarpados de cânion e plataformas de arrecife.
- [x] **30.2 Flora Submarina por Bioma:**
  - `benthicFloorSystem.ts` expandido com flora específica: algas vermelhas polares (_Rhodophyta_) com ondulação senoidal na Antártica (0–5.000m); ausência fótica preservada no Pelágico (5.000–12.000m); pradarias de ervas marinhas cinza-esverdeadas com micro-plásticos emaranhados na Costa Urbana (12.000–19.000m); expansão de nódulos e crostas calcárias rosas de _Lithothamnion_ em Arraial do Cabo (19.000–30.000m).
- [x] **30.3 Neve Marinha nas Profundidades Abissais (Marine Snow):**
  - Criado `src/systems/marineSnowSystem.ts`: 16 micro-partículas de sedimento orgânico (`circle 1–1.8px`, tom `rgb(120, 140, 160)`, `opacity: 0.22–0.32`) flutuando suavemente para baixo com deriva senoidal na Travessia Pelágica (5.000m a 12.000m).
- [x] **30.4 God Rays Mais Largos e Visíveis:**
  - `lightRaysSystem.ts` calibrado com largura de 8px a 18px (`calculateGodRayWidth`), opacidade base atenuada para 0.04–0.06 e variação atmosférica por bioma, eliminando tiras sólidas e entregando volumetria fótica etérea.
- [x] **30.5 Escuridão Progressiva com Profundidade:**
  - Criado `src/systems/depthDarknessSystem.ts` com cálculo físico `calculateDepthDarknessOpacity`: overlay abissal `rgb(0, 10, 25)` em camada fixa `z: 8` que escurece proporcionalmente ao mergulho da baleia (opacidade 0 na superfície até ~0.38 perto do leito marinho).
- [x] **30.6 Halo de Luz do Espiráculo ao Respirar na Superfície:**
  - Adicionado em `playerParticles.ts` dentro de `spawnBlowholeSpout`: ao romper o `SEA_LEVEL` para respirar, emite brevemente (0.5s) um halo elíptico expansivo `circle(30px)` branco (`opacity: 0.20`) na lâmina da água.
- [x] **30.7 Mancha de Óleo com Camadas Iridescentes Realistas:**
  - `oilSpillSystem.ts` reestruturado em 3 camadas físicas: (1) base densa `(8, 5, 5, 0.90)` de petróleo bruto; (2) película iridescente com cálculo químico `calculateIridescentOilColor` alternando azul petróleo, verde esmeralda e violeta; (3) gotas de espuma emulsionada nas margens do derramamento.
- [x] **30.8 Gelo Translúcido com Veias Glaciais:**
  - `iceSurface.ts` aprimorado: bordas superior e de fusão inferior translúcidas (`opacity: 0.40`), 3 faixas horizontais de estratificação cristalina polar compactada e 3–4 veias diagonais de azul glacial profundo (`rgb(30, 80, 140)`, `opacity: 0.15`).

### 🎆 FASE 31: Partículas, Coerência de Bioma & Polimento de Interface

_Objetivo: Adicionar efeitos de partículas em momentos dramáticos ausentes, garantir coerência visual consistente entre todos os biomas e refinar a interface HUD._

- [x] **31.1 Splash de Reentrada da Baleia após o Breach:**
  - O momento de reentrada na água após o salto majestoso — o clímax do jogo — não tem efeito de splash. Ao cruzar `SEA_LEVEL` com velocidade Y > 200, disparar 16–24 partículas de respingo em arco simétrico (`rect 3×8px` brancos com gravidade) — metade para a esquerda, metade para a direita. O momento mais dramático do jogo precisa do efeito mais impactante.
- [x] **31.2 Rastro de Bolhas Caudal após Batida:**
  - A cada batida de cauda, emitir 5–8 `circle(2–4px)` de cor `(200, 230, 255, 0.5)` que sobem lentamente (`vel.y = −20` a `−40`) deixando rastro visual de esforço físico — como bolhas de ar expelido pelos músculos ao nadar. Fenômeno real e visualmente comunicativo da cadência de nado.
- [x] **31.3 Plâncton Bioluminescente nos Biomas Noturnos:**
  - Nos biomas noturno e de ressurgência (12.000–25.000m), distribuir 20–30 `circle(1–2px)` estáticos de cor verde-azulada `(60, 200, 180)` com pulsação `sin(time + phase) * 0.4` de opacidade — dinoflagelados bioluminescentes, presença massiva e real documentada nas águas de Arraial do Cabo e Costa dos Corais do Brasil.
- [x] **31.4 Paleta de Obstáculos Contextualizada por Bioma:**
  - Lixo e redes têm cores uniformes em todos os biomas, quebrando a coerência visual. Variar por contexto: **Antártica** → lixo acinzentado congelado `(180, 60, 60)`, redes em verde-cinza glacial; **Pelágico** → lixo translúcido azulado `(60, 100, 200)` — aspecto de plástico submerso; **Costa** → lixo vermelho saturado + grafite industrial agressivo; **Arraial** → lixo alaranjado `(220, 140, 50)` — plástico desbotado pelo sol tropical.
- [x] **31.5 Transições Suaves de Flora e Partículas entre Biomas:**
  - Elementos como flora e partículas atmosféricas mudam abruptamente ao cruzar fronteiras de bioma. Criar zonas de "easing" de 200–400m nos limites (5.000m, 12.000m, 19.000m, 25.000m) onde os elementos do bioma anterior fazem fade-out enquanto os do próximo fazem fade-in — reutilizando o padrão já implementado no `calculateWeatherAtDistance()` do `weatherSystem.ts`.
- [x] **31.6 Partículas do Menu Principal Temáticas:**
  - Partículas do menu atual: `circle(1.5–3.5px)` genéricas em azul/verde/amarelo. Substituir por 3 tipos temáticos intercalados: bolhas de ar subindo `(circle 1–2px ciano)`; plâncton luminescente `(rect 2×6px rotacionado 45°)`; medusas miniatura `(circle 4px com borda branca tênue ondulante)`. Identidade oceânica desde a tela inicial.
- [x] **31.7 HUD de Distância com Indicador de Bioma:**
  - HUD atual usa `text` simples sem estilo visual definido. Substituir por caixa com background translúcido, borda oceânica e indicador do bioma atual com ícone emoji correspondente: ❄️ Antártica, 🌊 Pelágico, 🏭 Costa Urbana, 🌀 Cânions, ☀️ Arraial do Cabo.
- [x] **31.8 Barra de Oxigênio com 3 Estados Visuais de Urgência:**
  - Implementar estados visuais distintos da barra de oxigênio: **>50%** → azul calmo pulsando suavemente; **20–50%** → âmbar com pulsação acelerada e leve tremor; **<20%** → vermelho pulsando rapidamente + borda da tela com vinheta escurecida e tremulante — comunicando urgência crescente sem texto.
- [x] **31.9 Cursor do Mouse com Identidade Visual Oceânica:**
  - Cursor padrão do browser quebra a imersão. Substituir via CSS `cursor: url(...)` por bolha oceânica `(circle 12px turquesa com borda branca)` no estado normal e âncora ou anzol no estado `hover` sobre botões — identidade oceânica mantida desde antes de clicar no primeiro botão.

### 🖋️ FASE 32: Tipografia, Texto & Hierarquia Visual

_Objetivo: Substituir a fonte padrão do browser por tipografia oceânica consistente, corrigir hierarquias textuais entre telas e garantir legibilidade em todas as resoluções suportadas._

- [x] **32.1 Fonte Customizada — Carregar Google Font via `index.html`:**
  - Todo texto do jogo usa `font: "sans-serif"` — a fonte padrão do browser, que varia entre sistemas operacionais (Helvetica no macOS, Arial no Windows, DejaVu no Linux). Carregar `Orbitron` (títulos e HUD — estilo técnico/científico) + `Inter` (textos corridos, modais, quiz) via `<link>` no `index.html`. Passar o nome da fonte para todos os `k.text()` via constante `FONT_TITLE` e `FONT_BODY` em `config.ts`.
- [x] **32.2 Hierarquia Tipográfica Consistente entre Telas:**
  - Cada tela usa tamanhos de texto definidos ad-hoc sem sistema: `splashScreen.ts` usa 48/16/12px, `modeSelectScreen.ts` usa 22/18/14px, `rescueScreen.ts` usa 18/14/12px, `victoryScreen.ts` usa 16/14/12px. Criar escala tipográfica única em `config.ts`:
    - `TEXT_SIZE_DISPLAY` = 44px (logo, splash)
    - `TEXT_SIZE_H1` = 24px (títulos de tela)
    - `TEXT_SIZE_H2` = 18px (subtítulos de modal)
    - `TEXT_SIZE_BODY` = 14px (texto de leitura)
    - `TEXT_SIZE_CAPTION` = 11px (labels, hints, dicas)
- [x] **32.3 Texto das Telas de UI com Sombra de Legibilidade:**
  - Nenhum texto de UI tem sombra — textos claros sobre fundos oceânicos claros tornam-se ilegíveis em determinadas seções. Adicionar sombra offscreen (1–2px offset, cor escura `opacity: 0.6`) em todos os textos com tamanho > 14px, usando a técnica já presente na `splashScreen.ts` linha 78 mas ausente nas demais telas.
- [x] **32.4 Texto dos Fatos Educativos com Quebra de Linha Adaptativa:**
  - Os fatos do `facts.json` aparecem em modais com `width` fixo. Em resoluções baixas (450p = 800×450px) o texto pode transbordar. Calcular `width: Math.min(500, k.width() - 80)` dinamicamente em todos os `k.text()` de conteúdo educacional.
- [x] **32.5 Distância Exibida com Formatação de Milhas Náuticas:**
  - A distância atual é exibida em metros (ex.: "14.238m") — unidade pouco intuitiva para crianças e não é a unidade usada em navegação marinha real. Exibir em paralelo: `"14.238m • 7,7 mn"` (milhas náuticas, onde 1mn = 1.852m). Implementar função `toNauticalMiles(meters: number)` em utilitário auxiliar.
- [x] **32.6 Nome do Bioma Atual Exibido no HUD:**
  - O HUD atual mostra distância mas não o nome do bioma atual, deixando o jogador sem contexto geográfico. Adicionar linha secundária ao HUD com o nome do bioma (`"❄️ Oceano Antártico"`, `"🌊 Travessia Pelágica"`, etc.) atualizado a cada mudança de `BIOME_COLOR_STOPS`.
- [x] **32.7 Textos da Tela de Resgate com Tom Narrativo:**
  - A tela de resgate exibe estatísticas como linha plana de debug (`"📏 Distância Navegada: 14238m"`). Reformular com linguagem narrativa imersiva: `"A jubarte avançou 14.238 metros de sua jornada..."` — mantendo os dados mas embalados em contexto de história, mais adequado ao público infantil.
- [x] **32.8 Texto de Teclas de Controle com Ícones de Teclado:**
  - Instruções de controle como `"Pressione ESPAÇO"` são textuais genéricas. Substituir por representação visual de tecla: `[ESPAÇO]`, `[↑]`, `[↓]` usando `rect` com `border-radius` e `outline` — visual de "tecla física". Padrão amplamente reconhecido em jogos modernos.

### 🖥️ FASE 33: Sistema de Resoluções, Modos de Tela & Responsividade

_Objetivo: Expandir os presets de resolução para alta fidelidade (1440p, 4K), eliminar distorções de aspecto e resoluções legadas, corrigir o modo letterbox com overlay e adicionar detecção automática baseada na resolução nativa do dispositivo._

- [x] **33.1 Presets de Alta Resolução 16:9 (4K, 1440p, 1080p) e Limpeza de Resoluções Legadas:**
  - Presets configurados: `"4K": { width: 3840, height: 2160 }`, `"1440p": { width: 2560, height: 1440 }` e `"1080p": { width: 1920, height: 1080 }`.
  - Remoção das resoluções legadas de baixa resolução (`720p`, `540p` equilibrado e `450p` retrô clássico) para assegurar nitidez em alta definição e fidelidade visual contínua. Sprites procedurais em Kaboom escalam via GPU sem perda de qualidade.
- [x] **33.2 Preset Automático — Detectar Resolução Nativa do Dispositivo:**
  - Opção `"auto"` que detecta `window.screen.width × window.screen.height`. Exibida como `"Auto (Detectado: 1920×1080) 🔍"` nas Opções, simplificando a configuração para qualquer usuário.
- [x] **33.3 Avaliação & Remoção de Resoluções com Distorção (Ultrawide & Retrato):**
  - Avaliação prática de proporções ultrawide (21:9, 32:9) e retrato (3:4); para evitar distorção severa ou achatamento dos sprites da baleia e cenário, tais modos foram deliberadamente excluídos, mantendo fidelidade absoluta em 16:9.
- [x] **33.4 Modo Letterbox Funcionando Corretamente com Barras Escuras:**
  - Overlay em `src/systems/letterboxSystem.ts` com 4 retângulos fixos em `z: 999` cobrindo as margens de proporção. Alternância de cor entre Preto (`#000000`) e Azul Oceânico (`#06122a`), sincronizada com o fundo do DOM.
- [x] **33.5 Padronização e Fidelidade 16:9 Universal:**
  - Garantia de consistência matemática em todos os presets suportados (`width / height ≈ 16 / 9`), prevenindo qualquer achatamento ou estiramento de elementos de gameplay.
- [x] **33.6 Persistência de Resolução por Dispositivo:**
  - Chave de armazenamento individualizada `micro_splash_resolution_${screen.width}x${screen.height}` salvando a preferência para cada display conectado.
- [x] **33.7 Preview de Proporção em Tempo Real nas Opções:**
  - Mini-tag dinâmica nas Opções exibindo a proporção de aspecto e dimensões calculadas a cada clique no seletor de resolução.
- [x] **33.8 Indicador de Resolução Atual no HUD F3:**
  - Exibição de telemetria técnica `Tela: W×H (Modo)` no painel de diagnóstico F3 para suporte e verificação.

### 🎬 FASE 34: Telas de Jogo — Visual & Polimento de UI

_Objetivo: Elevar todas as telas de interface (splash, menu, vitória, resgate, opções, modo) ao mesmo nível visual cinematográfico, com animações de entrada, identidade oceânica e estado de hover comunicativo._

- [x] **34.1 Animação de Entrada em Todos os Modais:**
  - Nenhum modal tem animação de entrada — aparecem instantaneamente. Implementar `k.tween` de escala (`0.85 → 1.0`) + opacity (`0 → 1`) em 0.25s com easing `k.easings.easeOutBack` para todos os cards de modal. Feedback visual imediato de abertura.
- [x] **34.2 Tela de Splash com Logo Animado e Subtítulo Melhorado:**
  - O logo "MICRO-SPLASH" aparece em `k.text()` simples em `size: 48`. Redesenhar com duas cores intercaladas por letra (alternando azul-turquesa e branco) e animação de entrada letter-by-letter via delay de `k.wait`. O subtítulo atual `"A JORNADA DA BALEIA-JUBARTE"` poderia ser enriquecido com ícones laterais de âncora e cauda de baleia.
- [x] **34.3 Barco de Resgate com Detalhes Visuais:**
  - O barco de resgate (`boat.ts`) tem: casco `90×30px` + cabine `30×20px` + luz piscante. Sem ondas de scia, sem mastro, sem número identificador. Adicionar: mastro vertical (`rect 3×40px`), bandeira (`polygon triangular` verde), esteira de scia (2–3 partículas brancas atrás) e uma faixa diagonal laranja característica da Guarda Marítima Brasileira.
- [x] **34.4 Tela de Vitória com Partículas Temáticas de Confete:**
  - A tela de vitória (`victoryScreen.ts` com 613 linhas) não tem partículas visuais de celebração. Adicionar 40–60 partículas de confete em cores oceânicas (turquesa, dourado, branco) com `rect 4×8px` rotacionados aleatoriamente e física de gravidade suave. Disparar apenas 1× ao entrar na tela.
- [x] **34.5 Botões com Estado Hover Visual Consistente:**
  - `onHoverUpdate` está implementado apenas na tela de resgate (`rescueScreen.ts` linha 94). Nos outros modais (Opções, Modo, Vitória, Codex), os botões não têm feedback de hover. Padronizar: hover = cor base + 30% mais clara, cursor pointer, leve expansão de escala (`1.0 → 1.04` via `k.tween`).
- [x] **34.6 Tela de Seleção de Modo com Cards Visuais por Modo:**
  - `modeSelectScreen.ts` lista os modos em texto puro. Transformar em cards com: ícone grande do modo (🏊 migração, ⚡ challenge, 🎭 apresentação), fundo de cor diferente por modo e um preview textual de "O que esperar" em 2 linhas. Padrão visual de seleção de personagem/modo de jogos AAA.
- [x] **34.7 Tela do Codex com Ícones de Bioma e Barra de Progresso:**
  - O Codex exibe fatos desbloqueados em lista simples. Adicionar: ícone emoji do bioma à esquerda de cada fato, indicador `"3/4 desbloqueados"` por bioma, e barra de progresso horizontal de 100% representando a rota completa com marcadores nos pontos de fato.
- [x] **34.8 Loading Overlay ao Trocar de Resolução:**
  - Ao confirmar mudança de resolução nas Opções, a tela reconfigura instantaneamente — pode causar flash visual. Adicionar fade-out de 0.3s (`rect` preto em `z: 9999`) antes do `window.location.reload()` que aplica a nova resolução.

### 🐬 FASE 35: Polimento Visual dos Sistemas Ausentes

_Objetivo: Cobrir elementos visuais não tratados nas fases anteriores — ressurgência, kelp/corais bentônicos, ventos térmicos e correntes oceânicas visíveis._

- [x] **35.1 Jatos de Ressurgência com Mais Detalhes Visuais:**
  - Jatos atuais: `rect(30, 80, radius: 10)` azul `(0, 220, 255, 0.4)` com `outline: 3` branco (`upwellingSystem.ts` linha 48). Parecem cápsulas rígidas. Redesenhar como feixes de linhas finas (`rect 4×80px`) em leque de 5–7 ângulos ligeiramente diferentes, sem border rígido, com gradiente de opacity (mais denso na base, mais transparente no topo) — visual de corrente d'água subindo, não de objeto sólido.
- [x] **35.2 Kelp com Gradiente de Cor por Altura:**
  - O kelp no `benthicFloorSystem.ts` usa cor uniforme por planta. O kelp real tem base marrom-escura e folhas dourado-esverdeadas no topo (por exposição à luz). Aplicar cor progressiva por segmento: base `(55, 35, 15)` → topo `(110, 130, 40)` — usando o índice `s` do loop de segmentos.
- [x] **35.3 Corais com Animação de Abertura/Fechamento:**
  - Corais no `benthicFloorSystem.ts` têm tipos `"brain"`, `"fan"`, `"anemone"`. Os tipos `fan` e `anemone` são ideais para animação de pulsação — anêmonas abrem e fecham os tentáculos com `sin(time)`. Implementar variação de escala Y `(0.85–1.15)` em ciclo de 2–3s nos corais do tipo `anemone`.
- [x] **35.4 Correntes Oceânicas Visíveis (Favoráveis e Contrárias):**
  - O sistema de correntes contrárias empurra fisicamente a baleia mas é completamente invisível — o jogador percebe o efeito mas não vê o elemento. Representar com 4–6 linhas de traço horizontais (`rect 40×2px`) em azul-cinza `(100, 150, 200, 0.25)` se movendo na direção da corrente — setas de fluxo animadas como em mapas oceanográficos.
- [x] **35.5 Barco de Pesca Realista no Bioma da Costa Urbana:**
  - Além dos navios cargueiros, o bioma urbano deveria ter embarcações pesqueiras menores (traineiras/arrastradores) que despejam redes — seria o `ghostNet` com origem visual clara em vez de aparecer do nada. Um barco de pesca `60×20px` estacionado com rede visível sendo lançada por ele daria contexto narrativo ao perigo.
- [x] **35.6 Refluxo de Espuma nos Blocos de Gelo ao Serem Quebrados:**
  - Ao quebrar um bloco de gelo, os estilhaços são retangulares. Adicionar 6–8 partículas circulares brancas `(circle 3–6px)` em adição aos estilhaços quadrados, simulando espuma de água gelada espirrada pelo impacto — diferente das partículas de gelo em forma de shard.

### 🎧 FASE 36: Masterização & Espacialização de Áudio

_Objetivo: Elevar a qualidade sonora sem alterar gameplay — evitar clipping, eliminar cliques, adicionar espacialidade e respeitar o ciclo de vida da aba._

- [x] **36.1 Limiter no Barramento Master:**
  - `audioEngine.ts` conecta `masterGain` (`volume × 1.35`) direto ao `destination`. Inserir `DynamicsCompressorNode` (threshold `-6dB`, ratio `12`, attack `3ms`, release `250ms`) entre master e saída para evitar clipping em picos de SFX simultâneos.
- [x] **36.2 Rampas de Ganho sem Cliques:**
  - `setVolume`, `toggleMute`, `pauseAmbient` e `updateSoundtrackPlayback` usam `setValueAtTime` (salto instantâneo → estalo audível). Substituir por `setTargetAtTime(valor, now, 0.05)`, padrão já usado em `audioMusic.ts`.
- [x] **36.3 Crossfade entre Modos de Trilha:**
  - Troca chiptune/ambiente/foco salta o `ambientGain` entre `0.04`, `0.12` e `0.015`. Aplicar crossfade de ~0.6s entre `biomeEngine` e ambiência.
- [x] **36.4 Panning Estéreo por Posição:**
  - Nenhum `StereoPannerNode` no projeto. Panear SFX de navios, golfinhos, krill, lixo e gelo conforme X relativo à baleia (`pan = clamp((objX - playerX) / (width/2), -1, 1)`).
- [x] **36.5 Reverb Subaquático & Abafamento por Profundidade:**
  - Adicionar `ConvolverNode` com impulso procedural (ruído com decaimento exponencial ~1.8s) no barramento de SFX e low-pass global modulado pelo Y da baleia (superfície ~8kHz → fundo ~1.2kHz).
- [x] **36.6 Pausa de Áudio com Aba Oculta:**
  - Sem handler `visibilitychange`. Suspender `AudioContext` ao ocultar a aba e retomar ao voltar (respeitando estado de mute).
- [x] **36.7 Loop de Ruído Oceânico sem Costura:**
  - O buffer de ruído marrom de 4s em `startAmbientOcean` tem descontinuidade no ponto de loop. Aplicar crossfade de ~50ms entre início e fim do buffer.

### 🛠️ FASE 37: Qualidade de Código & Consistência Técnica Visual

_Objetivo: Reduzir dívida técnica, padronizar utilitários e alinhar o código às regras de `ai.rules` sem alterar gameplay._

- [x] **37.1 Spawn Independente de Taxa de Quadros:**
  - Spawns usam `Math.random() < taxa` por frame (`upwellingSystem.ts` jatos `0.4`/krill `0.005`, `oceanCurrentsSystem.ts` partículas `0.25`, entre outros) — em 144Hz geram ~2.4× mais objetos que em 60Hz. Converter para `taxa × deltaTime` normalizado (idêntico em 60Hz).
- [x] **37.2 `prefers-reduced-motion` Global:**
  - Fase 26.6 cobre `collisions.ts`/`playerPhysics.ts`, mas `k.shake()` em `upwellingSystem.ts`, `iceSurface.ts` e outros ignora a preferência. Centralizar em helper `safeShake(k, intensidade)` consultando `accessibilitySystem`.
- [x] **37.3 Adoção Unificada de `attachButtonHoverEffect`:**
  - `onHoverUpdate` manual duplicado em 13 arquivos de `src/ui/`. Migrar para o utilitário de `animationUtils.ts`.
- [x] **37.4 Nomenclatura Explícita (Clean Code):**
  - Renomear abreviações: `currentX`/`dir` (`shipNoiseSystem.ts`), `rad` (`breachSystem.ts`), `idx`/`cIdx`/`p`/`s` (`audioSFX`, `parallaxSky`, `oilSpill`, `particlePool`, `penguinFlock`, `dolphinDrafting`, `benthicFloor`), `btn`/`idx` (`gamepadSystem.ts`).
- [x] **37.5 Utilitário Tipado de Persistência (`utils/storage.ts`):**
  - 15 arquivos repetem `try/catch` + `JSON.parse` + `typeof localStorage`. Criar `readStorage<T>(key, schema, fallback)` / `writeStorage(key, value)` validando com schemas de `src/schemas`.
- [x] **37.6 Remoção do `any` Remanescente:**
  - Apesar da Fase 11.2, restam usos em ~27 arquivos (`ambientWhaleTimer: any`, `window as any`, `allShipBodies: any[]`). Trocar por `GameObj`, `ReturnType<typeof setInterval>` e `Window & { webkitAudioContext?: typeof AudioContext }`.
- [ ] **37.7 Decomposição de Arquivos Extensos:**
  - `codexScreen.ts` (~1100 linhas) → uma função por aba; `optionsScreen.ts` (37KB), `audioSFX.ts` (23KB), `canyonSystem.ts` (22KB) em submódulos; cenas de `main.ts` (588 linhas) para `src/scenes/`.
- [x] **37.8 Guarda de Ambiente no `AudioEngine`:**
  - `init()` acessa `window` sem guarda, gerando `ReferenceError` no stderr dos testes. Adicionar `typeof window !== "undefined"`.
- [x] **37.9 Logs via `errorReporter`:**
  - `console.*` direto em 7 arquivos. Rotear para `errorReporter` com níveis (`warn`/`error`).
- [x] **37.10 RNG Injetável (`utils/random.ts`):**
  - `Math.random()` em ~50 arquivos. Centralizar em gerador com seed opcional para testes determinísticos.
- [x] **37.11 Auditoria de Listeners de `window`:**
  - 7 arquivos de `src/ui/` registram `addEventListener`. Garantir remoção no fechamento do modal/cena e guarda de ambiente.

### 📱 FASE 38: PWA Offline Avançado & Telemetria Educativa

_Objetivo: Elevar a experiência autônoma em totens e feiras de ciências com instalação PWA assistida, gestão de cache e métricas de impacto pedagógico._

- [x] **38.1 Prompt Customizado de Instalação PWA & Status de Rede (`src/ui/pwaInstallModal.ts`):**
  - Capturar `beforeinstallprompt` e fornecer botão estilizado de instalação no menu e opções sem alertas nativos. Exibir status de conectividade em tempo real (`Online 🟢 / Offline 📡`).
- [x] **38.2 Gestão de Cache Dinâmico & Atualização Silenciosa do Service Worker (`src/utils/swManager.ts`):**
  - Estratégia stale-while-revalidate para dados pedagógicos (`data/facts.json`) e áudio. Notificação sutil in-game quando uma nova versão for instalada em segundo plano.
- [x] **38.3 Telemetria Educativa Local & Métrica de Conscientização (`src/systems/telemetrySystem.ts`):**
  - Rastreamento local-first de impacto educacional: contagem de fatos lidos, quizzes completados e tempo de engajamento, com exportação/visualização segura para educadores e feiras.
- [x] **38.4 Modo Exibição Contínua para Totens (Kiosk Auto-Reset Configurável):**
  - Configuração nas Opções para tempo de inatividade em totens (30s, 60s, 120s ou desativado), retornando ao menu e tela de atração automaticamente.
- [x] **38.5 Testes Automatizados da Fase 38 (`tests/phase38_pwa_telemetry.test.ts`):**
  - Suíte de testes unitários cobrindo ciclo de vida PWA, validação de cache e registro de telemetria educativa.

### ⚡ FASE 39: Otimização Extrema de Performance & Taxa de Quadros (60 FPS Sólido)

_Objetivo: Eliminar gargalos severos de renderização e CPU identificados pela telemetria em tempo real (< 15 FPS), garantindo 60 FPS contínuo em qualquer dispositivo._

- [ ] **39.1 Frustum Culling Espacial & Ocultação Fora da Câmera (`src/systems/spatialCullingSystem.ts`):**
  - Implementar sistema de frustum culling leve para entidades e obstáculos do cenário (`ocean_relief`, `kelp_segment`, `ice_block`, `lixo_plastico`, `krill`, etc.), alternando `hidden = true` e desativando updates quando fora do campo de visão horizontal da câmera mais margem de segurança.
- [ ] **39.2 Eliminação de Consultas Lineares $O(N)$ em Loops de Update (`src/main.ts`, `src/systems/iceSurface.ts`, `src/entities/krill.ts`, `src/systems/penguinFlockSystem.ts`):**
  - Eliminar chamadas repetidas a `k.get(TAGS.PLAYER)` a cada frame substituindo por passagem direta do `playerController` ou cache de referência.
  - Eliminar chamada `k.get("*").length` a cada frame em `src/main.ts`, aplicando throttling de medição de entidades a 2Hz (a cada 500ms).
- [ ] **39.3 Integração Ampla de Subsistemas no `BiomeLifecycleManager` (`src/systems/benthicFloorSystem.ts`, `src/systems/canyonSystem.ts`, `src/systems/backgroundFauna.ts`):**
  - Registrar os maiores emissores de GameObjects (`benthicFloorSystem` com ~500 nós, `canyonSystem` com ~200 nós, `backgroundFauna` e `oceanFloorSystem`) no gerenciador de ciclo de vida bioma, suspendendo renderização e animações quando o jogador estiver fora do bioma respectivo.
- [ ] **39.4 Presets de Resolução Adaptativa & Modo Alta Performance (`src/config.ts`, `src/ui/optionsScreen.ts`):**
  - Adicionar presets de desempenho: 720p (`1280x720`) e 540p (`960x540`) com renderização leve nativa, e detecção de taxa crítica com sugestão automática de perfil de performance.
- [ ] **39.5 Migração de Emissores de Fauna para o `ParticlePool` & Throttling de Textos HUD (`src/systems/backgroundFauna.ts`, `src/ui/debugDistance.ts`):**
  - Migrar emissão de bolhas e anéis das orcas/jubartes de fundo para o `ParticlePool` em vez de alocações dinâmicas `k.add`.
  - Aplicar throttling nas atualizações de strings complexas do HUD de debug.
- [ ] **39.6 Testes Automatizados de Performance & Integridade (`tests/phase39_performance_culling.test.ts`):**
  - Suíte de testes validando frustum culling, lifecycle de biomas, ausência de consultas lineares em updates e estabilidade das entidades.
