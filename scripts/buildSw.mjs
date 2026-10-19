import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf-8")
);

/**
 * Script pós-build para injetar a versão exata do package.json no Service Worker (Fase 47.1)
 */
export function buildVersionedServiceWorker() {
  const distSwPath = path.resolve(__dirname, "../dist/sw.js");
  if (!fs.existsSync(distSwPath)) {
    return false;
  }

  let content = fs.readFileSync(distSwPath, "utf-8");
  content = content.replace(
    /const CACHE_NAME = ["'][^"']+["'];/,
    `const CACHE_NAME = "micro-splash-v${packageJson.version}";`
  );
  fs.writeFileSync(distSwPath, content, "utf-8");
  process.stdout.write(
    `Service worker versionado com sucesso: micro-splash-v${packageJson.version}\n`
  );
  return true;
}

if (process.argv[1] === __filename) {
  buildVersionedServiceWorker();
}
