import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (file) => readFileSync(path.join(root, file), "utf8");

const contracts = source("src/game/contracts/generatePlanetContracts.ts");
const crystallineStart = contracts.indexOf("crystalline: () =>");
const crystallineEnd = contracts.indexOf("    };", crystallineStart);
assert.ok(crystallineStart >= 0 && crystallineEnd > crystallineStart);
assert.doesNotMatch(
  contracts.slice(crystallineStart, crystallineEnd),
  /timeLimit:\s*15/,
  "artifact hunt must not have a deadline",
);

assert.match(
  source("src/game/components/PlanetPanel.tsx"),
  /contracts\.turns_after_accept/,
  "timed offers must disclose their deadline before acceptance",
);
assert.match(
  source("src/game/slices/gameLoop/processors/processRandomEvents.ts"),
  /member\.race !== "synthetic"[\s\S]*member\.health - VIRUS_ORGANIC_DAMAGE/,
  "untreated virus must damage living organic crew",
);
assert.match(
  source("src/game/components/EventPanels.tsx"),
  /galaxy\.labels\.fuel_recovery/,
  "zero fuel must point to fuel synthesis",
);

console.log("Run rules checks passed");
