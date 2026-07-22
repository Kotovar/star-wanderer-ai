import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { getArchiveHintLocations } = jiti("../src/game/artifacts/utils.ts");
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");

const sectors = [
    {
      id: 1,
      name: "Бета-1",
      danger: 1,
      locations: [
        { name: "⚙️ Страж Врат", type: "boss", bossDefeated: false },
        { name: "Аномалия Беты", type: "anomaly" },
      ],
    },
    {
      id: 2,
      name: "Гамма-2",
      danger: 2,
      locations: [{ name: "Аномалия Гаммы", type: "anomaly" }],
    },
    {
      id: 3,
      name: "Дельта-3",
      danger: 3,
      locations: [{ name: "Аномалия Дельты", type: "anomaly" }],
    },
  ];
const hints = getArchiveHintLocations(sectors);

assert.deepEqual(
  hints.map((hint) => hint.sectorName),
  ["Бета-1", "Гамма-2", "Дельта-3"],
  "архивы должны сначала распределять сигналы по разным системам",
);
assert.equal(
  new Set(hints.map((hint) => hint.sectorName)).size,
  hints.length,
  "одна система не должна получить несколько сигналов, пока есть альтернативы",
);

const migrated = loadWithMigrations(
  JSON.stringify({
    version: 5,
    state: {
      galaxy: { sectors },
      currentSector: null,
      artifacts: ["rare", "legendary", "mythic"].map((id) => ({
        id,
        discovered: false,
        hinted: true,
        hintSource: "archives",
        hintedAt: hints[0],
      })),
    },
  }),
);
assert.deepEqual(
  migrated?.artifacts.map((artifact) => artifact.hintedAt?.sectorName),
  ["Бета-1", "Гамма-2", "Дельта-3"],
  "миграция должна разнести уже сохранённые архивные сигналы",
);

console.log("Artifact hint distribution checks passed");
