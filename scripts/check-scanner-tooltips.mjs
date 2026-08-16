import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { getScannerInfo } = jiti("../src/game/components/sectorMap/helpers.ts");
const { ANCIENT_BOSSES } = jiti("../src/game/constants/bosses.ts");
const { canDetectObject } = jiti("../src/game/slices/scanner/helpers/canDetectObject.ts");
const { getRegularScannerRange } = jiti(
  "../src/game/slices/scanner/helpers/getRegularScannerRange.ts",
);
const { getModuleTechBonuses } = jiti("../src/game/modules/techBonuses.ts");
const { getModuleHealthTechDelta } = jiti("../src/game/modules/techBonuses.ts");
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");
const t = (key) => key;

const scannerLabelSource = readFileSync(
  path.join(root, "src/game/components/DistressSignalPanel.tsx"),
  "utf8",
);
const sectorMapSource = readFileSync(
  path.join(root, "src/game/components/SectorMap.tsx"),
  "utf8",
);
assert.match(
  scannerLabelSource,
  /if \(scanRange > 0\) return String\(scanRange\);/,
  "эффективная дальность не должна превращаться в тир сканера",
);
assert.doesNotMatch(
  scannerLabelSource,
  /scanner_levels/,
  "карта и диагностика не должны выводить тир по технологической дальности",
);
assert.match(
  sectorMapSource,
  /galaxy\.labels\.scanner_range/,
  "карта сектора должна явно подписывать эффективную дальность",
);
assert.match(
  sectorMapSource,
  // Якоря — разметка, а не комментарии рядом с ней: прошлый вариант регулярки
  // ловил `{/* Current sector indicator */}`, и проверка развалилась, когда
  // комментарий потерялся при добавлении карточки правила сектора
  /className="flex items-start justify-between gap-2">[\s\S]*?pointer-events-auto bg-\[rgba\(255,176,0,0\.15\)\] border-2 border-accent[\s\S]*?pointer-events-auto bg-\[rgba\(0,255,65,0\.1\)\] border border-\[#00ff41\]/,
  "индикатор сканера должен оставаться отдельной компактной карточкой в правом верхнем углу",
);

const infoFor = (loc, scanRange, isRevealed = false) =>
  getScannerInfo(loc, scanRange, isRevealed, t);
const isUnknown = (info) =>
  info.some((line) => line.includes("locations.unknown_"));

assert.deepEqual(
  infoFor({ name: "Relay One", type: "station", stationType: "trade" }, 0),
  ["📍 Relay One"],
  "тип станции не должен быть виден без сканера",
);
assert.deepEqual(
  infoFor({ name: "Relay One", type: "station", stationType: "trade" }, 3),
  ["📍 Relay One", "🏷️ locations.station_types.trade"],
  "сканер диапазона 3 должен раскрывать тип станции",
);
assert.deepEqual(
  infoFor({ name: "New Dawn", type: "planet", planetType: "Ледяная" }, 0),
  ["📍 New Dawn"],
  "планета без сканера должна показывать своё название",
);
assert.deepEqual(
  infoFor({ name: "Ancient Belt", type: "asteroid_belt", asteroidTier: 4 }, 0),
  ["📍 Ancient Belt"],
  "пояс астероидов без сканера должен показывать своё название",
);
assert.deepEqual(
  infoFor({ name: "Ancient Belt", type: "asteroid_belt", asteroidTier: 4 }, 3),
  ["📍 Ancient Belt", "🏷️ locations.tier: 4"],
  "сканер диапазона 3 должен раскрывать тир пояса астероидов",
);
assert.deepEqual(
  infoFor({ name: "SOS-7", type: "distress_signal" }, 0),
  ["🆘 locations.distress_signal"],
  "сигнал бедствия не должен превращаться в неизвестный объект",
);
assert.deepEqual(
  infoFor(
    {
      name: "SOS-7",
      type: "distress_signal",
      signalType: "survivors",
      signalRevealed: true,
    },
    0,
    true,
  ),
  ["🆘 locations.distress_signal", "👥 locations.survivors"],
  "раскрытый сигнал должен показывать свой тип",
);

const bossLoc = { name: "Ancient Guardian", type: "boss", bossId: ANCIENT_BOSSES[0].id };
assert.deepEqual(
  infoFor(bossLoc, 5),
  ["❓ locations.unknown_ship"],
  "тултип босса не должен раскрывать данные при scanRange < 8 (см. canScanObject)",
);
assert.ok(
  infoFor(bossLoc, 8).some((line) => line.includes(ANCIENT_BOSSES[0].name)),
  "тултип босса должен раскрывать данные при scanRange >= 8, синхронно со значком на карте",
);

for (const { loc, tier, threshold } of [
  { loc: { name: "Courier", type: "friendly_ship" }, threshold: 3 },
  { loc: { name: "Wreck", type: "derelict_ship" }, threshold: 3 },
  { loc: { name: "Raider", type: "enemy", threat: 1 }, tier: 1, threshold: 3 },
  { loc: { name: "Raider", type: "enemy", threat: 2 }, tier: 2, threshold: 5 },
  { loc: { name: "Raider", type: "enemy", threat: 3 }, tier: 3, threshold: 8 },
  { loc: { name: "Void Ray", type: "space_monster", threat: 6 }, tier: 6, threshold: 8 },
  { loc: { name: "Rift", type: "anomaly", anomalyTier: 1 }, tier: 1, threshold: 3 },
  { loc: { name: "Rift", type: "anomaly", anomalyTier: 2 }, tier: 2, threshold: 5 },
  { loc: { name: "Rift", type: "anomaly", anomalyTier: 3 }, tier: 3, threshold: 8 },
  { loc: { name: "Rift", type: "anomaly", anomalyTier: 4 }, tier: 4, threshold: 15 },
  { loc: { name: "Ionic Storm", type: "storm", stormType: "ionic" }, threshold: 5 },
  { loc: bossLoc, tier: 3, threshold: 8 },
]) {
  assert.equal(
    canDetectObject(loc.type, threshold - 1, tier),
    false,
    `${loc.type} должен быть скрыт до диапазона ${threshold}`,
  );
  assert.equal(
    canDetectObject(loc.type, threshold, tier),
    true,
    `${loc.type} должен быть виден с диапазона ${threshold}`,
  );
  assert.equal(
    isUnknown(infoFor(loc, threshold - 1)),
    true,
    `тултип ${loc.type} должен быть неизвестным до диапазона ${threshold}`,
  );
  assert.equal(
    isUnknown(infoFor(loc, threshold)),
    false,
    `тултип ${loc.type} должен совпадать с видимостью на карте при диапазоне ${threshold}`,
  );
}

assert.equal(
  canDetectObject("boss", 8, 3),
  true,
  "диапазон 8 Ока Сингулярности должен раскрывать босса",
);
assert.equal(
  canDetectObject("anomaly", 8, 4),
  false,
  "диапазон 8 Ока Сингулярности не должен обходить порог аномалии 4 тира",
);

const scannerResearch = {
  researchedTechs: ["scanner_mk2", "quantum_scanner", "deep_scan", "ancient_power"],
};
const mk1 = { id: 1, type: "scanner", level: 1, scanRange: 3, health: 100 };
assert.equal(mk1.scanRange, 3, "MK-1 tier uses hardware range");
assert.equal(
  getRegularScannerRange([mk1], scannerResearch),
  12,
  "MK-1 gets +9 technology range without becoming a higher hardware tier",
);

const migrated = loadWithMigrations(
  JSON.stringify({
    version: 10,
    state: { ship: { modules: [{ ...mk1, scanRange: 12 }] } },
  }),
);
assert.equal(migrated.ship.modules[0].scanRange, 3, "migration restores MK-1 hardware range");
assert.equal(
  getRegularScannerRange(migrated.ship.modules, scannerResearch),
  12,
  "migration must not double the scan technology bonus",
);

assert.equal(
    getModuleHealthTechDelta(
        { id: 1, type: "cargo", maxHealth: 110 },
    { researchedTechs: ["reinforced_hull"] },
  ),
  10,
    "module durability display must show the applied technology delta",
);

assert.equal(
  getModuleHealthTechDelta(
    { id: 1, type: "reactor", maxHealth: 217 },
    { researchedTechs: ["reinforced_hull", "storm_shields", "ancient_power"] },
  ),
  97,
  "upgraded durability must be displayed from its real base value",
);
const durabilityMigrated = loadWithMigrations(
  JSON.stringify({
    version: 11,
    state: {
      research: {
        researchedTechs: ["reinforced_hull", "storm_shields", "ancient_power"],
      },
      ship: {
        modules: [
          { id: 1, type: "reactor", level: 2, maxHealth: 120, health: 120 },
        ],
      },
    },
  }),
);
assert.deepEqual(
  durabilityMigrated.ship.modules[0],
  { id: 1, type: "reactor", level: 2, maxHealth: 217, health: 217 },
  "migration must restore durability bonuses lost by past upgrades",
);
assert.equal(
  (readFileSync(
    path.join(root, "src/game/slices/shop/helpers/buyUpgrade.ts"),
    "utf8",
  ).match(/applyTechBonusesToNewModule\(/g) ?? []).length,
  2,
  "both regular and engine upgrades must retain durability bonuses",
);

const techResearch = {
  researchedTechs: [
    "reinforced_hull",
    "efficient_reactor",
    "shield_booster",
    "storm_shields",
    "targeting_matrix",
    "modular_arsenal",
    "scanner_mk2",
    "cargo_expansion",
    "ion_drive",
    "lab_network",
  ],
};
for (const [type, expected] of [
  ["reactor", ["module_health", "module_power"]],
  ["shield", ["module_health", "shield_strength", "shield_regen"]],
  ["weaponbay", ["module_health", "weapon_damage", "weapon_slots"]],
  ["cargo", ["module_health", "cargo_capacity"]],
  ["engine", ["module_health", "fuel_efficiency"]],
  ["lab", ["module_health", "research_speed"]],
  ["scanner", ["module_health", "scan_range"]],
]) {
  assert.deepEqual(
    getModuleTechBonuses({ type }, techResearch).map((bonus) => bonus.type),
    expected,
    `${type} tech bonuses must be shown`,
  );
}

const originalRandom = Math.random;
Math.random = () => {
  throw new Error("тултип не должен бросать случайный кубик");
};
try {
  for (const [loc, scanRange] of [
    [{ name: "Ancient Belt", type: "asteroid_belt", asteroidTier: 4 }, 8],
    [{ name: "Ionic Storm", type: "storm", stormType: "ionic" }, 8],
    [
      {
        name: "Ancient Guardian",
        type: "boss",
        bossId: ANCIENT_BOSSES[0].id,
      },
      8,
    ],
  ]) {
    assert.doesNotThrow(() => infoFor(loc, scanRange));
  }
} finally {
  Math.random = originalRandom;
}

console.log("Scanner tooltip checks passed");
