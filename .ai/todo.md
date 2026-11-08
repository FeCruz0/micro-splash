# Plano de Implementação — Migração Kaboom.js para PixiJS v8

Status: Pendente
Data: 2026-11-05
Alvo: substituir o runtime residual do Kaboom pelo PixiJS v8 sem regressão de física, colisão O(1) ou orçamento de 16,6 ms

Diagnóstico: 2222 chamadas `k.*` em 50 arquivos (`ui` 1022, `systems` 763, `entities` 361, `scenes` 71). `RenderEngineAdapter` existe e não recebe `init`. Boot real continua em `kaboom()` dentro de `main.ts`.

---

## Etapa 1: Loop principal e cenas

- [x] Etapa 1.1: Em main.ts, inicializar RenderEngineAdapter no elemento app, remover a chamada kaboom e manter um unico canvas WebGL do PixiJS v8.
  - Contratos em `src/engine/adapters/RenderEngineAdapter.ts` e `src/engine/adapters/PixiNodes.ts`.
  - Nao conviver com o canvas do Kaboom no mesmo container.
- [x] Etapa 1.2: Ligar PixiRenderTicker como unico relogio, despachando SceneManager.update e, na cena de jogo, SystemRunner.run com o delta em segundos.
  - Fases canonicas: input, physics, ai, collision, culling, render.
  - Teto de delta 0,1 s e maxFPS 60 ja existentes no ticker.
- [x] Etapa 1.3: Trocar k.scene e k.go por IScene no SceneManager para splash, menu, start, kiosk, game, rescue e gameover.
  - Arquivos: `src/scenes/splashScene.ts`, `menuScene.ts`, `startScene.ts`, `kioskScene.ts`, `gameScene.ts`, `rescueScene.ts`, `gameoverScene.ts`, `src/main.ts`.
- [x] Etapa 1.4: Separar container de mundo e container de tela; camera move so o mundo; letterbox fica apenas em Graphics do letterboxSystem.
  - `k.fixed` passa a filho do container de tela.
  - `k.camPos` vira posicao negativa do container de mundo.

## Etapa 2: Entidades e renderizacao

- [x] Etapa 2.1: Em player.ts, remover k.add, k.sprite, k.area, k.body e k.shake e aplicar o snapshot de playerRenderPipeline em um PixiSpriteNode.
  - Angulo do rig em radianos antes de setRotation.
  - Ponteiro direto do jogador, sem varredura por tag a cada frame.
- [x] Etapa 2.2: Em collisions.ts, substituir os callbacks k.onCollide por consultas queryAABB no SpatialHashGrid ao fim da fase collision.
  - Tags de lixo, bolsao de ar, gelo, krill e rede.
  - Itens estaticos permanecem com isStatic e nao recalculam celula.
- [x] Etapa 2.3: Retirar k.body de player.ts, companion/index.ts e do corpo estatico em gameScene.ts; gelo polar entra no SpatialHashGrid como estatico.
  - Integracao de velocidade fica em playerPhysics e companionLocomotion.
- [x] Etapa 2.4: Migrar fauna e particulas de k.add por frame para Pixi.Graphics ou particlePool: krill, net, trash, boat, ship, penguin, dolphin e correntes.
  - Pausar entidades fora do frustum.
  - Um ticker indexado por familia, sem dezenas de onUpdate autonomos.

## Etapa 3: Input

- [x] Etapa 3.1: Criar um InputState unico lido somente na fase input do SystemRunner.
  - Teclado, gamepad e toque gravam o mesmo estado.
- [x] Etapa 3.2: Trocar k.onKeyPress e isKeyDown por ouvintes de teclado em window, gamepadSystem e touchControls.
  - Arquivos: `playerControls.ts`, `gamepadSystem.ts`, `touchControls.ts`, `gameScene.ts`.
- [x] Etapa 3.3: Mover a tecla F11 para a Fullscreen API do documento e manter eventMode none no stage do Pixi.
  - Hit de UI por teste geometrico na camada de tela, sem hit-test global.

## Etapa 4: UI e overlays

- [x] Etapa 4.1: Migrar hudSystem e debugDistance para PixiTextNode e Graphics no container de tela, com guarda de string antes de trocar o texto.
- [x] Etapa 4.2: Migrar modalShell, quizModal, telas de opcoes, codex, victory e challengeEnd para o container de tela.
  - k.area de botao vira retangulo de foco em keyboardNav, fora do broadphase fisico.
- [x] Etapa 4.3: Substituir as chamadas restantes de k.tween por createTween em engine/utils/Tween.ts, ligado ao PixiRenderTicker.
- [x] Etapa 4.4: Implementar k.shake como deslocamento do container de mundo, suprimido quando o movimento reduzido estiver ativo.
  - Origem atual: `playerOxygen.ts` e `accessibilitySystem.ts`.

## Etapa 5: Corte do Kaboom e validacao

- [x] Etapa 5.1: Remover a dependencia kaboom, LegacyBridge e os contextos que espelham a API k, deixando um canvas e um ticker.
- [x] Etapa 5.2: Trocar loadSprite do Kaboom em assetLoader pelo carregador Assets do PixiJS v8.
- [ ] Etapa 5.3: Validar com npx tsc --noEmit e npm test; confirmar no overlay de frame budget que input, physics, ai, collision, culling e render permanecem dentro de 1, 4, 3, 2.5, 2 e 4.1 ms.
  - Rota de 30000 m no modo Sereno, sem quadro sustentado acima de 33,3 ms.
