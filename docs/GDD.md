# 🐋 Game Design Document (GDD) - Micro Splash

## 1. Visão Geral do Projeto
* **Nome do Jogo:** Micro Splash
* **Gênero:** 2D Endless / Physics Navigator (Navegação Subaquática)
* **Plataforma:** Web (Navegador)
* **Tema Principal:** Conscientização Ambiental e Rota Migratória das Baleias-Jubarte em Arraial do Cabo, RJ.
* **Público-Alvo:** Visitantes e jurados da Feira de Ciências.

---

## 2. História e Objetivo
O jogador controla uma **baleia-jubarte** que migra das águas frias em direção ao santuário de reprodução na costa brasileira, cruzando os pontos turísticos de Arraial do Cabo. O objetivo é navegar com precisão, coletar nutrientes, desviar de ameaças (plásticos e redes de pesca) e aprender curiosidades ecológicas no caminho.

---

## 3. Mecânicas Principais
* **Batida de Cauda (Empuxo Senoidal):** O impulso respeita uma curva senoidal (começa suave, atinge o pico em 0.3s e decai a zero).
* **Inércia e Atrito da Água (Drag):** A baleia desacelera naturalmente devido à resistência da água se não mantiver o ritmo de nado.
* **Rotação e Virada (Flip):** Controles via Setas / WASD com rotação de nadadeiras (-45° a +45°) e rotação de perspectiva.
* **Canto de Ecolocalização de Baixa Frequência (Sonar - Shift/E):** Emissão de impulsos acústicos de baixa frequência (característicos das baleias de barba / Mysticeti). O som viaja a longas distâncias, revelando silhuetas de obstáculos, redes e cantos de outras jubartes na escuridão.
* **Obstáculos (Plásticos/Redes/Gelo):** Garrafas/sacolas reduzem velocidade em 50%. Redes de pesca prendem a baleia exigindo apertar `Espaço` (5x). Placas de gelo cobrem a superfície na Antártica.

---

## 4. Interface e Pontuação (HUD)
* **Pontuação (Distância):** Metros percorridos na rota migratória.
* **High Score:** Persistência do maior recorde via `localStorage`.
* **Pop-ups Educativos:** Exibição de fatos biológicos e geográficos de Arraial do Cabo ao cruzar coordenadas específicas.
 
---

## 5. Rota Migratória e Biomas (0m a 27.000m)
A rota migratória total de 27.000 metros é dividida em 5 estágios biológicos e ambientais progressivos (~3 a 4 minutos de gameplay):

| Trajeto (Metros) | Bioma / Região Real | Tom Visual da Água | Elementos Específicos & Mecânicas |
| :--- | :--- | :--- | :--- |
| **0m – 5.000m** | **1. Oceano Antártico (Águas Polares)** | Azul Profundo Gélido (`#051c38`) | **Superfície Congelada**: Teto de gelo contínuo com aberturas/fendas específicas para a baleia subir e respirar oxigênio. Abundância de Krill. Icebergs no fundo e silhuetas estéticas de orcas ao fundo (sem ataque). |
| **5.000m – 12.000m** | **2. Travessia Oceânica (Atlântico Sul)** | Azul Oceânico Escuro (`#0a2850`) | **Jejum (Sem Krill)** e mar aberto escuro. **Jubartes Passantes**: Outras baleias-jubarte passam ocasionalmente no fundo emitindo sonar de baixa frequência, revelando caminhos e obstáculos no escuro. |
| **12.000m – 19.000m** | **3. Entrada na Costa Urbana (Litoral SE)** | Azul Esverdeado Urbano (`#0d3c5e`) | Lixo plástico, redes fantasma e ruído motorizado de navios. **Barco de Resgate da Guarda Marítima**: Patrulha a superfície nesta zona e intervém ativamente para salvar a baleia se estiver próxima em momentos de perigo (rede/desmaio). |
| **19.000m – 25.000m** | **4. Faixa de Ressurgência (Arraial do Cabo)** | Azul Turquesa Vibrante (`#0e668b`) | **Jatos de Ressurgência**: Correntes ascendentes a cada 18s por 4s trazendo nutrientes e novos cardumes de Krill. Cânions rochosos estreitos de Boqueirão. |
| **25.000m – 27.000m** | **5. Santuário Marinho (Chegada em Arraial)** | Turquesa Cristalino (`#1490b8`) | Águas rasas, calmas e cristalinas da Ilha do Farol. Evento do **Salto Majestoso (Breach)** com a tecla `Espaço` na linha de chegada. |

---

## 6. Filosofia de Interface (UI/UX)
* **Design Imersivo (Estilo *Ecco the Dolphin*):** A tela de gameplay permanece 100% limpa de elementos de HUD (sem contadores de metros, pontos ou vida na tela).
* **Rastreamento Silencioso:** As estatísticas (distância, krill alimentado, lixo colidido e tempo) são contabilizadas em segundo plano pelo estado do jogo sem poluir a visão do mar.
* **Tela de Relatório de Migração (Fim de Fase):** Ao concluir a rota de 27.000m em Arraial do Cabo, o jogo apresenta um painel completo com o tempo de viagem, total de alimentos, impacto ambiental, pontuação final e o **High Score** salvo no `localStorage`.

