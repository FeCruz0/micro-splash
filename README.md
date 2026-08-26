# Micro Splash 🐋🌊

Um jogo 2D de navegação subaquática e conscientização ambiental desenvolvido em TypeScript com **Kaboom.js** e **Vite**.

Este projeto está sendo desenvolvido para uma **Feira de Ciências**, abordando como tema central a **consciência ambiental** e a rota de **migração das baleias-jubarte** na Região dos Lagos, com foco especial nos pontos turísticos de **Arraial do Cabo, RJ**.

---

## 🛠️ Stack Tecnológica

- **Linguagem:** TypeScript
- **Engine 2D:** Kaboom.js
- **Build Tool:** Vite
- **Containerização:** Docker / Docker Compose

---

## 🎮 Controles e Jogabilidade

A mecânica de nado simula a hidrodinâmica e inércia do nado de uma baleia na água:

- `Espaço`: **Batida de Cauda (Impulso)**
  - Segurar o botão gera uma aceleração baseada em uma curva senoidal (começa suave, atinge a força máxima em 0.3s e decai a zero se continuar segurado).
  - Soltar e pressionar no ritmo correto (timing) acumula impulso e velocidade.
- `Seta Esquerda` / `Seta Direita`: **Virar a Baleia**
  - Rotaciona horizontalmente a baleia. A câmera desliza suavemente (`lerp`) à frente para dar visibilidade do caminho.
- `Seta Para Cima` / `Seta Para Baixo`: **Direcionar Nado**
  - Altera o ângulo da baleia para nadar para cima ou para baixo (máximo de 45°).

---

## 🧭 Roteiro Ecológico (Arraial do Cabo)

O percurso do jogo simula a passagem da baleia por pontos icônicos da costa:
1. **Fenda de Nossa Senhora** (desafio de precisão em caminhos estreitos).
2. **Gruta Azul** (zona escura exigindo ecolocalização).
3. **Ilha do Farol / Pontal do Atalaia** (áreas de saltos majestosos fora d'água).

---

## 🚀 Como Executar

### Opção 1: Sem Docker (Node.js local)

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse em: `http://localhost:5173`

---

### Opção 2: Com Docker

```bash
# Iniciar o ambiente via Docker Compose
docker compose up
```

Acesse em: `http://localhost:5173`

---

