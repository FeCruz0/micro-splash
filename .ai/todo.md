# Plano de Implementação — Fase 40: Biomecânica de Arfagem e Animação de Curvatura Vertical da Baleia

Status: Concluído
Data: 2026-10-08
Alvo: v1.16.0

---

## 🔬 Pesquisa Biomecânica de Locomoção de Cetáceos (_Megaptera novaeangliae_)

1. **Ondulação Dorsoventral & Inércia Axial**:
   - Baleias propulsionam-se por oscilação dorsoventral sustentada pela musculatura epaxial/hipaxial.
   - Durante guinadas verticais (subida/mergulho), a cabeça inicia o vetor direcional orientada pelas nadadeiras peitorais (que operam como hidroplanos/lemes de profundidade).
   - A coluna vertebral sofre curvatura elástica em arco (_sagittal camber_), enquanto o pedúnculo caudal e a cauda bilobada (_flukes_) apresentam atraso inercial e de arrasto hidrodinâmico (_fluke drag lag_ de ~100–140ms).

2. **Distorção Rígida Atual vs. Curvatura Natural**:
   - Atualmente, a rotação em `controlsMgr.updateOrientation` e `baleia.angle` é aplicada de forma rígida ao redor de `anchor("center")`, mantendo o sprite estático e inflexível enquanto o jogador direciona o nado.
   - O spritesheet existente (`whale.png`) já possui 8 frames contendo: `glide` (frame 0), `stroke_up` (frames 1–2, cauda curvada para cima), `stroke_down` (frames 3–6, cauda curvada para baixo) e `feed` (frame 7).
   - Combinando a deflexão elástica angular da coluna, deslocamento do centro de sustentação peitoral, micro-deformação em arco (cambering) e seleção harmônica de frames de curvatura do spritesheet, a baleia parecerá dobrar e manobrar organicamente no oceano.

---

## 📋 Lista de Tarefas Atômicas

- [x] **40.1 Módulo de Dinâmica Angular & Inércia Caudal (`src/entities/player/playerControls.ts`, `src/entities/player/playerPhysics.ts`)**
  - **Arquivos**: `src/entities/player/playerControls.ts`, `src/entities/player/playerPhysics.ts`
  - **Ação**:
    - Adicionar rastreamento de velocidade angular de arfagem (`pitchAngularVelocity`) e aceleração angular nos controles.
    - Implementar modelo inercial de cauda via mola amortecida de segunda ordem: `tailAngle` segue `headAngle` com amortecimento elástico hidrodinâmico.
    - Calcular a curvatura espinhal instantânea: `spineCurvature = headAngle - tailAngle`.

- [x] **40.2 Compensação do Ponto de Pivô Hidrodinâmico Peitoral (`src/entities/player.ts`)**
  - **Arquivos**: `src/entities/player.ts`
  - **Ação**:
    - Ajustar a rotação visual e física para articular em torno do centro de sustentação das nadadeiras peitorais (~35% a partir do rostro) em vez do centro geométrico estático (50%), fazendo a cabeça conduzir a curva e a cauda descrever o arco natural.

- [x] **40.3 Deformação Orgânica da Coluna Vertebral & Curvatura em Arco (Cambering) (`src/entities/player.ts`)**
  - **Arquivos**: `src/entities/player.ts`
  - **Ação**:
    - Modular a escala dinâmica (`scale.x`, `scale.y`) e offset vertical conforme `spineCurvature` e `pitchAngularVelocity`:
      - Subida (Pitch Up): alongamento ventral, leve encurtamento sagital e elevação torácica.
      - Mergulho (Pitch Down): arqueamento dorsal acentuado, contração hidrodinâmica frontal de penetração de fluxo.
    - Sincronizar os cáusticos solares (`whaleCaustics`) e brilho ventral (`whaleVentralFlash`) com a nova curvatura da silhueta.

- [x] **40.4 Seleção e Transição de Frames Dinâmica por Curvatura Vertical (`src/entities/player.ts`)**
  - **Arquivos**: `src/entities/player.ts`
  - **Ação**:
    - Mapear a curvatura vertical e a velocidade de arfagem aos frames existentes do spritesheet (`whale.png`):
      - Durante arfagem para cima em planeio: acionar frames 1–2 (`stroke_up`) de forma transitória para refletir a inclinação das aletas caudais sustentando a subida.
      - Durante mergulho descendente: manter transição esguia entre frames 3 e 0 (`glide`), eliminando a sensação de sprite "congelado".

- [x] **40.5 Vórtices Hidrodinâmicos de Borda de Nadadeira Peitoral (`src/entities/player/playerParticles.ts`, `src/entities/player.ts`)**
  - **Arquivos**: `src/entities/player/playerParticles.ts`, `src/entities/player.ts`
  - **Ação**:
    - Criar função `spawnPectoralTipVortices` no `playerParticles.ts` utilizando o `ParticlePool` para emitir micro-bolhas translúcidas e vórtices discretos a partir das extremidades das nadadeiras peitorais durante curvas verticais de alta velocidade angular.

- [x] **40.6 Testes Automatizados de Biomecânica de Arfagem (`tests/phase40_whale_pitch_biomechanics.test.ts`)**
  - **Arquivos**: `tests/phase40_whale_pitch_biomechanics.test.ts`
  - **Ação**:
- [x] **40.7 Balanço e Deriva com a Correnteza em Repouso (`src/entities/player.ts`)**
  - **Arquivos**: `src/entities/player.ts`, `tests/phase40_whale_pitch_biomechanics.test.ts`
  - **Ação**:
    - Implementar a função `calculateOceanIdleDrift` integrando movimento orbital de onda (surge horizontal de ~±16px e heave vertical de ~±9.5px) com correnteza marina em repouso, idêntico aos outros animais marinhos do ecossistema.
    - Sincronizar oscilação angular `swimSway` e salvaguarda de linha da superfície d'água (`SEA_LEVEL + 4`).

---

## 🧪 Estratégia de Testes

1. Executar `tests/phase40_whale_pitch_biomechanics.test.ts`.
2. Executar `tests/controls.test.ts` e `tests/visuals.test.ts`.
3. Executar `npm test` garantindo regressão zero na suíte global (51 arquivos de teste, 360+ testes).
4. Executar `npm run build` para garantir integridade do bundle TypeScript e Vite.
