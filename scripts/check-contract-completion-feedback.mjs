import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const { getReputationChanges } = jiti(
  "../src/game/contracts/completionRewards.ts",
);

assert.deepEqual(
  getReputationChanges({ human: 5 }, { human: 5 }),
  [],
  "unchanged reputation must not produce a row",
);
assert.deepEqual(
  getReputationChanges({ human: 5 }, { human: 8 }),
  [{ raceId: "human", change: 3 }],
  "positive reputation changes must use the final delta",
);
assert.deepEqual(
  getReputationChanges({ human: 5 }, { human: 2 }),
  [{ raceId: "human", change: -3 }],
  "negative reputation changes must use the final delta",
);
assert.deepEqual(
  getReputationChanges({ human: 99 }, { human: 100 }),
  [{ raceId: "human", change: 1 }],
  "capped reputation must report the actual final delta",
);

const [contractsType, modal] = await Promise.all([
  readFile(new URL("../src/game/types/contracts.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/game/components/ContractCompletionModal.tsx", import.meta.url), "utf8"),
]);

assert.match(
  contractsType,
  /interface ContractCompletionResult[\s\S]*experience: Array<\{ crewMemberId: number; name: string; amount: number \}>/,
  "completion result must store individual awarded XP",
);
assert.match(
  modal,
  /const completion = useGameStore[\s\S]*completion\.experience\.map/,
  "completion modal must render XP rows from its stored result",
);
assert.match(
  modal,
  /completion\.reputationChanges/,
  "completion modal must render stored reputation changes",
);

console.log("contract completion feedback checks passed");
