# Faction Delivery Choices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make a subset of ordinary deliveries reveal a mandatory two-sided faction decision at the destination, with explicit credit and reputation trade-offs.

**Architecture:** Keep ordinary delivery acceptance, cargo, completion feedback, and reputation ripple. A compact optional factionDelivery payload is generated only for eligible cross-faction planet deliveries. The existing central completeDeliveryContract action opens a persisted pending decision instead of paying immediately; one resolver performs the chosen settlement exactly once, then reuses the existing completion queue.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand with Immer, Node assertion scripts with the project TypeScript loader, JSON locale catalogs.

## Global Constraints

- Only non-race, non-Frontier delivery contracts whose source and target are inhabited planets of different races can receive a faction decision; no other contract type changes.
- Eligible deliveries roll the conflict with a fixed 35% chance. The standard generator has at most one delivery candidate on a board, so no extra board-level state is needed.
- The destination scene has exactly two choices and cannot be dismissed through backdrop, Escape, or a third neutral button.
- The issuer outcome preserves the normal delivery result: full credits and +2 issuer reputation. The local outcome pays Math.floor(reward * 0.65), applies +4 local reputation and -4 issuer reputation through the existing reputation action and its ripple.
- Crew experience is unchanged for both outcomes. No new currency, item reward, chain, combat encounter, or contract type is introduced.
- Player-visible copy is localized in Russian and English. Keep the contract card spoiler-free: it remains an ordinary delivery until the target is reached.
- Persist only the decision’s contract ID. Old saves gain null; stale decisions are cleared without credit, cargo, reputation, or completion mutation.
- Preserve unrelated work. Before each commit inspect git status --short; stage only files listed in the task. Add no dependencies.

---

### Task 1: Define faction-delivery data, safe generation, and save migration

**Files:**

- Create: src/game/contracts/factionDelivery.ts
- Modify: src/game/types/contracts.ts:5-100
- Modify: src/game/types/game.ts:1-160
- Modify: src/game/contracts/generatePlanetContracts.ts:1-755
- Modify: src/game/constants/version.ts:1-5
- Modify: src/game/saves/migrations.ts:20-390
- Modify: src/game/initial/initialState.ts:147-190
- Create: scripts/check-faction-delivery-choices.mjs
- Modify: package.json

**Interfaces:**

~~~ts
export type FactionDeliveryContext =
  | "relief"
  | "reconstruction"
  | "research_access"
  | "diplomatic_claim";

export type FactionDelivery = {
  localRace: RaceId;
  context: FactionDeliveryContext;
};

export type PendingContractDecision = { contractId: string };
export type FactionDeliveryChoice = "issuer" | "local";

Contract.factionDelivery?: FactionDelivery;
GameState.pendingContractDecision: PendingContractDecision | null;

export const FACTION_DELIVERY_CHANCE = 0.35;
export const getFactionDeliveryContext = (
  cargo: DeliveryGoods,
): FactionDeliveryContext;
export const getFactionDeliveryReward = (reward: number): number;
export const getValidPendingContractDecision = (
  pending: PendingContractDecision | null | undefined,
  activeContracts: Contract[] | undefined,
): PendingContractDecision | null;
~~~

- [ ] **Step 1: Write the failing generator, payout, and migration checks**

Create scripts/check-faction-delivery-choices.mjs. Use the jiti setup from scripts/check-frontier-contracts.mjs, then import generatePlanetContracts, the new faction helper, and loadWithMigrations. Define deterministic random control:

~~~js
const withRandomSequence = (values, callback) => {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => values[index++] ?? 0;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
};

assert.equal(getFactionDeliveryReward(999), 649);
assert.equal(getFactionDeliveryContext("fuel"), "relief");
assert.equal(getFactionDeliveryContext("spares"), "relief");
assert.equal(getFactionDeliveryContext("construction_materials"), "reconstruction");
assert.equal(getFactionDeliveryContext("scientific_equipment"), "research_access");
assert.equal(getFactionDeliveryContext("diplomatic_cargo"), "diplomatic_claim");
~~~

Build a source sector with one inhabited Human planet and a target sector with exactly one inhabited Synthetic planet. Force the ordinary delivery candidate and a 0.34 decision roll:

~~~js
const factionDelivery = withRandomSequence(
  [0, 0.99, 0.21, 0, 0, 0, 0.34, 0, 0],
  () =>
    generatePlanetContracts(
      "Пустынная",
      humanSource,
      "human-source",
      0,
      [humanSource, syntheticTarget],
      "human",
      null,
      { canOfferCombat: true, allowFrontier: false },
    ).find((contract) => contract.type === "delivery"),
);
assert.deepEqual(factionDelivery?.factionDelivery, {
  localRace: "synthetic",
  context: "relief",
});
~~~

Repeat the fixture with a 0.35 decision roll, a same-race target, a station target, and allowFrontier: true; each must have factionDelivery === undefined. Add old-save and pending validation assertions:

~~~js
const legacy = loadWithMigrations(JSON.stringify({
  version: 25,
  state: { ship: { modules: [] }, activeContracts: [] },
}));
assert.equal(legacy?.pendingContractDecision, null);
assert.deepEqual(
  getValidPendingContractDecision(
    { contractId: "valid" },
    [{ id: "valid", factionDelivery: { localRace: "synthetic", context: "relief" } }],
  ),
  { contractId: "valid" },
);
assert.equal(getValidPendingContractDecision({ contractId: "stale" }, []), null);
~~~

Add this package command:

~~~json
"check:faction-delivery-choices": "node --no-warnings scripts/check-faction-delivery-choices.mjs"
~~~

- [ ] **Step 2: Run the new check and verify RED**

Run:

~~~bash
npm run check:faction-delivery-choices
~~~

Expected: failure because neither faction-delivery helper/types nor the 25-to-26 migration exists.

- [ ] **Step 3: Add the small shared data contract**

In src/game/types/contracts.ts, put FactionDeliveryContext, FactionDelivery, PendingContractDecision, and FactionDeliveryChoice beside FrontierSubsidy; add factionDelivery?: FactionDelivery next to other optional contract metadata.

Create src/game/contracts/factionDelivery.ts with these exact rules:

~~~ts
export const FACTION_DELIVERY_CHANCE = 0.35;
export const LOCAL_DELIVERY_REWARD_MULTIPLIER = 0.65;

export const getFactionDeliveryContext = (
  cargo: DeliveryGoods,
): FactionDeliveryContext => {
  if (cargo === "spares" || cargo === "fuel") return "relief";
  if (cargo === "construction_materials") return "reconstruction";
  if (cargo === "scientific_equipment") return "research_access";
  return "diplomatic_claim";
};

export const getFactionDeliveryReward = (reward: number): number =>
  Math.floor(reward * LOCAL_DELIVERY_REWARD_MULTIPLIER);

export const getValidPendingContractDecision = (
  pending: PendingContractDecision | null | undefined,
  activeContracts: Contract[] | undefined,
): PendingContractDecision | null =>
  pending && activeContracts?.some(
    (contract) => contract.id === pending.contractId && contract.factionDelivery,
  )
    ? pending
    : null;
~~~

Use only type imports from common types; do not create another store or random generator.

- [ ] **Step 4: Generate only safe cross-faction decisions**

In the existing standard delivery factory in src/game/contracts/generatePlanetContracts.ts, after choosing dest and before constructing the return object, calculate:

~~~ts
const localRace = dest.type === "planet" ? dest.dominantRace : undefined;
const factionDelivery =
  !context.allowFrontier &&
  dominantRace !== undefined &&
  dest.type === "planet" &&
  !dest.isEmpty &&
  localRace !== undefined &&
  localRace !== dominantRace &&
  Math.random() < FACTION_DELIVERY_CHANCE
    ? {
        localRace,
        context: getFactionDeliveryContext(cargoKey),
      }
    : undefined;
~~~

Spread the value only when it exists:

~~~ts
...(factionDelivery ? { factionDelivery } : {}),
~~~

This branch is inside the ordinary delivery factory, so race quests, crisis response, station/friendly-ship targets, and every other contract type cannot acquire the field. Keep target selection, deadline, cargo, and reward logic unchanged.

- [ ] **Step 5: Persist and migrate the pending decision**

Add pendingContractDecision: null beside pendingContractCompletions in initialState and GameState. Raise CURRENT_STATE_VERSION from 25 to 26; append this migration:

~~~ts
25: (raw) => ({
  ...(raw as GameState),
  stateVersion: 26,
  pendingContractDecision: null,
}),
~~~

Do not retrofit conflict metadata onto old active deliveries: their absent field deliberately takes the unchanged completion path.

- [ ] **Step 6: Verify GREEN and commit the generation foundation**

Run:

~~~bash
npm run check:faction-delivery-choices
npm run check:contract-targets
npm run type-check
git diff --check
~~~

Then inspect git status --short and commit only this task:

~~~bash
git add package.json scripts/check-faction-delivery-choices.mjs src/game/constants/version.ts src/game/contracts/factionDelivery.ts src/game/contracts/generatePlanetContracts.ts src/game/initial/initialState.ts src/game/saves/migrations.ts src/game/types/contracts.ts src/game/types/game.ts
git commit -m "feat: generate faction delivery decisions"
~~~

---

### Task 2: Resolve a destination choice atomically through the contract slice

**Files:**

- Modify: src/game/slices/contracts/contractsSlice.ts:25-260
- Modify: src/game/slices/contracts/helpers/completeDeliveryContract.ts:1-80
- Modify: src/game/slices/gameManagement/gameManagementSlice.ts:20-205
- Modify: src/game/types/game.ts:330-520
- Modify: scripts/check-faction-delivery-choices.mjs

**Interfaces:**

~~~ts
ContractsSlice.resolveFactionDeliveryDecision(
  choice: FactionDeliveryChoice,
): void;

GameContracts.resolveFactionDeliveryDecision(
  choice: FactionDeliveryChoice,
): void;
~~~

- [ ] **Step 1: Extend the focused check with a real slice fixture**

At the end of scripts/check-faction-delivery-choices.mjs, first dynamically import scripts/register-ui-loader.mjs and take setUiState from it; only then dynamically import createContractsSlice so its store import resolves to the fixture. Use one mutable fixture so giveCrewExperience reads the same state as the slice:

~~~js
const { setUiState } = await import("./register-ui-loader.mjs");
const { createContractsSlice } = await import(
  "../src/game/slices/contracts/contractsSlice.ts"
);
~~~

~~~js
const makeDecisionState = () => {
  const contract = {
    id: "choice-delivery",
    type: "delivery",
    reward: 1000,
    cargo: "fuel",
    targetLocationId: "synthetic-target",
    sourceDominantRace: "human",
    factionDelivery: { localRace: "synthetic", context: "relief" },
  };
  const reputationCalls = [];
  const state = {
    activeContracts: [contract],
    completedContractIds: [],
    pendingContractCompletions: [],
    pendingContractDecision: null,
    currentLocation: { id: "synthetic-target", type: "planet" },
    ship: { cargo: [{ item: "fuel", quantity: 10, contractId: contract.id }] },
    credits: 100,
    crew: [],
    raceReputation: { human: 0, synthetic: 0 },
    frontierChainClosed: false,
    frontierContractsCompleted: 0,
    addLog: () => {},
    gainExp: () => undefined,
    changeReputation: (raceId, amount) => {
      reputationCalls.push({ raceId, amount });
      state.raceReputation[raceId] = (state.raceReputation[raceId] ?? 0) + amount;
    },
  };
  const set = (update) => {
    const patch = typeof update === "function" ? update(state) : update;
    if (patch) Object.assign(state, patch);
    setUiState(state);
  };
  Object.assign(state, createContractsSlice(set, () => state));
  setUiState(state);
  return { contract, reputationCalls, state };
};
~~~

Write these failing assertions:

~~~js
const issuer = makeDecisionState();
issuer.state.completeDeliveryContract(issuer.contract.id);
assert.deepEqual(issuer.state.pendingContractDecision, { contractId: issuer.contract.id });
assert.equal(issuer.state.credits, 100);
assert.equal(issuer.state.ship.cargo.length, 1);
assert.equal(issuer.state.activeContracts.length, 1);

issuer.state.resolveFactionDeliveryDecision("issuer");
assert.equal(issuer.state.credits, 1100);
assert.deepEqual(issuer.reputationCalls, [{ raceId: "human", amount: 2 }]);
assert.equal(issuer.state.ship.cargo.length, 0);
assert.equal(issuer.state.pendingContractDecision, null);
assert.equal(issuer.state.pendingContractCompletions[0].credits, 1000);

const local = makeDecisionState();
local.state.completeDeliveryContract(local.contract.id);
local.state.resolveFactionDeliveryDecision("local");
assert.equal(local.state.credits, 750);
assert.deepEqual(local.reputationCalls, [
  { raceId: "human", amount: -4 },
  { raceId: "synthetic", amount: 4 },
]);
assert.equal(local.state.pendingContractCompletions[0].credits, 650);

const ordinary = makeDecisionState();
delete ordinary.contract.factionDelivery;
ordinary.state.completeDeliveryContract(ordinary.contract.id);
assert.equal(ordinary.state.pendingContractDecision, null);
assert.equal(ordinary.state.credits, 1100);
assert.deepEqual(ordinary.reputationCalls, [{ raceId: "human", amount: 2 }]);
assert.equal(ordinary.state.pendingContractCompletions[0].credits, 1000);
~~~

Call resolveFactionDeliveryDecision("local") a second time and assert no additional credits, reputation calls, completion entry, or cargo mutation. Finally set currentLocation to another planet before resolving and assert it clears only pendingContractDecision while keeping the active contract, cargo, and credits unchanged.

- [ ] **Step 2: Run the focused check and verify RED**

Run:

~~~bash
npm run check:faction-delivery-choices
~~~

Expected: failure because the central delivery action pays immediately and no resolver exists.

- [ ] **Step 3: Add one pending-decision action and one settlement path**

Import FactionDeliveryChoice into contractsSlice.ts, add resolveFactionDeliveryDecision to ContractsSlice and the manually composed GameContracts interface in src/game/types/game.ts, and import the resolver from the helpers barrel. Wire the slice method directly to that helper; this keeps component selectors type-safe.

In completeDeliveryContract.ts, retain the existing ordinary path. Before it mutates a contract with factionDelivery, require a matching contract cargo entry and target location, then set only:

~~~ts
pendingContractDecision: { contractId },
~~~

and return. If the contract already has a pending decision, return without creating another dialog.

Export a resolver from the same helper. It must first find the pending contract and validate all four conditions: the pending record exists, the contract is still active, it still has factionDelivery and sourceDominantRace, and the current location plus contract cargo still match the target. On any invalid condition, set pendingContractDecision: null and return without any award.

For a valid decision, clear the pending record in the same state patch that removes cargo and active contract and records the completed ID. Calculate credits with the shared helper:

~~~ts
const credits =
  choice === "local"
    ? getFactionDeliveryReward(contract.reward)
    : contract.reward;
~~~

After the state patch, keep the current delivery XP call. Snapshot raceReputation, then call the existing action, never a direct reputation mutation:

~~~ts
if (choice === "local") {
  get().changeReputation(contract.sourceDominantRace, -4);
  get().changeReputation(contract.factionDelivery.localRace, 4);
} else {
  get().changeReputation(contract.sourceDominantRace, 2);
}
~~~

Call showContractCompletion with credits, getReputationChanges(before, get().raceReputation), and the unchanged XP result. Use two new localized log keys for issuer/local outcomes. Preserve normal completion log and logic exactly for contracts without factionDelivery.

- [ ] **Step 4: Validate pending state on both load paths**

Import getValidPendingContractDecision in gameManagementSlice.ts. In both loadGame and loadFromSlot, after loading/migrating contracts and before set({ ...saved }), normalize exactly once per path:

~~~ts
saved.pendingContractDecision = getValidPendingContractDecision(
  saved.pendingContractDecision,
  saved.activeContracts,
);
~~~

Do not clear a valid decision on normal load: the modal must reappear at the saved destination. Keep the existing behavior that clears transient completion and level-up queues.

- [ ] **Step 5: Verify GREEN and commit atomic resolution**

Run:

~~~bash
npm run check:faction-delivery-choices
node --no-warnings scripts/check-contract-completion-feedback.mjs
npm run check:reputation
npm run type-check
git diff --check
~~~

Then inspect git status --short and commit only this task:

~~~bash
git add scripts/check-faction-delivery-choices.mjs src/game/slices/contracts/contractsSlice.ts src/game/slices/contracts/helpers/completeDeliveryContract.ts src/game/slices/gameManagement/gameManagementSlice.ts src/game/types/game.ts
git commit -m "feat: resolve faction delivery choices"
~~~

---

### Task 3: Show the forced destination scene, localize it, and document the mechanic

**Files:**

- Create: src/game/components/FactionDeliveryDecisionModal.tsx
- Modify: src/app/page.tsx:18-35,575-585
- Modify: src/lib/locales/ru.json:990-1055,5870-5900
- Modify: src/lib/locales/en.json:990-1055,5870-5900
- Modify: scripts/check-faction-delivery-choices.mjs
- Modify: docs/CAMPAIGN_PROGRESSION.md
- Modify: docs/REPUTATION_TRADEOFFS.md
- Modify: docs/superpowers/specs/2026-08-13-faction-contract-choices-design.md

**Interfaces:**

~~~tsx
export function FactionDeliveryDecisionModal(): React.JSX.Element | null;
~~~

It reads pendingContractDecision, activeContracts, resolveFactionDeliveryDecision, and raceReputation from useGameStore; it derives the local payout with getFactionDeliveryReward rather than duplicating 0.65 in JSX.

- [ ] **Step 1: Add failing UI and locale assertions**

Extend scripts/check-faction-delivery-choices.mjs. Add `import { readFileSync } from "node:fs";` with its other Node imports, then use parsed locale JSON to assert the new component, dynamic mount, event guards, and both locale branches exist:

~~~js
const modalSource = readFileSync(
  new URL("../src/game/components/FactionDeliveryDecisionModal.tsx", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const ru = JSON.parse(readFileSync(new URL("../src/lib/locales/ru.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../src/lib/locales/en.json", import.meta.url), "utf8"));

assert.match(modalSource, /onInteractOutside={[\s\S]*preventDefault/);
assert.match(modalSource, /onEscapeKeyDown={[\s\S]*preventDefault/);
assert.match(modalSource, /resolveFactionDeliveryDecision\("issuer"/);
assert.match(modalSource, /resolveFactionDeliveryDecision\("local"/);
assert.match(pageSource, /FactionDeliveryDecisionModal/);
assert.equal(ru.contracts.faction_delivery.issuer_action, "Выполнить хартию");
assert.equal(en.contracts.faction_delivery.local_action, "Hand it to the locals");
~~~

Also assert the local-outcome locale string includes all three explicit values (65%, +4, -4), while the issuer outcome includes +2.

- [ ] **Step 2: Run the UI check and verify RED**

Run:

~~~bash
npm run check:faction-delivery-choices
~~~

Expected: failure because the component, page mount, and locale keys do not exist.

- [ ] **Step 3: Build the two-choice modal without a new screen or browser confirmation**

Create FactionDeliveryDecisionModal.tsx using Dialog, GameDialogContent, Button, RACES, and useTranslation. Return null when the pending ID does not resolve to an active contract with factionDelivery; the load normalizer and resolver remain the authority for invalid state.

Render the cargo-dependent context text and two compact outcome panels. The issuer action displays contract.reward and direct +2; the local action displays getFactionDeliveryReward(contract.reward), direct +4 local, and -4 issuer. Use the current locale’s race names and race colors. Configure the dialog as non-dismissable:

~~~tsx
<Dialog open onOpenChange={() => undefined}>
  <GameDialogContent
    variant="warning"
    showCloseButton={false}
    onEscapeKeyDown={(event) => event.preventDefault()}
    onInteractOutside={(event) => event.preventDefault()}
  >
~~~

Each button calls only resolveFactionDeliveryDecision("issuer") or resolveFactionDeliveryDecision("local"); do not add a cancel button, browser confirmation, or another game mode.

In src/app/page.tsx, add a client-only dynamic import following ContractCompletionModal and render FactionDeliveryDecisionModal immediately before ContractCompletionModal. The existing three delivery destination UIs need no change because they already call the central completion action.

- [ ] **Step 4: Add copy, logs, and documentation**

In both locale catalogs add contracts.faction_delivery keys for title, each cargo context, issuer/local panel labels, action labels, and visible consequence lines. Add game_logs.faction_delivery_issuer and game_logs.faction_delivery_local, with source/target race and actual reward interpolation. Keep direct values visible in each language.

Update docs/CAMPAIGN_PROGRESSION.md with a short section that says a subset of ordinary cross-faction deliveries can reveal a forced two-sided decision at the destination, then documents both payouts and the absence of a neutral exit. Update docs/REPUTATION_TRADEOFFS.md with the two direct reputation outcomes and a note that ordinary ripple still applies. Change the design document status to implemented only after all final checks in the next step are green.

- [ ] **Step 5: Verify the complete slice and commit it**

Run:

~~~bash
npm run check:faction-delivery-choices
npm run check:contract-targets
node --no-warnings scripts/check-contract-completion-feedback.mjs
npm run check:reputation
npm run check:log-placeholders
npm run type-check
npm run lint
npm run build
git diff --check
git status --short
~~~

Expected: the choice flow is deterministic, old deliveries remain unchanged, both outcomes render fully localized, no placeholder reaches the UI/log, and the dynamic game shell still bundles successfully.

Then commit only this task:

~~~bash
git add docs/CAMPAIGN_PROGRESSION.md docs/REPUTATION_TRADEOFFS.md docs/superpowers/specs/2026-08-13-faction-contract-choices-design.md scripts/check-faction-delivery-choices.mjs src/app/page.tsx src/game/components/FactionDeliveryDecisionModal.tsx src/lib/locales/en.json src/lib/locales/ru.json
git commit -m "feat: show faction choices at delivery targets"
~~~
