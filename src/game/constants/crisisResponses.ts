import type { GameState, SetState } from "@/game/types";
import type { CrisisResponse } from "@/game/types/crisis";
import type { ResearchResourceType } from "@/game/types/research";

const clampChance = (value: number) => Math.max(0.05, Math.min(0.55, value));

const hasActiveModule = (state: GameState, types: string[]) =>
  state.ship.modules.some(
    (module) =>
      types.includes(module.type) &&
      module.health > 0 &&
      !module.disabled &&
      !module.manualDisabled,
  );

const countActiveModules = (state: GameState, types: string[]) =>
  state.ship.modules.filter(
    (module) =>
      types.includes(module.type) &&
      module.health > 0 &&
      !module.disabled &&
      !module.manualDisabled,
  ).length;

const getCrewLevelTotal = (state: GameState, profession: string) =>
  state.crew
    .filter((crew) => crew.profession === profession && crew.health > 0)
    .reduce((sum, crew) => sum + (crew.level ?? 1), 0);

const hasResources = (
  state: GameState,
  resources: Partial<Record<ResearchResourceType, number>>,
) =>
  Object.entries(resources).every(
    ([type, amount]) =>
      (state.research.resources[type as ResearchResourceType] ?? 0) >=
      (amount ?? 0),
  );

const spendResources = (
  state: GameState,
  resources: Partial<Record<ResearchResourceType, number>>,
) => ({
  ...state.research.resources,
  ...Object.fromEntries(
    Object.entries(resources).map(([type, amount]) => [
      type,
      Math.max(
        0,
        (state.research.resources[type as ResearchResourceType] ?? 0) -
          (amount ?? 0),
      ),
    ]),
  ),
});

const getBestRace = (state: GameState) =>
  Object.entries(state.raceReputation).sort((a, b) => b[1] - a[1])[0];

export interface CrisisResponseDefinition {
  id: CrisisResponse;
  label: string;
  requirement: string;
  cost: string;
  getChance: (state: GameState) => number;
  canPay: (state: GameState) => boolean;
  pay: (state: GameState, set: SetState) => boolean;
}

export const CRISIS_RESPONSES: CrisisResponseDefinition[] = [
  {
    id: "combat",
    label: "Бой",
    requirement: "оружейный отсек и живой стрелок",
    cost: "250₢, 18 топлива, -30 HP всем оружейным отсекам",
    getChance: (state) =>
      clampChance(
        0.08 +
          countActiveModules(state, ["weaponbay"]) * 0.07 +
          getCrewLevelTotal(state, "gunner") * 0.035,
      ),
    canPay: (state) =>
      hasActiveModule(state, ["weaponbay"]) &&
      getCrewLevelTotal(state, "gunner") > 0 &&
      state.credits >= 250 &&
      state.ship.fuel >= 18,
    pay: (state, set) => {
      if (!getCrisisResponseDefinition("combat").canPay(state)) return false;
      set((s) => ({
        credits: s.credits - 250,
        ship: {
          ...s.ship,
          fuel: s.ship.fuel - 18,
          modules: s.ship.modules.map((module) =>
            module.type === "weaponbay"
              ? { ...module, health: Math.max(1, module.health - 30) }
              : module,
          ),
        },
      }));
      return true;
    },
  },
  {
    id: "science",
    label: "Наука",
    requirement: "лаборатория, сканер и живой учёный",
    cost: "12 технолома, 8 древних данных, 4 образца энергии",
    getChance: (state) =>
      clampChance(
        0.1 +
          getCrewLevelTotal(state, "scientist") * 0.035 +
          (state.research.researchedTechs.includes("lab_network") ? 0.08 : 0) +
          (state.research.researchedTechs.includes("quantum_scanner") ? 0.06 : 0) +
          (state.research.researchedTechs.includes("deep_scan") ? 0.06 : 0),
      ),
    canPay: (state) =>
      hasActiveModule(state, ["lab"]) &&
      hasActiveModule(state, ["scanner"]) &&
      getCrewLevelTotal(state, "scientist") > 0 &&
      hasResources(state, {
        tech_salvage: 12,
        ancient_data: 8,
        energy_samples: 4,
      }),
    pay: (state, set) => {
      if (!getCrisisResponseDefinition("science").canPay(state)) return false;
      set((s) => ({
        research: {
          ...s.research,
          resources: spendResources(state, {
            tech_salvage: 12,
            ancient_data: 8,
            energy_samples: 4,
          }),
        },
      }));
      return true;
    },
  },
  {
    id: "diplomacy",
    label: "Дипломатия",
    requirement: "3 известные расы и репутация 35+ хотя бы с одной",
    cost: "800₢ и -12 репутации у главного союзника",
    getChance: (state) => {
      const bestRep = Math.max(0, getBestRace(state)?.[1] ?? 0);
      return clampChance(0.08 + state.knownRaces.length * 0.025 + bestRep / 350);
    },
    canPay: (state) =>
      state.knownRaces.length >= 3 &&
      state.credits >= 800 &&
      (getBestRace(state)?.[1] ?? 0) >= 35,
    pay: (state, set) => {
      const bestRace = getBestRace(state);
      if (!bestRace || !getCrisisResponseDefinition("diplomacy").canPay(state)) {
        return false;
      }
      const [raceId, reputation] = bestRace;
      set((s) => ({
        credits: s.credits - 800,
        raceReputation: {
          ...s.raceReputation,
          [raceId]: Math.max(-100, reputation - 12),
        },
      }));
      return true;
    },
  },
  {
    id: "resources",
    label: "Ресурсы",
    requirement: "крупный аварийный резерв",
    cost: "1800₢ и 60 топлива",
    getChance: () => 0.42,
    canPay: (state) => state.credits >= 1800 && state.ship.fuel >= 60,
    pay: (state, set) => {
      if (!getCrisisResponseDefinition("resources").canPay(state)) return false;
      set((s) => ({
        credits: s.credits - 1800,
        ship: { ...s.ship, fuel: s.ship.fuel - 60 },
      }));
      return true;
    },
  },
];

export const getCrisisResponseDefinition = (response: CrisisResponse) =>
  CRISIS_RESPONSES.find((item) => item.id === response) ?? CRISIS_RESPONSES[0];
