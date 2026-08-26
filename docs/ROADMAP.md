## 🗺️ Roadmap de Desenvolvimento (Próximos Passos)

### 1. Elementos de Consciência Ambiental (Ameaças e Desafios)
Em vez de inimigos tradicionais, os obstáculos representam os perigos reais que as baleias enfrentam na costa brasileira:
- [ ] **Redes de Pesca Fantasma (Ghost Nets):** Redes abandonadas flutuando no mar. Se a baleia colidir, ela fica presa temporariamente (sua velocidade cai muito) e o jogador precisa apertar o `Espaço` repetidamente para se libertar. Ocasionalmente, um barco da guarda marítima de Arraial pode vir para remover a rede da baleia.
- [ ] **Lixo Plástico (Garrafas, Sacolas):** Reduzem a energia ou velocidade da baleia ao colidir.
- [ ] **Poluição Sonora (Navios e Lanchas de Turismo):** Navios grandes geram ondas sonoras na água (representadas por círculos concêntricos piscando). Como as baleias usam a ecolocalização para navegar, entrar nessas áreas de ruído pode desorientar o jogador (inverter temporariamente os controles de cima/baixo) ou drenar fôlego.

### 2. Integração com os Pontos Turísticos de Arraial do Cabo
Como o cenário avança horizontalmente, podemos dividir o percurso pelos pontos turísticos reais:
- [ ] **Boqueirão ou Contorno da Ilha do Farol:** Desafios de precisão! O jogador precisará navegar por fendas estreitas nas pedras (exigindo controle fino da velocidade e da inclinação da baleia).
- [ ] **Ilha do Farol e Pontal do Atalaia:** Zonas onde a água é muito cristalina. Aqui, o jogador pode ganhar pontos extras ao dar Saltos Majestosos (Breaches) fora da água. Saltar no momento certo gera um bônus de "prestígio ecológico" dos turistas que observam da encosta.
- [ ] **Placas Informativas (Pop-ups de Eco-Consciência):** Ao cruzar pontos históricos ou geográficos específicos, o jogo pausa brevemente (ou mostra uma mensagem elegante no topo da tela) com curiosidades ecológicas:
  - *Exemplo:* "Você chegou à Fenda de Nossa Senhora! Sabia que a ressurgência (correntes frias profundas cheias de nutrientes) atrai o alimento das baleias aqui em Arraial?"

### 3. Novas Mecânicas de Jogabilidade
- [ ] **Ecolocalização / Canto da Baleia (Tecla Shift ou E):** Ao pressionar a tecla, a baleia emite uma onda de sonar visível. Essa onda revela a silhueta de obstáculos à frente na água turva.
- [ ] **Mecânica de Termoclinas (Correntes de Ressurgência):** Correntes de água fria sobem do fundo (ressurgência de Arraial). Entrar nessas correntes dá um impulso vertical para cima sem gastar energia, simulando o comportamento real das baleias aproveitando as correntes marítimas.

### 4. Ideias para o Visual e Atmosfera (Para impressionar na Feira)
- [ ] **Gradiente de Profundidade:** O fundo do mar pode ir de um azul-turquesa cristalino perto da superfície (com raios de sol penetrando) até um azul bem escuro nas profundezas.
- [ ] **Canto das Baleias (Som de fundo):** Um áudio de fundo suave com o canto real de baleias jubarte e o som de bolhas de água, criando uma experiência imersiva e relaxante.

### 5. Persistência de Dados e Recorde (High Score)
- [ ] **Persistência com `localStorage`:** Salvar a maior pontuação (High Score) e a maior distância percorrida no navegador do estande da feira de ciências.
