import assert from "node:assert/strict";
import {
  DERELICT_APPROACH_CONFIG,
  DERELICT_RISK_CHANCE,
} from "../src/game/slices/locations/constants.ts";
import { readFileSync } from "node:fs";

assert.deepEqual(Object.keys(DERELICT_APPROACH_CONFIG), [
  "boarding",
  "engineering",
  "archive",
]);
assert.equal(DERELICT_APPROACH_CONFIG.boarding.scoutDamage, 5);
assert.equal(DERELICT_APPROACH_CONFIG.engineering.sparesMultiplier, 1.5);
assert.equal(DERELICT_APPROACH_CONFIG.archive.scannerDamage, 10);
assert.equal(DERELICT_RISK_CHANCE, 0.25);
const derelictSource = readFileSync(
  new URL("../src/game/slices/locations/helpers/exploreDerelictShip.ts", import.meta.url),
  "utf8",
);
assert.match(
  derelictSource,
  /const activeCrew = getLivingShipCrew\(crew\);[\s\S]*?activeCrew\.some\(\(member\) => member\.profession === "scout"\)/,
  "погибший разведчик не должен открывать исследование дрейфующего корабля",
);
assert.match(
  derelictSource,
  /approach === "engineering"[\s\S]*?!activeCrew\.some\(\(member\) => member\.profession === "engineer"\)/,
  "погибший инженер не должен открывать инженерный подход",
);
assert.ok(
  derelictSource.indexOf("const rareMineralsCargo") <
    derelictSource.indexOf("const electronicsCargo") &&
    derelictSource.indexOf("const electronicsCargo") <
      derelictSource.indexOf("const sparesCargo"),
  "при ограниченном трюме дрейфующий корабль должен сохранять редкие минералы раньше обычных деталей",
);

console.log("Derelict approach checks passed");
