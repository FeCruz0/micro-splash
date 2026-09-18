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
- [x] **5.3 Trilha Sonora 16-Bit Adaptativa por Bioma:** Motor de sequenciamento musical procedural (`BiomeMusicEngine`) com arpejos gelados na Antártica, atmosfera submarina de mar aberto estilo *Ecco* / *Aquatic Ambiance*, ritmo tenso e industrial na Costa Urbana, e progressão harmônica tropical solar em Arraial do Cabo.

### 🧭 FASE 6: Menu Inicial, Seleção de Modo & Diário de Bordo
- [x] **6.1 Tela de Menu Principal:** Menu inicial com visual marítimo, partículas bioluminescentes, high score persistente e opções: "Iniciar Migração", "Opções" e "Diário de Bordo (Codex)".
- [x] **6.2 Fluxo de Início com Escolha do Modo de Jogo:**
  - **Migração Normal:** Rota migratória clássica completa com dreno de oxigênio, perigos e pontuação no Eco-Score.
  - **Migração Serena:** Oxigênio infinito (`∞`) e navegação livre sem risco de desmaio, ideal para crianças, novatos e exploração contemplativa.
  - **Migração Rápida:** Partida cronometrada de 60 segundos com bioma selecionável (Labirinto Polar, Desvio Urbano ou Cânions de Arraial) e tela dedicada de estatísticas da rodada.
- [x] **6.3 Painel de Opções & Configurações de Áudio:** Ajuste de volume geral (+/-) e botões liga/desliga para música ambiente e efeitos sonoros com persistência em `localStorage`.
- [x] **6.4 Diário de Bordo da Expedição (Codex no Menu):** Painel categorizado em abas com consulta de espécies marinhas observadas, fatos ecológicos desbloqueados na rota e mensagens de conservação do *Instituto Baleia Jubarte*.

### 🐋 FASE 7: Identidade da Jubarte, Habilidades & Feedback Sensorial (Arte & Animação)
- [x] **7.1 Sprite Personalizado da Baleia-Jubarte:**
  - Substituição definitiva do `bean.png` por spritesheet dedicado com anatomia real da Jubarte (nadadeiras peitorais longas e brancas, tubérculos no focinho, corcunda e cauda serrilhada).
- [x] **7.2 Animações Orgânicas de Nado & Alimentação:**
  - Movimento ondulante da cauda/flukes sincronizado com o impulso de nado (`Espaço`).
  - Abertura suave da mandíbula de cerdas (baleen) com partículas de sucção ao engolir cardumes de Krill.
- [x] **7.3 Esguicho do Espiráculo (Blowhole Spout):**
  - Erupção vertical de vapor e borrifo d'água em formato de V com partículas e som de exalação profunda (*whoosh*) ao romper a superfície para respirar.
- [x] **7.4 Sonar Omnidirecional (Varredura de Tela Total) & Revelação Subaquática:**
  - O sonar deixa de ser direcional (eliminando o cone estreito de 30°) e passa a emitir uma onda acústica expansiva em 360° cobrindo toda a tela (raio de 650px).
  - Redes fantasmas e lixo plástico camuflados nas profundezas acendem com contorno acústico e esmaecem gradualmente, além de ecos nos cânions rochosos.
- [x] **7.5 Canto da Baleia Retrô 16-Bit em 3 Canais & Barramento de Eco SNES:**
  - Reconstrução da vocalização (`playWhaleSong`) em 3 canais inspirados em trackers (Assobio LFO, Gemido Cello Sine/Sawtooth submerso e Percussão Zíper em C0) com barramento de eco de 180ms e filtro passa-baixa a 420Hz.
  - Eliminação de temporizadores aleatórios: a baleia só canta quando o jogador aciona o sonar ou quando baleias próximas emitem pulsos acústicos no mar aberto ou santuário.

### 🌅 FASE 8: Cenários Vivos & Atmosfera em Paralaxe (Profundidade & Luz)
- [x] **8.1 Raios de Sol Subaquáticos (*God Rays*) & Caustics (`lightRaysSystem.ts`):**
  - Feixes translúcidos de luz solar filtrando dinamicamente da superfície em direção às profundezas, com destaque luminoso dourado e turquesa cintilante em Arraial do Cabo.
  - Cáusticos de refração luminosa ondulando na sub-superfície acompanhando o movimento das águas.
- [x] **8.2 Céu Vivo em Paralaxe (`parallaxSkySystem.ts`):**
  - Nuvens em deriva contínua e velocidade elástica relativa de paralaxe no topo da tela.
  - Aves marinhas migratórias com batimento de asas em tempo real (Albatrozes na Antártica; Gaivotas e Fragatas na Costa Urbana e Arraial).
  - Silhueta do Farol da Ilha do Farol no horizonte de Arraial (~25.950m) com torre listrada e feixe cônico rotativo varrendo o céu e o mar.
- [x] **8.3 Detalhamento do Fundo Marinho Bentônico (`benthicFloorSystem.ts`):**
  - Florestas de algas gigantes (*kelp*) na Antártica com física de deformação senoidal fluida de ondulação.
  - Recifes de corais em Arraial do Cabo (corais-cérebro com sulcos, leques de gorgônias e anêmonas fluorescentes) acompanhados de peixes de recife coloridos.

### 🌊 FASE 9: Dinâmica Ecológica, Fauna Rara & Perigos Adicionais
- [x] **9.1 Mancha de Óleo Pré-Arraial (antes do Boqueirão):** Mancha negra iridescente entre 17.400m e 18.900m que obstrui o espiráculo por lodo e impede a respiração até a realização de mergulho de limpeza em águas profundas.
- [x] **9.2 Descarte Ativo de Lixo por Navios Industriais:** Navios cargueiros da Costa Urbana ejetam periodicamente tambores tóxicos, engradados de madeira e sacos plásticos em sua esteira que afundam em zigue-zague com colisão ativa.
- [x] **9.3 Nado em Bando com Golfinhos (*Drafting*):** Bandos de Golfinhos-Rotadores em mar aberto que concedem esteira hidrodinâmica favorável (+25% velocidade e -40% dreno de O₂) com trilha aerodinâmica e cliques 16-bit.
- [x] **9.4 Silhueta de Cachalote nas Profundezas:** Encontro solene com leviatã abissal colossal de 280px no leito profundo (8.000m - 10.800m) emitindo infrassom oceânico ressonante e ondas de choque acústicas.
- [x] **9.5 Pinguins-de-Magalhães Saltando na Saída Antártica:** Bandos ágeis realizando *porpoising* (saltos em arco fora d'água) com rastro de bolhas e pios rápidos na transição polar (4.000m - 5.200m).

### 📱 FASE 10: Modo Kiosk & Acessibilidade Mobile
*Objetivo: Maximizar o engajamento com totens interativos, visitantes e dispositivos touch.*

- [x] **10.1 Modo Kiosk (Demonstração Interativa):**
  - Ativação de um screensaver/demonstração cinematográfica autônoma se o jogo permanecer inativo por 45 segundos no menu, com convite: *"Toque em qualquer tecla para guiar a Jubarte!"*.
- [x] **10.2 Controles Virtuais Touch na Tela:**
  - Suporte a botões virtuais na tela para tablets, celulares e totens interativos.

### 🏗️ FASE 11: Arquitetura & Qualidade de Código (Refatoração & Testes)
*Objetivo: Desacoplar sistemas monolíticos, eliminar dívidas técnicas e garantir estabilidade através de testes automatizados.*

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

---

## 🎯 Próximas Fases (Ordenadas por Prioridade)

---

### 🎮 FASE 12: Gameplay & Mecânicas Novas
*Objetivo: Enriquecer a dinâmica de navegação e introduzir novas camadas estratégicas durante a migração.*

- [x] **12.1 Geração Procedural de Obstáculos por Bioma:**
  - Substituir posições fixas por geração dinâmica de perigos e cardumes com base no avanço horizontal X da baleia, garantindo rejogabilidade única em cada tentativa sem memorização prévia de rota.
- [x] **12.2 Filhote de Baleia Acompanhante (Calf Escort) & Rota de 30.000m:**
  - Expansão da rota final para 30.000m com 5.000m de escolta ativa no berçário (25.000m a 30.000m). O filhote enfrenta perigos residuais (redes fantasmas, lixo e paredões rochosos invisíveis que só aparecem com Biosonar). O jogador pode usar o Biosonar em 360° para cortar redes e libertar o filhote em apuros.
- [x] **12.3 Power-ups Temporários Ambientais:**
  - Introduzir itens colecionáveis temáticos: *Escudo de Bolhas* (imunidade a uma colisão com lixo), *Corrente Favorável* (+50% de velocidade por 5s), *Bolsão de Ar Submerso* (+30% fôlego instantâneo) e *Bioluminescência* (revelação luminosa de perigos próximos por 8s).
- [x] **12.4 Leaderboard Local Top 10 (Ranking Arcade):**
  - Expandir o high score único para um ranking Top 10 persistente em `localStorage`, com inserção de iniciais do jogador (estilo arcade de 3 letras), ideal para disputa entre jogadores.

### 🎨 FASE 13: Polimento Visual, Atmosfera & Identidade
*Objetivo: Elevar o impacto visual e a imersão sensorial com micro-animações e apresentação profissional.*

- [ ] **13.1 Partículas Dinâmicas de Bolhas de Nado:**
  - Adicionar emissão contínua de rastro de micro-bolhas (2-4px) partindo da cauda da baleia durante a propulsão, com intensidade proporcional à velocidade instantânea.
- [ ] **13.2 Cardumes de Krill Reactivos (Comportamento de Boids):**
  - Substituir os blocos estáticos de krill por pequenos enxames orgânicos (8 a 12 micro-entidades) que se dispersam dinamicamente quando a baleia se aproxima.
- [ ] **13.3 Ciclo Dia/Noite Sutil ao Longo da Rota:**
  - Implementar transição gradativa da paleta de iluminação ambiente ao longo dos 27.000m: luz polar límpida na Antártica, entardecer alaranjado no Mar Aberto, noite com luzes de navegação na Costa Urbana e amanhecer dourado e radiante em Arraial do Cabo.
- [ ] **13.4 Tela de Loading / Splash Screen Animada:**
  - Criar tela de introdução estilizada de 2 a 3 segundos com logo animado emergindo em bolhas, barra de carregamento temática e créditos institucionais.
- [ ] **13.5 Cartão de Vitória / Compartilhamento de Resultado:**
  - Gerar cartão de resultado exportável em imagem PNG na tela de vitória, contendo nome do jogador, pontuação final, estatísticas da migração, logo do projeto e QR Code.

### 📚 FASE 14: Conteúdo Educativo Expandido & Avaliação
*Objetivo: Fortalecer o valor pedagógico e a fixação do aprendizado para jurados e público estudantil.*

- [ ] **14.1 Expansão do Acervo de Fatos Científicos (`facts.json`):**
  - Ampliar de 5 para 12+ fatos ecológicos baseados em dados reais (propagação acústica no canal SOFAR, mortalidade por redes fantasmas, correntes oceânicas e a história da Reserva Extrativista de Arraial do Cabo).
- [ ] **14.2 Quiz Interativo Pós-Vitória:**
  - Adicionar mini-desafio opcional ao final da rota com 3 perguntas de múltipla escolha sobre os fatos ecológicos desbloqueados durante a partida, premiando acertos com pontuação extra no Eco-Score.

### ⚡ FASE 15: Otimização & Performance em Baixo Nível
*Objetivo: Garantir taxa de quadros estável (60 FPS) em dispositivos com hardware modesto (tablets e notebooks).*

- [ ] **15.1 Object Pooling para Partículas e Projéteis:**
  - Implementar pool de objetos reutilizáveis para bolhas de nado, spray do espiráculo, ecos do sonar e rastros hidrodinâmicos, reduzindo alocações e pausas de Garbage Collection.
- [ ] **15.2 Ciclo de Vida e Lazy Loading de Sistemas por Bioma:**
  - Ativar e desativar a execução de sistemas específicos (ex: `iceSurface`, `shipNoise`, `oilSpill`) estritamente dentro de suas faixas de coordenadas X, poupando processamento de CPU.

### 🎪 FASE 16: Engajamento & Ferramentas de Apresentação
*Objetivo: Fornecer métricas coletivas e recursos para apresentação aos avaliadores.*

- [ ] **16.1 Dashboard de Estatísticas Acumuladas:**
  - Painel persistente visível no menu principal exibindo contadores coletivos de todos os jogadores (total de migrações tentadas, migrações concluídas com sucesso, krill total coletado, lixo desviado e tempo total acumulado de jogo).
- [ ] **16.2 Modo Apresentação Guiada (Apoio aos Jurados/Professores):**
  - Atalho dedicado (`Ctrl+P`) que ativa sobreposição de legendas explicativas e destaques conceituais em tempo real, permitindo aos apresentadores guiar a banca avaliadora pelos conceitos ecológicos e de programação implementados.