# Plano de Implementação: Paredão de Geleira Submersa 16-Bit (Bioma Antártica)

## Contexto e Regras Inegociáveis (`ai.rules`)

1. **Idioma de Código:** Todos os identificadores (funções, variáveis, interfaces, constantes, tipos e parâmetros) **devem** ser escritos em **inglês explícito e descritivo** (ex.: `renderFacetedSubmergedGlacierWall`, `createGlacialPrismColumnPolygons`, `attachWallToWorldContainer`). **Proibido** usar abreviações (`gfx`, `ctx`, `pt`, `idx`, `col`, `pos`, `w`, `h`).
2. **Tipagem Estrita:** Zero uso de `any`. Utilize estritamente os contratos de `src/engine/contracts/INTERFACE_CONTRACTS.ts` (`IRenderEngine`, `IRenderNode`, `IGraphicsNode`, `ISpriteNode`, `Vector2D`, `GraphicStyle`).
3. **Limite Modular de Tamanho:** Nenhum arquivo em `src/systems/ice/` pode ultrapassar **300 linhas** (`wc -l < 300`).
4. **Espaço de Coordenadas:** Todo elemento visual do paredão e do leito glacial deve ser filho direto de `worldContainer` (`resolveWorldRenderContainer(engine)`), posicionado em coordenadas de mundo (`worldPositionX <= 0` na margem esquerda, com a face escarpada em `x = -64..+160`), **nunca** em `screenContainer`.

---

## 1. Análise de Componentes e Responsabilidades

| Arquivo                                   | Ação             | Responsabilidade Exata na Nova Arquitetura Visual                                                                                                                                                                                                                                                                                        |
| :---------------------------------------- | :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/systems/ice/ice16BitTextures.ts`     | **Modificar**    | Expandir `ICE_16BIT_PALETTE` com os tons exatos da arte de referência 16-bit (turquesa subsuperficial, azul cobalto facetado, índigo de fissura e azul abissal de tálus). Refatorar `draw16BitIcebergWall` para desenhar colunas prismáticas verticais chanfradas e picos alpinos escalonados acima de `GAME_CONFIG.SEA_LEVEL` (`80px`). |
| `src/systems/ice/glacierCliffGeometry.ts` | **Criar (Novo)** | Submódulo puro de geometria (< 220 linhas) que gera os polígonos `Vector2D[]` determinísticos para: (a) picos nevados escalonados acima da linha d'água (`y = 6..80`), (b) blocos verticais facetados da falésia submersa (`y = 80..screenHeight`), e (c) contrafortes abissais na base do leito marinho (`x = -64..+180`).              |
| `src/systems/ice/icebergWallRenderer.ts`  | **Modificar**    | Orquestrar a criação dos nós nativos PixiJS v8 (`IGraphicsNode` / `ISpriteNode`), desenhar as camadas de polígonos de `glacierCliffGeometry.ts`, anexá-los ao `worldContainer` via `attachWallToWorldContainer` e registrar o AABB estático `"iceberg_wall_static"` no `SpatialHashGrid`.                                                |
| `src/systems/ice/iceSurfaceRenderer.ts`   | **Modificar**    | Integrar a faixa de refração/espuma na linha d'água (`y = 76..86`), conectar `renderBoundedAntarcticGlacier` ao ciclo de vida da cena e destruir todos os nós gráficos no `destroyPolarIceRendering()`.                                                                                                                                  |
| `src/systems/lightRaysSystem.ts`          | **Modificar**    | Ajustar a inclinação diagonal paralela dos feixes solares na Antártica (`-26°`, sentido topo-direito para base-esquerda, iniciando em `x >= 20`, `y = GAME_CONFIG.SEA_LEVEL`) para reproduzir os raios volumétricos turquesa da imagem de referência sem atravessar o interior opaco do paredão (`x < 0`).                               |

---

## 2. Especificação Algorítmica, Cromática e Geométrica

### 2.1. Paleta Oficial 16-Bit (`ICE_16BIT_PALETTE` em `ice16BitTextures.ts`)

Mantenha as chaves existentes exigidas pelos testes legados e adicione as tonalidades de facetamento:

```ts
export const ICE_16BIT_PALETTE = {
  // Chaves obrigatórias de compatibilidade com a suíte Vitest:
  SUBMERGED_BASE: 0x4a86e8, // Azul glacial médio
  SUBMERGED_SHADOW: 0x2d5bb9, // Sombra azul cobalto
  SUBMERGED_DEEP_ABYSS: 0x16325c, // Azul batial escuro
  SUBMERGED_TRENCH_SHADOW: 0x0f263e, // Base abissal (alinhada ao fundo [15, 38, 62])
  GLACIAL_BODY_MAIN: 0xa2d9ce, // Corpo glacial ciano-claro
  GLACIAL_BODY_LIGHT: 0xd0ece7, // Faceta iluminada superior
  GLACIAL_CLEAVAGE: 0x78bdb0, // Fissura de clivagem
  SNOW_CREST: 0xffffff, // Topo nevado branco puro
  SNOW_SHADOW: 0xe0f2f1, // Sombra fria da neve

  // Novas chaves para a falésia facetada 16-bit (imagem de referência):
  WATERLINE_FOAM_BRIGHT: 0xe8fbff, // Espuma especular na linha d'água (y = 78..82)
  SUBSURFACE_TURQUOISE: 0x5ce1e6, // Turquesa translúcido logo abaixo da superfície (y = 80..150)
  FACET_HIGHLIGHT_CYAN: 0x6dd5fa, // Aresta esquerda iluminada dos blocos submersos
  FACET_MID_GLACIAL: 0x348ac7, // Face frontal principal dos prismas de gelo
  FACET_DARK_COBALT: 0x1c4e80, // Face lateral direita em sombra própria
  FISSURE_ABYSS_LINE: 0x0b213f, // Fendas verticais profundas entre colunas
  SEABED_TALUS_SILHOUETTE: 0x081a33, // Contrafortes rochosos/glaciais no leito marinho
} as const;
```

### 2.2. Geometria da Falésia em Coordenadas de Mundo (`glacierCliffGeometry.ts`)

O nó `cliffFrontGraphics` (`id = "iceberg_cliff_front"`) e o nó `cliffSnowGraphics` (`id = "iceberg_cliff_snow"`) são posicionados em `(worldPositionX = 0, worldPositionY = 0)` dentro do `worldContainer`. Todos os vértices `(x, y)` abaixo são relativos à origem `(0, 0)` do mundo:

```
[worldContainer (Coordenadas de Mundo)]
├── Picos Alpinos Nevados (cliffSnowGraphics, zIndex: 15) -> x: -360..+24 | y: 6..80
├── Faixa de Refração e Espuma (cliffFrontGraphics, zIndex: 14) -> x: -360..+36 | y: 76..86
├── Colunas Prismáticas Superiores Turquesa/Ciano -> x: -180..+32 | y: 80..260
├── Pilares Facetados Cobalto com Fissuras Verticais -> x: -180..+28 | y: 220..520
└── Contrafortes Abissais e Tálus Submarino -> x: -180..+160 | y: 460..screenHeight
```

1. **Picos Nevados Escalonados Acima d'Água (`cliffSnowGraphics`, `y = 0..80`, `zIndex = 15`):**
   - **Atenção ao Teste Existente:** O teste unitário em `tests/systems/phase68_ice_and_sanctuary_16bit.test.ts` verifica que o **primeiro polígono** (`snowGraphic.drawPolygon.mock.calls[0][0]`) possui `maxSnowY <= 36` e `minSnowY >= 0`.
   - Portanto:
     - **Polígono 0 (`calls[0][0]` — Crista Superior de Neve Pura):** Deve ter todos os vértices estritamente entre `y = 0` e `y = 28` (`maxSnowY <= 36`), cobrindo `x = -120..+22` com cor `[255, 255, 255]`.
     - **Polígonos 1..N (Contrafortes Alpinos e Sombra Azul-Gelo da Crista):** Desenham os degraus serrilhados que descem de `y = 18` (em `x = -120`) até `y = 36` (em `x = +22`), com facetas iluminadas à esquerda (`[255, 255, 255]`) e facetas sombreadas à direita (`[168, 220, 250]` e `[95, 168, 232]`).

2. **Falésia Submersa Facetada (`cliffFrontGraphics`, `y = 80..screenHeight`, `zIndex = 14`):**
   - **Atenção aos Testes Existentes:**
     - `cliffGraphic.drawPolygon.mock.calls[0][0]` **deve** ter pelo menos 6 vértices com `x > 0` (`positiveBoundaryVertices.length >= 6`) e **nenhum** vértice com `x <= -180` (`outerBathyalPoints.some(p => p.x <= -180) === false`).
   - **Camada 0 (`calls[0][0]` — Silhueta Estrutural Externa da Falésia e Tálus Abissal):**
     - Polígono base em `[11, 33, 63]` (`alpha: 0.98`) com borda esquerda em `x = -96` (nunca `<= -180`) e borda direita denteada (`x > 0` em pelo menos 7 pontos) que desce quase verticalmente na metade superior (`x = +24..+32` entre `y = 80` e `y = 0.55 * screenHeight`) e se alarga em rampa rochosa (tálus submarino) na base (`x = +58, +96, +140` entre `y = 0.70 * screenHeight` e `y = screenHeight`), fundindo-se ao leito marinho escuro.
   - **Camadas 1..N (Colunas Prismáticas Verticais de Gelo Submerso):**
     - Gere uma grade de **4 colunas verticais de prismas** distribuídas horizontalmente de `x = -96` até `x = +28` (larguras de ~`28px` a `34px` por coluna) subdivididas em **4 andares verticais** de `y = seaLevelY` (`80px`) até `y = screenHeight`.
     - Cada célula prismática é desenhada por **2 polígonos triangulares/trapezoidais adjacentes** (chanfro 16-bit):
       - **Faceta Esquerda/Superior (Luz Solar Refratada):** Cor interpolada por profundidade de `[92, 225, 230]` (topo `y = 80..180`) -> `[74, 134, 232]` (meio `y = 180..380`) -> `[45, 91, 185]` (fundo `y = 380..560`).
       - **Faceta Direita/Inferior (Sombra Própria):** Cor interpolada de `[52, 138, 199]` (topo) -> `[28, 78, 128]` (meio) -> `[15, 38, 62]` (fundo).

---

## 3. Gerenciamento de Camadas (`zIndex` e Paralaxe)

Todos os nós abaixo pertencem ao `worldContainer`, ordenados pelo `sortableChildren = true` do PixiJS v8:

| Camada Visual                  | Sistema / Nó                                     |  `zIndex`   | Espaço / Comportamento de Câmera                        |
| :----------------------------- | :----------------------------------------------- | :---------: | :------------------------------------------------------ |
| **1. Céu em Banda**            | `game_scene_sky_band` (`gameScene.ts`)           |    `-10`    | Mundo (acompanha `cameraX`, `y = 0..80`)                |
| **2. Nuvens e Astros**         | `parallaxSkySystem.ts`                           | `-8` a `-5` | Mundo com fator de paralaxe (`0.18..0.38`)              |
| **3. Leito Oceânico Base**     | `game_scene_ocean_floor` (`gameScene.ts`)        |     `0`     | Mundo (`y = screenHeight - 40`)                         |
| **4. Superfície Ondulada**     | `waterSurfaceSystem.ts`                          |  `1` a `3`  | Mundo (`y = 80`)                                        |
| **5. Raios de Luz (God Rays)** | `lightRaysSystem.ts` (`god_ray`)                 |     `6`     | Mundo (`x >= 20`, `y = 80`, ângulo `-26°`)              |
| **6. Ladrilhos do Paredão**    | `iceberg_wall_*` (`icebergWallRenderer.ts`)      |    `10`     | Mundo Fixo (`x = -1440..0`, `y = 0..screenHeight`)      |
| **7. Blocos de Banquisa**      | `ice_block` (`iceSurfaceRenderer.ts`)            |    `10`     | Mundo Fixo (`x = 260..5000`, `y = 60..100`)             |
| **8. Falésia Facetada**        | `iceberg_cliff_front` (`icebergWallRenderer.ts`) |    `14`     | Mundo Fixo (`x = 0`, vértices `-96..+140`)              |
| **9. Crista/Picos de Neve**    | `iceberg_cliff_snow` (`icebergWallRenderer.ts`)  |    `15`     | Mundo Fixo (`x = 0`, vértices `-120..+24`, `y = 0..36`) |
| **10. Entidade Jogador**       | Baleia Jubarte (`player.ts`)                     |    `20`     | Mundo Dinâmico (`x >= 64`)                              |

---

## 4. Instruções Passo a Passo Atomizadas (Guia de Execução)

Execute **um passo por vez**. Após cada passo, rode os comandos de verificação indicados antes de prosseguir.

---

### PASSO 1: Atualizar a Paleta e o Pre-Bake em `src/systems/ice/ice16BitTextures.ts`

1. Abra `src/systems/ice/ice16BitTextures.ts`.
2. Adicione as constantes cromáticas de facetamento em `ICE_16BIT_PALETTE` (`WATERLINE_FOAM_BRIGHT`, `SUBSURFACE_TURQUOISE`, `FACET_HIGHLIGHT_CYAN`, `FACET_MID_GLACIAL`, `FACET_DARK_COBALT`, `FISSURE_ABYSS_LINE`, `SEABED_TALUS_SILHOUETTE`), mantendo intactas todas as chaves originais (`SUBMERGED_BASE`, `GLACIAL_BODY_MAIN`, `GLACIAL_BODY_LIGHT`, `SNOW_CREST`, etc.).
3. Em `draw16BitIcebergWall`, mantenha os `drawRect` de estratos (`depthStrata`) e de colunas (`columnSpecs`), adicionando uma faixa turquesa subsuperficial logo em `submergedStartY` (`height = Math.max(6, Math.round(submergedTotalHeight * 0.08))`, cor `ICE_16BIT_PALETTE.SUBSURFACE_TURQUOISE`, `alpha: 0.88`) para reproduzir o brilho subaquático da superfície na imagem de referência.
4. Verifique que o arquivo `src/systems/ice/ice16BitTextures.ts` possui **menos de 300 linhas** (`wc -l src/systems/ice/ice16BitTextures.ts`).
5. **Validação do Passo 1:**
   ```bash
   npx tsc --noEmit && npx eslint src/systems/ice/ice16BitTextures.ts
   ```

---

### PASSO 2: Criar o Gerador Geométrico `src/systems/ice/glacierCliffGeometry.ts`

1. Crie o arquivo `src/systems/ice/glacierCliffGeometry.ts` (máximo de 220 linhas).
2. Exporte a interface `GlacierPolygonLayer`:
   ```ts
   import type { Vector2D } from "../../engine/contracts/INTERFACE_CONTRACTS";

   export interface GlacierPolygonLayer {
     readonly points: readonly Vector2D[];
     readonly color: [number, number, number];
     readonly alpha: number;
   }
   ```
3. Implemente e exporte `createSubmergedGlacierCliffLayers(screenHeight: number, seaLevelY: number, snowCrestHeight: number): readonly GlacierPolygonLayer[]`:
   - Calcule `const submergedHeight = Math.max(1, screenHeight - seaLevelY);`.
   - **Elemento `[0]` do array retornado (Obrigatório para contrato de teste):**
     Polígono de contorno batial/tálus com `x = -96` na esquerda (nunca `<= -180`) e **7 vértices com `x > 0`** na direita, alargando-se na base para formar a encosta submarina escura da imagem de referência:
     ```ts
     {
       points: [
         { x: -96, y: seaLevelY },
         { x: 26, y: seaLevelY + 2 },
         { x: 30, y: seaLevelY + Math.round(submergedHeight * 0.16) },
         { x: 22, y: seaLevelY + Math.round(submergedHeight * 0.34) },
         { x: 28, y: seaLevelY + Math.round(submergedHeight * 0.52) },
         { x: 46, y: seaLevelY + Math.round(submergedHeight * 0.72) },
         { x: 88, y: seaLevelY + Math.round(submergedHeight * 0.88) },
         { x: 136, y: screenHeight },
         { x: -96, y: screenHeight },
       ],
       color: [11, 33, 63],
       alpha: 0.98,
     }
     ```
   - **Elementos seguintes do array:**
     - **Contrafortes Abissais (`y = seaLevelY + 0.50 * submergedHeight` até `screenHeight`):** 2 polígonos angulares em `[15, 38, 62]` e `[22, 50, 92]` formando picos rochosos submersos na base (`x = -96..+110`).
     - **Blocos Prismáticos Facetados (`x = -96..+28`, `y = seaLevelY..seaLevelY + 0.78 * submergedHeight`):**
       Construa um laço determinístico sobre 3 colunas horizontais (`columnX = [-96, -54, -14]`, `columnWidth = [42, 40, 38]`) e 4 faixas verticais (`rowRatios = [0, 0.14, 0.32, 0.54, 0.78]`). Para cada célula:
       - Polígono de faceta principal (pentágono chanfrado) com cores graduadas por faixa vertical:
         - Faixa 0 (`0..0.14`): `[92, 225, 230]` (turquesa subsuperficial)
         - Faixa 1 (`0.14..0.32`): `[74, 134, 232]` (azul glacial claro)
         - Faixa 2 (`0.32..0.54`): `[45, 91, 185]` (azul cobalto médio)
         - Faixa 3 (`0.54..0.78`): `[22, 50, 92]` (azul abissal escuro)
       - Polígono triangular/trapezoidal de bisel iluminado no topo-esquerdo da célula (`alpha: 0.88`) com tom mais claro (`[162, 242, 248]`, `[109, 213, 250]`, `[74, 134, 232]`, `[45, 91, 185]`).
     - **Corpo Glacial Emerso (`y = snowCrestHeight..seaLevelY + 2`, `x = -96..+26`):** Polígonos facetados em `[162, 217, 206]`, `[208, 236, 231]` e sombra lateral `[95, 168, 232]`.
     - **Faixa de Espuma e Refração da Linha d'Água (`y = seaLevelY - 3..seaLevelY + 5`, `x = -96..+34`):** Polígono afilado em `[232, 251, 255]` (`alpha: 0.92`).
4. Implemente e exporte `createAlpineSnowCrestLayers(snowCrestHeight: number): readonly GlacierPolygonLayer[]`:
   - Garanta que **todos os vértices** de todas as camadas retornadas tenham `0 <= y <= snowCrestHeight` (onde `snowCrestHeight <= 28`), respeitando o limite `maxSnowY <= 36`.
   - Desenhe a silhueta alpina denteada com picos em `y = 0, 4, 2, 6` ao longo de `x = -96..+22` em branco puro `[255, 255, 255]` e chanfros sombreados inferiores em `[224, 242, 241]` e `[168, 220, 250]`.
5. **Validação do Passo 2:**
   ```bash
   npx tsc --noEmit && npx eslint src/systems/ice/glacierCliffGeometry.ts
   ```

---

### PASSO 3: Refatorar `src/systems/ice/icebergWallRenderer.ts` para Consumir a Nova Geometria

1. Abra `src/systems/ice/icebergWallRenderer.ts`.
2. Importe `createSubmergedGlacierCliffLayers` e `createAlpineSnowCrestLayers` de `./glacierCliffGeometry`.
3. Mantenha intactas as assinaturas e exportações públicas:
   - `ANTARCTIC_WALL_MIN_WORLD_X = 64`
   - `attachWallToWorldContainer(worldContainer, wallNode, worldPositionX, worldPositionY, zIndex)`
   - `updateWorldBoundaryConstraint(playerController, minimumWorldPositionX)`
   - `renderBoundedAntarcticGlacier(engine, icebergWallTexture)`
   - `renderAntarcticGlacierWall = renderBoundedAntarcticGlacier`
   - `renderIcebergWall = renderBoundedAntarcticGlacier`
4. Dentro de `renderBoundedAntarcticGlacier`:
   - Renderize os ladrilhos `wallSprite` (`x = -1440..0`, `zIndex = 10`) ou o fallback `wallGraphics` anexando-os via `attachWallToWorldContainer`.
   - Para `cliffFrontGraphics` (`engine.createGraphics("iceberg_cliff_front")`):
     Iterar sobre `createSubmergedGlacierCliffLayers(screenHeight, seaLevelY, snowCrestHeight)` chamando `cliffFrontGraphics.drawPolygon(layer.points, { fill: { color: layer.color, alpha: layer.alpha } })` e anexar com `attachWallToWorldContainer(worldContainer, cliffFrontGraphics, 0, 0, 14)`.
   - Para `cliffSnowGraphics` (`engine.createGraphics("iceberg_cliff_snow")`):
     Iterar sobre `createAlpineSnowCrestLayers(snowCrestHeight)` chamando `cliffSnowGraphics.drawPolygon(layer.points, { fill: { color: layer.color, alpha: layer.alpha } })` e anexar com `attachWallToWorldContainer(worldContainer, cliffSnowGraphics, 0, 0, 15)`.
   - Mantenha o registro de `"iceberg_wall_static"` no `getSpatialGrid()`.
5. Verifique que `src/systems/ice/icebergWallRenderer.ts` possui **menos de 300 linhas**.
6. **Validação do Passo 3:**
   ```bash
   npx tsc --noEmit && npx eslint src/systems/ice/icebergWallRenderer.ts
   ```

---

### PASSO 4: Ajustar os Feixes de Luz Diagonais na Antártica (`src/systems/lightRaysSystem.ts`)

1. Abra `src/systems/lightRaysSystem.ts`.
2. Na inicialização dos `godRays` no modo nativo (`resolvedRenderEngine`):
   - Altere `zIndex` de `-2` para `6` (`graphicsNode.setZIndex(6)`), garantindo que os feixes volumétricos fiquem acima do fundo marinho (`zIndex = 0`) e abaixo do paredão glacial (`zIndex = 10..15`) e do jogador (`zIndex = 20`).
3. No loop de atualização (`getTicker().add(...)`), impeça que feixes de luz sejam posicionados dentro da massa sólida de gelo à esquerda de `x = 16`:
   - Quando `currentRayX < 16`, desloque a coordenada X do feixe para a direita do paredão (`const boundedRayX = currentRayX < 16 ? currentRayX + wrapSpan : currentRayX;`) e passe `boundedRayX` para `node.setPosition(boundedRayX, GAME_CONFIG.SEA_LEVEL)`.
4. **Validação do Passo 4:**
   ```bash
   npx tsc --noEmit && npx eslint src/systems/lightRaysSystem.ts
   ```

---

### PASSO 5: Atualizar Testes Unitários e Executar Validação Global Obrigatória

1. Abra `tests/systems/phase68_ice_and_sanctuary_16bit.test.ts`.
2. Adicione asserções verificando:
   - Que `createSubmergedGlacierLayers` / `renderBoundedAntarcticGlacier` desenha os prismas facetados (`cliffCalls.length >= 10`) com `cliffGraphic.setPosition(0, 0)` e `cliffGraphic.setZIndex(14)`.
   - Que o polígono de base (`cliffCalls[0][0]`) possui vértices positivos (`x > 0`) formando a falésia e o tálus submarino, sem vértices `x <= -180`.
   - Que `iceberg_cliff_snow` mantém todos os vértices no intervalo `0 <= y <= 36`.
3. Execute obrigatoriamente a bateria final de validação na raiz do projeto:
   ```bash
   wc -l src/systems/ice/*.ts src/systems/iceSurface.ts
   npx tsc --noEmit
   npx eslint src/
   npm test
   ```
4. **Critério de Aceite Final:**
   - Todos os arquivos em `src/systems/ice/` com menos de 300 linhas.
   - `npx tsc --noEmit` retorna código de saída `0` (0 erros).
   - `npx eslint src/` retorna `0 errors`.
   - `npm test` aprova 100% das suítes de teste.
