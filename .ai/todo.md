# Plano de Implementação — Fase 43: Articulação Multissegmentar de Cauda e Flukes (Multi-Part Puppet Rig)

Status: Concluído
Data: 2026-10-08
Alvo: v1.19.0

---

## 🔬 Diagnóstico e Fundamentação Biomecânica da Fase 43

1. **Cinemática Caudal de Cetáceos (_Megaptera novaeangliae_)**:
   - Em mamíferos marinhos reais, a propulsão é gerada por oscilação vertical da coluna lombar e do pedúnculo caudal.
   - O crânio e o tórax atuam como corpo hidrodinâmico semi-rígido de sustentação (líder cinemático), enquanto a cauda e os flukes formam uma cadeia de múltiplos elos flexíveis amortecidos por água.
   - **Ângulo de Ataque Dinâmico ($\alpha\_{\text{AoA}}$)**:
     - A lâmina terminal dos flukes (cauda bifurcada) não permanece fixa no mesmo ângulo do pedúnculo.
     - Durante a batida descendente (_downstroke_), a lâmina dos flukes flete para cima contra a resistência da água gerando sustentação vetorial para frente.
     - Durante a batida ascendente (_upstroke_), a lâmina flete para baixo.
     - Em repouso e planeio hidrodinâmico, a cauda acomoda-se com amortecimento viscoso passivo à esteira de fluxo.

2. **Limitação Atual no Jogo**:
   - A Fase 41 implementou fatiamento vertical sagital com defasagem de fase senoidal contínua.
   - No entanto, a orientação da cauda terminal e dos flukes ainda depende de funções senoidais isoladas, sem uma cadeia esquelética hierárquica articulada que calcule o vetor de fluxo d'água incidente e o ângulo de ataque real da lâmina propulsora.

3. **Arquitetura da Solução**:
   - Criar módulo cinemático hierárquico `playerPuppetRig.ts`:
     - **Cadeia de 4 Nós Esqueléticos**:
       1. `CranialThorax` (Raiz / Líder cinemático).
       2. `AbdominalSpine` (Junta lombar flexível).
       3. `CaudalPeduncle` (Junta oscilatória de alta amplitude).
       4. `FlukeBlade` (Hidroplano terminal com rotação de ângulo de ataque $\alpha_{\text{AoA}}$).
     - Integração direta com `playerSliceRenderer.ts` e `player.ts` para enriquecer a deformação sagital contínua com cinemática de esqueleto orgânico.

---

## 📋 Lista de Tarefas Atômicas

- [x] **43.1 Módulo Hierárquico de Puppet Rig (`src/entities/player/playerPuppetRig.ts`)**
  - **Arquivos**: `src/entities/player/playerPuppetRig.ts`
  - **Ação**:
    - Definir as interfaces de nó esquelético `PuppetBoneNode`, `PuppetRigTransforms` e parâmetros `PuppetRigParameters`.
    - Implementar a função cinemática pura `calculateWhalePuppetRig(...)`:
      - Resolver cadeia cinemática direta (_forward kinematics_) a partir do nó raiz.
      - Calcular amortecimento inercial e restrições articulares anatômicas (limites angulares de flexão).

- [x] **43.2 Hidrodinâmica da Lâmina dos Flukes com Ângulo de Ataque ($\alpha\_{\text{AoA}}$) (`src/entities/player/playerPuppetRig.ts`)**
  - **Arquivos**: `src/entities/player/playerPuppetRig.ts`
  - **Ação**:
    - Calcular a velocidade vetorial instantânea da lâmina e o fluxo de água incidente.
    - Deduzir $\alpha_{\text{AoA}} \in [-28^\circ, +28^\circ]$ para gerar empuxo propulsor ótimo no _downstroke_ e _upstroke_.
    - Modelar complacência viscosa passiva em repouso marinho e planeio hidrodinâmico.

- [x] **43.3 Acoplamento do Puppet Rig ao Renderizador Sagital e ao Jogador (`src/entities/player/playerSliceRenderer.ts`, `src/entities/player.ts`, `src/entities/player/types.ts`)**
  - **Arquivos**: `src/entities/player/playerSliceRenderer.ts`, `src/entities/player.ts`, `src/entities/player/types.ts`
  - **Ação**:
    - Alimentar as fatias corporais (`WhaleSliceData`) com as rotações e deltas locais dos nós esqueléticos correspondentes.
    - Expor `getPuppetRigTransforms` no `PlayerController` para inspeção e testes.

- [x] **43.4 Suíte de Testes Automatizados de Puppet Rig (`tests/phase43_puppet_rig.test.ts`)**
  - **Arquivos**: `tests/phase43_puppet_rig.test.ts`
  - **Ação**:
    - Testar estabilidade da cadeia cinemática (comprimento total preservado e sem quebras).
    - Testar resposta angular de $\alpha_{\text{AoA}}$ em fases ativas de propulsão e planeio.
    - Testar espelhamento especular de orientação (direita vs esquerda).
    - Assegurar 100% de aprovação e zero regressão na suíte global de testes.

---

## 🧪 Estratégia de Testes

1. Executar `npx vitest run tests/phase43_puppet_rig.test.ts`.
2. Executar `npx vitest run tests/phase42_pectoral_fin.test.ts tests/phase41_whale_slice_deformation.test.ts tests/phase40_whale_pitch_biomechanics.test.ts`.
3. Executar `npm test` para assegurar 100% de sucesso na suíte completa (54 arquivos de teste).
4. Executar `npm run build` para garantir estrita conformidade de tipos TypeScript e empacotamento Vite.
