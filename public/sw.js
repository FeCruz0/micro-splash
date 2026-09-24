/**
 * Service Worker Oficial do Micro Splash - Modo PWA Offline-First
 * Fase 19.2 do ROADMAP.md
 * 
 * Permite funcionamento 100% autônomo e sem conexão à internet em totens
 * interativos de museus, feiras de ciências escolares e tablets públicos.
 */

const CACHE_NAME = "micro-splash-v2";

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/sprites/whale.png",
  "/sprites/orca_bg.png",
  "/sprites/humpback_bg.png",
  "/sprites/cachalote_bg.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Instalação: Pré-cacheia os assets estruturais essenciais
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Ativação: Limpa versões anteriores de cache e assume controle imediato
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições: Estratégia Híbrida Cache-First / Stale-While-Revalidate
self.addEventListener("fetch", (event) => {
  // Ignora requisições não-GET e esquemas que não sejam http/https (ex: chrome-extension)
  if (event.request.method !== "GET" || !event.request.url.startsWith("http")) {
    return;
  }

  const url = new URL(event.request.url);

  // Requisição de navegação HTML (App Shell): Network-first com fallback para Cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          return caches.match("/index.html") || caches.match("/");
        })
    );
    return;
  }

  // Assets estáticos (JS, CSS, Imagens, Fontes, Sprites): Cache-First com atualização em background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Dispara fetch assíncrono para atualizar o cache se a rede estiver disponível
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {
          // Ignora falhas de rede no background em modo offline
        });
        return cachedResponse;
      }

      // Se não estiver em cache, busca na rede e armazena
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});
