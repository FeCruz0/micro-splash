# 🗺️ Roadmap de Desenvolvimento (Plano em Fases) - Micro Splash

Este documento organiza o plano de desenvolvimento em **Fases Sequenciais de Produção**, alinhadas aos princípios de Game Design Document (GDD) e desenvolvimento iterativo de jogos.

---

## ✅ Recursos Já Concluídos e Implementados
- [x] **Física de Empuxo Senoidal e Atrito:** Nado realista da baleia (`src/entities/player.ts`).
- [x] **Redes de Pesca Fantasma (Ghost Nets):** Mecânica de emaranhamento e mini-game de libertação no `Espaço`.
- [x] **Lixo Plástico:** Impactos causam desaceleração de 50% e tremor de tela.
- [x] **Cardumes de Krill (Alimentação & Boost):** Ganho instantâneo de velocidade (1.2x) e recuperação de fôlego.
- [x] **Ecolocalização de Baixa Frequência / Sonar (Shift/E):** Emissão de onda acústica de baixa frequência (Mysticeti) revelando objetos no escuro.
- [x] **Mecânica de Termoclinas (Correntes de Ressurgência):** Jatos de água subindo na diagonal com borda branca e impulso gratuito.
- [x] **Persistência de Recordes (`localStorage`):** Maior pontuação e maior distância salvas no navegador.
- [x] **Escala de Rota Ampliada (27.000m):** Rota migratória calibrada para ~3 a 4 minutos de gameplay.

---

## 🚀 FASE 1: Base do Mapa & Geografia dos 27.000m (Prioridade Máxima)
*Objetivo: Estabelecer o "esqueleto" do mundo, transição de cores e a sinalização pedagógica ao longo dos 27km.*

- [x] **1.1 Transição Dinâmica de Cores do Mar (`main.ts`):** Gradiente de fundo alterando suavemente as cores RGB de azul polar escuro (`#051c38`) para azul turquesa luminoso (`#1490b8`) conforme a posição `X` progride de 0m a 27.000m.
- [x] **1.2 Restrição Geográfica da Ressurgência (`upwellingSystem.ts`):** Condicionar os jatos ascensionais e a geração dinâmica de Krill para ocorrerem exclusivamente na faixa de Arraial do Cabo (`19.000m <= position.x <= 25.000m`).
- [x] **1.3 Redistribuição dos Pop-ups Educativos (`data/facts.json`):** Reposicionar os marcadores `triggerX` em gatilhos estratégicos: 500m (Antártica), 6.000m (Travessia), 13.000m (Costa Urbana), 19.500m (Ressurgência) e 24.000m (Santuário).

---

## ❄️ FASE 2: Biomas Específicos & Perigos (Level Design por Etapa)
*Objetivo: Construir a identidade de desafio e narrativa ambiental de cada um dos 5 trechos da travessia.*

- [x] **2.1 Etapa 1 - Oceano Antártico (0m - 5.000m):**
  - **Camada de Gelo na Superfície:** Substituir o teto de água por blocos de gelo congelado com fendas/aberturas de respiração específicas.
  - **Fundo Polar:** Silhuetas estéticas de Orcas ao fundo distante (sem colisão/ataque).
- [x] **2.2 Etapa 2 - Travessia Oceânica (5.000m - 12.000m):**
  - **Jejum Migratório:** Remoção de Krill em mar aberto.
  - **Jubartes Passantes:** Outras jubartes navegando ao fundo emitindo pulsos de sonar de baixa frequência que iluminam caminhos no mar escuro.
- [x] **2.3 Etapa 3 - Costa Urbana & Tráfego Marítimo (12.000m - 19.000m):**
  - **Poluição Sonora:** Navios cargueiros emitindo ondas de ruído motorizado (círculos piscantes) que desorientam os controles.
  - **Barco de Resgate Patrulheiro:** Barco da Guarda Marítima patrulhando a superfície desta área e intervindo ativamente para libertar a baleia se próxima em moments de perigo.
- [x] **2.4 Etapa 4 - Faixa de Ressurgência (19.000m - 25.000m):**
  - **Cânions de Pedra:** Obstáculos rochosos estreitos (Boqueirão / Fenda de N. Sra.) exigindo navegação fina de nadadeiras.
- [x] **2.5 Etapa 5 - Santuário Marinho (25.000m - 27.000m):**
  - **Chegada em Águas Calmas:** Transição para o ambiente cristalino abrigado da Ilha do Farol.

---

## 🦐 FASE 3: Progressão do Jogador & Sistema Nutricional
*Objetivo: Recompensar a alimentação ativa com evolução permanente de atributos.*

- [x] **3.1 Crescimento Progressivo de Atributos via Krill:** Cada Krill consumido concede um aumento permanente de ~1% no teto máximo de velocidade (`MAX_SPEED`) e na capacidade máxima de oxigênio (`maxOxygen`), acumulando benefício perceptível ao longo dos 27.000m (ex: 20 krills = +20% de atributos).

---

## 🏆 FASE 4: Polimento, Áudio & Clímax Final
*Objetivo: Elevar o impacto estético e finalizar a experiência do jogador.*

- [ ] **4.1 Evento do Salto Majestoso (Breach):** Convite para salto com a tecla `Espaço` na linha de chegada (27.000m), concedendo bônus de prestígio ecológico.
- [ ] **4.2 Paisagem Sonora e Áudio Ambiente:** Som de fundo com o canto real de jubartes e borbulhamento do mar.
- [ ] **4.3 Polimento do Relatório de Migração (`victoryScreen.ts`):** Adicionar indicador de herança cultural/sabedoria ancestral no card final.