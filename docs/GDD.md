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
* **Obstáculos (Plásticos/Redes):** Impactos reduzem a velocidade da baleia em 50% e causam tremor de tela.

---

## 4. Interface e Pontuação (HUD)
* **Pontuação (Distância):** Metros percorridos na rota migratória.
* **High Score:** Persistência do maior recorde via `localStorage`.
* **Pop-ups Educativos:** Exibição de fatos biológicos e geográficos de Arraial do Cabo ao cruzar coordenadas específicas.
 
---

## 5. Filosofia de Interface (UI/UX)
* **Design Imersivo (Estilo *Ecco the Dolphin*):** A tela de gameplay permanece 100% limpa de elementos de HUD (sem contadores de metros, pontos ou vida na tela).
* **Rastreamento Silencioso:** As estatísticas (distância, krill alimentado, lixo colidido e tempo) são contabilizadas em segundo plano pelo estado do jogo sem poluir a visão do mar.
* **Tela de Relatório de Migração (Fim de Fase):** Ao concluir a rota em Arraial do Cabo, o jogo apresenta um painel completo com o tempo de viagem, total de alimentos, impacto ambiental, pontuação final e o **High Score** salvo no `localStorage`.
