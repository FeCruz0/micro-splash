# Plano de Implementação — Fase 54: Especial Feira de Ciências — Mulheres na Ciência & Educação Ambiental

Status: Concluído ✅  
Data: 2026-10-21  
Alvo: v1.19.0 (Edição Feira de Ciências)

---

## 🔬 Diagnóstico e Motivação

1. **Tema Central da Feira de Ciências**:
   - O tema deste ano na feira é **"Mulheres na Ciência"**.
   - O jogo já possui um sistema rico de Quiz pós-corrida e um Códex educativo, porém focado prioritariamente em ecologia geral dos biomas.
   - Para que o jogo seja uma atração de destaque na feira, o quiz incorpora perguntas sobre mulheres cientistas, organizadas pela seguinte hierarquia de relevância:
     1. **Prioridade 1 (Máxima)**: Mulheres cientistas envolvidas em pesquisas com baleias, cetáceos e oceanografia marinha (com destaque para pesquisadoras brasileiras).
     2. **Prioridade 2 (Intermediária)**: Grandes cientistas brasileiras em qualquer área da ciência e tecnologia.
     3. **Prioridade 3 (Complementar)**: Cientistas mulheres internacionais em outras áreas do conhecimento.

2. **Garantia de Exibição na Feira (`src/ui/quizModal.ts`)**:
   - Cada sessão de quiz sorteia 3 perguntas.
   - O algoritmo atualizado em `selectQuizQuestions` garante que **pelo menos 1 pergunta das 3 seja obrigatoriamente do tema "Mulheres na Ciência"** em toda partida, mantendo a aleatoriedade e integrando-se organicamente à rota.

3. **Consistência de Dados e Schemas (`src/schemas/dataSchemas.ts`, `data/facts.json`, `data/quiz.json`)**:
   - Todas as 11 novas questões satisfazem estritamente o `QuizQuestionSchema` (Zod), com `id` único (`q_mulheres_*`), `factId` canônico dos biomas, `biome` válido, 4 opções, gabarito e explicação pedagógica detalhada.
   - Preservados os 13 marcos migratórios canônicos ordenados em `data/facts.json` para o Códex e eventos de rota.

---

## 📋 Lista de Tarefas Atômicas

### Etapa 1: Fatos Pedagógicos de Referência (`data/facts.json`)

- [x] **1.1 Preservação dos 13 Fatos Canônicos Ordenados em `data/facts.json`**
  - **Arquivo**: `data/facts.json`.
  - **Ação**: Validação dos 13 marcos migratórios da rota canônica com `triggerX` estritamente crescente.
  - **Validação**: Testado com `FactsArraySchema.parse()` e `tests/core/quiz.test.ts`.

---

### Etapa 2: Banco de Questões do Quiz (`data/quiz.json`)

- [x] **2.1 Inserir Perguntas de Prioridade 1 (Baleias & Oceanografia)**
  - **Arquivo**: `data/quiz.json`.
  - **Ação**: Adicionadas 5 questões focadas em cetáceos e ambiente marinho:
    1. `q_mulheres_marcia_engel`: Dra. Márcia Engel e o Instituto Baleia Jubarte.
    2. `q_mulheres_sylvia_earle`: Dra. Sylvia Earle e os Hope Spots oceânicos.
    3. `q_mulheres_mariana_groch`: Dra. Mariana Groch e a Baleia-Franca no Brasil.
    4. `q_mulheres_proantar`: Cientistas brasileiras na Antártica e ecologia do krill.
    5. `q_mulheres_rachel_carson`: Rachel Carson e a conservação marinha.
  - **Validação**: Validação sintática e de schema Zod.

- [x] **2.2 Inserir Perguntas de Prioridade 2 (Cientistas Brasileiras)**
  - **Arquivo**: `data/quiz.json`.
  - **Ação**: Adicionadas 4 questões celebrando pioneiras brasileiras: 6. `q_mulheres_johanna_dobereiner`: Johanna Döbereiner e a biotecnologia na agricultura. 7. `q_mulheres_bertha_lutz`: Bertha Lutz e a zoologia no Museu Nacional. 8. `q_mulheres_jaqueline_goes`: Dra. Jaqueline Goes de Jesus e o genoma viral. 9. `q_mulheres_enedina_marques`: Enedina Alves Marques, pioneira da engenharia nacional.
  - **Validação**: Validação sintática e de schema Zod.

- [x] **2.3 Inserir Perguntas de Prioridade 3 (Cientistas Internacionais)**
  - **Arquivo**: `data/quiz.json`.
  - **Ação**: Adicionadas 2 questões de vanguarda internacional: 10. `q_mulheres_marie_curie`: Marie Curie, radioatividade e os 2 Nobels. 11. `q_mulheres_rosalind_franklin`: Rosalind Franklin e a Foto 51 do DNA.
  - **Validação**: Validação sintática e de schema Zod.

---

### Etapa 3: Algoritmo de Seleção para a Feira de Ciências (`src/ui/quizModal.ts`)

- [x] **3.1 Atualizar `selectQuizQuestions` com Cota Especial da Feira**
  - **Arquivo**: `src/ui/quizModal.ts`.
  - **Ação**:
    - Criada e exportada a função `isWomenInScienceQuestion`.
    - Garantido que a primeira vaga das 3 perguntas seja preenchida obrigatoriamente por uma questão de Mulheres na Ciência.
    - As 2 vagas subsequentes seguem o fluxo pedagógico normal de rota e dificuldade.
  - **Validação**: Testes unitários com simulação de 50 sorteios consecutivos garantindo 100% de presença do tema.

---

### Etapa 4: Suíte de Testes Automatizados TDD (`tests/ui/phase54_women_in_science.test.ts`)

- [x] **4.1 Criar Testes Unitários de Dados e Seleção**
  - **Arquivo**: `tests/ui/phase54_women_in_science.test.ts`.
  - **Ação**: Implementada cobertura completa para:
    - Conformidade do arquivo `data/quiz.json` com `QuizArraySchema`.
    - Conformidade do arquivo `data/facts.json` com `FactsArraySchema`.
    - Presença das 11 questões e verificação de gabaritos (`correctIndex` bate com a opção correta).
    - Teste de `selectQuizQuestions` confirmando presença mandatória do tema da feira em 100% dos sorteios.
  - **Validação**: Execução via Vitest (`tests/ui/phase54_women_in_science.test.ts` e suíte completa de 71 arquivos).

---

### Etapa 5: Atualização da Documentação & Roadmap

- [x] **5.1 Registrar Fase 54 em `docs/ROADMAP.md`**
  - **Arquivo**: `docs/ROADMAP.md`.
  - **Ação**: Documentação formal da Fase 54 com objetivos e itens concluídos.
  - **Validação**: Suíte de consistência de documentação (`tests/core/phase52_documentation_consistency.test.ts`) 100% verde.
