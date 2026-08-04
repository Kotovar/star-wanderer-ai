import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/game/components/ShipStatsPanel.tsx", import.meta.url),
  "utf8",
);

assert.match(source, /import \{ getTotalEvasion \} from "@\/game\/slices\/ship\/helpers";/);
assert.match(source, /const getCrewCapacity = useGameStore\(\(s\) => s\.getCrewCapacity\);/);
assert.match(source, /const crewCapacity = getCrewCapacity\(\);/);
assert.match(source, /const evasion = getTotalEvasion\(useGameStore\.getState\(\)\);/);
assert.match(source, /\{crew\.length\}\s*\/\s*\{crewCapacity\}/);
assert.match(source, /\{evasion\}%/);
assert.doesNotMatch(source, /getBestByProfession|captain\?\.level|ship\.bonusEvasion/);

console.log("Ship status consistency check passed.");
