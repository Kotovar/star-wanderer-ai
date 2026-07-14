import type { GameState } from "@/game/types";

export type VictoryObjectiveId =
  | "reach_tier4"
  | "defeat_void_oracle"
  | "defeat_3_bosses"
  | "scientific_ascension"
  | "galactic_coalition";

type VictoryObjectiveState = Pick<
  GameState,
  | "artifacts"
  | "completedContractIds"
  | "completedLocations"
  | "credits"
  | "currentSector"
  | "galaxy"
  | "knownRaces"
  | "raceReputation"
  | "research"
  | "traveling"
>;

export type VictoryObjective = {
  id: VictoryObjectiveId;
  titleKey: string;
  descriptionKey: string;
  completionKey: string;
  doctrineIds: string[];
  isComplete: (state: VictoryObjectiveState) => boolean;
};

export const SCIENCE_TECH_TARGET = 12;
export const SCIENCE_ARTIFACT_TARGET = 3;
export const COALITION_ALLY_TARGET = 3;
export const COALITION_CONTRACT_TARGET = 8;
export const COALITION_CREDIT_TARGET = 8000;

export const countDefeatedBosses = (state: VictoryObjectiveState): number =>
  state.galaxy.sectors
    .flatMap((sector) => sector.locations)
    .filter(
      (location) =>
        location.type === "boss" &&
        (location.bossDefeated ||
          state.completedLocations.includes(location.id)),
    ).length;

export const countAlliedRaces = (state: VictoryObjectiveState): number =>
  state.knownRaces.filter((raceId) => state.raceReputation[raceId] >= 51)
    .length;

export const VICTORY_OBJECTIVES: Record<VictoryObjectiveId, VictoryObjective> = {
  reach_tier4: {
    id: "reach_tier4",
    titleKey: "victory_paths.reach_tier4.title",
    descriptionKey: "victory_paths.reach_tier4.description",
    completionKey: "victory_paths.reach_tier4.completion",
    doctrineIds: ["doctrine_explorer"],
    isComplete: (state) =>
      !state.traveling && (state.currentSector?.tier ?? 1) >= 4,
  },
  defeat_void_oracle: {
    id: "defeat_void_oracle",
    titleKey: "victory_paths.defeat_void_oracle.title",
    descriptionKey: "victory_paths.defeat_void_oracle.description",
    completionKey: "victory_paths.defeat_void_oracle.completion",
    doctrineIds: ["doctrine_boss_hunter", "doctrine_exile"],
    isComplete: (state) =>
      state.galaxy.sectors.some((sector) =>
        sector.locations.some(
          (location) =>
            location.type === "boss" &&
            location.bossId === "void_oracle" &&
            (location.bossDefeated ||
              state.completedLocations.includes(location.id)),
        ),
      ),
  },
  defeat_3_bosses: {
    id: "defeat_3_bosses",
    titleKey: "victory_paths.defeat_3_bosses.title",
    descriptionKey: "victory_paths.defeat_3_bosses.description",
    completionKey: "victory_paths.defeat_3_bosses.completion",
    doctrineIds: ["doctrine_boss_hunter"],
    isComplete: (state) => countDefeatedBosses(state) >= 3,
  },
  scientific_ascension: {
    id: "scientific_ascension",
    titleKey: "victory_paths.scientific_ascension.title",
    descriptionKey: "victory_paths.scientific_ascension.description",
    completionKey: "victory_paths.scientific_ascension.completion",
    doctrineIds: ["doctrine_explorer"],
    isComplete: (state) =>
      state.research.researchedTechs.length >= SCIENCE_TECH_TARGET &&
      state.artifacts.filter((artifact) => artifact.researched).length >=
        SCIENCE_ARTIFACT_TARGET,
  },
  galactic_coalition: {
    id: "galactic_coalition",
    titleKey: "victory_paths.galactic_coalition.title",
    descriptionKey: "victory_paths.galactic_coalition.description",
    completionKey: "victory_paths.galactic_coalition.completion",
    doctrineIds: ["doctrine_trader"],
    isComplete: (state) =>
      countAlliedRaces(state) >= COALITION_ALLY_TARGET &&
      state.completedContractIds.length >= COALITION_CONTRACT_TARGET &&
      state.credits >= COALITION_CREDIT_TARGET,
  },
};

export const VICTORY_OBJECTIVE_IDS = Object.keys(
  VICTORY_OBJECTIVES,
) as VictoryObjectiveId[];

export const getVictoryObjectives = (): VictoryObjective[] =>
  VICTORY_OBJECTIVE_IDS.map((id) => VICTORY_OBJECTIVES[id]);

export const getCompletedVictoryObjective = (
  state: VictoryObjectiveState,
): VictoryObjective | undefined =>
  getVictoryObjectives().find((objective) => objective.isComplete(state));
