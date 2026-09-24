/**
 * Cloudflare Worker — Micro-Splash Global & Weekly Leaderboard API
 *
 * Utiliza Cloudflare KV para armazenamento rápido de borda com baixa latência global.
 * Requer binding KV configurado como `LEADERBOARD_KV`.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/leaderboard") {
      if (request.method === "GET") {
        return handleGet(url, env);
      } else if (request.method === "POST") {
        return handlePost(request, env);
      }
    }

    return new Response(JSON.stringify({ error: "Rota não encontrada" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};

async function handleGet(url, env) {
  const type = url.searchParams.get("type") || "global";
  const week = url.searchParams.get("week");

  let kvKey = "leaderboard_global";
  if (type === "weekly") {
    kvKey = week ? `leaderboard_weekly_${week}` : "leaderboard_weekly_current";
  }

  try {
    let data = [];
    if (env.LEADERBOARD_KV) {
      const raw = await env.LEADERBOARD_KV.get(kvKey);
      if (raw) {
        data = JSON.parse(raw);
      }
    }

    return new Response(JSON.stringify({ success: true, type, week, data }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro ao consultar ranking", details: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}

async function handlePost(request, env) {
  try {
    const body = await request.json();
    const initials = String(body.initials || "AAA")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "A")
      .slice(0, 3)
      .padEnd(3, "A");

    const score = Math.max(0, Math.floor(Number(body.score) || 0));
    const distance = Math.max(0, Math.floor(Number(body.distance) || 0));
    const mode = String(body.mode || "standard").slice(0, 20);
    const date = String(body.date || new Date().toISOString().slice(5, 10)).slice(0, 10);
    const weekKey = body.weekKey ? String(body.weekKey).slice(0, 15) : undefined;

    const newEntry = {
      initials,
      score,
      distance,
      mode,
      date,
      ...(weekKey ? { weekKey } : {}),
    };

    if (!env.LEADERBOARD_KV) {
      return new Response(
        JSON.stringify({
          success: true,
          mock: true,
          message: "KV não configurado, ecoando entrada.",
          entry: newEntry,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Atualiza o ranking global
    await updateKvLeaderboard(env.LEADERBOARD_KV, "leaderboard_global", newEntry);

    // Se houver weekKey, atualiza também o ranking semanal correspondente
    if (weekKey) {
      await updateKvLeaderboard(env.LEADERBOARD_KV, `leaderboard_weekly_${weekKey}`, newEntry);
    }

    return new Response(JSON.stringify({ success: true, entry: newEntry }), {
      status: 201,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Payload inválido", details: err.message }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}

async function updateKvLeaderboard(kv, key, newEntry) {
  let list = [];
  const raw = await kv.get(key);
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch {}
  }

  list.push(newEntry);
  list.sort((a, b) => b.score - a.score);

  // Mantém apenas o Top 10
  const top10 = list.slice(0, 10);
  await kv.put(key, JSON.stringify(top10));
  return top10;
}
