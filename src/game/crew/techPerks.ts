import { TECH_TREE_TIERS } from "../constants/techTree.ts";
import type {
    CrewMember,
    Profession,
    TechPerkBranch,
    TechPerkTier,
} from "../types/crew";

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

/**
 * Заполняет случайной веткой каждый уже пройденный (tier <= level) тир, за
 * который выбор ещё не сделан явно — для персонажа, получающего уровень 3+
 * в обход обычного игрового левелапа (стартовый экипаж, найм, спасённый
 * выживший). Без этого такой персонаж навсегда "застрял" бы с нерешённым
 * выбором задним числом (см. getPendingCrewPerkChoice).
 *
 * @param randomFn - Источник случайности в [0, 1); передайте детерминированную
 * версию (напр. seeded-генератор) там, где нужна воспроизводимость.
 */
export function fillMissingTechPerkTiers(
    level: number,
    techPerks: Partial<Record<TechPerkTier, TechPerkBranch>> | undefined,
    randomFn: () => number = Math.random,
): Partial<Record<TechPerkTier, TechPerkBranch>> | undefined {
    let result = techPerks;
    for (const tier of TECH_TREE_TIERS) {
        if (tier > level) break;
        if (result?.[tier]) continue;
        const roll = randomFn();
        const branch: TechPerkBranch =
            roll < 1 / 3 ? "A" : roll < 2 / 3 ? "B" : "C";
        result = { ...result, [tier]: branch };
    }
    return result;
}
