# Plano de Implementação — Fase 44: Expansão do Spritesheet de Alta Fluidez e Detalhamento Biomecânico (High-Frame Pixel Art)

Status: Concluído
Data: 2026-10-09
Alvo: v1.20.0

---

## 🔬 Diagnóstico e Fundamentação Biomecânica da Fase 44

1. **Fluidez e Densidade de Quadros na Locomoção da Jubarte**:
   - Atualmente, o spritesheet `public/sprites/whale.png` possui 8 quadros em resolução de 1024×64 px (128×64 px por quadro).
   - Com 8 quadros divididos entre glide (1), swim/stroke (6) e feed (1), a taxa de amostragem temporal para cada ciclo motor é de apenas 2 a 3 poses intermediárias por batida.
   - Isso gera pequenos saltos visuais durante transições rápidas de nado, exigindo que a deformação procedural (Fases 41 e 43) compense a carência de poses desenhadas nativamente.

2. **Arquitetura da Solução de 16 Quadros**:
   - Expandir a folha de sprites para **2048×64 px (16 quadros × 128×64 px)** mantendo estritamente a grade de 128 px por frame e a compatibilidade direta com `playerSliceRenderer.ts` (`totalFrameWidth = 128`).
   - Distribuição biométrica dos 16 quadros:
     - **Quadro 0**: `glide` (Pose neutra hidrodinâmica com dorso e flukes alinhados).
     - **Quadros 1 a 4**: `idle_swim` (Ondulação pendular suave da maré e respiração torácica com deflexão sutil de $\pm 1.8\text{px}$).
     - **Quadros 5 a 9**: `stroke_down` (Batida descendente de potência com 5 estágios progressivos: início, aceleração, ápice de $\pm 6.5\text{px}$, desaceleração e transição).
     - **Quadros 10 a 13**: `stroke_up` (Recuperação elástica ascendente em 4 estágios contínuos).
     - **Quadros 14 a 15**: `feed` (Abertura gradual do saco gular, expansão das pregas ventrais e exposição das barbas de filtração).
   - Gerador procedural aprimorado em `scripts/generateWhaleSprite.cjs` para produzir a imagem com fidelidade à paleta e iluminação pixel art existente.
   - Módulo `src/entities/player/playerAnimation.ts` para orquestração de taxas de quadros e transições harmônicas.

---

## 📋 Lista de Tarefas Atômicas

- [x] **44.1 Expansão do Gerador de Spritesheet para 16 Quadros (`scripts/generateWhaleSprite.cjs`, `public/sprites/whale.png`, `src/main.ts`)**
  - **Arquivos**: `scripts/generateWhaleSprite.cjs`, `src/main.ts`
  - **Ação**:
    - Atualizar a largura total de 1024 para 2048 px (`WIDTH = 2048`, 16 frames).
    - Mapear parâmetros de curva senoidal contínua (`tailOff`, `flukeTilt`, `pecOff`) para os 16 quadros.
    - Executar `npm run generate:whale` gerando a nova textura de 2048×64 px.
    - Atualizar `k.loadSprite("baleia", ...)` em `src/main.ts` com `sliceX: 16` e as novas faixas de frames (`glide`, `idle_swim`, `stroke_down`, `stroke_up`, `swim`, `feed`).

- [x] **44.2 Módulo de Orquestração e Interpolação Harmônica de Animação (`src/entities/player/playerAnimation.ts`, `src/entities/player.ts`)**
  - **Arquivos**: `src/entities/player/playerAnimation.ts`, `src/entities/player.ts`
  - **Ação**:
    - Criar `playerAnimation.ts` com a função pura `determineWhaleAnimationState(...)`.
    - Modular a velocidade de reprodução (`animSpeed`) em função da velocidade horizontal e dreno muscular.
    - Integrar em `src/entities/player.ts` conectando as mudanças de estado às novas faixas de 16 frames.

- [x] **44.3 Suíte de Testes Automatizados da Fase 44 (`tests/phase44_high_frame_sprites.test.ts`)**
  - **Arquivos**: `tests/phase44_high_frame_sprites.test.ts`
  - **Ação**:
    - Validar dimensões físicas da textura gerada (2048×64 px, 16 quadros).
    - Testar integridade do mapeamento de framesets e velocidade em cada estado de animação.
    - Assegurar compatibilidade perfeita com `playerSliceRenderer.ts` (128 px por fatia).
    - Garantir 100% de aprovação e zero regressão na suíte global (55 arquivos de teste).

---

## 🧪 Estratégia de Testes

1. Executar `node scripts/generateWhaleSprite.cjs` para validar a geração do arquivo PNG.
2. Executar `npx vitest run tests/phase44_high_frame_sprites.test.ts`.
3. Executar `npx vitest run tests/phase43_puppet_rig.test.ts tests/phase42_pectoral_fin.test.ts tests/phase41_whale_slice_deformation.test.ts tests/visuals.test.ts`.
4. Executar `npm test` para assegurar 100% de sucesso na suíte global completa.
5. Executar `npm run build` para garantir conformidade estrita de tipagem TypeScript e empacotamento Vite.
