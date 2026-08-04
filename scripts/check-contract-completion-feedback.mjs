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
let applyPatrolContractCompletions;
try {
  ({ applyPatrolContractCompletions } = jiti(
    "../src/game/slices/travel/helpers/patrolCompletions.ts",
  ));
} catch {
  // The assertion below documents the required completion boundary.
}

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

assert.equal(
  typeof applyPatrolContractCompletions,
  "function",
  "patrol completion results must be queued after their state mutation",
);

const completedPatrol = { id: "patrol-completed", reward: 75 };
let patrolState = {
  credits: 25,
  completedContractIds: [],
  activeContracts: [completedPatrol, { id: "still-active", reward: 10 }],
};
const queuedCompletions = [];
const getPatrolState = () => ({
  ...patrolState,
  showContractCompletion: (completion) => {
    assert.equal(
      patrolState.credits,
      100,
      "credits must be awarded before the completion becomes observable",
    );
    assert.deepEqual(
      patrolState.completedContractIds,
      ["patrol-completed"],
      "completed contract ID must be recorded before the completion becomes observable",
    );
    assert.deepEqual(
      patrolState.activeContracts.map((contract) => contract.id),
      ["still-active"],
      "completed patrol must be removed before the completion becomes observable",
    );
    queuedCompletions.push(completion);
  },
});
const setPatrolState = (update) => {
  patrolState = { ...patrolState, ...update(patrolState) };
};

applyPatrolContractCompletions(
  {
    totalReward: 75,
    completedIds: ["patrol-completed"],
    newActiveContracts: [{ id: "still-active", reward: 10 }],
    completions: [
      {
        contract: completedPatrol,
        credits: 75,
        reputationChanges: [],
        experience: [],
      },
    ],
  },
  setPatrolState,
  getPatrolState,
);
assert.equal(
  queuedCompletions.length,
  1,
  "patrol completion must still be enqueued after its rewards are applied",
);

console.log("contract completion feedback checks passed");
