import type { CrewMember } from "@/game/types";
import { getTechPerkValue } from "@/game/constants/techTree";

const BASE_RETREAT_CHANCE = 0.5;
const PILOT_LEVEL_RETREAT_BONUS = 2; // % per level

/**
 * Calculates retreat success chance based on pilot level
 */
export function calculateRetreatChance(pilot: CrewMember | undefined): number {
    const pilotBonus = pilot
        ? (pilot.level ?? 1) * PILOT_LEVEL_RETREAT_BONUS
        : 0;
    const techPerkBonus = pilot ? getTechPerkValue(pilot, "B") : 0;
    return Math.min(1, BASE_RETREAT_CHANCE + pilotBonus / 100 + techPerkBonus);
}
