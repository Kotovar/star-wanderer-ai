import type { SignalType } from "@/game/types";

// Determine distress signal outcome
export const determineSignalOutcome = (
    ambushChanceModifier: number = 0,
): SignalType => {
    const roll = Math.random();
    let cumulative = 0;

    // Eye of Singularity increases ambush chance by 50%
    const ambushChance = 0.35 + ambushChanceModifier;
    const survivorsChance = 0.3 - ambushChanceModifier / 2;
    const cargoChance = 0.35 - ambushChanceModifier / 2;

    const outcomes = [
        { type: "pirate_ambush", chance: ambushChance },
        { type: "survivors", chance: survivorsChance },
        { type: "abandoned_cargo", chance: cargoChance },
    ];

    for (const outcome of outcomes) {
        cumulative += outcome.chance;
        if (roll < cumulative)
            return outcome.type as
                | "pirate_ambush"
                | "survivors"
                | "abandoned_cargo";
    }

    return "abandoned_cargo";
};
