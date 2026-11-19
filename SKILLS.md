# Práticas de Engenharia — Micro Splash

Este documento registra os padrões arquiteturais, técnicos, visuais e de gameplay observáveis no projeto.

Seu objetivo é fornecer contexto aos agentes de desenvolvimento para que implementem melhorias sem comprometer a arquitetura, a identidade artística ou a experiência de jogo.

Para regras de execução, comunicação e estilo de código, consulte `ai.rules` e `CONTRIBUTING.md`.

---

## 1. Arquitetura

- PixiJS v8 é o runtime gráfico; Kaboom.js não é dependência.
- `RenderEngineAdapter` e os contratos em `src/engine/contracts/INTERFACE_CONTRACTS.ts` isolam o backend.
- `RenderingContextAdapter` ainda mantém uma API de compatibilidade para consumidores existentes.
- Não confundir essa camada de compatibilidade com o runtime Kaboom nem presumir que todos os módulos foram migrados diretamente para os contratos.
- O input de teclado, toque e gamepad converge no estado compartilhado.
- `SystemRunner` organiza as fases da simulação.
- `SpatialHashGrid` atende consultas espaciais e broad phase de colisões.
- A arquitetura existente deve ser compreendida antes de qualquer alteração estrutural.
- Evite migrações arquiteturais abrangentes durante tarefas localizadas de gameplay ou arte.

## 2. Implementação

- Preserve tipos explícitos, limites entre módulos e ciclo de vida de nós, callbacks e listeners.
- Para código novo, prefira os contratos existentes e os adapters.
- Evite ampliar o uso direto de APIs específicas do PixiJS fora da camada gráfica.
- Mantenha a lógica de domínio independente do sistema de renderização.
- Use nomes descritivos de domínio, respeitando a consistência de cada módulo.
- Respeite acessibilidade, movimento reduzido e navegação por teclado.
- Partículas e atualizações frequentes de entidades devem seguir os mecanismos de pool, culling ou ticker já utilizados na área correspondente.
- Evite criar abstrações ou dependências sem necessidade demonstrável.

## 3. Identidade Visual e Direção Artística

Micro Splash possui uma identidade visual baseada em pixel art com aparência tridimensional.

Características predominantes:

- Geometria poligonal com facetas definidas.
- Volumes com aparência tridimensional.
- Paleta de azuis, cianos e brancos.
- Contraste entre iluminação e sombras.
- Formas orgânicas e irregulares.
- Elementos ambientais com profundidade visual.
- Detalhamento controlado, sem excesso de ruído.

### Coerência visual

- Manter uma linguagem artística consistente entre personagens, cenários, plataformas e elementos ambientais.
- Preservar a identidade visual de assets já aprovados.
- Evitar substituições por formas vetoriais minimalistas ou geometrias excessivamente simplificadas.
- Evitar repetição procedural excessivamente uniforme.
- Priorizar silhuetas naturais, volumes bem construídos e iluminação coerente.
- Avaliar a qualidade dos elementos em sua escala real de exibição.
- Não reformular elementos não relacionados à tarefa solicitada.

### Cenários e ambientes

O ambiente submarino possui elementos como:

- Grande geleira à esquerda.
- Oceano profundo.
- Icebergs flutuantes.
- Iluminação subaquática e feixes de luz.
- Vegetação submarina.
- Fauna marinha.
- Personagem controlável.

Ao modificar um elemento ambiental, preservar a integração visual com os demais componentes.

A grande geleira e os pequenos icebergs devem compartilhar linguagem geométrica, paleta, facetas e lógica de iluminação, respeitando suas diferenças de escala e complexidade.

Não confundir geometria decorativa com geometria de colisão.

## 4. Personagens, Sprites e Animações

A baleia-jubarte é a protagonista e principal elemento de identificação do jogo.

### Representação visual

- Preservar características anatômicas reconhecíveis da espécie.
- Manter consistência de proporções e silhueta.
- Utilizar iluminação e sombreamento compatíveis com o ambiente.
- Garantir boa leitura visual em escala reduzida.
- Evitar deformações anatômicas e detalhes que prejudiquem a identificação do personagem.

### Sprite sheets

Antes de modificar um sprite, inspecionar:

- Dimensões originais.
- Quantidade de frames.
- Organização dos quadros.
- Transparência.
- Pivôs e alinhamento.
- Escala de renderização.
- Referências utilizadas pelos consumidores.

Preservar os contratos existentes de carregamento e reprodução das animações.

### Consistência de animação

- Manter proporções e alinhamento entre frames.
- Evitar oscilações involuntárias de tamanho.
- Evitar flickering e mudanças abruptas de aparência.
- Garantir continuidade dos movimentos.
- Sincronizar animações com os estados correspondentes de gameplay.
- Preservar os frames e transições especiais existentes, salvo quando a tarefa exigir alterações.

## 5. Gameplay e Simulação

A experiência principal é baseada no controle de uma baleia-jubarte em um ambiente submarino lateral.

O personagem explora o oceano, movimenta-se pela água, interage com elementos ambientais e executa saltos para fora da superfície.

### Princípios de gameplay

- Preservar a independência entre simulação e renderização.
- Manter o comportamento da física consistente com o tempo de simulação.
- Evitar alterações involuntárias na movimentação e nas colisões.
- Garantir que animações representem corretamente os estados do personagem.
- Preservar a responsividade dos controles.
- Considerar as diferenças entre teclado, toque e gamepad.
- Garantir que obstáculos e plataformas sejam compatíveis com os parâmetros reais de movimentação do personagem.

### Movimentação e física

Antes de modificar movimentação, saltos ou colisões:

1. Inspecionar os sistemas envolvidos.
2. Identificar parâmetros e dependências existentes.
3. Compreender a relação entre física, estado e animação.
4. Identificar possíveis impactos sobre outros sistemas.
5. Testar o comportamento no jogo.

Não alterar parâmetros de física para corrigir exclusivamente problemas visuais.

### Interações e progressão

- Preservar contratos existentes de interação.
- Evitar introduzir dependências entre sistemas de gameplay e elementos puramente decorativos.
- Garantir que alterações em interações não comprometam outros estados do personagem.
- Avaliar a experiência do jogador, além da correção técnica.

A documentação específica de cada mecânica deve ser confirmada na implementação antes de qualquer modificação.

## 6. Renderização e Performance

- Utilizar APIs compatíveis com PixiJS v8.
- Considerar o custo de renderização de geometrias e sprites.
- Evitar alocações desnecessárias em atualizações frequentes.
- Reutilizar objetos gráficos e recursos quando apropriado.
- Considerar batching, draw calls, texturas e gerenciamento de memória.
- Preservar o ciclo de vida de containers, sprites, texturas e listeners.
- Evitar cálculos geométricos complexos dentro de callbacks executados continuamente.
- Aplicar culling quando apropriado.
- Preservar a estabilidade da taxa de quadros durante a movimentação da câmera.
- Otimizar com base em problemas observados, evitando simplificações visuais prematuras.

## 7. Assets e Geração Procedural

- Inspecionar os geradores e os assets existentes antes de substituí-los.
- Preservar referências originais e versões aprovadas.
- Manter consistência entre elementos gerados proceduralmente.
- Evitar repetição excessiva de padrões e silhuetas.
- Utilizar aleatoriedade controlada quando aplicável.
- Utilizar seeds determinísticas quando for necessária reprodutibilidade.
- Separar a geração de geometria visual da geometria de colisão.
- Verificar dimensões, transparência, limites e integridade dos arquivos gerados.
- Não modificar assets sem relação com a tarefa.

## 8. Validação

### Verificação técnica

Consultar `package.json` antes de utilizar comandos.

Checks disponíveis e utilizados pelo projeto:

- Testes: `npm test` ou suíte Vitest direcionada.
- Tipos: `npx tsc --noEmit`.
- Dados: `npm run validate:data`.
- Build: `npm run build`.

Executar os menores checks que cubram a alteração e ampliar a validação quando necessário.

Verificar também ESLint e Prettier quando configurados no projeto.

### Verificação visual

Para modificações de arte, renderização ou animação:

- Executar o jogo no navegador quando possível.
- Inspecionar o resultado efetivamente renderizado.
- Comparar com as referências fornecidas.
- Avaliar a escala real de exibição.
- Inspecionar frames individuais e a animação em movimento.
- Verificar transparência, alinhamento, silhueta, iluminação e sobreposições.
- Corrigir regressões visuais antes de concluir.

### Verificação de gameplay

Para alterações de mecânicas:

- Testar os controles envolvidos.
- Verificar transições de estado.
- Avaliar movimentação e colisões.
- Testar interações afetadas.
- Verificar possíveis regressões em outros sistemas.

Nunca considerar uma alteração visual concluída apenas porque compila corretamente.

Se não for possível realizar uma validação, informar explicitamente a limitação.

---

## 9. Princípio Geral

Toda alteração deve respeitar três dimensões:

1. **Integridade técnica:** arquitetura, tipagem, estabilidade e desempenho.
2. **Qualidade visual:** identidade artística, coerência, profundidade e acabamento.
3. **Experiência de jogo:** responsividade, consistência das mecânicas e qualidade da interação.

O objetivo é evoluir Micro Splash continuamente, preservando suas características já estabelecidas e evitando reformulações desnecessárias.
