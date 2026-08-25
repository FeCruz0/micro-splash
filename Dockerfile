FROM node:20-alpine

WORKDIR /app

# copia arquivos de dependência
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia todo o código da aplicação
COPY . .

# Expõe a porta que o Vite usa
EXPOSE 5173

# Roda o servidor de desenvolvimento liberando acesso externo (--host)
CMD ["npm", "run", "dev", "--", "--host"]
