# 🏗️ Arquitetura do Sistema - Micro Splash

O projeto adota o padrão **Entity-Component System (ECS)** utilizando Kaboom.js e TypeScript de forma modular.

## Estrutura de Módulos (`src/`)

- `src/config.ts`: Parâmetros físicos globais (`GAME_CONFIG`) e Tags de entidade (`TAGS`).
- `src/entities/player.ts`: Criação, física senoidal e controles da Baleia (`createPlayer`).
- `src/entities/trash.ts`: Criação e animação de flutuação do Lixo Plástico (`createTrash`).
- `src/systems/collisions.ts`: Gerenciador de eventos de colisão (`setupCollisions`).
- `src/main.ts`: Ponto de entrada (Boot do Kaboom.js).

## Fluxo de Dados
1. `config.ts` fornece valores de velocidade, gravidade e nomes de tags para os módulos.
2. `main.ts` importa o Kaboom, instancia o jogador (`createPlayer`) e o sistema de colisão (`setupCollisions`).
3. `collisions.ts` monitora a sobreposição da tag `PLAYER` com a tag `TRASH`, reduzindo a velocidade e destruindo o lixo.
