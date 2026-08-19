import type { RaceId } from "@/game/types/races";
import { getReputationLevel } from "@/game/types/reputation";

export const MIN_FRIENDLY_REPUTATION = 11;

export const RACE_AGREEMENT_EFFECTS = {
    human: { deadlineTurns: 2 },
    synthetic: { researchMultiplier: 1.1 },
    xenosymbiont: { healingCostMultiplier: 0.85 },
    krylorian: { retreatChanceBonus: 0.05 },
    voidborn: { fuelMultiplier: 0.92 },
    crystalline: { artifactFindChanceBonus: 0.01 },
} as const;

export const RACE_AGREEMENT_COPY_KEYS: Record<RaceId, string> = {
    human: "reputation.agreements.human.description",
    synthetic: "reputation.agreements.synthetic.description",
    xenosymbiont: "reputation.agreements.xenosymbiont.description",
    krylorian: "reputation.agreements.krylorian.description",
    voidborn: "reputation.agreements.voidborn.description",
    crystalline: "reputation.agreements.crystalline.description",
};

export function isRaceAgreementActive(
    raceReputation: Partial<Record<RaceId, number>> = {},
    raceId: RaceId,
): boolean {
    const level = getReputationLevel(raceReputation[raceId] ?? 0);
    return level === "friendly" || level === "allied";
}

export function getAcceptedContractTimeLimit(
    timeLimit: number | undefined,
    raceReputation: Partial<Record<RaceId, number>>,
): number | undefined {
    if (
        timeLimit === undefined ||
        !isRaceAgreementActive(raceReputation, "human")
    ) {
        return timeLimit;
    }

    return timeLimit + RACE_AGREEMENT_EFFECTS.human.deadlineTurns;
}
