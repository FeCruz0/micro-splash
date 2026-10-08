# Plano de Implementação — Fase 42: Nadadeiras Peitorais Independentes e Hidrodinâmica de Diedro (Floating Pectoral Hydrofoils)

Status: Concluído
Data: 2026-10-08
Alvo: v1.18.0

---

## 🔬 Diagnóstico e Fundamentação Biomecânica da Fase 42

1. **Assinatura Anatômica da Jubarte (_Megaptera novaeangliae_)**:
   - As nadadeiras peitorais da jubarte são as maiores do reino animal (~33% do comprimento total do corpo, medindo até 5 metros em espécimes adultas).
   - Elas possuem **tubérculos hidrodinâmicos** na borda de ataque e operam como verdadeiros hidroplanos de alta manobrabilidade.
   - Em animais reais, as peitorais **nunca ficam coladas estaticamente à lateral do corpo**:
     - Durante curvas e giros verticais (subida/descida), elas alteram o **ângulo diedro** (abertura para cima/baixo) e o enflechamento (_sweep_).
     - Durante planeios em alta velocidade, flexionam para trás reduzindo o arrasto hidrodinâmico.
     - Durante repouso na maré, ondulam suavemente como asas de planador suspensas na correnteza.

2. **Limitação Atual no Jogo**:
   - As nadadeiras peitorais estão desenhadas como pixels fixos na textura de `whale.png`.
   - Embora a Fase 40 tenha adicionado a emissão de vórtices peitorais (`spawnPectoralTipVortices`), a nadadeira em si não possui mobilidade geométrica independente, mantendo a impressão visual de rigidez escapular.

3. **Arquitetura da Solução**:
   - Criar uma camada procedural e articulada de **hidroplanos peitorais flutuantes** (`playerPectoralFin.ts`) acoplada ao tórax da baleia:
     - **Nadadeira Frontal (Foreground, z > 0)**: Asa em foice com dorso escuro e ventre branco estriado, respondendo a diedro e rolagem.
     - **Nadadeira Traseira (Background, z < 0)**: Asa oposta renderizada com perspectiva comprimida e iluminação atenuada.
     - Ponta da asa móvel que alimenta diretamente a emissão de micro-vórtices em manobras bruscas.

---

## 📋 Lista de Tarefas Atômicas

- [x] **42.1 Módulo Cinemático de Hidroplanos Peitorais (`src/entities/player/playerPectoralFin.ts`)**
  - **Arquivos**: `src/entities/player/playerPectoralFin.ts`
  - **Ação**:
    - Definir as interfaces `PectoralFinTransform` e `PectoralFinComputationParameters`.
    - Implementar a função pura `calculatePectoralFinTransform(...)`:
      - Ponto de fixação no tórax (Fatia 1 / x = ~16px, y = ~8px relativo ao centro do corpo).
      - Rastrear ângulo diedro dinâmico: $\theta_{\text{dihedral}} \in [-18^\circ, +24^\circ]$ proporcional à velocidade angular de arfagem (`pitchAngularVelocity`) e à rolagem em perspectiva (`currentRoll`).
      - Calcular enflechamento (_sweep_): recuo da ponta da nadadeira em alta velocidade ($\theta_{\text{sweep}} \in [0^\circ, 22^\circ]$ proporcional a `horizontalSpeed / 200`).
      - Calcular coordenadas exatas da base e da ponta da nadadeira (necessárias para emissão de vórtices).

- [x] **42.2 Renderização Procedural com Perspectiva e Camadas Z (`src/entities/player/playerPectoralFin.ts`)**
  - **Arquivos**: `src/entities/player/playerPectoralFin.ts`
  - **Ação**:
    - Implementar componente visual que desenha a silhueta em foice com curvatura anatômica e tubérculos suaves na borda de ataque.
    - Separar em camada frontal (asa visível com ventre claro) e camada dorsal oposta (asa de fundo escurecida para profundidade 3D).
    - Modular a escala em perspectiva com base no `currentRoll` e na arfagem.

- [x] **42.3 Integração com a Entidade Baleia e Emissores de Vórtice (`src/entities/player.ts`, `src/entities/player/playerParticles.ts`)**
  - **Arquivos**: `src/entities/player.ts`, `src/entities/player/playerParticles.ts`
  - **Ação**:
    - Anexar as nadadeiras peitorais ao ciclo de renderização e atualização de `baleia`.
    - Atualizar `spawnPectoralTipVortices` para receber a posição real calculada da ponta da nadadeira peitoral, eliminando aproximações estáticas de offset.
    - Sincronizar a ondulação de repouso das aletas com o `idleBlend` e o swell marinho.

- [x] **42.4 Testes Automatizados de Articulação Peitoral (`tests/phase42_pectoral_fin.test.ts`)**
  - **Arquivos**: `tests/phase42_pectoral_fin.test.ts`
  - **Ação**:
    - Testar cálculo de diedro em manobras de subida e descida.
    - Testar enflechamento progressivo com aumento de velocidade horizontal.
    - Validar posições de ponta de asa e coordenadas de emissão de vórtices.
    - Garantir 100% de aprovação na suíte global (52+ arquivos de teste).

---

## 🧪 Estratégia de Testes

1. Executar `npx vitest run tests/phase42_pectoral_fin.test.ts`.
2. Executar `npx vitest run tests/phase41_whale_slice_deformation.test.ts tests/phase40_whale_pitch_biomechanics.test.ts tests/visuals.test.ts`.
3. Executar `npm test` para assegurar regressão zero na suíte global.
4. Executar `npm run build` para validação rigorosa de tipagem e empacotamento Vite.
