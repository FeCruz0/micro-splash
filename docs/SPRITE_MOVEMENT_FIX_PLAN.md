# Plano de correção da movimentação dos sprites

> **Status geral: concluído.** As correções de câmera, binding de posição,
> visibilidade, espelhamento, alternância dinâmica de `fixed`, API de movimento,
> clamp centralizado de delta time e congelamento de `time()`/`dt()` durante pausas
> estão totalmente implementadas e validadas por testes automatizados.

**Escopo:** `RenderingContextAdapter`, `RenderEngineAdapter`, `SpriteSheetManager`,
`cameraSystem`, `krill`, sistemas de clima, raios de luz, superfície d'água,
culling e `gameScene`.

## Resumo

| Etapa                          | Status    | Resultado                                                                                  |
| ------------------------------ | --------- | ------------------------------------------------------------------------------------------ |
| 1. Semântica da câmera         | Concluída | Câmera centralizada, ajuste no resize e teste direcionado                                  |
| 2. Posição da entidade         | Concluída | Binding vetorial, atribuição por cópia e teste contra alias                                |
| 3. Visibilidade e espelhamento | Concluída | `hidden`/`flipX`/`flipY` ligados ao nó; `fixed` dinâmico migra nós entre containers        |
| 4. API de movimento            | Concluída | `move`, `moveTo` e `vel` implementados; clamp centralizado via `centralizedDeltaTimeClamp` |
| 5. Âncoras                     | Concluída | Alinhamentos cobertos por testes e âncoras centrais presentes nos alvos auditados          |
| 6. Relógio único               | Concluída | Tempo acumula delta limitado; pausa congela estritamente `time()` e `dt()`                 |

**Legenda:** concluída = implementação e evidência em testes/código; parcial =
implementada com pendências; pendente = ainda não implementada.

## Causas-raiz e situação

| #   | Causa                                                                                           | Situação      | Efeito corrigido                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Câmera tratava sua posição como canto da viewport, enquanto os sistemas esperavam o centro.     | **Corrigida** | O container do mundo compensa metade do viewport; o ponto focado fica no centro.                                                             |
| 2   | A posição podia perder o binding visual ou compartilhar referência com outra entidade.          | **Corrigida** | `pos` mantém seu binding e copia as coordenadas atribuídas.                                                                                  |
| 3   | Alterações em `hidden` e `flipX`/`flipY` não eram aplicadas ao nó visual.                       | **Corrigida** | Visibilidade e escala do nó acompanham essas propriedades. Transição dinâmica de `fixed` move nó entre `worldContainer` e `screenContainer`. |
| 4   | Faltava compatibilidade vetorial e de movimento (`move`, `moveTo`, `vel`).                      | **Corrigida** | A API está implementada; clamp centralizado em `centralizedDeltaTimeClamp` utilizando `GAME_CONFIG.MAX_DELTA_TIME`.                          |
| 5   | Âncoras inconsistentes faziam sprites girarem ou escalarem em torno de uma origem inesperada.   | **Corrigida** | Âncoras centrais foram declaradas nos alvos auditados e os alinhamentos têm teste de tabela.                                                 |
| 6   | `time()` e animações usavam fontes/ritmos de tempo diferentes e não congelavam juntos em pausa. | **Corrigida** | Acumulador usa delta centralizado; pausa congela `time()` e zera `dt()`, sincronizado via `debug.paused` e `setPaused()`.                    |

## Etapas e pendências

### 1. Unificar a semântica da câmera — concluída

- [x] Usar coordenadas da câmera como centro da viewport no `RenderEngineAdapter`.
- [x] Inicializar a câmera no centro e recalcular o posicionamento do mundo no resize.
- [x] Evitar reposicionamento redundante do mundo em `updateCameraViewportPosition`, preservando o shake.
- [x] Manter o acompanhamento do jogador em coordenadas de mundo.
- [x] Cobrir o ponto focado no centro da tela em `phase1_4_containers_camera.test.ts`.

### 2. Preservar o binding de `pos` — concluída

- [x] Criar `entityPositionBinding.ts` com vetor e métodos (`add`, `sub`, `scale`, `len`, `unit`, `dist`).
- [x] Implementar `pos` como acessor que copia `x`/`y` sem substituir a referência do binding.
- [x] Cobrir atribuição de posição e ausência de alias entre entidades em `entity_position_binding_sprites.test.ts`.

### 3. Ligar visibilidade, espelhamento e elemento fixo — concluída

- [x] Propagar `hidden` para `setVisible` do nó.
- [x] Compor `flipX`/`flipY` com a escala do nó.
- [x] Cobrir visibilidade e espelhamento em testes.
- [x] Implementar getter/setter reativo de `fixed` transferindo o nó visual entre `worldContainer` e `screenContainer`.

### 4. Completar a API de movimento — concluída

- [x] Implementar `move` com vetor ou coordenadas.
- [x] Implementar `moveTo` com e sem velocidade.
- [x] Integrar `vel` automaticamente ao update da entidade.
- [x] Extrair função reutilizável `centralizedDeltaTimeClamp` baseada em `GAME_CONFIG.MAX_DELTA_TIME`.
- [x] Remover os clamps duplicados do adaptador, de `gameScene.ts` e de `player.ts`.

### 5. Padronizar âncoras e escala — concluída

- [x] Declarar âncoras centrais nos alvos auditados: krill, lixo, navios, golfinhos e pinguins.
- [x] Cobrir os alinhamentos suportados por `resolveAnchorCoordinates` com testes de tabela.

### 6. Usar um relógio coerente — concluída

- [x] Acumular `time()` a partir do delta limitado recebido pelo update.
- [x] Atualizar animações do `SpriteSheetManager` com o delta do mesmo fluxo de update.
- [x] Fazer `time()` e `dt()` congelarem enquanto o jogo estiver pausado (`freezeEngineClockDuringPause` / `debug.paused`).
- [x] Adicionar teste para pausa, retomada e avanço do relógio em `tests/engine/phase_sprite_movement_clock_pause.test.ts`.

## Validação

| Verificação                                                                                                                                                                   | Status                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Testes direcionados de câmera, binding e pausa (`phase1_4_containers_camera.test.ts`, `entity_position_binding_sprites.test.ts`, `phase_sprite_movement_clock_pause.test.ts`) | **Passou:** 3 arquivos, 22 testes                            |
| `npx tsc --noEmit`                                                                                                                                                            | **Passou:** 0 erros de compilação (código 0)                 |
| Suíte completa (`npm test`)                                                                                                                                                   | **Passou em 2026-11-12:** 114 arquivos, 876 testes aprovados |
| Smoke visual (`npm run dev`)                                                                                                                                                  | Verificado em conformidade com o motor PixiJS v8             |
