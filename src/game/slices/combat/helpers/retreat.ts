import type { CrewMember } from "@/game/types";
import type { RaceId } from "@/game/types/races";
import { getTechPerkValue } from "@/game/constants/techTree";
import {
    isRaceAgreementActive,
    RACE_AGREEMENT_EFFECTS,
} from "@/game/reputation/agreements";

const BASE_RETREAT_CHANCE = 0.5;
export const PILOT_LEVEL_RETREAT_BONUS = 2; // % per level

/**
 * Calculates retreat success chance based on pilot level
 */
export function calculateRetreatChance(
    pilot: CrewMember | undefined,
    raceReputation: Partial<Record<RaceId, number>> = {},
): number {
    const pilotBonus = pilot
        ? (pilot.level ?? 1) * PILOT_LEVEL_RETREAT_BONUS
        : 0;
    const techPerkBonus = pilot ? getTechPerkValue(pilot, "B") : 0;
    const agreementBonus = isRaceAgreementActive(
        raceReputation,
        "krylorian",
    )
        ? RACE_AGREEMENT_EFFECTS.krylorian.retreatChanceBonus
        : 0;
    return Math.min(
        1,
        BASE_RETREAT_CHANCE + pilotBonus / 100 + techPerkBonus + agreementBonus,
    );
}
