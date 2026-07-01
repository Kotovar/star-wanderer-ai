import type { GameState } from "@/game/types";

export type VictoryObjectiveId =
    | "reach_tier4"
    | "defeat_void_oracle"
    | "defeat_3_bosses";

type VictoryObjective = {
    id: VictoryObjectiveId;
    title: string;
    description: string;
    completionText: string;
    isComplete: (state: VictoryObjectiveState) => boolean;
};

type VictoryObjectiveState = Pick<
    GameState,
    "completedLocations" | "currentSector" | "galaxy"
>;

const countDefeatedBosses = (state: VictoryObjectiveState): number =>
    state.galaxy.sectors
        .flatMap((sector) => sector.locations)
        .filter(
            (location) =>
                location.type === "boss" &&
                (location.bossDefeated ||
                    state.completedLocations.includes(location.id)),
        ).length;

export const VICTORY_OBJECTIVES: Record<VictoryObjectiveId, VictoryObjective> =
    {
        reach_tier4: {
            id: "reach_tier4",
            title: "Дальний рубеж",
            description: "Найдите путь за пределы известных звёздных карт.",
            completionText: "Квантовый двигатель вывел корабль к краю космоса.",
            isComplete: (state) => (state.currentSector?.tier ?? 1) >= 4,
        },
        defeat_void_oracle: {
            id: "defeat_void_oracle",
            title: "Оракул Пустоты",
            description: "Найдите и уничтожьте Оракула Пустоты.",
            completionText: "Оракул Пустоты уничтожен, а его сеть умолкла.",
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
            title: "Охота на Древних",
            description: "Уничтожьте 3 древних босса в любой части галактики.",
            completionText:
                "Три древние машины уничтожены. Остальные больше не безнаказанны.",
            isComplete: (state) => countDefeatedBosses(state) >= 3,
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
