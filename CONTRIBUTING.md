# Guia de Contribuição — Micro Splash 🐋🌊

Seja bem-vindo(a) ao projeto **Micro Splash**! Este é um jogo educativo de código aberto voltado para a conscientização ecológica sobre a migração das baleias-jubarte e a preservação dos oceanos.

Ficamos muito felizes com o seu interesse em contribuir! Seja você um(a) desenvolvedor(a), biólogo(a), oceanógrafo(a), professor(a) ou estudante, suas contribuições são muito bem-vindas.

---

## 📋 Sumário

1. [Código de Conduta](#-código-de-conduta)
2. [Como Contribuir com Conteúdo Educacional (Sem Programar)](#-como-contribuir-com-conteúdo-educacional-sem-programar)
3. [Configurando o Ambiente de Desenvolvimento](#-configurando-o-ambiente-de-desenvolvimento)
4. [Scripts Disponíveis](#-scripts-disponíveis)
5. [Padrão de Commits (Conventional Commits)](#-padrão-de-commits-conventional-commits)
6. [Fluxo de Trabalho e Pull Requests](#-fluxo-de-trabalho-e-pull-requests)
7. [Diretrizes de Qualidade de Código](#-diretrizes-de-qualidade-de-código)

---

## 🤝 Código de Conduta

Esperamos que todas as pessoas participantes mantenham um ambiente acolhedor, respeitoso e inclusivo, livre de discriminação e assédio. A colaboração deve ser construtiva e focada na educação ambiental e na qualidade do projeto.

---

## 📚 Como Contribuir com Conteúdo Educacional (Sem Programar)

Você não precisa saber TypeScript para contribuir com o projeto! Educadores, oceanógrafos e biólogos marinhos podem sugerir ou corrigir fatos ecológicos e perguntas do Quiz editando diretamente os arquivos JSON na pasta `data/`:

### 1. Adicionar ou Editar Fatos Ecológicos (`data/facts.json`)

Os fatos ecológicos surgem na tela durante a navegação e são arquivados no Diário de Bordo (Codex).

Exemplo de entrada:

```json
{
  "id": "fato-novo-01",
  "text": "As baleias-jubarte utilizam a ecolocalização e cantos complexos que podem se propagar por centenas de quilômetros no oceano profundo.",
  "biome": "pelagic",
  "category": "comportamento",
  "source": "Instituto Baleia Jubarte"
}
```

- **`biome`** válidos: `"polar"`, `"pelagic"`, `"coastal"`, `"sanctuary"`.
- **`category`** válidas: `"comportamento"`, `"conservacao"`, `"anatomia"`, `"ecologia"`.

### 2. Adicionar ou Editar Perguntas do Quiz (`data/quiz.json`)

As perguntas do Quiz são exibidas de forma opcional ao final da partida ou pelo Diário de Bordo.

Exemplo de entrada:

```json
{
  "id": "quiz-novo-01",
  "question": "Qual é a principal fonte de alimento da baleia-jubarte nas águas da Antártica?",
  "options": [
    "Krill antártico (pequenos crustáceos)",
    "Peixes de grande porte como atuns",
    "Águas-vivas e caravelas",
    "Algas marinhas superficiais"
  ],
  "correctIndex": 0,
  "explanation": "O krill antártico (Euphausia superba) é a base alimentar das jubartes no verão polar, acumulando gordura para o longo jejum migratório.",
  "biome": "polar",
  "difficulty": "facil"
}
```

- **`options`**: Sempre exatamente 4 opções de resposta.
- **`correctIndex`**: Índice da resposta correta (0, 1, 2 ou 3).
- **`difficulty`**: `"facil"`, `"medio"` ou `"dificil"`.

> [!TIP]
> Após editar qualquer arquivo JSON, execute `npm run validate:data` para verificar se os schemas continuam 100% em conformidade com o Zod!

Para mais detalhes sobre as regras dos dados, consulte [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md).

---

## 💻 Configurando o Ambiente de Desenvolvimento

### Pré-requisitos

- **Node.js** v20.0.0 ou superior ([download](https://nodejs.org/))
- **npm** v9.0.0 ou superior (instalado junto com o Node)
- **Git** instalado
- _(Opcional)_ **Docker** e **Docker Compose**

### Instalação Rápida com Node.js

```bash
# 1. Clone o repositório
git clone https://github.com/FeCruz0/micro-splash.git
cd micro-splash

# 2. Instale as dependências
npm ci

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

O jogo estará acessível em `http://localhost:5173`.

### Instalação via Docker

```bash
# Ambiente de desenvolvimento local com hot reload
docker compose up

# Ou subir o container otimizado de produção (modo totem/kiosk)
docker compose -f docker-compose.prod.yml up -d
```

---

## 🛠️ Scripts Disponíveis

| Comando                 | Descrição                                                                         |
| :---------------------- | :-------------------------------------------------------------------------------- |
| `npm run dev`           | Inicia o servidor de desenvolvimento Vite com Hot Module Replacement (HMR).       |
| `npm run build`         | Valida TypeScript (`tsc`) e gera o bundle de produção em `dist/`.                 |
| `npm run preview`       | Executa localmente o servidor de visualização da pasta `dist/`.                   |
| `npm test`              | Executa todos os testes unitários via Vitest.                                     |
| `npm run coverage`      | Gera relatório de cobertura de código em terminal e HTML (`coverage/index.html`). |
| `npm run lint`          | Executa a verificação estática de código com ESLint 9 Flat Config.                |
| `npm run lint:fix`      | Corrige automaticamente problemas detectados pelo ESLint.                         |
| `npm run format`        | Formata todo o código e documentação usando o Prettier.                           |
| `npm run format:check`  | Verifica se os arquivos estão formatados de acordo com o Prettier.                |
| `npm run validate:data` | Valida a integridade de `facts.json`, `quiz.json` e `level_layout.json` com Zod.  |
| `npm run generate`      | Regenera todos os sprites procedurais e ícones do PWA.                            |

---

## 📝 Padrão de Commits (Conventional Commits)

Seguimos a especificação [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/):

```
<tipo>(<escopo opcional>): <descrição no imperativo e em minúsculas>
```

### Tipos Aceitos:

- **`feat:`** Nova funcionalidade para o usuário ou jogo.
- **`fix:`** Correção de bug ou falha.
- **`docs:`** Alterações exclusivamente na documentação.
- **`test:`** Adição ou correção de testes automatizados.
- **`refactor:`** Refatoração de código sem alteração no comportamento externo.
- **`style:`** Formatação, ponto e vírgula, espaços (sem alteração de lógica).
- **`chore:`** Atualizações de dependências, configs de build, CI, etc.

**Exemplos:**

```bash
git commit -m "feat(audio): adicionar modo de trilha ambiente contemplativa"
git commit -m "fix(physics): corrigir desaceleração residual ao sair da rede fantasma"
git commit -m "docs(schema): documentar regras de bioma do quiz.json"
```

---

## 🚀 Fluxo de Trabalho e Pull Requests

1. Crie uma branch a partir de `develop`:
   ```bash
   git checkout -b feat/minha-melhoria
   ```
2. Realize suas alterações respeitando a formatação e boas práticas.
3. Antes de submeter, execute as validações locais:
   ```bash
   npm run format
   npm run lint
   npm run validate:data
   npm test
   npm run build
   ```
4. Faça commit seguindo o padrão Conventional Commits.
5. Envie a branch para o seu fork e abra um **Pull Request (PR)** apontando para a branch `develop`.
6. Aguarde a validação automatizada do pipeline de CI no GitHub Actions.

---

## 🎯 Diretrizes de Qualidade de Código

- **TypeScript Estrito:** Evite o uso de `any`. Declare interfaces e tipos explícitos para entidades e sistemas.
- **Design System do Jogo:** Mantenha a consistência visual em 16-bit com as paletas já estabelecidas em `src/config.ts`.
- **Acessibilidade:** Certifique-se de que novos modais e botões respeitem a navegação por teclado (`Tab`, `Setas`, `Enter`) e considerem o modo de movimento reduzido (`prefers-reduced-motion`).
- **Offline-First:** O jogo deve funcionar 100% offline em totens e feiras escolares. Não inclua chamadas obrigatórias a APIs externas durante a gameplay.

Agradecemos imensamente por dedicar seu tempo e talento à conservação marinha através do Micro Splash! 🐋💙
