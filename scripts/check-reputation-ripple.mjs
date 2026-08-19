import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateReputationRippleEffects } from "../src/game/reputation/ripple.ts";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, { alias: { "@": path.join(root, "src") } });
const { changeReputation, getContractReputationImpact } = jiti(
  "../src/game/reputation/utils.ts",
);
const { createReputationSlice } = jiti(
  "../src/game/slices/reputation/createReputationSlice.ts",
);

const relations = { ally: 15, rival: -20, neutral: 0 };

assert.deepEqual(
  calculateReputationRippleEffects(relations, "primary", 10),
  [
    { id: "ally", change: 3 },
    { id: "rival", change: -4 },
  ],
);
assert.deepEqual(
  calculateReputationRippleEffects(relations, "primary", -10),
  [
    { id: "ally", change: -3 },
    { id: "rival", change: 4 },
  ],
);

const cappedHumanReputation = {
  human: 100,
  synthetic: 0,
  xenosymbiont: 0,
  krylorian: 0,
  voidborn: 0,
  crystalline: 0,
};
assert.deepEqual(
  changeReputation(cappedHumanReputation, "human", 10).affectedRaces,
  [],
  "a capped primary reputation must not cause ripple effects",
);

const knownRaceMutationState = {
  raceReputation: {
    human: 0,
    synthetic: 0,
    xenosymbiont: 0,
    krylorian: 0,
    voidborn: 0,
    crystalline: 0,
  },
  knownRaces: ["human", "synthetic"],
};
const setKnownRaceMutationState = (update) => {
  const patch =
    typeof update === "function"
      ? update(knownRaceMutationState)
      : update;
  if (patch && patch !== knownRaceMutationState) {
    Object.assign(knownRaceMutationState, patch);
  }
};
const getKnownRaceMutationState = () => ({
  ...knownRaceMutationState,
  addLog: () => undefined,
});
const reputationSlice = createReputationSlice(
  setKnownRaceMutationState,
  getKnownRaceMutationState,
);
reputationSlice.changeReputation("human", 10);
assert.deepEqual(
  knownRaceMutationState.raceReputation,
  {
    human: 10,
    synthetic: -2,
    xenosymbiont: 0,
    krylorian: 0,
    voidborn: 0,
    crystalline: 0,
  },
  "ripple effects must only change already discovered races",
);

assert.deepEqual(
  getContractReputationImpact({
    sourceDominantRace: "human",
    reputationReward: 4,
  },
  {
    human: 0,
    synthetic: 0,
    xenosymbiont: 0,
    krylorian: 0,
    voidborn: 0,
    crystalline: 0,
  },
  ["human", "synthetic", "crystalline"],
  ),
  [
    { raceId: "human", change: 4 },
    { raceId: "synthetic", change: -1 },
    { raceId: "crystalline", change: 1 },
  ],
  "friendly bounty reputation must keep the normal ripple with +4 primary rep",
);

const neutralReputation = {
  human: 0,
  synthetic: 0,
  xenosymbiont: 0,
  krylorian: 0,
  voidborn: 0,
  crystalline: 0,
};
assert.deepEqual(
  getContractReputationImpact(
    { isRaceQuest: true, requiredRace: "human" },
    neutralReputation,
    ["human", "synthetic"],
  ),
  [
    { raceId: "human", change: 10 },
    { raceId: "synthetic", change: -2 },
  ],
  "contract preview must not reveal or change undiscovered races",
);

assert.deepEqual(
  getContractReputationImpact(
    { type: "crisis_response", sourceDominantRace: "human" },
    neutralReputation,
    ["human", "synthetic"],
  ),
  [
    { raceId: "human", change: 4 },
    { raceId: "synthetic", change: 1 },
  ],
  "crisis contract preview must match its issuer and bystander rewards",
);

const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { setUiState } = await import("./register-ui-loader.mjs");
const { store: uiI18nStore } = await import("../src/lib/useTranslation.ts");
const { ReputationPanel } = await import(
  "../src/game/components/ReputationPanel.tsx"
);
const { acceptContract } = await import(
  "../src/game/slices/contracts/helpers/acceptContract.ts"
);

const reputationLogs = [];
const localizedLogState = {
  raceReputation: { ...neutralReputation },
  knownRaces: ["human", "synthetic"],
};
const setLocalizedLogState = (update) => {
  const patch =
    typeof update === "function" ? update(localizedLogState) : update;
  if (patch && patch !== localizedLogState) Object.assign(localizedLogState, patch);
};
const localizedLogSlice = createReputationSlice(
  setLocalizedLogState,
  () => ({
    ...localizedLogState,
    addLog: (message) => reputationLogs.push(message),
  }),
);
localizedLogSlice.changeReputation("human", 10);
assert.ok(
  reputationLogs.includes("Синтетики: -2"),
  "ripple logs must use localized race names",
);
reputationLogs.length = 0;
localizedLogSlice.changeReputation("human", 1);
assert.ok(
  reputationLogs.includes(
    "🤝 Люди: соглашение «Логистический пакт» активно.",
  ),
  "reaching friendly reputation must log agreement activation",
);
reputationLogs.length = 0;
localizedLogSlice.changeReputation("human", -1);
assert.ok(
  reputationLogs.includes(
    "⚠️ Люди: соглашение «Логистический пакт» приостановлено.",
  ),
  "dropping below friendly reputation must log agreement suspension",
);
reputationLogs.length = 0;
localizedLogState.raceReputation.human = 100;
localizedLogSlice.changeReputation("human", 10);
assert.deepEqual(
  reputationLogs,
  [],
  "a capped reputation change must not create a false log entry",
);

setUiState({
  raceReputation: neutralReputation,
  knownRaces: ["human"],
  showSectorMap: () => undefined,
});
uiI18nStore.changeLanguage("en");
await new Promise((done) => setTimeout(done, 0));
const englishReputationMarkup = renderToStaticMarkup(
  createElement(ReputationPanel),
);
assert.ok(
  englishReputationMarkup.includes("Human"),
  "a known race name must use the active locale",
);
assert.ok(
  englishReputationMarkup.includes(
    "Neutral — normal relations; race contracts available",
  ),
  "the neutral reputation description must explain the real contract threshold",
);
assert.doesNotMatch(
  englishReputationMarkup,
  /[А-Яа-яЁё]/,
  "Russian constants must not leak into the English reputation panel",
);
setUiState({
  raceReputation: { ...neutralReputation, human: 10 },
  knownRaces: ["human"],
  showSectorMap: () => undefined,
});
const lockedAgreementMarkup = renderToStaticMarkup(
  createElement(ReputationPanel),
);
assert.ok(
  lockedAgreementMarkup.includes("1 reputation to agreement"),
  "the reputation panel must show the exact points remaining until an agreement",
);
assert.ok(
  lockedAgreementMarkup.includes("+2 turns for timed contracts at acceptance"),
  "the reputation panel must explain the human agreement before it unlocks",
);
setUiState({
  raceReputation: { ...neutralReputation, human: 11 },
  knownRaces: ["human"],
  showSectorMap: () => undefined,
});
const activeAgreementMarkup = renderToStaticMarkup(
  createElement(ReputationPanel),
);
assert.ok(
  activeAgreementMarkup.includes("Agreement active"),
  "the reputation panel must mark an unlocked agreement as active",
);
uiI18nStore.changeLanguage("ru");

const onboardingLogs = [];
const onboardingState = {
  activeContracts: [],
  galaxy: { sectors: [{ id: 1, locations: [] }] },
  completedLocations: [],
  artifacts: [],
  research: { researchedTechs: [], unlockedRecipes: [] },
  activeCrisis: null,
  ship: { modules: [] },
  raceReputation: { ...neutralReputation },
  knownRaces: ["human", "synthetic"],
  turn: 1,
};
const setOnboardingState = (update) => {
  const patch =
    typeof update === "function" ? update(onboardingState) : update;
  if (patch) Object.assign(onboardingState, patch);
};
const getOnboardingState = () => ({
  ...onboardingState,
  addLog: (message) => onboardingLogs.push(message),
});
const contractWithRipple = (id) => ({
  id,
  type: "bounty",
  desc: "contracts.desc_bounty",
  reward: 100,
  sourceDominantRace: "human",
  reputationReward: 4,
});
const hintStorage = new Map();
const previousWindow = globalThis.window;
const previousLocalStorage = globalThis.localStorage;
try {
  globalThis.window = {};
  globalThis.localStorage = {
    getItem: (key) => hintStorage.get(key) ?? null,
    setItem: (key, value) => hintStorage.set(key, value),
  };
  assert.equal(
    acceptContract(
      contractWithRipple("diplomacy-hint-1"),
      setOnboardingState,
      getOnboardingState,
    ),
    true,
  );
  assert.equal(
    acceptContract(
      contractWithRipple("diplomacy-hint-2"),
      setOnboardingState,
      getOnboardingState,
    ),
    true,
  );
  assert.equal(
    onboardingLogs.filter((message) => message.startsWith("💡")).length,
    1,
    "the first multi-race contract must explain diplomacy consequences once",
  );
} finally {
  globalThis.window = previousWindow;
  globalThis.localStorage = previousLocalStorage;
}

console.log("Reputation ripple checks passed");
