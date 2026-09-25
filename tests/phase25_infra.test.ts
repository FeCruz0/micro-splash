import { describe, it, expect } from "vitest";
import { APP_VERSION } from "../src/config";

describe("Fase 25: Infraestrutura, CI/CD & Deploy", () => {
  it("exporta versão semântica válida (APP_VERSION) alinhada com o package.json", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const pkgPath = path.resolve(nodeProcess.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    expect(typeof APP_VERSION).toBe("string");
    expect(APP_VERSION).toBe(pkg.version);
    // Valida formato semver (ex: 1.0.0)
    expect(/^\d+\.\d+\.\d+/.test(APP_VERSION)).toBe(true);
  });

  it("possui arquivos de configuração de ambiente (.env.example, .env.development, .env.production)", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const envFiles = [".env.example", ".env.development", ".env.production"];
    for (const envFile of envFiles) {
      const fullPath = path.resolve(nodeProcess.cwd(), envFile);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content).toContain("VITE_APP_ENV=");
      expect(content).toContain("VITE_API_URL=");
      expect(content).toContain("VITE_KIOSK_MODE=");
    }
  });

  it("possui pipeline de CI completo em .github/workflows/ci.yml com etapas de qualidade", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const ciPath = path.resolve(nodeProcess.cwd(), ".github/workflows/ci.yml");
    expect(fs.existsSync(ciPath)).toBe(true);

    const ciContent = fs.readFileSync(ciPath, "utf-8");
    // Triggers
    expect(ciContent).toContain("branches: [main, develop]");
    expect(ciContent).toContain("pull_request:");

    // Passos essenciais de qualidade
    expect(ciContent).toContain("npm ci");
    expect(ciContent).toContain("npm run format:check");
    expect(ciContent).toContain("npm run lint");
    expect(ciContent).toContain("npm run validate:data");
    expect(ciContent).toContain("npm run coverage");
    expect(ciContent).toContain("npm run build");
  });

  it("possui workflow de deploy automatizado em .github/workflows/deploy.yml", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const deployPath = path.resolve(nodeProcess.cwd(), ".github/workflows/deploy.yml");
    expect(fs.existsSync(deployPath)).toBe(true);

    const deployContent = fs.readFileSync(deployPath, "utf-8");
    expect(deployContent).toContain("branches: [main]");
    expect(deployContent).toContain("npm run build");
    expect(deployContent).toContain("actions/upload-pages-artifact");
    expect(deployContent).toContain("actions/deploy-pages");
  });

  it("possui Dockerfile.prod multi-stage e configuração Nginx para totens", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const dockerfilePath = path.resolve(nodeProcess.cwd(), "Dockerfile.prod");
    expect(fs.existsSync(dockerfilePath)).toBe(true);

    const dockerfileContent = fs.readFileSync(dockerfilePath, "utf-8");
    expect(dockerfileContent).toContain("AS builder");
    expect(dockerfileContent).toContain("AS runner");
    expect(dockerfileContent).toContain("nginx:");
    expect(dockerfileContent).toContain("HEALTHCHECK");

    const nginxPath = path.resolve(nodeProcess.cwd(), "nginx.conf");
    expect(fs.existsSync(nginxPath)).toBe(true);
    const nginxContent = fs.readFileSync(nginxPath, "utf-8");
    expect(nginxContent).toContain("try_files $uri $uri/ /index.html;");
    expect(nginxContent).toContain("gzip on;");
    expect(nginxContent).toContain("/healthz");
  });

  it("possui docker-compose.prod.yml com auto-recuperação e porta configurada para totens", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const composePath = path.resolve(nodeProcess.cwd(), "docker-compose.prod.yml");
    expect(fs.existsSync(composePath)).toBe(true);

    const composeContent = fs.readFileSync(composePath, "utf-8");
    expect(composeContent).toContain("dockerfile: Dockerfile.prod");
    expect(composeContent).toContain("restart: always");
    expect(composeContent).toContain("healthcheck:");
    expect(composeContent).toContain("8080:80");
  });
});
