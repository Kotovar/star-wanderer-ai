import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [shipGrid, styles, ru, en] = await Promise.all([
  readFile(new URL("../src/game/components/ShipGrid.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/locales/ru.json", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/locales/en.json", import.meta.url), "utf8"),
]);

assert.doesNotMatch(
  shipGrid,
  /PowerGrid|getPowerLinks|showPowerLines|ship\.power_bus|ship\.circuits_online/,
  "ShipGrid has no power-line UI or controls",
);
assert.doesNotMatch(styles, /ship-power-|ship-power-flow/, "power-line styles are removed");
assert.equal("power_bus" in JSON.parse(ru).ship, false, "Russian power-line label is removed");
assert.equal("circuits_online" in JSON.parse(en).ship, false, "English power-line label is removed");

console.log("Ship power-line checks passed");
