## 🗺️ Roadmap de Desenvolvimento (Próximos Passos)

### 1. Elementos de Consciência Ambiental (Ameaças e Desafios)
Em vez de inimigos tradicionais, os obstáculos representam os perigos reais que as baleias enfrentam na costa brasileira:
- [x] **Redes de Pesca Fantasma (Ghost Nets):** Redes abandonadas flutuando no mar. Se a baleia colidir, ela fica presa temporariamente (sua velocidade cai muito) e o jogador precisa apertar o `Espaço` repetidamente para se libertar. Ocasionalmente, um barco da guarda marítima de Arraial pode vir para remover a rede da baleia.
- [x] **Lixo Plástico (Garrafas, Sacolas):** Reduzem a energia ou velocidade da baleia ao colidir.
- [ ] **Poluição Sonora (Navios e Lanchas de Turismo):** Navios grandes geram ondas sonoras na água (representadas por círculos concêntricos piscando). Como as baleias usam a ecolocalização para navegar, entrar nessas áreas de ruído pode desorientar o jogador (inverter temporariamente os controles de cima/baixo) ou drenar fôlego.

### 2. Integração com a Rota Migratória de 27.000m e Biomas
Como o cenário avança horizontalmente (0m a 27.000m), o percurso é dividido nos 5 biomas da migração real:
- [ ] **1. Oceano Antártico (0m - 5.000m):** 
  - **Teto de Superfície Congelada (Camada de Gelo):** Superfície coberta por gelo com aberturas/fendas específicas onde a baleia pode subir para respirar oxigênio.
  - **Fundo Polar:** Alta concentração de Krill e silhuetas estéticas de Orcas ao fundo distante (apenas elemento decorativo/narrativo).
- [ ] **2. Travessia Oceânica (5.000m - 12.000m):** 
  - **Jejum (Sem Krill):** Mar aberto escuro sem alimentos.
  - **Baleias-Jubarte Passantes:** Outras jubartes passam ocasionalmente ao fundo emitindo cantos de baixa frequência, iluminando temporariamente o ambiente e revelando obstáculos e caminhos no mar escuro.
- [ ] **3. Entrada na Costa Urbana (12.000m - 19.000m):** 
  - **Ameaças:** Concentração pesada de lixo plástico, redes fantasma e ruído motorizado de navios (desorientação de controles).
  - **Barco de Resgate Patrulheiro:** O Barco da Guarda Marítima navega ativamente na superfície dessa zona e intervém ajudando a baleia se ela estiver retida em redes ou desmaiando nas proximidades.
- [ ] **4. Faixa de Ressurgência (19.000m - 25.000m):** Jatos de ressurgência ativados exclusivamente nessa faixa, cânions de pedras (Boqueirão / Fenda de N. Sra.) e águas turquesa ricas em nutrientes.
- [ ] **5. Santuário Marinho de Arraial (25.000m - 27.000m):** Águas cristalinas abrigadas da Ilha do Farol, culminando no Salto Majestoso (Breach) na linha de chegada.
- [ ] **Placas Informativas (Pop-ups de Eco-Consciência):** Atualizar `data/facts.json` com os novos marcadores distribuídos nos gatilhos `triggerX`: 500m (Antártica), 6.000m (Travessia), 13.000m (Costa Urbana), 19.500m (Ressurgência) e 24.000m (Santuário).
- [ ] **Transição Dinâmica de Cores do Mar:** Gradiente de fundo alterando suavemente as cores RGB de azul polar escuro para azul turquesa luminoso conforme a posição `X` progride.

### 3. Novas Mecânicas de Jogabilidade
- [x] **Cardumes de Krill (Alimentação & Boost):** Cardumes flutuantes que concedem ganho instantâneo de velocidade (1.2x) e pontos ao se alimentar.
- [ ] **Crescimento Progressivo de Atributos via Krill (Nutrição Acumulada):** Cada Krill consumido concede um aumento permanente de ~1% no limite máximo de velocidade (`MAX_SPEED`) e na capacidade máxima de oxigênio da baleia. O ganho individual é sutil, mas o acúmulo (ex: 20 krills = +20% de fôlego e velocidade) recompensa a alimentação constante ao longo dos 27.000m.
- [x] **Ecolocalização de Baixa Frequência / Canto da Baleia (Tecla Shift ou E):** Ao pressionar a tecla, a baleia emite uma onda sonora de baixa frequência (Mysticeti). Essa onda viaja a longa distância revelando silhuetas de obstáculos, redes e cantos de outras jubartes navegando.
- [x] **Mecânica de Termoclinas (Correntes de Ressurgência):** Correntes de água fria sobem do fundo (ressurgência de Arraial). Entrar nessas correntes dá um impulso vertical para cima sem gastar energia, simulando o comportamento real das baleias aproveitando as correntes marítimas.
- [ ] **Restrição Geográfica da Ressurgência (Faixa de Arraial do Cabo):** Ajustar `upwellingSystem.ts` para que os jatos de ressurgência e cardumes dinâmicos de Krill sejam ativados exclusivamente quando a baleia estiver navegando na faixa de Arraial do Cabo (`19.000m <= position.x <= 25.000m`), garantindo fidelidade ao bioma real.

### 4. Ideias para o Visual e Atmosfera
- [ ] **Gradiente de Profundidade:** O fundo do mar pode ir de um azul-turquesa cristalino perto da superfície (com raios de sol penetrando) até um azul bem escuro nas profundezas.
- [ ] **Canto das Baleias (Som de fundo):** Um áudio de fundo suave com o canto real de baleias jubarte e o som de bolhas de água, criando uma experiência imersiva e relaxante.

### 5. Persistência de Dados e Recorde (High Score)
- [x] **Persistência com `localStorage`:** Salvar a maior pontuação (High Score) e a maior distância percorrida no navegador.
- [ ] **Tela de Relatório de Migração (Fim de Fase):** Apresentar a pontuação total, tempo de jogo, krill coletado, lixo colidido e recorde (`localStorage`) em uma tela dedicada ao finalizar a rota.