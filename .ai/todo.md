# Plano de Implementação — Fase 39: Otimização Extrema de Performance & Taxa de Quadros (60 FPS Sólido)

Status: Concluído
Data: 2026-10-08
Alvo: v1.15.0

---

## 📋 Lista de Tarefas Atômicas

- [x] **39.1 Frustum Culling Espacial & Ocultação Fora da Câmera (`src/systems/spatialCullingSystem.ts`)**
  - **Arquivos**: `src/systems/spatialCullingSystem.ts`, `src/main.ts`
  - **Ação**:
    - Criar `SpatialCullingSystem` que monitora a posição horizontal da câmera (`camX`) e aplica `hidden = true` em entidades de cenário e obstáculos (`ocean_relief`, `kelp_segment`, `ice_block`, `lixo_plastico`, `krill`, etc.) quando fora de `[camX - margin, camX + viewWidth + margin]` (margem de ~320px).
    - Impedir que a GPU e o motor 2D renderizem polígonos, contornos e texturas de objetos a milhares de metros de distância.

- [x] **39.2 Eliminação de Consultas Lineares $O(N)$ em Loops de Update (`src/main.ts`, `src/systems/iceSurface.ts`, `src/entities/krill.ts`, `src/systems/penguinFlockSystem.ts`)**
  - **Arquivos**: `src/main.ts`, `src/systems/iceSurface.ts`, `src/entities/krill.ts`, `src/systems/penguinFlockSystem.ts`, `src/entities/player.ts`
  - **Ação**:
    - Substituir chamadas a `k.get(TAGS.PLAYER)[0]` em loops de update por injeção direta de referência do `playerController` ou singleton $O(1)$ (`getActivePlayerObject()`), eliminando ~80.000 iterações de busca por frame.
    - Em `src/main.ts`, trocar a execução incondicional de `k.get("*").length` a 60 FPS por medição com throttling a cada 500ms (2Hz), zerando a alocação contínua de arrays temporários e pressão no Garbage Collector.

- [x] **39.3 Integração Ampla de Subsistemas no `BiomeLifecycleManager` (`src/systems/benthicFloorSystem.ts`, `src/systems/backgroundFauna.ts`, `src/systems/oceanFloorSystem.ts`)**
  - **Arquivos**: `src/systems/benthicFloorSystem.ts`, `src/systems/backgroundFauna.ts`, `src/systems/oceanFloorSystem.ts`
  - **Ação**:
    - Registrar os subsistemas pesados no `BiomeLifecycleManager` e no `SpatialCullingManager`.
    - Ao estarem fora de alcance ou com `hidden = true`, suspender cálculos matemáticos de ondas, dispersão e animações senoidais.

- [x] **39.4 Migração de Emissores de Fauna para o `ParticlePool` (`src/systems/backgroundFauna.ts`)**
  - **Arquivos**: `src/systems/backgroundFauna.ts`
  - **Ação**:
    - Migrar emissores de bolhas de orcas de fundo para o `ParticlePool` existente, eliminando alocações dinâmicas contínuas via `k.add`.

- [x] **39.5 Testes Automatizados de Performance & Integridade (`tests/phase39_performance_culling.test.ts`)**
  - **Arquivos**: `tests/phase39_performance_culling.test.ts`
  - **Ação**:
    - Criar suíte de testes unitários cobrindo o algoritmo puro de culling espacial (`isEntityInFrustum`), gerenciamento dinâmico no `SpatialCullingManager`, acesso $O(1)$ ao player singleton e garantia de 100% de aprovação na suíte global (50 arquivos, 352 testes).

---

## 🧪 Estratégia de Testes

1. Executar `tests/phase39_performance_culling.test.ts`.
2. Executar `tests/f3Diagnostics.test.ts` validando indicador de FPS e alertas.
3. Executar `npm test` garantindo regressão zero na suíte global (50 arquivos de teste, 343+ testes).
