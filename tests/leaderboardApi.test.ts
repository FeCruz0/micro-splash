import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getLeaderboardApiUrl,
  setLeaderboardApiUrl,
  getCachedLeaderboard,
  saveCachedLeaderboard,
  fetchOnlineLeaderboard,
  submitOnlineScore,
} from "../src/services/leaderboardApi";
import type { LeaderboardEntry } from "../src/systems/leaderboard";

describe("Leaderboard API & Offline-First Sync (Fase 22)", () => {
  beforeEach(() => {
    localStorage.clear();
    setLeaderboardApiUrl(null);
    vi.restoreAllMocks();
  });

  it("retorna URL padrão e permite sobrescrita para testes", () => {
    expect(getLeaderboardApiUrl()).toContain("micro-splash-leaderboard");
    setLeaderboardApiUrl("https://custom-test-api.example.com");
    expect(getLeaderboardApiUrl()).toBe("https://custom-test-api.example.com");
  });

  it("salva e recupera cache local de pontuações", () => {
    const mockEntries: LeaderboardEntry[] = [
      { initials: "GLB", score: 9999, distance: 30000, mode: "standard", date: "24/09" },
    ];

    saveCachedLeaderboard("global", mockEntries);
    const cached = getCachedLeaderboard("global");
    expect(cached).toHaveLength(1);
    expect(cached![0].initials).toBe("GLB");
    expect(cached![0].score).toBe(9999);
  });

  it("utiliza cache offline com flag isOffline=true quando fetch falha", async () => {
    const cachedEntries: LeaderboardEntry[] = [
      { initials: "OFF", score: 8888, distance: 30000, mode: "weekly", date: "24/09" },
    ];
    saveCachedLeaderboard("weekly", cachedEntries, "2026-W39");

    // Mock de falha de rede
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network Error")));

    const result = await fetchOnlineLeaderboard("weekly", "2026-W39");
    expect(result.success).toBe(true);
    expect(result.isOffline).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].initials).toBe("OFF");
  });

  it("trata resposta positiva do backend atualizando o cache", async () => {
    const remoteData: LeaderboardEntry[] = [
      { initials: "NET", score: 7777, distance: 30000, mode: "standard", date: "24/09" },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: remoteData }),
      })
    );

    const result = await fetchOnlineLeaderboard("global");
    expect(result.success).toBe(true);
    expect(result.isOffline).toBe(false);
    expect(result.data[0].initials).toBe("NET");

    const cached = getCachedLeaderboard("global");
    expect(cached![0].initials).toBe("NET");
  });

  it("envia submissão online com sanitização correta e responde sucesso", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const entry: LeaderboardEntry = {
      initials: "abc",
      score: 5500.8,
      distance: 29999.4,
      mode: "weekly",
      date: "24/09",
    };

    const res = await submitOnlineScore(entry, "2026-W39");
    expect(res.success).toBe(true);
    expect(res.isOffline).toBe(false);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.initials).toBe("ABC");
    expect(sentBody.score).toBe(5500);
    expect(sentBody.distance).toBe(29999);
    expect(sentBody.weekKey).toBe("2026-W39");
  });
});
