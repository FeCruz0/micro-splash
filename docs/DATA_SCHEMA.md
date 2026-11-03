# Especificação de Schemas de Dados — Micro Splash 📊🐋

Este documento detalha os schemas dos arquivos de dados educacionais e de fase localizados na pasta `data/`. Todos os arquivos são estritamente tipados e validados em tempo de compilação e execução por meio de **Zod** (`src/schemas/dataSchemas.ts`) e do script `npm run validate:data`.

---

## 📋 Sumário

1. [Visão Geral & Ferramenta de Validação](#1-visão-geral--ferramenta-de-validação)
2. [Fatos Ecológicos (`data/facts.json`)](#2-fatos-ecológicos-datafactsjson)
3. [Perguntas do Quiz Pedagógico (`data/quiz.json`)](#3-perguntas-do-quiz-pedagógico-dataquizjson)
4. [Layout de Obstáculos & Fase (`data/level_layout.json`)](#4-layout-de-obstáculos--fase-datalevel_layoutjson)
5. [Como Contribuir com Novos Dados](#5-como-contribuir-com-novos-dados)

---

## 1. Visão Geral & Ferramenta de Validação

Os dados do _Micro Splash_ são armazenados em JSON puro para que biólogos, pesquisadores e educadores possam colaborar sem necessidade de alterar o código TypeScript.

Para garantir que nenhuma alteração quebre o jogo em tempo de execução, utilizamos schemas estritos definidos com a biblioteca **Zod**. Você pode validar todos os arquivos a qualquer momento com:

```bash
npm run validate:data
```

Este comando verifica a estrutura, tipos, faixas numéricas e restrições de cada arquivo, exibindo logs detalhados e amigáveis em caso de divergência.

---

## 2. Fatos Ecológicos (`data/facts.json`)

Armazena os fatos informativos que surgem como popups educativos quando a jubarte alcança certas distâncias na rota migratória e que alimentam o **Diário de Bordo (Codex)**.

### Definição do Schema (`FactSchema`)

| Campo         | Tipo     | Restrições               | Descrição                                                            |
| :------------ | :------- | :----------------------- | :------------------------------------------------------------------- |
| `id`          | `string` | Min: 1 caractere, único  | Identificador alfanumérico do fato (ex: `"fato-01"`).                |
| `title`       | `string` | Min: 1 caractere         | Título de destaque exibido no cabeçalho do popup.                    |
| `location`    | `string` | Min: 1 caractere         | Nome do marco geográfico ou bioma (ex: `"Antártica (0m – 5.000m)"`). |
| `triggerX`    | `number` | `0 <= triggerX <= 30000` | Distância em metros na rota onde o fato é disparado.                 |
| `description` | `string` | Min: 10 caracteres       | Texto explicativo com rigor científico e linguagem didática.         |

### Exemplo Válido

```json
{
  "id": "fato-01",
  "title": "A Grande Migração",
  "location": "Antártica (0m – 5.000m)",
  "triggerX": 1500,
  "description": "As baleias-jubarte viajam mais de 8.000 km todos os anos, das águas frias de alimentação na Antártica até as águas quentes e rasas de reprodução no litoral brasileiro."
}
```

---

## 3. Perguntas do Quiz Pedagógico (`data/quiz.json`)

Contém as questões do quiz educacional apresentadas de forma opcional na tela de vitória após a travessia e disponíveis para consulta no Diário de Bordo.

### Definição do Schema (`QuizQuestionSchema`)

| Campo          | Tipo       | Restrições                                                                          | Descrição                                                             |
| :------------- | :--------- | :---------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| `id`           | `string`   | Min: 1 caractere, único                                                             | Identificador alfanumérico da questão (ex: `"quiz-01"`).              |
| `factId`       | `string`   | Min: 1 caractere                                                                    | ID do fato correspondente em `facts.json` para referência pedagógica. |
| `biome`        | `enum`     | `"antartica"`, `"pelagico"`, `"oceano"`, `"costa_urbana"`, `"canyons"`, `"arraial"` | Bioma temático ao qual a pergunta pertence.                           |
| `difficulty`   | `enum`     | `"facil"`, `"medio"`, `"dificil"`                                                   | Nível de profundidade biológica da questão.                           |
| `question`     | `string`   | Min: 5 caracteres                                                                   | Enunciado claro e objetivo da questão.                                |
| `options`      | `string[]` | Exatamente 4 itens, não vazios                                                      | Quatro opções plausíveis de resposta em ordem arbitrária.             |
| `correctIndex` | `number`   | Inteiro: `0`, `1`, `2` ou `3`                                                       | Índice da alternativa correta no vetor `options`.                     |
| `explanation`  | `string`   | Min: 5 caracteres                                                                   | Justificativa didática exibida após a escolha do jogador.             |

### Exemplo Válido

```json
{
  "id": "quiz-01",
  "factId": "fato-01",
  "biome": "antartica",
  "difficulty": "facil",
  "question": "Para onde as baleias-jubarte migram após deixarem a Antártica?",
  "options": [
    "Para o Ártico em busca de gelo polar",
    "Para águas quentes tropicais para reprodução",
    "Para o fundo dos abismos oceânicos em hibernação",
    "Elas permanecem na Antártica durante todo o ano"
  ],
  "correctIndex": 1,
  "explanation": "As jubartes realizam a grande migração para águas tropicais e rasas, como o litoral brasileiro, onde as crias encontram temperaturas propícias para nascer."
}
```

---

## 4. Layout de Obstáculos & Fase (`data/level_layout.json`)

Define a distribuição determinística de elementos essenciais da rota para complementar a geração procedural de cenário.

### Definição do Schema (`LevelLayoutSchema`)

O arquivo é um objeto contendo 3 coleções:

```json
{
  "urbanTrash": [{ "x": 13500, "y": 280 }],
  "antarcticKrill": [{ "x": 800, "y": 220 }],
  "ghostNets": [{ "x": 14200, "layer": "mid1" }]
}
```

### Detalhamento das Propriedades

- **`urbanTrash`**:
  - `x`: Posição horizontal na rota em metros (`>= 0`).
  - `y`: Profundidade vertical em pixels (`>= 0`).
- **`antarcticKrill`**:
  - `x`: Posição horizontal onde o cardume é spawnado (`>= 0`).
  - `y`: Profundidade vertical do centro do cardume (`>= 0`).
- **`ghostNets`**:
  - `x`: Posição horizontal da rede de pesca abandonada (`>= 0`).
  - `layer`: Camada de profundidade da âncora: `"floor"` (fundo), `"mid1"` (águas médias 1) ou `"mid2"` (águas médias 2).

---

## 5. Como Contribuir com Novos Dados

1. Abra o arquivo correspondente em `data/` (`facts.json`, `quiz.json` ou `level_layout.json`).
2. Adicione sua nova entrada respeitando as propriedades e tipos descritos acima.
3. No terminal, execute a verificação:
   ```bash
   npm run validate:data
   ```
4. Se o script exibir `🎉 Todos os arquivos de dados estão 100% em conformidade com os schemas Zod!`, seus dados estão prontos para envio via Pull Request.
