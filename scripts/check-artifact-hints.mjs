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
const { getArchiveHintLocations, getArtifactEffectValue } = jiti(
  "../src/game/artifacts/utils.ts",
);
const { ANCIENT_ARTIFACTS } = jiti("../src/game/constants/artifacts.ts");
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");

assert.ok(
  ANCIENT_ARTIFACTS.every((artifact) => !/^\p{Extended_Pictographic}/u.test(artifact.name)),
  "названия артефактов не должны дублировать иконку эффекта в карточке",
);

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

const stateWithBoosts = (artifactId) => ({
  crew: [],
  research: { researchedTechs: [] },
  activeEffects: [
    {
      targetArtifactId: artifactId,
      effects: [{ type: "artifact_boost", value: 1 }],
    },
  ],
});

const flagArtifact = ANCIENT_ARTIFACTS.find((a) => a.id === "ai_neural_link");
assert.equal(
  flagArtifact.canBoost,
  false,
  "ИИ Нейросеть остаётся флаговым артефактом без усиления",
);
assert.equal(
  getArtifactEffectValue(flagArtifact, stateWithBoosts(flagArtifact.id)),
  flagArtifact.effect.value,
  "флаговый артефакт не раздувает своё value и не рисует фальшивое «1 → 2»",
);

const boostableArtifact = ANCIENT_ARTIFACTS.find((a) => a.id === "artifact_compass");
assert.equal(
  getArtifactEffectValue(boostableArtifact, stateWithBoosts(boostableArtifact.id)),
  boostableArtifact.effect.value * 2,
  "обычный числовой артефакт по-прежнему усиливается ритуалом",
);

console.log("Artifact hint distribution checks passed");
