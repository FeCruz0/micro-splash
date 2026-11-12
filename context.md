# Contexto do projeto — Micro Splash

Este arquivo oferece uma visão rápida do projeto para desenvolvimento e manutenção. O código e os documentos especializados continuam sendo a fonte de verdade para detalhes.

## Visão geral

Micro Splash é um jogo educativo 2D para navegador sobre a migração de uma baleia-jubarte da Antártica a Arraial do Cabo. O percurso jogável tem 30.000 m e atravessa cinco biomas. A interface e o jogo são em português, com suporte a outros idiomas.

## Tecnologias e execução

- TypeScript, Vite e PixiJS v8; Zod valida dados e persistência local.
- Vitest executa testes unitários e de integração.
- O runtime gráfico é PixiJS. Kaboom.js não é dependência.
- `npm ci`: instala as dependências.
- `npm run dev`: inicia o servidor local.
- `npm test`: executa toda a suíte.
- `npx tsc --noEmit`: verifica os tipos.
- `npm run validate:data`: valida os JSONs em `data/`.
- `npm run build`: verifica TypeScript e cria o build Vite.

Consulte os scripts disponíveis em `package.json`; não assuma que um comando de documentação ainda existe sem verificar o manifesto.

## Inicialização e ciclo de jogo

1. `src/main.ts` configura observabilidade e PWA, cria um `RenderEngineAdapter` e um `SceneManager`, inicializa o motor e carrega assets.
2. `src/scenes/index.ts` registra as cenas; `SceneManager` administra transições.
3. O ticker PixiJS fornece deltas limitados e atualiza o `SceneManager`.
4. `gameScene.ts` coordena a partida e executa os sistemas nas fases `input`, `physics`, `ai`, `collision`, `culling` e `render`.

O jogo reúne input de teclado, toque e gamepad em `src/systems/inputState.ts`. Colisões e consultas espaciais usam `SpatialHashGrid`; as regras de movimento vivem nos sistemas e entidades, não em um motor de física do Kaboom.

## Organização do código

- `src/engine/`: contratos de renderização/cenas, adapters PixiJS, nós, animação de spritesheet e tweens.
- `src/scenes/`: bootstrap das cenas, carregamento de assets e orquestração do jogo.
- `src/entities/`: jogador, baleia companheira, obstáculos e objetos do mundo; `player/` e `companion/` contêm módulos especializados.
- `src/systems/`: input, simulação, colisões, biomas, áudio, acessibilidade, culling e apresentação. Subdiretórios agrupam módulos relacionados, como `audio/`, `benthic/`, `canyon/`, `ice/` e `sky/`.
- `src/ui/`: HUD, telas, modais, opções, Codex e navegação acessível.
- `src/services/`, `src/schemas/`, `src/utils/`, `src/i18n/` e `src/types/`: serviços, schemas Zod, utilitários, localização e tipos compartilhados.
- `data/`: fatos, perguntas e layout JSON validados por Zod.
- `public/`: sprites/fontes, PWA e conteúdo estático.
- `scripts/`: geração de assets, validação de dados e build do service worker.
- `server/cloudflare-worker/`: API opcional do placar global/semanal.
- `tests/`: testes Vitest agrupados por área.

## Runtime e compatibilidade

`RenderEngineAdapter` encapsula PixiJS e implementa contratos em `src/engine/contracts/INTERFACE_CONTRACTS.ts`. `RenderingContextAdapter` é uma camada de compatibilidade tipada ainda usada por código existente e oferece operações com nomes familiares como `add`, `pos`, `rect` e `onUpdate`. Essas operações não são o pacote nem o runtime Kaboom.js.

Não afirmar que todos os módulos já consomem diretamente `IRenderEngine`: há consumidores da camada de compatibilidade. Para código novo, prefira os contratos e adapters nativos existentes, seguindo os padrões do módulo em que se trabalha. A migração de runtime está concluída; a remoção completa da API de compatibilidade é uma limpeza distinta e ainda não deve ser dada como concluída.

## Dados, rede e funcionamento offline

O jogo persiste configurações e progresso no armazenamento local. O jogo principal funciona offline após os recursos estarem disponíveis em cache; o placar online depende de rede. Analytics Plausible fica desativado sem domínio configurado e respeita Do Not Track no início da aplicação.

## Documentação de referência

- `README.md`: apresentação, recursos e execução.
- `CONTRIBUTING.md`: instalação, dados e fluxo de contribuição.
- `DECISION_LOG.md`: decisões arquiteturais.
- `docs/ARCHITECTURE.md`: desenho técnico.
- `docs/DATA_SCHEMA.md`: formato e validação dos JSONs.
- `docs/GDD.md` e `docs/OCEAN_FACTS.md`: design e fundamentação educativa.
- `docs/ROADMAP.md`, `docs/REFACTORING_PLAN_WBS.md` e `docs/SPRITE_MOVEMENT_FIX_PLAN.md`: histórico e status de trabalho.
- `docs/MIGRATION_SYNTAX_CHEAT_SHEET.md`: orientação para transição de APIs legadas para os contratos atuais.
- `docs/PRIVACIDADE.md`: persistência e comunicações externas.

## Orientações de manutenção

- Antes de alterar uma arquitetura, verificar as implementações e testes próximos à área.
- Manter tipos explícitos, escopo pequeno e o ciclo de vida de nós/listeners alinhado ao ciclo da cena.
- Validar dados com o script próprio; para alterações de código, executar testes direcionados e verificação de tipos apropriada.
- Não remover dados, assets ou documentos históricos sem confirmar que não são referenciados nem necessários.
