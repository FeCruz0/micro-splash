# Plano: correção da movimentação dos sprites

Escopo da análise: `src/engine/adapters/RenderingContextAdapter.ts`, `RenderEngineAdapter.ts`, `SpriteSheetManager.ts`, `cameraSystem.ts`, `entities/krill.ts`, `systems/{weather,lightRays,waterSurface,spatialCulling,entityFamilyTicker}.ts`, `scenes/gameScene.ts`.

> [!NOTE]
> A skill `kaboom-to-pixi-migrator` não está listada entre as skills disponíveis nesta sessão. O plano segue o `ai.rules` (nomes explícitos em inglês, sem abreviações, módulos < 300 linhas, adaptadores desacoplando a engine, validação com `npx tsc --noEmit` + `npm test`).

## Causas-raiz encontradas

| #   | Causa                                                                                                                                                                                                                 | Evidência                                                                                                                                                                               | Efeito visível                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Semântica da câmera divergente.** Kaboom: `camPos` = _centro_ da viewport. `RenderEngineAdapter.updateWorldContainerPosition` usa `-cameraPosition` = _canto superior esquerdo_.                                    | `RenderEngineAdapter.ts:300-306`; `lightRaysSystem.ts:161`, `weatherSystem.ts:341` e `waterSurfaceSystem.ts:240` calculam `camX - width/2` (convenção centro).                          | Mundo deslocado meia tela; a baleia (câmera em `x + 200`) fica **fora da tela à esquerda**; parallax, chuva, raios de luz e superfície d'água desalinhados com o mundo.                             |
| 2   | **`entity.pos` pode ser sobrescrito e desliga o nó visual.** `pos` é propriedade comum (`entityInstance.pos = positionCoordinateProxy`).                                                                              | `RenderingContextAdapter.ts:1969`; `krill.ts:256,261` (`halo.pos = cluster.pos`); `weatherSystem.ts:356…679` (`obj.pos = {x,y}`); `onboardingModal.ts:1157-1172`; `keyboardNav.ts:349`. | Após a atribuição o setter deixa de chamar `setPosition` no nó do próprio sprite: halos, partículas de clima e botões ficam parados ou colados no objeto errado (alias do proxy de outra entidade). |
| 3   | **`hidden` e `flipX` não estão ligados ao nó.** São campos planos (`hidden: false`).                                                                                                                                  | `RenderingContextAdapter.ts:319,1114`; escritos por `spatialCullingSystem.ts:61`, `entityFamilyTicker.ts:166,231`, `shipNoiseSystem.ts:260`, `presentationMode.ts:186`.                 | Culling não oculta nada (custo de render e sprites fantasmas); sprites nunca espelham.                                                                                                              |
| 4   | **Vetor de `pos` sem métodos** (`add`, `sub`, `len`, `dist`, `unit`, `scale`) e sem `moveTo`/`vel`.                                                                                                                   | O proxy de `pos` só tem `x`/`y`.                                                                                                                                                        | `TypeError` silencioso capturado no `try/catch` de `runActiveSceneUpdateCallbacks` → o `onUpdate` da entidade aborta todo quadro.                                                                   |
| 5   | **Âncora padrão `topleft` para sprites centrados.** Kaboom também usa topleft, mas o `anchor("center")` só é lido se vier antes do nó; o jogador/companheiro criam `PixiSpriteNode` à parte com `setAnchor(0.5,0.5)`. | `RenderingContextAdapter.ts:1069-1070,1737`.                                                                                                                                            | Sprites criados sem `anchor` rotacionam/escalam em torno do canto, parecendo "orbitar".                                                                                                             |
| 6   | **Duas fontes de tempo.** `dt()` vem do ticker (limitado a 0,1 s), mas `time()` usa `performance.now()` e as animações dos sprites acumulam `deltaTimeInSeconds` por cena.                                            | `RenderingContextAdapter.ts:827-835`, `SpriteSheetManager.ts:109-130`.                                                                                                                  | Oscilações senoidais (krill, balanço) e animação de quadros dessincronizam após pausa/transição; saltos ao voltar de aba.                                                                           |

> [!WARNING]
> A sincronização de câmera que apliquei na tarefa anterior (`synchronizePlayerCameraTracking` em `gameScene.ts` + `player.ts`) segue a convenção **centro**, mas o `RenderEngineAdapter` ainda usa **canto**. A causa 1 explica por que o resultado visual continua errado. A Etapa 1 corrige isso na raiz.

## Etapas (uma por módulo, validando a cada passo)

### Etapa 1 — Unificar a semântica da câmera (causa 1)

- `RenderEngineAdapter.ts`: `updateWorldContainerPosition` passa a usar `-(camera.x - viewportWidth/2)` e `-(camera.y - viewportHeight/2)`; posição inicial da câmera = `(width/2, height/2)`; recalcular em `resize`.
- `RenderingContextAdapter.updateCameraViewportPosition`: remover o `worldContainerNode.setPosition` redundante (hoje duplica e **sobrescreve** o deslocamento de _shake_); delegar só a `setCameraPosition`.
- `cameraSystem.ts` e `player.ts` (passo 12): manter alvo em coordenadas de mundo do centro; `camPos().y` inicial deixa de ser 0.
- Testes: ajustar `phase1_4_containers_camera.test.ts`; novo teste "câmera em (x, y) coloca o ponto no centro da tela".

### Etapa 2 — `pos` como acessor com cópia de valor (causas 2 e 4)

- Novo módulo `src/engine/adapters/entityPositionBinding.ts`:
  `createEntityPositionBinding(onPositionChanged)` retorna proxy `x/y` + `add/sub/scale/len/unit/dist` reutilizando `createRenderingContextVector2D`.
- No adaptador: `Object.defineProperty(entityInstance, "pos", { get, set })`; o setter **copia** `x`/`y` do valor recebido e chama `setPosition` (nunca troca a referência).
- `krill.ts`: trocar `halo.pos = cluster.pos` por cópia explícita de `x`/`y` (comportamento passa a ser valor, como no Kaboom).
- Testes: atribuir `entity.pos = {x,y}` move o nó; `halo.pos = cluster.pos` não cria alias.

### Etapa 3 — Ligar `hidden`, `flipX` e `fixed` ao nó (causa 3)

- `defineProperty` para `hidden` → `setVisible(!hidden)`; `flipX`/`flipY` → sinal da escala X/Y composto com `scale`.
- Garantir que `spatialCullingSystem` / `entityFamilyTicker` realmente ocultem o nó (teste com contagem de nós visíveis).

### Etapa 4 — API de movimento compatível com Kaboom (causa 4)

- `moveTo(position, speed)`, `move(vector | x, y)` aceitando vetor, `vel` opcional integrado por `dt()`.
- Aplicar `dt` clamp único (`GAME_CONFIG.MAX_DELTA_TIME`) em função utilitária compartilhada, removendo a duplicata em `player.ts` e no adaptador.

### Etapa 5 — Âncora e escala consistentes (causa 5)

- Auditar sprites criados via `k.add` sem `anchor` (`grep` limitado a `src/entities` e `src/systems`); para cada um, declarar `k.anchor("center")` quando o código assume origem central (krill, trash, ship, dolphin, penguin).
- `resolveAnchorCoordinates` com teste de tabela para todos os alinhamentos.

### Etapa 6 — Relógio único (causa 6)

- `time()` passa a vir do ticker (acumulador somado a cada `deltaTime` já limitado); pausa congela `time()` e `dt()`.
- `SpriteSheetManager` continua recebendo `dt` do mesmo ticker.

## Verificação (obrigatória após cada etapa)

1. `npx tsc --noEmit` → código 0.
2. `npm test` → 837+ testes passando (mais os novos).
3. Smoke manual (`npm run dev`): baleia visível no terço esquerdo da tela, krill e halos acompanham, clima/raios de luz estáveis ao mover a câmera, sprites fora do frustum ocultos (contador de entidades do F3 cai).

## Riscos

- Etapa 1 altera o contrato de `getCameraPosition()` para todos os sistemas; mitigada porque a maioria já assume convenção centro.
- Etapa 2 muda `pos = obj` de referência para cópia; verificar os 9 pontos de atribuição listados.

## Mensagem de commit sugerida (PT-BR)

`fix(engine): alinhar camera, pos e hidden dos sprites ao modelo Kaboom`
