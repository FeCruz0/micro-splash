import { describe, it, expect } from "vitest";
import {
  removeLocalStorageItemsByPrefix,
  writeLocalStorage,
  readLocalStorageWithSchema,
} from "../src/utils/storage";
import { z } from "zod";

describe("Fase 37 — Validação Estática de Resíduos Técnicos", () => {
  const sourceModules = import.meta.glob("../src/**/*.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  describe("6.1.1 — Ausência de Math.random() fora de src/utils/random.ts", () => {
    it("não permite chamadas diretas a Math.random() em arquivos de produção", () => {
      const filesWithMathRandom: string[] = [];

      for (const [modulePath, fileContent] of Object.entries(sourceModules)) {
        if (modulePath.endsWith("/src/utils/random.ts")) continue;
        if (fileContent.includes("Math.random()")) {
          filesWithMathRandom.push(modulePath);
        }
      }

      expect(filesWithMathRandom).toEqual([]);
    });
  });

  describe("6.1.2 — Ausência de localStorage direto fora de src/utils/storage.ts", () => {
    it("não permite chamadas diretas a localStorage.* em arquivos de produção", () => {
      const filesWithLocalStorage: string[] = [];

      for (const [modulePath, fileContent] of Object.entries(sourceModules)) {
        if (modulePath.endsWith("/src/utils/storage.ts")) continue;
        if (/localStorage\s*\./.test(fileContent)) {
          filesWithLocalStorage.push(modulePath);
        }
      }

      expect(filesWithLocalStorage).toEqual([]);
    });

    it("remove corretamente múltiplos itens por prefixo usando removeLocalStorageItemsByPrefix", () => {
      const testSchema = z.object({ value: z.string() });
      writeLocalStorage("micro_splash_test_alpha", { value: "A" });
      writeLocalStorage("micro_splash_test_beta", { value: "B" });
      writeLocalStorage("unrelated_key", { value: "C" });

      removeLocalStorageItemsByPrefix("micro_splash_test_");

      expect(readLocalStorageWithSchema("micro_splash_test_alpha", testSchema, null)).toBeNull();
      expect(readLocalStorageWithSchema("micro_splash_test_beta", testSchema, null)).toBeNull();
      expect(readLocalStorageWithSchema("unrelated_key", testSchema, null)).toEqual({ value: "C" });
    });
  });

  describe("6.1.3 — Ausência de console.* fora de src/utils/errorReporter.ts", () => {
    it("não permite console.log/warn/error/info diretos em arquivos de produção", () => {
      const filesWithConsole: string[] = [];
      const consolePattern = /console\.(log|warn|error|info|debug)\s*\(/;

      for (const [modulePath, fileContent] of Object.entries(sourceModules)) {
        if (modulePath.endsWith("/src/utils/errorReporter.ts")) continue;
        if (consolePattern.test(fileContent)) {
          filesWithConsole.push(modulePath);
        }
      }

      expect(filesWithConsole).toEqual([]);
    });
  });

  describe("6.1.4 — Ausência de tipagem any em arquivos de produção", () => {
    it("não permite ': any' ou 'as any' em arquivos de produção", () => {
      const filesWithExplicitAny: Array<{ file: string; match: string }> = [];
      const anyPattern = /(\bas\s+any\b|:\s*any\b|<any>)/;

      for (const [modulePath, fileContent] of Object.entries(sourceModules)) {
        const lines = fileContent.split("\n");
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          const trimmed = line.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

          if (anyPattern.test(line)) {
            filesWithExplicitAny.push({
              file: `${modulePath}:${lineIndex + 1}`,
              match: trimmed,
            });
          }
        }
      }

      expect(filesWithExplicitAny).toEqual([]);
    });
  });
});
