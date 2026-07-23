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
const { getScannerInfo } = jiti("../src/game/components/sectorMap/helpers.ts");
const { ANCIENT_BOSSES } = jiti("../src/game/constants/bosses.ts");
const { canDetectObject } = jiti("../src/game/slices/scanner/helpers/canDetectObject.ts");
const t = (key) => key;

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
