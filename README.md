# Micro Splash 🐋🌊

Um jogo 2D de navegação subaquática, física hidrodinâmica e conscientização ambiental desenvolvido em **TypeScript** com **Kaboom.js**, síntese procedural de áudio **Web Audio API** e **Vite**.

Este projeto foi concebido para uma **Feira de Ciências**, abordando como tema central a **consciência ecológica**, os impactos da poluição marinha e a fantástica rota migratória das **baleias-jubarte (*Megaptera novaeangliae*)** desde as águas polares da Antártica até o berçário de reprodução em **Arraial do Cabo, RJ**.

---

## 🌟 Principais Recursos

- 🐋 **Identidade Real da Jubarte:** Spritesheet anatômico exclusivo de 4 quadros (nado planado, batidas de cauda ascendente/descendente e abertura de mandíbula com cerdas filtradoras ao comer krill).
- 💨 **Esguicho do Espiráculo (*Blowhole Spout*):** Erupção vertical dupla em "V" de vapor e água ao quebrar a superfície para renovar o oxigênio.
- 📡 **Biosonar 360° Omnidirecional:** Onda acústica em tela inteira (`Shift`, `E` ou `X`) que revela lixos plásticos e redes de pesca camufladas nas profundezas escuras, com retorno sonoro de eco e destaque fluorescente.
- 🧭 **3 Modos de Jogo Adaptados:**
  - **Migração Normal:** A jornada clássica de 27.000m com gerenciamento de oxigênio, perigos e Eco-Score.
  - **Migração Serena:** Modo de acessibilidade com fôlego infinito (`∞`) e sem desmaios, ideal para crianças e exploração relaxante.
  - **Migração Rápida (60s):** Desafio dinâmico de 1 minuto para alta rotatividade na feira de ciências, com seletor de bioma e painel de estatísticas da rodada.
- 📖 **Diário de Bordo da Expedição (Codex):** Enciclopédia interativa no menu com fichas biológicas das espécies, fatos ecológicos desbloqueados na rota e informações de conservação do *Instituto Baleia Jubarte* e UNESCO.
- 🎵 **Sonoplastia 16-Bit Retrô em Tempo Real:**
  - Trilha adaptativa inspirada em *Donkey Kong Country: Aquatic Ambiance* (David Wise) a 75 BPM em Dó Menor com baixo *wavetable* aveludado e arpejos híbridos de harpa e coral.
  - Canto da baleia estruturado em **3 canais de síntese** (Assobio LFO, Gemido Cello gutural e Percussão zíper) com barramento de eco passa-baixa estilo SNES, acionado **exclusivamente via sonar**.

---

## 🎮 Controles

| Tecla / Comando | Ação |
| :--- | :--- |
| `Espaço` | **Batida de Cauda (Impulso):** Segurar gera aceleração senoidal (pico em 0.3s). Soltar e retomar no ritmo ideal mantém velocidade alta. Também usado para romper redes de pesca. |
| `Setas` ou `W, A, S, D` | **Direcionar Nado & Virada:** Inclina a baleia para cima/baixo (até 45°) e inverte a direção horizontal com câmera elástica (*lerp*). |
| `Shift`, `E` ou `X` | **Biosonar Omnidirecional:** Dispara pulso acústico de 360° para revelar perigos camuflados e acionar a vocalização da jubarte. |
| `Esc` | **Fechar Telas / Modais:** Fecha o Diário de Bordo, Seletor de Modo e Menu de Opções. |

---

## 🗺️ A Rota dos 27.000 Metros

1. **Oceano Antártico (0m – 5.000m):** Águas gélidas com teto de gelo, fendas para respirar oxigênio, cardumes fartos de Krill e orcas ao fundo.
2. **Travessia Oceânica (5.000m – 12.000m):** Mar aberto profundo, jejum total de krill e passagem de outras jubartes cantantes.
3. **Costa Urbana (12.000m – 19.000m):** Tráfego de cargueiros industriais, poluição sonora, redes fantasmas, lixo plástico e patrulha da Guarda Marítima.
4. **Cânions de Ressurgência (19.000m – 25.000m):** Jatos de água profunda rica em nutrientes e navegação precisa pelas gargantas rochosas do Boqueirão.
5. **Santuário de Arraial do Cabo (25.000m – 27.000m):** Águas cristalinas e calmas, encontro do berçário (mãe e filhote) e o evento do Salto Majestoso (*Breach*) na linha de chegada.

---

## 🛠️ Stack Tecnológica

- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Engine 2D:** [Kaboom.js](https://kaboomjs.com/)
- **Áudio:** Web Audio API nativa (síntese procedural em tempo real sem assets pesados)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Containerização:** [Docker](https://www.docker.com/) & Docker Compose

---

## 🚀 Como Executar

### Opção 1: Via Docker (Recomendado)

```bash
# Iniciar o ambiente via Docker Compose
docker compose up
```

Acesse em seu navegador: **`http://localhost:5173`**

---

### Opção 2: Node.js Local

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse em seu navegador: **`http://localhost:5173`**

---

## 📚 Documentação Complementar

- 🏗️ [Arquitetura do Sistema (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md): Detalhamento técnico dos módulos, ciclo de cenas, física e motor de áudio.
- 🐋 [Game Design Document (`docs/GDD.md`)](docs/GDD.md): Visão geral de mecânicas, regras de pontuação e filosofia de imersão.
- 🌊 [Fundamentação Científica (`docs/OCEAN_FACTS.md`)](docs/OCEAN_FACTS.md): Artigos acadêmicos revisados por pares que fundamentam o jogo.
- 🗺️ [Roadmap de Desenvolvimento (`docs/ROADMAP.md`)](docs/ROADMAP.md): Acompanhamento das fases implementadas e novos passos de produção.