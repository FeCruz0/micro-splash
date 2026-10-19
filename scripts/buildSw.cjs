const fs = require("node:fs");
const path = require("node:path");
const packageJson = require("../package.json");

/**
 * Script pos-build para injetar a versao exata do package.json no Service Worker (Fase 47.1)
 */
function buildVersionedServiceWorker() {
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

if (require.main === module) {
  buildVersionedServiceWorker();
}

module.exports = { buildVersionedServiceWorker };
