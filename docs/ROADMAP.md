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

---

## 🎯 Próximas Fases (Ordenadas por Prioridade)

---

### 🌅 FASE 8: Cenários Vivos & Atmosfera em Paralaxe (Profundidade & Luz)
*Objetivo: Transformar o mar e o céu em um mundo vivo e cinematográfico.*

- [ ] **8.1 Raios de Sol Subaquáticos (*God Rays*) & Caustics:**
  - Feixes translúcidos de luz solar filtrando da superfície em direção às profundezas nas águas cristalinas de Arraial do Cabo.
- [ ] **8.2 Céu Vivo em Paralaxe:**
  - Camadas de nuvens em deriva lenta, aves marinhas (gaivotas e albatrozes) voando no horizonte e silhueta do Farol da Ilha ao fundo.
- [ ] **8.3 Detalhamento do Fundo Marinho:**
  - Florestas de algas ondulantes (kelp) na faixa polar e formações de corais nas águas calmas de Arraial do Cabo.

---

### 🌊 FASE 9: Dinâmica Ecológica, Fauna Rara & Perigos Adicionais
*Objetivo: Enriquecer a variedade de gameplay, biodiversidade marinha e desafios ambientais.*

- [ ] **9.1 Mancha de Óleo Pré-Arraial (antes do Boqueirão):**
  - Posicionada estrategicamente no final da Costa Urbana (entre ~17.500m e 18.900m), logo antes da entrada do Boqueirão e do trecho de Arraial do Cabo.
  - Mancha de combustível flutuando na superfície: passar por ela obstrui temporariamente o espiráculo da baleia com óleo, exigindo mergulho rápido para limpar os resíduos antes de conseguir respirar novamente.
- [ ] **9.2 Descarte Ativo de Lixo por Navios Industriais:**
  - Navios cargueiros e industriais patrulhando a Costa Urbana passam a ejetar resíduos plásticos, caixas e tambores periodicamente em sua esteira, criando perigos dinâmicos móveis que afundam pelo leito marinho.
- [ ] **9.3 Nado em Bando com Golfinhos (*Drafting*):**
  - Pequenos grupos de golfinhos acompanhantes em mar aberto que concedem bônus hidrodinâmico de velocidade e economia de fôlego ao nadar alinhado a eles.
- [ ] **9.4 Silhueta de Baleia-Azul ou Cachalote nas Profundezas:**
  - No mar aberto (trecho de travessia oceânica onde ocorre o jejum de krill), passagem majestosa e pacífica de uma criatura abissal gigante ao fundo com vocalização submarina profunda própria.
- [ ] **9.5 Pinguins de Magalhães Saltando na Saída Antártica:**
  - Bandos ágeis de pinguins nadando em zigue-zague veloz nas fendas de gelo entre 4.000m e 5.000m, marcando a transição do continente polar para o mar aberto.

---

### 📱 FASE 10: Feira de Ciências & Acessibilidade Mobile
*Objetivo: Maximizar o engajamento com jurados, visitantes e dispositivos touch.*

- [ ] **10.1 Modo Kiosk (Demonstração Interativa):**
  - Ativação de um screensaver/demonstração cinematográfica autônoma se o jogo permanecer inativo por 45 segundos no menu, com convite: *"Toque em qualquer tecla para guiar a Jubarte!"*.
- [ ] **10.2 Controles Virtuais Touch na Tela:**
  - Suporte a botões virtuais na tela para tablets, celulares e totens interativos na feira de ciências.