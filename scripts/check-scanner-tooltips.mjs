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
const t = (key) => key;

const infoFor = (loc, scanRange, isRevealed = false) =>
  getScannerInfo(loc, scanRange, isRevealed, t);

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
