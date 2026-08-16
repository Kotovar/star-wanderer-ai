import type { CrewMember } from "@/game/types";

/** Returns the highest-level pilot assigned to an active cockpit. */
export const getPilotInCockpit = (
    crew: CrewMember[],
    modules: {
        id: number;
        type: string;
        disabled?: boolean;
        manualDisabled?: boolean;
        health: number;
    }[],
): CrewMember | undefined => {
    const cockpitIds = new Set(
        modules
            .filter(
                (module) =>
                    module.type === "cockpit" &&
                    !module.disabled &&
                    !module.manualDisabled &&
                    module.health > 0,
            )
            .map((module) => module.id),
    );

    // Живой: мёртвый пилот в кресле продолжал давать кораблю уклонение,
    // бонус отступления и ветку "Ас пилотирования"
    return crew
        .filter(
            (crewMember) =>
                crewMember.profession === "pilot" &&
                crewMember.health > 0 &&
                cockpitIds.has(crewMember.moduleId),
        )
        .sort((a, b) => (b.level ?? 1) - (a.level ?? 1))[0];
};
