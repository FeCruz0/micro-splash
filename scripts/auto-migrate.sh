#!/usr/bin/env bash
# scripts/auto-migrate.sh - Loop de execução autônoma Antigravity CLI (agy)

TODO_FILE=".ai/todo.md"
AGY_BIN="/home/felipe/.local/bin/agy"

if [ ! -f "$TODO_FILE" ]; then
  echo "Erro: Arquivo $TODO_FILE não encontrado."
  exit 1
fi

if [ ! -x "$AGY_BIN" ]; then
  echo "Erro: Binário 'agy' não encontrado em $AGY_BIN"
  exit 1
fi

echo "=== Iniciando Execução Autônoma do Roadmap ==="

TASKS_FOUND=0

# Lê apenas as linhas que iniciam exatamente com '- [ ] Etapa'
while read -r line; do
  [ -z "$line" ] && continue
  
  TASKS_FOUND=1
  # Extrai o texto da tarefa removendo o marcador '- [ ] '
  TASK=$(echo "$line" | sed -E 's/^- \[ \] //')
  
  echo -e "\n[EXECUTANDO]: $TASK"
  
  # Chama o agy passando o prompt com a flag -p
  "$AGY_BIN" -p "Execute a seguinte tarefa do projeto: '$TASK'. Siga as regras estritas do .ai-rules. Após alterar o código, valide obrigatoriamente rodando 'npx tsc --noEmit' e 'npm test'. Se houver erro de tipo ou teste, corrija imediatamente."
  
  if [ $? -eq 0 ]; then
    echo "[SUCESSO]: $TASK"
    
    # Escapa caracteres especiais para o sed atualizar o [ ] para [x] no todo.md
    ESCAPED_TASK=$(printf '%s\n' "$TASK" | sed -e 's/[\/&]/\\&/g')
    sed -i.bak "s/- \[ \] $ESCAPED_TASK/- [x] $ESCAPED_TASK/" "$TODO_FILE" && rm -f "$TODO_FILE.bak"
  else
    echo -e "\n[FALHA]: $TASK. Interrompendo loop para revisão."
    exit 1
  fi
done < <(tr -d '\r' < "$TODO_FILE" | grep -E '^- \[ \] Etapa')

if [ "$TASKS_FOUND" -eq 0 ]; then
  echo -e "\n[AVISO]: Nenhuma tarefa pendente do tipo 'Etapa' foi encontrada no arquivo $TODO_FILE."
fi

echo -e "\n=== Processamento do lote concluído! ==="