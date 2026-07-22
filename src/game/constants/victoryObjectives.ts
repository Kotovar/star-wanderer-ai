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
  | "completedVictoryObjectiveIds"
  | "credits"
  | "currentSector"
  | "galaxy"
  | "knownRaces"
  | "raceReputation"
  | "research"
  | "traveling"
>;

type CampaignDirectiveState = VictoryObjectiveState &
  Pick<GameState, "startModifierIds">;

export type VictoryObjective = {
  id: VictoryObjectiveId;
  titleKey: string;
  descriptionKey: string;
  completionKey: string;
  doctrineIds: string[];
  isEnding?: boolean;
  isComplete: (state: VictoryObjectiveState) => boolean;
};

export const SCIENCE_TECH_TARGET = 12;
export const SCIENCE_ARTIFACT_TARGET = 3;
export const COALITION_ALLY_TARGET = 3;
export const COALITION_CONTRACT_TARGET = 8;
export const COALITION_CREDIT_TARGET = 8000;

const countDefeatedBosses = (state: VictoryObjectiveState): number =>
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
    isEnding: false,
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

const VICTORY_OBJECTIVE_IDS = Object.keys(
  VICTORY_OBJECTIVES,
) as VictoryObjectiveId[];

export const getVictoryObjectives = (): VictoryObjective[] =>
  VICTORY_OBJECTIVE_IDS.map((id) => VICTORY_OBJECTIVES[id]).filter(
    (objective) => objective.isEnding !== false,
  );

export const getCompletedVictoryObjective = (
  state: VictoryObjectiveState,
): VictoryObjective | undefined =>
  getVictoryObjectives().find(
    (objective) =>
      !state.completedVictoryObjectiveIds.includes(objective.id) &&
      objective.isComplete(state),
  );

type DirectiveDetail = {
  key: string;
  params?: Record<string, number>;
};

export type CampaignDirective = {
  objective: VictoryObjective;
  displayTitleKey?: string;
  detail: DirectiveDetail;
};

export const canRevealLateCampaign = (
  currentTier: number,
  victoryDone: boolean,
): boolean => currentTier >= 3 || victoryDone;

const DOCTRINE_PRIORITY: Record<string, VictoryObjectiveId[]> = {
  doctrine_explorer: ["scientific_ascension"],
  doctrine_boss_hunter: ["defeat_3_bosses", "defeat_void_oracle"],
  doctrine_exile: ["defeat_void_oracle"],
  doctrine_trader: ["galactic_coalition"],
};

const getDirectiveDetail = (
  objective: VictoryObjective,
  state: VictoryObjectiveState,
): DirectiveDetail => {
  switch (objective.id) {
    case "reach_tier4":
      return {
        key: "campaign_directive.reach_tier4",
        params: { tier: state.currentSector?.tier ?? 1 },
      };
    case "scientific_ascension":
      return {
        key: "campaign_directive.scientific_ascension",
        params: {
          tech: state.research.researchedTechs.length,
          techTarget: SCIENCE_TECH_TARGET,
          artifacts: state.artifacts.filter((artifact) => artifact.researched)
            .length,
          artifactTarget: SCIENCE_ARTIFACT_TARGET,
        },
      };
    case "galactic_coalition":
      return {
        key: "campaign_directive.galactic_coalition",
        params: {
          allies: countAlliedRaces(state),
          allyTarget: COALITION_ALLY_TARGET,
          contracts: state.completedContractIds.length,
          contractTarget: COALITION_CONTRACT_TARGET,
          credits: state.credits,
          creditTarget: COALITION_CREDIT_TARGET,
        },
      };
    default:
      return { key: `campaign_directive.${objective.id}` };
  }
};

export const getCampaignDirective = (
  state: CampaignDirectiveState,
): CampaignDirective | null => {
  const frontier = VICTORY_OBJECTIVES.reach_tier4;
  if (!frontier.isComplete(state)) {
    const hasReachedOuterRim = (state.currentSector?.tier ?? 1) >= 3;

    return {
      objective: frontier,
      displayTitleKey: hasReachedOuterRim
        ? undefined
        : "campaign_directive.explore.title",
      detail: hasReachedOuterRim
        ? getDirectiveDetail(frontier, state)
        : { key: "campaign_directive.explore.description" },
    };
  }

  const doctrineId = state.startModifierIds.find((id) =>
    id.startsWith("doctrine_"),
  );
  const unfinishedEndings = Object.values(VICTORY_OBJECTIVES).filter(
    (objective) => objective.isEnding !== false && !objective.isComplete(state),
  );
  const preferred = doctrineId
    ? DOCTRINE_PRIORITY[doctrineId]?.map((id) => VICTORY_OBJECTIVES[id]).find(
        (objective) => unfinishedEndings.includes(objective),
      )
    : undefined;
  const objective = preferred ?? unfinishedEndings[0];

  return objective
    ? { objective, detail: getDirectiveDetail(objective, state) }
    : null;
};
