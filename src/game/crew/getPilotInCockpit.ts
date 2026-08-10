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

    return crew
        .filter(
            (crewMember) =>
                crewMember.profession === "pilot" &&
                cockpitIds.has(crewMember.moduleId),
        )
        .sort((a, b) => (b.level ?? 1) - (a.level ?? 1))[0];
};
