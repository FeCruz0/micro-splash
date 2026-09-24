import { describe, it, expect } from "vitest";

describe("Fase 19.2: Modo PWA Offline-First para Totens Interativos & Feiras de Ciências", () => {
  it("possui manifesto de aplicativo web (manifest.json) válido e completo para instalação autônoma", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const manifestPath = path.resolve(nodeProcess.cwd(), "public/manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    // Propriedades essenciais para totens e telas cheias
    expect(manifest.name).toBe("Micro Splash - A Jornada da Jubarte");
    expect(manifest.short_name).toBe("Micro Splash");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.orientation).toBe("landscape");
    expect(manifest.theme_color).toBe("#06122a");
    expect(manifest.background_color).toBe("#06122a");

    // Validação de ícones
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    const icon192 = manifest.icons.find((i: any) => i.sizes === "192x192");
    const icon512 = manifest.icons.find((i: any) => i.sizes === "512x512");
    expect(icon192).toBeTruthy();
    expect(icon512).toBeTruthy();
  });

  it("possui o Service Worker oficial (sw.js) com estratégias de cache e ciclo de vida", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const swPath = path.resolve(nodeProcess.cwd(), "public/sw.js");
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, "utf-8");

    // Ciclo de vida obrigatório
    expect(swContent).toContain('addEventListener("install"');
    expect(swContent).toContain('addEventListener("activate"');
    expect(swContent).toContain('addEventListener("fetch"');

    // Pré-cache do App Shell e assets
    expect(swContent).toContain("/index.html");
    expect(swContent).toContain("/sprites/whale.png");
    expect(swContent).toContain("/manifest.json");
    expect(swContent).toContain("caches.open");
  });

  it("contém todos os arquivos de ícones PNG e SVG de alta resolução na pasta public", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const faviconSvg = path.resolve(nodeProcess.cwd(), "public/favicon.svg");
    const icon192 = path.resolve(nodeProcess.cwd(), "public/icons/icon-192.png");
    const icon512 = path.resolve(nodeProcess.cwd(), "public/icons/icon-512.png");

    expect(fs.existsSync(faviconSvg)).toBe(true);
    expect(fs.statSync(faviconSvg).size).toBeGreaterThan(100);

    expect(fs.existsSync(icon192)).toBe(true);
    expect(fs.statSync(icon192).size).toBeGreaterThan(500);

    expect(fs.existsSync(icon512)).toBe(true);
    expect(fs.statSync(icon512).size).toBeGreaterThan(1000);
  });

  it("contém tags de PWA, tema e manifesto linkadas no index.html", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const indexPath = path.resolve(nodeProcess.cwd(), "index.html");
    const indexContent = fs.readFileSync(indexPath, "utf-8");

    expect(indexContent).toContain('<link rel="manifest" href="/manifest.json"');
    expect(indexContent).toContain('<meta name="theme-color" content="#06122a"');
    expect(indexContent).toContain('<meta name="apple-mobile-web-app-capable" content="yes"');
    expect(indexContent).toContain('<link rel="apple-touch-icon"');
  });
});
