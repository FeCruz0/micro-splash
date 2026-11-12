# Práticas de Engenharia — Micro Splash

Este documento resume os padrões observáveis no projeto. Para regras de agentes e estilo detalhado, consulte `ai.rules` e `CONTRIBUTING.md`.

## Arquitetura

- PixiJS v8 é o runtime gráfico; Kaboom.js não é dependência.
- `RenderEngineAdapter` e os contratos em `src/engine/contracts/INTERFACE_CONTRACTS.ts` isolam o backend.
- `RenderingContextAdapter` ainda mantém uma API de compatibilidade para consumidores existentes. Não a confundir com o runtime Kaboom nem afirmar que todos os módulos já foram migrados diretamente aos contratos.
- O input de teclado, toque e gamepad converge no estado compartilhado; `SystemRunner` ordena as fases da simulação.
- `SpatialHashGrid` atende consultas espaciais e broad phase de colisões.

## Implementação

- Preserve tipos explícitos, limites entre módulos e o ciclo de vida de nós, callbacks e listeners.
- Para código novo, prefira os contratos existentes e os adapters; evite ampliar o uso direto de APIs específicas do PixiJS fora da camada gráfica.
- Use nomes descritivos de domínio quando isso melhorar a clareza, mantendo consistência com o módulo existente.
- Respeite as preferências de acessibilidade, movimento reduzido e navegação por teclado.
- Partículas e atualizações de entidades frequentes devem seguir os mecanismos de pool, culling ou ticker familiar já existentes na área.

## Validação

- Testes: `npm test` ou um arquivo/suíte Vitest direcionada.
- Tipos: `npx tsc --noEmit`.
- Dados: `npm run validate:data`.
- Build: `npm run build`.

Execute os menores checks que cubram a alteração e amplie a validação quando necessário. Consulte `package.json` antes de depender de comandos adicionais.
