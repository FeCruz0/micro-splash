# Cloudflare Worker — Ranking Online Micro-Splash

Backend serverless para ranking global e semanal do jogo **Micro-Splash: A Jornada da Baleia-Jubarte**.

## Recursos
- **CORS Aberto**: Permite requisições de navegadores web e aplicações instaladas como PWA em totens.
- **Top 10 Global & Semanal**: Particionamento automático por semana (`2026-W38`) e histórico global.
- **Armazenamento em Borda (KV)**: Baixa latência e gratuidade no plano tier free da Cloudflare.

## Como Realizar o Deploy
1. Instale o Wrangler se necessário:
   ```bash
   npm install -g wrangler
   ```
2. Faça login na Cloudflare:
   ```bash
   npx wrangler login
   ```
3. Crie o namespace KV:
   ```bash
   npx wrangler kv:namespace create "LEADERBOARD_KV"
   ```
4. Copie `wrangler.toml.example` para `wrangler.toml` e cole o `id` gerado.
5. Faça o deploy:
   ```bash
   npx wrangler deploy
   ```
6. No arquivo `.env` do Micro-Splash (ou nas variáveis de ambiente da Vercel/Netlify/GitHub Pages):
   ```env
   VITE_LEADERBOARD_API_URL="https://micro-splash-leaderboard.<seu-subdominio>.workers.dev"
   ```
