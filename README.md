# Micro Splash 🐋🌊

[![CI](https://github.com/FeCruz0/micro-splash/actions/workflows/ci.yml/badge.svg)](https://github.com/FeCruz0/micro-splash/actions/workflows/ci.yml)
[![Deploy Pages](https://github.com/FeCruz0/micro-splash/actions/workflows/deploy.yml/badge.svg)](https://github.com/FeCruz0/micro-splash/actions/workflows/deploy.yml)
[![Version](https://img.shields.io/badge/version-1.13.0-blue.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-orange.svg)](public/manifest.json)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-purple.svg)](docs/ROADMAP.md)

Um jogo 2D arcade de navegação subaquática, física hidrodinâmica, bioacústica marinha e conscientização ambiental desenvolvido em **TypeScript** com **Kaboom.js**, síntese procedural com **Web Audio API** e empacotamento ultraleve com **Vite**.

Este projeto foi concebido com foco em **educação e consciência ecológica**, abordando os graves impactos da poluição marinha e a fantástica rota migratória das **baleias-jubarte (_Megaptera novaeangliae_)** desde as águas polares da Antártica até o berçário de reprodução em **Arraial do Cabo, RJ**.

---

## 🌟 Principais Recursos

- 🐋 **Identidade Real da Jubarte:** Spritesheet anatômico com cinemática de 8 quadros em resolução nativa (nado planado, batidas de cauda ascendente/descendente e abertura de mandíbula com cerdas filtradoras ao se alimentar de krill).
- 💨 **Esguicho do Espiráculo (_Blowhole Spout_):** Erupção vertical dupla em "V" de vapor e água ao quebrar a superfície marinha para renovar o oxigênio.
- 📡 **Biosonar 360° Omnidirecional:** Pulso acústico de ecolocalização (`Shift`, `E` ou `X`) que revela lixos plásticos e redes de pesca fantasmas camufladas nas profundezas escuras, com retorno sonoro de eco e destaque fluorescente.
- 🧭 **Modos de Jogo Adaptados:**
  - **Migração Normal:** A jornada clássica de 30.000m com gerenciamento de oxigênio, perigos e Eco-Score.
  - **Migração Serena:** Modo acessível com fôlego infinito (`∞`) e sem desmaios, ideal para crianças menores e exploração relaxante.
  - **Desafio Semanal:** Semente determinística semanal gerando percurso idêntico com ranking comunitário e Certificado Oficial com selo digital.
- 📖 **Diário de Bordo da Expedição (Codex):** Enciclopédia interativa no menu com fichas biológicas das espécies, fatos ecológicos desbloqueados na rota e informações de conservação do _Instituto Baleia Jubarte_ e UNESCO.
- 🎵 **Sonoplastia 16-Bit Retrô, Espacialização & Masterização em Tempo Real:**
  - Trilha adaptativa inspirada em _Donkey Kong Country: Aquatic Ambiance_ (David Wise) com baixo _wavetable_ aveludado e arpejos híbridos de harpa e coral.
  - Jukebox com modos comutáveis: _Chiptune Dinâmica_, _Ambiente Contemplativo_ (somente hidrofones e cantos) e _Modo Foco_ (apenas SFX) com crossfade suave.
  - Canto da baleia estruturado em **3 canais de síntese** (Assobio LFO, Gemido Cello gutural e Percussão zíper) com barramento de eco passa-baixa estilo SNES acionado pelo biosonar.
  - Masterização profissional com limiter dinâmico anti-clipping, transições de ganho sem estalos e espacialização estéreo 2D por posição relativa (`StereoPannerNode`).
  - Acústica subaquática imersiva: reverb convolutivo marinho e filtro dinâmico de abafamento por profundidade (8.000Hz na superfície a 1.200Hz nas fossas abissais).
- 🌐 **Totens Interativos & PWA Offline-First:**
  - Suporte completo a Progressive Web App para totens escolares e museus sem necessidade de conexão com a internet.
  - Container Docker de produção multi-stage (`Dockerfile.prod`) com apenas **21.2 MB** e Nginx embutido.

---

## 🎮 Controles Universais

| Ação                                  | Teclado                  | Touch Screen (Celular/Tablet) | Gamepad / Joystick (W3C)   |
| :------------------------------------ | :----------------------- | :---------------------------- | :------------------------- |
| **Batida de Cauda (Impulso)**         | `Espaço`                 | Botão Flutuante de Nado       | Botão `A` / Sul            |
| **Direcionar / Inclinar Nado**        | `Setas` ou `W, A, S, D`  | D-Pad / Joystick Virtual      | Analógico Esquerdo / D-Pad |
| **Biosonar 360°**                     | `Shift`, `E` ou `X`      | Botão Flutuante de Sonar      | Botão `B` / Leste ou `X`   |
| **Pausa / Apresentação**              | `P` ou `F1`              | Toque duplo na tela           | Botão `Start` / Menu       |
| **Navegar em Menus (Acessibilidade)** | `Tab`, `Setas` + `Enter` | Toque direto nos botões       | D-Pad + Botão `A`          |
| **Fechar Janelas / Voltar**           | `Esc`                    | Botão `✕`                     | Botão `B` / Voltar         |

---

## ♿ Acessibilidade Universal & Inclusão (WCAG 2.1 AA)

O _Micro Splash_ prioriza a acessibilidade desde a sua concepção:

- 👁️ **Filtros de Daltonismo & Alto Contraste:** Modos para **Protanopia**, **Deuteranopia** e **Alto Contraste** com matrizes de cor validadas e contornos reforçados para redes e lixos.
- 🧘 **Suporte a Movimento Reduzido (`prefers-reduced-motion`):** Detecção automática da preferência do sistema operacional e alternador manual nas Opções, desativando tremores de tela (_screen shake_) e flashes intensos.
- 🔤 **Tamanho de Fonte Configurável:** Ajuste de textos de interface em três tamanhos (`Pequeno 0.85x`, `Normal 1.0x`, `Grande 1.2x`).
- 🗣️ **Narração em Voz (TTS):** Narração opcional de fatos ecológicos via Web Speech API em português para estudantes em fase de alfabetização ou baixa visão.
- ⌨️ **Navegação por Teclado Completa:** Todos os menus contam com anel de foco visual de alto contraste e navegação intuitiva por `Tab`/`Setas` e `Enter`.

---

## 🗺️ A Rota dos 30.000 Metros

1. **Oceano Antártico (0m – 5.000m):** Águas gélidas com teto de gelo quebrável, fendas para respirar oxigênio, cardumes fartos de Krill e orcas ao fundo.
2. **Travessia Pelágica (5.000m – 12.000m):** Mar aberto profundo, jejum total de krill, nado cooperativo com golfinhos e passagem de outras jubartes cantantes.
3. **Costa Urbana (12.000m – 19.000m):** Tráfego de cargueiros industriais, poluição sonora, esteira de bioluminescência noturna, redes fantasmas e lixo plástico.
4. **Cânions de Ressurgência (19.000m – 25.000m):** Jatos de água profunda rica em nutrientes e navegação técnica pelas gargantas rochosas do Boqueirão.
5. **Santuário de Arraial do Cabo (25.000m – 30.000m):** Águas cristalinas e calmas, encontro do berçário (mãe e filhote) e o espetáculo do Salto Majestoso (_Breach_) na chegada.

---

## 🛠️ Stack Tecnológica

- **Linguagem:** [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
- **Engine 2D:** [Kaboom.js](https://kaboomjs.com/)
- **Áudio:** Web Audio API nativa com síntese procedural, limiter dinâmico, espacialização estéreo 2D e acústica convolutiva
- **Validação de Schemas:** [Zod](https://zod.dev/) para integridade estrita de dados
- **Build Tool & Dev Server:** [Vite 6](https://vitejs.dev/)
- **Testes Unitários:** [Vitest](https://vitest.dev/) (48 suítes e 327 testes automatizados) com `@vitest/coverage-v8`
- **Linters & Formatadores:** ESLint 9 Flat Config + Prettier
- **Containerização:** Docker Multi-stage + Nginx Alpine (imagem de apenas ~21.2 MB)

---

## 🚀 Como Executar

### Opção 1: Node.js Local

```bash
# 1. Instalar dependências
npm ci

# 2. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse em seu navegador: **`http://localhost:5173`**

---

### Opção 2: Docker Compose para Totens e Museus

```bash
# Iniciar a imagem de produção ultraleve com auto-recuperação pós-queda de energia
docker compose -f docker-compose.prod.yml up -d
```

Acesse em: **`http://localhost:8080`**

Para desenvolvimento com Docker:

```bash
docker compose up
```

---

## 📚 Documentação do Projeto

- 🤝 [Guia de Contribuição (`CONTRIBUTING.md`)](CONTRIBUTING.md): Como colaborar, convenção de commits e como adicionar dados sem programar.
- 📊 [Especificação dos Dados (`docs/DATA_SCHEMA.md`)](docs/DATA_SCHEMA.md): Estrutura Zod de `facts.json`, `quiz.json` e `level_layout.json`.
- 🛡️ [Privacidade & LGPD (`docs/PRIVACIDADE.md`)](docs/PRIVACIDADE.md): Política de dados escolares 100% offline-first sem cookies de rastreamento.
- 🏗️ [Arquitetura do Sistema (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md): Detalhamento técnico dos subsistemas de física e áudio.
- 🐋 [Game Design Document (`docs/GDD.md`)](docs/GDD.md): Filosofia de design, regras de pontuação e progressão.
- 🌊 [Fundamentação Científica (`docs/OCEAN_FACTS.md`)](docs/OCEAN_FACTS.md): Artigos acadêmicos e referências do Instituto Baleia Jubarte.
- 🗺️ [Roadmap de Desenvolvimento (`docs/ROADMAP.md`)](docs/ROADMAP.md): Acompanhamento de todas as fases de produção.

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
