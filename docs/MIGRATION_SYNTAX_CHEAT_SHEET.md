# Tabela de Equivalência Sintática: Kaboom.js → PixiJS v8 Adapter

Este documento serve como a **referência canônica (Cheat-Sheet)** para todos os Agentes de Execução (Light / Fast Agents) durante a migração dos 109 arquivos do **Micro Splash** para a nova arquitetura baseada no **Adapter Pattern** e **PixiJS v8**.

---

## 1. Mapeamento Sintático Principal

| Operação Kaboom.js                   | Padrão Adapter (PixiJS v8 / Micro Splash) | Exemplo Antes (Kaboom)                                                                      | Exemplo Depois (Adapter Pattern)                                                                                                                                                                                      |
| :----------------------------------- | :---------------------------------------- | :------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Criação de Primitiva Retangular**  | `engine.createGraphics()` + `drawRect`    | `k.add([ k.rect(w, h), k.pos(x, y), k.color(r, g, b) ])`                                    | `const gfx = engine.createGraphics();`<br>`gfx.setPosition(x, y);`<br>`gfx.drawRect(0, 0, w, h, { fill: { color: [r, g, b] } });`<br>`parent.addChild(gfx);`                                                          |
| **Criação de Retângulo Arredondado** | `drawRoundedRect`                         | `k.add([ k.rect(w, h, { radius: 8 }), k.pos(x, y), k.color(...) ])`                         | `gfx.drawRoundedRect(0, 0, w, h, 8, { fill: { color: [...] } });`                                                                                                                                                     |
| **Criação de Círculo**               | `drawCircle`                              | `k.add([ k.circle(r), k.pos(x, y), k.color(...) ])`                                         | `gfx.drawCircle(x, y, r, { fill: { color: [...] } });`                                                                                                                                                                |
| **Renderização de Sprite**           | `engine.createSprite()`                   | `k.add([ k.sprite("whale"), k.pos(x, y), k.anchor("center") ])`                             | `const sprite = engine.createSprite("whale");`<br>`sprite.setPosition(x, y);`<br>`sprite.setAnchor(0.5, 0.5);`<br>`parent.addChild(sprite);`                                                                          |
| **Texto Estilizado com Sombra**      | `engine.createText()` com `shadow`        | `addShadowedText(k, "Score", k.vec2(x, y), { size: 24 })`<br>_(criava 2 objetos no Kaboom)_ | `const text = engine.createText("Score", {`<br>&nbsp;&nbsp;`fontSize: 24,`<br>&nbsp;&nbsp;`shadow: { color: 0x000000, offsetX: 2, offsetY: 2, blur: 4 }`<br>`});`<br>`text.setPosition(x, y); parent.addChild(text);` |
| **Loop de Atualização de Quadro**    | `engine.getTicker().add(cb)`              | `const cancel = k.onUpdate(() => update())`                                                 | `const cancel = engine.getTicker().add((deltaTime) => {`<br>&nbsp;&nbsp;`update(deltaTime);`<br>`});`                                                                                                                 |
| **Eventos de Clique / Toque**        | `node.getNativeNode<Container>()`         | `obj.onClick(() => handleClick())` ou `k.onClick(cb)`                                       | `const container = node.getNativeNode<Container>();`<br>`container.eventMode = "static";`<br>`container.cursor = "pointer";`<br>`container.on("pointertap", () => handleClick());`                                    |
| **Interpolação Numérica (Tween)**    | `createTween(...)`                        | `k.tween(from, to, dur, (v) => obj.opacity = v, k.easings.easeOutQuad)`                     | `createTween(from, to, dur, (v) => node.setOpacity(v), Easings.easeOutQuad, ticker);`                                                                                                                                 |
| **Destruição e Limpeza de Nó**       | `node.destroy()`                          | `k.destroy(obj)`                                                                            | `node.destroy(); // Remove do pai, limpa filhos e libera texturas/buffers`                                                                                                                                            |
| **Definição de Cena**                | `SceneManager.registerScene()`            | `k.scene("game", (data) => { ... })`                                                        | `sceneManager.registerScene({`<br>&nbsp;&nbsp;`name: "game",`<br>&nbsp;&nbsp;`enter: async (data) => { ... },`<br>&nbsp;&nbsp;`update: (dt) => { ... },`<br>&nbsp;&nbsp;`exit: async () => { ... }`<br>`});`          |
| **Troca de Cena**                    | `SceneManager.loadScene()`                | `k.go("game", { score: 100 })`                                                              | `await sceneManager.loadScene("game", { score: 100 }, { durationInSeconds: 0.25 });`                                                                                                                                  |
| **Dimensões do Viewport**            | `engine.getDimensions()`                  | `k.width()`, `k.height()`                                                                   | `const { width, height } = engine.getDimensions();`                                                                                                                                                                   |
| **Vetores 2D**                       | Objeto literal `Vector2D`                 | `k.vec2(x, y)`                                                                              | `{ x, y }` _(zero overhead de instância)_                                                                                                                                                                             |
| **Cores**                            | `ColorRepresentation`                     | `k.rgb(255, 128, 0)`                                                                        | `[255, 128, 0]` ou `"#ff8000"` ou `0xff8000`                                                                                                                                                                          |

---

## 2. Padrões Arquiteturais & Regras de Ouro

### Regra 1: Zero Imports de Engine Externa nos Módulos de Gameplay

- **PROIBIDO**: `import ... from "kaboom"` ou `import ... from "pixi.js"` dentro de entidades, sistemas e telas.
- **PERMITIDO**: Consumir exclusivamente `IRenderEngine`, `IRenderNode`, `ISpriteNode`, `IGraphicsNode`, `ITextNode` e `Vector2D` de `@/engine/contracts/INTERFACE_CONTRACTS`.

### Regra 2: UI Acessível (ADR 002)

- Menus complexos, modais (`modalShell.ts`), formulários e painéis de opções devem preferencialmente usar **DOM/HTML Overlay** estilizado semanticamente (CSS puro/Glassmorphism).
- O Canvas do PixiJS deve ser reservado prioritariamente para:
  1. Mundo do jogo (baleia, correntes, cânion, lixo, fauna, partículas).
  2. Elementos de HUD de alta taxa de atualização (bússola, oxigênio, placar ao vivo, minimapa).

### Regra 3: Desacoplamento da Física (ADR 003)

- O loop de física do `playerPhysics.ts` e de detecção espacial `spatialHashGrid.ts` opera de forma estritamente desacoplada do ticker gráfico.
- O ticker de renderização injeta o `deltaTime` normalizado com teto de segurança (`MAX_DELTA_TIME = 0.1s`), garantindo que picos de frametime ou perda de foco da aba não quebrem a colisão do jogo ("tunneling").

### Regra 4: Limpeza e Ciclo de Vida do DOM (Docker / Vite HMR)

- Toda cena que monta nós no `stageRoot` deve garantir a desmontagem e limpeza (`node.destroy()`) em seu método `exit()`.
- Nunca deixe handlers globais de `window.addEventListener` sem o correspondente `removeEventListener` no encerramento da cena ou destruição do nó.

---

## 3. Exemplos Práticos de Conversão

### Exemplo A: Criação de Entidade de Partícula Procedural

#### Antes (Kaboom)

```typescript
const particle = k.add([
  k.circle(3),
  k.pos(spawnX, spawnY),
  k.color(180, 220, 255),
  k.opacity(0.8),
  k.z(10),
]);
```

#### Depois (Adapter Pattern)

```typescript
const particle = engine.createGraphics();
particle.drawCircle(0, 0, 3, {
  fill: { color: [180, 220, 255], alpha: 0.8 },
});
particle.setPosition(spawnX, spawnY);
particle.setZIndex(10);
stageRoot.addChild(particle);
```

---

### Exemplo B: HUD de Oxigênio com Animação Fluida

#### Antes (Kaboom)

```typescript
const textObj = addShadowedText(k, `O2: ${oxygen}%`, k.vec2(20, 20), { size: 18 });
k.tween(
  textObj.textSize,
  22,
  0.2,
  (size) => {
    textObj.textSize = size;
  },
  k.easings.easeOutQuad
);
```

#### Depois (Adapter Pattern)

```typescript
const hudText = engine.createText(`O2: ${oxygen}%`, {
  fontSize: 18,
  fontFamily: "Outfit, sans-serif",
  color: 0x5ce1e6,
  shadow: { color: 0x03101e, offsetX: 1, offsetY: 2, blur: 3 },
});
hudText.setPosition(20, 20);
stageRoot.addChild(hudText);

createTween(
  18,
  22,
  0.2,
  (size) => {
    hudText.setFontSize(size);
  },
  Easings.easeOutQuad,
  engine.getTicker()
);
```
