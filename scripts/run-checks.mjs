import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const files = await readdir(new URL("./", import.meta.url));
const checks = files
  .filter((file) => /^check-.+\.mjs$/.test(file))
  .sort()
  .flatMap((file) =>
    (file === "check-new-game-setup.mjs" ? ["development", "production"] : ["production"])
      .map((nodeEnv) => ({ file, nodeEnv })),
  );

if (checks.length === 0) {
  throw new Error("Не найдены scripts/check-*.mjs");
}

let next = 0;
let failed = 0;

async function worker() {
  while (next < checks.length) {
    const { file, nodeEnv } = checks[next++];
    const name = file === "check-new-game-setup.mjs" ? `${file} (${nodeEnv})` : file;
    try {
      await run(process.execPath, ["--no-warnings", "--experimental-strip-types", `scripts/${file}`], {
        cwd: root,
        env: { ...process.env, NODE_ENV: nodeEnv },
        timeout: 180_000,
        maxBuffer: 4 * 1024 * 1024,
      });
      console.log(`PASS ${name}`);
    } catch (error) {
      failed++;
      const lines = (error.stderr || error.stdout || error.message).trim().split(/\r?\n/);
      const message = error.killed
        ? "Превышено время выполнения (180 с)"
        : lines.find((line) => /^\w*Error\b/.test(line)) ?? lines.find((line) => line.trim());
      console.error(`FAIL ${name}: ${message}`);
    }
  }
}

console.log(`Проверок: ${checks.length}; параллельных процессов: 4`);
await Promise.all(Array.from({ length: Math.min(4, checks.length) }, () => worker()));
console.log(`\nПрошло: ${checks.length - failed}; упало: ${failed}; всего: ${checks.length}`);
process.exitCode = failed > 0 ? 1 : 0;
