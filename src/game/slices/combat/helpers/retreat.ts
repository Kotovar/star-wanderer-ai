import type { CrewMember } from "@/game/types";

export const BASE_RETREAT_CHANCE = 0.5;
export const PILOT_LEVEL_RETREAT_BONUS = 5; // % per level

/**
 * Calculates retreat success chance based on pilot level
 */
export function calculateRetreatChance(pilot: CrewMember | undefined): number {
    const pilotBonus = pilot
        ? (pilot.level ?? 1) * PILOT_LEVEL_RETREAT_BONUS
        : 0;
    return BASE_RETREAT_CHANCE + pilotBonus / 100;
}
