# Plano de Implementação — Fase 41: Deformação da Coluna por Fatiamento Segmentado em Tempo Real (Vertical Slice Ribbon)

Status: Concluído
Data: 2026-10-08
Alvo: v1.17.0

---

## 🔬 Diagnóstico e Fundamentação Biomecânica da Fase 41

1. **Problema do Sprite Monolítico Atual**:
   - O sprite `whale.png` (128x64 px por quadro) é renderizado como uma imagem retangular plana e rígida.
   - Quando o jogador vira para cima/baixo ou bate a cauda, a cabeça e a cauda inclinam-se exatamente no mesmo ângulo estático em torno de `anchor("center")`.
   - Modulações globais de `scale.x` e `scale.y` esticam ou encolhem o retângulo por inteiro, não reproduzindo a curvatura em arco (_sagittal bending_) de uma coluna vertebral viva.

2. **Solução: Fatiamento Sagital com Onda Viajante (_Traveling Wave Ribbon_)**:
   - Em vez de redesenhar os sprites, particionamos a renderização do sprite atual em **4 fatias verticais progressivas** de 32 px:
     - **Fatia 0 (Rostro / Crânio, x: 0–32 px)**: Massa óssea rígida. Segue estritamente a orientação de nado $\theta_{\text{head}}$. Amplitude de deformação: $0\%$.
     - **Fatia 1 (Tórax / Peitorais, x: 32–64 px)**: Centro de sustentação e empuxo. Amplitude de deformação: $\approx 15\%$.
     - **Fatia 2 (Pedúnculo Caudal, x: 64–96 px)**: Transmissão muscular epaxial/hipaxial. Amplitude: $\approx 55\%$.
     - **Fatia 3 (Flukes / Cauda, x: 96–128 px)**: Lâmina propulsora terminal. Segue atraso inercial da água e máxima excursão vertical. Amplitude: $100\%$.
   - Cada fatia é desenhada com continuidade matemática de bordas (sem frestas ou artefatos), gerando uma ondulação contínua e orgânica a 60 FPS ininterruptos.

---

## 📋 Lista de Tarefas Atômicas

- [x] **41.1 Módulo Matemático de Fatiamento Sagital (`src/entities/player/playerSliceRenderer.ts`)**
  - **Arquivos**: `src/entities/player/playerSliceRenderer.ts`
  - **Ação**:
    - Criar o tipo `WhaleSliceData` contendo coordenadas de origem no frame do sprite (`quad`), offset local $(x, y)$, ângulo relativo e opacidade.
    - Implementar a função pura `calculateWhaleSliceTransforms(...)`:
      - Recebe: ângulo da cabeça, curvatura espinhal (`spineCurvature`), velocidade, fase de nado e facing (`facingRight`).
      - Retorna: array com 4 matrizes de transformação contínuas para cada fatia vertical.
    - Garantir acoplamento geométrico contínuo: a borda posterior da fatia $i$ conecta-se exatamente à borda anterior da fatia $i+1$, eliminando frestas visíveis.

- [x] **41.2 Equação de Onda Viajante de Propulsão (_Traveling Wave Dynamics_) (`src/entities/player/playerSliceRenderer.ts`)**
  - **Arquivos**: `src/entities/player/playerSliceRenderer.ts`
  - **Ação**:
    - Implementar propagação senoidal com defasagem de fase proporcional ao comprimento do corpo:
      $$y_i(t) = A_{\text{stroke}} \cdot \left(\frac{i}{3}\right)^{1.8} \cdot \sin(\omega t - \phi \cdot i)$$
    - Onde $i \in \{0, 1, 2, 3\}$, mantendo o crânio ($i=0$) inerte e a cauda ($i=3$) com defasagem de até $75^\circ$ em relação à cabeça.
    - Sincronizar o amortecimento da onda com o `idleBlend`: em repouso marinho, a amplitude de oscilação reduz suavemente para um balanceio sutil de maré.

- [x] **41.3 Integração do Renderizador Fatiado na Entidade do Jogador (`src/entities/player.ts`)**
  - **Arquivos**: `src/entities/player.ts`
  - **Ação**:
    - No hook de desenho/atualização de `baleia`, aplicar a deformação fatiada mantendo o sprite base sincronizado com a animação ativa (`idle_swim`, `stroke_up`, `stroke_down`, `glide`).
    - Alinhar os brilhos de cáusticos solares (`whaleCaustics`) e o brilho ventral (`whaleVentralFlash`) para acompanhar a linha central deformada da coluna vertebral.
    - Preservar intacta a caixa de colisão física original (`k.area`), garantindo 100% de consistência com detecção de krills, redes e obstáculos.

- [x] **41.4 Testes Automatizados de Fatiamento e Integridade (`tests/phase41_whale_slice_deformation.test.ts`)**
  - **Arquivos**: `tests/phase41_whale_slice_deformation.test.ts`
  - **Ação**:
    - Testar que a fatia 0 (cabeça) mantém deformação zero independente da intensidade da batida.
    - Testar que a fatia 3 (flukes) atinge a máxima excursão e possui atraso angular consistente com a hidrodinâmica.
    - Validar a continuidade de junção (distância entre o final da fatia $i$ e o início da fatia $i+1$ $\le 0.1\text{ px}$).
    - Garantir que a suíte global (52 arquivos, 370 testes) permaneça com 100% de aprovação.

---

## 🧪 Estratégia de Testes

1. Executar `npx vitest run tests/phase41_whale_slice_deformation.test.ts`.
2. Executar `npx vitest run tests/phase40_whale_pitch_biomechanics.test.ts tests/controls.test.ts tests/visuals.test.ts`.
3. Executar `npm test` para assegurar regressão zero na suíte global.
4. Executar `npm run build` para validação rigorosa de tipagem e empacotamento Vite.
