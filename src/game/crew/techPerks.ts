import {
    getRaceTechPerkValue,
    getTechPerkValue,
    TECH_TREE_TIERS,
} from "../constants/techTree.ts";
import { getGunnerAccuracyBonus, getGunnerCritBonus } from "./combatBonuses.ts";
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

function getAtLeastAsStrongCrewMember(
    crew: CrewMember[],
    crewMember: CrewMember,
    candidateValue: number,
    isEligible: (candidate: CrewMember) => boolean,
    getValue: (candidate: CrewMember) => number,
): CrewMember | null {
    let source: CrewMember | null = null;
    for (const candidate of crew) {
        if (candidate.id === crewMember.id || !isEligible(candidate)) continue;
        const value = getValue(candidate);
        if (value < candidateValue) continue;
        if (!source || value > getValue(source)) source = candidate;
    }
    return source;
}

/**
 * Возвращает носителя уже действующего максимального бонуса, если новый выбор
 * не увеличит эффект прямо сейчас. Выбор не блокируется: источник может
 * погибнуть, быть переназначен или уступить после следующей прокачки.
 */
export function getCrewPerkNoEffectSource(
    crew: CrewMember[],
    crewMember: CrewMember,
    tier: TechPerkTier,
    branch: TechPerkBranch,
    activeGunnerIds: readonly number[] = [],
    cockpitPilotId?: number,
): CrewMember | null {
    const projectedCrewMember: CrewMember = {
        ...crewMember,
        techPerks: { ...crewMember.techPerks, [tier]: branch },
    };

    if (branch === "C") {
        return getAtLeastAsStrongCrewMember(
            crew,
            crewMember,
            getRaceTechPerkValue(projectedCrewMember),
            (candidate) => candidate.race === crewMember.race,
            getRaceTechPerkValue,
        );
    }

    if (branch === "B" && (
        crewMember.profession === "engineer" || crewMember.profession === "scientist"
    )) {
        return getAtLeastAsStrongCrewMember(
            crew,
            crewMember,
            getTechPerkValue(projectedCrewMember, "B"),
            (candidate) => candidate.profession === crewMember.profession,
            (candidate) => getTechPerkValue(candidate, "B"),
        );
    }

    // Уклонение даёт только старший по уровню пилот в активной кабине, поэтому
    // "Ас пилотирования" второго пилота не добавит кораблю ничего
    if (crewMember.profession === "pilot" && branch === "A") {
        return cockpitPilotId !== undefined && cockpitPilotId !== crewMember.id
            ? crew.find((candidate) => candidate.id === cockpitPilotId) ?? null
            : null;
    }

    if (
        crewMember.profession !== "gunner" ||
        !activeGunnerIds.includes(crewMember.id)
    ) return null;

    // Крит корабля — максимум по всем активным стрелкам, а точность считается
    // отдельно для КАЖДОГО оружейного отсека (см. computeBayAccuracyModifier):
    // второй "Снайпер" в своём отсеке полезен, даже если в соседнем сидит
    // стрелок сильнее. Поэтому у ветки A конкуренты — только соседи по отсеку.
    const getGunnerValue = branch === "A"
        ? getGunnerAccuracyBonus
        : getGunnerCritBonus;
    return getAtLeastAsStrongCrewMember(
        crew,
        crewMember,
        getGunnerValue(projectedCrewMember),
        (candidate) =>
            candidate.profession === "gunner" &&
            activeGunnerIds.includes(candidate.id) &&
            (branch !== "A" || candidate.moduleId === crewMember.moduleId),
        getGunnerValue,
    );
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
