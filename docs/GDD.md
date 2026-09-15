# 🐋 Game Design Document (GDD) - Micro Splash

## 1. Visão Geral do Projeto
* **Nome do Jogo:** Micro Splash
* **Gênero:** 2D Underwater Physics Navigator / Environmental Adventure
* **Plataforma:** Web (Navegador Desktop & Totens de Feira)
* **Tema Principal:** Conscientização Ambiental, Impacto da Poluição Marinha e Rota Migratória das Baleias-Jubarte da Antártica até Arraial do Cabo, RJ.
* **Público-Alvo:** Visitantes, estudantes e jurados da Feira de Ciências, com modos específicos para crianças e partidas rápidas.

---

## 2. História e Objetivo
O jogador assume o controle de uma **baleia-jubarte (*Megaptera novaeangliae*)** fêmea adulta em sua jornada migratória de 27.000 metros (escala condensada representativa dos 4.500 km reais). Partindo dos mares congelados da Antártida, onde acumulou reservas consumindo cardumes de krill, ela deve atravessar as correntes do Atlântico Sul, cruzar os perigos urbanos e industriais da costa brasileira e alcançar as águas abrigadas e cristalinas de **Arraial do Cabo, RJ**, onde filhotes nascem e são amamentados em segurança.

---

## 3. Mecânicas Principais

### 3.1. Nado Hidrodinâmico & Animações Orgânicas
* **Impulso Senoidal (`Espaço`):** A aceleração inicia suave, atinge o ápice de força aos `0.3s` e decai a zero se o botão continuar pressionado, recompensando o ritmo pausado e natural de nado.
* **Animação Corporal do Nado:** A cauda alterna organicamente entre flexão ascendente (`stroke_up`) e batida propulsora descendente (`stroke_down`), retornando a uma postura hidrodinâmica alinhada (`glide`) ao planar.
* **Inércia e Arrasto (*Drag*):** O animal desacelera progressivamente devido à densidade e atrito da água, permitindo deslizar suavemente entre obstáculos.
* **Orientação Espacial (Setas / WASD):** Ajuste angular suave de até 45° para cima ou para baixo, e inversão de direção horizontal com amortecimento elástico da câmera (*lerp*).

### 3.2. Fôlego, Superfície & Esguicho do Espiráculo (*Blowhole Spout*)
* **Gestão de Oxigênio:** Submersa, a jubarte consome fôlego gradualmente (com dreno acelerado durante o esforço contínuo de nado).
* **Renovação & Esguicho:** Ao romper a linha da superfície (`SEA_LEVEL`), o fôlego é recarregado instantaneamente e a baleia dispara uma erupção vertical dupla em "V" de 32 partículas de condensação e borrifo d'água, acompanhada de som de descompressão pulmonar (*whoosh*).

### 3.3. Biosonar Omnidirecional 360° & Camuflagem Subaquática
* **Acionamento (`Shift`, `E` ou `X`):** Emissão de uma onda acústica expansiva de 360° cobrindo a tela em um raio de 650px.
* **Revelação de Perigos:** No fundo escuro, fragmentos de plástico e redes de pesca começam camuflados com baixa visibilidade (opacidade 25%). Ao serem atingidos pelo pulso acústico, iluminam-se com brilho total, contorno fluorescente ciano e eco sonoro reflexivo, esmaecendo gradualmente após 5.5s.
* **Mapeamento de Cânions:** Paredes rochosas dos cânions do Boqueirão acendem com destaque acústico nas bordas, auxiliando a navegação em gargantas estreitas.
* **Comunicação Vocal:** O acionamento do sonar dispara a vocalização sagrada da baleia, ressoando pelo oceano.

### 3.4. Nutrição e Crescimento (Krill Antártico)
* **Cardumes de Krill:** Cardumes atraídos magneticamente ao aproximar-se da boca da jubarte.
* **Animação de Alimentação:** Ao engolir, a baleia abre a mandíbula distendendo as pregas ventrais e expondo as cerdas filtradoras (*baleen*), com partículas convergentes de sucção biológica.
* **Bônus Nutricional:** Cada cardume confere +1% permanente de velocidade máxima e capacidade de fôlego.

### 3.5. Ameaças e Dinâmica de Impacto
* **Lixo Plástico (Garrafas e Sacolas):** Reduzem temporariamente a velocidade em 50% e diminuem o Eco-Score final.
* **Redes de Pesca Fantasma:** Enredam o corpo da jubarte, travando seus controles e forçando afundamento e perda de oxigênio contínuos. O jogador deve pressionar `Espaço` repetidamente (5 batidas) para romper a malha e se libertar.
* **Teto de Gelo Polar:** Impede a subida à superfície no trecho polar, exigindo localização de fendas naturais abertas para respirar.
* **Navios Industriais:** Embarcações pesadas patrulham a superfície na Costa Urbana; atropelamentos causam dano severo e ruído de motores perturba a ecolocalização.
* **Guarda Marítima:** Barco ecológico que patrulha a superfície na Costa Urbana e intervém para resgatar a baleia caso fique presa ou desmaie em sua proximidade.

---

## 4. Modos de Jogo

Para atender a múltiplos públicos na Feira de Ciências, o jogo conta com 3 modos de experiência:

1. **Migração Normal (Completa):**
   - Rota integral de 27.000 metros através dos 5 biomas.
   - Gerenciamento rigoroso de oxigênio, perigos ativos e cálculo completo do Eco-Score.
2. **Migração Serena (Acessibilidade & Crianças):**
   - **Fôlego Infinito (`∞`)**: Sem dreno de oxigênio e sem risco de desmaio subaquático.
   - Navegação relaxante e contemplativa com foco na beleza do mar e aprendizado de fatos ecológicos.
3. **Migração Rápida (Desafio de 60 Segundos):**
   - Partida cronometrada com contagem regressiva visível no topo da tela.
   - **Seletor de Bioma:** Permite iniciar diretamente no Labirinto Polar (Antártica), Desvio Urbano (Costa Urbana) ou Cânions de Arraial (Boqueirão).
   - Tela dedicada de encerramento (`challengeEndScreen`) com distância percorrida, krill ingerido e pontuação instantânea, perfeita para filas rápidas na feira.

---

## 5. Rota dos 27.000m e Biomas

| Trajeto (Metros) | Bioma / Região Real | Tom da Água | Elementos Específicos & Dinâmica |
| :--- | :--- | :--- | :--- |
| **0m – 5.000m** | **1. Oceano Antártico (Alimentação Polar)** | Azul Gélido (`#051c38`) | Teto de gelo contínuo com fendas de respiração, fartura de Krill, icebergs e silhuetas de orcas ao fundo. |
| **5.000m – 12.000m** | **2. Travessia Oceânica (Atlântico Sul)** | Azul Escuro (`#0a2850`) | **Jejum total de Krill**, correntes contrárias e passagem graciosa de outras jubartes cantantes. |
| **12.000m – 19.000m** | **3. Costa Urbana & Tráfego Marítimo** | Azul Esverdeado (`#0d3c5e`) | Navios industriais, ruído de motores, lixo camuflado, redes fantasmas e patrulha da Guarda Marítima. |
| **19.000m – 25.000m** | **4. Faixa de Ressurgência (Arraial do Cabo)** | Turquesa Intenso (`#0e668b`) | Jatos d'água ascensionais periódicos impulsionando a baleia, novos cardumes de krill e cânions rochosos estreitos do Boqueirão. |
| **25.000m – 27.000m** | **5. Santuário de Arraial (Berçário)** | Turquesa Cristalino (`#1490b8`) | Águas calmas, encontro da mãe com filhote e o evento do **Salto Majestoso (Breach)** acrobático na linha de chegada. |

---

## 6. Interface, Menus & Diário de Bordo (Codex)

* **Menu Principal Imersivo:** Águas profundas com partículas bioluminescentes, registro do melhor Eco-Score e botões de navegação.
* **Painel de Opções:** Controle granular de volume master e toggles independentes de música ambiente e efeitos sonoros com persistência em `localStorage`.
* **Diário de Bordo da Expedição (Codex):**
  - **Espécies Marinhas:** Guias ilustrados da Baleia-Jubarte, Krill Antártico e Orca.
  - **Fatos da Rota:** Acompanhamento de progresso dos fatos ecológicos desbloqueados durante a jornada.
  - **Conservação & IBJ:** Informações de conscientização sobre as ações do Instituto Baleia Jubarte e a Década dos Oceanos da UNESCO.
* **HUD Imersivo no Jogo:** Barra minimalista de fôlego com transição de cor (ciano -> amarelo -> vermelho pulsante), indicador discreto de progresso e notificações de fatos ecológicos ao cruzar marcos geográficos.
* **Relatório de Migração (Fim de Jogo):** Painel final detalhando tempo, distância, biomassa consumida, lixo evitado, Eco-Score e Sabedoria Ancestral transmitida.

---

## 7. Engenharia de Áudio 16-Bit Retrô

O áudio do jogo é gerado em tempo real via Web Audio API, aplicando as técnicas de sintetizadores de 16-bits (SNES SPC700 / Trackers):

1. **Trilha Sonora "Aquatic Ambiance" (Inspirada em David Wise):**
   - Andamento em **75 BPM** e tom em **Dó Menor (C minor)**.
   - Baixo *wavetable* pulsante com 8 harmônicos e filtro ressonante passa-baixa aveludado (`Q = 2.6`).
   - Arpejos híbridos de harpa (com micro-pitch drift de +14 cents) e formantes vocais aerados de coral.
   - Total ausência de frequências agudas estridentes, transmitindo a calma profunda do oceano.
2. **Canto da Baleia em 3 Canais (Exclusivo via Sonar):**
   - **Canal 1 (Assobio / Lamento Límpido):** Onda Sine pura com vibrato LFO contínuo a 4.6Hz e pitch bend (C4 -> D4 -> F3).
   - **Canal 2 (O Gemido / Cello):** Mix de Sine e Sawtooth 1-2 oitavas abaixo com filtro passa-baixa dinâmico severo (190Hz -> 70Hz).
   - **Canal 3 (Percussão Biológica / Zíper):** Onda Square sub-grave (C0) com pitch bend negativo extremo em sequência de 5 estalos desacelerados.
   - **Barramento de Eco do SNES:** Delay de 180ms com 52% de feedback e filtro passa-baixa em 420Hz, simulando a reverberação abissal do oceano.
