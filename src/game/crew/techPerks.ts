import { TECH_TREE_TIERS } from "../constants/techTree.ts";
import type { CrewMember, Profession, TechPerkTier } from "../types/crew";

export interface PendingCrewPerkChoice {
    crewMemberId: number;
    profession: Profession;
    tier: TechPerkTier;
}

/**
 * Находит первый нерешённый выбор ветки прокачки среди живого экипажа.
 * Полностью выводится из текущего состояния (уровень + уже сделанные
 * выборы) — не хранится отдельно, поэтому не может "потеряться" при
 * многоуровневом скачке опыта или при найме экипажа выше 3 уровня.
 */
export function getPendingCrewPerkChoice(
    crew: CrewMember[],
): PendingCrewPerkChoice | null {
    for (const member of crew) {
        if (member.health <= 0) continue;
        for (const tier of TECH_TREE_TIERS) {
            if (member.level < tier) break;
            if (!member.techPerks?.[tier]) {
                return {
                    crewMemberId: member.id,
                    profession: member.profession,
                    tier,
                };
            }
        }
    }
    return null;
}
