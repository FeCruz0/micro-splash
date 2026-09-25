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

- [ ] **26.1 `CONTRIBUTING.md` — Guia de Contribuição:**
  - Documentar como configurar o ambiente (Docker vs. Node), convenção de commits (`feat:`, `fix:`, `docs:`, `test:`), como regenerar sprites (`npm run generate`) e como adicionar fatos/perguntas nos arquivos `data/*.json` sem tocar em TypeScript. Essencial para receber contribuições de professores e pesquisadores.
- [ ] **26.2 `docs/DATA_SCHEMA.md` — Documentação dos Dados Educacionais:**
  - Documentar os schemas de `facts.json`, `quiz.json` e `level_layout.json` com exemplos e regras de validação. Explicar como educadores e oceanógrafos podem contribuir com conteúdo sem conhecimento de programação.
- [ ] **26.3 README.md com Screenshots e GIF Demo:**
  - Adicionar ao `README.md`: 1 GIF animado de 5–8s capturando gameplay (breach, sonar, krill), 3 screenshots dos biomas principais, badge de CI (verde/vermelho) e badge de versão. O README atual é puramente textual — sem nenhuma imagem do jogo.
- [ ] **26.4 Documentação JSDoc nos 10 Sistemas Principais:**
  - Adicionar JSDoc mínimo com `@param`, `@returns` e descrição de propósito nos sistemas mais complexos: `oceanCurrentsSystem`, `breachSystem`, `particlePool`, `weatherSystem`, `dolphinDraftingSystem`, `iceSurface`, `proceduralObstacles`, `penguinFlockSystem`, `canyonSystem` e `biomeLifecycleManager`. Apenas `audioSystem.ts` tem JSDoc atualmente.
- [ ] **26.5 Navegação por Teclado Completa nos Menus (WCAG 2.1 AA):**
  - Implementar navegação por `Tab`/`Setas` + `Enter` em todos os modais e menus (Main Menu, Opções, Codex, Quiz, Victory Screen). Atualmente todos dependem exclusivamente de mouse/toque — não conformes com WCAG 2.1 nível AA nem usáveis em totens com teclado.
- [ ] **26.6 Suporte a `prefers-reduced-motion`:**
  - Verificar `window.matchMedia('(prefers-reduced-motion: reduce)')` e, quando ativo, desabilitar ou suavizar: partículas do menu principal, animações de entrada de modais, tremores e flashes de impacto. Expor toggle manual nas Opções. Essencial para usuários com epilepsia fotossensível ou distúrbios vestibulares.
- [ ] **26.7 Tamanho de Fonte Configurável na UI (3 Níveis):**
  - Adicionar opção nas Opções para escalonar textos de UI em três níveis (`Pequeno`, `Padrão`, `Grande`), salvo em `localStorage`. Afeta todos os textos de modais, Codex e Quiz via multiplicador global no parâmetro `size` dos `k.text()`. Acessibilidade para baixa visão em totens com telas grandes.
- [ ] **26.8 `docs/PRIVACIDADE.md` + Botão "Apagar Dados" nas Opções (LGPD):**
  - Criar documento descrevendo quais dados são armazenados no `localStorage` (highscore, fatos desbloqueados, stats cumulativas), que nenhum dado é enviado a terceiros e como o usuário pode resetar tudo. Adicionar botão "🗑️ Apagar Todos os Dados" nas Opções. Requisito legal para adoção em redes escolares públicas municipais (LGPD).

### 🌍 FASE 27: Marketing, Analytics, Conteúdo & Internacionalização

_Objetivo: Ampliar o alcance do jogo para audiências nacionais e internacionais, obter dados reais de uso e abrir o conteúdo educacional para co-criação institucional._

- [ ] **27.1 Open Graph e Twitter Cards no `index.html`:**
  - Adicionar meta tags `og:title`, `og:description`, `og:image`, `og:type` e `twitter:card` ao `index.html`. Quando professores compartilharem o link do jogo no WhatsApp, Telegram ou Twitter, o preview exibirá imagem e título em vez de URL crua.
- [ ] **27.2 Imagem de Preview Social (`public/og-image.png`):**
  - Criar imagem estática 1200×630px com logo "Micro Splash", silhueta da jubarte e slogan. Gerada via `scripts/generateOgImage.cjs` com canvas puro (mesma técnica do `generatePwaIcons.cjs`). Complemento direto da ideia 27.1.
- [ ] **27.3 Landing Page Estática (`public/about.html`):**
  - Página standalone com screenshot/GIF do jogo, botão "Jogar Agora" e "Instalar como App", seção educacional "O que a jubarte ensina?", links para o Instituto Baleia Jubarte e QR Code para instalação PWA em tablets. Ponto de entrada profissional para feiras de ciências e captação de parceiros institucionais.
- [ ] **27.4 Analytics de Privacidade via Plausible (Self-hosted ou Cloud):**
  - Integrar Plausible Analytics (open-source, sem cookies, LGPD-compliant) com eventos: `game_started`, `migration_completed`, `migration_abandoned`, `biome_reached`, `quiz_taken`, `breach_triggered`. Dados reais sobre onde jogadores desistem — informa ajustes sem suposições.
- [ ] **27.5 Relatório de Erros com Sentry (Free Tier):**
  - Adicionar `@sentry/browser` com DSN via `VITE_SENTRY_DSN`. Capturar exceções não tratadas e falhas de `AudioContext` nos totens. Sem Sentry, bugs em hardware de totem são completamente invisíveis.
- [ ] **27.6 Content Security Policy (CSP) via Nginx/Cloudflare Headers:**
  - Configurar header `Content-Security-Policy` restritivo no `nginx.conf` (Fase 25.3) ou `_headers` do Cloudflare Pages. Previne XSS e injeção de scripts externos — requisito básico de segurança para aplicações em ambiente escolar.
- [ ] **27.7 Ferramenta de Edição de Conteúdo Educacional (CMS Lite):**
  - Criar `tools/editor.html` — página HTML standalone (sem servidor) com formulários para adicionar/editar fatos em `facts.json` e perguntas em `quiz.json`, com exportação via botão "Baixar JSON". Puramente client-side com `FileReader` + `Blob`. Permite que professores contribuam com conteúdo sem código.
- [ ] **27.8 Tradução para Inglês (i18n pt-BR / en-US):**
  - Extrair strings de UI para `src/i18n/pt-BR.json` e `src/i18n/en-US.json`. Criar função `t(key)` que lê do locale ativo e adicionar seletor de idioma nas Opções. Habilita uso em escolas internacionais e publicação em plataformas como itch.io.
- [ ] **27.9 Suporte a Línguas Indígenas Brasileiras (Guarani Nhandewa):**
  - Adicionar tradução para Guarani Nhandewa (`gn`) — língua falada por comunidades costeiras do Sul do Brasil com relação ancestral com o ecossistema marinho e cetáceos migrantes. Diferencial único de acessibilidade cultural com potencial de parceria com FUNAI e universidades indígenas.

### 🐋 FASE 28: Proporcionalidade Biológica & Redesenho de Entidades

_Objetivo: Corrigir as proporções de todas as criaturas e objetos em relação à jubarte controlável (108px de referência), tornando o ecossistema visual biologicamente crível e pedagogicamente honesto._

- [ ] **28.1 Redimensionamento dos Pinguins-de-Magalhães:**
  - Corpo atual: `22×9px` — equivale biologicamente a um pinguim de ~2.9m. Reduzir para `14×5px` com `radius: 2`, compensando o detalhe com cores mais contrastantes (branco ventral vibrante, dorso quase preto). Proporção correta: pinguim real de 70cm vs. jubarte de 14m = razão 1:20 = ~5px de comprimento ideal.
- [ ] **28.2 Redimensionamento dos Golfinhos-Rotadores:**
  - Corpo atual: `46×15px` — equivale a um golfinho de ~5.9m (maior que uma orca real). Reduzir para `28×9px` com `radius: 4`. Golfinho-rotador real: ~1.8m = razão 1:8 = ~14px ideal. A formação de 4 golfinhos permanece legível e muito mais crível em relação à jubarte.
- [ ] **28.3 Redimensionamento do Cachalote Abissal:**
  - Corpo atual: `250×62px` — faz o cachalote parecer 2.3× maior que a jubarte. O cachalote real (18m) é apenas 30% maior. Reduzir para `145×40px`. Ainda dominante e imponente no plano abissal, mas proporcional à escala biológica real.
- [ ] **28.4 Ajuste do Berçário de Mãe e Filhote:**
  - Mãe atual: `130×45px` — maior que a jubarte jogável (108px), criando conflito visual se aparecerem juntos. Reduzir mãe para `95×32px` (perspectiva de background). Filhote atual: `55×20px` — deveria ser ~40% da mãe (filhote real: 4–5m vs. 14m). Reduzir filhote para `38×13px`.
- [ ] **28.5 Aumento e Redesenho do Navio Cargueiro:**
  - Casco atual: `140×30px` — faz o navio parecer do tamanho de um barco de pesca. Um cargueiro real tem 200–300m = 18× a jubarte. Aumentar para `280×50px` (posição `z: -2`, `opacity: 0.85` para indicar distância). Adicionar chaminé proporcional (`35×45px`), janelas de convés (série de `rect 4×3px`) e proa mais pontiaguda.
- [ ] **28.6 Redesenho do Lixo Plástico — 3 Formas Procedurais:**
  - Atual: quadrado monótono `22×22px` vermelho sem identidade. Diversificar em 3 tipos intercalados: (1) garrafa PET — `rect 8×20` + tampa `rect 12×5`; (2) sacola plástica — forma trapezoidal ondulante; (3) embalagem esférica amassada — `circle 11px`. Cores realistas: branco translúcido `(200, 220, 230)`, azul PET `(80, 140, 200)`, amarelo desbotado `(220, 200, 60)`.
- [ ] **28.7 Redesenho da Rede Fantasma — Grade Visual Real:**
  - Atual: retângulo violeta sólido `38×52px` sem semântica visual de "rede". Redesenhar como grade de linhas finas cruzadas — série de `rect 1×52px` espaçados verticalmente + série de `rect 52×1px` espaçados horizontalmente — em cor verde-translúcida `(80, 200, 120, 0.30)`. Imediatamente reconhecível como rede de pesca mesmo sem texto.
- [ ] **28.8 Representação Visual dos Bolsões de Ar:**
  - Atual: colisores de `AIR_POCKET` completamente invisíveis — o jogador percebe o efeito mas não vê o elemento. Adicionar `circle(20–30px)` com preenchimento `(200, 240, 255, 0.12)` e borda brilhante `outline(1.5, rgb(180, 230, 255, 0.6))` oscilando suavemente com `sin(time)`. Imediatamente legível como "bolsão de ar respirável".

### 🌊 FASE 29: Superfície, Céu & Atmosfera

_Objetivo: Transformar a interface visual entre ar e água — o elemento mais visível do jogo — e enriquecer o céu de cada bioma com fenômenos atmosféricos reais e coerentes com a geografia da rota._

- [ ] **29.1 Linha d'Água Ondulada e Orgânica:**
  - Atual: `waterSurface` = `rect(k.width() * 2, 14)` estático e monocromático. Substituir por série de 8–10 segmentos com altura animada individualmente por ondas senoidais desfasadas, criando superfície viva e ondulada. Adicionar borda superior com faixa de espuma branca `(opacity: 0.35)` simulando a interface real água/ar.
- [ ] **29.2 Reflexo Lunar na Costa Urbana Noturna:**
  - Bioma noturno (12.000–19.000m) tem estrelas mas nenhuma lua ou reflexo. Adicionar disco lunar `circle(18px)` branco-amarelado `(245, 240, 210)` no `parallaxSkySystem`, visível somente nessa faixa de distância. Reflexo na água: série de elipses verticais estreitas de opacidade decrescente abaixo do `SEA_LEVEL`, distorcidas por `sin(time)`.
- [ ] **29.3 Névoa de Profundidade no Horizonte Inferior:**
  - O fundo oceânico (`z: -5` a `z: -10`) termina abruptamente na borda da tela. Adicionar degradê vertical de 3–4 `rect` com `opacity` decrescente de baixo para cima no limite inferior — o fundo desaparece na névoa azul oceânica em vez de ser cortado geometricamente.
- [ ] **29.4 Ondas e Espuma Costeira em Arraial do Cabo:**
  - Ao entrar em 25.000m+, adicionar partículas brancas horizontais (`rect 6×2px`) movendo-se lentamente da direita para a esquerda na superfície, simulando a espuma das ondas características da Praia dos Anjos — fenômeno visual real de Arraial do Cabo.
- [ ] **29.5 Nuvens Cumuliformes com Forma Realista:**
  - Nuvens atuais = elipses alongadas simples. Criar nuvens compostas por 3–5 círculos sobrepostos de tamanhos diferentes (`circle(20)`, `circle(14)`, `circle(10)`) com deslocamentos relativos — técnica padrão de pixel art para nuvens. Resultado visual incomparavelmente mais rico sem custo de performance.
- [ ] **29.6 Aurora Austral na Antártica (Lights Australis):**
  - O céu antártico é azul polar uniforme. Adicionar 3–4 faixas verticais de `rect` finos (`4×60px`) em verde-esmeralda e magenta `(80, 220, 160)` com `opacity: 0.12–0.20` e posição Y ondulada por `sin(time)` — aurora austral real. Fenômeno natural documentado no Oceano Antártico e visualmente inesquecível.
- [ ] **29.7 Pôr do Sol em Camadas na Travessia Pelágica:**
  - O bioma de travessia tem `skyColor: [225, 140, 95]` — cor sólida. Criar 4–5 faixas horizontais de `rect(k.width(), 14)` com parallax leve e cores progressivas: laranja quente → âmbar → rosa → lilás → azul crepuscular. Pôr do sol realista em camadas estratificadas.
- [ ] **29.8 Pássaros Marinhos com Anatomia e Identidade de Espécie:**
  - Pássaros atuais têm forma genérica sem distinção de espécie. Diferenciar por bioma: **Albatroz** (Antártica/Pelágico) — asas longas horizontais de `60px` de envergadura, batendo lentamente; **Fragata-magnífica** (Costa Urbana) — corpo fusiforme com cauda bifurcada em V invertido, vermelho e preto; **Garça-branca** (Arraial) — pescoço longo em S com pernas pendentes no voo.

### 🌿 FASE 30: Fundo Submarino, Iluminação & Identidade dos Obstáculos

_Objetivo: Enriquecer o leito marinho com flora e geologia procedural por bioma, corrigir a iluminação subaquática e dar identidade visual real a cada tipo de obstáculo._

- [ ] **30.1 Silhuetas Procedurais do Fundo por Tipo Geológico:**
  - Todos os `SUBMARINE_RELIEFS` são retângulos `radius: 4` — moraina, monte submarino e banco de areia têm a mesma forma. Diferenciar: **Moraina** → topo irregular com 3–5 pontos de altura randômica (`polygon`); **Monte Submarino** → forma cônica com `circle` no pico; **Banco de Areia** → ondulação suave com topo plano e declive gradual; **Canyon Ridge** → paredes verticais abruptas.
- [ ] **30.2 Flora Submarina por Bioma:**
  - Fundo sem flora alguma. Adicionar por bioma: **Antártica** → algas vermelhas `kelp` (`rect 2×30px` ondulando com `sin(time)`) em amarelo-amarronzado; **Pelágico** → sem flora (profundidade sem luz); **Costa Urbana** → ervas marinhas cinza-esverdeadas com lixo plástico entranhado; **Arraial** → expandir as algas calcárias rosas `(Lithothamnion)` do `canyonSystem.ts` para toda a topografia da enseada.
- [ ] **30.3 Neve Marinha nas Profundidades Abissais (Marine Snow):**
  - No bioma Pelágico (5.000–12.000m), gerar 12–16 partículas de sedimento (`circle 1–2px`, `color: 120, 140, 160`, `opacity: 0.3`) flutuando lentamente para baixo em velocidades randômicas — fenômeno oceanográfico real de material orgânico decaído e bactérias marinhas precipitando pelas profundezas.
- [ ] **30.4 God Rays Mais Largos e Visíveis:**
  - Raios de luz atuais: `1.5–3.5px` de largura — praticamente invisíveis na maioria dos monitores. A técnica correta em jogos 2D usa `6–18px` com opacidade base mais baixa. Aumentar para `8–18px` e reduzir opacidade base de `0.08` para `0.04–0.06`. Resultado: raios perceptíveis sem parecerem tiras sólidas.
- [ ] **30.5 Escuridão Progressiva com Profundidade:**
  - A profundidade é indicada apenas pela cor de fundo, mas a baleia não fica mais escura ao mergulhar. Sobrepor overlay `rect(k.width(), k.height())` de cor `(0, 10, 25)` com `opacity` proporcional à posição Y do jogador (`player.pos.y / k.height() * 0.4`). Fenômeno físico real: a cada 10m de profundidade, ~90% da luz vermelha é absorvida pela água.
- [ ] **30.6 Halo de Luz do Espiráculo ao Respirar na Superfície:**
  - Ao romper o `SEA_LEVEL` para respirar, emitir brevemente (0.5s) um `circle(30px)` branco `opacity: 0.20` ao redor do espiráculo — reflexo do sol na superfície perturbada ao romper a água. Detalhe de altíssimo impacto visual com implementação mínima.
- [ ] **30.7 Mancha de Óleo com Camadas Iridescentes Realistas:**
  - Atual: 1 camada escura + 1 película violeta. Adicionar 3 camadas sobrepostas: (1) base densa `(8, 5, 5, 0.9)` — petróleo bruto; (2) película iridescente com shimmer de 3 cores alternando por `sin(time)` — azul/verde/violeta (iridescência química real); (3) gotas de espuma nas bordas `(circle 2–3px, white, 0.3)` — emulsão de contaminação.
- [ ] **30.8 Gelo Translúcido com Veias Glaciais:**
  - Blocos de gelo atuais: `rect` branco sólido `opacity: 0.96` sem nenhuma profundidade visual. Adicionar 3–4 faixas internas de tons ligeiramente diferentes `(180, 215, 255)` e `(230, 248, 255)` com borda translúcida `opacity: 0.4`. Veias diagonais de azul glacial `(30, 80, 140, 0.15)` cruzando cada bloco — translucidez cristalina característica do gelo ártico.

### 🎆 FASE 31: Partículas, Coerência de Bioma & Polimento de Interface

_Objetivo: Adicionar efeitos de partículas em momentos dramáticos ausentes, garantir coerência visual consistente entre todos os biomas e refinar a interface HUD._

- [ ] **31.1 Splash de Reentrada da Baleia após o Breach:**
  - O momento de reentrada na água após o salto majestoso — o clímax do jogo — não tem efeito de splash. Ao cruzar `SEA_LEVEL` com velocidade Y > 200, disparar 16–24 partículas de respingo em arco simétrico (`rect 3×8px` brancos com gravidade) — metade para a esquerda, metade para a direita. O momento mais dramático do jogo precisa do efeito mais impactante.
- [ ] **31.2 Rastro de Bolhas Caudal após Batida:**
  - A cada batida de cauda, emitir 5–8 `circle(2–4px)` de cor `(200, 230, 255, 0.5)` que sobem lentamente (`vel.y = −20` a `−40`) deixando rastro visual de esforço físico — como bolhas de ar expelido pelos músculos ao nadar. Fenômeno real e visualmente comunicativo da cadência de nado.
- [ ] **31.3 Plâncton Bioluminescente nos Biomas Noturnos:**
  - Nos biomas noturno e de ressurgência (12.000–25.000m), distribuir 20–30 `circle(1–2px)` estáticos de cor verde-azulada `(60, 200, 180)` com pulsação `sin(time + phase) * 0.4` de opacidade — dinoflagelados bioluminescentes, presença massiva e real documentada nas águas de Arraial do Cabo e Costa dos Corais do Brasil.
- [ ] **31.4 Paleta de Obstáculos Contextualizada por Bioma:**
  - Lixo e redes têm cores uniformes em todos os biomas, quebrando a coerência visual. Variar por contexto: **Antártica** → lixo acinzentado congelado `(180, 60, 60)`, redes em verde-cinza glacial; **Pelágico** → lixo translúcido azulado `(60, 100, 200)` — aspecto de plástico submerso; **Costa** → lixo vermelho saturado + grafite industrial agressivo; **Arraial** → lixo alaranjado `(220, 140, 50)` — plástico desbotado pelo sol tropical.
- [ ] **31.5 Transições Suaves de Flora e Partículas entre Biomas:**
  - Elementos como flora e partículas atmosféricas mudam abruptamente ao cruzar fronteiras de bioma. Criar zonas de "easing" de 200–400m nos limites (5.000m, 12.000m, 19.000m, 25.000m) onde os elementos do bioma anterior fazem fade-out enquanto os do próximo fazem fade-in — reutilizando o padrão já implementado no `calculateWeatherAtDistance()` do `weatherSystem.ts`.
- [ ] **31.6 Partículas do Menu Principal Temáticas:**
  - Partículas do menu atual: `circle(1.5–3.5px)` genéricas em azul/verde/amarelo. Substituir por 3 tipos temáticos intercalados: bolhas de ar subindo `(circle 1–2px ciano)`; plâncton luminescente `(rect 2×6px rotacionado 45°)`; medusas miniatura `(circle 4px com borda branca tênue ondulante)`. Identidade oceânica desde a tela inicial.
- [ ] **31.7 HUD de Distância com Indicador de Bioma:**
  - HUD atual usa `text` simples sem estilo visual definido. Substituir por caixa com background translúcido, borda oceânica e indicador do bioma atual com ícone emoji correspondente: ❄️ Antártica, 🌊 Pelágico, 🏭 Costa Urbana, 🌀 Cânions, ☀️ Arraial do Cabo.
- [ ] **31.8 Barra de Oxigênio com 3 Estados Visuais de Urgência:**
  - Implementar estados visuais distintos da barra de oxigênio: **>50%** → azul calmo pulsando suavemente; **20–50%** → âmbar com pulsação acelerada e leve tremor; **<20%** → vermelho pulsando rapidamente + borda da tela com vinheta escurecida e tremulante — comunicando urgência crescente sem texto.
- [ ] **31.9 Cursor do Mouse com Identidade Visual Oceânica:**
  - Cursor padrão do browser quebra a imersão. Substituir via CSS `cursor: url(...)` por bolha oceânica `(circle 12px turquesa com borda branca)` no estado normal e âncora ou anzol no estado `hover` sobre botões — identidade oceânica mantida desde antes de clicar no primeiro botão.

### 🖋️ FASE 32: Tipografia, Texto & Hierarquia Visual

_Objetivo: Substituir a fonte padrão do browser por tipografia oceânica consistente, corrigir hierarquias textuais entre telas e garantir legibilidade em todas as resoluções suportadas._

- [ ] **32.1 Fonte Customizada — Carregar Google Font via `index.html`:**
  - Todo texto do jogo usa `font: "sans-serif"` — a fonte padrão do browser, que varia entre sistemas operacionais (Helvetica no macOS, Arial no Windows, DejaVu no Linux). Carregar `Orbitron` (títulos e HUD — estilo técnico/científico) + `Inter` (textos corridos, modais, quiz) via `<link>` no `index.html`. Passar o nome da fonte para todos os `k.text()` via constante `FONT_TITLE` e `FONT_BODY` em `config.ts`.
- [ ] **32.2 Hierarquia Tipográfica Consistente entre Telas:**
  - Cada tela usa tamanhos de texto definidos ad-hoc sem sistema: `splashScreen.ts` usa 48/16/12px, `modeSelectScreen.ts` usa 22/18/14px, `rescueScreen.ts` usa 18/14/12px, `victoryScreen.ts` usa 16/14/12px. Criar escala tipográfica única em `config.ts`:
    - `TEXT_SIZE_DISPLAY` = 44px (logo, splash)
    - `TEXT_SIZE_H1` = 24px (títulos de tela)
    - `TEXT_SIZE_H2` = 18px (subtítulos de modal)
    - `TEXT_SIZE_BODY` = 14px (texto de leitura)
    - `TEXT_SIZE_CAPTION` = 11px (labels, hints, dicas)
- [ ] **32.3 Texto das Telas de UI com Sombra de Legibilidade:**
  - Nenhum texto de UI tem sombra — textos claros sobre fundos oceânicos claros tornam-se ilegíveis em determinadas seções. Adicionar sombra offscreen (1–2px offset, cor escura `opacity: 0.6`) em todos os textos com tamanho > 14px, usando a técnica já presente na `splashScreen.ts` linha 78 mas ausente nas demais telas.
- [ ] **32.4 Texto dos Fatos Educativos com Quebra de Linha Adaptativa:**
  - Os fatos do `facts.json` aparecem em modais com `width` fixo. Em resoluções baixas (450p = 800×450px) o texto pode transbordar. Calcular `width: Math.min(500, k.width() - 80)` dinamicamente em todos os `k.text()` de conteúdo educacional.
- [ ] **32.5 Distância Exibida com Formatação de Milhas Náuticas:**
  - A distância atual é exibida em metros (ex.: "14.238m") — unidade pouco intuitiva para crianças e não é a unidade usada em navegação marinha real. Exibir em paralelo: `"14.238m • 7,7 mn"` (milhas náuticas, onde 1mn = 1.852m). Implementar função `toNauticalMiles(meters: number)` em utilitário auxiliar.
- [ ] **32.6 Nome do Bioma Atual Exibido no HUD:**
  - O HUD atual mostra distância mas não o nome do bioma atual, deixando o jogador sem contexto geográfico. Adicionar linha secundária ao HUD com o nome do bioma (`"❄️ Oceano Antártico"`, `"🌊 Travessia Pelágica"`, etc.) atualizado a cada mudança de `BIOME_COLOR_STOPS`.
- [ ] **32.7 Textos da Tela de Resgate com Tom Narrativo:**
  - A tela de resgate exibe estatísticas como linha plana de debug (`"📏 Distância Navegada: 14238m"`). Reformular com linguagem narrativa imersiva: `"A jubarte avançou 14.238 metros de sua jornada..."` — mantendo os dados mas embalados em contexto de história, mais adequado ao público infantil.
- [ ] **32.8 Texto de Teclas de Controle com Ícones de Teclado:**
  - Instruções de controle como `"Pressione ESPAÇO"` são textuais genéricas. Substituir por representação visual de tecla: `[ESPAÇO]`, `[↑]`, `[↓]` usando `rect` com `border-radius` e `outline` — visual de "tecla física". Padrão amplamente reconhecido em jogos modernos.

### 🖥️ FASE 33: Sistema de Resoluções, Modos de Tela & Responsividade

_Objetivo: Expandir os presets de resolução para cobrir monitores 4K, ultrawide e tablets, corrigir o modo letterbox para funcionar corretamente e adicionar modo automático baseado na resolução nativa do dispositivo._

- [ ] **33.1 Adicionar Preset 1440p (2K) e 4K (2160p):**
  - Presets atuais: `450p`, `540p`, `720p`, `1080p`. Faltam monitores modernos usados em museus e totens: `"1440p": { width: 2560, height: 1440 }` e `"4K": { width: 3840, height: 2160 }`. Sprites procedurais em Kaboom escalam via GPU sem perda de qualidade — não há risco de borramento.
- [ ] **33.2 Preset Automático — Detectar Resolução Nativa do Dispositivo:**
  - Adicionar opção `"auto"` que usa `window.screen.width × window.screen.height` (ou `window.devicePixelRatio × window.innerWidth/Height` para Retina/HiDPI). Exibir como `"Auto (Detectado: 1920×1080) 🔍"` nas Opções. Evita que o usuário precise configurar manualmente.
- [ ] **33.3 Suporte a Proporção Ultrawide (21:9 e 32:9):**
  - Presets atuais assumem proporção 16:9. Totens de museu e monitores ultrawide (3440×1440, 5120×1440) ficam com barras laterais ou distorção. Adicionar presets `"ultrawide21": { width: 3440, height: 1440 }` e `"ultrawide32": { width: 5120, height: 1440 }` com lógica de rendering que expande o fundo e os céu/chão lateralmente mas mantém a área de gameplay centralizada.
- [ ] **33.4 Modo Letterbox Funcionando Corretamente com Barras Escuras:**
  - O modo `letterbox` está implementado em `getSavedDisplayMode()` mas a renderização das barras pretas laterais/superior/inferior não é visível em código — pode estar incompleta. Garantir que o modo letterbox renderize `rect` pretos nas bordas com `z: 999` cobrindo o overflow de conteúdo. Adicionar opção de cor da borda: preto, azul oceânico (`#06122a`) ou personalizada.
- [ ] **33.5 Modo Retrato (Portrait) para Tablets Verticais:**
  - Em tablets como iPad (768×1024 no orientação portrait), o jogo atual fica comprimido horizontalmente. Adicionar preset `"tablet_portrait": { width: 768, height: 1024 }` com layout vertical onde o oceano ocupa 85% da tela e o HUD fica em painel inferior — viável pois a câmera do Kaboom pode ser reconfigurada.
- [ ] **33.6 Persistência de Resolução por Dispositivo:**
  - A resolução salva em `localStorage` é global. Se o jogo for aberto em dois dispositivos diferentes (computador do professor + tablet do aluno), a resolução salva pode ser inadequada. Salvar como `"micro_splash_resolution_${screen.width}x${screen.height}"` para cada resolução de tela nativa diferente.
- [ ] **33.7 Preview de Resolução em Tempo Real nas Opções:**
  - Ao selecionar uma resolução nas Opções, não há feedback visual de como a tela mudará. Adicionar um mini-preview retangular proporcional abaixo do seletor mostrando a relação de aspecto selecionada vs. a tela atual — triângulo de comparação visual antes de confirmar a mudança.
- [ ] **33.8 Indicador de Resolução Atual no HUD F3:**
  - O HUD de diagnóstico F3 atual lista FPS mas não a resolução em uso. Adicionar linha `"Resolução: 1920×1080 (720p)"` ao painel F3 — útil para diagnóstico remoto de problemas em totens.

### 🎬 FASE 34: Telas de Jogo — Visual & Polimento de UI

_Objetivo: Elevar todas as telas de interface (splash, menu, vitória, resgate, opções, modo) ao mesmo nível visual cinematográfico, com animações de entrada, identidade oceânica e estado de hover comunicativo._

- [ ] **34.1 Animação de Entrada em Todos os Modais:**
  - Nenhum modal tem animação de entrada — aparecem instantaneamente. Implementar `k.tween` de escala (`0.85 → 1.0`) + opacity (`0 → 1`) em 0.25s com easing `k.easings.easeOutBack` para todos os cards de modal. Feedback visual imediato de abertura.
- [ ] **34.2 Tela de Splash com Logo Animado e Subtítulo Melhorado:**
  - O logo "MICRO-SPLASH" aparece em `k.text()` simples em `size: 48`. Redesenhar com duas cores intercaladas por letra (alternando azul-turquesa e branco) e animação de entrada letter-by-letter via delay de `k.wait`. O subtítulo atual `"A JORNADA DA BALEIA-JUBARTE"` poderia ser enriquecido com ícones laterais de âncora e cauda de baleia.
- [ ] **34.3 Barco de Resgate com Detalhes Visuais:**
  - O barco de resgate (`boat.ts`) tem: casco `90×30px` + cabine `30×20px` + luz piscante. Sem ondas de scia, sem mastro, sem número identificador. Adicionar: mastro vertical (`rect 3×40px`), bandeira (`polygon triangular` verde), esteira de scia (2–3 partículas brancas atrás) e uma faixa diagonal laranja característica da Guarda Marítima Brasileira.
- [ ] **34.4 Tela de Vitória com Partículas Temáticas de Confete:**
  - A tela de vitória (`victoryScreen.ts` com 613 linhas) não tem partículas visuais de celebração. Adicionar 40–60 partículas de confete em cores oceânicas (turquesa, dourado, branco) com `rect 4×8px` rotacionados aleatoriamente e física de gravidade suave. Disparar apenas 1× ao entrar na tela.
- [ ] **34.5 Botões com Estado Hover Visual Consistente:**
  - `onHoverUpdate` está implementado apenas na tela de resgate (`rescueScreen.ts` linha 94). Nos outros modais (Opções, Modo, Vitória, Codex), os botões não têm feedback de hover. Padronizar: hover = cor base + 30% mais clara, cursor pointer, leve expansão de escala (`1.0 → 1.04` via `k.tween`).
- [ ] **34.6 Tela de Seleção de Modo com Cards Visuais por Modo:**
  - `modeSelectScreen.ts` lista os modos em texto puro. Transformar em cards com: ícone grande do modo (🏊 migração, ⚡ challenge, 🎭 apresentação), fundo de cor diferente por modo e um preview textual de "O que esperar" em 2 linhas. Padrão visual de seleção de personagem/modo de jogos AAA.
- [ ] **34.7 Tela do Codex com Ícones de Bioma e Barra de Progresso:**
  - O Codex exibe fatos desbloqueados em lista simples. Adicionar: ícone emoji do bioma à esquerda de cada fato, indicador `"3/4 desbloqueados"` por bioma, e barra de progresso horizontal de 100% representando a rota completa com marcadores nos pontos de fato.
- [ ] **34.8 Loading Overlay ao Trocar de Resolução:**
  - Ao confirmar mudança de resolução nas Opções, a tela reconfigura instantaneamente — pode causar flash visual. Adicionar fade-out de 0.3s (`rect` preto em `z: 9999`) antes do `window.location.reload()` que aplica a nova resolução.

### 🐬 FASE 35: Polimento Visual dos Sistemas Ausentes

_Objetivo: Cobrir elementos visuais não tratados nas fases anteriores — ressurgência, kelp/corais bentônicos, ventos térmicos e correntes oceânicas visíveis._

- [ ] **35.1 Jatos de Ressurgência com Mais Detalhes Visuais:**
  - Jatos atuais: `rect(30, 80, radius: 10)` azul `(0, 220, 255, 0.4)` com `outline: 3` branco (`upwellingSystem.ts` linha 48). Parecem cápsulas rígidas. Redesenhar como feixes de linhas finas (`rect 4×80px`) em leque de 5–7 ângulos ligeiramente diferentes, sem border rígido, com gradiente de opacity (mais denso na base, mais transparente no topo) — visual de corrente d'água subindo, não de objeto sólido.
- [ ] **35.2 Kelp com Gradiente de Cor por Altura:**
  - O kelp no `benthicFloorSystem.ts` usa cor uniforme por planta. O kelp real tem base marrom-escura e folhas dourado-esverdeadas no topo (por exposição à luz). Aplicar cor progressiva por segmento: base `(55, 35, 15)` → topo `(110, 130, 40)` — usando o índice `s` do loop de segmentos.
- [ ] **35.3 Corais com Animação de Abertura/Fechamento:**
  - Corais no `benthicFloorSystem.ts` têm tipos `"brain"`, `"fan"`, `"anemone"`. Os tipos `fan` e `anemone` são ideais para animação de pulsação — anêmonas abrem e fecham os tentáculos com `sin(time)`. Implementar variação de escala Y `(0.85–1.15)` em ciclo de 2–3s nos corais do tipo `anemone`.
- [ ] **35.4 Correntes Oceânicas Visíveis (Favoráveis e Contrárias):**
  - O sistema de correntes contrárias empurra fisicamente a baleia mas é completamente invisível — o jogador percebe o efeito mas não vê o elemento. Representar com 4–6 linhas de traço horizontais (`rect 40×2px`) em azul-cinza `(100, 150, 200, 0.25)` se movendo na direção da corrente — setas de fluxo animadas como em mapas oceanográficos.
- [ ] **35.5 Barco de Pesca Realista no Bioma da Costa Urbana:**
  - Além dos navios cargueiros, o bioma urbano deveria ter embarcações pesqueiras menores (traineiras/arrastradores) que despejam redes — seria o `ghostNet` com origem visual clara em vez de aparecer do nada. Um barco de pesca `60×20px` estacionado com rede visível sendo lançada por ele daria contexto narrativo ao perigo.
- [ ] **35.6 Refluxo de Espuma nos Blocos de Gelo ao Serem Quebrados:**
  - Ao quebrar um bloco de gelo, os estilhaços são retangulares. Adicionar 6–8 partículas circulares brancas `(circle 3–6px)` em adição aos estilhaços quadrados, simulando espuma de água gelada espirrada pelo impacto — diferente das partículas de gelo em forma de shard.
